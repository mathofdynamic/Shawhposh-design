import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const directory = dirname(fileURLToPath(import.meta.url));
const root = dirname(directory);
const read = name => readFileSync(join(directory, name), 'utf8');
const bootstrap = read('bootstrap-production-automation.sh');
const cutover = read('runtime-cutover.sh');
const installer = read('install-automated-deploy.sh');
const bash = process.platform === 'win32'
  ? ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe'].find(existsSync) ?? 'bash'
  : 'bash';
const bashAvailable = spawnSync(bash, ['-c', 'printf BASH_OK'], { encoding: 'utf8' }).stdout?.trim() === 'BASH_OK';
const python = ['python3', 'python'].find(command => spawnSync(command, ['--version'], { encoding: 'utf8' }).status === 0);

function runPhaseHarness(cutoverStatus, installerStatus, verifyStatus) {
  const source = [
    'source "$1"',
    'events=""',
    'record() { events="$events $1"; }',
    'recover_interrupted_legacy_timers() { record recovery; return "${MOCK_RECOVERY:-0}"; }',
    'run_cutover_preflight() { record preflight; return "${MOCK_PREFLIGHT:-0}"; }',
    'perform_runtime_cutover() { record cutover; return "$MOCK_CUTOVER"; }',
    'verify_legacy_pm2_rollback() { record rollback; return 0; }',
    'snapshot_preinstall_sudo_policy() { record snapshot; return "${MOCK_SNAPSHOT:-0}"; }',
    'perform_automated_deploy_install() { record install; return "$MOCK_INSTALL"; }',
    'verify_final_install() { record verify; return "$MOCK_VERIFY"; }',
    'restore_preinstall_sudo_policy() { record restore; return 0; }',
    'restore_original_sudo_policy() { record restore-original; return 0; }',
    'if run_bootstrap_phases; then result=0; else result=$?; fi',
    'printf "RESULT=%s ACCEPTED=%s EVENTS=%s\\n" "$result" "$CUTOVER_ACCEPTED" "$events"',
  ].join('\n');
  return spawnSync(bash, ['-c', source, 'bootstrap-test', join(directory, 'bootstrap-production-automation.sh')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      MOCK_CUTOVER: String(cutoverStatus),
      MOCK_INSTALL: String(installerStatus),
      MOCK_VERIFY: String(verifyStatus),
      MOCK_SNAPSHOT: String(process.env.MOCK_SNAPSHOT ?? 0),
    },
  });
}

function runResumeHarness(alreadyInstalled, installerStatus = 0, verifyStatus = 0) {
  const source = [
    'source "$1"',
    'RESUME_RUNTIME=1',
    `RESUME_FINAL_INSTALL=${alreadyInstalled ? 1 : 0}`,
    'events=""',
    'record() { events="$events $1"; }',
    'prepare_resume_runtime_snapshot() { record retry-snapshot; }',
    'verify_runtime() { record runtime-check; return 0; }',
    'run_cutover_preflight() { record unexpected-cutover-preflight; return 99; }',
    'perform_runtime_cutover() { record unexpected-cutover; return 99; }',
    'snapshot_preinstall_sudo_policy() { record policy-snapshot; return 0; }',
    'perform_automated_deploy_install() { record install; return "$MOCK_INSTALL"; }',
    'verify_final_install() { record final-verify; return "$MOCK_VERIFY"; }',
    'restore_preinstall_sudo_policy() { record restore; return 0; }',
    'if run_bootstrap_phases; then result=0; else result=$?; fi',
    'printf "RESULT=%s ACCEPTED=%s EVENTS=%s\\n" "$result" "$CUTOVER_ACCEPTED" "$events"',
  ].join('\n');
  return spawnSync(bash, ['-c', source, 'bootstrap-resume-test', join(directory, 'bootstrap-production-automation.sh')], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, MOCK_INSTALL: String(installerStatus), MOCK_VERIFY: String(verifyStatus) },
  });
}

test('bootstrap is pinned to the reviewed runtime release and asks for one exact confirmation', () => {
  assert.ok(bootstrap.includes('EXPECTED_RUNTIME_SHA=c45e3c67fe986a362c4cb46e2a9859568f8b0a8f'));
  assert.ok(bootstrap.includes('EXPECTED_RUNTIME_RELEASE=/home/ubuntu/shawhposh/releases/c45e3c67fe986a362c4cb46e2a9859568f8b0a8f'));
  assert.ok(bootstrap.includes("confirmation == 'AUTOMATE SHAWHPosh'"));
  assert.equal((bootstrap.match(/IFS= read -r confirmation/g) ?? []).length, 1);
  assert.ok(bootstrap.includes('[[ $# -eq 0 ]]'));
  assert.ok(bootstrap.includes('[[ -t 0 && -t 1 ]]'));
  assert.ok(bootstrap.includes('(( EUID == 0 ))'));
  assert.ok(!bootstrap.includes('NOPASSWD: ALL'));
});

test('preflight and one confirmation precede snapshots and all production mutations', () => {
  const preflight = bootstrap.indexOf('\n  bootstrap_preflight "$@"');
  const confirmation = bootstrap.indexOf('[[ $confirmation ==');
  const snapshot = bootstrap.indexOf('\n  capture_bootstrap_snapshot\n');
  const cutoverRun = bootstrap.indexOf('\n  if run_bootstrap_phases; then');
  assert.ok(preflight >= 0 && confirmation > preflight);
  assert.ok(snapshot > confirmation);
  assert.ok(cutoverRun > snapshot);
  const phaseStart = bootstrap.indexOf('run_bootstrap_phases() {');
  const dryRun = bootstrap.indexOf('if ! run_cutover_preflight; then');
  const cutover = bootstrap.indexOf('if ! perform_runtime_cutover; then');
  assert.ok(bootstrap.includes('--execute-from-bootstrap --dry-run'));
  assert.ok(dryRun > phaseStart && cutover > dryRun);
  assert.ok(bootstrap.includes('hash-verified script copies'));
});

test('bootstrap stage ordering and cutover failure never starts the installer', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(17, 0, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=0 EVENTS= recovery preflight cutover rollback/);
  assert.doesNotMatch(result.stdout, /EVENTS=.*(?:install|snapshot)/);
});

test('cutover dry-run failure prevents backup/cutover and automated installation', { skip: !bashAvailable }, () => {
  const source = [
    'source "$1"',
    'events=""',
    'record() { events="$events $1"; }',
    'recover_interrupted_legacy_timers() { record recovery; return 0; }',
    'run_cutover_preflight() { record preflight; return 23; }',
    'perform_runtime_cutover() { record cutover; return 0; }',
    'if run_bootstrap_phases; then result=0; else result=$?; fi',
    'printf "RESULT=%s ACCEPTED=%s EVENTS=%s\\n" "$result" "$CUTOVER_ACCEPTED" "$events"',
  ].join('\n');
  const result = spawnSync(bash, ['-c', source, 'bootstrap-preflight-test', join(directory, 'bootstrap-production-automation.sh')], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=0 EVENTS= recovery preflight/);
  assert.doesNotMatch(result.stdout, /EVENTS= recovery preflight (?:cutover|install)/);
});

test('failed interrupted-state recovery prevents cutover preflight and deployment installation', { skip: !bashAvailable }, () => {
  const source = [
    'source "$1"',
    'events=""',
    'record() { events="$events $1"; }',
    'recover_interrupted_legacy_timers() { record recovery; return 19; }',
    'run_cutover_preflight() { record preflight; return 0; }',
    'perform_runtime_cutover() { record cutover; return 0; }',
    'if run_bootstrap_phases; then result=0; else result=$?; fi',
    'printf "RESULT=%s EVENTS=%s\\n" "$result" "$events"',
  ].join('\n');
  const result = spawnSync(bash, ['-c', source, 'bootstrap-recovery-failure-test', join(directory, 'bootstrap-production-automation.sh')], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 EVENTS= recovery/);
  assert.doesNotMatch(result.stdout.match(/RESULT=.*$/m)?.[0] ?? '', /\b(preflight|cutover|install)\b/);
});

test('installer failure preserves an accepted runtime and restores only the prior sudo policy', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(0, 17, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= recovery preflight cutover snapshot install restore/);
  assert.match(result.stdout, /RUNTIME CUTOVER: SUCCESS/);
  assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: FAILED/);
  assert.doesNotMatch(result.stdout, /runtime rollback/i);
});

test('pre-install policy snapshot failure preserves runtime and skips deploy installation', { skip: !bashAvailable }, () => {
  const previous = process.env.MOCK_SNAPSHOT;
  process.env.MOCK_SNAPSHOT = '17';
  try {
    const result = runPhaseHarness(0, 0, 0);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= recovery preflight cutover snapshot restore-original/);
    assert.match(result.stdout, /RUNTIME CUTOVER: SUCCESS/);
    assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: FAILED/);
    assert.doesNotMatch(result.stdout, /EVENTS=.*install/);
  } finally {
    if (previous === undefined) delete process.env.MOCK_SNAPSHOT;
    else process.env.MOCK_SNAPSHOT = previous;
  }
});

test('post-install verification failure restores scoped sudo while preserving runtime', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(0, 0, 17);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= recovery preflight cutover snapshot install verify restore/);
  assert.match(result.stdout, /RUNTIME CUTOVER: SUCCESS/);
  assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: FAILED/);
});

test('successful bootstrap completes cutover before installing and verifying deploy access', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(0, 0, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=0 ACCEPTED=1 EVENTS= recovery preflight cutover snapshot install verify/);
  assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: SUCCESS/);
});

test('retry after accepted runtime skips cutover and retries only deploy-helper installation', { skip: !bashAvailable }, () => {
  const result = runResumeHarness(false, 17);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= retry-snapshot runtime-check policy-snapshot install restore/);
  assert.doesNotMatch(result.stdout, /unexpected-cutover/);
  assert.match(result.stdout, /Healthy runtime preserved/);
});

test('retry after completed deploy install verifies it and skips a second install', { skip: !bashAvailable }, () => {
  const result = runResumeHarness(true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=0 ACCEPTED=1 EVENTS= retry-snapshot runtime-check final-verify/);
  assert.doesNotMatch(result.stdout.match(/EVENTS=.*$/m)?.[0] ?? '', /policy-snapshot|install|unexpected-cutover/);
});

test('runtime cutover internal mode is root-only, fixed-SHA, single-confirmation, and rollback-gated', () => {
  assert.ok(cutover.includes('--execute-from-bootstrap'));
  assert.ok(cutover.includes("SHAWHPOSH_BOOTSTRAP_CONTEXT:-"));
  assert.ok(cutover.includes('CANDIDATE_RELEASE=/home/ubuntu/shawhposh/releases/$BOOTSTRAP_RUNTIME_SHA'));
  assert.ok(cutover.includes("confirmation == CUTOVER"));
  assert.ok(cutover.includes('Bootstrap owner confirmation has already authorized this runtime cutover.'));
  assert.ok(cutover.includes('if (( CUTOVER_ACTIVE && !CUTOVER_ACCEPTED )); then'));
  assert.ok(cutover.includes('health_has_version "$CANDIDATE_SHA"'));
  assert.ok(cutover.includes('pm2_as_ubuntu start "$legacy_ecosystem" --only shawhposh-api'));
  assert.ok(cutover.indexOf('install_sudo_policy\n  CUTOVER_ACCEPTED=1') > cutover.indexOf('verify_payment_shipping_disabled'));
  assert.ok(cutover.includes('pm2_api_metadata > "$SNAPSHOT_DIR/pm2-api-before.json"'));
  assert.ok(cutover.includes('ownership-before.txt'));
  assert.ok(cutover.includes('frontend-ownership-before.txt'));
  assert.ok(cutover.includes('static release tree -> root:root; directories 0755, files 0644.'));
  assert.ok(cutover.includes("stat -c '%U:%G:%a' -- \"$WEB_ROOT\") == 'root:root:755'"));
  assert.ok(cutover.includes('runuser -u ubuntu -- test ! -w "$WEB_CURRENT/index.html"'));
  assert.ok(cutover.includes('Restored the pre-cutover ubuntu ownership of the static release tree.'));
  assert.ok(cutover.includes("trap 'on_signal HUP 129' HUP"));
  assert.ok(cutover.includes("trap 'on_signal INT 130' INT"));
  assert.ok(cutover.includes("trap 'on_signal TERM 143' TERM"));
});

test('bootstrap snapshots hash-verified scripts as root-owned inputs before executing either mutation script', () => {
  const confirmation = bootstrap.indexOf("[[ $confirmation == 'AUTOMATE SHAWHPosh' ]]");
  const captureCall = bootstrap.indexOf('\n  capture_bootstrap_snapshot\n', confirmation);
  const phaseCall = bootstrap.indexOf('\n  if run_bootstrap_phases; then', captureCall);
  const captureDefinition = bootstrap.indexOf('capture_bootstrap_snapshot() {');
  const trustedCopy = bootstrap.indexOf('install -o root -g root -m 0600 -- "$CONTROLLER_RELEASE/$source" "$destination"', captureDefinition);
  const dryRunPhase = bootstrap.indexOf('if ! run_cutover_preflight; then');
  const cutoverInvocation = bootstrap.indexOf('/bin/bash "$CUTOVER_SCRIPT" --execute-from-bootstrap --dry-run');
  const installerInvocation = bootstrap.indexOf('/bin/bash "$INSTALLER_SCRIPT"');
  assert.ok(confirmation >= 0 && captureCall > confirmation && phaseCall > captureCall);
  assert.ok(trustedCopy > captureDefinition && dryRunPhase >= 0 && cutoverInvocation > 0);
  assert.ok(installerInvocation > trustedCopy);
  assert.ok(bootstrap.includes('SHAWHPOSH_BOOTSTRAP_SOURCE_ROOT="$BOOTSTRAP_SNAPSHOT/trusted"'));
  assert.ok(installer.includes('root-owned, hash-verified bootstrap artifacts'));
  for (const command of ['/bin/sh -c', '/usr/bin/node -e', '/usr/bin/git --version', '/bin/rm --version', '/usr/bin/find --version']) {
    assert.ok(bootstrap.includes(`expect_denied ${command}`));
  }
});

test('automated deploy installer skips only the terminal requirement inside trusted bootstrap context', { skip: !bashAvailable }, () => {
  const match = installer.match(/require_interactive_installer_terminal\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'installer must centralize its interactive-terminal gate');
  const rootCheck = installer.indexOf('(( EUID == 0 ))');
  const terminalCall = installer.indexOf('\nrequire_interactive_installer_terminal\n');
  const trustedSourceBranch = installer.indexOf('if [[ ${SHAWHPOSH_BOOTSTRAP_CONTEXT:-} == "$BOOTSTRAP_CONTEXT_VALUE" ]]; then');
  assert.ok(rootCheck >= 0 && terminalCall > rootCheck && trustedSourceBranch > terminalCall);

  const source = [
    'die() { printf "[INSTALL] ERROR: %s\\n" "$*" >&2; return 1; }',
    "BOOTSTRAP_CONTEXT_VALUE='AUTOMATE_SHAWHPosh-v1'",
    match[0],
    'require_interactive_installer_terminal',
  ].join('\n');
  const invoke = context => spawnSync(bash, ['-c', source], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SHAWHPOSH_BOOTSTRAP_CONTEXT: context },
  });

  const trusted = invoke('AUTOMATE_SHAWHPosh-v1');
  assert.equal(trusted.status, 0, trusted.stderr);

  const manual = invoke('');
  assert.equal(manual.status, 1);
  assert.match(manual.stderr, /Owner installation requires a terminal\./);
});

test('automated deploy installer validates release.env bytes including its trailing newline', { skip: !bashAvailable }, () => {
  const match = installer.match(/validate_runtime_release_metadata\(\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'installer must expose the release metadata byte check as a testable function');

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'shawhposh-release-metadata-'));
  try {
    const metadataPath = join(temporaryRoot, 'release.env');
    const sha = 'c45e3c67fe986a362c4cb46e2a9859568f8b0a8f';
    const source = `${match[0]}\nvalidate_runtime_release_metadata "$1" "$2"`;
    const validate = () => spawnSync(bash, ['-c', source, 'metadata-test', metadataPath, sha], {
      cwd: root,
      encoding: 'utf8',
    });

    writeFileSync(metadataPath, `APP_VERSION=${sha}\n`);
    const valid = validate();
    assert.equal(valid.status, 0, valid.stderr);

    writeFileSync(metadataPath, `APP_VERSION=${sha}`);
    assert.equal(validate().status, 1, 'metadata without its terminating newline must be rejected');

    writeFileSync(metadataPath, `APP_VERSION=${sha}\nextra\n`);
    assert.equal(validate().status, 1, 'metadata with unexpected trailing content must be rejected');
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('deploy installer accepts only its helper plus the exact temporary bootstrap NOPASSWD rule', { skip: !python }, () => {
  const match = installer.match(/\/usr\/bin\/python3 -c '\n([\s\S]*?)\n' "\$SHA_SUDO_ARGUMENT"/);
  assert.ok(match, 'installer must keep its effective sudo allowlist parser testable');
  assert.ok(installer.includes("readonly BOOTSTRAP_RUNNER_SUDO_POLICY='ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$'"));
  assert.ok(installer.includes('The exact temporary bootstrap sudo rule is missing or unsafe.'));
  assert.ok(installer.includes('Effective passwordless sudo entries differ from the reviewed exact allowlist.'));

  const deploy = '/usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$';
  const runner = '/usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$';
  const policyOutput = commands => commands.map((command, index) => [
    `Sudoers entry: /etc/sudoers.d/test-${index}`,
    'RunAsUsers: root',
    'Options: !authenticate',
    'Commands:',
    `    ${command}`,
    '',
  ].join('\n')).join('\n');
  const check = (commands, bootstrapEntry = '') => spawnSync(python, ['-c', match[1], '^[0-9a-f]{40}$', bootstrapEntry], {
    cwd: root,
    encoding: 'utf8',
    input: policyOutput(commands),
  });

  assert.equal(check([deploy]).status, 0);
  assert.equal(check([deploy, runner], runner).status, 0, 'trusted bootstrap may retain its exact temporary rule until cleanup');
  assert.equal(check([deploy, runner]).status, 1, 'temporary capability must not be accepted outside trusted bootstrap mode');
  assert.equal(check([deploy, runner, '/usr/bin/systemctl *'], runner).status, 1, 'arbitrary service control must remain denied');
});

test('trusted snapshot creation makes every nested directory private', { skip: process.platform === 'win32' || !bashAvailable }, () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'shawhposh-bootstrap-snapshot-'));
  const source = [
    'source "$1"',
    'install_log="$2/install-paths"',
    'chmod_log="$2/chmod-paths"',
    'install() {',
    '  local owner= group= mode= path',
    '  [[ $1 == -d ]] || return 90',
    '  shift',
    '  while (($#)); do',
    '    case "$1" in',
    '      -o) owner=$2; shift 2 ;;',
    '      -g) group=$2; shift 2 ;;',
    '      -m) mode=$2; shift 2 ;;',
    '      --) shift; break ;;',
    '      *) return 91 ;;',
    '    esac',
    '  done',
    '  [[ $owner == root && $group == root && $mode == 0700 && $# == 1 ]] || return 92',
    '  path=$1',
    '  printf "%s\\n" "$path" >> "$install_log"',
    '  command install -d -m 0700 -- "$path"',
    '}',
    'chmod() {',
    '  [[ $1 == 0700 && $2 == -- && $# == 3 ]] || return 93',
    '  printf "%s\\n" "$3" >> "$chmod_log"',
    '  command chmod 0700 -- "$3"',
    '}',
    'created="$2/created/trusted"',
    'create_private_trusted_snapshot_directories "$created"',
    'existing="$2/existing/trusted"',
    'mkdir -p "$existing/ops/sudoers.d"',
    'command chmod 0755 "$existing" "$existing/ops" "$existing/ops/sudoers.d"',
    'create_private_trusted_snapshot_directories "$existing"',
    'for root in "$created" "$existing"; do',
    '  for path in "$root" "$root/ops" "$root/ops/sudoers.d" "$root/ops/legacy-systemd"; do',
    '    [[ $(stat -c "%a" -- "$path") == 700 ]] || exit 1',
    '    [[ $(grep -Fxc -- "$path" "$install_log") == 1 ]] || exit 1',
    '    [[ $(grep -Fxc -- "$path" "$chmod_log") == 1 ]] || exit 1',
    '  done',
    'done',
    'printf "ALL_TRUSTED_DIRECTORIES_MODE_0700\\n"',
  ].join('\n');

  try {
    const result = spawnSync(bash, [
      '-c', source, 'trusted-snapshot-permissions-test',
      join(directory, 'bootstrap-production-automation.sh'), temporaryRoot,
    ], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /ALL_TRUSTED_DIRECTORIES_MODE_0700/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('installer accepts only clean main or detached origin/main and retains exact sudo policy', () => {
  assert.ok(installer.includes('source_branch=$(git_as_ubuntu branch --show-current)'));
  assert.ok(installer.includes('[[ $source_branch == main || -z $source_branch ]]'));
  assert.ok(installer.includes('rev-parse origin/main'));
  assert.ok(installer.includes('entries = [(runas, command) for runas, commands in blocks for command in commands]'));
  assert.ok(installer.includes('len(entries) != len(expected)'));
  assert.ok(installer.includes("readonly SHA_SUDO_ARGUMENT='^[0-9a-f]{40}$'"));
  assert.ok(!installer.includes('NOPASSWD: ALL'));
});

test('interrupted-preparation recovery is gated before dry-run by legacy runtime invariants', () => {
  const recovery = bootstrap.indexOf('recover_interrupted_legacy_timers() {');
  const invocation = bootstrap.indexOf('if ! recover_interrupted_legacy_timers; then');
  const dryRun = bootstrap.indexOf('if ! run_cutover_preflight; then');
  assert.ok(recovery >= 0 && invocation > recovery && dryRun > invocation);
  assert.ok(bootstrap.includes('[[ ! -e $RUNTIME_CURRENT && ! -L $RUNTIME_CURRENT ]]'));
  assert.ok(bootstrap.includes('$(stat -c \'%U:%G:%a\' -- "$DATABASE_FILE") == ubuntu:ubuntu:600'));
  assert.ok(bootstrap.includes('$(stat -c \'%U:%G:%a\' -- "$ENV_FILE") == ubuntu:ubuntu:600'));
  assert.ok(bootstrap.includes('cmp -s -- "$path" "$CONTROLLER_RELEASE/ops/$unit"'));
  assert.ok(bootstrap.includes('ops/legacy-systemd/shawhposh-backup.service'));
  assert.ok(bootstrap.includes('cmp -s -- "$path" "$BOOTSTRAP_SNAPSHOT/trusted/ops/legacy-systemd/$unit"'));
  assert.ok(bootstrap.includes('systemctl is-enabled --quiet "${timer_units[0]}"'));
  assert.ok(bootstrap.includes('restore_recovery_timer_units || log'));
  assert.ok(bootstrap.includes('mv -fT -- "$recovery_stage/$unit" "$destination"'));
  assert.ok(bootstrap.includes('show "$OLD_PRODUCTION_SHA:$git_relative" > "$destination"'));
  assert.ok(bootstrap.includes('merge-base --is-ancestor "$OLD_PRODUCTION_SHA" "$requested_sha"'));
  assert.ok(bootstrap.includes('restore_recovery_timer_units'));
  assert.ok(!bootstrap.includes('rm -rf'));
});

test('installed runner compatibility reconstructs rollback units from the fixed trusted Git commit', () => {
  const start = bootstrap.indexOf('if (( RUNNER_MODE )); then\n    for file');
  const end = bootstrap.indexOf('\n  else\n    validate_artifacts "$CONTROLLER_RELEASE" controller', start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(bootstrap.slice(start, end), /ops\/legacy-systemd\//);
  assert.ok(bootstrap.includes('merge-base --is-ancestor "$OLD_PRODUCTION_SHA" "$requested_sha"'));
  assert.ok(bootstrap.includes('ls-tree "$OLD_PRODUCTION_SHA" -- "$git_relative"'));
  assert.ok(bootstrap.includes('show "$OLD_PRODUCTION_SHA:$git_relative" > "$destination"'));
  assert.ok(bootstrap.includes('capture_legacy_timer_templates'));
  assert.ok(bootstrap.includes('object_mode == 100644 && $object_type == blob'));
});

test('legacy recovery units match hashes from the reviewed PM2-era production commit', () => {
  const expectedSha256 = {
    'shawhposh-backup.service': '561b975e140d21697f3abdad5e4f6b7c10edf57876cff34783ebf613dc42c552',
    'shawhposh-backup.timer': 'a3be042958a104e2439ba34c707ac316aa06834feab7d4669e53e04efc5ba327',
    'shawhposh-reservations.service': 'e2e95feaf3926e0e918d3ea536ef7a0b145d4736a8d6bf63bf9a6166ab5b20da',
    'shawhposh-reservations.timer': 'e7cba52d8ea5024e6d0206777b4b57fc90c80575c49c6a4c83e7b077fb31866f',
  };
  for (const [unit, expected] of Object.entries(expectedSha256)) {
    const actual = read(`legacy-systemd/${unit}`).replace(/\r\n/g, '\n');
    const actualSha256 = createHash('sha256').update(actual, 'utf8').digest('hex');
    assert.equal(actualSha256, expected, `${unit} no longer matches the reviewed production commit`);
  }
});
