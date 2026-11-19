import {readRequest,buildPacket,runScenario,VERSION,CIVILIAN_MORTGAGE_KEYS} from './_share/tor-financial-context.js';
import {explain,historyReply,tools,DEFAULT_MODEL} from './_share/pcsu-amy-model.js';
const identity="You are Elena, The Orozco Realty's supportive financial guidance companion for civilian households in the San Antonio area. Help people understand income, mortgage costs, expenses, debt and savings, and compare buying, renting or waiting without sales pressure. This page uses conventional and FHA purchase scenarios. Do not calculate military pay, BAH, BAS, military retirement or VA benefits. Use the user's language, including natural Spanish when requested. You have no live listings, current lender quotes, tax-record lookup or guaranteed eligibility information. A Texas source is educational, not proof of a local exemption or tax bill.";
const civilianTools=structuredClone(tools);civilianTools[0].description='Run a separate Conventional or FHA mortgage estimate with explicitly requested changes using the shared TheWing engine. Reuse current inputs only as stated assumptions. Never edit the page.';civilianTools[0].parameters.properties.changes.items.properties.field.enum=CIVILIAN_MORTGAGE_KEYS;
function allowed(origin){return !origin||['https://orozcorealty.webflow.io','https://theorozcorealty.com','https://www.theorozcorealty.com','https://theorozcorealty.netlify.app','https://thewing.netlify.app','https://thewing.ai','https://www.thewing.ai'].includes(origin)||/^https:\/\/deploy-preview-\d+--(?:thewing|theorozcorealty)\.netlify\.app$/.test(origin)||(process.env.CONTEXT!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));}
export function createHandler(options={}){return async event=>{
 const origin=event.headers?.origin||event.headers?.Origin;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 if(origin&&allowed(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(statusCode,data)=>({statusCode,headers,body:data===null?'':JSON.stringify(data)});
 if(!allowed(origin))return reply(403,{ok:false,error:'Origin not allowed.'});
 if(event.httpMethod==='OPTIONS')return reply(204,null);
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Use POST.'});
 if(typeof event.body!=='string'||Buffer.byteLength(event.body)>90000||event.isBase64Encoded)return reply(413,{ok:false,error:'Send JSON under 90 KB.'});
 const type=event.headers?.['content-type']||event.headers?.['Content-Type'];if(type&&!/^application\/json(?:;|$)/i.test(type))return reply(415,{ok:false,error:'Send JSON.'});
 let request,packet;try{request=readRequest(JSON.parse(event.body));packet=buildPacket(request.context);}catch{return reply(400,{ok:false,code:'context_invalid',error:'Your calculator inputs are incomplete, invalid or still updating. Review the entries and try again.'});}
 const answer=await explain(request,packet,{...options,identity,name:'Elena',model:options.model||process.env.TOR_ELENA_OPENAI_MODEL||DEFAULT_MODEL,tools:civilianTools,runScenario});
 return reply(200,{ok:true,version:VERSION,...answer,history_reply:historyReply(answer),context_used:{section:request.section,state:packet.state,missing:packet.missing,warnings:packet.warnings},privacy:'Conversation stays in page memory. No financial profiles or chat history are saved by this endpoint.'});
};}
export const handler=createHandler();
