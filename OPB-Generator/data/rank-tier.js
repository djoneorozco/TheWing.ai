/**
 * PCSUnited / TheWing.ai
 * Air Force EPB Rank / Responsibility Intelligence
 *
 * File:
 *   data/rank-tier.js
 *
 * Version:
 *   1.0.0
 *
 * Purpose:
 *   Deterministically evaluate whether the authority, responsibility,
 *   organizational scope, leadership scope, and duty titles described
 *   in an accomplishment are reasonable for the rated member's rank.
 *
 * Core philosophy:
 *
 *   FACTS CONTROL.
 *
 *   Rank provides context.
 *   Rank does NOT erase a legitimately exceptional accomplishment.
 *
 *   TheWing should distinguish between:
 *
 *   1. DOCTRINAL RESTRICTION
 *      Official guidance places a clear constraint on a title/role.
 *
 *   2. EXPECTED RESPONSIBILITY
 *      The accomplishment is consistent with normal responsibility.
 *
 *   3. ELEVATED RESPONSIBILITY
 *      The accomplishment appears broader than normally expected and
 *      should be verified.
 *
 *   4. VERIFIED ABOVE-TIER PERFORMANCE
 *      The unusual responsibility is confirmed and can become part
 *      of the strength of the Performance Statement.
 *
 * IMPORTANT:
 *
 *   Do NOT automatically reject words such as:
 *     led
 *     directed
 *     managed
 *     authored
 *     oversaw
 *
 *   Those verbs are investigation triggers.
 *
 *   Example:
 *
 *     SrA: "Directed 8-person inspection team"
 *
 *   should normally trigger:
 *
 *     "Why were you in charge?"
 *
 *   rather than:
 *
 *     "SrA cannot use directed."
 *
 * ------------------------------------------------------------------
 * OFFICIAL SOURCE
 * ------------------------------------------------------------------
 *
 * U.S. Air Force
 * The Enlisted Force Structure
 * 4 September 2025
 *
 * Air University Foundational Resources / Brown Book
 *
 * This module intentionally distinguishes:
 *
 *   sourceType: "official"
 *       Directly derived from Air Force force-structure guidance.
 *
 *   sourceType: "product-heuristic"
 *       PCSUnited/TheWing writing intelligence designed to help
 *       identify unusual responsibility and generate coaching prompts.
 *
 * Career-field directives, organizational structure, local policy,
 * appointment orders, and verified circumstances always take
 * precedence over product heuristics.
 */


/* ================================================================
   VERSION / SOURCE METADATA
   ================================================================ */

export const RANK_TIER_VERSION = "1.0.0";

export const RANK_TIER_SOURCE = Object.freeze({
  title: "The Enlisted Force Structure",
  organization: "United States Air Force",
  publicationDate: "2025-09-04",
  nickname: "Brown Book",
  authority: "official",
  scope: "USAF enlisted force structure",
  url:
    "https://www.airuniversity.af.edu/Portals/10/Foundational-Resources/Enlisted-Force-Structure-Sep2025.pdf",
});


/* ================================================================
   CONSTANTS
   ================================================================ */

export const TIER = Object.freeze({
  JUNIOR_ENLISTED: "junior_enlisted",
  NCO: "nco",
  SNCO: "snco",
});

export const RANK_STATUS = Object.freeze({
  OK: "OK",

  /**
   * Claim may be legitimate but requires more context.
   */
  VERIFY: "VERIFY",

  /**
   * User has verified responsibility that is unusual for rank.
   * This can become a positive discriminator in writing.
   */
  ABOVE_TIER_VERIFIED: "ABOVE_TIER_VERIFIED",

  /**
   * Official force-structure guidance contains a clear restriction.
   */
  RESTRICTED: "RESTRICTED",

  /**
   * Rank input could not be resolved.
   */
  UNKNOWN_RANK: "UNKNOWN_RANK",
});

export const SEVERITY = Object.freeze({
  INFO: "info",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

export const SOURCE_TYPE = Object.freeze({
  OFFICIAL: "official",
  HEURISTIC: "product-heuristic",
});


/* ================================================================
   RANK DEFINITIONS
   ================================================================ */

/**
 * responsibilityLevel is a PCSUnited internal heuristic.
 *
 * It is NOT an official Air Force numeric ranking system.
 *
 * It simply allows deterministic comparison between:
 *
 *   normal responsibility for rank
 *                vs
 *   responsibility implied by accomplishment
 */
export const RANKS = Object.freeze({
  AB: {
    code: "AB",
    title: "Airman Basic",
    payGrade: "E-1",
    tier: TIER.JUNIOR_ENLISTED,
    responsibilityLevel: 1,
  },

  AMN: {
    code: "Amn",
    title: "Airman",
    payGrade: "E-2",
    tier: TIER.JUNIOR_ENLISTED,
    responsibilityLevel: 1,
  },

  A1C: {
    code: "A1C",
    title: "Airman First Class",
    payGrade: "E-3",
    tier: TIER.JUNIOR_ENLISTED,
    responsibilityLevel: 2,
  },

  SRA: {
    code: "SrA",
    title: "Senior Airman",
    payGrade: "E-4",
    tier: TIER.JUNIOR_ENLISTED,
    responsibilityLevel: 2,
  },

  SSGT: {
    code: "SSgt",
    title: "Staff Sergeant",
    payGrade: "E-5",
    tier: TIER.NCO,
    responsibilityLevel: 3,
  },

  TSGT: {
    code: "TSgt",
    title: "Technical Sergeant",
    payGrade: "E-6",
    tier: TIER.NCO,
    responsibilityLevel: 4,
  },

  MSGT: {
    code: "MSgt",
    title: "Master Sergeant",
    payGrade: "E-7",
    tier: TIER.SNCO,
    responsibilityLevel: 5,
  },

  SMSGT: {
    code: "SMSgt",
    title: "Senior Master Sergeant",
    payGrade: "E-8",
    tier: TIER.SNCO,
    responsibilityLevel: 6,
  },

  CMSGT: {
    code: "CMSgt",
    title: "Chief Master Sergeant",
    payGrade: "E-9",
    tier: TIER.SNCO,
    responsibilityLevel: 7,
  },
});


/* ================================================================
   UI RANK GROUPS
   ================================================================ */

/**
 * Current Single Statement Generator UI includes:
 *
 *   SrA & Below
 *   SSgt
 *   TSgt
 *   MSgt
 *   SMSgt
 *   CMSgt
 *
 * "SrA & Below" is intentionally treated as imprecise.
 *
 * Do NOT assume the member is a SrA.
 *
 * Example:
 *
 * "Supervisor" may be legitimate for a SrA under the appropriate
 * circumstances, but should not automatically be accepted for a
 * generic "SrA & Below" selection.
 */

export const UI_RANK_GROUPS = Object.freeze({
  "SrA & Below": {
    id: "sra_and_below",
    tier: TIER.JUNIOR_ENLISTED,
    exactRank: null,
    possibleRanks: ["AB", "AMN", "A1C", "SRA"],
    responsibilityLevel: 2,
    precision: "grouped",
  },

  SSgt: {
    id: "ssgt",
    exactRank: "SSGT",
    tier: TIER.NCO,
    responsibilityLevel: 3,
    precision: "exact",
  },

  TSgt: {
    id: "tsgt",
    exactRank: "TSGT",
    tier: TIER.NCO,
    responsibilityLevel: 4,
    precision: "exact",
  },

  MSgt: {
    id: "msgt",
    exactRank: "MSGT",
    tier: TIER.SNCO,
    responsibilityLevel: 5,
    precision: "exact",
  },

  SMSgt: {
    id: "smsgt",
    exactRank: "SMSGT",
    tier: TIER.SNCO,
    responsibilityLevel: 6,
    precision: "exact",
  },

  CMSgt: {
    id: "cmsgt",
    exactRank: "CMSGT",
    tier: TIER.SNCO,
    responsibilityLevel: 7,
    precision: "exact",
  },
});


/* ================================================================
   RANK ALIASES
   ================================================================ */

const RANK_ALIASES = Object.freeze({
  ab: "AB",
  "airman basic": "AB",
  e1: "AB",
  "e-1": "AB",

  amn: "AMN",
  airman: "AMN",
  e2: "AMN",
  "e-2": "AMN",

  a1c: "A1C",
  "airman first class": "A1C",
  e3: "A1C",
  "e-3": "A1C",

  sra: "SRA",
  "senior airman": "SRA",
  e4: "SRA",
  "e-4": "SRA",

  ssgt: "SSGT",
  "staff sergeant": "SSGT",
  e5: "SSGT",
  "e-5": "SSGT",

  tsgt: "TSGT",
  "technical sergeant": "TSGT",
  e6: "TSGT",
  "e-6": "TSGT",

  msgt: "MSGT",
  "master sergeant": "MSGT",
  e7: "MSGT",
  "e-7": "MSGT",

  smsgt: "SMSGT",
  "senior master sergeant": "SMSGT",
  e8: "SMSGT",
  "e-8": "SMSGT",

  cmsgt: "CMSGT",
  "chief master sergeant": "CMSGT",
  e9: "CMSGT",
  "e-9": "CMSGT",
});


/* ================================================================
   TIER PROFILES
   ================================================================ */

/**
 * Tier membership is doctrinal.
 *
 * writingFocus / expectedScope are product interpretations designed
 * to help Amy frame accomplishments appropriately.
 */

export const TIER_PROFILES = Object.freeze({
  [TIER.JUNIOR_ENLISTED]: {
    id: TIER.JUNIOR_ENLISTED,
    displayName: "Junior Enlisted",
    payGrades: ["E-1", "E-2", "E-3", "E-4"],
    ranks: ["AB", "Amn", "A1C", "SrA"],

    sourceType: SOURCE_TYPE.OFFICIAL,

    writingFocus: [
      "technical execution",
      "job proficiency",
      "mission contribution",
      "initiative",
      "problem solving",
      "qualification progress",
      "training received",
      "training provided when supported",
      "peer influence",
      "developing leadership",
    ],

    normalScope: [
      "individual task",
      "aircraft or equipment task",
      "small team contribution",
      "technical inspection",
      "maintenance action",
      "qualification",
      "peer training",
      "shop-level mission contribution",
    ],

    elevatedScope: [
      "formal supervisory authority",
      "large-team direction",
      "flight-level authority",
      "multi-section operational control",
      "organizational policy",
      "command-level decision making",
      "unit-wide resource authority",
      "senior leader advisory role",
      "strategic organizational direction",
    ],
  },

  [TIER.NCO]: {
    id: TIER.NCO,
    displayName: "Noncommissioned Officer",
    payGrades: ["E-5", "E-6"],
    ranks: ["SSgt", "TSgt"],

    sourceType: SOURCE_TYPE.OFFICIAL,

    writingFocus: [
      "mission execution",
      "technical expertise",
      "direct supervision",
      "team leadership",
      "Airman development",
      "training",
      "standards",
      "accountability",
      "work-center performance",
      "resource stewardship",
      "problem solving",
    ],

    normalScope: [
      "team",
      "crew",
      "shift",
      "work center",
      "element",
      "direct supervision",
      "training program",
      "technical program",
      "unit-wide program when assigned",
    ],

    elevatedScope: [
      "flight-level enlisted leadership",
      "multi-flight authority",
      "group-level organizational control",
      "wing policy authority",
      "senior commander advisory authority",
      "strategic force management",
    ],
  },

  [TIER.SNCO]: {
    id: TIER.SNCO,
    displayName: "Senior Noncommissioned Officer",
    payGrades: ["E-7", "E-8", "E-9"],
    ranks: ["MSgt", "SMSgt", "CMSgt"],

    sourceType: SOURCE_TYPE.OFFICIAL,

    writingFocus: [
      "leader development",
      "operational leadership",
      "mission integration",
      "organizational leadership",
      "resource management",
      "cross-functional coordination",
      "organizational improvement",
      "commander support",
      "policy execution",
      "leader-of-leaders responsibilities",
    ],

    normalScope: [
      "section",
      "flight",
      "multiple work centers",
      "unit program",
      "organizational resources",
      "cross-functional coordination",
      "leader development",
      "mission oversight",
    ],

    elevatedScope: [
      "wing-wide strategy",
      "MAJCOM influence",
      "enterprise policy",
      "strategic force management",
      "Air Staff influence",
      "joint strategic leadership",
    ],
  },
});


/* ================================================================
   RANK-SPECIFIC WRITING PROFILES
   ================================================================ */

/**
 * These are NOT official prohibitions.
 *
 * They operationalize expected progression so that Amy can ask
 * better questions and frame the same accomplishment differently
 * depending on rank.
 */

export const RANK_WRITING_PROFILES = Object.freeze({
  AB: {
    emphasis: [
      "task execution",
      "learning",
      "technical development",
      "mission contribution",
      "initiative",
    ],

    avoidAssuming: [
      "formal supervision",
      "organizational authority",
      "policy authority",
    ],
  },

  AMN: {
    emphasis: [
      "technical development",
      "task execution",
      "mission contribution",
      "initiative",
      "team contribution",
    ],

    avoidAssuming: [
      "formal supervision",
      "work-center authority",
      "organizational authority",
    ],
  },

  A1C: {
    emphasis: [
      "technical proficiency",
      "qualification",
      "independent task execution",
      "mission contribution",
      "initiative",
      "peer support",
    ],

    avoidAssuming: [
      "formal supervision",
      "large-team authority",
      "organizational policy authority",
    ],
  },

  SRA: {
    emphasis: [
      "technical proficiency",
      "mission execution",
      "initiative",
      "problem solving",
      "peer development",
      "training",
      "emerging leadership",
    ],

    verifyWhenPresent: [
      "formal supervision",
      "flight-level direction",
      "large cross-functional leadership",
      "policy authority",
    ],
  },

  SSGT: {
    emphasis: [
      "direct supervision",
      "mission execution",
      "Airman development",
      "standards",
      "technical performance",
      "team leadership",
      "accountability",
    ],

    verifyWhenPresent: [
      "flight chief authority",
      "section chief authority",
      "multi-flight direction",
      "organizational policy authority",
    ],
  },

  TSGT: {
    emphasis: [
      "technical expertise",
      "team leadership",
      "Airman and NCO development",
      "work-center execution",
      "program management",
      "resource stewardship",
      "standards",
    ],

    verifyWhenPresent: [
      "flight chief authority",
      "section chief authority",
      "group or wing organizational authority",
      "strategic decision authority",
    ],
  },

  MSGT: {
    emphasis: [
      "operational leadership",
      "mission oversight",
      "leader development",
      "resource integration",
      "section or flight performance",
      "organizational improvement",
      "cross-functional coordination",
    ],

    verifyWhenPresent: [
      "wing-wide strategic authority",
      "MAJCOM-level policy authority",
      "enterprise-level direction",
    ],
  },

  SMSGT: {
    emphasis: [
      "organizational leadership",
      "leader development",
      "mission integration",
      "resource decisions",
      "cross-functional leadership",
      "organizational readiness",
      "senior leader advising",
    ],

    verifyWhenPresent: [
      "enterprise policy authority",
      "Air Staff authority",
      "strategic force-wide direction",
    ],
  },

  CMSGT: {
    emphasis: [
      "strategic leadership",
      "organizational direction",
      "senior leader advising",
      "force development",
      "resource prioritization",
      "policy influence",
      "enterprise impact",
    ],

    verifyWhenPresent: [
      "authority outside documented position",
    ],
  },
});


/* ================================================================
   OFFICIAL DUTY TITLE RULES
   ================================================================ */

/**
 * These rules are based on the common duty-title descriptions in
 * the 2025 Enlisted Force Structure.
 *
 * IMPORTANT:
 * Career-field governing directives and organizational structure
 * may further define duty-title use.
 */

export const DUTY_TITLE_RULES = Object.freeze({
  supervisor: {
    id: "supervisor",
    label: "Supervisor",

    patterns: [
      /\bsupervisor\b/i,
      /\bfirst[- ]line supervisor\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    allowedTiers: [
      TIER.JUNIOR_ENLISTED,
      TIER.NCO,
    ],

    juniorEnlistedMinimumRank: "SRA",

    requirements: [
      "Junior Enlisted member must be at least SrA",
      "Member must actually supervise the work of others",
    ],

    restrictionType: "conditional",

    coachingQuestions: [
      "What was your exact rank when you served as supervisor?",
      "Who did you formally supervise?",
      "How many Airmen were assigned to you?",
      "Were you officially designated as their supervisor?",
    ],
  },


  ncoic: {
    id: "ncoic",
    label: "NCOIC",

    patterns: [
      /\bncoic\b/i,
      /\bnoncommissioned officer in charge\b/i,
      /\bnon-commissioned officer in charge\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    typicalTiers: [TIER.NCO],

    /**
     * Do not hard-reject SNCO use solely from text.
     * Organizational naming can vary.
     */
    restrictionType: "verify-outside-typical",

    doctrinalContext:
      "Commonly used for NCOs responsible for a work center, element, or unit-wide program/function.",

    coachingQuestions: [
      "Were you officially serving as the NCOIC?",
      "What work center, element, program, or function were you responsible for?",
      "How many personnel or subordinate supervisors were involved?",
    ],
  },


  manager: {
    id: "manager",
    label: "Manager",

    patterns: [
      /\bmanager\b/i,
      /\bprogram manager\b/i,
      /\bproject manager\b/i,
      /\bpolicy manager\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    allowedTiers: [
      TIER.NCO,
      TIER.SNCO,
    ],

    restrictionType: "tier",

    doctrinalContext:
      "Used for NCOs and SNCOs serving as program, project, or policy managers at higher headquarters or staff levels.",

    coachingQuestions: [
      "Was Manager your official duty or assigned program role?",
      "What program, project, or policy did you manage?",
      "At what organizational level?",
    ],
  },


  flightChief: {
    id: "flight_chief",
    label: "Flight Chief",

    patterns: [
      /\bflight chief\b/i,
      /\bflight superintendent\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    typicalTiers: [TIER.SNCO],
    permittedTiers: [
      TIER.NCO,
      TIER.SNCO,
    ],

    ncoUsage: "occasional",

    restrictionType: "verify-if-nco",

    doctrinalContext:
      "Used for SNCOs, and occasionally NCOs, who are enlisted leaders of a flight.",

    coachingQuestions: [
      "Were you officially appointed or assigned as Flight Chief?",
      "Was this temporary or permanent?",
      "How long did you serve in the role?",
      "How many personnel, sections, or functions were under the flight?",
      "What mission authority did the position give you?",
    ],
  },


  sectionChief: {
    id: "section_chief",
    label: "Section Chief",

    patterns: [
      /\bsection chief\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    typicalTiers: [TIER.SNCO],
    permittedTiers: [
      TIER.NCO,
      TIER.SNCO,
    ],

    ncoUsage: "occasional",

    restrictionType: "verify-if-nco",

    doctrinalContext:
      "Used for SNCOs and occasionally NCOs responsible for a section with at least two subordinate work centers or elements.",

    coachingQuestions: [
      "Were you officially serving as Section Chief?",
      "Did the section contain at least two subordinate work centers or elements?",
      "How many personnel were assigned?",
      "Was the assignment temporary or permanent?",
    ],
  },


  superintendent: {
    id: "superintendent",
    label: "Superintendent",

    patterns: [
      /\bsuperintendent\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    allowedTiers: [TIER.SNCO],

    restrictionType: "hard",

    doctrinalContext:
      "The Enlisted Force Structure states only SNCOs will hold the duty title Superintendent.",

    coachingQuestions: [
      "Was Superintendent your official duty title?",
      "What functional responsibility did you oversee?",
    ],
  },


  chief: {
    id: "chief",
    label: "Chief",

    /**
     * Avoid matching phrases such as:
     *   crew chief
     *   assistant chief
     *
     * Those may be career-field titles and are not the same
     * general duty-title construct.
     */
    patterns: [
      /\bbranch chief\b/i,
      /\bdivision chief\b/i,
      /\bprogram chief\b/i,
      /\bpolicy chief\b/i,
    ],

    sourceType: SOURCE_TYPE.OFFICIAL,

    allowedRanks: ["CMSGT"],

    restrictionType: "hard-rank",

    doctrinalContext:
      "The general duty title Chief is used for CMSgts and civilians in specified program, project, or policy leadership roles.",

    coachingQuestions: [
      "Was Chief your official organizational duty title?",
      "What organization or program did you lead?",
    ],
  },
});


/* ================================================================
   RESPONSIBILITY CLAIM CATALOG
   ================================================================ */

/**
 * These are PCSUnited heuristics.
 *
 * They do NOT say:
 *
 *   "This rank cannot perform this action."
 *
 * They say:
 *
 *   "This wording implies a certain level of authority.
 *    Verify why the member had that authority."
 */

export const RESPONSIBILITY_CLAIMS = Object.freeze([

  /* --------------------------------------------------------------
     GENERAL LEADERSHIP
     -------------------------------------------------------------- */

  {
    id: "led_generic",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bled\b/i,
      /\bleading\b/i,
    ],

    impliedLevel: 2,

    category: "leadership",

    action: "investigate",

    message:
      "\"Led\" is vague. Determine why the member was leading and what authority, expertise, selection, or circumstance placed them in that role.",

    questions: [
      "Why were you the person leading this effort?",
      "Were you formally appointed?",
      "Were you the most qualified technician?",
      "Were you the SME?",
      "Were you the trainer?",
      "Were you filling a higher-level duty?",
      "How many people were involved?",
    ],
  },


  {
    id: "directed_people_or_operations",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bdirected\b/i,
      /\bdirected .*operations?\b/i,
      /\bdirected .*personnel\b/i,
      /\bdirected .*team\b/i,
    ],

    impliedLevel: 4,

    category: "authority",

    action: "verify",

    message:
      "\"Directed\" implies meaningful authority. Verify the member's role, appointment, scope, and decision authority.",

    questions: [
      "What role gave you authority to direct the effort?",
      "How many people or organizations were involved?",
      "Were you formally appointed as lead?",
      "What decisions were you personally responsible for?",
    ],
  },


  {
    id: "cross_functional_direction",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bdirected .*cross[- ]functional\b/i,
      /\bled .*cross[- ]functional\b/i,
      /\bmanaged .*cross[- ]functional\b/i,
      /\boversaw .*cross[- ]functional\b/i,
    ],

    impliedLevel: 5,

    category: "organizational_leadership",

    action: "verify",

    message:
      "Cross-functional direction may represent responsibility above normal junior-rank expectations. Verify organizational scope and authority.",

    questions: [
      "Which organizations or specialties were involved?",
      "Why were you selected to lead them?",
      "Did you have formal authority or were you coordinating technical work?",
      "How many personnel were involved?",
      "What mission result came from the effort?",
    ],
  },


  /* --------------------------------------------------------------
     AUTHORSHIP / POLICY / PROCEDURE
     -------------------------------------------------------------- */

  {
    id: "authored_technical_product",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bauthored\b/i,
      /\bwrote new .*procedure\b/i,
      /\bdeveloped new .*procedure\b/i,
      /\bdeveloped new .*technique\b/i,
      /\bcreated new .*inspection\b/i,
    ],

    impliedLevel: 3,

    category: "innovation",

    action: "verify",

    message:
      "Authorship can be legitimate at any rank, but the statement should verify what was created, whether it was approved or adopted, and what changed because of it.",

    questions: [
      "Did you personally create the technique, procedure, or product?",
      "Who approved it?",
      "Was it formally adopted?",
      "At what organizational level was it used?",
      "What problem did it solve?",
      "What measurable result followed?",
    ],
  },


  {
    id: "policy_authority",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bestablished .*policy\b/i,
      /\bset .*policy\b/i,
      /\bapproved .*policy\b/i,
      /\bdirected .*policy\b/i,
      /\benterprise policy\b/i,
      /\bwing policy\b/i,
    ],

    impliedLevel: 6,

    category: "policy",

    action: "verify",

    message:
      "Policy authority implies significant organizational responsibility. Verify whether the member authored, recommended, coordinated, or actually approved the policy.",

    questions: [
      "Did you author the policy or approve it?",
      "Who had final approval authority?",
      "At what organizational level did it apply?",
      "How many personnel or organizations were affected?",
    ],
  },


  /* --------------------------------------------------------------
     COMMAND / SENIOR AUTHORITY
     -------------------------------------------------------------- */

  {
    id: "command_authority",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bcommanded\b/i,
      /\bcommand authority\b/i,
      /\bcommand decision\b/i,
    ],

    impliedLevel: 7,

    category: "command",

    action: "verify",

    message:
      "Command terminology implies formal command authority and should be verified carefully for enlisted Performance Statements.",

    questions: [
      "What formal position gave you command authority?",
      "Were you acting under delegated authority?",
      "Would 'led,' 'directed,' 'managed,' or 'coordinated' more accurately describe the role?",
    ],
  },


  /* --------------------------------------------------------------
     SENIOR LEADER ADVISORY CLAIMS
     -------------------------------------------------------------- */

  {
    id: "senior_leader_advisor",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\badvised .*commander\b/i,
      /\badvisor to .*commander\b/i,
      /\bsenior enlisted advisor\b/i,
      /\badvised .*wing leadership\b/i,
      /\badvised .*group leadership\b/i,
    ],

    impliedLevel: 6,

    category: "advisory",

    action: "verify",

    message:
      "Senior-leader advisory claims should identify the actual advisory relationship and subject matter.",

    questions: [
      "Which commander or senior leader did you advise?",
      "Was this part of your assigned duties?",
      "What issue did you advise them on?",
      "What decision or outcome resulted?",
    ],
  },


  /* --------------------------------------------------------------
     RESOURCE AUTHORITY
     -------------------------------------------------------------- */

  {
    id: "major_resource_authority",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bcontrolled \$[\d,.]+[mkb]?\b/i,
      /\bmanaged \$[\d,.]+[mkb]?\b/i,
      /\bdirected \$[\d,.]+[mkb]?\b/i,
      /\bmanaged .*budget\b/i,
      /\bcontrolled .*budget\b/i,
    ],

    impliedLevel: 4,

    category: "resources",

    action: "verify",

    message:
      "Large resource claims should distinguish between owning decision authority and simply handling or tracking resources.",

    questions: [
      "Were you the accountable manager for these funds/resources?",
      "Did you have spending or allocation authority?",
      "Were you managing, tracking, maintaining, or merely processing them?",
      "What decisions did you personally make?",
    ],
  },


  /* --------------------------------------------------------------
     ORGANIZATIONAL SCOPE
     -------------------------------------------------------------- */

  {
    id: "wing_scope",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bwing[- ]wide\b/i,
      /\bacross the wing\b/i,
      /\bwing level\b/i,
      /\bwing-level\b/i,
    ],

    impliedLevel: 5,

    category: "scope",

    action: "verify",

    message:
      "Wing-level impact may be legitimate at any rank, but direct authority over wing-level activity should be distinguished from impact reaching the wing.",

    questions: [
      "Was the member directing wing-level activity or did their work simply affect the wing?",
      "How many units or personnel were affected?",
      "Who implemented or approved the action?",
    ],
  },


  {
    id: "majcom_scope",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bmajcom\b/i,
      /\bmajor command\b/i,
      /\bcommand-wide\b/i,
    ],

    impliedLevel: 6,

    category: "scope",

    action: "verify",

    message:
      "MAJCOM-level impact should be tied to a clear causal bridge and verified scope.",

    questions: [
      "How did this accomplishment reach the MAJCOM level?",
      "Was it adopted, recognized, implemented, or simply reported at that level?",
      "Which organizations were affected?",
    ],
  },


  {
    id: "daf_enterprise_scope",
    sourceType: SOURCE_TYPE.HEURISTIC,

    patterns: [
      /\bdepartment of the air force\b/i,
      /\bair force[- ]wide\b/i,
      /\benterprise[- ]wide\b/i,
      /\bservice[- ]wide\b/i,
    ],

    impliedLevel: 7,

    category: "scope",

    action: "verify",

    message:
      "DAF or enterprise-level claims require strong evidence connecting the member's action to the stated effect.",

    questions: [
      "What official action connected this accomplishment to DAF-wide impact?",
      "Was the product adopted or implemented enterprise-wide?",
      "Which authority approved or distributed it?",
    ],
  },
]);


/* ================================================================
   RANK NORMALIZATION
   ================================================================ */

function normalizeString(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}


export function normalizeRank(rankInput) {
  if (!rankInput) return null;

  const raw = normalizeString(rankInput);

  if (UI_RANK_GROUPS[raw]) {
    const group = UI_RANK_GROUPS[raw];

    return {
      input: raw,
      type: "ui-group",
      precision: group.precision,
      exactRank: group.exactRank,
      tier: group.tier,
      responsibilityLevel: group.responsibilityLevel,
      possibleRanks: group.possibleRanks || null,
    };
  }

  const lower = raw.toLowerCase();

  const aliasKey = Object.keys(RANK_ALIASES).find(
    (key) => key.toLowerCase() === lower
  );

  if (!aliasKey) return null;

  const internalRank = RANK_ALIASES[aliasKey];
  const rank = RANKS[internalRank];

  if (!rank) return null;

  return {
    input: raw,
    type: "exact-rank",
    precision: "exact",
    exactRank: internalRank,
    tier: rank.tier,
    responsibilityLevel: rank.responsibilityLevel,
    possibleRanks: [internalRank],
    rank,
  };
}


export function getRankProfile(rankInput) {
  const normalized = normalizeRank(rankInput);

  if (!normalized) return null;

  const exactProfile =
    normalized.exactRank
      ? RANK_WRITING_PROFILES[normalized.exactRank]
      : null;

  return {
    ...normalized,
    tierProfile: TIER_PROFILES[normalized.tier],
    writingProfile: exactProfile,
  };
}


export function getTierForRank(rankInput) {
  return normalizeRank(rankInput)?.tier ?? null;
}


/* ================================================================
   TEXT HELPERS
   ================================================================ */

function patternMatches(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}


function unique(items = []) {
  return [...new Set(items)];
}


function highestStatus(statuses = []) {
  const weight = {
    [RANK_STATUS.OK]: 0,
    [RANK_STATUS.ABOVE_TIER_VERIFIED]: 1,
    [RANK_STATUS.VERIFY]: 2,
    [RANK_STATUS.UNKNOWN_RANK]: 3,
    [RANK_STATUS.RESTRICTED]: 4,
  };

  return [...statuses].sort(
    (a, b) => (weight[b] ?? 0) - (weight[a] ?? 0)
  )[0] || RANK_STATUS.OK;
}


/* ================================================================
   VERIFIED CONTEXT HELPERS
   ================================================================ */

/**
 * context example:
 *
 * {
 *   exactRank: "SSgt",
 *
 *   verifiedDutyTitles: [
 *     "flight_chief"
 *   ],
 *
 *   verifiedClaims: [
 *     "cross_functional_direction"
 *   ],
 *
 *   facts: {
 *     temporaryFlightChief: true,
 *     appointmentConfirmed: true
 *   }
 * }
 */

function claimIsVerified(id, context = {}) {
  return Array.isArray(context.verifiedClaims)
    && context.verifiedClaims.includes(id);
}


function dutyTitleIsVerified(id, context = {}) {
  return Array.isArray(context.verifiedDutyTitles)
    && context.verifiedDutyTitles.includes(id);
}


/* ================================================================
   DUTY TITLE VALIDATION
   ================================================================ */

export function analyzeDutyTitles(
  text,
  rankInput,
  context = {}
) {
  const statement = normalizeString(text);
  const rank = normalizeRank(context.exactRank || rankInput);

  if (!rank) {
    return {
      status: RANK_STATUS.UNKNOWN_RANK,
      findings: [],
    };
  }

  const findings = [];

  for (const rule of Object.values(DUTY_TITLE_RULES)) {
    if (!patternMatches(statement, rule.patterns)) continue;

    const verified = dutyTitleIsVerified(rule.id, context);

    let status = RANK_STATUS.OK;
    let severity = SEVERITY.INFO;
    let reason = rule.doctrinalContext || "";

    /* ------------------------------------------------------------
       HARD TIER RESTRICTION
       ------------------------------------------------------------ */

    if (rule.restrictionType === "hard") {
      if (!rule.allowedTiers.includes(rank.tier)) {
        status = RANK_STATUS.RESTRICTED;
        severity = SEVERITY.CRITICAL;

        reason =
          `${rule.label} is restricted by current Air Force force-structure ` +
          `guidance to ${rule.allowedTiers.join(", ")} personnel.`;
      }
    }


    /* ------------------------------------------------------------
       HARD RANK RESTRICTION
       ------------------------------------------------------------ */

    if (rule.restrictionType === "hard-rank") {
      const exactRank = rank.exactRank;

      if (!exactRank) {
        status = RANK_STATUS.VERIFY;
        severity = SEVERITY.HIGH;

        reason =
          `${rule.label} has a rank-specific doctrinal usage. Exact rank must be verified.`;
      } else if (!rule.allowedRanks.includes(exactRank)) {
        status = RANK_STATUS.RESTRICTED;
        severity = SEVERITY.CRITICAL;
      }
    }


    /* ------------------------------------------------------------
       TIER RESTRICTION
       ------------------------------------------------------------ */

    if (rule.restrictionType === "tier") {
      if (!rule.allowedTiers.includes(rank.tier)) {
        status = RANK_STATUS.RESTRICTED;
        severity = SEVERITY.HIGH;
      }
    }


    /* ------------------------------------------------------------
       SUPERVISOR SPECIAL CASE
       ------------------------------------------------------------ */

    if (rule.id === "supervisor") {
      if (rank.tier === TIER.JUNIOR_ENLISTED) {

        if (!rank.exactRank) {
          status = RANK_STATUS.VERIFY;
          severity = SEVERITY.HIGH;

          reason =
            "Junior Enlisted Supervisor usage requires knowing the exact rank; " +
            "the member must be at least a SrA and actually supervise others.";
        }

        else if (
          RANKS[rank.exactRank].responsibilityLevel <
          RANKS.SRA.responsibilityLevel
        ) {
          status = RANK_STATUS.RESTRICTED;
          severity = SEVERITY.CRITICAL;
        }

        else if (!verified) {
          status = RANK_STATUS.VERIFY;
          severity = SEVERITY.MEDIUM;

          reason =
            "SrA may serve as Supervisor when the conditions for the duty title are met; verify actual supervisory responsibility.";
        }
      }
    }


    /* ------------------------------------------------------------
       NCOIC
       ------------------------------------------------------------ */

    if (rule.id === "ncoic") {
      if (rank.tier === TIER.JUNIOR_ENLISTED) {
        status = RANK_STATUS.RESTRICTED;
        severity = SEVERITY.HIGH;
      }

      else if (
        rank.tier === TIER.SNCO &&
        !verified
      ) {
        status = RANK_STATUS.VERIFY;
        severity = SEVERITY.LOW;

        reason =
          "NCOIC is normally described for NCO responsibilities in the force structure; verify local organizational usage.";
      }
    }


    /* ------------------------------------------------------------
       FLIGHT / SECTION CHIEF
       ------------------------------------------------------------ */

    if (
      rule.restrictionType === "verify-if-nco"
      && rank.tier === TIER.NCO
    ) {
      if (verified) {
        status = RANK_STATUS.ABOVE_TIER_VERIFIED;
        severity = SEVERITY.INFO;

        reason =
          `${rule.label} is normally an SNCO role but may occasionally be held by an NCO; the role has been verified.`;
      } else {
        status = RANK_STATUS.VERIFY;
        severity = SEVERITY.HIGH;

        reason =
          `${rule.label} is normally an SNCO role and only occasionally an NCO role. Verify appointment and scope.`;
      }
    }

    if (
      rule.restrictionType === "verify-if-nco"
      && rank.tier === TIER.JUNIOR_ENLISTED
    ) {
      status = RANK_STATUS.RESTRICTED;
      severity = SEVERITY.CRITICAL;
    }


    findings.push({
      type: "duty-title",
      id: rule.id,
      label: rule.label,
      status,
      severity,
      sourceType: rule.sourceType,
      reason,
      verified,
      questions:
        status === RANK_STATUS.OK
          ? []
          : rule.coachingQuestions || [],
    });
  }

  return {
    status: highestStatus(findings.map((item) => item.status)),
    findings,
  };
}


/* ================================================================
   RESPONSIBILITY CLAIM ANALYSIS
   ================================================================ */

export function analyzeResponsibilityClaims(
  text,
  rankInput,
  context = {}
) {
  const statement = normalizeString(text);
  const rank = normalizeRank(context.exactRank || rankInput);

  if (!rank) {
    return {
      status: RANK_STATUS.UNKNOWN_RANK,
      findings: [],
    };
  }

  const findings = [];

  for (const claim of RESPONSIBILITY_CLAIMS) {
    if (!patternMatches(statement, claim.patterns)) continue;

    const verified = claimIsVerified(claim.id, context);

    const delta =
      claim.impliedLevel - rank.responsibilityLevel;

    let status = RANK_STATUS.OK;
    let severity = SEVERITY.INFO;

    /*
     * "Led" and authorship should often be investigated regardless
     * of rank because the underlying story matters.
     */
    const alwaysInvestigate =
      claim.action === "investigate";

    if (verified && delta > 0) {
      status = RANK_STATUS.ABOVE_TIER_VERIFIED;
      severity = SEVERITY.INFO;
    }

    else if (alwaysInvestigate) {
      status = RANK_STATUS.VERIFY;
      severity = SEVERITY.LOW;
    }

    else if (delta >= 3) {
      status = RANK_STATUS.VERIFY;
      severity = SEVERITY.HIGH;
    }

    else if (delta >= 2) {
      status = RANK_STATUS.VERIFY;
      severity = SEVERITY.MEDIUM;
    }

    else if (delta >= 1) {
      status = RANK_STATUS.VERIFY;
      severity = SEVERITY.LOW;
    }

    else if (
      claim.action === "verify"
      && !verified
    ) {
      /*
       * Even if the rank level itself is reasonable, certain claims
       * benefit from verification because wording can overstate
       * authority.
       */
      status = RANK_STATUS.VERIFY;
      severity = SEVERITY.LOW;
    }

    findings.push({
      type: "responsibility-claim",
      id: claim.id,
      category: claim.category,
      status,
      severity,
      sourceType: claim.sourceType,

      impliedResponsibilityLevel:
        claim.impliedLevel,

      ratedResponsibilityLevel:
        rank.responsibilityLevel,

      responsibilityDelta: delta,

      verified,

      message: claim.message,

      questions:
        status === RANK_STATUS.OK
          ? []
          : claim.questions || [],
    });
  }

  return {
    status: highestStatus(findings.map((item) => item.status)),
    findings,
  };
}


/* ================================================================
   RESPONSIBILITY DELTA
   ================================================================ */

/**
 * Returns a simple internal description of demonstrated responsibility.
 *
 * This should NOT appear to the user as an Air Force rating.
 */

export function classifyResponsibilityDelta(
  impliedLevel,
  ratedRank
) {
  const rank = normalizeRank(ratedRank);

  if (!rank) return null;

  const delta =
    Number(impliedLevel) -
    Number(rank.responsibilityLevel);

  if (delta <= -2) {
    return {
      delta,
      classification: "below_typical_scope",
    };
  }

  if (delta === -1 || delta === 0) {
    return {
      delta,
      classification: "within_expected_scope",
    };
  }

  if (delta === 1) {
    return {
      delta,
      classification: "slightly_elevated_scope",
    };
  }

  if (delta === 2) {
    return {
      delta,
      classification: "elevated_scope",
    };
  }

  return {
    delta,
    classification: "significantly_elevated_scope",
  };
}


/* ================================================================
   MAIN VALIDATOR
   ================================================================ */

/**
 * Main public entry point.
 *
 * Example:
 *
 * validateRankTier({
 *   text:
 *     "Directed cross-functional inspection team and served as Flight Chief",
 *   ratedRank: "SSgt",
 *   context: {
 *     verifiedDutyTitles: ["flight_chief"]
 *   }
 * });
 */

export function validateRankTier({
  text = "",
  accomplishment = "",
  statement = "",
  ratedRank = "",
  context = {},
} = {}) {

  const sourceText =
    normalizeString(
      text ||
      accomplishment ||
      statement
    );

  const rank =
    normalizeRank(context.exactRank || ratedRank);

  if (!rank) {
    return {
      valid: false,
      status: RANK_STATUS.UNKNOWN_RANK,
      rank: null,
      findings: [],
      questions: [],
      summary:
        "Rated rank could not be resolved.",
    };
  }

  const dutyTitles =
    analyzeDutyTitles(
      sourceText,
      ratedRank,
      context
    );

  const responsibility =
    analyzeResponsibilityClaims(
      sourceText,
      ratedRank,
      context
    );

  const findings = [
    ...dutyTitles.findings,
    ...responsibility.findings,
  ];

  const overallStatus =
    highestStatus(
      findings.map((item) => item.status)
    );

  const questions =
    unique(
      findings.flatMap(
        (item) => item.questions || []
      )
    );

  const restricted =
    findings.filter(
      (item) =>
        item.status === RANK_STATUS.RESTRICTED
    );

  const verify =
    findings.filter(
      (item) =>
        item.status === RANK_STATUS.VERIFY
    );

  const aboveTier =
    findings.filter(
      (item) =>
        item.status ===
        RANK_STATUS.ABOVE_TIER_VERIFIED
    );


  return {
    valid:
      overallStatus !== RANK_STATUS.RESTRICTED
      && overallStatus !== RANK_STATUS.UNKNOWN_RANK,

    status: overallStatus,

    ratedRank,

    normalizedRank: rank,

    tier: rank.tier,

    tierProfile:
      TIER_PROFILES[rank.tier],

    writingProfile:
      rank.exactRank
        ? RANK_WRITING_PROFILES[rank.exactRank]
        : null,

    findings,

    restricted,

    verify,

    aboveTier,

    questions,

    summary: buildValidationSummary({
      rank,
      restricted,
      verify,
      aboveTier,
    }),
  };
}


/* ================================================================
   VALIDATION SUMMARY
   ================================================================ */

function buildValidationSummary({
  rank,
  restricted,
  verify,
  aboveTier,
}) {

  if (restricted.length) {
    return (
      "One or more responsibility or duty-title claims conflict " +
      "with current force-structure guidance and require correction."
    );
  }

  if (verify.length) {
    return (
      "The accomplishment contains responsibility claims that may be valid " +
      "but require additional context before they should be used in the final statement."
    );
  }

  if (aboveTier.length) {
    return (
      "The accomplishment contains verified responsibility above typical " +
      "expectations for the rated rank. Preserve this distinction when writing the statement."
    );
  }

  if (rank.precision === "grouped") {
    return (
      "The accomplishment is generally consistent with the selected rank tier. " +
      "Exact-rank validation may provide additional precision."
    );
  }

  return (
    "No rank-responsibility conflicts were detected."
  );
}


/* ================================================================
   COACHING QUESTION BUILDER
   ================================================================ */

export function getRankCoachingQuestions({
  text,
  ratedRank,
  context = {},
} = {}) {

  const validation =
    validateRankTier({
      text,
      ratedRank,
      context,
    });

  return validation.questions;
}


/* ================================================================
   GENERATION CONTEXT
   ================================================================ */

/**
 * Returns safe context for opb-universal.js / Amy.
 *
 * This is intentionally guidance rather than a giant prompt.
 */

export function buildRankPromptContext(
  rankInput,
  validation = null
) {
  const profile =
    getRankProfile(rankInput);

  if (!profile) {
    return {
      available: false,
    };
  }

  const context = {
    available: true,

    ratedRank:
      profile.rank?.code ||
      profile.input,

    tier:
      profile.tier,

    tierName:
      profile.tierProfile.displayName,

    writingFocus:
      profile.writingProfile?.emphasis ||
      profile.tierProfile.writingFocus,

    normalScope:
      profile.tierProfile.normalScope,

    elevatedScope:
      profile.tierProfile.elevatedScope,

    doctrine:
      [
        "Facts remain controlling.",
        "Do not invent responsibility based on rank.",
        "Do not weaken verified high-level impact because the member is junior.",
        "Unusual authority must be verified before being asserted.",
        "A verified above-tier responsibility may strengthen the statement.",
      ],
  };

  if (validation) {
    context.validation = {
      status: validation.status,

      verify:
        validation.verify?.map(
          (item) => item.id
        ) || [],

      restricted:
        validation.restricted?.map(
          (item) => item.id
        ) || [],

      aboveTier:
        validation.aboveTier?.map(
          (item) => item.id
        ) || [],

      questions:
        validation.questions || [],
    };
  }

  return context;
}


/* ================================================================
   SAFE GENERATION DECISION
   ================================================================ */

/**
 * Allows the generation engine to determine whether it should:
 *
 *   GENERATE
 *   COACH_FIRST
 *   BLOCK_CLAIM
 *
 * This does NOT necessarily block the whole accomplishment.
 *
 * Example:
 *
 * SSgt:
 *   "Served as Superintendent..."
 *
 * The incorrect title should be blocked/clarified.
 *
 * The underlying work may still be valid.
 */

export function getRankGenerationDecision(
  validation
) {
  if (!validation) {
    return {
      action: "GENERATE",
      reason: null,
    };
  }

  if (
    validation.status ===
    RANK_STATUS.RESTRICTED
  ) {
    return {
      action: "BLOCK_CLAIM",
      reason:
        "A responsibility or duty-title claim conflicts with current force-structure guidance.",
      questions:
        validation.questions || [],
    };
  }

  if (
    validation.status ===
    RANK_STATUS.VERIFY
  ) {
    return {
      action: "COACH_FIRST",
      reason:
        "The accomplishment may contain elevated or ambiguous responsibility that should be verified before final generation.",
      questions:
        validation.questions || [],
    };
  }

  return {
    action: "GENERATE",
    reason: null,
  };
}


/* ================================================================
   OPTIONAL DEVELOPMENT / DEBUG VIEW
   ================================================================ */

export function debugRankTier({
  text,
  ratedRank,
  context = {},
} = {}) {

  const validation =
    validateRankTier({
      text,
      ratedRank,
      context,
    });

  return {
    input: {
      text,
      ratedRank,
    },

    result: validation,

    generationDecision:
      getRankGenerationDecision(validation),

    generationContext:
      buildRankPromptContext(
        ratedRank,
        validation
      ),
  };
}


/* ================================================================
   DEFAULT EXPORT
   ================================================================ */

export default {
  version: RANK_TIER_VERSION,
  source: RANK_TIER_SOURCE,

  TIER,
  RANK_STATUS,
  SEVERITY,
  SOURCE_TYPE,

  RANKS,
  UI_RANK_GROUPS,
  TIER_PROFILES,
  RANK_WRITING_PROFILES,
  DUTY_TITLE_RULES,
  RESPONSIBILITY_CLAIMS,

  normalizeRank,
  getRankProfile,
  getTierForRank,

  analyzeDutyTitles,
  analyzeResponsibilityClaims,

  classifyResponsibilityDelta,

  validateRankTier,

  getRankCoachingQuestions,
  buildRankPromptContext,
  getRankGenerationDecision,

  debugRankTier,
};
