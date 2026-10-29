// Exact parent embeds, actual Brief and full PCS-Snapshot app. APIs remain live.
// BRIEF_DEPLOYED=1 also uses deployed assets instead of local repository files.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=process.env.BRIEF_APP_ORIGIN||'https://thewing.netlify.app';
const parent='https://pcs-united-com.webflow.io',deployed=process.env.BRIEF_DEPLOYED==='1',out=process.env.BRIEF_OUTPUT;
const strip=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt'),'utf8');
const embed=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCSUnited-PCS-Snapshot-Brief-iframe.txt'),'utf8').replace('data-app-url="https://thewing.netlify.app/',`data-app-url="${app}/`);
const fixture='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f5f5f2;color:#17334b;font-family:Arial}main{padding:28px;max-width:1680px;margin:auto}h1{font-size:44px;margin:48px 0 18px}.intro{line-height:1.6;margin-bottom:42px}</style></head><body><main><div id="pcs1-map-layout"><div class="pcs1-map-copy"><h1>PCS-Snapshot</h1><p class="intro">Choose your base, rank, years of service and family size. Then select Analyze.</p>'+strip+'</div><div id="pcs1-map-host"></div></div>'+embed+'</main></body></html>';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<300;i++){if(await fn())return;await sleep(100);}throw new Error('Timed out: '+label);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BRIEF_BROWSER});
 const checks=[],check=name=>{checks.push(name);console.log('PASS '+name);},errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1680,height:1000}});
  // Brief must remain storage-free; the unchanged full app has legacy session reads.
  await context.addInitScript(()=>{
   if(!location.pathname.toLowerCase().startsWith('/pcs-snapshot/'))for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new Error(key+' accessed');}});
  });
  let childHeaderRequests=0;
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===parent)return route.fulfill({contentType:'text/html',body:fixture});
   if(u.pathname.toLowerCase()==='/bah-calculator/bah-header.js'&&req.frame().url().toLowerCase().includes('/pcs-snapshot-brief/'))childHeaderRequests++;
   if(!deployed&&u.origin===app&&!u.pathname.startsWith('/api/')){
    let file=u.pathname.slice(1);if(file.endsWith('/'))file+='index.html';file=path.resolve(root,file);
    if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html'});
   }
   return route.continue();
  });
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page=await context.newPage();await page.goto(parent+'/brief-navigation',{waitUntil:'domcontentloaded'});
  const original=await page.locator('#pcsu-brief-card').boundingBox();
  assert.equal(await page.locator('#pcsu-brief-open').isVisible(),false);assert.equal(await page.locator('#pcsu-brief-frame').getAttribute('src'),null);
  await page.selectOption('#sass-base','Davis-Monthan AFB');await page.click('#sass-analyze-btn');
  const ready=()=>until(async()=>await page.locator('#pcsu-brief-card').getAttribute('data-state')==='ready','Brief ready');await ready();
  const child=()=>page.frames().find(f=>f.url().toLowerCase().startsWith(app.toLowerCase()+'/pcs-snapshot-brief/'));
  let f=child();assert.equal(await f.locator('#pay-toolbar h1').innerText(),'PCS Snapshot Brief');assert.match(await f.locator('#brief-profile').innerText(),/Davis-Monthan AFB · E-7 · 16 years · 4 people/);
  assert.equal(await f.locator('[id^="pcsu-bah-header"]').count(),0);assert.equal(childHeaderRequests,0);
  await until(async()=>await page.locator('#sass-input-switch').getAttribute('data-mode')==='summary','input header');assert.equal(await page.locator('#pcsu-snapshot-input-pay-widget-value-total').innerText(),await f.locator('#total-pay').innerText());
  assert.ok(Math.abs((await page.locator('#pcsu-brief-card').boundingBox()).height-original.height)<1);
  check('Brief title/profile replace duplicate header; input header, verified pay and original card size remain intact');
  async function openSnapshot(expected){
   f=child();const href=await f.locator('#brief-open').getAttribute('href'),url=new URL(href);
   assert.equal(url.pathname,'/PCS-Snapshot/index.html');assert.equal(url.origin,app);assert.equal(href,await page.locator('#pcsu-brief-open').getAttribute('href'));
   for(const name of ['parentOrigin','requestId','view','curBase','currentBase','curCityKey','curZip'])assert.equal(url.searchParams.has(name),false,name+' omitted');
   for(const [key,value] of Object.entries(expected))assert.equal(url.searchParams.get(key),String(value));
   const popupPromise=page.waitForEvent('popup');await f.locator('#brief-open').click();const popup=await popupPromise;
   await popup.waitForLoadState('domcontentloaded');await until(()=>popup.evaluate(()=>!!window.PCS_SNAPSHOT_STATE),'full Snapshot completed');
   assert.match(new URL(popup.url()).pathname,/^\/pcs-snapshot\/(?:index\.html)?$/i);assert.equal(await popup.title(),'PCS Snapshot | TheWing.ai');assert.equal(await popup.evaluate(()=>window.opener===null&&window.top===window),true);
   const state=await popup.evaluate(()=>window.PCS_SNAPSHOT_STATE);
   assert.equal(state.input.newBase,expected.newBase);assert.equal(state.input.newCityKey,expected.newCityKey);assert.equal(state.input.rank,expected.rank);assert.equal(state.input.yos,Number(expected.yos));assert.equal(state.input.family,Number(expected.family));assert.equal(state.compensation.source,'official');
   if(out&&expected.newCityKey==='Davis-Monthan')await popup.screenshot({path:path.join(out,'pcs-full-snapshot-handoff.png')});
   await popup.close();return state.input.currentBase;
  }
  if(out){fs.mkdirSync(out,{recursive:true});await until(()=>f.locator('#destination-image').evaluate(img=>img.complete),'city image');await page.locator('main').screenshot({path:path.join(out,'pcs-brief-title-desktop.png')});}
  const legacyCurrentBase=await openSnapshot({rank:'E7',yos:16,family:4,hasDependents:true,newBase:'Davis-Monthan AFB',newCityKey:'Davis-Monthan',newFileKey:'Davis-Monthan',newZip:'85707'});
  check('Open larger opens actual full PCS Snapshot in a new tab with selected profile and official compensation');
  await page.locator('#sass-edit-btn').focus();await page.keyboard.press('Enter');await page.selectOption('#sass-base','Travis AFB');await page.selectOption('#sass-rank','E6');await page.selectOption('#sass-yos','14');await page.selectOption('#sass-family','1');await page.click('#sass-analyze-btn');await ready();
  await openSnapshot({rank:'E6',yos:14,family:1,hasDependents:false,newBase:'Travis AFB',newCityKey:'Travis',newFileKey:'Travis',newZip:'94535'});
  check('destination/profile changes update both larger links; no stale selection or invented current-base URL fields');
  for(const width of [390,320,768]){
   await page.setViewportSize({width,height:950});f=child();await sleep(100);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await f.locator('#brief-open').isVisible(),true);assert.ok(Math.abs((await page.locator('#pcsu-brief-card').boundingBox()).height-original.height)<1);
   if(out&&width===390)await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,'pcs-brief-title-mobile.png')});
  }
  assert.deepEqual(errors,[]);check('title and link fit 320/390/768px; no JavaScript exceptions');
  if(out)fs.writeFileSync(path.join(out,'brief-navigation-results.json'),JSON.stringify({mode:deployed?'deployed Brief/full app with exact local parent embeds':'local Brief/full app assets with live APIs and exact parent embeds',checks,legacyFullAppCurrentBase:legacyCurrentBase,note:'The unchanged full app independently falls back to its existing current-base behavior. This link supplies only the destination/profile.'},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
