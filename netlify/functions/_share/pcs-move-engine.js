// pcs-move-engine.js
// ============================================================
// TheWing.ai • PCS Move Engine
// v1.0.0
//
// FILE
// - netlify/functions/_share/pcs-move-engine.js
//
// PURPOSE
// - Compose official PCS move data modules into one defensive estimate
// - Uses official-malt.js, official-pcs-travel-days.js, official-dla.js, official-hhg.js
// - No UI logic
// - No localStorage
// - No Netlify handler
//
// IMPORTANT
// - This is NOT an API endpoint.
// - Shared business logic only until a public function wires it up.
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

import { RATE_VERSION as MALT_RATE_VERSION, calculateMalt } from "./official-malt.js";
import { RULE_VERSION as TRAVEL_DAYS_RULE_VERSION, calculatePcsTravelDays } from "./official-pcs-travel-days.js";
import { RATE_VERSION as DLA_RATE_VERSION, getDlaAmount, normalizeRank as normalizeDlaRank } from "./official-dla.js";
import { RATE_VERSION as HHG_RATE_VERSION, calculateHhgStatus, normalizeRank as normalizeHhgRank } from "./official-hhg.js";

export const PCS_MOVE_ENGINE_VERSION = "pcs-move-engine-2026.1";

// ============================================================
// //#1) HELPERS
// ============================================================

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  return Math.round(toNumber(value, 0) * 100) / 100;
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeRank(rank) {
  const fromDla = normalizeDlaRank(rank);
  const fromHhg = normalizeHhgRank(rank);
  return fromDla || fromHhg || "";
}

function normalizeHasDependents(input = {}) {
  if (typeof input.hasDependents === "boolean") return input.hasDependents;

  if (typeof input.dependents === "boolean") return input.dependents;

  if (typeof input.hasDependents === "number" && Number.isFinite(input.hasDependents)) {
    return input.hasDependents >= 2;
  }

  if (typeof input.dependents === "number" && Number.isFinite(input.dependents)) {
    return input.dependents >= 2;
  }

  const family = toNullableNumber(input.family ?? input.familySize ?? input.householdSize);

  if (family != null) return family >= 2;

  const raw = normalizeString(
    input.hasDependents ??
    input.dependents ??
    input.dependentStatus ??
    input.dependent_status
  ).toLowerCase();

  if (["true", "yes", "y", "1", "with", "with dependents", "with_dependents", "dependent", "dependents"].includes(raw)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "without dependents", "without_dependents", "single", "none"].includes(raw)) {
    return false;
  }

  return false;
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const n = toNullableNumber(value);

    if (n != null) return n;
  }

  return null;
}

function pickFirstString(...values) {
  for (const value of values) {
    const s = normalizeString(value);

    if (s) return s;
  }

  return "";
}

function pushWarning(warnings, warning) {
  if (!warning) return;

  const message = normalizeString(warning);

  if (message && !warnings.includes(message)) {
    warnings.push(message);
  }
}

function deriveMoveCashSignal(netMovePosition, hasEntitlementData) {
  if (!hasEntitlementData) return "unknown";

  if (netMovePosition > 250) return "surplus";
  if (netMovePosition < -250) return "shortfall";

  return "neutral";
}

// ============================================================
// //#2) INPUT NORMALIZER
// ============================================================

export function normalizePcsMoveInput(input = {}) {
  const rank = normalizeRank(
    pickFirstString(input.rank, input.rank_paygrade, input.paygrade, input.grade)
  );

  const hasDependents = normalizeHasDependents(input);

  const distanceMiles = pickFirstNumber(
    input.distanceMiles,
    input.distance_miles,
    input.officialDistanceMiles,
    input.official_distance_miles,
    input.pcsDistanceMiles,
    input.pcs_distance_miles,
    input.miles
  );

  const povs = pickFirstNumber(input.povs, input.povCount, input.pov_count) ?? 1;

  const year = pickFirstNumber(input.year, input.rateYear, input.rate_year) ?? 2026;

  const estimatedWeightLbs = pickFirstNumber(
    input.estimatedWeightLbs,
    input.estimated_weight_lbs,
    input.hhgWeightLbs,
    input.hhg_weight_lbs,
    input.weightLbs,
    input.weight_lbs
  );

  const estimatedExpenses = pickFirstNumber(
    input.estimatedExpenses,
    input.estimated_expenses,
    input.outOfPocketExpenses,
    input.out_of_pocket_expenses,
    input.moveExpenses,
    input.move_expenses
  ) ?? 0;

  return {
    rank,
    hasDependents,
    distanceMiles,
    povs,
    year,
    estimatedWeightLbs,
    estimatedExpenses: Math.max(0, estimatedExpenses)
  };
}

// ============================================================
// //#3) MAIN CALCULATION
// ============================================================

export function calculatePcsMoveEstimate(input = {}) {
  const warnings = [];
  const normalized = normalizePcsMoveInput(input);

  const malt = calculateMalt({
    distanceMiles: normalized.distanceMiles,
    povs: normalized.povs,
    year: normalized.year
  });

  if (!malt.ok) {
    pushWarning(warnings, malt.warning);
  }

  const travelDays = calculatePcsTravelDays(normalized.distanceMiles);

  if (!travelDays.ok) {
    pushWarning(warnings, travelDays.warning);
  }

  const dla = getDlaAmount({
    rank: normalized.rank,
    hasDependents: normalized.hasDependents,
    year: normalized.year
  });

  if (!dla.available) {
    pushWarning(warnings, dla.warning);
  }

  const hhg = calculateHhgStatus({
    rank: normalized.rank,
    hasDependents: normalized.hasDependents,
    estimatedWeightLbs: normalized.estimatedWeightLbs
  });

  if (!hhg.available) {
    pushWarning(warnings, hhg.warning);
  } else if (hhg.warning) {
    pushWarning(warnings, hhg.warning);
  }

  const maltEntitlement = malt.ok ? malt.totalAmount : 0;
  const dlaEntitlement = dla.available ? toNumber(dla.amount, 0) : 0;

  const estimatedEntitlements = money(maltEntitlement + dlaEntitlement);
  const estimatedExpenses = money(normalized.estimatedExpenses);
  const netMovePosition = money(estimatedEntitlements - estimatedExpenses);
  const moveCashSignal = deriveMoveCashSignal(
    netMovePosition,
    malt.ok || dla.available
  );

  if (!normalized.rank) {
    pushWarning(warnings, "Missing rank; DLA and HHG lookups may be incomplete.");
  }

  if (normalized.distanceMiles == null) {
    pushWarning(warnings, "Missing official PCS distance; MALT and travel-day estimates unavailable.");
  }

  return {
    ok: true,
    version: {
      pcsMoveEngine: PCS_MOVE_ENGINE_VERSION,
      malt: MALT_RATE_VERSION,
      travelDays: TRAVEL_DAYS_RULE_VERSION,
      dla: DLA_RATE_VERSION,
      hhg: HHG_RATE_VERSION
    },
    profile: {
      rank: normalized.rank || null,
      hasDependents: normalized.hasDependents,
      distanceMiles: normalized.distanceMiles,
      povs: normalized.povs,
      year: normalized.year,
      estimatedWeightLbs: normalized.estimatedWeightLbs
    },
    malt,
    travelDays,
    dla,
    hhg,
    estimatedExpenses,
    estimatedEntitlements,
    netMovePosition,
    moveCashSignal,
    warnings
  };
}

// ============================================================
// //#4) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  PCS_MOVE_ENGINE_VERSION,
  normalizePcsMoveInput,
  calculatePcsMoveEstimate
});
