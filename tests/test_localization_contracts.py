import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

LOCALIZED_DEFAULT_OVERRIDE_SETTINGS = {
    "ab_link_text",
    "cart_header_title",
    "featured_categories_header",
    "featured_product_header",
    "featured_product_cta_text",
    "featured_products_cta_text",
    "featured_products_header",
    "final_step_message",
    "homepage_hero_cta",
    "membership_detail_text",
    "membership_label",
    "on_sale_header",
    "promo_banner_heading",
    "promo_banner_cta_text",
    "recommended_products_header",
    "step_1_message",
    "step_2_message",
    "upsell_section_title",
}

STARTER_COPY_SETTINGS = LOCALIZED_DEFAULT_OVERRIDE_SETTINGS

TRANSLATION_TAG_PATTERN = re.compile(r"{%-?\s*t\s+[\"']([^\"']+)[\"']")
LOCALIZED_DEFAULT_ASSIGNMENT_PATTERN = re.compile(
    r"{%-?\s*t\s+[\"'][^\"']+[\"']\s+as\s+([A-Za-z_][A-Za-z0-9_]*)\s*-?%}"
)
SETTING_DEFAULT_PATTERN = re.compile(
    r"settings\.([A-Za-z_][A-Za-z0-9_]*)\|default:([A-Za-z_][A-Za-z0-9_]*)"
)
TEMPLATE_DIRS = ["layouts", "partials", "templates"]


def load_json(path):
    return json.loads(path.read_text())


def flatten_leaf_paths(value, prefix=""):
    if isinstance(value, dict):
        paths = set()
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else key
            paths.update(flatten_leaf_paths(child, child_prefix))
        return paths
    return {prefix}


def has_path(value, path):
    current = value
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


def setting_fields(schema):
    for groups in schema.values():
        for fields in groups.values():
            for field in fields:
                yield field


def template_paths():
    for dirname in TEMPLATE_DIRS:
        yield from (ROOT / dirname).rglob("*.html")


def localized_default_settings_from_templates():
    settings = set()
    localized_default_vars = set()

    for path in template_paths():
        text = path.read_text()
        localized_default_vars.update(LOCALIZED_DEFAULT_ASSIGNMENT_PATTERN.findall(text))

    for path in template_paths():
        text = path.read_text()
        for setting_name, default_var in SETTING_DEFAULT_PATTERN.findall(text):
            if default_var in localized_default_vars:
                settings.add(setting_name)

    return settings


class LocalizationContractTests(unittest.TestCase):
    def test_template_translation_keys_exist_in_every_locale(self):
        used_keys = set()

        for path in template_paths():
            used_keys.update(TRANSLATION_TAG_PATTERN.findall(path.read_text()))

        self.assertGreater(len(used_keys), 0)

        for locale_path in sorted((ROOT / "locales").glob("*.json")):
            locale = load_json(locale_path)
            missing = sorted(key for key in used_keys if not has_path(locale, key))
            self.assertEqual(missing, [], f"{locale_path.name} is missing translation keys")

    def test_locale_files_keep_the_same_key_shape(self):
        canonical_paths = flatten_leaf_paths(load_json(ROOT / "locales" / "en.default.json"))

        for locale_path in sorted((ROOT / "locales").glob("*.json")):
            locale_paths = flatten_leaf_paths(load_json(locale_path))
            self.assertEqual(
                sorted(canonical_paths - locale_paths),
                [],
                f"{locale_path.name} is missing locale keys from en.default.json",
            )
            self.assertEqual(
                sorted(locale_paths - canonical_paths),
                [],
                f"{locale_path.name} has locale keys not present in en.default.json",
            )

    def test_localized_default_override_settings_match_template_usage(self):
        self.assertEqual(
            sorted(LOCALIZED_DEFAULT_OVERRIDE_SETTINGS),
            sorted(localized_default_settings_from_templates()),
        )

    def test_starter_copy_settings_do_not_define_schema_defaults(self):
        schema = load_json(ROOT / "configs" / "settings_schema.json")
        fields_by_name = {field["name"]: field for field in setting_fields(schema)}

        missing_fields = sorted(STARTER_COPY_SETTINGS - fields_by_name.keys())
        self.assertEqual(missing_fields, [])

        offenders = sorted(
            name for name in STARTER_COPY_SETTINGS if "default" in fields_by_name[name]
        )
        self.assertEqual(offenders, [])

    def test_starter_copy_settings_are_not_saved_as_starter_copy(self):
        settings_data = load_json(ROOT / "configs" / "settings_data.json")
        offenders = sorted(
            name
            for name in STARTER_COPY_SETTINGS
            if settings_data.get(name) not in (None, "")
        )

        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
