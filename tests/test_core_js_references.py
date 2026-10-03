import re
import shutil
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIRS = ("templates", "partials", "layouts")
NODE_TEST = ROOT / "tests" / "js" / "spark-cart-formset.test.js"

# Spark does not load the platform's core_js, so window.core and window.funnel
# are undefined on the storefront. A template that reaches into either throws at
# runtime and whatever it was meant to wire up silently does nothing. A bare
# property read (core.cart) throws just like a call does, and whitespace is
# allowed before the dot so a chain broken across lines is still caught.
# Raw text is scanned on purpose: a commented-out call fails the gate too, so
# dead references are removed instead of parked in a comment.
CORE_JS_TAG = re.compile(r"{%\s*core_js\b")
CORE_JS_REFERENCE = re.compile(r"(?<![\w.$])(?:window\s*\.\s*)?(?:core|funnel)\s*\.[A-Za-z_$]")


def template_paths():
    for directory in TEMPLATE_DIRS:
        yield from sorted((ROOT / directory).rglob("*.html"))


def violations(pattern):
    found = []
    for path in template_paths():
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        for match in pattern.finditer(text):
            number = text.count("\n", 0, match.start()) + 1
            found.append(f"{path.relative_to(ROOT)}:{number}: {lines[number - 1].strip()}")
    return found


class CoreJsReferenceTests(unittest.TestCase):
    def test_pattern_catches_references_to_core_js_globals(self):
        for line in (
            "core.cart.init();",
            "    window.core.cart.init()",
            "if (x) { funnel.basket.init(); }",
            "if (core.cart) {",
            "var basket = funnel.basket;",
            "core\n    .cart.init();",
        ):
            self.assertRegex(line, CORE_JS_REFERENCE)

        for line in (
            "hardcore.thing()",
            "store.core.thing()",
            "A core. Sentence (in prose)",
        ):
            self.assertNotRegex(line, CORE_JS_REFERENCE)

    def test_templates_do_not_load_core_js(self):
        self.assertEqual(violations(CORE_JS_TAG), [])

    def test_templates_do_not_reference_core_js_globals(self):
        self.assertEqual(violations(CORE_JS_REFERENCE), [])

    def test_cart_formset_handler(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is required for cart formset JS tests")

        result = subprocess.run(
            [node, str(NODE_TEST)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
