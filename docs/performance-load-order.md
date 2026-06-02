# Spark Performance Load Order

Spark's document shell follows a strict critical-path order inspired by the strongest Shopify theme performance conventions, mapped to NEXT's DTL layout and app hook model.

The goal is simple: the browser should discover metadata, LCP assets, and CSS before it discovers non-critical JavaScript, tracking, reviews, or social proof.

## Layout Contract

`layouts/base.html` owns the global page order:

1. Metadata, SEO, locale, viewport, robots, and favicon.
2. `critical_preloads` for page-specific LCP assets only.
3. `styles` for the main stylesheet, optional font embed, and small inline theme variables.
4. `priority_scripts` for rare before-paint JavaScript.
5. `extrahead` and `head_app_hooks` for platform-critical head snippets.
6. Body content through `content_wrapper`.
7. Non-critical UI shells such as the side cart.
8. Minimal global JavaScript: `SparkEvents`, `SparkCartLoader`, `theme.js`, and platform compatibility.
9. Page `component_scripts`, page `extrascripts`, inline Spark enhancements, footer app hooks, and `tracking`.

## Theme-Side Rules

- Use `critical_preloads` for one or two LCP resources per template. Do not preload whole carousels, product grids, review widgets, or tracking scripts.
- If an image is preloaded as LCP, the visible `<img>` should also use `loading="eager"` and `fetchpriority="high"`.
- Keep below-fold product cards, thumbnails, cart lines, review images, and upsells lazy-loaded.
- Keep new JavaScript at the bottom by default. Page-specific Web Components belong in `component_scripts`, not the global layout.
- Keep PDP-only modules such as variant state, gallery, quantity, and add-to-cart in `templates/catalogue/product.html`.
- Keep the side-cart drawer stack lazy-loaded through `SparkCartLoader`; do not add drawer modules back to the base layout.
- Do not add `defer` to the core script stack unless dependent `component_scripts` and inline `extrascripts` are also moved to a deferred-safe initialization pattern.
- Put app integrations in footer hooks unless they must affect initial rendering. `global_header` is reserved for platform-critical head snippets.
- Put merchant analytics in the `tracking` block so it runs after content and theme JavaScript by default.
- Prefer system fonts. If a merchant supplies `font_script`, the main stylesheet is still discovered first.

## Current LCP Preloads

Spark currently preloads:

- Homepage hero image in `templates/index.html`, with separate mobile and desktop preloads when a mobile hero is configured.
- PDP primary gallery image in `templates/catalogue/product.html`.
- Blog post featured image in `templates/blog/post.html`.

Other templates should add a `critical_preloads` override only when they have a stable above-the-fold image or font that consistently becomes LCP.

## Current JavaScript Scoping

Spark's global layout loads only:

- `spark-events.js`
- `spark-cart-loader.js`
- `theme.js`
- `spark-platform.js`

The product template loads PDP-specific modules through `component_scripts`:

- `spark-variant-state.js`
- `spark-gallery.js`
- `spark-cart.js`
- `spark-quantity.js`
- `spark-subscription.js`
- `spark-add-to-cart.js`

The cart client is loaded for saved-cart badge hydration. The full side-cart drawer stack is registered only when a shopper toggles the cart, adds to cart, or arrives with an `openSideCart` cookie.

## Platform Opportunities

Some performance orchestration is better handled by NEXT itself:

- Converting theme preload declarations into HTTP `Link` headers or Early Hints.
- Asset hashing, CDN caching, compression, and cache invalidation.
- App hook classification, so apps can declare whether a snippet is head-critical, visual, interaction-only, or tracking-only.
- Automated checks that flag parser-blocking head scripts, excessive preloads, large CSS, and remote assets.

Spark should model the best convention now, then let the platform make that convention harder to misuse later.
