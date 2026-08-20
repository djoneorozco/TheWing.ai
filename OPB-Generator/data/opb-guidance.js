// ============================================================
// THEWING.AI • UNIVERSAL OPB GENERATOR
// data/opb-guidance.js
// v1.0.0
//
// PURPOSE
// ------------------------------------------------------------
// Central universal writing guidance for the open-source
// TheWing.ai OPB Generator.
//
// This file provides:
//
// - Major Performance Area definitions
// - Universal Performance Statement writing principles
// - Action / Scope / Result / Impact framework
// - Strong action-language guidance
// - Weak / vague language detection guidance
// - Acronym guidance
// - Anti-fabrication rules
// - MPA keyword hints
// - Output-quality expectations
//
// IMPORTANT
// ------------------------------------------------------------
// This file is GUIDANCE.
//
// It does not:
// - Generate the final statement
// - Determine an official rating
// - Determine promotion potential
// - Invent accomplishments
// - Invent metrics
// - Replace official evaluation guidance
//
// The generator should preserve the user's facts while improving
// clarity, structure, readability, and mission impact.
//
// ============================================================


export const OPB_GUIDANCE_VERSION =
  "1.0.0";


// ============================================================
// 1. MPA LABELS
//
// Used directly by app.js.
// ============================================================

export const MPA_LABELS =
  Object.freeze({

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

  });


// ============================================================
// 2. MPA ORDER
// ============================================================

export const MPA_ORDER =
  Object.freeze([

    "executing-the-mission",

    "leading-people",

    "managing-resources",

    "improving-the-unit"

  ]);


// ============================================================
// 3. UNIVERSAL WRITING MODEL
//
// The generator should attempt to understand accomplishments
// through:
//
// ACTION → SCOPE → RESULT → IMPACT
//
// Not every source accomplishment will contain all four.
// Missing information must NEVER be invented.
// ============================================================

export const WRITING_MODEL =
  Object.freeze({

    action: {

      label:
        "Action",

      question:
        "What did the member actually do?",

      description:
        "Identifies the meaningful action, leadership behavior, decision, improvement, or technical contribution performed by the member.",

      required:
        true

    },


    scope: {

      label:
        "Scope",

      question:
        "How large, difficult, important, or complex was the effort?",

      description:
        "Captures factual scale such as people, aircraft, missions, dollars, equipment, organizations, hours, locations, events, or other measurable scope.",

      required:
        false

    },


    result: {

      label:
        "Result",

      question:
        "What happened because of the action?",

      description:
        "Captures the direct measurable or observable outcome created by the member's action.",

      required:
        true

    },


    impact: {

      label:
        "Impact",

      question:
        "Why did the result matter?",

      description:
        "Connects the result to mission effectiveness, readiness, people, resources, capability, efficiency, safety, or organizational improvement.",

      required:
        false

    }

  });


// ============================================================
// 4. UNIVERSAL PERFORMANCE STATEMENT PRINCIPLES
// ============================================================

export const UNIVERSAL_WRITING_PRINCIPLES =
  Object.freeze([

    "Preserve the facts supplied by the user.",

    "Never invent accomplishments, numbers, awards, dollar values, percentages, personnel counts, mission outcomes, or organizational impact.",

    "Lead with the strongest meaningful action when possible.",

    "Connect the action to a result or impact.",

    "Use scope when the user provides factual scope.",

    "Prefer specific outcomes over vague claims.",

    "Use plain, professional language.",

    "Write a complete, readable Performance Statement.",

    "Prefer active voice.",

    "Remove unnecessary filler.",

    "Avoid inflated language that is not supported by the source accomplishment.",

    "Do not change the meaning of the accomplishment merely to make the statement sound stronger.",

    "Do not assume mission impact that the user did not provide.",

    "Do not create metrics from qualitative statements.",

    "Do not convert estimates into facts.",

    "Use acronyms only when they improve clarity and are reasonably understandable in context.",

    "Prefer one strong idea over several disconnected accomplishments forced into one sentence.",

    "Make the member's contribution clear.",

    "Make the outcome clear.",

    "Keep the final statement natural enough to be read by a human evaluator."

  ]);


// ============================================================
// 5. CORE STATEMENT RULES
// ============================================================

export const PERFORMANCE_STATEMENT_RULES =
  Object.freeze({

    structure: {

      preferred:
        "Action + Scope + Result + Impact",

      minimum:
        "Action + Result",

      explanation:
        "A strong statement normally makes clear what the member did and what changed because of it. Scope and broader impact should be included when supported by the source information."

    },


    voice: {

      preferred:
        "active",

      avoid:
        "passive when active wording clearly identifies the member's contribution"

    },


    tone: {

      preferred: [
        "professional",
        "clear",
        "confident",
        "specific",
        "mission-focused",
        "natural"
      ],

      avoid: [
        "inflated",
        "melodramatic",
        "overly promotional",
        "robotic",
        "compressed legacy bullet language"
      ]

    },


    factualIntegrity: {

      inventNumbers:
        false,

      inventImpact:
        false,

      inventAwards:
        false,

      inventSavings:
        false,

      inventRankings:
        false,

      inventMissionResults:
        false,

      rewriteProvidedFacts:
        true,

      strengthenWording:
        true

    }

  });


// ============================================================
// 6. MPA GUIDANCE
// ============================================================

export const MPA_GUIDANCE =
  Object.freeze({


    // ========================================================
    // EXECUTING THE MISSION
    // ========================================================

    "executing-the-mission": {

      id:
        "executing-the-mission",

      label:
        "Executing the Mission",

      shortDescription:
        "Mission accomplishment, expertise, initiative, execution, and operational results.",

      focus: [

        "Mission accomplishment",

        "Primary duties",

        "Technical expertise",

        "Operational execution",

        "Readiness",

        "Problem solving",

        "Initiative",

        "Quality",

        "Mission capability",

        "Operational effectiveness"

      ],

      questions: [

        "What mission requirement was accomplished?",

        "What technical or operational action did the member perform?",

        "What changed because of the action?",

        "Did the action improve readiness, capability, quality, timeliness, safety, or mission execution?",

        "Was there measurable scope?"

      ],

      keywords: [

        "mission",

        "operations",

        "operational",

        "aircraft",

        "sortie",

        "sorties",

        "inspection",

        "inspections",

        "maintenance",

        "readiness",

        "deployment",

        "deployed",

        "exercise",

        "qualification",

        "certification",

        "certified",

        "repair",

        "repaired",

        "production",

        "executed",

        "completed",

        "delivered",

        "supported",

        "response",

        "capability",

        "technical",

        "training mission",

        "combat",

        "tasking",

        "requirements"

      ]

    },


    // ========================================================
    // LEADING PEOPLE
    // ========================================================

    "leading-people": {

      id:
        "leading-people",

      label:
        "Leading People",

      shortDescription:
        "Leadership, teamwork, development, mentorship, communication, and strengthening people.",

      focus: [

        "Leadership",

        "Team performance",

        "Mentorship",

        "Development",

        "Training",

        "Communication",

        "Teamwork",

        "Empowerment",

        "Professional growth",

        "Organizational climate"

      ],

      questions: [

        "Who did the member lead, mentor, train, or develop?",

        "What leadership action did the member take?",

        "How many people were affected if that information was provided?",

        "What improved because of the leadership action?",

        "Did the action improve qualification, performance, teamwork, capability, or development?"

      ],

      keywords: [

        "led",

        "lead",

        "leader",

        "leadership",

        "team",

        "teams",

        "airmen",

        "airman",

        "members",

        "personnel",

        "technicians",

        "staff",

        "mentored",

        "mentor",

        "coached",

        "coach",

        "trained",

        "training",

        "developed",

        "development",

        "supervised",

        "supervision",

        "managed team",

        "instructed",

        "instructor",

        "qualified",

        "qualification",

        "morale",

        "professional development"

      ]

    },


    // ========================================================
    // MANAGING RESOURCES
    // ========================================================

    "managing-resources": {

      id:
        "managing-resources",

      label:
        "Managing Resources",

      shortDescription:
        "Responsible use of time, manpower, equipment, funding, facilities, and organizational resources.",

      focus: [

        "Manpower",

        "Equipment",

        "Funding",

        "Budget",

        "Time",

        "Facilities",

        "Supply",

        "Materiel",

        "Scheduling",

        "Resource allocation",

        "Stewardship",

        "Efficiency"

      ],

      questions: [

        "What resource did the member manage?",

        "What was the scope or value of the resource if provided?",

        "What decision improved the use of that resource?",

        "Did the action reduce waste, save time, improve availability, or increase efficiency?",

        "What factual result came from the resource decision?"

      ],

      keywords: [

        "budget",

        "funding",

        "funds",

        "dollars",

        "equipment",

        "resources",

        "resource",

        "manpower",

        "hours",

        "labor",

        "inventory",

        "supplies",

        "supply",

        "assets",

        "asset",

        "facility",

        "facilities",

        "schedule",

        "scheduling",

        "allocated",

        "allocation",

        "managed",

        "procured",

        "procurement",

        "saved",

        "savings",

        "reduced cost",

        "efficiency",

        "utilization"

      ]

    },


    // ========================================================
    // IMPROVING THE UNIT
    // ========================================================

    "improving-the-unit": {

      id:
        "improving-the-unit",

      label:
        "Improving the Unit",

      shortDescription:
        "Innovation, process improvement, problem solving, organizational advancement, and sustained improvement.",

      focus: [

        "Innovation",

        "Process improvement",

        "Organizational improvement",

        "Problem solving",

        "Efficiency",

        "Standardization",

        "Modernization",

        "Knowledge sharing",

        "Continuous improvement",

        "New capability"

      ],

      questions: [

        "What process, system, program, or capability did the member improve?",

        "What problem existed before the action?",

        "What did the member change?",

        "What measurable or observable improvement resulted?",

        "Did the improvement create a repeatable benefit for the organization?"

      ],

      keywords: [

        "improved",

        "improvement",

        "innovation",

        "innovated",

        "modernized",

        "modernization",

        "streamlined",

        "standardized",

        "automation",

        "automated",

        "process",

        "program",

        "developed",

        "created",

        "implemented",

        "initiative",

        "efficiency",

        "reduced",

        "eliminated",

        "redesigned",

        "revised",

        "system",

        "workflow",

        "procedure",

        "policy",

        "best practice",

        "continuous improvement"

      ]

    }

  });


// ============================================================
// 7. ACTION VERB LIBRARY
//
// These verbs are writing aids.
//
// The generator should only use a verb when it accurately
// describes what the user actually did.
// ============================================================

export const ACTION_VERBS =
  Object.freeze({


    leadership: [

      "led",

      "directed",

      "guided",

      "mentored",

      "coached",

      "supervised",

      "trained",

      "developed",

      "organized",

      "coordinated",

      "mobilized",

      "aligned"

    ],


    execution: [

      "executed",

      "completed",

      "delivered",

      "performed",

      "conducted",

      "supported",

      "resolved",

      "restored",

      "repaired",

      "inspected",

      "evaluated",

      "validated",

      "implemented"

    ],


    improvement: [

      "improved",

      "streamlined",

      "modernized",

      "standardized",

      "redesigned",

      "automated",

      "simplified",

      "optimized",

      "restructured",

      "enhanced",

      "reduced",

      "eliminated"

    ],


    creation: [

      "developed",

      "created",

      "built",

      "established",

      "designed",

      "launched",

      "instituted",

      "introduced",

      "produced"

    ],


    resourceManagement: [

      "managed",

      "allocated",

      "coordinated",

      "scheduled",

      "prioritized",

      "procured",

      "controlled",

      "distributed",

      "consolidated",

      "reallocated"

    ],


    analysis: [

      "analyzed",

      "assessed",

      "evaluated",

      "identified",

      "validated",

      "reviewed",

      "diagnosed",

      "investigated",

      "resolved"

    ],


    collaboration: [

      "coordinated",

      "partnered",

      "integrated",

      "collaborated",

      "aligned",

      "synchronized",

      "facilitated"

    ]

  });


// ============================================================
// 8. VERB INTEGRITY RULES
//
// Prevents verb inflation.
//
// Example:
// User says "helped with training"
// Generator should not automatically convert this to
// "directed organization-wide training".
// ============================================================

export const VERB_INTEGRITY_RULES =
  Object.freeze([

    {
      weak:
        "helped",

      possibleAlternatives: [
        "supported",
        "assisted",
        "contributed to"
      ],

      caution:
        "Do not upgrade to led, directed, or managed unless leadership is explicitly supported."
    },


    {
      weak:
        "worked on",

      possibleAlternatives: [
        "supported",
        "performed",
        "completed",
        "contributed to"
      ],

      caution:
        "Choose the replacement only when the source accomplishment supports it."
    },


    {
      weak:
        "was responsible for",

      possibleAlternatives: [
        "managed",
        "oversaw",
        "coordinated",
        "executed"
      ],

      caution:
        "Select a verb based on the actual action described."
    },


    {
      weak:
        "participated in",

      possibleAlternatives: [
        "supported",
        "contributed to",
        "performed"
      ],

      caution:
        "Do not imply leadership merely because the member participated."
    }

  ]);


// ============================================================
// 9. WEAK / VAGUE LANGUAGE
//
// Used later by opb-validator.js.
// ============================================================

export const VAGUE_LANGUAGE =
  Object.freeze([

    "did a great job",

    "worked hard",

    "helped out",

    "made things better",

    "very successful",

    "highly successful",

    "extremely effective",

    "significant impact",

    "major impact",

    "greatly improved",

    "outstanding performance",

    "excellent job",

    "critical role",

    "key role",

    "important role",

    "went above and beyond",

    "various",

    "numerous",

    "many",

    "several"

  ]);


// ============================================================
// 10. FILLER LANGUAGE
//
// These are not always wrong, but often indicate unnecessary
// wording.
// ============================================================

export const FILLER_PHRASES =
  Object.freeze([

    "in order to",

    "was able to",

    "successfully",

    "effectively",

    "efficiently",

    "played a role in",

    "served as",

    "responsible for",

    "worked diligently to",

    "made sure that",

    "helped to",

    "assisted with"

  ]);


// ============================================================
// 11. FIRST-PERSON LANGUAGE
// ============================================================

export const FIRST_PERSON_TERMS =
  Object.freeze([

    "i ",

    "i'm ",

    "i’ve ",

    "i've ",

    "my ",

    "mine ",

    "me ",

    "we ",

    "our ",

    "ours "

  ]);


// ============================================================
// 12. RESULT SIGNAL WORDS
//
// Useful for detecting whether source text already contains an
// outcome.
// ============================================================

export const RESULT_SIGNALS =
  Object.freeze([

    "resulted",

    "resulting",

    "completed",

    "increased",

    "decreased",

    "reduced",

    "improved",

    "restored",

    "enabled",

    "delivered",

    "achieved",

    "eliminated",

    "saved",

    "generated",

    "earned",

    "qualified",

    "certified",

    "accelerated",

    "prevented",

    "resolved",

    "produced",

    "raised",

    "lowered",

    "cut",

    "grew"

  ]);


// ============================================================
// 13. IMPACT SIGNAL WORDS
// ============================================================

export const IMPACT_SIGNALS =
  Object.freeze([

    "mission",

    "readiness",

    "capability",

    "availability",

    "operations",

    "operational",

    "efficiency",

    "effectiveness",

    "safety",

    "quality",

    "combat",

    "deployment",

    "response",

    "training",

    "development",

    "retention",

    "morale",

    "cost",

    "savings",

    "time",

    "productivity",

    "capacity",

    "performance"

  ]);


// ============================================================
// 14. SCOPE SIGNALS
//
// Used for factual scope detection.
// ============================================================

export const SCOPE_PATTERNS =
  Object.freeze([

    /\b\d+\s+(airmen|airman|members|personnel|people|technicians|employees|students|trainees)\b/i,

    /\b\d+\s+(aircraft|vehicles|systems|assets|items|inspections|missions|sorties|events|projects|programs)\b/i,

    /\$\s?\d[\d,.]*/i,

    /\b\d+(?:\.\d+)?\s?(?:%|percent)\b/i,

    /\b\d+\s+(hours|days|weeks|months|years)\b/i,

    /\b\d+\s+(units|squadrons|groups|wings|organizations|locations|bases)\b/i

  ]);


// ============================================================
// 15. NUMBER PROTECTION
//
// Numbers supplied by the user are treated as protected facts.
//
// The Universal engine should NEVER change a source number just
// because another value sounds better.
// ============================================================

export const NUMBER_INTEGRITY =
  Object.freeze({

    preserveUserNumbers:
      true,

    inferMissingNumbers:
      false,

    roundNumbers:
      false,

    convertApproximateToExact:
      false,

    changePercentages:
      false,

    changeDollarValues:
      false,

    createSavings:
      false,

    createPersonnelCounts:
      false,

    createMissionCounts:
      false

  });


// ============================================================
// 16. FACT INTEGRITY / ANTI-HALLUCINATION
// ============================================================

export const FACT_INTEGRITY_RULES =
  Object.freeze([

    "Every factual claim in the generated Performance Statement must be traceable to information supplied by the user.",

    "Never invent a number.",

    "Never invent a percentage.",

    "Never invent a dollar amount.",

    "Never invent a personnel count.",

    "Never invent an award.",

    "Never invent recognition.",

    "Never invent a ranking.",

    "Never claim first, best, largest, highest, fastest, or similar superiority unless the source explicitly supports it.",

    "Never invent mission readiness impact.",

    "Never invent lives saved or risk prevented.",

    "Never invent cost avoidance.",

    "Never invent time savings.",

    "Never invent promotion impact.",

    "Never invent inspection results.",

    "Never invent qualification outcomes.",

    "Never invent organizational scope.",

    "If the source lacks an impact statement, improve the result wording without manufacturing a broader impact.",

    "If the source is ambiguous, preserve the ambiguity rather than making the accomplishment more impressive than the evidence supports."

  ]);


// ============================================================
// 17. UNSUPPORTED SUPERLATIVES
// ============================================================

export const SUPERLATIVE_TERMS =
  Object.freeze([

    "best",

    "first",

    "only",

    "largest",

    "highest",

    "lowest",

    "fastest",

    "greatest",

    "unprecedented",

    "record",

    "record-setting",

    "historic",

    "number one",

    "#1",

    "top performer",

    "world-class"

  ]);


// ============================================================
// 18. ACRONYM GUIDANCE
//
// Universal generator intentionally avoids maintaining a giant
// AFSC-specific acronym dictionary.
//
// Career-field acronym intelligence can be added later.
// ============================================================

export const ACRONYM_GUIDANCE =
  Object.freeze({

    philosophy:
      "Use acronyms only when they improve readability and are reasonably understandable in context.",

    preserveUserAcronyms:
      true,

    inventAcronyms:
      false,

    expandUnknownAcronyms:
      false,

    removeAllAcronyms:
      false,

    guidance: [

      "Do not invent the meaning of an acronym.",

      "Do not automatically expand an acronym unless its meaning is known.",

      "Do not introduce unnecessary acronyms.",

      "Prefer readable plain language when an acronym creates confusion.",

      "Preserve specialized terms when replacing them would change the accomplishment."

    ]

  });


// ============================================================
// 19. OUTPUT QUALITY TARGETS
//
// These are generator design targets, NOT claims of official
// Air Force character limits.
// ============================================================

export const OUTPUT_TARGETS =
  Object.freeze({

    sentenceCount: {

      preferredMin:
        1,

      preferredMax:
        2

    },


    readability: {

      preferCompleteSentence:
        true,

      preferPlainLanguage:
        true,

      avoidLegacyBulletCompression:
        true

    },


    composition: {

      action:
        "required",

      scope:
        "when available",

      result:
        "strongly preferred",

      impact:
        "when supported"

    },


    characterLength: {

      officialLimit:
        null,

      note:
        "The Universal Generator does not treat a single character count as a universal official requirement. Any interface target should be considered a working writing target unless tied to a specific form or policy requirement."

    }

  });


// ============================================================
// 20. MPA AUTO-DETECTION WEIGHTS
//
// Used later by opb-universal.js.
//
// These values are internal matching weights, not official
// evaluation scoring.
// ============================================================

export const MPA_DETECTION_CONFIG =
  Object.freeze({

    exactKeywordWeight:
      3,

    partialKeywordWeight:
      1,

    leadershipVerbBonus:
      2,

    resourceSignalBonus:
      2,

    improvementSignalBonus:
      2,

    missionSignalBonus:
      2,

    defaultMPA:
      "executing-the-mission"

  });


// ============================================================
// 21. COMMON MPA CROSSOVER
//
// Accomplishments often legitimately touch more than one MPA.
//
// The generator selects the best primary fit but should not
// rewrite the accomplishment merely to force it into an MPA.
// ============================================================

export const MPA_CROSSOVER_GUIDANCE =
  Object.freeze({

    principle:
      "Select the MPA that best represents the central action and outcome of the accomplishment.",

    rules: [

      "A leadership accomplishment can also produce mission impact.",

      "A process improvement can also save resources.",

      "A resource-management action can also improve mission execution.",

      "Do not force an accomplishment into an MPA merely because one keyword appears.",

      "When multiple MPAs match, prioritize the member's central action rather than the broadest downstream outcome.",

      "The user-selected MPA should generally be honored unless the selection clearly conflicts with the source accomplishment."

    ]

  });


// ============================================================
// 22. WRITING PRIORITIES
//
// Order matters.
//
// Accuracy always comes before stronger wording.
// ============================================================

export const WRITING_PRIORITIES =
  Object.freeze([

    "FACTUAL ACCURACY",

    "CLEAR MEMBER ACTION",

    "RESULT",

    "MISSION OR ORGANIZATIONAL IMPACT",

    "SCOPE",

    "READABILITY",

    "STRONG VERB CHOICE",

    "CONCISION",

    "STYLE"

  ]);


// ============================================================
// 23. GENERATION RULES
//
// Direct instructions intended for opb-universal.js.
// ============================================================

export const GENERATION_RULES =
  Object.freeze([

    "Read the entire accomplishment before rewriting it.",

    "Identify the member's primary action.",

    "Identify factual scope.",

    "Identify direct result.",

    "Identify broader impact only when explicitly supported.",

    "Preserve all important source facts.",

    "Choose a strong but accurate action verb.",

    "Remove unnecessary filler.",

    "Combine related information into a natural Performance Statement.",

    "Do not use semicolon-heavy legacy bullet construction.",

    "Do not use telegraphic fragments merely to shorten the statement.",

    "Do not sacrifice readability for artificial compression.",

    "Do not add an unsupported mission impact merely to complete the Action-Scope-Result-Impact framework.",

    "Do not change numbers.",

    "Do not manufacture causal relationships.",

    "Return the strongest statement supported by the source accomplishment."

  ]);


// ============================================================
// 24. VALIDATION RULES
//
// Used later by opb-validator.js.
// ============================================================

export const VALIDATION_RULES =
  Object.freeze({

    requireAction:
      true,

    preferResult:
      true,

    requireImpact:
      false,

    requireScope:
      false,

    rejectInventedNumbers:
      true,

    warnOnUnsupportedSuperlatives:
      true,

    warnOnFirstPerson:
      true,

    warnOnVagueLanguage:
      true,

    warnOnExcessiveFiller:
      true,

    warnOnNoResult:
      true,

    warnOnNoAction:
      true

  });


// ============================================================
// 25. QUALITY LABELS
// ============================================================

export const QUALITY_LEVELS =
  Object.freeze({

    strong: {

      id:
        "strong",

      label:
        "Strong",

      description:
        "The statement clearly communicates the member's action and outcome with strong factual support."

    },


    review: {

      id:
        "review",

      label:
        "Review",

      description:
        "The statement is usable but may benefit from clearer scope, result, impact, or wording."

    },


    needsWork: {

      id:
        "needs-work",

      label:
        "Needs Review",

      description:
        "The statement is missing important information or contains wording that should be reviewed before use."

    }

  });


// ============================================================
// 26. HELPER — NORMALIZE MPA KEY
// ============================================================

export function normalizeMPAKey(
  value
) {

  const raw =
    String(
      value ?? ""
    )
      .trim()
      .toLowerCase();


  if (!raw) {

    return "auto";

  }


  const aliases = {

    auto:
      "auto",

    automatic:
      "auto",

    detect:
      "auto",


    "executing the mission":
      "executing-the-mission",

    mission:
      "executing-the-mission",

    execution:
      "executing-the-mission",


    "leading people":
      "leading-people",

    leadership:
      "leading-people",

    people:
      "leading-people",


    "managing resources":
      "managing-resources",

    resources:
      "managing-resources",

    resource:
      "managing-resources",


    "improving the unit":
      "improving-the-unit",

    improvement:
      "improving-the-unit",

    innovation:
      "improving-the-unit"

  };


  if (aliases[raw]) {

    return aliases[raw];

  }


  if (
    MPA_LABELS[raw]
  ) {

    return raw;

  }


  return "auto";

}


// ============================================================
// 27. HELPER — GET MPA LABEL
// ============================================================

export function getMPALabel(
  value
) {

  const key =
    normalizeMPAKey(
      value
    );


  return (
    MPA_LABELS[key] ||
    MPA_LABELS.auto
  );

}


// ============================================================
// 28. HELPER — GET MPA GUIDANCE
// ============================================================

export function getMPAGuidance(
  value
) {

  const key =
    normalizeMPAKey(
      value
    );


  if (
    key === "auto"
  ) {

    return null;

  }


  return (
    MPA_GUIDANCE[key] ||
    null
  );

}


// ============================================================
// 29. HELPER — GET ALL MPAs
// ============================================================

export function getAllMPAs() {

  return MPA_ORDER.map(
    (key) => ({
      ...MPA_GUIDANCE[key]
    })
  );

}


// ============================================================
// 30. HELPER — FLATTEN ACTION VERBS
// ============================================================

export function getAllActionVerbs() {

  return Array.from(
    new Set(
      Object.values(
        ACTION_VERBS
      ).flat()
    )
  );

}


// ============================================================
// 31. HELPER — UNIVERSAL GUIDANCE PACKET
//
// Provides opb-universal.js one centralized guidance object.
// ============================================================

export function getUniversalOPBGuidance() {

  return {

    version:
      OPB_GUIDANCE_VERSION,

    writingModel:
      WRITING_MODEL,

    principles:
      UNIVERSAL_WRITING_PRINCIPLES,

    statementRules:
      PERFORMANCE_STATEMENT_RULES,

    generationRules:
      GENERATION_RULES,

    writingPriorities:
      WRITING_PRIORITIES,

    mpaLabels:
      MPA_LABELS,

    mpaOrder:
      MPA_ORDER,

    mpaGuidance:
      MPA_GUIDANCE,

    mpaDetection:
      MPA_DETECTION_CONFIG,

    crossoverGuidance:
      MPA_CROSSOVER_GUIDANCE,

    actionVerbs:
      ACTION_VERBS,

    verbIntegrity:
      VERB_INTEGRITY_RULES,

    vagueLanguage:
      VAGUE_LANGUAGE,

    fillerPhrases:
      FILLER_PHRASES,

    firstPersonTerms:
      FIRST_PERSON_TERMS,

    resultSignals:
      RESULT_SIGNALS,

    impactSignals:
      IMPACT_SIGNALS,

    scopePatterns:
      SCOPE_PATTERNS,

    numberIntegrity:
      NUMBER_INTEGRITY,

    factIntegrity:
      FACT_INTEGRITY_RULES,

    superlatives:
      SUPERLATIVE_TERMS,

    acronymGuidance:
      ACRONYM_GUIDANCE,

    outputTargets:
      OUTPUT_TARGETS,

    validationRules:
      VALIDATION_RULES,

    qualityLevels:
      QUALITY_LEVELS

  };

}


// ============================================================
// 32. MASTER EXPORT
// ============================================================

export const OPB_GUIDANCE =
  Object.freeze({

    version:
      OPB_GUIDANCE_VERSION,

    model:
      WRITING_MODEL,

    principles:
      UNIVERSAL_WRITING_PRINCIPLES,

    performanceStatementRules:
      PERFORMANCE_STATEMENT_RULES,

    mpaLabels:
      MPA_LABELS,

    mpaOrder:
      MPA_ORDER,

    mpaGuidance:
      MPA_GUIDANCE,

    mpaDetection:
      MPA_DETECTION_CONFIG,

    mpaCrossover:
      MPA_CROSSOVER_GUIDANCE,

    actionVerbs:
      ACTION_VERBS,

    verbIntegrity:
      VERB_INTEGRITY_RULES,

    vagueLanguage:
      VAGUE_LANGUAGE,

    filler:
      FILLER_PHRASES,

    firstPerson:
      FIRST_PERSON_TERMS,

    resultSignals:
      RESULT_SIGNALS,

    impactSignals:
      IMPACT_SIGNALS,

    scopePatterns:
      SCOPE_PATTERNS,

    numberIntegrity:
      NUMBER_INTEGRITY,

    factIntegrity:
      FACT_INTEGRITY_RULES,

    unsupportedSuperlatives:
      SUPERLATIVE_TERMS,

    acronymGuidance:
      ACRONYM_GUIDANCE,

    outputTargets:
      OUTPUT_TARGETS,

    generationRules:
      GENERATION_RULES,

    validationRules:
      VALIDATION_RULES,

    writingPriorities:
      WRITING_PRIORITIES,

    qualityLevels:
      QUALITY_LEVELS

  });


// ============================================================
// 33. DEFAULT EXPORT
// ============================================================

export default OPB_GUIDANCE;


// ============================================================
// END
// THEWING.AI • UNIVERSAL OPB GENERATOR
// data/opb-guidance.js v1.0.0
// ============================================================
