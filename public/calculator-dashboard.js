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
    ['refresh', 'period'].forEach(name => { el(name).disabled = value; });
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
  function render(data) {
    const fields=['loads','trackedSessions','trackedResults','trackedAdjustments','trackedActiveSeconds','legacySessions','legacyActiveSeconds'];
    const apps={pt:'PT Calculator',disability:'Disability Rating',va:'VA & Retirement'};
    if(data?.source!=='thewing'||data.schemaVersion!==2||data.storageConnected!==true||!Array.isArray(data.calculators)||data.calculators.length!==3||
       !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error('The reporting service needs the updated files. No totals are being shown.');
    data.calculators.forEach((c,i)=>{
      if(c.id!==['pt','disability','va'][i]||!fields.every(f=>typeof c[f]==='number'&&Number.isFinite(c[f])&&c[f]>=0)||
        !(c.trackedAverageActiveSeconds===null||(Number.isFinite(c.trackedAverageActiveSeconds)&&c.trackedAverageActiveSeconds>=0))||
        !(c.usageRate===null||(Number.isFinite(c.usageRate)&&c.usageRate>=0&&c.usageRate<=1))) {
        throw new Error('The usage report was unexpected. No totals are being shown.');
      }
    });
    el('cards').replaceChildren();
    data.calculators.forEach(c=>{
      const recorded=c.trackedSessions>0,card=node('article','tw-card'),head=node('div','tw-card-header');
      card.dataset.calculator=c.id;
      const badge=node('span','tw-badge',recorded?'Usage recorded':c.loads?'Loaded · no input changes':'No loads recorded');
      badge.dataset.recorded=String(recorded);
      head.append(node('h2','',apps[c.id]),badge);
      const primary=node('div','tw-primary-metric');
      primary.append(node('div','tw-big',number(c.loads)),node('div','tw-label','Calculator loads'),
        node('p','tw-muted','Recorded when calculator tracking connects'));
      const metrics=node('div','tw-metrics');
      metrics.append(metric(number(c.trackedSessions),'Visits with an input change'),metric(number(c.trackedResults),'Visits with an updated result'),
        metric(number(c.trackedAdjustments),'Input changes'),metric(c.usageRate===null?'—':number(c.usageRate*100)+'%','Loads that led to input changes'),
        metric(duration(c.trackedAverageActiveSeconds),'Average active time · used visits'),metric(duration(c.trackedActiveSeconds),'Total estimated active time'));
      const note=c.legacySessions?
        `Earlier tracking: ${number(c.legacySessions)} usage sessions and ${duration(c.legacyActiveSeconds)} active time. Their loads were not recorded, so they are excluded from the numbers above.`:
        'Reloads count as new visits. Your own testing is included. These are visits, not unique people.';
      card.append(head,primary,metrics,node('p','tw-card-note',note));
      el('cards').append(card);
    });
    el('meta').textContent=`Visits started ${data.startDate} to ${data.endDate} (UTC) · Updated ${new Date(data.fetchedAt).toLocaleString()}`;
    el('results').hidden=false;
    status('Connected to TheWing usage storage. Refresh to see new activity.');
  }

  async function load() {
    activeRequest?.abort();
    const controller = new AbortController(); activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    el('results').hidden = true;
    el('cards').replaceChildren();
    status('Loading TheWing usage…'); busy(true);
    try {
      const query = new URLSearchParams({ period: el('period').value });
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
  el('period').addEventListener('change', load);
  load();
})();
