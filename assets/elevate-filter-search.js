/**
 * Elevate Filter Search
 * Filters visible filter groups and items by text query.
 * Supports both the sidebar input and the mobile drawer input.
 */
(function () {
  const SEARCH_INPUT_IDS = [
    'elevate-filter-search-input',
    'elevate-drawer-filter-search-input'
  ];

  function initForInput(input) {
    const wrapper = input.closest('.facets-drawer__filters, .facets__filters-wrapper')
      ?.querySelector('.facets__filters-wrapper')
      || input.closest('.facets__filters-wrapper');
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

  function init() {
    SEARCH_INPUT_IDS.forEach((id) => {
      const input = document.getElementById(id);
      if (input) initForInput(input);
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
