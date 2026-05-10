// netlify/functions/_share/compensation-context.js
// ============================================================
// TheWing.ai • Compensation Context Adapter
// v1.0.0
//
// FILE
// - netlify/functions/_share/compensation-context.js
//
// PURPOSE
// - Thin deterministic adapter for Ask Amy / TheWing intelligence flows
// - Converts loose PCSUnited/Supabase profile data into a complete
//   military compensation packet
// - Keeps ask-amy.js clean and prevents it from becoming a calculator file
//
// USES
// - official-pay.js        → Base Pay + BAS source of truth
// - official-bah.js        → BAH source of truth by base/rank/dependents
// - official-va.js         → VA disability compensation source of truth
// - official-retirement.js → Optional retirement estimate
// - pay-engine.js          → Monthly income assembly
//
// DESIGN
// - NO Netlify handler
// - NO Supabase dependency
// - NO OpenAI dependency
// - NO localStorage dependency
// - Safe, reusable shared module
//
// MAIN EXPORTS
// - buildCompensationContext(input)
// - safeBuildCompensationContext(input)
// - normalizeCompensationInput(input)
// ============================================================

// ============================================================
// //#1) IMPORTS
// ============================================================

import {
  RATE_VERSION as OFFICIAL_PAY_RATE_VERSION,
  getPayRecord2026,
  normalizeRank as normalizeOfficialPayRank
} from "./official-pay.js";

import {
  RATE_VERSION as OFFICIAL_BAH_RATE_VERSION,
  canonicalizeBase,
  getDutyZip,
  getBahRecord,
  normalizeRank as normalizeBahRank
} from "./official-bah.js";

import {
  RATE_VERSION as OFFICIAL_VA_RATE_VERSION,
  safeGetVACompensation
} from "./official-va.js";

import {
  calculateMonthlyMilitaryIncome,
  calculatePaySummary,
  PAY_ENGINE_VERSION
} from "./pay-engine.js";

let retirementModule = null;

try {
  retirementModule = await import("./official-retirement.js");
} catch (_) {
  retirementModule = null;
}

// ============================================================
// //#2) VERSION
// ============================================================

export const COMPENSATION_CONTEXT_VERSION = "compensation-context-2026.1";

// ============================================================
// //#3) SMALL HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function round0(value) {
  return Math.round(Number(value) || 0);
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function pickFirst(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(typeof value === "number" && !Number.isFinite(value))
    ) {
      return value;
    }
  }

  return null;
}

function stripEmpty(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const out = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      if (value.length) out[key] = value;
      continue;
    }

    if (typeof value === "object") {
      const nested = stripEmpty(value);
      if (nested && Object.keys(nested).length) out[key] = nested;
      continue;
    }

    out[key] = value;
  }

  return out;
}

function boolish(value, fallback = false) {
  if (typeof value === "boolean") return value;

  const s = lower(value);

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "with",
      "dependent",
      "dependents",
      "with_dependents",
      "with dependents",
      "married",
      "spouse",
      "family"
    ].includes(s)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "without",
      "single",
      "none",
      "without_dependents",
      "without dependents"
    ].includes(s)
  ) {
    return false;
  }

  if (typeof value === "number") return value > 0;

  return fallback;
}

function dependentsToBahKey(value, familySize) {
  const hasDependents = resolveHasDependents(value, familySize);
  return hasDependents ? "with" : "without";
}

function resolveHasDependents(value, familySize) {
  if (value !== null && value !== undefined && value !== "") {
    return boolish(value, false);
  }

  const size = toNumber(familySize, 0);
  return size > 1;
}

function normalizeRankAny(value) {
  const raw = clean(value).toUpperCase().replace(/\s+/g, "");

  if (!raw) return "";

  try {
    return normalizeOfficialPayRank(raw);
  } catch (_) {}

  try {
    return normalizeBahRank(raw);
  } catch (_) {}

  if (/^[EOW]-\d{1,2}E?$/.test(raw)) return raw;
  if (/^[EOW]\d{1,2}E?$/.test(raw)) return `${raw[0]}-${raw.slice(1)}`;

  const map = {
    AB: "E-1",
    AMN: "E-2",
    A1C: "E-3",
    SRA: "E-4",
    SSGT: "E-5",
    TSGT: "E-6",
    MSGT: "E-7",
    SMSGT: "E-8",
    CMSGT: "E-9",
    "2LT": "O-1",
    "1LT": "O-2",
    CAPT: "O-3",
    MAJ: "O-4",
    LTCOL: "O-5",
    COL: "O-6"
  };

  return map[raw] || raw;
}

function rankShort(rank) {
  const p = normalizeRankAny(rank);

  const map = {
    "E-1": "AB",
    "E-2": "Amn",
    "E-3": "A1C",
    "E-4": "SrA",
    "E-5": "SSgt",
    "E-6": "TSgt",
    "E-7": "MSgt",
    "E-8": "SMSgt",
    "E-9": "CMSgt",
    "W-1": "WO1",
    "W-2": "CWO2",
    "W-3": "CWO3",
    "W-4": "CWO4",
    "W-5": "CWO5",
    "O-1": "2nd Lt",
    "O-2": "1st Lt",
    "O-3": "Capt",
    "O-4": "Maj",
    "O-5": "Lt Col",
    "O-6": "Col",
    "O-7": "Brig Gen",
    "O-8": "Maj Gen",
    "O-9": "Lt Gen",
    "O-10": "Gen"
  };

  return map[p] || p || "";
}

function normalizeMode(value) {
  const s = lower(value);

  if (
    [
      "ad",
      "active",
      "active_duty",
      "active duty",
      "active-duty",
      "servicemember",
      "service member"
    ].includes(s)
  ) {
    return "active_duty";
  }

  if (["vet", "veteran"].includes(s)) {
    return "veteran";
  }

  if (["retired", "retiree"].includes(s)) {
    return "retired";
  }

  if (["guard", "reserve", "reservist"].includes(s)) {
    return "reserve";
  }

  return s || "active_duty";
}

function isVeteranLike(mode) {
  const s = normalizeMode(mode);
  return s === "veteran" || s === "retired";
}

function isActiveLike(mode) {
  const s = normalizeMode(mode);
  return s === "active_duty" || s === "active" || s === "reserve" || s === "guard";
}

// ============================================================
// //#4) INPUT NORMALIZER
// ============================================================

export function normalizeCompensationInput(input = {}) {
  const rank = normalizeRankAny(
    pickFirst(
      input.rank_paygrade,
      input.rankPaygrade,
      input.paygrade,
      input.rank,
      input.grade
    )
  );

  const retiredRank = normalizeRankAny(
    pickFirst(
      input.retired_rank,
      input.retiredRank,
      input.retire_rank,
      input.retireRank,
      input.retirement_rank,
      input.retirementRank,
      rank
    )
  );

  const yos = toNullableNumber(
    pickFirst(
      input.yos,
      input.yearsOfService,
      input.years_of_service,
      input.years,
      input.serviceYears
    )
  );

  const retirementYos = toNullableNumber(
    pickFirst(
      input.retire_yos,
      input.retireYos,
      input.retirement_yos,
      input.retirementYos,
      input.yos,
      input.yearsOfService,
      input.years_of_service
    )
  );

  const mode = normalizeMode(
    pickFirst(input.mode, input.status, input.military_status, input.user_type)
  );

  const base = clean(
    pickFirst(
      input.base,
      input.pcsBase,
      input.pcs_base,
      input.installation,
      input.dutyStation,
      input.duty_station,
      input.base_name,
      input.baseName
    )
  );

  const zip = clean(
    pickFirst(
      input.zip,
      input.base_zip,
      input.baseZip,
      input.bah_zip,
      input.bahZip,
      input.dutyZip,
      input.duty_zip
    )
  );

  const familySize = toNullableNumber(
    pickFirst(
      input.family_size,
      input.familySize,
      input.household_size,
      input.householdSize,
      input.family
    )
  );

  const familyRaw = pickFirst(
    input.hasDependents,
    input.withDependents,
    input.with_dependents,
    input.dependents,
    input.family
  );

  const hasDependents = resolveHasDependents(familyRaw, familySize);
  const bahDependents = dependentsToBahKey(familyRaw, familySize);

  const vaRating = normalizeVaRating(
    pickFirst(
      input.va_disability,
      input.vaDisability,
      input.va_rating,
      input.vaRating,
      input.disability,
      input.disabilityRating
    )
  );

  const spouse = boolish(
    pickFirst(input.spouse, input.married, input.hasSpouse),
    hasDependents
  );

  const childrenUnder18 = Math.max(
    0,
    round0(
      pickFirst(
        input.childrenUnder18,
        input.children_under_18,
        input.childUnder18,
        input.children,
        input.dependent_children,
        0
      )
    )
  );

  const childrenInSchoolOver18 = Math.max(
    0,
    round0(
      pickFirst(
        input.childrenInSchoolOver18,
        input.children_over_18_school,
        input.childrenOver18School,
        input.schoolChildren,
        0
      )
    )
  );

  const dependentParents = clamp(
    round0(
      pickFirst(
        input.dependentParents,
        input.dependent_parents,
        input.parents,
        0
      )
    ),
    0,
    2
  );

  const basType = clean(pickFirst(input.basType, input.bas_type));

  const specialPayMonthly = Math.max(
    0,
    toNumber(
      pickFirst(
        input.specialPayMonthly,
        input.special_pay_monthly,
        input.specialPay,
        input.incentivePay,
        input.incentive_pay
      ),
      0
    )
  );

  const spouseIncomeMonthly = Math.max(
    0,
    toNumber(
      pickFirst(
        input.spouseIncomeMonthly,
        input.spouse_income_monthly,
        input.spouseIncome,
        input.spouse_income
      ),
      0
    )
  );

  const additionalIncomeMonthly = Math.max(
    0,
    toNumber(
      pickFirst(
        input.additionalIncomeMonthly,
        input.additional_monthly_income,
        input.additionalIncome,
        input.additional_income,
        input.otherIncome,
        input.other_income
      ),
      0
    )
  );

  const retirementSystem = clean(
    pickFirst(
      input.retirementSystem,
      input.retirement_system,
      input.retireSystem,
      input.retire_system,
      "HIGH3"
    )
  ).toUpperCase();

  const monthlyBasicPayAtRetirement = toNullableNumber(
    pickFirst(
      input.monthlyBasicPayAtRetirement,
      input.monthly_basic_pay_at_retirement,
      input.retirementBasePay,
      input.retirement_base_pay,
      input.basicPayAtRetirement
    )
  );

  const high36MonthlyArray =
    Array.isArray(input.high36MonthlyArray)
      ? input.high36MonthlyArray
      : Array.isArray(input.high36_monthly_array)
        ? input.high36_monthly_array
        : null;

  return stripEmpty({
    raw: input,

    mode,
    rank,
    retiredRank,
    yos,
    yearsOfService: yos,
    retirementYos,

    base,
    zip,

    family: familySize,
    familySize,
    hasDependents,
    dependents: hasDependents,
    bahDependents,

    basType,

    vaRating,
    spouse,
    dependentParents,
    childrenUnder18,
    childrenInSchoolOver18,

    specialPayMonthly,
    spouseIncomeMonthly,
    additionalIncomeMonthly,

    retirementSystem,
    monthlyBasicPayAtRetirement,
    high36MonthlyArray
  });
}

function normalizeVaRating(value) {
  const n = toNullableNumber(value);
  if (n === null) return null;

  const rounded = Math.round(n / 10) * 10;
  return clamp(rounded, 0, 100);
}

// ============================================================
// //#5) RESOLVERS
// ============================================================

function resolveOfficialPay(normalized) {
  const rank = normalized.rank;
  const yos = normalized.yos ?? 0;

  if (!rank) {
    return {
      ok: false,
      error: "Missing rank/paygrade for Base Pay and BAS.",
      basicPayMonthly: 0,
      basMonthly: 0
    };
  }

  try {
    const record = getPayRecord2026(rank, yos, {
      basType: normalized.basType
    });

    return {
      ok: true,
      rank: record.rank,
      yearsOfService: record.yearsOfService,
      basicPayMonthly: round2(record.basicPayMonthly),
      basMonthly: round2(record.basMonthly),
      rateVersion: record.sourceVersion || OFFICIAL_PAY_RATE_VERSION
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to resolve official Base Pay/BAS.",
      basicPayMonthly: 0,
      basMonthly: 0,
      rateVersion: OFFICIAL_PAY_RATE_VERSION
    };
  }
}

function resolveBah(normalized) {
  const rank = normalized.rank;
  const base = normalized.base;
  const dependents = normalized.bahDependents || "without";

  if (!rank) {
    return {
      ok: false,
      error: "Missing rank/paygrade for BAH.",
      bahMonthly: 0
    };
  }

  if (!base) {
    return {
      ok: false,
      error: "Missing base for BAH.",
      bahMonthly: 0
    };
  }

  try {
    const record = getBahRecord(base, rank, dependents);

    return {
      ok: true,
      base: record.base,
      canonicalBase: record.canonicalBase || record.base,
      dutyZip: record.dutyZip,
      zip: record.dutyZip,
      mhaCode: record.mhaCode,
      mhaName: record.mhaName,
      rank: record.rank,
      dependents: record.dependents,
      bahMonthly: round2(record.monthlyBAH ?? record.bah),
      rateVersion: record.rateVersion || OFFICIAL_BAH_RATE_VERSION
    };
  } catch (error) {
    let dutyZip = "";

    try {
      dutyZip = getDutyZip(base);
    } catch (_) {}

    let canonicalBase = "";

    try {
      canonicalBase = canonicalizeBase(base);
    } catch (_) {
      canonicalBase = base;
    }

    return {
      ok: false,
      error: error?.message || "Unable to resolve official BAH.",
      base,
      canonicalBase,
      dutyZip,
      zip: dutyZip,
      rank,
      dependents,
      bahMonthly: 0,
      rateVersion: OFFICIAL_BAH_RATE_VERSION
    };
  }
}

function resolveVa(normalized) {
  const rating = normalized.vaRating;

  if (!rating || rating <= 0) {
    return {
      ok: true,
      applied: false,
      rating: 0,
      vaMonthly: 0,
      rateVersion: OFFICIAL_VA_RATE_VERSION
    };
  }

  const result = safeGetVACompensation({
    rating,
    spouse: normalized.spouse,
    dependentParents: normalized.dependentParents,
    childrenUnder18: normalized.childrenUnder18,
    childrenInSchoolOver18: normalized.childrenInSchoolOver18
  });

  if (!result?.ok) {
    return {
      ok: false,
      applied: false,
      rating,
      vaMonthly: 0,
      error: result?.error || "Unable to resolve VA disability compensation.",
      rateVersion: OFFICIAL_VA_RATE_VERSION
    };
  }

  return {
    ok: true,
    applied: true,
    rating: result.rating,
    spouse: result.spouse,
    dependentParents: result.dependentParents,
    childrenUnder18: result.childrenUnder18,
    childrenInSchoolOver18: result.childrenInSchoolOver18,
    vaMonthly: round2(result.monthlyVA),
    baseMonthlyVA: round2(result.baseMonthlyVA),
    addedChildrenUnder18: round2(result.addedChildrenUnder18),
    addedChildrenInSchoolOver18: round2(result.addedChildrenInSchoolOver18),
    dependentStatusKey: result.dependentStatusKey,
    rateVersion: result.rateVersion || OFFICIAL_VA_RATE_VERSION
  };
}

function resolveRetirement(normalized, officialPay) {
  if (!isVeteranLike(normalized.mode) && !clean(normalized.retirementSystem)) {
    return {
      ok: true,
      applied: false,
      retirementMonthly: 0
    };
  }

  const mod = retirementModule?.default || retirementModule;

  const getRetirementPay =
    mod?.getRetirementPay ||
    retirementModule?.getRetirementPay ||
    null;

  if (typeof getRetirementPay !== "function") {
    return {
      ok: false,
      applied: false,
      retirementMonthly: 0,
      error: "official-retirement.js was not available as an importable module."
    };
  }

  const yearsOfService = normalized.retirementYos ?? normalized.yos;

  if (!yearsOfService || yearsOfService <= 0) {
    return {
      ok: false,
      applied: false,
      retirementMonthly: 0,
      error: "Missing years of service for retirement estimate."
    };
  }

  const monthlyBasicPayAtRetirement =
    normalized.monthlyBasicPayAtRetirement ||
    officialPay?.basicPayMonthly ||
    0;

  if (!monthlyBasicPayAtRetirement && !normalized.high36MonthlyArray) {
    return {
      ok: false,
      applied: false,
      retirementMonthly: 0,
      error: "Missing monthly basic pay at retirement for retirement estimate."
    };
  }

  try {
    const retirement = getRetirementPay({
      retirementSystem: normalized.retirementSystem || "HIGH3",
      yearsOfService,
      high36MonthlyArray: normalized.high36MonthlyArray || undefined,
      monthlyBasicPayAtRetirement
    });

    return {
      ok: true,
      applied: true,
      retirementSystem: retirement.retirementSystem,
      yearsOfService: retirement.yearsOfService,
      multiplier: retirement.multiplier,
      retiredPayBase: retirement.retiredPayBase,
      baseMethod: retirement.baseMethod,
      monthsUsedForBase: retirement.monthsUsedForBase,
      retirementMonthly: round2(retirement.grossMonthlyRetiredPay),
      grossMonthlyRetiredPay: round2(retirement.grossMonthlyRetiredPay),
      rateVersion: retirement.rateVersion
    };
  } catch (error) {
    return {
      ok: false,
      applied: false,
      retirementMonthly: 0,
      error: error?.message || "Unable to resolve retirement estimate."
    };
  }
}

// ============================================================
// //#6) MAIN COMPENSATION BUILDER
// ============================================================

export function buildCompensationContext(input = {}) {
  const normalized = normalizeCompensationInput(input);

  const warnings = [];
  const notes = [];

  const officialPay = resolveOfficialPay(normalized);
  const bah = resolveBah(normalized);
  const va = resolveVa(normalized);
  const retirement = resolveRetirement(normalized, officialPay);

  if (!officialPay.ok && officialPay.error) warnings.push(officialPay.error);
  if (!bah.ok && bah.error) warnings.push(bah.error);
  if (!va.ok && va.error) warnings.push(va.error);
  if (!retirement.ok && retirement.error) warnings.push(retirement.error);

  const payEngineInput = stripEmpty({
    rank: normalized.rank,
    rank_paygrade: normalized.rank,
    yos: normalized.yos,
    yearsOfService: normalized.yos,
    mode: normalized.mode,
    family: normalized.family,
    familySize: normalized.familySize,
    hasDependents: normalized.hasDependents,
    base: bah.canonicalBase || normalized.base,
    cityKey: normalized.cityKey,
    basType: normalized.basType,
    bahMonthly: bah.bahMonthly,
    vaMonthly: va.vaMonthly,
    specialPayMonthly: normalized.specialPayMonthly,
    spouseIncomeMonthly: normalized.spouseIncomeMonthly,
    additionalIncomeMonthly: normalized.additionalIncomeMonthly
  });

  let payEngineResult = null;

  try {
    payEngineResult = calculateMonthlyMilitaryIncome(payEngineInput);
  } catch (error) {
    warnings.push(error?.message || "pay-engine.js could not calculate monthly income.");
  }

  let paySummary = null;

  try {
    paySummary = calculatePaySummary(payEngineInput);
  } catch (_) {
    paySummary = null;
  }

  const basePayMonthly =
    toNullableNumber(payEngineResult?.monthly?.basicPay) ??
    toNullableNumber(paySummary?.basicPayMonthly) ??
    officialPay.basicPayMonthly ??
    0;

  const basMonthly =
    toNullableNumber(payEngineResult?.monthly?.bas) ??
    toNullableNumber(paySummary?.basMonthly) ??
    officialPay.basMonthly ??
    0;

  const bahMonthly =
    toNullableNumber(payEngineResult?.monthly?.bah) ??
    toNullableNumber(paySummary?.bahMonthly) ??
    bah.bahMonthly ??
    0;

  const vaMonthly =
    toNullableNumber(payEngineResult?.monthly?.vaDisability) ??
    toNullableNumber(paySummary?.vaMonthly) ??
    va.vaMonthly ??
    0;

  const specialPayMonthly =
    toNullableNumber(payEngineResult?.monthly?.specialPay) ??
    normalized.specialPayMonthly ??
    0;

  const spouseIncomeMonthly =
    toNullableNumber(payEngineResult?.monthly?.spouseIncome) ??
    normalized.spouseIncomeMonthly ??
    0;

  const additionalIncomeMonthly =
    toNullableNumber(payEngineResult?.monthly?.additionalIncome) ??
    normalized.additionalIncomeMonthly ??
    0;

  const retirementMonthly = retirement.retirementMonthly || 0;

  const activeMilitaryIncomeMonthly = round2(
    basePayMonthly +
      basMonthly +
      bahMonthly +
      vaMonthly +
      specialPayMonthly
  );

  const householdIncomeMonthly = round2(
    activeMilitaryIncomeMonthly +
      spouseIncomeMonthly +
      additionalIncomeMonthly +
      retirementMonthly
  );

  const totalMonthly = householdIncomeMonthly;

  if (bah.ok) {
    notes.push(
      `BAH resolved from ${bah.canonicalBase || bah.base} / ${bah.dutyZip} using ${bah.dependents} dependents.`
    );
  }

  if (va.applied) {
    notes.push(`VA disability resolved at ${va.rating}%.`);
  }

  if (retirement.applied) {
    notes.push(`Retirement estimate resolved using ${retirement.retirementSystem}.`);
  }

  return stripEmpty({
    ok: warnings.length === 0 || totalMonthly > 0,

    version: {
      compensationContext: COMPENSATION_CONTEXT_VERSION,
      payEngine: PAY_ENGINE_VERSION,
      officialPay: OFFICIAL_PAY_RATE_VERSION,
      officialBah: OFFICIAL_BAH_RATE_VERSION,
      officialVa: OFFICIAL_VA_RATE_VERSION,
      officialRetirement: retirement.rateVersion
    },

    profile: {
      mode: normalized.mode,
      rank: normalized.rank,
      rank_paygrade: normalized.rank,
      rankShort: rankShort(normalized.rank),
      yearsOfService: normalized.yos,
      yos: normalized.yos,
      family: normalized.family,
      familySize: normalized.familySize,
      hasDependents: normalized.hasDependents,
      dependents: normalized.bahDependents,
      base: bah.canonicalBase || normalized.base,
      canonicalBase: bah.canonicalBase,
      dutyZip: bah.dutyZip,
      zip: bah.dutyZip || normalized.zip,
      mhaCode: bah.mhaCode,
      mhaName: bah.mhaName,
      vaRating: va.rating || normalized.vaRating || 0
    },

    monthly: {
      basePay: round2(basePayMonthly),
      basicPay: round2(basePayMonthly),
      bas: round2(basMonthly),
      bah: round2(bahMonthly),
      vaDisability: round2(vaMonthly),
      retirement: round2(retirementMonthly),
      specialPay: round2(specialPayMonthly),
      spouseIncome: round2(spouseIncomeMonthly),
      additionalIncome: round2(additionalIncomeMonthly),
      activeMilitaryIncome: round2(activeMilitaryIncomeMonthly),
      householdIncome: round2(householdIncomeMonthly),
      total: round2(totalMonthly)
    },

    annual: {
      householdIncome: round2(householdIncomeMonthly * 12),
      total: round2(totalMonthly * 12)
    },

    components: {
      officialPay,
      bah,
      va,
      retirement,
      payEngine: payEngineResult
    },

    // ask-amy.js normalizeCompensation compatibility
    rank: normalized.rank,
    rank_paygrade: normalized.rank,
    paygrade: normalized.rank,
    rankShort: rankShort(normalized.rank),
    yos: normalized.yos,
    yearsOfService: normalized.yos,

    base: bah.canonicalBase || normalized.base,
    canonicalBase: bah.canonicalBase,
    resolvedBase: bah.canonicalBase || normalized.base,
    zip: bah.dutyZip || normalized.zip,
    resolvedZip: bah.dutyZip || normalized.zip,
    dutyZip: bah.dutyZip,
    mhaCode: bah.mhaCode,
    mhaName: bah.mhaName,

    with_dependents: normalized.hasDependents,
    dependents: normalized.bahDependents,

    basePay: round2(basePayMonthly),
    base_pay: round2(basePayMonthly),
    basicPay: round2(basePayMonthly),
    monthly_base_pay: round2(basePayMonthly),

    bas: round2(basMonthly),
    BAS: round2(basMonthly),

    bah: round2(bahMonthly),
    BAH: round2(bahMonthly),
    bahMonthly: round2(bahMonthly),
    monthlyBah: round2(bahMonthly),
    housing_allowance: round2(bahMonthly),

    va: round2(vaMonthly),
    va_disability_pay: round2(vaMonthly),
    vaCompensation: round2(vaMonthly),
    vaMonthly: round2(vaMonthly),

    retirement: round2(retirementMonthly),
    retirement_pay: round2(retirementMonthly),
    retired_pay: round2(retirementMonthly),

    specialPay: round2(specialPayMonthly),
    spouseIncome: round2(spouseIncomeMonthly),
    additionalIncome: round2(additionalIncomeMonthly),

    total: round2(totalMonthly),
    totalMonthly: round2(totalMonthly),
    total_monthly: round2(totalMonthly),
    monthly_total: round2(totalMonthly),
    householdIncomeMonthly: round2(householdIncomeMonthly),
    militaryIncomeMonthly: round2(activeMilitaryIncomeMonthly),

    source: "TheWing compensation-context.js",
    sourceVersion: COMPENSATION_CONTEXT_VERSION,
    note: notes.join(" "),
    notes,
    warnings
  });
}

// ============================================================
// //#7) SAFE WRAPPER
// ============================================================

export function safeBuildCompensationContext(input = {}) {
  try {
    return buildCompensationContext(input);
  } catch (error) {
    return {
      ok: false,
      error:
        error?.message ||
        "Unable to build compensation context.",
      version: {
        compensationContext: COMPENSATION_CONTEXT_VERSION,
        officialPay: OFFICIAL_PAY_RATE_VERSION,
        officialBah: OFFICIAL_BAH_RATE_VERSION,
        officialVa: OFFICIAL_VA_RATE_VERSION
      }
    };
  }
}

// ============================================================
// //#8) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  COMPENSATION_CONTEXT_VERSION,
  normalizeCompensationInput,
  buildCompensationContext,
  safeBuildCompensationContext
});
