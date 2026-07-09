/**
 * Dual range slider for price filter.
 * Syncs range inputs → hidden text inputs → PriceFacetComponent.
 * Event-delegated so it survives morph updates.
 */
(function () {
  /** Convert cents to display value (e.g. 1050 → "10.50" for USD). */
  function centsToDisplay(cents) {
    return (cents / 100).toFixed(2);
  }

  /** Update CSS vars and label text for a .price-slider container. */
  function syncSlider(slider) {
    const minRange = slider.querySelector('.price-slider__range--min');
    const maxRange = slider.querySelector('.price-slider__range--max');
    if (!minRange || !maxRange) return;

    const rangeMax = parseFloat(maxRange.max) || 1;
    let minVal = parseFloat(minRange.value) || 0;
    let maxVal = parseFloat(maxRange.value) || 0;

    // Prevent crossing
    if (minVal > maxVal) {
      if (minRange === document.activeElement) {
        minRange.value = maxVal;
        minVal = maxVal;
      } else {
        maxRange.value = minVal;
        maxVal = minVal;
      }
    }

    const minPct = (minVal / rangeMax) * 100;
    const maxPct = (maxVal / rangeMax) * 100;

    slider.style.setProperty('--min-pct', minPct + '%');
    slider.style.setProperty('--max-pct', maxPct + '%');

    // Update labels
    const symbol = slider.dataset.currencySymbol || '$';
    const minLabel = slider.querySelector('[data-role="min"]');
    const maxLabel = slider.querySelector('[data-role="max"]');
    if (minLabel) minLabel.textContent = symbol + centsToDisplay(minVal);
    if (maxLabel) maxLabel.textContent = symbol + centsToDisplay(maxVal);

    // Sync to hidden text inputs
    const component = slider.closest('price-facet-component');
    if (!component) return;

    const hiddenMin = component.querySelector('[ref="minInput"]');
    const hiddenMax = component.querySelector('[ref="maxInput"]');

    if (hiddenMin) {
      hiddenMin.value = minVal > 0 ? centsToDisplay(minVal) : '';
    }
    if (hiddenMax) {
      hiddenMax.value = maxVal < rangeMax ? centsToDisplay(maxVal) : '';
    }
  }

  // Real-time visual update on drag
  document.addEventListener('input', function (e) {
    if (!e.target.classList.contains('price-slider__range')) return;
    var slider = e.target.closest('.price-slider');
    if (slider) syncSlider(slider);
  });

  // On release, trigger PriceFacetComponent filter update
  document.addEventListener('change', function (e) {
    if (!e.target.classList.contains('price-slider__range')) return;
    var slider = e.target.closest('.price-slider');
    if (!slider) return;

    syncSlider(slider);

    var component = slider.closest('price-facet-component');
    if (component) {
      component.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
})();
