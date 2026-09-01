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

    def test_check_mode_rejects_mixed_unit_min(self):
        with tempfile.NamedTemporaryFile("w", suffix=".css", delete=False) as css_file:
            css_file.write(".a{width:min(100%,390px)}")
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
        self.assertIn("min()/max()/clamp()", result.stderr)

    def test_check_mode_rejects_clamp_and_max(self):
        with tempfile.NamedTemporaryFile("w", suffix=".css", delete=False) as css_file:
            css_file.write(".a{font-size:clamp(1rem,2vw,2rem)} .b{height:max(10vh,80px)}")
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
        self.assertIn("min()/max()/clamp()", result.stderr)

    def test_minmax_grid_tracks_are_not_flagged(self):
        self.assertEqual(
            sass_compat.find_unsupported_constructs(
                ".g{grid-template-columns:repeat(4,minmax(0,1fr))}"
            ),
            [],
        )

    def test_check_mode_rejects_sass_builtin_filter_functions(self):
        with tempfile.NamedTemporaryFile("w", suffix=".css", delete=False) as css_file:
            css_file.write(".logo{filter:brightness(0) invert(1)}")
            path = css_file.name

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", path],
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("sass-builtin-as-css-function", result.stderr)
        self.assertIn("brightness()", result.stderr)

    def test_check_mode_accepts_non_colliding_filter_functions(self):
        with tempfile.NamedTemporaryFile("w", suffix=".css", delete=False) as css_file:
            css_file.write(".logo{filter:contrast(0) brightness(10)}")
            path = css_file.name

        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check", path],
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_every_sass_builtin_name_is_covered(self):
        for name in (
            "invert", "saturate", "grayscale", "opacity",
            "lighten", "darken", "complement", "desaturate",
        ):
            with self.subTest(name=name):
                issues = sass_compat.find_unsupported_constructs(
                    ".a{filter:%s(1)}" % name
                )
                self.assertEqual(
                    [issue["name"] for issue in issues],
                    ["sass-builtin-as-css-function"],
                )

    def test_custom_property_values_are_exempt(self):
        # Sass does not evaluate a custom property's value, so Tailwind's own
        # filter variables are not a compile hazard and must not be flagged.
        css = ".grayscale{--tw-grayscale:grayscale(100%);filter:var(--tw-grayscale,)}"

        self.assertEqual(sass_compat.find_unsupported_constructs(css), [])

    def test_builtin_name_inside_a_longer_identifier_is_not_flagged(self):
        css = ".a{filter:var(--brand-invert)}.b{background:url(no-invert(1).png)}"

        self.assertEqual(sass_compat.find_unsupported_constructs(css), [])

    def test_generated_main_css_has_no_banned_constructs(self):
        css = (ROOT / "assets" / "main.css").read_text()

        self.assertEqual(sass_compat.find_unsupported_constructs(css), [])


if __name__ == "__main__":
    unittest.main()
