import {calculateIncome} from './_share/tor-financial-context.js';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const reply=(statusCode,data)=>({statusCode,headers,body:data===null?'':JSON.stringify(data)});
export async function handler(event){
 if(event.httpMethod==='OPTIONS')return reply(204,null);
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Use POST.'});
 if(typeof event.body!=='string'||Buffer.byteLength(event.body)>4000||event.isBase64Encoded)return reply(413,{ok:false,error:'Send income inputs under 4 KB.'});
 try{return reply(200,calculateIncome(JSON.parse(event.body)));}catch(error){return reply(400,{ok:false,error:error.message});}
}
