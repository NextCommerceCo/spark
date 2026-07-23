# Spark

A modern starter theme for Next Commerce. Tailwind CSS v4, vanilla JS + Web Components, zero jQuery, zero Bootstrap, no bundler required.

**Current version:** 1.1.1

**Release status:** Public starter theme. Spark is installable on NEXT stores via `ntk` and is used for public-facing storefront builds. The theme is ready for theme developers to clone, inspect, adapt, and push to stores they control.

## Requirements

- [next-theme-kit](https://pypi.org/project/next-theme-kit/) (`pip install next-theme-kit`) for installing or pushing the theme to a store.
- [Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli) only when editing `css/input.css`; fetch it with `make install-tailwind`.
- For AI-assisted theme work, load the [next-theme-dev skill](https://github.com/NextCommerceCo/skills/tree/main/next-theme-dev) from the `skills/` repo. It captures Next Commerce theme conventions, DTL gotchas, Theme Settings rules, `ntk` workflows, and Spark-specific development guidance.

## Quick Start

The compiled `assets/main.css` is committed to the repo, so NEXT developers can inspect or install Spark without a local Tailwind toolchain. Choose the path that matches what you have available.

### Inspect Spark Locally

Use this path when you want to evaluate the theme structure, docs, and generated CSS before connecting a store.

```bash
git clone https://github.com/NextCommerceCo/spark.git
cd spark
python3 -m unittest discover -s tests
python3 scripts/sass-compat.py --check assets/main.css
```

Expected time: under 2 minutes after clone on a typical laptop. This verifies the committed CSS artifact and local tooling tests. It does not render a live storefront because Spark templates run inside the Next Commerce theme runtime.

### Install On A Store

Use this path when you have a Next Commerce store, API key, and theme id.

1. Install `ntk` and configure your store:
   ```bash
   pip install next-theme-kit
   ntk init
   ```
   `ntk init` writes a local `config.yml` with your API key, store domain, and theme id. That file is gitignored. If you prefer to create it by hand, copy `config.example.yml` to `config.yml` and replace the placeholder values.

2. Push the theme to your store for the initial install:
   ```bash
   ntk push
   ```

Expected time: 5-10 minutes if you already have store credentials. If `ntk` cannot find credentials, create `config.yml` with `ntk init`, copy `config.example.yml`, or pass credentials through the CLI options shown by `ntk --help`.

For day-to-day development (editing CSS sources), set up Tailwind locally:

```bash
make install-tailwind   # downloads the right standalone binary for your OS
make dev                # runs the Tailwind watcher and ntk watch in parallel
```

When you change `css/input.css` (or any source that affects the build), run `make release` to rebuild `assets/main.css` and stage it for commit. The committed `main.css` is the canonical artifact that ships to merchants — keep it in sync.

## Development

`make dev` runs the Tailwind watcher and `ntk watch` in parallel: edit templates, partials, or CSS, and changes compile and push automatically. Note that `ntk watch` on its own only watches and pushes files — the Tailwind compile comes from the standalone binary, so run the two together (which is exactly what `make dev` does).

| Command | Description |
|---------|-------------|
| `make install-tailwind` | Download the standalone Tailwind binary for local CSS development |
| `make dev` | Run the Tailwind watcher and `ntk watch` in parallel — the standard dev loop |
| `ntk watch` | Watch and push file changes (pair with `make watch` for CSS, or use `make dev`) |
| `make watch` | Tailwind watcher only, for running `ntk watch` in a separate terminal |
| `make css` | Compile Tailwind once (minified) and run `scripts/sass-compat.py` |
| `make css-check` | Run `make css`, then fail if `assets/main.css` still contains unsupported CSS |
| `make verify-theme` | Run CSS compatibility checks plus lightweight tooling tests |
| `make release` | Rebuild minified `assets/main.css` and stage it for commit |

## CSS Compatibility Verification

Spark authoring CSS can use Tailwind v4 constructs in `css/input.css`, but the storefront platform sees the generated artifact in `assets/main.css`. Before uploading CSS, run:

```bash
make css-check
```

That command rebuilds `assets/main.css`, runs `scripts/sass-compat.py`, then scans the generated file for constructs the platform Sass compiler is known to reject. Use `make verify-theme` before a release or handoff; it includes `make css-check` and the regression tests for the compatibility helper.

Known risky generated CSS includes `@supports`, `@property`, `@layer`, `oklch()`, `color-mix()`, `:is()` / `:where()`, logical properties such as `margin-inline`, media range syntax such as `(width >= 768px)`, and scientific-notation lengths such as `3.40282e38px`. `sass-compat.py` only transforms known patterns and fails if unsupported CSS remains.

Avoid dynamic Tailwind class construction in templates. Tailwind scans source files at build time, so classes like `bg-{{ settings.primary_color }}` are never emitted. Use CSS custom properties (`bg-[var(--primary-color)]`) or static conditional classes instead.

## Troubleshooting

- Credential errors from `ntk`: confirm `config.yml` has the API key, store domain, and theme id for a store you control.
- Python runtime warnings before `ntk` output: retry from a current Python virtual environment. These warnings usually come from local Python packaging, not Spark.
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
│       ├── spark-membership-pricing.js Customer-metadata member price presentation
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
- **Membership price presentation** — optional client-side member price display driven by logged-in customer metadata, designed to pair with platform-side checkout discounts.
- **Critical-path load order** — metadata, LCP preloads, CSS, body content, ordered theme JS, footer app hooks, and tracking are explicitly separated in `layouts/base.html`.
- **Delight package** — skeleton loading, image optimization, cart badge animation, keyboard navigation, contrast auto-detection, print stylesheet.
- **Merchant-configurable** — brand colors, fonts, navigation, footer, social links, payment icons, and more via Theme Settings.

See [docs/theme-settings-partials.md](docs/theme-settings-partials.md) for the design-team catalog of Theme Settings partials and homepage section partials, [docs/figma-section-library-plan.md](docs/figma-section-library-plan.md) for the Spark Figma section library plan, [docs/performance-load-order.md](docs/performance-load-order.md) for the critical-path loading convention, [docs/pdp-customization.md](docs/pdp-customization.md) for the PDP redesign preservation checklist and QA runbook, [docs/pdp-variant-state.md](docs/pdp-variant-state.md) for the PDP variant state Interface, [docs/cart-events.md](docs/cart-events.md) for the cart event Interface, [docs/cart-rewards.md](docs/cart-rewards.md) for side-cart rewards and upsell rules, [docs/cart-drawer-architecture.md](docs/cart-drawer-architecture.md) for the drawer Module split, [docs/intro-bootstrap-comparison.md](docs/intro-bootstrap-comparison.md) for the Intro Bootstrap comparison, [docs/design-block-authoring.md](docs/design-block-authoring.md) for design-block authoring guidance, [docs/terminology.md](docs/terminology.md) for NEXT-native naming guardrails, and [docs/sections-architecture-proposal.md](docs/sections-architecture-proposal.md) for the future theme sections platform proposal.

Start with [docs/extending-spark.md](docs/extending-spark.md) when adding Theme Settings, homepage section partials, app hooks, Web Components, or public storefront behavior.

## Design System

All visual decisions are documented in [DESIGN.md](DESIGN.md) — typography, colors, spacing, motion, interaction states, accessibility, and anti-slop rules. Read it before making any UI change.

## Public Repo Notes

The `.gitignore` file is intentionally committed. It documents local files that must stay out of the public repository, including store-specific `config.yml`, downloaded Tailwind binaries, tool session state, OS files, and editor settings.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow, [CHANGELOG.md](CHANGELOG.md) for release notes, and [SECURITY.md](SECURITY.md) for private vulnerability reporting and secrets-handling guidance.

## License

Spark is released under the [MIT License](LICENSE), matching the licensing model used by Intro Bootstrap.
