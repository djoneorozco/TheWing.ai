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
