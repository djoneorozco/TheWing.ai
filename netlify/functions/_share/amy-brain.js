// netlify/functions/_share/amy-brain.js
// ============================================================
// TheWing.ai • Ask Amy Deterministic Knowledge Router
// v1.1.0 • ES MODULE
//
// PURPOSE
// - Route Ask Amy questions to registered deterministic modules
// - Assemble a unified truth packet for the agent layer
// - Never call OpenAI
// - Never directly calculate military compensation
// - Never access Supabase, localStorage, DOM, or browser globals
//
// PRINCIPLE
// TheWing calculates.
// Knowledge modules produce truth packets.
// amy-brain.js routes and assembles.
// Amy explains.
//
// MODULES
// ------------------------------------------------------------
// - compensation
// - va_disability
// - va_loans
// - pt_calculator
// - air_force_fitness
//
// VA DISABILITY ARCHITECTURE
// ------------------------------------------------------------
// disability-rating.js
//      ↓
// amy-brain.js
//      ↓
// agent-amy-public.js
//      ↓
// Amy conversational explanation
//
// IMPORTANT
// ------------------------------------------------------------
// VA disability rating math is owned by disability-rating.js.
// Amy Brain only:
// - detects the topic
// - resolves calculator/user context
// - calls the deterministic module
// - assembles facts for Amy
//
// 38 CFR § 4.26 bilateral factor is NOT implemented here.
// ============================================================


import {
  VA_LOANS_VERSION,
  detectVaLoanIntent,
  buildVaLoanTruthPacket
} from "./va-loans.js";


import {
  PT_CALCULATOR_VERSION,
  detectPtCalculatorIntent,
  buildPtCalculatorTruthPacket
} from "./pt-calculator.js";


import {
  AF_FITNESS_VERSION,
  detectAfFitnessIntent,
  buildAfFitnessTruthPacket
} from "./af-fitness.js";


import {
  DISABILITY_RATING_VERSION,
  buildDisabilityRatingPacket
} from "./disability-rating.js";


// ============================================================
// //#1 VERSION
// ============================================================

export const AMY_BRAIN_VERSION =
  "amy-brain-v1.1.0";


// ============================================================
// //#2 INTERNAL HELPERS
// ============================================================

function clean(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function lower(value) {

  return clean(value).toLowerCase();
}


function isPlainObject(value) {

  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}


function safeObject(value) {

  return isPlainObject(value)
    ? { ...value }
    : {};
}


function pickFirstObject(...values) {

  for (const value of values) {

    if (
      isPlainObject(value) &&
      Object.keys(value).length
    ) {

      return {
        ...value
      };
    }
  }

  return {};
}


function hasAnyValue(
  obj,
  keys = []
) {

  if (
    !isPlainObject(obj)
  ) {
    return false;
  }

  for (const key of keys) {

    const value =
      obj[key];

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      continue;
    }

    return true;
  }

  return false;
}


function uniqueArray(values) {

  const out = [];

  const seen =
    new Set();

  for (
    const value
    of Array.isArray(values)
      ? values
      : []
  ) {

    const item =
      clean(value);

    if (!item) {
      continue;
    }

    const key =
      item.toLowerCase();

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    out.push(item);
  }

  return out;
}


function money(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }
  ).format(n);
}


function firstNumber(...values) {

  for (const value of values) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    if (
      typeof value === "string"
    ) {

      const cleaned =
        value.replace(
          /[$,%\s,]/g,
          ""
        );

      const n =
        Number(cleaned);

      if (
        Number.isFinite(n)
      ) {
        return n;
      }

      continue;
    }

    const n =
      Number(value);

    if (
      Number.isFinite(n)
    ) {
      return n;
    }
  }

  return null;
}


function stripEmpty(obj) {

  if (
    !isPlainObject(obj)
  ) {
    return obj;
  }

  const out = {};

  for (
    const [key, value]
    of Object.entries(obj)
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    if (
      Array.isArray(value)
    ) {

      if (
        value.length
      ) {

        out[key] =
          value;
      }

      continue;
    }

    if (
      isPlainObject(value)
    ) {

      const nested =
        stripEmpty(value);

      if (
        nested &&
        Object.keys(nested).length
      ) {

        out[key] =
          nested;
      }

      continue;
    }

    out[key] =
      value;
  }

  return out;
}


// ============================================================
// //#2A DISABILITY CONTEXT HELPERS
// ============================================================

function normalizeDisabilityContainer(
  value
) {

  if (
    Array.isArray(value)
  ) {

    return {
      ratings: [
        ...value
      ]
    };
  }

  if (
    isPlainObject(value)
  ) {

    return {
      ...value
    };
  }

  return {};
}


function pickFirstDisabilityContext(
  ...values
) {

  for (const value of values) {

    const normalized =
      normalizeDisabilityContainer(
        value
      );

    if (
      Object.keys(normalized).length
    ) {

      return normalized;
    }
  }

  return {};
}


function hasArrayValues(value) {

  return (
    Array.isArray(value) &&
    value.length > 0
  );
}


function getDisabilityRatingsFromContext(
  context
) {

  if (
    !isPlainObject(context)
  ) {

    return [];
  }

  const candidates = [

    context.ratingsEntered,
    context.ratings_entered,

    context.ratingsSorted,
    context.ratings_sorted,

    context.ratingsUsed,
    context.ratings_used,

    context.ratings,

    context.vaRatings,
    context.va_ratings,

    context.disabilityRatings,
    context.disability_ratings,

    context.disabilities

  ];

  for (
    const candidate
    of candidates
  ) {

    if (
      hasArrayValues(candidate)
    ) {

      return [
        ...candidate
      ];
    }
  }

  return [];
}


const DISABILITY_CONTEXT_VALUE_KEYS = [

  "ratings",
  "ratingsEntered",
  "ratings_entered",
  "ratingsSorted",
  "ratings_sorted",
  "ratingsUsed",
  "ratings_used",

  "vaRatings",
  "va_ratings",

  "disabilityRatings",
  "disability_ratings",

  "disabilities",

  "highestRating",
  "highest_rating",

  "combinedValue",
  "combined_value",

  "officialRating",
  "official_rating",

  "remainingEfficiency",
  "remaining_efficiency",

  "steps",

  "compensation",

  "dependents",

  "rateVersion",
  "rate_version",

  "ruleVersion",
  "rule_version"

];


function hasRecognizedDisabilityFields(
  obj
) {

  if (
    !isPlainObject(obj)
  ) {

    return false;
  }

  if (
    hasAnyValue(
      obj,
      DISABILITY_CONTEXT_VALUE_KEYS
    )
  ) {

    return true;
  }

  return (
    getDisabilityRatingsFromContext(
      obj
    ).length >
    0
  );
}


// ============================================================
// //#2B EXPLICIT RATINGS FROM USER MESSAGE
// ============================================================
//
// Example:
//
// "How does 60%, 40%, and 20% combine?"
//
// becomes:
//
// [60, 40, 20]
//
// We intentionally require VA/disability/rating context before
// using bare numeric values so Amy does not interpret arbitrary
// numbers such as ages, years, home prices, etc. as VA ratings.
// ============================================================

function extractExplicitDisabilityRatings(
  message
) {

  const text =
    clean(message);

  if (!text) {
    return [];
  }

  const t =
    lower(text);

  const disabilityContext =
    /\b(va disability|disability rating|disability ratings|combined rating|combined ratings|va rating|va ratings|whole person|remaining efficiency|rating math|va math)\b/i.test(
      t
    );

  const containsPercent =
    /\b(?:0|10|20|30|40|50|60|70|80|90|100)\s*%/.test(
      t
    );

  /*
    If percentages are explicitly written, that is a strong
    enough signal when disability language is present.
  */

  if (
    !disabilityContext &&
    !(
      containsPercent &&
      /\b(disability|rating|va)\b/i.test(t)
    )
  ) {

    return [];
  }

  const values =
    [];

  /*
    First prefer percentages.
  */

  const percentRegex =
    /\b(100|90|80|70|60|50|40|30|20|10|0)\s*%/g;

  let match;

  while (
    (
      match =
        percentRegex.exec(t)
    )
  ) {

    const rating =
      Number(
        match[1]
      );

    if (
      Number.isFinite(rating)
    ) {

      values.push(
        rating
      );
    }
  }

  if (
    values.length
  ) {

    return values;
  }

  /*
    Support wording such as:
    "combine 60 40 20"

    but only inside strong disability-rating context.
  */

  if (
    disabilityContext
  ) {

    const bareRegex =
      /\b(100|90|80|70|60|50|40|30|20|10|0)\b/g;

    while (
      (
        match =
          bareRegex.exec(t)
      )
    ) {

      const rating =
        Number(
          match[1]
        );

      if (
        Number.isFinite(rating)
      ) {

        values.push(
          rating
        );
      }
    }
  }

  return values;
}


// ============================================================
// //#2C DISABILITY STATE NORMALIZATION
// ============================================================

function normalizeSuppliedDisabilityPacket(
  raw = {}
) {

  const src =
    safeObject(raw);

  const ratings =
    getDisabilityRatingsFromContext(
      src
    );

  const combinedValue =
    firstNumber(
      src.combinedValue,
      src.combined_value
    );

  const officialRating =
    firstNumber(
      src.officialRating,
      src.official_rating
    );

  const highestRating =
    firstNumber(
      src.highestRating,
      src.highest_rating
    );

  const remainingEfficiency =
    firstNumber(
      src.remainingEfficiency,
      src.remaining_efficiency
    );

  return stripEmpty({

    ok:
      true,

    module:
      "va_disability",

    source:
      clean(src.source) ||
      "TheWing Disability Calculator supplied context",

    calculated:
      false,

    ratingsEntered:
      ratings,

    ratingsSorted:
      ratings,

    ratingsUsed:
      ratings.filter(
        (
          rating
        ) =>
          Number(rating) > 0
      ),

    highestRating,

    combinedValue,

    officialRating,

    remainingEfficiency,

    steps:
      Array.isArray(src.steps)
        ? src.steps
        : [],

    finalRounding:
      isPlainObject(
        src.finalRounding
      )
        ? src.finalRounding
        : isPlainObject(
            src.final_rounding
          )
          ? src.final_rounding
          : undefined,

    dependents:
      safeObject(
        src.dependents
      ),

    compensation:
      safeObject(
        src.compensation
      ),

    ruleVersion:
      clean(
        src.ruleVersion ||
        src.rule_version
      ) ||
      undefined,

    rateVersion:
      clean(
        src.rateVersion ||
        src.rate_version
      ) ||
      undefined

  });
}


// ============================================================
// //#3 COMPENSATION CONSTANTS
// ============================================================

const COMPENSATION_VALUE_KEYS = [

  "basePay",
  "base_pay",

  "bas",
  "bah",

  "total",
  "totalMonthly",
  "total_monthly",

  "retirementPay",
  "retirement_pay",

  "disabilityPay",
  "disability_pay",
  "va_disability_pay",

  "otherPay",
  "other_pay",

  "special_pay",
  "spouse_income",
  "additional_income",

  "compensationAccuracy",
  "retirementBaseMethod",

  "headline"

];


function hasRecognizedCompensationFields(
  obj
) {

  return hasAnyValue(
    obj,
    COMPENSATION_VALUE_KEYS
  );
}


const COMPENSATION_MESSAGE_RE =
  /\b(pay|base pay|basic pay|bas|bah|compensation|monthly income|military income|retired pay|retirement pay|va disability pay|total monthly compensation|what do i make|how much do i make|how much (?:do|will) i (?:make|earn|get))\b/i;


// ============================================================
// //#3A VA LOAN / VA DISABILITY LANGUAGE
// ============================================================

const VA_LOAN_EXPLICIT_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed(?:\s+loan)?|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|no pmi|va appraisal|seller concessions?|va closing costs)\b/i;


const VA_HOME_FINANCE_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed|home loan|mortgage|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|0 down|no down|no pmi|pmi|appraisal|seller concession|closing costs?|purchase price|home(?:\s+buying|\s+purchase)?|house|buy(?:ing)?)\b/i;


const VA_DISABILITY_ONLY_RE =
  /\bva\b.{0,24}\bdisability\b|\bdisability\b.{0,24}\b(va|compensation|pay)\b/i;


/*
  Strong VA disability / rating language.
*/

const VA_DISABILITY_MESSAGE_RE =
  /\b(va disability|va disabilities|disability rating|disability ratings|combined rating|combined ratings|combined va rating|va combined rating|va rating|va ratings|whole person|whole person concept|remaining efficiency|combined value|rating math|va math|va rounding|rating rounding|disability percentage|disability percentages|service[-\s]?connected disability|service[-\s]?connected disabilities)\b/i;


/*
  Questions specifically asking Amy to explain the VA math.
*/

const VA_DISABILITY_EXPLANATION_RE =
  /\b(why|how|explain|combine|combined|calculate|calculated|math|round|rounded|rounding|remaining|efficiency|whole person|percentage|percentages|rating|ratings)\b/i;


/*
  § 4.26 language is recognized so Amy can explain the limitation
  without pretending the current engine supports it.
*/

const VA_BILATERAL_RE =
  /\b(bilateral|bilateral factor|4\.26|§\s*4\.26|38\s*cfr\s*4\.26)\b/i;


// ============================================================
// //#4 INPUT NORMALIZATION
// ============================================================

function normalizeAmyBrainInput(
  rawInput = {}
) {

  const input =
    isPlainObject(rawInput)
      ? rawInput
      : {};

  const basicbrain =
    safeObject(
      input.basicbrain
    );

  const session =
    safeObject(
      input.session
    );

  const metadata =
    safeObject(
      input.metadata
    );

  const widget =
    safeObject(

      pickFirstObject(

        metadata.widget,
        input.widget,
        session.widget

      )
    );


  const profile =
    pickFirstObject(

      input.profile,
      basicbrain.profile,
      basicbrain.bridge,
      session.profile

    );


  const bridge =
    safeObject(
      basicbrain.bridge
    );


  const bridgeCompensation =
    hasRecognizedCompensationFields(
      bridge
    )
      ? bridge
      : {};


  const compensation =
    pickFirstObject(

      input.compensation,
      basicbrain.compensation,
      basicbrain.calculated_comp,
      session.compensation,
      bridgeCompensation

    );


  const pt =
    pickFirstObject(

      input.pt,
      input.ptScore,
      input.pt_score,
      input.ptScoreSnapshot,
      input.pt_score_snapshot,
      input.ptCalculator,
      input.pt_calculator,
      input.pfra,
      input.fitness,

      widget.ptScore,
      widget.pt_score,
      widget.pt,
      widget.fitness,

      session.pt,
      session.ptScore,
      session.pt_score,
      session.ptCalculator,
      session.pt_calculator,
      session.pfra,
      session.fitness,

      basicbrain.pt,
      basicbrain.ptScore,
      basicbrain.pt_score,
      basicbrain.ptCalculator,
      basicbrain.pt_calculator,
      basicbrain.pfra,
      basicbrain.fitness

    );


  /*
    VA Disability Calculator / state.

    This intentionally accepts several aliases so we do not
    tightly couple Amy Brain to one frontend payload shape.

    Preferred future shape:

    disability: {
      ratingsEntered: [60,40,20],
      combinedValue: 81,
      officialRating: 80,
      steps: [...]
    }
  */

  const disability =
    pickFirstDisabilityContext(

      input.disability,
      input.vaDisability,
      input.va_disability,
      input.disabilityRating,
      input.disability_rating,
      input.disabilityCalculator,
      input.disability_calculator,

      widget.disability,
      widget.vaDisability,
      widget.va_disability,
      widget.disabilityRating,
      widget.disability_rating,
      widget.disabilityCalculator,
      widget.disability_calculator,

      session.disability,
      session.vaDisability,
      session.va_disability,
      session.disabilityCalculator,
      session.disability_calculator,

      basicbrain.disability,
      basicbrain.vaDisability,
      basicbrain.va_disability,
      basicbrain.disabilityCalculator,
      basicbrain.disability_calculator

    );


  return {

    message:
      clean(
        input.message
      ),

    profile,

    scenario:
      safeObject(
        input.scenario
      ),

    compensation,

    mortgage:
      safeObject(
        input.mortgage
      ),

    affordability:
      safeObject(
        input.affordability
      ),

    pt,

    disability,

    selectedBase:
      safeObject(
        input.selectedBase
      ),

    basicbrain,

    session,

    metadata: {

      ...metadata,

      widget,

      page:
        metadata.page ||
        input.page ||
        null

    }

  };
}


// ============================================================
// //#5 PT HELPERS
// ============================================================

const PT_VALUE_KEYS = [

  "sex",
  "gender",

  "age",
  "age_band",
  "ageBand",

  "height_inches",
  "height",

  "waist_inches",
  "waist",

  "strength_option",
  "strength_reps",

  "core_option",
  "core_reps",

  "plank_seconds",

  "cardio_option",
  "run_seconds",
  "hamr_shuttles",
  "walk_seconds",

  "total_score",
  "total",
  "displayed_total_score",

  "component_scores",
  "scores",

  "bodyScore",
  "strengthScore",
  "coreScore",
  "cardioScore",

  "category",
  "minimumsMet",

  "type",
  "source"

];


function hasRecognizedPtFields(
  obj
) {

  return hasAnyValue(
    obj,
    PT_VALUE_KEYS
  );
}


// ============================================================
// //#6 COMPENSATION PACKET NORMALIZATION
// ============================================================

function normalizeCompensationPacket(
  raw = {}
) {

  const src =
    safeObject(
      raw
    );

  const monthly =
    isPlainObject(
      src.monthly
    )
      ? src.monthly
      : {};


  const packet = {

    ok:
      true,

    module:
      "compensation",

    source:
      "amy-brain supplied compensation context",

    calculated:
      false,


    // Active duty / common

    basePay:
      firstNumber(
        src.basePay,
        src.base_pay,
        monthly.basePay,
        monthly.basicPay
      ),

    base_pay:
      firstNumber(
        src.base_pay,
        src.basePay,
        monthly.basePay,
        monthly.basicPay
      ),

    bas:
      firstNumber(
        src.bas,
        src.BAS,
        monthly.bas
      ),

    bah:
      firstNumber(
        src.bah,
        src.BAH,
        src.bahMonthly,
        monthly.bah
      ),

    total:
      firstNumber(
        src.total,
        src.totalMonthly,
        src.total_monthly,
        monthly.total
      ),

    totalMonthly:
      firstNumber(
        src.totalMonthly,
        src.total_monthly,
        src.total,
        monthly.total
      ),

    total_monthly:
      firstNumber(
        src.total_monthly,
        src.totalMonthly,
        src.total,
        monthly.total
      ),


    // Veteran / retirement

    retirementPay:
      firstNumber(
        src.retirementPay,
        src.retirement_pay,
        monthly.retirement
      ),

    retirement_pay:
      firstNumber(
        src.retirement_pay,
        src.retirementPay,
        monthly.retirement
      ),

    disabilityPay:
      firstNumber(
        src.disabilityPay,
        src.disability_pay,
        src.va_disability_pay,
        monthly.vaDisability
      ),

    disability_pay:
      firstNumber(
        src.disability_pay,
        src.disabilityPay,
        src.va_disability_pay,
        monthly.vaDisability
      ),

    otherPay:
      firstNumber(
        src.otherPay,
        src.other_pay,
        src.special_pay
      ),

    other_pay:
      firstNumber(
        src.other_pay,
        src.otherPay,
        src.special_pay
      ),

    compensationAccuracy:
      src.compensationAccuracy ??
      src.accuracy ??
      null,

    retirementBaseMethod:
      src.retirementBaseMethod ??
      src.retirement_base_method ??
      null,

    headline:
      clean(
        src.headline
      ) ||
      null

  };


  return stripEmpty(
    packet
  );
}


// ============================================================
// //#7 MODULE DETECTORS + BUILDERS
// ============================================================


// ============================================================
// //#7A COMPENSATION
// ============================================================

function detectCompensationNeed(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );

  const reasons =
    [];

  let score =
    0;


  const message =
    lower(
      normalized.message
    );


  /*
    VA disability math questions belong to the VA Disability
    module, not the general military compensation module.

    A separate supplied compensation packet may still be present,
    but we do not route general compensation merely because the
    user asks how VA ratings combine.
  */

  const disabilityQuestion =
    VA_DISABILITY_MESSAGE_RE.test(
      message
    ) &&
    !VA_LOAN_EXPLICIT_RE.test(
      message
    );


  const hasCompensation =
    hasRecognizedCompensationFields(
      normalized.compensation
    );


  if (
    hasCompensation &&
    !disabilityQuestion
  ) {

    score +=
      60;

    reasons.push(
      "Calculated compensation context is present"
    );
  }


  if (
    message &&
    COMPENSATION_MESSAGE_RE.test(
      message
    ) &&
    !(
      disabilityQuestion &&
      !/\b(monthly|pay|compensation|how much|dollars?|rate)\b/i.test(
        message
      )
    )
  ) {

    score +=
      40;

    reasons.push(
      "Message asks about monthly income or military compensation"
    );
  }


  const matched =
    score >
    0;


  return {

    id:
      "compensation",

    matched,

    score:
      matched
        ? Math.max(
            score,
            1
          )
        : 0,

    reasons:
      uniqueArray(
        reasons
      )

  };
}


function buildCompensationTruth(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const requested =
    Boolean(
      clean(
        normalized.message
      )
    ) &&
    COMPENSATION_MESSAGE_RE.test(
      lower(
        normalized.message
      )
    );


  const hasCompensation =
    hasRecognizedCompensationFields(
      normalized.compensation
    );


  if (
    hasCompensation
  ) {

    return normalizeCompensationPacket(
      normalized.compensation
    );
  }


  if (
    requested
  ) {

    return {

      ok:
        false,

      partial:
        true,

      module:
        "compensation",

      source:
        "amy-brain supplied compensation context",

      calculated:
        false,

      warning:
        "Compensation was requested, but no calculated compensation context was available."

    };
  }


  return {

    ok:
      false,

    partial:
      true,

    module:
      "compensation",

    source:
      "amy-brain supplied compensation context",

    calculated:
      false,

    warning:
      "Compensation was requested, but no calculated compensation context was available."

  };
}


// ============================================================
// //#7B VA DISABILITY
// ============================================================

function detectVaDisabilityNeed(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const message =
    clean(
      normalized.message
    );


  const t =
    lower(
      message
    );


  const reasons =
    [];


  let score =
    0;


  const hasDisabilityContext =
    hasRecognizedDisabilityFields(
      normalized.disability
    );


  const explicitRatings =
    extractExplicitDisabilityRatings(
      message
    );


  const pagePath =
    lower(

      normalized.metadata?.page?.path ||

      normalized.metadata?.page?.pathname ||

      normalized.metadata?.page ||

      normalized.metadata?.product ||

      normalized.metadata?.widget?.product ||

      ""

    );


  const disabilityPageContext =
    /\b(disability|va[-_/ ]?rating|va[-_/ ]?disability)\b/i.test(
      pagePath
    );


  /*
    VA Loan language has priority over the generic word "VA".
  */

  const explicitVaLoan =
    VA_LOAN_EXPLICIT_RE.test(
      t
    );


  const disabilityLanguage =
    VA_DISABILITY_MESSAGE_RE.test(
      t
    ) ||
    VA_DISABILITY_ONLY_RE.test(
      t
    );


  const explanationLanguage =
    VA_DISABILITY_EXPLANATION_RE.test(
      t
    );


  const bilateralLanguage =
    VA_BILATERAL_RE.test(
      t
    );


  if (
    disabilityLanguage &&
    !explicitVaLoan
  ) {

    score +=
      80;

    reasons.push(
      "Message contains VA disability / combined-rating language"
    );
  }


  if (
    explicitRatings.length
  ) {

    score +=
      35;

    reasons.push(
      "Explicit VA disability percentage ratings are present in the message"
    );
  }


  if (
    hasDisabilityContext
  ) {

    score +=
      55;

    reasons.push(
      "VA Disability Calculator context is present"
    );
  }


  if (
    disabilityPageContext
  ) {

    score +=
      25;

    reasons.push(
      "Current page context appears VA-disability-specific"
    );
  }


  if (
    bilateralLanguage
  ) {

    score +=
      70;

    reasons.push(
      "Message asks about the VA bilateral factor"
    );
  }


  if (
    explanationLanguage &&
    hasDisabilityContext
  ) {

    score +=
      15;

    reasons.push(
      "User appears to be asking for explanation of the displayed VA disability result"
    );
  }


  /*
    Do not let an unrelated VA Loan question route here just
    because the calculator page has disability state loaded.
  */

  const matched =
    !explicitVaLoan &&
    (
      disabilityLanguage ||
      bilateralLanguage ||
      explicitRatings.length > 0 ||
      (
        hasDisabilityContext &&
        (
          explanationLanguage ||
          disabilityPageContext
        )
      )
    );


  return {

    id:
      "va_disability",

    matched,

    score:
      matched
        ? Math.max(
            score,
            1
          )
        : 0,

    reasons:
      matched
        ? uniqueArray(
            reasons
          )
        : []

  };
}


// ============================================================
// //#7B.1 GENERAL VA DISABILITY EDUCATION PACKET
// ============================================================

function buildGeneralVaDisabilityTruth(
  normalized
) {

  const message =
    clean(
      normalized.message
    );


  const bilateralRequested =
    VA_BILATERAL_RE.test(
      lower(message)
    );


  const warnings =
    [];


  const facts = [

    "Under 38 CFR § 4.25, multiple VA disability percentages are not simply added together.",

    "Disabilities are arranged from the most disabling condition to the least disabling condition before they are combined.",

    "Each additional disability is applied to the efficiency remaining after the disabilities already considered.",

    "Intermediate combined values are carried forward as whole-number Combined Ratings Table values.",

    "The final combined value is converted to the nearest number divisible by 10 only after all applicable disability ratings have been combined.",

    "A final combined value ending in 5 is adjusted upward."

  ];


  if (
    bilateralRequested
  ) {

    warnings.push(
      "The current disability-rating engine implements 38 CFR § 4.25 only. The bilateral factor under 38 CFR § 4.26 is not included."
    );
  }


  return {

    ok:
      true,

    partial:
      true,

    module:
      "va_disability",

    version:
      DISABILITY_RATING_VERSION,

    source:
      "38 CFR § 4.25 Combined Ratings Table",

    calculated:
      false,

    educationOnly:
      true,

    facts,

    warnings,

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
// //#7B.2 BUILD VA DISABILITY TRUTH
// ============================================================

function buildVaDisabilityTruth(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const suppliedContext =
    normalized.disability;


  const contextRatings =
    getDisabilityRatingsFromContext(
      suppliedContext
    );


  const messageRatings =
    extractExplicitDisabilityRatings(
      normalized.message
    );


  /*
    Calculator context is preferred.

    If the calculator supplied ratings, rerun those exact
    individual ratings through the shared deterministic engine.

    This allows the backend truth packet to be generated from the
    same rule engine regardless of what Amy says.
  */

  const ratings =
    contextRatings.length
      ? contextRatings
      : messageRatings;


  if (
    ratings.length
  ) {

    const calculated =
      buildDisabilityRatingPacket({

        ratings

      });


    /*
      Preserve supplemental browser state such as dependents or
      compensation. disability-rating.js intentionally does not
      calculate monthly compensation.
    */

    const supplied =
      normalizeSuppliedDisabilityPacket(
        suppliedContext
      );


    return stripEmpty({

      ...calculated,

      module:
        "va_disability",

      calculatorContext:
        contextRatings.length >
        0,

      messageRatingsUsed:
        contextRatings.length ===
        0 &&
        messageRatings.length >
        0,

      dependents:
        supplied.dependents,

      compensation:
        supplied.compensation,

      rateVersion:
        supplied.rateVersion,

      suppliedCombinedValue:
        supplied.combinedValue,

      suppliedOfficialRating:
        supplied.officialRating

    });
  }


  /*
    Sometimes the browser may send only displayed outputs and not
    individual ratings.

    Amy may explain those supplied values, but must not pretend
    Amy Brain recalculated them.
  */

  if (
    hasRecognizedDisabilityFields(
      suppliedContext
    )
  ) {

    const supplied =
      normalizeSuppliedDisabilityPacket(
        suppliedContext
      );


    return {

      ...supplied,

      warning:
        "VA Disability Calculator context was supplied without individual ratings, so Amy Brain did not recalculate the combined rating."

    };
  }


  /*
    General VA-rating educational question with no calculator
    state.
  */

  return buildGeneralVaDisabilityTruth(
    normalized
  );
}


// ============================================================
// //#7C VA LOANS
// ============================================================

function detectVaLoanNeed(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const message =
    clean(
      normalized.message
    );


  const t =
    lower(
      message
    );


  const reasons =
    [];


  let score =
    0;


  if (!t) {

    return {

      id:
        "va_loans",

      matched:
        false,

      score:
        0,

      reasons:
        []

    };
  }


  /*
    "VA disability compensation" alone is compensation /
    disability, not a VA home-loan question.
  */

  const disabilityOnly =

    (
      VA_DISABILITY_ONLY_RE.test(
        t
      ) ||
      VA_DISABILITY_MESSAGE_RE.test(
        t
      )
    ) &&

    !VA_LOAN_EXPLICIT_RE.test(
      t
    ) &&

    !/\b(mortgage|home loan|house|purchase|closing|appraisal|entitlement|funding fee|coe|zero down|no pmi)\b/i.test(
      t
    );


  if (
    disabilityOnly
  ) {

    return {

      id:
        "va_loans",

      matched:
        false,

      score:
        0,

      reasons:
        []

    };
  }


  const explicit =
    VA_LOAN_EXPLICIT_RE.test(
      t
    );


  const homeFinance =
    VA_HOME_FINANCE_RE.test(
      t
    );


  let intent =
    null;


  try {

    intent =
      detectVaLoanIntent(
        message
      );

  } catch (_) {

    intent =
      null;
  }


  if (
    explicit
  ) {

    score +=
      70;

    reasons.push(
      "Message contains VA Loan language"
    );
  }


  if (
    homeFinance &&
    intent
  ) {

    score +=
      explicit
        ? 10
        : 50;

    reasons.push(
      `VA Loan intent detected: ${clean(intent) || "overview"}`
    );
  }


  /*
    Require either explicit VA-loan terms or home-finance +
    intent signal.
  */

  const matched =

    explicit ||

    (
      homeFinance &&
      Boolean(intent) &&
      !disabilityOnly
    );


  return {

    id:
      "va_loans",

    matched,

    score:
      matched
        ? Math.max(
            score,
            1
          )
        : 0,

    reasons:
      matched
        ? uniqueArray(
            reasons
          )
        : []

  };
}


function buildVaLoansTruth(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  return buildVaLoanTruthPacket({

    message:
      normalized.message,

    profile:
      normalized.profile,

    scenario:
      normalized.scenario,

    compensation:
      normalized.compensation,

    mortgage:
      normalized.mortgage,

    affordability:
      normalized.affordability

  });
}


// ============================================================
// //#7D PT CALCULATOR
// ============================================================

function detectPtCalculatorNeed(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const reasons =
    [];


  let score =
    0;


  const hasPt =
    hasRecognizedPtFields(
      normalized.pt
    );


  const pagePath =
    lower(

      normalized.metadata?.page?.path ||

      normalized.metadata?.page ||

      normalized.metadata?.product ||

      ""

    );


  const ptPageContext =
    /pt|pfra|fitness/.test(
      pagePath
    );


  let intent =
    null;


  try {

    intent =
      detectPtCalculatorIntent(

        normalized.message,

        {

          hasPtData:
            hasPt ||
            ptPageContext,

          ptContext:
            ptPageContext

        }

      );

  } catch (_) {

    intent =
      null;
  }


  if (
    intent
  ) {

    score +=
      70;

    reasons.push(
      `PT Calculator intent detected: ${clean(intent)}`
    );
  }


  if (
    hasPt
  ) {

    score +=
      40;

    reasons.push(
      "PT/PFRA calculator context is present"
    );
  }


  if (
    ptPageContext &&
    !intent &&
    hasPt
  ) {

    score +=
      20;

    reasons.push(
      "Current page context appears PT-specific"
    );
  }


  const matched =

    Boolean(intent) ||

    (
      hasPt &&
      /\b(how did i do|my score|explain|pass|fail)\b/i.test(
        lower(
          normalized.message
        )
      )
    );


  return {

    id:
      "pt_calculator",

    matched,

    score:
      matched
        ? Math.max(
            score,
            1
          )
        : 0,

    reasons:
      matched
        ? uniqueArray(
            reasons
          )
        : []

  };
}


function buildPtCalculatorTruth(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  return buildPtCalculatorTruthPacket({

    message:
      normalized.message,

    profile:
      normalized.profile,

    pt:
      normalized.pt,

    scenario:
      normalized.scenario,

    metadata:
      normalized.metadata

  });
}


// ============================================================
// //#7E AIR FORCE FITNESS
// ============================================================

const AF_FITNESS_MESSAGE_RE =
  /\b(pt test|fitness test|fitness system|fitness program|air force fitness|af fitness|usaf fitness|pfra|physical fitness|pt score|fitness score|2[\s-]?mile|hamr|push[-\s]?ups?|hand[-\s]?release|sit[-\s]?ups?|plank|reverse crunch|body composition|whtr|waist[-\s]?to[-\s]?height|diagnostic (?:pfra|test)|af form 469|form 469|myfitness|fitness appeal|fitness assessment|fac\b|ufpm|ufac|fsq|2[\s-]?km walk|2[\s-]?kilometer walk|pfra hold|adaptive fitness|fitness reconditioning|afman\s*36-?2905)\b/i;


function detectAirForceFitnessNeed(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const message =
    clean(
      normalized.message
    );


  const t =
    lower(
      message
    );


  const reasons =
    [];


  let score =
    0;


  if (!t) {

    return {

      id:
        "air_force_fitness",

      matched:
        false,

      score:
        0,

      reasons:
        []

    };
  }


  let intent =
    null;


  try {

    intent =
      detectAfFitnessIntent(
        message
      );

  } catch (_) {

    intent =
      null;
  }


  const explicit =
    AF_FITNESS_MESSAGE_RE.test(
      t
    );


  const hasPt =
    hasRecognizedPtFields(
      normalized.pt
    );


  const pagePath =
    lower(

      normalized.metadata?.page?.path ||

      normalized.metadata?.page ||

      normalized.metadata?.product ||

      ""

    );


  const fitnessPage =
    /pt|pfra|fitness/.test(
      pagePath
    );


  if (
    explicit
  ) {

    score +=
      65;

    reasons.push(
      "Message contains Air Force fitness / PFRA language"
    );
  }


  if (
    intent &&
    intent !==
      "overview"
  ) {

    score +=
      explicit
        ? 20
        : 55;

    reasons.push(
      `AF fitness intent detected: ${clean(intent)}`
    );

  } else if (
    intent ===
      "overview" &&
    explicit
  ) {

    score +=
      15;

    reasons.push(
      "AF fitness overview intent detected"
    );
  }


  if (
    hasPt &&
    explicit
  ) {

    score +=
      15;

    reasons.push(
      "PT score snapshot context is present"
    );
  }


  if (
    fitnessPage &&
    explicit
  ) {

    score +=
      10;

    reasons.push(
      "Page context appears fitness-related"
    );
  }


  const matched =

    explicit ||

    (
      Boolean(intent) &&
      intent !==
        "overview"
    ) ||

    (
      hasPt &&
      /\b(how did i do|my score|explain|pass|fail|excellent|satisfactory|unsatisfactory)\b/i.test(
        t
      )
    );


  return {

    id:
      "air_force_fitness",

    matched,

    score:
      matched
        ? Math.max(
            score,
            1
          )
        : 0,

    reasons:
      matched
        ? uniqueArray(
            reasons
          )
        : []

  };
}


function buildAirForceFitnessTruth(
  input
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  return buildAfFitnessTruthPacket({

    message:
      normalized.message,

    profile:
      normalized.profile,

    context: {

      ptScore:
        normalized.pt,

      pt_score:
        normalized.pt,

      fitness:
        normalized.pt,

      page:
        normalized.metadata?.page ||
        null,

      widget:
        normalized.metadata?.widget ||
        null

    },

    ptScore:
      normalized.pt,

    page:
      normalized.metadata?.page ||
      null,

    widget:
      normalized.metadata?.widget ||
      null

  });
}


// ============================================================
// //#8 MODULE REGISTRY
// ============================================================

const compensationModule =
  Object.freeze({

    id:
      "compensation",

    version:
      "context-only-v1",

    description:
      "Exposes supplied military compensation context without calculating pay.",

    priority:
      100,

    detect(input) {

      return detectCompensationNeed(
        input
      );
    },

    build(input) {

      return buildCompensationTruth(
        input
      );
    }

  });


// ============================================================
// VA DISABILITY MODULE
// ============================================================
//
// Priority intentionally exceeds VA Loans/PT so a clear VA
// disability combined-rating question routes to this module first.
//
// Multiple modules may still match when appropriate.
// ============================================================

const vaDisabilityModule =
  Object.freeze({

    id:
      "va_disability",

    version:
      DISABILITY_RATING_VERSION,

    description:
      "Routes VA disability combined-rating questions through disability-rating.js using 38 CFR § 4.25.",

    priority:
      95,

    detect(input) {

      return detectVaDisabilityNeed(
        input
      );
    },

    build(input) {

      return buildVaDisabilityTruth(
        input
      );
    }

  });


const vaLoansModule =
  Object.freeze({

    id:
      "va_loans",

    version:
      VA_LOANS_VERSION,

    description:
      "Routes VA Loan education and scenario packets through va-loans.js.",

    priority:
      80,

    detect(input) {

      return detectVaLoanNeed(
        input
      );
    },

    build(input) {

      return buildVaLoansTruth(
        input
      );
    }

  });


const ptCalculatorModule =
  Object.freeze({

    id:
      "pt_calculator",

    version:
      PT_CALCULATOR_VERSION,

    description:
      "Routes USAF PFRA/PT scoring and explanation through pt-calculator.js.",

    priority:
      85,

    detect(input) {

      return detectPtCalculatorNeed(
        input
      );
    },

    build(input) {

      return buildPtCalculatorTruth(
        input
      );
    }

  });


const airForceFitnessModule =
  Object.freeze({

    id:
      "air_force_fitness",

    version:
      AF_FITNESS_VERSION,

    description:
      "Routes AFMAN 36-2905 Physical Fitness Readiness Program guidance through af-fitness.js.",

    priority:
      83,

    detect(input) {

      return detectAirForceFitnessNeed(
        input
      );
    },

    build(input) {

      return buildAirForceFitnessTruth(
        input
      );
    }

  });


export const AMY_BRAIN_MODULES =
  Object.freeze({

    compensation:
      compensationModule,

    va_disability:
      vaDisabilityModule,

    va_loans:
      vaLoansModule,

    pt_calculator:
      ptCalculatorModule,

    air_force_fitness:
      airForceFitnessModule

  });


function listRegistryModules() {

  return Object.values(
    AMY_BRAIN_MODULES
  )
    .slice()
    .sort(
      (
        a,
        b
      ) => {

        if (
          b.priority !==
          a.priority
        ) {

          return (
            b.priority -
            a.priority
          );
        }

        return clean(
          a.id
        ).localeCompare(
          clean(
            b.id
          )
        );
      }
    );
}


// ============================================================
// //#9 DETECT / ROUTE / BUILD
// ============================================================

export function detectAmyKnowledgeNeeds(
  input = {}
) {

  const matches =
    [];


  for (
    const module
    of listRegistryModules()
  ) {

    let result;


    try {

      result =
        module.detect(
          input
        );

    } catch (_) {

      continue;
    }


    if (
      !result ||
      typeof result !==
        "object"
    ) {

      continue;
    }


    if (
      !result.matched
    ) {

      continue;
    }


    matches.push({

      id:
        clean(
          result.id
        ) ||
        module.id,

      matched:
        true,

      score:
        Number.isFinite(
          Number(
            result.score
          )
        )
          ? Number(
              result.score
            )
          : Number(
              module.priority
            ) ||
            0,

      reasons:
        uniqueArray(
          result.reasons
        )

    });
  }


  matches.sort(
    (
      a,
      b
    ) => {

      if (
        b.score !==
        a.score
      ) {

        return (
          b.score -
          a.score
        );
      }


      const aPriority =
        Number(
          AMY_BRAIN_MODULES[
            a.id
          ]?.priority
        ) ||
        0;


      const bPriority =
        Number(
          AMY_BRAIN_MODULES[
            b.id
          ]?.priority
        ) ||
        0;


      if (
        bPriority !==
        aPriority
      ) {

        return (
          bPriority -
          aPriority
        );
      }


      return clean(
        a.id
      ).localeCompare(
        clean(
          b.id
        )
      );
    }
  );


  return matches;
}


export async function routeAmyKnowledge(
  input = {}
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const matches =
    detectAmyKnowledgeNeeds(
      normalized
    );


  const packets =
    {};


  const errors =
    [];


  const warnings =
    [];


  for (
    const match
    of matches
  ) {

    const module =
      AMY_BRAIN_MODULES[
        match.id
      ];


    if (
      !module ||
      typeof module.build !==
        "function"
    ) {

      errors.push({

        module:
          match.id,

        message:
          "Registered knowledge module is unavailable."

      });

      continue;
    }


    try {

      const packet =
        await Promise.resolve(
          module.build(
            normalized
          )
        );


      if (
        packet &&
        typeof packet ===
          "object"
      ) {

        packets[
          match.id
        ] =
          packet;


        if (
          packet.warning
        ) {

          warnings.push(
            clean(
              packet.warning
            )
          );
        }


        if (
          Array.isArray(
            packet.warnings
          ) &&
          packet.warnings.length
        ) {

          warnings.push(

            ...packet.warnings
              .map(
                (
                  warning
                ) =>
                  clean(
                    warning
                  )
              )
              .filter(
                Boolean
              )

          );
        }
      }

    } catch (
      err
    ) {

      errors.push({

        module:
          match.id,

        message:
          clean(
            err?.message
          ) ||
          "Knowledge module failed."

      });
    }
  }


  if (
    !matches.length
  ) {

    warnings.push(
      "No deterministic knowledge module matched this request."
    );
  }


  return {

    ok:
      true,

    version:
      AMY_BRAIN_VERSION,

    message:
      normalized.message,

    matched_modules:
      matches.map(
        (
          match
        ) =>
          match.id
      ),

    matches,

    packets,

    errors,

    warnings:
      uniqueArray(
        warnings
      ),

    source:
      "TheWing amy-brain.js"

  };
}


// ============================================================
// //#10 UNIFIED PACKET HELPERS
// ============================================================

function pushCompensationFact(
  facts,
  label,
  value
) {

  const display =
    money(
      value
    );


  if (!display) {
    return;
  }


  facts.push(
    `${label}: ${display} per month.`
  );
}


// ============================================================
// //#10A VA DISABILITY COMBINED FACTS
// ============================================================

function pushVaDisabilityFacts(
  packet,
  {
    bluf,
    facts,
    warnings,
    disclaimers
  }
) {

  if (
    !isPlainObject(
      packet
    )
  ) {

    return;
  }


  const combinedValue =
    firstNumber(

      packet.combinedValue,
      packet.combined_value

    );


  const officialRating =
    firstNumber(

      packet.officialRating,
      packet.official_rating

    );


  const highestRating =
    firstNumber(

      packet.highestRating,
      packet.highest_rating

    );


  const remainingEfficiency =
    firstNumber(

      packet.remainingEfficiency,
      packet.remaining_efficiency

    );


  if (
    Number.isFinite(
      combinedValue
    ) &&
    Number.isFinite(
      officialRating
    )
  ) {

    bluf.push(
      `VA combined value: ${combinedValue}%. Estimated official schedular rating after § 4.25 final rounding: ${officialRating}%.`
    );

  } else if (
    Number.isFinite(
      officialRating
    )
  ) {

    bluf.push(
      `Estimated official VA disability rating in the supplied calculator context: ${officialRating}%.`
    );
  }


  if (
    Number.isFinite(
      highestRating
    )
  ) {

    facts.push(
      `Highest individual VA disability rating: ${highestRating}%.`
    );
  }


  if (
    Number.isFinite(
      combinedValue
    )
  ) {

    facts.push(
      `VA combined value before final nearest-10 rounding: ${combinedValue}%.`
    );
  }


  if (
    Number.isFinite(
      officialRating
    )
  ) {

    facts.push(
      `Official schedular percentage represented by the § 4.25 final rounding step: ${officialRating}%.`
    );
  }


  if (
    Number.isFinite(
      remainingEfficiency
    )
  ) {

    facts.push(
      `Remaining whole-person efficiency after the combined value: ${remainingEfficiency}%.`
    );
  }


  /*
    Explain every deterministic step.
  */

  if (
    Array.isArray(
      packet.steps
    )
  ) {

    for (
      const step
      of packet.steps
    ) {

      if (
        !isPlainObject(
          step
        )
      ) {

        continue;
      }


      const rating =
        firstNumber(
          step.rating
        );


      const previous =
        firstNumber(
          step.previousCombined,
          step.previous_combined
        );


      const contribution =
        firstNumber(
          step.contribution
        );


      const combined =
        firstNumber(
          step.combined
        );


      const remainingBefore =
        firstNumber(
          step.remainingBefore,
          step.remaining_before
        );


      const remainingAfter =
        firstNumber(
          step.remainingAfter,
          step.remaining_after
        );


      if (
        step.type ===
          "initial_rating" ||
        previous ===
          0
      ) {

        if (
          Number.isFinite(
            rating
          ) &&
          Number.isFinite(
            remainingAfter
          )
        ) {

          facts.push(
            `The § 4.25 calculation begins with the ${rating}% disability, leaving ${remainingAfter}% efficiency remaining.`
          );
        }

        continue;
      }


      if (
        Number.isFinite(
          rating
        ) &&
        Number.isFinite(
          remainingBefore
        ) &&
        Number.isFinite(
          contribution
        ) &&
        Number.isFinite(
          previous
        ) &&
        Number.isFinite(
          combined
        )
      ) {

        facts.push(
          `The ${rating}% disability is applied to the ${remainingBefore}% efficiency remaining; its whole-number contribution is ${contribution} points, increasing the combined value from ${previous}% to ${combined}%.`
        );

      } else if (
        Number.isFinite(
          rating
        ) &&
        Number.isFinite(
          combined
        )
      ) {

        facts.push(
          `After applying the ${rating}% disability, the combined value is ${combined}%.`
        );
      }
    }
  }


  /*
    General educational facts supplied directly by the module.
  */

  if (
    Array.isArray(
      packet.facts
    )
  ) {

    for (
      const fact
      of packet.facts
    ) {

      if (
        clean(
          fact
        )
      ) {

        facts.push(
          clean(
            fact
          )
        );
      }
    }
  }


  /*
    Browser-side standard VA compensation can be included in the
    calculator state.

    Amy Brain does not calculate it here.
  */

  if (
    isPlainObject(
      packet.compensation
    )
  ) {

    const monthlyVA =
      firstNumber(

        packet.compensation.monthlyVA,
        packet.compensation.monthly_va,
        packet.compensation.va,
        packet.compensation.amount

      );


    const rateVersion =
      clean(

        packet.rateVersion ||
        packet.rate_version ||
        packet.compensation.rateVersion ||
        packet.compensation.rate_version

      );


    if (
      Number.isFinite(
        monthlyVA
      )
    ) {

      const display =
        money(
          monthlyVA
        );


      if (
        display
      ) {

        facts.push(
          `Displayed estimated standard VA disability compensation: ${display} per month${rateVersion ? ` (${rateVersion})` : ""}.`
        );
      }
    }
  }


  if (
    packet.warning
  ) {

    warnings.push(
      clean(
        packet.warning
      )
    );
  }


  if (
    Array.isArray(
      packet.warnings
    )
  ) {

    for (
      const warning
      of packet.warnings
    ) {

      if (
        clean(
          warning
        )
      ) {

        warnings.push(
          clean(
            warning
          )
        );
      }
    }
  }


  /*
    Preserve explicit limitation from disability-rating.js.
  */

  if (
    packet.limitations?.bilateralFactorIncluded ===
    false
  ) {

    warnings.push(
      "The current combined-rating calculation does not include the 38 CFR § 4.26 bilateral factor."
    );
  }


  disclaimers.push(
    "The VA disability calculator is an educational planning tool and does not constitute an official Department of Veterans Affairs rating decision."
  );
}


// ============================================================
// //#11 COMBINE TRUTH PACKETS
// ============================================================

function combineTruthPackets(
  packets = {},
  routeWarnings = []
) {

  const bluf =
    [];

  const facts =
    [];

  const risks =
    [];

  const next_steps =
    [];

  const warnings =
    [];

  const disclaimers =
    [];


  // ==========================================================
  // COMPENSATION
  // ==========================================================

  const compensation =
    packets.compensation;


  if (
    isPlainObject(
      compensation
    )
  ) {

    if (
      compensation.warning
    ) {

      warnings.push(
        clean(
          compensation.warning
        )
      );
    }


    if (
      compensation.ok !==
      false
    ) {

      pushCompensationFact(

        facts,

        "Base pay",

        firstNumber(
          compensation.basePay,
          compensation.base_pay
        )

      );


      pushCompensationFact(
        facts,
        "BAS",
        compensation.bas
      );


      pushCompensationFact(
        facts,
        "BAH",
        compensation.bah
      );


      pushCompensationFact(

        facts,

        "Retirement pay",

        firstNumber(
          compensation.retirementPay,
          compensation.retirement_pay
        )

      );


      pushCompensationFact(

        facts,

        "VA disability pay",

        firstNumber(
          compensation.disabilityPay,
          compensation.disability_pay
        )

      );


      pushCompensationFact(

        facts,

        "Other pay",

        firstNumber(
          compensation.otherPay,
          compensation.other_pay
        )

      );


      pushCompensationFact(

        facts,

        "Total monthly compensation",

        firstNumber(

          compensation.total_monthly,
          compensation.totalMonthly,
          compensation.total

        )

      );


      if (
        clean(
          compensation.headline
        )
      ) {

        facts.push(
          clean(
            compensation.headline
          )
        );
      }
    }
  }


  // ==========================================================
  // VA DISABILITY
  // ==========================================================

  const vaDisability =
    packets.va_disability;


  if (
    isPlainObject(
      vaDisability
    )
  ) {

    pushVaDisabilityFacts(

      vaDisability,

      {
        bluf,
        facts,
        warnings,
        disclaimers
      }

    );
  }


  // ==========================================================
  // VA LOANS
  // ==========================================================

  const va =
    packets.va_loans;


  if (
    isPlainObject(
      va
    )
  ) {

    if (
      clean(
        va.bluf
      )
    ) {

      bluf.push(
        clean(
          va.bluf
        )
      );
    }


    const guidance =
      isPlainObject(
        va.guidance
      )
        ? va.guidance
        : {};


    if (
      Array.isArray(
        guidance.key_points
      )
    ) {

      for (
        const point
        of guidance.key_points
      ) {

        if (
          clean(
            point
          )
        ) {

          facts.push(
            clean(
              point
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.risks
      )
    ) {

      for (
        const risk
        of guidance.risks
      ) {

        if (
          clean(
            risk
          )
        ) {

          risks.push(
            clean(
              risk
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.next_steps
      )
    ) {

      for (
        const step
        of guidance.next_steps
      ) {

        if (
          clean(
            step
          )
        ) {

          next_steps.push(
            clean(
              step
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.disclaimers
      )
    ) {

      for (
        const disclaimer
        of guidance.disclaimers
      ) {

        if (
          clean(
            disclaimer
          )
        ) {

          disclaimers.push(
            clean(
              disclaimer
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        va.warnings
      )
    ) {

      for (
        const warning
        of va.warnings
      ) {

        if (
          clean(
            warning
          )
        ) {

          warnings.push(
            clean(
              warning
            )
          );
        }
      }
    }
  }


  // ==========================================================
  // PT CALCULATOR
  // ==========================================================

  const pt =
    packets.pt_calculator;


  if (
    isPlainObject(
      pt
    )
  ) {

    const guidance =
      isPlainObject(
        pt.guidance
      )
        ? pt.guidance
        : {};


    if (
      clean(
        guidance.bluf
      )
    ) {

      bluf.push(
        clean(
          guidance.bluf
        )
      );

    } else if (
      clean(
        pt.bluf
      )
    ) {

      bluf.push(
        clean(
          pt.bluf
        )
      );
    }


    if (
      Number.isFinite(
        Number(
          pt.total_score
        )
      )
    ) {

      facts.push(

        `USAF PFRA total score: ${Number(
          pt.total_score
        ).toFixed(1)}${
          clean(
            pt.rating
          )
            ? ` (${clean(pt.rating)})`
            : ""
        }.`

      );
    }


    const scores =
      isPlainObject(
        pt.component_scores
      )
        ? pt.component_scores
        : {};


    if (
      Object.keys(
        scores
      ).length
    ) {

      facts.push(

        `PT components — Body composition: ${
          scores.body_composition ??
          "n/a"
        }, Strength: ${
          scores.strength ??
          "n/a"
        }, Core: ${
          scores.core ??
          "n/a"
        }, Cardio: ${
          scores.cardio ??
          "n/a"
        }.`

      );
    }


    if (
      pt.component_minimums_met ===
        true ||
      pt.component_minimums_met ===
        false
    ) {

      facts.push(

        `PT component minimums met: ${
          pt.component_minimums_met
            ? "yes"
            : "no"
        }.`

      );
    }


    if (
      pt.overall_pass ===
        true ||
      pt.overall_pass ===
        false
    ) {

      facts.push(

        `PT overall pass: ${
          pt.overall_pass
            ? "yes"
            : "no"
        }.`

      );
    }


    if (
      Number.isFinite(
        Number(
          pt.measurements?.whtr
        )
      )
    ) {

      facts.push(

        `WHtR: ${Number(
          pt.measurements.whtr
        ).toFixed(2)}${
          clean(
            pt.measurements.whtr_risk
          )
            ? ` (${clean(
                pt.measurements.whtr_risk
              )})`
            : ""
        }.`

      );
    }


    if (
      Array.isArray(
        guidance.facts
      )
    ) {

      for (
        const fact
        of guidance.facts
      ) {

        if (
          clean(
            fact
          )
        ) {

          facts.push(
            clean(
              fact
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.risks
      )
    ) {

      for (
        const risk
        of guidance.risks
      ) {

        if (
          clean(
            risk
          )
        ) {

          risks.push(
            clean(
              risk
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.next_steps
      )
    ) {

      for (
        const step
        of guidance.next_steps
      ) {

        if (
          clean(
            step
          )
        ) {

          next_steps.push(
            clean(
              step
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.disclaimers
      )
    ) {

      for (
        const disclaimer
        of guidance.disclaimers
      ) {

        if (
          clean(
            disclaimer
          )
        ) {

          disclaimers.push(
            clean(
              disclaimer
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        pt.warnings
      )
    ) {

      for (
        const warning
        of pt.warnings
      ) {

        if (
          clean(
            warning
          )
        ) {

          warnings.push(
            clean(
              warning
            )
          );
        }
      }
    }
  }


  // ==========================================================
  // AIR FORCE FITNESS
  // ==========================================================

  const fitness =
    packets.air_force_fitness;


  if (
    isPlainObject(
      fitness
    )
  ) {

    if (
      clean(
        fitness.bluf
      )
    ) {

      bluf.push(
        clean(
          fitness.bluf
        )
      );
    }


    const guidance =
      isPlainObject(
        fitness.guidance
      )
        ? fitness.guidance
        : {};


    if (
      Array.isArray(
        guidance.key_points
      )
    ) {

      for (
        const point
        of guidance.key_points
      ) {

        if (
          clean(
            point
          )
        ) {

          facts.push(
            clean(
              point
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.cautions
      )
    ) {

      for (
        const caution
        of guidance.cautions
      ) {

        if (
          clean(
            caution
          )
        ) {

          risks.push(
            clean(
              caution
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.next_steps
      )
    ) {

      for (
        const step
        of guidance.next_steps
      ) {

        if (
          clean(
            step
          )
        ) {

          next_steps.push(
            clean(
              step
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        guidance.disclaimers
      )
    ) {

      for (
        const disclaimer
        of guidance.disclaimers
      ) {

        if (
          clean(
            disclaimer
          )
        ) {

          disclaimers.push(
            clean(
              disclaimer
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        fitness.disclaimers
      )
    ) {

      for (
        const disclaimer
        of fitness.disclaimers
      ) {

        if (
          clean(
            disclaimer
          )
        ) {

          disclaimers.push(
            clean(
              disclaimer
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        fitness.warnings
      )
    ) {

      for (
        const warning
        of fitness.warnings
      ) {

        if (
          clean(
            warning
          )
        ) {

          warnings.push(
            clean(
              warning
            )
          );
        }
      }
    }


    if (
      Array.isArray(
        fitness.references
      )
    ) {

      for (
        const ref
        of fitness.references
      ) {

        if (
          isPlainObject(
            ref
          ) &&
          clean(
            ref.section
          )
        ) {

          facts.push(

            `AFMAN 36-2905 reference: ${clean(
              ref.section
            )}${
              clean(
                ref.title
              )
                ? ` (${clean(ref.title)})`
                : ""
            }.`

          );
        }
      }
    }
  }


  // ==========================================================
  // ROUTER WARNINGS
  // ==========================================================

  if (
    Array.isArray(
      routeWarnings
    )
  ) {

    for (
      const warning
      of routeWarnings
    ) {

      if (
        clean(
          warning
        )
      ) {

        warnings.push(
          clean(
            warning
          )
        );
      }
    }
  }


  return {

    bluf:
      uniqueArray(
        bluf
      ),

    facts:
      uniqueArray(
        facts
      ),

    risks:
      uniqueArray(
        risks
      ),

    next_steps:
      uniqueArray(
        next_steps
      ),

    warnings:
      uniqueArray(
        warnings
      ),

    disclaimers:
      uniqueArray(
        disclaimers
      )

  };
}


// ============================================================
// //#12 BUILD AMY TRUTH PACKET
// ============================================================

export async function buildAmyTruthPacket(
  input = {}
) {

  const normalized =
    normalizeAmyBrainInput(
      input
    );


  const routed =
    await routeAmyKnowledge(
      normalized
    );


  return {

    ok:
      true,

    version:
      AMY_BRAIN_VERSION,

    request: {

      message:
        normalized.message,

      mode:
        clean(
          normalized.profile.mode
        ) ||
        clean(
          normalized.metadata.mode
        ) ||
        null,

      has_profile:
        Object.keys(
          normalized.profile
        ).length >
        0,

      has_compensation:
        hasRecognizedCompensationFields(
          normalized.compensation
        ),

      has_mortgage:
        Object.keys(
          normalized.mortgage
        ).length >
        0,

      has_affordability:
        Object.keys(
          normalized.affordability
        ).length >
        0,

      has_pt:
        hasRecognizedPtFields(
          normalized.pt
        ),

      has_va_disability:
        hasRecognizedDisabilityFields(
          normalized.disability
        )

    },


    routing: {

      matched_modules:
        routed.matched_modules,

      matches:
        routed.matches

    },


    truth:
      routed.packets,


    combined:
      combineTruthPackets(

        routed.packets,

        routed.warnings

      ),


    errors:
      Array.isArray(
        routed.errors
      )
        ? routed.errors
        : [],


    source:
      "TheWing amy-brain.js"

  };
}


// ============================================================
// //#13 DEFAULT EXPORT
// ============================================================

export default Object.freeze({

  AMY_BRAIN_VERSION,

  AMY_BRAIN_MODULES,

  detectAmyKnowledgeNeeds,

  routeAmyKnowledge,

  buildAmyTruthPacket

});
