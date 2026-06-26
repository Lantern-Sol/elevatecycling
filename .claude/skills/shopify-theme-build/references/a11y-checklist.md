# Accessibility checklist

Run through this for every section/component. Mark each ✅ / ⚠️ needs manual /
❌ fails.

## Structure & semantics
- [ ] Semantic landmarks/elements used (`section`, `nav`, `button`, `a`, headings)
- [ ] Heading order is logical, no skipped levels; section title is an `<h2>`
- [ ] Lists use `<ul>/<ol>`; `role="list"` added if `list-style:none` removes semantics
- [ ] No `<div>`/`<span>` doing a button's or link's job

## Keyboard & focus
- [ ] Every interactive element reachable by Tab in a sensible order
- [ ] Visible `:focus-visible` style on all interactives (no bare `outline:none`)
- [ ] Custom widgets (accordion/tabs/carousel/menu) manage focus + correct ARIA
      (`aria-expanded`, `aria-controls`, `aria-current`, roles)
- [ ] No keyboard traps

## Images & media
- [ ] Meaningful images have descriptive `alt` (from settings)
- [ ] Decorative images have `alt=""`
- [ ] Icon-only buttons have `aria-label`
- [ ] Video/animation respects `prefers-reduced-motion`

## Color & contrast
- [ ] Body text contrast ≥ 4.5:1  (⚠️ verify live with client colors)
- [ ] Large text / UI components ≥ 3:1
- [ ] Information not conveyed by color alone

## Forms (if any)
- [ ] Every input has an associated `<label>` (or `aria-label`)
- [ ] Errors are announced and associated with their field
- [ ] Required fields marked programmatically, not just visually

## Motion & responsiveness
- [ ] `prefers-reduced-motion` honored for non-essential animation
- [ ] Layout works zoomed to 200% and at 320px width without horizontal scroll
- [ ] Touch targets ≥ ~2.75rem (44px)
