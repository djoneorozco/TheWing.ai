import { readRequest, buildPacket, VERSION } from './_share/pcsu-amy-context.js';
import { explain, historyReply } from './_share/pcsu-amy-model.js';

function allowed(origin) {
  if(!origin)return true;
  if(['https://pcs-united-com.webflow.io','https://orozcorealty.webflow.io','https://pcsunited.com','https://www.pcsunited.com','https://thewing.netlify.app','https://thewing.ai','https://www.thewing.ai'].includes(origin))return true;
  return /^https:\/\/deploy-preview-\d+--thewing\.netlify\.app$/.test(origin)||(process.env.CONTEXT!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
}
export async function handler(event) {
  const origin=event.headers?.origin||event.headers?.Origin;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(origin&&allowed(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(statusCode,data)=>({statusCode,headers,body:data===null?'':JSON.stringify(data)});
  if(!allowed(origin))return reply(403,{ok:false,code:'origin',error:'Origin not allowed.'});
  if(event.httpMethod==='OPTIONS')return reply(204,null);
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Use POST.'});
  if(typeof event.body!=='string'||Buffer.byteLength(event.body)>90000||event.isBase64Encoded)return reply(413,{ok:false,error:'Send a JSON request under 90 KB.'});
  const type=event.headers?.['content-type']||event.headers?.['Content-Type'];
  if(type&&!/^application\/json(?:;|$)/i.test(type))return reply(415,{ok:false,error:'Send JSON.'});
  let request,packet;
  try{request=readRequest(JSON.parse(event.body));packet=buildPacket(request.context);}
  catch{return reply(400,{ok:false,code:'context_invalid',error:'Your calculator inputs are incomplete, invalid or still updating. Review the current entries and try again.'});}
  const answer=await explain(request,packet);
  return reply(200,{ok:true,version:VERSION,...answer,history_reply:historyReply(answer),context_used:{section:request.section,state:packet.state,missing:packet.missing,warnings:packet.warnings},privacy:'Conversation stays in page memory. This endpoint does not save financial profiles or chat history.'});
}
