import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const directory = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(directory, name), 'utf8');
const runtimePath = '/opt/shawhposh/current';
const stagingPath = '/home/ubuntu/shawhposh/current';
const bash = process.platform === 'win32'
  ? ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe'].find(existsSync) ?? 'bash'
  : 'bash';
const bashAvailable = spawnSync(bash, ['-c', 'printf BASH_OK'], { encoding: 'utf8' }).stdout?.trim() === 'BASH_OK';

test('all runtime systemd services execute root-promoted code only', () => {
  for (const name of [
    'shawhposh-api.service',
    'shawhposh-backup.service',
    'shawhposh-reservations.service',
    'shawhposh-replicate.service',
  ]) {
    const unit = read(name);
    assert.ok(unit.includes(`WorkingDirectory=${runtimePath}`), `${name} working directory`);
    assert.ok(unit.includes(runtimePath), `${name} executable path`);
    assert.ok(!unit.includes(stagingPath), `${name} must not execute the ubuntu staging symlink`);
    assert.match(unit, /^User=shawhposh$/m, `${name} runtime identity`);
    assert.ok(unit.includes('EnvironmentFile=/opt/shawhposh/current/release.env'), `${name} release version source`);
  }
});

test('every repository-controlled systemd executable is included in the promoted artifact model', () => {
  const helper = read('promote_release.py');
  const supportedFiles = helper.match(/SUPPORTED_FILES\s*=\s*\(([^)]*)\)/)?.[1];
  assert.ok(supportedFiles, 'promotion helper declares its artifact allowlist');
  const artifacts = new Set([...supportedFiles.matchAll(/"([^"]+)"/g)].map(match => match[1]));

  for (const name of [
    'shawhposh-api.service',
    'shawhposh-backup.service',
    'shawhposh-reservations.service',
    'shawhposh-replicate.service',
  ]) {
    const unit = read(name);
    const execStart = unit.match(/^ExecStart=(.+)$/m)?.[1];
    assert.ok(execStart, `${name} has an executable command`);
    const executable = execStart.match(/\/opt\/shawhposh\/current\/([^\s]+)/)?.[1];
    assert.ok(executable, `${name} executes repository-controlled code from the protected tree`);
    const promoted = [...artifacts].some(artifact =>
      executable === artifact || (!artifact.includes('/') && executable.startsWith(`${artifact}/`)),
    );
    assert.ok(promoted, `${name} executable ${executable} is not copied by the promotion allowlist`);
  }
  assert.ok(artifacts.has('ops/replicate-backups.mjs'));
});

test('sudo policy permits only the SHA-scoped automatic deployment helper', () => {
  const policy = read('sudoers.d/ubuntu-shawhposh');
  assert.equal(policy, 'Defaults:ubuntu timestamp_timeout=0\nubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$\n');
  assert.ok(policy.includes('Defaults:ubuntu timestamp_timeout=0'));
  assert.match(policy, /^ubuntu ALL=\(root\) NOPASSWD: \/usr\/local\/sbin\/shawhposh-deploy \^\[0-9a-f\]\{40\}\$$/m);
  assert.doesNotMatch(policy, /nginx|systemctl/);
  assert.doesNotMatch(policy, /PASSWD:.*shawhposh-promote-release/);
  assert.doesNotMatch(policy, /(?:^|, )(?:\/bin\/bash|\/bin\/sh|\/usr\/bin\/(?:python|node|env|find|rm)|\/usr\/bin\/systemctl \*)/m);
  assert.equal((policy.match(/NOPASSWD:/g) ?? []).length, 1);
});

test('runtime preflight validates the exact automated sudo policy under strict unset-variable handling', { skip: !bashAvailable }, () => {
  const script = read('runtime-cutover.sh');
  const declarationMatch = script.match(/^readonly AUTOMATED_SUDO_POLICY='([^\r\n]*)\r?\n([^\r\n]*)'$/m);
  const declaration = declarationMatch?.[0];
  const validator = script.match(/^validate_automated_sudo_policy\(\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(declaration, 'runtime cutover defines the automated policy under the expected name');
  assert.ok(validator, 'runtime preflight uses a standalone automated policy validator');
  assert.match(script, /^  validate_automated_sudo_policy$/m, 'preflight invokes the tested validator');

  const expected = [
    'Defaults:ubuntu timestamp_timeout=0',
    'ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$',
  ].join('\n');
  assert.equal(`${declarationMatch[1]}\n${declarationMatch[2]}`, expected);

  const harness = [
    'set -Eeuo pipefail',
    declaration,
    'CANDIDATE_RELEASE=$(mktemp -d)',
    'trap \'rm -rf -- "$CANDIDATE_RELEASE"\' EXIT',
    'mkdir -p "$CANDIDATE_RELEASE/ops/sudoers.d"',
    'policy_file="$CANDIDATE_RELEASE/ops/sudoers.d/ubuntu-shawhposh"',
    'printf "%s\\n" "$AUTOMATED_SUDO_POLICY" > "$policy_file"',
    'if [[ ${INVALID_POLICY:-0} == 1 ]]; then printf "tampered\\n" >> "$policy_file"; fi',
    'assert_source_file() { [[ -f $1 && ! -L $1 ]]; }',
    'die() { printf "%s\\n" "$*" >&2; exit 17; }',
    validator,
    'validate_automated_sudo_policy',
  ].join('\n');
  const valid = spawnSync(bash, ['-c', harness], {
    cwd: dirname(directory),
    encoding: 'utf8',
    env: { ...process.env, INVALID_POLICY: '0' },
  });
  assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);

  const invalid = spawnSync(bash, ['-c', harness], {
    cwd: dirname(directory),
    encoding: 'utf8',
    env: { ...process.env, INVALID_POLICY: '1' },
  });
  assert.equal(invalid.status, 17, `${invalid.stdout}\n${invalid.stderr}`);
  assert.match(invalid.stderr, /prepared automated-deploy sudo policy differs/);
});

test('automatic deployment helper uses trusted main source and a fixed API service only', () => {
  const helper = read('automated_deploy.py');
  const frontend = read('promote_frontend.py');
  assert.match(helper, /REPOSITORY_URL = "https:\/\/github\.com\/mathofdynamic\/Shawhposh-design\.git"/);
  assert.match(helper, /TRUSTED_BRANCH = "refs\/remotes\/origin\/main"/);
  assert.match(helper, /merge-base", "--is-ancestor"/);
  assert.match(helper, /PrivateNetwork=\{'no' if network else 'yes'\}/);
  assert.match(helper, /MANUAL MIGRATION REQUIRED/);
  assert.match(helper, /systemctl", "restart", SERVICE_NAME/);
  assert.match(helper, /SERVICE_NAME = "shawhposh-api\.service"/);
  assert.match(helper, /WEB_ROOT = frontend\.WEB_ROOT/);
  assert.match(helper, /frontend\._prepare_frontend_release_from_fds/);
  assert.match(helper, /frontend\._atomic_switch\(web_root_fd, requested_sha/);
  assert.match(helper, /_rollback_release_pair\(/);
  assert.match(helper, /_website_health_matches\(requested_sha, web_root_fd\)/);
  assert.match(helper, /_commerce_snapshots_match\(commerce_snapshot\)/);
  assert.match(helper, /_retain_backend_releases/);
  assert.match(frontend, /WEB_ROOT = Path\("\/var\/www\/shawhposh"\)/);
  assert.match(frontend, /WEB_RELEASES = WEB_ROOT \/ "releases"/);
  assert.match(frontend, /WEB_CURRENT = WEB_ROOT \/ "current"/);
  assert.ok(!frontend.includes('/home/ubuntu/shawhposh'));
  assert.match(helper, /_atomic_switch\(root_fd, previous_sha\)/);
  assert.ok(!helper.includes('/home/ubuntu/shawhposh/releases'));
  assert.ok(!helper.includes('shell=True'));
  assert.doesNotMatch(helper, /systemctl[^\n]*\b(?:restart|start|stop|enable|disable)\b[^\n]*[+*]/);
});

test('automatic deployment wrapper runs isolated Python from the fixed root-owned library path', () => {
  const wrapper = read('shawhposh-deploy');
  assert.match(wrapper, /^#!\/usr\/bin\/python3 -I$/m);
  assert.match(wrapper, /sys\.dont_write_bytecode = True/);
  assert.match(wrapper, /sys\.path\.insert\(0, "\/usr\/local\/lib\/shawhposh-deploy"\)/);
  assert.match(wrapper, /from automated_deploy import main/);
  assert.ok(!wrapper.includes('os.system'));
  assert.ok(!wrapper.includes('subprocess'));
});

test('one-time installer refuses the current PM2-era state and restores failed sudo policy changes', () => {
  const installer = read('install-automated-deploy.sh');
  assert.ok(installer.includes('The dedicated API service is not active; complete runtime cutover first.'));
  assert.ok(installer.includes('The running API process is not owned by shawhposh.'));
  assert.ok(installer.includes('policy_changed=0'));
  assert.ok(installer.includes('trap restore_previous_sudo_policy EXIT'));
  assert.ok(installer.includes('policy_committed=1'));
  assert.ok(installer.includes('sudo -ll -U ubuntu'));
  assert.ok(installer.includes('blocks != [("root", expected)]'));
  assert.ok(installer.includes('Unexpected file in root-owned deployment library'));
  assert.ok(installer.includes('promote_frontend.py'));
  assert.ok(installer.includes('/var/www/shawhposh/releases'));
  assert.ok(installer.includes('Nginx is not configured to serve the protected frontend current path.'));
  assert.ok(!installer.includes('__pycache__'));
  assert.match(installer, /ubuntu ALL=\(root\) NOPASSWD: \$DEPLOY_COMMAND \$SHA_SUDO_ARGUMENT/);
  assert.ok(installer.includes("readonly SHA_SUDO_ARGUMENT='^[0-9a-f]{40}$'"));
  assert.ok(!installer.includes('NOPASSWD: ALL'));
});

test('automated deployment Python policy and command construction tests pass', () => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(python, [join(directory, 'test_automated_deploy.py')], {
    cwd: dirname(directory),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('protected frontend promotion and two-pointer rollback tests pass', () => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(python, [join(directory, 'test_promote_frontend.py')], {
    cwd: dirname(directory),
    encoding: 'utf8',
  });
  if (process.platform === 'win32') {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /skipped=/);
    return;
  }
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('promotion helper has a fixed staging and protected runtime boundary', () => {
  const helper = read('promote_release.py');
  assert.match(helper, /STAGING_RELEASES\s*=\s*Path\("\/home\/ubuntu\/shawhposh\/releases"\)/);
  assert.match(helper, /RUNTIME_ROOT\s*=\s*Path\("\/opt\/shawhposh"\)/);
  assert.match(helper, /RUNTIME_RELEASES\s*=\s*RUNTIME_ROOT\s*\/\s*"releases"/);
  assert.match(helper, /RUNTIME_CURRENT\s*=\s*RUNTIME_ROOT\s*\/\s*"current"/);
  assert.match(helper, /SHA_PATTERN\s*=\s*re\.compile\(r"\[0-9a-f\]\{40\}/);
  assert.match(helper, /def _copy_file\(/);
  assert.match(helper, /stat\.S_ISLNK/);
  assert.match(helper, /st_nlink == 1|st_nlink != 1|info\.st_nlink == 1/);
  assert.match(helper, /expected_uid: int = 0/);
  assert.ok(!helper.includes('eval('));
  assert.ok(!helper.includes('shell=True'));
});

test('cutover installs protected release code and verifies both users cannot write it', () => {
  const script = read('runtime-cutover.sh');
  assert.ok(script.includes('/opt/shawhposh'));
  assert.ok(script.includes('/usr/local/sbin/shawhposh-promote-release'));
  assert.ok(script.includes('runuser -u ubuntu -- test ! -w /opt/shawhposh/current/server-dist/index.js'));
  assert.ok(script.includes('runuser -u shawhposh -- test ! -w /opt/shawhposh/current/server-dist/index.js'));
  assert.ok(script.includes('runuser -u ubuntu -- test ! -w /opt/shawhposh/current/server-dist/db/backup.js'));
  assert.ok(script.includes('runuser -u shawhposh -- test ! -w /opt/shawhposh/current/server-dist/modules/orders/expire-reservations.js'));
  assert.ok(script.includes("stat -c '%U:%G:%F' -- \"$RUNTIME_CURRENT\""));
  const policy = read('sudoers.d/ubuntu-shawhposh');
  assert.ok(!policy.includes('systemctl restart shawhposh-api.service'));
  assert.ok(!script.includes('set_api_current "$CANDIDATE_RELEASE"'));
});

test('runtime rollback selects protected release IDs, never a staging path', () => {
  const helper = read('promote_release.py');
  assert.match(helper, /resolve_protected_release/);
  assert.match(helper, /RUNTIME_RELEASES/);
  assert.ok(!helper.includes('STAGING_RELEASES / current'));
  assert.match(helper, /releases\/\(\[0-9a-f\]\{40\}\)/);
  assert.match(helper, /_atomic_switch\(root_fd, previous\)/);

  const script = read('runtime-cutover.sh');
  const rollback = script.match(/rollback_incomplete_cutover\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(rollback, 'one-time cutover rollback function exists');
  assert.ok(rollback.includes('"$PROMOTION_HELPER" "$OLD_PRODUCTION_SHA"'));
  assert.ok(rollback.includes('"$RUNTIME_RELEASES/$OLD_PRODUCTION_SHA"'));
  assert.ok(!rollback.includes('set_api_current'));
});

test('promotion CLI rejects arbitrary paths before any privileged operation', () => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(python, [join(directory, 'promote_release.py'), '/tmp/arbitrary/executable'], {
    cwd: dirname(directory),
    encoding: 'utf8',
  });
  assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /exactly 40 lowercase hexadecimal characters/);
});

test('promotion path and POSIX permission behavior have focused helper tests', () => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  const result = spawnSync(python, [join(directory, 'test_promote_release.py')], {
    cwd: dirname(directory),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
