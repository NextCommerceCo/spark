# Spark TODOS

## Open

### Theme contract: mask HTML comments in the needle search
**Priority:** P1
**Effort:** S
**What:** `scripts/check-theme-contract.py` masks only DTL comments (`{# #}`, `{% comment %}`, `{% verbatim %}`) before searching for a requirement's `must_contain`. A live theme carrying `<!-- {% pixels %} -->` passes the `pixels` rule while the browser discards the rendered tracker iframes, so the storefront emits no events. Wrap the checker's mask with an HTML-comment mask (checker-side only; `check-templates.py`'s masking has other consumers) and add the negative test. `{% if False %}{% pixels %}{% endif %}` also passes and is not text-fixable; document it under "Verifying on a storefront".
**Why:** `pixels` is now the only fleet-scoped rule, so this is the whole fleet sweep's blind spot. Surfaced by the adversarial pass on the contract-scope PR, 2026-09-21.

### Theme contract: harden the live check's transport
**Priority:** P2
**Effort:** S
**What:** `read_remote_sources` uses the default `urllib` opener, so a 30x from the store forwards the `Authorization: Bearer` header to the redirect target, and `--store` accepts any URL scheme. Assert `https://` and install a non-following redirect handler. Also confirm the templates endpoint is unpaginated at the largest theme size (the checker reads `results` and never follows `next`), and quote remote template names in violation lines so a name containing a newline cannot fabricate a second `- [` line.
**Why:** Pre-existing, but the unattended fleet sweep runs this against every store twice a week with a real admin key.

### Fleet sweep: pass `--scope fleet` explicitly and record the applied count (next-mind)
**Priority:** P2
**Effort:** S
**What:** `next-mind/scripts/spark_fleet_check.py` invokes the checker with no `--scope`, discards stdout (where the "N of M requirement(s)" line goes), and turns any non-violation exit-1 (scope refusal, traceback on a malformed API entry) into a `failing_active` row. Pass `--scope fleet`, capture the applied count into the fleet JSON and ledger, and distinguish infrastructure errors from violations (a separate exit code from the checker would help).
**Why:** The sweep now depends on an implicit default that this repo changed under it; the ledger should say which rules ran.

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
