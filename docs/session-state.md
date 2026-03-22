# Spark Theme — Session State (2026-03-22)

## Where We Are

### Spark v1.1 Shipped to GitHub
- **Repo:** `NextCommerceCo/spark` (private, main branch)
- **Latest commits:** `5a4e45d` (core v1.1) + version bump + gitignore updates
- 22 new Theme Settings in storytelling order: Homepage → Product Pages → Navigation → Footer → Style → Advanced
- 5 new partials: catalogue_filters, recommended_products, product_carousel, cart_content, cart_summary
- sass-compat.py upgraded: oklch→hex, color-mix→rgba, @layer unwrap, logical properties, media query range syntax
- AiryPour homepage rebuilt from Figma design (pushed to airypour store, reverted from repo — store-specific)

### AiryPour Dev Store
- **Store:** airypour.29next.store
- **API Key:** Gn56kNmYjyjJEaTCBadceAzO2dhdnl
- **Spark Theme ID:** 133 (fresh install, settings in correct order)
- **Old Theme ID:** 100 (can be deleted — settings order was wrong)
- **Intro Bootstrap Theme ID:** 1 (Active) — the fully designed AiryPour storefront
- **AiryPour Theme ID:** 67 — the "Accounts Only" version
- **Preview URL:** `https://airypour.29next.store/?preview_theme=133`

### Keer Dev Store (original Spark dev store)
- **Store:** keer.29next.store
- **Spark Theme ID:** 133
- Needs re-push with v1.1 changes (was last pushed pre-v1.1)

### Design Exercise Findings
The Figma → Spark implementation revealed:
- **What ports cleanly:** Template structure (all 15 templates), DTL tags, platform integrations, settings system, partials architecture
- **What needs work:** Design assets are the bottleneck (hero images, product photos, icons, fonts — all merchant-specific). CSS color/typography theming requires per-merchant customization. Section-level background colors need Theme Settings (partially implemented).
- **Key gap:** The server-side SCSS compiler rejects modern CSS (oklch, color-mix, @layer, media range syntax). sass-compat.py handles this but adds build complexity.
- **Settings ordering:** Platform orders settings groups by "first seen" on a theme instance, not JSON key order. Fresh install required to fix ordering.

### manifest.json Controls Theme Version
- `manifest.json` at repo root: `{"name": "Spark", "version": "1.1.0"}`
- Platform reads this and displays version in dashboard
- **BUT** ntk can't push manifest.json (not in accepted GLOB_PATTERN — only assets/, configs/, layouts/, partials/, templates/, locales/, sass/)
- Version gets set at `ntk init` time. Updating on a live theme may require admin API — confirm with Alex.

## What's In Progress

### Text sizing feels small
- Spark defaults to `text-sm` (14px) body text
- AiryPour Intro uses 18px body / 42px h1 — significantly larger
- Need to revisit Spark's base font scale for marketing-forward storefronts

### FAQ section layout
- Should be split-column (heading left, questions right)
- Partially implemented but needs polish

### Hero proportions
- Spark hero is `min-h-[70vh]` (tall/immersive)
- AiryPour Intro hero is ~620px fixed with left-aligned content
- Need to make hero height/layout more configurable via settings

### Language picker
- Fixed: now hidden when store has only one language
- In footer partial

### Account Only footer toggle
- Added setting to hide footer in Account Only mode (some merchants want just a clean login screen)

## Three Workstreams for Next Sessions

### 1. Spark Skill Development (separate session)
Build a Claude Code Skill that can:
- Stand up a fresh Spark theme on a store via ntk
- Take a Figma design (or screenshots/HTML) and implement it into Spark
- Map design decisions to Theme Settings
- Handle the sass-compat pipeline automatically
- Push and verify via preview URL

Key files:
- `Themes/spark/` — the theme repo
- `Themes/Airypour/` — reference Figma PNG + full Intro theme with assets
- `Themes/intro-bootstrap/` — reference "state of the art" theme
- `scripts/sass-compat.py` — CSS compatibility transformer
- `CLAUDE.md` in Spark repo — ntk commands, build process, dev workflow

### 2. Storefront Section on Marketing Website (nextcommerce.com)
Build a section on the main marketing website that tells the Storefront story:
- AI-native theme ecosystem
- Spark as the foundation
- Figma → working storefront pipeline
- Reduces friction vs Shopify themes
- Connects to the payments trust argument (no storefront → higher disputes)

### 3. Questionnaire to Sam & Henrique
- **File:** `sellmore-dev-questionnaire.md` (in Developer/ working folder)
- Two versions: Sam (architect, Intro Bootstrap creator) and Henrique (Sellmore staff dev, implements themes from Figma)
- Covers: current workflow, pain points, design handoff, campaigns parallel, aspirational tooling
- Ready to send

## Strategic Context

### The Business Case
- Merchants who skip Storefront → no brand presence → customers google, find nothing → dispute charges → higher chargeback rates → threatens NEXT Payments revenue (78.5% of total)
- Three merchant segments: (1) Shopify merchants running campaigns only, (2) DR/affiliate marketers using Accounts Only, (3) Full-stack Sellmore builds
- Segment 2 is the opportunity: make it trivially easy to go from "Accounts Only" to "branded storefront"

### The Vision
AI-native Storefront ecosystem where:
- Spark is the core theme (Tailwind v4, zero legacy deps, settings-driven)
- Spark-derived themes for different verticals
- Sections library (composable, settings-configurable blocks)
- Figma → Storefront pipeline (parallel to Campaigns: figma-sections-export → next-page-kit)
- Claude Code Skill handles the implementation
- Merchants (or their agents) can stand up a branded storefront in hours, not weeks

### Spark Branding
- Needs its own identity with Next Commerce logo for dashboard thumbnail
- Theme ecosystem vision: Spark-derived themes should be recognizable
- Thumbnail location in theme code/config TBD — needs investigation

### ntk Accepted File Patterns (for reference)
```
assets/**/*.{html,json,css,scss,js,woff2,gif,ico,png,jpg,jpeg,svg,eot,tff,ttf,woff,webp,mp4,webm,mp3,pdf}
checkout/**/*.html
configs/**/*.json
layouts/**/*.html
partials/**/*.html
templates/**/*.html
locales/**/*.json
sass/**/*.scss
```
Note: `manifest.json` (root level) is NOT in this list.
