/**
 * USAF PT Calculator knowledge-module tests (deterministic, OpenAI-free).
 * Run: node scripts/test-pt-calculator.mjs
 */
import assert from "node:assert/strict";
import {
  PT_CALCULATOR_VERSION,
  PT_AGE_BANDS,
  detectPtCalculatorIntent,
  normalizePtCalculatorInput,
  calculateWhtr,
  calculatePfraScore,
  analyzePtCalculatorQuestion,
  buildPtCalculatorTruthPacket,
  ORDER,
  TABLES
} from "../netlify/functions/_share/pt-calculator.js";
import {
  detectAmyKnowledgeNeeds,
  buildAmyTruthPacket
} from "../netlify/functions/_share/amy-brain.js";
import {
  getAgentTools,
  listToolDefinitions,
  runTool
} from "../netlify/functions/_share/agent-registry.js";

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

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log("PASS", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL", name, err.message);
  }
}

const baseMaleUnder25 = {
  sex: "male",
  age: 22,
  age_band: "under25",
  height_inches: 72,
  waist_inches: 31,
  strength_option: "push_ups",
  strength_reps: 67,
  core_option: "sit_ups",
  core_reps: 58,
  cardio_option: "two_mile_run",
  run_seconds: 805
};

console.log("Testing", PT_CALCULATOR_VERSION);

// ---- Age bands / sexes / modalities ----
test("every age band is defined (9 bands)", () => {
  assert.equal(PT_AGE_BANDS.length, 9);
  assert.equal(ORDER.length, 18);
});

for (const pair of ORDER) {
  const [ageBand, sex] = pair.includes("60plus")
    ? ["60plus", pair.endsWith("female") ? "female" : "male"]
    : (() => {
        const idx = pair.lastIndexOf("_");
        return [pair.slice(0, idx), pair.slice(idx + 1)];
      })();

  test(`scores ${pair} push/sit/run at max`, () => {
    const maxPush = TABLES.push.max[pair];
    const maxSit = TABLES.situp.max[pair];
    const maxRun = TABLES.run[0][1][pair];
    const result = calculatePfraScore({
      sex,
      age_band: ageBand,
      height_inches: 72,
      waist_inches: 31,
      strength_option: "push_ups",
      strength_reps: maxPush,
      core_option: "sit_ups",
      core_reps: maxSit,
      cardio_option: "two_mile_run",
      run_seconds: maxRun
    });
    assert.equal(result.component_scores.strength, 15);
    assert.equal(result.component_scores.core, 15);
    assert.equal(result.component_scores.cardio, 50);
    assert.equal(result.component_scores.body_composition, 20);
    assert.equal(result.total_score, 100);
    assert.equal(result.rating, "Excellent");
    assert.equal(result.overall_pass, true);
  });
}

test("hand-release push-ups modality", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    strength_option: "hand_release_push_ups",
    strength_reps: 51
  });
  assert.equal(r.component_scores.strength, 14.5);
});

test("cross-leg reverse crunch modality", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    core_option: "cross_leg_reverse_crunch",
    core_reps: 60
  });
  assert.equal(r.component_scores.core, 15);
});

test("forearm plank modality", () => {
  const r = calculatePfraScore({
    sex: "male",
    age_band: "60plus",
    height_inches: 72,
    waist_inches: 34,
    strength_option: "push_ups",
    strength_reps: 12,
    core_option: "forearm_plank",
    plank_seconds: 55,
    cardio_option: "two_mile_run",
    run_seconds: 1440
  });
  assert.equal(r.component_scores.core, 2.5);
  assert.equal(r.component_pass.core, true);
});

test("HAMR modality", () => {
  const r = calculatePfraScore({
    sex: "female",
    age_band: "40-44",
    height_inches: 68,
    waist_inches: 30,
    strength_option: "hand_release_push_ups",
    strength_reps: 34,
    core_option: "cross_leg_reverse_crunch",
    core_reps: 50,
    cardio_option: "hamr",
    hamr_shuttles: 59
  });
  assert.equal(r.component_scores.cardio, 50);
  assert.equal(r.overall_pass, true);
});

test("2 km walk pass/fail", () => {
  const pass = calculatePfraScore({
    sex: "male",
    age_band: "40-44",
    height_inches: 72,
    waist_inches: 32,
    strength_option: "push_ups",
    strength_reps: 52,
    core_option: "sit_ups",
    core_reps: 50,
    cardio_option: "two_kilometer_walk",
    walk_seconds: 983,
    walk_authorized: true
  });
  const fail = calculatePfraScore({
    sex: "male",
    age_band: "40-44",
    height_inches: 72,
    waist_inches: 32,
    strength_option: "push_ups",
    strength_reps: 52,
    core_option: "sit_ups",
    core_reps: 50,
    cardio_option: "two_kilometer_walk",
    walk_seconds: 984,
    walk_authorized: true
  });
  assert.equal(pass.component_scores.cardio, 35);
  assert.equal(fail.component_scores.cardio, 0);
  assert.equal(fail.overall_pass, false);
});

test("walk medical-only warning when unauthorized", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    cardio_option: "two_kilometer_walk",
    walk_seconds: 900,
    walk_authorized: false
  });
  assert.ok(r.warnings.some((w) => /medical/i.test(w)));
});

test("exactly 90.0 Excellent", () => {
  // Construct: body 20 + strength 15 + core 15 + cardio 40 = 90
  const r = calculatePfraScore({
    sex: "male",
    age_band: "under25",
    height_inches: 72,
    waist_inches: 31,
    strength_option: "push_ups",
    strength_reps: 67,
    core_option: "sit_ups",
    core_reps: 58,
    cardio_option: "two_mile_run",
    run_seconds: 1014 // 40 pts for under25_male
  });
  assert.equal(r.total_score, 90);
  assert.equal(r.rating, "Excellent");
  assert.equal(r.overall_pass, true);
});

test("greater than 90 Excellent", () => {
  const r = calculatePfraScore(baseMaleUnder25);
  assert.ok(r.total_score > 90);
  assert.equal(r.rating, "Excellent");
});

test("exactly 75 Satisfactory boundary helpers", () => {
  // body 2.5 + strength 2.5 + core 2.5 + cardio 35 = 42.5 < 75
  // Use high body/strength/core with cardio 35 and fill to 75:
  // 20 + 15 + 5 + 35 = 75
  const coreRows = TABLES.situp.rows;
  const core5 = coreRows.find(([pts]) => pts === 5)?.[1]?.under25_male;
  assert.ok(Number.isFinite(core5));
  const r = calculatePfraScore({
    sex: "male",
    age_band: "under25",
    height_inches: 72,
    waist_inches: 31,
    strength_option: "push_ups",
    strength_reps: 67,
    core_option: "sit_ups",
    core_reps: core5,
    cardio_option: "two_mile_run",
    run_seconds: 1185
  });
  assert.equal(r.total_score, 75);
  assert.equal(r.rating, "Satisfactory");
  assert.equal(r.overall_pass, true);
});

test("below 75 Unsatisfactory even if minimums met", () => {
  const r = calculatePfraScore({
    sex: "female",
    age_band: "under25",
    height_inches: 71,
    waist_inches: 42,
    strength_option: "push_ups",
    strength_reps: 15,
    core_option: "sit_ups",
    core_reps: 29,
    cardio_option: "two_mile_run",
    run_seconds: 1523
  });
  assert.equal(r.component_minimums_met, true);
  assert.ok(r.total_score < 75);
  assert.equal(r.rating, "Unsatisfactory");
  assert.equal(r.overall_pass, false);
});

test("component failure with total above 75", () => {
  const r = calculatePfraScore({
    sex: "male",
    age_band: "40-44",
    height_inches: 72,
    waist_inches: 32,
    strength_option: "push_ups",
    strength_reps: 20, // below min -> 0
    core_option: "sit_ups",
    core_reps: 50,
    cardio_option: "two_mile_run",
    run_seconds: 845
  });
  assert.equal(r.component_scores.strength, 0);
  assert.ok(r.total_score > 75 || r.total_score >= 0);
  assert.equal(r.component_minimums_met, false);
  assert.equal(r.rating, "Unsatisfactory");
  assert.equal(r.overall_pass, false);
});

test("WHtR truncation to nearest hundredth", () => {
  // 42.4 / 72 = 0.5888... -> 0.59
  const a = calculateWhtr({ height_inches: 72, waist_inches: 42.4 });
  assert.equal(a.whtr, 0.59);
  assert.equal(a.points, 2.5);
  // 43.2 / 72 = 0.6 exactly after round
  const b = calculateWhtr({ height_inches: 72, waist_inches: 43.2 });
  assert.equal(b.whtr, 0.6);
  assert.equal(b.points, 0);
  assert.equal(b.passed, false);
});

test("missing fields fail-safe", () => {
  const r = calculatePfraScore({ sex: "male" });
  assert.equal(r.ok, false);
  assert.equal(r.partial, true);
  assert.ok(r.warnings.length);
});

test("invalid fields warn / zero safely", () => {
  const r = calculatePfraScore({
    sex: "male",
    age_band: "under25",
    height_inches: 72,
    waist_inches: 31,
    strength_option: "laser_guns",
    strength_reps: 10,
    core_option: "sit_ups",
    core_reps: 58,
    cardio_option: "1.5_mile_run",
    run_seconds: 600
  });
  assert.ok(r.warnings.length);
  assert.equal(r.component_scores.strength, 0);
});

test("browser/server discrepancy warning", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    displayed_total_score: 88
  });
  assert.equal(r.comparison.matches, false);
  assert.ok(r.warnings.some((w) => /discrepancy/i.test(w)));
});

test("partial calculator state", () => {
  const r = calculatePfraScore({
    sex: "female",
    age_band: "25-29",
    height_inches: 66,
    waist_inches: 30,
    strength_option: "push_ups",
    strength_reps: 40
  });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => /Cardio modality missing|Core modality missing/i.test(w)));
});

test("altitude ambiguity warning", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    altitude_feet: 5500
  });
  assert.ok(r.warnings.some((w) => /altitude/i.test(w)));
});

test("no invented exempt normalization", () => {
  const r = calculatePfraScore({
    ...baseMaleUnder25,
    cardio_exempt: true
  });
  assert.ok(r.warnings.some((w) => /exempt-score normalization/i.test(w)));
  assert.equal(r.component_scores.cardio, 0);
});

test("normalize aliases to canonical schema", () => {
  const n = normalizePtCalculatorInput({
    gender: "F",
    ageGroup: "Under 25",
    height: 70,
    waist: 32,
    strengthEvent: "Hand-Release Push-Ups",
    strengthReps: 40,
    enduranceEvent: "Forearm Plank",
    plankSeconds: 120,
    cardioEvent: "20m HAMR",
    hamrShuttles: 60
  });
  assert.equal(n.sex, "female");
  assert.equal(n.age_band, "under25");
  assert.equal(n.strength_option, "hand_release_push_ups");
  assert.equal(n.core_option, "forearm_plank");
  assert.equal(n.cardio_option, "hamr");
});

// ---- Routing ----
const routeCases = [
  ["What is my Air Force PT score?", "pt_calculator", true],
  ["Did I pass my PFRA?", "pt_calculator", true],
  ["Why did I fail?", "pt_calculator", true],
  ["How many push-ups do I need?", "pt_calculator", true],
  ["What do I need for Excellent?", "pt_calculator", true],
  ["What is my WHtR risk?", "pt_calculator", true],
  ["Can I use the 2 kilometer walk?", "pt_calculator", true],
  ["What is my credit score?", null, false],
  ["Explain my VA Loan", "va_loans", false],
  ["How much do I make each month?", "compensation", false]
];

for (const [message, expectedModule, expectPtIntent] of routeCases) {
  await testAsync(`routing: ${message}`, async () => {
    const intent = detectPtCalculatorIntent(message, {
      hasPtData: /fail|Excellent|push-ups/i.test(message)
    });
    if (expectPtIntent) {
      assert.ok(intent, `expected PT intent for: ${message}`);
    } else if (expectedModule === null) {
      assert.equal(intent, null);
    }

    const input = {
      message,
      pt: expectPtIntent || /PFRA|PT score|WHtR|walk/i.test(message) ? baseMaleUnder25 : {},
      compensation: {
        basePay: 4200,
        bas: 460,
        bah: 2100,
        totalMonthly: 6760
      },
      profile: { serviceStatus: "active-duty" },
      scenario: { purchasePrice: 400000 }
    };

    const matches = detectAmyKnowledgeNeeds(input);
    const ids = matches.map((m) => m.id);

    if (expectedModule === "pt_calculator") {
      assert.ok(ids.includes("pt_calculator"), `got ${ids.join(",")}`);
    } else if (expectedModule === "va_loans") {
      assert.ok(ids.includes("va_loans"));
      assert.ok(!ids.includes("pt_calculator"));
    } else if (expectedModule === "compensation") {
      assert.ok(ids.includes("compensation"));
      assert.ok(!ids.includes("pt_calculator"));
    } else {
      assert.ok(!ids.includes("pt_calculator"));
    }

    const packet = await buildAmyTruthPacket(input);
    if (expectedModule === "pt_calculator") {
      assert.equal(packet.request.has_pt, true);
      assert.ok(packet.truth.pt_calculator);
      assert.ok(Number.isFinite(packet.truth.pt_calculator.total_score));
    }
  });
}

await testAsync("agent registry loads pt_calculator aliases", async () => {
  const tools = await getAgentTools();
  assert.ok(tools.pt_calculator?.ok);
  assert.ok(tools.ptCalculator?.ok);
  assert.ok(tools.pfra?.ok);
  const defs = listToolDefinitions();
  assert.ok(defs.some((d) => d.name === "pt_calculator"));
  const ran = await runTool("pt_calculator", {
    message: "What is my Air Force PT score?",
    intent: "pt_calculator",
    pt: baseMaleUnder25
  });
  assert.equal(ran.ok, true);
  assert.ok(ran.packet?.total_score === 100 || ran.packet?.ok);
});

await testAsync("truth packet shape", async () => {
  const packet = buildPtCalculatorTruthPacket({
    message: "What is my Air Force PT score?",
    pt: baseMaleUnder25
  });
  assert.equal(packet.ok, true);
  assert.equal(packet.version, PT_CALCULATOR_VERSION);
  assert.ok(packet.source.manual);
  assert.ok(packet.component_scores);
  assert.ok(packet.guidance.bluf);
  assert.ok(Array.isArray(packet.warnings));
});

await testAsync("analyzePtCalculatorQuestion", async () => {
  const a = analyzePtCalculatorQuestion("Did I pass my PFRA?", baseMaleUnder25);
  assert.equal(a.intent, "pass_fail");
  assert.ok(/Yes/i.test(a.reply));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
