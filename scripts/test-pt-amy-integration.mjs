/**
 * Integration: Browser PT data → HUD payload → amy-brain → pt-calculator
 * truth packet (OpenAI disabled / not invoked).
 *
 * Run: node scripts/test-pt-amy-integration.mjs
 */
import assert from "node:assert/strict";
import { buildAmyTruthPacket } from "../netlify/functions/_share/amy-brain.js";
import {
  buildPtCalculatorTruthPacket,
  calculatePfraScore
} from "../netlify/functions/_share/pt-calculator.js";
import { getAgentTools, runTool } from "../netlify/functions/_share/agent-registry.js";

const browserPtData = {
  schema_version: "pt-input-v1",
  source_version: "pt-calculator-2026.1",
  effective_date: "2026-03-01",
  sex: "male",
  gender: "male",
  age_band: "under25",
  height_inches: 72,
  waist_inches: 31,
  strength_option: "push_ups",
  strength_reps: 67,
  core_option: "sit_ups",
  core_reps: 58,
  cardio_option: "two_mile_run",
  run_seconds: 805,
  selections: {
    strength: "push_ups",
    core: "sit_ups",
    cardio: "two_mile_run"
  },
  measurements: { height_inches: 72, waist_inches: 31, whtr: 0.43, whtr_risk: "low" },
  component_scores: {
    body_composition: 20,
    strength: 15,
    core: 15,
    cardio: 50
  },
  displayed_component_scores: {
    body_composition: 20,
    strength: 15,
    core: 15,
    cardio: 50
  },
  total_score: 100,
  displayed_total_score: 100,
  rating: "Excellent",
  displayed_rating: "Excellent",
  overall_pass: true,
  component_minimums_met: true,
  warnings: []
};

// Simulate Ask Amy HUD POST body construction (no localStorage).
function buildHudPayload(message, pt) {
  return {
    message,
    context: {
      source: "web",
      widget: "pcsunited-ask-amy-hud",
      product: "pcsunited",
      version: "pcsu-ask-amy-hud-v1.3.0",
      page: {
        href: "https://pcsunited.com/pt-calculator",
        path: "/pt-calculator",
        origin: "https://pcsunited.com",
        title: "PT Calculator"
      },
      pt
    },
    pt
  };
}

function collectLikePublic(body) {
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  return {
    pt: body?.pt || context?.pt || null,
    page: context.page || null,
    widget: context.widget || null,
    product: context.product || null
  };
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log("PASS", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL", name, err.message);
  }
}

await test("browser getData shape recalculates on server", async () => {
  const server = calculatePfraScore(browserPtData);
  assert.equal(server.total_score, browserPtData.total_score);
  assert.equal(server.rating, browserPtData.rating);
  assert.equal(server.comparison.matches, true);
});

await test("HUD request → amy-brain → truth packet", async () => {
  const body = buildHudPayload("What is my Air Force PT score?", browserPtData);
  const clientContext = collectLikePublic(body);

  const amyTruth = await buildAmyTruthPacket({
    message: body.message,
    pt: clientContext.pt,
    metadata: {
      intent: "pt_calculator",
      page: clientContext.page,
      widget: clientContext.widget,
      product: clientContext.product
    }
  });

  assert.equal(amyTruth.ok, true);
  assert.equal(amyTruth.request.has_pt, true);
  assert.ok(amyTruth.routing.matched_modules.includes("pt_calculator"));
  assert.ok(amyTruth.truth.pt_calculator);
  assert.equal(amyTruth.truth.pt_calculator.total_score, 100);
  assert.equal(amyTruth.truth.pt_calculator.rating, "Excellent");
  assert.ok(amyTruth.combined.facts.some((f) => /PFRA total score/i.test(f) || /Total PFRA/i.test(f)));
  assert.ok(amyTruth.combined.bluf.length);
});

await test("registry tool path builds PT packet", async () => {
  const tools = await getAgentTools();
  assert.ok(tools.ptCalculator.ok);
  const result = await runTool("pt_calculator", {
    message: "Did I pass my PFRA?",
    intent: "pt_calculator",
    pt: browserPtData
  });
  assert.equal(result.ok, true);
  assert.equal(result.packet.overall_pass, true);
});

await test("discrepancy path warns when browser total wrong", async () => {
  const packet = buildPtCalculatorTruthPacket({
    message: "What score did I get?",
    pt: { ...browserPtData, displayed_total_score: 77 }
  });
  assert.equal(packet.comparison.matches, false);
  assert.ok(packet.warnings.some((w) => /discrepancy/i.test(w)));
  assert.equal(packet.total_score, 100);
});

await test("OpenAI-disabled deterministic explanation context", async () => {
  const amyTruth = await buildAmyTruthPacket({
    message: "Why did I fail?",
    pt: {
      sex: "male",
      age_band: "40-44",
      height_inches: 72,
      waist_inches: 32,
      strength_option: "push_ups",
      strength_reps: 20,
      core_option: "sit_ups",
      core_reps: 50,
      cardio_option: "two_mile_run",
      run_seconds: 845
    }
  });
  const pt = amyTruth.truth.pt_calculator;
  assert.equal(pt.overall_pass, false);
  assert.equal(pt.rating, "Unsatisfactory");
  assert.ok(amyTruth.combined.risks.length || amyTruth.combined.facts.length);
  // No OpenAI invocation in this path — truth packet alone is usable.
  assert.ok(pt.guidance?.bluf || amyTruth.combined.bluf.length);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
