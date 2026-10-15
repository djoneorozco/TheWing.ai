/* TheWing calculator usage v2. No Google tag, cookies, storage, or input payloads.
 * Loaded before each calculator. The approved parent saves usage to Netlify.
 */
(() => {
  'use strict';
  if (window.TheWingCalculatorUsage) return;
  const PARENTS = new Set(['https://thewing.ai', 'https://www.thewing.ai']);
  const TYPE = 'thewing:usage:v1';
  const IDLE_MS = 30000;
  window.TheWingCalculatorUsage = Object.freeze({
    create({id, root, controls, buttons = '', asyncResults = false}) {
      const noop = Object.freeze({rendered() {}, calculationStarted() {}});
      if (!['pt', 'disability', 'va'].includes(id) || !root || window.parent === window) return noop;
      let parentOrigin;
      try { parentOrigin = new URL(document.referrer).origin; } catch (_) { return noop; }
      if (!PARENTS.has(parentOrigin)) return noop;

      const visit = crypto.randomUUID(); // Anonymous per-document ID for usage deduplication; no cross-visit identity.
      let revision = 1, acknowledged = -1;
      let started = false, result = false, activities = 0, activeMs = 0;
      let reportedMs = 0, lastActivity = -Infinity, lastTick = performance.now();
      let parentVisible = false, parentSeen = -Infinity;
      let valid = false, renderRevision = 0, pendingIntent = false, lastIntentSignature = null;
      let burst = false, commitTimer = null;
      const errors = new Set();

      // Inputs exist only in ephemeral comparison state. Never serialize this to messages.
      function signature() {
        return JSON.stringify(Array.from(root.querySelectorAll(controls), el =>
          el.type === 'checkbox' ? el.checked : el.value));
      }
      let previous = signature();

      function send(kind) {
        const message = {type: TYPE, kind, calculator_id: id, visit};
        if (kind === 'snapshot') Object.assign(message, {
          revision, started, result, activities,
          active_ms: Math.floor(activeMs), errors: Array.from(errors)
        });
        window.parent.postMessage(message, parentOrigin);
      }
      function publish() {
        revision++;
        reportedMs = Math.floor(activeMs);
        send('snapshot');
      }
      function clock() {
        const now = performance.now();
        // Count only a recent-input, visible, focused interval, with a live parent.
        // Cap long scheduling gaps: a sleeping device must not accrue usage time.
        const end = Math.min(now, lastActivity + IDLE_MS, parentSeen + 2500);
        if (started && parentVisible && document.visibilityState === 'visible') {
          activeMs += Math.max(0, Math.min(2000, end - lastTick));
        }
        lastTick = now;
      }
      function attention(event) {
        if (!event.isTrusted || !started) return;
        clock();
        lastActivity = performance.now();
      }
      function commit() {
        clearTimeout(commitTimer);
        commitTimer = null;
        if (!burst) return;
        burst = false;
        activities++;
        if (valid) result = true;
        else errors.add('validation');
        clock();
        publish();
      }
      function intent(event) {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        const relevant = event.type === 'click'
          ? buttons && event.target.closest(buttons)
          : event.target.matches(controls);
        if (!relevant) return;
        const beforeRender = renderRevision;
        pendingIntent = true;
        // A timer runs after all native input/change listeners, unlike a microtask
        // which browsers may run between the capture and target listeners.
        setTimeout(() => {
          pendingIntent = false;
          const next = signature();
          // A trusted click alone is insufficient: calculation inputs must change.
          if (next !== previous) {
            if (!asyncResults && renderRevision === beforeRender) valid = false;
            previous = next;
            lastIntentSignature = next;
            clock();
            lastActivity = performance.now();
            burst = true;
            if (!started) { started = true; publish(); }
            clearTimeout(commitTimer);
            commitTimer = setTimeout(commit, 600);
          }
          if (event.type !== 'input') commit();
        }, 0);
      }
      ['input', 'change', 'click'].forEach(name => root.addEventListener(name, intent, true));
      ['pointerdown', 'keydown', 'input', 'wheel', 'touchmove'].forEach(name =>
        root.addEventListener(name, attention, {capture: true, passive: true}));

      window.addEventListener('message', event => {
        if (event.origin !== parentOrigin || event.source !== window.parent) return;
        const d = event.data;
        if (!d || d.type !== TYPE || d.visit !== visit || d.calculator_id !== id) return;
        if (d.kind === 'state') {
          clock();
          parentVisible = d.visible === true;
          parentSeen = performance.now();
          if (!parentVisible) {
            commit();
            if (Math.floor(activeMs) > reportedMs) publish();
          }
          if (acknowledged < revision) send('snapshot');
        } else if (d.kind === 'ack' && Number.isSafeInteger(d.revision)) {
          acknowledged = Math.max(acknowledged, Math.min(revision, d.revision));
        }
      });
      function flush() {
        clock();
        commit();
        if (Math.floor(activeMs) > reportedMs) publish();
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') flush();
        else lastTick = performance.now();
      });
      window.addEventListener('pagehide', flush);
      window.addEventListener('pageshow', () => { lastTick = performance.now(); send('hello'); });
      setInterval(() => {
        clock();
        if (activeMs - reportedMs >= 15000 ||
            (performance.now() >= lastActivity + IDLE_MS && activeMs - reportedMs >= 1000)) publish();
        // A bounded, cumulative snapshot is retried until the parent accepts it.
        // The timer sends no analytics event when there is no new activity/time.
        if (performance.now() - parentSeen > 2000) send('hello');
        else if (acknowledged < revision) send('snapshot');
      }, 1000);
      send('hello');
      return Object.freeze({
        calculationStarted() {
          valid = false;
          // Local-only token ties an async response to its inputs, never transmitted.
          return signature();
        },
        rendered(isValid, inputSignature) {
          if (asyncResults && inputSignature !== signature()) return;
          renderRevision++;
          valid = isValid === true;
          if (asyncResults && started && valid && inputSignature === lastIntentSignature && !result) {
            result = true;
            publish();
          }
          // Programmatic initialization/recalculation never establishes user intent.
          if (!pendingIntent) previous = signature();
        }
      });
    }
  });
})();
