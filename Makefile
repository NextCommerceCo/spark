# Spark Theme — Development Commands

# Tailwind CSS standalone CLI (gitignored, run `make install-tailwind` to fetch)
TAILWIND = ./tailwindcss
COMPAT = python3 scripts/sass-compat.py
TAILWIND_VERSION = v4.2.2

.PHONY: dev build css css-drift css-check verify-theme test watch push release install-tailwind

# Run both Tailwind watcher and ntk watcher in parallel
dev:
	@echo "Starting Spark development..."
	@echo "  Tailwind: css/input.css -> assets/main.css"
	@echo "  ntk: watching for changes -> pushing to store"
	@$(TAILWIND) -i css/input.css -o assets/main.css --watch &
	@ntk watch

# Compile Tailwind once + post-process for Sass compatibility.
# assets/main.css is updated only after the strict compat pass succeeds.
css:
	@set -e; \
	TMP_CSS=$$(mktemp); \
	trap 'rm -f "$$TMP_CSS"' EXIT; \
	$(TAILWIND) -i css/input.css -o "$$TMP_CSS" --minify; \
	$(COMPAT) "$$TMP_CSS" assets/main.css

# Fail if the committed CSS differs from a fresh post-processed build.
css-drift:
	python3 scripts/check-css-drift.py

# Build CSS and fail if generated output still contains platform-unsafe CSS.
css-check: css
	$(COMPAT) --check assets/main.css

# Build for production (compile + minify + sass-compat)
build: css-check
	@echo "Build complete. Push with: ntk push assets/main.css"

# Build + push CSS to store
push: css-check
	ntk push assets/main.css

# Lightweight local regression tests for theme tooling.
test:
	python3 -m unittest discover -s tests

# Full pre-upload verification for generated theme artifacts.
verify-theme: css-check test
	@echo "Theme verification complete."

# Watch Tailwind only (useful when running ntk watch separately)
watch:
	$(TAILWIND) -i css/input.css -o assets/main.css --watch

# Production release: rebuild main.css and stage it for commit.
# Run this before committing CSS source changes so the committed
# main.css stays in sync with css/input.css.
release: css-check
	@git add assets/main.css
	@echo "main.css rebuilt and staged. Commit it with your CSS source changes."

# Download the Tailwind v4 standalone CLI binary for this platform.
# The binary is gitignored (76MB, platform-specific) and not preserved
# by the platform on theme push, so each dev fetches their own.
install-tailwind:
	@OS=$$(uname -s | tr '[:upper:]' '[:lower:]'); \
	ARCH=$$(uname -m); \
	case "$$OS-$$ARCH" in \
		darwin-arm64)  TARGET=macos-arm64 ;; \
		darwin-x86_64) TARGET=macos-x64 ;; \
		linux-x86_64)  TARGET=linux-x64 ;; \
		linux-aarch64) TARGET=linux-arm64 ;; \
		*) echo "Unsupported platform: $$OS-$$ARCH"; exit 1 ;; \
	esac; \
	URL="https://github.com/tailwindlabs/tailwindcss/releases/download/$(TAILWIND_VERSION)/tailwindcss-$$TARGET"; \
	echo "Downloading Tailwind $(TAILWIND_VERSION) for $$TARGET..."; \
	curl -L -o tailwindcss "$$URL"; \
	chmod +x tailwindcss; \
	./tailwindcss --help > /dev/null && echo "OK: ./tailwindcss installed."
