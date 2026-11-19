/* TOR host: page-memory input transport and rendering. TheWing owns calculations. */
(()=>{'use strict';
 const script=document.currentScript,root=document.getElementById('tor-financial-guidance');if(!root||root.dataset.ready)return;root.dataset.ready='1';
 const origin=root.dataset.apiOrigin||new URL(script.src,location.href).origin,$=id=>root.querySelector('#'+id),money=n=>typeof n==='number'&&Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'—';
 const mortgageFrame=$('pcsu-mortgage-frame'),budgetFrame=$('pcsu-budget-frame'),elena=document.getElementById('tor-ask-elena');elena.dataset.endpoint=origin+'/api/tor-ask-elena';elena.dataset.toolOrigin=origin;
 let income={complete:false,status:'incomplete'},incomeSeq=0,incomeTimer,incomeAbort,revision=0,mortgageRevision=-1,budgetRevision=-1,mortgage=null,budget=null,analysisSeq=0,analysisTimer,analysisAbort;
 window.PCSU_FINANCIAL_INCOME=Object.freeze({getSnapshot:()=>structuredClone(income)});
 const fields={grossMonthlyIncome:'tor-total-income',monthlyDeductions:'tor-deductions',monthlySavingsContributions:'tor-savings',capitalReservesTotal:'tor-reserves'};
 const post=(frame,data)=>frame.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,...data},origin);
 function requestMortgage(){post(mortgageFrame,{type:'pcsu:mortgage-budget-request'});}
 function requestBudget(){post(budgetFrame,{type:'pcsu:finance-analysis-request',requestId:'tor-'+crypto.randomUUID()});}
 function sendContext(){const ready=income.complete===true,m=mortgage?.ready&&mortgage.status==='ready'?mortgage:null;post(budgetFrame,{type:'pcsu:finance-context',revision:++revision,grossMonthly:ready?income.grossMonthlyIncome:null,netMonthly:ready?income.netMonthlyIncome:null,savingsMonthly:ready?income.monthlySavingsContributions:null,incomeSources:ready?income.sources:[],location:ready?'Your household':'Complete Section 01',mortgage:{status:m?'ready':'unavailable',amount:m?.mortgageEstimate?.monthly?.totalHousing??null,example:m?.hasUserInteracted!==true}});}
 function clearSummary(note='Your connected monthly picture is updating…'){analysisSeq++;analysisAbort?.abort();clearTimeout(analysisTimer);for(const id of ['tor-summary-housing','tor-summary-debt','tor-summary-cash'])$(id).textContent='—';$('tor-summary-status').textContent=note;}
 function changedIncome(){budget=null;clearSummary();sendContext();window.dispatchEvent(new CustomEvent('pcsu:financial-income-change',{detail:structuredClone(income)}));}
 function capture(){return Object.fromEntries(Object.entries(fields).map(([k,id])=>[k,$(id).value.trim()===''?null:Number($(id).value)]));}
 function scheduleIncome(){clearTimeout(incomeTimer);incomeAbort?.abort();const seq=++incomeSeq;income={complete:false,status:'pending'};$('tor-net').textContent='—';$('tor-after-savings').textContent='—';$('tor-income-status').textContent='Updating your income…';$('tor-income-retry').hidden=true;changedIncome();incomeTimer=setTimeout(()=>calculateIncome(seq),250);}
 async function calculateIncome(seq){
  const raw=capture();for(const id of Object.values(fields)){if(!$(id).checkValidity()){$('tor-income-status').textContent='Use nonnegative dollar amounts, with no more than two decimal places.';income={complete:false,status:'invalid'};changedIncome();return;}}
  const controller=new AbortController();incomeAbort=controller;const timeout=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(origin+'/api/tor-financial-income',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(raw),signal:controller.signal});const d=await r.json();if(seq!==incomeSeq)return;if(!r.ok||!d.ok||d.version!=='tor-income-v1')throw Error(d.error||'Income calculation is unavailable.');income=d.snapshot;$('tor-net').textContent=money(d.summary.netMonthly);$('tor-after-savings').textContent=money(d.summary.availableAfterIncomeSavings);$('tor-income-status').textContent=!income.complete?'Enter your total monthly income to get started.':income.netMonthlyIncome===null?'Total income is connected. Add payroll deductions to calculate spendable take-home pay.':'Connected to your budget. Planned savings will be counted once.';changedIncome();}
  catch(e){if(seq!==incomeSeq)return;income={complete:false,status:'error'};$('tor-income-status').textContent=e.name==='AbortError'?'Income calculation timed out. Your entries are ready to retry.':e.message;$('tor-income-retry').hidden=false;changedIncome();}finally{clearTimeout(timeout);}
 }
 $('tor-income-form').addEventListener('submit',e=>e.preventDefault());for(const id of Object.values(fields))$(id).addEventListener('input',scheduleIncome);$('tor-income-retry').addEventListener('click',scheduleIncome);
 function scheduleAnalysis(){clearSummary();if(budget?.status!=='ready')return;const seq=analysisSeq;analysisTimer=setTimeout(()=>calculateAnalysis(seq),200);}
 async function calculateAnalysis(seq){const controller=new AbortController();analysisAbort=controller;const timeout=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(origin+'/api/financial-analysis',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,income,mortgage,budget}),signal:controller.signal});const d=await r.json();if(seq!==analysisSeq)return;if(!r.ok||!d.ok)throw Error();$('tor-summary-housing').textContent=money(d.summary.housingMonthly);$('tor-summary-debt').textContent=money(d.summary.monthlyDebt);$('tor-summary-cash').textContent=money(d.summary.cashFlow);$('tor-summary-status').textContent=d.income.netMonthly===null?'Add payroll deductions in Section 01 before treating the remainder as spendable cash.':!d.summary.reviewed?'Based on entered amounts. Review all four categories before relying on this monthly picture.':d.summary.example?'Your budget is reviewed. Check the example mortgage assumptions before relying on the result.':'After housing, everyday expenses, debt payments and planned savings. Ask Elena to explain or compare a scenario.';}catch(e){if(seq===analysisSeq)$('tor-summary-status').textContent='Your inputs are still updating or need review. Continue with the calculators above.';}finally{clearTimeout(timeout);}}
 $('pcsu-budget-reviewed').addEventListener('change',()=>post(budgetFrame,{type:'pcsu:finance-review',reviewed:$('pcsu-budget-reviewed').checked}));
 function editIncome(focus){$('pcs1-find').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$(focus==='net'?'tor-deductions':'tor-total-income').focus({preventScroll:true});}
 window.PCSUFinancialUtility=Object.freeze({open:()=>editIncome()});
 window.addEventListener('message',e=>{
  const d=e.data;if(e.origin!==origin||!d||typeof d!=='object')return;
  if(e.source===mortgageFrame.contentWindow&&d.source==='pcsu-mortgage-budget'&&d.version===1&&d.type==='pcsu:mortgage-budget-state'){
   const s=d.snapshot;if(s!==null&&(!s||!Number.isSafeInteger(s.revision)||s.revision<mortgageRevision))return;if(s)mortgageRevision=s.revision;
   if(JSON.stringify(s)!==JSON.stringify(mortgage)){mortgage=s;budget=null;clearSummary();sendContext();}return;
  }
  if(e.source!==budgetFrame.contentWindow||d.source!=='pcsu-finance'||d.version!==1)return;
  if(d.type==='pcsu:finance-ready'){sendContext();requestMortgage();requestBudget();post(budgetFrame,{type:'pcsu:finance-request-size'});}
  if(d.type==='pcsu:finance-resize'&&Number.isFinite(d.height)&&d.height>0&&d.height<=30000)budgetFrame.style.height=Math.ceil(d.height)+'px';
  if(d.type==='pcsu:finance-edit-income')editIncome(d.focus);
  if(d.type==='pcsu:finance-analysis-state'){
   const s=d.snapshot;if(!s||!Number.isSafeInteger(s.revision)||s.revision<budgetRevision)return;budgetRevision=s.revision;budget=s;
   $('pcsu-budget-reviewed').disabled=s.status!=='ready';$('pcsu-budget-reviewed').checked=s.state?.reviewed===true;scheduleAnalysis();
  }
 });
 mortgageFrame.addEventListener('load',()=>{mortgageRevision=-1;mortgage=null;budget=null;clearSummary();sendContext();requestMortgage();});budgetFrame.addEventListener('load',()=>{budgetRevision=-1;budget=null;sendContext();requestBudget();post(budgetFrame,{type:'pcsu:finance-request-size'});});
 $('pcsu-budget-reviewed').disabled=true;
 mortgageFrame.src=origin+'/Civilian-Mortgage/?embedded=1';budgetFrame.src=origin+'/Civilian-Budget/?housing=projected';
 root.querySelector('.tor-elena-cta').addEventListener('click',()=>{const panel=elena.querySelector('.amy-panel');if(panel?.hidden)elena.querySelector('.amy-launch')?.click();elena.querySelector('textarea')?.focus();});
})();
