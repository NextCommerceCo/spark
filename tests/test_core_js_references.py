import re
import shutil
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIRS = ("templates", "partials", "layouts")
NODE_TEST = ROOT / "tests" / "js" / "spark-cart-formset.test.js"

# Spark does not load the platform's core_js, so window.core and window.funnel
# are undefined on the storefront. A template that calls into either throws at
# runtime and whatever it was meant to wire up silently does nothing.
CORE_JS_TAG = re.compile(r"{%\s*core_js\b")
CORE_JS_CALL = re.compile(r"(?<![\w.$])(?:window\.)?(?:core|funnel)\.[A-Za-z_$][\w$.]*\s*\(")


def template_paths():
    for directory in TEMPLATE_DIRS:
        yield from sorted((ROOT / directory).rglob("*.html"))


def violations(pattern):
    found = []
    for path in template_paths():
        lines = path.read_text(encoding="utf-8").splitlines()
        for number, line in enumerate(lines, start=1):
            if pattern.search(line):
                found.append(f"{path.relative_to(ROOT)}:{number}: {line.strip()}")
    return found


class CoreJsReferenceTests(unittest.TestCase):
    def test_pattern_catches_the_calls_core_js_exposed(self):
        for line in (
            "core.cart.init();",
            "    window.core.cart.init()",
            "if (x) { funnel.basket.init(); }",
        ):
            self.assertRegex(line, CORE_JS_CALL)

        for line in (
            "hardcore.thing()",
            "store.core.thing()",
            "A core. Sentence (in prose)",
        ):
            self.assertNotRegex(line, CORE_JS_CALL)

    def test_templates_do_not_load_core_js(self):
        self.assertEqual(violations(CORE_JS_TAG), [])

    def test_templates_do_not_call_core_js_globals(self):
        self.assertEqual(violations(CORE_JS_CALL), [])

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
