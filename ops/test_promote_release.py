import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from promote_release import (
    LEGACY_SHA_WITHOUT_REPLICATOR,
    PromotionError,
    _atomic_switch,
    _copy_directory,
    _copy_staged_release_from_fds,
    _copy_top_level_file,
    _current_sha,
    _validate_lock_directory,
    main,
    runtime_release_path,
    validate_protected_release,
    validate_sha,
)


def write_file(path: Path, content: bytes = b"runtime\n") -> None:
    path.write_bytes(content)
    path.chmod(0o644)


def make_release(root: Path, sha: str, uid: int, gid: int) -> Path:
    release = root / "releases" / sha
    for relative in (
        "server-dist/db",
        "server-dist/modules/orders",
        "node_modules",
        "ops",
    ):
        (release / relative).mkdir(parents=True, exist_ok=True)
    write_file(release / "package.json", b'{"type":"module"}\n')
    write_file(release / "server-dist/index.js")
    write_file(release / "server-dist/db/backup.js")
    write_file(release / "server-dist/modules/orders/expire-reservations.js")
    write_file(release / "ops/replicate-backups.mjs")
    write_file(release / "release.env", f"APP_VERSION={sha}\n".encode())
    for current, directories, files in os.walk(release):
        Path(current).chmod(0o755)
        os.chown(current, uid, gid)
        for name in files:
            path = Path(current) / name
            os.chown(path, uid, gid)
    os.chown(release, uid, gid)
    return release


def make_staging_release(
    root: Path,
    sha: str,
    uid: int,
    gid: int,
    *,
    omit: str | None = None,
    malformed: bool = False,
) -> Path:
    release = root / sha
    for relative in (
        "server-dist/db",
        "server-dist/modules/orders",
        "node_modules/example",
        "ops",
    ):
        (release / relative).mkdir(parents=True, exist_ok=True)
    package_type = "commonjs" if malformed else "module"
    write_file(release / "package.json", f'{{"type":"{package_type}"}}\n'.encode())
    write_file(release / "server-dist/index.js")
    write_file(release / "server-dist/db/backup.js")
    write_file(release / "server-dist/modules/orders/expire-reservations.js")
    write_file(release / "node_modules/example/index.js")
    if omit != "ops/replicate-backups.mjs":
        write_file(release / "ops/replicate-backups.mjs")
    for current, directories, files in os.walk(release):
        Path(current).chmod(0o755)
        os.chown(current, uid, gid)
        for name in files:
            path = Path(current) / name
            os.chown(path, uid, gid)
    os.chown(release, uid, gid)
    return release


def release_snapshot(release: Path) -> tuple[tuple[object, ...], ...]:
    rows: list[tuple[object, ...]] = []
    for current, directories, files in os.walk(release):
        for name in directories:
            path = Path(current) / name
            info = path.stat()
            rows.append((path.relative_to(release).as_posix(), "dir", info.st_mode & 0o777, info.st_uid, info.st_gid))
        for name in files:
            path = Path(current) / name
            info = path.stat()
            rows.append((path.relative_to(release).as_posix(), path.read_bytes(), info.st_mode & 0o777, info.st_uid, info.st_gid))
    return tuple(sorted(rows, key=lambda row: str(row[0])))


class PromoteReleaseTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "posix", "lock directory mode semantics require POSIX")
    def test_shared_lock_accepts_only_a_root_equivalent_sticky_lock_directory(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            lock_directory = root / "lock"
            lock_directory.mkdir()
            os.chown(lock_directory, uid, gid)
            lock_directory.chmod(0o1777)
            _validate_lock_directory(lock_directory, expected_uid=uid, expected_gid=gid)

            lock_directory.chmod(0o0777)
            with self.assertRaisesRegex(PromotionError, "Unsafe owner, type, or permissions"):
                _validate_lock_directory(lock_directory, expected_uid=uid, expected_gid=gid)

            lock_directory.chmod(0o1777)
            alias = root / "lock-alias"
            alias.symlink_to(lock_directory, target_is_directory=True)
            with self.assertRaisesRegex(PromotionError, "Unsafe owner, type, or permissions"):
                _validate_lock_directory(alias, expected_uid=uid, expected_gid=gid)

    def test_sha_is_exact_lowercase_git_id_and_path_is_derived(self) -> None:
        sha = "a" * 40
        self.assertEqual(validate_sha(sha), sha)
        self.assertEqual(runtime_release_path(sha, Path("/opt/shawhposh/releases")), Path("/opt/shawhposh/releases") / sha)
        for invalid in ("../etc/passwd", "a" * 39, "A" * 40, "a" * 40 + "/x", "a" * 40 + " "):
            with self.subTest(invalid=invalid), self.assertRaises(PromotionError):
                validate_sha(invalid)

    def test_prepare_operation_takes_the_shared_lock(self) -> None:
        sha = "d" * 40
        with (
            patch("promote_release.os.geteuid", return_value=0, create=True),
            patch("promote_release._acquire_lock", return_value=41) as acquire_lock,
            patch("promote_release.os.close") as close,
            patch("promote_release.prepare_release", return_value=Path("/opt/shawhposh/releases") / sha),
            redirect_stdout(StringIO()),
        ):
            self.assertEqual(main(["--prepare", sha]), 0)
        acquire_lock.assert_called_once_with()
        close.assert_called_once_with(41)

    @unittest.skipUnless(os.name == "posix", "ownership and no-follow checks require POSIX")
    def test_root_release_validation_rejects_writable_files_and_symlinks(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = "b" * 40
        with tempfile.TemporaryDirectory() as temporary:
            runtime_root = Path(temporary)
            (runtime_root / "releases").mkdir()
            release = make_release(runtime_root, sha, uid, gid)
            validate_protected_release(release, sha, expected_uid=uid, expected_gid=gid)

            index = release / "server-dist/index.js"
            index.chmod(0o664)
            with self.assertRaisesRegex(PromotionError, "Unsafe owner, type, or permissions"):
                validate_protected_release(release, sha, expected_uid=uid, expected_gid=gid)
            index.chmod(0o644)

            target = release / "server-dist/real.js"
            write_file(target)
            index.unlink()
            index.symlink_to(target.name)
            with self.assertRaisesRegex(PromotionError, "Unsafe owner, type, or permissions"):
                validate_protected_release(release, sha, expected_uid=uid, expected_gid=gid)

    @unittest.skipUnless(os.name == "posix", "symlink ownership checks require POSIX")
    def test_current_link_and_rollback_resolution_stay_inside_protected_releases(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = "c" * 40
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / "runtime"
            releases = root / "releases"
            releases.mkdir(parents=True)
            make_release(root, sha, uid, gid)
            os.symlink(f"releases/{sha}", root / "current")
            descriptor = os.open(root, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                self.assertEqual(
                    _current_sha(
                        descriptor,
                        runtime_releases=releases,
                        expected_uid=uid,
                        expected_gid=gid,
                    ),
                    sha,
                )
                _atomic_switch(descriptor, sha)
                self.assertEqual(os.readlink(root / "current"), f"releases/{sha}")
                os.unlink(root / "current")
                os.symlink("/home/ubuntu/shawhposh/releases/" + sha, root / "current")
                with self.assertRaisesRegex(PromotionError, "outside the protected release namespace"):
                    _current_sha(
                        descriptor,
                        runtime_releases=releases,
                        expected_uid=uid,
                        expected_gid=gid,
                    )
            finally:
                os.close(descriptor)

    @unittest.skipUnless(os.name == "posix", "dirfd and no-follow copy checks require POSIX")
    def test_copy_rejects_symlinks_and_hardlinks_in_staged_code(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            destination = root / "destination"
            source.mkdir()
            destination.mkdir()
            write_file(source / "index.js")
            source.chmod(0o755)
            source_fd = os.open(source, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            destination_fd = os.open(destination, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                _copy_directory(source_fd, destination_fd, expected_uid=uid, display="server-dist")
                self.assertEqual((destination / "index.js").read_bytes(), b"runtime\n")
                (source / "linked.js").symlink_to("index.js")
                (destination / "index.js").unlink()
                with self.assertRaisesRegex(PromotionError, "Symlink or special file refused"):
                    _copy_directory(source_fd, destination_fd, expected_uid=uid, display="server-dist")
                (source / "linked.js").unlink()
                (destination / "index.js").unlink()
                os.link(source / "index.js", source / "hardlink.js")
                with self.assertRaisesRegex(PromotionError, "Unsafe staging file"):
                    _copy_directory(source_fd, destination_fd, expected_uid=uid, display="server-dist")
            finally:
                os.close(source_fd)
                os.close(destination_fd)

    @unittest.skipUnless(os.name == "posix", "protected promotion requires POSIX dirfd operations")
    def test_realistic_staged_release_preserves_nested_artifact_and_passes_full_validator(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = "e" * 40
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            staging_root = root / "staging"
            staging_root.mkdir()
            staged = make_staging_release(staging_root, sha, uid, gid)
            runtime_root = root / "runtime"
            releases = runtime_root / "releases"
            releases.mkdir(parents=True)
            source_fd = os.open(staged, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                protected = _copy_staged_release_from_fds(
                    sha,
                    source_fd,
                    releases_fd,
                    runtime_releases=releases,
                    expected_source_uid=uid,
                    expected_runtime_uid=uid,
                    expected_runtime_gid=gid,
                )
            finally:
                os.close(source_fd)
                os.close(releases_fd)

            self.assertTrue((protected / "package.json").is_file())
            self.assertTrue((protected / "server-dist/index.js").is_file())
            self.assertTrue((protected / "node_modules").is_dir())
            self.assertTrue((protected / "ops/replicate-backups.mjs").is_file())
            self.assertFalse((protected / "replicate-backups.mjs").exists())
            validate_protected_release(protected, sha, expected_uid=uid, expected_gid=gid)
            self.assertEqual((protected / "ops").stat().st_mode & 0o777, 0o755)
            self.assertEqual((protected / "ops/replicate-backups.mjs").stat().st_mode & 0o777, 0o644)
            self.assertEqual((protected / "ops").stat().st_uid, uid)
            self.assertEqual((protected / "ops").stat().st_gid, gid)
            self.assertEqual((protected / "ops/replicate-backups.mjs").stat().st_uid, uid)
            self.assertEqual((protected / "ops/replicate-backups.mjs").stat().st_gid, gid)

    @unittest.skipUnless(os.name == "posix", "protected promotion requires POSIX dirfd operations")
    def test_known_legacy_release_without_replicator_remains_a_valid_rollback_release(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = LEGACY_SHA_WITHOUT_REPLICATOR
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            staging_root = root / "staging"
            staging_root.mkdir()
            staged = make_staging_release(staging_root, sha, uid, gid, omit="ops/replicate-backups.mjs")
            runtime_root = root / "runtime"
            releases = runtime_root / "releases"
            releases.mkdir(parents=True)
            source_fd = os.open(staged, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                protected = _copy_staged_release_from_fds(
                    sha,
                    source_fd,
                    releases_fd,
                    runtime_releases=releases,
                    expected_source_uid=uid,
                    expected_runtime_uid=uid,
                    expected_runtime_gid=gid,
                )
            finally:
                os.close(source_fd)
                os.close(releases_fd)

            self.assertFalse((protected / "ops").exists())
            validate_protected_release(protected, sha, expected_uid=uid, expected_gid=gid)

    @unittest.skipUnless(os.name == "posix", "protected promotion requires POSIX dirfd operations")
    def test_missing_replicator_is_rejected_for_other_releases_and_for_legacy_symlinks(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            staging_root = root / "staging"
            staging_root.mkdir()
            sha = "d" * 40
            staged = make_staging_release(staging_root, sha, uid, gid, omit="ops/replicate-backups.mjs")
            runtime_root = root / "runtime"
            releases = runtime_root / "releases"
            releases.mkdir(parents=True)
            source_fd = os.open(staged, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                with self.assertRaisesRegex(PromotionError, "Required staging artifact is missing"):
                    _copy_staged_release_from_fds(
                        sha,
                        source_fd,
                        releases_fd,
                        runtime_releases=releases,
                        expected_source_uid=uid,
                        expected_runtime_uid=uid,
                        expected_runtime_gid=gid,
                    )
                self.assertFalse((releases / sha).exists())
                self.assertEqual(list(releases.iterdir()), [])
            finally:
                os.close(source_fd)
                os.close(releases_fd)

            legacy_staging = staging_root / LEGACY_SHA_WITHOUT_REPLICATOR
            legacy_staging.mkdir()
            for relative in ("server-dist/db", "server-dist/modules/orders", "node_modules/example", "ops"):
                (legacy_staging / relative).mkdir(parents=True, exist_ok=True)
            write_file(legacy_staging / "package.json", b'{"type":"module"}\n')
            write_file(legacy_staging / "server-dist/index.js")
            write_file(legacy_staging / "server-dist/db/backup.js")
            write_file(legacy_staging / "server-dist/modules/orders/expire-reservations.js")
            write_file(legacy_staging / "node_modules/example/index.js")
            target = legacy_staging / "ops/other.mjs"
            write_file(target)
            (legacy_staging / "ops/replicate-backups.mjs").symlink_to(target)
            for current, directories, files in os.walk(legacy_staging):
                Path(current).chmod(0o755)
                os.chown(current, uid, gid)
                for name in files:
                    entry = Path(current) / name
                    if not entry.is_symlink():
                        os.chown(entry, uid, gid)
            source_fd = os.open(legacy_staging, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                with self.assertRaisesRegex(PromotionError, "Unsafe staging file"):
                    _copy_staged_release_from_fds(
                        LEGACY_SHA_WITHOUT_REPLICATOR,
                        source_fd,
                        releases_fd,
                        runtime_releases=releases,
                        expected_source_uid=uid,
                        expected_runtime_uid=uid,
                        expected_runtime_gid=gid,
                    )
                self.assertFalse((releases / LEGACY_SHA_WITHOUT_REPLICATOR).exists())
                self.assertEqual(list(releases.iterdir()), [])
            finally:
                os.close(source_fd)
                os.close(releases_fd)

    @unittest.skipUnless(os.name == "posix", "failure cleanup requires POSIX dirfd operations")
    def test_failed_staging_copy_leaves_no_new_release_or_temp_and_preserves_current(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = "f" * 40
        previous_sha = "1" * 40
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            staging_root = root / "staging"
            staging_root.mkdir()
            staged = make_staging_release(staging_root, sha, uid, gid, malformed=True)
            runtime_root = root / "runtime"
            releases = runtime_root / "releases"
            releases.mkdir(parents=True)
            previous = make_release(runtime_root, previous_sha, uid, gid)
            previous_snapshot = release_snapshot(previous)
            current = runtime_root / "current"
            current.symlink_to(f"releases/{previous_sha}")
            source_fd = os.open(staged, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                with self.assertRaises(PromotionError):
                    _copy_staged_release_from_fds(
                        sha,
                        source_fd,
                        releases_fd,
                        runtime_releases=releases,
                        expected_source_uid=uid,
                        expected_runtime_uid=uid,
                        expected_runtime_gid=gid,
                    )
            finally:
                os.close(source_fd)
                os.close(releases_fd)

            self.assertFalse((releases / sha).exists())
            self.assertEqual(list(releases.glob(".promoting-*")), [])
            self.assertEqual(os.readlink(current), f"releases/{previous_sha}")
            self.assertTrue(previous.is_dir())
            self.assertEqual(release_snapshot(previous), previous_snapshot)
            validate_protected_release(previous, previous_sha, expected_uid=uid, expected_gid=gid)

    @unittest.skipUnless(os.name == "posix", "post-rename cleanup requires POSIX dirfd operations")
    def test_failed_final_validation_removes_only_the_new_sha_release(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        sha = "2" * 40
        previous_sha = "3" * 40
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            staged = make_staging_release(root / "staging", sha, uid, gid)
            runtime_root = root / "runtime"
            releases = runtime_root / "releases"
            releases.mkdir(parents=True)
            previous = make_release(runtime_root, previous_sha, uid, gid)
            previous_snapshot = release_snapshot(previous)
            current = runtime_root / "current"
            current.symlink_to(f"releases/{previous_sha}")
            source_fd = os.open(staged, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                with (
                    patch("promote_release.validate_protected_release", side_effect=PromotionError("injected final failure")),
                    self.assertRaisesRegex(PromotionError, "injected final failure"),
                ):
                    _copy_staged_release_from_fds(
                        sha,
                        source_fd,
                        releases_fd,
                        runtime_releases=releases,
                        expected_source_uid=uid,
                        expected_runtime_uid=uid,
                        expected_runtime_gid=gid,
                    )
            finally:
                os.close(source_fd)
                os.close(releases_fd)

            self.assertFalse((releases / sha).exists())
            self.assertEqual(list(releases.glob(".promoting-*")), [])
            self.assertEqual(os.readlink(current), f"releases/{previous_sha}")
            self.assertTrue(previous.is_dir())
            self.assertEqual(release_snapshot(previous), previous_snapshot)
            validate_protected_release(previous, previous_sha, expected_uid=uid, expected_gid=gid)

    @unittest.skipUnless(os.name == "posix", "nested artifact checks require POSIX dirfd operations")
    def test_nested_copy_rejects_unallowlisted_paths_and_unsafe_sources(self) -> None:
        uid = os.getuid()
        invalid_paths = ("../file", "ops/../file", "/absolute/file", "ops\\replicate-backups.mjs", "ops/other.mjs")
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            destination = root / "destination"
            source.mkdir()
            destination.mkdir()
            (source / "ops").mkdir()
            write_file(source / "ops/replicate-backups.mjs")
            source_fd = os.open(source, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            destination_fd = os.open(destination, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                for relative in invalid_paths:
                    with self.subTest(relative=relative), self.assertRaises(PromotionError):
                        _copy_top_level_file(source_fd, destination_fd, relative, uid=uid)

                (source / "ops/replicate-backups.mjs").unlink()
                (source / "ops").rmdir()
                (source / "ops").symlink_to(root, target_is_directory=True)
                with self.assertRaises(PromotionError):
                    _copy_top_level_file(source_fd, destination_fd, "ops/replicate-backups.mjs", uid=uid)
                (source / "ops").unlink()

                ops = source / "ops"
                ops.mkdir()
                ops.chmod(0o755)
                target = source / "replicate-target.mjs"
                write_file(target)
                (ops / "replicate-backups.mjs").symlink_to(target)
                with self.assertRaises(PromotionError):
                    _copy_top_level_file(source_fd, destination_fd, "ops/replicate-backups.mjs", uid=uid)
                (ops / "replicate-backups.mjs").unlink()
                destination_ops = destination / "ops"
                if destination_ops.exists():
                    destination_ops.rmdir()

                unsafe = ops / "replicate-backups.mjs"
                for mode in (0o664, 0o666):
                    with self.subTest(mode=oct(mode)):
                        write_file(unsafe)
                        unsafe.chmod(mode)
                        with self.assertRaisesRegex(PromotionError, "Unsafe staging file"):
                            _copy_top_level_file(
                                source_fd,
                                destination_fd,
                                "ops/replicate-backups.mjs",
                                uid=uid,
                            )
                        unsafe.unlink()
                        destination_ops = destination / "ops"
                        if destination_ops.exists():
                            destination_ops.rmdir()

                os.mkfifo(unsafe)
                with self.assertRaisesRegex(PromotionError, "Unsafe staging file"):
                    _copy_top_level_file(source_fd, destination_fd, "ops/replicate-backups.mjs", uid=uid)
            finally:
                os.close(source_fd)
                os.close(destination_fd)


if __name__ == "__main__":
    unittest.main(verbosity=2)
