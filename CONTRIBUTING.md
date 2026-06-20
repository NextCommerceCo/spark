# Contributing To Spark

Spark is a public starter theme for Next Commerce storefronts. Contributions should keep the theme easy to inspect, install, customize, and safely extend.

## Before You Start

- Read [README.md](README.md) for the current setup and verification commands.
- Read [DESIGN.md](DESIGN.md) before changing storefront UI.
- Read [docs/extending-spark.md](docs/extending-spark.md) before adding settings, partials, app hooks, or Web Components.
- Keep `config.yml`, API keys, store domains, merchant data, and local tool state out of commits.

## Local Verification

Run the checks that match your change:

```bash
python3 -m unittest discover -s tests
python3 scripts/sass-compat.py --check assets/main.css
```

The standard local checks do not need extra Python packages. CI also validates GitHub workflow and issue-template YAML with PyYAML; install `pyyaml` first if you run that optional check locally.

If you change `css/input.css`, rebuild and check the generated CSS:

```bash
make css-check
```

If you do not already have the Tailwind standalone binary, install it first:

```bash
make install-tailwind
```

When a CSS source change is ready to commit, run:

```bash
make release
```

That rebuilds and stages `assets/main.css`. Commit the source CSS and generated CSS together.

## Pull Request Checklist

- Explain the user-facing or theme-developer impact.
- Name the relevant [PLAN.md](PLAN.md) workstream when it applies; otherwise explain the public DX or user impact in plain language.
- Include screenshots for storefront UI changes at desktop and mobile widths.
- Include the exact commands you ran and their results.
- Update docs when behavior, settings, events, public APIs, or release steps change.
- Keep pull requests focused. Separate docs polish, platform behavior, and storefront UI when they can land independently.

## Public Issues And Support

Use the GitHub issue templates for reproducible bugs and developer-experience feedback. Include reproduction steps, expected behavior, actual behavior, and the Spark version or commit. If issue creation is unavailable for your account or the topic is store-specific, use your normal Next Commerce support channel.

For security reports, do not open a public issue. Follow [SECURITY.md](SECURITY.md).

For store-specific support, use your normal Next Commerce support channel and never post API keys, customer data, merchant configuration, or exploit details publicly.

## Branching

NextCommerceCo repositories use branch and pull request flow. Do not push directly to `main`. Keep generated artifacts such as `assets/main.css` in the same pull request as the source change that produced them.
