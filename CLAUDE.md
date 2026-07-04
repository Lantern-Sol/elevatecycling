# CLAUDE.md — Elevate Cycling

Proyecto: build de tema Shopify desde cero sobre **Horizon**. No es migración.

## Convenciones de código
Aplicar el skill `shopify-theme-build` (rem, mobile-first, sin `!important`,
a11y, secciones/bloques reusables, gate de QA). Reusar antes que reconstruir;
respetar los tokens/variables que ya existan en el tema.

## Spec del proyecto
Las decisiones técnicas, reglas de datos (CPO estático vs Mechanic's Notes por
producto, Retail/MSRP metafield, Compare-at en clearance), estructura de
filtros por colección y qué está **fuera de scope** (Account Dashboard → lo hace
José en Vercel) están en:

→ `docs/elevate-cycling-spec.md`

Leer ese archivo antes de empezar cualquier sección. Si algo del spec choca con
el estado real del repo, gana el repo, pero avisar al PM (David) en vez de
auto-asignarse el cambio.

## Gotcha: Horizon `.section` background specificity

El tema Horizon tiene una regla global con alta especificidad:
```css
shopify-section:not(.header-section) :is(.section,.cart-summary) {
    background: transparent;
}
```
Cualquier sección custom que use la clase `.section` pierde si declara
`background` dentro de `{% stylesheet %}`, sin importar la especificidad del
selector (el CSS de `{% stylesheet %}` se carga antes que el CSS global del
tema en Horizon).

**Fix:** poner `background` como inline style en el `style=""` del elemento
raíz de la sección. Inline styles tienen especificidad `1,0,0,0` y siempre
ganan. Dejar el resto de estilos en `{% stylesheet %}` normalmente.
```liquid
<div class="section section--page-width mi-seccion-custom"
  style="background: #141517; ...">
```

## Gotcha: Horizon grid padding — 120px total inline

Horizon's `.section` class uses a 3-column CSS grid. `page-width-normal` sets
`--page-margin: 12px` (mobile) / `50px` (desktop ≥750px). Direct children land
in column 2 via `.section > * { grid-column: 2; }`, which already insets content
by `--page-margin`.

Para llegar a **120px** total de padding inline (según Figma), el `__inner` del
section necesita padding extra que sume con el margen de la grilla:

- **Mobile:** `padding-inline: 0.5rem` (8px) → total ≈ 20px (12 + 8)
- **Desktop:** `padding-inline: 4.375rem` (70px) → total = 120px (50 + 70)

```css
.__inner {
  padding-inline: 0.5rem;           /* mobile: 12px grid + 8px = 20px */
}
@media (min-width: 61.9375rem) {
  .__inner {
    padding-inline: 4.375rem;       /* desktop: 50px grid + 70px = 120px */
  }
}
```

Elementos full-bleed (bg images, gradient overlays) dentro de `.section` deben
usar `grid-column: 1 / -1` para escapar la columna central y cubrir el ancho
completo.

## Convención: scroll-reveal en secciones custom

Todas las secciones custom que estén **debajo del fold** deben llevar
`data-scroll-reveal` en su `<div>` raíz para activar la animación de fade-up
al hacer scroll. El JS (`assets/elevate-scroll-reveal.js`) ya está cargado
globalmente desde `layout/theme.liquid` — solo hay que agregar el atributo.

**No** agregar `data-scroll-reveal` a secciones hero (above the fold).

```liquid
<div
  class="section section--page-width page-width-normal mi-seccion"
  data-scroll-reveal
  style="background: ...;">
```
