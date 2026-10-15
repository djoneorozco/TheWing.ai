const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recordUsage,readUsage,validateSnapshot,dateRange}=require('../netlify/functions/_share/calculator-analytics');
const {createHandler}=require('../netlify/functions/calculator-analytics');
const now=Date.parse('2026-10-15T12:00:00Z');
const input={calculator:'pt',visit:'a1000000-0000-4000-8000-000000000000',startDay:'2026-10-15',revision:1,activities:1,activeMs:1000,result:true};
function memory(){const records=new Map();return {records,async setJSON(key,value){records.set(key,value);return {modified:true};},async *list({prefix}){const keys=[...records.keys()].filter(k=>k.startsWith(prefix)).reverse();for(let i=0;i<keys.length;i+=2)yield {blobs:keys.slice(i,i+2).map(key=>({key}))};}};}
const event=(extra={})=>({httpMethod:'GET',headers:{origin:'https://thewing.ai'},...extra});
test('duplicate and out-of-order snapshots count one session and only the latest cumulative time',async()=>{
 const store=memory();await recordUsage(store,input,now);await recordUsage(store,{...input,revision:3,activities:5,activeMs:30000},now);
 await recordUsage(store,{...input,revision:2,activities:2,activeMs:15000},now);await recordUsage(store,input,now);
 const r=await readUsage(store,'today',now);assert.equal(r.calculators[0].sessions,1);assert.equal(r.calculators[0].adjustments,5);assert.equal(r.calculators[0].activeSeconds,30);assert.equal(store.records.size,3);
});
test('different apps and repeated visits stay separate; no unique-person claim',async()=>{
 const store=memory();await recordUsage(store,input,now);
 await recordUsage(store,{...input,visit:'b1000000-0000-4000-8000-000000000000'},now);
 await recordUsage(store,{...input,calculator:'disability'},now);
 const r=await readUsage(store,'today',now);assert.equal(r.calculators[0].sessions,2);assert.equal(r.calculators[1].sessions,1);assert.equal(r.calculators[0].averageActiveSeconds,1);
 assert.ok(!JSON.stringify(r).includes(input.visit));
});
test('empty healthy storage reports no recorded use; time per session is unknown',async()=>{
 const r=await readUsage(memory(),'today',now);assert.equal(r.storageConnected,true);assert.equal(r.calculators[0].status,'no_recorded_usage');assert.equal(r.calculators[0].averageActiveSeconds,null);
});
test('calendar filters are UTC and use session start date across midnight',async()=>{
 const store=memory();await recordUsage(store,{...input,startDay:'2026-10-14'},now);
 assert.equal((await readUsage(store,'today',now)).calculators[0].sessions,0);
 assert.equal((await readUsage(store,'yesterday',now)).calculators[0].sessions,1);
 assert.equal(dateRange('last7',now).length,7);assert.throws(()=>dateRange('__proto__',now));
});
test('reject arbitrary payloads, personal fields, bad identifiers, dates and excessive counters',()=>{
 for(const changes of [{rating:70},{visit:'../private'},{calculator:'unknown'},{startDay:'2026-02-30'},{startDay:'2026-10-16'},
 {startDay:'2026-08-01'},{activities:-1},{activeMs:86400001},{revision:0},{result:'true'}]) assert.throws(()=>validateSnapshot({...input,...changes},now));
});
test('HTTP accepts public aggregate GET and validated origin-bound POST without Google or owner keys',async()=>{
 const store=memory(),handler=createHandler({getStore:()=>store,now:()=>now});
 assert.equal((await handler(event({httpMethod:'POST',body:JSON.stringify(input)}))).statusCode,200);
 const r=await handler(event({headers:{}}));assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).source,'thewing');
 assert.equal(r.headers['Cache-Control'],'no-store');
});
test('bad POST requests are rejected before accessing storage',async()=>{
 const handler=createHandler({getStore:()=>assert.fail('must not access storage'),now:()=>now});
 for(const e of [event({httpMethod:'POST',body:'bad'}),event({httpMethod:'POST',body:'x'.repeat(1025)}),event({httpMethod:'POST',body:JSON.stringify({...input,rating:30})})])assert.equal((await handler(e)).statusCode,400);
 assert.equal((await handler(event({httpMethod:'POST',headers:{},body:JSON.stringify(input)}))).statusCode,403);
 assert.equal((await handler(event({headers:{origin:'https://evil.example'}}))).statusCode,403);
 assert.equal((await handler(event({httpMethod:'DELETE'}))).statusCode,405);
 assert.equal((await handler(event({queryStringParameters:{propertyId:'123'}}))).statusCode,400);
 assert.equal((await handler(event({httpMethod:'OPTIONS'}))).statusCode,204);
});
test('storage failures are explicit and do not become successful zero totals',async()=>{
 const handler=createHandler({getStore:()=>{throw Error('private connection detail');}});
 const response=await handler(event());assert.equal(response.statusCode,503);assert.match(response.body,/STORAGE_UNAVAILABLE/);assert.ok(!response.body.includes('private connection detail'));
});
test('failed writes never acknowledge collection',async()=>{
 const handler=createHandler({getStore:()=>({setJSON:async()=>{throw Error('failed');}}),now:()=>now});
 const r=await handler(event({httpMethod:'POST',body:JSON.stringify(input)}));assert.equal(r.statusCode,503);assert.ok(!r.body.includes('accepted'));
});
test('actual Netlify SDK and Lambda adapter save and list using a local Blobs server',async()=>{
 const {BlobsServer}=require('@netlify/blobs/server');
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'thewing-blobs-test-'));
 const server=new BlobsServer({directory,logger:()=>{}});const address=await server.start();
 try{
  const handler=createHandler({now:()=>now});
  const base={blobs:Buffer.from(JSON.stringify({url:`http://localhost:${address.port}`,token:'test-local'})).toString('base64'),
    headers:{origin:'https://thewing.ai','x-nf-site-id':'local-site','x-nf-deploy-id':'local-deploy'}};
  const saved=await handler({...base,httpMethod:'POST',body:JSON.stringify(input)});assert.equal(saved.statusCode,200,saved.body);
  const report=await handler({...base,httpMethod:'GET'});assert.equal(report.statusCode,200,report.body);assert.equal(JSON.parse(report.body).calculators[0].sessions,1);
 }finally{await server.stop();await fs.rm(directory,{recursive:true,force:true});}
});

test('loads count without interaction; retries and later usage never add another load',async()=>{
 const store=memory(),loaded={...input,started:false,activities:0,activeMs:0,result:false};
 await recordUsage(store,loaded,now);await recordUsage(store,loaded,now);
 let c=(await readUsage(store,'today',now)).calculators[0];
 assert.equal(c.loads,1);assert.equal(c.sessions,0);assert.equal(c.loadOnly,1);assert.equal(c.usageRate,0);assert.equal(c.trackedAverageActiveSeconds,null);
 await recordUsage(store,{...input,started:true,revision:3},now);
 await recordUsage(store,loaded,now);
 c=(await readUsage(store,'today',now)).calculators[0];
 assert.equal(c.loads,1);assert.equal(c.sessions,1);assert.equal(c.trackedResults,1);assert.equal(c.usageRate,1);
});
test('old usage is preserved but never invented as loads or included in conversion rate',async()=>{
 const store=memory();await recordUsage(store,input,now);
 const loaded={...input,visit:'b1000000-0000-4000-8000-000000000000',started:false,activities:0,activeMs:0,result:false};
 await recordUsage(store,loaded,now);
 const c=(await readUsage(store,'today',now)).calculators[0];
 assert.equal(c.sessions,1);assert.equal(c.legacySessions,1);assert.equal(c.legacyActiveSeconds,1);
 assert.equal(c.loads,1);assert.equal(c.trackedSessions,0);assert.equal(c.trackedResults,0);assert.equal(c.usageRate,0);
 assert.equal(c.trackedActiveSeconds,0);assert.equal(c.activeSeconds,1);
});
test('VA is a separate app and reloaded documents count separate loads',async()=>{
 const store=memory();await recordUsage(store,{...input,calculator:'va',started:true},now);
 await recordUsage(store,{...input,calculator:'va',visit:'b1000000-0000-4000-8000-000000000000',started:false,activities:0,activeMs:0,result:false},now);
 const r=await readUsage(store,'today',now),c=r.calculators[2];
 assert.equal(r.schemaVersion,2);assert.equal(c.loads,2);assert.equal(c.sessions,1);assert.equal(c.usageRate,0.5);assert.equal(r.calculators[1].loads,0);
});
test('impossible non-started states are rejected; revision zero supports cached old child with new parent',()=>{
 for(const changed of [{started:'false'},{started:false},{started:false,activities:0,activeMs:0,result:true}]) assert.throws(()=>validateSnapshot({...input,...changed},now));
 assert.equal(validateSnapshot({...input,revision:0,started:false,activities:0,activeMs:0,result:false},now).revision,0);
});
