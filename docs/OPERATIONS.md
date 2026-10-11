# Production operations

## Backups

Run the normal backup job with `sudo systemctl start shawhposh-backup.service`. It writes the SQLite database and private receipt archive under `/var/backups/shawhposh/`, keeps 14 days, and protects the pair created by the current successful run. Do not delete backup files with `rm`, `find -delete`, or a separate cleanup job.

Check deletion auditing with `sudo ausearch --input-logs --key shawhposh_protected_ops --interpret`. The audit rules cover unlink, rename, and directory removal under the API, frontend, backup, and persistent-data paths.

## Releases

Release pruning is not scheduled. Review candidates first with `ops/retain-releases.sh --dry-run PREVIOUS_API_SHA PREVIOUS_WEB_SHA`, supplying the exact previously verified release IDs. The script is limited to the two exact Shawhposh release roots, refuses symlink/ambiguous entries, preserves the active and supplied previous release, and keeps up to five releases. `--apply` prompts for each exact release name; do not replace it with broad `rm -rf` or `find -delete` commands.
