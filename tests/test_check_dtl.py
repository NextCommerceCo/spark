"""Tests for scripts/check-dtl.py, the Django template parse gate."""

import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "check-dtl.py"

spec = importlib.util.spec_from_file_location("check_dtl", SCRIPT)
check_dtl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_dtl)

try:
    import django  # noqa: F401

    HAVE_DJANGO = True
except ImportError:
    HAVE_DJANGO = False


class InventoryShape(unittest.TestCase):
    """Runs without Django: the inventory file stays well formed."""

    def test_every_entry_is_valid(self):
        inventory = check_dtl.load_inventory()
        self.assertEqual(set(inventory), {"tags", "filters"})
        for name, entry in inventory["tags"].items():
            with self.subTest(tag=name):
                self.assertIn(entry["kind"], {"simple", "block", "tag"})
                self.assertTrue(entry["library"].isidentifier())
                if entry["kind"] == "simple":
                    compile(check_dtl._simple_tag_source(name, entry), name, "exec")
                if entry["kind"] == "block":
                    self.assertTrue(entry["parse_until"])
        for name, entry in inventory["filters"].items():
            with self.subTest(filter=name):
                self.assertIn(entry["arg"], {"none", "required", "optional"})

    def test_platform_tags_spark_uses_are_inventoried(self):
        inventory = check_dtl.load_inventory()
        for name in (
            "t",
            "app_hook",
            "image_thumbnail",
            "purchase_info_for_product",
            "purchase_info_for_line",
            "seo",
            "add_query_param",
            "pixels",
            "cart_form",
        ):
            self.assertIn(name, inventory["tags"])
        for name in ("currency", "asset_url", "times", "is_review_permitted"):
            self.assertIn(name, inventory["filters"])

    def test_missing_django_skips_unless_required(self):
        if HAVE_DJANGO:
            self.skipTest("Django is installed")
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(check_dtl.main([]), 0)
            self.assertEqual(check_dtl.main(["--require"]), 1)


@unittest.skipUnless(HAVE_DJANGO, 'needs Django: pip install "django==4.2.*"')
class ParseGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = check_dtl.build_engine(check_dtl.load_inventory())

    def check_source(self, source):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "partials").mkdir()
            (root / "partials" / "probe.html").write_text(source, encoding="utf-8")
            _, failures = check_dtl.check(root, self.engine)
        return failures

    def assertParses(self, source):
        self.assertEqual(self.check_source(source), [])

    def assertRejects(self, source, fragment):
        failures = self.check_source(source)
        self.assertEqual(len(failures), 1, failures)
        self.assertIn(fragment, failures[0])
        self.assertTrue(failures[0].startswith("partials/probe.html:"))

    def test_spark_templates_parse(self):
        files, failures = check_dtl.check(ROOT, self.engine)
        self.assertGreater(len(files), 50)
        self.assertEqual(failures, [])

    def test_platform_tags_and_filters_parse(self):
        self.assertParses(
            '{% load theme_tags %}{% t "a.b" as label %}{% app_hook "global_footer" %}'
            "{% purchase_info_for_product request product as session %}"
            '{{ price|currency:"USD" }}{{ "x.js"|asset_url }}{{ n|times:2 }}'
            '{% blocktrans %}x{% endblocktrans %}{{ 3|intcomma }}'
        )

    def test_unclosed_block(self):
        self.assertRejects("{% if a %}<p>", "Unclosed tag")

    def test_stray_end_tag(self):
        self.assertRejects("{% if a %}{% endif %}{% endfor %}", "endfor")

    def test_unknown_tag(self):
        self.assertRejects("{% purchase_info request product %}", "purchase_info")

    def test_unknown_filter(self):
        self.assertRejects("{{ price|curency }}", "curency")

    def test_unknown_library(self):
        self.assertRejects("{% load shopify_tags %}", "shopify_tags")

    def test_filter_argument_count(self):
        self.assertRejects("{{ n|times }}", "times")
        self.assertRejects('{{ "x.js"|asset_url:"y" }}', "asset_url")

    def test_simple_tag_argument_count(self):
        self.assertRejects("{% purchase_info_for_product request %}", "purchase_info_for_product")
        self.assertRejects("{% pixels extra %}", "pixels")

    def test_extends_must_come_first(self):
        self.assertRejects('{% if a %}{% endif %}{% extends "layouts/base.html" %}', "extends")

    def test_error_line_is_reported(self):
        failures = self.check_source("<p>\n</p>\n{% endif %}")
        self.assertTrue(failures[0].startswith("partials/probe.html:3:"), failures)

    def test_main_reports_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "templates").mkdir()
            (root / "templates" / "bad.html").write_text("{% if %}", encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(check_dtl.main(["--root", str(root)]), 1)
                (root / "templates" / "bad.html").write_text("ok", encoding="utf-8")
                self.assertEqual(check_dtl.main(["--root", str(root)]), 0)


if __name__ == "__main__":
    unittest.main()
