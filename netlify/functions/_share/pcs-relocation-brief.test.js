import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRelocationBrief, RelocationInputError } from './pcs-relocation-brief.js';
import { handler } from '../pcs-move.js';

const input = Object.freeze({
  estimateMode:'relocation-brief', accuracyVersion:2, rank:'E-7', hasDependents:true,
  includeDla:true, includePerDiem:true, travelMode:'conus-pov', travelersTogether:true,
  travelDate:'2026-11-05', distanceMiles:751, distanceSource:'entered_authorized', povs:1,
  estimatedExpenses:0, dependents12Plus:1, dependentsUnder12:2, plannedDrivingDays:null,
  dlaEligibility:'confirmed', dlaEffectiveDate:'2026-11-05', dlaRank:'E-7', dlaHasDependents:true
});
const run = extra => calculateRelocationBrief({...input,...extra});

test('751-mile regression: 3 days, $5221.05 total, explicit provenance', () => {
  const r=run();
  assert.equal(r.usedTravelDays,3);
  assert.deepEqual(r.allowances,{dla:3551.31,malt:176.49,perDiem:1493.25,total:5221.05});
  assert.equal(r.distance.label,'Entered authorized mileage');
  assert.equal(r.distance.verification,'user_entered_not_independently_verified');
  assert.deepEqual(r.input,input);
});
test('1000-mile control and optional net calculation remain intact', () => {
  const r=run({distanceMiles:1000,estimatedExpenses:1200});
  assert.equal(r.allowances.total,5279.56);assert.equal(r.net,4079.56);
});
test('mileage estimate is never represented as independently verified mileage', () => {
  const r=run({distanceSource:'estimated_driving'});
  assert.equal(r.distance.label,'Estimated driving distance');
  assert.equal(r.distance.verification,'planning_only');
  assert.match(r.assumptions.join(' '),/planning estimate/);
});
test('unknown DLA is excluded rather than silently awarded', () => {
  const r=run({includeDla:false,dlaEligibility:'unknown',dlaRank:null,dlaHasDependents:null,dlaEffectiveDate:null});
  assert.equal(r.allowances.dla,0);assert.equal(r.allowances.total,1669.74);
  assert.equal(r.dla.eligibility,'unknown');assert.equal(r.dla.included,false);
  assert.match(r.assumptions.join(' '),/not assumed to be a zero entitlement/);
});
test('explicit DLA exclusion remains distinct from unknown', () => {
  const r=run({includeDla:false,dlaEligibility:'excluded'});
  assert.equal(r.dla.eligibility,'excluded');assert.equal(r.allowances.dla,0);
});
test('DLA uses the order-effective profile independently of travel profile', () => {
  const r=run({dlaRank:'E-5',dlaHasDependents:false,dlaEffectiveDate:'2026-10-20'});
  assert.equal(r.allowances.dla,2389.42); assert.equal(r.dla.effectiveDate,'2026-10-20');
  assert.equal(r.dla.rank,'E-5');assert.equal(r.dla.hasDependents,false);
  assert.equal(r.allowances.perDiem,1493.25);
});
test('all primary DLA grades support explicit with/without-dependent selection', () => {
  const grades='E-1 E-2 E-3 E-4 E-5 E-6 E-7 E-8 E-9 W-1 W-2 W-3 W-4 W-5 O-1E O-2E O-3E O-1 O-2 O-3 O-4 O-5 O-6 O-7 O-8 O-9 O-10'.split(' ');
  for (const dlaRank of grades) for (const dlaHasDependents of [true,false]) {
    const r=run({dlaRank,dlaHasDependents});assert.ok(r.allowances.dla>0);assert.equal(r.dla.rank,dlaRank);
  }
});
for(const [date, miles, maltRate, daily] of [['2026-01-01',400,.205,178],['2026-06-30',400,.205,178],['2026-07-01',751,.235,178],['2026-09-30',400,.235,178],['2026-10-01',751,.235,181],['2026-12-31',400,.235,181]]) {
  test(`preserves rates and ages at ${date}`,()=>{
    const r=run({travelDate:date,distanceMiles:miles});
    assert.equal(r.malt.ratePerMile,maltRate);assert.equal(r.perDiem.rates.memberDailyRate,daily);
    assert.equal(r.allowances.perDiem,r.usedTravelDays*daily*2.75);
  });
}
test('per diem uses actual/planned days up to the mileage maximum', () => {
  assert.equal(run({plannedDrivingDays:2}).allowances.perDiem,995.5);
  const longer=run({plannedDrivingDays:4});assert.equal(longer.usedTravelDays,3);assert.equal(longer.daysCapped,true);
});
test('member-only and two-POV scenarios do not multiply per diem by vehicles',()=>{
  const r=run({hasDependents:false,dependents12Plus:0,dependentsUnder12:0,povs:2});
  assert.equal(r.allowances.malt,352.98);assert.equal(r.allowances.perDiem,543);
});
test('per diem can be excluded without altering MALT or DLA',()=>{
  const r=run({includePerDiem:false,dependents12Plus:0,dependentsUnder12:0});
  assert.equal(r.allowances.perDiem,0);assert.equal(r.allowances.total,3727.8);
});
test('unsafe or incomplete version-2 claims fail validation',()=>{
  for(const change of [
    {dlaEligibility:'unknown'}, {includeDla:false}, {dlaEligibility:'approved_by_AI'},
    {dlaEffectiveDate:null}, {dlaEffectiveDate:'2027-01-01'}, {dlaEffectiveDate:'2026-02-30'},
    {dlaRank:''},{dlaHasDependents:null},{hasDependents:null},{distanceSource:'official'},
    {distanceSource:undefined},{accuracyVersion:3},{travelersTogether:false},
    {distanceMiles:0},{distanceMiles:751.5},{povs:3},{travelDate:'2027-01-01'},
    {hasDependents:false},{travelMode:'air'}, {travelDate:'2026-09-30'}, {travelDate:'2026-06-30'}
  ]) assert.throws(()=>run(change),RelocationInputError,JSON.stringify(change));
});
test('legacy brief consumers retain schema and amount semantics with corrected days',()=>{
  const {accuracyVersion,distanceSource,travelersTogether,dlaEligibility,dlaEffectiveDate,dlaRank,dlaHasDependents,...legacy}=input;
  const r=calculateRelocationBrief(legacy);assert.equal(r.schema,'pcs-relocation-brief.v1');
  assert.equal(r.accuracyVersion,1);assert.equal(r.allowances.total,5221.05);
  assert.equal(r.dla.eligibility,'assumed');
});
test('public endpoint returns revision 2 and keeps 400/CORS behavior',async()=>{
  const good=await handler({httpMethod:'POST',body:JSON.stringify({input})});
  assert.equal(good.statusCode,200);assert.equal(JSON.parse(good.body).result.accuracyVersion,2);
  const bad=await handler({httpMethod:'POST',body:JSON.stringify({input:{...input,dlaEligibility:'unknown'}})});
  assert.equal(bad.statusCode,400);assert.equal(bad.headers['Access-Control-Allow-Origin'],'*');
});
