import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
FIXTURES = ROOT / "tests" / "fixtures" / "ci_gates"


def run_checker(script_name, *arguments):
    return subprocess.run(
        [sys.executable, str(SCRIPTS / script_name), *map(str, arguments)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


class CssDriftGateTests(unittest.TestCase):
    def test_real_repo_passes_with_committed_css_as_candidate(self):
        result = run_checker(
            "check-css-drift.py",
            "--candidate",
            ROOT / "assets" / "main.css",
            "--committed",
            ROOT / "assets" / "main.css",
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("CSS drift gate passed", result.stdout)

    def test_byte_drift_is_reported_with_context(self):
        css_fixtures = FIXTURES / "css"
        result = run_checker(
            "check-css-drift.py",
            "--candidate",
            css_fixtures / "candidate.css",
            "--committed",
            css_fixtures / "committed.css",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Committed bytes:", result.stderr)
        self.assertIn("Candidate bytes:", result.stderr)
        self.assertIn("First difference at byte", result.stderr)
        self.assertIn("color:blue", result.stderr)


class SettingsParityGateTests(unittest.TestCase):
    def test_real_repo_passes(self):
        result = run_checker("check-settings-parity.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Settings parity gate passed", result.stdout)

    def test_parity_required_menu_and_type_violations_are_reported(self):
        settings_fixtures = FIXTURES / "settings"
        result = run_checker(
            "check-settings-parity.py",
            "--schema",
            settings_fixtures / "schema.json",
            "--data",
            settings_fixtures / "data.json",
            "--optional",
            settings_fixtures / "optional.txt",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[data-key] 'unexpected'", result.stderr)
        self.assertIn("[schema-key] 'missing_text'", result.stderr)
        self.assertIn("[required-menu] 'main_menu'", result.stderr)
        self.assertIn("[type] 'enabled'", result.stderr)
        self.assertIn("[type] 'layout'", result.stderr)
        self.assertNotIn("[schema-key] 'optional_text'", result.stderr)


class TemplateIntegrityGateTests(unittest.TestCase):
    def test_real_repo_passes(self):
        result = run_checker("check-templates.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)
        self.assertIn("skipped 0 include tag(s)", result.stdout)

    def test_missing_include_unknown_url_and_variable_include_are_reported(self):
        template_fixtures = FIXTURES / "templates"
        result = run_checker(
            "check-templates.py",
            "--root",
            template_fixtures / "root",
            "--allowlist",
            template_fixtures / "allowlist.txt",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[include]", result.stderr)
        self.assertIn("partials/missing.html", result.stderr)
        self.assertIn("[url-name]", result.stderr)
        self.assertIn("unknown:route", result.stderr)
        self.assertIn("skipped 1 include tag(s)", result.stdout)
        self.assertNotIn("commented-out.html", result.stderr)


if __name__ == "__main__":
    unittest.main()
