# Spark

A modern starter theme for NEXT Commerce. Tailwind CSS, vanilla JS, no dependencies.

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
   tailwindcss -i css/input.css -o assets/main.css
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
├── assets/          Compiled CSS + JS
├── css/             Tailwind input (source of truth for styles)
├── configs/         Theme settings
├── layouts/         Base template
├── locales/         Translation files (11 languages)
├── partials/        Reusable fragments + SVG icons
└── templates/       Page templates
```

## License

Proprietary — NEXT Commerce.
