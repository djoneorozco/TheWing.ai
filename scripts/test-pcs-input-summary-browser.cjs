const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=process.env.BRIEF_APP_ORIGIN||'https://thewing.netlify.app',parent='https://pcs-united-com.webflow.io';
const deployed=process.env.BRIEF_DEPLOYED==='1',out=process.env.BRIEF_OUTPUT;
const strip=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt'),'utf8');
const embed=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCSUnited-PCS-Snapshot-Brief-iframe.txt'),'utf8').replace('data-app-url="https://thewing.netlify.app/',`data-app-url="${app}/`);
const fixture='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;color:#17334b;background:#f5f5f2;font-family:Arial}main{padding:28px;max-width:1680px;margin:auto}h1{font-size:44px;margin:48px 0 18px}p{line-height:1.6}.intro{margin-bottom:42px}</style></head><body><main><div id="pcs1-map-layout"><div class="pcs1-map-copy"><h1>PCS-Snapshot</h1><p class="intro">Choose your base, rank, years of service and family size. Then select Analyze.</p>'+strip+'<p>Explore your next base with PCSUnited.</p></div><div id="pcs1-map-host"></div></div>'+embed+'</main></body></html>';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<250;i++){if(await fn())return;await sleep(100);}throw new Error('Timed out: '+label);}
(async()=>{
 const {handler:brain}=await import('../netlify/functions/opensource-brain.js');
 const {handler:mortgage}=await import('../netlify/functions/mortgage.js');
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRIEF_BROWSER});
 const checks=[],check=name=>{checks.push(name);console.log('PASS '+name);};
 let page,holdPay=false,failPay=false,holdParentHeader=false,failParentHeader=false,held=[],heldHeaders=[],payCalls=0,headerCalls=0,errors=[];
 async function setup(options){
  const context=await browser.newContext(options);
  await context.addInitScript(()=>{for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new Error(key+' accessed');}});});
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),low=u.pathname.toLowerCase();
   if(u.origin===parent)return route.fulfill({contentType:'text/html',body:fixture});
   if(u.origin===app){
    if(low==='/api/opensource-brain'||low==='/api/mortgage'){
     const isPay=low.endsWith('opensource-brain');if(isPay){payCalls++;if(holdPay)await new Promise(r=>held.push(r));if(failPay)return route.fulfill({status:503,json:{ok:false}}).catch(()=>{});}
     if(deployed)return route.continue().catch(()=>{});
     const result=await(isPay?brain:mortgage)({httpMethod:'POST',body:req.postData()});
     return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body}).catch(()=>{});
    }
    if(low==='/bah-calculator/bah-header.js'&&req.frame().url().startsWith(parent)){
     headerCalls++;if(holdParentHeader)await new Promise(r=>heldHeaders.push(r));if(failParentHeader)return route.abort().catch(()=>{});
    }
    if(deployed)return route.continue().catch(()=>{});
    let name=u.pathname.slice(1);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,name);
    if(file.startsWith(root+path.sep)&&fs.existsSync(file))return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html'}).catch(()=>{});
   }
   if(['cdn.prod.website-files.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();
   return route.abort();
  });
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));return {context,page:p};
 }
 const mode=p=>p.locator('#sass-input-switch').getAttribute('data-mode');
 const state=p=>p.locator('#pcsu-brief-card').getAttribute('data-state');
 const ready=p=>until(async()=>await mode(p)==='summary','summary ready');
 const child=p=>p.frames().find(f=>f.url().toLowerCase().startsWith(app.toLowerCase()+'/pcs-snapshot-brief/'));
 const total=p=>p.locator('#pcsu-snapshot-input-pay-widget-value-total').innerText();
 async function editKeyboard(p){await p.locator('#sass-edit-btn').focus();await p.keyboard.press('Enter');assert.equal(await mode(p),'edit');}
 async function choose(p,base='Davis-Monthan AFB',rank='E7',yos='16',family='4'){
  if(await mode(p)==='summary')await editKeyboard(p);
  await p.selectOption('#sass-rank',rank);await p.selectOption('#sass-yos',yos);await p.selectOption('#sass-family',family);await p.selectOption('#sass-base',base);
 }
 try{
  const desktop=await setup({viewport:{width:1680,height:1000}});page=desktop.page;
  await page.goto(parent+'/input-summary',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await mode(page),'edit');assert.equal(payCalls,0);assert.equal(headerCalls,0);
  await choose(page);assert.equal(await mode(page),'edit');assert.equal(payCalls,0);
  const originalHeight=await page.locator('#sass-input-switch').evaluate(el=>el.getBoundingClientRect().height);
  check('fresh and completed-but-not-analyzed inputs stay editable without a default request');
  holdPay=true;await page.click('#sass-analyze-btn');await until(()=>held.length>0,'held first pay');assert.equal(await mode(page),'edit');assert.equal(await state(page),'loading');holdPay=false;held.splice(0).forEach(r=>r());await ready(page);
  assert.equal(await total(page),'$8,622.85');assert.equal(await child(page).locator('#total-pay').innerText(),await total(page));assert.equal(payCalls,1);assert.equal(headerCalls,1);
  assert.ok(Math.abs(await page.locator('#sass-input-switch').evaluate(el=>el.getBoundingClientRect().height)-originalHeight)<2);
  assert.equal(await page.locator('#sass-rank').isVisible(),false);assert.equal(await page.locator('#sass-rank').evaluate(el=>el.closest('#sass-input-row').inert),true);
  check('verified Analyze swaps four fields for the real shared header; exact same pay with no extra API call');
  if(out){fs.mkdirSync(out,{recursive:true});await until(()=>child(page).locator('#destination-image').evaluate(img=>img.complete),'destination image settled');await page.locator('main').screenshot({path:path.join(out,'pcs-input-summary-desktop.png')});}
  const beforeHover=payCalls;
  await page.locator('#sass-input-switch').hover();assert.equal(await mode(page),'edit');assert.equal(await page.inputValue('#sass-base'),'Davis-Monthan AFB');assert.equal(await state(page),'ready');
  await page.locator('#sass-rank').focus();await page.mouse.move(2,2);await page.keyboard.press('Tab');await sleep(50);assert.equal(await page.locator('#sass-yos').evaluate(el=>el===document.activeElement),true);assert.equal(await mode(page),'edit');await page.locator('#sass-analyze-btn').focus();await ready(page);assert.equal(payCalls,beforeHover);
  check('hover restores selections; focus keeps fields open; leaving unchanged restores summary without recalculation');
  await editKeyboard(page);assert.equal(await page.locator('#sass-rank').evaluate(el=>el===document.activeElement),true);
  await page.selectOption('#sass-rank','E6');await page.selectOption('#sass-yos','14');await page.selectOption('#sass-family','3');await page.mouse.move(2,2);await page.locator('#sass-analyze-btn').focus();
  assert.equal(await mode(page),'edit');assert.equal(await state(page),'idle');await page.click('#sass-analyze-btn');await ready(page);assert.equal(await total(page),'$7,728.25');
  check('keyboard edit preserves values; changed fields remain visible until a new successful Analyze');
  failPay=true;await page.click('#sass-analyze-btn');await until(async()=>await state(page)==='error','pay error');assert.equal(await mode(page),'edit');failPay=false;await page.click('#pcsu-brief-retry');await ready(page);assert.equal(await total(page),'$7,728.25');
  check('failed Analyze keeps inputs editable; the existing Brief Retry restores the summary');
  const oldId=new URL(child(page).url()).searchParams.get('requestId');holdPay=true;await choose(page,'Travis AFB','E7','16','4');await page.click('#sass-analyze-btn');await until(()=>held.length>0,'held new pay');
  const currentId=new URL(child(page).url()).searchParams.get('requestId');
  const packet={source:'pcsu-snapshot-brief',type:'pcsu:brief-status',state:'ready',requestId:oldId,selection:{rank:'E7',yos:16,family:4,hasDependents:true,base:'Travis AFB',cityKey:'Travis'},monthly:{basicPay:1,bah:2,bas:3,grossMonthlyComp:6}};
  await child(page).evaluate(({packet,target})=>parent.postMessage(packet,target),{packet,target:parent});
  await page.evaluate(({packet,id,origin})=>{
   packet.requestId=id;window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.example',source:document.querySelector('#pcsu-brief-frame').contentWindow,data:packet}));window.dispatchEvent(new MessageEvent('message',{origin,source:window,data:packet}));
  },{packet,id:currentId,origin:app});await sleep(100);assert.equal(await mode(page),'edit');assert.equal(await state(page),'loading');holdPay=false;held.splice(0).forEach(r=>r());await ready(page);
  assert.notEqual(await total(page),'$6.00');assert.equal(await total(page),await child(page).locator('#total-pay').innerText());
  check('stale request IDs, wrong origin and wrong source cannot replace the summary');
  // Two real shared header instances on one document must not share DOM IDs/API.
  await page.evaluate(()=>{const mount=document.createElement('div');mount.id='pcsu-bah-header-progression-widget';mount.dataset.transport='manual';document.body.append(mount);});
  await page.addScriptTag({url:app+'/BAH-Calculator/bah-header.js'});
  const summaryTotal=await total(page);await page.evaluate(()=>window.PCSU_BAH_HEADER.setSnapshot({basePay:100,bah:200,bas:300,total:600}));
  assert.equal(await page.locator('#pcsu-bah-header-value-total').innerText(),'$600.00');assert.equal(await total(page),summaryTotal);
  assert.equal(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return ids.length===new Set(ids).size;}),true);
  check('independent input widget coexists with the original BAH header without duplicate IDs or shared state');
  // Parent widget may load after a user changes selections; never collapse that edit.
  await page.goto(parent+'/delayed-header',{waitUntil:'domcontentloaded'});holdParentHeader=true;await choose(page);await page.click('#sass-analyze-btn');await until(()=>heldHeaders.length>0,'held parent widget');await until(async()=>await state(page)==='ready','right ready');assert.equal(await mode(page),'edit');await page.selectOption('#sass-base','Travis AFB');holdParentHeader=false;heldHeaders.splice(0).forEach(r=>r());await sleep(250);assert.equal(await mode(page),'edit');assert.equal(await state(page),'idle');await page.click('#sass-analyze-btn');await ready(page);assert.match(await page.locator('#pcsu-snapshot-input-pay-widget-support-bah').innerText(),/Travis/);
  check('delayed header initialization cannot collapse newer edits; reanalyzing uses the latest profile');
  await page.goto(parent+'/header-outage',{waitUntil:'domcontentloaded'});failParentHeader=true;await choose(page);await page.click('#sass-analyze-btn');await until(async()=>/summary unavailable/.test(await page.locator('#sass-status').innerText()),'summary outage');assert.equal(await mode(page),'edit');assert.equal(await state(page),'ready');failParentHeader=false;await page.click('#sass-analyze-btn');await ready(page);
  check('header asset outage leaves fields usable and Brief intact; the next Analyze recovers');
  const mobile=await setup({viewport:{width:390,height:900},isMobile:true,hasTouch:true});const phone=mobile.page;
  await phone.goto(parent+'/touch-summary',{waitUntil:'domcontentloaded'});await choose(phone);await phone.locator('#sass-analyze-btn').tap();await ready(phone);
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(out)await phone.locator('#sass-front-strip').screenshot({path:path.join(out,'pcs-input-summary-mobile.png')});
  await phone.locator('#sass-edit-btn').tap();assert.equal(await mode(phone),'edit');await phone.selectOption('#sass-family','1');await phone.locator('#sass-analyze-btn').tap();await ready(phone);assert.match(await phone.locator('#pcsu-snapshot-input-pay-widget-support-bah').innerText(),/Without dependents/);
  await phone.setViewportSize({width:320,height:900});assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.locator('#sass-edit-btn').tap();assert.equal(await mode(phone),'edit');
  check('touch tap edits and reanalyzes; 390px and 320px layouts have no horizontal overflow');
  assert.deepEqual(errors,[]);assert.equal((await desktop.context.cookies()).length,0);assert.equal((await mobile.context.cookies()).length,0);
  check('no JavaScript errors, storage access or cookies');
  if(out)fs.writeFileSync(path.join(out,deployed?'input-summary-deployed-results.json':'input-summary-results.json'),JSON.stringify({mode:deployed?'deployed child and APIs; local exact Webflow embeds':'local repository app, APIs and exact Webflow embeds',browser:await browser.version(),checks},null,2));
 }catch(e){if(page)console.error('Input:',await page.locator('#sass-status').innerText().catch(()=>''),'Mode:',await mode(page).catch(()=>''),'Card:',await state(page).catch(()=>''),'Header requests:',headerCalls,'Errors:',errors);throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
