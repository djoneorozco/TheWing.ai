import { calculateFinancialAnalysis } from './_share/financial-analysis.js';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const reply=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
export async function handler(event) {
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Use POST.'});
  if(typeof event.body!=='string'||event.body.length>100000)return reply(400,{ok:false,error:'Provide a financial context under 100 KB.'});
  let body;try{body=JSON.parse(event.body);}catch{return reply(400,{ok:false,error:'Invalid JSON.'});}
  try{return reply(200,calculateFinancialAnalysis(body));}
  catch(error){return reply(400,{ok:false,error:error.message});}
}
