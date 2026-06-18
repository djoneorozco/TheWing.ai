// official-dla.js
// ============================================================
// TheWing.ai • Official DLA Source
// v1.1.0
//
// FILE
// - netlify/functions/_share/official-dla.js
//
// PURPOSE
// - Single source of truth for Dislocation Allowance (DLA) PCS entitlements
// - Rank + dependent status lookup by effective year
// - Standard PCS calculator uses PRIMARY DLA rates only
// - No UI logic
// - No localStorage
// - No MALT / HHG / per diem
//
// SOURCE
// - PDTATAC / DTMO UTD for MAP 72-25(I), CY2026 Dislocation Allowance (DLA) Rates
// - Primary DLA Rates effective January 1, 2026
// - JTR Chapter 5, par. 0505 governs DLA eligibility and special cases
//
// NOTES
// - Primary DLA is used for normal PCS planning estimates.
// - Secondary DLA is only payable when a second DLA is paid under JTR par. 050507.
// - Partial DLA is a separate flat-rate allowance under JTR par. 050508.
// ============================================================

export const RATE_VERSION = "official-dla-2026.1";

export const DLA_SOURCE = "PDTATAC / DTMO UTD for MAP 72-25(I), CY2026 Dislocation Allowance (DLA) Rates, effective January 1, 2026";

export const DLA_SOURCE_URL = "https://media.defense.gov/2025/Dec/31/2003850077/-1/-1/0/UTD_FOR_MAP_72-25%28I%29_CY2026_DISLOCATION_ALLOWANCE_%28DLA%29_RATES.PDF";

// ============================================================
// //#1) DLA RATES — PRIMARY DLA ONLY
// ============================================================

export const DLA_RATES = Object.freeze({
  2026: {
    withoutDependents: Object.freeze({
      "O-10": 5187.33,
      "O-9": 5187.33,
      "O-8": 5187.33,
      "O-7": 5187.33,
      "O-6": 4758.96,
      "O-5": 4583.51,
      "O-4": 4247.61,
      "O-3": 3404.11,
      "O-2": 2700.31,
      "O-1": 2273.82,

      "O-3E": 3675.83,
      "O-2E": 3124.87,
      "O-1E": 2687.09,

      "W-5": 4315.51,
      "W-4": 3832.45,
      "W-3": 3221.08,
      "W-2": 2860.70,
      "W-1": 2394.55,

      "E-9": 3147.54,
      "E-8": 2888.97,
      "E-7": 2468.19,
      "E-6": 2389.42,
      "E-5": 2389.42,
      "E-4": 2389.42,
      "E-3": 2355.48,
      "E-2": 2025.26,
      "E-1": 1870.58
    }),

    withDependents: Object.freeze({
      "O-10": 6385.58,
      "O-9": 6385.58,
      "O-8": 6385.58,
      "O-7": 6385.58,
      "O-6": 5749.63,
      "O-5": 5542.06,
      "O-4": 4885.43,
      "O-3": 4041.88,
      "O-2": 3451.28,
      "O-1": 3085.23,

      "O-3E": 4343.80,
      "O-2E": 3919.27,
      "O-1E": 3621.10,

      "W-5": 4715.58,
      "W-4": 4323.11,
      "W-3": 3960.78,
      "W-2": 3643.75,
      "W-1": 3151.31,

      "E-9": 4149.51,
      "E-8": 3824.94,
      "E-7": 3551.31,
      "E-6": 3548.02,
      "E-5": 3548.02,
      "E-4": 3548.02,
      "E-3": 3548.02,
      "E-2": 3548.02,
      "E-1": 3548.02
    })
  }
});

export const SECONDARY_DLA_RATES = Object.freeze({
  2026: {
    withoutDependents: Object.freeze({
      "O-10": 4149.86,
      "O-9": 4149.86,
      "O-8": 4149.86,
      "O-7": 4149.86,
      "O-6": 3807.26,
      "O-5": 3666.78,
      "O-4": 3398.10,
      "O-3": 2723.29,
      "O-2": 2160.20,
      "O-1": 1819.03,

      "O-3E": 2940.71,
      "O-2E": 2499.87,
      "O-1E": 2149.69,

      "W-5": 3452.41,
      "W-4": 3065.98,
      "W-3": 2576.88,
      "W-2": 2288.54,
      "W-1": 1915.69,

      "E-9": 2518.00,
      "E-8": 2311.19,
      "E-7": 1974.49,
      "E-6": 1787.36,
      "E-5": 1648.50,
      "E-4": 1434.14,
      "E-3": 1406.93,
      "E-2": 1142.74,
      "E-1": 1018.96
    }),

    withDependents: Object.freeze({
      "O-10": 5108.47,
      "O-9": 5108.47,
      "O-8": 5108.47,
      "O-7": 5108.47,
      "O-6": 4599.74,
      "O-5": 4433.65,
      "O-4": 3908.34,
      "O-3": 3233.55,
      "O-2": 2761.04,
      "O-1": 2468.19,

      "O-3E": 3475.07,
      "O-2E": 3135.40,
      "O-1E": 2896.91,

      "W-5": 3772.41,
      "W-4": 3458.48,
      "W-3": 3168.62,
      "W-2": 2915.01,
      "W-1": 2521.02,

      "E-9": 3319.62,
      "E-8": 3059.95,
      "E-7": 2841.09,
      "E-6": 2625.16,
      "E-5": 2361.00,
      "E-4": 2361.00,
      "E-3": 2361.00,
      "E-2": 2361.00,
      "E-1": 2361.00
    })
  }
});

export const PARTIAL_DLA_RATES = Object.freeze({
  2026: 1002.71
});

export const SUPPORTED_RANKS = Object.freeze([
  "E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9",
  "W-1", "W-2", "W-3", "W-4", "W-5",
  "O-1E", "O-2E", "O-3E",
  "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7", "O-8", "O-9", "O-10"
]);

const DEFAULT_YEAR = 2026;

// ============================================================
// //#2) HELPERS
// ============================================================

function normalizeRank(rank) {
  const raw = String(rank ?? "").trim().toUpperCase();

  if (!raw) return "";

  const clean = raw.replace(/\s+/g, "");

  const priorEnlisted = clean.match(/^O[-]?([123])E$/);
  if (priorEnlisted) {
    return `O-${Number(priorEnlisted[1])}E`;
  }

  const match = clean.match(/^([EOW])[-]?(\d{1,2})$/);
  if (match) {
    return `${match[1]}-${Number(match[2])}`;
  }

  return clean;
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

  if ([
    "true",
    "yes",
    "y",
    "1",
    "with",
    "with dependents",
    "with_dependents",
    "dependent",
    "dependents"
  ].includes(value)) {
    return true;
  }

  if ([
    "false",
    "no",
    "n",
    "0",
    "without",
    "without dependents",
    "without_dependents",
    "single",
    "none"
  ].includes(value)) {
    return false;
  }

  return false;
}

function getPrimaryRateTable(year) {
  return DLA_RATES[normalizeYear(year)] ?? null;
}

function getSecondaryRateTable(year) {
  return SECONDARY_DLA_RATES[normalizeYear(year)] ?? null;
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export { normalizeRank };

// ============================================================
// //#3) LOOKUPS
// ============================================================

export function getDlaAmount({ rank, hasDependents = false, year, type = "primary" } = {}) {
  const rankKey = normalizeRank(rank);
  const withDependents = normalizeHasDependents(hasDependents);
  const resolvedYear = normalizeYear(year);

  const normalizedType = String(type || "primary").trim().toLowerCase();

  if (normalizedType === "partial") {
    const partialAmount = PARTIAL_DLA_RATES[resolvedYear];

    if (!Number.isFinite(Number(partialAmount))) {
      return {
        ok: false,
        available: false,
        type: "partial",
        amount: null,
        rank: rankKey || null,
        hasDependents: withDependents,
        year: resolvedYear,
        sourceVersion: RATE_VERSION,
        source: DLA_SOURCE,
        warning: `No official partial DLA amount found for ${resolvedYear}.`
      };
    }

    return {
      ok: true,
      available: true,
      type: "partial",
      amount: money(partialAmount),
      rank: rankKey || null,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: DLA_SOURCE
    };
  }

  const table = normalizedType === "secondary"
    ? getSecondaryRateTable(resolvedYear)
    : getPrimaryRateTable(resolvedYear);

  const resolvedType = normalizedType === "secondary" ? "secondary" : "primary";

  if (!table) {
    return {
      ok: false,
      available: false,
      type: resolvedType,
      amount: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: DLA_SOURCE,
      warning: `Official ${resolvedType} DLA table not loaded for ${resolvedYear}.`
    };
  }

  const bucket = withDependents ? table.withDependents : table.withoutDependents;
  const amount = bucket?.[rankKey];

  if (!Number.isFinite(Number(amount))) {
    return {
      ok: false,
      available: false,
      type: resolvedType,
      amount: null,
      rank: rankKey || null,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: DLA_SOURCE,
      warning: rankKey
        ? `No official ${resolvedType} DLA amount found for rank "${rankKey}".`
        : "Missing rank for DLA lookup."
    };
  }

  return {
    ok: true,
    available: true,
    type: resolvedType,
    amount: money(amount),
    rank: rankKey,
    hasDependents: withDependents,
    year: resolvedYear,
    sourceVersion: RATE_VERSION,
    source: DLA_SOURCE
  };
}

// ============================================================
// //#4) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  DLA_SOURCE,
  DLA_SOURCE_URL,
  DLA_RATES,
  SECONDARY_DLA_RATES,
  PARTIAL_DLA_RATES,
  SUPPORTED_RANKS,
  normalizeRank,
  getDlaAmount
});
