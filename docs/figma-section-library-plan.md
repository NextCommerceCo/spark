# Spark Figma Section Library Plan

This plan defines how Spark should turn storefront section designs into maintained theme modules. It borrows the useful parts of the Campaigns section export flow, but keeps Spark grounded in the storefront platform that exists today: DTL partials, global Theme Settings, Theme Kit, assets, and app hooks.

The near-term goal is a Figma component library the design team can use with confidence. The architectural goal is a deeper section authoring unit: one section has a clear design spec, merchant settings, theme Implementation, empty states, QA references, and a future path to true theme sections.

## Platform Reality

Spark can rely on these storefront surfaces today:

- DTL layouts, templates, and partials.
- Global Theme Settings from `configs/settings_schema.json` and `configs/settings_data.json`, exposed as `settings.*`.
- Theme Setting field types such as `checkbox`, `color`, `image_picker`, `product`, `products`, `product_category`, `product_categories`, `range`, `richtext`, `select`, `text`, `textarea`, and `url`.
- Theme Kit file push, pull, watch, and CSS compile behavior.
- Client-side JavaScript and GraphQL for user-specific state.
- App hooks where the platform and Spark agree on a documented location.

Spark should not assume these platform features yet:

- Reorderable or duplicable merchant section instances.
- A runtime `section.settings.*` object.
- Per-section asset folders like Campaigns pages use.
- Public third-party app hook locations beyond the ones documented by the platform.

That means the current section Interface is a fixed-order homepage section partial, not a future theme section instance.

## Campaigns Pattern To Reuse

The `figma-sections-export` and `next-campaign-page-kit` flow gives us a strong authoring discipline:

- One section is designed, exported, reviewed, and assembled at a time.
- Designers provide desktop, tablet, and mobile frames for the same section.
- Component properties use stable snake_case names.
- Reference screenshots make visual QA concrete.
- Export output includes an explicit section manifest, not just HTML.
- A compare view puts Figma references next to live implementation.

Spark should reuse that discipline.

Spark should not reuse the Campaigns output model directly. Campaigns generate page-local Liquid includes and section-local assets for static campaign funnels. Spark should produce maintained storefront theme files: DTL partials, Theme Settings, defaults, docs, shared assets, and optional JavaScript modules.

## Section Authoring Unit

A Spark section authoring unit is the smallest useful module for homepage design work. It has:

- A Figma component with desktop, tablet, and mobile references.
- A setting map that names every merchant-editable control.
- A DTL partial in `partials/`.
- A Theme Settings group in `configs/settings_schema.json`.
- Defaults in `configs/settings_data.json`.
- Documentation in `docs/theme-settings-partials.md`.
- Empty states for missing merchant data.
- Image, copy, and accessibility guidance.
- A QA reference screenshot set.

This is the unit the design team should build in Figma and the unit theme developers should implement in Spark.

Detailed per-section specs live in `docs/section-specs/`. The first pilot is `docs/section-specs/hero-image.md`.

## Figma Library Shape

Recommended Figma pages:

| Page | Purpose |
| --- | --- |
| Foundations | Color, type, spacing, radius, breakpoints, buttons, product card anatomy, and shared commerce tokens. |
| Homepage Section Partials | Merchant-configurable homepage section components backed by Spark Theme Settings. |
| Commerce Partials | Product card, recommendation grids, side-cart surfaces, cart progress, and upsell rows. |
| States | Missing image, missing product data, disabled CTA, sale pricing, loading, empty, and account-only states. |
| Specs | Setting maps, image ratios, content limits, and implementation notes for each section authoring unit. |

Recommended breakpoints:

- Desktop reference: 1440px wide.
- Tablet reference: 768px wide.
- Mobile reference: choose either 390px for Spark storefront QA or 375px if the design team wants to stay aligned with the Campaigns compare tooling. Pick one and use it consistently.

## Property Naming

Figma component properties should map to Theme Settings as directly as possible.

| Theme Setting Type | Figma Representation |
| --- | --- |
| `checkbox` | Boolean property or show/hide variant. |
| `select` / `radio` | Variant with option values matching the schema values. |
| `range` / `number` | Annotated property with min, max, step, default, and representative frames for default plus edge states. |
| `color` | Figma variable or style mapped to the exact setting key. |
| `text` / `textarea` / `richtext` | Text layer with max length and overflow behavior documented. |
| `image_picker` | Image placeholder with required ratio, focal guidance, alt-text requirement, and mobile fallback. |
| `product` / `products` | Product placeholder data and card states, not hard-coded sample products. |
| `product_category` / `product_categories` | Category placeholder data and missing-image state. |
| `url` | CTA/link target note; URL values do not need visual variants. |

Use snake_case for exported properties. If Figma display labels need to be shorter than settings keys, keep an explicit mapping table in the Specs page and the Spark docs.

## Current Homepage Section Units

| Section Unit | Spark Implementation | Primary Data | Notes For Figma |
| --- | --- | --- | --- |
| Hero image | `partials/section_hero.html` | `image_picker`, text, CTA settings | Pilot spec in `docs/section-specs/hero-image.md`. Needs image ratio guidance, overlay readability states, mobile image fallback, content position variants, and button style states. |
| Featured product | `partials/section_featured_product.html` | `product`, optional rich text, CTA settings | First-pass spec in `docs/section-specs/featured-product.md`. Needs product image missing state, description source states, sale price state, and long product title behavior. |
| Featured products | `partials/section_featured_products.html` | `products`, product card settings, CTA settings | First-pass spec in `docs/section-specs/featured-products.md`. Needs 2-5 desktop column states, product count examples, card background state, and empty product list state. |
| Featured categories | `partials/section_featured_categories.html` | `product_categories`, overlay settings | First-pass spec in `docs/section-specs/featured-categories.md`. Needs 2-5 desktop column states, missing category image state, overlay opacity states, and long category label behavior. |
| On Sale | `partials/section_on_sale.html` | `products`, product card sale state | First-pass spec in `docs/section-specs/on-sale.md`. Needs sale badge and compare-at price states from `partials/product_card.html`; otherwise this should share grid anatomy with Featured products. |
| Promo banner | `partials/section_promo_banner.html` | text, CTA settings, colors | First-pass spec in `docs/section-specs/promo-banner.md`. Needs contrast states, short and long copy states, no-CTA state, and primary/accent/outline button states. |

These are enough for the first Figma library pass. The full roster of section partials Spark needs to ship to fully cover D2C storefronts — including image-with-text, FAQ, comparison table, process steps, press logos, testimonials, value props, and the rest of the Tier 1/2/3 catalog — lives in [`section-roster.md`](./section-roster.md). New section ideas should follow the section authoring unit pattern below.

## Section Spec Template

Every section spec should answer the same questions:

| Field | Required Content |
| --- | --- |
| Section name | Human name and stable slug, such as `hero_image`. |
| Purpose | What merchant job this section solves. |
| Figma references | Desktop, tablet, and mobile frame names. |
| Implementation files | Partial, settings group, defaults, docs, CSS, and JS if used. |
| Setting map | Exact setting key, type, default, allowed values, Figma property, and whether it is required. |
| Data sources | Products, categories, images, rich text, URLs, or platform objects needed. |
| Empty states | Missing image, missing product/category, missing heading, missing CTA, or disabled state. |
| Accessibility | Heading level, alt text, contrast requirements, keyboard/focus behavior where relevant. |
| Performance | Image loading priority, lazy loading, GraphQL or JS needs, and cache considerations. |
| Migration note | How the section would become `section.settings.*` later. |

## Suggested Manifest Shape

A future Spark Figma export tool can emit a manifest like this. The manifest should be treated as a spec input, not as the only source used to generate production DTL.

```json
{
  "section": "hero_image",
  "figma": {
    "desktop": "hero_image-desktop",
    "tablet": "hero_image-tablet",
    "mobile": "hero_image-mobile"
  },
  "theme": {
    "partial": "partials/section_hero.html",
    "settings_group": "Homepage > Hero"
  },
  "settings": [
    {
      "key": "homepage_hero_content_position",
      "type": "select",
      "default": "bottom-left",
      "values": ["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"],
      "figma_property": "content_position"
    }
  ],
  "states": ["default", "mobile_image", "no_cta", "low_contrast_guard"]
}
```

## Workflow

1. Design one section authoring unit in Figma across the agreed breakpoints.
2. Fill out the section spec with settings, states, and image/copy guidance.
3. Export reference screenshots and a manifest.
4. Implement or update the Spark DTL partial and Theme Settings.
5. Update defaults and docs in the same change.
6. Run schema/default parity checks.
7. Compare Figma references against a live Spark preview.
8. Mark the section as library-ready only when design, implementation, defaults, and docs agree.

## Future Theme Section Path

The design library should make the future platform easier to build:

- Keep all settings for a section under one stable prefix.
- Avoid mixing unrelated section concerns under shared setting keys.
- Keep section-specific CSS scoped by section class or predictable structure.
- Prefer shared helpers for repeated patterns such as headings, CTAs, and commerce grids.
- Document whether each setting should become instance-local when `section.settings.*` exists.
- Treat fixed homepage order as an Implementation detail, not the long-term merchant Interface.

When the platform supports true theme sections, each Spark section authoring unit should be convertible by moving from global `settings.*` to instance-local `section.settings.*`, not by redesigning the section from scratch.

## Open Decisions

- Mobile reference width: 390px for Spark storefront QA or 375px for Campaigns-tool compatibility.
- Whether the first Spark Figma export tool should live in `figma-sections-export`, a new storefront-specific repo, or Spark itself.
- Whether generated DTL should remain prototype-only at first, with production partials curated manually.
- Which Spark app-hook locations should become public extension points for section-level app integrations.
- ~~Whether the next new section should be a feature carousel or a more fundamental media-with-text unit.~~ **Resolved:** image-with-text (`section_image_text`) is the right next section. See [`section-roster.md`](./section-roster.md#open-decisions-from-figma-section-library-planmd-resolved).
