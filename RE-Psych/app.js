// RE-Psych: original A.I.O.U questions, scoring, timer, and report integration.
(function(){
'use strict';
function boot(){
  const dialog=document.getElementById('pcsaiou-dialog');
  if(!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready='true';
  document.body.append(dialog);
  const host=document.getElementById('pcsaiou-host');
  const root=host.attachShadow({mode:'open'});
  root.append(document.getElementById('pcsaiou-template').content.cloneNode(true));
  const portal=root.getElementById('aiou-portal');
  const $=sel=>portal.querySelector(sel), $$=sel=>Array.from(portal.querySelectorAll(sel));
  const trigger=document.getElementById('pcsaiou-trigger');
  const closeButton=document.getElementById('pcsaiou-close');
  const scroller=document.getElementById('pcsaiou-scroll');
  const status=document.getElementById('pcsaiou-status');
  const clock=document.getElementById('pcsaiou-clock');
  const note=document.getElementById('pcsaiou-note');
      const Q = [
        { id:'V1', type:'visual', dim:'O',
          text:'Choose between Brand New Home vs May Require Fixes.', rev:false },

        { id:'O1',  dim:'O', text:'I prefer a home that looks new or freshly renovated rather than plain but practical.', rev:false, ctrlPair:'O1b' },
        { id:'O1b', dim:'O', text:'I’m fine with a simple, ordinary-looking home if it works.',                         rev:true,  ctrlPair:'O1'  },
        { id:'O2',  dim:'O', text:'Special features (big windows, open kitchen, modern finishes) are worth paying more.', rev:false },
        { id:'O3',  dim:'O', text:'I want a home that feels different from most homes I’ve seen.',                      rev:false },

        { id:'C1',  dim:'C', text:'If a place is just above my budget, I would still try to get it.', rev:true,  ctrlPair:'C1b' },
        { id:'C1b', dim:'C', text:'I will not go over my budget, even if I love the home.',          rev:false, ctrlPair:'C1'  },
        { id:'C2',  dim:'C', text:'Lower monthly costs matter more to me than extra style.',          rev:false },

        { id:'E1',  dim:'E', text:'I often picture hosting dinners, parties, or family gatherings at home.', rev:false, ctrlPair:'E1b' },
        { id:'E1b', dim:'E', text:'I rarely imagine hosting people at my home.',                             rev:true,  ctrlPair:'E1'  },
        { id:'E2',  dim:'E', text:'I would trade an extra bedroom for a bigger living room or outdoor area.', rev:false },

        { id:'A1',  dim:'A', text:'I can be flexible on details if the main things are met.', rev:false, ctrlPair:'A1b' },
        { id:'A1b', dim:'A', text:'Once I set my must-haves, I won’t bend on them.',          rev:true,  ctrlPair:'A1'  },

        { id:'N1',  dim:'N', text:'Buying a home that needs repairs would stress me out.',         rev:false, ctrlPair:'N1b' },
        { id:'N1b', dim:'N', text:'A home that needs repairs doesn’t worry me much.',              rev:true,  ctrlPair:'N1'  },
        { id:'N2',  dim:'N', text:'I’d rather choose a 5–10 year-old home that’s already proven than brand-new.', rev:false },
        { id:'N3',  dim:'N', text:'I prefer a quieter, safer area even if it’s farther from restaurants and events.', rev:false },

        { id:'X1',  dim:'O', text:'If I must choose, I’ll pick style and layout over getting the lowest possible price.', rev:false }
      ];

  let answers={},idx=0,phase='intro',styleVsPrice=0;
  let timer=null,questionLeftMs=10000,lastTick=0,visualTouched=false;
  let returnFocus=null,oldOverflow='',locked=false,backdropDown=false;
  let reportController=null,reportRevision=0,lastBrief=null;
  function mmss(ms){const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function updateStatus(){
    clock.textContent=phase==='results'?'Done':mmss(phase==='intro'?Q.length*10000:(Q.length-idx-1)*10000+questionLeftMs);
    clock.setAttribute('aria-label',phase==='results'?'Quiz complete':'Time remaining');
    status.textContent=phase==='quiz'?`Question ${idx+1} of ${Q.length} · ${Math.max(0,Math.ceil(questionLeftMs/1000))} seconds left`:phase==='results'?'Quiz complete · Your results and buyer memo':`${Q.length} questions · 10 seconds each · About 3 minutes`;
    note.textContent=phase==='quiz'?'Closing the quiz pauses the timer. Reopen to continue.':phase==='results'?'Your answers and results stay here until you reload the page.':'The timer starts when you select Start Timed Quiz.';
  }
  function focusCard(selector){scroller.scrollTop=0;$(selector).focus({preventScroll:true});}
  function stopClock(){if(timer!==null) clearInterval(timer);timer=null;}
  function tick(){
    if(phase!=='quiz'||!dialog.open||document.hidden){pauseClock();return;}
    const now=performance.now();questionLeftMs=Math.max(0,questionLeftMs-(now-lastTick));lastTick=now;
    $('#qTopTimer').style.transform=`scaleX(${questionLeftMs/10000})`;updateStatus();
    if(questionLeftMs<=0) recordAnswer(Q[idx].type==='visual'&&visualTouched?Number($('#vSlider').value):null);
  }
  function pauseClock(){
    if(timer!==null){questionLeftMs=Math.max(0,questionLeftMs-(performance.now()-lastTick));stopClock();updateStatus();}
  }
  function resumeClock(){if(phase!=='quiz'||!dialog.open||document.hidden||timer!==null)return;lastTick=performance.now();timer=setInterval(tick,50);}
  function prefillFromFinancial(){
    const rsRoot=document.querySelector('#rs-shell');if(!rsRoot)return;
    for(const [target,selector] of [['firstName','.pf-fname'],['lastName','.pf-lname'],['budget','#h-price']]){
      const from=rsRoot.querySelector(selector),to=$('#'+target);
      let value=from?String(from.value??from.textContent??'').trim():'';
      if(target==='budget') value=value.replace(/[$,\s]/g,'');
      if(value&&!to.value)to.value=value;
    }
  }
  function startQuizFlow(){
    for(const input of $$('#profileCard input')) if(!input.checkValidity()){input.reportValidity();return;}
    stopClock();reportController?.abort();reportRevision++;
    answers={};idx=0;styleVsPrice=0;phase='quiz';lastBrief=null;
    $('#introCard').classList.add('hidden');$('#profileCard').classList.add('hidden');
    $('#quizCard').classList.remove('hidden');$('#resultsCard').classList.add('hidden');
    renderQuestion();
  }
  function renderQuestion(){
    stopClock();const q=Q[idx];questionLeftMs=10000;visualTouched=false;
    $('#qTitle').textContent=`Question ${idx+1} / ${Q.length}`;
    $('#qText').textContent=q.type==='visual'?'Where are you between these two options right now?':q.text;
    const visual=q.type==='visual';
    $('#visualArea').classList.toggle('hidden',!visual);$('#scaleBlock').classList.toggle('hidden',visual);
    $('#scaleLegend').hidden=visual;$('#confirmVisual').hidden=!visual;
    $('#quizHint').textContent=visual?'Move the slider or select a photo, then confirm. Your current choice is saved when time runs out. Skip records neutral (0).':'Select a number to answer and continue. No answer after 10 seconds, or Skip, records neutral (0).';
    if(visual){$('#vSlider').value='0';updateVisual();}
    else{
      const scale=$('#scaleBlock');scale.replaceChildren();
      for(let v=-5;v<=5;v++){
        const pill=document.createElement('button');pill.type='button';pill.className='pill';pill.textContent=v>0?'+'+v:String(v);pill.dataset.val=String(v);
        pill.setAttribute('aria-label',v===-5?'−5, strongly disagree':v===5?'+5, strongly agree':v===0?'0, neutral':String(v));
        pill.addEventListener('click',()=>recordAnswer(v));scale.append(pill);
      }
    }
    $('#qTopTimer').style.transform='scaleX(1)';updateStatus();focusCard('#qTitle');resumeClock();
  }
  function recordAnswer(value){
    if(phase!=='quiz'||!dialog.open)return;
    stopClock();const q=Q[idx];answers[q.id]=value===null?0:Number(value);
    if(q.type==='visual')styleVsPrice=answers[q.id];
    idx++;if(idx<Q.length)renderQuestion();else finishQuiz();
  }
  function updateVisual(){
    const value=Number($('#vSlider').value);
    const label=value<=-3?'Prefers Needs Fixes strongly (Option A)':value<0?'Leans Needs Fixes (Option A)':value===0?'Neutral':value<3?'Leans Brand New (Option B)':'Prefers Brand New strongly (Option B)';
    $('#vLabel').textContent=label;$('#vSlider').setAttribute('aria-valuetext',label);
  }
      function scoreAll(){
        const dims={O:[],C:[],E:[],A:[],N:[]};
        const qMap=Object.fromEntries(Q.map(q=>[q.id,q]));

        Q.forEach(q=>{
          if(q.type==='visual') return;
          let v=answers[q.id];
          if(v===undefined || v===null) v=0;
          if(q.rev) v=-v;
          const mapped=((v+5)*0.4)+1;
          if(dims[q.dim]) dims[q.dim].push(mapped);
        });

        const avg=a=>a.reduce((x,y)=>x+y,0)/a.length || 3;
        const S={
          O:+avg(dims.O).toFixed(2),
          C:+avg(dims.C).toFixed(2),
          E:+avg(dims.E).toFixed(2),
          A:+avg(dims.A).toFixed(2),
          N:+avg(dims.N).toFixed(2)
        };

        // bias Openness with visual slider
        const v = Number(styleVsPrice || 0);
        S.O = +(Math.max(1, Math.min(5, S.O + (v/12.5)))).toFixed(2);

        // consistency flags
        const flags=[];
        const handled=new Set();
        Q.forEach(q=>{
          if(q.ctrlPair && !handled.has(q.id)){
            const a=answers[q.id];
            const b=answers[q.ctrlPair];
            if(a!=null && b!=null){
              const aAdj=q.rev? -a:a;
              const bAdj=(qMap[q.ctrlPair].rev? -b:b);
              if(Math.abs(aAdj-bAdj)>=6){
                flags.push(`${q.id}/${q.ctrlPair}`);
              }
            }
            handled.add(q.id);
            handled.add(q.ctrlPair);
          }
        });

        return {scores:S, inconsistencies:flags};
      }

      const MBTI_BUYER_GUIDE = {
        ISTJ:"Stable, detail-first. Prefers proven neighborhoods, low-variance costs, and strong inspection records.",
        ISFJ:"Practical caretaker. Values safety, schools, and quiet streets; favors move-in-ready over projects.",
        INFJ:"Purpose-driven. Wants harmony and meaningful space; calm areas and quality renovations matter.",
        INTJ:"Planner/optimizer. Seeks value efficiency and long-term upside; ignores fluffy upgrades.",
        ISTP:"Hands-on problem-solver. Open to light projects if priced right; needs clear scope/timeline.",
        ISFP:"Aesthetic + comfort. Drawn to warm finishes, natural light, and cozy outdoor spots.",
        INFP:"Idealistic. Wants character and story; needs guardrails so budget doesn’t drift.",
        INTP:"Analytical. Structure/systems/future flexibility > staging glam.",
        ESTP:"Action-oriented. Loves lively areas and entertainment spaces; avoid payment creep.",
        ESFP:"Experience-first. Open layouts and social hubs; size payment first, then pick the fun.",
        ENFP:"Vision + people. Creative layouts, natural light; watch impulsive upgrades.",
        ENTP:"Options hunter. Wants flexibility/ADU potential; negotiate hard.",
        ESTJ:"Structured operator. Predictability, commute efficiency, and low-maintenance wins.",
        ESFJ:"Community anchor. Schools/parks close; turnkey > fixer to keep harmony.",
        ENFJ:"Connector. Hosting flow matters; choose move-in-ready to keep momentum.",
        ENTJ:"Decisive strategist. Location + resale math; newish or quality reno to avoid downtime."
      };

      function mbtiLabel(type){
        const map={
          ISTJ:"Inspector", ISFJ:"Protector", INFJ:"Sage", INTJ:"Architect",
          ISTP:"Crafter",   ISFP:"Artist",    INFP:"Idealist", INTP:"Analyst",
          ESTP:"Promoter",  ESFP:"Performer", ENFP:"Champion", ENTP:"Debater",
          ESTJ:"Executive", ESFJ:"Consul",    ENFJ:"Protagonist", ENTJ:"Commander"
        };
        return map[type] || "Persona";
      }

      function letterEI(E){ return E>=3.75 ? 'E' : (E<=3.25 ? 'I' : (E>=3.5?'E':'I')); }
      function letterSN(O){ return O>=3.75 ? 'N' : (O<=3.25 ? 'S' : (O>=3.5?'N':'S')); }
      function letterTF(A){ return A>=3.75 ? 'F' : (A<=3.25 ? 'T' : (A>=3.5?'F':'T')); }
      function letterJP(C){ return C>=3.75 ? 'J' : (C<=3.25 ? 'P' : (C>=3.5?'J':'P')); }

      function scoresToMBTI(S){
        const ei=letterEI(S.E),
              sn=letterSN(S.O),
              tf=letterTF(S.A),
              jp=letterJP(S.C);
        const type=`${ei}${sn}${tf}${jp}`;

        const dist=(v,hi=true)=> hi? Math.max(0,v-3.5)/1.5 : Math.max(0,3.5-v)/1.5;
        const parts=[
          ei==='E'?dist(S.E,true):dist(S.E,false),
          sn==='N'?dist(S.O,true):dist(S.O,false),
          tf==='F'?dist(S.A,true):dist(S.A,false),
          jp==='J'?dist(S.C,true):dist(S.C,false)
        ];
        const confidence=Math.max(0.35,
          +(parts.reduce((a,b)=>a+b,0)/4).toFixed(2)
        );

        return { type, confidence };
      }

      function finishQuiz(){
        $('#quizCard').classList.add('hidden');
        stopClock(); phase = 'results'; updateStatus();

        const {scores,inconsistencies} = scoreAll();

        $('#kO').textContent = scores.O.toFixed(2);
        $('#kC').textContent = scores.C.toFixed(2);
        $('#kE').textContent = scores.E.toFixed(2);
        $('#kA').textContent = scores.A.toFixed(2);
        $('#kN').textContent = scores.N.toFixed(2);

        // Archetype
        const arch=(function(s){
          const hi=v=>v>=4.0, lo=v=>v<=2.5;
          if(hi(s.O)&&hi(s.E)) return 'Visionary Host';
          if(hi(s.C)&&!hi(s.O)&&!hi(s.E)) return 'Steady Planner';
          if(hi(s.N)&&lo(s.E)) return 'Risk-Guarded Nest-Builder';
          if(hi(s.A)&&hi(s.C)) return 'Family-First Optimizer';
          if(hi(s.O)&&s.N<3.3) return 'Design-Forward Adventurer';
          return 'Balanced Explorer';
        })(scores);

        $('#archetype').textContent = `Archetype: ${arch}`;

        const mb = scoresToMBTI(scores);
        const blurb = MBTI_BUYER_GUIDE[mb.type]
          || "Personality informs your tradeoffs; we’ll size budget first, then match how you live.";

        $('#mbti').innerHTML =
          `MBTI: <b>${mb.type}</b> — ${mbtiLabel(mb.type)} ` +
          `<span style="opacity:.7">(${(mb.confidence*100).toFixed(0)}% match)</span><br>` +
          `<span style="color:var(--muted);font-weight:400;">${blurb}</span>`;

        $('#consistency').innerHTML = inconsistencies.length
          ? `<span class="flag">⚠ Consistency flags:</span> ${inconsistencies.join(', ')}`
          : `<span class="ok">✓ Responses appear consistent across rephrased items.</span>`;

        const brief = {
          version:'aiou.v3.timed',
          ts:new Date().toISOString(),
          profile:{
            firstName: $('#firstName').value.trim(),
            lastName:  $('#lastName').value.trim(),
            bedrooms:  Number($('#bedrooms').value||0),
            budgetMax: Number($('#budget').value||0),
            setting:   $('#setting').value,
            safetyPriority: Number($('#safety').value||3)
          },
          scores,
          archetype: arch,
          mbti: mb,
          psych:{
            totalItems: Q.length,
            inconsistencies
          },
          visual:{
            styleVsPriceSlider: Number(styleVsPrice ?? 0)
          }
        };

        // show result card NOW
        $('#resultsCard').classList.remove('hidden');

        // immediately generate memo and inject into #jsonReportBox
        lastBrief = brief; focusCard('#resultTitle'); sendToLLM(brief);
      }

  // Keep report formatting while omitting executable HTML returned by the server.
  function safeMemo(html){
    const parsed=new DOMParser().parseFromString(String(html),'text/html');
    const allowed=new Set('P BR STRONG B EM I U S UL OL LI H1 H2 H3 H4 H5 H6 BLOCKQUOTE HR DIV SPAN TABLE THEAD TBODY TR TH TD A PRE CODE'.split(' '));
    const drop=new Set('SCRIPT STYLE IFRAME OBJECT EMBED FORM INPUT BUTTON SELECT TEXTAREA SVG MATH LINK META BASE TEMPLATE IMG VIDEO AUDIO SOURCE'.split(' '));
    function copy(node){
      if(node.nodeType===3)return document.createTextNode(node.textContent);
      const fragment=document.createDocumentFragment();if(node.nodeType!==1||drop.has(node.tagName))return fragment;
      const target=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):fragment;
      if(node.tagName==='A'){
        try{const url=new URL(node.getAttribute('href')||'');if(['https:','http:','mailto:'].includes(url.protocol)){target.href=url.href;target.target='_blank';target.rel='noopener noreferrer';}}catch{}
      }
      for(const child of node.childNodes)target.append(copy(child));return target;
    }
    const fragment=document.createDocumentFragment();for(const child of parsed.body.childNodes)fragment.append(copy(child));return fragment;
  }
  async function sendToLLM(brief){
    reportController?.abort();const controller=new AbortController();reportController=controller;
    const revision=++reportRevision,box=$('#jsonReportBox');let timedOut=false;
    box.textContent='Generating your personalized memo…';$('#retryReport').hidden=true;box.setAttribute('aria-busy','true');
    const timeout=setTimeout(()=>{timedOut=true;controller.abort();},45000);
    try{
      const response=await fetch(dialog.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(brief),signal:controller.signal});
      if(!response.ok)throw new Error('Report service unavailable');
      const data=await response.json();if(revision!==reportRevision||phase!=='results')return;
      if(typeof data.memoHtml==='string'&&data.memoHtml.trim())box.replaceChildren(safeMemo(data.memoHtml));
      else if(typeof data.memo==='string'&&data.memo.trim())box.textContent=data.memo;
      else throw new Error('No memo returned');
      if(data.hydratedProfile){for(const key of ['firstName','lastName'])if(!$('#'+key).value&&typeof data.hydratedProfile[key]==='string')$('#'+key).value=data.hydratedProfile[key];}
    }catch(error){
      if(revision!==reportRevision||phase!=='results')return;
      box.textContent=timedOut?'Your memo took too long to load. Your quiz results are ready above. Select Retry memo to try again.':'Your quiz results are ready above, but the personalized memo could not load. Select Retry memo to try again.';
      $('#retryReport').hidden=false;
    }finally{clearTimeout(timeout);if(revision===reportRevision)box.removeAttribute('aria-busy');}
  }
  function showIntro(){
    stopClock();reportController?.abort();reportRevision++;phase='intro';
    $('#introCard').classList.remove('hidden');$('#profileCard').classList.remove('hidden');
    $('#quizCard').classList.add('hidden');$('#resultsCard').classList.add('hidden');updateStatus();focusCard('#startQuiz');
  }
  function open(){
    if(dialog.open)return;
    returnFocus=document.activeElement;oldOverflow=document.body.style.overflow;locked=true;
    document.body.style.overflow='hidden';dialog.showModal();trigger.setAttribute('aria-expanded','true');
    prefillFromFinancial();closeButton.focus({preventScroll:true});resumeClock();
  }
  function restore(){
    if(dialog.open||!locked)return;
    pauseClock();locked=false;document.body.style.overflow=oldOverflow;trigger.setAttribute('aria-expanded','false');
    (returnFocus?.isConnected?returnFocus:trigger).focus({preventScroll:true});
  }
  function close(){if(!dialog.open)return;pauseClock();dialog.close();restore();}
  trigger.addEventListener('click',open);closeButton.addEventListener('click',close);
  dialog.addEventListener('close',restore);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog&&outside(event);});
  dialog.addEventListener('click',event=>{if(backdropDown&&event.target===dialog&&outside(event))close();backdropDown=false;});
  document.addEventListener('visibilitychange',()=>document.hidden?pauseClock():resumeClock());
  $('#startQuiz').addEventListener('click',startQuizFlow);$('#reset').addEventListener('click',startQuizFlow);
  $('#skip').addEventListener('click',()=>recordAnswer(null));$('#confirmVisual').addEventListener('click',()=>recordAnswer(Number($('#vSlider').value)));
  $('#vSlider').addEventListener('input',()=>{visualTouched=true;updateVisual();});
  for(const [id,step] of [['vChoiceA',-1],['vChoiceB',1]])$('#'+id).addEventListener('click',()=>{const slider=$('#vSlider');slider.value=String(Math.max(-5,Math.min(5,Number(slider.value)+step)));visualTouched=true;updateVisual();});
  $('#retryReport').addEventListener('click',()=>{if(lastBrief)sendToLLM(lastBrief);});$('#retakeQuiz').addEventListener('click',showIntro);
  updateStatus();
  window.REPsych={open,close};
  window.PCSUAIOUQuiz=window.REPsych;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
