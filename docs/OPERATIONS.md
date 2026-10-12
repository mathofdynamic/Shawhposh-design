# Production operations

## Backups

Run the normal backup job with `sudo systemctl start shawhposh-backup.service`. It writes the SQLite database and private receipt archive under `/var/backups/shawhposh/`, keeps 14 days, and protects the pair created by the current successful run. Do not delete backup files with `rm`, `find -delete`, or a separate cleanup job.

Check deletion auditing with `sudo ausearch --input-logs --key shawhposh_protected_ops --interpret`. The audit rules cover unlink, rename, and directory removal under the API, frontend, backup, and persistent-data paths.

## Runtime identity

The production API, reservation expiry job, and backup job should run as the non-login `shawhposh` system user. Keep release files owned by `ubuntu` and readable/executable by the runtime account; keep `/var/lib/shawhposh` and its SQLite/WAL files private to `shawhposh`. The `.env` file should be `root:shawhposh` mode `0640`, with `/var/lib/shawhposh` remaining mode `0700` and owned by the runtime user. Do not start the systemd units until the account, data ownership, environment-file access, and rollback have been prepared and verified. `ops/shawhposh-api.service` replaces only the Shawhposh PM2 process; unrelated PM2 applications remain under their existing owners. The prepared sudo policy adds only the exact `/usr/bin/systemctl restart shawhposh-api.service` command to the existing three-command allowlist; it does not grant arbitrary systemctl access.

## Off-host backups

Off-host replication is prepared but is not active until the owner selects a destination. The adapter uses a configured rclone remote, so the same script can target S3-compatible storage, SFTP, or another supported rclone backend. It selects only the latest matching database/receipt pair, uploads both with immutable names, streams each remote object back through SHA-256, and logs filename, byte count, and digest. It never deletes local or remote data. A failed replication returns non-zero from `shawhposh-replicate.service`; the local backup remains available and its 14-day retention stays authoritative. The backup unit's `OnSuccess` hook starts replication only after a successful local backup. When no remote config files exist, the replication unit is skipped.

After choosing a provider, the owner must supply its endpoint, bucket/container or remote directory, region if applicable, an access-key identifier, the secret directly on the server, and remote versioning/retention settings. Use a narrowly scoped credential that can write and read back objects under this backup prefix for verification, but cannot delete old versions where the provider supports that distinction. Keep the rclone config at `/etc/shawhposh/rclone.conf` with root-only source permissions; systemd passes it to the replication unit as a credential. Put only the non-secret destination in `/etc/shawhposh/offsite.env`, for example `SHAWHPOSH_OFFSITE_REMOTE=archive:shawhposh`. Install rclone at `/usr/bin/rclone`, install `ops/shawhposh-replicate.service`, then verify one real pair before relying on the automatic `OnSuccess` hook. Never copy `.env`, SSH keys, Bale tokens, or server credentials off-host.

The replication helper is `ops/replicate-backups.mjs`. It requires an absolute `RCLONE_CONFIG` path, and is tested with `npm run test:ops`. Rclone's `copyto --immutable` avoids overwriting an existing mismatched backup object; the helper then reads each remote object with `rclone cat` and compares exact size and SHA-256. See the [rclone copyto documentation](https://rclone.org/commands/rclone_copyto/) and [rclone cat documentation](https://rclone.org/commands/rclone_cat/).

## Releases

Release pruning is not scheduled. Review candidates first with `ops/retain-releases.sh --dry-run PREVIOUS_API_SHA PREVIOUS_WEB_SHA`, supplying the exact previously verified release IDs. The script is limited to the two exact Shawhposh release roots, refuses symlink/ambiguous entries, preserves the active and supplied previous release, and keeps up to five releases. `--apply` prompts for each exact release name; do not replace it with broad `rm -rf` or `find -delete` commands.
