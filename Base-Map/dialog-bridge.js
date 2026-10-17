/* Optional embedding bridge. Map styling, selections and existing events are unchanged. */
(function () {
  'use strict';
  if (window.parent === window || document.documentElement.dataset.pcsuDialogBridge) return;
  document.documentElement.dataset.pcsuDialogBridge = '1';
  const allowedParents = new Set([
    'https://pcs-united-com.webflow.io',
    'https://pcs-united-com.canvas.webflow.com'
  ]);
  let host = null;
  let ready = false;
  function reply(type, extra = {}) {
    if (!host) return;
    window.parent.postMessage({ source: 'pcsunited-base-map', type,
      channel: host.channel, ...extra }, host.origin);
  }
  window.addEventListener('pcsunited:base-map-ready', () => {
    ready = true;
    reply('pcsunited:map-dialog-status', { ready });
  });
  window.addEventListener('message', event => {
    if(event.data?.source==='pcsunited-base-map-dialog') document.documentElement.dataset.pcsuBridgeProbe=JSON.stringify({origin:event.origin,parent:event.source===window.parent,top:event.source===window.top,channel:event.data.channel,open:event.data.open});
    if (event.source !== window.parent || !allowedParents.has(event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.source !== 'pcsunited-base-map-dialog' ||
        data.type !== 'pcsunited:map-dialog-state' ||
        typeof data.open !== 'boolean' || typeof data.channel !== 'string' ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(data.channel)) return;
    host = { origin: event.origin, channel: data.channel, open: data.open };
    reply('pcsunited:map-dialog-status', { ready });
  });
  document.addEventListener('keydown', event => {
    if(event.key==='Escape') document.documentElement.dataset.pcsuKeyProbe=JSON.stringify({host:!!host,open:host?.open,prevented:event.defaultPrevented});
    if (event.key !== 'Escape' || event.defaultPrevented || !host?.open) return;
    event.preventDefault();
    reply('pcsunited:map-dialog-close');
  });
})();
