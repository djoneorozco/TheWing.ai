/* Read-only handoff of the calculator's current result to its trusted host. */
(() => {
  'use strict';
  const allowed = origin => ['https://pcs-united-com.webflow.io','https://pcsunited.com','https://www.pcsunited.com'].includes(origin)
    || (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  let origin = null;
  try { const ref = new URL(document.referrer).origin; if (allowed(ref)) origin = ref; } catch (_) {}
  function send() {
    if (!origin || parent === window) return;
    const snapshot = window.PCSUnitedMilitaryMortgage?.getInputs();
    parent.postMessage({source:'pcsu-mortgage-budget',version:1,type:'pcsu:mortgage-budget-state',snapshot:snapshot || null}, origin);
  }
  window.addEventListener('pcsunited:financial-input-updated', send);
  window.addEventListener('message', event => {
    if (event.source !== parent || !allowed(event.origin) || event.data?.source !== 'pcsu-finance-host'
      || event.data.version !== 1 || event.data.type !== 'pcsu:mortgage-budget-request') return;
    origin = event.origin; send();
  });
  send();
})();
