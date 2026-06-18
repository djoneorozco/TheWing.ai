// official-hhg.js
// ============================================================
// TheWing.ai • Official HHG Weight Allowance Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-hhg.js
//
// PURPOSE
// - Single source of truth for PCS Household Goods (HHG) weight allowances
// - Rank + dependent status lookup and shipment status helper
// - No UI logic
// - No localStorage
// - No MALT / DLA / per diem
//
// SOURCE
// - Pending official HHG weight allowance table ingestion
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
//
// TODO
// - Replace HHG_WEIGHT_ALLOWANCES placeholder structure with the official table
//   once uploaded to the repo from JTR / DTMO source data.
// - Do not invent HHG weight values in this module.
// ============================================================

export const RATE_VERSION = "official-hhg-2026.0-placeholder";

// ============================================================
// //#1) HHG WEIGHT ALLOWANCES — structure only until official table is loaded
// ============================================================

/**
 * TODO(official-hhg-2026): Populate this object with the official HHG weight allowance table.
 *
 * Expected shape after ingestion:
 * {
 *   withDependents: { "E-1": 0000, "E-2": 0000, ... },
 *   withoutDependents: { "E-1": 0000, "E-2": 0000, ... }
 * }
 */
export const HHG_WEIGHT_ALLOWANCES = Object.freeze({
  // TODO(official-hhg-2026): Add official HHG weight allowance rows here.
});

export const SUPPORTED_RANKS = Object.freeze([
  "E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9",
  "W-1", "W-2", "W-3", "W-4", "W-5",
  "O-1E", "O-2E", "O-3E",
  "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8"
]);

// ============================================================
// //#2) HELPERS
// ============================================================

export function normalizeRank(rank) {
  const raw = String(rank ?? "").trim().toUpperCase();

  if (!raw) return "";

  const match = raw.match(/^([EOW])\s*[-]?\s*(\d{1,2})(E)?$/);

  if (match) {
    return `${match[1]}-${Number(match[2])}${match[3] ? "E" : ""}`;
  }

  return raw.replace(/\s+/g, "");
}

function normalizeHasDependents(hasDependents) {
  if (typeof hasDependents === "boolean") return hasDependents;

  if (typeof hasDependents === "number" && Number.isFinite(hasDependents)) {
    return hasDependents >= 2;
  }

  const value = String(hasDependents ?? "").trim().toLowerCase();

  if (["true", "yes", "y", "1", "with", "with dependents", "with_dependents", "dependent", "dependents"].includes(value)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "without dependents", "without_dependents", "single", "none"].includes(value)) {
    return false;
  }

  return false;
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasAllowanceTable() {
  return Object.keys(HHG_WEIGHT_ALLOWANCES).length > 0;
}

// ============================================================
// //#3) LOOKUPS
// ============================================================

export function getHhgAllowance({ rank, hasDependents = false } = {}) {
  const rankKey = normalizeRank(rank);
  const withDependents = normalizeHasDependents(hasDependents);

  if (!hasAllowanceTable()) {
    return {
      ok: false,
      available: false,
      allowanceLbs: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      sourceVersion: RATE_VERSION,
      warning: "TODO(official-hhg-2026): Official HHG weight allowance table is not loaded in repo yet."
    };
  }

  const bucket = withDependents
    ? HHG_WEIGHT_ALLOWANCES.withDependents
    : HHG_WEIGHT_ALLOWANCES.withoutDependents;

  const allowanceLbs = bucket?.[rankKey];

  if (!Number.isFinite(Number(allowanceLbs))) {
    return {
      ok: false,
      available: false,
      allowanceLbs: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      sourceVersion: RATE_VERSION,
      warning: rankKey
        ? `No official HHG allowance found for rank "${rankKey}".`
        : "Missing rank for HHG allowance lookup."
    };
  }

  return {
    ok: true,
    available: true,
    allowanceLbs: Math.round(Number(allowanceLbs)),
    rank: rankKey,
    hasDependents: withDependents,
    sourceVersion: RATE_VERSION
  };
}

export function calculateHhgStatus({ rank, hasDependents = false, estimatedWeightLbs } = {}) {
  const allowance = getHhgAllowance({ rank, hasDependents });
  const estimatedWeight = toFiniteNumber(estimatedWeightLbs);

  if (!allowance.available) {
    return {
      ok: false,
      available: false,
      status: "unknown",
      allowanceLbs: null,
      estimatedWeightLbs: estimatedWeight,
      remainingLbs: null,
      overAllowanceLbs: null,
      utilizationPct: null,
      rank: allowance.rank,
      hasDependents: allowance.hasDependents,
      sourceVersion: RATE_VERSION,
      warning: allowance.warning
    };
  }

  if (!Number.isFinite(estimatedWeight) || estimatedWeight < 0) {
    return {
      ok: true,
      available: true,
      status: "allowance_only",
      allowanceLbs: allowance.allowanceLbs,
      estimatedWeightLbs: null,
      remainingLbs: allowance.allowanceLbs,
      overAllowanceLbs: 0,
      utilizationPct: null,
      rank: allowance.rank,
      hasDependents: allowance.hasDependents,
      sourceVersion: RATE_VERSION,
      warning: "Missing or invalid estimatedWeightLbs for HHG status comparison."
    };
  }

  const remainingLbs = Math.max(0, allowance.allowanceLbs - estimatedWeight);
  const overAllowanceLbs = Math.max(0, estimatedWeight - allowance.allowanceLbs);
  const utilizationPct = allowance.allowanceLbs > 0
    ? Math.round((estimatedWeight / allowance.allowanceLbs) * 10000) / 100
    : null;

  let status = "within_allowance";

  if (overAllowanceLbs > 0) {
    status = "over_allowance";
  } else if (utilizationPct != null && utilizationPct >= 90) {
    status = "near_limit";
  }

  return {
    ok: true,
    available: true,
    status,
    allowanceLbs: allowance.allowanceLbs,
    estimatedWeightLbs: Math.round(estimatedWeight),
    remainingLbs: Math.round(remainingLbs),
    overAllowanceLbs: Math.round(overAllowanceLbs),
    utilizationPct,
    rank: allowance.rank,
    hasDependents: allowance.hasDependents,
    sourceVersion: RATE_VERSION
  };
}

// ============================================================
// //#4) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  HHG_WEIGHT_ALLOWANCES,
  SUPPORTED_RANKS,
  normalizeRank,
  getHhgAllowance,
  calculateHhgStatus
});
