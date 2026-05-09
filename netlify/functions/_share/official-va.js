// official-va.js
// ============================================================
// TheWing.ai • Official VA Disability Compensation Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-va.js
//
// PURPOSE
// - Single source of truth for standard VA disability compensation
// - Supports 10% through 100% ratings
// - Supports dependents:
//   * spouse
//   * dependent parents (0, 1, 2)
//   * children under 18
//   * children over 18 in qualifying school
//
// SCOPE
// - Standard VA disability compensation only
// - No SMC
// - No spouse Aid & Attendance add-on in v1
// - No DIC
// - No VA offset logic
// - No retirement logic
// - No UI logic
// - No localStorage
// - No Supabase
//
// SOURCE
// - VA current Veterans disability compensation rates
// - Effective December 1, 2025
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const RATE_VERSION = "official-va-2026.1";

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
// //#7) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  SUPPORTED_RATINGS,
  SOLO_10_20,
  BASE_30_60_NO_CHILDREN,
  BASE_70_100_NO_CHILDREN,
  BASE_30_60_WITH_CHILDREN,
  BASE_70_100_WITH_CHILDREN,
  ADDED_30_60,
  ADDED_70_100,
  assertSupportedRating,
  toNonNegativeInt,
  toBoolean,
  getBand,
  pickBaseKey,
  getBaseRateTable,
  getAddedAmountsTable,
  round2,
  getVACompensation,
  safeGetVACompensation
});
