# QA Fixtures

A named set of content states for real-content QA. Two people running the
same checklist against two dev stores seeded from this catalogue test the
same things, and a checklist can say `FX-P01` instead of "a product with a
long name".

Each state has a stable id. The id is the contract: checklists in
`docs/section-specs/` and `docs/pdp-customization.md` reference ids, and
`tests/fixtures/qa-fixtures.json` lists the same states for a future seeding
script. `tests/test_qa_fixtures.py` fails when the two drift.

## Conventions

- Ids are `FX-<group letter><two digits>` followed by a slug:
  `P` product, `C` collection (category), `T` text content (pages), `K` cart,
  `N` navigation, `S` section settings.
- Every fixture product carries an SKU starting with `FX-` and lives under a
  parent category `QA Fixtures` (slug `qa-fixtures`), except where the state
  is about *not* having a category. That keeps fixture content identifiable
  and removable in one sweep.
- Field names below follow the Admin API field names from the
  [product management guide](https://developers.nextcommerce.com/docs/admin-api/guides/product-management).
  The dashboard uses the same concepts; its exact form labels were not
  verified while writing this doc, so treat them as unverified.
- Prices are shown in USD. If the dev store's default currency differs, use
  that currency and keep the numbers.
- Images: any PNG works. A 1200x1200 solid-colour square with the image
  number drawn on it makes gallery order and thumbnail selection verifiable
  at a glance. Do not use copyrighted or merchant photography.
- The platform's default `usd_goal_1` (free shipping) is 50 and
  `usd_goal_2` (free gift) is 100. Cart states assume those defaults.

## Product states

### FX-P01 long-name-product

A product whose title is 124 characters, to exercise wrapping in cards,
breadcrumbs, the PDP `h1`, the sticky mobile add-to-cart bar, and cart lines.

| Field | Value |
| --- | --- |
| `title` | `Everyday Organic Cotton Crew Neck Long Sleeve Layering Tee with Reinforced Seams, Tagless Label and a Pre-Shrunk Relaxed Fit` |
| `description` | `<p>Fixture product with a deliberately long title.</p>` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P01` |
| `variants[0].prices` | `USD 24.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image, `display_order 0` |

Exercises: `partials/product_card.html`, `templates/catalogue/product.html`
(`h1`, breadcrumb, `#sticky-atc`), `partials/cart_content.html`,
`assets/js/spark-cart-drawer-renderer.js` (`.spark-drawer-item-title`).

Check: no horizontal overflow at 375px; the card grid row heights stay
aligned; the sticky bar truncates or wraps without hiding the button.

### FX-P02 missing-primary-image

A purchasable product with no images at all.

| Field | Value |
| --- | --- |
| `title` | `Fixture Product Without Images` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P02` |
| `variants[0].prices` | `USD 18.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | none |

Exercises: `partials/product_card.html` (`product.no_image` placeholder),
`templates/catalogue/product.html` (gallery placeholder branch, no
`critical_preloads` image), `partials/section_featured_product.html`,
`partials/cart_content.html` (line image on a product with no primary image),
`assets/js/spark-cart-drawer-renderer.js` (image omitted).

Check: the placeholder matches image tile height in grids; the PDP does not
emit a broken `<link rel="preload">`; the cart line and drawer line render
without a broken `<img>`.

### FX-P03 single-image

One image, so the gallery has no thumbnail strip and no prev/next controls.

| Field | Value |
| --- | --- |
| `title` | `Fixture Product With One Image` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P03` |
| `variants[0].prices` | `USD 18.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image, `display_order 0` |

Exercises: `templates/catalogue/product.html` (`images|length > 1` guards),
`assets/js/spark-gallery.js`.

Check: no empty thumbnail strip, no arrows, keyboard focus on the gallery
region does nothing surprising.

### FX-P04 many-images

Twelve images, to exercise thumbnail strip overflow and the `left` gallery
layout.

| Field | Value |
| --- | --- |
| `title` | `Fixture Product With Twelve Images` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P04` |
| `variants[0].prices` | `USD 18.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 12 images numbered 01-12, `display_order` 0-11 |

Exercises: `templates/catalogue/product.html` thumbnail strip,
`assets/js/spark-gallery.js`, theme setting `product_gallery_layout`
(`bottom` and `left`).

Check: the strip scrolls or wraps without pushing the product info column;
arrows wrap from 12 back to 1; `aria-current` follows the active thumb.

### FX-P05 large-variant-matrix

Three attributes with four values each, all 64 combinations created and in
stock.

| Field | Value |
| --- | --- |
| `title` | `Fixture Product With 64 Variants` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variant_attributes` | `Colour: Black, White, Navy, Sand` / `Size: XS, S, M, L` / `Material: Cotton, Linen, Wool, Blend` |
| variants | one per combination, SKU `FX-P05-<colour>-<size>-<material>` |
| each variant `prices` | `USD 30.00` |
| each variant `stockrecords` | `num_in_stock 10` |
| images | 2 images |

Exercises: `partials/variant_picker.html` in `select`, `radio`, and `chips`
styles, `assets/js/spark-variant-state.js`, `#product-data` size.

Check: every picker style stays usable at 375px; changing any option updates
price and form action; page weight of `#product-data` is acceptable.

### FX-P06 single-variant

A product with no `variant_attributes`, so the PDP has no picker and the
add-to-cart form targets the default variant.

| Field | Value |
| --- | --- |
| `title` | `Fixture Single Variant Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P06` |
| `variants[0].prices` | `USD 12.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image |

Exercises: `templates/catalogue/product.html` (`firstof
product.children.first.pk product.pk`), no-JavaScript form submit path in
`docs/pdp-customization.md`.

Check: no empty picker region renders; the native form adds the product with
JavaScript disabled.

### FX-P07 sold-out-parent

Every variant tracks stock, has zero stock, and does not allow backorders.

| Field | Value |
| --- | --- |
| `title` | `Fixture Sold Out Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variant_attributes` | `Size: S, M` |
| both variants | `track_stock true`, `allow_backorders false`, `stockrecords.num_in_stock 0`, `prices USD 20.00` |
| images | 1 image |

Exercises: `templates/catalogue/product.html` (`out_of_stock` branch, no
`#sticky-atc`), `partials/product_card.html`.

Check: the PDP shows the out-of-stock message and no add-to-cart form.
Current behaviour: `product_card.html` renders nothing for a product that is
not available to buy, so this product is absent from the category grid; note
whether that is intended for the theme under test.

### FX-P08 partially-sold-out-variants

One attribute with three values, the middle value sold out.

| Field | Value |
| --- | --- |
| `title` | `Fixture Partially Sold Out Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variant_attributes` | `Size: S, M, L` |
| `S` and `L` | `num_in_stock 10`, `prices USD 20.00` |
| `M` | `track_stock true`, `allow_backorders false`, `num_in_stock 0`, `prices USD 20.00` |
| images | 1 image |

Exercises: `partials/variant_picker.html` chips
(`data-variant-unavailable`, `[data-variant-option-status]`),
`assets/js/theme.js` add-to-cart disabled state, `spark:variant:changed`.

Check: `M` is still selectable but marked unavailable and the button
disables; switching back to `S` re-enables it; the status text is announced.

### FX-P09 free-product

A zero-price product. Also the product to select as the free gift for
FX-K04.

| Field | Value |
| --- | --- |
| `title` | `Fixture Free Sample` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P09` |
| `variants[0].prices` | `USD 0.00` |
| `variants[0].stockrecords` | `num_in_stock 1000` |
| images | 1 image |

Exercises: `partials/product_card.html` and `templates/catalogue/product.html`
zero-price rendering (`session.price.exists` is true, the value is 0),
`assets/js/spark-cart-rewards.js` gift line. For the missing-price branch use
FX-P13.

Check: record whether the price renders as `$0.00` or is hidden, and that
whichever it is looks intentional in card, PDP, sticky bar, and cart.

### FX-P10 sale-price

Retail (compare-at) price above the selling price.

| Field | Value |
| --- | --- |
| `title` | `Fixture Sale Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P10` |
| `variants[0].prices` | `USD price 15.00, retail 25.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image |

Exercises: `partials/product_card.html` sale badge and strike-through,
`templates/catalogue/product.html` `data-price-retail`,
`partials/section_on_sale.html`.

Check: the badge does not overlap the image focal area; the compare-at price
is struck through and smaller in every surface.

### FX-P11 subscription-enabled

A product that offers one-time or subscribe-and-save purchase.

| Field | Value |
| --- | --- |
| `title` | `Fixture Subscription Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `enable_subscription` | `true` |
| `interval` | `month` |
| `interval_counts` | `[1, 2, 3]` |
| `variants[0].sku` | `FX-P11` |
| `variants[0].prices` | `USD price 20.00, subscription 17.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image |

Exercises: `<spark-subscription>` in `templates/catalogue/product.html`,
`partials/cart_content.html` subscription range field,
`partials/cart_summary.html` subscription totals.

Check: the selector renders only on this product; choosing a frequency is
required before add-to-cart succeeds; the cart shows the subscription line.

### FX-P12 no-category

A public product assigned to no category, reachable only by direct URL.

| Field | Value |
| --- | --- |
| `title` | `Fixture Uncategorised Product` |
| `is_public` | `true` |
| `categories` | `[]` |
| `variants[0].sku` | `FX-P12` |
| `variants[0].prices` | `USD 18.00` |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image |

Exercises: `templates/catalogue/product.html` breadcrumb,
`templates/reviews/*.html` (`{% if category %}` guard, CLAUDE.md gotcha 2),
`partials/recommended_products.html`.

Check: PDP and review pages render without a server error; the breadcrumb
degrades cleanly.

### FX-P13 no-price

A public product whose variant has no price record, so `session.price.exists`
is false. Distinct from FX-P09, which has a price of zero.

| Field | Value |
| --- | --- |
| `title` | `Fixture Unpriced Product` |
| `is_public` | `true` |
| `categories` | `qa-fixtures/products` |
| `variants[0].sku` | `FX-P13` |
| `variants[0].prices` | none: create the variant without a price record (the JSON mirror omits the `price` key rather than sending `null`) |
| `variants[0].stockrecords` | `num_in_stock 100` |
| images | 1 image |

Exercises: the `session.price.exists` guards in `partials/product_card.html`,
`templates/catalogue/product.html`, and `partials/section_featured_product.html`
(no empty price row, no add-to-cart on an unpriced product).

## Collection states

Collections are categories. Create them nested under `qa-fixtures` so the
slug tells you the state.

### FX-C01 empty-collection

| Field | Value |
| --- | --- |
| `name` | `Fixture Empty Collection` |
| `slug` | `qa-fixtures/empty` |
| `is_public` | `true` |
| products | none |

Exercises: `templates/catalogue/category.html` empty branch
(`store.catalogue.none_found`), `partials/catalogue_filter_button.html`
placement when there is no grid, `partials/section_featured_categories.html`.

Check: the empty state has a primary action; no skeleton cards stay visible;
the sticky filter bar never appears.

### FX-C02 one-product-collection

| Field | Value |
| --- | --- |
| `name` | `Fixture One Product Collection` |
| `slug` | `qa-fixtures/one` |
| `is_public` | `true` |
| products | `FX-P03` |

Exercises: `partials/product_grid.html` with a single card,
`partials/section_featured_products.html` when the selected list is short.

Check: one card does not stretch to full width; no pagination renders.

### FX-C03 three-product-collection

| Field | Value |
| --- | --- |
| `name` | `Fixture Three Product Collection` |
| `slug` | `qa-fixtures/three` |
| `is_public` | `true` |
| products | `FX-P01`, `FX-P02`, `FX-P10` |

Exercises: the product grid with a long title, a missing image, and a sale
badge side by side; `partials/section_on_sale.html` and
`partials/section_featured_products.html` selected-product lists.

Check: the three cards align on title baseline and image height despite
different content.

### FX-C04 paginated-collection

Sixty simple products so the category paginates at any page size up to 50.

| Field | Value |
| --- | --- |
| `name` | `Fixture Paginated Collection` |
| `slug` | `qa-fixtures/paginated` |
| `is_public` | `true` |
| products | 60 products titled `Fixture Paginated Product 01` to `60`, SKU `FX-C04-01` to `FX-C04-60`, `USD 10.00`, `num_in_stock 100`, 1 image each |

Exercises: `partials/pagination.html` (`add_query_param`),
`partials/catalogue_bar.html` sticky opener on a long grid,
`assets/js/spark-catalogue.js`, `docs/catalogue-filters.md` filter
preservation across pages.

Check: page links preserve active filters; the sticky filter bar appears only
while the grid is scrolled and is `inert` when hidden. If all 60 render on
one page, record the page size and raise the count.

### FX-C05 long-collection-name

| Field | Value |
| --- | --- |
| `name` | `Seasonal Clearance and Last Chance Essentials for Home, Kitchen, Garden and Outdoor Living` |
| `slug` | `qa-fixtures/long-name` |
| `is_public` | `true` |
| `image` | 1 image |
| products | `FX-P06` |

Exercises: `templates/catalogue/category.html` `h1` and breadcrumb,
`partials/section_featured_categories.html` tile label,
`partials/header.html` and `partials/mobile_menu.html` when linked from the
menu.

Check: the tile label wraps inside the tile at every column count; the
breadcrumb does not push the page wider than the viewport.

### FX-C06 no-image-collection

| Field | Value |
| --- | --- |
| `name` | `Fixture Collection Without Image` |
| `slug` | `qa-fixtures/no-image` |
| `is_public` | `true` |
| `image` | none |
| products | `FX-P06` |

Exercises: `partials/section_featured_categories.html` missing-image
placeholder.

Check: the placeholder tile matches the height of image tiles in the same
row.

## Content states

Pages are created under the dashboard's storefront pages (Admin API
`pagesCreate`). Link each one from the footer menu so it is reachable.

### FX-T01 long-page

| Field | Value |
| --- | --- |
| `title` | `Fixture Long Page` |
| `slug` | `fixture-long-page` |
| content | 30 paragraphs of roughly 120 words each (about 3,600 words), plain `<p>` only |

Exercises: `templates/pages/page.html` (`max-w-2xl` reading column),
`layouts/base.html` footer position after long content.

Check: line length and spacing stay readable at 375px and 1440px; the
skip-to-content link still lands on the content block.

### FX-T02 rich-page

| Field | Value |
| --- | --- |
| `title` | `Fixture Rich Page` |
| `slug` | `fixture-rich-page` |
| content | `<h2>`, `<h3>`, a `<ul>` of 5 items, an `<ol>` of 5 items, a 4-column `<table>` with 6 rows, a `<blockquote>`, an inline `<a>`, and one `<img>` wider than the column |

Exercises: `templates/pages/page.html` `page.content|safe` styling for
headings, lists, tables, and images.

Check: headings have a visible hierarchy; list markers render; the table
scrolls or wraps instead of overflowing; the wide image is constrained.

### FX-T03 empty-page

| Field | Value |
| --- | --- |
| `title` | `Fixture Empty Page` |
| `slug` | `fixture-empty-page` |
| content | empty |

Exercises: `templates/pages/page.html` with only a title.

Check: the page renders title, breadcrumb, and footer with no collapsed or
zero-height content area that looks broken.

## Cart states

Cart states are shopper session state, seeded from the storefront, not the
dashboard. Start every cart state from a fresh private window unless the
state says otherwise. They assume `enable_progress_bar` is on with the
default thresholds (`usd_goal_1` 50, `usd_goal_2` 100), `gift_product` set to
FX-P09, and `sidecart_open_on_add` on.

### FX-K01 empty-cart

| Step | Value |
| --- | --- |
| 1 | Open the storefront in a fresh private window. |
| 2 | Open the side cart from the header, then open `/cart/`. |

Exercises: `partials/side_cart.html` and
`assets/js/spark-cart-drawer-renderer.js` empty state (`emptyTitle`),
`templates/cart.html` empty branch, `assets/js/spark-cart-rewards.js`
`hideUpsells`.

Check: both empty states have warmth, a primary action, and no upsell or
progress bar.

### FX-K02 one-line-cart

| Step | Value |
| --- | --- |
| 1 | From FX-K01, add FX-P06 with quantity 1. |

Exercises: drawer line rendering, header cart badge (`spark:cart:updated`),
`partials/cart_content.html` single line, progress bar below the first
threshold (`step_1_message`).

Check: the badge shows 1; the progress bar shows the remaining amount to free
shipping; quantity controls work in the drawer and on `/cart/`.

### FX-K03 many-lines-cart

| Step | Value |
| --- | --- |
| 1 | Add one each of FX-P01, FX-P02, FX-P03, FX-P04, FX-P05 (any variant), FX-P06, FX-P08 (`S`), FX-P10, FX-P11 (one-time), and FX-C04-01. |

Ten lines.

Exercises: drawer scrolling with the summary pinned, `/cart/` formset with
many rows, `partials/cart_summary.html`.

Check: the drawer body scrolls while the checkout button stays visible; the
`/cart/` update form handles all rows; totals match.

### FX-K04 gift-threshold-reached

| Step | Value |
| --- | --- |
| 1 | From FX-K01, add FX-P05 (any variant, `USD 30.00`) with quantity 4 (`USD 120.00`). |

Exercises: `<spark-progress-bar>` `spark:progress:gift-reached`,
`assets/js/spark-cart-rewards.js` `toggleGift` and `giftState`,
`final_step_message`.

Check: the FX-P09 gift line is added once, marked as a gift, and removed
again when quantity drops to 3 (`USD 90.00`).

### FX-K05 shipping-threshold-reached

| Step | Value |
| --- | --- |
| 1 | From FX-K01, add FX-P05 (any variant, `USD 30.00`) with quantity 2 (`USD 60.00`). |

Exercises: `spark:progress:shipping-reached`, `step_2_message` between
thresholds.

Check: the bar shows the remaining amount to the gift threshold and no gift
line is added; dropping to quantity 1 (`USD 30.00`) fires
`spark:progress:shipping-unreached`.

### FX-K06 long-name-line

| Step | Value |
| --- | --- |
| 1 | From FX-K01, add FX-P01 with quantity 2. |

Exercises: `.spark-drawer-item-title` wrapping beside the remove control,
`partials/cart_content.html` `line.description`, the `Remove {title}`
accessible label.

Check: the title wraps without pushing price or remove control out of the
line; the drawer width does not change.

## Navigation states

Menus are built in the dashboard's navigation menus and selected through the
theme setting `main_menu`. No Admin API endpoint for menus was found, so
these are manual only.

### FX-N01 deep-menu

A menu with three levels. Spark renders two (`item.items`); the third level
should degrade, not break.

| Level | Items |
| --- | --- |
| 1 | `Shop`, `Fixtures`, `Pages` |
| 2 under `Fixtures` | `FX-C03` (three products), `FX-C04` (paginated), `FX-C05` (long name), `FX-C01` (empty) |
| 3 under `FX-C05` | `Nested Child A`, `Nested Child B` |
| 2 under `Pages` | `FX-T01`, `FX-T02`, `FX-T03` |

Exercises: `partials/header.html` `.nav-submenu`,
`partials/mobile_menu.html` nested `<ul>`, `assets/js` mobile nav
(`tests/js/mobile-nav.test.js` covers the script).

Check: level 2 opens on hover and keyboard focus on desktop; level 3 is
either reachable or cleanly absent on both desktop and mobile; `aria-current`
lands on the right item.

### FX-N02 long-menu-labels

| Level | Label |
| --- | --- |
| 1 | `Everything for Home, Garden and Outdoor Living` (46 chars) |
| 2 under it | `Seasonal Clearance and Last Chance Essentials for the Whole Household` (69 chars) |

Exercises: `partials/header.html` desktop nav row wrapping and the fixed
`w-56` submenu width, `partials/mobile_menu.html`.

Check: the desktop nav does not push the cart icon off screen at 1024px; the
submenu label wraps inside `w-56`; the mobile list wraps.

## Section settings states

These are theme-settings states, not catalogue content, listed here so the
section specs can reference them by id. Set them in the theme editor for the
QA theme only; do not push `configs/settings_data.json` changes.

### FX-S01 hero-long-copy

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_image` | landscape image |
| `homepage_hero_heading` | 100 characters: `Fixture heading that runs to exactly one hundred characters so wrapping and collision can be checked` |
| `homepage_hero_subheading` | 200 characters: repeat `Fixture subheading copy that fills the field. ` until the field limit is reached |
| `homepage_hero_content_width` | each of `narrow`, `medium`, `wide`, `full` |
| `homepage_hero_cta` | `Shop now` with `homepage_hero_link` set |

Exercises: `partials/section_hero.html` content layer.

### FX-S02 hero-no-cta

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_image` | landscape image |
| `homepage_hero_link` | empty |
| `homepage_hero_cta` | `Shop now` |

Exercises: `partials/section_hero.html` CTA guard, `partials/cta_button.html`.

### FX-S03 hero-image-only

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_heading`, `homepage_hero_subheading`, `homepage_hero_link` | all empty |
| `homepage_hero_image` | set |

### FX-S04 hero-heading-only

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_image` | landscape image |
| `homepage_hero_heading` | `Fixture heading only` |
| `homepage_hero_subheading`, `homepage_hero_link` | empty |

### FX-S05 hero-missing-image

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_image` | empty |

Exercises: the image guard in `partials/section_hero.html`; the section
renders the dashed setup placeholder (with the settings pointer) instead of
the hero, and never a broken image or an empty band.

### FX-S06 hero-mobile-fallback

| Setting | Value |
| --- | --- |
| `show_hero` | `true` |
| `homepage_hero_image` | landscape image |
| `homepage_hero_image_mobile` | empty |

Exercises: the `<source>` fallback below 768px.

### FX-S07 promo-long-copy

| Setting | Value |
| --- | --- |
| `show_promo_banner` | `true` |
| `promo_banner_heading` | the FX-S01 100-character heading |
| `promo_banner_subheading` | the FX-S01 200-character subheading |
| `promo_banner_cta_text` and `promo_banner_cta_url` | set |

Exercises: `partials/section_promo_banner.html`.

## How to seed a dev store

### Manual, in the dashboard

1. Create the parent category `QA Fixtures` (slug `qa-fixtures`), then the
   child categories from the Collection states with their exact slugs.
2. Create each product from the Product states. Set SKU, price, retail price,
   stock, and category exactly as listed; upload the numbered images in
   order so `display_order` matches.
3. Assign products to collections as listed under each Collection state.
   FX-C04 needs 60 products; if that is too many to click through, use the
   API sketch below for that one state.
4. Create the three pages from the Content states and add them to the footer
   menu.
5. Build the FX-N01 menu, add the FX-N02 labels to it, and select it as
   `main_menu` in the theme settings.
6. In the theme editor, turn on `enable_progress_bar`, keep the default
   thresholds, set `gift_product` to FX-P09, and turn on
   `sidecart_open_on_add`.
7. Cart states are produced in the browser at QA time from the steps under
   each Cart state.

### Admin API sketch

Verified against the product management guide and the reference index at
`developers.nextcommerce.com/docs/admin-api` on 2026-09-21: products,
variants, images, prices, stockrecords, categories, and pages can all be
created through the Admin API. Menus and theme settings cannot; cart state is
shopper session state and is produced through the storefront. Requests need
the `catalogue:write` scope. Never commit a token, store domain, or location
id; read them from the environment.

```text
BASE        = https://<store-domain>/api/admin
HEADERS     = Authorization: Bearer <ADMIN_API_TOKEN>
              Content-Type: application/json
              X-29next-API-Version: 2024-04-01
LOCATION_ID = <fulfillment location id from GET /locations/>
```

Create the fixture categories (a slug with `/` creates the parents):

```text
POST {BASE}/categories/
{ "name": "Fixture Empty Collection", "slug": "qa-fixtures/empty", "is_public": true }
```

Create a simple product (one default variant, price and stock on the
variant):

```text
POST {BASE}/products/
{
  "title": "Fixture Product With One Image",
  "is_public": true,
  "categories": [<qa-fixtures/products id>],
  "variants": [
    {
      "sku": "FX-P03",
      "track_stock": true,
      "allow_backorders": false,
      "requires_shipping": true,
      "prices": [{ "currency": "USD", "price": "18.00" }],
      "stockrecords": [{ "location_id": LOCATION_ID, "num_in_stock": 100 }]
    }
  ]
}
```

Upload images to the parent (one call per image; `display_order` 0 is the
primary image):

```text
POST {BASE}/products/{product_id}/images/
{ "attachment": "<base64 png>", "file_name": "fx-p04-01.png", "display_order": 0 }
```

Create the 64-variant product in one request by generating the variants
array from the attribute values:

```text
for colour in [Black, White, Navy, Sand]:
  for size in [XS, S, M, L]:
    for material in [Cotton, Linen, Wool, Blend]:
      variants.append({
        "sku": "FX-P05-" + colour + "-" + size + "-" + material,
        "variant_attribute_values": [
          { "name": "Colour", "value": colour },
          { "name": "Size", "value": size },
          { "name": "Material", "value": material }
        ],
        "prices": [{ "currency": "USD", "price": "30.00" }],
        "stockrecords": [{ "location_id": LOCATION_ID, "num_in_stock": 10 }]
      })

POST {BASE}/products/
{
  "title": "Fixture Product With 64 Variants",
  "is_public": true,
  "categories": [<qa-fixtures/products id>],
  "variant_attributes": [
    { "name": "Colour",   "values": ["Black", "White", "Navy", "Sand"] },
    { "name": "Size",     "values": ["XS", "S", "M", "L"] },
    { "name": "Material", "values": ["Cotton", "Linen", "Wool", "Blend"] }
  ],
  "variants": variants
}
```

Sold-out and partial states use the same shape with `num_in_stock: 0` on the
affected variants. Sale price adds `"retail": "25.00"` to the price object.
Subscription is a follow-up patch:

```text
PATCH {BASE}/products/{product_id}/
{ "enable_subscription": true, "interval": "month", "interval_counts": [1, 2, 3] }

PATCH {BASE}/products/{variant_id}/prices/USD/
{ "subscription": "17.00" }
```

Pages:

```text
POST {BASE}/pages/
{ "title": "Fixture Empty Page", "slug": "fixture-empty-page", "content": "" }
```

`pagesCreate` accepts `title` (required, 1-200 characters), `slug`, `content`,
`meta_title`, `meta_description`, and `template`.

A seeding script should read `tests/fixtures/qa-fixtures.json`, create the
`qa-fixtures` category tree first, then products in id order, then pages, and
print the created ids keyed by fixture id. Keep it idempotent by looking each
SKU up with `GET {BASE}/products/?sku=FX-P01` before creating.

## Removing fixtures

Every fixture product has an `FX-` SKU prefix and every fixture category sits
under `qa-fixtures`, so a sweep is: list products by SKU prefix, set
`is_public` false or delete them, then delete the `qa-fixtures` tree and the
three `fixture-*` pages. Do not run a sweep against a merchant store.
