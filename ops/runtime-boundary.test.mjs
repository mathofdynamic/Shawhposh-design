import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const directory = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(join(directory, name), 'utf8');
const runtimePath = '/opt/shawhposh/current';
const stagingPath = '/home/ubuntu/shawhposh/current';

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

test('sudo policy requires owner authentication for SHA-scoped promotion', () => {
  const policy = read('sudoers.d/ubuntu-shawhposh');
  const hashPattern = '[0-9a-f]'.repeat(40);
  assert.ok(policy.includes(`/usr/local/sbin/shawhposh-promote-release ${hashPattern}`));
  assert.ok(policy.includes('Defaults:ubuntu timestamp_timeout=0'));
  assert.ok(policy.includes('ubuntu ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx'));
  assert.ok(policy.includes('ubuntu ALL=(root) PASSWD: /usr/local/sbin/shawhposh-promote-release'));
  assert.ok(!policy.includes('NOPASSWD: /usr/local/sbin/shawhposh-promote-release'));
  assert.ok(!policy.includes('systemctl restart shawhposh-api.service'));
  assert.ok(!policy.includes('systemctl start shawhposh-backup.service'));
  assert.ok(!policy.includes('systemctl *'));
  assert.ok(!policy.includes('/bin/bash'));
  assert.ok(!policy.includes('--prepare'));
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
