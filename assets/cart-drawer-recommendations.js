import { formatMoney } from '@theme/money-formatting';
import { CartLinesUpdateEvent } from '@shopify/events';
import { fetchConfig } from '@theme/utilities';

const RECENTLY_VIEWED_KEY = 'viewedProducts';
const MIN_RECENTLY_VIEWED = 3;
const MAX_CARDS = 4;
const STATS_SECTION_ID = 'product-stats-api';

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
      // When cart is empty, S&D can't work (no product to base recs on),
      // so accept any recently viewed products instead of requiring 3+.
      const minViewed = this.firstProductId ? MIN_RECENTLY_VIEWED : 1;

      if (viewedIds.length >= minViewed) {
        const products = await this.fetchRecentlyViewed(viewedIds);
        if (products.length && this.renderCards(products)) return;
      }

      if (this.firstProductId) {
        const products = await this.fetchRecommendations(this.firstProductId);
        if (products.length && this.renderCards(products)) return;
      }

      // Fallback: fetch popular products from /collections/all
      const products = await this.fetchCollectionProducts();
      this.renderCards(products);
    } catch (err) {
      console.error('[CartDrawerRecs]', err);
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

    const mapped = products
      .filter((p) => !this.cartProductIds.has(String(p.id)))
      .slice(0, MAX_CARDS)
      .map((p) => {
        // Search suggest API appends tracking query params to URLs
        // (e.g. ?_pos=1&_psq=...) — strip them so .json backfill works.
        const cleanUrl = (p.url || '').split('?')[0];
        return {
          id: p.id,
          title: p.title,
          url: cleanUrl,
          image: p.image,
          vendor: p.vendor,
          price: Number(p.price || 0) * 100,
          available: p.available,
          variantId: p.variants?.[0]?.id,
          handle: cleanUrl.replace('/products/', ''),
          tags: [],
        };
      });

    // Search suggest API may omit variants and tags — backfill via product JSON
    const needsBackfill = mapped.filter((p) => !p.variantId || !p.tags.length);
    if (needsBackfill.length) {
      await Promise.all(
        needsBackfill.map(async (p) => {
          try {
            const res = await fetch(`${p.url}.json`);
            if (!res.ok) return;
            const data = await res.json();
            if (!p.variantId) p.variantId = data?.product?.variants?.[0]?.id;
            if (!p.handle && data?.product?.handle) p.handle = data.product.handle;
            if (data?.product?.tags) p.tags = data.product.tags.split(', ');
          } catch { /* backfill failed — card will still render if variantId exists */ }
        })
      );
    }

    return mapped;
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
        handle: p.handle || '',
        tags: typeof p.tags === 'string' ? p.tags.split(', ') : (p.tags || []),
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
        handle: p.handle || '',
        tags: typeof p.tags === 'string' ? p.tags.split(', ') : (p.tags || []),
      }));
  }

  /**
   * Extracts badge and grade info from product tags.
   * @param {string[]} tags
   * @returns {{ hasNew: boolean, hasNewArrival: boolean, hasCpo: boolean, hasClearance: boolean, gradeValue: string }}
   */
  parseTags(tags) {
    if (!Array.isArray(tags)) tags = typeof tags === 'string' ? tags.split(', ') : [];
    let hasNew = false, hasNewArrival = false, hasCpo = false, hasClearance = false, gradeValue = '';
    for (const tag of tags) {
      const lower = tag.toLowerCase().trim();
      if (lower === 'new') hasNew = true;
      else if (lower === 'new arrival') hasNewArrival = true;
      else if (lower === 'cpo') hasCpo = true;
      else if (lower === 'clearance') hasClearance = true;
      if (tag.includes('Grade:')) gradeValue = tag.split(':')[1].trim();
    }
    return { hasNew, hasNewArrival, hasCpo, hasClearance, gradeValue };
  }

  /**
   * @param {Array} products
   * @returns {boolean} Whether any cards were rendered
   */
  renderCards(products) {
    const valid = products.filter((p) => p.variantId);
    if (!valid.length) return false;

    const fragment = document.createDocumentFragment();

    for (const product of valid) {
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

      // Badges + grade pill from tags
      const { hasNew, hasNewArrival, hasCpo, hasClearance, gradeValue } = this.parseTags(product.tags || []);
      let badgesHtml = '';
      if (hasNew || hasNewArrival || hasCpo || hasClearance) {
        let badges = '';
        if (hasNew) {
          badges += `<span class="ls-rec-card__badge ls-rec-card__badge--new"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M15.168 6.27344L10.082 5.73633L8 1.06641L5.91797 5.73633L0.832031 6.27344L4.63086 9.69727L3.57031 14.6992L8 12.1445L12.4297 14.6992L11.3691 9.69727L15.168 6.27344Z" fill="currentColor"/></svg>New</span>`;
        }
        if (hasNewArrival) {
          badges += `<span class="ls-rec-card__badge ls-rec-card__badge--arrival"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.1716 6.42926C11.3753 6.17962 11.3336 5.81643 11.0797 5.61689C10.8259 5.41734 10.4544 5.45825 10.2515 5.70706L7.48794 9.09681L6.01014 7.96133C5.88943 7.86308 5.73511 7.81586 5.58008 7.82974C5.42506 7.84362 5.28158 7.9175 5.18024 8.03563C5.13073 8.09357 5.09333 8.16084 5.07026 8.23348C5.04719 8.30611 5.03891 8.38263 5.04592 8.45852C5.05292 8.53441 5.07507 8.60812 5.11105 8.67531C5.14702 8.74249 5.1961 8.80178 5.25538 8.84968L7.19238 10.3609C7.3147 10.4604 7.47141 10.5074 7.62831 10.4918C7.7852 10.4761 7.92954 10.3991 8.0298 10.2774L11.1691 6.42008L11.1716 6.42926Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.75489 1.91573C7.20073 1.58844 7.42365 1.4248 7.66494 1.36134C7.88055 1.30664 8.10641 1.30664 8.32202 1.36134C8.56582 1.4248 8.78957 1.58844 9.23208 1.91573L9.79731 2.33068C9.95177 2.44423 10.0294 2.501 10.1129 2.54525C10.1875 2.58421 10.2651 2.6165 10.3459 2.6421C10.4369 2.66965 10.5312 2.68385 10.7207 2.71307L11.4137 2.8191C11.9606 2.90259 12.2336 2.94517 12.449 3.07292C12.641 3.18563 12.8013 3.34593 12.914 3.53796C13.0418 3.75504 13.0835 4.02889 13.1679 4.57326L13.2739 5.26624C13.3031 5.45576 13.3173 5.55094 13.3449 5.64195C13.3699 5.72266 13.4022 5.80002 13.4417 5.87405C13.4868 5.95754 13.5427 6.03519 13.6563 6.18965L14.0712 6.75489C14.3985 7.20073 14.5622 7.42365 14.6256 7.66494C14.6803 7.88055 14.6803 8.10641 14.6256 8.32202C14.563 8.56582 14.3985 8.78957 14.0712 9.23208L13.6563 9.79731C13.5768 9.8969 13.5051 10.0024 13.4417 10.1129C13.4021 10.1876 13.3697 10.2659 13.3449 10.3467C13.3173 10.4369 13.3031 10.5312 13.2739 10.7207L13.1679 11.4137C13.0844 11.9606 13.0418 12.2336 12.914 12.449C12.8013 12.641 12.641 12.8013 12.449 12.914C12.2319 13.0418 11.9581 13.0835 11.4137 13.1679L10.7207 13.2739C10.5941 13.2883 10.4688 13.3123 10.3459 13.3457C10.2651 13.3702 10.1875 13.4025 10.1129 13.4425C10.0294 13.4868 9.95177 13.5427 9.79731 13.6571L9.23208 14.0721C8.78623 14.3994 8.56331 14.563 8.32202 14.6265C8.10641 14.6812 7.88055 14.6812 7.66494 14.6265C7.42115 14.563 7.19739 14.3994 6.75489 14.0721L6.18965 13.6571C6.09006 13.5777 5.98456 13.5059 5.87405 13.4425C5.79964 13.403 5.72164 13.3706 5.64111 13.3457C5.51816 13.3123 5.39284 13.2883 5.26624 13.2739L4.57326 13.1679C4.02639 13.0844 3.75254 13.0426 3.53796 12.914C3.34662 12.8002 3.18675 12.6403 3.07292 12.449C2.94517 12.2319 2.90343 11.9581 2.8191 11.4137L2.71307 10.7207C2.68385 10.5312 2.66965 10.4369 2.6421 10.3459C2.61774 10.2651 2.58529 10.1871 2.54525 10.1129C2.48186 10.0024 2.41012 9.8969 2.33068 9.79731L1.91573 9.23208C1.58844 8.78623 1.4248 8.56415 1.36134 8.32202C1.30664 8.10641 1.30664 7.88055 1.36134 7.66494C1.42396 7.42115 1.58844 7.19739 1.91573 6.75489L2.33068 6.18965C2.44423 6.03519 2.501 5.95754 2.54525 5.87405C2.58421 5.80002 2.6165 5.72238 2.6421 5.64111C2.66965 5.55011 2.68385 5.45576 2.71307 5.26624L2.8191 4.57326C2.90259 4.02639 2.94517 3.75254 3.07292 3.53796C3.18563 3.34593 3.34593 3.1873 3.53796 3.07292C3.75504 2.94517 4.02889 2.90343 4.57326 2.8191L5.26624 2.71307C5.45576 2.68468 5.55094 2.66965 5.64111 2.6421C5.72182 2.61705 5.79947 2.58477 5.87405 2.54525C5.95754 2.501 6.03519 2.44423 6.18965 2.33068L6.75489 1.91573ZM8.74198 2.58867L9.33561 3.02449C9.46168 3.11717 9.58608 3.20901 9.72468 3.28248C9.84713 3.3476 9.97404 3.4002 10.1054 3.44028C10.2556 3.4818 10.4084 3.51277 10.5629 3.53295L11.291 3.64483C11.9096 3.74001 11.9865 3.76589 12.0315 3.79261C12.1022 3.83491 12.1585 3.89113 12.2002 3.96126C12.2269 4.00635 12.2536 4.08316 12.348 4.70183L12.4599 5.42988C12.48 5.58436 12.511 5.73725 12.5525 5.88741C12.5932 6.01988 12.6458 6.14679 12.7103 6.26813C12.7838 6.40673 12.8756 6.53113 12.9683 6.6572L13.4041 7.25083C13.7748 7.75511 13.8099 7.82775 13.8233 7.87952C13.8425 7.95795 13.8425 8.03987 13.8233 8.1183C13.8099 8.16923 13.7748 8.24187 13.4041 8.74699L12.9683 9.34062C12.8756 9.46669 12.7838 9.59109 12.7103 9.72969C12.6458 9.8513 12.5929 9.97878 12.5525 10.1104C12.511 10.2606 12.48 10.4135 12.4599 10.5679L12.348 11.296C12.2528 11.9147 12.2269 11.9915 12.2002 12.0366C12.1584 12.1055 12.1005 12.1634 12.0315 12.2052C11.9865 12.2319 11.9096 12.2586 11.291 12.353L10.5629 12.4649C10.4084 12.485 10.2556 12.516 10.1054 12.5575C9.97377 12.5979 9.84629 12.6508 9.72468 12.7153C9.58608 12.7888 9.46168 12.8807 9.33561 12.9733L8.74198 13.4092C8.2377 13.7799 8.16506 13.8149 8.11329 13.8283C8.03486 13.8475 7.95294 13.8475 7.87451 13.8283C7.82358 13.8149 7.75094 13.7799 7.24582 13.4092L6.65219 12.9733C6.52868 12.8784 6.39867 12.7922 6.26312 12.7153C6.14151 12.6508 6.01403 12.5979 5.8824 12.5575C5.73224 12.516 5.57936 12.485 5.42487 12.4649L4.69682 12.353C4.07815 12.2578 4.00134 12.2319 3.95626 12.2052C3.88728 12.1634 3.82942 12.1055 3.7876 12.0366C3.76089 11.9915 3.73417 11.9147 3.63982 11.296L3.52794 10.5679C3.50776 10.4135 3.4768 10.2606 3.43527 10.1104C3.39486 9.97878 3.34203 9.8513 3.27747 9.72969C3.204 9.59109 3.11216 9.46669 3.01948 9.34062L2.58366 8.74699C2.21295 8.2427 2.17789 8.17007 2.16453 8.1183C2.14528 8.03987 2.14528 7.95795 2.16453 7.87952C2.17789 7.82859 2.21295 7.75595 2.58366 7.25083L3.01948 6.6572C3.11216 6.53113 3.204 6.40673 3.27747 6.26813C3.34204 6.14568 3.39464 6.01877 3.43527 5.88741C3.4768 5.73725 3.50776 5.58436 3.52794 5.42988L3.63982 4.70183C3.735 4.08316 3.76089 4.00635 3.7876 3.96126C3.82942 3.89229 3.88728 3.83443 3.95626 3.79261C4.00134 3.76589 4.07815 3.73918 4.69682 3.64483L5.42487 3.53295C5.57936 3.51277 5.73224 3.4818 5.8824 3.44028C6.01488 3.39965 6.14178 3.34705 6.26312 3.28248C6.40172 3.20901 6.52612 3.11717 6.65219 3.02449L7.24582 2.58867C7.75011 2.21796 7.82274 2.1829 7.87451 2.16954C7.95294 2.15029 8.03486 2.15029 8.11329 2.16954C8.16422 2.1829 8.23686 2.21796 8.74198 2.58867Z" fill="currentColor"/></svg>New Arrival</span>`;
        }
        if (hasCpo) {
          badges += `<span class="ls-rec-card__badge ls-rec-card__badge--cpo"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6.20312 0L6.04688 0.140625L0.34375 5.90625L0 6.25L0.34375 6.60938L5.09375 11.3594L5.45312 11.7031L5.79688 11.3594L11.5625 5.65625L11.7031 5.5V0H6.20312ZM6.625 1H10.7031V5.07812L5.45312 10.2969L1.40625 6.25L6.625 1ZM9.20312 2C8.92773 2 8.70312 2.22461 8.70312 2.5C8.70312 2.77539 8.92773 3 9.20312 3C9.47852 3 9.70312 2.77539 9.70312 2.5C9.70312 2.22461 9.47852 2 9.20312 2Z" fill="currentColor"/></svg>Pre-owned</span>`;
        }
        if (hasClearance) {
          badges += `<span class="ls-rec-card__badge ls-rec-card__badge--clearance"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Clearance</span>`;
        }
        badgesHtml = `<div class="ls-rec-card__badges">${badges}</div>`;
      }

      let gradeHtml = '';
      if (gradeValue) {
        const variant = gradeValue.toLowerCase().replace('+', 'plus');
        gradeHtml = `<span class="ls-rec-card__grade ls-rec-card__grade--${variant}">${this.escapeHtml(gradeValue)}</span>`;
      }

      card.innerHTML = `
        <a href="${product.url}" class="ls-rec-card__image-wrap" tabindex="-1" aria-hidden="true">
          ${imgHtml}
          ${badgesHtml}
          ${gradeHtml}
        </a>
        <div class="ls-rec-card__stats-panel" data-stats-panel></div>
        ${vendorHtml}
        <div class="ls-rec-card__name">
          <a href="${product.url}" class="ls-rec-card__title">${titleEsc}</a>
        </div>
        <div class="ls-rec-card__footer">
          <p class="ls-rec-card__price">${price}</p>
          <div class="ls-rec-card__ctas">
            <button type="button" class="ls-rec-card__btn-stats" aria-label="Toggle stats for ${titleEsc}" data-stats-toggle data-product-handle="${product.handle}" hidden>
              <svg class="ls-rec-card__icon-chart" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M18.5916 10.6357C19.064 10.6357 19.4468 10.2529 19.4468 9.78054C19.4468 9.30823 19.064 8.92534 18.5916 8.92534H6.85524C6.38293 8.92534 6.00004 9.30823 6.00004 9.78054C6.00004 10.2529 6.38293 10.6357 6.85524 10.6357H18.5916ZM15.1942 15.0611C15.6627 15.0611 16.0426 14.6812 16.0426 14.2127C16.0426 13.7441 15.6627 13.3643 15.1942 13.3643H6.84845C6.37989 13.3643 6.00004 13.7441 6.00004 14.2127C6.00004 14.6812 6.37989 15.0611 6.84845 15.0611H15.1942ZM21.1516 19.5C21.6202 19.5 22 19.1202 22 18.6516C22 18.183 21.6202 17.8032 21.1516 17.8032H6.84845C6.37989 17.8032 6.00004 18.183 6.00004 18.6516C6.00004 19.1202 6.37989 19.5 6.84845 19.5H21.1516Z" fill="#141517"/>
                <path d="M2.00004 21C2.00004 21.5523 2.44776 22 3.00004 22C3.55232 22 4.00004 21.5523 4.00004 21V2.99999C4.00004 2.44771 3.55232 2 3.00004 2C2.44776 2 2.00004 2.44771 2.00004 3L2.00002 15.3334L2.00004 21ZM11.7899 4.5C12.2585 4.5 12.6383 4.87985 12.6383 5.34842C12.6383 5.81698 12.2585 6.19683 11.7899 6.19683H6.84845C6.37989 6.19683 6.00004 5.81698 6.00004 5.34842C6.00004 4.87985 6.37989 4.5 6.84845 4.5H11.7899Z" fill="#141517"/>
              </svg>
              <svg class="ls-rec-card__icon-close" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6L18 18" stroke="#141517" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <form method="post" action="${this.cartAddUrl}">
              <input type="hidden" name="id" value="${product.variantId}">
              <input type="hidden" name="quantity" value="1">
              <button
                type="submit"
                class="ls-rec-card__add"
                aria-label="Add ${titleEsc} to cart"
                ${product.available !== false ? '' : 'disabled'}
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
    this.scrollEl.addEventListener('submit', this.handleAddToCart);
    this.scrollEl.addEventListener('click', this.handleStatsToggle);

    // Pre-fetch stats for all cards — only reveal the stats button if data exists
    this.prefetchStats();

    return true;
  }

  /** Fetch stats for every rendered card; show the toggle button only when data exists. */
  async prefetchStats() {
    const buttons = this.scrollEl.querySelectorAll('[data-stats-toggle]');
    await Promise.all(
      [...buttons].map(async (btn) => {
        const handle = btn.dataset.productHandle;
        if (!handle) return;
        try {
          const res = await fetch(`/products/${handle}?sections=${STATS_SECTION_ID}`);
          if (!res.ok) return;
          const sections = await res.json();
          const html = sections[STATS_SECTION_ID] || '';
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const script = doc.querySelector('[data-product-stats]');
          const stats = script ? JSON.parse(script.textContent) : null;
          if (stats && (stats.cr || stats.mi || stats.hasMsrp || stats.specLabel)) {
            this._statsCache[handle] = stats;
            btn.removeAttribute('hidden');
          }
        } catch { /* no stats — button stays hidden */ }
      })
    );
  }

  /**
   * Intercepts form submits to add via AJAX instead of navigating to /cart.
   * Follows the same CartLinesUpdateEvent pattern as product-form.
   * @param {SubmitEvent} e
   */
  handleAddToCart = async (e) => {
    const form = /** @type {HTMLFormElement} */ (e.target);
    if (!form.matches('form')) return;
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const formData = new FormData(form);
    const variantId = /** @type {string} */ (formData.get('id'));
    const quantity = Number(formData.get('quantity')) || 1;

    // Collect section IDs so the Section Rendering API returns fresh HTML
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    const sectionIds = [];
    cartItemsComponents.forEach((el) => {
      if (el instanceof HTMLElement && el.dataset.sectionId) {
        sectionIds.push(el.dataset.sectionId);
      }
    });
    formData.append('sections', sectionIds.join(','));

    const deferredEventPromise = CartLinesUpdateEvent.createPromise();

    // Dispatch on document — cart-items-component and cart-drawer-component
    // both listen on document for this event.
    document.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'add',
        context: 'product',
        lines: [{ merchandiseId: variantId, quantity }],
        promise: deferredEventPromise.promise,
      })
    );

    const cfg = fetchConfig('javascript', { body: formData });

    try {
      const res = await fetch(Theme.routes.cart_add_url, {
        ...cfg,
        headers: { ...cfg.headers, Accept: 'text/html' },
      });
      const response = await res.json();

      if (response.status) {
        deferredEventPromise.reject(new Error(response.message || 'Add to cart failed'));
        return;
      }

      // Fetch updated cart and resolve the event promise so cart-items-component morphs
      const cartRes = await fetch(`${Theme.routes.cart_url}.json`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const ajaxCart = await cartRes.json();

      deferredEventPromise.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: {
          items: ajaxCart.items,
          source: 'cart-drawer-recs',
          itemCount: quantity,
          sections: response.sections,
        },
      });
    } catch (err) {
      deferredEventPromise.reject(err);
      // Fallback: submit the form natively
      form.submit();
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  /** Stats data cache keyed by product handle */
  _statsCache = {};

  /**
   * Handles stats button click — toggles the stats panel.
   * Fetches metafield data lazily on first open via the Section Rendering API.
   */
  handleStatsToggle = async (e) => {
    const btn = e.target.closest('[data-stats-toggle]');
    if (!btn) return;

    const card = btn.closest('.ls-rec-card');
    if (!card) return;

    const handle = btn.dataset.productHandle;
    const isOpen = card.classList.toggle('is-open');

    if (!isOpen || !handle) return;

    const panel = card.querySelector('[data-stats-panel]');
    if (!panel || panel.dataset.loaded) return;

    // Show loading state
    panel.innerHTML = '<div class="ls-rec-card__stats-loading">Loading stats…</div>';

    try {
      let stats = this._statsCache[handle];
      if (!stats) {
        const res = await fetch(`/products/${handle}?sections=${STATS_SECTION_ID}`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const sections = await res.json();
        const html = sections[STATS_SECTION_ID] || '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const script = doc.querySelector('[data-product-stats]');
        stats = script ? JSON.parse(script.textContent) : null;
        if (stats) this._statsCache[handle] = stats;
      }

      if (!stats || (!stats.cr && !stats.mi && !stats.hasMsrp && !stats.specLabel)) {
        panel.innerHTML = '<div class="ls-rec-card__stats-empty">No stats available</div>';
        panel.dataset.loaded = '1';
        return;
      }

      panel.innerHTML = this.buildStatsHtml(stats);
      panel.dataset.loaded = '1';
    } catch {
      panel.innerHTML = '<div class="ls-rec-card__stats-empty">Could not load stats</div>';
    }
  };

  /**
   * Builds the stats panel HTML from fetched metafield data.
   * @param {{ cr: number|null, mi: number|null, gradeLetter: string, gradeLabel: string, hasMsrp: boolean, savingsPct: number, specLabel: string }} s
   * @returns {string}
   */
  buildStatsHtml(s) {
    const gradeVariant = s.gradeLetter ? s.gradeLetter.toLowerCase().replace('+', 'plus') : '';

    let gradeHtml = '';
    if (s.gradeLetter) {
      gradeHtml = `
        <span class="ls-rec-card__stats-grade ls-rec-card__stats-grade--${gradeVariant}">
          Grade ${this.escapeHtml(s.gradeLetter)} — ${this.escapeHtml(s.gradeLabel)}
          <span class="ls-rec-card__stats-grade-letter ls-rec-card__stats-grade-letter--${gradeVariant}">${this.escapeHtml(s.gradeLetter)}</span>
        </span>`;
    }

    let rows = '';

    if (s.cr != null) {
      const crBar = Math.round(s.cr * 10);
      rows += `
        <div class="ls-rec-card__stats-row">
          <div class="ls-rec-card__stats-row-top">
            <span class="ls-rec-card__stats-label">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2C6.875 2 6.11719 2.44336 5.4375 2.8125C4.75781 3.18164 4.14062 3.5 3 3.5H2.5V4C2.5 7.85938 3.80469 10.3711 5.125 11.8906C6.44531 13.4102 7.8125 13.9688 7.8125 13.9688L8 14.0312L8.1875 13.9688C8.1875 13.9688 9.55469 13.4219 10.875 11.9062C12.1953 10.3906 13.5 7.87305 13.5 4V3.5H13C11.8652 3.5 11.2422 3.18164 10.5625 2.8125C9.88281 2.44336 9.125 2 8 2ZM8 3C8.875 3 9.37695 3.30664 10.0781 3.6875C10.6699 4.00977 11.4551 4.31836 12.4688 4.42188C12.373 7.80469 11.2539 9.95508 10.125 11.25C9.10156 12.4238 8.24219 12.8145 8 12.9219C7.75586 12.8125 6.89844 12.4121 5.875 11.2344C4.74609 9.93555 3.62695 7.78906 3.53125 4.42188C4.54883 4.31836 5.33008 4.00977 5.92188 3.6875C6.62305 3.30664 7.125 3 8 3Z" fill="#141517"/></svg>
              Condition
            </span>
            <span class="ls-rec-card__stats-value ls-rec-card__stats-value--green">${s.cr}/10</span>
          </div>
          <div class="ls-rec-card__stats-bar"><div class="ls-rec-card__stats-bar-fill" style="width: ${crBar}%"></div></div>
        </div>`;
    }

    if (s.mi != null) {
      const miBar = Math.round(s.mi * 10);
      rows += `
        <div class="ls-rec-card__stats-row">
          <div class="ls-rec-card__stats-row-top">
            <span class="ls-rec-card__stats-label">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.625 1.375L2.34375 1.64062L1.64062 2.34375L1.375 2.625L1.57812 2.95312L2.625 4.70312L2.76562 4.95312H4.23438L6.23438 6.9375C4.44727 8.73242 2.17383 11.0137 2.09375 11.0937C1.31055 11.877 1.30859 13.1602 2.10938 13.9062C2.89062 14.6777 4.16406 14.6973 4.90625 13.9062C4.91211 13.9004 4.91602 13.8965 4.92188 13.8906L8 10.7969L11.0938 13.9062L11.1406 13.9375C11.9258 14.6777 13.1738 14.6875 13.9062 13.9062V13.8906H13.9219C14.6875 13.1074 14.6953 11.834 13.9062 11.0937L13.8906 11.0781L11.2812 8.48437C13.0371 8.32031 14.4121 6.83789 14.4375 5.04687H14.4531C14.4551 5.03711 14.4531 5.02539 14.4531 5.01562C14.4531 5.00977 14.4531 5.00586 14.4531 5C14.502 4.42187 14.377 3.86914 14.0781 3.39062L13.7344 2.85937L11.4062 5.1875L10.7031 4.45312L13.0781 2.07812L12.3906 1.79687C11.9883 1.625 11.5234 1.5 11 1.5C9.07812 1.5 7.5 3.07812 7.5 5C7.5 5.20898 7.54492 5.39062 7.57812 5.57812C7.35938 5.79687 7.19531 5.97656 6.9375 6.23437L4.95312 4.25V2.76562L4.70312 2.625L2.95312 1.57812L2.625 1.375ZM11 2.5C11.0703 2.5 11.1191 2.54102 11.1875 2.54687L9.29688 4.4375L9.64062 4.79687L11.0469 6.25L11.3906 6.60937L13.375 4.625C13.3848 4.74023 13.4668 4.82422 13.4531 4.95312V5C13.4531 6.37695 12.3301 7.5 10.9531 7.5C10.7695 7.5 10.5469 7.45703 10.2969 7.40625L10.0312 7.35937L9.84375 7.54687L4.20312 13.2031H4.1875V13.2187C3.83203 13.6074 3.21094 13.6172 2.79688 13.2031V13.1875H2.78125C2.39258 12.832 2.38281 12.2109 2.79688 11.7969C2.98633 11.6074 6.65625 7.90625 8.45312 6.10937L8.65625 5.90625L8.57812 5.625C8.53711 5.46289 8.5 5.18359 8.5 5C8.5 3.62305 9.62305 2.5 11 2.5ZM2.78125 2.625L3.95312 3.34375V3.84375L3.84375 3.95312H3.34375L2.625 2.78125L2.78125 2.625ZM10.0938 8.70312L13.2031 11.7969V11.8125H13.2188C13.6074 12.168 13.6172 12.7891 13.2031 13.2031H13.1875V13.2187C12.832 13.6074 12.2109 13.6172 11.7969 13.2031L8.70312 10.0937L10.0938 8.70312Z" fill="#141517"/></svg>
              Mechanical integrity
            </span>
            <span class="ls-rec-card__stats-value ls-rec-card__stats-value--green">${s.mi}/10</span>
          </div>
          <div class="ls-rec-card__stats-bar"><div class="ls-rec-card__stats-bar-fill" style="width: ${miBar}%"></div></div>
        </div>`;
    }

    if (s.hasMsrp) {
      const savingsBar = Math.min(s.savingsPct, 100);
      rows += `
        <div class="ls-rec-card__stats-row">
          <div class="ls-rec-card__stats-row-top">
            <span class="ls-rec-card__stats-label">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5L7.84375 2.64062L2.14062 8.40625L1.79688 8.75L2.14062 9.10938L6.89062 13.8594L7.25 14.2031L7.59375 13.8594L13.3594 8.15625L13.5 8V2.5H8ZM8.42188 3.5H12.5V7.57812L7.25 12.7969L3.20312 8.75L8.42188 3.5ZM11 4.5C10.7246 4.5 10.5 4.72461 10.5 5C10.5 5.27539 10.7246 5.5 11 5.5C11.2754 5.5 11.5 5.27539 11.5 5C11.5 4.72461 11.2754 4.5 11 4.5Z" fill="#141517"/></svg>
              Value vs. retail
            </span>
            <span class="ls-rec-card__stats-value ls-rec-card__stats-value--green">${s.savingsPct}% below MSRP</span>
          </div>
          <div class="ls-rec-card__stats-bar"><div class="ls-rec-card__stats-bar-fill" style="width: ${savingsBar}%"></div></div>
        </div>`;
    }

    if (s.specLabel) {
      const specBar = { entry: 33, medium: 66, pro: 100 }[s.specLabel.toLowerCase()] || 0;
      rows += `
        <div class="ls-rec-card__stats-row">
          <div class="ls-rec-card__stats-row-top">
            <span class="ls-rec-card__stats-label">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3C4.69141 3 2 5.69141 2 9C2 10.4473 2.51758 11.7754 3.375 12.8125L3.51562 13H12.4844L12.625 12.8125C13.4824 11.7754 14 10.4473 14 9C14 5.69141 11.3086 3 8 3ZM8 4C10.7676 4 13 6.23242 13 9C13 10.1328 12.6035 11.1621 11.9688 12H4.03125C3.39648 11.1621 3 10.1328 3 9C3 6.23242 5.23242 4 8 4ZM8 4.5C7.72461 4.5 7.5 4.72461 7.5 5C7.5 5.27539 7.72461 5.5 8 5.5C8.27539 5.5 8.5 5.27539 8.5 5C8.5 4.72461 8.27539 4.5 8 4.5ZM6 5.03125C5.72461 5.03125 5.5 5.25586 5.5 5.53125C5.5 5.80664 5.72461 6.03125 6 6.03125C6.27539 6.03125 6.5 5.80664 6.5 5.53125C6.5 5.25586 6.27539 5.03125 6 5.03125ZM10 5.03125C9.72461 5.03125 9.5 5.25586 9.5 5.53125C9.5 5.80664 9.72461 6.03125 10 6.03125C10.2754 6.03125 10.5 5.80664 10.5 5.53125C10.5 5.25586 10.2754 5.03125 10 5.03125ZM4.53125 6.5C4.25586 6.5 4.03125 6.72461 4.03125 7C4.03125 7.27539 4.25586 7.5 4.53125 7.5C4.80664 7.5 5.03125 7.27539 5.03125 7C5.03125 6.72461 4.80664 6.5 4.53125 6.5ZM11.3281 6.51562L8.5 8.14062C8.35352 8.05469 8.18164 8 8 8C7.44727 8 7 8.44727 7 9C7 9.55273 7.44727 10 8 10C8.54688 10 8.99219 9.56055 9 9.01562C9 9.00977 9 9.00586 9 9L11.8281 7.39062L11.3281 6.51562ZM4 8.5C3.72461 8.5 3.5 8.72461 3.5 9C3.5 9.27539 3.72461 9.5 4 9.5C4.27539 9.5 4.5 9.27539 4.5 9C4.5 8.72461 4.27539 8.5 4 8.5ZM12 8.5C11.7246 8.5 11.5 8.72461 11.5 9C11.5 9.27539 11.7246 9.5 12 9.5C12.2754 9.5 12.5 9.27539 12.5 9C12.5 8.72461 12.2754 8.5 12 8.5ZM4.53125 10.5C4.25586 10.5 4.03125 10.7246 4.03125 11C4.03125 11.2754 4.25586 11.5 4.53125 11.5C4.80664 11.5 5.03125 11.2754 5.03125 11C5.03125 10.7246 4.80664 10.5 4.53125 10.5ZM11.4688 10.5C11.1934 10.5 10.9688 10.7246 10.9688 11C10.9688 11.2754 11.1934 11.5 11.4688 11.5C11.7441 11.5 11.9688 11.2754 11.9688 11C11.9688 10.7246 11.7441 10.5 11.4688 10.5Z" fill="#141517"/></svg>
              Spec Level
            </span>
            <span class="ls-rec-card__stats-value">${this.escapeHtml(s.specLabel)}</span>
          </div>
          <div class="ls-rec-card__stats-bar"><div class="ls-rec-card__stats-bar-fill" style="width: ${specBar}%"></div></div>
        </div>`;
    }

    return `
      <div class="ls-rec-card__stats-header">
        <span class="ls-rec-card__stats-title">General Stats</span>
        ${gradeHtml}
      </div>
      <div class="ls-rec-card__stats-list">${rows}</div>`;
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
