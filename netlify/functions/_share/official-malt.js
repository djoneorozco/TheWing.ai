// official-malt.js
// ============================================================
// TheWing.ai • Official PCS MALT Source
// v1.1.0
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
// - 2026 MALT: $0.205/mile Jan 1-Jun 30; $0.235/mile Jul 1-Dec 31.
// - DTMO midyear update, effective July 1, 2026:
//   https://www.travel.dod.mil/About/News/Article/Article/4560530/service-members-and-civilians-see-mileage-reimbursement-rate-increases/
// - Miles spanning June/July must be calculated in their respective periods.
// - Archived 2025 / 2024 / 2023 rates from official CY POV mileage bulletins
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const RATE_VERSION = "official-malt-2026.2";
export const MALT_SOURCE_URL = "https://www.travel.dod.mil/Travel-Transportation-Rates/Mileage-Rates/";

// ============================================================
// //#2) PCS MALT RATES — dollars per mile
// ============================================================

// January rates preserve the existing year-only API. New callers should pass
// travelDate (YYYY-MM-DD); a year alone cannot select a midyear rate.
export const PCS_MALT_RATES = Object.freeze({
  2026: 0.205,
  2025: 0.21,
  2024: 0.21,
  2023: 0.22
});

export const PCS_MALT_RATE_PERIODS = Object.freeze({
  2026: Object.freeze([
    Object.freeze({ effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30", ratePerMile: 0.205 }),
    Object.freeze({ effectiveFrom: "2026-07-01", effectiveTo: "2026-12-31", ratePerMile: 0.235 })
  ])
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

export function getMaltRate({ year, travelDate } = {}) {
  if (travelDate !== undefined && travelDate !== null) {
    const unavailable = (warning) => ({
      ok: false, available: false, year: null, travelDate,
      ratePerMile: null, rateEffectiveFrom: null, rateEffectiveTo: null,
      sourceVersion: RATE_VERSION, sourceUrl: MALT_SOURCE_URL, warning
    });
    if (typeof travelDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      return unavailable("Provide a valid MALT travelDate in YYYY-MM-DD format.");
    }
    const parsed = new Date(`${travelDate}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== travelDate) {
      return unavailable("Provide a valid MALT calendar date.");
    }
    const dateYear = Number(travelDate.slice(0, 4));
    if (year != null && Number(year) !== dateYear) {
      return unavailable("MALT travelDate and rate year must match.");
    }
    // Dated lookups never silently substitute a different year's rates.
    if (!Object.hasOwn(PCS_MALT_RATES, dateYear)) {
      return unavailable("Official MALT rates are not loaded for this travel year.");
    }
    const periods = PCS_MALT_RATE_PERIODS[dateYear] || [{
      effectiveFrom: `${dateYear}-01-01`, effectiveTo: `${dateYear}-12-31`,
      ratePerMile: PCS_MALT_RATES[dateYear]
    }];
    const period = periods.find((entry) => travelDate >= entry.effectiveFrom && travelDate <= entry.effectiveTo);
    if (!period) return unavailable("Official MALT rates are not loaded for this travel period.");
    return {
      ok: true, available: true, year: dateYear, travelDate,
      ratePerMile: period.ratePerMile,
      rateEffectiveFrom: period.effectiveFrom, rateEffectiveTo: period.effectiveTo,
      sourceVersion: RATE_VERSION, sourceUrl: MALT_SOURCE_URL
    };
  }
  const resolvedYear = resolveYear(year);
  const ratePerMile = PCS_MALT_RATES[resolvedYear];

  return {
    ok: true,
    available: true,
    year: resolvedYear,
    ratePerMile,
    sourceVersion: RATE_VERSION,
    sourceUrl: MALT_SOURCE_URL,
    travelDate: null,
    rateEffectiveFrom: `${resolvedYear}-01-01`,
    rateEffectiveTo: resolvedYear === 2026 ? "2026-06-30" : `${resolvedYear}-12-31`,
    ...(resolvedYear === 2026 ? { warning: "No MALT travel date supplied: using the January-June 2026 rate. Supply travelDate for July-December rates; split mileage spanning both periods." } : {})
  };
}

export function calculateMalt({ distanceMiles, povs = 1, year, travelDate } = {}) {
  const distance = toFiniteNumber(distanceMiles, null);
  const authorizedPovs = clampPovs(povs);
  const rateInfo = getMaltRate({ year, travelDate });

  if (!rateInfo.available) {
    return { ...rateInfo, distanceMiles: distance, povs: authorizedPovs, amountPerPov: null, totalAmount: null };
  }

  if (!Number.isFinite(distance) || distance <= 0) {
    return {
      ...rateInfo,
      ok: false,
      available: false,
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
    ...rateInfo,
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
  MALT_SOURCE_URL,
  PCS_MALT_RATES,
  PCS_MALT_RATE_PERIODS,
  getMaltRate,
  calculateMalt
});
