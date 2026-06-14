# PDP Variant State

Spark exposes PDP selected-variant behavior through `assets/js/spark-variant-state.js`.

The goal is to let theme developers redesign variant pickers without reimplementing child product matching, form action updates, price updates, or gallery image synchronization.

For full PDP redesign work, pair this Interface with `docs/pdp-customization.md`. The customization runbook covers the surrounding preservation checklist for product data, price nodes, add-to-cart forms, quantity, subscription, app hooks, inventory states, sticky CTAs, and QA.

## Interface

`SparkVariantState` reads:

- `#product-data`, emitted by `{{ product.data|json_script:"product-data" }}`.
- Variant controls matching `[name^="attr_"]`, including radio inputs and selects.

It provides:

- `SparkVariantState.fromPage()` to create a state object from the current PDP.
- `state.getSelection()` for selected `attr_*` values.
- `state.getSelectedVariant()` for the matching child product.
- `state.getDefaultVariant()` for the first child product.
- `state.onChange(callback)` to react to picker changes.
- `state.emitChange(variant)` to dispatch the shared event.
- Static helpers for form action updates, price updates, purchase availability, and variant image URLs.

It dispatches:

```js
document.addEventListener('spark:variant:changed', function(event) {
  var variant = event.detail.variant;
  var selection = event.detail.selection;
});
```

## Adapters

Current Adapters at this Seam:

| Adapter | Responsibility |
| --- | --- |
| `assets/js/theme.js` | Initializes PDP variant state, updates add-to-cart form action, button availability, and visible price. |
| `assets/js/spark-gallery.js` | Listens for `spark:variant:changed` and advances or swaps the gallery image. |
| `templates/catalogue/product.html` | Emits product data, renders picker controls, marks price nodes with `data-price` and `data-price-retail`, and keeps a no-theme fallback. |

## Theme Developer Guidance

Custom picker designs should keep the same control names (`attr_<code>`) and values from `variant_form`. A picker can be radio-based, select-based, swatch-based, or visually custom as long as it updates a real form control with the matching name and value.

Theme developers should listen for `spark:variant:changed` when they need selected-variant behavior, rather than parsing `#product-data` directly.

## Public-Release Notes

- The event payload should remain small: `product`, `variant`, and `selection`.
- Do not make gallery, price, or add-to-cart code own child product matching.
- Keep this Module independent from any one visual picker style.
