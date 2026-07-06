/**
 * Trade Form QA / Debug Script
 * ─────────────────────────────
 * Paste in browser console on /pages/trade-form
 * Tests field visibility, validation, multi-item, step nav, and contact validation.
 * Results stored in window._tradeDebug
 */
(async function tradeFormQA() {
  'use strict';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const root = document.querySelector('[data-trade-form]');
  if (!root) {
    console.error('Trade form not found. Are you on /pages/trade-form?');
    return;
  }

  const results = { passed: 0, failed: 0, errors: [], log: [] };
  window._tradeDebug = results;

  function pass(msg) {
    results.passed++;
    results.log.push({ status: 'pass', msg });
    console.log('%c\u2713 ' + msg, 'color: #22c55e');
  }

  function fail(msg) {
    results.failed++;
    results.errors.push(msg);
    results.log.push({ status: 'fail', msg });
    console.log('%c\u2717 ' + msg, 'color: #ef4444; font-weight: bold');
  }

  function assert(condition, passMsg, failMsg) {
    if (condition) pass(passMsg);
    else fail(failMsg || passMsg);
  }

  /* ── Helper: get elements ── */
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];

  function getTypeCard(type) {
    return root.querySelector(`[data-trade-type="${type}"]`);
  }

  function getField(name) {
    return root.querySelector(`[data-trade-field="${name}"]`);
  }

  function getConditional(name) {
    return root.querySelector(`[data-trade-conditional="${name}"]`);
  }

  function getDynamicRow() {
    return root.querySelector('[data-trade-row-dynamic]');
  }

  function isHiddenProperly(el) {
    const hasHidden = el.hidden === true || el.hasAttribute('hidden');
    const computedDisplay = getComputedStyle(el).display;
    return { hasHidden, computedDisplay, effectivelyHidden: computedDisplay === 'none' };
  }

  function isVisibleProperly(el) {
    const hasHidden = el.hidden === true || el.hasAttribute('hidden');
    const computedDisplay = getComputedStyle(el).display;
    return { hasHidden: !hasHidden, computedNotNone: computedDisplay !== 'none' };
  }

  function clickType(type) {
    const card = getTypeCard(type);
    if (card) card.click();
  }

  function clearAllStep1Fields() {
    const brand = getField('brand');
    const model = getField('model');
    const year = getField('year');
    const size = getField('size');
    const groupset = getField('groupset');
    const price = getField('price');
    if (brand) brand.value = '';
    if (model) model.value = '';
    if (year) year.value = '';
    if (size) size.value = '';
    if (groupset) groupset.value = '';
    if (price) price.value = '';
    /* Uncheck condition radios */
    $$('[data-trade-field="condition"]').forEach((r) => {
      r.checked = false;
      const card = r.closest('.elevate-trade-form__condition-card');
      if (card) card.classList.remove('is-active');
    });
  }

  function clearAllStep2Fields() {
    const fields = ['contactName', 'contactLastName', 'contactEmail', 'contactPhone'];
    fields.forEach((f) => {
      const el = getField(f);
      if (el) el.value = '';
    });
    $$('[data-trade-field="payout"]').forEach((r) => (r.checked = false));
    const terms = getField('terms');
    if (terms) terms.checked = false;
  }

  function clearErrors() {
    root.querySelectorAll('.is-error').forEach((el) => el.classList.remove('is-error'));
    root.querySelectorAll('.elevate-trade-form__error').forEach((el) => el.remove());
  }

  function countErrors() {
    return root.querySelectorAll('.elevate-trade-form__error').length;
  }

  function hasErrorOn(fieldName) {
    const el = getField(fieldName);
    if (!el) return false;
    return el.classList.contains('is-error');
  }

  function fillValidItem() {
    const brand = getField('brand');
    const model = getField('model');
    const year = getField('year');
    const cond = $$('[data-trade-field="condition"]')[0];
    if (brand) { brand.value = 'TestBrand'; brand.dispatchEvent(new Event('input', { bubbles: true })); }
    if (model) { model.value = 'TestModel'; model.dispatchEvent(new Event('input', { bubbles: true })); }
    if (year) { year.value = '2024'; year.dispatchEvent(new Event('change', { bubbles: true })); }
    /* Size — only fill if visible */
    const sizeWrap = getConditional('size');
    if (sizeWrap && !sizeWrap.hidden) {
      const size = getField('size');
      if (size) { size.value = 'M'; size.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    /* Condition */
    if (cond) { cond.checked = true; cond.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  /* ════════════════════════════════════════ */
  /* ── SUITE 1: Field visibility per type ─ */
  /* ════════════════════════════════════════ */
  console.log('%c\u2550\u2550\u2550 Trade Form QA \u2550\u2550\u2550', 'font-size: 14px; font-weight: bold; color: #3b82f6');
  console.log('%c--- Suite 1: Field visibility per type ---', 'color: #94a3b8');

  const typeExpectations = {
    bike:       { size: true,  groupset: true,  cols: 3 },
    frameset:   { size: true,  groupset: false, cols: 2 },
    groupset:   { size: false, groupset: false, cols: 1 },
    wheelset:   { size: false, groupset: false, cols: 1 },
    individual: { size: false, groupset: false, cols: 1 },
  };

  const alwaysVisibleFields = ['brand', 'model', 'year'];

  for (const [type, expect] of Object.entries(typeExpectations)) {
    clickType(type);
    await sleep(50);

    /* Row 1: brand, model, year — always visible */
    for (const fieldName of alwaysVisibleFields) {
      const el = getField(fieldName);
      if (el) {
        const vis = isVisibleProperly(el.closest('.elevate-trade-form__field'));
        assert(
          vis.hasHidden && vis.computedNotNone,
          `${type}: ${fieldName} visible`,
          `${type}: ${fieldName} should be visible but hidden=${!vis.hasHidden}, display=${getComputedStyle(el.closest('.elevate-trade-form__field')).display}`
        );
      }
    }

    /* Conditional: size */
    const sizeWrap = getConditional('size');
    if (sizeWrap) {
      const state = isHiddenProperly(sizeWrap);
      if (expect.size) {
        assert(
          !state.hasHidden && state.computedDisplay !== 'none',
          `${type}: Size visible`,
          `${type}: Size should be visible but hidden=${state.hasHidden}, display=${state.computedDisplay}`
        );
      } else {
        assert(
          state.effectivelyHidden,
          `${type}: Size hidden`,
          `${type}: Size should be hidden but computed display is "${state.computedDisplay}"`
        );
      }
    }

    /* Conditional: groupset */
    const groupWrap = getConditional('groupset');
    if (groupWrap) {
      const state = isHiddenProperly(groupWrap);
      if (expect.groupset) {
        assert(
          !state.hasHidden && state.computedDisplay !== 'none',
          `${type}: Groupset visible`,
          `${type}: Groupset should be visible but hidden=${state.hasHidden}, display=${state.computedDisplay}`
        );
      } else {
        assert(
          state.effectivelyHidden,
          `${type}: Groupset hidden`,
          `${type}: Groupset should be hidden but computed display is "${state.computedDisplay}"`
        );
      }
    }

    /* Price — always visible */
    const priceEl = getField('price');
    if (priceEl) {
      const priceWrap = priceEl.closest('.elevate-trade-form__field');
      const vis = isVisibleProperly(priceWrap);
      assert(
        vis.hasHidden && vis.computedNotNone,
        `${type}: Price visible`,
        `${type}: Price should be visible but hidden or display=none`
      );
    }

    /* data-trade-cols */
    const dynRow = getDynamicRow();
    if (dynRow) {
      const actualCols = dynRow.dataset.tradeCols;
      assert(
        parseInt(actualCols) === expect.cols,
        `${type}: Row2 cols=${expect.cols}`,
        `${type}: Row2 cols should be ${expect.cols} but got "${actualCols}"`
      );
    }
  }

  /* ════════════════════════════════════════ */
  /* ── SUITE 2: Validation per type ─────── */
  /* ════════════════════════════════════════ */
  console.log('%c--- Suite 2: Validation per type ---', 'color: #94a3b8');

  const btnNext = $('[data-trade-next]');

  for (const type of Object.keys(typeExpectations)) {
    clickType(type);
    await sleep(50);
    clearAllStep1Fields();
    clearErrors();
    await sleep(50);

    /* Click next with all fields empty */
    btnNext.click();
    await sleep(100);

    /* Brand + Model always required */
    assert(
      hasErrorOn('brand'),
      `${type}: Brand error shown on empty`,
      `${type}: Brand should show error when empty`
    );
    assert(
      hasErrorOn('model'),
      `${type}: Model error shown on empty`,
      `${type}: Model should show error when empty`
    );

    /* Year always required */
    assert(
      hasErrorOn('year'),
      `${type}: Year error shown on empty`,
      `${type}: Year should show error when empty`
    );

    /* Size required only for bike + frameset */
    const sizeExpected = typeExpectations[type].size;
    if (sizeExpected) {
      assert(
        hasErrorOn('size'),
        `${type}: Size error shown (required)`,
        `${type}: Size should show error when required and empty`
      );
    } else {
      assert(
        !hasErrorOn('size'),
        `${type}: Size no error (not required)`,
        `${type}: Size should NOT show error (field hidden)`
      );
    }

    /* Groupset never required */
    assert(
      !hasErrorOn('groupset'),
      `${type}: Groupset no error (never required)`,
      `${type}: Groupset should never show error`
    );

    /* Condition always required */
    const condContainer = $('[data-trade-conditions]');
    const condHasError = condContainer && condContainer.classList.contains('is-error');
    assert(
      condHasError,
      `${type}: Condition error shown on empty`,
      `${type}: Condition should show error when not selected`
    );

    clearErrors();
  }

  /* ════════════════════════════════════════ */
  /* ── SUITE 3: Multi-item interactions ─── */
  /* ════════════════════════════════════════ */
  console.log('%c--- Suite 3: Multi-item interactions ---', 'color: #94a3b8');

  /* Reset to bike, clean state */
  clickType('bike');
  await sleep(50);
  clearAllStep1Fields();
  clearErrors();

  /* Fill item 1 as bike */
  getField('brand').value = 'BikeBrand';
  getField('brand').dispatchEvent(new Event('input', { bubbles: true }));
  getField('model').value = 'BikeModel';
  getField('model').dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  /* Add a second item */
  const addItemBtn = $('[data-trade-add-item]');
  if (addItemBtn) {
    addItemBtn.click();
    await sleep(100);

    /* Verify sidebar shows 2 entries */
    const sidebarEntries = $$('[data-trade-item-entry]');
    assert(
      sidebarEntries.length === 2,
      'Multi: sidebar shows 2 entries after add',
      `Multi: sidebar should show 2 entries but shows ${sidebarEntries.length}`
    );

    /* Set item 2 as groupset */
    clickType('groupset');
    await sleep(50);
    getField('brand').value = 'GroupBrand';
    getField('brand').dispatchEvent(new Event('input', { bubbles: true }));
    getField('model').value = 'GroupModel';
    getField('model').dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);

    /* Verify fields for groupset: size hidden, groupset hidden */
    const sizeState2 = isHiddenProperly(getConditional('size'));
    assert(
      sizeState2.effectivelyHidden,
      'Multi: item2 (groupset) Size hidden',
      `Multi: item2 Size should be hidden but display="${sizeState2.computedDisplay}"`
    );

    /* Switch back to item 1 */
    const entry0 = $('[data-trade-item-entry="0"]');
    if (entry0) {
      entry0.click();
      await sleep(100);

      /* Verify item 1 shows bike fields (size visible) */
      const sizeState1 = isHiddenProperly(getConditional('size'));
      assert(
        !sizeState1.hasHidden && sizeState1.computedDisplay !== 'none',
        'Multi: item1 (bike) Size visible after switch',
        `Multi: item1 Size should be visible after switch but hidden=${sizeState1.hasHidden}, display=${sizeState1.computedDisplay}`
      );

      /* Verify item 1 retained its values */
      const brandVal = getField('brand').value;
      assert(
        brandVal === 'BikeBrand',
        'Multi: item1 retained brand="BikeBrand"',
        `Multi: item1 brand should be "BikeBrand" but got "${brandVal}"`
      );

      const modelVal = getField('model').value;
      assert(
        modelVal === 'BikeModel',
        'Multi: item1 retained model="BikeModel"',
        `Multi: item1 model should be "BikeModel" but got "${modelVal}"`
      );
    }

    /* Switch to item 2 and verify its values */
    const entry1 = $('[data-trade-item-entry="1"]');
    if (entry1) {
      entry1.click();
      await sleep(100);

      const brandVal2 = getField('brand').value;
      assert(
        brandVal2 === 'GroupBrand',
        'Multi: item2 retained brand="GroupBrand"',
        `Multi: item2 brand should be "GroupBrand" but got "${brandVal2}"`
      );
    }

    /* Remove item 2 */
    const removeBtn = $('[data-trade-remove-item="1"]');
    if (removeBtn) {
      removeBtn.click();
      await sleep(100);

      const entriesAfter = $$('[data-trade-item-entry]');
      assert(
        entriesAfter.length === 1,
        'Multi: sidebar back to 1 entry after remove',
        `Multi: sidebar should show 1 entry after remove but shows ${entriesAfter.length}`
      );
    } else {
      /* Entry 1 might already be active and the remove is in a different position */
      fail('Multi: could not find remove button for item 2');
    }
  } else {
    fail('Multi: Add Item button not found');
  }

  /* ════════════════════════════════════════ */
  /* ── SUITE 4: Step navigation + mode ──── */
  /* ════════════════════════════════════════ */
  console.log('%c--- Suite 4: Step navigation + mode switching ---', 'color: #94a3b8');

  /* Ensure we're on step 1 with bike type */
  clickType('bike');
  await sleep(50);
  clearAllStep1Fields();
  clearErrors();
  fillValidItem();
  await sleep(50);

  /* Click Next → should go to step 2 */
  btnNext.click();
  await sleep(150);

  const step1El = $('[data-trade-step="1"]');
  const step2El = $('[data-trade-step="2"]');

  assert(
    step1El && step1El.hidden,
    'Nav: step 1 hidden after Next',
    'Nav: step 1 should be hidden after clicking Next'
  );
  assert(
    step2El && !step2El.hidden,
    'Nav: step 2 shown after Next',
    'Nav: step 2 should be shown after clicking Next'
  );

  /* Click Back → should return to step 1 */
  const btnBack = $('[data-trade-back]');
  if (btnBack) {
    btnBack.click();
    await sleep(150);

    assert(
      step1El && !step1El.hidden,
      'Nav: step 1 restored after Back',
      'Nav: step 1 should be visible after clicking Back'
    );
    assert(
      step2El && step2El.hidden,
      'Nav: step 2 hidden after Back',
      'Nav: step 2 should be hidden after clicking Back'
    );
  }

  /* Switch to bulk mode */
  const bulkToggle = $('[data-trade-bulk-toggle]');
  const step1Bulk = $('[data-trade-step="1-bulk"]');
  const sidebarEl = $('[data-trade-sidebar]');

  if (bulkToggle) {
    bulkToggle.click();
    await sleep(150);

    assert(
      step1Bulk && !step1Bulk.hidden,
      'Nav: bulk step shown after toggle',
      'Nav: bulk step should be visible after toggle'
    );
    assert(
      step1El && step1El.hidden,
      'Nav: item step hidden in bulk mode',
      'Nav: item step should be hidden in bulk mode'
    );
    assert(
      sidebarEl && sidebarEl.classList.contains('is-hidden'),
      'Nav: sidebar hidden in bulk mode',
      'Nav: sidebar should be hidden in bulk mode'
    );

    /* Switch back to item mode */
    const backToItems = $('[data-trade-back-to-items]');
    if (backToItems) {
      backToItems.click();
      await sleep(150);

      assert(
        step1El && !step1El.hidden,
        'Nav: item step restored after back-to-items',
        'Nav: item step should be visible after switching back'
      );
      assert(
        step1Bulk && step1Bulk.hidden,
        'Nav: bulk step hidden after back-to-items',
        'Nav: bulk step should be hidden after switching back'
      );
    }
  }

  /* ════════════════════════════════════════ */
  /* ── SUITE 5: Contact validation (Step 2) */
  /* ════════════════════════════════════════ */
  console.log('%c--- Suite 5: Contact validation (step 2) ---', 'color: #94a3b8');

  /* Navigate to step 2 */
  clearAllStep1Fields();
  clearErrors();
  clickType('bike');
  await sleep(50);
  fillValidItem();
  await sleep(50);
  btnNext.click();
  await sleep(150);

  /* Clear step 2 fields and submit */
  clearAllStep2Fields();
  clearErrors();
  await sleep(50);

  const btnSubmit = $('[data-trade-submit]');
  if (btnSubmit) {
    btnSubmit.click();
    await sleep(150);

    /* All contact fields should show errors */
    assert(
      hasErrorOn('contactName'),
      'Contact: Name error on empty',
      'Contact: Name should show error when empty'
    );
    assert(
      hasErrorOn('contactLastName'),
      'Contact: LastName error on empty',
      'Contact: LastName should show error when empty'
    );
    assert(
      hasErrorOn('contactEmail'),
      'Contact: Email error on empty',
      'Contact: Email should show error when empty'
    );
    assert(
      hasErrorOn('contactPhone'),
      'Contact: Phone error on empty',
      'Contact: Phone should show error when empty'
    );

    /* Payout required */
    const payoutContainer = $('[data-trade-payout-cards]');
    assert(
      payoutContainer && payoutContainer.classList.contains('is-error'),
      'Contact: Payout error on empty',
      'Contact: Payout should show error when not selected'
    );

    /* Terms required */
    const consentWrap = getField('terms')?.closest('.elevate-trade-form__consent');
    assert(
      consentWrap && consentWrap.classList.contains('is-error'),
      'Contact: Terms error when unchecked',
      'Contact: Terms should show error when unchecked'
    );

    /* Email requires @ */
    clearErrors();
    const emailEl = getField('contactEmail');
    emailEl.value = 'bademail';
    btnSubmit.click();
    await sleep(150);

    assert(
      hasErrorOn('contactEmail'),
      'Contact: Email error on missing @',
      'Contact: Email should show error when missing @'
    );
  }

  /* ════════════════════════════════════════ */
  /* ── Restore form to default state ────── */
  /* ════════════════════════════════════════ */

  /* Go back to step 1 */
  if (btnBack && !btnBack.hidden) {
    btnBack.click();
    await sleep(100);
  }

  clearAllStep1Fields();
  clearAllStep2Fields();
  clearErrors();
  clickType('bike');
  await sleep(50);

  /* ── Summary ── */
  const total = results.passed + results.failed;
  const summaryColor = results.failed === 0 ? '#22c55e' : '#ef4444';
  console.log(
    `%c\u2550\u2550\u2550 ${results.passed}/${total} passed, ${results.failed} failed \u2550\u2550\u2550`,
    `font-size: 14px; font-weight: bold; color: ${summaryColor}`
  );

  if (results.failed > 0) {
    console.log('%cFailed tests:', 'color: #ef4444; font-weight: bold');
    results.errors.forEach((e) => console.log('%c  \u2022 ' + e, 'color: #ef4444'));
  }

  console.log('Results stored in window._tradeDebug');
})();
