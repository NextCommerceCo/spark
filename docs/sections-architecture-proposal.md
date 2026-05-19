# Spark Sections Architecture Proposal

Spark now has named homepage section partials, but the page order is still hard-coded in `templates/index.html`. This proposal describes the platform support needed to make Spark sections reorderable, duplicable, and reusable across pages.

## Problem

The current Theme Settings model works for a fixed starter homepage:

- Each section has one global settings group.
- Merchants can toggle sections on/off.
- Sections cannot be reordered.
- Sections cannot be duplicated.
- Settings are page-global, so the same section type cannot appear twice with different content.
- Designers cannot package reusable storefront layouts without editing templates.

That is enough for a starter theme, but it is not enough for a design-block workflow or a future section marketplace.

## Goals

- Let merchants reorder sections without theme edits.
- Let merchants add multiple instances of the same section type.
- Let the same section type render on homepage, landing pages, product pages, and collection pages where allowed.
- Give designers a stable block library backed by schema, not screenshots.
- Preserve app hooks and existing DTL partials.
- Provide a migration path from Spark's current global settings.

## Proposed Concepts

### Section Type

A reusable section definition shipped by the theme.

```json
{
  "type": "hero",
  "name": "Hero",
  "template": "partials/section_hero.html",
  "settings": [
    { "name": "image", "type": "image_picker", "label": "Image" },
    { "name": "heading", "type": "text", "label": "Heading" }
  ],
  "allowed_templates": ["index", "pages/page"]
}
```

### Section Instance

A merchant-created instance of a section type on a page.

```json
{
  "id": "hero_01H...",
  "type": "hero",
  "enabled": true,
  "settings": {
    "image": "https://...",
    "heading": "Summer essentials",
    "cta_text": "Shop now"
  }
}
```

### Page Composition

A page owns an ordered list of section instance IDs.

```json
{
  "templates/index": {
    "sections": ["hero_01H...", "featured_products_01H...", "promo_01H..."]
  }
}
```

## Rendering Contract

The platform should expose a page-level section list and a section-local settings object to templates.

Ideal DTL shape:

```django
{% for section in page.sections %}
  {% if section.enabled %}
    {% render_section section %}
  {% endif %}
{% endfor %}
```

Equivalent explicit include shape:

```django
{% for section in page.sections %}
  {% include section.template with section=section settings=section.settings %}
{% endfor %}
```

The important contract: inside a section partial, `settings.foo` should resolve to the section instance setting, not the global theme setting. Global settings can remain available as `theme_settings.foo` if needed.

## Spark Migration Path

1. Keep current global settings as backwards-compatible defaults.
2. Add section definitions that map one-to-one to current partials:
   - `section_hero.html`
   - `section_featured_product.html`
   - `section_featured_products.html`
   - `section_featured_categories.html`
   - `section_on_sale.html`
   - `section_promo_banner.html`
3. Generate a default homepage composition from current `show_*` toggles and settings.
4. Update section partials to read section-local settings first and fall back to global settings during migration.
5. Once stable, deprecate homepage-only global section settings in favor of section instances.

## Design Team Workflow

Each templated design block should ship with:

- A section type name.
- A section partial.
- A settings schema.
- Required data sources, such as products or categories.
- Empty, loading, and missing-image states.
- Mobile and desktop screenshots.
- Guidance for ideal image ratios and copy length.
- Example presets for common storefront categories.

## Open Platform Questions

- Where should section schemas live: `configs/sections_schema.json`, inside `settings_schema.json`, or next to each partial?
- Can the platform support section-local `product`, `products`, and `product_categories` pickers?
- Can sections be restricted by template type?
- How should app hooks behave inside duplicated sections?
- Should section instances support presets, so a designer can add a "Beauty Hero" or "Supplements Product Grid" variant quickly?
- Can the theme editor expose a preview/editor mode flag so Spark can hide setup placeholders from live storefront traffic?

## Recommended Next Step

Implement a thin platform spike with just the homepage and two section types: hero and featured products. If the editor can persist order, duplicate featured products twice with different product lists, and render the section-local settings into existing Spark partials, the model is strong enough to migrate the remaining blocks.
