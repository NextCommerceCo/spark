# Spark Theme — Development Commands

# Tailwind CSS standalone CLI
TAILWIND = tailwindcss
COMPAT = python3 scripts/sass-compat.py

.PHONY: dev build css watch push

# Run both Tailwind watcher and ntk watcher in parallel
dev:
	@echo "Starting Spark development..."
	@echo "  Tailwind: css/input.css → assets/main.css"
	@echo "  ntk: watching for changes → pushing to store"
	@$(TAILWIND) -i css/input.css -o assets/main.css --watch &
	@ntk watch

# Compile Tailwind once + post-process for Sass compatibility
css:
	$(TAILWIND) -i css/input.css -o assets/main.css --minify
	$(COMPAT) assets/main.css

# Build for production (compile + minify + sass-compat)
build: css
	@echo "Build complete. Push with: ntk push assets/main.css"

# Build + push CSS to store
push: css
	ntk push assets/main.css

# Watch Tailwind only (useful when running ntk watch separately)
watch:
	$(TAILWIND) -i css/input.css -o assets/main.css --watch
