const timestampPattern = String.raw`\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z`;
const databaseBackupPattern = new RegExp(`^shawhposh-${timestampPattern}\\.sqlite$`);
const receiptBackupPattern = new RegExp(`^payment-receipts-${timestampPattern}\\.tar\\.gz$`);

export type BackupRetentionEntry = {
  name: string;
  isRegularFile: boolean;
  modifiedAtMs: number;
};

export function getExpiredBackupNames(
  entries: BackupRetentionEntry[],
  cutoffMs: number,
  protectedNames: ReadonlySet<string>,
): string[] {
  return entries
    .filter(({ name, isRegularFile, modifiedAtMs }) =>
      isRegularFile
      && !protectedNames.has(name)
      && (databaseBackupPattern.test(name) || receiptBackupPattern.test(name))
      && Number.isFinite(modifiedAtMs)
      && modifiedAtMs < cutoffMs,
    )
    .map(({ name }) => name);
}

export function isBackupArtifactName(name: string): boolean {
  return databaseBackupPattern.test(name) || receiptBackupPattern.test(name);
}
