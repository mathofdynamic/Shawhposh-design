import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { replicateBackups, selectLatestCompleteBackupPair } from './replicate-backups.mjs';

async function withBackupDirectory(callback) {
  const directory = mkdtempSync(join(tmpdir(), 'shawhposh-backups-'));
  try {
    await callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function writePair(directory, timestamp, { database = true, receipts = true } = {}) {
  const files = {};
  if (database) {
    files.database = join(directory, `shawhposh-${timestamp}.sqlite`);
    writeFileSync(files.database, `database:${timestamp}`);
  }
  if (receipts) {
    files.receipts = join(directory, `payment-receipts-${timestamp}.tar.gz`);
    writeFileSync(files.receipts, `receipts:${timestamp}`);
  }
  return files;
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

test('selects the latest complete matching backup pair and ignores an incomplete newer file', async () => {
  await withBackupDirectory(directory => {
    writePair(directory, '2026-10-11T20-00-00.000Z');
    writePair(directory, '2026-10-12T07-00-00.000Z', { database: true, receipts: false });
    const selected = selectLatestCompleteBackupPair(directory, { expectedDirectory: directory, requirePrivate: false });
    assert.equal(selected.timestamp, '2026-10-11T20-00-00.000Z');
    assert.deepEqual(selected.artifacts.map(item => item.name), [
      'shawhposh-2026-10-11T20-00-00.000Z.sqlite',
      'payment-receipts-2026-10-11T20-00-00.000Z.tar.gz',
    ]);
  });
});

test('copies only the selected pair and verifies remote byte count and SHA-256', async () => {
  await withBackupDirectory(async directory => {
    const files = writePair(directory, '2026-10-12T07-00-00.000Z');
    const configFile = join(directory, 'rclone.conf');
    writeFileSync(configFile, '[archive]\ntype = s3\n');
    const remoteObjects = new Map();
    const logs = [];
    const result = await replicateBackups({
      directory,
      expectedDirectory: directory,
      remote: 'archive:shawhposh',
      configFile,
      requirePrivate: false,
      copy: ({ sourcePath, destinationPath }) => remoteObjects.set(destinationPath, readFileSync(sourcePath)),
      hashRemote: ({ remotePath }) => {
        const bytes = remoteObjects.get(remotePath);
        return { size: bytes.length, sha256: digest(bytes) };
      },
      log: item => logs.push(item),
    });
    assert.equal(result.verified.length, 2);
    assert.equal(remoteObjects.size, 2);
    assert.deepEqual(result.verified.map(item => item.sha256), [
      digest(readFileSync(files.database)),
      digest(readFileSync(files.receipts)),
    ]);
    assert.equal(logs.length, 2);
  });
});

test('does not claim success when the remote bytes differ', async () => {
  await withBackupDirectory(async directory => {
    writePair(directory, '2026-10-12T07-00-00.000Z');
    const configFile = join(directory, 'rclone.conf');
    writeFileSync(configFile, '[archive]\ntype = s3\n');
    await assert.rejects(replicateBackups({
      directory,
      expectedDirectory: directory,
      remote: 'archive:shawhposh',
      configFile,
      requirePrivate: false,
      copy: () => undefined,
      hashRemote: () => ({ size: 1, sha256: '0'.repeat(64) }),
      log: () => undefined,
    }), /Off-host verification mismatch/);
  });
});

test('skips cleanly until a remote destination is configured', async () => {
  const logs = [];
  const result = await replicateBackups({ log: item => logs.push(item) });
  assert.deepEqual(result, { skipped: true });
  assert.deepEqual(logs, [{ event: 'backup_replication_skipped', reason: 'destination_not_configured' }]);
});

test('rejects a remote root that could escape or broaden the configured destination', async () => {
  await withBackupDirectory(async directory => {
    const configFile = join(directory, 'rclone.conf');
    writeFileSync(configFile, '[archive]\ntype = s3\n');
    await assert.rejects(replicateBackups({
      directory,
      expectedDirectory: directory,
      remote: 'archive:backups/../other',
      configFile,
      requirePrivate: false,
      log: () => undefined,
    }), /fixed remote directory/);
  });
});
