# Spark Section Roster

A consolidated catalog of every section partial Spark should ship to
fully cover a modern D2C storefront, organized in tiers by priority.
Companion to [`figma-section-library-plan.md`](./figma-section-library-plan.md)
(which describes the section authoring unit and workflow) and
[`section-specs/`](./section-specs/) (where per-section detail lives).

This doc exists to answer one question: **what does Mario's team need
to design in Figma, and what do Spark theme developers need to build
in DTL, to support any story-driven D2C brand without bespoke
per-brand partial work?**

## Source signals

Three inputs shaped this roster:

1. **UVBrite v4 redesign** (May 2026) — 7 desktop layouts: Home, About,
   UVBrite Go PDP, Beam+ PDP, DuoCore Filter PDP, DuoCore Technology
   page, Beam+ Care Membership page. Concrete pilot for what a premium
   founder-led D2C brand demands.
2. **Shopify reference themes** — Dawn (free reference), Sense / Origin
   / Crave (free D2C-friendly), Impulse / Motion / Prestige (paid).
   Section catalogs across these are the de facto standard for what
   merchants expect to find in a theme editor.
3. **Spark's existing partials** — 6 homepage sections shipped today
   (hero, featured_product, featured_products, featured_categories,
   on_sale, promo_banner). See `figma-section-library-plan.md` for the
   current "Current Homepage Section Units" table.

## Naming and conventions

- Partial files: `partials/section_<name>.html` (snake_case).
- Theme Settings group: human-readable label matching the section
  purpose ("Process Steps", "Comparison Table", "FAQ").
- Per-section setting keys prefixed with the partial slug
  (`faq_*`, `comparison_*`, `value_props_*`).
- Figma component name: `section_<name>` with a `breakpoint` variant
  property (`desktop` 1440, `tablet` 768, `mobile` 390).
- Each section gets a spec in `docs/section-specs/<name>.md` following
  the [Section Spec Template](./figma-section-library-plan.md#section-spec-template).

## Tier 0 — already shipped (6)

| Section | Partial | Status |
|---|---|---|
| Hero image | `section_hero` | Pilot spec |
| Featured product | `section_featured_product` | First-pass spec |
| Featured products | `section_featured_products` | First-pass spec |
| Featured categories | `section_featured_categories` | First-pass spec |
| On sale | `section_on_sale` | First-pass spec |
| Promo banner | `section_promo_banner` | First-pass spec |

## Tier 1 — must-have for D2C parity (12)

These cover the 70% of UVBrite (and most premium D2C brand) layout
needs that today require either bespoke partial work or static HTML
in Page content. Every one of them shows up across multiple sections
of UVBrite and is also standard in Dawn / Sense / Origin.

### 1. `section_value_props`
**Purpose:** N-column row of icon + headline + body. The benefit/value
trio every brand opens with.
**Seen in:** UVBrite Home (3-up benefit row under hero), UVBrite Go
PDP (3-up feature row), DuoCore Tech ("Complete Contamination Profile"
5-col grid).
**Shopify analog:** Dawn `multicolumn`.
**Settings sketch:**
- `value_props_heading` (text, optional eyebrow above row)
- `value_props_columns` (range, 2–5, default 3)
- `value_props_items` (repeating block — icon `image_picker`, title `text`, body `textarea`, link `url`) — until repeating blocks exist on Spark, fall back to `value_props_item_<n>_*` settings with N=5
- `value_props_bg_color` (color, optional)
- `value_props_align` (select: left, center)
**Variants:** with eyebrow, without; icons-only (no body); body-only (no icons).

### 2. `section_process_steps`
**Purpose:** Numbered sequence with photo + body per step. Tech /
process explainers.
**Seen in:** UVBrite Home ("DuoCore Three-Stage System"), DuoCore
Tech ("Three Stages, One System"), Beam+ Care ("How Beam+ Care Works"
4-step).
**Shopify analog:** Origin-theme process step block; Dawn doesn't ship
this stock.
**Settings sketch:**
- `process_heading`, `process_subheading`
- `process_layout` (select: horizontal, vertical, alternating)
- `process_step_<n>_image`, `process_step_<n>_title`, `process_step_<n>_body` for N up to 6
- `process_show_numbers` (checkbox, default true)
- `process_bg_color`
**Variants:** horizontal (desktop) / vertical (mobile auto), alternating image side.

### 3. `section_comparison_table`
**Purpose:** Side-by-side feature matrix with check/x indicators.
**Seen in:** UVBrite Home ("Not Marketing Language" cert table, "The
Standard Shift" 4-col compare), DuoCore Filter ("What the DuoCore
Filter Removes"), DuoCore Tech ("Why Every Previous Solution Lost
Half The Threat Protection"), Beam+ Care ("Beam+ Care vs Standard
Ownership", "Warranty for Life Not 12 Months").
**Shopify analog:** Most premium themes ship a comparison table
section; not in Dawn stock.
**Settings sketch:**
- `comparison_heading`, `comparison_subheading`
- `comparison_columns_count` (range, 2–4, default 2)
- `comparison_column_<n>_label`, `comparison_column_<n>_highlight` (checkbox — gives that column the accent ring)
- `comparison_row_<n>_label`, `comparison_row_<n>_col<m>_value` (text / check / x) for N up to 12 rows
- `comparison_bg_color`
**Variants:** 2-col, 3-col, 4-col; with/without highlighted column; light/dark surface.

### 4. `section_benefit_grid`
**Purpose:** Benefit cards in 2x2 or 3x2 grid (richer than `value_props`,
with image/illustration per card).
**Seen in:** UVBrite Go ("Pocketable. Packable. Pour and Go." grid),
Beam+ Care ("Six Benefits, One Price" hero grid).
**Shopify analog:** Dawn `multicolumn` with larger images; Sense
"feature grid".
**Settings sketch:**
- `benefit_heading`, `benefit_subheading`
- `benefit_columns` (range, 2–4, default 2)
- `benefit_card_<n>_image`, `benefit_card_<n>_title`, `benefit_card_<n>_body`, `benefit_card_<n>_link` for N up to 6
- `benefit_card_style` (select: outline, filled, no-border)

### 5. `section_press_logos`
**Purpose:** "As reviewed in" / "As seen in" press logo strip.
**Seen in:** UVBrite Go PDP ("As Reviewed").
**Shopify analog:** Common across premium themes; Dawn ships nothing
for this.
**Settings sketch:**
- `press_heading` (text, default "As Reviewed In")
- `press_logo_<n>_image`, `press_logo_<n>_alt`, `press_logo_<n>_link` (optional) up to N=8
- `press_grayscale` (checkbox, default true — keeps logos uniform)
- `press_bg_color`

### 6. `section_specs_table`
**Purpose:** Product specification data table — dimensions, materials,
ratings, technical specs.
**Seen in:** UVBrite Go ("Full Specifications").
**Shopify analog:** Dawn ships nothing stock; "tabbed product info" or
custom liquid is the workaround.
**Settings sketch:**
- `specs_heading`
- `specs_layout` (select: two-column, single-column)
- `specs_row_<n>_label`, `specs_row_<n>_value` up to N=20
- `specs_collapsible` (checkbox — wraps in details/summary so long tables collapse on mobile)
**Note:** PDP context — often consumed by `templates/catalogue/product.html`, not homepage.

### 7. `section_faq`
**Purpose:** Accordion FAQ list.
**Seen in:** Every UVBrite PDP and explainer page has one.
**Shopify analog:** Dawn `collapsible_content` since OS 2.0.
**Settings sketch:**
- `faq_heading`, `faq_subheading`
- `faq_item_<n>_question`, `faq_item_<n>_answer` (richtext) up to N=12
- `faq_default_open` (range — which item starts open, 0 = none)
- `faq_layout` (select: single-column, two-column)
- `faq_bg_color`
**Accessibility:** native `<details>/<summary>` preferred over JS-driven; keyboard-navigable by default.

### 8. `section_promo_banner_2col`
**Purpose:** 2-column promo banner with image one side, content card
the other side (vs the current single-column hero-style
`section_promo_banner`).
**Seen in:** UVBrite Home ("Beam+ Care Membership" dark-navy + product
shot + benefits list + dual CTAs).
**Shopify analog:** Dawn `image_with_text`-style but configured as a
promo callout.
**Settings sketch:**
- `promo2_image`, `promo2_image_position` (select: left, right)
- `promo2_eyebrow`, `promo2_heading`, `promo2_subheading`, `promo2_body` (richtext)
- `promo2_cta_primary_text`, `promo2_cta_primary_url`
- `promo2_cta_secondary_text`, `promo2_cta_secondary_url` (optional)
- `promo2_bg_color`, `promo2_text_color`
**Variants:** image-left/image-right; light/dark surface; with/without secondary CTA.

### 9. `section_text_block`
**Purpose:** Standalone rich text block. The "intro paragraph" or
"closing thought" between sections.
**Seen in:** UVBrite Home ("Pure Water For The Places You Don't
Control" intro, "Engineered at the Intersection..." closing),
About Us multiple text-only sections.
**Shopify analog:** Dawn `rich_text`.
**Settings sketch:**
- `text_eyebrow`, `text_heading`, `text_body` (richtext)
- `text_align` (select: left, center)
- `text_width` (select: narrow, medium, wide)
- `text_bg_color`, `text_color`

### 10. `section_image_text`
**Purpose:** 50/50 image + text split. Foundational layout for any
story / explainer page.
**Seen in:** UVBrite About ("It Started With a $5 Bottle...", "The
Category Had An Answer"), UVBrite Go ("UV-C: The Technology Behind
The Bottle"), DuoCore Filter ("When to Replace. How To Do It.").
**Shopify analog:** Dawn `image_with_text` — most-used section in
Shopify themes by a wide margin.
**Settings sketch:**
- `image_text_image`, `image_text_image_position` (select: left, right)
- `image_text_image_ratio` (select: square, portrait, landscape, native)
- `image_text_eyebrow`, `image_text_heading`, `image_text_body` (richtext)
- `image_text_cta_text`, `image_text_cta_url`, `image_text_cta_style` (primary/secondary/outline)
- `image_text_bg_color`, `image_text_text_color`
**Variants:** image-left/image-right; full-bleed image vs contained; light/dark.

### 11. `section_cta_band`
**Purpose:** Full-bleed CTA band with single headline + button. The
"Two Bottles. One Standard." closer.
**Seen in:** UVBrite About closer, DuoCore Tech closer, Home closer.
**Shopify analog:** Standalone CTA section in most premium themes.
**Settings sketch:**
- `cta_band_heading`, `cta_band_subheading` (optional)
- `cta_band_button_text`, `cta_band_button_url`, `cta_band_button_style`
- `cta_band_bg_image` (optional — adds dark overlay)
- `cta_band_bg_color`, `cta_band_text_color`
- `cta_band_align` (select: left, center)

### 12. `section_testimonials`
**Purpose:** Customer testimonial cards (single hero or grid).
**Seen in:** Beam+ Care Membership ("What Members Are Saying" 2-card row).
**Shopify analog:** Standard across premium themes; Dawn ships
nothing stock.
**Settings sketch:**
- `testimonials_heading`, `testimonials_subheading`
- `testimonials_layout` (select: grid, carousel, single)
- `testimonials_item_<n>_quote` (textarea), `_author`, `_author_role`, `_author_image`, `_rating` (range 0–5) up to N=6
- `testimonials_show_rating` (checkbox)
- `testimonials_bg_color`

## Tier 2 — completeness with Shopify-theme catalogs (8)

Not in UVBrite but standard across Dawn/Sense/Origin. Build to avoid
gaps when migrating merchants from Shopify or onboarding non-D2C
brands.

### 13. `section_newsletter`
Email signup section. Form posts to platform endpoint or app hook for
Klaviyo/Mailchimp. Settings: heading, sub, placeholder, button text,
success message, optional image side.

### 14. `section_video`
Embedded video block. YouTube / Vimeo / native MP4. Settings: video
URL, poster image, autoplay (checkbox, muted), aspect ratio, optional
heading/sub above.

### 15. `section_image_banner`
Full-bleed image with text overlay — distinct from `section_hero`
(which is locked to the homepage). Reusable across pages. Settings:
image, mobile image, headline overlay, CTA, content position
(9 positions), overlay opacity.

### 16. `section_slideshow`
Multi-slide carousel of `image_banner`-style slides. Settings: slides
(N up to 5), auto-rotate interval, show dots/arrows, transition style.
Common for above-the-fold homepages.

### 17. `section_collection_list`
Grid of collections (categories) — distinct from `featured_categories`
in that it's image-and-name-only, simpler card. Settings: heading,
columns, collection picker (N up to 6), card style.

### 18. `section_blog_posts`
Recent N posts from a blog. Settings: blog picker, post count (range),
columns, show excerpt, show author, show date.

### 19. `section_trust_strip`
Free shipping / returns / warranty icons row. Compact, usually below
nav or above footer. Settings: icon + label pairs (N up to 4), bg color.

### 20. `section_logo_cloud`
Generic logo grid for "trusted by" customer logos. Distinct from
`press_logos` (which has the "As Reviewed" framing). Settings: heading,
columns, logo image-picker N up to 12, grayscale toggle.

## Tier 3 — specialized / advanced (5)

These solve specific merchant problems but aren't universal. Build
on demand or as a second-wave roster.

### 21. `section_countdown`
Promotional countdown timer to a target date. Settings: end-date
(datetime), heading, expired-state message, optional CTA. JS-driven.

### 22. `section_instagram_feed`
UGC gallery — Instagram posts or curated image grid. Settings: post
images (N up to 12), grid columns, link to social.

### 23. `section_lookbook`
Image with shoppable hotspots. Designers love these; complex to
implement well. Settings: image, hotspot product pickers with x/y
coordinates per spot.

### 24. `section_recently_viewed`
JS-driven recently viewed products row. Storage in localStorage,
fetched via GraphQL. Settings: heading, max items, empty state.

### 25. `section_tabbed_content`
Tabbed content blocks. Settings: tabs (N up to 5), each with title +
richtext body. JS-driven (or progressive `details`-based fallback).

## Partial variants — extensions to existing partials

These are not net-new partials but additional capability for partials
that already exist. Should be designed in the same Figma file as
variants of the parent component.

### `product_card` additions
- `bullet_list` variant — for "Choose Your System" Beam+ vs Go style
  picker where each card has 3–5 feature bullets above the CTA.
- `with_subscription_toggle` — Auto-Ship vs One-Time pricing toggle
  (DuoCore Filter PDP). Depends on platform subscriptions support.
- `with_quick_view` — opens a quick-view modal instead of (or in
  addition to) deep linking.
- `with_compare_checkbox` — adds to compare-products tray.

### `header` additions
- `with_featured_cta` — primary action button slot to the right of nav
  (UVBrite has a cyan "SHOP NOW" CTA here).
- `with_mega_menu` — multi-column dropdown for catalogues with many
  categories. Significant platform work; depends on menu data shape.
- `dismissible_announcement_strip` — allow shoppers to close the
  announcement bar; remember dismissal via cookie.

### `footer` additions
- `with_inline_newsletter` — newsletter signup embedded in footer
  rather than as a standalone section.
- `with_locale_switcher` — language + currency dropdown block.

## Cross-cutting commerce primitives (PDP / cart enhancements)

These aren't homepage sections. They're features that show up on PDP
or in the cart. Listed here so design-system Figma can include them
in the Commerce Partials page.

| Primitive | Where used | Notes |
|---|---|---|
| `sticky_atc` | PDP (mobile especially) | Sticky add-to-cart bar fixed to bottom of viewport |
| `size_guide` | PDP modal | Size chart popup |
| `quick_view` | Product listings | Modal that loads a compact PDP without navigating |
| `stock_indicator` | PDP | "Only N left" urgency component |
| `cross_sell` | Post-add / cart-bottom | Suggested products after add-to-cart |
| `subscription_toggle` | PDP pricing | Auto-ship vs one-time; depends on subs support |

## Out of scope for this pass

- **Custom product templates** (`product.<slug>.html`) — these are
  per-product bespoke layouts (UVBrite would need at least
  `product.beam-plus.html`, `product.uvbrite-go.html`,
  `product.duocore-filter.html`). Spark partial roster doesn't change
  to support them; they compose existing partials with bespoke layout.
- **Static page templates** (`templates/pages/<slug>.html`) — About,
  Press, Sustainability, etc. Built as DTL templates that compose
  these section partials; not new partials themselves.
- **Cart drawer enhancements** — already covered by Spark's existing
  side-cart partials. UVBrite ships with standard Spark cart.
- **Account templates** — login, register, dashboard. Owned by platform
  more than theme.

## Recommended sequencing

If Mario's team has budget for 8 weeks of design work, here's the
order that closes the most merchant friction fastest:

| Sprint | Sections | Why |
|---|---|---|
| 1 | `image_text`, `value_props`, `text_block` | Foundational layout primitives. Image+text alone covers 30% of pages. |
| 2 | `comparison_table`, `faq`, `cta_band` | Trust-building primitives. Every premium D2C brand needs all three. |
| 3 | `process_steps`, `benefit_grid`, `promo_banner_2col` | Story / explainer primitives. UVBrite-grade coverage. |
| 4 | `press_logos`, `testimonials`, `specs_table` | Social proof + product detail. Closes the rest of UVBrite. |
| 5 | Tier 2 (newsletter, video, image_banner, slideshow, collection_list, blog_posts, trust_strip, logo_cloud) | Shopify-parity for non-D2C and converting merchants. |
| 6 | Partial variants — product_card bullet_list, header featured_cta, footer inline_newsletter | Lifts the existing partials to D2C-grade. |
| 7 | Tier 3 on demand | Lookbook, countdown, instagram_feed if merchants ask. |
| 8 | Commerce primitives — sticky_atc, quick_view, stock_indicator | PDP polish. |

12 Tier-1 + 8 Tier-2 = 20 sections. With variants on existing
partials, the total Figma component library lands at roughly 28
section components plus the 6 already-shipped — call it 34.

## UVBrite as the pilot brand variant

Once the Figma library has Tier 1, UVBrite becomes the first brand
variant that exercises every new partial:

| UVBrite page | Sections used |
|---|---|
| Home | hero, value_props, text_block, comparison_table, process_steps, featured_products (with bullet_list cards), text_block, comparison_table, promo_banner_2col, featured_products (4-col), footer |
| About | image_banner (or hero variant), image_text (×2), value_props, cta_band |
| Beam+ PDP | (custom product template) using image_text, benefit_grid, press_logos, specs_table, faq |
| UVBrite Go PDP | same as Beam+ |
| DuoCore Filter PDP | image_text, comparison_table (large), image_text, comparison_table (smaller), cta_band, faq |
| DuoCore Tech page | hero, comparison_table, process_steps, benefit_grid, cta_band, value_props, featured_products (2-col exclusive), faq |
| Care Membership page | hero, image_text, comparison_table (×3), process_steps, testimonials, faq |

Every UVBrite page composes from Tier 0 + Tier 1 sections only. No
bespoke partial work.

## Open decisions from `figma-section-library-plan.md`, resolved

The original plan listed "Whether the next new section should be a
feature carousel or a more fundamental media-with-text unit" as an
open decision. **Resolved:** `image_text` (media-with-text) is the
right next section. It's the foundational layout primitive, shows up
in every UVBrite page, and is the most-used section in Shopify themes
by a wide margin. Carousel (`slideshow`) is Tier 2.

Other open decisions remain — mobile reference width (390 vs 375),
export tool location, generated-DTL prototype-only policy, app-hook
extension points — and are not blocked by this roster.

## Companion docs

- [`figma-section-library-plan.md`](./figma-section-library-plan.md) — overall section authoring workflow
- [`section-specs/`](./section-specs/) — per-section detail (one file per section)
- [`theme-settings-partials.md`](./theme-settings-partials.md) — settings-to-partials mapping
- [`design-block-authoring.md`](./design-block-authoring.md) — how blocks compose
- [`sections-architecture-proposal.md`](./sections-architecture-proposal.md) — future runtime sections

## Reference — Shopify theme section catalogs

For Mario's team, these are good comparables to skim when designing
each section's variants and states:

- **Dawn** (Shopify's OS 2.0 reference): https://shopify.github.io/dawn/ — comprehensive Tier 1 / Tier 2 coverage, free, MIT
- **Sense** (free, wellness focus): https://themes.shopify.com/themes/sense — strong tabbed-content, testimonials, value-props
- **Origin** (free, single-product brand focus): process_steps, founder_story, sustainability_badges
- **Crave** (free, food/beverage): strong promo_banner_2col variants
- **Impulse** (paid): mega_menu, quick_view, sticky_atc, countdown — Tier 3 references
- **Motion** (paid): video, instagram_feed, lookbook — Tier 3 references
