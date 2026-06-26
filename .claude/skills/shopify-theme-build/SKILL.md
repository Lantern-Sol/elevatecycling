---
name: shopify-theme-build
description: >-
  Use when building or editing Shopify theme code from scratch or extending an
  existing theme — sections, blocks, snippets, settings_schema, CSS/Liquid.
  Enforces the team's house style: mobile-first responsive CSS, rem units (no
  px for layout/typography), NO !important, BEM-ish class naming, accessible
  markup (semantic HTML, ARIA, focus states, keyboard nav), and reusable
  section/block/settings patterns so nothing gets rebuilt twice. Also use when
  the user asks for "best practices", a "full build", "accessibility pass", or a
  QA/review of theme code. Trigger on mentions of Liquid, section schema,
  blocks, settings, .liquid files, or theme/ directory work.
---

# Shopify Theme Build — House Style

This skill encodes the non-negotiable conventions for any Shopify theme work in
this repo. Apply ALL of these by default. Only deviate if the user explicitly
asks. When in doubt, prefer the more accessible / more reusable option.

## 0. Before writing anything

1. Read existing files first. Match the repo's existing tokens, naming, and
   structure before introducing new ones. Reuse > rebuild.
2. Check for existing CSS custom properties / design tokens (often in
   `snippets/css-variables.liquid`, `theme.liquid`, or `:root`). Use them.
   Do NOT hardcode colors, spacing, or fonts that already exist as tokens.
3. Check for existing snippets before creating a new one (icons, buttons,
   responsive image, etc.). Extend, don't duplicate.
4. If a settings pattern already exists for a similar block, copy its shape.

## 1. CSS rules (hard rules)

- **rem, not px.** Use `rem` for font-size, spacing, layout, radius. `px` is
  only allowed for: 1px borders/hairlines, and `0`. Base: assume `16px = 1rem`.
- **NO `!important`.** Ever. If specificity is fighting you, fix the selector,
  don't override. Section-scope styles under the section's unique class.
- **Mobile-first.** Write base styles for mobile, then layer up with
  `min-width` media queries. Never `max-width`-first.
- **Custom properties for theming.** Section/block settings → inline CSS custom
  properties on the section wrapper, consumed by the stylesheet. Don't write
  per-id inline style blocks for things a variable can handle.
- **No global element selectors inside sections.** Scope everything to the
  section class to avoid leaking styles across the theme.
- **Logical properties** where reasonable (`margin-inline`, `padding-block`) for
  RTL-safety.
- **clamp()** for fluid type/spacing instead of multiple breakpoints when it
  reads cleanly.

See `references/css-conventions.md` for the full token scale, breakpoints, and
copy-paste starter patterns.

## 2. Liquid & section/schema rules

- One section = one responsibility. Repeatable UI → `{% schema %}` blocks with
  `max_blocks` set sensibly.
- Every section gets a unique scoping class using `{{ section.id }}`:
  `<section class="my-section" id="shopify-section-{{ section.id }}">` and scope
  CSS under a generated class tied to `section.id` for instance-level settings.
- Expose real settings (don't hardcode): heading, colors via `color_scheme`,
  padding (top/bottom), image, alignment. Provide sane `default`s and
  `info`/`label` text so PMs/clients can use it.
- Use `color_scheme` / `color_scheme_group` settings, not raw color pickers,
  when the theme supports schemes.
- Guard for empty states (`{% if section.settings.heading != blank %}`).
- Use `{{ 'file.css' | asset_url | stylesheet_tag }}` or section `{% stylesheet %}`
  consistently with the repo — don't mix approaches randomly.
- Lazy-load below-the-fold images (`loading="lazy"`), eager for LCP/hero.
- Use the `image_tag` filter / responsive `srcset` + `sizes`, never a bare
  `<img>` with a single fixed src for content images.

See `references/section-template.liquid` for a full, ready-to-fill section
scaffold (schema + blocks + scoped styles + a11y baked in).

## 3. Accessibility (required, not optional)

- Semantic HTML first: `<section>`, `<nav>`, `<button>`, `<h2>`… Don't make a
  `<div onclick>` when a `<button>`/`<a>` is correct.
- One logical heading order per page. Section headings are usually `<h2>`;
  never skip levels.
- All interactive elements are keyboard reachable and have a **visible focus
  state** (`:focus-visible`). Never `outline: none` without a replacement.
- Images: meaningful `alt` from settings; decorative images get `alt=""`.
- Color contrast ≥ 4.5:1 for text (3:1 for large text / UI). Flag when a
  client color choice fails.
- Respect `prefers-reduced-motion` — wrap non-essential animation.
- Form inputs have associated `<label>`s; icon-only buttons get `aria-label`.
- Carousels/accordions/menus: correct ARIA (`aria-expanded`,
  `aria-controls`, roles) and managed focus.

See `references/a11y-checklist.md`.

## 4. Reusability discipline

- Extract anything used 2+ times into a snippet with parameters.
- Design tokens live in ONE place. New token → add to the variables file, then
  reference it; never inline a new magic number.
- Block settings should be generic enough to reuse across sections (e.g. a
  generic "feature card" block).
- Name things by role, not by appearance (`.promo-card` not `.blue-box`).

## 5. Deliverable QA gate

Before saying a build/edit is done, run the checklist in
`references/qa-checklist.md` and report it back as a checked list. Do not skip
it. If something can't be verified from code alone (e.g. live contrast,
real-device test), say so explicitly and mark it as "needs manual check".

## House style for messages to the team

Keep Slack/ClickUp updates short and casual. Flag scope creep instead of
self-assigning. Defer billing/scope calls to the PM.
