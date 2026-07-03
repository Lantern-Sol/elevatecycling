import { formatMoney } from '@theme/money-formatting';

const RECENTLY_VIEWED_KEY = 'viewedProducts';
const MIN_RECENTLY_VIEWED = 1;
const MAX_CARDS = 4;

class CartDrawerRecs extends HTMLElement {
  connectedCallback() {
    // Two instances exist: desktop (.ls-cart-drawer__recs) and mobile
    // (.ls-cart-drawer__recs-mobile). Only load the one matching the viewport.
    const isDesktop = window.matchMedia('(min-width: 990px)').matches;
    const isMobileSlot = !!this.closest('.ls-cart-drawer__recs-mobile');
    if (isDesktop && isMobileSlot) return;
    if (!isDesktop && !isMobileSlot) return;

    this.cartProductIds = new Set(
      JSON.parse(this.dataset.cartProductIds || '[]').map(String)
    );
    this.firstProductId = this.dataset.firstProductId;
    this.moneyFormat = this.dataset.moneyFormat;
    this.currency = this.dataset.currency;
    this.cartAddUrl = this.dataset.cartAddUrl;
    this.recommendationsUrl = this.dataset.recommendationsUrl;

    this.titleEl = this.querySelector('.ls-recs__title');
    this.scrollEl = this.querySelector('.ls-recs__scroll');

    this.load();
  }

  async load() {
    try {
      const viewedIds = this.getFilteredRecentlyViewed();

      if (viewedIds.length >= MIN_RECENTLY_VIEWED) {
        const products = await this.fetchRecentlyViewed(viewedIds);
        if (products.length) return this.renderCards(products);
      }

      if (this.firstProductId) {
        const products = await this.fetchRecommendations(this.firstProductId);
        if (products.length) return this.renderCards(products);
      }

      // Fallback: fetch popular products from /collections/all
      const products = await this.fetchCollectionProducts();
      this.renderCards(products);
    } catch {
      // Fail silently — leave panel empty
    }
  }

  /** @returns {string[]} Recently viewed IDs not in cart */
  getFilteredRecentlyViewed() {
    try {
      const ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
      return ids.filter((id) => !this.cartProductIds.has(String(id)));
    } catch {
      return [];
    }
  }

  /**
   * Fetches product data for recently viewed IDs via the search suggest API.
   * @param {string[]} ids
   * @returns {Promise<Array>}
   */
  async fetchRecentlyViewed(ids) {
    const query = ids
      .slice(0, MAX_CARDS)
      .map((id) => `id:${id}`)
      .join(' OR ');
    const url = `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=${MAX_CARDS}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const products = data?.resources?.results?.products || [];

    return products
      .filter((p) => !this.cartProductIds.has(String(p.id)))
      .slice(0, MAX_CARDS)
      .map((p) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        image: p.image,
        vendor: p.vendor,
        price: Number(p.price || 0) * 100,
        available: p.available,
        variantId: p.variants?.[0]?.id,
      }));
  }

  /**
   * Fetches S&D recommendations for a product.
   * @param {string} productId
   * @returns {Promise<Array>}
   */
  async fetchRecommendations(productId) {
    const url = `${this.recommendationsUrl}.json?product_id=${productId}&limit=${MAX_CARDS}&intent=related`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const products = data?.products || [];

    return products
      .filter((p) => !this.cartProductIds.has(String(p.id)))
      .slice(0, MAX_CARDS)
      .map((p) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        image: p.featured_image,
        vendor: p.vendor,
        price: p.price,
        available: p.available,
        variantId: p.variants?.[0]?.id,
      }));
  }

  /**
   * Fallback: fetches products from /collections/all when no recently viewed or recommendations.
   * @returns {Promise<Array>}
   */
  async fetchCollectionProducts() {
    const url = `/collections/all/products.json?limit=10&sort_by=best-selling`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const products = data?.products || [];

    return products
      .filter((p) => !this.cartProductIds.has(String(p.id)))
      .slice(0, MAX_CARDS)
      .map((p) => ({
        id: p.id,
        title: p.title,
        url: `/products/${p.handle}`,
        image: p.images?.[0]?.src || '',
        vendor: p.vendor,
        price: p.variants?.[0]?.price ? Math.round(Number(p.variants[0].price) * 100) : 0,
        available: p.available,
        variantId: p.variants?.[0]?.id,
      }));
  }

  /** @param {Array} products */
  renderCards(products) {
    if (!products.length) return;

    const fragment = document.createDocumentFragment();

    for (const product of products) {
      const card = document.createElement('div');
      card.className = 'ls-rec-card';

      const price = formatMoney(product.price, this.moneyFormat, this.currency);
      const titleEsc = this.escapeHtml(product.title);
      const imgHtml = product.image
        ? `<img class="ls-rec-card__image" src="${product.image}" alt="${titleEsc}" loading="lazy" width="760" height="507">`
        : '';
      const vendorHtml = product.vendor
        ? `<div class="ls-rec-card__meta"><span class="ls-rec-card__vendor">${this.escapeHtml(product.vendor)}</span></div>`
        : '';

      card.innerHTML = `
        <a href="${product.url}" class="ls-rec-card__image-wrap" tabindex="-1" aria-hidden="true">
          ${imgHtml}
        </a>
        ${vendorHtml}
        <div class="ls-rec-card__name">
          <a href="${product.url}" class="ls-rec-card__title">${titleEsc}</a>
        </div>
        <div class="ls-rec-card__footer">
          <p class="ls-rec-card__price">${price}</p>
          <div class="ls-rec-card__ctas">
            <a href="${product.url}" class="ls-rec-card__btn-stats" aria-label="View stats for ${titleEsc}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M18.5916 10.6357C19.064 10.6357 19.4468 10.2529 19.4468 9.78054C19.4468 9.30823 19.064 8.92534 18.5916 8.92534H6.85524C6.38293 8.92534 6.00004 9.30823 6.00004 9.78054C6.00004 10.2529 6.38293 10.6357 6.85524 10.6357H18.5916ZM15.1942 15.0611C15.6627 15.0611 16.0426 14.6812 16.0426 14.2127C16.0426 13.7441 15.6627 13.3643 15.1942 13.3643H6.84845C6.37989 13.3643 6.00004 13.7441 6.00004 14.2127C6.00004 14.6812 6.37989 15.0611 6.84845 15.0611H15.1942ZM21.1516 19.5C21.6202 19.5 22 19.1202 22 18.6516C22 18.183 21.6202 17.8032 21.1516 17.8032H6.84845C6.37989 17.8032 6.00004 18.183 6.00004 18.6516C6.00004 19.1202 6.37989 19.5 6.84845 19.5H21.1516Z" fill="#141517"/>
                <path d="M2.00004 21C2.00004 21.5523 2.44776 22 3.00004 22C3.55232 22 4.00004 21.5523 4.00004 21V2.99999C4.00004 2.44771 3.55232 2 3.00004 2C2.44776 2 2.00004 2.44771 2.00004 3L2.00002 15.3334L2.00004 21ZM11.7899 4.5C12.2585 4.5 12.6383 4.87985 12.6383 5.34842C12.6383 5.81698 12.2585 6.19683 11.7899 6.19683H6.84845C6.37989 6.19683 6.00004 5.81698 6.00004 5.34842C6.00004 4.87985 6.37989 4.5 6.84845 4.5H11.7899Z" fill="#141517"/>
              </svg>
            </a>
            <form method="post" action="${this.cartAddUrl}">
              <input type="hidden" name="id" value="${product.variantId}">
              <input type="hidden" name="quantity" value="1">
              <button
                type="submit"
                class="ls-rec-card__add"
                aria-label="Add ${titleEsc} to cart"
                ${product.available ? '' : 'disabled'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                  <path d="M7.5 0V7.5H0V9H7.5V16.5H9V9H16.5V7.5H9V0H7.5Z" fill="#FDFCFC"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      `;

      fragment.appendChild(card);
    }

    this.scrollEl.replaceChildren(fragment);
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }
}

customElements.define('cart-drawer-recs', CartDrawerRecs);
