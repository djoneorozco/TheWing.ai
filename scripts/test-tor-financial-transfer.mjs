import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {buildTorTruth} from '../netlify/functions/_share/tor-amy.js';
import {calculateMilitaryMortgage} from '../netlify/functions/_share/military-mortgage.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tor='https://orozcorealty.webflow.io',app='https://thewing.netlify.app';
const loan={contract:'military-mortgage-v1',homePrice:300000,downPayment:0,creditScore:720,interestRate:6.1,termYears:30,loanType:'VA',propertyTaxAnnual:3125,insuranceAnnual:1125,hoaMonthly:0,otherOwnershipMonthly:50,pmiMonthly:null,vaFeeStatus:'first',feePayment:'finance'};

for(const origin of [tor,'https://pcs-united-com.webflow.io','https://pcsunited.com','https://www.pcsunited.com'])test('mortgage sends current state to '+origin,()=>{
 const listeners={},sent=[],parent={postMessage:(data,target)=>sent.push({data,target})};
 const window={PCSUnitedMilitaryMortgage:{getInputs:()=>({ready:true,revision:1})},addEventListener:(name,fn)=>listeners[name]=fn};
 vm.runInNewContext(read('Military-Mortgage/budget-bridge.js'),{window,parent,document:{referrer:origin+'/military/financial-guidance'},location:{hostname:'thewing.netlify.app'},URL});
 assert.equal(sent[0].target,origin);
 const data={source:'pcsu-finance-host',version:1,type:'pcsu:mortgage-budget-request'};
 listeners.message({source:parent,origin:tor+'.evil.example',data});listeners.message({source:{},origin,data});assert.equal(sent.length,1);
 listeners.message({source:parent,origin,data});assert.equal(sent.length,2);
});

test('TOR analysis receiver connects only matching windows, nonce and increasing revisions',()=>{
 const listeners={},sent=[],requests=[],frameListeners={};
 const frame={dataset:{},src:app+'/PCSUnited-Analysis/?connected=1',style:{},removeAttribute(){},setAttribute(){},addEventListener:(n,f)=>frameListeners[n]=f,contentWindow:{postMessage:(d,o)=>sent.push({d,o})}};
 const status={},opener={closed:false,postMessage:(d,o)=>requests.push({d,o})};
 const window={opener,addEventListener:(n,f)=>listeners[n]=f};
 vm.runInNewContext(read('Webflow/financial-analysis-receiver.js'),{window,document:{getElementById:id=>id==='pcsu-analysis-frame'?frame:status,referrer:tor+'/military/financial-guidance'},location:{origin:tor,hostname:'orozcorealty.webflow.io'},crypto:{randomUUID:()=>'host-id'},URL,setInterval:()=>1,clearInterval(){}});
 assert.equal(requests[0].o,tor);assert.equal(requests[0].d.requestId,'host-id');
 listeners.message({source:frame.contentWindow,origin:app,data:{source:'pcsu-analysis',version:1,type:'pcsu:analysis-ready',requestId:'frame-id'}});
 const message={source:opener,origin:tor,data:{source:'pcsu-analysis-launch',version:1,type:'pcsu:analysis-context',requestId:'host-id',revision:1,context:{version:1,income:{complete:true,grossMonthlyIncome:8000}}}};
 for(const bad of [{...message,source:{}},{...message,origin:tor+'.evil.example'},{...message,data:{...message.data,requestId:'wrong'}}])listeners.message(bad);
 assert.equal(sent.length,0);listeners.message(message);assert.equal(sent.length,1);assert.equal(sent[0].o,app);assert.equal(sent[0].d.requestId,'frame-id');
 listeners.message(message);assert.equal(sent.length,1);
 listeners.message({...message,data:{...message.data,revision:2}});assert.equal(sent.length,2);
});

test('Amy uses the canonical military loan engine and ignores browser totals',()=>{
 for(const loanType of ['VA','FHA','CONVENTIONAL']){
  const inputs={...loan,loanType,downPayment:60000},expected=calculateMilitaryMortgage(inputs);
  const truth=buildTorTruth({calculators:{mortgage:{inputs,result:{monthly:{allIn:1}}}}});
  assert.equal(truth.mortgage.monthly.allIn,expected.monthly.totalHousing);
  assert.equal(truth.mortgage.monthly.otherOwnership,50);
 }
 assert.equal(buildTorTruth({calculators:{mortgage:{inputs:{contract:'military-mortgage-v1'}}}}).mortgage,null);
 const legacy=buildTorTruth({calculators:{mortgage:{inputs:{price:300000,downPayment:60000,creditScore:720,interestRate:6.5,termYears:30,loanType:'conventional',propertyTaxPercent:1.25,insuranceMonthly:150,hoaMonthly:75,pmiMonthly:0}}}});
 assert.equal(legacy.mortgage.source,'TheWing mortgage-v2');assert.ok(legacy.mortgage.monthly.allIn>2000);
});

test('military Amy bridge is opt-in, invalidates stale amounts and checks sender',()=>{
 const listeners={},sent=[],parent={postMessage:(d,o)=>sent.push({d,o})};
 let snapshot={...loan,ready:true,status:'ready',mortgageEstimate:calculateMilitaryMortgage(loan)};
 const window={addEventListener:(n,f)=>listeners[n]=f,PCSUnitedMilitaryMortgage:{getInputs:()=>snapshot}};
 const sandbox={window,parent,document:{referrer:tor+'/military/financial-guidance',addEventListener(){}},location:{search:'?embedded=1&amy=tor',pathname:'/Military-Mortgage/',hostname:'thewing.netlify.app'},URL,URLSearchParams};
 vm.runInNewContext(read('public/ask-amy/tor-calculator-bridge.js'),sandbox);
 listeners['pcsunited:financial-input-updated']();assert.equal(sent[0].d.snapshot.inputs.contract,'military-mortgage-v1');assert.equal(sent[0].d.snapshot.result.monthly.allIn,snapshot.mortgageEstimate.monthly.totalHousing);
 snapshot={...snapshot,ready:false,status:'loading'};listeners['pcsunited:financial-input-updated']();assert.equal(sent.at(-1).d.snapshot,null);
 const data={source:'tor-amy-host',version:1,type:'tor:context-request'};
 listeners.message({origin:tor,source:{},data});assert.equal(sent.length,2);
 listeners.message({origin:tor,source:parent,data});assert.equal(sent.length,3);
 const blocked={};vm.runInNewContext(read('public/ask-amy/tor-calculator-bridge.js'),{...sandbox,window:{addEventListener:(n,f)=>blocked[n]=f},location:{...sandbox.location,search:'?embedded=1'}});assert.deepEqual(blocked,{});
});
