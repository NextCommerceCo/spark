import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "sass-compat.py"

spec = importlib.util.spec_from_file_location("sass_compat", SCRIPT)
sass_compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sass_compat)


class SassCompatTests(unittest.TestCase):
    def test_known_modern_css_is_transformed(self):
        css = """
        @property --tw-test { syntax: "<color>"; inherits: false; initial-value: #000; }
        @layer components { .card { padding-inline: 1rem; margin-block: 2rem; } }
        :where(.card) { color: oklch(98.4% .003 247.858); }
        @media (width >= 768px) {
          .card { border-radius: 3.40282e38px; max-width: 2e+5px; }
          .pill { border-radius: 1.7e+308px; border-inline: 1px solid red; border-block: 2px solid blue; }
        }
        """

        transformed = sass_compat.transform_css(css)

        self.assertEqual(sass_compat.find_unsupported_constructs(transformed), [])
        self.assertIn("#f8fafc", transformed)
        self.assertIn("padding-left: 1rem", transformed)
        self.assertIn("margin-top: 2rem", transformed)
        self.assertIn("(min-width:768px)", transformed)
        self.assertIn("9999px", transformed)
        self.assertIn("border-left: 1px solid red", transformed)
        self.assertIn("border-top: 2px solid blue", transformed)
        self.assertNotIn("2e+5px", transformed)
        self.assertNotIn("1.7e+308px", transformed)

    def test_check_mode_rejects_unsupported_css_clearly(self):
        with tempfile.NamedTemporaryFile("w", suffix=".css", delete=False) as css_file:
            css_file.write(".bad{color:color-mix(in srgb, red 50%, blue)}")
            css_path = css_file.name

        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--check", css_path],
                capture_output=True,
                text=True,
            )
        finally:
            Path(css_path).unlink(missing_ok=True)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsafe for the platform compiler", result.stderr)
        self.assertIn("color-mix()", result.stderr)

    def test_generated_main_css_has_no_banned_constructs(self):
        css = (ROOT / "assets" / "main.css").read_text()

        self.assertEqual(sass_compat.find_unsupported_constructs(css), [])


if __name__ == "__main__":
    unittest.main()
