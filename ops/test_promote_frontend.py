from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from promote_frontend import (
    FrontendPromotionError,
    _atomic_switch,
    _current_sha,
    _prepare_frontend_release_from_fds,
    _retain_frontend_releases,
    validate_frontend_release,
    validate_sha,
)


SHA = "a" * 40


def _write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    path.chmod(0o644)


def _make_dist(root: Path, uid: int, gid: int) -> Path:
    dist = root / "dist"
    _write(dist / "index.html", b'<script type="module" src="/assets/app-abc.js"></script>\n')
    _write(dist / "assets/app-abc.js", b'console.log("Shawhposh");\n')
    _write(dist / "assets/app-def.css", b"body{color:#111}\n")
    for current, directories, files in os.walk(dist):
        Path(current).chmod(0o755)
        os.chown(current, uid, gid)
        for name in files:
            os.chown(Path(current) / name, uid, gid)
    return dist


@unittest.skipUnless(os.name == "posix", "protected static promotion requires POSIX dirfd operations")
class PromoteFrontendTests(unittest.TestCase):
    def _prepare(self, root: Path, sha: str = SHA) -> tuple[Path, int, int, int]:
        uid, gid = os.getuid(), os.getgid()
        dist = _make_dist(root / "source", uid, gid)
        web_root = root / "web"
        releases = web_root / "releases"
        releases.mkdir(parents=True)
        web_root.chmod(0o755)
        releases.chmod(0o755)
        source_fd = os.open(dist, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        root_fd = os.open(web_root, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        release = _prepare_frontend_release_from_fds(
            sha,
            source_fd,
            releases_fd,
            releases_root=releases,
            expected_source_uid=uid,
            expected_source_gid=gid,
            expected_runtime_uid=uid,
            expected_runtime_gid=gid,
        )
        os.close(source_fd)
        return release, root_fd, releases_fd, uid

    def test_sha_is_strict_and_release_path_is_derived(self) -> None:
        self.assertEqual(validate_sha(SHA), SHA)
        for value in ("A" * 40, "a" * 39, "../" + SHA, "main", SHA + "/other"):
            with self.subTest(value=value), self.assertRaises(FrontendPromotionError):
                validate_sha(value)

    def test_realistic_static_build_is_rootable_validated_and_atomically_selected(self) -> None:
        uid, gid = os.getuid(), os.getgid()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            release, root_fd, releases_fd, _ = self._prepare(root)
            try:
                validate_frontend_release(release, SHA, expected_uid=uid, expected_gid=gid)
                self.assertEqual((release / "index.html").read_bytes(), b'<script type="module" src="/assets/app-abc.js"></script>\n')
                self.assertEqual((release / "assets").stat().st_mode & 0o777, 0o755)
                self.assertEqual((release / "assets/app-abc.js").stat().st_mode & 0o777, 0o644)
                self.assertEqual((release / "assets/app-abc.js").stat().st_uid, uid)
                _atomic_switch(root_fd, SHA, releases_root=release.parent, expected_uid=uid, expected_gid=gid)
                self.assertEqual(os.readlink(root / "web/current"), f"releases/{SHA}")
                self.assertEqual(
                    _current_sha(root_fd, releases_root=release.parent, expected_uid=uid, expected_gid=gid), SHA
                )
            finally:
                os.close(root_fd)
                os.close(releases_fd)

    def test_rejects_symlinks_hardlinks_writable_artifacts_and_special_files(self) -> None:
        for unsafe in ("symlink", "symlink_directory", "hardlink", "writable", "writable_directory", "fifo", "unsafe_name", "env"):
            with self.subTest(unsafe=unsafe), tempfile.TemporaryDirectory() as temporary:
                uid, gid = os.getuid(), os.getgid()
                root = Path(temporary)
                dist = _make_dist(root / "source", uid, gid)
                target = dist / "assets/app-abc.js"
                if unsafe == "symlink":
                    target.unlink()
                    target.symlink_to("app-def.css")
                elif unsafe == "symlink_directory":
                    (dist / "assets").rename(dist / "assets-real")
                    (dist / "assets").symlink_to("assets-real", target_is_directory=True)
                elif unsafe == "hardlink":
                    os.link(target, dist / "assets/linked.js")
                elif unsafe == "writable":
                    target.chmod(0o666)
                elif unsafe == "writable_directory":
                    (dist / "assets").chmod(0o777)
                elif unsafe == "fifo":
                    os.mkfifo(dist / "assets/pipe")
                    os.chown(dist / "assets/pipe", uid, gid)
                elif unsafe == "unsafe_name":
                    _write(dist / "..\\escaped", b"unsafe\n")
                elif unsafe == "env":
                    _write(dist / ".env", b"PRIVATE=not-allowed\n")

                web_root = root / "web"
                releases = web_root / "releases"
                releases.mkdir(parents=True)
                source_fd = os.open(dist, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                try:
                    with self.assertRaises(FrontendPromotionError):
                        _prepare_frontend_release_from_fds(
                            SHA,
                            source_fd,
                            releases_fd,
                            releases_root=releases,
                            expected_source_uid=uid,
                            expected_source_gid=gid,
                            expected_runtime_uid=uid,
                            expected_runtime_gid=gid,
                        )
                    self.assertFalse((releases / SHA).exists())
                    self.assertEqual(list(releases.glob(".promoting-*")), [])
                finally:
                    os.close(source_fd)
                    os.close(releases_fd)

    def test_existing_sha_release_is_reused_only_when_its_tree_matches_build(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            release, root_fd, releases_fd, uid = self._prepare(root)
            try:
                dist = _make_dist(root / "other-source", os.getuid(), os.getgid())
                (dist / "assets/app-abc.js").write_bytes(b"changed build content\n")
                source_fd = os.open(dist, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                try:
                    with self.assertRaisesRegex(FrontendPromotionError, "does not match the trusted build"):
                        _prepare_frontend_release_from_fds(
                            SHA,
                            source_fd,
                            releases_fd,
                            releases_root=release.parent,
                            expected_source_uid=os.getuid(),
                            expected_source_gid=os.getgid(),
                            expected_runtime_uid=uid,
                            expected_runtime_gid=os.getgid(),
                        )
                finally:
                    os.close(source_fd)
                self.assertTrue(release.is_dir())
            finally:
                os.close(root_fd)
                os.close(releases_fd)

    def test_retention_preserves_current_and_previous_and_removes_only_old_sha_dirs(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            root_fd = -1
            releases_fd = -1
            releases = root / "web/releases"
            releases.mkdir(parents=True)
            (root / "web").chmod(0o755)
            releases.chmod(0o755)
            uid, gid = os.getuid(), os.getgid()
            for index in range(1, 6):
                sha = f"{index:040x}"
                source = _make_dist(root / f"source-{index}", uid, gid)
                source_fd = os.open(source, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
                try:
                    _prepare_frontend_release_from_fds(
                        sha,
                        source_fd,
                        releases_fd,
                        releases_root=releases,
                        expected_source_uid=uid,
                        expected_source_gid=gid,
                        expected_runtime_uid=uid,
                        expected_runtime_gid=gid,
                    )
                    os.utime(releases / sha, (1_700_000_000 + index, 1_700_000_000 + index))
                finally:
                    os.close(source_fd)
                    os.close(releases_fd)
            root_fd = os.open(root / "web", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            releases_fd = os.open(releases, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                _atomic_switch(
                    root_fd,
                    f"{5:040x}",
                    releases_root=releases,
                    expected_uid=uid,
                    expected_gid=gid,
                )
                removed = _retain_frontend_releases(
                    root_fd,
                    releases_fd,
                    current=f"{5:040x}",
                    previous=f"{1:040x}",
                    releases_root=releases,
                    keep_count=3,
                    expected_uid=uid,
                    expected_gid=gid,
                )
                self.assertEqual(set(removed), {f"{2:040x}", f"{3:040x}"})
                self.assertTrue((releases / f"{5:040x}").is_dir())
                self.assertTrue((releases / f"{1:040x}").is_dir())
            finally:
                os.close(root_fd)
                os.close(releases_fd)


if __name__ == "__main__":
    unittest.main()
