import { createHash } from 'node:crypto';
import { createReadStream, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BACKUP_DIRECTORY = '/var/backups/shawhposh';
const RCLONE_BINARY = '/usr/bin/rclone';
const DATABASE_NAME = /^shawhposh-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.sqlite$/;
const RECEIPT_NAME = /^payment-receipts-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)\.tar\.gz$/;
const REMOTE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function assertPrivateRegularFile(path, { requirePrivate = true } = {}) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0) {
    throw new Error('Backup artifact is not a non-empty regular file');
  }
  if (requirePrivate && (stat.mode & 0o077) !== 0) {
    throw new Error('Backup artifact permissions are broader than 0600');
  }
  return stat;
}

export function selectLatestCompleteBackupPair(directory = BACKUP_DIRECTORY, {
  expectedDirectory = BACKUP_DIRECTORY,
  requirePrivate = true,
} = {}) {
  const expected = resolve(expectedDirectory);
  const requested = resolve(directory);
  if (requested !== expected || requested === '/' || requested === resolve('/var/backups')) {
    throw new Error('Refusing unexpected backup directory');
  }
  const directoryStat = lstatSync(requested);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || realpathSync(requested) !== expected) {
    throw new Error('Backup directory is not the expected real directory');
  }

  const databases = new Map();
  const receipts = new Map();
  for (const name of readdirSync(requested)) {
    const databaseMatch = DATABASE_NAME.exec(name);
    const receiptMatch = RECEIPT_NAME.exec(name);
    if (databaseMatch) databases.set(databaseMatch[1], join(requested, name));
    if (receiptMatch) receipts.set(receiptMatch[1], join(requested, name));
  }

  const timestamps = [...databases.keys()].filter(timestamp => receipts.has(timestamp)).sort();
  if (!timestamps.length) throw new Error('No complete database and receipt backup pair is available');

  const timestamp = timestamps.at(-1);
  const databasePath = databases.get(timestamp);
  const receiptsPath = receipts.get(timestamp);
  const databaseStat = assertPrivateRegularFile(databasePath, { requirePrivate });
  const receiptsStat = assertPrivateRegularFile(receiptsPath, { requirePrivate });
  return {
    timestamp,
    artifacts: [
      { name: `shawhposh-${timestamp}.sqlite`, path: databasePath, size: databaseStat.size },
      { name: `payment-receipts-${timestamp}.tar.gz`, path: receiptsPath, size: receiptsStat.size },
    ],
  };
}

function validateRemoteRoot(remote) {
  if (typeof remote !== 'string' || remote.length > 512 || remote.includes('\0')) {
    throw new Error('SHAWHPOSH_OFFSITE_REMOTE is invalid');
  }
  const separator = remote.indexOf(':');
  if (separator < 1 || !REMOTE_NAME.test(remote.slice(0, separator))) {
    throw new Error('SHAWHPOSH_OFFSITE_REMOTE must use a configured rclone remote name');
  }
  const path = remote.slice(separator + 1).replace(/\/+$/, '');
  if (!path || path.split('/').some(part => part === '.' || part === '..') || /[*?\[\]]/.test(path)) {
    throw new Error('SHAWHPOSH_OFFSITE_REMOTE must identify one fixed remote directory');
  }
  return `${remote.slice(0, separator + 1)}${path}`;
}

function validateRcloneConfig(configFile) {
  if (typeof configFile !== 'string' || !isAbsolute(configFile)) {
    throw new Error('RCLONE_CONFIG must be an absolute server-side credential path');
  }
  const stat = lstatSync(configFile);
  const unsafeMode = process.platform !== 'win32' && ((stat.mode & 0o022) !== 0 || (stat.mode & 0o004) !== 0);
  if (!stat.isFile() || stat.isSymbolicLink() || unsafeMode) {
    throw new Error('RCLONE_CONFIG must be a regular, non-world-readable, non-writable file');
  }
}

async function sha256File(path) {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(path)) {
    size += chunk.length;
    hash.update(chunk);
  }
  return { size, sha256: hash.digest('hex') };
}

function copyToRemote({ binary, configFile, sourcePath, destinationPath }) {
  const result = spawnSync(binary, [
    '--config', configFile,
    'copyto', '--immutable', sourcePath, destinationPath,
  ], { encoding: 'utf8', stdio: 'ignore', timeout: 30 * 60 * 1000 });
  if (result.error || result.status !== 0) {
    throw new Error(`rclone copy failed (exit ${result.status ?? 'unavailable'})`);
  }
}

function hashRemoteFile({ binary, configFile, remotePath }) {
  return new Promise((resolveHash, reject) => {
    const child = spawn(binary, ['--config', configFile, 'cat', remotePath], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const hash = createHash('sha256');
    let size = 0;
    let settled = false;
    const timeout = setTimeout(() => child.kill('SIGTERM'), 30 * 60 * 1000);
    timeout.unref();
    child.stdout.on('data', chunk => {
      size += chunk.length;
      hash.update(chunk);
    });
    child.once('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error('rclone remote verification could not start'));
    });
    child.once('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`rclone remote verification failed (exit ${code ?? 'unavailable'})`));
        return;
      }
      resolveHash({ size, sha256: hash.digest('hex') });
    });
  });
}

export async function replicateBackups({
  directory = BACKUP_DIRECTORY,
  expectedDirectory = BACKUP_DIRECTORY,
  remote,
  configFile,
  binary = RCLONE_BINARY,
  requirePrivate = true,
  copy = copyToRemote,
  hashRemote = hashRemoteFile,
  log = record => console.log(JSON.stringify(record)),
} = {}) {
  if (!remote?.trim()) {
    log({ event: 'backup_replication_skipped', reason: 'destination_not_configured' });
    return { skipped: true };
  }

  const remoteRoot = validateRemoteRoot(remote.trim());
  validateRcloneConfig(configFile);
  const pair = selectLatestCompleteBackupPair(directory, { expectedDirectory, requirePrivate });
  const verified = [];
  for (const artifact of pair.artifacts) {
    const local = await sha256File(artifact.path);
    if (local.size !== artifact.size) throw new Error(`Local backup changed while reading: ${artifact.name}`);
    const remotePath = `${remoteRoot}/${artifact.name}`;
    await copy({ binary, configFile, sourcePath: artifact.path, destinationPath: remotePath });
    const remoteDigest = await hashRemote({ binary, configFile, remotePath });
    if (remoteDigest.size !== local.size || remoteDigest.sha256 !== local.sha256) {
      throw new Error(`Off-host verification mismatch: ${artifact.name}`);
    }
    log({
      event: 'backup_replication_verified',
      file: artifact.name,
      sizeBytes: local.size,
      sha256: local.sha256,
    });
    verified.push({ file: artifact.name, sizeBytes: local.size, sha256: local.sha256 });
  }
  return { skipped: false, verified };
}

async function main() {
  return replicateBackups({
    directory: process.env.BACKUP_DIRECTORY || BACKUP_DIRECTORY,
    remote: process.env.SHAWHPOSH_OFFSITE_REMOTE,
    configFile: process.env.RCLONE_CONFIG,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(JSON.stringify({ event: 'backup_replication_failed', message: error.message }));
    process.exitCode = 1;
  });
}
