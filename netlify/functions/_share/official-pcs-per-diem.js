// official-pcs-per-diem.js
// ============================================================
// TheWing.ai • Official PCS Per Diem Source
// v1.1.0
//
// FILE
// - netlify/functions/_share/official-pcs-per-diem.js
//
// PURPOSE
// - PCS travel per diem for authorized travel days (MALT Plus / en route PCS)
// - Standard CONUS locality rates for POV PCS travel
// - No UI logic
// - No localStorage
// - No MALT / DLA / HHG
//
// SOURCE
// - GSA Per Diem Bulletin FTR 26-01 (FY2026 standard CONUS: $110 lodging + $68 M&IE)
// - DTMO Current CONUS Rates / CONUS Per Diem Rate Changes (FY2026)
// - JTR par. 050301 (MALT Plus uses standard CONUS per diem)
// - JTR par. 050303 + Table 5-6 (dependent percentages of member received per diem)
// - JTR par. 020310 (first/last travel day M&IE at 75%)
//
// NOTES
// - PCS POV en route per diem uses standard CONUS regardless of route (JTR 050301).
// - Dependents 12+ receive 75% of the member amount received each travel day.
// - Dependents under 12 receive 50% of the member amount received each travel day.
// - Without dependent ages, all dependents default to the 12+ rate with an assumption note.
// ============================================================

export const RATE_VERSION = "official-pcs-per-diem-2026.1";

export const PER_DIEM_SOURCE =
  "GSA FTR 26-01 / DTMO Current CONUS Rates, FY2026 standard CONUS; JTR 050301, 050303, Table 5-6, 020310";

export const PER_DIEM_SOURCE_URL =
  "https://www.travel.dod.mil/Travel-Transportation-Rates/Per-Diem/CONUS-Per-Diem-Rate-Changes/";

export const PCS_PER_DIEM_RATES = Object.freeze({
  2026: Object.freeze({
    fiscalYear: 2026,
    effectiveStart: "2025-10-01",
    effectiveEnd: "2026-09-30",
    standardConus: Object.freeze({
      locality: "Standard CONUS",
      lodging: 110,
      mie: 68,
      combined: 178
    }),
    dependentMultipliers: Object.freeze({
      age12Plus: 0.75,
      under12: 0.5
    }),
    travelDayRules: Object.freeze({
      maltPlusUsesStandardConus: true,
      firstDayMiePct: 0.75,
      lastDayMiePct: 0.75
    })
  })
});

const DEFAULT_YEAR = 2026;

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getRateTable(year) {
  return PCS_PER_DIEM_RATES[normalizeYear(year)] ?? null;
}

function resolveRates({
  year,
  memberRate,
  dependentRateAdult,
  dependentRateChild
} = {}) {
  const table = getRateTable(year);

  if (!table) return null;

  const lodging = toFiniteNumber(memberRate?.lodging) ?? table.standardConus.lodging;
  const mie = toFiniteNumber(memberRate?.mie) ?? table.standardConus.mie;

  let combined = toFiniteNumber(memberRate);

  if (memberRate && typeof memberRate === "object") {
    combined = toFiniteNumber(memberRate.combined);
  }

  if (!Number.isFinite(combined)) {
    combined = lodging + mie;
  }

  return {
    table,
    lodging,
    mie,
    combined,
    dependentMultiplierAdult:
      toFiniteNumber(dependentRateAdult) ?? table.dependentMultipliers.age12Plus,
    dependentMultiplierChild:
      toFiniteNumber(dependentRateChild) ?? table.dependentMultipliers.under12
  };
}

function memberAmountForTravelDay(dayIndex, totalDays, lodging, mie, rules) {
  if (totalDays <= 0) return 0;

  const firstDayMiePct = rules.firstDayMiePct;
  const lastDayMiePct = rules.lastDayMiePct;

  if (totalDays === 1) {
    return money(mie * firstDayMiePct);
  }

  if (dayIndex === 0) {
    return money(lodging + mie * firstDayMiePct);
  }

  if (dayIndex === totalDays - 1) {
    return money(mie * lastDayMiePct);
  }

  return money(lodging + mie);
}

function buildMemberDailyAmounts(travelDays, lodging, mie, rules) {
  const days = Math.trunc(travelDays);
  const daily = [];

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    daily.push(memberAmountForTravelDay(dayIndex, days, lodging, mie, rules));
  }

  return daily;
}

function normalizeDependentCounts(familySize, hasDependents, dependentUnder12Count) {
  const family = toFiniteNumber(familySize);
  const normalizedFamily = family != null && family >= 1 ? Math.trunc(family) : 1;
  const dependentCount = hasDependents ? Math.max(0, normalizedFamily - 1) : 0;
  const under12 = Math.max(0, Math.trunc(toFiniteNumber(dependentUnder12Count) ?? 0));
  const under12Count = Math.min(dependentCount, under12);
  const age12PlusCount = Math.max(0, dependentCount - under12Count);

  return {
    familySize: normalizedFamily,
    dependentCount,
    under12Count,
    age12PlusCount
  };
}

export function calculatePcsPerDiem({
  travelDays,
  familySize,
  hasDependents = false,
  dependentUnder12Count,
  year = DEFAULT_YEAR,
  memberRate,
  dependentRateAdult,
  dependentRateChild
} = {}) {
  const days = toFiniteNumber(travelDays);
  const withDependents = normalizeHasDependents(hasDependents);
  const resolvedYear = normalizeYear(year);
  const rates = resolveRates({
    year: resolvedYear,
    memberRate,
    dependentRateAdult,
    dependentRateChild
  });

  const dependents = normalizeDependentCounts(familySize, withDependents, dependentUnder12Count);
  const assumptions = [];

  if (!rates) {
    return {
      ok: false,
      available: false,
      amount: null,
      travelDays: days,
      familySize: dependents.familySize,
      hasDependents: withDependents,
      year: resolvedYear,
      sourceVersion: RATE_VERSION,
      source: PER_DIEM_SOURCE,
      warning: "Official PCS per diem table not loaded"
    };
  }

  if (!Number.isFinite(days) || days <= 0) {
    return {
      ok: false,
      available: false,
      amount: null,
      travelDays: days,
      familySize: dependents.familySize,
      hasDependents: withDependents,
      year: resolvedYear,
      locality: rates.table.standardConus.locality,
      sourceVersion: RATE_VERSION,
      source: PER_DIEM_SOURCE,
      warning: "Missing or invalid travelDays for PCS per diem calculation."
    };
  }

  if (withDependents && dependents.dependentCount > 0 && dependentUnder12Count == null) {
    assumptions.push(
      "Dependent ages not provided; using JTR Table 5-6 rate for dependents age 12 and older (75%)."
    );
  }

  const memberDaily = buildMemberDailyAmounts(
    days,
    rates.lodging,
    rates.mie,
    rates.table.travelDayRules
  );

  const memberAmount = money(memberDaily.reduce((sum, value) => sum + value, 0));

  let dependentAmount = 0;
  const dependentBreakdown = [];

  for (const memberDayAmount of memberDaily) {
    const adultDay = money(memberDayAmount * rates.dependentMultiplierAdult);
    const childDay = money(memberDayAmount * rates.dependentMultiplierChild);

    dependentAmount = money(
      dependentAmount +
      adultDay * dependents.age12PlusCount +
      childDay * dependents.under12Count
    );

    dependentBreakdown.push({
      memberDayAmount,
      adultDayAmount: adultDay,
      childDayAmount: childDay
    });
  }

  const totalAmount = money(memberAmount + dependentAmount);

  return {
    ok: true,
    available: true,
    amount: totalAmount,
    travelDays: Math.trunc(days),
    familySize: dependents.familySize,
    hasDependents: withDependents,
    year: resolvedYear,
    locality: rates.table.standardConus.locality,
    memberAmount,
    dependentAmount,
    rates: {
      lodging: rates.lodging,
      mie: rates.mie,
      combined: rates.combined,
      dependentMultiplierAdult: rates.dependentMultiplierAdult,
      dependentMultiplierChild: rates.dependentMultiplierChild
    },
    breakdown: {
      memberDaily,
      dependentBreakdown,
      dependentCount: dependents.dependentCount,
      dependentsAge12Plus: dependents.age12PlusCount,
      dependentsUnder12: dependents.under12Count,
      assumptions
    },
    sourceVersion: RATE_VERSION,
    source: PER_DIEM_SOURCE
  };
}

export default Object.freeze({
  RATE_VERSION,
  PER_DIEM_SOURCE,
  PER_DIEM_SOURCE_URL,
  PCS_PER_DIEM_RATES,
  calculatePcsPerDiem
});
