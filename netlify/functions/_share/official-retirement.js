// official-retirement.js
// ============================================================
// TheWing.ai • Official Active Duty Regular Retirement Engine
// v1.2.0
//
// FILE
// - netlify/functions/_share/official-retirement.js
//
// PURPOSE
// ------------------------------------------------------------
// - Single source of truth for ACTIVE DUTY REGULAR retirement
// - Supports legacy HIGH-3 / HIGH-36 and BRS only
// - Returns GROSS retired pay only
// - Supports exact 36-month retired-pay-base calculation
// - Supports exact completed service months when available
//
// NOT INCLUDED
// ------------------------------------------------------------
// - Reserve / non-regular retirement
// - Medical / disability retirement
// - Final Pay
// - CSB / REDUX
// - SBP
// - Federal/state taxes
// - CRDP
// - CRSC
// - VA offset
// - Other deductions
//
// INPUT MODES
// ------------------------------------------------------------
//
// 1) EXACT HIGH-36 BASE
//
//    {
//      retirementSystem: "HIGH3",
//      yearsOfService: 24.5,
//      high36MonthlyArray: [
//        ... EXACTLY 36 monthly BASIC PAY values ...
//      ]
//    }
//
// 2) EXACT SERVICE-MONTH MODE
//
//    Preferred when the caller knows completed creditable
//    service months:
//
//    {
//      retirementSystem: "HIGH3",
//      serviceMonths: 294,
//      high36MonthlyArray: [
//        ... EXACTLY 36 monthly BASIC PAY values ...
//      ]
//    }
//
//    294 service months = 24.5 years.
//
// 3) ESTIMATE / FALLBACK BASE
//
//    {
//      retirementSystem: "HIGH3",
//      yearsOfService: 24,
//      monthlyBasicPayAtRetirement: 6598.20
//    }
//
//    This is NOT a true High-3 calculation. The final monthly
//    basic-pay amount is used only as an estimate proxy.
//
// IMPORTANT
// ------------------------------------------------------------
// - high36MonthlyArray always takes precedence when provided.
// - A High-36 array MUST contain exactly 36 monthly values.
// - Only BASIC PAY belongs in High-36.
// - Do not include BAH, BAS, bonuses, VA, special pay, etc.
// - Retirement multiplier precision is preserved internally.
// - Do NOT round the multiplier to two decimal places.
// - Do NOT prematurely round the High-36 average before
//   multiplying by the retirement multiplier.
// - Final monthly retired pay is rounded DOWN to the next
//   lower whole dollar.
//
// OFFICIAL FORMULAS
// ------------------------------------------------------------
//
// HIGH-3 / HIGH-36:
//
//   Retired Pay Base
//   ×
//   (Years of Creditable Service × 2.5%)
//
// BRS:
//
//   Retired Pay Base
//   ×
//   (Years of Creditable Service × 2.0%)
//
// MODULE STYLE
// ------------------------------------------------------------
// ES Module exports for Netlify Functions using "type": "module"
// ============================================================


export const RATE_VERSION =
  "official-retirement-2026.2";


export const SUPPORTED_SYSTEMS =
  Object.freeze([
    "HIGH3",
    "BRS"
  ]);


export const HIGH36_REQUIRED_MONTHS =
  36;


export const MIN_REGULAR_RETIREMENT_YEARS =
  20;


/* ============================================================
  //#1) GENERAL HELPERS
============================================================ */

export function normalizeSystem(
  retirementSystem
) {

  const raw =
    String(
      retirementSystem ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    raw === "HIGH3" ||
    raw === "HIGH-3" ||
    raw === "HIGH 3" ||
    raw === "HIGH36" ||
    raw === "HIGH-36" ||
    raw === "HIGH 36"
  ) {

    return "HIGH3";
  }


  if (
    raw === "BRS" ||
    raw === "BLENDED" ||
    raw === "BLENDED RETIREMENT SYSTEM"
  ) {

    return "BRS";
  }


  if (
    SUPPORTED_SYSTEMS.includes(
      raw
    )
  ) {

    return raw;
  }


  throw new Error(
    `Unsupported retirementSystem "${retirementSystem}". ` +
    `Supported systems: ${SUPPORTED_SYSTEMS.join(", ")}`
  );
}


export function normalizeRetirementSystem(
  retirementSystem
) {

  return normalizeSystem(
    retirementSystem
  );
}


function toFiniteNumber(
  value,
  fieldName
) {

  const n =
    Number(
      value
    );


  if (
    !Number.isFinite(
      n
    )
  ) {

    throw new Error(
      `${fieldName} must be a finite number.`
    );
  }


  return n;
}


function toPositiveMoney(
  value,
  fieldName
) {

  const n =
    toFiniteNumber(
      value,
      fieldName
    );


  if (
    n <= 0
  ) {

    throw new Error(
      `${fieldName} must be greater than 0.`
    );
  }


  return n;
}


function toNonNegativeYears(
  value,
  fieldName
) {

  const n =
    toFiniteNumber(
      value,
      fieldName
    );


  if (
    n < 0
  ) {

    throw new Error(
      `${fieldName} must be 0 or greater.`
    );
  }


  return n;
}


function toNonNegativeInteger(
  value,
  fieldName
) {

  const n =
    toFiniteNumber(
      value,
      fieldName
    );


  if (
    n < 0 ||
    !Number.isInteger(
      n
    )
  ) {

    throw new Error(
      `${fieldName} must be a non-negative whole number.`
    );
  }


  return n;
}


/* ============================================================
  //#2) ROUNDING HELPERS
============================================================ */

/**
 * Federal military retired-pay computations ultimately round
 * down to the next lower whole dollar.
 */
function floorCurrency(
  amount
) {

  return Math.floor(
    Number(
      amount
    ) ||
    0
  );
}


/**
 * Presentation helper only.
 *
 * Do not use this for the retirement multiplier before the
 * retired-pay multiplication.
 */
export function round2(
  amount
) {

  return Number(
    (
      Number(
        amount
      ) ||
      0
    ).toFixed(
      2
    )
  );
}


/**
 * Higher-precision rounding helper for returned metadata.
 *
 * This prevents ordinary floating-point noise without destroying
 * legitimate retirement multiplier precision.
 */
export function roundPrecision(
  amount,
  decimals = 10
) {

  const n =
    Number(
      amount
    );


  if (
    !Number.isFinite(
      n
    )
  ) {

    return 0;
  }


  const safeDecimals =
    Math.max(
      0,
      Math.min(
        12,
        Math.floor(
          Number(
            decimals
          ) ||
          0
        )
      )
    );


  return Number(
    n.toFixed(
      safeDecimals
    )
  );
}


/* ============================================================
  //#3) HIGH-36 VALIDATION
============================================================ */

function validateHigh36Array(
  high36MonthlyArray
) {

  if (
    !Array.isArray(
      high36MonthlyArray
    )
  ) {

    throw new Error(
      "high36MonthlyArray must be an array when provided."
    );
  }


  if (
    high36MonthlyArray.length !==
    HIGH36_REQUIRED_MONTHS
  ) {

    throw new Error(
      `high36MonthlyArray must contain exactly ` +
      `${HIGH36_REQUIRED_MONTHS} monthly basic-pay values. ` +
      `Received ${high36MonthlyArray.length}.`
    );
  }


  return high36MonthlyArray.map(
    function (
      value,
      idx
    ) {

      return toPositiveMoney(
        value,
        `high36MonthlyArray[${idx}]`
      );
    }
  );
}


/* ============================================================
  //#4) CREDITABLE SERVICE RESOLUTION

  Preferred:
    serviceMonths

  Compatibility:
    yearsOfService

  IMPORTANT
  -------------------------------------------------------------
  If serviceMonths is supplied, it is used instead of
  yearsOfService.

  This avoids mistakes such as:

    22 years 6 months
    = 270 months
    = 22.5 years

  becoming 22.50 only because another caller rounded a decimal.

  For normal active-duty date-based calculators, callers should
  eventually send completed serviceMonths directly.
============================================================ */

export function resolveCreditableService(
  input = {}
) {

  if (
    input.serviceMonths !==
      undefined &&
    input.serviceMonths !==
      null &&
    input.serviceMonths !==
      ""
  ) {

    const serviceMonths =
      toNonNegativeInteger(
        input.serviceMonths,
        "serviceMonths"
      );


    const yearsOfService =
      serviceMonths /
      12;


    return {

      serviceMonths,

      yearsOfService,

      source:
        "SERVICE_MONTHS"

    };
  }


  if (
    input.yearsOfService !==
      undefined &&
    input.yearsOfService !==
      null &&
    input.yearsOfService !==
      ""
  ) {

    const yearsOfService =
      toNonNegativeYears(
        input.yearsOfService,
        "yearsOfService"
      );


    return {

      serviceMonths:
        null,

      yearsOfService,

      source:
        "YEARS_OF_SERVICE"

    };
  }


  throw new Error(
    "Provide either serviceMonths or yearsOfService."
  );
}


/* ============================================================
  //#5) REGULAR RETIREMENT ELIGIBILITY
============================================================ */

export function validateRegularRetirementEligibility(
  yearsOfService
) {

  const yos =
    toNonNegativeYears(
      yearsOfService,
      "yearsOfService"
    );


  if (
    yos <
    MIN_REGULAR_RETIREMENT_YEARS
  ) {

    throw new Error(
      `Active-duty regular retirement requires at least ` +
      `${MIN_REGULAR_RETIREMENT_YEARS} years of creditable service. ` +
      `Received ${roundPrecision(yos, 6)} years.`
    );
  }


  return true;
}


/* ============================================================
  //#6) RETIREMENT MULTIPLIER

  CRITICAL
  -------------------------------------------------------------
  DO NOT round this value to 2 decimal places.

  EXAMPLE:

    HIGH3
    22 years 6 months

    22.5 × 0.025
    =
    0.5625
    =
    56.25%

  The previous engine did:

    round2(0.5625)
    =
    0.56

  which incorrectly reduced the multiplier to 56%.
============================================================ */

export function getMultiplier(
  retirementSystem,
  yearsOfService
) {

  const system =
    normalizeSystem(
      retirementSystem
    );


  const yos =
    toNonNegativeYears(
      yearsOfService,
      "yearsOfService"
    );


  if (
    system === "HIGH3"
  ) {

    return (
      yos *
      0.025
    );
  }


  if (
    system === "BRS"
  ) {

    return (
      yos *
      0.02
    );
  }


  throw new Error(
    `No multiplier rule found for system "${system}".`
  );
}


/* ============================================================
  //#7) RETIRED PAY BASE

  HIGH-36
  -------------------------------------------------------------
  When exactly 36 monthly values are provided:

    sum(monthly basic pay)
    ÷
    36

  The RAW average is preserved internally.

  We also return a rounded 2-decimal presentation value.

  ESTIMATE MODE
  -------------------------------------------------------------
  If no High-36 array is supplied, monthlyBasicPayAtRetirement
  is used as a proxy only.
============================================================ */

export function getRetiredPayBase(
  input = {}
) {

  const high36 =
    input.high36MonthlyArray;


  const monthlyBasicPayAtRetirement =
    input.monthlyBasicPayAtRetirement;


  /* ========================================================
    EXACT HIGH-36
  ======================================================== */

  if (
    Array.isArray(
      high36
    )
  ) {

    const cleaned =
      validateHigh36Array(
        high36
      );


    const sum =
      cleaned.reduce(
        function (
          acc,
          value
        ) {

          return (
            acc +
            value
          );
        },
        0
      );


    const retiredPayBaseRaw =
      sum /
      cleaned.length;


    return {

      /* Compatibility / presentation value */
      retiredPayBase:
        round2(
          retiredPayBaseRaw
        ),

      /* Calculation value */
      retiredPayBaseRaw,

      baseMethod:
        "HIGH36_AVERAGE",

      monthsUsed:
        cleaned.length

    };
  }


  /* ========================================================
    FINAL-MONTH ESTIMATE
  ======================================================== */

  if (
    monthlyBasicPayAtRetirement !==
      undefined &&
    monthlyBasicPayAtRetirement !==
      null &&
    monthlyBasicPayAtRetirement !==
      ""
  ) {

    const monthly =
      toPositiveMoney(
        monthlyBasicPayAtRetirement,
        "monthlyBasicPayAtRetirement"
      );


    return {

      retiredPayBase:
        round2(
          monthly
        ),

      retiredPayBaseRaw:
        monthly,

      baseMethod:
        "FINAL_MONTH_ESTIMATE",

      monthsUsed:
        1

    };
  }


  throw new Error(
    "Provide either high36MonthlyArray or monthlyBasicPayAtRetirement."
  );
}


/* ============================================================
  //#8) MAIN RETIREMENT API
============================================================ */

export function getRetirementPay(
  input = {}
) {

  if (
    !input ||
    typeof input !==
      "object" ||
    Array.isArray(
      input
    )
  ) {

    throw new Error(
      "Input object is required."
    );
  }


  /* ========================================================
    SYSTEM
  ======================================================== */

  const retirementSystem =
    normalizeSystem(
      input.retirementSystem
    );


  /* ========================================================
    CREDITABLE SERVICE
  ======================================================== */

  const service =
    resolveCreditableService(
      input
    );


  const yearsOfService =
    service.yearsOfService;


  validateRegularRetirementEligibility(
    yearsOfService
  );


  /* ========================================================
    RETIRED PAY BASE
  ======================================================== */

  const baseInfo =
    getRetiredPayBase(
      input
    );


  /*
    IMPORTANT:

    Use the raw average for the actual retired-pay calculation.

    Do not reduce the High-36 average to two decimals until
    presentation.
  */

  const retiredPayBaseForCalculation =
    Number.isFinite(
      Number(
        baseInfo.retiredPayBaseRaw
      )
    )
      ? Number(
          baseInfo.retiredPayBaseRaw
        )
      : Number(
          baseInfo.retiredPayBase
        );


  /* ========================================================
    MULTIPLIER
  ======================================================== */

  const multiplierRaw =
    getMultiplier(
      retirementSystem,
      yearsOfService
    );


  /*
    Preserve legitimate multiplier precision.

    Example:
      22.5 years HIGH3
      -> 0.5625
  */

  const multiplier =
    roundPrecision(
      multiplierRaw,
      10
    );


  const multiplierPercent =
    roundPrecision(
      multiplierRaw *
      100,
      6
    );


  /* ========================================================
    RETIRED PAY
  ======================================================== */

  const grossMonthlyRetiredPayRaw =
    retiredPayBaseForCalculation *
    multiplierRaw;


  /*
    10 USC § 1412:
    if the computed amount is not an exact whole dollar,
    round to the next lower multiple of $1.
  */

  const grossMonthlyRetiredPay =
    floorCurrency(
      grossMonthlyRetiredPayRaw
    );


  const grossAnnualRetiredPay =
    grossMonthlyRetiredPay *
    12;


  /* ========================================================
    RESPONSE
  ======================================================== */

  return {

    ok:
      true,


    /* ------------------------------------------------------
      SYSTEM
    ------------------------------------------------------ */

    retirementSystem,


    /* ------------------------------------------------------
      SERVICE
    ------------------------------------------------------ */

    yearsOfService:
      roundPrecision(
        yearsOfService,
        10
      ),

    serviceMonths:
      service.serviceMonths,

    serviceCreditSource:
      service.source,


    /* ------------------------------------------------------
      MULTIPLIER
    ------------------------------------------------------ */

    multiplier,

    multiplierPercent,


    /* ------------------------------------------------------
      RETIRED PAY BASE
    ------------------------------------------------------ */

    retiredPayBase:
      round2(
        retiredPayBaseForCalculation
      ),

    retiredPayBaseRaw:
      roundPrecision(
        retiredPayBaseForCalculation,
        10
      ),

    baseMethod:
      baseInfo.baseMethod,

    monthsUsedForBase:
      baseInfo.monthsUsed,


    /* ------------------------------------------------------
      MONTHLY RETIRED PAY
    ------------------------------------------------------ */

    grossMonthlyRetiredPay,

    grossMonthlyRetiredPayRaw:
      round2(
        grossMonthlyRetiredPayRaw
      ),


    /* ------------------------------------------------------
      YEARLY RETIRED PAY
    ------------------------------------------------------ */

    grossAnnualRetiredPay,


    /* ------------------------------------------------------
      COMPATIBILITY ALIASES

      Preserve existing downstream callers.
    ------------------------------------------------------ */

    retiredPayGross:
      grossMonthlyRetiredPay,

    monthlyRetirement:
      grossMonthlyRetiredPay,

    annualRetirement:
      grossAnnualRetiredPay,


    /* ------------------------------------------------------
      SOURCE VERSION
    ------------------------------------------------------ */

    rateVersion:
      RATE_VERSION

  };
}


/* ============================================================
  //#9) SAFE API
============================================================ */

export function safeGetRetirementPay(
  input = {}
) {

  try {

    return getRetirementPay(
      input
    );

  } catch (
    error
  ) {

    return {

      ok:
        false,

      error:

        error &&
        error.message

          ? error.message

          : "Unable to calculate retirement pay.",

      rateVersion:
        RATE_VERSION

    };
  }
}


/* ============================================================
  //#10) DEFAULT EXPORT
============================================================ */

export default Object.freeze({

  RATE_VERSION,

  SUPPORTED_SYSTEMS,

  HIGH36_REQUIRED_MONTHS,

  MIN_REGULAR_RETIREMENT_YEARS,

  normalizeSystem,

  normalizeRetirementSystem,

  resolveCreditableService,

  validateRegularRetirementEligibility,

  getMultiplier,

  getRetiredPayBase,

  getRetirementPay,

  safeGetRetirementPay,

  round2,

  roundPrecision

});
