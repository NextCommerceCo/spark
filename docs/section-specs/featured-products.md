# Featured Products Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Featured products section renders a merchant-curated product grid with optional heading and CTA. It should be the default product-merchandising grid for homepage use.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `featured_products` |
| Merchant label | Featured Products |
| Current Interface | Global Theme Settings under `show_featured_products` and `featured_products_*` |
| Current Implementation | `partials/section_featured_products.html`, `partials/product_grid.html`, and `partials/product_card.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Featured Products` |
| Defaults file | `configs/settings_data.json` |
| Design references | `featured_products-desktop`, `featured_products-tablet`, `featured_products-mobile` |
| Runtime JS | None |
| App hooks | Product card app hooks can render inside cards |

## Current Render Contract

- The section renders only when `settings.show_featured_products` is true and `settings.featured_products` has at least one product.
- The optional section heading renders above the product grid.
- Product grid chrome is delegated to `partials/product_grid.html`.
- Product cards are delegated to `partials/product_card.html`.
- The grid is one column on mobile, two columns from 768px, and `featured_products_columns` from 1024px.
- CTA renders below the grid through `partials/cta_button.html`, and only appears when `featured_products_cta_url` is present.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Featured Products
```

Recommended reference frame names:

```text
featured_products-desktop
featured_products-tablet
featured_products-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_featured_products` |
| `products` | Product list placeholder | `featured_products` |
| `heading` | Text | `featured_products_header` |
| `heading_size` | Variant | `featured_products_header_size` |
| `heading_align` | Variant | `featured_products_header_align` |
| `columns` | Number | `featured_products_columns` |
| `background_color` | Color | `featured_products_bg_color` |
| `card_background_color` | Color | `featured_products_card_bg` |
| `cta_label` | Text | `featured_products_cta_text` |
| `cta_url` | Link annotation | `featured_products_cta_url` |
| `cta_style` | Variant | `featured_products_cta_style` |
| `cta_outline` | Boolean | `featured_products_cta_outline` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_featured_products` | `checkbox` | `true` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `featured_products` | `products` | `[]` | `products` | Product list | Required by current Implementation. Empty list hides the section. |
| `featured_products_header` | `text` | `Featured Products` | `heading` | Max 250 chars | Optional; empty hides the heading. |
| `featured_products_header_size` | `select` | `medium` | `heading_size` | `small`, `medium`, `large` | Maps to Spark heading size classes. |
| `featured_products_header_align` | `select` | `left` | `heading_align` | `left`, `center`, `right` | Applies to the section heading. |
| `featured_products_columns` | `range` | `3` | `columns` | 2-5, step 1 | Desktop only; mobile and tablet are fixed by CSS. |
| `featured_products_bg_color` | `color` | empty | `background_color` | Color | Empty means default page background. |
| `featured_products_card_bg` | `color` | empty | `card_background_color` | Color | Passed to `partials/product_card.html`. |
| `featured_products_cta_text` | `text` | `View All` | `cta_label` | Max 100 chars | Requires URL to render. |
| `featured_products_cta_url` | `url` | empty | `cta_url` | Max 500 chars | Empty hides CTA. |
| `featured_products_cta_style` | `select` | `primary` | `cta_style` | `primary`, `accent` | Uses merchant brand color tokens through `partials/cta_button.html`. |
| `featured_products_cta_outline` | `checkbox` | `true` | `cta_outline` | `true`, `false` | Outline color follows selected CTA style. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Heading, 3 desktop columns, product cards, and CTA. |
| No heading | Header field is empty. |
| No CTA | CTA URL is empty. |
| 2 columns | Lowest desktop column count. |
| 5 columns | Highest desktop column count. |
| Few products | One or two products should not make the section look broken. |
| Sale product card | Product card sale state appears inside this grid. |
| Missing product image | Product card placeholder appears inside this grid. |
| Card background | Section-level card background is passed to every product card. |

## QA Checklist

- Verify product grid at 1440px, 768px, and mobile width.
- Confirm desktop columns 2, 3, 4, and 5.
- Confirm tablet remains two columns regardless of desktop setting.
- Confirm CTA only renders when `featured_products_cta_url` is present.
- Confirm card background does not break product image or rating app-hook areas.
- Confirm product card app hooks remain visually contained.

## Future Theme Section Migration

When true theme sections exist, `show_featured_products` should become section presence. The remaining settings should become instance-local settings such as `section.settings.products`, `section.settings.heading`, `section.settings.columns`, `section.settings.background_color`, and `section.settings.cta_url`.

## Implementation Gaps Exposed

- Empty product lists hide the section. A future editor-aware placeholder would help merchants understand that the section exists but lacks products.
- Grid heading, columns, background, card background, and CTA behavior overlap heavily with On Sale and Recommended Products. A shared commerce-grid authoring spec would reduce repetition.
