"""Pin the default rendering contract for merchant-controlled style tokens.

The tokens exist so merchants can change storefront geometry from Theme
Settings without a source edit. A store on default settings must render
exactly as it did before the tokens were introduced, and that invariant
depends on every @theme fallback equalling the literal it replaced.

These tests pin those fallbacks and the bridge from settings to CSS. A
drive-by change to one must fail here instead of silently restyling every
existing store.
"""

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INPUT_CSS = ROOT / "css" / "input.css"
BASE_LAYOUT = ROOT / "layouts" / "base.html"
SETTINGS_SCHEMA = ROOT / "configs" / "settings_schema.json"


EXPECTED_THEME_DECLARATIONS = (
    "--color-border: var(--border-color, #E2E8F0);",
    "--radius-control: var(--control-radius, 4px);",
    "--radius-card: var(--card-radius, 0);",
    "--spacing-section-y: var(--section-padding-y, 3rem);",
    "--spacing-section-y-md: calc(var(--section-padding-y, 3rem) * 4 / 3);",
    "--spacing-band-y: calc(var(--section-padding-y, 3rem) * 4 / 3);",
    "--spacing-band-y-md: calc(var(--section-padding-y, 3rem) * 5 / 3);",
    "--spacing-content: var(--content-gap, 1.5rem);",
    "--spacing-content-sm: calc(var(--content-gap, 1.5rem) * 2 / 3);",
    "--spacing-content-md: calc(var(--content-gap, 1.5rem) * 4 / 3);",
    "--spacing-content-lg: calc(var(--content-gap, 1.5rem) * 2);",
    "--text-h3: calc(1.25rem * var(--heading-scale, 1));",
    "--text-h3--line-height: calc(1.75 / 1.25);",
    "--text-h2: calc(1.5rem * var(--heading-scale, 1));",
    "--text-h2--line-height: calc(2 / 1.5);",
    "--text-h1: calc(1.875rem * var(--heading-scale, 1));",
    "--text-h1--line-height: calc(2.25 / 1.875);",
    "--text-h1-md: calc(2.25rem * var(--heading-scale, 1));",
    "--text-h1-md--line-height: calc(2.5 / 2.25);",
    "--text-display: calc(1.875rem * var(--heading-scale, 1));",
    "--text-display--line-height: calc(2.25 / 1.875);",
    "--text-display-md: calc(3rem * var(--heading-scale, 1));",
    "--text-display-md--line-height: 1;",
)


def extract_css_block(text, selector):
    match = re.search(
        rf"^[ \t]*{re.escape(selector)}\s*\{{(?P<body>.*?)^[ \t]*\}}",
        text,
        re.MULTILINE | re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"Could not find CSS rule for {selector}")
    return match.group("body")


def normalise_whitespace(text):
    return re.sub(r"\s+", " ", text).strip()


class StyleTokenTests(unittest.TestCase):
    def test_theme_fallbacks_equal_the_replaced_literals(self):
        """Default token values must remain the literals they replaced."""
        css = INPUT_CSS.read_text(encoding="utf-8")
        theme = extract_css_block(css, "@theme")
        declarations = {
            normalise_whitespace(match.group(0))
            for match in re.finditer(r"--[\w-]+\s*:\s*[^;]+;", theme)
        }

        for expected in EXPECTED_THEME_DECLARATIONS:
            with self.subTest(declaration=expected):
                self.assertIn(normalise_whitespace(expected), declarations)

    def test_theme_keys_do_not_reference_themselves(self):
        """Self-reference invalidates a token and disconnects its bridge."""
        css = INPUT_CSS.read_text(encoding="utf-8")
        theme = extract_css_block(css, "@theme")
        declarations = re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", theme)

        for name, value in declarations:
            with self.subTest(token=name):
                self.assertNotIn(
                    f"var({name}",
                    normalise_whitespace(value),
                    f"{name} references itself and is invalid at computed-value time",
                )

    def test_component_rules_read_the_bridge_with_the_old_literal_as_fallback(self):
        """Direct component consumers retain their pre-token default values."""
        css = INPUT_CSS.read_text(encoding="utf-8")
        expected_by_selector = {
            "body": (
                "background-color: var(--body-bg-color, #FFFFFF);",
                "font-size: var(--body-size, 1rem);",
            ),
            ".btn": ("border-radius: var(--control-radius, 0.25rem);",),
            ".btn-secondary": (
                "border: 1px solid var(--border-color, #E2E8F0);",
            ),
            ".container": ("max-width: var(--container-max, 1280px);",),
            ".product-card": ("border-radius: var(--card-radius, 0);",),
            ".product-card-bordered": (
                "border: 1px solid var(--border-color, #E2E8F0);",
            ),
            ".product-grid": ("gap: var(--content-gap, 1.5rem);",),
            ".category-grid": (
                "gap: calc(var(--content-gap, 1.5rem) * 2 / 3);",
            ),
        }

        for selector, expected_declarations in expected_by_selector.items():
            rule = normalise_whitespace(extract_css_block(css, selector))
            for declaration in expected_declarations:
                with self.subTest(selector=selector, declaration=declaration):
                    self.assertIn(normalise_whitespace(declaration), rule)

    def test_bridge_emits_nothing_for_default_options(self):
        """The layout bridge emits overrides only for non-default settings."""
        layout = BASE_LAYOUT.read_text(encoding="utf-8")
        root = extract_css_block(layout, ":root")
        bridge_names = (
            "--body-bg-color",
            "--border-color",
            "--control-radius",
            "--card-radius",
            "--section-padding-y",
            "--content-gap",
            "--heading-scale",
            "--body-size",
            "--container-max",
        )
        branch_stack = []
        occurrences = {name: 0 for name in bridge_names}

        for line in root.splitlines():
            tag = re.search(r"\{%\s*(if|elif|endif)\b(.*?)%\}", line)
            if tag:
                kind, condition = tag.groups()
                if kind == "if":
                    branch_stack.append(condition.strip())
                elif kind == "elif":
                    self.assertTrue(branch_stack, "elif without an open if")
                    branch_stack[-1] = condition.strip()
                else:
                    self.assertTrue(branch_stack, "endif without an open if")
                    branch_stack.pop()

            declaration = re.search(r"(--[\w-]+)\s*:", line)
            if declaration and declaration.group(1) in occurrences:
                name = declaration.group(1)
                occurrences[name] += 1
                self.assertTrue(
                    branch_stack,
                    f"{name} is emitted unconditionally for default settings",
                )

        expected_occurrences = {name: 1 for name in bridge_names}
        expected_occurrences.update(
            {
                "--section-padding-y": 2,
                "--content-gap": 2,
                "--heading-scale": 2,
            }
        )
        self.assertEqual(occurrences, expected_occurrences)

        expected_conditions = {
            "section_padding": (
                'settings.section_padding == "compact"',
                'settings.section_padding == "roomy"',
            ),
            "content_gap": (
                'settings.content_gap == "tight"',
                'settings.content_gap == "loose"',
            ),
            "heading_scale": (
                'settings.heading_scale == "small"',
                'settings.heading_scale == "large"',
            ),
            "body_size": (
                'settings.body_size and settings.body_size != "16px"',
            ),
        }
        for setting, expected in expected_conditions.items():
            conditions = tuple(
                normalise_whitespace(condition)
                for _, condition in re.findall(
                    rf"\{{%\s*(if|elif)\s+([^%]*settings\.{setting}[^%]*)%\}}",
                    root,
                )
            )
            with self.subTest(setting=setting):
                self.assertEqual(conditions, expected)
                self.assertFalse(
                    any(re.search(r'==\s*["\']default["\']', item) for item in conditions)
                )

    def test_live_sections_use_token_utilities_and_placeholders_keep_literals(self):
        """Live content is tokenized while empty-state geometry stays fixed."""
        standard_sections = (
            "section_featured_product.html",
            "section_featured_products.html",
            "section_featured_categories.html",
            "section_on_sale.html",
        )
        for filename in standard_sections:
            text = (ROOT / "partials" / filename).read_text(encoding="utf-8")
            sections = re.findall(r"<section\b[^>]*>", text)
            with self.subTest(partial=filename, branch="live"):
                self.assertGreaterEqual(len(sections), 2)
                self.assertIn("py-section-y md:py-section-y-md", sections[0])
            with self.subTest(partial=filename, branch="placeholder"):
                self.assertIn("py-12 md:py-16", sections[1])

        promo = (ROOT / "partials" / "section_promo_banner.html").read_text(
            encoding="utf-8"
        )
        self.assertIn("py-band-y md:py-band-y-md", re.findall(r"<section\b[^>]*>", promo)[0])

        heading = (ROOT / "partials" / "section_heading.html").read_text(
            encoding="utf-8"
        )
        for utility in ("text-h1 md:text-h1-md", "text-h3", "text-h2"):
            self.assertIn(utility, heading)
        for old_utility in ("text-xl", "text-2xl", "text-3xl", "text-4xl"):
            self.assertNotIn(old_utility, heading)

        hero = (ROOT / "partials" / "section_hero.html").read_text(encoding="utf-8")
        hero_h1 = re.search(r"<h1\b[^>]*>", hero)
        self.assertIsNotNone(hero_h1)
        self.assertIn("text-display md:text-display-md", hero_h1.group(0))

    def test_settings_ids_are_pinned(self):
        """External token manifests depend on stable setting IDs and values."""
        schema = json.loads(SETTINGS_SCHEMA.read_text(encoding="utf-8"))
        settings = {}
        for groups in schema.values():
            for entries in groups.values():
                for entry in entries:
                    name = entry.get("name")
                    if name in settings:
                        self.fail(f"Duplicate setting ID: {name}")
                    settings[name] = entry

        expected = {
            "body_bg_color": ("color", None, None),
            "border_color": ("color", None, None),
            "radius_control": (
                "select",
                ["0", "4px", "8px", "12px", "16px"],
                "4px",
            ),
            "radius_card": (
                "select",
                ["0", "4px", "8px", "12px", "16px"],
                "0",
            ),
            "section_padding": (
                "select",
                ["compact", "default", "roomy"],
                "default",
            ),
            "content_gap": (
                "select",
                ["tight", "default", "loose"],
                "default",
            ),
            "heading_scale": (
                "select",
                ["small", "default", "large"],
                "default",
            ),
            "body_size": (
                "select",
                ["15px", "16px", "17px", "18px"],
                "16px",
            ),
            "container_max_width": (
                "select",
                ["1120px", "1280px", "1440px"],
                "1280px",
            ),
        }

        for name, (setting_type, option_values, default) in expected.items():
            with self.subTest(setting=name):
                self.assertIn(name, settings)
                setting = settings[name]
                self.assertEqual(setting.get("type"), setting_type)
                if option_values is not None:
                    self.assertEqual(
                        [option["value"] for option in setting.get("options", [])],
                        option_values,
                    )
                    self.assertEqual(setting.get("default"), default)


if __name__ == "__main__":
    unittest.main()
