import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
CONTRACT = ROOT / "theme-contract.json"

BASE_WITH_PIXELS = """<html><body>
    {% block side_cart %}{% include 'partials/side_cart.html' %}{% endblock side_cart %}

    {% block pixels %}
        {% pixels %}
    {% endblock pixels %}

    {% block scripts %}{% endblock scripts %}
</body></html>
"""


def run_checker(*arguments, cwd=ROOT):
    return subprocess.run(
        [sys.executable, str(SCRIPTS / "check-theme-contract.py"), *map(str, arguments)],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )


def write_theme(root, base_html, extra=None):
    """Lay out a minimal derived theme: base layout plus one of each directory."""
    (root / "layouts").mkdir(parents=True, exist_ok=True)
    (root / "templates").mkdir(parents=True, exist_ok=True)
    (root / "partials").mkdir(parents=True, exist_ok=True)
    (root / "layouts" / "base.html").write_text(base_html, encoding="utf-8")
    (root / "templates" / "index.html").write_text(
        (extra or "<p>index</p>"), encoding="utf-8"
    )
    # The runtime hooks the shipped JS resolves by id/attribute, so a stub
    # theme satisfies every requirement except the one a test removes.
    (root / "partials" / "side_cart.html").write_text(
        "<spark-cart-drawer></spark-cart-drawer>", encoding="utf-8"
    )
    (root / "partials" / "header.html").write_text(
        '<button data-toggle="mobile-nav"></button><span id="cart-badge"></span>',
        encoding="utf-8",
    )
    (root / "partials" / "mobile_menu.html").write_text(
        '<div id="mobile-nav"></div>', encoding="utf-8"
    )


class ContractFileTests(unittest.TestCase):
    def test_contract_declares_the_pixels_requirement(self):
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        ids = {requirement["id"] for requirement in contract["requirements"]}

        self.assertIn("pixels", ids)

    def test_contract_declares_the_runtime_hooks_the_js_resolves(self):
        # A negative control showed deleting id="cart-badge" passes every
        # other gate and fails only in the browser.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        needles = {requirement["must_contain"] for requirement in contract["requirements"]}

        for hook in (
            'id="cart-badge"',
            'data-toggle="mobile-nav"',
            'id="mobile-nav"',
            "<spark-cart-drawer",
        ):
            self.assertIn(hook, needles)

    def test_every_requirement_carries_an_explanation(self):
        # The failure message is the whole point: whoever trips this gate is
        # usually not the person who knows what the tag does.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))

        for requirement in contract["requirements"]:
            for field in ("id", "file", "must_contain", "why"):
                self.assertTrue(requirement.get(field), requirement)


class ThemeContractGateTests(unittest.TestCase):
    def test_spark_itself_satisfies_its_own_contract(self):
        result = run_checker()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Theme contract gate passed", result.stdout)

    def test_missing_tag_fails_with_the_reason(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, "<html><body>{% block scripts %}{% endblock %}</body></html>")

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)
        self.assertIn("Why it matters", result.stderr)

    def test_missing_runtime_hook_fails_naming_the_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            (root / "partials" / "header.html").write_text(
                '<button data-toggle="mobile-nav"></button>', encoding="utf-8"
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("[cart-badge]", result.stderr)
        self.assertIn('partials/header.html does not contain id="cart-badge"', result.stderr)
        self.assertNotIn("[mobile-nav-toggle]", result.stderr)

    def test_commented_out_tag_does_not_satisfy_the_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, "<html><body>{# {% pixels %} #}</body></html>")

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)

    def test_child_override_that_drops_the_tag_fails(self):
        # The tag is present in the base layout, so a text search passes while
        # every page this template renders is missing the frames.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(
                root,
                BASE_WITH_PIXELS,
                extra="{% block pixels %}{% endblock pixels %}",
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("overrides block 'pixels'", result.stderr)

    def test_child_override_that_keeps_the_tag_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(
                root,
                BASE_WITH_PIXELS,
                extra="{% block pixels %}{% pixels %}{% endblock pixels %}",
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_empty_theme_fails_rather_than_reporting_success(self):
        # A gate that passes when it read nothing is worse than no gate.
        with tempfile.TemporaryDirectory() as tmp:
            result = run_checker("--root", tmp, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("nothing was actually checked", result.stderr)

    def test_remote_mode_requires_credentials(self):
        result = run_checker(
            "--store", "https://example.29next.store", "--theme-id", "1",
            "--apikey", "",
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("required to check a live theme", result.stderr)

    def test_default_contract_is_sparks_own_not_the_checked_theme(self):
        # A derived theme carries no contract of its own, and remote mode has
        # no local theme at all. Defaulting to the theme directory made the
        # gate unusable in exactly the case it exists for.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, "<html><body>{% block scripts %}{% endblock %}</body></html>")

            result = run_checker("--root", root)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)

    def test_unreadable_contract_fails(self):
        result = run_checker("--contract", ROOT / "does-not-exist.json")

        self.assertEqual(result.returncode, 1)
        self.assertIn("Theme contract gate failed", result.stderr)


if __name__ == "__main__":
    unittest.main()
