// ============================================================
// THEWING.AI • UNIVERSAL OPB GENERATOR
// app.js
// v1.0.0
//
// PURPOSE
// ------------------------------------------------------------
// Front-end controller for the Universal OPB Generator.
//
// RESPONSIBILITIES
// - Read accomplishment input
// - Track character count
// - Read selected MPA
// - Call Universal OPB writing engine
// - Call OPB validator
// - Render Performance Statement
// - Render Action / Scope / Result / Impact analysis
// - Render validation results
// - Copy statement
// - Regenerate statement
// - Reset generator
//
// DOES NOT
// - Write Performance Statements itself
// - Invent facts
// - Contain Air Force writing policy
// - Determine official evaluation ratings
//
// WRITING ENGINE:
// ./js/opb-universal.js
//
// VALIDATOR:
// ./js/opb-validator.js
//
// GUIDANCE:
// ./data/opb-guidance.js
// ============================================================


// ============================================================
// 1. IMPORTS
// ============================================================

import {
  generateOPBStatement
} from "./js/opb-universal.js";


import {
  validateOPBStatement
} from "./js/opb-validator.js";


import {
  MPA_LABELS
} from "./data/opb-guidance.js";


// ============================================================
// 2. APP CONFIG
// ============================================================

const APP_VERSION =
  "1.0.0";


const MAX_INPUT_CHARACTERS =
  2000;


const MIN_INPUT_CHARACTERS =
  10;


const STORAGE_KEY =
  "thewing.opb-generator.draft.v1";


const COPY_SUCCESS_DURATION =
  2200;


const GENERATION_DELAY =
  180;


// ============================================================
// 3. APP STATE
// ============================================================

const state = {

  initialized:
    false,

  generating:
    false,

  generationCount:
    0,

  lastInput:
    "",

  lastMPA:
    "auto",

  lastResult:
    null,

  lastValidation:
    null

};


// ============================================================
// 4. DOM REFERENCES
// ============================================================

const elements = {

  app:
    null,

  form:
    null,

  accomplishmentInput:
    null,

  characterCount:
    null,

  mpaOptions:
    null,

  generateButton:
    null,

  formMessage:
    null,

  results:
    null,

  resultStatus:
    null,

  resultMPA:
    null,

  resultCharacterCount:
    null,

  resultStatement:
    null,

  analysisAction:
    null,

  analysisScope:
    null,

  analysisResult:
    null,

  analysisImpact:
    null,

  validationList:
    null,

  copyButton:
    null,

  regenerateButton:
    null,

  resetButton:
    null,

  copyStatus:
    null

};


// ============================================================
// 5. INITIALIZATION
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);


function initializeApp() {

  cacheElements();

  if (
    !elements.form ||
    !elements.accomplishmentInput
  ) {

    console.error(
      "[OPB Generator] Required DOM elements were not found."
    );

    return;

  }


  bindEvents();

  restoreDraft();

  updateCharacterCount();

  state.initialized =
    true;


  console.info(
    `[OPB Generator] Initialized v${APP_VERSION}`
  );

}


// ============================================================
// 6. CACHE DOM
// ============================================================

function cacheElements() {

  elements.app =
    document.getElementById(
      "opb-app"
    );


  elements.form =
    document.getElementById(
      "opb-form"
    );


  elements.accomplishmentInput =
    document.getElementById(
      "accomplishment-input"
    );


  elements.characterCount =
    document.getElementById(
      "opb-character-count"
    );


  elements.mpaOptions =
    document.getElementById(
      "opb-mpa-options"
    );


  elements.generateButton =
    document.getElementById(
      "generate-btn"
    );


  elements.formMessage =
    document.getElementById(
      "opb-form-message"
    );


  elements.results =
    document.getElementById(
      "opb-results"
    );


  elements.resultStatus =
    document.getElementById(
      "result-status"
    );


  elements.resultMPA =
    document.getElementById(
      "result-mpa"
    );


  elements.resultCharacterCount =
    document.getElementById(
      "result-character-count"
    );


  elements.resultStatement =
    document.getElementById(
      "result-statement"
    );


  elements.analysisAction =
    document.getElementById(
      "analysis-action"
    );


  elements.analysisScope =
    document.getElementById(
      "analysis-scope"
    );


  elements.analysisResult =
    document.getElementById(
      "analysis-result"
    );


  elements.analysisImpact =
    document.getElementById(
      "analysis-impact"
    );


  elements.validationList =
    document.getElementById(
      "validation-list"
    );


  elements.copyButton =
    document.getElementById(
      "copy-btn"
    );


  elements.regenerateButton =
    document.getElementById(
      "regenerate-btn"
    );


  elements.resetButton =
    document.getElementById(
      "reset-btn"
    );


  elements.copyStatus =
    document.getElementById(
      "copy-status"
    );

}


// ============================================================
// 7. EVENT BINDING
// ============================================================

function bindEvents() {

  elements.form.addEventListener(
    "submit",
    handleSubmit
  );


  elements.accomplishmentInput.addEventListener(
    "input",
    handleInput
  );


  elements.accomplishmentInput.addEventListener(
    "keydown",
    handleInputKeydown
  );


  if (elements.mpaOptions) {

    elements.mpaOptions.addEventListener(
      "change",
      handleMPAChange
    );

  }


  if (elements.copyButton) {

    elements.copyButton.addEventListener(
      "click",
      handleCopy
    );

  }


  if (elements.regenerateButton) {

    elements.regenerateButton.addEventListener(
      "click",
      handleRegenerate
    );

  }


  if (elements.resetButton) {

    elements.resetButton.addEventListener(
      "click",
      handleReset
    );

  }

}


// ============================================================
// 8. INPUT HANDLERS
// ============================================================

function handleInput() {

  updateCharacterCount();

  hideFormMessage();

  saveDraft();

}


function handleMPAChange() {

  state.lastMPA =
    getSelectedMPA();

  saveDraft();

}


function handleInputKeydown(event) {

  const generateShortcut =
    (
      event.ctrlKey ||
      event.metaKey
    ) &&
    event.key === "Enter";


  if (!generateShortcut) {

    return;

  }


  event.preventDefault();

  elements.form.requestSubmit();

}


// ============================================================
// 9. SUBMIT
// ============================================================

async function handleSubmit(
  event
) {

  event.preventDefault();


  if (state.generating) {

    return;

  }


  const accomplishment =
    normalizeInput(
      elements.accomplishmentInput.value
    );


  const selectedMPA =
    getSelectedMPA();


  const inputValidation =
    validateInput(
      accomplishment
    );


  if (!inputValidation.ok) {

    showFormMessage(
      inputValidation.message
    );

    return;

  }


  await generateStatement({
    accomplishment,
    mpa:
      selectedMPA,
    regenerate:
      false
  });

}


// ============================================================
// 10. GENERATION
// ============================================================

async function generateStatement({
  accomplishment,
  mpa = "auto",
  regenerate = false
}) {

  setGenerating(
    true
  );


  hideFormMessage();

  clearCopyStatus();


  try {

    await smallDelay(
      GENERATION_DELAY
    );


    state.generationCount +=
      1;


    const result =
      await generateOPBStatement({

        accomplishment,

        mpa,

        variant:
          regenerate
            ? state.generationCount
            : 0

      });


    const normalizedResult =
      normalizeGeneratorResult(
        result,
        accomplishment,
        mpa
      );


    if (
      !normalizedResult.statement
    ) {

      throw new Error(
        "The writing engine did not return a Performance Statement."
      );

    }


    const validation =
      validateOPBStatement({

        statement:
          normalizedResult.statement,

        sourceText:
          accomplishment,

        mpa:
          normalizedResult.mpa,

        analysis:
          normalizedResult.analysis

      });


    state.lastInput =
      accomplishment;


    state.lastMPA =
      mpa;


    state.lastResult =
      normalizedResult;


    state.lastValidation =
      validation;


    renderResult(
      normalizedResult,
      validation
    );


    showResults();

  } catch (error) {

    console.error(
      "[OPB Generator] Generation failed:",
      error
    );


    showFormMessage(
      "I couldn’t generate the statement. Review your accomplishment and try again."
    );

  } finally {

    setGenerating(
      false
    );

  }

}


// ============================================================
// 11. NORMALIZE GENERATOR RESULT
// ============================================================

function normalizeGeneratorResult(
  result,
  accomplishment,
  requestedMPA
) {

  const safeResult =
    result &&
    typeof result === "object"
      ? result
      : {};


  const analysis =
    safeResult.analysis &&
    typeof safeResult.analysis === "object"
      ? safeResult.analysis
      : {};


  return {

    statement:
      safeString(
        safeResult.statement
      ),

    mpa:
      safeString(
        safeResult.mpa
      ) ||
      (
        requestedMPA === "auto"
          ? "auto"
          : requestedMPA
      ),

    analysis: {

      action:
        safeString(
          analysis.action
        ),

      scope:
        safeString(
          analysis.scope
        ),

      result:
        safeString(
          analysis.result
        ),

      impact:
        safeString(
          analysis.impact
        )

    },

    sourceText:
      accomplishment,

    metadata:
      safeResult.metadata &&
      typeof safeResult.metadata === "object"
        ? safeResult.metadata
        : {}

  };

}


// ============================================================
// 12. RENDER RESULT
// ============================================================

function renderResult(
  result,
  validation
) {

  const statement =
    result.statement;


  elements.resultStatement.textContent =
    statement;


  elements.resultCharacterCount.textContent =
    String(
      statement.length
    );


  elements.resultMPA.textContent =
    getMPALabel(
      result.mpa
    );


  renderAnalysis(
    result.analysis
  );


  renderValidation(
    validation
  );


  renderResultStatus(
    validation
  );

}


// ============================================================
// 13. RENDER ANALYSIS
// ============================================================

function renderAnalysis(
  analysis = {}
) {

  elements.analysisAction.textContent =
    safeString(
      analysis.action
    ) ||
    "Not clearly identified";


  elements.analysisScope.textContent =
    safeString(
      analysis.scope
    ) ||
    "No specific scope provided";


  elements.analysisResult.textContent =
    safeString(
      analysis.result
    ) ||
    "No measurable result identified";


  elements.analysisImpact.textContent =
    safeString(
      analysis.impact
    ) ||
    "No explicit mission impact provided";

}


// ============================================================
// 14. RENDER VALIDATION
// ============================================================

function renderValidation(
  validation
) {

  if (!elements.validationList) {

    return;

  }


  elements.validationList.innerHTML =
    "";


  const checks =
    Array.isArray(
      validation?.checks
    )
      ? validation.checks
      : [];


  if (!checks.length) {

    appendValidationItem({
      status:
        "pass",

      message:
        "Performance Statement generated successfully."
    });

    return;

  }


  for (
    const check of checks
  ) {

    appendValidationItem(
      check
    );

  }

}


// ============================================================
// 15. VALIDATION ITEM
// ============================================================

function appendValidationItem({
  status = "pass",
  message = ""
} = {}) {

  if (
    !elements.validationList ||
    !message
  ) {

    return;

  }


  const item =
    document.createElement(
      "li"
    );


  const normalizedStatus =
    safeString(
      status
    )
      .toLowerCase();


  if (
    normalizedStatus ===
    "warning"
  ) {

    item.classList.add(
      "opb-warning"
    );

  }


  if (
    normalizedStatus ===
      "error" ||
    normalizedStatus ===
      "fail"
  ) {

    item.classList.add(
      "opb-error"
    );

  }


  item.textContent =
    message;


  elements.validationList.appendChild(
    item
  );

}


// ============================================================
// 16. RESULT STATUS
// ============================================================

function renderResultStatus(
  validation
) {

  if (!elements.resultStatus) {

    return;

  }


  const status =
    safeString(
      validation?.status
    )
      .toLowerCase();


  if (
    status === "strong" ||
    status === "pass"
  ) {

    elements.resultStatus.textContent =
      "Strong";


    elements.resultStatus.dataset.status =
      "strong";


    return;

  }


  if (
    status === "needs-work" ||
    status === "error" ||
    status === "fail"
  ) {

    elements.resultStatus.textContent =
      "Needs Review";


    elements.resultStatus.dataset.status =
      "needs-work";


    return;

  }


  elements.resultStatus.textContent =
    "Review";


  elements.resultStatus.dataset.status =
    "review";

}


// ============================================================
// 17. SHOW RESULTS
// ============================================================

function showResults() {

  if (!elements.results) {

    return;

  }


  elements.results.hidden =
    false;


  requestAnimationFrame(
    () => {

      elements.results.scrollIntoView({

        behavior:
          prefersReducedMotion()
            ? "auto"
            : "smooth",

        block:
          "start"

      });

    }
  );

}


// ============================================================
// 18. COPY
// ============================================================

async function handleCopy() {

  const statement =
    safeString(
      state.lastResult?.statement
    );


  if (!statement) {

    return;

  }


  try {

    await copyText(
      statement
    );


    showCopyStatus(
      "Statement copied."
    );

  } catch (error) {

    console.error(
      "[OPB Generator] Copy failed:",
      error
    );


    showCopyStatus(
      "Unable to copy automatically. Select the statement and copy it manually."
    );

  }

}


// ============================================================
// 19. COPY TEXT
// ============================================================

async function copyText(
  text
) {

  if (
    navigator.clipboard &&
    window.isSecureContext
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


  textarea.style.pointerEvents =
    "none";


  document.body.appendChild(
    textarea
  );


  textarea.select();


  const success =
    document.execCommand(
      "copy"
    );


  textarea.remove();


  if (!success) {

    throw new Error(
      "Clipboard copy failed."
    );

  }

}


// ============================================================
// 20. COPY STATUS
// ============================================================

function showCopyStatus(
  message
) {

  if (!elements.copyStatus) {

    return;

  }


  elements.copyStatus.textContent =
    message;


  window.clearTimeout(
    showCopyStatus.timeout
  );


  showCopyStatus.timeout =
    window.setTimeout(
      clearCopyStatus,
      COPY_SUCCESS_DURATION
    );

}


function clearCopyStatus() {

  if (elements.copyStatus) {

    elements.copyStatus.textContent =
      "";

  }

}


// ============================================================
// 21. REGENERATE
// ============================================================

async function handleRegenerate() {

  if (
    state.generating ||
    !state.lastInput
  ) {

    return;

  }


  await generateStatement({

    accomplishment:
      state.lastInput,

    mpa:
      state.lastMPA,

    regenerate:
      true

  });

}


// ============================================================
// 22. RESET
// ============================================================

function handleReset() {

  state.generating =
    false;


  state.generationCount =
    0;


  state.lastInput =
    "";


  state.lastMPA =
    "auto";


  state.lastResult =
    null;


  state.lastValidation =
    null;


  elements.form.reset();


  elements.accomplishmentInput.value =
    "";


  hideFormMessage();

  clearCopyStatus();

  hideResults();

  updateCharacterCount();

  clearDraft();


  elements.accomplishmentInput.focus();


  window.scrollTo({

    top:
      0,

    behavior:
      prefersReducedMotion()
        ? "auto"
        : "smooth"

  });

}


// ============================================================
// 23. HIDE RESULTS
// ============================================================

function hideResults() {

  if (!elements.results) {

    return;

  }


  elements.results.hidden =
    true;


  if (elements.resultStatement) {

    elements.resultStatement.textContent =
      "";

  }


  if (elements.validationList) {

    elements.validationList.innerHTML =
      "";

  }

}


// ============================================================
// 24. CHARACTER COUNT
// ============================================================

function updateCharacterCount() {

  if (
    !elements.accomplishmentInput ||
    !elements.characterCount
  ) {

    return;

  }


  const length =
    elements.accomplishmentInput.value.length;


  elements.characterCount.textContent =
    `${length} character${length === 1 ? "" : "s"}`;


  elements.characterCount.dataset.level =
    "";


  if (
    length >=
    MAX_INPUT_CHARACTERS * 0.80
  ) {

    elements.characterCount.dataset.level =
      "warning";

  }


  if (
    length >=
    MAX_INPUT_CHARACTERS * 0.95
  ) {

    elements.characterCount.dataset.level =
      "danger";

  }

}


// ============================================================
// 25. SELECTED MPA
// ============================================================

function getSelectedMPA() {

  const selected =
    document.querySelector(
      'input[name="mpa"]:checked'
    );


  return safeString(
    selected?.value
  ) || "auto";

}


// ============================================================
// 26. MPA LABEL
// ============================================================

function getMPALabel(
  value
) {

  const key =
    safeString(
      value
    );


  if (!key) {

    return "Auto Detected";

  }


  if (
    MPA_LABELS &&
    typeof MPA_LABELS === "object" &&
    MPA_LABELS[key]
  ) {

    return MPA_LABELS[key];

  }


  const fallbacks = {

    auto:
      "Auto Detected",

    "executing-the-mission":
      "Executing the Mission",

    "leading-people":
      "Leading People",

    "managing-resources":
      "Managing Resources",

    "improving-the-unit":
      "Improving the Unit"

  };


  return (
    fallbacks[key] ||
    key
  );

}


// ============================================================
// 27. INPUT VALIDATION
// ============================================================

function validateInput(
  accomplishment
) {

  const text =
    safeString(
      accomplishment
    );


  if (!text) {

    return {

      ok:
        false,

      message:
        "Describe what you accomplished before generating a Performance Statement."

    };

  }


  if (
    text.length <
    MIN_INPUT_CHARACTERS
  ) {

    return {

      ok:
        false,

      message:
        "Give the generator a little more detail about what you accomplished."

    };

  }


  if (
    text.length >
    MAX_INPUT_CHARACTERS
  ) {

    return {

      ok:
        false,

      message:
        `Keep the accomplishment under ${MAX_INPUT_CHARACTERS} characters.`

    };

  }


  return {

    ok:
      true,

    message:
      ""

  };

}


// ============================================================
// 28. FORM MESSAGE
// ============================================================

function showFormMessage(
  message
) {

  if (!elements.formMessage) {

    return;

  }


  elements.formMessage.textContent =
    message;


  elements.formMessage.hidden =
    false;

}


function hideFormMessage() {

  if (!elements.formMessage) {

    return;

  }


  elements.formMessage.textContent =
    "";


  elements.formMessage.hidden =
    true;

}


// ============================================================
// 29. GENERATING STATE
// ============================================================

function setGenerating(
  generating
) {

  state.generating =
    Boolean(
      generating
    );


  document.body.dataset.opbLoading =
    state.generating
      ? "true"
      : "false";


  if (elements.generateButton) {

    elements.generateButton.disabled =
      state.generating;


    const label =
      elements.generateButton.querySelector(
        "span:first-child"
      );


    if (label) {

      label.textContent =
        state.generating
          ? "Generating Statement..."
          : "Generate Performance Statement";

    }

  }


  if (elements.regenerateButton) {

    elements.regenerateButton.disabled =
      state.generating;


    elements.regenerateButton.textContent =
      state.generating
        ? "Generating..."
        : "Generate Another Version";

  }

}


// ============================================================
// 30. DRAFT STORAGE
// ============================================================

function saveDraft() {

  try {

    const draft = {

      accomplishment:
        elements.accomplishmentInput?.value ||
        "",

      mpa:
        getSelectedMPA(),

      savedAt:
        new Date().toISOString()

    };


    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        draft
      )
    );

  } catch (error) {

    // Local storage is optional.
    // Never block the app if storage is unavailable.

  }

}


// ============================================================
// 31. RESTORE DRAFT
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
      draft?.accomplishment &&
      elements.accomplishmentInput
    ) {

      elements.accomplishmentInput.value =
        safeString(
          draft.accomplishment
        ).slice(
          0,
          MAX_INPUT_CHARACTERS
        );

    }


    const savedMPA =
      safeString(
        draft?.mpa
      );


    if (savedMPA) {

      const radio =
        document.querySelector(
          `input[name="mpa"][value="${cssEscape(savedMPA)}"]`
        );


      if (radio) {

        radio.checked =
          true;

      }

    }


    state.lastMPA =
      getSelectedMPA();

  } catch (error) {

    // Ignore invalid or unavailable storage.

  }

}


// ============================================================
// 32. CLEAR DRAFT
// ============================================================

function clearDraft() {

  try {

    localStorage.removeItem(
      STORAGE_KEY
    );

  } catch (error) {

    // Storage is optional.

  }

}


// ============================================================
// 33. NORMALIZE USER INPUT
// ============================================================

function normalizeInput(
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
// 34. SAFE STRING
// ============================================================

function safeString(
  value
) {

  return String(
    value ?? ""
  ).trim();

}


// ============================================================
// 35. CSS ESCAPE
// ============================================================

function cssEscape(
  value
) {

  if (
    window.CSS &&
    typeof window.CSS.escape === "function"
  ) {

    return window.CSS.escape(
      value
    );

  }


  return String(
    value
  ).replace(
    /["\\]/g,
    "\\$&"
  );

}


// ============================================================
// 36. SMALL DELAY
//
// Provides a smoother UI transition.
// This is NOT required by the writing engine.
// ============================================================

function smallDelay(
  milliseconds
) {

  return new Promise(
    (resolve) => {

      window.setTimeout(
        resolve,
        milliseconds
      );

    }
  );

}


// ============================================================
// 37. REDUCED MOTION
// ============================================================

function prefersReducedMotion() {

  return Boolean(
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  );

}


// ============================================================
// 38. PUBLIC APP API
//
// Useful later if TheWing.ai or Webflow needs to communicate
// with the standalone front-end app.
// ============================================================

window.TheWingOPB =
  Object.freeze({

    version:
      APP_VERSION,


    generate:
      async function ({
        accomplishment = "",
        mpa = "auto"
      } = {}) {

        const text =
          normalizeInput(
            accomplishment
          );


        const validation =
          validateInput(
            text
          );


        if (!validation.ok) {

          return {

            ok:
              false,

            error:
              validation.message

          };

        }


        try {

          const result =
            await generateOPBStatement({

              accomplishment:
                text,

              mpa,

              variant:
                0

            });


          const normalized =
            normalizeGeneratorResult(
              result,
              text,
              mpa
            );


          const statementValidation =
            validateOPBStatement({

              statement:
                normalized.statement,

              sourceText:
                text,

              mpa:
                normalized.mpa,

              analysis:
                normalized.analysis

            });


          return {

            ok:
              true,

            result:
              normalized,

            validation:
              statementValidation

          };

        } catch (error) {

          return {

            ok:
              false,

            error:
              safeString(
                error?.message
              ) ||
              "Unable to generate Performance Statement."

          };

        }

      }

  });


// ============================================================
// END
// THEWING.AI • UNIVERSAL OPB GENERATOR
// app.js v1.0.0
// ============================================================
