/**
 * Elevate Cycling — Scroll Reveal
 * Pure IntersectionObserver + CSS transitions (no GSAP dependency).
 * Loaded at end of <body> so DOM is already parsed.
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

  /* ── Inject reveal CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    /* Hidden state */
    '[data-scroll-reveal]:not(.is-revealed) {',
    '  opacity: 0;',
    '  transform: translateY(1.875rem);',
    '}',
    '[data-scroll-reveal="fade"]:not(.is-revealed) {',
    '  transform: none;',
    '}',
    /* Children mode: parent is visible, children are hidden */
    '[data-scroll-reveal="children"] {',
    '  opacity: 1 !important;',
    '  transform: none !important;',
    '}',
    '[data-scroll-reveal="children"] > * {',
    '  opacity: 0;',
    '  transform: translateY(1.875rem);',
    '  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '[data-scroll-reveal="children"].is-revealed > * {',
    '  opacity: 1;',
    '  transform: none;',
    '}',
    /* Fade-children mode: stagger children with opacity only (no translateY) */
    '[data-scroll-reveal="fade-children"] {',
    '  opacity: 1 !important;',
    '  transform: none !important;',
    '}',
    '[data-scroll-reveal="fade-children"] > * {',
    '  opacity: 0;',
    '  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);',
    '}',
    '[data-scroll-reveal="fade-children"].is-revealed > * {',
    '  opacity: 1;',
    '}',
    /* Revealed state */
    '.is-revealed {',
    '  opacity: 1 !important;',
    '  transform: none !important;',
    '}',
    /* Transition on the element itself */
    '[data-scroll-reveal] {',
    '  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);',
    '}'
  ].join('\n');
  document.head.appendChild(style);

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

      el.classList.add('is-revealed');
      observer.unobserve(el);
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  /* ── Init ── */
  var els = document.querySelectorAll('[data-scroll-reveal]');
  console.log('[scroll-reveal] Observing', els.length, 'elements');
  els.forEach(function (el) { observer.observe(el); });
})();
