# Elevate Cycling — Project Spec

> Build de tema Shopify desde cero (no migración). Tema base: **Horizon**.
> Diseño por Santiago, PM David, dev lead José, dev Remo.
> Timeline tema: ~1 mes. Este doc captura las decisiones técnicas del
> kickoff (Web Design <> Web Dev hand-off, Jun 24 2026). Es el contrato técnico
> del proyecto — si algo acá choca con la realidad del repo, gana el repo, pero
> avisar.

## Qué es la tienda
Marketplace de bicicletas nuevas y de segunda mano (CPO = Certified Pre-Owned),
framesets, wheelsets, groupsets, componentes. Inventario 1-de-1 (cada artículo
es único). ~450 productos activos + drafts que pueden pasar a activos.

---

## Scope del tema (lo que hace Remo)

### Homepage
- Hero con video (lo manda el cliente; usar placeholder por ahora).
- Marquee de marcas (sencillo).
- 3 entradas principales (puntos de entrada del usuario).
- Productos sugeridos.
- **Parallax con scroll**: animación de una llanta que rota y va cambiando a un
  modelo más nuevo según el scroll. Santi manda video con fondo transparente o
  fotogramas separados — definir cuál es más fácil de implementar.
  - En mobile: sin parallax, solo la rueda girando (se puede usar el video de
    transición).
- Sección de suscripción / nuevos vs usados / proceso de certificación (botones
  en posición absoluta, ya vinculados por el cliente — reciclar y estilizar).
- FAQs.
- Títulos: van en **mayúsculas** (cambio de fuente pedido por el cliente).

### Find Your Brands page
- Auto-populada desde el **Shopify Brand field** del backend. Cada marca =
  card con logo, nombre y cantidad de productos en inventario.
- Debe permitir que el cliente agregue una marca nueva fácil y que se genere su
  card automáticamente (conectada a una colección).
- "Browse all brands" → lleva a esta página. Botones scrolleables A–Z
  (click en la H → scroll a la H, etc.).

### Blogs
- Muy template: estilos, buscador de artículos, artículo highlight, filtros,
  blog cards, populares. Mantener cards como solo-imagen para no complicar al
  equipo de SEO.
- Artículo: banner "seguir explorando", resumen, backlinks internos, descarga
  del manual de marca (logo del cliente), citas a artículos donde figuró
  (Forbes, revistas) — esas imágenes/medios se gestionan por separado por marca.

### FAQs page
- Filtros **sticky on top** por categoría (condición/calidad, compatibilidad,
  shipping…). Al elegir categoría se cargan sus preguntas.
- Mobile: filtros arriba (no al lado).

### Policies page
- Mismo patrón que FAQs pero en vez de filtrar, **scrollea** a la sección
  (Terms, Returns, etc.). Mobile igual.

### Cart drawer (sidecar tipo High Street)
- Horizon ya trae los tiers de threshold habilitados en settings → solo ajustar
  diseño.
- Cliente puede customizar la combinación de 3 tiers: free shipping / free gift
  / free discount (por ahora arranca solo con free shipping).
- **Upsell = productos vistos recientemente.** Si el usuario es nuevo y no vio
  nada → fallback a la app **Search & Discovery** (condicionar: nuevo = S&D,
  con historial = vistos recientes).
- Desktop: sugeridos al lado, productos del carrito al otro.

### Sell/Trade Form
- Form multi-paso para vender/tradear (no hay productos, es request-a-quote).
- Cliente agrega artículos uno por uno (se van listando como tabs/pestañas).
- El "Item Model" toma el nombre del campo de modelo para orientar al usuario.
- Tipo de artículo (la **segunda línea** del form es lo único que cambia):
  - **Complete Bike**: tamaño + group set (opcional) + precio.
  - **Frame Set**: tamaño + precio (sin group set).
  - **Group Set**: solo precio (group set = todo lo de frenos, cassettes,
    discos, piñones, pedales).
  - **Wheel Set / otros ítems**: solo precio.
- Carga por lote (bulk): el cliente descarga un template / Google Sheet, lo
  llena y lo sube. **Revisar la lógica del CSV bulk submission.**
- Paso 2: contacto genérico. Final: pantalla de agradecimiento + invitación al
  shop-all.
- Mobile: tabs en vez de imágenes; tipo de artículo como dropdown (las imágenes
  ocupaban mucho); bulk con formato a la derecha.
- Librería de estados del form está en el archivo de diseño (todo lo interactivo
  excepto el parallax, con todos sus estados).

### Marketing Landing Page
- Customizable por campañas. Campaña base: "revisa nuestro drop semanal"
  (inventario se actualiza semanalmente). Producto highlight → PDP; si no →
  artículos recientes. Es breve.

### UGC section
- Cliente todavía no tiene contenido → usar como **placeholder** y que el
  cliente la oculte hasta tenerlo. Sugerir vincular a redes o tenerlo como
  recurso interno en Shopify (la opción más fácil de manejar).

### Otras páginas
- Checkout: default, solo banner.
- 404: banner + productos sugeridos + footer.
- Form de contacto: el mismo que ya existe (reutilizar).

---

## Product cards & PDPs

### Product cards (collections)
- Batches de inventario: New / New Arrival.
- Stats de producto (mini-modal que hizo Santi): condición, integridad mecánica,
  etc. **Si falta el dato → ocultar ese stat / la barra** (no mostrar field
  vacío). Aplica a cards y a PDP.
- Niveles tipo Entry / Medium / Pro (3 niveles).

### PDP — dos plantillas casi iguales
- **Bikes / Framesets**: incluyen sección de **medidas / size chart**.
- **No-bike / no-frameset**: sin medidas.
- Muchas fotos por artículo (~20) — el miedo del comprador de segunda es la
  falta de claridad de condición → ficha técnica lo más explícita posible.
- Componentes comunes: nombre (genérico, mismo dato de eBay), batches según
  condición, stats (mismas del card), guía de referencia de tallas (modal),
  notas del mecánico, size table, marquee de homepage, banner, bundle, ficha
  técnica, productos relacionados, FAQs.
- Mobile: **sticky button** de compra; modales y specs como **acordeones**
  (specs cortas no necesitan acordeón). El acordeón grande deja espacio para el
  bundle.

#### Reglas de datos PDP (importante)
- **Certified Pre-Owned (CPO)**: estático y **genérico por plantilla** (un texto
  para todas las bikes, otro genérico para componentes/partes/framesets).
- **Mechanic's Notes**: **variable por producto** → metafield editable por
  artículo.
- **Retail Price (MSRP)**: metafield **custom**, lo llena el cliente. Es solo
  informativo (mostrar que se compra más barato que el precio de fabricante).
- **Clearance / descuentos**: además del retail (MSRP) se usa **Compare-at**
  (precio tienda) + precio nuevo con descuento, para que el descuento funcione
  en el checkout. Compare-at es ~automático con el descuento; el Retail/MSRP es
  el campo custom aparte.
- Tags por estado: New / New Arrival / Pre-Owned / Clearance.

---

## Collections & filtros

- **Quick filters** distintos por tipo de colección:
  - Bikes completas + framesets: tamaño, precio, categoría.
  - +6 quick filters → flechas a los lados para scroll. Mobile: scrolleables.
  - Filtros activos se muestran arriba como chips removibles.
- Los ítems de filtro **dependen de los productos que estén en esa colección**
  (si el producto tiene esa opción, sale; si no, no), no de la colección
  completa.
- Filtros por categoría de colección: Bikes / Frames / Wheelsets / Groupsets /
  Componentes / Clearance / CPO (toggle "solo descuento / todos").
- **Auditoría de categorización pendiente**: hay productos mal categorizados
  (ej. "triatlón" existe como tipo y como categoría por un listing mal hecho).
- **Necesitamos un CSV al cliente** para que defina el tag/metafield system de
  cada producto (dónde va cada uno: type / brand / categoría) y que los filtros
  funcionen bien.

### Menú (mega menu)
- Hover en Complete → tipos de bici, New Arrivals, completamente nuevos. Click →
  colección de bikes con filtro de budget/frame aplicado.
- By Brand → página de todas las marcas. Trade Form y página CPO accesibles
  desde el menú.
- Frame Sets / Wheel Sets / Group Sets / Componentes con sus propias subcats.
- Mobile: en vez de dropdown, lleva a una capa encima (evita acordeón con scroll
  interminable). CPO y Trade van en una partecita debajo.

---

## FUERA del scope de tema de Remo

### Account Dashboard (lo hace José en paralelo)
- Cliente quiere experiencia robusta: orders, rewards, sell/trade submissions
  con estado, favoritos, saved searches, notifications, account settings, logout.
- Referencia: The Pro's Closet (TPC) — tiene API/custom layer; los datos
  (saved searches, submissions) van a base de datos, no es solo front.
- Solución: **app/servicio custom en Vercel + DB pequeña** (Cloud hace el heavy
  lifting, costo mensual de Vercel sobre cierto límite). Va **por fuera**, no
  afecta el tema, avanza en paralelo.
- Las **submissions del sell/trade** sí debemos poder verlas en el backend —
  nosotros ya tenemos el form de submissions propio (no usar el third-party de
  selltrade.deprocloset.com).
- Saved search idea simple: guardar la **URL pre-filtrada** de la collection por
  usuario (la URL ya cambia según los filtros activos) en vez de meter apps.

---

## Validaciones técnicas confirmadas (web dev)
- Upsell del cart ligado a vistos recientemente → sí (con fallback S&D). ✅
- Mechanic's Notes editable por producto → sí (metafield). ✅
- Sell/trade submissions en el backend → vía nuestro form propio. ✅
- Toggle para ocultar/mostrar barras de stats según datos → sí (condicionar). ✅
- Brands auto-populadas desde Shopify Brand field → sí. ✅
- CSV bulk submission del Sell/Trade Form → **revisar lógica**. ⚠️
- Marketing landing reusable → sí, breve. ✅
- Bike Finder Quiz component (AI-generated) → en rojo, **no por ahora**. ❌
- Scroll parallax homepage → viable. ✅

---

## Pendientes / acciones
- [ ] Santi: actualizar prototipos (títulos mayúsculas, renombrar componentes,
      añadir descarga de manual de marca).
- [ ] Santi: enviar assets del parallax (video con fondo transparente o
      fotogramas) a José/Remo.
- [ ] Enviar CSV al cliente para categorización/tagging de los ~450 productos.
- [ ] Auditar categorías mal hechas (ej. triatlón duplicado).
- [ ] Implementar lógica de ocultar secciones/barras cuando falten datos.
- [ ] Definir formato del parallax (video vs fotogramas) según facilidad.
- [ ] José: investigar y proponer solución del Account Dashboard (Vercel/app).
