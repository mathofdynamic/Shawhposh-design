# Automatic full-stack deployment

`ops/shawhposh-deploy` is the only routine passwordless production operation. After the one-time owner bootstrap, deploy one commit reachable from `origin/main` with:

```sh
sudo -n /usr/local/sbin/shawhposh-deploy <40-character-main-commit-sha>
```

The SHA is the only accepted argument. The root-owned helper fetches the fixed GitHub repository, verifies ancestry from `origin/main`, and compares the migration set with the active production commit. A migration-set change stops with `MANUAL MIGRATION REQUIRED`; automatic deployments never run migrations.

The helper builds and runs the complete validation suite as the isolated `shawhposh-build` account, without production secrets or state access. It prepares both a root-owned backend release in `/opt/shawhposh/releases/<sha>` and a root-owned static Vite release in `/var/www/shawhposh/releases/<sha>`. It then switches both `current` symlinks, restarts only `shawhposh-api.service`, and verifies the API version/database/runtime owner, served HTML and referenced assets, and unchanged public payment/shipping configuration. A failed health gate restores both previous symlinks, restarts the previous API, and verifies the rollback. The current and previous releases are always retained on each side.

Build/test failures occur before either production pointer changes. The helper does not alter business records, payments, shipping, or the database schema. It logs requester, SHA, previous releases, build/promotion/health outcomes, and rollback status to journald/syslog without logging secrets.

## One-time owner installation

The production server is still on the legacy PM2 runtime until the owner runs the final bootstrap once from the exact clean `origin/main` release staged under `/home/ubuntu/shawhposh/releases/<sha>`:

```sh
sudo bash ops/bootstrap-production-automation.sh
```

The owner enters the sudo password interactively and confirms `AUTOMATE SHAWHPosh`. The bootstrap performs the dedicated runtime cutover, makes the existing frontend release tree root-owned/read-only for `ubuntu`, verifies the runtime, then installs the isolated builder, root-owned full-stack deploy helper/libraries, and the exact SHA-regex sudo rule. The installer does not enable payments or shipping and does not configure off-host backup credentials. If the runtime gate passes but deploy-helper installation fails, it preserves the healthy runtime and restores the previous sudo policy.

## Codex deployment workflow after installation

1. Make the requested changes.
2. Run the full test suite.
3. Commit and push the approved change to `main`.
4. Capture and verify the exact 40-character commit SHA.
5. Connect only with the approved AR Universal key:

   ```sh
   ssh -i "C:\Users\matho\.ssh\ar-UNIVERSAL-privatekey.pem" -o IdentitiesOnly=yes -o BatchMode=yes ubuntu@37.32.5.115
   ```

6. Run the single production command:

   ```sh
   sudo -n /usr/local/sbin/shawhposh-deploy <SHA>
   ```

7. Review the deployment result and confirm it reports the requested backend/frontend SHA and successful health gates.
8. Verify `https://shawhposh.ir/` serves the deployed frontend and `https://shawhposh.ir/api/health` reports `status=ok`, `database=connected`, and the same version.

No owner password is needed for routine deployment. The sudo rule grants only the fixed SHA-scoped deploy helper; it does not grant arbitrary root commands or generic `systemctl` access.

## Operational limits

- The deploy source is fetched from the fixed repository, never from `ubuntu`-writable staging.
- Build jobs run in transient systemd units capped at 768 MiB memory plus 512 MiB swap, with Node's heap capped at 640 MiB and no production secrets. Private/link-local network ranges are denied during dependency installation, and build/test steps run with private networking.
- The backend service runs as `shawhposh`; backend and frontend releases are root-owned and read-only to both `ubuntu` and the runtime account.
- Payment/shipping configuration snapshots must remain unchanged across deployment. Owner-configured methods are preserved exactly.
- Off-host backup replication remains inactive until an owner supplies and configures a real destination.
- Main branch protection and GitHub account security remain part of the trusted source boundary.
