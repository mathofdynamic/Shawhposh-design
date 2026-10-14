import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const directory = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(directory, name), 'utf8');
const runner = read('bootstrap_runner.py');
const installer = read('install-bootstrap-runner.sh');
const bootstrap = read('bootstrap-production-automation.sh');
const operations = read('../docs/OPERATIONS.md');
const packageJson = JSON.parse(readFileSync(join(directory, '..', 'package.json'), 'utf8'));

test('temporary sudo interface is a root-owned fixed helper with one SHA argument', () => {
  assert.match(runner, /RUNNER_PATH = Path\("\/usr\/local\/sbin\/shawhposh-bootstrap"\)/);
  assert.match(runner, /SHA_PATTERN = re\.compile\(r"\^\[0-9a-f\]\{40\}\$"\)/);
  assert.match(runner, /len\(values\) != 1/);
  assert.match(runner, /REPOSITORY_URL = "https:\/\/github\.com\/mathofdynamic\/Shawhposh-design\.git"/);
  assert.match(runner, /merge-base.*--is-ancestor/);
  assert.match(runner, /refs\/remotes\/origin\/main/);
  assert.doesNotMatch(runner, /\/home\/ubuntu\/shawhposh\/releases/);
  assert.doesNotMatch(installer, /NOPASSWD:\s*ALL/);
  assert.match(installer, /ubuntu ALL=\(root\) NOPASSWD: \$RUNNER_TARGET \$SHA_ARGUMENT/);
  assert.match(installer, /"\$VISUDO" -cf \/etc\/sudoers/);
  assert.match(installer, /test ! -w "\$RUNNER_TARGET"/);
  assert.match(installer, /expect_denied \/bin\/bash/);
  assert.match(installer, /expect_denied \/usr\/bin\/systemctl status nginx/);
});

test('bootstrap installer validates Ubuntu production executable paths', () => {
  for (const [name, executable] of [
    ['GIT', '/usr/bin/git'],
    ['PYTHON3', '/usr/bin/python3'],
    ['SUDO', '/usr/bin/sudo'],
    ['RUNUSER', '/usr/sbin/runuser'],
    ['VISUDO', '/usr/sbin/visudo'],
  ]) {
    assert.ok(installer.includes(`readonly ${name}=${executable}`), `${name} must use ${executable}`);
    assert.ok(installer.includes(`-x $${name}`), `${name} must be checked before installation`);
  }
  assert.equal(installer.includes('/usr/bin/' + 'runuser'), false);
});

test('staging guidance uses a restrictive umask and installer rejects writable release inputs', () => {
  assert.match(operations, /Set `umask 077` in the same remote shell before cloning, and keep it active through checkout, build, and Git validation/);
  assert.match(operations, /Run the no-results check after the last Git or staging operation/);
  assert.ok(operations.includes('find "$staging_release" -xdev -type d -perm /022 -exec chmod go-w -- {} +'));
  assert.ok(operations.includes('find "$staging_release" -xdev -type f -perm /022 -exec chmod go-w -- {} +'));
  assert.match(installer, /root_mode=\$\(stat -c '%a' -- "\$source_root"\)/);
  assert.match(installer, /\(\( \(8#\$root_mode & 0022\) == 0 \)\)/);
  assert.match(installer, /for source in "\$script_path" "\$source_root\/ops\/bootstrap_runner\.py"; do/);
  assert.match(installer, /\(\( \(8#\$mode & 0022\) == 0 \)\)/);
});

test('runner prepares root-owned allowlisted artifacts and invokes only its trusted controller', () => {
  for (const artifact of [
    'ops/bootstrap-production-automation.sh',
    'ops/runtime-cutover.sh',
    'ops/install-automated-deploy.sh',
    'ops/automated_deploy.py',
    'ops/promote_frontend.py',
    'ops/promote_release.py',
    'ops/replicate-backups.mjs',
    'ops/sudoers.d/ubuntu-shawhposh',
  ]) assert.ok(runner.includes(`"${artifact}"`), artifact);
  assert.match(runner, /owner_uid: int = 0, owner_gid: int = 0/);
  assert.match(runner, /os\.chown\(destination, owner_uid, owner_gid\)/);
  assert.match(runner, /os\.chmod\(destination, 0o600\)/);
  assert.match(runner, /NODE_ARTIFACTS = \("ops\/replicate-backups\.mjs",\)/);
  assert.match(runner, /"\/bin\/bash", str\(script\), "--trusted-runner"/);
  assert.match(runner, /SHAWHPOSH_BOOTSTRAP_TRUSTED_ROOT/);
  assert.match(runner, /SHAWHPOSH_BOOTSTRAP_RUNNER_CONFIRMATION/);
  assert.doesNotMatch(runner, /shell\s*=\s*True/);
});

test('bootstrap accepts noninteractive mode only from the root runner and preserves transactional resume paths', () => {
  assert.match(bootstrap, /BOOTSTRAP_RUNNER_CONTEXT_VALUE='SHAWHPOSH_BOOTSTRAP_RUNNER-v1'/);
  assert.match(bootstrap, /\[\[ -t 0 && -t 1 \]\]/);
  assert.match(bootstrap, /RUNNER_MODE=1/);
  assert.match(bootstrap, /confirmation=\$\{SHAWHPOSH_BOOTSTRAP_RUNNER_CONFIRMATION:-\}/);
  assert.match(bootstrap, /RESUME_RUNTIME/);
  assert.match(bootstrap, /RESUME_FINAL_INSTALL/);
  assert.match(bootstrap, /healthy runtime was preserved/i);
});

test('bootstrap runner unit tests are part of the normal ops test command', () => {
  assert.match(packageJson.scripts['test:ops'], /bootstrap-runner\.test\.mjs/);
});

test('Python bootstrap runner tests pass', () => {
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  const executable = candidates.find(candidate => {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    return result.status === 0;
  });
  assert.ok(executable, 'Python 3 is required to run bootstrap runner tests.');
  const args = executable === 'py'
    ? ['-3', '-I', join(directory, 'test_bootstrap_runner.py')]
    : ['-I', join(directory, 'test_bootstrap_runner.py')];
  const result = spawnSync(executable, args, { cwd: dirname(directory), encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
