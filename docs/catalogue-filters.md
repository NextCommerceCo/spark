# Catalogue Filters

Spark exposes the platform's category filters without inventing a parallel
catalogue contract. The platform owns the available facets and the filtered
result set; the theme owns only their presentation.

## Surfaces

| File | Role |
| --- | --- |
| `partials/catalogue_filters.html` | Filter form shared by the desktop rail and mobile drawer. Pass `filter_form_id` so repeated controls have unique ids. |
| `partials/catalogue_filter_button.html` | Shared mobile opener used above the grid and in the supplemental sticky bar. |
| `partials/catalogue_filter_drawer.html` | Bottom-sheet dialog containing the mobile copy of the filter form. |
| `partials/catalogue_bar.html` | Supplemental opener shown while a long product grid is being scrolled. |
| `assets/js/spark-catalogue.js` | Page-scoped drawer, focus, filter-count, and sticky-bar behavior. |
| `partials/pagination.html` | Pagination links that preserve active filters with the platform `add_query_param` tag. |

`filters` and `has_active_filter` come from the platform's category view. Every
filter surface is guarded by `{% if filters %}`, so a category without facets
does not render empty controls. The shop index does not receive filter context
and therefore has no filter UI.

## Responsive behavior

From 1024px upward, filters render in a 15rem sticky rail beside the product
grid. Below 1024px, a filter button directly above the grid is the primary
entry point. Its placement keeps filtering reachable when a category is empty,
has only a few products, or is long enough to scroll.

On long lists, the fixed bottom bar is a supplemental entry point. It appears
only after the top of the product grid leaves the viewport and while the grid's
bottom remains below it. When hidden it is both `aria-hidden` and `inert`, so it
cannot leave an off-screen control in the keyboard tab order.

## Navigation state

Pagination uses `{% add_query_param request 'page' page_number %}`. The
platform tag replaces only the page value and preserves the active, including
multi-value, filter parameters. The filter form's Clear link targets the
current request path, so clearing a category does not return shoppers to the
shop index.

## Drawer accessibility

The drawer is a modal dialog. Opening it removes `inert`, updates
`aria-hidden` and the opener's `aria-expanded`, locks body scroll, and moves
focus to the close button. Tab and Shift+Tab wrap within the panel. Escape,
the backdrop, or either close control restores the previous scroll state and
returns focus to the opener.
