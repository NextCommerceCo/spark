# Spark — Next Commerce Theme

## Overview
Spark is a modern starter theme for Next Commerce storefronts. Tailwind CSS + vanilla JS. Clean, minimal commerce aesthetic. Intended to replace Intro Bootstrap as the default starter theme and become a product in its own right.

**Current version:** 1.1.1
**Repo:** `NextCommerceCo/spark` (public starter theme)
**ntk config:** `config.yml` is gitignored and store-specific. Create it with `ntk init`; never commit store credentials.
**Companion skill:** Use the [next-theme-dev skill](https://github.com/NextCommerceCo/skills/tree/main/next-theme-dev) for AI-assisted Spark, Intro Bootstrap, and custom Next Commerce theme work.

## Position in the ecosystem
- **Replaces Intro Bootstrap** as the default starter for new Next Commerce stores.
- **Apps integration surface** — exposes a stable set of `{% app_hook %}` slots so Apps (Reviews first) can extend the storefront without theme edits. Future Apps should target these surfaces rather than fork the theme.
- **Docs and planning split** — tracked theme documentation lives in `docs/`. Current roadmap and follow-up work live in `PLAN.md` and `TODOS.md`.

## Stack
- **CSS:** Tailwind CSS v4.2.2 (standalone CLI binary `./tailwindcss`, no Node dependency)
- **JS:** Vanilla JS + Web Components. No bundler — self-contained `<script>` tags. Shadow DOM where encapsulation pays off; light DOM where slotted content needs to be styled by the theme.
- **Web Components (6):** `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-subscription>`, `<spark-upsell-item>` — progressive enhancement via `SparkCartClient` GraphQL client.
- **Side cart:** Custom GraphQL-first `<spark-cart-drawer>` replaces the platform side cart. `SparkCartLoader` lazy-loads the drawer stack, then exposes the event-driven `SparkSideCart` API (`open`, `close`, `toggle`) backed by `SparkEvents`, `SparkCartRewards`, and `SparkCartDrawerRenderer`.
- **PDP variants:** `SparkVariantState` owns selected child-product matching for radio, select, and future picker designs. Gallery, price, and add-to-cart behavior react through the same variant state Interface.
- **Performance load order:** `layouts/base.html` separates metadata, LCP preloads, CSS, rare priority JS, body content, ordered theme JS, footer app hooks, and tracking. See `docs/performance-load-order.md` before adding head scripts or preloads.
- **Templates:** Django Template Language (DTL)
- **Icons:** SVG partials in `partials/icons/`
- **jQuery:** REMOVED. Zero jQuery, zero Bootstrap. `spark-platform.js` replaces `{% core_js %}` with vanilla JS.
- **Design System:** See [DESIGN.md](DESIGN.md) for all visual decisions.

## CSS Pipeline
```
css/input.css → [tailwindcss CLI] → assets/main.css → [sass-compat.py] → [git commit] → [ntk push] → store
```

- Tailwind v4 uses CSS-based config. All theme tokens, custom colors, and component styles live in `css/input.css` using `@theme`, `@layer base`, and `@layer components`.
- `scripts/sass-compat.py` post-processes the output to strip `@property` declarations, convert `oklch()` to hex, and replace `color-mix()` — necessary because the platform's Sass parser doesn't support these modern CSS features.
- After any change to `css/input.css`, you must: compile → sass-compat → commit → push:
  ```bash
  make release           # compiles, runs sass-compat, stages assets/main.css
  git commit             # main.css change goes in the same commit as the source change
  ntk push assets/main.css
  ```
  Or the manual sequence:
  ```bash
  ./tailwindcss -i css/input.css -o assets/main.css --minify
  python3 scripts/sass-compat.py assets/main.css
  git add assets/main.css && git commit
  ntk push assets/main.css
  ```

### Why `assets/main.css` is committed

The platform doesn't compile CSS server-side, and ntk doesn't preserve binaries on push, so the **compiled minified `assets/main.css` must be in the repo** for the theme to be installable. Anyone pulling Spark via `ntk pull` or cloning from GitHub gets a working, styled storefront immediately — no Tailwind toolchain required.

Treat `main.css` as a versioned artifact: every CSS source change recompiles + recommits it. Drift between `css/input.css` and the committed output is a bug. The `tailwindcss` binary stays gitignored (76MB, platform-specific) — devs fetch it themselves with `make install-tailwind`.

## Development
```bash
make install-tailwind  # First-time setup: download the standalone CLI binary
make dev               # Standard loop: Tailwind watcher + ntk watch in parallel
ntk watch              # Watches files + pushes changes (no Tailwind compile; pair with make watch)
make watch             # Tailwind watcher only, for a separate terminal
make release           # Rebuild minified main.css and stage it for commit
make css               # Compile Tailwind once (minified) + sass-compat
make css-check         # Compile CSS, run sass-compat, then scan generated CSS
make verify-theme      # CSS compatibility check + lightweight tooling tests
make build             # Compile + minify for production (css-check alias)
```

Released `ntk` has no `tailwind` subcommand and does not compile Tailwind from `ntk watch`; the CSS build always comes from the standalone binary via the Makefile (decision: NextCommerceCo/theme-kit#31).

### CSS Compatibility Verification

Before uploading CSS, run:

```bash
make css-check
```

`css-check` rebuilds `assets/main.css`, runs `scripts/sass-compat.py`, and then scans the generated artifact for CSS the platform compiler is known to reject. Run `make verify-theme` before a release or handoff; it includes `css-check` and the regression tests for the compatibility helper.

Known risky generated CSS: `@supports`, `@property`, `@layer`, `oklch()`, `color-mix()`, `:is()` / `:where()`, logical properties (`margin-inline`, `padding-block`, `inset-inline-start`), media range syntax (`width >= 768px`), and scientific-notation lengths (`3.40282e38px`). `sass-compat.py` is intentionally boring: it transforms only known patterns and fails if unsupported CSS remains after the pass.

Troubleshooting split:

- Local Tailwind/build failure: `make css` fails before `assets/main.css` is usable. Fix `css/input.css`, the local `tailwindcss` binary, or command setup.
- Platform Sass/compiler failure: local build passes but upload/storefront CSS parsing fails. Run `make css-check`; the error should point to the unsupported construct and file.
- Missing uploaded compiled CSS: template changes appear but styles do not. Rebuild with `make css-check`, then push `assets/main.css` explicitly.
- CDN/cache issue: pushed CSS is correct but the storefront looks stale. Test the `.29next.store` domain, hard-refresh, or append `?skip_cache=1`.

## CRITICAL: Tailwind + DTL
**NEVER construct Tailwind class names dynamically:**
```django
{# BAD — classes will be purged #}
<div class="bg-{{ color }}">

{# GOOD — use CSS custom properties #}
<div style="background-color: var(--primary-color);">

{# GOOD — use static classes with conditionals #}
<div class="{% if large %}text-2xl{% else %}text-base{% endif %}">
```

## Brand Colors
CSS custom properties set in `layouts/base.html` from `store.branding`:
- `--primary-color` (default: #1E293B slate-800)
- `--accent-color` (default: #475569 slate-600)
- `--body-text-color`, `--body-header-color`, `--body-link-color` (from theme settings)

## App Hooks
Stable `{% app_hook 'NAME' %}` extension surfaces for Apps (Reviews app uses them today). Future Apps should target the same pattern rather than fork the theme. Grep `{% app_hook %}` in `templates/` and `partials/` to see what's exposed.

### Settings (`configs/settings_schema.json`)
Typography (fonts, text/heading/link colors), Navigation (main menu, navbar colors), Footer (menu, colors, social links ×8, payment icons, disclaimer), homepage section partials (hero with text overlay, featured products/categories, recommended products, On Sale, Promo Banner, Featured Product — each with its own toggle), Announcement Bar, Advanced (noindex, account-only mode). v1.1 added 22 settings and restructured homepage settings around fixed-order section partials.

### Architecture Docs
- `CONTEXT.md` defines Spark's domain language for architecture reviews.
- `docs/figma-section-library-plan.md` and `docs/section-specs/` define the Figma-to-theme section authoring workflow.
- `docs/performance-load-order.md` documents the critical-path loading convention for templates, app hooks, and tracking.
- `docs/pdp-variant-state.md` documents the selected-variant Interface for PDP picker designs.
- `docs/cart-events.md`, `docs/cart-rewards.md`, and `docs/cart-drawer-architecture.md` document the cart event, reward, and drawer Module split.

## Known Issues & Gotchas
1. **Blog search** must use `{% include 'partials/form_field.html' with field=form.name %}` — the view passes a `form` context. Raw `<input>` crashes the template.
2. **Reviews breadcrumbs** need `{% if category %}` guard around `category.get_ancestors_and_self` — products without categories crash otherwise.
3. **`settings_data.json`** must explicitly set `"main_menu": "main_menu"` and `"footer_menu": "footer_menu"` — the `"default"` field in the schema isn't sufficient.
4. **Instagram typo**: The setting name is `instragram_link` (not `instagram_link`) — preserved from Intro Bootstrap for platform compatibility.
5. **Payment icons** multi-select uses `"type": "select"` with `"multi-select": true` — NOT a `"multi_select"` type (which doesn't exist).
6. **CDN caching**: CloudFront aggressively caches `assets/main.css` with a fixed `?v=` hash. Templates are server-rendered and not cached.
7. **Parent products** can't be added to cart directly — `SparkVariantState` rewrites the add-to-cart form action to the selected child product ID and dispatches `spark:variant:changed` for gallery/price adapters.

## Design Principles
- Products are the design — generous whitespace, large photography
- System font stack — zero load time, native feel
- Sharp corners by default (0-2px). Only buttons and pills get rounding.
- Neutral palette — merchants add personality through branding colors and photography
- No decorative elements, no gradients, no blobs
- Every empty state has warmth, a primary action, and context
- Header: full logo (responsive with icon on mobile). Footer: icon preferred (compact).

## Web Components
6 components live in `assets/js/components/` (`spark-add-to-cart`, `spark-cart-drawer`, `spark-progress-bar`, `spark-quantity`, `spark-subscription`, `spark-upsell-item`) plus focused support Modules in `assets/js/`: `SparkCartLoader`, `SparkCartClient`, `SparkEvents`, `SparkVariantState`, `SparkCartRewards`, and `SparkCartDrawerRenderer`.

Cross-component event bus on `document`: `spark:cart:added`, `spark:cart:updated`, `spark:cart:toggle`, `spark:variant:changed`, `spark:progress:shipping-reached/-unreached`, `spark:progress:gift-reached/-unreached`. Prefer `SparkEvents` for dispatch. The cart drawer's public API is `window.SparkSideCart.open() / close() / toggle()`.

### CRITICAL: JS Asset Files
**NEVER use non-ASCII characters in JS asset files.** The platform processes JS through its template engine:
- No `{{ }}` or `{% %}` in comments (treated as DTL tags -> 500 error)
- No Unicode em dashes, arrows, box drawing characters (causes CDN 500)
- Use ASCII-only: `-` instead of `—`, `->` instead of `→`, `\u2713` instead of `✓`

## Push Convention
After the initial store install, only push changed files: `ntk push templates/index.html`
Do not push the entire theme during normal iteration.

## Reference Theme
Intro Bootstrap remains the comparison point for DTL patterns, available template tags/filters, URL names, and context variables. Prefer the tracked Spark docs first, especially `docs/intro-bootstrap-comparison.md` and `docs/terminology.md`, before relying on a local checkout of the reference theme.
## Issue tracking

Work in this repo is tracked with GitHub Issues and coordinated on the
org-level **[Operations](https://github.com/orgs/NextCommerceCo/projects/10)**
Kanban board (Todo / In Progress / Done). New issues are added to the board
automatically by the `add-to-project` workflow.

Before starting work on an issue: check it is not assigned to someone else,
assign yourself (`gh issue edit <n> --add-assignee @me`), and move the card to
In Progress. Open PRs with `Closes #<n>`; when the issue closes on merge, the
board's built-in "Item closed" automation moves the card to Done. Contributors
have a `/next-board` skill that wraps these board operations.
