# Changelog

All notable public Spark changes should be recorded here.

Spark follows human-readable release notes rather than a package-manager version contract. The release version is stored in `manifest.json` and mirrored in [README.md](README.md) and `CLAUDE.md`. When releasing, update all three version markers, add a dated changelog section, and publish a Git tag or GitHub release when the repo is ready for external consumers to pin versions.

## Unreleased

- `scripts/sass-compat.py --check` now rejects CSS functions whose names collide with Sass built-ins: `invert()`, `saturate()`, `grayscale()`, `opacity()`, `lighten()`, `darken()`, `complement()`, and `desaturate()`. The platform Sass compiler evaluates them as Sass colour calls and rejects the CSS argument, so a valid `filter: brightness(0) invert(1)` fails the upload with "Could not compile CSS. Please check Scss Syntax." while `make css-check` passes locally. Custom-property declarations are exempt, because Sass leaves a custom property's value alone; that is why Tailwind's own `--tw-grayscale: grayscale(100%)` compiles and stays accepted.
- Rebuilt `assets/main.css`. Tailwind scans the repo's own docs and scripts for class candidates, so naming the banned functions in this change's prose generates an unused `.invert` utility. The committed CSS has to match a fresh build for the `css-drift` gate, so the rebuild ships with the change.

## 1.2.0 - 2026-09-01

- `scripts/sass-compat.py --check` now rejects any standalone CSS `min()`/`max()`/`clamp()`. The platform Sass compiler evaluates these as Sass math and fails the upload on mixed units; same-unit calls are also blocked to keep the guard simple and safe. `minmax()` grid tracks are still accepted. This makes `make css`/`make css-check` fail locally where the upload would previously have been the first failure point.
- Wired up `partials/catalogue_filters.html`, which existed but was never included by any template. Category pages now render the filter form in a sticky rail from 1024px up, and in a bottom-sheet drawer below that.
- Added a primary mobile filter opener above the category grid plus a supplemental sticky filter bar for long result lists. Both open the same accessible bottom-sheet drawer.
- Pagination links now use the platform `add_query_param` tag so active filters survive paging.
- "Clear" in the filter form now clears filters on the current path instead of navigating to the shop index.
- Mobile navigation, search, and the catalogue filter drawer now share a reference-counted body scroll lock, so closing one overlapping panel cannot re-enable scrolling behind another.
- Catalogue filter badges now follow whichever desktop or drawer form the shopper edits, and resize measurements are coalesced to one animation frame.
- Extracted the PDP variant picker into `partials/variant_picker.html` and added a third `variant_picker` style, `chips`: content-width option buttons with a filled selected state, unavailable combinations greyed and struck through in place, and an echo of the selected value beside the option name. `select` remains the default and `radio` is unchanged.
- Added an optional size guide link on the option label row, pointed at a merchant page through `variant_size_guide_url`.
- `SparkVariantState` gained `getOptionAvailability()` so pickers can render availability without re-deriving child matching.
- Extracted the mobile navigation drawer from `partials/header.html` into `partials/mobile_menu.html` and hardened its accessibility contract: `aria-expanded`/`aria-controls` on the toggle, `role="dialog"` and `aria-modal` on the drawer, a focus trap while open, Escape to close, focus moved into the panel on open and returned to the toggle on close. The `data-toggle="mobile-nav"`, `data-close="mobile-nav"`, and `#mobile-nav` hooks are unchanged.

## 1.1.3 - 2026-08-27

- Fixed the PDP's initial add-to-cart target so parent products resolve to a purchasable child PK while standalone products continue to use their own PK. Selected variants still update the form action through `SparkVariantState` (#43).
- Added a template-integrity regression gate and updated PDP customization guidance so custom themes do not reintroduce bare parent-product cart actions.

## 1.1.2 - 2026-08-04

- Fixed add to cart failing on every cart operation: the storefront GraphQL schema replaced `CartLineNode.attributes` with `properties { key value }`, so the shared `CART_FIELDS` fragment in `spark-cart.js` and the drawer variant label in `spark-cart-drawer-renderer.js` now query and render `properties` (#40).
- Clarified the first-run path for local inspection versus installing Spark on a real Next Commerce store.
- Added contribution guidance, issue templates, CI checks, and an extension guide for theme developers.

## 1.1.1 - 2026-06-17

- Added metadata-driven membership pricing presentation for product cards, PDP surfaces, and sticky add-to-cart pricing.
- Refreshed public-facing docs around components, app hooks, and public readiness.

## 1.1.0 - 2026-04-28

- Expanded homepage section partials and Theme Settings coverage.
- Documented the Figma section library path, performance load order, cart events, PDP variant state, and theme settings partials.
- Committed compiled `assets/main.css` so Spark can be installed without a local Tailwind build.

## 1.0.0 - 2026-03-20

- Initial public Spark starter theme for Next Commerce.
- Introduced Tailwind CSS v4, vanilla JavaScript, Web Components, committed storefront templates, and zero jQuery or Bootstrap dependency.
