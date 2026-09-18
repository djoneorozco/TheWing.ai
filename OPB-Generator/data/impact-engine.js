/**
 * PCSUnited / TheWing.ai
 * Air Force EPB Impact Intelligence Engine
 *
 * File:
 *   js/impact-engine.js
 *
 * Version:
 *   1.0.0
 *
 * Purpose:
 *   Deterministically organize accomplishment facts, derive only facts that
 *   logically follow from verified inputs, discover plausible downstream
 *   impact avenues, test causal bridges, and generate coaching questions
 *   BEFORE Amy writes a Performance Statement.
 *
 * Core philosophy:
 *
 *   Explore impact aggressively.
 *   Assert impact conservatively.
 *
 *   RAW INPUT
 *      ↓
 *   FACTS
 *      ↓
 *   DERIVATIONS
 *      ↓
 *   IMPACT HYPOTHESES
 *      ↓
 *   CAUSAL-BRIDGE VERIFICATION
 *      ↓
 *   WRITING-SAFE IMPACTS
 *
 * TheWing validates.
 * Amy coaches.
 *
 * IMPORTANT:
 *   This engine does NOT fabricate mission effects, readiness gains,
 *   mishap prevention, cost savings, awards, deployment effects, sortie
 *   effects, personnel counts, percentages, time savings, or organizational
 *   reach.
 *
 *   Hypotheses are allowed internally so Amy can ask intelligent questions.
 *   Hypotheses are NEVER automatically promoted to final-statement facts.
 *
 * Source model:
 *   - Current Air Force Performance Statement guidance: action + impact/result/outcome.
 *   - Action / Scope / Result / Impact is a PCSUnited writing framework.
 *   - Tactical → Operational → Strategic impact exploration is a coaching model
 *     inspired by Air University writing instruction; it is NOT encoded here as
 *     a mandatory Air Force evaluation format.
 */


/* ================================================================
   VERSION / SOURCE METADATA
   ================================================================ */

export const IMPACT_ENGINE_VERSION = "1.0.0";

export const IMPACT_ENGINE_SOURCE = Object.freeze({
  product: "PCSUnited / TheWing.ai",
  module: "Impact Intelligence Engine",
  doctrine: [
    {
      name: "Air Force Performance Statement guidance",
      type: "official-guidance",
      use: "Performance Statements should communicate action and impact/result/outcome.",
    },
    {
      name: "Action / Scope / Result / Impact",
      type: "product-framework",
      use: "PCSUnited accomplishment-analysis model.",
    },
    {
      name: "Tactical / Operational / Strategic impact exploration",
      type: "coaching-framework",
      use: "Used to investigate downstream consequence without assuming it occurred.",
    },
  ],
});


/* ================================================================
   ENUMS / CONSTANTS
   ================================================================ */

export const EVIDENCE_STATUS = Object.freeze({
  CONFIRMED: "confirmed",
  DERIVED: "derived",
  HYPOTHESIS: "hypothesis",
  UNSUPPORTED: "unsupported",
  REJECTED: "rejected",
});

export const IMPACT_LEVEL = Object.freeze({
  TACTICAL: "tactical",
  OPERATIONAL: "operational",
  STRATEGIC: "strategic",
});

export const IMPACT_DOMAIN = Object.freeze({
  MISSION: "mission",
  READINESS: "readiness",
  PEOPLE: "people",
  TRAINING: "training",
  SAFETY: "safety",
  RESOURCES: "resources",
  TIME: "time",
  MANPOWER: "manpower",
  QUALITY: "quality",
  AVAILABILITY: "availability",
  DEPLOYMENT: "deployment",
  SORTIE: "sortie",
  COMPLIANCE: "compliance",
  INNOVATION: "innovation",
  PROCESS: "process",
  ORGANIZATIONAL: "organizational",
});

export const FACT_KIND = Object.freeze({
  ACTION: "action",
  SCOPE: "scope",
  RESULT: "result",
  IMPACT: "impact",
  CONTEXT: "context",
  METRIC: "metric",
});

export const BRIDGE_STATUS = Object.freeze({
  COMPLETE: "complete",
  PARTIAL: "partial",
  MISSING: "missing",
  CONTRADICTED: "contradicted",
});

export const GENERATION_DECISION = Object.freeze({
  GENERATE: "GENERATE",
  COACH_FIRST: "COACH_FIRST",
  GENERATE_WITH_CAUTION: "GENERATE_WITH_CAUTION",
});

export const CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
});


/* ================================================================
   GENERIC HELPERS
   ================================================================ */

function normalizeString(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value)
    .trim()
    .toLowerCase()
    .replace(/[$,%>,<~\s,]/g, "");

  const match = raw.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/i);
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;

  const multiplier = {
    k: 1_000,
    m: 1_000_000,
    b: 1_000_000_000,
  }[match[2]] || 1;

  return base * multiplier;
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function uniqueBy(items = [], keyFn) {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safeDivide(numerator, denominator) {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator)) {
    return null;
  }

  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function approximatelyEqual(
  a,
  b,
  tolerance = 0.01
) {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
    return false;
  }

  const scale = Math.max(
    1,
    Math.abs(a),
    Math.abs(b)
  );

  return (
    Math.abs(a - b) <=
    scale * tolerance
  );
}

function extractDollarValues(
  text = ""
) {
  const values = [];

  const regex =
    /\$\s?(\d+(?:\.\d+)?)\s*([kmb])?/gi;

  let match;

  while (
    (match = regex.exec(text)) !== null
  ) {
    const parsed =
      asNumber(
        `${match[1]}${match[2] || ""}`
      );

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  return values;
}

function extractPercentValues(
  text = ""
) {
  const values = [];

  const regex =
    /(\d+(?:\.\d+)?)\s*%/g;

  let match;

  while (
    (match = regex.exec(text)) !== null
  ) {
    const parsed =
      Number(match[1]);

    if (Number.isFinite(parsed)) {
      values.push(parsed);
    }
  }

  return values;
}

function classifyPercentIntent(
  context = ""
) {
  const text =
    normalizeLower(context);

  if (
    /\b(?:increas(?:e|ed|ing)|rais(?:e|ed|ing)|boost(?:ed|ing)?|grew|growth|expand(?:ed|ing)?)\b/
      .test(text)
  ) {
    return "increase";
  }

  if (
    /\b(?:reduc(?:e|ed|ing|tion)|cut|decreas(?:e|ed|ing)|lower(?:ed|ing)?)\b/
      .test(text)
  ) {
    return "reduction";
  }

  if (
    /\b(?:pass rate|qualification rate|completion rate|success rate)\b/
      .test(text)
  ) {
    return "rate";
  }

  if (
    /\b(?:share|represented|accounted for|comprised|of the resulting|of resulting)\b/
      .test(text)
  ) {
    return "share";
  }

  return "generic";
}

function extractPercentClaims(
  text = ""
) {
  const claims = [];

  const regex =
    /(\d+(?:\.\d+)?)\s*%/g;

  let match;

  while (
    (match = regex.exec(text)) !== null
  ) {
    const value =
      Number(match[1]);

    if (!Number.isFinite(value)) {
      continue;
    }

    const start =
      Math.max(
        0,
        match.index - 90
      );

    const end =
      Math.min(
        text.length,
        regex.lastIndex + 30
      );

    const context =
      text.slice(start, end);

    claims.push({
      value,
      context,
      intent:
        classifyPercentIntent(
          context
        ),
    });
  }

  return claims;
}

function metricPercentIntent(
  metric = {}
) {
  const key =
    `${metric.id || ""} ${metric.label || ""}`
      .toLowerCase();

  if (/increase|growth/.test(key)) {
    return "increase";
  }

  if (
    /reduction|reduced|decrease|cut/
      .test(key)
  ) {
    return "reduction";
  }

  if (
    /pass rate|qualification rate|completion rate|success rate/
      .test(key)
  ) {
    return "rate";
  }

  if (
    /share|portion|represented|accounted/
      .test(key)
  ) {
    return "share";
  }

  return "generic";
}

function verifiedPercentMetricRows(
  facts = {},
  derivedMetrics = []
) {
  const rows = [];

  for (
    const [key, value]
    of Object.entries(facts)
  ) {
    if (
      !/(percent|percentage|rate)$/i
        .test(key)
    ) {
      continue;
    }

    const parsed =
      asNumber(value);

    if (parsed === null) {
      continue;
    }

    rows.push({
      value: parsed,

      intent:
        classifyPercentIntent(
          key.replace(
            /([A-Z])/g,
            " $1"
          )
        ),

      source:
        `facts.${key}`,
    });
  }

  if (
    Array.isArray(
      facts.verifiedPercentages
    )
  ) {
    for (
      const item
      of facts.verifiedPercentages
    ) {
      if (
        typeof item === "object" &&
        item !== null
      ) {
        const parsed =
          asNumber(item.value);

        if (parsed !== null) {
          rows.push({
            value: parsed,

            intent:
              item.intent ||
              "generic",

            source:
              item.source ||
              "facts.verifiedPercentages",
          });
        }
      }

      else {
        const parsed =
          asNumber(item);

        if (parsed !== null) {
          rows.push({
            value: parsed,
            intent: "generic",
            source:
              "facts.verifiedPercentages",
          });
        }
      }
    }
  }

  for (
    const metric
    of derivedMetrics
  ) {
    if (
      metric.unit !== "percent"
    ) {
      continue;
    }

    const parsed =
      asNumber(metric.value);

    if (parsed === null) {
      continue;
    }

    rows.push({
      value: parsed,

      intent:
        metricPercentIntent(
          metric
        ),

      source:
        metric.id,
    });
  }

  return rows;
}

function collectVerifiedPercentValues(
  facts = {},
  derivedMetrics = []
) {
  const values = [];

  for (
    const [key, value]
    of Object.entries(facts)
  ) {
    if (
      !/(percent|percentage|rate)$/i
        .test(key)
    ) {
      continue;
    }

    const parsed =
      asNumber(value);

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  if (
    Array.isArray(
      facts.verifiedPercentages
    )
  ) {
    for (
      const value
      of facts.verifiedPercentages
    ) {
      const parsed =
        asNumber(value);

      if (parsed !== null) {
        values.push(parsed);
      }
    }
  }

  for (
    const metric
    of derivedMetrics
  ) {
    if (
      metric.unit !== "percent"
    ) {
      continue;
    }

    const parsed =
      asNumber(metric.value);

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  return unique(values);
}

function collectVerifiedDollarValues(
  facts = {},
  derivedMetrics = []
) {
  const values = [];

  for (
    const key
    of [
      "costAvoidance",
      "savings",
    ]
  ) {
    const parsed =
      asNumber(facts[key]);

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  if (
    Array.isArray(
      facts.verifiedDollarAmounts
    )
  ) {
    for (
      const value
      of facts.verifiedDollarAmounts
    ) {
      const parsed =
        asNumber(value);

      if (parsed !== null) {
        values.push(parsed);
      }
    }
  }

  for (
    const metric
    of derivedMetrics
  ) {
    if (
      metric.unit !== "USD"
    ) {
      continue;
    }

    const parsed =
      asNumber(metric.value);

    if (parsed !== null) {
      values.push(parsed);
    }
  }

  return unique(values);
}

function makeId(
  prefix,
  value
) {
  const cleaned =
    normalizeLower(value)
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(
        0,
        48
      );

  return (
    `${prefix}_${cleaned || "item"}`
  );
}

function containsAny(
  text,
  patterns = []
) {
  return patterns.some(
    (pattern) =>
      pattern.test(text)
  );
}

function getPath(
  obj,
  path
) {
  return String(path)
    .split(".")
    .reduce(
      (acc, key) =>
        acc == null
          ? undefined
          : acc[key],
      obj
    );
}

function truthyPath(
  obj,
  path
) {
  const value =
    getPath(
      obj,
      path
    );

  return (
    value !== undefined &&
    value !== null &&
    value !== false &&
    value !== ""
  );
}


/* ================================================================
   INPUT NORMALIZATION
   ================================================================ */

/**
 * Preferred structured input:
 *
 * {
 *   accomplishment: "...",
 *   section: "Executing the Mission",
 *   ratedRank: "SrA",
 *
 *   facts: {
 *     action: "performed UT inspection",
 *     asset: "aircraft truss mount",
 *     peopleTrained: 3,
 *     costAvoidance: 50000,
 *     defectFound: true,
 *     repairCoordinated: true,
 *     replacementAvoided: true,
 *
 *     qualifiedBefore: 1,
 *     newlyQualified: 3,
 *     qualifiedAfter: 4,
 *
 *     aircraftGrounded: true,
 *     aircraftReturnedToService: true,
 *     deploymentSupported: false,
 *     sortieCount: null,
 *
 *     safetyCriticalComponent: null,
 *     documentedHazard: null
 *   },
 *
 *   confirmations: {
 *     "impact.aircraft_returned": true
 *   }
 * }
 */

export function normalizeImpactInput(
  input = {}
) {
  const accomplishment =
    normalizeString(
      input.accomplishment ||
      input.text ||
      input.source ||
      ""
    );

  const facts = {
    ...(input.facts || {}),
  };

  return {
    accomplishment,

    section:
      normalizeString(
        input.section ||
        ""
      ),

    ratedRank:
      normalizeString(
        input.ratedRank ||
        ""
      ),

    variation:
      normalizeString(
        input.variation ||
        ""
      ),

    facts,

    confirmations: {
      ...(input.confirmations || {}),
    },

    rejectedClaims:
      Array.isArray(
        input.rejectedClaims
      )
        ? [
            ...input.rejectedClaims,
          ]
        : [],

    metadata: {
      ...(input.metadata || {}),
    },
  };
}


/* ================================================================
   FACT RECORDS
   ================================================================ */

export function makeFact({
  id,
  kind = FACT_KIND.CONTEXT,
  label,
  value,
  unit = null,
  status =
    EVIDENCE_STATUS.CONFIRMED,
  source = "user",
  confidence =
    CONFIDENCE.HIGH,
  supports = [],
  notes = null,
} = {}) {
  return {
    id:
      id ||
      makeId(
        "fact",
        label ||
        String(value)
      ),

    kind,

    label:
      normalizeString(label),

    value,

    unit,

    status,

    source,

    confidence,

    supports: [
      ...supports,
    ],

    notes,
  };
}


/* ================================================================
   LIGHTWEIGHT RAW-TEXT SIGNAL DETECTION
   ================================================================ */

/**
 * This is intentionally conservative.
 * It detects signals; it does NOT treat every detected phrase as a complete fact.
 */

export const RAW_SIGNAL_RULES =
  Object.freeze([
    {
      id: "training",

      category:
        IMPACT_DOMAIN.TRAINING,

      patterns: [
        /\btrain(?:ed|ing)?\b/i,
        /\bmentor(?:ed|ing)?\b/i,
        /\bcoach(?:ed|ing)?\b/i,
        /\bqualified?\b/i,
        /\bcertif(?:ied|ication)\b/i,
      ],
    },

    {
      id: "inspection",

      category:
        IMPACT_DOMAIN.QUALITY,

      patterns: [
        /\binspect(?:ed|ion|ing)?\b/i,
        /\but inspection\b/i,
        /\bultrasonic\b/i,
        /\bndi\b/i,
        /\bnon[- ]destructive\b/i,
      ],
    },

    {
      id: "defect",

      category:
        IMPACT_DOMAIN.QUALITY,

      patterns: [
        /\bcrack(?:ed|s)?\b/i,
        /\bdefect(?:s|ive)?\b/i,
        /\bdiscrepanc(?:y|ies)\b/i,
        /\bfault(?:s|y)?\b/i,
        /\bdamage(?:d)?\b/i,
      ],
    },

    {
      id: "repair",

      category:
        IMPACT_DOMAIN.AVAILABILITY,

      patterns: [
        /\brepair(?:ed|s|ing)?\b/i,
        /\brestore(?:d|s|ing)?\b/i,
        /\breturned? to service\b/i,
        /\breturned? .* mission\b/i,
      ],
    },

    {
      id: "cost",

      category:
        IMPACT_DOMAIN.RESOURCES,

      patterns: [
        /\bsav(?:ed|ings?)\b/i,
        /\bcost avoidance\b/i,
        /\bavoided .*replacement\b/i,
        /\$\s?\d/i,
      ],
    },

    {
      id: "safety",

      category:
        IMPACT_DOMAIN.SAFETY,

      patterns: [
        /\bsafety\b/i,
        /\bmishap\b/i,
        /\bhazard\b/i,
        /\bflight[- ]critical\b/i,
        /\bcat(?:egory)?\s*1\b/i,
      ],
    },

    {
      id: "deployment",

      category:
        IMPACT_DOMAIN.DEPLOYMENT,

      patterns: [
        /\bdeploy(?:ed|ment|ing)?\b/i,
        /\bcontingency\b/i,
        /\bexpeditionary\b/i,
      ],
    },

    {
      id: "sortie",

      category:
        IMPACT_DOMAIN.SORTIE,

      patterns: [
        /\bsortie(?:s)?\b/i,
        /\bmission(?:s)?\b/i,
      ],
    },

    {
      id: "process_improvement",

      category:
        IMPACT_DOMAIN.PROCESS,

      patterns: [
        /\bprocess improvement\b/i,
        /\bstreamlin(?:ed|ing)\b/i,
        /\breduc(?:ed|tion)\b/i,
        /\bcut .*time\b/i,
        /\beliminat(?:ed|ion)\b/i,
        /\bnew technique\b/i,
        /\bnew procedure\b/i,
      ],
    },
  ]);


export function detectRawSignals(
  text = ""
) {
  const source =
    normalizeString(text);

  return RAW_SIGNAL_RULES
    .filter(
      (rule) =>
        containsAny(
          source,
          rule.patterns
        )
    )
    .map(
      (rule) => ({
        id: rule.id,
        category:
          rule.category,
      })
    );
}


/* ================================================================
   NUMERIC DERIVATION ENGINE
   ================================================================ */

/**
 * Derivations are permitted only when the math follows directly from
 * user-confirmed numeric facts.
 *
 * We preserve numerator / denominator so the UI can explain the math.
 */

export function deriveMetrics(
  facts = {}
) {
  const derived = [];


  /* --------------------------------------------------------------
     QUALIFIED PERSONNEL INCREASE
     -------------------------------------------------------------- */

  const qualifiedBefore =
    asNumber(
      facts.qualifiedBefore
    );

  const qualifiedAfter =
    asNumber(
      facts.qualifiedAfter
    );

  const newlyQualified =
    asNumber(
      facts.newlyQualified
    );


  let resolvedAfter =
    qualifiedAfter;


  if (
    resolvedAfter === null &&
    qualifiedBefore !== null &&
    newlyQualified !== null
  ) {
    resolvedAfter =
      qualifiedBefore +
      newlyQualified;


    derived.push(
      makeFact({
        id:
          "derived_qualified_after",

        kind:
          FACT_KIND.METRIC,

        label:
          "qualified personnel after",

        value:
          resolvedAfter,

        unit:
          "people",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "qualifiedBefore",
          "newlyQualified",
        ],

        notes:
          `${qualifiedBefore} + ${newlyQualified} = ${resolvedAfter}`,
      })
    );
  }


  if (
    qualifiedBefore !== null &&
    resolvedAfter !== null &&
    qualifiedBefore > 0 &&
    resolvedAfter >=
      qualifiedBefore
  ) {
    const increase =
      resolvedAfter -
      qualifiedBefore;

    const percentIncrease =
      (
        increase /
        qualifiedBefore
      ) * 100;


    derived.push(
      makeFact({
        id:
          "derived_qualified_force_percent_increase",

        kind:
          FACT_KIND.IMPACT,

        label:
          "qualified personnel increase",

        value:
          round(
            percentIncrease,
            1
          ),

        unit:
          "percent",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "qualifiedBefore",
          "qualifiedAfter",
        ],

        notes:
          `(${resolvedAfter} - ${qualifiedBefore}) / ${qualifiedBefore} × 100 = ` +
          `${round(percentIncrease, 1)}%`,
      })
    );
  }


  if (
    newlyQualified !== null &&
    resolvedAfter !== null &&
    resolvedAfter > 0 &&
    newlyQualified <=
      resolvedAfter
  ) {
    const resultingShare =
      (
        newlyQualified /
        resolvedAfter
      ) * 100;


    derived.push(
      makeFact({
        id:
          "derived_newly_qualified_share",

        kind:
          FACT_KIND.METRIC,

        label:
          "share of resulting qualified force newly qualified",

        value:
          round(
            resultingShare,
            1
          ),

        unit:
          "percent",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "newlyQualified",
          "qualifiedAfter",
        ],

        notes:
          `${newlyQualified} / ${resolvedAfter} × 100 = ` +
          `${round(resultingShare, 1)}%`,
      })
    );
  }


  /* --------------------------------------------------------------
     TIME REDUCTION
     -------------------------------------------------------------- */

  const timeBefore =
    asNumber(
      facts.timeBefore
    );

  const timeAfter =
    asNumber(
      facts.timeAfter
    );


  if (
    timeBefore !== null &&
    timeAfter !== null &&
    timeBefore > 0 &&
    timeAfter >= 0 &&
    timeAfter <=
      timeBefore
  ) {
    const timeSaved =
      timeBefore -
      timeAfter;

    const reduction =
      (
        timeSaved /
        timeBefore
      ) * 100;


    derived.push(
      makeFact({
        id:
          "derived_time_saved",

        kind:
          FACT_KIND.IMPACT,

        label:
          "time saved",

        value:
          round(
            timeSaved,
            2
          ),

        unit:
          facts.timeUnit ||
          "time-units",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "timeBefore",
          "timeAfter",
        ],
      })
    );


    derived.push(
      makeFact({
        id:
          "derived_time_reduction_percent",

        kind:
          FACT_KIND.IMPACT,

        label:
          "time reduction",

        value:
          round(
            reduction,
            1
          ),

        unit:
          "percent",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "timeBefore",
          "timeAfter",
        ],
      })
    );
  }


  /* --------------------------------------------------------------
     ERROR / FAILURE / REWORK REDUCTION
     -------------------------------------------------------------- */

  const errorsBefore =
    asNumber(
      facts.errorsBefore
    );

  const errorsAfter =
    asNumber(
      facts.errorsAfter
    );


  if (
    errorsBefore !== null &&
    errorsAfter !== null &&
    errorsBefore > 0 &&
    errorsAfter >= 0 &&
    errorsAfter <=
      errorsBefore
  ) {
    const reduced =
      errorsBefore -
      errorsAfter;

    const percent =
      (
        reduced /
        errorsBefore
      ) * 100;


    derived.push(
      makeFact({
        id:
          "derived_error_reduction",

        kind:
          FACT_KIND.IMPACT,

        label:
          "error reduction",

        value:
          round(
            percent,
            1
          ),

        unit:
          "percent",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "errorsBefore",
          "errorsAfter",
        ],
      })
    );
  }


  /* --------------------------------------------------------------
     PASS / QUALIFICATION RATE
     -------------------------------------------------------------- */

  const passed =
    asNumber(
      facts.passedCount
    );

  const attempted =
    asNumber(
      facts.attemptedCount
    );


  if (
    passed !== null &&
    attempted !== null &&
    attempted > 0 &&
    passed >= 0 &&
    passed <= attempted
  ) {
    derived.push(
      makeFact({
        id:
          "derived_pass_rate",

        kind:
          FACT_KIND.RESULT,

        label:
          "pass rate",

        value:
          round(
            (
              passed /
              attempted
            ) * 100,
            1
          ),

        unit:
          "percent",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "passedCount",
          "attemptedCount",
        ],
      })
    );
  }


  /* --------------------------------------------------------------
     COST AVOIDANCE FROM KNOWN COMPONENT VALUES
     -------------------------------------------------------------- */

  const replacementCost =
    asNumber(
      facts.replacementCost
    );

  const repairCost =
    asNumber(
      facts.repairCost
    );


  if (
    replacementCost !== null &&
    repairCost !== null &&
    replacementCost >=
      repairCost
  ) {
    derived.push(
      makeFact({
        id:
          "derived_cost_avoidance",

        kind:
          FACT_KIND.IMPACT,

        label:
          "cost avoidance",

        value:
          round(
            replacementCost -
            repairCost,
            2
          ),

        unit:
          "USD",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "replacementCost",
          "repairCost",
        ],
      })
    );
  }


  /* --------------------------------------------------------------
     MAN-HOURS
     -------------------------------------------------------------- */

  const people =
    asNumber(
      facts.peopleCount
    );

  const hoursPerPerson =
    asNumber(
      facts.hoursPerPerson
    );


  if (
    people !== null &&
    hoursPerPerson !== null &&
    people >= 0 &&
    hoursPerPerson >= 0
  ) {
    derived.push(
      makeFact({
        id:
          "derived_training_or_work_man_hours",

        kind:
          FACT_KIND.SCOPE,

        label:
          "total man-hours",

        value:
          round(
            people *
            hoursPerPerson,
            1
          ),

        unit:
          "hours",

        status:
          EVIDENCE_STATUS.DERIVED,

        source:
          "math",

        supports: [
          "peopleCount",
          "hoursPerPerson",
        ],
      })
    );
  }


  return uniqueBy(
    derived,
    (item) =>
      item.id
  );
}


/* ================================================================
   IMPACT HYPOTHESIS CATALOG
   ================================================================ */

/**
 * A rule may propose a hypothesis when its trigger is present.
 *
 * requiredFacts:
 *   Facts needed to promote the claim from hypothesis to confirmed/derived.
 *
 * questions:
 *   Amy's follow-up questions.
 *
 * CAUTION:
 *   A hypothesis is an investigation path, NOT a statement-ready claim.
 */

export const IMPACT_HYPOTHESIS_RULES =
  Object.freeze([
    {
      id:
        "training_to_qualification",

      domain:
        IMPACT_DOMAIN.TRAINING,

      level:
        IMPACT_LEVEL.TACTICAL,

      trigger: ({
        text,
        facts,
        signals,
      }) =>
        signals.has("training") ||
        truthyPath(
          facts,
          "peopleTrained"
        ) ||
        /\btrain(?:ed|ing)?\b/i
          .test(text),

      candidate:
        "Training resulted in qualification or certification progress.",

      requiredFacts: [
        "qualificationOutcome",
      ],

      questions: [
        "What qualification or certification were they working toward?",
        "Did they complete the qualification, or only receive training toward it?",
        "How many became qualified?",
      ],
    },


    {
      id:
        "training_to_manpower_capacity",

      domain:
        IMPACT_DOMAIN.MANPOWER,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("training") ||
        truthyPath(
          facts,
          "newlyQualified"
        ) ||
        truthyPath(
          facts,
          "peopleTrained"
        ),

      candidate:
        "Qualification increased the section's available qualified manpower.",

      requiredFacts: [
        "qualifiedBefore",
        "newlyQualified",
      ],

      questions: [
        "How many people were qualified before this training?",
        "How many were qualified afterward?",
        "Did the newly qualified members become available for independent tasking, shifts, inspections, or deployments?",
      ],
    },


    {
      id:
        "training_to_readiness",

      domain:
        IMPACT_DOMAIN.READINESS,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("training") ||
        truthyPath(
          facts,
          "newlyQualified"
        ),

      candidate:
        "The added qualifications improved unit readiness or mission capacity.",

      requiredFacts: [
        "readinessEffect",
      ],

      questions: [
        "Did the additional qualified personnel close a readiness shortfall?",
        "Did they fill shift, deployment, certification, or mission requirements?",
        "Is there a measurable readiness indicator you can verify?",
      ],
    },


    {
      id:
        "inspection_to_defect_detection",

      domain:
        IMPACT_DOMAIN.QUALITY,

      level:
        IMPACT_LEVEL.TACTICAL,

      trigger: ({
        signals,
        facts,
      }) =>
        signals.has("inspection") &&
        (
          signals.has("defect") ||
          truthyPath(
            facts,
            "defectFound"
          )
        ),

      candidate:
        "The inspection identified a defect before continued use.",

      requiredFacts: [
        "defectFound",
      ],

      questions: [
        "What defect was identified?",
        "Was the defect confirmed by QA, engineering, technical data, or another authority?",
      ],
    },


    {
      id:
        "defect_to_repair",

      domain:
        IMPACT_DOMAIN.AVAILABILITY,

      level:
        IMPACT_LEVEL.TACTICAL,

      trigger: ({
        signals,
        facts,
      }) =>
        signals.has("defect") ||
        truthyPath(
          facts,
          "defectFound"
        ),

      candidate:
        "Defect identification enabled repair or corrective action.",

      requiredFacts: [
        "repairCoordinated",
      ],

      questions: [
        "What corrective action followed the finding?",
        "Was the component repaired, replaced, removed from service, or sent to engineering?",
      ],
    },


    {
      id:
        "repair_to_aircraft_availability",

      domain:
        IMPACT_DOMAIN.AVAILABILITY,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        signals,
        facts,
      }) =>
        signals.has("repair") ||
        truthyPath(
          facts,
          "repairCoordinated"
        ) ||
        truthyPath(
          facts,
          "aircraftGrounded"
        ),

      candidate:
        "Corrective action restored or preserved aircraft availability.",

      requiredFacts: [
        "aircraftReturnedToService",
      ],

      questions: [
        "Was the aircraft grounded or otherwise unavailable before the repair?",
        "Was it returned to service after the corrective action?",
        "How long was downtime avoided or reduced, if known?",
      ],
    },


    {
      id:
        "availability_to_sorties",

      domain:
        IMPACT_DOMAIN.SORTIE,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        truthyPath(
          facts,
          "aircraftReturnedToService"
        ) ||
        signals.has("sortie"),

      candidate:
        "The restored asset supported scheduled sorties or mission requirements.",

      requiredFacts: [
        "sortieEffect",
      ],

      questions: [
        "Did the aircraft subsequently fly a scheduled sortie or mission that depended on this repair?",
        "How many sorties or missions were enabled or protected?",
        "Was there a specific exercise, alert, contingency, or training requirement?",
      ],
    },


    {
      id:
        "availability_to_deployment",

      domain:
        IMPACT_DOMAIN.DEPLOYMENT,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        truthyPath(
          facts,
          "aircraftReturnedToService"
        ) ||
        signals.has("deployment"),

      candidate:
        "The restored asset supported a deployment or contingency requirement.",

      requiredFacts: [
        "deploymentSupported",
      ],

      questions: [
        "Was this aircraft or equipment scheduled to deploy?",
        "Did the repair directly enable the deployment or protect a deployment timeline?",
        "What deployment, exercise, or contingency requirement was supported?",
      ],
    },


    {
      id:
        "defect_to_safety_risk",

      domain:
        IMPACT_DOMAIN.SAFETY,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("defect") ||
        signals.has("safety") ||
        truthyPath(
          facts,
          "defectFound"
        ),

      candidate:
        "Finding the defect removed or reduced a verified safety hazard.",

      requiredFacts: [
        "documentedHazard",
      ],

      questions: [
        "Was the component designated safety-critical or flight-critical?",
        "What did technical data or engineering say could happen if the defect remained in service?",
        "Was a hazard classification documented?",
      ],
    },


    {
      id:
        "safety_to_mishap_prevention",

      domain:
        IMPACT_DOMAIN.SAFETY,

      level:
        IMPACT_LEVEL.STRATEGIC,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("safety") ||
        truthyPath(
          facts,
          "documentedHazard"
        ) ||
        truthyPath(
          facts,
          "safetyCriticalComponent"
        ),

      candidate:
        "The action prevented a specific mishap category or catastrophic outcome.",

      requiredFacts: [
        "documentedMishapRisk",
      ],

      questions: [
        "Is there documented evidence tying this defect to a specific mishap risk or category?",
        "Who made that determination—engineering, safety, QA, technical data, or an investigation authority?",
        "If that evidence does not exist, describe the verified hazard rather than claiming a mishap was prevented.",
      ],
    },


    {
      id:
        "repair_to_cost_avoidance",

      domain:
        IMPACT_DOMAIN.RESOURCES,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("cost") ||
        truthyPath(
          facts,
          "replacementAvoided"
        ) ||
        truthyPath(
          facts,
          "costAvoidance"
        ) ||
        truthyPath(
          facts,
          "replacementCost"
        ),

      candidate:
        "Repair or corrective action avoided replacement or other verified costs.",

      requiredFacts: [
        "costAvoidance",
      ],

      alternativeFactSets: [
        [
          "replacementCost",
          "repairCost",
        ],
      ],

      questions: [
        "What exactly does the savings figure represent?",
        "Was it replacement cost avoided, repair cost avoided, or another form of cost avoidance?",
        "What is the source of the dollar amount?",
      ],
    },


    {
      id:
        "component_to_higher_assembly_cost",

      domain:
        IMPACT_DOMAIN.RESOURCES,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has("defect") ||
        truthyPath(
          facts,
          "replacementAvoided"
        ),

      candidate:
        "The action protected a higher-value assembly from replacement or secondary damage.",

      requiredFacts: [
        "higherAssemblyEffect",
        "higherAssemblyValue",
      ],

      questions: [
        "Would failure or continued operation have damaged or required replacement of a higher assembly?",
        "What is the verified value of that assembly?",
        "What technical or engineering evidence connects this defect to that consequence?",
      ],
    },


    {
      id:
        "process_to_time_savings",

      domain:
        IMPACT_DOMAIN.TIME,

      level:
        IMPACT_LEVEL.TACTICAL,

      trigger: ({
        facts,
        signals,
      }) =>
        signals.has(
          "process_improvement"
        ) ||
        truthyPath(
          facts,
          "timeBefore"
        ) ||
        truthyPath(
          facts,
          "timeAfter"
        ),

      candidate:
        "The process improvement reduced completion time.",

      requiredFacts: [
        "timeBefore",
        "timeAfter",
      ],

      questions: [
        "How long did the process take before the change?",
        "How long did it take afterward?",
        "How often is the process performed?",
      ],
    },


    {
      id:
        "time_to_manpower_savings",

      domain:
        IMPACT_DOMAIN.MANPOWER,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
      }) =>
        truthyPath(
          facts,
          "timeBefore"
        ) &&
        truthyPath(
          facts,
          "timeAfter"
        ),

      candidate:
        "Time reduction created measurable manpower capacity.",

      requiredFacts: [
        "frequency",
        "peopleAffected",
      ],

      questions: [
        "How often is the improved process performed?",
        "How many people perform it each time?",
        "Were saved hours redirected to another mission requirement?",
      ],
    },


    {
      id:
        "innovation_to_adoption",

      domain:
        IMPACT_DOMAIN.INNOVATION,

      level:
        IMPACT_LEVEL.OPERATIONAL,

      trigger: ({
        facts,
        signals,
        text,
      }) =>
        signals.has(
          "process_improvement"
        ) ||
        truthyPath(
          facts,
          "newProcedure"
        ) ||
        /\bauthored\b|\bdeveloped\b|\bcreated\b/i
          .test(text),

      candidate:
        "The new technique, procedure, or product was formally adopted beyond the individual user.",

      requiredFacts: [
        "adoptionScope",
      ],

      questions: [
        "Who approved or adopted the new technique or procedure?",
        "Was it used by the work center, flight, squadron, group, wing, MAJCOM, or another organization?",
        "How many people, assets, or processes were affected?",
      ],
    },


    {
      id:
        "adoption_to_enterprise_effect",

      domain:
        IMPACT_DOMAIN.ORGANIZATIONAL,

      level:
        IMPACT_LEVEL.STRATEGIC,

      trigger: ({
        facts,
      }) =>
        truthyPath(
          facts,
          "adoptionScope"
        ),

      candidate:
        "The improvement produced group, wing, MAJCOM, DAF, or enterprise-level effect.",

      requiredFacts: [
        "enterpriseEffect",
      ],

      questions: [
        "What organization formally implemented or benefited from the change?",
        "Was the effect local, wing-wide, MAJCOM-wide, or broader?",
        "What verified outcome occurred at that level?",
      ],
    },
  ]);


/* ================================================================
   REQUIREMENT EVALUATION
   ================================================================ */

function allRequirementsMet(
  facts,
  paths = []
) {
  return paths.every(
    (path) =>
      truthyPath(
        facts,
        path
      )
  );
}

function anyAlternativeSetMet(
  facts,
  sets = []
) {
  return sets.some(
    (set) =>
      allRequirementsMet(
        facts,
        set
      )
  );
}

function missingRequirements(
  facts,
  rule
) {
  const primary =
    (
      rule.requiredFacts ||
      []
    )
      .filter(
        (path) =>
          !truthyPath(
            facts,
            path
          )
      );


  if (
    primary.length === 0
  ) {
    return [];
  }


  if (
    rule.alternativeFactSets &&
    anyAlternativeSetMet(
      facts,
      rule.alternativeFactSets
    )
  ) {
    return [];
  }


  return primary;
}


/* ================================================================
   IMPACT CLAIM PROMOTION
   ================================================================ */

/**
 * A candidate can become writing-safe only when:
 *   - explicitly confirmed, OR
 *   - directly derivable from confirmed facts.
 *
 * Merely satisfying a trigger does NOT promote the claim.
 */

function resolveCandidateStatus(
  rule,
  facts,
  confirmations,
  rejectedClaims
) {
  if (
    rejectedClaims.includes(
      rule.id
    )
  ) {
    return EVIDENCE_STATUS.REJECTED;
  }


  if (
    confirmations[
      rule.id
    ] === false
  ) {
    return EVIDENCE_STATUS.REJECTED;
  }


  if (
    confirmations[
      rule.id
    ] === true
  ) {
    return EVIDENCE_STATUS.CONFIRMED;
  }


  const missing =
    missingRequirements(
      facts,
      rule
    );


  /*
   * Presence of supporting fact fields means the causal claim may be
   * strong enough to treat as confirmed only when those fields themselves
   * explicitly describe the effect. We do not infer broad mission claims
   * just because prerequisites exist.
   */
  if (
    missing.length === 0
  ) {
    return EVIDENCE_STATUS.CONFIRMED;
  }


  return EVIDENCE_STATUS.HYPOTHESIS;
}


/* ================================================================
   IMPACT DISCOVERY
   ================================================================ */

export function discoverImpactCandidates(
  input = {}
) {
  const normalized =
    normalizeImpactInput(input);

  const text =
    normalized.accomplishment;

  const facts =
    normalized.facts;

  const confirmations =
    normalized.confirmations;

  const rejectedClaims =
    normalized.rejectedClaims;


  const signals =
    new Set(
      detectRawSignals(text)
        .map(
          (signal) =>
            signal.id
        )
    );


  const candidates = [];


  for (
    const rule
    of IMPACT_HYPOTHESIS_RULES
  ) {
    const triggered =
      Boolean(
        rule.trigger({
          text,
          facts,
          signals,
          input: normalized,
        })
      );


    if (!triggered) {
      continue;
    }


    const status =
      resolveCandidateStatus(
        rule,
        facts,
        confirmations,
        rejectedClaims
      );


    const missing =
      missingRequirements(
        facts,
        rule
      );


    candidates.push({
      id:
        rule.id,

      domain:
        rule.domain,

      level:
        rule.level,

      claim:
        rule.candidate,

      status,

      writingSafe:
        status ===
          EVIDENCE_STATUS.CONFIRMED ||
        status ===
          EVIDENCE_STATUS.DERIVED,

      missingFacts:
        missing,

      questions:
        status ===
          EVIDENCE_STATUS.HYPOTHESIS
          ? [
              ...(rule.questions || []),
            ]
          : [],
    });
  }


  return candidates;
}


/* ================================================================
   CAUSAL BRIDGE MODEL
   ================================================================ */

/**
 * Claims that jump from a local action to a broad downstream effect need
 * verified intermediate steps.
 */

export const CAUSAL_BRIDGE_TEMPLATES =
  Object.freeze({
    training: {
      id:
        "training_chain",

      nodes: [
        {
          id:
            "training_provided",

          label:
            "training provided",

          evidencePaths: [
            "peopleTrained",
            "trainingProvided",
          ],
        },

        {
          id:
            "qualification_achieved",

          label:
            "qualification/certification achieved",

          evidencePaths: [
            "newlyQualified",
            "qualificationOutcome",
          ],
        },

        {
          id:
            "manpower_capacity",

          label:
            "qualified manpower increased",

          evidencePaths: [
            "qualifiedAfter",
            "readinessEffect",
            "manpowerEffect",
          ],
        },

        {
          id:
            "mission_effect",

          label:
            "mission/readiness effect",

          evidencePaths: [
            "missionEffect",
            "readinessEffect",
          ],
        },
      ],
    },


    inspection: {
      id:
        "inspection_chain",

      nodes: [
        {
          id:
            "inspection_performed",

          label:
            "inspection performed",

          evidencePaths: [
            "inspectionPerformed",
          ],
        },

        {
          id:
            "defect_identified",

          label:
            "defect identified",

          evidencePaths: [
            "defectFound",
          ],
        },

        {
          id:
            "corrective_action",

          label:
            "repair/corrective action",

          evidencePaths: [
            "repairCoordinated",
            "correctiveAction",
          ],
        },

        {
          id:
            "asset_effect",

          label:
            "asset availability/readiness effect",

          evidencePaths: [
            "aircraftReturnedToService",
            "assetAvailabilityEffect",
          ],
        },

        {
          id:
            "mission_effect",

          label:
            "mission/deployment/sortie effect",

          evidencePaths: [
            "missionEffect",
            "deploymentSupported",
            "sortieEffect",
          ],
        },
      ],
    },


    safety: {
      id:
        "safety_chain",

      nodes: [
        {
          id:
            "hazard_identified",

          label:
            "hazard/defect identified",

          evidencePaths: [
            "defectFound",
            "documentedHazard",
          ],
        },

        {
          id:
            "hazard_characterized",

          label:
            "hazard formally characterized",

          evidencePaths: [
            "documentedHazard",
            "safetyCriticalComponent",
          ],
        },

        {
          id:
            "failure_mode",

          label:
            "failure consequence documented",

          evidencePaths: [
            "failureMode",
            "engineeringConsequence",
          ],
        },

        {
          id:
            "mishap_risk",

          label:
            "specific mishap risk documented",

          evidencePaths: [
            "documentedMishapRisk",
          ],
        },
      ],
    },


    resource: {
      id:
        "resource_chain",

      nodes: [
        {
          id:
            "resource_action",

          label:
            "resource action",

          evidencePaths: [
            "repairCoordinated",
            "replacementAvoided",
            "resourceAction",
            "processChanged",
          ],
        },

        {
          id:
            "cost_basis",

          label:
            "verified cost basis",

          evidencePaths: [
            "costAvoidance",
            "replacementCost",
          ],
        },

        {
          id:
            "cost_effect",

          label:
            "actual avoidance/savings effect",

          evidencePaths: [
            "costAvoidance",
            "replacementAvoided",
          ],
        },
      ],
    },


    process: {
      id:
        "process_chain",

      nodes: [
        {
          id:
            "change_created",

          label:
            "process/technique changed",

          evidencePaths: [
            "newProcedure",
            "processChanged",
          ],
        },

        {
          id:
            "change_implemented",

          label:
            "change implemented/adopted",

          evidencePaths: [
            "adoptionScope",
            "implemented",
          ],
        },

        {
          id:
            "measurable_change",

          label:
            "measurable result",

          evidencePaths: [
            "timeAfter",
            "errorsAfter",
            "qualityEffect",
          ],
        },

        {
          id:
            "organizational_effect",

          label:
            "organizational effect",

          evidencePaths: [
            "enterpriseEffect",
            "missionEffect",
            "manpowerEffect",
          ],
        },
      ],
    },
  });


function nodeHasEvidence(
  node,
  facts
) {
  return (
    node.evidencePaths ||
    []
  ).some(
    (path) =>
      truthyPath(
        facts,
        path
      )
  );
}


export function evaluateCausalBridge(
  templateId,
  facts = {}
) {
  const template =
    CAUSAL_BRIDGE_TEMPLATES[
      templateId
    ];


  if (!template) {
    return {
      templateId,

      status:
        BRIDGE_STATUS.MISSING,

      nodes: [],

      missingNodes: [],

      completeThroughIndex:
        -1,
    };
  }


  const nodes =
    template.nodes
      .map(
        (
          node,
          index
        ) => ({
          ...node,

          index,

          supported:
            nodeHasEvidence(
              node,
              facts
            ),
        })
      );


  let completeThroughIndex =
    -1;


  for (
    let i = 0;
    i < nodes.length;
    i += 1
  ) {
    if (
      nodes[i].supported
    ) {
      if (
        i ===
        completeThroughIndex + 1
      ) {
        completeThroughIndex =
          i;
      }
    }

    else {
      break;
    }
  }


  const supportedCount =
    nodes.filter(
      (node) =>
        node.supported
    ).length;


  let status =
    BRIDGE_STATUS.MISSING;


  if (
    supportedCount ===
    nodes.length
  ) {
    status =
      BRIDGE_STATUS.COMPLETE;
  }

  else if (
    supportedCount > 0
  ) {
    status =
      BRIDGE_STATUS.PARTIAL;
  }


  return {
    templateId,

    status,

    nodes,

    completeThroughIndex,

    missingNodes:
      nodes.filter(
        (node) =>
          !node.supported
      ),
  };
}


/* ================================================================
   BRIDGE-TO-CLAIM VALIDATION
   ================================================================ */

const CLAIM_BRIDGE_REQUIREMENTS =
  Object.freeze({
    training_to_qualification: {
      bridge:
        "training",

      requiredThroughNode:
        "qualification_achieved",
    },

    training_to_manpower_capacity: {
      bridge:
        "training",

      requiredThroughNode:
        "manpower_capacity",
    },

    training_to_readiness: {
      bridge:
        "training",

      requiredThroughNode:
        "mission_effect",
    },

    inspection_to_defect_detection: {
      bridge:
        "inspection",

      requiredThroughNode:
        "defect_identified",
    },

    defect_to_repair: {
      bridge:
        "inspection",

      requiredThroughNode:
        "corrective_action",
    },

    repair_to_aircraft_availability: {
      bridge:
        "inspection",

      requiredThroughNode:
        "asset_effect",
    },

    availability_to_sorties: {
      bridge:
        "inspection",

      requiredThroughNode:
        "mission_effect",
    },

    availability_to_deployment: {
      bridge:
        "inspection",

      requiredThroughNode:
        "mission_effect",
    },

    defect_to_safety_risk: {
      bridge:
        "safety",

      requiredThroughNode:
        "hazard_characterized",
    },

    safety_to_mishap_prevention: {
      bridge:
        "safety",

      requiredThroughNode:
        "mishap_risk",
    },

    repair_to_cost_avoidance: {
      bridge:
        "resource",

      requiredThroughNode:
        "cost_effect",
    },

    component_to_higher_assembly_cost: {
      bridge:
        "resource",

      requiredThroughNode:
        "cost_effect",
    },

    process_to_time_savings: {
      bridge:
        "process",

      requiredThroughNode:
        "measurable_change",
    },

    time_to_manpower_savings: {
      bridge:
        "process",

      requiredThroughNode:
        "organizational_effect",
    },

    innovation_to_adoption: {
      bridge:
        "process",

      requiredThroughNode:
        "change_implemented",
    },

    adoption_to_enterprise_effect: {
      bridge:
        "process",

      requiredThroughNode:
        "organizational_effect",
    },
  });


export function validateCandidateBridge(
  candidate,
  facts = {}
) {
  const requirement =
    CLAIM_BRIDGE_REQUIREMENTS[
      candidate.id
    ];


  if (!requirement) {
    return {
      claimId:
        candidate.id,

      applicable:
        false,

      status:
        BRIDGE_STATUS.MISSING,

      writingSafe:
        candidate.writingSafe,
    };
  }


  const bridge =
    evaluateCausalBridge(
      requirement.bridge,
      facts
    );


  const targetIndex =
    bridge.nodes
      .findIndex(
        (node) =>
          node.id ===
          requirement.requiredThroughNode
      );


  const writingSafe =
    candidate.writingSafe &&
    targetIndex >= 0 &&
    bridge.completeThroughIndex >=
      targetIndex;


  return {
    claimId:
      candidate.id,

    applicable:
      true,

    bridgeId:
      requirement.bridge,

    requiredThroughNode:
      requirement.requiredThroughNode,

    status:
      writingSafe
        ? BRIDGE_STATUS.COMPLETE
        : bridge.status,

    writingSafe,

    bridge,
  };
}


/* ================================================================
   UNSUPPORTED CLAIM DETECTION
   ================================================================ */

/**
 * These phrases are not inherently wrong.
 * They require explicit evidence before Amy should generate them.
 */

export const HIGH_RISK_IMPACT_PATTERNS =
  Object.freeze([
    {
      id:
        "mishap_prevented",

      patterns: [
        /\bprevented .*mishap\b/i,
        /\baverted .*mishap\b/i,
        /\bprevented .*catastroph/i,
        /\baverted .*catastroph/i,
        /\bprevented .*aircraft loss\b/i,
      ],

      requiredFacts: [
        "documentedMishapRisk",
      ],

      message:
        "Mishap-prevention claims require documented causal evidence tying the defect/action to the stated mishap risk.",
    },


    {
      id:
        "readiness_increase",

      patterns: [
        /\bincreased .*readiness\b/i,
        /\bboosted .*readiness\b/i,
        /\benhanced .*readiness\b/i,
      ],

      requiredFacts: [
        "readinessEffect",
      ],

      message:
        "Readiness claims require a verified readiness effect or a direct measurable readiness indicator.",
    },


    {
      id:
        "mission_enabled",

      patterns: [
        /\benabled .*mission\b/i,
        /\bensured .*mission\b/i,
        /\bsecured .*mission success\b/i,
        /\bguaranteed .*mission\b/i,
      ],

      requiredFacts: [
        "missionEffect",
      ],

      message:
        "Mission-effect claims require a verified connection between the action and the mission outcome.",
    },


    {
      id:
        "deployment_enabled",

      patterns: [
        /\benabled .*deploy/i,
        /\bsecured .*deploy/i,
        /\bensured .*deploy/i,
      ],

      requiredFacts: [
        "deploymentSupported",
      ],

      message:
        "Deployment claims require confirmation that the accomplishment directly supported or protected the deployment requirement.",
    },


    {
      id:
        "sorties_enabled",

      patterns: [
        /\benabled \d+ .*sortie/i,
        /\bgenerated \d+ .*sortie/i,
        /\bsupported \d+ .*sortie/i,
      ],

      requiredFacts: [
        "sortieEffect",
      ],

      message:
        "Sortie claims require a verified number and a causal connection to the accomplishment.",
    },


    {
      id:
        "cost_savings",

      patterns: [
        /\bsav(?:ed|ings?) .*\$/i,
        /\bcost avoidance .*\$/i,
        /\bavoided .*\$\s?\d/i,
      ],

      requiredFacts: [
        "costAvoidance",
      ],

      alternatives: [
        [
          "replacementCost",
          "repairCost",
        ],
      ],

      message:
        "Dollar savings require a verified cost basis; do not manufacture or estimate a savings amount without support.",
    },


    {
      id:
        "percentage_claim",

      patterns: [
        /\b(?:increas(?:e|ed|ing)|improv(?:e|ed|ing)|reduc(?:e|ed|ing)|cut|boost(?:ed|ing)?|rais(?:e|ed|ing))\b[^.;]{0,80}\b\d+(?:\.\d+)?%/i,
      ],

      requiredFacts: [],

      requiresDerivedMetric:
        true,

      message:
        "Percentage claims should be traceable to verified numerator/denominator facts or an authoritative source metric.",
    },


    {
      id:
        "enterprise_scope",

      patterns: [
        /\bair force[- ]wide\b/i,
        /\bdaf[- ]wide\b/i,
        /\benterprise[- ]wide\b/i,
        /\bmajcom[- ]wide\b/i,
      ],

      requiredFacts: [
        "enterpriseEffect",
      ],

      message:
        "Enterprise-level scope requires evidence of adoption, implementation, or effect at that organizational level.",
    },
  ]);


export function detectUnsupportedImpactClaims(
  statement = "",
  facts = {},
  derivedMetrics = []
) {
  const text =
    normalizeString(statement);

  const findings = [];


  const claimedDollarValues =
    extractDollarValues(
      text
    );


  const percentClaims =
    extractPercentClaims(
      text
    );


  const verifiedDollarValues =
    collectVerifiedDollarValues(
      facts,
      derivedMetrics
    );


  const percentMetricRows =
    verifiedPercentMetricRows(
      facts,
      derivedMetrics
    );


  for (
    const rule
    of HIGH_RISK_IMPACT_PATTERNS
  ) {
    if (
      !containsAny(
        text,
        rule.patterns
      )
    ) {
      continue;
    }


    let supported =
      allRequirementsMet(
        facts,
        rule.requiredFacts ||
        []
      );


    if (
      !supported &&
      rule.alternatives &&
      anyAlternativeSetMet(
        facts,
        rule.alternatives
      )
    ) {
      supported =
        true;
    }


    let metricMismatch =
      false;

    let claimedValues =
      [];

    let verifiedValues =
      [];

    let metricDetails =
      [];


    if (
      rule.id ===
      "cost_savings"
    ) {
      claimedValues =
        claimedDollarValues;

      verifiedValues =
        verifiedDollarValues;


      if (
        claimedValues.length >
        0
      ) {
        const everyClaimSupported =
          claimedValues.every(
            (claimed) =>
              verifiedValues.some(
                (verified) =>
                  approximatelyEqual(
                    claimed,
                    verified
                  )
              )
          );


        supported =
          supported &&
          everyClaimSupported;

        metricMismatch =
          !everyClaimSupported;
      }

      else {
        supported =
          false;
      }
    }


    if (
      rule.requiresDerivedMetric
    ) {
      claimedValues =
        percentClaims
          .map(
            (claim) =>
              claim.value
          );


      verifiedValues =
        percentMetricRows
          .map(
            (row) =>
              row.value
          );


      metricDetails =
        percentClaims
          .map(
            (claim) => {
              const matches =
                percentMetricRows
                  .filter(
                    (metric) => {
                      const numericMatch =
                        approximatelyEqual(
                          claim.value,
                          metric.value
                        );


                      if (!numericMatch) {
                        return false;
                      }


                      if (
                        claim.intent ===
                        "generic"
                      ) {
                        return true;
                      }


                      return (
                        metric.intent ===
                          claim.intent ||
                        metric.intent ===
                          "generic"
                      );
                    }
                  );


              return {
                ...claim,

                supported:
                  matches.length >
                  0,

                matches,
              };
            }
          );


      supported =
        metricDetails.length >
          0 &&
        metricDetails.every(
          (detail) =>
            detail.supported
        );


      metricMismatch =
        !supported;
    }


    findings.push({
      id:
        rule.id,

      supported,

      status:
        supported
          ? EVIDENCE_STATUS.CONFIRMED
          : EVIDENCE_STATUS.UNSUPPORTED,

      message:
        rule.message,

      metricMismatch,

      claimedValues,

      verifiedValues,

      metricDetails,

      missingFacts:
        supported
          ? []
          : (
              rule.requiredFacts ||
              []
            ).filter(
              (path) =>
                !truthyPath(
                  facts,
                  path
                )
            ),
    });
  }


  return findings;
}


/* ================================================================
   ASRI COMPLETENESS
   ================================================================ */

export function analyzeASRI(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );

  const facts =
    normalized.facts;

  const text =
    normalized.accomplishment;

  const signals =
    detectRawSignals(
      text
    );


  const actionPresent =
    Boolean(
      truthyPath(
        facts,
        "action"
      ) ||
      /\b(?:led|trained|performed|inspected|repaired|developed|created|managed|directed|coordinated|identified|found|executed|supervised|qualified|restored)\b/i
        .test(text)
    );


  const scopePresent =
    Boolean(
      truthyPath(
        facts,
        "peopleCount"
      ) ||
      truthyPath(
        facts,
        "peopleTrained"
      ) ||
      truthyPath(
        facts,
        "asset"
      ) ||
      truthyPath(
        facts,
        "assetCount"
      ) ||
      truthyPath(
        facts,
        "organizationalScope"
      ) ||
      /\b\d+\s+(?:airmen|amn|people|personnel|aircraft|acft|sorties|missions|inspections|assets|troops|technicians)\b/i
        .test(text)
    );


  const resultPresent =
    Boolean(
      truthyPath(
        facts,
        "result"
      ) ||
      truthyPath(
        facts,
        "defectFound"
      ) ||
      truthyPath(
        facts,
        "newlyQualified"
      ) ||
      truthyPath(
        facts,
        "aircraftReturnedToService"
      ) ||
      truthyPath(
        facts,
        "repairCoordinated"
      ) ||
      signals.some(
        (signal) =>
          [
            "defect",
            "repair",
            "cost",
            "process_improvement",
          ].includes(
            signal.id
          )
      )
    );


  const impactPresent =
    Boolean(
      truthyPath(
        facts,
        "impact"
      ) ||
      truthyPath(
        facts,
        "costAvoidance"
      ) ||
      truthyPath(
        facts,
        "missionEffect"
      ) ||
      truthyPath(
        facts,
        "readinessEffect"
      ) ||
      truthyPath(
        facts,
        "deploymentSupported"
      ) ||
      truthyPath(
        facts,
        "sortieEffect"
      ) ||
      truthyPath(
        facts,
        "manpowerEffect"
      )
    );


  return {
    action: {
      present:
        actionPresent,

      status:
        actionPresent
          ? "present"
          : "missing",
    },


    scope: {
      present:
        scopePresent,

      status:
        scopePresent
          ? "present"
          : "missing",
    },


    result: {
      present:
        resultPresent,

      status:
        resultPresent
          ? "present"
          : "missing",
    },


    impact: {
      present:
        impactPresent,

      status:
        impactPresent
          ? "present"
          : "missing",
    },


    missing: [
      !actionPresent
        ? "action"
        : null,

      !scopePresent
        ? "scope"
        : null,

      !resultPresent
        ? "result"
        : null,

      !impactPresent
        ? "impact"
        : null,
    ].filter(Boolean),
  };
}


/* ================================================================
   ACCOMPLISHMENT SPLITTING INTELLIGENCE
   ================================================================ */

/**
 * Detects when one raw input may contain multiple independently valuable
 * accomplishment/result chains.
 *
 * It does NOT automatically split prose; it returns a recommendation.
 */

export function analyzeAccomplishmentDensity(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );

  const text =
    normalized.accomplishment;

  const facts =
    normalized.facts;


  const signals =
    new Set(
      detectRawSignals(text)
        .map(
          (item) =>
            item.id
        )
    );


  const threads = [];


  if (
    signals.has("training") ||
    truthyPath(
      facts,
      "peopleTrained"
    ) ||
    truthyPath(
      facts,
      "newlyQualified"
    )
  ) {
    threads.push({
      id:
        "people_development",

      label:
        "People development / qualification",

      domains: [
        IMPACT_DOMAIN.TRAINING,
        IMPACT_DOMAIN.MANPOWER,
      ],
    });
  }


  if (
    signals.has("inspection") ||
    signals.has("defect") ||
    truthyPath(
      facts,
      "defectFound"
    )
  ) {
    threads.push({
      id:
        "technical_inspection",

      label:
        "Technical inspection / defect detection",

      domains: [
        IMPACT_DOMAIN.QUALITY,
        IMPACT_DOMAIN.AVAILABILITY,
      ],
    });
  }


  if (
    signals.has("cost") ||
    truthyPath(
      facts,
      "costAvoidance"
    ) ||
    truthyPath(
      facts,
      "replacementAvoided"
    )
  ) {
    threads.push({
      id:
        "resource_effect",

      label:
        "Resource / cost effect",

      domains: [
        IMPACT_DOMAIN.RESOURCES,
      ],
    });
  }


  if (
    signals.has(
      "process_improvement"
    ) ||
    truthyPath(
      facts,
      "newProcedure"
    ) ||
    truthyPath(
      facts,
      "timeBefore"
    )
  ) {
    threads.push({
      id:
        "process_improvement",

      label:
        "Process / innovation",

      domains: [
        IMPACT_DOMAIN.PROCESS,
        IMPACT_DOMAIN.INNOVATION,
      ],
    });
  }


  const meaningfulThreads =
    uniqueBy(
      threads,
      (thread) =>
        thread.id
    );


  /*
   * Split recommendation becomes stronger when we have at least two
   * independently measurable results/impacts.
   */
  const independentImpactCount =
    [
      truthyPath(
        facts,
        "newlyQualified"
      ) ||
      truthyPath(
        facts,
        "qualificationOutcome"
      ),

      truthyPath(
        facts,
        "costAvoidance"
      ) ||
      truthyPath(
        facts,
        "replacementAvoided"
      ),

      truthyPath(
        facts,
        "aircraftReturnedToService"
      ) ||
      truthyPath(
        facts,
        "missionEffect"
      ),

      truthyPath(
        facts,
        "timeAfter"
      ) ||
      truthyPath(
        facts,
        "qualityEffect"
      ),
    ]
      .filter(Boolean)
      .length;


  return {
    threadCount:
      meaningfulThreads.length,

    threads:
      meaningfulThreads,

    independentImpactCount,

    recommendSplit:
      meaningfulThreads.length >=
        2 &&
      independentImpactCount >=
        2,

    reason:
      meaningfulThreads.length >=
        2 &&
      independentImpactCount >=
        2

        ? "The input appears to contain multiple accomplishment-impact chains that may be stronger as separate Performance Statements."

        : null,
  };
}


/* ================================================================
   QUESTION PRIORITIZATION
   ================================================================ */

const DOMAIN_PRIORITY =
  Object.freeze({
    [IMPACT_DOMAIN.MISSION]:
      100,

    [IMPACT_DOMAIN.READINESS]:
      95,

    [IMPACT_DOMAIN.SAFETY]:
      95,

    [IMPACT_DOMAIN.DEPLOYMENT]:
      90,

    [IMPACT_DOMAIN.SORTIE]:
      85,

    [IMPACT_DOMAIN.MANPOWER]:
      80,

    [IMPACT_DOMAIN.RESOURCES]:
      80,

    [IMPACT_DOMAIN.AVAILABILITY]:
      75,

    [IMPACT_DOMAIN.TRAINING]:
      70,

    [IMPACT_DOMAIN.QUALITY]:
      65,

    [IMPACT_DOMAIN.TIME]:
      60,

    [IMPACT_DOMAIN.PROCESS]:
      60,

    [IMPACT_DOMAIN.INNOVATION]:
      60,

    [IMPACT_DOMAIN.ORGANIZATIONAL]:
      60,

    [IMPACT_DOMAIN.PEOPLE]:
      55,

    [IMPACT_DOMAIN.COMPLIANCE]:
      50,
  });


const LEVEL_PRIORITY =
  Object.freeze({
    [IMPACT_LEVEL.TACTICAL]:
      10,

    [IMPACT_LEVEL.OPERATIONAL]:
      20,

    [IMPACT_LEVEL.STRATEGIC]:
      15,
  });


/**
 * Operational questions are intentionally weighted above strategic ones.
 * We do not want Amy skipping the causal middle and immediately chasing
 * inflated enterprise-level claims.
 */

export function prioritizeImpactQuestions(
  candidates = [],
  limit = 6
) {
  const rows = [];


  for (
    const candidate
    of candidates
  ) {
    if (
      candidate.status !==
      EVIDENCE_STATUS.HYPOTHESIS
    ) {
      continue;
    }


    const baseScore =
      (
        DOMAIN_PRIORITY[
          candidate.domain
        ] ||
        40
      ) +
      (
        LEVEL_PRIORITY[
          candidate.level
        ] ||
        0
      );


    for (
      const question
      of candidate.questions ||
      []
    ) {
      rows.push({
        candidateId:
          candidate.id,

        domain:
          candidate.domain,

        level:
          candidate.level,

        question,

        score:
          baseScore,
      });
    }
  }


  return uniqueBy(
    rows.sort(
      (a, b) =>
        b.score -
        a.score
    ),

    (row) =>
      row.question
  )
    .slice(
      0,
      limit
    );
}


/* ================================================================
   WRITING-SAFE IMPACT PACKET
   ================================================================ */

export function buildWritingSafeImpactPacket(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );


  const derivedMetrics =
    deriveMetrics(
      normalized.facts
    );


  const candidates =
    discoverImpactCandidates(
      normalized
    );


  const validatedCandidates =
    candidates.map(
      (candidate) => {
        const bridgeValidation =
          validateCandidateBridge(
            candidate,
            normalized.facts
          );


        return {
          ...candidate,

          bridgeValidation,

          writingSafe:
            candidate.writingSafe &&
            bridgeValidation.writingSafe,
        };
      }
    );


  return {
    confirmed:
      validatedCandidates
        .filter(
          (candidate) =>
            candidate.status ===
              EVIDENCE_STATUS.CONFIRMED &&
            candidate.writingSafe
        ),


    derivedMetrics,


    hypotheses:
      validatedCandidates
        .filter(
          (candidate) =>
            candidate.status ===
            EVIDENCE_STATUS.HYPOTHESIS
        ),


    rejected:
      validatedCandidates
        .filter(
          (candidate) =>
            candidate.status ===
            EVIDENCE_STATUS.REJECTED
        ),


    bridgeWarnings:
      validatedCandidates
        .filter(
          (candidate) =>
            candidate.status ===
              EVIDENCE_STATUS.CONFIRMED &&
            !candidate.writingSafe
        ),
  };
}


/* ================================================================
   GENERATION DECISION
   ================================================================ */

export function getImpactGenerationDecision(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );


  const asri =
    analyzeASRI(
      normalized
    );


  const density =
    analyzeAccomplishmentDensity(
      normalized
    );


  const packet =
    buildWritingSafeImpactPacket(
      normalized
    );


  const questions =
    prioritizeImpactQuestions(
      packet.hypotheses,
      6
    );


  if (
    asri.action.present &&
    packet.confirmed.length >
      0
  ) {
    return {
      action:
        GENERATION_DECISION.GENERATE,

      reason:
        "The accomplishment contains a usable action and at least one writing-safe impact chain.",

      questions,

      recommendSplit:
        density.recommendSplit,
    };
  }


  if (
    asri.action.present &&
    (
      asri.result.present ||
      asri.scope.present
    ) &&
    packet.hypotheses.length >
      0
  ) {
    return {
      action:
        GENERATION_DECISION.COACH_FIRST,

      reason:
        "The accomplishment contains useful facts, but stronger impact claims require verification before final generation.",

      questions,

      recommendSplit:
        density.recommendSplit,
    };
  }


  return {
    action:
      GENERATION_DECISION.GENERATE_WITH_CAUTION,

    reason:
      "The accomplishment can be rewritten strictly from the supplied facts, but impact depth is limited.",

    questions,

    recommendSplit:
      density.recommendSplit,
  };
}


/* ================================================================
   SECTION / MPA IMPACT EMPHASIS
   ================================================================ */

export const SECTION_IMPACT_PRIORITY =
  Object.freeze({
    "duty description": [
      IMPACT_DOMAIN.MISSION,
      IMPACT_DOMAIN.ORGANIZATIONAL,
      IMPACT_DOMAIN.RESOURCES,
      IMPACT_DOMAIN.PEOPLE,
    ],


    "executing the mission": [
      IMPACT_DOMAIN.MISSION,
      IMPACT_DOMAIN.READINESS,
      IMPACT_DOMAIN.AVAILABILITY,
      IMPACT_DOMAIN.SORTIE,
      IMPACT_DOMAIN.DEPLOYMENT,
      IMPACT_DOMAIN.QUALITY,
      IMPACT_DOMAIN.SAFETY,
    ],


    "leading people": [
      IMPACT_DOMAIN.TRAINING,
      IMPACT_DOMAIN.MANPOWER,
      IMPACT_DOMAIN.PEOPLE,
      IMPACT_DOMAIN.READINESS,
      IMPACT_DOMAIN.ORGANIZATIONAL,
    ],


    "managing resources": [
      IMPACT_DOMAIN.RESOURCES,
      IMPACT_DOMAIN.MANPOWER,
      IMPACT_DOMAIN.TIME,
      IMPACT_DOMAIN.AVAILABILITY,
      IMPACT_DOMAIN.MISSION,
    ],


    "improving the unit": [
      IMPACT_DOMAIN.PROCESS,
      IMPACT_DOMAIN.INNOVATION,
      IMPACT_DOMAIN.TIME,
      IMPACT_DOMAIN.QUALITY,
      IMPACT_DOMAIN.ORGANIZATIONAL,
      IMPACT_DOMAIN.MISSION,
    ],
  });


export function rankImpactCandidatesForSection(
  candidates = [],
  section = ""
) {
  const key =
    normalizeLower(
      section
    );


  const priorities =
    SECTION_IMPACT_PRIORITY[
      key
    ] ||
    [];


  return [
    ...candidates,
  ]
    .map(
      (candidate) => {
        const priorityIndex =
          priorities.indexOf(
            candidate.domain
          );


        return {
          ...candidate,

          sectionPriority:
            priorityIndex === -1
              ? 0
              : priorities.length -
                priorityIndex,
        };
      }
    )

    .sort(
      (a, b) => {
        if (
          b.sectionPriority !==
          a.sectionPriority
        ) {
          return (
            b.sectionPriority -
            a.sectionPriority
          );
        }


        const levelWeight = {
          [IMPACT_LEVEL.OPERATIONAL]:
            3,

          [IMPACT_LEVEL.TACTICAL]:
            2,

          [IMPACT_LEVEL.STRATEGIC]:
            1,
        };


        return (
          (
            levelWeight[
              b.level
            ] ||
            0
          ) -
          (
            levelWeight[
              a.level
            ] ||
            0
          )
        );
      }
    );
}


/* ================================================================
   AMY COACHING CONTEXT
   ================================================================ */

export function buildImpactPromptContext(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );


  const asri =
    analyzeASRI(
      normalized
    );


  const density =
    analyzeAccomplishmentDensity(
      normalized
    );


  const packet =
    buildWritingSafeImpactPacket(
      normalized
    );


  const rankedConfirmed =
    rankImpactCandidatesForSection(
      packet.confirmed,
      normalized.section
    );


  const rankedHypotheses =
    rankImpactCandidatesForSection(
      packet.hypotheses,
      normalized.section
    );


  const questions =
    prioritizeImpactQuestions(
      rankedHypotheses,
      6
    );


  return {
    available:
      true,


    doctrine: [
      "Use only confirmed user facts or deterministic derivations in final Performance Statements.",

      "Hypotheses are coaching leads, not statement facts.",

      "Explore downstream consequences, but require a defensible causal bridge before asserting them.",

      "Do not jump from a tactical action directly to a strategic impact when intermediate effects are unknown.",

      "Prefer specific verified outcomes over vague claims such as enhanced readiness or ensured mission success.",

      "If one raw input contains multiple independently strong accomplishment-impact chains, consider separating them.",
    ],


    asri,

    density,


    writingSafeImpacts:
      rankedConfirmed
        .map(
          (item) => ({
            id:
              item.id,

            domain:
              item.domain,

            level:
              item.level,

            claim:
              item.claim,
          })
        ),


    derivedMetrics:
      packet.derivedMetrics,


    hypotheses:
      rankedHypotheses
        .map(
          (item) => ({
            id:
              item.id,

            domain:
              item.domain,

            level:
              item.level,

            claim:
              item.claim,

            missingFacts:
              item.missingFacts,
          })
        ),


    coachingQuestions:
      questions
        .map(
          (item) =>
            item.question
        ),


    bridgeWarnings:
      packet.bridgeWarnings
        .map(
          (item) => ({
            id:
              item.id,

            claim:
              item.claim,

            bridgeStatus:
              item
                .bridgeValidation
                ?.status,
          })
        ),
  };
}


/* ================================================================
   FINAL STATEMENT IMPACT AUDIT
   ================================================================ */

export function auditStatementImpact({
  statement = "",
  input = {},
} = {}) {
  const normalized =
    normalizeImpactInput(
      input
    );


  const derivedMetrics =
    deriveMetrics(
      normalized.facts
    );


  const unsupportedClaims =
    detectUnsupportedImpactClaims(
      statement,
      normalized.facts,
      derivedMetrics
    );


  const unsupported =
    unsupportedClaims
      .filter(
        (item) =>
          item.status ===
          EVIDENCE_STATUS.UNSUPPORTED
      );


  return {
    valid:
      unsupported.length ===
      0,

    statement:
      normalizeString(
        statement
      ),

    unsupportedClaims,

    unsupported,

    derivedMetrics,

    recommendation:
      unsupported.length ===
        0

        ? "Impact claims are consistent with the supplied deterministic evidence checks."

        : "Rewrite or verify the unsupported impact claims before using this statement.",
  };
}


/* ================================================================
   MAIN ANALYSIS ENTRY POINT
   ================================================================ */

export function analyzeImpact(
  input = {}
) {
  const normalized =
    normalizeImpactInput(
      input
    );


  const asri =
    analyzeASRI(
      normalized
    );


  const signals =
    detectRawSignals(
      normalized.accomplishment
    );


  const derivedMetrics =
    deriveMetrics(
      normalized.facts
    );


  const candidates =
    discoverImpactCandidates(
      normalized
    );


  const candidatesWithBridges =
    candidates
      .map(
        (candidate) => ({
          ...candidate,

          bridgeValidation:
            validateCandidateBridge(
              candidate,
              normalized.facts
            ),
        })
      );


  const density =
    analyzeAccomplishmentDensity(
      normalized
    );


  const decision =
    getImpactGenerationDecision(
      normalized
    );


  const bridgeReports = {
    training:
      evaluateCausalBridge(
        "training",
        normalized.facts
      ),

    inspection:
      evaluateCausalBridge(
        "inspection",
        normalized.facts
      ),

    safety:
      evaluateCausalBridge(
        "safety",
        normalized.facts
      ),

    resource:
      evaluateCausalBridge(
        "resource",
        normalized.facts
      ),

    process:
      evaluateCausalBridge(
        "process",
        normalized.facts
      ),
  };


  return {
    version:
      IMPACT_ENGINE_VERSION,

    input:
      normalized,

    asri,

    signals,

    derivedMetrics,

    impactCandidates:
      candidatesWithBridges,

    accomplishmentDensity:
      density,

    causalBridges:
      bridgeReports,

    generationDecision:
      decision,

    promptContext:
      buildImpactPromptContext(
        normalized
      ),
  };
}


/* ================================================================
   DEBUG / DEVELOPMENT HELPER
   ================================================================ */

export function debugImpactEngine(
  input = {}
) {
  const analysis =
    analyzeImpact(
      input
    );


  return {
    summary: {
      actionPresent:
        analysis
          .asri
          .action
          .present,

      scopePresent:
        analysis
          .asri
          .scope
          .present,

      resultPresent:
        analysis
          .asri
          .result
          .present,

      impactPresent:
        analysis
          .asri
          .impact
          .present,

      derivedMetricCount:
        analysis
          .derivedMetrics
          .length,

      hypothesisCount:
        analysis
          .impactCandidates
          .filter(
            (item) =>
              item.status ===
              EVIDENCE_STATUS.HYPOTHESIS
          )
          .length,

      confirmedImpactCount:
        analysis
          .impactCandidates
          .filter(
            (item) =>
              item.status ===
              EVIDENCE_STATUS.CONFIRMED
          )
          .length,

      recommendSplit:
        analysis
          .accomplishmentDensity
          .recommendSplit,

      decision:
        analysis
          .generationDecision
          .action,
    },

    analysis,
  };
}


/* ================================================================
   DEFAULT EXPORT
   ================================================================ */

export default {
  version:
    IMPACT_ENGINE_VERSION,

  source:
    IMPACT_ENGINE_SOURCE,

  EVIDENCE_STATUS,
  IMPACT_LEVEL,
  IMPACT_DOMAIN,
  FACT_KIND,
  BRIDGE_STATUS,
  GENERATION_DECISION,
  CONFIDENCE,

  RAW_SIGNAL_RULES,
  IMPACT_HYPOTHESIS_RULES,
  CAUSAL_BRIDGE_TEMPLATES,
  HIGH_RISK_IMPACT_PATTERNS,
  SECTION_IMPACT_PRIORITY,

  normalizeImpactInput,
  makeFact,
  detectRawSignals,
  deriveMetrics,
  discoverImpactCandidates,
  evaluateCausalBridge,
  validateCandidateBridge,
  detectUnsupportedImpactClaims,
  analyzeASRI,
  analyzeAccomplishmentDensity,
  prioritizeImpactQuestions,
  buildWritingSafeImpactPacket,
  getImpactGenerationDecision,
  rankImpactCandidatesForSection,
  buildImpactPromptContext,
  auditStatementImpact,
  analyzeImpact,
  debugImpactEngine,
};
