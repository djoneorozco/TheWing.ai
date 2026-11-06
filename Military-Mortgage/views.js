/* Presentation only. Every mortgage amount comes from the verified calculator snapshot. */
(() => {
  'use strict';
  const root = document.getElementById('pcsu-financial-input-panel');
  if (!root || window.PCSUnitedMortgageViews) return;
  const $ = id => root.querySelector('#' + id);
  const api = () => window.PCSUnitedMilitaryMortgage;
  const views = ['calculator', 'visualization', 'summary'];
  const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(n);
  const percent = n => new Intl.NumberFormat('en-US', {style:'percent',maximumFractionDigits:1}).format(n);
  let view = 'calculator', selected = null, snapshot = null, lastHeight = 0, sizeFrame = 0, forceState = false;
  let parentOrigin = null;
  try { if (window.parent !== window && document.referrer) parentOrigin = new URL(document.referrer).origin; } catch (_) { /* No parent bridge without a valid origin. */ }

  function sendState(force = false) {
    forceState = forceState || force;
    // Cross-origin iframes below the fold can have animation frames suspended.
    // Readiness must reach external controls before the user scrolls to the frame.
    clearTimeout(sizeFrame);
    sizeFrame = setTimeout(() => {
      const height = Math.ceil(document.body.getBoundingClientRect().height);
      if (parentOrigin && (forceState || height !== lastHeight)) {
        window.parent.postMessage({source:'pcsunited-military-mortgage', type:'view-state', view,
          height, ready:true}, parentOrigin);
      }
      lastHeight = height; forceState = false;
    }, 0);
  }
  function setView(next, focus = true) {
    if (!views.includes(next)) return false;
    view = next;
    root.dataset.view = view;
    root.querySelectorAll('[data-mm-screen]').forEach(screen => { screen.hidden = screen.dataset.mmScreen !== view; });
    if (focus) {
      const target = view === 'calculator' ? $('fi-home-price') : $(view === 'summary' ? 'mm-summary-title' : 'mm-viz-title');
      target?.focus({preventScroll:true});
    }
    window.dispatchEvent(new CustomEvent('pcsunited:mortgage-view-changed', {detail:{view}}));
    sendState(true);
    return true;
  }
  function text(id, content) { $(id).textContent = content; }
  function validTerm(r) {
    const a = r.amortization;
    return a && ['principal','totalInterest','totalPaymentsPI','months'].every(k => typeof a[k] === 'number' && Number.isFinite(a[k]) && a[k] >= 0)
      && Math.abs(a.principal - r.loan.loanAmount) < .011 && a.months === r.inputs.termYears * 12
      && Math.abs(a.principal + a.totalInterest - a.totalPaymentsPI) < .02;
  }
  function paymentParts(r) {
    return [
      ['principalInterest','Principal & interest','#e5b571'],
      ['propertyTax','Property taxes','#73d4ba'],
      ['insurance','Homeowners insurance','#7aa9df'],
      ['hoa','HOA','#b8a0e1'],
      ['mortgageInsurance',r.inputs.loanType === 'FHA' ? 'FHA MIP · first year' : 'Mortgage insurance','#e691aa'],
      ['otherOwnership','Other ownership costs','#a8b2c4']
    ].map(([key,label,color]) => ({key,label,color,value:r.monthly[key]}));
  }
  function renderDonut(r) {
    const parts = paymentParts(r), total = r.monthly.totalHousing;
    let offset = 0;
    const stops = parts.map(p => {
      const start = offset; offset += total > 0 ? p.value / total * 100 : 0;
      return `${p.color} ${start}% ${offset}%`;
    });
    $('mm-donut').style.background = total > 0 ? `conic-gradient(${stops.join(',')})` : '#39454c';
    $('mm-donut').setAttribute('aria-label', `Monthly housing cost ${money(total)}. ${parts.map(p => `${p.label}: ${money(p.value)}`).join('; ')}.`);
    const active = parts.find(p => p.key === selected);
    text('mm-donut-label', active ? active.label : 'Total / month');
    text('mm-donut-total', money(active ? active.value : total));
    text('mm-donut-share', active ? `${percent(total > 0 ? active.value / total : 0)} of monthly cost` : 'Estimated housing cost');
    const legend = $('mm-legend');
    // Retain focused buttons across live updates and selections.
    if (!legend.children.length) {
      parts.forEach(p => {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.cost = p.key;
        const dot = document.createElement('i'); dot.className = 'mm-dot'; dot.style.background = p.color; dot.setAttribute('aria-hidden','true');
        const label = document.createElement('span'); label.className = 'mm-cost-label';
        const amount = document.createElement('strong');
        button.append(dot,label,amount); legend.append(button);
        button.addEventListener('click', () => {
          selected = selected === p.key ? null : p.key;
          if (snapshot?.ready && snapshot.mortgageEstimate) renderDonut(snapshot.mortgageEstimate);
        });
      });
    }
    parts.forEach(p => {
      const button = legend.querySelector(`[data-cost="${p.key}"]`);
      button.querySelector('span').textContent = p.label;
      button.querySelector('strong').textContent = money(p.value);
      button.setAttribute('aria-pressed', String(selected === p.key));
    });
  }
  function renderTerm(r) {
    const supported = validTerm(r), a = r.amortization;
    $('mm-term-ready').hidden = !supported;
    $('mm-term-unavailable').hidden = supported;
    text('mm-term-description', `${r.inputs.termYears} years at ${r.inputs.interestRate}% fixed interest.`);
    if (supported) {
      text('mm-term-total', money(a.totalPaymentsPI));
      text('mm-principal', money(a.principal)); text('mm-interest', money(a.totalInterest));
      const bar = $('mm-term-bar'); bar.replaceChildren();
      [['Principal',a.principal,'#e5b571'],['Interest',a.totalInterest,'#73d4ba']].forEach(([label,value,color]) => {
        const segment = document.createElement('span'); segment.style.width = `${a.totalPaymentsPI > 0 ? value/a.totalPaymentsPI*100 : 0}%`;
        segment.style.background = color; segment.title = `${label}: ${money(value)}`; bar.append(segment);
      });
      bar.setAttribute('aria-label', `Total principal ${money(a.principal)} and interest ${money(a.totalInterest)} over ${a.months} scheduled payments.`);
    }
    text('mm-upfront', money(r.upfront.knownSubtotal)); text('mm-upfront-exclusions', r.upfront.excludes);
  }
  function renderSummary(r) {
    const i = r.inputs, loan = r.loan;
    text('mm-summary-total', money(r.monthly.totalHousing));
    text('mm-summary-price', money(i.homePrice)); text('mm-summary-loan', money(loan.loanAmount));
    text('mm-summary-reserve', snapshot.emergencyFund === null ? 'Not entered' : money(snapshot.emergencyFund));
    const program = {VA:'VA',FHA:'FHA',CONVENTIONAL:'conventional'}[i.loanType];
    text('mm-summary-explanation', loan.loanAmount > 0
      ? `For a ${money(i.homePrice)} home with ${money(i.downPayment)} down, this ${i.termYears}-year ${program} scenario uses ${i.interestRate}% fixed interest. Your monthly estimate combines the loan payment with the housing costs listed below.`
      : `Your down payment covers the home price. There is no loan payment; the monthly estimate shows the ongoing housing costs entered.`);
    text('mm-summary-fee', loan.fee > 0
      ? `${loan.feeLabel}: ${money(loan.fee)}. ${loan.financedFee > 0 ? `${money(loan.financedFee)} is included in the loan amount and monthly principal and interest.` : 'It is paid at closing and is not included in the financed loan.'}`
      : `${loan.feeLabel}: ${money(loan.fee)} for this scenario.`);
  }
  function render() {
    snapshot = api()?.getInputs() || null;
    const ready = !!(snapshot?.ready && snapshot.mortgageEstimate);
    root.querySelectorAll('[data-mm-result]').forEach(node => { node.hidden = !ready; });
    root.querySelectorAll('[data-mm-status]').forEach(node => {
      node.replaceChildren(); node.hidden = ready;
      if (!ready) {
        node.append(document.createTextNode($('fi-total-cost-source').textContent || 'Waiting for the calculator…'));
        if (snapshot?.status === 'error') {
          const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry calculation';
          retry.addEventListener('click', () => api()?.refresh()); node.append(retry);
        } else if (snapshot?.status === 'invalid') {
          const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Review entries';
          edit.addEventListener('click', () => {
            const field = root.querySelector('[aria-invalid="true"]');
            setView(field?.closest('#fi-view-summary') ? 'summary' : 'calculator', false);
            field?.focus();
          }); node.append(edit);
        }
      }
    });
    if (ready) { renderDonut(snapshot.mortgageEstimate); renderTerm(snapshot.mortgageEstimate); renderSummary(snapshot.mortgageEstimate); }
    sendState();
  }
  root.addEventListener('click', e => {
    const button = e.target.closest('[data-mm-view]');
    if (button) setView(button.dataset.mmView);
  });
  window.addEventListener('pcsunited:financial-input-updated', render);
  window.addEventListener('pcsunited:mortgage-view-request', e => setView(e.detail?.view, e.detail?.focus !== false));
  window.addEventListener('message', e => {
    if (!parentOrigin || e.source !== window.parent || e.origin !== parentOrigin || e.data?.source !== 'pcsunited-mortgage-controls') return;
    if (e.data.type === 'set-view') setView(e.data.view);
    else if (e.data.type === 'get-state') sendState(true);
  });
  window.PCSUnitedMortgageViews = Object.freeze({version:'1.1.0',setView,getView:()=>view});
  new ResizeObserver(() => sendState()).observe(document.body);
  window.addEventListener('resize', () => sendState());
  window.dispatchEvent(new CustomEvent('pcsunited:mortgage-views-ready'));
  render(); setView('calculator', false);
})();
