
(function(){
  // Approved artwork is bundled with this app.
  const HOME_IMAGE_URL = './assets/homes.png';
  const PURCHASE_PRICE=300000;
  const HOMES=[{"id":"A","bedrooms":2,"squareFeet":1200,"yard":"Medium landscaped yard","finishes":"Custom cabinetry & natural stone","condition":"Finished now · compact rooms","tradeoff":"Compact · Premium finish"},{"id":"B","bedrooms":3,"squareFeet":1550,"yard":"Small yard","finishes":"Modern, standard-grade finishes","condition":"Move-in ready","tradeoff":"Moderate space · Updated"},{"id":"C","bedrooms":3,"squareFeet":1750,"yard":"Medium yard","finishes":"Basic cabinets & laminate","condition":"Well maintained","tradeoff":"Standard size · Basic finish"},{"id":"D","bedrooms":3,"squareFeet":1900,"yard":"Large yard","finishes":"Older oak cabinets & laminate","condition":"Maintained, dated finishes","tradeoff":"More yard · Older finish"},{"id":"E","bedrooms":4,"squareFeet":2250,"yard":"Large yard","finishes":"Dated cabinets & patterned vinyl","condition":"Worn finishes · updates extra","tradeoff":"Most space · Dated finish"}];
  const REASON_LABELS={"household_bedrooms":"Bedrooms my household needs","indoor_space":"More usable indoor space","outdoor_living":"Yard & outdoor living","finishes_design":"Finishes & design","little_updating":"Little updating needed","dated_finish_acceptance":"Comfortable with older finishes","other":"Another reason"};
  const copy=function(value){return JSON.parse(JSON.stringify(value));};
  document.querySelectorAll('[data-pcsu-home-choice]').forEach(function(root){
    if(root.dataset.ready)return;root.dataset.ready='true';
    const $=function(s){return root.querySelector(s);};
    const state={home:null,stage:'choose',confirmed:false,reasons:[],other:'',unsure:false,onlyOne:false,noTimer:false,elapsed:0,expired:false,inView:false,lastTick:0,timerAtStart:true};
    let timerInterval=null;
    root.q2Answer=null;root.q2History=[];root.dataset.stage='choose';
    // Each SVG shows one exterior or kitchen from the same ten-panel artwork asset.
    // Keeping one shared file means a single asset upload and a single browser download.
    const artURL=root.getAttribute('data-home-image-url')||HOME_IMAGE_URL;
    const artConfigured=Boolean(artURL)&&!artURL.includes('PASTE_WEBFLOW_IMAGE_URL_HERE');
    root.querySelectorAll('[data-home-art]').forEach(function(image){
      if(artConfigured)image.setAttribute('href',artURL);
      else image.closest('.ph2-art').querySelector('.ph2-art-fallback').hidden=false;
      image.addEventListener('error',function(){image.closest('.ph2-art').querySelector('.ph2-art-fallback').hidden=false;});
    });
    if(!artConfigured)console.warn('RE-Psych Q2: set HOME_IMAGE_URL to the supplied artwork asset URL.');
    const comparison=$('.ph2-comparison');
    function updateComparison(){
      const maximum=Math.max(0,comparison.scrollWidth-comparison.clientWidth);
      $('.ph2-scroll-nav').hidden=maximum<3;
      $('[data-scroll="-1"]').disabled=comparison.scrollLeft<2;
      $('[data-scroll="1"]').disabled=comparison.scrollLeft>=maximum-2;
      $('[data-comparison-hint]').textContent=maximum<3?'Exterior and kitchen shown for each home.':'Swipe or use the arrows to compare all five homes side by side.';
    }
    function scrollComparison(direction){
      const card=$('[data-home]'),step=card.getBoundingClientRect().width+12;
      comparison.scrollBy({left:direction*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
    root.querySelectorAll('[data-scroll]').forEach(function(button){button.addEventListener('click',function(){scrollComparison(Number(button.dataset.scroll));});});
    comparison.addEventListener('scroll',updateComparison,{passive:true});
    comparison.addEventListener('keydown',function(event){
      if(event.target!==comparison)return;
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();scrollComparison(event.key==='ArrowRight'?1:-1);}
      else if(event.key==='Home'||event.key==='End'){event.preventDefault();comparison.scrollLeft=event.key==='Home'?0:comparison.scrollWidth;}
    });
    if(window.ResizeObserver)new ResizeObserver(updateComparison).observe(comparison);
    else window.addEventListener('resize',updateComparison);
    updateComparison();
    function invalidate(){state.confirmed=false;root.q2Answer=null;root.dataset.confirmed='false';$('.ph2-result').textContent='';root.dispatchEvent(new CustomEvent('repsych:q2:change',{bubbles:true,detail:{questionId:'q2',confirmed:false}}));}
    function render(){
      root.dataset.stage=state.stage;
      root.querySelectorAll('[data-home]').forEach(function(button){const selected=state.home===button.dataset.home;button.setAttribute('aria-pressed',String(selected));button.disabled=state.stage!=='choose';button.querySelector('.ph2-home-cta').textContent=selected?'Selected ✓':'Choose Home '+button.dataset.home;});
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
      if(!state.noTimer && state.elapsed>=10000 && !state.expired){state.expired=true;$('.ph2-live').textContent='The countdown has finished. You can keep choosing.';}
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
      $('[data-time-note]').textContent=state.stage==='done'?'Your home choice and reasons are saved for this page session.':choicesReady()?'Your choices are ready. Save them when you’re happy.':state.noTimer?'Take the time you need to choose.':state.expired?'The countdown is finished. Your choices are still here—take the time you need.':'Go with your first impression. You can keep choosing after 10 seconds.';
    }
    function renderReasons(){
      root.dataset.stage=state.stage;
      $('.ph2-choice-tools').hidden=state.stage!=='choose';
      $('[data-timer-preference]').setAttribute('aria-pressed',String(state.noTimer));
      $('[data-timer-preference]').textContent=state.noTimer?'Timer off · turn on':'Use without timer';
      $('.ph2-home-summary').hidden=state.stage==='choose';
      $('.ph2-reasons').hidden=state.stage==='choose';
      $('[data-home-summary]').textContent=state.home==='none'?'Your choice: none fits my needs':'Your choice: Home '+state.home+' · $300,000';
      $('.ph2-reasons-title').textContent=state.home==='none'?'What are your top two reasons none of these homes fits?':'What are your top two reasons for choosing Home '+state.home+'?';
      $('.ph2-reasons-intro').textContent=state.home==='none'?'Choose what these homes would need to work for you. You can also give another reason.':'Choose what influenced your choice most. There are no right answers.';
      root.querySelectorAll('[data-reason]').forEach(function(button){button.setAttribute('aria-pressed',String(state.reasons.includes(button.dataset.reason)));button.disabled=state.stage==='done';});
      $('[data-unsure]').setAttribute('aria-pressed',String(state.unsure));
      $('[data-unsure]').disabled=state.stage==='done';
      $('.ph2-other-input').hidden=!state.reasons.includes('other');
      $('[data-other-text]').disabled=state.stage==='done';
      $('.ph2-only-one').hidden=state.reasons.length!==1||state.unsure||state.stage==='done';
      $('[data-only-one]').checked=state.onlyOne;
      $('[data-reason-count]').textContent=state.unsure?'Still exploring':state.onlyOne?'1 reason selected':state.reasons.length+' of 2 selected';
      $('[data-finish]').disabled=!choicesReady()||state.stage==='done';
      $('[data-finish]').innerHTML=state.stage==='done'?'Choices saved ✓':'Save my choices <span aria-hidden="true">→</span>';
      renderTimer();
    }
    function currentVisibility(){
      if(!root.closest('dialog')?.open || root.closest('[data-baseline-step]')?.hidden)return false;
      const b=$('.ph2-reasons').getBoundingClientRect();
      const clip=root.closest('.pa-scroll')?.getBoundingClientRect()||{top:0,bottom:window.innerHeight,height:window.innerHeight};
      const visible=Math.max(0,Math.min(b.bottom,clip.bottom)-Math.max(b.top,clip.top));
      return b.width>0&&b.height>0&&visible>=Math.min(b.height,root.closest('.pa-scroll')?.clientHeight||window.innerHeight)*.5;
    }
    function resetReasons(){
      stopTimer();state.reasons=[];state.other='';state.unsure=false;state.onlyOne=false;state.elapsed=0;state.expired=false;
      $('[data-other-text]').value='';
    }
    function selectHome(id){
      if(state.stage!=='choose'||(id!=='none'&&!HOMES.some(function(h){return h.id===id;})))return;
      resetReasons();invalidate();state.home=id;state.stage='reasons';state.timerAtStart=!state.noTimer;state.lastTick=performance.now();render();
      $('.ph2-reasons').scrollIntoView({behavior:'instant',block:'center'});$('.ph2-reasons-title').focus({preventScroll:true});
      state.inView=currentVisibility();state.lastTick=performance.now();renderTimer();timerInterval=setInterval(tick,100);
    }
    root.querySelectorAll('[data-home]').forEach(function(button){button.addEventListener('click',function(){selectHome(button.dataset.home);});});
    $('[data-none]').addEventListener('click',function(){selectHome('none');});
    $('[data-timer-preference]').addEventListener('click',function(){state.noTimer=!state.noTimer;renderReasons();});
    $('[data-edit]').addEventListener('click',function(){
      resetReasons();state.stage='choose';invalidate();render();
      $('.ph2-question').scrollIntoView({behavior:'instant',block:'start'});
      $('.ph2-question').focus({preventScroll:true});
    });
    root.querySelectorAll('[data-reason]').forEach(function(button){
      button.addEventListener('click',function(){
        if(state.stage!=='reasons')return;
        tick();const id=button.dataset.reason,index=state.reasons.indexOf(id);
        if(index>=0)state.reasons.splice(index,1);
        else if(state.reasons.length<2)state.reasons.push(id);
        else{$('.ph2-live').textContent='Two reasons are selected. Deselect one before choosing another.';return;}
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
    if(window.IntersectionObserver){new IntersectionObserver(function(){state.lastTick=performance.now();state.inView=currentVisibility();renderTimer();},{threshold:[0,.25,.5,.75,1]}).observe($('.ph2-reasons'));}
    else window.addEventListener('scroll',function(){state.lastTick=performance.now();state.inView=currentVisibility();renderTimer();},{passive:true});
    $('[data-finish]').addEventListener('click',function(){
      if(state.stage!=='reasons'||!choicesReady())return;
      tick();stopTimer();
      // Reasons are explicit, equally weighted statements, not inferred traits or a ranking.
      const reasonIds=Object.keys(REASON_LABELS).filter(function(id){return state.reasons.includes(id);});
      const home=HOMES.find(function(h){return h.id===state.home;})||null;
      const answer={
        version:'repsych.q2.home-choice.v2',questionId:'q2',confirmed:true,
        purchasePrice: PURCHASE_PRICE,currency:'USD',priceScope:'purchase-only',optionalUpdatesIncluded:false,
        commuteAssumption:'same-for-all-options',scenario:'illustrative-all-homes-structurally-sound-and-livable',
        comparisonIntent:'live-in-as-shown',renovationAssumption:'additional-budget-required',imageVariant:'exterior-and-kitchen-v2',
        selectedHomeId:home?home.id:null,selectionStatus:home?'home-selected':'none-fit',selectedHome:home?copy(home):null,
        offeredHomes:copy(HOMES),reasonContext:home?'why-selected':'unmet-needs',
        reasons:reasonIds.map(function(id){return {id:id,label:REASON_LABELS[id]};}),
        otherReason:reasonIds.includes('other')?state.other.trim():null,
        reasonStatus:state.unsure?'unsure':reasonIds.length===1?'one-reason':'two-reasons',reasonsAreRanked:false,
        timing:{countdownSeconds:10,enabledAtStart:state.timerAtStart,turnedOff:state.timerAtStart&&state.noTimer,expired:state.expired,activeResponseMs:Math.round(state.elapsed),usedForScoring:false},
        source:'user-stated-home-choice-and-reasons'
      };
      state.stage='done';state.confirmed=true;root.q2Answer=answer;root.dataset.confirmed='true';
      root.q2History.push(JSON.parse(JSON.stringify(answer)));render();
      const reasons=state.unsure?'Still exploring the reasons.':reasonIds.map(function(id){return id==='other'?state.other.trim():REASON_LABELS[id];}).join(' + ')+'.';
      $('.ph2-result').textContent='Saved: '+(home?'Home '+home.id+' at $300,000. ':'None fits my needs. ')+reasons;
      root.dispatchEvent(new CustomEvent('repsych:q2:confirmed',{bubbles:true,detail:JSON.parse(JSON.stringify(answer))}));
    });
    render();
  });
})();
