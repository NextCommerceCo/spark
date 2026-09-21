import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
FIXTURES = ROOT / "tests" / "fixtures" / "ci_gates"


def run_checker(script_name, *arguments, cwd=ROOT):
    return subprocess.run(
        [sys.executable, str(SCRIPTS / script_name), *map(str, arguments)],
        cwd=cwd,
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
                        {
                            "name": "missing_name",
                            "type": "select",
                            "options": [{"value": "choice"}],
                        },
                        {
                            "name": "non_string_name",
                            "type": "radio",
                            "options": [{"name": 1, "value": "choice"}],
                        },
                        {
                            "name": "duplicate_values",
                            "type": "select",
                            "options": [
                                {"name": "First", "value": "same"},
                                {"name": "Second", "value": "same"},
                            ],
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
                "empty_options": "",
                "missing_value": "",
                "missing_name": "",
                "non_string_name": "",
                "duplicate_values": "",
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
        self.assertIn("[schema-options] 'missing_name'", result.stderr)
        self.assertIn("[schema-options] 'non_string_name'", result.stderr)
        self.assertIn(
            "[schema-options] 'duplicate_values': option values must be unique",
            result.stderr,
        )

    def test_unknown_schema_type_is_reported_without_default_or_data(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {"name": "future_setting", "type": "future_type"},
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text("future_setting\n", encoding="utf-8")

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
        self.assertIn(
            "[schema-type] 'future_setting': unsupported schema type "
            "'future_type'",
            result.stderr,
        )

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
                            "step": 1,
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

    def test_range_schema_requires_valid_min_max_and_step(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            schema = {
                "General": {
                    "Settings": [
                        {"name": "main_menu", "type": "menu"},
                        {"name": "footer_menu", "type": "menu"},
                        {"name": "missing_fields", "type": "range"},
                        {
                            "name": "equal_bounds",
                            "type": "range",
                            "min": 5,
                            "max": 5,
                            "step": 1,
                        },
                        {
                            "name": "invalid_step",
                            "type": "range",
                            "min": 0,
                            "max": 10,
                            "step": 0,
                        },
                        {
                            "name": "non_finite_fields",
                            "type": "range",
                            "min": float("-inf"),
                            "max": float("inf"),
                            "step": float("nan"),
                        },
                    ]
                }
            }
            data = {
                "main_menu": "main",
                "footer_menu": "footer",
            }
            schema_path = fixture_dir / "schema.json"
            data_path = fixture_dir / "data.json"
            optional_path = fixture_dir / "optional.txt"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            data_path.write_text(json.dumps(data), encoding="utf-8")
            optional_path.write_text(
                "missing_fields\n"
                "equal_bounds\n"
                "invalid_step\n"
                "non_finite_fields\n",
                encoding="utf-8",
            )

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
        self.assertIn(
            "[schema-range] 'missing_fields': min must be a finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'missing_fields': max must be a finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'missing_fields': step must be a positive "
            "finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'equal_bounds': min must be less than max",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'invalid_step': step must be a positive "
            "finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'non_finite_fields': min must be a finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'non_finite_fields': max must be a finite number",
            result.stderr,
        )
        self.assertIn(
            "[schema-range] 'non_finite_fields': step must be a positive "
            "finite number",
            result.stderr,
        )


class TemplateIntegrityGateTests(unittest.TestCase):
    def test_real_repo_passes(self):
        result = run_checker("check-templates.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)
        self.assertIn("skipped 0 include tag(s)", result.stdout)

    def test_backslash_escape_in_filter_argument_fails_naming_the_line(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "steps.html").write_text(
                "<ul>\n"
                "{% for item in settings.step_list|split:\"\\n\" %}\n"
                "<li>{{ item }}</li>\n"
                "{% endfor %}\n"
                "</ul>\n",
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
        self.assertIn("[escape-in-filter-argument]", result.stderr)
        self.assertIn("steps.html:2", result.stderr)
        self.assertIn('split:"\\n"', result.stderr)
        self.assertIn('|linebreaksbr|split:"<br>"', result.stderr)

    def test_linebreaksbr_split_form_and_supported_escapes_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "steps.html").write_text(
                "{% for item in settings.step_list|linebreaksbr"
                "|split:\"<br>\" %}\n"
                "<li>{{ item|striptags }}</li>\n"
                "{% endfor %}\n"
                "{{ value|default:\"a \\\" quote and a \\\\ backslash\" }}\n"
                "<p>Not a template literal: C:\\new\\path stays untouched</p>\n",
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

    def test_escaped_other_quote_is_not_a_supported_escape(self):
        # Django unescapes only the DELIMITING quote, so \' inside a
        # double-quoted literal reaches the filter as two literal characters.
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "quotes.html").write_text(
                "{{ settings.notice|split:\"\\'\" }}\n",
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
        self.assertIn("[escape-in-filter-argument]", result.stderr)
        self.assertIn("quotes.html:1", result.stderr)
        self.assertIn("split:\"\\'\"", result.stderr)

    def test_escape_after_an_escaped_quote_is_still_detected(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "quoted.html").write_text(
                "{{ settings.notice|split:\"\\\"foo\\nbar\" }}\n",
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
        self.assertIn("[escape-in-filter-argument]", result.stderr)
        self.assertIn("quoted.html:1", result.stderr)
        self.assertIn('split:"\\n"', result.stderr)

    def test_escape_gate_covers_variable_expressions_and_ignores_comments(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "mixed.html").write_text(
                "{{ settings.notice|split:\"\\t\"|first }}\n"
                "{# {{ settings.notice|split:\"\\n\" }} #}\n"
                "{% comment %}{{ x|split:\"\\n\" }}{% endcomment %}\n",
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
        self.assertIn("with 1 violation(s)", result.stderr)
        self.assertIn("mixed.html:1", result.stderr)
        self.assertIn('split:"\\t"', result.stderr)

    def test_cart_add_rejects_a_bare_parent_product_pk(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "product.html").write_text(
                "<form action=\"{% url 'cart:add' pk=product.pk %}\">\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("cart:add\n", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[cart-product-id]", result.stderr)
        self.assertIn("purchasable child PK", result.stderr)

    def test_cart_add_gate_ignores_resolved_product_expressions(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "product.html").write_text(
                "{% url 'cart:add' pk=other_product.pk %}\n"
                "{% url 'cart:add' pk=gift_product.children.first.pk %}\n"
                "{% url 'cart:add' pk=child.pk source=product.pk %}\n",
                encoding="utf-8",
            )
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("cart:add\n", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--root",
                fixture_dir,
                "--allowlist",
                allowlist_path,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)

    def test_unknown_cart_url_reports_only_the_allowlist_violation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "product.html").write_text(
                "{% url 'cart:add' pk=product.pk %}\n",
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
        self.assertIn("with 1 violation(s)", result.stderr)
        self.assertIn("[url-name]", result.stderr)
        self.assertNotIn("[cart-product-id]", result.stderr)

    def test_pdp_cart_paths_share_the_resolved_purchasable_pk(self):
        product_template = (
            ROOT / "templates" / "catalogue" / "product.html"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "{% firstof product.children.first.pk product.pk as atc_pk %}",
            product_template,
        )
        self.assertIn('product-id="{{ atc_pk }}"', product_template)
        self.assertIn("{% url 'cart:add' pk=atc_pk %}", product_template)

    def test_preview_asset_is_only_loaded_during_a_preview_session(self):
        base_template = (ROOT / "layouts" / "base.html").read_text(
            encoding="utf-8"
        )
        preview_block = base_template.split(
            "{% block preview_indicator %}", 1
        )[1].split("{% endblock preview_indicator %}", 1)[0]

        condition = preview_block.index("{% if request.COOKIES.preview_theme %}")
        asset = preview_block.index("'js/spark-preview.js'|asset_url")
        end_condition = preview_block.index("{% endif %}")
        self.assertLess(condition, asset)
        self.assertLess(asset, end_condition)

    def test_default_scan_rejects_unbalanced_required_base_blocks(self):
        original = (ROOT / "layouts" / "base.html").read_text(encoding="utf-8")
        closing_tag = "{% endblock preview_indicator %}"
        variants = {
            "missing": original.replace(closing_tag, "", 1),
            "misnamed": original.replace(
                closing_tag, "{% endblock wrong_name %}", 1
            ),
        }

        for label, base_text in variants.items():
            with (
                self.subTest(label=label),
                tempfile.TemporaryDirectory() as temp_dir,
            ):
                fixture_dir = Path(temp_dir)
                for directory, filename in (
                    ("templates", "index.html"),
                    ("partials", "card.html"),
                ):
                    directory_path = fixture_dir / directory
                    directory_path.mkdir()
                    (directory_path / filename).write_text("", encoding="utf-8")
                layouts_dir = fixture_dir / "layouts"
                layouts_dir.mkdir()
                (layouts_dir / "base.html").write_text(
                    base_text, encoding="utf-8"
                )

                result = run_checker(
                    "check-templates.py",
                    "--allowlist",
                    ROOT / "scripts" / "url-name-allowlist.txt",
                    cwd=fixture_dir,
                )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("[block-structure] layouts/base.html", result.stderr)
            self.assertIn("preview_indicator", result.stderr)

    def test_block_structure_is_checked_in_every_template(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{% block content %}Broken{% endblock wrong_name %}\n",
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
        self.assertIn("[block-structure] templates/index.html", result.stderr)
        self.assertIn("closes as 'wrong_name'", result.stderr)

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

    def test_unterminated_inline_comment_does_not_hide_a_later_include(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            templates_dir = fixture_dir / "templates"
            templates_dir.mkdir()
            (templates_dir / "index.html").write_text(
                "{# unterminated inline comment\n"
                "{% include 'partials/missing.html' %}\n"
                "#}\n",
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

    def test_default_scan_requires_layouts_base(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            for directory, filename in (
                ("layouts", "alternate.html"),
                ("templates", "index.html"),
                ("partials", "card.html"),
            ):
                directory_path = fixture_dir / directory
                directory_path.mkdir()
                (directory_path / filename).write_text("", encoding="utf-8")
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--allowlist",
                allowlist_path,
                cwd=fixture_dir,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("layouts/base.html", result.stderr)

    def test_default_scan_requires_html_in_each_template_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            fixture_dir = Path(temp_dir)
            layouts_dir = fixture_dir / "layouts"
            layouts_dir.mkdir()
            (layouts_dir / "base.html").write_text("", encoding="utf-8")
            allowlist_path = fixture_dir / "allowlist.txt"
            allowlist_path.write_text("", encoding="utf-8")

            result = run_checker(
                "check-templates.py",
                "--allowlist",
                allowlist_path,
                cwd=fixture_dir,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("templates/", result.stderr)
        self.assertIn("partials/", result.stderr)


def run_template_fixture(files, allowlist=""):
    """Run check-templates.py over an ad-hoc template root."""
    with tempfile.TemporaryDirectory() as temp_dir:
        fixture_dir = Path(temp_dir)
        for relative_path, content in files.items():
            path = fixture_dir / relative_path
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
        allowlist_path = fixture_dir / "allowlist.txt"
        allowlist_path.write_text(allowlist, encoding="utf-8")
        return run_checker(
            "check-templates.py",
            "--root",
            fixture_dir,
            "--allowlist",
            allowlist_path,
        )


class TemplateContractGateTests(unittest.TestCase):
    """The prose contract rules from issue #51, item 3, as gates."""

    # (a) settings.* as a filter argument

    def test_real_repo_has_no_settings_filter_argument(self):
        result = run_checker("check-templates.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("[settings-filter-argument]", result.stderr)

    def test_settings_as_default_filter_argument_fails_naming_the_line(self):
        # The exact shape of the side_cart defect this gate was written for.
        result = run_template_fixture({
            "partials/side_cart.html": (
                "<spark-cart-drawer\n"
                "    data-currency=\"{{ request.CURRENCY_CODE|default:'USD' }}\"\n"
                "    {% if settings.gift_product %}data-gift-product-id=\""
                "{{ settings.gift_product.children.first.pk"
                "|default:settings.gift_product.pk }}\"{% endif %}\n"
                ">\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[settings-filter-argument]", result.stderr)
        self.assertIn("side_cart.html:3", result.stderr)
        self.assertIn("default:settings.gift_product.pk", result.stderr)

    def test_settings_as_filter_argument_is_caught_in_block_tags_too(self):
        result = run_template_fixture({
            "templates/index.html": (
                "{% for item in items|slice:settings.item_limit %}{{ item }}{% endfor %}\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[settings-filter-argument]", result.stderr)
        self.assertIn("index.html:1", result.stderr)
        self.assertIn("slice:settings.item_limit", result.stderr)

    def test_settings_on_the_left_of_a_filter_and_bound_names_pass(self):
        result = run_template_fixture({
            "partials/side_cart.html": (
                "{% with gift=settings.gift_product %}\n"
                "data-gift-product-id=\"{% firstof gift.children.first.pk gift.pk %}\"\n"
                "{% endwith %}\n"
                "{{ settings.on_sale_header|default:default_on_sale }}\n"
                "{# {{ x|default:settings.commented_out }} #}\n"
            ),
        })

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)

    def test_settings_inside_a_quoted_filter_argument_is_text_not_a_lookup(self):
        result = run_template_fixture({
            "templates/index.html": (
                "{{ note|default:'see settings.foo in the docs' }}\n"
                "{% if label|default:\"settings.bar\" %}x{% endif %}\n"
            ),
        })

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("[settings-filter-argument]", result.stderr)

    # (b) firstof ... as X selecting an object

    def test_real_repo_has_no_firstof_object_selection(self):
        result = run_checker("check-templates.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("[firstof-object]", result.stderr)

    def test_firstof_target_passed_to_purchase_info_fails_naming_both_lines(self):
        result = run_template_fixture({
            "partials/section_featured_product.html": (
                "{% firstof settings.featured_product product as featured %}\n"
                "<div>\n"
                "{% purchase_info_for_product request featured as session %}\n"
                "</div>\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[firstof-object]", result.stderr)
        self.assertIn("section_featured_product.html:3", result.stderr)
        self.assertIn("on line 1", result.stderr)
        self.assertIn("always yields a string", result.stderr)

    def test_dot_access_on_a_firstof_target_is_still_flagged(self):
        # firstof yields a string, so featured.children.first on it resolves
        # to nothing; the dot-access does not prove an object.
        result = run_template_fixture({
            "partials/featured.html": (
                "{% firstof settings.pick product as featured %}\n"
                "{% purchase_info_for_product request featured.children.first as session %}\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[firstof-object]", result.stderr)
        self.assertIn("featured.html:2", result.stderr)

    def test_firstof_without_as_does_not_claim_the_next_tags_binding(self):
        result = run_template_fixture({
            "partials/featured.html": (
                "{% firstof product.title product.slug %}\n"
                "{% with settings.featured_product as featured %}\n"
                "{% purchase_info_for_product request featured as session %}\n"
                "{% endwith %}\n"
            ),
        })

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("[firstof-object]", result.stderr)

    def test_rebinding_the_name_to_an_object_shadows_the_firstof_string(self):
        # The recommended remedy: rebind the object, then call. After the
        # block closes the name is the firstof string again.
        result = run_template_fixture({
            "partials/featured.html": (
                "{% purchase_info_for_product request featured as before %}\n"
                "{% firstof settings.pick.pk product.pk as featured %}\n"
                "{% with featured=settings.featured_product %}\n"
                "{% purchase_info_for_product request featured as session %}\n"
                "{% endwith %}\n"
                "{% purchase_info_for_product request featured as after %}\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("featured.html:6", result.stderr)
        self.assertNotIn("featured.html:1", result.stderr)
        self.assertNotIn("featured.html:4", result.stderr)

    def test_firstof_for_a_pk_and_object_selected_with_if_pass(self):
        result = run_template_fixture({
            "templates/catalogue/product.html": (
                "{% purchase_info_for_product request product as session %}\n"
                "{% firstof product.children.first.pk product.pk as atc_pk %}\n"
                "{% if settings.featured_product %}"
                "{% with featured=settings.featured_product %}\n"
                "{% purchase_info_for_product request featured as session %}\n"
                "{% endwith %}{% endif %}\n"
            ),
        })

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)

    # (c) hardcoded /products/ routes

    def test_real_repo_has_no_hardcoded_product_routes(self):
        result = run_checker("check-templates.py")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("[hardcoded-route]", result.stderr)

    def test_hardcoded_product_route_fails_naming_the_line(self):
        result = run_template_fixture({
            "partials/product_card.html": (
                "<div>\n"
                "<a href=\"/products/{{ product.slug }}/\">{{ product.title }}</a>\n"
                "<form action='/products/{{ product.pk }}/add/'></form>\n"
                "</div>\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[hardcoded-route]", result.stderr)
        self.assertIn("product_card.html:2", result.stderr)
        self.assertIn("product_card.html:3", result.stderr)
        self.assertIn("get_absolute_url", result.stderr)

    def test_other_platform_route_literals_fail_too(self):
        result = run_template_fixture({
            "partials/header.html": (
                "<a href=\"/cart/\">Cart</a>\n"
                "<form action='/checkout/'></form>\n"
                "<a href=\"/accounts/\">Account</a>\n"
                "<a href=\"/catalogue/category/sale/\">Sale</a>\n"
                "<a href=\"/collections/all/\">A foreign reflex that 404s here</a>\n"
                "<a href=\"/about/\">A store page is not a platform route</a>\n"
                "<a href=\"/support/categories/\">Help</a>\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        for line in ("header.html:1", "header.html:2", "header.html:3",
                     "header.html:4", "header.html:5", "header.html:7"):
            self.assertIn(line, result.stderr)
        self.assertNotIn("header.html:6", result.stderr)
        # The message lists the roots once each with no doubled slash.
        self.assertIn("/catalogue/, /cart/, /checkout/", result.stderr)
        self.assertIn("/account/ path.", result.stderr)
        self.assertNotIn("// path.", result.stderr)

    def test_external_urls_containing_a_route_word_pass(self):
        result = run_template_fixture({
            "partials/footer.html": (
                "<a href=\"https://docs.example.com/products/widget/\">Docs</a>\n"
                "<a href=\"//cdn.example.com/cart/icon.svg\">Icon</a>\n"
                "<a href=\"/products/widget/\">local, still wrong</a>\n"
            ),
        })

        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("footer.html:1", result.stderr)
        self.assertNotIn("footer.html:2", result.stderr)
        self.assertIn("footer.html:3", result.stderr)

    def test_url_tag_and_get_absolute_url_routes_pass(self):
        result = run_template_fixture({
            "partials/product_card.html": (
                "<a href=\"{{ product.get_absolute_url }}\">{{ product.title }}</a>\n"
                "<form action=\"{% url 'cart:add' pk=child.pk %}\"></form>\n"
                "{# <a href=\"/products/legacy/\">commented out</a> #}\n"
            ),
        }, allowlist="cart:add\n")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Template integrity gate passed", result.stdout)


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
