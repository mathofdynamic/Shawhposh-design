#!/usr/bin/env python3
"""Pure policy tests for the root-owned automatic deployment entry point."""

from __future__ import annotations

import io
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import automated_deploy as deployment  # noqa: E402


SHA = "a" * 40


class AutomatedDeployPolicyTests(unittest.TestCase):
    def test_log_survives_a_closed_ssh_output_pipe(self) -> None:
        class ClosedPipe:
            def write(self, _: str) -> int:
                raise BrokenPipeError(32, "Broken pipe")

            def flush(self) -> None:
                raise BrokenPipeError(32, "Broken pipe")

        with patch.object(deployment.sys, "stdout", ClosedPipe()):
            deployment._log("BUILD", "step=npm-ci result=passed")

    def test_promotion_runner_preserves_binary_output_when_requested(self) -> None:
        completed = subprocess.CompletedProcess(["curl"], 0, stdout=b"\xff", stderr=b"")
        with patch.object(deployment.promotion.subprocess, "run", return_value=completed) as run:
            result = deployment.promotion._run(["/usr/bin/curl"], binary=True)

        self.assertEqual(result.stdout, b"\xff")
        self.assertFalse(run.call_args.kwargs["text"])

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

    def test_full_stack_targets_are_fixed_to_shawhposh_runtime_roots(self) -> None:
        self.assertEqual(deployment.WEB_ROOT, Path("/var/www/shawhposh"))
        self.assertEqual(deployment.WEB_RELEASES, Path("/var/www/shawhposh/releases"))
        self.assertEqual(deployment.WEB_CURRENT, Path("/var/www/shawhposh/current"))
        self.assertEqual(deployment.SERVICE_NAME, "shawhposh-api.service")
        self.assertEqual(deployment.DEPLOY_LOCK_PATH, Path("/run/lock/shawhposh-promote.lock"))

    def test_pair_rollback_restores_both_release_pointers_and_checks_all_health_gates(self) -> None:
        previous_api = "b" * 40
        previous_web = "20261001-1234abcd"
        with (
            patch.object(deployment.promotion, "_current_sha", side_effect=[SHA, previous_api]),
            patch.object(deployment.frontend, "_current_sha", side_effect=[SHA, previous_web]),
            patch.object(deployment.promotion, "_atomic_switch") as switch_api,
            patch.object(deployment.frontend, "_atomic_switch") as switch_web,
            patch.object(
                deployment.promotion,
                "_run",
                return_value=type("Result", (), {"returncode": 0})(),
            ) as run,
            patch.object(deployment, "_health_ready", return_value=True),
            patch.object(deployment, "_website_health_matches", return_value=True),
            patch.object(deployment, "_commerce_snapshots_match", return_value=True),
            patch.object(deployment, "_log"),
        ):
            self.assertTrue(
                deployment._rollback_release_pair(
                    11,
                    12,
                    requested_sha=SHA,
                    previous_api_sha=previous_api,
                    previous_web_release=previous_web,
                    commerce_snapshot={"payment": "[]", "shipping": "[]"},
                )
            )
        switch_api.assert_called_once_with(11, previous_api)
        switch_web.assert_called_once_with(12, previous_web, releases_root=deployment.WEB_RELEASES)
        run.assert_called_once_with(["/usr/bin/systemctl", "restart", deployment.SERVICE_NAME], timeout=30)

    def test_pair_rollback_refuses_an_unexpected_pointer_without_mutating_either_side(self) -> None:
        with (
            patch.object(deployment.promotion, "_current_sha", return_value="c" * 40),
            patch.object(deployment.frontend, "_current_sha", return_value="d" * 40),
            patch.object(deployment.promotion, "_atomic_switch") as switch_api,
            patch.object(deployment.frontend, "_atomic_switch") as switch_web,
            patch.object(deployment.promotion, "_run") as run,
            patch.object(deployment, "_log"),
        ):
            self.assertFalse(
                deployment._rollback_release_pair(
                    11,
                    12,
                    requested_sha=SHA,
                    previous_api_sha="b" * 40,
                    previous_web_release="1" * 40,
                    commerce_snapshot={"payment": "[]", "shipping": "[]"},
                )
            )
        switch_api.assert_not_called()
        switch_web.assert_not_called()
        run.assert_not_called()

    def test_activation_switches_both_fixed_release_roots_before_restarting_only_api(self) -> None:
        previous = "b" * 40
        events: list[str] = []

        def api_switch(*args, **kwargs):
            events.append("backend")

        def web_switch(*args, **kwargs):
            events.append("frontend")

        def run(command, **kwargs):
            events.append("api-restart")
            return type("Result", (), {"returncode": 0})()

        with (
            patch.object(deployment.promotion, "_current_sha", return_value=previous),
            patch.object(deployment.frontend, "_current_sha", return_value=previous),
            patch.object(deployment.promotion, "_atomic_switch", side_effect=api_switch) as switch_api,
            patch.object(deployment.frontend, "_atomic_switch", side_effect=web_switch) as switch_web,
            patch.object(deployment.promotion, "_run", side_effect=run),
            patch.object(deployment, "_health_ready", return_value=True),
            patch.object(deployment, "_website_health_matches", return_value=True),
            patch.object(deployment, "_commerce_snapshots_match", return_value=True),
            patch.object(deployment, "_log"),
        ):
            deployment._activate_release_pair(
                11,
                12,
                requested_sha=SHA,
                previous_api_sha=previous,
                previous_web_release=previous,
                commerce_snapshot={"payment": "[]", "shipping": "[]"},
            )

        self.assertEqual(events, ["backend", "frontend", "api-restart"])
        switch_api.assert_called_once_with(11, SHA)
        switch_web.assert_called_once_with(12, SHA, releases_root=deployment.WEB_RELEASES)
        self.assertEqual(deployment.SERVICE_NAME, "shawhposh-api.service")

    def test_frontend_health_checks_html_and_rejects_spa_fallback_for_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            release = Path(temporary) / SHA
            (release / "assets").mkdir(parents=True)
            html = (
                b'<!doctype html>\r\n<html><head>\r\n'
                b'<link rel="stylesheet" href="/assets/app.css">\r\n'
                b'<script type="module" src="/assets/app.js"></script>\r\n'
                b'</head>\r\n<body>\r\n</body></html>\r'
            )
            (release / "index.html").write_bytes(html)
            (release / "assets/app.css").write_bytes(b"body{}")
            (release / "assets/app.js").write_bytes(b"app()")

            def curl_with_type(content_type: str):
                def curl(argv, **kwargs):
                    if "--head" in argv:
                        asset_name = argv[-1].rsplit("/", 1)[-1]
                        content_length = {"app.css": 6, "app.js": 5}[asset_name]
                        headers = (
                            f"HTTP/1.1 200 OK\r\nContent-Length: {content_length}\r\n"
                            f"Content-Type: {content_type}\r\n\r\n"
                        )
                        return type(
                            "Result",
                            (),
                            {"returncode": 0, "stdout": f"{headers}\n200\n{content_type}"},
                        )()
                    return type("Result", (), {"returncode": 0, "stdout": html + b"\n200"})()

                return curl

            with (
                patch.object(deployment, "WEB_RELEASES", release.parent),
                patch.object(deployment.frontend, "_current_sha", return_value=SHA),
                patch.object(deployment.promotion, "_run", side_effect=curl_with_type("application/javascript")) as run,
            ):
                self.assertTrue(deployment._website_health_matches(SHA, 11))
            self.assertEqual(run.call_count, 3)
            self.assertTrue(run.call_args_list[0].kwargs["binary"])

            with (
                patch.object(deployment, "WEB_RELEASES", release.parent),
                patch.object(deployment.frontend, "_current_sha", return_value=SHA),
                patch.object(deployment.promotion, "_run", side_effect=curl_with_type("text/html")),
            ):
                self.assertFalse(deployment._website_health_matches(SHA, 11))

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
        self.assertIn("--property=MemoryHigh=384M", command)
        self.assertIn("--property=MemoryMax=768M", command)
        self.assertIn("--property=MemorySwapMax=512M", command)
        self.assertIn("--property=CPUQuota=40%", command)
        self.assertIn("--property=InaccessiblePaths=/var/lib/shawhposh /var/backups/shawhposh /opt/shawhposh /home/ubuntu", command)
        self.assertIn(
            "--property=IPAddressDeny=127.0.0.0/8 ::1/128 169.254.0.0/16 fe80::/10 "
            "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 fc00::/7",
            command,
        )
        self.assertFalse(any("IPAddressDeny=localhost" in value or "link-local" in value for value in command))
        self.assertIn("--property=IPAddressAllow=127.0.0.53/32", command)
        separator = command.index("--")
        self.assertEqual(command[separator + 1], "/usr/bin/env")
        self.assertEqual(command[separator + 2], "-i")
        self.assertIn(f"NPM_CONFIG_USERCONFIG={workspace / 'home' / 'npm-userconfig'}", command)
        self.assertIn(f"NPM_CONFIG_GLOBALCONFIG={workspace / 'home' / 'npm-globalconfig'}", command)
        self.assertNotEqual(
            f"NPM_CONFIG_USERCONFIG={workspace / 'home' / 'npm-userconfig'}",
            f"NPM_CONFIG_GLOBALCONFIG={workspace / 'home' / 'npm-globalconfig'}",
        )
        self.assertIn("NODE_OPTIONS=--max-old-space-size=640", command)
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
