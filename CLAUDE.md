# Spark — NEXT Commerce Theme

## Overview
Spark is a modern starter theme for NEXT Commerce storefronts. Tailwind CSS + vanilla JS. Clean, minimal commerce aesthetic. Intended to replace Intro Bootstrap as the default starter theme and become a product in its own right.

**Repo:** `NextCommerceCo/spark` (private)
**Dev store:** `https://keer.29next.store` — theme ID 133
**ntk config:** `config.yml` (gitignored, contains API key)

## Stack
- **CSS:** Tailwind CSS v4.2.2 (standalone CLI binary `./tailwindcss`, no Node dependency)
- **JS:** Vanilla JS — self-contained script tags, no bundler
- **Templates:** Django Template Language (DTL)
- **Icons:** SVG partials in `partials/icons/`
- **jQuery:** Still loaded — platform's `{% core_js %}` requires it. Goal is to remove eventually.

## CSS Pipeline
```
css/input.css → [tailwindcss CLI] → assets/main.css → [sass-compat.py] → [ntk push] → store
```

- Tailwind v4 uses CSS-based config. All theme tokens, custom colors, and component styles live in `css/input.css` using `@theme`, `@layer base`, and `@layer components`.
- `scripts/sass-compat.py` post-processes the output to strip `@property` declarations, convert `oklch()` to hex, and replace `color-mix()` — necessary because ntk's CSS parser doesn't support these modern CSS features.
- After any change to `css/input.css`, you must: compile → sass-compat → push:
  ```bash
  ./tailwindcss -i css/input.css -o assets/main.css --minify
  python3 scripts/sass-compat.py assets/main.css
  ntk push assets/main.css
  ```

## Development
```bash
make dev        # Run Tailwind watcher + ntk watcher in parallel
make css        # Compile Tailwind once
make build      # Compile + minify for production
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

### Templates (15)
| File | Status |
|------|--------|
| `templates/index.html` | Homepage — hero, featured products/categories |
| `templates/catalogue/product.html` | PDP — images, variants, add-to-cart, parent→child rewrite |
| `templates/catalogue/category.html` | Category listing — product grid, filters, pagination |
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

### Key Partials
| File | Purpose |
|------|---------|
| `partials/header.html` | Responsive nav — mobile hamburger + desktop horizontal, logo, search/account/cart icons |
| `partials/footer.html` | 4-column grid: icon+tagline, footer menu, support links, contact info. Payment icons, currency/language, copyright, disclaimer |
| `partials/store_logo.html` | Shared logo partial — handles logo+icon, logo-only, icon-only, text fallback |
| `partials/side_cart.html` | Platform side cart JS integration |
| `partials/social_links.html` | Social media SVG icons (8 platforms) |
| `partials/product_card.html` | Reusable product card for grids |
| `partials/form_field.html` | Generic form field with label, errors, help text |
| `partials/pagination.html` | Tailwind-styled pagination |
| `partials/announcement_bar.html` | Dismissable announcement banner |

### Settings (`configs/settings_schema.json`)
Typography (fonts, text/heading/link colors), Navigation (main menu, navbar colors), Footer (menu, colors, social links ×8, payment icons, disclaimer), Homepage (featured products/categories, hero), Announcement Bar, Advanced (noindex, account-only mode).

## Known Issues & Gotchas
1. **Blog search** must use `{% include 'partials/form_field.html' with field=form.name %}` — the view passes a `form` context. Raw `<input>` crashes the template.
2. **Reviews breadcrumbs** need `{% if category %}` guard around `category.get_ancestors_and_self` — products without categories crash otherwise.
3. **`settings_data.json`** must explicitly set `"main_menu": "main_menu"` and `"footer_menu": "footer_menu"` — the `"default"` field in the schema isn't sufficient.
4. **Instagram typo**: The setting name is `instragram_link` (not `instagram_link`) — preserved from Intro Bootstrap for platform compatibility.
5. **Payment icons** multi-select uses `"type": "select"` with `"multi-select": true` — NOT a `"multi_select"` type (which doesn't exist).
6. **CDN caching**: CloudFront aggressively caches `assets/main.css` with a fixed `?v=` hash. Templates are server-rendered and not cached.
7. **Parent products** can't be added to cart — `product.html` has inline JS to rewrite form action to first child product ID.

## Design Principles
- Products are the design — generous whitespace, large photography
- System font stack — zero load time, native feel
- Sharp corners by default (0-2px). Only buttons and pills get rounding.
- Neutral palette — merchants add personality through branding colors and photography
- No decorative elements, no gradients, no blobs
- Every empty state has warmth, a primary action, and context
- Header: full logo (responsive with icon on mobile). Footer: icon preferred (compact).

## What's Deferred
- **Checkout template** (`checkout/checkout.html`) — requires deeper platform understanding
- **Web Component side cart** — GraphQL + custom elements, replacing platform JS dependency
- **Expanded settings** — cart, checkout, product listing, buttons
- **Dark mode** — Tailwind makes it trivial, not needed for v1
- **Remove jQuery** — blocked by platform's `{% core_js %}`

## Push Convention
Only push changed files: `ntk push templates/index.html`
Never push the entire theme.

## Reference Theme
The Intro Bootstrap theme at `/Users/devin/Developer/Themes/Intro Bootstrap/` is the reference for DTL patterns, available template tags/filters, URL names, and context variables. When in doubt about what variables a view provides, check the equivalent Intro Bootstrap template.
