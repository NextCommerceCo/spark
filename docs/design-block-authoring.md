# Design Block Authoring Guide

Spark design blocks are DTL partials backed by Theme Settings. A good design block is easy for a designer to configure, hard for a merchant to break, and still useful when content is missing.

In Spark docs, "design block" means a design-team artifact, not a Shopify block and not a Django `{% block %}` inheritance region. Public theme developer docs should prefer "homepage section partial" for the current implementation and reserve "theme section" for a future platform feature.

For Figma library planning, use the deeper section authoring unit in `docs/figma-section-library-plan.md`. It defines the shared Interface between Figma, Theme Settings, DTL partials, empty states, and future theme sections.

## Design Block Anatomy

Every reusable storefront design block should have:

- A named partial in `partials/`, usually prefixed with `section_` for page-level homepage partials.
- A Figma component and setting map when the block is part of the public Spark library.
- A settings group in `configs/settings_schema.json`.
- Defaults in `configs/settings_data.json`.
- A documented row in `docs/theme-settings-partials.md`.
- Empty states for required merchant data, such as missing products, categories, images, links, or headings.
- Mobile-safe layout and copy lengths.

Use shared helpers for repeated chrome when they preserve the section's clear Interface:

- `partials/section_heading.html` for section heading size and alignment.
- `partials/product_grid.html` for product-card grids.
- `partials/cta_button.html` for primary/accent and outline CTAs.

## Naming

Use stable, descriptive names:

- Partial: `partials/section_featured_products.html`
- Toggle: `show_featured_products`
- Content setting: `featured_products`
- Style setting: `featured_products_bg_color`
- CTA setting: `featured_products_cta_text`, `featured_products_cta_url`, `featured_products_cta_style`, `featured_products_cta_outline`

Prefer a shared prefix for all settings owned by a design block. It makes Theme Settings easier to scan and makes future migration to explicit `section.settings.*` straightforward.

## Recommended Setting Set

Most page-level section partials should support:

- `show_*` toggle.
- Primary content picker, such as `product`, `products`, `product_categories`, image, heading, or rich text.
- `*_header` when the section has a title.
- `*_columns` for grids.
- `*_bg_color` for section background.
- `*_cta_text`, `*_cta_url`, `*_cta_style`, `*_cta_outline` when the section has a call to action.

Image-led section partials should also consider:

- Mobile image.
- Alt text.
- Overlay color.
- Overlay opacity.
- Text color.
- Content position.
- Content width.

## Implementation Checklist

1. Add or update the partial.
2. Add settings to `configs/settings_schema.json`.
3. Add matching defaults to `configs/settings_data.json`.
4. Wire the partial into the page template, or document why it is a utility partial.
5. Rebuild CSS with `make css` if classes changed.
6. Run JSON and schema parity checks.
7. Update `docs/theme-settings-partials.md`.

## Empty States

Spark currently uses setup placeholders for missing homepage data so merchants can see where a configured-but-empty section would appear. Keep placeholders visually quiet:

- Dashed border.
- Neutral slate colors.
- Short text pointing to the Theme Settings location.
- No decorative imagery.

Open question: once the platform exposes preview/editor mode, placeholders should be hidden on live storefront traffic and shown only inside the editor.

## CTA Helper

Use `partials/cta_button.html` for standard CTAs:

```django
{% include "partials/cta_button.html" with href=settings.featured_products_cta_url label=settings.featured_products_cta_text style=settings.featured_products_cta_style outline=settings.featured_products_cta_outline %}
```

Supported styles:

- `primary`
- `accent`

Set `outline` to render an outline button using the selected brand color.

Set `outline_color` only when a section intentionally needs an outline CTA to follow a local text color, such as Promo Banner.

## Before Handoff

For every new design block, give the design team:

- A screenshot at mobile and desktop widths.
- Recommended image ratio.
- Maximum practical heading and body copy lengths.
- Which settings are required vs optional.
- Example settings for at least one real storefront category.
