/* Separate Webflow controls; supports a same-page calculator or the hosted iframe. */
(() => {
  'use strict';
  const standalone = document.getElementById('mm-standalone-controls');
  if (standalone && !standalone.children.length) standalone.innerHTML = `<nav class="pcsu-mm-controls" data-mortgage-controls aria-label="Mortgage views"><button type="button" data-mm-select="calculator" aria-pressed="true">Calculator</button><button type="button" data-mm-select="visualization" aria-pressed="false">Visualization</button><button type="button" data-mm-select="summary" aria-pressed="false">Summary</button><p data-mm-controls-status role="status">Loading calculator…</p></nav>`;
  document.querySelectorAll('[data-mortgage-controls]').forEach(nav => {
    if (nav.dataset.initialized) return;
    nav.dataset.initialized = 'true';
    const buttons = [...nav.querySelectorAll('[data-mm-select]')];
    const status = nav.querySelector('[data-mm-controls-status]');
    let frame = null, origin = null, available = false;
    function sync(view) {
      available = true;
      buttons.forEach(b => { b.disabled = false; b.setAttribute('aria-pressed', String(b.dataset.mmSelect === view)); });
      if (status) status.hidden = true;
    }
    function connect() {
      const direct = window.PCSUnitedMortgageViews;
      if (!nav.dataset.targetFrame && direct) { sync(direct.getView()); return; }
      frame = document.getElementById(nav.dataset.targetFrame || 'pcsu-mortgage-frame');
      if (!frame || frame.tagName !== 'IFRAME') return;
      try { origin = new URL(frame.src, location.href).origin; } catch (_) { return; }
      frame.contentWindow?.postMessage({source:'pcsunited-mortgage-controls',type:'get-state'}, origin);
      if (!frame.dataset.mmControlsBound) {
        frame.dataset.mmControlsBound = 'true';
        frame.addEventListener('load', () => {
          available = false; buttons.forEach(b => { b.disabled = true; });
          if (status) { status.hidden = false; status.textContent = 'Loading calculator…'; }
          connect();
        });
      }
    }
    buttons.forEach(button => {
      button.disabled = true;
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!available) return;
        const view = button.dataset.mmSelect;
        if (!nav.dataset.targetFrame && window.PCSUnitedMortgageViews) window.PCSUnitedMortgageViews.setView(view);
        else if (frame && origin) {
          frame.contentWindow?.postMessage({source:'pcsunited-mortgage-controls', type:'set-view',view},origin);
        }
      });
    });
    window.addEventListener('message', e => {
      if (!frame || e.source !== frame.contentWindow || e.origin !== origin || e.data?.source !== 'pcsunited-military-mortgage' || e.data?.type !== 'view-state') return;
      if (!['calculator','visualization','summary'].includes(e.data.view)) return;
      sync(e.data.view);
      const h = e.data.height;
      if (typeof h === 'number' && Number.isFinite(h) && h > 0 && h <= 12000) frame.style.height = `${Math.max(300,Math.ceil(h))}px`;
    });
    window.addEventListener('pcsunited:mortgage-views-ready', connect);
    window.addEventListener('pcsunited:mortgage-view-changed', e => {
      if (!nav.dataset.targetFrame && window.PCSUnitedMortgageViews) sync(e.detail.view);
    });
    // Either embed can appear first in the document.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connect, {once:true});
    connect();
  });
})();
