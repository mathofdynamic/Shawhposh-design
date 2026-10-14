# Production operations

## Backups

The scheduled backup job writes the SQLite database and private receipt archive under `/var/backups/shawhposh/`, keeps 14 days, and protects the pair created by the current successful run. An owner can run it manually with `sudo systemctl start shawhposh-backup.service`; this is not passwordless for the deployment account. Do not delete backup files with `rm`, `find -delete`, or a separate cleanup job.

Check deletion auditing with `sudo ausearch --input-logs --key shawhposh_protected_ops --interpret`. The audit rules cover unlink, rename, and directory removal under the API, frontend, backup, and persistent-data paths.

## Runtime identity

The API, reservation expiry job, backup job, and optional replication job run as the non-login `shawhposh` system user. Runtime code belongs under `/opt/shawhposh/releases/<40-character-sha>` and `/opt/shawhposh/current`; root owns these paths and promoted files are not writable by `ubuntu` or `shawhposh`. Persistent state under `/var/lib/shawhposh` belongs to the runtime user. The `.env` file is `root:shawhposh` mode `0640`. Keep receipts and backups private to `shawhposh`.

## Runtime releases

Stage and validate Linux-compatible releases under `/home/ubuntu/shawhposh/releases/<SHA>`. Staging is untrusted and must never be a systemd working directory or executable path. The production ubuntu login shell uses umask `0002`; `git clone` inherits it and can create group-writable release trees. Set `umask 077` in the same remote shell before cloning or copying a release. This creates a private, ubuntu-owned staging tree without changing tracked executable bits.

For an existing staged tree, first confirm it is the expected ubuntu-owned release. Remove only group/world write bits from directories and regular files; this preserves ownership and executable bits:

```sh
find "$staging_release" -xdev -type d -perm /022 -exec chmod go-w -- {} +
find "$staging_release" -xdev -type f -perm /022 -exec chmod go-w -- {} +
```

Verify no group/world-writable directories or files remain:

```sh
find "$staging_release" -xdev \( -type d -o -type f \) -perm /022 -print
```

The check must return no paths. The bootstrap installer independently rejects a group/world-writable release root and group/world-writable `install-bootstrap-runner.sh` or `bootstrap_runner.py` inputs. The root-owned `/usr/local/sbin/shawhposh-promote-release` accepts only a 40-character lowercase hexadecimal release ID, copies an allowlisted runtime artifact set into `/opt/shawhposh/releases/<SHA>`, validates the protected tree, atomically updates `/opt/shawhposh/current`, restarts only `shawhposh-api.service`, and restores the prior protected release if health verification fails.

Promotion requires owner-authenticated `sudo`; `timestamp_timeout=0` prevents reusing a cached sudo authorization. Passwordless sudo is limited to Nginx config validation and reload. Before promotion, the owner must review and approve the staged release. The SHA constrains the release directory name; it is not a cryptographic artifact signature. Keep frontend releases on the existing static deployment path. After the initial cutover, application rollback must promote a previously validated release from `/opt/shawhposh/releases`, never point production back into the ubuntu staging tree.

## Off-host backups

Off-host replication is prepared but is not active until the owner selects a destination. The adapter uses a configured rclone remote, so the same script can target S3-compatible storage, SFTP, or another supported rclone backend. It selects only the latest matching database/receipt pair, uploads both with immutable names, streams each remote object back through SHA-256, and logs filename, byte count, and digest. It never deletes local or remote data. A failed replication returns non-zero from `shawhposh-replicate.service`; the local backup remains available and its 14-day retention stays authoritative. The backup unit's `OnSuccess` hook starts replication only after a successful local backup. When no remote config files exist, the replication unit is skipped.

After choosing a provider, the owner must supply its endpoint, bucket/container or remote directory, region if applicable, an access-key identifier, the secret directly on the server, and remote versioning/retention settings. Use a narrowly scoped credential that can write and read back objects under this backup prefix for verification, but cannot delete old versions where the provider supports that distinction. Keep the rclone config at `/etc/shawhposh/rclone.conf` with root-only source permissions; systemd passes it to the replication unit as a credential. Put only the non-secret destination in `/etc/shawhposh/offsite.env`, for example `SHAWHPOSH_OFFSITE_REMOTE=archive:shawhposh`. Install rclone at `/usr/bin/rclone`, install `ops/shawhposh-replicate.service`, then verify one real pair before relying on the automatic `OnSuccess` hook. Never copy `.env`, SSH keys, Bale tokens, or server credentials off-host.

The replication helper is `ops/replicate-backups.mjs`. It requires an absolute `RCLONE_CONFIG` path, and is tested with `npm run test:ops`. Rclone's `copyto --immutable` avoids overwriting an existing mismatched backup object; the helper then reads each remote object with `rclone cat` and compares exact size and SHA-256. See the [rclone copyto documentation](https://rclone.org/commands/rclone_copyto/) and [rclone cat documentation](https://rclone.org/commands/rclone_cat/).

## Releases

Release pruning is not scheduled. `ops/retain-releases.sh` applies only to the ubuntu staging API and static frontend release roots; it never manages `/opt/shawhposh`. Review staging/frontend candidates first with `ops/retain-releases.sh --dry-run PREVIOUS_API_SHA PREVIOUS_WEB_SHA`, supplying exact verified IDs. The script refuses symlink/ambiguous entries, preserves the supplied staging/frontend releases, and keeps up to five. `--apply` prompts for each exact release name. Protected runtime releases are retained for rollback and must not be pruned by this script or a broad `rm -rf`/`find -delete` command.
