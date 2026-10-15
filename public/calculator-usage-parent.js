/* First-party calculator usage. Install ONCE on the outer published TheWing page.
 * Sends only cumulative usage counters to TheWing's own Netlify endpoint.
 */
(()=>{
  'use strict';
  if(!['https://thewing.ai','https://www.thewing.ai'].includes(location.origin)||window.__thewingCalculatorUsageParent) return;
  const route={
    '/air-force/pt-calculator.html':['pt','/pt-calculator'],
    '/air-force/disability-calculator.html':['disability','/disability-calculator']
  }[location.pathname];
  if(!route) return;
  window.__thewingCalculatorUsageParent=true;
  const [id,appPath]=route,APP_ORIGIN='https://thewing.netlify.app',TYPE='thewing:usage:v1';
  const ENDPOINT=APP_ORIGIN+'/.netlify/functions/calculator-analytics';
  const frames=new Map();
  function matches(frame){
    try{const url=new URL(frame.src,location.href);return url.origin===APP_ORIGIN&&url.pathname.toLowerCase().replace(/\/$/,'')===appPath;}
    catch(_){return false;}
  }
  function state(frame,r){
    frame.contentWindow?.postMessage({type:TYPE,kind:'state',calculator_id:id,visit:r.visit,
      visible:r.visible&&document.visibilityState==='visible'&&document.hasFocus()},APP_ORIGIN);
  }
  function ack(frame,r,revision){
    frame.contentWindow?.postMessage({type:TYPE,kind:'ack',calculator_id:id,visit:r.visit,revision},APP_ORIGIN);
  }
  function register(frame){
    if(frames.has(frame)) return frames.get(frame);
    const r={visit:null,retired:new Set(),visible:false};frames.set(frame,r);
    if('IntersectionObserver' in window){
      new IntersectionObserver(entries=>{r.visible=entries[0].isIntersecting&&entries[0].intersectionRatio>0;state(frame,r);}).observe(frame);
    }
    return r;
  }
  function valid(d){
    return Number.isSafeInteger(d.revision)&&d.revision>=0&&d.revision<=1000000&&
      typeof d.started==='boolean'&&typeof d.result==='boolean'&&(!d.result||d.started)&&
      Number.isSafeInteger(d.activities)&&d.activities>=0&&d.activities<=100000&&
      Number.isSafeInteger(d.active_ms)&&d.active_ms>=0&&d.active_ms<=86400000;
  }
  async function deliver(frame,r,force=false){
    if(!r.pending||r.sending||(!force&&Date.now()<r.nextSend)) return;
    const data=r.pending,visit=r.visit;
    r.sending=true;r.nextSend=Date.now()+5000;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},
        credentials:'omit',keepalive:true,signal:controller.signal,body:JSON.stringify(data)});
      if(!response.ok) return;
      const accepted=await response.json();
      if(accepted.accepted!==true||accepted.revision!==data.revision||r.visit!==visit) return;
      r.acknowledged=Math.max(r.acknowledged,data.revision);
      if(r.pending?.revision<=data.revision) r.pending=null;
      ack(frame,r,r.acknowledged);
    }catch(_){/* Retain the newest cumulative snapshot for a later retry. */}
    finally{clearTimeout(timeout);if(r.visit===visit) r.sending=false;}
  }
  window.addEventListener('message',event=>{
    if(event.origin!==APP_ORIGIN) return;
    const d=event.data;
    if(!d||d.type!==TYPE||d.calculator_id!==id||typeof d.visit!=='string'||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(d.visit)) return;
    const frame=Array.from(document.querySelectorAll('iframe')).find(f=>matches(f)&&event.source===f.contentWindow);
    if(!frame) return;
    const r=register(frame);
    if(d.kind==='hello'){
      if(r.retired.has(d.visit)) return;
      if(r.visit!==d.visit){
        if(r.visit) r.retired.add(r.visit);
        Object.assign(r,{visit:d.visit,acknowledged:-1,seen:-1,activities:0,activeMs:0,
          started:false,result:false,startDay:null,pending:null,sending:false,nextSend:0});
      }
      state(frame,r);return;
    }
    if(d.kind!=='snapshot'||d.visit!==r.visit||!valid(d)) return;
    if(d.revision<=r.acknowledged){ack(frame,r,r.acknowledged);return;}
    if(d.revision<r.seen||d.activities<r.activities||d.active_ms<r.activeMs||
      (r.started&&!d.started)||(r.result&&!d.result)) return;
    if(!d.started){r.acknowledged=d.revision;ack(frame,r,d.revision);return;}
    if(!r.startDay) r.startDay=new Date().toISOString().slice(0,10);
    Object.assign(r,{seen:d.revision,activities:d.activities,activeMs:d.active_ms,started:true,result:d.result});
    r.pending={calculator:id,visit:r.visit,startDay:r.startDay,revision:d.revision,
      activities:d.activities,activeMs:d.active_ms,result:d.result};
    deliver(frame,r);
  });
  function broadcast(){
    for(const [frame,r] of frames){
      if(!frame.isConnected||!matches(frame)){frames.delete(frame);continue;}
      if(r.visit) state(frame,r);
      deliver(frame,r);
    }
  }
  setInterval(broadcast,1000);
  ['focus','blur','pageshow'].forEach(name=>window.addEventListener(name,broadcast));
  document.addEventListener('visibilitychange',broadcast);
  window.addEventListener('pagehide',()=>{
    for(const [frame,r] of frames){
      frame.contentWindow?.postMessage({type:TYPE,kind:'state',calculator_id:id,visit:r.visit,visible:false},APP_ORIGIN);
      deliver(frame,r,true);
    }
  });
})();
