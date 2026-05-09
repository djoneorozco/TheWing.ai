// ============================================================
// TheWing.ai • Pay Engine
// v1.0.0
//
// FILE
// - netlify/functions/_share/pay-engine.js
//
// PURPOSE
// - Build the user's monthly military income picture for TheWing.ai
// - Uses official-pay.js as the source of truth for Basic Pay + BAS
// - Accepts BAH, VA disability, special pay, spouse income, and other income
//   as optional monthly inputs until official-bah.js / official-va.js are added
//
// IMPORTANT
// - This is NOT the official pay table.
// - official-pay.js = source data / official lookup
// - pay-engine.js   = business logic / full monthly income calculation
//
// CURRENT DEPENDENCY
// - ./official-pay.js must export:
//   getPayRecord2026
//   normalizeRank
//   RATE_VERSION
//
// FUTURE DEPENDENCIES
// - official-bah.js
// - official-va.js
//
// PUBLIC FUNCTIONS
// - calculateMonthlyMilitaryIncome(input)
// - calculatePaySummary(input)
// - normalizePayInput(input)
// ============================================================

import {
  RATE_VERSION as OFFICIAL_PAY_RATE_VERSION,
  getPayRecord2026,
  normalizeRank
} from "./official-pay.js";

// ------------------------------------------------------------
// #1) ENGINE VERSION
// ------------------------------------------------------------

export const PAY_ENGINE_VERSION = "pay-engine-2026.1";

// ------------------------------------------------------------
// #2) SMALL HELPERS
// ------------------------------------------------------------

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  const n = toNumber(value, 0);
  return Math.round(n * 100) / 100;
}

function clampNonNegative(value) {
  return Math.max(0, toNumber(value, 0));
}

function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const s = String(value || "").trim().toLowerCase();

  if (["true", "yes", "y", "1", "with", "dependents", "dependent"].includes(s)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "single", "none"].includes(s)) {
    return false;
  }

  return fallback;
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickFirstString(...values) {
  for (const value of values) {
    const s = normalizeString(value);
    if (s) return s;
  }
  return "";
}

// ------------------------------------------------------------
// #3) INPUT NORMALIZER
// ------------------------------------------------------------

export function normalizePayInput(input = {}) {
  const rankRaw = pickFirstString(
    input.rank,
    input.rank_paygrade,
    input.paygrade,
    input.grade
  );

  const rank = normalizeRank(rankRaw);

  const yearsOfService = clampNonNegative(
    pickFirstNumber(
      input.yearsOfService,
      input.yos,
      input.years,
      input.serviceYears
    )
  );

  const mode = pickFirstString(input.mode, input.status, "active_duty")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const family = pickFirstNumber(
    input.family,
    input.familySize,
    input.dependents,
    input.householdSize
  );

  const hasDependents = normalizeBoolean(
    input.hasDependents,
    family > 1
  );

  const base = pickFirstString(
    input.base,
    input.installation,
    input.dutyStation
  );

  const cityKey = pickFirstString(
    input.cityKey,
    input.city_key,
    input.market,
    input.marketKey
  );

  const basType = pickFirstString(input.basType, input.bas_type);

  // These are optional monthly amounts for now.
  // Later, BAH and VA should be resolved through official-bah.js and official-va.js.
  const bahMonthly = clampNonNegative(
    pickFirstNumber(
      input.bahMonthly,
      input.bah,
      input.monthlyBah,
      input.bah_monthly,
      input.housingAllowance
    )
  );

  const vaMonthly = clampNonNegative(
    pickFirstNumber(
      input.vaMonthly,
      input.va,
      input.vaDisabilityMonthly,
      input.va_disability_monthly,
      input.disabilityPay,
      input.disabilityMonthly
    )
  );

  const specialPayMonthly = clampNonNegative(
    pickFirstNumber(
      input.specialPayMonthly,
      input.special_pay_monthly,
      input.specialPay,
      input.incentivePay,
      input.incentive_pay
    )
  );

  const spouseIncomeMonthly = clampNonNegative(
    pickFirstNumber(
      input.spouseIncomeMonthly,
      input.spouse_income_monthly,
      input.spouseIncome,
      input.spouse_income
    )
  );

  const additionalIncomeMonthly = clampNonNegative(
    pickFirstNumber(
      input.additionalIncomeMonthly,
      input.additional_monthly_income,
      input.additionalIncome,
      input.additional_income,
      input.otherIncome,
      input.other_income
    )
  );

  return {
    rank,
    rankRaw,
    yearsOfService,
    mode,
    family,
    hasDependents,
    base,
    cityKey,
    basType,
    bahMonthly,
    vaMonthly,
    specialPayMonthly,
    spouseIncomeMonthly,
    additionalIncomeMonthly
  };
}

// ------------------------------------------------------------
// #4) MAIN PAY CALCULATION
// ------------------------------------------------------------

export function calculateMonthlyMilitaryIncome(input = {}) {
  const normalized = normalizePayInput(input);

  if (!normalized.rank) {
    throw new Error("Missing rank/paygrade for pay calculation.");
  }

  const officialPay = getPayRecord2026(
    normalized.rank,
    normalized.yearsOfService,
    {
      basType: normalized.basType
    }
  );

  const basicPayMonthly = money(officialPay.basicPayMonthly);
  const basMonthly = money(officialPay.basMonthly);

  const bahMonthly = money(normalized.bahMonthly);
  const vaMonthly = money(normalized.vaMonthly);
  const specialPayMonthly = money(normalized.specialPayMonthly);
  const spouseIncomeMonthly = money(normalized.spouseIncomeMonthly);
  const additionalIncomeMonthly = money(normalized.additionalIncomeMonthly);

  const militaryIncomeMonthly = money(
    basicPayMonthly +
    basMonthly +
    bahMonthly +
    vaMonthly +
    specialPayMonthly
  );

  const householdIncomeMonthly = money(
    militaryIncomeMonthly +
    spouseIncomeMonthly +
    additionalIncomeMonthly
  );

  const annualizedHouseholdIncome = money(householdIncomeMonthly * 12);

  return {
    ok: true,

    version: {
      payEngine: PAY_ENGINE_VERSION,
      officialPay: OFFICIAL_PAY_RATE_VERSION,
      sourceVersion: officialPay.sourceVersion || OFFICIAL_PAY_RATE_VERSION
    },

    profile: {
      rank: officialPay.rank,
      yearsOfService: officialPay.yearsOfService,
      mode: normalized.mode,
      family: normalized.family,
      hasDependents: normalized.hasDependents,
      base: normalized.base,
      cityKey: normalized.cityKey
    },

    monthly: {
      basicPay: basicPayMonthly,
      bas: basMonthly,
      bah: bahMonthly,
      vaDisability: vaMonthly,
      specialPay: specialPayMonthly,
      spouseIncome: spouseIncomeMonthly,
      additionalIncome: additionalIncomeMonthly,
      militaryIncome: militaryIncomeMonthly,
      householdIncome: householdIncomeMonthly
    },

    annual: {
      householdIncome: annualizedHouseholdIncome
    },

    flags: {
      bahProvided: bahMonthly > 0,
      vaProvided: vaMonthly > 0,
      spouseIncomeProvided: spouseIncomeMonthly > 0,
      additionalIncomeProvided: additionalIncomeMonthly > 0,
      specialPayProvided: specialPayMonthly > 0
    },

    notes: [
      "Basic Pay and BAS are resolved from official-pay.js.",
      "BAH and VA disability are currently accepted as monthly inputs until official-bah.js and official-va.js are connected.",
      "This engine calculates income only. Affordability, mortgage, and decision grading belong in separate engines."
    ]
  };
}

// ------------------------------------------------------------
// #5) DASHBOARD-FRIENDLY SUMMARY
// ------------------------------------------------------------

export function calculatePaySummary(input = {}) {
  const result = calculateMonthlyMilitaryIncome(input);

  return {
    ok: true,
    rank: result.profile.rank,
    yearsOfService: result.profile.yearsOfService,
    base: result.profile.base,
    cityKey: result.profile.cityKey,

    basicPayMonthly: result.monthly.basicPay,
    basMonthly: result.monthly.bas,
    bahMonthly: result.monthly.bah,
    vaMonthly: result.monthly.vaDisability,
    specialPayMonthly: result.monthly.specialPay,
    spouseIncomeMonthly: result.monthly.spouseIncome,
    additionalIncomeMonthly: result.monthly.additionalIncome,

    totalMilitaryIncomeMonthly: result.monthly.militaryIncome,
    totalHouseholdIncomeMonthly: result.monthly.householdIncome,
    totalHouseholdIncomeAnnual: result.annual.householdIncome,

    sourceVersion: result.version.officialPay,
    engineVersion: result.version.payEngine
  };
}

// ------------------------------------------------------------
// #6) SAFE WRAPPER FOR API ROUTES
// ------------------------------------------------------------

export function safeCalculateMonthlyMilitaryIncome(input = {}) {
  try {
    return calculateMonthlyMilitaryIncome(input);
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to calculate monthly military income.",
      version: {
        payEngine: PAY_ENGINE_VERSION,
        officialPay: OFFICIAL_PAY_RATE_VERSION
      }
    };
  }
}

// ------------------------------------------------------------
// #7) DEFAULT EXPORT
// ------------------------------------------------------------

export default {
  PAY_ENGINE_VERSION,
  normalizePayInput,
  calculateMonthlyMilitaryIncome,
  calculatePaySummary,
  safeCalculateMonthlyMilitaryIncome
};
