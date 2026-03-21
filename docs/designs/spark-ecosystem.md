---
status: ACTIVE
---
# Spark Theme Ecosystem Roadmap

Branch: main
Repo: NextCommerceCo/spark

## Vision

Spark becomes the **storefront operating system for NEXT Commerce** — not just a theme, but a component platform. Web Components powered by GraphQL, AI-native customization via Claude Code, zero-friction developer tooling via ntk. Merchants get a premium default. Developers get a reference architecture. AI gets rails to build on.

---

## Shipped

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Spark v1 Polish — DESIGN.md, delight package, CSS isolation | **SHIPPED** (2026-03-20) |
| 2 | Web Component Library — GraphQL cart client, `<spark-add-to-cart>`, `<spark-quantity>` | **SHIPPED** (2026-03-20) |

### What shipped in Phase 1-2
- **SparkCartClient** — Vanilla JS GraphQL cart client with auto-create, CSRF, retries
- **`<spark-add-to-cart>`** — Shadow DOM Web Component, progressive enhancement, idle→loading→success→error states
- **`<spark-quantity>`** — Shadow DOM quantity stepper with min/max/ARIA
- **DESIGN.md** — Comprehensive storefront design system (typography, color, spacing, motion, interaction states, accessibility, anti-slop rules)
- **Delight package** — Skeleton loading, image optimization, cart badge animation, keyboard nav, contrast auto-detection, print stylesheet
- **Zero jQuery/Bootstrap** — Complete removal of legacy dependencies

---

## Planned

| Phase | Description | Status |
|-------|-------------|--------|
| 3 | AI Theme Skill (Claude Code) | Planned |
| 4 | ntk Tailwind Integration | Planned |

### Phase 3: AI Theme Skill
A standalone Claude Code skill that can customize Spark storefronts from a brief. Leverages CLAUDE.md and DESIGN.md as rails for AI-assisted theme development.

### Phase 4: ntk Tailwind Integration
Auto-detect Tailwind in themes, auto-compile during `ntk watch`. Eliminates the Makefile workaround and race conditions in the current CSS pipeline.

---

## Roadmap: Ecosystem Waves

### Wave 1: Zero-Config Spark
Make Spark the best possible out-of-box storefront with rich Theme Settings. Install Spark, branding auto-populates from dashboard settings, products appear, it looks professional. No dev needed.

- Homepage sections: toggle on/off hero banner, featured products, featured categories
- Expanded settings for fonts, typography, and section configuration
- Auto-population from existing branding settings (logo, colors, favicon)

### Wave 2: Spark Sections Library
Composable, settings-driven sections architecture. Pre-built sections (hero variants, product grids, testimonials, FAQ) that are Theme Settings-configurable. Sections become building blocks for both self-serve merchants and developers.

- DTL partials in `partials/sections/`
- Each section registered in `settings_schema.json` with its own settings group
- Toggleable and configurable from the dashboard

### Wave 3: Figma-to-Storefront Pipeline
Extend the Figma export tooling to generate Spark-compatible DTL template sections from Figma designs. Designers create sections in Figma, AI generates theme-compatible template blocks that plug into the Wave 2 section architecture.

---

## Technical Architecture

### Design-to-Implementation Input Formats
Spark is designed to accept design input through multiple paths:
- **Figma files** with responsive breakpoints (desktop/tablet/mobile frames)
- **HTML mockups** of target pages
- **Screenshots** of desired design at each breakpoint + brand kit (colors, fonts, logo)
- **CLAUDE.md + DESIGN.md** provide rails for AI agents to work within

### Theme Settings as Product Surface
For non-technical users, the dashboard Theme Settings surface IS the storefront product. The settings architecture (`configs/settings_schema.json`) is a first-class design consideration, not an afterthought.

---

## Deferred
- Theme Marketplace Foundation — component API design for third-party extensibility
- Developer Docs Integration — interactive examples in developer-docs

## Out of Scope
- Checkout template — checkout is platform-managed, modification via apps only
