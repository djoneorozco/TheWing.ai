// ============================================================
// PCSUNITED • THEWING.AI
// EPB PERFORMANCE STATEMENT GENERATOR
// app.js
// Version 2.1.0
// ============================================================

import {
  validateStatement as validatePerformanceStatement,
  countCharacters,
  getCharacterStatus,
  buildValidationDisplay
} from "./js/opb-validator.js";

// ============================================================
// 1. APP CONFIG
// ============================================================

const APP_VERSION = "2.1.0";
const CHARACTER_LIMIT = 350;
const MIN_SOURCE_CHARACTERS = 10;
const MAX_SOURCE_CHARACTERS = 1500;
const OPTION_COUNT = 3;
const STORAGE_KEY = "pcsunited.epb.statement-generator.v2";
const COPY_STATUS_DURATION = 2200;
const REQUEST_TIMEOUT_MS = 60000;

const PRODUCTION_API_BASE =
  "https://thewing.netlify.app";

const SECTION_CONFIG = Object.freeze({

  "duty-description": {
    id: "duty-description",
    label: "Duty Description",
    form: "AF716",
    characterLimit: CHARACTER_LIMIT
  },

  "executing-the-mission": {
    id: "executing-the-mission",
    label: "Executing the Mission",
    form: "AF716",
    characterLimit: CHARACTER_LIMIT
  },

  "leading-people": {
    id: "leading-people",
    label: "Leading People",
    form: "AF716",
    characterLimit: CHARACTER_LIMIT
  },

  "managing-resources": {
    id: "managing-resources",
    label: "Managing Resources",
    form: "AF716",
    characterLimit: CHARACTER_LIMIT
  },

  "improving-the-unit": {
    id: "improving-the-unit",
    label: "Improving the Unit",
    form: "AF716",
    characterLimit: CHARACTER_LIMIT
  }

});

const RANK_LABELS = Object.freeze({

  SrA_Below:
    "SrA & Below",

  SSgt:
    "SSgt",

  TSgt:
    "TSgt",

  MSgt:
    "MSgt",

  SMSgt:
    "SMSgt",

  CMSgt:
    "CMSgt"

});

const VARIATION_CONFIG = Object.freeze({

  strict: {
    id: "strict",
    label: "Strict",
    description:
      "Stay extremely close to the facts supplied by the member."
  },

  balanced: {
    id: "balanced",
    label: "Balanced",
    description:
      "Improve clarity, structure, and impact while preserving the source facts."
  },

  competitive: {
    id: "competitive",
    label: "Competitive",
    description:
      "Use the strongest defensible framing supported by the source accomplishment."
  }

});


// ============================================================
// 2. APP STATE
// ============================================================

const state = {

  initialized:
    false,

  generating:
    false,

  selectedIndex:
    null,

  generationCount:
    0,

  statements:
    [],

  lastRequest:
    null,

  lastResponse:
    null,

  coachingQuestions:
    []

};


const elements = {

  root:
    null,

  accomplishment:
    null,

  sourceCount:
    null,

  section:
    null,

  rank:
    null,

  variation:
    null,

  generateButton:
    null,

  status:
    null,

  sectionChip:
    null,

  rankChip:
    null,

  variationChip:
    null,

  options:
    []

};


state.statements =
  createEmptyStatements();


// ============================================================
// 3. INITIALIZATION
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);


function initializeApp() {

  cacheElements();


  if (
    !elements.root ||
    !elements.accomplishment ||
    !elements.generateButton
  ) {

    console.error(
      "[EPB Generator] Required interface elements were not found."
    );

    return;

  }


  bindEvents();

  restoreDraft();

  updateSourceCount();

  updateChips();

  renderAllOptions();


  state.initialized =
    true;


  console.info(
    `[EPB Generator] Initialized v${APP_VERSION}`
  );

}


// ============================================================
// 4. CACHE ELEMENTS
// ============================================================

function cacheElements() {

  elements.root =
    document.getElementById(
      "pcsu-epb-statement"
    );


  if (!elements.root) {

    return;

  }


  elements.accomplishment =
    elements.root.querySelector(
      "#epb-accomplishment"
    );


  elements.sourceCount =
    elements.root.querySelector(
      "#epb-source-count"
    );


  elements.section =
    elements.root.querySelector(
      "#epb-section"
    );


  elements.rank =
    elements.root.querySelector(
      "#epb-rank"
    );


  elements.variation =
    elements.root.querySelector(
      "#epb-variation"
    );


  elements.generateButton =
    elements.root.querySelector(
      "#epb-generate"
    );


  elements.status =
    elements.root.querySelector(
      "#epb-generator-status"
    );


  elements.sectionChip =
    elements.root.querySelector(
      "#epb-section-chip"
    );


  elements.rankChip =
    elements.root.querySelector(
      "#epb-rank-chip"
    );


  elements.variationChip =
    elements.root.querySelector(
      "#epb-variation-chip"
    );


  elements.options =
    Array.from(
      elements.root.querySelectorAll(
        ".epb-option"
      )
    );

}


// ============================================================
// 5. EVENT BINDING
// ============================================================

function bindEvents() {

  elements.accomplishment.addEventListener(
    "input",
    handleSourceInput
  );


  elements.accomplishment.addEventListener(
    "keydown",
    handleKeyboardShortcut
  );


  elements.section?.addEventListener(
    "change",
    handleControlChange
  );


  elements.rank?.addEventListener(
    "change",
    handleControlChange
  );


  elements.variation?.addEventListener(
    "change",
    handleControlChange
  );


  elements.generateButton.addEventListener(
    "click",
    handleGenerate
  );


  bindOptionButtons();

}


// ============================================================
// 6. OPTION BUTTON EVENTS
// ============================================================

function bindOptionButtons() {

  elements.options.forEach(
    (
      optionElement,
      index
    ) => {

      optionElement
        .querySelector(
          ".epb-copy"
        )
        ?.addEventListener(
          "click",
          () => {

            handleCopy(
              index
            );

          }
        );


      optionElement
        .querySelector(
          ".epb-favorite"
        )
        ?.addEventListener(
          "click",
          () => {

            handleSelect(
              index
            );

          }
        );

    }
  );

}


// ============================================================
// 7. SOURCE INPUT
// ============================================================

function handleSourceInput() {

  enforceSourceLength();

  updateSourceCount();

  clearStatus();

  saveDraft();

}


// ============================================================
// 8. CONTROL CHANGE
// ============================================================

function handleControlChange() {

  updateChips();

  clearStatus();

  saveDraft();

}


// ============================================================
// 9. KEYBOARD SHORTCUT
// ============================================================

function handleKeyboardShortcut(
  event
) {

  const shouldGenerate =
    (
      event.ctrlKey ||
      event.metaKey
    ) &&
    event.key ===
      "Enter";


  if (!shouldGenerate) {

    return;

  }


  event.preventDefault();

  handleGenerate();

}


// ============================================================
// 10. GENERATE
// ============================================================

async function handleGenerate() {

  if (state.generating) {

    return;

  }


  const request =
    buildGenerationRequest();


  const requestValidation =
    validateGenerationRequest(
      request
    );


  if (!requestValidation.ok) {

    showStatus(
      requestValidation.message,
      "error"
    );


    focusValidationTarget(
      requestValidation.field
    );


    return;

  }


  state.lastRequest =
    request;


  state.lastResponse =
    null;


  state.coachingQuestions =
    [];


  state.generationCount +=
    1;


  state.selectedIndex =
    null;


  clearSelection();

  setGenerating(
    true
  );

  setOptionsLoading(
    true
  );


  showStatus(
    "Generating three statement options…"
  );


  try {

    const engineResult =
      await requestStatements(
        request
      );


    state.lastResponse =
      safeObject(
        engineResult.response
      );


    state.coachingQuestions =
      extractCoachingQuestions(
        engineResult.response
      );


    if (
      !engineResult.options.length
    ) {

      if (
        isCoachFirstResponse(
          engineResult.response
        )
      ) {

        resetStatements();

        renderAllOptions();


        dispatchCoachingEvent(
          request,
          engineResult.response
        );


        const firstQuestion =
          state.coachingQuestions[
            0
          ];


        showStatus(
          firstQuestion

            ? `Amy needs one more detail: ${firstQuestion}`

            : "Amy needs a little more detail before generating a defensible statement.",

          "error"
        );


        return;

      }


      throw new Error(
        "The writing engine did not return any Performance Statements."
      );

    }


    state.statements =
      normalizeGeneratedStatements(
        engineResult.options
      );


    renderAllOptions();

    saveDraft();


    const invalid =
      state.statements.filter(
        item =>
          !item.selectable
      );


    const overLimit =
      state.statements.filter(
        item =>
          !item.withinLimit
      );


    if (
      overLimit.length >
      0
    ) {

      showStatus(
        `${overLimit.length} statement${overLimit.length === 1 ? " is" : "s are"} over the 350-character limit and require another revision.`,
        "error"
      );

    }

    else if (
      invalid.length >
      0
    ) {

      showStatus(
        `${invalid.length} option${invalid.length === 1 ? " needs" : "s need"} validation review before selection.`,
        "error"
      );

    }

    else {

      const splitNote =
        responseRecommendsSplit(
          engineResult.response
        )

          ? " TheWing also detected more than one strong accomplishment thread in the source."

          : "";


      showStatus(
        `Three validated statement options generated. Select or copy the version you prefer.${splitNote}`,
        "success"
      );

    }


    dispatchGeneratedEvent(
      request,
      engineResult.response
    );

  }

  catch (error) {

    console.error(
      "[EPB Generator] Generation failed:",
      error
    );


    resetStatements();

    renderAllOptions();


    showStatus(
      safeString(
        error?.message
      ) ||
      "Unable to generate Performance Statements.",
      "error"
    );

  }

  finally {

    setOptionsLoading(
      false
    );


    setGenerating(
      false
    );

  }

}


// ============================================================
// 11. BUILD GENERATION REQUEST
// ============================================================

function buildGenerationRequest() {

  const source =
    normalizeSource(
      elements.accomplishment?.value
    );


  const section =
    safeString(
      elements.section?.value
    );


  const rankId =
    safeString(
      elements.rank?.value
    );


  /*
   * IMPORTANT:
   *
   * The UI stores:
   *
   *   SrA_Below
   *
   * rank-tier.js expects:
   *
   *   SrA & Below
   *
   * Send the canonical rank label to TheWing.
   */
  const ratedRank =
    RANK_LABELS[
      rankId
    ] ||
    rankId;


  const variation =
    safeString(
      elements.variation?.value
    ) ||
    "balanced";


  return {

    accomplishment:
      source,

    section,

    mpa:
      section,

    ratedRank,

    rank:
      ratedRank,

    rankId,

    variation,

    characterLimit:
      CHARACTER_LIMIT,

    optionCount:
      OPTION_COUNT,

    form:
      "AF716",

    generationId:
      state.generationCount +
      1

  };

}


// ============================================================
// 12. VALIDATE GENERATION REQUEST
// ============================================================

function validateGenerationRequest(
  request
) {

  if (
    !request.accomplishment
  ) {

    return {

      ok:
        false,

      field:
        "accomplishment",

      message:
        "Enter an accomplishment before generating a statement."

    };

  }


  if (
    countCharacters(
      request.accomplishment
    ) <
    MIN_SOURCE_CHARACTERS
  ) {

    return {

      ok:
        false,

      field:
        "accomplishment",

      message:
        "Add a little more detail about what was accomplished."

    };

  }


  if (
    countCharacters(
      request.accomplishment
    ) >
    MAX_SOURCE_CHARACTERS
  ) {

    return {

      ok:
        false,

      field:
        "accomplishment",

      message:
        `Keep the source accomplishment under ${MAX_SOURCE_CHARACTERS} characters.`

    };

  }


  if (
    !request.section ||
    !SECTION_CONFIG[
      request.section
    ]
  ) {

    return {

      ok:
        false,

      field:
        "section",

      message:
        "Select the AF Form 716 section this statement is intended for."

    };

  }


  if (
    !request.rankId ||
    !RANK_LABELS[
      request.rankId
    ]
  ) {

    return {

      ok:
        false,

      field:
        "rank",

      message:
        "Select the rated rank."

    };

  }


  if (
    !VARIATION_CONFIG[
      request.variation
    ]
  ) {

    return {

      ok:
        false,

      field:
        "variation",

      message:
        "Select a writing variation."

    };

  }


  return {

    ok:
      true,

    field:
      null,

    message:
      ""

  };

}


// ============================================================
// 13. WRITING ENGINE ADAPTER
// ============================================================

async function requestStatements(
  request
) {

  /*
   * Optional host-provided adapter.
   *
   * Useful for:
   * - development
   * - future dashboard integration
   * - authenticated environments
   */
  if (
    window.TheWingEPB &&
    typeof
      window.TheWingEPB
        .generateStatements ===
      "function"
  ) {

    const response =
      await window.TheWingEPB
        .generateStatements(
          request
        );


    return {

      response,

      options:
        extractStatementsFromResponse(
          response
        )

    };

  }


  /*
   * Normal production architecture:
   *
   * Browser
   *   ↓
   * TheWing Netlify Function
   *   ↓
   * opb-universal.js
   *   ↓
   * rank-tier.js
   * impact-engine.js
   * opb-validator.js
   *   ↓
   * OpenAI
   */
  const response =
    await callEPBBackend(
      request
    );


  return {

    response,

    options:
      extractStatementsFromResponse(
        response
      )

  };

}


// ============================================================
// 14. THEWING BACKEND CALL
// ============================================================

async function callEPBBackend(
  request
) {

  const endpoints =
    getApiEndpoints();


  let lastError =
    null;


  for (
    const endpoint
    of endpoints
  ) {

    try {

      const response =
        await fetchWithTimeout(
          endpoint,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Accept:
                "application/json"

            },

            credentials:
              "omit",

            body:
              JSON.stringify({

                tool:
                  "EPB_STATEMENT_GENERATOR",

                input:
                  request,

                /*
                 * Also expose top-level fields so the function
                 * remains compatible with earlier request formats.
                 */
                ...request

              })

          },

          REQUEST_TIMEOUT_MS
        );


      const payload =
        await parseResponseBody(
          response
        );


      if (
        response.ok
      ) {

        if (
          payload?.ok ===
          false
        ) {

          throw new Error(

            payload?.error ||

            payload?.message ||

            "TheWing rejected the generation request."

          );

        }


        return payload;

      }


      const message =

        payload?.error ||

        payload?.message ||

        `EPB endpoint returned HTTP ${response.status}.`;


      /*
       * Try the next known route only when the route itself
       * appears unavailable.
       */
      const endpointMissing =
        [
          404,
          405,
          501
        ].includes(
          response.status
        );


      if (
        endpointMissing
      ) {

        lastError =
          new Error(
            `${message} (${endpoint})`
          );


        continue;

      }


      throw new Error(
        message
      );

    }

    catch (error) {

      lastError =
        error;


      if (
        error?.name ===
        "AbortError"
      ) {

        throw new Error(
          "TheWing timed out while generating the statements."
        );

      }


      /*
       * A network failure may be endpoint-specific.
       * Try the next known route.
       */
      if (
        error instanceof
        TypeError
      ) {

        continue;

      }


      /*
       * Other backend errors should normally be surfaced
       * instead of silently retrying every route.
       */
      if (
        !String(
          error?.message ||
          ""
        ).includes(
          "HTTP 404"
        )
      ) {

        throw error;

      }

    }

  }


  throw (
    lastError ||
    new Error(
      "Unable to reach the TheWing EPB generator endpoint."
    )
  );

}


// ============================================================
// 15. API ENDPOINTS
// ============================================================

function getApiEndpoints() {

  const configuredEndpoint =

    safeString(
      window.PCSUnitedEPBConfig
        ?.endpoint
    ) ||

    safeString(
      window.TheWingEPBConfig
        ?.endpoint
    );


  const configuredBase =

    safeString(
      window.PCSUnitedEPBConfig
        ?.apiBase
    ) ||

    safeString(
      window.TheWingEPBConfig
        ?.apiBase
    );


  const candidates =
    [];


  if (
    configuredEndpoint
  ) {

    candidates.push(
      configuredEndpoint
    );

  }


  if (
    configuredBase
  ) {

    candidates.push(
      joinUrl(
        configuredBase,
        "/api/epb-generator"
      )
    );


    candidates.push(
      joinUrl(
        configuredBase,
        "/.netlify/functions/epb-generator"
      )
    );

  }


  /*
   * Same-origin routes.
   *
   * These are fastest when the generator itself is hosted
   * on thewing.netlify.app.
   */
  candidates.push(
    "/api/epb-generator"
  );


  candidates.push(
    "/.netlify/functions/epb-generator"
  );


  /*
   * Absolute production fallbacks.
   *
   * Required when the EPB workspace is embedded on
   * Webflow or another origin.
   */
  candidates.push(
    `${PRODUCTION_API_BASE}/api/epb-generator`
  );


  candidates.push(
    `${PRODUCTION_API_BASE}/.netlify/functions/epb-generator`
  );


  return uniqueStrings(
    candidates
  );

}


// ============================================================
// 16. FETCH WITH TIMEOUT
// ============================================================

async function fetchWithTimeout(
  url,
  options,
  timeoutMs
) {

  const controller =
    new AbortController();


  const timer =
    window.setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );


  try {

    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );

  }

  finally {

    window.clearTimeout(
      timer
    );

  }

}


// ============================================================
// 17. PARSE BACKEND RESPONSE
// ============================================================

async function parseResponseBody(
  response
) {

  const text =
    await response.text();


  if (!text) {

    return {};

  }


  try {

    return JSON.parse(
      text
    );

  }

  catch {

    /*
     * Allow a temporary backend to return a single raw
     * statement string during development.
     */
    if (
      response.ok
    ) {

      return {

        statement:
          normalizeStatement(
            text
          )

      };

    }


    return {

      error:
        text

    };

  }

}


// ============================================================
// 18. URL HELPER
// ============================================================

function joinUrl(
  base,
  path
) {

  return (
    `${safeString(base).replace(/\/+$/, "")}/` +
    `${safeString(path).replace(/^\/+/, "")}`
  );

}


// ============================================================
// 19. EXTRACT STATEMENTS FROM BACKEND RESPONSE
// ============================================================

function extractStatementsFromResponse(
  response
) {

  if (!response) {

    return [];

  }


  if (
    Array.isArray(
      response
    )
  ) {

    return response;

  }


  if (
    Array.isArray(
      response.options
    )
  ) {

    return response.options;

  }


  if (
    Array.isArray(
      response.statements
    )
  ) {

    return response.statements;

  }


  if (
    Array.isArray(
      response.result
        ?.options
    )
  ) {

    return response.result
      .options;

  }


  if (
    Array.isArray(
      response.result
        ?.statements
    )
  ) {

    return response.result
      .statements;

  }


  if (
    Array.isArray(
      response.data
        ?.options
    )
  ) {

    return response.data
      .options;

  }


  if (
    Array.isArray(
      response.data
        ?.statements
    )
  ) {

    return response.data
      .statements;

  }


  if (
    typeof response.statement ===
    "string"
  ) {

    return [
      {
        statement:
          response.statement
      }
    ];

  }


  if (
    typeof
      response.result
        ?.statement ===
    "string"
  ) {

    return [
      {
        statement:
          response.result
            .statement
      }
    ];

  }


  return [];

}


// ============================================================
// 20. EXTRACT COACHING QUESTIONS
// ============================================================

function extractCoachingQuestions(
  response
) {

  return uniqueStrings([

    ...safeArray(
      response
        ?.coachingQuestions
    ),

    ...safeArray(
      response
        ?.preview
        ?.coachingQuestions
    ),

    ...safeArray(
      response
        ?.result
        ?.coachingQuestions
    ),

    ...safeArray(
      response
        ?.data
        ?.coachingQuestions
    )

  ]);

}


// ============================================================
// 21. COACH-FIRST RESPONSE
// ============================================================

function isCoachFirstResponse(
  response
) {

  const status =
    safeString(

      response?.status ||

      response
        ?.result
        ?.status ||

      response
        ?.data
        ?.status

    ).toUpperCase();


  return (
    status ===
    "COACH_FIRST"
  );

}


// ============================================================
// 22. SPLIT RECOMMENDATION
// ============================================================

function responseRecommendsSplit(
  response
) {

  return Boolean(

    response
      ?.recommendSplit ||

    response
      ?.result
      ?.recommendSplit ||

    response
      ?.data
      ?.recommendSplit ||

    response
      ?.preview
      ?.recommendSplit ||

    response
      ?.result
      ?.preview
      ?.recommendSplit ||

    response
      ?.data
      ?.preview
      ?.recommendSplit

  );

}


// ============================================================
// 23. NORMALIZE GENERATED OPTIONS
// ============================================================

function normalizeGeneratedStatements(
  generated
) {

  const normalized =
    [];


  for (
    let index = 0;
    index < OPTION_COUNT;
    index += 1
  ) {

    const sourceItem =
      generated[
        index
      ];


    const statement =

      typeof sourceItem ===
        "string"

        ? normalizeStatement(
            sourceItem
          )

        : normalizeStatement(
            sourceItem
              ?.statement
          );


    normalized.push(

      createStatementRecord({

        index,

        statement,

        metadata: {

          ...safeObject(
            sourceItem
              ?.metadata
          ),

          strategy:
            sourceItem
              ?.strategy ||
            null,

          strategyLabel:
            sourceItem
              ?.strategyLabel ||
            null,

          engineOptionId:
            sourceItem
              ?.id ||
            null

        },

        analysis: {

          ...safeObject(
            sourceItem
              ?.analysis
          ),

          audit:
            safeObject(
              sourceItem
                ?.audit
            ),

          engineValid:
            typeof
              sourceItem
                ?.valid ===
            "boolean"

              ? sourceItem
                  .valid

              : null

        }

      })

    );

  }


  return normalized;

}


// ============================================================
// 24. CREATE STATEMENT RECORD
// ============================================================

function createStatementRecord({
  index = 0,
  statement = "",
  metadata = {},
  analysis = {}
} = {}) {

  const text =
    normalizeStatement(
      statement
    );


  const characterCount =
    countCharacters(
      text
    );


  /*
   * Browser-side deterministic validation.
   *
   * The backend should already validate the statement.
   * This is a second defensive gate before the user can
   * select or copy it.
   */
  const validation =
    validatePerformanceStatement({

      statement:
        text,

      accomplishment:
        state.lastRequest
          ?.accomplishment ||
        "",

      section:
        state.lastRequest
          ?.section ||
        "executing-the-mission",

      ratedRank:
        state.lastRequest
          ?.ratedRank ||
        "",

      variation:
        state.lastRequest
          ?.variation ||
        "balanced",

      characterLimit:
        CHARACTER_LIMIT,

      evidence:
        getResponseEvidence(),

      rankAnalysis:
        getResponseRankAnalysis(),

      impactAnalysis:
        getResponseImpactAnalysis(),

      allowedAcronyms:
        safeArray(
          state.lastResponse
            ?.allowedAcronyms
        )

    });


  const engineValid =

    typeof
      analysis
        ?.engineValid ===
    "boolean"

      ? analysis
          .engineValid

      : true;


  const withinLimit =
    characterCount <=
    CHARACTER_LIMIT;


  const selectable =
    Boolean(

      text &&

      withinLimit &&

      validation.valid &&

      engineValid

    );


  return {

    id:
      createStatementId(
        index
      ),

    option:
      index + 1,

    statement:
      text,

    characterCount,

    characterLimit:
      CHARACTER_LIMIT,

    characterStatus:
      getCharacterStatus(
        characterCount,
        CHARACTER_LIMIT
      ),

    charactersRemaining:
      CHARACTER_LIMIT -
      characterCount,

    withinLimit,

    selectable,

    validation,

    validationDisplay:
      buildValidationDisplay(
        validation
      ),

    metadata:
      safeObject(
        metadata
      ),

    analysis:
      safeObject(
        analysis
      )

  };

}


// ============================================================
// 25. RESPONSE EVIDENCE
// ============================================================

function getResponseEvidence() {

  return safeObject(

    state.lastResponse
      ?.evidence ||

    state.lastResponse
      ?.result
      ?.evidence ||

    state.lastResponse
      ?.data
      ?.evidence

  );

}


// ============================================================
// 26. RESPONSE RANK ANALYSIS
// ============================================================

function getResponseRankAnalysis() {

  return (

    state.lastResponse
      ?.preview
      ?.rankAnalysis ||

    state.lastResponse
      ?.result
      ?.preview
      ?.rankAnalysis ||

    state.lastResponse
      ?.data
      ?.preview
      ?.rankAnalysis ||

    null

  );

}


// ============================================================
// 27. RESPONSE IMPACT ANALYSIS
// ============================================================

function getResponseImpactAnalysis() {

  return (

    state.lastResponse
      ?.preview
      ?.impactAnalysis ||

    state.lastResponse
      ?.result
      ?.preview
      ?.impactAnalysis ||

    state.lastResponse
      ?.data
      ?.preview
      ?.impactAnalysis ||

    null

  );

}


// ============================================================
// 28. RENDER ALL OPTIONS
// ============================================================

function renderAllOptions() {

  for (
    let index = 0;
    index < OPTION_COUNT;
    index += 1
  ) {

    renderOption(
      index
    );

  }


  renderSelection();

}


// ============================================================
// 29. RENDER ONE OPTION
// ============================================================

function renderOption(
  index
) {

  const optionElement =
    elements.options[
      index
    ];


  if (!optionElement) {

    return;

  }


  const record =

    state.statements[
      index
    ] ||

    createStatementRecord({
      index
    });


  const textElement =
    optionElement.querySelector(
      ".epb-option-text"
    );


  if (
    textElement
  ) {

    if (
      record.statement
    ) {

      textElement.textContent =
        record.statement;


      textElement.classList.remove(
        "epb-empty"
      );

    }

    else {

      textElement.textContent =
        getEmptyOptionText(
          index
        );


      textElement.classList.add(
        "epb-empty"
      );

    }

  }


  /*
   * Optional CSS hook.
   *
   * If desired later:
   *
   * .epb-option.has-validation-error { ... }
   */
  optionElement.classList.toggle(
    "has-validation-error",
    Boolean(
      record.statement &&
      !record.selectable
    )
  );


  optionElement.dataset.valid =
    record.selectable
      ? "true"
      : "false";


  const copyButton =
    optionElement.querySelector(
      ".epb-copy"
    );


  const favoriteButton =
    optionElement.querySelector(
      ".epb-favorite"
    );


  if (
    copyButton
  ) {

    copyButton.disabled =
      Boolean(
        record.statement &&
        !record.selectable
      );


    copyButton.setAttribute(
      "aria-disabled",
      copyButton.disabled
        ? "true"
        : "false"
    );

  }


  if (
    favoriteButton
  ) {

    favoriteButton.disabled =
      Boolean(
        record.statement &&
        !record.selectable
      );


    favoriteButton.setAttribute(
      "aria-disabled",
      favoriteButton.disabled
        ? "true"
        : "false"
    );

  }


  updateCharacterDisplay(
    optionElement,
    record.statement
  );

}


// ============================================================
// 30. EMPTY OPTION TEXT
// ============================================================

function getEmptyOptionText(
  index
) {

  const labels = [

    "Your first generated statement will appear here.",

    "Your second generated statement will appear here.",

    "Your third generated statement will appear here."

  ];


  return (
    labels[
      index
    ] ||
    "Generated statement will appear here."
  );

}


// ============================================================
// 31. CHARACTER DISPLAY
// ============================================================

function updateCharacterDisplay(
  optionElement,
  statement
) {

  const text =
    safeString(
      statement
    );


  const count =
    countCharacters(
      text
    );


  const countElement =
    optionElement.querySelector(
      ".epb-char-count"
    );


  const fillElement =
    optionElement.querySelector(
      ".epb-char-fill"
    );


  if (
    !countElement
  ) {

    return;

  }


  const percentage =
    Math.min(
      100,
      (
        count /
        CHARACTER_LIMIT
      ) *
      100
    );


  countElement.classList.remove(
    "near",
    "max",
    "over"
  );


  if (
    count >
    CHARACTER_LIMIT
  ) {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT} • ${count - CHARACTER_LIMIT} over`;


    countElement.classList.add(
      "over"
    );


    if (
      fillElement
    ) {

      fillElement.style.background =
        "var(--epb-red)";

    }

  }

  else if (
    count >=
    336
  ) {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    countElement.classList.add(
      "max"
    );


    if (
      fillElement
    ) {

      fillElement.style.background =
        "var(--epb-gold-soft)";

    }

  }

  else if (
    count >=
    301
  ) {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    countElement.classList.add(
      "near"
    );


    if (
      fillElement
    ) {

      fillElement.style.background =
        "var(--epb-amber)";

    }

  }

  else {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    if (
      fillElement
    ) {

      fillElement.style.background =
        "var(--epb-green)";

    }

  }


  if (
    fillElement
  ) {

    fillElement.style.width =
      `${percentage}%`;

  }

}


// ============================================================
// 32. SELECT STATEMENT
// ============================================================

function handleSelect(
  index
) {

  const record =
    state.statements[
      index
    ];


  if (
    !record?.statement
  ) {

    showStatus(
      "Generate statements before selecting one.",
      "error"
    );


    return;

  }


  /*
   * Do not allow a statement with hard deterministic
   * validation errors to move into the future AF716 workspace.
   */
  if (
    !record.selectable
  ) {

    showStatus(
      getPrimaryValidationMessage(
        record
      ),
      "error"
    );


    return;

  }


  if (
    state.selectedIndex ===
    index
  ) {

    state.selectedIndex =
      null;


    renderSelection();

    saveDraft();


    showStatus(
      "Statement selection cleared."
    );


    return;

  }


  state.selectedIndex =
    index;


  renderSelection();

  saveDraft();


  const selected =
    buildSelectedStatementObject();


  dispatchSelectedEvent(
    selected
  );


  showStatus(
    `Option ${index + 1} selected.`,
    "success"
  );

}


// ============================================================
// 33. RENDER SELECTION
// ============================================================

function renderSelection() {

  elements.options.forEach(
    (
      optionElement,
      index
    ) => {

      const favoriteButton =
        optionElement.querySelector(
          ".epb-favorite"
        );


      const isSelected =
        state.selectedIndex ===
        index;


      optionElement.classList.toggle(
        "is-selected",
        isSelected
      );


      if (
        favoriteButton
      ) {

        favoriteButton.classList.toggle(
          "selected",
          isSelected
        );


        favoriteButton.textContent =
          isSelected
            ? "★"
            : "☆";


        favoriteButton.setAttribute(
          "aria-pressed",
          isSelected
            ? "true"
            : "false"
        );

      }

    }
  );

}


// ============================================================
// 34. CLEAR SELECTION
// ============================================================

function clearSelection() {

  state.selectedIndex =
    null;


  renderSelection();

}


// ============================================================
// 35. COPY STATEMENT
// ============================================================

async function handleCopy(
  index
) {

  const record =
    state.statements[
      index
    ];


  const text =
    safeString(
      record?.statement
    );


  if (!text) {

    showStatus(
      "Generate a statement before copying it.",
      "error"
    );


    return;

  }


  if (
    !record.selectable
  ) {

    showStatus(
      getPrimaryValidationMessage(
        record
      ),
      "error"
    );


    return;

  }


  try {

    await copyText(
      text
    );


    showStatus(
      `Option ${index + 1} copied.`,
      "success"
    );


    window.setTimeout(
      () => {

        if (
          elements.status
            ?.textContent ===
          `Option ${index + 1} copied.`
        ) {

          clearStatus();

        }

      },

      COPY_STATUS_DURATION
    );

  }

  catch (error) {

    console.error(
      "[EPB Generator] Copy failed:",
      error
    );


    showStatus(
      "Unable to copy automatically. Select the statement text manually.",
      "error"
    );

  }

}


// ============================================================
// 36. PRIMARY VALIDATION MESSAGE
// ============================================================

function getPrimaryValidationMessage(
  record
) {

  const firstError =
    record?.validation
      ?.errors?.[
        0
      ];


  return (

    firstError
      ?.message ||

    (
      !record
        ?.withinLimit

        ? `Statement exceeds the ${CHARACTER_LIMIT}-character limit.`

        : "This option needs validation repair before it can be selected or copied."
    )

  );

}


// ============================================================
// 37. COPY UTILITY
// ============================================================

async function copyText(
  text
) {

  if (
    navigator.clipboard &&
    typeof
      navigator.clipboard.writeText ===
      "function"
  ) {

    await navigator.clipboard.writeText(
      text
    );


    return;

  }


  const textarea =
    document.createElement(
      "textarea"
    );


  textarea.value =
    text;


  textarea.setAttribute(
    "readonly",
    ""
  );


  textarea.style.position =
    "fixed";


  textarea.style.opacity =
    "0";


  document.body.appendChild(
    textarea
  );


  textarea.select();


  const copied =
    document.execCommand(
      "copy"
    );


  document.body.removeChild(
    textarea
  );


  if (!copied) {

    throw new Error(
      "Browser copy command failed."
    );

  }

}


// ============================================================
// 38. SOURCE CHARACTER COUNT
// ============================================================

function updateSourceCount() {

  if (
    !elements.accomplishment ||
    !elements.sourceCount
  ) {

    return;

  }


  const count =
    countCharacters(
      elements.accomplishment
        .value
    );


  elements.sourceCount.textContent =
    `${count} / ${MAX_SOURCE_CHARACTERS}`;

}


// ============================================================
// 39. SOURCE LENGTH PROTECTION
// ============================================================

function enforceSourceLength() {

  if (
    !elements.accomplishment
  ) {

    return;

  }


  const characters =
    Array.from(
      elements.accomplishment
        .value
    );


  if (
    characters.length <=
    MAX_SOURCE_CHARACTERS
  ) {

    return;

  }


  elements.accomplishment.value =
    characters
      .slice(
        0,
        MAX_SOURCE_CHARACTERS
      )
      .join("");

}


// ============================================================
// 40. RESULT META CHIPS
// ============================================================

function updateChips() {

  const selectedSection =
    safeString(
      elements.section?.value
    );


  const selectedRank =
    safeString(
      elements.rank?.value
    );


  const selectedVariation =
    safeString(
      elements.variation?.value
    ) ||
    "balanced";


  if (
    elements.sectionChip
  ) {

    elements.sectionChip.textContent =
      SECTION_CONFIG[
        selectedSection
      ]?.label ||
      "Select Section";

  }


  if (
    elements.rankChip
  ) {

    elements.rankChip.textContent =
      RANK_LABELS[
        selectedRank
      ] ||
      "Rank";

  }


  if (
    elements.variationChip
  ) {

    elements.variationChip.textContent =
      VARIATION_CONFIG[
        selectedVariation
      ]?.label ||
      "Balanced";

  }

}


// ============================================================
// 41. GENERATING STATE
// ============================================================

function setGenerating(
  generating
) {

  state.generating =
    Boolean(
      generating
    );


  if (
    !elements.generateButton
  ) {

    return;

  }


  elements.generateButton.disabled =
    state.generating;


  elements.generateButton.innerHTML =
    state.generating

      ? `
          <span aria-hidden="true">✣</span>
          Generating…
        `

      : `
          <span aria-hidden="true">✣</span>
          Generate Statements
        `;

}


// ============================================================
// 42. OPTION LOADING STATE
// ============================================================

function setOptionsLoading(
  loading
) {

  elements.options.forEach(
    optionElement => {

      optionElement.classList.toggle(
        "is-loading",
        Boolean(
          loading
        )
      );

    }
  );

}


// ============================================================
// 43. STATUS MESSAGE
// ============================================================

function showStatus(
  message,
  type = ""
) {

  if (
    !elements.status
  ) {

    return;

  }


  elements.status.className =
    "epb-status";


  if (
    type ===
      "success" ||
    type ===
      "error"
  ) {

    elements.status.classList.add(
      type
    );

  }


  elements.status.textContent =
    safeString(
      message
    );

}


// ============================================================
// 44. CLEAR STATUS
// ============================================================

function clearStatus() {

  if (
    !elements.status
  ) {

    return;

  }


  elements.status.className =
    "epb-status";


  elements.status.textContent =
    "";

}


// ============================================================
// 45. FOCUS INVALID FIELD
// ============================================================

function focusValidationTarget(
  field
) {

  const targets = {

    accomplishment:
      elements.accomplishment,

    section:
      elements.section,

    rank:
      elements.rank,

    variation:
      elements.variation

  };


  const target =
    targets[
      field
    ];


  if (
    target &&
    typeof
      target.focus ===
      "function"
  ) {

    target.focus();

  }

}


// ============================================================
// 46. RESET STATEMENTS
// ============================================================

function resetStatements() {

  state.statements =
    createEmptyStatements();


  state.selectedIndex =
    null;

}


// ============================================================
// 47. CREATE EMPTY STATEMENTS
// ============================================================

function createEmptyStatements() {

  return Array.from(
    {
      length:
        OPTION_COUNT
    },
    (
      _,
      index
    ) =>
      createStatementRecord({

        index,

        statement:
          ""

      })
  );

}


// ============================================================
// 48. CREATE STATEMENT ID
// ============================================================

function createStatementId(
  index
) {

  const timestamp =
    Date.now()
      .toString(
        36
      );


  const random =
    Math.random()
      .toString(
        36
      )
      .slice(
        2,
        8
      );


  return (
    `stmt_${timestamp}_${index + 1}_${random}`
  );

}


// ============================================================
// 49. BUILD SELECTED STATEMENT OBJECT
// ============================================================

function buildSelectedStatementObject() {

  if (
    state.selectedIndex ===
    null
  ) {

    return null;

  }


  const record =
    state.statements[
      state.selectedIndex
    ];


  if (
    !record?.statement ||
    !record.selectable
  ) {

    return null;

  }


  const sectionId =
    safeString(
      elements.section?.value
    );


  const rankId =
    safeString(
      elements.rank?.value
    );


  const ratedRank =
    RANK_LABELS[
      rankId
    ] ||
    rankId;


  const variation =
    safeString(
      elements.variation?.value
    );


  return {

    id:
      record.id,

    form:
      "AF716",

    formVersion:
      "716",

    section:
      sectionId,

    sectionLabel:
      SECTION_CONFIG[
        sectionId
      ]?.label ||
      sectionId,

    ratedRank,

    ratedRankId:
      rankId,

    ratedRankLabel:
      ratedRank,

    variation,

    variationLabel:
      VARIATION_CONFIG[
        variation
      ]?.label ||
      variation,

    source:
      normalizeSource(
        elements.accomplishment
          ?.value
      ),

    statement:
      record.statement,

    characterCount:
      record.characterCount,

    characterLimit:
      CHARACTER_LIMIT,

    characterStatus:
      record.characterStatus,

    charactersRemaining:
      record.charactersRemaining,

    withinLimit:
      record.withinLimit,

    option:
      record.option,

    strategy:
      record.metadata
        ?.strategy ||
      null,

    strategyLabel:
      record.metadata
        ?.strategyLabel ||
      null,

    validation:
      record.validation,

    analysis:
      record.analysis,

    metadata:
      record.metadata,

    status:
      "draft"

  };

}


// ============================================================
// 50. DISPATCH GENERATED EVENT
// ============================================================

function dispatchGeneratedEvent(
  request,
  response = null
) {

  window.dispatchEvent(

    new CustomEvent(
      "pcsunited:epb-statements-generated",
      {

        detail: {

          request,

          response,

          statements:
            state.statements.map(
              item => ({
                ...item
              })
            )

        }

      }
    )

  );

}


// ============================================================
// 51. DISPATCH SELECTED EVENT
// ============================================================

function dispatchSelectedEvent(
  statement
) {

  if (!statement) {

    return;

  }


  window.dispatchEvent(

    new CustomEvent(
      "pcsunited:epb-statement-selected",
      {

        detail:
          statement

      }
    )

  );

}


// ============================================================
// 52. DISPATCH COACHING EVENT
// ============================================================

function dispatchCoachingEvent(
  request,
  response
) {

  window.dispatchEvent(

    new CustomEvent(
      "pcsunited:epb-coaching-required",
      {

        detail: {

          request,

          response,

          questions: [
            ...state.coachingQuestions
          ],

          recommendSplit:
            responseRecommendsSplit(
              response
            )

        }

      }
    )

  );

}


// ============================================================
// 53. SAVE DRAFT
// ============================================================

function saveDraft() {

  try {

    const draft = {

      version:
        APP_VERSION,

      source:
        elements.accomplishment
          ?.value ||
        "",

      section:
        elements.section
          ?.value ||
        "",

      rank:
        elements.rank
          ?.value ||
        "",

      variation:
        elements.variation
          ?.value ||
        "balanced",

      statements:
        state.statements.map(
          item => ({

            statement:
              item.statement,

            metadata:
              item.metadata,

            analysis:
              item.analysis

          })
        ),

      selectedIndex:
        state.selectedIndex,

      coachingQuestions: [
        ...state.coachingQuestions
      ],

      /*
       * Preserve only the deterministic context needed to
       * revalidate a saved statement after page refresh.
       */
      engineContext:
        state.lastResponse

          ? {

              evidence:
                getResponseEvidence(),

              preview: {

                rankAnalysis:
                  getResponseRankAnalysis(),

                impactAnalysis:
                  getResponseImpactAnalysis()

              },

              recommendSplit:
                responseRecommendsSplit(
                  state.lastResponse
                )

            }

          : null,

      savedAt:
        new Date()
          .toISOString()

    };


    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        draft
      )
    );

  }

  catch (error) {

    console.warn(
      "[EPB Generator] Unable to save draft:",
      error
    );

  }

}


// ============================================================
// 54. RESTORE DRAFT
// ============================================================

function restoreDraft() {

  try {

    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!raw) {

      return;

    }


    const draft =
      JSON.parse(
        raw
      );


    if (
      !draft ||
      typeof draft !==
      "object"
    ) {

      return;

    }


    if (
      elements.accomplishment &&
      typeof draft.source ===
        "string"
    ) {

      elements.accomplishment.value =
        Array.from(
          draft.source
        )
          .slice(
            0,
            MAX_SOURCE_CHARACTERS
          )
          .join("");

    }


    if (
      elements.section &&
      SECTION_CONFIG[
        draft.section
      ]
    ) {

      elements.section.value =
        draft.section;

    }


    if (
      elements.rank &&
      RANK_LABELS[
        draft.rank
      ]
    ) {

      elements.rank.value =
        draft.rank;

    }


    if (
      elements.variation &&
      VARIATION_CONFIG[
        draft.variation
      ]
    ) {

      elements.variation.value =
        draft.variation;

    }


    /*
     * Restore request context BEFORE rebuilding the statement
     * records so deterministic validation has the original source.
     */
    state.lastRequest = {

      accomplishment:
        normalizeSource(
          draft.source ||
          ""
        ),

      section:
        draft.section ||
        "",

      mpa:
        draft.section ||
        "",

      rankId:
        draft.rank ||
        "",

      ratedRank:
        RANK_LABELS[
          draft.rank
        ] ||
        draft.rank ||
        "",

      rank:
        RANK_LABELS[
          draft.rank
        ] ||
        draft.rank ||
        "",

      variation:
        draft.variation ||
        "balanced",

      characterLimit:
        CHARACTER_LIMIT,

      optionCount:
        OPTION_COUNT,

      form:
        "AF716"

    };


    state.lastResponse =
      safeObject(
        draft.engineContext
      );


    state.coachingQuestions =
      safeArray(
        draft.coachingQuestions
      );


    if (
      Array.isArray(
        draft.statements
      )
    ) {

      state.statements =
        Array.from(
          {
            length:
              OPTION_COUNT
          },
          (
            _,
            index
          ) => {

            const saved =
              draft.statements[
                index
              ];


            return createStatementRecord({

              index,

              statement:
                saved?.statement ||
                "",

              metadata:
                saved?.metadata ||
                {},

              analysis:
                saved?.analysis ||
                {}

            });

          }
        );

    }


    if (
      Number.isInteger(
        draft.selectedIndex
      ) &&
      draft.selectedIndex >=
        0 &&
      draft.selectedIndex <
        OPTION_COUNT &&
      state.statements[
        draft.selectedIndex
      ]?.statement &&
      state.statements[
        draft.selectedIndex
      ]?.selectable
    ) {

      state.selectedIndex =
        draft.selectedIndex;

    }

  }

  catch (error) {

    console.warn(
      "[EPB Generator] Unable to restore draft:",
      error
    );

  }

}


// ============================================================
// 55. CLEAR SAVED DRAFT
// ============================================================

function clearSavedDraft() {

  try {

    localStorage.removeItem(
      STORAGE_KEY
    );

  }

  catch (error) {

    console.warn(
      "[EPB Generator] Unable to clear saved draft:",
      error
    );

  }

}


// ============================================================
// 56. NORMALIZE SOURCE
// ============================================================

function normalizeSource(
  value
) {

  return safeString(
    value
  )
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();

}


// ============================================================
// 57. NORMALIZE STATEMENT
// ============================================================

function normalizeStatement(
  value
) {

  return safeString(
    value
  )
    /*
     * Remove a stray model bullet symbol.
     * Do NOT truncate content.
     */
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
// 58. SAFE STRING
// ============================================================

function safeString(
  value
) {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {

    return "";

  }


  return String(
    value
  );

}


// ============================================================
// 59. SAFE OBJECT
// ============================================================

function safeObject(
  value
) {

  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  ) {

    return value;

  }


  return {};

}


// ============================================================
// 60. SAFE ARRAY
// ============================================================

function safeArray(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value;

  }


  if (
    value ===
      null ||
    value ===
      undefined
  ) {

    return [];

  }


  return [
    value
  ];

}


// ============================================================
// 61. UNIQUE STRINGS
// ============================================================

function uniqueStrings(
  values = []
) {

  return [

    ...new Set(

      values
        .map(
          value =>
            safeString(
              value
            ).trim()
        )
        .filter(
          Boolean
        )

    )

  ];

}


// ============================================================
// 62. PUBLIC API
// ============================================================

window.PCSUnitedEPBStatement =
  Object.freeze({

    version:
      APP_VERSION,


    characterLimit:
      CHARACTER_LIMIT,


    getState() {

      return {

        source:
          normalizeSource(
            elements.accomplishment
              ?.value
          ),

        section:
          elements.section
            ?.value ||
          "",

        rankId:
          elements.rank
            ?.value ||
          "",

        ratedRank:
          RANK_LABELS[
            elements.rank
              ?.value
          ] ||
          elements.rank
            ?.value ||
          "",

        variation:
          elements.variation
            ?.value ||
          "balanced",

        statements:
          state.statements.map(
            item => ({
              ...item
            })
          ),

        selectedIndex:
          state.selectedIndex,

        generating:
          state.generating,

        coachingQuestions: [
          ...state.coachingQuestions
        ],

        lastResponse:
          state.lastResponse

      };

    },


    getSelectedStatement() {

      return (
        buildSelectedStatementObject()
      );

    },


    getStatements() {

      return (
        state.statements.map(
          item => ({
            ...item
          })
        )
      );

    },


    getCoachingQuestions() {

      return [
        ...state.coachingQuestions
      ];

    },


    async generate() {

      await handleGenerate();


      return (
        state.statements.map(
          item => ({
            ...item
          })
        )
      );

    },


    select(
      index
    ) {

      const normalizedIndex =
        Number(
          index
        );


      if (
        !Number.isInteger(
          normalizedIndex
        ) ||
        normalizedIndex <
          0 ||
        normalizedIndex >=
          OPTION_COUNT
      ) {

        return false;

      }


      handleSelect(
        normalizedIndex
      );


      return (
        state.selectedIndex ===
        normalizedIndex
      );

    },


    clear() {

      if (
        elements.accomplishment
      ) {

        elements.accomplishment.value =
          "";

      }


      if (
        elements.section
      ) {

        elements.section.value =
          "";

      }


      if (
        elements.rank
      ) {

        elements.rank.value =
          "";

      }


      if (
        elements.variation
      ) {

        elements.variation.value =
          "balanced";

      }


      state.lastRequest =
        null;


      state.lastResponse =
        null;


      state.coachingQuestions =
        [];


      resetStatements();

      clearSavedDraft();

      updateSourceCount();

      updateChips();

      renderAllOptions();

      clearStatus();


      return true;

    }

  });


// ============================================================
// END
// PCSUNITED • THEWING.AI
// EPB PERFORMANCE STATEMENT GENERATOR
// app.js v2.1.0
// ============================================================
