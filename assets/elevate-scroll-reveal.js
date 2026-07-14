/**
 * Elevate Cycling — Scroll Reveal
 * Pure IntersectionObserver + CSS transitions (no GSAP dependency).
 * Loaded at end of <body> so DOM is already parsed.
 *
 * ALL CSS (hidden state, transitions, revealed state) lives in a static
 * <style> block in the <head> of theme.liquid so it's render-blocking and
 * available from first paint. This JS only runs the observer.
 *
 * Usage (Liquid):
 *   <div data-scroll-reveal>                → fade-up the whole element
 *   <div data-scroll-reveal="children">     → stagger-reveal each direct child
 *   <div data-scroll-reveal="fade">         → simple fade (no vertical motion)
 *   <div data-scroll-reveal="fade-children"> → stagger-reveal children (fade only, no motion)
 *
 * Overrides per-element:
 *   data-reveal-delay="0.2"   → base delay in seconds (default 0)
 *   data-reveal-stagger="0.1" → delay between children in seconds (default 0.1)
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Observer ── */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      var el = entry.target;
      var mode = el.getAttribute('data-scroll-reveal') || 'default';
      var baseDelay = parseFloat(el.getAttribute('data-reveal-delay') || '0');

      if (mode === 'children' || mode === 'fade-children') {
        var stagger = parseFloat(el.getAttribute('data-reveal-stagger') || '0.1');
        var children = el.children;
        for (var i = 0; i < children.length; i++) {
          children[i].style.transitionDelay = (baseDelay + i * stagger) + 's';
        }
      } else if (baseDelay > 0) {
        el.style.transitionDelay = baseDelay + 's';
      }

      /* Double-rAF ensures at least one full paint cycle has occurred
         with the hidden state before .is-revealed triggers the transition */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.add('is-revealed');
        });
      });
      observer.unobserve(el);
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  /* ── Observe a single element (skip if already revealed) ── */
  function observeEl(el) {
    if (!el.classList.contains('is-revealed')) {
      observer.observe(el);
    }
  }

  /* ── Init: observe all existing elements ── */
  var els = document.querySelectorAll('[data-scroll-reveal]');
  console.log('[scroll-reveal] Observing', els.length, 'elements');
  els.forEach(function (el) { observeEl(el); });

  /* ── Watch for new [data-scroll-reveal] elements added by morph/AJAX ── */
  var domObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        /* Check the added node itself */
        if (node.hasAttribute && node.hasAttribute('data-scroll-reveal')) {
          observeEl(node);
        }
        /* Check descendants of the added node */
        if (node.querySelectorAll) {
          node.querySelectorAll('[data-scroll-reveal]').forEach(function (child) {
            observeEl(child);
          });
        }
      });
    });
  });

  domObserver.observe(document.body, { childList: true, subtree: true });
})();
