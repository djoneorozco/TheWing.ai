/* RE-Psych v2 controller: approved baseline modules, bounded probes, evidence brief. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const dialog=$('#pcsaiou-dialog'),host=$('#pcsaiou-host'),scroller=$('#pcsaiou-scroll');
const trigger=$('#pcsaiou-trigger'),closeButton=$('#pcsaiou-close');
const rules=window.REPsychRules,bank=window.REPsychBank;
if(!dialog||!rules||!bank)return;
document.body.append(dialog);
const titles=['Commute','Home tradeoff','Priorities','Condition','Features & upkeep','Household needs'];
const state={phase:'intro',step:1,baseline:{},answers:{},history:[],question:null,selected:null,remaining:10000,timed:true,lastTick:0,report:null};
let interval=null,returnFocus=null,oldOverflow='',locked=false,backdropDown=false;
const copy=v=>JSON.parse(JSON.stringify(v));
const make=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
function stopTimer(){clearInterval(interval);interval=null;}
function visibility(){dialog.scrollTop=0;document.dispatchEvent(new Event('repsych:visibility'));state.lastTick=performance.now();}
function focus(el){dialog.scrollTop=0;scroller.scrollTop=0;el?.setAttribute('tabindex','-1');el?.focus({preventScroll:true});}
function status(){
 $('#pcsaiou-status').textContent=state.phase==='baseline'?`Your home baseline · ${state.step} of 6`:state.phase==='followup'?`Tailored follow-up ${state.history.length+1} · up to 15`:state.phase==='results'?'Your home search brief':state.phase==='review'?'Baseline complete · Review your next step':'Six interactive baseline questions · Tailored follow-ups';
 $('#pcsaiou-clock').textContent=state.phase==='baseline'?String(state.step).padStart(2,'0')+' / 06':state.phase==='results'?'Ready':state.phase==='followup'?(state.selected?'Ready':!state.timed?'Untimed':state.remaining<=0?'Take your time':Math.ceil(state.remaining/1000)+'s'):'RE-Psych';
 $('#pcsaiou-note').textContent='Answers stay in this page session. Closing pauses the quiz.';
}
function panels(phase){
 stopTimer();state.phase=phase;
 for(const [id,key] of [['rp-intro','intro'],['rp-baselines','baseline'],['rp-baseline-nav','baseline'],['rp-baseline-actions','baseline'],['rp-followup-intro','review'],['rp-question','followup'],['rp-results','results']])$('#'+id).hidden=phase!==key;
 visibility();status();
}
function invalidateFollowups(){state.answers={};state.history=[];state.question=null;state.report=null;}
function nav(){
 $('#rp-baseline-nav').replaceChildren();titles.forEach((title,i)=>{const b=make('button',`${i+1}. ${title}`);b.type='button';b.disabled=i+1>state.step&&!state.baseline['q'+(i+1)];b.setAttribute('aria-current',i+1===state.step?'step':'false');b.addEventListener('click',()=>showBaseline(i+1));$('#rp-baseline-nav').append(b);});
 $('#rp-back').disabled=state.step===1;$('#rp-next').disabled=!state.baseline['q'+state.step];$('#rp-next').textContent=state.step===6?'Explore my tradeoffs →':'Continue →';
 // Unsaved modules have their own confirmation button, except Q4's single-choice step.
 $('#rp-next').hidden=state.step!==4&&!state.baseline['q'+state.step];
}
function showBaseline(step){
 state.step=step;panels('baseline');$$('[data-baseline-step]').forEach(n=>n.hidden=Number(n.dataset.baselineStep)!==step);nav();
 const heading=$(`[data-baseline-step="${step}"] h2`);focus(heading);visibility();
}
function review(){
 panels('review');const route=rules.route(state.baseline);$('#rp-route-preview').replaceChildren();route.slice(0,2).forEach(r=>$('#rp-route-preview').append(make('li',bank.groups.find(g=>g.id===r.id).label)));
 const issues=rules.conflicts(state.baseline);$('#rp-conflict-note').hidden=!issues.length;$('#rp-conflict-note').textContent=issues.map(x=>x.text).join(' ');
 focus($('#rp-followup-intro h2'));
}
for(let i=1;i<=6;i++){
 host.addEventListener(`repsych:q${i}:change`,()=>{delete state.baseline['q'+i];invalidateFollowups();if(state.phase==='baseline')nav();});
 host.addEventListener(`repsych:q${i}:confirmed`,event=>{
  const answer=copy(event.detail);if(JSON.stringify(state.baseline['q'+i])!==JSON.stringify(answer))invalidateFollowups();state.baseline['q'+i]=answer;
  if(state.phase==='baseline'&&state.step===i){nav();if(i!==4){if(i===6)review();else showBaseline(i+1);}}
 });
}
function visibleQuestion(){const b=$('#rp-question-title').getBoundingClientRect(),r=scroller.getBoundingClientRect();return dialog.open&&!document.hidden&&b.bottom>r.top&&b.top<r.bottom;}
function tick(){
 const now=performance.now();if(state.phase==='followup'&&state.timed&&!state.selected&&visibleQuestion())state.remaining=Math.max(0,state.remaining-(now-state.lastTick));state.lastTick=now;
 $('#rp-time-fill').style.transform=`scaleX(${state.timed?state.remaining/10000:1})`;
 $('#rp-timer-note').textContent=state.selected?'Your answer is selected. Confirm when ready.':!state.timed?'Take the time you need.':state.remaining<=0?'The countdown is finished. You can keep choosing; no answer has been assumed.':'Choose the answer that fits. You can keep choosing after 10 seconds.';status();
}
// Reverse comparison presentation once per session; paired scenarios keep the same order.
const reverseComparisons=Math.random()<.5;
function renderQuestion(q){
 panels('followup');state.question=q;state.selected=null;state.remaining=10000;
 $('#rp-question-label').textContent=`Q${q.id.slice(1)} / ${bank.groups.find(g=>g.id===q.domain).label}`;
 $('#rp-question-title').textContent=q.text;$('#rp-question-context').textContent=q.context||'Choose the response that fits your experience. You can leave this open if you’re unsure.';
 $('#rp-options').replaceChildren();let options=q.options.slice();if(q.kind==='comparison'&&reverseComparisons)options=[options[1],options[0],...options.slice(2)];
 options.forEach(o=>{const b=make('button',o.label,'rp-option');b.type='button';b.dataset.choice=o.id;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{tick();state.selected=o.id;$$('#rp-options button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));$('#rp-confirm').disabled=false;tick();});$('#rp-options').append(b);});
 $('#rp-confirm').disabled=true;$('#rp-previous-question').disabled=!state.history.length;$('#rp-timer-toggle').textContent=state.timed?'Turn off timer':'Turn on timer';$('#rp-timer-toggle').setAttribute('aria-pressed',String(!state.timed));
 focus($('#rp-question-title'));state.lastTick=performance.now();tick();interval=setInterval(tick,100);
}
function continueQuestions(){const q=rules.next(state.baseline,state.answers);if(q)renderQuestion(q);else results(false);}
function record(skipped=false){
 if(state.phase!=='followup'||(!skipped&&!state.selected))return;
 tick();const q=state.question;state.answers[q.id]={questionId:q.id,domain:q.domain,kind:q.kind,choice:skipped?null:state.selected,status:skipped?'skipped':'answered',scenario:q.scenario||null,timing:{enabled:state.timed,expired:state.remaining===0,usedForScoring:false}};state.history.push(q.id);continueQuestions();
}
function previousAnswer(){const id=state.history.pop();if(!id)return;delete state.answers[id];renderQuestion(rules.materialize(id,state.baseline));}
function addSection(title,lines){const section=make('section',undefined,'rp-result-section');section.append(make('h3',title));const ul=make('ul');lines.filter(Boolean).forEach(line=>ul.append(make('li',line)));section.append(ul);$('#rp-result-content').append(section);}
function baselineLines(){
 const b=state.baseline,lines=[];if(b.q1){lines.push(`Comfortable commute: ${b.q1.selectedCommuteMinutes} minutes one way (illustrative preference, not a firm cap).`);if(b.q1.reasons.length)lines.push('Commute reasons: '+b.q1.reasons.map(r=>r.id==='other'?b.q1.otherReason:r.label).join('; ')+'.');}
 if(b.q2){const h=b.q2.selectedHome;lines.push(h?`Home example ${h.id}: ${h.bedrooms} bedrooms, ${h.squareFeet.toLocaleString()} sq ft; ${h.yard.toLowerCase()}; ${h.condition.toLowerCase()}. The locked $300,000 price is an exercise, not your budget.`:'None of the five example homes fit your needs.');if(b.q2.reasons.length)lines.push((h?'Home-choice reasons: ':'Unmet needs in the examples: ')+b.q2.reasons.map(r=>r.id==='other'?b.q2.otherReason:r.label).join('; ')+'.');}
 if(b.q3)lines.push('Priority order: '+b.q3.ranking.map(r=>r.label).join(' → ')+'. Ranking does not measure how much you would sacrifice.');
 if(b.q4)lines.push('Condition: '+(b.q4.selectedCondition?.label||'Still needs more information')+'. Project willingness does not verify time, cost, or capability.');
 const f=b.q5;if(f?.features.length)f.features.forEach(x=>lines.push(x.label+': '+(x.upkeep?.label||x.intendedUse?.description||(x.intendedUse?.status==='unsure'?'Intended use still unsure':x.intendedUse?.uses?.map(u=>u.id==='other'?x.intendedUse.otherText:u.label).join(', ')))+'.'));else if(f)lines.push(f.selectionStatus==='unsure'?'Feature needs are still unsure.':'None of the listed features was selected. This does not establish dislike.');
 return lines;
}
function requirementLines(){
 const q=state.baseline.q6,b=q.space.bedrooms,r=q.space.additionalRooms,a=q.access,m=q.moveIn,h=q.limits.monthlyHousing,c=q.limits.commute;
 return [b.status==='fixed'?`Minimum bedrooms: ${b.minimum===0?'a studio can work':b.minimum}.`:b.status==='unsure'?'Bedroom minimum: still unsure.':'No fixed bedroom minimum.',r.status==='required'?`Additional enclosed rooms: ${r.count}, for ${r.purpose}.`:r.status==='unsure'?'Additional room needs: still unsure.':'No additional enclosed rooms required.',a.status==='required'?'Required access/layout: '+a.requirements.map(x=>x.id==='other'?a.other:x.label).join('; ')+'.':a.status==='unsure'?'Access/layout requirements: still unsure.':'No specific access/layout requirement stated.',m.status==='ready'?'Home must be usable on move-in day.':m.status==='wait'?`Work may happen first. ${m.wait.status==='fixed'?'Maximum wait: '+m.wait.maximumWeeks+' weeks.':m.wait.status==='unsure'?'Maximum wait still unsure.':'No firm wait maximum.'}`:m.status==='unsure'?'Move-in readiness: still unsure.':'No firm move-in timing requirement.',h.status==='fixed'?`Stated all-in monthly housing cap: ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(h.amount)}. This is self-reported, not an affordability finding.`:h.status==='unsure'?'Monthly housing cap: still unsure.':'No firm monthly housing cap set.',c.status==='fixed'?`Firm one-way commute cap: ${c.maximumMinutes} minutes, including usual traffic and gate delays.`:c.status==='unsure'?'Firm commute cap: still unsure.':'No firm commute cap set.'];
}
function results(early){
 panels('results');state.report=rules.summarize(state.baseline,state.answers,early);const report=state.report;
 $('#rp-coverage').textContent=`Six baseline modules completed · ${report.coverage.followupsReviewed} follow-ups reviewed, ${report.coverage.followupsAnswered} answered. ${early?'You finished early; unexplored choices remain open.':'The selected comparisons are complete; unresolved choices remain open.'}`;
 $('#rp-result-content').replaceChildren();addSection('Protect these household requirements',requirementLines());addSection('What you told us',baselineLines());
 if(report.reviewBeforeSearching.length)addSection('Resolve these before narrowing your search',report.reviewBeforeSearching.map(x=>x.text));
 report.evidence.forEach(e=>{addSection(e.label,[e.summary,'Evidence: '+e.questionIds.map(id=>id.toUpperCase()).join(', ')+(e.status==='supported-in-exercise'?'. Supported by your choices in these exercises.':'. Needs clarification; this is not a personality inconsistency score.')]);const g=bank.groups.find(x=>x.id===e.domain),context=[g.first,g.first+1].map(n=>'q'+n).filter(id=>state.answers[id]?.choice);if(context.length)addSection('More context for '+e.label.toLowerCase(),context.map(id=>{const q=bank.questions.find(x=>x.id===id);return q.text+' — '+q.options.find(o=>o.id===state.answers[id].choice)?.label;}));});
 if(report.unexploredDomains.length)addSection('Not tested in this session',report.unexploredDomains.map(g=>g.label+' — no conclusion drawn.'));
 addSection('Use this brief when comparing real homes',['Start with your household requirements, then compare your preferences among homes that meet them.','Check actual one-way routes at the times you travel, inspection findings, project scope, and all-in housing and upkeep costs.','Revisit any unresolved preference with specific property details; these exercises do not choose a home for you.']);focus($('#rp-result-title'));
 host.dispatchEvent(new CustomEvent('repsych:completed',{bubbles:true,detail:copy(report)}));
}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function open(){if(dialog.open)return;returnFocus=document.activeElement;oldOverflow=document.body.style.overflow;locked=true;document.body.style.overflow='hidden';dialog.showModal();trigger.setAttribute('aria-expanded','true');closeButton.focus({preventScroll:true});visibility();}
function restore(){if(dialog.open||!locked)return;locked=false;document.body.style.overflow=oldOverflow;trigger.setAttribute('aria-expanded','false');visibility();(returnFocus?.isConnected?returnFocus:trigger).focus({preventScroll:true});}
function close(){if(!dialog.open)return;dialog.close();restore();}
trigger.addEventListener('click',open);closeButton.addEventListener('click',close);dialog.addEventListener('close',restore);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
dialog.addEventListener('pointerdown',e=>backdropDown=e.target===dialog&&outside(e));dialog.addEventListener('click',e=>{if(backdropDown&&e.target===dialog&&outside(e))close();backdropDown=false;});document.addEventListener('visibilitychange',visibility);
$('#rp-start').addEventListener('click',()=>showBaseline(1));$('#rp-back').addEventListener('click',()=>showBaseline(Math.max(1,state.step-1)));$('#rp-next').addEventListener('click',()=>{if(!state.baseline['q'+state.step])return;state.step===6?review():showBaseline(state.step+1);});
$('#rp-edit-baseline').addEventListener('click',()=>showBaseline(1));$('#rp-edit-results').addEventListener('click',()=>showBaseline(1));$('#rp-begin-followups').addEventListener('click',()=>{invalidateFollowups();continueQuestions();});
$('#rp-confirm').addEventListener('click',()=>record());$('#rp-skip').addEventListener('click',()=>record(true));$('#rp-previous-question').addEventListener('click',previousAnswer);$('#rp-finish-early').addEventListener('click',()=>results(true));
$('#rp-timer-toggle').addEventListener('click',()=>{tick();state.timed=!state.timed;$('#rp-timer-toggle').textContent=state.timed?'Turn off timer':'Turn on timer';$('#rp-timer-toggle').setAttribute('aria-pressed',String(!state.timed));tick();});
$('#rp-download').addEventListener('click',()=>download('RE-Psych / Your home search brief\n\n'+$('#rp-coverage').textContent+'\n\n'+$('#rp-result-content').innerText+'\n\n'+state.report.interpretation,'RE-Psych-home-brief.txt','text/plain;charset=utf-8'));
$('#rp-download-data').addEventListener('click',()=>download(JSON.stringify(state.report,null,2),'RE-Psych-answers.json','application/json'));
$('#rp-restart').addEventListener('click',()=>$('#rp-restart-confirm').hidden=false);$('#rp-restart-no').addEventListener('click',()=>$('#rp-restart-confirm').hidden=true);$('#rp-restart-yes').addEventListener('click',()=>window.location.reload());
// Existing Webflow API names remain; exports are copies, never writable controller state.
window.REPsych={open,close,getReport:()=>state.report?copy(state.report):null};window.PCSUAIOUQuiz=window.REPsych;
status();
})();

/* Preserve Webflow v1 origin-checked ready / visibility / close handshake. */
(function () {
  'use strict';

  function connectWebflow() {
    const params = new URLSearchParams(window.location.search);
    if (window.parent === window || params.get('embed') !== '1') return;
    if (window.__RE_PSYCH_EMBED_READY__) return;

    let parentOrigin;
    try {
      const supplied = new URL(params.get('parentOrigin'));
      if (!['https:', 'http:'].includes(supplied.protocol)) return;
      parentOrigin = supplied.origin;
      if (document.referrer && new URL(document.referrer).origin !== parentOrigin) return;
    } catch {
      return;
    }

    const api = window.REPsych || window.PCSUAIOUQuiz;
    const dialog = document.getElementById('pcsaiou-dialog');
    if (!api || !dialog) return;
    window.__RE_PSYCH_EMBED_READY__ = true;

    document.documentElement.classList.add('repsych-embedded');
    const style = document.createElement('style');
    style.textContent = `
      html.repsych-embedded,
      html.repsych-embedded body {
        width:100%; height:100%; margin:0; overflow:hidden;
        background:#fcfbf8;
      }
      html.repsych-embedded .site-header,
      html.repsych-embedded .page-shell { display:none!important; }
      html.repsych-embedded #pcsaiou-dialog {
        inset:0!important; margin:0!important;
        width:100%!important; height:100dvh!important;
        max-width:none!important; max-height:none!important;
        border:0!important; border-radius:0!important;
        box-shadow:none!important;
      }
      html.repsych-embedded #pcsaiou-dialog::backdrop {
        background:transparent; backdrop-filter:none;
      }
    `;
    document.head.append(style);

    let hostOpen = false;
    const notify = type => window.parent.postMessage({
      source:'re-psych', version:1, type
    }, parentOrigin);

    window.addEventListener('message', event => {
      const data = event.data;
      if (event.source !== window.parent || event.origin !== parentOrigin) return;
      if (!data || data.source !== 're-psych-host' || data.version !== 1) return;
      if (data.type !== 'visibility' || typeof data.visible !== 'boolean') return;
      hostOpen = data.visible;
      if (hostOpen) api.open();
      else api.close();
    });

    dialog.addEventListener('close', () => {
      if (!hostOpen || dialog.open) return;
      hostOpen = false;
      notify('close');
    });

    notify('ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connectWebflow, {once:true});
  } else {
    connectWebflow();
  }
})();
