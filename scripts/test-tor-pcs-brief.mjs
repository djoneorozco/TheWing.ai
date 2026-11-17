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

const mapSource=await readFile(new URL('../Base-Map/base-map.js',import.meta.url),'utf8');
const mapFunction=mapSource.slice(mapSource.indexOf('  function baseDemographicsUrl('),mapSource.indexOf('  function updateDemographicsLink('));
const mapURL=(search,base)=>new Function('window','LIVE_BASE_DEMOGRAPHICS_URL',mapFunction+';return baseDemographicsUrl(arguments[2]);')({location:{search,origin:own,href:own+'/base-map/'}},'https://pcsunited-com-28346d.webflow.io/air-force/base-demographics-air-force',base);
test('TOR map opens the matching shared demographics record',()=>{
 const url=new URL(mapURL('?brand=tor',{id:'lackland',fileName:'Lackland.json'}));
 assert.equal(url.origin,own);assert.equal(url.pathname,'/Base-Demographic/embed.html');assert.equal(url.searchParams.get('baseFile'),'Lackland.json');assert.equal(url.searchParams.get('brand'),'tor');
});
test('existing PCSU map route is unchanged',()=>{
 const url=new URL(mapURL('',{id:'lackland',fileName:'Lackland.json'}));
 assert.equal(url.hostname,'pcsunited-com-28346d.webflow.io');assert.equal(url.searchParams.get('base'),'lackland');
});
