/**
 * PCSUnited / TheWing.ai
 * Air Force EPB / OPB Performance Statement Validator
 *
 * File:
 *   js/opb-validator.js
 *
 * Version:
 *   2.0.0
 *
 * Purpose:
 *   Deterministically validate generated Air Force narrative
 *   Performance Statements before they are shown to the user.
 *
 * Core philosophy:
 *
 *   TheWing validates.
 *   Amy coaches.
 *
 * This module owns deterministic OUTPUT validation such as:
 *
 *   - exact character count
 *   - 350-character enforcement
 *   - formatting
 *   - numeric consistency
 *   - unsupported metrics
 *   - unsupported high-risk impact language
 *   - acronym review
 *   - Action / Scope / Result / Impact completeness
 *   - MPA / section alignment
 *   - duplicate opening verbs
 *   - suspicious hyperbole
 *   - legacy bullet formatting
 *   - factual consistency with the Evidence Whitelist
 *
 * IMPORTANT:
 *
 *   This module should NOT duplicate the deeper logic owned by:
 *
 *   rank-tier.js
 *     - rank responsibility
 *     - duty title restrictions
 *     - authority claims
 *
 *   impact-engine.js
 *     - impact hypotheses
 *     - causal bridges
 *     - impact derivation
 *     - accomplishment splitting
 *
 * This validator may consume the results of those modules, but it
 * should not become another copy of them.
 */


/* ================================================================
   VERSION
   ================================================================ */

export const OPB_VALIDATOR_VERSION = "2.0.0";


/* ================================================================
   CONSTANTS
   ================================================================ */

export const DEFAULT_CHARACTER_LIMIT = 350;


export const CHARACTER_STATUS = Object.freeze({
  NORMAL: "normal",
  APPROACHING: "approaching-capacity",
  NEAR_MAXIMUM: "near-maximum",
  NEEDS_REVISION: "needs-revision",
});


export const VALIDATION_SEVERITY = Object.freeze({
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
});


export const VALIDATION_CATEGORY = Object.freeze({
  CHARACTER: "character",
  FORMAT: "format",
  NUMBER: "number",
  EVIDENCE: "evidence",
  IMPACT: "impact",
  ACRONYM: "acronym",
  STRUCTURE: "structure",
  SECTION: "section",
  STYLE: "style",
  RANK: "rank",
  DUPLICATE: "duplicate",
});


export const SECTION = Object.freeze({
  DUTY_DESCRIPTION: "duty-description",
  EXECUTING_MISSION: "executing-the-mission",
  LEADING_PEOPLE: "leading-people",
  MANAGING_RESOURCES: "managing-resources",
  IMPROVING_UNIT: "improving-the-unit",
});


/* ================================================================
   SECTION ALIASES
   ================================================================ */

const SECTION_ALIASES = Object.freeze({
  "duty description":
    SECTION.DUTY_DESCRIPTION,

  duty:
    SECTION.DUTY_DESCRIPTION,

  "duty-description":
    SECTION.DUTY_DESCRIPTION,


  "executing the mission":
    SECTION.EXECUTING_MISSION,

  mission:
    SECTION.EXECUTING_MISSION,

  executing:
    SECTION.EXECUTING_MISSION,

  "executing-the-mission":
    SECTION.EXECUTING_MISSION,


  "leading people":
    SECTION.LEADING_PEOPLE,

  leadership:
    SECTION.LEADING_PEOPLE,

  people:
    SECTION.LEADING_PEOPLE,

  "leading-people":
    SECTION.LEADING_PEOPLE,


  "managing resources":
    SECTION.MANAGING_RESOURCES,

  resources:
    SECTION.MANAGING_RESOURCES,

  "managing-resources":
    SECTION.MANAGING_RESOURCES,


  "improving the unit":
    SECTION.IMPROVING_UNIT,

  improvement:
    SECTION.IMPROVING_UNIT,

  innovation:
    SECTION.IMPROVING_UNIT,

  "improving-the-unit":
    SECTION.IMPROVING_UNIT,
});


/* ================================================================
   PRODUCT ACRONYM BASELINE
   ================================================================ */

/**
 * IMPORTANT:
 *
 * This is a PRODUCT baseline, not a claim that every entry is on
 * the current Air Force approved-acronym list.
 *
 * The application should eventually merge this list with the
 * current official Performance Statement acronym list.
 *
 * Unknown acronyms produce a WARNING rather than automatic rejection.
 */

export const DEFAULT_ACRONYM_ALLOWLIST = Object.freeze([
  "AF",
  "DAF",
  "USAF",
  "DoD",

  "AB",
  "AMN",
  "A1C",
  "SRA",
  "SSGT",
  "TSGT",
  "MSGT",
  "SMSGT",
  "CMSGT",

  "NCO",
  "SNCO",
  "NCOIC",

  "PCS",
  "TDY",

  "QA",
  "QC",

  "UT",
  "NDI",

  "AFSC",
  "CFETP",

  "MPA",
  "EPB",
  "OPB",
]);


/* ================================================================
   BASIC HELPERS
   ================================================================ */

function normalizeWhitespace(
  value
) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeLower(
  value
) {
  return normalizeWhitespace(
    value
  ).toLowerCase();
}


function safeArray(
  value
) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [value];
}


function unique(
  values = []
) {
  return [
    ...new Set(
      values.filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
    ),
  ];
}


function uniqueBy(
  values = [],
  keyFn
) {
  const map =
    new Map();

  for (
    const value
    of values
  ) {
    const key =
      keyFn(value);

    if (
      !map.has(key)
    ) {
      map.set(
        key,
        value
      );
    }
  }

  return [
    ...map.values(),
  ];
}


function isFiniteNumber(
  value
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  );
}


function approximatelyEqual(
  a,
  b,
  tolerance = 0.01
) {
  if (
    !isFiniteNumber(a) ||
    !isFiniteNumber(b)
  ) {
    return false;
  }

  const scale =
    Math.max(
      1,
      Math.abs(a),
      Math.abs(b)
    );

  return (
    Math.abs(a - b) <=
    scale * tolerance
  );
}


function normalizeSection(
  section
) {
  const key =
    normalizeLower(
      section
    );

  return (
    SECTION_ALIASES[key] ||
    SECTION.EXECUTING_MISSION
  );
}


/* ================================================================
   VALIDATION FINDING FACTORY
   ================================================================ */

export function createFinding({
  code,
  category,
  severity =
    VALIDATION_SEVERITY.WARNING,
  message,
  detail = null,
  repairable = true,
} = {}) {
  return {
    code,
    category,
    severity,
    message,
    detail,
    repairable,
  };
}


/* ================================================================
   CHARACTER COUNTING
   ================================================================ */

export function countCharacters(
  text = ""
) {
  return Array.from(
    String(text ?? "")
  ).length;
}


export function getCharacterStatus(
  count,
  limit =
    DEFAULT_CHARACTER_LIMIT
) {
  if (
    count > limit
  ) {
    return (
      CHARACTER_STATUS
        .NEEDS_REVISION
    );
  }

  if (
    count >= 336
  ) {
    return (
      CHARACTER_STATUS
        .NEAR_MAXIMUM
    );
  }

  if (
    count >= 301
  ) {
    return (
      CHARACTER_STATUS
        .APPROACHING
    );
  }

  return (
    CHARACTER_STATUS
      .NORMAL
  );
}


export function validateCharacterCount({
  statement,
  characterLimit =
    DEFAULT_CHARACTER_LIMIT,
} = {}) {
  const count =
    countCharacters(
      statement
    );

  const findings = [];

  if (
    count === 0
  ) {
    findings.push(
      createFinding({
        code:
          "EMPTY_STATEMENT",

        category:
          VALIDATION_CATEGORY
            .CHARACTER,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          "Performance Statement is empty.",
      })
    );
  }

  if (
    count >
    characterLimit
  ) {
    findings.push(
      createFinding({
        code:
          "CHARACTER_LIMIT_EXCEEDED",

        category:
          VALIDATION_CATEGORY
            .CHARACTER,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          `Statement is ${count} characters; maximum is ${characterLimit}.`,

        detail: {
          count,
          characterLimit,
          excess:
            count -
            characterLimit,
        },
      })
    );
  }

  return {
    count,

    characterLimit,

    withinLimit:
      count <=
      characterLimit,

    status:
      getCharacterStatus(
        count,
        characterLimit
      ),

    findings,
  };
}


/* ================================================================
   CLEAN STATEMENT
   ================================================================ */

export function cleanStatement(
  statement = ""
) {
  let text =
    normalizeWhitespace(
      statement
    );

  text =
    text.replace(
      /^["“]+/,
      ""
    );

  text =
    text.replace(
      /["”]+$/,
      ""
    );

  text =
    text.replace(
      /^(?:option\s*\d+|statement)\s*[:\-]\s*/i,
      ""
    );

  return normalizeWhitespace(
    text
  );
}


/* ================================================================
   FORMATTING VALIDATION
   ================================================================ */

const LEGACY_BULLET_PATTERNS =
  Object.freeze([
    /^[•●▪◦]\s*/,
    /^[-–—]\s+/,

    /\n\s*[•●▪◦]\s*/,

    /^\s*\d+\.\s+/,
  ]);


export function validateFormatting(
  statement = ""
) {
  const text =
    String(statement ?? "");

  const clean =
    cleanStatement(
      statement
    );

  const findings = [];


  if (
    text.includes("\n")
  ) {
    findings.push(
      createFinding({
        code:
          "MULTILINE_STATEMENT",

        category:
          VALIDATION_CATEGORY
            .FORMAT,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "Performance Statement should be returned as a single narrative block rather than multiple lines.",
      })
    );
  }


  if (
    LEGACY_BULLET_PATTERNS
      .some(
        (pattern) =>
          pattern.test(text)
      )
  ) {
    findings.push(
      createFinding({
        code:
          "LEGACY_BULLET_FORMAT",

        category:
          VALIDATION_CATEGORY
            .FORMAT,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          "Legacy dash/bullet formatting detected; use modern narrative Performance Statement format.",
      })
    );
  }


  if (
    /^(option|statement)\s*\d*\s*:/i
      .test(
        normalizeWhitespace(
          text
        )
      )
  ) {
    findings.push(
      createFinding({
        code:
          "OUTPUT_LABEL_PRESENT",

        category:
          VALIDATION_CATEGORY
            .FORMAT,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "Generated statement contains an output label such as 'Option' or 'Statement'.",
      })
    );
  }


  if (
    /^["“].*["”]$/
      .test(
        normalizeWhitespace(
          text
        )
      )
  ) {
    findings.push(
      createFinding({
        code:
          "UNNECESSARY_QUOTES",

        category:
          VALIDATION_CATEGORY
            .FORMAT,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "Remove quotation marks surrounding the Performance Statement.",
      })
    );
  }


  /*
   * Multiple semicolons are not automatically prohibited,
   * but often signal legacy bullet construction.
   */
  const semicolonCount =
    (
      clean.match(
        /;/g
      ) || []
    ).length;


  if (
    semicolonCount >= 2
  ) {
    findings.push(
      createFinding({
        code:
          "HEAVY_SEMICOLON_USE",

        category:
          VALIDATION_CATEGORY
            .STYLE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "Multiple semicolons may make the statement read like a legacy bullet rather than modern narrative prose.",
      })
    );
  }


  if (
    /\.{3,}/
      .test(clean)
  ) {
    findings.push(
      createFinding({
        code:
          "ELLIPSIS_PRESENT",

        category:
          VALIDATION_CATEGORY
            .FORMAT,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          "Ellipses should not be used to truncate a Performance Statement.",
      })
    );
  }


  return {
    clean,

    findings,
  };
}


/* ================================================================
   METRIC PARSING
   ================================================================ */

function parseScaledNumber(
  raw
) {
  if (
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  const text =
    String(raw)
      .trim()
      .toLowerCase()
      .replace(
        /[$,%>\s~,]/g,
        ""
      );


  const match =
    text.match(
      /^(-?\d+(?:\.\d+)?)([kmb])?$/
    );


  if (!match) {
    return null;
  }


  const number =
    Number(
      match[1]
    );


  if (
    !Number.isFinite(number)
  ) {
    return null;
  }


  const scale = {
    k: 1_000,
    m: 1_000_000,
    b: 1_000_000_000,
  }[
    match[2]
  ] || 1;


  return (
    number *
    scale
  );
}


/* ================================================================
   NUMERIC EXTRACTION
   ================================================================ */

export function extractMetrics(
  text = ""
) {
  const source =
    String(text ?? "");

  const metrics = [];


  /*
   * Currency
   */
  const currencyRegex =
    /([><~]?\s*)?\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*([kKmMbB])?/g;


  let match;


  while (
    (
      match =
      currencyRegex.exec(
        source
      )
    ) !== null
  ) {
    const raw =
      match[0];

    const value =
      parseScaledNumber(
        `${match[2]}${match[3] || ""}`
      );


    metrics.push({
      type:
        "currency",

      raw,

      value,

      qualifier:
        normalizeWhitespace(
          match[1] || ""
        ),
    });
  }


  /*
   * Percentages
   */
  const percentRegex =
    /([><~]?\s*)?(\d+(?:\.\d+)?)\s*%/g;


  while (
    (
      match =
      percentRegex.exec(
        source
      )
    ) !== null
  ) {
    metrics.push({
      type:
        "percentage",

      raw:
        match[0],

      value:
        Number(
          match[2]
        ),

      qualifier:
        normalizeWhitespace(
          match[1] || ""
        ),
    });
  }


  /*
   * General numbers.
   *
   * Useful for personnel counts, sorties, inspections,
   * aircraft, hours, etc.
   */
  const numberRegex =
    /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;


  while (
    (
      match =
      numberRegex.exec(
        source
      )
    ) !== null
  ) {
    const value =
      Number(
        match[0]
          .replace(
            /,/g,
            ""
          )
      );


    if (
      Number.isFinite(value)
    ) {
      metrics.push({
        type:
          "number",

        raw:
          match[0],

        value,
      });
    }
  }


  return metrics;
}


/* ================================================================
   EVIDENCE VALUE EXTRACTION
   ================================================================ */

function flattenEvidenceValues(
  value,
  output = []
) {
  if (
    value === null ||
    value === undefined
  ) {
    return output;
  }


  if (
    Array.isArray(value)
  ) {
    for (
      const item
      of value
    ) {
      flattenEvidenceValues(
        item,
        output
      );
    }

    return output;
  }


  if (
    typeof value ===
    "object"
  ) {
    /*
     * Common deterministic fact object:
     *
     * {
     *   label: "...",
     *   value: 300,
     *   unit: "percent"
     * }
     */
    if (
      Object.prototype
        .hasOwnProperty
        .call(
          value,
          "value"
        )
    ) {
      output.push({
        value:
          value.value,

        unit:
          value.unit ||
          null,

        label:
          value.label ||
          value.id ||
          null,

        source:
          value.source ||
          null,
      });
    }


    for (
      const nested
      of Object.values(
        value
      )
    ) {
      flattenEvidenceValues(
        nested,
        output
      );
    }

    return output;
  }


  output.push({
    value,
    unit: null,
    label: null,
    source: null,
  });

  return output;
}


export function collectEvidenceMetrics({
  accomplishment = "",
  evidence = {},
} = {}) {

  const sourceMetrics =
    extractMetrics(
      accomplishment
    );


  const evidenceRows =
    flattenEvidenceValues({
      explicitFacts:
        evidence?.explicitFacts,

      confirmedFacts:
        evidence?.confirmedFacts,

      derivedFacts:
        evidence?.derivedFacts,

      derivedMetrics:
        evidence?.derivedMetrics,

      writingSafeImpacts:
        evidence?.writingSafeImpacts,
    });


  const evidenceText =
    evidenceRows
      .map(
        (row) =>
          typeof row.value ===
          "string"
            ? row.value
            : ""
      )
      .join(" ");


  const evidenceTextMetrics =
    extractMetrics(
      evidenceText
    );


  /*
   * Convert explicit numeric fact objects.
   */
  const typedMetrics = [];


  for (
    const row
    of evidenceRows
  ) {
    const parsed =
      parseScaledNumber(
        row.value
      );


    if (
      parsed === null
    ) {
      continue;
    }


    const unit =
      normalizeLower(
        row.unit
      );


    if (
      [
        "usd",
        "dollar",
        "dollars",
      ].includes(unit)
    ) {
      typedMetrics.push({
        type:
          "currency",

        value:
          parsed,

        source:
          row.label,
      });
    }


    else if (
      [
        "percent",
        "percentage",
        "%",
      ].includes(unit)
    ) {
      typedMetrics.push({
        type:
          "percentage",

        value:
          parsed,

        source:
          row.label,
      });
    }


    else {
      typedMetrics.push({
        type:
          "number",

        value:
          parsed,

        source:
          row.label,
      });
    }
  }


  return uniqueBy(
    [
      ...sourceMetrics,
      ...evidenceTextMetrics,
      ...typedMetrics,
    ],

    (metric) =>
      `${metric.type}:${metric.value}`
  );
}


/* ================================================================
   NUMBER CONTEXT
   ================================================================ */

function getMetricContext(
  text,
  raw,
  radius = 45
) {
  const index =
    text.indexOf(raw);


  if (
    index < 0
  ) {
    return "";
  }


  return text.slice(
    Math.max(
      0,
      index -
      radius
    ),

    Math.min(
      text.length,
      index +
      raw.length +
      radius
    )
  );
}


/* ================================================================
   NUMERIC AUDIT
   ================================================================ */

/**
 * Detects metrics used in the generated statement that do not exist
 * in the source accomplishment or deterministic evidence packet.
 *
 * IMPORTANT:
 * General numbers can occasionally represent identifiers such as
 * "5-level". For that reason, unsupported general numbers default
 * to ERROR only when they appear in a likely metric context.
 */

export function auditNumbers({
  statement = "",
  accomplishment = "",
  evidence = {},
} = {}) {

  const generatedMetrics =
    extractMetrics(
      statement
    );


  const allowedMetrics =
    collectEvidenceMetrics({
      accomplishment,
      evidence,
    });


  const findings = [];


  const generatedUnique =
    uniqueBy(
      generatedMetrics,

      (metric) =>
        `${metric.type}:${metric.value}`
    );


  for (
    const metric
    of generatedUnique
  ) {
    let supported = false;


    /*
     * Exact same metric type.
     */
    supported =
      allowedMetrics.some(
        (allowed) =>
          allowed.type ===
            metric.type &&
          approximatelyEqual(
            allowed.value,
            metric.value
          )
      );


    /*
     * Currency / percentage may also appear as raw numbers
     * in deterministic fact packets.
     */
    if (
      !supported &&
      [
        "currency",
        "percentage",
      ].includes(
        metric.type
      )
    ) {
      supported =
        allowedMetrics.some(
          (allowed) =>
            approximatelyEqual(
              allowed.value,
              metric.value
            )
        );
    }


    /*
     * General numeric tokens contained inside a verified currency or
     * percentage are not independently unsupported.
     */
    if (
      metric.type ===
        "number"
    ) {
      const matchingTyped =
        generatedMetrics.some(
          (other) =>
            other.type !==
              "number" &&
            approximatelyEqual(
              other.value,
              metric.value
            )
        );


      if (
        matchingTyped
      ) {
        continue;
      }
    }


    if (
      supported
    ) {
      continue;
    }


    const context =
      getMetricContext(
        statement,
        metric.raw
      );


    const likelyMetricContext =
      /\b(?:airmen|amn|people|personnel|troops|technicians|aircraft|acft|sorties|missions|inspections|hours?|days?|weeks?|months?|years?|dollars?|saved|cost|increased|reduced|improved|qualified|qualification|assets?|engines?|vehicles?)\b/i
        .test(context);


    let severity =
      VALIDATION_SEVERITY
        .ERROR;


    if (
      metric.type ===
        "number" &&
      !likelyMetricContext
    ) {
      severity =
        VALIDATION_SEVERITY
          .WARNING;
    }


    findings.push(
      createFinding({
        code:
          metric.type ===
            "currency"

            ? "UNSUPPORTED_DOLLAR_AMOUNT"

            : metric.type ===
              "percentage"

              ? "UNSUPPORTED_PERCENTAGE"

              : "UNSUPPORTED_NUMBER",

        category:
          VALIDATION_CATEGORY
            .NUMBER,

        severity,

        message:
          `Generated metric "${metric.raw}" is not supported by the source accomplishment or deterministic evidence.`,

        detail: {
          metric,
          context,
        },
      })
    );
  }


  return {
    generatedMetrics:
      generatedUnique,

    allowedMetrics,

    findings,

    valid:
      !findings.some(
        (finding) =>
          [
            VALIDATION_SEVERITY.ERROR,
            VALIDATION_SEVERITY.CRITICAL,
          ].includes(
            finding.severity
          )
      ),
  };
}


/* ================================================================
   EVIDENCE TEXT BUILDING
   ================================================================ */

function evidenceToText(
  evidence = {}
) {
  const values =
    flattenEvidenceValues({
      explicitFacts:
        evidence?.explicitFacts,

      confirmedFacts:
        evidence?.confirmedFacts,

      derivedFacts:
        evidence?.derivedFacts,

      derivedMetrics:
        evidence?.derivedMetrics,

      writingSafeImpacts:
        evidence?.writingSafeImpacts,
    });


  return normalizeLower(
    values
      .map(
        (row) => {
          if (
            row.value ===
            true
          ) {
            return (
              row.label ||
              ""
            );
          }

          if (
            row.value ===
            false
          ) {
            return "";
          }

          return String(
            row.value ??
            ""
          );
        }
      )
      .join(" ")
  );
}


/* ================================================================
   HIGH-RISK IMPACT CLAIMS
   ================================================================ */

/**
 * The impact-engine remains the primary authority for causal-impact
 * validation.
 *
 * This is a fail-safe validator for statements processed without a
 * complete impact audit.
 */

export const HIGH_RISK_CLAIMS =
  Object.freeze([
    {
      id:
        "readiness",

      patterns: [
        /\breadiness\b/i,
        /\bmission ready\b/i,
        /\bmission-ready\b/i,
      ],

      evidenceTerms: [
        "readiness",
        "mission ready",
        "mission-ready",
      ],

      message:
        "Readiness language requires verified readiness evidence.",
    },


    {
      id:
        "mishap",

      patterns: [
        /\bmishap\b/i,
        /\bcatastrophic\b/i,
        /\bprevented .*aircraft loss\b/i,
        /\baverted .*aircraft loss\b/i,
      ],

      evidenceTerms: [
        "mishap",
        "documentedmishaprisk",
        "documented mishap risk",
      ],

      message:
        "Mishap or catastrophic-loss claims require documented causal evidence.",
    },


    {
      id:
        "safety",

      patterns: [
        /\bflight[- ]critical\b/i,
        /\bsafety[- ]critical\b/i,
        /\bsafety hazard\b/i,
        /\bprevented .*hazard\b/i,
      ],

      evidenceTerms: [
        "safety",
        "hazard",
        "flight-critical",
        "flight critical",
      ],

      message:
        "Safety-critical claims require verified technical, safety, QA, or engineering support.",
    },


    {
      id:
        "deployment",

      patterns: [
        /\bdeployment\b/i,
        /\bdeploy(?:ed|ment|ing)\b/i,
        /\bcontingency\b/i,
      ],

      evidenceTerms: [
        "deployment",
        "deployed",
        "contingency",
      ],

      message:
        "Deployment claims require verified connection to the accomplishment.",
    },


    {
      id:
        "sortie",

      patterns: [
        /\bsorties?\b/i,
      ],

      evidenceTerms: [
        "sortie",
        "sorties",
      ],

      message:
        "Sortie claims require verified sortie evidence.",
    },


    {
      id:
        "wing_scope",

      patterns: [
        /\bwing[- ]wide\b/i,
        /\bacross the wing\b/i,
      ],

      evidenceTerms: [
        "wing-wide",
        "wing wide",
        "across the wing",
      ],

      message:
        "Wing-wide scope requires verified organizational reach.",
    },


    {
      id:
        "majcom_scope",

      patterns: [
        /\bmajcom\b/i,
        /\bmajor command\b/i,
        /\bcommand[- ]wide\b/i,
      ],

      evidenceTerms: [
        "majcom",
        "major command",
        "command-wide",
      ],

      message:
        "MAJCOM-level scope requires verified organizational evidence.",
    },


    {
      id:
        "daf_scope",

      patterns: [
        /\bair force[- ]wide\b/i,
        /\bdaf[- ]wide\b/i,
        /\bdepartment of the air force\b/i,
        /\benterprise[- ]wide\b/i,
        /\bservice[- ]wide\b/i,
      ],

      evidenceTerms: [
        "air force-wide",
        "daf-wide",
        "department of the air force",
        "enterprise-wide",
        "service-wide",
      ],

      message:
        "Enterprise or DAF-wide scope requires verified adoption or impact evidence.",
    },
  ]);


export function auditHighRiskClaims({
  statement = "",
  accomplishment = "",
  evidence = {},
} = {}) {

  const text =
    normalizeLower(
      statement
    );


  const sourceText =
    normalizeLower(
      accomplishment
    );


  const evidenceText =
    evidenceToText(
      evidence
    );


  const combinedEvidence =
    `${sourceText} ${evidenceText}`;


  const findings = [];


  for (
    const rule
    of HIGH_RISK_CLAIMS
  ) {
    const used =
      rule.patterns.some(
        (pattern) =>
          pattern.test(
            statement
          )
      );


    if (!used) {
      continue;
    }


    const supported =
      rule.evidenceTerms
        .some(
          (term) =>
            combinedEvidence
              .includes(
                term.toLowerCase()
              )
        );


    if (
      !supported
    ) {
      findings.push(
        createFinding({
          code:
            `UNSUPPORTED_${rule.id.toUpperCase()}`,

          category:
            VALIDATION_CATEGORY
              .IMPACT,

          severity:
            VALIDATION_SEVERITY
              .ERROR,

          message:
            rule.message,

          detail: {
            claim:
              rule.id,
          },
        })
      );
    }
  }


  return {
    findings,

    valid:
      !findings.some(
        (finding) =>
          finding.severity ===
            VALIDATION_SEVERITY.ERROR ||
          finding.severity ===
            VALIDATION_SEVERITY.CRITICAL
      ),
  };
}


/* ================================================================
   ACRONYM DETECTION
   ================================================================ */

export function findAcronyms(
  statement = ""
) {
  const matches =
    String(statement)
      .match(
        /\b[A-Z][A-Z0-9]{1,9}\b/g
      ) || [];


  return unique(
    matches
  );
}


/* ================================================================
   ACRONYM VALIDATION
   ================================================================ */

export function validateAcronyms({
  statement = "",
  allowedAcronyms = [],
} = {}) {

  const acronyms =
    findAcronyms(
      statement
    );


  const allowed =
    new Set(
      [
        ...DEFAULT_ACRONYM_ALLOWLIST,
        ...safeArray(
          allowedAcronyms
        ),
      ]
        .map(
          (item) =>
            String(item)
              .trim()
              .toUpperCase()
        )
    );


  const findings = [];


  const unknown =
    acronyms.filter(
      (acronym) =>
        !allowed.has(
          acronym.toUpperCase()
        )
    );


  for (
    const acronym
    of unknown
  ) {
    findings.push(
      createFinding({
        code:
          "ACRONYM_REVIEW",

        category:
          VALIDATION_CATEGORY
            .ACRONYM,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          `Review acronym "${acronym}" against the current Air Force Performance Statement acronym guidance.`,

        detail: {
          acronym,
        },

        repairable:
          false,
      })
    );
  }


  return {
    acronyms,

    unknown,

    findings,
  };
}


/* ================================================================
   ACTION VERB ANALYSIS
   ================================================================ */

const ACTION_VERBS =
  Object.freeze([
    "achieved",
    "administered",
    "analyzed",
    "authored",
    "built",
    "coached",
    "completed",
    "conducted",
    "coordinated",
    "created",
    "developed",
    "directed",
    "discovered",
    "eliminated",
    "established",
    "executed",
    "found",
    "identified",
    "implemented",
    "improved",
    "inspected",
    "instructed",
    "led",
    "managed",
    "mentored",
    "organized",
    "performed",
    "qualified",
    "repaired",
    "resolved",
    "restored",
    "revamped",
    "saved",
    "streamlined",
    "supervised",
    "trained",
    "validated",
  ]);


/* ================================================================
   STRUCTURAL SIGNALS
   ================================================================ */

const RESULT_PATTERNS =
  Object.freeze([
    /\bresult(?:ed|ing)?\b/i,
    /\bidentified\b/i,
    /\bfound\b/i,
    /\bcompleted\b/i,
    /\bachieved\b/i,
    /\bqualified\b/i,
    /\brestored\b/i,
    /\breturned\b/i,
    /\breduced\b/i,
    /\bincreased\b/i,
    /\bimproved\b/i,
    /\beliminated\b/i,
    /\bavoided\b/i,
    /\bsaved\b/i,
    /\benabled\b/i,
  ]);


const IMPACT_PATTERNS =
  Object.freeze([
    /\bsav(?:ed|ings?)\b/i,
    /\bcost avoidance\b/i,
    /\bmission\b/i,
    /\breadiness\b/i,
    /\bavailability\b/i,
    /\bqualification\b/i,
    /\bqualified\b/i,
    /\bmanpower\b/i,
    /\befficien/i,
    /\btime\b/i,
    /\bpercent\b/i,
    /%/,
    /\$\s*\d/i,
    /\bdeployment\b/i,
    /\bsortie\b/i,
    /\bsafety\b/i,
    /\breturn(?:ed)? to service\b/i,
  ]);


const SCOPE_PATTERNS =
  Object.freeze([
    /\b\d+\s+(?:airmen|amn|people|personnel|troops|technicians|aircraft|assets|sorties|missions|inspections|hours|days|weeks|months)\b/i,

    /\bteam\b/i,
    /\bcrew\b/i,
    /\bshift\b/i,
    /\bsection\b/i,
    /\bflight\b/i,
    /\bsquadron\b/i,
    /\bgroup\b/i,
    /\bwing\b/i,
    /\bmajcom\b/i,
    /\bdaf\b/i,
    /\bair force\b/i,
  ]);


/* ================================================================
   STRUCTURE ANALYSIS
   ================================================================ */

export function analyzeStructure(
  statement = ""
) {
  const text =
    cleanStatement(
      statement
    );


  const lower =
    text.toLowerCase();


  const firstWord =
    (
      text.match(
        /^[A-Za-z][A-Za-z'-]*/
      ) || []
    )[0] || "";


  const actionPresent =
    ACTION_VERBS.includes(
      firstWord.toLowerCase()
    ) ||
    ACTION_VERBS.some(
      (verb) =>
        new RegExp(
          `\\b${verb}\\b`,
          "i"
        ).test(text)
    );


  const scopePresent =
    SCOPE_PATTERNS.some(
      (pattern) =>
        pattern.test(
          text
        )
    );


  const resultPresent =
    RESULT_PATTERNS.some(
      (pattern) =>
        pattern.test(
          text
        )
    );


  const impactPresent =
    IMPACT_PATTERNS.some(
      (pattern) =>
        pattern.test(
          text
        )
    );


  return {
    action: {
      present:
        actionPresent,

      openingWord:
        firstWord ||
        null,
    },

    scope: {
      present:
        scopePresent,
    },

    result: {
      present:
        resultPresent,
    },

    impact: {
      present:
        impactPresent,
    },

    score:
      [
        actionPresent,
        scopePresent,
        resultPresent,
        impactPresent,
      ]
        .filter(Boolean)
        .length,

    lower,
  };
}


/* ================================================================
   STRUCTURE VALIDATION
   ================================================================ */

export function validateStructure({
  statement = "",
  evidence = {},
} = {}) {

  const structure =
    analyzeStructure(
      statement
    );


  const findings = [];


  if (
    !structure
      .action
      .present
  ) {
    findings.push(
      createFinding({
        code:
          "ACTION_WEAK_OR_MISSING",

        category:
          VALIDATION_CATEGORY
            .STRUCTURE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "The statement does not clearly communicate the member's action.",
      })
    );
  }


  if (
    !structure
      .result
      .present
  ) {
    findings.push(
      createFinding({
        code:
          "RESULT_WEAK_OR_MISSING",

        category:
          VALIDATION_CATEGORY
            .STRUCTURE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "The statement does not clearly communicate what changed or resulted from the action.",
      })
    );
  }


  /*
   * Only warn about missing impact when evidence suggests impact is
   * actually available.
   */
  const availableImpact =
    safeArray(
      evidence
        ?.writingSafeImpacts
    ).length > 0 ||
    safeArray(
      evidence
        ?.derivedFacts
    ).length > 0 ||
    safeArray(
      evidence
        ?.derivedMetrics
    ).length > 0;


  if (
    availableImpact &&
    !structure
      .impact
      .present
  ) {
    findings.push(
      createFinding({
        code:
          "AVAILABLE_IMPACT_NOT_USED",

        category:
          VALIDATION_CATEGORY
            .STRUCTURE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "Verified impact is available but the statement does not clearly communicate it.",
      })
    );
  }


  return {
    structure,
    findings,
  };
}


/* ================================================================
   SECTION / MPA ALIGNMENT
   ================================================================ */

const SECTION_SIGNALS =
  Object.freeze({
    [SECTION.DUTY_DESCRIPTION]: [
      /\bresponsib/i,
      /\bmanaged\b/i,
      /\boversaw\b/i,
      /\bmaintained\b/i,
      /\bpersonnel\b/i,
      /\bequipment\b/i,
      /\bassets?\b/i,
      /\bmission\b/i,
      /\bscope\b/i,
    ],


    [SECTION.EXECUTING_MISSION]: [
      /\bmission\b/i,
      /\bexecut/i,
      /\binspect/i,
      /\brepair/i,
      /\bmaintain/i,
      /\brestor/i,
      /\bidentified\b/i,
      /\btechnical\b/i,
      /\breadiness\b/i,
      /\bavailability\b/i,
    ],


    [SECTION.LEADING_PEOPLE]: [
      /\btrain/i,
      /\bmentor/i,
      /\bcoach/i,
      /\bsupervis/i,
      /\bled\b/i,
      /\bdevelop/i,
      /\bqualified\b/i,
      /\bairmen\b/i,
      /\bteam\b/i,
      /\bpeople\b/i,
    ],


    [SECTION.MANAGING_RESOURCES]: [
      /\$\s*\d/i,
      /\bcost\b/i,
      /\bsav/i,
      /\bresource/i,
      /\bmanpower\b/i,
      /\bequipment\b/i,
      /\basset/i,
      /\bfunds?\b/i,
      /\bbudget\b/i,
      /\bhours?\b/i,
      /\befficien/i,
    ],


    [SECTION.IMPROVING_UNIT]: [
      /\bimprov/i,
      /\bdeveloped\b/i,
      /\bcreated\b/i,
      /\bauthored\b/i,
      /\binnov/i,
      /\bprocess\b/i,
      /\bstreamlin/i,
      /\bprocedure\b/i,
      /\btechnique\b/i,
      /\bstandard/i,
      /\badopt/i,
    ],
  });


export function validateSectionAlignment({
  statement = "",
  section = "",
} = {}) {

  const normalizedSection =
    normalizeSection(
      section
    );


  const patterns =
    SECTION_SIGNALS[
      normalizedSection
    ] || [];


  const aligned =
    patterns.length === 0 ||
    patterns.some(
      (pattern) =>
        pattern.test(
          statement
        )
    );


  const findings = [];


  if (!aligned) {
    findings.push(
      createFinding({
        code:
          "SECTION_ALIGNMENT_REVIEW",

        category:
          VALIDATION_CATEGORY
            .SECTION,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          "The statement may not strongly reflect the selected MPA/section. Review framing rather than changing the underlying facts.",

        detail: {
          section:
            normalizedSection,
        },

        repairable:
          false,
      })
    );
  }


  return {
    section:
      normalizedSection,

    aligned,

    findings,
  };
}


/* ================================================================
   HYPERBOLE / EMPTY PRAISE
   ================================================================ */

export const SUSPICIOUS_STYLE_PATTERNS =
  Object.freeze([
    {
      code:
        "UNSUPPORTED_BEST_CLAIM",

      pattern:
        /\b(?:best|#1|number one|top[- ]rated|top performer)\b/i,

      message:
        "Superlative ranking language should be supported by documented evidence.",
    },


    {
      code:
        "UNSUPPORTED_PERFECTION_CLAIM",

      pattern:
        /\b(?:flawless|perfect|zero-error|zero defect)\b/i,

      message:
        "Absolute perfection claims should be supported by verified metrics.",
    },


    {
      code:
        "GENERIC_PRAISE",

      pattern:
        /\b(?:exceptional|outstanding|stellar|phenomenal|world-class|elite)\b/i,

      message:
        "Generic praise consumes space without proving impact; prefer specific action and measurable result.",
    },


    {
      code:
        "GUARANTEE_LANGUAGE",

      pattern:
        /\b(?:guaranteed|ensured 100%|single-handedly)\b/i,

      message:
        "Absolute causal language may overstate the member's contribution; verify or use more precise wording.",
    },
  ]);


export function validateStyle(
  statement = ""
) {
  const findings = [];


  for (
    const rule
    of SUSPICIOUS_STYLE_PATTERNS
  ) {
    if (
      rule.pattern.test(
        statement
      )
    ) {
      findings.push(
        createFinding({
          code:
            rule.code,

          category:
            VALIDATION_CATEGORY
              .STYLE,

          severity:
            VALIDATION_SEVERITY
              .WARNING,

          message:
            rule.message,
        })
      );
    }
  }


  /*
   * Consecutive repeated words.
   */
  const repeatedWord =
    normalizeWhitespace(
      statement
    )
      .match(
        /\b([A-Za-z]+)\s+\1\b/i
      );


  if (
    repeatedWord
  ) {
    findings.push(
      createFinding({
        code:
          "REPEATED_WORD",

        category:
          VALIDATION_CATEGORY
            .STYLE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          `Repeated word detected: "${repeatedWord[1]}".`,
      })
    );
  }


  return {
    findings,
  };
}


/* ================================================================
   RANK ANALYSIS INTEGRATION
   ================================================================ */

/**
 * rank-tier.js should remain the authority.
 *
 * This function only consumes an existing rank analysis result.
 */

export function consumeRankAnalysis(
  rankAnalysis
) {
  const findings = [];


  if (
    !rankAnalysis
  ) {
    return {
      findings,
    };
  }


  const restricted =
    safeArray(
      rankAnalysis.restricted
    );


  for (
    const item
    of restricted
  ) {
    findings.push(
      createFinding({
        code:
          "RANK_RESTRICTED_CLAIM",

        category:
          VALIDATION_CATEGORY
            .RANK,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          item?.reason ||
          item?.message ||
          "Responsibility claim conflicts with the current rank-tier rules.",

        detail:
          item,
      })
    );
  }


  return {
    findings,
  };
}


/* ================================================================
   OPENING WORD
   ================================================================ */

export function getOpeningWord(
  statement = ""
) {
  const text =
    cleanStatement(
      statement
    );


  const match =
    text.match(
      /^[A-Za-z][A-Za-z'-]*/
    );


  return (
    match?.[0]
      ?.toLowerCase() ||
    ""
  );
}


/* ================================================================
   DUPLICATE OPENING VERBS
   ================================================================ */

export function validateDuplicateOpeners(
  statements = []
) {
  const map =
    new Map();


  statements.forEach(
    (
      statement,
      index
    ) => {
      const text =
        typeof statement ===
          "string"

          ? statement

          : statement
              ?.statement ||
            "";


      const opener =
        getOpeningWord(
          text
        );


      if (!opener) {
        return;
      }


      const indexes =
        map.get(
          opener
        ) || [];


      indexes.push(
        index
      );


      map.set(
        opener,
        indexes
      );
    }
  );


  const findings = [];


  for (
    const [
      opener,
      indexes,
    ]
    of map.entries()
  ) {
    if (
      indexes.length <= 1
    ) {
      continue;
    }


    findings.push(
      createFinding({
        code:
          "DUPLICATE_OPENING_VERB",

        category:
          VALIDATION_CATEGORY
            .DUPLICATE,

        severity:
          VALIDATION_SEVERITY
            .WARNING,

        message:
          `Opening verb "${opener}" is repeated across generated options.`,

        detail: {
          opener,
          indexes,
        },
      })
    );
  }


  return {
    findings,

    duplicates:
      findings.map(
        (finding) =>
          finding.detail
      ),
  };
}


/* ================================================================
   OPTIONAL IMPACT AUDIT CONSUMPTION
   ================================================================ */

/**
 * impact-engine.js remains the authority.
 *
 * This function consumes its result when provided.
 */

export function consumeImpactAudit(
  impactAudit
) {
  const findings = [];


  if (
    !impactAudit
  ) {
    return {
      findings,
    };
  }


  for (
    const item
    of safeArray(
      impactAudit.unsupported
    )
  ) {
    findings.push(
      createFinding({
        code:
          "UNSUPPORTED_IMPACT_CLAIM",

        category:
          VALIDATION_CATEGORY
            .IMPACT,

        severity:
          VALIDATION_SEVERITY
            .ERROR,

        message:
          item?.message ||
          "Statement contains an unsupported impact claim.",

        detail:
          item,
      })
    );
  }


  return {
    findings,
  };
}


/* ================================================================
   FINDING HELPERS
   ================================================================ */

function dedupeFindings(
  findings = []
) {
  return uniqueBy(
    findings,

    (finding) =>
      [
        finding.code,
        finding.message,
        JSON.stringify(
          finding.detail || {}
        ),
      ].join("|")
  );
}


function splitFindings(
  findings = []
) {
  const errors =
    findings.filter(
      (finding) =>
        [
          VALIDATION_SEVERITY
            .ERROR,

          VALIDATION_SEVERITY
            .CRITICAL,
        ].includes(
          finding.severity
        )
    );


  const warnings =
    findings.filter(
      (finding) =>
        finding.severity ===
        VALIDATION_SEVERITY
          .WARNING
    );


  const info =
    findings.filter(
      (finding) =>
        finding.severity ===
        VALIDATION_SEVERITY
          .INFO
    );


  return {
    errors,
    warnings,
    info,
  };
}


/* ================================================================
   MAIN STATEMENT VALIDATOR
   ================================================================ */

/**
 * Main validation entry point expected by opb-universal.js.
 *
 * Example:
 *
 * validateStatement({
 *   statement,
 *   accomplishment,
 *   section,
 *   ratedRank,
 *   variation,
 *   characterLimit: 350,
 *   evidence,
 *   rankAnalysis,
 *   impactAnalysis,
 *   allowedAcronyms
 * });
 */

export function validateStatement({
  statement = "",
  accomplishment = "",
  section =
    SECTION.EXECUTING_MISSION,
  ratedRank = "",
  variation = "balanced",
  characterLimit =
    DEFAULT_CHARACTER_LIMIT,
  evidence = {},
  rankAnalysis = null,
  impactAnalysis = null,
  impactAudit = null,
  allowedAcronyms = [],
} = {}) {

  const clean =
    cleanStatement(
      statement
    );


  const allFindings = [];


  /* --------------------------------------------------------------
     CHARACTER COUNT
     -------------------------------------------------------------- */

  const character =
    validateCharacterCount({
      statement:
        clean,

      characterLimit,
    });


  allFindings.push(
    ...character.findings
  );


  /* --------------------------------------------------------------
     FORMATTING
     -------------------------------------------------------------- */

  const format =
    validateFormatting(
      statement
    );


  allFindings.push(
    ...format.findings
  );


  /* --------------------------------------------------------------
     NUMERIC CONSISTENCY
     -------------------------------------------------------------- */

  const numbers =
    auditNumbers({
      statement:
        clean,

      accomplishment,

      evidence,
    });


  allFindings.push(
    ...numbers.findings
  );


  /* --------------------------------------------------------------
     HIGH-RISK CLAIM FAIL-SAFE
     -------------------------------------------------------------- */

  const highRisk =
    auditHighRiskClaims({
      statement:
        clean,

      accomplishment,

      evidence,
    });


  allFindings.push(
    ...highRisk.findings
  );


  /* --------------------------------------------------------------
     ACRONYMS
     -------------------------------------------------------------- */

  const acronyms =
    validateAcronyms({
      statement:
        clean,

      allowedAcronyms,
    });


  allFindings.push(
    ...acronyms.findings
  );


  /* --------------------------------------------------------------
     STRUCTURE
     -------------------------------------------------------------- */

  const structure =
    validateStructure({
      statement:
        clean,

      evidence,
    });


  allFindings.push(
    ...structure.findings
  );


  /* --------------------------------------------------------------
     MPA / SECTION ALIGNMENT
     -------------------------------------------------------------- */

  const sectionAlignment =
    validateSectionAlignment({
      statement:
        clean,

      section,
    });


  allFindings.push(
    ...sectionAlignment
      .findings
  );


  /* --------------------------------------------------------------
     STYLE
     -------------------------------------------------------------- */

  const style =
    validateStyle(
      clean
    );


  allFindings.push(
    ...style.findings
  );


  /* --------------------------------------------------------------
     PRECOMPUTED RANK ANALYSIS
     -------------------------------------------------------------- */

  const rank =
    consumeRankAnalysis(
      rankAnalysis
    );


  allFindings.push(
    ...rank.findings
  );


  /* --------------------------------------------------------------
     PRECOMPUTED IMPACT AUDIT
     -------------------------------------------------------------- */

  const impact =
    consumeImpactAudit(
      impactAudit
    );


  allFindings.push(
    ...impact.findings
  );


  /*
   * impactAnalysis is intentionally retained in the result for
   * debugging, but we do not reinterpret the entire engine here.
   */
  void impactAnalysis;


  const findings =
    dedupeFindings(
      allFindings
    );


  const {
    errors,
    warnings,
    info,
  } =
    splitFindings(
      findings
    );


  const valid =
    errors.length === 0 &&
    character.withinLimit;


  return {
    version:
      OPB_VALIDATOR_VERSION,

    valid,

    statement:
      clean,

    input: {
      accomplishment:
        normalizeWhitespace(
          accomplishment
        ),

      section:
        normalizeSection(
          section
        ),

      ratedRank,

      variation,
    },


    characterCount:
      character.count,

    characterLimit:
      character.characterLimit,

    characterStatus:
      character.status,


    checks: {
      character,

      format,

      numbers,

      highRisk,

      acronyms,

      structure,

      sectionAlignment,

      style,

      rank,

      impact,
    },


    findings,

    errors,

    warnings,

    info,


    summary: {
      errorCount:
        errors.length,

      warningCount:
        warnings.length,

      infoCount:
        info.length,

      withinLimit:
        character.withinLimit,

      unsupportedNumbers:
        numbers.findings
          .filter(
            (finding) =>
              finding.code
                .startsWith(
                  "UNSUPPORTED_"
                )
          )
          .length,

      unknownAcronyms:
        acronyms
          .unknown
          .length,

      structureScore:
        structure
          .structure
          .score,

      sectionAligned:
        sectionAlignment
          .aligned,
    },
  };
}


/* ================================================================
   COMPATIBILITY ALIAS
   ================================================================ */

export const validatePerformanceStatement =
  validateStatement;


/* ================================================================
   OPTION SET VALIDATION
   ================================================================ */

/**
 * Validates all three generated options together.
 *
 * Useful after opb-universal.js has generated:
 *
 *   Option 1
 *   Option 2
 *   Option 3
 */

export function validateOptionSet({
  options = [],
  accomplishment = "",
  section =
    SECTION.EXECUTING_MISSION,
  ratedRank = "",
  variation = "balanced",
  characterLimit =
    DEFAULT_CHARACTER_LIMIT,
  evidence = {},
  allowedAcronyms = [],
} = {}) {

  const optionResults =
    options.map(
      (
        option,
        index
      ) => {

        const statement =
          typeof option ===
            "string"

            ? option

            : option
                ?.statement ||
              "";


        return {
          id:
            typeof option ===
              "object"

              ? option.id ||
                `option_${index + 1}`

              : `option_${index + 1}`,

          index,

          validation:
            validateStatement({
              statement,

              accomplishment,

              section,

              ratedRank,

              variation,

              characterLimit,

              evidence,

              allowedAcronyms,
            }),
        };
      }
    );


  const duplicateOpeners =
    validateDuplicateOpeners(
      options
    );


  const validCount =
    optionResults
      .filter(
        (item) =>
          item
            .validation
            .valid
      )
      .length;


  const totalErrors =
    optionResults
      .reduce(
        (
          total,
          item
        ) =>
          total +
          item
            .validation
            .errors
            .length,

        0
      );


  const totalWarnings =
    optionResults
      .reduce(
        (
          total,
          item
        ) =>
          total +
          item
            .validation
            .warnings
            .length,

        0
      ) +
    duplicateOpeners
      .findings
      .length;


  return {
    valid:
      validCount ===
      optionResults.length,

    options:
      optionResults,

    duplicateOpeners,

    summary: {
      optionCount:
        optionResults.length,

      validCount,

      invalidCount:
        optionResults.length -
        validCount,

      totalErrors,

      totalWarnings,
    },
  };
}


/* ================================================================
   REPAIR DECISION
   ================================================================ */

/**
 * Gives opb-universal.js a deterministic recommendation.
 */

export function getRepairDecision(
  validation
) {
  if (
    !validation
  ) {
    return {
      action:
        "NONE",

      reason:
        null,
    };
  }


  if (
    validation
      .characterCount >
    validation
      .characterLimit
  ) {
    return {
      action:
        "COMPRESS",

      reason:
        "Statement exceeds the character limit.",

      errors:
        validation.errors ||
        [],
    };
  }


  if (
    validation
      .errors
      ?.length
  ) {
    return {
      action:
        "REPAIR",

      reason:
        "Statement contains deterministic validation errors.",

      errors:
        validation.errors,
    };
  }


  if (
    validation
      .warnings
      ?.length
  ) {
    return {
      action:
        "REVIEW",

      reason:
        "Statement is valid but contains review warnings.",

      warnings:
        validation.warnings,
    };
  }


  return {
    action:
      "NONE",

    reason:
      null,
  };
}


/* ================================================================
   UI-FRIENDLY SUMMARY
   ================================================================ */

export function buildValidationDisplay(
  validation
) {
  if (
    !validation
  ) {
    return null;
  }


  const {
    characterCount,
    characterLimit,
    characterStatus,
    errors = [],
    warnings = [],
  } = validation;


  let state =
    "valid";


  if (
    errors.length
  ) {
    state =
      "error";
  }

  else if (
    warnings.length
  ) {
    state =
      "warning";
  }


  return {
    state,

    characterLabel:
      `${characterCount} / ${characterLimit}`,

    characterStatus,

    errorCount:
      errors.length,

    warningCount:
      warnings.length,

    messages: [
      ...errors.map(
        (item) => ({
          type:
            "error",

          code:
            item.code,

          message:
            item.message,
        })
      ),

      ...warnings.map(
        (item) => ({
          type:
            "warning",

          code:
            item.code,

          message:
            item.message,
        })
      ),
    ],
  };
}


/* ================================================================
   DEBUG HELPER
   ================================================================ */

export function debugStatement({
  statement,
  accomplishment,
  section,
  ratedRank,
  variation,
  characterLimit,
  evidence,
  allowedAcronyms,
} = {}) {

  const validation =
    validateStatement({
      statement,
      accomplishment,
      section,
      ratedRank,
      variation,
      characterLimit,
      evidence,
      allowedAcronyms,
    });


  return {
    validation,

    repairDecision:
      getRepairDecision(
        validation
      ),

    display:
      buildValidationDisplay(
        validation
      ),
  };
}


/* ================================================================
   DEFAULT EXPORT
   ================================================================ */

export default {
  version:
    OPB_VALIDATOR_VERSION,

  DEFAULT_CHARACTER_LIMIT,

  CHARACTER_STATUS,

  VALIDATION_SEVERITY,

  VALIDATION_CATEGORY,

  SECTION,

  DEFAULT_ACRONYM_ALLOWLIST,

  HIGH_RISK_CLAIMS,

  SUSPICIOUS_STYLE_PATTERNS,

  createFinding,

  countCharacters,

  getCharacterStatus,

  cleanStatement,

  validateCharacterCount,

  validateFormatting,

  extractMetrics,

  collectEvidenceMetrics,

  auditNumbers,

  auditHighRiskClaims,

  findAcronyms,

  validateAcronyms,

  analyzeStructure,

  validateStructure,

  validateSectionAlignment,

  validateStyle,

  consumeRankAnalysis,

  consumeImpactAudit,

  getOpeningWord,

  validateDuplicateOpeners,

  validateStatement,

  validatePerformanceStatement,

  validateOptionSet,

  getRepairDecision,

  buildValidationDisplay,

  debugStatement,
};
