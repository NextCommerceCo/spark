# Changelog

All notable public Spark changes should be recorded here.

Spark follows human-readable release notes rather than a strict package-manager version contract. The current public version is shown in [README.md](README.md). When releasing a new version, update the README version, add a dated changelog section, and publish a Git tag or GitHub release when the repo is ready for external consumers to pin versions.

## Unreleased

- `scripts/sass-compat.py --check` now rejects any standalone CSS `min()`/`max()`/`clamp()`. The platform Sass compiler evaluates these as Sass math and fails the upload on mixed units; same-unit calls are also blocked to keep the guard simple and safe. `minmax()` grid tracks are still accepted. This makes `make css`/`make css-check` fail locally where the upload would previously have been the first failure point.

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
