// netlify/functions/_share/pcs-move-engine.samples.test.js
// ============================================================
// Quick validation samples for pcs-move-engine.js
// Run: node netlify/functions/_share/pcs-move-engine.samples.test.js
// ============================================================

import { calculatePcsMoveEstimate } from "./pcs-move-engine.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function approx(actual, expected, label) {
  assert(Math.abs(Number(actual) - Number(expected)) < 0.01, `${label}: expected ${expected}, got ${actual}`);
}

function runSample(name, input, checks) {
  const result = calculatePcsMoveEstimate(input);
  checks(result);
  console.log(`PASS ${name}`);
}

runSample("A) E-7 with dependents, 588 miles, 1 POV, $1,200 expenses", {
  rank: "E-7",
  hasDependents: true,
  familySize: 4,
  distanceMiles: 588,
  povs: 1,
  estimatedExpenses: 1200,
  estimatedWeightLbs: 9000,
  year: 2026
}, (result) => {
  approx(result.malt.totalAmount, 120.54, "MALT");
  assert(result.dla.available === false, "DLA should be pending");
  assert(result.dla.amount === null, "DLA amount should be null when pending");
  assert(result.perDiem.available === false, "Per diem should be pending");
  approx(result.knownNetPosition, -1079.46, "knownNetPosition");
  assert(result.projectedNetPosition === null, "projectedNetPosition should be null when partial");
  assert(result.estimateStatus === "partial", "estimateStatus should be partial");
  assert(result.summaryLabel === "Known Move Cash Position", "summaryLabel");
  assert(result.knownEntitlements.malt === 120.54, "knownEntitlements.malt");
  assert(result.knownEntitlements.dla === null, "knownEntitlements.dla should be null");
  assert(result.allowanceChecks.hhg.available === true, "HHG allowance should be loaded");
  assert(result.allowanceChecks.hhg.allowanceLbs === 13000, "E-7 with deps HHG allowance");
});

runSample("B) Missing distance", {
  rank: "E-5",
  hasDependents: true,
  estimatedExpenses: 500
}, (result) => {
  assert(result.malt.ok === false, "MALT unavailable without distance");
  assert(result.estimateStatus === "partial", "estimateStatus partial");
  assert(result.warnings.length > 0, "warnings returned");
});

runSample("C) 2 POVs, 588 miles", {
  rank: "E-5",
  hasDependents: false,
  distanceMiles: 588,
  povs: 2,
  year: 2026
}, (result) => {
  approx(result.malt.totalAmount, 241.08, "MALT for 2 POVs");
  assert(result.malt.povs === 2, "authorized POVs");
});

console.log("All PCS move engine sample tests passed.");
