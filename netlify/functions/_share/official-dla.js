// official-dla.js
// ============================================================
// TheWing.ai • Official DLA Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-dla.js
//
// PURPOSE
// - Single source of truth for Dislocation Allowance (DLA) PCS entitlements
// - Rank + dependent status lookup by effective year
// - No UI logic
// - No localStorage
// - No MALT / HHG / per diem
//
// SOURCE
// - Pending official 2026 DLA table ingestion
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
//
// TODO
// - Replace DLA_RATES placeholder structure with the full official 2026 DLA table
//   once uploaded to the repo from DFAS / JTR source data.
// - Do not invent DLA dollar values in this module.
// ============================================================

export const RATE_VERSION = "official-dla-2026.0-placeholder";

// ============================================================
// //#1) DLA RATES — structure only until official table is loaded
// ============================================================

/**
 * TODO(official-dla-2026): Populate this object with the full official 2026 DLA table.
 *
 * Expected shape after ingestion:
 * {
 *   2026: {
 *     withDependents: { "E-1": 0000, "E-2": 0000, ... },
 *     withoutDependents: { "E-1": 0000, "E-2": 0000, ... }
 *   }
 * }
 */
export const DLA_RATES = Object.freeze({
  // TODO(official-dla-2026): Add official 2026 DLA rows here.
});

export const SUPPORTED_RANKS = Object.freeze([
  "E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9",
  "W-1", "W-2", "W-3", "W-4", "W-5",
  "O-1E", "O-2E", "O-3E",
  "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8"
]);

const DEFAULT_YEAR = 2026;

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

function normalizeYear(year) {
  const n = Number(year);

  if (!Number.isFinite(n)) return DEFAULT_YEAR;

  return Math.trunc(n);
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

function getRateTable(year) {
  return DLA_RATES[normalizeYear(year)] ?? null;
}

// ============================================================
// //#3) LOOKUPS
// ============================================================

export function getDlaAmount({ rank, hasDependents = false, year } = {}) {
  const rankKey = normalizeRank(rank);
  const withDependents = normalizeHasDependents(hasDependents);
  const resolvedYear = normalizeYear(year);
  const table = getRateTable(resolvedYear);

  if (!table) {
    return {
      ok: false,
      available: false,
      amount: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      warning: "TODO(official-dla-2026): Official DLA table is not loaded in repo yet."
    };
  }

  const bucket = withDependents ? table.withDependents : table.withoutDependents;
  const amount = bucket?.[rankKey];

  if (!Number.isFinite(Number(amount))) {
    return {
      ok: false,
      available: false,
      amount: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      warning: rankKey
        ? `No official DLA amount found for rank "${rankKey}".`
        : "Missing rank for DLA lookup."
    };
  }

  return {
    ok: true,
    available: true,
    amount: Math.round(Number(amount) * 100) / 100,
    rank: rankKey,
    hasDependents: withDependents,
    year: resolvedYear,
    sourceVersion: RATE_VERSION
  };
}

// ============================================================
// //#4) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  DLA_RATES,
  SUPPORTED_RANKS,
  normalizeRank,
  getDlaAmount
});
