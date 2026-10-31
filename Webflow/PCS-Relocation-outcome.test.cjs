const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/PCS-Relocation-outcome.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const base={estimateMode:'starter-plan',currentBase:'Lackland AFB',destinationBase:'Davis-Monthan AFB',rank:'E-7',familySize:4,travelDate:'2026-11-05'};
async function mount(changes={},mutate=()=>{}){
 const {calculateStarterPlan}=await import('../netlify/functions/_share/pcs-starter-plan.js');
 const input={...base,...changes},result=calculateStarterPlan(input);mutate(result);
 const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{textContent:'',hidden:false,dataset:{apiUrl:'/api/pcs-move'},style:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}}]));
 const events={},document={readyState:'complete',getElementById:id=>{assert.ok(nodes.has(id),'Unknown element '+id);return nodes.get(id);}};
 const window={addEventListener:(name,fn)=>{events[name]=fn;},dispatchEvent(){}};
 vm.runInNewContext(code,{window,document,Intl,AbortController,CustomEvent:class{},setTimeout,clearTimeout,fetch:async()=>({ok:true,json:async()=>({ok:true,result})})});
 await events['pcsu:relocation-request']({detail:{requestId:'test',input,profileLabel:'E-7 · 4 people'}});
 // Event wrapper starts the async request; wait one task for the fetch/json promises.
 await new Promise(resolve=>setImmediate(resolve));
 const el=id=>nodes.get('ro-'+id),percent=id=>parseFloat(el('bar-'+id).style.width);
 return {el,percent,nodes,result,reset:()=>events['pcsu:relocation-reset']()};
}
test('unknown ages render accurate range and omit possible DLA from stacked bars',async()=>{
 const {el,percent}=await mount();
 assert.equal(el('total').textContent,'$416.45 – $823.70');assert.equal(el('badge').textContent,'Estimated surplus');
 assert.equal(el('included-total').textContent,'$1,566.89 – $1,974.14');assert.equal(el('comparison-cost').textContent,'$1,150.44');
 assert.equal(percent('dla'),0);assert.equal(el('dla').textContent,'Not included');assert.ok(el('dla-title').textContent.includes('$3,551.31'));
 assert.ok(Math.abs(percent('malt')+percent('perdiem')+percent('range')-100)<1e-9);assert.ok(percent('expenses')<100);assert.equal(el('range-key').hidden,false);
 assert.match(el('chart').attributes['aria-label'],/striped extension/);
});
test('known ages remove the striped range and preserve exact cents',async()=>{
 const {el,percent}=await mount({dependentsUnder12:2});assert.equal(el('total').textContent,'$552.20');assert.equal(el('included-total').textContent,'$1,702.64');assert.equal(percent('range'),0);assert.equal(el('range-key').hidden,true);assert.equal(el('range-note').hidden,true);
});
test('confirmed DLA participates in the same-scale stack',async()=>{
 const {el,percent}=await mount({mileageMode:'entered_authorized',distanceMiles:751,dependentsUnder12:2,dlaEligibility:'confirmed',dlaEffectiveDate:'2026-11-05',dlaRank:'E-7',dlaHasDependents:true,estimatedExpenses:0});
 assert.equal(el('included-total').textContent,'$5,221.05');assert.equal(el('dla').textContent,'$3,551.31');assert.ok(percent('dla')>0);assert.equal(percent('expenses'),0);assert.equal(el('chart-cost').textContent,'$0.00');
});
test('expenses exceeding all allowances set the scale and show a positive shortfall amount',async()=>{
 const {el,percent}=await mount({estimatedExpenses:30000});assert.equal(percent('expenses'),100);assert.equal(el('scale-max').textContent,'$30,000.00');assert.equal(el('badge').textContent,'Estimated shortfall');assert.equal(el('total').textContent,'$28,025.86 – $28,433.11');assert.ok(percent('malt')+percent('perdiem')+percent('range')<100);
});
test('range spanning zero never promises a surplus',async()=>{
 const {el}=await mount({estimatedExpenses:1700});assert.equal(el('badge').textContent,'Could go either way');assert.equal(el('total').textContent,'-$133.11 – $274.14');assert.match(el('net-context').textContent,/Negative amounts mean a shortfall/);
});
test('exact equality is break-even',async()=>{
 const {el}=await mount({dependentsUnder12:2,estimatedExpenses:1702.64});assert.equal(el('badge').textContent,'Estimated break-even');assert.equal(el('total').textContent,'$0.00');
});
test('excluded per diem has no bar or age uncertainty',async()=>{
 const {el,percent}=await mount({includePerDiem:false});assert.equal(el('perdiem').textContent,'Excluded');assert.equal(percent('perdiem'),0);assert.equal(percent('range'),0);assert.equal(el('range-key').hidden,true);
});
test('unsupported dates retain route and budget but hide the comparison',async()=>{
 const {el,nodes}=await mount({travelDate:'2027-01-05'});assert.equal(nodes.get('pcsu-relocation-card').dataset.state,'ready');assert.equal(el('comparison').hidden,true);assert.equal(el('badge').hidden,true);assert.equal(el('expenses').textContent,'$1,150.44');assert.equal(el('total').textContent,'Needs a little more detail');
});
test('invalid component or net data cannot create a misleading comparison',async()=>{
 for(const change of [r=>r.allowances.malt=NaN,r=>r.allowances.dla=500,r=>r.net.high=99999,r=>r.allowances.perDiemLow=-1]){
  const {nodes,el}=await mount({},change);assert.equal(nodes.get('pcsu-relocation-card').dataset.state,'error');assert.equal(el('result').hidden,true);
 }
});
test('reset hides old graph and returns to current-base prompt',async()=>{
 const {el,nodes,reset}=await mount();reset();assert.equal(nodes.get('pcsu-relocation-card').dataset.state,'idle');assert.equal(el('result').hidden,true);
});
