// official-malt.js
// ============================================================
// TheWing.ai • Official PCS MALT Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-malt.js
//
// PURPOSE
// - Single source of truth for PCS Monetary Allowance in Lieu of Transportation (MALT)
// - Per-mile reimbursement for authorized privately owned vehicle (POV) PCS travel
// - No UI logic
// - No localStorage
// - No DLA / HHG / per diem
//
// SOURCE
// - DTMO / DoD POV mileage rate bulletins (PCS/MALT column)
// - 2026 MALT rate: $0.205 per mile (effective January 1, 2026)
// - Archived 2025 / 2024 / 2023 rates from official CY POV mileage bulletins
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const RATE_VERSION = "official-malt-2026.1";

// ============================================================
// //#2) PCS MALT RATES — dollars per mile
// ============================================================

export const PCS_MALT_RATES = Object.freeze({
  2026: 0.205,
  2025: 0.21,
  2024: 0.21,
  2023: 0.22
});

const DEFAULT_YEAR = 2026;
const SUPPORTED_YEARS = Object.freeze(Object.keys(PCS_MALT_RATES).map(Number).sort((a, b) => b - a));

// ============================================================
// //#3) HELPERS
// ============================================================

function toFiniteNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeYear(year) {
  const n = toFiniteNumber(year, DEFAULT_YEAR);

  if (!Number.isFinite(n)) return DEFAULT_YEAR;

  return Math.trunc(n);
}

function resolveYear(year) {
  const normalized = normalizeYear(year);

  if (PCS_MALT_RATES[normalized] != null) {
    return normalized;
  }

  return SUPPORTED_YEARS.find((supportedYear) => supportedYear <= normalized) ?? DEFAULT_YEAR;
}

function clampPovs(povs) {
  const n = toFiniteNumber(povs, 1);

  if (!Number.isFinite(n) || n <= 0) return 1;
  if (n > 2) return 2;

  return Math.trunc(n);
}

function money(value) {
  return Math.round(toFiniteNumber(value, 0) * 100) / 100;
}

// ============================================================
// //#4) LOOKUPS
// ============================================================

export function getMaltRate({ year } = {}) {
  const resolvedYear = resolveYear(year);
  const ratePerMile = PCS_MALT_RATES[resolvedYear];

  return {
    year: resolvedYear,
    ratePerMile,
    sourceVersion: RATE_VERSION
  };
}

export function calculateMalt({ distanceMiles, povs = 1, year } = {}) {
  const distance = toFiniteNumber(distanceMiles, null);
  const authorizedPovs = clampPovs(povs);
  const rateInfo = getMaltRate({ year });

  if (!Number.isFinite(distance) || distance <= 0) {
    return {
      ok: false,
      year: rateInfo.year,
      ratePerMile: rateInfo.ratePerMile,
      distanceMiles: null,
      povs: authorizedPovs,
      amountPerPov: 0,
      totalAmount: 0,
      sourceVersion: RATE_VERSION,
      warning: "Missing or invalid distanceMiles for MALT calculation."
    };
  }

  const amountPerPov = money(distance * rateInfo.ratePerMile);
  const totalAmount = money(amountPerPov * authorizedPovs);

  return {
    ok: true,
    year: rateInfo.year,
    ratePerMile: rateInfo.ratePerMile,
    distanceMiles: distance,
    povs: authorizedPovs,
    amountPerPov,
    totalAmount,
    sourceVersion: RATE_VERSION
  };
}

// ============================================================
// //#5) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  PCS_MALT_RATES,
  getMaltRate,
  calculateMalt
});
