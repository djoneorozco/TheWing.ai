/**
 * Lightweight regression checks for Public Ask Amy session-fresh rules.
 * Run: node webflow-embeds/pcsu-ask-amy-hud.session.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hudPath = path.join(__dirname, "pcsu-ask-amy-hud.html");
const source = fs.readFileSync(hudPath, "utf8");

assert.match(source, /function ssGet\(/);
assert.match(source, /function ssSet\(/);
assert.match(source, /function ssDel\(/);
assert.match(source, /pcsunited\.resources\.public-session\.v1/);
assert.match(source, /startFreshPublicSession\(/);
assert.match(source, /absorbBasicBrainHandoff\(/);

// Conversation keys must persist via sessionStorage helpers, not lsSet.
const threadSave = source.match(
  /function saveThread\([\s\S]*?return cleaned;\s*}/
)[0];
assert.match(threadSave, /ssSet\(KEY_THREAD/);
assert.doesNotMatch(threadSave, /lsSet\(KEY_THREAD/);

const memorySave = source.match(
  /function saveMemory\([\s\S]*?return clean;\s*}/
)[0];
assert.match(memorySave, /ssSet\(KEY_MEMORY/);
assert.doesNotMatch(memorySave, /lsSet\(KEY_MEMORY/);

const cidFn = source.match(/function getCID\([\s\S]*?return id;\s*}/)[0];
assert.match(cidFn, /ssGet\(KEY_CID\)|ssSet\(KEY_CID/);
assert.doesNotMatch(cidFn, /lsGet\(KEY_CID\)|lsSet\(KEY_CID/);

// Public Amy must not send member identity / Authorization.
assert.doesNotMatch(source, /getSupabaseAccessToken/);
assert.doesNotMatch(source, /headers\.Authorization/);
assert.doesNotMatch(
  source,
  /identity:\s*\n\s*pcsContext\.identity/
);
assert.doesNotMatch(
  source,
  /session:\s*\n\s*pcsContext\.session/
);

// Must not auto-load historical localStorage PCS objects.
assert.doesNotMatch(source, /pcsunited\.profile\.v1/);
assert.doesNotMatch(source, /pcsunited\.compensation\.v1/);
assert.doesNotMatch(source, /pcsunited\.mortgage\.v1/);
assert.doesNotMatch(source, /pcsunited\.identity\.v1/);
assert.doesNotMatch(source, /pcsunited\.session\.v1/);

// One-time BasicBrain handoff + fresh boot behavior.
assert.match(source, /pcsunited\.basicbrain\.handoff\.v1/);
assert.match(source, /lsDel\(KEY_BASICBRAIN_HANDOFF\)/);
assert.match(
  source,
  /Every Resources page load starts as a first-time visitor/
);

console.log("pcsu-ask-amy-hud.session.test.mjs: all checks passed");
