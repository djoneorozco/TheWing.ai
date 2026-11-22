
(function(){
  const ZONE_MINUTES=[15,25,35];
  const REASON_LABELS={less_driving:'Less time driving',indoor_space:'More room inside',outdoor_space:'More outdoor space',housing_cost:'Lower housing costs',city_convenience:'City life & convenience',quiet_privacy:'Quiet & privacy',other:'Another reason'};
  document.querySelectorAll('[data-pcsu-fixed-zone]').forEach(function(root){
    if(root.dataset.ready)return;root.dataset.ready='true';
    const $=function(selector){return root.querySelector(selector);};
    const map=$('.pzf-map'),svg=$('.pzf-scene'),uid='pzf'+Math.random().toString(36).slice(2,10);
    const state={minutes:null,stage:'map',confirmed:false,reasons:[],other:'',unsure:false,onlyOne:false,noTimer:false,elapsed:0,expired:false,inView:false,lastTick:0,timerAtStart:true};
    let timerInterval=null,resizeFrame=0;
    root.q1Answer=null;root.q1History=[];root.dataset.stage='map';
    function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n));}
    function use(name,x,y,scale){return '<use href="#'+uid+'-'+name+'" transform="translate('+x+' '+y+') scale('+scale+')"/>';}
    function landscape(){
      const w=map.clientWidth,h=map.clientHeight;if(!w||!h)return;
      const s=clamp(w/1000,.5,1);svg.setAttribute('viewBox','0 0 '+w+' '+h);
      const defs = '<defs>' +
        '<g id="' + uid + '-tree"><ellipse cx="0" cy="12" rx="15" ry="5" fill="#88aa5d" opacity=".3"/><path d="M0 10V-23" stroke="#88714b" stroke-width="4"/><ellipse cx="-5" cy="-25" rx="13" ry="17" fill="#74aa51"/><ellipse cx="6" cy="-31" rx="14" ry="19" fill="#93bd5c"/><ellipse cx="1" cy="-18" rx="13" ry="15" fill="#84b755"/></g>' +
        '<g id="' + uid + '-house"><ellipse cx="0" cy="19" rx="31" ry="7" fill="#92ad63" opacity=".28"/><path d="M-26-6H24V22H-26Z" fill="#f6e8c9"/><path d="M-31-6 0-30 29-6Z" fill="#526b74"/><path d="M-20-5H-4V22H-20Z" fill="#e7d6b3"/><path d="M4 6H12V22H4Z" fill="#618296"/><path d="M-16 3H-8V12H-16ZM14 0H21V10H14Z" fill="#8bb7c4"/><path d="M17-17V-29H22V-13" fill="#b69e81"/></g>' +
        '<g id="' + uid + '-block"><path d="M-19-29H18V19H-19Z" fill="#c4d3cc"/><path d="M-22-32H21V-26H-22Z" fill="#718c8c"/><path d="M-12-19H-5V-11H-12ZM4-19H11V-11H4ZM-12-4H-5V4H-12ZM4-4H11V4H4ZM-5 10H5V19H-5Z" fill="#7094a0"/></g>' +
        '<g id="' + uid + '-base"><ellipse cx="0" cy="21" rx="62" ry="10" fill="#99b874"/><path d="M-52-12H52V20H-52Z" fill="#f5e8c8"/><path d="M-56-15H56V-8H-56Z" fill="#61777b"/><path d="M-18-21H18V20H-18Z" fill="#fff1d1"/><path d="M-22-24H22V-17H-22Z" fill="#526b74"/><path d="M-7 5H7V20H-7Z" fill="#577b8e"/><path d="M-43-2H-33V7H-43ZM-28-2H-20V7H-28ZM21-2H29V7H21ZM34-2H44V7H34Z" fill="#91bdcc"/><path d="M26-16V-45" stroke="#69786f" stroke-width="3"/><path d="M28-44 48-38 28-33Z" fill="#193650"/></g></defs>';

      function contour(cx,cy,rx,ry){
        function p(x,y){return ((cx+x*rx)*w).toFixed(2)+' '+((cy+y*ry)*h).toFixed(2);}
        return 'M'+p(-1,0)+' C'+p(-1.12,-.4)+' '+p(-.8,-.87)+' '+p(-.44,-.87)+' S'+p(-.06,-1.22)+' '+p(.32,-.98)+' S'+p(1.08,-.78)+' '+p(.98,-.27)+' S'+p(1.12,.2)+' '+p(.82,.57)+' S'+p(.53,.99)+' '+p(.13,.88)+' S'+p(-.35,1.05)+' '+p(-.72,.69)+' S'+p(-.9,.39)+' '+p(-1,0)+' Z';
      }
      const inner=contour(.5,.66,.245,.205),middle=contour(.5,.59,.35,.32),outer=contour(.5,.53,.45,.435);
      const road1='M '+(-w*.03)+' '+h*.91+' C '+w*.18+' '+h*.65+' '+w*.21+' '+h*.98+' '+w*.36+' '+h*.73+' S '+w*.64+' '+h*.66+' '+w*.68+' '+h*.44+' S '+w*.86+' '+h*.48+' '+w*1.04+' '+h*.23;
      const road2='M '+w*.2+' '+(-h*.04)+' C '+w*.39+' '+h*.21+' '+w*.17+' '+h*.31+' '+w*.47+' '+h*.6+' S '+w*.62+' '+h*.76+' '+w*.54+' '+h*1.08;
      const roads=[road1,road2].map(function(d){return '<path d="'+d+'" fill="none" stroke="#f4f3dc" stroke-width="'+(15*s+5)+'"/><path d="'+d+'" fill="none" stroke="#839da9" stroke-width="'+(12*s+3)+'"/><path d="'+d+'" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="8 9"/>';}).join('');
      let art='';
      [[.04,.2],[.13,.1],[.3,.1],[.75,.09],[.94,.17],[.95,.48],[.96,.77],[.83,.91],[.31,.94],[.08,.91],[.08,.48],[.16,.65],[.76,.86],[.87,.65]].forEach(function(p,i){art+=use('tree',w*p[0],h*p[1],s*(i%3===0?1.15:.85));});
      [[.14,.24],[.89,.38],[.88,.83],[.17,.85]].forEach(function(p){art+=use('house',w*p[0],h*p[1],s);});
      [[.44,.71],[.58,.69],[.41,.76]].forEach(function(p){art+=use('block',w*p[0],h*p[1],s*.5);});
      svg.innerHTML=defs+'<rect width="'+w+'" height="'+h+'" fill="#dfebbf"/>'+
        '<path d="M0 '+h*.25+' Q'+w*.25+' '+(-h*.12)+' '+w*.6+' '+h*.14+' T'+w+' '+h*.08+' V0H0Z" fill="#c7dfa1"/>'+
        '<path d="M0 '+h*.74+' Q'+w*.2+' '+h*.63+' '+w*.42+' '+h*.85+' T'+w+' '+h*.78+' V'+h+'H0Z" fill="#cfe6a1"/>'+
        '<path class="pzf-area" data-zone-area="35" d="'+outer+' '+middle+'" fill="#c1e7df" fill-rule="evenodd"/>'+
        '<path class="pzf-area" data-zone-area="25" d="'+middle+' '+inner+'" fill="#97d8ce" fill-rule="evenodd"/>'+
        '<path class="pzf-area" data-zone-area="15" d="'+inner+'" fill="#70c5b9"/>'+
        '<g pointer-events="none">'+roads+'<ellipse cx="'+w*.73+'" cy="'+h*.92+'" rx="'+45*s+'" ry="'+17*s+'" fill="#9ccfcd" stroke="#f3edcd" stroke-width="5"/>'+art+use('base',w*.5,h*.76,s*.92)+'</g>';
      const labels={15:[.62,.56],25:[.6,.365],35:[.61,.16]};
      ZONE_MINUTES.forEach(function(minutes){const button=$('[data-time="'+minutes+'"]');button.style.left=(labels[minutes][0]*w)+'px';button.style.top=(labels[minutes][1]*h)+'px';});
      const base=$('.pzf-base');base.style.left=w*.5+'px';base.style.top=h*.68+'px';
      render();
    }
    function invalidate(){state.confirmed=false;root.q1Answer=null;root.dataset.confirmed='false';$('.pzf-result').textContent='';root.dispatchEvent(new CustomEvent('repsych:q1:change',{bubbles:true,detail:{questionId:'q1',confirmed:false}}));}
    function render(){
      root.dataset.stage=state.stage;
      ZONE_MINUTES.forEach(function(minutes){
        const selected=state.minutes===minutes,button=$('[data-time="'+minutes+'"]');
        button.setAttribute('aria-pressed',String(selected));button.disabled=state.stage!=='map';
        const area=$('[data-zone-area="'+minutes+'"]');if(area)area.setAttribute('data-selected',String(selected));
      });
      const positions={15:[.34,.65],25:[.76,.56],35:[.84,.25]};
      const home=$('.pzf-home');home.hidden=state.minutes===null;
      if(state.minutes!==null){home.style.left=positions[state.minutes][0]*100+'%';home.style.top=positions[state.minutes][1]*100+'%';}
      renderReasons();
    }
    function choicesReady(){return state.unsure || ((state.reasons.length===2 || (state.reasons.length===1 && state.onlyOne)) && (!state.reasons.includes('other') || state.other.trim().length>0));}
    function stopTimer(){if(timerInterval!==null){clearInterval(timerInterval);timerInterval=null;}}
    function tick(){
      if(!root.isConnected){stopTimer();return;}
      const now=performance.now();
      state.inView=currentVisibility();
      if(state.stage==='reasons' && state.inView && !document.hidden && !state.noTimer && !choicesReady())state.elapsed+=Math.max(0,now-state.lastTick);
      state.lastTick=now;
      if(!state.noTimer && state.elapsed>=10000 && !state.expired){state.expired=true;$('.pzf-live').textContent='The countdown has finished. You can keep choosing.';}
      renderTimer();
    }
    function renderTimer(){
      const seconds=Math.max(0,Math.ceil((10000-state.elapsed)/1000));
      const timer=$('[data-timer]');
      const paused=!state.inView || document.hidden;
      const text=state.stage==='done'?'Saved':choicesReady()?'Ready':state.noTimer?'Untimed':state.expired?'Take your time':paused?'Paused':seconds+'s';
      timer.textContent=text;
      timer.setAttribute('aria-label',/^\d+s$/.test(text)?seconds+' seconds remaining':text);
      $('[data-time-fill]').style.transform='scaleX('+(state.noTimer?1:Math.max(0,1-state.elapsed/10000))+')';
      $('[data-timer-off]').hidden=state.noTimer||state.stage==='done';
      $('[data-time-note]').textContent=state.stage==='done'?'Your commute and reasons are saved for this page session.':choicesReady()?'Your choices are ready. Save them when you’re happy.':state.noTimer?'Take the time you need to choose.':state.expired?'The countdown is finished. Your choices are still here—take the time you need.':'Go with your first impression. You can keep choosing after 10 seconds.';
    }
    function renderReasons(){
      root.dataset.stage=state.stage;
      $('[data-timer-preference]').hidden=state.stage!=='map';
      $('[data-timer-preference]').setAttribute('aria-pressed',String(state.noTimer));
      $('[data-timer-preference]').textContent=state.noTimer?'Timer off · turn on':'Use without timer';
      $('.pzf-map-summary').hidden=state.stage==='map';
      $('.pzf-reasons').hidden=state.stage==='map';
      $('[data-zone-summary]').textContent='Your choice: '+state.minutes+' minutes one way';
      $('[data-map-hint]').textContent=state.stage==='map'?'Click a shaded zone or its time label. Your two-reason question opens next.':'Your commute is selected. Choose “Change commute” to pick another zone.';
      root.querySelectorAll('[data-reason]').forEach(function(button){button.setAttribute('aria-pressed',String(state.reasons.includes(button.dataset.reason)));button.disabled=state.stage==='done';});
      $('[data-unsure]').setAttribute('aria-pressed',String(state.unsure));
      $('[data-unsure]').disabled=state.stage==='done';
      $('.pzf-other-input').hidden=!state.reasons.includes('other');
      $('[data-other-text]').disabled=state.stage==='done';
      $('.pzf-only-one').hidden=state.reasons.length!==1||state.unsure||state.stage==='done';
      $('[data-only-one]').checked=state.onlyOne;
      $('[data-reason-count]').textContent=state.unsure?'Still exploring':state.onlyOne?'1 reason selected':state.reasons.length+' of 2 selected';
      $('[data-finish]').disabled=!choicesReady()||state.stage==='done';
      $('[data-finish]').innerHTML=state.stage==='done'?'Choices saved ✓':'Save my choices <span aria-hidden="true">→</span>';
      renderTimer();
    }
    function currentVisibility(){
      if(!root.closest('dialog')?.open || root.closest('[data-baseline-step]')?.hidden)return false;
      const b=$('.pzf-reasons').getBoundingClientRect();
      const clip=root.closest('.pa-scroll')?.getBoundingClientRect()||{top:0,bottom:window.innerHeight,height:window.innerHeight};
      const visible=Math.max(0,Math.min(b.bottom,clip.bottom)-Math.max(b.top,clip.top));
      return b.width>0&&b.height>0&&visible>=Math.min(b.height,root.closest('.pa-scroll')?.clientHeight||window.innerHeight)*.5;
    }
    function resetReasons(){
      stopTimer();state.reasons=[];state.other='';state.unsure=false;state.onlyOne=false;state.elapsed=0;state.expired=false;
      $('[data-other-text]').value='';
    }
    function selectZone(minutes){
      if(state.stage!=='map'||!ZONE_MINUTES.includes(minutes))return;
      resetReasons();invalidate();state.minutes=minutes;state.stage='reasons';state.timerAtStart=!state.noTimer;state.lastTick=performance.now();render();
      $('.pzf-reasons').scrollIntoView({behavior:'instant',block:'center'});
      $('.pzf-reasons-title').focus({preventScroll:true});
      state.inView=currentVisibility();state.lastTick=performance.now();renderTimer();
      timerInterval=setInterval(tick,100);
    }
    root.querySelectorAll('[data-time]').forEach(function(button){button.addEventListener('click',function(){selectZone(Number(button.dataset.time));});});
    // Distinguish a touch scroll from a tap on an illustrated band.
    let mapPointer=null;
    map.addEventListener('pointerdown',function(event){
      if(state.stage!=='map'||!event.isPrimary||event.button!==0)return;
      const area=event.target.closest('[data-zone-area]');if(!area)return;
      mapPointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,minutes:Number(area.dataset.zoneArea)};
    });
    map.addEventListener('pointermove',function(event){if(mapPointer&&mapPointer.id===event.pointerId&&Math.hypot(event.clientX-mapPointer.x,event.clientY-mapPointer.y)>9)mapPointer.moved=true;},{passive:true});
    map.addEventListener('pointercancel',function(){mapPointer=null;});
    map.addEventListener('pointerup',function(event){
      if(!mapPointer||mapPointer.id!==event.pointerId)return;
      const pointer=mapPointer;mapPointer=null;const area=event.target.closest('[data-zone-area]');
      if(!pointer.moved&&area&&Number(area.dataset.zoneArea)===pointer.minutes)selectZone(pointer.minutes);
    });
    $('[data-timer-preference]').addEventListener('click',function(){state.noTimer=!state.noTimer;renderReasons();});
    $('[data-edit]').addEventListener('click',function(){
      resetReasons();state.stage='map';invalidate();render();
      map.scrollIntoView({behavior:'instant',block:'center'});
      $('[data-time="'+(state.minutes||15)+'"]').focus({preventScroll:true});
    });
    root.querySelectorAll('[data-reason]').forEach(function(button){
      button.addEventListener('click',function(){
        if(state.stage!=='reasons')return;
        tick();const id=button.dataset.reason,index=state.reasons.indexOf(id);
        if(index>=0)state.reasons.splice(index,1);
        else if(state.reasons.length<2)state.reasons.push(id);
        else{$('.pzf-live').textContent='Two reasons are selected. Deselect one before choosing another.';return;}
        state.unsure=false;state.onlyOne=false;renderReasons();
        if(id==='other'&&state.reasons.includes('other'))$('[data-other-text]').focus();
      });
    });
    $('[data-other-text]').addEventListener('input',function(event){tick();state.other=event.target.value;renderReasons();});
    $('[data-only-one]').addEventListener('change',function(event){tick();state.onlyOne=event.target.checked;renderReasons();});
    $('[data-unsure]').addEventListener('click',function(){
      if(state.stage!=='reasons')return;
      tick();state.unsure=!state.unsure;state.reasons=[];state.other='';state.onlyOne=false;$('[data-other-text]').value='';renderReasons();
    });
    $('[data-timer-off]').addEventListener('click',function(){tick();state.noTimer=true;renderReasons();});
    document.addEventListener('repsych:visibility',function(){state.lastTick=performance.now();state.inView=currentVisibility();renderTimer();});
    document.addEventListener('visibilitychange',function(){state.lastTick=performance.now();renderTimer();});
    if(window.IntersectionObserver){new IntersectionObserver(function(){state.lastTick=performance.now();state.inView=currentVisibility();renderTimer();},{threshold:[0,.25,.5,.75,1]}).observe($('.pzf-reasons'));}
    else window.addEventListener('scroll',function(){state.lastTick=performance.now();state.inView=currentVisibility();renderTimer();},{passive:true});
    $('[data-finish]').addEventListener('click',function(){
      if(state.stage!=='reasons'||!choicesReady())return;
      tick();stopTimer();
      // Reasons are explicit, equally weighted statements, not inferred traits or a ranking.
      const reasonIds=Object.keys(REASON_LABELS).filter(function(id){return state.reasons.includes(id);});
      const answer={
        version:'repsych.q1.fixed-zones.v3',questionId:'q1',confirmed:true,
        selectedCommuteMinutes:state.minutes,offeredCommuteMinutes:ZONE_MINUTES.slice(),selectionType:'single-fixed-time',intent:'comfortable-one-way-commute',
        reasons:reasonIds.map(function(id){return {id:id,label:REASON_LABELS[id]};}),
        otherReason:reasonIds.includes('other')?state.other.trim():null,
        reasonStatus:state.unsure?'unsure':reasonIds.length===1?'one-reason':'two-reasons',reasonsAreRanked:false,
        timing:{countdownSeconds:10,enabledAtStart:state.timerAtStart,turnedOff:state.timerAtStart&&state.noTimer,expired:state.expired,activeResponseMs:Math.round(state.elapsed),usedForScoring:false},
        unit:'minutes',direction:'one-way',source:'user-stated-preferences-and-reasons',mapType:'illustrative',isRouteEstimate:false
      };
      state.stage='done';state.confirmed=true;root.q1Answer=answer;root.dataset.confirmed='true';
      root.q1History.push(JSON.parse(JSON.stringify(answer)));render();
      const reasons=state.unsure?'Still exploring the reasons.':reasonIds.map(function(id){return id==='other'?state.other.trim():REASON_LABELS[id];}).join(' + ')+'.';
      $('.pzf-result').textContent='Saved: '+state.minutes+' minutes one way. '+reasons;
      root.dispatchEvent(new CustomEvent('repsych:q1:confirmed',{bubbles:true,detail:JSON.parse(JSON.stringify(answer))}));
    });
    if(window.ResizeObserver){new ResizeObserver(function(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(landscape);}).observe(map);}
    else window.addEventListener('resize',landscape);
    landscape();
  });
})();
