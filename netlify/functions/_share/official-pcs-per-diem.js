// official-pcs-per-diem.js
// ============================================================
// TheWing.ai • Official PCS Per Diem Source
// v1.1.0
//
// FILE
// - netlify/functions/_share/official-pcs-per-diem.js
//
// PURPOSE
// - PCS travel per diem calculation for authorized PCS travel days
// - Standard CONUS PCS / MALT Plus estimate
// - No UI logic
// - No localStorage
// - No MALT / DLA / HHG
//
// SOURCE
// - JTR Chapter 5, 050301 PCS Per Diem when Traveling by POV
// - Current_CONUS_Rates.pdf Appendix D, CONUS Standard Rate
//
// SOURCE FACTS
// - PCS by POV uses MALT Plus at the standard CONUS per diem rate
//   for each authorized travel day.
// - CONUS Standard Rate effective 10/01/2025:
//   Lodging: $110
//   Local Meal Rate: $63
//   Incidental: $5
//   Maximum Per Diem: $178
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

export const RATE_VERSION = "official-pcs-per-diem-2026.1";

export const PCS_PER_DIEM_SOURCE =
  "JTR Chapter 5, 050301; Appendix D Current CONUS Rates effective 10/01/2025";

export const PCS_PER_DIEM_RATES = Object.freeze({
  2026: Object.freeze({
    conusStandard: Object.freeze({
      lodging: 110,
      localMealRate: 63,
      localIncidental: 5,
      maximumPerDiem: 178,
      effectiveDate: "2025-10-01"
    }),

    // PCS dependent percentages for planning:
    // - Dependent 12 or older traveling with the member: 75%
    // - Dependent under 12 traveling with the member: 50%
    dependentPercentages: Object.freeze({
      age12OrOlder: 0.75,
      under12: 0.50
    })
  })
});

const DEFAULT_YEAR = 2026;

// ============================================================
// //#1) HELPERS
// ============================================================

function toFiniteNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNonNegativeInteger(value, fallback = 0) {
  const n = toFiniteNumber(value, fallback);

  if (!Number.isFinite(n) || n < 0) return fallback;

  return Math.floor(n);
}

function normalizeYear(year) {
  const n = toFiniteNumber(year, DEFAULT_YEAR);

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

function getRateTable(year) {
  const resolvedYear = normalizeYear(year);

  return PCS_PER_DIEM_RATES[resolvedYear] || PCS_PER_DIEM_RATES[DEFAULT_YEAR] || null;
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

// ============================================================
// //#2) LOOKUPS
// ============================================================

export function getPcsPerDiemRate({ year } = {}) {
  const resolvedYear = normalizeYear(year);
  const table = getRateTable(resolvedYear);

  if (!table?.conusStandard?.maximumPerDiem) {
    return {
      ok: false,
      available: false,
      year: resolvedYear,
      memberDailyRate: null,
      sourceVersion: RATE_VERSION,
      source: PCS_PER_DIEM_SOURCE,
      warning: "Official PCS per diem table not loaded"
    };
  }

  return {
    ok: true,
    available: true,
    year: resolvedYear,
    memberDailyRate: money(table.conusStandard.maximumPerDiem),
    lodging: money(table.conusStandard.lodging),
    localMealRate: money(table.conusStandard.localMealRate),
    localIncidental: money(table.conusStandard.localIncidental),
    dependent12PlusDailyRate: money(
      table.conusStandard.maximumPerDiem * table.dependentPercentages.age12OrOlder
    ),
    dependentUnder12DailyRate: money(
      table.conusStandard.maximumPerDiem * table.dependentPercentages.under12
    ),
    sourceVersion: RATE_VERSION,
    source: PCS_PER_DIEM_SOURCE
  };
}

// ============================================================
// //#3) CALCULATION
// ============================================================

export function calculatePcsPerDiem({
  travelDays,
  familySize,
  hasDependents = false,
  dependents12Plus,
  dependentsUnder12,
  year,
  memberRate,
  dependentRateAdult,
  dependentRateChild
} = {}) {
  const days = toFiniteNumber(travelDays, null);
  const family = toFiniteNumber(familySize, null);
  const withDependents = normalizeHasDependents(hasDependents);
  const resolvedYear = normalizeYear(year);
  const rateInfo = getPcsPerDiemRate({ year: resolvedYear });

  if (!Number.isFinite(days) || days <= 0) {
    return {
      ok: false,
      available: false,
      amount: null,
      travelDays: null,
      familySize: family,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: PCS_PER_DIEM_SOURCE,
      warning: "Missing or invalid travelDays for PCS per diem calculation."
    };
  }

  if (!rateInfo.available) {
    return {
      ok: false,
      available: false,
      amount: null,
      travelDays: days,
      familySize: family,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: PCS_PER_DIEM_SOURCE,
      warning: rateInfo.warning || "Official PCS per diem table not loaded"
    };
  }

  const memberDailyRate = money(
    toFiniteNumber(memberRate, rateInfo.memberDailyRate)
  );

  const adultDependentDailyRate = money(
    toFiniteNumber(dependentRateAdult, rateInfo.dependent12PlusDailyRate)
  );

  const childDependentDailyRate = money(
    toFiniteNumber(dependentRateChild, rateInfo.dependentUnder12DailyRate)
  );

  let adultDependents = toNonNegativeInteger(dependents12Plus, 0);
  let childDependents = toNonNegativeInteger(dependentsUnder12, 0);

  // Backward-compatible fallback:
  // Existing calculator sends familySize but not dependent age split.
  // If "With Dependents" and no split is provided, assume one 12+ dependent.
  if (withDependents && adultDependents === 0 && childDependents === 0) {
    if (Number.isFinite(family) && family > 1) {
      adultDependents = Math.max(1, Math.floor(family) - 1);
    } else {
      adultDependents = 1;
    }
  }

  // If "Without Dependents", ignore dependent counts.
  if (!withDependents) {
    adultDependents = 0;
    childDependents = 0;
  }

  const memberTotal = money(days * memberDailyRate);
  const adultDependentTotal = money(days * adultDependents * adultDependentDailyRate);
  const childDependentTotal = money(days * childDependents * childDependentDailyRate);
  const totalAmount = money(memberTotal + adultDependentTotal + childDependentTotal);

  return {
    ok: true,
    available: true,
    amount: totalAmount,
    travelDays: days,
    familySize: family,
    hasDependents: withDependents,
    year: resolvedYear,
    sourceVersion: RATE_VERSION,
    source: PCS_PER_DIEM_SOURCE,
    rates: {
      memberDailyRate,
      dependent12PlusDailyRate: adultDependentDailyRate,
      dependentUnder12DailyRate: childDependentDailyRate
    },
    travelers: {
      member: 1,
      dependents12Plus: adultDependents,
      dependentsUnder12: childDependents
    },
    breakdown: {
      memberTotal,
      dependent12PlusTotal: adultDependentTotal,
      dependentUnder12Total: childDependentTotal,
      totalAmount
    }
  };
}

// ============================================================
// //#4) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  PCS_PER_DIEM_SOURCE,
  PCS_PER_DIEM_RATES,
  getPcsPerDiemRate,
  calculatePcsPerDiem
});
