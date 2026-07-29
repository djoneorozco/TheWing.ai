/**
 * Browser/server PT scoring parity test.
 * Fails if any score threshold, minimum, age band, sex mapping,
 * rating rule, or WHtR rule differs between:
 *   - netlify/functions/_share/pt-scoring-core.js (server)
 *   - PT-Calculator/ptcalculator.js (browser)
 *
 * Run: node scripts/test-pt-calculator-parity.mjs
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  ORDER,
  SCORE_CAPS,
  MIN_PASS,
  TABLES,
  roundWHtR,
  getWHtRScore,
  scoreCategory,
  scoreFromTable,
  scoreHigherBetter,
  scoreTimeLowerBetter,
  scoreWalk
} from "../netlify/functions/_share/pt-scoring-core.js";

const browserSrc = fs.readFileSync(
  new URL("../PT-Calculator/ptcalculator.js", import.meta.url),
  "utf8"
);

function extractBrowserTables() {
  const orderMatch = browserSrc.match(/const ORDER = \[([\s\S]*?)\];/);
  const tablesMatch = browserSrc.match(/const TABLES = \{([\s\S]*?)\n  \};/);
  const capsMatch = browserSrc.match(/const SCORE_CAPS = \{([\s\S]*?)\};/);
  const minMatch = browserSrc.match(/const MIN_PASS = \{([\s\S]*?)\};/);
  assert.ok(orderMatch && tablesMatch && capsMatch && minMatch, "browser extracts missing");

  const code = `
    const ORDER = [${orderMatch[1]}];
    function buildMap(arr) {
      const out = {};
      ORDER.forEach((key, i) => { out[key] = arr[i]; });
      return out;
    }
    const SCORE_CAPS = {${capsMatch[1]}};
    const MIN_PASS = {${minMatch[1]}};
    const TABLES = {${tablesMatch[1]}};
    ({ ORDER, SCORE_CAPS, MIN_PASS, TABLES });
  `;
  return vm.runInNewContext(code, {}, { timeout: 5000 });
}

const browser = extractBrowserTables();
let failed = 0;
let passed = 0;

function check(name, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failed += 1;
    console.error("FAIL", name, detail);
  }
}

check(
  "ORDER identical",
  JSON.stringify(ORDER) === JSON.stringify(browser.ORDER)
);
check(
  "SCORE_CAPS identical",
  JSON.stringify(SCORE_CAPS) === JSON.stringify(browser.SCORE_CAPS)
);
check(
  "MIN_PASS identical",
  JSON.stringify(MIN_PASS) === JSON.stringify(browser.MIN_PASS)
);

for (const key of ORDER) {
  check(
    `push max/min ${key}`,
    TABLES.push.max[key] === browser.TABLES.push.max[key] &&
      TABLES.push.min[key] === browser.TABLES.push.min[key]
  );
  check(
    `hrpu max/min ${key}`,
    TABLES.hrpu.max[key] === browser.TABLES.hrpu.max[key] &&
      TABLES.hrpu.min[key] === browser.TABLES.hrpu.min[key]
  );
  check(
    `situp max/min ${key}`,
    TABLES.situp.max[key] === browser.TABLES.situp.max[key] &&
      TABLES.situp.min[key] === browser.TABLES.situp.min[key]
  );
  check(
    `crunch max/min ${key}`,
    TABLES.crunch.max[key] === browser.TABLES.crunch.max[key] &&
      TABLES.crunch.min[key] === browser.TABLES.crunch.min[key]
  );
  check(
    `plank max/min ${key}`,
    TABLES.plank.max[key] === browser.TABLES.plank.max[key] &&
      TABLES.plank.min[key] === browser.TABLES.plank.min[key]
  );
  check(
    `walk passSeconds ${key}`,
    TABLES.walk.passSeconds[key] === browser.TABLES.walk.passSeconds[key]
  );
}

function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i][0] !== b[i][0]) return false;
    for (const key of ORDER) {
      if (a[i][1][key] !== b[i][1][key]) return false;
    }
  }
  return true;
}

check("push rows identical", rowsEqual(TABLES.push.rows, browser.TABLES.push.rows));
check("hrpu rows identical", rowsEqual(TABLES.hrpu.rows, browser.TABLES.hrpu.rows));
check("situp rows identical", rowsEqual(TABLES.situp.rows, browser.TABLES.situp.rows));
check("crunch rows identical", rowsEqual(TABLES.crunch.rows, browser.TABLES.crunch.rows));
check("plank rows identical", rowsEqual(TABLES.plank.rows, browser.TABLES.plank.rows));
check("run rows identical", rowsEqual(TABLES.run, browser.TABLES.run));
check("hamr rows identical", rowsEqual(TABLES.hamr, browser.TABLES.hamr));
check(
  "whtr rows identical",
  JSON.stringify(TABLES.whtr) === JSON.stringify(browser.TABLES.whtr)
);
check("walk passPoints identical", TABLES.walk.passPoints === browser.TABLES.walk.passPoints);

// Rating + WHtR rule parity via shared helpers vs browser source presence
check("rating Excellent threshold present", /total >= 90/.test(browserSrc));
check("rating Satisfactory threshold present", /total >= 75/.test(browserSrc));
check("WHtR round nearest hundredth present", /Math\.round\(Number\(ratio\) \* 100\) \/ 100/.test(browserSrc));
check("WHtR fail at 0.60 present", /rounded >= 0\.60/.test(browserSrc));

// Spot-check live scoring agreement for every threshold row sample.
// Note: some adjacent PFRA rows share identical thresholds; scoring returns
// the highest qualifying points, so server/browser agreement is the authority.
for (const key of ORDER) {
  let ok = true;
  for (const [, map] of TABLES.push.rows) {
    const value = map[key];
    const serverPts = scoreFromTable(TABLES.push, key, value, "higher");
    const browserPts = scoreFromTable(browser.TABLES.push, key, value, "higher");
    if (serverPts !== browserPts) {
      ok = false;
      failed += 1;
      console.error("FAIL push threshold", key, value, serverPts, browserPts);
      break;
    }
  }
  if (ok) {
    passed += 1;
    console.log("PASS push threshold sweep", key);
  }
}

check("WHtR helper 0.494 -> 0.49 / 20", getWHtRScore(0.494) === 20 && roundWHtR(0.494) === 0.49);
check("WHtR helper 0.595 -> 0.60 / 0", getWHtRScore(0.595) === 0 && roundWHtR(0.595) === 0.6);
check(
  "rating rules",
  scoreCategory(90, true) === "Excellent" &&
    scoreCategory(75, true) === "Satisfactory" &&
    scoreCategory(74.9, true) === "Unsatisfactory" &&
    scoreCategory(100, false) === "Unsatisfactory"
);
check(
  "run/hamr/walk helpers",
  scoreTimeLowerBetter(805, TABLES.run, "under25_male") === 50 &&
    scoreHigherBetter(87, TABLES.hamr, "under25_male") === 50 &&
    scoreWalk(983, "40-44_male") === 35 &&
    scoreWalk(984, "40-44_male") === 0
);

// Bridge API presence
check("browser exposes PCSUnitedPTCalculator API", /PCSUnitedPTCalculator/.test(browserSrc));
check("browser dispatches ready event", /pcsunited:pt-calculator-ready/.test(browserSrc));
check("browser dispatches updated event", /pcsunited:pt-calculator-updated/.test(browserSrc));
check(
  "browser bridge avoids storage APIs",
  !/\blocalStorage\s*\.|\bsessionStorage\s*\./.test(
    browserSrc.split("ASK AMY DATA BRIDGE")[1] || ""
  )
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
