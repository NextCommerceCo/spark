# Spark Context

Spark is the NEXT platform default theme in progress: a fast, polished storefront theme that should work well out of the box, demonstrate recommended NEXT patterns, and stay approachable for theme developers, designers, and app developers.

## Domain Terms

**Default theme**
The baseline NEXT storefront theme, similar in role to Shopify Dawn. It should cover common merchant needs, provide strong performance and accessibility defaults, and model the patterns third-party themes should copy.

**Theme developer**
A developer extending Spark or building a derived NEXT theme. Theme developers work primarily with DTL templates, partials, Theme Settings, CSS, JavaScript assets, and Theme Kit.

**Design team**
The team creating Spark design guidance and a Figma component library. Their output should map cleanly to Spark's real theme authoring surfaces instead of assuming future platform features.

**Figma component library**
The design-system representation of Spark's storefront surfaces. For the current platform, it should map to homepage section partials, shared commerce partials, layout regions, Theme Settings, and documented states.

**Campaigns section export flow**
The precedent in `figma-sections-export` and `campaign-page-kit`: Figma section frames are exported one section at a time with desktop/tablet/mobile references, stable properties, screenshots, and assembly tooling. Spark should reuse the discipline, but not the output model; Spark produces maintained storefront theme files, not campaign-local Liquid includes.

**Theme Settings**
Global theme configuration from `configs/settings_schema.json` and `configs/settings_data.json`, exposed to templates as `settings.*`. Theme Settings are the current merchant-editable configuration surface.

**Homepage section partial**
A fixed-order DTL partial included from `templates/index.html` and backed by global Theme Settings. Homepage section partials are Spark's current page-level design block surface.

**Theme section**
A future platform concept for merchant-reorderable, duplicable, page-level section instances with instance-local settings. Do not use this term for today's fixed-order homepage section partials unless explicitly discussing the future platform model.

**Section authoring unit**
The current implementation package for one homepage section partial: a DTL partial, a Theme Settings group, defaults in `settings_data.json`, documentation, empty states, and Figma specs. This is the unit the design team can plan against today.

**Template block**
A Django template inheritance region created with `{% block %}`. This is separate from homepage section partials and should not be used to mean merchant-editable content.

**Partial**
A reusable DTL fragment in `partials/`, included with `{% include %}`. Spark uses NEXT's term `partial`, not Shopify's `snippet`, for theme files.

**App hook**
A platform extension point where apps can inject storefront snippets. App hooks are important for Spark's extension story, but the public developer docs currently document only global header/footer locations; Spark-specific hook locations need explicit documentation before they can be treated as a public contract.

**Web Component**
A client-side custom element used for interactive behavior that should remain progressively enhanced where possible, such as cart, quantity, progress, and add-to-cart behavior.

**PDP variant state**
The selected product variant on the product detail page, derived from `variant_form` fields and `product.data`. This state affects add-to-cart product IDs, price, availability, gallery image, and picker UI. Different picker designs should adapt to this state rather than reimplementing parent/child product matching.

**Variant state adapter**
A visual or behavioral PDP module that reacts to `spark:variant:changed`, such as the add-to-cart form adapter or gallery adapter. Adapters should not parse `#product-data` directly when `SparkVariantState` can provide the selected child product.

**Cart event Interface**
The DOM event contract for Spark cart adapters: `spark:cart:updated`, `spark:cart:added`, and `spark:cart:toggle`, dispatched through `SparkEvents` where possible. This Interface lets cart badge, add-to-cart, side cart, and app hook snippets coordinate without reaching into each other's Implementation.

**Cart rewards**
The side-cart free shipping, free gift, and upsell behavior driven by Theme Settings, cart totals, `isUpsell` cart lines, and product metadata such as `cart_upsell_slots`. Reward rules should live in `SparkCartRewards`, with the cart drawer acting as a UI adapter.

**Cart drawer renderer**
The Module that turns cart data into side-cart line, voucher, totals, and empty-state markup. Keeping this separate from `<spark-cart-drawer>` gives the drawer Locality for interaction state while rendering details stay local to `SparkCartDrawerRenderer`.

**Theme Kit**
The `ntk` CLI used to push, pull, watch, and compile theme files. Theme Kit works with file-based theme surfaces: assets, configs, layouts, locales, partials, templates, checkout templates, Sass, and Tailwind output. It does not provide a runtime section-instance system.

## Current Platform Constraints

- The platform supports DTL `layouts`, `templates`, `partials`, template inheritance, includes, Theme Settings, locale files, app hooks, GraphQL, and client-side JavaScript assets.
- `templates/index.html` receives global objects only, so homepage composition must come from global objects, Theme Settings, and included partials.
- Theme Settings are global `settings.*` values today. There is no current `section.settings.*` instance object for duplicated or reordered page sections.
- Theme Kit uploads and watches known theme file types and directories. It can support Spark's section authoring unit as files, but it cannot by itself make homepage section partials reorderable or duplicable.
- Full page caching means cart, user, wishlist, and other per-user state should live in client-side JavaScript backed by the Storefront GraphQL API, not server-rendered template state.
- Public app-hook locations need to be documented before third-party apps can safely depend on them.

## Architectural Direction

Spark should deepen modules around stable public concepts rather than around incidental implementation files. The strongest near-term opportunity is to make homepage section partials a clear section authoring unit for both Figma and theme development, while preserving a migration path to future theme sections.
