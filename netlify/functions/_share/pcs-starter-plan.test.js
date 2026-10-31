import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {calculateStarterPlan} from './pcs-starter-plan.js';
import {PCS_BASE_COORDINATES} from './pcs-base-coordinates.js';
import {handler} from '../pcs-move.js';
const input={estimateMode:'starter-plan',currentBase:'Lackland AFB',destinationBase:'Davis-Monthan AFB',rank:'E-7',familySize:4,travelDate:'2026-11-05'};
const run=change=>calculateStarterPlan({...input,...change});

test('one new base selection yields a transparent starting plan',()=>{
 const r=run();assert.equal(r.route.miles,891);assert.equal(r.route.estimatedTravelDays,3);
 assert.equal(r.budget.nights,2);assert.deepEqual([r.budget.fuel,r.budget.lodging,r.budget.meals,r.budget.cushion,r.budget.total],[160.38,300,540,150.06,1150.44]);
 assert.equal(r.allowances.low,1566.89);assert.equal(r.allowances.high,1974.14);
 assert.equal(r.dla.included,false);assert.equal(r.dla.possibleAmount,3551.31);
 assert.match(r.route.method,/not a mapped driving route/);
});
test('age mix narrows range without asking family size twice',()=>{
 const r=run({dependentsUnder12:2});assert.equal(r.travelers.count,4);
 assert.equal(r.allowances.low,1702.64);assert.equal(r.allowances.high,1702.64);assert.equal(r.allowances.perDiemLow,1493.25);
});
test('single traveler needs no age question and has a single allowance estimate',()=>{
 const r=run({familySize:1});assert.equal(r.travelers.ageMixKnown,true);assert.equal(r.allowances.low,r.allowances.high);
 assert.equal(r.allowances.perDiemLow,543);assert.equal(r.budget.meals,135);
});
test('travelers override and rooms preserve user changes',()=>{
 const r=run({familySize:8,travelers:2,rooms:3,dependentsUnder12:0});assert.equal(r.travelers.count,2);assert.equal(r.budget.lodging,900);
 assert.equal(run({familySize:5}).budget.assumptions.rooms,2);
});
test('two vehicles double fuel and MALT, not food or per diem',()=>{
 const a=run(),b=run({povs:2});assert.equal(b.budget.fuel,a.budget.fuel*2);assert.equal(b.allowances.malt,418.78); // Official module rounds each vehicle before summing.
 assert.equal(b.budget.meals,a.budget.meals);assert.equal(b.allowances.perDiemLow,a.allowances.perDiemLow);
});
test('longer trips raise expenses while allowance days stay capped',()=>{
 const r=run({plannedDrivingDays:5});assert.equal(r.route.estimatedTravelDays,5);assert.equal(r.route.allowanceDays,3);assert.equal(r.budget.nights,4);
 assert.equal(r.allowances.usedTravelDays,3);assert.equal(r.budget.meals,900);
});
test('shorter trips reduce per diem and nights',()=>{
 const r=run({plannedDrivingDays:1});assert.equal(r.budget.lodging,0);assert.equal(r.allowances.usedTravelDays,1);
});
test('manual mileage is not replaced; provenance stays explicit',()=>{
 const r=run({mileageMode:'entered_authorized',distanceMiles:751});assert.equal(r.route.miles,751);assert.equal(r.route.source,'entered_authorized');assert.equal(r.route.automaticMiles,891);
 assert.equal(r.allowances.malt,176.49);assert.equal(run({mileageMode:'estimated_driving',distanceMiles:1000}).route.miles,1000);
});
test('expense overrides support zero and keep the calculated breakdown',()=>{
 const r=run({estimatedExpenses:0});assert.equal(r.budget.total,0);assert.equal(r.budget.calculatedTotal,1150.44);assert.equal(r.budget.source,'user_entered');assert.equal(r.net.low,r.allowances.low);
});
test('all spending knobs enter the budget deterministically',()=>{
 const r=run({mileageMode:'estimated_driving',distanceMiles:1000,mpg:20,fuelPrice:4,hotelRate:100,rooms:2,foodPerPerson:30,cushionPercent:10,extraCosts:40});
 assert.equal(r.budget.fuel,200);assert.equal(r.budget.lodging,400);assert.equal(r.budget.meals,360);assert.equal(r.budget.total,1100);
});
test('confirmed DLA uses its independent order-effective profile',()=>{
 const r=run({dlaEligibility:'confirmed',dlaEffectiveDate:'2026-10-20',dlaRank:'E-5',dlaHasDependents:false});
 assert.equal(r.dla.included,true);assert.equal(r.allowances.dla,2389.42);assert.equal(r.allowances.low,3956.31);
});
test('incomplete DLA confirmation preserves route and budget without invented allowance',()=>{
 const r=run({dlaEligibility:'confirmed'});assert.equal(r.allowances,null);assert.ok(r.budget.total>0);assert.match(r.allowanceIssue,/order effective date/);
});
test('separate travel returns budget but does not guess combined allowances',()=>{
 const r=run({travelersTogether:false});assert.equal(r.allowances,null);assert.match(r.allowanceIssue,/Separate traveler/);assert.equal(r.budget.total,1150.44);
});
test('per diem exclusion remains available',()=>{
 const r=run({includePerDiem:false});assert.equal(r.allowances.low,209.39);assert.equal(r.allowances.high,209.39);assert.equal(r.allowances.perDiemIncluded,false);
});
test('date-sensitive rates remain current for the selected date',()=>{
 for(const [travelDate,rate,fy] of [['2026-06-01',.205,2026],['2026-07-01',.235,2026],['2026-10-01',.235,2027]]){
 const r=run({travelDate});assert.equal(r.allowances.maltRate,rate);assert.equal(r.allowances.perDiemFiscalYear,fy);}
});
test('unsupported dates and rate-boundary trips retain only supported budget',()=>{
 for(const date of ['2027-02-01','2026-02-30','2026-09-30','2026-12-31']){
 const r=run({travelDate:date});assert.equal(r.allowances,null,date);assert.ok(r.allowanceIssue);assert.ok(r.budget.total>0);}
});
test('invalid inputs cannot silently turn into defaults or fabricated routes',()=>{
 for(const change of [{currentBase:'unknown'},{destinationBase:'Lackland AFB'},{currentBase:'Elmendorf AFB'},{destinationBase:'Elmendorf AFB'},{familySize:0},{familySize:'4'},{travelers:0},{povs:3},{dependentsUnder12:4},{mpg:0},{fuelPrice:-1},{cushionPercent:NaN},{mileageMode:'official'},{mileageMode:'entered_authorized'},{mileageMode:'estimated_driving',distanceMiles:0},{plannedDrivingDays:1.5},{dlaEligibility:'automatic'},{travelersTogether:'false'}])assert.throws(()=>run(change),undefined,JSON.stringify(change));
});
test('all 44 Snapshot bases map to the existing coordinate inventories',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('../cities/index.byBase.json',import.meta.url))).bases;
 assert.deepEqual(Object.keys(PCS_BASE_COORDINATES).sort(),Object.keys(index).sort());assert.equal(Object.keys(index).length,44);
 const registryText=fs.readFileSync(new URL('../../../Base-Map/base-map.js',import.meta.url),'utf8');
 const registry=vm.runInNewContext('('+registryText.match(/const BASE_REGISTRY = (\{[\s\S]*?\n  \});/)[1]+')');
 const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const legacy=JSON.parse(fs.readFileSync(new URL('../../../PCS-Calculator/pcs-calculator.js',import.meta.url),'utf8').match(/const BASE_COORDS = (\{[\s\S]*?\n    \});/)[1]);
 for(const [name,c] of Object.entries(PCS_BASE_COORDINATES)){
  const found=Object.values(registry).flat().find(r=>norm(r[1].replace('.json',''))===norm(index[name].file));
  const coords=found?found.slice(3):Object.entries(legacy).find(([n])=>norm(n.replace('AFB','').replace('JBSA-',''))===norm(index[name].file))?.[1];
  assert.ok(coords,name);assert.equal(c.latitude,coords[0],name);assert.equal(c.longitude,coords[1],name);
 }
});
test('every distinct supported CONUS pair returns finite estimates; Alaska fails explicitly',()=>{
 const names=Object.keys(PCS_BASE_COORDINATES).filter(n=>PCS_BASE_COORDINATES[n].region!=='AK');let pairs=0;
 for(const currentBase of names)for(const destinationBase of names)if(currentBase!==destinationBase){
  const r=run({currentBase,destinationBase});assert.ok(r.route.miles>0);assert.ok(r.budget.total>0);assert.ok(Number.isFinite(r.allowances.low));assert.ok(r.allowances.low<=r.allowances.high);pairs++;
 }
 assert.equal(pairs,1806);
});
test('endpoint preserves CORS, legacy modes and new-mode error handling',async()=>{
 const call=async(body,httpMethod='POST')=>handler({httpMethod,body:typeof body==='string'?body:JSON.stringify(body)});
 const good=await call({input});assert.equal(good.statusCode,200);assert.equal(JSON.parse(good.body).result.schema,'pcs-starter-plan.v1');assert.equal(good.headers['Access-Control-Allow-Origin'],'*');
 assert.equal((await call({input:{...input,familySize:0}})).statusCode,400);
 assert.equal((await call('{')).statusCode,400);assert.equal((await call({},'GET')).statusCode,405);assert.equal((await call({},'OPTIONS')).statusCode,204);
});
