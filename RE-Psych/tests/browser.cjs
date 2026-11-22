/* Run with PLAYWRIGHT_MODULE pointing to an installed playwright module if not on NODE_PATH. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
const BASE=process.env.RE_PSYCH_URL||'http://127.0.0.1:8776/RE-Psych/';
const fs=require('node:fs');const path=require('node:path');
const shots=process.env.SCREENSHOT_DIR; if(shots)fs.mkdirSync(shots,{recursive:true});
async function shot(page,name){if(shots)await page.screenshot({path:path.join(shots,name+'.png')});}
const opts={headless:true};if(process.env.CHROME_PATH)opts.executablePath=process.env.CHROME_PATH;
(async()=>{const browser=await chromium.launch(opts);let count=0;
async function completeBaseline(page,opts={}){
 await page.goto(BASE);await page.locator('#pcsaiou-trigger').click();await page.locator('#rp-start').click();
 await shot(page,'q1-'+page.viewportSize().width);await page.locator('[data-time="35"]').click();await page.locator('[data-pcsu-fixed-zone] [data-reason="indoor_space"]').click();await page.locator('[data-pcsu-fixed-zone] [data-reason="quiet_privacy"]').click();await page.locator('[data-pcsu-fixed-zone] [data-finish]').click();
 await shot(page,'q2-'+page.viewportSize().width);assert.equal(await page.locator('#pcsaiou-dialog').evaluate(d=>d.scrollTop),0);await page.locator('[data-home="A"]').click();await page.locator('[data-pcsu-home-choice] [data-reason="finishes_design"]').click();await page.locator('[data-pcsu-home-choice] [data-reason="little_updating"]').click();await page.locator('[data-pcsu-home-choice] [data-finish]').click();
 await page.locator('.pcsu-q3-confirm').click();await shot(page,'q4-'+page.viewportSize().width);await page.locator('.ph4-card').filter({has:page.locator('[value="planned"]')}).click();await page.locator('#rp-next').click();
 await page.locator('[data-feature-card="den"]').click();await page.locator('label').filter({has:page.locator('[data-use="den"][value="family_time"]')}).click();
 assert.equal(await page.locator('[data-upkeep-group]').isVisible(),false);
 await page.locator('[data-feature-card="backyard"]').click();await page.locator('label').filter({has:page.locator('[data-upkeep="backyard"][value="less-upkeep"]')}).click();
 await shot(page,'q5-'+page.viewportSize().width);await page.locator('[data-pcsu-features-choice] [data-save]').click();await shot(page,'q6-'+page.viewportSize().width);
 for(const [mode,value] of [['bedrooms','fixed'],['rooms','not-required'],['access','required'],['readiness','ready'],['housing','fixed'],['commute','fixed']])await page.locator('label').filter({has:page.locator(`[data-mode="${mode}"][value="${value}"]`)}).click();
 await page.locator('[data-input="bedrooms"]').fill('3');await page.locator('label').filter({has:page.locator('[data-access="step_free_entry"]')}).click();await page.locator('[data-input="housing"]').fill('2000');await page.locator('[data-input="commute"]').fill('25');await page.locator('[data-pcsu-requirements] [data-save]').click();assert.equal(await page.locator('#rp-followup-intro').isVisible(),true);
}
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)failed.push(r.url());});
await completeBaseline(page);assert.match(await page.locator('#rp-conflict-note').innerText(),/fewer bedrooms/);
await page.locator('#rp-begin-followups').click();
// Editing a follow-up removes its dependent answers before routing again.
const firstQuestion=await page.locator('#rp-question-label').innerText();await page.locator('[data-choice="A"]').click();await page.locator('#rp-confirm').click();await page.locator('#rp-previous-question').click();assert.equal(await page.locator('#rp-question-label').innerText(),firstQuestion);
// A real countdown must pause when the dialog closes and never submit on expiration.
await page.waitForTimeout(400);const before=await page.locator('#pcsaiou-clock').innerText();await page.locator('#pcsaiou-close').click();await page.waitForTimeout(1200);await page.locator('#pcsaiou-trigger').click();assert.equal(await page.locator('#pcsaiou-clock').innerText(),before);
await page.waitForTimeout(10500);assert.equal(await page.locator('#rp-confirm').isDisabled(),true);assert.match(await page.locator('#rp-timer-note').innerText(),/no answer has been assumed/);
let n=0;while(await page.locator('#rp-question').isVisible()) {await page.locator('[data-choice="A"]').click();await page.locator('#rp-confirm').click();assert.ok(++n<=15);}assert.equal(n,6);
await shot(page,'results-desktop');const report=await page.evaluate(()=>window.REPsych.getReport());assert.equal(report.coverage.followupsAnswered,6);assert.equal(report.protectedRequirements.access.requirements[0].id,'step_free_entry');assert.equal(report.protectedRequirements.limits.monthlyHousing.amount,2000);assert.ok(report.reviewBeforeSearching.some(x=>x.id==='commute'));assert.equal(await page.locator('#rp-results script').count(),0);
const downloadPromise=page.waitForEvent('download');await page.locator('#rp-download').click();assert.equal((await downloadPromise).suggestedFilename(),'RE-Psych-home-brief.txt');
assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
// Editing a confirmed baseline clears all adaptive answers and invalidates the brief.
await page.locator('#rp-edit-results').click();await page.locator('[data-pcsu-fixed-zone] [data-edit]').click();assert.equal(await page.evaluate(()=>window.REPsych.getReport()),null);await page.locator('[data-time="15"]').click();await page.locator('[data-pcsu-fixed-zone] [data-unsure]').click();await page.locator('[data-pcsu-fixed-zone] [data-finish]').click();
assert.equal(await page.locator('[data-baseline-step="2"]').isVisible(),true);
assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);count++;
// Real iframe handshake keeps the existing Webflow protocol and rejects other origins.
const embed=await browser.newPage();await embed.goto(new URL('tests/host.html',BASE).href);await embed.waitForFunction(()=>window.messages.some(x=>x.type==='ready'));
const frame=embed.frames().find(f=>f.parentFrame()&&/\/re-psych\//i.test(f.url()));await frame.waitForSelector('#pcsaiou-dialog[open]');
await frame.evaluate(()=>window.dispatchEvent(new MessageEvent('message',{source:window.parent,origin:'https://untrusted.invalid',data:{source:'re-psych-host',version:1,type:'visibility',visible:false}})));
assert.equal(await frame.locator('#pcsaiou-dialog').evaluate(d=>d.open),true);
await frame.locator('#pcsaiou-close').click();await embed.waitForFunction(()=>window.messages.some(x=>x.type==='close'));
await embed.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({source:'re-psych-host',version:1,type:'visibility',visible:true},location.origin));
await frame.waitForSelector('#pcsaiou-dialog[open]');await frame.locator('#rp-start').click();assert.equal(await frame.locator('[data-baseline-step="1"]').isVisible(),true);count++;
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));await completeBaseline(mobile);
await mobile.locator('#rp-begin-followups').click();await mobile.locator('#rp-timer-toggle').click();
let unanswered=0;while(await mobile.locator('#rp-question').isVisible()){await mobile.locator('#rp-skip').click();assert.ok(++unanswered<=15);}assert.ok(unanswered>=10);const unknown=await mobile.evaluate(()=>window.REPsych.getReport());assert.equal(unknown.coverage.followupsAnswered,0);assert.equal(unknown.coverage.followupsReviewed,unanswered);assert.ok(unknown.evidence.every(e=>e.status==='needs-clarification'));assert.ok(Object.values(unknown.followups).every(a=>a.choice===null));
const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);assert.deepEqual(mobileErrors,[]);count++;
await browser.close();console.log(`${count} browser flows passed: desktop complete/edit/export, iframe handshake, mobile uncertain route; timer pause/expiry and asset checks passed.`);
})().catch(e=>{console.error(e);process.exit(1);});
