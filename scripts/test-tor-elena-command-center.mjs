import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Elena keeps the exact Amy context, transport, history, tools and source rendering behavior',()=>{
  const amy=read('PCSU-Ask-Amy/panel.js'),elena=read('TOR-Ask-Elena/panel.js');
  const begin='    const $=s=>root.querySelector(s)',end='    lastIncome=JSON.stringify(income());';
  const shared=amy.slice(amy.indexOf(begin),amy.indexOf(end)).replaceAll('Amy','Elena');
  const actual=elena.slice(elena.indexOf(begin),elena.indexOf('    const shortcuts='));
  assert.equal(actual.trim(),shared.trim());
  assert.match(elena,/https:\/\/thewing.netlify.app\/api\/pcsu-ask-amy/);
  assert.match(elena,/destination\.click\(\)/);
  new Function(elena);
});

test('Elena embed retains only the reference UX, is isolated and fits Webflow',()=>{
  const embed=read('Webflow/TOR-Ask-Elena-Command-Center.html'),markup=read('TOR-Ask-Elena/panel.html'),css=read('TOR-Ask-Elena/panel.css');
  assert(embed.length<50000);
  assert(!/profile-by-email|localStorage|sessionStorage|type="email"|theorozcorealty\.netlify|supabase/i.test(embed));
  assert(!/Ask Amy|Conversation with Amy|Your question for Amy/.test(embed.replace(/<!--[\s\S]*?-->/g,'')));
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
  assert.match(markup,/69d8372486a31818a04707cc_ElenaProfile\.jpg/);
  assert.match(markup,/class="amy-panel"[^>]*hidden/);
  assert.match(markup,/class="amy-share" checked/);
  assert.match(markup,/aria-live="polite"/);
  assert.match(css,/grid-template-columns:280px minmax\(0,1fr\)/);
  assert.match(css,/Gilda Display/);assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/max-width:760px/);
  // The canonical PCSU presentation remains available and unchanged in identity.
  assert.match(read('PCSU-Ask-Amy/panel.js'),/Ask Amy/);
});
