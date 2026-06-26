# CSS Conventions — copy/paste reference

> Rules recap: **rem** (not px), **mobile-first**, **no `!important`**, scope to
> the section class, theme via custom properties.

## Token scale (adapt to repo if one already exists)

Define once in `:root` (or the repo's variables file). Reference everywhere.

```css
:root {
  /* Spacing — rem, 16px base. 4px step. */
  --space-3xs: 0.25rem;  /*  4px */
  --space-2xs: 0.5rem;   /*  8px */
  --space-xs:  0.75rem;  /* 12px */
  --space-sm:  1rem;     /* 16px */
  --space-md:  1.5rem;   /* 24px */
  --space-lg:  2rem;     /* 32px */
  --space-xl:  3rem;     /* 48px */
  --space-2xl: 4rem;     /* 64px */

  /* Fluid type — clamp(min, preferred, max) */
  --font-sm:   clamp(0.875rem, 0.85rem + 0.2vw, 1rem);
  --font-base: clamp(1rem, 0.95rem + 0.3vw, 1.125rem);
  --font-lg:   clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --font-xl:   clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem);
  --font-2xl:  clamp(2.25rem, 1.8rem + 2.2vw, 3.5rem);

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;

  --container-max: 75rem;   /* 1200px */
  --container-pad: var(--space-sm);

  --transition: 200ms ease;
}
```

## Breakpoints — mobile-first, `min-width` only

```css
/* Base = mobile. Layer UP. */
.feature__grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;          /* mobile */
}

@media (min-width: 48rem) {            /* 768px — tablet */
  .feature__grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 64rem) {            /* 1024px — desktop */
  .feature__grid { grid-template-columns: repeat(3, 1fr); }
}
```

Standard breakpoints (rem): `30rem` (480), `48rem` (768), `64rem` (1024),
`90rem` (1440).

## Section scoping pattern (no leaks, no !important)

In the section's `{% stylesheet %}` or asset, scope everything:

```css
.my-section {
  padding-block: var(--section-pad-block, var(--space-xl));
  container-type: inline-size;
}
.my-section__inner {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}
.my-section__title {
  font-size: var(--font-xl);
  margin-block-end: var(--space-md);
}
```

Per-instance settings → inline custom properties on the wrapper, consumed above:

```liquid
<section
  class="my-section"
  style="--section-pad-block: {{ section.settings.padding | divided_by: 16.0 }}rem;">
```

## Buttons & focus (accessible by default)

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-2xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--font-base);
  text-decoration: none;
  transition: background-color var(--transition);
}
.btn:focus-visible {
  outline: 0.1875rem solid currentColor; /* 3px */
  outline-offset: 0.125rem;
}
@media (prefers-reduced-motion: reduce) {
  .btn { transition: none; }
}
```

## Anti-patterns — do NOT do these

```css
/* ❌ px for layout/type */     .x { padding: 24px; font-size: 18px; }
/* ✅ */                        .x { padding: var(--space-md); font-size: var(--font-base); }

/* ❌ !important */             .x { color: red !important; }
/* ✅ fix specificity */        .my-section .x { color: var(--accent); }

/* ❌ max-width first */        @media (max-width: 767px) { ... }
/* ✅ min-width first */        @media (min-width: 48rem) { ... }

/* ❌ killing focus */          :focus { outline: none; }
/* ✅ replace it */             :focus-visible { outline: .1875rem solid currentColor; }
```
