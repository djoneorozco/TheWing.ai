/* TOR-Ask-Elena: presentation + explicitly allowlisted PCS Resources inputs. */
(() => {
  'use strict';
  function boot(){
    const root=document.getElementById('tor-ask-elena');if(!root||root.dataset.ready)return;root.dataset.ready='1';
    const avatar='https://cdn.prod.website-files.com/691facbe35fbba00c096f2b7/69d8372486a31818a04707cc_ElenaProfile.jpg';
    root.innerHTML=`<button class="amy-launch" aria-expanded="false" aria-controls="tor-elena-panel"><img class="amy-avatar" src="${avatar}" alt="" width="44" height="44"><span><strong>Ask Elena</strong><small>Your PCS resources companion</small></span></button>
      <aside id="tor-elena-panel" class="amy-panel" aria-label="Ask Elena PCS resources" hidden>
      <header class="amy-header"><img class="amy-avatar" src="${avatar}" alt="" width="44" height="44"><div><span class="amy-eyebrow">PCSUnited · PCS Resources</span><h2>Ask Elena</h2><p class="amy-subtitle">Let’s make your move make sense.</p></div><button class="amy-close" aria-label="Close Ask Elena">×</button></header>
      <section class="amy-context" aria-label="Connected page context"><div class="amy-context-title"><span class="amy-dot"></span><span class="amy-section">PCS Resources</span></div><p class="amy-context-text">Connecting to your page…</p></section>
      <div class="amy-prompts" aria-label="Suggested questions"><button data-question="Explain my current PCS Snapshot and what is still missing.">My Snapshot</button><button data-question="Explain the demographics and housing data for my selected base, including source dates.">My base</button><button data-question="Explain DLA and MALT and how they relate to my current relocation estimate.">DLA & MALT</button></div>
      <div class="amy-chat" role="log" aria-label="Conversation with Elena" aria-live="polite" aria-relevant="additions"></div>
      <footer class="amy-composer"><p class="amy-status" role="status"></p><form><textarea maxlength="3000" aria-label="Your question for Elena" placeholder="Ask about your plan or try a what-if…" rows="2"></textarea><button class="amy-send" type="submit">Send ↗</button></form><div class="amy-controls"><label><input type="checkbox" class="amy-share" checked>Use this page’s numbers</label><button class="amy-reset" type="button">New chat</button></div><p class="amy-privacy">Sending shares connected inputs with TheWing for calculation and AI explanation. Chat clears on reload. Planning estimates, not entitlement decisions.</p></footer></aside>`;
    const $=s=>root.querySelector(s),panel=$('.amy-panel'),launch=$('.amy-launch'),chat=$('.amy-chat'),input=$('textarea'),send=$('.amy-send'),status=$('.amy-status'),share=$('.amy-share');
    const endpoint=root.dataset.endpoint||'https://thewing.netlify.app/api/pcsu-resources-elena';
    // Only existing page inputs are shared; iframe results and arbitrary messages are not accepted.
    const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
    const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
    let section=null,busy=false,controller=null,generation=0,pendingSignature=null,history=[],focusBefore=null;
    const relocationKeys=['rank','familySize','destinationBase','currentBase','travelDate','povs','travelers','dependentsUnder12','travelersTogether','includePerDiem','plannedDrivingDays','mileageMode','distanceMiles','estimatedExpenses','dlaEligibility','dlaEffectiveDate','dlaRank','dlaHasDependents'];
    function context(){
      const result={version:1};if(!share.checked)return result;
      const snapshot=window.PCSU_SNAPSHOT_BRIEF_REQUEST;
      const base=document.getElementById('sass-base')?.value;
      if(base)result.base=base;
      if(object(snapshot)&&(!base||base===snapshot.base)){
        result.snapshot=pick(snapshot,['rank','yos','family','base']);result.base=snapshot.base;
        const request=window.PCSU_RELOCATION_BRIEF_REQUEST,relocation=request?.input;
        if(object(relocation)&&relocation.destinationBase===snapshot.base&&relocation.rank===snapshot.rank&&relocation.familySize===snapshot.family){
          result.relocation=pick(relocation,relocationKeys);
          const view=window.PCSU_RELOCATION_PRESENTATION;
          if(object(view))result.presentation=pick(view,['expenses','includeDla']);
        }
      }
      return result;
    }
    function signature(){return JSON.stringify(context());}
    function renderContext(){
      $('.amy-section').textContent=({snapshot:'With you in · PCS Snapshot',base:'With you in · Base demographics',relocation:'With you in · PCS allotments',benefits:'With you in · PCS benefits'})[section]||'Connected to PCS Resources';
      const c=context(),connected=[];if(c.base)connected.push(c.base);if(c.snapshot)connected.push('PCS Snapshot');if(c.relocation)connected.push('Relocation estimate');
      $('.amy-context-text').textContent=!share.checked?'Page sharing is off. Ask a general question or supply a scenario.':connected.length?connected.join(' · ')+' connected. Updated inputs are used with your next question.':'Choose a base or ask about your PCS. I can explain Snapshot, DLA and MALT.';
      if(busy&&pendingSignature!==null&&pendingSignature!==signature())controller?.abort('context_changed');
    }
    function requestFrames(){renderContext();}
    for(const event of ['pcsu:snapshot-brief-request','pcsu:snapshot-brief-reset','pcsu:relocation-request','pcsu:relocation-reset','pcsu:relocation-presentation'])window.addEventListener(event,()=>queueMicrotask(renderContext));
    document.addEventListener('change',e=>{if(e.target?.id?.startsWith('sass-')||e.target?.id?.startsWith('pr-'))queueMicrotask(renderContext);});
    const sections=[['snapshot','#pcs1-find'],['base','#pcsu-base-hero'],['relocation','#pcs1-move'],['benefits','#pcs1-plan']];
    document.addEventListener('focusin',e=>{if(root.contains(e.target))return;for(const [name,selector]of sections)if(e.target.closest?.(selector)){section=name;renderContext();break;}});
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
        dd.textContent=(String(f.unit).startsWith('USD')?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:f.unit==='USD/mile'?3:2}).format(f.value):new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(f.value))+(f.unit==='USD/month'?' / mo':f.unit==='USD/year'?' / year':f.unit==='USD/mile'?' / mile':f.unit==='USD'?'':f.unit==='%'?'%':f.unit?' '+f.unit:'');row.append(dt,dd);dl.append(row);}container.append(dl);
    }
    function answer(data){
      const article=message(data.reply),copy=article.querySelector('.amy-copy');facts(data.facts,copy);
      for(const s of (Array.isArray(data.scenarios)?data.scenarios:[]).slice(0,3)){
        const details=document.createElement('details');details.className='amy-scenario';details.open=true;
        const title=document.createElement('summary');title.textContent=({lookup_base:'Base information · page unchanged',lookup_dla:'DLA lookup · page unchanged',calculate_malt:'MALT estimate · page unchanged',calculate_pcs:'What-if PCS · page unchanged'})[s.tool]||'Separate estimate · page unchanged';details.append(title);facts(s.facts,details);
        const changes=document.createElement('p');changes.textContent='Changed inputs: '+Object.entries(s.changes||{}).map(([k,v])=>k.replace(/([A-Z])/g,' $1').toLowerCase()+': '+String(v)).join(' · ');details.append(changes);
        const note=document.createElement('p');note.textContent=(s.assumptions||[]).filter(x=>typeof x==='string').join(' ');details.append(note);copy.append(details);
      }
      const links=document.createElement('nav');links.className='amy-sources';links.setAttribute('aria-label','Sources for this answer');
      for(const s of (Array.isArray(data.citations)?data.citations:[]).slice(0,4)){try{const u=new URL(s.url);if(u.protocol!=='https:'||!(/\.(mil|gov)$/.test(u.hostname)||u.hostname==='thewing.netlify.app')||u.username||u.password)continue;const a=document.createElement('a');a.href=u.href;a.textContent=s.title;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}catch{}}
      if(links.childNodes.length)copy.append(links);chat.scrollTop=chat.scrollHeight;
    }
    function trimHistory(){while(history.length>12||JSON.stringify(history).length>18000)history.splice(0,2);}
    async function settleInputs(signal){await new Promise(resolve=>setTimeout(resolve,0));renderContext();}
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
    function greet(){message('Hi, I’m Elena. I can help you understand your selected base, PCS Snapshot and relocation estimate. Ask about demographics, DLA or MALT—or try a separate travel scenario.');}
    $('.amy-reset').addEventListener('click',()=>{generation++;controller?.abort();history=[];busy=false;pendingSignature=null;send.disabled=false;input.value='';chat.replaceChildren();status.textContent='Fresh conversation. Your page entries are still here.';greet();input.focus();});
    greet();requestFrames();renderContext();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
