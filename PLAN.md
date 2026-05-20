# Spark Theme — Development Plan

**Status:** v1.1.1 shipped. Functional, installable, Web Components in place. Ready for an experienced storefront engineer to take it from "works" to "production-grade default theme for every NEXT merchant."

**Release posture:** private dogfooding. Spark needs more merchant-store mileage before it should be treated as a public release candidate.

**Goal:** Make Spark the default starter theme that NEXT ships with — replacing Intro Bootstrap — and the foundation that Apps and Theme Marketplace will build on.

**Owner moving forward:** Henrique (Sellmore).

---

## Where Spark is today

- Tailwind CSS v4 (standalone CLI, no Node), zero jQuery, zero Bootstrap
- 18 templates (15 merchant-facing + 3 error pages)
- 5 Web Components: `<spark-add-to-cart>`, `<spark-cart-drawer>`, `<spark-progress-bar>`, `<spark-quantity>`, `<spark-upsell-item>`
- Custom GraphQL-first side cart (`SparkCartClient` + `SparkSideCart` event API)
- Cart milestones (free shipping, free gift) with currency-aware thresholds
- App hook surface (`{% app_hook %}`) — Reviews app integrates without theme edits
- Compiled `assets/main.css` committed (themes are self-contained on install)
- DESIGN.md as single source of truth for visual decisions
- Dev store: `https://keer.29next.store` (theme ID 133)

**Scope reminder:** checkout is platform-managed in NEXT (same model as Shopify). Themes do not ship a checkout template — the storefront cart hands off and the platform takes over. Anything checkout-related is out of scope for this plan.

## Where Spark needs to go

Spark needs to graduate from "starter theme that works" to **the production default that any NEXT merchant can install and run a real storefront on without theme-edit work.** That means:

1. Real-merchant production hardening — proven on a live store, not just the dev store
2. Performance budget enforced (Core Web Vitals targets, not vibes)
3. Future NEXT theme sections architecture so merchants compose pages, not edit DTL
4. Accessibility audit at WCAG 2.1 AA, documented and enforced
5. Component test coverage so the Web Components don't regress
6. Theme-developer docs so derived themes and Marketplace become possible
7. The `{% app_hook %}` contract locked once a second app drives the second data point

---

## Workstreams

### W1 — Production hardening (P0)

The next milestone is Spark running a real production storefront. Pick a low-risk merchant store, deploy Spark, observe, fix.

- Real-merchant pilot: deploy on a Sellmore-managed store with low traffic, run for 2 weeks, log every issue
- Fix all P0/P1 issues found in pilot
- Cross-browser matrix: Chrome, Safari (mac + iOS), Firefox, Edge, Samsung Internet
- Device matrix: iPhone SE → iPhone 16 Pro Max, Android mid-tier, iPad, desktop
- Stress test multi-currency, multi-language, RTL (Arabic/Hebrew if any merchant needs it)
- Stress test edge cases: parent products, out-of-stock, backorder, sold-out variants, vouchers, partial-stock carts, free-gift conflicts
- The cart → platform-checkout handoff must be smooth on every device (the theme's job ends at the handoff, but the handoff itself is the theme's job)

### W2 — Performance pass (P1)

Spark should be the fastest theme on the platform. Set a budget, then defend it.

- Establish Core Web Vitals targets (LCP < 2.5s, INP < 200ms, CLS < 0.1) on a representative merchant store
- Critical CSS extraction for above-the-fold (currently ships full minified `main.css`)
- Image optimization pass: confirm `loading="lazy"`, `fetchpriority`, `srcset`/`sizes` everywhere products render
- JS audit: defer/async every non-critical script, audit Web Component hydration cost
- Side cart open should be < 100ms perceived
- Lighthouse + WebPageTest baseline → target → measured-after, all in the repo

### W3 — Future theme sections architecture (P1)

Today, homepage section partials are individual partials gated by setting toggles. Merchants can't reorder them, can't add multiple of the same type, or compose pages outside `index.html`. A future NEXT theme sections architecture unlocks the marketplace future while preserving Spark's `templates/`, `partials/`, and global Theme Settings conventions.

- Investigate platform support for NEXT-native theme section instances.
- If the platform supports it, design Spark's section schema and migrate homepage section partials.
- If platform doesn't yet, write a proposal for Alex / platform team and a spec for what Spark needs
- Either way: document the path so Henrique and the platform team are aligned

### W4 — Accessibility audit (P1)

Today: focus-visible everywhere, ARIA on side cart, contrast auto-detection. Not yet: a full WCAG 2.1 AA audit.

- Run axe-core / Lighthouse a11y on every template
- Manual screen-reader pass (VoiceOver + NVDA): nav, PDP, cart, search
- Keyboard-only walkthrough of every customer journey up to checkout handoff
- Color contrast pass on every merchant-configurable color combo (validate the lighter/darker computation under brand-color extremes)
- Document findings in DESIGN.md as anti-slop rules

### W5 — Component robustness (P2)

5 Web Components, no automated tests. Easy to regress on the next change.

- Set up a minimal test harness (Vitest or Web Test Runner) for the components
- Coverage targets: cart client (mocked GraphQL), quantity stepper edge cases, side-cart open/close/render, progress bar threshold logic
- Visual regression on the side cart and product card via Playwright screenshots
- CI runs tests on PR

### W6 — Theme developer docs (P2)

Spark is a private repo today. To turn it into the default-and-extensible theme, theme developers (agencies, in-house teams) need docs.

- "Extending Spark" guide: where to add settings, how to add a section, how to add an app hook
- Web Components reference: events, attributes, slots, public API per component
- DTL pattern catalog: things that work, things that don't, the Tailwind+DTL gotcha
- Living style guide page (rendered Spark, not Storybook) showing every component in every state
- Publish to `guides.nextcommerce.com` (private merchant/agency docs portal)

### W7 — App hook contract (P2)

Today: 8 hooks, only Reviews uses them. Lock the contract before more apps integrate.

- Promote the hook list to a documented public contract (versioning, naming convention, deprecation policy)
- Add a "list all hooks" surface for the App Store to query
- Wait for the second non-Reviews app to need a hook before locking — that forces the second data point
- Tracked in TODOS.md already

---

## Where storefront expertise pays off most

These aren't separate workstreams — they're the surfaces I'd most value Henrique's eyes on inside W1, since they're where commerce-grade storefront experience shows up vs general front-end engineering:

- **PDP** — variant picker UX, gallery interactions on touch, "out of stock for this variant" handling, cross-sell placement, review module density
- **Category / search** — facet filter UX, sort options, empty state, pagination vs infinite scroll, search-as-you-type if worth it
- **Mobile commerce polish** — sticky add-to-cart on PDP scroll, thumb-zone CTA placement, side-cart on small viewports, the cart → checkout handoff feel on iOS Safari specifically
- **Side cart** — the GraphQL-first replacement is the riskiest custom surface in Spark; needs hard miles on real merchants before we trust it

If any of these need their own workstream once Henrique sees the code, file the issue under this project and we'll promote it.

## What I'd like Henrique's eyes on first

In order of leverage:

1. **W1 production hardening** — a pilot merchant deployment is the fastest way to surface what's actually broken vs what looks fine on the dev store
2. **W2 performance pass** — set a budget I can hold the theme to going forward
3. **W4 accessibility audit** — I've done the obvious work; he'll catch what I missed

W3 / W5 / W6 / W7 follow once W1–W2 are landed.

## Working agreement

- Spark repo is `NextCommerceCo/spark` (private). Henrique has push access.
- Branch + PR for every change. PR description references the workstream (W1, W2, etc.) and the issue.
- DESIGN.md is the source of truth for visuals. If a change violates it, the change wins only if DESIGN.md updates in the same PR.
- `assets/main.css` must be recompiled and committed in the same PR as any `css/input.css` source change. Drift between source and compiled artifact is a bug.
- Push convention: only push changed files (`ntk push templates/index.html`), never the entire theme.
- Project planning lives in Linear (NEXT space → Spark Theme Development project), not in this repo.

## Open questions for Henrique

- Which Sellmore-managed merchant is the right pilot for W1? Low traffic, recent platform, agency relationship in good shape.
- Has the platform team scoped NEXT-native theme section instances for any other theme? (W3 dependency.)
- Read on the Web Components vs platform JS tradeoff at scale across N merchants — anything we'd regret?
- Anything in Spark that smells wrong from your storefront experience? File issues under this project.
