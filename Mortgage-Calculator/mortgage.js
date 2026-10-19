/* PCSUnited Mortgage Calculator v2.0.0
 * UI, validation and profile transport only. Mortgage/pay math stays in TheWing.
 * Detailed financial inputs remain in memory. See INSTALL.txt for the parent bridge.
 */
(function () {
  'use strict';
  function boot() {
    const root = document.getElementById('pcsu-mortgage-shell');
    if (!root || root.dataset.mortgageMounted) return;
    root.dataset.mortgageMounted = 'true';
    const VERSION = '2.0.0';
    const CATALOG = [{"id":"altus","name":"Altus AFB","api":"Altus AFB","fileName":"Altus.json","snapshot":null,"aliases":["Altus AFB","Altus","Altus.json"]},{"id":"barksdale","name":"Barksdale AFB","api":"Barksdale AFB","fileName":"Barksdale.json","snapshot":{"value":"Barksdale AFB","fileKey":"Barksdale","zip":"71110"},"aliases":["Barksdale AFB","Barksdale","Barksdale.json"]},{"id":"beale","name":"Beale AFB","api":"Beale AFB","fileName":"Beale.json","snapshot":{"value":"Beale AFB","fileKey":"Beale","zip":"95903"},"aliases":["Beale AFB","Beale","Beale.json"]},{"id":"cannon","name":"Cannon AFB","api":"Cannon AFB","fileName":"Cannon.json","snapshot":{"value":"Cannon AFB","fileKey":"Cannon","zip":"88103"},"aliases":["Cannon AFB","Cannon","Cannon.json"]},{"id":"columbus","name":"Columbus AFB","api":"Columbus AFB","fileName":"Columbus.json","snapshot":null,"aliases":["Columbus AFB","Columbus","Columbus.json"]},{"id":"creech","name":"Creech AFB","api":"Creech AFB","fileName":"Creech.json","snapshot":null,"aliases":["Creech AFB","Creech","Creech.json"]},{"id":"davismonthan","name":"Davis-Monthan AFB","api":"Davis-Monthan AFB","fileName":"Davis-Monthan.json","snapshot":{"value":"Davis-Monthan AFB","fileKey":"Davis-Monthan","zip":"85707"},"aliases":["Davis-Monthan AFB","Davis-Monthan","Davis-Monthan.json"]},{"id":"dover","name":"Dover AFB","api":"Dover AFB","fileName":"Dover.json","snapshot":{"value":"Dover AFB","fileKey":"Dover","zip":"19902"},"aliases":["Dover AFB","Dover","Dover.json"]},{"id":"dyess","name":"Dyess AFB","api":"Dyess AFB","fileName":"Dyess.json","snapshot":{"value":"Dyess AFB","fileKey":"Dyess","zip":"79607"},"aliases":["Dyess AFB","Dyess","Dyess.json"]},{"id":"edwards","name":"Edwards AFB","api":"Edwards AFB","fileName":"Edwards.json","snapshot":null,"aliases":["Edwards AFB","Edwards","Edwards.json"]},{"id":"eglin","name":"Eglin AFB","api":"Eglin AFB","fileName":"Eglin.json","snapshot":{"value":"Eglin AFB","fileKey":"Eglin","zip":"32542"},"aliases":["Eglin AFB","Eglin","Eglin.json"]},{"id":"eielson","name":"Eielson AFB","api":"Eielson AFB","fileName":"Eielson.json","snapshot":null,"aliases":["Eielson AFB","Eielson","Eielson.json"]},{"id":"ellsworth","name":"Ellsworth AFB","api":"Ellsworth AFB","fileName":"Ellsworth.json","snapshot":null,"aliases":["Ellsworth AFB","Ellsworth","Ellsworth.json"]},{"id":"fewarren","name":"F. E. Warren AFB","api":"F.E. Warren AFB","fileName":"F.E-Warren.json","snapshot":{"value":"F.E-Warren AFB","fileKey":"F.E-Warren","zip":"82005"},"aliases":["F. E. Warren AFB","F-E-Warren","F.E. Warren AFB","F-E-Warren.json","F.E-Warren AFB","F.E-Warren"]},{"id":"fairchild","name":"Fairchild AFB","api":"Fairchild AFB","fileName":"Fairchild.json","snapshot":{"value":"Fairchild AFB","fileKey":"Fairchild","zip":"99011"},"aliases":["Fairchild AFB","Fairchild","Fairchild.json"]},{"id":"fortsamhouston","name":"Joint Base San Antonio-Fort Sam Houston","api":"JBSA-Fort Sam Houston","fileName":"Fort-Sam-Houston.json","snapshot":{"value":"Fort-Sam-Houston AFB","fileKey":"Fort-Sam-Houston","zip":"78234"},"aliases":["Fort-Sam-Houston AFB","Fort-Sam-Houston","JBSA-Fort Sam Houston"]},{"id":"goodfellow","name":"Goodfellow AFB","api":"Goodfellow AFB","fileName":"Goodfellow.json","snapshot":null,"aliases":["Goodfellow AFB","Goodfellow","Goodfellow.json"]},{"id":"grandforks","name":"Grand Forks AFB","api":"Grand Forks AFB","fileName":"Grand-Forks.json","snapshot":null,"aliases":["Grand Forks AFB","Grand-Forks","Grand-Forks.json"]},{"id":"hanscom","name":"Hanscom AFB","api":"Hanscom AFB","fileName":"Hanscom.json","snapshot":null,"aliases":["Hanscom AFB","Hanscom","Hanscom.json"]},{"id":"hill","name":"Hill AFB","api":"Hill AFB","fileName":"Hill.json","snapshot":null,"aliases":["Hill AFB","Hill","Hill.json"]},{"id":"holloman","name":"Holloman AFB","api":"Holloman AFB","fileName":"Holloman.json","snapshot":{"value":"Holloman AFB","fileKey":"Holloman","zip":"88330"},"aliases":["Holloman AFB","Holloman","Holloman.json"]},{"id":"hurlburt","name":"Hurlburt Field","api":"Hurlburt Field","fileName":"Hurlburt.json","snapshot":{"value":"Hurlburt AFB","fileKey":"Hurlburt","zip":"32544"},"aliases":["Hurlburt Field","Hurlburt","Hurlburt.json","Hurlburt AFB"]},{"id":"andrews","name":"Joint Base Andrews","api":"Andrews AFB","fileName":"Andrews.json","snapshot":{"value":"Andrews AFB","fileKey":"Andrews","zip":"20762"},"aliases":["Joint Base Andrews","Andrews","Andrews AFB","Andrews.json"]},{"id":"charleston","name":"Joint Base Charleston","api":"Charleston AFB","fileName":"Charleston.json","snapshot":{"value":"Charleston AFB","fileKey":"Charleston","zip":"29404"},"aliases":["Joint Base Charleston","Charleston","Charleston AFB","Charleston.json"]},{"id":"elmendorf","name":"Joint Base Elmendorf-Richardson","api":"Elmendorf AFB","fileName":"Elmendorf.json","snapshot":{"value":"Elmendorf AFB","fileKey":"Elmendorf","zip":"99506"},"aliases":["Joint Base Elmendorf-Richardson","Elmendorf","Elmendorf AFB","Elmendorf.json"]},{"id":"langley","name":"Joint Base Langley-Eustis","api":"Langley AFB","fileName":"Langley.json","snapshot":{"value":"Langley AFB","fileKey":"Langley","zip":"23665"},"aliases":["Joint Base Langley-Eustis","Langley","Langley AFB","Langley.json"]},{"id":"mcchord","name":"Joint Base Lewis-McChord","api":"McChord Field","fileName":"McChord.json","snapshot":null,"aliases":["Joint Base Lewis-McChord","McChord","McChord.json","McChord Field"]},{"id":"mcguire","name":"Joint Base McGuire-Dix-Lakehurst","api":"McGuire AFB","fileName":"McGuire.json","snapshot":{"value":"McGuire AFB","fileKey":"McGuire","zip":"08641"},"aliases":["Joint Base McGuire-Dix-Lakehurst","McGuire","McGuire AFB","McGuire.json"]},{"id":"hickam","name":"Joint Base Pearl Harbor-Hickam","api":"Joint Base Pearl Harbor-Hickam","fileName":"Hickam.json","snapshot":null,"aliases":["Joint Base Pearl Harbor-Hickam","Hickam","Hickam.json"]},{"id":"lackland","name":"Joint Base San Antonio-Lackland","api":"Lackland AFB","fileName":"Lackland.json","snapshot":{"value":"Lackland AFB","fileKey":"Lackland","zip":"78236"},"aliases":["Joint Base San Antonio-Lackland","Lackland","Lackland AFB","Lackland.json","JBSA-Lackland","Lackland Air Force Base"]},{"id":"randolph","name":"Joint Base San Antonio-Randolph","api":"JBSA-Randolph","fileName":"Randolph.json","snapshot":{"value":"Randolph AFB","fileKey":"Randolph","zip":"78150"},"aliases":["Joint Base San Antonio-Randolph","Randolph","JBSA-Randolph","Randolph.json","Randolph AFB"]},{"id":"keesler","name":"Keesler AFB","api":"Keesler AFB","fileName":"Keesler.json","snapshot":{"value":"Keesler AFB","fileKey":"Keesler","zip":"39534"},"aliases":["Keesler AFB","Keesler","Keesler.json"]},{"id":"kirtland","name":"Kirtland AFB","api":"Kirtland AFB","fileName":"Kirtland.json","snapshot":{"value":"Kirtland AFB","fileKey":"Kirtland","zip":"87117"},"aliases":["Kirtland AFB","Kirtland","Kirtland.json"]},{"id":"laughlin","name":"Laughlin AFB","api":"Laughlin AFB","fileName":"Laughlin.json","snapshot":{"value":"Laughlin AFB","fileKey":"Laughlin","zip":"78843"},"aliases":["Laughlin AFB","Laughlin","Laughlin.json"]},{"id":"littlerock","name":"Little Rock AFB","api":"Little Rock AFB","fileName":"Little-Rock.json","snapshot":{"value":"Little-Rock AFB","fileKey":"Little-Rock","zip":"72099"},"aliases":["Little-Rock AFB","Little-Rock","Little Rock AFB"]},{"id":"losangeles","name":"Los Angeles AFB","api":"Los Angeles AFB","fileName":"Los-Angeles.json","snapshot":null,"aliases":["Los Angeles AFB","Los-Angeles","Los-Angeles.json"]},{"id":"luke","name":"Luke AFB","api":"Luke AFB","fileName":"Luke.json","snapshot":{"value":"Luke AFB","fileKey":"Luke","zip":"85309"},"aliases":["Luke AFB","Luke","Luke.json"]},{"id":"macdill","name":"MacDill AFB","api":"MacDill AFB","fileName":"MacDill.json","snapshot":{"value":"MacDill AFB","fileKey":"MacDill","zip":"33621"},"aliases":["MacDill AFB","MacDill","MacDill.json"]},{"id":"malmstrom","name":"Malmstrom AFB","api":"Malmstrom AFB","fileName":"Malmstrom.json","snapshot":{"value":"Malmstrom AFB","fileKey":"Malmstrom","zip":"59402"},"aliases":["Malmstrom AFB","Malmstrom","Malmstrom.json"]},{"id":"maxwell","name":"Maxwell AFB","api":"Maxwell AFB","fileName":"Maxwell.json","snapshot":{"value":"Maxwell AFB","fileKey":"Maxwell","zip":"36112"},"aliases":["Maxwell AFB","Maxwell","Maxwell.json"]},{"id":"mcconnell","name":"McConnell AFB","api":"McConnell AFB","fileName":"McConnell.json","snapshot":{"value":"McConnell AFB","fileKey":"McConnell","zip":"67221"},"aliases":["McConnell AFB","McConnell","McConnell.json"]},{"id":"minot","name":"Minot AFB","api":"Minot AFB","fileName":"Minot.json","snapshot":{"value":"Minot AFB","fileKey":"Minot","zip":"58705"},"aliases":["Minot AFB","Minot","Minot.json"]},{"id":"moody","name":"Moody AFB","api":"Moody AFB","fileName":"Moody.json","snapshot":{"value":"Moody AFB","fileKey":"Moody","zip":"31699"},"aliases":["Moody AFB","Moody","Moody.json"]},{"id":"mountainhome","name":"Mountain Home AFB","api":"Mountain Home AFB","fileName":"Mountain-Home.json","snapshot":{"value":"Mountain-Home AFB","fileKey":"Mountain-Home","zip":"83648"},"aliases":["Mountain Home AFB","Mountain-Home","Mountain-Home.json","Mountain-Home AFB"]},{"id":"nellis","name":"Nellis AFB","api":"Nellis AFB","fileName":"Nellis.json","snapshot":{"value":"Nellis AFB","fileKey":"Nellis","zip":"89191"},"aliases":["Nellis AFB","Nellis","Nellis.json"]},{"id":"offutt","name":"Offutt AFB","api":"Offutt AFB","fileName":"Offutt.json","snapshot":{"value":"Offutt AFB","fileKey":"Offutt","zip":"68113"},"aliases":["Offutt AFB","Offutt","Offutt.json"]},{"id":"patrick","name":"Patrick SFB","api":"Patrick SFB","fileName":"Patrick.json","snapshot":null,"aliases":["Patrick SFB","Patrick","Patrick.json"]},{"id":"peterson","name":"Peterson SFB","api":"Peterson SFB","fileName":"Peterson.json","snapshot":{"value":"Peterson AFB","fileKey":"Peterson","zip":"80914"},"aliases":["Peterson SFB","Peterson","Peterson.json","Peterson AFB"]},{"id":"robins","name":"Robins AFB","api":"Robins AFB","fileName":"Robins.json","snapshot":{"value":"Robins AFB","fileKey":"Robins","zip":"31098"},"aliases":["Robins AFB","Robins","Robins.json"]},{"id":"schriever","name":"Schriever SFB","api":"Schriever SFB","fileName":"Schriever.json","snapshot":null,"aliases":["Schriever SFB","Schriever","Schriever.json"]},{"id":"scott","name":"Scott AFB","api":"Scott AFB","fileName":"Scott.json","snapshot":{"value":"Scott AFB","fileKey":"Scott","zip":"62225"},"aliases":["Scott AFB","Scott","Scott.json"]},{"id":"seymourjohnson","name":"Seymour Johnson AFB","api":"Seymour Johnson AFB","fileName":"Seymour-Johnson.json","snapshot":{"value":"Seymour-Johnson AFB","fileKey":"Seymour-Johnson","zip":"27531"},"aliases":["Seymour Johnson AFB","Seymour-Johnson","Seymour-Johnson.json","Seymour-Johnson AFB"]},{"id":"shaw","name":"Shaw AFB","api":"Shaw AFB","fileName":"Shaw.json","snapshot":{"value":"Shaw AFB","fileKey":"Shaw","zip":"29152"},"aliases":["Shaw AFB","Shaw","Shaw.json"]},{"id":"sheppard","name":"Sheppard AFB","api":"Sheppard AFB","fileName":"Sheppard.json","snapshot":{"value":"Sheppard AFB","fileKey":"Sheppard","zip":"76311"},"aliases":["Sheppard AFB","Sheppard","Sheppard.json"]},{"id":"tinker","name":"Tinker AFB","api":"Tinker AFB","fileName":"Tinker.json","snapshot":{"value":"Tinker AFB","fileKey":"Tinker","zip":"73145"},"aliases":["Tinker AFB","Tinker","Tinker.json"]},{"id":"travis","name":"Travis AFB","api":"Travis AFB","fileName":"Travis.json","snapshot":{"value":"Travis AFB","fileKey":"Travis","zip":"94535"},"aliases":["Travis AFB","Travis","Travis.json"]},{"id":"tyndall","name":"Tyndall AFB","api":"Tyndall AFB","fileName":"Tyndall.json","snapshot":{"value":"Tyndall AFB","fileKey":"Tyndall","zip":"32403"},"aliases":["Tyndall AFB","Tyndall","Tyndall.json"]},{"id":"airforceacademy","name":"U.S. Air Force Academy","api":"U.S. Air Force Academy","fileName":"Air-Force-Academy.json","snapshot":null,"aliases":["U.S. Air Force Academy","Air-Force-Academy","Air-Force-Academy.json"]},{"id":"vance","name":"Vance AFB","api":"Vance AFB","fileName":"Vance.json","snapshot":null,"aliases":["Vance AFB","Vance","Vance.json"]},{"id":"vandenberg","name":"Vandenberg SFB","api":"Vandenberg SFB","fileName":"Vandenberg.json","snapshot":null,"aliases":["Vandenberg SFB","Vandenberg","Vandenberg.json"]},{"id":"whiteman","name":"Whiteman AFB","api":"Whiteman AFB","fileName":"Whiteman.json","snapshot":{"value":"Whiteman AFB","fileKey":"Whiteman","zip":"65305"},"aliases":["Whiteman AFB","Whiteman"]},{"id":"wrightpatterson","name":"Wright-Patterson AFB","api":"Wright-Patterson AFB","fileName":"Wright-Patterson.json","snapshot":{"value":"Wright-Patterson AFB","fileKey":"Wright-Patterson","zip":"45433"},"aliases":["Wright-Patterson AFB","Wright-Patterson","Wright-Patterson.json"]}];
    const GRADES = 'E-1 E-2 E-3 E-4 E-5 E-6 E-7 E-8 E-9 W-1 W-2 W-3 W-4 W-5 O-1E O-2E O-3E O-1 O-2 O-3 O-4 O-5 O-6 O-7 O-8 O-9 O-10'.split(' ');
    const API = document.querySelector('meta[name="thewing-api-base"]')?.content || 'https://thewing.netlify.app/api';
    const $ = id => root.querySelector('#' + id);
    const text = (id, value) => { if ($(id)) $(id).textContent = value; };
    const money = n => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US', {style:'currency', currency:'USD'}) : '—';
    const number = value => value === null || value === undefined || String(value).trim() === '' ? null : Number(value);
    const val = id => $(id)?.value ?? '';
    const norm = x => String(x ?? '').replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseMap = new Map();
    CATALOG.forEach(b => [b.id, b.name, b.api, b.fileName, ...b.aliases].forEach(a => baseMap.set(norm(a), b)));
    const base = x => baseMap.get(norm(x)) || null;
    const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, {detail}));
    const state = {mortgage:null, income:null, profile:{}, profileConnected:false};
    let mortgageSeq = 0, paySeq = 0, mortgageAbort, payAbort, mortgageTimer, payTimer, applying = false;
    let trustedParent = null;
    const allowedParents = new Set(['https://pcs-united-com.webflow.io','https://www.pcsunited.com','https://pcsunited.com']);
    // Local preview exception is confined to a localhost child and its actual referrer.
    if (['localhost','127.0.0.1'].includes(location.hostname)) {
      try { const r = new URL(document.referrer); if (['localhost','127.0.0.1'].includes(r.hostname)) allowedParents.add(r.origin); } catch (_) {}
    }
    function options(id, values, label) {
      const node = $(id); node.replaceChildren(new Option(label, ''));
      values.forEach(v => node.add(new Option(typeof v === 'object' ? v.label : String(v), typeof v === 'object' ? v.value : String(v))));
    }
    options('rank', GRADES, 'Please select rank');
    options('yos', Array.from({length:41}, (_, i) => ({value:String(i), label:i + (i === 1 ? ' year' : ' years')})), 'Please select years');
    options('base', CATALOG.map(b=>({value:b.id, label:b.name})), 'Please select base');
    options('familySize', Array.from({length:12}, (_, i)=>String(i+1)), 'Please select household size');
    function setValue(id, value) { if ($(id)) $(id).value = value === null || value === undefined ? '' : String(value); }
    function status(message, kind = 'warn') {
      text('statusText', message);
      const dot = $('statusPill')?.querySelector('.dot');
      if (dot) dot.className = 'dot ' + kind;
    }
    function error(message) { text('errorBox', message || ''); }
    function collectInputs() {
      return {
        rank:val('rank') || null, yos:number(val('yos')), base:val('base') || null,
        dependents:val('dependents') || null, familySize:number(val('familySize')),
        baseRole:val('baseRole'), additionalIncome:number(val('additionalIncome')),
        homePrice:number(val('homePrice')), downPayment:number(val('downPayment')),
        creditScore:number(val('creditScore')), loanType:val('loanType'),
        interestRate:number(val('interestRate')), termYears:number(val('termYears')),
        taxRate:number(val('taxRate')), insuranceMonthly:number(val('insuranceMonthly')),
        hoaMonthly:number(val('hoaMonthly')), pmiMonthly:number(val('pmiMonthly')),
        takeHomeMonthly:number(val('takeHomeMonthly')), obligations:number(val('monthlyObligations')),
        priorUse:val('priorUse'), fundingFeeExempt:val('fundingFeeExempt'), financeFundingFee:val('financeFundingFee')
      };
    }
    function validateMortgage() {
      const ids = ['homePrice','downPayment','interestRate','creditScore','termYears','taxRate','insuranceMonthly','hoaMonthly','pmiMonthly','takeHomeMonthly','monthlyObligations'];
      for (const id of ids) {
        const e = $(id);
        if (e && !e.disabled && !e.checkValidity()) return {message: (root.querySelector('label[for="'+id+'"]')?.textContent || id) + ': ' + e.validationMessage, id};
      }
      const i = collectInputs();
      if (i.downPayment > i.homePrice) return {message:'Down payment cannot exceed home price.', id:'downPayment'};
      if (i.interestRate === null && i.creditScore === null) return {message:'Enter an interest rate or credit score for a clearly labeled planning rate.', id:'interestRate'};
      if (i.loanType === 'va' && i.downPayment < i.homePrice) {
        for (const id of ['fundingFeeExempt','priorUse','financeFundingFee']) {
          if (id !== 'fundingFeeExempt' && i.fundingFeeExempt === 'yes') continue;
          if (!val(id)) return {message:'Complete the VA funding fee selections.', id};
        }
      }
      return null;
    }
    function buildMortgageInput() {
      const i = collectInputs();
      const p = {price:i.homePrice, downPayment:i.downPayment, creditScore:i.creditScore,
        interestRate:i.interestRate, termYears:i.termYears, loanType:i.loanType,
        propertyTaxPercent:i.taxRate, insuranceMonthly:i.insuranceMonthly, hoaMonthly:i.hoaMonthly,
        pmiMonthly:i.loanType === 'va' ? null : i.pmiMonthly,
        takeHomeMonthly:i.takeHomeMonthly, otherExpensesMonthly:i.obligations,
        source:'pcsunited.mortgage.' + VERSION};
      if (i.loanType === 'va') Object.assign(p, {
        priorUse:i.priorUse || 'first_use', fundingFeeExempt:i.fundingFeeExempt === 'yes',
        financeFundingFee:i.financeFundingFee !== 'upfront'
      });
      return p;
    }
    async function post(path, body, controller) {
      const timer = setTimeout(()=>controller.abort(), 15000);
      try {
        const res = await fetch(API.replace(/\/$/,'') + path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:controller.signal});
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(typeof data.error === 'string' ? data.error : 'The calculation service could not complete this request.');
        return data;
      } finally { clearTimeout(timer); }
    }
    function normalizeMortgageResult(data) {
      const r = data.payload || data.data || data.result || data;
      if (r.meta?.calculationContract !== 'mortgage-v2') throw new Error('The calculator service needs its companion backend update. See the installation instructions.');
      if (!r.monthly || !r.mortgage || !r.totals || !Number.isFinite(r.monthly.allIn) || !Number.isFinite(r.mortgage.apr)) throw new Error('The calculation service returned incomplete results.');
      // Retain flat aliases consumed by older Webflow event listeners.
      return {...r, homePrice:r.mortgage.price, creditScore:r.mortgage.creditScore,
        loanType:r.mortgage.loanType, pi:r.monthly.pi, taxMonthly:r.monthly.tax,
        insuranceMonthly:r.monthly.insurance, hoaMonthly:r.monthly.hoa,
        pmiMonthly:r.monthly.pmi, allIn:r.monthly.allIn,
        source:'TheWing.ai', lockedOfficial:true, raw:data};
    }
    function invalidateMortgage(message = 'Inputs changed — updating estimate…') {
      mortgageSeq++; mortgageAbort?.abort(); clearTimeout(mortgageTimer);
      state.mortgage = null; renderMortgage(); renderBudget();
      status(message); error('');
      $('btn-calc').disabled = false;
      emit('pcsunited:mortgage-invalidated', {source:'pcsunited.mortgage.health', mortgage:null});
    }
    function scheduleMortgage() {
      invalidateMortgage();
      const invalid = validateMortgage();
      if (invalid) {status('Complete mortgage inputs'); error(invalid.message); return;}
      mortgageTimer = setTimeout(()=>fetchTheWingMortgage(), 350);
    }
    async function fetchTheWingMortgage(options = {}) {
      clearTimeout(mortgageTimer);
      const invalid = validateMortgage();
      if (invalid) {invalidateMortgage('Complete mortgage inputs'); error(invalid.message); if(options.focus) $(invalid.id)?.focus(); return null;}
      mortgageAbort?.abort(); mortgageAbort = new AbortController();
      const seq = ++mortgageSeq, payload = buildMortgageInput(), signature = JSON.stringify(payload);
      state.mortgage = null; renderMortgage(); renderBudget(); error('');
      emit('pcsunited:mortgage-invalidated', {mortgage:null});
      status('Calculating mortgage…'); $('btn-calc').disabled = true;
      try {
        const data = await post('/mortgage', payload, mortgageAbort);
        if (seq !== mortgageSeq || signature !== JSON.stringify(buildMortgageInput())) return null;
        state.mortgage = normalizeMortgageResult(data);
        renderMortgage(); renderBudget(); status('Estimate ready', 'ok');
        emit('pcsunited:mortgage-ready', {source:'pcsunited.mortgage.health', engine:'TheWing.ai', mortgage:state.mortgage, raw:data});
        emit('pcsunited:mortgage-health-ready', {source:'pcsunited.mortgage.health', version:VERSION, inputs:collectInputs(), calculationInputs:buildMortgageInput(), mortgage:state.mortgage, budget:state.mortgage.budget, income:state.income, residual:state.mortgage.budget?.remainder ?? null, residual_pct:state.mortgage.budget?.remainderPct ?? null, health:state.mortgage.budget?.complete ? 'Projected cash flow' : 'Needs budget inputs', buyer_range:{available:false}});
        return state.mortgage;
      } catch (e) {
        if (seq !== mortgageSeq) return null;
        state.mortgage = null; renderMortgage(); renderBudget(); status('Estimate unavailable', 'bad');
        error(e.name === 'AbortError' ? 'The mortgage request timed out. Please try again.' : e.message);
        return null;
      } finally { if(seq === mortgageSeq) $('btn-calc').disabled = false; }
    }
    function buildBrainInput() {
      const i = collectInputs(), b = base(i.base);
      return {source:'pcsunited.mortgage.' + VERSION, mode:'active_duty', rank:i.rank,
        rank_paygrade:i.rank, yos:i.yos, base:b?.api || '', selected_base:b?.api || '',
        has_dependents:i.dependents === 'with', hasDependents:i.dependents === 'with',
        dependents:i.dependents, familySize:i.familySize, family:i.familySize,
        zip:b?.snapshot?.zip || '', bah_zip:b?.snapshot?.zip || ''};
    }
    function payComplete() {
      const i = collectInputs(); return !!(i.rank && i.yos !== null && i.base && i.dependents);
    }
    function extractCompensation(data) {
      const p = data.payload || data.data || data.result || data;
      const truth = p.truth_packet || p.truthPacket || {};
      const c = p.compensation || p.comp || truth.compensation || {};
      const pay = p.pay || truth.pay || {}, m = c.monthly || p.monthly || truth.monthly || pay;
      const first = (...xs)=>xs.find(x=>typeof x === 'number' && Number.isFinite(x) && x >= 0) ?? null;
      const basePay = first(m.basicPay,m.basePay,m.base_pay,m.monthly_base_pay,pay.basePay,pay.basicPay,p.basePay,p.base_pay);
      const bah = first(m.bah,m.BAH,m.monthly_bah,pay.bah,p.bah);
      const bas = first(m.bas,m.BAS,m.monthly_bas,pay.bas,p.bas);
      if (!(basePay > 0) || bah === null || bas === null) throw new Error('The pay service did not return complete pay, BAH and BAS values for this profile.');
      return {basePay,bah,bas,total:basePay+bah+bas,source:'TheWing.ai',generatedAt:p.meta?.generatedAt || new Date().toISOString()};
    }
    function invalidatePay() {
      paySeq++; payAbort?.abort(); clearTimeout(payTimer); state.income = null; renderIncome();
      $('btn-fetch-pay').disabled = false;
    }
    async function fetchTheWingPay() {
      invalidatePay();
      if (!payComplete()) {text('compSource','Select rank, years, dependency status and a base.'); return null;}
      const seq = ++paySeq, body = buildBrainInput(), signature = JSON.stringify(body);
      payAbort = new AbortController(); text('compSource','Loading military compensation…'); $('btn-fetch-pay').disabled = true;
      try {
        const data = await post('/opensource-brain', {tool:'PCS_SNAPSHOT', input:body}, payAbort);
        if (seq !== paySeq || signature !== JSON.stringify(buildBrainInput())) return null;
        state.income = extractCompensation(data); renderIncome();
        emit('pcsunited:compensation-ready', {source:'pcsunited.mortgage.health', engine:'TheWing.ai', income:{...state.income,additional:Math.max(0,number(val('additionalIncome')) || 0),total:state.income.total+Math.max(0,number(val('additionalIncome')) || 0),lockedOfficial:true}, raw:data});
        return state.income;
      } catch (e) {
        if (seq !== paySeq) return null;
        state.income = null; renderIncome(); text('compSource',e.name === 'AbortError' ? 'Pay request timed out. Try again.' : e.message); return null;
      } finally {if(seq === paySeq) $('btn-fetch-pay').disabled = false;}
    }
    function renderMortgage() {
      const r = state.mortgage, m = r?.monthly, loan = r?.mortgage;
      for (const [id,key] of Object.entries({allInPayment:'allIn','hero-payment':'allIn',piPayment:'pi',taxMonthly:'tax',insuranceOut:'insurance',hoaOut:'hoa',pmiOut:'pmi'})) text(id,money(m?.[key]));
      text('loanAmount', loan ? money(loan.loanAmount) + ' loan' : '— loan');
      text('rateLine', loan ? loan.apr.toFixed(4).replace(/0+$/,'').replace(/\.$/,'') + '% interest • ' + loan.termYears + ' years' : 'Interest rate shown after calculation');
      text('mortgageSource', r ? 'TheWing.ai • ' + (r.aprSource === 'override' ? 'User-entered interest rate' : 'Credit-tier planning assumption; not a lender quote') : 'Complete the inputs to calculate.');
      text('totalInterestOut',money(r?.totals.totalInterest));
      text('scheduledPaymentsOut',money(r?.totals.scheduledHousingPayments));
      text('pmiDurationOut',r ? r.totals.pmiMonths + ' months projected' : '—');
      text('upfrontKnownOut',money(r?.upfrontKnown?.total));
      text('fundingFeeUpfrontOut',money(r?.upfrontKnown?.fundingFeePaidAtClosing));
      const notes = r?.meta?.warnings || [];
      text('mortgageWarnings',notes.join(' '));
      const va = val('loanType') === 'va'; $('vaReadinessPanel').hidden = !va;
      text('vaFundingFeeOut', r ? (r.fundingFeeExempt ? 'Exempt — $0.00' : money(r.vaFundingFee)) : '—');
      text('vaTotalLoanOut',money(r?.totalLoanAmount));
      text('vaReadinessNote',r ? 'Funding fee: ' + (r.fundingFeeExempt ? 'exempt' : r.financedFundingFee > 0 ? 'financed' : 'paid at closing') + '. Verify exemption and entitlement with your lender.' : 'Select fee treatment to calculate a VA purchase scenario.');
    }
    function renderIncome() {
      const i = state.income, extra = number(val('additionalIncome'));
      text('basePay',money(i?.basePay)); text('bah',money(i?.bah)); text('bas',money(i?.bas));
      text('additionalIncomeOut',money(extra));
      text('totalIncome',i && extra !== null && extra >= 0 && $('additionalIncome').checkValidity() ? money(i.total+extra) : money(i?.total));
      text('compSource',i ? i.source + ' • fetched ' + new Date(i.generatedAt).toLocaleDateString() : 'Optional pay reference — not take-home income.');
    }
    function renderBudget() {
      const b = state.mortgage?.budget;
      const complete = b?.complete === true;
      text('hero-income',money(b?.income)); text('healthObligations',money(b?.expenses));
      text('hero-residual',complete ? money(b.remainder) : '—');
      text('hero-health',!complete ? 'Needs budget inputs' : b.remainder < 0 ? 'Projected shortfall' : b.remainder === 0 ? 'No monthly remainder' : 'Projected remainder');
      text('hero-health-note',complete ? b.note : 'Enter take-home household income and all other monthly expenses to see the projected remainder.');
      const pct = complete && b.remainderPct !== null ? b.remainderPct.toFixed(1)+'%' : '—';
      text('residualPercent',pct); text('hero-residual-pct',pct);
      $('healthRing').style.setProperty('--pct',String(complete ? Math.max(0,Math.min(100,b.remainderPct || 0)) : 0));
      $('healthRing').style.setProperty('--ring-color',complete && b.remainder < 0 ? 'var(--danger)' : 'var(--mint)');
      text('verdictBox','Military compensation is a gross-pay reference. Your entered take-home household income is used separately for the budget, so BAH is not added twice.');
      for(const [id,key] of Object.entries({healthIncome:'income',healthMortgage:'housing',healthOutflow:'totalOutflow',healthResidual:'remainder'})) text(id,complete ? money(b[key]) : '—');
    }
    function renderProfile() {
      const i=collectInputs();
      $('profilePills').replaceChildren();
      [i.rank, i.yos === null ? null : i.yos+' years', base(i.base)?.name, i.dependents === 'with' ? 'With dependents' : i.dependents === 'without' ? 'Without dependents' : null].filter(Boolean).forEach(s=>{
        const pill=document.createElement('span'); pill.className='info-pill'; pill.textContent=s; $('profilePills').append(pill);
      });
      text('profileSyncStatus',state.profileConnected ? 'Connected to your shared PCS details.' : window.parent !== window ? 'Waiting for the page’s PCS profile connection. You can also enter details here.' : 'You can enter details here. To share Home/Stage 1 details, open this tool inside a connected PCSU page.');
    }
    function normalizeProfile(p) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
      return {rank:GRADES.includes(p.rank) ? p.rank : null,
        yos:Number.isInteger(p.yos) && p.yos >= 0 && p.yos <= 40 ? p.yos : null,
        hasDependents:typeof p.hasDependents === 'boolean' ? p.hasDependents : null,
        familySize:Number.isInteger(p.familySize) && p.familySize >= 1 && p.familySize <= 12 ? p.familySize : null,
        currentBaseKey:base(p.currentBaseKey)?.id || null, destinationBaseKey:base(p.destinationBaseKey)?.id || null};
    }
    function applyProfile(p) {
      const next=normalizeProfile(p); if(!next) return;
      const before=JSON.stringify(buildBrainInput());
      applying=true; state.profile=next; state.profileConnected=true;
      setValue('rank',next.rank); setValue('yos',next.yos);
      setValue('dependents',next.hasDependents === null ? null : next.hasDependents ? 'with' : 'without');
      setValue('familySize',next.familySize);
      setValue('base',next[val('baseRole') === 'current' ? 'currentBaseKey' : 'destinationBaseKey']);
      applying=false; updateConditional(); renderProfile();
      if (before !== JSON.stringify(buildBrainInput())) {invalidatePay(); if(payComplete()) payTimer=setTimeout(fetchTheWingPay,350);}
    }
    function publishPatch(patch) {
      if(applying) return;
      state.profile={...state.profile,...patch};
      if(window.PCSUProfile?.set) window.PCSUProfile.set(patch,'mortgage-calculator');
      else if(trustedParent) window.parent.postMessage({source:'pcsu-mortgage',type:'pcsu:mortgage-profile-update',version:1,patch},trustedParent);
      // Basic-profile persistence is owned by the existing PCSUProfile component.
    }
    function syncFromDirectProfile() { if(window.PCSUProfile?.get) applyProfile(window.PCSUProfile.get()); }
    window.addEventListener('pcsu:profile-ready',syncFromDirectProfile);
    window.addEventListener('pcsu:profile-change',e=>applyProfile(e.detail?.profile));
    window.addEventListener('message',e=>{
      if(e.source !== window.parent || !allowedParents.has(e.origin)) return;
      const d=e.data;
      if(!d || d.source !== 'pcsu-shared-profile' || d.type !== 'pcsu:profile-snapshot' || d.version !== 1) return;
      trustedParent=e.origin; applyProfile(d.profile);
    });
    function requestProfile() {
      if(window.PCSUProfile?.get) {syncFromDirectProfile(); return;}
      if(window.parent !== window) {
        try {const origin=new URL(document.referrer).origin;if(allowedParents.has(origin)) window.parent.postMessage({source:'pcsu-mortgage',type:'pcsu:mortgage-profile-ready',version:1},origin);} catch (_) {}
      }
      else {
        // Same-origin reuse only. Never read or persist detailed financial inputs.
        try {const saved=JSON.parse(sessionStorage.getItem('pcsu:journey-profile:v1') || 'null'); if(saved?.version===1) applyProfile(saved.profile);} catch (_) {}
      }
    }
    function updateConditional() {
      const va=val('loanType')==='va'; $('vaOptions').hidden=!va; $('pmiMonthly').disabled=va;
      const exempt=val('fundingFeeExempt')==='yes';
      $('priorUse').disabled=!va || exempt; $('financeFundingFee').disabled=!va || exempt;
      $('familySize').disabled=val('dependents')==='without';
    }
    function clearAll() {
      invalidateMortgage('Enter a mortgage scenario');
      for(const id of ['homePrice','downPayment','creditScore','interestRate','taxRate','insuranceMonthly','hoaMonthly','pmiMonthly','takeHomeMonthly','monthlyObligations','additionalIncome','priorUse','fundingFeeExempt','financeFundingFee']) setValue(id,null);
      setValue('loanType','va'); setValue('termYears','30'); updateConditional(); error('');renderIncome();
    }
    root.addEventListener('input',e=>{
      if(e.target.tagName !== 'INPUT') return;
      if(e.target.id==='additionalIncome') {renderIncome();return;}
      scheduleMortgage();
    });
    root.addEventListener('change',e=>{
      const id=e.target.id;
      if(['rank','yos','base','dependents','familySize'].includes(id)) {
        const i=collectInputs(); let patch={};
        if(id==='rank') patch.rank=i.rank;
        if(id==='yos') patch.yos=i.yos;
        if(id==='base') patch[i.baseRole==='current' ? 'currentBaseKey' : 'destinationBaseKey']=i.base;
        if(id==='dependents') {patch.hasDependents=i.dependents ? i.dependents==='with' : null; patch.familySize=patch.hasDependents===false ? 1 : null; setValue('familySize',patch.familySize);}
        if(id==='familySize') patch.familySize=i.familySize;
        publishPatch(patch);updateConditional();renderProfile();invalidatePay();if(payComplete()) payTimer=setTimeout(fetchTheWingPay,350);
      } else if(id==='baseRole') {applyProfile(state.profile);renderProfile();}
      else if(e.target.tagName==='SELECT') {updateConditional();scheduleMortgage();}
    });
    $('btn-calc').addEventListener('click',()=>fetchTheWingMortgage({focus:true}));
    $('btn-fetch-pay').addEventListener('click',fetchTheWingPay);
    $('btn-clear').addEventListener('click',clearAll);
    updateConditional(); renderMortgage();renderIncome();renderBudget();renderProfile();status('Enter a mortgage scenario');requestProfile();
    window.PCSU_MORTGAGE_HEALTH=Object.freeze({version:VERSION,state,collectInputs,buildBrainInput,extractCompensation,normalizeMortgageResult,
      computeHealth:()=>state.mortgage?.budget || {complete:false}, computeBuyerRange:()=>({available:false,note:'No purchase range is inferred.'}),
      renderAll:()=>{renderMortgage();renderIncome();renderBudget();renderProfile();},fetchTheWingPay,fetchTheWingMortgage,
      calculateFullTheWingFlow:()=>Promise.all([fetchTheWingMortgage({focus:true}),payComplete()?fetchTheWingPay():Promise.resolve(null)]),clearAll});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
