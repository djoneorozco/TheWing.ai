const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/pcs-calculator.js','utf8');
function setup(){
  const els=Object.fromEntries(Object.entries({currentBase:'Lackland AFB',gainingBase:'Davis-Monthan AFB',distance:'1000',distanceSource:'entered_authorized',paygrade:'E-7',dependents:'With dependents',povs:'1 POV',weight:'9000',expenses:'1200'}).map(([key,value])=>[key,{value}]));
  const context=vm.createContext({els});
  vm.runInContext(source.slice(source.indexOf('    function money0'),source.indexOf('    //#6) INSIGHTS')),context);
  return context;
}
test('recalculation preserves manually entered authorized mileage and provenance',()=>{
  const c=setup();const r=vm.runInContext('readInputs()',c);
  assert.equal(r.distanceMiles,1000);assert.equal(r.distanceSource,'entered_authorized');
  c.els.expenses.value='1500';assert.equal(vm.runInContext('readInputs().distanceMiles',c),1000);
});
test('changing route invalidates previous authorization and recomputes only an estimate',()=>{
  const c=setup();vm.runInContext('syncDistanceFromBases()',c);
  assert.equal(c.els.distanceSource.value,'estimated_base_to_base');assert.equal(c.els.distance.value,'891');
});
test('same-base and unknown routes clear previous mileage',()=>{
  for(const destination of ['Lackland AFB','Unknown installation','']){
    const c=setup();c.els.gainingBase.value=destination;vm.runInContext('syncDistanceFromBases()',c);
    assert.equal(c.els.distance.value,'');
  }
});
