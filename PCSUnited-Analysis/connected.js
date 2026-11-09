/* Connected rendering uses TheWing results only; the standalone demo remains separate. */
(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('connected') !== '1') return;
  const $ = id => document.getElementById(id), set = (id,value) => { if ($(id)) $(id).textContent = value; };
  const money = n => typeof n === 'number' && Number.isFinite(n) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n) : '—';
  const percent = n => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1)+'%' : '—';
  const allowed = origin => ['https://pcs-united-com.webflow.io','https://pcsunited.com','https://www.pcsunited.com'].includes(origin)
    || (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname));
  let parentOrigin = null, revision = -1, sequence = 0, controller = null, packet = null, context = null, timer = null, reportTrigger = null;
  const requestId = crypto.randomUUID();
  try { const origin = new URL(document.referrer).origin; if (allowed(origin)) parentOrigin = origin; } catch (_) {}
  function post(type) { if (parentOrigin && parent !== window) parent.postMessage({source:'pcsu-analysis',version:1,type,requestId},parentOrigin); }
  function status(text) { set('analysisConnectionStatus',text); }
  function labelFor(id,text) { const label = $(id)?.parentElement.querySelector('span'); if(label)label.textContent=text; }
  function chart() {
    const s=packet?.summary||{},income=packet?.income||{},grossOnly=income.netMonthly==null;
    const multiplier=$('cashFlowPeriod').value==='annual'?12:1;
    const values={Income:grossOnly?income.grossMonthly:income.netMonthly,Housing:s.housingMonthly,Expenses:s.nonHousingExpenses,Debt:s.monthlyDebt,Savings:s.monthlySavings,Remaining:grossOnly?s.beforeDeductionsRemaining:s.cashFlow};
    const max=Math.max(1,...Object.values(values).filter(v=>typeof v==='number').map(Math.abs));
    for(const [key,value]of Object.entries(values)){
      set('waterfall'+key+'Value',typeof value==='number'?money(value*multiplier*(['Housing','Expenses','Debt','Savings'].includes(key)?-1:1)):'—');
      $('waterfall'+key+'Bar').style.height=typeof value==='number'?Math.max(0,Math.abs(value)/max*145)+'px':'0px';
      $('waterfall'+key+'Bar').classList.toggle('analysis-deficit',key==='Remaining'&&value<0);
    }
    document.querySelector('[data-waterfall-item="income"] .waterfall-column__label').textContent=grossOnly?'Income before deductions':'Take-home income';
    document.querySelector('[data-waterfall-item="remaining"] .waterfall-column__label').textContent=grossOnly?'Before deductions':'Remaining';
    set('monthlyFlowTitle',grossOnly?'Remaining before payroll deductions':'Cash after entered costs');
    const remaining=values.Remaining;
    const text=remaining==null?'Complete your income and expense entries to see what remains.':`${money(remaining*multiplier)} ${multiplier===12?'per year':'per month'} after entered housing, expenses, debt and savings${grossOnly?', before payroll deductions':''}.`;
    document.querySelector('.monthly-flow-insight p').textContent=text;
    $('cashFlowWaterfall').setAttribute('aria-label',text);
  }
  function render(data) {
    packet=data;
    document.documentElement.dataset.analysisStatus=data?.status||'incomplete';
    const s=data?.summary||{},m=data?.mortgage,net=data?.income?.netMonthly,grossOnly=net==null;
    const answer={'within-guideline':'WITHIN','above-guideline':'REVIEW',example:'EXAMPLE'}[data?.status]||'NEXT';
    set('affordabilityHeroTitle','Your financial analysis');set('affordabilityAnswer',answer);
    set('affordabilityPosition',data?.guidance.title||'Connect your current figures');
    document.querySelector('.affordability-verdict__ring').setAttribute('aria-label',data?.guidance.title||'Financial details are not connected');
    set('heroMonthlyPayment',money(s.housingMonthly));set('heroHousingRatio',grossOnly?'Take-home income not entered':percent(s.housingRatioNet)+' of take-home income');
    set('heroPaymentStatus',s.manuallyAdjusted?'Section 03 adjustment':s.example?'Example mortgage':m?'Section 02 estimate':'Not available');
    const cash=$('heroCashLeft').closest('.hero-metric');cash.querySelector('.hero-metric__label').textContent=grossOnly?'Before payroll deductions':'Cash remaining';
    cash.querySelector('.hero-metric__description').textContent='After entered housing, expenses, debt & savings';
    set('heroCashLeft',money(grossOnly?s.beforeDeductionsRemaining:s.cashFlow));set('heroCashStatus',grossOnly?'Add take-home income':s.reviewed?'Budget reviewed':'Review your budget');
    set('heroDownPayment',money(m?.upfront.downPayment));set('heroDownPaymentPercent',percent(s.downPaymentPercent)+' of home price');set('heroDownPaymentStatus',m?'Entered scenario':'Not available');
    set('heroClosingCosts','—');const closing=$('heroClosingCosts').closest('.hero-metric');closing.querySelector('.hero-metric__description').textContent='Not entered';closing.querySelector('.hero-metric__note').textContent='Request a lender estimate';
    document.querySelector('.affordability-score__label').textContent='Budget review';set('affordabilityScore',s.reviewed?'Reviewed':'Needed');set('affordabilityScoreRating','No affordability score');
    document.querySelector('.affordability-score__ring').setAttribute('aria-label',s.reviewed?'Budget marked reviewed':'Budget review needed');
    set('paymentBreakdownTitle',s.manuallyAdjusted?'Section 02 estimate · budget payment adjusted':'Section 02 housing cost breakdown');
    set('paymentDonutTotal',money(m?.monthly.totalHousing));
    const segments=['principal','taxes','insurance','hoa','pmi','other'];let offset=0;
    ['principalInterest','propertyTaxes','homeInsurance','hoaFees','pmi','otherOwnership'].forEach((key,index)=>{
      const component=data?.components.find(x=>x.key===key),share=component?.share??0;
      set(key+'Amount',money(component?.amount));set(key+'Percentage',percent(component?.share));
      const circle=document.querySelector('.payment-donut__segment--'+segments[index]);circle.style.strokeDasharray=`${share} ${100-share}`;circle.style.strokeDashoffset=String(-offset);offset+=share;
    });
    set('interestRateAssumption',m?percent(m.inputs.interestRate):'—');set('loanProgram',m?.inputs.loanType||'—');
    set('debtSummaryMonthly',money(s.monthlyDebt));set('debtSummaryRatio',percent(s.combinedDebtHousingRatio));set('debtSummaryRatioStatus','Gross-income planning ratio');
    labelFor('debtSummaryRatio','Housing + required debt / gross income');
    set('vaFundingFee',money(m?.loan.fee));labelFor('vaFundingFee',m?.loan.feeLabel||'Upfront loan fee');set('vaFundingFeeStatus',m?m.loan.financedFee>0?'Financed':m.loan.fee>0?'Paid at closing':'None in scenario':'Not available');
    set('downPaymentSummaryLabel','Down payment');set('downPaymentSummaryAmount',money(m?.upfront.downPayment));set('closingCostsSummary','—');set('prepaidsEscrowAmount','—');
    set('totalDueAtClosing',money(m?.upfront.knownSubtotal));document.querySelector('.upfront-total>span').textContent='Known subtotal: down payment + cash loan fee';
    set('analysisUpfrontNote',m?.upfront.excludes||'Closing costs, prepaids and escrow deposits have not been supplied.');
    set('reservesAfterClosing',money(s.reservesAfterClosing));set('reservesStatus',s.reservesAfterClosing==null?'Not entered':'Your entered reserve');
    set('reservesDescription',s.reservesAfterClosing==null?'Enter your after-closing emergency fund in Section 02. The example balance is not used.':s.reserveMonths==null?'Your entered balance after closing. Complete expenses to calculate coverage.':`${s.reserveMonths.toFixed(1)} months of entered housing, other expenses and debt. This balance is already after closing.`);
    set('affordabilityResultTitle','Budget planning result');set('affordabilityResultHeadline',data?.guidance.title||'Connect your financial details');
    set('affordabilityResultCopy',data?.guidance.detail||'Use the Financial Analysis button on Financial Guidance to bring your current entries into this page.');
    set('affordabilityGaugePercentage',percent(s.housingRatioNet));set('affordabilityGaugeStatus','Planning guidance, not loan approval');
    set('priceScenariosTitle','Section 02 mortgage scenario');set('selectedScenarioPrice',money(m?.inputs.homePrice));set('selectedScenarioPayment',money(m?.monthly.totalHousing));set('selectedScenarioRatio',s.example?'Example':m?'Entered assumptions':'Not available');
    document.querySelector('[data-price-scenario="selected"] .price-scenario__label').textContent='Current price assumption';
    document.querySelector('.price-scenarios-card__footer').textContent='Uses the price, rate and costs entered in Section 02.';
    set('takeawayAffordability',data?.guidance.title||'Your current figures have not been connected.');
    set('takeawayCashFlow',grossOnly?'Payroll deductions are not known. The remaining amount is before deductions.':'The mortgage is included once in your monthly cash flow.');
    set('takeawayReserves',s.reservesAfterClosing==null?'After-closing reserves have not been entered.':`After-closing reserves entered: ${money(s.reservesAfterClosing)}.`);
    set('takeawayVALoan',m?`${m.inputs.loanType} scenario. Closing costs and eligibility require separate review.`:'Choose your mortgage assumptions in Section 02.');
    chart();
  }
  async function calculate(value) {
    context=value;const token=++sequence;controller?.abort();controller=new AbortController();const abort=controller;
    render(null);status('Updating from your current entries…');
    const timeout=setTimeout(()=>abort.abort(),15000);
    try {
      const response=await fetch('/api/financial-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:abort.signal});
      const result=await response.json();if(token!==sequence)return;
      if(!response.ok||!result.ok||result.version!=='financial-analysis-v1')throw new Error(result.error||'The analysis service is not available.');
      render(result);status(result.missing.length?'Connected. Add or review: '+result.missing.join(', ')+'.':'Connected to your current income, mortgage and expenses.');
    }catch(error){if(token!==sequence)return;render(null);status(error.name==='AbortError'?'The update took too long. Try reconnecting.':error.message);}
    finally{clearTimeout(timeout);}
  }
  function report(debtOnly=false) {
    reportTrigger=document.activeElement;
    set('analysisReportModalTitle',debtOnly?'Your debt payments':'Your financial analysis');
    const content=$('analysisReportContent');content.replaceChildren();
    const section=document.createElement('section');section.className='analysis-report-section';
    const title=document.createElement('h3');title.textContent=debtOnly?'Your entered debt payments':'Your connected financial analysis';section.append(title);
    const copy=document.createElement('p');copy.textContent=packet?.guidance.detail||'Connect your current figures to prepare a report.';section.append(copy);
    const dl=document.createElement('dl');
    const s=packet?.summary||{};
    const entries=debtOnly?(packet?.items||[]).filter(x=>x.category==='debt').map(x=>[x.label,x.value]):[
      ['Income before payroll deductions',packet?.income.grossMonthly],['Take-home income',packet?.income.netMonthly],['Housing used in budget',s.housingMonthly],['Other expenses',s.nonHousingExpenses],['Debt payments',s.monthlyDebt],['Monthly savings',s.monthlySavings],['Remaining after deductions',s.cashFlow],['Remaining before deductions',s.beforeDeductionsRemaining],['Known upfront subtotal (not all closing costs)',packet?.mortgage?.upfront.knownSubtotal],['Entered reserves after closing',s.reservesAfterClosing]];
    for(const [label,value]of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=money(value);dl.append(dt,dd);}section.append(dl);
    for(const note of packet?.notes||[]){const p=document.createElement('p');p.textContent=note;section.append(p);}content.append(section);
    $('analysisReportModal').hidden=false;$('closeAnalysisReportButton').focus();
  }
  function boot() {
    const banner=document.createElement('aside');banner.className='analysis-connection';
    const text=document.createElement('p');text.id='analysisConnectionStatus';text.setAttribute('role','status');text.textContent='Open this analysis from Financial Guidance to connect your figures.';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Reconnect';retry.onclick=()=>{post('pcsu:analysis-refresh');if(context)calculate(context);};banner.append(text,retry);$('pcsuAnalysisApp').prepend(banner);
    const row=document.createElement('div');row.className='payment-breakdown-item';row.innerHTML='<span class="payment-breakdown-item__dot payment-breakdown-item__dot--other" aria-hidden="true"></span><span class="payment-breakdown-item__label">Other ownership costs</span><strong class="payment-breakdown-item__amount" id="otherOwnershipAmount">—</strong><span class="payment-breakdown-item__percentage" id="otherOwnershipPercentage">—</span>';document.querySelector('.payment-breakdown-list').append(row);
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');for(const [key,value]of Object.entries({class:'payment-donut__segment payment-donut__segment--other',cx:110,cy:110,r:82,pathLength:100}))circle.setAttribute(key,value);document.querySelector('.payment-donut__svg').append(circle);
    const note=document.createElement('p');note.className='summary-card__note';note.id='analysisUpfrontNote';$('upfrontCostsTitle').closest('section').append(note);
    $('cashFlowPeriod').addEventListener('change',chart);
    $('priceScenariosToggle').addEventListener('click',()=>{const hidden=!$('priceScenariosList').hidden;$('priceScenariosList').hidden=hidden;$('priceScenariosToggle').setAttribute('aria-expanded',String(!hidden));});
    $('fullAnalysisReportButton').addEventListener('click',()=>report());$('viewDebtDetailsButton').addEventListener('click',()=>report(true));
    function close(){ $('analysisReportModal').hidden=true;(reportTrigger||$('fullAnalysisReportButton')).focus(); }
    $('closeAnalysisReportButton').addEventListener('click',close);$('analysisReportModal').addEventListener('click',e=>{if(e.target===$('analysisReportModal'))close();});
    document.addEventListener('keydown',e=>{if($('analysisReportModal').hidden)return;if(e.key==='Escape')close();if(e.key==='Tab'){e.preventDefault();$('closeAnalysisReportButton').focus();}});
    render(null);document.documentElement.classList.add('pcsu-connected-ready');
    window.PCSUnitedAnalysis={getState:()=>structuredClone({context,result:packet}),getAnalysis:()=>structuredClone(packet),refresh:()=>{post('pcsu:analysis-refresh');if(context)calculate(context);},openReport:()=>report()};
    window.addEventListener('message',event=>{
      const d=event.data;
      if(event.source!==parent||!allowed(event.origin)||!d||d.source!=='pcsu-analysis-host'||d.version!==1)return;
      parentOrigin=event.origin;
      if(d.type==='pcsu:analysis-host-ready'){post('pcsu:analysis-ready');return;}
      if(d.type!=='pcsu:analysis-context'||d.requestId!==requestId||!Number.isInteger(d.revision)||d.revision<=revision)return;
      try{if(!d.context||JSON.stringify(d.context).length>100000)return;}catch(_){return;}
      revision=d.revision;context=d.context;sequence++;controller?.abort();clearTimeout(timer);render(null);status('Updating from Financial Guidance…');timer=setTimeout(()=>calculate(d.context),100);
    });
    post('pcsu:analysis-ready');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
