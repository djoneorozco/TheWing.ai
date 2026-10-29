// Public, memory-only presentation layer. Pay and mortgage math stay in the existing APIs.
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const money = (value, cents = false) => number(value)
  ? value.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:cents ? 2 : 0, minimumFractionDigits:cents ? 2 : 0})
  : 'Unavailable';
const firstNumber = (...values) => values.find(number);
const firstText = (...values) => values.find(v => typeof v === 'string' && v.trim()) || '';

export function parseSelection(params) {
  const rank = (params.get('rank') || '').toUpperCase().replace('-', '');
  const rawYos = params.get('yos'), rawFamily = params.get('family');
  const yos = Number(rawYos), family = Number(rawFamily);
  const base = params.get('base') || '', cityKey = params.get('cityKey') || '';
  if (!/^(E[1-9]|O(?:[1-9]|10)|W[1-5])$/.test(rank) || !rawYos?.trim() ||
      !Number.isInteger(yos) || yos < 0 || yos > 40 || !rawFamily?.trim() ||
      !Number.isInteger(family) || family < 1 || family > 20 ||
      !/^[A-Za-z][A-Za-z0-9.-]{0,63}$/.test(cityKey) || cityKey.includes('..') ||
      normalize(base.replace(/\s+(AFB|SFB|Field)$/i, '')) !== normalize(cityKey)) {
    throw new Error('Choose a valid rank, years of service, family size and destination, then select Analyze.');
  }
  if (params.has('baseFile') && params.get('baseFile') !== cityKey + '.json') throw new Error('Destination details do not match. Select Analyze again.');
  const hasDependents = family >= 2;
  if (params.has('hasDependents') && params.get('hasDependents') !== String(hasDependents)) throw new Error('Family size and dependent status do not match. Select Analyze again.');
  return {rank, yos, family, hasDependents, base, cityKey, newZip:params.get('newZip') || ''};
}

export function validatedParentOrigin(raw, referrer, ownOrigin) {
  if (!raw) return null;
  try {
    const url = new URL(raw), own = new URL(ownOrigin);
    const local = host => ['localhost', '127.0.0.1', '[::1]'].includes(host);
    const allowed = new Set(['https://pcsunited.com', 'https://www.pcsunited.com', 'https://pcs-united-com.webflow.io', own.origin]);
    if (url.origin !== raw || url.username || url.password ||
        !(url.protocol === 'https:' || (url.protocol === 'http:' && local(url.hostname) && local(own.hostname))) ||
        !(allowed.has(raw) || (local(url.hostname) && local(own.hostname)))) return null;
    if (referrer && new URL(referrer).origin !== raw) return null;
    return raw;
  } catch { return null; }
}

export function readCompensation(response, selection) {
  const p = response?.payload, m = p?.compensation?.monthly, profile = p?.profile;
  if (response?.ok !== true || p?.tool !== 'PCS_SNAPSHOT' || p?.compensation?.ok !== true ||
      !m || ![m.basicPay, m.bah, m.bas, m.grossMonthlyComp].every(number) || m.grossMonthlyComp <= 0 ||
      Math.abs(m.basicPay + m.bah + m.bas - m.grossMonthlyComp) > 0.02 ||
      normalize(profile?.rank) !== normalize(selection.rank) || profile?.yos !== selection.yos ||
      profile?.hasDependents !== selection.hasDependents || normalize(profile?.base) !== normalize(selection.base)) {
    throw new Error('Compensation data could not be verified for this selection. Please retry.');
  }
  return {monthly:m, versions:p.sourceVersions || {}, payRecord:p.payRecord, bahRecord:p.bahRecord};
}

export function mortgageRequest(city, bedrooms, bah) {
  const row = city?.by_bedroom?.[bedrooms], a = city?.mortgage_assumptions;
  const price = firstNumber(row?.home_price?.avg, row?.home_price);
  const taxPercent = firstNumber(city?.property_tax_rate_percent, city?.ownership_costs?.property_tax_rate_percent);
  const taxRate = firstNumber(city?.property_tax_rate, city?.ownership_costs?.property_tax_rate);
  const insPercent = firstNumber(city?.insurance_rate_percent, city?.ownership_costs?.insurance_rate_percent);
  const insRate = firstNumber(city?.insurance_rate, city?.ownership_costs?.insurance_rate_estimate);
  const hoa = firstNumber(city?.hoa_monthly, city?.ownership_costs?.hoa_monthly_default);
  if (!['2','3','4','5'].includes(String(bedrooms)) || !(price > 0) ||
      ![a?.apr_percent, a?.term_years, a?.down_payment_percent, hoa, bah].every(number) ||
      a.term_years < 1 || a.term_years > 40 || a.down_payment_percent > 100 ||
      (taxPercent === undefined && taxRate === undefined) || (insPercent === undefined && insRate === undefined)) return null;
  return {
    price, interestRate:a.apr_percent, termYears:a.term_years, downPct:a.down_payment_percent,
    ...(taxPercent !== undefined ? {propertyTaxPercent:taxPercent} : {propertyTaxRate:taxRate}),
    ...(insPercent !== undefined ? {insurancePercent:insPercent} : {insuranceRate:insRate}),
    hoaMonthly:hoa, loanType:'va', priorUse:'first_use', fundingFeeExempt:false, financeFundingFee:true,
    // Use the shared budget engine for the BAH-only difference; this is not take-home pay.
    takeHomeMonthly:bah, otherExpensesMonthly:0
  };
}

export function readMortgage(response) {
  const m = response?.monthly, b = response?.budget;
  if (response?.ok !== true || response?.meta?.vaOverlayApplied !== true ||
      !m || ![m.principalInterest,m.propertyTax,m.insurance,m.hoa,m.pmi,m.allIn].every(number) || m.allIn <= 0 ||
      Math.abs(m.principalInterest + m.propertyTax + m.insurance + m.hoa + m.pmi - m.allIn) > 0.03 ||
      b?.complete !== true || !Number.isFinite(b.remainder)) throw new Error('Housing estimate could not be verified. Please retry.');
  return response;
}

export function balanceText(remainder) {
  if (!Number.isFinite(remainder)) return 'BAH balance unavailable';
  if (Math.abs(remainder) < 0.5) return 'BAH matches the estimated housing cost';
  return remainder < 0 ? `${money(-remainder)}/month beyond BAH` : `${money(remainder)}/month of BAH remaining`;
}

async function fetchJSON(url, {body, signal} = {}) {
  const response = await fetch(url, {method:body ? 'POST' : 'GET', credentials:'omit', cache:'no-store', signal,
    ...(body ? {headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {})});
  if (!response.ok) throw new Error('The data service is unavailable. Please retry shortly.');
  return response.json();
}

function startBrief() {
  const $ = id => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = value; };
  const params = new URLSearchParams(location.search);
  const payView = params.get('view') !== 'full';
  document.body.classList.toggle('pay-view', payView);
  $('pay-toolbar').hidden = !payView;
  $('pay-info').hidden = !payView;
  if (payView) {
    $('pay-notes').append($('sources'));
    $('sources').open = true;
    $('city-source').hidden = true; $('city-data').hidden = true;
    const standalone = new URL(location.href);
    standalone.searchParams.delete('parentOrigin'); standalone.searchParams.delete('requestId');
    $('brief-open').href = standalone.href;
  }
  $('pay-info').addEventListener('click', () => $('pay-notes').showModal());
  // The deferred shared script can initialize before or after this module.
  // A cached API response must still wait until its real widget is mounted.
  function headerReady(signal) {
    if (window.PCSU_BAH_HEADER) return Promise.resolve(window.PCSU_BAH_HEADER);
    return new Promise((resolve, reject) => {
      const cleanup = () => { window.removeEventListener('pcsunited:bah-header-ready', done); signal.removeEventListener('abort', abort); };
      const done = () => { cleanup(); resolve(window.PCSU_BAH_HEADER); };
      const abort = () => { cleanup(); reject(new Error('The pay header could not load. Please retry shortly.')); };
      window.addEventListener('pcsunited:bah-header-ready', done, {once:true});
      signal.addEventListener('abort', abort, {once:true});
      if (signal.aborted) abort();
    });
  }
  const parentOrigin = validatedParentOrigin(params.get('parentOrigin'), document.referrer, location.origin);
  const requestId = params.get('requestId') || '';
  let selection, city, compensation, run = 0, housingRun = 0, controller, housingController, ready = false, resizePending = false;
  function send(type, state) {
    if (window.parent === window || !parentOrigin || !/^[\w-]{1,160}$/.test(requestId)) return;
    window.parent.postMessage({source:'pcsu-snapshot-brief', type, requestId, ...(state ? {state} : {}),
      height:Math.ceil($('brief').getBoundingClientRect().height)}, parentOrigin);
  }
  function resize() {
    if (!ready || resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; if (ready) send('pcsu:brief-resize'); });
  }
  function renderPay() {
    const m = compensation.monthly;
    text('base-name', selection.base);
    text('profile', `${selection.rank.replace(/^([EOW])/, '$1-')} · ${selection.yos} years of service · Family of ${selection.family}`);
    text('total-pay', money(m.grossMonthlyComp, true));
    text('base-pay', money(m.basicPay, true)); text('bah', money(m.bah, true)); text('bas', money(m.bas, true));
    const p = m.basicPay / m.grossMonthlyComp * 100, b = (m.basicPay + m.bah) / m.grossMonthlyComp * 100;
    $('pay-donut').style.background = `conic-gradient(#24495d 0 ${p}%, #248576 ${p}% ${b}%, #dbaf60 ${b}% 100%)`;
    $('pay-donut').setAttribute('aria-label', `Monthly compensation: Base Pay ${money(m.basicPay, true)}, BAH ${money(m.bah, true)}, BAS ${money(m.bas, true)}.`);
    text('pay-source', `Pay source: ${compensation.versions.payVersion || 'version unavailable'}. BAH source: ${compensation.versions.bahVersion || 'version unavailable'}.`);
    text('family-assumption', `Family-size assumption: 1 person = without dependents; 2 or more = with dependents. This brief uses ${selection.hasDependents ? 'with' : 'without'} dependents.`);
  }
  function renderDestination() {
    text('destination-heading', firstText(city.place_detail, city.city, city.place, city.market_label) || 'Location unavailable');
    text('market-date', 'Market data: ' + (firstText(city.market_metrics?.as_of, city.metrics?.as_of, city.last_updated_data_from_sources) || 'date unavailable'));
    text('market-brief', firstText(city.financial_brief?.affordability_summary, city.market_bluf?.bluf_summary, city.market_bluf?.summary) || 'A local market brief is not available for this destination.');
    const median = firstNumber(city.snapshot?.median_home_price, city.market_metrics?.median_sold_price, city.market_metrics?.median_sale_price, city.housing?.market?.median_home_price);
    text('median-price', money(median));
    const highlights = [
      firstText(city.school_quality?.off_base, city.school_quality?.on_base),
      firstText(city.ownership_costs?.notes?.[0], city.risks?.[0], city.summary_points?.[0])
    ];
    $('highlights').replaceChildren(...highlights.map((value, i) => {
      const li = document.createElement('li'); li.textContent = value || `${i === 0 ? 'School' : 'Local cost'} information unavailable.`; return li;
    }));
    text('city-source', `${firstText(city.sources?.home_price?.provider) || 'Existing PCSUnited destination dataset'}. Market figures are dated planning data, not live listings.`);
    $('city-data').href = `/netlify/functions/cities/${encodeURIComponent(selection.cityKey)}.json`;
    const img = $('destination-image'); img.hidden = true; img.removeAttribute('src'); $('image-note').hidden = true;
    try {
      const source = new URL(firstText(city.image_url, city.base_image_url));
      if (source.protocol !== 'https:') throw new Error('Unsupported image');
      img.onload = () => { img.hidden = false; $('image-note').hidden = true; resize(); };
      img.onerror = () => { img.hidden = true; $('image-note').hidden = false; resize(); };
      img.alt = firstText(city.place_detail, city.city, selection.base); img.src = source.href;
    } catch { $('image-note').hidden = false; }
  }
  function renderHousing(result, request) {
    const m = result.monthly;
    // allIn ALREADY includes taxes, insurance, HOA and PMI. Never add city mortgage_monthly.
    text('housing-cost', money(m.allIn));
    const coverage = compensation.monthly.bah / m.allIn * 100;
    text('coverage', `${Math.round(coverage)}% BAH coverage`);
    $('coverage-bar').style.width = `${Math.min(100, coverage)}%`;
    text('balance', balanceText(result.budget.remainder)); $('balance').dataset.shortfall = String(result.budget.remainder < -0.5);
    const priceDate = city.by_bedroom?.[$('bedrooms').value]?.home_price?.as_of || 'date unavailable';
    text('housing-assumptions', `${$('bedrooms').value}-bedroom planning price ${money(request.price)} (${priceDate}); ${request.termYears}-year VA purchase scenario, ${request.interestRate}% fixed interest rate, ${request.downPct}% down. Assumes first VA use, no funding-fee exemption, and ${money(result.financedFundingFee, true)} funding fee financed into the loan. These assumptions are not a statement of your eligibility or fee status. ${firstText(city.mortgage_assumptions?.defaults_note)}`);
    const rows = [['Principal & interest',m.principalInterest],['Property tax',m.propertyTax],['Home insurance',m.insurance],['HOA',m.hoa],['Monthly PMI (VA)',m.pmi],['Total per month',m.allIn]];
    $('housing-breakdown').replaceChildren(...rows.map(([label,value]) => {
      const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = money(value, true); div.append(dt,dd); return div;
    }));
  }
  async function loadHousing(initial = false) {
    const current = ++housingRun;
    housingController?.abort(); housingController = new AbortController();
    const activeController = housingController;
    const signal = initial ? AbortSignal.any([activeController.signal, controller.signal]) : activeController.signal;
    const timeout = setTimeout(() => activeController.abort(), 18000);
    // Preserve the panel footprint during a retry so iframe resizing cannot move
    // a focused/clicked control out from under the user while loading or failing.
    $('housing-panel').style.minHeight = initial ? '' : `${$('housing-panel').getBoundingClientRect().height}px`;
    $('housing-result').hidden = true; $('housing-retry').hidden = true;
    text('housing-status', 'Calculating this bedroom estimate…');
    const request = mortgageRequest(city, $('bedrooms').value, compensation.monthly.bah);
    try {
      if (!request) { $('housing-panel').style.minHeight = ''; text('housing-status', 'Housing estimate unavailable: this bedroom’s price or financing assumptions are missing from the destination data. Try another bedroom size.'); return; }
      const result = readMortgage(await fetchJSON('/api/mortgage', {body:request, signal}));
      if (current !== housingRun || signal.aborted) return;
      renderHousing(result, request); text('housing-status', ''); $('housing-result').hidden = false;
    } catch (error) {
      if (current !== housingRun) return;
      if (initial) throw new Error('Housing data could not load. Please retry the brief.');
      text('housing-status', 'Housing estimate could not load. Retry or select another bedroom size.'); $('housing-retry').hidden = false;
    } finally {
      clearTimeout(timeout);
      if (current === housingRun && !$('housing-result').hidden) $('housing-panel').style.minHeight = '';
      resize();
    }
  }
  async function load() {
    const current = ++run;
    controller?.abort(); housingController?.abort(); ++housingRun;
    controller = new AbortController(); const signal = controller.signal;
    const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), 26000);
    ready = false; $('result').hidden = true; $('retry').hidden = true; $('app-status').hidden = false;
    text('app-status', payView ? 'Preparing your monthly compensation…' : 'Preparing your compensation, destination and housing brief…');
    try {
      selection = parseSelection(params);
      if (window.parent !== window && (!parentOrigin || !/^[\w-]{1,160}$/.test(requestId))) throw new Error('This embed connection could not be verified. Open the brief from PCSUnited and select Analyze again.');
      const [pay, destination] = await Promise.all([
        fetchJSON('/api/opensource-brain', {body:{tool:'PCS_SNAPSHOT', input:{rank:selection.rank, yos:selection.yos, base:selection.base, hasDependents:selection.hasDependents}}, signal}),
        payView ? null : fetchJSON(`/netlify/functions/cities/${encodeURIComponent(selection.cityKey)}.json`, {signal})
      ]);
      if (current !== run || signal.aborted) return;
      compensation = readCompensation(pay, selection);
      renderPay();
      if (payView) {
        const header = await headerReady(signal);
        if (current !== run || signal.aborted) return;
        const m = compensation.monthly;
        const painted = header.setSnapshot({basePay:m.basicPay, bah:m.bah, bas:m.bas, total:m.grossMonthlyComp,
          rank:selection.rank.replace(/^([EOW])/, '$1-'), yos:`${selection.yos} years`,
          location:selection.base, dependents:selection.hasDependents ? 'With dependents' : 'Without dependents'});
        if (!painted) throw new Error('The pay header could not be displayed. Please retry.');
      } else {
        if (!destination || typeof destination !== 'object' || Array.isArray(destination) || (!destination.city && !destination.place)) throw new Error('Destination data could not be verified. Please retry.');
        city = destination; renderDestination();
        await loadHousing(true);
      }
      if (current !== run || signal.aborted) return;
      $('result').hidden = false; $('app-status').hidden = true; ready = true;
      send('pcsu:brief-status', 'ready'); resize();
    } catch (error) {
      if (current !== run) return;
      controller.abort(); housingController?.abort();
      text('app-status', error.name === 'AbortError' ? 'The request timed out. Please retry shortly.' : error.message || 'The brief could not load. Please retry.');
      $('retry').hidden = false; send('pcsu:brief-status', 'error');
    } finally { clearTimeout(timeout); }
  }
  $('retry').addEventListener('click', load);
  $('bedrooms').addEventListener('change', () => loadHousing());
  $('housing-retry').addEventListener('click', () => loadHousing());
  new ResizeObserver(resize).observe($('brief'));
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => { ++run; ++housingRun; ready = false; controller?.abort(); housingController?.abort(); });
  // No URL selection means no API call, no default base, and no readiness message.
  if (params.has('rank') || params.has('base') || params.has('requestId')) load();
}

if (typeof document !== 'undefined') startBrief();
