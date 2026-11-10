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
  let stressTest = null, analysisInputs = null, completionDirty = false, completionInitialized = false, completionSource = null;
  const requestId = crypto.randomUUID();
  try { const origin = new URL(document.referrer).origin; if (allowed(origin)) parentOrigin = origin; } catch (_) {}
  function post(type) { if (parentOrigin && parent !== window) parent.postMessage({source:'pcsu-analysis',version:1,type,requestId},parentOrigin); }
  function status(text) { set('analysisConnectionStatus',text); }
  function labelFor(id,text) { const label = $(id)?.parentElement.querySelector('span'); if(label)label.textContent=text; }
  function installPlanningLayout() {
    const hero=document.querySelector('.affordability-hero');hero.classList.add('analysis-health-hero');
    hero.innerHTML=`
      <div class="health-overview">
        <h2 id="affordabilityHeroTitle">Your financial health</h2>
        <div class="health-ring" id="healthRing" role="img" aria-label="Residual percentage unavailable"><div><strong id="healthResidual">—</strong><span>Residual %</span></div></div>
        <strong class="health-verdict" id="healthVerdict">Needs inputs</strong>
        <button class="planning-text-button" id="healthDetails" type="button">How this is assessed ↗</button>
      </div>
      <div class="home-range-overview">
        <h2>Recommended home-price range</h2>
        <strong class="planning-range" id="recommendedHomeRange">—</strong>
        <p class="planning-target">Preferred target <strong id="preferredHomePrice">—</strong></p>
        <div class="home-range-track" id="homeRangeTrack" role="img" aria-label="Price range unavailable"><span id="homeRangeBand"></span><i id="homeRangeTarget"></i><b id="homeRangeSelected"></b></div>
        <p class="selected-home-note" id="selectedHomeNote">Connect your current mortgage and budget.</p>
        <p class="planning-small" id="homeRangeNote">Budget-based estimate; closing costs need separate review.</p>
        <button class="planning-review-button" id="completeAnalysisButton" type="button" hidden>Complete your analysis →</button>
      </div>
      <div class="planning-cash-overview">
        <h2 id="heroCashLabel">Monthly money left</h2>
        <div class="planning-value"><strong id="heroCashLeft">—</strong><span>/mo</span></div>
        <p>After housing, expenses, debt &amp; savings</p>
        <p class="planning-small" id="heroCushion">Monthly cushion goal: —</p>
        <span class="preview-badge" id="previewBadge" hidden>Stress-test preview</span>
      </div>
      <div class="planning-reserves-overview">
        <h2>Reserves after closing</h2>
        <div class="planning-value"><strong id="heroReserves">—</strong></div>
        <p id="heroReserveMonths">Enter your after-closing reserve.</p>
        <button class="planning-review-button" id="reviewPlanButton" type="button">Review your plan ↗</button>
      </div>`;
    const card=document.querySelector('.affordability-result-card');card.classList.add('stress-test-card');
    card.innerHTML=`
      <header class="stress-test-heading"><span class="stress-test-icon" aria-hidden="true">↗</span><div><h2 id="affordabilityResultTitle">Test your budget</h2><p id="stressIncome">Connect income and expenses</p></div></header>
      <fieldset id="stressControls" disabled><legend class="sr-only">Temporary monthly cost scenario</legend>
        <div class="stress-control"><div class="stress-control-label"><label for="stressMortgage">Monthly mortgage</label><label class="stress-number"><span>$</span><input id="stressMortgageAmount" aria-label="Monthly mortgage amount" type="number" min="0" max="1000000" step="0.01" inputmode="decimal"></label></div><input id="stressMortgage" type="range" min="0" max="10000" step="0.01" aria-describedby="stressScope"></div>
        <div class="stress-control"><div class="stress-control-label"><label for="stressExpenses">Monthly living expenses</label><label class="stress-number"><span>$</span><input id="stressExpensesAmount" aria-label="Monthly living expenses amount" type="number" min="0" max="1000000" step="0.01" inputmode="decimal"></label></div><input id="stressExpenses" type="range" min="0" max="10000" step="0.01" aria-describedby="stressScope"></div>
      </fieldset>
      <p class="stress-scope" id="stressScope">Mortgage includes entered housing costs. Expenses exclude debt and savings, which stay fixed.</p>
      <div class="stress-comparison"><div><span id="stressBaselineLabel">Current money left</span><i><b id="stressBaselineBar"></b></i><strong id="stressBaselineRemaining">—</strong></div><div><span id="stressTestedLabel">After your changes</span><i><b id="stressTestedBar"></b></i><strong id="stressTestedRemaining">—</strong></div></div>
      <p class="stress-change" id="stressRemainingChange">Move either slider to test a change.</p>
      <div class="stress-health-result"><span>Budget health</span><strong id="stressHealthLabel">Needs inputs</strong><p id="stressHealthReason">Connect your current figures to begin.</p></div>
      <div class="stress-actions"><button id="resetStressTest" type="button" disabled>Reset to entered budget</button><span id="stressStatus" role="status" aria-live="polite">What-if preview only</span></div>`;
    $('healthDetails').addEventListener('click',()=>report());
    $('reviewPlanButton').addEventListener('click',()=>report());
    installCompletionForm(hero);
    for(const [sliderId,numberId,key]of [['stressMortgage','stressMortgageAmount','housingMonthly'],['stressExpenses','stressExpensesAmount','expensesMonthly']]){
      for(const id of [sliderId,numberId])$(id).addEventListener('input',()=>{
        sequence++;controller?.abort();clearTimeout(timer);
        document.documentElement.classList.add('analysis-preview-pending');
        const source=$(id),value=Number(source.value);
        if(source.value===''||!source.checkValidity()||!Number.isFinite(value)){
          set('stressStatus','Enter a valid amount to update the preview.');return;
        }
        const baseline=packet?.planning?.stressTest?.baseline;
        if(!baseline)return;
        stressTest={...(stressTest||{housingMonthly:baseline.housingMonthly,expensesMonthly:baseline.expensesMonthly}),[key]:value};
        $(numberId).value=String(value);$(sliderId).max=String(Math.min(1000000,Math.max(10000,value*1.5,Number($(sliderId).max))));$(sliderId).value=String(value);paintRange($(sliderId));
        $('resetStressTest').disabled=false;set('stressStatus','Updating preview…');
        timer=setTimeout(()=>calculate(context,true),180);
      });
    }
    $('resetStressTest').addEventListener('click',()=>{clearTimeout(timer);stressTest=null;calculate(context,true);});
  }
  function installCompletionForm(hero) {
    const panel=document.createElement('details');panel.id='analysisInputsPanel';panel.className='analysis-inputs';panel.hidden=true;
    panel.innerHTML=`<summary id="analysisInputsHeading">Complete your analysis</summary>
      <form id="analysisInputsForm">
        <p id="analysisInputsReason">Enter take-home income and review your connected budget to calculate financial health and a home-price range.</p>
        <p id="analysisInputsGross" class="analysis-inputs-hint"></p>
        <fieldset id="analysisInputsFields" disabled><legend class="sr-only">Details for your financial analysis</legend>
          <div class="analysis-inputs-grid">
            <label for="analysisNetIncome">Monthly take-home household income ($)<input id="analysisNetIncome" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" required placeholder="Enter take-home income" aria-describedby="analysisNetHelp"><small id="analysisNetHelp">After taxes and payroll deductions. Include BAH, BAS and other household income. Count each deduction only once.</small></label>
            <label for="analysisReserves">Savings remaining after closing ($) · optional<input id="analysisReserves" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" placeholder="Enter reserves, if known" aria-describedby="analysisReserveHelp"><small id="analysisReserveHelp">Cash available after your down payment and all closing costs. Leave blank if unknown.</small></label>
          </div>
          <p id="analysisBudgetTotals" class="analysis-budget-totals"></p>
          <details class="analysis-budget-rows"><summary>Review your connected expense entries</summary><dl id="analysisBudgetRows"></dl></details>
          <label class="analysis-review-check"><input id="analysisBudgetReviewed" type="checkbox"><span>I reviewed housing, living expenses, debt and savings. Zero amounts do not apply to me.</span></label>
          <div class="analysis-input-actions"><button id="applyAnalysisInputs" type="submit">Update financial health</button><button id="resetAnalysisInputs" type="button" hidden>Use Financial Guidance entries</button></div>
        </fieldset>
        <p class="analysis-inputs-hint">Entries here apply to this analysis only. Re-enter them after refreshing this page or changing your Financial Guidance figures.</p>
        <p id="analysisInputsStatus" role="status" aria-live="polite"></p>
      </form>`;
    hero.before(panel);
    $('completeAnalysisButton').addEventListener('click',()=>{panel.open=true;panel.scrollIntoView({block:'start'});(!(packet?.income.netMonthly>0)?$('analysisNetIncome'):$('analysisBudgetReviewed')).focus();});
    $('analysisInputsForm').addEventListener('input',()=>{completionDirty=true;set('analysisInputsStatus','Apply your changes to update the analysis.');});
    $('analysisInputsForm').addEventListener('submit',async event=>{
      event.preventDefault();if(!$('analysisInputsForm').reportValidity())return;
      clearTimeout(timer);stressTest=null;
      analysisInputs={netMonthlyIncome:Number($('analysisNetIncome').value),reviewed:$('analysisBudgetReviewed').checked,reservesAfterClosing:$('analysisReserves').value===''?null:Number($('analysisReserves').value)};
      $('applyAnalysisInputs').disabled=true;set('analysisInputsStatus','Updating your financial analysis…');
      const applied=await calculate(context,true);$('applyAnalysisInputs').disabled=false;
      if(applied){completionDirty=false;syncCompletionForm(packet);set('analysisInputsStatus','Analysis updated with your entered details.');if(!packet.planning.health.missing.length){panel.open=false;$('analysisInputsHeading').focus();}}
      else set('analysisInputsStatus','Your changes have not been calculated. Check the connection message and try again.');
    });
    $('resetAnalysisInputs').addEventListener('click',async()=>{clearTimeout(timer);analysisInputs=null;stressTest=null;completionDirty=false;completionInitialized=false;await calculate(context);});
  }
  function syncCompletionForm(data) {
    $('analysisNetIncome').value=data?.income.netMonthly==null?'':String(data.income.netMonthly);
    $('analysisReserves').value=data?.summary.reservesAfterClosing==null?'':String(data.summary.reservesAfterClosing);
    $('analysisBudgetReviewed').checked=data?.summary.reviewed===true;
  }
  function renderCompletion(data) {
    const panel=$('analysisInputsPanel');panel.hidden=!context;
    const available=!!data?.budget&&data?.income.grossMonthly>0&&!!data?.mortgage&&!data.summary.example;
    $('analysisInputsFields').disabled=!available;
    $('completeAnalysisButton').hidden=!available||!data.planning.health.missing.length;
    if(!data)return;
    const missing=data.planning.health.missing;
    set('analysisInputsHeading',missing.length?'Complete your analysis':'Your analysis details · Edit');
    set('analysisInputsReason',available?(missing.length?'Enter take-home income and confirm your expense review below to calculate financial health and your home-price range.':'Review the figures used in your financial health and home-price estimate.'):'Complete gross income, confirm the mortgage and enter expenses in Financial Guidance, then reconnect.');
    set('analysisInputsGross','Connected income before payroll deductions: '+money(data.income.grossMonthly)+' / month');
    set('analysisBudgetTotals',`Housing ${money(data.summary.housingMonthly)} · Living expenses ${money(data.summary.nonHousingExpenses)} · Debt ${money(data.summary.monthlyDebt)} · Savings ${money(data.summary.monthlySavings)} / month`);
    const rows=$('analysisBudgetRows');rows.replaceChildren();
    for(const item of data.items){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=item.label;dd.textContent=money(item.value);rows.append(dt,dd);}
    $('resetAnalysisInputs').hidden=!analysisInputs;
    if(!completionDirty)syncCompletionForm(data);
    if(!completionInitialized){panel.open=!!missing.length;completionInitialized=true;}
  }
  function paintRange(slider) {
    const amount=Number(slider.value),max=Number(slider.max);slider.style.setProperty('--range-progress',`${max>0?amount/max*100:0}%`);slider.setAttribute('aria-valuetext',money(amount)+' per month');
  }
  function renderPlanning(data) {
    const p=data?.planning,s=p?.summary||{},h=p?.health,r=p?.homeRange,test=p?.stressTest;
    const grossOnly=data?.income.netMonthly==null;
    document.documentElement.dataset.health=h?.status||'incomplete';
    const residual=h?.residualPercent;
    set('healthResidual',percent(residual));set('healthVerdict',h?.label||'Needs inputs');
    $('healthRing').style.setProperty('--health-fill',`${Math.max(0,Math.min(100,residual??0))}%`);
    $('healthRing').setAttribute('aria-label',residual==null?'Add take-home income to calculate residual percentage':percent(residual)+' of take-home income remains after entered costs and savings. '+h.label+'.');
    set('recommendedHomeRange',r?.upper!=null?(r.lower!=null?`${wholeMoney(r.lower)} – ${wholeMoney(r.upper)}`:`Up to ${wholeMoney(r.upper)}`):'—');
    set('preferredHomePrice',wholeMoney(r?.target));set('homeRangeNote',r?.reason||'Add take-home income and review your budget.');
    set('selectedHomeNote',r?.selectedPrice!=null?`Selected home: ${wholeMoney(r.selectedPrice)}${r.selectedPosition?' · '+(r.selectedPosition==='above'?'Above range':r.selectedPosition==='below'?'Below range':'Within range'):''}`:data?.mortgage?'Complete your budget to compare prices.':'Connect your mortgage assumptions to compare prices.');
    $('selectedHomeNote').classList.toggle('is-above',r?.selectedPosition==='above');
    $('homeRangeTrack').classList.toggle('is-empty',r?.upper==null);
    if(r?.upper!=null){
      const lower=r.lower??r.upper,lo=Math.min(lower,r.selectedPrice)*.85,hi=Math.max(r.upper,r.selectedPrice)*1.08;
      const pos=v=>Math.max(0,Math.min(100,(v-lo)/Math.max(1,hi-lo)*100));
      $('homeRangeBand').style.left=pos(lower)+'%';$('homeRangeBand').style.width=Math.max(1,pos(r.upper)-pos(lower))+'%';
      $('homeRangeTarget').hidden=r.target==null;$('homeRangeTarget').style.left=pos(r.target??r.upper)+'%';$('homeRangeSelected').style.left=pos(r.selectedPrice)+'%';
      $('homeRangeTrack').setAttribute('aria-label',`Budget price range ${wholeMoney(lower)} to ${wholeMoney(r.upper)}. Preferred target ${wholeMoney(r.target)}. Selected home ${wholeMoney(r.selectedPrice)}.`);
    }
    set('heroCashLabel',grossOnly?'Before payroll deductions':'Monthly money left');set('heroCashLeft',money(grossOnly?s.beforeDeductionsRemaining:s.cashFlow));
    set('heroCushion',grossOnly?'Add take-home income for a spending assessment.':'Monthly cushion goal: '+money(p?.bufferMonthly));
    set('heroReserves',money(s.reservesAfterClosing));set('heroReserveMonths',s.reserveMonths!=null?`${s.reserveMonths.toFixed(1)} months of ${test?.active?'tested':'entered'} expenses`:s.reservesAfterClosing===null?'Enter your after-closing reserve.':'Expense coverage not available.');
    $('previewBadge').hidden=!test?.active;
    set('stressIncome',(grossOnly?'Income before deductions: ':'Take-home income: ')+money(grossOnly?data?.income.grossMonthly:data?.income.netMonthly));
    $('stressControls').disabled=!test?.available;
    for(const [sliderId,numberId,key]of [['stressMortgage','stressMortgageAmount','housingMonthly'],['stressExpenses','stressExpensesAmount','expensesMonthly']]){
      const value=test?.tested?.[key];$(numberId).value=value==null?'':String(value);
      $(sliderId).max=String(Math.min(1000000,Math.max(10000,(test?.baseline?.[key]??0)*2,(value??0)*1.25)));
      $(sliderId).value=String(value??0);paintRange($(sliderId));
    }
    set('stressBaselineLabel',grossOnly?'Current before deductions':'Current money left');set('stressTestedLabel',grossOnly?'Tested before deductions':'After your changes');
    set('stressBaselineRemaining',money(test?.baseline.remaining));set('stressTestedRemaining',money(test?.tested.remaining));
    const max=Math.max(1,Math.abs(test?.baseline.remaining??0),Math.abs(test?.tested.remaining??0));
    for(const [id,value]of [['stressBaselineBar',test?.baseline.remaining],['stressTestedBar',test?.tested.remaining]]){$(id).style.width=(value==null?0:Math.abs(value)/max*100)+'%';$(id).classList.toggle('is-negative',value<0);}
    set('stressRemainingChange',test?.remainingChange!=null&&test.active?`${money(Math.abs(test.remainingChange))} ${test.remainingChange<0?'less':'more'} remaining each month.`:'Move either slider to test a change.');
    set('stressHealthLabel',h?.label||'Needs inputs');set('stressHealthReason',h?.reason||'Connect your current figures to begin.');
    $('resetStressTest').disabled=!test?.active;
    set('stressStatus',test?.active?'Preview only · original entries unchanged':'What-if preview only');
  }
  const wholeMoney=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n):'—';
  function chart() {
    const s=packet?.planning?.summary||packet?.summary||{},income=packet?.income||{},grossOnly=income.netMonthly==null;
    const multiplier=$('cashFlowPeriod').value==='annual'?12:1;
    const values={Income:grossOnly?income.grossMonthly:income.netMonthly,Housing:s.housingMonthly,Expenses:s.nonHousingExpenses,Debt:s.monthlyDebt,Savings:s.monthlySavings,Remaining:grossOnly?s.beforeDeductionsRemaining:s.cashFlow};
    const complete=Object.values(values).every(v=>typeof v==='number'&&Number.isFinite(v));
    const minimum=complete?Math.min(0,values.Remaining):0,maximum=complete?Math.max(1,values.Income):1;
    const y=value=>(value-minimum)/(maximum-minimum)*145;
    let running=values.Income??0;
    for(const [key,value]of Object.entries(values)){
      set('waterfall'+key+'Value',typeof value==='number'?money(value*multiplier*(['Housing','Expenses','Debt','Savings'].includes(key)?-1:1)):'—');
      let start=0,end=value??0;
      if(!['Income','Remaining'].includes(key)){start=running;end=running-(value??0);running=end;}
      $('waterfall'+key+'Bar').style.height=complete?Math.abs(y(end)-y(start))+'px':'0px';
      $('waterfall'+key+'Bar').style.bottom=(complete?50+y(Math.min(start,end)):50)+'px';
      $('waterfall'+key+'Value').style.bottom=(complete?55+y(Math.max(start,end)):55)+'px';
      $('waterfall'+key+'Bar').classList.toggle('analysis-deficit',key==='Remaining'&&value<0);
    }
    document.querySelector('[data-waterfall-item="income"] .waterfall-column__label').textContent=grossOnly?'Income before deductions':'Take-home income';
    document.querySelector('[data-waterfall-item="remaining"] .waterfall-column__label').textContent=grossOnly?'Before deductions':'Remaining';
    set('monthlyFlowTitle',packet?.planning?.stressTest.active?'Your tested monthly budget':grossOnly?'Remaining before payroll deductions':'Cash after entered costs');
    const remaining=values.Remaining;
    const text=remaining==null?'Complete your income and expense entries to see what remains.':`${money(remaining*multiplier)} ${multiplier===12?'per year':'per month'} after entered housing, expenses, debt and savings${grossOnly?', before payroll deductions':''}.`;
    document.querySelector('.monthly-flow-insight p').textContent=text;
    $('cashFlowWaterfall').setAttribute('aria-label',text);
  }
  function render(data) {
    packet=data;
    document.documentElement.dataset.analysisStatus=data?.status||'incomplete';
    const s=data?.summary||{},m=data?.mortgage,net=data?.income?.netMonthly,grossOnly=net==null;
    renderPlanning(data);
    renderCompletion(data);
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
    set('reservesDescription',s.reservesAfterClosing==null?'Add savings remaining after closing in Your analysis details or Section 02.':s.reserveMonths==null?'Your entered balance after closing. Complete expenses to calculate coverage.':`${s.reserveMonths.toFixed(1)} months of entered housing, other expenses and debt. This balance is already after closing.`);
    set('priceScenariosTitle','Section 02 mortgage scenario');set('selectedScenarioPrice',money(m?.inputs.homePrice));set('selectedScenarioPayment',money(m?.monthly.totalHousing));set('selectedScenarioRatio',s.example?'Example':m?'Entered assumptions':'Not available');
    document.querySelector('[data-price-scenario="selected"] .price-scenario__label').textContent='Current price assumption';
    document.querySelector('.price-scenarios-card__footer').textContent='Uses the price, rate and costs entered in Section 02.';
    set('takeawayAffordability',data?.guidance.title||'Your current figures have not been connected.');
    set('takeawayCashFlow',grossOnly?'Payroll deductions are not known. The remaining amount is before deductions.':'The mortgage is included once in your monthly cash flow.');
    set('takeawayReserves',s.reservesAfterClosing==null?'After-closing reserves have not been entered.':`After-closing reserves entered: ${money(s.reservesAfterClosing)}.`);
    set('takeawayVALoan',m?`${m.inputs.loanType} scenario. Closing costs and eligibility require separate review.`:'Choose your mortgage assumptions in Section 02.');
    chart();
  }
  async function calculate(value,preview=false) {
    if(!value)return;
    context=value;const token=++sequence;controller?.abort();controller=new AbortController();const abort=controller;
    if(!preview)render(null);
    document.documentElement.classList.add('analysis-preview-pending');
    status(preview?'Updating your budget preview…':'Updating from your current entries…');
    const timeout=setTimeout(()=>abort.abort(),15000);
    try {
      const useDetails=analysisInputs&&value.budget?.status==='ready'&&value.income?.complete===true&&value.income.grossMonthlyIncome>0&&value.mortgage?.ready===true&&value.mortgage.hasUserInteracted===true;
      const response=await fetch('/api/financial-analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,...(useDetails?{analysisInputs}: {}),...(stressTest?{stressTest}: {})}),signal:abort.signal});
      const result=await response.json();if(token!==sequence)return;
      if(!response.ok||!result.ok||result.version!=='financial-analysis-v1')throw new Error(result.error||'The analysis service is not available.');
      document.documentElement.classList.remove('analysis-preview-pending');render(result);status(result.missing.length?'Connected. Add or review: '+result.missing.join(', ')+'.':result.planning?.stressTest.active?'Stress-test preview. Your original entries are unchanged.':'Connected to your current income, mortgage and expenses.');
      return true;
    }catch(error){if(token!==sequence)return;if(!preview)render(null);const message=error.name==='AbortError'?'The update took too long. Try reconnecting.':error.message;status(message);set('stressStatus','Preview not updated. '+message);}
    finally{clearTimeout(timeout);}
  }
  function report(debtOnly=false) {
    reportTrigger=document.activeElement;
    set('analysisReportModalTitle',debtOnly?'Your debt payments':'Your financial analysis');
    const content=$('analysisReportContent');content.replaceChildren();
    const section=document.createElement('section');section.className='analysis-report-section';
    const title=document.createElement('h3');title.textContent=debtOnly?'Your entered debt payments':packet?.planning?.stressTest.active?'Your entered budget (before the test)':'Your connected financial analysis';section.append(title);
    const copy=document.createElement('p');copy.textContent=packet?.guidance.detail||'Connect your current figures to prepare a report.';section.append(copy);
    const dl=document.createElement('dl');
    const s=packet?.summary||{};
    const entries=debtOnly?(packet?.items||[]).filter(x=>x.category==='debt').map(x=>[x.label,x.value]):[
      ['Income before payroll deductions',packet?.income.grossMonthly],['Take-home income',packet?.income.netMonthly],['Housing used in budget',s.housingMonthly],['Other expenses',s.nonHousingExpenses],['Debt payments',s.monthlyDebt],['Monthly savings',s.monthlySavings],['Remaining after deductions',s.cashFlow],['Remaining before deductions',s.beforeDeductionsRemaining],['Known upfront subtotal (not all closing costs)',packet?.mortgage?.upfront.knownSubtotal],['Entered reserves after closing',s.reservesAfterClosing]];
    for(const [label,value]of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=money(value);dl.append(dt,dd);}section.append(dl);
    for(const note of packet?.notes||[]){const p=document.createElement('p');p.textContent=note;section.append(p);}content.append(section);
    if(!debtOnly&&packet?.planning){
      const p=packet.planning,detail=document.createElement('section');detail.className='analysis-report-section';
      const h=document.createElement('h3');h.textContent='Financial health and home-price guidance';detail.append(h);
      for(const text of [p.stressTest.active?'Stress-test preview: original financial entries have not changed.':'Based on the entered budget.',p.health.label+': '+p.health.reason,p.health.scope,p.health.rules,
        p.stressTest.active?`Tested housing: ${money(p.summary.housingMonthly)}. Tested living expenses: ${money(p.summary.nonHousingExpenses)}. Remaining ${p.stressTest.basis==='take-home'?'after deductions':'before payroll deductions'}: ${money(p.stressTest.tested.remaining)}. Housing + required debt / gross income: ${percent(p.summary.combinedDebtHousingRatio)}.`:null,
        'Residual percentage is money remaining after entered housing, expenses, debt and savings divided by take-home income. It is not an overall score or VA residual-income calculation.',
        'Entered credit-score assumption: '+(p.health.factors.creditScore??'not available')+'. Estimated LTV: '+percent(p.health.factors.estimatedLtv)+' (loan including financed fees / selected price).',
        'Recommended budget price range: '+wholeMoney(p.homeRange.lower)+' – '+wholeMoney(p.homeRange.upper)+'. Preferred target: '+wholeMoney(p.homeRange.target)+'.',p.homeRange.reason,p.homeRange.assumptions,p.stressTest.note]){
        if(text){const line=document.createElement('p');line.textContent=text;detail.append(line);}
      }content.append(detail);
    }
    $('analysisReportModal').hidden=false;$('closeAnalysisReportButton').focus();
  }
  function boot() {
    installPlanningLayout();
    const banner=document.createElement('aside');banner.className='analysis-connection';
    const text=document.createElement('p');text.id='analysisConnectionStatus';text.setAttribute('role','status');text.textContent='Open this analysis from Financial Guidance to connect your figures.';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Reconnect';retry.onclick=()=>{clearTimeout(timer);stressTest=null;post('pcsu:analysis-refresh');if(context)calculate(context);};banner.append(text,retry);$('pcsuAnalysisApp').prepend(banner);
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
    window.PCSUnitedAnalysis={getState:()=>structuredClone({context,analysisInputs,stressTest,result:packet}),getAnalysis:()=>structuredClone(packet),refresh:()=>{stressTest=null;post('pcsu:analysis-refresh');if(context)calculate(context);},openReport:()=>report()};
    window.addEventListener('message',event=>{
      const d=event.data;
      if(event.source!==parent||!allowed(event.origin)||!d||d.source!=='pcsu-analysis-host'||d.version!==1)return;
      parentOrigin=event.origin;
      if(d.type==='pcsu:analysis-host-ready'){post('pcsu:analysis-ready');return;}
      if(d.type!=='pcsu:analysis-context'||d.requestId!==requestId||!Number.isInteger(d.revision)||d.revision<=revision)return;
      try{if(!d.context||JSON.stringify(d.context).length>100000)return;}catch(_){return;}
      // Transport revisions alone do not discard local entries on reconnect.
      const signature=value=>JSON.stringify(value,(key,item)=>key==='revision'?undefined:item);
      // A refresh briefly sends budget:null while requesting the same snapshot.
      // Clear displayed results for that pending packet, but compare complete
      // snapshots before deciding whether the user's local entries are stale.
      if(d.context.budget?.status==='ready'&&d.context.income?.complete===true&&d.context.mortgage?.ready===true){
        const nextSource=signature(d.context);
        if(completionSource!==nextSource){
          const hadEntries=!!analysisInputs;analysisInputs=null;completionDirty=false;completionInitialized=false;
          if(hadEntries)set('analysisInputsStatus','Financial Guidance figures changed. Review and re-enter your analysis details.');
        }
        completionSource=nextSource;
      }
      revision=d.revision;context=d.context;stressTest=null;sequence++;controller?.abort();clearTimeout(timer);render(null);status('Updating from Financial Guidance…');timer=setTimeout(()=>calculate(d.context),100);
    });
    post('pcsu:analysis-ready');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
