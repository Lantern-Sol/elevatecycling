/**
 * Elevate Filter Search
 * Filters visible filter groups and items in the sidebar by text query.
 */
(function () {
  const SEARCH_INPUT_ID = 'elevate-filter-search-input';

  function init() {
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (!input) return;

    const wrapper = input.closest('.facets__filters-wrapper');
    if (!wrapper) return;

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      const groups = wrapper.querySelectorAll('.facets__item');

      groups.forEach((group) => {
        if (!query) {
          group.removeAttribute('data-filter-hidden');
          group.querySelectorAll('.facets__inputs-list-item').forEach((item) => {
            item.removeAttribute('data-filter-hidden');
          });
          return;
        }

        // Check group label
        const label = group.querySelector('.facets__label');
        const groupName = label ? label.textContent.trim().toLowerCase() : '';
        const groupMatches = groupName.includes(query);

        // Check individual items
        const items = group.querySelectorAll('.facets__inputs-list-item');
        let visibleCount = 0;

        items.forEach((item) => {
          const itemLabel = item.querySelector('.checkbox__label-text, .facets__pill-label, .facets__swatch-label, .facets__image-label');
          const itemText = itemLabel ? itemLabel.textContent.trim().toLowerCase() : '';

          if (groupMatches || itemText.includes(query)) {
            item.removeAttribute('data-filter-hidden');
            visibleCount++;
          } else {
            item.setAttribute('data-filter-hidden', '');
          }
        });

        // Hide entire group if no items match and group name doesn't match
        if (visibleCount === 0 && !groupMatches) {
          group.setAttribute('data-filter-hidden', '');
        } else {
          group.removeAttribute('data-filter-hidden');
          // If group name matches, show all items
          if (groupMatches) {
            items.forEach((item) => item.removeAttribute('data-filter-hidden'));
          }
        }
      });
    });
  }

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init after Shopify section re-renders (AJAX filtering)
  document.addEventListener('shopify:section:load', init);
})();
