/**
 * Lightweight regression checks for Public Ask Amy session-fresh rules.
 * Run: node webflow-embeds/pcsu-ask-amy-hud.session.test.mjs
 *
 * Validates the Webflow-compressed embed and the readable source.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compressedPath = path.join(__dirname, "pcsu-ask-amy-hud.html");
const sourcePath = path.join(__dirname, "pcsu-ask-amy-hud.src.html");

const compressed = fs.readFileSync(compressedPath, "utf8");
const source = fs.existsSync(sourcePath)
  ? fs.readFileSync(sourcePath, "utf8")
  : compressed;

assert.ok(
  compressed.length <= 49500,
  `compressed HUD must be <= 49500 chars for Webflow, got ${compressed.length}`
);
assert.ok(
  compressed.length >= 20000,
  `compressed HUD looks unexpectedly small: ${compressed.length}`
);

function assertHudContract(label, text) {
  assert.match(text, /function ssGet\(/, label);
  assert.match(text, /function ssSet\(/, label);
  assert.match(text, /function ssDel\(/, label);
  assert.match(text, /pcsunited\.resources\.public-session\.v1/, label);
  assert.match(text, /startFreshPublicSession\(/, label);
  assert.match(text, /absorbBasicBrainHandoff\(/, label);

  const threadSave = text.match(
    /function saveThread\([\s\S]*?return cleaned;\s*}/
  )[0];
  assert.match(threadSave, /ssSet\(KEY_THREAD/);
  assert.doesNotMatch(threadSave, /lsSet\(KEY_THREAD/);

  const memorySave = text.match(
    /function saveMemory\([\s\S]*?return clean;\s*}/
  )[0];
  assert.match(memorySave, /ssSet\(KEY_MEMORY/);
  assert.doesNotMatch(memorySave, /lsSet\(KEY_MEMORY/);

  const cidFn = text.match(/function getCID\([\s\S]*?return id;\s*}/)[0];
  assert.match(cidFn, /ssGet\(KEY_CID\)|ssSet\(KEY_CID/);
  assert.doesNotMatch(cidFn, /lsGet\(KEY_CID\)|lsSet\(KEY_CID/);

  assert.doesNotMatch(text, /getSupabaseAccessToken/);
  assert.doesNotMatch(text, /headers\.Authorization/);
  assert.doesNotMatch(text, /pcsContext\.identity/);
  assert.doesNotMatch(text, /pcsContext\.session/);

  assert.doesNotMatch(text, /pcsunited\.profile\.v1/);
  assert.doesNotMatch(text, /pcsunited\.compensation\.v1/);
  assert.doesNotMatch(text, /pcsunited\.mortgage\.v1/);
  assert.doesNotMatch(text, /pcsunited\.identity\.v1/);
  assert.doesNotMatch(text, /pcsunited\.session\.v1/);

  assert.match(text, /pcsunited\.basicbrain\.handoff\.v1/);
  assert.match(text, /lsDel\(KEY_BASICBRAIN_HANDOFF\)/);
  assert.match(text, /inputEl/);
  assert.doesNotMatch(text, /in putEl/);
  assert.match(text, /\.includes\(/);
  assert.doesNotMatch(text, /\.in cludes\(/);
}

assertHudContract("compressed", compressed);
assertHudContract("source", source);

assert.match(
  source,
  /Every Resources page load starts as a first-time visitor/
);

console.log(
  `pcsu-ask-amy-hud.session.test.mjs: all checks passed (compressed ${compressed.length} chars)`
);
