# Spark Cart Drawer Architecture

`<spark-cart-drawer>` is Spark's public side-cart Adapter. It owns drawer state, focus management, event listeners, and cart mutations. Supporting Modules keep the Implementation local without changing the external Interface.

## Modules

| Module | Responsibility |
| --- | --- |
| `assets/js/components/spark-cart-drawer.js` | Web Component Adapter: open/close/toggle, event listeners, mutation orchestration, loading state, focus behavior. |
| `assets/js/spark-cart-drawer-renderer.js` | Markup renderer for cart lines, vouchers, totals, and empty state. |
| `assets/js/spark-cart-rewards.js` | Reward and upsell rules: gift line detection, progress updates, active upsell slots, fallback slots, product-in-cart hiding. |
| `assets/js/spark-cart.js` | GraphQL cart client: cart CRUD, voucher mutations, cart id persistence, money formatting, and `spark:cart:updated` dispatch. |
| `assets/js/spark-events.js` | DOM event names and dispatch helpers used by cart adapters. |
| `assets/js/components/spark-upsell-item.js` | Single upsell row Adapter. |
| `assets/js/components/spark-progress-bar.js` | Cart milestone progress Adapter. |

## Public Interface

Theme developers should use:

- `<spark-cart-drawer>` markup from `partials/side_cart.html`.
- `window.SparkSideCart.open()`, `.close()`, `.toggle()`, and `.isOpen()`.
- Cart events documented in `docs/cart-events.md`.
- Reward rules documented in `docs/cart-rewards.md`.

Theme developers should not call private drawer methods such as `_renderCart`, `_handleQtyChange`, or `_toggleGift`.

## Locality Rules

- Cart CRUD belongs in `SparkCartClient`.
- Drawer generated HTML belongs in `SparkCartDrawerRenderer`.
- Free gift and upsell interpretation belongs in `SparkCartRewards`.
- The drawer may coordinate these Modules, but should not re-own their rules.
- New app hook integrations should use cart events or a documented Adapter, not mutation of the drawer shadow DOM.
