# Storefront Theme Development — Questionnaire

Two versions: one for Sam (lead frontend dev, theme architect), one for Henrique (Sellmore staff dev, the one actually implementing themes from Figma files day to day).

---

# VERSION A: For Sam (Lead Frontend Dev / Theme Architect)

Built and maintains Intro Bootstrap. Pioneered storefront theme development at NEXT. Has broad architectural knowledge but isn't doing day-to-day theme builds anymore. We want his perspective on the system, the platform, and what it should become.

---

## Part 1: The Platform & Architecture

1. When you built Intro Bootstrap, what were the biggest architectural decisions you made? Which ones would you do differently now?

2. What are the platform limitations that theme developers hit most often? Things the theme system can't do, or can only do with ugly workarounds?

3. What template variables and context data do you wish the platform exposed to themes but doesn't? Are there pages where the available data is insufficient?

4. How does the Theme Settings system work under the hood? What setting types does the platform support, and are there types you've wanted that don't exist? (We've seen: text, color, checkbox, url, image_picker, html, richtext, select, multi-select, radio, range, menu, products, product_categories, css — anything missing?)

5. If you could change one thing about how the NEXT theme engine works at the platform level, what would it be?

## Part 2: Patterns & Reuse

6. Across the storefront builds Sellmore has done, are there common patterns or components that get rebuilt every time? (e.g., hero sections, product grids, testimonial blocks, FAQ accordions) What would a "greatest hits" component library look like?

7. When a new merchant storefront is built, what typically gets started from scratch vs copied from Intro Bootstrap or a previous merchant's theme?

8. Intro Bootstrap uses Bootstrap CSS. Spark uses Tailwind v4. From your perspective as the architect, what are the tradeoffs? Is there anything Bootstrap does better for theme development specifically?

9. What's your philosophy on what belongs in Theme Settings vs what should be hardcoded in the template? Is there a principle that should guide this for the ecosystem?

## Part 3: The Design-to-Dev Gap

10. When Henrique or another dev receives a Figma file and needs to turn it into a working theme, what do you think are the hardest parts of that translation? Where does the most time go?

11. If the Figma file followed strict conventions (named sections, responsive breakpoints, Auto Layout, component properties — like the Campaigns pipeline), how much would that change the storefront build process?

12. What's the minimum a design file needs to contain for a dev to implement it efficiently?

13. Are there design patterns that look great in Figma but are genuinely hard to implement in a NEXT theme? What are the recurring translation problems?

## Part 4: The Campaigns Parallel

You and Mario built the Figma-to-code pipeline for Campaigns — `figma-sections-export`, `next-campaign-page-kit`, the naming conventions, the responsive variant system. We're exploring whether a similar approach could work for Storefront.

14. What parts of the Campaigns Figma-to-code pipeline would translate well to Storefront, and what wouldn't? (Key differences: DTL instead of Liquid, Theme Settings instead of campaign variables, platform tags like `{% seo %}`, `{% image_thumbnail %}`, URL resolvers.)

15. In Campaigns, each section is self-contained — its own HTML partial, own CSS, own assets. If Storefront sections worked the same way (a DTL partial in `partials/sections/`, registered in `settings_schema.json`, toggleable from the dashboard), would that be a natural architectural fit, or would it fight against how themes actually work?

16. The Campaigns pipeline relies on structured Figma conventions. What's different about a storefront page layout vs a campaign landing page that might break the pattern? (More dynamic data? More platform integration? Different responsive needs?)

17. If you could pick ONE thing from the Campaigns workflow and adapt it for Storefront, what would have the highest impact?

18. Where do you think the biggest gap is between the Campaigns DX and the Storefront DX? What makes Campaigns easier (or harder) to build?

## Part 5: Aspirational

19. Spark is designed to be the foundation for an ecosystem of themes and sections. What would make Spark a better starting point for Sellmore builds vs Intro Bootstrap?

20. Imagine an AI tool (Claude Code + ntk) that could take a Figma design and generate DTL template code for a storefront section — responsive, with the right template tags, wired to Theme Settings. What would it need to get right for a dev to trust its output? What should always be hand-coded?

21. If we had a sections library with 15-20 pre-built, settings-configurable sections (hero variants, product grids, testimonials, FAQ, trust badges, newsletter signup, etc.), would that fundamentally change how Sellmore delivers storefronts? What would still require custom work?

22. What would make the NEXT storefront experience competitive with Shopify's theme ecosystem?

## Part 6: Quick Ratings

Rate each from 1 (terrible) to 10 (excellent):

- NEXT theme documentation: ___
- ntk developer workflow: ___
- Clarity of available template variables per page: ___
- Theme Settings system (types, flexibility, dashboard UI): ___
- Intro Bootstrap as a starting point for custom builds: ___
- Spark as a starting point for custom builds (if you've used it): ___
- Overall: NEXT storefront DX vs other platforms: ___

---

*Your architectural perspective is what shapes the ecosystem. The more specific and honest, the better.*

---
---

# VERSION B: For Henrique (Sellmore Staff Dev / Theme Implementer)

The developer who receives a Figma design file and delivers a fully working theme. Hands-on-keyboard — lives in the DTL templates, wrestles with responsive layouts, wires up settings, and knows exactly where the time goes.

---

## Part 1: Your Current Workflow

1. When you receive a storefront design to implement, what format does it arrive in? (Figma file, PDF mockups, screenshots, something else?) What information is typically included, and what's usually missing?

2. Walk me through the steps from "here's the approved design" to "storefront is live." What do you do first, second, third? Roughly how long does each step take?

3. Which theme do you start from? (Intro Bootstrap, Spark, blank, a previous merchant's theme?) Why that one?

4. What does your dev loop look like — edit, push to staging, refresh, check? How long is the feedback cycle between making a change and seeing it on the store?

## Part 2: Where Time Goes

5. Rank these from most time-consuming to least (1 = biggest time sink):
   - [ ] Translating the Figma layout into responsive HTML/CSS
   - [ ] Getting the DTL template tags and context variables right
   - [ ] Wiring up Theme Settings so merchants can customize things
   - [ ] Handling images and assets (exporting, optimizing, placing)
   - [ ] Making it work across breakpoints (mobile, tablet, desktop)
   - [ ] Integrating dynamic features (cart, product variants, forms)
   - [ ] Debugging — things that don't render correctly or break
   - [ ] Back-and-forth with the designer on things that don't translate well to web

6. What's the single most frustrating or time-wasting part of the process?

7. Are there things you find yourself doing repeatedly across different merchant builds that feel like they should be automated or templated?

8. When you're unsure what template variables or tags are available for a page (e.g., what data `product` has, what filters exist), how do you figure it out? (Docs, Intro Bootstrap source, trial and error, asking someone?)

## Part 3: Pain Points

9. Have you ever had a design that was technically impossible or extremely difficult to implement as a NEXT theme? What was the blocker?

10. Are there platform limitations that regularly cause problems? Things the design calls for that the theme system can't do?

11. What's the hardest page to get right — homepage, PDP, cart, something else? Why?

12. When a merchant asks for a change after the storefront is live (e.g., "move the testimonials above the product grid"), how hard is that typically? Minutes, hours, days?

13. If the Figma file was perfectly structured (every section named, every breakpoint provided, all assets exportable), how much faster would your work be? 10%? 50%? 2x?

## Part 4: The Design Handoff

14. What does a "good" Figma handoff look like vs a "bad" one? What's the difference that makes your life easier or harder?

15. Do designs ever arrive without responsive breakpoints, or with assets that can't be exported cleanly? How often, and what do you do?

16. What's the minimum a Figma file needs to contain for you to implement it efficiently? (e.g., "I need all three breakpoints, named layers, exported assets, a color palette")

## Part 5: Theme Settings & Merchant Self-Service

17. How do you decide what goes into Theme Settings vs what gets hardcoded? Is there a rule of thumb?

18. After you hand off a storefront, how often do merchants actually use Theme Settings? What do they change most?

19. What settings do merchants ask for most that don't currently exist?

20. Have you seen merchants break their storefront by changing settings? What went wrong?

## Part 6: Aspirational

21. If you had a library of pre-built, settings-configurable sections (hero variants, product grids, testimonials, FAQ, trust badges, etc.) that you could compose into a storefront, would that change your workflow? How?

22. Do you ever build sections or components that you think "this would be useful for the next merchant too"? What happens to those — do they get reused, or do you start from scratch each time?

23. Imagine an AI tool that could take a Figma design and generate the DTL template code for a section — responsive, with the right template tags, wired to Theme Settings. What would it need to get right for you to trust its output? What would you always want to hand-code yourself?

24. Spark is designed as a modern replacement for Intro Bootstrap. If you've used it, what's better? What's missing? If you haven't, what would make you switch?

25. If you could change one thing about how storefront projects work — process, tooling, platform, anything — what would it be?

## Part 7: The Campaigns Parallel

On the Campaigns side, the team has built a pipeline where designers structure Figma files with specific conventions and the tooling auto-generates responsive HTML sections. We're exploring whether a similar system could work for Storefront themes.

26. Are you familiar with how Campaigns are built from Figma? If so, how does that compare to your storefront build experience? What's easier or harder about each?

27. If Storefront had a similar "sections library" — pre-built, composable sections you could assemble and customize rather than building from scratch — how would that change a typical build?

28. What's the bottleneck in a storefront build: your dev skill, the quality of the design handoff, platform limitations, or something else entirely?

29. If a sections library meant that 50% of a storefront could be assembled from pre-built blocks (leaving you to focus on the custom/unique parts), would that make your work better or worse? Would it feel like a shortcut or a proper tool?

## Part 8: Quick Ratings

Rate each from 1 (terrible) to 10 (excellent):

- Quality of design handoffs you typically receive: ___
- NEXT theme documentation: ___
- ntk developer workflow (edit-push-check cycle): ___
- Clarity of available template variables per page: ___
- Theme Settings system (types, flexibility, dashboard UI): ___
- CSS workflow (Tailwind vs Bootstrap vs custom): ___
- Overall ease of building a storefront on NEXT vs other platforms you've used: ___

---

*Your hands-on experience is the most valuable input we can get. The more specific and honest, the better — including things that are frustrating or broken.*
