const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/ask-amy/tor-calculator-bridge.js'),'utf8');
function mount(origin,{search='?amy=tor',hostname='thewing.netlify.app'}={}){
 const listeners={},posts=[];
 const parent={postMessage:(data,target)=>posts.push({data,target})};
 const window={addEventListener:(type,fn)=>listeners[type]=fn};
 const document={referrer:origin+'/index.html',addEventListener:()=>{}};
 vm.runInNewContext(source,{window,parent,document,location:{search,hostname,pathname:'/Mortgage-Calculator/'},URL,URLSearchParams,Set});
 return {listeners,posts,parent};
}
for(const origin of ['https://orozcorealty.webflow.io','https://theorozcorealty.netlify.app','https://theorozcorealty.com','https://www.theorozcorealty.com','https://deploy-preview-47--theorozcorealty.netlify.app']) test('approved TOR host '+origin,()=>{
 const {listeners,posts,parent}=mount(origin);
 assert.equal(typeof listeners.message,'function');
 listeners.message({origin,source:parent,data:{source:'tor-amy-host',version:1,type:'tor:context-request'}});
 assert.equal(posts.length,1);assert.equal(posts[0].target,origin);assert.equal(posts[0].data.snapshot,null);
});
for(const origin of ['https://evil.example','https://theorozcorealty.com.evil.example','https://deploy-preview-1--other-site.netlify.app','https://orozcorealty.webflow.io.evil.example']) test('reject unrelated host '+origin,()=>assert.equal(mount(origin).listeners.message,undefined));
test('sharing still requires the explicit TOR query parameter',()=>assert.equal(mount('https://theorozcorealty.com',{search:''}).listeners.message,undefined));
test('same-origin but wrong window and wrong-origin parent cannot request context',()=>{
 const origin='https://theorozcorealty.com', {listeners,posts,parent}=mount(origin);
 const data={source:'tor-amy-host',version:1,type:'tor:context-request'};
 listeners.message({origin,source:{},data});listeners.message({origin:'https://evil.example',source:parent,data});assert.equal(posts.length,0);
});
test('local testing stays limited to a local child and local parent',()=>{
 assert.equal(typeof mount('http://localhost:4178',{hostname:'localhost'}).listeners.message,'function');
 assert.equal(mount('http://localhost:4178').listeners.message,undefined);
});
