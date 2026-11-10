// Run with Playwright available through NODE_PATH. Uses the actual app bundles on two local origins.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {handler as mortgageHandler} from '../netlify/functions/mortgage.js';
import {handler as budgetHandler} from '../netlify/functions/finance-budget.js';
import {handler as analysisHandler} from '../netlify/functions/financial-analysis.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const requests=[];
const app=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
  const handler={'/api/mortgage':mortgageHandler,'/api/finance-budget':budgetHandler,'/api/financial-analysis':analysisHandler}[pathname];
  if(handler){let body='';for await(const part of req)body+=part;const answer=await handler({httpMethod:req.method,body});requests.push(pathname);res.writeHead(answer.statusCode,answer.headers);res.end(answer.body);return;}
  let file=path.join(root,decodeURIComponent(pathname));if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
const appOrigin='http://localhost:'+app.address().port;
let hostOrigin;
const host=http.createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 if(req.url==='/financial-analysis'){
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main style="margin-inline:45px">'+read('Webflow/financial-analysis-page.html').replaceAll('https://thewing.netlify.app',appOrigin)+'</main></body></html>');return;
 }
 const fixture='<script>window.income={complete:true,status:"manual",grossMonthlyIncome:8000,netMonthlyIncome:null,monthlySavingsContributions:null};window.PCSU_FINANCIAL_INCOME={getSnapshot:()=>structuredClone(income)};window.setIncome=(gross,net,savings=0)=>{income={complete:gross!==null,status:"manual",grossMonthlyIncome:gross,netMonthlyIncome:net,monthlySavingsContributions:savings};window.dispatchEvent(new CustomEvent("pcsu:financial-income-change",{detail:structuredClone(income)}));};</script>';
 res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fixture+
  `<iframe id="pcsu-mortgage-frame" title="Mortgage" src="${appOrigin}/Military-Mortgage/?embedded=1" style="width:100%;height:700px"></iframe>`+
  read('Webflow/financial-guidance-budget.html').replaceAll('https://thewing.netlify.app',appOrigin)+
  read('Webflow/financial-analysis-cta.html').replaceAll('https://pcs-united-com.webflow.io/financial-analysis',hostOrigin+'/financial-analysis')+'</body></html>');
});
await new Promise(resolve=>host.listen(0,'127.0.0.1',resolve));hostOrigin='http://localhost:'+host.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>window.addEventListener('message',e=>{if(e.data?.type==='pcsu:analysis-context')window.lastAnalysisMessage=structuredClone(e.data);}));
 await context.route(/^https:\/\//,route=>route.abort());
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 const page=await context.newPage();page.setDefaultTimeout(10000);
 await page.goto(hostOrigin+'/financial-guidance');
 const mortgage=page.frames().find(f=>f.url().includes('/Military-Mortgage/'));
 const budget=page.frames().find(f=>f.url().includes('/Finance-UX/'));
 await mortgage.waitForFunction(()=>window.PCSUnitedMilitaryMortgage);
 await mortgage.evaluate(()=>PCSUnitedMilitaryMortgage.setInputs({loanType:'VA',homePrice:240000,downPayment:0,interestRate:0,termYears:20,creditScore:720,propertyTaxAnnual:0,insuranceAnnual:0,hoaMonthly:0,otherOwnershipMonthly:0,pmiMonthly:null,vaFeeStatus:'exempt',feePayment:'finance'}));
 await mortgage.waitForFunction(()=>PCSUnitedMilitaryMortgage.getInputs().ready);
 await budget.waitForFunction(()=>window.PCSUnitedFinancial?.getMetrics());
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('300.25');
 await budget.click('[data-category="other"]');await budget.locator('[data-id="groceries"] .expense-amount-input input').fill('400');
 await budget.click('[data-category="debt"]');await budget.locator('[data-id="auto-loan"] .expense-amount-input input').fill('200');
 await budget.waitForFunction(()=>PCSUnitedFinancial.getMetrics()?.totalDebt===200);
 const popupPromise=page.waitForEvent('popup');await page.click('#pcsu-analysis-link');const popup=await popupPromise;
 await popup.waitForURL(hostOrigin+'/financial-analysis');
 let analysis;
 await popup.waitForFunction(()=>document.querySelector('#pcsu-analysis-frame')?.style.visibility==='visible');
 analysis=popup.frames().find(f=>f.url().includes('/PCSUnited-Analysis/'));
 const waitResult=predicate=>analysis.waitForFunction(predicate,{},{timeout:15000,polling:100});
 const get=()=>analysis.evaluate(()=>PCSUnitedAnalysis.getAnalysis());
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.beforeDeductionsRemaining===6099.75);
 let result=await get();assert.equal(result.summary.cashFlow,null);assert.equal(result.status,'incomplete');assert.equal(result.summary.reservesAfterClosing,null);
 assert.match(await analysis.locator('#heroCashLeft').textContent(),/6,099.75/);
 assert.equal(await analysis.locator('#healthResidual').textContent(),'—');
 assert.equal(await analysis.locator('#recommendedHomeRange').textContent(),'—');
 // Changes in the original tab update the already-open analysis tab.
 await budget.click('[data-category="monthly-expenses"]');await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('600.25');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.beforeDeductionsRemaining===5799.75);
 await page.evaluate(()=>setIncome(8000,6000,500));
 await page.bringToFront();await budget.click('#fu-settings-open');await budget.locator('#fu-reviewed').focus();await budget.locator('#fu-reviewed').press('Space');await budget.click('#budgetDetailsClose');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3299.75&&PCSUnitedAnalysis.getAnalysis()?.summary.reviewed);
 assert.equal((await get()).status,'within-guideline');
 await budget.locator('[data-id="projected-mortgage"] .expense-amount-input input').fill('1250.50');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 result=await get();assert.equal(result.mortgage.monthly.totalHousing,1000);assert.equal(result.summary.housingMonthly,1250.5);assert.equal(result.summary.manuallyAdjusted,true);
 // Blank or invalid inputs must clear stale totals immediately.
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===null&&PCSUnitedAnalysis.getAnalysis()?.budget===null);
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('600.25');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 await page.evaluate(()=>setIncome(0,0,500));await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===-2950.75);assert.equal((await get()).summary.housingRatioNet,null);
 await page.evaluate(()=>setIncome(8000,6000,500));await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 await mortgage.locator('#fi-emergency-fund').fill('0');await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.reservesAfterClosing===0);
 await mortgage.locator('#fi-emergency-fund').fill('5000');await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.reservesAfterClosing===5000&&PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 // Stress tests are temporary: both native sliders, precise inputs, reset, and rapid changes.
 const sourceBefore=await budget.evaluate(()=>JSON.stringify(PCSUnitedFinancial.getState()));
 const rangeBefore=(await get()).planning.homeRange.upper;
 await analysis.locator('#stressMortgage').evaluate(el=>{el.value='2000.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.summary.cashFlow===2299);
 assert.equal((await get()).summary.cashFlow,3049.25);assert.equal((await get()).planning.homeRange.upper,rangeBefore);
 assert.match(await analysis.locator('#heroCashLeft').textContent(),/2,299/);assert.equal(await analysis.locator('#previewBadge').isVisible(),true);
 await analysis.locator('#stressExpenses').evaluate(el=>{el.value='2000.25';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.summary.cashFlow===1299);
 assert.equal((await get()).planning.summary.monthlyDebt,200);assert.equal((await get()).planning.summary.monthlySavings,500);
 await analysis.locator('#stressMortgageAmount').fill('4500.25');await analysis.locator('#stressMortgageAmount').fill('5000.75');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.summary.cashFlow===-1701);
 assert.equal((await get()).planning.health.status,'at-risk');assert.match(await analysis.locator('#healthResidual').textContent(),/^-/);
 await analysis.locator('#stressMortgageAmount').fill('');assert.match(await analysis.locator('#stressStatus').textContent(),/valid amount/);
 await analysis.click('#resetStressTest');await waitResult(()=>!PCSUnitedAnalysis.getAnalysis()?.planning.stressTest.active&&PCSUnitedAnalysis.getAnalysis()?.planning.summary.cashFlow===3049.25);
 assert.equal(await analysis.locator('#previewBadge').isVisible(),false);assert.equal(await analysis.locator('#stressMortgageAmount').inputValue(),'1250.5');
 assert.equal(await budget.evaluate(()=>JSON.stringify(PCSUnitedFinancial.getState())),sourceBefore);
 await analysis.locator('#stressExpenses').focus();await analysis.locator('#stressExpenses').press('ArrowRight');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.stressTest.active===true);
 await analysis.click('#resetStressTest');await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.stressTest.active===false);
 await analysis.click('#reviewPlanButton');assert.match(await analysis.locator('#analysisReportContent').textContent(),/not an overall score/);await analysis.locator('#closeAnalysisReportButton').press('Escape');
 // A failed preview stays visibly unconfirmed and can be reset without losing the source budget.
 await context.route('**/api/financial-analysis',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Preview service unavailable.'})}));
 await analysis.locator('#stressMortgageAmount').fill('1800');
 await analysis.waitForFunction(()=>document.querySelector('#stressStatus').textContent.includes('Preview not updated'),{},{polling:100});
 assert.equal((await get()).planning.stressTest.active,false);assert.equal(await analysis.evaluate(()=>document.documentElement.classList.contains('analysis-preview-pending')),true);
 await context.unroute('**/api/financial-analysis');await analysis.click('#resetStressTest');await analysis.waitForFunction(()=>!document.documentElement.classList.contains('analysis-preview-pending'),{},{polling:100});
 // Fresh source data wins over a what-if preview and resets the controls.
 await analysis.locator('#stressMortgageAmount').fill('1800');await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.planning.stressTest.active===true);
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('650.25');
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===2999.25&&PCSUnitedAnalysis.getAnalysis()?.planning.stressTest.active===false);
 assert.equal(await analysis.locator('#stressMortgageAmount').inputValue(),'1250.5');
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('600.25');await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 // An unrelated frame/origin cannot replace the data, even with a high revision.
 await analysis.evaluate(origin=>{
  const valid=structuredClone(window.lastAnalysisMessage),forged={...valid,revision:999999,context:{version:1}};
  window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.example',source:parent,data:forged}));
  window.dispatchEvent(new MessageEvent('message',{origin,source:window,data:forged}));
  window.dispatchEvent(new MessageEvent('message',{origin,source:parent,data:{...forged,requestId:'wrong-nonce'}}));
  window.dispatchEvent(new MessageEvent('message',{origin,source:parent,data:{...forged,revision:valid.revision-1}}));
 },hostOrigin);
 assert.equal((await get()).summary.cashFlow,3049.25);
 assert.doesNotMatch(await analysis.locator('.price-scenarios-card__footer').textContent(),/36%/);
 await analysis.click('#viewDebtDetailsButton');assert.match(await analysis.locator('#analysisReportContent').textContent(),/Auto Loan|Auto loan/i);await analysis.locator('#closeAnalysisReportButton').press('Tab');assert.equal(await analysis.evaluate(()=>document.activeElement.id),'closeAnalysisReportButton');await analysis.locator('#closeAnalysisReportButton').press('Escape');assert.equal(await analysis.evaluate(()=>document.activeElement.id),'viewDebtDetailsButton');
 await popup.reload();await popup.waitForFunction(()=>document.querySelector('#pcsu-analysis-frame')?.style.visibility==='visible');analysis=popup.frames().find(f=>f.url().includes('/PCSUnited-Analysis/'));
 await waitResult(()=>PCSUnitedAnalysis.getAnalysis()?.summary.cashFlow===3049.25);
 await Promise.all([analysis.waitForNavigation({waitUntil:'load'}),analysis.evaluate(()=>location.reload())]);await analysis.waitForFunction(()=>window.PCSUnitedAnalysis?.getAnalysis()?.summary.cashFlow===3049.25);
 assert.equal(await analysis.evaluate(()=>sessionStorage.length),0);assert.equal(await analysis.evaluate(()=>localStorage.length),0);
 const screenshots=process.env.ANALYSIS_SCREENSHOT_DIR;
 if(screenshots){fs.mkdirSync(screenshots,{recursive:true});await popup.screenshot({path:path.join(screenshots,'Financial-Analysis-Connected-Desktop.png'),fullPage:true});}
 await popup.setViewportSize({width:390,height:850});
 assert.equal(await analysis.evaluate(()=>innerWidth),300,'Webflow mobile wrapper leaves a 300px iframe');
 assert.equal(await analysis.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile iframe overflow');
 if(screenshots)await popup.screenshot({path:path.join(screenshots,'Financial-Analysis-Connected-Mobile.png'),fullPage:true});
 const direct=await context.newPage();await direct.goto(hostOrigin+'/financial-analysis');await direct.waitForFunction(()=>document.querySelector('#pcsu-analysis-frame')?.style.visibility==='visible');const empty=direct.frames().find(f=>f.url().includes('/PCSUnited-Analysis/'));
 assert.equal(await empty.evaluate(()=>PCSUnitedAnalysis.getAnalysis()),null);assert.equal(await empty.locator('#healthResidual').textContent(),'—');assert.equal(await empty.locator('#stressMortgage').isDisabled(),true);assert.match(await direct.locator('#pcsu-analysis-page-status').textContent(),/Open Financial Analysis from/);
 // Popup blocking leaves the source page and its inputs intact.
 await popup.close();await page.evaluate(()=>{window.open=()=>null});await page.click('#pcsu-analysis-link');assert.match(await page.locator('#pcsu-analysis-status').textContent(),/Allow a new tab/);assert.equal(page.url(),hostOrigin+'/financial-guidance');
 assert.deepEqual(errors,[]);assert(requests.includes('/api/financial-analysis'));
 console.log('PASS: actual Finance-UX + mortgage → CTA → separate Webflow page → analysis iframe; cents, live changes, manual mortgage, gross-only/zero income, invalidation, reserve intent, reload/reconnect, blocked popup, direct visit, cross-origin rejection, no storage, and mobile layout.');
}finally{await browser.close();app.closeAllConnections();host.closeAllConnections();await Promise.all([new Promise(r=>app.close(r)),new Promise(r=>host.close(r))]);}
