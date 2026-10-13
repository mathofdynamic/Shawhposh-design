# Automatic backend deployment

`ops/shawhposh-deploy` is the only passwordless production deployment entry point. After the one-time owner installation, the deployment account can request an API release with:

```sh
sudo -n /usr/local/sbin/shawhposh-deploy <40-character-main-commit-sha>
```

The helper accepts one lowercase 40-character commit ID. It fetches the fixed GitHub repository over HTTPS, verifies the commit is an ancestor of `origin/main`, and compares the target database migration set with the active release. A migration-set change stops with `MANUAL MIGRATION REQUIRED`.

Source is exported from the root-owned fetch, not `/home/ubuntu` staging. `shawhposh-build` runs dependency installation and validation in transient systemd units with a clean environment, no production secrets or state access, private networking for tests, and private/link-local network ranges denied during `npm ci`. Build jobs are capped at 40% CPU, 256 MiB soft memory, 512 MiB memory, and 256 MiB swap to limit impact on the small live VPS; a job that exceeds its limits fails before promotion. The resulting allowlisted runtime artifacts are copied into root-owned `/opt/shawhposh/releases/<sha>`. The helper atomically selects the release, restarts only `shawhposh-api.service`, and checks health, database connectivity, version, and process owner. On failure it restores the previous protected release and verifies its health.

The helper does not run migrations, configure payment or shipping, or alter business records. It does not deploy the static Vite frontend. Frontend releases continue through the existing separate static-release procedure.

## One-time owner installation

Run this only after the dedicated runtime cutover is complete and verified. The installer refuses to proceed unless `/opt/shawhposh/current` points to a root-owned release and the active API is healthy under systemd as `shawhposh`. It creates the locked `shawhposh-build` account and root-owned helper files, then installs the SHA-scoped sudo rule. It does not restart the application or touch the database.

From a clean checkout whose `main` matches `origin/main`:

```sh
less ops/install-automated-deploy.sh
sudo bash ops/install-automated-deploy.sh
```

The owner enters the sudo password interactively for this one installation. The script keeps a root-only backup of the previous Shawhposh sudoers file and restores it if final sudo policy validation fails.

## Operational boundary

- Deployment target must remain reachable from `origin/main`; arbitrary refs and filesystem paths are rejected.
- Build or test failures leave the active release unchanged.
- Only the API runtime is promoted. A full website release still requires the separate frontend procedure.
- The build account has public network access only during `npm ci`; systemd denies loopback, link-local, RFC1918, and unique-local IPv6 ranges in that step, with only the VPS's `127.0.0.53` DNS stub allowed through the loopback filter. Test/build steps use a private network namespace.
- Main branch protection and GitHub account security remain part of the trusted source boundary.
- Do not install this helper before the protected runtime cutover. The current legacy PM2 deployment does not satisfy the installer preflight.
