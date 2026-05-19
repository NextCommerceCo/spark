# Spark vs Intro Bootstrap Theme Settings

This comparison captures the useful Theme Settings surface from `intro-bootstrap` and how Spark now covers it.

## Current Counts

| Theme | Settings Schema Entries | Partial Files |
| --- | ---: | ---: |
| Spark | 140 | 35 |
| Intro Bootstrap | 91 | 19 |

Spark has more partial files because it now includes homepage section partials, cart web-component slot partials, and inline icon partials. The important change is not the raw count; it is that homepage design blocks now have named, reusable partials.

## Homepage Blocks

| Block | Intro Bootstrap | Spark Status |
| --- | --- | --- |
| Hero | Image, mobile image, text, text size, alignment, content width, content position, height, overlay, CTA color/outline. | Covered: image, mobile image, text, alignment, content width, content position, height, overlay, CTA primary/accent and outline. |
| Featured Product | Product, description, background, text color, CTA color/outline. | Mostly covered: product, description, background, CTA primary/accent and outline. Text color remains inherited from theme colors. |
| Featured Products | Product list, columns, heading size/alignment, card background, section background, CTA color/outline. | Covered: product list, columns, heading size/alignment, card background, section background, optional CTA primary/accent and outline. |
| Featured Categories | Category list, columns, heading size/alignment, text color, overlay color/opacity, section background. | Covered: category list, columns, heading size/alignment, tile text color, overlay color/opacity, section background. |
| On Sale | Not present as a first-class Intro block. | Spark-only: curated sale product grid with heading size/alignment, columns, card background, section background. |
| Promo Banner | Not present as a first-class Intro block. | Spark-only: heading, subheading, CTA, CTA style, background, text color. |

## Product Pages

| Area | Intro Bootstrap | Spark Status |
| --- | --- | --- |
| Product media fit | Fit or cover. | Covered. |
| Product gallery layout | Intro supports media size; Spark supports thumbnail layout. | Partially different by design. Spark has bottom/left thumbnails and direct gallery behavior. |
| Product card borders | Setting-backed. | Covered. |
| Variant picker | Dropdown or button/radio style. | Covered. |
| Description placement | Column or stacked. | Covered. |
| Reviews | Toggle. | Covered, plus app hook surfaces. |
| Recommended products | Heading, heading size/alignment, columns, background, card background. | Covered. |
| Product-page custom CSS | Setting-backed. | Covered. |

## Global Surfaces

| Area | Intro Bootstrap | Spark Status |
| --- | --- | --- |
| Typography | Font embed, body font, heading font, body/header/link colors. | Covered. |
| Navigation | Main menu, logo alignment, navbar style, custom nav colors. | Covered. |
| Announcement bar | Text, placement, background, text color. | Covered, plus optional link URL/text. |
| Footer | Footer menu, colors, social links, payment icons, disclaimer. | Covered. |
| Account-only mode | Toggle. | Covered, plus optional footer display. |
| Site index/noindex | Toggle. | Covered. |

## Spark-Only Core Improvements

- Side cart web component settings.
- Cart progress thresholds and free gift messaging.
- Suggested cart upsell products.
- App hook surfaces for Reviews and future apps.
- Product card helper shared by catalogue, category, search, homepage, sale, and recommendation grids.
- Named homepage section partials.
- Design block authoring docs.
- Sections-as-data platform proposal.

## Remaining Product Decisions

- Whether to add per-section text color controls beyond category tile text. Spark currently favors global typography colors plus section backgrounds.
- Whether to add CTA controls to the On Sale block. It is useful, but not required for Intro parity.
- Whether header logo alignment should eventually move from CSS positioning to a more robust layout component once the navigation has more complex menus.
- Whether homepage placeholders should hide automatically outside editor/preview mode once the platform exposes that context.
- Whether to pursue the sections-as-data platform contract so these blocks can be reordered, duplicated, and reused beyond the homepage.
