/* Finance-UX v3.1: UI state only. Financial results come from TheWing. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), money=n=>n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n), pct=n=>n==null?'—':n.toFixed(1)+'%';
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={'monthly-expenses':'monthly expenses',debt:'monthly debt payments',lifestyle:'lifestyle spending',other:'other monthly expenses'};
 const state={categories:{},activeCategory:'monthly-expenses',sortMode:'high-low',grossMonthly:null,netMonthly:null,incomeBreakdown:null,savingsMonthly:0,emergencyFund:null,bufferMonthly:500,extraBufferMonthly:500,reviewed:false,location:'No base selected',scenario:{loanType:'va',termYears:30,creditScore:720,interestRate:null,downPayment:0,propertyTaxPercent:1.25,insurancePercent:.45,hoaMonthly:0,pmiMonthly:null,fundingFeeExempt:false,priorUse:'first_use',financeFundingFee:true}};
 let result=null,seq=0,controller,timer,parentOrigin=null,parentRevision=-1,loaded=false;
 // Explicit standalone embedding keeps income entry inside the tool; no parent financial transport.
 const inlineIncome=new URLSearchParams(location.search).get('income')==='inline';
 const projected=new URLSearchParams(location.search).get('housing')==='projected';
 let mortgage={status:'loading',amount:null}, mortgageLinked=true, pendingMortgage=false;
 const embedded=window.parent!==window, rows=()=>Object.values(state.categories).flat();
 const allowed=o=>['https://pcs-united-com.webflow.io','https://pcsunited.com','https://www.pcsunited.com'].includes(o)||(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname));
 const post=(type,detail={})=>{if(parentOrigin&&!inlineIncome)parent.postMessage({source:'pcsu-finance',version:1,type,...detail},parentOrigin);};
 // Measure the intrinsic dashboard, not the iframe viewport, so it can shrink too.
 let sizeTimer,lastHeight=0,forceSize=false;
 function queueSize(force=false){
  forceSize=forceSize||force;clearTimeout(sizeTimer);
  sizeTimer=setTimeout(()=>{
   if(!embedded||inlineIncome||!parentOrigin)return;
   const height=Math.ceil($('budgetApp')?.getBoundingClientRect().height||0);
   if(height>0&&height<=30000&&(forceSize||height!==lastHeight)){
    post('pcsu:finance-resize',{height});lastHeight=height;
   }
   forceSize=false;
  },0);
 }
 function analysisSnapshot(){
  const keys=['grossMonthly','netMonthly','savingsMonthly','emergencyFund','bufferMonthly','extraBufferMonthly','reviewed'];
  const snapshot={revision:seq,status:!loaded?'loading':result?'ready':'pending',mortgageLinked,
   state:{...Object.fromEntries(keys.map(key=>[key,state[key]])),items:rows().map(x=>({id:x.id,label:x.label,category:x.category,value:x.value,minimumPayment:x.minimumPayment??x.value,essential:x.essential===true,housing:x.housing===true,continues:x.continues===true}))}};
  return structuredClone(snapshot);
 }
 function sendAnalysis(requestId){post('pcsu:finance-analysis-state',{requestId,snapshot:analysisSnapshot()});}
 const icons=()=>window.lucide?.createIcons({attrs:{'stroke-width':2}});
 const rangeText=(a,b)=>a==null||a===b?'Up to '+money(b):money(a)+' – '+money(b);
 function mortgageRow(){return rows().find(x=>x.id==='projected-mortgage');}
 function installMortgage(){
  if(!projected)return;
  document.body.dataset.housing='projected';
  const monthly=state.categories['monthly-expenses'], groceries=monthly.find(x=>x.id==='groceries');
  if(groceries){state.categories.other.unshift({...groceries,category:'other'});monthly.splice(monthly.indexOf(groceries),1);}
  monthly.unshift({id:'projected-mortgage',label:'Mortgage',category:'monthly-expenses',icon:'house',color:'purple',value:0,min:0,max:8000,step:1,essential:true,housing:true,continues:false});
  const existing=state.categories.debt.find(x=>x.id==='mortgage');
  if(existing){existing.label='Other property mortgage';existing.continues=true;}
  const rent=state.categories.other.find(x=>x.id==='rent');
  if(rent){rent.label='Continuing rent';rent.continues=true;}
  applyMortgage();
 }
 function applyMortgage(){
  const row=mortgageRow(); if(!row || !mortgageLinked)return;
  row.value=mortgage.status==='ready'?mortgage.amount:0;
 }
 function mortgageNote(){
  if(!mortgageLinked)return 'Your adjusted payment';
  return mortgage.status==='ready'?(mortgage.example?'Section 02 · example estimate':'From Section 02 · total housing cost'):'Waiting for a valid Section 02 estimate';
 }
 function decorateMortgage(){
  if(!projected)return;
  const row=document.querySelector('[data-id="projected-mortgage"]');if(!row)return;
  let note=row.querySelector('.finance-mortgage-note');
  if(!note){note=document.createElement('small');note.className='finance-mortgage-note';row.querySelector('.expense-row__identity').append(note);}
  note.textContent=mortgageNote();
  const missing=mortgageLinked && mortgage.status!=='ready';
  if(missing){row.querySelector('output').textContent='—';row.querySelector('.expense-amount-input input').value='';}
  row.querySelector('.expense-range').disabled=missing;
  const options=row.querySelector('.finance-row-options');
  options.querySelector('[data-option="continues"]')?.closest('label').remove();
  if(!options.querySelector('[data-relink]')){const b=document.createElement('button');b.type='button';b.dataset.relink='';b.textContent='Use Section 02 estimate';options.append(b);}
  options.querySelector('[data-relink]').disabled=mortgageLinked || mortgage.status!=='ready';
 }
 function projectedSummary(d){
  if(!projected)return;
  const m=d.metrics, grossOnly=state.netMonthly==null;
  const remaining=grossOnly?m.beforeDeductionsRemaining:m.cashFlow;
  const label=document.querySelector('.cash-flow-breakdown__row .cash-flow-breakdown__label');
  label.lastChild.textContent=grossOnly?' Total Income':' Take-home Income';
  $('monthlyIncomeValue').textContent=money(grossOnly?state.grossMonthly:state.netMonthly);
  for(const id of ['cashFlowAmount','cashFlowFooterAmount']){$(id).textContent=money(remaining);$(id).style.color=remaining==null?'var(--pcsu-text-muted)':remaining<0?'var(--pcsu-red)':'var(--pcsu-cash-flow)';}
  document.querySelector('.cash-flow-summary__label').textContent=grossOnly?'Remaining before payroll deductions':'After mortgage, spending & savings';
  $('fu-cash-state').textContent=grossOnly?'Before payroll deductions':'After entered costs';
  $('fu-status').textContent=state.grossMonthly==null?'Complete your income in Section 01.':'Mortgage included once · based on entered amounts';
  $('cashFlowPercentage').textContent='';
 }
 function incomeView(){
  const b=state.incomeBreakdown,missing=state.netMonthly==null;
  $('fu-total-income').textContent=state.grossMonthly==null?'Income not ready':money(state.grossMonthly);
  $('fu-income-breakdown').hidden=!b;
  if(projected){$('fu-income-help').textContent='Income carries over from Section 01. Add payroll deductions there to see take-home cash flow.';const sources=$('fu-income-sources');sources.hidden=!state.incomeSources?.length;sources.innerHTML=(state.incomeSources||[]).map(x=>`<div><span>${esc(x.label)}</span><b>${money(x.amount)}</b></div>`).join('');}
  if(b)for(const [id,key]of Object.entries({'fu-military-income':'militaryMonthly','fu-additional-income':'additionalMonthly','fu-base-pay':'basePay','fu-bah':'bah','fu-bas':'bas'}))$(id).textContent=money(b[key]);
  $('fu-income-summary').textContent=`Total income ${money(state.grossMonthly)} before deductions${b?.additionalMonthly!=null?' · '+money(b.additionalMonthly)+' additional income included':''} · ${missing?'Take-home pay not entered':'Take-home '+money(state.netMonthly)+'/month'}`;
  $('fu-income-needed').hidden=!missing || (projected && state.grossMonthly!=null);
  $('fu-income-needed').querySelector('strong').textContent=state.grossMonthly==null?'Complete your income details.':'Your income is connected.';
  document.querySelector('.cash-flow-card__hero').hidden=false;
  $('fu-cash-state').textContent=missing?'Add take-home pay':'Updating…';
 }
 function openSettings(focus){const dialog=$('budgetDetailsDialog');if(!dialog.open)dialog.showModal();if(focus)$(focus).focus();}
 function editIncome(focus){if(embedded&&!inlineIncome){$('budgetDetailsDialog').close();post('pcsu:finance-edit-income',{focus});}else{$('fu-income-fields').hidden=false;openSettings(focus==='net'?'fu-net':'fu-gross');}}
 function render(){
  $('expenseEditorTitle').textContent='Adjust your '+labels[state.activeCategory];
  document.querySelectorAll('.category-tab').forEach(b=>{const active=b.dataset.category===state.activeCategory;b.classList.toggle('category-tab--active',active);b.setAttribute('aria-pressed',String(active));});
  const items=[...(state.categories[state.activeCategory]||[])].sort((a,b)=>a.id==='projected-mortgage'?-1:b.id==='projected-mortgage'?1:['a-z','alphabetical'].includes(state.sortMode)?a.label.localeCompare(b.label):state.sortMode==='low-high'?a.value-b.value:b.value-a.value);
  $('expenseList').innerHTML=items.map(x=>`<article class="expense-row" data-id="${esc(x.id)}" data-color="${esc(x.color)}"><div class="expense-row__identity"><div class="expense-icon expense-icon--${esc(x.color)}"><i data-lucide="${esc(x.icon)}" aria-hidden="true"></i></div><h3 class="expense-row__name">${esc(x.label)}</h3></div><div class="expense-row__slider"><output class="slider-value-bubble slider-value-bubble--${esc(x.color)}">${money(x.value)}</output><input class="expense-range expense-range--${esc(x.color)}" type="range" min="0" max="${Math.max(x.max,x.value)}" step="${x.step}" value="${x.value}" aria-label="${esc(x.label)} slider"><div class="expense-range-labels"><span>$0</span><span>${money(Math.max(x.max,x.value))}</span></div></div><div class="expense-row__amount"><div class="expense-amount-input expense-amount-input--${esc(x.color)}"><span class="expense-amount-input__currency">$</span><input type="number" min="0" max="1000000" step="0.01" value="${x.value}" inputmode="decimal" aria-label="${esc(x.label)} amount"><span class="expense-amount-input__suffix">/mo</span></div></div><button type="button" class="expense-row__expand" aria-expanded="false" aria-label="Options for ${esc(x.label)}"><i data-lucide="chevron-down"></i></button><div class="finance-row-options" hidden><label><input type="checkbox" data-option="essential" ${x.essential?'checked':''}> Essential expense</label>${x.housing?`<label><input type="checkbox" data-option="continues" ${x.continues?'checked':''}> This existing housing payment will continue after buying</label>`:''}${x.category==='debt'||x.id==='support-payments'?`<label>Required minimum payment <input type="number" data-option="minimumPayment" min="0" max="1000000" step="0.01" value="${x.minimumPayment??x.value}" aria-label="${esc(x.label)} required minimum"></label><small>Main amount = what you actually pay. Minimum = amount used for the debt guideline.</small>`:''}${x.custom?'<button type="button" data-remove>Remove item</button>':''}</div></article>`).join('');
  document.querySelectorAll('.expense-row').forEach(paint);decorateMortgage();icons();
 }
 function paint(row){const x=rows().find(x=>x.id===row.dataset.id),r=row.querySelector('[type=range]'),b=row.querySelector('output');r.max=String(Math.max(x.max,x.value));r.value=String(x.value);b.textContent=money(x.value);const p=Math.min(100,x.value/Number(r.max)*100);r.style.setProperty('--range-progress',p+'%');b.style.left=`calc(${p}% + ${(50-p)*.45}px)`;b.style.transform='translateX(-50%)';}
 function clear(){result=null;sendAnalysis();$('fu-cash-state').textContent=state.netMonthly==null?'Add take-home pay':'Updating…';window.dispatchEvent(new CustomEvent('pcsunited:financial-invalidated'));for(const id of ['cashFlowAmount','cashFlowFooterAmount','cashFlowPercentage','monthlyIncomeDonut','monthlyIncomeValue','totalExpensesValue','totalDebtValue','totalSavingsValue','expensesIncomeRatio','emergencyFundAmount','emergencyFundMonths','debtIncomeRatio','fu-payment','fu-price','fu-remaining'])$(id).textContent='—';$('fu-explore').disabled=true;document.querySelectorAll('.health-status').forEach(e=>{e.textContent='Pending';e.style.color='var(--pcsu-text-muted)';});document.querySelectorAll('.income-donut__segment').forEach(e=>e.style.strokeDasharray='0 100');}
 function schedule(){incomeView();if(!loaded)return;seq++;controller?.abort();clearTimeout(timer);clear();$('fu-status').textContent='Updating your budget…';timer=setTimeout(calculate,300);}
 async function calculate(){
  if(projected && mortgageLinked && mortgage.status!=='ready'){clear();$('fu-cash-state').textContent='Mortgage pending';$('fu-status').textContent='Complete the mortgage estimate in Section 02, or enter your payment.';return;}
  if([...document.querySelectorAll('.expense-row input[type=number]')].some(e=>e.value===''||!e.checkValidity())){clear();$('fu-cash-state').textContent='Check entries';$('fu-status').textContent='Finish entering a valid amount before calculating.';return;}
  const id=++seq;controller?.abort();const abort=new AbortController();controller=abort;const timeout=setTimeout(()=>abort.abort(),15000);
   try{const body={...state,items:rows().map(x=>({...x,minimumPayment:x.minimumPayment??x.value})),categories:undefined,incomeBreakdown:undefined};const response=await fetch('/api/finance-budget',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});const d=await response.json();if(id!==seq)return;if(!response.ok||!d.ok||d.version!=='finance-budget-v1')throw Error(d.error||'Budget service unavailable.');result=d;summary(d);projectedSummary(d);post('pcsu:finance-result',{metrics:d.metrics,affordability:d.affordability});sendAnalysis();window.dispatchEvent(new CustomEvent('pcsunited:financial-updated',{detail:d}));}
  catch(e){if(id!==seq)return;clear();$('fu-cash-state').textContent='Unavailable';$('fu-status').textContent=e.name==='AbortError'?'Budget calculation timed out. Retry below.':e.message;$('fu-retry').hidden=false;}finally{clearTimeout(timeout);}
 }
 function summary(d){
  const m=d.metrics,a=d.affordability;
  document.querySelector(".cash-flow-summary__label").textContent=d.reviewed?"Cash after spending & savings":"Based on entered amounts";
  $('fu-cash-state').textContent=m.cashFlow==null?'Add take-home pay':m.cashFlow<0?'Monthly shortfall':'After spending & savings';
  for(const [id,v]of Object.entries({cashFlowAmount:m.cashFlow,cashFlowFooterAmount:m.cashFlow,monthlyIncomeDonut:m.monthlyIncome,monthlyIncomeValue:m.monthlyIncome,totalExpensesValue:-m.totalExpenses,totalDebtValue:-m.totalDebt,totalSavingsValue:-m.totalSavings,emergencyFundAmount:m.emergencyFund}))$(id).textContent=money(v);
  if(m.monthlyIncome==null){$('monthlyIncomeValue').textContent='Not entered';$('cashFlowFooterAmount').textContent='Add take-home pay';} $('cashFlowPercentage').textContent=pct(m.cashFlowPercentage)+' of take-home income';$('expensesIncomeRatio').textContent=pct(m.expensesIncomeRatio);$('debtIncomeRatio').textContent=pct(m.debtIncomeRatio);$('emergencyFundMonths').textContent=m.emergencyFundMonths==null?'—':m.emergencyFundMonths.toFixed(1)+' months';
  for(const id of ['cashFlowAmount','cashFlowFooterAmount'])$(id).style.color=m.cashFlow==null?'var(--pcsu-text-muted)':m.cashFlow<0?'var(--pcsu-red)':'var(--pcsu-cash-flow)';
  const badges=document.querySelectorAll('.health-status');badges.forEach(e=>{e.textContent='Planning';e.style.color='var(--pcsu-text-secondary)';});if(badges[0])badges[0].textContent=m.monthlyIncome>0?'Excludes debt':'Needs income';if(badges[1])badges[1].textContent=m.emergencyFundMonths==null?'Add balance':m.emergencyFundMonths.toFixed(1)+' months';if(badges[2])badges[2].textContent=m.grossMonthly>0?'Current debts':'Needs gross income';
  const donut=document.querySelector('.income-donut');donut.setAttribute('aria-label',`Take-home income ${money(m.monthlyIncome)}, expenses ${money(m.totalExpenses)}, debt payments ${money(m.totalDebt)}, savings ${money(m.totalSavings)}, remaining ${money(m.cashFlow)}`);
  const values=[m.totalExpenses,m.totalDebt,m.totalSavings,Math.max(0,m.cashFlow||0)],total=values.reduce((a,b)=>a+b,0);let offset=0;
  for(const [i,name]of ['expenses','debt','savings','income'].entries()){const el=donut.querySelector('.income-donut__segment--'+name);if(!el)continue;const p=total>0?values[i]/total*100:0;el.style.strokeDasharray=`${p} ${100-p}`;el.style.strokeDashoffset=String(-offset);offset+=p;}
  $('fu-status').textContent=m.monthlyIncome==null?'Add take-home pay to complete your snapshot.':d.reviewed?'Budget updated · calculated by TheWing.ai':'Based on entered amounts';$('fu-retry').hidden=true;
  $('fu-payment').textContent=a.monthlyRange?rangeText(a.monthlyRange.comfortable,a.monthlyRange.upper):state.netMonthly==null?'Add take-home pay':!d.reviewed?'Review your budget':'Complete income details';$('fu-price').textContent=a.homeRange?rangeText(a.homeRange.comfortable,a.homeRange.upper):a.scenarioError||(a.monthlyRange?.upper===0?'No room within this guideline':'—');$('fu-remaining').textContent=a.remainingAtUpper==null?'—':a.remainingAtUpper===a.remainingAtComfortable?money(a.remainingAtUpper):rangeText(a.remainingAtUpper,a.remainingAtComfortable);$('fu-explore').disabled=!a.homeRange;
  const s=state.scenario;$('fu-assumption-copy').textContent=`${s.loanType==='va'?'VA':'Conventional'} · ${s.termYears} years · credit ${s.creditScore} · ${money(s.downPayment)} down · tax ${s.propertyTaxPercent}%/year · insurance ${s.insurancePercent!==undefined?s.insurancePercent+'%/year':money(s.insuranceMonthly)+'/month'} · HOA ${money(s.hoaMonthly)}/month. ${a.homeRange?a.homeRange.rate+'% interest. ':''}Illustrative unless you entered a quote. VA: ${s.fundingFeeExempt?'fee exempt':s.priorUse+', fee '+(s.financeFundingFee?'financed':'paid at closing')}.`;
 }
 function bind(){
  const settings=$('budgetDetailsDialog');$('fu-settings-open').onclick=()=>openSettings();$('budgetDetailsClose').onclick=()=>settings.close();$('totalSavingsValue').onclick=()=>openSettings('fu-savings');
  settings.addEventListener('click',e=>{if(e.target===settings){const b=settings.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)settings.close();}});
  settings.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
  document.querySelectorAll('.category-tab').forEach(b=>b.addEventListener('click',()=>{state.activeCategory=b.dataset.category;render();}));$('expenseSort').onchange=e=>{state.sortMode=e.target.value;render();};
  $('expenseList').addEventListener('input',e=>{const row=e.target.closest('.expense-row'),item=rows().find(x=>x.id===row?.dataset.id);if(!item||!e.target.matches('input'))return;const key=e.target.dataset.option;
   if(e.target.type!=='checkbox'&&(e.target.value===''||!e.target.checkValidity())){seq++;controller?.abort();clearTimeout(timer);clear();$('fu-cash-state').textContent='Check entries';$('fu-status').textContent='Enter a valid amount from $0 to $1,000,000.';return;}
   if(key)item[key]=e.target.type==='checkbox'?e.target.checked:Number(e.target.value);else{if(item.id==='projected-mortgage')mortgageLinked=false;item.value=Number(e.target.value);if(e.target.type==='range')row.querySelector('.expense-amount-input input').value=e.target.value;paint(row);decorateMortgage();}schedule();});
  $('expenseList').onclick=e=>{const row=e.target.closest('.expense-row');if(!row)return;if(e.target.closest('[data-relink]')){mortgageLinked=true;applyMortgage();render();schedule();return;}if(e.target.closest('[data-remove]')){state.categories[state.activeCategory]=state.categories[state.activeCategory].filter(x=>x.id!==row.dataset.id);render();schedule();return;}const b=e.target.closest('.expense-row__expand');if(b){const expanded=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!expanded));row.querySelector('.finance-row-options').hidden=expanded;}};
  const modal=$('customExpenseModal');function close(){modal.hidden=true;document.body.style.overflow='';$('customExpenseForm').reset();$('addExpenseButton').focus();}
  $('addExpenseButton').onclick=()=>{modal.hidden=false;document.body.style.overflow='hidden';$('customExpenseName').focus();};$('closeExpenseModal').onclick=close;$('cancelExpenseModal').onclick=close;modal.onclick=e=>{if(e.target===modal)close();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!modal.hidden){e.preventDefault();close();}else post('pcsu:finance-close');}if(e.key==='Tab'&&!modal.hidden){const fields=[...modal.querySelectorAll('button,input')].filter(x=>!x.disabled),first=fields[0],last=fields[fields.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  $('customExpenseForm').onsubmit=e=>{e.preventDefault();const label=$('customExpenseName').value.trim(),value=Number($('customExpenseAmount').value);if(!label||!Number.isFinite(value)||value<0||value>1000000)return;state.categories[state.activeCategory].push({id:'custom-'+crypto.randomUUID(),label,category:state.activeCategory,value,min:0,max:Math.max(1000,value*2),step:5,icon:'circle-dollar-sign',color:'slate',custom:true,essential:false,housing:false,continues:false,minimumPayment:null});close();render();schedule();};
  for(const [id,key]of Object.entries({'fu-savings':'savingsMonthly','fu-emergency':'emergencyFund','fu-buffer':'bufferMonthly','fu-extra-buffer':'extraBufferMonthly','fu-gross':'grossMonthly','fu-net':'netMonthly'}))$(id).oninput=()=>{state[key]=$(id).value.trim()===''?null:Number($(id).value);schedule();};
  $('fu-reviewed').onchange=e=>{state.reviewed=e.target.checked;schedule();};$('fu-retry').onclick=calculate;$('fu-edit-income').onclick=()=>editIncome();$('fu-add-take-home').onclick=()=>editIncome('net');$('locationSelector').onclick=()=>editIncome();
  $('fu-explore').onclick=()=>{const a=result?.affordability;if(a?.homeRange)post('pcsu:finance-explore',{price:a.homeRange.comfortable||a.homeRange.upper,scenario:state.scenario});};
 }
 async function boot(){
  try{const r=await fetch('items.json');if(!r.ok)throw Error();state.categories=await r.json();}catch{$('expenseList').textContent='Budget categories could not load. Reload to try again.';return;}
  installMortgage();loaded=true;bind();render();clear();if(!embedded||inlineIncome)$('fu-income-fields').hidden=false;if(inlineIncome){state.location='Your household';$('fu-explore').hidden=true;}$('selectedLocation').textContent=state.location;icons();schedule();
  try{const o=new URL(document.referrer).origin;if(allowed(o))parentOrigin=o;}catch{}post('pcsu:finance-ready');queueSize(true);window.dispatchEvent(new CustomEvent('pcsunited:financial-ready',{detail:{state,metrics:null}}));
 }
 window.addEventListener('message',e=>{const d=e.data;if(inlineIncome||e.source!==parent||!allowed(e.origin)||!d||d.source!=='pcsu-finance-host'||d.version!==1)return;parentOrigin=e.origin;queueSize();if(d.type==='pcsu:finance-request-size'){queueSize(true);return;}if(d.type==='pcsu:finance-analysis-request'){if(typeof d.requestId==='string'&&d.requestId.length<=100)sendAnalysis(d.requestId);return;}if(d.type!=='pcsu:finance-context'||!Number.isInteger(d.revision)||d.revision<parentRevision)return;parentRevision=d.revision;
  if(projected){
   state.incomeSources=Array.isArray(d.incomeSources)?d.incomeSources.filter(x=>typeof x?.label==='string'&&typeof x.amount==='number'&&Number.isFinite(x.amount)&&x.amount>=0).slice(0,20):[];
   if(Object.hasOwn(d,'mortgage')){const m=d.mortgage;const valid=m?.status==='ready'&&typeof m.amount==='number'&&Number.isFinite(m.amount)&&m.amount>=0&&m.amount<=1000000;const next={status:valid?'ready':'unavailable',amount:valid?m.amount:null,example:m?.example===true};pendingMortgage=JSON.stringify(mortgage)!==JSON.stringify(next);mortgage=next;applyMortgage();}
   if(Object.hasOwn(d,'savingsMonthly')&&d.savingsMonthly===null){state.savingsMonthly=0;$('fu-savings').value='';}
  }
  const b=d.incomeBreakdown;state.incomeBreakdown=b&&typeof b==='object'?Object.fromEntries(['militaryMonthly','additionalMonthly','basePay','bah','bas'].map(key=>[key,typeof b[key]==='number'&&Number.isFinite(b[key])&&b[key]>=0&&b[key]<=1000000?b[key]:null])):null;for(const key of ['grossMonthly','netMonthly'])state[key]=typeof d[key]==='number'&&Number.isFinite(d[key])&&d[key]>=0?d[key]:null;if(Object.hasOwn(d,'savingsMonthly')&&typeof d.savingsMonthly==='number'&&Number.isFinite(d.savingsMonthly)&&d.savingsMonthly>=0&&d.savingsMonthly<=1000000){state.savingsMonthly=d.savingsMonthly;$('fu-savings').value=d.savingsMonthly;}if(typeof d.location==='string')state.location=d.location.slice(0,160);if(d.scenario&&typeof d.scenario==='object')state.scenario={...d.scenario};$('selectedLocation').textContent=state.location;$('fu-gross').value=state.grossMonthly??'';$('fu-net').value=state.netMonthly??'';if(loaded&&pendingMortgage){pendingMortgage=false;render();}schedule();});
 window.PCSUnitedFinancial={getState:()=>structuredClone(state),getMetrics:()=>result?.metrics??null,updateIncome:v=>{state.netMonthly=Number(v);schedule();},updateSavings:v=>{state.savingsMonthly=Number(v);$('fu-savings').value=v;schedule();},updateEmergencyFund:v=>{state.emergencyFund=Number(v);$('fu-emergency').value=v;schedule();},reset:()=>location.reload()};
 function start(){
  if(embedded&&!inlineIncome){
   if(window.ResizeObserver)new ResizeObserver(()=>queueSize()).observe($('budgetApp'));
   window.addEventListener('resize',()=>queueSize());
  }
  boot();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
