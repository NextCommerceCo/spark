# Spark Cart Rewards

Spark side-cart rewards and upsells are coordinated by `assets/js/spark-cart-rewards.js`.

The drawer is the UI Adapter. `SparkCartRewards` owns the reward interpretation rules: free-gift line detection, progress value updates, cart product lookup, `cart_upsell_slots` metadata parsing, fallback upsell slots, and show/hide behavior for upsell items.

## Reward Inputs

| Source | Meaning |
| --- | --- |
| `settings.enable_progress_bar` | Enables the cart milestone progress bar. |
| `settings.usd_goal_1` | First threshold, currently used for free shipping messaging. |
| `settings.usd_goal_2` | Second threshold, currently used for free gift messaging. |
| `settings.gift_product` | Product or first child product to auto-add as the free gift. |
| `settings.enable_upsells` | Enables suggested product slots in the side cart. |
| `settings.upsell_product_1..3` | Merchant-selected upsell products. |
| `settings.upsell_fallback_slots` | Slots to show when no cart product metadata activates slots. |
| Product metadata `cart_upsell_slots` | Comma-separated upsell slot ids activated by products in cart. |

## Interfaces

`SparkCartRewards` provides:

- `giftState(cart, giftProductId)` to find whether the configured gift is already in the cart.
- `toggleGift(client, cart, shouldAdd, giftProductId, giftLineId)` to add or remove a free gift line.
- `updateProgressBar(progressBar, total)` to update cart milestone progress.
- `updateUpsellVisibility(root, cart)` to show or hide slotted upsell items.
- `hideUpsells(root)` for empty-cart state.
- `activeUpsellSlots(cart)` and `productIdsInCart(cart)` for tests and future adapters.

## Current Adapters

| Adapter | Responsibility |
| --- | --- |
| `<spark-cart-drawer>` | Calls `SparkCartRewards` after render and in free-gift threshold handlers. |
| `<spark-progress-bar>` | Emits progress threshold events when the cart total crosses milestone values. |
| `<spark-upsell-item>` | Adds the selected upsell variant to the cart. Visibility comes from `SparkCartRewards`. |

## Rules

- Free gifts are cart lines marked as `isUpsell` and matching the configured gift product id.
- Upsell products already present in the cart, either by child id or parent id, are hidden.
- If any cart product metadata declares `cart_upsell_slots`, only those slots are active.
- If no cart product activates slots, each upsell item falls back to its own `data-fallback-slots`.
- Upsell slot ids are strings, trimmed after comma splitting.

## Future Work

- Multi-currency thresholds should be a settings and platform decision, not hidden in drawer JavaScript.
- If apps need to register dynamic upsells, expose an explicit Adapter at the same `SparkCartRewards` Seam instead of teaching apps to mutate drawer internals.
