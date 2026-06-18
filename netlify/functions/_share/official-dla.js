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
// - DTMO MAP 72-25(I), CY2026 Dislocation Allowance (DLA) Rates
// - DTMO Dislocation Allowance page / official 2026 DLA UTD PDF
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
//
// TODO
// - Ingest the official 2026 DLA PDF/UTD into DLA_RATES when uploaded to repo.
// - Do not invent DLA dollar values in this module.
// ============================================================

export const RATE_VERSION = "official-dla-2026.0-placeholder";

export const DLA_SOURCE = "DTMO MAP 72-25(I), effective January 1, 2026";

/**
 * TODO(official-dla-2026): Populate from the official DTMO 2026 DLA UTD/PDF.
 *
 * Expected shape after ingestion:
 * {
 *   2026: {
 *     withDependents: { "E-1": 0000, ... },
 *     withoutDependents: { "E-1": 0000, ... }
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
  "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8", "O-9", "O-10"
]);

const DEFAULT_YEAR = 2026;
const DEFAULT_WARNING = "Official DLA table not loaded";

function normalizeRank(rank) {
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

export { normalizeRank };

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
      warning: DEFAULT_WARNING
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

export default Object.freeze({
  RATE_VERSION,
  DLA_SOURCE,
  DLA_RATES,
  SUPPORTED_RANKS,
  normalizeRank,
  getDlaAmount
});
