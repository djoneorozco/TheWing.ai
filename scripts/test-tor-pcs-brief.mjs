import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../PCS-Snapshot-Brief/brief.js',import.meta.url),'utf8');
const {validatedParentOrigin,parseSelection}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const own='https://thewing.netlify.app',tor='https://orozcorealty.webflow.io';
test('TOR may embed the shared brief with a matching referrer',()=>{
 assert.equal(validatedParentOrigin(tor,tor+'/military/air-force-pcs-support',own),tor);
 assert.equal(validatedParentOrigin(tor,'',own),tor);
});
test('existing PCSU and same-origin consumers remain supported',()=>{
 for(const origin of ['https://pcsunited.com','https://www.pcsunited.com','https://pcs-united-com.webflow.io',own]) assert.equal(validatedParentOrigin(origin,origin+'/pcs-resources',own),origin);
});
test('untrusted and lookalike origins remain rejected',()=>{
 for(const origin of ['https://evil.example','https://orozcorealty.webflow.io.evil.example','http://orozcorealty.webflow.io',tor+'/',tor+'/path','https://user:pass@orozcorealty.webflow.io','null','']) assert.equal(validatedParentOrigin(origin,'',own),null);
});
test('referrer mismatch cannot authorize TOR',()=>{
 assert.equal(validatedParentOrigin(tor,'https://evil.example/host',own),null);
 assert.equal(validatedParentOrigin(tor,'https://pcs-united-com.webflow.io/pcs-resources',own),null);
});
test('local development remains limited to local app origins',()=>{
 assert.equal(validatedParentOrigin('http://localhost:8080','http://localhost:8080/','http://localhost:8888'),'http://localhost:8080');
 assert.equal(validatedParentOrigin('http://localhost:8080','',own),null);
});
test('TOR presentation context does not change profile validation',()=>{
 const params=new URLSearchParams({rank:'E7',yos:'16',family:'4',base:'Lackland AFB',cityKey:'Lackland',baseFile:'Lackland.json',hasDependents:'true',brand:'tor'});
 assert.deepEqual(parseSelection(params),{rank:'E7',yos:16,family:4,base:'Lackland AFB',cityKey:'Lackland',hasDependents:true,newZip:''});
 params.set('baseFile','Andrews.json');assert.throws(()=>parseSelection(params),/do not match/);
});
