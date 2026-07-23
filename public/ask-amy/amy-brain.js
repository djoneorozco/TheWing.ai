// netlify/functions/_share/amy-brain.js
// ============================================================
// TheWing.ai • Ask Amy Deterministic Knowledge Router
// v1.0.0 • ES MODULE
//
// PURPOSE
// - Route Ask Amy questions to registered deterministic modules
// - Assemble a unified truth packet for the agent layer
// - Never call OpenAI
// - Never calculate compensation
// - Never access Supabase, localStorage, DOM, or browser globals
//
// PRINCIPLE
// TheWing calculates.
// Knowledge modules produce truth packets.
// amy-brain.js routes and assembles.
// Amy explains.
// ============================================================

import {
  VA_LOANS_VERSION,
  detectVaLoanIntent,
  buildVaLoanTruthPacket
} from "./va-loans.js";

// ============================================================
// //#1 VERSION
// ============================================================

export const AMY_BRAIN_VERSION = "amy-brain-v1.0.0";

// ============================================================
// //#2 INTERNAL HELPERS
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

function pickFirstObject(...values) {
  for (const value of values) {
    if (isPlainObject(value) && Object.keys(value).length) {
      return { ...value };
    }
  }
  return {};
}

function hasAnyValue(obj, keys = []) {
  if (!isPlainObject(obj)) return false;
  for (const key of keys) {
    const value = obj[key];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    return true;
  }
  return false;
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

function money(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "string") {
      const cleaned = value.replace(/[$,%\s,]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
      continue;
    }
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
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

const COMPENSATION_VALUE_KEYS = [
  "basePay",
  "base_pay",
  "bas",
  "bah",
  "total",
  "totalMonthly",
  "total_monthly",
  "retirementPay",
  "retirement_pay",
  "disabilityPay",
  "disability_pay",
  "va_disability_pay",
  "otherPay",
  "other_pay",
  "special_pay",
  "spouse_income",
  "additional_income",
  "compensationAccuracy",
  "retirementBaseMethod",
  "headline"
];

function hasRecognizedCompensationFields(obj) {
  return hasAnyValue(obj, COMPENSATION_VALUE_KEYS);
}

const COMPENSATION_MESSAGE_RE =
  /\b(pay|base pay|basic pay|bas|bah|compensation|monthly income|military income|retired pay|retirement pay|va disability pay|total monthly compensation|what do i make|how much do i make|how much (?:do|will) i (?:make|earn|get))\b/i;

const VA_LOAN_EXPLICIT_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed(?:\s+loan)?|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|no pmi|va appraisal|seller concessions?|va closing costs)\b/i;

const VA_HOME_FINANCE_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed|home loan|mortgage|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|0 down|no down|no pmi|pmi|appraisal|seller concession|closing costs?|purchase price|home(?:\s+buying|\s+purchase)?|house|buy(?:ing)?)\b/i;

const VA_DISABILITY_ONLY_RE =
  /\bva\b.{0,24}\bdisability\b|\bdisability\b.{0,24}\b(va|compensation|pay)\b/i;

// ============================================================
// //#3 INPUT NORMALIZATION
// ============================================================

function normalizeAmyBrainInput(rawInput = {}) {
  const input = isPlainObject(rawInput) ? rawInput : {};
  const basicbrain = safeObject(input.basicbrain);
  const session = safeObject(input.session);
  const metadata = safeObject(input.metadata);

  const profile = pickFirstObject(
    input.profile,
    basicbrain.profile,
    basicbrain.bridge,
    session.profile
  );

  const bridge = safeObject(basicbrain.bridge);
  const bridgeCompensation = hasRecognizedCompensationFields(bridge)
    ? bridge
    : {};

  const compensation = pickFirstObject(
    input.compensation,
    basicbrain.compensation,
    basicbrain.calculated_comp,
    session.compensation,
    bridgeCompensation
  );

  return {
    message: clean(input.message),
    profile,
    scenario: safeObject(input.scenario),
    compensation,
    mortgage: safeObject(input.mortgage),
    affordability: safeObject(input.affordability),
    selectedBase: safeObject(input.selectedBase),
    basicbrain,
    session,
    metadata
  };
}

function normalizeCompensationPacket(raw = {}) {
  const src = safeObject(raw);
  const monthly = isPlainObject(src.monthly) ? src.monthly : {};

  const packet = {
    ok: true,
    module: "compensation",
    source: "amy-brain supplied compensation context",
    calculated: false,

    // Active duty / common
    basePay: firstNumber(src.basePay, src.base_pay, monthly.basePay, monthly.basicPay),
    base_pay: firstNumber(src.base_pay, src.basePay, monthly.basePay, monthly.basicPay),
    bas: firstNumber(src.bas, src.BAS, monthly.bas),
    bah: firstNumber(src.bah, src.BAH, src.bahMonthly, monthly.bah),
    total: firstNumber(src.total, src.totalMonthly, src.total_monthly, monthly.total),
    totalMonthly: firstNumber(
      src.totalMonthly,
      src.total_monthly,
      src.total,
      monthly.total
    ),
    total_monthly: firstNumber(
      src.total_monthly,
      src.totalMonthly,
      src.total,
      monthly.total
    ),

    // Veteran / retirement
    retirementPay: firstNumber(
      src.retirementPay,
      src.retirement_pay,
      monthly.retirement
    ),
    retirement_pay: firstNumber(
      src.retirement_pay,
      src.retirementPay,
      monthly.retirement
    ),
    disabilityPay: firstNumber(
      src.disabilityPay,
      src.disability_pay,
      src.va_disability_pay,
      monthly.vaDisability
    ),
    disability_pay: firstNumber(
      src.disability_pay,
      src.disabilityPay,
      src.va_disability_pay,
      monthly.vaDisability
    ),
    otherPay: firstNumber(src.otherPay, src.other_pay, src.special_pay),
    other_pay: firstNumber(src.other_pay, src.otherPay, src.special_pay),
    compensationAccuracy: src.compensationAccuracy ?? src.accuracy ?? null,
    retirementBaseMethod: src.retirementBaseMethod ?? src.retirement_base_method ?? null,
    headline: clean(src.headline) || null
  };

  return stripEmpty(packet);
}

// ============================================================
// //#4 MODULE DETECTORS + BUILDERS
// ============================================================

function detectCompensationNeed(input) {
  const normalized = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;

  const hasCompensation = hasRecognizedCompensationFields(normalized.compensation);
  if (hasCompensation) {
    score += 60;
    reasons.push("Calculated compensation context is present");
  }

  const message = lower(normalized.message);
  if (message && COMPENSATION_MESSAGE_RE.test(message)) {
    score += 40;
    reasons.push("Message asks about monthly income or military compensation");
  }

  const matched = score > 0;
  return {
    id: "compensation",
    matched,
    score: matched ? Math.max(score, 1) : 0,
    reasons: uniqueArray(reasons)
  };
}

function buildCompensationTruth(input) {
  const normalized = normalizeAmyBrainInput(input);
  const requested =
    Boolean(clean(normalized.message)) &&
    COMPENSATION_MESSAGE_RE.test(lower(normalized.message));
  const hasCompensation = hasRecognizedCompensationFields(normalized.compensation);

  if (hasCompensation) {
    return normalizeCompensationPacket(normalized.compensation);
  }

  if (requested) {
    return {
      ok: false,
      partial: true,
      module: "compensation",
      source: "amy-brain supplied compensation context",
      calculated: false,
      warning:
        "Compensation was requested, but no calculated compensation context was available."
    };
  }

  return {
    ok: false,
    partial: true,
    module: "compensation",
    source: "amy-brain supplied compensation context",
    calculated: false,
    warning:
      "Compensation was requested, but no calculated compensation context was available."
  };
}

function detectVaLoanNeed(input) {
  const normalized = normalizeAmyBrainInput(input);
  const message = clean(normalized.message);
  const t = lower(message);
  const reasons = [];
  let score = 0;

  if (!t) {
    return {
      id: "va_loans",
      matched: false,
      score: 0,
      reasons: []
    };
  }

  // "VA disability compensation" alone is compensation, not a VA home-loan question.
  const disabilityOnly =
    VA_DISABILITY_ONLY_RE.test(t) &&
    !VA_LOAN_EXPLICIT_RE.test(t) &&
    !/\b(mortgage|home loan|house|purchase|closing|appraisal|entitlement|funding fee|coe|zero down|no pmi)\b/i.test(
      t
    );

  if (disabilityOnly) {
    return {
      id: "va_loans",
      matched: false,
      score: 0,
      reasons: []
    };
  }

  const explicit = VA_LOAN_EXPLICIT_RE.test(t);
  const homeFinance = VA_HOME_FINANCE_RE.test(t);
  let intent = null;

  try {
    intent = detectVaLoanIntent(message);
  } catch (_) {
    intent = null;
  }

  if (explicit) {
    score += 70;
    reasons.push("Message contains VA Loan language");
  }

  if (homeFinance && intent) {
    score += explicit ? 10 : 50;
    reasons.push(`VA Loan intent detected: ${clean(intent) || "overview"}`);
  }

  // Require either explicit VA-loan terms or home-finance + intent signal.
  const matched = explicit || (homeFinance && Boolean(intent) && !disabilityOnly);

  return {
    id: "va_loans",
    matched,
    score: matched ? Math.max(score, 1) : 0,
    reasons: matched ? uniqueArray(reasons) : []
  };
}

function buildVaLoansTruth(input) {
  const normalized = normalizeAmyBrainInput(input);
  return buildVaLoanTruthPacket({
    message: normalized.message,
    profile: normalized.profile,
    scenario: normalized.scenario,
    compensation: normalized.compensation,
    mortgage: normalized.mortgage,
    affordability: normalized.affordability
  });
}

// ============================================================
// //#5 MODULE REGISTRY
// ============================================================

const compensationModule = Object.freeze({
  id: "compensation",
  version: "context-only-v1",
  description:
    "Exposes supplied military compensation context without calculating pay.",
  priority: 100,
  detect(input) {
    return detectCompensationNeed(input);
  },
  build(input) {
    return buildCompensationTruth(input);
  }
});

const vaLoansModule = Object.freeze({
  id: "va_loans",
  version: VA_LOANS_VERSION,
  description:
    "Routes VA Loan education and scenario packets through va-loans.js.",
  priority: 80,
  detect(input) {
    return detectVaLoanNeed(input);
  },
  build(input) {
    return buildVaLoansTruth(input);
  }
});

export const AMY_BRAIN_MODULES = Object.freeze({
  compensation: compensationModule,
  va_loans: vaLoansModule
});

function listRegistryModules() {
  return Object.values(AMY_BRAIN_MODULES).slice().sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return clean(a.id).localeCompare(clean(b.id));
  });
}

// ============================================================
// //#6 DETECT / ROUTE / BUILD
// ============================================================

export function detectAmyKnowledgeNeeds(input = {}) {
  const matches = [];

  for (const module of listRegistryModules()) {
    let result;
    try {
      result = module.detect(input);
    } catch (_) {
      continue;
    }

    if (!result || typeof result !== "object") continue;
    if (!result.matched) continue;

    matches.push({
      id: clean(result.id) || module.id,
      matched: true,
      score: Number.isFinite(Number(result.score))
        ? Number(result.score)
        : Number(module.priority) || 0,
      reasons: uniqueArray(result.reasons)
    });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aPriority = Number(AMY_BRAIN_MODULES[a.id]?.priority) || 0;
    const bPriority = Number(AMY_BRAIN_MODULES[b.id]?.priority) || 0;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return clean(a.id).localeCompare(clean(b.id));
  });

  return matches;
}

export async function routeAmyKnowledge(input = {}) {
  const normalized = normalizeAmyBrainInput(input);
  const matches = detectAmyKnowledgeNeeds(normalized);
  const packets = {};
  const errors = [];
  const warnings = [];

  for (const match of matches) {
    const module = AMY_BRAIN_MODULES[match.id];
    if (!module || typeof module.build !== "function") {
      errors.push({
        module: match.id,
        message: "Registered knowledge module is unavailable."
      });
      continue;
    }

    try {
      const packet = await Promise.resolve(module.build(normalized));
      if (packet && typeof packet === "object") {
        packets[match.id] = packet;
        if (packet.warning) warnings.push(clean(packet.warning));
        if (Array.isArray(packet.warnings) && packet.warnings.length) {
          warnings.push(...packet.warnings.map((w) => clean(w)).filter(Boolean));
        }
      }
    } catch (err) {
      errors.push({
        module: match.id,
        message: clean(err?.message) || "Knowledge module failed."
      });
    }
  }

  if (!matches.length) {
    warnings.push("No deterministic knowledge module matched this request.");
  }

  return {
    ok: true,
    version: AMY_BRAIN_VERSION,
    message: normalized.message,
    matched_modules: matches.map((m) => m.id),
    matches,
    packets,
    errors,
    warnings: uniqueArray(warnings),
    source: "TheWing amy-brain.js"
  };
}

function pushCompensationFact(facts, label, value) {
  const display = money(value);
  if (!display) return;
  facts.push(`${label}: ${display} per month.`);
}

function combineTruthPackets(packets = {}, routeWarnings = []) {
  const bluf = [];
  const facts = [];
  const risks = [];
  const next_steps = [];
  const warnings = [];
  const disclaimers = [];

  const compensation = packets.compensation;
  if (isPlainObject(compensation)) {
    if (compensation.warning) warnings.push(clean(compensation.warning));

    if (compensation.ok !== false) {
      pushCompensationFact(
        facts,
        "Base pay",
        firstNumber(compensation.basePay, compensation.base_pay)
      );
      pushCompensationFact(facts, "BAS", compensation.bas);
      pushCompensationFact(facts, "BAH", compensation.bah);
      pushCompensationFact(
        facts,
        "Retirement pay",
        firstNumber(compensation.retirementPay, compensation.retirement_pay)
      );
      pushCompensationFact(
        facts,
        "VA disability pay",
        firstNumber(compensation.disabilityPay, compensation.disability_pay)
      );
      pushCompensationFact(
        facts,
        "Other pay",
        firstNumber(compensation.otherPay, compensation.other_pay)
      );
      pushCompensationFact(
        facts,
        "Total monthly compensation",
        firstNumber(
          compensation.total_monthly,
          compensation.totalMonthly,
          compensation.total
        )
      );

      if (clean(compensation.headline)) {
        facts.push(clean(compensation.headline));
      }
    }
  }

  const va = packets.va_loans;
  if (isPlainObject(va)) {
    if (clean(va.bluf)) bluf.push(clean(va.bluf));

    const guidance = isPlainObject(va.guidance) ? va.guidance : {};
    if (Array.isArray(guidance.key_points)) {
      for (const point of guidance.key_points) {
        if (clean(point)) facts.push(clean(point));
      }
    }
    if (Array.isArray(guidance.risks)) {
      for (const risk of guidance.risks) {
        if (clean(risk)) risks.push(clean(risk));
      }
    }
    if (Array.isArray(guidance.next_steps)) {
      for (const step of guidance.next_steps) {
        if (clean(step)) next_steps.push(clean(step));
      }
    }
    if (Array.isArray(guidance.disclaimers)) {
      for (const disclaimer of guidance.disclaimers) {
        if (clean(disclaimer)) disclaimers.push(clean(disclaimer));
      }
    }
    if (Array.isArray(va.warnings)) {
      for (const warning of va.warnings) {
        if (clean(warning)) warnings.push(clean(warning));
      }
    }
  }

  if (Array.isArray(routeWarnings)) {
    for (const warning of routeWarnings) {
      if (clean(warning)) warnings.push(clean(warning));
    }
  }

  return {
    bluf: uniqueArray(bluf),
    facts: uniqueArray(facts),
    risks: uniqueArray(risks),
    next_steps: uniqueArray(next_steps),
    warnings: uniqueArray(warnings),
    disclaimers: uniqueArray(disclaimers)
  };
}

export async function buildAmyTruthPacket(input = {}) {
  const normalized = normalizeAmyBrainInput(input);
  const routed = await routeAmyKnowledge(normalized);

  return {
    ok: true,
    version: AMY_BRAIN_VERSION,
    request: {
      message: normalized.message,
      mode: clean(normalized.profile.mode) || clean(normalized.metadata.mode) || null,
      has_profile: Object.keys(normalized.profile).length > 0,
      has_compensation: hasRecognizedCompensationFields(normalized.compensation),
      has_mortgage: Object.keys(normalized.mortgage).length > 0,
      has_affordability: Object.keys(normalized.affordability).length > 0
    },
    routing: {
      matched_modules: routed.matched_modules,
      matches: routed.matches
    },
    truth: routed.packets,
    combined: combineTruthPackets(routed.packets, routed.warnings),
    errors: Array.isArray(routed.errors) ? routed.errors : [],
    source: "TheWing amy-brain.js"
  };
}

// ============================================================
// //#7 DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  AMY_BRAIN_VERSION,
  AMY_BRAIN_MODULES,
  detectAmyKnowledgeNeeds,
  routeAmyKnowledge,
  buildAmyTruthPacket
});
