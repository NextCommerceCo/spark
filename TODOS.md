# Spark TODOS

## Open

### Preview mode placeholder suppression
**Priority:** P2
**Effort:** S (once platform variable identified)
**What:** Investigate whether the platform provides a context variable for preview/editor mode vs live rendering. If so, suppress dashed-border placeholder boxes (hero, featured products, featured categories) on the live storefront while keeping them visible in the theme editor.
**Why:** Placeholders guide merchants during setup but would look unprofessional to real customers if a section toggle is on but content is empty.
**Depends on:** Platform documentation or platform-team confirmation of what context variables are available in DTL templates (e.g., `request.is_preview`, `theme.editor_mode`, etc.)

### Theme Marketplace Foundation
**Priority:** P3
**Effort:** L
**What:** Component API design for third-party theme extensibility. Define how Spark sections can be packaged, shared, and installed across stores.
**Why:** Enables a theme ecosystem beyond Spark — derived themes, marketplace sections, agency templates.
**Depends on:** Wave 2 (Sections + Settings architecture) being complete and validated.

### Developer Docs Integration
**Priority:** P3
**Effort:** M
**What:** Interactive "Try it in Spark" examples in Next Commerce developer documentation.
**Why:** Reduces friction for third-party developers building on the Spark architecture.
**Depends on:** Spark sections architecture being stable.

### App Hook Surface — Document & Stabilize
**Priority:** P2
**Effort:** S
**What:** Promote the `{% app_hook %}` slot list (currently shipped for the Reviews app) to a documented public contract for App developers. Decide on naming conventions for new hooks, versioning policy, and whether to expose a "list all hooks" surface for the App Store.
**Why:** Apps targeting Spark hooks instead of forking the theme is the cleanest extension story. Locking the contract early avoids painful renames once more Apps integrate.
**Depends on:** First non-Reviews App to need a hook (forces the second data point).
