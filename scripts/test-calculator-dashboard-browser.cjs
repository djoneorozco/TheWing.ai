// Actual calculator pages + first-party collector + dashboard; every request intercepted.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHandler}=require('../netlify/functions/calculator-analytics');
const {readUsage}=require('../netlify/functions/_share/calculator-analytics');
const root=path.resolve(__dirname,'..'),origin='https://thewing.netlify.app';
function memory(){const data=new Map();return {data,async setJSON(key,value){data.set(key,value);return {modified:true};},async *list({prefix}){yield {blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))};}};}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.DASHBOARD_BROWSER});let checks=0;
 try{
  for(const viewport of [{width:1360,height:1000},{width:393,height:852}]){
   const store=memory(),handler=createHandler({getStore:()=>store});let failPost=false,posts=0,reportError=false,failCalculation=false;
   const context=await browser.newContext({viewport,hasTouch:viewport.width<500,isMobile:viewport.width<500});
   await context.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(u.origin===origin&&u.pathname==='/api/opensource-brain') {
      await new Promise(r=>setTimeout(r,80));
      return route.fulfill({status:failCalculation?503:200,json:failCalculation?{ok:false,error:'Local test failure'}:{ok:true,calculator:{retiredPayGross:3000,vaCompensation:1500,combinedMonthlyGross:4500}}});
    }
    if(u.origin===origin&&u.pathname==='/.netlify/functions/calculator-analytics'){
      assert.equal(req.headers().authorization,undefined);
      if(req.method()==='POST') {posts++;if(failPost)return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'https://thewing.ai'},json:{error:'test_failure'}});}
      if(req.method()==='GET'&&reportError)return route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'https://thewing.ai'},json:{message:'Storage test unavailable'}});
      const r=await handler({httpMethod:req.method(),headers:req.headers(),body:req.postData(),queryStringParameters:Object.fromEntries(u.searchParams)});
      return route.fulfill({status:r.statusCode,headers:r.headers,body:r.body});
    }
    if(u.origin==='https://thewing.ai'&&u.pathname==='/internal/calculator-usage')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync(path.join(root,'WEBFLOW-DASHBOARD-EMBED.html'),'utf8')+'</body></html>'});
    if(u.origin==='https://thewing.ai'){
      const folder=u.pathname.includes('/pt-')?'PT-Calculator':u.pathname.includes('/va-')?'VA-Calculator':'Disability-Calculator';
      return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="${origin}/public/calculator-usage-parent.js"></script></head><body style="margin:0"><iframe style="width:100%;height:850px" src="${origin}/${folder}/"></iframe></body></html>`});
    }
    if(u.origin===origin){let name=u.pathname.slice(1);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,name);if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});}
    return route.abort();
   });
   for(const app of [{id:'pt',url:'pt-calculator',selector:'#gender',key:'f',next:'m'},{id:'disability',url:'disability-calculator',selector:'[data-disability-rating]',key:'7',next:'6'},{id:'va',url:'va-calculator',selector:'#rv-va-rating',key:'8',next:'6'}]){
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    const advance=async n=>{for(let i=0;i<n;i++){await page.clock.runFor(1000);await new Promise(r=>setTimeout(r,15));}};
    await page.goto(`https://thewing.ai/air-force/${app.url}.html`);await advance(2);
    const child=page.frames().find(f=>f.url().includes(app.id==='pt'?'PT-Calculator':app.id==='va'?'VA-Calculator':'Disability-Calculator'));
    const stats=async()=> (await readUsage(store,'today')).calculators.find(c=>c.id===app.id);
    assert.equal((await stats()).sessions,0);assert.equal((await stats()).loads,1);assert.equal((await stats()).trackedResults,0);assert.equal((await stats()).usageRate,0);assert.equal(await page.evaluate(()=>typeof window.gtag),'undefined');checks++;
    await child.evaluate(sel=>document.querySelector(sel).dispatchEvent(new Event('change',{bubbles:true})),app.selector);await advance(1);
    assert.equal((await stats()).sessions,0);checks++;
    failPost=true;
    await child.locator(app.selector).first().press(app.key);await advance(2);
    assert.equal((await stats()).sessions,0);checks++;
    failPost=false;await advance(7);
    assert.equal((await stats()).sessions,1);assert.equal((await stats()).loads,1);assert.equal((await stats()).adjustments,1);assert.equal((await stats()).results,1);assert.equal((await stats()).usageRate,1);checks++;
    await new Promise(r=>setTimeout(r,1300));
    await child.locator(app.selector).first().press(app.next);await advance(7);
    assert.equal((await stats()).sessions,1);assert.equal((await stats()).adjustments,2);checks++;
    await advance(40);const time=(await stats()).activeSeconds;
    assert.ok(time>=30&&time<=45,`${app.id} active ${time}`);await advance(10);assert.equal((await stats()).activeSeconds,time);checks++;
    // Re-delivery is idempotent across the server and dashboard.
    const latest=[...store.data.values()].filter(v=>v.calculator===app.id).sort((a,b)=>b.revision-a.revision)[0];
    await handler({httpMethod:'POST',headers:{origin:'https://thewing.ai'},body:JSON.stringify(latest)});
    assert.equal((await stats()).activeSeconds,time);assert.equal((await stats()).sessions,1);checks++;
    await page.evaluate(()=>{Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>false});window.dispatchEvent(new Event('blur'));});
    await advance(2);await new Promise(r=>setTimeout(r,1300));await child.locator(app.selector).first().press(app.key);await advance(8);
    assert.equal((await stats()).activeSeconds,time);checks++;
    assert.deepEqual(errors,[]);checks++;
    await page.close();
   }
   // Arrival delivery failures retry without inventing usage. A touch edit works too.
   const recovery=await context.newPage();failPost=true;
   await recovery.goto('https://thewing.ai/air-force/pt-calculator.html');
   await recovery.waitForTimeout(1500);
   assert.equal((await readUsage(store,'today')).calculators[0].loads,1);checks++;
   failPost=false;
   await recovery.waitForTimeout(6000);
   assert.equal((await readUsage(store,'today')).calculators[0].loads,2);
   assert.equal((await readUsage(store,'today')).calculators[0].trackedSessions,1);checks++;
   if(viewport.width<500){
     const frame=recovery.frames().find(f=>f.url().includes('PT-Calculator'));
     await frame.locator('#strengthSlider').tap({position:{x:25,y:10}});
     await recovery.waitForTimeout(6000);
     const c=(await readUsage(store,'today')).calculators[0];
     assert.equal(c.trackedSessions,2);assert.equal(c.trackedResults,2);checks++;
   }
   await recovery.close();
   // A failed async VA response must not be labeled an updated result.
   failCalculation=true;
   const failed=await context.newPage();
   await failed.goto('https://thewing.ai/air-force/va-calculator.html');
   const vf=failed.frames().find(f=>f.url().includes('VA-Calculator'));
   await failed.waitForTimeout(1500);
   assert.equal((await readUsage(store,'today')).calculators[2].loads,2);checks++;
   await vf.locator('#rv-va-rating').press('8');await failed.waitForTimeout(6000);
   let vc=(await readUsage(store,'today')).calculators[2];
   assert.equal(vc.trackedSessions,2);assert.equal(vc.trackedResults,1);checks++;
   failCalculation=false;
   await vf.locator('#rv-va-rating').press('6');await failed.waitForTimeout(6000);
   vc=(await readUsage(store,'today')).calculators[2];
   assert.equal(vc.loads,2);assert.equal(vc.trackedResults,2);checks++;
   await failed.close();
   const dashboard=await context.newPage();await dashboard.goto('https://thewing.ai/internal/calculator-usage');
   await dashboard.locator('[data-ui=results]').waitFor({state:'visible'});
   assert.equal(await dashboard.locator('input[type=password]').count(),0);assert.equal(await dashboard.locator('.tw-big').first().textContent(),'2');checks++;
   assert.ok((await dashboard.locator('[data-ui=cards]').textContent()).includes('Visits with an input change'));assert.equal(await dashboard.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;
   if(process.env.DASHBOARD_PREVIEW_DIR){
     await dashboard.evaluate(()=>{const n=document.createElement('p');n.textContent='LOCAL TEST PREVIEW · AUTOMATED TEST VISITS · NOT LIVE CUSTOMER DATA';n.style.cssText='background:#71321d;color:white;padding:12px;font:bold 13px system-ui;text-align:center';document.body.prepend(n);});
     fs.mkdirSync(process.env.DASHBOARD_PREVIEW_DIR,{recursive:true});await dashboard.screenshot({path:path.join(process.env.DASHBOARD_PREVIEW_DIR,`dashboard-${viewport.width}.png`),fullPage:true});
   }
   await dashboard.locator('[data-ui=period]').selectOption('yesterday');await dashboard.locator('[data-ui=results]').waitFor({state:'visible'});assert.equal(await dashboard.locator('.tw-big').first().textContent(),'0');checks++;
   reportError=true;await dashboard.locator('[data-ui=refresh]').click();await dashboard.waitForFunction(()=>document.querySelector('[data-ui=status]').textContent.includes('Storage test unavailable'));assert.equal(await dashboard.locator('[data-ui=results]').isVisible(),false);checks++;
   assert.ok(posts>0);await context.close();
  }
  console.log(`${checks} first-party browser checks passed: actual PT/Disability/VA inputs, retries, timing, deduplication and dashboard on desktop/mobile. No Google services or production writes.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
