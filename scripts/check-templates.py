#!/usr/bin/env python3
"""Check literal template includes and URL names against reviewed inventory."""

import argparse
import re
import sys
from pathlib import Path


TEMPLATE_DIRECTORIES = ("layouts", "templates", "partials")
TAG_RE = re.compile(r"{%\s*(include|url)\b(?P<body>.*?)%}", re.DOTALL)
LITERAL_RE = re.compile(
    r"""\s*(?P<quote>['"])(?P<value>.*?)(?P=quote)(?:\s|$)""",
    re.DOTALL,
)
INLINE_COMMENT_RE = re.compile(r"{#.*?#}", re.DOTALL)
BLOCK_COMMENT_RE = re.compile(
    r"{%\s*comment\s*%}.*?{%\s*endcomment\s*%}",
    re.DOTALL,
)


def mask_match(match):
    return "".join("\n" if char == "\n" else " " for char in match.group(0))


def mask_comments(text):
    text = BLOCK_COMMENT_RE.sub(mask_match, text)
    return INLINE_COMMENT_RE.sub(mask_match, text)


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


def inspect_templates(root, allowlist):
    violations = []
    skipped_variable_includes = 0
    paths = template_paths(root)

    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as error:
            violations.append(f"[read] {path}: {error}")
            continue

        masked = mask_comments(text)
        relative_path = path.relative_to(root)
        for match in TAG_RE.finditer(masked):
            tag_name = match.group(1)
            literal = LITERAL_RE.match(match.group("body"))
            line_number = masked.count("\n", 0, match.start()) + 1
            location = f"{relative_path}:{line_number}"

            if tag_name == "include":
                if literal is None:
                    skipped_variable_includes += 1
                    continue
                target = literal.group("value")
                if not (root / target).is_file():
                    violations.append(
                        f"[include] {location}: target {target!r} does not exist"
                    )
                continue

            if literal is not None:
                url_name = literal.group("value")
                if url_name not in allowlist:
                    violations.append(
                        f"[url-name] {location}: {url_name!r} is not in "
                        "the reviewed allowlist"
                    )

    return paths, skipped_variable_includes, violations


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Lint template includes and literal URL names."
    )
    parser.add_argument("--root", default=".")
    parser.add_argument(
        "--allowlist",
        default="scripts/url-name-allowlist.txt",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    root = Path(args.root)
    try:
        allowlist = load_allowlist(Path(args.allowlist))
    except OSError as error:
        print(f"Template integrity gate failed: {error}", file=sys.stderr)
        return 1

    paths, skipped_count, violations = inspect_templates(root, allowlist)
    print(
        "INFO: skipped "
        f"{skipped_count} include tag(s) with variable targets."
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
