/* PCSU-Ask-Elena: presentation + explicitly allowlisted Financial Guidance inputs. */
(() => {
  'use strict';
  function boot(){
    const root=document.getElementById('tor-ask-elena-command');if(!root||root.dataset.ready)return;root.dataset.ready='1';
    root.innerHTML="<button class=\"amy-launch\" type=\"button\" aria-expanded=\"false\" aria-controls=\"ae-container\"><img class=\"elena-launch-avatar\" src=\"https://cdn.prod.website-files.com/691facbe35fbba00c096f2b7/69d8372486a31818a04707cc_ElenaProfile.jpg\" alt=\"\" width=\"44\" height=\"44\"><span><strong>Ask Elena</strong><small>Your financial guidance companion</small></span></button>\n<aside id=\"ae-container\" class=\"amy-panel\" aria-label=\"Ask Elena financial guidance\" hidden>\n  <section id=\"ae-left\" aria-label=\"Elena and helpful links\">\n    <div class=\"elena-profile\"><div class=\"ae-avatar-wrapper\"><div class=\"ae-avatar\" role=\"img\" aria-label=\"Elena\"></div></div><div class=\"elena-profile-copy\"><div class=\"ae-name\">Elena</div><div class=\"ae-sub\">A.I. Concierge • OrozcoRealty</div></div></div>\n    <details class=\"elena-shortcuts\" open><summary>Helpful links</summary><nav class=\"ae-links\" aria-label=\"Orozco Realty resources\">\n      <a class=\"ae-link-btn\" href=\"https://orozcorealty.webflow.io/military/va-homebuying-guide\" target=\"_blank\" rel=\"noopener noreferrer\">VA Homebuying Guide</a>\n      <a class=\"ae-link-btn\" href=\"https://orozcorealty.webflow.io/military/home-purchase\" target=\"_blank\" rel=\"noopener noreferrer\">Homebuying Process</a>\n      <a class=\"ae-link-btn\" href=\"https://orozcorealty.webflow.io/military/air-force-pcs-support\" target=\"_blank\" rel=\"noopener noreferrer\">PCS Support</a>\n      <button class=\"ae-link-btn elena-analysis\" type=\"button\">Financial Analysis ↗</button>\n      <a class=\"ae-link-btn\" href=\"https://orozcorealty.webflow.io/contact-orozco-realty\" target=\"_blank\" rel=\"noopener noreferrer\">Contact Orozco Realty</a>\n    </nav></details>\n    <div class=\"ae-badge\">OrozcoRealty • A.I.-Powered<br>Real Estate Intelligence</div>\n  </section>\n  <section id=\"ae-right\" aria-label=\"Chat with Elena\">\n    <header class=\"ae-topbar\"><div class=\"ae-topbar-copy\"><h2>Ask Elena</h2><p>Your real estate &amp; financial guide.</p></div><div class=\"elena-header-actions\"><span class=\"ae-topbar-pill\">The Orozco Realty</span><button type=\"button\" class=\"amy-close\" aria-label=\"Close Ask Elena\">×</button></div></header>\n    <section class=\"amy-context ae-top-controls\" aria-label=\"Connected page context\"><div class=\"elena-context-card\"><strong class=\"amy-section\">Financial Guidance</strong><p class=\"amy-context-text\">Connecting to your page…</p></div></section>\n    <div class=\"amy-prompts\" aria-label=\"Suggested questions\"><button type=\"button\" data-question=\"Help me understand my current financial picture.\">Explain my numbers</button><button type=\"button\" data-question=\"Explain what is included in my current mortgage payment.\">My mortgage</button><button type=\"button\" data-question=\"What information should I review next in my budget?\">What’s next?</button></div>\n    <div id=\"ae-chat\" class=\"amy-chat ae-chat\" role=\"log\" aria-label=\"Conversation with Elena\" aria-live=\"polite\" aria-relevant=\"additions\"></div>\n    <footer class=\"amy-composer\"><p class=\"amy-status\" role=\"status\"></p><form class=\"ae-footer\"><textarea id=\"ae-input\" class=\"ae-input\" maxlength=\"3000\" aria-label=\"Your question for Elena\" placeholder=\"Ask Elena anything…\" rows=\"2\"></textarea><button id=\"ae-send\" class=\"amy-send ae-btn\" type=\"submit\">Send ↗</button></form><div class=\"amy-controls\"><label><input type=\"checkbox\" class=\"amy-share\" checked>Use this page’s numbers</label><button class=\"amy-reset\" type=\"button\">New chat</button></div><p class=\"amy-privacy\">Sending shares connected inputs with TheWing for calculation and AI explanation. Chat clears on reload. Planning guidance, not loan approval.</p></footer>\n  </section>\n</aside>\n";
    const $=s=>root.querySelector(s),panel=$('.amy-panel'),launch=$('.amy-launch'),chat=$('.amy-chat'),input=$('textarea'),send=$('.amy-send'),status=$('.amy-status'),share=$('.amy-share');
    const endpoint=root.dataset.endpoint||'https://thewing.netlify.app/api/pcsu-ask-amy';
    const toolOrigin=root.dataset.toolOrigin||'https://thewing.netlify.app';
    const mortgageFrame=document.getElementById('pcsu-mortgage-frame'),budgetFrame=document.getElementById('pcsu-budget-frame');
    const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
    const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
    const mortgageKeys=['ready','status','homePrice','downPayment','creditScore','interestRate','termYears','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly','loanType','vaFeeStatus','feePayment','emergencyFund','emergencyFundBasis','emergencyFundUserEntered','hasUserInteracted','closingCosts','prepaidsEscrow','cashAvailable','moveInCosts'];
    let mortgage=null,budget=null,mRevision=-1,bRevision=-1,section=null,busy=false,controller=null,generation=0,pendingSignature=null,history=[],focusBefore=null,lastIncome='';
    function income(){
      const value=window.PCSU_FINANCIAL_INCOME?.getSnapshot?.();if(!object(value))return null;
      const result=pick(value,['schemaVersion','complete','status','containsEstimates','grossMonthlyIncome','monthlyDeductions','netMonthlyIncome','monthlySavingsContributions','capitalReservesTotal']);
      result.sources=Array.isArray(value.sources)?value.sources.slice(0,50).map(s=>pick(s,['label','amount','basis'])):[];return result;
    }
    function context(){return share.checked?{version:1,income:income(),mortgage,budget}:{version:1};}
    function signature(){return JSON.stringify(context());}
    function renderContext(){
      $('.amy-section').textContent=({income:'With you in · Income',mortgage:'With you in · Mortgage',budget:'With you in · Monthly expenses',analysis:'With you in · Financial analysis'})[section]||'Connected to Financial Guidance';
      const connected=[];if(income()?.complete)connected.push('Income');if(mortgage?.ready&&mortgage.status==='ready')connected.push(mortgage.hasUserInteracted?'Mortgage':'Example mortgage');if(budget?.status==='ready')connected.push(budget.state?.reviewed?'Reviewed budget':'Draft budget');
      $('.amy-context-text').textContent=!share.checked?'Page sharing is off. Ask a general question or supply a scenario.':connected.length?connected.join(' · ')+' connected. Updated inputs are used with your next question.':'Start with your income. I’ll help you work through the next step.';
      if(busy&&pendingSignature!==null&&pendingSignature!==signature())controller?.abort('context_changed');
    }
    function trustedFrame(frame){try{return frame&&new URL(frame.src,location.href).origin===toolOrigin;}catch{return false;}}
    function requestBudget(){if(trustedFrame(budgetFrame))budgetFrame.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:finance-analysis-request',requestId:'pcsu-amy-'+crypto.randomUUID()},toolOrigin);}
    function requestFrames(){if(trustedFrame(mortgageFrame))mortgageFrame.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:mortgage-budget-request'},toolOrigin);requestBudget();}
    window.addEventListener('message',e=>{
      const d=e.data;if(e.origin!==toolOrigin||!object(d)||d.version!==1)return;
      if(e.source===mortgageFrame?.contentWindow&&trustedFrame(mortgageFrame)&&d.source==='pcsu-mortgage-budget'&&d.type==='pcsu:mortgage-budget-state'){
        const s=d.snapshot;if(s!==null&&(!object(s)||!Number.isSafeInteger(s.revision)||s.revision<mRevision))return;
        if(s)mRevision=s.revision;const next=s?pick(s,mortgageKeys):null;
        if(JSON.stringify(next)!==JSON.stringify(mortgage)){mortgage=next;budget=null;requestBudget();}renderContext();
      }
      if(e.source===budgetFrame?.contentWindow&&trustedFrame(budgetFrame)&&d.source==='pcsu-finance'){
        if(d.type==='pcsu:finance-ready'){requestBudget();return;}
        const s=d.snapshot;if(d.type!=='pcsu:finance-analysis-state'||!object(s)||!Number.isSafeInteger(s.revision)||s.revision<bRevision)return;
        try{if(JSON.stringify(s).length>50000)return;}catch{return;}
        bRevision=s.revision;
        budget={status:s.status,mortgageLinked:s.mortgageLinked,state:pick(s.state,['grossMonthly','netMonthly','savingsMonthly','emergencyFund','bufferMonthly','extraBufferMonthly','reviewed'])};
        budget.state.items=Array.isArray(s.state?.items)?s.state.items.slice(0,120).map(r=>pick(r,['id','label','category','value','minimumPayment','essential','housing','continues'])):[];renderContext();
      }
    });
    window.addEventListener('pcsu:financial-income-change',()=>{const next=JSON.stringify(income());if(next!==lastIncome){lastIncome=next;budget=null;requestBudget();renderContext();}});
    mortgageFrame?.addEventListener('load',()=>{mRevision=-1;mortgage=null;budget=null;renderContext();requestFrames();});
    budgetFrame?.addEventListener('load',()=>{bRevision=-1;budget=null;renderContext();requestBudget();});
    const sections=[['income','#pcsf-launch'],['mortgage','#pcs1-compare'],['budget','#pcs1-move'],['analysis','#pcs1-plan']];
    document.addEventListener('focusin',e=>{if(root.contains(e.target))return;for(const [name,selector] of sections)if(e.target.closest?.(selector)){section=name;renderContext();break;}});
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){section=sections.find(x=>entry.target.matches(x[1]))?.[0]||section;renderContext();}},{rootMargin:'-20% 0px -60% 0px'});for(const [,s]of sections){const node=document.querySelector(s);if(node)observer.observe(node);}}
    function open(){focusBefore=document.activeElement;panel.hidden=false;launch.hidden=true;launch.setAttribute('aria-expanded','true');requestFrames();renderContext();input.focus();}
    function close(){panel.hidden=true;launch.hidden=false;launch.setAttribute('aria-expanded','false');(focusBefore?.isConnected?focusBefore:launch).focus({preventScroll:true});}
    launch.addEventListener('click',open);$('.amy-close').addEventListener('click',close);panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
    function message(text,role='assistant'){
      const article=document.createElement('article');article.className='amy-message';article.dataset.role=role;
      const who=document.createElement('strong');who.textContent=role==='user'?'You':'Elena';const copy=document.createElement('div');copy.className='amy-copy';const p=document.createElement('p');p.textContent=text;copy.append(p);article.append(who,copy);chat.append(article);chat.scrollTop=chat.scrollHeight;return article;
    }
    function facts(list,container){
      if(!Array.isArray(list)||!list.length)return;const dl=document.createElement('dl');dl.className='amy-facts';
      for(const f of list.slice(0,20)){if(typeof f?.label!=='string'||typeof f.value!=='number'||!Number.isFinite(f.value))continue;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=f.label;
        dd.textContent=(String(f.unit).startsWith('USD')?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(f.value):new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(f.value))+(f.unit==='USD/month'?' / mo':f.unit==='%'?'%':f.unit==='years'?' years':'');row.append(dt,dd);dl.append(row);}container.append(dl);
    }
    function answer(data){
      const article=message(data.reply),copy=article.querySelector('.amy-copy');facts(data.facts,copy);
      for(const s of (Array.isArray(data.scenarios)?data.scenarios:[]).slice(0,3)){
        const details=document.createElement('details');details.className='amy-scenario';details.open=true;
        const title=document.createElement('summary');title.textContent=s.tool==='calculate_mortgage'?'What-if mortgage · page unchanged':'What-if budget · page unchanged';details.append(title);facts(s.facts,details);
        const changes=document.createElement('p');changes.textContent='Changed inputs: '+Object.entries(s.changes||{}).map(([k,v])=>k.replace(/([A-Z])/g,' $1').toLowerCase()+': '+String(v)).join(' · ');details.append(changes);
        const note=document.createElement('p');note.textContent=(s.assumptions||[]).filter(x=>typeof x==='string').join(' ');details.append(note);copy.append(details);
      }
      const links=document.createElement('nav');links.className='amy-sources';links.setAttribute('aria-label','Sources for this answer');
      for(const s of (Array.isArray(data.citations)?data.citations:[]).slice(0,4)){try{const u=new URL(s.url);if(u.protocol!=='https:'||!['www.va.gov','www.consumerfinance.gov','www.dfas.mil'].includes(u.hostname))continue;const a=document.createElement('a');a.href=u.href;a.textContent=s.title;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}catch{}}
      if(links.childNodes.length)copy.append(links);chat.scrollTop=chat.scrollHeight;
    }
    function trimHistory(){while(history.length>12||JSON.stringify(history).length>18000)history.splice(0,2);}
    async function settleInputs(signal){
      // Opening/requesting frames can briefly invalidate the expense result.
      // Wait for a stable source snapshot before spending an AI request.
      requestFrames();let previous=signature(),stable=0;
      for(let elapsed=0;elapsed<1800&&!signal.aborted;elapsed+=100){
        await new Promise(resolve=>setTimeout(resolve,100));const next=signature();
        stable=next===previous?stable+100:0;previous=next;
        const updating=share.checked&&(budget?.status==='pending'||budget?.status==='loading'||mortgage?.status==='pending'||mortgage?.status==='loading');
        if(stable>=200&&!updating)return;
      }
    }
    async function ask(raw){
      const question=raw.trim();if(busy||!question||question.length>3000)return;
      busy=true;send.disabled=true;input.value='';const user=message(question,'user');status.textContent='Elena is reviewing your plan…';
      controller=new AbortController();const active=controller,id=++generation;pendingSignature=null;const timer=setTimeout(()=>active.abort('timeout'),55000);
      try{
        await settleInputs(active.signal);if(id!==generation||active.signal.aborted)return;
        pendingSignature=signature();const captured=context();
        const response=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},signal:active.signal,body:JSON.stringify({message:question,history,section,context:captured})});
        const data=await response.json();if(id!==generation)return;
        if(!response.ok||!data.ok||typeof data.reply!=='string')throw Error(data.code==='context_invalid'?'context_invalid':'unavailable');
        if(pendingSignature!==signature())throw Error('context_changed');
        answer(data);history.push({role:'user',content:question},{role:'assistant',content:(data.history_reply||data.reply).slice(0,3000)});trimHistory();
        status.textContent=data.explanation_mode==='guided_fallback'?'Calculated summary · AI explanation is temporarily unavailable.':'Based on the inputs shared with this question.';
      }catch(error){
        if(id!==generation)return;user.remove();if(!input.value)input.value=question;
        const changed=active.signal.reason==='context_changed'||error.message==='context_changed';
        status.textContent=changed?'Your inputs changed. Send again to use your updated numbers.':error.message==='context_invalid'?'The calculators are updating or need review. Your question is ready to retry.':active.signal.reason==='timeout'?'Elena took too long. Your question is ready to retry.':'Elena could not connect. Your question is ready to retry.';
        requestFrames();
      }finally{clearTimeout(timer);if(id===generation){busy=false;send.disabled=false;pendingSignature=null;}}
    }
    $('form').addEventListener('submit',e=>{e.preventDefault();ask(input.value);});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();ask(input.value);}});
    root.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.question;input.focus();}));
    share.addEventListener('change',renderContext);
    function greet(){message('Hi, I’m Elena. We can work through your income, home payment and monthly expenses together. Ask me what your numbers mean—or try a different payment or home price to see how the picture changes.');}
    $('.amy-reset').addEventListener('click',()=>{generation++;controller?.abort();history=[];busy=false;pendingSignature=null;send.disabled=false;input.value='';chat.replaceChildren();status.textContent='Fresh conversation. Your page entries are still here.';greet();input.focus();});

    const shortcuts=$('.elena-shortcuts');
    if(window.matchMedia('(max-width:760px)').matches)shortcuts.open=false;
    $('.elena-analysis').addEventListener('click',()=>{
      const destination=document.getElementById('pcsu-analysis-link');
      if(destination){destination.click();}else status.textContent='Use the Financial Analysis button on Financial Guidance to bring your figures with you.';
    });
    lastIncome=JSON.stringify(income());greet();requestFrames();renderContext();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
