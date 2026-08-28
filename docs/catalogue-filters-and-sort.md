# Catalogue Filters And Sort

How the category and shop-index pages expose filtering and sorting, and what
the platform does and does not do for you.

## Surfaces

| File | Role |
| --- | --- |
| `partials/catalogue_filters.html` | The filter form. Rendered twice on a category page: in the desktop rail and inside the mobile drawer. Pass `filter_form_id` so the two copies do not share an element id, and `hide_heading` where the surrounding chrome already has a title. |
| `partials/catalogue_filter_drawer.html` | Bottom-sheet dialog holding the filter form below 1024px. |
| `partials/catalogue_bar.html` | Sticky bottom bar with the Filter and Sort controls. Mobile and tablet only. |
| `partials/catalogue_sort.html` | The sort `<select>` and its form. Included in the sticky bar and, on desktop, above the grid. |
| `partials/pagination_query.html` | Query-string suffix that keeps filters and sort across page links. |
| `assets/js/theme.js` | `initCatalogue()` wires the drawer, the sticky bar, the active-filter count, and the sort. |

## Filters

`filters` and `has_active_filter` come from the platform's category view. The
theme renders whatever the view provides; it does not define facets.

`templates/catalogue/index.html` (the shop index) receives no `filters`
context, so the rail and drawer are skipped there and only the sort control
renders. Every filter surface is wrapped in `{% if filters %}`, so a store
with no configured facets gets no filter UI at all.

Filter links and the "Clear" action stay on the current path, so clearing the
filters on a category page keeps you in that category.

## Sorting: read this before changing it

**The platform has no catalogue ordering parameter.** The category and shop
index views accept no `sort_by`, `order_by` or `ordering` argument, the
documented template context exposes no sort variable, and the Storefront
GraphQL API has no ordering argument on `products` (and no category field at
all). Sorting is therefore implemented entirely in the theme.

What that means in practice:

- `sort_by` is a **theme-level** query parameter. The select submits it, the
  URL carries it, and `assets/js/theme.js` reorders the rendered product
  cards.
- The reorder can only touch the products the view already put on **the
  current page**. On a catalogue that runs to more than one page, "Price: low
  to high" means "cheapest first among the products on this page", not
  "cheapest in the category".
- Because of that, the control ships **off by default**, behind
  `Theme Settings > Catalogue > Show Sort Control` (`catalogue_sort`).
  Turn it on for catalogues that fit on a single page. Leave it off
  otherwise.

If the platform later exposes an ordering parameter on the catalogue view,
the fix is small: the parameter name and the option values already match a
conventional server-side contract, so the view can start honouring `sort_by`
and the client-side reorder in `theme.js` can be deleted.

### Options

| Value | Label | Ordering key |
| --- | --- | --- |
| _(empty)_ | Featured | Whatever order the view returned. No reorder runs. |
| `price-asc` | Price: low to high | `data-base-price` on `.product-price` |
| `price-desc` | Price: high to low | `data-base-price` on `.product-price` |
| `title-asc` | Name: A to Z | `data-sort-title` on `.product-card` |

Cards with no readable price keep their original position, after the priced
ones. Ties fall back to the view's order, so the sort is stable.

There is no "Newest" option. The catalogue template context exposes no
creation date on the product, so the theme has nothing to order by.

## Keeping state across navigation

Three places carry query state so a filter or sort selection is not silently
dropped:

- The sort form re-emits every current parameter except `sort_by` and `page`
  as hidden inputs.
- The filter form re-emits `sort_by` as a hidden input.
- `partials/pagination_query.html` appends every parameter except `page` to
  each pagination link.

All three read `request.GET.lists`, so multi-value facets survive.

## Breakpoint and layering

- The rail, and the sort control above the grid, appear from **1024px**. That
  is the same breakpoint at which the PDP's sticky add-to-cart bar hides, and
  the same one at which the product grid goes to three columns.
- Below 1024px the rail and the inline sort are hidden and `.catalogue-bar`
  takes over.
- `.catalogue-bar` sits at `z-index: 50`, the same tier as the PDP sticky
  add-to-cart bar. The two never appear on the same page.
- `.filter-drawer` sits at `z-index: 60`, the panel tier shared with the
  mobile nav and search overlay, so it covers the bar while it is open. The
  side cart stays above everything at `z-index: 70`.

## Sticky bar behaviour

The bar mirrors the PDP sticky add-to-cart bar: `position: fixed` at the
bottom, `transform: translateY(100%)` by default, and a
`.catalogue-bar-visible` class that slides it in over 250ms.

It is shown only while the top of the grid has scrolled above the viewport
**and** the bottom of the grid is still below it. That second condition is
what keeps the bar from ever covering the pagination or the footer: it slides
back out as you reach the end of the grid.

## Accessibility

- Both controls are real elements: a `<button type="button">` and a
  `<select>`, each at least 44px tall.
- The drawer is `role="dialog" aria-modal="true"`, toggles `aria-hidden`, and
  toggles `aria-expanded` on the button that opens it.
- Opening moves focus to the close button, Tab is trapped inside the panel,
  Escape and the backdrop close it, and focus returns to the button that
  opened it.
- Body scroll is locked while the drawer is open and restored to its previous
  value on close.
