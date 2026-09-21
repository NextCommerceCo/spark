# Spark Section Specs

This directory contains section authoring unit specs for Spark's Figma component library and matching storefront theme Implementation.

Each spec should describe one merchant-configurable section across Figma, Theme Settings, DTL partials, defaults, empty states, QA references, and the future path to true theme sections.

## Specs

| Section | Status | Theme Implementation |
| --- | --- | --- |
| [Hero image](hero-image.md) | Pilot spec | `partials/section_hero.html` |
| [Featured product](featured-product.md) | First pass | `partials/section_featured_product.html` |
| [Featured products](featured-products.md) | First pass | `partials/section_featured_products.html` |
| [Featured categories](featured-categories.md) | First pass | `partials/section_featured_categories.html` |
| [On Sale](on-sale.md) | First pass | `partials/section_on_sale.html` |
| [Promo banner](promo-banner.md) | First pass | `partials/section_promo_banner.html` |
| [Image with text](image-text.md) | First pass | `partials/section_image_text.html` |

Use `docs/figma-section-library-plan.md` for the overall workflow and library structure, and [`docs/section-roster.md`](../section-roster.md) for the full Tier 1/2/3 partial roster Spark should ship to fully cover modern D2C storefronts.

## Authoring contract: consume the tokens

New section partials must use the Style token utilities instead of repeating design literals. Use `py-section-y md:py-section-y-md` for standard section rhythm or `py-band-y md:py-band-y-md` for promotion bands; use `gap-content*`, `rounded-card` or `rounded-control`, `text-h1`, `text-h2`, `text-h3`, or `text-display`, adding `md:text-h1-md` or `md:text-display-md` where applicable; and use `border-border`. Do not substitute literal utilities such as `py-12`, `gap-6`, `rounded`, `border-slate-200`, or `text-2xl` for those design decisions.

Placeholder and empty-state chrome stays literal on purpose because it communicates missing configuration rather than the merchant-facing design language. See [`css/input.css`](../../css/input.css) under `@theme` for the complete token list and [`DESIGN.md`](../../DESIGN.md) for defaults.
