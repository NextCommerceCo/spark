# Promo Banner Section Spec

Status: first-pass section authoring unit for the Spark Figma component library.

The Promo banner section renders a full-width text offer with optional subheading and CTA. It is a compact campaign band, not a replacement for Hero image.

## Module Summary

| Field | Value |
| --- | --- |
| Stable slug | `promo_banner` |
| Merchant label | Promo Banner |
| Current Interface | Global Theme Settings under `show_promo_banner` and `promo_banner_*` |
| Current Implementation | `partials/section_promo_banner.html` |
| Included from | `templates/index.html` |
| Settings groups | `Homepage > Sections`, `Homepage > Promo Banner` |
| Defaults file | `configs/settings_data.json` |
| Design references | `promo_banner-desktop`, `promo_banner-tablet`, `promo_banner-mobile` |
| Runtime JS | None |
| App hooks | None |

## Current Render Contract

- The section renders only when `settings.show_promo_banner` is true and `settings.promo_banner_heading` has a value.
- The section is centered and full width.
- Background color defaults to `var(--primary-color)` when unset.
- Text color defaults to white when unset.
- Subheading renders only when present.
- CTA renders only when `promo_banner_cta_url` is present.
- CTA renders through `partials/cta_button.html` with a local outline color.
- There is no client-side behavior and no GraphQL dependency.

## Figma Component

Recommended component name:

```text
Homepage/Promo Banner
```

Recommended reference frame names:

```text
promo_banner-desktop
promo_banner-tablet
promo_banner-mobile
```

Recommended component properties:

| Property | Type | Maps To |
| --- | --- | --- |
| `show` | Boolean | `show_promo_banner` |
| `heading` | Text | `promo_banner_heading` |
| `subheading` | Text | `promo_banner_subheading` |
| `cta_label` | Text | `promo_banner_cta_text` |
| `cta_url` | Link annotation | `promo_banner_cta_url` |
| `background_color` | Color | `promo_banner_bg_color` |
| `text_color` | Color | `promo_banner_text_color` |
| `cta_style` | Variant | `promo_banner_cta_style` |
| `cta_outline` | Boolean | `promo_banner_cta_outline` |

## Setting Map

| Key | Type | Default | Figma Property | Values / Limits | Notes |
| --- | --- | --- | --- | --- | --- |
| `show_promo_banner` | `checkbox` | `false` | `show` | `true`, `false` | Lives in `Homepage > Sections`; hides the whole section when false. |
| `promo_banner_heading` | `text` | empty in shipped data | `heading` | Max 100 chars | Required by current Implementation. Schema default is `Limited Time Offer`, but shipped data is empty. |
| `promo_banner_subheading` | `text` | empty | `subheading` | Max 200 chars | Optional supporting text. |
| `promo_banner_cta_text` | `text` | `Shop Now` | `cta_label` | Max 50 chars | Requires URL to render. |
| `promo_banner_cta_url` | `url` | empty | `cta_url` | Max 500 chars | Empty hides CTA. |
| `promo_banner_bg_color` | `color` | empty | `background_color` | Color | Empty renders `var(--primary-color)`. |
| `promo_banner_text_color` | `color` | empty | `text_color` | Color | Empty renders white. |
| `promo_banner_cta_style` | `select` | `primary` | `cta_style` | `primary`, `accent` | Used only when outline is false. |
| `promo_banner_cta_outline` | `checkbox` | `true` | `cta_outline` | `true`, `false` | Outline color follows banner text color in the current Implementation. |

## Required Figma States

| State | Why It Matters |
| --- | --- |
| Default | Heading, subheading, outline CTA, brand background. |
| No subheading | Heading and CTA only. |
| No CTA | CTA URL is empty. |
| Primary filled CTA | Outline false and CTA style primary. |
| Accent filled CTA | Outline false and CTA style accent. |
| Long copy | Heading at 100 chars and subheading at 200 chars. |
| Low contrast | Shows color combinations that need design guardrails. |

## QA Checklist

- Verify vertical spacing at desktop, tablet, and mobile widths.
- Confirm CTA only renders when `promo_banner_cta_url` is present.
- Confirm outline CTA uses banner text color.
- Confirm primary and accent filled CTA states.
- Confirm long heading and subheading do not overflow.
- Confirm background and text colors meet contrast expectations.

## Future Theme Section Migration

When true theme sections exist, `show_promo_banner` should become section presence. The remaining settings should become instance-local settings such as `section.settings.heading`, `section.settings.subheading`, `section.settings.cta_url`, `section.settings.background_color`, and `section.settings.text_color`.

## Implementation Gaps Exposed

- Promo Banner uses the shared CTA helper with `outline_color` so its outline CTA can follow the banner text color.
- `promo_banner_heading` has a schema default but the shipped settings data is empty, so the live default behavior is "do not render." Decide whether that is the intended default before public release.
