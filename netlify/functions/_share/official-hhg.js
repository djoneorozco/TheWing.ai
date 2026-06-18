// official-hhg.js
// ============================================================
// TheWing.ai • Official HHG Weight Allowance Source
// v1.1.0
//
// FILE
// - netlify/functions/_share/official-hhg.js
//
// PURPOSE
// - Single source of truth for PCS Household Goods (HHG) weight allowances
// - Rank + dependent status lookup and shipment status helper
// - No UI logic
// - No localStorage
// - No MALT / DLA / per diem / PPM reimbursement
//
// SOURCE
// - Joint Travel Regulations (JTR), Table 5-37, par. 051401
// - PCS and NTS Weight Allowances (Pounds), JTR edition effective 03/01/2026
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

export const RATE_VERSION = "official-hhg-jtr-table-5-37-2026.1";

export const HHG_SOURCE = "JTR Table 5-37, par. 051401 (03/01/2026)";

const WITHOUT_DEPENDENTS = Object.freeze({
  "E-1": 5000,
  "E-2": 5000,
  "E-3": 5000,
  "E-4": 7000,
  "E-5": 7000,
  "E-6": 8000,
  "E-7": 11000,
  "E-8": 12000,
  "E-9": 13000,
  "W-1": 10000,
  "W-2": 12500,
  "W-3": 13000,
  "W-4": 14000,
  "W-5": 16000,
  "O-1": 10000,
  "O-1E": 10000,
  "O-2": 12500,
  "O-2E": 12500,
  "O-3": 13000,
  "O-3E": 13000,
  "O-4": 14000,
  "O-5": 16000,
  "O-6": 18000,
  "O-7": 18000,
  "O-8": 18000,
  "O-9": 18000,
  "O-10": 18000
});

const WITH_DEPENDENTS = Object.freeze({
  "E-1": 8000,
  "E-2": 8000,
  "E-3": 8000,
  "E-4": 8000,
  "E-5": 9000,
  "E-6": 11000,
  "E-7": 13000,
  "E-8": 14000,
  "E-9": 15000,
  "W-1": 12000,
  "W-2": 13500,
  "W-3": 14500,
  "W-4": 17000,
  "W-5": 17500,
  "O-1": 12000,
  "O-1E": 12000,
  "O-2": 13500,
  "O-2E": 13500,
  "O-3": 14500,
  "O-3E": 14500,
  "O-4": 17000,
  "O-5": 17500,
  "O-6": 18000,
  "O-7": 18000,
  "O-8": 18000,
  "O-9": 18000,
  "O-10": 18000
});

export const HHG_WEIGHT_ALLOWANCES = Object.freeze({
  source: HHG_SOURCE,
  withDependents: WITH_DEPENDENTS,
  withoutDependents: WITHOUT_DEPENDENTS
});

export const SUPPORTED_RANKS = Object.freeze([
  "E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9",
  "W-1", "W-2", "W-3", "W-4", "W-5",
  "O-1E", "O-2E", "O-3E",
  "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8", "O-9", "O-10"
]);

function normalizeRank(rank) {
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

export { normalizeRank };

export function getHhgAllowance({ rank, hasDependents = false } = {}) {
  const rankKey = normalizeRank(rank);
  const withDependents = normalizeHasDependents(hasDependents);
  const bucket = withDependents ? WITH_DEPENDENTS : WITHOUT_DEPENDENTS;
  const allowanceLbs = bucket[rankKey];

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

export default Object.freeze({
  RATE_VERSION,
  HHG_SOURCE,
  HHG_WEIGHT_ALLOWANCES,
  SUPPORTED_RANKS,
  normalizeRank,
  getHhgAllowance,
  calculateHhgStatus
});
