// Exact Webflow embeds, Brief title and input-section BAH header. Local deterministic handlers by
// default; BRIEF_DEPLOYED=1 tests the real deployed child and compensation API.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=process.env.BRIEF_APP_ORIGIN||'https://thewing.netlify.app',parent='https://pcs-united-com.webflow.io';
const deployed=process.env.BRIEF_DEPLOYED==='1',out=process.env.BRIEF_OUTPUT;
const strip=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt'),'utf8');
const embed=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCSUnited-PCS-Snapshot-Brief-iframe.txt'),'utf8').replace('data-state="idle" data-view="brief"','data-state="idle" data-view="pay"').replace('data-app-url="https://thewing.netlify.app/',`data-app-url="${app}/`);
const header=fs.readFileSync(path.join(root,'BAH-Calculator/bah-header.js'),'utf8');
const head='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f7f9fb;font-family:Arial;color:#17334b}main{max-width:1460px;padding:20px;margin:auto}h1{font-size:40px}p{line-height:1.6}</style></head><body><main>';
const layout='<div id="pcs1-map-layout"><div class="pcs1-map-copy"><h1>Select your PCS Location</h1><p>Choose your base, rank, years of service and family size. Then select Analyze.</p>'+strip+'</div><div id="pcs1-map-host"></div></div>';
const harness=head+layout+embed+'</main></body></html>';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<250;i++){if(await fn())return;await sleep(100);}throw new Error('Timed out: '+label);}
(async()=>{
 const {handler:brain}=await import('../netlify/functions/opensource-brain.js');
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRIEF_BROWSER});
 const report=[],check=name=>{report.push(name);console.log('PASS '+name);};
 let context,page;
 try{
  context=await browser.newContext({viewport:{width:1460,height:950}});
  let payCalls=[],otherCalls=[],failPay=false,holdPay=false,held=[],holdHeader=false,heldHeaders=[];
  const errors=[];
  await context.addInitScript(()=>{
   for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new Error(key+' accessed');}});
  });
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),low=u.pathname.toLowerCase();
   if(u.origin===parent)return route.fulfill({contentType:'text/html',body:u.pathname==='/strip-only'?head+strip+'</main></body></html>':harness});
   if(u.origin===app&&low==='/api/opensource-brain'){
    const body=JSON.parse(req.postData());payCalls.push(body);
    if(holdPay)await new Promise(resolve=>held.push(resolve));
    if(failPay)return route.fulfill({status:503,json:{ok:false}}).catch(()=>{});
    if(deployed)return route.continue().catch(()=>{});
    const result=await brain({httpMethod:'POST',body:JSON.stringify(body)});
    return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body}).catch(()=>{});
   }
   if(u.origin===app){
    if(low==='/api/mortgage'||low.startsWith('/netlify/functions/cities/'))otherCalls.push(low);
    if(low==='/bah-calculator/bah-header.js'&&holdHeader)await new Promise(resolve=>heldHeaders.push(resolve));
    if(deployed)return route.continue().catch(()=>{});
    let name=u.pathname.slice(1);if(name.endsWith('/'))name+='index.html';
    const file=path.resolve(root,name);
    if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'}).catch(()=>{});
   }
   if(['cdn.prod.website-files.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();
   return route.abort();
  });
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const state=()=>page.locator('#pcsu-brief-card').getAttribute('data-state');
  const ready=()=>until(async()=>await state()==='ready','pay brief ready');
  const child=()=>page.frames().find(f=>f.url().toLowerCase().startsWith(app.toLowerCase()+'/pcs-snapshot-brief/'));
  const choose=async(base='Davis-Monthan AFB',rank='E7',yos='16',family='4')=>{
   if(await page.locator('#sass-input-switch').getAttribute('data-mode')==='summary'){await page.locator('#sass-edit-btn').focus();await page.keyboard.press('Enter');}
      await page.selectOption('#sass-rank',rank);await page.selectOption('#sass-yos',yos);await page.selectOption('#sass-family',family);await page.selectOption('#sass-base',base);
  };
  const box=()=>page.locator('#pcsu-brief-card').boundingBox();
  await page.goto(parent+'/brief-pay-test',{waitUntil:'domcontentloaded'});
  const original=await box();assert.equal(await state(),'idle');assert.equal(await page.locator('#pcsu-brief-frame').getAttribute('src'),null);assert.equal(payCalls.length,0);
  const cover=await page.locator('#pcsu-brief-cover img').getAttribute('src');assert.match(cover,/Air%20Force%20Base%20Demographics.jpg$/);
  check('fresh page retains original cover and loads no base or compensation');
  await choose();await page.click('#sass-analyze-btn');await ready();let f=child();
  assert.equal(await f.locator('#total-pay').innerText(),'$8,622.85');assert.equal(await f.locator('#pay-toolbar h1').innerText(),'PCS Snapshot Brief');
  assert.equal(await f.locator('[id^=pcsu-bah-header]').count(),0);assert.match(await f.locator('#brief-profile').innerText(),/Davis-Monthan AFB · E-7 · 16 years · 4 people/);
  assert.equal(await f.locator('#base-pay').innerText(),'$6,000.90');assert.equal(await f.locator('#bah').innerText(),'$2,145.00');assert.equal(await f.locator('#bas').innerText(),'$476.95');
  assert.equal(await f.locator('.destination').isVisible(),false);assert.equal(await f.locator('.housing').isVisible(),false);assert.equal(await f.locator('.intro').isVisible(),false);assert.equal(await page.locator('.brief-head').isVisible(),false);
  assert.deepEqual(payCalls.at(-1),{tool:'PCS_SNAPSHOT',input:{rank:'E7',yos:16,base:'Davis-Monthan AFB',hasDependents:true}});
  assert.deepEqual(otherCalls,[]);assert.ok(Math.abs((await box()).height-original.height)<1);assert.equal((await box()).width,original.width);
  check('reference pay and donut match; title replaces duplicate header without changing card dimensions');
  await f.locator('#pay-info').click();assert.equal(await f.locator('#pay-notes').isVisible(),true);assert.match(await f.locator('#pay-notes').innerText(),/Total includes Base Pay \+ BAH \+ BAS/);assert.match(await f.locator('#pay-notes').innerText(),/2 or more = with dependents/);await f.locator('#pay-notes button').click();
  const large=new URL(await f.locator('#brief-open').getAttribute('href'));assert.equal(large.searchParams.has('requestId'),false);assert.equal(large.searchParams.has('parentOrigin'),false);assert.equal(large.searchParams.get('rank'),'E7');assert.equal(large.pathname,'/PCS-Snapshot/index.html');assert.equal(large.searchParams.get('newBase'),'Davis-Monthan AFB');assert.equal(large.href,await page.locator('#pcsu-brief-open').getAttribute('href'));
  check('pay source details are accessible; Open larger preserves selection without embed credentials');
  await f.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://thewing.netlify.app',data:{type:'pcsunited-bah-compensation',payload:{basePay:1,bah:2,bas:3,total:6}}})));
  assert.equal(await f.locator('#total-pay').innerText(),'$8,622.85');
  check('Brief compensation ignores unrelated calculator broadcasts');
  if(out){fs.mkdirSync(out,{recursive:true});await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,'pcs-brief-total-pay-desktop.png')});}
  for(const width of [390,320,768]){
   await page.setViewportSize({width,height:950});await sleep(200);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`parent width ${width}`);
   assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`child width ${width}`);
   assert.ok(await f.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),`child height ${width}`);
   assert.ok(Math.abs((await box()).height-original.height)<1);
   if(out&&width===390)await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,'pcs-brief-total-pay-mobile.png')});
  }
  check('390px, 320px and 768px retain cover height with no horizontal or vertical iframe overflow');
  await page.setViewportSize({width:1460,height:950});await choose('Travis AFB','E6','14','3');assert.equal(await state(),'idle');assert.equal(await page.locator('#pcsu-brief-cover').isVisible(),true);await page.click('#sass-analyze-btn');await ready();f=child();
  assert.notEqual(await f.locator('#bah').innerText(),'$2,145.00');assert.equal(await f.locator('#base-pay').innerText(),'$5,130.30');assert.match(await f.locator('#brief-profile').innerText(),/Travis AFB · E-6 · 14 years · 3 people/);assert.equal(new URL(await f.locator('#brief-open').getAttribute('href')).searchParams.get('newBase'),'Travis AFB');
  await choose('Davis-Monthan AFB','E6','14','1');await page.click('#sass-analyze-btn');await ready();assert.equal(payCalls.at(-1).input.hasDependents,false);assert.match(await child().locator('#brief-profile').innerText(),/1 person/);assert.equal(new URL(await child().locator('#brief-open').getAttribute('href')).searchParams.get('hasDependents'),'false');
  check('new rank, service, destination and family update the title, pay and full Snapshot link');
  failPay=true;await page.click('#sass-analyze-btn');await until(async()=>await state()==='error','pay failure');assert.equal(await page.locator('#pcsu-brief-cover').isVisible(),true);
  const failedId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
  failPay=false;await page.click('#pcsu-brief-retry');await ready();assert.notEqual(new URL(child().url()).searchParams.get('requestId'),failedId);
  check('failed compensation keeps cover and Retry recovers with a new request ID');
  if(!deployed){
   holdPay=true;await choose();await page.click('#sass-analyze-btn');await until(()=>held.length>0,'held old pay');
   const oldId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
   await choose('Travis AFB');await page.click('#sass-analyze-btn');await until(()=>held.length>1,'held new pay');f=child();
   const newId=new URL(f.url()).searchParams.get('requestId');
   await f.evaluate(({id,target})=>parent.postMessage({source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready'},target),{id:oldId,target:parent});
   await page.evaluate(({id,origin})=>{
    const data={source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready',height:9999};
    window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.example',source:document.querySelector('#pcsu-brief-frame').contentWindow,data}));
    window.dispatchEvent(new MessageEvent('message',{origin,source:window,data}));
   },{id:newId,origin:app});await sleep(100);assert.equal(await state(),'loading');
   holdPay=false;held.splice(0).forEach(release=>release());await ready();assert.match(await child().locator('#brief-profile').innerText(),/Travis/);
   check('loaded document, stale results, wrong origin and wrong source cannot reveal earlier pay');
   // Exercise both script orders: genuine Analyze before embed exists, then
   // the optional input header is delayed without blocking Brief readiness.
   await page.goto(parent+'/strip-only',{waitUntil:'domcontentloaded'});await choose();const callsBefore=payCalls.length;await page.click('#sass-analyze-btn');holdHeader=true;
   await page.evaluate(html=>{const el=document.createElement('div');el.innerHTML=html;document.body.append(el);for(const old of el.querySelectorAll('script')){const s=document.createElement('script');s.textContent=old.textContent;old.replaceWith(s);}},embed);
   await until(()=>heldHeaders.length>0,'delayed shared header');await ready();assert.equal(await page.locator('#sass-input-switch').getAttribute('data-mode'),'edit');holdHeader=false;heldHeaders.splice(0).forEach(release=>release());await ready();assert.equal(payCalls.length,callsBefore+1);
   assert.equal(await child().locator('#total-pay').innerText(),'$8,622.85');
   check('Analyze is replayed once before parent mount; input header delay does not block Brief readiness');
   await context.route('**/PCS-Snapshot-Brief/brief.js',route=>route.fulfill({contentType:'application/javascript',body:'// stalled child'}));
   await page.clock.install();await page.click('#sass-analyze-btn');await until(async()=>child()?.url().includes('requestId='),'stalled child');const timedId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
   await page.clock.fastForward(31000);assert.equal(await state(),'error');await child().evaluate(({id,target})=>parent.postMessage({source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready'},target),{id:timedId,target:parent});await sleep(100);assert.equal(await state(),'error');
   await context.unroute('**/PCS-Snapshot-Brief/brief.js');
   check('timeout invalidates readiness; late ready cannot uncover the card');
   // Shared header regression: default calculator transport still listens,
   // manual mode must not broadcast wildcard snapshot requests to any iframe.
   const legacy=await context.newPage();await legacy.goto(parent+'/header-test');
   await legacy.setContent('<div id="pcsu-bah-header-progression-widget"></div>');await legacy.addScriptTag({content:header});
   await legacy.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{origin:'https://thewing.netlify.app',data:{type:'pcsunited-bah-compensation',payload:{basePay:100,bah:200,bas:300,total:600}}})));
   assert.equal(await legacy.locator('#pcsu-bah-header-value-total').innerText(),'$600.00');
   await legacy.goto(parent+'/header-manual-test');await legacy.setContent('<div id="pcsu-bah-header-progression-widget" data-transport="manual"></div><iframe></iframe>');
   await legacy.evaluate(()=>{window.sent=[];document.querySelector('iframe').contentWindow.postMessage=(...args)=>window.sent.push(args);});await legacy.addScriptTag({content:header});
   await legacy.evaluate(()=>window.PCSU_BAH_HEADER.refresh());assert.deepEqual(await legacy.evaluate(()=>window.sent),[]);await legacy.close();
   check('original BAH calculator message transport still works; manual header emits no frame requests');
  }
  const bare=await context.newPage(),beforeBare=payCalls.length;await bare.goto(app+'/PCS-Snapshot-Brief/index.html',{waitUntil:'domcontentloaded'});assert.equal(await bare.locator('#result').isVisible(),false);assert.equal(payCalls.length,beforeBare);await bare.close();
  assert.deepEqual(errors,[]);assert.equal(await context.cookies().then(x=>x.length),0);
  check('bare app stays idle; no browser errors, storage access or cookies');
  if(out)fs.writeFileSync(path.join(out,deployed?'pay-browser-deployed-results.json':'pay-browser-results.json'),JSON.stringify({mode:deployed?'deployed child and API with local Webflow parent embeds':'local child and repository API handler',appOrigin:app,browser:await browser.version(),originalCard:original,checks:report},null,2));
 }catch(error){if(page){console.error('Parent state:',await page.locator('#pcsu-brief-card').getAttribute('data-state').catch(()=>''));for(const f of page.frames().filter(f=>f.url().startsWith(app)))console.error('Child:',await f.locator('body').innerText().catch(()=>''));}throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
