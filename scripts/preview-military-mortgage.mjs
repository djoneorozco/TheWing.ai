// Local preview with the real Netlify handler; no mock calculations.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { handler } from '../netlify/functions/mortgage.js';
const port = Number(process.env.PORT || 8144);
const files = new Map([['/','index.html'],['/Military-Mortgage/','index.html'],['/Military-Mortgage/index.html','index.html'],['/Military-Mortgage/style.css','style.css'],['/Military-Mortgage/app.js','app.js'],['/style.css','style.css'],['/app.js','app.js']]);
for(const name of ['views.js','controls.js','controls.css','embed-preview.html','inline-preview.html']) {files.set('/Military-Mortgage/'+name,name);files.set('/'+name,name);}
http.createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  if(path === '/api/mortgage') {
    let body='';
    for await(const chunk of req) {body += chunk;if(body.length>16000) {res.writeHead(413);res.end();return;}}
    const result=await handler({httpMethod:req.method,body,headers:req.headers});
    res.writeHead(result.statusCode,result.headers);res.end(result.body);return;
  }
  if(!files.has(path)) {res.writeHead(404);res.end('Not found');return;}
  const file=files.get(path);
  res.writeHead(200,{'Content-Type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html','Cache-Control':'no-store'});
  res.end(await readFile(new URL(`../Military-Mortgage/${file}`,import.meta.url)));
}).listen(port,'127.0.0.1',()=>console.log(`Military Mortgage preview: http://127.0.0.1:${port}/Military-Mortgage/`));
