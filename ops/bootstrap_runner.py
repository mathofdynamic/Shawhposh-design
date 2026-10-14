#!/usr/bin/python3 -I
"""Root-owned, SHA-scoped entry point for the one-time production bootstrap."""

from __future__ import annotations

import ast
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Callable, Iterable

try:
    import fcntl
except ImportError:  # The production entry point is Linux-only; keep offline tests importable on Windows.
    fcntl = None  # type: ignore[assignment]


REPOSITORY_URL = "https://github.com/mathofdynamic/Shawhposh-design.git"
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")
RUNNER_PATH = Path("/usr/local/sbin/shawhposh-bootstrap")
TEMP_SUDOERS_PATH = Path("/etc/sudoers.d/ubuntu-shawhposh-bootstrap")
LOCK_PATH = Path("/run/lock/shawhposh-bootstrap.lock")
FINAL_DEPLOY_PATH = Path("/usr/local/sbin/shawhposh-deploy")
FINAL_SUDOERS_PATH = Path("/etc/sudoers.d/ubuntu-shawhposh")
FINAL_SUDO_POLICY = (
    "Defaults:ubuntu timestamp_timeout=0\n"
    "ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$"
)
TEMP_SUDO_POLICY = (
    "ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$\n"
)
RUNNER_CONTEXT = "SHAWHPOSH_BOOTSTRAP_RUNNER-v1"
RUNNER_CONFIRMATION = "AUTOMATE SHAWHPosh"
BOOTSTRAP_RELATIVE_PATH = Path("ops/bootstrap-production-automation.sh")
TRUSTED_ARTIFACTS = (
    "ops/bootstrap-production-automation.sh",
    "ops/runtime-cutover.sh",
    "ops/install-automated-deploy.sh",
    "ops/automated_deploy.py",
    "ops/promote_frontend.py",
    "ops/promote_release.py",
    "ops/replicate-backups.mjs",
    "ops/shawhposh-deploy",
    "ops/sudoers.d/ubuntu-shawhposh",
    "ops/shawhposh-api.service",
    "ops/shawhposh-backup.service",
    "ops/shawhposh-backup.timer",
    "ops/shawhposh-reservations.service",
    "ops/shawhposh-reservations.timer",
    "ops/shawhposh-replicate.service",
)
SHELL_ARTIFACTS = (
    "ops/bootstrap-production-automation.sh",
    "ops/runtime-cutover.sh",
    "ops/install-automated-deploy.sh",
)
PYTHON_ARTIFACTS = (
    "ops/automated_deploy.py",
    "ops/promote_frontend.py",
    "ops/promote_release.py",
    "ops/shawhposh-deploy",
)
NODE_ARTIFACTS = ("ops/replicate-backups.mjs",)
SAFE_PATH = "/usr/sbin:/usr/bin:/sbin:/bin"


class RunnerError(RuntimeError):
    pass


def emit(message: str) -> None:
    line = f"[BOOTSTRAP RUNNER] {message}"
    print(line, flush=True)
    logger = "/usr/bin/logger"
    if Path(logger).is_file():
        subprocess.run(
            [logger, "-t", "shawhposh-bootstrap", "--", message],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            env={"PATH": SAFE_PATH},
        )


def parse_sha(arguments: Iterable[str]) -> str:
    values = list(arguments)
    if len(values) != 1 or not SHA_PATTERN.fullmatch(values[0]):
        raise RunnerError("Expected exactly one lowercase 40-character commit SHA.")
    return values[0]


def _clean_env(home: Path) -> dict[str, str]:
    return {
        "PATH": SAFE_PATH,
        "HOME": str(home),
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_ALLOW_PROTOCOL": "https",
        "SYSTEMD_PAGER": "cat",
        "PAGER": "cat",
    }


def _run_git(repository: Path, arguments: list[str], home: Path) -> subprocess.CompletedProcess[str]:
    command = [
        "/usr/bin/git",
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "protocol.file.allow=never",
        "-C",
        str(repository),
        *arguments,
    ]
    return subprocess.run(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        env=_clean_env(home),
    )


def _git(repository: Path, arguments: list[str], home: Path) -> str:
    result = _run_git(repository, arguments, home)
    if result.returncode != 0:
        detail = result.stderr.strip().splitlines()
        safe_detail = detail[-1] if detail else "git command failed"
        raise RunnerError(f"Trusted Git operation failed: {safe_detail}")
    return result.stdout.strip()


def verify_main_commit(repository: Path, requested_sha: str, home: Path) -> None:
    if not SHA_PATTERN.fullmatch(requested_sha):
        raise RunnerError("Invalid requested commit SHA.")
    origin = _git(repository, ["remote", "get-url", "origin"], home)
    if origin != REPOSITORY_URL:
        raise RunnerError("Trusted checkout origin differs from the fixed Shawhposh repository.")
    head = _git(repository, ["rev-parse", "HEAD"], home)
    if head != requested_sha:
        raise RunnerError("Trusted checkout HEAD differs from the requested SHA.")
    main_ref = _git(repository, ["rev-parse", "refs/remotes/origin/main"], home)
    if not SHA_PATTERN.fullmatch(main_ref):
        raise RunnerError("Trusted origin/main reference is invalid.")
    ancestry = _run_git(repository, ["merge-base", "--is-ancestor", requested_sha, "refs/remotes/origin/main"], home)
    if ancestry.returncode != 0:
        raise RunnerError("Requested commit is not reachable from origin/main.")
    if _git(repository, ["status", "--porcelain", "--untracked-files=all"], home):
        raise RunnerError("Trusted checkout is not clean after checkout.")


def _require_safe_components(root: Path, relative: str, expected_uid: int, expected_gid: int | None = None) -> Path:
    if expected_gid is None and expected_uid == 0:
        expected_gid = 0
    parts = Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(part in ("", ".", "..") for part in parts):
        raise RunnerError(f"Unsafe allowlisted artifact path: {relative}")
    cursor = root
    root_stat = cursor.lstat()
    if not stat.S_ISDIR(root_stat.st_mode) or stat.S_ISLNK(root_stat.st_mode) or root_stat.st_uid != expected_uid or (expected_gid is not None and root_stat.st_gid != expected_gid):
        raise RunnerError("Trusted checkout root is not a real, correctly owned directory.")
    for part in parts[:-1]:
        cursor = cursor / part
        current = cursor.lstat()
        if not stat.S_ISDIR(current.st_mode) or stat.S_ISLNK(current.st_mode) or current.st_uid != expected_uid or (expected_gid is not None and current.st_gid != expected_gid):
            raise RunnerError(f"Unsafe directory in trusted artifact path: {cursor}")
        if current.st_mode & 0o022:
            raise RunnerError(f"Writable trusted artifact directory: {cursor}")
    target = cursor / parts[-1]
    info = target.lstat()
    if (
        not stat.S_ISREG(info.st_mode)
        or stat.S_ISLNK(info.st_mode)
        or info.st_uid != expected_uid
        or (expected_gid is not None and info.st_gid != expected_gid)
        or info.st_nlink != 1
        or info.st_mode & 0o022
    ):
        raise RunnerError(f"Unsafe trusted artifact: {target}")
    return target


def validate_source_artifacts(repository: Path, expected_uid: int = 0, expected_gid: int | None = None) -> dict[str, Path]:
    result: dict[str, Path] = {}
    for relative in TRUSTED_ARTIFACTS:
        result[relative] = _require_safe_components(repository, relative, expected_uid, expected_gid)
    sudoers = result["ops/sudoers.d/ubuntu-shawhposh"].read_text(encoding="utf-8")
    if sudoers != FINAL_SUDO_POLICY + "\n":
        raise RunnerError("The trusted commit has an unexpected final SHA-scoped sudo policy.")
    for relative in SHELL_ARTIFACTS:
        check = subprocess.run(
            ["/bin/bash", "-n", str(result[relative])],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            env={"PATH": SAFE_PATH, "LC_ALL": "C"},
        )
        if check.returncode != 0:
            raise RunnerError(f"Bash syntax validation failed for {relative}.")
    for relative in PYTHON_ARTIFACTS:
        try:
            ast.parse(result[relative].read_text(encoding="utf-8"), filename=relative)
        except (OSError, SyntaxError, UnicodeError) as error:
            raise RunnerError(f"Python syntax validation failed for {relative}.") from error
    for relative in NODE_ARTIFACTS:
        check = subprocess.run(
            ["/usr/bin/node", "--check", str(result[relative])],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            env={"PATH": SAFE_PATH, "LC_ALL": "C"},
        )
        if check.returncode != 0:
            raise RunnerError(f"Node syntax validation failed for {relative}.")
    visudo = "/usr/sbin/visudo"
    if Path(visudo).is_file() and expected_uid == 0:
        temporary_dir = repository.parent
        temporary_dir_stat = temporary_dir.lstat()
        if not stat.S_ISDIR(temporary_dir_stat.st_mode) or temporary_dir_stat.st_uid != 0 or temporary_dir_stat.st_gid != 0 or temporary_dir_stat.st_mode & 0o077:
            raise RunnerError("Sudoers validation directory is not private and root-owned.")
        descriptor, temporary_sudoers = tempfile.mkstemp(prefix=".shawhposh-sudoers-check-", dir=temporary_dir)
        try:
            os.fchown(descriptor, 0, 0)
            os.fchmod(descriptor, 0o440)
            with os.fdopen(descriptor, "w", encoding="utf-8", closefd=False) as output:
                output.write(sudoers)
                output.flush()
                os.fsync(output.fileno())
            result_visudo = subprocess.run(
                [visudo, "-cf", temporary_sudoers],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                env={"PATH": SAFE_PATH, "LC_ALL": "C"},
            )
            if result_visudo.returncode != 0:
                raise RunnerError("The trusted permanent sudoers file failed visudo validation.")
        finally:
            os.close(descriptor)
            os.unlink(temporary_sudoers)
    return result


def _copy_trusted_artifacts(
    source: dict[str, Path], trusted_root: Path, owner_uid: int = 0, owner_gid: int = 0
) -> dict[str, Path]:
    if trusted_root.exists() or trusted_root.is_symlink():
        raise RunnerError("Trusted artifact destination already exists.")
    trusted_root.mkdir(mode=0o700)
    os.chmod(trusted_root, 0o700)
    os.chown(trusted_root, owner_uid, owner_gid)
    copied: dict[str, Path] = {}
    for relative in TRUSTED_ARTIFACTS:
        destination = trusted_root / relative
        parent = destination.parent
        try:
            parent_relative = parent.relative_to(trusted_root)
        except ValueError:
            raise RunnerError("Trusted artifact parent escapes its private root.")
        if any(part in {"", ".", ".."} for part in parent_relative.parts):
            raise RunnerError("Trusted artifact parent escapes its private root.")
        cursor = trusted_root
        for component in parent_relative.parts:
            cursor = cursor / component
            if cursor.exists() or cursor.is_symlink():
                info = cursor.lstat()
                if (
                    not stat.S_ISDIR(info.st_mode)
                    or stat.S_ISLNK(info.st_mode)
                    or info.st_uid != owner_uid
                    or info.st_gid != owner_gid
                    or stat.S_IMODE(info.st_mode) != 0o700
                ):
                    raise RunnerError("Trusted artifact parent is not a private owned directory.")
            else:
                cursor.mkdir(mode=0o700)
                os.chmod(cursor, 0o700)
                os.chown(cursor, owner_uid, owner_gid)
        destination_fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(destination_fd, "wb") as output, source[relative].open("rb") as input_file:
            shutil.copyfileobj(input_file, output)
            output.flush()
            os.fsync(output.fileno())
        os.chown(destination, owner_uid, owner_gid)
        os.chmod(destination, 0o600)
        copied[relative] = destination
    for relative, path in copied.items():
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != owner_uid or info.st_gid != owner_gid or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
            raise RunnerError(f"Prepared trusted artifact failed owner/mode verification: {relative}")
    return copied


def prepare_trusted_checkout(workspace: Path, requested_sha: str) -> tuple[Path, Path]:
    repository = workspace / "checkout"
    repository.mkdir(mode=0o700)
    os.chmod(repository, 0o700)
    os.chown(repository, 0, 0)
    home = workspace / "git-home"
    home.mkdir(mode=0o700)
    os.chmod(home, 0o700)
    os.chown(home, 0, 0)
    init = subprocess.run(
        ["/usr/bin/git", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "init", "--quiet", str(repository)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        env=_clean_env(home),
    )
    if init.returncode != 0:
        raise RunnerError("Could not initialize a root-controlled checkout.")
    _git(repository, ["remote", "add", "origin", REPOSITORY_URL], home)
    emit("Fetching fixed origin/main into a root-controlled temporary checkout.")
    _git(repository, ["fetch", "--no-tags", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main"], home)
    commit = _git(repository, ["cat-file", "-t", requested_sha], home)
    if commit != "commit":
        raise RunnerError("Requested SHA does not resolve to a commit fetched from origin/main.")
    ancestry = _run_git(repository, ["merge-base", "--is-ancestor", requested_sha, "refs/remotes/origin/main"], home)
    if ancestry.returncode != 0:
        raise RunnerError("Requested commit is not reachable from origin/main.")
    _git(repository, ["checkout", "--quiet", "--detach", "--force", requested_sha], home)
    verify_main_commit(repository, requested_sha, home)
    source = validate_source_artifacts(repository, expected_uid=0)
    trusted_root = workspace / "trusted"
    _copy_trusted_artifacts(source, trusted_root)
    validate_source_artifacts(trusted_root, expected_uid=0)
    return repository, trusted_root


def _bootstrap_environment(workspace: Path, repository: Path, trusted_root: Path, requested_sha: str) -> dict[str, str]:
    return {
        "PATH": SAFE_PATH,
        "HOME": "/root",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "SYSTEMD_PAGER": "cat",
        "PAGER": "cat",
        "SHAWHPOSH_BOOTSTRAP_RUNNER_CONTEXT": RUNNER_CONTEXT,
        "SHAWHPOSH_BOOTSTRAP_TRUSTED_ROOT": str(trusted_root),
        "SHAWHPOSH_BOOTSTRAP_GIT_ROOT": str(repository),
        "SHAWHPOSH_BOOTSTRAP_REQUESTED_SHA": requested_sha,
        "SHAWHPOSH_BOOTSTRAP_RUNNER_CONFIRMATION": RUNNER_CONFIRMATION,
        "SHAWHPOSH_BOOTSTRAP_WORKSPACE": str(workspace),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_ALLOW_PROTOCOL": "https",
    }


def execute_trusted_bootstrap(
    workspace: Path, repository: Path, trusted_root: Path, requested_sha: str, trusted_uid: int = 0
) -> int:
    script = trusted_root / BOOTSTRAP_RELATIVE_PATH
    _require_safe_components(trusted_root, str(BOOTSTRAP_RELATIVE_PATH), trusted_uid)
    emit(f"Running validated bootstrap controller from trusted commit {requested_sha}.")
    result = subprocess.run(
        ["/bin/bash", str(script), "--trusted-runner"],
        stdin=subprocess.DEVNULL,
        check=False,
        env=_bootstrap_environment(workspace, repository, trusted_root, requested_sha),
    )
    return result.returncode


def complete_bootstrap(status: int, verify_final: Callable[[], None], remove_temporary_access: Callable[[], None]) -> int:
    if status != 0:
        raise RunnerError(f"Production bootstrap failed with status {status}; temporary runner remains installed.")
    verify_final()
    remove_temporary_access()
    return 0


def _regular_root_file(path: Path, mode: int) -> None:
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_gid != 0:
        raise RunnerError(f"Expected root-owned regular file: {path}")
    if stat.S_IMODE(info.st_mode) != mode or info.st_nlink != 1:
        raise RunnerError(f"Unexpected file mode or link count: {path}")


def _parse_nopasswd_commands(output: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, set[str]]] = []
    current: dict[str, object] | None = None
    in_commands = False

    def finish() -> None:
        if current is not None and current["nopasswd"]:
            blocks.append((str(current["runas"] or ""), set(current["commands"])))

    for line in output.splitlines():
        if line.startswith("Sudoers entry: "):
            finish()
            current = {"runas": None, "nopasswd": False, "commands": []}
            in_commands = False
            continue
        if current is None:
            continue
        value = line.strip()
        if value.startswith("RunAsUsers:"):
            current["runas"] = value.partition(":")[2].strip()
        elif value.startswith("Options:"):
            current["nopasswd"] = "!authenticate" in value.split()
        elif value == "Commands:":
            in_commands = True
        elif in_commands and line[:1].isspace() and value:
            current["commands"].append(value)
    finish()
    return [(runas, command) for runas, commands in blocks for command in sorted(commands)]


def verify_final_deploy_install() -> None:
    _regular_root_file(FINAL_DEPLOY_PATH, 0o755)
    _regular_root_file(FINAL_SUDOERS_PATH, 0o440)
    if FINAL_SUDOERS_PATH.read_text(encoding="utf-8") != FINAL_SUDO_POLICY + "\n":
        raise RunnerError("Permanent sudoers file is not the exact SHA-scoped deploy rule.")
    if subprocess.run(["/usr/sbin/visudo", "-cf", "/etc/sudoers"], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False).returncode:
        raise RunnerError("Sudoers validation failed after bootstrap.")
    listing = subprocess.run(
        ["/usr/bin/sudo", "-n", "-ll", "-U", "ubuntu"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        env={"PATH": SAFE_PATH, "LC_ALL": "C"},
    )
    if listing.returncode != 0:
        raise RunnerError("Cannot inspect effective ubuntu passwordless sudo rights.")
    commands = _parse_nopasswd_commands(listing.stdout)
    expected = [
        ("root", "/usr/local/sbin/shawhposh-bootstrap ^[0-9a-f]{40}$"),
        ("root", "/usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$"),
    ]
    if sorted(commands) != sorted(expected):
        raise RunnerError("Passwordless sudo includes a command outside the temporary runner and permanent deploy helper.")
    for command in (
        ["/bin/bash", "-c", "exit 0"],
        ["/bin/sh", "-c", "exit 0"],
        ["/usr/bin/systemctl", "status", "nginx"],
        ["/usr/local/sbin/shawhposh-bootstrap", "invalid"],
        ["/usr/local/sbin/shawhposh-bootstrap", "A" * 40],
        ["/usr/local/sbin/shawhposh-bootstrap", "a" * 40, "extra"],
    ):
        result = subprocess.run(
            ["/usr/sbin/runuser", "-u", "ubuntu", "--", "/usr/bin/sudo", "-n", *command],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            env={"PATH": SAFE_PATH, "HOME": "/home/ubuntu"},
        )
        if result.returncode == 0:
            raise RunnerError(f"Unexpected passwordless command remained available: {command[0]}")


def verify_final_only_deploy() -> None:
    listing = subprocess.run(
        ["/usr/bin/sudo", "-n", "-ll", "-U", "ubuntu"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        env={"PATH": SAFE_PATH, "LC_ALL": "C"},
    )
    if listing.returncode != 0:
        raise RunnerError("Cannot verify final sudo policy after temporary rule removal.")
    if _parse_nopasswd_commands(listing.stdout) != [("root", "/usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$")]:
        raise RunnerError("Temporary rule removal did not leave only the permanent deploy capability.")
    for command in (
        ["/bin/bash", "-c", "exit 0"],
        ["/bin/sh", "-c", "exit 0"],
        ["/usr/bin/systemctl", "status", "nginx"],
    ):
        result = subprocess.run(
            ["/usr/sbin/runuser", "-u", "ubuntu", "--", "/usr/bin/sudo", "-n", *command],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            env={"PATH": SAFE_PATH, "HOME": "/home/ubuntu"},
        )
        if result.returncode == 0:
            raise RunnerError("An arbitrary passwordless root operation remained available.")


def _restore_file(path: Path, content: bytes) -> None:
    temporary = path.with_name(f".{path.name}.restore-{os.getpid()}")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o440)
    try:
        os.fchown(descriptor, 0, 0)
        os.fchmod(descriptor, 0o440)
        with os.fdopen(descriptor, "wb", closefd=False) as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
    finally:
        os.close(descriptor)
    os.replace(temporary, path)


def remove_temporary_privilege(
    *,
    runner_path: Path = RUNNER_PATH,
    policy_path: Path = TEMP_SUDOERS_PATH,
    validate_runner: Callable[[Path], None] | None = None,
    validate_policy: Callable[[Path], None] | None = None,
    validate_final: Callable[[], None] | None = None,
    validate_effective: Callable[[], None] | None = None,
) -> None:
    validate_runner = validate_runner or (lambda path: _regular_root_file(path, 0o755))
    validate_policy = validate_policy or (lambda path: _regular_root_file(path, 0o440))
    validate_final = validate_final or verify_final_deploy_install
    validate_effective = validate_effective or verify_final_only_deploy
    validate_runner(runner_path)
    validate_policy(policy_path)
    policy_bytes = policy_path.read_bytes()
    if policy_bytes.decode("utf-8") != TEMP_SUDO_POLICY:
        raise RunnerError("Temporary sudoers file differs from its exact reviewed rule.")
    removed_policy = False
    try:
        validate_final()
        policy_path.unlink()
        removed_policy = True
        if subprocess.run(
            ["/usr/sbin/visudo", "-cf", "/etc/sudoers"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        ).returncode:
            raise RunnerError("Sudoers failed validation after temporary policy removal.")
        validate_effective()
        runner_path.unlink()
        if runner_path.exists() or runner_path.is_symlink():
            raise RunnerError("Temporary runner remains after removal.")
    except Exception:
        if removed_policy and not policy_path.exists() and not policy_path.is_symlink():
            _restore_file(policy_path, policy_bytes)
            subprocess.run(
                ["/usr/sbin/visudo", "-cf", "/etc/sudoers"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        raise


def _acquire_lock():
    if fcntl is None:
        raise RunnerError("The bootstrap runner requires Linux file locking.")
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(LOCK_PATH, flags, 0o600)
    info = os.fstat(descriptor)
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_gid != 0:
        os.close(descriptor)
        raise RunnerError("Bootstrap lock is not a root-owned regular file.")
    os.fchmod(descriptor, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        os.close(descriptor)
        raise RunnerError("Another bootstrap operation is already running.") from error
    return descriptor


def _remove_workspace(workspace: Path) -> None:
    if workspace.parent != Path("/var/tmp") or not workspace.name.startswith("shawhposh-bootstrap-"):
        raise RunnerError("Refusing to remove an unexpected bootstrap workspace.")
    info = workspace.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o077:
        raise RunnerError("Refusing to remove an unsafe bootstrap workspace.")
    shutil.rmtree(workspace)


def run_request(requested_sha: str) -> int:
    if os.geteuid() != 0:
        raise RunnerError("The bootstrap runner must execute as root through its exact sudo rule.")
    lock_fd = _acquire_lock()
    workspace: Path | None = None
    try:
        requester = os.environ.get("SUDO_USER", "unknown")
        requester = re.sub(r"[^A-Za-z0-9_.-]", "_", requester)[:64] or "unknown"
        emit(f"start requester={requester} sha={requested_sha}")
        workspace = Path(tempfile.mkdtemp(prefix="shawhposh-bootstrap-", dir="/var/tmp"))
        os.chmod(workspace, 0o700)
        os.chown(workspace, 0, 0)
        workspace = workspace.resolve(strict=True)
        if workspace.parent != Path("/var/tmp"):
            raise RunnerError("Bootstrap workspace resolved outside the fixed temporary root.")
        repository, trusted_root = prepare_trusted_checkout(workspace, requested_sha)
        status = execute_trusted_bootstrap(workspace, repository, trusted_root, requested_sha)
        def finalize_success() -> None:
            emit("Bootstrap returned success; validating the permanent deploy capability before removing temporary access.")
            _remove_workspace(workspace)
            remove_temporary_privilege()

        complete_bootstrap(status, verify_final_deploy_install, finalize_success)
        emit(f"Bootstrap complete for {requested_sha}; only SHA-scoped production deploy remains passwordless.")
        return 0
    finally:
        if workspace is not None and workspace.exists():
            _remove_workspace(workspace)
        os.close(lock_fd)


def main(arguments: list[str] | None = None) -> int:
    try:
        requested_sha = parse_sha(sys.argv[1:] if arguments is None else arguments)
        return run_request(requested_sha)
    except RunnerError as error:
        print(f"[BOOTSTRAP RUNNER] ERROR: {error}", file=sys.stderr, flush=True)
        return 1
    except (OSError, subprocess.SubprocessError) as error:
        print(f"[BOOTSTRAP RUNNER] ERROR: trusted operation failed ({type(error).__name__}).", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
