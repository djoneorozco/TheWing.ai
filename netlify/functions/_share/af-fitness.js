// netlify/functions/_share/af-fitness.js
// ============================================================
// TheWing.ai • Ask Amy Air Force Fitness Guidance Engine
// af-fitness-2026.1 • ES MODULE
//
// FILE
// - netlify/functions/_share/af-fitness.js
//
// PURPOSE
// - Shared deterministic AFMAN 36-2905 (24 March 2026) education layer
// - Gives Ask Amy precise PFRA / fitness policy guidance without scoring
// - Does NOT replace myFitness, UFPM, MTF, commander, or legal advice
//
// DESIGN
// - NO Netlify handler
// - NO OpenAI / Supabase / fetch / DOM / localStorage
// - NO PDF parsing and NO external packages
// - NO duplicated full PFRA scoring tables (use pt-scoring-core / calculator)
// - Plain JS, Object.freeze constants, stripEmpty outputs, BLUF phrasing
//
// PRIMARY USE
// import {
//   buildAfFitnessTruthPacket,
//   getAfFitnessGuidance,
//   analyzeAfFitnessQuestion,
//   summarizePtScoreSnapshot,
//   detectAfFitnessIntent
// } from "./_share/af-fitness.js";
// ============================================================

// ============================================================
// //#1) VERSION + REFERENCE
// ============================================================

export const AF_FITNESS_VERSION = "af-fitness-2026.1";

export const AF_FITNESS_REFERENCE = Object.freeze({
  document: "AFMAN 36-2905",
  title: "Department of the Air Force Physical Fitness Program",
  date: "24 March 2026",
  path: "/public/doc/dafman36-2905.pdf",
  short: "AFMAN 36-2905 (24 March 2026)"
});

const REF = AF_FITNESS_REFERENCE;

function cite(section, title) {
  return Object.freeze({
    document: REF.document,
    date: REF.date,
    section,
    title: title || section
  });
}

// ============================================================
// //#2) RULES (policy facts only — no full scoring charts)
// ============================================================

export const AF_FITNESS_RULES = Object.freeze({
  version: AF_FITNESS_VERSION,
  reference: REF,

  applicability: Object.freeze({
    applies_to: Object.freeze(["RegAF", "AFR", "ANG"]),
    does_not_apply_to: Object.freeze(["USSF"]),
    ussf_manual: "SPFMAN 36-2905",
    note:
      "AFMAN 36-2905 applies to Regular Air Force, Air Force Reserve, and Air National Guard. It does not apply to United States Space Force members, who follow SPFMAN 36-2905."
  }),

  components: Object.freeze({
    body_composition: Object.freeze({
      max_points: 20,
      minimum: null,
      method: "WHtR",
      age_agnostic: true,
      section: "3.1, 3.7.1, 3.15.4.2"
    }),
    strength: Object.freeze({
      max_points: 15,
      age_sex_based: true,
      section: "3.1, 3.7.1"
    }),
    core: Object.freeze({
      max_points: 15,
      age_sex_based: true,
      section: "3.1, 3.7.1"
    }),
    cardio: Object.freeze({
      max_points: 50,
      age_sex_based: true,
      section: "3.1, 3.7.1"
    }),
    composite_max: 100,
    ready_composite_minimum: 75,
    must_meet_physical_component_minimums: true
  }),

  categories: Object.freeze({
    excellent: Object.freeze({
      label: "Excellent",
      rule: "composite > 90",
      exclusive_lower_bound: 90,
      section: "3.6.1"
    }),
    satisfactory: Object.freeze({
      label: "Satisfactory",
      rule: "composite 75–89.9",
      min: 75,
      max: 89.9,
      section: "3.6.1"
    }),
    unsatisfactory: Object.freeze({
      label: "Unsatisfactory",
      rule: "composite < 74.9 and/or any physical component minimum not met",
      max: 74.9,
      section: "3.6.1"
    }),
    exactNinetyRequiresOfficialVerification: true
  }),

  assessment_frequency: Object.freeze({
    regaf_excellent_or_satisfactory_months: 6,
    arc_months: 12,
    unsatisfactory_months: 3,
    total_force_unsatisfactory: true,
    pfra_hold_trigger: "after exemption expiration + Reconditioning Period",
    pfra_hold_section: "3.10.9",
    unit_assessments: "Installation Commander discretion",
    sections: "Table 3.3, 3.4, 3.10"
  }),

  walk: Object.freeze({
    medical_only: true,
    authorization_form: "AF Form 469",
    scoring: "pass_fail",
    cardio_points: false,
    cannot_apply_to_excellent: true,
    pass_composite_treatment: "like_cardio_exempt",
    pfra_hold_solely_for_walk: false,
    sections: "3.7.3, 3.15.12.1, Table 3.1"
  }),

  whtr: Object.freeze({
    truncation: "truncated_not_rounded",
    high_risk_threshold: 0.55,
    high_risk_plus_unsatisfactory_triggers_bfa: true,
    bfa_tier: "Tier 2 BFA",
    bfa_methods: Object.freeze(["InBody 770", "2-3 site tape Attachment 8"]),
    bfa_standards: Object.freeze({
      male_max_pct: 26,
      female_max_pct: 36,
      table: "Table 3.2"
    }),
    bfa_pass_body_treatment: "exempt_component",
    bfa_fail_result: "unsatisfactory_pfra",
    sections: "3.15.4.2, 3.7.2, Table 3.2, Attachment 8"
  }),

  fsq: Object.freeze({
    form: "DAF Form 4446A",
    required_before_pfra: true,
    medical_eval_if_concern_without_current_469: true,
    section: "3.3"
  }),

  diagnostic_pfra: Object.freeze({
    attribution: "non-attribution",
    max_per_365_days_regaf: 2,
    max_per_365_days_arc: 1,
    net_months_prior_to_scheduled: 1,
    whtr_decoupled_for_dpfra: false,
    section: "3.8"
  }),

  medical: Object.freeze({
    form: "AF Form 469",
    pfra_hold_for_component_or_composite_exemption: true,
    afp_enrollment: true,
    whtr_required_even_with_exemptions: true,
    chapter: "Chapter 4"
  }),

  illness_injury: Object.freeze({
    notify_administrator: true,
    form: "AF Form 4446",
    commander_may_invalidate_after_mtf_eval: true,
    do_not_diagnose: true,
    section: "3.12"
  }),

  physical_conditioning_program: Object.freeze({
    every_duty_day_minutes_min: 20,
    every_duty_day_minutes_max: 60,
    member_responsibility_days: 365,
    sections: "1.2, 1.1.2"
  }),

  adaptive_fitness_program: Object.freeze({
    enroll_with: "medical exemption + modified exercise plan",
    regaf_duty_days: 10,
    arc_calendar_days: 60,
    form: "AF Form 108",
    section: "5.5"
  }),

  fitness_reconditioning_program: Object.freeze({
    triggers: Object.freeze([
      "Unsatisfactory PFRA",
      "WHtR > 0.55 failing BFA"
    ]),
    regaf_duty_days: 10,
    arc_calendar_days: 60,
    section: "5.6"
  }),

  altitude: Object.freeze({
    threshold_ft: 5250,
    guidance_only: true,
    no_calculator: true,
    sections: "3.15.12.3, Attachment 3"
  }),

  appeals: Object.freeze({
    window: "within one month",
    channel: "myFitness to UFPM",
    elevation: Object.freeze(["wing commander", "FAAB at AFPC"]),
    not_legal_advice: true,
    sections: "8.2–8.3, Table 8.1"
  }),

  administrative_correction: Object.freeze({
    allowed_only: Object.freeze([
      "reps mismatch",
      "profile dates / exemption updates",
      "double entry deletion",
      "assessment while pregnant"
    ]),
    section: "8.4"
  }),

  myfitness: Object.freeze({
    role: "official scores",
    section: "3.7.5"
  }),

  forms: Object.freeze({
    scorecard: "AF Form 4446",
    fsq: "DAF Form 4446A",
    profile: "AF Form 469",
    afp: "AF Form 108"
  })
});

// ============================================================
// //#3) GUIDANCE TOPICS (22)
// ============================================================

export const AF_FITNESS_GUIDANCE_TOPICS = Object.freeze({
  overview: {
    title: "Air Force Fitness Program Overview",
    bluf:
      "BLUF: AFMAN 36-2905 (24 March 2026) governs RegAF, AFR, and ANG Physical Fitness Readiness Assessments (PFRA). USSF members follow SPFMAN 36-2905, not this manual.",
    key_points: [
      "Applicability covers Regular Air Force, Air Force Reserve, and Air National Guard only (AFMAN 36-2905 applicability).",
      "Space Force members are covered by SPFMAN 36-2905; do not apply AFMAN 36-2905 scoring or timelines to USSF questions.",
      "Ready status requires meeting physical component minimums and a composite score of at least 75 (3.1, 3.7.1).",
      "Categories are Excellent (composite > 90), Satisfactory (75–89.9), or Unsatisfactory (<74.9 and/or any component minimum not met) (3.6.1).",
      "Official scores live in myFitness; unofficial calculators are educational only (3.7.5)."
    ],
    cautions: [
      "This module is educational guidance, not a medical, command, or legal determination.",
      "A composite of exactly 90.0 is a boundary case — do not auto-label it Excellent; confirm in myFitness (3.6.1).",
      "Do not diagnose illness/injury or override AF Form 469 / MTF decisions."
    ],
    next_steps: [
      "Confirm branch (RegAF / AFR / ANG vs USSF) before applying rules.",
      "Pull the official scorecard in myFitness when interpreting results.",
      "Ask about exemptions, walk authorization, or upcoming assessment timing if relevant."
    ],
    references: [
      cite("Applicability; 3.1; 3.6.1; 3.7.1; 3.7.5", "Program applicability, components, categories, myFitness")
    ]
  },

  components: {
    title: "PFRA Components",
    bluf:
      "BLUF: The PFRA has four scored parts — Body Composition (20), Strength (15), Core (15), and Cardio (50). Body composition is age-agnostic WHtR; physical components are age- and sex-based (3.1, 3.7.1).",
    key_points: [
      "Body Composition is capped at 20 points with no component point minimum; it uses waist-to-height ratio (WHtR) (3.1, 3.7.1).",
      "Strength and Core are each capped at 15 points and use age/sex standards (3.1, 3.7.1).",
      "Cardio is capped at 50 points and uses age/sex standards (3.1, 3.7.1).",
      "Members must meet physical component minimums and achieve a composite ≥ 75 to remain Ready (3.1, 3.7.1).",
      "Body composition failure pathways (WHtR / BFA) are separate from Strength/Core/Cardio minimums (3.7.2, 3.15.4.2)."
    ],
    cautions: [
      "Do not invent legacy component weights (for example old 1.5-mile-only frameworks).",
      "Point caps are policy facts; exact rep/time charts live in official scoring charts, not this guidance module.",
      "Walk modality does not award cardio points (3.7.3)."
    ],
    next_steps: [
      "Identify which component is weakest relative to its cap.",
      "Confirm sex and age band for Strength, Core, and Cardio standards.",
      "Review WHtR truncation rules before discussing body composition."
    ],
    references: [
      cite("3.1, 3.7.1", "PFRA components and Ready criteria"),
      cite("3.7.2, 3.15.4.2", "Body composition / BFA pathways")
    ]
  },

  scoring: {
    title: "PFRA Scoring & Categories",
    bluf:
      "BLUF: Composite ≥ 75 with all physical component minimums met is Ready/Satisfactory territory; Excellent requires composite greater than 90. Exactly 90.0 needs official myFitness verification (3.6.1, 3.7.1).",
    key_points: [
      "Excellent: composite > 90 (3.6.1).",
      "Satisfactory: composite 75–89.9 when physical component minimums are met (3.6.1).",
      "Unsatisfactory: composite < 74.9 and/or any physical component minimum not met (3.6.1).",
      "A score of exactly 90.0 must not be auto-classified as Excellent without official confirmation (exactNinetyRequiresOfficialVerification).",
      "Unofficial planning scores are educational; myFitness is authoritative (3.7.5).",
      "This module does not recalculate charts — it interprets supplied snapshot pass/fail flags and scores."
    ],
    cautions: [
      "Do not treat 90.0 as Excellent by default.",
      "Meeting composite ≥ 75 without component minimums is still Unsatisfactory (3.6.1, 3.7.1).",
      "Walk passers cannot use walk results to claim Excellent (3.7.3)."
    ],
    next_steps: [
      "Compare each component score to its cap (20 / 15 / 15 / 50).",
      "Confirm pass booleans for Strength, Core, Cardio, and body pathway.",
      "Verify the final category in myFitness before career or admin actions."
    ],
    references: [
      cite("3.6.1", "Fitness categories"),
      cite("3.7.1, 3.7.5", "Ready criteria and official scores")
    ]
  },

  body_composition: {
    title: "Body Composition (WHtR)",
    bluf:
      "BLUF: Body composition uses age-agnostic WHtR truncated (not rounded) for up to 20 points. High-risk WHtR > 0.55 combined with Unsatisfactory triggers Tier 2 BFA (3.15.4.2, Table 3.2).",
    key_points: [
      "WHtR is truncated, not rounded, when applied under 3.15.4.2.",
      "Body composition has a 20-point cap and no separate component point minimum (3.1, 3.7.1).",
      "WHtR > 0.55 is high risk; with an Unsatisfactory outcome it leads to Tier 2 Body Fat Assessment (3.15.4.2).",
      "Tier 2 BFA uses InBody 770 or 2–3 site tape per Attachment 8 (3.15.4.2).",
      "BFA standards are Male < 26% and Female < 36% (Table 3.2).",
      "BFA pass scores body as an exempt component; BFA fail yields Unsatisfactory PFRA (3.7.2)."
    ],
    cautions: [
      "Do not round WHtR upward or downward — truncate per 3.15.4.2.",
      "Medical exemptions do not remove the WHtR requirement (Chapter 4).",
      "This is not a clinical body-composition diagnosis."
    ],
    next_steps: [
      "Confirm height and waist measurement process with unit fitness staff.",
      "If WHtR > 0.55 and Unsatisfactory, prepare for Tier 2 BFA.",
      "Review Table 3.2 standards before discussing body-fat outcomes."
    ],
    references: [
      cite("3.15.4.2, Table 3.2, Attachment 8", "WHtR truncation and BFA"),
      cite("3.7.2", "BFA pass/fail PFRA treatment"),
      cite("Chapter 4", "Exemptions and continued WHtR requirement")
    ]
  },

  assessment_frequency: {
    title: "Assessment Frequency",
    bluf:
      "BLUF: RegAF Excellent/Satisfactory members reassess every 6 months; ARC (AFR/ANG) every 12 months; Unsatisfactory is every 3 months Total Force (Table 3.3 / 3.4 / 3.10).",
    key_points: [
      "RegAF members with Excellent or Satisfactory results assess every 6 months (Table 3.3 / 3.4 / 3.10).",
      "ARC (AFR/ANG) members assess every 12 months (Table 3.3 / 3.4 / 3.10).",
      "Unsatisfactory results trigger a 3-month reassessment cycle for Total Force (Table 3.3 / 3.4 / 3.10).",
      "PFRA Hold follows exemption expiration plus the Reconditioning Period (3.10.9).",
      "Unit assessments may occur at Installation Commander discretion (Table 3.3 / 3.4 / 3.10)."
    ],
    cautions: [
      "Do not apply RegAF 6-month timing to ARC members.",
      "PFRA Hold timing depends on exemption expiration and reconditioning — confirm locally (3.10.9).",
      "Unofficial calendars are not a substitute for myFitness scheduling."
    ],
    next_steps: [
      "Identify RegAF vs ARC status in the member profile.",
      "Check current category and next due date in myFitness.",
      "If on exemption, ask when the profile expires and whether reconditioning applies."
    ],
    references: [
      cite("Table 3.3, 3.4, 3.10", "Assessment frequency"),
      cite("3.10.9", "PFRA Hold after exemption + reconditioning")
    ]
  },

  diagnostic_pfra: {
    title: "Diagnostic PFRA (DPFRA)",
    bluf:
      "BLUF: Diagnostic PFRAs are non-attribution events — max 2 per 365 days for RegAF and 1 for ARC, NET 1 month before the scheduled assessment. WHtR is not decoupled for DPFRA (3.8).",
    key_points: [
      "DPFRA results are non-attribution (3.8).",
      "RegAF members may take a maximum of 2 diagnostic assessments per 365 days (3.8).",
      "ARC members may take a maximum of 1 diagnostic assessment per 365 days (3.8).",
      "DPFRA must be NET 1 month prior to the scheduled assessment (3.8).",
      "WHtR is not decoupled for DPFRA — body composition still applies (3.8)."
    ],
    cautions: [
      "Diagnostic does not mean optional body composition.",
      "Exceeding the yearly diagnostic limit is a policy issue — confirm with UFPM.",
      "Do not treat DPFRA as an official recorded PFRA category for currency."
    ],
    next_steps: [
      "Count prior DPFRA events in the last 365 days.",
      "Confirm the scheduled official assessment date before booking a diagnostic.",
      "Coordinate with the FAC / UFPM for scheduling."
    ],
    references: [cite("3.8", "Diagnostic PFRA limits and rules")]
  },

  fsq: {
    title: "Fitness Screening Questionnaire (FSQ)",
    bluf:
      "BLUF: Complete DAF Form 4446A before a PFRA. Medical evaluation is required if concerns exist without a current AF Form 469 (3.3).",
    key_points: [
      "The FSQ is DAF Form 4446A (3.3).",
      "FSQ completion is required before the PFRA (3.3).",
      "If the FSQ raises concern and there is no current AF Form 469, medical evaluation is required (3.3).",
      "FSQ answers feed medical and administrative risk screening — answer accurately.",
      "Fitness administrators use the FSQ to decide whether assessment can proceed safely."
    ],
    cautions: [
      "This guidance is not a medical clearance.",
      "Do not skip FSQ steps to 'just take the test.'",
      "False or incomplete FSQ answers can create safety and administrative risk."
    ],
    next_steps: [
      "Complete DAF Form 4446A before assessment day.",
      "If symptoms or concerns appear, seek MTF evaluation and update AF Form 469 as needed.",
      "Bring current profile documentation to the FAC."
    ],
    references: [
      cite("3.3", "FSQ / DAF Form 4446A"),
      cite("Chapter 4", "AF Form 469 medical profiles")
    ]
  },

  medical_exemption: {
    title: "Medical Exemptions & AF Form 469",
    bluf:
      "BLUF: AF Form 469 drives component or composite exemptions and PFRA Hold, with AFP enrollment when required. WHtR remains required even with exemptions (Chapter 4).",
    key_points: [
      "Medical limitations and exemptions are documented on AF Form 469 (Chapter 4).",
      "Component or composite exemptions place the member on PFRA Hold as applicable (Chapter 4).",
      "Members with medical exemption and a modified exercise plan enroll in the Adaptive Fitness Program (5.5; Chapter 4).",
      "WHtR measurement remains required even when other components are exempt (Chapter 4).",
      "Expiring exemptions interact with reconditioning and return-to-assessment timing (3.10.9)."
    ],
    cautions: [
      "Ask Amy does not diagnose or write profiles — MTF / provider authority controls AF Form 469.",
      "Do not assume a component exemption removes body-composition requirements.",
      "Unofficial advice cannot override a current profile."
    ],
    next_steps: [
      "Confirm current AF Form 469 start/end dates in myFitness / medical systems.",
      "Ask whether AFP enrollment and AF Form 108 are complete.",
      "Plan reassessment after exemption expiration and any reconditioning period."
    ],
    references: [
      cite("Chapter 4", "Medical exemptions / AF Form 469"),
      cite("5.5", "Adaptive Fitness Program"),
      cite("3.10.9", "PFRA Hold after exemption expiration")
    ]
  },

  walk: {
    title: "2 km Walk (Medical Cardio Alternative)",
    bluf:
      "BLUF: The walk is medical-only via AF Form 469, scored pass/fail with no cardio points, cannot support an Excellent category, and if passed is treated like a cardio-exempt composite path (3.7.3, 3.15.12.1, Table 3.1).",
    key_points: [
      "Walk authorization is medical-only through AF Form 469 (3.7.3, 3.15.12.1).",
      "Walk is pass/fail and awards no cardio points (3.7.3, Table 3.1).",
      "Walk results cannot be applied toward an Excellent category (3.7.3).",
      "If the walk is passed, composite treatment follows the cardio-exempt approach — this module does not invent a separate adjusted formula (3.7.3).",
      "Members are not placed on PFRA Hold solely for using the walk (3.7.3)."
    ],
    cautions: [
      "Do not invent an unofficial walk-adjusted composite formula.",
      "Unauthorized walk attempts are not valid official cardio alternatives.",
      "Passing the walk does not unlock Excellent classification."
    ],
    next_steps: [
      "Confirm AF Form 469 authorizes the walk modality.",
      "Review Table 3.1 pass standards with FAC staff.",
      "Interpret any unofficial calculator walk results as planning-only."
    ],
    references: [
      cite("3.7.3, 3.15.12.1, Table 3.1", "Walk authorization and scoring treatment")
    ]
  },

  illness_injury: {
    title: "Illness or Injury on Assessment Day",
    bluf:
      "BLUF: Notify the fitness administrator, document with AF Form 4446, and let the commander decide invalidation after MTF evaluation. Do not self-diagnose (3.12).",
    key_points: [
      "Notify the fitness administrator if illness or injury affects assessment (3.12).",
      "Use AF Form 4446 for documentation as required (3.12).",
      "After MTF evaluation, the commander may invalidate the assessment (3.12).",
      "Members and coaches must not diagnose conditions (3.12).",
      "Medical evaluation and AF Form 469 updates may follow depending on findings (Chapter 4)."
    ],
    cautions: [
      "This is not medical advice — seek MTF care for symptoms.",
      "Do not pressure members to test through unsafe conditions.",
      "Invalidation is a commander decision after proper evaluation, not an automatic self-cancel."
    ],
    next_steps: [
      "Stop unsafe testing and notify the administrator immediately.",
      "Seek MTF evaluation and keep documentation.",
      "Follow commander / UFPM guidance on retest or invalidation."
    ],
    references: [
      cite("3.12", "Illness/injury notification and invalidation"),
      cite("Chapter 4", "Medical evaluation / profiles")
    ]
  },

  physical_conditioning: {
    title: "Physical Conditioning Program (PCP)",
    bluf:
      "BLUF: Members are responsible for fitness 365 days a year, with Physical Conditioning Program activity every duty day for 20–60 minutes (1.1.2, 1.2).",
    key_points: [
      "Fitness is a year-round member responsibility (1.1.2).",
      "PCP occurs every duty day for 20–60 minutes (1.2).",
      "Unit programs support readiness but do not replace individual responsibility (1.1.2, 1.2).",
      "Consistent conditioning supports Strength, Core, Cardio, and body-composition outcomes (3.1).",
      "Medical profiles may require modified activity through AFP rather than stopping all training (5.5)."
    ],
    cautions: [
      "Do not prescribe clinical rehab plans — use MTF / AFP guidance when profiled.",
      "Skipping duty-day conditioning increases Unsatisfactory risk.",
      "Altitude, heat, and profile limits can change safe training parameters."
    ],
    next_steps: [
      "Schedule 20–60 minutes of conditioning each duty day.",
      "Align training with upcoming PFRA components.",
      "If limited by AF Form 469, enroll into AFP with a modified plan."
    ],
    references: [
      cite("1.1.2, 1.2", "Member responsibility and PCP duration"),
      cite("5.5", "Adaptive Fitness Program when medically limited")
    ]
  },

  adaptive_fitness: {
    title: "Adaptive Fitness Program (AFP)",
    bluf:
      "BLUF: Enroll in AFP with a medical exemption and modified exercise plan within 10 duty days (ARC: 60 calendar days) using AF Form 108 (5.5).",
    key_points: [
      "AFP pairs medical exemption with a modified exercise plan (5.5).",
      "RegAF enrollment window is within 10 duty days (5.5).",
      "ARC enrollment window is within 60 calendar days (5.5).",
      "AF Form 108 documents AFP participation (5.5).",
      "AFP supports continued conditioning while exemptions and PFRA Hold rules apply (Chapter 4, 5.5)."
    ],
    cautions: [
      "Missing the enrollment window is an administrative compliance issue.",
      "AFP is not optional busywork when the profile requires it.",
      "Modified plans must come from appropriate medical / fitness processes — not chat advice."
    ],
    next_steps: [
      "Confirm AF Form 469 exemption status.",
      "Complete AF Form 108 and enroll within the correct timeline.",
      "Coordinate the modified plan with UFPM / FAC and medical guidance."
    ],
    references: [
      cite("5.5", "Adaptive Fitness Program enrollment"),
      cite("Chapter 4", "Medical exemption linkage")
    ]
  },

  fitness_reconditioning: {
    title: "Fitness Reconditioning Program (FRP)",
    bluf:
      "BLUF: Unsatisfactory PFRA or WHtR > 0.55 with failing BFA triggers FRP enrollment within 10 duty days (ARC: 60 calendar days) (5.6).",
    key_points: [
      "FRP triggers include Unsatisfactory PFRA (5.6).",
      "FRP also triggers when WHtR > 0.55 and BFA is failed (5.6, 3.15.4.2).",
      "RegAF members enroll within 10 duty days (5.6).",
      "ARC members enroll within 60 calendar days (5.6).",
      "FRP supports return to Ready status before or alongside the shorter Unsatisfactory reassessment cycle (5.6; Table 3.3 / 3.4 / 3.10)."
    ],
    cautions: [
      "FRP enrollment timing is mandatory policy, not optional coaching.",
      "Failing BFA after high-risk WHtR is Unsatisfactory PFRA (3.7.2) and FRP-triggering (5.6).",
      "This module does not create individualized rehab prescriptions."
    ],
    next_steps: [
      "Confirm the Unsatisfactory or BFA-fail trigger in myFitness.",
      "Enroll in FRP within the RegAF or ARC window.",
      "Target the failed component minimums before chasing composite points."
    ],
    references: [
      cite("5.6", "Fitness Reconditioning Program"),
      cite("3.7.2, 3.15.4.2", "BFA fail / high-risk WHtR pathway"),
      cite("Table 3.3, 3.4, 3.10", "Unsatisfactory reassessment frequency")
    ]
  },

  body_fat_assessment: {
    title: "Tier 2 Body Fat Assessment (BFA)",
    bluf:
      "BLUF: High-risk WHtR > 0.55 plus Unsatisfactory leads to Tier 2 BFA (InBody 770 or 2–3 site tape). Pass standards are Male < 26% and Female < 36%; pass treats body as exempt, fail is Unsatisfactory PFRA (3.15.4.2, Table 3.2, 3.7.2).",
    key_points: [
      "Tier 2 BFA is triggered by WHtR > 0.55 with Unsatisfactory (3.15.4.2).",
      "Authorized methods include InBody 770 or 2–3 site tape per Attachment 8 (3.15.4.2).",
      "Table 3.2 standards: Male < 26% body fat; Female < 36% body fat.",
      "BFA pass → body composition scored as an exempt component (3.7.2).",
      "BFA fail → Unsatisfactory PFRA (3.7.2) and FRP enrollment pathway (5.6)."
    ],
    cautions: [
      "Do not substitute unofficial home scales for official BFA methods.",
      "Sex-specific standards must not be mixed.",
      "Educational estimates are not official BFA results."
    ],
    next_steps: [
      "Confirm high-risk WHtR truncation/result with FAC.",
      "Complete official Tier 2 BFA via authorized method.",
      "If BFA fails, enroll in FRP on timeline and prepare for Unsatisfactory cycle."
    ],
    references: [
      cite("3.15.4.2, Table 3.2, Attachment 8", "BFA trigger, methods, standards"),
      cite("3.7.2", "BFA pass/fail PFRA treatment"),
      cite("5.6", "FRP after failing BFA pathway")
    ]
  },

  assessment_procedures: {
    title: "Assessment Procedures",
    bluf:
      "BLUF: Official PFRA flow includes FSQ (DAF Form 4446A), authorized modalities, scorecard (AF Form 4446), and myFitness entry. Follow FAC procedures and current profiles (3.3, 3.7.5).",
    key_points: [
      "Complete the FSQ before assessment (3.3).",
      "Use only authorized component modalities for the member’s profile and age/sex standards (3.1, 3.7.1).",
      "Record results on AF Form 4446 scorecard processes as directed (forms inventory).",
      "Official scores are entered/confirmed in myFitness (3.7.5).",
      "Unit assessments may be directed at Installation Commander discretion (Table 3.3 / 3.4 / 3.10)."
    ],
    cautions: [
      "Procedural shortcuts can invalidate results.",
      "Walk and exemptions require documented AF Form 469 authorization.",
      "Unofficial calculator outputs are not FAC scorecards."
    ],
    next_steps: [
      "Arrive with FSQ and current profile documentation.",
      "Confirm modality selections with FAC before starting.",
      "Verify the posted myFitness result after the event."
    ],
    references: [
      cite("3.3, 3.7.1, 3.7.5", "FSQ, components, official scores"),
      cite("Table 3.3, 3.4, 3.10", "Unit assessment discretion")
    ]
  },

  altitude: {
    title: "Altitude Considerations",
    bluf:
      "BLUF: At or above 5,250 feet, AFMAN 36-2905 provides altitude policy guidance (3.15.12.3, Attachment 3). This module does not run an altitude score calculator.",
    key_points: [
      "Altitude policy attention begins at ≥ 5,250 feet (3.15.12.3, Attachment 3).",
      "Guidance is policy-oriented; FAC / official charts control any adjusted application.",
      "This educational module intentionally provides no altitude-adjusted scoring calculator.",
      "Members should disclose duty location altitude when discussing cardio performance expectations.",
      "Local FAC procedures implement Attachment 3 guidance."
    ],
    cautions: [
      "Do not invent unofficial altitude point adjustments here.",
      "High-altitude training stress is a safety topic — follow medical and unit guidance.",
      "Calculator estimates without altitude handling remain planning-only."
    ],
    next_steps: [
      "Confirm installation elevation with FAC.",
      "Review Attachment 3 with fitness staff before assessment.",
      "Avoid relying on third-party altitude formulas."
    ],
    references: [
      cite("3.15.12.3, Attachment 3", "Altitude policy guidance")
    ]
  },

  appeals: {
    title: "Appeals",
    bluf:
      "BLUF: Appeal within one month via myFitness to the UFPM, with elevation available to the wing commander and FAAB at AFPC (8.2–8.3, Table 8.1). This is not legal advice.",
    key_points: [
      "Appeal window is within one month (8.2–8.3, Table 8.1).",
      "Start the appeal through myFitness to the UFPM (8.2–8.3).",
      "Elevation paths include the wing commander and FAAB at AFPC (8.2–8.3, Table 8.1).",
      "Keep scorecards, profiles, and timeline evidence organized.",
      "Administrative correction (8.4) is a separate, narrower process than appeals."
    ],
    cautions: [
      "This guidance is not legal advice (8.2–8.3).",
      "Missing the one-month window can forfeit appeal options.",
      "Do not confuse appeals with FRP/AFP enrollment duties."
    ],
    next_steps: [
      "Note the assessment date and calculate the one-month appeal window.",
      "Submit via myFitness to the UFPM with supporting documents.",
      "Ask UFPM which elevation path applies if unresolved."
    ],
    references: [
      cite("8.2–8.3, Table 8.1", "Appeals process"),
      cite("8.4", "Administrative corrections (distinct process)")
    ]
  },

  administrative_correction: {
    title: "Administrative Corrections",
    bluf:
      "BLUF: Administrative corrections under 8.4 are limited to reps mismatch, profile date/exemption updates, double-entry deletion, and assessment while pregnant.",
    key_points: [
      "Allowed correction: reps mismatch (8.4).",
      "Allowed correction: profile dates / exemption updates (8.4).",
      "Allowed correction: double entry deletion (8.4).",
      "Allowed correction: assessment while pregnant (8.4).",
      "Other disputes generally belong in the appeals process (8.2–8.3), not 8.4."
    ],
    cautions: [
      "Do not treat dissatisfaction with a hard score as an automatic admin correction.",
      "Only the listed 8.4 categories qualify.",
      "UFPM / records custodians control the correction workflow."
    ],
    next_steps: [
      "Identify which 8.4 category applies.",
      "Gather scorecard, profile, or duplicate-entry evidence.",
      "Route through UFPM / myFitness administrative channels."
    ],
    references: [
      cite("8.4", "Administrative correction categories"),
      cite("8.2–8.3, Table 8.1", "Appeals when correction categories do not apply")
    ]
  },

  myfitness: {
    title: "myFitness Official Scores",
    bluf:
      "BLUF: myFitness is the system of record for official PFRA scores (3.7.5). Unofficial calculators and chat summaries are planning aids only.",
    key_points: [
      "Official scores are those recorded in myFitness (3.7.5).",
      "Category, currency, and administrative actions should reference myFitness values.",
      "Appeals begin via myFitness to the UFPM (8.2–8.3).",
      "Profile and exemption data should align with medical documentation and myFitness displays (Chapter 4).",
      "Ask Amy may summarize a supplied snapshot but will not override myFitness."
    ],
    cautions: [
      "Screenshots can be stale — refresh myFitness before acting.",
      "Educational recomputation is not an official rescoring.",
      "Do not ignore FRP/AFP timelines while waiting on score debates."
    ],
    next_steps: [
      "Open myFitness and confirm the latest official entry.",
      "Compare any unofficial snapshot to the posted result.",
      "If mismatch is an 8.4 category, pursue administrative correction."
    ],
    references: [
      cite("3.7.5", "Official scores in myFitness"),
      cite("8.2–8.3, 8.4", "Appeals and admin corrections via official channels")
    ]
  },

  special_populations: {
    title: "Special Populations & Edge Cases",
    bluf:
      "BLUF: Pregnancy-related assessment issues may qualify for administrative correction (8.4). Medical profiles, walk authorization, ARC timing, and USSF non-applicability are common special cases.",
    key_points: [
      "Assessment while pregnant is an authorized administrative correction category (8.4).",
      "Medical exemptions use AF Form 469 and may require AFP (Chapter 4, 5.5).",
      "Walk is a medical-only cardio alternative with distinct Excellent restrictions (3.7.3).",
      "ARC frequency and enrollment windows differ from RegAF (Table 3.3 / 3.4 / 3.10; 5.5; 5.6).",
      "USSF members are outside AFMAN 36-2905 applicability (SPFMAN 36-2905)."
    ],
    cautions: [
      "Do not invent pregnancy scoring shortcuts beyond published correction/policy paths.",
      "Special population status still requires official documentation.",
      "Space Force questions need SPFMAN 36-2905, not AFMAN substitution."
    ],
    next_steps: [
      "Identify the special-population category and required form.",
      "Coordinate UFPM + MTF early.",
      "For USSF, redirect to SPFMAN 36-2905 resources."
    ],
    references: [
      cite("8.4", "Pregnancy-related administrative correction"),
      cite("Chapter 4, 5.5, 3.7.3", "Profiles, AFP, walk"),
      cite("Applicability", "USSF / SPFMAN 36-2905")
    ]
  },

  roles: {
    title: "Roles & Responsibilities",
    bluf:
      "BLUF: Members own year-round readiness; FACs/UFPMs administer assessments and myFitness; commanders decide invalidation and support programs; MTFs control medical profiles (1.1.2, 3.12, Chapter 4).",
    key_points: [
      "Members are responsible for fitness 365 days a year (1.1.2).",
      "Fitness administrators / UFPMs run assessment logistics, FSQ checks, and score processes (3.3, 3.7.5).",
      "Commanders may invalidate assessments after MTF evaluation for illness/injury cases (3.12).",
      "MTFs issue AF Form 469 profiles and related medical determinations (Chapter 4).",
      "Installation Commanders may direct unit assessments (Table 3.3 / 3.4 / 3.10)."
    ],
    cautions: [
      "Ask Amy is not a commander, UFPM, or medical authority.",
      "Do not skip UFPM when pursuing appeals or corrections.",
      "Peer coaching cannot replace profile-directed medical limits."
    ],
    next_steps: [
      "Identify the correct POC: FAC/UFPM, commander, or MTF.",
      "Bring myFitness evidence to that POC.",
      "Meet AFP/FRP enrollment duties on time."
    ],
    references: [
      cite("1.1.2, 3.3, 3.12, Chapter 4", "Member, admin, commander, and medical roles"),
      cite("Table 3.3, 3.4, 3.10", "Installation Commander unit assessments")
    ]
  },

  forms: {
    title: "Key Fitness Forms",
    bluf:
      "BLUF: Know the four core forms — AF Form 4446 (scorecard), DAF Form 4446A (FSQ), AF Form 469 (profile), and AF Form 108 (AFP).",
    key_points: [
      "AF Form 4446 is the fitness assessment scorecard.",
      "DAF Form 4446A is the Fitness Screening Questionnaire required before PFRA (3.3).",
      "AF Form 469 documents medical profiles/exemptions (Chapter 4) and walk authorization (3.7.3).",
      "AF Form 108 supports Adaptive Fitness Program enrollment (5.5).",
      "Keep forms aligned with myFitness entries to avoid 8.4 correction needs."
    ],
    cautions: [
      "Using the wrong form delays assessment or enrollment.",
      "Expired 469 data can create invalid modality choices.",
      "Forms guidance here is educational — unit pubs may add local procedures."
    ],
    next_steps: [
      "Verify which form is missing for the current situation.",
      "Complete FSQ before test day.",
      "Update 469/108 whenever medical status changes."
    ],
    references: [
      cite("3.3, 3.7.3, Chapter 4, 5.5", "FSQ, walk authorization, profiles, AFP forms")
    ]
  }
});

const TOPIC_KEYS = Object.freeze(Object.keys(AF_FITNESS_GUIDANCE_TOPICS));

const MEDICAL_DISCLAIMERS = Object.freeze([
  "Educational guidance only — not medical advice, diagnosis, clearance, or treatment.",
  "AF Form 469 / MTF determinations control exemptions, walk authorization, and duty limitations.",
  "This is not legal advice, command direction, or an official myFitness rescoring."
]);

const GENERAL_DISCLAIMERS = Object.freeze([
  "Authority: AFMAN 36-2905 (24 March 2026). Official scores and currency are confirmed in myFitness (3.7.5).",
  "Does not apply to USSF members (use SPFMAN 36-2905).",
  "Does not replace UFPM, FAC, commander, or MTF decisions."
]);

// ============================================================
// //#4) HELPERS
// ============================================================

function lower(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase();
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function pickFirst(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(typeof value === "number" && !Number.isFinite(value))
    ) {
      return value;
    }
  }
  return null;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/[,%$]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function toNumber(value, fallback = 0) {
  const n = toNullableNumber(value);
  return n === null ? fallback : n;
}

function boolish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const s = lower(value);
  if (["true", "yes", "y", "1", "pass", "passed", "authorized"].includes(s)) return true;
  if (["false", "no", "n", "0", "fail", "failed", "unauthorized"].includes(s)) return false;
  return fallback;
}

function stripEmpty(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value;
      continue;
    }
    if (typeof value === "object") {
      const nested = stripEmpty(value);
      if (nested && Object.keys(nested).length) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function cloneArray(arr) {
  return Array.isArray(arr) ? [...arr] : [];
}

function uniqueArray(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function round1(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

// ============================================================
// //#5) NORMALIZERS
// ============================================================

function normalizeBranch(value) {
  const s = lower(value).replace(/[\s-]+/g, "_");
  if (["regaf", "reg_af", "regular_air_force", "active_duty", "ad", "usaf_regaf"].includes(s)) {
    return "RegAF";
  }
  if (["afr", "air_force_reserve", "reserve", "reserves"].includes(s)) return "AFR";
  if (["ang", "air_national_guard", "guard", "national_guard"].includes(s)) return "ANG";
  if (["arc", "air_reserve_component"].includes(s)) return "ARC";
  if (["ussf", "space_force", "guardian", "us_space_force"].includes(s)) return "USSF";
  if (["usaf", "air_force", "af"].includes(s)) return "USAF";
  return clean(value) || "";
}

function normalizeSex(value) {
  const s = lower(value);
  if (["m", "male", "man"].includes(s)) return "male";
  if (["f", "female", "woman"].includes(s)) return "female";
  return s || "";
}

function normalizeCategoryLabel(value) {
  const s = lower(value);
  if (!s) return "";
  if (s.includes("excellent")) return "Excellent";
  if (s.includes("satisfactory") && !s.includes("un")) return "Satisfactory";
  if (s.includes("unsatisfactory") || s.includes("fail")) return "Unsatisfactory";
  return clean(value);
}

export function normalizeAfFitnessProfile(profile = {}) {
  const safe = profile && typeof profile === "object" ? profile : {};
  const branch = normalizeBranch(
    pickFirst(
      safe.branch,
      safe.component,
      safe.service_component,
      safe.serviceComponent,
      safe.af_component,
      safe.status,
      safe.military_status,
      safe.militaryStatus
    )
  );

  const isArc =
    branch === "AFR" ||
    branch === "ANG" ||
    branch === "ARC" ||
    boolish(pickFirst(safe.is_arc, safe.isArc, safe.arc), false);

  return stripEmpty({
    email: clean(safe.email),
    full_name: clean(pickFirst(safe.full_name, safe.fullName, safe.name)),
    first_name: clean(
      pickFirst(
        safe.first_name,
        safe.firstName,
        String(pickFirst(safe.full_name, safe.fullName, safe.name) || "").split(/\s+/)[0]
      )
    ),
    branch,
    is_arc: isArc,
    is_ussf: branch === "USSF",
    sex: normalizeSex(pickFirst(safe.sex, safe.gender)),
    age: toNullableNumber(pickFirst(safe.age, safe.age_years, safe.ageYears)),
    age_band: clean(pickFirst(safe.age_band, safe.ageBand)),
    rank: clean(pickFirst(safe.rank, safe.rank_paygrade, safe.rankPaygrade)),
    base: clean(
      pickFirst(safe.base, safe.installation, safe.duty_station, safe.dutyStation)
    ),
    altitude_ft: toNullableNumber(
      pickFirst(safe.altitude_ft, safe.altitudeFt, safe.elevation_ft, safe.elevation)
    ),
    walk_authorized: (() => {
      const v = pickFirst(
        safe.walk_authorized,
        safe.walkAuthorized,
        safe.medical_walk,
        safe.medicalWalk
      );
      return v === null ? null : boolish(v, false);
    })(),
    has_af_form_469: (() => {
      const v = pickFirst(
        safe.has_af_form_469,
        safe.hasAfForm469,
        safe.profile_469,
        safe.on_profile
      );
      return v === null ? null : boolish(v, false);
    })(),
    medical_exemption: (() => {
      const v = pickFirst(
        safe.medical_exemption,
        safe.medicalExemption,
        safe.exemption,
        safe.pfra_hold,
        safe.pfraHold
      );
      return v === null ? null : boolish(v, false);
    })(),
    afp_enrolled: (() => {
      const v = pickFirst(safe.afp_enrolled, safe.afpEnrolled, safe.in_afp);
      return v === null ? null : boolish(v, false);
    })(),
    frp_enrolled: (() => {
      const v = pickFirst(safe.frp_enrolled, safe.frpEnrolled, safe.in_frp);
      return v === null ? null : boolish(v, false);
    })()
  });
}

export function normalizeAfFitnessContext(context = {}) {
  const safe = context && typeof context === "object" ? context : {};
  return stripEmpty({
    question_focus: clean(pickFirst(safe.question_focus, safe.questionFocus, safe.focus)),
    assessment_type: clean(
      pickFirst(safe.assessment_type, safe.assessmentType, safe.test_type)
    ),
    scheduled_assessment_date: clean(
      pickFirst(
        safe.scheduled_assessment_date,
        safe.scheduledAssessmentDate,
        safe.next_due,
        safe.nextDue
      )
    ),
    diagnostic: (() => {
      const v = pickFirst(safe.diagnostic, safe.is_diagnostic, safe.isDiagnostic, safe.dpfra);
      return v === null ? null : boolish(v, false);
    })(),
    altitude_ft: toNullableNumber(
      pickFirst(safe.altitude_ft, safe.altitudeFt, safe.elevation_ft, safe.elevation)
    ),
    unit_directed: (() => {
      const v = pickFirst(safe.unit_directed, safe.unitDirected);
      return v === null ? null : boolish(v, false);
    })(),
    illness_injury: (() => {
      const v = pickFirst(safe.illness_injury, safe.illnessInjury, safe.injured, safe.ill);
      return v === null ? null : boolish(v, false);
    })(),
    score_snapshot: safe.score_snapshot || safe.scoreSnapshot || safe.pt_score || null
  });
}

function normalizePassFlag(value) {
  if (value === undefined || value === null || value === "") return null;
  return boolish(value, false);
}

export function normalizePtScoreSnapshot(snapshot = {}) {
  const safe = snapshot && typeof snapshot === "object" ? snapshot : {};
  const components = safe.components || safe.component_scores || safe.scores || {};
  const passes = safe.component_pass || safe.componentPass || safe.passes || {};

  const body = toNullableNumber(
    pickFirst(
      components.body_composition,
      components.body,
      safe.body_composition,
      safe.body
    )
  );
  const strength = toNullableNumber(
    pickFirst(components.strength, safe.strength)
  );
  const core = toNullableNumber(pickFirst(components.core, safe.core));
  const cardio = toNullableNumber(pickFirst(components.cardio, safe.cardio));

  const composite = toNullableNumber(
    pickFirst(
      safe.composite,
      safe.total,
      safe.total_score,
      safe.totalScore,
      safe.score
    )
  );

  const walkMode = boolish(
    pickFirst(
      safe.walk_mode,
      safe.walkMode,
      safe.walk,
      safe.cardio_option === "two_kilometer_walk",
      safe.cardioOption === "two_kilometer_walk"
    ),
    false
  );

  const categoryRaw = normalizeCategoryLabel(
    pickFirst(safe.category, safe.rating, safe.result)
  );

  return stripEmpty({
    composite: composite === null ? null : round1(composite),
    category: categoryRaw,
    walk_mode: walkMode,
    walk_pass: normalizePassFlag(pickFirst(safe.walk_pass, safe.walkPass, passes.walk)),
    body_composition: body === null ? null : round1(body),
    strength: strength === null ? null : round1(strength),
    core: core === null ? null : round1(core),
    cardio: cardio === null ? null : round1(cardio),
    body_pass: normalizePassFlag(
      pickFirst(passes.body_composition, passes.body, safe.body_pass, safe.bodyPass)
    ),
    strength_pass: normalizePassFlag(
      pickFirst(passes.strength, safe.strength_pass, safe.strengthPass)
    ),
    core_pass: normalizePassFlag(
      pickFirst(passes.core, safe.core_pass, safe.corePass)
    ),
    cardio_pass: normalizePassFlag(
      pickFirst(passes.cardio, safe.cardio_pass, safe.cardioPass)
    ),
    overall_pass: normalizePassFlag(
      pickFirst(safe.overall_pass, safe.overallPass, safe.passed, safe.pass)
    ),
    component_minimums_met: normalizePassFlag(
      pickFirst(
        safe.component_minimums_met,
        safe.componentMinimumsMet,
        safe.minimums_met
      )
    ),
    whtr: toNullableNumber(pickFirst(safe.whtr, safe.WHtR, safe.measurements?.whtr)),
    official_confirmation_required: true
  });
}

// ============================================================
// //#6) SCORE SNAPSHOT SUMMARY (no recalculation)
// ============================================================

function classifyFromComposite(composite, minimumsMet) {
  if (composite === null || composite === undefined) {
    return { category: null, caution: null };
  }

  const c = Number(composite);

  if (minimumsMet === false) {
    return {
      category: "Unsatisfactory",
      caution: "Physical component minimum(s) not met → Unsatisfactory regardless of composite (3.6.1, 3.7.1)."
    };
  }

  if (Math.abs(c - 90) < 0.0001) {
    return {
      category: "Boundary_90.0",
      caution:
        "Composite is exactly 90.0 — do not classify as Excellent without official myFitness verification (3.6.1)."
    };
  }

  if (c > 90) {
    return { category: "Excellent", caution: null };
  }

  if (c >= 75 && c <= 89.9) {
    return { category: "Satisfactory", caution: null };
  }

  if (c < 74.9 || c < 75) {
    return { category: "Unsatisfactory", caution: null };
  }

  return {
    category: null,
    caution: "Composite falls on a category boundary — confirm in myFitness (3.6.1)."
  };
}

function findWeakestComponent(snap) {
  const rows = [
    { key: "body_composition", label: "Body Composition", score: snap.body_composition, cap: 20 },
    { key: "strength", label: "Strength", score: snap.strength, cap: 15 },
    { key: "core", label: "Core", score: snap.core, cap: 15 },
    { key: "cardio", label: "Cardio", score: snap.cardio, cap: 50 }
  ].filter((r) => r.score !== null && r.score !== undefined && Number.isFinite(Number(r.score)));

  if (!rows.length) return null;

  let weakest = null;
  for (const row of rows) {
    const ratio = Number(row.score) / row.cap;
    if (!weakest || ratio < weakest.ratio) {
      weakest = { ...row, ratio };
    }
  }

  return weakest
    ? {
        component: weakest.key,
        label: weakest.label,
        score: weakest.score,
        cap: weakest.cap,
        points_from_cap: round1(weakest.cap - Number(weakest.score))
      }
    : null;
}

export function summarizePtScoreSnapshot(snapshot = {}, profile = {}) {
  const snap = normalizePtScoreSnapshot(snapshot);
  const normalizedProfile = normalizeAfFitnessProfile(profile);
  const cautions = [];
  const notes = [];

  const minimumsMet =
    snap.component_minimums_met !== null && snap.component_minimums_met !== undefined
      ? snap.component_minimums_met
      : null;

  const classification = classifyFromComposite(snap.composite, minimumsMet);
  if (classification.caution) cautions.push(classification.caution);

  let interpretedCategory = snap.category || classification.category || null;

  if (snap.composite !== null && Math.abs(Number(snap.composite) - 90) < 0.0001) {
    interpretedCategory = snap.category || "Confirm in myFitness (90.0 boundary)";
    if (!classification.caution) {
      cautions.push(
        "Exact 90.0 composite requires official verification — not auto-Excellent (3.6.1)."
      );
    }
  }

  if (snap.walk_mode) {
    notes.push(
      "Walk mode: pass/fail, no cardio points; cannot apply toward Excellent; if passed, composite is treated like cardio-exempt (3.7.3). No invented adjusted formula is applied here."
    );
    if (snap.walk_pass === true) {
      notes.push("Supplied walk_pass=true — interpret using provided overall/component pass flags only.");
    } else if (snap.walk_pass === false) {
      notes.push("Supplied walk_pass=false — treat cardio walk attempt as not passed per snapshot flags.");
    }
    if (interpretedCategory === "Excellent" || lower(interpretedCategory).includes("excellent")) {
      cautions.push(
        "Walk results cannot apply to an Excellent category (3.7.3). Confirm official category in myFitness."
      );
    }
  }

  // Use supplied pass booleans only — never recompute component passes from charts
  const passSummary = stripEmpty({
    body_pass: snap.body_pass,
    strength_pass: snap.strength_pass,
    core_pass: snap.core_pass,
    cardio_pass: snap.cardio_pass,
    walk_pass: snap.walk_pass,
    overall_pass: snap.overall_pass,
    component_minimums_met: snap.component_minimums_met
  });

  const weakest = findWeakestComponent(snap);

  if (normalizedProfile.is_ussf) {
    cautions.push(
      "Profile indicates USSF — AFMAN 36-2905 does not apply; use SPFMAN 36-2905."
    );
  }

  let bluf;
  if (snap.composite === null && !interpretedCategory) {
    bluf =
      "BLUF: No composite was supplied. I can explain AFMAN 36-2905 rules, but I will not invent a recalculated score.";
  } else if (snap.walk_mode) {
    bluf = `BLUF: Walk-mode snapshot${
      snap.composite !== null ? ` shows composite ${snap.composite}` : ""
    }${interpretedCategory ? ` (${interpretedCategory})` : ""}. Walk is pass/fail with no cardio points and cannot support Excellent (3.7.3). Confirm in myFitness.`;
  } else {
    bluf = `BLUF: Supplied snapshot${
      snap.composite !== null ? ` composite ${snap.composite}` : ""
    }${interpretedCategory ? ` → ${interpretedCategory}` : ""}. Pass flags are taken as provided; official confirmation is myFitness (3.7.5).`;
  }

  return stripEmpty({
    ok: true,
    version: AF_FITNESS_VERSION,
    bluf,
    composite: snap.composite,
    category_supplied: snap.category || null,
    category_interpreted: interpretedCategory,
    walk_mode: snap.walk_mode,
    pass_summary: passSummary,
    components: stripEmpty({
      body_composition: snap.body_composition,
      strength: snap.strength,
      core: snap.core,
      cardio: snap.cardio,
      caps: { body_composition: 20, strength: 15, core: 15, cardio: 50 }
    }),
    weakest_component: weakest,
    whtr: snap.whtr,
    cautions: uniqueArray(cautions),
    notes: uniqueArray(notes),
    official_confirmation: "myFitness",
    recalculated: false,
    profile_used: normalizedProfile,
    source: "TheWing af-fitness.js"
  });
}

// ============================================================
// //#7) INTENT DETECTION (specific → general)
// ============================================================

export function detectAfFitnessIntent(message = "") {
  const t = lower(message);

  if (!t) return "overview";

  // Space Force / applicability often maps to overview with USSF caution
  if (/\b(space force|ussf|guardian|spfman)\b/.test(t)) {
    return "overview";
  }

  if (
    /\b(admin(?:istrative)? correction|reps mismatch|double entry|assessed while pregnant|pregnant assessment)\b/.test(
      t
    )
  ) {
    return "administrative_correction";
  }

  if (/\b(appeal|faab|ufpm appeal|contest (?:my |the )?score)\b/.test(t)) {
    return "appeals";
  }

  if (/\b(myfitness|my fitness|official score|score of record)\b/.test(t)) {
    return "myfitness";
  }

  if (
    /\b(daf form 4446a|af form 4446|af form 469|af form 108|what forms?|fitness forms?)\b/.test(t)
  ) {
    return "forms";
  }

  if (/\b(fsq|fitness screening questionnaire|4446a)\b/.test(t)) {
    return "fsq";
  }

  if (
    /\b(diagnostic|dpfra|practice (?:pfra|pt|fitness)|non[-\s]?attribution)\b/.test(t)
  ) {
    return "diagnostic_pfra";
  }

  if (
    /\b(2[\s-]?km walk|2[\s-]?kilometer walk|medical walk|walk (?:test|modality|authorized))\b/.test(
      t
    )
  ) {
    return "walk";
  }

  if (
    /\b(body fat|bfa|inbody|tape (?:test|measure)|percent body fat|body fat assessment)\b/.test(t)
  ) {
    return "body_fat_assessment";
  }

  if (
    /\b(whtr|waist[-\s]?to[-\s]?height|body composition|waist ratio|high[-\s]?risk waist)\b/.test(
      t
    )
  ) {
    return "body_composition";
  }

  if (
    /\b(altitude|elevation|5,?250|5250|high altitude)\b/.test(t)
  ) {
    return "altitude";
  }

  if (
    /\b(illness|injury|hurt|sick|invalidate|invalidat(?:e|ion)|af form 4446)\b/.test(t) &&
    /\b(test|assess|pfra|pt|fitness|day)\b/.test(t)
  ) {
    return "illness_injury";
  }

  if (
    /\b(illness|injury|hurt on (?:the )?test|sick on (?:the )?test|commander invalidate)\b/.test(t)
  ) {
    return "illness_injury";
  }

  if (
    /\b(afp|adaptive fitness|form 108|modified exercise plan)\b/.test(t)
  ) {
    return "adaptive_fitness";
  }

  if (
    /\b(frp|reconditioning|fitness reconditioning)\b/.test(t)
  ) {
    return "fitness_reconditioning";
  }

  if (
    /\b(469|medical (?:exemption|profile|waiver)|pfra hold|component exemption|composite exemption)\b/.test(
      t
    )
  ) {
    return "medical_exemption";
  }

  if (
    /\b(how often|frequency|every (?:6|12|3) months|when (?:is|do) (?:my|the) (?:next )?(?:pt|pfra|test)|reassess|currency)\b/.test(
      t
    )
  ) {
    return "assessment_frequency";
  }

  if (
    /\b(pcp|physical conditioning|duty day workout|20[–-]?60 min|year[-\s]?round fitness)\b/.test(
      t
    )
  ) {
    return "physical_conditioning";
  }

  if (
    /\b(pregnant|pregnancy|special population|postpartum|arc vs regaf|reservist rules)\b/.test(t)
  ) {
    return "special_populations";
  }

  if (
    /\b(ufpm|fac\b|fitness assessment cell|commander(?:'s)? role|who (?:is )?responsible|roles?)\b/.test(
      t
    )
  ) {
    return "roles";
  }

  if (
    /\b(procedure|how (?:does|do) (?:the )?(?:pfra|pt|test) work|assessment day|what happens (?:at|on) (?:the )?test)\b/.test(
      t
    )
  ) {
    return "assessment_procedures";
  }

  if (
    /\b(component(?:s)?|strength|core|cardio|push[-\s]?ups|sit[-\s]?ups|plank|hamr|2[\s-]?mile|what is tested)\b/.test(
      t
    ) &&
    !/\b(score|pass|fail|excellent|satisfactory|interpret)\b/.test(t)
  ) {
    return "components";
  }

  // Score interpretation before generic scoring
  if (
    /\b(interpret(?: my)? score|score interpretation|what does (?:my )?score mean|explain (?:my )?score|how did i do|did i pass|did i fail|why did i fail|am i ready|am i unsatisfactory|read my (?:pt|pfra) results?)\b/.test(
      t
    )
  ) {
    return "score_interpretation";
  }

  if (
    /\b(excellent|satisfactory|unsatisfactory|composite|categor(?:y|ies)|minimums?|pass(?:ing)? score|scoring|points?)\b/.test(
      t
    )
  ) {
    return "scoring";
  }

  if (/\b(component(?:s)?|body|strength|core|cardio)\b/.test(t)) {
    return "components";
  }

  if (/\b(pt|pfra|fitness|air force fitness|afman\s*36-?2905)\b/.test(t)) {
    return "overview";
  }

  return "overview";
}

function resolveTopicKey(intent) {
  if (intent === "score_interpretation") return "scoring";
  if (AF_FITNESS_GUIDANCE_TOPICS[intent]) return intent;
  return "overview";
}

// ============================================================
// //#8) GUIDANCE BUILDER
// ============================================================

function buildPersonalizedGuidance({
  intent,
  topicKey,
  topic,
  profile,
  context,
  scoreSummary
}) {
  const keyPoints = cloneArray(topic.key_points);
  const cautions = cloneArray(topic.cautions);
  const nextSteps = cloneArray(topic.next_steps);
  let bluf = topic.bluf;

  if (profile.is_ussf) {
    cautions.unshift(
      "USSF detected — AFMAN 36-2905 does not apply; use SPFMAN 36-2905 (applicability)."
    );
    if (topicKey === "overview") {
      bluf =
        "BLUF: United States Space Force members follow SPFMAN 36-2905, not AFMAN 36-2905. I can explain AF rules for awareness, but do not treat them as USSF requirements.";
    }
  }

  if (profile.is_arc || profile.branch === "AFR" || profile.branch === "ANG") {
    if (topicKey === "assessment_frequency") {
      bluf =
        "BLUF: As an ARC (AFR/ANG) member, Excellent/Satisfactory currency is generally every 12 months; Unsatisfactory remains a 3-month Total Force cycle (Table 3.3 / 3.4 / 3.10).";
    }
    if (topicKey === "adaptive_fitness" || topicKey === "fitness_reconditioning") {
      nextSteps.unshift("Use the ARC 60-calendar-day enrollment window (5.5 / 5.6).");
    }
    if (topicKey === "diagnostic_pfra") {
      keyPoints.unshift("ARC diagnostic maximum is 1 per 365 days (3.8).");
    }
  } else if (profile.branch === "RegAF") {
    if (topicKey === "assessment_frequency") {
      keyPoints.unshift(
        "RegAF Excellent/Satisfactory reassessment cycle is 6 months (Table 3.3 / 3.4 / 3.10)."
      );
    }
  }

  if (profile.walk_authorized === true && (topicKey === "walk" || topicKey === "scoring")) {
    keyPoints.unshift(
      "Profile indicates walk authorization — still confirm current AF Form 469 before assessment day (3.7.3)."
    );
  }

  if (profile.medical_exemption === true) {
    if (topicKey === "medical_exemption" || topicKey === "body_composition") {
      keyPoints.unshift(
        "Profile flags a medical exemption — WHtR remains required even with exemptions (Chapter 4)."
      );
    }
  }

  const altitude = toNullableNumber(
    pickFirst(context.altitude_ft, profile.altitude_ft)
  );
  if (altitude !== null && altitude >= 5250) {
    if (topicKey === "altitude" || topicKey === "scoring" || topicKey === "components") {
      cautions.push(
        `Altitude about ${altitude} ft meets/exceeds the 5,250 ft policy threshold — use Attachment 3 / FAC guidance; no calculator adjustment is applied here (3.15.12.3).`
      );
    }
  }

  if (context.illness_injury === true && topicKey === "illness_injury") {
    nextSteps.unshift(
      "Notify the fitness administrator now and seek MTF evaluation before any invalidation request (3.12)."
    );
  }

  if (intent === "score_interpretation" || scoreSummary) {
    if (scoreSummary?.bluf) {
      bluf = scoreSummary.bluf;
    }
    if (scoreSummary?.weakest_component) {
      const w = scoreSummary.weakest_component;
      keyPoints.unshift(
        `Weakest supplied component vs cap: ${w.label} at ${w.score}/${w.cap} (${w.points_from_cap} points from cap).`
      );
    }
    if (scoreSummary?.cautions?.length) {
      cautions.unshift(...scoreSummary.cautions);
    }
    if (scoreSummary?.walk_mode) {
      nextSteps.unshift(
        "Because walk mode is active, do not chase Excellent from walk results (3.7.3)."
      );
    }
    nextSteps.unshift("Confirm the official category and component passes in myFitness (3.7.5).");
  }

  return {
    bluf,
    key_points: uniqueArray(keyPoints),
    cautions: uniqueArray(cautions),
    next_steps: uniqueArray(nextSteps)
  };
}

export function getAfFitnessGuidance(
  intentOrMessage = "overview",
  profile = {},
  context = {},
  scoreSnapshot = null
) {
  const intent =
    AF_FITNESS_GUIDANCE_TOPICS[intentOrMessage] || intentOrMessage === "score_interpretation"
      ? intentOrMessage
      : detectAfFitnessIntent(intentOrMessage);

  const topicKey = resolveTopicKey(intent);
  const topic = AF_FITNESS_GUIDANCE_TOPICS[topicKey] || AF_FITNESS_GUIDANCE_TOPICS.overview;

  const normalizedProfile = normalizeAfFitnessProfile(profile);
  const normalizedContext = normalizeAfFitnessContext({
    ...context,
    score_snapshot: scoreSnapshot || context.score_snapshot || context.scoreSnapshot
  });

  const snapshotSource =
    scoreSnapshot ||
    normalizedContext.score_snapshot ||
    context.score_snapshot ||
    context.pt_score ||
    null;

  const scoreSummary =
    snapshotSource && typeof snapshotSource === "object"
      ? summarizePtScoreSnapshot(snapshotSource, normalizedProfile)
      : intent === "score_interpretation"
        ? summarizePtScoreSnapshot({}, normalizedProfile)
        : null;

  const personalized = buildPersonalizedGuidance({
    intent,
    topicKey,
    topic,
    profile: normalizedProfile,
    context: normalizedContext,
    scoreSummary
  });

  return stripEmpty({
    ok: true,
    version: AF_FITNESS_VERSION,
    intent,
    topic_key: topicKey,
    topic: topic.title,
    bluf: personalized.bluf,
    key_points: personalized.key_points,
    cautions: personalized.cautions,
    next_steps: personalized.next_steps,
    references: cloneArray(topic.references),
    score_summary: scoreSummary,
    profile_used: normalizedProfile,
    context_used: normalizedContext,
    disclaimers: uniqueArray([...MEDICAL_DISCLAIMERS, ...GENERAL_DISCLAIMERS]),
    rules_touchpoints: stripEmpty({
      ready_composite_minimum: AF_FITNESS_RULES.components.ready_composite_minimum,
      excellent_rule: AF_FITNESS_RULES.categories.excellent.rule,
      exactNinetyRequiresOfficialVerification:
        AF_FITNESS_RULES.categories.exactNinetyRequiresOfficialVerification,
      applicability: AF_FITNESS_RULES.applicability
    }),
    source: "TheWing af-fitness.js"
  });
}

// ============================================================
// //#9) QUESTION ANALYZER
// ============================================================

function buildAfQuickAnswer({ intent, guidance }) {
  const lines = [];
  lines.push(guidance.bluf);

  if (guidance.score_summary?.composite != null) {
    lines.push(
      `Score snapshot: composite ${guidance.score_summary.composite}` +
        (guidance.score_summary.category_interpreted
          ? ` (${guidance.score_summary.category_interpreted})`
          : "") +
        "; official confirmation = myFitness."
    );
  }

  if (guidance.key_points?.length) {
    lines.push("Why: " + guidance.key_points.slice(0, 3).join(" "));
  }

  if (guidance.cautions?.length) {
    lines.push("Caution: " + guidance.cautions.slice(0, 2).join(" "));
  }

  if (guidance.next_steps?.length) {
    lines.push("Next move: " + guidance.next_steps[0]);
  }

  if (intent === "overview") {
    lines.push(
      "Bottom line: RegAF/AFR/ANG follow AFMAN 36-2905; USSF does not. Ready means component minimums met and composite ≥ 75."
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

export function analyzeAfFitnessQuestion(
  message = "",
  profile = {},
  context = {},
  scoreSnapshot = null
) {
  const intent = detectAfFitnessIntent(message);
  const guidance = getAfFitnessGuidance(intent, profile, context, scoreSnapshot);
  const normalizedProfile = normalizeAfFitnessProfile(profile);
  const normalizedContext = normalizeAfFitnessContext(context);

  return stripEmpty({
    ok: true,
    version: AF_FITNESS_VERSION,
    intent,
    reply: buildAfQuickAnswer({ intent, guidance }),
    guidance,
    profile_used: normalizedProfile,
    context_used: normalizedContext,
    source: "TheWing af-fitness.js"
  });
}

// ============================================================
// //#10) TRUTH PACKET FOR ASK AMY
// ============================================================

export function buildAfFitnessTruthPacket({
  message = "",
  profile = {},
  context = {},
  scoreSnapshot = null,
  ptScore = null
} = {}) {
  const normalizedProfile = normalizeAfFitnessProfile(profile);
  const normalizedContext = normalizeAfFitnessContext(context);
  const snapshot =
    scoreSnapshot ||
    ptScore ||
    normalizedContext.score_snapshot ||
    null;

  const intent = detectAfFitnessIntent(message);
  const guidance = getAfFitnessGuidance(
    intent,
    normalizedProfile,
    normalizedContext,
    snapshot
  );
  const scoreSummary = snapshot
    ? summarizePtScoreSnapshot(snapshot, normalizedProfile)
    : guidance.score_summary || null;

  const warnings = [];
  if (normalizedProfile.is_ussf) {
    warnings.push("USSF profile — apply SPFMAN 36-2905, not AFMAN 36-2905.");
  }
  if (scoreSummary?.cautions?.length) warnings.push(...scoreSummary.cautions);
  if (guidance.cautions?.length) warnings.push(...guidance.cautions.slice(0, 3));

  return stripEmpty({
    ok: true,
    version: AF_FITNESS_VERSION,
    reference: REF,
    intent,
    topic: guidance.topic,
    topic_key: guidance.topic_key,
    bluf: guidance.bluf,
    profile: normalizedProfile,
    context: normalizedContext,
    guidance: {
      key_points: guidance.key_points,
      cautions: guidance.cautions,
      next_steps: guidance.next_steps,
      references: guidance.references,
      disclaimers: guidance.disclaimers
    },
    score_summary: scoreSummary,
    rules: {
      components: AF_FITNESS_RULES.components,
      categories: AF_FITNESS_RULES.categories,
      assessment_frequency: AF_FITNESS_RULES.assessment_frequency,
      walk: AF_FITNESS_RULES.walk,
      whtr: AF_FITNESS_RULES.whtr,
      applicability: AF_FITNESS_RULES.applicability
    },
    forms: AF_FITNESS_RULES.forms,
    warnings: uniqueArray(warnings),
    source: "TheWing af-fitness.js"
  });
}

// ============================================================
// //#11) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  AF_FITNESS_VERSION,
  AF_FITNESS_REFERENCE,
  AF_FITNESS_RULES,
  AF_FITNESS_GUIDANCE_TOPICS,

  normalizeAfFitnessProfile,
  normalizeAfFitnessContext,
  normalizePtScoreSnapshot,

  detectAfFitnessIntent,
  getAfFitnessGuidance,
  analyzeAfFitnessQuestion,
  summarizePtScoreSnapshot,
  buildAfFitnessTruthPacket,

  topic_keys: TOPIC_KEYS
});
