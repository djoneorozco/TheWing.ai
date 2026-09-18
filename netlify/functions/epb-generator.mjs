// ============================================================
// TheWing.ai • PCSUnited
// Air Force EPB Performance Statement Generator
//
// File:
//   netlify/functions/epb-generator.mjs
//
// Version:
//   2.0.0
//
// Architecture:
//
//   Webflow / app.js
//          ↓
//   epb-generator.mjs
//          ↓
//   opb-universal.js
//          ├── rank-tier.js
//          ├── impact-engine.js
//          └── opb-validator.js
//          ↓
//   OpenAI Responses API
//          ↓
//   3 validated Performance Statements
//
// Core philosophy:
//
//   TheWing validates.
//   Amy coaches.
//
//   Explore impact aggressively.
//   Assert impact conservatively.
//
// IMPORTANT:
//
//   - AFSC is OPTIONAL.
//   - This endpoint is NOT restricted to 2A752 / 2A772.
//   - Rank provides context; facts remain controlling.
//   - No blind 350-character truncation.
//   - OpenAI receives only server-controlled generation prompts.
//   - Deterministic validation remains inside TheWing modules.
// ============================================================


import {
  randomUUID
} from "node:crypto";


import {
  generatePerformanceStatements,
  previewAccomplishment,
  DEFAULT_CHARACTER_LIMIT
} from "../../OPB-Generator/js/opb-universal.js";


import {
  AF_EVALUATIONS_VERSION,
  scanEvaluationLanguage
} from "../../public/ask-amy/af-evaluations.js";


// ============================================================
// 1. CONFIG
// ============================================================

const VERSION =
  "2.0.0";


const ENDPOINT_NAME =
  "epb-generator";


const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  "";


const OPENAI_MODEL =
  process.env.EPB_OPENAI_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.6";


const OPENAI_URL =
  "https://api.openai.com/v1/responses";


const STATEMENT_MAX_CHARS =
  DEFAULT_CHARACTER_LIMIT ||
  350;


const MAX_BODY_CHARS =
  75_000;


const MAX_ACCOMPLISHMENT_CHARS =
  2_500;


const MIN_ACCOMPLISHMENT_CHARS =
  3;


const MAX_PREVIOUS_STATEMENTS =
  12;


const MAX_PREVIOUS_STATEMENT_CHARS =
  500;


const OPENAI_TIMEOUT_MS =
  45_000;


const MAX_REPAIR_ATTEMPTS =
  2;


// ============================================================
// 2. ALLOWED ORIGINS
// ============================================================

const ALLOW_ORIGINS =
  new Set([

    "https://thewing.ai",

    "https://www.thewing.ai",

    "https://thewing.netlify.app",

    "https://www.thewing.netlify.app",

    "https://the-wing.webflow.io",

    "https://www.the-wing.webflow.io",

    "http://localhost:8888",

    "http://localhost:3000",

    "http://127.0.0.1:8888",

    "http://127.0.0.1:3000"

  ]);


// ============================================================
// 3. VALID SECTIONS
// ============================================================

const SECTION_ALIASES =
  Object.freeze({

    "duty-description":
      "duty-description",

    "duty description":
      "duty-description",

    duty:
      "duty-description",


    "executing-the-mission":
      "executing-the-mission",

    "executing the mission":
      "executing-the-mission",

    executing_mission:
      "executing-the-mission",

    mission:
      "executing-the-mission",


    "leading-people":
      "leading-people",

    "leading people":
      "leading-people",

    leading_people:
      "leading-people",

    leadership:
      "leading-people",


    "managing-resources":
      "managing-resources",

    "managing resources":
      "managing-resources",

    managing_resources:
      "managing-resources",

    resources:
      "managing-resources",


    "improving-the-unit":
      "improving-the-unit",

    "improving the unit":
      "improving-the-unit",

    improving_unit:
      "improving-the-unit",

    improvement:
      "improving-the-unit",

    innovation:
      "improving-the-unit"

  });


const SECTION_LABELS =
  Object.freeze({

    "duty-description":
      "Duty Description",

    "executing-the-mission":
      "Executing the Mission",

    "leading-people":
      "Leading People",

    "managing-resources":
      "Managing Resources",

    "improving-the-unit":
      "Improving the Unit"

  });


// ============================================================
// 4. RANK NORMALIZATION
// ============================================================

/*
 * rank-tier.js ultimately owns the detailed rank intelligence.
 *
 * This endpoint only normalizes common UI / legacy inputs into
 * the canonical strings expected by the universal engine.
 */

const RANK_ALIASES =
  Object.freeze({

    // ----------------------------------------------------------
    // GROUPED UI VALUE
    // ----------------------------------------------------------

    "sra_below":
      "SrA & Below",

    "sra&below":
      "SrA & Below",

    "sra below":
      "SrA & Below",

    "sra & below":
      "SrA & Below",

    "sraandbelow":
      "SrA & Below",


    // ----------------------------------------------------------
    // AB
    // ----------------------------------------------------------

    "ab":
      "AB",

    "airmanbasic":
      "AB",

    "e1":
      "AB",

    "e-1":
      "AB",


    // ----------------------------------------------------------
    // AMN
    // ----------------------------------------------------------

    "amn":
      "Amn",

    "airman":
      "Amn",

    "e2":
      "Amn",

    "e-2":
      "Amn",


    // ----------------------------------------------------------
    // A1C
    // ----------------------------------------------------------

    "a1c":
      "A1C",

    "airmanfirstclass":
      "A1C",

    "e3":
      "A1C",

    "e-3":
      "A1C",


    // ----------------------------------------------------------
    // SRA
    // ----------------------------------------------------------

    "sra":
      "SrA",

    "seniorairman":
      "SrA",

    "e4":
      "SrA",

    "e-4":
      "SrA",


    // ----------------------------------------------------------
    // SSGT
    // ----------------------------------------------------------

    "ssgt":
      "SSgt",

    "staffsergeant":
      "SSgt",

    "e5":
      "SSgt",

    "e-5":
      "SSgt",


    // ----------------------------------------------------------
    // TSGT
    // ----------------------------------------------------------

    "tsgt":
      "TSgt",

    "technicalsergeant":
      "TSgt",

    "e6":
      "TSgt",

    "e-6":
      "TSgt",


    // ----------------------------------------------------------
    // MSGT
    // ----------------------------------------------------------

    "msgt":
      "MSgt",

    "mastersergeant":
      "MSgt",

    "e7":
      "MSgt",

    "e-7":
      "MSgt",


    // ----------------------------------------------------------
    // SMSGT
    // ----------------------------------------------------------

    "smsgt":
      "SMSgt",

    "seniormastersergeant":
      "SMSgt",

    "e8":
      "SMSgt",

    "e-8":
      "SMSgt",


    // ----------------------------------------------------------
    // CMSGT
    // ----------------------------------------------------------

    "cmsgt":
      "CMSgt",

    "chiefmastersergeant":
      "CMSgt",

    "e9":
      "CMSgt",

    "e-9":
      "CMSgt"

  });


// ============================================================
// 5. VARIATION NORMALIZATION
// ============================================================

const VALID_VARIATIONS =
  new Set([

    "strict",

    "balanced",

    "competitive"

  ]);


// ============================================================
// 6. NETLIFY HANDLER
// ============================================================

export async function handler(
  event
) {

  const origin =
    getHeader(
      event,
      "origin"
    );


  // ==========================================================
  // OPTIONS
  // ==========================================================

  if (
    event?.httpMethod ===
    "OPTIONS"
  ) {

    if (
      !isAllowedOrigin(
        origin
      )
    ) {

      return respondError(

        403,

        {

          code:
            "ORIGIN_NOT_ALLOWED",

          error:
            "Origin is not allowed."

        },

        origin

      );

    }


    return respond(

      204,

      {},

      origin

    );

  }


  // ==========================================================
  // POST ONLY
  // ==========================================================

  if (
    event?.httpMethod !==
    "POST"
  ) {

    return respondError(

      405,

      {

        code:
          "METHOD_NOT_ALLOWED",

        error:
          "Use POST."

      },

      origin,

      {

        Allow:
          "POST, OPTIONS"

      }

    );

  }


  // ==========================================================
  // CORS
  // ==========================================================

  if (
    !isAllowedOrigin(
      origin
    )
  ) {

    return respondError(

      403,

      {

        code:
          "ORIGIN_NOT_ALLOWED",

        error:
          "Origin is not allowed."

      },

      origin

    );

  }


  // ==========================================================
  // OPENAI CONFIG
  // ==========================================================

  if (
    !OPENAI_API_KEY
  ) {

    return respondError(

      503,

      {

        code:
          "OPENAI_NOT_CONFIGURED",

        error:
          "EPB generation is temporarily unavailable."

      },

      origin

    );

  }


  // ==========================================================
  // BODY SIZE
  // ==========================================================

  const rawBody =
    typeof event?.body ===
      "string"

      ? event.body

      : "";


  if (
    rawBody.length >
    MAX_BODY_CHARS
  ) {

    return respondError(

      413,

      {

        code:
          "REQUEST_TOO_LARGE",

        error:
          "Request is too large."

      },

      origin

    );

  }


  // ==========================================================
  // PARSE JSON
  // ==========================================================

  const parsed =
    parseJsonBody(
      event?.body
    );


  if (
    !parsed.ok
  ) {

    return respondError(

      400,

      {

        code:
          "INVALID_JSON",

        error:
          "Request body must be valid JSON."

      },

      origin

    );

  }


  // ==========================================================
  // NORMALIZE REQUEST
  // ==========================================================

  const inputResult =
    normalizeRequest(
      parsed.body
    );


  if (
    !inputResult.ok
  ) {

    return respondError(

      400,

      {

        code:
          inputResult.code,

        error:
          inputResult.error

      },

      origin

    );

  }


  const input =
    inputResult.value;


  // ==========================================================
  // CONTENT / PROTECTED INFORMATION SCAN
  // ==========================================================

  const languageFlags =
    safeScanEvaluationLanguage(
      input.accomplishment
    );


  const blockingFlag =
    languageFlags.find(

      flag =>
        flag?.severity ===
        "stop"

    );


  if (
    blockingFlag
  ) {

    return respondError(

      422,

      {

        code:
          "SENSITIVE_CONTENT_BLOCKED",

        error:
          "This accomplishment appears to contain information that should not be placed into an evaluation-writing workflow. Remove classified or protected information and try again.",

        warnings:
          languageFlags

      },

      origin

    );

  }


  // ==========================================================
  // REQUEST METADATA
  // ==========================================================

  const requestId =
    randomUUID();


  const startedAt =
    Date.now();


  try {

    // ========================================================
    // UNIVERSAL PERFORMANCE STATEMENT ENGINE
    // ========================================================

    const result =
      await generatePerformanceStatements(

        {

          accomplishment:
            input.accomplishment,

          section:
            input.section,

          ratedRank:
            input.ratedRank,

          variation:
            input.variation,

          characterLimit:
            input.characterLimit,

          facts:
            input.facts,

          context: {

            /*
             * AFSC is optional enrichment only.
             *
             * It no longer determines whether generation is allowed.
             */
            afsc:
              input.afsc ||
              null,

            previousStatements:
              input.previousStatements,

            form:
              input.form,

            client:
              input.client,

            requestId

          },

          /*
           * Keep the current simple product behavior:
           *
           * User clicks Generate
           *       ↓
           * TheWing generates.
           *
           * Coaching questions are still returned and can later
           * be surfaced interactively.
           */
          requireCoachingBeforeGeneration:
            input.requireCoachingBeforeGeneration

        },

        {

          generateText:
            createOpenAIAdapter({
              requestId
            }),

          maxRepairAttempts:
            MAX_REPAIR_ATTEMPTS,

          metadata: {

            requestId,

            form:
              input.form,

            afsc:
              input.afsc ||
              null

          }

        }

      );


    // ========================================================
    // UNIVERSAL ENGINE BLOCK
    // ========================================================

    if (
      result?.status ===
      "BLOCKED"
    ) {

      return respond(

        422,

        {

          ok:
            false,

          endpoint:
            ENDPOINT_NAME,

          version:
            VERSION,

          status:
            result.status,

          code:
            "RANK_OR_RESPONSIBILITY_REQUIRES_CLARIFICATION",

          error:
            result.reason ||
            "A responsibility claim requires clarification before generation.",

          coachingQuestions:
            result.coachingQuestions ||
            [],

          preview:
            result.preview ||
            null,

          request_id:
            requestId

        },

        origin

      );

    }


    // ========================================================
    // OPTIONAL COACH-FIRST MODE
    // ========================================================

    if (
      result?.status ===
      "COACH_FIRST"
    ) {

      return respond(

        200,

        {

          ok:
            true,

          endpoint:
            ENDPOINT_NAME,

          version:
            VERSION,

          model:
            OPENAI_MODEL,

          status:
            "COACH_FIRST",

          options:
            [],

          coachingQuestions:
            result.coachingQuestions ||
            [],

          recommendSplit:
            Boolean(
              result.recommendSplit
            ),

          accomplishmentThreads:
            result.accomplishmentThreads ||
            [],

          preview:
            result.preview ||
            null,

          request_id:
            requestId,

          latency_ms:
            Date.now() -
            startedAt

        },

        origin

      );

    }


    // ========================================================
    // TOTAL GENERATION FAILURE
    // ========================================================

    if (
      result?.status ===
        "FAILED" ||
      !Array.isArray(
        result?.options
      ) ||
      result.options.length ===
        0
    ) {

      return respondError(

        502,

        {

          code:
            "NO_VALID_STATEMENTS",

          error:
            "TheWing could not produce a valid Performance Statement from the supplied information.",

          detail:
            result,

          request_id:
            requestId

        },

        origin

      );

    }


    // ========================================================
    // WARNINGS
    // ========================================================

    const warnings =
      uniqueStrings([

        ...languageFlags
          .filter(
            flag =>
              flag?.severity !==
              "stop"
          )
          .map(
            flag =>
              flag?.message
          ),

        ...collectResultWarnings(
          result
        )

      ]);


    // ========================================================
    // SUCCESS RESPONSE
    // ========================================================

    return respond(

      200,

      {

        ok:
          true,

        endpoint:
          ENDPOINT_NAME,

        version:
          VERSION,

        policy_version:
          AF_EVALUATIONS_VERSION,

        engine_version:
          result.version ||
          null,

        model:
          OPENAI_MODEL,


        // ====================================================
        // GENERATION STATUS
        // ====================================================

        status:
          result.status,


        // ====================================================
        // THREE GENERATED OPTIONS
        // ====================================================

        options:
          result.options,


        // ====================================================
        // COACHING / IMPACT INTELLIGENCE
        // ====================================================

        recommendSplit:
          Boolean(
            result.recommendSplit
          ),

        accomplishmentThreads:
          result.accomplishmentThreads ||
          [],

        coachingQuestions:
          result.coachingQuestions ||
          [],


        // ====================================================
        // DETERMINISTIC PREVIEW
        // ====================================================

        preview:
          result.preview ||
          null,


        // ====================================================
        // EVIDENCE PACKET
        // ====================================================

        evidence:
          result.evidence ||
          null,


        // ====================================================
        // VALIDATION SUMMARY
        // ====================================================

        validation:
          result.validation ||
          null,

        duplicateOpeners:
          result.duplicateOpeners ||
          [],

        warnings,


        // ====================================================
        // NORMALIZED CONTEXT
        // ====================================================

        context_used: {

          form:
            input.form,

          section:
            input.section,

          section_label:
            SECTION_LABELS[
              input.section
            ] ||
            input.section,

          rated_rank:
            input.ratedRank,

          variation:
            input.variation,

          character_limit:
            input.characterLimit,

          afsc:
            input.afsc ||
            null,

          afsc_required:
            false,

          previous_statement_count:
            input.previousStatements
              .length

        },


        // ====================================================
        // DISCLAIMERS
        // ====================================================

        disclaimers: [

          "Generated wording is a drafting aid and does not create an official evaluator judgment.",

          "The generator must not invent facts, metrics, mission effects, safety effects, readiness effects, organizational scope, or awards.",

          "AFSC is optional context and is not required to generate a Performance Statement.",

          "Do not enter classified or protected operational information."

        ],


        request_id:
          requestId,

        latency_ms:
          Date.now() -
          startedAt

      },

      origin

    );

  }

  catch (error) {

    console.error(

      "[epb-generator]",

      requestId,

      error

    );


    return respondError(

      500,

      {

        code:
          "GENERATION_FAILED",

        error:
          "EPB statement generation failed.",

        detail:
          process.env.NODE_ENV ===
          "development"

            ? String(
                error?.message ||
                error
              )

            : undefined,

        request_id:
          requestId

      },

      origin

    );

  }

}


// ============================================================
// 7. REQUEST NORMALIZATION
// ============================================================

function normalizeRequest(
  body = {}
) {

  /*
   * app.js currently sends both:
   *
   * {
   *   tool: "...",
   *   input: {...},
   *   ...topLevelFields
   * }
   *
   * Accept nested or direct payloads.
   */
  const nestedInput =
    isPlainObject(
      body?.input
    )

      ? body.input

      : {};


  const source = {

    ...body,

    ...nestedInput

  };


  // ==========================================================
  // ACCOMPLISHMENT
  // ==========================================================

  const accomplishment =
    safeStr(

      source.accomplishment ||

      source.source ||

      source.text

    );


  if (
    !accomplishment
  ) {

    return {

      ok:
        false,

      code:
        "ACCOMPLISHMENT_REQUIRED",

      error:
        "Describe the accomplishment first."

    };

  }


  if (
    accomplishment.length <
    MIN_ACCOMPLISHMENT_CHARS
  ) {

    return {

      ok:
        false,

      code:
        "ACCOMPLISHMENT_TOO_SHORT",

      error:
        "Add a little more detail about the accomplishment."

    };

  }


  if (
    accomplishment.length >
    MAX_ACCOMPLISHMENT_CHARS
  ) {

    return {

      ok:
        false,

      code:
        "ACCOMPLISHMENT_TOO_LONG",

      error:
        `Accomplishment must be ${MAX_ACCOMPLISHMENT_CHARS} characters or fewer.`

    };

  }


  // ==========================================================
  // RANK
  // ==========================================================

  const ratedRank =
    normalizeRankInput(

      source.ratedRank ||

      source.rank ||

      source.grade

    );


  if (
    !ratedRank
  ) {

    return {

      ok:
        false,

      code:
        "RANK_REQUIRED",

      error:
        "Select a valid rank."

    };

  }


  // ==========================================================
  // SECTION / MPA
  // ==========================================================

  const section =
    normalizeSectionInput(

      source.section ||

      source.mpa

    );


  if (
    !section
  ) {

    return {

      ok:
        false,

      code:
        "SECTION_REQUIRED",

      error:
        "Select a valid AF Form 716 section."

    };

  }


  // ==========================================================
  // VARIATION
  // ==========================================================

  const variation =
    normalizeVariationInput(
      source.variation
    );


  // ==========================================================
  // CHARACTER LIMIT
  // ==========================================================

  const requestedLimit =
    Number(
      source.characterLimit ||
      source.character_limit ||
      STATEMENT_MAX_CHARS
    );


  const characterLimit =
    Number.isFinite(
      requestedLimit
    )

      ? Math.min(
          STATEMENT_MAX_CHARS,
          Math.max(
            1,
            Math.floor(
              requestedLimit
            )
          )
        )

      : STATEMENT_MAX_CHARS;


  // ==========================================================
  // OPTIONAL AFSC
  // ==========================================================

  /*
   * AFSC is now OPTIONAL.
   *
   * We preserve it exactly as context, but:
   *
   * - no AFSC pack is required
   * - no 2A752 / 2A772 gate exists
   * - unknown AFSCs do not block generation
   */
  const afsc =
    normalizeOptionalAfsc(

      source.afsc ||

      source.dafsc ||

      source.pafsc ||

      ""

    );


  // ==========================================================
  // OPTIONAL VERIFIED FACTS
  // ==========================================================

  const facts =
    isPlainObject(
      source.facts
    )

      ? source.facts

      : {};


  // ==========================================================
  // PREVIOUS STATEMENTS
  // ==========================================================

  const previousStatements =
    normalizePreviousStatements(

      source.previousStatements ||

      source.previous_statements

    );


  // ==========================================================
  // FORM
  // ==========================================================

  const form =
    safeStr(
      source.form
    ) ||
    "AF716";


  // ==========================================================
  // COACH-FIRST MODE
  // ==========================================================

  const requireCoachingBeforeGeneration =
    source.requireCoachingBeforeGeneration ===
      true ||
    source.coachFirst ===
      true;


  // ==========================================================
  // CLIENT
  // ==========================================================

  const client =
    safeStr(
      source.client ||
      source.sourceClient
    ) ||
    "opb-generator";


  return {

    ok:
      true,

    value: {

      accomplishment,

      section,

      ratedRank,

      variation,

      characterLimit,

      afsc,

      facts,

      previousStatements,

      form,

      requireCoachingBeforeGeneration,

      client

    }

  };

}


// ============================================================
// 8. RANK NORMALIZATION
// ============================================================

function normalizeRankInput(
  value
) {

  const raw =
    safeStr(
      value
    );


  if (!raw) {

    return "";

  }


  const lower =
    raw.toLowerCase();


  /*
   * Preserve explicit grouped UI option.
   */
  if (
    lower ===
      "sra & below" ||
    lower ===
      "sra_below" ||
    lower ===
      "sra below"
  ) {

    return "SrA & Below";

  }


  /*
   * Direct canonical names.
   */
  const canonical =
    [

      "AB",

      "Amn",

      "A1C",

      "SrA",

      "SSgt",

      "TSgt",

      "MSgt",

      "SMSgt",

      "CMSgt"

    ];


  for (
    const rank
    of canonical
  ) {

    if (
      rank.toLowerCase() ===
      lower
    ) {

      return rank;

    }

  }


  /*
   * Normalized lookup form.
   */
  const compact =
    raw
      .toLowerCase()
      .replace(
        /[^a-z0-9&-]/g,
        ""
      );


  if (
    RANK_ALIASES[
      compact
    ]
  ) {

    return RANK_ALIASES[
      compact
    ];

  }


  /*
   * Paygrade anywhere in the input.
   */
  const payGradeMatch =
    raw
      .toUpperCase()
      .match(
        /\bE\s*-?\s*([1-9])\b/
      );


  if (
    payGradeMatch
  ) {

    const payGrade =
      `e-${payGradeMatch[1]}`;


    return (
      RANK_ALIASES[
        payGrade
      ] ||
      ""
    );

  }


  /*
   * Rank titles.
   */
  const titleKey =
    raw
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );


  return (
    RANK_ALIASES[
      titleKey
    ] ||
    ""
  );

}


// ============================================================
// 9. SECTION NORMALIZATION
// ============================================================

function normalizeSectionInput(
  value
) {

  const raw =
    safeStr(
      value
    );


  if (!raw) {

    return "";

  }


  const normalized =
    raw
      .toLowerCase()
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return (
    SECTION_ALIASES[
      normalized
    ] ||

    SECTION_ALIASES[
      raw
        .toLowerCase()
    ] ||

    ""
  );

}


// ============================================================
// 10. VARIATION NORMALIZATION
// ============================================================

function normalizeVariationInput(
  value
) {

  const normalized =
    safeStr(
      value
    )
      .toLowerCase();


  return VALID_VARIATIONS.has(
    normalized
  )

    ? normalized

    : "balanced";

}


// ============================================================
// 11. OPTIONAL AFSC NORMALIZATION
// ============================================================

function normalizeOptionalAfsc(
  value
) {

  return safeStr(
    value
  )
    .toUpperCase()
    .replace(
      /\s+/g,
      ""
    )
    .slice(
      0,
      20
    );

}


// ============================================================
// 12. PREVIOUS STATEMENTS
// ============================================================

function normalizePreviousStatements(
  value
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  return value

    .map(
      item =>
        safeStr(
          typeof item ===
            "string"

            ? item

            : item?.statement
        )
          .slice(
            0,
            MAX_PREVIOUS_STATEMENT_CHARS
          )
    )

    .filter(
      Boolean
    )

    .slice(
      0,
      MAX_PREVIOUS_STATEMENTS
    );

}


// ============================================================
// 13. OPENAI ADAPTER FACTORY
// ============================================================

function createOpenAIAdapter({
  requestId
}) {

  let callNumber =
    0;


  return async function generateText({

    prompt,

    mode =
      "generate",

    metadata =
      {}

  } = {}) {

    callNumber +=
      1;


    const callId =
      `${requestId}-${mode}-${callNumber}`;


    return callOpenAIText({

      prompt,

      requestId:
        callId,

      mode,

      metadata

    });

  };

}


// ============================================================
// 14. OPENAI TEXT GENERATION
// ============================================================

async function callOpenAIText({

  prompt,

  requestId,

  mode,

  metadata

}) {

  const cleanPrompt =
    safeStr(
      prompt
    );


  if (
    !cleanPrompt
  ) {

    throw new Error(
      "Generation prompt is empty."
    );

  }


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

        OPENAI_URL,

        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            "Content-Type":
              "application/json",

            "X-Client-Request-Id":
              requestId

          },


          body:
            JSON.stringify({

              model:
                OPENAI_MODEL,

              /*
               * Do not retain application state for this request.
               */
              store:
                false,

              /*
               * opb-universal.js already creates a complete,
               * server-controlled prompt for each generation,
               * compression, or repair pass.
               */
              input:
                cleanPrompt,

              /*
               * Statements are short, but repair/compression
               * responses need enough headroom to finish cleanly.
               */
              max_output_tokens:
                mode ===
                  "generate"

                  ? 700

                  : 500

            }),


          signal:
            controller.signal

        }

      );


    const raw =
      await response.text();


    const data =
      safeJsonParse(
        raw
      );


    if (
      !response.ok
    ) {

      const message =

        safeStr(
          data?.error?.message
        )

        ||

        `OpenAI request failed with status ${response.status}.`;


      throw new Error(
        message
      );

    }


    if (
      data?.status ===
      "failed"
    ) {

      throw new Error(

        safeStr(
          data?.error?.message
        )

        ||

        "OpenAI response failed."

      );

    }


    const outputText =
      extractResponseText(
        data
      );


    if (
      !outputText
    ) {

      throw new Error(
        "OpenAI returned no text output."
      );

    }


    return {

      text:
        normalizeModelText(
          outputText
        ),

      metadata: {

        mode,

        requestId,

        model:
          OPENAI_MODEL,

        ...(
          isPlainObject(
            metadata
          )

            ? metadata

            : {}
        )

      }

    };

  }

  catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "Generation timed out."
      );

    }


    throw error;

  }

  finally {

    clearTimeout(
      timeout
    );

  }

}


// ============================================================
// 15. OPENAI RESPONSE TEXT EXTRACTOR
// ============================================================

function extractResponseText(
  data
) {

  /*
   * Some Responses API clients expose output_text directly.
   */
  if (
    typeof data?.output_text ===
      "string" &&
    data.output_text.trim()
  ) {

    return data.output_text.trim();

  }


  const output =
    Array.isArray(
      data?.output
    )

      ? data.output

      : [];


  const chunks =
    [];


  for (
    const item
    of output
  ) {

    if (
      item?.type !==
      "message"
    ) {

      continue;

    }


    const content =
      Array.isArray(
        item?.content
      )

        ? item.content

        : [];


    for (
      const part
      of content
    ) {

      if (
        part?.type ===
          "output_text" &&
        typeof part?.text ===
          "string"
      ) {

        chunks.push(
          part.text
        );

      }

    }

  }


  return chunks
    .join("\n")
    .trim();

}


// ============================================================
// 16. MODEL TEXT NORMALIZATION
// ============================================================

function normalizeModelText(
  value
) {

  return safeStr(
    value
  )

    .replace(
      /^```[a-z]*\s*/i,
      ""
    )

    .replace(
      /```$/i,
      ""
    )

    .replace(
      /^["'“”]+|["'“”]+$/g,
      ""
    )

    .replace(
      /^\s*[•●▪◦]\s*/,
      ""
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


// ============================================================
// 17. RESULT WARNING COLLECTION
// ============================================================

function collectResultWarnings(
  result
) {

  const warnings =
    [];


  for (
    const option
    of Array.isArray(
      result?.options
    )

      ? result.options

      : []
  ) {

    for (
      const warning
      of Array.isArray(
        option?.audit?.warnings
      )

        ? option.audit.warnings

        : []
    ) {

      const message =

        typeof warning ===
          "string"

          ? warning

          : warning?.message;


      if (
        message
      ) {

        warnings.push(
          message
        );

      }

    }

  }


  return warnings;

}


// ============================================================
// 18. SAFE LANGUAGE SCAN
// ============================================================

function safeScanEvaluationLanguage(
  accomplishment
) {

  try {

    const result =
      scanEvaluationLanguage(
        accomplishment
      );


    return Array.isArray(
      result
    )

      ? result

      : [];

  }

  catch (error) {

    console.warn(
      "[epb-generator] Evaluation-language scan failed open:",
      error
    );


    return [];

  }

}


// ============================================================
// 19. CORS
// ============================================================

function isAllowedOrigin(
  origin
) {

  const clean =
    safeStr(
      origin
    );


  /*
   * Server-to-server / local requests may not include Origin.
   */
  if (
    !clean
  ) {

    return true;

  }


  return ALLOW_ORIGINS.has(
    clean
  );

}


// ============================================================
// 20. RESPONSE HEADERS
// ============================================================

function corsHeaders(
  origin
) {

  const clean =
    safeStr(
      origin
    );


  const headers = {

    "Access-Control-Allow-Headers":
      "Content-Type, X-PCSU-Client, X-TheWing-Client",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Max-Age":
      "86400",

    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store",

    Vary:
      "Origin"

  };


  if (
    clean &&
    ALLOW_ORIGINS.has(
      clean
    )
  ) {

    headers[
      "Access-Control-Allow-Origin"
    ] =
      clean;

  }


  return headers;

}


// ============================================================
// 21. RESPOND
// ============================================================

function respond(

  statusCode,

  payload,

  origin,

  extraHeaders = {}

) {

  return {

    statusCode,


    headers: {

      ...corsHeaders(
        origin
      ),

      ...extraHeaders

    },


    body:
      statusCode ===
        204

        ? ""

        : JSON.stringify(
            payload ||
            {}
          )

  };

}


// ============================================================
// 22. ERROR RESPONSE
// ============================================================

function respondError(

  statusCode,

  fields = {},

  origin,

  extraHeaders = {}

) {

  const payload = {

    ok:
      false,

    endpoint:
      ENDPOINT_NAME,

    version:
      VERSION,

    code:
      safeStr(
        fields.code
      ) ||
      "REQUEST_FAILED",

    error:
      safeStr(
        fields.error
      ) ||
      "Request failed."

  };


  if (
    Array.isArray(
      fields.warnings
    ) &&
    fields.warnings.length
  ) {

    payload.warnings =
      fields.warnings;

  }


  if (
    fields.request_id
  ) {

    payload.request_id =
      fields.request_id;

  }


  if (
    process.env.NODE_ENV ===
      "development" &&
    fields.detail !==
      undefined
  ) {

    payload.detail =
      fields.detail;

  }


  return respond(

    statusCode,

    payload,

    origin,

    extraHeaders

  );

}


// ============================================================
// 23. HEADER LOOKUP
// ============================================================

function getHeader(
  event,
  name
) {

  const headers =
    event?.headers ||
    {};


  const target =
    safeStr(
      name
    )
      .toLowerCase();


  for (
    const [
      key,
      value
    ]
    of Object.entries(
      headers
    )
  ) {

    if (
      safeStr(
        key
      )
        .toLowerCase() ===
      target
    ) {

      return value;

    }

  }


  return "";

}


// ============================================================
// 24. JSON BODY PARSER
// ============================================================

function parseJsonBody(
  raw
) {

  try {

    if (
      !raw
    ) {

      return {

        ok:
          true,

        body:
          {}

      };

    }


    if (
      typeof raw ===
      "object"
    ) {

      return {

        ok:
          true,

        body:
          raw

      };

    }


    return {

      ok:
        true,

      body:
        JSON.parse(
          raw
        )

    };

  }

  catch {

    return {

      ok:
        false,

      body:
        null

    };

  }

}


// ============================================================
// 25. SAFE JSON
// ============================================================

function safeJsonParse(
  raw
) {

  try {

    if (
      !raw
    ) {

      return {};

    }


    if (
      typeof raw ===
      "object"
    ) {

      return raw;

    }


    return JSON.parse(
      raw
    );

  }

  catch {

    return {};

  }

}


// ============================================================
// 26. SAFE STRING
// ============================================================

function safeStr(
  value
) {

  return String(
    value ??
    ""
  )
    .trim();

}


// ============================================================
// 27. PLAIN OBJECT
// ============================================================

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


// ============================================================
// 28. UNIQUE STRINGS
// ============================================================

function uniqueStrings(
  values = []
) {

  const seen =
    new Set();


  const output =
    [];


  for (
    const value
    of values
  ) {

    const clean =
      safeStr(
        value
      );


    if (
      !clean
    ) {

      continue;

    }


    const key =
      clean
        .toLowerCase();


    if (
      seen.has(
        key
      )
    ) {

      continue;

    }


    seen.add(
      key
    );


    output.push(
      clean
    );

  }


  return output;

}


// ============================================================
// END
// TheWing.ai • PCSUnited
// EPB Performance Statement Generator
// epb-generator.mjs v2.0.0
// ============================================================
