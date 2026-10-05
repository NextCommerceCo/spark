# Text Block Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Text block section renders a standalone block of copy: eyebrow, heading, and rich-text body, with no image or button. It covers the brand statement under the hero, an intro paragraph, or a closing thought between sections. Use Image with text when the copy needs an image beside it, and Promo banner when it needs a call to action.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `text_block` |
| Merchant label | Text Block |
| Current Interface | Global Theme Settings under `show_text_block` and `text_block_*` |
| Current Implementation | `partials/section_text_block.html` |
| Included from | `templates/index.html`, directly after the hero |
| Settings groups | `Homepage > Sections`, `Homepage > Text Block` |
| Defaults file | `configs/settings_data.json` |
| Design references | `text_block-desktop`, `text_block-tablet`, `text_block-mobile` |
| Runtime JS | None |
| App hooks | None |

## Current Render Contract

- The section renders only when `settings.show_text_block` is true.
- With the toggle on and neither heading nor body configured, the section renders the setup placeholder (dashed border, neutral lines, pointer to the settings location), and only in the Theme Editor or a theme preview. Live visitors see nothing. An eyebrow alone is not enough to go live.
- With a heading or body configured, the section renders live inside the shared `.container`.
- `text_block_width` caps the line length of the copy column: `narrow` is `max-w-xl`, `medium` (default) is `max-w-3xl`, `wide` is `max-w-5xl`.
- `text_block_align` `center` (default) centres the column and its text; `left` aligns both to the left edge of the page content.
- Eyebrow, heading, and body each render only when present. Body is rich text and renders with `|safe`, trusting the platform's `richtext` setting type to deliver sanitised HTML, the same assumption the other rich-text sections make. Any change that lets unsanitised markup reach a `richtext` setting must revisit this filter.
- Background colour is applied only when set; the default is the page background.
- Text colour is applied to the section only when set. When empty the copy uses the theme slate defaults (`text-slate-800` heading, `text-slate-600` body, `text-slate-500` eyebrow). When set, the eyebrow and body inherit the colour at reduced opacity, and the heading carries it as an inline style because the base stylesheet (and the global heading colour setting) give every heading an explicit colour that inheritance cannot override.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Text Block
```

Recommended reference frame names:

```text
text_block-desktop
text_block-tablet
text_block-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_text_block` |
| `eyebrow` | Text | `text_block_eyebrow` |
| `heading` | Text | `text_block_heading` |
| `body` | Text | `text_block_body` |
| `align` | Variant | `text_block_align` |
| `width` | Variant | `text_block_width` |
| `background_color` | Color | `text_block_bg_color` |
| `text_color` | Color | `text_block_text_color` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_text_block` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. Off by default so existing stores are unchanged. |
| `text_block_eyebrow` | `text` | empty | `eyebrow` | Max 50 chars | Uppercase label above the heading. Does not make the section live on its own. |
| `text_block_heading` | `text` | empty | `heading` | Max 100 chars | Renders as an `h2`. |
| `text_block_body` | `richtext` | empty | `body` | Max 2000 chars | Rendered with `\|safe`. |
| `text_block_align` | `select` | `center` | `align` | `center`, `left` | Aligns the column and its text. |
| `text_block_width` | `select` | `medium` | `width` | `narrow`, `medium`, `wide` | `max-w-xl`, `max-w-3xl`, `max-w-5xl`. |
| `text_block_bg_color` | `color` | empty | `background_color` | Color | Empty renders the page background. |
| `text_block_text_color` | `color` | empty | `text_color` | Color | Empty renders the theme slate defaults. |

## Layout Details

| Element | Current Implementation |
| --- | --- |
| Section | `py-section-y md:py-section-y-md`, optional inline background and text colour. |
| Container | Shared `.container`. |
| Copy column | `max-w-xl` / `max-w-3xl` / `max-w-5xl`; `mx-auto text-center` when centred, `text-left` when left-aligned. |
| Eyebrow | `text-xs font-semibold uppercase tracking-wide mb-3`. |
| Heading | `text-h1 md:text-h1-md font-semibold mb-4`. |
| Body | Rich text. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Eyebrow, heading, and body, centred, medium width. |
| Left aligned | `text_block_align` set to `left`. |
| Narrow, medium, wide | One frame per width so line-length expectations are explicit. |
| Heading only | Short brand statement with no body. |
| Body only | Intro paragraph with no heading. |
| Long copy | 100-character heading and a long multi-paragraph body. |
| Custom background and text colour | Dark background with light text. |
| Setup placeholder | Toggle on, no heading or body, seen in the Theme Editor. |

## Accessibility

- The heading renders as `h2`; Hero image keeps the homepage `h1`. A body-only block has no heading, which is correct for an intro paragraph.
- Custom background and text colours are merchant choices; Figma should include at least one low-contrast pairing that the design guardrails reject.
- Rich-text links in the body inherit the theme link styles and focus treatment.

## Performance

- No images, no JavaScript, no per-user data.

## QA Checklist

Fixture ids refer to [`docs/qa-fixtures.md`](../qa-fixtures.md). Check the placeholder state from the Theme Editor or a preview link; it never renders on the live storefront.

- Verify at desktop 1440px, tablet 768px, and the chosen mobile width.
- Confirm each width value caps the line length as listed, and that `left` and `center` alignment both hold at every width.
- Confirm the long-copy state wraps without overflow and multi-paragraph rich text keeps its spacing (FX-S11).
- Confirm background and text colours apply only when set, including the heading on a dark background (FX-S11), and default stores render unchanged.
- Confirm heading-only and body-only configurations render live without empty gaps.
- Confirm the setup placeholder appears in the Theme Editor with the toggle on and no heading or body, including when only the eyebrow is set (FX-S12), and that the live storefront shows nothing in that state.

## Future Theme Section Migration

| Current Key | Future Instance Setting |
| --- | --- |
| `text_block_eyebrow` | `section.settings.eyebrow` |
| `text_block_heading` | `section.settings.heading` |
| `text_block_body` | `section.settings.body` |
| `text_block_align` | `section.settings.align` |
| `text_block_width` | `section.settings.width` |
| `text_block_bg_color` | `section.settings.background_color` |
| `text_block_text_color` | `section.settings.text_color` |

`show_text_block` should become section presence once merchants can add, remove, reorder, and duplicate section instances. Until then the block has one fixed position, directly after the hero.

## Implementation Gaps Exposed

- The fixed position after the hero suits a brand statement or intro paragraph. A closing thought lower on the page needs reorderable sections.
- There is no button. A text block that needs a call to action should use Promo banner, or this section gains optional `text_block_cta_*` settings later.
