
(function(){
  'use strict';
  // Approved artwork is bundled with this app.
  // SVG viewports show only the four approved kitchens, without the mockup's UI.
  const CONDITION_IMAGE_URL = './assets/condition.png';
  const CONDITIONS = {
    ready: {id:'ready',label:'Ready to live in',level:0,description:'It already meets my needs.'},
    cosmetic: {id:'cosmetic',label:'Light cosmetic work',level:1,description:'Paint, fixtures, and small updates.'},
    planned: {id:'planned',label:'Planned projects',level:2,description:'Kitchen, bathroom, or flooring work.'},
    extensive: {id:'extensive',label:'Extensive renovation',level:3,description:'Several major projects and disruption.'}
  };
  const copy = function(value){ return JSON.parse(JSON.stringify(value)); };
  document.querySelectorAll('[data-pcsu-condition-choice]').forEach(function(root,index){
    if(root.dataset.ready==='true')return;
    root.dataset.ready='true';root.dataset.answered='false';
    const $=function(selector){return root.querySelector(selector);};
    const radios=Array.from(root.querySelectorAll('.ph4-radio'));
    const instanceId='repsych-q4-'+Date.now().toString(36)+'-'+index+'-'+Math.random().toString(36).slice(2,9);
    radios.forEach(function(input){input.name=instanceId;input.checked=false;});
    root.q4Answer=null;root.q4History=[];
    let selected=null;

    const imageURL=root.getAttribute('data-condition-image-url')||CONDITION_IMAGE_URL;
    const configured=Boolean(imageURL)&&!/^PASTE_/i.test(imageURL);
    function imageUnavailable(){
      root.dataset.imageStatus='unavailable';
      root.querySelectorAll('.ph4-art-fallback').forEach(function(el){el.hidden=false;el.textContent='Image unavailable';});
      $('[data-image-notice]').hidden=false;
    }
    if(configured){
      root.dataset.imageStatus='loading';
      const loader=new Image();
      loader.onload=function(){
        root.querySelectorAll('[data-condition-art]').forEach(function(el){el.setAttribute('href',imageURL);});
        root.querySelectorAll('.ph4-art-fallback').forEach(function(el){el.hidden=true;});
        root.dataset.imageStatus='loaded';
      };
      loader.onerror=imageUnavailable;
      loader.src=imageURL;
    }else{
      imageUnavailable();
      console.warn('RE-Psych Q4: set CONDITION_IMAGE_URL to the supplied artwork asset URL.');
    }

    const comparison=$('.ph4-comparison');
    function updateScroll(){
      const maximum=Math.max(0,comparison.scrollWidth-comparison.clientWidth);
      $('.ph4-scroll-nav').hidden=maximum<3;
      $('[data-scroll="-1"]').disabled=comparison.scrollLeft<2;
      $('[data-scroll="1"]').disabled=comparison.scrollLeft>=maximum-2;
      $('[data-comparison-hint]').textContent=maximum<3?'Compare all four condition levels.':'Swipe or use the arrows to compare all four conditions.';
    }
    function moveComparison(direction){
      const gap=parseFloat(getComputedStyle($('.ph4-grid')).columnGap)||12;
      const distance=$('.ph4-card').getBoundingClientRect().width+gap;
      comparison.scrollBy({left:direction*distance,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }
    root.querySelectorAll('[data-scroll]').forEach(function(button){button.addEventListener('click',function(){moveComparison(Number(button.dataset.scroll));});});
    comparison.addEventListener('scroll',updateScroll,{passive:true});
    comparison.addEventListener('keydown',function(event){
      if(event.target!==comparison)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveComparison(event.key==='ArrowRight'?1:-1);}
      else if(event.key==='Home'||event.key==='End'){event.preventDefault();comparison.scrollLeft=event.key==='Home'?0:comparison.scrollWidth;}
    });
    if(window.ResizeObserver){new ResizeObserver(updateScroll).observe(comparison);}
    else{window.addEventListener('resize',updateScroll);}
    updateScroll();

    function choose(value){
      if(value===selected)return;
      const condition=CONDITIONS[value]||null;
      if(!condition&&value!=='needs-info')return;
      selected=value;
      radios.forEach(function(input){
        const isSelected=input.value===value;
        input.checked=isSelected;
        input.closest('label').dataset.selected=String(isSelected);
        const cta=input.closest('label').querySelector('.ph4-card-cta');
        if(cta)cta.textContent=isSelected?'Selected ✓':'Choose this condition';
      });
      // Levels 0–3 are ordered choice categories, NOT psychological scores,
      // renovation cost estimates, or verified capacity to complete work.
      const answer={
        version:'repsych.q4.condition.v1',questionId:'q4',
        selectionStatus:condition?'selected':'needs-information',
        selectedConditionId:condition?condition.id:null,
        selectedCondition:condition?copy(condition):null,
        maxAcceptedWorkLevel:condition?condition.level:null,
        selfReported:true,comparisonScope:'same-home-layout-size',
        answeredAt:new Date().toISOString()
      };
      root.q4Answer=copy(answer);root.q4History.push(copy(answer));
      root.dataset.answered='true';
      $('.ph4-result-icon').textContent=condition?'✓':'?';
      $('[data-result-title]').textContent=condition?'Your choice: '+condition.label:'You need more information.';
      $('[data-result-detail]').textContent=condition?'Q4 is complete. You can change your choice anytime.':'Your uncertainty is recorded. You can choose a condition level when you are ready.';
      // Both events bubble to a future quiz controller. No navigation is forced.
      root.dispatchEvent(new CustomEvent('repsych:q4:change',{bubbles:true,detail:copy(answer)}));
      root.dispatchEvent(new CustomEvent('repsych:q4:confirmed',{bubbles:true,detail:copy(answer)}));
    }
    radios.forEach(function(input){input.addEventListener('change',function(){if(input.checked)choose(input.value);});});
  });
})();
