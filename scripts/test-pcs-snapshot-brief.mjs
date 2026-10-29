import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseSelection, validatedParentOrigin, mortgageRequest, readMortgage, readCompensation, balanceText, cityIntelligence, utilityEstimate} from '../PCS-Snapshot-Brief/brief.js';
import {handler as brain} from '../netlify/functions/opensource-brain.js';
import {handler as mortgage} from '../netlify/functions/mortgage.js';

const selection = {rank:'E6',yos:14,family:3,hasDependents:true,base:'Davis-Monthan AFB',cityKey:'Davis-Monthan',newZip:'85707'};
const city = key => JSON.parse(fs.readFileSync(new URL(`../netlify/functions/cities/${key}.json`,import.meta.url),'utf8'));
const call = async (handler,body) => {const r=await handler({httpMethod:'POST',body:JSON.stringify(body)});assert.equal(r.statusCode,200,r.body);return JSON.parse(r.body);};
const pay = async s => readCompensation(await call(brain,{tool:'PCS_SNAPSHOT',input:s}),s);

test('selection is explicit, dependent status follows family size, and mismatched URLs fail',()=>{
  assert.deepEqual(parseSelection(new URLSearchParams(selection)),selection);
  for(const values of [{},{...selection,base:''},{...selection,yos:''},{...selection,family:0},{...selection,rank:'E10'},{...selection,cityKey:'../Travis'},{...selection,cityKey:'Travis'},{...selection,hasDependents:false},{...selection,baseFile:'Travis.json'}]) assert.throws(()=>parseSelection(new URLSearchParams(values)));
  assert.equal(parseSelection(new URLSearchParams({...selection,family:1,hasDependents:false})).hasDependents,false);
});
test('parent origin must be exact, trusted, and agree with referrer',()=>{
  const own='https://thewing.netlify.app',good='https://pcs-united-com.webflow.io';
  assert.equal(validatedParentOrigin(good,good+'/stage-1',own),good);
  assert.equal(validatedParentOrigin('https://pcsunited.com','',own),'https://pcsunited.com');
  for(const raw of ['*','null','https://evil.example','https://pcsunited.com.evil.test','https://pcsunited.com/path','https://user@pcsunited.com','http://pcsunited.com']) assert.equal(validatedParentOrigin(raw,'',own),null);
  assert.equal(validatedParentOrigin(good,'https://evil.example/',own),null);
  assert.equal(validatedParentOrigin('http://localhost:9000','http://localhost:9000/','http://localhost:8000'),'http://localhost:9000');
});
test('E-6 / 14 / Davis-Monthan compensation comes from the existing official modules',async()=>{
  const p=await pay(selection); assert.equal(p.monthly.bah,2121);assert.equal(p.monthly.basicPay,5130.3);assert.equal(p.monthly.bas,476.95);assert.equal(p.monthly.grossMonthlyComp,7728.25);
  const solo=await pay({...selection,family:1,hasDependents:false}); assert.notEqual(solo.monthly.bah,p.monthly.bah);
});
test('wrong-profile, incomplete and inconsistent compensation cannot reveal a result',async()=>{
  const r=await call(brain,{tool:'PCS_SNAPSHOT',input:selection});
  assert.throws(()=>readCompensation(r,{...selection,yos:16}));
  r.payload.compensation.monthly.bah=null;assert.throws(()=>readCompensation(r,selection));
});
test('three-bedroom mortgage includes each cost once and uses the shared BAH budget difference',async()=>{
  const req=mortgageRequest(city('Davis-Monthan'),'3',2121); const r=readMortgage(await call(mortgage,req));
  assert.equal(req.price,350000);assert.equal(r.monthly.principalInterest,2201.34);assert.equal(r.monthly.propertyTax,192.5);assert.equal(r.monthly.insurance,160.42);assert.equal(r.monthly.hoa,45);assert.equal(r.monthly.allIn,2599.26);assert.equal(r.budget.remainder,-478.26);assert.equal(r.financedFundingFee,7525);
  assert.notEqual(r.monthly.allIn,city('Davis-Monthan').by_bedroom['3'].mortgage_monthly.avg);
});
test('44 destinations: 174 supported bedroom scenarios; missing Fort Sam 4/5 remain unavailable',async()=>{
  const strip=fs.readFileSync(new URL('../PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt',import.meta.url),'utf8');
  const bases=[...strip.matchAll(/value: "([^"]+)".*?fileKey: "([^"]+)".*?zip: "([^"]+)"/g)];assert.equal(bases.length,44);
  for(const [,base,key,zip] of bases){
    const s=parseSelection(new URLSearchParams({...selection,base,cityKey:key,newZip:zip}));
    const p=await pay(s);
    for(const bed of ['2','3','4','5']){const req=mortgageRequest(city(key),bed,p.monthly.bah);if(key==='Fort-Sam-Houston' && ['4','5'].includes(bed)){assert.equal(req,null);continue;}assert.ok(req,`${key}/${bed}`);const r=readMortgage(await call(mortgage,req));assert.ok(r.monthly.allIn>0);}
  }
});
test('missing figures never become invented zero-cost assumptions or a default bedroom price',()=>{
  const c=city('Davis-Monthan'); c.by_bedroom['3'].home_price=null;assert.equal(mortgageRequest(c,'3',2121),null);
  assert.ok(mortgageRequest(c,'2',2121));delete c.hoa_monthly;delete c.ownership_costs.hoa_monthly_default;assert.equal(mortgageRequest(c,'2',2121),null);
  c.hoa_monthly=0;assert.equal(mortgageRequest(c,'2',2121).hoaMonthly,0);
  assert.throws(()=>readMortgage({ok:true,monthly:{allIn:1000}}));
});
test('shortfall wording and surplus clearly describe BAH only',()=>{
  assert.equal(balanceText(-485),'$485/month beyond BAH');assert.equal(balanceText(200),'$200/month of BAH remaining');assert.match(balanceText(0),/matches/);assert.match(balanceText(NaN),/unavailable/);
});
test('complete embeds stay below Webflow limit with valid JS, no storage, and unchanged cover',()=>{
  for(const name of ['PCS-Snapshot-input-strip.txt','PCSUnited-PCS-Snapshot-Brief-iframe.txt']){
    const s=fs.readFileSync(new URL('../PCS-Snapshot-Brief/webflow/'+name,import.meta.url),'utf8');assert.ok(s.length<50000);for(const [,js] of s.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(js);assert.doesNotMatch(s,/localStorage|sessionStorage/);
    if(name.includes('iframe'))assert.ok(s.includes('6acde39f80b636b344e47996_363630dc37390a1ed90ba0356ed45a4c_Air%20Force%20Base%20Demographics.jpg'));
  }
  const child=fs.readFileSync(new URL('../PCS-Snapshot-Brief/brief.js',import.meta.url),'utf8');assert.doesNotMatch(child,/localStorage|sessionStorage|supabase/i);
});

test('city intelligence follows source fields, preserves signed trends, and never invents missing values',()=>{
  const d=cityIntelligence(city('Davis-Monthan'));
  assert.equal(d.population,550000);assert.equal(d.metro,1070000);assert.equal(d.income,64500);assert.equal(d.trend,-2.4);assert.equal(d.median,327667);
  assert.equal(cityIntelligence(city('Cannon')).trend,-0.6);
  const missing=cityIntelligence({snapshot:{population_city:null,market_trend_yoy:null}});
  for(const key of ['population','metro','income','trend','median'])assert.equal(missing[key],undefined);
  for(const key of ['headline','summary','traffic','employment'])assert.equal(missing[key],'');
  assert.equal(cityIntelligence({snapshot:{market_trend_yoy:0}}).trend,0);
});
test('compact housing adds bedroom utilities once through the shared budget engine',async()=>{
  const c=city('Davis-Monthan'),req=mortgageRequest(c,'3',2145,{includeUtilities:true});
  assert.equal(req.otherExpensesMonthly,335);
  const r=readMortgage(await call(mortgage,req),req);
  assert.equal(r.monthly.allIn,2599.26);assert.equal(r.budget.totalOutflow,2934.26);assert.equal(r.budget.remainder,-789.26);
  assert.equal(balanceText(r.budget.remainder),'$789/month beyond BAH');
  r.budget.totalOutflow+=335;assert.throws(()=>readMortgage(r,req));
  delete c.by_bedroom['3'].utilities;assert.equal(utilityEstimate(c,'3'),undefined);assert.equal(mortgageRequest(c,'3',2145,{includeUtilities:true}),null);
  c.by_bedroom['3'].utilities={total:{avg:0}};assert.equal(mortgageRequest(c,'3',2145,{includeUtilities:true}).otherExpensesMonthly,0);
});
test('all 44 destination utilities reconcile with their supported bedroom scenarios',async()=>{
  const strip=fs.readFileSync(new URL('../PCS-Snapshot-Brief/webflow/PCS-Snapshot-input-strip.txt',import.meta.url),'utf8');
  const keys=[...strip.matchAll(/fileKey: "([^"]+)"/g)].map(m=>m[1]);assert.equal(keys.length,44);
  for(const key of keys)for(const bed of ['2','3','4','5']){
    const c=city(key),req=mortgageRequest(c,bed,2145,{includeUtilities:true});
    if(key==='Fort-Sam-Houston'&&['4','5'].includes(bed)){assert.equal(req,null);continue;}
    assert.ok(req,`${key}/${bed}`);const r=readMortgage(await call(mortgage,req),req);
    assert.equal(r.budget.expenses,utilityEstimate(c,bed));
    assert.ok(r.budget.totalOutflow>=r.monthly.allIn);
  }
});
