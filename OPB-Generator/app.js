// ============================================================
// PCSUNITED • THEWING.AI
// EPB BULLET STATEMENT GENERATOR
// app.js
// Version 2.0.0
//
// PURPOSE
// ------------------------------------------------------------
// Front-end controller for the Single Statement Generator.
//
// CURRENT WORKFLOW
// ------------------------------------------------------------
// 1. User enters a rough accomplishment
// 2. User selects AF Form 716 section
// 3. User selects rated rank
// 4. User selects writing variation
// 5. TheWing generates 3 statement options
// 6. Each statement is measured against 350 characters
// 7. User can copy or select a preferred statement
// 8. Selected statement is exposed for future AF Form 716 use
//
// IMPORTANT
// ------------------------------------------------------------
// This file:
// - DOES control interface behavior
// - DOES enforce the 350-character display / validation
// - DOES preserve draft state
// - DOES expose selected statements for future integration
//
// This file:
// - DOES NOT invent accomplishments
// - DOES NOT write Air Force content itself
// - DOES NOT determine evaluation ratings
// - DOES NOT truncate generated statements
//
// WRITING ENGINE
// ------------------------------------------------------------
// ./js/opb-universal.js
//
// FUTURE
// ------------------------------------------------------------
// Selected statements will be routed directly into:
// - AF Form 716
// - AF Form 716A
// ============================================================


import {
  generateOPBStatement
} from "./js/opb-universal.js";


// ============================================================
// 1. APP CONFIG
// ============================================================

const APP_VERSION =
  "2.0.0";


const CHARACTER_LIMIT =
  350;


const MIN_SOURCE_CHARACTERS =
  10;


const MAX_SOURCE_CHARACTERS =
  1500;


const OPTION_COUNT =
  3;


const STORAGE_KEY =
  "pcsunited.epb.statement-generator.v2";


const COPY_STATUS_DURATION =
  2200;


// ============================================================
// 2. SECTION CONFIG
// ============================================================

const SECTION_CONFIG =
  Object.freeze({

    "duty-description": {

      id:
        "duty-description",

      label:
        "Duty Description",

      form:
        "AF716",

      characterLimit:
        CHARACTER_LIMIT

    },


    "executing-the-mission": {

      id:
        "executing-the-mission",

      label:
        "Executing the Mission",

      form:
        "AF716",

      characterLimit:
        CHARACTER_LIMIT

    },


    "leading-people": {

      id:
        "leading-people",

      label:
        "Leading People",

      form:
        "AF716",

      characterLimit:
        CHARACTER_LIMIT

    },


    "managing-resources": {

      id:
        "managing-resources",

      label:
        "Managing Resources",

      form:
        "AF716",

      characterLimit:
        CHARACTER_LIMIT

    },


    "improving-the-unit": {

      id:
        "improving-the-unit",

      label:
        "Improving the Unit",

      form:
        "AF716",

      characterLimit:
        CHARACTER_LIMIT

    }

  });


// ============================================================
// 3. RANK CONFIG
// ============================================================

const RANK_LABELS =
  Object.freeze({

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


// ============================================================
// 4. VARIATION CONFIG
// ============================================================

const VARIATION_CONFIG =
  Object.freeze({

    strict: {

      id:
        "strict",

      label:
        "Strict",

      description:
        "Stay extremely close to the facts supplied by the member."

    },


    balanced: {

      id:
        "balanced",

      label:
        "Balanced",

      description:
        "Improve clarity, structure, and impact while preserving the source facts."

    },


    competitive: {

      id:
        "competitive",

      label:
        "Competitive",

      description:
        "Use the strongest defensible framing supported by the source accomplishment."

    }

  });


// ============================================================
// 5. APP STATE
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
    createEmptyStatements(),

  lastRequest:
    null

};


// ============================================================
// 6. DOM REFERENCES
// ============================================================

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


// ============================================================
// 7. INITIALIZATION
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
// 8. CACHE ELEMENTS
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
// 9. EVENT BINDING
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


  if (elements.section) {

    elements.section.addEventListener(
      "change",
      handleControlChange
    );

  }


  if (elements.rank) {

    elements.rank.addEventListener(
      "change",
      handleControlChange
    );

  }


  if (elements.variation) {

    elements.variation.addEventListener(
      "change",
      handleControlChange
    );

  }


  elements.generateButton.addEventListener(
    "click",
    handleGenerate
  );


  bindOptionButtons();

}


// ============================================================
// 10. OPTION BUTTON EVENTS
// ============================================================

function bindOptionButtons() {

  elements.options.forEach(
    (
      optionElement,
      index
    ) => {

      const copyButton =
        optionElement.querySelector(
          ".epb-copy"
        );


      const favoriteButton =
        optionElement.querySelector(
          ".epb-favorite"
        );


      if (copyButton) {

        copyButton.addEventListener(
          "click",
          () => {

            handleCopy(
              index
            );

          }
        );

      }


      if (favoriteButton) {

        favoriteButton.addEventListener(
          "click",
          () => {

            handleSelect(
              index
            );

          }
        );

      }

    }
  );

}


// ============================================================
// 11. SOURCE INPUT
// ============================================================

function handleSourceInput() {

  enforceSourceLength();

  updateSourceCount();

  clearStatus();

  saveDraft();

}


// ============================================================
// 12. CONTROL CHANGE
// ============================================================

function handleControlChange() {

  updateChips();

  clearStatus();

  saveDraft();

}


// ============================================================
// 13. KEYBOARD SHORTCUT
// ============================================================

function handleKeyboardShortcut(
  event
) {

  const isGenerateShortcut =
    (
      event.ctrlKey ||
      event.metaKey
    ) &&
    event.key ===
      "Enter";


  if (!isGenerateShortcut) {

    return;

  }


  event.preventDefault();

  handleGenerate();

}


// ============================================================
// 14. GENERATE
// ============================================================

async function handleGenerate() {

  if (state.generating) {

    return;

  }


  const request =
    buildGenerationRequest();


  const validation =
    validateGenerationRequest(
      request
    );


  if (!validation.ok) {

    showStatus(
      validation.message,
      "error"
    );


    focusValidationTarget(
      validation.field
    );


    return;

  }


  state.lastRequest =
    request;


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

    const generatedStatements =
      await requestStatements(
        request
      );


    if (
      !Array.isArray(
        generatedStatements
      ) ||
      !generatedStatements.length
    ) {

      throw new Error(
        "The writing engine did not return any Performance Statements."
      );

    }


    const normalized =
      normalizeGeneratedStatements(
        generatedStatements
      );


    state.statements =
      normalized;


    renderAllOptions();

    saveDraft();


    const overLimitCount =
      state.statements.filter(
        item =>
          item.statement.length >
          CHARACTER_LIMIT
      ).length;


    if (overLimitCount > 0) {

      showStatus(
        `${overLimitCount} statement${overLimitCount === 1 ? " is" : "s are"} over the 350-character limit and need refinement.`,
        "error"
      );

    } else {

      showStatus(
        "Three statement options generated. Select or copy the version you prefer.",
        "success"
      );

    }


    dispatchGeneratedEvent(
      request
    );

  } catch (error) {

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

  } finally {

    setOptionsLoading(
      false
    );


    setGenerating(
      false
    );

  }

}


// ============================================================
// 15. BUILD GENERATION REQUEST
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


  const ratedRank =
    safeString(
      elements.rank?.value
    );


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

    variation,

    characterLimit:
      CHARACTER_LIMIT,

    optionCount:
      OPTION_COUNT,

    form:
      "AF716",

    generationId:
      state.generationCount

  };

}


// ============================================================
// 16. VALIDATE REQUEST
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
    request.accomplishment.length <
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
    request.accomplishment.length >
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
    !request.ratedRank ||
    !RANK_LABELS[
      request.ratedRank
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
// 17. WRITING ENGINE ADAPTER
// ============================================================

async function requestStatements(
  request
) {

  /*
  =============================================================
  FUTURE THEWING EPB API
  =============================================================

  When the dedicated backend is ready, it can expose:

  window.TheWingEPB.generateStatements({
    accomplishment,
    section,
    ratedRank,
    variation,
    characterLimit,
    optionCount
  })

  and return:

  {
    options: [
      { statement: "..." },
      { statement: "..." },
      { statement: "..." }
    ]
  }

  If present, this app automatically prefers that API.
  =============================================================
  */


  if (
    window.TheWingEPB &&
    typeof
      window.TheWingEPB.generateStatements ===
      "function"
  ) {

    const response =
      await window.TheWingEPB.generateStatements(
        request
      );


    const extracted =
      extractStatementsFromResponse(
        response
      );


    if (extracted.length) {

      return extracted;

    }

  }


  /*
  =============================================================
  LEGACY / CURRENT UNIVERSAL ENGINE
  =============================================================

  Until the dedicated EPB backend is ready, call the existing
  opb-universal.js engine once per option.

  Extra context is passed now so the writing engine can use it
  as soon as opb-universal.js is upgraded.
  =============================================================
  */


  const results =
    [];


  for (
    let variant = 0;
    variant < OPTION_COUNT;
    variant += 1
  ) {

    const response =
      await generateOPBStatement({

        accomplishment:
          request.accomplishment,

        mpa:
          request.section,

        section:
          request.section,

        ratedRank:
          request.ratedRank,

        rank:
          request.ratedRank,

        variation:
          request.variation,

        characterLimit:
          request.characterLimit,

        variant

      });


    const statement =
      extractSingleStatement(
        response
      );


    if (
      isPlaceholderStatement(
        statement
      )
    ) {

      throw new Error(
        "The writing engine is still using its placeholder response. Update opb-universal.js before live generation."
      );

    }


    if (!statement) {

      throw new Error(
        `The writing engine did not return Option ${variant + 1}.`
      );

    }


    results.push({

      statement,

      metadata:
        safeObject(
          response?.metadata
        ),

      analysis:
        safeObject(
          response?.analysis
        )

    });

  }


  return results;

}


// ============================================================
// 18. EXTRACT MULTI-OPTION RESPONSE
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
    response.result &&
    Array.isArray(
      response.result.options
    )
  ) {

    return response.result.options;

  }


  if (
    response.result &&
    Array.isArray(
      response.result.statements
    )
  ) {

    return response.result.statements;

  }


  return [];

}


// ============================================================
// 19. EXTRACT SINGLE STATEMENT
// ============================================================

function extractSingleStatement(
  response
) {

  if (
    typeof response ===
    "string"
  ) {

    return normalizeStatement(
      response
    );

  }


  if (
    response &&
    typeof response.statement ===
    "string"
  ) {

    return normalizeStatement(
      response.statement
    );

  }


  if (
    response?.result &&
    typeof response.result.statement ===
    "string"
  ) {

    return normalizeStatement(
      response.result.statement
    );

  }


  return "";

}


// ============================================================
// 20. NORMALIZE GENERATED OPTIONS
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
            sourceItem?.statement
          );


    normalized.push(
      createStatementRecord({

        index,

        statement,

        metadata:
          safeObject(
            sourceItem?.metadata
          ),

        analysis:
          safeObject(
            sourceItem?.analysis
          )

      })
    );

  }


  return normalized;

}


// ============================================================
// 21. CREATE STATEMENT RECORD
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


  const count =
    text.length;


  return {

    id:
      createStatementId(
        index
      ),

    option:
      index + 1,

    statement:
      text,

    characterCount:
      count,

    characterLimit:
      CHARACTER_LIMIT,

    charactersRemaining:
      CHARACTER_LIMIT -
      count,

    withinLimit:
      count <=
      CHARACTER_LIMIT,

    validation:
      validateStatement(
        text
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
// 22. BASIC DETERMINISTIC VALIDATION
// ============================================================

function validateStatement(
  statement
) {

  const text =
    normalizeStatement(
      statement
    );


  const characterCount =
    text.length;


  const checks =
    [];


  if (!text) {

    checks.push({

      id:
        "statement-present",

      status:
        "error",

      message:
        "No statement was generated."

    });

  } else {

    checks.push({

      id:
        "statement-present",

      status:
        "pass",

      message:
        "Statement generated."

    });

  }


  if (
    characterCount <=
    CHARACTER_LIMIT
  ) {

    checks.push({

      id:
        "character-limit",

      status:
        "pass",

      message:
        `Within ${CHARACTER_LIMIT}-character limit.`

    });

  } else {

    checks.push({

      id:
        "character-limit",

      status:
        "error",

      message:
        `${characterCount - CHARACTER_LIMIT} characters over the ${CHARACTER_LIMIT}-character limit.`

    });

  }


  return {

    status:
      checks.some(
        check =>
          check.status ===
          "error"
      )
        ? "needs-revision"
        : "valid",

    characterCount,

    characterLimit:
      CHARACTER_LIMIT,

    withinLimit:
      characterCount <=
      CHARACTER_LIMIT,

    checks

  };

}


// ============================================================
// 23. RENDER ALL OPTIONS
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
// 24. RENDER SINGLE OPTION
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


  const statementRecord =
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


  if (textElement) {

    if (
      statementRecord.statement
    ) {

      textElement.textContent =
        statementRecord.statement;


      textElement.classList.remove(
        "epb-empty"
      );

    } else {

      textElement.textContent =
        getEmptyOptionText(
          index
        );


      textElement.classList.add(
        "epb-empty"
      );

    }

  }


  updateCharacterDisplay(
    optionElement,
    statementRecord.statement
  );

}


// ============================================================
// 25. EMPTY OPTION TEXT
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
// 26. CHARACTER DISPLAY
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
    text.length;


  const countElement =
    optionElement.querySelector(
      ".epb-char-count"
    );


  const fillElement =
    optionElement.querySelector(
      ".epb-char-fill"
    );


  if (!countElement) {

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

    const over =
      count -
      CHARACTER_LIMIT;


    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT} • ${over} over`;


    countElement.classList.add(
      "over"
    );


    if (fillElement) {

      fillElement.style.background =
        "var(--epb-red)";

    }

  } else if (
    count >= 336
  ) {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    countElement.classList.add(
      "max"
    );


    if (fillElement) {

      fillElement.style.background =
        "var(--epb-gold-soft)";

    }

  } else if (
    count >= 301
  ) {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    countElement.classList.add(
      "near"
    );


    if (fillElement) {

      fillElement.style.background =
        "var(--epb-amber)";

    }

  } else {

    countElement.textContent =
      `${count} / ${CHARACTER_LIMIT}`;


    if (fillElement) {

      fillElement.style.background =
        "var(--epb-green)";

    }

  }


  if (fillElement) {

    fillElement.style.width =
      `${percentage}%`;

  }

}


// ============================================================
// 27. SELECT STATEMENT
// ============================================================

function handleSelect(
  index
) {

  const statementRecord =
    state.statements[
      index
    ];


  if (
    !statementRecord ||
    !statementRecord.statement
  ) {

    showStatus(
      "Generate statements before selecting one.",
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
// 28. RENDER SELECTION
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


      if (favoriteButton) {

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
// 29. CLEAR SELECTION
// ============================================================

function clearSelection() {

  state.selectedIndex =
    null;


  renderSelection();

}


// ============================================================
// 30. COPY STATEMENT
// ============================================================

async function handleCopy(
  index
) {

  const statementRecord =
    state.statements[
      index
    ];


  const text =
    safeString(
      statementRecord?.statement
    );


  if (!text) {

    showStatus(
      "Generate a statement before copying it.",
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
          elements.status?.textContent ===
          `Option ${index + 1} copied.`
        ) {

          clearStatus();

        }

      },
      COPY_STATUS_DURATION
    );

  } catch (error) {

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
// 31. COPY UTILITY
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
// 32. SOURCE CHARACTER COUNT
// ============================================================

function updateSourceCount() {

  if (
    !elements.accomplishment ||
    !elements.sourceCount
  ) {

    return;

  }


  const count =
    elements.accomplishment.value.length;


  elements.sourceCount.textContent =
    `${count} / ${MAX_SOURCE_CHARACTERS}`;

}


// ============================================================
// 33. SOURCE LENGTH PROTECTION
// ============================================================

function enforceSourceLength() {

  if (!elements.accomplishment) {

    return;

  }


  if (
    elements.accomplishment.value.length <=
    MAX_SOURCE_CHARACTERS
  ) {

    return;

  }


  elements.accomplishment.value =
    elements.accomplishment.value.slice(
      0,
      MAX_SOURCE_CHARACTERS
    );

}


// ============================================================
// 34. RESULT META CHIPS
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


  if (elements.sectionChip) {

    elements.sectionChip.textContent =
      SECTION_CONFIG[
        selectedSection
      ]?.label ||
      "Select Section";

  }


  if (elements.rankChip) {

    elements.rankChip.textContent =
      RANK_LABELS[
        selectedRank
      ] ||
      "Rank";

  }


  if (elements.variationChip) {

    elements.variationChip.textContent =
      VARIATION_CONFIG[
        selectedVariation
      ]?.label ||
      "Balanced";

  }

}


// ============================================================
// 35. GENERATING STATE
// ============================================================

function setGenerating(
  generating
) {

  state.generating =
    Boolean(
      generating
    );


  if (!elements.generateButton) {

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
// 36. OPTION LOADING STATE
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
// 37. STATUS MESSAGE
// ============================================================

function showStatus(
  message,
  type = ""
) {

  if (!elements.status) {

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
// 38. CLEAR STATUS
// ============================================================

function clearStatus() {

  if (!elements.status) {

    return;

  }


  elements.status.className =
    "epb-status";


  elements.status.textContent =
    "";

}


// ============================================================
// 39. FOCUS INVALID FIELD
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
    typeof target.focus ===
      "function"
  ) {

    target.focus();

  }

}


// ============================================================
// 40. RESET STATEMENTS
// ============================================================

function resetStatements() {

  state.statements =
    createEmptyStatements();


  state.selectedIndex =
    null;

}


// ============================================================
// 41. CREATE EMPTY STATEMENTS
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
// 42. CREATE STATEMENT ID
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
// 43. BUILD SELECTED STATEMENT OBJECT
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
    !record ||
    !record.statement
  ) {

    return null;

  }


  const sectionId =
    safeString(
      elements.section?.value
    );


  const rank =
    safeString(
      elements.rank?.value
    );


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

    ratedRank:
      rank,

    ratedRankLabel:
      RANK_LABELS[
        rank
      ] ||
      rank,

    variation,

    variationLabel:
      VARIATION_CONFIG[
        variation
      ]?.label ||
      variation,

    source:
      normalizeSource(
        elements.accomplishment?.value
      ),

    statement:
      record.statement,

    characterCount:
      record.characterCount,

    characterLimit:
      CHARACTER_LIMIT,

    charactersRemaining:
      record.charactersRemaining,

    withinLimit:
      record.withinLimit,

    option:
      record.option,

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
// 44. DISPATCH GENERATED EVENT
// ============================================================

function dispatchGeneratedEvent(
  request
) {

  window.dispatchEvent(
    new CustomEvent(
      "pcsunited:epb-statements-generated",
      {

        detail: {

          request,

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
// 45. DISPATCH SELECTED EVENT
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
// 46. SAVE DRAFT
// ============================================================

function saveDraft() {

  try {

    const draft = {

      version:
        APP_VERSION,

      source:
        elements.accomplishment?.value ||
        "",

      section:
        elements.section?.value ||
        "",

      rank:
        elements.rank?.value ||
        "",

      variation:
        elements.variation?.value ||
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

  } catch (error) {

    console.warn(
      "[EPB Generator] Unable to save draft:",
      error
    );

  }

}


// ============================================================
// 47. RESTORE DRAFT
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
        draft.source.slice(
          0,
          MAX_SOURCE_CHARACTERS
        );

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
      draft.selectedIndex >= 0 &&
      draft.selectedIndex <
        OPTION_COUNT &&
      state.statements[
        draft.selectedIndex
      ]?.statement
    ) {

      state.selectedIndex =
        draft.selectedIndex;

    }

  } catch (error) {

    console.warn(
      "[EPB Generator] Unable to restore draft:",
      error
    );

  }

}


// ============================================================
// 48. CLEAR SAVED DRAFT
// ============================================================

function clearSavedDraft() {

  try {

    localStorage.removeItem(
      STORAGE_KEY
    );

  } catch (error) {

    console.warn(
      "[EPB Generator] Unable to clear saved draft:",
      error
    );

  }

}


// ============================================================
// 49. NORMALIZE SOURCE
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
// 50. NORMALIZE STATEMENT
// ============================================================

function normalizeStatement(
  value
) {

  return safeString(
    value
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


// ============================================================
// 51. PLACEHOLDER DETECTION
// ============================================================

function isPlaceholderStatement(
  statement
) {

  const normalized =
    normalizeStatement(
      statement
    )
      .toLowerCase();


  return (
    !normalized ||
    normalized ===
      "..." ||
    normalized ===
      "statement" ||
    normalized ===
      "placeholder"
  );

}


// ============================================================
// 52. SAFE STRING
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
// 53. SAFE OBJECT
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
// 54. PUBLIC API
//
// FUTURE AF FORM 716 / ASK AMY / DASHBOARD INTEGRATION
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
            elements.accomplishment?.value
          ),

        section:
          elements.section?.value ||
          "",

        rank:
          elements.rank?.value ||
          "",

        variation:
          elements.variation?.value ||
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
          state.generating

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
        normalizedIndex < 0 ||
        normalizedIndex >=
          OPTION_COUNT
      ) {

        return false;

      }


      handleSelect(
        normalizedIndex
      );


      return true;

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
// EPB BULLET STATEMENT GENERATOR
// app.js v2.0.0
// ============================================================
