#!/usr/bin/env python3
"""
Post-process Tailwind CSS v4 output to be compatible with
the NEXT Commerce server-side Sass compiler.

Strips:
- @property declarations (CSS Houdini — progressive enhancement only)
- oklch() color functions → hex equivalents
- color-mix() → pre-computed RGBA values

Usage: python3 scripts/sass-compat.py assets/main.css
"""

import re
import sys

# oklch color values used by Tailwind v4 slate palette → hex
# Computed from https://oklch.com/
OKLCH_TO_HEX = {
    "oklch(98.4% .003 247.858)": "#f8fafc",   # slate-50
    "oklch(96.8% .007 247.896)": "#f1f5f9",   # slate-100
    "oklch(92.9% .013 255.508)": "#e2e8f0",   # slate-200
    "oklch(86.9% .022 252.894)": "#cbd5e1",   # slate-300
    "oklch(70.4% .04 256.788)": "#94a3b8",    # slate-400
    "oklch(55.4% .046 257.417)": "#64748b",   # slate-500
    "oklch(44.6% .043 257.281)": "#475569",   # slate-600
    "oklch(37.2% .044 257.287)": "#334155",   # slate-700
    "oklch(27.9% .041 260.031)": "#1e293b",   # slate-800
    "oklch(20.8% .042 265.755)": "#0f172a",   # slate-900
}

# color-mix replacements
COLOR_MIX_REPLACEMENTS = {
    "color-mix(in oklab, var(--color-black) 20%, transparent)": "rgba(0,0,0,0.2)",
    "color-mix(in oklab, var(--color-black) 30%, transparent)": "rgba(0,0,0,0.3)",
    "color-mix(in oklab, var(--color-white) 70%, transparent)": "rgba(255,255,255,0.7)",
    "color-mix(in oklab, currentcolor 50%, transparent)": "rgba(128,128,128,0.5)",
}


def strip_at_property(css):
    """Remove @property blocks."""
    return re.sub(r'@property\s+--[\w-]+\s*\{[^}]*\}', '', css)


def replace_oklch(css):
    """Replace oklch() values with hex."""
    for oklch, hex_val in OKLCH_TO_HEX.items():
        css = css.replace(oklch, hex_val)
    return css


def replace_color_mix(css):
    """Replace color-mix() with pre-computed values."""
    for cm, replacement in COLOR_MIX_REPLACEMENTS.items():
        css = css.replace(cm, replacement)
    # Remove @supports blocks that wrap color-mix fallbacks
    # Pattern: @supports (color:color-mix(in lab, red, red)){...}
    css = re.sub(
        r'@supports\s*\(color:\s*color-mix\(in lab,\s*red,\s*red\)\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
        r'\1',
        css
    )
    return css


def strip_supports_hyphens(css):
    """
    Remove the @supports wrapper around CSS custom property fallbacks.
    These are Tailwind v4's browser compat wrappers that Sass can't parse.
    """
    css = re.sub(
        r'@supports\s*\(\(.*?\)\)\s*\{([\s\S]*?)\}(?=\})',
        r'\1',
        css,
        count=1
    )
    return css


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/sass-compat.py <input.css> [output.css]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file

    with open(input_file, 'r') as f:
        css = f.read()

    original_size = len(css)

    css = replace_oklch(css)
    css = replace_color_mix(css)
    css = strip_at_property(css)
    css = strip_supports_hyphens(css)

    # Clean up empty lines
    css = re.sub(r'\n{3,}', '\n\n', css)

    with open(output_file, 'w') as f:
        f.write(css)

    final_size = len(css)
    print(f"Processed {input_file}: {original_size} → {final_size} bytes")


if __name__ == "__main__":
    main()
