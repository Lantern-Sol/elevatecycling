# QA checklist — run before declaring done

Report this back as a checked list. Anything not verifiable from code →
mark "⚠️ needs manual check".

## CSS house style
- [ ] No `px` for layout/typography (only 1px borders / 0 allowed)
- [ ] No `!important` (exception: a `prefers-reduced-motion` motion-kill)
- [ ] Mobile-first: base styles for mobile, `min-width` media queries only
- [ ] Uses existing design tokens / custom properties — no new magic numbers
- [ ] Styles scoped to the section/component class — no global leaks

## Liquid / schema
- [ ] Section has a unique scope via `section.id`
- [ ] Settings exposed (heading, color_scheme, padding, alignment, image) with
      sane defaults + labels/info
- [ ] Empty states guarded (`!= blank`, `blocks.size > 0`)
- [ ] `max_blocks` + `presets` set
- [ ] Responsive images (`image_tag`/srcset + `sizes`), lazy below the fold,
      eager for hero/LCP
- [ ] Output escaped where needed (`| escape`), richtext left as-is

## Accessibility
- [ ] a11y-checklist.md passed (semantics, focus, alt, contrast, reduced-motion)

## Reusability
- [ ] Repeated markup extracted into parameterized snippets
- [ ] Names are role-based, not appearance-based
- [ ] Nothing rebuilt that already existed in the repo

## Performance / hygiene
- [ ] No unused CSS / dead Liquid
- [ ] No console errors expected; JS (if any) is deferred and guarded
- [ ] Theme check passes (`shopify theme check`) — run it if available
