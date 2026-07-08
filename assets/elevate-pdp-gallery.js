/* ==========================================================================
   Elevate PDP Gallery — DOM enhancements
   1. Moves counter pill inside slideshow-container for correct overlay
   2. Injects social proof bar below the gallery
   ========================================================================== */

(function () {
  var gallery = document.querySelector('.product-information media-gallery');
  if (!gallery) return;

  /* ------------------------------------------------------------------
     1. Move counter inside slideshow-container
     The counter renders as a sibling of slideshow-component via Liquid.
     Moving it into slideshow-container (position:relative) lets
     position:absolute overlay it on the main image correctly.
     ------------------------------------------------------------------ */
  var counter = gallery.querySelector('.media-gallery__mobile-controls');
  var container = gallery.querySelector('slideshow-container');
  if (counter && container) {
    container.appendChild(counter);
  }

  /* ------------------------------------------------------------------
     2. Social proof bar
     ------------------------------------------------------------------ */
  var bar = document.createElement('div');
  bar.className = 'elevate-social-proof';
  bar.setAttribute('aria-live', 'polite');

  var count = Math.floor(Math.random() * 8) + 3; // 3–10

  bar.innerHTML =
    '<svg class="elevate-social-proof__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '<circle cx="12" cy="12" r="3"/>' +
    '</svg>' +
    '<p>' + count + ' people are watching this. <strong>1 of a kind build</strong></p>';

  gallery.after(bar);

  /* ------------------------------------------------------------------
     3. Mobile: move product-details group block below social proof bar
     On mobile the gallery + social proof are in the media column.
     Move the entire group-block (sidecar + stats + size card + CTA)
     after the social proof bar so the flow is:
       gallery → social proof → sidecar content → stats → CTA card
     ------------------------------------------------------------------ */
  var mq = window.matchMedia('(max-width: 749px)');
  var detailsBlock = document.querySelector('.product-details > .group-block');
  var detailsParent = detailsBlock ? detailsBlock.parentElement : null;

  function relocateMobile(e) {
    if (!detailsBlock) return;

    if (e.matches) {
      /* Mobile: move entire group-block after social proof */
      bar.after(detailsBlock);
    } else {
      /* Desktop: return group-block to product-details */
      if (detailsParent) {
        detailsParent.appendChild(detailsBlock);
      }
    }
  }

  relocateMobile(mq);
  mq.addEventListener('change', relocateMobile);

  /* ------------------------------------------------------------------
     4. Sticky ATC bar — inject price + arrow into button text
     ------------------------------------------------------------------ */
  var arrowSvg = '<svg class="elevate-atc-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.0391 5.08594l-1.0782 1.07812L18.0469 11.25H3v1.5h15.0469l-5.086 5.0859 1.0782 1.0782L20.4141 12.539 20.9297 12l-.5156-.5391L14.0391 5.08594z" fill="currentColor"/></svg>';

  function patchStickyBtn() {
    var stickyBar = document.querySelector('.sticky-add-to-cart__bar');
    if (!stickyBar) return;

    var btn = stickyBar.querySelector('.sticky-add-to-cart__button');
    if (!btn) return;

    var textEl = btn.querySelector('.add-to-cart-text__content > span');
    if (!textEl || textEl.dataset.elevatePatched) return;

    /* Read price from the sticky bar's own price display */
    var priceText = '';
    var priceEl = stickyBar.querySelector('.sticky-add-to-cart__price .price');
    if (priceEl) {
      priceText = priceEl.textContent.trim();
    }

    /* Fallback: sidecar price */
    if (!priceText) {
      var sidecarPrice = document.querySelector('.elevate-sidecar__price');
      if (sidecarPrice) priceText = sidecarPrice.textContent.trim();
    }

    textEl.dataset.elevatePatched = 'true';
    textEl.innerHTML = 'Add to Cart' + (priceText ? ' - ' + priceText : '') + ' ' + arrowSvg;
  }

  /* Run on load + observe for async rendering */
  patchStickyBtn();
  var stickyBar = document.querySelector('.sticky-add-to-cart__bar');
  if (stickyBar) {
    var stickyObs = new MutationObserver(function () { patchStickyBtn(); });
    stickyObs.observe(stickyBar, { childList: true, subtree: true });
  }

  /* Update on variant change */
  document.addEventListener('variant:changed', function () {
    var stickyBar2 = document.querySelector('.sticky-add-to-cart__bar');
    if (!stickyBar2) return;
    var btn = stickyBar2.querySelector('.sticky-add-to-cart__button');
    if (!btn) return;
    var textEl = btn.querySelector('.add-to-cart-text__content > span');
    if (textEl) {
      textEl.dataset.elevatePatched = '';
      patchStickyBtn();
    }
  });
})();
