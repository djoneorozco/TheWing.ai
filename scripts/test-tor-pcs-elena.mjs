import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHandler} from '../netlify/functions/pcsu-resources-elena.js';
const origins=['https://pcs-united-com.webflow.io','https://orozcorealty.webflow.io'];
const context={version:1,base:'Lackland AFB',snapshot:{rank:'E7',yos:16,family:4,base:'Lackland AFB'},relocation:{rank:'E-7',familySize:4,destinationBase:'Lackland AFB',currentBase:'Cannon AFB',travelDate:'2026-11-27',povs:1,travelers:4,dependentsUnder12:2,travelersTogether:true,includePerDiem:true,plannedDrivingDays:2,mileageMode:'estimated_driving',distanceMiles:600,estimatedExpenses:null,dlaEligibility:'unknown'},presentation:{includeDla:true,expenses:1800}};
const event=(origin,httpMethod='POST',body={message:'Explain my move.',context})=>({httpMethod,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('TOR and PCSU return identical deterministic PCS results and privacy headers',async()=>{
 const handler=createHandler({apiKey:''}),results=[];
 for(const origin of origins){
  const preflight=await handler(event(origin,'OPTIONS'));assert.equal(preflight.statusCode,204);assert.equal(preflight.headers['Access-Control-Allow-Origin'],origin);
  const response=await handler(event(origin));assert.equal(response.statusCode,200);assert.equal(response.headers['Cache-Control'],'no-store');assert.equal(response.headers['Access-Control-Allow-Origin'],origin);assert.equal(response.headers.Vary,'Origin');
  const data=JSON.parse(response.body);assert.equal(data.facts.find(f=>f.id==='relocation.malt').value,141);assert.equal(data.facts.find(f=>f.id==='snapshot.militaryIncome').value,8589.85);results.push(data);
 }
 assert.deepEqual(results[0],results[1]);
});
test('only the server-selected TOR identity changes the AI request; tools and facts stay shared',async()=>{
 const calls=[];const handler=createHandler({apiKey:'fake',fetchImpl:async(_,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Your move estimate uses the selected route and submitted inputs.',fact_ids:['relocation.malt'],source_ids:['malt']})}]}]})};}});
 for(const origin of origins){const res=await handler(event(origin));assert.equal(JSON.parse(res.body).explanation_mode,'ai_grounded');}
 assert.match(calls[0].input[0].content,/PCSUnited's supportive PCS Resources/);assert.match(calls[1].input[0].content,/Orozco Realty's supportive Air Force PCS Support/);
 assert.equal(calls[0].input[0].content.split('\n').slice(1).join('\n'),calls[1].input[0].content.split('\n').slice(1).join('\n'));
 assert.deepEqual({...calls[0],input:calls[0].input.slice(1)},{...calls[1],input:calls[1].input.slice(1)});assert.equal(calls[1].store,false);
});
test('TOR lookalike origins remain blocked and invalid input remains rejected',async()=>{
 const handler=createHandler({apiKey:''});
 for(const origin of ['https://orozcorealty.webflow.io.evil.test','https://evil-orozcorealty.webflow.io','http://orozcorealty.webflow.io','https://orozcorealty.webflow.io:8443'])assert.equal((await handler(event(origin))).statusCode,403);
 assert.equal((await handler(event(origins[1],'POST',{message:'Explain',context:{version:1,snapshot:{rank:'E99'}}}))).statusCode,400);
 assert.equal((await handler(event(origins[1],'GET'))).statusCode,405);
});
test('installed panel styles and native dialog behavior are retained exactly',()=>{
 const before=fs.readFileSync('TOR-PCS-Elena/reference.html','utf8'),after=fs.readFileSync('Webflow/TOR-PCS-Elena.html','utf8');
 const blocks=(s,t)=>[...s.matchAll(new RegExp('<'+t+'>[\\s\\S]*?<\\/'+t+'>','g'))].map(x=>x[0]);
 assert.deepEqual(blocks(after,'style').slice(0,2),blocks(before,'style'));
 assert.equal(blocks(after,'script').at(-1),blocks(before,'script').at(-1));
 assert.deepEqual([...after.matchAll(/ElenaProfile\.jpg/g)].length,[...before.matchAll(/ElenaProfile\.jpg/g)].length);
 assert.match(after,/width:45vw/);assert.match(after,/Your PCS support guide/);assert.match(after,/Your Air Force PCS companion/);
 assert.equal([...after.matchAll(/class="ae-link-btn" data-question/g)].length,5);assert(after.length<50000);
 const ids=[...after.replace(/<script>[\s\S]*?<\/script>/g,'').matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
 assert.doesNotMatch(after,/theorozcorealty\.netlify\.app|new-real-estate-purchase|Realtor &amp; Financial Expert|localStorage|sessionStorage/);
});
test('generated client retains canonical context, request/history logic and safe sources',()=>{
 const current=fs.readFileSync('TOR-PCS-Elena/panel.js','utf8'),canonical=fs.readFileSync('PCSU-Resources-Elena/panel.js','utf8');
 const part=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end));
 assert.equal(part(current,'    async function settleInputs','    send.addEventListener'),part(canonical,'    async function settleInputs',"    $('form').addEventListener"));
 const adapter=fs.readFileSync('PCSU-Resources-Elena/adapter.js','utf8').replaceAll('Connected to PCS Resources','Connected to PCS Support');assert(current.includes(adapter));
 assert.equal(part(current,'    function facts','    function trimHistory'),part(canonical,'    function facts','    function trimHistory'));
 assert.match(current,/credentials:'omit'/);assert.match(current,/chat.replaceChildren\(controls,status\)/);new Function(current);
});
