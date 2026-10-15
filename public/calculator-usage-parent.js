/* TheWing calculator usage v1. Install ONCE on the outer published TheWing page.
 * Reuses the existing Google tag and consent policy; does not install/configure tags.
 */
(() => {
  'use strict';
  if (!['https://thewing.ai', 'https://www.thewing.ai'].includes(location.origin) ||
      window.__thewingCalculatorUsageParent) return;
  const route = {
    '/air-force/pt-calculator.html': ['pt', '/pt-calculator'],
    '/air-force/disability-calculator.html': ['disability', '/disability-calculator']
  }[location.pathname];
  if (!route) return;
  window.__thewingCalculatorUsageParent = true;
  const [id, appPath] = route;
  const APP_ORIGIN = 'https://thewing.netlify.app';
  const TYPE = 'thewing:usage:v1';
  const frames = new Map();
  function matches(frame) {
    try {
      const u = new URL(frame.src, location.href);
      return u.origin === APP_ORIGIN && u.pathname.toLowerCase().replace(/\/$/, '') === appPath;
    } catch (_) { return false; }
  }
  function state(frame, record) {
    frame.contentWindow?.postMessage({type: TYPE, kind: 'state', calculator_id: id,
      visit: record.visit, visible: record.visible && document.visibilityState === 'visible' &&
        document.hasFocus()}, APP_ORIGIN);
  }
  function register(frame) {
    let record = frames.get(frame);
    if (record) return record;
    record = {visit: null, retired: new Set(), visible: false};
    frames.set(frame, record);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        record.visible = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
        state(frame, record);
      });
      observer.observe(frame);
    }
    // Without visibility observation, activity counts still work; time stays zero.
    return record;
  }
  function acknowledge(frame, record) {
    frame.contentWindow.postMessage({type: TYPE, kind: 'ack', calculator_id: id,
      visit: record.visit, revision: record.revision}, APP_ORIGIN);
  }
  function validSnapshot(d) {
    return Number.isSafeInteger(d.revision) && d.revision >= 0 &&
      typeof d.started === 'boolean' && typeof d.result === 'boolean' &&
      (!d.result || d.started) && Number.isSafeInteger(d.activities) &&
      d.activities >= 0 && d.activities <= 100000 &&
      Number.isSafeInteger(d.active_ms) && d.active_ms >= 0 && d.active_ms <= 86400000 &&
      Array.isArray(d.errors) && d.errors.length <= 1 &&
      d.errors.every(category => category === 'validation');
  }
  window.addEventListener('message', event => {
    if (event.origin !== APP_ORIGIN) return;
    const d = event.data;
    if (!d || d.type !== TYPE || d.calculator_id !== id ||
        typeof d.visit !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(d.visit)) return;
    const frame = Array.from(document.querySelectorAll('iframe')).find(frame =>
      matches(frame) && event.source === frame.contentWindow);
    if (!frame) return;
    const r = register(frame);
    if (d.kind === 'hello') {
      if (r.retired.has(d.visit)) return;
      if (r.visit !== d.visit) {
        if (r.visit) r.retired.add(r.visit);
        Object.assign(r, {visit: d.visit, revision: -1, activities: 0, activeMs: 0,
          started: false, result: false, errors: new Set()});
      }
      state(frame, r);
      return;
    }
    if (d.kind !== 'snapshot' || d.visit !== r.visit || !validSnapshot(d)) return;
    if (d.revision <= r.revision) { acknowledge(frame, r); return; }
    if (d.activities < r.activities || d.active_ms < r.activeMs ||
        (r.started && !d.started) || (r.result && !d.result)) return;
    if (typeof window.gtag !== 'function') return; // Child retries; do not consume it yet.
    function emit(name, extra = {}) {
      window.gtag('event', name, {send_to: 'G-N7PESKQC62',
        calculator_id: id, measurement_version: '1', ...extra});
    }
    // Fresh allowlisted parameters only. Never spread a child's state into Google.
    try {
      if (d.started && !r.started) { emit('calculator_start'); r.started = true; }
      if (d.result && !r.result) { emit('calculator_result'); r.result = true; }
      const actions = d.activities - r.activities, milliseconds = d.active_ms - r.activeMs;
      if (actions || milliseconds) {
        emit('calculator_activity', {activity_count: actions, active_msec: milliseconds});
        r.activities = d.activities;
        r.activeMs = d.active_ms;
      }
      for (const category of d.errors) {
        if (!r.errors.has(category)) {
          emit('calculator_error', {error_category: category});
          r.errors.add(category);
        }
      }
      r.revision = d.revision;
      acknowledge(frame, r);
    } catch (_) {
      // Analytics must never interrupt the calculator. Retry only unsent counters.
    }
  });
  function broadcast() {
    for (const [frame, record] of frames) {
      if (!frame.isConnected || !matches(frame)) { frames.delete(frame); continue; }
      if (record.visit) state(frame, record);
    }
  }
  setInterval(broadcast, 1000);
  ['focus', 'blur', 'pageshow'].forEach(name => window.addEventListener(name, broadcast));
  document.addEventListener('visibilitychange', broadcast);
  window.addEventListener('pagehide', () => {
    for (const [frame, record] of frames) {
      frame.contentWindow?.postMessage({type: TYPE, kind: 'state', calculator_id: id,
        visit: record.visit, visible: false}, APP_ORIGIN);
    }
  });
})();
