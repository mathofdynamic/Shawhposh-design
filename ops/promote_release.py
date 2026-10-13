#!/usr/bin/python3 -I
"""Promote a staged Linux release into Shawhposh's root-owned runtime tree."""

from __future__ import annotations

import json
import os
import re
import stat
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import Iterable


STAGING_RELEASES = Path("/home/ubuntu/shawhposh/releases")
RUNTIME_ROOT = Path("/opt/shawhposh")
RUNTIME_RELEASES = RUNTIME_ROOT / "releases"
RUNTIME_CURRENT = RUNTIME_ROOT / "current"
RUNTIME_ENV_NAME = "release.env"
AUTOMATED_METADATA_NAME = "automated-deployment.json"
SERVICE_NAME = "shawhposh-api.service"
HEALTH_URL = "https://shawhposh.ir/api/health"
HEALTH_RESOLVE = "shawhposh.ir:443:127.0.0.1"
LOCK_PATH = Path("/run/lock/shawhposh-promote.lock")
REQUIRED_ARTIFACTS = ("package.json", "server-dist", "node_modules")
SUPPORTED_FILES = ("server-dist", "node_modules", "package.json", "ops/replicate-backups.mjs")
SUPPORTED_NESTED_FILES = frozenset({"ops/replicate-backups.mjs"})
FIXED_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
SHA_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
TEMP_RELEASE_PATTERN = re.compile(r"\.promoting-[0-9a-f]{40}-[0-9]+-[0-9a-f]{32}\Z")
NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
CLOEXEC = getattr(os, "O_CLOEXEC", 0)
DIRECTORY = getattr(os, "O_DIRECTORY", 0)


class PromotionError(RuntimeError):
    pass


def validate_sha(value: str) -> str:
    if not isinstance(value, str) or SHA_PATTERN.fullmatch(value) is None:
        raise PromotionError("Release ID must be exactly 40 lowercase hexadecimal characters.")
    return value


def runtime_release_path(sha: str, runtime_releases: Path = RUNTIME_RELEASES) -> Path:
    return runtime_releases / validate_sha(sha)


def _metadata_ok(info: os.stat_result, *, uid: int, gid: int | None = None, directory: bool = False) -> bool:
    if directory:
        is_expected_type = stat.S_ISDIR(info.st_mode)
    else:
        is_expected_type = stat.S_ISREG(info.st_mode)
    return (
        is_expected_type
        and info.st_uid == uid
        and (gid is None or info.st_gid == gid)
        and (info.st_mode & 0o022) == 0
        and (directory or info.st_nlink == 1)
    )


def _path_without_symlink(path: Path, *, uid: int, gid: int | None = None, directory: bool = False) -> os.stat_result:
    try:
        info = path.lstat()
    except OSError as exc:
        raise PromotionError(f"Required path is unavailable: {path}") from exc
    if stat.S_ISLNK(info.st_mode) or not _metadata_ok(info, uid=uid, gid=gid, directory=directory):
        raise PromotionError(f"Unsafe owner, type, or permissions: {path}")
    try:
        canonical = path.resolve(strict=True)
    except OSError as exc:
        raise PromotionError(f"Could not canonicalize path: {path}") from exc
    if canonical != path:
        raise PromotionError(f"Path resolves through an unexpected alias: {path}")
    return info


def resolve_protected_release(
    sha: str,
    *,
    runtime_releases: Path = RUNTIME_RELEASES,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> Path:
    release = runtime_release_path(sha, runtime_releases)
    _path_without_symlink(release, uid=expected_uid, gid=expected_gid, directory=True)
    validate_protected_release(release, sha, expected_uid=expected_uid, expected_gid=expected_gid)
    return release


def _walk_protected_tree(root: Path, *, uid: int, gid: int) -> Iterable[Path]:
    for current, directories, files in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        _path_without_symlink(current_path, uid=uid, gid=gid, directory=True)
        for name in list(directories):
            entry = current_path / name
            _path_without_symlink(entry, uid=uid, gid=gid, directory=True)
        for name in files:
            entry = current_path / name
            _path_without_symlink(entry, uid=uid, gid=gid, directory=False)
            yield entry


def validate_protected_release(
    release: Path,
    sha: str,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    validate_sha(sha)
    if release.name != sha:
        raise PromotionError("Protected release directory name does not match its SHA.")
    validate_protected_tree(release, sha, expected_uid=expected_uid, expected_gid=expected_gid)


def validate_protected_tree(
    release: Path,
    sha: str,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    """Validate a protected tree before it is assigned its final SHA directory name."""
    validate_sha(sha)
    _path_without_symlink(release, uid=expected_uid, gid=expected_gid, directory=True)
    required = (
        release / "package.json",
        release / "server-dist" / "index.js",
        release / "server-dist" / "db" / "backup.js",
        release / "server-dist" / "modules" / "orders" / "expire-reservations.js",
        release / "node_modules",
        release / "ops" / "replicate-backups.mjs",
        release / RUNTIME_ENV_NAME,
    )
    for path in required:
        _path_without_symlink(
            path,
            uid=expected_uid,
            gid=expected_gid,
            directory=path.name in {"server-dist", "node_modules"},
        )
    try:
        package = json.loads((release / "package.json").read_text(encoding="utf-8"))
        release_env = (release / RUNTIME_ENV_NAME).read_text(encoding="ascii")
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PromotionError("Protected release metadata is unreadable or malformed.") from exc
    if package.get("type") != "module" or release_env != f"APP_VERSION={sha}\n":
        raise PromotionError("Protected release metadata does not match the selected release.")
    for _ in _walk_protected_tree(release, uid=expected_uid, gid=expected_gid):
        pass


def _source_directory(parent_fd: int, name: str, *, expected_uid: int, display: str) -> int:
    try:
        before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except OSError as exc:
        raise PromotionError(f"Required staging directory is missing: {display}") from exc
    if not _metadata_ok(before, uid=expected_uid, directory=True):
        raise PromotionError(f"Unsafe staging directory: {display}")
    try:
        descriptor = os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    except OSError as exc:
        raise PromotionError(f"Could not safely open staging directory: {display}") from exc
    after = os.fstat(descriptor)
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino) or not _metadata_ok(
        after, uid=expected_uid, directory=True
    ):
        os.close(descriptor)
        raise PromotionError(f"Staging directory changed while opening: {display}")
    return descriptor


def _source_file(parent_fd: int, name: str, *, expected_uid: int, display: str) -> tuple[int, os.stat_result]:
    try:
        before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except OSError as exc:
        raise PromotionError(f"Required staging artifact is missing: {display}") from exc
    if not _metadata_ok(before, uid=expected_uid, directory=False):
        raise PromotionError(f"Unsafe staging file: {display}")
    try:
        descriptor = os.open(name, os.O_RDONLY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    except OSError as exc:
        raise PromotionError(f"Could not safely open staging file: {display}") from exc
    opened = os.fstat(descriptor)
    if (before.st_dev, before.st_ino) != (opened.st_dev, opened.st_ino) or not _metadata_ok(
        opened, uid=expected_uid, directory=False
    ):
        os.close(descriptor)
        raise PromotionError(f"Staging file changed while opening: {display}")
    return descriptor, opened


def _copy_file(
    source_parent_fd: int,
    destination_parent_fd: int,
    name: str,
    *,
    expected_uid: int,
    display: str,
    destination_uid: int | None = None,
    destination_gid: int | None = None,
) -> None:
    source_fd, initial = _source_file(source_parent_fd, name, expected_uid=expected_uid, display=display)
    destination_fd = -1
    copied = 0
    try:
        destination_fd = os.open(
            name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | NOFOLLOW | CLOEXEC,
            0o644,
            dir_fd=destination_parent_fd,
        )
        os.fchown(
            destination_fd,
            os.geteuid() if destination_uid is None else destination_uid,
            os.getegid() if destination_gid is None else destination_gid,
        )
        while True:
            chunk = os.read(source_fd, 1024 * 1024)
            if not chunk:
                break
            copied += len(chunk)
            view = memoryview(chunk)
            while view:
                written = os.write(destination_fd, view)
                if written <= 0:
                    raise PromotionError(f"Could not complete staged file copy: {display}")
                view = view[written:]
        final = os.fstat(source_fd)
        stable = (initial.st_size, initial.st_mtime_ns, initial.st_ctime_ns) == (
            final.st_size,
            final.st_mtime_ns,
            final.st_ctime_ns,
        )
        if copied != initial.st_size or not stable:
            raise PromotionError(f"Staging file changed during promotion: {display}")
        os.fchmod(destination_fd, 0o644)
        os.fsync(destination_fd)
    finally:
        if destination_fd >= 0:
            os.close(destination_fd)
        os.close(source_fd)


def _copy_directory(
    source_fd: int,
    destination_fd: int,
    *,
    expected_uid: int,
    display: str,
    destination_uid: int | None = None,
    destination_gid: int | None = None,
) -> None:
    owner_uid = os.geteuid() if destination_uid is None else destination_uid
    owner_gid = os.getegid() if destination_gid is None else destination_gid
    for name in sorted(os.listdir(source_fd)):
        if name in {".", ".."}:
            raise PromotionError(f"Invalid directory entry in staging release: {display}")
        if name == ".bin":
            continue
        try:
            info = os.stat(name, dir_fd=source_fd, follow_symlinks=False)
        except OSError as exc:
            raise PromotionError(f"Staging entry changed during inspection: {display}/{name}") from exc
        child_display = f"{display}/{name}"
        if stat.S_ISDIR(info.st_mode):
            child_source_fd = _source_directory(
                source_fd, name, expected_uid=expected_uid, display=child_display
            )
            os.mkdir(name, 0o755, dir_fd=destination_fd)
            child_destination_fd = os.open(
                name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=destination_fd
            )
            try:
                _copy_directory(
                    child_source_fd,
                    child_destination_fd,
                    expected_uid=expected_uid,
                    display=child_display,
                    destination_uid=owner_uid,
                    destination_gid=owner_gid,
                )
                os.fchown(child_destination_fd, owner_uid, owner_gid)
                os.fchmod(child_destination_fd, 0o755)
                os.fsync(child_destination_fd)
            finally:
                os.close(child_destination_fd)
                os.close(child_source_fd)
        elif stat.S_ISREG(info.st_mode):
            _copy_file(
                source_fd,
                destination_fd,
                name,
                expected_uid=expected_uid,
                display=child_display,
                destination_uid=owner_uid,
                destination_gid=owner_gid,
            )
        else:
            raise PromotionError(f"Symlink or special file refused in staging release: {child_display}")


def _nested_artifact_parts(relative: str) -> tuple[str, ...]:
    if (
        not isinstance(relative, str)
        or relative.startswith("/")
        or "\\" in relative
        or relative not in SUPPORTED_NESTED_FILES
    ):
        raise PromotionError("Nested staging artifact is not allowlisted.")
    parts = tuple(relative.split("/"))
    if any(part in {"", ".", ".."} for part in parts):
        raise PromotionError("Nested staging artifact contains an unsafe path component.")
    return parts


def _copy_top_level_file(
    source_root_fd: int,
    destination_root_fd: int,
    relative: str,
    *,
    uid: int,
    destination_uid: int | None = None,
    destination_gid: int | None = None,
) -> None:
    parts = _nested_artifact_parts(relative)
    source_fd = source_root_fd
    source_descriptors: list[int] = []
    destination_descriptors: list[int] = []
    try:
        owner_uid = os.geteuid() if destination_uid is None else destination_uid
        owner_gid = os.getegid() if destination_gid is None else destination_gid
        for directory in parts[:-1]:
            source_fd = _source_directory(source_fd, directory, expected_uid=uid, display=relative)
            source_descriptors.append(source_fd)
        destination_fd = destination_root_fd
        for directory in parts[:-1]:
            os.mkdir(directory, 0o755, dir_fd=destination_fd)
            destination_fd = os.open(
                directory,
                os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC,
                dir_fd=destination_fd,
            )
            os.fchown(destination_fd, owner_uid, owner_gid)
            os.fchmod(destination_fd, 0o755)
            info = os.fstat(destination_fd)
            if not _metadata_ok(
                info,
                uid=owner_uid,
                gid=owner_gid,
                directory=True,
            ) or stat.S_IMODE(info.st_mode) != 0o755:
                os.close(destination_fd)
                raise PromotionError(f"Unsafe protected destination directory: {directory}")
            destination_descriptors.append(destination_fd)
        _copy_file(
            source_fd,
            destination_fd,
            parts[-1],
            expected_uid=uid,
            display=relative,
            destination_uid=owner_uid,
            destination_gid=owner_gid,
        )
        os.fsync(destination_fd)
    finally:
        for descriptor in reversed(destination_descriptors):
            os.close(descriptor)
        for descriptor in reversed(source_descriptors):
            os.close(descriptor)


def _write_release_env(
    destination_fd: int,
    sha: str,
    *,
    destination_uid: int | None = None,
    destination_gid: int | None = None,
) -> None:
    descriptor = os.open(
        RUNTIME_ENV_NAME,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | NOFOLLOW | CLOEXEC,
        0o644,
        dir_fd=destination_fd,
    )
    try:
        os.fchown(
            descriptor,
            os.geteuid() if destination_uid is None else destination_uid,
            os.getegid() if destination_gid is None else destination_gid,
        )
        os.write(descriptor, f"APP_VERSION={sha}\n".encode("ascii"))
        os.fchmod(descriptor, 0o644)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _write_automated_metadata(
    destination_fd: int,
    content: bytes,
    *,
    destination_uid: int,
    destination_gid: int,
) -> None:
    descriptor = os.open(
        AUTOMATED_METADATA_NAME,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | NOFOLLOW | CLOEXEC,
        0o644,
        dir_fd=destination_fd,
    )
    try:
        os.fchown(descriptor, destination_uid, destination_gid)
        view = memoryview(content)
        while view:
            written = os.write(descriptor, view)
            if written <= 0:
                raise PromotionError("Could not write automated release metadata.")
            view = view[written:]
        os.fchmod(descriptor, 0o644)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _ensure_protected_roots(runtime_root: Path = RUNTIME_ROOT) -> tuple[int, int]:
    opt = Path("/opt")
    opt_info = _path_without_symlink(opt, uid=0, gid=0, directory=True)
    if stat.S_IMODE(opt_info.st_mode) != 0o755:
        raise PromotionError("/opt must remain root-owned mode 0755.")
    if not runtime_root.exists() and not runtime_root.is_symlink():
        os.mkdir(runtime_root, 0o755)
    runtime_info = _path_without_symlink(runtime_root, uid=0, gid=0, directory=True)
    if stat.S_IMODE(runtime_info.st_mode) != 0o755:
        raise PromotionError("Protected runtime root must be root-owned mode 0755.")
    releases = runtime_root / "releases"
    if not releases.exists() and not releases.is_symlink():
        os.mkdir(releases, 0o755)
    releases_info = _path_without_symlink(releases, uid=0, gid=0, directory=True)
    if stat.S_IMODE(releases_info.st_mode) != 0o755:
        raise PromotionError("Protected release root must be root-owned mode 0755.")
    root_fd = os.open(runtime_root, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC)
    releases_fd = os.open(releases, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC)
    return root_fd, releases_fd


def _staging_release_fd(sha: str, *, staging_releases: Path = STAGING_RELEASES) -> tuple[int, int, int]:
    try:
        ubuntu_uid = __import__("pwd").getpwnam("ubuntu").pw_uid
    except (ImportError, KeyError) as exc:
        raise PromotionError("The ubuntu staging account is unavailable.") from exc
    if staging_releases.resolve(strict=True) != STAGING_RELEASES:
        raise PromotionError("Staging root differs from the fixed deployment path.")
    descriptors: list[int] = []
    current_fd = os.open("/", os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC)
    descriptors.append(current_fd)
    try:
        for name, expected_uid in (("home", 0), ("ubuntu", ubuntu_uid), ("shawhposh", ubuntu_uid), ("releases", ubuntu_uid)):
            current_fd = _source_directory(
                current_fd,
                name,
                expected_uid=expected_uid,
                display=f"fixed staging path component /{name}",
            )
            descriptors.append(current_fd)
        parent_fd = current_fd
        source_fd = _source_directory(
            parent_fd,
            validate_sha(sha),
            expected_uid=ubuntu_uid,
            display=str(staging_releases / sha),
        )
        descriptors.append(source_fd)
        for descriptor in descriptors[:-2]:
            os.close(descriptor)
        return parent_fd, source_fd, ubuntu_uid
    except OSError as exc:
        for descriptor in reversed(descriptors):
            try:
                os.close(descriptor)
            except OSError:
                pass
        raise PromotionError("Could not safely open the fixed staging release.") from exc
    except Exception:
        for descriptor in reversed(descriptors):
            try:
                os.close(descriptor)
            except OSError:
                pass
        raise


def _copy_staged_release_from_fds(
    sha: str,
    staged_fd: int,
    releases_fd: int,
    *,
    runtime_releases: Path,
    expected_source_uid: int,
    expected_runtime_uid: int,
    expected_runtime_gid: int,
    automated_metadata: bytes | None = None,
) -> Path:
    validate_sha(sha)
    destination_fd = -1
    renamed = False
    temporary_created = False
    temporary_name = f".promoting-{sha}-{os.getpid()}-{uuid.uuid4().hex}"
    destination = runtime_release_path(sha, runtime_releases)
    try:
        try:
            os.stat(sha, dir_fd=releases_fd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            raise PromotionError("Protected destination already exists; refusing to replace it.")
        source_info = os.fstat(staged_fd)
        if not _metadata_ok(source_info, uid=expected_source_uid, directory=True):
            raise PromotionError("Unsafe staging release directory.")
        for required in REQUIRED_ARTIFACTS:
            info = os.stat(required, dir_fd=staged_fd, follow_symlinks=False)
            if required == "server-dist" or required == "node_modules":
                if not _metadata_ok(info, uid=expected_source_uid, directory=True):
                    raise PromotionError(f"Unsafe required staging directory: {required}")
            elif not _metadata_ok(info, uid=expected_source_uid, directory=False):
                raise PromotionError(f"Unsafe required staging file: {required}")
        os.mkdir(temporary_name, 0o700, dir_fd=releases_fd)
        temporary_created = True
        destination_fd = os.open(
            temporary_name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=releases_fd
        )
        os.fchown(destination_fd, expected_runtime_uid, expected_runtime_gid)
        for artifact in SUPPORTED_FILES:
            if "/" in artifact:
                _copy_top_level_file(
                    staged_fd,
                    destination_fd,
                    artifact,
                    uid=expected_source_uid,
                    destination_uid=expected_runtime_uid,
                    destination_gid=expected_runtime_gid,
                )
                continue
            info = os.stat(artifact, dir_fd=staged_fd, follow_symlinks=False)
            if stat.S_ISDIR(info.st_mode):
                child_source_fd = _source_directory(
                    staged_fd, artifact, expected_uid=expected_source_uid, display=artifact
                )
                os.mkdir(artifact, 0o755, dir_fd=destination_fd)
                child_destination_fd = os.open(
                    artifact, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=destination_fd
                )
                try:
                    _copy_directory(
                        child_source_fd,
                        child_destination_fd,
                        expected_uid=expected_source_uid,
                        display=artifact,
                        destination_uid=expected_runtime_uid,
                        destination_gid=expected_runtime_gid,
                    )
                    os.fchown(child_destination_fd, expected_runtime_uid, expected_runtime_gid)
                    os.fchmod(child_destination_fd, 0o755)
                    os.fsync(child_destination_fd)
                finally:
                    os.close(child_destination_fd)
                    os.close(child_source_fd)
            elif stat.S_ISREG(info.st_mode):
                _copy_file(
                    staged_fd,
                    destination_fd,
                    artifact,
                    expected_uid=expected_source_uid,
                    display=artifact,
                    destination_uid=expected_runtime_uid,
                    destination_gid=expected_runtime_gid,
                )
            else:
                raise PromotionError(f"Unsupported staging artifact type: {artifact}")
        _write_release_env(
            destination_fd,
            sha,
            destination_uid=expected_runtime_uid,
            destination_gid=expected_runtime_gid,
        )
        if automated_metadata is not None:
            _write_automated_metadata(
                destination_fd,
                automated_metadata,
                destination_uid=expected_runtime_uid,
                destination_gid=expected_runtime_gid,
            )
        os.fchmod(destination_fd, 0o755)
        os.fsync(destination_fd)
        os.close(destination_fd)
        destination_fd = -1
        temporary_path = runtime_releases / temporary_name
        validate_protected_tree(
            temporary_path,
            sha,
            expected_uid=expected_runtime_uid,
            expected_gid=expected_runtime_gid,
        )
        os.rename(temporary_name, sha, src_dir_fd=releases_fd, dst_dir_fd=releases_fd)
        renamed = True
        os.fsync(releases_fd)
        validate_protected_release(
            destination,
            sha,
            expected_uid=expected_runtime_uid,
            expected_gid=expected_runtime_gid,
        )
    except Exception:
        if destination_fd >= 0:
            os.close(destination_fd)
            destination_fd = -1
        if renamed or temporary_created:
            _remove_created_release_tree(
                releases_fd,
                sha if renamed else temporary_name,
                expected_uid=expected_runtime_uid,
                expected_gid=expected_runtime_gid,
            )
        raise
    return destination


def _copy_staged_release(sha: str, releases_fd: int) -> Path:
    parent_fd = source_fd = -1
    try:
        parent_fd, source_fd, ubuntu_uid = _staging_release_fd(sha)
        return _copy_staged_release_from_fds(
            sha,
            source_fd,
            releases_fd,
            runtime_releases=RUNTIME_RELEASES,
            expected_source_uid=ubuntu_uid,
            expected_runtime_uid=0,
            expected_runtime_gid=0,
        )
    finally:
        if source_fd >= 0:
            os.close(source_fd)
        if parent_fd >= 0:
            os.close(parent_fd)


def _remove_created_release_tree(
    releases_fd: int,
    name: str,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    if (
        "/" in name
        or not (TEMP_RELEASE_PATTERN.fullmatch(name) or SHA_PATTERN.fullmatch(name))
    ):
        return
    try:
        info = os.stat(name, dir_fd=releases_fd, follow_symlinks=False)
    except FileNotFoundError:
        return
    if not _metadata_ok(info, uid=expected_uid, gid=expected_gid, directory=True):
        return
    descriptor = os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=releases_fd)
    try:
        for child in os.listdir(descriptor):
            child_info = os.stat(child, dir_fd=descriptor, follow_symlinks=False)
            if stat.S_ISDIR(child_info.st_mode) and not stat.S_ISLNK(child_info.st_mode):
                _remove_owned_temporary_child(
                    descriptor, child, expected_uid=expected_uid, expected_gid=expected_gid
                )
            elif (
                stat.S_ISREG(child_info.st_mode)
                and child_info.st_uid == expected_uid
                and child_info.st_gid == expected_gid
                and child_info.st_nlink == 1
            ):
                os.unlink(child, dir_fd=descriptor)
            else:
                return
    finally:
        os.close(descriptor)
    os.rmdir(name, dir_fd=releases_fd)
    os.fsync(releases_fd)


def _remove_owned_temporary_child(
    parent_fd: int,
    name: str,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    info = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if not _metadata_ok(info, uid=expected_uid, gid=expected_gid, directory=True):
        return
    descriptor = os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    try:
        for child in os.listdir(descriptor):
            child_info = os.stat(child, dir_fd=descriptor, follow_symlinks=False)
            if stat.S_ISDIR(child_info.st_mode) and not stat.S_ISLNK(child_info.st_mode):
                _remove_owned_temporary_child(
                    descriptor, child, expected_uid=expected_uid, expected_gid=expected_gid
                )
            elif (
                stat.S_ISREG(child_info.st_mode)
                and child_info.st_uid == expected_uid
                and child_info.st_gid == expected_gid
                and child_info.st_nlink == 1
            ):
                os.unlink(child, dir_fd=descriptor)
            else:
                return
    finally:
        os.close(descriptor)
    os.rmdir(name, dir_fd=parent_fd)


def _current_sha(
    root_fd: int,
    *,
    runtime_releases: Path = RUNTIME_RELEASES,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> str | None:
    try:
        info = os.stat("current", dir_fd=root_fd, follow_symlinks=False)
    except FileNotFoundError:
        return None
    if not stat.S_ISLNK(info.st_mode) or info.st_uid != expected_uid or info.st_gid != expected_gid:
        raise PromotionError("Current runtime entry is not a root-owned symlink.")
    target = os.readlink("current", dir_fd=root_fd)
    match = re.fullmatch(r"releases/([0-9a-f]{40})", target)
    if match is None:
        raise PromotionError("Current runtime symlink target is outside the protected release namespace.")
    sha = match.group(1)
    resolve_protected_release(
        sha,
        runtime_releases=runtime_releases,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
    )
    return sha


def _atomic_switch(root_fd: int, sha: str) -> None:
    validate_sha(sha)
    temporary = f".current-{os.getpid()}-{uuid.uuid4().hex}"
    os.symlink(f"releases/{sha}", temporary, dir_fd=root_fd)
    try:
        os.replace(temporary, "current", src_dir_fd=root_fd, dst_dir_fd=root_fd)
        os.fsync(root_fd)
    except Exception:
        try:
            os.unlink(temporary, dir_fd=root_fd)
        except OSError:
            pass
        raise


def _remove_current(root_fd: int, expected_sha: str) -> None:
    current = _current_sha(root_fd)
    if current != expected_sha:
        raise PromotionError("Current symlink changed unexpectedly; refusing to remove it.")
    os.unlink("current", dir_fd=root_fd)
    os.fsync(root_fd)


def _run(argv: list[str], *, timeout: int = 12) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            argv,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            env={"PATH": FIXED_PATH, "LC_ALL": "C", "LANG": "C"},
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PromotionError(f"Operational command failed: {Path(argv[0]).name}") from exc


def _service_is_owned_by_runtime() -> bool:
    active = _run(["/usr/bin/systemctl", "is-active", SERVICE_NAME])
    user = _run(["/usr/bin/systemctl", "show", "-p", "User", "--value", SERVICE_NAME])
    pid = _run(["/usr/bin/systemctl", "show", "-p", "MainPID", "--value", SERVICE_NAME])
    return active.returncode == 0 and user.stdout.strip() == "shawhposh" and pid.stdout.strip().isdigit() and int(pid.stdout.strip()) > 0


def _health_matches(sha: str) -> bool:
    response = _run(
            ["/usr/bin/curl", "--disable", "--fail", "--silent", "--show-error", "--max-time", "8", "--resolve", HEALTH_RESOLVE, HEALTH_URL],
        timeout=10,
    )
    if response.returncode != 0:
        return False
    try:
        body = json.loads(response.stdout)
    except json.JSONDecodeError:
        return False
    return body.get("status") == "ok" and body.get("database") == "connected" and body.get("version") == sha


def _wait_for_health(sha: str, seconds: int = 30) -> bool:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if _service_is_owned_by_runtime() and _health_matches(sha):
            return True
        time.sleep(1)
    return False


def _restart_and_verify(sha: str) -> bool:
    restarted = _run(["/usr/bin/systemctl", "restart", SERVICE_NAME], timeout=30)
    return restarted.returncode == 0 and _wait_for_health(sha)


def _acquire_lock() -> int:
    lock_directory = Path("/run/lock")
    lock_directory_info = _path_without_symlink(lock_directory, uid=0, gid=0, directory=True)
    if stat.S_IMODE(lock_directory_info.st_mode) & 0o022:
        raise PromotionError("Promotion lock directory has unsafe write permissions.")
    descriptor = os.open(LOCK_PATH, os.O_RDWR | os.O_CREAT | NOFOLLOW | CLOEXEC, 0o600)
    info = os.fstat(descriptor)
    if not _metadata_ok(info, uid=0, gid=0, directory=False) or (info.st_mode & 0o777) != 0o600:
        os.close(descriptor)
        raise PromotionError("Promotion lock file has unsafe ownership or permissions.")
    try:
        import fcntl

        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (ImportError, BlockingIOError, OSError) as exc:
        os.close(descriptor)
        raise PromotionError("Another release promotion is already running.") from exc
    return descriptor


def prepare_release(sha: str) -> Path:
    validate_sha(sha)
    root_fd = releases_fd = -1
    try:
        root_fd, releases_fd = _ensure_protected_roots()
        destination = runtime_release_path(sha)
        if destination.exists() or destination.is_symlink():
            return resolve_protected_release(sha)
        return _copy_staged_release(sha, releases_fd)
    finally:
        if releases_fd >= 0:
            os.close(releases_fd)
        if root_fd >= 0:
            os.close(root_fd)


def promote_release(sha: str) -> None:
    validate_sha(sha)
    lock_fd = _acquire_lock()
    root_fd = releases_fd = -1
    previous: str | None = None
    switch_attempted = False
    try:
        root_fd, releases_fd = _ensure_protected_roots()
        previous = _current_sha(root_fd)
        prepare_release(sha)
        switch_attempted = True
        _atomic_switch(root_fd, sha)
        if not _restart_and_verify(sha):
            raise PromotionError("New release did not pass service-owner and database health checks.")
        print(f"[PROMOTE] Active protected runtime release: {sha}")
    except Exception as exc:
        if switch_attempted and root_fd >= 0:
            try:
                if _current_sha(root_fd) != sha:
                    raise PromotionError("Current runtime target changed unexpectedly during promotion.")
                if previous is None:
                    _run(["/usr/bin/systemctl", "stop", SERVICE_NAME], timeout=20)
                    _remove_current(root_fd, sha)
                else:
                    resolve_protected_release(previous)
                    _atomic_switch(root_fd, previous)
                    if not _restart_and_verify(previous):
                        print("[ROLLBACK] Previous protected release pointer restored, but health verification failed.", file=sys.stderr)
                    else:
                        print(f"[ROLLBACK] Restored protected runtime release: {previous}", file=sys.stderr)
            except Exception as rollback_error:
                print(f"[ROLLBACK] Automatic protected-release rollback failed: {rollback_error}", file=sys.stderr)
        if isinstance(exc, PromotionError):
            raise
        raise PromotionError("Release promotion failed; inspect service logs before retrying.") from exc
    finally:
        if releases_fd >= 0:
            os.close(releases_fd)
        if root_fd >= 0:
            os.close(root_fd)
        os.close(lock_fd)


def _usage() -> str:
    return "Usage: shawhposh-promote-release <40-char-sha> | --prepare <40-char-sha>"


def main(argv: list[str]) -> int:
    if len(argv) == 1:
        operation, raw_sha = "promote", argv[0]
    elif len(argv) == 2 and argv[0] == "--prepare":
        operation, raw_sha = "prepare", argv[1]
    else:
        print(_usage(), file=sys.stderr)
        return 2
    try:
        sha = validate_sha(raw_sha)
    except PromotionError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    if not hasattr(os, "geteuid") or os.geteuid() != 0:
        print("This helper must run as root on the production Linux host.", file=sys.stderr)
        return 1
    os.environ["PATH"] = FIXED_PATH
    try:
        if operation == "prepare":
            lock_fd = _acquire_lock()
            try:
                release = prepare_release(sha)
                print(f"[PREPARE] Root-owned protected release ready: {release}")
            finally:
                os.close(lock_fd)
        else:
            promote_release(sha)
        return 0
    except (OSError, PromotionError) as exc:
        print(f"[PROMOTE] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
