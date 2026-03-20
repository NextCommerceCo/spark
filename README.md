# Spark

A modern starter theme for NEXT Commerce. Tailwind CSS v4, vanilla JS + Web Components, no bundler required.

## Requirements

- [next-theme-kit](https://pypi.org/project/next-theme-kit/) (`pip install next-theme-kit`)
- [Tailwind CSS standalone CLI](https://tailwindcss.com/blog/standalone-cli)

## Quick Start

1. Install ntk and configure your store:
   ```bash
   pip install next-theme-kit
   ntk init
   ```

2. Compile CSS:
   ```bash
   ./tailwindcss -i css/input.css -o assets/main.css --minify
   python3 scripts/sass-compat.py assets/main.css
   ```

3. Push to your store:
   ```bash
   ntk push assets/main.css layouts/base.html
   ```

4. Start development:
   ```bash
   make dev
   ```

## Development

`make dev` runs both the Tailwind CSS watcher and ntk watcher in parallel. Edit templates, partials, or CSS — changes push to your store automatically.

| Command | Description |
|---------|-------------|
| `make dev` | Watch mode (Tailwind + ntk) |
| `make css` | Compile Tailwind once |
| `make build` | Compile + minify for production |

## Structure

```
Spark/
├── assets/
│   ├── main.css                  Compiled Tailwind output
│   └── js/
│       ├── spark-cart.js         GraphQL cart client
│       ├── theme.js              Core vanilla JS
│       └── components/           Web Components (Shadow DOM)
│           ├── spark-add-to-cart.js
│           └── spark-quantity.js
├── css/             Tailwind input (source of truth for styles)
├── configs/         Theme settings schema + data
├── docs/            Design documents
├── layouts/         Base template
├── locales/         Translation files (11 languages)
├── partials/        Reusable fragments + SVG icons
├── scripts/         Build tools (sass-compat.py)
└── templates/       Page templates (15 pages)
```

## Design System

All visual decisions are documented in [DESIGN.md](DESIGN.md) — typography, colors, spacing, motion, interaction states, and accessibility. Read it before making any UI change.

## License

Proprietary — NEXT Commerce.
