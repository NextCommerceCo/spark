# Spark Theme Terminology

Spark should preserve NEXT theme terminology. Shopify familiarity belongs in migration docs, not in renamed Spark internals.

## Canonical NEXT Terms

| Term | Meaning in Spark / NEXT |
| --- | --- |
| `templates` | Page and view templates in `templates/`, such as `templates/index.html` and `templates/catalogue/product.html`. |
| `layouts` | Base templates in `layouts/` that child templates extend with `{% extends %}`. |
| `partials` | Reusable DTL fragments in `partials/`, included with `{% include %}`. Shopify developers can map these mentally to snippets, but Spark docs should call them partials. |
| `template blocks` | Django template inheritance regions created with `{% block %}`. Avoid using bare "blocks" for merchant-editable content because this term already means template inheritance in NEXT docs. |
| `Theme Settings` | Global theme configuration from `configs/settings_schema.json` and `configs/settings_data.json`, exposed to templates as `settings.*`. |
| `homepage section partials` | The current Spark homepage partials, such as `partials/section_hero.html`. These are fixed-order partials backed by global Theme Settings. |
| `theme sections` | A future platform feature for merchant-reorderable and duplicable section instances. Do not use this term to describe today's fixed homepage partial includes without qualification. |
| `app_hook` | Platform extension points where apps can inject storefront fragments. Keep this separate from Shopify "app blocks" terminology. |
| Web Components | Client-side custom elements used for cart, quantity, progress, and other per-user or interactive behavior. |

## Public Wording

Use this wording for Spark today:

- "Spark includes setting-backed homepage section partials."
- "Homepage section partials are included from `templates/index.html` in a fixed order."
- "Global Theme Settings control section visibility, content, and styling."
- "A future NEXT theme sections feature could make these reorderable and duplicable."

Avoid this wording unless the platform feature exists:

- "Spark supports Shopify sections."
- "Spark blocks can be reordered."
- "Sections-as-data."
- "Snippets" as the primary name for files in `partials/`.

## Shopify Migration Mapping

The Shopify-to-NEXT guide can explain conceptual mappings for developers coming from Liquid:

| Shopify | NEXT / Spark |
| --- | --- |
| `layout/theme.liquid` | `layouts/base.html` plus explicit `{% extends %}` / `{% block %}` inheritance. |
| `snippets/*.liquid` | `partials/*.html`. |
| `sections/*.liquid` | Future NEXT theme sections. Today, Spark approximates this with setting-backed homepage section partials. |
| Section settings | Future `section.settings`. Today, Spark section controls are global Theme Settings under `settings.*`. |
| Blocks inside sections | Future section-local children if NEXT implements them. Do not call current template inheritance blocks "Shopify blocks." |
| `settings_schema.json` | `configs/settings_schema.json` and `configs/settings_data.json`. |

## Future Theme Sections Guardrail

If NEXT adds platform-level theme sections, keep the context explicit:

- Keep global theme settings available as `settings.*`.
- Expose section instance settings as `section.settings.*`.
- Do not shadow global `settings` inside section partials.
- Keep reusable implementation fragments in `partials/`.
- Keep Shopify migration language in the external Shopify-to-NEXT guide, not in the core Spark README.
