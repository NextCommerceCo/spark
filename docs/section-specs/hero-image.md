# Hero Image Section Spec

Status: pilot section authoring unit for the Spark Figma component library.

The Hero image section is the first viewport storytelling module for the homepage. It gives merchants a full-width image, optional mobile image, text overlay, and one CTA while keeping the storefront fast and predictable.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `hero_image` |
| Merchant label | Hero |
| Current Interface | Global Theme Settings under `show_hero` and `homepage_hero_*` |
| Current Implementation | `partials/section_hero.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Hero` |
| Defaults file | `configs/settings_data.json` |
| Design references | `hero_image-desktop`, `hero_image-tablet`, `hero_image-mobile` |
| Runtime JS | None |
| App hooks | None |

## Purpose

Use this section when the merchant needs a strong first impression: a seasonal campaign, brand story, featured collection, product launch, or primary shopping path.

Do not use this section for dense merchandising, multiple offers, or app-injected content. Those should be separate section authoring units.

## Current Render Contract

- The section renders only when `settings.show_hero` is true and `settings.homepage_hero_image` has a value.
- The template preloads the image through `critical_preloads`, and the visible image is rendered with `loading="eager"` and `fetchpriority="high"` because this section is usually above the fold.
- The desktop image is always the fallback image.
- The mobile image is served through a `<source>` at `max-width: 767px`.
- The image uses `object-cover`, so Figma references must include safe focal areas for cropping.
- Overlay color and overlay opacity render only when `homepage_hero_overlay_color` has a value.
- Text color defaults to white.
- CTA renders through `partials/cta_button.html`, and only appears when both URL and label are present.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Hero Image
```

Recommended reference frame names:

```text
hero_image-desktop
hero_image-tablet
hero_image-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_hero` |
| `image` | Image placeholder | `homepage_hero_image` |
| `mobile_image` | Image placeholder | `homepage_hero_image_mobile` |
| `heading` | Text | `homepage_hero_heading` |
| `subheading` | Text | `homepage_hero_subheading` |
| `text_color` | Color | `homepage_hero_text_color` |
| `text_align` | Variant | `homepage_hero_text_align` |
| `content_position` | Variant | `homepage_hero_content_position` |
| `content_width` | Variant | `homepage_hero_content_width` |
| `height` | Variant | `homepage_hero_height` |
| `overlay_color` | Color | `homepage_hero_overlay_color` |
| `overlay_opacity` | Number | `homepage_hero_overlay_opacity` |
| `alt_text` | Text annotation | `homepage_hero_alt` |
| `cta_url` | Link annotation | `homepage_hero_link` |
| `cta_label` | Text | `homepage_hero_cta` |
| `cta_style` | Variant | `homepage_hero_cta_style` |
| `cta_outline` | Boolean | `homepage_hero_cta_outline` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_hero` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `homepage_hero_image` | `image_picker` | empty | `image` | Image asset | Required by the current Implementation. Without it, the section does not render. |
| `homepage_hero_image_mobile` | `image_picker` | empty | `mobile_image` | Image asset | Optional. Falls back to desktop image below 768px. |
| `homepage_hero_heading` | `text` | empty | `heading` | Max 100 chars | Renders as the homepage `h1` when present. |
| `homepage_hero_subheading` | `text` | empty | `subheading` | Max 200 chars | Renders below heading when present. |
| `homepage_hero_text_color` | `color` | `#ffffff` | `text_color` | Color | Applied to the whole content layer. |
| `homepage_hero_text_align` | `select` | `left` | `text_align` | `left`, `center`, `right` | Applies to heading, subheading, and CTA alignment inside the content block. |
| `homepage_hero_content_position` | `select` | `bottom-left` | `content_position` | `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` | Uses flex alignment on an absolute content layer. |
| `homepage_hero_content_width` | `select` | `medium` | `content_width` | `narrow`, `medium`, `wide`, `full` | Maps to Tailwind max widths: `max-w-xl`, `max-w-2xl`, `max-w-4xl`, `max-w-none`. |
| `homepage_hero_height` | `select` | `medium` | `height` | `medium`, `large`, `full` | Medium: `50vh` mobile and `70vh` desktop. Large: `65vh` mobile and `80vh` desktop. Full: `100vh`. |
| `homepage_hero_overlay_color` | `color` | empty | `overlay_color` | Color | Empty means no overlay layer. |
| `homepage_hero_overlay_opacity` | `range` | `30` | `overlay_opacity` | 0-100, step 5, percent | Only visible when overlay color is set. |
| `homepage_hero_alt` | `text` | empty | `alt_text` | Max 250 chars | Falls back to `store.name` if empty. |
| `homepage_hero_link` | `url` | empty | `cta_url` | Max 500 chars | Required for CTA rendering. |
| `homepage_hero_cta` | `text` | `Shop now` | `cta_label` | Max 50 chars | Required for CTA rendering. |
| `homepage_hero_cta_style` | `select` | `primary` | `cta_style` | `primary`, `accent` | Uses merchant brand color tokens through `partials/cta_button.html`. |
| `homepage_hero_cta_outline` | `checkbox` | `false` | `cta_outline` | `true`, `false` | Outline color follows the selected CTA style. |

## Layout Details

| Element | Current Implementation |
| --- | --- |
| Section | Full-width, `relative`, `overflow-hidden`. |
| Image | Width 100%, object cover, viewport-height based. |
| Content layer | Absolute inset, flex alignment, `p-8` mobile and `md:p-12` desktop. |
| Content width | `narrow` 36rem, `medium` 42rem, `wide` 56rem, `full` unconstrained. |
| Heading | `text-3xl md:text-5xl`, semibold, text shadow. |
| Subheading | `text-base md:text-lg`, text shadow. |
| CTA | Shared Spark button helper. |

The current content layer is not constrained by the global `.container` width. If the Figma library wants hero copy aligned to the same 1280px container as other homepage sections, treat that as a conscious Implementation change before public release.

## Image Guidance

- Desktop image should be landscape and high resolution. Recommended source minimum: 2400px wide.
- Mobile image should protect the focal point in a narrow crop. Recommended source minimum: 1200px wide.
- Keep faces, products, and important copy away from the outer 15% safe area because `object-cover` cropping changes by viewport and height.
- Avoid putting text inside the image asset. Use the theme heading, subheading, and CTA settings so merchants can edit content and preserve accessibility.
- If the image is decorative but still central to the offer, use concise alt text that describes the visual context.

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Desktop, tablet, and mobile references for normal merchant setup. |
| Mobile image fallback | Shows desktop image behavior when no mobile image is configured. |
| No CTA | CTA URL is empty, so no button renders. |
| Heading only | Subheading is empty. |
| Image only | Heading, subheading, and CTA are empty. |
| Overlay off | Overlay color is empty. |
| Overlay high contrast | Overlay color and opacity protect text readability. |
| Long copy | Heading at 100 chars and subheading at 200 chars should not overflow or collide with CTA. |
| Missing image | Current Implementation hides the section; decide whether a setup placeholder is needed later. |

## Accessibility

- Keep one visible `h1` on the homepage. If future homepage sections can be reordered above Hero image, revisit heading level ownership.
- Every configured hero image should have merchant-authored alt text. Empty alt currently falls back to `store.name`.
- Text and CTA contrast must pass against the image plus overlay. Figma should include at least one low-contrast image example with overlay adjusted.
- The CTA is a normal link and receives the shared focus-visible treatment.

## Performance

- Keep the desktop hero image optimized because it is likely the LCP image.
- Use a separate mobile crop when the desktop image wastes bytes or loses focus on mobile.
- Do not add JavaScript to the Hero image section unless a new interaction clearly earns the cost.
- Do not fetch per-user data in this section; homepage pages can be cached.

## QA Checklist

- Verify at desktop 1440px, tablet 768px, and the chosen mobile width.
- Confirm mobile uses `homepage_hero_image_mobile` below 768px when present.
- Confirm fallback to desktop image when mobile image is empty.
- Confirm each `content_position` value lands in the expected corner or center.
- Confirm `content_width` variants do not let long words overflow.
- Confirm no CTA renders when `homepage_hero_link` is empty.
- Confirm primary, accent, and outline CTA states match shared Spark button styling.
- Confirm overlay opacity values 0, 30, and 100 behave as expected.
- Confirm image-only and heading-only states remain intentional.

## Future Theme Section Migration

When NEXT supports true theme sections, this section should migrate from global settings to instance-local settings without changing its design semantics:

| Current Key | Future Instance Setting |
| --- | --- |
| `homepage_hero_image` | `section.settings.image` |
| `homepage_hero_image_mobile` | `section.settings.mobile_image` |
| `homepage_hero_heading` | `section.settings.heading` |
| `homepage_hero_subheading` | `section.settings.subheading` |
| `homepage_hero_text_color` | `section.settings.text_color` |
| `homepage_hero_text_align` | `section.settings.text_align` |
| `homepage_hero_content_position` | `section.settings.content_position` |
| `homepage_hero_content_width` | `section.settings.content_width` |
| `homepage_hero_height` | `section.settings.height` |
| `homepage_hero_overlay_color` | `section.settings.overlay_color` |
| `homepage_hero_overlay_opacity` | `section.settings.overlay_opacity` |
| `homepage_hero_alt` | `section.settings.alt_text` |
| `homepage_hero_link` | `section.settings.cta_url` |
| `homepage_hero_cta` | `section.settings.cta_label` |
| `homepage_hero_cta_style` | `section.settings.cta_style` |
| `homepage_hero_cta_outline` | `section.settings.cta_outline` |

`show_hero` should become section presence, not an instance-local setting, once merchants can add, remove, reorder, and duplicate section instances.

## Implementation Gaps Exposed

- Missing image currently hides the section. That is clean for live storefronts but weak for merchant setup and design QA. A future editor-aware placeholder would be better than a public live placeholder.
- Hero copy is not aligned to the shared `.container`. Decide whether that is intentional before the Figma library hardens around this layout.
- `homepage_hero_alt` needs to stay visible in docs and Figma specs because it is easy to overlook in a visually driven workflow.
