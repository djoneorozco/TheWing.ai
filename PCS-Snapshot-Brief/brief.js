// Public, memory-only presentation layer. Pay and mortgage math stay in the existing APIs.
const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const money = (value, cents = false) => number(value)
  ? value.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:cents ? 2 : 0, minimumFractionDigits:cents ? 2 : 0})
  : 'Unavailable';
const firstNumber = (...values) => values.find(number);
const firstText = (...values) => values.find(v => typeof v === 'string' && v.trim()) || '';
const firstFinite = (...values) => values.find(v => typeof v === 'number' && Number.isFinite(v));

// The same city JSON fields used by PCS-Snapshot, without its sample fallbacks.
export function cityIntelligence(c) {
  return {
    population:firstNumber(c.population?.city,c.population?.estimate,c.demographics?.population?.city,c.snapshot?.population_city,c.snapshot?.population),
    metro:firstNumber(c.population?.metro,c.demographics?.population?.metro,c.snapshot?.population_metro,c.snapshot?.metro_population),
    income:firstNumber(c.income?.median_household_income,c.demographics?.income?.median_household_income,c.snapshot?.median_household_income,c.snapshot?.median_income),
    median:firstNumber(c.housing?.market?.median_home_price,c.market_metrics?.median_sold_price,c.market_metrics?.median_sale_price,c.metrics?.median_sold_price,c.snapshot?.median_home_price),
    trend:firstFinite(c.housing?.market?.yoy_change,c.housing?.market?.zillow_one_year_change_percent,c.market_metrics?.yoy_change,c.market_metrics?.zillow_one_year_change_percent,c.snapshot?.market_trend_yoy,c.snapshot?.yoy_change),
    traffic:firstText(c.scorecard?.traffic,c.snapshot?.traffic_level,c.commute_intelligence?.traffic),
    employment:firstText(c.scorecard?.employment,c.snapshot?.employment_status,c.labor?.employment_status),
    headline:firstText(c.market_bluf?.headline,c.market_bluf?.bluf_headline,c.financial_brief?.market_headline,c.snapshot?.market_headline),
    summary:firstText(c.market_bluf?.summary,c.market_bluf?.bluf_summary,c.financial_brief?.market_summary,c.financial_brief?.affordability_summary,c.snapshot?.market_summary)
  };
}

export function utilityEstimate(city, bedrooms) {
  const row = city?.by_bedroom?.[bedrooms];
  return firstNumber(row?.utilities?.total?.avg,row?.utilities?.total,row?.utilities?.avg,row?.utilities,row?.utilities_monthly?.avg,row?.utilities_monthly);
}

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

export function mortgageRequest(city, bedrooms, bah, {includeUtilities = false} = {}) {
  const row = city?.by_bedroom?.[bedrooms], a = city?.mortgage_assumptions;
  const price = firstNumber(row?.home_price?.avg, row?.home_price);
  const taxPercent = firstNumber(city?.property_tax_rate_percent, city?.ownership_costs?.property_tax_rate_percent);
  const taxRate = firstNumber(city?.property_tax_rate, city?.ownership_costs?.property_tax_rate);
  const insPercent = firstNumber(city?.insurance_rate_percent, city?.ownership_costs?.insurance_rate_percent);
  const insRate = firstNumber(city?.insurance_rate, city?.ownership_costs?.insurance_rate_estimate);
  const hoa = firstNumber(city?.hoa_monthly, city?.ownership_costs?.hoa_monthly_default);
  const utilities = includeUtilities ? utilityEstimate(city, bedrooms) : 0;
  if (!['2','3','4','5'].includes(String(bedrooms)) || !(price > 0) ||
      ![a?.apr_percent, a?.term_years, a?.down_payment_percent, hoa, bah, utilities].every(number) ||
      a.term_years < 1 || a.term_years > 40 || a.down_payment_percent > 100 ||
      (taxPercent === undefined && taxRate === undefined) || (insPercent === undefined && insRate === undefined)) return null;
  return {
    price, interestRate:a.apr_percent, termYears:a.term_years, downPct:a.down_payment_percent,
    ...(taxPercent !== undefined ? {propertyTaxPercent:taxPercent} : {propertyTaxRate:taxRate}),
    ...(insPercent !== undefined ? {insurancePercent:insPercent} : {insuranceRate:insRate}),
    hoaMonthly:hoa, loanType:'va', priorUse:'first_use', fundingFeeExempt:false, financeFundingFee:true,
    // Use the shared budget engine for the BAH-only difference; this is not take-home pay.
    takeHomeMonthly:bah, otherExpensesMonthly:utilities
  };
}

export function readMortgage(response, request) {
  const m = response?.monthly, b = response?.budget;
  if (response?.ok !== true || response?.meta?.vaOverlayApplied !== true ||
      !m || ![m.principalInterest,m.propertyTax,m.insurance,m.hoa,m.pmi,m.allIn].every(number) || m.allIn <= 0 ||
      Math.abs(m.principalInterest + m.propertyTax + m.insurance + m.hoa + m.pmi - m.allIn) > 0.03 ||
      b?.complete !== true || !Number.isFinite(b.remainder)) throw new Error('Housing estimate could not be verified. Please retry.');
  if (request && (!number(b.totalOutflow) || b.income !== request.takeHomeMonthly || b.expenses !== request.otherExpensesMonthly ||
      Math.abs(b.totalOutflow - m.allIn - request.otherExpensesMonthly) > 0.02 ||
      Math.abs(b.remainder - (request.takeHomeMonthly - b.totalOutflow)) > 0.02)) throw new Error('Housing costs could not be reconciled. Please retry.');
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
  const view = params.get('view') || 'brief';
  const payView = view !== 'full';
  const withDetails = view !== 'pay', overview = payView && withDetails;
  document.body.classList.toggle('pay-view', payView);
  document.body.classList.toggle('overview-view', overview);
  $('pay-toolbar').hidden = !payView;
  $('pay-info').hidden = !payView;
  if (payView) {
    $('pay-notes').append($('sources'));
    $('sources').open = true;
    $('city-source').hidden = true; $('city-data').hidden = true;
  }
  $('pay-info').addEventListener('click', () => $('pay-notes').showModal());
  $('city-info').addEventListener('click', () => $('city-notes').showModal());
  $('housing-info').addEventListener('click', () => $('housing-notes').showModal());
  if (overview) {
    $('housing-notes').append($('housing-details')); $('housing-details').open = true;
    $('housing-info').hidden = false;
  }
  const parentOrigin = validatedParentOrigin(params.get('parentOrigin'), document.referrer, location.origin);
  const requestId = params.get('requestId') || '';
  let selection, city, compensation, run = 0, housingRun = 0, controller, housingController, ready = false, resizePending = false;
  function send(type, state) {
    if (window.parent === window || !parentOrigin || !/^[\w-]{1,160}$/.test(requestId)) return;
    window.parent.postMessage({source:'pcsu-snapshot-brief', type, requestId, ...(state ? {state} : {}),
      ...(state === 'ready' ? {selection, monthly:{basicPay:compensation.monthly.basicPay,
        bah:compensation.monthly.bah, bas:compensation.monthly.bas,
        grossMonthlyComp:compensation.monthly.grossMonthlyComp}} : {}),
      height:Math.ceil($('brief').getBoundingClientRect().height)}, parentOrigin);
  }
  function resize() {
    if (!ready || resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => { resizePending = false; if (ready) send('pcsu:brief-resize'); });
  }
  function renderPay() {
    const m = compensation.monthly;
    text('brief-profile', `${selection.base} · ${selection.rank.replace(/^([EOW])/, '$1-')} · ${selection.yos} years · ${selection.family} ${selection.family === 1 ? 'person' : 'people'}`);
    // Only hand off the user's supplied destination/profile to the existing app.
    // Never forward Brief credentials, view mode, or invent a current duty station.
    const snapshot = new URL('/PCS-Snapshot/index.html', location.origin);
    const handoff = {rank:selection.rank,yos:selection.yos,family:selection.family,
      hasDependents:selection.hasDependents,newBase:selection.base,newCityKey:selection.cityKey,
      newFileKey:selection.cityKey,newZip:selection.newZip,type:'ad'};
    Object.entries(handoff).forEach(([key,value]) => snapshot.searchParams.set(key,String(value)));
    $('brief-open').href = snapshot.href;
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
    const info = cityIntelligence(city);
    const compact = value => number(value) ? new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value) : 'Unavailable';
    text('destination-heading', firstText(city.place_detail, city.city, city.place, city.market_label) || 'Location unavailable');
    text('destination-base', selection.base);
    text('market-date', 'Market data: ' + (firstText(city.market_metrics?.as_of, city.metrics?.as_of, city.last_updated_data_from_sources) || 'date unavailable'));
    text('market-headline', info.headline || 'Market brief unavailable');
    text('market-brief', info.summary || 'A local market brief is not available for this destination.');
    text('market-full', info.summary || 'A local market brief is not available for this destination.');
    text('median-price', money(info.median)); text('city-income', money(info.income));
    text('city-population', compact(info.population)); text('metro-population', `Metro: ${compact(info.metro)}`);
    text('city-trend', Number.isFinite(info.trend) ? `${info.trend > 0 ? '+' : ''}${info.trend.toFixed(1)}%` : 'Unavailable');
    text('trend-label', 'Year over year'); text('city-traffic', info.traffic || 'Unavailable'); text('city-employment', info.employment || 'Unavailable');
    const highlights = [
      firstText(city.school_quality?.off_base, city.school_quality?.on_base),
      firstText(city.ownership_costs?.notes?.[0], city.risks?.[0], city.summary_points?.[0])
    ];
    $('highlights').replaceChildren(...highlights.map((value, i) => {
      const li = document.createElement('li'); li.textContent = value || `${i === 0 ? 'School' : 'Local cost'} information unavailable.`; return li;
    }));
    text('city-source', `${firstText(city.sources?.home_price?.provider) || 'Existing PCSUnited destination dataset'}. Market figures are dated planning data, not live listings.`);
    $('city-data').href = `/netlify/functions/cities/${encodeURIComponent(selection.cityKey)}.json`;
    text('city-notes-source', `${$('city-source').textContent} Market as of ${firstText(city.market_metrics?.as_of,city.metrics?.as_of,city.sources?.home_price?.as_of,city.last_updated_data_from_sources) || 'date unavailable'}. Demographics: ${firstText(city.sources?.demographics?.provider) || 'provider unavailable'}; ${firstText(city.sources?.demographics?.as_of) || 'date unavailable'}.`);
    $('city-notes-data').href = $('city-data').href;
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
    // allIn contains P&I, taxes, insurance, HOA and PMI. The shared budget
    // engine adds utilities once. Never add the city's combined mortgage estimate.
    const total = overview ? result.budget.totalOutflow : m.allIn;
    text('housing-cost', money(total)); text('housing-price', money(request.price));
    const coverage = compensation.monthly.bah / total * 100;
    text('coverage', `${Math.round(coverage)}% BAH coverage`);
    text('housing-percent', `${Math.round(coverage)}%`);
    $('coverage-bar').style.width = `${Math.min(100, coverage)}%`;
    text('balance', balanceText(result.budget.remainder)); $('balance').dataset.shortfall = String(result.budget.remainder < -0.5);
    const priceDate = city.by_bedroom?.[$('bedrooms').value]?.home_price?.as_of || 'date unavailable';
    text('housing-assumptions', `${$('bedrooms').value}-bedroom planning price ${money(request.price)} (${priceDate}); ${request.termYears}-year VA purchase scenario, ${request.interestRate}% fixed interest rate, ${request.downPct}% down. Assumes first VA use, no funding-fee exemption, and ${money(result.financedFundingFee, true)} funding fee financed into the loan. These assumptions are not a statement of your eligibility or fee status. ${firstText(city.mortgage_assumptions?.defaults_note)}`);
    const rows = [['Principal & interest',m.principalInterest],['Property tax',m.propertyTax],['Home insurance',m.insurance],['HOA',m.hoa],['Monthly PMI (VA)',m.pmi],['Total per month',m.allIn]];
    if (overview) {
      rows.splice(-1,1,['Utilities',request.otherExpensesMonthly],['Total per month',total]);
      const utilityDate = city.by_bedroom?.[$('bedrooms').value]?.utilities?.as_of || 'date unavailable';
      $('housing-assumptions').textContent += ` Utilities: ${money(request.otherExpensesMonthly, true)} monthly (${utilityDate}), from the selected bedroom estimate. The shared budget engine adds utilities once to the mortgage total.`;
    }
    text('housing-scope', overview ? 'Includes tax, insurance, HOA and utilities. Excludes maintenance and closing costs.' : 'Includes principal & interest, property tax, insurance and HOA. Excludes utilities, maintenance and closing costs.');
    const parts = rows.slice(0,-1).filter(([label,value]) => label !== 'Monthly PMI (VA)' || value > 0);
    const colors = ['#85d3e2','#65c7ac','#dfb77d','#b1a4de','#9caec6','#9caec6'];
    let stop = 0;
    const gradient = parts.map(([,value], i) => { const start = stop; stop += value / total * 100; return `${colors[i]} ${start}% ${stop}%`; });
    $('housing-donut').style.background = `conic-gradient(${gradient.join(',')})`;
    $('housing-donut').setAttribute('aria-label', `Housing cost composition; ${Math.round(coverage)}% covered by BAH. ${parts.map(([label,value]) => `${label} ${money(value,true)}`).join(', ')}.`);
    $('housing-components').replaceChildren(...parts.map(([label,value], i) => {
      const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      const dot = document.createElement('i'); dot.style.background = colors[i]; dot.setAttribute('aria-hidden','true');
      dt.append(dot, label); dd.textContent = money(value); div.append(dt,dd); return div;
    }));
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
    const request = mortgageRequest(city, $('bedrooms').value, compensation.monthly.bah, {includeUtilities:overview});
    try {
      if (!request) { $('housing-panel').style.minHeight = ''; text('housing-status', 'Housing estimate unavailable: this bedroom’s price, financing assumptions or required utility estimate is missing. Try another bedroom size.'); return; }
      const result = readMortgage(await fetchJSON('/api/mortgage', {body:request, signal}), request);
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
    text('app-status', withDetails ? 'Preparing your compensation, destination and housing brief…' : 'Preparing your monthly compensation…');
    try {
      selection = parseSelection(params);
      if (window.parent !== window && (!parentOrigin || !/^[\w-]{1,160}$/.test(requestId))) throw new Error('This embed connection could not be verified. Open the brief from PCSUnited and select Analyze again.');
      const [pay, destination] = await Promise.all([
        fetchJSON('/api/opensource-brain', {body:{tool:'PCS_SNAPSHOT', input:{rank:selection.rank, yos:selection.yos, base:selection.base, hasDependents:selection.hasDependents}}, signal}),
        withDetails ? fetchJSON(`/netlify/functions/cities/${encodeURIComponent(selection.cityKey)}.json`, {signal}) : null
      ]);
      if (current !== run || signal.aborted) return;
      compensation = readCompensation(pay, selection);
      renderPay();
      if (withDetails) {
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
