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
})();
