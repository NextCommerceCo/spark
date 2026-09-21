# Image with Text Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Image with text section renders a 50/50 split of one image and one copy column (eyebrow, heading, rich-text body, optional CTA). It is the foundational story and explainer layout: founder story chapters, ingredient deep-dives, technology callouts. It is not a product spotlight; use Featured product when the copy belongs to a catalogue product.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `image_text` |
| Merchant label | Image with Text |
| Current Interface | Global Theme Settings under `show_image_text` and `image_text_*` |
| Current Implementation | `partials/section_image_text.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Image with Text` |
| Defaults file | `configs/settings_data.json` |
| Design references | `image_text-desktop`, `image_text-tablet`, `image_text-mobile` |
| Runtime JS | None |
| App hooks | None |

## Current Render Contract

- The section renders only when `settings.show_image_text` is true.
- With the toggle on and neither heading nor body configured, the section renders the setup placeholder (dashed border, neutral blocks, pointer to the settings location) instead of an empty band. An image alone is not enough: a lone image beside an empty copy column is never rendered live.
- With a heading or body configured, the section renders live: two columns at `md` and above, one column below `md` with the image always first in DOM order and therefore on top.
- `image_text_image_position` moves the image column with `md:order-*`; it has no effect below `md`.
- `image_text_image_ratio` wraps the image in a fixed-ratio box with `object-cover` for `square` (1:1), `portrait` (4:5), and `landscape` (4:3). `native` renders the image at its own proportions with no crop.
- A missing image with copy present renders a neutral `bg-slate-100` block at the selected ratio (square when `native`), so the layout keeps its shape while the merchant finishes setup.
- Image `alt` is `image_text_image_alt`, falling back to `image_text_heading`.
- Eyebrow, heading, and body each render only when present. Body is rich text and renders with `|safe`, trusting the platform's `richtext` setting type to deliver sanitised HTML, the same assumption the other rich-text sections make. Any change that lets unsanitised markup reach a `richtext` setting must revisit this filter.
- CTA renders only when `image_text_cta_url` is present, through `partials/cta_button.html`. Label falls back to the localized `homepage.cta.shop_now`.
- `image_text_cta_style` maps to the shared button classes: `primary` renders `btn-primary`, `secondary` renders `btn-secondary`, `outline` renders `btn-outline` with the outline colour following `image_text_text_color` when set and the primary brand colour otherwise (the helper's default, so no `style` argument is passed in that branch).
- Background colour is applied only when set; the default is the page background.
- Text colour is applied to the section only when set. When empty the copy uses the theme slate defaults (`text-slate-800` heading, `text-slate-600` body, `text-slate-500` eyebrow). When set, the eyebrow and body inherit the colour at reduced opacity, and the heading carries it as an inline style because the base stylesheet (and the global heading colour setting) give every heading an explicit colour that inheritance cannot override.
- The image is lazy-loaded. This section is not expected to hold the LCP image.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Image with Text
```

Recommended reference frame names:

```text
image_text-desktop
image_text-tablet
image_text-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_image_text` |
| `image` | Image placeholder | `image_text_image` |
| `alt_text` | Text annotation | `image_text_image_alt` |
| `image_position` | Variant | `image_text_image_position` |
| `image_ratio` | Variant | `image_text_image_ratio` |
| `eyebrow` | Text | `image_text_eyebrow` |
| `heading` | Text | `image_text_heading` |
| `body` | Text | `image_text_body` |
| `cta_label` | Text | `image_text_cta_text` |
| `cta_url` | Link annotation | `image_text_cta_url` |
| `cta_style` | Variant | `image_text_cta_style` |
| `background_color` | Color | `image_text_bg_color` |
| `text_color` | Color | `image_text_text_color` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_image_text` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. Off by default so existing stores are unchanged. |
| `image_text_image` | `image_picker` | empty | `image` | Image asset | Empty with copy present renders a neutral block. Set without copy still renders the setup placeholder; the image alone never goes live. |
| `image_text_image_alt` | `text` | empty | `alt_text` | Max 250 chars | Falls back to the heading. |
| `image_text_image_position` | `select` | `left` | `image_position` | `left`, `right` | Desktop and tablet only; mobile always stacks image first. |
| `image_text_image_ratio` | `select` | `square` | `image_ratio` | `square`, `portrait`, `landscape`, `native` | Fixed ratios crop with `object-cover`; `native` never crops. |
| `image_text_eyebrow` | `text` | empty | `eyebrow` | Max 50 chars | Uppercase label above the heading. |
| `image_text_heading` | `text` | empty | `heading` | Max 100 chars | Renders as an `h2`. |
| `image_text_body` | `richtext` | empty | `body` | Max 1000 chars | Rendered with `\|safe`. |
| `image_text_cta_text` | `text` | `Shop now` (localized) | `cta_label` | Max 50 chars | No schema default; the template applies the localized fallback. Requires URL to render. |
| `image_text_cta_url` | `url` | empty | `cta_url` | Max 500 chars | Empty hides the CTA. |
| `image_text_cta_style` | `select` | `primary` | `cta_style` | `primary`, `secondary`, `outline` | Shared `.btn-*` classes. Outline follows the text colour. |
| `image_text_bg_color` | `color` | empty | `background_color` | Color | Empty renders the page background. |
| `image_text_text_color` | `color` | empty | `text_color` | Color | Empty renders the theme slate defaults. |

## Layout Details

| Element | Current Implementation |
| --- | --- |
| Section | `py-section-y md:py-section-y-md`, optional inline background and text colour. |
| Container | Shared `.container`. |
| Grid | `grid-cols-1 md:grid-cols-2`, `gap-content-md md:gap-content-lg`, `items-center`. |
| Image box | Ratio wrapper with `overflow-hidden rounded-card`; `native` uses `w-full h-auto rounded-card` on the image directly. |
| Eyebrow | `text-xs font-semibold uppercase tracking-wide mb-3`. |
| Heading | `text-h1 md:text-h1-md font-semibold mb-4`. |
| Body | Rich text, `mb-6`. |
| CTA | Shared Spark button helper. |

## Image Guidance

- Recommended source minimum: 1200px on the long edge. The column is at most half the container, so 1600px covers 2x displays.
- Keep the subject centred for `square` and `portrait`; `object-cover` crops from the edges as the column width changes between tablet and desktop.
- Use `native` for product cut-outs, illustrations, or any image whose edges carry meaning.
- Do not bake copy into the image. Use the eyebrow, heading, and body settings so the text stays editable and translatable.

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default, image left | Eyebrow, heading, body, primary CTA, square image. |
| Image right | `image_text_image_position` set to `right`. |
| Mobile stacked | Image above copy regardless of position. |
| Square, portrait, landscape, native | One frame per ratio so cropping expectations are explicit. |
| No eyebrow | Heading, body, CTA only. |
| No CTA | CTA URL is empty. |
| Secondary and outline CTA | Both alternate button styles, outline on both default and custom text colour. |
| Custom background and text colour | Dark background with light text. |
| Long heading | Heading at 100 chars wrapping across three lines beside a square image. |
| Missing image | Copy present, neutral block in the image column. |
| Setup placeholder | Toggle on, no heading or body. |
| Image only | Image set, no heading or body: renders the setup placeholder, never a lone image. |

## Accessibility

- The heading renders as `h2`; Hero image keeps the homepage `h1`.
- Every configured image should have merchant-authored alt text. Empty alt falls back to the heading, which is the section's own description of the image subject.
- Custom background and text colours are merchant choices; Figma should include at least one low-contrast pairing that the design guardrails reject.
- The CTA is a normal link and receives the shared focus-visible treatment.

## Performance

- The image uses `loading="lazy"` and is not preloaded. If a merchant places this section directly under a hidden Hero so that it becomes the LCP, revisit the loading hint before changing defaults.
- No JavaScript, no per-user data.

## QA Checklist

Fixture ids refer to [`docs/qa-fixtures.md`](../qa-fixtures.md).

- Verify at desktop 1440px, tablet 768px, and the chosen mobile width.
- Confirm image left and image right swap at `md` and stack image-first on mobile.
- Confirm each ratio value renders the expected box and that `native` does not crop.
- Confirm the long-heading state (100 chars) wraps without overflow and keeps the image vertically centred (FX-S08).
- Confirm the missing-image state renders the neutral block at the selected ratio and the copy still renders (FX-S09).
- Confirm no CTA renders when `image_text_cta_url` is empty (FX-S09), and the localized `Shop now` label renders when only the URL is set.
- Confirm primary, secondary, and outline CTA states match shared Spark button styling, and that outline follows a custom text colour (FX-S08).
- Confirm background and text colours apply only when set, including the heading on a dark background (FX-S08), and default stores render unchanged.
- Confirm the setup placeholder appears with the toggle on and no heading or body, including when only an image is set (FX-S10), and disappears once a heading or body is set.

## Future Theme Section Migration

| Current Key | Future Instance Setting |
| --- | --- |
| `image_text_image` | `section.settings.image` |
| `image_text_image_alt` | `section.settings.alt_text` |
| `image_text_image_position` | `section.settings.image_position` |
| `image_text_image_ratio` | `section.settings.image_ratio` |
| `image_text_eyebrow` | `section.settings.eyebrow` |
| `image_text_heading` | `section.settings.heading` |
| `image_text_body` | `section.settings.body` |
| `image_text_cta_text` | `section.settings.cta_label` |
| `image_text_cta_url` | `section.settings.cta_url` |
| `image_text_cta_style` | `section.settings.cta_style` |
| `image_text_bg_color` | `section.settings.background_color` |
| `image_text_text_color` | `section.settings.text_color` |

`show_image_text` should become section presence once merchants can add, remove, reorder, and duplicate section instances. This section is the first one where duplication matters: alternating image/text chapters need several instances with different content, which the fixed-order global settings model cannot express.

## Implementation Gaps Exposed

- `image_text_cta_style` uses a single three-way select (`primary`, `secondary`, `outline`) as the roster sketch specifies, while the six earlier sections use a `*_cta_style` (`primary`/`accent`) select plus a `*_cta_outline` checkbox. `partials/cta_button.html` gained a `secondary` style so both models share one helper. Decide before public release whether new sections standardise on the three-way select or the older pair.
- Only one instance is possible until true theme sections exist, so "alternating image/text blocks" from the roster still needs static page content today.
- The CTA label fallback reuses `homepage.cta.shop_now`. A story section may want a "Learn more" default; that needs a new locale key across every locale file.
