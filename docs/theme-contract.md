# Theme contract

A store theme derived from Spark never updates from this repo. When Spark gains a
required platform integration point, nothing tells the derived theme, and the
failure that follows is silent: the storefront renders, apps stay installed and
enabled in the dashboard, and only the events go missing.

`theme-contract.json` declares those integration points. `scripts/check-theme-contract.py`
asserts them against a theme.

## What is in the contract

| id | scope | file | must contain | since |
|---|---|---|---|---|
| `pixels` | fleet | `layouts/base.html` | `{% pixels %}` | 1.3.0 |
| `cart-badge` | spark | `partials/header.html` | `id="cart-badge"` | 1.1.0 |
| `mobile-nav-toggle` | spark | `partials/header.html` | `data-toggle="mobile-nav"` | 1.0.0 |
| `mobile-nav` | spark | `partials/mobile_menu.html` | `id="mobile-nav"` | 1.0.0 |
| `cart-drawer` | spark | `partials/side_cart.html` | `</spark-cart-drawer>` | 1.1.1 |

Each requirement carries a `why`, which the gate prints on failure. Whoever trips
it is usually not the person who knows what the tag does.

## Two scopes

Every requirement names who it binds.

- **`fleet`** — every Spark-derived store theme. This is the contract in the sense
  above: a platform integration point whose absence is invisible on the storefront.
  The live check enforces only these by default, and so does the fleet sweep that
  runs against every store. Today that is `pixels` alone.
- **`spark`** — Spark's own working copy. The runtime hooks `theme.js` resolves by
  id or attribute belong here. Removing one from Spark passes every other gate and
  fails only in the browser, so CI asserts them — but a derived theme is a fork, not
  an install behind on a version. It may carry the same hook in a different file or
  render the surface another way, and a file-location rule against the fleet reports
  forks, not faults. Measured 2026-09-21: four live stores served `#mobile-nav` without
  a `partials/mobile_menu.html`.

A working copy is checked at the `spark` scope by default (it is Spark's CI gate,
and a fork's author can opt down with `--scope fleet`). A live theme is checked at the
`fleet` scope by default; `--scope spark` opts a live theme into the full set. The
gate's output names the scope and how many requirements ran, so a pass is never
mistaken for a pass against rules that were not applied.

## Checking a theme

A working copy, before you push it:

```bash
python3 scripts/check-theme-contract.py --root path/to/theme                # Spark's own copy: all rules
python3 scripts/check-theme-contract.py --root path/to/fork --scope fleet   # a fork: fleet rules only
```

A live theme, which is the check that matters:

```bash
NTK_APIKEY=<store key> python3 scripts/check-theme-contract.py \
    --store https://<store>.29next.store --theme-id <id>                # a derived theme: fleet rules
NTK_APIKEY=<store key> python3 scripts/check-theme-contract.py \
    --store https://<dev-store>.29next.store --theme-id <id> --scope spark   # Spark's own copy on a dev store
```

`--store` must be an `https://` URL; plain `http://` is accepted only for a
store on `localhost` or `127.0.0.1`. The checker reports a redirect as an error
rather than following it, so a store URL that has moved fails with the new
location in the message. It also refuses a paginated or non-list response from
the templates endpoint instead of checking part of a theme as if it were all of
it.

Spark's own copy runs in CI and through `make verify-theme`. Point it at a fork
with `make contract THEME_ARGS="--root ../my-theme --scope fleet"`.

## Why the live check is the one that matters

A store carries several theme copies. Republishing an old one silently undoes a
patch applied to the active theme, so a theme can satisfy the contract one week
and stop satisfying it the next without anyone editing it. Checking a working
copy proves what you are about to push; checking the live theme proves what the
store is actually serving.

Run it against every theme on the store, not only the active one. A copy without
the block is a regression waiting for the next promote.

## Adding a requirement

Add an entry to `theme-contract.json` with `id`, `scope`, `file`, `must_contain`,
and a `why` written for someone who has not read this repo. `scope` is `fleet` or
`spark` and is required: a rule that does not say who it binds is a load error, not
a default. Promote a rule to `fleet` only when the platform, not Spark's own JS,
depends on it — that is what makes its absence invisible on a fork. Optional fields:

- `block` — the name of the base-layout block the tag lives in. The gate then
  also fails a child template that overrides that block without the tag, which a
  plain text search would pass.
- `since` — the Spark version that introduced the requirement.
- `verify_on_storefront` — an expression to confirm the rendered result.

Keep the contract small. It is for integration points whose absence is invisible,
not for style or structure.

## Verifying on a storefront

Check the published storefront, never the Theme Editor preview. The preview does
not render the tracker frames, so it shows this fault whether or not the theme
actually has it.

```js
document.getElementsByName('customer_event_iframe').length > 0
```

Read `/pixels/customer-events/<id>/` to see which app each frame belongs to.
