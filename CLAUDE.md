# Spark — Next Commerce Theme

## Overview
Spark is a modern starter theme for Next Commerce storefronts. Tailwind CSS + vanilla JS. Clean, minimal commerce aesthetic. Intended to replace Intro Bootstrap as the default starter theme and become a product in its own right.

**Current version:** 1.1.1
**Repo:** `NextCommerceCo/spark` (private)
**Dev store:** `https://keer.29next.store` — theme ID 133
**ntk config:** `config.yml` (gitignored, contains API key)

## Position in the ecosystem
- **Replaces Intro Bootstrap** as the default starter for new Next Commerce stores.
- **Apps integration surface** — exposes a stable set of `{% app_hook %}` slots so Apps (Reviews first) can extend the storefront without theme edits. Future Apps should target these surfaces rather than fork the theme.
- **Project planning lives elsewhere** — session knowledge, ADRs, and roadmap notes belong in the `learn/` repo (Next Mind), not in this theme. The local `docs/` directory is gitignored for scratch use only.

## Stack
- **CSS:** Tailwind CSS v4.2.2 (standalone CLI binary `./tailwindcss`, no Node dependency)
- **JS:** Vanilla JS + Web Components. No bundler — self-contained `<script>` tags. Shadow DOM where encapsulation pays off; light DOM where slotted content needs to be styled by the theme.
- **Web Components (5):** `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-upsell-item>` — progressive enhancement via `SparkCartClient` GraphQL client.
- **Side cart:** Custom GraphQL-first `<spark-cart-drawer>` replaces the platform side cart. Event-driven `SparkSideCart` API (`open`, `close`, `toggle`).
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
ntk watch              # Watches files + auto-compiles Tailwind + runs sass-compat + pushes
ntk tailwind           # One-shot: compile Tailwind + sass-compat + push CSS
ntk tailwind --minify  # Production build: compile minified + push
make release           # Rebuild minified main.css and stage it for commit
make dev               # Legacy: Run Tailwind watcher + ntk watcher in parallel
make css               # Legacy: Compile Tailwind once
make build             # Legacy: Compile + minify for production
```

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

## Dashboard Integration
| Feature | Template Variable | Dashboard Path |
|---------|------------------|----------------|
| Top nav | `settings.main_menu.items` | Storefront > Navigation |
| Footer nav | `settings.footer_menu.items` | Storefront > Navigation |
| Logo | `store.branding.logo` | Settings > Branding |
| Icon/Favicon | `store.branding.icon` | Settings > Branding |
| Primary color | `store.branding.primary_color` | Settings > Branding |
| Accent color | `store.branding.accent_color` | Settings > Branding |
| Store name | `store.name` | Settings (general) |
| Tagline | `store.tagline` | Settings (general) |
| Contact info | `store.address`, `store.phone`, `store.email` | Settings (general) |

## Theme File Map

### Templates (15 merchant-facing + 3 error pages)
| File | Status |
|------|--------|
| `templates/index.html` | Homepage — hero (text overlay), featured products, featured categories, recommended products, On Sale, Promo Banner, Featured Product. Each section gated by its own setting toggle. |
| `templates/catalogue/product.html` | PDP — images, variants, `<spark-add-to-cart>` Web Component wrapping DTL form. App hooks: `product_rating_summary`, `product_reviews`, `product_review_cta`. |
| `templates/catalogue/category.html` | Category listing — product grid, skeleton loading, pagination. App hook: `collection_review_feed`. |
| `templates/catalogue/index.html` | All products catalogue |
| `templates/blog/index.html` | Blog listing — sidebar categories, search via `form.name` |
| `templates/blog/post.html` | Blog post detail |
| `templates/reviews/index.html` | Product reviews list |
| `templates/reviews/form.html` | Review submission form (extends reviews/index.html) |
| `templates/reviews/review.html` | Single review detail |
| `templates/support/index.html` | Support center |
| `templates/support/category.html` | Support category |
| `templates/support/article.html` | Support article |
| `templates/cart.html` | Cart page |
| `templates/search.html` | Search results |
| `templates/pages/page.html` | Generic CMS page |
| `templates/{403,404,500}.html` | Error pages |

### Key Partials
| File | Purpose |
|------|---------|
| `partials/header.html` | Responsive nav — mobile hamburger + desktop horizontal, logo, search/account/cart icons |
| `partials/footer.html` | 4-column grid: icon+tagline, footer menu, support links, contact info. Payment icons, currency/language, copyright, disclaimer |
| `partials/store_logo.html` | Shared logo partial — handles logo+icon, logo-only, icon-only, text fallback |
| `partials/side_cart.html` | Mounts `<spark-cart-drawer>` and wires `SparkSideCart` events. Replaces the platform side cart. |
| `partials/cart_content.html` | Shared cart line-items markup (used by cart page + side cart) |
| `partials/cart_summary.html` | Cart totals / promo / checkout CTA block |
| `partials/block_cart_progress_wrapper.html` | Wrapper that mounts `<spark-progress-bar>` with currency-aware thresholds |
| `partials/block_cart_progress_bar.html` | Progress-bar markup (free shipping, free gift milestones) |
| `partials/block_cart_upsell.html` | Side-cart upsell rail container |
| `partials/block_cart_upsell_item.html` | Single upsell slot — renders `<spark-upsell-item>` |
| `partials/recommended_products.html` | Recommended products section (homepage + PDP) |
| `partials/product_carousel.html` | Horizontal product carousel used by featured/recommended sections |
| `partials/catalogue_filters.html` | Category page facet filters |
| `partials/social_links.html` | Social media SVG icons (8 platforms) |
| `partials/product_card.html` | Reusable product card for grids — includes sale badge + `product_card_rating_summary` app hook |
| `partials/form_field.html` | Generic form field with label, errors, help text |
| `partials/pagination.html` | Tailwind-styled pagination |
| `partials/announcement_bar.html` | Dismissable announcement banner |
| `partials/account_only.html` | Gate that hides storefront when account-only mode is on |
| `partials/alert_messages.html` | Flash messages render |

### App Hooks (`{% app_hook 'NAME' %}`)
Stable extension surfaces for Apps. Reviews app uses these today; future Apps should target the same pattern rather than fork the theme.

| Hook | Where | Purpose |
|------|-------|---------|
| `global_social_proof` | `layouts/base.html` (footer) | Site-wide social proof widget |
| `global_footer` | `layouts/base.html` (footer) | Generic global footer surface |
| `home_review_feed` | `templates/index.html` | Homepage review feed |
| `collection_review_feed` | `templates/catalogue/category.html` | Bottom-of-category reviews module |
| `product_rating_summary` | `templates/catalogue/product.html` | Stars + count next to title |
| `product_reviews` | `templates/catalogue/product.html` | Full reviews module |
| `product_review_cta` | `templates/catalogue/product.html` | Write-a-review CTA |
| `product_card_rating_summary` | `partials/product_card.html` | Stars on product cards in grids |

### Settings (`configs/settings_schema.json`)
Typography (fonts, text/heading/link colors), Navigation (main menu, navbar colors), Footer (menu, colors, social links ×8, payment icons, disclaimer), Homepage sections (hero with text overlay, featured products/categories, recommended products, On Sale, Promo Banner, Featured Product — each with its own toggle), Announcement Bar, Advanced (noindex, account-only mode). v1.1 added 22 settings; restructured for section-level granularity.

## Known Issues & Gotchas
1. **Blog search** must use `{% include 'partials/form_field.html' with field=form.name %}` — the view passes a `form` context. Raw `<input>` crashes the template.
2. **Reviews breadcrumbs** need `{% if category %}` guard around `category.get_ancestors_and_self` — products without categories crash otherwise.
3. **`settings_data.json`** must explicitly set `"main_menu": "main_menu"` and `"footer_menu": "footer_menu"` — the `"default"` field in the schema isn't sufficient.
4. **Instagram typo**: The setting name is `instragram_link` (not `instagram_link`) — preserved from Intro Bootstrap for platform compatibility.
5. **Payment icons** multi-select uses `"type": "select"` with `"multi-select": true` — NOT a `"multi_select"` type (which doesn't exist).
6. **CDN caching**: CloudFront aggressively caches `assets/main.css` with a fixed `?v=` hash. Templates are server-rendered and not cached.
7. **Parent products** can't be added to cart — `product.html` has inline JS to rewrite form action to first child product ID.

## Delight Features (Phase 1)
- **Skeleton loading:** CSS-only shimmer animation on product grid cards during page load (`category.html`)
- **Contrast auto-detection:** JS in `<head>` measures `--primary-color` luminance, adds `data-light-primary` attribute for dark text on light backgrounds
- **Cart badge animation:** Scale pulse (300ms) on count change via `spark:cart:updated` CustomEvent
- **Keyboard navigation:** Tab through product grid cards (Enter to navigate), Escape closes mobile nav and side cart
- **Focus visible:** `outline: 2px solid var(--primary-color); outline-offset: 2px;` on all interactive elements
- **Print stylesheet:** `@media print` hides header/footer/sidecart/announcement bar
- **Image optimization:** `loading="lazy"` on below-fold images, `fetchpriority="high"` on hero images

## Design Principles
- Products are the design — generous whitespace, large photography
- System font stack — zero load time, native feel
- Sharp corners by default (0-2px). Only buttons and pills get rounding.
- Neutral palette — merchants add personality through branding colors and photography
- No decorative elements, no gradients, no blobs
- Every empty state has warmth, a primary action, and context
- Header: full logo (responsive with icon on mobile). Footer: icon preferred (compact).

## Web Components

### SparkCartClient (`assets/js/spark-cart.js`)
Vanilla JS class for GraphQL cart operations. Auto-creates cart on first add, handles CSRF, timeouts, retries.
- `new SparkCartClient(graphqlUrl)` - constructor
- `.createCart()` - create empty cart, stores ID in sessionStorage + cookie
- `.addToCart(productPk, quantity)` - add item (auto-creates cart if needed)
- `.updateQuantity`, `.removeItem`, `.applyVoucher`, `.removeVoucher` - mutations on existing cart
- Dispatches `spark:cart:updated` and `spark:cart:added` CustomEvents on `document` with `{cart, count, action}`

### `<spark-add-to-cart>` (`assets/js/components/spark-add-to-cart.js`)
Shadow DOM Web Component wrapping the DTL add-to-cart form. Progressive enhancement.
- Reads product ID from form action (`/cart/add/123/`) — updated by variant picker
- States: idle -> loading (spinner) -> success (checkmark, 2s) -> idle
- Error: shake animation + red error message below button
- No-JS fallback: form submits normally via POST

### `<spark-cart-drawer>` (`assets/js/components/spark-cart-drawer.js`)
Custom side cart replacing the platform's side cart. Shadow DOM for isolation, Tailwind utilities in the light DOM shell.
- Listens: `spark:cart:added` (open + render), `spark:cart:toggle`, `spark:cart:updated` (re-render)
- Dispatches `spark:cart:updated` after quantity / remove / voucher mutations
- All cart operations go through `SparkCartClient` — no platform JS
- Public API exposed as `window.SparkSideCart` with `open()` / `close()` / `toggle()`
- HTML escaping built in (XSS prevention on rendered cart data)

### `<spark-progress-bar>` (`assets/js/components/spark-progress-bar.js`)
Multi-step progress bar for cart milestones (free shipping, free gift). Currency-aware thresholds set by DTL data attributes.
- Dispatches: `spark:progress:shipping-reached` / `-unreached`, `spark:progress:gift-reached` / `-unreached`
- Cart drawer listens for gift events to auto-add / auto-remove the free gift product
- Light DOM styles for slotted message text; component-level styles in Shadow DOM

### `<spark-quantity>` (`assets/js/components/spark-quantity.js`)
Shadow DOM quantity stepper: [-] | input | [+]
- Attributes: `min`, `max`, `value`
- Dispatches `change` event with `detail.value`
- Inherits `--primary-color` via CSS custom properties

### `<spark-upsell-item>` (`assets/js/components/spark-upsell-item.js`)
Single upsell slot rendered into the side cart. DTL renders product data (image, title, price, variant select); JS handles the Add click via `SparkCartClient`.
- Hidden by default; cart drawer shows/hides slots based on `cart_upsell_slots` product metadata
- Light DOM (so theme styles apply to slotted markup)

### CRITICAL: JS Asset Files
**NEVER use non-ASCII characters in JS asset files.** The platform processes JS through its template engine:
- No `{{ }}` or `{% %}` in comments (treated as DTL tags -> 500 error)
- No Unicode em dashes, arrows, box drawing characters (causes CDN 500)
- Use ASCII-only: `-` instead of `—`, `->` instead of `→`, `\u2713` instead of `✓`

## What's Deferred
- **Checkout template** (`checkout/checkout.html`) — requires deeper platform understanding
- **Theme Marketplace / sections API** — packaging Spark sections as installable units. Tracked in `TODOS.md`.
- **Preview-mode placeholder suppression** — needs a platform-side context variable to distinguish editor from live render. Tracked in `TODOS.md`.
- **Dark mode** — Tailwind makes it trivial, not needed for v1

## Push Convention
Only push changed files: `ntk push templates/index.html`
Never push the entire theme.

## Reference Theme
The Intro Bootstrap theme at `/Users/devin/Developer/Themes/Intro Bootstrap/` is the reference for DTL patterns, available template tags/filters, URL names, and context variables. When in doubt about what variables a view provides, check the equivalent Intro Bootstrap template.
