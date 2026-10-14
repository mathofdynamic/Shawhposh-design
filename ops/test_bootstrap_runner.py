from __future__ import annotations

import importlib.util
import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path
from subprocess import CompletedProcess
from unittest import mock


RUNNER_PATH = Path(__file__).with_name("bootstrap_runner.py")
SPEC = importlib.util.spec_from_file_location("shawhposh_bootstrap_runner", RUNNER_PATH)
assert SPEC is not None and SPEC.loader is not None
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class BootstrapRunnerTests(unittest.TestCase):
    def test_deploy_entrypoint_is_validated_as_python(self) -> None:
        self.assertIn("ops/shawhposh-deploy", runner.PYTHON_ARTIFACTS)
        self.assertNotIn("ops/shawhposh-deploy", runner.SHELL_ARTIFACTS)

    def test_accepts_only_one_lowercase_40_character_sha(self) -> None:
        sha = "a" * 40
        self.assertEqual(runner.parse_sha([sha]), sha)
        for arguments in ([], ["invalid"], ["A" * 40], [sha, "extra"], ["../" + sha]):
            with self.subTest(arguments=arguments), self.assertRaises(runner.RunnerError):
                runner.parse_sha(arguments)

    def test_requested_commit_must_be_the_fixed_repository_and_reachable_from_main(self) -> None:
        sha = "a" * 40
        main = "b" * 40
        repository = Path("/trusted/repository")
        home = Path("/trusted/home")
        values = iter([runner.REPOSITORY_URL, sha, main, ""])
        with mock.patch.object(runner, "_git", side_effect=lambda *_args: next(values)), mock.patch.object(
            runner, "_run_git", return_value=CompletedProcess([], 0, "", "")
        ) as git:
            runner.verify_main_commit(repository, sha, home)
        git.assert_called_once_with(repository, ["merge-base", "--is-ancestor", sha, "refs/remotes/origin/main"], home)

        values = iter([runner.REPOSITORY_URL, sha, main, ""])
        with mock.patch.object(runner, "_git", side_effect=lambda *_args: next(values)), mock.patch.object(
            runner, "_run_git", return_value=CompletedProcess([], 1, "", "not an ancestor")
        ), self.assertRaisesRegex(runner.RunnerError, "not reachable from origin/main"):
            runner.verify_main_commit(repository, sha, home)

    @unittest.skipUnless(os.name == "posix" and Path("/usr/bin/git").is_file(), "Linux Git ancestry integration")
    def test_real_git_reachability_accepts_main_commit_and_rejects_unreachable_commit(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-bootstrap-git-") as temporary:
            root = Path(temporary)
            repository = root / "repo"
            home = root / "home"
            home.mkdir()
            subprocess.run(["/usr/bin/git", "init", "--quiet", "--initial-branch=main", str(repository)], check=True)
            for key, value in (("user.name", "Test"), ("user.email", "test@example.invalid")):
                subprocess.run(["/usr/bin/git", "-C", str(repository), "config", key, value], check=True)
            subprocess.run(["/usr/bin/git", "-C", str(repository), "commit", "--quiet", "--allow-empty", "-m", "main"], check=True)
            main_sha = subprocess.run(
                ["/usr/bin/git", "-C", str(repository), "rev-parse", "HEAD"], check=True, capture_output=True, text=True
            ).stdout.strip()
            subprocess.run(["/usr/bin/git", "-C", str(repository), "remote", "add", "origin", runner.REPOSITORY_URL], check=True)
            subprocess.run(["/usr/bin/git", "-C", str(repository), "update-ref", "refs/remotes/origin/main", main_sha], check=True)
            runner.verify_main_commit(repository, main_sha, home)

            subprocess.run(["/usr/bin/git", "-C", str(repository), "checkout", "--quiet", "--orphan", "unreachable"], check=True)
            subprocess.run(["/usr/bin/git", "-C", str(repository), "commit", "--quiet", "--allow-empty", "-m", "unreachable"], check=True)
            unreachable_sha = subprocess.run(
                ["/usr/bin/git", "-C", str(repository), "rev-parse", "HEAD"], check=True, capture_output=True, text=True
            ).stdout.strip()
            with self.assertRaisesRegex(runner.RunnerError, "not reachable from origin/main"):
                runner.verify_main_commit(repository, unreachable_sha, home)
    @unittest.skipUnless(os.name == "posix", "POSIX ownership, mode, and symlink checks")
    def test_trusted_artifact_check_rejects_symlinks_special_files_and_writable_files(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-test-") as temporary:
            root = Path(temporary)
            (root / "ops").mkdir()
            artifact = root / "ops" / "candidate"
            artifact.write_text("safe", encoding="utf-8")
            os.chmod(artifact, 0o644)
            runner._require_safe_components(root, "ops/candidate", os.getuid())

            os.chmod(artifact, 0o666)
            with self.assertRaisesRegex(runner.RunnerError, "Unsafe trusted artifact"):
                runner._require_safe_components(root, "ops/candidate", os.getuid())

            os.chmod(artifact, 0o644)
            artifact.unlink()
            artifact.symlink_to(root / "ops" / "target")
            with self.assertRaises((OSError, runner.RunnerError)):
                runner._require_safe_components(root, "ops/candidate", os.getuid())

            artifact.unlink()
            artifact.write_text("target", encoding="utf-8")
            (root / "ops" / "nested").symlink_to(root / "ops", target_is_directory=True)
            with self.assertRaisesRegex(runner.RunnerError, "Unsafe directory"):
                runner._require_safe_components(root, "ops/nested/candidate", os.getuid())

            (root / "ops" / "pipe").unlink(missing_ok=True)
            os.mkfifo(root / "ops" / "pipe")
            with self.assertRaisesRegex(runner.RunnerError, "Unsafe trusted artifact"):
                runner._require_safe_components(root, "ops/pipe", os.getuid())

    @unittest.skipUnless(os.name == "posix", "POSIX private artifact copy")
    def test_real_allowlist_copy_preserves_nested_paths_and_revalidates_private_tree(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-copy-") as temporary:
            root = Path(temporary)
            source_root = root / "source"
            (source_root / "ops" / "sudoers.d").mkdir(parents=True)
            uid, gid = os.getuid(), os.getgid()
            os.chmod(source_root, 0o700)
            os.chmod(source_root / "ops", 0o700)
            os.chmod(source_root / "ops" / "sudoers.d", 0o700)
            shell_text = "#!/usr/bin/env bash\ntrue\n"
            python_text = "pass\n"
            for relative in runner.TRUSTED_ARTIFACTS:
                path = source_root / relative
                content = runner.FINAL_SUDO_POLICY + "\n" if relative == "ops/sudoers.d/ubuntu-shawhposh" else (
                    python_text if relative in runner.PYTHON_ARTIFACTS else shell_text if relative in runner.SHELL_ARTIFACTS else "export {};\n" if relative in runner.NODE_ARTIFACTS else "unit\n"
                )
                path.write_text(content, encoding="utf-8")
                os.chmod(path, 0o644)
            sources = runner.validate_source_artifacts(source_root, expected_uid=uid, expected_gid=gid)
            trusted_root = root / "trusted"
            copied = runner._copy_trusted_artifacts(sources, trusted_root, owner_uid=uid, owner_gid=gid)
            runner.validate_source_artifacts(trusted_root, expected_uid=uid, expected_gid=gid)
            for relative, path in copied.items():
                info = path.lstat()
                self.assertTrue(stat.S_ISREG(info.st_mode), relative)
                self.assertEqual(info.st_uid, uid, relative)
                self.assertEqual(info.st_gid, gid, relative)
                self.assertEqual(stat.S_IMODE(info.st_mode), 0o600, relative)
            self.assertTrue((trusted_root / "ops" / "sudoers.d" / "ubuntu-shawhposh").is_file())

            with self.assertRaisesRegex(runner.RunnerError, "Unsafe allowlisted artifact path"):
                runner._require_safe_components(trusted_root, "ops/../bootstrap-production-automation.sh", uid, gid)

    def test_failed_bootstrap_does_not_enter_success_cleanup(self) -> None:
        events: list[str] = []
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-failure-") as temporary:
            helper = Path(temporary) / "helper"
            policy = Path(temporary) / "policy"
            helper.write_text("installed runner", encoding="utf-8")
            policy.write_text(runner.TEMP_SUDO_POLICY, encoding="utf-8")

            def verify() -> None:
                events.append("verify")

            def remove_temporary_access() -> None:
                events.append("remove")

            with self.assertRaisesRegex(runner.RunnerError, "temporary runner remains installed"):
                runner.complete_bootstrap(19, verify, remove_temporary_access)
            self.assertEqual(events, [])
            self.assertTrue(helper.is_file())
            self.assertEqual(policy.read_text(encoding="utf-8"), runner.TEMP_SUDO_POLICY)

    def test_success_verifies_permanent_deploy_before_removing_temporary_access(self) -> None:
        events: list[str] = []
        self.assertEqual(
            runner.complete_bootstrap(0, lambda: events.append("verify"), lambda: events.append("remove")),
            0,
        )
        self.assertEqual(events, ["verify", "remove"])

    @unittest.skipUnless(os.name == "posix", "POSIX owner/mode checks for trusted execution")
    def test_controller_executes_only_from_private_trusted_directory_noninteractively(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-exec-") as temporary:
            workspace = Path(temporary)
            repository = workspace / "checkout"
            trusted_root = workspace / "trusted"
            repository.mkdir(mode=0o700)
            trusted_root.mkdir(mode=0o700)
            (trusted_root / "ops").mkdir(mode=0o700)
            script = trusted_root / "ops" / "bootstrap-production-automation.sh"
            script.write_text("exit 0\n", encoding="utf-8")
            os.chmod(script, 0o600)
            sha = "a" * 40
            with mock.patch.object(runner.subprocess, "run", return_value=CompletedProcess([], 0, "", "")) as execute:
                status = runner.execute_trusted_bootstrap(workspace, repository, trusted_root, sha, trusted_uid=os.getuid())
            self.assertEqual(status, 0)
            args, kwargs = execute.call_args
            self.assertEqual(args[0], ["/bin/bash", str(script), "--trusted-runner"])
            self.assertEqual(kwargs["stdin"], runner.subprocess.DEVNULL)
            self.assertEqual(kwargs["env"]["SHAWHPOSH_BOOTSTRAP_GIT_ROOT"], str(repository))
            self.assertEqual(kwargs["env"]["SHAWHPOSH_BOOTSTRAP_TRUSTED_ROOT"], str(trusted_root))
            self.assertEqual(kwargs["env"]["SHAWHPOSH_BOOTSTRAP_REQUESTED_SHA"], sha)

    @unittest.skipUnless(os.name == "posix", "POSIX file removal and sudo policy transaction")
    def test_temporary_policy_and_runner_are_removed_only_after_final_checks(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-cleanup-") as temporary:
            root = Path(temporary)
            helper = root / "helper"
            policy = root / "policy"
            permanent_deploy = root / "shawhposh-deploy"
            helper.write_text("root runner", encoding="utf-8")
            policy.write_text(runner.TEMP_SUDO_POLICY, encoding="utf-8")
            permanent_deploy.write_text("permanent helper", encoding="utf-8")
            events: list[str] = []

            def validate_final() -> None:
                events.append("final")
                self.assertTrue(permanent_deploy.is_file())

            def validate_effective() -> None:
                events.append("effective")

            with mock.patch.object(runner.subprocess, "run", return_value=CompletedProcess([], 0, "", "")):
                runner.remove_temporary_privilege(
                    runner_path=helper,
                    policy_path=policy,
                    validate_runner=lambda _: None,
                    validate_policy=lambda _: None,
                    validate_final=validate_final,
                    validate_effective=validate_effective,
                )
            self.assertEqual(events, ["final", "effective"])
            self.assertFalse(helper.exists())
            self.assertFalse(policy.exists())
            self.assertTrue(permanent_deploy.is_file())

    @unittest.skipUnless(os.name == "posix", "POSIX rollback of sudoers file")
    def test_failed_final_check_restores_temporary_policy_and_keeps_runner(self) -> None:
        with tempfile.TemporaryDirectory(prefix="shawhposh-runner-rollback-") as temporary:
            root = Path(temporary)
            helper = root / "helper"
            policy = root / "policy"
            helper.write_text("root runner", encoding="utf-8")
            policy.write_text(runner.TEMP_SUDO_POLICY, encoding="utf-8")

            def fail_effective() -> None:
                raise runner.RunnerError("synthetic final verification failure")

            with mock.patch.object(runner, "_restore_file", side_effect=lambda path, contents: path.write_bytes(contents)), mock.patch.object(
                runner.subprocess, "run", return_value=CompletedProcess([], 0, "", "")
            ), self.assertRaisesRegex(runner.RunnerError, "synthetic final verification failure"):
                runner.remove_temporary_privilege(
                    runner_path=helper,
                    policy_path=policy,
                    validate_runner=lambda _: None,
                    validate_policy=lambda _: None,
                    validate_final=lambda: None,
                    validate_effective=fail_effective,
                )
            self.assertTrue(helper.is_file())
            self.assertEqual(policy.read_text(encoding="utf-8"), runner.TEMP_SUDO_POLICY)

    def test_runner_never_uses_a_user_supplied_checkout_or_service(self) -> None:
        source = RUNNER_PATH.read_text(encoding="utf-8")
        self.assertEqual(runner.REPOSITORY_URL, "https://github.com/mathofdynamic/Shawhposh-design.git")
        self.assertIn('"/bin/bash", str(script), "--trusted-runner"', source)
        self.assertIn('"/usr/local/sbin/shawhposh-deploy ^[0-9a-f]{40}$"', source)
        self.assertNotIn("/home/ubuntu/shawhposh/releases", source)
        self.assertNotIn("ubuntu/current", source)
        self.assertNotIn("systemctl", source[source.index("def execute_trusted_bootstrap"):source.index("def _regular_root_file")])


if __name__ == "__main__":
    unittest.main(verbosity=2)
