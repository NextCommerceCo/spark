# Theme contract

A store theme derived from Spark never updates from this repo. When Spark gains a
required platform integration point, nothing tells the derived theme, and the
failure that follows is silent: the storefront renders, apps stay installed and
enabled in the dashboard, and only the events go missing.

`theme-contract.json` declares those integration points. `scripts/check-theme-contract.py`
asserts them against a theme.

## What is in the contract

| id | file | must contain | since |
|---|---|---|---|
| `pixels` | `layouts/base.html` | `{% pixels %}` | 1.3.0 |

Each requirement carries a `why`, which the gate prints on failure. Whoever trips
it is usually not the person who knows what the tag does.

## Checking a theme

A working copy, before you push it:

```bash
python3 scripts/check-theme-contract.py --root path/to/theme
```

A live theme, which is the check that matters:

```bash
NTK_APIKEY=<store key> python3 scripts/check-theme-contract.py \
    --store https://<store>.29next.store --theme-id <id>
```

Spark's own copy runs in CI and through `make verify-theme`. Point it at another
theme with `make contract THEME_ARGS="--root ../my-theme"`.

## Why the live check is the one that matters

A store carries several theme copies. Republishing an old one silently undoes a
patch applied to the active theme, which is exactly how one store lost storefront
tracking for six days after being fixed and verified. Checking a working copy
proves what you are about to push; checking the live theme proves what the
merchant is actually serving.

Run it against every theme on the store, not only the active one. A copy without
the block is a regression waiting for the next promote.

## Adding a requirement

Add an entry to `theme-contract.json` with `id`, `file`, `must_contain`, and a
`why` written for someone who has not read this repo. Optional fields:

- `block` — the name of the base-layout block the tag lives in. The gate then
  also fails a child template that overrides that block without the tag, which a
  plain text search would pass.
- `since` — the Spark version that introduced the requirement.
- `verify_on_storefront` — an expression to confirm the rendered result.

Keep the contract small. It is for integration points whose absence is invisible,
not for style or structure.

## Verifying on a storefront

Check the published storefront, never the Theme Editor preview:
`customer_event_iframes.py` returns empty lists when `request.is_setting_preview`,
so the preview shows the fault whether or not it is there.

```js
document.getElementsByName('customer_event_iframe').length > 0
```

Read `/pixels/customer-events/<id>/` to see which app each frame belongs to.
