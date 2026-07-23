#!/usr/bin/env python3
"""Validate exact settings parity and value types for the Spark theme."""

import argparse
import json
import sys
from pathlib import Path


STRING_TYPES = {
    "text",
    "textarea",
    "html",
    "css",
    "richtext",
    "url",
    "image_picker",
    "color",
    "menu",
}
LIST_TYPES = {"products", "product_categories"}
# Picker-backed settings use null to represent no selection. The committed
# data uses this for product settings; image_picker has the same unset model.
NULLABLE_TYPES = {"product", "product_category", "image_picker"}
REQUIRED_MENUS = ("main_menu", "footer_menu")


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_optional_names(path):
    names = set()
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            name = line.split("#", 1)[0].strip()
            if name:
                names.add(name)
    return names


def flatten_schema(schema):
    settings = {}
    violations = []
    if not isinstance(schema, dict):
        return settings, ["[schema-shape] schema root must be an object"]

    for group_name, group in schema.items():
        if not isinstance(group, dict):
            violations.append(
                f"[schema-shape] group {group_name!r} must be an object"
            )
            continue
        for subgroup_name, entries in group.items():
            location = f"{group_name}/{subgroup_name}"
            if not isinstance(entries, list):
                violations.append(
                    f"[schema-shape] subgroup {location!r} must be a list"
                )
                continue
            for index, setting in enumerate(entries):
                if not isinstance(setting, dict):
                    violations.append(
                        f"[schema-shape] {location}[{index}] must be an object"
                    )
                    continue
                name = setting.get("name")
                setting_type = setting.get("type")
                if not isinstance(name, str) or not name:
                    violations.append(
                        f"[schema-shape] {location}[{index}] has no valid name"
                    )
                    continue
                if not isinstance(setting_type, str) or not setting_type:
                    violations.append(
                        f"[schema-shape] setting {name!r} has no valid type"
                    )
                    continue
                if name in settings:
                    violations.append(
                        f"[schema-shape] duplicate setting name {name!r}"
                    )
                    continue
                settings[name] = setting
    return settings, violations


def option_values(setting):
    values = []
    options = setting.get("options", [])
    if not isinstance(options, list):
        return values
    for option in options:
        if isinstance(option, dict) and "value" in option:
            values.append(option["value"])
    return values


def validate_value(setting, value):
    setting_type = setting["type"]

    if value is None:
        if setting_type in NULLABLE_TYPES:
            return None
        return f"null is not valid for type {setting_type!r}"

    if setting_type == "checkbox":
        if type(value) is bool:
            return None
        return f"expected bool, got {type(value).__name__}"

    if setting_type in {"number", "range"}:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return None
        return f"expected int or float, got {type(value).__name__}"

    if setting_type in STRING_TYPES:
        if isinstance(value, str):
            return None
        return f"expected str, got {type(value).__name__}"

    if setting_type in {"product", "product_category"}:
        if isinstance(value, str):
            return None
        if isinstance(value, int) and not isinstance(value, bool):
            return None
        return f"expected str, int, or null, got {type(value).__name__}"

    if setting_type in LIST_TYPES:
        if isinstance(value, list):
            return None
        return f"expected list, got {type(value).__name__}"

    if setting_type == "select" and setting.get("multi-select") is True:
        if not isinstance(value, list):
            return f"expected list, got {type(value).__name__}"
        allowed = option_values(setting)
        invalid = [item for item in value if item not in allowed]
        if invalid:
            return (
                f"values {invalid!r} are not in allowed options "
                f"{allowed!r}"
            )
        return None

    if setting_type in {"select", "radio"}:
        allowed = option_values(setting)
        if value == "" or value in allowed:
            return None
        return f"value {value!r} is not in allowed options {allowed!r}"

    return f"unsupported schema type {setting_type!r}"


def validate_settings(schema, data, optional_names):
    settings, violations = flatten_schema(schema)
    if not isinstance(data, dict):
        violations.append("[data-shape] settings data root must be an object")
        return settings, violations

    schema_names = set(settings)
    data_names = set(data)

    for name in sorted(data_names - schema_names):
        violations.append(
            f"[data-key] {name!r} exists in data but not in schema"
        )

    for name in sorted(schema_names - data_names - optional_names):
        violations.append(
            f"[schema-key] {name!r} is missing from settings data"
        )

    for name in REQUIRED_MENUS:
        value = data.get(name)
        if not isinstance(value, str) or not value.strip():
            violations.append(
                f"[required-menu] {name!r} must be present as a non-empty string"
            )

    for name in sorted(schema_names & data_names):
        error = validate_value(settings[name], data[name])
        if error:
            violations.append(f"[type] {name!r}: {error}")

    return settings, violations


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Check settings schema/data parity and value types."
    )
    parser.add_argument("--schema", default="configs/settings_schema.json")
    parser.add_argument("--data", default="configs/settings_data.json")
    parser.add_argument("--optional", default="configs/settings_optional.txt")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        schema = load_json(Path(args.schema))
        data = load_json(Path(args.data))
        optional_names = load_optional_names(Path(args.optional))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Settings parity gate failed: {error}", file=sys.stderr)
        return 1

    settings, violations = validate_settings(schema, data, optional_names)
    if violations:
        print(
            f"Settings parity gate failed with {len(violations)} violation(s):",
            file=sys.stderr,
        )
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1

    print(
        "Settings parity gate passed: "
        f"{len(data)} data values match {len(settings)} schema settings."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
