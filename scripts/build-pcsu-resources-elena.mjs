// Reuse the exact TOR panel markup/styles. Only the Resources adapter and copy differ.
import fs from 'node:fs';
let client=fs.readFileSync('TOR-Financial-Guidance/elena.js','utf8');
client=client.replace(/    const toolOrigin=[\s\S]*?    function open\(\)/,fs.readFileSync('PCSU-Resources-Elena/adapter.js','utf8')+'    function open()');
client=client.replace(/    async function settleInputs\(signal\)\{[\s\S]*?    async function ask\(raw\)/,`    async function settleInputs(signal){await new Promise(resolve=>setTimeout(resolve,0));renderContext();}\n    async function ask(raw)`);
client=client.replace("lastIncome=JSON.stringify(income());",'');
client=client.replaceAll('Financial Guidance','PCS Resources').replaceAll('financial guidance','PCS resources').replaceAll('The Orozco Realty · PCS Resources','PCSUnited · PCS Resources').replaceAll('/api/tor-ask-elena','/api/pcsu-resources-elena');
client=client.replace('Your financial guidance companion','Your PCS resources companion').replace('Let’s make your numbers make sense.','Let’s make your move make sense.');
client=client.replace('Help me understand my current financial picture.','Explain my current PCS Snapshot and what is still missing.').replace('Explain my numbers','My Snapshot');
client=client.replace('Explain what is included in my current mortgage payment.','Explain the demographics and housing data for my selected base, including source dates.').replace('My mortgage','My base');
client=client.replace('What information should I review next in my budget?','Explain DLA and MALT and how they relate to my current relocation estimate.').replace('What’s next?','DLA & MALT');
client=client.replace('Planning guidance, not loan approval.','Planning estimates, not entitlement decisions.');
client=client.replace('Hi, I’m Elena. We can work through your income, home payment and monthly expenses together. Ask me what your numbers mean—or try a different payment or home price to see how the picture changes.','Hi, I’m Elena. I can help you understand your selected base, PCS Snapshot and relocation estimate. Ask about demographics, DLA or MALT—or try a separate travel scenario.');
client=client.replace("s.tool==='calculate_mortgage'?'What-if mortgage · page unchanged':'What-if budget · page unchanged'","({lookup_base:'Base information · page unchanged',lookup_dla:'DLA lookup · page unchanged',calculate_malt:'MALT estimate · page unchanged',calculate_pcs:'What-if PCS · page unchanged'})[s.tool]||'Separate estimate · page unchanged'");
client=client.replace("maximumFractionDigits:4}).format(f.value))+(f.unit==='USD/month'?' / mo':f.unit==='%'?'%':f.unit==='years'?' years':'')","maximumFractionDigits:4}).format(f.value))+(f.unit==='USD/month'?' / mo':f.unit==='USD/year'?' / year':f.unit==='USD/mile'?' / mile':f.unit==='USD'?'':f.unit==='%'?'%':f.unit?' '+f.unit:'')");
client=client.replace("{style:'currency',currency:'USD'}","{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:f.unit==='USD/mile'?3:2}");
client=client.replace("!['www.va.gov','www.consumerfinance.gov','www.dfas.mil','www.hud.gov','comptroller.texas.gov'].includes(u.hostname)","!(/\\.(mil|gov)$/.test(u.hostname)||u.hostname==='thewing.netlify.app')||u.username||u.password");
fs.writeFileSync('PCSU-Resources-Elena/panel.js',client);
fs.writeFileSync('Webflow/PCSU-Resources-Elena.html',`<!-- PCS Resources only: replaces the previous Amy launcher/HUD. Page tools are unchanged. -->
<link rel="stylesheet" href="https://thewing.netlify.app/TOR-Financial-Guidance/elena.css">
<div id="tor-ask-elena" data-endpoint="https://thewing.netlify.app/api/pcsu-resources-elena"></div>
<script defer src="https://thewing.netlify.app/PCSU-Resources-Elena/panel.js"></script>
`);
console.log('Built Resources Elena with the existing TOR panel design.');
