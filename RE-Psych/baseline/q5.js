
(function(){
  'use strict';
  // Approved artwork is bundled with this app.
  const FEATURE_IMAGE_URL='./assets/features.png';
  const FEATURES=[
    {id:'backyard',label:'Large backyard',kind:'upkeep',crop:'45 310 205 165',task:'Mowing, trimming, and seasonal care.'},
    {id:'patio',label:'Covered patio',kind:'use',crop:'276 310 200 165',task:'How would you use this space?',uses:[['outdoor_meals','Outdoor meals'],['hosting','Hosting'],['relaxing','Relaxing'],['play_space','Play space'],['other','Other']]},
    {id:'pool',label:'Pool',kind:'upkeep',crop:'500 310 200 165',task:'Cleaning, water care, and equipment.'},
    {id:'den',label:'Family room / den',kind:'use',crop:'725 310 198 165',task:'How would you use this room?',uses:[['family_time','Family time'],['movies_games','Movies & games'],['hobbies','Hobbies'],['quiet_retreat','Quiet retreat'],['other','Other']]},
    {id:'workspace',label:'Separate workspace',kind:'use',crop:'949 310 198 165',task:'How would you use this workspace?',uses:[['focused_work','Focused work'],['studying','Studying'],['video_calls','Video calls'],['creative_work','Creative work'],['other','Other']]},
    {id:'extra_room',label:'Flexible extra room',kind:'use',crop:'1174 310 202 165',task:'How would you use this extra room?',uses:[['guests','Guests'],['playroom','Playroom'],['exercise','Exercise'],['hobbies','Hobbies'],['other','Other']]}
  ];
  const UPKEEP=[['self','I’ll handle it'],['paid-help','I’d budget for help'],['less-upkeep','I’d prefer less upkeep'],['unsure','I’m unsure']];
  const copy=function(value){return JSON.parse(JSON.stringify(value));};
  // Escape only authored strings used in templates. User text is always assigned with textContent.
  const escape=function(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  document.querySelectorAll('[data-pcsu-features-choice]').forEach(function(root,index){
    if(root.dataset.ready==='true')return;
    root.dataset.ready='true';root.dataset.confirmed='false';
    const $=function(selector){return root.querySelector(selector);};
    const $$=function(selector){return Array.from(root.querySelectorAll(selector));};
    const instance='repsych-q5-'+Date.now().toString(36)+'-'+index+'-'+Math.random().toString(36).slice(2,8);
    const state={selected:new Set(),mode:'choosing',answers:{},customName:'',customUse:'',customUnsure:false,confirmed:false};
    const empty=function(){return {upkeep:null,uses:[],other:'',unsure:false};};
    root.q5Answer=null;root.q5History=[];

    $('[data-feature-cards]').innerHTML=FEATURES.map(function(f){return '<label class="ph5-card" data-feature-card="'+f.id+'"><input class="ph5-control" type="checkbox" data-feature="'+f.id+'"><span class="ph5-art" aria-hidden="true"><svg viewBox="'+f.crop+'" preserveAspectRatio="xMidYMid slice" focusable="false"><image data-feature-art width="1422" height="1106" preserveAspectRatio="none"/></svg><span class="ph5-art-fallback">Loading feature image…</span><span class="ph5-feature-check"></span></span><span class="ph5-card-title">'+escape(f.label)+'</span></label>';}).join('');

    function option(f,pair,radio){return '<label class="ph5-option"><input class="ph5-control" type="'+(radio?'radio':'checkbox')+'" name="'+instance+'-'+f.id+'" data-'+(radio?'upkeep':'use')+'="'+f.id+'" value="'+pair[0]+'"><span class="ph5-marker '+(radio?'ph5-radio-marker':'')+'" aria-hidden="true"></span><span>'+escape(pair[1])+'</span></label>';}
    FEATURES.forEach(function(f){
      const radio=f.kind==='upkeep';
      const row=document.createElement('fieldset');row.className='ph5-followup';row.dataset.followup=f.id;row.hidden=true;
      row.innerHTML='<legend class="ph5-sr">'+escape(f.label)+' — '+(radio?'How would you handle the upkeep?':escape(f.task))+'</legend><div class="ph5-row-inner"><div class="ph5-row-copy"><strong>'+escape(f.label)+'</strong><p>'+escape(f.task)+'</p></div><div class="ph5-answer-area"><div class="ph5-options '+(radio?'':'ph5-use-options')+'">'+(radio?UPKEEP:f.uses).map(function(p){return option(f,p,radio);}).join('')+'</div>'+(radio?'':'<label class="ph5-text-label ph5-other-use" data-other-field="'+f.id+'" hidden>What other use do you have in mind?<input type="text" data-other-text="'+f.id+'" maxlength="160" autocomplete="off" placeholder="A few words are enough"></label><button type="button" class="ph5-link ph5-row-unsure" data-use-unsure="'+f.id+'" aria-pressed="false">I’m not sure yet</button>')+'</div></div>';
      $(radio?'[data-upkeep-rows]':'[data-use-rows]').appendChild(row);
    });

    const imageURL=root.getAttribute('data-feature-image-url')||FEATURE_IMAGE_URL;
    function imageUnavailable(){root.dataset.imageStatus='unavailable';$$('.ph5-art-fallback').forEach(function(el){el.hidden=false;el.textContent='Image unavailable';});$('[data-image-notice]').hidden=false;}
    if(imageURL&&!/^PASTE_/i.test(imageURL)){
      root.dataset.imageStatus='loading';const loader=new Image();
      loader.onload=function(){$$('[data-feature-art]').forEach(function(el){el.setAttribute('href',imageURL);});$$('.ph5-art-fallback').forEach(function(el){el.hidden=true;});root.dataset.imageStatus='loaded';};
      loader.onerror=imageUnavailable;loader.src=imageURL;
    }else{imageUnavailable();console.warn('RE-Psych Q5: set FEATURE_IMAGE_URL to the supplied artwork asset URL.');}

    const comparison=$('.ph5-comparison');
    function updateScroll(){const maximum=Math.max(0,comparison.scrollWidth-comparison.clientWidth);$('.ph5-scroll-nav').hidden=maximum<3;$('[data-scroll="-1"]').disabled=comparison.scrollLeft<2;$('[data-scroll="1"]').disabled=comparison.scrollLeft>=maximum-2;$('[data-comparison-hint]').textContent=maximum<3?'Choose the features that matter to you.':'Swipe or use the arrows to compare all six features.';}
    function moveComparison(direction){const gap=parseFloat(getComputedStyle($('.ph5-grid')).columnGap)||12;comparison.scrollBy({left:direction*($('.ph5-card').getBoundingClientRect().width+gap),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    $$('[data-scroll]').forEach(function(button){button.addEventListener('click',function(){moveComparison(Number(button.dataset.scroll));});});
    comparison.addEventListener('scroll',updateScroll,{passive:true});
    comparison.addEventListener('keydown',function(event){if(event.target!==comparison)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveComparison(event.key==='ArrowRight'?1:-1);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();comparison.scrollLeft=event.key==='Home'?0:comparison.scrollWidth;}});
    if(window.ResizeObserver)new ResizeObserver(updateScroll).observe(comparison);else window.addEventListener('resize',updateScroll);
    updateScroll();

    function complete(id){
      if(id==='custom')return Boolean(state.customName.trim())&&(state.customUnsure||Boolean(state.customUse.trim()));
      const f=FEATURES.find(function(item){return item.id===id;}),a=state.answers[id];
      if(!a)return false;
      if(f.kind==='upkeep')return UPKEEP.some(function(pair){return pair[0]===a.upkeep;});
      return a.unsure||(a.uses.length>0&&(!a.uses.includes('other')||Boolean(a.other.trim())));
    }
    function ready(){return state.mode==='unsure'||state.mode==='none'||(state.selected.size>0&&Array.from(state.selected).every(complete));}
    function snapshot(){
      const items=FEATURES.filter(function(f){return state.selected.has(f.id);}).map(function(f){
        const a=state.answers[f.id]||empty(),result={id:f.id,label:f.label,followupType:f.kind==='upkeep'?'upkeep':'intended-use'};
        if(f.kind==='upkeep'){const choice=UPKEEP.find(function(pair){return pair[0]===a.upkeep;});result.upkeep=choice?{choice:choice[0],label:choice[1]}:null;}
        else result.intendedUse={status:a.unsure?'unsure':(a.uses.length?'answered':'unanswered'),uses:f.uses.filter(function(pair){return a.uses.includes(pair[0]);}).map(function(pair){return {id:pair[0],label:pair[1]};}),otherText:a.uses.includes('other')?(a.other.trim()||null):null};
        return result;
      });
      if(state.selected.has('custom'))items.push({id:'custom',label:state.customName.trim(),followupType:'custom-intended-use',intendedUse:{status:state.customUnsure?'unsure':(state.customUse.trim()?'answered':'unanswered'),description:state.customUnsure?null:(state.customUse.trim()||null)}});
      return {version:'repsych.q5.features.v1',questionId:'q5',selectionStatus:state.mode==='none'?'none-of-listed':state.mode,selectedFeatureIds:items.map(function(item){return item.id;}),features:items,selfReported:true,complete:ready()};
    }
    function render(){
      FEATURES.forEach(function(f){
        const selected=state.selected.has(f.id),a=state.answers[f.id]||empty();
        $('[data-feature="'+f.id+'"]').checked=selected;$('[data-feature-card="'+f.id+'"]').dataset.selected=String(selected);$('[data-followup="'+f.id+'"]').hidden=!selected;
        if(f.kind==='upkeep')$$('[data-upkeep="'+f.id+'"]').forEach(function(input){input.checked=a.upkeep===input.value;});
        else{$$('[data-use="'+f.id+'"]').forEach(function(input){input.checked=a.uses.includes(input.value);});$('[data-other-field="'+f.id+'"]').hidden=!a.uses.includes('other');const other=$('[data-other-text="'+f.id+'"]');if(other.value!==a.other)other.value=a.other;$('[data-use-unsure="'+f.id+'"]').setAttribute('aria-pressed',String(a.unsure));}
      });
      const hasCustom=state.selected.has('custom');
      $('[data-custom-toggle]').setAttribute('aria-pressed',String(hasCustom));$('.ph5-custom-name').hidden=!hasCustom;$('[data-followup="custom"]').hidden=!hasCustom;
      const name=$('[data-custom-name]'),use=$('[data-custom-use]');if(name.value!==state.customName)name.value=state.customName;if(use.value!==state.customUse)use.value=state.customUse;
      $('[data-custom-title]').textContent=state.customName.trim()||'Another feature';$('[data-use-unsure="custom"]').setAttribute('aria-pressed',String(state.customUnsure));
      $$('[data-selection-mode]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.selectionMode===state.mode));});
      $('[data-feature-count]').textContent=state.mode==='unsure'?'Unsure':state.mode==='none'?'None selected':state.selected.size+' selected';
      $('.ph5-followups').hidden=state.selected.size===0;
      $('[data-upkeep-group]').hidden=!FEATURES.some(function(f){return f.kind==='upkeep'&&state.selected.has(f.id);});
      $('[data-use-group]').hidden=!hasCustom&&!FEATURES.some(function(f){return f.kind==='use'&&state.selected.has(f.id);});
      const count=state.selected.size,remaining=Array.from(state.selected).filter(function(id){return !complete(id);}).length;
      let title='Choose the features you would use.',detail='You can select more than one.';
      if(state.mode==='unsure'){title='You’re not sure which features you need yet.';detail='Save this response, or select a feature to explore it.';}
      else if(state.mode==='none'){title='None of the listed features fits your needs.';detail='Save this response, or add another feature.';}
      else if(count){title=count+' feature'+(count===1?'':'s')+' selected · '+(remaining?remaining+' follow-up'+(remaining===1?'':'s')+' remaining':'Follow-ups complete');detail=remaining?'Answer only the follow-ups for the features you selected.':'You can change your choices anytime.';}
      if(state.confirmed){title=state.mode==='selected'?'Your feature preferences are saved.':'Your response is saved.';detail='You can change your choices anytime.';}
      $('[data-summary]').textContent=title;$('[data-summary-detail]').textContent=detail;
      $('[data-save]').disabled=!ready()||state.confirmed;$('[data-save]').textContent=state.confirmed?'Saved ✓':'Save my features →';
      root.dataset.confirmed=String(state.confirmed);root.q5Draft=copy(snapshot());
    }
    function changed(){state.confirmed=false;root.q5Answer=null;render();root.dispatchEvent(new CustomEvent('repsych:q5:change',{bubbles:true,detail:{questionId:'q5',confirmed:false,draft:copy(root.q5Draft)}}));}
    function setFeature(id,selected){
      state.mode='selected';
      if(selected){state.selected.add(id);if(id!=='custom')state.answers[id]=empty();}
      else{state.selected.delete(id);delete state.answers[id];if(id==='custom'){state.customName='';state.customUse='';state.customUnsure=false;}}
      if(!state.selected.size)state.mode='choosing';changed();
    }
    $$('[data-feature]').forEach(function(input){input.addEventListener('change',function(){setFeature(input.dataset.feature,input.checked);});});
    $('[data-custom-toggle]').addEventListener('click',function(){const active=!state.selected.has('custom');setFeature('custom',active);if(active)$('[data-custom-name]').focus();});
    $$('[data-selection-mode]').forEach(function(button){button.addEventListener('click',function(){const next=state.mode===button.dataset.selectionMode?'choosing':button.dataset.selectionMode;state.selected.clear();state.answers={};state.customName='';state.customUse='';state.customUnsure=false;state.mode=next;changed();});});
    $$('[data-upkeep]').forEach(function(input){input.addEventListener('change',function(){const id=input.dataset.upkeep;if(!state.selected.has(id)||!input.checked)return;state.answers[id].upkeep=input.value;changed();});});
    $$('[data-use]').forEach(function(input){input.addEventListener('change',function(){const id=input.dataset.use;if(!state.selected.has(id))return;const a=state.answers[id];a.unsure=false;if(input.checked){if(!a.uses.includes(input.value))a.uses.push(input.value);}else{a.uses=a.uses.filter(function(value){return value!==input.value;});if(input.value==='other')a.other='';}changed();});});
    $$('[data-other-text]').forEach(function(input){input.addEventListener('input',function(){const id=input.dataset.otherText;if(!state.selected.has(id))return;state.answers[id].other=input.value;changed();});});
    $$('[data-use-unsure]').forEach(function(button){button.addEventListener('click',function(){const id=button.dataset.useUnsure;if(!state.selected.has(id))return;if(id==='custom'){state.customUnsure=!state.customUnsure;state.customUse='';}else{const a=state.answers[id];a.unsure=!a.unsure;a.uses=[];a.other='';}changed();});});
    $('[data-custom-name]').addEventListener('input',function(event){state.customName=event.target.value;changed();});
    $('[data-custom-use]').addEventListener('input',function(event){state.customUse=event.target.value;state.customUnsure=false;changed();});
    $('[data-save]').addEventListener('click',function(){
      if(!ready()||state.confirmed)return;
      const answer=snapshot();answer.answeredAt=new Date().toISOString();
      root.q5Answer=copy(answer);root.q5History.push(copy(answer));state.confirmed=true;render();
      root.dispatchEvent(new CustomEvent('repsych:q5:confirmed',{bubbles:true,detail:copy(answer)}));
    });
    render();
  });
})();
