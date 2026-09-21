# Spark App Hooks

Spark exposes a fixed set of `{% app_hook 'NAME' %}` locations so an App can render storefront snippets without editing theme files. This page is the contract: every hook Spark ships, where each one renders, what surrounds it, and the rules for naming and changing hooks.

An App targets a hook by naming it under `locations.storefront` in its `manifest.json`; the platform's App Snippets guide covers that side. Spark's job is to keep the hook names and their positions stable.

## Inventory

Thirteen hook sites across four files. "Once per page" means the hook renders exactly once when its template renders; "per card" means it renders inside a loop, once for every product card on the page.

### Global (`layouts/base.html`)

Every Spark page extends `layouts/base.html`, so these three render on every page.

| Hook | Renders | Surrounding DOM | Frequency |
| --- | --- | --- | --- |
| `global_header` | Last child of `<head>`, after the `custom_css` and `extrahead` blocks, inside `{% block head_app_hooks %}`. | Head only. Nothing here is visible; it exists for platform-critical scripts and styles that must load before the body renders. Prefer the footer hooks for anything else (see `docs/performance-load-order.md`). | Once per page |
| `global_social_proof` | End of `<body>`, after the theme script stack (`scripts`, `component_scripts`, `extrascripts`, `delight_scripts`), inside `{% block footer_app_hooks %}`. | Follows all page content and every theme `<script>`. The next sibling is `global_footer`. | Once per page |
| `global_footer` | Immediately after `global_social_proof` in the same block, before `{% block tracking %}` and `</body>`. | The last extension point on the page. Runs after all Spark JS and after `{% pixels %}` (rendered earlier in the `pixels` block). | Once per page |

`global_header` and `global_footer` are the two locations the platform's theme Tag Reference documents for every theme. Spark carries both; a derived theme must keep them.

### Homepage (`templates/index.html`)

| Hook | Renders | Surrounding DOM | Frequency |
| --- | --- | --- | --- |
| `home_review_feed` | Inside `<main id="main-content">`, after the last homepage section partial (`section_promo_banner`), immediately before `</main>`. | Follows the six fixed-order homepage sections. Not rendered when Theme Settings > Advanced > Account Only is on, because the whole `<main>` is replaced by the account-only partial. | Once per page |

### Category (`templates/catalogue/category.html`)

| Hook | Renders | Surrounding DOM | Frequency |
| --- | --- | --- | --- |
| `collection_review_feed` | Inside the page's outer `.container`, after the filter rail + product grid wrapper closes and before the sticky mobile filter bar include (`partials/catalogue_bar.html`). | Full-width position below the product grid and its pagination (or the empty-state block when the category has no products). | Once per page |

### Product detail (`templates/catalogue/product.html`)

The first five are inside `{% block content %}`; the last two are at the end of `{% block extrascripts %}`, which `base.html` renders after the theme's own component scripts and before `delight_scripts`.

| Hook | Renders | Surrounding DOM | Frequency |
| --- | --- | --- | --- |
| `product_rating_summary` | In the product info column (`div.md:col-span-2 > div.md:sticky`), directly after the `<h1>` product title. | Precedes Spark's built-in star rating link (shown when `product_reviews` is enabled and the product has a rating). An App that renders its own summary here should expect that native block to follow it. | Once per page |
| `product_info` | Last child of the sticky product info column, after the description block. | Follows the add-to-cart form, variant picker, and description. Suited to tabs, specs, or trust content that belongs with the product info. | Once per page |
| `product_footer` | After the two-column gallery + info grid closes, as the last child of the PDP `.container`. | Full-width position below the gallery and info columns, before the recommended products partial. | Once per page |
| `product_reviews` | Top level of `{% block content %}`, after the recommended products include. | Immediately precedes `product_review_cta`, then Spark's own `<section id="reviews">` (rendered when `product_reviews` is enabled). An App replacing the reviews module renders here and the merchant turns off the Theme Settings toggle. | Once per page |
| `product_review_cta` | Immediately after `product_reviews`. | Same position; intended for a "write a review" call to action that sits above the reviews list. | Once per page |
| `view_product` | End of `{% block extrascripts %}`, after the sticky add-to-cart script. | Script position. Nothing visible surrounds it; use it for product-view tracking that needs the PDP context. | Once per page |
| `add_to_cart` | Immediately after `view_product`. | Script position, same as above. Intended for add-to-cart tracking. Spark's add-to-cart dispatches `spark:cart:added` on `document` (see `docs/cart-events.md`), which a snippet here can listen for. | Once per page |

### Product card (`partials/product_card.html`)

| Hook | Renders | Surrounding DOM | Frequency |
| --- | --- | --- | --- |
| `product_card_rating_summary` | Inside the card's outer `<a class="product-card">`, between `div.product-title` and `div.product-price`. | The whole card is a link, so a snippet here must not render its own `<a>` or interactive controls. Do not assume the product is buyable: by default the card renders for a sold-out product with a Sold out badge, and the `product_card_sold_out_style` Theme Setting can mute or hide it. A snippet here should read the product, not the purchase state. | Per card |

The product card is included by `partials/product_grid.html`, `partials/recommended_products.html`, `partials/section_featured_products.html`, `partials/section_on_sale.html`, `templates/catalogue/index.html`, `templates/catalogue/category.html`, and `templates/search.html`, so this hook can render many times on the homepage, category, search, and PDP (via recommended products).

## Naming Convention

Hook names are `snake_case` and follow `<surface>_<purpose>`:

- `<surface>` names where the hook lives, not which App it serves: `global`, `home`, `collection`, `product`, `product_card`. A new page surface gets a new prefix (for example `cart_`, `search_`, `blog_`).
- `<purpose>` names the kind of content expected there: `rating_summary`, `review_feed`, `info`, `footer`, `review_cta`, `social_proof`.
- Two hooks are the exception: `view_product` and `add_to_cart` are event names, not positions. They exist for tracking snippets and match the platform event vocabulary. Do not add more hooks of this shape; a new tracking need belongs in `global_footer` with the `spark:*` DOM events.
- Never name a hook after an App or a merchant. `product_reviews` is fine; `<vendor>_reviews` is not.
- One hook per position. If two Apps need the same spot, they share the hook; the platform renders every App targeting a location.

## Versioning And Stability

- **Existing hook names are stable.** An App that targets a hook listed above keeps working across Spark releases.
- **Positions are stable in spirit, not in pixels.** A hook keeps its surface and its neighbours (for example `product_rating_summary` stays directly after the PDP title) but the surrounding classes and markup can change with the theme's design. Snippets should style themselves and not depend on Spark utility classes around them.
- **New hooks are additive.** Adding a hook is a minor change, noted in `CHANGELOG.md` and added to the inventory above in the same PR.
- **Renames and removals are breaking.** Renaming or removing a hook requires a deprecation period: the old hook name stays in place, rendering alongside the new one, for at least one minor release after the new name ships. The changelog entry names both hooks and the release in which the old one will be removed.
- **Derived themes** are expected to carry every hook in this inventory. `theme-contract.json` and `scripts/check-theme-contract.py` gate platform integration points; hooks are candidates for that contract as Apps come to depend on them.

## Adding A Hook

1. Pick the name from the convention above and check it is not already taken.
2. Put the `{% app_hook %}` tag as close as possible to the DOM it extends, and outside any loop unless a per-item hook is the point.
3. Add a row to the inventory here with the file, position, surrounding DOM, and frequency.
4. Add a changelog entry under Unreleased.

## Related

- `docs/extending-spark.md` for choosing between hooks, events, settings, and Web Components.
- `docs/performance-load-order.md` for why the head hook is reserved and footer hooks are preferred.
- `docs/cart-events.md` for the `spark:cart:*` events an App snippet can listen to.
