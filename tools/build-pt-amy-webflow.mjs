#!/usr/bin/env node
/**
 * Rebuild PT Calculator Ask Amy Webflow artifacts from source parts.
 *
 * Sources:
 *   public/ask-amy/pt-calculator-ask-amy.css
 *   public/ask-amy/pt-calculator-ask-amy.markup.html
 *   public/ask-amy/pt-calculator-ask-amy.logic.js
 *
 * Outputs:
 *   public/ask-amy/pt-calculator-ask-amy.webflow.html        (~30k paste)
 *   public/ask-amy/pt-calculator-ask-amy.webflow-loader.html (~350 chars)
 *   public/ask-amy/pt-calculator-ask-amy.js                  (hosted injector)
 *
 * Usage:
 *   node tools/build-pt-amy-webflow.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const askAmy = join(root, "public", "ask-amy");

const css = readFileSync(join(askAmy, "pt-calculator-ask-amy.css"), "utf8").trim();
const markup = readFileSync(join(askAmy, "pt-calculator-ask-amy.markup.html"), "utf8").trim();
const logicSrc = readFileSync(join(askAmy, "pt-calculator-ask-amy.logic.js"), "utf8");

const fontMatch = markup.match(/^(<link[^>]+\/?>)\s*/i);
const fontLink = fontMatch ? fontMatch[1] : "";
const bodyHtml = fontMatch ? markup.slice(fontMatch[0].length) : markup;

mkdirSync("/tmp/pt-amy-build", { recursive: true });
const logicPath = "/tmp/pt-amy-build/logic.js";
const logicMinPath = "/tmp/pt-amy-build/logic.min.js";
writeFileSync(logicPath, logicSrc);

const terser = spawnSync(
  "npx",
  ["--yes", "terser", logicPath, "-c", "-m", "-o", logicMinPath],
  { encoding: "utf8" }
);

if (terser.status !== 0) {
  console.error(terser.stderr || terser.stdout || "terser failed");
  process.exit(1);
}

const logicMin = readFileSync(logicMinPath, "utf8").trim();

const fullPaste =
  "<!-- PCSUnited PT Ask Amy v1.0.0 — compressed for Webflow 50k limit -->\n" +
  (fontLink ? fontLink + "\n" : "") +
  "<style>" +
  css +
  "</style>\n" +
  bodyHtml +
  "\n<script>" +
  logicMin +
  "</script>\n";

writeFileSync(join(askAmy, "pt-calculator-ask-amy.webflow.html"), fullPaste);

const loader =
  "<!-- PCSUnited PT Ask Amy v1.0.0 — paste this into Webflow Custom Code (~350 chars) -->\n" +
  '<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Barlow:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>\n' +
  '<div id="pcsu-pt-amy-root"></div>\n' +
  '<script src="https://thewing.netlify.app/public/ask-amy/pt-calculator-ask-amy.js" defer></script>\n';

writeFileSync(join(askAmy, "pt-calculator-ask-amy.webflow-loader.html"), loader);

const injector =
  '(()=>{"use strict";if(window.__PCSU_PT_ASK_AMY_V100_MOUNTED__)return;' +
  'const STYLE_ID="pcsu-pt-amy-styles-v100",' +
  'FONT_HREF="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Barlow:wght@400;500;600;700;800;900&display=swap",' +
  "CSS_TEXT=" +
  JSON.stringify(css) +
  ",MARKUP=" +
  JSON.stringify(bodyHtml) +
  ";" +
  'function ensureFont(){if(document.querySelector(\'link[data-pcsu-pt-amy-font="1"]\'))return;const e=document.createElement("link");e.rel="stylesheet",e.href=FONT_HREF,e.setAttribute("data-pcsu-pt-amy-font","1"),document.head.appendChild(e)}' +
  'function ensureStyles(){if(document.getElementById(STYLE_ID))return;const e=document.createElement("style");e.id=STYLE_ID,e.textContent=CSS_TEXT,document.head.appendChild(e)}' +
  'function ensureMarkup(){if(!document.getElementById("pcsu-pt-amy-launcher")||!document.getElementById("pcsu-pt-amy-modal")){const e=document.getElementById("pcsu-pt-amy-root")||document.body,t=document.createElement("div");for(t.innerHTML=MARKUP;t.firstChild;)e.appendChild(t.firstChild)}}' +
  "ensureFont();ensureStyles();ensureMarkup();" +
  logicMin +
  "})();";

writeFileSync(join(askAmy, "pt-calculator-ask-amy.js"), injector);

const check = spawnSync("node", ["--check", join(askAmy, "pt-calculator-ask-amy.js")], {
  encoding: "utf8"
});
if (check.status !== 0) {
  console.error(check.stderr || "syntax check failed");
  process.exit(1);
}

function report(label, text) {
  console.log(`${String(text.length).padStart(6)} chars  ${label}  under50k=${text.length < 50000}`);
}

report("webflow full paste", fullPaste);
report("webflow loader", loader);
report("hosted injector js", injector);
