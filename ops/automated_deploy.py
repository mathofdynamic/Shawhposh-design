#!/usr/bin/python3 -I
"""Deploy one origin/main commit into Shawhposh's protected runtime tree."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import time
import uuid
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import promote_release as promotion
import promote_frontend as frontend

try:
    import grp
    import pwd
    import syslog
except ImportError:  # Allow platform-independent argument and policy tests on Windows.
    grp = None
    pwd = None
    syslog = None


REPOSITORY_URL = "https://github.com/mathofdynamic/Shawhposh-design.git"
TRUSTED_BRANCH = "refs/remotes/origin/main"
SERVICE_NAME = "shawhposh-api.service"
BUILD_USER = "shawhposh-build"
BUILD_GROUP = "shawhposh-build"
BUILD_ROOT = Path("/var/lib/shawhposh-build")
BUILD_RUNS = BUILD_ROOT / "runs"
MIRROR_ROOT = Path("/var/cache/shawhposh-deploy")
GIT_TEMPLATE_ROOT = MIRROR_ROOT / "templates"
LOCK_PATH = Path("/run/lock/shawhposh-promote.lock")
DEPLOY_LOCK_PATH = LOCK_PATH
WEB_ROOT = frontend.WEB_ROOT
WEB_RELEASES = frontend.WEB_RELEASES
WEB_CURRENT = frontend.WEB_CURRENT
RUNTIME_ROOT = promotion.RUNTIME_ROOT
RUNTIME_RELEASES = promotion.RUNTIME_RELEASES
RUNTIME_CURRENT = promotion.RUNTIME_CURRENT
HEALTH_URL = promotion.HEALTH_URL
AUTOMATED_METADATA = promotion.AUTOMATED_METADATA_NAME
FIXED_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
SHA_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
RUN_PATTERN = re.compile(r"run-[0-9a-f]{32}\Z")
MAX_ARCHIVE_FILES = 50000
MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024
MAX_FILE_BYTES = 256 * 1024 * 1024
BUILD_TIMEOUT_SECONDS = 60 * 60
BUILD_MEMORY_HIGH = "384M"
BUILD_MEMORY_MAX = "768M"
BUILD_MEMORY_SWAP_MAX = "512M"
BUILD_NODE_HEAP_MB = 640
BUILD_CPU_QUOTA = "40%"
DOMAIN = "shawhposh.ir"
COMMERCE_ENDPOINTS = {
    "payment": "/api/v1/payment-methods/methods",
    "shipping": "/api/v1/shipping/methods",
}


class DeployError(RuntimeError):
    pass


def validate_sha(value: str) -> str:
    if not isinstance(value, str) or SHA_PATTERN.fullmatch(value) is None:
        raise DeployError("Release ID must be exactly 40 lowercase hexadecimal characters.")
    return value


def _log(stage: str, message: str) -> None:
    safe = re.sub(r"[\r\n\x00-\x1f]", " ", message)[:900]
    if syslog is not None:
        syslog.syslog(syslog.LOG_NOTICE, f"stage={stage} {safe}")
    print(f"[{stage}] {safe}", flush=True)


def _safe_tail(value: str) -> str:
    rows = [re.sub(r"[\r\n\x00-\x1f]", " ", line) for line in value.splitlines()]
    return " | ".join(rows[-8:])[-1600:]


def _run(
    argv: list[str],
    *,
    env: dict[str, str],
    timeout: int = 120,
    cwd: Path | None = None,
    binary: bool = False,
) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            argv,
            cwd=cwd,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
            text=not binary,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise DeployError(f"Command could not complete: {Path(argv[0]).name}") from exc


def _require_success(result: subprocess.CompletedProcess, label: str) -> subprocess.CompletedProcess:
    if result.returncode != 0:
        details = ""
        stderr = result.stderr or ""
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", "replace")
        details = _safe_tail(stderr)
        raise DeployError(f"{label} failed (exit {result.returncode}). {details}".strip())
    return result


def _root_env(tmp_dir: Path) -> dict[str, str]:
    return {
        "PATH": FIXED_PATH,
        "HOME": "/root",
        "TMPDIR": str(tmp_dir),
        "LC_ALL": "C",
        "LANG": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ALLOW_PROTOCOL": "https",
    }


def _git(mirror: Path, args: list[str], *, env: dict[str, str], timeout: int = 300, binary: bool = False):
    return _run(["/usr/bin/git", "-C", str(mirror), *args], env=env, timeout=timeout, binary=binary)


def _git_mirror(workspace: Path, env: dict[str, str]) -> Path:
    mirror = MIRROR_ROOT / f"mirror-{uuid.uuid4().hex}"
    if not mirror.parent.is_dir() or mirror.parent.is_symlink():
        raise DeployError("Root-owned Git mirror directory is missing or unsafe.")
    _verify_private_directory(GIT_TEMPLATE_ROOT, mode=0o700)
    if any(GIT_TEMPLATE_ROOT.iterdir()):
        raise DeployError("Git template directory must remain empty.")
    try:
        _require_success(
            _run(
                ["/usr/bin/git", "init", "--quiet", "--bare", f"--template={GIT_TEMPLATE_ROOT}", str(mirror)],
                env=env,
                cwd=workspace,
                timeout=30,
            ),
            "Initialize clean Git mirror",
        )
        _require_success(_git(mirror, ["config", "core.hooksPath", "/dev/null"], env=env), "Configure Git hooks")
        _require_success(_git(mirror, ["config", "http.followRedirects", "false"], env=env), "Disable Git HTTP redirects")
        _require_success(_git(mirror, ["config", "http.sslVerify", "true"], env=env), "Require Git HTTPS certificate verification")
        _require_success(_git(mirror, ["remote", "add", "origin", REPOSITORY_URL], env=env), "Set trusted repository")
        _log("GIT", "Fetching the fixed HTTPS origin/main ref into a root-owned temporary mirror.")
        _require_success(
            _git(
                mirror,
                ["fetch", "--no-tags", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main"],
                env=env,
                timeout=900,
            ),
            "Fetch trusted origin/main",
        )
    except Exception:
        if mirror.exists():
            _remove_mirror(mirror)
        raise
    return mirror


def _commit_exists(mirror: Path, sha: str, env: dict[str, str]) -> bool:
    return _git(mirror, ["cat-file", "-e", f"{sha}^{{commit}}"], env=env, timeout=30).returncode == 0


def _require_commit_available(mirror: Path, sha: str, env: dict[str, str], label: str) -> None:
    if not _commit_exists(mirror, sha, env):
        try:
            _require_success(
                _git(mirror, ["fetch", "--no-tags", "origin", sha], env=env, timeout=300),
                f"Fetch {label} baseline",
            )
        except DeployError as exc:
            if label == "active production":
                raise DeployError("MANUAL MIGRATION REQUIRED: active production source is unavailable for schema comparison.") from exc
            raise
        if not _commit_exists(mirror, sha, env):
            if label == "active production":
                raise DeployError("MANUAL MIGRATION REQUIRED: active production source is unavailable for schema comparison.")
            raise DeployError(f"{label} commit is unavailable in the trusted repository.")


def _require_main_ancestor(mirror: Path, sha: str, env: dict[str, str]) -> None:
    _require_commit_available(mirror, sha, env, "requested release")
    result = _git(mirror, ["merge-base", "--is-ancestor", sha, TRUSTED_BRANCH], env=env, timeout=30)
    if result.returncode != 0:
        raise DeployError("Requested commit is not reachable from trusted origin/main.")


def _migration_digest(mirror: Path, sha: str, env: dict[str, str]) -> str:
    tree = _require_success(
        _git(mirror, ["ls-tree", "-rz", "--full-tree", "-r", sha, "--", "server/db/migrations"], env=env, binary=True),
        "Read migration tree",
    ).stdout
    digest = hashlib.sha256()
    records = [record for record in tree.split(b"\0") if record]
    for record in sorted(records):
        try:
            metadata, path = record.split(b"\t", 1)
            mode, kind, oid = metadata.split(b" ", 2)
        except ValueError as exc:
            raise DeployError("Migration tree metadata is malformed.") from exc
        if not path.startswith(b"server/db/migrations/") or kind != b"blob" or mode not in {b"100644", b"100755"}:
            raise DeployError("MANUAL MIGRATION REQUIRED: migration tree contains an unsupported artifact.")
        content = _require_success(
            _git(mirror, ["cat-file", "blob", oid.decode("ascii")], env=env, binary=True, timeout=30),
            "Read migration artifact",
        ).stdout
        digest.update(len(path).to_bytes(4, "big"))
        digest.update(path)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return digest.hexdigest()


def migration_policy(current_digest: str, requested_digest: str) -> None:
    if current_digest != requested_digest:
        raise DeployError("MANUAL MIGRATION REQUIRED: requested release changes the database migration set.")


def _archive_path_parts(name: str) -> tuple[str, ...]:
    if not isinstance(name, str) or name.startswith("/") or "\\" in name or "\x00" in name:
        raise DeployError("Repository archive contains an unsafe path.")
    normalized = name[:-1] if name.endswith("/") else name
    parts = tuple(normalized.split("/"))
    if not parts or parts[0] != "source" or any(part in {"", ".", ".."} for part in parts):
        raise DeployError("Repository archive contains an unsafe path component.")
    return parts


def _ensure_dir_at(parent_fd: int, name: str, uid: int, gid: int) -> int:
    created = False
    try:
        os.mkdir(name, 0o755, dir_fd=parent_fd)
        created = True
    except FileExistsError:
        pass
    descriptor = os.open(name, os.O_RDONLY | promotion.DIRECTORY | promotion.NOFOLLOW | promotion.CLOEXEC, dir_fd=parent_fd)
    info = os.fstat(descriptor)
    allowed_owner = created or (info.st_uid == uid and info.st_gid == gid)
    if not stat.S_ISDIR(info.st_mode) or not allowed_owner or (info.st_mode & 0o022):
        os.close(descriptor)
        raise DeployError("Repository archive directory has unsafe type, owner, or permissions.")
    os.fchown(descriptor, uid, gid)
    os.fchmod(descriptor, 0o755)
    return descriptor


def _safe_archive_extract(archive_stream, destination: Path, *, uid: int, gid: int) -> None:
    root_fd = os.open(destination, os.O_RDONLY | promotion.DIRECTORY | promotion.NOFOLLOW | promotion.CLOEXEC)
    seen: dict[tuple[str, ...], str] = {}
    total_bytes = 0
    total_files = 0
    try:
        with tarfile.open(fileobj=archive_stream, mode="r|") as archive:
            for member in archive:
                parts = _archive_path_parts(member.name)
                relative = parts[1:]
                if not relative:
                    if not member.isdir():
                        raise DeployError("Repository archive root is not a directory.")
                    continue
                basename = relative[-1]
                if basename == ".env" or (basename.startswith(".env.") and basename != ".env.example"):
                    raise DeployError("Repository archive includes a non-example environment file.")
                if member.isdir():
                    kind = "dir"
                elif member.isfile():
                    kind = "file"
                    total_files += 1
                    total_bytes += member.size
                    if member.size < 0 or member.size > MAX_FILE_BYTES or total_bytes > MAX_ARCHIVE_BYTES:
                        raise DeployError("Repository source archive exceeds the safe size limit.")
                else:
                    raise DeployError("Repository archive contains a symlink, hard link, or special file.")
                if total_files > MAX_ARCHIVE_FILES:
                    raise DeployError("Repository source archive contains too many files.")
                key = tuple(relative)
                existing_kind = seen.get(key)
                if existing_kind is not None:
                    if kind == "dir" and existing_kind == "dir":
                        continue
                    raise DeployError("Repository archive contains duplicate paths.")
                seen[key] = kind
                parent_fd = root_fd
                opened: list[int] = []
                try:
                    for component in relative[:-1]:
                        child = _ensure_dir_at(parent_fd, component, uid, gid)
                        opened.append(child)
                        parent_fd = child
                    name = relative[-1]
                    if kind == "dir":
                        child = _ensure_dir_at(parent_fd, name, uid, gid)
                        os.fsync(child)
                        os.close(child)
                    else:
                        source = archive.extractfile(member)
                        if source is None:
                            raise DeployError("Could not read repository archive file.")
                        mode = 0o755 if member.mode & 0o111 else 0o644
                        descriptor = os.open(
                            name,
                            os.O_WRONLY | os.O_CREAT | os.O_EXCL | promotion.NOFOLLOW | promotion.CLOEXEC,
                            mode,
                            dir_fd=parent_fd,
                        )
                        try:
                            os.fchown(descriptor, uid, gid)
                            remaining = member.size
                            while remaining:
                                chunk = source.read(min(1024 * 1024, remaining))
                                if not chunk:
                                    raise DeployError("Repository archive file ended unexpectedly.")
                                view = memoryview(chunk)
                                while view:
                                    written = os.write(descriptor, view)
                                    if written <= 0:
                                        raise DeployError("Could not complete repository archive extraction.")
                                    view = view[written:]
                                remaining -= len(chunk)
                            if source.read(1):
                                raise DeployError("Repository archive file exceeded its declared size.")
                            os.fchmod(descriptor, mode)
                            os.fsync(descriptor)
                        finally:
                            source.close()
                            os.close(descriptor)
                        os.fsync(parent_fd)
                finally:
                    for descriptor in reversed(opened):
                        os.close(descriptor)
    finally:
        os.close(root_fd)


def _extract_commit(mirror: Path, sha: str, destination: Path, *, uid: int, gid: int, env: dict[str, str]) -> None:
    process = subprocess.Popen(
        ["/usr/bin/git", "-C", str(mirror), "archive", "--format=tar", "--prefix=source/", sha],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        stdin=subprocess.DEVNULL,
    )
    assert process.stdout is not None
    try:
        _safe_archive_extract(process.stdout, destination, uid=uid, gid=gid)
    except Exception:
        process.kill()
        process.wait()
        raise
    stderr = process.stderr.read() if process.stderr is not None else b""
    return_code = process.wait(timeout=60)
    if return_code != 0:
        raise DeployError(f"Could not export requested commit: {_safe_tail(stderr.decode('utf-8', 'replace'))}")


def _build_identity() -> tuple[int, int]:
    if pwd is None or grp is None:
        raise DeployError("POSIX account lookup is unavailable on this host.")
    try:
        user = pwd.getpwnam(BUILD_USER)
        group = grp.getgrnam(BUILD_GROUP)
    except KeyError as exc:
        raise DeployError("Dedicated build account is not installed; owner setup is required.") from exc
    if user.pw_uid < 100 or user.pw_uid == 0 or user.pw_gid != group.gr_gid or user.pw_shell != "/usr/sbin/nologin":
        raise DeployError("Dedicated build account has unexpected identity settings.")
    if set(os.getgrouplist(BUILD_USER, user.pw_gid)) != {group.gr_gid}:
        raise DeployError("Dedicated build account has unexpected supplementary groups.")
    return user.pw_uid, group.gr_gid


def _verify_private_directory(path: Path, *, mode: int, uid: int = 0, gid: int = 0) -> None:
    try:
        info = path.lstat()
    except OSError as exc:
        raise DeployError(f"Required deployment directory is missing: {path}") from exc
    if (
        stat.S_ISLNK(info.st_mode)
        or not stat.S_ISDIR(info.st_mode)
        or info.st_uid != uid
        or info.st_gid != gid
        or stat.S_IMODE(info.st_mode) != mode
        or path.resolve(strict=True) != path
    ):
        raise DeployError(f"Deployment directory has unsafe ownership, mode, or path: {path}")


def _service_owned_by_runtime() -> bool:
    if pwd is None:
        return False
    active = promotion._run(["/usr/bin/systemctl", "is-active", SERVICE_NAME])
    user = promotion._run(["/usr/bin/systemctl", "show", "-p", "User", "--value", SERVICE_NAME])
    pid_result = promotion._run(["/usr/bin/systemctl", "show", "-p", "MainPID", "--value", SERVICE_NAME])
    if (
        active.returncode != 0
        or user.stdout.strip() != "shawhposh"
        or pid_result.returncode != 0
        or not pid_result.stdout.strip().isdigit()
    ):
        return False
    pid = int(pid_result.stdout.strip())
    if pid <= 0:
        return False
    try:
        runtime_uid = pwd.getpwnam("shawhposh").pw_uid
        status = Path(f"/proc/{pid}/status").read_text(encoding="ascii")
    except (OSError, KeyError):
        return False
    match = re.search(r"^Uid:\s+(\d+)", status, re.MULTILINE)
    return match is not None and int(match.group(1)) == runtime_uid


def _health_matches(sha: str) -> bool:
    response = promotion._run(
        [
            "/usr/bin/curl",
            "--disable",
            "--fail",
            "--silent",
            "--show-error",
            "--max-time",
            "8",
            "--output",
            "-",
            "--write-out",
            "\\n%{http_code}",
            "--resolve",
            promotion.HEALTH_RESOLVE,
            HEALTH_URL,
        ],
        timeout=10,
    )
    return _health_response_matches(sha, response.returncode, response.stdout or "")


def _health_response_matches(sha: str, returncode: int, response_text: str) -> bool:
    if returncode != 0:
        return False
    try:
        body_text, status_text = response_text.rsplit("\n", 1)
        body = json.loads(body_text)
    except (ValueError, json.JSONDecodeError):
        return False
    if not isinstance(body, dict):
        return False
    return (
        status_text.strip() == "200"
        and body.get("status") == "ok"
        and body.get("database") == "connected"
        and body.get("version") == sha
    )


def _create_workspace(run_id: str, build_uid: int, build_gid: int) -> Path:
    _verify_private_directory(BUILD_ROOT, mode=0o711)
    _verify_private_directory(BUILD_RUNS, mode=0o711)
    workspace = BUILD_RUNS / f"run-{run_id}"
    os.mkdir(workspace, 0o700)
    try:
        os.chown(workspace, build_uid, build_gid)
        source = workspace / "source"
        home = workspace / "home"
        cache = workspace / "npm-cache"
        for path in (source, home, cache):
            os.mkdir(path, 0o755 if path == source else 0o700)
            os.chown(path, build_uid, build_gid)
        home_fd = os.open(home, os.O_RDONLY | promotion.DIRECTORY | promotion.NOFOLLOW | promotion.CLOEXEC)
        try:
            for name in ("npm-userconfig", "npm-globalconfig"):
                config_fd = os.open(
                    name,
                    os.O_WRONLY | os.O_CREAT | os.O_EXCL | promotion.NOFOLLOW | promotion.CLOEXEC,
                    0o600,
                    dir_fd=home_fd,
                )
                try:
                    os.fchown(config_fd, build_uid, build_gid)
                    os.fchmod(config_fd, 0o600)
                    os.fsync(config_fd)
                finally:
                    os.close(config_fd)
        finally:
            os.close(home_fd)
    except Exception:
        os.chown(workspace, 0, 0)
        os.chmod(workspace, 0o700)
        _remove_workspace(workspace)
        raise
    return workspace


def _lock_workspace(workspace: Path, build_uid: int) -> None:
    info = workspace.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != build_uid:
        raise DeployError("Build workspace changed unexpectedly.")
    os.chown(workspace, 0, 0)
    os.chmod(workspace, 0o700)


def _source_directory_fd(workspace: Path, build_uid: int) -> tuple[int, int]:
    parent_fd = os.open(BUILD_RUNS, os.O_RDONLY | promotion.DIRECTORY | promotion.NOFOLLOW | promotion.CLOEXEC)
    try:
        parent_info = os.fstat(parent_fd)
        if parent_info.st_uid != 0 or parent_info.st_gid != 0 or (parent_info.st_mode & 0o022):
            raise DeployError("Build runs directory changed ownership or permissions.")
        run_name = workspace.name
        if RUN_PATTERN.fullmatch(run_name) is None:
            raise DeployError("Generated build workspace name is invalid.")
        run_fd = promotion._source_directory(parent_fd, run_name, expected_uid=0, display=str(workspace))
    finally:
        os.close(parent_fd)
    try:
        source_fd = promotion._source_directory(run_fd, "source", expected_uid=build_uid, display=str(workspace / "source"))
    except Exception:
        os.close(run_fd)
        raise
    return run_fd, source_fd


def _remove_workspace(workspace: Path) -> None:
    if RUN_PATTERN.fullmatch(workspace.name) is None or workspace.parent != BUILD_RUNS:
        raise DeployError("Refusing to remove an unexpected build workspace.")
    if not getattr(shutil.rmtree, "avoids_symlink_attacks", False):
        raise DeployError("Safe workspace cleanup is unavailable on this Python platform.")
    try:
        info = workspace.lstat()
    except FileNotFoundError:
        return
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0:
        raise DeployError("Refusing to remove a build workspace with unexpected ownership or type.")
    if workspace.resolve(strict=True) != workspace:
        raise DeployError("Refusing to remove a build workspace through an alias.")
    shutil.rmtree(workspace)


def _remove_mirror(mirror: Path | None) -> None:
    if mirror is None:
        return
    if mirror.parent != MIRROR_ROOT or not re.fullmatch(r"mirror-[0-9a-f]{32}", mirror.name):
        raise DeployError("Refusing to remove an unexpected Git mirror.")
    info = mirror.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0:
        raise DeployError("Refusing to remove a Git mirror with unexpected ownership or type.")
    shutil.rmtree(mirror)


def _build_command(
    command: list[str],
    *,
    step: str,
    run_id: str,
    workspace: Path,
    source: Path,
    network: bool,
) -> None:
    argv = _build_command_argv(
        command,
        step=step,
        run_id=run_id,
        workspace=workspace,
        source=source,
        network=network,
    )
    _log("BUILD", f"Starting isolated step {step}; network={'enabled' if network else 'disabled'}.")
    result = _run(argv, env={"PATH": FIXED_PATH, "HOME": "/root", "LANG": "C", "LC_ALL": "C"}, timeout=BUILD_TIMEOUT_SECONDS)
    if result.returncode != 0:
        error = _safe_tail(result.stderr or "")
        _log("BUILD", f"step={step} result=failed exit={result.returncode}")
        raise DeployError(f"Build validation failed at {step} (exit {result.returncode}). {error}".strip())
    _log("BUILD", f"step={step} result=passed")


def _build_command_argv(
    command: list[str],
    *,
    step: str,
    run_id: str,
    workspace: Path,
    source: Path,
    network: bool,
) -> list[str]:
    unit = f"shawhposh-build-{run_id}-{step}.service"
    return [
        "/usr/bin/systemd-run",
        "--quiet",
        "--wait",
        "--collect",
        "--service-type=exec",
        f"--unit={unit}",
        f"--property=User={BUILD_USER}",
        f"--property=Group={BUILD_GROUP}",
        f"--property=WorkingDirectory={source}",
        "--property=KillMode=control-group",
        "--property=NoNewPrivileges=yes",
        "--property=PrivateTmp=yes",
        "--property=ProtectSystem=strict",
        "--property=ProtectHome=yes",
        "--property=PrivateDevices=yes",
        "--property=ProtectKernelTunables=yes",
        "--property=ProtectKernelModules=yes",
        "--property=ProtectControlGroups=yes",
        "--property=RestrictSUIDSGID=yes",
        f"--property=ReadWritePaths={workspace}",
        "--property=InaccessiblePaths=/var/lib/shawhposh /var/backups/shawhposh /opt/shawhposh /home/ubuntu",
        f"--property=MemoryHigh={BUILD_MEMORY_HIGH}",
        f"--property=MemoryMax={BUILD_MEMORY_MAX}",
        f"--property=MemorySwapMax={BUILD_MEMORY_SWAP_MAX}",
        "--property=TasksMax=128",
        f"--property=CPUQuota={BUILD_CPU_QUOTA}",
        "--property=RuntimeMaxSec=3300",
        "--property=UMask=0077",
        "--property=Nice=10",
        f"--property=PrivateNetwork={'no' if network else 'yes'}",
        *(
            [
                "--property=IPAddressDeny=127.0.0.0/8 ::1/128 169.254.0.0/16 fe80::/10 "
                "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 fc00::/7",
                "--property=IPAddressAllow=127.0.0.53/32",
            ]
            if network
            else []
        ),
        "--",
        "/usr/bin/env",
        "-i",
        f"HOME={workspace / 'home'}",
        "PATH=/usr/bin:/bin",
        "CI=1",
        f"NPM_CONFIG_CACHE={workspace / 'npm-cache'}",
        f"NODE_OPTIONS=--max-old-space-size={BUILD_NODE_HEAP_MB}",
        f"NPM_CONFIG_USERCONFIG={workspace / 'home' / 'npm-userconfig'}",
        f"NPM_CONFIG_GLOBALCONFIG={workspace / 'home' / 'npm-globalconfig'}",
        "GIT_CONFIG_NOSYSTEM=1",
        "GIT_CONFIG_GLOBAL=/dev/null",
        "GIT_TERMINAL_PROMPT=0",
        "LANG=C.UTF-8",
        "LC_ALL=C.UTF-8",
        *command,
    ]


def _build_steps() -> tuple[tuple[str, tuple[str, ...], bool], ...]:
    return (
        ("npm-ci", ("/usr/bin/npm", "ci", "--registry=https://registry.npmjs.org/"), True),
        ("lint", ("/usr/bin/npm", "run", "lint"), False),
        ("test", ("/usr/bin/npm", "test"), False),
        ("test-backend", ("/usr/bin/npm", "run", "test:backend"), False),
        ("test-ops", ("/usr/bin/npm", "run", "test:ops"), False),
        ("server-check", ("/usr/bin/npm", "run", "server:check"), False),
        ("server-build", ("/usr/bin/npm", "run", "server:build"), False),
        ("build", ("/usr/bin/npm", "run", "build"), False),
        ("runtime-audit", ("/usr/bin/npm", "run", "audit:runtime-data"), False),
    )


def _build_and_test(run_id: str, workspace: Path) -> None:
    source = workspace / "source"
    for step, command, network in _build_steps():
        _build_command(list(command), step=step, run_id=run_id, workspace=workspace, source=source, network=network)


def _read_active_sha(root_fd: int) -> str:
    current_sha = promotion._current_sha(root_fd)
    if current_sha is None:
        raise DeployError("Protected runtime current symlink is missing; manual runtime cutover is required.")
    release = promotion.resolve_protected_release(current_sha)
    env_path = release / promotion.RUNTIME_ENV_NAME
    info = env_path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_gid != 0:
        raise DeployError("Active release metadata has unsafe ownership or type.")
    content = env_path.read_text(encoding="ascii")
    match = re.fullmatch(r"APP_VERSION=([0-9a-f]{40})\n", content)
    if match is None or match.group(1) != current_sha:
        raise DeployError("Active release version metadata does not match its protected path.")
    return current_sha


def _write_or_verify_metadata(release: Path, sha: str, migration_sha256: str) -> None:
    marker = release / AUTOMATED_METADATA
    expected = {
        "schemaVersion": 1,
        "repository": REPOSITORY_URL,
        "branch": "main",
        "commit": sha,
        "migrationSha256": migration_sha256,
        "validation": [
            "npm ci",
            "npm run lint",
            "npm test",
            "npm run test:backend",
            "npm run test:ops",
            "npm run server:check",
            "npm run server:build",
            "npm run build",
            "npm run audit:runtime-data",
        ],
    }
    encoded = (json.dumps(expected, sort_keys=True, separators=(",", ":")) + "\n").encode("ascii")
    if marker.exists() or marker.is_symlink():
        info = marker.lstat()
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_gid != 0:
            raise DeployError("Existing protected release metadata is unsafe.")
        if marker.read_bytes() != encoded:
            raise DeployError("Existing release SHA lacks matching automated-deployment provenance.")
        return
    raise DeployError("Existing protected release has no automated-deployment provenance; refusing reuse.")


def _prepare_release(
    sha: str,
    workspace: Path,
    build_uid: int,
    build_gid: int,
    migration_sha256: str,
) -> Path:
    release_path = promotion.runtime_release_path(sha)
    if release_path.exists() or release_path.is_symlink():
        release = promotion.resolve_protected_release(sha)
        _write_or_verify_metadata(release, sha, migration_sha256)
        return release
    run_fd, source_fd = _source_directory_fd(workspace, build_uid)
    root_fd = releases_fd = -1
    try:
        root_fd, releases_fd = promotion._ensure_protected_roots()
        marker = {
            "schemaVersion": 1,
            "repository": REPOSITORY_URL,
            "branch": "main",
            "commit": sha,
            "migrationSha256": migration_sha256,
            "validation": [
                "npm ci",
                "npm run lint",
                "npm test",
                "npm run test:backend",
                "npm run test:ops",
                "npm run server:check",
                "npm run server:build",
                "npm run build",
                "npm run audit:runtime-data",
            ],
        }
        content = (json.dumps(marker, sort_keys=True, separators=(",", ":")) + "\n").encode("ascii")
        release = promotion._copy_staged_release_from_fds(
            sha,
            source_fd,
            releases_fd,
            runtime_releases=RUNTIME_RELEASES,
            expected_source_uid=build_uid,
            expected_runtime_uid=0,
            expected_runtime_gid=0,
            automated_metadata=content,
        )
        promotion.validate_protected_release(release, sha)
        return release
    finally:
        os.close(source_fd)
        os.close(run_fd)
        if releases_fd >= 0:
            os.close(releases_fd)
        if root_fd >= 0:
            os.close(root_fd)


def _health_ready(sha: str, seconds: int = 45) -> bool:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if _service_owned_by_runtime() and _health_matches(sha):
            return True
        time.sleep(1)
    return False


def _read_public_json_snapshot(endpoint: str) -> str:
    result = promotion._run(
        [
            "/usr/bin/curl",
            "--disable",
            "--fail",
            "--silent",
            "--show-error",
            "--max-time",
            "8",
            "--output",
            "-",
            "--write-out",
            "\\n%{http_code}",
            "--resolve",
            promotion.HEALTH_RESOLVE,
            f"https://{DOMAIN}{endpoint}",
        ],
        timeout=10,
    )
    if result.returncode != 0:
        raise DeployError(f"Could not read the current public commerce settings: {endpoint}")
    try:
        body_text, status_text = result.stdout.rsplit("\n", 1)
        body = json.loads(body_text)
    except (ValueError, json.JSONDecodeError) as exc:
        raise DeployError(f"Public commerce settings are not valid JSON: {endpoint}") from exc
    if status_text.strip() != "200":
        raise DeployError(f"Public commerce settings returned HTTP {status_text.strip()}: {endpoint}")
    return json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _read_commerce_snapshots() -> dict[str, str]:
    return {name: _read_public_json_snapshot(path) for name, path in COMMERCE_ENDPOINTS.items()}


def _commerce_snapshots_match(expected: dict[str, str]) -> bool:
    try:
        return _read_commerce_snapshots() == expected
    except DeployError:
        return False


def _website_health_matches(expected_release: str, web_root_fd: int) -> bool:
    try:
        if frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES) != expected_release:
            return False
        release = WEB_RELEASES / expected_release
        expected_html = (release / "index.html").read_bytes()
        result = promotion._run(
            [
                "/usr/bin/curl",
                "--disable",
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                "8",
                "--output",
                "-",
                "--write-out",
                "\\n%{http_code}",
                "--resolve",
                f"{DOMAIN}:443:127.0.0.1",
                f"https://{DOMAIN}/",
            ],
            timeout=10,
            binary=True,
        )
        if result.returncode != 0:
            return False
        served_html, status_text = result.stdout.rsplit(b"\n", 1)
        if status_text.strip() != b"200" or served_html != expected_html:
            return False
        html = expected_html.decode("utf-8")
        references = re.findall(r"\b(?:src|href)\s*=\s*['\"]([^'\"]+)['\"]", html, re.IGNORECASE)
        local_assets: set[tuple[str, int]] = set()
        for reference in references:
            parsed = urlsplit(reference)
            if parsed.scheme or parsed.netloc or not parsed.path or parsed.path == "/":
                continue
            relative = unquote(parsed.path.lstrip("/"))
            parts = relative.split("/")
            if not relative or any(part in {"", ".", ".."} for part in parts) or "\\" in relative:
                return False
            asset = release.joinpath(*parts)
            try:
                asset_info = asset.lstat()
            except OSError:
                return False
            if not stat.S_ISREG(asset_info.st_mode) or stat.S_ISLNK(asset_info.st_mode):
                return False
            local_assets.add(("/" + quote(relative, safe="/-._~"), asset_info.st_size))
        for asset_path, expected_size in local_assets:
            asset_result = promotion._run(
                [
                    "/usr/bin/curl",
                    "--disable",
                    "--fail",
                    "--silent",
                    "--show-error",
                    "--max-time",
                    "8",
                    "--head",
                    "--dump-header",
                    "-",
                    "--output",
                    "/dev/null",
                    "--write-out",
                    "\\n%{http_code}\\n%{content_type}",
                    "--resolve",
                    f"{DOMAIN}:443:127.0.0.1",
                    f"https://{DOMAIN}{asset_path}",
                ],
                timeout=10,
            )
            if asset_result.returncode != 0:
                return False
            try:
                headers, status_text, content_type = asset_result.stdout.rsplit("\n", 2)
            except ValueError:
                return False
            if status_text.strip() != "200" or content_type.split(";", 1)[0].strip().lower() == "text/html":
                return False
            content_length = re.search(r"^content-length:\s*(\d+)\s*$", headers, re.IGNORECASE | re.MULTILINE)
            if content_length is not None and int(content_length.group(1)) != expected_size:
                return False
        return any(urlsplit(reference).path.startswith("/assets/") for reference in references)
    except (OSError, UnicodeError, ValueError, frontend.FrontendPromotionError):
        return False


def _rollback_release_pair(
    runtime_root_fd: int,
    web_root_fd: int,
    *,
    requested_sha: str,
    previous_api_sha: str,
    previous_web_release: str,
    commerce_snapshot: dict[str, str],
) -> bool:
    try:
        current_api = promotion._current_sha(runtime_root_fd)
        current_web = frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES)
        if current_api not in {previous_api_sha, requested_sha}:
            raise DeployError("API current changed unexpectedly; pair rollback refused.")
        if current_web not in {previous_web_release, requested_sha}:
            raise DeployError("Frontend current changed unexpectedly; pair rollback refused.")
        changed = current_api != previous_api_sha or current_web != previous_web_release
        if not changed:
            _log("ROLLBACK", "both current pointers were unchanged; no rollback mutation was needed")
            return True
        if current_web != previous_web_release:
            frontend._atomic_switch(web_root_fd, previous_web_release, releases_root=WEB_RELEASES)
        if current_api != previous_api_sha:
            promotion._atomic_switch(runtime_root_fd, previous_api_sha)
        if (
            promotion._current_sha(runtime_root_fd) != previous_api_sha
            or frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES) != previous_web_release
        ):
            raise DeployError("Restored release pointers do not match the previous pair.")
        restarted = promotion._run(["/usr/bin/systemctl", "restart", SERVICE_NAME], timeout=30)
        api_ok = restarted.returncode == 0 and _health_ready(previous_api_sha)
        website_ok = _website_health_matches(previous_web_release, web_root_fd)
        commerce_ok = _commerce_snapshots_match(commerce_snapshot)
        rollback_ok = api_ok and website_ok and commerce_ok
        _log(
            "ROLLBACK",
            f"previous_api={previous_api_sha} previous_frontend={previous_web_release} "
            f"api={'passed' if api_ok else 'failed'} website={'passed' if website_ok else 'failed'} "
            f"commerce_settings={'unchanged' if commerce_ok else 'changed'} result={'passed' if rollback_ok else 'failed'}",
        )
        return rollback_ok
    except Exception as rollback_error:
        _log("ROLLBACK", f"result=failed error={rollback_error}")
        return False


def _activate_release_pair(
    runtime_root_fd: int,
    web_root_fd: int,
    *,
    requested_sha: str,
    previous_api_sha: str,
    previous_web_release: str,
    commerce_snapshot: dict[str, str],
) -> None:
    if promotion._current_sha(runtime_root_fd) != previous_api_sha:
        raise DeployError("API current changed before activation; refusing a partial release.")
    if frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES) != previous_web_release:
        raise DeployError("Frontend current changed before activation; refusing a partial release.")
    promotion._atomic_switch(runtime_root_fd, requested_sha)
    frontend._atomic_switch(web_root_fd, requested_sha, releases_root=WEB_RELEASES)
    restarted = promotion._run(["/usr/bin/systemctl", "restart", SERVICE_NAME], timeout=30)
    api_ok = restarted.returncode == 0 and _health_ready(requested_sha)
    website_ok = _website_health_matches(requested_sha, web_root_fd)
    commerce_ok = _commerce_snapshots_match(commerce_snapshot)
    _log(
        "HEALTH",
        f"sha={requested_sha} api={'passed' if api_ok else 'failed'} "
        f"website={'passed' if website_ok else 'failed'} "
        f"payment_shipping={'unchanged' if commerce_ok else 'changed'}",
    )
    if not (api_ok and website_ok and commerce_ok):
        raise DeployError("Full-stack release failed API, website, or commerce-configuration verification.")


def _retain_backend_releases(releases_fd: int, *, current: str, previous: str, keep_count: int = 3) -> list[str]:
    entries = os.listdir(releases_fd)
    releases: list[tuple[str, int]] = []
    for name in entries:
        validate_sha(name)
        info = os.stat(name, dir_fd=releases_fd, follow_symlinks=False)
        if not promotion._metadata_ok(info, uid=0, gid=0, directory=True):
            raise DeployError("Protected API release inventory is ambiguous; retention was skipped.")
        promotion.resolve_protected_release(name)
        releases.append((name, info.st_mtime_ns))
    names = {name for name, _ in releases}
    if current not in names or previous not in names:
        raise DeployError("Current or previous API release is missing; retention was skipped.")
    keep = {current, previous}
    for name, _ in sorted(releases, key=lambda item: item[1], reverse=True):
        if len(keep) >= max(2, keep_count):
            break
        keep.add(name)
    removed: list[str] = []
    for name, _ in releases:
        if name in keep:
            continue
        promotion._remove_created_release_tree(releases_fd, name, expected_uid=0, expected_gid=0)
        removed.append(name)
    return removed


def _rollback_to_protected_previous(root_fd: int, requested_sha: str, previous_sha: str) -> bool:
    try:
        if promotion._current_sha(root_fd) != requested_sha:
            raise DeployError("Current protected target changed unexpectedly; rollback refused.")
        promotion.resolve_protected_release(previous_sha)
        promotion._atomic_switch(root_fd, previous_sha)
        restarted = promotion._run(["/usr/bin/systemctl", "restart", SERVICE_NAME], timeout=30)
        rollback_ok = restarted.returncode == 0 and _health_ready(previous_sha)
    except Exception as rollback_exc:
        _log("ROLLBACK", f"previous_sha={previous_sha} result=failed error={rollback_exc}")
        return False
    _log("ROLLBACK", f"previous_sha={previous_sha} result={'passed' if rollback_ok else 'health-failed'}")
    return rollback_ok


def _rollback_after_failed_switch(root_fd: int, requested_sha: str, previous_sha: str) -> bool:
    try:
        current_sha = promotion._current_sha(root_fd)
    except Exception as exc:
        _log("ROLLBACK", f"previous_sha={previous_sha} result=failed current_pointer=unreadable error={exc}")
        return False
    if current_sha == previous_sha:
        _log("ROLLBACK", f"previous_sha={previous_sha} result=not-needed current_pointer=unchanged")
        return True
    if current_sha != requested_sha:
        _log("ROLLBACK", f"previous_sha={previous_sha} result=refused current_sha={current_sha or 'missing'}")
        return False
    return _rollback_to_protected_previous(root_fd, requested_sha, previous_sha)


def deploy(sha: str) -> None:
    validate_sha(sha)
    if not hasattr(os, "geteuid") or os.geteuid() != 0:
        raise DeployError("This helper must run as root through the approved sudo rule.")
    requester_uid = os.environ.get("SUDO_UID")
    os.environ.clear()
    os.environ.update({"PATH": FIXED_PATH, "HOME": "/root", "LANG": "C", "LC_ALL": "C"})
    requester = "root"
    if requester_uid is not None:
        if pwd is None:
            raise DeployError("POSIX requester identity lookup is unavailable.")
        try:
            requester = pwd.getpwuid(int(requester_uid)).pw_name
        except (ValueError, KeyError) as exc:
            raise DeployError("Sudo requester identity could not be verified.") from exc
        if requester != "ubuntu":
            raise DeployError("Only the approved ubuntu deployment account may request automatic deployment.")
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if syslog is not None:
        syslog.openlog("shawhposh-deploy", syslog.LOG_PID, syslog.LOG_AUTHPRIV)
    os.umask(0o077)
    _log("START", f"requester={requester} uid={requester_uid or '0'} sha={sha} started={started}")
    lock_fd = mirror = None
    workspace = None
    build_uid = build_gid = None
    root_fd = releases_fd = web_root_fd = web_releases_fd = -1
    previous_api_sha = previous_web_release = None
    commerce_snapshot = None
    switch_attempted = False
    deploy_result = "failed"
    try:
        lock_fd = promotion._acquire_lock()
        build_uid, build_gid = _build_identity()
        root_fd, releases_fd = promotion._ensure_protected_roots()
        web_root_fd, web_releases_fd = frontend.open_frontend_roots(WEB_ROOT)
        previous_api_sha = _read_active_sha(root_fd)
        previous_web_release = frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES)
        if previous_web_release is None:
            raise DeployError("Protected frontend current symlink is missing; manual setup is required.")
        if not _service_owned_by_runtime() or not _health_matches(previous_api_sha):
            raise DeployError("Current protected API is not healthy as the shawhposh service user.")
        if not _website_health_matches(previous_web_release, web_root_fd):
            raise DeployError("Current protected frontend is not served correctly by Nginx.")
        commerce_snapshot = _read_commerce_snapshots()
        _log(
            "PRECHECK",
            f"previous_api={previous_api_sha} previous_frontend={previous_web_release} "
            "api=healthy website=healthy runtime_user=shawhposh payment_shipping=snapshotted",
        )

        if not Path("/usr/bin/git").is_file() or not os.access("/usr/bin/git", os.X_OK):
            raise DeployError("Git is not installed at the approved executable path.")
        if not Path("/usr/bin/npm").is_file() or not os.access("/usr/bin/npm", os.X_OK):
            raise DeployError("npm is not installed at the approved executable path.")
        if not Path("/usr/bin/systemd-run").is_file() or not os.access("/usr/bin/systemd-run", os.X_OK):
            raise DeployError("systemd-run is not installed at the approved executable path.")
        _verify_private_directory(MIRROR_ROOT, mode=0o700)

        run_id = uuid.uuid4().hex
        workspace = _create_workspace(run_id, build_uid, build_gid)
        env = _root_env(workspace / "home")
        mirror = _git_mirror(workspace, env)
        _require_main_ancestor(mirror, sha, env)
        _require_commit_available(mirror, previous_api_sha, env, "active production")
        current_migrations = _migration_digest(mirror, previous_api_sha, env)
        target_migrations = _migration_digest(mirror, sha, env)
        migration_policy(current_migrations, target_migrations)
        _log("MIGRATIONS", f"schema_set=unchanged sha256={target_migrations}")

        source = workspace / "source"
        _extract_commit(mirror, sha, source, uid=build_uid, gid=build_gid, env=env)
        _log("SOURCE", f"repository={REPOSITORY_URL} branch=main commit={sha} archive=verified")
        _build_and_test(run_id, workspace)

        _lock_workspace(workspace, build_uid)
        _log("BUILD", "all required validation commands passed; isolated build workspace locked for promotion")
        api_release = _prepare_release(sha, workspace, build_uid, build_gid, target_migrations)
        run_fd, source_fd = _source_directory_fd(workspace, build_uid)
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
                    releases_root=WEB_RELEASES,
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
        _log(
            "PROMOTE",
            f"backend={api_release} frontend={web_release} owner=root:root validation=passed",
        )

        if sha == previous_api_sha and sha == previous_web_release:
            if (
                not _health_ready(sha)
                or not _website_health_matches(sha, web_root_fd)
                or not _commerce_snapshots_match(commerce_snapshot)
            ):
                raise DeployError("Requested full-stack release is active but failed its health/configuration gate.")
            deploy_result = "passed"
            _log("COMPLETE", f"requester={requester} previous_api={previous_api_sha} previous_frontend={previous_web_release} promoted_sha={sha} result=noop")
            return

        if promotion._current_sha(root_fd) != previous_api_sha:
            raise DeployError("Protected API current release changed during the deployment.")
        if frontend._current_sha(web_root_fd, releases_root=WEB_RELEASES) != previous_web_release:
            raise DeployError("Protected frontend current release changed during the deployment.")
        switch_attempted = True
        _activate_release_pair(
            root_fd,
            web_root_fd,
            requested_sha=sha,
            previous_api_sha=previous_api_sha,
            previous_web_release=previous_web_release,
            commerce_snapshot=commerce_snapshot,
        )
        deploy_result = "passed"
        _log(
            "COMPLETE",
            f"requester={requester} previous_api={previous_api_sha} previous_frontend={previous_web_release} "
            f"promoted_api={sha} promoted_frontend={sha} api_health=passed website_health=passed rollback=not-needed",
        )
        try:
            removed_api = _retain_backend_releases(releases_fd, current=sha, previous=previous_api_sha)
            for release_id in removed_api:
                _log("RETENTION", f"removed_backend=/opt/shawhposh/releases/{release_id}")
            removed_web = frontend._retain_frontend_releases(
                web_root_fd,
                web_releases_fd,
                current=sha,
                previous=previous_web_release,
                releases_root=WEB_RELEASES,
                keep_count=3,
            )
            for release_id in removed_web:
                _log("RETENTION", f"removed_frontend=/var/www/shawhposh/releases/{release_id}")
        except Exception as retention_error:
            _log("RETENTION", f"result=skipped error={retention_error}")
    except Exception as exc:
        rollback_result = "not-needed"
        if (
            switch_attempted
            and root_fd >= 0
            and web_root_fd >= 0
            and previous_api_sha is not None
            and previous_web_release is not None
            and commerce_snapshot is not None
        ):
            rollback_result = (
                "passed"
                if _rollback_release_pair(
                    root_fd,
                    web_root_fd,
                    requested_sha=sha,
                    previous_api_sha=previous_api_sha,
                    previous_web_release=previous_web_release,
                    commerce_snapshot=commerce_snapshot,
                )
                else "failed"
            )
        _log(
            "FAIL",
            f"requester={requester} sha={sha} previous_api={previous_api_sha or 'unknown'} "
            f"previous_frontend={previous_web_release or 'unknown'} rollback={rollback_result} error={exc}",
        )
        raise
    finally:
        _log(
            "END",
            f"requester={requester} sha={sha} result={deploy_result} "
            f"ended={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        )
        if web_releases_fd >= 0:
            os.close(web_releases_fd)
        if web_root_fd >= 0:
            os.close(web_root_fd)
        if releases_fd >= 0:
            os.close(releases_fd)
        if root_fd >= 0:
            os.close(root_fd)
        if workspace is not None:
            try:
                if workspace.exists():
                    if workspace.stat().st_uid != 0:
                        _lock_workspace(workspace, build_uid)
                    _remove_workspace(workspace)
            except Exception as cleanup_error:
                _log("CLEANUP", f"workspace_cleanup=failed path={workspace} error={cleanup_error}")
        if mirror is not None:
            try:
                _remove_mirror(mirror)
            except Exception as cleanup_error:
                _log("CLEANUP", f"mirror_cleanup=failed error={cleanup_error}")
        if lock_fd is not None:
            os.close(lock_fd)


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Usage: shawhposh-deploy <40-char-sha>", file=sys.stderr)
        return 2
    try:
        sha = validate_sha(argv[0])
        deploy(sha)
        return 0
    except Exception as exc:
        print(f"[DEPLOY] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
