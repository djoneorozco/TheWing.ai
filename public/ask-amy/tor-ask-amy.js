/* TOR Ask Amy: presentation and validated cross-frame transport only. */
(() => {
  'use strict';
  function boot(){
    const root=document.getElementById('tor-ask-amy');
    if(!root||root.dataset.ready)return;
    root.dataset.ready='1';
    const $=id=>root.querySelector('#'+id),dialog=$('tor-amy-dialog'),launcher=$('tor-amy-launcher'),input=$('tor-amy-input'),send=$('tor-amy-send'),chat=$('tor-amy-chat'),status=$('tor-amy-status');
    const site=document.getElementById('tor-life'),toolDialog=document.getElementById('tl-tool-dialog');
    const api=root.dataset.endpoint||'https://thewing.netlify.app/.netlify/functions/agent-amy-public';
    const toolOrigin=root.dataset.toolOrigin||'https://thewing.netlify.app';
    const labels={discovery:'Discovery & Qualification',buying:'Homebuying Education & Journey',ownership:'Lifetime Ownership'};
    const calculators={finance:null,mortgage:null},frames=new Map(),thread=[];
    let stage=null,opener=launcher,busy=false,controller=null,requestId=0,oldOverflow=null;
    const cid='tor-'+crypto.randomUUID();
    const money=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD'}):'Not available';
    function note(text,role='assistant'){
      const article=document.createElement('article'),name=document.createElement('strong'),copy=document.createElement('p');
      article.className='tor-amy-message';article.dataset.role=role;name.textContent=role==='user'?'You':'Amy';copy.textContent=text;article.append(name,copy);chat.append(article);chat.scrollTop=chat.scrollHeight;
    }
    function contextView(){
      $('tor-amy-stage').textContent=stage?labels[stage]:'Your homeownership journey';
      const m=calculators.mortgage?.result?.monthly,f=calculators.finance?.result;
      $('tor-amy-mortgage-state').textContent=m?'Housing estimate · '+money(m.allIn)+'/month':'Mortgage · no current result';
      $('tor-amy-finance-state').textContent=f?(f.reviewed?'Budget':'Draft budget')+' · cash flow '+money(f.metrics?.cashFlow):'Budget · no current result';
      const prompts=stage==='buying'?['Explain the inspection step','What should I ask my agent?']:stage==='ownership'?['Help me plan home maintenance','How should I evaluate refinancing?']:['Explain my mortgage estimate','Explain my cash flow and housing range'];
      root.querySelectorAll('[data-tor-amy-question]').forEach((b,i)=>{b.textContent=prompts[i];b.dataset.torAmyQuestion=prompts[i];});
    }
    function readStage(){
      const selected=site?.querySelector('.tl-stage-card[aria-expanded="true"]');
      const next=selected?.getAttribute('href')?.replace('#tl-','');
      stage=Object.hasOwn(labels,next)?next:null;contextView();
    }
    function typeForFrame(frame){
      try{const u=new URL(frame.src);if(u.origin!==toolOrigin||u.searchParams.get('amy')!=='tor')return null;
        return /^\/Finance-UX\/$/i.test(u.pathname)?'finance':/^\/Mortgage-Calculator\/$/i.test(u.pathname)?'mortgage':null;
      }catch{return null;}
    }
    function request(frame){frame.contentWindow?.postMessage({source:'tor-amy-host',version:1,type:'tor:context-request'},toolOrigin);}
    function scanFrames(){
      for(const [frame,record] of frames)if(!frame.isConnected||typeForFrame(frame)!==record.tool){calculators[record.tool]=null;frames.delete(frame);}
      document.querySelectorAll('#tl-tool-body iframe').forEach(frame=>{
        const tool=typeForFrame(frame);if(!tool||frames.has(frame))return;
        frames.set(frame,{tool,revision:-1});calculators[tool]=null;
        frame.addEventListener('load',()=>{const record=frames.get(frame);if(!record)return;record.revision=-1;calculators[tool]=null;contextView();request(frame);});request(frame);
      });contextView();
    }
    function plain(x){return x&&typeof x==='object'&&!Array.isArray(x);}
    window.addEventListener('message',e=>{
      if(e.origin!==toolOrigin||!plain(e.data)||e.data.source!=='tor-calculator'||e.data.version!==1)return;
      const entry=Array.from(frames).find(([frame])=>frame.contentWindow===e.source);
      if(!entry)return;const [frame,record]=entry,d=e.data;
      if(d.tool!==record.tool||typeForFrame(frame)!==record.tool)return;
      if(d.type==='tor:calculator-close'){if(toolDialog?.open&&!dialog.open)toolDialog.close();return;}
      if(d.type!=='tor:calculator-context'||!Number.isSafeInteger(d.revision)||d.revision<record.revision)return;
      record.revision=d.revision;
      calculators[record.tool]=d.snapshot===null?null:plain(d.snapshot)&&plain(d.snapshot.inputs)&&plain(d.snapshot.result)?d.snapshot:null;
      contextView();
    });
    function open(from){
      opener=from||launcher;readStage();scanFrames();
      if(!dialog.open){oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();}
      launcher.setAttribute('aria-expanded','true');input.focus();
    }
    launcher.addEventListener('click',()=>open(launcher));
    document.querySelectorAll('[data-tor-open-amy]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();open(b);}));
    $('tor-amy-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{launcher.setAttribute('aria-expanded','false');if(oldOverflow!==null){document.documentElement.style.overflow=oldOverflow;oldOverflow=null;}if(opener?.isConnected)opener.focus({preventScroll:true});});
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
    let backdrop=false;
    dialog.addEventListener('pointerdown',e=>{const r=dialog.getBoundingClientRect();backdrop=e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);});
    dialog.addEventListener('click',e=>{if(backdrop&&e.target===dialog)dialog.close();backdrop=false;});
    if(toolDialog){
      const b=document.createElement('button');b.type='button';b.className='tor-amy-tool-trigger';b.textContent='Ask Amy';b.setAttribute('aria-haspopup','dialog');
      document.getElementById('tl-tool-close')?.before(b);b.addEventListener('click',()=>open(b));
    }
    async function ask(message){
      if(busy||!message.trim())return;
      busy=true;send.disabled=true;input.disabled=true;status.textContent='Amy is reviewing your question…';
      note(message,'user');input.value='';
      const id=++requestId,signature=JSON.stringify(calculators),currentStage=stage;
      controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),35000);
      try{
        const response=await fetch(api,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({message,context:{product:'tor',version:1,stage:currentStage,calculators,conversation_id:cid,thread:thread.slice(-12)}})});
        const data=await response.json();if(id!==requestId)return;
        if(!response.ok||!data.ok||typeof data.reply!=='string')throw Error('unavailable');
        if(signature!==JSON.stringify(calculators)||currentStage!==stage){note('Your stage or calculator inputs changed while I was responding. Please ask again to use your current results.');status.textContent='Context changed · please ask again.';return;}
        note(data.reply);thread.push({role:'user',content:message},{role:'assistant',content:data.reply});if(thread.length>12)thread.splice(0,thread.length-12);
        status.textContent=data.explanation_mode==='guided_fallback'?'Guided summary · AI explanation is temporarily unavailable.':'Answered using your current page context.';
      }catch(error){if(id!==requestId)return;input.value=message;status.textContent=error.name==='AbortError'?'Amy took too long to respond. Your question is ready to retry.':'Amy could not connect. Your question is ready to retry.';}
      finally{clearTimeout(timeout);if(id===requestId){busy=false;send.disabled=false;input.disabled=false;if(dialog.open)input.focus();}}
    }
    $('tor-amy-form').addEventListener('submit',e=>{e.preventDefault();ask(input.value.trim().slice(0,3000));});
    root.querySelectorAll('[data-tor-amy-question]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.torAmyQuestion;input.focus();}));
    $('tor-amy-reset').addEventListener('click',()=>{requestId++;controller?.abort();thread.length=0;chat.replaceChildren();busy=false;send.disabled=false;input.disabled=false;input.value='';status.textContent='New conversation. Current calculator results remain connected.';note('I’m Amy, your homeownership guide. Explore a stage or ask me to explain a current calculator result.');input.focus();});
    if(site){new MutationObserver(readStage).observe(site.querySelector('#tl-journey'),{subtree:true,attributes:true,attributeFilter:['aria-expanded']});}
    if(document.getElementById('tl-tool-body'))new MutationObserver(scanFrames).observe(document.getElementById('tl-tool-body'),{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    note('I’m Amy, your guide through buying and owning a home. I can explain your current calculator results or help you understand the next step.');readStage();scanFrames();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
