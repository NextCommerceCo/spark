# Spark

A modern starter theme for Next Commerce. Tailwind CSS v4, vanilla JS + Web Components, zero jQuery, zero Bootstrap, no bundler required.

**Current version:** 1.1.1

**Release status:** Public starter theme. Spark is installable on NEXT stores via `ntk` and is used for public-facing storefront builds. The theme is ready for theme developers to clone, inspect, adapt, and push to stores they control.

## Requirements

- [next-theme-kit](https://pypi.org/project/next-theme-kit/) (`pip install next-theme-kit`) for installing or pushing the theme to a store.
- [Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli) only when editing `css/input.css`; fetch it with `make install-tailwind`.
- For AI-assisted theme work, load the [next-theme-dev skill](https://github.com/NextCommerceCo/skills/tree/main/next-theme-dev) from the `skills/` repo. It captures Next Commerce theme conventions, DTL gotchas, Theme Settings rules, `ntk` workflows, and Spark-specific development guidance.

## Quick Start

The compiled `assets/main.css` is committed to the repo, so NEXT developers can install Spark on a store without a local Tailwind toolchain. Clone the repo, point `ntk` at a store you control, and push.

1. Install ntk and configure your store:
   ```bash
   pip install next-theme-kit
   ntk init
   ```

2. Push the theme to your store for the initial install:
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
| `make install-tailwind` | Download the standalone Tailwind binary for local CSS development |
| `ntk watch` | Watch mode — auto-compile Tailwind + push changes |
| `ntk tailwind` | One-shot: compile Tailwind + sass-compat + push CSS |
| `ntk tailwind --minify` | Production build: compile minified + push |
| `make css` | Compile Tailwind once and run `scripts/sass-compat.py` |
| `make css-check` | Run `make css`, then fail if `assets/main.css` still contains unsupported CSS |
| `make verify-theme` | Run CSS compatibility checks plus lightweight tooling tests |
| `make release` | Rebuild minified `assets/main.css` and stage it for commit |
| `make dev` | Legacy: run Tailwind watcher + ntk watcher in parallel |

## CSS Compatibility Verification

Spark authoring CSS can use Tailwind v4 constructs in `css/input.css`, but the storefront platform sees the generated artifact in `assets/main.css`. Before uploading CSS, run:

```bash
make css-check
```

That command rebuilds `assets/main.css`, runs `scripts/sass-compat.py`, then scans the generated file for constructs the platform Sass compiler is known to reject. Use `make verify-theme` before a release or handoff; it includes `make css-check` and the regression tests for the compatibility helper.

Known risky generated CSS includes `@supports`, `@property`, `@layer`, `oklch()`, `color-mix()`, `:is()` / `:where()`, logical properties such as `margin-inline`, media range syntax such as `(width >= 768px)`, and scientific-notation lengths such as `3.40282e38px`. `sass-compat.py` only transforms known patterns and fails if unsupported CSS remains.

Avoid dynamic Tailwind class construction in templates. Tailwind scans source files at build time, so classes like `bg-{{ settings.primary_color }}` are never emitted. Use CSS custom properties (`bg-[var(--primary-color)]`) or static conditional classes instead.

Troubleshooting quick read:

- Local Tailwind/build failure: `make css` fails before `assets/main.css` is written. Fix `css/input.css`, missing Tailwind binary, or local command setup.
- Platform Sass/compiler failure: local build passes but upload/storefront errors mention CSS parsing. Run `make css-check` and inspect any unsupported construct it reports.
- Missing uploaded compiled CSS: templates changed but styling did not. Rebuild with `make css-check`, then push `assets/main.css` explicitly.
- CDN/cache issue: pushed CSS is correct but the storefront looks stale. Test the `.29next.store` domain, hard-refresh, or append `?skip_cache=1`.

## Structure

```
spark/
├── assets/
│   ├── main.css                       Compiled Tailwind output
│   └── js/
│       ├── spark-cart-drawer-renderer.js  Side-cart markup renderer
│       ├── spark-cart-loader.js       Lazy side-cart loader + badge hydration
│       ├── spark-cart-rewards.js       Side-cart reward and upsell rules
│       ├── spark-cart.js              GraphQL cart client
│       ├── spark-events.js            Shared DOM event contract helpers
│       ├── spark-gallery.js           PDP image gallery
│       ├── spark-platform.js          Core platform JS (replaces jQuery)
│       ├── spark-variant-state.js     PDP selected variant state
│       ├── theme.js                   Theme utilities
│       └── components/                Web Components
│           ├── spark-add-to-cart.js   ATC button (Shadow DOM)
│           ├── spark-cart-drawer.js   Custom GraphQL-first side cart
│           ├── spark-progress-bar.js  Free-shipping / free-gift progress
│           ├── spark-quantity.js      Quantity stepper (Shadow DOM)
│           ├── spark-subscription.js  Subscription selector (One-time / Subscribe)
│           └── spark-upsell-item.js   Side-cart upsell slot
├── css/             Tailwind v4 input (source of truth for styles)
├── configs/         Theme settings schema + data
├── layouts/         Base template
├── locales/         Translation files (11 languages)
├── partials/        Reusable fragments + SVG icons
├── scripts/         Build tools (sass-compat.py)
└── templates/       Page templates (18 files including error pages)
```

Tracked theme documentation starts at [docs/README.md](docs/README.md). Current roadmap and follow-up work live in [PLAN.md](PLAN.md) and [TODOS.md](TODOS.md).

## Features

- **Zero legacy dependencies** — no jQuery, no Bootstrap. Pure vanilla JS + Web Components.
- **Web Components (6)** — `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-subscription>`, `<spark-upsell-item>`. Shadow DOM where appropriate, progressive enhancement, no-JS fallbacks.
- **Custom GraphQL-first side cart** — `<spark-cart-drawer>` replaces the platform's side cart black box. Event-driven `SparkSideCart` API, no platform CSS bleed.
- **Lazy cart stack** — the drawer, rewards, progress, and upsell modules load only when the shopper asks for the cart or add-to-cart opens it.
- **GraphQL cart client** — `SparkCartClient` handles cart operations with auto-create, CSRF, timeouts, and retries.
- **Documented extension modules** — `SparkEvents`, `SparkVariantState`, `SparkCartRewards`, and the cart drawer renderer keep extension points explicit for theme developers and apps.
- **Cart milestones** — multi-step progress bar with default thresholds for free shipping and free gifts; auto-add/remove driven by progress events.
- **Tailwind CSS v4** — standalone CLI binary, no Node dependency. CSS-based config with `@theme`, `@layer base`, and `@layer components`.
- **Homepage section partials (Wave 1 + 1.1.1)** — hero with text overlay, featured products, featured categories, recommended products, On Sale, Promo Banner, Featured Product. Each section partial has its own toggle in Theme Settings and is included from `templates/index.html` in a fixed order.
- **Sale badges** — automatic on product cards when `compare_at_price > price`.
- **Review app hooks** — template surfaces (`{% app_hook %}`) for product cards, PDP rating summary, full reviews module, home/collection review feeds, and global social proof. Apps render into Spark without theme edits.
- **Critical-path load order** — metadata, LCP preloads, CSS, body content, ordered theme JS, footer app hooks, and tracking are explicitly separated in `layouts/base.html`.
- **Delight package** — skeleton loading, image optimization, cart badge animation, keyboard navigation, contrast auto-detection, print stylesheet.
- **Merchant-configurable** — brand colors, fonts, navigation, footer, social links, payment icons, and more via Theme Settings.

See [docs/theme-settings-partials.md](docs/theme-settings-partials.md) for the design-team catalog of Theme Settings partials and homepage section partials, [docs/figma-section-library-plan.md](docs/figma-section-library-plan.md) for the Spark Figma section library plan, [docs/performance-load-order.md](docs/performance-load-order.md) for the critical-path loading convention, [docs/pdp-variant-state.md](docs/pdp-variant-state.md) for the PDP variant state Interface, [docs/cart-events.md](docs/cart-events.md) for the cart event Interface, [docs/cart-rewards.md](docs/cart-rewards.md) for side-cart rewards and upsell rules, [docs/cart-drawer-architecture.md](docs/cart-drawer-architecture.md) for the drawer Module split, [docs/intro-bootstrap-comparison.md](docs/intro-bootstrap-comparison.md) for the Intro Bootstrap comparison, [docs/design-block-authoring.md](docs/design-block-authoring.md) for design-block authoring guidance, [docs/terminology.md](docs/terminology.md) for NEXT-native naming guardrails, and [docs/sections-architecture-proposal.md](docs/sections-architecture-proposal.md) for the future theme sections platform proposal.

## Design System

All visual decisions are documented in [DESIGN.md](DESIGN.md) — typography, colors, spacing, motion, interaction states, accessibility, and anti-slop rules. Read it before making any UI change.

## Public Repo Notes

The `.gitignore` file is intentionally committed. It documents local files that must stay out of the public repository, including store-specific `config.yml`, downloaded Tailwind binaries, tool session state, OS files, and editor settings.

## License

Spark is released under the [MIT License](LICENSE), matching the licensing model used by Intro Bootstrap.
