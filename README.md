# Spark

A modern starter theme for Next Commerce. Tailwind CSS v4, vanilla JS + Web Components, zero jQuery, zero Bootstrap, no bundler required.

**Current version:** 1.1.1

## Requirements

- [next-theme-kit](https://pypi.org/project/next-theme-kit/) (`pip install next-theme-kit`)
- [Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli) — fetched via `make install-tailwind`

## Quick Start

The compiled `assets/main.css` is committed to the repo, so you can install Spark on a store immediately without a local toolchain — clone, point ntk at your store, push.

1. Install ntk and configure your store:
   ```bash
   pip install next-theme-kit
   ntk init
   ```

2. Push the theme to your store:
   ```bash
   ntk push
   ```

For day-to-day development (editing CSS sources), set up Tailwind locally:

```bash
make install-tailwind   # downloads the right standalone binary for your OS
ntk watch               # watches files, compiles Tailwind, pushes changes
```

When you change `css/input.css` (or any source that affects the build), run `make release` to rebuild `assets/main.css` and stage it for commit. The committed `main.css` is the canonical artifact that ships to merchants — keep it in sync.

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
│   ├── main.css                       Compiled Tailwind output
│   └── js/
│       ├── spark-cart.js              GraphQL cart client
│       ├── spark-gallery.js           PDP image gallery
│       ├── spark-platform.js          Core platform JS (replaces jQuery)
│       ├── theme.js                   Theme utilities
│       └── components/                Web Components
│           ├── spark-add-to-cart.js   ATC button (Shadow DOM)
│           ├── spark-cart-drawer.js   Custom GraphQL-first side cart
│           ├── spark-progress-bar.js  Free-shipping / free-gift progress
│           ├── spark-quantity.js      Quantity stepper (Shadow DOM)
│           └── spark-upsell-item.js   Side-cart upsell slot
├── css/             Tailwind v4 input (source of truth for styles)
├── configs/         Theme settings schema + data
├── layouts/         Base template
├── locales/         Translation files (11 languages)
├── partials/        Reusable fragments + SVG icons
├── scripts/         Build tools (sass-compat.py)
└── templates/       Page templates (18 files including error pages)
```

Project planning and session knowledge live in the separate `learn/` repo (Next Mind), not in this theme.

## Features

- **Zero legacy dependencies** — no jQuery, no Bootstrap. Pure vanilla JS + Web Components.
- **Web Components (5)** — `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-upsell-item>`. Shadow DOM where appropriate, progressive enhancement, no-JS fallbacks.
- **Custom GraphQL-first side cart** — `<spark-cart-drawer>` replaces the platform's side cart black box. Event-driven `SparkSideCart` API, no platform CSS bleed.
- **GraphQL cart client** — `SparkCartClient` handles cart operations with auto-create, CSRF, timeouts, and retries.
- **Cart milestones** — multi-step progress bar with currency-aware thresholds for free shipping and free gifts; auto-add/remove driven by progress events.
- **Tailwind CSS v4** — standalone CLI binary, no Node dependency. CSS-based config with `@theme`, `@layer base`, and `@layer components`.
- **Homepage sections (Wave 1 + 1.1.1)** — hero with text overlay, featured products, featured categories, recommended products, On Sale, Promo Banner, Featured Product. Each section has its own toggle in Theme Settings.
- **Sale badges** — automatic on product cards when `compare_at_price > price`.
- **Review app hooks** — template surfaces (`{% app_hook %}`) for product cards, PDP rating summary, full reviews module, home/collection review feeds, and global social proof. Apps render into Spark without theme edits.
- **Delight package** — skeleton loading, image optimization, cart badge animation, keyboard navigation, contrast auto-detection, print stylesheet.
- **Merchant-configurable** — brand colors, fonts, navigation, footer, social links, payment icons, and more via Theme Settings.

See [docs/theme-settings-partials.md](docs/theme-settings-partials.md) for the design-team catalog of Theme Settings partials and homepage blocks.

## Design System

All visual decisions are documented in [DESIGN.md](DESIGN.md) — typography, colors, spacing, motion, interaction states, accessibility, and anti-slop rules. Read it before making any UI change.

## License

Proprietary — Next Commerce.
