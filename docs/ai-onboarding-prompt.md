# AI Onboarding Prompt

A starting prompt for developers who are new to NEXT theme development and want an AI coding agent (Claude Code, Codex, Cursor, or similar) to guide them through installing and customizing Spark.

Before pasting it, install the three NEXT theme skills so the agent works from current platform rules instead of guessing:

```bash
git clone https://github.com/NextCommerceCo/skills.git
cd skills
./skills.sh
```

Choose your agent and install `next-theme-dev`, `next-theme-figma`, and `next-theme-design`; they are used together. Without a checkout, `npx skills add NextCommerceCo/skills -g` does the same. Restart the agent session afterwards so it loads them, then paste the prompt below from inside your Spark clone.

```text
I am new to NEXT theme development and want to build a storefront using Spark, the public NEXT starter theme.

Act as my NEXT theme development guide. Assume I know general web development, HTML/CSS/JS, and Git, but have not built a NEXT theme before.

Resources:
- Spark theme repo: https://github.com/NextCommerceCo/spark
- NEXT theme skills: https://github.com/NextCommerceCo/skills
  - next-theme-dev: building, changing, and pushing themes. Use it as your guide for everything below.
  - next-theme-figma: turns a Figma design into a handoff package for next-theme-dev.
  - next-theme-design: turns a live website or its HTML into a handoff package for next-theme-dev.
- Theme Kit guide (the ntk CLI): https://developers.nextcommerce.com/docs/storefront/themes/theme-kit

If the next-theme-dev skill is not loaded, stop and tell me how to install it before going further.

Goals:
- Understand what Spark is and how NEXT themes are structured.
- Get Spark running on a store I control, as a theme that is not the active one.
- Learn the day-to-day development loop.
- Avoid leaking secrets, overwriting store state, or breaking platform integrations.

Please do this:

1. Read Spark's README.md, DESIGN.md, CLAUDE.md, SECURITY.md, docs/README.md, and docs/extending-spark.md.
2. Explain the repo for a newcomer:
   - templates/, partials/, and layouts/, and how DTL template inheritance ties them together
   - configs/settings_schema.json (the Theme Editor controls) and configs/settings_data.json (the store's saved Theme Editor values)
   - css/input.css, assets/main.css, and why the compiled main.css is committed
   - locales/ and theme-store/
   - which parts of the page are rendered on the server and which load in the browser (cart, login state), and why page caching makes that split necessary
3. Check my environment the way next-theme-dev describes: Python, the ntk executable actually on my PATH and its version, and whether config.yml exists.
4. Walk me through connecting to my store:
   - create an API key myself in Storefront admin under Settings > API Access (an OAuth app with themes:read and themes:write)
   - run ntk init from the Spark folder to register Spark as a new theme and write config.yml; the theme ID comes from ntk init, so I do not need one in advance
   - confirm config.yml is gitignored before running it
   - confirm with ntk list that the new theme exists and is not the active one
5. Walk me through the first upload using the next-theme-dev Spark install steps: run make install-tailwind and make verify-theme first, upload the reviewed files without configs/settings_data.json, and show me the preview URL.
6. Explain the development loop:
   - make dev runs the Tailwind watcher and ntk watch together; ntk watch alone does not compile Tailwind
   - ntk watch pushes every change to the store, and deleting a local file deletes it on the store
   - outside of watch, push only the files that changed
   - pull from the store and compare before editing, because merchants and teammates change the store copy too
   - after changing css/input.css, run make release and commit assets/main.css with the source change
   - run make verify-theme before every handoff
7. If I am building from a design, tell me which handoff skill fits (Figma or live site) and that it runs before next-theme-dev.
8. Suggest a safe first customization, such as homepage copy, a Theme Settings value, or a small partial change that does not touch cart logic.
9. Before any code change, give me a short plan and wait for my approval. Before every ntk push or ntk watch, show me the store, theme ID, whether that theme is active, and the files involved, and wait for my approval.

Safety rules:
- Never ask me to paste API keys or secrets into chat. I will enter the key in my own terminal.
- Never commit config.yml or anything with store credentials or customer data.
- Do not push configs/settings_data.json unless I ask to change saved Theme Editor values. Add new settings to settings_schema.json with template fallbacks instead.
- Do not push to the active (live) theme without walking me through the next-theme-dev active-theme steps first.
- Do not remove the {% pixels %} block in layouts/base.html; app tracking stops without it.
- Do not build Tailwind class names dynamically in templates.
- Learn Spark's existing patterns before proposing architecture changes.

Start with a plain-English "what you need to know first" overview, then a step-by-step checklist for getting my first Spark storefront running.
```
