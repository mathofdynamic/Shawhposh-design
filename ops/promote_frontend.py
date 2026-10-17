#!/usr/bin/python3 -I
"""Prepare and atomically select root-owned Shawhposh static releases."""

from __future__ import annotations

import hashlib
import os
import re
import stat
import uuid
from pathlib import Path
from urllib.parse import unquote, urlsplit


WEB_ROOT = Path("/var/www/shawhposh")
WEB_RELEASES = WEB_ROOT / "releases"
WEB_CURRENT = WEB_ROOT / "current"
SHA_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
RELEASE_PATTERN = re.compile(r"(?:[0-9a-f]{40}|20[0-9]{6}-[0-9a-f]{8})\Z")
TEMP_PATTERN = re.compile(r"\.promoting-[0-9a-f]{40}-[0-9]+-[0-9a-f]{32}\Z")
NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
CLOEXEC = getattr(os, "O_CLOEXEC", 0)
DIRECTORY = getattr(os, "O_DIRECTORY", 0)
MAX_FILES = 50_000
MAX_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_FILE_BYTES = 256 * 1024 * 1024


class FrontendPromotionError(RuntimeError):
    pass


def validate_sha(value: str) -> str:
    if not isinstance(value, str) or SHA_PATTERN.fullmatch(value) is None:
        raise FrontendPromotionError("Release ID must be exactly 40 lowercase hexadecimal characters.")
    return value


def _validate_release_id(value: str) -> str:
    if not isinstance(value, str) or RELEASE_PATTERN.fullmatch(value) is None:
        raise FrontendPromotionError("Frontend release directory has an unsupported name.")
    return value


def _validate_component(name: str) -> None:
    if (
        not name
        or name in {".", ".."}
        or "/" in name
        or "\\" in name
        or "\x00" in name
        or any(ord(character) < 32 for character in name)
        or name == ".env"
        or name.startswith(".env.")
    ):
        raise FrontendPromotionError("Static build contains an unsafe path component.")


def _metadata_ok(
    info: os.stat_result,
    *,
    uid: int,
    gid: int,
    directory: bool,
    mode: int | None = None,
) -> bool:
    expected_type = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)
    return (
        expected_type
        and info.st_uid == uid
        and info.st_gid == gid
        and (info.st_mode & 0o022) == 0
        and (mode is None or stat.S_IMODE(info.st_mode) == mode)
        and (directory or info.st_nlink == 1)
    )


def _open_directory(path: Path, *, uid: int, gid: int, mode: int = 0o755) -> int:
    try:
        before = path.lstat()
    except OSError as exc:
        raise FrontendPromotionError(f"Required frontend directory is unavailable: {path}") from exc
    if (
        stat.S_ISLNK(before.st_mode)
        or not _metadata_ok(before, uid=uid, gid=gid, directory=True, mode=mode)
        or path.resolve(strict=True) != path
    ):
        raise FrontendPromotionError(f"Frontend directory has unsafe ownership, mode, or path: {path}")
    try:
        descriptor = os.open(path, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC)
    except OSError as exc:
        raise FrontendPromotionError(f"Could not safely open frontend directory: {path}") from exc
    after = os.fstat(descriptor)
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino) or not _metadata_ok(
        after, uid=uid, gid=gid, directory=True, mode=mode
    ):
        os.close(descriptor)
        raise FrontendPromotionError(f"Frontend directory changed while opening: {path}")
    return descriptor


def open_frontend_roots(
    root: Path = WEB_ROOT,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> tuple[int, int]:
    root_fd = _open_directory(root, uid=expected_uid, gid=expected_gid)
    try:
        releases_fd = _open_directory(root / "releases", uid=expected_uid, gid=expected_gid)
    except Exception:
        os.close(root_fd)
        raise
    return root_fd, releases_fd


def _open_child_directory(
    parent_fd: int,
    name: str,
    *,
    uid: int,
    gid: int,
    display: str,
    mode: int | None = None,
) -> int:
    _validate_component(name)
    try:
        before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except OSError as exc:
        raise FrontendPromotionError(f"Static build directory is unavailable: {display}") from exc
    if not _metadata_ok(before, uid=uid, gid=gid, directory=True, mode=mode):
        raise FrontendPromotionError(f"Static build directory has unsafe type, owner, or permissions: {display}")
    try:
        descriptor = os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    except OSError as exc:
        raise FrontendPromotionError(f"Could not safely open static build directory: {display}") from exc
    after = os.fstat(descriptor)
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino) or not _metadata_ok(
        after, uid=uid, gid=gid, directory=True, mode=mode
    ):
        os.close(descriptor)
        raise FrontendPromotionError(f"Static build directory changed while opening: {display}")
    return descriptor


def _open_source_file(parent_fd: int, name: str, *, uid: int, gid: int, display: str) -> tuple[int, os.stat_result]:
    _validate_component(name)
    try:
        before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    except OSError as exc:
        raise FrontendPromotionError(f"Static build file is unavailable: {display}") from exc
    if not _metadata_ok(before, uid=uid, gid=gid, directory=False):
        raise FrontendPromotionError(f"Static build file has unsafe type, owner, or permissions: {display}")
    if before.st_size < 0 or before.st_size > MAX_FILE_BYTES:
        raise FrontendPromotionError(f"Static build file exceeds the size limit: {display}")
    try:
        descriptor = os.open(name, os.O_RDONLY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    except OSError as exc:
        raise FrontendPromotionError(f"Could not safely open static build file: {display}") from exc
    after = os.fstat(descriptor)
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino) or not _metadata_ok(
        after, uid=uid, gid=gid, directory=False
    ):
        os.close(descriptor)
        raise FrontendPromotionError(f"Static build file changed while opening: {display}")
    return descriptor, after


def _copy_tree(
    source_fd: int,
    destination_fd: int,
    *,
    source_uid: int,
    source_gid: int,
    destination_uid: int,
    destination_gid: int,
    display: str,
    counts: dict[str, int],
) -> None:
    try:
        names = sorted(os.listdir(source_fd))
    except OSError as exc:
        raise FrontendPromotionError(f"Could not list static build directory: {display}") from exc
    for name in names:
        _validate_component(name)
        relative = f"{display}/{name}"
        try:
            info = os.stat(name, dir_fd=source_fd, follow_symlinks=False)
        except OSError as exc:
            raise FrontendPromotionError(f"Could not inspect static build artifact: {relative}") from exc
        if stat.S_ISDIR(info.st_mode):
            source_child = _open_child_directory(
                source_fd, name, uid=source_uid, gid=source_gid, display=relative
            )
            try:
                os.mkdir(name, 0o755, dir_fd=destination_fd)
                destination_child = os.open(
                    name,
                    os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC,
                    dir_fd=destination_fd,
                )
                try:
                    os.fchown(destination_child, destination_uid, destination_gid)
                    os.fchmod(destination_child, 0o755)
                    _copy_tree(
                        source_child,
                        destination_child,
                        source_uid=source_uid,
                        source_gid=source_gid,
                        destination_uid=destination_uid,
                        destination_gid=destination_gid,
                        display=relative,
                        counts=counts,
                    )
                    os.fsync(destination_child)
                finally:
                    os.close(destination_child)
            finally:
                os.close(source_child)
            continue
        if not stat.S_ISREG(info.st_mode):
            raise FrontendPromotionError(f"Symlink or special static artifact refused: {relative}")
        counts["files"] += 1
        counts["bytes"] += info.st_size
        if counts["files"] > MAX_FILES or counts["bytes"] > MAX_TOTAL_BYTES:
            raise FrontendPromotionError("Static build exceeds the safe file-count or total-size limit.")
        source_file_fd, source_info = _open_source_file(
            source_fd, name, uid=source_uid, gid=source_gid, display=relative
        )
        try:
            destination_file_fd = os.open(
                name,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL | NOFOLLOW | CLOEXEC,
                0o644,
                dir_fd=destination_fd,
            )
            try:
                os.fchown(destination_file_fd, destination_uid, destination_gid)
                os.fchmod(destination_file_fd, 0o644)
                remaining = source_info.st_size
                while remaining:
                    chunk = os.read(source_file_fd, min(1024 * 1024, remaining))
                    if not chunk:
                        raise FrontendPromotionError(f"Static build file ended unexpectedly: {relative}")
                    view = memoryview(chunk)
                    while view:
                        written = os.write(destination_file_fd, view)
                        if written <= 0:
                            raise FrontendPromotionError(f"Could not complete static artifact copy: {relative}")
                        view = view[written:]
                    remaining -= len(chunk)
                if os.read(source_file_fd, 1):
                    raise FrontendPromotionError(f"Static build file exceeded its declared size: {relative}")
                final_source = os.fstat(source_file_fd)
                if (
                    source_info.st_dev,
                    source_info.st_ino,
                    source_info.st_size,
                    source_info.st_mtime_ns,
                    source_info.st_ctime_ns,
                ) != (
                    final_source.st_dev,
                    final_source.st_ino,
                    final_source.st_size,
                    final_source.st_mtime_ns,
                    final_source.st_ctime_ns,
                ):
                    raise FrontendPromotionError(f"Static build artifact changed during promotion: {relative}")
                os.fchmod(destination_file_fd, 0o644)
                os.fsync(destination_file_fd)
            finally:
                os.close(destination_file_fd)
        finally:
            os.close(source_file_fd)
        os.fsync(destination_fd)


def _tree_digest_fd(root_fd: int, *, uid: int, gid: int, display: str) -> str:
    digest = hashlib.sha256()
    counts = {"files": 0, "bytes": 0}

    def visit(directory_fd: int, prefix: str) -> None:
        for name in sorted(os.listdir(directory_fd)):
            _validate_component(name)
            relative = f"{prefix}/{name}" if prefix else name
            info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            encoded = os.fsencode(relative)
            if stat.S_ISDIR(info.st_mode):
                child = _open_child_directory(
                    directory_fd, name, uid=uid, gid=gid, display=f"{display}/{relative}"
                )
                try:
                    digest.update(b"D" + len(encoded).to_bytes(4, "big") + encoded)
                    visit(child, relative)
                finally:
                    os.close(child)
                continue
            if not stat.S_ISREG(info.st_mode):
                raise FrontendPromotionError(f"Symlink or special static artifact refused: {display}/{relative}")
            counts["files"] += 1
            counts["bytes"] += info.st_size
            if counts["files"] > MAX_FILES or counts["bytes"] > MAX_TOTAL_BYTES:
                raise FrontendPromotionError("Static build exceeds the safe file-count or total-size limit.")
            file_fd, file_info = _open_source_file(
                directory_fd, name, uid=uid, gid=gid, display=f"{display}/{relative}"
            )
            try:
                digest.update(b"F" + len(encoded).to_bytes(4, "big") + encoded)
                digest.update(file_info.st_size.to_bytes(8, "big"))
                remaining = file_info.st_size
                while remaining:
                    chunk = os.read(file_fd, min(1024 * 1024, remaining))
                    if not chunk:
                        raise FrontendPromotionError(f"Static build file ended unexpectedly: {display}/{relative}")
                    digest.update(chunk)
                    remaining -= len(chunk)
                if os.read(file_fd, 1):
                    raise FrontendPromotionError(f"Static build file exceeded its declared size: {display}/{relative}")
            finally:
                os.close(file_fd)

    visit(root_fd, "")
    return digest.hexdigest()


def _validate_index(release: Path, expected_uid: int, expected_gid: int) -> None:
    index = release / "index.html"
    try:
        info = index.lstat()
        if not _metadata_ok(info, uid=expected_uid, gid=expected_gid, directory=False, mode=0o644):
            raise FrontendPromotionError("Frontend index.html has unsafe type, owner, or permissions.")
        text = index.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise FrontendPromotionError("Frontend index.html is missing or unreadable.") from exc
    references = re.findall(r"\b(?:src|href)\s*=\s*['\"]([^'\"]+)['\"]", text, re.IGNORECASE)
    scripts = 0
    for reference in references:
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc or not parsed.path.startswith("/assets/"):
            continue
        relative = unquote(parsed.path).lstrip("/")
        parts = relative.split("/")
        if any(part in {"", ".", ".."} for part in parts) or "\\" in relative:
            raise FrontendPromotionError("Frontend index.html contains an unsafe asset path.")
        asset = release.joinpath(*parts)
        try:
            asset_info = asset.lstat()
        except OSError as exc:
            raise FrontendPromotionError("Frontend index.html references a missing asset.") from exc
        if not _metadata_ok(asset_info, uid=expected_uid, gid=expected_gid, directory=False, mode=0o644):
            raise FrontendPromotionError("Frontend index.html references an unsafe asset.")
        if asset.suffix.lower() == ".js":
            scripts += 1
    if scripts == 0:
        raise FrontendPromotionError("Frontend index.html does not reference a built JavaScript asset.")


def _validate_tree(
    release: Path,
    *,
    expected_uid: int,
    expected_gid: int,
    release_mode: int | None = 0o755,
) -> str:
    root_fd = _open_directory(release, uid=expected_uid, gid=expected_gid, mode=release_mode or 0o755)
    try:
        digest = _tree_digest_fd(root_fd, uid=expected_uid, gid=expected_gid, display=str(release))
    finally:
        os.close(root_fd)
    _validate_index(release, expected_uid, expected_gid)
    return digest


def validate_frontend_release(
    release: Path,
    release_id: str,
    *,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    _validate_release_id(release_id)
    if release.name != release_id:
        raise FrontendPromotionError("Frontend release directory name does not match its release ID.")
    _validate_tree(release, expected_uid=expected_uid, expected_gid=expected_gid)


def _remove_tree_at(parent_fd: int, name: str, *, uid: int, gid: int) -> None:
    _validate_component(name)
    info = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    expected_mode = 0o700 if TEMP_PATTERN.fullmatch(name) else 0o755
    if not _metadata_ok(info, uid=uid, gid=gid, directory=True, mode=expected_mode):
        raise FrontendPromotionError("Refusing to remove an unsafe frontend release directory.")
    directory_fd = os.open(name, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=parent_fd)
    try:
        for child_name in os.listdir(directory_fd):
            child = os.stat(child_name, dir_fd=directory_fd, follow_symlinks=False)
            if stat.S_ISDIR(child.st_mode):
                _remove_tree_at(directory_fd, child_name, uid=uid, gid=gid)
            elif _metadata_ok(child, uid=uid, gid=gid, directory=False, mode=0o644):
                os.unlink(child_name, dir_fd=directory_fd)
            else:
                raise FrontendPromotionError("Refusing to remove an unsafe frontend release artifact.")
    finally:
        os.close(directory_fd)
    os.rmdir(name, dir_fd=parent_fd)
    os.fsync(parent_fd)


def _prepare_frontend_release_from_fds(
    sha: str,
    source_dist_fd: int,
    releases_fd: int,
    *,
    releases_root: Path = WEB_RELEASES,
    expected_source_uid: int,
    expected_source_gid: int,
    expected_runtime_uid: int = 0,
    expected_runtime_gid: int = 0,
) -> Path:
    validate_sha(sha)
    source_info = os.fstat(source_dist_fd)
    releases_info = os.fstat(releases_fd)
    if not _metadata_ok(source_info, uid=expected_source_uid, gid=expected_source_gid, directory=True):
        raise FrontendPromotionError("Build output directory has unsafe ownership or permissions.")
    if not _metadata_ok(releases_info, uid=expected_runtime_uid, gid=expected_runtime_gid, directory=True, mode=0o755):
        raise FrontendPromotionError("Frontend releases root has unsafe ownership or permissions.")
    source_digest = _tree_digest_fd(source_dist_fd, uid=expected_source_uid, gid=expected_source_gid, display="dist")
    destination = releases_root / sha
    try:
        existing = os.stat(sha, dir_fd=releases_fd, follow_symlinks=False)
    except FileNotFoundError:
        existing = None
    if existing is not None:
        if not _metadata_ok(existing, uid=expected_runtime_uid, gid=expected_runtime_gid, directory=True, mode=0o755):
            raise FrontendPromotionError("Existing frontend release has unsafe ownership, type, or permissions.")
        existing_digest = _validate_tree(destination, expected_uid=expected_runtime_uid, expected_gid=expected_runtime_gid)
        if existing_digest != source_digest:
            raise FrontendPromotionError("Existing frontend release does not match the trusted build for this SHA.")
        return destination

    temporary = f".promoting-{sha}-{os.getpid()}-{uuid.uuid4().hex}"
    created = False
    renamed = False
    try:
        os.mkdir(temporary, 0o700, dir_fd=releases_fd)
        created = True
        destination_fd = os.open(temporary, os.O_RDONLY | DIRECTORY | NOFOLLOW | CLOEXEC, dir_fd=releases_fd)
        try:
            os.fchown(destination_fd, expected_runtime_uid, expected_runtime_gid)
            _copy_tree(
                source_dist_fd,
                destination_fd,
                source_uid=expected_source_uid,
                source_gid=expected_source_gid,
                destination_uid=expected_runtime_uid,
                destination_gid=expected_runtime_gid,
                display="dist",
                counts={"files": 0, "bytes": 0},
            )
            os.fchmod(destination_fd, 0o755)
            os.fsync(destination_fd)
        finally:
            os.close(destination_fd)
        temporary_path = releases_root / temporary
        candidate_digest = _validate_tree(
            temporary_path,
            expected_uid=expected_runtime_uid,
            expected_gid=expected_runtime_gid,
        )
        if candidate_digest != source_digest:
            raise FrontendPromotionError("Protected frontend copy does not match the trusted build.")
        os.rename(temporary, sha, src_dir_fd=releases_fd, dst_dir_fd=releases_fd)
        renamed = True
        os.fsync(releases_fd)
        validate_frontend_release(destination, sha, expected_uid=expected_runtime_uid, expected_gid=expected_runtime_gid)
    except Exception:
        if created:
            cleanup_name = sha if renamed else temporary
            try:
                _remove_tree_at(releases_fd, cleanup_name, uid=expected_runtime_uid, gid=expected_runtime_gid)
            except FileNotFoundError:
                pass
        raise
    return destination


def _current_sha(
    root_fd: int,
    *,
    releases_root: Path = WEB_RELEASES,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> str | None:
    try:
        info = os.stat("current", dir_fd=root_fd, follow_symlinks=False)
    except FileNotFoundError:
        return None
    if not stat.S_ISLNK(info.st_mode) or info.st_uid != expected_uid or info.st_gid != expected_gid:
        raise FrontendPromotionError("Frontend current entry is not a root-owned symlink.")
    target = os.readlink("current", dir_fd=root_fd)
    match = re.fullmatch(r"releases/([0-9a-f]{40}|20[0-9]{6}-[0-9a-f]{8})", target)
    if match is not None:
        release_id = match.group(1)
    else:
        absolute_prefix = f"{os.path.abspath(os.fspath(releases_root))}{os.sep}"
        if not target.startswith(absolute_prefix):
            raise FrontendPromotionError("Frontend current symlink points outside the fixed release namespace.")
        release_id = target[len(absolute_prefix) :]
        if RELEASE_PATTERN.fullmatch(release_id) is None:
            raise FrontendPromotionError("Frontend current symlink points outside the fixed release namespace.")
    validate_frontend_release(
        releases_root / release_id,
        release_id,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
    )
    return release_id


def _atomic_switch(
    root_fd: int,
    sha: str,
    *,
    releases_root: Path = WEB_RELEASES,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> None:
    _validate_release_id(sha)
    validate_frontend_release(
        releases_root / sha,
        sha,
        expected_uid=expected_uid,
        expected_gid=expected_gid,
    )
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


def _retain_frontend_releases(
    root_fd: int,
    releases_fd: int,
    *,
    current: str,
    previous: str,
    releases_root: Path = WEB_RELEASES,
    keep_count: int = 3,
    expected_uid: int = 0,
    expected_gid: int = 0,
) -> list[str]:
    current = _validate_release_id(current)
    previous = _validate_release_id(previous)
    if _current_sha(
        root_fd, releases_root=releases_root, expected_uid=expected_uid, expected_gid=expected_gid
    ) != current:
        raise FrontendPromotionError("Frontend current changed before retention; no releases were removed.")
    entries = os.listdir(releases_fd)
    releases: list[tuple[str, int]] = []
    for name in entries:
        _validate_release_id(name)
        info = os.stat(name, dir_fd=releases_fd, follow_symlinks=False)
        if not _metadata_ok(info, uid=expected_uid, gid=expected_gid, directory=True, mode=0o755):
            raise FrontendPromotionError("Frontend release inventory is ambiguous; retention was skipped.")
        validate_frontend_release(
            releases_root / name,
            name,
            expected_uid=expected_uid,
            expected_gid=expected_gid,
        )
        releases.append((name, info.st_mtime_ns))
    names = {name for name, _ in releases}
    if current not in names or previous not in names:
        raise FrontendPromotionError("Current or previous frontend release is missing; retention was skipped.")
    keep = {current, previous}
    for name, _ in sorted(releases, key=lambda item: item[1], reverse=True):
        if len(keep) >= max(2, keep_count):
            break
        keep.add(name)
    removed: list[str] = []
    for name, _ in releases:
        if name in keep:
            continue
        _remove_tree_at(releases_fd, name, uid=expected_uid, gid=expected_gid)
        removed.append(name)
    return removed
