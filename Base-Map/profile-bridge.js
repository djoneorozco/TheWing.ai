/* Shared PCS profile -> map selection. Existing map messages remain unchanged. */
(function () {
  'use strict';
  if (window.parent === window) return;
  const origins = new Set(['https://pcs-united-com.webflow.io']);
  // Local preview is accepted only when it is the actual embedding page.
  try {
    const referrer = new URL(document.referrer);
    if (['localhost', '127.0.0.1'].includes(referrer.hostname)) origins.add(referrer.origin);
  } catch (_) {}
  const states = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
  const key = value => String(value || '').replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let pending = null;
  function apply() {
    const api = window.PCSU_US_BASE_MAP;
    if (!pending || !api) return;
    const { value, requestId, origin } = pending;
    const bases = states.flatMap(state => api.getStateBases(state));
    const match = value ? bases.find(base => [base.fileName, base.id, base.base, base.name].some(item => key(item) === key(value))) : null;
    // renderState clears stale selections when a base is not in this map's catalog.
    if (!match) api.renderState(api.getCurrentState() || 'TX', '', { scrollCard: false });
    else if (key(api.getSelectedBase()?.fileName) !== key(match.fileName)) api.selectBase(match);
    window.parent.postMessage({
      source: 'pcsunited-base-map', type: 'pcsunited:profile-selection-applied', requestId,
      status: !value ? 'cleared' : match ? 'selected' : 'unsupported',
      fileName: match?.fileName || null
    }, origin);
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !origins.has(event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.source !== 'pcsu-shared-profile' || data.type !== 'pcsunited:base-map-select') return;
    if (data.fileName !== null && (typeof data.fileName !== 'string' || data.fileName.length > 100 || !/^[a-zA-Z0-9 ._-]+\.json$/.test(data.fileName))) return;
    if (typeof data.requestId !== 'string' || data.requestId.length > 100) return;
    pending = { value: data.fileName, requestId: data.requestId, origin: event.origin };
    apply();
  });
  window.addEventListener('pcsunited:base-map-ready', apply);
})();
