import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from promote_release import (
    PromotionError,
    _atomic_switch,
    _copy_directory,
    _current_sha,
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


class PromoteReleaseTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
