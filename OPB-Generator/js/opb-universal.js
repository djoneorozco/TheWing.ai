/**
 * PCSUnited / TheWing.ai
 * OPB / EPB Universal Performance Statement Engine
 *
 * File:
 *   js/opb-universal.js
 *
 * Version:
 *   2.0.0
 *
 * Purpose:
 *   Orchestrates deterministic Air Force Performance Statement intelligence.
 *
 * Architecture:
 *
 *   RAW ACCOMPLISHMENT
 *          ↓
 *   rank-tier.js
 *          ↓
 *   impact-engine.js
 *          ↓
 *   EVIDENCE WHITELIST
 *          ↓
 *   GENERATION STRATEGY
 *          ↓
 *   LLM / AMY
 *          ↓
 *   opb-validator.js
 *          ↓
 *   INTELLIGENT REPAIR / COMPRESSION
 *          ↓
 *   FINAL VALIDATED OPTIONS
 *
 * Core philosophy:
 *
 *   TheWing validates.
 *   Amy coaches.
 *
 *   Explore impact aggressively.
 *   Assert impact conservatively.
 *
 * IMPORTANT:
 *
 *   This module does NOT contain:
 *   - OpenAI API keys
 *   - direct OpenAI SDK dependencies
 *   - browser storage
 *   - Supabase logic
 *
 *   The LLM is provided through a generateText adapter.
 */


/* ================================================================
   IMPORTS
   ================================================================ */

import * as RankTier from "../data/rank-tier.js";
import * as ImpactEngine from "../data/impact-engine.js";
import * as Validator from "./opb-validator.js";


/* ================================================================
   VERSION
   ================================================================ */

export const OPB_UNIVERSAL_VERSION = "2.0.0";


/* ================================================================
   CONSTANTS
   ================================================================ */

export const DEFAULT_CHARACTER_LIMIT = 350;

export const GENERATION_STATUS = Object.freeze({
  READY: "READY",
  COACH_FIRST: "COACH_FIRST",
  GENERATED: "GENERATED",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
});


export const VARIATION = Object.freeze({
  STRICT: "strict",
  BALANCED: "balanced",
  COMPETITIVE: "competitive",
});


export const SECTION = Object.freeze({
  DUTY_DESCRIPTION: "duty-description",
  EXECUTING_MISSION: "executing-the-mission",
  LEADING_PEOPLE: "leading-people",
  MANAGING_RESOURCES: "managing-resources",
  IMPROVING_UNIT: "improving-the-unit",
});


export const CHARACTER_STATUS = Object.freeze({
  NORMAL: "normal",
  APPROACHING: "approaching-capacity",
  NEAR_MAXIMUM: "near-maximum",
  NEEDS_REVISION: "needs-revision",
});


/* ================================================================
   SECTION ALIASES
   ================================================================ */

const SECTION_ALIASES = Object.freeze({
  "duty description": SECTION.DUTY_DESCRIPTION,
  duty: SECTION.DUTY_DESCRIPTION,
  "duty-description": SECTION.DUTY_DESCRIPTION,

  "executing the mission": SECTION.EXECUTING_MISSION,
  executing: SECTION.EXECUTING_MISSION,
  mission: SECTION.EXECUTING_MISSION,
  "executing-the-mission": SECTION.EXECUTING_MISSION,

  "leading people": SECTION.LEADING_PEOPLE,
  leadership: SECTION.LEADING_PEOPLE,
  people: SECTION.LEADING_PEOPLE,
  "leading-people": SECTION.LEADING_PEOPLE,

  "managing resources": SECTION.MANAGING_RESOURCES,
  resources: SECTION.MANAGING_RESOURCES,
  "managing-resources": SECTION.MANAGING_RESOURCES,

  "improving the unit": SECTION.IMPROVING_UNIT,
  improvement: SECTION.IMPROVING_UNIT,
  innovation: SECTION.IMPROVING_UNIT,
  "improving-the-unit": SECTION.IMPROVING_UNIT,
});


/* ================================================================
   SECTION INTENT
   ================================================================ */

export const SECTION_INTENT = Object.freeze({
  [SECTION.DUTY_DESCRIPTION]: {
    label: "Duty Description",

    priorities: [
      "primary duties",
      "scope of responsibility",
      "mission responsibility",
      "personnel responsibility",
      "equipment responsibility",
      "resources",
      "organizational responsibility",
    ],

    avoidOveremphasis: [
      "unsupported downstream impact",
      "award-style language",
    ],
  },


  [SECTION.EXECUTING_MISSION]: {
    label: "Executing the Mission",

    priorities: [
      "mission execution",
      "technical proficiency",
      "initiative",
      "operational result",
      "readiness",
      "mission accomplishment",
      "quality",
      "availability",
    ],
  },


  [SECTION.LEADING_PEOPLE]: {
    label: "Leading People",

    priorities: [
      "leadership",
      "training",
      "development",
      "mentorship",
      "team performance",
      "accountability",
      "communication",
      "influence",
      "qualification",
    ],
  },


  [SECTION.MANAGING_RESOURCES]: {
    label: "Managing Resources",

    priorities: [
      "funds",
      "equipment",
      "manpower",
      "time",
      "facilities",
      "materiel",
      "stewardship",
      "efficiency",
      "cost avoidance",
    ],
  },


  [SECTION.IMPROVING_UNIT]: {
    label: "Improving the Unit",

    priorities: [
      "innovation",
      "process improvement",
      "problem solving",
      "decision making",
      "lasting change",
      "adoption",
      "efficiency",
      "organizational improvement",
    ],
  },
});


/* ================================================================
   OPTION STRATEGIES
   ================================================================ */

export const OPTION_STRATEGIES = Object.freeze({
  [SECTION.DUTY_DESCRIPTION]: [
    {
      id: "scope-responsibility",
      label: "Scope / Responsibility",
      focus:
        "Emphasize the member's verified duties, responsibility, people, assets, equipment, mission, or organizational scope.",
    },

    {
      id: "mission-context",
      label: "Mission Context",
      focus:
        "Emphasize what responsibility the member held and how it supported the organization's mission.",
    },

    {
      id: "technical-responsibility",
      label: "Technical / Organizational",
      focus:
        "Emphasize the strongest verified technical or organizational responsibility without overstating authority.",
    },
  ],


  [SECTION.EXECUTING_MISSION]: [
    {
      id: "direct-mission",
      label: "Direct / Mission",
      focus:
        "Lead with the strongest verified mission action and connect it directly to the verified operational result.",
    },

    {
      id: "impact-result",
      label: "Impact / Result",
      focus:
        "Emphasize the strongest measurable verified result or downstream mission effect.",
    },

    {
      id: "initiative-scope",
      label: "Initiative / Scope",
      focus:
        "Emphasize initiative, expertise, selection, responsibility, or scope when those facts are verified.",
    },
  ],


  [SECTION.LEADING_PEOPLE]: [
    {
      id: "development",
      label: "Development",
      focus:
        "Emphasize how the member trained, mentored, qualified, or developed others.",
    },

    {
      id: "team-result",
      label: "Team Result",
      focus:
        "Emphasize the measurable effect the member's leadership had on team capability or performance.",
    },

    {
      id: "leadership-scope",
      label: "Leadership / Scope",
      focus:
        "Emphasize verified leadership responsibility, selection, authority, or above-tier performance.",
    },
  ],


  [SECTION.MANAGING_RESOURCES]: [
    {
      id: "stewardship",
      label: "Stewardship",
      focus:
        "Emphasize responsible use, protection, recovery, or management of verified resources.",
    },

    {
      id: "efficiency",
      label: "Efficiency",
      focus:
        "Emphasize verified cost, time, manpower, equipment, or process efficiency.",
    },

    {
      id: "resource-mission",
      label: "Resource / Mission",
      focus:
        "Connect resource stewardship to the strongest verified mission consequence.",
    },
  ],


  [SECTION.IMPROVING_UNIT]: [
    {
      id: "problem-solution",
      label: "Problem / Solution",
      focus:
        "Emphasize the problem identified, the member's solution, and the verified result.",
    },

    {
      id: "measurable-improvement",
      label: "Measurable Improvement",
      focus:
        "Emphasize measurable improvement produced by the member's action.",
    },

    {
      id: "adoption-lasting-change",
      label: "Adoption / Lasting Change",
      focus:
        "Emphasize verified adoption, standardization, broader use, or lasting organizational change.",
    },
  ],
});


/* ================================================================
   VARIATION DOCTRINE
   ================================================================ */

export const VARIATION_RULES = Object.freeze({
  [VARIATION.STRICT]: {
    label: "Strict",

    instruction: `
Stay very close to the source facts.

Use:
- confirmed user facts
- directly supported facts
- safe deterministic mathematical derivations

Do NOT:
- infer downstream mission impact
- strengthen organizational scope without evidence
- convert hypotheses into fact
- add implied readiness, safety, deployment, sortie, or organizational effects
- use inflated language

Favor precision over intensity.
`.trim(),
  },


  [VARIATION.BALANCED]: {
    label: "Balanced",

    instruction: `
Improve structure, clarity, Air Force tone, causality, and impact while remaining fully supported by evidence.

Use:
- confirmed facts
- safe deterministic derivations
- verified causal relationships
- verified downstream impact

Do NOT:
- invent facts
- exaggerate scope
- create unsupported organizational effects
- convert hypotheses into fact

Favor a clean Action → Scope → Result → Impact structure.
`.trim(),
  },


  [VARIATION.COMPETITIVE]: {
    label: "Competitive",

    instruction: `
Use the strongest defensible framing supported by the evidence.

Prioritize:
- verified selection
- verified expertise
- verified above-rank responsibility
- strongest verified measurable result
- strongest verified downstream impact
- strongest verified organizational scope

Competitive does NOT mean exaggerated.

Do NOT:
- invent impact
- invent metrics
- inflate authority
- create awards
- create readiness effects
- create safety claims
- create deployment effects
- create strategic effects without evidence

Make the member's verified contribution as clear and consequential as the evidence allows.
`.trim(),
  },
});


/* ================================================================
   GENERAL WRITING DOCTRINE
   ================================================================ */

export const WRITING_DOCTRINE = Object.freeze([
  "Use modern Air Force narrative Performance Statement conventions.",
  "Do not use legacy dash-bullet formatting.",
  "Write a complete standalone statement.",
  "Prefer Action → Scope → Result → Impact.",
  "Use measurable results when supported.",
  "Facts control the statement.",
  "Do not fabricate metrics.",
  "Do not fabricate personnel counts.",
  "Do not fabricate percentages.",
  "Do not fabricate dollar amounts.",
  "Do not fabricate mission results.",
  "Do not fabricate readiness effects.",
  "Do not fabricate safety effects.",
  "Do not fabricate sortie effects.",
  "Do not fabricate deployment effects.",
  "Do not fabricate organizational scope.",
  "Do not fabricate awards.",
  "Do not invent duty titles.",
  "Do not inflate responsibility based on rank.",
  "Do not weaken verified impact because the member is junior.",
  "Use verified above-tier responsibility when it meaningfully strengthens the statement.",
  "Avoid empty adjectives and generic praise.",
  "Avoid unnecessary filler.",
  "Use strong verbs only when they accurately describe the member's role.",
]);


/* ================================================================
   BASIC HELPERS
   ================================================================ */

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase();
}


function unique(values = []) {
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


function compactObject(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null
    )
  );
}


function safeArray(value) {
  if (Array.isArray(value)) return value;

  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  return [value];
}


function randomId(prefix = "stmt") {
  const random =
    Math.random()
      .toString(36)
      .slice(2, 10);

  const time =
    Date.now()
      .toString(36);

  return `${prefix}_${time}_${random}`;
}


/* ================================================================
   SECTION NORMALIZATION
   ================================================================ */

export function normalizeSection(sectionInput) {
  if (!sectionInput) {
    return SECTION.EXECUTING_MISSION;
  }

  const normalized =
    normalizeKey(sectionInput);

  return (
    SECTION_ALIASES[normalized] ||
    SECTION.EXECUTING_MISSION
  );
}


/* ================================================================
   VARIATION NORMALIZATION
   ================================================================ */

export function normalizeVariation(
  variationInput
) {
  const normalized =
    normalizeKey(variationInput);

  if (normalized === VARIATION.STRICT) {
    return VARIATION.STRICT;
  }

  if (
    normalized === VARIATION.COMPETITIVE
  ) {
    return VARIATION.COMPETITIVE;
  }

  return VARIATION.BALANCED;
}


/* ================================================================
   CHARACTER COUNTING
   ================================================================ */

/**
 * Counts Unicode code points rather than UTF-16 code units.
 *
 * For normal Air Force narrative text this behaves as expected.
 */
export function countCharacters(text = "") {
  return Array.from(
    String(text ?? "")
  ).length;
}


export function getCharacterStatus(
  count,
  limit = DEFAULT_CHARACTER_LIMIT
) {
  if (count > limit) {
    return CHARACTER_STATUS.NEEDS_REVISION;
  }

  if (count >= 336) {
    return CHARACTER_STATUS.NEAR_MAXIMUM;
  }

  if (count >= 301) {
    return CHARACTER_STATUS.APPROACHING;
  }

  return CHARACTER_STATUS.NORMAL;
}


/* ================================================================
   MODEL ADAPTER HELPERS
   ================================================================ */

function getModelText(result) {
  if (typeof result === "string") {
    return result;
  }

  if (!result) {
    return "";
  }

  if (typeof result.text === "string") {
    return result.text;
  }

  if (
    typeof result.output_text === "string"
  ) {
    return result.output_text;
  }

  if (
    typeof result.content === "string"
  ) {
    return result.content;
  }

  if (
    Array.isArray(result.content)
  ) {
    return result.content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.text ||
          item?.content ||
          ""
        );
      })
      .join("");
  }

  return "";
}


/**
 * Removes common LLM wrapping.
 *
 * We want only the statement.
 */
export function cleanGeneratedStatement(
  value
) {
  let text =
    normalizeWhitespace(value);

  text = text
    .replace(/^["“]+/, "")
    .replace(/["”]+$/, "")
    .trim();

  text = text.replace(
    /^(option\s*\d+\s*[:\-]\s*)/i,
    ""
  );

  text = text.replace(
    /^(statement\s*[:\-]\s*)/i,
    ""
  );

  text = text.replace(
    /^[-–—•]\s*/,
    ""
  );

  return normalizeWhitespace(text);
}


/* ================================================================
   OPTIONAL MODULE FUNCTIONS
   ================================================================ */

/**
 * Using namespace imports lets this module remain somewhat resilient
 * while the deterministic modules continue evolving.
 */

function getRankFunction(name) {
  return (
    RankTier?.[name] ||
    RankTier?.default?.[name] ||
    null
  );
}


function getImpactFunction(name) {
  return (
    ImpactEngine?.[name] ||
    ImpactEngine?.default?.[name] ||
    null
  );
}


function getValidatorFunction(name) {
  return (
    Validator?.[name] ||
    Validator?.default?.[name] ||
    null
  );
}


/* ================================================================
   FACT FLATTENING
   ================================================================ */

function flattenFacts(
  object,
  prefix = "",
  output = []
) {
  if (
    object === null ||
    object === undefined
  ) {
    return output;
  }

  if (Array.isArray(object)) {
    object.forEach(
      (value, index) => {
        flattenFacts(
          value,
          `${prefix}[${index}]`,
          output
        );
      }
    );

    return output;
  }

  if (
    typeof object === "object"
  ) {
    Object.entries(object).forEach(
      ([key, value]) => {
        const path = prefix
          ? `${prefix}.${key}`
          : key;

        flattenFacts(
          value,
          path,
          output
        );
      }
    );

    return output;
  }

  output.push({
    path: prefix,
    value: object,
  });

  return output;
}


/* ================================================================
   METRIC EXTRACTION
   ================================================================ */

export function extractMetricsFromText(
  text = ""
) {
  const source = String(text);

  const metrics = [];

  /*
   * Dollar values
   */
  const dollarRegex =
    /(?:>\s*)?\$\s?\d[\d,.]*(?:\s?(?:k|m|b|thousand|million|billion))?/gi;

  for (
    const match of source.matchAll(dollarRegex)
  ) {
    metrics.push({
      type: "currency",
      raw: match[0],
      normalized:
        normalizeWhitespace(match[0])
          .toLowerCase(),
    });
  }


  /*
   * Percentages
   */
  const percentRegex =
    /(?:>\s*)?\d+(?:\.\d+)?\s?%/g;

  for (
    const match of source.matchAll(percentRegex)
  ) {
    metrics.push({
      type: "percentage",
      raw: match[0],
      normalized:
        normalizeWhitespace(match[0])
          .toLowerCase(),
    });
  }


  /*
   * General numbers
   *
   * Currency and percentage numbers are also returned here.
   * This is useful for broad numeric auditing.
   */
  const numberRegex =
    /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;

  for (
    const match of source.matchAll(numberRegex)
  ) {
    metrics.push({
      type: "number",
      raw: match[0],
      normalized:
        match[0]
          .replace(/,/g, ""),
    });
  }

  return metrics;
}


/* ================================================================
   IMPACT RESULT NORMALIZATION
   ================================================================ */

function normalizeImpactAnalysis(
  impactAnalysis = {}
) {
  return {
    confirmedFacts:
      safeArray(
        impactAnalysis.confirmedFacts
      ),

    derivedFacts:
      safeArray(
        impactAnalysis.derivedFacts
      ),

    derivedMetrics:
      safeArray(
        impactAnalysis.derivedMetrics
      ),

    writingSafeImpacts:
      safeArray(
        impactAnalysis.writingSafeImpacts
      ),

    hypotheses:
      safeArray(
        impactAnalysis.hypotheses
      ),

    unsupported:
      safeArray(
        impactAnalysis.unsupported
      ),

    rejected:
      safeArray(
        impactAnalysis.rejected
      ),

    accomplishmentThreads:
      safeArray(
        impactAnalysis.accomplishmentThreads
      ),

    causalChains:
      safeArray(
        impactAnalysis.causalChains
      ),

    coachingQuestions:
      safeArray(
        impactAnalysis.coachingQuestions
      ),

    recommendSplit:
      Boolean(
        impactAnalysis.recommendSplit
      ),

    recommendCoachFirst:
      Boolean(
        impactAnalysis.recommendCoachFirst
      ),

    raw: impactAnalysis,
  };
}


/* ================================================================
   EVIDENCE WHITELIST
   ================================================================ */

/**
 * The evidence whitelist is one of the most important objects in
 * the system.
 *
 * Amy may write from:
 *
 *   source facts
 *   confirmed facts
 *   safe derived facts
 *   writing-safe impacts
 *
 * Amy may NOT write from:
 *
 *   hypotheses
 *   unsupported claims
 *   rejected claims
 */
export function buildEvidenceWhitelist({
  accomplishment = "",
  facts = {},
  impactAnalysis = {},
} = {}) {

  const normalizedImpact =
    normalizeImpactAnalysis(
      impactAnalysis
    );

  const explicitFacts =
    flattenFacts(facts);

  const sourceMetrics =
    extractMetricsFromText(
      accomplishment
    );

  return {
    sourceAccomplishment:
      normalizeWhitespace(
        accomplishment
      ),

    explicitFacts,

    confirmedFacts:
      normalizedImpact.confirmedFacts,

    derivedFacts:
      normalizedImpact.derivedFacts,

    derivedMetrics:
      normalizedImpact.derivedMetrics,

    writingSafeImpacts:
      normalizedImpact.writingSafeImpacts,

    sourceMetrics,

    hypotheses:
      normalizedImpact.hypotheses,

    unsupported:
      normalizedImpact.unsupported,

    rejected:
      normalizedImpact.rejected,
  };
}


/* ================================================================
   RANK ANALYSIS
   ================================================================ */

function runRankAnalysis({
  accomplishment,
  ratedRank,
  context = {},
}) {

  const validateRankTier =
    getRankFunction(
      "validateRankTier"
    );

  if (!validateRankTier) {
    return {
      available: false,
      status: "UNKNOWN",
      findings: [],
      questions: [],
    };
  }

  try {
    return validateRankTier({
      text: accomplishment,
      ratedRank,
      context,
    });
  } catch (error) {
    return {
      available: false,
      status: "ERROR",
      findings: [],
      questions: [],
      error: error?.message,
    };
  }
}


/* ================================================================
   IMPACT ANALYSIS
   ================================================================ */

function runImpactAnalysis({
  accomplishment,
  section,
  ratedRank,
  variation,
  facts = {},
  context = {},
}) {

  const analyzeImpact =
    getImpactFunction(
      "analyzeImpact"
    );

  if (!analyzeImpact) {
    return normalizeImpactAnalysis({
      confirmedFacts: [],
      derivedFacts: [],
      derivedMetrics: [],
      writingSafeImpacts: [],
      hypotheses: [],
      unsupported: [],
      rejected: [],
      accomplishmentThreads: [],
      coachingQuestions: [],
      recommendSplit: false,
    });
  }

  try {
    const result =
      analyzeImpact({
        accomplishment,
        section,
        ratedRank,
        variation,
        facts,
        context,
      });

    return normalizeImpactAnalysis(
      result
    );
  } catch (error) {
    return normalizeImpactAnalysis({
      confirmedFacts: [],
      derivedFacts: [],
      derivedMetrics: [],
      writingSafeImpacts: [],
      hypotheses: [],
      unsupported: [],
      rejected: [],
      accomplishmentThreads: [],
      coachingQuestions: [],
      recommendSplit: false,
      error: error?.message,
    });
  }
}


/* ================================================================
   RANK GENERATION DECISION
   ================================================================ */

function getRankDecision(
  rankAnalysis
) {
  const fn =
    getRankFunction(
      "getRankGenerationDecision"
    );

  if (!fn) {
    return {
      action: "GENERATE",
      reason: null,
    };
  }

  try {
    return fn(rankAnalysis);
  } catch {
    return {
      action: "GENERATE",
      reason: null,
    };
  }
}


/* ================================================================
   RANK PROMPT CONTEXT
   ================================================================ */

function getRankPromptContext({
  ratedRank,
  rankAnalysis,
}) {

  const fn =
    getRankFunction(
      "buildRankPromptContext"
    );

  if (!fn) {
    return {
      ratedRank,
      available: false,
    };
  }

  try {
    return fn(
      ratedRank,
      rankAnalysis
    );
  } catch {
    return {
      ratedRank,
      available: false,
    };
  }
}


/* ================================================================
   PREVIEW / COACHING
   ================================================================ */

/**
 * Deterministic accomplishment preview.
 *
 * This does not call the LLM.
 */
export function previewAccomplishment({
  accomplishment = "",
  section = SECTION.EXECUTING_MISSION,
  ratedRank = "",
  variation = VARIATION.BALANCED,
  characterLimit =
    DEFAULT_CHARACTER_LIMIT,
  facts = {},
  context = {},
} = {}) {

  const cleanAccomplishment =
    normalizeWhitespace(
      accomplishment
    );

  const normalizedSection =
    normalizeSection(section);

  const normalizedVariation =
    normalizeVariation(variation);

  if (!cleanAccomplishment) {
    return {
      status:
        GENERATION_STATUS.FAILED,

      ready: false,

      reason:
        "An accomplishment is required.",

      coachingQuestions: [],
    };
  }


  const rankAnalysis =
    runRankAnalysis({
      accomplishment:
        cleanAccomplishment,

      ratedRank,
      context,
    });


  const impactAnalysis =
    runImpactAnalysis({
      accomplishment:
        cleanAccomplishment,

      section:
        normalizedSection,

      ratedRank,

      variation:
        normalizedVariation,

      facts,
      context,
    });


  const evidence =
    buildEvidenceWhitelist({
      accomplishment:
        cleanAccomplishment,

      facts,

      impactAnalysis,
    });


  const rankDecision =
    getRankDecision(
      rankAnalysis
    );


  const rankQuestions =
    safeArray(
      rankAnalysis?.questions
    );


  const impactQuestions =
    safeArray(
      impactAnalysis?.coachingQuestions
    );


  const coachingQuestions =
    unique([
      ...rankQuestions,
      ...impactQuestions,
    ]);


  const hasRestrictedRankClaim =
    rankDecision?.action ===
    "BLOCK_CLAIM";


  const shouldCoach =
    hasRestrictedRankClaim ||
    rankDecision?.action ===
      "COACH_FIRST" ||
    impactAnalysis
      .recommendCoachFirst;


  return {
    status: shouldCoach
      ? GENERATION_STATUS.COACH_FIRST
      : GENERATION_STATUS.READY,

    ready:
      !hasRestrictedRankClaim,

    accomplishment:
      cleanAccomplishment,

    section:
      normalizedSection,

    sectionLabel:
      SECTION_INTENT[
        normalizedSection
      ]?.label,

    ratedRank,

    variation:
      normalizedVariation,

    characterLimit,

    rankAnalysis,

    rankDecision,

    impactAnalysis,

    evidence,

    recommendSplit:
      impactAnalysis.recommendSplit,

    accomplishmentThreads:
      impactAnalysis
        .accomplishmentThreads,

    coachingQuestions,

    reason:
      rankDecision?.reason ||
      null,
  };
}


/* ================================================================
   PROMPT SERIALIZATION
   ================================================================ */

function stringifyForPrompt(
  value
) {
  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}


/* ================================================================
   PROMPT CONTEXT
   ================================================================ */

export function buildUniversalPromptContext({
  accomplishment,
  section,
  ratedRank,
  variation,
  characterLimit,
  evidence,
  rankAnalysis,
  impactAnalysis,
} = {}) {

  const normalizedSection =
    normalizeSection(section);

  const normalizedVariation =
    normalizeVariation(variation);

  return {
    accomplishment,

    section:
      normalizedSection,

    sectionIntent:
      SECTION_INTENT[
        normalizedSection
      ],

    ratedRank,

    variation:
      normalizedVariation,

    variationRules:
      VARIATION_RULES[
        normalizedVariation
      ],

    characterLimit,

    evidence,

    rank:
      getRankPromptContext({
        ratedRank,
        rankAnalysis,
      }),

    impact: {
      writingSafeImpacts:
        impactAnalysis
          ?.writingSafeImpacts ||
        [],

      causalChains:
        impactAnalysis
          ?.causalChains ||
        [],

      recommendSplit:
        Boolean(
          impactAnalysis
            ?.recommendSplit
        ),
    },
  };
}


/* ================================================================
   GENERATION PROMPT
   ================================================================ */

export function buildGenerationPrompt({
  context,
  strategy,
  previousOpeners = [],
} = {}) {

  const {
    accomplishment,
    sectionIntent,
    ratedRank,
    variationRules,
    characterLimit,
    evidence,
    rank,
    impact,
  } = context;


  return `
You are Amy, the Air Force Performance Statement writing coach inside PCSUnited / TheWing.ai.

Your job is to write ONE modern Air Force narrative Performance Statement.

TheWing has already performed deterministic rank, evidence, and impact analysis.

============================================================
SOURCE ACCOMPLISHMENT
============================================================

${accomplishment}

============================================================
RATED RANK
============================================================

${ratedRank || "Not provided"}

============================================================
FORM SECTION / MPA
============================================================

${sectionIntent?.label || "Executing the Mission"}

Prioritize:

${(sectionIntent?.priorities || [])
  .map((item) => `- ${item}`)
  .join("\n")}

============================================================
WRITING VARIATION
============================================================

${variationRules?.label || "Balanced"}

${variationRules?.instruction || ""}

============================================================
OPTION STRATEGY
============================================================

${strategy?.label || "Direct / Mission"}

${strategy?.focus || ""}

This option must be meaningfully different from the other generated options.

Do not merely produce a thesaurus paraphrase.

============================================================
CORE WRITING MODEL
============================================================

ACTION → SCOPE → RESULT → IMPACT

Use only the parts supported by evidence.

The statement should answer, when supported:

1. What did the member do?
2. What was the scope?
3. What changed or resulted?
4. Why did it matter?

============================================================
WRITING DOCTRINE
============================================================

${WRITING_DOCTRINE
  .map((item) => `- ${item}`)
  .join("\n")}

============================================================
EVIDENCE YOU MAY ASSERT
============================================================

SOURCE ACCOMPLISHMENT:

${evidence?.sourceAccomplishment || ""}

EXPLICIT FACTS:

${stringifyForPrompt(
  evidence?.explicitFacts || []
)}

CONFIRMED FACTS:

${stringifyForPrompt(
  evidence?.confirmedFacts || []
)}

SAFE DERIVED FACTS:

${stringifyForPrompt(
  evidence?.derivedFacts || []
)}

SAFE DERIVED METRICS:

${stringifyForPrompt(
  evidence?.derivedMetrics || []
)}

VERIFIED / WRITING-SAFE IMPACTS:

${stringifyForPrompt(
  evidence?.writingSafeImpacts || []
)}

============================================================
DO NOT ASSERT THESE AS FACT
============================================================

HYPOTHESES:

${stringifyForPrompt(
  evidence?.hypotheses || []
)}

UNSUPPORTED:

${stringifyForPrompt(
  evidence?.unsupported || []
)}

REJECTED:

${stringifyForPrompt(
  evidence?.rejected || []
)}

Hypotheses may suggest useful coaching questions, but they are NOT authorized statement facts.

============================================================
RANK CONTEXT
============================================================

${stringifyForPrompt(rank)}

Rank is context.

Facts remain controlling.

Do not make a junior Airman sound like a commander.

Do not weaken legitimate verified high-level impact because the member is junior.

If above-tier responsibility has been verified, it may be emphasized.

============================================================
CAUSAL IMPACT CONTEXT
============================================================

${stringifyForPrompt(
  impact?.causalChains || []
)}

Do not skip unsupported causal bridges.

============================================================
OPENING VERB VARIETY
============================================================

Avoid using these opening words if a natural alternative exists:

${previousOpeners.length
  ? previousOpeners.join(", ")
  : "None"}

Do not sacrifice accuracy merely to change the verb.

============================================================
CHARACTER LIMIT
============================================================

HARD MAXIMUM:

${characterLimit} characters INCLUDING spaces.

Do not truncate.

Do not use ellipses.

Do not knowingly exceed the limit.

============================================================
OUTPUT FORMAT
============================================================

Return ONLY the final Performance Statement.

No label.
No explanation.
No bullet symbol.
No quotation marks.
No character count.
`.trim();
}


/* ================================================================
   COMPRESSION PROMPT
   ================================================================ */

export function buildCompressionPrompt({
  statement,
  characterLimit,
  evidence,
  strategy,
} = {}) {

  return `
You are compressing an Air Force narrative Performance Statement.

The existing statement is too long.

CURRENT STATEMENT:

${statement}

HARD MAXIMUM:

${characterLimit} characters including spaces.

============================================================
COMPRESSION PRIORITY
============================================================

PRESERVE:

1. The member's verified action.
2. The strongest verified scope.
3. The strongest verified result.
4. The strongest verified impact.
5. All numeric meaning.
6. All factual meaning.
7. Causal relationships.

REMOVE OR SHORTEN:

- filler
- redundancy
- weak transitions
- duplicated concepts
- unnecessary adjectives
- unnecessary wording

DO NOT:

- blindly truncate
- add a new fact
- change a number
- change a percentage
- change a dollar amount
- change personnel count
- convert a hypothesis into fact
- strengthen organizational scope
- strengthen safety claims
- strengthen readiness claims
- strengthen mission claims

OPTION STRATEGY:

${strategy?.label || ""}

${strategy?.focus || ""}

AUTHORIZED EVIDENCE:

${stringifyForPrompt({
  explicitFacts:
    evidence?.explicitFacts || [],

  confirmedFacts:
    evidence?.confirmedFacts || [],

  derivedFacts:
    evidence?.derivedFacts || [],

  derivedMetrics:
    evidence?.derivedMetrics || [],

  writingSafeImpacts:
    evidence?.writingSafeImpacts || [],
})}

Return ONLY the rewritten Performance Statement.
`.trim();
}


/* ================================================================
   REPAIR PROMPT
   ================================================================ */

export function buildRepairPrompt({
  statement,
  errors = [],
  warnings = [],
  evidence,
  characterLimit,
  strategy,
} = {}) {

  return `
You are repairing an Air Force narrative Performance Statement after deterministic validation.

CURRENT STATEMENT:

${statement}

============================================================
DETERMINISTIC ERRORS
============================================================

${errors.length
  ? errors
      .map(
        (item) =>
          `- ${typeof item === "string"
            ? item
            : item.message ||
              stringifyForPrompt(item)}`
      )
      .join("\n")
  : "- None"}

============================================================
DETERMINISTIC WARNINGS
============================================================

${warnings.length
  ? warnings
      .map(
        (item) =>
          `- ${typeof item === "string"
            ? item
            : item.message ||
              stringifyForPrompt(item)}`
      )
      .join("\n")
  : "- None"}

============================================================
AUTHORIZED EVIDENCE
============================================================

${stringifyForPrompt({
  explicitFacts:
    evidence?.explicitFacts || [],

  confirmedFacts:
    evidence?.confirmedFacts || [],

  derivedFacts:
    evidence?.derivedFacts || [],

  derivedMetrics:
    evidence?.derivedMetrics || [],

  writingSafeImpacts:
    evidence?.writingSafeImpacts || [],
})}

============================================================
PROHIBITED EVIDENCE
============================================================

${stringifyForPrompt({
  hypotheses:
    evidence?.hypotheses || [],

  unsupported:
    evidence?.unsupported || [],

  rejected:
    evidence?.rejected || [],
})}

============================================================
REPAIR RULES
============================================================

- Correct every deterministic error.
- Preserve factual meaning.
- Do not invent facts.
- Do not add unsupported impact.
- Preserve supported metrics.
- Stay at or below ${characterLimit} characters including spaces.
- Do not truncate.
- Preserve the option's intended emphasis.

OPTION:

${strategy?.label || ""}

${strategy?.focus || ""}

Return ONLY the corrected Performance Statement.
`.trim();
}


/* ================================================================
   OPENING VERB
   ================================================================ */

export function getOpeningWord(
  statement = ""
) {
  const clean =
    cleanGeneratedStatement(
      statement
    );

  const match =
    clean.match(
      /^[A-Za-z][A-Za-z'-]*/
    );

  return match
    ? match[0].toLowerCase()
    : "";
}


/* ================================================================
   FALLBACK VALIDATION
   ================================================================ */

function fallbackValidateStatement({
  statement,
  characterLimit,
} = {}) {

  const clean =
    cleanGeneratedStatement(
      statement
    );

  const characterCount =
    countCharacters(clean);

  const errors = [];
  const warnings = [];


  if (!clean) {
    errors.push({
      code: "EMPTY_STATEMENT",
      message:
        "Statement is empty.",
    });
  }


  if (
    characterCount >
    characterLimit
  ) {
    errors.push({
      code: "CHARACTER_LIMIT",
      message:
        `Statement is ${characterCount} characters; maximum is ${characterLimit}.`,
    });
  }


  if (
    /^[-–—•]/.test(clean)
  ) {
    errors.push({
      code: "LEGACY_BULLET_FORMAT",
      message:
        "Legacy dash/bullet formatting is not allowed.",
    });
  }


  return {
    valid:
      errors.length === 0,

    statement: clean,

    characterCount,

    characterLimit,

    characterStatus:
      getCharacterStatus(
        characterCount,
        characterLimit
      ),

    errors,
    warnings,
  };
}


/* ================================================================
   FINAL VALIDATION
   ================================================================ */

export function validateGeneratedStatement({
  statement,
  accomplishment,
  section,
  ratedRank,
  variation,
  characterLimit,
  evidence,
  rankAnalysis,
  impactAnalysis,
} = {}) {

  const validateStatement =
    getValidatorFunction(
      "validateStatement"
    ) ||
    getValidatorFunction(
      "validatePerformanceStatement"
    );


  let baseValidation;

  if (validateStatement) {
    try {
      baseValidation =
        validateStatement({
          statement,
          accomplishment,
          section,
          ratedRank,
          variation,
          characterLimit,
          evidence,
          rankAnalysis,
          impactAnalysis,
        });
    } catch {
      baseValidation =
        fallbackValidateStatement({
          statement,
          characterLimit,
        });
    }
  } else {
    baseValidation =
      fallbackValidateStatement({
        statement,
        characterLimit,
      });
  }


  /*
   * Impact-specific audit
   */
  const auditImpact =
    getImpactFunction(
      "auditStatementImpact"
    );


  let impactAudit = null;

  if (auditImpact) {
    try {
      impactAudit =
        auditImpact({
          statement:
            cleanGeneratedStatement(
              statement
            ),

          accomplishment,

          section,

          ratedRank,

          evidence,

          analysis:
            impactAnalysis,
        });
    } catch {
      impactAudit = null;
    }
  }


  /*
   * Rank-specific post-generation audit
   */
  const validateRankTier =
    getRankFunction(
      "validateRankTier"
    );


  let rankAudit = null;

  if (validateRankTier) {
    try {
      rankAudit =
        validateRankTier({
          text:
            cleanGeneratedStatement(
              statement
            ),

          ratedRank,

          context: {
            generatedStatement: true,
          },
        });
    } catch {
      rankAudit = null;
    }
  }


  const impactErrors =
    safeArray(
      impactAudit?.errors
    );


  const rankErrors =
    safeArray(
      rankAudit?.restricted
    ).map((item) => ({
      code:
        "RANK_RESTRICTED_CLAIM",

      message:
        item?.reason ||
        item?.message ||
        "Generated statement contains a restricted rank/responsibility claim.",

      detail: item,
    }));


  const allErrors = [
    ...safeArray(
      baseValidation?.errors
    ),

    ...impactErrors,

    ...rankErrors,
  ];


  const allWarnings = [
    ...safeArray(
      baseValidation?.warnings
    ),

    ...safeArray(
      impactAudit?.warnings
    ),
  ];


  const clean =
    cleanGeneratedStatement(
      statement
    );


  const characterCount =
    countCharacters(clean);


  return {
    ...baseValidation,

    statement: clean,

    characterCount,

    characterLimit,

    characterStatus:
      getCharacterStatus(
        characterCount,
        characterLimit
      ),

    valid:
      allErrors.length === 0 &&
      characterCount <=
        characterLimit,

    errors: allErrors,

    warnings: allWarnings,

    impactAudit,

    rankAudit,
  };
}


/* ================================================================
   MODEL CALL
   ================================================================ */

async function callModel({
  generateText,
  prompt,
  mode,
  metadata = {},
}) {

  if (
    typeof generateText !==
    "function"
  ) {
    throw new Error(
      "generatePerformanceStatements requires a generateText adapter."
    );
  }

  const result =
    await generateText({
      prompt,
      mode,
      metadata,
    });

  return cleanGeneratedStatement(
    getModelText(result)
  );
}


/* ================================================================
   COMPRESSION
   ================================================================ */

async function compressStatement({
  statement,
  characterLimit,
  evidence,
  strategy,
  generateText,
  metadata,
}) {

  const prompt =
    buildCompressionPrompt({
      statement,
      characterLimit,
      evidence,
      strategy,
    });


  const compressed =
    await callModel({
      generateText,
      prompt,
      mode: "compress",
      metadata,
    });


  return compressed;
}


/* ================================================================
   REPAIR
   ================================================================ */

async function repairStatement({
  statement,
  validation,
  characterLimit,
  evidence,
  strategy,
  generateText,
  metadata,
}) {

  const prompt =
    buildRepairPrompt({
      statement,

      errors:
        validation?.errors ||
        [],

      warnings:
        validation?.warnings ||
        [],

      evidence,

      characterLimit,

      strategy,
    });


  return callModel({
    generateText,
    prompt,
    mode: "repair",
    metadata,
  });
}


/* ================================================================
   ONE OPTION GENERATOR
   ================================================================ */

async function generateOneOption({
  optionIndex,
  strategy,
  context,
  previousOpeners,
  generateText,
  maxRepairAttempts,
  metadata,
}) {

  const prompt =
    buildGenerationPrompt({
      context,
      strategy,
      previousOpeners,
    });


  let statement =
    await callModel({
      generateText,

      prompt,

      mode: "generate",

      metadata: {
        ...metadata,

        optionIndex,

        strategy:
          strategy.id,
      },
    });


  /*
   * Compress before broad repair.
   */
  if (
    countCharacters(statement) >
    context.characterLimit
  ) {
    statement =
      await compressStatement({
        statement,

        characterLimit:
          context.characterLimit,

        evidence:
          context.evidence,

        strategy,

        generateText,

        metadata: {
          ...metadata,
          optionIndex,
        },
      });
  }


  let validation =
    validateGeneratedStatement({
      statement,

      accomplishment:
        context.accomplishment,

      section:
        context.section,

      ratedRank:
        context.ratedRank,

      variation:
        context.variation,

      characterLimit:
        context.characterLimit,

      evidence:
        context.evidence,

      rankAnalysis:
        context.rankAnalysis,

      impactAnalysis:
        context.impactAnalysis,
    });


  let repairs = 0;


  while (
    !validation.valid &&
    repairs < maxRepairAttempts
  ) {
    statement =
      await repairStatement({
        statement,

        validation,

        characterLimit:
          context.characterLimit,

        evidence:
          context.evidence,

        strategy,

        generateText,

        metadata: {
          ...metadata,
          optionIndex,
          repairAttempt:
            repairs + 1,
        },
      });


    /*
     * Repair may still exceed the limit.
     */
    if (
      countCharacters(statement) >
      context.characterLimit
    ) {
      statement =
        await compressStatement({
          statement,

          characterLimit:
            context.characterLimit,

          evidence:
            context.evidence,

          strategy,

          generateText,

          metadata: {
            ...metadata,
            optionIndex,
            postRepairCompression:
              true,
          },
        });
    }


    validation =
      validateGeneratedStatement({
        statement,

        accomplishment:
          context.accomplishment,

        section:
          context.section,

        ratedRank:
          context.ratedRank,

        variation:
          context.variation,

        characterLimit:
          context.characterLimit,

        evidence:
          context.evidence,

        rankAnalysis:
          context.rankAnalysis,

        impactAnalysis:
          context.impactAnalysis,
      });


    repairs += 1;
  }


  const finalStatement =
    cleanGeneratedStatement(
      statement
    );


  const characterCount =
    countCharacters(
      finalStatement
    );


  return {
    id:
      `option_${optionIndex + 1}`,

    strategy:
      strategy.id,

    strategyLabel:
      strategy.label,

    statement:
      finalStatement,

    characterCount,

    characterLimit:
      context.characterLimit,

    characterStatus:
      getCharacterStatus(
        characterCount,
        context.characterLimit
      ),

    valid:
      validation.valid,

    repairAttempts:
      repairs,

    openingWord:
      getOpeningWord(
        finalStatement
      ),

    audit: {
      character: {
        count:
          characterCount,

        limit:
          context.characterLimit,

        withinLimit:
          characterCount <=
          context.characterLimit,

        status:
          getCharacterStatus(
            characterCount,
            context.characterLimit
          ),
      },

      validation,

      impact:
        validation.impactAudit ||
        null,

      rank:
        validation.rankAudit ||
        null,

      warnings:
        validation.warnings ||
        [],

      errors:
        validation.errors ||
        [],
    },
  };
}


/* ================================================================
   BATCH DUPLICATE OPENING CHECK
   ================================================================ */

export function findDuplicateOpeners(
  options = []
) {
  const map = new Map();

  options.forEach(
    (option, index) => {
      const opener =
        getOpeningWord(
          option.statement
        );

      if (!opener) return;

      const indexes =
        map.get(opener) || [];

      indexes.push(index);

      map.set(
        opener,
        indexes
      );
    }
  );


  const duplicates = [];

  for (
    const [
      opener,
      indexes,
    ] of map.entries()
  ) {
    if (indexes.length > 1) {
      duplicates.push({
        opener,
        indexes,
      });
    }
  }

  return duplicates;
}


/* ================================================================
   MAIN GENERATION ENTRY POINT
   ================================================================ */

/**
 * Main generation API.
 *
 * Example:
 *
 * const result =
 *   await generatePerformanceStatements(
 *     {
 *       accomplishment:
 *         "Led UT inspection...",
 *
 *       section:
 *         "Executing the Mission",
 *
 *       ratedRank:
 *         "SrA",
 *
 *       variation:
 *         "Balanced",
 *
 *       characterLimit: 350,
 *
 *       facts: {}
 *     },
 *
 *     {
 *       generateText:
 *         yourLLMAdapter
 *     }
 *   );
 */
export async function generatePerformanceStatements(
  {
    accomplishment = "",

    section =
      SECTION.EXECUTING_MISSION,

    ratedRank = "",

    variation =
      VARIATION.BALANCED,

    characterLimit =
      DEFAULT_CHARACTER_LIMIT,

    facts = {},

    context = {},

    /**
     * If true, generation stops when deterministic
     * analysis recommends coaching.
     *
     * Default false preserves the simple:
     *
     * type → generate
     *
     * workflow.
     *
     * The UI can independently call previewAccomplishment()
     * if it wants to coach before generation.
     */
    requireCoachingBeforeGeneration =
      false,

  } = {},

  {
    generateText,

    maxRepairAttempts = 2,

    metadata = {},
  } = {}
) {

  const cleanAccomplishment =
    normalizeWhitespace(
      accomplishment
    );


  if (!cleanAccomplishment) {
    return {
      status:
        GENERATION_STATUS.FAILED,

      options: [],

      error:
        "An accomplishment is required.",
    };
  }


  const normalizedSection =
    normalizeSection(
      section
    );


  const normalizedVariation =
    normalizeVariation(
      variation
    );


  const safeCharacterLimit =
    Number.isFinite(
      Number(characterLimit)
    )
      ? Math.max(
          1,
          Number(characterLimit)
        )
      : DEFAULT_CHARACTER_LIMIT;


  const preview =
    previewAccomplishment({
      accomplishment:
        cleanAccomplishment,

      section:
        normalizedSection,

      ratedRank,

      variation:
        normalizedVariation,

      characterLimit:
        safeCharacterLimit,

      facts,

      context,
    });


  /*
   * Hard rank restrictions should not silently become final prose.
   */
  if (
    preview.rankDecision
      ?.action ===
    "BLOCK_CLAIM"
  ) {
    return {
      status:
        GENERATION_STATUS.BLOCKED,

      options: [],

      preview,

      coachingQuestions:
        preview.coachingQuestions,

      reason:
        preview.rankDecision
          ?.reason ||
        "A responsibility claim requires clarification before generation.",
    };
  }


  /*
   * Optional coach-first product mode.
   */
  if (
    requireCoachingBeforeGeneration &&
    preview.status ===
      GENERATION_STATUS.COACH_FIRST
  ) {
    return {
      status:
        GENERATION_STATUS.COACH_FIRST,

      options: [],

      preview,

      recommendSplit:
        preview.recommendSplit,

      accomplishmentThreads:
        preview.accomplishmentThreads,

      coachingQuestions:
        preview.coachingQuestions,
    };
  }


  const promptContext =
    buildUniversalPromptContext({
      accomplishment:
        cleanAccomplishment,

      section:
        normalizedSection,

      ratedRank,

      variation:
        normalizedVariation,

      characterLimit:
        safeCharacterLimit,

      evidence:
        preview.evidence,

      rankAnalysis:
        preview.rankAnalysis,

      impactAnalysis:
        preview.impactAnalysis,
    });


  /*
   * Preserve original analyses so post-generation
   * validation can inspect them.
   */
  promptContext.rankAnalysis =
    preview.rankAnalysis;

  promptContext.impactAnalysis =
    preview.impactAnalysis;


  const strategies =
    OPTION_STRATEGIES[
      normalizedSection
    ] ||
    OPTION_STRATEGIES[
      SECTION.EXECUTING_MISSION
    ];


  const options = [];

  const previousOpeners = [];


  for (
    let index = 0;
    index < strategies.length;
    index += 1
  ) {
    const strategy =
      strategies[index];

    try {
      const option =
        await generateOneOption({
          optionIndex: index,

          strategy,

          context:
            promptContext,

          previousOpeners,

          generateText,

          maxRepairAttempts,

          metadata: {
            ...metadata,

            ratedRank,

            section:
              normalizedSection,

            variation:
              normalizedVariation,
          },
        });


      options.push(option);


      if (
        option.openingWord
      ) {
        previousOpeners.push(
          option.openingWord
        );
      }

    } catch (error) {
      options.push({
        id:
          `option_${index + 1}`,

        strategy:
          strategy.id,

        strategyLabel:
          strategy.label,

        statement: "",

        characterCount: 0,

        characterLimit:
          safeCharacterLimit,

        characterStatus:
          CHARACTER_STATUS.NORMAL,

        valid: false,

        error:
          error?.message ||
          "Generation failed.",

        audit: {
          errors: [
            {
              code:
                "GENERATION_FAILED",

              message:
                error?.message ||
                "Generation failed.",
            },
          ],

          warnings: [],
        },
      });
    }
  }


  /*
   * Batch duplicate opening verbs.
   */
  const duplicateOpeners =
    findDuplicateOpeners(
      options.filter(
        (option) =>
          option.statement
      )
    );


  if (
    duplicateOpeners.length
  ) {
    duplicateOpeners.forEach(
      (duplicate) => {
        duplicate.indexes.forEach(
          (index) => {
            const option =
              options[index];

            if (!option) return;

            option.audit =
              option.audit || {};

            option.audit.warnings =
              option.audit.warnings ||
              [];

            option.audit.warnings.push({
              code:
                "DUPLICATE_OPENING_VERB",

              message:
                `Opening verb "${duplicate.opener}" is repeated across generated options.`,
            });
          }
        );
      }
    );
  }


  const validCount =
    options.filter(
      (option) =>
        option.valid
    ).length;


  let status =
    GENERATION_STATUS.GENERATED;


  if (
    validCount === 0
  ) {
    status =
      GENERATION_STATUS.FAILED;
  }

  else if (
    validCount <
    options.length
  ) {
    status =
      GENERATION_STATUS.PARTIAL;
  }


  return {
    status,

    version:
      OPB_UNIVERSAL_VERSION,

    input: {
      accomplishment:
        cleanAccomplishment,

      section:
        normalizedSection,

      ratedRank,

      variation:
        normalizedVariation,

      characterLimit:
        safeCharacterLimit,

      facts,
    },

    preview,

    recommendSplit:
      preview.recommendSplit,

    accomplishmentThreads:
      preview.accomplishmentThreads,

    coachingQuestions:
      preview.coachingQuestions,

    evidence:
      preview.evidence,

    options,

    duplicateOpeners,

    validation: {
      totalOptions:
        options.length,

      validOptions:
        validCount,

      allValid:
        validCount ===
        options.length,
    },
  };
}


/* ================================================================
   SELECTED STATEMENT RECORD
   ================================================================ */

/**
 * Converts one generated option into the canonical record
 * that can later be moved into an AF Form 716 / 716A workspace.
 */
export function createSelectedStatementRecord({
  option,

  input = {},

  form = "AF716",

  status = "draft",

  id = null,
} = {}) {

  if (
    !option ||
    !option.statement
  ) {
    throw new Error(
      "A generated statement option is required."
    );
  }


  const statement =
    cleanGeneratedStatement(
      option.statement
    );


  const characterLimit =
    input.characterLimit ||
    option.characterLimit ||
    DEFAULT_CHARACTER_LIMIT;


  const characterCount =
    countCharacters(
      statement
    );


  return {
    id:
      id ||
      randomId("stmt"),

    form,

    section:
      normalizeSection(
        input.section
      ),

    ratedRank:
      input.ratedRank ||
      "",

    variation:
      normalizeVariation(
        input.variation
      ),

    source:
      normalizeWhitespace(
        input.accomplishment ||
        ""
      ),

    statement,

    characterCount,

    characterLimit,

    status,

    strategy:
      option.strategy ||
      null,

    strategyLabel:
      option.strategyLabel ||
      null,

    validation: {
      withinLimit:
        characterCount <=
        characterLimit,

      unsupportedFacts:
        Boolean(
          option.audit
            ?.impact
            ?.unsupportedFacts
        ),

      rankRestricted:
        Boolean(
          option.audit
            ?.rank
            ?.restricted
            ?.length
        ),

      valid:
        Boolean(
          option.valid
        ),

      warnings:
        safeArray(
          option.audit?.warnings
        ),

      errors:
        safeArray(
          option.audit?.errors
        ),
    },

    provenance: {
      generator:
        "PCSUnited / TheWing.ai",

      engine:
        "opb-universal",

      engineVersion:
        OPB_UNIVERSAL_VERSION,

      generatedOptionId:
        option.id ||
        null,
    },
  };
}


/* ================================================================
   THREE-OPTION RECORD HELPER
   ================================================================ */

export function getSelectableOptions(
  result
) {
  if (
    !result ||
    !Array.isArray(
      result.options
    )
  ) {
    return [];
  }

  return result.options.map(
    (option) => ({
      id:
        option.id,

      label:
        option.strategyLabel,

      statement:
        option.statement,

      characterCount:
        option.characterCount,

      characterLimit:
        option.characterLimit,

      characterStatus:
        option.characterStatus,

      valid:
        option.valid,

      warnings:
        option.audit
          ?.warnings ||
        [],

      errors:
        option.audit
          ?.errors ||
        [],
    })
  );
}


/* ================================================================
   DEBUG / DEVELOPMENT ANALYSIS
   ================================================================ */

/**
 * Useful while developing the backend.
 *
 * No LLM call.
 */
export function debugAccomplishment({
  accomplishment,
  section,
  ratedRank,
  variation,
  characterLimit,
  facts,
  context,
} = {}) {

  const preview =
    previewAccomplishment({
      accomplishment,
      section,
      ratedRank,
      variation,
      characterLimit,
      facts,
      context,
    });


  const promptContext =
    buildUniversalPromptContext({
      accomplishment:
        preview.accomplishment,

      section:
        preview.section,

      ratedRank,

      variation:
        preview.variation,

      characterLimit:
        preview.characterLimit,

      evidence:
        preview.evidence,

      rankAnalysis:
        preview.rankAnalysis,

      impactAnalysis:
        preview.impactAnalysis,
    });


  return {
    preview,

    strategies:
      OPTION_STRATEGIES[
        preview.section
      ],

    promptContext,
  };
}


/* ================================================================
   EXAMPLE LLM ADAPTER CONTRACT
   ================================================================ */

/**
 * The actual implementation belongs in:
 *
 *   netlify/functions/epb-generator.js
 *
 * Example:
 *
 * async function generateText({
 *   prompt,
 *   mode,
 *   metadata
 * }) {
 *
 *   const response =
 *     await openai.responses.create({
 *       model: "...",
 *       input: prompt
 *     });
 *
 *   return response.output_text;
 * }
 *
 *
 * Then:
 *
 * const result =
 *   await generatePerformanceStatements(
 *     input,
 *     {
 *       generateText
 *     }
 *   );
 */


/* ================================================================
   DEFAULT EXPORT
   ================================================================ */

export default {
  version:
    OPB_UNIVERSAL_VERSION,

  DEFAULT_CHARACTER_LIMIT,

  GENERATION_STATUS,

  VARIATION,

  SECTION,

  CHARACTER_STATUS,

  SECTION_INTENT,

  OPTION_STRATEGIES,

  VARIATION_RULES,

  WRITING_DOCTRINE,

  normalizeSection,

  normalizeVariation,

  countCharacters,

  getCharacterStatus,

  extractMetricsFromText,

  buildEvidenceWhitelist,

  previewAccomplishment,

  buildUniversalPromptContext,

  buildGenerationPrompt,

  buildCompressionPrompt,

  buildRepairPrompt,

  cleanGeneratedStatement,

  getOpeningWord,

  findDuplicateOpeners,

  validateGeneratedStatement,

  generatePerformanceStatements,

  createSelectedStatementRecord,

  getSelectableOptions,

  debugAccomplishment,
};
