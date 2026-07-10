/**
 * Elevate Product Card — Stats toggle + Add to Cart
 * Shared JS for carousel and collection grid cards.
 * Uses document-level event delegation so it works regardless of context.
 */
(function () {
  if (window.__elevateProductCardInit) return;
  window.__elevateProductCardInit = true;

  /* ─── Stats panel toggle ─── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-arrivals-stats-toggle]');
    if (!btn) return;
    var card = btn.closest('[data-arrivals-card]');
    if (!card) return;
    card.classList.toggle('is-open');
  });

  /* ─── Add to Cart ─── */
  var plusSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M7.5 0V7.5H0V9H7.5V16.5H9V9H16.5V7.5H9V0H7.5Z" fill="#FDFCFC"/></svg>';
  var checkSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M6.5 11.17L2.83 7.5L1.5 8.83L6.5 13.83L15.5 4.83L14.17 3.5L6.5 11.17Z" fill="#FDFCFC"/></svg>';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-arrivals-atc]');
    if (!btn || btn.classList.contains('is-loading')) return;

    var variantId = btn.getAttribute('data-variant-id');
    if (!variantId) return;

    btn.classList.add('is-loading');

    /* Build a deferred promise the theme's cart-drawer / cart-icon can await */
    var resolve, reject;
    var promise = new Promise(function (res, rej) { resolve = res; reject = rej; });

    /* Dispatch shopify:cart:lines-update so cart drawer auto-opens + cart icon updates */
    var cartEvent = new Event('shopify:cart:lines-update', { bubbles: true, cancelable: false });
    cartEvent.action = 'add';
    cartEvent.context = 'product';
    cartEvent.lines = [{ merchandiseId: variantId, quantity: 1 }];
    cartEvent.promise = promise;
    document.dispatchEvent(cartEvent);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('ATC failed: ' + res.status);
        return res.json();
      })
      .then(function () {
        btn.innerHTML = checkSVG;
        btn.classList.remove('is-loading');
        setTimeout(function () { btn.innerHTML = plusSVG; }, 1500);

        /* Fetch updated cart and resolve the promise so cart drawer + icon pick up the new count */
        return fetch('/cart.js').then(function (r) { return r.json(); });
      })
      .then(function (cart) {
        if (!cart) return;
        resolve({
          cart: { totalQuantity: cart.item_count },
          detail: { itemCount: cart.item_count, items: cart.items, source: 'elevate-card-atc' }
        });
      })
      .catch(function (err) {
        console.error('[elevate-card-atc]', err);
        btn.classList.remove('is-loading');
        reject(err);
      });
  });
})();
