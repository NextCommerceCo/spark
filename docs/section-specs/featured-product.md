# Featured Product Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Featured product section spotlights one product with image, copy, price, and CTA. It is the right module for a launch product, editorial product story, or hero follow-up where the merchant wants more product detail than a grid card can carry.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `featured_product` |
| Merchant label | Featured Product |
| Current Interface | Global Theme Settings under `show_featured_product` and `featured_product_*` |
| Current Implementation | `partials/section_featured_product.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Featured Product` |
| Defaults file | `configs/settings_data.json` |
| Design references | `featured_product-desktop`, `featured_product-tablet`, `featured_product-mobile` |
| Runtime JS | None |
| App hooks | Product card hooks do not apply here today |

## Current Render Contract

- The section renders only when `settings.show_featured_product` is true and `settings.featured_product` has a value.
- The optional section heading renders above the product story.
- The layout is one column on mobile and two columns from `md` up.
- The product image uses `product.primary_image`; when missing, Spark renders a quiet square placeholder.
- The custom description renders when `featured_product_description` is present; otherwise Spark falls back to `product.description`.
- Price comes from `{% purchase_info_for_product request product as session %}`.
- CTA links to `product.get_absolute_url` and renders through `partials/cta_button.html`.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Featured Product
```

Recommended reference frame names:

```text
featured_product-desktop
featured_product-tablet
featured_product-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_featured_product` |
| `product` | Product placeholder | `featured_product` |
| `heading` | Text | `featured_product_header` |
| `heading_size` | Variant | `featured_product_header_size` |
| `heading_align` | Variant | `featured_product_header_align` |
| `description` | Rich text placeholder | `featured_product_description` |
| `cta_label` | Text | `featured_product_cta_text` |
| `cta_style` | Variant | `featured_product_cta_style` |
| `cta_outline` | Boolean | `featured_product_cta_outline` |
| `background_color` | Color | `featured_product_bg_color` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_featured_product` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `featured_product` | `product` | `null` | `product` | Product | Required by the current Implementation. Without it, the section does not render. |
| `featured_product_header` | `text` | empty | `heading` | Max 250 chars | Optional section heading. |
| `featured_product_header_size` | `select` | `medium` | `heading_size` | `small`, `medium`, `large` | Maps to Spark heading size classes. |
| `featured_product_header_align` | `select` | `left` | `heading_align` | `left`, `center`, `right` | Applies to the section heading. |
| `featured_product_description` | `richtext` | empty | `description` | Max 1000 chars | Overrides product description when present. |
| `featured_product_cta_text` | `text` | `View Product` | `cta_label` | Max 100 chars | CTA always has a product URL when product exists. |
| `featured_product_cta_style` | `select` | `primary` | `cta_style` | `primary`, `accent` | Uses merchant brand color tokens through `partials/cta_button.html`. |
| `featured_product_cta_outline` | `checkbox` | `false` | `cta_outline` | `true`, `false` | Outline color follows selected CTA style. |
| `featured_product_bg_color` | `color` | empty | `background_color` | Color | Empty means default page background. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Product image, title, description, price, and CTA. |
| No heading | Header field is empty. |
| Custom description | Merchant text replaces product description. |
| Product description fallback | Custom description is empty. |
| Missing product image | Uses square neutral placeholder. |
| Sale price | Shows retail price struck through beside sale price. |
| Long product title | Title should not collide with price or CTA. |
| Outline CTA | Shared button helper should match other section CTAs. |

## QA Checklist

- Verify desktop two-column layout and mobile stacked layout.
- Confirm heading size and alignment variants.
- Confirm missing image placeholder remains visually quiet.
- Confirm custom description and product description fallback.
- Confirm product with no price does not render an empty price row.
- Confirm CTA style and outline states.
- Confirm background color covers the full section band.

## Future Theme Section Migration

When true theme sections exist, `show_featured_product` should become section presence. The other settings should become instance-local settings such as `section.settings.product`, `section.settings.heading`, `section.settings.description`, and `section.settings.background_color`.

## Implementation Gaps Exposed

- There is no app hook or rating summary in this product spotlight. That may be correct for a quiet default theme, but the design team should decide whether review/social proof belongs in this section or in a separate section authoring unit.
- The product image placeholder has no explanatory text. That is clean for live storefronts, but a future editor-aware placeholder would help merchant setup.
