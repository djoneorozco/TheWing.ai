// Real parent embeds + real child across two origins. Local handlers by default;
// BRIEF_LIVE=1 exercises the unchanged deployed APIs and city JSON with the local app.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), app=process.env.BRIEF_APP_ORIGIN||'https://thewing.netlify.app', parent='https://pcs-united-com.webflow.io';
const compact=process.env.BRIEF_COMPACT==='1';
const deployed=process.env.BRIEF_DEPLOYED==='1', live=process.env.BRIEF_LIVE==='1'||deployed, out=process.env.BRIEF_OUTPUT;
const strip=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt'),'utf8');
const embed=fs.readFileSync(path.join(root,'PCS-Snapshot-Brief/webflow/PCSUnited-PCS-Snapshot-Brief-iframe.txt'),'utf8').replace('data-state="idle" data-view="brief"',compact?'data-state="idle" data-view="brief"':'data-state="idle" data-view="full"').replace('data-app-url="https://thewing.netlify.app/',`data-app-url="${app}/`);
const housingTotal=compact?'$2,934':'$2,599', balance=compact?'$789/month beyond BAH':'$478/month beyond BAH', bahTotal=compact?'$2,145.00':'$2,121.00', payTotal=compact?'$8,622.85':'$7,728.25';
const head='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f7f9fb;font-family:Arial;color:#17334b}main{max-width:1460px;padding:20px;margin:auto}h1{font-size:34px}#controls{margin-bottom:28px}</style></head><body><main>';
const layout='<div id="pcs1-map-layout"><div class="pcs1-map-copy"><h1>Plan your next move</h1><p>Parent-to-iframe integration test using the complete Webflow replacement embeds.</p></div><div id="pcs1-map-host"></div></div>';
const harness=head+'<div id="controls">'+strip+'</div>'+layout+embed+'</main></body></html>';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<150;i++){if(await fn())return;await sleep(100);}throw new Error('Timed out: '+label);}
(async()=>{
  const {handler:brain}=await import('../netlify/functions/opensource-brain.js');
  const {handler:mortgage}=await import('../netlify/functions/mortgage.js');
  const browser=await chromium.launch({headless:true,executablePath:process.env.BRIEF_BROWSER});
  const report=[];
  const check=(name)=>{report.push(name);console.log('PASS '+name);};
  try{
    const context=await browser.newContext({viewport:{width:1460,height:1100}});
    let failPay=false,failCity=false,failHousing=false,holdPay=false,holdHousing=false,held=[],payCalls=[],housingCalls=[], childLoads=0;
    const errors=[];
    await context.addInitScript(()=>{
      for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new Error(key+' accessed');}});
    });
    await context.route('**/*',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(u.origin===parent){
        const body=u.pathname==='/strip-only'?head+strip+'</main></body></html>':harness;
        return route.fulfill({contentType:'text/html',body});
      }
      if(u.origin===app && ['/api/opensource-brain','/api/mortgage'].includes(u.pathname)){
        const isPay=u.pathname.endsWith('opensource-brain'),body=JSON.parse(req.postData());
        (isPay?payCalls:housingCalls).push(body);
        const failing=isPay?failPay:failHousing;
        if(isPay?holdPay:holdHousing)await new Promise(resolve=>held.push(resolve));
        if(failing)return route.fulfill({status:503,json:{ok:false,error:'Injected test outage'}}).catch(()=>{});
        if(live)return route.continue().catch(()=>{});
        const result=await(isPay?brain:mortgage)({httpMethod:'POST',body:JSON.stringify(body)});
        return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body}).catch(()=>{});
      }
      if(u.origin===app){
        if(failCity && u.pathname.startsWith('/netlify/functions/cities/'))return route.fulfill({status:503,json:{ok:false}});
        if(deployed)return route.continue();
        if(live&&u.pathname.startsWith('/netlify/functions/cities/'))return route.continue();
        let name=u.pathname.slice(1);if(name.endsWith('/'))name+='index.html';
        const file=path.resolve(root,name);
        if(file.startsWith(root+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()){
          if(name==='PCS-Snapshot-Brief/index.html')childLoads++;
          return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html'});
        }
      }
      if(u.hostname==='cdn.prod.website-files.com')return route.continue();
      return route.abort();
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const state=()=>page.locator('#pcsu-brief-card').getAttribute('data-state');
    const ready=()=>until(async()=>await state()==='ready','brief ready');
    const child=()=>page.frames().find(f=>f.url().toLowerCase().startsWith(app.toLowerCase()+'/pcs-snapshot-brief/'));
    const choose=async(base='Davis-Monthan AFB',family=compact?'4':'3')=>{
      await page.selectOption('#sass-rank',compact?'E7':'E6');await page.selectOption('#sass-yos',compact?'16':'14');await page.selectOption('#sass-family',family);await page.selectOption('#sass-base',base);
    };
    await page.goto(parent+'/brief-test',{waitUntil:'domcontentloaded'});
    assert.equal(await state(),'idle');assert.equal(await page.locator('#pcsu-brief-frame').getAttribute('src'),null);assert.equal(payCalls.length,0);assert.equal(childLoads,0);
    await page.click('#sass-analyze-btn');assert.match(await page.locator('#sass-status').innerText(),/Complete/);assert.equal(payCalls.length,0);
    check('fresh page and incomplete Analyze keep the exact cover; no default base or API call');
    const originalHeight=await page.locator('#pcsu-brief-card').evaluate(el=>el.getBoundingClientRect().height);
    await choose();await page.click('#sass-analyze-btn');await ready();
    let f=child();assert.equal(await f.locator('#base-name').innerText(),'Davis-Monthan AFB');assert.equal(await f.locator('#total-pay').innerText(),payTotal);assert.equal(await f.locator('#bah').innerText(),bahTotal);assert.equal(await f.locator('#housing-cost').innerText(),housingTotal);assert.equal(await f.locator('#balance').innerText(),balance);assert.match(await f.locator('#destination-heading').innerText(),/Tucson/);
    assert.deepEqual(payCalls.at(-1),{tool:'PCS_SNAPSHOT',input:{rank:compact?'E7':'E6',yos:compact?16:14,base:'Davis-Monthan AFB',hasDependents:true}});
    assert.equal(await page.locator('#pcsu-brief-cover').isVisible(),false);
    check(compact?'E-7, 16 years, family 4, Davis-Monthan: compensation, destination and housing verified':'E-6, 14 years, family 3, Davis-Monthan: compensation, destination and housing verified');
    await f.selectOption('#bedrooms','5');await until(async()=>await f.locator('#housing-result').isVisible(),'5 bedrooms');assert.notEqual(await f.locator('#housing-cost').innerText(),housingTotal);assert.equal(housingCalls.at(-1).price,610000);
    await f.selectOption('#bedrooms','2');await until(async()=>await f.locator('#housing-result').isVisible(),'2 bedrooms');assert.equal(housingCalls.at(-1).price,265000);
    await f.selectOption('#bedrooms','3');await until(async()=>await f.locator('#housing-result').isVisible(),'3 bedrooms');
    check('2–5 bedroom changes recalculate through the mortgage API');
    if (!compact) {
    const expanded=await page.locator('#pcsu-brief-frame').evaluate(el=>el.clientHeight);await f.locator('#housing-details summary').click();await until(async()=>Number.parseInt(await page.locator('#pcsu-brief-frame').evaluate(el=>el.clientHeight))>expanded,'expanded iframe');
    await f.locator('#housing-details summary').click();
    check('iframe height tracks expanded assumptions');
    } else {
      assert.equal(await page.locator('#pcsu-brief-card').evaluate(el=>el.getBoundingClientRect().height),originalHeight);
      await f.locator('#housing-info').click();assert.equal(await f.locator('#housing-notes').isVisible(),true);assert.match(await f.locator('#housing-assumptions').innerText(),/Utilities: \$335.00/);await f.locator('#housing-notes button').click();
      assert.equal(await f.locator('#city-population').innerText(),'550K');assert.equal(await f.locator('#city-income').innerText(),'$64,500');assert.equal(await f.locator('#city-trend').innerText(),'-2.4%');
      assert.equal(await f.locator('#city-traffic').innerText(),'Moderate');assert.equal(await f.locator('#housing-percent').innerText(),'73%');assert.equal(housingCalls.at(-1).otherExpensesMonthly,335);
      await f.locator('#city-info').click();assert.equal(await f.locator('#city-notes').isVisible(),true);assert.equal(await f.locator('#highlights li').count(),2);await f.locator('#city-notes button').click();
      if(out)await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,'pcs-brief-complete-desktop.png')});
      assert.ok(await f.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),'desktop panels fit original cover');
      check('city fields, cost composition, utility total, source dialogs and original fixed height verified');
    }
    if(out){fs.mkdirSync(out,{recursive:true});await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,compact?'pcs-brief-complete-desktop.png':'pcs-brief-desktop.png')});}
    for(const width of [390,320,768]){
      await page.setViewportSize({width,height:900});await sleep(200);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`parent ${width}`);
      assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`child ${width}`);
      if(!compact)await until(async()=>await f.evaluate(()=>document.querySelector('#brief').getBoundingClientRect().height<=innerHeight+2),'height '+width);
      else {assert.equal(await page.locator('#pcsu-brief-card').evaluate(el=>el.getBoundingClientRect().height),originalHeight);await f.locator('#bedrooms').scrollIntoViewIfNeeded();await f.selectOption('#bedrooms','2');await until(async()=>await f.locator('#housing-result').isVisible(),'mobile housing');assert.equal(housingCalls.at(-1).price,265000);await f.selectOption('#bedrooms','3');await until(async()=>await f.locator('#housing-result').isVisible(),'reset housing');
       if(out&&width===390)await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,'pcs-brief-complete-mobile-housing.png')});
       await f.evaluate(()=>scrollTo(0,0));
      }
      if(out&&width===390)await page.locator('#pcsu-brief-card').screenshot({path:path.join(out,compact?'pcs-brief-complete-mobile.png':'pcs-brief-mobile.png')});
    }
    check(compact?'390px, 320px and 768px: no horizontal overflow; fixed card, scrollable panels and bedroom control verified':'390px, 320px and 768px: no horizontal overflow; child height fits');
    await page.setViewportSize({width:1460,height:1100});
    await choose('Travis AFB');assert.equal(await state(),'idle');await page.click('#sass-analyze-btn');await ready();f=child();
    assert.equal(await f.locator('#base-name').innerText(),'Travis AFB');assert.notEqual(await f.locator('#bah').innerText(),bahTotal);assert.notEqual(await f.locator('#housing-cost').innerText(),housingTotal);assert.doesNotMatch(await f.locator('#destination-heading').innerText(),/Tucson/);assert.equal(housingCalls.at(-1).price,585000);
    check('changing destination replaces pay, city and housing together');
    await choose('Davis-Monthan AFB','1');await page.click('#sass-analyze-btn');await ready();assert.equal(payCalls.at(-1).input.hasDependents,false);assert.notEqual(await child().locator('#bah').innerText(),bahTotal);
    check('one-person family sends without-dependents status');
    if(!live){
      if(compact){failCity=true;await page.click('#sass-analyze-btn');await until(async()=>await state()==='error','city failure');assert.equal(await page.locator('#pcsu-brief-cover').isVisible(),true);failCity=false;await page.click('#pcsu-brief-retry');await ready();check('city-data failure keeps cover and retry recovers without a substitute destination');}
      failPay=true;await page.click('#sass-analyze-btn');await until(async()=>await state()==='error','pay failure');assert.equal(await page.locator('#pcsu-brief-cover').isVisible(),true);assert.equal(await page.locator('#pcsu-brief-retry').isVisible(),true);
      const failedId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
      failPay=false;await page.click('#pcsu-brief-retry');await ready();assert.notEqual(new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId'),failedId);
      check('compensation outage keeps cover; retry uses a new request ID and recovers');
      failHousing=true;await page.click('#sass-analyze-btn');await until(async()=>await state()==='error','initial housing failure');failHousing=false;await page.click('#pcsu-brief-retry');await ready();
      f=child();failHousing=true;await f.selectOption('#bedrooms','4');await until(async()=>await f.locator('#housing-retry').isVisible(),'housing retry');assert.equal(await f.locator('#housing-result').isVisible(),false);assert.equal(await state(),'ready');failHousing=false;
      await page.locator('#pcsu-brief-frame').evaluate(el=>el.scrollIntoView({block:'end'}));
      await f.click('#housing-retry');
      await until(async()=>await f.locator('#housing-result').isVisible(),'housing recovery');
      check('initial mortgage failure retains cover; later failure clears stale housing and offers retry');
      holdHousing=true;await f.selectOption('#bedrooms','5');await until(()=>held.length>0,'held housing');holdHousing=false;await f.selectOption('#bedrooms','2');await until(async()=>await f.locator('#housing-result').isVisible(),'new housing');const latest=await f.locator('#housing-cost').innerText();held.splice(0).forEach(release=>release());await sleep(150);assert.equal(await f.locator('#housing-cost').innerText(),latest);
      check('a stale bedroom response cannot replace the newer selection');
      holdPay=true;await choose();await page.click('#sass-analyze-btn');await until(()=>held.length>0,'held pay');
      const oldId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
      await choose('Travis AFB');assert.equal(await state(),'idle');await page.click('#sass-analyze-btn');await until(()=>held.length>1,'second held pay');
      f=child();const currentId=new URL(f.url()).searchParams.get('requestId');
      assert.equal(await state(),'loading'); // Document is loaded; APIs are still pending.
      await f.evaluate(({id,target})=>parent.postMessage({source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready',height:700},target),{id:oldId,target:parent});await sleep(100);assert.equal(await state(),'loading');
      await page.evaluate(({id,origin})=>{
        const data={source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready'};
        window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.example',source:document.querySelector('iframe').contentWindow,data}));
        window.dispatchEvent(new MessageEvent('message',{origin,source:window,data}));
      },{id:currentId,origin:app});assert.equal(await state(),'loading');
      holdPay=false;held.splice(0).forEach(release=>release());await ready();assert.equal(await child().locator('#base-name').innerText(),'Travis AFB');
      check('iframe load alone, wrong request ID, wrong origin and wrong window cannot reveal a result');
      await choose('Fort-Sam-Houston AFB');await page.click('#sass-analyze-btn');await ready();f=child();await f.selectOption('#bedrooms','4');assert.match(await f.locator('#housing-status').innerText(),/unavailable/);assert.equal(await f.locator('#housing-result').isVisible(),false);
      check('missing Fort Sam four-bedroom data remains explicitly unavailable');
      // An input strip mounted before the iframe retains a genuine Analyze in memory.
      await page.goto(parent+'/strip-only',{waitUntil:'domcontentloaded'});await choose();const beforeReplay=payCalls.length;await page.click('#sass-analyze-btn');
      await page.evaluate(html=>{
        const container=document.createElement('div');container.innerHTML=html;document.body.append(container);
        for(const old of container.querySelectorAll('script')){const s=document.createElement('script');s.textContent=old.textContent;old.replaceWith(s);}
      },layout+embed);await ready();assert.equal(await child().locator('#base-name').innerText(),'Davis-Monthan AFB');
      assert.equal(payCalls.length,beforeReplay+1);check('Analyze before iframe initialization is replayed exactly once');
      // Parent timeout is exercised with the child script deliberately not started.
      await context.route('**/PCS-Snapshot-Brief/brief.js',route=>route.fulfill({contentType:'application/javascript',body:'// Deliberately stalled test child'}));
      await page.clock.install();await page.click('#sass-analyze-btn');await until(async()=>child()?.url().includes('requestId='),'stalled child');
      const timedId=new URL(await page.locator('#pcsu-brief-frame').getAttribute('src')).searchParams.get('requestId');
      await page.clock.fastForward(31000);assert.equal(await state(),'error');
      await child().evaluate(({id,target})=>parent.postMessage({source:'pcsu-snapshot-brief',type:'pcsu:brief-status',requestId:id,state:'ready'},target),{id:timedId,target:parent});await sleep(100);assert.equal(await state(),'error');
      check('timeout invalidates the request; a late ready message cannot uncover it');
    }
    await context.unroute('**/PCS-Snapshot-Brief/brief.js');
    const bare=await context.newPage(),beforeBare=payCalls.length;
    await bare.goto(app+'/PCS-Snapshot-Brief/index.html',{waitUntil:'domcontentloaded'});
    assert.equal(await bare.locator('#result').isVisible(),false);
    assert.match(await bare.locator('#app-status').innerText(),/Choose your destination/);
    assert.equal(payCalls.length,beforeBare);await bare.close();
    check('bare Brief URL remains idle without loading a default base');
    assert.deepEqual(errors,[]);assert.equal(await context.cookies().then(x=>x.length),0);check('no JavaScript exceptions, browser storage access or cookies');
    if(out)fs.writeFileSync(path.join(out,(compact?'compact-':'')+(deployed?'browser-deployed-results.json':live?'browser-live-results.json':'browser-results.json')),JSON.stringify({view:compact?'brief':'full',mode:deployed?'deployed app/APIs/city JSON + local parent embeds':live?'local app + live APIs/city JSON':'local app + repository API handlers',appOrigin:app,browser:await browser.version(),checks:report},null,2));
    await context.close();
  } catch(error) {
    for(const context of browser.contexts())for(const page of context.pages()){
      console.error('Parent:',await page.locator('#pcsu-brief-card').getAttribute('data-state').catch(()=>''));
      for(const frame of page.frames().filter(f=>f.url().startsWith(app)))console.error('Child:',await frame.locator('body').innerText().catch(()=>''));
    }
    throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
