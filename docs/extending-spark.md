# Extending Spark

Spark is meant to be extended without forking the whole theme. This guide points to the supported extension surfaces and the files to update when you add one.

## Choose The Right Extension Surface

| Goal | Prefer | Start Here |
| --- | --- | --- |
| Add or change a homepage design block | Homepage section partial plus Theme Settings | `docs/design-block-authoring.md` |
| Add merchant-configurable theme behavior | `configs/settings_schema.json` and `configs/settings_data.json` | `docs/theme-settings-partials.md` |
| Integrate an app into storefront markup | `{% app_hook %}` slots | `docs/terminology.md`, `docs/performance-load-order.md` |
| Coordinate cart UI behavior | DOM events through `SparkEvents` | `docs/cart-events.md` |
| Change PDP variant picker UI | Real controls named `attr_*` plus `SparkVariantState` | `docs/pdp-variant-state.md`, `docs/pdp-customization.md` |
| Add custom client-side behavior | Focused vanilla JS module or Web Component | Existing files in `assets/js/` |
| Change load order or head assets | Template blocks in `layouts/base.html` | `docs/performance-load-order.md` |

## Theme Settings Extensions

Theme Settings are global today and exposed to templates as `settings.*`.

When adding a setting-backed surface:

1. Add the setting to `configs/settings_schema.json`.
2. Add a default to `configs/settings_data.json`.
3. Use a stable prefix for related settings. For example, the featured products section keeps its toggle, content, and style controls under `show_featured_products` and `featured_products_*`; see [configs/settings_schema.json](../configs/settings_schema.json) and [partials/section_featured_products.html](../partials/section_featured_products.html).
4. Render the setting from a focused partial or template surface.
5. Update `docs/theme-settings-partials.md`.
6. Run the standard local checks. If your branch adds a schema validation script, add it to [CONTRIBUTING.md](../CONTRIBUTING.md) and CI before referencing it here.

Keep future theme sections in mind. Settings that belong to one repeated section should be easy to move from `settings.foo` to future `section.settings.foo`.

## Homepage Section Partials

Homepage section partials are the current Spark design-block unit. They live in `partials/section_*.html` and are included from `templates/index.html` in a fixed order.

Each public section should have:

- A `show_*` toggle.
- Clear empty states for missing products, categories, images, links, or headings.
- Mobile-safe layout and copy behavior.
- A row in `docs/theme-settings-partials.md`.
- A spec under `docs/section-specs/` when the section is part of the maintained design library.

Use shared helpers where possible:

- `partials/section_heading.html`
- `partials/product_grid.html`
- `partials/cta_button.html`

## App Hooks

Spark exposes app integration points with `{% app_hook %}`. Apps should target those slots instead of editing theme files or reaching into private Web Component internals.

Current hook examples live in product cards, PDP reviews, collection feeds, product detail surfaces, and global tracking points. Search for `{% app_hook %}` before adding a new hook.

When adding a hook:

1. Choose a stable, descriptive name.
2. Put the hook as close as possible to the DOM it extends.
3. Document the intended payload or surrounding markup contract.
4. Avoid names tied to one temporary app unless the hook is intentionally app-specific.

## Cart And PDP Events

Use events for behavior that crosses modules.

Cart events are documented in `docs/cart-events.md`. Theme and app code should listen for `spark:cart:updated`, `spark:cart:added`, and `spark:cart:toggle` rather than mutating drawer internals.

PDP selected variant behavior is documented in `docs/pdp-variant-state.md`. Custom picker designs should update real form controls named `attr_*` and listen for `spark:variant:changed` when they need to adapt gallery, price, or add-to-cart behavior.

## JavaScript Modules And Web Components

Spark JavaScript is vanilla, browser-loaded, and intentionally small. There is no bundler.

When adding client-side code:

- Keep modules focused and expose only the smallest useful public API on `window`.
- Prefer progressive enhancement. The page should still have useful server-rendered markup.
- Keep JS asset files ASCII-only; see [CLAUDE.md](../CLAUDE.md#critical-js-asset-files). The platform processes JS through DTL, so `{%`, `{{`, Unicode punctuation, and non-ASCII symbols can be parsed as template syntax or trigger CDN 500s.
- Add tests when logic can be isolated without a full storefront runtime.

## CSS And Generated Artifacts

Author CSS in `css/input.css`. The storefront consumes `assets/main.css`.

Before handoff:

```bash
make css-check
python3 -m unittest discover -s tests
```

If you changed CSS sources, run `make release` and commit `assets/main.css` with the source change.

## Release Notes

Public-facing behavior changes should update [CHANGELOG.md](../CHANGELOG.md). Mention new settings, hooks, events, migration steps, and compatibility notes. A theme developer should be able to skim the changelog and understand whether their derived theme needs action.
