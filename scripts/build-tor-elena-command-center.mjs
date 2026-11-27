// Elena presentation; Financial Guidance behavior is generated from the working Amy client.
import fs from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const write=(p,s)=>fs.writeFileSync(new URL(p,root),s);
const scope='#tor-ask-elena-command';
function scopedCSS(source){
  const css=source.replace(/\/\*[\s\S]*?\*\//g,'');let result='',at=0;
  while(at<css.length){
    const open=css.indexOf('{',at);if(open<0)break;
    const selector=css.slice(at,open).trim();let depth=1,end=open+1;
    for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
    if(depth)throw Error('Unbalanced reference CSS');
    const body=css.slice(open+1,end-1);
    if(selector.startsWith('@media'))result+=selector+'{'+scopedCSS(body)+'}\n';
    else if(!selector.startsWith('@'))result+=selector.split(',').map(s=>s.trim().includes('#ask-elena-shell')?s.trim().replaceAll('#ask-elena-shell',scope):scope+' '+s.trim()).join(',')+'{'+body+'}\n';
    at=end;
  }return result;
}
const markup=read('TOR-Ask-Elena/panel.html');
let client=read('PCSU-Ask-Amy/panel.js');
const start=client.indexOf('    root.innerHTML='),end=client.indexOf('    const $=s=>root.querySelector(s)');
if(start<0||end<=start)throw Error('Amy presentation boundary changed; review the shared client before generating.');
client=client.slice(0,start)+'    root.innerHTML='+JSON.stringify(markup)+';\n'+client.slice(end);
client=client.replace("document.getElementById('pcsu-ask-amy')","document.getElementById('tor-ask-elena-command')")
 .replace(/    const avatar='[^']+';\n/,'').replaceAll('Amy','Elena');
const extras=`
    const shortcuts=$('.elena-shortcuts');
    if(window.matchMedia('(max-width:760px)').matches)shortcuts.open=false;
    $('.elena-analysis').addEventListener('click',()=>{
      const destination=document.getElementById('pcsu-analysis-link');
      if(destination){destination.click();}else status.textContent='Use the Financial Analysis button on Financial Guidance to bring your figures with you.';
    });
`;
client=client.replace('    lastIncome=JSON.stringify(income());',extras+'    lastIncome=JSON.stringify(income());');
const css=scopedCSS(read('TOR-Ask-Elena/command-center-reference.css'))+'\n'+read('TOR-Ask-Elena/floating.css');
write('TOR-Ask-Elena/panel.js',client);write('TOR-Ask-Elena/panel.css',css);
const fonts='<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Barlow:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">';
const mount='<div id="tor-ask-elena-command" data-endpoint="https://thewing.netlify.app/api/pcsu-ask-amy" data-tool-origin="https://thewing.netlify.app"></div>';
const embed='<!-- TOR Ask Elena Command Center. Replace only the current Ask Amy embed. -->\n'+fonts+'\n<style>\n'+css+'</style>\n'+mount+'\n<script>\n'+client+'</script>\n';
if(embed.length>=50000)throw Error('Webflow embed exceeds 50,000 characters');
if(/profile-by-email|localStorage|type="email"|theorozcorealty\.netlify/.test(embed))throw Error('Legacy account/backend behavior must not enter the Elena presentation');
write('Webflow/TOR-Ask-Elena-Command-Center.html',embed);
console.log('Built Elena Command Center: '+embed.length+' characters; shared Amy runtime retained.');
