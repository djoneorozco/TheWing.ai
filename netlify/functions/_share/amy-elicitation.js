// netlify/functions/_share/amy-elicitation.js
// ============================================================
// TheWing.ai • Amy Elicitation + Concierge Router
// v1.0.0 • ES MODULE
//
// PURPOSE
// - Deterministic clarification / routing layer for Agent Amy
// - Decides whether Amy should:
//     1) ANSWER normally
//     2) ELICIT one clarification
//     3) ROUTE to a TheWing application
// - Does NOT calculate military/financial numbers
// - Does NOT call OpenAI
// - Does NOT replace agent-amy.js
//
// EXPECTED USE
//
// const concierge = buildAmyElicitation({
//   message,
//   intent,
//   normalizedProfile,
//   deterministic,
//   mergedContext,
//   conversationContext
// });
//
// const ui = applyAmyElicitationToUi(
//   { speed: 18, startDelay: 80 },
//   concierge
// );
//
// RESPONSE SHAPES
//
// ANSWER:
// {
//   mode: "answer",
//   ui: { mode: "answer" }
// }
//
// ELICIT:
// {
//   mode: "elicit",
//   ui: {
//     mode: "elicit",
//     elicitation: {
//       id,
//       question,
//       detail,
//       options: [{ id, label, description, value }]
//     }
//   }
// }
//
// ROUTE:
// {
//   mode: "route",
//   ui: {
//     mode: "route",
//     action: {
//       type: "navigate",
//       app,
//       label,
//       url,
//       reason,
//       auto
//     }
//   }
// }
// ============================================================

export const VERSION = "1.0.0-amy-elicitation";


// ============================================================
// ROUTES
// ============================================================

export const AMY_ROUTES = Object.freeze({

  bah: {
    app: "bah_base_pay",
    label: "Open BAH & Base Pay Calculator",
    url: "/air-force/bah-base-pay-calculator.html"
  },

  retirement: {
    app: "retirement_calculator",
    label: "Open Retirement Calculator",
    url: "/air-force/retirement-calculator.html"
  },

  disability: {
    app: "va_disability_calculator",
    label: "Open VA Disability Calculator",
    url: "/air-force/disability-calculator.html"
  },

  va: {
    app: "va_calculator",
    label: "Open VA Calculator",
    url: "/air-force/va-calculator.html"
  },

  mortgage: {
    app: "mortgage_calculator",
    label: "Open Mortgage Calculator",
    url: "/air-force/mortgage-calculator.html"
  },

  financial: {
    app: "financial_readiness",
    label: "Open Financial Readiness Dashboard",
    url: "/air-force/financial-dashboard.html"
  },

  pcsSnapshot: {
    app: "pcs_snapshot",
    label: "Open PCS Snapshot",
    url: "/air-force/pcs-snapshot.html"
  },

  pcsCalculator: {
    app: "pcs_calculator",
    label: "Open PCS Calculator",
    url: "/air-force/pcs-calculator.html"
  },

  baseDemographics: {
    app: "base_demographics",
    label: "Open Base Demographics",
    url: "/air-force/base-demographics-air-force.html"
  },

  baseMap: {
    app: "base_map",
    label: "Open Interactive Base Map",
    url: "/air-force/base-map.html"
  },

  housingQuiz: {
    app: "housing_quiz",
    label: "Open Housing Quiz",
    url: "/air-force/housing-quiz.html"
  },

  pt: {
    app: "pt_calculator",
    label: "Open PT Calculator",
    url: "/air-force/pt-calculator.html"
  },

  waps: {
    app: "waps_calculator",
    label: "Open WAPS Calculator",
    url: "/waps.html"
  },

  opb: {
    app: "opb_generator",
    label: "Open OPB Generator",
    url: "/air-force/opb-generator.html"
  },

  information: {
    app: "information_center",
    label: "Open Information Center",
    url: "/information-center.html"
  },

  about: {
    app: "about_thewing",
    label: "About TheWing",
    url: "/about-us.html"
  }

});


// ============================================================
// MAIN EXPORT
// ============================================================

export function buildAmyElicitation({
  message = "",
  intent = "",
  normalizedProfile = {},
  deterministic = {},
  mergedContext = {},
  conversationContext = {}
} = {}) {

  const text = safeStr(message);
  const lower = normalize(text);

  const profile =
    normalizedProfile &&
    typeof normalizedProfile === "object"
      ? normalizedProfile
      : {};

  const truth =
    deterministic &&
    typeof deterministic === "object"
      ? deterministic
      : {};

  const publicPacket =
    truth.public &&
    typeof truth.public === "object"
      ? truth.public
      : {};

  const scenario =
    truth.internal?.scenario &&
    typeof truth.internal.scenario === "object"
      ? truth.internal.scenario
      : {};

  const missing =
    Array.isArray(publicPacket.missing_inputs)
      ? publicPacket.missing_inputs
          .map(safeStr)
          .filter(Boolean)
      : [];

  const thread =
    Array.isArray(conversationContext?.thread)
      ? conversationContext.thread
      : [];

  const resolvedIntent =
    normalize(intent || publicPacket.intent || "");

  const baseContext = {
    text,
    lower,
    intent: resolvedIntent,
    profile,
    truth,
    publicPacket,
    scenario,
    missing,
    thread,
    mergedContext,
    conversationContext
  };


  // ----------------------------------------------------------
  // 1. Explicit user navigation always wins.
  // ----------------------------------------------------------

  const explicitRoute = detectExplicitNavigation(baseContext);

  if (explicitRoute) {
    return routeDecision(
      explicitRoute.route,
      explicitRoute.reason,
      true
    );
  }


  // ----------------------------------------------------------
  // 2. Factual / definition questions should usually be answered.
  // ----------------------------------------------------------

  if (looksLikeDefinitionQuestion(lower)) {
    return answerDecision(
      "specific factual or explanatory question"
    );
  }


  // ----------------------------------------------------------
  // 3. User explicitly asks about first-time / getting started.
  // ----------------------------------------------------------

  if (looksLikeNewVisitor(lower)) {
    return primaryElicitation(
      "Welcome. What would you like help with first?",
      "Choose the closest match and I’ll guide you from there.",
      "new_visitor"
    );
  }


  // ----------------------------------------------------------
  // 4. Greetings on homepage can become useful elicitation.
  // ----------------------------------------------------------

  if (
    isGreeting(lower) &&
    thread.length <= 2
  ) {
    return primaryElicitation(
      "What can I help you figure out today?",
      "Choose an area, or ask me anything in your own words.",
      "greeting_start"
    );
  }


  // ----------------------------------------------------------
  // 5. Broad help / capability request.
  // ----------------------------------------------------------

  if (looksLikeBroadHelp(lower, resolvedIntent)) {
    return primaryElicitation(
      "What can I help you find?",
      "Pick the area that best matches what you're trying to accomplish.",
      "broad_help"
    );
  }


  // ----------------------------------------------------------
  // 6. Structured missing-input elicitation.
  //
  // Only use structured choices when the possible answers are
  // naturally limited. Do not fake dropdowns for rank, ZIP,
  // home price, income, etc.
  // ----------------------------------------------------------

  const missingDecision =
    buildMissingInputElicitation(baseContext);

  if (missingDecision) {
    return missingDecision;
  }


  // ----------------------------------------------------------
  // 7. Career / Readiness.
  // ----------------------------------------------------------

  const careerDecision =
    buildCareerDecision(baseContext);

  if (careerDecision) {
    return careerDecision;
  }


  // ----------------------------------------------------------
  // 8. Pay / Benefits.
  // ----------------------------------------------------------

  const payDecision =
    buildPayDecision(baseContext);

  if (payDecision) {
    return payDecision;
  }


  // ----------------------------------------------------------
  // 9. PCS / Duty Station.
  // ----------------------------------------------------------

  const pcsDecision =
    buildPcsDecision(baseContext);

  if (pcsDecision) {
    return pcsDecision;
  }


  // ----------------------------------------------------------
  // 10. Housing / Mortgage / Financial readiness.
  // ----------------------------------------------------------

  const housingDecision =
    buildHousingDecision(baseContext);

  if (housingDecision) {
    return housingDecision;
  }


  // ----------------------------------------------------------
  // 11. VA Loan.
  // ----------------------------------------------------------

  const vaLoanDecision =
    buildVaLoanDecision(baseContext);

  if (vaLoanDecision) {
    return vaLoanDecision;
  }


  // ----------------------------------------------------------
  // 12. Existing deterministic next action can inform routing.
  // ----------------------------------------------------------

  const nextActionDecision =
    decisionFromTruthNextAction(baseContext);

  if (nextActionDecision) {
    return nextActionDecision;
  }


  // ----------------------------------------------------------
  // 13. Default: answer normally.
  // ----------------------------------------------------------

  return answerDecision(
    "request is specific enough to answer"
  );
}


// ============================================================
// UI MERGE HELPER
// ============================================================

export function applyAmyElicitationToUi(
  baseUi = {},
  decision = null
) {

  const ui =
    baseUi &&
    typeof baseUi === "object"
      ? { ...baseUi }
      : {};

  if (
    !decision ||
    typeof decision !== "object"
  ) {
    return ui;
  }

  const decisionUi =
    decision.ui &&
    typeof decision.ui === "object"
      ? decision.ui
      : {};

  return {
    ...ui,
    ...decisionUi
  };
}


// ============================================================
// PRIMARY ELICITATION
// ============================================================

function primaryElicitation(
  question,
  detail,
  id = "primary"
) {

  return elicitDecision({
    id,
    question,
    detail,

    options: [

      option(
        "pay_benefits",
        "Pay & Benefits",
        "Base Pay, BAH, retirement, VA benefits",
        "I want help with my military pay or benefits."
      ),

      option(
        "pcs_duty_station",
        "PCS & Duty Station",
        "Orders, bases, relocation, local area",
        "I want help with a PCS or duty station."
      ),

      option(
        "housing_finances",
        "Housing & Finances",
        "Mortgage, affordability, buying decisions",
        "I want help with housing or my finances."
      ),

      option(
        "career_readiness",
        "Career & Readiness",
        "PT, WAPS, performance reports",
        "I want help with career or readiness."
      )

    ]
  });
}


// ============================================================
// PAY / BENEFITS
// ============================================================

function buildPayDecision(ctx) {

  const { lower, intent } = ctx;

  const hasPayTerms =
    /\b(pay|base pay|bah|bas|compensation|allowance|benefits?)\b/
      .test(lower);

  const hasRetirement =
    /\b(retire|retirement|retiree|pension|high[- ]?3|brs)\b/
      .test(lower);

  const hasDisability =
    /\b(va disability|disability rating|combined rating|va rating)\b/
      .test(lower);

  const isGenericPay =
    intent === "compensation" &&
    (
      lower === "pay" ||
      lower === "military pay" ||
      lower === "pay and benefits" ||
      lower === "pay & benefits" ||
      lower === "benefits" ||
      /\bhelp\b.*\b(pay|benefits)\b/.test(lower)
    );


  if (hasRetirement) {

    if (asksForExplanation(lower)) {
      return null;
    }

    return routeDecision(
      "retirement",
      "The Retirement Calculator is the best place to model military retirement pay.",
      false
    );
  }


  if (hasDisability) {

    if (asksForExplanation(lower)) {
      return null;
    }

    return routeDecision(
      "disability",
      "The VA Disability Calculator is the best place to model a combined disability rating.",
      false
    );
  }


  if (isGenericPay) {

    return elicitDecision({

      id: "pay_type",

      question:
        "What do you want to understand?",

      detail:
        "I’ll guide you to the tool built for that decision.",

      options: [

        option(
          "base_pay_bah",
          "My Base Pay or BAH",
          "Estimate military compensation",
          "I want to calculate my Base Pay or BAH."
        ),

        option(
          "retirement_pay",
          "My Retirement Pay",
          "High-3 or BRS planning",
          "I want to estimate my military retirement pay."
        ),

        option(
          "va_disability",
          "My VA Disability",
          "Combined disability rating",
          "I want to calculate my VA disability rating."
        ),

        option(
          "other_pay",
          "Something else",
          "Ask Amy in your own words",
          "I have another military pay or benefits question."
        )

      ]
    });
  }


  if (
    hasPayTerms &&
    asksForCalculator(lower)
  ) {

    return routeDecision(
      "bah",
      "The BAH & Base Pay Calculator is the right starting point for military compensation.",
      false
    );
  }


  return null;
}


// ============================================================
// CAREER / READINESS
// ============================================================

function buildCareerDecision(ctx) {

  const { lower, intent } = ctx;

  const hasPt =
    /\b(pt|fitness|fitness assessment|prfa|run time|push[- ]?ups?|sit[- ]?ups?|hamr)\b/
      .test(lower);

  const hasWaps =
    /\b(waps|promotion|promote|ssgt|tsgt|promotion score)\b/
      .test(lower);

  const hasOpb =
    /\b(opb|officer performance brief|performance brief)\b/
      .test(lower);

  const generic =
    /\b(career|readiness|career and readiness|career & readiness)\b/
      .test(lower) &&
    !hasPt &&
    !hasWaps &&
    !hasOpb;


  if (hasPt) {

    if (asksForExplanation(lower)) {
      return null;
    }

    return routeDecision(
      "pt",
      "The PT Calculator is the right place to calculate and review a fitness score.",
      false
    );
  }


  if (hasWaps) {

    if (asksForExplanation(lower)) {
      return null;
    }

    return routeDecision(
      "waps",
      "The WAPS Calculator is the right place to model promotion scoring.",
      false
    );
  }


  if (hasOpb) {

    return routeDecision(
      "opb",
      "The OPB Generator is the right place to work on an Officer Performance Brief.",
      false
    );
  }


  if (
    generic ||
    intent === "career_readiness"
  ) {

    return elicitDecision({

      id: "career_type",

      question:
        "What do you want to work on?",

      detail:
        "Choose the area that best matches your goal.",

      options: [

        option(
          "pt_fitness",
          "PT / Fitness",
          "Calculate and review your fitness score",
          "I want help with PT or my fitness assessment."
        ),

        option(
          "promotion_waps",
          "Promotion / WAPS",
          "Calculate promotion scoring",
          "I want help with WAPS or promotion scoring."
        ),

        option(
          "opb",
          "Officer Performance Brief",
          "Work with the OPB Generator",
          "I want help with an Officer Performance Brief."
        ),

        option(
          "other_career",
          "Something else",
          "Ask Amy in your own words",
          "I have another career or readiness question."
        )

      ]
    });
  }


  return null;
}


// ============================================================
// PCS / DUTY STATION
// ============================================================

function buildPcsDecision(ctx) {

  const { lower, intent } = ctx;

  const hasPcs =
    intent === "pcs_housing_strategy" ||
    /\b(pcs|orders|duty station|reassignment|move|moving|new base)\b/
      .test(lower);

  if (!hasPcs) {
    return null;
  }


  const wantsPay =
    /\b(pay|bah|base pay|compensation|allowance)\b/
      .test(lower);

  const wantsArea =
    /\b(neighborhood|commute|local area|surrounding area|area around|schools?|market|where to live|base demographics)\b/
      .test(lower);

  const wantsMap =
    /\b(map|where is|location of|interactive map)\b/
      .test(lower);

  const wantsHousing =
    /\b(housing|house|home|mortgage|buy|rent|afford)\b/
      .test(lower);

  const wantsOverview =
    /\b(snapshot|overview|big picture|everything|overall pcs)\b/
      .test(lower);


  if (wantsPay) {

    return routeDecision(
      "bah",
      "Start with military compensation so you can see the pay and BAH impact of the move.",
      false
    );
  }


  if (wantsMap) {

    return routeDecision(
      "baseMap",
      "The Interactive Base Map is the right place to orient yourself geographically.",
      false
    );
  }


  if (wantsArea) {

    return routeDecision(
      "baseDemographics",
      "Base Demographics is the right place for housing, commute, neighborhood and local-area intelligence.",
      false
    );
  }


  if (wantsOverview) {

    return routeDecision(
      "pcsSnapshot",
      "PCS Snapshot is the best place to start with the overall move.",
      false
    );
  }


  if (wantsHousing) {

    return housingElicitation(
      "What are you trying to decide about housing at your next duty station?"
    );
  }


  // "I got orders to Lackland" is intentionally broad.
  return elicitDecision({

    id: "pcs_goal",

    question:
      "What do you want to understand about your PCS?",

    detail:
      "Choose the part of the move that matters most.",

    options: [

      option(
        "pcs_pay",
        "My pay after the move",
        "Base Pay, BAH and compensation",
        "I want to understand my pay after the PCS."
      ),

      option(
        "pcs_area",
        "The base & surrounding area",
        "Housing, commute and local intelligence",
        "I want to understand the base and surrounding area."
      ),

      option(
        "pcs_housing",
        "Housing at my next base",
        "Mortgage, affordability, buying or renting",
        "I want help with housing at my next duty station."
      ),

      option(
        "pcs_overview",
        "My overall PCS picture",
        "Start with a complete PCS overview",
        "I want an overall PCS overview."
      )

    ]
  });
}


// ============================================================
// HOUSING / FINANCE
// ============================================================

function buildHousingDecision(ctx) {

  const { lower, intent } = ctx;

  const hasMortgage =
    intent === "mortgage_explanation" ||
    /\b(mortgage|monthly payment|home payment|principal|interest|piti|property tax|homeowners insurance|hoa|pmi)\b/
      .test(lower);

  const hasAffordability =
    intent === "housing_affordability" ||
    /\b(afford|affordability|how much house|buying power|financial readiness|ready to buy|can i afford)\b/
      .test(lower);

  const hasRentBuy =
    intent === "rent_vs_buy" ||
    /\b(rent vs buy|rent or buy|should i rent|should i buy)\b/
      .test(lower);

  const broadHousing =
    /\b(housing|housing and finances|housing & finances|home buying|buy a home|buying a home)\b/
      .test(lower) &&
    !hasMortgage &&
    !hasAffordability &&
    !hasRentBuy;


  if (hasAffordability) {

    if (
      asksForExplanation(lower) &&
      !/\bcan i afford\b/.test(lower)
    ) {
      return null;
    }

    return routeDecision(
      "financial",
      "Financial Readiness is the best place to compare housing cost against income, expenses and monthly obligations.",
      false
    );
  }


  if (hasMortgage) {

    if (asksForExplanation(lower)) {
      return null;
    }

    return routeDecision(
      "mortgage",
      "The Mortgage Calculator is the best place to establish the all-in monthly housing payment.",
      false
    );
  }


  if (hasRentBuy) {

    // This is a decision question. Let Agent Amy answer using the
    // available Truth Packet instead of forcing a redirect.
    return answerDecision(
      "rent-versus-buy decision should be explained with user context"
    );
  }


  if (broadHousing) {
    return housingElicitation();
  }


  return null;
}


function housingElicitation(
  question = "What are you trying to decide?"
) {

  return elicitDecision({

    id: "housing_goal",

    question,

    detail:
      "I’ll start with the calculation that matters most.",

    options: [

      option(
        "payment",
        "What would my payment be?",
        "Estimate all-in monthly housing cost",
        "I want to estimate my monthly mortgage payment."
      ),

      option(
        "affordability",
        "Can I afford this home?",
        "Review financial readiness",
        "I want to know whether I can afford a home."
      ),

      option(
        "buy_before_pcs",
        "Should I buy before my PCS?",
        "Consider the move, finances and timeline",
        "I want to decide whether I should buy before my PCS."
      ),

      option(
        "other_housing",
        "Something else",
        "Ask Amy in your own words",
        "I have another housing or financial question."
      )

    ]
  });
}


// ============================================================
// VA LOAN
// ============================================================

function buildVaLoanDecision(ctx) {

  const {
    lower,
    intent,
    profile,
    scenario,
    missing
  } = ctx;

  const isVaLoan =
    intent === "va_loan" ||
    /\b(va loan|va mortgage|funding fee|coe|certificate of eligibility|entitlement)\b/
      .test(lower);

  if (!isVaLoan) {
    return null;
  }


  if (asksForExplanation(lower)) {
    return null;
  }


  const priorUseKnown =
    hasValue(
      firstDefined(
        scenario?.priorUse,
        profile?.priorUse,
        profile?.va_prior_use
      )
    );

  const fundingStatusKnown =
    hasValue(
      firstDefined(
        scenario?.fundingFeeExempt,
        profile?.funding_fee_exempt,
        profile?.fundingFeeExempt,
        profile?.va_disability
      )
    );


  if (
    missing.includes("first or subsequent VA loan use") &&
    !priorUseKnown
  ) {

    return elicitDecision({

      id: "va_prior_use",

      question:
        "Have you used your VA home-loan benefit before?",

      detail:
        "This can affect the funding-fee calculation.",

      options: [

        option(
          "first_use",
          "No — this would be my first use",
          "",
          "This would be my first use of the VA home-loan benefit."
        ),

        option(
          "subsequent_use",
          "Yes — I have used it before",
          "",
          "I have used my VA home-loan benefit before."
        ),

        option(
          "not_sure",
          "I'm not sure",
          "",
          "I'm not sure whether this counts as first or subsequent VA loan use."
        ),

        option(
          "just_questions",
          "I only have a general VA Loan question",
          "",
          "I only want general VA Loan guidance right now."
        )

      ]
    });
  }


  if (
    missing.includes("funding fee exemption status") &&
    !fundingStatusKnown &&
    /\b(funding fee|exempt|exemption)\b/.test(lower)
  ) {

    return elicitDecision({

      id: "va_funding_exemption",

      question:
        "Do you currently receive VA disability compensation?",

      detail:
        "That can affect whether a VA funding-fee exemption may apply. Official status still has to be confirmed.",

      options: [

        option(
          "va_comp_yes",
          "Yes",
          "I currently receive VA disability compensation",
          "Yes, I currently receive VA disability compensation."
        ),

        option(
          "va_comp_no",
          "No",
          "I do not currently receive VA disability compensation",
          "No, I do not currently receive VA disability compensation."
        ),

        option(
          "va_comp_pending",
          "Pending / not sure",
          "My status is pending or unclear",
          "My VA disability compensation status is pending or unclear."
        ),

        option(
          "general_va",
          "Skip this for now",
          "Give me general VA Loan guidance",
          "Skip the funding-fee exemption question and give me general VA Loan guidance."
        )

      ]
    });
  }


  if (
    /\b(payment|monthly|mortgage|calculate|calculator|scenario)\b/
      .test(lower)
  ) {

    return routeDecision(
      "mortgage",
      "The Mortgage Calculator is the right place to model a VA mortgage scenario.",
      false
    );
  }


  return null;
}


// ============================================================
// MISSING INPUTS
// ============================================================

function buildMissingInputElicitation(ctx) {

  const {
    lower,
    intent,
    profile,
    scenario,
    missing
  } = ctx;


  // ----------------------------------------------------------
  // BAH dependent status
  // agent-amy's existing missing-input list does not currently
  // always include this, so inspect the scenario directly.
  // ----------------------------------------------------------

  const wantsOwnBah =
    intent === "compensation" &&
    /\b(my bah|calculate.*bah|bah.*calculate|what.*my.*bah|my military pay)\b/
      .test(lower);

  const dependencyStatus =
    firstDefined(
      scenario?.family,
      profile?.family,
      profile?.with_dependents,
      profile?.withDependents,
      profile?.hasDependents
    );

  const hasRank =
    hasValue(
      firstDefined(
        scenario?.rank_paygrade,
        profile?.rank_paygrade,
        profile?.rank
      )
    );

  const hasLocation =
    hasValue(
      firstDefined(
        scenario?.base,
        scenario?.zip,
        profile?.base,
        profile?.zip
      )
    );


  if (
    wantsOwnBah &&
    dependencyStatus == null &&
    hasRank &&
    hasLocation
  ) {

    return elicitDecision({

      id: "bah_dependents",

      question:
        "For BAH, should I use the with-dependents or without-dependents rate?",

      detail:
        "This is the last piece I need to choose the correct BAH category.",

      options: [

        option(
          "with_dependents",
          "With dependents",
          "",
          "Use the BAH rate with dependents."
        ),

        option(
          "without_dependents",
          "Without dependents",
          "",
          "Use the BAH rate without dependents."
        ),

        option(
          "not_sure",
          "I'm not sure",
          "",
          "I'm not sure which BAH dependent category applies to me."
        )

      ]
    });
  }


  // ----------------------------------------------------------
  // Loan type — only when user is clearly trying to model a
  // mortgage and loan type is actually unresolved.
  // ----------------------------------------------------------

  const wantsMortgageModel =
    intent === "mortgage_explanation" &&
    /\b(calculate|estimate|payment|scenario|mortgage)\b/
      .test(lower);

  const loanType =
    safeStr(
      firstDefined(
        scenario?.loanType,
        profile?.loanType
      )
    ).toLowerCase();


  if (
    wantsMortgageModel &&
    !loanType
  ) {

    return elicitDecision({

      id: "loan_type",

      question:
        "Which loan type are you considering?",

      detail:
        "The payment assumptions can differ by loan type.",

      options: [

        option(
          "va",
          "VA Loan",
          "Military / Veteran home loan",
          "Use a VA Loan scenario."
        ),

        option(
          "conventional",
          "Conventional",
          "Standard conventional mortgage",
          "Use a conventional mortgage scenario."
        ),

        option(
          "fha",
          "FHA",
          "FHA-backed mortgage",
          "Use an FHA mortgage scenario."
        ),

        option(
          "not_sure",
          "I'm not sure",
          "Help me understand the difference",
          "I'm not sure which mortgage type I should use."
        )

      ]
    });
  }


  // Numeric / free-text missing fields should NOT be turned into
  // fake multiple-choice questions.
  //
  // Examples:
  // - rank/paygrade
  // - years of service
  // - base / ZIP
  // - home price
  // - credit score
  // - expenses
  //
  // Agent Amy can simply ask for the smallest missing input in
  // conversational text.
  return null;
}


// ============================================================
// TRUTH-PACKET NEXT ACTION
// ============================================================

function decisionFromTruthNextAction(ctx) {

  const next =
    ctx.publicPacket?.next_action;

  if (
    !next ||
    typeof next !== "object"
  ) {
    return null;
  }

  const type =
    normalize(next.type);

  const missing =
    Array.isArray(next.missing)
      ? next.missing.map(safeStr)
      : [];


  // These require data entry, not routing.
  if (
    type === "collect_missing_inputs" ||
    type === "collect_compensation_inputs"
  ) {

    // If there is a structured question we know how to ask,
    // buildMissingInputElicitation() already handled it.
    //
    // Otherwise let normal Agent Amy text ask for the missing
    // field rather than inventing dropdown choices.
    return null;
  }


  if (
    type === "review_housing_cap"
  ) {

    return routeDecision(
      "financial",
      safeStr(next.message) ||
      "Use Financial Readiness to turn compensation into a practical housing range.",
      false
    );
  }


  if (
    type === "review_payment"
  ) {

    return routeDecision(
      "mortgage",
      safeStr(next.message) ||
      "Review the full mortgage payment before making the housing decision.",
      false
    );
  }


  if (
    type === "va_payment_compare"
  ) {

    return routeDecision(
      "mortgage",
      safeStr(next.message) ||
      "Use the Mortgage Calculator to compare the VA payment.",
      false
    );
  }


  // Do not automatically navigate for caution/no-go decisions.
  // Amy should explain the result before the user chooses a tool.
  if (
    [
      "reduce_risk",
      "pause_or_rework",
      "proceed_with_guardrails",
      "va_funding_fee_review"
    ].includes(type)
  ) {

    return answerDecision(
      `truth-packet next action: ${type}`
    );
  }


  return null;
}


// ============================================================
// EXPLICIT NAVIGATION
// ============================================================

function detectExplicitNavigation(ctx) {

  const { lower } = ctx;

  const isExplicit =
    /\b(open|take me to|go to|launch|send me to|show me the|bring me to)\b/
      .test(lower);

  if (!isExplicit) {
    return null;
  }


  const candidates = [

    {
      route: "bah",
      pattern:
        /\b(bah|base pay|pay calculator|military pay)\b/,
      reason:
        "Opening the BAH & Base Pay Calculator."
    },

    {
      route: "retirement",
      pattern:
        /\b(retirement|retiree pay|high[- ]?3|brs)\b/,
      reason:
        "Opening the Retirement Calculator."
    },

    {
      route: "disability",
      pattern:
        /\b(va disability|disability rating|combined rating)\b/,
      reason:
        "Opening the VA Disability Calculator."
    },

    {
      route: "mortgage",
      pattern:
        /\b(mortgage|va mortgage|va loan|home payment)\b/,
      reason:
        "Opening the Mortgage Calculator."
    },

    {
      route: "financial",
      pattern:
        /\b(financial readiness|financial dashboard|affordability)\b/,
      reason:
        "Opening Financial Readiness."
    },

    {
      route: "pcsSnapshot",
      pattern:
        /\b(pcs snapshot|pcs overview)\b/,
      reason:
        "Opening PCS Snapshot."
    },

    {
      route: "pcsCalculator",
      pattern:
        /\b(pcs calculator)\b/,
      reason:
        "Opening the PCS Calculator."
    },

    {
      route: "baseDemographics",
      pattern:
        /\b(base demographics|neighborhoods?|commute|local area)\b/,
      reason:
        "Opening Base Demographics."
    },

    {
      route: "baseMap",
      pattern:
        /\b(base map|interactive map)\b/,
      reason:
        "Opening the Interactive Base Map."
    },

    {
      route: "housingQuiz",
      pattern:
        /\b(housing quiz|home preference|housing preference)\b/,
      reason:
        "Opening the Housing Quiz."
    },

    {
      route: "pt",
      pattern:
        /\b(pt|fitness calculator|fitness assessment)\b/,
      reason:
        "Opening the PT Calculator."
    },

    {
      route: "waps",
      pattern:
        /\b(waps|promotion calculator|promotion score)\b/,
      reason:
        "Opening the WAPS Calculator."
    },

    {
      route: "opb",
      pattern:
        /\b(opb|officer performance brief)\b/,
      reason:
        "Opening the OPB Generator."
    },

    {
      route: "information",
      pattern:
        /\b(information center|how thewing works|methodology)\b/,
      reason:
        "Opening the Information Center."
    },

    {
      route: "about",
      pattern:
        /\b(about|our story|who built thewing)\b/,
      reason:
        "Opening About TheWing."
    }

  ];


  for (const candidate of candidates) {

    if (
      candidate.pattern.test(lower)
    ) {

      return candidate;
    }

  }


  return null;
}


// ============================================================
// QUESTION CLASSIFICATION
// ============================================================

function looksLikeDefinitionQuestion(text) {

  if (!text) {
    return false;
  }

  if (
    /\b(open|take me to|go to|launch|show me the)\b/
      .test(text)
  ) {
    return false;
  }

  return (
    /^(what is|what's|what does|who is|who's|define|explain|why does|how does)\b/
      .test(text) ||
    /\bwhat does .* mean\b/.test(text)
  );
}


function asksForExplanation(text) {

  return (
    looksLikeDefinitionQuestion(text) ||
    /\b(explain|understand|why|what does this mean|how does it work)\b/
      .test(text)
  );
}


function asksForCalculator(text) {

  return (
    /\b(calculate|calculator|estimate|run the numbers|figure out my)\b/
      .test(text)
  );
}


function looksLikeNewVisitor(text) {

  return (
    /\b(first time|new here|new to thewing|new to the wing|never used this|where do i start)\b/
      .test(text)
  );
}


function isGreeting(text) {

  return (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening|hi amy|hey amy|hello amy)[!,. ]*$/
      .test(text)
  );
}


function looksLikeBroadHelp(
  text,
  intent
) {

  if (
    intent === "capabilities"
  ) {
    return true;
  }

  if (
    /\b(which tool|what tool|where should i start|where do i go|help me find|not sure what i need|not sure where to start)\b/
      .test(text)
  ) {
    return true;
  }

  if (
    /^(help|help me|can you help|what can you do|how can you help)[?.! ]*$/
      .test(text)
  ) {
    return true;
  }

  return false;
}


// ============================================================
// DECISION BUILDERS
// ============================================================

function answerDecision(
  reason = ""
) {

  return {
    ok: true,
    version: VERSION,
    mode: "answer",
    reason,

    ui: {
      mode: "answer"
    }
  };
}


function elicitDecision({
  id,
  question,
  detail = "",
  options = []
}) {

  const cleanOptions =
    Array.isArray(options)
      ? options
          .filter(Boolean)
          .slice(0, 5)
      : [];

  return {
    ok: true,
    version: VERSION,
    mode: "elicit",
    reason: id || "clarification_needed",

    ui: {
      mode: "elicit",

      elicitation: {
        id:
          safeStr(id) ||
          "clarification",

        question:
          safeStr(question),

        detail:
          safeStr(detail),

        options:
          cleanOptions
      }
    }
  };
}


function routeDecision(
  routeKey,
  reason = "",
  auto = false
) {

  const route =
    AMY_ROUTES[routeKey];

  if (!route) {
    return answerDecision(
      `unknown route: ${routeKey}`
    );
  }

  return {
    ok: true,
    version: VERSION,
    mode: "route",
    reason:
      safeStr(reason) ||
      `route to ${routeKey}`,

    ui: {
      mode: "route",

      action: {
        type: "navigate",
        app: route.app,
        label: route.label,
        url: route.url,
        reason:
          safeStr(reason) ||
          "This is the best next step based on what you asked.",
        auto: Boolean(auto)
      }
    }
  };
}


function option(
  id,
  label,
  description,
  value
) {

  return {
    id: safeStr(id),
    label: safeStr(label),
    description: safeStr(description),
    value: safeStr(value)
  };
}


// ============================================================
// SMALL HELPERS
// ============================================================

function safeStr(value) {
  return String(value ?? "").trim();
}


function normalize(value) {
  return safeStr(value).toLowerCase();
}


function hasValue(value) {

  return (
    value !== undefined &&
    value !== null &&
    value !== ""
  );
}


function firstDefined(
  ...values
) {

  for (const value of values) {

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}


// ============================================================
// OPTIONAL DEBUG HELPER
// ============================================================

export function summarizeAmyElicitation(
  decision
) {

  if (
    !decision ||
    typeof decision !== "object"
  ) {
    return {
      mode: "answer",
      reason: "no decision"
    };
  }

  return {
    version:
      decision.version ||
      VERSION,

    mode:
      decision.mode ||
      "answer",

    reason:
      decision.reason ||
      "",

    elicitation_id:
      decision.ui?.elicitation?.id ||
      null,

    option_count:
      Array.isArray(
        decision.ui?.elicitation?.options
      )
        ? decision.ui.elicitation.options.length
        : 0,

    action_app:
      decision.ui?.action?.app ||
      null,

    action_url:
      decision.ui?.action?.url ||
      null,

    action_auto:
      decision.ui?.action?.auto === true
  };
}


export default buildAmyElicitation;
