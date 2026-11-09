import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const path=name=>new URL(name,root);
const original=fs.readFileSync(path('Webflow/financial-analysis-cta-base.html'),'utf8');
const launch=fs.readFileSync(path('Webflow/financial-analysis-launch.js'),'utf8');
const receiver=fs.readFileSync(path('Webflow/financial-analysis-receiver.js'),'utf8');
const cta=original.replace(/<script>[\s\S]*?<\/script>/,'<script>\n'+launch+'\n</script>')
 .replace('target="_top"','target="_blank"').replace('rel="noopener"','rel="opener"')
 .replace('aria-label="Open the PCSUnited Financial Analysis"','aria-label="Open your financial analysis in a new tab"');
const page='<!-- Financial Analysis destination. Keep the figures in memory; no storage or URL financial data. -->\n<p id="pcsu-analysis-page-status" role="status" style="margin:0;padding:12px 18px;color:#17334d;background:#f4f7f7;font:14px/1.5 Arial,sans-serif">Connecting to Financial Guidance…</p>\n<div style="width:100%;height:calc(100vh - 56px);min-height:600px;overflow:hidden">\n<iframe id="pcsu-analysis-frame" src="https://thewing.netlify.app/PCSUnited-Analysis/?connected=1" title="PCSUnited Financial Analysis powered by TheWing.ai" referrerpolicy="origin" aria-hidden="true" style="display:block;width:100%;height:100%;border:0;visibility:hidden"></iframe>\n</div>\n<script>\n'+receiver+'\n</script>\n';
for(const[name,code]of [['Webflow/financial-analysis-cta.html',cta],['Webflow/financial-analysis-page.html',page]]){
 if(code.length>=50000)throw new Error(name+' exceeds the embed limit');fs.writeFileSync(path(name),code);console.log(name+': '+code.length+' characters');
}
