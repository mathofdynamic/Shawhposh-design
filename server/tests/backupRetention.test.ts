import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExpiredBackupNames } from '../db/backupRetention';

test('backup retention selects only old regular files with exact Shawhposh backup names', () => {
  const expired = getExpiredBackupNames([
    { name: 'shawhposh-2026-09-01T00-00-00.000Z.sqlite', isRegularFile: true, modifiedAtMs: 1 },
    { name: 'payment-receipts-2026-09-01T00-00-00.000Z.tar.gz', isRegularFile: true, modifiedAtMs: 1 },
    { name: 'env-before-3592473.bak', isRegularFile: true, modifiedAtMs: 1 },
    { name: 'shawhposh-2026-09-01T00-00-00.000Z.sqlite', isRegularFile: false, modifiedAtMs: 1 },
    { name: 'shawhposh-2026-10-11T20-36-14.019Z.sqlite', isRegularFile: true, modifiedAtMs: 10_000 },
  ], 100, new Set());

  assert.deepEqual(expired, [
    'shawhposh-2026-09-01T00-00-00.000Z.sqlite',
    'payment-receipts-2026-09-01T00-00-00.000Z.tar.gz',
  ]);
});

test('retention never removes the newly completed pair when its mtime is older than the cutoff', () => {
  const protectedPair = new Set([
    'shawhposh-2026-10-11T20-36-14.019Z.sqlite',
    'payment-receipts-2026-10-11T20-36-14.019Z.tar.gz',
  ]);
  const expired = getExpiredBackupNames([
    { name: 'shawhposh-2026-10-11T20-36-14.019Z.sqlite', isRegularFile: true, modifiedAtMs: 1 },
    { name: 'payment-receipts-2026-10-11T20-36-14.019Z.tar.gz', isRegularFile: true, modifiedAtMs: 1 },
    { name: 'shawhposh-2026-08-01T00-00-00.000Z.sqlite', isRegularFile: true, modifiedAtMs: 1 },
  ], 100, protectedPair);

  assert.deepEqual(expired, ['shawhposh-2026-08-01T00-00-00.000Z.sqlite']);
});
