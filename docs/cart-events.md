# Spark Cart Events

Spark cart behavior is coordinated through a small event Interface in `assets/js/spark-events.js`.

Theme developers and app developers should use these events instead of reaching into cart drawer internals. The events are intentionally DOM-level `CustomEvent`s so they work with DTL-rendered markup, Web Components, and app hook snippets.

## Helper Module

Use `window.SparkEvents` when it is available:

```js
SparkEvents.cartToggle();
SparkEvents.cartUpdated(cart, 'update');
SparkEvents.cartAdded(cart, productId, quantity);
```

The helper dispatches bubbling events on `document`.

## Cart Events

| Event | Dispatched By | Detail | Purpose |
| --- | --- | --- | --- |
| `spark:cart:updated` | `SparkCartClient` mutations | `cart`, `count`, `action` | Tells all cart UI adapters to re-render from the latest cart. |
| `spark:cart:added` | `<spark-add-to-cart>` after a successful add | `cart`, `count`, `action`, `productId`, `quantity`, optional `openSideCart` | Lets the side cart open after an add without making `SparkCartClient` own drawer behavior. |
| `spark:cart:toggle` | Header cart trigger or custom UI | Optional detail object | Toggles the side cart drawer. |

Allowed `spark:cart:updated` actions:

- `add`
- `update`
- `remove`
- `voucher_add`
- `voucher_remove`

`spark:cart:added` also uses `action: "add"` so listeners can share common handling where useful.

## Current Adapters

| Adapter | Listens To | Responsibility |
| --- | --- | --- |
| `SparkCartLoader` | `spark:cart:updated`, `spark:cart:added`, `spark:cart:toggle` | Updates the cart badge, lazy-loads the drawer stack, and forwards add/toggle intent after the drawer is ready. |
| `<spark-cart-drawer>` | `spark:cart:updated`, `spark:cart:added`, `spark:cart:toggle` | Renders the side cart after it is loaded, opens after add, and toggles drawer visibility. |
| Header cart trigger in `theme.js` | User click | Dispatches `spark:cart:toggle`. |
| `<spark-add-to-cart>` | Form submit | Calls `SparkCartClient.addToCart`, then dispatches `spark:cart:added`. |

## Contract Rules

- `SparkCartClient` owns GraphQL cart mutations and dispatches `spark:cart:updated` after successful mutations.
- `<spark-add-to-cart>` owns the extra "user added an item from this form" signal and dispatches `spark:cart:added`.
- Cart UI adapters should re-render from `event.detail.cart` instead of keeping their own stale line data.
- Listeners should tolerate missing optional fields, but `cart`, `count`, and `action` should be present for successful cart mutation events.
- App hook snippets should prefer listening to events over calling private methods on `<spark-cart-drawer>`.

## Progress Events

Cart milestone events are still progress-specific:

- `spark:progress:shipping-reached`
- `spark:progress:shipping-unreached`
- `spark:progress:gift-reached`
- `spark:progress:gift-unreached`

They are part of the rewards Interface and are documented separately from cart mutation events so reward behavior can evolve without changing cart CRUD.
