# Spark — NEXT Commerce Theme

## Overview
Spark is a modern starter theme for NEXT Commerce storefronts. Tailwind CSS + vanilla JS. No jQuery, no Bootstrap. Clean, minimal commerce aesthetic.

## Stack
- **CSS:** Tailwind CSS v4 (standalone CLI, no Node dependency)
- **JS:** Vanilla JS — self-contained script tags, no bundler
- **Templates:** Django Template Language (DTL)
- **Icons:** SVG partials in `partials/icons/`

## CSS Pipeline
```
css/input.css → [tailwindcss CLI] → assets/main.css → [ntk push] → store
```

Tailwind v4 uses CSS-based configuration. All theme tokens, custom colors, and component styles are defined in `css/input.css` using `@theme`, `@layer base`, and `@layer components`.

## Development
```bash
make dev        # Run Tailwind watcher + ntk watcher in parallel
make css        # Compile Tailwind once
make build      # Compile + minify for production
```

Or run separately:
```bash
tailwindcss -i css/input.css -o assets/main.css --watch   # Terminal 1
ntk watch                                                    # Terminal 2
```

## CRITICAL: Tailwind + DTL
**NEVER construct Tailwind class names dynamically:**
```django
{# BAD — classes will be purged #}
<div class="bg-{{ color }}">
<div class="text-{{ size }}xl">

{# GOOD — use CSS custom properties #}
<div style="background-color: var(--primary-color);">

{# GOOD — use static classes with conditionals #}
<div class="{% if large %}text-2xl{% else %}text-base{% endif %}">
```

## Brand Colors
CSS custom properties set in `layouts/base.html` from `store.branding`:
- `--primary-color` (default: #1E293B slate-800)
- `--accent-color` (default: #475569 slate-600)

Override with settings or store branding in the dashboard.

## Design Principles
- Products are the design — generous whitespace, large photography
- System font stack — zero load time, native feel
- Sharp corners by default (0-2px). Only buttons and pills get rounding.
- Neutral palette — merchants add personality through branding colors and photography
- No jQuery, no Bootstrap, no decorative elements
- Every empty state has warmth, a primary action, and context

## Key Files
| File | Purpose |
|------|---------|
| `css/input.css` | Tailwind config + custom styles (source of truth for CSS) |
| `layouts/base.html` | Master layout — CSS custom props, template blocks |
| `configs/settings_schema.json` | Theme editor settings |
| `assets/js/theme.js` | Core JS: mobile nav, side cart, variant picker |
| `Makefile` | Dev commands |

## Push Convention
Only push changed files: `ntk push templates/index.html`
Never push the entire theme.
