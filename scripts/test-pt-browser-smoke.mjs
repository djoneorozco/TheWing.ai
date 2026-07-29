/**
 * Browser PT Calculator smoke checks (no DOM server required).
 * Validates Ask Amy bridge API surface in ptcalculator.js.
 * Run: node scripts/test-pt-browser-smoke.mjs
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const src = fs.readFileSync(
  new URL("../PT-Calculator/ptcalculator.js", import.meta.url),
  "utf8"
);

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("PASS", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL", name, err.message);
  }
}

test("file contains bridge API", () => {
  assert.match(src, /window\.PCSUnitedPTCalculator\s*=/);
  assert.match(src, /getData\s*\(/);
  assert.match(src, /calculate\s*\(/);
  assert.match(src, /reset\s*\(/);
});

test("dispatches required events", () => {
  assert.match(src, /pcsunited:pt-calculator-ready/);
  assert.match(src, /pcsunited:pt-calculator-updated/);
  assert.match(src, /source:\s*"pcsunited-pt-calculator"/);
});

test("bridge payload includes required fields", () => {
  for (const key of [
    "strength_option",
    "core_option",
    "cardio_option",
    "component_scores",
    "total_score",
    "rating",
    "component_minimums_met",
    "whtr",
    "source_version"
  ]) {
    assert.match(src, new RegExp(key));
  }
});

test("no storage in bridge section", () => {
  const bridge = src.split("ASK AMY DATA BRIDGE")[1] || "";
  assert.equal(/localStorage|sessionStorage/.test(bridge), false);
});

test("walk option remains available after audit", () => {
  assert.match(src, /2 km Walk|two_kilometer_walk|scoreWalk/);
  assert.match(src, /TABLES\.walk/);
});

test("simulate bridge object contract", () => {
  const sandbox = {
    window: {
      dispatchEvent(evt) {
        sandbox._events.push(evt.type);
      }
    },
    document: {
      getElementById() {
        return null;
      }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    _events: []
  };
  // Calculator exits early without #af-pt-shell; ensure that does not throw.
  vm.runInNewContext(src, sandbox, { timeout: 2000 });
  assert.equal(sandbox.window.PCSUnitedPTCalculator, undefined);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
