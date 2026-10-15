// Read-only aggregate GET; minimal first-party usage POST. No Google services.
const {recordUsage,readUsage,validateSnapshot,dateRange}=require('./_share/calculator-analytics');
const ORIGINS=new Set(['https://thewing.ai','https://www.thewing.ai','https://thewing.netlify.app']);
const COLLECTORS=new Set(['https://thewing.ai','https://www.thewing.ai']);
const MESSAGES={
  INVALID_USAGE:'The usage update was invalid.', INVALID_FILTER:'Choose an available date range.',
  ORIGIN_DENIED:'This page cannot send usage updates.', METHOD_NOT_ALLOWED:'Use GET for reports or POST for usage.',
  STORAGE_UNAVAILABLE:'Usage storage is unavailable. Check the Netlify deploy and its Blobs connection. No Google setup is needed.',
  STORAGE_INVALID:'Usage storage returned an unexpected response. No totals are being shown.',
  REPORT_TOO_LARGE:'This date range contains too many records. Choose a shorter range.'
};
function connectStore(event) {
  const {connectLambda,getStore}=require('@netlify/blobs');
  connectLambda(event);
  const preview=process.env.CONTEXT && process.env.CONTEXT!=='production';
  return getStore({name:preview?'thewing-calculator-usage-preview':'thewing-calculator-usage',consistency:'eventual',
    fetch:(url,init={})=>fetch(url,{...init,signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)})});
}
function createHandler({getStore=connectStore,now=()=>Date.now()}={}) {
  return async event=>{
    const requestHeaders=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
    const origin=requestHeaders.origin;
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',Vary:'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type'};
    if(ORIGINS.has(origin)) headers['Access-Control-Allow-Origin']=origin;
    const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
    const fail=(status,code)=>reply(status,{error:code,message:MESSAGES[code]});
    if(origin&&!ORIGINS.has(origin)) return fail(403,'ORIGIN_DENIED');
    if(event.httpMethod==='OPTIONS') return {statusCode:204,headers,body:''};
    if(!['GET','POST'].includes(event.httpMethod)) return fail(405,'METHOD_NOT_ALLOWED');
    try {
      if(event.httpMethod==='POST') {
        if(!COLLECTORS.has(origin)) return fail(403,'ORIGIN_DENIED');
        if(event.isBase64Encoded || typeof event.body!=='string' || Buffer.byteLength(event.body)>1024) return fail(400,'INVALID_USAGE');
        let input;try{input=JSON.parse(event.body);}catch(_){return fail(400,'INVALID_USAGE');}
        validateSnapshot(input,now());
        const saved=await recordUsage(getStore(event),input,now());
        return reply(200,saved);
      }
      const {period='today',...extra}=event.queryStringParameters||{};
      if(Object.keys(extra).length) return fail(400,'INVALID_FILTER');
      dateRange(period,now());
      return reply(200,await readUsage(getStore(event),period,now()));
    }catch(error){
      const code=Object.hasOwn(MESSAGES,error.code)?error.code:'STORAGE_UNAVAILABLE';
      return fail(['INVALID_USAGE','INVALID_FILTER'].includes(code)?400:503,code);
    }
  };
}
exports.handler=createHandler();
exports.createHandler=createHandler;
