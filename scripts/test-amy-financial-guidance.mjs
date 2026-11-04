import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const text=fs.readFileSync(new URL('../netlify/functions/agent-amy-public.js',import.meta.url),'utf8');
function body(name){const start=text.indexOf('function '+name+'(');assert(start>=0);return text.slice(start,text.indexOf('\n}\n',start)+2);}
const sandbox={};vm.createContext(sandbox);vm.runInContext(['isPlainObject','roundMoney','normalizeFinancialGuidanceIncome','num','isUsableCompensationPacket'].map(body).join('\n'),sandbox);
const normalize=sandbox.normalizeFinancialGuidanceIncome;
const fixture={schemaVersion:2,complete:true,status:'active',currency:'USD',period:'monthly',sources:[{label:'Base pay',amount:6000.9,basis:'rate-estimate'},{label:'BAH',amount:2145,basis:'rate-estimate'},{label:'BAS',amount:476.95,basis:'rate-estimate'},{label:'Spouse / partner income',amount:2500,basis:'user-entered'}],grossMonthlyIncome:11122.85,monthlyDeductions:1700,monthlySavingsContributions:500};
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
check('active ledger matches displayed totals',()=>{const p=normalize(fixture);assert.equal(p.total_monthly,11122.85);assert.equal(p.available_after_savings,8922.85);assert.equal(p.spouse_income,2500);assert.equal(p.bah,2145)});
check('veteran and retired preserve sources',()=>{for(const status of ['veteran','retired']){const p=normalize({...fixture,status});assert.equal(p.status,status);assert.equal(p.income_sources.length,4)}});
check('zero income is valid',()=>{const p=normalize({...fixture,sources:[{label:'VA disability compensation',amount:0,basis:'user-entered'}],grossMonthlyIncome:0,monthlyDeductions:0,monthlySavingsContributions:0});assert.equal(p.available_after_savings,0);assert(sandbox.isUsableCompensationPacket(p))});
check('negative availability retained',()=>assert.equal(normalize({...fixture,monthlySavingsContributions:20000}).available_after_savings,-10577.15));
check('missing amounts remain unknown',()=>{const p=normalize({...fixture,monthlyDeductions:null,monthlySavingsContributions:null});assert.equal(p.net_monthly_income,null);assert.equal(p.available_after_savings,null)});
check('incomplete and inconsistent rejected',()=>{assert.equal(normalize({...fixture,complete:false}),null);assert.equal(normalize({...fixture,grossMonthlyIncome:999}),null)});
check('invalid money rejected',()=>{for(const x of ['',true,-1,NaN,Infinity,100000001])assert.equal(normalize({...fixture,monthlyDeductions:x}),null)});
check('empty packet rejected',()=>assert.equal(normalize({}),null));
const {handler}=await import('../netlify/functions/agent-amy-public.js');
const origin='https://pcs-united-com.webflow.io';
for(const [name,event,status] of [
 ['staging preflight',{httpMethod:'OPTIONS',headers:{origin}},200],
 ['unknown origin rejected',{httpMethod:'OPTIONS',headers:{origin:'https://attacker.example'}},403],
 ['unsupported method',{httpMethod:'GET',headers:{origin}},405],
 ['malformed JSON',{httpMethod:'POST',headers:{origin},body:'{'},400],
 ['missing message',{httpMethod:'POST',headers:{origin},body:'{}'},400]
]){const r=await handler(event,{});check(name,()=>{assert.equal(r.statusCode,status);if(status===200)assert.equal(r.headers['Access-Control-Allow-Origin'],origin)})}
console.log(`${count} checks passed`);
const response=await handler({httpMethod:'POST',headers:{origin},body:JSON.stringify({message:'Explain my monthly income and available after savings.',context:{profile:{mode:'active'},compensation:{financial_guidance:fixture}}})},{});
const parsed=JSON.parse(response.body);
check('valid request returns a usable answer',()=>{assert.equal(response.statusCode,200);assert.equal(typeof parsed.reply,'string');assert(parsed.reply.length>0)});
