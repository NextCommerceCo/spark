# Spark

A modern starter theme for NEXT Commerce. Tailwind CSS v4, vanilla JS + Web Components, zero jQuery, zero Bootstrap, no bundler required.

## Requirements

- [next-theme-kit](https://pypi.org/project/next-theme-kit/) (`pip install next-theme-kit`)
- [Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli) (binary at `./tailwindcss`)

## Quick Start

1. Install ntk and configure your store:
   ```bash
   pip install next-theme-kit
   ntk init
   ```

2. Compile CSS and push:
   ```bash
   ntk tailwind --minify
   ```

3. Start development:
   ```bash
   ntk watch
   ```

## Development

`ntk watch` watches files, auto-compiles Tailwind (with sass-compat post-processing), and pushes changes to your store. Edit templates, partials, or CSS — changes go live automatically.

| Command | Description |
|---------|-------------|
| `ntk watch` | Watch mode — auto-compile Tailwind + push changes |
| `ntk tailwind` | One-shot: compile Tailwind + sass-compat + push CSS |
| `ntk tailwind --minify` | Production build: compile minified + push |
| `make dev` | Legacy: run Tailwind watcher + ntk watcher in parallel |

## Structure

```
spark/
├── assets/
│   ├── main.css                  Compiled Tailwind output
│   └── js/
│       ├── spark-cart.js         GraphQL cart client
│       ├── spark-gallery.js      PDP image gallery
│       ├── spark-platform.js     Core platform JS (replaces jQuery)
│       ├── theme.js              Theme utilities
│       └── components/           Web Components (Shadow DOM)
│           ├── spark-add-to-cart.js
│           └── spark-quantity.js
├── css/             Tailwind v4 input (source of truth for styles)
├── configs/         Theme settings schema + data
├── docs/            Design documents + ecosystem roadmap
├── layouts/         Base template
├── locales/         Translation files (11 languages)
├── partials/        Reusable fragments + SVG icons
├── scripts/         Build tools (sass-compat.py)
└── templates/       Page templates (18 pages)
```

## Features

- **Zero legacy dependencies** — no jQuery, no Bootstrap. Pure vanilla JS + Web Components.
- **Web Components** — `<spark-add-to-cart>` and `<spark-quantity>` with Shadow DOM, progressive enhancement, and no-JS fallbacks.
- **GraphQL cart client** — `SparkCartClient` handles cart operations with auto-create, CSRF, timeouts, and retries.
- **Tailwind CSS v4** — standalone CLI binary, no Node dependency. CSS-based config with `@theme`, `@layer base`, and `@layer components`.
- **Delight package** — skeleton loading, image optimization, cart badge animation, keyboard navigation, contrast auto-detection, print stylesheet.
- **Merchant-configurable** — brand colors, fonts, navigation, footer, social links, payment icons, and more via Theme Settings.

## Design System

All visual decisions are documented in [DESIGN.md](DESIGN.md) — typography, colors, spacing, motion, interaction states, accessibility, and anti-slop rules. Read it before making any UI change.

## License

Proprietary — NEXT Commerce.
