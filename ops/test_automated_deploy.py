#!/usr/bin/env python3
"""Pure policy tests for the root-owned automatic deployment entry point."""

from __future__ import annotations

import sys
import io
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import automated_deploy as deployment  # noqa: E402


SHA = "a" * 40


class AutomatedDeployPolicyTests(unittest.TestCase):
    def test_release_id_is_exact_lowercase_sha_and_not_a_path_or_ref(self) -> None:
        self.assertEqual(deployment.validate_sha(SHA), SHA)
        for value in (
            "A" * 40,
            "a" * 39,
            "a" * 41,
            "../" + SHA,
            "main",
            " " + SHA,
            SHA + " extra",
        ):
            with self.subTest(value=value):
                with self.assertRaises(deployment.DeployError):
                    deployment.validate_sha(value)

    def test_cli_rejects_missing_or_extra_arguments_before_deploy(self) -> None:
        with patch.object(deployment, "deploy") as deploy:
            with redirect_stderr(io.StringIO()):
                self.assertEqual(deployment.main([]), 2)
                self.assertEqual(deployment.main([SHA, "--service=other"]), 2)
            deploy.assert_not_called()

    def test_repository_and_branch_are_fixed(self) -> None:
        self.assertEqual(
            deployment.REPOSITORY_URL,
            "https://github.com/mathofdynamic/Shawhposh-design.git",
        )
        self.assertEqual(deployment.TRUSTED_BRANCH, "refs/remotes/origin/main")
        self.assertEqual(deployment.SERVICE_NAME, "shawhposh-api.service")
        self.assertEqual(deployment.RUNTIME_ROOT, Path("/opt/shawhposh"))

    def test_commit_verification_uses_only_fixed_origin_main_ancestry(self) -> None:
        successful_git = type("Result", (), {"returncode": 0})()
        with (
            patch.object(deployment, "_require_commit_available") as available,
            patch.object(deployment, "_git", return_value=successful_git) as git,
        ):
            deployment._require_main_ancestor(SHA, SHA, {})
        available.assert_called_once_with(SHA, SHA, {}, "requested release")
        git.assert_called_once_with(
            SHA,
            ["merge-base", "--is-ancestor", SHA, "refs/remotes/origin/main"],
            env={},
            timeout=30,
        )

        failed_git = type("Result", (), {"returncode": 1})()
        with (
            patch.object(deployment, "_require_commit_available"),
            patch.object(deployment, "_git", return_value=failed_git),
        ):
            with self.assertRaisesRegex(deployment.DeployError, "not reachable from trusted origin/main"):
                deployment._require_main_ancestor(SHA, SHA, {})

    def test_only_unchanged_migration_set_is_automatically_deployable(self) -> None:
        deployment.migration_policy("same-digest", "same-digest")
        with self.assertRaisesRegex(deployment.DeployError, "MANUAL MIGRATION REQUIRED"):
            deployment.migration_policy("old-digest", "new-digest")

    def test_source_archive_paths_reject_traversal_and_platform_aliases(self) -> None:
        self.assertEqual(deployment._archive_path_parts("source/server/index.js"), ("source", "server", "index.js"))
        for value in (
            "../file",
            "source/../file",
            "source/server/../../file",
            "/absolute/file",
            "source\\windows\\path",
            "source//file",
            "source/./file",
            "source/file\x00suffix",
        ):
            with self.subTest(value=value):
                with self.assertRaises(deployment.DeployError):
                    deployment._archive_path_parts(value)

    def test_build_pipeline_runs_required_checks_and_only_npm_ci_has_network(self) -> None:
        steps = deployment._build_steps()
        commands = {step: command for step, command, _ in steps}
        self.assertEqual(
            set(commands),
            {
                "npm-ci",
                "lint",
                "test",
                "test-backend",
                "test-ops",
                "server-check",
                "server-build",
                "build",
                "runtime-audit",
            },
        )
        self.assertEqual([step for step, _, network in steps if network], ["npm-ci"])
        self.assertEqual(commands["npm-ci"][0:2], ("/usr/bin/npm", "ci"))
        self.assertIn("--registry=https://registry.npmjs.org/", commands["npm-ci"])

    def test_build_command_cleans_environment_and_blocks_private_networks(self) -> None:
        workspace = Path("/var/lib/shawhposh-build/runs/run-" + "b" * 32)
        command = deployment._build_command_argv(
            ["/usr/bin/npm", "ci"],
            step="npm-ci",
            run_id="b" * 32,
            workspace=workspace,
            source=workspace / "source",
            network=True,
        )
        self.assertIn("--property=User=shawhposh-build", command)
        self.assertIn("--property=NoNewPrivileges=yes", command)
        self.assertIn("--property=ProtectSystem=strict", command)
        self.assertIn("--property=MemoryHigh=256M", command)
        self.assertIn("--property=MemoryMax=512M", command)
        self.assertIn("--property=MemorySwapMax=256M", command)
        self.assertIn("--property=CPUQuota=40%", command)
        self.assertIn("--property=InaccessiblePaths=/var/lib/shawhposh /var/backups/shawhposh /opt/shawhposh /home/ubuntu", command)
        self.assertIn(
            "--property=IPAddressDeny=localhost link-local 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 fc00::/7",
            command,
        )
        self.assertIn("--property=IPAddressAllow=127.0.0.53/32", command)
        separator = command.index("--")
        self.assertEqual(command[separator + 1], "/usr/bin/env")
        self.assertEqual(command[separator + 2], "-i")
        self.assertIn("NPM_CONFIG_USERCONFIG=/dev/null", command)
        self.assertIn("NPM_CONFIG_GLOBALCONFIG=/dev/null", command)
        self.assertNotIn("DATABASE_URL", command)
        self.assertNotIn("SESSION_SECRET", command)
        self.assertNotIn("BALE_BOT_TOKEN", command)
        self.assertNotIn("PAYMENT_RECEIPT_DIR", command)
        self.assertIn("--property=PrivateNetwork=no", command)

    def test_validation_build_steps_have_no_network(self) -> None:
        workspace = Path("/var/lib/shawhposh-build/runs/run-" + "c" * 32)
        command = deployment._build_command_argv(
            ["/usr/bin/npm", "test"],
            step="test",
            run_id="c" * 32,
            workspace=workspace,
            source=workspace / "source",
            network=False,
        )
        self.assertIn("--property=PrivateNetwork=yes", command)
        self.assertFalse(any(value.startswith("--property=IPAddressDeny=") for value in command))

    def test_health_gate_requires_http_ok_database_connected_and_exact_version(self) -> None:
        payload = '{"status":"ok","database":"connected","version":"' + SHA + '"}\n200'
        self.assertTrue(deployment._health_response_matches(SHA, 0, payload))
        self.assertFalse(deployment._health_response_matches(SHA, 22, payload))
        self.assertFalse(deployment._health_response_matches(SHA, 0, payload.replace("\n200", "\n503")))
        self.assertFalse(deployment._health_response_matches(SHA, 0, payload.replace('"connected"', '"failed"')))
        self.assertFalse(deployment._health_response_matches(SHA, 0, payload.replace(SHA, "b" * 40)))
        self.assertFalse(deployment._health_response_matches(SHA, 0, "null\n200"))
        self.assertFalse(deployment._health_response_matches(SHA, 0, "not-json\n200"))

    def test_rollback_restarts_only_the_fixed_api_and_restores_previous_sha(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", return_value=SHA),
            patch.object(deployment.promotion, "resolve_protected_release") as resolve,
            patch.object(deployment.promotion, "_atomic_switch") as switch,
            patch.object(
                deployment.promotion,
                "_run",
                return_value=type("Result", (), {"returncode": 0})(),
            ) as run,
            patch.object(deployment, "_health_ready", return_value=True),
            patch.object(deployment, "_log"),
        ):
            self.assertTrue(deployment._rollback_to_protected_previous(7, SHA, "b" * 40))
        resolve.assert_called_once_with("b" * 40)
        switch.assert_called_once_with(7, "b" * 40)
        run.assert_called_once_with(["/usr/bin/systemctl", "restart", "shawhposh-api.service"], timeout=30)

    def test_rollback_refuses_if_current_release_changed_concurrently(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", return_value="c" * 40),
            patch.object(deployment.promotion, "resolve_protected_release") as resolve,
            patch.object(deployment.promotion, "_atomic_switch") as switch,
            patch.object(deployment.promotion, "_run") as run,
            patch.object(deployment, "_log"),
        ):
            self.assertFalse(deployment._rollback_to_protected_previous(7, SHA, "b" * 40))
        resolve.assert_not_called()
        switch.assert_not_called()
        run.assert_not_called()

    def test_failed_atomic_switch_that_changed_current_is_rolled_back(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", side_effect=[SHA, SHA]),
            patch.object(deployment, "_rollback_to_protected_previous", return_value=True) as rollback,
            patch.object(deployment, "_log"),
        ):
            self.assertTrue(deployment._rollback_after_failed_switch(7, SHA, "b" * 40))
        rollback.assert_called_once_with(7, SHA, "b" * 40)

    def test_failed_atomic_switch_unchanged_current_needs_no_rollback(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", return_value="b" * 40),
            patch.object(deployment, "_rollback_to_protected_previous") as rollback,
            patch.object(deployment, "_log"),
        ):
            self.assertTrue(deployment._rollback_after_failed_switch(7, SHA, "b" * 40))
        rollback.assert_not_called()

    def test_failed_atomic_switch_refuses_unexpected_current_target(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", return_value="c" * 40),
            patch.object(deployment, "_rollback_to_protected_previous") as rollback,
            patch.object(deployment, "_log"),
        ):
            self.assertFalse(deployment._rollback_after_failed_switch(7, SHA, "b" * 40))
        rollback.assert_not_called()


if __name__ == "__main__":
    unittest.main()
