import fs from 'node:fs';

// Keep the installed TOR dialog, its two style blocks and native dialog behavior.
// Reuse the tested PCS client for transport, history, context, tools and sources.
const reference=fs.readFileSync('TOR-PCS-Elena/reference.html','utf8');
const canonical=fs.readFileSync('PCSU-Resources-Elena/panel.js','utf8');
let behavior=canonical.slice(canonical.indexOf('    const $='),canonical.indexOf('\n  }\n  if(document.readyState'));
behavior=behavior.replace(/    const \$=[^\n]+/,`    const $=s=>root.querySelector(s),panel=document.getElementById('ae-side-panel'),launch=document.getElementById('ae-floating-chat-button'),chat=$('#ae-chat'),input=$('#ae-input'),send=$('#ae-send'),status=$('.amy-status'),share=$('.amy-share');`);
behavior=behavior.replace(/    function open\(\)[\s\S]*?    function message\(/,`    launch.addEventListener('click',renderContext);\n    function message(`);
behavior=behavior.replace(/      const article=document.createElement\('article'\);[\s\S]*?return article;/,`      const article=document.createElement('div');article.className='ae-msg '+(role==='user'?'ae-user':'ae-bot');article.dataset.role=role;
      const copy=document.createElement('div');copy.className='amy-copy';const p=document.createElement('span');p.textContent=text;copy.append(p);article.append(copy);chat.insertBefore(article,controls);chat.scrollTop=chat.scrollHeight;return article;`);
behavior=behavior.replace("    $('form').addEventListener('submit',e=>{e.preventDefault();ask(input.value);});","    send.addEventListener('click',()=>ask(input.value));");
behavior=behavior.replace("b.addEventListener('click',()=>{input.value=b.dataset.question;input.focus();})","b.addEventListener('click',e=>{e.preventDefault();input.value=b.dataset.question;input.focus();})");
behavior=behavior.replace('chat.replaceChildren();','chat.replaceChildren(controls,status);');
behavior=behavior.replaceAll('Connected to PCS Resources','Connected to PCS Support');
behavior=behavior.replace('Hi, I’m Elena. I can help you understand your selected base, PCS Snapshot and relocation estimate. Ask about demographics, DLA or MALT—or try a separate travel scenario.','Hi, I’m Elena, your OrozcoRealty PCS companion. I can explain your selected base, PCS Snapshot, DLA and MALT. When you send a question, I use the page inputs you choose to share. Ask about your move or try a separate travel scenario.');
const client=`/* TOR PCS Support: existing panel with the canonical PCSU Resources behavior. */
(() => {
  'use strict';
  const root=document.getElementById('ask-elena-shell');if(!root||root.dataset.pcsReady)return;root.dataset.pcsReady='1';
  const controls=document.createElement('details');controls.className='ae-pcs-controls';
  controls.innerHTML='<summary>Page sharing &amp; new chat</summary><div class="ae-pcs-control-body"><label><input type="checkbox" class="amy-share" checked> Use this page’s inputs</label><p class="amy-section"></p><p class="amy-context-text"></p><p>Sending shares selected PCS inputs with TheWing for calculations and AI explanation. Chat stays in page memory and clears on reload. Estimates are not entitlement decisions.</p><button type="button" class="amy-reset">New chat</button></div>';
  const statusNode=document.createElement('p');statusNode.className='amy-status ae-typing';statusNode.setAttribute('role','status');
  root.querySelector('#ae-chat').append(controls,statusNode);
${behavior}
})();
`;
new Function(client);
let embed=reference;
const oldScripts=[...reference.matchAll(/<script>[\s\S]*?<\/script>/g)];
if(oldScripts.length!==2)throw Error('Review the installed dialog scripts before building.');
embed=embed.replace(oldScripts[0][0],'<script>\n'+client+'\n</script>');
embed=embed.replace('data-endpoint="https://theorozcorealty.netlify.app/.netlify/functions/ask-elena"','data-endpoint="https://thewing.netlify.app/api/pcsu-resources-elena"');
embed=embed.replace('Your homeownership guide','Your PCS support guide').replace('Realtor &amp; Financial Expert.','Your Air Force PCS companion.');
embed=embed.replace('OrozcoRealty • A.I.-Powered Real Estate Intelligence','OrozcoRealty • A.I.-Powered PCS Support');
embed=embed.replace('placeholder="Ask Elena anything…"','placeholder="Ask Elena about your PCS…" maxlength="3000" aria-label="Your PCS question for Elena"');
embed=embed.replace('<div class="ae-chat" id="ae-chat">','<div class="ae-chat" id="ae-chat" role="log" aria-label="Conversation with Elena" aria-live="polite" aria-relevant="additions">');
const shortcuts=[
 ['My PCS Snapshot','Explain my current PCS Snapshot, including what is still missing.'],
 ['Base Demographics','Explain the demographics and housing data for my selected base, including source dates.'],
 ['DLA Allowance','Explain DLA and how it is included or excluded in my relocation estimate.'],
 ['MALT Mileage','Explain MALT for my current route, including the mileage, vehicles and rate date used.'],
 ['PCS Benefits','Explain how DLA, MALT, per diem and temporary lodging differ, and what I should confirm before my move.']
];
embed=embed.replace(/(<div class="ae-links">)[\s\S]*?(<\/div>)/,(_,a,b)=>a+'\n'+shortcuts.map(([label,question])=>`        <button type="button" class="ae-link-btn" data-question="${question}">${label}</button>`).join('\n')+'\n      '+b);
// Only new answer content is styled; all original panel rules remain byte-for-byte.
const additions=`
#ask-elena-shell button.ae-link-btn{text-align:left;width:100%}
#ask-elena-shell .amy-facts{white-space:normal;margin:12px 0 0;border-top:1px solid var(--ae-line)}
#ask-elena-shell .amy-facts>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;padding:8px 0;border-bottom:1px solid var(--ae-line)}
#ask-elena-shell .amy-facts dt{font-size:12px;color:var(--ae-muted)}
#ask-elena-shell .amy-facts dd{margin:0;color:var(--ae-gold2);font-weight:700}
#ask-elena-shell .amy-scenario{margin-top:12px;white-space:normal}
#ask-elena-shell .amy-scenario summary{cursor:pointer;color:var(--ae-gold2)}
#ask-elena-shell .amy-scenario p{font-size:12px;line-height:1.5;margin:8px 0 0}
#ask-elena-shell .amy-sources{display:flex;flex-direction:column;gap:8px;margin-top:12px;white-space:normal}
#ask-elena-shell .amy-sources a{color:var(--ae-gold2);font-size:12px;text-decoration:underline;overflow-wrap:anywhere}
#ask-elena-shell .ae-pcs-controls{color:var(--ae-muted);font-size:11px;flex:none}
#ask-elena-shell .ae-pcs-controls summary{cursor:pointer;text-decoration:underline}
#ask-elena-shell .ae-pcs-control-body{padding:10px 0;line-height:1.5}
#ask-elena-shell .ae-pcs-control-body label{display:flex;align-items:center;gap:6px}
#ask-elena-shell .ae-pcs-control-body p{margin:8px 0}
#ask-elena-shell .amy-reset{padding:0;border:0;background:none;color:var(--ae-gold2);text-decoration:underline;cursor:pointer;font-size:12px}
#ask-elena-shell .amy-status{margin:0;color:var(--ae-muted);flex:none}
#ask-elena-shell .amy-status:empty{display:none}
`;
embed=embed.replace(oldScripts[1][0],`<style>${additions}</style>\n${oldScripts[1][0]}`);
embed=embed.replace('OpenAI-First Wiring via ask-elena.js','PCS Support via the shared TheWing Resources service').replace('- Public chat sends message text directly','- Public chat sends current PCS inputs and bounded conversation history').replace('- Preserved ask-elena endpoint wiring','- Shared PCSU PCS calculations, base records and source links');
if(embed.length>=50000||embed.includes('theorozcorealty.netlify.app')||embed.includes('new-real-estate-purchase'))throw Error('Invalid embed build.');
fs.writeFileSync('TOR-PCS-Elena/panel.js',client);
fs.writeFileSync('Webflow/TOR-PCS-Elena.html',embed);
console.log('Built TOR PCS Elena: '+embed.length+' characters; original panel CSS and dialog retained.');
