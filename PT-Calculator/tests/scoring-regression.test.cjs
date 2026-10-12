const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const enginePath = path.join(__dirname, "..", "ptcalculator.js");
const source = fs.readFileSync(enginePath, "utf8");

function createEngine(overrides = {}) {
  const defaults = {
    gender: "male",
    ageGroup: "30–34",
    heightSlider: "70",
    waistSlider: "34",
    strengthEvent: "Push-Ups",
    strengthSlider: "44",
    enduranceEvent: "Sit-Ups",
    coreSlider: "38",
    cardioEvent: "2.0 Mile Run",
    cardioSlider: "1005"
  };
  const controls = Object.fromEntries(
    Object.entries({ ...defaults, ...overrides }).map(([key, value]) => [
      `#${key}`,
      { value: String(value) }
    ])
  );
  const root = {
    querySelector(selector) {
      return controls[selector] || (controls[selector] = { value: "" });
    }
  };
  const context = {
    console,
    document: { getElementById: () => root },
    globalThis: null,
    controls
  };
  context.globalThis = context;
  const injection = `globalThis.__ptTest = {
    TABLES, SCORE_CAPS, MIN_PASS, computeScores, scoreCategory,
    componentMinimumsMet, scoreHigherBetter, scoreTimeLowerBetter,
    getWHtRScore, truncateWHtR
  };
  return;`;
  const instrumented = source.replace("  //#8) INSIGHTS", `  ${injection}\n  //#8) INSIGHTS`);
  assert.notEqual(instrumented, source, "test hook marker must exist");
  vm.runInNewContext(instrumented, context, { filename: "ptcalculator.js" });
  return context.__ptTest;
}

test("PFRA push-up row: male age 30–34 earns 3.0 at 26 and 27 reps", () => {
  const engine = createEngine();
  const key = "30-34_male";
  for (const reps of [26, 27]) {
    assert.equal(
      engine.scoreHigherBetter(reps, engine.TABLES.push.rows, key),
      3,
      `${reps} reps must score 3.0`
    );
  }
});

test("the corrected push-up threshold restores the 75.0 Satisfactory assessment", () => {
  const result = createEngine({
    waistSlider: 38,
    strengthSlider: 26,
    coreSlider: 44,
    cardioSlider: 906
  }).computeScores();
  assert.equal(result.strengthScore, 3);
  assert.equal(result.total, 75);
  assert.equal(result.category, "Satisfactory");
});

test("score labels around 90 retain the explicit AFMAN thresholds", () => {
  const { scoreCategory } = createEngine();
  assert.equal(scoreCategory(89.9, true), "Satisfactory");
  assert.equal(scoreCategory(90.1, true), "Excellent");
});

test.todo("exactly 90.0 category requires direct visual verification of the AFMAN page; do not lock an unsupported rating");

test("WHtR truncates to hundredths before chart lookup", () => {
  const { getWHtRScore, truncateWHtR } = createEngine();
  assert.equal(truncateWHtR(0.549), 0.54);
  assert.equal(getWHtRScore(0.549), getWHtRScore(0.54));
});

test("minimum component failures force an Unsatisfactory classification", () => {
  const engine = createEngine();
  assert.equal(engine.scoreCategory(100, false), "Unsatisfactory");
  assert.equal(engine.componentMinimumsMet({
    strengthPassed: true,
    corePassed: true,
    cardioPassed: false
  }), false);
});

test("alternative strength, core, and cardio modalities return finite scores", () => {
  const cases = [
    { strengthEvent: "Hand-Release Push-Ups", strengthSlider: 38 },
    { enduranceEvent: "Cross-Legged Reverse Crunch", coreSlider: 38 },
    { enduranceEvent: "Forearm Plank", coreSlider: 120 },
    { cardioEvent: "20m HAMR", cardioSlider: 45 }
  ];
  for (const overrides of cases) {
    const result = createEngine(overrides).computeScores();
    assert.ok(Number.isFinite(result.strengthScore));
    assert.ok(Number.isFinite(result.coreScore));
    assert.ok(Number.isFinite(result.cardioScore));
  }
});

test("walk stays pass/fail and does not invent an adjusted total", () => {
  const passing = createEngine({
    ageGroup: "40–44",
    cardioEvent: "2 km Walk (medical only)",
    cardioSlider: 983
  }).computeScores();
  const failing = createEngine({
    ageGroup: "40–44",
    cardioEvent: "2 km Walk (medical only)",
    cardioSlider: 984
  }).computeScores();
  assert.equal(passing.walkPassed, true);
  assert.equal(passing.category, "Walk-Pass");
  assert.equal(passing.total, null);
  assert.equal(failing.walkPassed, false);
  assert.equal(failing.category, "Walk-Fail");
  assert.equal(failing.total, null);
});

test("invalid, missing-standard, and extreme inputs do not throw or exceed caps", () => {
  const engine = createEngine({
    ageGroup: "Unknown",
    gender: "unknown",
    heightSlider: 0,
    waistSlider: 50,
    strengthSlider: "not-a-number",
    coreSlider: Infinity,
    cardioSlider: 100000
  });
  const result = engine.computeScores();
  assert.ok(Number.isFinite(result.total));
  assert.ok(result.total >= 0 && result.total <= 100);
  assert.ok(result.warnings.length > 0);
  assert.ok(engine.scoreHigherBetter(100000, engine.TABLES.push.rows, "30-34_male") <= 15);
});
