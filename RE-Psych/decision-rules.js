/* Auditable questionnaire routing and evidence summaries; no psychometric or affordability score. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./question-bank.js'));else root.REPsychRules=factory(root.REPsychBank);})(typeof window==='undefined'?globalThis:window,function(bank){
'use strict';
const MAX_FOLLOWUPS=15, clone=v=>JSON.parse(JSON.stringify(v));
const byId=id=>bank.questions.find(q=>q.id===id);
const reasonIds=q=>(q?.reasons||[]).map(r=>r.id);
function route(b){
 const scores=Object.fromEntries(bank.groups.map(g=>[g.id,0])),why=Object.fromEntries(bank.groups.map(g=>[g.id,[]]));
 const add=(d,n,t)=>{scores[d]+=n;why[d].push(t);};
 (b.q3?.ranking||[]).forEach((r,i)=>{const n=[6,4,2,1][i]||0;for(const d of ({travel:['travel'],space:['travel','layout'],payment:['money'],condition:['condition']}[r.id]||[]))add(d,n,'Q3: '+r.label+' ranked '+(i+1));});
 reasonIds(b.q1).forEach(id=>{if(['less_driving','indoor_space','city_convenience'].includes(id))add('travel',2,'Q1: '+id);if(['outdoor_space','quiet_privacy'].includes(id))add('outdoors',2,'Q1: '+id);if(id==='housing_cost')add('money',2,'Q1: housing cost');});
 // None-fit reasons are unmet needs, never positive evidence for a home preference.
 reasonIds(b.q2).forEach(id=>{const d={household_bedrooms:'travel',indoor_space:'travel',outdoor_living:'outdoors',finishes_design:'money',little_updating:'condition',dated_finish_acceptance:'condition'}[id];if(d)add(d,2,'Q2: '+(b.q2?.reasonContext==='unmet-needs'?'unmet need: ':'reason: ')+id);});
 (b.q5?.features||[]).forEach(f=>{const d=['backyard','pool','patio'].includes(f.id)?'outdoors':'layout';add(d,3,'Q5: '+f.label);if(f.upkeep?.choice==='paid-help')add('control',5,'Q5: arranging upkeep help');if(['less-upkeep','unsure'].includes(f.upkeep?.choice))add('outdoors',3,'Q5: upkeep needs exploration');});
 if(b.q4?.selectionStatus==='needs-information')add('condition',5,'Q4: condition remains uncertain');
 if(b.q6?.space?.additionalRooms?.status==='required')add('layout',3,'Q6: additional rooms required');
 const cap=b.q6?.limits?.commute;
 const housing=b.q6?.limits?.monthlyHousing;
 const eligible=bank.groups.filter(g=>(g.id!=='travel'||cap?.status!=='fixed'||cap.maximumMinutes>=5)&&(g.id!=='money'||housing?.status!=='fixed'||housing.amount>=300));
 if(!scores.travel&&!scores.money&&!scores.layout&&!scores.condition){add('travel',1,'Explore an everyday tradeoff');add('money',1,'Explore an everyday tradeoff');}
 return eligible.map(g=>({id:g.id,priority:scores[g.id],reasons:why[g.id]})).sort((a,b)=>b.priority-a.priority||bank.groups.findIndex(g=>g.id===a.id)-bank.groups.findIndex(g=>g.id===b.id));
}
function evidence(domain,answers){
 const g=bank.groups.find(x=>x.id===domain),a=answers['q'+(g.first+2)]?.choice,b=answers['q'+(g.first+3)]?.choice,c=answers['q'+(g.first+4)]?.choice;
 const pattern=a==='A'&&b==='A'?'A':a==='B'&&b==='B'?'B':((domain==='control'&&a==='A'&&b==='B')||(domain!=='control'&&a==='B'&&b==='A'))?'conditional':null;
 const agrees=pattern&&(c===(pattern==='conditional'?'C':pattern));
 return {domain,label:g.label,status:agrees?'supported-in-exercise':'needs-clarification',pattern:pattern||'unresolved',summary:agrees?g.findings[pattern]:'Your comparisons and search guidance do not yet establish one clear preference. Keep this open when reviewing real homes.',questionIds:[g.first+2,g.first+3,g.first+4].map(n=>'q'+n),responses:{first:a||null,second:b||null,confirmation:c||null}};
}
function next(b,answers){
 const count=Object.keys(answers).length;if(count>=MAX_FOLLOWUPS)return null;
 const ranked=route(b);
 for(let i=0;i<Math.min(3,ranked.length);i++){
  if(i===2){const earlier=ranked.slice(0,2).map(r=>evidence(r.id,answers));if(earlier.every(e=>e.status==='supported-in-exercise')||ranked[i].priority<3)return null;}
  const g=bank.groups.find(x=>x.id===ranked[i].id);
  // Always test the original and changed circumstance, then explicit search guidance.
  for(const offset of [2,3,4]){const id='q'+(g.first+offset);if(!answers[id])return materialize(id,b);}
  if(evidence(g.id,answers).status!=='supported-in-exercise'){
   for(const offset of [0,1]){const id='q'+(g.first+offset);if(!answers[id])return materialize(id,b);}
  }
 }
 return null;
}
function materialize(id,b){
 const source=byId(id);if(!source)return null;const q=clone(source);
 if(q.domain==='travel'){
  const cap=b.q6?.limits?.commute,long=cap?.status==='fixed'?Math.min(40,cap.maximumMinutes):40,short=Math.min(15,Math.max(0,long-10));
  q.options.forEach(o=>o.label=o.label.replace('{long}',long).replace('{short}',short));q.scenario={longMinutes:long,shortMinutes:short};
  q.context+=' '+(cap?.status==='fixed'?'Both are within your stated '+cap.maximumMinutes+'-minute cap.':'You have not confirmed a firm commute cap; these choices will not set one.');
 }
 if(q.domain==='money'&&b.q6?.limits?.monthlyHousing?.status!=='fixed')q.context+=' You have not set an actual housing cap; record a preference only and establish that limit separately.';
 return q;
}
function conflicts(b){
 const list=[],q6=b.q6||{},cap=q6.limits?.commute,bed=q6.space?.bedrooms;
 if(cap?.status==='fixed'&&b.q1?.selectedCommuteMinutes>cap.maximumMinutes)list.push({id:'commute',text:'Your Q1 comfortable zone exceeds your Q6 firm commute limit. Keep the firm limit; review the zone before searching.'});
 if(bed?.status==='fixed'&&b.q2?.selectedHome&&b.q2.selectedHome.bedrooms<bed.minimum)list.push({id:'bedrooms',text:'Your chosen example home has fewer bedrooms than your Q6 minimum. Use it only as a preference example; it is not a household fit.'});
 if(q6.moveIn?.status==='ready'&&b.q4?.maxAcceptedWorkLevel>=2)list.push({id:'readiness',text:'You are open to projects but need a usable home on move-in day. Confirm that essential rooms remain usable or that work finishes before your move.'});
 (b.q5?.features||[]).filter(f=>f.upkeep?.choice==='less-upkeep').forEach(f=>list.push({id:'upkeep-'+f.id,text:f.label+' appeals to you, but you prefer less upkeep. Check the actual care plan and ongoing costs before treating it as a requirement.'}));
 return list;
}
function summarize(b,answers,stoppedEarly=false){
 const ranked=route(b),tested=ranked.filter(r=>bank.groups.find(g=>g.id===r.id)&&answers['q'+(bank.groups.find(g=>g.id===r.id).first+2)]).map(r=>({...evidence(r.id,answers),routingReasons:r.reasons}));
 const q6=b.q6||{},review=conflicts(b);
 const travel=tested.find(e=>e.domain==='travel');
 if(travel?.status==='supported-in-exercise'&&travel.pattern==='A'&&b.q3?.ranking?.[0]?.id==='travel')review.push({id:'travel-priority',text:'Travel ranked first in Q3, but you chose extra space in both journey comparisons. Revisit how much additional travel that space is worth in your real week; your firm commute cap still applies.'});
 const condition=tested.find(e=>e.domain==='condition');
 if(condition?.status==='supported-in-exercise'&&condition.pattern==='A'&&b.q4?.maxAcceptedWorkLevel===0)review.push({id:'condition-preference',text:'Q4 favored a ready home, but you accepted cosmetic disruption for extra useful space in the comparisons. Clarify this change before considering projects; your move-in and access requirements remain protected.'});
 const money=tested.find(e=>e.domain==='money');
 if(money?.status==='supported-in-exercise'&&money.pattern==='A'&&b.q3?.ranking?.[0]?.id==='payment')review.push({id:'payment-priority',text:'Monthly payment ranked first, but you chose optional upgrades at both tested premiums. Identify which specific features justify that difference while keeping your actual housing cap.'});
 return {version:'repsych.home-baseline.v2',createdAt:new Date().toISOString(),baseline:clone(b),followups:clone(answers),routing:ranked,
 evidence:tested,unexploredDomains:bank.groups.filter(g=>!tested.some(e=>e.domain===g.id)).map(g=>({id:g.id,label:g.label})),
 protectedRequirements:clone(q6),reviewBeforeSearching:review,clarify:clone(q6.clarify||[]),
 coverage:{baselineCompleted:Object.keys(b).length,followupsReviewed:Object.keys(answers).length,followupsAnswered:Object.values(answers).filter(a=>a.status==='answered'&&a.choice!==null).length,maximumFollowups:MAX_FOLLOWUPS,stopReason:stoppedEarly?'user-finished-early':Object.keys(answers).length>=MAX_FOLLOWUPS?'question-limit':'selected-domains-reviewed'},
 interpretation:'Authored preference exercises, not a validated personality assessment, affordability calculation, or property recommendation. Unasked and unresolved preferences remain unknown.'};
}
return {MAX_FOLLOWUPS,route,evidence,next,materialize,conflicts,summarize};
});
