// official-pcs-per-diem.js
// ============================================================
// TheWing.ai • Official PCS Per Diem Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-pcs-per-diem.js
//
// PURPOSE
// - PCS travel per diem lookup for authorized travel days
// - No UI logic
// - No localStorage
// - No MALT / DLA / HHG
//
// SOURCE
// - Pending official DTMO / JTR PCS per diem table ingestion
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
//
// TODO
// - Replace PCS_PER_DIEM_RATES with official DTMO/JTR per diem tables.
// - Do not invent per diem dollar values in this module.
// ============================================================

export const RATE_VERSION = "official-pcs-per-diem-2026.0-placeholder";

/**
 * TODO(official-pcs-per-diem-2026): Populate with official DTMO/JTR PCS per diem rates.
 */
export const PCS_PER_DIEM_RATES = Object.freeze({
  // TODO(official-pcs-per-diem-2026): Add official member and dependent rate rows here.
});

const DEFAULT_WARNING = "Official PCS per diem table not loaded";

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeHasDependents(hasDependents) {
  if (typeof hasDependents === "boolean") return hasDependents;

  if (typeof hasDependents === "number" && Number.isFinite(hasDependents)) {
    return hasDependents >= 2;
  }

  return false;
}

function hasRateTable() {
  return Object.keys(PCS_PER_DIEM_RATES).length > 0;
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function calculatePcsPerDiem({
  travelDays,
  familySize,
  hasDependents = false,
  memberRate,
  dependentRateAdult,
  dependentRateChild
} = {}) {
  const days = toFiniteNumber(travelDays);
  const family = toFiniteNumber(familySize);
  const withDependents = normalizeHasDependents(hasDependents);

  if (!hasRateTable()) {
    return {
      ok: false,
      available: false,
      amount: null,
      travelDays: days,
      familySize: family,
      hasDependents: withDependents,
      sourceVersion: RATE_VERSION,
      warning: DEFAULT_WARNING
    };
  }

  // Reserved for official table ingestion. Explicit override rates are ignored
  // until an official source module defines supported lookup keys.
  void memberRate;
  void dependentRateAdult;
  void dependentRateChild;

  return {
    ok: false,
    available: false,
    amount: null,
    travelDays: days,
    familySize: family,
    hasDependents: withDependents,
    sourceVersion: RATE_VERSION,
    warning: DEFAULT_WARNING
  };
}

export default Object.freeze({
  RATE_VERSION,
  PCS_PER_DIEM_RATES,
  calculatePcsPerDiem
});
