// Build paste-ready controls from the same source tested in the standalone page.
import {readFile,writeFile} from 'node:fs/promises';
const base = new URL('../Military-Mortgage/', import.meta.url);
const css = await readFile(new URL('controls.css',base),'utf8');
const js = await readFile(new URL('controls.js',base),'utf8');
const frame = `<!-- PCSUnited Military Mortgage: Embed 1. Requires the updated Military-Mortgage deployment. -->
<iframe id="pcsu-mortgage-frame" src="https://thewing.netlify.app/Military-Mortgage/?embedded=1" title="Military Mortgage Calculator" referrerpolicy="origin" style="display:block;width:100%;height:660px;border:0;border-radius:24px;" loading="eager"></iframe>\n`;
const controls = `<!-- PCSUnited Military Mortgage: Embed 2. Place on the same Webflow page as Embed 1. -->
<style>${css}</style>
<nav class="pcsu-mm-controls" data-mortgage-controls aria-label="Mortgage views">
  <button type="button" data-mm-select="calculator" aria-pressed="true" aria-controls="pcsu-mortgage-frame">Calculator</button>
  <button type="button" data-mm-select="visualization" aria-pressed="false" aria-controls="pcsu-mortgage-frame">Visualization</button>
  <button type="button" data-mm-select="summary" aria-pressed="false" aria-controls="pcsu-mortgage-frame">Summary</button>
  <p data-mm-controls-status role="status">Loading calculator…</p>
</nav>
<script>${js}</script>\n`;
await writeFile(new URL('embed/calculator.html',base),frame);
await writeFile(new URL('embed/view-buttons.html',base),controls);
// Preview the exact generated embeds against this server, rather than production.
await writeFile(new URL('embed-preview.html',base),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Military Mortgage Webflow embed preview</title><style>body{margin:0;background:#171e22}</style></head><body>${frame.replace('https://thewing.netlify.app','')}${controls}</body></html>`);
console.log('Built calculator.html, view-buttons.html and embed-preview.html.');

const page = await readFile(new URL('index.html',base),'utf8');
const main = page.slice(page.indexOf('<main '), page.indexOf('</main>')+7).replace('data-mortgage-api="/api/mortgage"','data-mortgage-api="https://thewing.netlify.app/api/mortgage"');
let scopedCSS = await readFile(new URL('style.css',base),'utf8');
scopedCSS = scopedCSS.replace(/(^|\n)html[^{}]*\{[^{}]*\}/g,'').replace(/(^|\n)\s*body\s*\{[^{}]*\}/g,'');
const inline = `<!-- PCSUnited Military Mortgage: same-page calculator embed. Load the paired view-buttons embed on this page. -->
<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Barlow:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${scopedCSS}</style>
${main}
<script src="https://thewing.netlify.app/Military-Mortgage/app.js" defer></script>
<script src="https://thewing.netlify.app/Military-Mortgage/views.js" defer></script>\n`;
await writeFile(new URL('embed/calculator-inline.html',base),inline);
await writeFile(new URL('inline-preview.html',base),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Same-page mortgage embed preview</title><style>body{margin:0;background:#171e22}</style></head><body>${inline.replaceAll('https://thewing.netlify.app','')}${controls}</body></html>`);
console.log('Built same-page calculator-inline.html and inline-preview.html.');
