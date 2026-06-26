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
