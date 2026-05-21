# Featured Categories Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Featured categories section renders merchant-selected category image tiles. It gives the homepage a lightweight navigation and discovery surface without needing custom page content.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `featured_categories` |
| Merchant label | Featured Categories |
| Current Interface | Global Theme Settings under `show_featured_categories` and `featured_categories_*` |
| Current Implementation | `partials/section_featured_categories.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Featured Categories` |
| Defaults file | `configs/settings_data.json` |
| Design references | `featured_categories-desktop`, `featured_categories-tablet`, `featured_categories-mobile` |
| Runtime JS | None |
| App hooks | None |

## Current Render Contract

- The section renders only when `settings.show_featured_categories` is true and `settings.featured_categories` has at least one category.
- The optional section heading renders above the category grid.
- Category tiles link to `category.get_absolute_url`.
- Category images use `category.image.url`; when missing, Spark renders a quiet fixed-height placeholder.
- Overlay color and opacity apply to every tile.
- Text color applies to every category label.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Featured Categories
```

Recommended reference frame names:

```text
featured_categories-desktop
featured_categories-tablet
featured_categories-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_featured_categories` |
| `categories` | Category list placeholder | `featured_categories` |
| `heading` | Text | `featured_categories_header` |
| `heading_size` | Variant | `featured_categories_header_size` |
| `heading_align` | Variant | `featured_categories_header_align` |
| `columns` | Number | `featured_categories_columns` |
| `background_color` | Color | `featured_categories_bg_color` |
| `overlay_color` | Color | `featured_categories_overlay_color` |
| `overlay_opacity` | Number | `featured_categories_overlay_opacity` |
| `text_color` | Color | `featured_categories_text_color` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_featured_categories` | `checkbox` | `true` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `featured_categories` | `product_categories` | `[]` | `categories` | Category list | Required by current Implementation. Empty list hides the section. |
| `featured_categories_header` | `text` | `Shop by Category` | `heading` | Max 250 chars | Optional; empty hides the heading. |
| `featured_categories_header_size` | `select` | `medium` | `heading_size` | `small`, `medium`, `large` | Maps to Spark heading size classes. |
| `featured_categories_header_align` | `select` | `left` | `heading_align` | `left`, `center`, `right` | Applies to the section heading. |
| `featured_categories_columns` | `range` | `2` | `columns` | 2-5, step 1 | Desktop and tablet grid count; mobile is one column. |
| `featured_categories_bg_color` | `color` | empty | `background_color` | Color | Empty means default page background. |
| `featured_categories_overlay_color` | `color` | `#000000` | `overlay_color` | Color | Applies to every tile overlay. |
| `featured_categories_overlay_opacity` | `range` | `20` | `overlay_opacity` | 0-100, step 5, percent | Applies to every tile overlay. |
| `featured_categories_text_color` | `color` | `#ffffff` | `text_color` | Color | Applies to every category label. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Heading, two columns, category imagery, label overlay. |
| No heading | Header field is empty. |
| 2 columns | Default layout. |
| 5 columns | Highest density layout. |
| Missing category image | Uses neutral fixed-height placeholder. |
| Long category label | Label should remain legible and contained. |
| Overlay off | Opacity 0 should still keep text intentionally readable or show why overlay is needed. |
| High overlay | Opacity 60 or above protects text on busy imagery. |

## QA Checklist

- Verify mobile one-column layout and desktop/tablet configured columns.
- Confirm image hover scale does not reveal empty areas.
- Confirm missing image placeholder height matches image tiles.
- Confirm overlay opacity 0, 20, and 100.
- Confirm text remains readable over varied category imagery.
- Confirm long labels do not collide with tile edges.

## Future Theme Section Migration

When true theme sections exist, `show_featured_categories` should become section presence. The remaining settings should become instance-local settings such as `section.settings.categories`, `section.settings.heading`, `section.settings.columns`, `section.settings.overlay_color`, and `section.settings.text_color`.

## Implementation Gaps Exposed

- Overlay settings are global to every tile. That keeps the Interface simple, but does not support per-category art direction.
- The missing-image state is visually quiet but not explanatory. A future editor-aware placeholder would help merchant setup.
