/* Section 04: memory-only handoff to the user's Financial Analysis tab. */
(() => {
  'use strict';
  function init() {
    const link = document.getElementById('pcsu-analysis-link');
    if (!link || link.dataset.analysisBridge === '1') return;
    link.dataset.analysisBridge = '1';
    const budgetFrame = document.getElementById('pcsu-budget-frame');
    const mortgageFrame = document.getElementById('pcsu-mortgage-frame');
    const destination = new URL(link.href), appOrigin = new URL(budgetFrame?.src || 'https://thewing.netlify.app').origin;
    let analysisWindow = null, receiverId = null, revision = 0, budget = null, mortgage = null;
    let budgetRevision = -1, mortgageRevision = -1;
    const message = document.createElement('p');
    message.id = 'pcsu-analysis-status'; message.setAttribute('role','status'); message.hidden = true;
    message.style.cssText = 'margin:8px 10px;color:#17334d;font:13px/1.5 Arial,sans-serif';
    link.parentElement.append(message);
    function status(text) { message.textContent = text; message.hidden = !text; }
    function pick(value, keys) { return Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key,value[key]])); }
    function small(value) { try { return value && JSON.stringify(value).length < 80000; } catch (_) { return false; } }
    function income() {
      const value = window.PCSU_FINANCIAL_INCOME?.getSnapshot?.();
      if (!value) return null;
      const snapshot=pick(value,['schemaVersion','complete','status','audience','entryMethod','currency','period','containsEstimates','grossMonthlyIncome','monthlyDeductions','netMonthlyIncome','monthlySavingsContributions','availableAfterSavings','capitalReservesTotal']);
      snapshot.sources=Array.isArray(value.sources)?value.sources.slice(0,50).map(source=>pick(source,['label','amount','basis'])):[];
      return snapshot;
    }
    function send() {
      if (!analysisWindow || analysisWindow.closed || !receiverId) return;
      analysisWindow.postMessage({source:'pcsu-analysis-launch',version:1,type:'pcsu:analysis-context',requestId:receiverId,revision:++revision,
        context:{version:1,income:income(),mortgage,budget}},destination.origin);
    }
    function requestBudget() {
      budgetFrame?.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:finance-analysis-request',requestId:crypto.randomUUID()},appOrigin);
    }
    function requestFrames() {
      mortgageFrame?.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:mortgage-budget-request'},appOrigin);
      requestBudget();
    }
    function open(event) {
      event.preventDefault();
      if (analysisWindow && !analysisWindow.closed) { analysisWindow.focus(); send(); requestFrames(); return; }
      receiverId = null;
      analysisWindow = window.open(destination.href,'pcsu-analysis-'+crypto.randomUUID());
      if (!analysisWindow) { status('Allow a new tab to open your analysis. Your entries remain on this page.'); return; }
      status('Financial Analysis opens in a new tab. Keep this page open to keep your figures connected.');
      requestFrames();
    }
    link.addEventListener('click',open);
    link.addEventListener('auxclick',event => { if (event.button === 1) open(event); });
    window.addEventListener('message',event => {
      const data = event.data;
      if (!data || data.version !== 1) return;
      if (event.source === analysisWindow && event.origin === destination.origin && data.source === 'pcsu-analysis-page'
          && data.type === 'pcsu:analysis-ready' && typeof data.requestId === 'string' && data.requestId.length <= 100) {
        receiverId = data.requestId; send(); requestFrames(); return;
      }
      if (event.origin !== appOrigin) return;
      if (event.source === budgetFrame?.contentWindow && data.source === 'pcsu-finance') {
        if (data.type === 'pcsu:finance-ready') { requestBudget(); return; }
        const value = data.snapshot;
        if (data.type !== 'pcsu:finance-analysis-state' || !small(value) || !Number.isInteger(value.revision) || value.revision < budgetRevision) return;
        budgetRevision = value.revision; budget = value; send();
      }
      if (event.source === mortgageFrame?.contentWindow && data.source === 'pcsu-mortgage-budget' && data.type === 'pcsu:mortgage-budget-state') {
        const value = data.snapshot;
        if (!value || !Number.isInteger(value.revision) || value.revision < mortgageRevision) return;
        mortgageRevision = value.revision;
        mortgage = pick(value,['ready','status','revision','homePrice','downPayment','creditScore','interestRate','termYears','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly','loanType','vaFeeStatus','feePayment','emergencyFund','emergencyFundBasis','emergencyFundUserEntered','hasUserInteracted']);
        budget = null; send(); requestBudget();
      }
    });
    window.addEventListener('pcsu:financial-income-change',() => { budget = null; send(); requestBudget(); });
    budgetFrame?.addEventListener('load',() => { budgetRevision = -1; budget = null; send(); requestBudget(); });
    mortgageFrame?.addEventListener('load',() => { mortgageRevision = -1; mortgage = null; budget = null; send(); requestFrames(); });
    requestFrames();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
