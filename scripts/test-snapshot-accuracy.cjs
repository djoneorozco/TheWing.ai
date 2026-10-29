// Deterministic integration checks: real public handlers, city records and UI rendering.
// Run: node --test scripts/test-snapshot-accuracy.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {pathToFileURL} = require('node:url');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'PCS-Snapshot/snapshot.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'PCS-Snapshot/index.html'), 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const query = '?rank=E6&yos=14&family=3&newBase=Davis-Monthan%20AFB&curBase=Lackland%20AFB';
const cities = path.join(root, 'netlify/functions/cities');
const city = name => JSON.parse(fs.readFileSync(path.join(cities, name + '.json'), 'utf8'));
const load = file => import(pathToFileURL(path.join(root, 'netlify/functions', file)));

function snapshot(search = query, {fetch, storage = {}} = {}) {
  const elements = {}, charts = [];
  function element(id) {
    if (!ids.has(id)) return null;
    return elements[id] ||= {textContent:'', innerHTML:'', style:{}, hidden:false, listeners:{},
      addEventListener(name, callback) {this.listeners[name] = callback;}, removeAttribute() {},
      getContext() { return {id}; }, classList:{add() {}, remove() {}},
      parentElement:{querySelector() {return {hidden:false};}}};
  }
  const tabs = ['buy', 'rent', 'base'].map(mode => ({...element('pcs-ls-main'), listeners:{},
    getAttribute() {return mode;}}));
  const context = {URLSearchParams, AbortController, setTimeout, clearTimeout,
    fetch:fetch || (async () => {throw new Error('offline');}),
    console:{info() {}, log() {}, warn() {}, error() {}},
    window:{location:{search, origin:'https://thewing.netlify.app'}},
    sessionStorage:{getItem:key => storage[key] ?? null},
    document:{readyState:'loading', addEventListener() {}, getElementById:element,
      querySelectorAll:selector => selector === '.pcs-ls-tab' ? tabs : []},
    ApexCharts:function(el, options) {charts.push(options); this.render=()=>{}; this.destroy=()=>{};},
    Chart:function(ctx, options) {charts.push(options); this.destroy=()=>{};}
  };
  vm.createContext(context);
  const exports = '{STATE, COMP, getBasePay, getBasAmount, getBah, grossIncome, safeNum, amount, avgFromRange, money, sumKnown, mortgageRequest, readMortgage, loadHousingCosts, bedroomData, housingComparison, recordedHistory, loadCompensation, loadCityData, markFallbackData, paintAll, paintLivingStrategy, renderTrendChart, wireEvents, boot}';
  vm.runInContext(source.replace('  if (document.readyState === "loading") {', `  window.test = ${exports};\n  if (document.readyState === "loading") {`), context);
  return {a:context.window.test, elements, charts, tabs, context};
}

async function apiFetch(url, options = {}) {
  const route = new URL(url).pathname.split('/').pop();
  if (!['opensource-brain', 'mortgage'].includes(route)) throw new Error('Unexpected route ' + route);
  const {handler} = await load(route + '.js');
  const response = await handler({httpMethod:'POST', body:options.body});
  return {ok:response.statusCode === 200, status:response.statusCode, json:async () => JSON.parse(response.body)};
}

test('Davis-Monthan E-6 / 14 YOS / family 3: verified pay, itemized housing, consistent gaps', async () => {
  const {a, elements:e} = snapshot(query, {fetch:apiFetch});
  const d = city('Davis-Monthan');
  await a.loadCompensation();
  await a.loadHousingCosts(d);
  assert.equal(a.getBasePay(), 5130.30);
  assert.equal(a.getBasAmount(), 476.95);
  assert.equal(a.getBah('', 'new'), 2121);
  assert.equal(a.getBah('', 'current'), 2094);
  assert.equal(a.grossIncome(), 7728.25);
  const b = a.bedroomData(d, 3);
  assert.equal(b.mortgage, 2201.34); // 357,525 financed, 6.25%, 360 monthly payments
  assert.equal(b.taxes, 192.50); // 350,000 * 0.66% / 12
  assert.equal(b.insurance, 160.42); // 350,000 * 0.55% / 12
  assert.equal(b.hoa, 45);
  assert.equal(b.utilities, 335);
  assert.equal(b.totalHousing, 2934.26);
  assert.equal(b.totalRent, 2335);
  assert.equal(a.housingComparison(b).monthlyGap, 599.26);
  assert.equal(a.housingComparison(b).annualGap, 7191.12);
  a.paintAll(city('Lackland'), d);
  assert.equal(e['pcs-income-main'].textContent, '$7,728.25');
  assert.equal(e['pts-bah-delta'].textContent, '+$27');
  assert.equal(e['pcs-ls-gap'].textContent, '$599.26');
  assert.equal(e['pcs-ls-annual'].textContent, '$7,191.12');
  assert.equal(e['pts-power-score'].textContent, '38.0%');
  assert.match(e['pcs-afford-footer'].textContent, /first use, non-exempt, fee financed/);
  assert.doesNotMatch(e['pcs-ls-equity'].textContent, /\$/);
});

test('all 44 city files: every available bedroom, both dependent statuses, and UI render', async t => {
  const files = fs.readdirSync(cities).filter(f => f.endsWith('.json') && f !== 'index.byBase.json');
  assert.equal(files.length, 44);
  let supportedBedrooms = 0, unavailableBedrooms = 0;
  for (const file of files) {
    await t.test(file, async () => {
      const name = file.slice(0,-5), d = city(name);
      const {a, elements:e, charts} = snapshot('?rank=E6&yos=14&family=3&newBase=' + encodeURIComponent(name + ' AFB'), {fetch:apiFetch});
      await a.loadCompensation();
      assert.ok(a.getBah('', 'new') > 0, 'destination BAH resolved');
      assert.equal(a.getBah('', 'current'), null, 'no invented current base');
      assert.equal(a.getBasePay(), 5130.3);
      await a.loadHousingCosts(d);
      for (const bedrooms of [2,3,4,5]) {
        a.STATE.bedroom = bedrooms;
        const b = a.bedroomData(d, bedrooms), gap = a.housingComparison(b);
        if (d.by_bedroom[bedrooms]) {
          supportedBedrooms++;
          assert.ok(b.mortgage > 0 && b.taxes > 0 && b.insurance > 0);
          assert.equal(b.totalHousing, a.sumKnown([b.mortgage,b.taxes,b.insurance,b.hoa,b.utilities]));
          assert.equal(b.totalRent, a.sumKnown([b.rent,b.utilities]));
          assert.equal(gap.annualGap, Math.round(gap.monthlyGap * 1200) / 100);
          assert.equal(b.home, d.by_bedroom[bedrooms].home_price.avg);
        } else {
          unavailableBedrooms++;
          assert.equal(name, 'Fort-Sam-Houston');
          assert.equal(b.totalHousing, null);
          assert.equal(b.home, null);
          assert.equal(gap.monthlyGap, null);
        }
        a.paintAll(null, d);
        assert.doesNotMatch(JSON.stringify(e), /NaN|Infinity|undefined/);
      }
      const history = a.recordedHistory(d, 3);
      assert.ok(history.length > 0);
      for (const point of history) {
        assert.ok(d.housing.market.sale_history_36_months.some(row => Date.parse(row.month+'-01T00:00:00Z') === point.x && row.median_sale_price === point.y));
      }
      assert.ok(charts.some(c => c.series));
      a.STATE.family = 1;
      await a.loadCompensation();
      assert.ok(a.getBah('', 'new') > 0, 'without-dependent BAH resolved');
    });
  }
  assert.equal(supportedBedrooms, 174);
  assert.equal(unavailableBedrooms, 2);
});

test('null/blank/invalid amounts are unavailable while explicit zero remains zero', () => {
  const {a} = snapshot();
  for (const value of [null, undefined, '', ' ', false, {}, NaN, Infinity]) {
    assert.equal(a.safeNum(value, null), null);
  }
  assert.equal(a.amount(-1), null);
  assert.equal(a.amount(0), 0);
  assert.equal(a.avgFromRange({avg:null,low:100,high:200},null), 150);
  assert.equal(a.avgFromRange({avg:null,low:null,high:200},null), null);
  assert.equal(a.avgFromRange({avg:0,low:100,high:200},null), 0);
  assert.equal(a.sumKnown([10, null]), null);
  assert.equal(a.money(null), 'Unavailable');
  assert.equal(a.money(0), '$0');
  assert.equal(a.money(-813.26, true), '-$813.26');
  assert.equal(a.housingComparison({totalHousing:2000,totalRent:2100}).annualGap, -1200);
  assert.equal(a.housingComparison({totalHousing:2000,totalRent:2000}).annualGap, 0);
});

test('network errors, missing inputs and invalid responses never use sample compensation', async () => {
  const {a, elements:e, charts} = snapshot();
  await a.loadCompensation();
  await a.loadHousingCosts(city('Davis-Monthan'));
  a.paintAll(null, city('Davis-Monthan'));
  assert.equal(a.getBasePay(), null);
  assert.equal(a.getBasAmount(), null);
  assert.equal(a.getBah('', 'new'), null);
  assert.equal(a.grossIncome(), null);
  assert.equal(e['pcs-income-main'].textContent, 'Unavailable');
  assert.equal(e['pts-bah-delta'].textContent, 'Unavailable');
  assert.equal(e['pcs-ls-annual'].textContent, 'Unavailable');
  assert.equal(e['pcs-afford-taxes'].textContent, 'Unavailable');
  assert.ok(!charts.some(c => c.type === 'doughnut'));
  for (const search of ['', '?newBase=Davis-Monthan%20AFB', '?rank=E6&yos=-1&family=3&newBase=Davis-Monthan%20AFB']) {
    const missing = snapshot(search, {fetch:async () => {assert.fail('Missing input must not call compensation API');}}).a;
    await missing.loadCompensation();
    assert.equal(missing.grossIncome(), null);
  }
  const invalid = snapshot(query, {fetch:async () => ({ok:true,json:async () => ({ok:false,payload:{compensation:{monthly:{basicPay:100,bas:20,bah:30}}}})})}).a;
  await invalid.loadCompensation();
  assert.equal(invalid.grossIncome(), null);
});

test('partial/wrong-profile compensation cannot become a complete income or comparison', async () => {
  const partialFetch = async (url, options) => {
    const response = await apiFetch(url, options);
    const packet = await response.json();
    packet.payload.compensation.monthly.bas = null;
    return {...response, json:async () => packet};
  };
  const {a, elements:e} = snapshot(query, {fetch:partialFetch});
  await a.loadCompensation();
  assert.equal(a.getBasePay(), 5130.3);
  assert.equal(a.getBasAmount(), null);
  assert.equal(a.grossIncome(), null);
  a.paintAll(null, city('Davis-Monthan'));
  assert.equal(e['pcs-income-main'].textContent, 'Unavailable');
  const mismatch = snapshot(query, {fetch:async (url, options) => {
    const r = await apiFetch(url, options), packet = await r.json();
    packet.payload.profile.yos = 8;
    return {...r,json:async () => packet};
  }}).a;
  await mismatch.loadCompensation();
  assert.equal(mismatch.getBah('', 'new'), null);
});

test('unsupported paygrades fail visibly, valid paygrade changes use the backend', async () => {
  for (const rank of ['E1','O3','O1E','W2']) {
    const {a} = snapshot(query.replace('rank=E6', 'rank='+rank), {fetch:apiFetch});
    await a.loadCompensation();
    if (rank === 'W2') assert.equal(a.grossIncome(), null); // Current official pay module has no warrant table.
    else assert.ok(a.grossIncome() > 0, rank);
  }
});

test('mortgage inputs preserve explicit zero, normalize legacy units in shared engine, reject missing fields', async () => {
  const {a} = snapshot(query, {fetch:apiFetch});
  const d = city('Davis-Monthan');
  const request = a.mortgageRequest(d, 3);
  assert.equal(request.downPct, 0);
  assert.equal(request.propertyTaxPercent, 0.66);
  assert.equal(request.insurancePercent, 0.55);
  const minot = a.mortgageRequest(city('Minot'), 3);
  assert.equal(minot.hoaMonthly, 0);
  const fort = a.mortgageRequest(city('Fort-Sam-Houston'), 3);
  assert.equal(fort.propertyTaxRate, 2.24);
  assert.equal(fort.insuranceRate, 0.58);
  await a.loadHousingCosts(city('Fort-Sam-Houston'));
  const fb = a.bedroomData(city('Fort-Sam-Houston'), 3);
  assert.equal(fb.taxes, 508.34);
  assert.equal(fb.insurance, 131.62);
  a.paintAll(null, city('Fort-Sam-Houston'));
  assert.equal(snapshot().a.recordedHistory(null, 1).length, 0);
  d.mortgage_assumptions.apr_percent = null;
  assert.equal(a.mortgageRequest(d, 3), null);
  assert.equal(a.readMortgage({ok:true,meta:{vaOverlayApplied:true},monthly:{principalInterest:1000,propertyTax:null,insurance:0,hoa:0,pmi:0,allIn:1000}}), null);
  assert.equal(a.readMortgage({ok:true,meta:{vaOverlayApplied:true},monthly:{principalInterest:1000,propertyTax:100,insurance:50,hoa:0,pmi:0,allIn:1000}}), null);
});

test('history is dated, sparse, chronological, and never synthesized from YoY', () => {
  const {a, charts, elements:e} = snapshot();
  const d = city('Davis-Monthan');
  assert.deepEqual(Array.from(a.recordedHistory(d,1), p=>p.y), [335000,327667]);
  assert.deepEqual(Array.from(a.recordedHistory(d,3), p=>p.y), [340000,335000,327667]);
  a.renderTrendChart(d,1);
  assert.equal(charts.at(-1).xaxis.type, 'datetime');
  assert.equal(charts.at(-1).series[0].data.at(-1).y, 327667);
  assert.match(e['pcs-trend-summary'].textContent, /Jun 2025 – Mar 2026/);
  a.renderTrendChart({housing:{market:{yoy_change:5}}},1);
  assert.equal(charts.at(-1).series[0].data.length, 0);
  assert.match(e['pcs-trend-summary'].textContent, /No dated/);
});

test('tabs and bedroom changes keep labels, monthly/annual gaps and chart selection synchronized', async () => {
  const {a, tabs, elements:e} = snapshot(query, {fetch:apiFetch});
  const d = city('Davis-Monthan');
  await a.loadHousingCosts(d);
  a.paintAll(null,d); a.wireEvents(null,d);
  tabs[1].listeners.click();
  assert.equal(e['pcs-ls-main'].textContent, 'Rent');
  assert.equal(e['pcs-ls-annual'].textContent, '$7,191.12');
  e['btn-3yr'].listeners.click();
  e['pcs-bedroom-up'].listeners.click();
  assert.equal(a.STATE.livingMode, 'rent');
  assert.equal(e['pcs-ls-main'].textContent, 'Rent');
  assert.equal(a.STATE.trendYears, 3);
  assert.equal(e['pcs-trend-title'].textContent, '3-Year Housing History');
  tabs[2].listeners.click();
  assert.equal(e['pcs-ls-annual'].textContent, 'Unavailable');
  assert.equal(e['pcs-ls-gap'].textContent, 'Unavailable');
  assert.equal(e['pcs-ls-vs'].textContent, 'Quote required');
});

test('city API wrapper, missing city and stale stored destination cannot introduce sample data', async () => {
  const d = city('Davis-Monthan');
  const {a} = snapshot(query, {storage:{pcs_new_fileKey:'Travis'},fetch:async () => ({ok:true,json:async () => ({ok:true,file:'Davis-Monthan.json',data:d})})});
  assert.equal(a.STATE.newCityKey, 'Davis-Monthan');
  assert.equal((await a.loadCityData('Davis-Monthan',null,'destination')).by_bedroom['3'].home_price.avg, 350000);
  const offline = snapshot();
  const missing = await offline.a.loadCityData('missing',null,'destination');
  offline.a.paintAll(null,missing);
  assert.equal(offline.a.bedroomData(missing,3).home, null);
  assert.equal(offline.elements['pcs-cur-median-home'].textContent, 'Unavailable');
  assert.equal(offline.elements['pcs-cur-population-city'].textContent, 'Unavailable');
  assert.match(offline.elements['pcs-city-line'].textContent, /Base data unavailable/);
  offline.a.paintAll(null,city('Fort-Sam-Houston'));
  assert.equal(offline.elements['pcs-cur-population-city'].textContent, '1.5M');
});
