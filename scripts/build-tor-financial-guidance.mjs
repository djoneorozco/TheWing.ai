// Generate TOR's presentation from the canonical mortgage, budget and chat clients.
// No copied financial formulas or independent calculator engines.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
let mortgage=read('Military-Mortgage/index.html');
mortgage=mortgage.replaceAll('Military Mortgage Calculator','Home Mortgage Calculator').replaceAll('| PCSUnited','| The Orozco Realty')
 .replace('id="pcsu-financial-input-panel"','id="pcsu-financial-input-panel" data-audience="civilian"')
 .replace(/<option value="VA" selected>[\s\S]*?<\/option>/,'').replace('<option value="CONVENTIONAL">','<option value="CONVENTIONAL" selected>')
 .replace(/(id="fi-down-payment"[\s\S]*?value=")0"/,'$112500"')
 .replace('VA buyers may leave this at $0 or test the impact of cash down.','Enter your planned cash down payment. Review program requirements with a lender.')
 .replace(/<div id="fi-va-options">[\s\S]*?<\/div>/,'<div id="fi-va-options" hidden><input id="fi-va-fee-status" type="hidden" value="first"></div>')
 .replaceAll('VA funding fee or FHA upfront MIP.','FHA upfront mortgage insurance premium.').replaceAll('VA/FHA loan fee','FHA loan fee')
 .replace('VA first use with financed fee.','Conventional loan; mortgage insurance may apply.')
 .replace(/<a href="https:\/\/www.va.gov[^>]*>[\s\S]*?<\/a> · /,'')
 .replace(/<script defer src="\/public\/ask-amy\/tor-calculator-bridge.js"><\/script>\s*/,'')
 .replaceAll('href="./','href="../Military-Mortgage/').replaceAll('src="./','src="../Military-Mortgage/');
write('Civilian-Mortgage/index.html',mortgage);
let budget=read('Finance-UX/index.html').replaceAll('PCSUnited Monthly Budget Builder','The Orozco Realty Monthly Budget Builder').replaceAll('PCSUnited Financial','The Orozco Realty')
 .replace('<body','<body data-audience="civilian" data-items-url="/Finance-UX/items.json"')
 .replaceAll('Edit income and base details','Edit household income').replaceAll('No base selected','Your household').replaceAll('Income received from your PCS details','Income received from Section 01').replaceAll(' or a VA qualification test','')
 .replace(/<div id="fu-income-breakdown" hidden>[\s\S]*?<\/details>\s*<\/div>/,'<div id="fu-income-breakdown" hidden></div>')
 .replace('href="style.css"','href="../Finance-UX/style.css"').replace('src="app.js"','src="../Finance-UX/app.js"')
 .replace(/<script src="\/public\/ask-amy\/tor-calculator-bridge.js"><\/script>\s*/,'');
write('Civilian-Budget/index.html',budget);
const avatar='https://cdn.prod.website-files.com/691facbe35fbba00c096f2b7/69d8372486a31818a04707cc_ElenaProfile.jpg';
let client=read('PCSU-Ask-Amy/panel.js').replaceAll('PCSU-Ask-Amy','TOR-Ask-Elena').replaceAll('pcsu-ask-amy','tor-ask-elena').replaceAll('pcsu-amy-panel','tor-elena-panel').replaceAll('Amy','Elena').replaceAll('PCSUnited · Financial Guidance','The Orozco Realty · Financial Guidance').replace(/const avatar='[^']+';/,`const avatar='${avatar}';`)
 .replace("'www.dfas.mil'","'www.dfas.mil','www.hud.gov','comptroller.texas.gov'");
write('TOR-Financial-Guidance/elena.js',client);
let css=read('PCSU-Ask-Amy/panel.css').replaceAll('#pcsu-ask-amy','#tor-ask-elena');
css+='\n#tor-ask-elena{--amy-teal:#e1c68f;--amy-line:rgba(226,208,166,.19)}#tor-ask-elena .amy-launch{background:linear-gradient(135deg,#38372ff5,#182020e8);border-color:#cfb77d88}#tor-ask-elena .amy-panel{background:linear-gradient(145deg,rgba(52,52,44,.95),rgba(19,29,31,.97));border-color:#d0ba874f}#tor-ask-elena .amy-eyebrow,#tor-ask-elena .amy-context-title,#tor-ask-elena .amy-message>strong,#tor-ask-elena .amy-sources a,#tor-ask-elena .amy-scenario summary{color:#e1c995}#tor-ask-elena .amy-dot{background:#ddc68e;box-shadow:0 0 9px #ddc68e55}#tor-ask-elena .amy-send{background:linear-gradient(135deg,#e5d0a6,#bda071);color:#242619;border-color:#e2cb9f88}#tor-ask-elena .amy-composer{background:#17201d70}#tor-ask-elena textarea{background:#0e181570}#tor-ask-elena input.amy-share{accent-color:#dbc08a}#tor-ask-elena h2{font-family:Georgia,serif;font-weight:400}#tor-ask-elena .amy-context{background:#c9ae6610}#tor-ask-elena .amy-panel:focus-visible{outline-color:#e1c68f}\n';
write('TOR-Financial-Guidance/elena.css',css);
const content=read('TOR-Financial-Guidance/content.html');
const assets=base=>`<link rel="stylesheet" href="${base}/TOR-Financial-Guidance/page.css"><link rel="stylesheet" href="${base}/TOR-Financial-Guidance/elena.css"><script defer src="${base}/TOR-Financial-Guidance/page.js"></script><script defer src="${base}/Military-Mortgage/controls.js"></script><script defer src="${base}/TOR-Financial-Guidance/elena.js"></script>`;
const nav='<nav class="tor-preview-nav" style="padding:20px 32px;display:flex;align-items:center;justify-content:space-between;background:#f6f5ee;color:#4f482f;font-family:Georgia,serif"><a href="https://orozcorealty.webflow.io/" style="color:inherit;text-decoration:none;font-size:21px;line-height:1.05">The Orozco<br>Realty</a><span style="font:10px Arial;letter-spacing:2px">FINANCIAL GUIDANCE</span></nav>';
write('TOR-Financial-Guidance/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Financial Guidance | The Orozco Realty</title><meta name="description" content="Connect your household income, mortgage estimate and monthly budget. Ask Elena to explain your numbers and compare scenarios.">${assets('')}</head><body style="margin:0;background:#101313">${nav}${content}</body></html>\n`);
const production=assets('https://thewing.netlify.app')+'\n'+content;
if(production.length>50000)throw Error('Webflow embed too large');
write('Webflow/TOR-Civilian-Financial-Guidance.html','<!-- Replace the old financial page content and Elena embed; keep the TOR navigation. -->\n'+production+'\n');
console.log(`Built TOR page, civilian calculator views and Elena client. Webflow embed: ${production.length} characters.`);
