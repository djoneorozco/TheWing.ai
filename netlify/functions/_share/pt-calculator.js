// netlify/functions/_share/pt-calculator.js
// ============================================================
// TheWing.ai • USAF PT / PFRA Calculator Knowledge Module
// v2026.2 • ES MODULE
//
// TheWing calculates. Amy explains.
//
// - Uses the corrected pt-scoring-core.js.
// - No handler, OpenAI, DOM, storage, or network dependency.
// - Unknown or invalid inputs do not become zero-point scores.
// - WHtR is truncated to hundredths.
// - Body composition has no independent passing minimum.
// - Medical walk awards no cardio points.
// - Walk adjusted composites are not estimated.
// ============================================================

import {
  PT_SCORING_CORE_VERSION,
  PT_SOURCE,
  ORDER,
  SCORE_CAPS,
  MIN_PASS,
  TABLES,
  roundWHtR,
  getWHtRScore,
  bodyCompositionPassed,
  scoreHigherBetter,
  scoreTimeLowerBetter,
  scoreWalk,
  walkPassed,
  scoreFromTable,
  scoreCategory,
  componentMinimumsMet,
  pairKeyFromSexAge,
  getStrengthTable,
  getCoreTable
} from "./pt-scoring-core.js";

// ============================================================
// 1. VERSION + RULES
// ============================================================

export const PT_CALCULATOR_VERSION = "pt-calculator-2026.2";

export const PT_CALCULATOR_RULES = Object.freeze({
  source: PT_SOURCE,
  scoring_core_version: PT_SCORING_CORE_VERSION,
  score_caps: SCORE_CAPS,

  rating_thresholds: Object.freeze({
    excellent: 90,
    satisfactory: 75
  }),

  component_minimums: Object.freeze({
    strength: MIN_PASS.strength,
    core: MIN_PASS.core,
    cardio: MIN_PASS.cardio,
    body_composition_max_whtr: MIN_PASS.bodyMaxRatio
  }),

  whtr_truncation: "truncate_hundredth",
  walk_scoring: "pass_fail_no_points_adjusted_composite_unavailable",

  unsupported_legacy: Object.freeze([
    "1.5_mile_run",
    "abdominal_circumference",
    "2022_component_weights"
  ])
});

export const PT_COMPONENT_MINIMUMS = Object.freeze({
  strength: MIN_PASS.strength,
  core: MIN_PASS.core,
  cardio: MIN_PASS.cardio,
  body_composition_max_whtr: MIN_PASS.bodyMaxRatio
});

export const PT_AGE_BANDS = Object.freeze([
  { key: "under25", label: "Under 25", min_age: 17, max_age: 24 },
  { key: "25-29", label: "25–29", min_age: 25, max_age: 29 },
  { key: "30-34", label: "30–34", min_age: 30, max_age: 34 },
  { key: "35-39", label: "35–39", min_age: 35, max_age: 39 },
  { key: "40-44", label: "40–44", min_age: 40, max_age: 44 },
  { key: "45-49", label: "45–49", min_age: 45, max_age: 49 },
  { key: "50-54", label: "50–54", min_age: 50, max_age: 54 },
  { key: "55-59", label: "55–59", min_age: 55, max_age: 59 },
  { key: "60plus", label: "60 and Over", min_age: 60, max_age: null }
]);

const AGE_BAND_ALIASES = Object.freeze({
  under25: "under25",
  under_25: "under25",
  "<25": "under25",
  "under 25": "under25",
  "25-29": "25-29",
  "25_29": "25-29",
  "30-34": "30-34",
  "30_34": "30-34",
  "35-39": "35-39",
  "35_39": "35-39",
  "40-44": "40-44",
  "40_44": "40-44",
  "45-49": "45-49",
  "45_49": "45-49",
  "50-54": "50-54",
  "50_54": "50-54",
  "55-59": "55-59",
  "55_59": "55-59",
  "60plus": "60plus",
  "60_plus": "60plus",
  "60_and_over": "60plus",
  "60 and over": "60plus",
  "60+": "60plus"
});

const STRENGTH_ALIASES = Object.freeze({
  push_ups: "push_ups",
  pushups: "push_ups",
  push_up: "push_ups",
  push: "push_ups",
  "push-ups": "push_ups",
  "traditional push-ups": "push_ups",
  hand_release_push_ups: "hand_release_push_ups",
  hand_release_pushups: "hand_release_push_ups",
  hrpu: "hand_release_push_ups",
  hr_push_up: "hand_release_push_ups",
  "hand-release push-ups": "hand_release_push_ups",
  "hand release push-ups": "hand_release_push_ups"
});

const CORE_ALIASES = Object.freeze({
  sit_ups: "sit_ups",
  situps: "sit_ups",
  sit_up: "sit_ups",
  situp: "sit_ups",
  "sit-ups": "sit_ups",
  cross_leg_reverse_crunch: "cross_leg_reverse_crunch",
  cross_legged_reverse_crunch: "cross_leg_reverse_crunch",
  rev_crunch: "cross_leg_reverse_crunch",
  crunch: "cross_leg_reverse_crunch",
  "cross-legged reverse crunch": "cross_leg_reverse_crunch",
  "cross-leg reverse crunch": "cross_leg_reverse_crunch",
  forearm_plank: "forearm_plank",
  plank: "forearm_plank",
  "forearm plank": "forearm_plank"
});

const CARDIO_ALIASES = Object.freeze({
  two_mile_run: "two_mile_run",
  "2_mile_run": "two_mile_run",
  run_2mi: "two_mile_run",
  run: "two_mile_run",
  "2.0 mile run": "two_mile_run",
  "2 mile run": "two_mile_run",
  "2-mile run": "two_mile_run",
  "2.0-mile run": "two_mile_run",
  "two mile run": "two_mile_run",
  hamr: "hamr",
  "20m hamr": "hamr",
  "20-meter hamr": "hamr",
  two_kilometer_walk: "two_kilometer_walk",
  "2km_walk": "two_kilometer_walk",
  walk_2km: "two_kilometer_walk",
  walk: "two_kilometer_walk",
  "2 km walk": "two_kilometer_walk",
  "2.0 kilometer walk": "two_kilometer_walk",
  "2 kilometer walk": "two_kilometer_walk",
  "2-kilometer walk": "two_kilometer_walk",
  "2.0 km walk": "two_kilometer_walk"
});

const LEGACY_OPTION_RE =
  /\b(1\.5[\s-]?mile|abdominal circumference|\bac\b scoring|2022 component|old pt test)\b/i;

// ============================================================
// 2. HELPERS
// ============================================================

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function isPlainObject(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function safeObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function firstDefined(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    return value;
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toBoolean(value) {
  if (value === true || value === false) return value;

  const t = lower(value);
  if (!t) return null;
  if (["1", "true", "yes", "y", "on"].includes(t)) return true;
  if (["0", "false", "no", "n", "off"].includes(t)) return false;

  return null;
}

function uniqueArray(values) {
  const out = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const item = clean(value);
    if (!item) continue;

    const key = item.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}

function stripEmpty(obj) {
  if (!isPlainObject(obj)) return obj;

  const out = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      if (value.length) out[key] = value;
      continue;
    }

    if (isPlainObject(value)) {
      const nested = stripEmpty(value);
      if (nested && Object.keys(nested).length) out[key] = nested;
      continue;
    }

    out[key] = value;
  }

  return out;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseTimeToSeconds(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const text = value.trim();

  if (/^\d+$/.test(text)) return Number(text);

  const match = /^(\d*):(\d{2})$/.exec(text);
  if (!match || Number(match[2]) >= 60) return null;

  return Number(match[1] || 0) * 60 + Number(match[2]);
}

function ageBandFromAge(age) {
  const n = toNumber(age);
  if (!Number.isInteger(n)) return null;

  for (const band of PT_AGE_BANDS) {
    if (n < band.min_age) continue;
    if (band.max_age === null || n <= band.max_age) return band.key;
  }

  return null;
}

function normalizeSex(value) {
  const t = lower(value);
  if (!t) return null;
  if (["male", "m", "man"].includes(t)) return "male";
  if (["female", "f", "woman"].includes(t)) return "female";
  return null;
}

function normalizeAgeBand(value, age) {
  const t = lower(value)
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");

  if (t && AGE_BAND_ALIASES[t]) return AGE_BAND_ALIASES[t];

  if (t && AGE_BAND_ALIASES[t.replace(/\s/g, "_")]) {
    return AGE_BAND_ALIASES[t.replace(/\s/g, "_")];
  }

  for (const [alias, key] of Object.entries(AGE_BAND_ALIASES)) {
    if (t === alias) return key;
  }

  for (const band of PT_AGE_BANDS) {
    if (t === lower(band.label) || t === lower(band.key)) {
      return band.key;
    }
  }

  return ageBandFromAge(age);
}

function normalizeOption(value, aliases) {
  const t = lower(value);
  if (!t) return null;
  if (aliases[t]) return aliases[t];

  // Exact supported labels only; never reinterpret a legacy run.
  if (
    aliases === CARDIO_ALIASES &&
    t === "2 km walk (medical only)"
  ) {
    return "two_kilometer_walk";
  }

  return null;
}

function whtrRisk(roundedRatio) {
  if (!Number.isFinite(roundedRatio)) return null;
  if (roundedRatio >= 0.55) return "high";
  if (roundedRatio >= 0.5) return "moderate";
  return "low";
}

function pointsToNextRow(
  tableRows,
  key,
  value,
  direction,
  currentPoints
) {
  if (!Array.isArray(tableRows) || !Number.isFinite(currentPoints)) {
    return null;
  }

  // Tables are ordered from highest to lowest points.
  for (let i = tableRows.length - 1; i >= 0; i -= 1) {
    const [pts, map] = tableRows[i];
    if (pts <= currentPoints) continue;

    const threshold = map?.[key];
    if (!Number.isFinite(threshold)) continue;

    if (direction === "lower") {
      return {
        target_points: pts,
        required_value: threshold,
        delta: Number.isFinite(value) ? value - threshold : null,
        direction: "lower_is_better"
      };
    }

    return {
      target_points: pts,
      required_value: threshold,
      delta: Number.isFinite(value) ? threshold - value : null,
      direction: "higher_is_better"
    };
  }

  return null;
}

// ============================================================
// 3. INTENT DETECTION
// ============================================================

const PT_EXPLICIT_RE =
  /\b(air force|usaf|pfra|pt calculator|pt test|pt score|physical fitness assessment|fitness assessment|pfa)\b/i;

const PT_COMPONENT_RE =
  /\b(2[\s-]?mile run|two[\s-]?mile run|hamr|hand[-\s]?release push[-\s]?ups?|push[-\s]?ups?|sit[-\s]?ups?|cross[-\s]?leg(?:ged)? reverse crunch|forearm plank|plank|waist[-\s]?to[-\s]?height|whtr|body composition)\b/i;

const PT_OUTCOME_RE =
  /\b(did i pass|did i fail|why did i fail|unsatisfactory|satisfactory|excellent|what score did i get|how did i do|how many (reps|push[-\s]?ups|sit[-\s]?ups|shuttles)|what do i need for|component minimum|pass my pt|fail my pt)\b/i;

const FALSE_POSITIVE_RE =
  /\b(credit score|mortgage score|fico|school test|exam score|va disability|disability percentage|financial readiness|housing readiness)\b/i;

export function detectPtCalculatorIntent(message = "", options = {}) {
  const t = lower(message);
  const hasPtContext = Boolean(options.hasPtData || options.ptContext);

  if (!t) {
    return hasPtContext ? "score_explanation" : null;
  }

  if (
    FALSE_POSITIVE_RE.test(t) &&
    !PT_EXPLICIT_RE.test(t) &&
    !PT_COMPONENT_RE.test(t)
  ) {
    return null;
  }

  const genericOnly =
    /\b(score|fitness)\b/.test(t) &&
    !PT_EXPLICIT_RE.test(t) &&
    !PT_COMPONENT_RE.test(t) &&
    !PT_OUTCOME_RE.test(t) &&
    !hasPtContext;

  if (genericOnly) return null;

  if (/\bwhtr\b|waist[-\s]?to[-\s]?height|body composition/.test(t)) {
    return "whtr_explanation";
  }

  if (
    /\bexcellent\b/.test(t) &&
    /\b(need|reach|get|score|for)\b/.test(t)
  ) {
    return "excellent_target";
  }

  if (
    /\b(how many|need|required|minimum)\b/.test(t) &&
    PT_COMPONENT_RE.test(t)
  ) {
    return "performance_target";
  }

  if (
    /\b(why did i fail|unsatisfactory|component minimum|did i fail)\b/.test(t)
  ) {
    return "failure_explanation";
  }

  if (/\b(did i pass|pass my|overall pass)\b/.test(t)) {
    return "pass_fail";
  }

  if (
    /\b(2[\s-]?km walk|2[\s-]?kilometer walk|walk authorized|medical walk)\b/.test(t)
  ) {
    return "walk_guidance";
  }

  if (/\baltitude\b/.test(t)) {
    return "altitude_guidance";
  }

  if (
    PT_EXPLICIT_RE.test(t) ||
    PT_COMPONENT_RE.test(t) ||
    PT_OUTCOME_RE.test(t) ||
    (hasPtContext && /\b(how did i do|my score|my result|explain)\b/.test(t))
  ) {
    return "score_explanation";
  }

  return null;
}

// ============================================================
// 4. INPUT NORMALIZATION
// ============================================================

export function normalizePtCalculatorInput(input = {}) {
  const raw = isPlainObject(input) ? input : {};
  const warnings = [];

  const nestedPt = safeObject(
    firstDefined(raw.pt, raw.ptCalculator, raw.pt_calculator, raw.pfra, raw)
  );

  const src = {
    ...safeObject(raw),
    ...nestedPt,
    ...safeObject(nestedPt.inputs),
    ...safeObject(nestedPt.raw),
    ...safeObject(nestedPt.selections),
    ...safeObject(nestedPt.measurements),
    ...safeObject(nestedPt.profile)
  };

  const sex = normalizeSex(
    firstDefined(src.sex, src.gender, src.Sex, src.Gender)
  );

  const age = toNumber(firstDefined(src.age, src.Age));

  const age_band = normalizeAgeBand(
    firstDefined(src.age_band, src.ageBand, src.age_group, src.ageGroup),
    age
  );

  const height_inches = toNumber(
    firstDefined(src.height_inches, src.heightInches, src.height, src.height_in)
  );

  const waist_inches = toNumber(
    firstDefined(
      src.waist_inches,
      src.waistInches,
      src.waist,
      src.waist_in,
      Array.isArray(src.waist_measurements)
        ? src.waist_measurements[0]
        : null
    )
  );

  let waist_measurements = null;

  if (Array.isArray(src.waist_measurements)) {
    waist_measurements = src.waist_measurements
      .map(v => toNumber(v))
      .filter(v => Number.isFinite(v));
  }

  const strength_option = normalizeOption(
    firstDefined(
      src.strength_option,
      src.strengthOption,
      src.strength_event,
      src.strengthEvent,
      src.strength?.option,
      src.strength?.event,
      src.events?.strength,
      src.selections?.strength
    ),
    STRENGTH_ALIASES
  );

  const strength_reps = toNumber(
    firstDefined(
      src.strength_reps,
      src.strengthReps,
      src.strength_value,
      src.strengthValue,
      src.strength?.reps,
      src.strength?.performance,
      src.strength?.value
    )
  );

  const core_option = normalizeOption(
    firstDefined(
      src.core_option,
      src.coreOption,
      src.endurance_event,
      src.enduranceEvent,
      src.core?.option,
      src.core?.event,
      src.events?.core,
      src.selections?.core
    ),
    CORE_ALIASES
  );

  const core_reps = toNumber(
    firstDefined(
      src.core_reps,
      src.coreReps,
      src.core_value,
      src.coreValue,
      src.core?.reps,
      core_option !== "forearm_plank" ? src.core?.performance : null
    )
  );

  const plank_seconds = parseTimeToSeconds(
    firstDefined(
      src.plank_seconds,
      src.plankSeconds,
      src.core_seconds,
      src.core?.seconds,
      core_option === "forearm_plank"
        ? firstDefined(
            src.core_value,
            src.coreValue,
            src.core?.value,
            src.core?.performance
          )
        : null
    )
  );

  const cardio_option = normalizeOption(
    firstDefined(
      src.cardio_option,
      src.cardioOption,
      src.cardio_event,
      src.cardioEvent,
      src.cardio?.option,
      src.cardio?.event,
      src.events?.cardio,
      src.selections?.cardio
    ),
    CARDIO_ALIASES
  );

  const run_seconds = parseTimeToSeconds(
    firstDefined(
      src.run_seconds,
      src.runSeconds,
      src.run_time,
      src.runTime,
      cardio_option === "two_mile_run"
        ? firstDefined(
            src.cardio_value,
            src.cardioValue,
            src.cardio?.value,
            src.cardio?.seconds,
            src.cardio?.performance
          )
        : null
    )
  );

  const run_minutes = toNumber(
    firstDefined(src.run_minutes, src.runMinutes)
  );

  const run_remaining_seconds = toNumber(
    firstDefined(src.run_remaining_seconds, src.runRemainingSeconds)
  );

  let resolvedRunSeconds = run_seconds;

  if (
    !Number.isFinite(resolvedRunSeconds) &&
    Number.isInteger(run_minutes) &&
    run_minutes >= 0 &&
    (
      run_remaining_seconds === null ||
      (
        Number.isInteger(run_remaining_seconds) &&
        run_remaining_seconds >= 0 &&
        run_remaining_seconds < 60
      )
    )
  ) {
    resolvedRunSeconds =
      run_minutes * 60 +
      (Number.isFinite(run_remaining_seconds) ? run_remaining_seconds : 0);
  }

  const hamr_shuttles = toNumber(
    firstDefined(
      src.hamr_shuttles,
      src.hamrShuttles,
      cardio_option === "hamr"
        ? firstDefined(
            src.cardio_value,
            src.cardioValue,
            src.cardio?.value,
            src.cardio?.shuttles,
            src.cardio?.performance
          )
        : null
    )
  );

  const walk_seconds = parseTimeToSeconds(
    firstDefined(
      src.walk_seconds,
      src.walkSeconds,
      cardio_option === "two_kilometer_walk"
        ? firstDefined(
            src.cardio_value,
            src.cardioValue,
            src.cardio?.value,
            src.cardio?.seconds,
            src.cardio?.performance
          )
        : null
    )
  );

  const walk_authorized = toBoolean(
    firstDefined(src.walk_authorized, src.walkAuthorized, src.medical_walk)
  );

  const cardio_exempt = toBoolean(
    firstDefined(src.cardio_exempt, src.cardioExempt, src.exempt_cardio)
  );

  const altitude_feet = toNumber(
    firstDefined(src.altitude_feet, src.altitudeFeet, src.altitude)
  );

  const altitude_group = clean(
    firstDefined(src.altitude_group, src.altitudeGroup)
  ) || null;

  const displayed_component_scores = isPlainObject(
    firstDefined(
      src.displayed_component_scores,
      src.displayedComponentScores,
      src.component_scores,
      src.componentScores,
      src.scores
    )
  )
    ? {
        body_composition: toNumber(
          firstDefined(
            src.displayed_component_scores?.body_composition,
            src.component_scores?.body_composition,
            src.scores?.bodyScore,
            src.scores?.body,
            src.bodyScore
          )
        ),
        strength: toNumber(
          firstDefined(
            src.displayed_component_scores?.strength,
            src.component_scores?.strength,
            src.scores?.strengthScore,
            src.scores?.strength,
            src.strengthScore
          )
        ),
        core: toNumber(
          firstDefined(
            src.displayed_component_scores?.core,
            src.component_scores?.core,
            src.scores?.coreScore,
            src.scores?.core,
            src.coreScore
          )
        ),
        cardio: toNumber(
          firstDefined(
            src.displayed_component_scores?.cardio,
            src.component_scores?.cardio,
            src.scores?.cardioScore,
            src.scores?.cardio,
            src.cardioScore
          )
        )
      }
    : null;

  const displayed_total_score = toNumber(
    firstDefined(
      src.displayed_total_score,
      src.displayedTotalScore,
      src.total_score,
      src.totalScore,
      src.total,
      src.scores?.total
    )
  );

  const displayed_rating = clean(
    firstDefined(
      src.displayed_rating,
      src.displayedRating,
      src.rating,
      src.category,
      src.scores?.category
    )
  ) || null;

  const legacyBlob = [
    src.strength_option,
    src.core_option,
    src.cardio_option,
    src.cardio_event,
    src.cardioEvent,
    src.notes,
    src.legacy
  ]
    .map(clean)
    .join(" ");

  if (
    LEGACY_OPTION_RE.test(legacyBlob) ||
    (cardio_option === null && /1\.5/.test(legacyBlob))
  ) {
    warnings.push(
      "Unsupported legacy PT standard detected (for example 1.5-mile run or abdominal circumference). This assessment is unsupported; no replacement standard is assumed."
    );
  }

  if (
    strength_option === null &&
    clean(src.strength_option || src.strengthEvent)
  ) {
    warnings.push(
      "Unrecognized strength option; strength score may be incomplete."
    );
  }

  if (
    core_option === null &&
    clean(src.core_option || src.enduranceEvent)
  ) {
    warnings.push(
      "Unrecognized core option; core score may be incomplete."
    );
  }

  if (
    cardio_option === null &&
    clean(src.cardio_option || src.cardioEvent)
  ) {
    warnings.push(
      "Unrecognized cardio option; cardio score may be incomplete."
    );
  }

  const validationErrors = [
    ...(Array.isArray(src._validation_errors) ? src._validation_errors : [])
  ];

  if (LEGACY_OPTION_RE.test(legacyBlob)) {
    validationErrors.push("Historical PT standards are not supported.");
  }

  if (
    [
      src.core_exempt,
      src.coreExempt,
      src.strength_exempt,
      src.strengthExempt,
      src.body_exempt,
      src.body_composition_exempt,
      src.bodyCompositionExempt,
      cardio_exempt
    ].some(v => toBoolean(v) === true)
  ) {
    validationErrors.push(
      "Exemption-adjusted composite scoring is not supported."
    );
  }

  const assessmentDate = clean(
    firstDefined(src.assessment_date, src.assessmentDate)
  );

  const dateValid =
    /^2026-\d{2}-\d{2}$/.test(assessmentDate) &&
    Number.isFinite(Date.parse(assessmentDate)) &&
    new Date(assessmentDate).toISOString().slice(0, 10) === assessmentDate;

  if (
    assessmentDate &&
    (!dateValid || assessmentDate < "2026-03-01")
  ) {
    validationErrors.push(
      "Only the 2026 PFRA chart effective 1 March 2026 is supported; no historical or future standard is selected."
    );
  }

  if (
    src.effective_date &&
    src.effective_date !== PT_SOURCE.scoring_effective_date
  ) {
    validationErrors.push("Requested scoring effective date is unsupported.");
  }

  if (
    (Number.isFinite(altitude_feet) && altitude_feet >= 5250) ||
    altitude_group
  ) {
    validationErrors.push(
      "Altitude-adjusted composite scoring is not supported."
    );
  }

  if (
    firstDefined(src.age, src.Age) !== null &&
    (!Number.isInteger(age) || age < 17)
  ) {
    validationErrors.push("Age must be a whole number of at least 17.");
  }

  if (
    Number.isInteger(age) &&
    age_band &&
    ageBandFromAge(age) !== age_band
  ) {
    validationErrors.push("Age and age band conflict.");
  }

  if (Number.isFinite(altitude_feet) && altitude_feet < 0) {
    validationErrors.push("Altitude cannot be negative.");
  }

  if (
    firstDefined(src.run_remaining_seconds, src.runRemainingSeconds) !== null &&
    (
      !Number.isInteger(run_remaining_seconds) ||
      run_remaining_seconds < 0 ||
      run_remaining_seconds >= 60
    )
  ) {
    validationErrors.push(
      "Run remaining seconds must be a whole number from 0 through 59."
    );
  }

  return stripEmpty({
    assessment_date: assessmentDate,
    schema_version: clean(src.schema_version) || "pt-input-v1",
    source_version:
      clean(src.source_version || src.version) || PT_CALCULATOR_VERSION,
    effective_date:
      clean(src.effective_date) || PT_SOURCE.scoring_effective_date,
    sex,
    age,
    age_band,
    height_inches,
    waist_inches,
    waist_measurements,
    strength_option,
    strength_reps,
    core_option,
    core_reps,
    plank_seconds,
    cardio_option,
    run_seconds: resolvedRunSeconds,
    run_minutes,
    run_remaining_seconds,
    hamr_shuttles,
    walk_authorized,
    walk_seconds,
    cardio_exempt,
    altitude_feet,
    altitude_group,
    displayed_component_scores,
    displayed_total_score,
    displayed_rating,
    _validation_errors: uniqueArray(validationErrors),
    _warnings: uniqueArray([
      ...(Array.isArray(src._warnings) ? src._warnings : []),
      ...warnings
    ])
  });
}

// ============================================================
// 5. SCORING EXPORTS
// ============================================================

export function calculateWhtr(input = {}) {
  const normalized = normalizePtCalculatorInput(input);
  const warnings = [...(normalized._warnings || [])];
  const height = toNumber(normalized.height_inches);
  const waist = toNumber(normalized.waist_inches);

  if (
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(waist) ||
    waist <= 0
  ) {
    return {
      ok: false,
      partial: true,
      whtr: null,
      whtr_risk: null,
      points: null,
      passed: null,
      warnings: uniqueArray([
        ...warnings,
        "Height and waist in inches are required to calculate WHtR."
      ])
    };
  }

  const raw = waist / height;
  const whtr = roundWHtR(raw);
  const points = getWHtRScore(raw);
  const passed = bodyCompositionPassed(raw);

  return {
    ok: Number.isFinite(points),
    partial: !Number.isFinite(points),
    whtr,
    whtr_risk: whtrRisk(whtr),
    points,
    passed,
    height_inches: height,
    waist_inches: waist,
    warnings
  };
}

function performanceErrors(input, component = null) {
  const errors = [...(input._validation_errors || [])];

  const whole = (value, min = 0) =>
    Number.isInteger(value) && value >= min;

  if (
    (!component || component === "body_composition") &&
    (
      !Number.isFinite(input.height_inches) ||
      input.height_inches <= 0 ||
      !Number.isFinite(input.waist_inches) ||
      input.waist_inches <= 0
    )
  ) {
    errors.push(
      "Positive height and waist measurements in inches are required."
    );
  }

  if (
    (!component || component === "strength") &&
    (
      !getStrengthTable(input.strength_option) ||
      !whole(input.strength_reps)
    )
  ) {
    errors.push(
      "Select a supported strength event and enter a nonnegative whole repetition count."
    );
  }

  if (
    (!component || component === "core") &&
    (
      !getCoreTable(input.core_option) ||
      !whole(
        input.core_option === "forearm_plank"
          ? input.plank_seconds
          : input.core_reps
      )
    )
  ) {
    errors.push(
      "Select a supported core event and enter whole repetitions or whole plank seconds."
    );
  }

  if (!component || component === "cardio") {
    const value =
      input.cardio_option === "hamr"
        ? input.hamr_shuttles
        : input.cardio_option === "two_mile_run"
          ? input.run_seconds
          : input.cardio_option === "two_kilometer_walk"
            ? input.walk_seconds
            : null;

    if (!whole(value, input.cardio_option === "hamr" ? 0 : 1)) {
      errors.push(
        "Select a supported cardio event and enter whole shuttles or a positive time in whole seconds or minutes:seconds."
      );
    }
  }

  return uniqueArray(errors);
}

export function calculatePtComponentScore(input = {}) {
  const normalized = normalizePtCalculatorInput(input);

  const requested = lower(
    firstDefined(input?.component, input?.component_name, input?.type)
  );

  const component = ["body", "whtr"].includes(requested)
    ? "body_composition"
    : requested === "endurance"
      ? "core"
      : requested;

  const warnings = [...(normalized._warnings || [])];

  const invalid = messages => ({
    ok: false,
    partial: true,
    component: component || null,
    points: null,
    passed: null,
    warnings: uniqueArray([...warnings, ...messages])
  });

  if (
    !["body_composition", "strength", "core", "cardio"].includes(component)
  ) {
    return invalid([
      "Unknown component. Use body_composition, strength, core, or cardio."
    ]);
  }

  const errors = performanceErrors(normalized, component);
  if (errors.length) return invalid(errors);

  if (component === "body_composition") {
    const details = calculateWhtr(normalized);

    return {
      ok: details.ok,
      partial: !details.ok,
      component,
      points: details.points,
      passed: null,
      details,
      warnings: uniqueArray([...warnings, ...details.warnings])
    };
  }

  const key = pairKeyFromSexAge(normalized.sex, normalized.age_band);

  if (!key) {
    return invalid([
      "Sex and age band are required to score a PT component."
    ]);
  }

  let option;
  let value;
  let points;
  let passed;

  if (component === "strength") {
    option = normalized.strength_option;
    value = normalized.strength_reps;
    points = scoreFromTable(getStrengthTable(option), key, value, "higher");
    passed = points === null ? null : points >= MIN_PASS.strength;
  } else if (component === "core") {
    option = normalized.core_option;
    value = option === "forearm_plank"
      ? normalized.plank_seconds
      : normalized.core_reps;

    points = scoreFromTable(getCoreTable(option), key, value, "higher");
    passed = points === null ? null : points >= MIN_PASS.core;
  } else {
    option = normalized.cardio_option;

    value = option === "hamr"
      ? normalized.hamr_shuttles
      : option === "two_mile_run"
        ? normalized.run_seconds
        : normalized.walk_seconds;

    points = option === "hamr"
      ? scoreHigherBetter(value, TABLES.hamr, key)
      : option === "two_mile_run"
        ? scoreTimeLowerBetter(value, TABLES.run, key)
        : scoreWalk(value, key);

    passed = option === "two_kilometer_walk"
      ? walkPassed(value, key)
      : points === null
        ? null
        : points >= MIN_PASS.cardio;

    if (
      option === "two_kilometer_walk" &&
      normalized.walk_authorized !== true
    ) {
      warnings.push(
        "2 km Walk is medical-authorization only. Confirm AF Form 469 authorization; this is a time-standard comparison only."
      );
    }
  }

  if (points === null) {
    return invalid(["Scoring table lookup failed; no score is inferred."]);
  }

  return {
    ok: true,
    partial: false,
    component,
    option,
    value,
    points,
    passed,
    warnings: uniqueArray(warnings)
  };
}

export function calculatePfraScore(input = {}) {
  const normalized = normalizePtCalculatorInput(input);
  const key = pairKeyFromSexAge(normalized.sex, normalized.age_band);
  const errors = performanceErrors(normalized);

  if (!key) {
    errors.push(
      "Sex and age/age_band are required to calculate a PFRA score."
    );
  }

  const warnings = [...(normalized._warnings || [])];

  const incomplete = messages => ({
    ok: false,
    partial: true,
    version: PT_CALCULATOR_VERSION,
    total_score: null,
    rating: null,
    overall_pass: null,
    component_minimums_met: null,

    component_scores: {
      body_composition: null,
      strength: null,
      core: null,
      cardio: null
    },

    component_pass: {
      body_composition: null,
      strength: null,
      core: null,
      cardio: null
    },

    points_to_satisfactory: null,
    points_to_excellent: null,
    fail_reasons: [],
    improvement_hints: [],
    comparison: null,
    warnings: uniqueArray([...warnings, ...messages]),
    normalized_input: normalized
  });

  if (errors.length) return incomplete(errors);

  const body = calculateWhtr(normalized);

  const strength = calculatePtComponentScore({
    ...normalized,
    component: "strength"
  });

  const core = calculatePtComponentScore({
    ...normalized,
    component: "core"
  });

  const cardio = calculatePtComponentScore({
    ...normalized,
    component: "cardio"
  });

  if (![body, strength, core, cardio].every(result => result.ok)) {
    return incomplete(
      [body, strength, core, cardio].flatMap(result => result.warnings || [])
    );
  }

  warnings.push(
    ...body.warnings,
    ...strength.warnings,
    ...core.warnings,
    ...cardio.warnings
  );

  const isWalk = normalized.cardio_option === "two_kilometer_walk";
  const walkResult = isWalk ? cardio.passed : null;

  const minimums = isWalk
    ? null
    : componentMinimumsMet({
        strengthPassed: strength.passed,
        corePassed: core.passed,
        cardioPassed: cardio.passed
      });

  const total = isWalk
    ? null
    : clamp(
        body.points + strength.points + core.points + cardio.points,
        0,
        SCORE_CAPS.total
      );

  const rating = isWalk
    ? (walkResult ? "Walk-Pass" : "Walk-Fail")
    : scoreCategory(total, minimums);

  const failReasons = [];

  if (!strength.passed) {
    failReasons.push(
      `Strength below minimum (${strength.points.toFixed(1)} < ${MIN_PASS.strength}).`
    );
  }

  if (!core.passed) {
    failReasons.push(
      `Core below minimum (${core.points.toFixed(1)} < ${MIN_PASS.core}).`
    );
  }

  if (isWalk) {
    if (walkResult === false) {
      failReasons.push("Walk time exceeds the age/sex maximum.");
    }

    warnings.push(
      "Medical walk awards no cardio points. An adjusted composite and overall passing result are not estimated; confirm the official result in myFitness."
    );
  } else {
    if (!cardio.passed) {
      failReasons.push(
        `Cardio below minimum (${cardio.points.toFixed(1)} < ${MIN_PASS.cardio}).`
      );
    }

    if (minimums && total < 75) {
      failReasons.push(
        `Composite score ${total.toFixed(1)} is below the Satisfactory threshold of 75.`
      );
    }
  }

  const overallPass = isWalk
    ? (failReasons.length ? false : null)
    : minimums && total >= 75;

  const improvementHints = [];

  for (const item of [
    {
      component: "strength",
      rows: getStrengthTable(normalized.strength_option).rows,
      value: strength.value,
      points: strength.points,
      cap: 15,
      direction: "higher",
      unit: "reps"
    },
    {
      component: "core",
      rows: getCoreTable(normalized.core_option).rows,
      value: core.value,
      points: core.points,
      cap: 15,
      direction: "higher",
      unit: normalized.core_option === "forearm_plank" ? "seconds" : "reps"
    },
    {
      component: "cardio",
      rows: isWalk
        ? null
        : normalized.cardio_option === "hamr"
          ? TABLES.hamr
          : TABLES.run,
      value: cardio.value,
      points: cardio.points,
      cap: 50,
      direction: normalized.cardio_option === "hamr" ? "higher" : "lower",
      unit: normalized.cardio_option === "hamr" ? "shuttles" : "seconds"
    }
  ]) {
    if (!item.rows || item.points >= item.cap) continue;

    const next = pointsToNextRow(
      item.rows,
      key,
      item.value,
      item.direction,
      item.points
    );

    if (next) {
      improvementHints.push({
        component: item.component,
        ...next,
        unit: item.unit
      });
    }
  }

  const browserTotal = toNumber(normalized.displayed_total_score);

  const comparison = !isWalk && Number.isFinite(browserTotal)
    ? {
        browser_total: browserTotal,
        server_total: total,
        matches: Math.abs(browserTotal - total) < 0.05
      }
    : null;

  if (comparison && !comparison.matches) {
    warnings.push(
      `Browser/server score discrepancy: browser total ${browserTotal} vs server total ${total}. Review the entered values and deployed calculator versions.`
    );
  }

  return {
    ok: true,
    partial: isWalk,
    version: PT_CALCULATOR_VERSION,

    profile: {
      sex: normalized.sex,
      age: normalized.age ?? null,
      age_band: normalized.age_band,
      pair_key: key
    },

    selections: {
      strength: normalized.strength_option,
      core: normalized.core_option,
      cardio: normalized.cardio_option
    },

    measurements: {
      height_inches: normalized.height_inches,
      waist_inches: normalized.waist_inches,
      whtr: body.whtr,
      whtr_risk: body.whtr_risk
    },

    component_scores: {
      body_composition: body.points,
      strength: strength.points,
      core: core.points,
      cardio: cardio.points
    },

    component_pass: {
      body_composition: null,
      strength: strength.passed,
      core: core.passed,
      cardio: cardio.passed
    },

    total_score: total,
    rating,
    overall_pass: overallPass,
    component_minimums_met: minimums,

    cardio_mode: isWalk
      ? "walk"
      : normalized.cardio_option === "hamr"
        ? "hamr"
        : "run",

    walk_passed: walkResult,
    adjusted_composite_available: false,

    fail_reasons: failReasons,
    improvement_hints: improvementHints,

    points_to_satisfactory: isWalk ? null : Math.max(0, 75 - total),
    points_to_excellent: isWalk ? null : Math.max(0, 90 - total),

    comparison,
    warnings: uniqueArray(warnings),
    normalized_input: normalized
  };
}

// ============================================================
// 6. ANALYSIS + TRUTH PACKET
// ============================================================

export function buildGuidance(intent, scorePacket) {
  const facts = [];
  const risks = [...(scorePacket?.warnings || [])];
  const next_steps = [];

  const disclaimers = [
    "This is an educational planning estimate based on the 2026 PFRA scoring charts (AFMAN 36-2905, 24 March 2026).",
    "Official fitness assessment scoring is determined by your unit and the governing Air Force instruction.",
    "This module does not provide medical advice."
  ];

  if (!scorePacket?.ok) {
    return {
      bluf:
        "I can explain USAF PFRA/PT scoring, but I need complete age, sex, and performance inputs to calculate a score.",

      facts: [
        "2026 PFRA components are body composition (WHtR), strength, core, and cardio.",
        "For a standard assessment, physical-component minimums must be met and the composite must reach 75 for Satisfactory. Body composition has no independent minimum."
      ],

      risks: scorePacket?.warnings || [],

      next_steps: [
        "Provide sex, age band, height, waist, and each selected modality performance.",
        "Or calculate on the PT Calculator page so Ask Amy can read the current result."
      ],

      disclaimers
    };
  }

  if (scorePacket.cardio_mode === "walk") {
    const cs = scorePacket.component_scores || {};

    return {
      bluf:
        `Walk result: ${scorePacket.walk_passed ? "PASS" : "FAIL"}. No adjusted composite score is estimated.`,

      facts: [
        "The medical-only 2 km Walk awards no cardio points and cannot support an Excellent rating (AFMAN 3.7.3).",
        `Assessed points — Body composition: ${cs.body_composition}, Strength: ${cs.strength}, Core: ${cs.core}; Cardio: 0.`,
        "Passing the walk is not a complete PFRA passing determination. Confirm the official adjusted composite in myFitness."
      ],

      risks: uniqueArray([
        ...(scorePacket.fail_reasons || []),
        ...(scorePacket.warnings || [])
      ]),

      next_steps: [
        "Confirm AF Form 469 authorization and your official adjusted result with your unit."
      ],

      disclaimers
    };
  }

  if (!Number.isFinite(scorePacket.total_score)) {
    return {
      bluf: "A complete composite score is unavailable.",
      facts: [],
      risks: scorePacket.warnings || [],
      next_steps: ["Review the calculator inputs."],
      disclaimers
    };
  }

  const total = scorePacket.total_score;
  const rating = scorePacket.rating;
  const cs = scorePacket.component_scores || {};

  facts.push(
    `Total PFRA score: ${Number(total).toFixed(1)} (${rating}).`
  );

  facts.push(
    `Component scores — Body composition: ${Number(cs.body_composition).toFixed(1)}, Strength: ${Number(cs.strength).toFixed(1)}, Core: ${Number(cs.core).toFixed(1)}, Cardio: ${Number(cs.cardio).toFixed(1)}.`
  );

  facts.push(
    `Component minimums met: ${scorePacket.component_minimums_met ? "yes" : "no"}. Overall pass: ${scorePacket.overall_pass ? "yes" : "no"}.`
  );

  if (Number.isFinite(scorePacket.measurements?.whtr)) {
    facts.push(
      `WHtR: ${Number(scorePacket.measurements.whtr).toFixed(2)} (${scorePacket.measurements.whtr_risk || "n/a"}).`
    );
  }

  if (Array.isArray(scorePacket.fail_reasons)) {
    for (const reason of scorePacket.fail_reasons) {
      risks.push(reason);
    }
  }

  if (
    intent === "excellent_target" ||
    scorePacket.points_to_excellent > 0
  ) {
    facts.push(
      `Composite points to 90.0: ${Number(scorePacket.points_to_excellent).toFixed(1)}; all required physical-component minimums must also be met.`
    );
  }

  if (
    !scorePacket.overall_pass &&
    scorePacket.points_to_satisfactory > 0
  ) {
    facts.push(
      `Points to Satisfactory (75.0): ${Number(scorePacket.points_to_satisfactory).toFixed(1)} (also requires all component minimums).`
    );
  }

  if (Array.isArray(scorePacket.improvement_hints)) {
    for (const hint of scorePacket.improvement_hints.slice(0, 3)) {
      if (!hint) continue;

      const delta =
        Number.isFinite(hint.delta) && hint.delta > 0
          ? ` (about ${hint.delta} ${hint.unit} away)`
          : "";

      next_steps.push(
        `To reach the next ${hint.component} point row (${hint.target_points} pts), target ${hint.required_value} ${hint.unit}${delta}.`
      );
    }
  }

  if (intent === "walk_guidance") {
    facts.push(
      "The 2 km Walk is medical-only, pass/fail, and awards no cardio points; adjusted composite scoring is not estimated here."
    );

    next_steps.push(
      "Confirm medical authorization before using the 2 km Walk as an official cardio event."
    );
  }

  if (!next_steps.length) {
    if (scorePacket.overall_pass && rating === "Excellent") {
      next_steps.push(
        "Maintain current performance across all components before the next assessment window."
      );
    } else if (scorePacket.overall_pass) {
      next_steps.push(
        "Review the next published scoring thresholds for components below their maximum."
      );
    } else {
      next_steps.push(
        "Prioritize any failed component minimum first; composite points alone do not create a pass."
      );
    }
  }

  let bluf =
    `Your calculated 2026 PFRA score is ${Number(total).toFixed(1)} (${rating}).`;

  if (
    intent === "failure_explanation" &&
    scorePacket.fail_reasons?.length
  ) {
    bluf = `Unsatisfactory because: ${scorePacket.fail_reasons[0]}`;
  } else if (intent === "pass_fail") {
    bluf = scorePacket.overall_pass
      ? `Yes — this PFRA result meets component minimums with a composite of ${Number(total).toFixed(1)} (${rating}).`
      : `No — this PFRA result does not pass. ${scorePacket.fail_reasons?.[0] || "Component minimums or the 75.0 composite threshold were not met."}`;
  } else if (intent === "whtr_explanation") {
    bluf = Number.isFinite(scorePacket.measurements?.whtr)
      ? `Your WHtR is ${Number(scorePacket.measurements.whtr).toFixed(2)} (${scorePacket.measurements.whtr_risk}), scoring ${Number(cs.body_composition).toFixed(1)} body-composition points.`
      : "WHtR needs height and waist measurements in inches.";
  } else if (
    intent === "excellent_target" &&
    scorePacket.points_to_excellent === 0 &&
    !scorePacket.component_minimums_met
  ) {
    bluf =
      "The composite reaches 90.0, but Excellent also requires every physical-component minimum. Correct the failed minimums first.";
  } else if (intent === "excellent_target") {
    bluf =
      scorePacket.points_to_excellent <= 0 &&
      scorePacket.component_minimums_met
        ? "This result already meets the Excellent threshold (90.0+) with component minimums met."
        : `You need ${Number(scorePacket.points_to_excellent).toFixed(1)} more composite points to reach Excellent, while keeping every component at or above its minimum.`;
  }

  return {
    bluf,
    facts: uniqueArray(facts),
    risks: uniqueArray(risks),
    next_steps: uniqueArray(next_steps),
    disclaimers
  };
}

export function analyzePtCalculatorQuestion(message = "", input = {}) {
  const normalized = normalizePtCalculatorInput(input);

  const hasPtData = Boolean(
    normalized.sex ||
    normalized.age_band ||
    normalized.height_inches ||
    normalized.strength_option ||
    normalized.cardio_option
  );

  const intent =
    detectPtCalculatorIntent(message, { hasPtData }) ||
    "score_explanation";

  const score = calculatePfraScore(normalized);
  const guidance = buildGuidance(intent, score);

  // Preserve nulls inside score; they mean unavailable, not zero.
  return {
    ok: score.ok,
    partial: score.partial,
    version: PT_CALCULATOR_VERSION,
    intent,
    reply: guidance.bluf,
    score,
    guidance,

    warnings: uniqueArray([
      ...(normalized._warnings || []),
      ...(score.warnings || [])
    ]),

    source: "TheWing pt-calculator.js"
  };
}

export function buildPtCalculatorTruthPacket({
  message = "",
  profile = {},
  pt = {},
  scenario = {},
  metadata = {}
} = {}) {
  const mergedInput = {
    ...safeObject(profile),
    ...safeObject(scenario),
    ...safeObject(pt),

    sex: firstDefined(
      pt.sex,
      pt.gender,
      scenario.sex,
      scenario.gender,
      profile.sex,
      profile.gender
    ),

    age: firstDefined(
      pt.age,
      scenario.age,
      profile.age
    ),

    age_band: firstDefined(
      pt.age_band,
      pt.ageBand,
      pt.ageGroup,
      scenario.age_band,
      scenario.ageBand,
      profile.age_band,
      profile.ageBand
    )
  };

  const normalized = normalizePtCalculatorInput(mergedInput);

  const hasPtData = Boolean(
    normalized.sex ||
    normalized.age_band ||
    Number.isFinite(normalized.height_inches) ||
    normalized.strength_option ||
    normalized.cardio_option ||
    Number.isFinite(normalized.displayed_total_score)
  );

  const intent =
    detectPtCalculatorIntent(message, {
      hasPtData,
      ptContext: clean(
        metadata.page?.path || metadata.product || ""
      ).includes("pt")
    }) || (hasPtData ? "score_explanation" : "score_explanation");

  const score = calculatePfraScore(normalized);
  const guidance = buildGuidance(intent, score);
  const comparison = score.comparison || null;

  const warnings = uniqueArray([
    ...(normalized._warnings || []),
    ...(score.warnings || []),
    ...(
      Array.isArray(score.fail_reasons) &&
      intent === "failure_explanation"
        ? score.fail_reasons
        : []
    )
  ]);

  return {
    ...stripEmpty({
      ok: score.ok !== false,
      version: PT_CALCULATOR_VERSION,
      intent,
      source: PT_SOURCE,

      profile: score.profile || {
        sex: normalized.sex,
        age: normalized.age,
        age_band: normalized.age_band
      },

      selections: score.selections || {
        strength: normalized.strength_option,
        core: normalized.core_option,
        cardio: normalized.cardio_option
      },

      measurements: score.measurements || {
        height_inches: normalized.height_inches,
        waist_inches: normalized.waist_inches
      },

      component_scores: score.component_scores || {},
      total_score: score.total_score,
      rating: score.rating,
      overall_pass: score.overall_pass,
      component_minimums_met: score.component_minimums_met,
      comparison,

      guidance: {
        bluf: guidance.bluf,
        facts: guidance.facts,
        risks: guidance.risks,
        next_steps: guidance.next_steps,
        disclaimers: guidance.disclaimers
      },

      module: "pt_calculator",
      _source: "TheWing pt-calculator.js"
    }),

    // Restore fields where null and empty arrays carry meaning.
    partial: score.partial === true,
    total_score: score.total_score ?? null,
    rating: score.rating ?? null,
    overall_pass: score.overall_pass ?? null,
    component_minimums_met: score.component_minimums_met ?? null,
    component_pass: score.component_pass || {},
    cardio_mode: score.cardio_mode || null,
    walk_passed: score.walk_passed ?? null,
    fail_reasons: score.fail_reasons || [],
    improvement_hints: score.improvement_hints || [],
    points_to_excellent: score.points_to_excellent ?? null,
    points_to_satisfactory: score.points_to_satisfactory ?? null,
    adjusted_composite_available: score.adjusted_composite_available ?? false,
    comparison,
    component_scores: score.component_scores || {},
    warnings
  };
}

export {
  PT_SCORING_CORE_VERSION,
  PT_SOURCE,
  ORDER,
  SCORE_CAPS,
  MIN_PASS,
  TABLES
};

export default Object.freeze({
  PT_CALCULATOR_VERSION,
  PT_CALCULATOR_RULES,
  PT_COMPONENT_MINIMUMS,
  PT_AGE_BANDS,
  detectPtCalculatorIntent,
  normalizePtCalculatorInput,
  calculateWhtr,
  calculatePtComponentScore,
  calculatePfraScore,
  analyzePtCalculatorQuestion,
  buildPtCalculatorTruthPacket
});
