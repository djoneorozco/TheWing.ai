// netlify/functions/_share/disability-rating.js
// ============================================================
// TheWing.ai • VA Disability Combined Rating Engine
// v1.0.0 • ES MODULE
//
// PURPOSE
// ------------------------------------------------------------
// Deterministic VA disability combined-rating engine.
//
// Implements the combined-rating process described in:
// 38 CFR § 4.25 — Combined Ratings Table
//
// RESPONSIBILITIES
// ------------------------------------------------------------
// - Normalize individual VA disability ratings
// - Sort disabilities from highest to lowest
// - Apply the VA "whole person" / remaining-efficiency method
// - Preserve whole-number intermediate combined values
// - Perform final nearest-10 rounding only once
// - Return calculation steps for:
//      • Disability Calculator
//      • Amy Brain
//      • Ask Amy explanations
//      • future automated tests
//
// DOES NOT
// ------------------------------------------------------------
// - Calculate VA monthly compensation
// - Apply the bilateral factor under 38 CFR § 4.26
// - Determine service connection
// - Determine effective dates
// - Determine TDIU
// - Determine SMC
// - Determine P&T status
// - Determine VA eligibility
// - Make rating decisions
//
// ARCHITECTURE
// ------------------------------------------------------------
// disability-rating.js = CALCULATES
// amy-brain.js         = ROUTES / KNOWS
// Amy                  = EXPLAINS
//
// "TheWing calculates. Amy explains."
// ============================================================

/* eslint-disable no-console */


// ============================================================
// //#1 VERSION / SOURCE
// ============================================================

export const DISABILITY_RATING_VERSION =
  "1.0.0";


export const DISABILITY_RATING_RULE_VERSION =
  "38-cfr-4.25";


export const DISABILITY_RATING_SOURCE =
  "38 CFR § 4.25 Combined Ratings Table";


// ============================================================
// //#2 SUPPORTED INDIVIDUAL RATINGS
// ============================================================
//
// Individual schedular ratings used by this calculator.
//
// 0% is accepted because a Veteran may have a service-connected
// 0% disability, but 0% does not change the combined value.
//
// Intermediate combined values are NOT restricted to these values.
// Example:
//
// 60 + 40 = 76
//
// 76 is then carried forward into the next calculation.
// ============================================================

export const VALID_INDIVIDUAL_RATINGS =
  Object.freeze([
    0,
    10,
    20,
    30,
    40,
    50,
    60,
    70,
    80,
    90,
    100
  ]);


// ============================================================
// //#3 ENGINE LIMITS
// ============================================================

export const MAX_DISABILITIES =
  100;


// ============================================================
// //#4 BASIC HELPERS
// ============================================================

function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function isPlainObject(
  value
) {

  return Boolean(
    value
  ) &&
    typeof value === "object" &&
    !Array.isArray(
      value
    );
}


function finiteNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;
  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;
}


function roundDecimal(
  value,
  places = 2
) {

  const number =
    finiteNumber(
      value
    );


  if (
    number === null
  ) {

    return null;
  }


  const factor =
    10 ** places;


  return Math.round(
    (
      number +
      Number.EPSILON
    ) *
    factor
  ) /
    factor;
}


function uniqueArray(
  values
) {

  return [
    ...new Set(
      (
        Array.isArray(
          values
        )
          ? values
          : []
      ).filter(
        Boolean
      )
    )
  ];
}


// ============================================================
// //#5 EXTRACT A RATING VALUE
// ============================================================
//
// Accepts:
//
// 60
//
// "60"
//
// {
//   rating: 60
// }
//
// {
//   percentage: 60
// }
//
// This gives us some flexibility later if the calculator sends
// condition objects instead of simple numbers.
// ============================================================

export function extractRatingValue(
  value
) {

  if (
    isPlainObject(
      value
    )
  ) {

    const candidates = [

      value.rating,
      value.rate,
      value.percent,
      value.percentage,
      value.value

    ];


    for (
      const candidate
      of candidates
    ) {

      const number =
        finiteNumber(
          candidate
        );


      if (
        number !== null
      ) {

        return number;
      }
    }


    return null;
  }


  return finiteNumber(
    value
  );
}


// ============================================================
// //#6 VALIDATE AN INDIVIDUAL RATING
// ============================================================

export function isValidIndividualRating(
  value
) {

  const rating =
    extractRatingValue(
      value
    );


  if (
    rating === null
  ) {

    return false;
  }


  return VALID_INDIVIDUAL_RATINGS.includes(
    rating
  );
}


// ============================================================
// //#7 RESOLVE RATINGS INPUT
// ============================================================
//
// Supports:
//
// calculateCombinedRating([60, 40, 20])
//
// calculateCombinedRating({
//   ratings: [60, 40, 20]
// })
//
// calculateCombinedRating({
//   disabilities: [
//     { rating: 60 },
//     { rating: 40 },
//     { rating: 20 }
//   ]
// })
//
// This makes the engine easier to reuse from Amy Brain.
// ============================================================

export function resolveRatingsInput(
  input
) {

  if (
    Array.isArray(
      input
    )
  ) {

    return input;
  }


  if (
    !isPlainObject(
      input
    )
  ) {

    return [];
  }


  const candidates = [

    input.ratings,
    input.disabilities,
    input.vaRatings,
    input.va_ratings,
    input.disabilityRatings,
    input.disability_ratings

  ];


  for (
    const candidate
    of candidates
  ) {

    if (
      Array.isArray(
        candidate
      )
    ) {

      return candidate;
    }
  }


  return [];
}


// ============================================================
// //#8 NORMALIZE RATINGS
// ============================================================
//
// strict = true
// ------------------------------------------------------------
// Invalid rating values throw an error.
//
// strict = false
// ------------------------------------------------------------
// Invalid values are ignored and returned in invalidRatings.
//
// 0% ratings remain in ratingsEntered but are removed from
// ratingsUsed because they do not change the combined percentage.
// ============================================================

export function normalizeRatings(
  input,
  {
    strict = true
  } = {}
) {

  const raw =
    resolveRatingsInput(
      input
    );


  if (
    raw.length >
    MAX_DISABILITIES
  ) {

    throw new Error(
      `Too many disability ratings. Maximum supported is ${MAX_DISABILITIES}.`
    );
  }


  const ratingsEntered =
    [];


  const invalidRatings =
    [];


  raw.forEach(
    (
      item,
      index
    ) => {

      const rating =
        extractRatingValue(
          item
        );


      if (
        rating === null ||
        !VALID_INDIVIDUAL_RATINGS.includes(
          rating
        )
      ) {

        invalidRatings.push({

          index,

          value:
            item

        });


        return;
      }


      ratingsEntered.push(
        rating
      );

    }
  );


  if (
    strict &&
    invalidRatings.length
  ) {

    const first =
      invalidRatings[0];


    throw new Error(
      `Invalid VA disability rating at index ${first.index}. ` +
      `Supported individual ratings are ${VALID_INDIVIDUAL_RATINGS.join(", ")}.`
    );
  }


  const zeroRatings =
    ratingsEntered.filter(
      (
        rating
      ) =>
        rating === 0
    );


  const ratingsUsed =
    ratingsEntered

      .filter(
        (
          rating
        ) =>
          rating > 0
      )

      .sort(
        (
          a,
          b
        ) =>
          b - a
      );


  return {

    ratingsEntered,

    ratingsUsed,

    zeroRatings,

    invalidRatings

  };
}


// ============================================================
// //#9 VA FINAL ROUNDING
// ============================================================
//
// 38 CFR § 4.25:
//
// Final combined values are converted to the nearest number
// divisible by 10.
//
// Values ending in 5 are adjusted upward.
//
// Examples:
//
// 65 → 70
// 52 → 50
// 81 → 80
// 85 → 90
// 94 → 90
// 95 → 100
//
// IMPORTANT:
//
// This is FINAL rounding.
//
// It must NOT be used after every disability.
// ============================================================

export function roundFinalVARating(
  combinedValue
) {

  const number =
    finiteNumber(
      combinedValue
    );


  if (
    number === null
  ) {

    throw new TypeError(
      "Combined value must be a finite number."
    );
  }


  const combined =
    clamp(
      Math.round(
        number
      ),
      0,
      100
    );


  if (
    combined === 0
  ) {

    return 0;
  }


  return clamp(

    Math.floor(
      (
        combined +
        5
      ) /
      10
    ) *
      10,

    0,
    100
  );
}


// ============================================================
// //#10 FINAL ROUNDING DETAILS
// ============================================================

export function getFinalRoundingDetails(
  combinedValue
) {

  const combined =
    clamp(
      Math.round(
        Number(
          combinedValue
        ) || 0
      ),
      0,
      100
    );


  const official =
    roundFinalVARating(
      combined
    );


  const difference =
    official -
    combined;


  let direction =
    "none";


  if (
    difference >
    0
  ) {

    direction =
      "up";

  } else if (
    difference <
    0
  ) {

    direction =
      "down";
  }


  return {

    combinedValue:
      combined,

    officialRating:
      official,

    difference,

    direction,

    rounded:
      combined !==
      official

  };
}


// ============================================================
// //#11 COMBINE TWO RATINGS
// ============================================================
//
// WHOLE-PERSON METHOD
// ------------------------------------------------------------
//
// Current combined value:
// 60
//
// Remaining efficiency:
// 100 - 60 = 40
//
// Next disability:
// 40%
//
// Raw effect:
//
// 40 × .40 = 16
//
// New combined value:
//
// 60 + 16 = 76
//
// ------------------------------------------------------------
//
// Another example:
//
// Current:
// 76
//
// Remaining:
// 24
//
// Next disability:
// 20%
//
// 24 × .20 = 4.8
//
// Raw combined:
// 80.8
//
// Table I whole-number combined value:
// 81
//
// IMPORTANT:
//
// 81 is NOT rounded to 80 until all disabilities have been
// combined.
// ============================================================

export function combineTwoRatings(
  currentCombined,
  nextRating
) {

  const current =
    finiteNumber(
      currentCombined
    );


  const rating =
    finiteNumber(
      nextRating
    );


  if (
    current === null
  ) {

    throw new TypeError(
      "Current combined value must be a finite number."
    );
  }


  if (
    rating === null
  ) {

    throw new TypeError(
      "Next disability rating must be a finite number."
    );
  }


  if (
    current < 0 ||
    current > 100
  ) {

    throw new RangeError(
      "Current combined value must be between 0 and 100."
    );
  }


  if (
    !VALID_INDIVIDUAL_RATINGS.includes(
      rating
    )
  ) {

    throw new RangeError(
      `Unsupported individual VA rating: ${rating}.`
    );
  }


  const normalizedCurrent =
    Math.round(
      current
    );


  /*
    A 0% condition does not change the current combined value.
  */

  if (
    rating === 0
  ) {

    return {

      previousCombined:
        normalizedCurrent,

      rating,

      remainingBefore:
        100 -
        normalizedCurrent,

      rawContribution:
        0,

      contribution:
        0,

      rawCombined:
        normalizedCurrent,

      combined:
        normalizedCurrent,

      remainingAfter:
        100 -
        normalizedCurrent

    };
  }


  /*
    Once a 100% disability exists, the combined result remains 100.
  */

  if (
    normalizedCurrent >=
    100
  ) {

    return {

      previousCombined:
        100,

      rating,

      remainingBefore:
        0,

      rawContribution:
        0,

      contribution:
        0,

      rawCombined:
        100,

      combined:
        100,

      remainingAfter:
        0

    };
  }


  /*
    Remaining efficiency after the existing combined disability.
  */

  const remainingBefore =
    100 -
    normalizedCurrent;


  /*
    The next disability applies only to the efficiency remaining.
  */

  const rawContribution =
    remainingBefore *
    (
      rating /
      100
    );


  /*
    Whole-person combined value before Table I whole-number
    conversion.
  */

  const rawCombined =
    normalizedCurrent +
    rawContribution;


  /*
    Table I uses whole-number combined values.

    This is NOT final nearest-10 rounding.

    Example:
    80.8 → 81

    NOT:
    80.8 → 80
  */

  const combined =
    clamp(
      Math.round(
        rawCombined
      ),
      0,
      100
    );


  /*
    Contribution as reflected by the whole-number Table I result.

    Example:
    76 → 81

    displayed contribution = 5
  */

  const contribution =
    combined -
    normalizedCurrent;


  const remainingAfter =
    100 -
    combined;


  return {

    previousCombined:
      normalizedCurrent,

    rating,

    remainingBefore,

    rawContribution:
      roundDecimal(
        rawContribution,
        4
      ),

    contribution,

    rawCombined:
      roundDecimal(
        rawCombined,
        4
      ),

    combined,

    remainingAfter

  };
}


// ============================================================
// //#12 CALCULATE COMPLETE COMBINED RATING
// ============================================================

export function calculateCombinedRating(
  input,
  options = {}
) {

  const normalized =
    normalizeRatings(
      input,
      options
    );


  const {
    ratingsEntered,
    ratingsUsed,
    zeroRatings,
    invalidRatings
  } =
    normalized;


  /*
    No compensable percentage entered.
  */

  if (
    ratingsUsed.length ===
    0
  ) {

    return {

      ok:
        true,

      version:
        DISABILITY_RATING_VERSION,

      ruleVersion:
        DISABILITY_RATING_RULE_VERSION,

      source:
        DISABILITY_RATING_SOURCE,


      ratingsEntered:
        ratingsEntered.slice(),

      ratingsSorted:
        [],

      ratingsUsed:
        [],


      ratingCount:
        ratingsEntered.length,

      activeRatingCount:
        0,

      zeroPercentCount:
        zeroRatings.length,

      invalidRatingCount:
        invalidRatings.length,


      highestRating:
        0,

      combinedValue:
        0,

      officialRating:
        0,

      remainingEfficiency:
        100,


      finalRounding: {

        combinedValue:
          0,

        officialRating:
          0,

        difference:
          0,

        direction:
          "none",

        rounded:
          false

      },


      steps:
        [],


      limitations: {

        bilateralFactorIncluded:
          false,

        compensationIncluded:
          false,

        smcIncluded:
          false,

        tdiuIncluded:
          false

      }

    };
  }


  const steps =
    [];


  /*
    Ratings must be considered from greatest disability
    to least disability.
  */

  let combined =
    ratingsUsed[0];


  /*
    STEP 1

    The highest rating establishes the first disabled percentage.
  */

  steps.push({

    step:
      1,

    type:
      "initial_rating",

    rating:
      ratingsUsed[0],

    previousCombined:
      0,

    remainingBefore:
      100,

    rawContribution:
      ratingsUsed[0],

    contribution:
      ratingsUsed[0],

    rawCombined:
      ratingsUsed[0],

    combined:
      ratingsUsed[0],

    remainingAfter:
      100 -
      ratingsUsed[0]

  });


  /*
    Remaining disabilities are combined sequentially.

    IMPORTANT:

    The intermediate whole-number combined value is carried
    forward exactly.

    It is NOT rounded to the nearest 10 between steps.
  */

  for (
    let index = 1;
    index < ratingsUsed.length;
    index += 1
  ) {

    const rating =
      ratingsUsed[
        index
      ];


    const result =
      combineTwoRatings(
        combined,
        rating
      );


    combined =
      result.combined;


    steps.push({

      step:
        index +
        1,

      type:
        "combined_rating",

      rating:

        result.rating,

      previousCombined:
        result.previousCombined,

      remainingBefore:
        result.remainingBefore,

      rawContribution:
        result.rawContribution,

      contribution:
        result.contribution,

      rawCombined:
        result.rawCombined,

      combined:
        result.combined,

      remainingAfter:
        result.remainingAfter

    });


    /*
      A 100% combined value cannot be increased further.
    */

    if (
      combined >=
      100
    ) {

      break;
    }

  }


  const officialRating =
    roundFinalVARating(
      combined
    );


  const finalRounding =
    getFinalRoundingDetails(
      combined
    );


  return {

    ok:
      true,

    version:
      DISABILITY_RATING_VERSION,

    ruleVersion:
      DISABILITY_RATING_RULE_VERSION,

    source:
      DISABILITY_RATING_SOURCE,


    ratingsEntered:
      ratingsEntered.slice(),


    ratingsSorted:
      ratingsUsed.slice(),


    ratingsUsed:
      ratingsUsed.slice(),


    ratingCount:
      ratingsEntered.length,


    activeRatingCount:
      ratingsUsed.length,


    zeroPercentCount:
      zeroRatings.length,


    invalidRatingCount:
      invalidRatings.length,


    highestRating:
      ratingsUsed[0] ||
      0,


    combinedValue:
      combined,


    officialRating,


    remainingEfficiency:
      100 -
      combined,


    finalRounding,


    steps,


    limitations: {

      bilateralFactorIncluded:
        false,

      compensationIncluded:
        false,

      smcIncluded:
        false,

      tdiuIncluded:
        false

    }

  };
}


// ============================================================
// //#13 SAFE CALCULATOR
// ============================================================
//
// Designed for Amy Brain and API endpoints.
//
// Instead of throwing:
//
// {
//   ok: false,
//   error: "..."
// }
//
// is returned.
// ============================================================

export function safeCalculateCombinedRating(
  input,
  options = {}
) {

  try {

    return calculateCombinedRating(
      input,
      options
    );

  } catch (
    error
  ) {

    return {

      ok:
        false,

      version:
        DISABILITY_RATING_VERSION,

      ruleVersion:
        DISABILITY_RATING_RULE_VERSION,

      source:
        DISABILITY_RATING_SOURCE,

      error:
        String(
          error?.message ||
          error ||
          "VA disability combined-rating calculation failed."
        ),

      ratingsEntered:
        [],

      ratingsSorted:
        [],

      ratingsUsed:
        [],

      ratingCount:
        0,

      activeRatingCount:
        0,

      zeroPercentCount:
        0,

      highestRating:
        0,

      combinedValue:
        null,

      officialRating:
        null,

      remainingEfficiency:
        null,

      finalRounding:
        null,

      steps:
        [],

      limitations: {

        bilateralFactorIncluded:
          false,

        compensationIncluded:
          false,

        smcIncluded:
          false,

        tdiuIncluded:
          false

      }

    };
  }
}


// ============================================================
// //#14 BUILD STANDARDIZED DISABILITY PACKET
// ============================================================
//
// This is useful for Amy Brain.
//
// It does NOT generate Amy's prose response.
//
// It simply converts the calculation into a predictable
// deterministic packet.
//
// Example:
//
// const packet = buildDisabilityRatingPacket({
//   ratings: [60, 40, 20]
// });
//
// Amy Brain can then use:
// packet.combinedValue
// packet.officialRating
// packet.steps
// etc.
// ============================================================

export function buildDisabilityRatingPacket(
  input = {},
  options = {}
) {

  const result =
    safeCalculateCombinedRating(
      input,
      options
    );


  if (
    result.ok ===
    false
  ) {

    return {

      ...result,

      module:
        "va_disability",

      calculated:
        false

    };
  }


  return {

    ...result,

    module:
      "va_disability",

    calculated:
      true

  };
}


// ============================================================
// //#15 BUILD SIMPLE EXPLANATION DATA
// ============================================================
//
// Still deterministic.
//
// This does not attempt to speak like Amy.
//
// It provides clean facts that Amy can use to explain the result.
// ============================================================

export function buildDisabilityExplanationData(
  input = {},
  options = {}
) {

  const result =
    safeCalculateCombinedRating(
      input,
      options
    );


  if (
    !result.ok
  ) {

    return {

      ok:
        false,

      error:
        result.error,

      facts:
        [],

      warnings: [
        result.error
      ]

    };
  }


  const facts =
    [];


  if (
    result.activeRatingCount ===
    0
  ) {

    facts.push(
      "No disability rating above 0% is currently included in the combined-rating calculation."
    );


    return {

      ok:
        true,

      combinedValue:
        0,

      officialRating:
        0,

      facts,

      warnings:
        []

    };
  }


  facts.push(
    `The highest individual disability rating is ${result.highestRating}%.`
  );


  result.steps.forEach(
    (
      step,
      index
    ) => {

      if (
        index ===
        0
      ) {

        facts.push(
          `The calculation begins at ${step.rating}%, leaving ${step.remainingAfter}% remaining efficiency.`
        );


        return;
      }


      facts.push(
        `The ${step.rating}% rating is applied to the ${step.remainingBefore}% efficiency remaining from the previous step.`
      );


      facts.push(
        `That step adds ${step.contribution} percentage points to the whole-number combined value, increasing it from ${step.previousCombined}% to ${step.combined}%.`
      );

    }
  );


  if (
    result.combinedValue !==
    result.officialRating
  ) {

    facts.push(
      `The final combined value is ${result.combinedValue}%, which rounds ${result.finalRounding.direction} to an official VA rating of ${result.officialRating}%.`
    );

  } else {

    facts.push(
      `The final combined value is ${result.combinedValue}%, so the official VA rating remains ${result.officialRating}%.`
    );
  }


  const warnings =
    [];


  if (
    result.zeroPercentCount >
    0
  ) {

    warnings.push(
      `${result.zeroPercentCount} zero-percent condition${result.zeroPercentCount === 1 ? "" : "s"} did not increase the combined percentage.`
    );
  }


  warnings.push(
    "The 38 CFR § 4.26 bilateral factor is not included in this calculation."
  );


  return {

    ok:
      true,

    source:
      DISABILITY_RATING_SOURCE,

    ratings:
      result.ratingsSorted,

    highestRating:
      result.highestRating,

    combinedValue:
      result.combinedValue,

    officialRating:
      result.officialRating,

    remainingEfficiency:
      result.remainingEfficiency,

    finalRounding:
      result.finalRounding,

    steps:
      result.steps,

    facts:
      uniqueArray(
        facts
      ),

    warnings:
      uniqueArray(
        warnings
      )

  };
}


// ============================================================
// //#16 BUILT-IN VALIDATION EXAMPLES
// ============================================================
//
// These correspond to § 4.25 examples and are useful for
// automated tests or development checks.
//
// Nothing here runs automatically in production.
// ============================================================

export const DISABILITY_RATING_TEST_CASES =
  Object.freeze([

    Object.freeze({

      name:
        "50 + 30",

      ratings:
        Object.freeze([
          50,
          30
        ]),

      expectedCombined:
        65,

      expectedOfficial:
        70

    }),


    Object.freeze({

      name:
        "40 + 20",

      ratings:
        Object.freeze([
          40,
          20
        ]),

      expectedCombined:
        52,

      expectedOfficial:
        50

    }),


    Object.freeze({

      name:
        "60 + 40 + 20",

      ratings:
        Object.freeze([
          60,
          40,
          20
        ]),

      expectedCombined:
        81,

      expectedOfficial:
        80

    }),


    Object.freeze({

      name:
        "10 + 10",

      ratings:
        Object.freeze([
          10,
          10
        ]),

      expectedCombined:
        19,

      expectedOfficial:
        20

    }),


    Object.freeze({

      name:
        "100 percent",

      ratings:
        Object.freeze([
          100
        ]),

      expectedCombined:
        100,

      expectedOfficial:
        100

    }),


    Object.freeze({

      name:
        "zero percent only",

      ratings:
        Object.freeze([
          0
        ]),

      expectedCombined:
        0,

      expectedOfficial:
        0

    })

  ]);


// ============================================================
// //#17 SELF CHECK
// ============================================================
//
// Usage:
//
// import {
//   runDisabilityRatingSelfCheck
// } from "./disability-rating.js";
//
// console.log(
//   runDisabilityRatingSelfCheck()
// );
//
// ============================================================

export function runDisabilityRatingSelfCheck() {

  const tests =
    DISABILITY_RATING_TEST_CASES.map(
      (
        test
      ) => {

        const result =
          safeCalculateCombinedRating(
            test.ratings
          );


        const passed =
          Boolean(
            result.ok
          ) &&
          result.combinedValue ===
            test.expectedCombined &&
          result.officialRating ===
            test.expectedOfficial;


        return {

          name:
            test.name,

          passed,

          expected: {

            combinedValue:
              test.expectedCombined,

            officialRating:
              test.expectedOfficial

          },

          actual: {

            combinedValue:
              result.combinedValue,

            officialRating:
              result.officialRating

          }

        };
      }
    );


  return {

    ok:
      tests.every(
        (
          test
        ) =>
          test.passed
      ),

    version:
      DISABILITY_RATING_VERSION,

    ruleVersion:
      DISABILITY_RATING_RULE_VERSION,

    tests

  };
}


// ============================================================
// //#18 METADATA
// ============================================================

export function getDisabilityRatingMetadata() {

  return {

    name:
      "TheWing VA Disability Combined Rating Engine",

    module:
      "va_disability",

    version:
      DISABILITY_RATING_VERSION,

    ruleVersion:
      DISABILITY_RATING_RULE_VERSION,

    authority:
      DISABILITY_RATING_SOURCE,

    supportedIndividualRatings:
      [
        ...VALID_INDIVIDUAL_RATINGS
      ],

    responsibilities: [

      "normalize VA disability ratings",

      "sort ratings by severity",

      "calculate remaining efficiency",

      "calculate intermediate combined values",

      "calculate final combined value",

      "perform final VA nearest-10 rounding",

      "return deterministic calculation steps"

    ],

    exclusions: [

      "38 CFR § 4.26 bilateral factor",

      "VA monthly compensation",

      "service connection determination",

      "effective date determination",

      "TDIU determination",

      "SMC determination",

      "P&T determination",

      "VA eligibility determination"

    ]

  };
}


// ============================================================
// //#19 DEFAULT EXPORT
// ============================================================

export default Object.freeze({

  version:
    DISABILITY_RATING_VERSION,

  ruleVersion:
    DISABILITY_RATING_RULE_VERSION,

  source:
    DISABILITY_RATING_SOURCE,


  validRatings:
    VALID_INDIVIDUAL_RATINGS,


  extractRatingValue,

  isValidIndividualRating,

  resolveRatingsInput,

  normalizeRatings,

  combineTwoRatings,

  roundFinalVARating,

  getFinalRoundingDetails,

  calculateCombinedRating,

  safeCalculateCombinedRating,

  buildDisabilityRatingPacket,

  buildDisabilityExplanationData,

  runSelfCheck:
    runDisabilityRatingSelfCheck,

  metadata:
    getDisabilityRatingMetadata

});
