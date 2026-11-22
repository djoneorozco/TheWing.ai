
(function(){
  'use strict';
  const OPTIONS={
    bedrooms:[['fixed','Set minimum'],['no-fixed','No fixed minimum'],['unsure','Unsure']],
    rooms:[['required','Required'],['not-required','Not required'],['unsure','Unsure']],
    access:[['required','Set requirements'],['none','No specific requirement'],['unsure','Unsure']],
    readiness:[['ready','Usable on move-in day','We need to live there right away.'],['wait','Work can happen first','We can stay elsewhere during the work.'],['flexible','No firm timing requirement','We can decide based on the home.'],['unsure','Unsure','We still need to work this out.']],
    wait:[['fixed','Set maximum'],['no-fixed','No firm maximum'],['unsure','Unsure']],
    housing:[['fixed','Set limit'],['no-fixed','No firm cap set'],['unsure','Unsure']],
    commute:[['fixed','Set limit'],['no-fixed','No firm cap set'],['unsure','Unsure']]
  };
  const ACCESS=[['step_free_entry','Step-free entry'],['bedroom_entry_level','Bedroom on entry level'],['bathroom_entry_level','Bathroom on entry level'],['bedroom_bathroom_same_level','Bedroom and bathroom on the same level'],['no_interior_stairs','No interior stairs'],['other','Another requirement']];
  const copy=function(v){return JSON.parse(JSON.stringify(v));};
  const escape=function(v){return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  function whole(raw,min,max){const text=String(raw).trim();if(!/^\d+$/.test(text))return null;const n=Number(text);return Number.isSafeInteger(n)&&n>=min&&(max===undefined||n<=max)?n:null;}
  function money(raw){const text=String(raw).trim().replace(/^\$\s*/, '');if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text))return null;const n=Number(text.replace(/,/g,''));return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(Math.round(n*100))?n:null;}
  const usd=function(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);};
  document.querySelectorAll('[data-pcsu-requirements]').forEach(function(root,index){
    if(root.dataset.ready==='true')return;
    root.dataset.ready='true';root.dataset.confirmed='false';
    const $=function(s){return root.querySelector(s);},$$=function(s){return Array.from(root.querySelectorAll(s));};
    const instance='repsych-q6-'+Date.now().toString(36)+'-'+index+'-'+Math.random().toString(36).slice(2,8);
    const state={modes:{bedrooms:'',rooms:'',access:'',readiness:'',wait:'',housing:'',commute:''},values:{bedrooms:'',roomCount:'',roomPurpose:'',accessOther:'',weeks:'',housing:'',commute:''},access:[],sources:{housing:null,commute:null},known:{housing:null,commute:null},seen:{},confirmed:false};
    root.q6Answer=null;root.q6History=[];
    Object.keys(OPTIONS).forEach(function(key){$('[data-options="'+key+'"]').innerHTML=OPTIONS[key].map(function(o){return '<label class="ph6-option"><input class="ph6-control" type="radio" name="'+instance+'-'+key+'" data-mode="'+key+'" value="'+o[0]+'"><span class="ph6-marker" aria-hidden="true"></span><span>'+escape(o[1])+(o[2]?'<small>'+escape(o[2])+'</small>':'')+'</span></label>';}).join('');});
    $('[data-access-options]').innerHTML=ACCESS.map(function(o){return '<label class="ph6-option"><input class="ph6-control" type="checkbox" data-access="'+o[0]+'"><span class="ph6-marker" aria-hidden="true"></span><span>'+escape(o[1])+'</span></label>';}).join('');
    $$('[data-input]').forEach(function(input){const key=input.dataset.input;const error=$('[data-error="'+key+'"]');if(error){error.id=instance+'-error-'+key;input.setAttribute('aria-describedby',error.id);}});

    function errors(){const m=state.modes,v=state.values,e={};
      if(m.bedrooms==='fixed'&&whole(v.bedrooms,0)===null)e.bedrooms='Enter a whole number of bedrooms, 0 or more.';
      if(m.rooms==='required'){if(whole(v.roomCount,1)===null)e.roomCount='Enter at least 1 additional room as a whole number.';if(!v.roomPurpose.trim())e.roomPurpose='Describe what these additional rooms must support.';}
      if(m.access==='required'&&state.access.includes('other')&&!v.accessOther.trim())e.accessOther='Describe the additional layout requirement.';
      if(m.readiness==='wait'&&m.wait==='fixed'&&whole(v.weeks,1)===null)e.weeks='Enter a whole number of weeks, at least 1.';
      if(m.housing==='fixed'&&money(v.housing)===null)e.housing='Enter a valid nonnegative USD amount, with at most two decimal places.';
      if(m.commute==='fixed'&&whole(v.commute,0,1440)===null)e.commute='Enter a whole number of minutes from 0 to 1,440.';
      return e;
    }
    function completion(){const m=state.modes,e=errors();const space=Boolean(m.bedrooms&&m.rooms&&!e.bedrooms&&!e.roomCount&&!e.roomPurpose);const access=Boolean(m.access&&(m.access!=='required'||(state.access.length&&!e.accessOther)));const readiness=Boolean(m.readiness&&(m.readiness!=='wait'||(m.wait&&!e.weeks)));const limits=Boolean(m.housing&&m.commute&&!e.housing&&!e.commute);return {space,access,readiness,limits};}
    function snapshot(){const m=state.modes,v=state.values,clarify=[];
      [['bedrooms','space.bedrooms'],['rooms','space.additionalRooms'],['access','access'],['readiness','moveIn'],['housing','limits.monthlyHousing'],['commute','limits.commute']].forEach(function(pair){if(m[pair[0]]==='unsure')clarify.push(pair[1]);});
      if(m.readiness==='wait'&&m.wait==='unsure')clarify.push('moveIn.wait');
      const status=function(x){return x||'unanswered';};
      return {version:'repsych.q6.requirements.v1',questionId:'q6',selfReported:true,complete:Object.values(completion()).every(Boolean),clarify,
        space:{bedrooms:{status:status(m.bedrooms),minimum:m.bedrooms==='fixed'?whole(v.bedrooms,0):null},additionalRooms:{status:status(m.rooms),count:m.rooms==='required'?whole(v.roomCount,1):null,purpose:m.rooms==='required'?(v.roomPurpose.trim()||null):null}},
        access:{status:status(m.access),requirements:m.access==='required'?ACCESS.filter(function(o){return state.access.includes(o[0]);}).map(function(o){return {id:o[0],label:o[1]};}):[],other:m.access==='required'&&state.access.includes('other')?(v.accessOther.trim()||null):null},
        moveIn:{status:status(m.readiness),wait:m.readiness==='wait'?{status:status(m.wait),maximumWeeks:m.wait==='fixed'?whole(v.weeks,1):null}:null},
        limits:{monthlyHousing:{status:status(m.housing),amount:m.housing==='fixed'?money(v.housing):null,currency:'USD',scope:'all-in-monthly-housing',source:m.housing==='fixed'?copy(state.sources.housing||{kind:'manual'}):null},commute:{status:status(m.commute),maximumMinutes:m.commute==='fixed'?whole(v.commute,0,1440):null,scope:'one-way-normal-workday',source:m.commute==='fixed'?copy(state.sources.commute||{kind:'manual'}):null}}
      };
    }
    function reviewLines(d){const lines=[],b=d.space.bedrooms,r=d.space.additionalRooms,a=d.access,m=d.moveIn,h=d.limits.monthlyHousing,c=d.limits.commute;
      if(b.status==='fixed'&&b.minimum!==null)lines.push('Bedrooms: '+(b.minimum===0?'a studio can work':b.minimum+' minimum'));else if(b.status==='no-fixed')lines.push('Bedrooms: no fixed minimum');else if(b.status==='unsure')lines.push('Bedroom minimum: unsure');
      if(r.status==='required'&&r.count!==null&&r.purpose)lines.push('Additional rooms: '+r.count+' for '+r.purpose);else if(r.status==='not-required')lines.push('Additional enclosed rooms: not required');else if(r.status==='unsure')lines.push('Additional rooms: unsure');
      if(a.status==='required'&&a.requirements.length)lines.push('Required layout: '+a.requirements.map(function(item){return item.id==='other'?(a.other||'another requirement to describe'):item.label;}).join('; '));else if(a.status==='none')lines.push('Layout: no specific requirement');else if(a.status==='unsure')lines.push('Access and layout: unsure');
      if(m.status==='ready')lines.push('Home must be usable on move-in day');else if(m.status==='flexible')lines.push('Move-in readiness: no firm timing requirement');else if(m.status==='unsure')lines.push('Move-in readiness: unsure');else if(m.status==='wait'&&m.wait.status==='fixed'&&m.wait.maximumWeeks!==null)lines.push('Work can happen first: up to '+m.wait.maximumWeeks+' weeks');else if(m.status==='wait'&&m.wait.status==='no-fixed')lines.push('Work can happen first: no firm wait maximum');else if(m.status==='wait'&&m.wait.status==='unsure')lines.push('Work can happen first; time available is unsure');
      if(h.status==='fixed'&&h.amount!==null)lines.push('Total monthly housing limit: '+usd(h.amount));else if(h.status==='no-fixed')lines.push('Monthly housing: no firm cap set');else if(h.status==='unsure')lines.push('Monthly housing limit: unsure');
      if(c.status==='fixed'&&c.maximumMinutes!==null)lines.push('One-way commute limit: '+c.maximumMinutes+' minutes');else if(c.status==='no-fixed')lines.push('Commute: no firm cap set');else if(c.status==='unsure')lines.push('Commute limit: unsure');
      return lines;
    }
    function render(){const m=state.modes,v=state.values,e=errors(),areas=completion();
      $$('[data-mode]').forEach(function(input){input.checked=m[input.dataset.mode]===input.value;});
      ['bedrooms','housing','commute'].forEach(function(key){$('[data-details="'+key+'"]').hidden=m[key]!=='fixed';});
      $('[data-details="rooms"]').hidden=m.rooms!=='required';$('[data-details="access"]').hidden=m.access!=='required';$('[data-access-other]').hidden=!state.access.includes('other');
      $('[data-wait-field]').hidden=m.readiness!=='wait';$('[data-details="wait"]').hidden=m.wait!=='fixed';
      $$('[data-access]').forEach(function(input){input.checked=state.access.includes(input.dataset.access);});
      $$('[data-input]').forEach(function(input){const key=input.dataset.input;if(input.value!==v[key])input.value=v[key];const show=Boolean(e[key]&&(state.seen[key]||v[key].length));input.setAttribute('aria-invalid',String(show));const error=$('[data-error="'+key+'"]');if(error){error.hidden=!show;error.textContent=show?e[key]:'';}});
      ['housing','commute'].forEach(function(key){const known=state.known[key];$('[data-known="'+key+'"]').hidden=!known;if(!known)return;$('[data-known-text="'+key+'"]').textContent=known.source+' · '+(key==='housing'?usd(known.value)+' / month':known.value+' min each way');const applied=m[key]==='fixed'&&state.sources[key]?.kind==='reviewed-context'&&state.sources[key].label===known.source&&(key==='housing'?money(v[key]):whole(v[key],0,1440))===known.value;const button=$('[data-apply="'+key+'"]');button.disabled=applied;button.textContent=applied?'Applied':'Use this limit';});
      const d=snapshot(),count=Object.values(areas).filter(Boolean).length,lines=reviewLines(d);root.q6Draft=copy(d);root.dataset.confirmed=String(state.confirmed);
      $('[data-progress]').textContent=count+' of 4 areas reviewed';
      Object.keys(areas).forEach(function(key){$('[data-area="'+key+'"]').dataset.reviewed=String(areas[key]);});
      const list=$('[data-review-list]');list.replaceChildren();lines.forEach(function(line){const li=document.createElement('li');li.textContent=line;list.appendChild(li);});$('.ph6-review').hidden=lines.length===0;
      let title=count===4?'Your requirements are ready to save.':(4-count)+' area'+(4-count===1?'':'s')+' left to review.';
      let detail='“No firm requirement” and “Unsure” are valid responses.';
      if(count===4)detail=d.clarify.length?d.clarify.length+' item'+(d.clarify.length===1?' remains':'s remain')+' unsure. These will be kept open for clarification.':'Review the summary above. You can change any answer.';
      if(state.confirmed){title='Your household requirements are saved.';detail=d.clarify.length?d.clarify.length+' item'+(d.clarify.length===1?' remains':'s remain')+' unsure. You can update these anytime.':'You can change your requirements anytime.';}
      $('[data-status-title]').textContent=title;$('[data-status-detail]').textContent=detail;$('[data-save]').disabled=!d.complete||state.confirmed;$('[data-save]').textContent=state.confirmed?'Saved ✓':'Save my requirements →';
    }
    function changed(){state.confirmed=false;root.q6Answer=null;render();root.dispatchEvent(new CustomEvent('repsych:q6:change',{bubbles:true,detail:{questionId:'q6',confirmed:false,draft:copy(root.q6Draft)}}));}
    function clearValues(keys){keys.forEach(function(key){state.values[key]='';delete state.seen[key];});}
    function setMode(key,value){state.modes[key]=value;
      if(key==='bedrooms')clearValues(['bedrooms']);
      if(key==='rooms')clearValues(['roomCount','roomPurpose']);
      if(key==='access'){state.access=[];clearValues(['accessOther']);}
      if(key==='readiness'){state.modes.wait='';clearValues(['weeks']);}
      if(key==='wait')clearValues(['weeks']);
      if(key==='housing'||key==='commute'){clearValues([key]);state.sources[key]=null;}
      changed();
    }
    $$('[data-mode]').forEach(function(input){input.addEventListener('change',function(){if(input.checked)setMode(input.dataset.mode,input.value);});});
    $$('[data-input]').forEach(function(input){const key=input.dataset.input;input.addEventListener('input',function(){state.values[key]=input.value;if(key==='housing'||key==='commute')state.sources[key]={kind:'manual'};changed();});input.addEventListener('blur',function(){state.seen[key]=true;if(key==='housing'&&money(state.values.housing)!==null)state.values.housing=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(money(state.values.housing));render();});});
    $$('[data-access]').forEach(function(input){input.addEventListener('change',function(){const key=input.dataset.access;if(input.checked){if(!state.access.includes(key))state.access.push(key);}else{state.access=state.access.filter(function(item){return item!==key;});if(key==='other')clearValues(['accessOther']);}changed();});});
    $('[data-save]').addEventListener('click',function(){const answer=snapshot();if(!answer.complete||state.confirmed)return;answer.answeredAt=new Date().toISOString();root.q6Answer=copy(answer);root.q6History.push(copy(answer));state.confirmed=true;render();root.dispatchEvent(new CustomEvent('repsych:q6:confirmed',{bubbles:true,detail:copy(answer)}));});

    // Optional integration: expose EXISTING known limits for explicit review.
    // It never overwrites entered answers or treats a Q1 preference / Q2 price as a cap.
    // Call this on the intended Q6 root; see the setup file for exact scope strings.
    root.q6SetKnownLimits=function(context){const accepted=[],rejected=[];state.known={housing:null,commute:null};const data=context&&typeof context==='object'?context:{};
      ['housing','commute'].forEach(function(key){if(!Object.prototype.hasOwnProperty.call(data,key))return;const item=data[key];let value=null;
        if(item&&typeof item==='object'){
          if(key==='housing'&&item.currency==='USD'&&item.scope==='all-in-monthly-housing'&&typeof item.amount==='number')value=money(String(item.amount));
          if(key==='commute'&&item.scope==='one-way-normal-workday'&&typeof item.minutes==='number')value=whole(String(item.minutes),0,1440);
        }
        if(value===null){rejected.push(key);return;}
        const source=typeof item.source==='string'&&item.source.trim()?item.source.trim().slice(0,100):'Earlier plan';state.known[key]={value,source};accepted.push(key);
      });render();return {accepted,rejected};
    };
    $$('[data-apply]').forEach(function(button){button.addEventListener('click',function(){const key=button.dataset.apply,known=state.known[key];if(!known)return;state.modes[key]='fixed';state.values[key]=String(known.value);state.sources[key]={kind:'reviewed-context',label:known.source};delete state.seen[key];changed();});});
    render();
  });
})();
