# Spark TODOS

## Open

### Theme contract: mask HTML comments in the needle search
**Priority:** P1
**Effort:** S
**What:** `scripts/check-theme-contract.py` masks only DTL comments (`{# #}`, `{% comment %}`, `{% verbatim %}`) before searching for a requirement's `must_contain`. A live theme carrying `<!-- {% pixels %} -->` passes the `pixels` rule while the browser discards the rendered tracker iframes, so the storefront emits no events. Wrap the checker's mask with an HTML-comment mask (checker-side only; `check-templates.py`'s masking has other consumers) and add the negative test. `{% if False %}{% pixels %}{% endif %}` also passes and is not text-fixable; document it under "Verifying on a storefront".
**Why:** `pixels` is now the only fleet-scoped rule, so a commented-out tag is the one way a derived theme can pass the contract while serving no tracker.

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
