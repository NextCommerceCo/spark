# On Sale Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The On Sale section renders a merchant-curated sale product grid. It should share most of its visual language with Featured products, while leaning on product card sale state to communicate discounts.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `on_sale` |
| Merchant label | On Sale |
| Current Interface | Global Theme Settings under `show_on_sale` and `on_sale_*` |
| Current Implementation | `partials/section_on_sale.html`, `partials/product_grid.html`, and `partials/product_card.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > On Sale` |
| Defaults file | `configs/settings_data.json` |
| Design references | `on_sale-desktop`, `on_sale-tablet`, `on_sale-mobile` |
| Runtime JS | None |
| App hooks | Product card app hooks can render inside cards |

## Current Render Contract

- The section renders only when `settings.show_on_sale` is true and `settings.on_sale_products` has at least one product.
- The heading always renders and falls back to `On Sale`.
- Product grid chrome is delegated to `partials/product_grid.html`.
- Product cards are delegated to `partials/product_card.html`.
- The grid is one column on mobile, two columns from 768px, and `on_sale_columns` from 1024px.
- There is no section CTA today.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/On Sale
```

Recommended reference frame names:

```text
on_sale-desktop
on_sale-tablet
on_sale-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_on_sale` |
| `products` | Product list placeholder | `on_sale_products` |
| `heading` | Text | `on_sale_header` |
| `heading_size` | Variant | `on_sale_header_size` |
| `heading_align` | Variant | `on_sale_header_align` |
| `columns` | Number | `on_sale_columns` |
| `background_color` | Color | `on_sale_bg_color` |
| `card_background_color` | Color | `on_sale_card_bg` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_on_sale` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `on_sale_header` | `text` | `On Sale` | `heading` | Max 250 chars | Template also falls back to `On Sale` if empty. |
| `on_sale_header_size` | `select` | `medium` | `heading_size` | `small`, `medium`, `large` | Maps to Spark heading size classes. |
| `on_sale_header_align` | `select` | `left` | `heading_align` | `left`, `center`, `right` | Applies to the section heading. |
| `on_sale_products` | `products` | `[]` | `products` | Product list | Required by current Implementation. Empty list hides the section. |
| `on_sale_columns` | `range` | `3` | `columns` | 2-5, step 1 | Desktop only; mobile and tablet are fixed by CSS. |
| `on_sale_bg_color` | `color` | empty | `background_color` | Color | Empty means default page background. |
| `on_sale_card_bg` | `color` | empty | `card_background_color` | Color | Passed to `partials/product_card.html`. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Heading, 3 desktop columns, sale product cards. |
| 2 columns | Lowest desktop column count. |
| 5 columns | Highest desktop column count. |
| Real sale item | Product card with sale price and retail price. |
| Non-sale item | Merchant may choose a product without sale pricing; design should still look acceptable. |
| Missing product image | Product card placeholder appears inside this grid. |
| Card background | Section-level card background is passed to every product card. |

## QA Checklist

- Verify product grid at 1440px, 768px, and mobile width.
- Confirm desktop columns 2, 3, 4, and 5.
- Confirm tablet remains two columns regardless of desktop setting.
- Confirm sale and non-sale product cards both render cleanly.
- Confirm card background does not break product image or rating app-hook areas.

## Future Theme Section Migration

When true theme sections exist, `show_on_sale` should become section presence. The remaining settings should become instance-local settings such as `section.settings.products`, `section.settings.heading`, `section.settings.columns`, and `section.settings.background_color`.

## Implementation Gaps Exposed

- This section duplicates most of Featured products without a CTA. A future shared commerce-grid Module could make the difference explicit: collection purpose plus optional CTA, not separate hand-written grid mechanics.
- The section does not automatically filter for sale products; it trusts merchant selection. That is probably the right Interface today, but docs and Figma examples should make it clear.
