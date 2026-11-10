const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
let browser, hostServer;
const base = process.env.MORTGAGE_PREVIEW_URL || 'http://127.0.0.1:8144';
const screenshots = process.env.MORTGAGE_SCREENSHOTS || '/tmp/mortgage-views-check';
fs.mkdirSync(screenshots,{recursive:true});
(async () => {
  browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  let checks=0; const errors=[];
  function check(ok,message) { assert.ok(ok,message); checks++; }
  const page = await browser.newPage({viewport:{width:1180,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  const ready=async(p=page)=>p.waitForSelector('#pcsu-financial-input-panel[data-state="ready"]');
  const state=async()=>page.evaluate(()=>window.PCSUnitedMilitaryMortgage.getInputs());
  const select=async name=>page.locator('[data-mortgage-controls]').getByRole('button',{name,exact:true}).click();
  const hasOverflow=async p=>p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  await page.goto(base+'/Military-Mortgage/');await ready();await page.evaluate(()=>document.fonts.ready);
  check(await page.locator('#fi-view-calculator').isVisible(),'Calculator starts visible');
  check(!(await page.locator('#fi-view-summary').isVisible()),'Summary starts hidden');
  check((await page.locator('#fi-total-monthly-cost').textContent()).trim()==='$1,902','Screenshot example headline');
  check((await state()).totalMonthlyHousingCost===1901.73,'Full-precision result retained');
  check(await page.locator('#fi-cost-details').isHidden(),'Details do not crowd calculator');
  await page.locator('#pcsu-financial-input-panel').screenshot({path:path.join(screenshots,'calculator-desktop.png')});
  const revision=(await state()).revision;
  await select('Visualization');
  check(await page.locator('#fi-view-visualization').isVisible(),'Visualization screen');
  check((await page.locator('#mm-donut-total').textContent())==='$1,901.73','Chart uses authoritative amount');
  check((await page.locator('#mm-principal').textContent())==='$255,375.00','Chart includes financed VA fee');
  const taxes=page.locator('[data-cost="propertyTax"]');await taxes.focus();await page.keyboard.press('Enter');
  check((await page.locator('#mm-donut-total').textContent())==='$260.42','Keyboard legend drilldown');
  await page.keyboard.press('Enter');check((await page.locator('#mm-donut-total').textContent())==='$1,901.73','Legend resets to total');
  await page.locator('#pcsu-financial-input-panel').screenshot({path:path.join(screenshots,'visualization-desktop.png')});
  await select('Summary');
  check((await page.locator('#mm-summary-total').textContent())==='$1,901.73','Summary total matches');
  check((await page.locator('#mm-summary-reserve').textContent())==='Not entered','Example reserves remain unknown');
  check((await state()).revision===revision,'Switching views does not recalculate or reset');
  await page.locator('#pcsu-financial-input-panel').screenshot({path:path.join(screenshots,'summary-desktop.png')});
  await page.locator('#fi-cost-details summary').click();await page.locator('#fi-interest-rate').fill('0');await ready();
  check((await state()).interestRate===0,'Editable rate in Summary');
  await select('Visualization');check((await page.locator('#mm-interest').textContent())==='$0.00','Zero-interest graph');
  await select('Calculator');await page.locator('#fi-home-price').fill('');
  await select('Visualization');
  check(await page.locator('#fi-view-visualization [data-mm-result]').isHidden(),'Invalid input hides previous charts');
  check((await state()).mortgageEstimate===null,'Invalid input clears shared result');
  await page.locator('#fi-view-visualization').getByRole('button',{name:'Review entries'}).click();
  check(await page.locator('#fi-home-price').evaluate(e=>e===document.activeElement),'Invalid input recovery focus');
  await page.locator('#fi-home-price').fill('350000');await ready();
  await select('Summary');
  check((await page.locator('#mm-summary-price').textContent())==='$350,000.00','Summary updates after editing');
  await select('Calculator');await page.locator('#fi-emergency-fund').fill('');await select('Summary');
  check((await page.locator('#mm-summary-reserve').textContent())==='Not entered','Missing reserve remains unknown');
  // Exercise other programs through the shared API without changing the entered rate.
  for(const loanType of ['CONVENTIONAL','FHA','VA']) {
    await page.evaluate(t=>window.PCSUnitedMilitaryMortgage.setInputs({loanType:t,homePrice:250000,downPayment:12500,interestRate:6.1}),loanType);await ready();
    await select('Visualization');const s=await state();
    check((await page.locator('#mm-donut-total').textContent())===new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(s.totalMonthlyHousingCost),loanType+' visualization');
    if(loanType==='FHA') check((await page.locator('[data-cost="mortgageInsurance"]').textContent()).includes('FHA MIP'),'FHA-specific label');
  }
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.setInputs({downPayment:250000,propertyTaxAnnual:0,insuranceAnnual:0,hoaMonthly:0,otherOwnershipMonthly:0}));await ready();
  check((await page.locator('#mm-donut-total').textContent())==='$0.00','All-zero cost graph stays finite');
  check(!(await page.locator('#mm-donut').getAttribute('style')).includes('NaN'),'No zero-total NaN');
  // API failure clears all financial screens and supports retry.
  await page.route('**/api/mortgage',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.setInputs({downPayment:0}));
  await page.waitForSelector('#pcsu-financial-input-panel[data-state="error"]');
  check(await page.locator('#fi-view-visualization [data-mm-result]').isHidden(),'Failure hides chart');
  await select('Summary');check(await page.locator('#fi-view-summary [data-mm-result]').isHidden(),'Failure hides summary');
  await page.unroute('**/api/mortgage');await page.locator('#fi-view-summary [data-mm-status]').getByRole('button',{name:'Retry calculation'}).click();await ready();
  check(await page.locator('#fi-view-summary [data-mm-result]').isVisible(),'Retry restores summary');
  // Out-of-order network responses cannot restore an older scenario.
  await page.route('**/api/mortgage',async route=>{
    const body=route.request().postDataJSON();const response=await route.fetch();
    if(body.homePrice===300000) await new Promise(r=>setTimeout(r,450));
    try {await route.fulfill({response});}catch(_){}
  });
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.setInputs({homePrice:300000}));await page.waitForTimeout(80);
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.setInputs({homePrice:400000}));await ready();await page.waitForTimeout(550);
  check((await state()).mortgageEstimate.inputs.homePrice===400000,'Latest scenario wins response race');await page.unroute('**/api/mortgage');
  // Older service may lack additive amortization data; never invent it in the browser.
  await page.route('**/api/mortgage',async route=>{const response=await route.fetch();const data=await response.json();delete data.amortization;await route.fulfill({json:data});});
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.refresh());await ready();await select('Visualization');
  check(await page.locator('#mm-term-unavailable').isVisible(),'Older API shows unavailable term totals');
  check(await page.locator('#mm-term-ready').isHidden(),'Older API never fabricates term totals');await page.unroute('**/api/mortgage');
  // Retained input/slider behavior and responsive layouts.
  await page.evaluate(()=>window.PCSUnitedMilitaryMortgage.setInputs({homePrice:250000,downPayment:0,interestRate:6.1,propertyTaxAnnual:3125,insuranceAnnual:1125,emergencyFund:8500}));await ready();
  for(const width of [1180,900,768,390,320]) {
    await page.setViewportSize({width,height:900});
    for(const name of ['Calculator','Visualization','Summary']) {await select(name);check(!await hasOverflow(page),`${width}px ${name} no horizontal overflow`);}
  }
  await page.setViewportSize({width:390,height:844});await select('Calculator');
  await page.locator('#fi-home-price-slider').focus();await page.keyboard.press('ArrowRight');await ready();
  check((await state()).homePrice===255000,'Keyboard slider still recalculates');
  await page.locator('#pcsu-financial-input-panel').screenshot({path:path.join(screenshots,'calculator-phone.png')});
  await select('Visualization');await page.locator('#pcsu-financial-input-panel').screenshot({path:path.join(screenshots,'visualization-phone.png')});
  // Same-page Webflow form: button type must not submit the enclosing host form.
  const inline=await browser.newPage({viewport:{width:1180,height:900}});inline.on('pageerror',e=>errors.push(e.message));
  await inline.goto(base+'/Military-Mortgage/inline-preview.html');await ready(inline);
  await inline.evaluate(()=>{window.submitCount=0;const form=document.createElement('form');document.body.append(form);const nav=document.querySelector('[data-mortgage-controls]');form.append(nav);form.addEventListener('submit',e=>{e.preventDefault();window.submitCount++;});});
  await inline.getByRole('button',{name:'Visualization',exact:true}).click();check(await inline.locator('#fi-view-visualization').isVisible(),'Separate same-page buttons');
  check(await inline.evaluate(()=>window.submitCount===0),'Controls never submit Webflow form');
  // Serve the parent from a different local port: a real cross-origin document,
  // not an intercepted document (Chrome treats those as public-network sources).
  const hostHTML=fs.readFileSync(path.join(__dirname,'../Military-Mortgage/embed-preview.html'),'utf8').replace('src="/Military-Mortgage/','src="'+base+'/Military-Mortgage/').replace('<body>','<body><div style="height:2200px" aria-hidden="true"></div>');
  hostServer=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end(hostHTML);});
  await new Promise(resolve=>hostServer.listen(0,'127.0.0.1',resolve));
  const host=await browser.newPage({viewport:{width:1180,height:900}});host.on('pageerror',e=>errors.push(e.message));
  await host.goto(`http://127.0.0.1:${hostServer.address().port}/`);
  const frame=host.frameLocator('#pcsu-mortgage-frame');
  await host.getByRole('button',{name:'Visualization',exact:true}).waitFor();
  await host.waitForFunction(()=>!document.querySelector('[data-mm-select="visualization"]').disabled);
  check(await host.locator('#pcsu-mortgage-frame').evaluate(e=>e.getBoundingClientRect().top>innerHeight),'Controls become ready while the cross-origin iframe is below the fold');
  await host.getByRole('button',{name:'Visualization',exact:true}).click();
  await frame.locator('#fi-view-visualization:not([hidden])').waitFor();checks++;
  check(await frame.locator('#mm-standalone-controls').isHidden(),'No duplicate iframe controls');
  await host.getByRole('button',{name:'Summary',exact:true}).click();await frame.locator('#fi-view-summary:not([hidden])').waitFor();checks++;
  const embedded=host.frames().find(f=>f.url().includes('embedded=1'));
  await host.waitForFunction(()=>Number.parseFloat(document.getElementById('pcsu-mortgage-frame').style.height)>900);
  let heightMatched=false;
  for(let i=0;i<30;i++) {
    const frameHeight=await host.locator('#pcsu-mortgage-frame').evaluate(e=>e.getBoundingClientRect().height);
    const contentHeight=await embedded.evaluate(()=>document.body.getBoundingClientRect().height);
    if(Math.abs(frameHeight-contentHeight)<3) {heightMatched=true;break;}
    await host.waitForTimeout(100);
  }
  check(heightMatched,'Cross-origin auto height');
  await host.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://untrusted.invalid',source:document.querySelector('iframe').contentWindow,data:{source:'pcsunited-military-mortgage',type:'view-state',view:'calculator',height:1}})));
  check((await host.locator('[data-mm-select="summary"]').getAttribute('aria-pressed'))==='true','Untrusted host message ignored');
  await embedded.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://untrusted.invalid',source:window.parent,data:{source:'pcsunited-mortgage-controls',type:'set-view',view:'calculator'}})));
  check(await frame.locator('#fi-view-summary').isVisible(),'Untrusted frame message ignored');
  await host.setViewportSize({width:390,height:844});await host.getByRole('button',{name:'Calculator',exact:true}).click();await frame.locator('#fi-view-calculator:not([hidden])').waitFor();
  check(!await hasOverflow(host),'Phone embed controls fit');check(!await hasOverflow(embedded),'Phone embedded calculator fits');
  check(errors.length===0,'No uncaught browser errors: '+errors.join('; '));
  console.log(JSON.stringify({checks,errors,screenshots},null,2));
  await browser.close(); await new Promise(resolve=>hostServer.close(resolve));
})().catch(async error=>{console.error(error);await browser?.close();hostServer?.close();process.exitCode=1;});
