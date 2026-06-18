// netlify/functions/_share/pcs-move-engine.samples.test.js
// ============================================================
// Quick validation samples for pcs-move-engine.js
// Run: node netlify/functions/_share/pcs-move-engine.samples.test.js
// ============================================================

import { calculatePcsMoveEstimate } from "./pcs-move-engine.js";
import { calculatePcsPerDiem } from "./official-pcs-per-diem.js";

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
  assert(result.dla.available === false, "DLA should be pending until official table is loaded");
  assert(result.perDiem.available === true, "Per diem should be available");
  approx(result.perDiem.amount, 689, "PCS per diem for 2 days, family of 4");
  approx(result.knownNetPosition, -390.46, "knownNetPosition with MALT + per diem");
  assert(result.projectedNetPosition === null, "projectedNetPosition should be null when partial");
  assert(result.estimateStatus === "partial", "estimateStatus should be partial until DLA loads");
  assert(result.summaryLabel === "Known Move Cash Position", "summaryLabel");
  assert(result.knownEntitlements.malt === 120.54, "knownEntitlements.malt");
  assert(result.knownEntitlements.dla === null, "knownEntitlements.dla should be null");
  assert(result.knownEntitlements.perDiem === 689, "knownEntitlements.perDiem");
  assert(result.allowanceChecks.hhg.available === true, "HHG allowance should be loaded");
  assert(result.allowanceChecks.hhg.allowanceLbs === 13000, "E-7 with deps HHG allowance");
});

runSample("B) Missing distance", {
  rank: "E-5",
  hasDependents: true,
  estimatedExpenses: 500
}, (result) => {
  assert(result.malt.ok === false, "MALT unavailable without distance");
  assert(result.perDiem.available === false, "Per diem unavailable without travel days");
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
  approx(result.perDiem.amount, 212, "Per diem for 2 days, member only");
});

const perDiemOnly = calculatePcsPerDiem({
  travelDays: 2,
  familySize: 4,
  hasDependents: true,
  year: 2026
});

approx(perDiemOnly.amount, 689, "standalone per diem family of 4");
approx(perDiemOnly.memberAmount, 212, "member amount for 2 travel days");
approx(perDiemOnly.dependentAmount, 477, "dependent amount for 3 dependents");
assert(perDiemOnly.rates.lodging === 110, "FY2026 standard CONUS lodging");
assert(perDiemOnly.rates.mie === 68, "FY2026 standard CONUS M&IE");

console.log("All PCS move engine sample tests passed.");
