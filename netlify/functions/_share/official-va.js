// official-va.js
// ============================================================
// TheWing.ai • Official VA Source Module
// v2.0.0
//
// FILE
// - netlify/functions/_share/official-va.js
//
// PURPOSE
// 1) VA disability compensation (10%–100%, dependent tables)
// 2) VA home loan purchase math (funding fee, payment, DTI, residual income)
//
// DISABILITY SCOPE
// - Standard VA disability compensation only
// - No SMC, spouse A&A add-on, DIC, VA offset, or retirement logic
//
// HOME LOAN SCOPE
// - Purchase/construction funding fee tiers (VA.gov, effective April 7, 2023)
// - Residual income tables (VA Pamphlet 26-7 style regional minimums)
// - No monthly PMI on VA loans
// - Full entitlement: no artificial VA loan limit
// - Partial entitlement: optional estimate only; lender/COE must confirm
//
// SOURCES
// - VA disability rates effective December 1, 2025
// - VA funding fee charts (va.gov, last updated January 15, 2026)
// - VA residual income regional tables (loan amount tiers at $80,000)
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// - Dependency-free (no imports)
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const RATE_VERSION = "official-va-2026.2";
export const VA_HOME_LOAN_RULES_VERSION = "va-home-loan-rules-2026.1";

export const VA_DTI_BENCHMARK = 0.41;
export const VA_DTI_BENCHMARK_PCT = 41;

// ============================================================
// //#2) SUPPORTED RATINGS
// ============================================================

export const SUPPORTED_RATINGS = Object.freeze([
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100
]);

// ============================================================
// //#3) CURRENT VA RATE TABLES
// //#    Source: VA current rates, effective Dec. 1, 2025
// ============================================================

export const SOLO_10_20 = Object.freeze({
  10: 180.42,
  20: 356.66
});

// 30-60, no children
export const BASE_30_60_NO_CHILDREN = Object.freeze({
  alone: {
    30: 552.47,
    40: 795.84,
    50: 1132.90,
    60: 1435.02
  },
  spouse: {
    30: 617.47,
    40: 882.84,
    50: 1241.90,
    60: 1566.02
  },
  spouse_1_parent: {
    30: 669.47,
    40: 952.84,
    50: 1329.90,
    60: 1671.02
  },
  spouse_2_parents: {
    30: 721.47,
    40: 1022.84,
    50: 1417.90,
    60: 1776.02
  },
  one_parent: {
    30: 604.47,
    40: 865.84,
    50: 1220.90,
    60: 1540.02
  },
  two_parents: {
    30: 656.47,
    40: 935.84,
    50: 1308.90,
    60: 1645.02
  }
});

// 70-100, no children
export const BASE_70_100_NO_CHILDREN = Object.freeze({
  alone: {
    70: 1808.45,
    80: 2102.15,
    90: 2362.30,
    100: 3938.58
  },
  spouse: {
    70: 1961.45,
    80: 2277.15,
    90: 2559.30,
    100: 4158.17
  },
  spouse_1_parent: {
    70: 2084.45,
    80: 2417.15,
    90: 2717.30,
    100: 4334.41
  },
  spouse_2_parents: {
    70: 2207.45,
    80: 2557.15,
    90: 2875.30,
    100: 4510.65
  },
  one_parent: {
    70: 1931.45,
    80: 2242.15,
    90: 2520.30,
    100: 4114.82
  },
  two_parents: {
    70: 2054.45,
    80: 2382.15,
    90: 2678.30,
    100: 4291.06
  }
});

// 30-60, with children
export const BASE_30_60_WITH_CHILDREN = Object.freeze({
  child_only: {
    30: 596.47,
    40: 853.84,
    50: 1205.90,
    60: 1523.02
  },
  spouse_child: {
    30: 666.47,
    40: 947.84,
    50: 1322.90,
    60: 1663.02
  },
  spouse_child_1_parent: {
    30: 718.47,
    40: 1017.84,
    50: 1410.90,
    60: 1768.02
  },
  spouse_child_2_parents: {
    30: 770.47,
    40: 1087.84,
    50: 1498.90,
    60: 1873.02
  },
  child_1_parent: {
    30: 648.47,
    40: 923.84,
    50: 1293.90,
    60: 1628.02
  },
  child_2_parents: {
    30: 700.47,
    40: 993.84,
    50: 1381.90,
    60: 1733.02
  }
});

export const ADDED_30_60 = Object.freeze({
  childUnder18: {
    30: 32.00,
    40: 43.00,
    50: 54.00,
    60: 65.00
  },
  childOver18School: {
    30: 105.00,
    40: 140.00,
    50: 176.00,
    60: 211.00
  }
});

// 70-100, with children
export const BASE_70_100_WITH_CHILDREN = Object.freeze({
  child_only: {
    70: 1910.45,
    80: 2219.15,
    90: 2494.30,
    100: 4085.43
  },
  spouse_child: {
    70: 2074.45,
    80: 2406.15,
    90: 2704.30,
    100: 4318.99
  },
  spouse_child_1_parent: {
    70: 2197.45,
    80: 2546.15,
    90: 2862.30,
    100: 4495.23
  },
  spouse_child_2_parents: {
    70: 2320.45,
    80: 2686.15,
    90: 3020.30,
    100: 4671.47
  },
  child_1_parent: {
    70: 2033.45,
    80: 2359.15,
    90: 2652.30,
    100: 4261.67
  },
  child_2_parents: {
    70: 2156.45,
    80: 2499.15,
    90: 2810.30,
    100: 4437.91
  }
});

export const ADDED_70_100 = Object.freeze({
  childUnder18: {
    70: 76.00,
    80: 87.00,
    90: 98.00,
    100: 109.11
  },
  childOver18School: {
    70: 246.00,
    80: 281.00,
    90: 317.00,
    100: 352.45
  }
});

// ============================================================
// //#4) HELPERS
// ============================================================

export function assertSupportedRating(rating) {
  const n = Number(rating);

  if (!SUPPORTED_RATINGS.includes(n)) {
    throw new Error(
      `Unsupported VA rating "${rating}". Supported ratings: ${SUPPORTED_RATINGS.join(", ")}`
    );
  }

  return n;
}

export function toNonNegativeInt(value, fieldName) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }

  return n;
}

export function toBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;

  const s = String(value || "").trim().toLowerCase();

  return ["true", "1", "yes", "y", "spouse", "with", "married"].includes(s);
}

export function getBand(rating) {
  const n = Number(rating);

  if (n === 10 || n === 20) return "10_20";
  if ([30, 40, 50, 60].includes(n)) return "30_60";
  if ([70, 80, 90, 100].includes(n)) return "70_100";

  throw new Error(`No rating band found for ${rating}.`);
}

export function pickBaseKey(hasSpouse, parents, hasAnyChildren) {
  if (!hasAnyChildren) {
    if (hasSpouse && parents === 0) return "spouse";
    if (hasSpouse && parents === 1) return "spouse_1_parent";
    if (hasSpouse && parents === 2) return "spouse_2_parents";
    if (!hasSpouse && parents === 0) return "alone";
    if (!hasSpouse && parents === 1) return "one_parent";
    if (!hasSpouse && parents === 2) return "two_parents";
  }

  if (hasAnyChildren) {
    if (hasSpouse && parents === 0) return "spouse_child";
    if (hasSpouse && parents === 1) return "spouse_child_1_parent";
    if (hasSpouse && parents === 2) return "spouse_child_2_parents";
    if (!hasSpouse && parents === 0) return "child_only";
    if (!hasSpouse && parents === 1) return "child_1_parent";
    if (!hasSpouse && parents === 2) return "child_2_parents";
  }

  throw new Error("Unable to determine VA dependent status key.");
}

export function getBaseRateTable(rating, hasAnyChildren) {
  const band = getBand(rating);

  if (band === "30_60") {
    return hasAnyChildren
      ? BASE_30_60_WITH_CHILDREN
      : BASE_30_60_NO_CHILDREN;
  }

  if (band === "70_100") {
    return hasAnyChildren
      ? BASE_70_100_WITH_CHILDREN
      : BASE_70_100_NO_CHILDREN;
  }

  throw new Error(`No dependent base table for rating ${rating}.`);
}

export function getAddedAmountsTable(rating) {
  const band = getBand(rating);

  if (band === "30_60") return ADDED_30_60;
  if (band === "70_100") return ADDED_70_100;

  return null;
}

export function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

// ============================================================
// //#5) CORE CALCULATION
// ============================================================

export function getVACompensation(input = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("Input object is required.");
  }

  const rating = assertSupportedRating(input.rating);

  const spouse = toBoolean(input.spouse);

  const dependentParents = toNonNegativeInt(
    input.dependentParents || 0,
    "dependentParents"
  );

  const childrenUnder18 = toNonNegativeInt(
    input.childrenUnder18 || 0,
    "childrenUnder18"
  );

  const childrenInSchoolOver18 = toNonNegativeInt(
    input.childrenInSchoolOver18 || 0,
    "childrenInSchoolOver18"
  );

  if (dependentParents > 2) {
    throw new Error("dependentParents cannot exceed 2 in this version.");
  }

  // 10% / 20%: no dependent adjustments.
  if (rating === 10 || rating === 20) {
    return {
      rating,
      spouse,
      dependentParents,
      childrenUnder18,
      childrenInSchoolOver18,
      monthlyVA: SOLO_10_20[rating],
      baseMonthlyVA: SOLO_10_20[rating],
      addedChildrenUnder18: 0,
      addedChildrenInSchoolOver18: 0,
      dependentStatusKey: "solo_10_20",
      rateVersion: RATE_VERSION
    };
  }

  const hasAnyChildren = childrenUnder18 + childrenInSchoolOver18 > 0;
  const baseKey = pickBaseKey(spouse, dependentParents, hasAnyChildren);
  const baseTable = getBaseRateTable(rating, hasAnyChildren);
  const baseMonthlyVA = Number(baseTable[baseKey]?.[rating]);

  if (!Number.isFinite(baseMonthlyVA)) {
    throw new Error(
      `No base VA rate found for rating ${rating} and status ${baseKey}.`
    );
  }

  let addedChildrenUnder18 = 0;
  let addedChildrenInSchoolOver18 = 0;

  const addedTable = getAddedAmountsTable(rating);

  // Base "with children" rows already include one child.
  // Additional under-18 children and school-age children are added separately.
  if (hasAnyChildren) {
    const extraUnder18Count = Math.max(0, childrenUnder18 - 1);
    const schoolCount = childrenInSchoolOver18;

    addedChildrenUnder18 =
      extraUnder18Count * Number(addedTable.childUnder18[rating] || 0);

    addedChildrenInSchoolOver18 =
      schoolCount * Number(addedTable.childOver18School[rating] || 0);
  }

  const monthlyVA = round2(
    baseMonthlyVA + addedChildrenUnder18 + addedChildrenInSchoolOver18
  );

  return {
    rating,
    spouse,
    dependentParents,
    childrenUnder18,
    childrenInSchoolOver18,
    monthlyVA,
    baseMonthlyVA: round2(baseMonthlyVA),
    addedChildrenUnder18: round2(addedChildrenUnder18),
    addedChildrenInSchoolOver18: round2(addedChildrenInSchoolOver18),
    dependentStatusKey: baseKey,
    rateVersion: RATE_VERSION
  };
}

// ============================================================
// //#6) SAFE WRAPPER
// ============================================================

export function safeGetVACompensation(input = {}) {
  try {
    return {
      ok: true,
      ...getVACompensation(input)
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to calculate VA compensation.",
      rateVersion: RATE_VERSION
    };
  }
}

// ============================================================
// //#7) VA HOME LOAN — OFFICIAL-STYLE CONSTANTS
// ============================================================
//
// Funding fee purchase tiers (VA.gov, effective April 7, 2023):
// First use:  <5% = 2.15%, 5–9.99% = 1.50%, 10%+ = 1.25%
// Subsequent: <5% = 3.30%, 5–9.99% = 1.50%, 10%+ = 1.25%
// Fee base = loan amount before funding fee (purchase price minus down payment).
// ============================================================

export const VA_FUNDING_FEE_TABLE = Object.freeze({
  source: "VA.gov funding fee charts, effective April 7, 2023",
  purchase: {
    first_use: [
      { minDownPct: 0, maxDownPct: 4.999999, feePct: 0.0215 },
      { minDownPct: 5, maxDownPct: 9.999999, feePct: 0.015 },
      { minDownPct: 10, maxDownPct: Infinity, feePct: 0.0125 }
    ],
    subsequent_use: [
      { minDownPct: 0, maxDownPct: 4.999999, feePct: 0.033 },
      { minDownPct: 5, maxDownPct: 9.999999, feePct: 0.015 },
      { minDownPct: 10, maxDownPct: Infinity, feePct: 0.0125 }
    ]
  },
  cash_out_refinance: { first_use: 0.0215, subsequent_use: 0.033 },
  irrrl: 0.005
});

export const VA_RESIDUAL_INCOME_TABLES = Object.freeze({
  source: "VA Pamphlet 26-7 regional residual income minimums (reference tables)",
  loanTierThreshold: 80000,
  belowThreshold: {
    perPersonOverFive: 75,
    maxFamilySizeInTable: 7,
    northeast: [390, 654, 788, 888, 921],
    midwest: [382, 641, 772, 868, 902],
    south: [382, 641, 772, 868, 902],
    west: [425, 713, 859, 976, 1004]
  },
  atOrAboveThreshold: {
    perPersonOverFive: 80,
    maxFamilySizeInTable: 7,
    northeast: [450, 755, 909, 1025, 1062],
    midwest: [441, 738, 889, 1003, 1039],
    south: [441, 738, 889, 1003, 1039],
    west: [491, 823, 990, 1117, 1158]
  }
});

export const VA_STATE_TO_REGION = Object.freeze({
  CT: "northeast", ME: "northeast", MA: "northeast", NH: "northeast",
  NJ: "northeast", NY: "northeast", PA: "northeast", RI: "northeast",
  VT: "northeast",
  IL: "midwest", IN: "midwest", IA: "midwest", KS: "midwest", MI: "midwest",
  MN: "midwest", MO: "midwest", NE: "midwest", ND: "midwest", OH: "midwest",
  SD: "midwest", WI: "midwest",
  AL: "south", AR: "south", DC: "south", DE: "south", FL: "south",
  GA: "south", KY: "south", LA: "south", MD: "south", MS: "south",
  NC: "south", OK: "south", PR: "south", SC: "south", TN: "south",
  TX: "south", VA: "south", WV: "south",
  AK: "west", AZ: "west", CA: "west", CO: "west", GU: "west", HI: "west",
  ID: "west", MT: "west", NM: "west", NV: "west", OR: "west", UT: "west",
  WA: "west", WY: "west"
});

// ============================================================
// //#8) VA HOME LOAN — HELPERS
// ============================================================

function pickFirst(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    return value;
  }
  return null;
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? round2(Math.max(0, n)) : fallback;
}

function toNullableMoney(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? round2(Math.max(0, n)) : null;
}

function toBool(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;

  const s = String(value || "").trim().toLowerCase();

  if (["true", "1", "yes", "y", "exempt"].includes(s)) return true;
  if (["false", "0", "no", "n", "not exempt"].includes(s)) return false;

  return fallback;
}

function normalizePriorUse(value) {
  if (value === true) return "subsequent_use";
  if (value === false) return "first_use";

  const s = String(value || "").trim().toLowerCase();

  if (["first", "first_use", "no", "never", "0", "false"].includes(s)) {
    return "first_use";
  }

  if (["second", "subsequent", "subsequent_use", "used", "yes", "true", "1"].includes(s)) {
    return "subsequent_use";
  }

  return "first_use";
}

function normalizeRegion(value) {
  const s = String(value || "").trim().toLowerCase();

  if (["northeast", "ne", "north east"].includes(s)) return "northeast";
  if (["midwest", "mw", "mid west"].includes(s)) return "midwest";
  if (["south", "so"].includes(s)) return "south";
  if (["west", "w"].includes(s)) return "west";

  return "";
}

function resolveRegion(input = {}) {
  const direct = normalizeRegion(
    pickFirst(input.region, input.vaRegion, input.va_region, input.residualRegion)
  );

  if (direct) return direct;

  const state = String(
    pickFirst(input.state, input.propertyState, input.property_state, input.usState) || ""
  )
    .trim()
    .toUpperCase()
    .slice(0, 2);

  if (state && VA_STATE_TO_REGION[state]) {
    return VA_STATE_TO_REGION[state];
  }

  return "south";
}

function resolveFundingFeePct({ priorUse, downPaymentPct, loanType = "purchase" }) {
  const lt = String(loanType || "purchase").trim().toLowerCase();

  if (lt === "cash_out_refinance" || lt === "cash_out") {
    return priorUse === "subsequent_use"
      ? VA_FUNDING_FEE_TABLE.cash_out_refinance.subsequent_use
      : VA_FUNDING_FEE_TABLE.cash_out_refinance.first_use;
  }

  if (lt === "irrrl" || lt === "streamline") {
    return VA_FUNDING_FEE_TABLE.irrrl;
  }

  const use = priorUse === "subsequent_use" ? "subsequent_use" : "first_use";
  const rows = VA_FUNDING_FEE_TABLE.purchase[use];
  const pct = Number(downPaymentPct || 0) * 100;
  const row = rows.find((r) => pct >= r.minDownPct && pct <= r.maxDownPct);

  return row ? row.feePct : rows[0].feePct;
}

export function isFundingFeeExempt(input = {}) {
  if (toBool(pickFirst(input.fundingFeeExempt, input.funding_fee_exempt, input.exempt), false)) {
    return { exempt: true, reason: "explicit_exemption_flag" };
  }

  if (toBool(pickFirst(input.purpleHeart, input.purple_heart, input.purpleHeartActiveDuty), false)) {
    return { exempt: true, reason: "active_duty_purple_heart" };
  }

  if (toBool(pickFirst(input.survivingSpouse, input.surviving_spouse, input.receivesDic), false)) {
    return { exempt: true, reason: "surviving_spouse_dic" };
  }

  if (toBool(pickFirst(input.receivesVaCompensation, input.receives_va_compensation), false)) {
    return { exempt: true, reason: "receiving_va_compensation" };
  }

  const disabilityMonthly = toNullableMoney(
    pickFirst(
      input.disabilityMonthly,
      input.disability,
      input.vaDisabilityMonthly,
      input.va_disability_monthly,
      input.vaCompensationMonthly,
      input.va_compensation_monthly
    )
  );

  if (disabilityMonthly && disabilityMonthly > 0) {
    return { exempt: true, reason: "va_disability_income_provided" };
  }

  const rating = Number(pickFirst(input.rating, input.vaRating, input.va_rating, input.vaDisability));

  if (Number.isFinite(rating) && rating >= 10) {
    if (toBool(pickFirst(input.vaCompensationPending, input.va_compensation_pending, input.disabilityPending), false)) {
      return {
        exempt: false,
        reason: "disability_pending_confirm_with_lender",
        warning:
          "VA disability rating is present but marked pending. Funding fee exemption requires confirmed compensation or COE status."
      };
    }

    return { exempt: true, reason: "service_connected_disability_rating" };
  }

  return { exempt: false, reason: "not_exempt" };
}

export function getRequiredResidualIncome({
  region = "south",
  familySize = 1,
  loanAmount = 0,
  dti = null
} = {}) {
  const reg = normalizeRegion(region) || "south";
  const size = Math.max(1, Math.floor(Number(familySize) || 1));
  const loan = Math.max(0, Number(loanAmount) || 0);
  const tier =
    loan >= VA_RESIDUAL_INCOME_TABLES.loanTierThreshold
      ? VA_RESIDUAL_INCOME_TABLES.atOrAboveThreshold
      : VA_RESIDUAL_INCOME_TABLES.belowThreshold;

  const table = tier[reg] || tier.south;
  const baseSize = Math.min(size, 5);
  let required = table[baseSize - 1];

  if (size > 5) {
    required += (size - 5) * tier.perPersonOverFive;
  }

  const tableMinimum = round2(required);
  let adjustedMinimum = tableMinimum;

  if (Number.isFinite(Number(dti)) && Number(dti) > VA_DTI_BENCHMARK) {
    adjustedMinimum = round2(tableMinimum * 1.2);
  }

  return {
    region: reg,
    familySize: size,
    loanAmountTier:
      loan >= VA_RESIDUAL_INCOME_TABLES.loanTierThreshold
        ? "at_or_above_80000"
        : "below_80000",
    tableMinimum,
    requiredResidualIncome: adjustedMinimum,
    dtiAdjustmentApplied: Number.isFinite(Number(dti)) && Number(dti) > VA_DTI_BENCHMARK,
    perPersonOverFive: tier.perPersonOverFive,
    source: VA_RESIDUAL_INCOME_TABLES.source
  };
}

function monthlyPrincipalInterest(loanAmount, aprPct, termYears) {
  const loan = Math.max(0, Number(loanAmount) || 0);
  const apr = Math.max(0, Number(aprPct) || 0) / 100;
  const years = Math.max(1, Math.floor(Number(termYears) || 30));
  const months = years * 12;
  const monthlyRate = apr / 12;

  if (loan <= 0) return 0;
  if (monthlyRate <= 0) return loan / months;

  const pow = Math.pow(1 + monthlyRate, months);
  const payment = (loan * monthlyRate * pow) / (pow - 1);

  return Number.isFinite(payment) ? payment : 0;
}

function aprFromCreditScore(score) {
  const s = Math.max(300, Math.min(850, Math.floor(Number(score) || 720)));

  if (s >= 780) return 6.1;
  if (s >= 760) return 6.25;
  if (s >= 740) return 6.45;
  if (s >= 720) return 6.65;
  if (s >= 700) return 6.95;
  if (s >= 680) return 7.25;
  if (s >= 660) return 7.55;
  if (s >= 640) return 7.85;

  return 8.25;
}

function assembleGrossMonthlyIncome(input = {}) {
  const basePay = toMoney(
    pickFirst(input.basePay, input.base_pay, input.basicPay, input.basic_pay)
  );
  const bah = toMoney(pickFirst(input.bah, input.BAH));
  const bas = toMoney(pickFirst(input.bas, input.BAS));
  const retirement = toMoney(
    pickFirst(input.retirement, input.retirementPay, input.retirement_pay)
  );
  const otherIncome = toMoney(
    pickFirst(input.otherIncome, input.other_income, input.other)
  );

  let disability = toMoney(
    pickFirst(
      input.disability,
      input.vaDisability,
      input.va_disability,
      input.vaDisabilityMonthly,
      input.va_disability_monthly
    )
  );

  const rating = Number(
    pickFirst(input.rating, input.vaRating, input.va_rating, input.vaDisabilityRating)
  );

  if (!disability && Number.isFinite(rating) && rating >= 10) {
    try {
      const comp = getVACompensation({
        rating,
        spouse: toBoolean(input.spouse),
        dependentParents: Number(input.dependentParents || input.dependent_parents || 0),
        childrenUnder18: Number(input.childrenUnder18 || input.children_under_18 || 0),
        childrenInSchoolOver18: Number(
          input.childrenInSchoolOver18 ||
            input.children_in_school_over_18 ||
            input.childrenOver18School ||
            0
        )
      });

      disability = comp.monthlyVA;
    } catch (_error) {
      // Rating may be unsupported; leave disability at 0.
    }
  }

  const grossMonthlyIncome = round2(
    basePay + bah + bas + retirement + otherIncome + disability
  );

  return {
    grossMonthlyIncome,
    components: {
      basePay,
      bah,
      bas,
      retirement,
      otherIncome,
      disability
    }
  };
}

function estimatePartialEntitlementDownPayment({
  fullEntitlement,
  countyLoanLimit,
  entitlementUsed,
  baseLoanAmount
}) {
  if (fullEntitlement !== false) {
    return {
      applies: false,
      downPaymentMayBeRequired: false,
      note: "Full entitlement assumed; VA does not set a loan limit for qualified borrowers."
    };
  }

  if (!countyLoanLimit || countyLoanLimit <= 0) {
    return {
      applies: true,
      downPaymentMayBeRequired: null,
      note:
        "Partial entitlement logic requires county loan limit and prior entitlement charged. This estimate is incomplete without those inputs."
    };
  }

  const bonusEntitlement = Math.max(0, countyLoanLimit * 0.25 - entitlementUsed);
  const maxNoDownLoanEstimate = bonusEntitlement * 4;
  const gap = Math.max(0, baseLoanAmount * 0.25 - bonusEntitlement);

  return {
    applies: true,
    downPaymentMayBeRequired: baseLoanAmount > maxNoDownLoanEstimate,
    estimatedDownPaymentToCoverGuarantyGap: round2(gap),
    estimatedMaxNoDownLoan: round2(maxNoDownLoanEstimate),
    note:
      "Partial entitlement estimate only. Lender and COE must confirm guaranty coverage and any required down payment."
  };
}

// ============================================================
// //#9) VA HOME LOAN — CORE CALCULATION
// ============================================================

export function calculateVaHomeLoan(input = {}) {
  if (!input || typeof input !== "object") {
    throw new Error("Input object is required.");
  }

  const notes = [];
  const warnings = [];

  const purchasePrice = toMoney(
    pickFirst(
      input.purchasePrice,
      input.purchase_price,
      input.price,
      input.homePrice,
      input.home_price
    )
  );

  const downPayment = toMoney(
    pickFirst(input.downPayment, input.downpayment, input.down_payment),
    0
  );

  if (purchasePrice > 0 && downPayment > purchasePrice) {
    throw new Error("Down payment cannot exceed purchase price.");
  }

  const baseLoanAmount = round2(Math.max(0, purchasePrice - downPayment));
  const downPaymentPct =
    purchasePrice > 0 ? downPayment / purchasePrice : 0;

  const priorUse = normalizePriorUse(
    pickFirst(input.priorUse, input.prior_use, input.firstUse, input.first_use)
  );

  const exemption = isFundingFeeExempt(input);
  const fundingFeeExempt = exemption.exempt === true;

  if (exemption.warning) warnings.push(exemption.warning);

  let fundingFee = 0;
  let feePct = 0;

  if (!fundingFeeExempt) {
    feePct = resolveFundingFeePct({
      priorUse,
      downPaymentPct,
      loanType: pickFirst(input.loanType, input.loan_type, "purchase")
    });
    fundingFee = round2(baseLoanAmount * feePct);
  }

  const financeFundingFee = toBool(
    pickFirst(
      input.financeFundingFee,
      input.finance_funding_fee,
      input.financedFundingFee,
      input.financed_funding_fee
    ),
    true
  );

  const financedFundingFee =
    fundingFeeExempt || !financeFundingFee ? 0 : fundingFee;

  const totalLoanAmount = round2(baseLoanAmount + financedFundingFee);

  if (fundingFeeExempt) {
    notes.push("Funding fee is $0 based on exemption rules or provided profile.");
  } else if (financedFundingFee > 0) {
    notes.push("Funding fee is financed into the loan amount per VA purchase rules.");
  } else if (fundingFee > 0) {
    notes.push("Funding fee is calculated but assumed paid at closing (not financed).");
  }

  const aprOverride = toNullableMoney(
    pickFirst(input.apr, input.aprOverride, input.apr_override, input.interestRate)
  );
  const apr =
    aprOverride && aprOverride > 0
      ? aprOverride
      : aprFromCreditScore(
          pickFirst(input.creditScore, input.credit_score, input.fico, 720)
        );

  const termYears = Math.max(
    1,
    Math.floor(Number(pickFirst(input.termYears, input.term_years, input.term, 30)) || 30)
  );

  const principalAndInterest = round2(
    monthlyPrincipalInterest(totalLoanAmount, apr, termYears)
  );

  const propertyTaxAnnual = toMoney(
    pickFirst(
      input.propertyTaxAnnual,
      input.property_tax_annual,
      input.annualPropertyTax,
      input.annual_property_tax
    )
  );
  const propertyTaxMonthlyInput = toNullableMoney(
    pickFirst(input.propertyTaxMonthly, input.property_tax_monthly, input.taxesMonthly)
  );
  const taxesMonthly = round2(
    propertyTaxMonthlyInput !== null
      ? propertyTaxMonthlyInput
      : propertyTaxAnnual / 12
  );

  const insuranceAnnual = toMoney(
    pickFirst(
      input.insuranceAnnual,
      input.insurance_annual,
      input.annualInsurance,
      input.annual_insurance
    )
  );
  const insuranceMonthlyInput = toNullableMoney(
    pickFirst(input.insuranceMonthly, input.insurance_monthly)
  );
  const insuranceMonthly = round2(
    insuranceMonthlyInput !== null
      ? insuranceMonthlyInput
      : insuranceAnnual / 12
  );

  const hoaMonthly = toMoney(
    pickFirst(input.hoaMonthly, input.hoa_monthly, input.hoa)
  );

  const pmiMonthly = 0;
  notes.push("VA loans do not require monthly PMI in this model.");

  const totalMonthlyPayment = round2(
    principalAndInterest + taxesMonthly + insuranceMonthly + hoaMonthly + pmiMonthly
  );

  const income = assembleGrossMonthlyIncome(input);
  const grossMonthlyIncome = income.grossMonthlyIncome;

  const monthlyDebts = toMoney(
    pickFirst(
      input.monthlyDebts,
      input.monthly_debts,
      input.debt,
      input.monthlyDebt,
      input.monthly_debt
    )
  );

  const dti =
    grossMonthlyIncome > 0
      ? round2((monthlyDebts + totalMonthlyPayment) / grossMonthlyIncome)
      : null;

  const maintenanceUtilitiesMonthly = toMoney(
    pickFirst(
      input.maintenanceUtilitiesMonthly,
      input.maintenance_utilities_monthly,
      input.maintenanceAndUtilities
    )
  );

  const estimatedTaxesMonthly = toMoney(
    pickFirst(
      input.estimatedTaxesMonthly,
      input.estimated_taxes_monthly,
      input.federalStateTaxesMonthly
    )
  );

  const residualIncome = round2(
    grossMonthlyIncome -
      totalMonthlyPayment -
      monthlyDebts -
      maintenanceUtilitiesMonthly -
      estimatedTaxesMonthly
  );

  const familySize = Math.max(
    1,
    Math.floor(
      Number(
        pickFirst(
          input.familySize,
          input.family_size,
          input.householdSize,
          input.household_size,
          1
        )
      ) || 1
    )
  );

  const region = resolveRegion(input);

  const residualReq = getRequiredResidualIncome({
    region,
    familySize,
    loanAmount: totalLoanAmount,
    dti
  });

  const requiredResidualIncome = residualReq.requiredResidualIncome;
  const residualPass = residualIncome >= requiredResidualIncome;

  if (dti !== null && dti > VA_DTI_BENCHMARK) {
    notes.push(
      `DTI ${(dti * 100).toFixed(1)}% is above the VA ${VA_DTI_BENCHMARK_PCT}% benchmark. This is not an automatic denial; compensating factors and residual income may still support approval.`
    );
  } else if (dti !== null) {
    notes.push(
      `DTI ${(dti * 100).toFixed(1)}% is at or below the VA ${VA_DTI_BENCHMARK_PCT}% benchmark.`
    );
  }

  if (!residualPass) {
    notes.push(
      "Residual income is below the regional table minimum used in this estimate. Lenders may still approve with compensating factors."
    );
  }

  if (
    maintenanceUtilitiesMonthly <= 0 ||
    estimatedTaxesMonthly <= 0
  ) {
    warnings.push(
      "Residual income uses a simplified formula. Lender underwriting also subtracts estimated maintenance/utilities and income taxes when not provided here."
    );
  }

  if (familySize > VA_RESIDUAL_INCOME_TABLES.atOrAboveThreshold.maxFamilySizeInTable) {
    warnings.push(
      "Family size exceeds published table examples; additional-member increments are applied per VA table guidance."
    );
  }

  const fullEntitlement = input.fullEntitlement !== false && input.full_entitlement !== false;
  const entitlement = estimatePartialEntitlementDownPayment({
    fullEntitlement,
    countyLoanLimit: toNullableMoney(
      pickFirst(input.countyLoanLimit, input.county_loan_limit)
    ),
    entitlementUsed: toMoney(
      pickFirst(input.entitlementUsed, input.entitlement_used)
    ),
    baseLoanAmount
  });

  if (entitlement.note) notes.push(entitlement.note);

  if (!purchasePrice) {
    warnings.push("Purchase price is missing; loan and payment estimates may be incomplete.");
  }

  if (grossMonthlyIncome <= 0) {
    warnings.push(
      "Gross monthly income is missing or zero; DTI and residual income cannot be fully evaluated."
    );
  }

  return {
    ok: true,
    rateVersion: RATE_VERSION,
    homeLoanRulesVersion: VA_HOME_LOAN_RULES_VERSION,

    purchasePrice: round2(purchasePrice),
    downPayment: round2(downPayment),
    downPaymentPct: round2(downPaymentPct),
    baseLoanAmount,
    fundingFee,
    fundingFeePct: fundingFeeExempt ? 0 : round2(feePct),
    financedFundingFee,
    totalLoanAmount,

    principalAndInterest,
    taxesMonthly,
    insuranceMonthly,
    hoaMonthly,
    pmiMonthly,
    totalMonthlyPayment,

    apr: round2(apr),
    termYears,

    grossMonthlyIncome,
    incomeComponents: income.components,
    monthlyDebts,
    dti,
    dtiBenchmark: VA_DTI_BENCHMARK,
    dtiAboveBenchmark: dti !== null ? dti > VA_DTI_BENCHMARK : null,
    dtiStatus:
      dti === null
        ? "unknown"
        : dti > VA_DTI_BENCHMARK
          ? "above_benchmark_review_compensating_factors"
          : "at_or_below_benchmark",

    residualIncome,
    requiredResidualIncome,
    residualTableMinimum: residualReq.tableMinimum,
    residualPass,
    residualRegion: region,
    residualFamilySize: familySize,
    residualLoanAmountTier: residualReq.loanAmountTier,

    fundingFeeExempt,
    fundingFeeExemptReason: exemption.reason || null,
    priorUse,

    entitlement,

    notes,
    warnings
  };
}

export function safeCalculateVaHomeLoan(input = {}) {
  try {
    return calculateVaHomeLoan(input);
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Unable to calculate VA home loan scenario.",
      rateVersion: RATE_VERSION,
      homeLoanRulesVersion: VA_HOME_LOAN_RULES_VERSION,
      warnings: [
        "VA home loan estimate failed. Disability compensation functions remain available separately."
      ]
    };
  }
}

// ============================================================
// //#10) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  VA_HOME_LOAN_RULES_VERSION,
  VA_DTI_BENCHMARK,
  VA_DTI_BENCHMARK_PCT,
  SUPPORTED_RATINGS,
  SOLO_10_20,
  BASE_30_60_NO_CHILDREN,
  BASE_70_100_NO_CHILDREN,
  BASE_30_60_WITH_CHILDREN,
  BASE_70_100_WITH_CHILDREN,
  ADDED_30_60,
  ADDED_70_100,
  VA_FUNDING_FEE_TABLE,
  VA_RESIDUAL_INCOME_TABLES,
  VA_STATE_TO_REGION,
  assertSupportedRating,
  toNonNegativeInt,
  toBoolean,
  getBand,
  pickBaseKey,
  getBaseRateTable,
  getAddedAmountsTable,
  round2,
  getVACompensation,
  safeGetVACompensation,
  isFundingFeeExempt,
  getRequiredResidualIncome,
  calculateVaHomeLoan,
  safeCalculateVaHomeLoan
});
