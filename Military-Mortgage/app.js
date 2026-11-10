/* PCSUnited Military Mortgage v1.1.0 — thin client; TheWing backend calculates. */
(() => {
  'use strict';
  const root = document.getElementById('pcsu-financial-input-panel');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const CONTRACT = 'military-mortgage-v1';
  const $ = id => root.querySelector(`#${id}`);
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const headlineMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const fields = {
    homePrice: 'fi-home-price', downPayment: 'fi-down-payment', creditScore: 'fi-credit-score',
    interestRate: 'fi-interest-rate', termYears: 'fi-term-years', propertyTaxAnnual: 'fi-property-tax',
    insuranceAnnual: 'fi-insurance', hoaMonthly: 'fi-hoa', otherOwnershipMonthly: 'fi-other-costs',
    closingCosts:'fi-closing-costs', prepaidsEscrow:'fi-prepaids', cashAvailable:'fi-cash-available', moveInCosts:'fi-move-in',
    pmiMonthly: 'fi-pmi', loanType: 'fi-loan-type', vaFeeStatus: 'fi-va-fee-status', feePayment: 'fi-fee-payment'
  };
  const selectors = new Set(['loanType', 'vaFeeStatus', 'feePayment']);
  const sliders = ['home-price', 'down-payment', 'credit-score', 'emergency-fund'];
  let revision = 0, controller = null, timer = null, result = null, currentInput = null;
  let touched = false, homeTouched = false, reserveTouched = false, basicBrain = null, comp = null, market = null;

  function readNumber(element) {
    const value = element.value.trim() === '' ? null : Number(element.value);
    return value !== null && Number.isFinite(value) ? value : null;
  }
  function capture() {
    const data = { contract: CONTRACT };
    for (const [key, id] of Object.entries(fields)) data[key] = selectors.has(key) ? $(id).value : readNumber($(id));
    if (data.loanType !== 'CONVENTIONAL') data.pmiMonthly = null;
    return data;
  }
  function showState(state, message) {
    root.dataset.state = state;
    $('fi-total-cost-source').textContent = message;
    $('fi-total-monthly-cost').textContent = state === 'ready' ? headlineMoney(result.monthly.totalHousing) : '—';
    $('fi-total-monthly-cost').title = state === 'ready' ? `${money(result.monthly.totalHousing)} / month; rounded here to the nearest dollar.` : '';
    $('fi-result-details').hidden = state !== 'ready';
    $('fi-breakdown-status').hidden = state === 'ready';
    $('fi-breakdown-status').textContent = message;
    $('fi-retry').hidden = state !== 'error';
  }
  function markInvalid(element, message) {
    element.setAttribute('aria-invalid', 'true');
    element.setAttribute('aria-describedby', 'fi-total-cost-source');
    if (element.closest('details')) {
      element.closest('details').open = true;
      window.dispatchEvent(new CustomEvent('pcsunited:mortgage-view-request', { detail: { view: 'summary', focus: false } }));
    }
    showState('invalid', message);
  }
  function validate() {
    for (const [key, id] of Object.entries(fields)) {
      const el = $(id);
      el.removeAttribute('aria-invalid');
      if (key === 'pmiMonthly' && currentInput.loanType !== 'CONVENTIONAL') continue;
      if (selectors.has(key)) continue;
      const optional = ['pmiMonthly','closingCosts','prepaidsEscrow','cashAvailable','moveInCosts'].includes(key);
      el.required = !optional;
      if ((!optional && readNumber(el) === null) || !el.checkValidity()) {
        const label = root.querySelector(`label[for="${id}"]`).childNodes[0].textContent.trim();
        markInvalid(el, `Enter a valid ${label.toLowerCase()}.`);
        return false;
      }
    }
    if (currentInput.downPayment > currentInput.homePrice) {
      markInvalid($('fi-down-payment'), 'Down payment cannot exceed the home price.');
      return false;
    }
    return true;
  }
  function paintSlider(name) {
    const el = $(`fi-${name}-slider`);
    const percent = (Number(el.value) - Number(el.min)) / (Number(el.max) - Number(el.min)) * 100;
    $(`fi-${name}-fill`).style.width = `${percent}%`;
    $(`fi-${name}-knob`).style.left = `${percent}%`;
    el.setAttribute('aria-valuetext', name === 'down-payment' ? `${el.value}% down` : name === 'credit-score' ? el.value : money(Number(el.value)));
  }
  function syncSliders() {
    for (const name of sliders) {
      const slider = $(`fi-${name}-slider`);
      let value = readNumber($(`fi-${name}`));
      if (name === 'down-payment') {
        const price = readNumber($('fi-home-price'));
        value = price > 0 && value !== null ? value / price * 100 : 0;
        slider.max = value > 20 ? '100' : '20';
        const labels = slider.closest('.fi-slider-wrap').querySelectorAll('.fi-slider-scale span');
        labels[1].textContent = value > 20 ? '50%' : '10%';
        labels[2].textContent = value > 20 ? '100%' : '20%';
        $('fi-down-payment-pct').textContent = `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}% of price`;
      }
      slider.value = String(Math.min(Number(slider.max), Math.max(Number(slider.min), value ?? Number(slider.min))));
      paintSlider(name);
    }
  }
  function syncLabels() {
    const data = currentInput;
    $('fi-va-options').hidden = data.loanType !== 'VA';
    $('fi-fee-options').hidden = data.loanType === 'CONVENTIONAL' || (data.loanType === 'VA' && data.vaFeeStatus === 'exempt');
    $('fi-pmi-options').hidden = data.loanType !== 'CONVENTIONAL';
    $('fi-rate-label').textContent = data.interestRate === null ? 'Set rate in Summary' : `Planning rate: ${data.interestRate.toFixed(2)}%`;
    const text = value => value === null ? 'not entered' : money(value);
    const fee = data.loanType === 'VA'
      ? `VA ${data.vaFeeStatus === 'exempt' ? 'fee exemption selected' : `${data.vaFeeStatus === 'first' ? 'first' : 'subsequent'} use; fee ${data.feePayment === 'finance' ? 'financed' : 'paid at closing'}`}`
      : data.loanType === 'FHA' ? `FHA upfront MIP ${data.feePayment === 'finance' ? 'financed' : 'paid at closing'}` : 'Conventional loan';
    $('fi-assumptions-summary').textContent = `Scenario assumptions: ${data.interestRate ?? '—'}% fixed interest · ${data.termYears} years · ${text(data.propertyTaxAnnual)} annual tax · ${text(data.insuranceAnnual)} annual insurance · ${text(data.hoaMonthly)} monthly HOA · ${text(data.otherOwnershipMonthly)} other monthly costs. ${fee}. Edit below.`;
  }
  function handoff() {
    const reserve = readNumber($('fi-emergency-fund'));
    const validReserve = reserveTouched && reserve !== null && $('fi-emergency-fund').checkValidity() ? reserve : null;
    return {
      source: 'PCSUnited-Military-Mortgage', version: '1.1.0', status: root.dataset.state,
      ready: root.dataset.state === 'ready', revision, ...clone(currentInput || capture()),
      totalMonthlyHousingCost: result?.monthly.totalHousing ?? null,
      mortgagePayment: result?.monthly.mortgagePayment ?? null,
      mortgageEstimate: result ? clone(result) : null,
      emergencyFund: validReserve, emergencyFundBasis: 'after-closing', emergencyFundUserEntered: reserveTouched,
      hasUserInteracted: touched
    };
  }
  function emit() {
    const detail = handoff();
    window.dispatchEvent(new CustomEvent('pcsunited:financial-input-updated', { detail: clone(detail) }));
    window.dispatchEvent(new CustomEvent(touched ? 'pcsunited:mortgage-input-updated' : 'pcsunited:mortgage-input-preloaded', { detail: clone(detail) }));
  }
  function renderRows(id, rows) {
    const target = $(id);
    target.replaceChildren();
    for (const [label, value] of rows) {
      const line = document.createElement('div'); line.className = 'fi-line';
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = money(value);
      line.append(dt, dd); target.append(line);
    }
  }
  function renderResult() {
    const m = result.monthly, loan = result.loan;
    const calculated=result.upfront.cashPlanStarted;
    $('fi-emergency-fund').disabled=calculated;
    $('fi-emergency-fund-slider').disabled=calculated;
    if(calculated){
      if(!Object.hasOwn($('fi-emergency-fund').dataset,'manualValue')) $('fi-emergency-fund').dataset.manualValue=$('fi-emergency-fund').value;
      $('fi-emergency-fund').value=result.upfront.reservesAfterPurchase??'';
    }else if(Object.hasOwn($('fi-emergency-fund').dataset,'manualValue')){
      $('fi-emergency-fund').value=$('fi-emergency-fund').dataset.manualValue;delete $('fi-emergency-fund').dataset.manualValue;
    }
    $('fi-emergency-fund').closest('.fi-field').querySelector('.fi-hint').textContent=calculated
      ? 'Calculated from Summary → Cash needed to buy this home. Complete those fields to see cash remaining.'
      : 'Enter cash expected after all purchase and moving costs, or calculate it under Summary → Cash needed to buy this home.';
    syncSliders();
    renderRows('fi-monthly-breakdown', [
      ['Principal & interest', m.principalInterest], ['Property taxes', m.propertyTax],
      ['Homeowners insurance', m.insurance], ['HOA', m.hoa],
      [currentInput.loanType === 'FHA' ? 'FHA MIP · first year' : 'Mortgage insurance', m.mortgageInsurance],
      ['Mortgage + tax, insurance & HOA', m.mortgagePayment], ['Other ownership costs', m.otherOwnership],
      ['Total monthly housing cost', m.totalHousing]
    ]);
    renderRows('fi-loan-breakdown', [
      ['Base loan', loan.baseLoan], [loan.feeLabel, loan.fee], ['Fee financed', loan.financedFee],
      ['Total loan amount', loan.loanAmount], ['Down payment', result.upfront.downPayment],
      ['Loan fee paid at closing', loan.feePaidAtClosing], ['Down payment + cash loan fee', result.upfront.knownSubtotal]
    ]);
    $('fi-upfront-note').textContent = result.upfront.excludes;
    $('fi-mi-note').textContent = result.mortgageInsurance.note;
    $('fi-program-note').textContent = result.notes.join(' ');
    showState('ready', `${touched ? 'TheWing estimate' : 'Example estimate'} · includes assumed costs & loan fees`);
    emit();
  }
  function validResponse(data, input) {
    if (!data?.ok || data.contract !== CONTRACT || !data.monthly || !data.loan || !data.inputs || !data.upfront) return false;
    const numberKeys = ['principalInterest','propertyTax','insurance','hoa','mortgageInsurance','otherOwnership','mortgagePayment','totalHousing'];
    if (!numberKeys.every(k => typeof data.monthly[k] === 'number' && Number.isFinite(data.monthly[k]) && data.monthly[k] >= 0)) return false;
    const m = data.monthly;
    if (Math.abs(m.principalInterest + m.propertyTax + m.insurance + m.hoa + m.mortgageInsurance - m.mortgagePayment) > 0.011 || Math.abs(m.mortgagePayment + m.otherOwnership - m.totalHousing) > 0.011) return false;
    for (const key of ['loanType','homePrice','downPayment','interestRate','termYears','creditScore','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly','closingCosts','prepaidsEscrow','cashAvailable','moveInCosts']) {
      if (data.inputs[key] !== input[key]) return false;
    }
    if (input.loanType === 'VA' && data.inputs.vaFeeStatus !== input.vaFeeStatus) return false;
    if (input.loanType !== 'CONVENTIONAL' && data.inputs.feePayment !== input.feePayment) return false;
    return ['baseLoan','financedFee','loanAmount','fee','feePaidAtClosing'].every(k => Number.isFinite(data.loan[k]) && data.loan[k] >= 0)
      && ['downPayment','feePaidAtClosing','knownSubtotal'].every(k => typeof data.upfront[k] === 'number' && Number.isFinite(data.upfront[k]) && data.upfront[k] >= 0)
      && Math.abs(data.loan.baseLoan + data.loan.financedFee - data.loan.loanAmount) < 0.011
      && Math.abs(data.loan.fee - data.loan.financedFee - data.loan.feePaidAtClosing) < 0.011
      && typeof data.upfront.excludes === 'string'
      && typeof data.mortgageInsurance?.note === 'string' && Array.isArray(data.notes) && data.notes.every(n => typeof n === 'string');
  }
  async function calculate(token, payload) {
    controller = new AbortController();
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), 12000);
    try {
      const response = await fetch(root.dataset.mortgageApi || '/api/mortgage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', cache: 'no-store',
        body: JSON.stringify(payload), signal: requestController.signal
      });
      const data = await response.json();
      if (token !== revision) return;
      if (!response.ok) {
        if (response.status === 400 && data.field && fields[data.field]) {
          markInvalid($(fields[data.field]), data.error || 'Review your mortgage details.');
          emit(); return;
        }
        throw new Error('unavailable');
      }
      if (!validResponse(data, payload)) throw new Error('unsupported response');
      result = data;
      renderResult();
    } catch (_) {
      if (token !== revision) return;
      result = null;
      showState('error', 'Calculation unavailable. Your entries are kept here. Please retry.');
      emit();
    } finally {
      clearTimeout(timeout);
      if (controller === requestController) controller = null;
    }
  }
  function refresh(immediate = false) {
    // Invalidate before debounce so a response for an older slider value cannot land.
    revision++;
    clearTimeout(timer);
    controller?.abort(); controller = null;
    result = null;
    currentInput = capture();
    if(Object.hasOwn($('fi-emergency-fund').dataset,'manualValue')) $('fi-emergency-fund').value='';
    syncSliders(); syncLabels();
    if (!validate()) { emit(); return; }
    showState('pending', 'Updating your housing estimate…');
    emit();
    const token = revision, payload = clone(currentInput);
    timer = setTimeout(() => calculate(token, payload), immediate ? 0 : 220);
  }
  for (const [key, id] of Object.entries(fields)) {
    $(id).addEventListener(selectors.has(key) || key === 'termYears' ? 'change' : 'input', () => {
      touched = true; if (key === 'homePrice') homeTouched = true;
      refresh();
    });
  }
  for (const name of sliders) {
    $(`fi-${name}-slider`).addEventListener('input', () => {
      touched = true;
      const value = Number($(`fi-${name}-slider`).value);
      if (name === 'down-payment') {
        const price = readNumber($('fi-home-price'));
        if (!(price > 0)) return;
        $('fi-down-payment').value = (price * value / 100).toFixed(2);
      } else $(`fi-${name}`).value = String(value);
      if (name === 'home-price') homeTouched = true;
      if (name === 'emergency-fund') { reserveTouched = true; syncSliders(); emit(); } else refresh();
    });
  }
  $('fi-emergency-fund').addEventListener('input', () => {
    touched = true; reserveTouched = true; syncSliders();
    $('fi-emergency-fund').setAttribute('aria-invalid', String(!$('fi-emergency-fund').checkValidity()));
    emit();
  });
  $('fi-retry').addEventListener('click', () => refresh(true));

  function setInputs(values = {}) {
    for (const [key,id] of Object.entries(fields)) {
      if (Object.hasOwn(values,key)) $(id).value = values[key] === null ? '' : String(values[key]);
    }
    if (Object.hasOwn(values,'emergencyFund')) { $('fi-emergency-fund').value = values.emergencyFund ?? ''; reserveTouched = true; }
    touched = true; homeTouched = true; refresh(true);
  }
  // Existing hosts can consume events and this in-memory API. No financial data is persisted.
  const api = Object.freeze({ version: '1.1.0', getInputs: handoff, setInputs,
    refresh: () => refresh(true), refreshAndEmit: () => refresh(true), refreshMortgageEstimate: () => refresh(true),
    getBasicBrain: () => basicBrain ? clone(basicBrain) : null,
    getComp: () => comp ? clone(comp) : null, getMarketIntent: () => market ? clone(market) : null,
    hasUserInteracted: () => touched, markUserInteraction: () => { touched = true; },
    saveHandoff: () => { emit(); return handoff(); }
  });
  window.PCSU_FINANCIAL_INPUT_PANEL = api;
  window.PCSUnitedMilitaryMortgage = api;
  ['pcsunited:basicbrain-updated','pcsunited:profile-ready','pcsunited:bridge-ready'].forEach(name => window.addEventListener(name, event => {
    if (event.detail && typeof event.detail === 'object') basicBrain = clone(event.detail);
  }));
  ['pcsunited:compensation-ready','pcsunited:compensation-preview-ready'].forEach(name => window.addEventListener(name, event => {
    if (event.detail && typeof event.detail === 'object') comp = clone(event.detail);
  }));
  window.addEventListener('pcsunited:market-panel-ready', event => {
    market = event.detail && typeof event.detail === 'object' ? clone(event.detail) : null;
    const price = market?.suggestedHomePrice ?? market?.typicalBuy ?? market?.medianList;
    if (!homeTouched && typeof price === 'number' && Number.isFinite(price) && price > 0 && price <= 10000000) {
      $('fi-home-price').value = price.toFixed(2); refresh();
    }
  });
  refresh(true);
})();
