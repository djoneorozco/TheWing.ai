/* ============================================================
  THEWING.AI • ASK AMY DISABILITY SERVER
  Disability-Calculator/ask-amy-disability-server.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Dedicated server-side Amy for the VA Disability Rating
  Calculator.

  ARCHITECTURE
  -------------------------------------------------------------
  VA Disability Calculator
        ↓
  window.THEWING_DISABILITY.getState()
        ↓
  ask-amy-disability.js
        ↓
  /.netlify/functions/ask-amy-disability
        ↓
  THIS FILE
        ↓
  OpenAI
        ↓
  Amy explains

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing calculates. Amy explains.

  IMPORTANT
  -------------------------------------------------------------
  This file DOES NOT:
  - calculate VA combined ratings
  - calculate 38 CFR § 4.25 whole-person math
  - independently combine disability percentages
  - independently round the final VA rating
  - calculate 38 CFR § 4.26 bilateral factor
  - calculate SMC
  - calculate spouse Aid & Attendance
  - calculate DIC
  - calculate retroactive compensation
  - calculate effective dates
  - calculate retirement pay offsets
  - determine service connection
  - determine claim eligibility
  - diagnose medical conditions
  - access Supabase
  - access member accounts
  - access PCSUnited
  - use BasicBrain
  - use mortgage engines
  - use retirement engines
  - use PT engines
  - use WAPS engines
  - use agent-amy-public.js
  - use amy-brain.js
  - use amy-concierge.js

  The supplied Disability Calculator state is authoritative.

  CURRENT CALCULATOR LIMITS
  -------------------------------------------------------------
  - 38 CFR § 4.25 combined-rating calculation IS supported.
  - 38 CFR § 4.26 bilateral-factor calculation IS NOT supported.
  - Standard monthly VA disability compensation IS supported.
  - SMC, spouse A&A, DIC, retirement offsets, retro pay,
    effective-date calculations, and claim adjudication are
    outside this calculator.
============================================================ */


/* ============================================================
  1. CONFIG
============================================================ */

const VERSION =
  "ask-amy-disability-server-1.0.0";

const RESPONSE_CONTRACT_VERSION =
  "ask-amy-disability-response-v1";

const SCOPE =
  "disability_calculator";

const DISPLAY_NAME =
  "Amy — Disability Concierge";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  "";

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";

const MAX_MESSAGE_LENGTH =
  5000;

const MAX_THREAD_MESSAGES =
  12;

const MAX_THREAD_MESSAGE_LENGTH =
  5000;

const MAX_MEMORY_KEYS =
  20;

const MAX_MEMORY_STRING_LENGTH =
  500;

const MAX_RATINGS =
  20;

const MAX_STEPS =
  20;

const DEFAULT_MAX_REPLY_CHARS =
  1100;

const DEFAULT_GREETING_MAX_CHARS =
  320;

const DEFAULT_MAX_FOLLOW_UP_QUESTIONS =
  1;

const MIN_REPLY_CHARS =
  240;

const MAX_REPLY_CHARS =
  1600;

const OPENAI_TIMEOUT_MS =
  25000;


/* ============================================================
  2. DISABILITY INTENTS
============================================================ */

const INTENTS =
  Object.freeze({

    GREETING:
      "greeting",

    CAPABILITIES:
      "capabilities",

    EXPLAIN_ESTIMATE:
      "explain_estimate",

    COMBINED_RATING:
      "combined_rating",

    WHOLE_PERSON:
      "whole_person",

    RATING_STEPS:
      "rating_steps",

    FINAL_ROUNDING:
      "final_rounding",

    COMPENSATION:
      "compensation",

    DEPENDENTS:
      "dependents",

    BILATERAL_FACTOR:
      "bilateral_factor",

    DISABILITY_CONCEPT:
      "disability_concept",

    OUT_OF_SCOPE:
      "out_of_scope"

  });


/* ============================================================
  3. GENERIC HELPERS
============================================================ */

function clean(
  value
) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


function lower(
  value
) {

  return clean(
    value
  ).toLowerCase();

}


function isPlainObject(
  value
) {

  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
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


function boolOrNull(
  value
) {

  if (
    value === true ||
    value === false
  ) {

    return value;

  }

  return null;

}


function clamp(
  value,
  min,
  max
) {

  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {

    return null;

  }

  return Math.max(
    min,
    Math.min(
      max,
      number
    )
  );

}


function safeJsonParse(
  value,
  fallback = null
) {

  try {

    return JSON.parse(
      value
    );

  } catch (_) {

    return fallback;

  }

}


function clone(
  value,
  fallback = null
) {

  try {

    return JSON.parse(
      JSON.stringify(
        value
      )
    );

  } catch (_) {

    return fallback;

  }

}


function stripEmpty(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        stripEmpty
      )
      .filter(
        item =>
          item !== undefined &&
          item !== null
      );

  }

  if (
    !isPlainObject(
      value
    )
  ) {

    return value;

  }

  const output =
    {};

  for (
    const [
      key,
      nested
    ]
    of Object.entries(
      value
    )
  ) {

    if (
      nested === undefined ||
      nested === null ||
      nested === ""
    ) {

      continue;

    }

    if (
      Array.isArray(
        nested
      )
    ) {

      const array =
        nested
          .map(
            stripEmpty
          )
          .filter(
            item =>
              item !== undefined &&
              item !== null
          );

      if (
        array.length
      ) {

        output[
          key
        ] =
          array;

      }

      continue;

    }

    if (
      isPlainObject(
        nested
      )
    ) {

      const object =
        stripEmpty(
          nested
        );

      if (
        Object.keys(
          object
        ).length
      ) {

        output[
          key
        ] =
          object;

      }

      continue;

    }

    output[
      key
    ] =
      nested;

  }

  return output;

}


function money(
  value
) {

  const number =
    finiteNumber(
      value
    );

  if (
    number === null
  ) {

    return "";

  }

  return (
    "$" +
    Math.round(
      number
    ).toLocaleString(
      "en-US"
    )
  );

}


function money2(
  value
) {

  const number =
    finiteNumber(
      value
    );

  if (
    number === null
  ) {

    return "";

  }

  return (
    "$" +
    number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    )
  );

}


function percent(
  value
) {

  const number =
    finiteNumber(
      value
    );

  if (
    number === null
  ) {

    return "";

  }

  return (
    number.toLocaleString(
      "en-US",
      {
        maximumFractionDigits:
          2
      }
    ) +
    "%"
  );

}


function numericPercent(
  value
) {

  const number =
    finiteNumber(
      value
    );

  return number ===
    null
    ? ""
    : `${number}%`;

}


function validRating(
  value
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

  if (
    number < 0 ||
    number > 100
  ) {

    return null;

  }

  return number;

}


/* ============================================================
  4. CORS / HTTP
============================================================ */

function resolveAllowedOrigin(
  event
) {

  const origin =
    clean(
      event
        ?.headers
        ?.origin ||
      event
        ?.headers
        ?.Origin
    );

  if (
    !origin
  ) {

    return "*";

  }

  try {

    const url =
      new URL(
        origin
      );

    const hostname =
      lower(
        url.hostname
      );

    if (
      hostname ===
        "thewing.ai" ||

      hostname ===
        "www.thewing.ai" ||

      hostname.endsWith(
        ".thewing.ai"
      ) ||

      hostname.endsWith(
        ".webflow.io"
      ) ||

      hostname.endsWith(
        ".netlify.app"
      ) ||

      hostname ===
        "localhost" ||

      hostname ===
        "127.0.0.1"
    ) {

      return origin;

    }

  } catch (_) {

    /* Ignore malformed origin */

  }

  return (
    "https://thewing.ai"
  );

}


function corsHeaders(
  event
) {

  return {

    "Access-Control-Allow-Origin":
      resolveAllowedOrigin(
        event
      ),

    "Access-Control-Allow-Headers":
      "Content-Type, X-TheWing-Client",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Max-Age":
      "86400",

    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    "Vary":
      "Origin"

  };

}


function respond(
  event,
  statusCode,
  payload
) {

  return {

    statusCode,

    headers:
      corsHeaders(
        event
      ),

    body:
      JSON.stringify(
        payload
      )

  };

}


function respondError(
  event,
  statusCode,
  error,
  code,
  conversationId = null
) {

  return respond(
    event,
    statusCode,
    {

      ok:
        false,

      error:
        clean(
          error
        ) ||
        "Ask Amy Disability could not complete the request.",

      code:
        clean(
          code
        ) ||
        "REQUEST_FAILED",

      scope:
        SCOPE,

      conversation_id:
        conversationId ||
        null

    }
  );

}


/* ============================================================
  5. REQUEST PARSING
============================================================ */

function parseRequestBody(
  event
) {

  if (
    !event
  ) {

    return {};

  }

  if (
    isPlainObject(
      event.body
    )
  ) {

    return event.body;

  }

  const raw =
    clean(
      event.body
    );

  if (
    !raw
  ) {

    return {};

  }

  if (
    event.isBase64Encoded ===
      true
  ) {

    try {

      return (
        safeJsonParse(
          Buffer
            .from(
              raw,
              "base64"
            )
            .toString(
              "utf8"
            ),
          {}
        ) ||
        {}
      );

    } catch (_) {

      return {};

    }

  }

  return (
    safeJsonParse(
      raw,
      {}
    ) ||
    {}
  );

}


/* ============================================================
  6. DISABILITY SNAPSHOT SANITIZER

  IMPORTANT
  -------------------------------------------------------------
  Do not pass arbitrary browser state blindly into OpenAI.

  Preserve only the deterministic Disability Calculator fields
  required to explain the current result.

  The actual calculator remains the source of truth.
============================================================ */

function sanitizeRatingArray(
  raw
) {

  if (
    !Array.isArray(
      raw
    )
  ) {

    return [];

  }

  return raw
    .slice(
      0,
      MAX_RATINGS
    )
    .map(
      validRating
    )
    .filter(
      value =>
        value !== null
    );

}


function sanitizeRatingEntry(
  raw
) {

  if (
    !isPlainObject(
      raw
    )
  ) {

    return null;

  }

  return stripEmpty({

    sourceIndex:
      finiteNumber(
        raw.sourceIndex
      ),

    rating:
      validRating(
        raw.rating
      )

  });

}


function sanitizeStep(
  raw
) {

  if (
    !isPlainObject(
      raw
    )
  ) {

    return null;

  }

  return stripEmpty({

    index:
      finiteNumber(
        raw.index
      ),

    sourceIndex:
      finiteNumber(
        raw.sourceIndex
      ),

    rating:
      validRating(
        raw.rating
      ),

    previousCombined:
      finiteNumber(
        raw.previousCombined
      ),

    remainingBefore:
      finiteNumber(
        raw.remainingBefore
      ),

    rawContribution:
      finiteNumber(
        raw.rawContribution
      ),

    contribution:
      finiteNumber(
        raw.contribution
      ),

    rawCombined:
      finiteNumber(
        raw.rawCombined
      ),

    combined:
      finiteNumber(
        raw.combined
      ),

    remainingAfter:
      finiteNumber(
        raw.remainingAfter
      )

  });

}


function sanitizeDependents(
  raw
) {

  if (
    !isPlainObject(
      raw
    )
  ) {

    return {};

  }

  return stripEmpty({

    profile:
      clean(
        raw.profile
      ) ||
      null,

    profileLabel:
      clean(
        raw.profileLabel
      ) ||
      null,

    spouse:
      boolOrNull(
        raw.spouse
      ),

    childrenUnder18:
      finiteNumber(
        raw.childrenUnder18
      ),

    childrenInSchoolOver18:
      finiteNumber(
        raw.childrenInSchoolOver18
      ),

    dependentParents:
      finiteNumber(
        raw.dependentParents
      )

  });

}


function sanitizeCompensation(
  raw
) {

  if (
    !isPlainObject(
      raw
    )
  ) {

    return {};

  }

  return stripEmpty({

    ok:
      raw.ok ===
      true,

    error:
      clean(
        raw.error
      ) ||
      null,

    rating:
      validRating(
        raw.rating
      ),

    spouse:
      boolOrNull(
        raw.spouse
      ),

    dependentParents:
      finiteNumber(
        raw.dependentParents
      ),

    childrenUnder18:
      finiteNumber(
        raw.childrenUnder18
      ),

    childrenInSchoolOver18:
      finiteNumber(
        raw.childrenInSchoolOver18
      ),

    monthlyVA:
      finiteNumber(
        raw.monthlyVA
      ),

    baseMonthlyVA:
      finiteNumber(
        raw.baseMonthlyVA
      ),

    addedChildrenUnder18:
      finiteNumber(
        raw.addedChildrenUnder18
      ),

    addedChildrenInSchoolOver18:
      finiteNumber(
        raw.addedChildrenInSchoolOver18
      ),

    dependentStatusKey:
      clean(
        raw.dependentStatusKey
      ) ||
      null,

    rateVersion:
      clean(
        raw.rateVersion
      ) ||
      null

  });

}


function sanitizeDisabilitySnapshot(
  raw
) {

  if (
    !isPlainObject(
      raw
    )
  ) {

    return null;

  }

  const ratingEntries =
    Array.isArray(
      raw.ratingEntries
    )
      ? raw
          .ratingEntries
          .slice(
            0,
            MAX_RATINGS
          )
          .map(
            sanitizeRatingEntry
          )
          .filter(
            Boolean
          )

      : [];

  const steps =
    Array.isArray(
      raw.steps
    )
      ? raw
          .steps
          .slice(
            0,
            MAX_STEPS
          )
          .map(
            sanitizeStep
          )
          .filter(
            Boolean
          )

      : [];

  return stripEmpty({

    runtimeVersion:
      clean(
        raw.runtimeVersion
      ) ||
      null,

    ruleVersion:
      clean(
        raw.ruleVersion
      ) ||
      null,

    rateVersion:
      clean(
        raw.rateVersion
      ) ||
      null,

    ratingsEntered:
      sanitizeRatingArray(
        raw.ratingsEntered
      ),

    ratingsSorted:
      sanitizeRatingArray(
        raw.ratingsSorted
      ),

    ratingEntries,

    highestRating:
      validRating(
        raw.highestRating
      ),

    combinedValue:
      finiteNumber(
        raw.combinedValue
      ),

    officialRating:
      validRating(
        raw.officialRating
      ),

    remainingEfficiency:
      finiteNumber(
        raw.remainingEfficiency
      ),

    steps,

    dependents:
      sanitizeDependents(
        raw.dependents
      ),

    compensation:
      sanitizeCompensation(
        raw.compensation
      )

  });

}


/* ============================================================
  7. AUTHORITATIVE SNAPSHOT CHECK
============================================================ */

function hasAuthoritativeDisabilitySnapshot(
  snapshot
) {

  if (
    !isPlainObject(
      snapshot
    )
  ) {

    return false;

  }

  const combinedValue =
    finiteNumber(
      snapshot.combinedValue
    );

  const officialRating =
    finiteNumber(
      snapshot.officialRating
    );

  const remainingEfficiency =
    finiteNumber(
      snapshot.remainingEfficiency
    );

  const compensation =
    snapshot.compensation;

  if (
    combinedValue === null ||
    officialRating === null ||
    remainingEfficiency === null
  ) {

    return false;

  }

  if (
    combinedValue < 0 ||
    combinedValue > 100 ||
    officialRating < 0 ||
    officialRating > 100 ||
    remainingEfficiency < 0 ||
    remainingEfficiency > 100
  ) {

    return false;

  }

  if (
    !Array.isArray(
      snapshot.ratingsEntered
    ) ||
    !Array.isArray(
      snapshot.ratingsSorted
    ) ||
    !Array.isArray(
      snapshot.steps
    )
  ) {

    return false;

  }

  if (
    !isPlainObject(
      compensation
    ) ||
    compensation.ok !==
      true
  ) {

    return false;

  }

  const monthlyVA =
    finiteNumber(
      compensation.monthlyVA
    );

  if (
    monthlyVA === null ||
    monthlyVA < 0
  ) {

    return false;

  }

  return true;

}


/* ============================================================
  8. CONVERSATION CONTEXT
============================================================ */

function sanitizeMemoryValue(
  value,
  depth = 0
) {

  if (
    depth >
    3
  ) {

    return undefined;

  }

  if (
    value ===
      null
  ) {

    return null;

  }

  if (
    typeof value ===
      "string"
  ) {

    return value.slice(
      0,
      MAX_MEMORY_STRING_LENGTH
    );

  }

  if (
    typeof value ===
      "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : undefined;

  }

  if (
    typeof value ===
      "boolean"
  ) {

    return value;

  }

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .slice(
        0,
        20
      )
      .map(
        item =>
          sanitizeMemoryValue(
            item,
            depth +
            1
          )
      )
      .filter(
        item =>
          item !==
          undefined
      );

  }

  if (
    !isPlainObject(
      value
    )
  ) {

    return undefined;

  }

  const output =
    {};

  let count =
    0;

  for (
    const [
      key,
      nested
    ]
    of Object.entries(
      value
    )
  ) {

    if (
      count >=
      MAX_MEMORY_KEYS
    ) {

      break;

    }

    const safeKey =
      clean(
        key
      );

    if (
      !safeKey ||
      safeKey ===
        "__proto__" ||
      safeKey ===
        "constructor" ||
      safeKey ===
        "prototype" ||
      safeKey.startsWith(
        "__"
      )
    ) {

      continue;

    }

    const sanitized =
      sanitizeMemoryValue(
        nested,
        depth +
        1
      );

    if (
      sanitized !==
      undefined
    ) {

      output[
        safeKey
      ] =
        sanitized;

      count +=
        1;

    }

  }

  return output;

}


function sanitizeMemory(
  value
) {

  if (
    !isPlainObject(
      value
    )
  ) {

    return {};

  }

  return (
    sanitizeMemoryValue(
      value,
      0
    ) ||
    {}
  );

}


function sanitizeThread(
  value,
  currentMessage = ""
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }

  const output =
    [];

  for (
    const item
    of value
  ) {

    if (
      !isPlainObject(
        item
      )
    ) {

      continue;

    }

    const role =
      lower(
        item.role
      );

    if (
      role !==
        "user" &&
      role !==
        "assistant"
    ) {

      continue;

    }

    const content =
      clean(
        item.content
      ).slice(
        0,
        MAX_THREAD_MESSAGE_LENGTH
      );

    if (
      !content
    ) {

      continue;

    }

    output.push({

      role,

      content

    });

  }

  const newest =
    output.slice(
      -MAX_THREAD_MESSAGES
    );

  const current =
    clean(
      currentMessage
    );

  if (
    current &&
    newest.length &&
    newest[
      newest.length -
      1
    ].role ===
      "user" &&
    newest[
      newest.length -
      1
    ].content ===
      current
  ) {

    newest.pop();

  }

  return newest;

}


function parseConversationContext(
  body,
  message
) {

  const context =
    isPlainObject(
      body.context
    )
      ? body.context
      : {};

  const responseLimits =
    isPlainObject(
      context.response_limits
    )
      ? context.response_limits

      : isPlainObject(
          body.response_limits
        )
        ? body.response_limits
        : {};

  return {

    conversation_id:
      clean(
        context
          .conversation_id ||
        body
          .conversation_id
      ).slice(
        0,
        200
      ) ||
      null,

    thread:
      sanitizeThread(
        Array.isArray(
          context.thread
        )
          ? context.thread
          : body.thread,
        message
      ),

    memory:
      sanitizeMemory(
        isPlainObject(
          context.memory
        )
          ? context.memory
          : body.memory
      ),

    page:
      clean(
        context.page ||
        body.page
      ).slice(
        0,
        200
      ) ||
      "disability-calculator",

    widget:
      clean(
        context.widget ||
        body.widget
      ).slice(
        0,
        200
      ) ||
      "ask-amy-disability",

    response_limits: {

      max_chars:
        clamp(
          responseLimits
            .max_chars,
          MIN_REPLY_CHARS,
          MAX_REPLY_CHARS
        ) ||
        DEFAULT_MAX_REPLY_CHARS,

      greeting_max_chars:
        clamp(
          responseLimits
            .greeting_max_chars,
          100,
          1000
        ) ||
        DEFAULT_GREETING_MAX_CHARS,

      max_follow_up_questions:
        clamp(
          responseLimits
            .max_follow_up_questions,
          0,
          2
        )
        ??
        DEFAULT_MAX_FOLLOW_UP_QUESTIONS

    }

  };

}


/* ============================================================
  9. DISABILITY-ONLY INTENT DETECTION
============================================================ */

function detectIntent(
  message
) {

  const text =
    lower(
      message
    );

  if (
    !text
  ) {

    return INTENTS
      .DISABILITY_CONCEPT;

  }


  /* ----------------------------------------------------------
    GREETING
  ---------------------------------------------------------- */

  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(
      text
    )
  ) {

    return INTENTS
      .GREETING;

  }


  /* ----------------------------------------------------------
    CAPABILITIES
  ---------------------------------------------------------- */

  if (
    /\bwhat can you do\b|\bhow can you help\b|\bwhat do you do\b|\bwho are you\b/.test(
      text
    )
  ) {

    return INTENTS
      .CAPABILITIES;

  }


  /*
    Disability-specific phrases are evaluated BEFORE generic
    out-of-scope detection.
  */


  /* ----------------------------------------------------------
    BILATERAL FACTOR

    This calculator does NOT calculate § 4.26.
    Amy may explain the concept and clearly disclose the limit.
  ---------------------------------------------------------- */

  if (
    /\bbilateral\b|\bbilateral factor\b|\b4\.26\b|\b§\s*4\.26\b|\bpaired extremit|\bpaired limbs\b|\bboth arms\b|\bboth legs\b|\bleft and right\b/.test(
      text
    )
  ) {

    return INTENTS
      .BILATERAL_FACTOR;

  }


  /* ----------------------------------------------------------
    DEPENDENTS
  ---------------------------------------------------------- */

  if (
    /\bdependents?\b|\bdependent profile\b|\bspouse\b|\bchildren\b|\bchild\b|\bparent\b|\bdependent parents\b|\bschool child\b|\b18\+.*school\b/.test(
      text
    )
  ) {

    return INTENTS
      .DEPENDENTS;

  }


  /* ----------------------------------------------------------
    COMPENSATION
  ---------------------------------------------------------- */

  if (
    /\bmonthly compensation\b|\bva compensation\b|\bcompensation amount\b|\bmonthly va\b|\bmonthly payment\b|\bhow much.*month\b|\bpayment rate\b|\bpay rate\b|\bwhat will i get paid\b|\bwhat will i receive\b|\bcompensation rate\b|\bbase monthly\b/.test(
      text
    )
  ) {

    return INTENTS
      .COMPENSATION;

  }


  /* ----------------------------------------------------------
    FINAL ROUNDING
  ---------------------------------------------------------- */

  if (
    /\bfinal rounding\b|\brounding\b|\brounded\b|\bnearest 10\b|\bnearest ten\b|\bofficial rating\b|\bwhy.*80\b|\bwhy.*90\b|\bwhy.*100\b|\bcombined.*official\b/.test(
      text
    )
  ) {

    return INTENTS
      .FINAL_ROUNDING;

  }


  /* ----------------------------------------------------------
    WHOLE PERSON / REMAINING EFFICIENCY
  ---------------------------------------------------------- */

  if (
    /\bwhole person\b|\bwhole-person\b|\bremaining efficiency\b|\befficiency remaining\b|\bremaining.*efficiency\b|\bwhy.*not add\b|\bwhy.*don't add\b|\bwhy.*do not add\b|\bva math\b|\b38 cfr.*4\.25\b|\b4\.25\b|\b§\s*4\.25\b/.test(
      text
    )
  ) {

    return INTENTS
      .WHOLE_PERSON;

  }


  /* ----------------------------------------------------------
    RATING STEPS
  ---------------------------------------------------------- */

  if (
    /\bstep by step\b|\brating steps\b|\bcalculation steps\b|\bhow.*ratings.*build\b|\bhow.*build\b|\bcontribution\b|\bcontributed\b|\bremaining before\b|\bremaining after\b|\bhow did.*combine\b/.test(
      text
    )
  ) {

    return INTENTS
      .RATING_STEPS;

  }


  /* ----------------------------------------------------------
    COMBINED RATING
  ---------------------------------------------------------- */

  if (
    /\bcombined rating\b|\bcombined value\b|\bcombine my ratings\b|\bcombined disability\b|\bcombine percentages\b|\bcombined percentage\b|\bratings combine\b|\bcombine.*disabilit/.test(
      text
    )
  ) {

    return INTENTS
      .COMBINED_RATING;

  }


  /* ----------------------------------------------------------
    EXPLAIN CURRENT ESTIMATE
  ---------------------------------------------------------- */

  if (
    /\bmy estimate\b|\bmy disability estimate\b|\bmy va estimate\b|\bmy current result\b|\banalyze my.*result\b|\bexplain my.*result\b|\bexplain my estimate\b|\bexplain my rating\b|\bcurrent disability calculator\b|\bmy va rating\b/.test(
      text
    )
  ) {

    return INTENTS
      .EXPLAIN_ESTIMATE;

  }


  /* ----------------------------------------------------------
    EXPLICITLY UNRELATED THEWING TOPICS
  ---------------------------------------------------------- */

  if (
    /\bbah\b|\bbasic allowance for housing\b|\bpcs\b|\bduty station\b|\bbase demographics\b|\bmortgage\b|\bhome loan\b|\bva loan\b|\bfunding fee\b|\bcoe\b|\baffordability\b|\bbuy a house\b|\brent vs buy\b|\bpt test\b|\bpfra\b|\bfitness test\b|\bwaps\b|\bpromotion testing\b|\bskt\b|\bpfe\b|\bhigh[\s-]?3\b|\bhigh[\s-]?36\b|\bmilitary retirement\b|\bretirement multiplier\b|\bretired pay\b|\bfinancial readiness\b/.test(
      text
    )
  ) {

    return INTENTS
      .OUT_OF_SCOPE;

  }


  /* ----------------------------------------------------------
    GENERAL DISABILITY-CALCULATOR LANGUAGE
  ---------------------------------------------------------- */

  if (
    /\bva disability\b|\bdisability rating\b|\bservice-connected\b|\bservice connection\b|\bclaim\b|\brating\b|\bcompensation\b|\bdisability\b|\bva percentage\b/.test(
      text
    )
  ) {

    return INTENTS
      .DISABILITY_CONCEPT;

  }


  return INTENTS
    .DISABILITY_CONCEPT;

}


/* ============================================================
  10. DISABILITY CALCULATOR AUTHORITY
============================================================ */

function buildDisabilityAuthority(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return {

      authority:
        "no_current_authoritative_disability_result",

      rules: [

        "No authoritative VA Disability Calculator result is currently supplied.",

        "Do not claim the user has a current calculated disability result.",

        "You may explain general VA Disability Calculator concepts without inventing personal numbers.",

        "If the user asks about their specific result, tell them to calculate or refresh the Disability Calculator first.",

        "Do not invent an official VA disability rating.",

        "Do not invent monthly VA compensation."

      ]

    };

  }

  return {

    authority:
      "browser_displayed_disability_calculator_snapshot",

    rules: [

      "The supplied VA Disability Calculator snapshot is authoritative.",

      "Repeat its numeric results exactly.",

      "Do not independently combine the disability percentages.",

      "Do not independently calculate 38 CFR § 4.25 whole-person math.",

      "Do not replace the supplied combined value with model math.",

      "Do not independently round the combined value to an official VA rating.",

      "Do not replace the supplied official rating with another rating.",

      "Do not independently calculate monthly VA compensation.",

      "Do not replace the supplied compensation amount with another rate.",

      "Use the supplied ratingsEntered and ratingsSorted values exactly when describing the scenario.",

      "Use the supplied calculation steps exactly when explaining how the rating builds.",

      "Use supplied remainingEfficiency rather than recomputing it.",

      "Use the supplied dependent profile exactly.",

      "Do not invent dependents.",

      "Do not invent spouse, child, or dependent-parent information.",

      "The calculator uses 38 CFR § 4.25 combined-rating logic.",

      "The current calculator does NOT calculate the 38 CFR § 4.26 bilateral factor.",

      "Never modify the displayed estimate by attempting to add a bilateral factor.",

      "The calculator does NOT calculate Special Monthly Compensation (SMC).",

      "The calculator does NOT calculate spouse Aid & Attendance.",

      "The calculator does NOT calculate DIC.",

      "The calculator does NOT calculate VA retirement-pay offsets.",

      "The calculator does NOT calculate retroactive compensation.",

      "The calculator does NOT determine effective dates.",

      "The calculator does NOT determine whether a condition is service-connected.",

      "The displayed disability result is an educational planning estimate, not an official VA rating decision."

    ],

    displayed_disability_snapshot:
      snapshot

  };

}


/* ============================================================
  11. DIRECT DISABILITY REPLIES
============================================================ */

function buildGreetingReply() {

  return (
    "Hey — I’m Amy, your Disability Concierge. " +
    "I can explain your VA rating estimate, whole-person math, combined value, final rounding, dependent profile, and estimated monthly compensation. " +
    "TheWing calculates; I explain what it means."
  );

}


function buildCapabilitiesReply() {

  return (
    "I’m dedicated to this VA Disability Rating Calculator. " +
    "I can explain how your ratings combine under the calculator’s 38 CFR § 4.25 method, remaining efficiency, each calculation step, your combined value versus estimated official rating, dependent compensation, and the monthly compensation shown in your result. " +
    "I can also explain the bilateral-factor concept, but this calculator does not currently calculate it."
  );

}


function buildOutOfScopeReply() {

  return (
    "I’m the Disability Calculator concierge, so I’m keeping this session focused on VA disability ratings, whole-person math, final rounding, dependents, and the compensation estimate shown by this calculator. " +
    "Use the appropriate TheWing.ai tool for that other topic."
  );

}


function buildNoResultReply() {

  return (
    "I can explain VA disability-rating concepts now, but I don’t have a current Disability Calculator result to analyze. " +
    "Run or refresh the calculator first, then I can walk through the exact ratings, combined value, estimated official rating, calculation steps, dependents, and monthly compensation it returns."
  );

}


function buildEstimateFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return buildNoResultReply();

  }

  const pieces =
    [];

  const officialRating =
    numericPercent(
      snapshot.officialRating
    );

  const combinedValue =
    numericPercent(
      snapshot.combinedValue
    );

  const highestRating =
    numericPercent(
      snapshot.highestRating
    );

  const remaining =
    numericPercent(
      snapshot.remainingEfficiency
    );

  const compensation =
    snapshot.compensation ||
    {};

  const dependents =
    snapshot.dependents ||
    {};

  if (
    officialRating
  ) {

    pieces.push(
      `Your calculator currently shows an estimated ${officialRating} VA disability rating.`
    );

  }

  if (
    combinedValue
  ) {

    pieces.push(
      `Before final VA rounding, the combined value is ${combinedValue}.`
    );

  }

  if (
    highestRating
  ) {

    pieces.push(
      `Your highest individual rating in the current calculation is ${highestRating}.`
    );

  }

  if (
    remaining
  ) {

    pieces.push(
      `${remaining} of whole-person efficiency remains after the displayed combination steps.`
    );

  }

  if (
    finiteNumber(
      compensation.monthlyVA
    ) !==
    null
  ) {

    pieces.push(
      `The calculator's estimated standard monthly VA compensation is ${money2(compensation.monthlyVA)}.`
    );

  }

  if (
    dependents.profileLabel
  ) {

    pieces.push(
      `The dependent profile currently used for compensation is ${dependents.profileLabel}.`
    );

  }

  pieces.push(
    "These are calculator estimates, not an official VA rating decision or benefits determination."
  );

  return pieces.join(
    " "
  );

}


function buildCombinedRatingFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "VA disability percentages are not simply added together in this calculator. " +
      "The calculator applies its 38 CFR § 4.25 whole-person method from the highest rating downward. Run a current scenario and I can explain the exact combined value it returns."
    );

  }

  const ratings =
    Array.isArray(
      snapshot.ratingsSorted
    )
      ? snapshot.ratingsSorted
      : [];

  const parts =
    [];

  if (
    ratings.length
  ) {

    parts.push(
      `The calculator applies your compensable ratings from highest to lowest: ${ratings.map(value => `${value}%`).join(", ")}.`
    );

  }

  parts.push(
    `Those ratings produce the displayed combined value of ${numericPercent(snapshot.combinedValue)}.`
  );

  parts.push(
    `After final rounding, the calculator shows an estimated official VA rating of ${numericPercent(snapshot.officialRating)}.`
  );

  parts.push(
    "I’m explaining those displayed results rather than recomputing them."
  );

  return parts.join(
    " "
  );

}


function buildWholePersonFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "The calculator uses a whole-person approach: each additional disability is applied to the efficiency remaining after the ratings already considered. " +
      "That is why multiple VA percentages do not simply add together. Run a calculation and I can explain the exact remaining-efficiency values shown in your result."
    );

  }

  const parts =
    [];

  const ratings =
    Array.isArray(
      snapshot.ratingsSorted
    )
      ? snapshot.ratingsSorted
      : [];

  if (
    ratings.length
  ) {

    parts.push(
      `Your current whole-person sequence uses ${ratings.map(value => `${value}%`).join(", ")} from highest to lowest.`
    );

  }

  parts.push(
    `The calculator ends with a ${numericPercent(snapshot.combinedValue)} combined value and ${numericPercent(snapshot.remainingEfficiency)} remaining efficiency.`
  );

  parts.push(
    `That displayed combined value then results in the calculator's estimated ${numericPercent(snapshot.officialRating)} official VA rating after final rounding.`
  );

  parts.push(
    "The percentages are therefore reducing the remaining whole-person efficiency rather than being directly added together."
  );

  return parts.join(
    " "
  );

}


function buildRatingStepsFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "The Disability Calculator records each whole-person calculation step, including the rating applied, remaining efficiency before that step, its actual contribution, the new combined value, and the efficiency remaining afterward. " +
      "Run the calculator first and I can walk through those exact displayed steps."
    );

  }

  const steps =
    Array.isArray(
      snapshot.steps
    )
      ? snapshot.steps
      : [];

  if (
    !steps.length
  ) {

    return (
      `The current calculator result has a ${numericPercent(snapshot.combinedValue)} combined value and an estimated ${numericPercent(snapshot.officialRating)} VA rating. ` +
      "There are no additional positive-rating calculation steps to explain in the current snapshot."
    );

  }

  const descriptions =
    steps
      .slice(
        0,
        6
      )
      .map(
        step => {

          const index =
            finiteNumber(
              step.index
            );

          const rating =
            numericPercent(
              step.rating
            );

          const contribution =
            numericPercent(
              step.contribution
            );

          const combined =
            numericPercent(
              step.combined
            );

          const remainingAfter =
            numericPercent(
              step.remainingAfter
            );

          if (
            index === 1
          ) {

            return (
              `Step 1 applies the ${rating} rating, producing a ${combined} combined value with ${remainingAfter} remaining.`
            );

          }

          return (
            `Step ${index} applies the ${rating} rating to the efficiency remaining at that point; the calculator records a ${contribution} contribution, bringing the combined value to ${combined} with ${remainingAfter} remaining.`
          );

        }
      );

  descriptions.push(
    `The final displayed combined value is ${numericPercent(snapshot.combinedValue)}, which the calculator rounds to an estimated ${numericPercent(snapshot.officialRating)} VA rating.`
  );

  return descriptions.join(
    " "
  );

}


function buildFinalRoundingFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "The calculator keeps its combined result separate from the final estimated VA rating and performs final nearest-10 rounding only after the disability ratings have been combined. " +
      "Run the calculator first and I can explain the exact combined value and final rating shown."
    );

  }

  return (
    `Your calculator's combined value is ${numericPercent(snapshot.combinedValue)}. ` +
    `After its final VA rounding step, the displayed estimated official rating is ${numericPercent(snapshot.officialRating)}. ` +
    "I’m treating both values as authoritative and am not rerunning the rounding calculation independently."
  );

}


function buildCompensationFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "Monthly compensation in this calculator is tied to the estimated official VA rating and the dependent profile entered in the calculator. " +
      "Run a current scenario first and I can explain the exact compensation amount and dependent assumptions shown."
    );

  }

  const compensation =
    snapshot.compensation ||
    {};

  const dependents =
    snapshot.dependents ||
    {};

  const pieces =
    [];

  pieces.push(
    `The calculator currently shows an estimated ${numericPercent(snapshot.officialRating)} VA disability rating.`
  );

  if (
    finiteNumber(
      compensation.monthlyVA
    ) !==
    null
  ) {

    pieces.push(
      `The estimated standard monthly VA compensation displayed is ${money2(compensation.monthlyVA)}.`
    );

  }

  if (
    dependents.profileLabel
  ) {

    pieces.push(
      `That compensation result uses the ${dependents.profileLabel} dependent profile.`
    );

  }

  if (
    finiteNumber(
      compensation.baseMonthlyVA
    ) !==
    null
  ) {

    pieces.push(
      `The calculator's base monthly amount for the selected status is ${money2(compensation.baseMonthlyVA)}.`
    );

  }

  if (
    finiteNumber(
      compensation.addedChildrenUnder18
    ) >
    0
  ) {

    pieces.push(
      `Additional children-under-18 compensation shown is ${money2(compensation.addedChildrenUnder18)}.`
    );

  }

  if (
    finiteNumber(
      compensation.addedChildrenInSchoolOver18
    ) >
    0
  ) {

    pieces.push(
      `Additional compensation for children 18 or older in school is ${money2(compensation.addedChildrenInSchoolOver18)}.`
    );

  }

  if (
    snapshot.officialRating ===
      10 ||
    snapshot.officialRating ===
      20
  ) {

    pieces.push(
      "At 10% and 20% in this calculator, the standard compensation amount does not change based on dependent status."
    );

  }

  pieces.push(
    "This calculator does not add SMC, spouse Aid & Attendance, DIC, retroactive benefits, or retirement-pay offset calculations."
  );

  return pieces.join(
    " "
  );

}


function buildDependentsFallback(
  snapshot
) {

  if (
    !hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return (
      "The calculator can use spouse, qualifying children, and dependent-parent information when estimating standard VA disability compensation. " +
      "Run a current scenario first and I can explain the exact dependent profile being used."
    );

  }

  const dependents =
    snapshot.dependents ||
    {};

  const pieces =
    [];

  if (
    dependents.profileLabel
  ) {

    pieces.push(
      `Your current dependent profile is ${dependents.profileLabel}.`
    );

  }

  pieces.push(
    `Spouse: ${dependents.spouse === true ? "Yes" : "No"}.`
  );

  if (
    finiteNumber(
      dependents.childrenUnder18
    ) !==
    null
  ) {

    pieces.push(
      `Children under 18: ${dependents.childrenUnder18}.`
    );

  }

  if (
    finiteNumber(
      dependents.childrenInSchoolOver18
    ) !==
    null
  ) {

    pieces.push(
      `Children 18 or older in school: ${dependents.childrenInSchoolOver18}.`
    );

  }

  if (
    finiteNumber(
      dependents.dependentParents
    ) !==
    null
  ) {

    pieces.push(
      `Dependent parents: ${dependents.dependentParents}.`
    );

  }

  if (
    snapshot.officialRating ===
      10 ||
    snapshot.officialRating ===
      20
  ) {

    pieces.push(
      `Your current estimated rating is ${numericPercent(snapshot.officialRating)}, and the calculator does not change the standard 10% or 20% compensation amount based on dependents.`
    );

  } else if (
    snapshot.officialRating >=
    30
  ) {

    pieces.push(
      "At the current estimated rating, the dependent profile can affect the standard compensation estimate."
    );

  }

  return pieces.join(
    " "
  );

}


function buildBilateralFactorFallback() {

  return (
    "The bilateral factor under 38 CFR § 4.26 can affect certain qualifying disabilities involving paired extremities, but this version of TheWing's Disability Calculator does not calculate or apply the bilateral factor. " +
    "I can explain the concept generally, but I will not modify your current calculator rating or invent a bilateral-adjusted result."
  );

}


function buildDisabilityConceptFallback(
  snapshot
) {

  if (
    hasAuthoritativeDisabilitySnapshot(
      snapshot
    )
  ) {

    return buildEstimateFallback(
      snapshot
    );

  }

  return (
    "This calculator is designed to show how multiple disability ratings build under its 38 CFR § 4.25 whole-person calculation and to estimate standard monthly VA disability compensation. " +
    "It is an educational estimate rather than an official VA rating decision, and this version does not calculate the bilateral factor, SMC, retroactive benefits, or claim adjudication."
  );

}


function buildDirectReply(
  intent,
  snapshot
) {

  switch (
    intent
  ) {

    case INTENTS
      .GREETING:

      return buildGreetingReply();


    case INTENTS
      .CAPABILITIES:

      return buildCapabilitiesReply();


    case INTENTS
      .OUT_OF_SCOPE:

      return buildOutOfScopeReply();


    default:

      return "";

  }

}


function buildFallbackReply(
  intent,
  snapshot
) {

  switch (
    intent
  ) {

    case INTENTS
      .GREETING:

      return buildGreetingReply();


    case INTENTS
      .CAPABILITIES:

      return buildCapabilitiesReply();


    case INTENTS
      .OUT_OF_SCOPE:

      return buildOutOfScopeReply();


    case INTENTS
      .EXPLAIN_ESTIMATE:

      return buildEstimateFallback(
        snapshot
      );


    case INTENTS
      .COMBINED_RATING:

      return buildCombinedRatingFallback(
        snapshot
      );


    case INTENTS
      .WHOLE_PERSON:

      return buildWholePersonFallback(
        snapshot
      );


    case INTENTS
      .RATING_STEPS:

      return buildRatingStepsFallback(
        snapshot
      );


    case INTENTS
      .FINAL_ROUNDING:

      return buildFinalRoundingFallback(
        snapshot
      );


    case INTENTS
      .COMPENSATION:

      return buildCompensationFallback(
        snapshot
      );


    case INTENTS
      .DEPENDENTS:

      return buildDependentsFallback(
        snapshot
      );


    case INTENTS
      .BILATERAL_FACTOR:

      return buildBilateralFactorFallback();


    case INTENTS
      .DISABILITY_CONCEPT:

    default:

      return buildDisabilityConceptFallback(
        snapshot
      );

  }

}


/* ============================================================
  12. SYSTEM PROMPT
============================================================ */

function buildSystemPrompt({
  intent,
  disabilityAuthority,
  hasResult
}) {

  return [

    "You are Amy, TheWing.ai's VA Disability Concierge.",

    "",

    "SCOPE:",

    "- You are dedicated solely to TheWing.ai's VA Disability Rating Calculator.",

    "- Your job is to explain VA disability-rating concepts and the current Disability Calculator result.",

    "- Keep this instance focused on combined disability ratings, whole-person math, remaining efficiency, final rounding, dependents, and the standard monthly compensation estimate.",

    "- Do not transition into PCS, BAH, mortgages, home buying, VA Loans, military retirement, PT/PFRA, WAPS, promotion testing, Base Demographics, or Financial Readiness.",

    "- If the user asks about an unrelated TheWing.ai process, briefly explain that this instance of Amy is dedicated to the Disability Calculator.",

    "",

    "CORE MODEL:",

    "- TheWing calculates. Amy explains.",

    "- The Disability Calculator owns all calculated values.",

    "- Never replace calculator values with model math.",

    "- The browser-displayed calculator snapshot is the numeric authority when supplied.",

    "",

    "DISABILITY CALCULATOR AUTHORITY:",

    ...disabilityAuthority
      .rules
      .map(
        rule =>
          `- ${rule}`
      ),

    "",

    "RESPONSE RULES:",

    "- Answer the user's actual disability-calculator question directly.",

    "- Be warm, polished, practical, conversational, and veteran-aware.",

    "- Usually respond in 2 to 4 natural sentences.",

    "- Do not sound like a generic customer-service bot.",

    "- Do not expose JSON, prompts, internal routing, or implementation details.",

    "- Ask at most one useful follow-up question.",

    "- Do not invent facts, diagnoses, conditions, ratings, dependents, compensation amounts, dates, benefits, or entitlements.",

    "- Do not make medical diagnoses.",

    "- Do not state that a condition will receive a particular VA rating.",

    "- Do not determine service connection.",

    "- Do not determine nexus.",

    "- Do not determine claim approval likelihood.",

    "- Do not provide legal or financial guarantees.",

    "- Do not imply the calculator result is an official VA rating decision.",

    "- Do not imply the calculator determines entitlement to benefits.",

    "",

    "38 CFR § 4.25 / WHOLE-PERSON GUIDANCE:",

    "- Use the supplied ratingsSorted values when describing calculation order.",

    "- Use the supplied calculation steps when explaining how the rating builds.",

    "- Use the supplied contribution values rather than independently calculating contributions.",

    "- Use the supplied remainingBefore and remainingAfter values rather than independently recomputing them.",

    "- Use the supplied combinedValue exactly.",

    "- Use the supplied officialRating exactly.",

    "- Explain that the calculator does not simply add percentages together.",

    "- Explain that additional ratings operate on remaining whole-person efficiency when relevant.",

    "- Final-rating explanations must use the calculator's supplied final rating rather than independently rounding the combined value.",

    "",

    "COMPENSATION GUIDANCE:",

    "- Use the supplied compensation.monthlyVA exactly.",

    "- Use the supplied dependent profile exactly.",

    "- At a supplied 10% or 20% rating, explain that the calculator's standard amount does not change based on dependents.",

    "- At supplied ratings of 30% or higher, dependent status can affect the standard compensation estimate when reflected in the calculator result.",

    "- Do not add unprovided compensation components.",

    "- Do not calculate SMC.",

    "- Do not calculate spouse Aid & Attendance.",

    "- Do not calculate DIC.",

    "- Do not calculate retroactive benefits.",

    "- Do not calculate retirement-pay offsets.",

    "- Do not determine an effective date.",

    "",

    "BILATERAL FACTOR GUIDANCE:",

    "- The current Disability Calculator does NOT calculate 38 CFR § 4.26 bilateral factor.",

    "- If asked about the bilateral factor, explain the concept generally and clearly disclose this limitation.",

    "- Never apply your own bilateral-factor calculation to the supplied snapshot.",

    "- Never replace the current calculator result with a model-generated bilateral-adjusted rating.",

    "",

    `CURRENT INTENT: ${intent}`,

    `AUTHORITATIVE CALCULATOR RESULT PRESENT: ${hasResult ? "YES" : "NO"}`,

    "",

    "AUTHORITATIVE DISABILITY CONTEXT:",

    JSON.stringify(
      disabilityAuthority,
      null,
      2
    )

  ]
    .filter(
      line =>
        line !==
        ""
    )
    .join(
      "\n"
    );

}


/* ============================================================
  13. OPENAI USER PAYLOAD
============================================================ */

function buildUserPayload({
  message,
  intent,
  disability,
  conversationContext
}) {

  return {

    user_message:
      message,

    intent,

    scope:
      SCOPE,

    page:
      conversationContext.page,

    widget:
      conversationContext.widget,

    behavior_rules: {

      disability_only:
        true,

      public_session_only:
        true,

      no_member_account:
        true,

      no_supabase:
        true,

      calculator_snapshot_is_authoritative:
        true,

      do_not_recalculate:
        true,

      do_not_fabricate_numbers:
        true,

      do_not_change_combined_rating:
        true,

      do_not_change_official_rating:
        true,

      do_not_change_compensation:
        true,

      do_not_invent_dependents:
        true,

      bilateral_factor_not_calculated:
        true,

      no_smc_calculation:
        true,

      no_claim_adjudication:
        true

    },

    disability_snapshot:
      disability ||
      null,

    conversation_memory: {

      label:
        "unverified browser-session conversational memory",

      memory:
        conversationContext.memory

    },

    output_request:
      "Return a polished conversational answer only. Do not return JSON."

  };

}


/* ============================================================
  14. OPENAI
============================================================ */

async function callOpenAI({
  systemPrompt,
  userPayload,
  thread,
  responseLimits
}) {

  if (
    !OPENAI_API_KEY
  ) {

    return "";

  }

  const maxChars =
    Number(
      responseLimits
        ?.max_chars
    ) ||
    DEFAULT_MAX_REPLY_CHARS;

  const maxTokens =
    Math.max(
      180,
      Math.min(
        850,
        Math.ceil(
          maxChars /
          3
        ) +
        80
      )
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      OPENAI_TIMEOUT_MS
    );

  try {

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              model:
                DEFAULT_MODEL,

              temperature:
                0.25,

              max_tokens:
                maxTokens,

              messages: [

                {

                  role:
                    "system",

                  content:
                    systemPrompt

                },

                ...thread,

                {

                  role:
                    "user",

                  content:
                    JSON.stringify(
                      userPayload
                    )

                }

              ]

            }),

          signal:
            controller.signal

        }
      );

    const raw =
      await response.text();

    const data =
      safeJsonParse(
        raw,
        {}
      ) ||
      {};

    if (
      !response.ok
    ) {

      console.warn(
        "[ask-amy-disability] OpenAI request failed:",
        response.status
      );

      return "";

    }

    return clean(
      data
        ?.choices
        ?.[0]
        ?.message
        ?.content
    );

  } catch (
    error
  ) {

    if (
      error
        ?.name ===
      "AbortError"
    ) {

      console.warn(
        "[ask-amy-disability] OpenAI request timed out."
      );

    } else {

      console.warn(
        "[ask-amy-disability] OpenAI request failed:",
        error
          ?.message ||
        error
      );

    }

    return "";

  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ============================================================
  15. REPLY LIMITS
============================================================ */

function enforceQuestionLimit(
  text,
  maxQuestions
) {

  let output =
    clean(
      text
    );

  if (
    !output
  ) {

    return "";

  }

  const allowed =
    clamp(
      maxQuestions,
      0,
      2
    );

  if (
    allowed ===
      null
  ) {

    return output;

  }

  if (
    allowed ===
    0
  ) {

    return output
      .split(
        /(?<=[.!])\s+/
      )
      .filter(
        sentence =>
          !sentence.includes(
            "?"
          )
      )
      .join(
        " "
      )
      .trim();

  }

  let count =
    0;

  const sentences =
    output.split(
      /(?<=[.!?])\s+/
    );

  const kept =
    [];

  for (
    const sentence
    of sentences
  ) {

    const questions =
      (
        sentence.match(
          /\?/g
        ) ||
        []
      ).length;

    if (
      questions >
      0
    ) {

      if (
        count >=
        allowed
      ) {

        continue;

      }

      count +=
        questions;

    }

    kept.push(
      sentence
    );

  }

  return kept
    .join(
      " "
    )
    .trim();

}


function enforceReplyLimits(
  reply,
  intent,
  responseLimits
) {

  let text =
    clean(
      reply
    );

  if (
    !text
  ) {

    return "";

  }

  text =
    enforceQuestionLimit(
      text,
      responseLimits
        ?.max_follow_up_questions
    );

  const maxChars =
    intent ===
      INTENTS.GREETING

      ? Number(
          responseLimits
            ?.greeting_max_chars
        ) ||
        DEFAULT_GREETING_MAX_CHARS

      : Number(
          responseLimits
            ?.max_chars
        ) ||
        DEFAULT_MAX_REPLY_CHARS;

  if (
    text.length <=
    maxChars
  ) {

    return text;

  }

  const slice =
    text.slice(
      0,
      maxChars
    );

  const sentenceMatch =
    slice.match(
      /^[\s\S]*[.!?](?=\s|$)/
    );

  let cut =
    sentenceMatch
      ? sentenceMatch[0]
      : slice.replace(
          /\s+\S*$/,
          ""
        );

  cut =
    clean(
      cut
    );

  if (
    !cut
  ) {

    cut =
      slice.trim();

  }

  return (
    cut +
    (
      cut.length <
      text.length
        ? "..."
        : ""
    )
  );

}


/* ============================================================
  16. SIMPLE DISABILITY MEMORY

  Memory is conversational convenience only.

  It must NEVER become numeric authority.
============================================================ */

function buildMemoryPatch({
  intent,
  disability
}) {

  const patch = {

    last_disability_intent:
      intent,

    last_updated_at:
      new Date()
        .toISOString()

  };

  if (
    hasAuthoritativeDisabilitySnapshot(
      disability
    )
  ) {

    const dependents =
      disability.dependents ||
      {};

    if (
      dependents.profile
    ) {

      patch
        .last_disability_dependent_profile =
        clean(
          dependents.profile
        ).slice(
          0,
          60
        );

    }

  }

  return patch;

}


/* ============================================================
  17. MAIN HANDLER
============================================================ */

export async function handler(
  event
) {

  const startedAt =
    Date.now();

  if (
    String(
      event
        ?.httpMethod ||
      ""
    ).toUpperCase() ===
    "OPTIONS"
  ) {

    return {

      statusCode:
        204,

      headers:
        corsHeaders(
          event
        ),

      body:
        ""

    };

  }

  if (
    String(
      event
        ?.httpMethod ||
      "POST"
    ).toUpperCase() !==
    "POST"
  ) {

    return respondError(
      event,
      405,
      "Method not allowed.",
      "METHOD_NOT_ALLOWED"
    );

  }

  let conversationId =
    null;

  try {

    const body =
      parseRequestBody(
        event
      );

    const message =
      clean(
        body.message ||
        body.question ||
        body.prompt ||
        body.text
      ).slice(
        0,
        MAX_MESSAGE_LENGTH
      );

    if (
      !message
    ) {

      return respondError(
        event,
        400,
        "Missing message.",
        "MISSING_MESSAGE"
      );

    }

    const conversationContext =
      parseConversationContext(
        body,
        message
      );

    conversationId =
      conversationContext
        .conversation_id;


    /*
      Accept Disability Calculator snapshot from either:

      body.disability

      OR

      body.context.disability
    */

    const rawDisability =
      isPlainObject(
        body.disability
      )
        ? body.disability

        : isPlainObject(
            body
              ?.context
              ?.disability
          )
          ? body
              .context
              .disability

          : null;


    const disability =
      sanitizeDisabilitySnapshot(
        rawDisability
      );


    const hasResult =
      hasAuthoritativeDisabilitySnapshot(
        disability
      );


    const intent =
      detectIntent(
        message
      );


    const disabilityAuthority =
      buildDisabilityAuthority(
        disability
      );


    /* ========================================================
      DIRECT DETERMINISTIC TURNS

      Do not spend an OpenAI call on:
      - greetings
      - capabilities
      - clearly unrelated questions
    ======================================================== */

    const directReply =
      buildDirectReply(
        intent,
        disability
      );


    let replyRaw =
      directReply;


    let openaiUsed =
      false;


    /* ========================================================
      NORMAL DISABILITY EXPLANATION
    ======================================================== */

    if (
      !replyRaw
    ) {

      const systemPrompt =
        buildSystemPrompt({

          intent,

          disabilityAuthority,

          hasResult

        });


      const userPayload =
        buildUserPayload({

          message,

          intent,

          disability,

          conversationContext

        });


      replyRaw =
        await callOpenAI({

          systemPrompt,

          userPayload,

          thread:
            conversationContext
              .thread,

          responseLimits:
            conversationContext
              .response_limits

        });


      openaiUsed =
        Boolean(
          replyRaw
        );

    }


    /* ========================================================
      FAIL OPEN
    ======================================================== */

    if (
      !replyRaw
    ) {

      replyRaw =
        buildFallbackReply(
          intent,
          disability
        );

    }


    const reply =
      enforceReplyLimits(

        replyRaw,

        intent,

        conversationContext
          .response_limits

      );


    const memoryPatch =
      buildMemoryPatch({

        intent,

        disability

      });


    const resultRequiredIntents =
      [

        INTENTS
          .EXPLAIN_ESTIMATE,

        INTENTS
          .COMBINED_RATING,

        INTENTS
          .WHOLE_PERSON,

        INTENTS
          .RATING_STEPS,

        INTENTS
          .FINAL_ROUNDING,

        INTENTS
          .COMPENSATION,

        INTENTS
          .DEPENDENTS

      ];


    const warnings =
      [

        "PUBLIC_SESSION_ONLY",

        "EDUCATIONAL_ESTIMATE_NOT_OFFICIAL_VA_DECISION",

        "BILATERAL_FACTOR_NOT_CALCULATED",

        ...(
          !hasResult &&
          resultRequiredIntents.includes(
            intent
          )

            ? [
                "NO_CURRENT_DISABILITY_RESULT"
              ]

            : []
        ),

        ...(
          intent ===
            INTENTS
              .BILATERAL_FACTOR

            ? [
                "CURRENT_CALCULATOR_DOES_NOT_APPLY_38_CFR_4_26"
              ]

            : []
        ),

        ...(
          !OPENAI_API_KEY

            ? [
                "OPENAI_UNAVAILABLE_USING_DETERMINISTIC_FALLBACK"
              ]

            : []
        )

      ];


    return respond(
      event,
      200,
      {

        ok:
          true,

        agent:
          "Amy",

        display_name:
          DISPLAY_NAME,

        brand:
          "TheWing.ai",

        scope:
          SCOPE,

        endpoint:
          "ask-amy-disability",

        version:
          VERSION,

        response_contract:
          RESPONSE_CONTRACT_VERSION,

        intent,

        reply,

        conversation_id:
          conversationContext
            .conversation_id,

        memory_patch:
          memoryPatch,

        context_used: {

          disability_snapshot:
            hasResult,

          calculator_authority:
            hasResult
              ? "browser_displayed_disability_calculator_snapshot"
              : "none",

          openai:
            openaiUsed

        },

        ui: {

          speed:
            18,

          startDelay:
            80

        },

        warnings,

        latency_ms:
          Date.now() -
          startedAt

      }
    );

  } catch (
    error
  ) {

    console.error(
      "[ask-amy-disability] server error:",
      error
        ?.message ||
      error
    );

    return respondError(
      event,
      500,
      "Ask Amy Disability could not complete the request.",
      "INTERNAL_ERROR",
      conversationId
    );

  }

}


/* ============================================================
  18. OPTIONAL DEFAULT EXPORT

  This allows either:

    import { handler } from "...";

  OR:

    import disabilityAmy from "...";
    disabilityAmy.handler(...)
============================================================ */

export default Object.freeze({

  version:
    VERSION,

  scope:
    SCOPE,

  handler

});
