"""Prove that only theme markup feeds the Tailwind content scan.

Tailwind v4 scans every non-ignored file unless told otherwise, so prose that
happens to spell a utility name compiles that utility into assets/main.css.
Spark hit this in 7e6f446 (#52), where a Python comment containing "truncate"
had to be reworded to get the CSS drift gate green. Rewording prose does not
scale: css/input.css now opens with `source(none)` plus an explicit source list,
and these tests pin that behaviour.

The negative control drops a utility token into docs/ and scripts/ and asserts
it does not reach the compiled CSS. On its own that assertion is untrustworthy —
it also passes if the compile silently produced nothing — so the positive
control writes the same token into templates/ and asserts it DOES compile.
Only the pair distinguishes "the guard works" from "the test is blind".
"""

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_CSS = ROOT / "css" / "input.css"
TAILWIND = ROOT / "tailwindcss"

# A utility that is valid, cheap to compile, and used nowhere in the theme, so
# its presence in the output can only come from the file the test planted.
PROBE_CLASS = "pt-73"
PROBE_TEXT = f'<div class="{PROBE_CLASS}">source guard probe</div>'

# Directories whose contents legitimately carry class names. Kept in sync with
# the @source list in css/input.css by test_source_list_is_exactly.
EXPECTED_SOURCES = ("../templates", "../partials", "../layouts", "../assets/js")


def compile_css():
    """Compile css/input.css to a temporary file and return its text.

    Never writes to assets/main.css: the committed artifact is the drift gate's
    baseline, and a test that rebuilt it in place would mask real drift.
    """
    if not TAILWIND.exists():
        raise AssertionError(
            f"{TAILWIND} is missing. Run `make install-tailwind` — this test "
            "compiles CSS and cannot fall back to a skip without silently "
            "retiring the source guard."
        )

    with tempfile.TemporaryDirectory(prefix="spark-source-guard-") as temp_dir:
        output = Path(temp_dir) / "probe.css"
        result = subprocess.run(
            [str(TAILWIND), "-i", str(INPUT_CSS), "-o", str(output), "--minify"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise AssertionError(
                "Tailwind compilation failed:\n"
                f"{result.stdout}\n{result.stderr}"
            )
        return output.read_text(encoding="utf-8")


def compile_with_probe_in(directory, suffix):
    """Plant the probe token in `directory`, compile, and clean up."""
    target = ROOT / directory
    handle = tempfile.NamedTemporaryFile(
        mode="w",
        suffix=suffix,
        prefix="source_guard_probe_",
        dir=target,
        delete=False,
        encoding="utf-8",
    )
    probe_path = Path(handle.name)
    try:
        handle.write(PROBE_TEXT + "\n")
        handle.close()
        return compile_css()
    finally:
        probe_path.unlink(missing_ok=True)


class TailwindSourceGuard(unittest.TestCase):
    def test_probe_in_docs_does_not_reach_compiled_css(self):
        """Negative control: markdown prose must not generate utilities."""
        css = compile_with_probe_in("docs", ".md")
        self.assertNotIn(
            PROBE_CLASS,
            css,
            "A class token written into docs/ compiled into the CSS. The "
            "source(none) guard in css/input.css is not holding.",
        )

    def test_probe_in_scripts_does_not_reach_compiled_css(self):
        """Negative control: tooling source and comments are not content."""
        css = compile_with_probe_in("scripts", ".py")
        self.assertNotIn(
            PROBE_CLASS,
            css,
            "A class token written into scripts/ compiled into the CSS. The "
            "source(none) guard in css/input.css is not holding.",
        )

    def test_probe_in_tests_does_not_reach_compiled_css(self):
        """Negative control: fixtures and assertions are not content either."""
        css = compile_with_probe_in("tests", ".py")
        self.assertNotIn(
            PROBE_CLASS,
            css,
            "A class token written into tests/ compiled into the CSS. The "
            "source(none) guard in css/input.css is not holding.",
        )

    def test_probe_in_templates_does_reach_compiled_css(self):
        """Positive control: without this, the assertions above prove nothing.

        If the scan set were empty or the compile were failing open, the three
        negative controls would pass for the wrong reason. This asserts the same
        probe in a scanned directory still compiles, so an absence measured
        above is a real exclusion rather than a blind test.
        """
        css = compile_with_probe_in("templates", ".html")
        self.assertIn(
            PROBE_CLASS,
            css,
            "A class token written into templates/ did NOT compile. The "
            "@source list is too narrow and real markup is being missed.",
        )

    def test_auto_detection_is_disabled(self):
        text = INPUT_CSS.read_text(encoding="utf-8")
        self.assertRegex(
            text,
            r'@import\s+"tailwindcss"\s+source\(none\)\s*;',
            'css/input.css must import Tailwind with source(none). A bare '
            '@import re-enables scanning of every non-ignored file, and the '
            "@source lines below it become additions rather than the whole set.",
        )

    def test_source_list_is_exactly(self):
        """Pin the scan set so widening or narrowing it is a reviewed change."""
        text = INPUT_CSS.read_text(encoding="utf-8")
        declared = tuple(re.findall(r'^@source\s+"([^"]+)"\s*;', text, re.MULTILINE))
        self.assertEqual(
            declared,
            EXPECTED_SOURCES,
            "The @source list in css/input.css changed. Adding a directory is "
            "fine — update EXPECTED_SOURCES in the same commit and rerun "
            "`make release` so assets/main.css reflects the new scan set.",
        )


if __name__ == "__main__":
    unittest.main()
