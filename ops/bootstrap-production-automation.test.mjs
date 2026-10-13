import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

function runPhaseHarness(cutoverStatus, installerStatus, verifyStatus) {
  const source = [
    'source "$1"',
    'events=""',
    'record() { events="$events $1"; }',
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
  assert.match(result.stdout, /RESULT=1 ACCEPTED=0 EVENTS= preflight cutover rollback/);
  assert.doesNotMatch(result.stdout, /EVENTS=.*(?:install|snapshot)/);
});

test('cutover dry-run failure prevents backup/cutover and automated installation', { skip: !bashAvailable }, () => {
  const source = [
    'source "$1"',
    'events=""',
    'record() { events="$events $1"; }',
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
  assert.match(result.stdout, /RESULT=1 ACCEPTED=0 EVENTS= preflight/);
  assert.doesNotMatch(result.stdout, /EVENTS= preflight (?:cutover|install)/);
});

test('installer failure preserves an accepted runtime and restores only the prior sudo policy', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(0, 17, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= preflight cutover snapshot install restore/);
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
    assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= preflight cutover snapshot restore-original/);
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
  assert.match(result.stdout, /RESULT=1 ACCEPTED=1 EVENTS= preflight cutover snapshot install verify restore/);
  assert.match(result.stdout, /RUNTIME CUTOVER: SUCCESS/);
  assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: FAILED/);
});

test('successful bootstrap completes cutover before installing and verifying deploy access', { skip: !bashAvailable }, () => {
  const result = runPhaseHarness(0, 0, 0);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RESULT=0 ACCEPTED=1 EVENTS= preflight cutover snapshot install verify/);
  assert.match(result.stdout, /AUTOMATED DEPLOY INSTALL: SUCCESS/);
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

test('installer accepts only clean main or detached origin/main and retains exact sudo policy', () => {
  assert.ok(installer.includes('source_branch=$(git_as_ubuntu branch --show-current)'));
  assert.ok(installer.includes('[[ $source_branch == main || -z $source_branch ]]'));
  assert.ok(installer.includes('rev-parse origin/main'));
  assert.ok(installer.includes('blocks != [("root", expected)]'));
  assert.ok(installer.includes("readonly SHA_SUDO_ARGUMENT='^[0-9a-f]{40}$'"));
  assert.ok(!installer.includes('NOPASSWD: ALL'));
});
