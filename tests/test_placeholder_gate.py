"""Setup placeholders render only in the Theme Editor and in theme previews."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GATE = "{% elif request.is_setting_preview or request.COOKIES.preview_theme %}"
PLACEHOLDER = re.compile(r'\{%\s*t\s+"homepage\.placeholder\.')
TAG = re.compile(r"\{%\s*(if|elif|else|endif)\b[^%]*%\}")


def gating_tag(text, position):
    """Return the if/elif/else tag that opens the branch containing `position`."""
    depth = 0
    for match in reversed(list(TAG.finditer(text, 0, position))):
        kind = match.group(1)
        if kind == "endif":
            depth += 1
        elif kind == "if":
            if depth == 0:
                return match.group(0)
            depth -= 1
        elif depth == 0:
            return match.group(0)
    return None


class PlaceholderGate(unittest.TestCase):
    def placeholder_partials(self):
        partials = {}
        for path in sorted((ROOT / "partials").glob("*.html")):
            text = path.read_text(encoding="utf-8")
            if PLACEHOLDER.search(text):
                partials[path.name] = text
        return partials

    def test_every_setup_placeholder_is_gated(self):
        partials = self.placeholder_partials()
        self.assertTrue(partials)
        for name, text in partials.items():
            for match in PLACEHOLDER.finditer(text):
                with self.subTest(partial=name, at=match.start()):
                    self.assertEqual(gating_tag(text, match.start()), GATE)

    def test_known_sections_are_covered(self):
        self.assertTrue(
            {
                "section_hero.html",
                "section_featured_product.html",
                "section_featured_products.html",
                "section_featured_categories.html",
                "section_image_text.html",
                "section_on_sale.html",
                "section_text_block.html",
            }
            <= set(self.placeholder_partials())
        )

    def test_bare_else_fails_the_gate(self):
        text = '{% if a %}x{% else %}<p>{% t "homepage.placeholder.hero_image" %}</p>{% endif %}'
        self.assertEqual(gating_tag(text, PLACEHOLDER.search(text).start()), "{% else %}")


if __name__ == "__main__":
    unittest.main()
