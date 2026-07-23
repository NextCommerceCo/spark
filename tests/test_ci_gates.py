import json
import subprocess
import sys
import tempfile
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

    def test_textarea_and_product_category_values_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {"name": "body", "type": "textarea"},
                        {
                            "name": "category_handle",
                            "type": "product_category",
                        },
                        {
                            "name": "category_id",
                            "type": "product_category",
                        },
                        {
                            "name": "category_unset",
                            "type": "product_category",
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
                "body": "Long-form copy",
                "category_handle": "summer",
                "category_id": 42,
                "category_unset": None,
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-settings-parity.py",
                "--schema",
                schema_path,
                "--data",
                data_path,
                "--optional",
                optional_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Settings parity gate passed", result.stdout)

    def test_empty_and_malformed_select_options_are_schema_violations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {
                            "name": "empty_options",
                            "type": "select",
                            "options": [],
                        },
                        {
                            "name": "missing_value",
                            "type": "radio",
                            "options": [{"name": "Choice"}],
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
                "empty_options": "",
                "missing_value": "",
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-settings-parity.py",
                "--schema",
                schema_path,
                "--data",
                data_path,
                "--optional",
                optional_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[schema-options] 'empty_options'", result.stderr)
        self.assertIn("[schema-options] 'missing_value'", result.stderr)

    def test_invalid_schema_default_is_reported(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {
                            "name": "enabled",
                            "type": "checkbox",
                            "default": "yes",
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
                "enabled": True,
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-settings-parity.py",
                "--schema",
                schema_path,
                "--data",
                data_path,
                "--optional",
                optional_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[default] 'enabled': expected bool", result.stderr)

    def test_number_bounds_and_non_finite_values_apply_to_data_and_defaults(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {
                            "name": "data_outside",
                            "type": "range",
                            "min": 0,
                            "max": 10,
                            "default": 5,
                        },
                        {
                            "name": "default_outside",
                            "type": "number",
                            "min": 0,
                            "max": 10,
                            "default": 11,
                        },
                        {
                            "name": "data_nan",
                            "type": "number",
                            "default": 1,
                        },
                        {
                            "name": "default_nan",
                            "type": "number",
                            "default": float("nan"),
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
                "data_outside": -1,
                "default_outside": 5,
                "data_nan": float("nan"),
                "default_nan": 1,
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-settings-parity.py",
                "--schema",
                schema_path,
                "--data",
                data_path,
                "--optional",
                optional_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[type] 'data_outside': value -1 is below minimum 0", result.stderr)
        self.assertIn(
            "[default] 'default_outside': value 11 exceeds maximum 10",
            result.stderr,
        )
        self.assertIn("[type] 'data_nan': expected a finite number", result.stderr)
        self.assertIn(
            "[default] 'default_nan': expected a finite number",
            result.stderr,
        )


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

    def test_include_inside_named_comment_block_is_ignored(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                '{% comment "note" %}\n'
                "{% include 'partials/missing.html' %}\n"
                "{% endcomment %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)
        self.assertNotIn("partials/missing.html", result.stderr)

    def test_inline_comment_cannot_open_a_block_comment(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{# {% comment %} #}\n"
                "{% include 'partials/missing.html' %}\n"
                "{% endcomment %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[include]", result.stderr)
        self.assertIn("partials/missing.html", result.stderr)

    def test_inline_comment_cannot_close_a_real_block_comment(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{% comment %}\n"
                "{# {% endcomment %} #}\n"
                "{% include 'partials/missing.html' %}\n"
                "{% endcomment %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)
        self.assertNotIn("partials/missing.html", result.stderr)

    def test_include_and_url_inside_verbatim_block_are_ignored(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{% verbatim %}\n"
                "{% include 'partials/missing.html' %}\n"
                "{% url 'unknown:route' %}\n"
                "{% endverbatim %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)
        self.assertNotIn("partials/missing.html", result.stderr)
        self.assertNotIn("unknown:route", result.stderr)

    def test_nonliteral_include_and_url_arguments_are_counted_separately(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                '{% include _("partials/present.html") %}\n'
                '{% include ""|default:"partials/present.html" %}\n'
                "{% include dynamic_partial %}\n"
                '{% url _("known:route") %}\n'
                '{% url ""|default:"known:route" %}\n'
                "{% url dynamic_route %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("known:route\n", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("skipped 3 include tag(s)", result.stdout)
        self.assertIn("skipped 3 url tag(s)", result.stdout)

    def test_tags_without_arguments_are_violations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{% include %}\n{% url %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("tag has no target argument", result.stderr)
        self.assertIn("tag has no URL name argument", result.stderr)
        self.assertIn("skipped 0 include tag(s)", result.stdout)
        self.assertIn("skipped 0 url tag(s)", result.stdout)

    def test_absolute_and_dotdot_include_targets_are_path_escape_violations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            root_dir = fixture_dir / "root"
            templates_dir = root_dir / "templates"
            templates_dir.mkdir(parents=True)
            outside_path = fixture_dir / "outside.html"
            outside_path.write_text("Outside root.\n", encoding="utf-8")
            (templates_dir / "index.html").write_text(
                f"{{% include {str(outside_path)!r} %}}\n"
                "{% include '../outside.html' %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                root_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stderr.count("[path-escape]"), 2, result.stderr)
        self.assertIn(str(outside_path), result.stderr)
        self.assertIn("../outside.html", result.stderr)

    def test_empty_template_inventory_fails(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no template files were found", result.stderr)


class BuildConfigurationTests(unittest.TestCase):
    def test_css_input_variable_drives_build_watch_and_drift_gate(self):
        makefile = (ROOT / "Makefile").read_text(encoding="utf-8")

        self.assertIn("CSS_INPUT = css/input.css", makefile)
        self.assertEqual(makefile.count("css/input.css"), 1)
        self.assertGreaterEqual(makefile.count('-i "$(CSS_INPUT)"'), 3)
        self.assertIn(
            'scripts/check-css-drift.py --input "$(CSS_INPUT)"',
            makefile,
        )

    def test_workflow_extracts_last_tailwind_assignment_and_revalidates_cache(self):
        workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text(
            encoding="utf-8"
        )
        awk_line = next(
            line
            for line in workflow.splitlines()
            if "version=\"$(awk '" in line
        )
        awk_program = awk_line.split("awk '", 1)[1].split("' Makefile", 1)[0]

        with tempfile.TemporaryDirectory() as temp_dir:
            makefile_path = Path(temp_dir) / "Makefile"
            makefile_path.write_text(
                "TAILWIND_VERSION = v1.0.0\n"
                "TAILWIND_VERSION := v2.0.0\n",
                encoding="utf-8",
            )
            result = subprocess.run(
                ["awk", awk_program, str(makefile_path)],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "v2.0.0")
        self.assertIn("./tailwindcss --help", workflow)
        self.assertIn("rm -f ./tailwindcss", workflow)
        self.assertIn("make install-tailwind", workflow)
        self.assertGreaterEqual(workflow.count("validate_tailwind"), 3)


if __name__ == "__main__":
    unittest.main()
