/* ============================================================
  THEWING.AI • ASK AMY RETIREMENT SERVER
  Retirement-Calculator/ask-amy-retirement-server.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Dedicated server-side Amy for the Military Retirement Calculator.

  ARCHITECTURE
  -------------------------------------------------------------
  Retirement Calculator
        ↓
  window.THEWING_RETIREMENT.getState()
        ↓
  ask-amy-retirement.js
        ↓
  /.netlify/functions/ask-amy-retirement
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
  - calculate High-3
  - calculate High-36
  - calculate credited service
  - calculate retirement multipliers
  - calculate retired pay
  - reconstruct military pay tables
  - calculate promotion timing
  - access Supabase
  - access member accounts
  - access PCSUnited
  - use BasicBrain
  - use mortgage engines
  - use PT engines
  - use WAPS engines
  - use agent-amy-public.js
  - use amy-brain.js
  - use amy-concierge.js

  The supplied Retirement Calculator state is authoritative.
============================================================ */


/* ============================================================
  1. CONFIG
============================================================ */

const VERSION =
  "ask-amy-retirement-server-1.0.0";

const RESPONSE_CONTRACT_VERSION =
  "ask-amy-retirement-response-v1";

const SCOPE =
  "retirement_calculator";

const DISPLAY_NAME =
  "Amy — Retirement Concierge";

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
  2. RETIREMENT INTENTS
============================================================ */

const INTENTS =
  Object.freeze({
    GREETING:
      "greeting",

    CAPABILITIES:
      "capabilities",

    EXPLAIN_ESTIMATE:
      "explain_estimate",

    HIGH3:
      "high3",

    MULTIPLIER:
      "multiplier",

    SERVICE:
      "service",

    RANK_TIMING:
      "rank_timing",

    FORECAST:
      "forecast",

    RETIREMENT_SYSTEM:
      "retirement_system",

    RETIREMENT_CONCEPT:
      "retirement_concept",

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
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
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
    value ===
      true ||
    value ===
      false
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
          item !==
            undefined &&
          item !==
            null
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
      nested ===
        undefined ||
      nested ===
        null ||
      nested ===
        ""
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
              item !==
                undefined &&
              item !==
                null
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


function firstSentence(
  text
) {
  const value =
    clean(
      text
    );

  if (
    !value
  ) {
    return "";
  }

  const match =
    value.match(
      /^(.+?[.!?])(?:\s|$)/
    );

  return match
    ? match[1]
    : value.slice(
        0,
        180
      );
}


function money(
  value
) {
  const number =
    finiteNumber(
      value
    );

  if (
    number ===
      null
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
    number ===
      null
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
    number ===
      null
  ) {
    return "";
  }

  return (
    number.toLocaleString(
      "en-US",
      {
        maximumFractionDigits:
          4
      }
    ) +
    "%"
  );
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
        "Ask Amy Retirement could not complete the request.",

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
  6. RETIREMENT SNAPSHOT SANITIZER

  IMPORTANT:
  -------------------------------------------------------------
  Do not pass the complete browser state blindly into OpenAI.

  Preserve only the fields required to explain the calculator.

  The full 36-element monthly basic-pay array is intentionally
  omitted from the OpenAI truth packet in v1.
============================================================ */

function sanitizePeriod(
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

    label:
      clean(
        raw.label
      ) ||
      null,

    startMonth:
      clean(
        raw.startMonth
      ) ||
      null,

    endMonth:
      clean(
        raw.endMonth
      ) ||
      null,

    averageBasicPay:
      finiteNumber(
        raw.averageBasicPay
      )
  });
}


function sanitizeCalendarYear(
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
    year:
      finiteNumber(
        raw.year
      ),

    monthsIncluded:
      finiteNumber(
        raw.monthsIncluded
      ),

    averageBasicPay:
      finiteNumber(
        raw.averageBasicPay
      )
  });
}


function sanitizeRetirementSnapshot(
  raw
) {
  if (
    !isPlainObject(
      raw
    )
  ) {
    return null;
  }

  const inputs =
    isPlainObject(
      raw.inputs
    )
      ? raw.inputs
      : {};

  const service =
    isPlainObject(
      raw.service
    )
      ? raw.service
      : {};

  const assumptions =
    isPlainObject(
      raw.assumptions
    )
      ? raw.assumptions
      : {};

  const projection =
    isPlainObject(
      raw.projection
    )
      ? raw.projection
      : {};

  const retirement =
    isPlainObject(
      raw.retirement
    )
      ? raw.retirement
      : {};

  const sourceVersions =
    isPlainObject(
      raw.sourceVersions
    )
      ? raw.sourceVersions
      : {};

  const periods =
    Array.isArray(
      projection.periods
    )
      ? projection
          .periods
          .slice(
            0,
            3
          )
          .map(
            sanitizePeriod
          )
          .filter(
            Boolean
          )
      : [];

  const calendarYears =
    Array.isArray(
      projection.calendarYears
    )
      ? projection
          .calendarYears
          .slice(
            0,
            12
          )
          .map(
            sanitizeCalendarYear
          )
          .filter(
            Boolean
          )
      : [];

  return stripEmpty({
    ok:
      raw.ok ===
      true,

    runtimeVersion:
      clean(
        raw.runtimeVersion
      ) ||
      null,

    projectionVersion:
      clean(
        raw.projectionVersion
      ) ||
      null,

    payBaselineVersion:
      clean(
        raw.payBaselineVersion
      ) ||
      null,

    generatedAt:
      clean(
        raw.generatedAt
      ) ||
      null,

    inputs: {
      retirementSystem:
        clean(
          inputs.retirementSystem
        ) ||
        null,

      retirementSystemLabel:
        clean(
          inputs.retirementSystemLabel
        ) ||
        null,

      retirementRank:
        clean(
          inputs.retirementRank
        ) ||
        null,

      retirementRankLabel:
        clean(
          inputs.retirementRankLabel
        ) ||
        null,

      promotedFinal36:
        boolOrNull(
          inputs.promotedFinal36
        ),

      previousRank:
        clean(
          inputs.previousRank
        ) ||
        null,

      previousRankLabel:
        clean(
          inputs.previousRankLabel
        ) ||
        null,

      promotionDate:
        clean(
          inputs.promotionDate
        ) ||
        null,

      entryDate:
        clean(
          inputs.entryDate
        ) ||
        null,

      retirementDate:
        clean(
          inputs.retirementDate
        ) ||
        null,

      longRangeGrowthPercent:
        finiteNumber(
          inputs.longRangeGrowthPercent
        )
    },

    service: {
      serviceMonths:
        finiteNumber(
          service.serviceMonths
        ),

      yearsOfService:
        finiteNumber(
          service.yearsOfService
        ),

      display:
        clean(
          service.display
        ) ||
        null
    },

    assumptions: {
      retirementRankAppliedAcrossHigh36:
        boolOrNull(
          assumptions
            .retirementRankAppliedAcrossHigh36
        ),

      promotionRankHistoryApplied:
        boolOrNull(
          assumptions
            .promotionRankHistoryApplied
        ),

      promotionMonthUsesRetirementRank:
        boolOrNull(
          assumptions
            .promotionMonthUsesRetirementRank
        ),

      retirementDateTreatedAsEffectiveDate:
        boolOrNull(
          assumptions
            .retirementDateTreatedAsEffectiveDate
        ),

      forecastSchedule:
        isPlainObject(
          assumptions.forecastSchedule
        )
          ? clone(
              assumptions.forecastSchedule,
              {}
            )
          : {},

      longRangeGrowthPercent:
        finiteNumber(
          assumptions
            .longRangeGrowthPercent
        ),

      historicalYearsBefore2026AreReconstructed:
        boolOrNull(
          assumptions
            .historicalYearsBefore2026AreReconstructed
        )
    },

    projection: {
      firstHigh36Month:
        clean(
          projection.firstHigh36Month
        ) ||
        null,

      finalHigh36Month:
        clean(
          projection.finalHigh36Month
        ) ||
        null,

      promotionDuringFinal36:
        boolOrNull(
          projection
            .promotionDuringFinal36
        ),

      previousRank:
        clean(
          projection.previousRank
        ) ||
        null,

      promotionDate:
        clean(
          projection.promotionDate
        ) ||
        null,

      promotionMonth:
        clean(
          projection.promotionMonth
        ) ||
        null,

      high36AverageClient:
        finiteNumber(
          projection
            .high36AverageClient
        ),

      periods,

      calendarYears
    },

    retirement: {
      retirementSystem:
        clean(
          retirement
            .retirementSystem
        ) ||
        null,

      yearsOfService:
        finiteNumber(
          retirement
            .yearsOfService
        ),

      serviceMonths:
        finiteNumber(
          retirement
            .serviceMonths
        ),

      multiplier:
        finiteNumber(
          retirement.multiplier
        ),

      multiplierPercent:
        finiteNumber(
          retirement
            .multiplierPercent
        ),

      retiredPayBase:
        finiteNumber(
          retirement
            .retiredPayBase
        ),

      baseMethod:
        clean(
          retirement
            .baseMethod
        ) ||
        null,

      monthsUsedForBase:
        finiteNumber(
          retirement
            .monthsUsedForBase
        ),

      grossMonthlyRetiredPay:
        finiteNumber(
          retirement
            .grossMonthlyRetiredPay
        ),

      grossYearlyRetiredPay:
        finiteNumber(
          retirement
            .grossYearlyRetiredPay
        ),

      rateVersion:
        clean(
          retirement
            .rateVersion
        ) ||
        null
    },

    sourceVersions:
      clone(
        sourceVersions,
        {}
      )
  });
}


/* ============================================================
  7. AUTHORITATIVE SNAPSHOT CHECK
============================================================ */

function hasAuthoritativeRetirementSnapshot(
  snapshot
) {
  if (
    !isPlainObject(
      snapshot
    ) ||
    snapshot.ok !==
      true
  ) {
    return false;
  }

  const retirement =
    snapshot.retirement;

  if (
    !isPlainObject(
      retirement
    )
  ) {
    return false;
  }

  const monthsUsedForBase =
    finiteNumber(
      retirement
        .monthsUsedForBase
    );

  const retiredPayBase =
    finiteNumber(
      retirement
        .retiredPayBase
    );

  const multiplier =
    finiteNumber(
      retirement.multiplier
    );

  const grossMonthlyRetiredPay =
    finiteNumber(
      retirement
        .grossMonthlyRetiredPay
    );

  return Boolean(
    monthsUsedForBase ===
      36 &&
    retiredPayBase !==
      null &&
    retiredPayBase >
      0 &&
    multiplier !==
      null &&
    multiplier >
      0 &&
    grossMonthlyRetiredPay !==
      null &&
    grossMonthlyRetiredPay >=
      0
  );
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
      "retirement-calculator",

    widget:
      clean(
        context.widget ||
        body.widget
      ).slice(
        0,
        200
      ) ||
      "ask-amy-retirement",

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
  9. RETIREMENT-ONLY INTENT DETECTION
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
      .RETIREMENT_CONCEPT;
  }

  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(
      text
    )
  ) {
    return INTENTS
      .GREETING;
  }

  if (
    /\bwhat can you do\b|\bhow can you help\b|\bwhat do you do\b|\bwho are you\b/.test(
      text
    )
  ) {
    return INTENTS
      .CAPABILITIES;
  }


  /*
    Retirement-specific phrases are evaluated BEFORE out-of-scope
    detection so terms such as "promotion" are not confused with WAPS.
  */

  if (
    /\bhigh[\s-]?3\b|\bhigh[\s-]?36\b|\b36[\s-]?month pay base\b|\bretired pay base\b/.test(
      text
    )
  ) {
    return INTENTS
      .HIGH3;
  }

  if (
    /\bmultiplier\b|\b2\.5 percent\b|\b2 percent\b|\bservice multiplier\b|\bretirement percentage\b/.test(
      text
    )
  ) {
    return INTENTS
      .MULTIPLIER;
  }

  if (
    /\bservice months\b|\byears of service\b|\bcredited service\b|\bcreditable service\b|\b20 years\b|\bservice at retirement\b/.test(
      text
    )
  ) {
    return INTENTS
      .SERVICE;
  }

  if (
    /\bprevious rank\b|\bretirement rank\b|\brank timing\b|\bpromotion date\b|\bpromoted\b|\bpromotion month\b|\bfinal 36 months\b/.test(
      text
    )
  ) {
    return INTENTS
      .RANK_TIMING;
  }

  if (
    /\bfuture pay\b|\bpay forecast\b|\bpay projection\b|\b2031\b|\b2027\b|\b2028\b|\b2029\b|\b2030\b|\blong[-\s]?range\b|\bhistorical reconstruction\b/.test(
      text
    )
  ) {
    return INTENTS
      .FORECAST;
  }

  if (
    /\bbrs\b|\bblended retirement system\b|\bhigh[\s-]?3 system\b|\bretirement system\b/.test(
      text
    )
  ) {
    return INTENTS
      .RETIREMENT_SYSTEM;
  }

  if (
    /\bmy estimate\b|\bmy retirement\b|\bretirement estimate\b|\bmonthly retired pay\b|\byearly retired pay\b|\bgross retired pay\b|\bhow much.*retire\b|\bwhat will i get\b|\bwhat will i make\b/.test(
      text
    )
  ) {
    return INTENTS
      .EXPLAIN_ESTIMATE;
  }


  /*
    Explicitly unrelated TheWing topics.
  */

  if (
    /\bbah\b|\bbasic allowance for housing\b|\bpcs\b|\bduty station\b|\bbase demographics\b|\bmortgage\b|\bhome loan\b|\bva loan\b|\bfunding fee\b|\bcoe\b|\baffordability\b|\bbuy a house\b|\brent vs buy\b|\bpt test\b|\bpfra\b|\bfitness test\b|\bwaps\b|\bpromotion testing\b|\bskt\b|\bpfe\b|\bva disability\b|\bdisability rating\b|\bfinancial readiness\b/.test(
      text
    )
  ) {
    return INTENTS
      .OUT_OF_SCOPE;
  }


  /*
    General retirement language remains inside Retirement Amy.
  */

  if (
    /\bretire\b|\bretirement\b|\bretired pay\b|\bmilitary pension\b|\bbasic pay\b|\beffective date\b/.test(
      text
    )
  ) {
    return INTENTS
      .RETIREMENT_CONCEPT;
  }

  return INTENTS
    .RETIREMENT_CONCEPT;
}


/* ============================================================
  10. RETIREMENT AUTHORITY
============================================================ */

function buildRetirementAuthority(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return {
      authority:
        "no_current_authoritative_retirement_result",

      rules: [
        "No authoritative Retirement Calculator result is currently supplied.",
        "Do not claim the member has a current calculated retirement estimate.",
        "You may explain general Retirement Calculator concepts without inventing personal numbers.",
        "If the user asks about their specific result, tell them to calculate or refresh the Retirement Calculator first."
      ]
    };
  }

  return {
    authority:
      "browser_displayed_retirement_calculator_snapshot",

    rules: [
      "The supplied Retirement Calculator snapshot is authoritative.",
      "Repeat its numeric results exactly.",
      "Do not recalculate High-3.",
      "Do not recalculate High-36.",
      "Do not recalculate credited service.",
      "Do not recalculate years of service.",
      "Do not recalculate the retirement multiplier.",
      "Do not recalculate retired pay.",
      "Do not replace the supplied retirement result with model math.",
      "Do not invent another rank history.",
      "Do not invent another promotion date.",
      "Do not alter the High-36 window.",
      "Do not alter the supplied historical reconstruction assumptions.",
      "Do not alter the supplied future pay forecast.",
      "Retirement Effective Date is the date retirement begins.",
      "Creditable active-duty service ends the day before the Retirement Effective Date.",
      "When a final-36 promotion is present, months before the promotion month use Previous Rank and the promotion month itself and later months use Retirement Rank.",
      "Gross retired pay is before taxes, SBP, and other deductions.",
      "Clearly distinguish reconstructed historical pay, official published pay, and future projected pay when relevant."
    ],

    displayed_retirement_snapshot:
      snapshot
  };
}


/* ============================================================
  11. DIRECT RETIREMENT REPLIES
============================================================ */

function buildGreetingReply() {
  return (
    "Hey — I’m Amy, your Retirement Concierge. " +
    "I can explain your retirement estimate, High-3, service credit, multiplier, rank timing, High-36 window, and projected gross retired pay. " +
    "TheWing calculates; I explain what it means."
  );
}


function buildCapabilitiesReply() {
  return (
    "I’m dedicated to this Retirement Calculator. " +
    "I can explain your projected monthly and yearly retired pay, High-3 and High-36 window, High-3 versus BRS, credited service, multiplier, retirement-effective date, rank and promotion timing, historical pay reconstruction, and future basic-pay assumptions."
  );
}


function buildOutOfScopeReply() {
  return (
    "I’m the Retirement Calculator concierge, so I’m keeping this session focused on retirement pay, High-3, service credit, multiplier, rank timing, and your retirement projection. " +
    "Use the appropriate TheWing.ai tool for that other topic."
  );
}


function buildNoResultReply() {
  return (
    "I can explain retirement concepts now, but I don’t have a current calculated retirement result to analyze. " +
    "Run the Retirement Calculator first, then I can walk through the exact High-3, multiplier, service credit, and projected retired pay it returns."
  );
}


function buildEstimateFallback(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return buildNoResultReply();
  }

  const retirement =
    snapshot.retirement ||
    {};

  const service =
    snapshot.service ||
    {};

  const projection =
    snapshot.projection ||
    {};

  const inputs =
    snapshot.inputs ||
    {};

  const pieces =
    [];

  const monthly =
    money(
      retirement
        .grossMonthlyRetiredPay
    );

  const yearly =
    money(
      retirement
        .grossYearlyRetiredPay
    );

  const high3 =
    money2(
      retirement
        .retiredPayBase
    );

  const multiplier =
    percent(
      retirement
        .multiplierPercent
    );

  if (
    monthly
  ) {
    pieces.push(
      `Your projected gross monthly retired pay is ${monthly}.`
    );
  }

  if (
    yearly
  ) {
    pieces.push(
      `Projected gross yearly retired pay is ${yearly}.`
    );
  }

  if (
    high3
  ) {
    pieces.push(
      `The calculator's High-3 retired-pay base is ${high3}.`
    );
  }

  if (
    multiplier
  ) {
    pieces.push(
      `The returned retirement multiplier is ${multiplier}.`
    );
  }

  if (
    service.display
  ) {
    pieces.push(
      `Credited service at retirement is ${service.display}.`
    );
  }

  if (
    projection
      .firstHigh36Month &&
    projection
      .finalHigh36Month
  ) {
    pieces.push(
      `The High-36 window runs from ${projection.firstHigh36Month} through ${projection.finalHigh36Month}.`
    );
  }

  if (
    inputs
      .promotedFinal36 ===
    true
  ) {
    pieces.push(
      `The projection applies ${inputs.previousRank || "the previous rank"} before the promotion month and ${inputs.retirementRank || "the retirement rank"} from the promotion month forward.`
    );
  }

  pieces.push(
    "These are gross planning values before taxes, SBP, or other deductions."
  );

  return pieces.join(
    " "
  );
}


function buildHigh3Fallback(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return (
      "High-3 uses the calculator's 36-month basic-pay window to establish the retired-pay base. " +
      "Run the calculator first and I can explain the exact window and average shown in your result."
    );
  }

  const projection =
    snapshot.projection ||
    {};

  const retirement =
    snapshot.retirement ||
    {};

  const parts =
    [];

  if (
    projection
      .firstHigh36Month &&
    projection
      .finalHigh36Month
  ) {
    parts.push(
      `Your High-36 window runs from ${projection.firstHigh36Month} through ${projection.finalHigh36Month}.`
    );
  }

  if (
    finiteNumber(
      retirement
        .retiredPayBase
    ) !==
    null
  ) {
    parts.push(
      `The official retirement result uses a High-3 base of ${money2(retirement.retiredPayBase)}.`
    );
  }

  if (
    Number(
      retirement
        .monthsUsedForBase
    ) ===
    36
  ) {
    parts.push(
      "The retirement engine used exactly 36 monthly basic-pay values."
    );
  }

  parts.push(
    "Amy is explaining that result, not recalculating it."
  );

  return parts.join(
    " "
  );
}


function buildMultiplierFallback(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return (
      "Your retirement multiplier depends on the retirement system and credited service used by the Retirement Calculator. " +
      "Run the calculator first and I can explain the exact multiplier returned for your scenario."
    );
  }

  const retirement =
    snapshot.retirement ||
    {};

  const service =
    snapshot.service ||
    {};

  const inputs =
    snapshot.inputs ||
    {};

  return [
    `The calculator returned a ${percent(retirement.multiplierPercent)} retirement multiplier.`,
    service.display
      ? `It is tied to the ${service.display} of credited service shown in this result.`
      : "",
    inputs.retirementSystemLabel ||
    inputs.retirementSystem
      ? `Your selected retirement system is ${inputs.retirementSystemLabel || inputs.retirementSystem}.`
      : "",
    "I’m treating the calculator's returned multiplier as authoritative rather than recomputing it."
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );
}


function buildServiceFallback(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return (
      "The Retirement Calculator measures credited service through the day before the Retirement Effective Date. " +
      "Calculate a scenario first and I can explain the exact service months and years it uses."
    );
  }

  const service =
    snapshot.service ||
    {};

  const inputs =
    snapshot.inputs ||
    {};

  const pieces =
    [];

  if (
    service.display
  ) {
    pieces.push(
      `The calculator shows ${service.display} of credited service at retirement.`
    );
  }

  if (
    finiteNumber(
      service.serviceMonths
    ) !==
    null
  ) {
    pieces.push(
      `That is ${service.serviceMonths} completed service months.`
    );
  }

  if (
    inputs.retirementDate
  ) {
    pieces.push(
      `Your Retirement Effective Date is ${inputs.retirementDate}; the calculator treats service as ending the day before that date.`
    );
  }

  return pieces.join(
    " "
  );
}


function buildRankTimingFallback(
  snapshot
) {
  if (
    !hasAuthoritativeRetirementSnapshot(
      snapshot
    )
  ) {
    return (
      "For a promotion during the final 36 months, the Retirement Calculator uses Previous Rank for months before the promotion month and Retirement Rank beginning with the promotion month itself. " +
      "Run a calculation and I can explain the exact rank timing in your result."
    );
  }

  const inputs =
    snapshot.inputs ||
    {};

  const projection =
    snapshot.projection ||
    {};

  if (
    inputs.promotedFinal36 !==
    true
  ) {
    return (
      `Your current result does not report a promotion during the final 36 months, so ${inputs.retirementRank || "Retirement Rank"} is applied across the High-36 window.`
    );
  }

  return (
    `Your current projection uses ${inputs.previousRank || projection.previousRank || "Previous Rank"} for months before ${projection.promotionMonth || inputs.promotionDate || "the promotion month"}, then uses ${inputs.retirementRank || "Retirement Rank"} beginning with the promotion month itself and for every later High-36 month.`
  );
}


function buildForecastFallback(
  snapshot
) {
  const assumptions =
    snapshot
      ?.assumptions ||
    {};

  const forecast =
    isPlainObject(
      assumptions
        .forecastSchedule
    )
      ? assumptions
          .forecastSchedule
      : {};

  const parts =
    [];

  if (
    Object.keys(
      forecast
    ).length
  ) {
    const values =
      [];

    for (
      const key
      of [
        "2027",
        "2028",
        "2029",
        "2030",
        "2031+"
      ]
    ) {
      if (
        forecast[
          key
        ] !==
        undefined
      ) {
        values.push(
          `${key}: ${forecast[key]}%`
        );
      }
    }

    if (
      values.length
    ) {
      parts.push(
        `The current planning schedule is ${values.join(", ")}.`
      );
    }
  }

  if (
    assumptions
      .historicalYearsBefore2026AreReconstructed ===
    true
  ) {
    parts.push(
      "Pre-2026 values in the supported window are reconstructed planning values rather than archived historical pay tables."
    );
  }

  if (
    !parts.length
  ) {
    return (
      "Future basic-pay values in this calculator are planning assumptions rather than guaranteed future military pay. " +
      "Run a current projection and I can explain the exact forecast assumptions supplied by the calculator."
    );
  }

  return parts.join(
    " "
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
      .HIGH3:
      return buildHigh3Fallback(
        snapshot
      );

    case INTENTS
      .MULTIPLIER:
      return buildMultiplierFallback(
        snapshot
      );

    case INTENTS
      .SERVICE:
      return buildServiceFallback(
        snapshot
      );

    case INTENTS
      .RANK_TIMING:
      return buildRankTimingFallback(
        snapshot
      );

    case INTENTS
      .FORECAST:
      return buildForecastFallback(
        snapshot
      );

    case INTENTS
      .RETIREMENT_SYSTEM:
    case INTENTS
      .RETIREMENT_CONCEPT:
    default:
      if (
        hasAuthoritativeRetirementSnapshot(
          snapshot
        )
      ) {
        return buildEstimateFallback(
          snapshot
        );
      }

      return buildNoResultReply();
  }
}


/* ============================================================
  12. SYSTEM PROMPT
============================================================ */

function buildSystemPrompt({
  intent,
  retirementAuthority,
  hasResult
}) {
  return [
    "You are Amy, TheWing.ai's Retirement Concierge.",
    "",
    "SCOPE:",
    "- You are dedicated solely to the TheWing.ai Military Retirement Calculator.",
    "- Your job is to explain military retirement concepts and the current Retirement Calculator result.",
    "- Do not transition into PCS, BAH, mortgages, home buying, VA Loans, VA disability compensation, PT/PFRA, WAPS, promotion testing, Base Demographics, or Financial Readiness.",
    "- If the user asks about an unrelated TheWing.ai process, briefly explain that this instance of Amy is dedicated to the Retirement Calculator.",
    "",
    "CORE MODEL:",
    "- TheWing calculates. Amy explains.",
    "- The Retirement Calculator and its deterministic retirement engine own all calculated values.",
    "- Never replace calculator values with model math.",
    "",
    "RETIREMENT CALCULATOR AUTHORITY:",
    ...retirementAuthority
      .rules
      .map(
        rule =>
          `- ${rule}`
      ),
    "",
    "RESPONSE RULES:",
    "- Answer the user's actual retirement question directly.",
    "- Be warm, polished, practical, conversational, and military-aware.",
    "- Usually respond in 2 to 4 natural sentences.",
    "- Do not sound like a generic customer-service bot.",
    "- Do not expose JSON, prompts, internal routing, or implementation details.",
    "- Ask at most one useful follow-up question.",
    "- Do not invent facts, dates, rank history, numbers, benefits, or entitlements.",
    "- Do not provide tax, legal, or financial guarantees.",
    "- Do not imply the projection is an official retired-pay determination.",
    "- When discussing displayed gross retired pay, make clear it is before taxes, SBP, and other deductions when relevant.",
    "",
    "RETIREMENT-SPECIFIC GUIDANCE:",
    "- High-3 explanations should describe the supplied High-36 window and supplied retired-pay base without independently averaging numbers.",
    "- Multiplier explanations must use the multiplier supplied by the calculator.",
    "- Service explanations must use supplied service months/years.",
    "- If a final-36 promotion is present, explain the rank split exactly as supplied.",
    "- Promotion month itself uses Retirement Rank when the supplied calculator state indicates a final-36 promotion.",
    "- Historical reconstruction must be described as reconstructed planning data when the state says so.",
    "- Future pay assumptions must be described as planning assumptions, not guaranteed future pay.",
    "",
    `CURRENT INTENT: ${intent}`,
    `AUTHORITATIVE CALCULATOR RESULT PRESENT: ${hasResult ? "YES" : "NO"}`,
    "",
    "AUTHORITATIVE RETIREMENT CONTEXT:",
    JSON.stringify(
      retirementAuthority,
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
  retirement,
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
      retirement_only:
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

      do_not_change_rank_history:
        true,

      do_not_change_high36:
        true
    },

    retirement_snapshot:
      retirement ||
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
        "[ask-amy-retirement] OpenAI request failed:",
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
        "[ask-amy-retirement] OpenAI request timed out."
      );
    } else {
      console.warn(
        "[ask-amy-retirement] OpenAI request failed:",
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
  16. SIMPLE RETIREMENT MEMORY

  Memory is conversational convenience only.

  It must NEVER become numeric authority.
============================================================ */

function buildMemoryPatch({
  intent,
  retirement
}) {
  const patch = {
    last_retirement_intent:
      intent,

    last_updated_at:
      new Date()
        .toISOString()
  };

  if (
    hasAuthoritativeRetirementSnapshot(
      retirement
    )
  ) {
    const inputs =
      retirement.inputs ||
      {};

    if (
      inputs.retirementSystem
    ) {
      patch
        .last_retirement_system =
        clean(
          inputs.retirementSystem
        ).slice(
          0,
          40
        );
    }

    if (
      inputs.retirementRank
    ) {
      patch
        .last_retirement_rank =
        clean(
          inputs.retirementRank
        ).slice(
          0,
          20
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
      Accept retirement snapshot from either:

      body.retirement

      OR

      body.context.retirement
    */

    const rawRetirement =
      isPlainObject(
        body.retirement
      )
        ? body.retirement

        : isPlainObject(
            body
              ?.context
              ?.retirement
          )
          ? body
              .context
              .retirement

          : null;

    const retirement =
      sanitizeRetirementSnapshot(
        rawRetirement
      );

    const hasResult =
      hasAuthoritativeRetirementSnapshot(
        retirement
      );

    const intent =
      detectIntent(
        message
      );

    const retirementAuthority =
      buildRetirementAuthority(
        retirement
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
        retirement
      );

    let replyRaw =
      directReply;

    let openaiUsed =
      false;


    /* ========================================================
      NORMAL RETIREMENT EXPLANATION
    ======================================================== */

    if (
      !replyRaw
    ) {
      const systemPrompt =
        buildSystemPrompt({
          intent,
          retirementAuthority,
          hasResult
        });

      const userPayload =
        buildUserPayload({
          message,
          intent,
          retirement,
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
          retirement
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
        retirement
      });


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
          "ask-amy-retirement",

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
          retirement_snapshot:
            hasResult,

          calculator_authority:
            hasResult
              ? "browser_displayed_retirement_calculator_snapshot"
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

        warnings:
          [
            "PUBLIC_SESSION_ONLY",

            ...(
              !hasResult &&
              [
                INTENTS
                  .EXPLAIN_ESTIMATE,
                INTENTS
                  .HIGH3,
                INTENTS
                  .MULTIPLIER,
                INTENTS
                  .SERVICE,
                INTENTS
                  .RANK_TIMING
              ].includes(
                intent
              )
                ? [
                    "NO_CURRENT_RETIREMENT_RESULT"
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
          ],

        latency_ms:
          Date.now() -
          startedAt
      }
    );

  } catch (
    error
  ) {
    console.error(
      "[ask-amy-retirement] server error:",
      error
        ?.message ||
      error
    );

    return respondError(
      event,
      500,
      "Ask Amy Retirement could not complete the request.",
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

    import retirementAmy from "...";
    retirementAmy.handler(...)

============================================================ */

export default Object.freeze({
  version:
    VERSION,

  scope:
    SCOPE,

  handler
});
