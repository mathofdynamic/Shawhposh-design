#!/usr/bin/python3 -I
"""One-time SHA-pinned migration release for the approved 0006/0007 schema change."""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import sqlite3
import stat
import sys
import tempfile
import time
import uuid
from pathlib import Path
from urllib.parse import quote

sys.dont_write_bytecode = True
DEPLOY_LIBRARY = Path("/usr/local/lib/shawhposh-deploy")
sys.path.insert(0, str(DEPLOY_LIBRARY if DEPLOY_LIBRARY.is_dir() else Path(__file__).resolve().parent))

import automated_deploy as deploy  # noqa: E402
import promote_frontend as frontend  # noqa: E402
import promote_release as promotion  # noqa: E402


BASELINE_SHA = "05e018567f9a7a037dee2fa78ed5436ac7bdefe8"
APPROVED_SHA_FILE = Path("/run/shawhposh-migration-release.sha")
ENTRYPOINT = Path("/usr/local/sbin/shawhposh-migrate-release")
DATABASE_PATH = Path("/var/lib/shawhposh/shawhposh.sqlite")
BACKUP_DIRECTORY = Path("/var/backups/shawhposh")
BACKUP_SERVICE = "shawhposh-backup.service"
BACKUP_TIMER = "shawhposh-backup.timer"
RESERVATIONS_SERVICE = "shawhposh-reservations.service"
RESERVATIONS_TIMER = "shawhposh-reservations.timer"
SERVICE_NAME = "shawhposh-api.service"
FRESH_BACKUP_MAX_AGE_SECONDS = 300
MIGRATION_ROOT_PREFIX = "shawhposh-migration-"

BASELINE_MIGRATIONS = (
    1790835004793,
    1791005312353,
    1791031425709,
    1791286100663,
    1791726079654,
    1791738236767,
)
TARGET_MIGRATIONS = BASELINE_MIGRATIONS + (1793656996858, 1793715179209)

EXPECTED_MIGRATION_CHANGES = {
    "server/db/migrations/0006_simple_black_panther.sql": "A",
    "server/db/migrations/0007_correct_persian_catalog_copy.sql": "A",
    "server/db/migrations/meta/0006_snapshot.json": "A",
    "server/db/migrations/meta/0007_snapshot.json": "A",
    "server/db/migrations/meta/_journal.json": "M",
}
EXPECTED_CHANGED_FILE_SHA256 = {
    "server/db/migrations/0006_simple_black_panther.sql": "ac889edc0ded0bc8ce0368aeab393ba111e05fabb33bef4f2c0fec26fb2b004f",
    "server/db/migrations/0007_correct_persian_catalog_copy.sql": "dd2bac8b7693182f2ad8d5dce97b585a836a5cdfcde13aab4ccfd8d6dec8ed2b",
    "server/db/migrations/meta/0006_snapshot.json": "fe3b465d214e6fd1508701bd860976bcae73b1d9974587dafb048cf0a320c545",
    "server/db/migrations/meta/0007_snapshot.json": "0a6f5759a7361c1e35cedbac9997e94f54aaddba18a3c8f101c4558ce222f365",
    "server/db/migrations/meta/_journal.json": "a03b8361d49ccedf4a60c56343eb11f8db91b7ec367206d9681ffeafd750571a",
}

EXPECTED_MIGRATION_TREE = frozenset(
    [f"server/db/migrations/{name}" for name in (
        "0000_luxuriant_leader.sql",
        "0001_phase2_commerce.sql",
        "0002_talented_sleeper.sql",
        "0003_phase25_shipping_methods.sql",
        "0004_funny_sabra.sql",
        "0005_bale_invoice_recovery.sql",
        "0006_simple_black_panther.sql",
        "0007_correct_persian_catalog_copy.sql",
    )]
    + [f"server/db/migrations/meta/{index:04d}_snapshot.json" for index in range(8)]
    + ["server/db/migrations/meta/_journal.json"]
)
BACKUP_NAME = re.compile(r"shawhposh-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.sqlite\Z")
SHA_PATTERN = re.compile(r"[0-9a-f]{40}\Z")


def _log(event: str, message: str) -> None:
    line = f"[MIGRATION RELEASE] {event} {message}"
    print(line, flush=True)
    deploy._log(event, message)


def _safe_path(path: Path, *, expected_uid: int | None = None, expected_mode: int | None = None) -> os.stat_result:
    try:
        info = path.lstat()
    except OSError as exc:
        raise deploy.DeployError(f"Required path is unavailable: {path}") from exc
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_nlink != 1:
        raise deploy.DeployError(f"Unsafe file type or link count: {path}")
    if expected_uid is not None and info.st_uid != expected_uid:
        raise deploy.DeployError(f"Unexpected file owner: {path}")
    if expected_mode is not None and stat.S_IMODE(info.st_mode) != expected_mode:
        raise deploy.DeployError(f"Unexpected file permissions: {path}")
    if path.resolve(strict=True) != path:
        raise deploy.DeployError(f"Path resolves through an unexpected alias: {path}")
    return info


def _read_approved_sha(requested_sha: str) -> str:
    info = _safe_path(APPROVED_SHA_FILE, expected_uid=0, expected_mode=0o400)
    if info.st_gid != 0 or info.st_size != 41:
        raise deploy.DeployError("The root-owned one-time SHA pin is malformed.")
    content = APPROVED_SHA_FILE.read_text(encoding="ascii")
    if not content.endswith("\n") or content.count("\n") != 1:
        raise deploy.DeployError("The root-owned one-time SHA pin is malformed.")
    approved_sha = content[:-1]
    if SHA_PATTERN.fullmatch(approved_sha) is None or requested_sha != approved_sha:
        raise deploy.DeployError("The requested SHA does not match the approved one-time main commit.")
    return approved_sha


def _cleanup_temporary_entrypoint(approved_sha: str) -> None:
    pin_info = _safe_path(APPROVED_SHA_FILE, expected_uid=0, expected_mode=0o400)
    if pin_info.st_gid != 0 or APPROVED_SHA_FILE.read_text(encoding="ascii") != f"{approved_sha}\n":
        raise deploy.DeployError("The one-time SHA pin changed before cleanup.")
    entry_info = _safe_path(ENTRYPOINT, expected_uid=0, expected_mode=0o755)
    if entry_info.st_gid != 0:
        raise deploy.DeployError("The one-time entrypoint changed ownership before cleanup.")
    ENTRYPOINT.unlink()
    APPROVED_SHA_FILE.unlink()
    _log("CLEANUP", "temporary_entrypoint=removed approved_sha_pin=removed")


def _verify_installed_entrypoint() -> None:
    if Path(__file__).absolute() != ENTRYPOINT:
        raise deploy.DeployError("The migration command must run from its fixed installed entrypoint.")
    info = _safe_path(ENTRYPOINT, expected_uid=0, expected_mode=0o755)
    if info.st_gid != 0:
        raise deploy.DeployError("The migration command is not owned by root:root.")


def _unit_active(unit: str) -> bool:
    result = promotion._run(["/usr/bin/systemctl", "is-active", unit])
    status = result.stdout.strip()
    if result.returncode == 0 and status == "active":
        return True
    if status in {"inactive", "failed"}:
        return False
    raise deploy.DeployError(f"Could not establish the state of systemd unit {unit}.")


def _systemctl(operation: str, unit: str, *, timeout: int = 60) -> None:
    result = promotion._run(["/usr/bin/systemctl", operation, unit], timeout=timeout)
    if result.returncode != 0:
        details = deploy._safe_tail(result.stderr or result.stdout or "")
        raise deploy.DeployError(f"systemctl {operation} {unit} failed. {details}".strip())


def _restore_unit(unit: str, was_active: bool, *, expect_active: bool) -> None:
    if not was_active:
        return
    if not _unit_active(unit):
        _systemctl("start", unit, timeout=120)
    if expect_active and not _unit_active(unit):
        raise deploy.DeployError(f"Previously active timer did not resume: {unit}")


def _migration_history(database_path: Path = DATABASE_PATH) -> tuple[int, ...]:
    allowed_path = database_path == DATABASE_PATH or (
        database_path.parent == BACKUP_DIRECTORY and BACKUP_NAME.fullmatch(database_path.name) is not None
    )
    if not allowed_path or database_path.resolve(strict=True) != database_path:
        raise deploy.DeployError("Production SQLite path differs from the fixed database path.")
    uri = f"file:{quote(database_path.as_posix(), safe='/')}?mode=ro"
    try:
        connection = sqlite3.connect(uri, uri=True, timeout=10)
        try:
            result = connection.execute("PRAGMA integrity_check").fetchone()
            if result is None or result[0] != "ok":
                raise deploy.DeployError("SQLite integrity_check did not return ok.")
            table = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
            ).fetchone()
            if table is None:
                raise deploy.DeployError("The expected Drizzle migration table is missing.")
            values = connection.execute(
                "SELECT created_at FROM __drizzle_migrations ORDER BY created_at"
            ).fetchall()
            return tuple(int(row[0]) for row in values)
        finally:
            connection.close()
    except sqlite3.Error as exc:
        raise deploy.DeployError("Could not verify the production SQLite database.") from exc


def _verify_git_migration_delta(mirror: Path, sha: str, env: dict[str, str]) -> None:
    deploy._require_main_ancestor(mirror, sha, env)
    main_tip = deploy._require_success(
        deploy._git(mirror, ["rev-parse", deploy.TRUSTED_BRANCH], env=env),
        "Resolve trusted origin/main tip",
    ).stdout.strip()
    if sha != main_tip:
        raise deploy.DeployError("The migration entrypoint accepts only the exact approved origin/main tip.")

    diff = deploy._require_success(
        deploy._git(
            mirror,
            ["diff", "--no-ext-diff", "--no-renames", "--name-status", BASELINE_SHA, sha, "--", "server/db/migrations"],
            env=env,
        ),
        "Compare the approved migration delta",
    ).stdout
    actual: dict[str, str] = {}
    for line in diff.splitlines():
        fields = line.split("\t", 1)
        if len(fields) != 2:
            raise deploy.DeployError("Migration change metadata is malformed.")
        status, name = fields
        if name in actual:
            raise deploy.DeployError("Migration tree contains duplicate change metadata.")
        actual[name] = status
    if actual != EXPECTED_MIGRATION_CHANGES:
        raise deploy.DeployError("Migration tree differs from the exact reviewed 0006/0007 allowlist.")

    for name, expected_hash in EXPECTED_CHANGED_FILE_SHA256.items():
        content = deploy._require_success(
            deploy._git(mirror, ["show", f"{sha}:{name}"], env=env, binary=True),
            "Read approved migration artifact",
        ).stdout
        if hashlib.sha256(content).hexdigest() != expected_hash:
            raise deploy.DeployError(f"Approved migration artifact content changed: {name}")


def _tree_records(mirror: Path, sha: str, env: dict[str, str]) -> list[tuple[str, str, str, str]]:
    tree = deploy._require_success(
        deploy._git(
            mirror,
            ["ls-tree", "-rz", "--full-tree", "-r", sha, "--", "server/db/migrations"],
            env=env,
            binary=True,
        ),
        "Read approved migration tree",
    ).stdout
    records: list[tuple[str, str, str, str]] = []
    for record in (value for value in tree.split(b"\0") if value):
        try:
            metadata, raw_path = record.split(b"\t", 1)
            mode, kind, oid = metadata.split(b" ", 2)
            path = raw_path.decode("ascii")
            records.append((mode.decode("ascii"), kind.decode("ascii"), oid.decode("ascii"), path))
        except (ValueError, UnicodeDecodeError) as exc:
            raise deploy.DeployError("Migration tree metadata is malformed.") from exc
    if {path for _, _, _, path in records} != EXPECTED_MIGRATION_TREE:
        raise deploy.DeployError("Migration tree contains an unapproved or missing artifact.")
    if any(kind != "blob" or mode not in {"100644", "100755"} for mode, kind, _, _ in records):
        raise deploy.DeployError("Migration tree contains an unsupported file type or mode.")
    return records


def _stage_migrations(mirror: Path, sha: str, env: dict[str, str]) -> Path:
    stage_root = Path(tempfile.mkdtemp(prefix=MIGRATION_ROOT_PREFIX, dir="/run"))
    os.chmod(stage_root, 0o755)
    try:
        records = _tree_records(mirror, sha, env)
        for _, _, oid, relative in records:
            content = deploy._require_success(
                deploy._git(mirror, ["cat-file", "blob", oid], env=env, binary=True),
                "Stage trusted migration artifact",
            ).stdout
            destination = stage_root / relative
            destination.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            descriptor = os.open(
                destination,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
                0o644,
            )
            try:
                with os.fdopen(descriptor, "wb", closefd=False) as stream:
                    stream.write(content)
                    stream.flush()
                    os.fsync(descriptor)
                os.fchmod(descriptor, 0o644)
            finally:
                os.close(descriptor)
        for path in (stage_root / "server", stage_root / "server/db", stage_root / "server/db/migrations", stage_root / "server/db/migrations/meta"):
            os.chmod(path, 0o755)
        return stage_root
    except Exception:
        shutil.rmtree(stage_root, ignore_errors=True)
        raise


def _prepare_releases(
    sha: str,
    workspace: Path,
    build_uid: int,
    build_gid: int,
    migration_digest: str,
    web_releases_fd: int,
) -> tuple[Path, Path]:
    api_release = deploy._prepare_release(sha, workspace, build_uid, build_gid, migration_digest)
    run_fd, source_fd = deploy._source_directory_fd(workspace, build_uid)
    try:
        dist_fd = promotion._source_directory(
            source_fd,
            "dist",
            expected_uid=build_uid,
            display=str(workspace / "source" / "dist"),
        )
        try:
            web_release = frontend._prepare_frontend_release_from_fds(
                sha,
                dist_fd,
                web_releases_fd,
                releases_root=deploy.WEB_RELEASES,
                expected_source_uid=build_uid,
                expected_source_gid=build_gid,
                expected_runtime_uid=0,
                expected_runtime_gid=0,
            )
        finally:
            os.close(dist_fd)
    finally:
        os.close(source_fd)
        os.close(run_fd)
    return api_release, web_release


def _build_and_stage(
    sha: str,
    workspace: Path,
    run_id: str,
    build_uid: int,
    build_gid: int,
    mirror: Path,
    env: dict[str, str],
    web_releases_fd: int,
) -> tuple[Path, Path, Path, str]:
    deploy._require_main_ancestor(mirror, sha, env)
    _verify_git_migration_delta(mirror, sha, env)
    migration_digest = deploy._migration_digest(mirror, sha, env)
    source = workspace / "source"
    deploy._extract_commit(mirror, sha, source, uid=build_uid, gid=build_gid, env=env)
    deploy._log("SOURCE", f"repository={deploy.REPOSITORY_URL} branch=main commit={sha} archive=verified")
    deploy._build_and_test(run_id, workspace)
    deploy._lock_workspace(workspace, build_uid)
    deploy._log("BUILD", "all existing deployment checks passed; build workspace locked for promotion")
    api_release, web_release = _prepare_releases(sha, workspace, build_uid, build_gid, migration_digest, web_releases_fd)
    stage_root = _stage_migrations(mirror, sha, env)
    _log("STAGE", f"api={api_release} frontend={web_release} migration_tree=trusted")
    return api_release, web_release, stage_root, migration_digest


def _backup_names() -> set[str]:
    try:
        info = BACKUP_DIRECTORY.lstat()
    except OSError as exc:
        raise deploy.DeployError("Production backup directory is unavailable.") from exc
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode) or BACKUP_DIRECTORY.resolve(strict=True) != BACKUP_DIRECTORY:
        raise deploy.DeployError("Production backup directory is not a real fixed directory.")
    return {
        entry.name
        for entry in BACKUP_DIRECTORY.iterdir()
        if BACKUP_NAME.fullmatch(entry.name) and not entry.is_symlink()
    }


def _verify_fresh_backup(before_names: set[str]) -> tuple[Path, str]:
    new_names = _backup_names() - before_names
    if len(new_names) != 1:
        raise deploy.DeployError("The existing backup service did not create exactly one fresh database backup.")
    backup = BACKUP_DIRECTORY / next(iter(new_names))
    if deploy.pwd is None:
        raise deploy.DeployError("POSIX account lookup is unavailable for backup verification.")
    backup_user = deploy.pwd.getpwnam("shawhposh")
    info = _safe_path(backup, expected_uid=backup_user.pw_uid, expected_mode=0o600)
    if info.st_gid != backup_user.pw_gid:
        raise deploy.DeployError("Fresh database backup has an unexpected group owner.")
    age = time.time() - info.st_mtime
    if age < -10 or age > FRESH_BACKUP_MAX_AGE_SECONDS or info.st_size <= 0:
        raise deploy.DeployError("The new database backup is empty or outside the fresh-backup time window.")
    if _migration_history(backup) != BASELINE_MIGRATIONS:
        raise deploy.DeployError("The verified backup does not contain exactly the six baseline migrations.")
    digest = hashlib.sha256()
    with backup.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    checksum = digest.hexdigest()
    _log("BACKUP", f"result=verified path={backup.name} age_seconds={int(age)} integrity=ok migration_count=6 sha256={checksum}")
    return backup, checksum


def _run_migration(sha: str, release: Path, stage_root: Path) -> None:
    unit = f"shawhposh-migrate-{sha[:12]}-{uuid.uuid4().hex[:8]}.service"
    argv = [
        "/usr/bin/systemd-run",
        "--quiet",
        "--wait",
        "--pipe",
        "--collect",
        "--service-type=exec",
        f"--unit={unit}",
        "--property=User=shawhposh",
        "--property=Group=shawhposh",
        f"--property=WorkingDirectory={stage_root}",
        "--property=KillMode=control-group",
        "--property=NoNewPrivileges=yes",
        "--property=PrivateTmp=yes",
        "--property=PrivateNetwork=yes",
        "--property=ProtectSystem=strict",
        "--property=ProtectHome=read-only",
        "--property=ProtectKernelTunables=yes",
        "--property=ProtectKernelModules=yes",
        "--property=ProtectControlGroups=yes",
        "--property=RestrictSUIDSGID=yes",
        "--property=LockPersonality=yes",
        "--property=ReadWritePaths=/var/lib/shawhposh",
        "--property=InaccessiblePaths=/home/ubuntu /var/backups/shawhposh /opt/shawhposh /var/www/shawhposh",
        "--property=MemoryMax=160M",
        "--property=TasksMax=64",
        "--property=RuntimeMaxSec=300",
        "--property=UMask=0077",
        "--property=EnvironmentFile=/var/lib/shawhposh/.env",
        "--property=Environment=NODE_ENV=production",
        "--property=Environment=DATABASE_PATH=/var/lib/shawhposh/shawhposh.sqlite",
        "--",
        "/usr/bin/node",
        "--max-old-space-size=96",
        str(release / "server-dist/db/migrate.js"),
    ]
    result = deploy._run(argv, env={"PATH": deploy.FIXED_PATH, "HOME": "/root", "LANG": "C", "LC_ALL": "C"}, timeout=330)
    if result.returncode != 0:
        details = deploy._safe_tail(result.stderr or result.stdout or "")
        raise deploy.DeployError(f"The approved migration command failed (exit {result.returncode}). {details}".strip())
    if _migration_history() != TARGET_MIGRATIONS:
        raise deploy.DeployError("SQLite migration history does not match exactly migrations 0000–0007.")
    _log("MIGRATIONS", f"result=verified sha={sha} applied=0006,0007 database_integrity=ok")


def _writer_unit_states() -> tuple[bool, bool, bool]:
    if _unit_active(BACKUP_SERVICE):
        raise deploy.DeployError("The scheduled backup service is already running; retry when it completes.")
    return (
        _unit_active(BACKUP_TIMER),
        _unit_active(RESERVATIONS_TIMER),
        _unit_active(RESERVATIONS_SERVICE),
    )


def _pause_database_writers(states: tuple[bool, bool, bool]) -> None:
    backup_timer_was_active, reservations_timer_was_active, reservations_service_was_active = states
    if backup_timer_was_active:
        _systemctl("stop", BACKUP_TIMER)
    if reservations_timer_was_active:
        _systemctl("stop", RESERVATIONS_TIMER)
    if _unit_active(BACKUP_SERVICE):
        raise deploy.DeployError("A scheduled backup started while its timer was being paused; retry later.")
    if reservations_service_was_active or _unit_active(RESERVATIONS_SERVICE):
        _systemctl("stop", RESERVATIONS_SERVICE, timeout=30)
    if _unit_active(RESERVATIONS_SERVICE):
        raise deploy.DeployError("The reservation worker did not stop before the database backup.")
    _systemctl("stop", SERVICE_NAME, timeout=30)
    if _unit_active(SERVICE_NAME):
        raise deploy.DeployError("The API service did not stop before the database backup.")
    _log("QUIESCE", "api=stopped reservations_timer=paused backup_timer=paused")


def _restore_paused_units(states: tuple[bool, bool, bool]) -> None:
    backup_timer_was_active, reservations_timer_was_active, reservations_service_was_active = states
    _restore_unit(RESERVATIONS_SERVICE, reservations_service_was_active, expect_active=False)
    _restore_unit(RESERVATIONS_TIMER, reservations_timer_was_active, expect_active=True)
    _restore_unit(BACKUP_TIMER, backup_timer_was_active, expect_active=True)
    _log("RESTORE", "previously active maintenance timers and workers resumed")


def _restart_previous_api(sha: str) -> bool:
    try:
        _systemctl("start", SERVICE_NAME, timeout=45)
        healthy = deploy._service_owned_by_runtime() and deploy._health_ready(sha)
        _log("RECOVERY", f"api_sha={sha} result={'healthy' if healthy else 'health-failed'}")
        return healthy
    except Exception as exc:
        _log("RECOVERY", f"api_sha={sha} result=failed error={exc}")
        return False


def migrate_release(sha: str, approved_sha: str) -> None:
    deploy.validate_sha(sha)
    if sha != approved_sha:
        raise deploy.DeployError("The requested SHA does not match the approved one-time main commit.")
    _verify_installed_entrypoint()
    lock_fd = mirror = workspace = None
    root_fd = releases_fd = web_root_fd = web_releases_fd = -1
    stage_root = None
    previous_api_sha = previous_web_sha = None
    commerce_snapshot = None
    paused_units = None
    api_stopped = False
    switch_attempted = False
    deploy_result = "failed"
    try:
        lock_fd = promotion._acquire_lock()
        build_uid, build_gid = deploy._build_identity()
        root_fd, releases_fd = promotion._ensure_protected_roots()
        web_root_fd, web_releases_fd = frontend.open_frontend_roots(deploy.WEB_ROOT)
        previous_api_sha = deploy._read_active_sha(root_fd)
        previous_web_sha = frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES)
        if previous_api_sha != BASELINE_SHA or previous_web_sha != BASELINE_SHA:
            raise deploy.DeployError("The one-time migration release only runs from the fixed 05e018 production pair.")
        if not deploy._service_owned_by_runtime() or not deploy._health_matches(previous_api_sha):
            raise deploy.DeployError("The previous API is not healthy as the shawhposh service user.")
        if not deploy._website_health_matches(previous_web_sha, web_root_fd):
            raise deploy.DeployError("The previous frontend is not served correctly by Nginx.")
        if _migration_history() != BASELINE_MIGRATIONS:
            raise deploy.DeployError("Production database history differs from the six-migration baseline.")
        commerce_snapshot = deploy._read_commerce_snapshots()
        _log("PRECHECK", f"api={previous_api_sha} frontend={previous_web_sha} api_health=passed database_history=0000-0005")

        run_id = uuid.uuid4().hex
        workspace = deploy._create_workspace(run_id, build_uid, build_gid)
        env = deploy._root_env(workspace / "home")
        mirror = deploy._git_mirror(workspace, env)
        _verify_git_migration_delta(mirror, sha, env)
        api_release, web_release, stage_root, migration_digest = _build_and_stage(
            sha, workspace, run_id, build_uid, build_gid, mirror, env, web_releases_fd
        )

        if (
            deploy._read_active_sha(root_fd) != previous_api_sha
            or frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES) != previous_web_sha
            or not deploy._service_owned_by_runtime()
            or not deploy._health_matches(previous_api_sha)
        ):
            raise deploy.DeployError("Production changed during build; migration release stopped before backup.")
        paused_units = _writer_unit_states()
        api_stopped = True
        _pause_database_writers(paused_units)
        if _migration_history() != BASELINE_MIGRATIONS:
            raise deploy.DeployError("Database history changed while production writers were being stopped.")

        backup_names_before = _backup_names()
        _systemctl("start", BACKUP_SERVICE, timeout=600)
        backup, backup_sha256 = _verify_fresh_backup(backup_names_before)
        if _migration_history(backup) != BASELINE_MIGRATIONS:
            raise deploy.DeployError("Fresh backup migration history changed during verification.")
        _log("BACKUP", f"ready_before_migration=0006,0007 checksum={backup_sha256[:16]}")

        _run_migration(sha, api_release, stage_root)

        if (
            promotion._current_sha(root_fd) != previous_api_sha
            or frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES) != previous_web_sha
        ):
            raise deploy.DeployError("A release pointer changed before migration completed; promotion refused.")
        switch_attempted = True
        deploy._activate_release_pair(
            root_fd,
            web_root_fd,
            requested_sha=sha,
            previous_api_sha=previous_api_sha,
            previous_web_release=previous_web_sha,
            commerce_snapshot=commerce_snapshot,
        )
        api_stopped = False
        if (
            promotion._current_sha(root_fd) != sha
            or frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES) != sha
        ):
            raise deploy.DeployError("Active API/frontend pointers do not match the approved release SHA.")

        _restore_paused_units(paused_units)
        paused_units = None
        deploy._retain_backend_releases(releases_fd, current=sha, previous=previous_api_sha)
        frontend._retain_frontend_releases(
            web_root_fd,
            web_releases_fd,
            current=sha,
            previous=previous_web_sha,
            releases_root=deploy.WEB_RELEASES,
            keep_count=3,
        )
        deploy_result = "passed"
        _log(
            "COMPLETE",
            f"previous_api={previous_api_sha} previous_frontend={previous_web_sha} "
            f"promoted_api={sha} promoted_frontend={sha} backup={backup.name} "
            "migration=0006,0007 api_health=passed website_health=passed rollback=not-needed",
        )
    except Exception as exc:
        rollback_result = "not-needed"
        pointers_restored = False
        api_recovered = False
        if switch_attempted and root_fd >= 0 and web_root_fd >= 0 and previous_api_sha and previous_web_sha and commerce_snapshot:
            try:
                rollback_ok = deploy._rollback_release_pair(
                    root_fd,
                    web_root_fd,
                    requested_sha=sha,
                    previous_api_sha=previous_api_sha,
                    previous_web_release=previous_web_sha,
                    commerce_snapshot=commerce_snapshot,
                )
                current_api = promotion._current_sha(root_fd)
                current_web = frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES)
                pointers_restored = current_api == previous_api_sha and current_web == previous_web_sha
                if pointers_restored:
                    api_recovered = deploy._service_owned_by_runtime() and deploy._health_matches(previous_api_sha)
                    if not api_recovered:
                        api_recovered = _restart_previous_api(previous_api_sha)
                rollback_result = "passed" if rollback_ok and pointers_restored and api_recovered else "failed"
            except Exception as rollback_error:
                rollback_result = "failed"
                _log("ROLLBACK", f"result=failed error={rollback_error}")
            api_stopped = pointers_restored and not api_recovered
        elif api_stopped and previous_api_sha:
            rollback_result = "passed" if _restart_previous_api(previous_api_sha) else "failed"
            api_stopped = False
        _log(
            "FAIL",
            f"sha={sha} previous_api={previous_api_sha or 'unknown'} previous_frontend={previous_web_sha or 'unknown'} "
            f"rollback={rollback_result} error={exc}",
        )
        raise
    finally:
        if api_stopped and previous_api_sha:
            pointers_restored = False
            try:
                pointers_restored = (
                    root_fd >= 0
                    and web_root_fd >= 0
                    and promotion._current_sha(root_fd) == previous_api_sha
                    and frontend._current_sha(web_root_fd, releases_root=deploy.WEB_RELEASES) == previous_web_sha
                )
            except Exception as pointer_error:
                _log("RECOVERY", f"pointer_check=failed error={pointer_error}")
            if pointers_restored:
                _restart_previous_api(previous_api_sha)
            else:
                _log("RECOVERY", "api_start=skipped reason=previous_release_pair_not_verified")
        if paused_units is not None:
            try:
                _restore_paused_units(paused_units)
            except Exception as restore_error:
                _log("RESTORE", f"result=failed error={restore_error}")
                if deploy_result == "passed":
                    deploy_result = "failed"
        if stage_root is not None:
            try:
                if stage_root.parent != Path("/run") or not stage_root.name.startswith(MIGRATION_ROOT_PREFIX):
                    raise deploy.DeployError("Refusing to remove an unexpected migration staging path.")
                shutil.rmtree(stage_root)
            except Exception as cleanup_error:
                _log("CLEANUP", f"migration_stage=failed error={cleanup_error}")
        if workspace is not None:
            try:
                if workspace.exists():
                    if workspace.stat().st_uid != 0:
                        deploy._lock_workspace(workspace, build_uid)
                    deploy._remove_workspace(workspace)
            except Exception as cleanup_error:
                _log("CLEANUP", f"workspace=failed error={cleanup_error}")
        if mirror is not None:
            try:
                deploy._remove_mirror(mirror)
            except Exception as cleanup_error:
                _log("CLEANUP", f"mirror=failed error={cleanup_error}")
        for descriptor in (web_releases_fd, web_root_fd, releases_fd, root_fd):
            if descriptor >= 0:
                os.close(descriptor)
        if lock_fd is not None:
            os.close(lock_fd)
        _log("END", f"sha={sha} result={deploy_result} ended={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Usage: shawhposh-migrate-release <approved-40-char-main-sha>", file=sys.stderr)
        return 2
    try:
        sha = deploy.validate_sha(argv[0])
    except Exception as exc:
        print(f"[MIGRATION RELEASE] {exc}", file=sys.stderr)
        return 2
    if not hasattr(os, "geteuid") or os.geteuid() != 0:
        print("[MIGRATION RELEASE] Run through the temporary approved root entrypoint.", file=sys.stderr)
        return 1

    requester_uid = os.environ.get("SUDO_UID")
    if requester_uid is None or deploy.pwd is None:
        print("[MIGRATION RELEASE] The approved ubuntu sudo requester could not be verified.", file=sys.stderr)
        return 1
    try:
        requester = deploy.pwd.getpwuid(int(requester_uid)).pw_name
    except (ValueError, KeyError):
        print("[MIGRATION RELEASE] The approved sudo requester could not be verified.", file=sys.stderr)
        return 1
    if requester != "ubuntu":
        print("[MIGRATION RELEASE] Only ubuntu may request the one-time migration release.", file=sys.stderr)
        return 1

    os.environ.clear()
    os.environ.update({"PATH": deploy.FIXED_PATH, "HOME": "/root", "LANG": "C", "LC_ALL": "C"})
    os.umask(0o077)
    try:
        approved_sha = _read_approved_sha(sha)
        migrate_release(sha, approved_sha)
        _cleanup_temporary_entrypoint(approved_sha)
        return 0
    except Exception as exc:
        print(f"[MIGRATION RELEASE] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
