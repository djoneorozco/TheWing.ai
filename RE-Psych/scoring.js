/* Deterministic calculations. No model calls, imputation, normative cutoffs or composite buyer score. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.REPsychScore=factory();})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const valid=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  function scoreIPIP(answers,instrument){
    const items=instrument.items;
    const answered=items.filter(q=>own(answers,q.id)&&valid(answers[q.id],1,5)).length;
    if(answered!==items.length)return {complete:false,answered,total:items.length,sum:null,mean:null};
    const sum=items.reduce((n,q)=>n+(q.reverse?6-answers[q.id]:answers[q.id]),0);
    return {complete:true,answered,total:items.length,sum,mean:sum/items.length};
  }
  function scoreCFPB(answers,age,administration,instrument){
    const answered=instrument.items.filter(q=>own(answers,q.id)&&q.options.some(o=>o.value===answers[q.id])).length;
    const table=administration==='self'?instrument.lookup:administration==='other'?instrument.lookupOtherAdministered:null;
    const lookup=table && own(table,age)?table[age]:null;
    if(answered!==5||!lookup)return {complete:false,answered,total:5,raw:null,score:null,age:age||null,administration:administration||null};
    const raw=instrument.items.reduce((n,q)=>n+answers[q.id],0);
    return {complete:true,answered,total:5,raw,score:lookup[raw],age,administration};
  }
  function scoreKnowledge(answers,questions){
    const details=questions.map(q=>{const answer=answers[q.id];const answered=q.options.some(o=>o.value===answer);return {id:q.id,answered,correct:answered&&answer===q.correct,unsure:answer==='unsure',topic:q.topic,explanation:q.explanation,sourceUrl:q.sourceUrl};});
    return {answered:details.filter(x=>x.answered).length,correct:details.filter(x=>x.correct).length,unsure:details.filter(x=>x.unsure).length,total:questions.length,details};
  }
  function numberOrNull(value,max=100000000){
    if((typeof value!=='number'&&typeof value!=='string')||(typeof value==='string'&&value.trim()===''))return null;
    const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=max?n:null;
  }
  const currency=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(n);
  function compareProperty(housing,property){
    const out=[];
    const check=(key,label,limitValue,actualValue,direction,unit,max)=>{
      const limit=numberOrNull(limitValue,max),actual=numberOrNull(actualValue,max);
      if(limit===null||actual===null){out.push({key,status:'unknown',title:label,text:limit===null&&actual===null?'Add your limit and a property estimate to compare.':limit===null?'You have not set a personal limit for this item.':'The property estimate is still missing.'});return;}
      const conflict=direction==='max'?actual>limit:actual<limit;
      const fmt=n=>unit==='money'?currency(n):`${n} minutes`;
      out.push({key,status:conflict?'conflict':'fits',title:label,text:`Property: ${fmt(actual)}. Your ${direction==='max'?'maximum':'minimum'}: ${fmt(limit)}. ${conflict?'This conflicts with your stated limit.':'This is within your stated limit.'}`});
    };
    check('monthly','Monthly ownership cost',housing.maxMonthly,property.monthly,'max','money',1000000);
    check('commute','One-way commute',housing.maxCommute,property.commute,'max','minutes',1440);
    check('reserves','Savings remaining after purchase',housing.minReserves,property.reserves,'min','money',100000000);
    const ranks={none:0,minor:1,major:2};
    if(!own(ranks,housing.repairs)||!own(ranks,property.repairs))out.push({key:'repairs',status:'unknown',title:'Repair scope',text:'Confirm your project preference and the property’s repair scope. A listing description is not an inspection.'});
    else {const conflict=ranks[property.repairs]>ranks[housing.repairs];out.push({key:'repairs',status:conflict?'conflict':'fits',title:'Repair scope',text:conflict?'The stated repair scope exceeds the project level you said you would consider.':'The stated repair scope is within the project level you said you would consider. Confirm scope, costs, and available time.'});}
    return out;
  }
  function housingReflections(h){
    const p=h.priorities||[],out=[];
    if(p.includes('cost')&&h.costTradeoff==='space')out.push({title:'A cost–space tradeoff to revisit',text:'You selected manageable costs as a top priority and chose extra space for $300 more per month in the hypothetical exercise. Both can matter. Decide whether the extra space has a clear use that justifies the cost.'});
    if(p.includes('commute')&&h.commuteTradeoff==='larger')out.push({title:'A commute–space tradeoff to revisit',text:'You selected a shorter commute as a top priority, but chose the larger home with a 45-minute commute in the exercise. Picture an ordinary week and decide whether that is a compromise you would choose.'});
    if(p.includes('maintenance')&&h.repairs==='major')out.push({title:'Low maintenance and renovation plans',text:'You selected low maintenance as a top priority and said you would consider substantial renovations. Clarify whether you want low maintenance after a project, or low effort from the day you move in.'});
    if(h.horizon==='short')out.push({title:'A shorter ownership horizon',text:'You expect to stay less than three years. Compare the full costs and flexibility of buying and renting for your situation before committing. No break-even period is assumed here.'});
    if(h.costTradeoff==='unsure'||h.commuteTradeoff==='unsure')out.push({title:'More information may change your preference',text:'You asked for more information in a tradeoff exercise. Write down which missing facts would change your choice, then look for them when comparing real properties.'});
    return out;
  }
  return {scoreIPIP,scoreCFPB,scoreKnowledge,numberOrNull,compareProperty,housingReflections,currency};
});
