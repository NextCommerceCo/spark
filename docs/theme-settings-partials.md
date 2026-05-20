# Spark Theme Settings Partials

This catalog lists the Spark partials, homepage section partials, and setting-backed template surfaces that are controlled by Theme Settings. Use it as the source map for creating templated design blocks and quick storefront compositions.

## Mechanical Scope

- Spark has 18 partial files that reference `settings.*` directly.
- Spark has 3 setting-backed layout/template surfaces outside `partials/`: `layouts/base.html`, `templates/index.html`, and `templates/catalogue/product.html`.
- Utility partials and inline icon partials are listed separately because they support the rendering system without owning Theme Settings.

## Homepage Section Partials

These are the primary design blocks for quick storefront builds. They are included from `templates/index.html` in this fixed order and are controlled by global Theme Settings.

| Partial | Setting Group | Purpose | Key Settings |
| --- | --- | --- | --- |
| `partials/section_hero.html` | Homepage > Hero | Full-width image hero with text overlay and CTA. | `show_hero`, `homepage_hero_image`, `homepage_hero_image_mobile`, `homepage_hero_heading`, `homepage_hero_subheading`, `homepage_hero_text_color`, `homepage_hero_text_align`, `homepage_hero_content_position`, `homepage_hero_content_width`, `homepage_hero_height`, `homepage_hero_overlay_color`, `homepage_hero_overlay_opacity`, `homepage_hero_link`, `homepage_hero_cta`, `homepage_hero_cta_style`, `homepage_hero_cta_outline` |
| `partials/section_featured_product.html` | Homepage > Featured Product | Single product spotlight with image, copy, price, and CTA. | `show_featured_product`, `featured_product`, `featured_product_header`, `featured_product_header_size`, `featured_product_header_align`, `featured_product_description`, `featured_product_cta_text`, `featured_product_cta_style`, `featured_product_cta_outline`, `featured_product_bg_color` |
| `partials/section_featured_products.html` | Homepage > Featured Products | Merchant-curated product grid with optional section CTA. | `show_featured_products`, `featured_products`, `featured_products_header`, `featured_products_header_size`, `featured_products_header_align`, `featured_products_columns`, `featured_products_bg_color`, `featured_products_card_bg`, `featured_products_cta_text`, `featured_products_cta_url`, `featured_products_cta_style`, `featured_products_cta_outline` |
| `partials/section_featured_categories.html` | Homepage > Featured Categories | Category image tile grid. | `show_featured_categories`, `featured_categories`, `featured_categories_header`, `featured_categories_header_size`, `featured_categories_header_align`, `featured_categories_columns`, `featured_categories_bg_color`, `featured_categories_overlay_color`, `featured_categories_overlay_opacity`, `featured_categories_text_color` |
| `partials/section_on_sale.html` | Homepage > On Sale | Merchant-curated sale product grid. | `show_on_sale`, `on_sale_products`, `on_sale_header`, `on_sale_header_size`, `on_sale_header_align`, `on_sale_columns`, `on_sale_bg_color`, `on_sale_card_bg` |
| `partials/section_promo_banner.html` | Homepage > Promo Banner | Full-width text and CTA promotion band. | `show_promo_banner`, `promo_banner_heading`, `promo_banner_subheading`, `promo_banner_cta_text`, `promo_banner_cta_url`, `promo_banner_bg_color`, `promo_banner_text_color`, `promo_banner_cta_style`, `promo_banner_cta_outline` |

## Global Partials

| Partial | Setting Group | Purpose | Key Settings |
| --- | --- | --- | --- |
| `partials/announcement_bar.html` | Navigation > Announcement Bar | Top announcement with optional link. | `ab_text`, `ab_bg_color`, `ab_text_color`, `ab_link`, `ab_link_text`, `ab_placement` |
| `partials/header.html` | Navigation | Primary nav, logo, search, account, cart. | `main_menu`, `logo_align`, `navbar_style`, `navbar_bg_color`, `navbar_link_color` |
| `partials/footer.html` | Footer | Footer branding, menus, contact, payment icons, language/currency controls, disclaimer. | `footer_menu`, `footer_bg_color`, `footer_text_color`, `footer_link_color`, `enable_social`, `pay_icons`, `site_disclaimer` |
| `partials/social_links.html` | Footer > Social Media | Social link icon row. | `facebook_link`, `instragram_link`, `twitter_link`, `youtube_link`, `tiktok_link`, `pinterest_link`, `snapchat_link`, `vimeo_link` |
| `partials/account_only.html` | Advanced > Site Settings | Account-only storefront shell. | `account_only`, `account_only_show_footer` |

## Commerce Partials

| Partial | Setting Group | Purpose | Key Settings |
| --- | --- | --- | --- |
| `partials/product_card.html` | Product Pages > Product Images / Product Cards | Shared product card for catalogue, category, search, homepage grids, sale grids, and recommendations. | `product_media_fit`, `product_card_border` |
| `partials/recommended_products.html` | Product Pages > Recommended Products | PDP recommended product section. | `show_recommended`, `recommended_products_header`, `recommended_products_header_size`, `recommended_products_header_align`, `recommended_products_columns`, `recommended_products_bg_color`, `recommended_products_card_bg` |
| `partials/side_cart.html` | Side Cart > General | Cart drawer shell and web component slots. | `cart_header_title`, `sidecart_open_on_add`, `gift_product`, `enable_upsells` |
| `partials/block_cart_progress_wrapper.html` | Side Cart > Rewards Progress | Default reward threshold selector and theme-developer extension point. | `usd_goal_1`, `usd_goal_2` |
| `partials/block_cart_progress_bar.html` | Side Cart > Rewards Progress | Milestone progress UI and messages. | `enable_progress_bar`, `step_1_message`, `step_2_message`, `final_step_message`, `gift_product` |
| `partials/block_cart_upsell.html` | Side Cart > Suggested Products | Suggested product module inside the cart drawer. | `enable_upsells`, `upsell_section_title`, `upsell_product_1`, `upsell_product_2`, `upsell_product_3` |
| `partials/block_cart_upsell_item.html` | Side Cart > Suggested Products | Single suggested product row. | `upsell_fallback_slots` |

## Template And Layout Surfaces

These files are not partials, but they are important setting-backed surfaces designers will see while composing storefronts.

| File | Setting Group | Purpose | Key Settings |
| --- | --- | --- | --- |
| `layouts/base.html` | Advanced / Theme Styles / Navigation | Global document shell, typography variables, custom CSS, account-only routing, and announcement placement. | `site_index`, `font_script`, `font_body`, `font_header`, `body_text_color`, `body_header_color`, `body_link_color`, `custom_css`, `account_only`, `ab_placement` |
| `templates/index.html` | Homepage | Homepage shell that includes the homepage section partials in the current fixed order. | `home_page_css`, `account_only`, `ab_text`, `ab_placement` |
| `templates/catalogue/product.html` | Product Pages | Product detail layout, gallery behavior, variant selector, reviews, and page-scoped CSS. | `product_page_css`, `product_description_placement`, `product_gallery_layout`, `product_reviews`, `variant_picker` |

## Utility Partials

These are reusable implementation helpers. They are not directly controlled by Theme Settings, but they inherit settings from the surrounding template.

| Partial | Purpose |
| --- | --- |
| `partials/store_logo.html` | Store logo/icon fallback renderer. |
| `partials/form_field.html` | Shared form field renderer. |
| `partials/cart_content.html` | Legacy/full cart content helper. |
| `partials/cart_summary.html` | Cart total summary helper. |
| `partials/catalogue_filters.html` | Catalogue filter form. |
| `partials/pagination.html` | Pagination controls. |
| `partials/alert_messages.html` | Flash/message renderer. |
| `partials/product_carousel.html` | Legacy PDP carousel placeholder; Spark PDP currently uses `spark-gallery` directly. |
| `partials/cta_button.html` | Shared CTA button helper for primary/accent and outline variants. |
| `partials/icons/*.html` | Inline SVG icons used by header, search, pagination, and drawers. |

## Intro Bootstrap Parity

Spark now covers the highest-value Intro Bootstrap controls for quick design work:

- Homepage design blocks are now named partials instead of inline `index.html` markup.
- Existing Spark homepage schema controls are wired into rendering: mobile hero image, hero alignment/height/overlay, section background colors, headings, and desktop columns.
- Hero, featured product, featured products, and promo banner CTAs support primary/accent and outline controls.
- Featured category tiles support overlay color/opacity and text color.
- Header supports desktop logo alignment plus light/dark navbar scheme.
- Homepage and product detail pages support scoped custom CSS.
- Product/category section headings support size and alignment controls.
- Product grids support section-level card background colors.
- Recommended products gained configurable heading, alignment, columns, background, and card background.
- Product cards gained an optional border control.
- Side-cart reward thresholds and suggested product settings are exposed in Theme Settings. Spark ships one default threshold pair; theme developers can extend the progress wrapper for store-specific currency rules.

Remaining candidates for core Spark:

- A future NEXT theme sections architecture so merchants can reorder section instances, duplicate section types, and compose pages outside the fixed `templates/index.html` include order.

See `docs/terminology.md` for NEXT-native vocabulary and `docs/sections-architecture-proposal.md` for the proposed platform contract.
