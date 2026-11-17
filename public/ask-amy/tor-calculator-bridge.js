/* Explicit TOR embedding only; no storage, wildcard origins, or automatic AI calls. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('amy') !== 'tor' || parent === window) return;
  let origin;
  try {origin = new URL(document.referrer).origin;} catch (_) {return;}
  const local = ['localhost','127.0.0.1'].includes(location.hostname) && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin !== 'https://orozcorealty.webflow.io' && !local) return;
  const tool = /\/Finance-UX\//i.test(location.pathname) ? 'finance' : /\/(?:Mortgage-Calculator|Military-Mortgage)\//i.test(location.pathname) ? 'mortgage' : null;
  if (!tool) return;
  const military = /\/Military-Mortgage\//i.test(location.pathname);
  let revision = 0, snapshot = null;
  const post = () => parent.postMessage({source:'tor-calculator',version:1,type:'tor:calculator-context',tool,revision,snapshot},origin);
  const pick = (o,keys) => Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));
  function invalidate(){revision++;snapshot=null;post();}
  function readMilitary(){
    const d=window.PCSUnitedMilitaryMortgage?.getInputs();
    snapshot=d?.ready===true && d.status==='ready' && d.mortgageEstimate?.contract==='military-mortgage-v1'
      ? {inputs:pick(d,['contract','homePrice','downPayment','creditScore','interestRate','termYears','loanType','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly','vaFeeStatus','feePayment','closingCosts','prepaidsEscrow','cashAvailable','moveInCosts']),result:{monthly:{...d.mortgageEstimate.monthly,allIn:d.mortgageEstimate.monthly.totalHousing}}}
      : null;
    revision++;post();
  }
  if(military) window.addEventListener('pcsunited:financial-input-updated',readMilitary);
  window.addEventListener(tool==='finance'?'pcsunited:financial-invalidated':'pcsunited:mortgage-invalidated',invalidate);
  window.addEventListener(tool==='finance'?'pcsunited:financial-updated':'pcsunited:mortgage-health-ready',e=>{
    const d=e.detail;
    if(tool==='finance'){
      const state=window.PCSUnitedFinancial?.getState();
      if(!state||d?.version!=='finance-budget-v1')return;
      const inputs=pick(state,['grossMonthly','netMonthly','savingsMonthly','emergencyFund','bufferMonthly','extraBufferMonthly','reviewed','scenario']);
      inputs.items=Object.values(state.categories).flat().map(x=>({...pick(x,['id','value','category','essential','housing','continues']),minimumPayment:x.minimumPayment??x.value}));
      snapshot={inputs,result:{reviewed:d.reviewed,metrics:d.metrics,affordability:d.affordability}};
    }else{
      if(!d?.calculationInputs||!d.mortgage?.monthly)return;
      snapshot={inputs:d.calculationInputs,result:{monthly:d.mortgage.monthly}};
    }
    revision++;post();
  });
  window.addEventListener('message',e=>{
    if(e.origin!==origin||e.source!==parent||e.data?.source!=='tor-amy-host'||e.data?.version!==1||e.data?.type!=='tor:context-request')return;
    if(military)readMilitary();else post();
  });
  // Escape inside an iframe must be explicitly relayed to its host dialog.
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!e.defaultPrevented)parent.postMessage({source:'tor-calculator',version:1,type:'tor:calculator-close',tool},origin);
  });
})();

