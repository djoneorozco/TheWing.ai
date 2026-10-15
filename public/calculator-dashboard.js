(() => {
  'use strict';
  const root = document.getElementById('tw-usage-dashboard');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  // Fixed, read-only aggregate reporting endpoint.
  const endpoint = 'https://thewing.netlify.app/.netlify/functions/calculator-analytics';
  let activeRequest = null;
  const el = name => root.querySelector(`[data-ui="${name}"]`);
  const number = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);
  function duration(seconds) {
    if (seconds === null) return '—';
    if (seconds > 0 && seconds < 1) return '<1s';
    const n = Math.round(seconds);
    if (n < 60) return `${n}s`;
    if (n < 3600) return `${Math.floor(n / 60)}m ${n % 60}s`;
    return `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`;
  }
  function status(message, tone = '') {
    el('status').textContent = message;
    el('status').dataset.tone = tone;
  }
  function busy(value) {
    ['refresh', 'period', 'traffic'].forEach(name => { el(name).disabled = value; });
    root.setAttribute('aria-busy', String(value));
  }
  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function metric(value, label) {
    const box = node('div', 'tw-metric');
    box.append(node('strong', '', value), node('span', '', label));
    return box;
  }
  function validate(data) {
    const fields = ['pageUsers', 'pageViews', 'startedUsers', 'resultUsers', 'starts', 'results', 'adjustments', 'activeSeconds', 'validationEvents'];
    if (!data || !Array.isArray(data.calculators) || data.calculators.length !== 2 ||
        !Array.isArray(data.warnings) || data.warnings.some(x => typeof x !== 'string') ||
        !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('The report format was unexpected. No totals are being shown.');
    data.calculators.forEach((c, i) => {
      if (c.id !== ['pt', 'disability'][i] || !fields.every(f => typeof c[f] === 'number' && Number.isFinite(c[f]) && c[f] >= 0) ||
          (c.averageActiveSeconds !== null && !(Number.isFinite(c.averageActiveSeconds) && c.averageActiveSeconds >= 0)) ||
          typeof c.hasTimeEvents !== 'boolean' || !['recorded', 'no_recorded_usage'].includes(c.status)) {
        throw new Error('The report format was unexpected. No totals are being shown.');
      }
    });
  }
  function render(data) {
    validate(data);
    el('cards').replaceChildren();
    data.calculators.forEach(c => {
      const recorded = c.status === 'recorded';
      const card = node('article', 'tw-card');
      const head = node('div', 'tw-card-header');
      const badge = node('span', 'tw-badge', recorded ? 'Usage recorded' : 'Not yet confirmed');
      badge.dataset.recorded = String(recorded);
      head.append(node('h2', '', c.id === 'pt' ? 'PT Calculator' : 'Disability Rating'), badge);
      const primary = node('div', 'tw-primary-metric');
      primary.append(node('div', 'tw-big', recorded ? number(c.startedUsers) : '—'),
        node('div', 'tw-label', 'People who changed an input'),
        node('p', 'tw-muted', `${number(c.pageUsers)} page visitors recorded`));
      const metrics = node('div', 'tw-metrics');
      metrics.append(metric(recorded ? number(c.resultUsers) : '—', 'People with an updated result'),
        metric(c.hasTimeEvents ? number(c.adjustments) : '—', 'Input adjustments'),
        metric(c.hasTimeEvents ? duration(c.averageActiveSeconds) : '—', 'Active time per starter · estimate'),
        metric(c.hasTimeEvents ? duration(c.activeSeconds) : '—', 'Total estimated active time'));
      const note = recorded
        ? `${number(c.starts)} starts · ${number(c.results)} result events · ${number(c.validationEvents)} validation events. Reloading can produce another start or result for the same person.`
        : 'No usage events returned for this selection. Check tracking, filters, consent, and processing before treating this as non-use.';
      card.append(head, primary, metrics, node('p', 'tw-card-note', note));
      el('cards').append(card);
    });
    el('meta').textContent = `Report fetched ${new Date(data.fetchedAt).toLocaleString()} · GA4 reporting time zone: ${data.timeZone || 'not supplied'} · Fetch time is not a data-completeness timestamp.`;
    el('results').hidden = false;
    status(data.warnings.join(' '));
  }
  async function load() {
    activeRequest?.abort();
    const controller = new AbortController(); activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    el('results').hidden = true;
    el('cards').replaceChildren();
    status('Loading the selected GA4 report…'); busy(true);
    try {
      const query = new URLSearchParams({ period: el('period').value, traffic: el('traffic').value });
      const response = await fetch(`${endpoint}?${query}`, { method: 'GET',
        cache: 'no-store', credentials: 'omit', signal: controller.signal });
      const data = await response.json();
      if (activeRequest !== controller) return;
      if (!response.ok) {
        throw new Error(typeof data.message === 'string' ? data.message : 'The report is unavailable. No totals are being shown.');
      }
      render(data);
    } catch (error) {
      if (activeRequest !== controller) return;
      el('results').hidden = true;
      status(error.name === 'AbortError' ? 'The report timed out. Try again later.' :
        (error instanceof TypeError || error instanceof SyntaxError) ? 'Cannot reach the reporting service. Check deployment and try again.' : error.message, 'error');
    } finally {
      clearTimeout(timeout);
      if (activeRequest === controller) { busy(false); activeRequest = null; }
    }
  }
  el('refresh').addEventListener('click', load);
  ['period', 'traffic'].forEach(name => el(name).addEventListener('change', load));
  load();
})();
