// Real browser + actual calculator apps/engines; only AI prose is mocked here.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {handler as mortgageHandler} from '../netlify/functions/mortgage.js';
import {handler as budgetHandler} from '../netlify/functions/finance-budget.js';
import {readRequest,buildPacket,runScenario} from '../netlify/functions/_share/pcsu-amy-context.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.PCSU_TEST_OUTPUT||path.join(root,'../pcsu-evidence');fs.mkdirSync(out,{recursive:true});
let failNext=false,delayNext=false;const requests=[],errors=[],checks=[];
const app=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  const handler={'/api/mortgage':mortgageHandler,'/api/finance-budget':budgetHandler}[p];
  if(handler){let body='';for await(const b of req)body+=b;const r=await handler({httpMethod:req.method,body});res.writeHead(r.statusCode,r.headers);res.end(r.body);return;}
  if(p==='/api/pcsu-ask-amy'){
    let body='';for await(const b of req)body+=b;const raw=JSON.parse(body);requests.push(raw);
    if(delayNext){delayNext=false;await new Promise(r=>setTimeout(r,1200));}
    if(failNext){failNext=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('{"ok":false}');return;}
    let data;try{const r=readRequest(raw),packet=buildPacket(r.context),scenarios=[];if(r.message.includes('300k'))scenarios.push(runScenario('calculate_mortgage',{changes:[{field:'homePrice',value:300000,evidence:'300k'}]},r,packet,1));
      data={ok:true,reply:'Your plan keeps housing and savings in view. Review your everyday expenses before making a decision.',history_reply:'Your plan keeps housing and savings in view.',facts:Object.values(packet.facts).filter(f=>['budget.cashFlow','budget.monthlySavings','mortgage.totalHousing'].includes(f.id)),citations:[{title:'CFPB · Budgeting tools',url:'https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/'}],scenarios,explanation_mode:'ai_grounded'};
    }catch{res.writeHead(400,{'Content-Type':'application/json'});res.end('{"ok":false,"code":"context_invalid"}');return;}
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));return;
  }
  let file=path.join(root,decodeURIComponent(p));if(!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin='http://localhost:'+app.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(origin+'/PCSU-Ask-Amy/');
 const mortgage=page.frames().find(f=>f.url().includes('/Military-Mortgage/')),budget=page.frames().find(f=>f.url().includes('/Finance-UX/'));
 await mortgage.waitForFunction(()=>window.PCSUnitedMilitaryMortgage);
 await mortgage.evaluate(()=>PCSUnitedMilitaryMortgage.setInputs({loanType:'VA',homePrice:240000,downPayment:0,interestRate:0,termYears:20,creditScore:720,propertyTaxAnnual:0,insuranceAnnual:0,hoaMonthly:0,otherOwnershipMonthly:0,pmiMonthly:null,vaFeeStatus:'exempt',feePayment:'finance'}));
 await mortgage.waitForFunction(()=>PCSUnitedMilitaryMortgage.getInputs().ready);
 await budget.waitForFunction(()=>window.PCSUnitedFinancial?.getMetrics());
 await budget.locator('[data-id="utilities"] .expense-amount-input input').fill('300.25');
 await budget.locator('[data-category="other"]').click();await budget.locator('[data-id="groceries"] .expense-amount-input input').fill('400');
 await budget.locator('[data-category="debt"]').click();await budget.locator('[data-id="auto-loan"] .expense-amount-input input').fill('200');
 await budget.waitForFunction(()=>PCSUnitedFinancial.getMetrics()?.cashFlow===3599.75);
 await page.locator('.amy-launch').click();await page.waitForFunction(()=>document.querySelector('.amy-context-text').textContent.includes('Draft budget'));
 const ask=async q=>{await page.locator('.amy-panel textarea').fill(q);await page.locator('.amy-send').click();await page.waitForFunction(()=>!document.querySelector('.amy-send').disabled);};
 await ask('Explain my current cash flow');assert.match(await page.locator('.amy-chat').innerText(),/3,599.75/);assert.equal(requests.at(-1).context.budget.state.savingsMonthly,500);checks.push('actual mortgage/budget frames connect and cash flow matches');
 await ask('How are savings included?');assert.equal(requests.at(-1).history.length,2);assert.equal(await page.locator('.amy-sources a').last().getAttribute('rel'),'noopener noreferrer');checks.push('history and source links');
 await ask('What if the home price were 300k?');assert.match(await page.locator('.amy-scenario').innerText(),/1,250.00/);assert.equal(await mortgage.evaluate(()=>PCSUnitedMilitaryMortgage.getInputs().homePrice),240000);checks.push('what-if uses real engine without changing page');
 const pre=await page.locator('.amy-context-text').textContent();await page.evaluate(()=>window.postMessage({source:'pcsu-mortgage-budget',version:1,type:'pcsu:mortgage-budget-state',snapshot:{revision:999999,ready:true,status:'ready',homePrice:1}},location.origin));assert.equal(await page.locator('.amy-context-text').textContent(),pre);checks.push('unregistered message source ignored');
 await page.screenshot({path:path.join(out,'desktop-panel.png')});
 const userCount=await page.locator('.amy-message[data-role=user]').count();failNext=true;await ask('Retry this question');assert.equal(await page.locator('.amy-message[data-role=user]').count(),userCount);assert.equal(await page.locator('.amy-panel textarea').inputValue(),'Retry this question');await page.locator('.amy-send').click();await page.waitForFunction(()=>!document.querySelector('.amy-send').disabled);assert.equal(await page.locator('.amy-message[data-role=user]').count(),userCount+1);checks.push('failed send retries without duplicate conversation turns');
 delayNext=true;await page.locator('.amy-panel textarea').fill('Explain while I edit');await page.locator('.amy-send').click();await page.locator('#preview-net').fill('6500');await page.waitForFunction(()=>!document.querySelector('.amy-send').disabled);assert.match(await page.locator('.amy-status').textContent(),/inputs changed/);assert.equal(await page.locator('.amy-panel textarea').inputValue(),'Explain while I edit');checks.push('changed input cancels stale reply');
 await page.locator('.amy-share').uncheck();await ask('Explain down payments');assert.deepEqual(requests.at(-1).context,{version:1});checks.push('page-sharing opt-out sends no financial context');
 await page.locator('.amy-reset').click();assert.equal(await page.locator('.amy-message').count(),1);await ask('Hello');assert.deepEqual(requests.at(-1).history,[]);checks.push('reset clears conversation history');
 await page.locator('.amy-panel textarea').press('Escape');assert(await page.locator('.amy-panel').isHidden());assert(await page.locator('.amy-launch').isVisible());checks.push('Escape closes and launcher returns');
 await page.setViewportSize({width:390,height:844});await page.locator('.amy-launch').click();const box=await page.locator('.amy-panel').boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);assert(await page.locator('.amy-send').isVisible());assert.equal(await page.locator('textarea').evaluate(el=>getComputedStyle(el).fontSize),'16px');await page.screenshot({path:path.join(out,'mobile-panel.png')});checks.push('mobile panel and composer fit viewport');
 assert.deepEqual(errors,[]);checks.push('no browser runtime errors');
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({checks,requests:requests.length,errors},null,2));console.log(JSON.stringify({checks,requests:requests.length,errors},null,2));
}finally{await browser.close();await new Promise(r=>app.close(r));}
