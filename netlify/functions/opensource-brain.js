// netlify/functions/opensource-brain.js
// ============================================================
// TheWing.ai • Open Source Brain
// v1.1.2
//
// PURPOSE
// - Public calculator endpoint for PCSUnited tools
// - NO email required
// - NO Supabase required
// - Uses TheWing official source modules
// - Designed for:
//   1) BAH Calculator
//   2) PCS Snapshot / open compensation
//   3) Retirement + VA Calculator
//
// REQUIRED FILES
// - netlify/functions/_share/official-pay.js
// - netlify/functions/_share/official-bah.js
// - netlify/functions/_share/official-va.js
// - netlify/functions/_share/official-retirement.js
//
// ROUTES
// - /.netlify/functions/opensource-brain
// - /api/opensource-brain through netlify.toml redirect
//
// UPDATE v1.1.1
// - PCS_SNAPSHOT now requires rank/paygrade.
// - PCS_SNAPSHOT now requires YOS.
// - PCS_SNAPSHOT now requires dependent status / family value.
// - PCS_SNAPSHOT no longer silently defaults missing rank to E-5.
// - PCS_SNAPSHOT no longer silently defaults missing YOS to 0.
// - PCS_SNAPSHOT no longer silently defaults missing dependents to "with."
// - Added dedicated PCS_SNAPSHOT payload branch.
// - Added clearer Base Pay vs BAH error messages.
// - Error responses now include sourceVersions.
// - Handler now supports body.type / input.tool / input.type.
//
// UPDATE v1.1.2
// - RETIREMENT_VA now requires explicit rank, YOS, and VA rating.
// - Added validateRetirementVAInput() with dependent field checks.
// - RETIREMENT_VA exposes retirementBaseMethod and compensationAccuracy.
// - RETIREMENT_VA monthly payload includes frontend extraction aliases.
// - RETIREMENT_VA summary headline distinguishes High-3 vs estimate proxy.
// ============================================================

import {
  RATE_VERSION as OFFICIAL_PAY_RATE_VERSION,
  getPayRecord2026
} from "./_share/official-pay.js";

import {
  RATE_VERSION as OFFICIAL_BAH_RATE_VERSION,
  getBahRecord
} from "./_share/official-bah.js";

import * as OFFICIAL_VA from "./_share/official-va.js";
import * as OFFICIAL_RETIREMENT from "./_share/official-retirement.js";

// ============================================================
// //#1) CONFIG
// ============================================================

const BRAIN_VERSION = "thewing-open-brain-1.1.2";

const SUPPORTED_VA_RATINGS = Object.freeze([
  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
]);
const APP_NAME = "TheWing.ai";
const ALLOW_ORIGIN = "*";

const OFFICIAL_VA_RATE_VERSION =
  OFFICIAL_VA.RATE_VERSION ||
  "official-va-unknown";

const OFFICIAL_RETIREMENT_RATE_VERSION =
  OFFICIAL_RETIREMENT.RATE_VERSION ||
  "official-retirement-unknown";

// ============================================================
// //#2) RESPONSE HELPERS
// ============================================================

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

// ============================================================
// //#3) SMALL HELPERS
// ============================================================

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeUpper(value) {
  return normalizeString(value).toUpperCase();
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInteger(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function money(value) {
  return round2(value);
}

function inferToolName(toolName) {
  const s = normalizeUpper(toolName || "GENERIC")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  return [
    "BAH_CALCULATOR",
    "PCS_SNAPSHOT",
    "FAD",
    "ASK_ELENA",
    "AIOU",
    "GENERIC",
    "PUBLIC_COMPENSATION",
    "OPEN_COMPENSATION",
    "RETIREMENT_VA",
    "VA_RETIREMENT",
    "RETIREMENT_AND_VA",
    "RETIREMENT_VA_CALCULATOR"
  ].includes(s)
    ? s
    : "GENERIC";
}

function normalizeRank(rank) {
  const raw = normalizeUpper(rank);

  if (!raw) return "";

  const m = raw.match(/^([EOW])\s*-?\s*(\d{1,2})(E)?$/);

  if (m) {
    return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;
  }

  return raw.replace(/\s+/g, "");
}

function normalizeRetirementSystem(value, options = {}) {
  const raw = normalizeUpper(value);
  const hasExplicit = hasInputValue(value);

  if (!raw) {
    return "HIGH3";
  }

  if (raw === "HIGH3" || raw === "HIGH-3" || raw === "HIGH 3") return "HIGH3";
  if (raw === "BRS" || raw === "BLENDED") return "BRS";

  if (options.strict === true || hasExplicit) {
    throw new Error(
      `Unsupported retirementSystem "${value}". Supported systems: HIGH3, BRS.`
    );
  }

  return "HIGH3";
}

function hasInputValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function hasRankInput(input = {}) {
  return [
    input.rank,
    input.rank_paygrade,
    input.rankPaygrade,
    input.paygrade,
    input.grade
  ].some(hasInputValue);
}

function hasYosInput(input = {}) {
  return [
    input.yos,
    input.yearsOfService,
    input.years_of_service,
    input.serviceYears
  ].some(hasInputValue);
}

function hasBaseInput(input = {}) {
  return [
    input.base,
    input.currentBase,
    input.current_base,
    input.location,
    input.duty_station,
    input.dutyStation,
    input.station,
    input.pcs_base,
    input.pcsBase
  ].some(hasInputValue);
}

function hasDependentInput(input = {}) {
  return [
    input.dependents,
    input.dependentStatus,
    input.dependent_status,
    input.hasDependents,
    input.has_dependents,
    input.family,
    input.familySize,
    input.family_size
  ].some(function(value){
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function getVaRatingInput(input = {}) {
  return (
    input.vaRating ??
    input.va_rating ??
    input.vaDisability ??
    input.va_disability ??
    input.disability_rating ??
    input.disabilityRating ??
    input.rating
  );
}

function hasVaRatingInput(input = {}) {
  const raw = getVaRatingInput(input);
  return hasInputValue(raw);
}

function isBooleanCompatible(value) {
  if (value === true || value === false) return true;
  if (value === undefined || value === null || String(value).trim() === "") {
    return true;
  }

  const s = String(value).trim().toLowerCase();

  return ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(s);
}

function toNonNegativeInteger(value, fieldName) {
  const n = Number.parseInt(String(value ?? "").replace(/[^\d-]/g, ""), 10);

  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }

  return n;
}

function validateRetirementVAInput(input = {}) {
  if (!hasRankInput(input)) {
    throw new Error("Missing rank/paygrade for RETIREMENT_VA calculation.");
  }

  if (!hasYosInput(input)) {
    throw new Error("Missing years of service for RETIREMENT_VA calculation.");
  }

  const yosValue =
    input.yos ??
    input.yearsOfService ??
    input.years_of_service ??
    input.serviceYears;

  const yosNumber = Number(yosValue);

  if (!Number.isFinite(yosNumber) || yosNumber < 0) {
    throw new Error("Invalid years of service for RETIREMENT_VA calculation.");
  }

  if (
    hasInputValue(input.retirementSystem) ||
    hasInputValue(input.retirement_system) ||
    hasInputValue(input.system)
  ) {
    normalizeRetirementSystem(
      input.retirementSystem ||
      input.retirement_system ||
      input.system,
      { strict: true }
    );
  }

  if (!hasVaRatingInput(input)) {
    throw new Error("Missing VA disability rating for RETIREMENT_VA calculation.");
  }

  const vaRating = toInteger(getVaRatingInput(input), NaN);

  if (!SUPPORTED_VA_RATINGS.includes(vaRating)) {
    throw new Error(
      `Invalid VA disability rating for RETIREMENT_VA calculation. Supported ratings: ${SUPPORTED_VA_RATINGS.join(", ")}.`
    );
  }

  if (!isBooleanCompatible(input.spouse)) {
    throw new Error("spouse must be a boolean-compatible value for RETIREMENT_VA calculation.");
  }

  const childrenUnder18 = toNonNegativeInteger(
    input.childrenUnder18 ?? input.children_under_18 ?? 0,
    "childrenUnder18"
  );

  const childrenInSchoolOver18 = toNonNegativeInteger(
    input.childrenInSchoolOver18 ??
    input.children_in_school_over_18 ??
    input.childrenOver18School ??
    input.children_over_18_school ??
    0,
    "childrenInSchoolOver18"
  );

  const dependentParents = toNonNegativeInteger(
    input.dependentParents ?? input.dependent_parents ?? 0,
    "dependentParents"
  );

  if (dependentParents > 2) {
    throw new Error("dependentParents cannot exceed 2 for RETIREMENT_VA calculation.");
  }
}

function validatePcsSnapshotInput(input = {}) {
  if (!hasRankInput(input)) {
    throw new Error("Missing rank/paygrade for PCS_SNAPSHOT compensation calculation.");
  }

  if (!hasYosInput(input)) {
    throw new Error("Missing years of service for PCS_SNAPSHOT compensation calculation.");
  }

  const yosValue =
    input.yos ??
    input.yearsOfService ??
    input.years_of_service ??
    input.serviceYears;

  const yosNumber = Number(yosValue);

  if (!Number.isFinite(yosNumber) || yosNumber < 0) {
    throw new Error("Invalid years of service for PCS_SNAPSHOT compensation calculation.");
  }

  if (!hasBaseInput(input)) {
    throw new Error("Missing base/duty station for PCS_SNAPSHOT BAH calculation.");
  }

  if (!hasDependentInput(input)) {
    throw new Error("Missing dependent status/family value for PCS_SNAPSHOT BAH calculation.");
  }
}

function normalizeDependents(value, input = {}, options = {}) {
  const hasExplicit =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  const raw =
    value ??
    input.dependents ??
    input.dependentStatus ??
    input.dependent_status ??
    input.hasDependents ??
    input.has_dependents ??
    input.family ??
    input.familySize ??
    input.family_size ??
    (
      options.requireExplicit
        ? ""
        : "with"
    );

  if (options.requireExplicit && !hasExplicit && !hasDependentInput(input)) {
    throw new Error("Missing dependent status/family value for compensation calculation.");
  }

  if (typeof raw === "boolean") {
    return raw ? "with" : "without";
  }

  if (typeof raw === "number") {
    return raw >= 2 ? "with" : "without";
  }

  const s = normalizeString(raw).toLowerCase();

  if (!s) {
    if (options.requireExplicit) {
      throw new Error("Missing dependent status/family value for compensation calculation.");
    }

    return "with";
  }

  if (
    [
      "with",
      "yes",
      "true",
      "1",
      "dependent",
      "dependents",
      "with dependents",
      "with_dependents"
    ].includes(s)
  ) {
    return "with";
  }

  if (
    [
      "without",
      "no",
      "false",
      "0",
      "single",
      "none",
      "without dependents",
      "without_dependents"
    ].includes(s)
  ) {
    return "without";
  }

  const maybeNumber = Number(s);

  if (Number.isFinite(maybeNumber)) {
    return maybeNumber >= 2 ? "with" : "without";
  }

  return s.includes("without") || s.includes("no") ? "without" : "with";
}

function normalizeBase(value) {
  const raw = normalizeString(value);

  if (!raw) return "";

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  const aliasMap = {
    jbsalackland: "Lackland AFB",
    lackland: "Lackland AFB",
    lacklandafb: "Lackland AFB",

    jbsarandolph: "Randolph AFB",
    randolph: "Randolph AFB",
    randolphafb: "Randolph AFB",

    jbsafortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhoustonafb: "Fort-Sam-Houston AFB",

    davismonthan: "Davis-Monthan AFB",
    davismonthanafb: "Davis-Monthan AFB",
    dmafb: "Davis-Monthan AFB",

    fewarren: "F.E-Warren AFB",
    fewarrenafb: "F.E-Warren AFB",
    fewarrenairforcebase: "F.E-Warren AFB",
    francisewarren: "F.E-Warren AFB",

    littlerock: "Little-Rock AFB",
    littlerockafb: "Little-Rock AFB",

    mountainhome: "Mountain-Home AFB",
    mountainhomeafb: "Mountain-Home AFB",

    seymourjohnson: "Seymour-Johnson AFB",
    seymourjohnsonafb: "Seymour-Johnson AFB",

    wrightpatterson: "Wright-Patterson AFB",
    wrightpattersonafb: "Wright-Patterson AFB",
    wpafb: "Wright-Patterson AFB"
  };

  return aliasMap[compact] || raw;
}

function rankTitle(rank) {
  const map = {
    "E-1": "Airman Basic",
    "E-2": "Airman",
    "E-3": "Airman First Class",
    "E-4": "Senior Airman",
    "E-5": "Staff Sergeant",
    "E-6": "Technical Sergeant",
    "E-7": "Master Sergeant",
    "E-8": "Senior Master Sergeant",
    "E-9": "Chief Master Sergeant",

    "W-1": "Warrant Officer 1",
    "W-2": "Chief Warrant Officer 2",
    "W-3": "Chief Warrant Officer 3",
    "W-4": "Chief Warrant Officer 4",
    "W-5": "Chief Warrant Officer 5",

    "O-1": "Second Lieutenant",
    "O-2": "First Lieutenant",
    "O-3": "Captain",
    "O-4": "Major",
    "O-5": "Lieutenant Colonel",
    "O-6": "Colonel",
    "O-7": "Brigadier General",
    "O-8": "Major General",

    "O-1E": "Second Lieutenant prior enlisted",
    "O-2E": "First Lieutenant prior enlisted",
    "O-3E": "Captain prior enlisted"
  };

  return map[rank] || rank;
}

function sourceVersions() {
  return {
    brainVersion: BRAIN_VERSION,
    app: APP_NAME,
    payVersion: OFFICIAL_PAY_RATE_VERSION || null,
    bahVersion: OFFICIAL_BAH_RATE_VERSION || null,
    vaVersion: OFFICIAL_VA_RATE_VERSION || null,
    retirementVersion: OFFICIAL_RETIREMENT_RATE_VERSION || null
  };
}

// ============================================================
// //#4) PROFILE NORMALIZATION — ACTIVE DUTY / BAH
// ============================================================

function buildCanonicalProfile(input = {}, options = {}) {
  const requireExplicit = options.requireExplicit === true;

  const rankInput =
    input.rank ||
    input.rank_paygrade ||
    input.rankPaygrade ||
    input.paygrade ||
    input.grade ||
    (
      requireExplicit
        ? ""
        : "E-5"
    );

  const rank = normalizeRank(rankInput);

  if (requireExplicit && !rank) {
    throw new Error("Missing rank/paygrade for compensation calculation.");
  }

  const yosRaw =
    input.yos ??
    input.yearsOfService ??
    input.years_of_service ??
    input.serviceYears ??
    (
      requireExplicit
        ? undefined
        : 0
    );

  if (requireExplicit && !hasInputValue(yosRaw)) {
    throw new Error("Missing years of service for compensation calculation.");
  }

  const yearsOfService = toFiniteNumber(yosRaw, NaN);

  if (!Number.isFinite(yearsOfService) || yearsOfService < 0) {
    throw new Error("Invalid years of service for compensation calculation.");
  }

  const currentBase = normalizeBase(
    input.base ||
    input.currentBase ||
    input.current_base ||
    input.location ||
    input.duty_station ||
    input.dutyStation ||
    input.station ||
    input.pcs_base ||
    input.pcsBase ||
    ""
  );

  if (requireExplicit && !currentBase) {
    throw new Error("Missing base/duty station for compensation calculation.");
  }

  const dependents = normalizeDependents(
    input.dependents ??
    input.dependentStatus ??
    input.dependent_status ??
    input.hasDependents ??
    input.has_dependents ??
    input.family ??
    input.familySize ??
    input.family_size,
    input,
    { requireExplicit }
  );

  return {
    mode: "ACTIVE_DUTY",
    rank,
    rankTitle: rankTitle(rank),
    yearsOfService,
    yos: yearsOfService,
    currentBase,
    base: currentBase,
    dependents,
    hasDependents: dependents === "with",

    additionalIncome: toFiniteNumber(input.additionalIncome ?? input.additional_income, 0),
    monthlyExpenses: toFiniteNumber(input.monthlyExpenses ?? input.monthly_expenses ?? input.expenses, 0),
    monthlyDebt: toFiniteNumber(input.monthlyDebt ?? input.monthly_debt ?? input.debt, 0),
    downpayment: toFiniteNumber(input.downpayment ?? input.downPayment ?? input.down_payment, 0),
    projectedHomePrice: toFiniteNumber(input.projectedHomePrice ?? input.projected_home_price ?? input.price, 0),
    creditScore: toFiniteNumber(input.creditScore ?? input.credit_score, 0)
  };
}

// ============================================================
// //#5) ACTIVE DUTY COMPENSATION ENGINE
// ============================================================

function getCompensationProfile(profile) {
  if (!profile.currentBase) {
    throw new Error("BAH calculation failed: base/duty station is required.");
  }

  let payRecord;

  try {
    payRecord = getPayRecord2026(profile.rank, profile.yearsOfService, {
      basType: profile.basType || ""
    });
  } catch (err) {
    throw new Error(
      `Base Pay calculation failed from official-pay.js for rank ${profile.rank || "UNKNOWN"} at ${profile.yearsOfService ?? "UNKNOWN"} years of service: ${err?.message || "Unknown pay error"}`
    );
  }

  let bahRecord;

  try {
    bahRecord = getBahRecord(
      profile.currentBase,
      profile.rank,
      profile.dependents
    );
  } catch (err) {
    throw new Error(
      `BAH calculation failed from official-bah.js for base ${profile.currentBase || "UNKNOWN"}, rank ${profile.rank || "UNKNOWN"}, dependents ${profile.dependents || "UNKNOWN"}: ${err?.message || "Unknown BAH error"}`
    );
  }

  const basicPay = money(payRecord.basicPayMonthly);
  const bas = money(payRecord.basMonthly);
  const bah = money(bahRecord.bah);
  const grossMonthlyComp = money(basicPay + bas + bah);

  return {
    ok: true,
    lane: "ACTIVE_DUTY",
    monthly: {
      basicPay,
      basePay: basicPay,
      bas,
      bah,
      grossMonthlyComp,
      combinedMonthlyGross: grossMonthlyComp,
      totalMilitaryIncome: grossMonthlyComp,
      totalMonthly: grossMonthlyComp
    },
    detail: {
      payRecord,
      bahRecord,
      rankTitle: profile.rankTitle,
      sourceModules: {
        officialPay: OFFICIAL_PAY_RATE_VERSION,
        officialBah: OFFICIAL_BAH_RATE_VERSION
      }
    },
    sourceVersion: `${OFFICIAL_PAY_RATE_VERSION}+${OFFICIAL_BAH_RATE_VERSION}`
  };
}

// ============================================================
// //#6) RETIREMENT + VA ENGINE
// ============================================================

function getOfficialVACompensation(input) {
  if (typeof OFFICIAL_VA.safeGetVACompensation === "function") {
    const result = OFFICIAL_VA.safeGetVACompensation(input);
    if (result && result.ok === false) {
      throw new Error(result.error || "VA compensation calculation failed.");
    }
    return result;
  }

  if (typeof OFFICIAL_VA.getVACompensation === "function") {
    return OFFICIAL_VA.getVACompensation(input);
  }

  throw new Error("official-va.js must export getVACompensation or safeGetVACompensation.");
}

function getOfficialRetirementPay(input) {
  if (typeof OFFICIAL_RETIREMENT.safeGetRetirementPay === "function") {
    const result = OFFICIAL_RETIREMENT.safeGetRetirementPay(input);
    if (result && result.ok === false) {
      throw new Error(result.error || "Retirement calculation failed.");
    }
    return result;
  }

  if (typeof OFFICIAL_RETIREMENT.getRetirementPay === "function") {
    return OFFICIAL_RETIREMENT.getRetirementPay(input);
  }

  throw new Error("official-retirement.js must export getRetirementPay or safeGetRetirementPay.");
}

function buildRetirementVAProfile(input = {}) {
  if (!hasRankInput(input)) {
    throw new Error("Missing rank/paygrade for RETIREMENT_VA calculation.");
  }

  if (!hasYosInput(input)) {
    throw new Error("Missing years of service for RETIREMENT_VA calculation.");
  }

  const rank = normalizeRank(
    input.rank ||
    input.rank_paygrade ||
    input.rankPaygrade ||
    input.paygrade ||
    input.grade ||
    ""
  );

  if (!rank) {
    throw new Error("Missing rank/paygrade for RETIREMENT_VA calculation.");
  }

  const yearsOfService = toFiniteNumber(
    input.yos ??
    input.yearsOfService ??
    input.years_of_service ??
    input.serviceYears,
    NaN
  );

  if (!Number.isFinite(yearsOfService) || yearsOfService < 0) {
    throw new Error("Invalid years of service for RETIREMENT_VA calculation.");
  }

  const retirementSystem = normalizeRetirementSystem(
    input.retirementSystem ||
    input.retirement_system ||
    input.system ||
    "HIGH3"
  );

  if (!hasVaRatingInput(input)) {
    throw new Error("Missing VA disability rating for RETIREMENT_VA calculation.");
  }

  const vaRating = toInteger(getVaRatingInput(input), NaN);

  if (!SUPPORTED_VA_RATINGS.includes(vaRating)) {
    throw new Error(
      `Invalid VA disability rating for RETIREMENT_VA calculation. Supported ratings: ${SUPPORTED_VA_RATINGS.join(", ")}.`
    );
  }

  const spouse =
    input.spouse === true ||
    String(input.spouse || "").toLowerCase() === "true" ||
    String(input.spouse || "").toLowerCase() === "yes";

  const childrenUnder18 = toInteger(
    input.childrenUnder18 ??
    input.children_under_18 ??
    0,
    0
  );

  const childrenInSchoolOver18 = toInteger(
    input.childrenInSchoolOver18 ??
    input.children_in_school_over_18 ??
    input.childrenOver18School ??
    input.children_over_18_school ??
    0,
    0
  );

  const dependentParents = toInteger(
    input.dependentParents ??
    input.dependent_parents ??
    0,
    0
  );

  const dependentProfile = normalizeString(
    input.dependentProfile ||
    input.dependent_profile ||
    (
      spouse && childrenUnder18 > 0
        ? "Veteran + Spouse + Child"
        : spouse
          ? "Veteran + Spouse"
          : childrenUnder18 > 0
            ? "Veteran + Child"
            : "Veteran Only"
    )
  );

  return {
    mode: "VETERAN",
    rank,
    rankTitle: rankTitle(rank),
    yearsOfService,
    yos: yearsOfService,
    retirementSystem,
    vaRating,
    vaDisability: vaRating,
    dependentProfile,
    spouse,
    childrenUnder18,
    childrenInSchoolOver18,
    dependentParents
  };
}

function resolveRetirementAccuracy(retirementRecord = {}) {
  const retirementBaseMethod =
    retirementRecord.baseMethod || "FINAL_MONTH_ESTIMATE";

  if (retirementBaseMethod === "HIGH36_AVERAGE") {
    return {
      retirementBaseMethod,
      compensationAccuracy: "official_va_and_high36_retirement",
      retirementLabel: "High-3 retirement"
    };
  }

  return {
    retirementBaseMethod,
    compensationAccuracy: "official_va_and_retirement_estimate",
    retirementLabel: "Retirement estimate using final monthly basic pay proxy"
  };
}

function buildRetirementVAPayload(input = {}, tool = "RETIREMENT_VA") {
  validateRetirementVAInput(input);

  const profile = buildRetirementVAProfile(input);
  const generatedAt = new Date().toISOString();

  const payRecord = getPayRecord2026(profile.rank, profile.yearsOfService, {
    basType: ""
  });

  const monthlyBasicPayAtRetirement = money(payRecord.basicPayMonthly);

  const retirementInput = {
    retirementSystem: profile.retirementSystem,
    yearsOfService: profile.yearsOfService,
    monthlyBasicPayAtRetirement
  };

  if (Array.isArray(input.high36MonthlyArray) && input.high36MonthlyArray.length > 0) {
    retirementInput.high36MonthlyArray = input.high36MonthlyArray;
  }

  const retirementRecord = getOfficialRetirementPay(retirementInput);
  const accuracy = resolveRetirementAccuracy(retirementRecord);

  const vaRecord =
    profile.vaRating > 0
      ? getOfficialVACompensation({
          rating: profile.vaRating,
          spouse: profile.spouse,
          dependentParents: profile.dependentParents,
          childrenUnder18: profile.childrenUnder18,
          childrenInSchoolOver18: profile.childrenInSchoolOver18
        })
      : {
          ok: true,
          rating: 0,
          monthlyVA: 0,
          baseMonthlyVA: 0,
          addedChildrenUnder18: 0,
          addedChildrenInSchoolOver18: 0,
          rateVersion: OFFICIAL_VA_RATE_VERSION
        };

  const retiredPayGross = money(
    retirementRecord.grossMonthlyRetiredPay ??
    retirementRecord.retiredPayGross ??
    retirementRecord.monthlyRetirement ??
    0
  );

  const vaCompensation = money(
    vaRecord.monthlyVA ??
    vaRecord.vaCompensation ??
    0
  );

  const combinedMonthlyGross = money(retiredPayGross + vaCompensation);

  const monthly = {
    retiredPayGross,
    grossMonthlyRetiredPay: retiredPayGross,
    retirementPay: retiredPayGross,
    retirement_pay: retiredPayGross,
    retiredPay: retiredPayGross,
    retired_pay: retiredPayGross,
    monthlyRetirement: retiredPayGross,

    vaCompensation,
    monthlyVA: vaCompensation,
    vaMonthly: vaCompensation,
    disabilityPay: vaCompensation,
    disability_pay: vaCompensation,
    vaDisabilityPay: vaCompensation,
    va_disability_pay: vaCompensation,

    combinedMonthlyGross,
    grossMonthlyComp: combinedMonthlyGross,
    totalMonthly: combinedMonthlyGross,
    total: combinedMonthlyGross,
    total_monthly: combinedMonthlyGross
  };

  const sourceModules = {
    officialPay: OFFICIAL_PAY_RATE_VERSION || null,
    officialRetirement: OFFICIAL_RETIREMENT_RATE_VERSION || null,
    officialVa: OFFICIAL_VA_RATE_VERSION || null
  };

  const compensation = {
    ok: true,
    lane: "RETIRED_VETERAN",
    monthly,
    detail: {
      payRecord,
      retirementRecord,
      vaRecord,
      retirementBaseMethod: accuracy.retirementBaseMethod,
      compensationAccuracy: accuracy.compensationAccuracy,
      retirementLabel: accuracy.retirementLabel,
      sourceModules
    },
    sourceVersion: `${OFFICIAL_PAY_RATE_VERSION}+${OFFICIAL_RETIREMENT_RATE_VERSION}+${OFFICIAL_VA_RATE_VERSION}`
  };

  const calculator = {
    retirementSystem: profile.retirementSystem,
    rank: profile.rank,
    rankTitle: profile.rankTitle,
    yearsOfService: profile.yearsOfService,
    vaRating: profile.vaRating,
    dependentProfile: profile.dependentProfile,
    monthlyBasicPayAtRetirement,
    retirementBaseMethod: accuracy.retirementBaseMethod,
    compensationAccuracy: accuracy.compensationAccuracy,
    retirementLabel: accuracy.retirementLabel,

    retiredPayGross,
    grossMonthlyRetiredPay: retiredPayGross,
    retirementPay: retiredPayGross,

    vaCompensation,
    monthlyVA: vaCompensation,
    vaMonthly: vaCompensation,

    combinedMonthlyGross,
    totalMonthly: combinedMonthlyGross,

    retirementRecord,
    vaRecord,
    payRecord
  };

  const summaryHeadline =
    accuracy.retirementBaseMethod === "HIGH36_AVERAGE"
      ? `Combined monthly retired pay and VA compensation is $${combinedMonthlyGross.toLocaleString()}.`
      : `Estimated combined monthly retired pay and VA compensation is $${combinedMonthlyGross.toLocaleString()} because retirement uses final monthly basic pay as a High-3 proxy.`;

  const summary = {
    mode: "VETERAN",
    headline: summaryHeadline,
    monthlyIncome: combinedMonthlyGross,
    monthlyRetiredPay: retiredPayGross,
    monthlyVA: vaCompensation,
    combinedMonthlyGross,
    retirementBaseMethod: accuracy.retirementBaseMethod,
    compensationAccuracy: accuracy.compensationAccuracy,
    retirementLabel: accuracy.retirementLabel
  };

  return {
    tool,
    app: APP_NAME,
    brainVersion: BRAIN_VERSION,
    generatedAt,
    payRateVersion: OFFICIAL_PAY_RATE_VERSION || null,
    retirementRateVersion: OFFICIAL_RETIREMENT_RATE_VERSION || null,
    vaRateVersion: OFFICIAL_VA_RATE_VERSION || null,
    profile,
    calculator,
    compensation,
    summary,

    monthly,
    retirementRecord,
    vaRecord,
    payRecord,

    readiness: {
      totalIncome: combinedMonthlyGross,
      totalExpenses: 0,
      residual: combinedMonthlyGross,
      readiness:
        combinedMonthlyGross <= 0
          ? "NEEDS_INPUTS"
          : combinedMonthlyGross < 3000
            ? "TIGHT"
            : combinedMonthlyGross < 6000
              ? "STABLE"
              : "STRONG"
    },

    sourceModules,
    sourceVersions: sourceVersions()
  };
}

// ============================================================
// //#7) ACTIVE DUTY PAYLOAD BUILDERS
// ============================================================

function buildSummaryFromComp(profile, compensation) {
  const monthly = compensation?.monthly || {};
  const combinedMonthlyGross = round2(monthly.combinedMonthlyGross || monthly.grossMonthlyComp || 0);

  return {
    mode: profile.mode,
    headline: `Estimated monthly active-duty compensation is $${combinedMonthlyGross.toLocaleString()}.`,
    monthlyIncome: combinedMonthlyGross,
    monthlyHousingAllowance: round2(monthly.bah || 0),
    monthlyFoodAllowance: round2(monthly.bas || 0),
    monthlyRetiredPay: null,
    monthlyVA: null,
    combinedMonthlyGross
  };
}

function buildHousingBaseline(profile, compensation) {
  const monthly = compensation?.monthly || {};
  const grossMonthly =
    monthly.combinedMonthlyGross ??
    monthly.grossMonthlyComp ??
    0;

  const gross = round2(grossMonthly);

  return {
    base: profile.currentBase || profile.base || "",
    grossMonthlyIncomeForHousing: gross,
    safeHousingTarget: round2(gross * 0.30),
    stretchHousingTarget: round2(gross * 0.35)
  };
}

function buildFinancialInputs(profile) {
  return {
    additionalIncome: round2(profile.additionalIncome || 0),
    monthlyExpenses: round2(profile.monthlyExpenses || 0),
    monthlyDebt: round2(profile.monthlyDebt || 0),
    downpayment: round2(profile.downpayment || 0),
    projectedHomePrice: round2(profile.projectedHomePrice || 0),
    creditScore: toFiniteNumber(profile.creditScore, 0)
  };
}

function buildReadinessSignals(profile, compensation) {
  const financial = buildFinancialInputs(profile);
  const monthly = compensation?.monthly || {};

  const gross =
    monthly.combinedMonthlyGross ??
    monthly.grossMonthlyComp ??
    0;

  const totalIncome = round2((gross || 0) + (financial.additionalIncome || 0));
  const totalExpenses = round2(
    (financial.monthlyExpenses || 0) + (financial.monthlyDebt || 0)
  );
  const residual = round2(totalIncome - totalExpenses);

  let readiness = "UNKNOWN";

  if (totalIncome <= 0) readiness = "NEEDS_INPUTS";
  else if (residual < 0) readiness = "AT_RISK";
  else if (residual < 500) readiness = "TIGHT";
  else if (residual < 1500) readiness = "STABLE";
  else readiness = "STRONG";

  return {
    totalIncome,
    totalExpenses,
    residual,
    readiness
  };
}

function buildGenericPayload(profile, compensation, tool) {
  const bahRecord = compensation?.detail?.bahRecord || {};
  const payRecord = compensation?.detail?.payRecord || {};
  const monthly = compensation?.monthly || {};

  return {
    tool,
    app: APP_NAME,
    profile,
    compensation,
    summary: buildSummaryFromComp(profile, compensation),
    housing: buildHousingBaseline(profile, compensation),
    financialInputs: buildFinancialInputs(profile),
    readiness: buildReadinessSignals(profile, compensation),

    monthly,
    bahRecord,
    payRecord,

    pay: {
      ok: true,
      payModel: "active",
      payAccuracy: "deterministic_official_modules",
      basePay: monthly.basicPay || 0,
      basicPay: monthly.basicPay || 0,
      bas: monthly.bas || 0,
      bah: monthly.bah || 0,
      totalPay: monthly.grossMonthlyComp || 0,
      total: monthly.grossMonthlyComp || 0,
      rankUsed: profile.rank,
      yosUsed: profile.yearsOfService,
      familyUsed: profile.hasDependents,
      zipUsed: bahRecord.dutyZip || null,
      zipSource: "official-bah.js",
      detail: {
        payRecord,
        bahRecord
      }
    },

    sourceVersions: sourceVersions()
  };
}

function buildPcsSnapshotPayload(profile, compensation) {
  return buildGenericPayload(profile, compensation, "PCS_SNAPSHOT");
}

function buildFadPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "FAD");

  return {
    ...payload,
    fad: {
      incomeMonthly: payload.readiness.totalIncome,
      baselineCompMonthly: round2(
        compensation?.monthly?.combinedMonthlyGross ??
        compensation?.monthly?.grossMonthlyComp ??
        0
      ),
      additionalIncomeMonthly: payload.financialInputs.additionalIncome,
      monthlyExpenses: payload.financialInputs.monthlyExpenses,
      monthlyDebt: payload.financialInputs.monthlyDebt,
      projectedHomePrice: payload.financialInputs.projectedHomePrice,
      downpayment: payload.financialInputs.downpayment,
      creditScore: payload.financialInputs.creditScore
    }
  };
}

function buildAskElenaPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "ASK_ELENA");

  return {
    ...payload,
    askElena: {
      bluf: payload.summary.headline,
      mode: profile.mode,
      rank: profile.rank,
      yearsOfService: profile.yearsOfService,
      currentBase: profile.currentBase,
      dependents: profile.dependents,
      readiness: payload.readiness.readiness,
      residual: payload.readiness.residual,
      housingSafeTarget: payload.housing.safeHousingTarget,
      housingStretchTarget: payload.housing.stretchHousingTarget
    }
  };
}

function buildAiouPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "AIOU");

  return {
    ...payload,
    aiou: {
      mode: profile.mode,
      rank: profile.rank,
      yearsOfService: profile.yearsOfService,
      baselineMonthlyComp: round2(
        compensation?.monthly?.combinedMonthlyGross ??
        compensation?.monthly?.grossMonthlyComp ??
        0
      ),
      base: profile.currentBase || "",
      dependents: profile.dependents
    }
  };
}

function buildPayload(input, toolName) {
  const tool = inferToolName(toolName);

  if (
    tool === "RETIREMENT_VA" ||
    tool === "VA_RETIREMENT" ||
    tool === "RETIREMENT_AND_VA" ||
    tool === "RETIREMENT_VA_CALCULATOR"
  ) {
    validateRetirementVAInput(input);
    return buildRetirementVAPayload(input, "RETIREMENT_VA");
  }

  if (tool === "PCS_SNAPSHOT") {
    validatePcsSnapshotInput(input);

    const profile = buildCanonicalProfile(input, {
      requireExplicit: true
    });

    const compensation = getCompensationProfile(profile);

    return buildPcsSnapshotPayload(profile, compensation);
  }

  const profile = buildCanonicalProfile(input);
  const compensation = getCompensationProfile(profile);

  if (tool === "FAD") {
    return buildFadPayload(profile, compensation);
  }

  if (tool === "ASK_ELENA") {
    return buildAskElenaPayload(profile, compensation);
  }

  if (tool === "AIOU") {
    return buildAiouPayload(profile, compensation);
  }

  return buildGenericPayload(profile, compensation, tool);
}

// ============================================================
// //#8) HANDLER
// ============================================================

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod === "GET") {
    return json(200, {
      ok: true,
      app: APP_NAME,
      brainVersion: BRAIN_VERSION,
      status: "online",
      route: "/api/opensource-brain",
      purpose: "Public calculator brain for PCSUnited tools powered by TheWing.ai.",
      sourceVersions: sourceVersions(),
      examples: {
        bahCalculator: {
          method: "POST",
          body: {
            tool: "BAH_CALCULATOR",
            input: {
              rank: "E-5",
              yos: 8,
              base: "Lackland AFB",
              dependents: "with"
            }
          }
        },
        pcsSnapshot: {
          method: "POST",
          body: {
            tool: "PCS_SNAPSHOT",
            input: {
              rank: "E-5",
              yos: 8,
              base: "Lackland AFB",
              dependents: "with"
            }
          }
        },
        retirementVaCalculator: {
          method: "POST",
          body: {
            tool: "RETIREMENT_VA",
            input: {
              rank: "E-6",
              yos: 20,
              retirementSystem: "HIGH3",
              vaRating: 70,
              spouse: true,
              childrenUnder18: 1,
              childrenInSchoolOver18: 0,
              dependentParents: 0
            }
          }
        }
      }
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      app: APP_NAME,
      brainVersion: BRAIN_VERSION,
      sourceVersions: sourceVersions(),
      error: "Method not allowed. Use POST."
    });
  }

  let body = {};
  let input = {};
  let toolName = "GENERIC";

  try {
    body = JSON.parse(event.body || "{}");
    input = body.input || body;
    toolName = body.tool || body.type || input.tool || input.type || "GENERIC";

    const payload = buildPayload(input, toolName);

    return json(200, {
      ok: true,
      app: APP_NAME,
      payload,

      // Compatibility wrappers
      data: payload,

      meta: {
        app: APP_NAME,
        brainVersion: BRAIN_VERSION,
        generatedAt: new Date().toISOString(),
        sourceVersions: sourceVersions()
      }
    });
  } catch (err) {
    return json(400, {
      ok: false,
      app: APP_NAME,
      brainVersion: BRAIN_VERSION,
      tool: inferToolName(toolName),
      error: err?.message || "Unknown error",
      sourceVersions: sourceVersions()
    });
  }
};

export default {
  handler
};
