# Spark Theme — Dogfooding Plan

**Status:** v1.1.1 shipped. Functional, installable, Web Components in place, and ready for deeper dogfooding by a storefront theme developer.

**Release posture:** private dogfooding. Spark needs more merchant-store mileage before it should be treated as a public release candidate.

**Goal:** make Spark the default starter theme that NEXT ships with, replacing Intro Bootstrap over time and becoming the foundation for Apps, derived themes, and a future theme marketplace.

---

## Where Spark Is Today

- Tailwind CSS v4 standalone CLI, zero jQuery, zero Bootstrap.
- 18 templates, including 15 merchant-facing templates and 3 error pages.
- 5 Web Components: `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-upsell-item>`.
- Custom GraphQL-first side cart through `SparkCartClient` and `SparkSideCart`.
- Cart milestones for free shipping and free gifts, with simple default thresholds.
- App hook surface for Reviews and future Apps.
- Setting-backed homepage section partials, included from `templates/index.html` in a fixed order.
- Compiled `assets/main.css` committed so the theme is installable without a local CSS build.
- Tracked design and theme-developer docs in `DESIGN.md` and `docs/`.

**Scope reminder:** checkout is platform-managed in NEXT. Spark owns the storefront cart and the handoff to checkout, but it does not ship checkout templates.

## What Needs To Improve

Spark should graduate from "works on a dev store" to "a theme developer can confidently dogfood this on real merchant stores." The main gaps are:

1. More production mileage on real storefront data and devices.
2. Cleaner merchant-facing Theme Settings, especially side-cart rewards and suggested products.
3. Performance and accessibility baselines that can be defended over time.
4. Component tests for the custom Web Components.
5. Clear theme-developer docs and public-readiness hygiene.
6. A platform path for future NEXT theme sections, without renaming Spark's existing `templates/`, `partials/`, or global Theme Settings model.

---

## Workstreams

### W1 — Merchant Dogfooding (P0)

Run Spark on low-risk real stores and fix what only real catalog, cart, currency, and device data will reveal.

- Pilot on at least one low-traffic merchant store.
- Log all P0/P1 issues found during dogfooding.
- Stress test parent products, child variants, out-of-stock states, vouchers, subscriptions, free gifts, partial-stock carts, and empty catalog states.
- Test multi-currency, multi-language, and RTL scenarios where a merchant actually needs them.
- Verify the cart to platform-checkout handoff on mobile Safari, Android Chrome, tablet, and desktop.

### W2 — Side Cart Settings And Rewards UX (P0)

The side cart is Spark's riskiest custom commerce surface, and its Theme Settings should stay simple enough for merchants to understand. Spark should ship one default reward-threshold pair and leave store-specific currency rules to theme developers instead of exposing hard-coded currency fields that may not match the store.

- Audit the current Side Cart settings groups: General, Rewards Progress, and Suggested Products.
- Keep merchant settings to one free-shipping threshold and one free-gift threshold by default.
- Document `partials/block_cart_progress_wrapper.html` as the extension point for theme developers who need currency-specific reward rules.
- Avoid hard-coded currency fields in core Spark unless the platform can generate them from the store's enabled currencies.
- Review suggested product settings, especially `upsell_fallback_slots`, and decide whether that control belongs in merchant settings or should become an implementation detail.
- Dogfood the free-gift auto-add/remove behavior until it is boringly predictable.

### W3 — Performance And Accessibility (P1)

Set measurable baselines before optimizing. The goal is a theme that stays fast and accessible as design controls expand.

- Establish Core Web Vitals targets on a representative merchant store.
- Audit image loading, `srcset`/`sizes`, lazy loading, and `fetchpriority` across product cards, PDP media, and homepage section partials.
- Measure Web Component hydration cost, especially side cart and product gallery.
- Run Lighthouse and axe across key templates.
- Do a manual keyboard and screen-reader pass for header navigation, PDP, cart drawer, search, and checkout handoff.
- Document findings that should become durable design rules in `DESIGN.md`.

### W4 — Component Robustness (P1)

The custom cart and Web Components need automated coverage before Spark becomes the default theme.

- Add a minimal test harness for component logic.
- Cover `SparkCartClient` with mocked GraphQL responses.
- Cover quantity edge cases, side-cart open/close/render behavior, progress thresholds, and free-gift state transitions.
- Add visual regression coverage for side cart, product cards, and the PDP gallery.
- Run the test suite in CI once the harness exists.

### W5 — Theme Settings And Section Partials (P1)

Spark now has named homepage section partials and stronger Theme Settings coverage. The next pass should make those controls easier for designers and merchants to use.

- Continue improving homepage section partial settings for real quick-build storefront workflows.
- Keep global Theme Settings available as `settings.*`.
- Keep the current homepage include order clear until the platform supports reorderable theme section instances.
- Use `docs/theme-settings-partials.md` as the catalog for design-team block creation.
- Keep Shopify mapping as a docs exercise in the Shopify-to-NEXT guide, not as renamed Spark internals.

### W6 — Future Theme Sections Platform Path (P2)

Spark should be ready if NEXT adds platform-level theme sections, but current Spark docs and code should remain NEXT-native.

- Use `docs/sections-architecture-proposal.md` as the starting proposal.
- Preserve Spark's `templates/`, `partials/`, and global `settings.*` conventions.
- Prefer future `section.settings.*` for section instance settings.
- Prototype with just hero and featured products before attempting a broad migration.
- Validate duplicate/reordered section behavior with app hooks and Theme Settings fallbacks.

### W7 — Theme Developer Docs And Release Hygiene (P2)

Public release is not today's goal, but the repo should gradually become easier for a theme developer to understand and dogfood.

- Keep `README.md`, `CLAUDE.md`, `PLAN.md`, and `docs/` accurate as Spark evolves.
- Add an "Extending Spark" guide for settings, partials, app hooks, and Web Components.
- Document Web Component events, attributes, slots, and public APIs.
- Add a DTL pattern catalog for Spark-specific gotchas.
- Decide the release package shape and license before any public repository or self-serve ZIP release.

---

## First Focus Areas

1. **Merchant dogfooding:** get hard miles on real stores and real carts.
2. **Side cart settings cleanup:** make rewards, thresholds, gifts, and suggested products feel merchant-friendly.
3. **Performance and accessibility baselines:** establish the numbers and workflows before broadening the theme surface.

W4 through W7 should follow once the dogfooding loop is producing concrete issues.

## Working Agreement

- Use a branch and PR for every change.
- Keep PRs mapped to a workstream when possible.
- `DESIGN.md` is the source of truth for visual decisions. If a change intentionally violates it, update `DESIGN.md` in the same PR.
- Rebuild and commit `assets/main.css` with any `css/input.css` source change.
- After the initial dogfood install, push only changed files with `ntk`.

## Open Questions

- Which merchant store is the right next dogfood candidate?
- Does the platform need a cleaner setting type for store-aware currency threshold overrides?
- What is the smallest useful Web Component test harness for Spark?
- Has the platform team scoped NEXT-native theme section instances for any other theme?
