// public/ask-amy/af-evaluations.js
// ============================================================
// TheWing.ai • Ask Amy Air Force Evaluations Guidance Engine
// Version: 2026.1
//
// SOURCE BASIS
// - AFI 36-2406, Officer and Enlisted Evaluations Systems,
//   22 August 2025
// - AFI36-2406_AFGM2026-01, 7 August 2026
//
// PURPOSE
// - Deterministic policy layer for EPB/OPB guidance.
// - Maps performance to MPAs / ALQs.
// - Explains grade-specific promotion / stratification rules.
// - Builds mandatory fitness comments.
// - Audits draft performance statements for structural compliance.
// - Produces a Truth Packet that Ask Amy can explain.
//
// IMPORTANT
// - This module does NOT award Promote Now, Must Promote,
//   Definitely Promote, stratifications, or official ratings.
// - AFSC occupational knowledge belongs in separate AFSC modules.
// - Evaluations are CUI. Do not place classified or protected
//   information into a public AI workflow.
// ============================================================


// ============================================================
// 1. VERSION / SOURCE
// ============================================================

export const AF_EVALUATIONS_VERSION = "af-evaluations-2026.1";

export const AF_EVALUATIONS_REFERENCE = freeze({
  publication: "AFI 36-2406",
  title: "Officer and Enlisted Evaluations Systems",
  baseDocumentDate: "22 August 2025",
  guidanceMemorandum: "AFI36-2406_AFGM2026-01",
  guidanceMemorandumDate: "7 August 2026",
  appliesTo: ["RegAF", "AFR", "ANG"],
  primarySystem: "myEval",

  note:
    "The 7 August 2026 guidance memorandum controls where inconsistent with the base AFI. Re-verify this module whenever AFI 36-2406 or its guidance memoranda change."
});


function ref(section, title = "") {
  return freeze({
    document: AF_EVALUATIONS_REFERENCE.publication,
    guidanceMemorandum:
      AF_EVALUATIONS_REFERENCE.guidanceMemorandum,
    section,
    title: title || section
  });
}


// ============================================================
// 2. HELPERS
// ============================================================

function freeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const nested of Object.values(value)) {
    freeze(nested);
  }

  return value;
}


function text(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}


function lower(value) {
  return text(value).toLowerCase();
}


function object(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? { ...value }
    : {};
}


function uniq(values = []) {
  const seen = new Set();

  return values
    .map(text)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}


function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n = Number(
    String(value).replace(/[$,%\s,]/g, "")
  );

  return Number.isFinite(n) ? n : null;
}


function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return value !== 0;
  }

  const v = lower(value);

  if (
    [
      "yes",
      "true",
      "1",
      "y",
      "current",
      "required"
    ].includes(v)
  ) {
    return true;
  }

  if (
    [
      "no",
      "false",
      "0",
      "n",
      "none",
      "not required"
    ].includes(v)
  ) {
    return false;
  }

  return fallback;
}


function cleanObject(value) {
  if (Array.isArray(value)) {
    return value
      .map(cleanObject)
      .filter(
        (item) =>
          item !== "" &&
          item !== null &&
          item !== undefined
      );
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const out = {};

  for (const [key, item] of Object.entries(value)) {
    const cleaned = cleanObject(item);

    if (
      cleaned === "" ||
      cleaned === null ||
      cleaned === undefined
    ) {
      continue;
    }

    if (
      Array.isArray(cleaned) &&
      cleaned.length === 0
    ) {
      continue;
    }

    if (
      cleaned &&
      typeof cleaned === "object" &&
      !Array.isArray(cleaned) &&
      Object.keys(cleaned).length === 0
    ) {
      continue;
    }

    out[key] = cleaned;
  }

  return out;
}


// ============================================================
// 3. GRADE NORMALIZATION
// ============================================================

export function normalizeGrade(value) {
  const raw = text(value)
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!raw) return "";

  const map = {
    AB: "E-1",
    AMN: "E-2",
    A1C: "E-3",
    SRA: "E-4",
    SSGT: "E-5",
    TSGT: "E-6",
    MSGT: "E-7",
    SMSGT: "E-8",
    CMSGT: "E-9",

    WO1: "W-1",
    CW2: "W-2",
    CW3: "W-3",
    CW4: "W-4",
    CW5: "W-5",

    "2LT": "O-1",
    "1LT": "O-2",
    CAPT: "O-3",
    MAJ: "O-4",
    LTCOL: "O-5",
    COL: "O-6"
  };

  if (map[raw]) {
    return map[raw];
  }

  if (/^[EOW]-?\d{1,2}$/.test(raw)) {
    return raw.includes("-")
      ? raw
      : `${raw[0]}-${raw.slice(1)}`;
  }

  return raw;
}


function gradeData(value) {
  const grade = normalizeGrade(value);

  const match = grade.match(
    /^([EOW])-(\d{1,2})$/
  );

  if (!match) return null;

  return {
    grade,
    category: match[1],
    number: Number(match[2])
  };
}


function normalizeComponent(value) {
  const v = lower(value);

  if (/guard|\bang\b/.test(v)) {
    return "ANG";
  }

  if (/reserve|\bafr\b|resaf/.test(v)) {
    return "AFR";
  }

  if (/regular|regaf|active/.test(v)) {
    return "RegAF";
  }

  return text(value) || "USAF";
}


// ============================================================
// 4. MAJOR PERFORMANCE AREAS
// ============================================================

export const AF_EVALUATION_MPA = freeze({

  executing_mission: {
    id: "executing_mission",
    label: "Executing the Mission",

    alqs: [
      "job_proficiency",
      "initiative",
      "adaptability"
    ],

    lens:
      "Uses knowledge, initiative, and adaptability to produce timely, high-quality or high-quantity results that positively impact the mission.",

    reference: ref(
      "1.6.3.12.1",
      "Executing the Mission"
    )
  },


  leading_people: {
    id: "leading_people",
    label: "Leading People",

    alqs: [
      "collaboration",
      "emotional_intelligence",
      "communication"
    ],

    lens:
      "Fosters cohesive teams, communicates effectively, uses emotional intelligence, takes care of people, and accomplishes the mission.",

    reference: ref(
      "1.6.3.12.2",
      "Leading People"
    )
  },


  managing_resources: {
    id: "managing_resources",
    label: "Managing Resources",

    alqs: [
      "stewardship",
      "accountability"
    ],

    lens:
      "Manages assigned resources effectively and accepts responsibility for actions and behaviors to maximize organizational performance.",

    reference: ref(
      "1.6.3.12.3",
      "Managing Resources"
    )
  },


  improving_unit: {
    id: "improving_unit",
    label: "Improving the Unit",

    alqs: [
      "decision_making",
      "innovation"
    ],

    lens:
      "Uses critical thinking and innovation to find effective solutions and improve mission execution.",

    reference: ref(
      "1.6.3.12.4",
      "Improving the Unit"
    )
  }

});


// ============================================================
// 5. AIRMAN LEADERSHIP QUALITIES
// ============================================================

export const AF_EVALUATION_ALQS = freeze({

  job_proficiency: {
    label: "Job Proficiency",
    mpa: "executing_mission",

    definition:
      "Knowledge and professional skill in assigned duties producing positive mission results."
  },


  initiative: {
    label: "Initiative",
    mpa: "executing_mission",

    definition:
      "Takes independent or directed action to complete tasks or missions that influence the organization."
  },


  adaptability: {
    label: "Adaptability",
    mpa: "executing_mission",

    definition:
      "Adjusts to changing plans, information, processes, requirements, conditions, and obstacles."
  },


  collaboration: {
    label: "Collaboration",
    mpa: "leading_people",

    definition:
      "Works with others toward shared objectives as part of a cohesive team."
  },


  emotional_intelligence: {
    label: "Emotional Intelligence",
    mpa: "leading_people",

    definition:
      "Uses self-awareness, manages emotions, recognizes others' emotions, and manages relationships appropriately."
  },


  communication: {
    label: "Communication",
    mpa: "leading_people",

    definition:
      "Communicates clearly and in a timely manner, actively listens, and tailors messaging to the audience."
  },


  stewardship: {
    label: "Stewardship",
    mpa: "managing_resources",

    definition:
      "Responsibly manages resources such as time, equipment, people, funds, and facilities."
  },


  accountability: {
    label: "Accountability",
    mpa: "managing_resources",

    definition:
      "Accepts responsibility for self/team actions and demonstrates reliability and transparency."
  },


  decision_making: {
    label: "Decision Making",
    mpa: "improving_unit",

    definition:
      "Makes informed, effective, timely decisions while weighing constraints, risks, and benefits."
  },


  innovation: {
    label: "Innovation",
    mpa: "improving_unit",

    definition:
      "Uses creative approaches, implements improvements, and takes calculated risks when appropriate."
  }

});


// ============================================================
// 6. WHOLE PERSON RULE
// ============================================================

export const AF_EVALUATION_WHOLE_PERSON_RULE =
  freeze({

    evaluateRelativeTo: [
      "specific grade",
      "AFSC",
      "level of responsibility",
      "assigned duties",
      "entire rating period"
    ],

    evaluateWhat:
      "what the Airman accomplished / achieved objectives",

    evaluateHow:
      "how well the Airman demonstrated applicable ALQs",

    reference: ref(
      "1.6.3.11-1.6.3.12",
      "Integrated MPA/ALQ framework"
    )

  });


// ============================================================
// 7. PERFORMANCE STATEMENT RULES
// ============================================================

export const AF_EVALUATION_PERFORMANCE_STATEMENT_RULES =
  freeze({

    minimumPerSection: 1,

    unusedSectionText:
      "THIS SECTION NOT USED",

    standaloneSentenceRequired: true,

    requiredElements: [
      "behavior_or_action",
      "impact_result_or_outcome"
    ],

    universalCharacterLimit: null,

    characterLimitNote:
      "AFI 36-2406 requires EPB/OPB comments to fit the space provided; it does not establish one universal 350-character limit for all MPA statements.",

    whiteSpaceAuthorized: true,

    prohibitedEmphasis: [
      "underline for emphasis",
      "all-caps emphasis",
      "bold emphasis",
      "unusual fonts or characters",
      "multiple exclamation marks",
      "headings used only for emphasis"
    ],

    acronyms:
      "Limit acronyms and abbreviations. When used, they must be on the AFPC approved acronym/abbreviation list or an approved category.",

    references: [
      ref(
        "1.3.3.2",
        "Performance statements"
      ),

      ref(
        "1.3.4",
        "Special formatting"
      ),

      ref(
        "1.3.6.2",
        "Acronyms and abbreviations"
      )
    ]

  });


// ============================================================
// 8. PROMOTION RECOMMENDATIONS
// ============================================================

export const AF_EVALUATION_PROMOTION_RECOMMENDATIONS =
  freeze({

    enlisted: {

      P: {
        code: "P",
        label: "Promote",

        grades: [
          "E-4",
          "E-5",
          "E-6"
        ],

        meaning:
          "Recommended for promotion based on performance at or above DAF standards and expectations and generally commensurate with peers."
      },


      MP: {
        code: "MP",
        label: "Must Promote",

        grades: [
          "E-4",
          "E-5",
          "E-6"
        ],

        meaning:
          "Recommended for accelerated promotion based on stellar performance well above DAF standards and expectations; intended for outstanding performers above peers."
      },


      PN: {
        code: "PN",
        label: "Promote Now",

        grades: [
          "E-4",
          "E-5",
          "E-6"
        ],

        meaning:
          "Recommended for immediate promotion based on exemplary performance that far exceeds DAF standards and expectations; reserved for elite performers well above their peer group."
      },


      NRN: {
        code: "NRN",
        label: "Not Ready Now",

        grades: [
          "E-4",
          "E-5",
          "E-6"
        ],

        meaning:
          "Not considered ready for promotion at this time because additional grooming or attention to standards may be needed. NRN does not automatically make the evaluation referral if no negative comments are present."
      }

    },


    officerPRF: {

      DP: {
        code: "DP",
        label: "Definitely Promote",

        meaning:
          "The strength of performance and performance-based potential warrants promotion."
      },


      P: {
        code: "P",
        label: "Promote",

        meaning:
          "Qualified for promotion and should compete on the authorized record of performance and potential."
      },


      DNP: {
        code: "DNP",
        label: "Do Not Promote This Board",

        meaning:
          "Performance and performance-based potential do not warrant promotion by the board for which the officer is eligible."
      }

    },


    warning:
      "Promotion recommendations are official evaluator/board determinations. TheWing may explain standards but must not claim to officially award one.",

    references: [

      ref(
        "Table 4.9, Item 23",
        "Enlisted promotion recommendation"
      ),

      ref(
        "4.18",
        "Enlisted forced distribution"
      ),

      ref(
        "Chapter 8",
        "Officer PRF / MLR"
      )

    ]

  });


// ============================================================
// 9. FORCED DISTRIBUTION
// ============================================================

export const AF_EVALUATION_FORCED_DISTRIBUTION =
  freeze({

    component: "RegAF",

    appliesTo: [
      "E-4",
      "E-5",
      "E-6"
    ],

    publishedAllocationRates: {

      "E-4": {
        promoteNowPct: 5,
        mustPromotePct: 15
      },

      "E-5": {
        promoteNowPct: 5,
        mustPromotePct: 10
      },

      "E-6": {
        promoteNowPct: 5,
        mustPromotePct: 10
      }

    },


    controllingRule:
      "Use the actual allocations AFPC provides on the final MEL; published tables/rates are subject to change.",


    fitnessGate:
      "Required - Not Current or Unsatisfactory fitness status as of the SCOD makes a promotion-eligible Airman ineligible for Must Promote and Promote Now consideration.",


    selectionStandard:
      "Best-qualified basis; selected Airmen must be fully qualified for the next higher grade. Relative performance, leadership/followership, and potential for the next grade are considered.",


    noPromoteNowScore:
      "AFI 36-2406 does not provide a deterministic Promote Now score that can be calculated from one statement.",


    references: [

      ref(
        "4.18.4",
        "Forced distribution allocations"
      ),

      ref(
        "4.18.6",
        "Eligibility and nominations"
      ),

      ref(
        "4.18.9",
        "EFDP scoring"
      )

    ]

  });


// ============================================================
// 10. SNCO STRATIFICATION
// ============================================================

export const AF_EVALUATION_SNCO_STRATIFICATION =
  freeze({

    appliesTo: [
      "E-7",
      "E-8"
    ],

    components: [
      "RegAF",
      "AFR"
    ],

    maxPercentStratified: 25,


    "E-7": {
      numeratorDenominatorTopPct: 10,
      additionalTop25Pct: 15
    },


    "E-8": {
      numeratorDenominatorTopPct: 20,
      additionalTop25Pct: 5
    },


    automatic: false,


    note:
      "Senior-rater stratification/endorsement is not automatic or mandatory and remains subject to TIG/TIS, fitness, component, SRID, and eligibility rules.",


    references: [

      ref(
        "4.11",
        "SNCO senior-rater eligibility"
      ),

      ref(
        "Table 4.9, Item 24",
        "MSgt/SMSgt stratification"
      ),

      ref(
        "Tables 4.10-4.11",
        "SNCO stratification tables"
      )

    ]

  });


// ============================================================
// 11. CMSGT HIGHER RESPONSIBILITY
// ============================================================

export const AF_EVALUATION_CMSGT_RESPONSIBILITY =
  freeze({

    READY_NOW:
      "Ready to immediately assume greater responsibility in a more challenging position than currently held.",

    ON_TRACK:
      "Excelling in the current position, demonstrating growth potential, and ready to transition at the first available opportunity.",

    CURRENT_ASSIGNMENT:
      "Should remain in the current assignment because of timing, experience, expertise, tour-length, or nominative-position considerations.",

    GROOM:
      "Requires additional grooming in the current duty position or as a CMSgt before placement in greater responsibility.",

    DO_NOT_RETAIN:
      "Not recommended for retention; this creates a referral evaluation and requires the applicable senior-rater comments.",

    reference: ref(
      "Table 4.9, Item 22",
      "CMSgt Higher Responsibility"
    )

  });


// ============================================================
// 12. COMBAT-RELATED AFSCs
// ============================================================

export const AF_EVALUATION_COMBAT_AFSC =
  freeze([

    "19ZXA",
    "19ZXB",
    "19ZXC",

    "1Z1X1",
    "1Z2X1",
    "1Z3X1",
    "1Z4X1",

    "3E8X1",
    "32EXH"

  ]);


export function isCombatAfsc(value) {
  const afsc = text(value)
    .toUpperCase()
    .replace(/\s+/g, "");

  return AF_EVALUATION_COMBAT_AFSC.includes(
    afsc
  );
}


// ============================================================
// 13. FITNESS NORMALIZATION
// ============================================================

function normalizeFitness(profile = {}) {
  const p = object(profile);
  const f = object(p.fitness);

  return cleanObject({

    score: numberOrNull(
      f.score ??
      p.fitness_score ??
      p.pfa_score
    ),


    category: text(
      f.category ??
      p.fitness_category ??
      p.pfa_category
    ),


    exemptions:
      Array.isArray(
        f.exemptions ??
        p.fitness_exemptions
      )
        ? uniq(
            f.exemptions ??
            p.fitness_exemptions
          )

        : text(
            f.exemptions ??
            p.fitness_exemptions
          )
          ? [
              text(
                f.exemptions ??
                p.fitness_exemptions
              )
            ]
          : [],


    current: bool(
      f.current ??
      p.fitness_current,
      true
    ),


    requiredNotCurrent:

      bool(
        f.requiredNotCurrent ??
        p.required_not_current,
        false
      )

      ||

      /required\s*-?\s*not\s*current/i.test(
        text(
          f.category ??
          p.fitness_category
        )
      ),


    fullyExempt: bool(
      f.fullyExempt ??
      p.fully_exempt,
      false
    ),


    fullExemptReason: text(
      f.fullExemptReason ??
      p.full_exempt_reason
    ),


    cftScore: numberOrNull(
      f.cftScore ??
      p.cft_score
    ),


    cftCategory: text(
      f.cftCategory ??
      p.cft_category
    ),


    cftExemptions:

      Array.isArray(
        f.cftExemptions ??
        p.cft_exemptions
      )

        ? uniq(
            f.cftExemptions ??
            p.cft_exemptions
          )

        : text(
            f.cftExemptions ??
            p.cft_exemptions
          )

          ? [
              text(
                f.cftExemptions ??
                p.cft_exemptions
              )
            ]

          : [],


    cftNotRequired: bool(
      f.cftNotRequired ??
      p.cft_not_required,
      false
    )

  });
}


// ============================================================
// 14. MANDATORY FITNESS COMMENT
// ============================================================

export function buildFitnessMandatoryComment(
  profile = {}
) {

  const p =
    normalizeAfEvaluationProfile(profile);

  const f =
    p.fitness || {};

  const warnings = [];


  let pfa = "";


  if (
    f.requiredNotCurrent ||
    f.current === false
  ) {

    pfa =
      "PFA: Required - Not Current";

  }

  else if (f.fullyExempt) {

    pfa =
      `PFA: Fully Exempt${
        f.fullExemptReason
          ? `; ${f.fullExemptReason}`
          : ""
      }`;

  }

  else if (
    f.score !== null &&
    f.score !== undefined
  ) {

    const exemptions =
      f.exemptions?.length
        ? f.exemptions.join(", ")
        : "None";


    pfa =
      `PFA: ${f.score}; ` +
      `${f.category || "Category not provided"}; ` +
      `Exemptions: ${exemptions}`;

  }


  if (!pfa) {

    warnings.push(
      "Official PFA result is not available."
    );

  }


  let cft = "";


  if (isCombatAfsc(p.afsc)) {

    if (f.cftNotRequired) {

      cft =
        "CFT: Not Required";

    }

    else if (
      f.cftScore !== null &&
      f.cftScore !== undefined
    ) {

      const exemptions =
        f.cftExemptions?.length
          ? f.cftExemptions.join(", ")
          : "None";


      cft =
        `CFT: ${f.cftScore}; ` +
        `${f.cftCategory || "Category not provided"}; ` +
        `Exemptions: ${exemptions}`;

    }

    else {

      warnings.push(
        "Combat-related AFSC detected but an official CFT result/status was not provided."
      );

    }

  }


  return cleanObject({

    required: true,

    comment:
      [pfa, cft]
        .filter(Boolean)
        .join(" / "),

    combatAfsc:
      isCombatAfsc(p.afsc),

    warnings,

    reference: ref(
      "1.4.10 / Tables 3.1 and 4.9",
      "Mandatory fitness documentation"
    )

  });

}


// ============================================================
// 15. FORM SCHEMAS
// ============================================================

const MPA_SECTIONS =
  freeze([

    {
      id: "executing_mission",
      label: "Executing the Mission",
      required: true
    },

    {
      id: "leading_people",
      label: "Leading People",
      required: true
    },

    {
      id: "managing_resources",
      label: "Managing Resources",
      required: true
    },

    {
      id: "improving_unit",
      label: "Improving the Unit",
      required: true
    }

  ]);


// ============================================================
// EPB
// ============================================================

export const AF_EVALUATION_FORM_SCHEMAS =
  freeze({

    EPB: {

      id: "EPB",

      title:
        "Enlisted Performance Brief",

      system:
        "myEval",

      offlineForm:
        "AF Form 716 (exception use)",


      sections: [

        {
          id: "ratee_data",
          label: "Ratee Data"
        },

        {
          id: "duty_description",
          label: "Duty Description",
          required: true
        },

        ...MPA_SECTIONS,

        {
          id: "mandatory_comments",
          label: "Mandatory Comments",
          required: true
        },

        {
          id: "rater",
          label:
            "Rater Assessment / Certification"
        },

        {
          id: "hlr",
          label:
            "Higher Level Reviewer Assessment",
          required: true
        },

        {
          id: "additional_comments",
          label:
            "Additional Comments",
          conditional: true
        },

        {
          id: "referral",
          label:
            "Referral Report",
          conditional: true
        },

        {
          id: "ratee_acknowledgement",
          label:
            "Ratee Acknowledgement"
        }

      ],


      gradeSpecific: {

        "E-4_to_E-6": [
          "promotion recommendation if eligible"
        ],

        "E-7_to_E-8": [
          "authorized senior-rater stratification if eligible",
          "future roles"
        ],

        "E-9": [
          "higher responsibility",
          "future roles"
        ]

      },


      reference: ref(
        "Table 4.9",
        "Enlisted ALQ Evaluation / EPB"
      )

    },


// ============================================================
// OPB
// ============================================================

    OPB: {

      id: "OPB",

      title:
        "Officer Performance Brief",

      system:
        "myEval",

      offlineForm:
        "AF Form 715 (exception use)",


      sections: [

        {
          id: "ratee_data",
          label: "Ratee Data"
        },

        {
          id: "duty_description",
          label: "Duty Description",
          required: true
        },

        {
          id: "rater_stratification",
          label:
            "Rater Stratification",
          conditional: true
        },

        ...MPA_SECTIONS,

        {
          id: "mandatory_comments",
          label: "Mandatory Comments",
          required: true
        },

        {
          id: "rater",
          label:
            "Rater Assessment / Certification"
        },

        {
          id: "hlr_stratification",
          label:
            "HLR Stratification",
          conditional: true
        },

        {
          id: "hlr_assessment",
          label:
            "HLR Assessment",
          required: true
        },

        {
          id: "functional_examiner",
          label:
            "Functional Examiner / Air Force Advisor",
          conditional: true
        },

        {
          id: "referral",
          label:
            "Referral Report",
          conditional: true
        },

        {
          id: "ratee_acknowledgement",
          label:
            "Ratee Acknowledgement"
        }

      ],


      reference: ref(
        "Table 3.1",
        "Officer ALQ Evaluation / OPB"
      )

    },


// ============================================================
// FEEDBACK
// ============================================================

    FEEDBACK: {

      id: "FEEDBACK",

      title:
        "Performance Objectives and Feedback",

      form:
        "AF Form 717",

      cycle: [
        "initial",
        "midterm",
        "final"
      ],

      reference: ref(
        "Chapter 2 / Table 2.2",
        "Performance Feedback"
      )

    },


// ============================================================
// LOE
// ============================================================

    LOE: {

      id: "LOE",

      title:
        "Letter of Evaluation",

      form:
        "DAF Form 77",

      types: [
        "formal",
        "informal",
        "supplemental",
        "administrative",
        "deployed commander"
      ],

      reference: ref(
        "Chapter 5",
        "Letter of Evaluation"
      )

    },


// ============================================================
// TRAINING REPORT
// ============================================================

    TR: {

      id: "TR",

      title:
        "Education/Training Report",

      form:
        "DAF Form 475",

      reference: ref(
        "Chapter 6",
        "Education/Training Report"
      )

    },


// ============================================================
// PRF
// ============================================================

    PRF: {

      id: "PRF",

      title:
        "Promotion Recommendation",

      form:
        "DAF Form 709",

      reference: ref(
        "Chapter 8",
        "Promotion Recommendation / MLR"
      )

    },


// ============================================================
// RRF
// ============================================================

    RRF: {

      id: "RRF",

      title:
        "Retention Recommendation",

      form:
        "DAF Form 3538 / 3538E",

      reference: ref(
        "Chapter 9",
        "Retention Recommendation"
      )

    }

  });


// ============================================================
// 16. MASTER POLICY SUMMARY
// ============================================================

export const AF_EVALUATION_RULES =
  freeze({

    purpose: {

      communicateStandardsAndFeedback:
        true,

      createCumulativePerformanceRecord:
        true,

      supportPromotionPotentialAndTalentManagement:
        true,

      reference:
        ref(
          "1.1",
          "Purpose"
        )

    },


// ============================================================
// SECURITY
// ============================================================

    security: {

      evaluationsAreCUI:
        true,

      classifiedInformationProhibited:
        true,

      reference:
        ref(
          "1.3.1-1.3.2",
          "CUI / classified information"
        )

    },


// ============================================================
// RATEE INPUT
// ============================================================

    rateeInput: {

      accomplishmentsMayBeProvided:
        true,

      rateeMustNotBeDirectedToDraftReport:
        true,

      reference:
        ref(
          "1.6.3.6",
          "Ratee inputs"
        )

    },


    wholePerson:
      AF_EVALUATION_WHOLE_PERSON_RULE,


    performanceStatements:
      AF_EVALUATION_PERFORMANCE_STATEMENT_RULES,


// ============================================================
// FEEDBACK
// ============================================================

    feedback: {

      initialWithinDays:
        60,

      initialAtBeginningOfEveryCycle:
        true,

      midterm:
        "Midway between the date supervision begins and the projected close-out date of the next evaluation.",

      final:
        "Conducted with the completed evaluation and within 60 calendar days after close-out.",

      rateeRequestedWithinDays:
        30,

      fitnessReviewRequired:
        true,

      missedFeedbackRequiresSpecificReason:
        true,

      administrativeOversightNotAcceptable:
        true,

      references: [

        ref(
          "Chapter 2",
          "Performance Feedback"
        ),

        ref(
          "Table 2.1",
          "Feedback timing"
        ),

        ref(
          "1.9.6",
          "Missed feedback explanation"
        )

      ]

    },


// ============================================================
// MANDATORY COMMENTS
// ============================================================

    mandatoryComments: {

      fitness:
        true,

      commanderClimateIfApplicable:
        true,

      privatizedHousingIfApplicable:
        true,

      votingAssistanceIfApplicable:
        true,

      raterUnavailableOrRemovedIfApplicable:
        true,

      missedFeedbackReasonIfApplicable:
        true,

      exactQuotedLanguageMustBeUsedWhenTheAFIPrescribesIt:
        true,

      reference:
        ref(
          "1.9",
          "Mandatory Comments"
        )

    },


// ============================================================
// REFERRAL
// ============================================================

    referral: {

      dueProcessRequired:
        true,

      vagueNegativeCommentsProhibited:
        true,

      ifInDoubtRefer:
        true,

      rateeResponseOpportunityRequired:
        true,

      faceToFaceRequired:
        true,

      remoteFaceToFaceAllowedIfSeparated:
        true,

      trigger:
        "Derogatory comments or comments implying conduct, character, judgment, integrity, or performance below minimum acceptable standards can make an evaluation referral.",

      reference:
        ref(
          "1.11",
          "Referral Evaluations"
        )

    },


// ============================================================
// PROHIBITED COMMENTS
// ============================================================

    prohibited: {

      classifiedInformation:
        true,

      protectedSafetyInvestigationInformation:
        true,

      protectedAppealOrComplaintActivity:
        true,

      alcoholDrugRehabilitationOrDiagnosis:
        true,

      medicalDiagnosisConditionOrTreatment:
        true,

      PRPDisqualificationStatus:
        true,

      protectedPersonalCharacteristicsAsEvaluationCriteria:
        true,

      familyOrMaritalStatus:
        true,

      clubMembership:
        true,

      separationOrRetirementStatusAsSuch:
        true,

      unrelatedCivilianEmployment:
        true,

      references: [

        ref(
          "1.12",
          "General prohibited comments"
        ),

        ref(
          "3.16",
          "Officer prohibited comments"
        ),

        ref(
          "4.16",
          "Enlisted prohibited comments"
        )

      ]

    },


// ============================================================
// OFFICER RULES
// ============================================================

    officer: {

      promotionPushToNextGradeOnOPBProhibited:
        true,

      stratificationOnlyInAuthorizedFields:
        true,

      veiledStratificationProhibited:
        true,

      references: [

        ref(
          "3.15",
          "Officer stratification"
        ),

        ref(
          "3.16",
          "Unauthorized officer comments"
        )

      ]

    },


// ============================================================
// ENLISTED RULES
// ============================================================

    enlisted: {

      juniorNCOstratificationInPerformanceStatementsProhibited:
        true,

      ABthroughTSgtNextGradePromotionPushProhibited:
        true,

      factualPromotionSelectionStatementsAuthorized:
        true,

      commissioningSourcePushesAuthorized:
        true,

      SNCOpromotionStatementOnlyByHLRWhenEligible:
        true,

      SNCOpromotionStatementLimitedToNextHigherGrade:
        true,

      references: [

        ref(
          "4.10",
          "Junior enlisted / NCO rules"
        ),

        ref(
          "4.15",
          "Authorized enlisted comments"
        )

      ]

    },


// ============================================================
// CHAPLAIN 2026 UPDATE
// ============================================================

    chaplain2026: {

      ministryCentricOPB:
        true,

      focus: [
        "religious services",
        "pastoral care",
        "command advisement",
        "operational religious support"
      ],

      fieldGradeAndSeniorAdditionalFocus: [
        "leadership",
        "mentorship",
        "support of Chaplain Corps teams"
      ],

      references: [

        ref(
          "AFGM 1.7.1.5",
          "Chaplain rating chain"
        ),

        ref(
          "AFGM 1.7.1.5.1",
          "Chaplain OPB perspective"
        ),

        ref(
          "AFGM 1.6.7.5",
          "Chaplain Functional Examiner"
        )

      ]

    },


// ============================================================
// APPEALS
// ============================================================

    appeals: {

      firstFormalRelief:
        "ERAB",

      regafRoute:
        "vMPF",

      arcRoute:
        "DAF Form 948 through myFSS AAQ",

      finalRelief:
        "AFBCMR using DD Form 149 after required avenues are exhausted",

      retiredOrSeparatedRoute:
        "AFBCMR",

      feedbackSessionsAppealable:
        false,

      normalTimeLimitYears:
        3,

      normalProcessingDays:
        "90-120",

      references: [

        ref(
          "Chapter 10",
          "Correcting Evaluations"
        ),

        ref(
          "10.5",
          "Time limits"
        )

      ]

    }

  });


// ============================================================
// 17. PROFILE NORMALIZATION
// ============================================================

export function normalizeAfEvaluationProfile(
  profile = {}
) {

  const p =
    object(profile);


  const grade =
    normalizeGrade(
      p.grade ??
      p.rank ??
      p.pay_grade
    );


  const afsc =
    text(
      p.afsc ??
      p.dafsc ??
      p.AFSC
    )
      .toUpperCase()
      .replace(/\s+/g, "");


  return cleanObject({

    grade,

    rank:
      grade,

    component:
      normalizeComponent(
        p.component ??
        p.service_component ??
        p.status
      ),

    afsc,

    dafsc:
      afsc,

    dutyTitle:
      text(
        p.dutyTitle ??
        p.duty_title
      ),

    organization:
      text(
        p.organization ??
        p.unit
      ),

    base:
      text(
        p.base ??
        p.location ??
        p.duty_location
      ),

    yearsOfService:
      numberOrNull(
        p.yearsOfService ??
        p.yos
      ),

    peopleSupervised:
      numberOrNull(
        p.peopleSupervised ??
        p.people_supervised
      ),

    resourcesManaged:
      numberOrNull(
        p.resourcesManaged ??
        p.resources_managed
      ),

    promotionEligible:
      bool(
        p.promotionEligible ??
        p.promotion_eligible,
        false
      ),

    tigTisEligible:
      bool(
        p.tigTisEligible ??
        p.tig_tis_eligible,
        false
      ),

    commander:
      bool(
        p.commander ??
        p.is_commander,
        false
      ),

    votingAssistanceOfficer:
      bool(
        p.votingAssistanceOfficer ??
        p.voting_assistance_officer,
        false
      ),

    privatizedHousingOversight:
      bool(
        p.privatizedHousingOversight ??
        p.privatized_housing_oversight,
        false
      ),

    chaplain:
      bool(
        p.chaplain ??
        p.is_chaplain,
        /chaplain/.test(
          lower(p.dutyTitle)
        )
      ),

    fitness:
      normalizeFitness(p)

  });

}


// ============================================================
// 18. EVALUATION TYPE
// ============================================================

export function inferEvaluationType(
  profile = {},
  requestedType = ""
) {

  const requested =
    text(requestedType)
      .toUpperCase();


  if (
    [
      "EPB",
      "OPB",
      "FEEDBACK",
      "LOE",
      "TR",
      "PRF",
      "RRF"
    ].includes(requested)
  ) {

    return requested;

  }


  const p =
    normalizeAfEvaluationProfile(
      profile
    );


  const g =
    gradeData(p.grade);


  if (!g) {
    return "";
  }


  if (g.category === "E") {
    return "EPB";
  }


  if (
    g.category === "O" ||
    g.category === "W"
  ) {

    return "OPB";

  }


  return "";

}


// ============================================================
// 19. PROHIBITED / SENSITIVE LANGUAGE
// ============================================================

const REVIEW_PATTERNS =
  freeze([

    {

      id: "classified",

      severity: "stop",

      regex:
        /\b(classified|top secret|secret|ts\/sci|special access program|\bsap\b)\b/i,

      message:
        "Possible classified-information reference. Classified information is prohibited."

    },


    {

      id: "medical",

      severity: "review",

      regex:
        /\b(diagnosis|diagnosed|medical condition|treatment|therapy|medication|mental health)\b/i,

      message:
        "Possible medical-information reference. Focus on observable behavior and duty performance."

    },


    {

      id: "protected_activity",

      severity: "review",

      regex:
        /\b(inspector general|congressional inquiry|equal opportunity|AFBCMR|ERAB)\b/i,

      message:
        "Possible protected appeal/complaint activity. Review before use."

    },


    {

      id: "rehabilitation",

      severity: "review",

      regex:
        /\b(rehab|rehabilitation|alcoholic|addiction|substance use disorder)\b/i,

      message:
        "Possible rehabilitation/diagnosis reference. Focus on documented behavior/performance, not diagnosis or treatment."

    },


    {

      id: "protected_characteristic",

      severity: "review",

      regex:
        /\b(race|ethnicity|religion|sexual orientation|political affiliation|first female|first male|because of age)\b/i,

      message:
        "Possible protected-characteristic reference. Do not use it as favorable or unfavorable evaluation criteria."

    },


    {

      id: "family_marital",

      severity: "review",

      regex:
        /\b(married|marital|divorced|spouse employment|single parent|family status)\b/i,

      message:
        "Possible family/marital-status reference. This is generally prohibited as an evaluation consideration."

    },


    {

      id: "retirement_separation",

      severity: "review",

      regex:
        /\b(retirement|retiring|separating|separation|palace chase|palace front)\b/i,

      message:
        "Possible separation/retirement-status reference. Focus on behavior or performance, not the status itself."

    },


    {

      id: "civilian_employment",

      severity: "review",

      regex:
        /\b(civilian job|civilian employment|civil service job|outside employment|second job)\b/i,

      message:
        "Possible civilian-employment reference. Generally prohibited unless directly related to military performance."

    },


    {

      id: "stratification",

      severity: "review",

      regex:
        /\b(top\s+\d+%|#\s*\d+\s*\/\s*\d+|number one of|best of \d+|my #?1)\b/i,

      message:
        "Possible stratification language. Stratification is restricted to authorized fields."

    }

  ]);


// ============================================================
// LANGUAGE SCAN
// ============================================================

export function scanEvaluationLanguage(
  value = ""
) {

  const s =
    text(value);


  return REVIEW_PATTERNS

    .filter(
      (rule) =>
        rule.regex.test(s)
    )

    .map(
      (rule) => ({

        id:
          rule.id,

        severity:
          rule.severity,

        message:
          rule.message

      })
    );

}


// ============================================================
// 20. PERFORMANCE STATEMENT AUDIT
// ============================================================

const ACTION_HINTS =
  /\b(led|managed|directed|developed|implemented|created|built|repaired|inspected|trained|mentored|coached|coordinated|executed|resolved|improved|reduced|increased|completed|delivered|restored|maintained|generated|identified|organized|supervised|analyzed|modernized|standardized|streamlined|secured|planned|authored|advised|enabled|produced|achieved)\b/i;


const IMPACT_HINTS =
  /\b(result(?:ed|ing)?|enabled|allow(?:ed|ing)|improv(?:ed|ing)|reduc(?:ed|ing)|increas(?:ed|ing)|saved|prevented|restored|yielded|achieved|secured|ensured|support(?:ed|ing)|drove|produced|generated|leading to|resulting in|so that|thereby|which)\b/i;


const NUMBER_HINTS =
  /(?:\b\d+(?:\.\d+)?%?\b|\$\s?\d|\b\d+[KMB]\b)/i;


// ============================================================
// AUDIT
// ============================================================

export function auditPerformanceStatement(
  statement,
  options = {}
) {

  const s =
    text(statement);


  const o =
    object(options);


  const issues = [];
  const warnings = [];
  const strengths = [];


  if (!s) {

    return {

      ok: false,

      compliantStructure:
        false,

      issues: [
        "No performance statement was provided."
      ],

      warnings: [],

      strengths: []

    };

  }


  const hasAction =
    ACTION_HINTS.test(s);


  const hasImpact =
    IMPACT_HINTS.test(s) ||
    NUMBER_HINTS.test(s);


  const sentenceMarks =
    s.match(
      /[.!?](?=\s|$)/g
    ) || [];


  const likelyMultipleSentences =
    sentenceMarks.length > 1;


  const sensitive =
    scanEvaluationLanguage(s);


  const maxChars =
    numberOrNull(
      o.maxChars ??
      o.max_chars
    );


// ============================================================
// ACTION CHECK
// ============================================================

  if (!hasAction) {

    issues.push(
      "Action/behavior is not clear enough for the required performance-statement structure."
    );

  }

  else {

    strengths.push(
      "Clear action/behavior signal detected."
    );

  }


// ============================================================
// IMPACT CHECK
// ============================================================

  if (!hasImpact) {

    issues.push(
      "Impact, result, or outcome is not clear enough."
    );

  }

  else {

    strengths.push(
      "Impact/result/outcome signal detected."
    );

  }


// ============================================================
// STANDALONE SENTENCE
// ============================================================

  if (likelyMultipleSentences) {

    warnings.push(
      "The AFI defines a performance statement as a standalone sentence; this draft appears to contain more than one sentence."
    );

  }


// ============================================================
// FORMATTING
// ============================================================

  if (/!!+/.test(s)) {

    warnings.push(
      "Multiple exclamation marks are not authorized for emphasis."
    );

  }


// ============================================================
// OPTIONAL UI CHARACTER LIMIT
// ============================================================

  if (
    maxChars !== null &&
    s.length > maxChars
  ) {

    issues.push(
      `Draft is ${s.length} characters and exceeds the supplied ${maxChars}-character UI limit.`
    );

  }


// ============================================================
// SENSITIVE LANGUAGE
// ============================================================

  for (const flag of sensitive) {

    if (flag.severity === "stop") {

      issues.push(
        flag.message
      );

    }

    else {

      warnings.push(
        flag.message
      );

    }

  }


// ============================================================
// TARGET MPA
// ============================================================

  const targetMpa =
    text(
      o.targetMpa ??
      o.target_mpa
    );


  if (
    targetMpa &&
    !getMpa(targetMpa)
  ) {

    warnings.push(
      `Unknown target MPA: ${targetMpa}`
    );

  }


// ============================================================
// RETURN AUDIT
// ============================================================

  return cleanObject({

    ok:
      issues.length === 0,

    compliantStructure:
      hasAction &&
      hasImpact,

    characters:
      s.length,

    hasAction,

    hasImpact,

    targetMpa:
      targetMpa || undefined,

    issues:
      uniq(issues),

    warnings:
      uniq(warnings),

    strengths:
      uniq(strengths),

    note:
      "This is a structural/policy audit only. It does not determine the official strength of the accomplishment, rating, stratification, or promotion recommendation.",

    reference:
      ref(
        "1.3.3.2",
        "Performance statement structure"
      )

  });

}


export const validatePerformanceStatement =
  auditPerformanceStatement;


// ============================================================
// 21. MANDATORY EVALUATION REQUIREMENTS
// ============================================================

export function getMandatoryEvaluationRequirements(
  profile = {},
  evaluationType = ""
) {

  const p =
    normalizeAfEvaluationProfile(
      profile
    );


  const type =
    inferEvaluationType(
      p,
      evaluationType
    );


  const g =
    gradeData(
      p.grade
    );


  const requirements = [];
  const conditional = [];
  const warnings = [];


// ============================================================
// EPB / OPB CORE
// ============================================================

  if (
    [
      "EPB",
      "OPB"
    ].includes(type)
  ) {

    requirements.push(

      "Unique duty description",

      "At least one performance statement in Executing the Mission",

      "At least one performance statement in Leading People",

      "At least one performance statement in Managing Resources",

      "At least one performance statement in Improving the Unit",

      "Mandatory fitness comment",

      "HLR assessment / required HLR performance statement"

    );

  }


// ============================================================
// COMMANDER
// ============================================================

  if (
    p.commander &&
    type === "OPB"
  ) {

    conditional.push(
      "Commander climate mandatory statement and unique performance assessment as applicable."
    );

  }


// ============================================================
// HOUSING
// ============================================================

  if (
    p.privatizedHousingOversight
  ) {

    conditional.push(
      "Privatized-housing oversight mandatory statement and unique performance statement."
    );

  }


// ============================================================
// VOTING
// ============================================================

  if (
    p.votingAssistanceOfficer
  ) {

    conditional.push(
      "Unique performance statement for voting-assistance duties."
    );

  }


// ============================================================
// CHAPLAIN
// ============================================================

  if (
    p.chaplain &&
    type === "OPB"
  ) {

    conditional.push(
      "2026 Chaplain ministry-centric evaluation rules / functional Chaplain requirements."
    );

  }


// ============================================================
// COMBAT AFSC
// ============================================================

  if (
    isCombatAfsc(p.afsc)
  ) {

    conditional.push(
      "CFT result/status in mandatory fitness comments."
    );

  }


// ============================================================
// SRA - TSGT
// ============================================================

  if (
    g?.category === "E" &&
    g.number >= 4 &&
    g.number <= 6
  ) {

    conditional.push(
      "Promotion Recommendation block if the member is eligible."
    );

  }


// ============================================================
// MSGT / SMSGT
// ============================================================

  if (
    g?.category === "E" &&
    [7, 8].includes(g.number)
  ) {

    conditional.push(
      "Authorized senior-rater stratification / future roles when eligible and used."
    );

  }


// ============================================================
// CMSGT
// ============================================================

  if (
    g?.category === "E" &&
    g.number === 9
  ) {

    conditional.push(
      "Higher Responsibility selection and authorized future-role/vector rules."
    );

  }


// ============================================================
// OFFICER
// ============================================================

  if (type === "OPB") {

    conditional.push(
      "Officer stratification only when authorized and only in designated stratification fields."
    );

  }


// ============================================================
// WARNINGS
// ============================================================

  if (!p.grade) {

    warnings.push(
      "Grade is missing; grade-specific requirements cannot be fully resolved."
    );

  }


  if (!p.afsc) {

    warnings.push(
      "AFSC/DAFSC is missing; AFSC-specific fitness and later occupational logic cannot be fully resolved."
    );

  }


// ============================================================
// RETURN
// ============================================================

  return cleanObject({

    type,

    requirements,

    conditional,

    warnings

  });

}


// ============================================================
// 22. PROMOTION DEFINITION LOOKUP
// ============================================================

export function getPromotionRecommendationDefinition(
  code,
  category = "enlisted"
) {

  const c =
    text(code)
      .toUpperCase();


  if (
    lower(category).includes(
      "officer"
    )
  ) {

    return (
      AF_EVALUATION_PROMOTION_RECOMMENDATIONS
        .officerPRF[c] ||
      null
    );

  }


  return (
    AF_EVALUATION_PROMOTION_RECOMMENDATIONS
      .enlisted[c] ||
    null
  );

}


// ============================================================
// 23. GRADE-SPECIFIC PROMOTION CONTEXT
// ============================================================

export function getPromotionContextForGrade(
  grade,
  component = ""
) {

  const g =
    gradeData(grade);


  const comp =
    normalizeComponent(
      component
    );


  if (!g) {
    return null;
  }


// ============================================================
// ENLISTED
// ============================================================

  if (g.category === "E") {


// ============================================================
// SRA - TSGT
// ============================================================

    if (
      g.number >= 4 &&
      g.number <= 6
    ) {

      return {

        grade:
          g.grade,

        component:
          comp,

        evaluation:
          "EPB",

        recommendationCodes: [
          "PN",
          "MP",
          "P",
          "NRN"
        ],

        forcedDistribution:
          comp === "RegAF"
            ? AF_EVALUATION_FORCED_DISTRIBUTION
            : null,

        rule:
          "For AB-TSgt, promotion pushes to the next higher enlisted grade are prohibited in HLR comments; factual promotion-selection statements and authorized commissioning-source pushes are different."

      };

    }


// ============================================================
// MSGT / SMSGT
// ============================================================

    if (
      [7, 8].includes(
        g.number
      )
    ) {

      return {

        grade:
          g.grade,

        component:
          comp,

        evaluation:
          "EPB",

        stratification:
          AF_EVALUATION_SNCO_STRATIFICATION,

        promotionStatement:
          "For MSgt/SMSgt, only the HLR may make an authorized promotion statement, only when TIG/TIS promotion eligible and fitness-current/meeting standards, and only to the next higher grade.",

        futureRoles:
          true

      };

    }


// ============================================================
// CMSGT
// ============================================================

    if (g.number === 9) {

      return {

        grade:
          g.grade,

        component:
          comp,

        evaluation:
          "EPB",

        higherResponsibility:
          AF_EVALUATION_CMSGT_RESPONSIBILITY,

        futureRoles:
          true

      };

    }


// ============================================================
// AB - A1C
// ============================================================

    return {

      grade:
        g.grade,

      component:
        comp,

      evaluation:
        "EPB"

    };

  }


// ============================================================
// OFFICER / WARRANT
// ============================================================

  if (
    g.category === "O" ||
    g.category === "W"
  ) {

    return {

      grade:
        g.grade,

      component:
        comp,

      evaluation:
        "OPB",

      promotionPushOnOPB:
        false,

      stratification:
        "Only when authorized by Chapter 3 and only in designated stratification fields.",

      prfSeparateProcess:
        true

    };

  }


  return null;

}


// ============================================================
// 24. FORM SCHEMA LOOKUP
// ============================================================

export function getEvaluationFormSchema(
  typeOrProfile = ""
) {

  const type =
    typeof typeOrProfile === "string"

      ? text(typeOrProfile)
          .toUpperCase()

      : inferEvaluationType(
          typeOrProfile
        );


  return (
    AF_EVALUATION_FORM_SCHEMAS[type] ||
    null
  );

}


// ============================================================
// 25. SECTION COMPLETION STATUS
// ============================================================

export function buildEvaluationSectionStatus({
  type = "",
  profile = {},
  sections = {}
} = {}) {

  const schema =
    getEvaluationFormSchema(
      type || profile
    );


  if (
    !schema ||
    !Array.isArray(
      schema.sections
    )
  ) {

    return {

      ok: false,

      error:
        "Unknown evaluation type."

    };

  }


  const supplied =
    object(sections);


  const rows =
    schema.sections.map(
      (section) => {

        const value =
          supplied[
            section.id
          ];


        const complete =

          typeof value === "string"

            ? Boolean(
                text(value)
              )

          : Array.isArray(value)

            ? value.length > 0

          : value &&
            typeof value === "object"

            ? Object.keys(
                value
              ).length > 0

          : Boolean(value);


        return {

          id:
            section.id,

          label:
            section.label,

          required:
            Boolean(
              section.required
            ),

          conditional:
            Boolean(
              section.conditional
            ),

          status:

            complete
              ? "complete"

              : section.conditional
                ? "conditional"

                : "not_started"

        };

      }
    );


  const required =
    rows.filter(
      (row) =>
        row.required
    );


  const completeRequired =
    required.filter(
      (row) =>
        row.status ===
        "complete"
    ).length;


  return {

    ok: true,

    type:
      schema.id,

    sections:
      rows,

    progress: {

      completedRequired:
        completeRequired,

      requiredTotal:
        required.length,

      percent:

        required.length

          ? Math.round(
              (
                completeRequired /
                required.length
              ) *
              100
            )

          : 0

    }

  };

}


// ============================================================
// 26. GUIDANCE TOPICS
// ============================================================

export const AF_EVALUATION_GUIDANCE_TOPICS =
  freeze({


// ============================================================
// OVERVIEW
// ============================================================

    overview: {

      title:
        "Air Force Evaluations Overview",

      bluf:
        "AFI 36-2406 evaluates what the Airman accomplished and how they accomplished it through four MPAs and ten ALQs, relative to grade, AFSC, responsibility, duties, and the full rating period.",

      keyPoints: [

        "myEval is the primary system for current ALQ evaluations.",

        "EPB/OPB content is performance based, not merely a writing-style exercise.",

        "The four MPAs are Executing the Mission, Leading People, Managing Resources, and Improving the Unit.",

        "A strong sentence does not by itself create a strong performance record."

      ],

      references: [

        ref(
          "1.1 / 1.6.3.11-1.6.3.12",
          "Evaluation framework"
        )

      ]

    },


// ============================================================
// PERFORMANCE STATEMENT
// ============================================================

    performance_statement: {

      title:
        "Performance Statement Rules",

      bluf:
        "A performance statement is a standalone sentence containing both the Airman's action/behavior and its impact, result, or outcome.",

      keyPoints: [

        "At least one performance statement is required in each evaluation section being accomplished.",

        '"THIS SECTION NOT USED" is authorized when policy permits the section to be unused.',

        "White space is authorized.",

        "Do not invent metrics or effects.",

        "There is no universal 350-character EPB/OPB MPA limit in AFI 36-2406; comments must fit the space provided."

      ],

      references:
        AF_EVALUATION_PERFORMANCE_STATEMENT_RULES.references

    },


// ============================================================
// MPA / ALQ
// ============================================================

    mpa_alq: {

      title:
        "MPAs and ALQs",

      bluf:
        "The evaluation assesses both outcomes (what was accomplished) and competencies (how it was accomplished).",

      keyPoints:
        Object.values(
          AF_EVALUATION_MPA
        ).map(

          (mpa) =>
            `${mpa.label}: ${
              mpa.alqs
                .map(
                  (id) =>
                    AF_EVALUATION_ALQS[id].label
                )
                .join(", ")
            }.`
        ),

      references: [

        ref(
          "1.6.3.11-1.6.3.12",
          "MPA / ALQ framework"
        )

      ]

    },


// ============================================================
// GRADE / AFSC CONTEXT
// ============================================================

    rank_afsc_context: {

      title:
        "Grade / AFSC / Duty Context",

      bluf:
        "The AFI explicitly requires performance to be measured relative to grade, AFSC, level of responsibility, assigned duties, and the full rating period.",

      keyPoints: [

        "The same accomplishment can carry different significance at different grades and scopes of responsibility.",

        "Duty description must be unique to the member and written in clear, specific, plain English.",

        "AFI 36-2406 does not contain detailed occupational knowledge for every AFSC; use separate official AFSC sources for that layer."

      ],

      references: [

        ref(
          "1.6.3.12 / Tables 3.1 and 4.9",
          "Grade / AFSC / duty context"
        )

      ]

    },


// ============================================================
// EPB
// ============================================================

    epb: {

      title:
        "Enlisted Performance Brief",

      bluf:
        "EPB uses a unique duty description, four MPA assessment sections, mandatory comments, and HLR review, with grade-specific promotion/stratification elements.",

      keyPoints: [

        "Each MPA requires at least one performance statement.",

        "Fitness belongs in mandatory comments.",

        "SrA-TSgt may receive an eligible promotion recommendation.",

        "MSgt/SMSgt use separate senior-rater stratification rules.",

        "CMSgt uses higher-responsibility and vectoring rules."

      ],

      references: [

        ref(
          "Chapter 4 / Table 4.9",
          "EPB"
        )

      ]

    },


// ============================================================
// OPB
// ============================================================

    opb: {

      title:
        "Officer Performance Brief",

      bluf:
        "OPB uses a unique duty description, four MPA assessment sections, mandatory comments, authorized stratification fields, and HLR assessment.",

      keyPoints: [

        "Each MPA requires at least one performance statement.",

        "Officer stratification is only authorized under Chapter 3 rules and only in designated fields.",

        "Promotion pushes to the next higher officer grade are prohibited on the OPB.",

        "The PRF is a separate promotion product."

      ],

      references: [

        ref(
          "Chapter 3 / Table 3.1",
          "OPB"
        )

      ]

    },


// ============================================================
// FEEDBACK
// ============================================================

    feedback: {

      title:
        "Performance Feedback",

      bluf:
        "Feedback is a continuous cycle: initial expectations, midterm progress review, and final/end-of-period feedback.",

      keyPoints: [

        "Initial feedback: within first 60 calendar days and at the beginning of every cycle.",

        "Midterm: midway between supervision start and projected close-out.",

        "Final: with the completed evaluation and within 60 calendar days after close-out.",

        "Ratee-requested feedback: within 30 calendar days.",

        "Fitness standards/expectations are included under the 2026 update."

      ],

      references: [

        ref(
          "Chapter 2 / Table 2.1 / AFGM Table 2.2",
          "Feedback"
        )

      ]

    },


// ============================================================
// FITNESS
// ============================================================

    fitness: {

      title:
        "Fitness Documentation",

      bluf:
        "Document the official PFA score/status, category, and exemptions in mandatory comments; designated combat-related AFSCs also require CFT information.",

      keyPoints: [

        "Valid exemptions alone do not bar favorable consideration.",

        "Required - Not Current or Unsatisfactory can block favorable promotion/stratification actions under applicable rules.",

        "Do not include medical diagnosis/treatment details."

      ],

      references: [

        ref(
          "1.4.10",
          "Fitness documentation"
        )

      ]

    },


// ============================================================
// FORCED DISTRIBUTION
// ============================================================

    forced_distribution: {

      title:
        "Enlisted Forced Distribution",

      bluf:
        "RegAF SrA-TSgt PN/MP recommendations are constrained by forced-distribution allocations and competitive best-qualified review.",

      keyPoints: [

        "Published PN rate is 5% for SrA/SSgt/TSgt.",

        "Published MP rate is 15% for SrA and 10% for SSgt/TSgt.",

        "Use actual AFPC allocations on the final MEL because tables/rates are subject to change.",

        "PN/MP are not writing-style labels that can be awarded by a sentence generator."

      ],

      references:
        AF_EVALUATION_FORCED_DISTRIBUTION.references

    },


// ============================================================
// PROHIBITED COMMENTS
// ============================================================

    prohibited_comments: {

      title:
        "Prohibited Comments",

      bluf:
        "The AFI prohibits classified, protected, discriminatory, medical, and other inappropriate considerations from evaluation comments.",

      keyPoints: [

        "Never include classified information.",

        "Focus on observable duty performance rather than medical diagnosis/treatment.",

        "Do not use protected personal characteristics as favorable/unfavorable criteria.",

        "Do not evaluate family/marital status.",

        "Do not use separation/retirement status itself as the performance basis."

      ],

      references:
        AF_EVALUATION_RULES
          .prohibited
          .references

    },


// ============================================================
// REFERRAL
// ============================================================

    referral: {

      title:
        "Referral Evaluations",

      bluf:
        "Referral procedures protect due process when derogatory or below-standard comments are placed in an evaluation.",

      keyPoints: [

        "Vague negative comments are not sufficient.",

        "The ratee must receive an opportunity to respond/rebut.",

        "When doubt exists as to whether a comment is referral, the AFI directs referral so due process is afforded."

      ],

      references: [

        ref(
          "1.11",
          "Referral Evaluations"
        )

      ]

    },


// ============================================================
// LOE
// ============================================================

    loe: {

      title:
        "DAF Form 77 - Letter of Evaluation",

      bluf:
        "LOEs support formal/informal, supplemental, administrative, and deployed-commander situations and use performance statements.",

      keyPoints: [

        "Informal LOEs generally are not filed in the permanent record.",

        "Supplemental LOEs attach to the document they supplement.",

        "Administrative LOEs explain authorized gaps/missing/removed evaluations.",

        "LOEs are prepared using performance statements."

      ],

      references: [

        ref(
          "Chapter 5",
          "Letter of Evaluation"
        )

      ]

    },


// ============================================================
// PRF
// ============================================================

    prf: {

      title:
        "DAF Form 709 - Promotion Recommendation",

      bluf:
        "The PRF is a separate officer promotion product governed by Chapter 8 and the Management Level Review process.",

      keyPoints: [

        "PRF recommendations include Definitely Promote, Promote, and Do Not Promote This Board under applicable rules.",

        "Definitely Promote is competitive where allocation rules apply.",

        "PRF narrative uses plain language and performance-based differentiation/potential."

      ],

      references: [

        ref(
          "Chapter 8",
          "PRF / MLR"
        )

      ]

    },


// ============================================================
// CORRECTION / APPEAL
// ============================================================

    correction_appeal: {

      title:
        "Correcting / Appealing an Evaluation",

      bluf:
        "After an evaluation becomes a matter of record, relief may proceed through administrative correction, ERAB, and ultimately AFBCMR depending on the request and member status.",

      keyPoints: [

        "RegAF normally uses vMPF for ERAB; ARC uses DAF Form 948 through myFSS AAQ.",

        "Retired/separated members use AFBCMR.",

        "Normal appeal time limit is three years after the evaluation became a matter of record.",

        "Feedback worksheets/sessions themselves are not appealable under Chapter 10."

      ],

      references: [

        ref(
          "Chapter 10",
          "Corrections / Appeals"
        )

      ]

    },


// ============================================================
// CHAPLAIN
// ============================================================

    chaplain: {

      title:
        "Chaplain Evaluation Rules - 2026 Update",

      bluf:
        "The 7 August 2026 guidance memorandum changes Chaplain rating-chain/functional-examiner requirements and requires ministry-centric Chaplain OPBs.",

      keyPoints: [

        "Focus on religious services, pastoral care, command advisement, and operational religious support.",

        "Field-grade and senior Chaplains receive increasing leadership, mentorship, and Chaplain Corps team emphasis."

      ],

      references:
        AF_EVALUATION_RULES
          .chaplain2026
          .references

    },


// ============================================================
// SECURITY / CUI
// ============================================================

    security_cui: {

      title:
        "Evaluation Security / CUI",

      bluf:
        "Evaluations are CUI and classified information is prohibited on evaluations.",

      keyPoints: [

        "Only authorized personnel with an official need should access evaluation records.",

        "Public AI workflows should receive generalized/non-sensitive accomplishment facts, not protected records or classified operational details."

      ],

      references: [

        AF_EVALUATION_RULES
          .security
          .reference

      ]

    }

  });


// ============================================================
// 27. INTENT DETECTION
// ============================================================

const INTENTS =
  freeze([

    [
      "security_cui",
      /\b(cui|classified|sensitive information|protected information)\b/i
    ],


    [
      "chaplain",
      /\b(chaplain|ministry|pastoral|religious support)\b/i
    ],


    [
      "correction_appeal",
      /\b(appeal|erab|afbcmr|daf form 948|correct evaluation|remove evaluation|matter of record)\b/i
    ],


    [
      "prf",
      /\b(prf|daf form 709|definitely promote|management level review|\bmlr\b)\b/i
    ],


    [
      "loe",
      /\b(letter of evaluation|\bloe\b|daf form 77)\b/i
    ],


    [
      "forced_distribution",
      /\b(forced distribution|efdp|allocation|\bmel\b|fdid|srid|promote now|must promote)\b/i
    ],


    [
      "referral",
      /\b(referral|referred evaluation|derogatory|rebuttal|negative comment|adverse comment)\b/i
    ],


    [
      "prohibited_comments",
      /\b(prohibited comment|inappropriate comment|medical|marital|religion|race|political|civilian job|retirement|separation)\b/i
    ],


    [
      "fitness",
      /\b(pfa|fitness|cft|combat field test|exemption|required\s*-?\s*not current)\b/i
    ],


    [
      "epb",
      /\b(epb|enlisted performance brief|af form 716)\b/i
    ],


    [
      "opb",
      /\b(opb|officer performance brief|af form 715)\b/i
    ],


    [
      "feedback",
      /\b(feedback|af form 717|midterm|initial feedback|final feedback)\b/i
    ],


    [
      "rank_afsc_context",
      /\b(afsc|dafsc|rank|grade|level of responsibility|duty position)\b.*\b(evaluation|epb|opb|statement|performance)\b/i
    ],


    [
      "mpa_alq",
      /\b(mpa|major performance area|alq|airman leadership qualities|executing the mission|leading people|managing resources|improving the unit)\b/i
    ],


    [
      "performance_statement",
      /\b(performance statement|bullet|narrative statement|action.*impact|impact.*action|character limit|acronym)\b/i
    ]

  ]);


// ============================================================
// DETECT INTENT
// ============================================================

export function detectAfEvaluationIntent(
  message = ""
) {

  const m =
    text(message);


  if (!m) {
    return "overview";
  }


  for (
    const [intent, pattern]
    of INTENTS
  ) {

    if (pattern.test(m)) {
      return intent;
    }

  }


  if (
    /\b(epr|opr|evaluation|myeval|performance brief|scod|close-out)\b/i.test(
      m
    )
  ) {

    return "overview";

  }


  return "";

}


export const detectAfEvaluationsIntent =
  detectAfEvaluationIntent;


// ============================================================
// 28. GUIDANCE API
// ============================================================

export function getAfEvaluationGuidance(
  intentOrMessage = "overview",
  profile = {},
  context = {}
) {

  const raw =
    text(intentOrMessage);


  const intent =

    AF_EVALUATION_GUIDANCE_TOPICS[
      raw
    ]

      ? raw

      : detectAfEvaluationIntent(
          raw
        ) || "overview";


  const topic =

    AF_EVALUATION_GUIDANCE_TOPICS[
      intent
    ]

    ||

    AF_EVALUATION_GUIDANCE_TOPICS
      .overview;


  const p =
    normalizeAfEvaluationProfile(
      profile
    );


  const contextObject =
    object(context);


  const type =
    inferEvaluationType(

      p,

      contextObject.evaluationType ??

      contextObject.evaluation_type

    );


  const notes = [];


// ============================================================
// GRADE CONTEXT
// ============================================================

  if (p.grade) {

    const promotion =
      getPromotionContextForGrade(
        p.grade,
        p.component
      );


    if (promotion) {

      notes.push({

        type:
          "grade_context",

        data:
          promotion

      });

    }

  }


// ============================================================
// COMBAT AFSC
// ============================================================

  if (
    p.afsc &&
    isCombatAfsc(p.afsc)
  ) {

    notes.push({

      type:
        "combat_afsc",

      message:
        "AFI combat-related AFSC detected; CFT documentation rules may apply."

    });

  }


// ============================================================
// CHAPLAIN
// ============================================================

  if (p.chaplain) {

    notes.push({

      type:
        "chaplain_2026",

      message:
        "2026 Chaplain rating-chain / ministry-centric guidance applies."

    });

  }


// ============================================================
// RETURN
// ============================================================

  return cleanObject({

    intent,

    evaluationType:
      type,

    title:
      topic.title,

    bluf:
      topic.bluf,

    keyPoints:
      topic.keyPoints,

    references:
      topic.references,

    profileContext:
      p,

    contextualNotes:
      notes

  });

}


// ============================================================
// 29. QUESTION ANALYSIS
// ============================================================

export function analyzeAfEvaluationQuestion(
  message = "",
  profile = {},
  context = {}
) {

  const intent =
    detectAfEvaluationIntent(
      message
    ) || "overview";


  return {

    ok: true,

    version:
      AF_EVALUATIONS_VERSION,

    intent,

    guidance:
      getAfEvaluationGuidance(
        intent,
        profile,
        context
      ),

    reference:
      AF_EVALUATIONS_REFERENCE

  };

}


// ============================================================
// 30. TRUTH PACKET
// ============================================================

export function buildAfEvaluationTruthPacket({

  message = "",

  profile = {},

  evaluation = {},

  context = {},

  statement = ""

} = {}) {

  const p =
    normalizeAfEvaluationProfile(
      profile
    );


  const e =
    object(evaluation);


  const c =
    object(context);


  const intent =
    detectAfEvaluationIntent(
      message
    ) || "overview";


  const evaluationType =
    inferEvaluationType(

      p,

      e.type ??

      e.evaluationType ??

      e.evaluation_type ??

      c.evaluationType ??

      c.evaluation_type

    );


  const suppliedStatement =
    text(

      statement ||

      e.statement ||

      e.performanceStatement ||

      e.performance_statement

    );


  const warnings = [];


// ============================================================
// MISSING GRADE
// ============================================================

  if (!p.grade) {

    warnings.push(
      "Grade/rank is missing; grade-specific rules cannot be fully resolved."
    );

  }


// ============================================================
// MISSING AFSC
// ============================================================

  if (
    !p.afsc &&
    intent === "rank_afsc_context"
  ) {

    warnings.push(
      "AFSC/DAFSC is missing; occupational context requires a separate AFSC knowledge module."
    );

  }


// ============================================================
// OFFICIAL JUDGMENT WARNING
// ============================================================

  if (
    [
      "EPB",
      "OPB"
    ].includes(
      evaluationType
    )
  ) {

    warnings.push(
      "Generated wording is not an official evaluator judgment, stratification, or promotion recommendation."
    );

  }


// ============================================================
// PACKET
// ============================================================

  const packet = {

    ok:
      true,

    version:
      AF_EVALUATIONS_VERSION,

    source:
      "TheWing af-evaluations.js",


// ============================================================
// AUTHORITY
// ============================================================

    authority: {

      publication:
        AF_EVALUATIONS_REFERENCE
          .publication,

      baseDocumentDate:
        AF_EVALUATIONS_REFERENCE
          .baseDocumentDate,

      guidanceMemorandum:
        AF_EVALUATIONS_REFERENCE
          .guidanceMemorandum,

      guidanceMemorandumDate:
        AF_EVALUATIONS_REFERENCE
          .guidanceMemorandumDate,

      memorandumControlsIfInconsistent:
        true

    },


// ============================================================
// REQUEST
// ============================================================

    request: {

      message:
        text(message),

      intent,

      evaluationType,

      hasProfile:
        Object.keys(p).length > 0,

      hasStatement:
        Boolean(
          suppliedStatement
        )

    },


// ============================================================
// PROFILE
// ============================================================

    profile:
      p,


// ============================================================
// POLICY
// ============================================================

    policy: {

      wholePersonRule:
        AF_EVALUATION_WHOLE_PERSON_RULE,

      mpa:
        AF_EVALUATION_MPA,

      alq:
        AF_EVALUATION_ALQS,

      performanceStatementRules:
        AF_EVALUATION_PERFORMANCE_STATEMENT_RULES,

      formSchema:
        getEvaluationFormSchema(
          evaluationType
        ),

      mandatoryRequirements:
        getMandatoryEvaluationRequirements(
          p,
          evaluationType
        ),

      fitnessComment:
        buildFitnessMandatoryComment(
          p
        ),

      promotionContext:
        p.grade
          ? getPromotionContextForGrade(
              p.grade,
              p.component
            )
          : null

    },


// ============================================================
// GUIDANCE
// ============================================================

    guidance:
      getAfEvaluationGuidance(

        intent,

        p,

        {
          evaluationType
        }

      ),


// ============================================================
// STATEMENT AUDIT
// ============================================================

    statementAudit:

      suppliedStatement

        ? auditPerformanceStatement(

            suppliedStatement,

            {

              targetMpa:
                e.mpa,

              maxChars:
                e.maxChars ??
                e.max_chars

            }

          )

        : null,


// ============================================================
// FORM PROGRESS
// ============================================================

    sectionStatus:

      e.sections &&
      evaluationType

        ? buildEvaluationSectionStatus({

            type:
              evaluationType,

            profile:
              p,

            sections:
              e.sections

          })

        : null,


// ============================================================
// WARNINGS
// ============================================================

    warnings:
      uniq(warnings),


// ============================================================
// DISCLAIMERS
// ============================================================

    disclaimers: [

      "Educational policy guidance only; myEval, CSS/MPF, AFPC/ARPC, and the current controlling publication remain authoritative.",

      "Never invent accomplishments, metrics, effects, dollar values, supervision scope, or promotion recommendations.",

      "Do not enter classified or protected operational information into public AI tools."

    ]

  };


  return cleanObject(
    packet
  );

}


// ============================================================
// 31. MPA LOOKUP
// ============================================================

export function getMpa(
  idOrLabel = ""
) {

  const raw =
    lower(idOrLabel)
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_|_$/g,
        ""
      );


  if (
    AF_EVALUATION_MPA[
      raw
    ]
  ) {

    return (
      AF_EVALUATION_MPA[
        raw
      ]
    );

  }


  return (

    Object.values(
      AF_EVALUATION_MPA
    ).find(

      (item) =>
        lower(
          item.label
        ) ===
        lower(
          idOrLabel
        )

    )

    ||

    null

  );

}


// ============================================================
// 32. ALQ LOOKUP
// ============================================================

export function getAlq(
  idOrLabel = ""
) {

  const raw =
    lower(idOrLabel)
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_|_$/g,
        ""
      );


  if (
    AF_EVALUATION_ALQS[
      raw
    ]
  ) {

    return (
      AF_EVALUATION_ALQS[
        raw
      ]
    );

  }


  return (

    Object.values(
      AF_EVALUATION_ALQS
    ).find(

      (item) =>
        lower(
          item.label
        ) ===
        lower(
          idOrLabel
        )

    )

    ||

    null

  );

}


// ============================================================
// 33. LIST GUIDANCE TOPICS
// ============================================================

export function listAfEvaluationTopics() {

  return Object.entries(
    AF_EVALUATION_GUIDANCE_TOPICS
  ).map(

    ([id, topic]) => ({

      id,

      title:
        topic.title

    })

  );

}


// ============================================================
// 34. REFERENCE LOOKUP
// ============================================================

export function getAfEvaluationReference() {

  return (
    AF_EVALUATIONS_REFERENCE
  );

}


// ============================================================
// 35. DEFAULT EXPORT
// ============================================================

export default freeze({

  AF_EVALUATIONS_VERSION,

  AF_EVALUATIONS_REFERENCE,

  AF_EVALUATION_RULES,

  AF_EVALUATION_MPA,

  AF_EVALUATION_ALQS,

  AF_EVALUATION_WHOLE_PERSON_RULE,

  AF_EVALUATION_PERFORMANCE_STATEMENT_RULES,

  AF_EVALUATION_PROMOTION_RECOMMENDATIONS,

  AF_EVALUATION_FORCED_DISTRIBUTION,

  AF_EVALUATION_SNCO_STRATIFICATION,

  AF_EVALUATION_CMSGT_RESPONSIBILITY,

  AF_EVALUATION_COMBAT_AFSC,

  AF_EVALUATION_FORM_SCHEMAS,

  AF_EVALUATION_GUIDANCE_TOPICS,

  normalizeGrade,

  isCombatAfsc,

  normalizeAfEvaluationProfile,

  inferEvaluationType,

  scanEvaluationLanguage,

  auditPerformanceStatement,

  validatePerformanceStatement,

  buildFitnessMandatoryComment,

  getMandatoryEvaluationRequirements,

  getPromotionRecommendationDefinition,

  getPromotionContextForGrade,

  getEvaluationFormSchema,

  buildEvaluationSectionStatus,

  detectAfEvaluationIntent,

  detectAfEvaluationsIntent,

  getAfEvaluationGuidance,

  analyzeAfEvaluationQuestion,

  buildAfEvaluationTruthPacket,

  getMpa,

  getAlq,

  listAfEvaluationTopics,

  getAfEvaluationReference

});
