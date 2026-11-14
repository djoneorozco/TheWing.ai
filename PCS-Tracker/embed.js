(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var host = document.createElement('div');
  host.className = 'pcsu-tracker-embed';
  var frame = document.createElement('iframe');
  var url = new URL('./index.html', script.src);
  url.searchParams.set('embed', '1');
  url.searchParams.set('parentOrigin', window.location.origin);
  frame.src = url.href;
  frame.title = 'PCSUnited interactive PCS move planner';
  frame.loading = 'lazy';
  frame.style.cssText = 'display:block;width:100%;height:1500px;border:0;background:#f5f3ed;';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  // Downloads, device storage and the browser print dialog are intentional planner features.
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
  function sendViewport() {
    var rect = frame.getBoundingClientRect();
    frame.contentWindow.postMessage({ type: 'pcsunited:pcs-tracker:viewport', version: 1, top: Math.max(16, 20 - rect.top), height: Math.max(180, window.innerHeight - Math.max(0, rect.top) - 40) }, url.origin);
  }
  var scheduled = false;
  function scheduleViewport() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () { scheduled = false; sendViewport(); });
  }
  window.addEventListener('scroll', scheduleViewport, { passive: true });
  window.addEventListener('resize', scheduleViewport);
  frame.addEventListener('load', sendViewport);
  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow || event.origin !== url.origin) return;
    var data = event.data;
    if (!data || data.type !== 'pcsunited:pcs-tracker:resize' || data.version !== 1 || typeof data.height !== 'number' || !Number.isFinite(data.height)) return;
    frame.style.height = Math.min(200000, Math.max(400, Math.ceil(data.height))) + 'px';
    scheduleViewport();
  });
  host.appendChild(frame);
  script.parentNode.insertBefore(host, script);
})();
