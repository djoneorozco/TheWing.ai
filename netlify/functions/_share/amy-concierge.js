// netlify/functions/_share/amy-concierge.js
// ============================================================
// THEWING.AI • AMY CONCIERGE
// v1.0.0
//
// PURPOSE
// Amy Concierge is Amy's conversational / hospitality layer.
//
// TheWing calculates.
// Amy Brain knows.
// Amy Concierge talks.
//
// RESPONSIBILITIES
// - Greetings
// - "What can you do?"
// - "Who are you?"
// - TheWing.ai orientation
// - PCSUnited orientation
// - General navigation/orientation
// - Thanks / acknowledgements
// - Conversational handoff into deterministic Amy Brain tools
//
// DOES NOT
// - Calculate pay
// - Calculate BAH
// - Calculate mortgages
// - Determine affordability
// - Determine VA eligibility
// - Replace Amy Brain
// - Access Supabase/member accounts
// ============================================================

export const AMY_CONCIERGE_VERSION = "1.0.0";


// ============================================================
// 1. CONCIERGE INTENTS
// ============================================================

export const AMY_CONCIERGE_INTENTS = Object.freeze({

  GREETING:
    "greeting",

  CAPABILITIES:
    "capabilities",

  WHO_IS_AMY:
    "who_is_amy",

  ABOUT_THEWING:
    "about_thewing",

  ABOUT_PCSUNITED:
    "about_pcsunited",

  ORIENTATION:
    "orientation",

  THANKS:
    "thanks",

  GOODBYE:
    "goodbye"

});


// ============================================================
// 2. BASIC HELPERS
// ============================================================

function safeStr(value) {

  return String(
    value ?? ""
  ).trim();

}


function normalizeText(value) {

  return safeStr(value)
    .toLowerCase()
    .replace(/\s+/g, " ");

}


function stripEndingPunctuation(value) {

  return normalizeText(value)
    .replace(/[.!?]+$/g, "")
    .trim();

}


// ============================================================
// 3. CONCIERGE INTENT DETECTION
//
// This supplements agent-amy-public.js.
//
// Existing agent intent can still be passed in.
// ============================================================

export function detectAmyConciergeIntent(
  message,
  existingIntent = ""
) {

  const text =
    stripEndingPunctuation(
      message
    );


  const currentIntent =
    safeStr(
      existingIntent
    )
      .toLowerCase();


  // ==========================================================
  // EXISTING PUBLIC AGENT INTENTS
  // ==========================================================

  if (
    currentIntent ===
    "greeting"
  ) {

    return AMY_CONCIERGE_INTENTS.GREETING;

  }


  if (
    currentIntent ===
    "capabilities"
  ) {

    return AMY_CONCIERGE_INTENTS.CAPABILITIES;

  }


  // ==========================================================
  // EMPTY
  // ==========================================================

  if (!text) {

    return "";

  }


  // ==========================================================
  // GREETING
  // ==========================================================

  if (
    /^(hi|hello|hey|hey amy|hi amy|hello amy|yo|good morning|good afternoon|good evening|what's up|whats up)$/.test(
      text
    )
  ) {

    return AMY_CONCIERGE_INTENTS.GREETING;

  }


  // ==========================================================
  // WHO IS AMY
  // ==========================================================

  if (
    /\bwho are you\b/.test(text) ||
    /\bwhat are you\b/.test(text) ||
    /\btell me about yourself\b/.test(text) ||
    /\bwho is amy\b/.test(text) ||
    /\bwhat is amy\b/.test(text)
  ) {

    return AMY_CONCIERGE_INTENTS.WHO_IS_AMY;

  }


  // ==========================================================
  // CAPABILITIES
  // ==========================================================

  if (
    /\bhow can you help\b/.test(text) ||
    /\bwhat can you do\b/.test(text) ||
    /\bwhat do you do\b/.test(text) ||
    /\bwhat can i ask\b/.test(text) ||
    /\bhow do you help\b/.test(text) ||
    /\bhelp me get started\b/.test(text)
  ) {

    return AMY_CONCIERGE_INTENTS.CAPABILITIES;

  }


  // ==========================================================
  // THEWING.AI
  // ==========================================================

  if (
    /\bwhat is thewing\b/.test(text) ||
    /\bwhat is thewing\.ai\b/.test(text) ||
    /\btell me about thewing\b/.test(text) ||
    /\btell me about thewing\.ai\b/.test(text) ||
    /\bwhat does thewing do\b/.test(text) ||
    /\bwhat does thewing\.ai do\b/.test(text)
  ) {

    return AMY_CONCIERGE_INTENTS.ABOUT_THEWING;

  }


  // ==========================================================
  // PCSUNITED
  // ==========================================================

  if (
    /\bwhat is pcsunited\b/.test(text) ||
    /\btell me about pcsunited\b/.test(text) ||
    /\bwhat does pcsunited do\b/.test(text) ||
    /\bwhy pcsunited\b/.test(text)
  ) {

    return AMY_CONCIERGE_INTENTS.ABOUT_PCSUNITED;

  }


  // ==========================================================
  // ORIENTATION
  // ==========================================================

  if (
    /\bwhere do i start\b/.test(text) ||
    /\bwhere should i start\b/.test(text) ||
    /\bwhat should i do first\b/.test(text) ||
    /\bshow me around\b/.test(text) ||
    /\bhelp me navigate\b/.test(text) ||
    /\bwhich tool should i use\b/.test(text) ||
    /\bwhat tool should i use\b/.test(text)
  ) {

    return AMY_CONCIERGE_INTENTS.ORIENTATION;

  }


  // ==========================================================
  // THANKS
  // ==========================================================

  if (
    /^(thanks|thank you|thank you amy|thanks amy|perfect|awesome|great|got it|that helps|helpful)$/.test(
      text
    )
  ) {

    return AMY_CONCIERGE_INTENTS.THANKS;

  }


  // ==========================================================
  // GOODBYE
  // ==========================================================

  if (
    /^(bye|goodbye|see you|later|thanks bye|thank you bye)$/.test(
      text
    )
  ) {

    return AMY_CONCIERGE_INTENTS.GOODBYE;

  }


  return "";

}


// ============================================================
// 4. SHOULD CONCIERGE HANDLE THIS TURN?
// ============================================================

export function shouldAmyConciergeHandle({
  message = "",
  intent = ""
} = {}) {

  return Boolean(
    detectAmyConciergeIntent(
      message,
      intent
    )
  );

}


// ============================================================
// 5. GREETING
// ============================================================

function buildGreeting() {

  return (
    "Hey — I’m Amy. I’m here to help you make sense of military life without making you dig through a dozen tools first. " +
    "Tell me what you’re trying to figure out—PCS, pay, BAH, housing, affordability, benefits, or just where to start."
  );

}


// ============================================================
// 6. CAPABILITIES
// ============================================================

function buildCapabilities() {

  return (
    "Absolutely. Think of me as your guide through PCSUnited and TheWing.ai. " +
    "I can help you understand your military pay, explore a duty station, compare housing options, work through affordability or mortgage scenarios, explain VA loan concepts, and point you to the right tool. " +
    "What are you trying to figure out today?"
  );

}


// ============================================================
// 7. WHO IS AMY?
// ============================================================

function buildWhoIsAmy() {

  return (
    "I’m Amy, your military A.I. concierge. TheWing does the calculations and analysis behind the scenes; I help turn that information into something useful and tell you what to do next. " +
    "You can start with a question, a decision you’re facing, or even just tell me what’s going on."
  );

}


// ============================================================
// 8. ABOUT THEWING.AI
// ============================================================

function buildAboutTheWing() {

  return (
    "TheWing.ai is the decision-intelligence engine behind these tools. " +
    "It brings military compensation, PCS, housing, career, readiness, and benefits information together so you can understand the decision—not just see another calculator result. " +
    "I’m the concierge layer that helps you navigate and interpret it."
  );

}


// ============================================================
// 9. ABOUT PCSUNITED
// ============================================================

function buildAboutPCSUnited() {

  return (
    "PCSUnited is focused on helping military members and families make better PCS and housing decisions. " +
    "You can explore bases, understand compensation, compare housing scenarios, estimate affordability, and use TheWing.ai intelligence to connect the pieces. " +
    "If you tell me what you’re working through, I can point you in the right direction."
  );

}


// ============================================================
// 10. ORIENTATION
// ============================================================

function buildOrientation({
  normalizedProfile = null
} = {}) {

  const base =
    safeStr(
      normalizedProfile?.base
    );


  const rank =
    safeStr(
      normalizedProfile?.rank_paygrade ||
      normalizedProfile?.rank
    );


  // If public scenario data exists, Amy can gently orient
  // around it without sounding like a database report.

  if (
    base &&
    rank
  ) {

    return (
      `A good place to start is with the decision you’re trying to make. I can already work from the ${rank} and ${base} scenario currently on this page. ` +
      "From there, we can look at compensation, BAH, the local housing market, affordability, or your next PCS move. What do you want to tackle first?"
    );

  }


  if (base) {

    return (
      `Since you already have ${base} in the current scenario, we can start there. ` +
      "I can help you understand the area, BAH and compensation, housing options, affordability, or the PCS decision itself. Which one matters most right now?"
    );

  }


  return (
    "Start with the decision, not the calculator. Tell me what you’re trying to decide—where to live, whether you can afford a home, what your military compensation looks like, what a PCS will mean financially, or something else—and I’ll guide you from there."
  );

}


// ============================================================
// 11. THANKS
// ============================================================

function buildThanks() {

  return (
    "Anytime. If you want to keep going, give me the next question or decision you’re working through."
  );

}


// ============================================================
// 12. GOODBYE
// ============================================================

function buildGoodbye() {

  return (
    "You got it. I’ll be here when you need me."
  );

}


// ============================================================
// 13. BUILD CONCIERGE REPLY
//
// MAIN FUNCTION USED BY agent-amy-public.js
//
// Returns null when this is NOT a concierge turn.
// That allows Amy Brain / deterministic tools to continue.
// ============================================================

export function buildAmyConciergeReply({
  message = "",
  intent = "",
  normalizedProfile = null
} = {}) {

  const conciergeIntent =
    detectAmyConciergeIntent(
      message,
      intent
    );


  if (!conciergeIntent) {

    return null;

  }


  let reply =
    "";


  switch (
    conciergeIntent
  ) {

    case AMY_CONCIERGE_INTENTS.GREETING:

      reply =
        buildGreeting();

      break;


    case AMY_CONCIERGE_INTENTS.CAPABILITIES:

      reply =
        buildCapabilities();

      break;


    case AMY_CONCIERGE_INTENTS.WHO_IS_AMY:

      reply =
        buildWhoIsAmy();

      break;


    case AMY_CONCIERGE_INTENTS.ABOUT_THEWING:

      reply =
        buildAboutTheWing();

      break;


    case AMY_CONCIERGE_INTENTS.ABOUT_PCSUNITED:

      reply =
        buildAboutPCSUnited();

      break;


    case AMY_CONCIERGE_INTENTS.ORIENTATION:

      reply =
        buildOrientation({
          normalizedProfile
        });

      break;


    case AMY_CONCIERGE_INTENTS.THANKS:

      reply =
        buildThanks();

      break;


    case AMY_CONCIERGE_INTENTS.GOODBYE:

      reply =
        buildGoodbye();

      break;


    default:

      return null;

  }


  return {

    ok:
      true,

    source:
      "amy_concierge",

    version:
      AMY_CONCIERGE_VERSION,

    intent:
      conciergeIntent,

    reply

  };

}


// ============================================================
// 14. AMY PERSONALITY / STYLE INSTRUCTIONS
//
// This can ALSO be injected into agent-amy-public.js'
// OpenAI system prompt.
//
// Concierge is not only greetings.
// Amy's normal explanations should maintain the same personality.
// ============================================================

export function buildAmyConciergeStyleGuide() {

  return [
    "AMY CONCIERGE VOICE",
    "",
    "Amy is a military-focused A.I. concierge, not a generic customer-service chatbot.",
    "",
    "PERSONALITY:",
    "- Warm, confident, capable, and approachable.",
    "- Conversational without being overly casual.",
    "- Military-aware without sounding bureaucratic.",
    "- Helpful and proactive without being pushy.",
    "- Sounds like a knowledgeable concierge guiding a person through a decision.",
    "",
    "HOW AMY SHOULD RESPOND:",
    "- Answer the user's actual question first.",
    "- Then explain what matters.",
    "- Then offer the most useful next move when appropriate.",
    "- Use natural transitions instead of policy-style disclaimers.",
    "- Ask at most one useful follow-up question.",
    "- When the user seems unsure, help them discover what they actually need.",
    "",
    "AVOID:",
    "- Starting normal answers with privacy limitations.",
    "- Repeatedly saying 'I only know what is entered or calculated'.",
    "- Repeatedly saying 'current Resources-page scenario'.",
    "- Sounding like a database, policy notice, or legal disclaimer.",
    "- Saying 'I can provide guidance on various topics'.",
    "- Generic phrases such as 'How may I assist you?' when a more natural response works.",
    "- Repeating the user's question back to them.",
    "- Overexplaining the architecture.",
    "",
    "BOUNDARIES:",
    "- Never invent facts or numbers.",
    "- Never claim access to a member account when using Public Amy.",
    "- Never claim mortgage approval.",
    "- Never claim official VA eligibility.",
    "- If a boundary actually matters to the user's question, explain it naturally and briefly.",
    "",
    "CORE MODEL:",
    "- TheWing calculates and evaluates.",
    "- Amy Brain supplies deterministic knowledge.",
    "- Amy explains, guides, and helps the user decide what to do next."
  ].join("\n");

}


// ============================================================
// 15. OPTIONAL CONCIERGE METADATA
// ============================================================

export function getAmyConciergeMetadata() {

  return {

    name:
      "Amy",

    role:
      "A.I. Concierge",

    brand:
      "TheWing.ai",

    legacy_brand:
      "PCSUnited",

    version:
      AMY_CONCIERGE_VERSION,

    responsibilities: [

      "greetings",

      "capabilities",

      "orientation",

      "brand explanation",

      "conversational presentation",

      "next-step guidance"

    ],

    prohibited_responsibilities: [

      "calculations",

      "deterministic truth",

      "mortgage approval",

      "VA eligibility determination",

      "member authentication"

    ]

  };

}


// ============================================================
// 16. DEFAULT EXPORT
// ============================================================

export default {

  version:
    AMY_CONCIERGE_VERSION,

  intents:
    AMY_CONCIERGE_INTENTS,

  detectIntent:
    detectAmyConciergeIntent,

  shouldHandle:
    shouldAmyConciergeHandle,

  buildReply:
    buildAmyConciergeReply,

  buildStyleGuide:
    buildAmyConciergeStyleGuide,

  metadata:
    getAmyConciergeMetadata

};
