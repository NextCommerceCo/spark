#!/usr/bin/env python3
"""Check literal template includes and URL names against reviewed inventory."""

import argparse
import re
import sys
from pathlib import Path


TEMPLATE_DIRECTORIES = ("layouts", "templates", "partials")
TAG_RE = re.compile(r"{%\s*(include|url)\b(?P<body>.*?)%}", re.DOTALL)
BARE_CART_PRODUCT_PK_RE = re.compile(
    r"(?:^|\s)pk\s*=\s*product\.pk(?=\s|$)"
)
LITERAL_RE = re.compile(
    r"""\s*(?P<quote>['"])(?P<value>(?:(?!(?P=quote)).)*)(?P=quote)(?:\s|$)""",
    re.DOTALL,
)
# Django's unescape_string_literal handles ONLY \" (or \') and \\ inside a
# template string literal. Every other backslash sequence reaches the filter as
# two literal characters: split:"\n" splits on backslash-n, never on a newline.
# The platform renders such a template without error, so the defect is silent
# until real settings data flows through the filter.
DTL_EXPRESSION_RE = re.compile(r"{{.*?}}|{%.*?%}", re.DOTALL)
# The value pattern consumes any backslash escape as a unit, so an escaped
# quote (\" or \') inside the argument cannot cut the capture short and hide
# a later escape from the gate.
FILTER_ARGUMENT_RE = re.compile(
    r"\|\s*(?P<filter>\w+)\s*:\s*"
    r"(?P<quote>['\"])(?P<value>(?:\\.|(?!(?P=quote))[^\\])*)(?P=quote)",
    re.DOTALL,
)
INLINE_COMMENT_RE = re.compile(r"{#[^\r\n]*?#}")
BLOCK_COMMENT_RE = re.compile(
    r"{%\s*comment(?:\s+.*?)?\s*%}.*?{%\s*endcomment\s*%}",
    re.DOTALL,
)
VERBATIM_BLOCK_RE = re.compile(
    r"{%\s*verbatim(?:\s+.*?)?\s*%}.*?"
    r"{%\s*endverbatim(?:\s+.*?)?\s*%}",
    re.DOTALL,
)
BLOCK_TAG_RE = re.compile(
    r"{%\s*(?P<tag>endblock|block)\b(?:\s+(?P<name>[\w-]+))?[^%]*%}"
)
REQUIRED_BASE_BLOCKS = {
    "announcement_bar",
    "nav_header",
    "content_wrapper",
    "footer",
    "side_cart",
    "custom_css",
    "platform_compatibility",
    "preview_indicator",
    "delight_scripts",
    "footer_app_hooks",
    "tracking",
}


def mask_match(match):
    return "".join("\n" if char == "\n" else " " for char in match.group(0))


def mask_comments(text):
    # Django tokenizes inline comments before interpreting block tags. Masking
    # them first prevents comment/endcomment text inside {# ... #} from
    # changing the extent of a real block comment.
    text = INLINE_COMMENT_RE.sub(mask_match, text)
    return BLOCK_COMMENT_RE.sub(mask_match, text)


def mask_ignored_regions(text):
    return VERBATIM_BLOCK_RE.sub(mask_match, mask_comments(text))


def inspect_block_structure(text):
    block_names = set()
    stack = []
    errors = []

    for match in BLOCK_TAG_RE.finditer(text):
        tag_name = match.group("tag")
        block_name = match.group("name")
        line_number = text.count("\n", 0, match.start()) + 1

        if tag_name == "block":
            if not block_name:
                errors.append(f"block on line {line_number} has no name")
                continue
            if block_name in block_names:
                errors.append(
                    f"duplicate block {block_name!r} on line {line_number}"
                )
            block_names.add(block_name)
            stack.append((block_name, line_number))
            continue

        if not stack:
            errors.append(f"endblock on line {line_number} has no opening block")
            continue

        expected_name, opening_line = stack.pop()
        if block_name and block_name != expected_name:
            errors.append(
                f"block {expected_name!r} opened on line {opening_line} "
                f"closes as {block_name!r} on line {line_number}"
            )

    for block_name, opening_line in stack:
        errors.append(
            f"block {block_name!r} opened on line {opening_line} is unclosed"
        )

    return block_names, errors


def unsupported_escape(value):
    """Return the first backslash sequence Django will not unescape, if any."""
    index = 0
    while index < len(value) - 1:
        if value[index] == "\\":
            following = value[index + 1]
            if following in "\\\"'":
                index += 2
                continue
            return "\\" + following
        index += 1
    return None


def inspect_filter_arguments(masked, relative_path):
    violations = []
    for expression in DTL_EXPRESSION_RE.finditer(masked):
        for match in FILTER_ARGUMENT_RE.finditer(expression.group(0)):
            escape = unsupported_escape(match.group("value"))
            if escape is None:
                continue
            offset = expression.start() + match.start()
            line_number = masked.count("\n", 0, offset) + 1
            filter_name = match.group("filter")
            advice = (
                ' Split on newlines with |linebreaksbr|split:"<br>".'
                if escape == "\\n" and filter_name == "split"
                else ""
            )
            violations.append(
                f"[escape-in-filter-argument] {relative_path}:{line_number}: "
                f"{filter_name}:\"{escape}\" - Django template string literals "
                "unescape only \\\" and \\\\, so the filter receives the two "
                f"literal characters {escape!r}.{advice}"
            )
    return violations


def load_allowlist(path):
    names = set()
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            name = line.split("#", 1)[0].strip()
            if name:
                names.add(name)
    return names


def template_paths(root):
    paths = []
    for directory in TEMPLATE_DIRECTORIES:
        paths.extend((root / directory).rglob("*.html"))
    return sorted(set(paths))


def missing_default_inventory(root, paths):
    missing = []
    base_template = root / "layouts" / "base.html"
    if not base_template.is_file():
        missing.append("required template layouts/base.html")
    else:
        try:
            base_text = mask_ignored_regions(base_template.read_text(encoding="utf-8"))
            base_blocks, _ = inspect_block_structure(base_text)
            for block_name in sorted(REQUIRED_BASE_BLOCKS - base_blocks):
                missing.append(f"overridable base block {block_name!r}")
        except OSError as error:
            missing.append(f"readable layouts/base.html ({error})")

    for directory in TEMPLATE_DIRECTORIES:
        directory_root = root / directory
        if not any(
            path.is_file() and path.is_relative_to(directory_root)
            for path in paths
        ):
            missing.append(f"at least one .html file under {directory}/")

    return missing


def inspect_templates(root, allowlist):
    violations = []
    skipped_includes = 0
    skipped_urls = 0
    paths = template_paths(root)
    resolved_root = root.resolve()

    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as error:
            violations.append(f"[read] {path}: {error}")
            continue

        masked = mask_ignored_regions(text)
        relative_path = path.relative_to(root)
        _, block_errors = inspect_block_structure(masked)
        for error in block_errors:
            violations.append(f"[block-structure] {relative_path}: {error}")

        violations.extend(inspect_filter_arguments(masked, relative_path))

        for match in TAG_RE.finditer(masked):
            tag_name = match.group(1)
            body = match.group("body")
            literal = LITERAL_RE.match(body)
            line_number = masked.count("\n", 0, match.start()) + 1
            location = f"{relative_path}:{line_number}"

            if not body.strip():
                argument_name = "target" if tag_name == "include" else "URL name"
                violations.append(
                    f"[{tag_name}] {location}: tag has no {argument_name} argument"
                )
                continue

            if tag_name == "include":
                if literal is None:
                    skipped_includes += 1
                    continue
                target = literal.group("value")
                target_path = Path(target)
                try:
                    resolved_target = (resolved_root / target_path).resolve()
                except (OSError, RuntimeError, ValueError) as error:
                    violations.append(
                        f"[path-escape] {location}: include target {target!r} "
                        f"could not be resolved safely: {error}"
                    )
                    continue
                if (
                    target_path.is_absolute()
                    or ".." in target_path.parts
                    or not resolved_target.is_relative_to(resolved_root)
                ):
                    violations.append(
                        f"[path-escape] {location}: include target {target!r} "
                        "must resolve inside the template root"
                    )
                elif not resolved_target.is_file():
                    violations.append(
                        f"[include] {location}: target {target!r} does not exist"
                    )
                continue

            if literal is None:
                skipped_urls += 1
                continue

            url_name = literal.group("value")
            if url_name not in allowlist:
                violations.append(
                    f"[url-name] {location}: {url_name!r} is not in "
                    "the reviewed allowlist"
                )
                continue
            if (
                url_name == "cart:add"
                and BARE_CART_PRODUCT_PK_RE.search(body)
            ):
                violations.append(
                    f"[cart-product-id] {location}: cart:add must resolve "
                    "a purchasable child PK before falling back to product.pk"
                )

    return paths, skipped_includes, skipped_urls, violations


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Lint template includes and literal URL names."
    )
    parser.add_argument("--root")
    parser.add_argument(
        "--allowlist",
        default="scripts/url-name-allowlist.txt",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    default_scan = args.root is None
    root = Path(".") if default_scan else Path(args.root)
    try:
        allowlist = load_allowlist(Path(args.allowlist))
    except OSError as error:
        print(f"Template integrity gate failed: {error}", file=sys.stderr)
        return 1

    paths, skipped_includes, skipped_urls, violations = inspect_templates(
        root, allowlist
    )

    if default_scan:
        missing = missing_default_inventory(root, paths)
        if missing:
            print(
                "Template integrity gate failed: default template inventory "
                "is incomplete:",
                file=sys.stderr,
            )
            for requirement in missing:
                print(f"- {requirement}", file=sys.stderr)
            return 1

    if not paths:
        directories = ", ".join(TEMPLATE_DIRECTORIES)
        print(
            "Template integrity gate failed: no template files were found "
            f"under the scanned directories ({directories}).",
            file=sys.stderr,
        )
        return 1

    print(
        "INFO: skipped "
        f"{skipped_includes} include tag(s); skipped {skipped_urls} url tag(s) "
        "with non-literal arguments."
    )

    if violations:
        print(
            f"Template integrity gate failed with {len(violations)} "
            "violation(s):",
            file=sys.stderr,
        )
        for violation in violations:
            print(f"- {violation}", file=sys.stderr)
        return 1

    print(
        "Template integrity gate passed: "
        f"checked {len(paths)} template file(s)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
