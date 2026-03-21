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


def oklch_to_hex(l, c, h):
    """Convert oklch values to hex color. Simplified conversion via OKLab intermediate."""
    import math
    # OKLab from oklch
    a = c * math.cos(math.radians(h))
    b_lab = c * math.sin(math.radians(h))

    # OKLab to linear sRGB
    l_ = l + 0.3963377774 * a + 0.2158037573 * b_lab
    m_ = l - 0.1055613458 * a - 0.0638541728 * b_lab
    s_ = l - 0.0894841775 * a - 1.2914855480 * b_lab

    l_3 = l_ * l_ * l_
    m_3 = m_ * m_ * m_
    s_3 = s_ * s_ * s_

    r_lin = 4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3
    g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3
    b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3

    def gamma(v):
        if v <= 0.0031308:
            return 12.92 * v
        return 1.055 * (v ** (1/2.4)) - 0.055

    r = max(0, min(1, gamma(r_lin)))
    g = max(0, min(1, gamma(g_lin)))
    b_val = max(0, min(1, gamma(b_lin)))

    return "#{:02x}{:02x}{:02x}".format(int(r * 255 + 0.5), int(g * 255 + 0.5), int(b_val * 255 + 0.5))


def replace_oklch(css):
    """Replace all oklch() values with hex — both mapped and computed."""
    # First try exact matches from our curated map
    for oklch, hex_val in OKLCH_TO_HEX.items():
        css = css.replace(oklch, hex_val)

    # Then convert any remaining oklch() values via computation
    def oklch_match_to_hex(m):
        try:
            parts = m.group(1).strip()
            # Handle oklch(.971 .013 17.38) format
            tokens = parts.replace(',', ' ').split()
            l_val = float(tokens[0].rstrip('%'))
            if '%' in tokens[0]:
                l_val = l_val / 100.0
            c_val = float(tokens[1])
            h_val = float(tokens[2]) if len(tokens) > 2 else 0
            return oklch_to_hex(l_val, c_val, h_val)
        except Exception:
            return m.group(0)  # Return original if conversion fails

    css = re.sub(r'oklch\(([^)]+)\)', oklch_match_to_hex, css)
    return css


def replace_color_mix(css):
    """Replace color-mix() with pre-computed values."""
    # First try exact matches
    for cm, replacement in COLOR_MIX_REPLACEMENTS.items():
        css = css.replace(cm, replacement)

    # Then regex replace remaining color-mix() — convert to rgba approximations
    # Handle nested parens: color-mix(in oklab,var(--color-black)20%,transparent)
    def color_mix_to_rgba(m):
        try:
            content = m.group(0)
            if 'transparent' in content:
                pct_match = re.search(r'(\d+)%', content)
                pct = int(pct_match.group(1)) / 100.0 if pct_match else 0.5
                if 'black' in content or 'currentColor' in content.lower() or 'currentcolor' in content:
                    return "rgba(0,0,0,{})".format(pct)
                elif 'white' in content:
                    return "rgba(255,255,255,{})".format(pct)
                else:
                    return "rgba(128,128,128,{})".format(pct)
            return content
        except Exception:
            return m.group(0)

    # Match color-mix( ... ) including nested parens from var()
    css = re.sub(r'color-mix\((?:[^()]*\([^()]*\))*[^()]*\)', color_mix_to_rgba, css)

    # Remove @supports blocks that wrap color-mix fallbacks
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


def strip_at_layer(css):
    """Remove @layer wrappers — unwrap their contents.
    Sass can't parse @layer theme{...} or @layer base{...}.
    Uses brace counting to properly match opening/closing braces."""
    result = []
    i = 0
    while i < len(css):
        # Look for @layer keyword
        if css[i:i+6] == '@layer':
            # Find the opening brace
            j = css.index('{', i)
            # Skip the @layer ... { part
            i = j + 1
            # Track brace depth to find the matching closing brace
            depth = 1
            content_start = i
            while i < len(css) and depth > 0:
                if css[i] == '{':
                    depth += 1
                elif css[i] == '}':
                    depth -= 1
                i += 1
            # Append everything between the braces (excluding the final })
            result.append(css[content_start:i-1])
        else:
            result.append(css[i])
            i += 1
    return ''.join(result)


def replace_logical_properties(css):
    """Replace CSS logical properties with physical equivalents.
    padding-inline -> padding-left + padding-right
    padding-block -> padding-top + padding-bottom
    margin-inline -> margin-left + margin-right
    inset -> top/right/bottom/left
    """
    # padding-inline:X -> padding-left:X;padding-right:X
    css = re.sub(
        r'padding-inline:([^;}]+)',
        r'padding-left:\1;padding-right:\1',
        css
    )
    # padding-block:X -> padding-top:X;padding-bottom:X
    css = re.sub(
        r'padding-block:([^;}]+)',
        r'padding-top:\1;padding-bottom:\1',
        css
    )
    # margin-inline:X -> margin-left:X;margin-right:X
    css = re.sub(
        r'margin-inline:([^;}]+)',
        r'margin-left:\1;margin-right:\1',
        css
    )
    # margin-block:X -> margin-top:X;margin-bottom:X
    css = re.sub(
        r'margin-block:([^;}]+)',
        r'margin-top:\1;margin-bottom:\1',
        css
    )
    # inset:X -> top:X;right:X;bottom:X;left:X
    css = re.sub(
        r'inset:([^;}]+)',
        r'top:\1;right:\1;bottom:\1;left:\1',
        css
    )
    # padding-inline-start -> padding-left, padding-inline-end -> padding-right
    css = re.sub(r'padding-inline-start:', 'padding-left:', css)
    css = re.sub(r'padding-inline-end:', 'padding-right:', css)
    css = re.sub(r'margin-inline-start:', 'margin-left:', css)
    css = re.sub(r'margin-inline-end:', 'margin-right:', css)
    css = re.sub(r'margin-inline-start:', 'margin-left:', css)
    css = re.sub(r'border-inline-start:', 'border-left:', css)
    css = re.sub(r'border-inline-end:', 'border-right:', css)
    return css


def replace_is_where_selectors(css):
    """Replace :is() and :where() pseudo-selectors.
    Simple cases like :is(.foo) -> .foo
    For compound selectors, expand to comma-separated."""
    # :where(*) -> * (universal)
    css = css.replace(':where(*)', '*')
    # :is(.single-class) -> .single-class
    css = re.sub(r':is\(([^,)]+)\)', r'\1', css)
    css = re.sub(r':where\(([^,)]+)\)', r'\1', css)
    # :is([multiple],[size]) with comma -> [multiple],[size]
    # More general: :is(a,b) -> just use first selector as approximation
    css = re.sub(r':is\(([^)]+)\)', r'\1', css)
    css = re.sub(r':where\(([^)]+)\)', r'\1', css)
    return css


def replace_media_range_syntax(css):
    """Replace CSS Media Query Range Syntax with traditional syntax.
    (width>=768px)  -> (min-width:768px)
    (width<=768px)  -> (max-width:768px)
    (width>=768px) and (width<1024px) -> (min-width:768px) and (max-width:1023px)
    """
    # (width>=Xpx) -> (min-width:Xpx)
    css = re.sub(r'\(width\s*>=\s*(\d+(?:\.\d+)?)(px|em|rem)\)', r'(min-width:\1\2)', css)
    # (width>Xpx) -> (min-width:X+1px) - approximate
    css = re.sub(r'\(width\s*>\s*(\d+(?:\.\d+)?)(px|em|rem)\)', lambda m: '(min-width:{}{})'
                 .format(float(m.group(1)) + (1 if m.group(2) == 'px' else 0.001), m.group(2)), css)
    # (width<=Xpx) -> (max-width:Xpx)
    css = re.sub(r'\(width\s*<=\s*(\d+(?:\.\d+)?)(px|em|rem)\)', r'(max-width:\1\2)', css)
    # (width<Xpx) -> (max-width:X-1px) - approximate
    css = re.sub(r'\(width\s*<\s*(\d+(?:\.\d+)?)(px|em|rem)\)', lambda m: '(max-width:{}{})'
                 .format(float(m.group(1)) - (1 if m.group(2) == 'px' else 0.001), m.group(2)), css)
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
    css = strip_at_layer(css)
    css = replace_logical_properties(css)
    css = replace_is_where_selectors(css)
    css = replace_media_range_syntax(css)

    # Clean up empty lines
    css = re.sub(r'\n{3,}', '\n\n', css)

    with open(output_file, 'w') as f:
        f.write(css)

    final_size = len(css)
    print(f"Processed {input_file}: {original_size} → {final_size} bytes")


if __name__ == "__main__":
    main()
