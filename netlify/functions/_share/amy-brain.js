// netlify/functions/_share/amy-brain.js
// ============================================================
// TheWing.ai • Ask Amy Deterministic Operating Core
// v2.0.0 • ES MODULE
//
// PRINCIPLE
// TheWing calculates.
// Amy Brain orchestrates.
// Amy explains.
//
// Amy Brain may:
// - Normalize server-provided context
// - Detect knowledge needs
// - Select and execute registered modules
// - Reuse valid page-generated deterministic results
// - Request engine recalculation for hypotheticals
// - Assemble one authoritative Truth Packet
//
// Amy Brain must NOT:
// - Call OpenAI
// - Access DOM / window / storage / Supabase
// - Contain mortgage, pay, VA disability, or BAH formulas
// - Duplicate engine business rules
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import {
  COMPENSATION_CONTEXT_VERSION,
  safeBuildCompensationContext
} from "./compensation-context.js";
import {
  ENGINE_VERSION as MORTGAGE_ENGINE_VERSION,
  safeCalculateMortgage
} from "./mortgage-engine.js";
import {
  ENGINE_VERSION as AFFORDABILITY_ENGINE_VERSION,
  safeCalculateAffordability
} from "./affordability-engine.js";
import {
  ENGINE_VERSION as DECISION_ENGINE_VERSION,
  safeEvaluateDecision
} from "./decision-rules.js";
import {
  VA_LOANS_VERSION,
  detectVaLoanIntent,
  buildVaLoanTruthPacket
} from "./va-loans.js";
import * as officialBah from "./official-bah.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// //#1 VERSIONS
// ============================================================

export const AMY_BRAIN_VERSION = "amy-brain-v2.0.0";
export const AMY_TRUTH_PACKET_CONTRACT = "amy-truth-packet-v1";

// ============================================================
// //#2 HELPERS
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

function nowIso() {
  return new Date().toISOString();
}

function provenance({
  moduleId,
  moduleVersion,
  dataVersion = null,
  sourceType = "engine",
  reused = false,
  newlyCalculated = false,
  assumptions = null,
  officialDataUsed = null
} = {}) {
  return stripEmpty({
    module_id: moduleId || null,
    module_version: moduleVersion || null,
    data_version: dataVersion,
    source_type: sourceType,
    reused: Boolean(reused),
    newly_calculated: Boolean(newlyCalculated),
    assumptions,
    official_data_used: officialDataUsed
  });
}

// ============================================================
// //#3 INPUT NORMALIZATION
// ============================================================

const COMPENSATION_KEYS = [
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
  "headline"
];

const MORTGAGE_KEYS = [
  "all_in_monthly",
  "allInMonthly",
  "all_in",
  "allIn",
  "principal_interest",
  "principalInterest",
  "price",
  "loan_amount",
  "loanAmount"
];

function hasCompensationSignal(obj) {
  return hasAnyValue(obj, COMPENSATION_KEYS);
}

function hasMortgageSignal(obj) {
  return hasAnyValue(obj, MORTGAGE_KEYS);
}

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
  const bridgeCompensation = hasCompensationSignal(bridge) ? bridge : {};

  const compensation = pickFirstObject(
    input.compensation,
    basicbrain.compensation,
    basicbrain.calculated_comp,
    session.compensation,
    bridgeCompensation
  );

  const mortgage = pickFirstObject(
    input.mortgage,
    basicbrain.mortgage,
    session.mortgage
  );

  const affordability = pickFirstObject(
    input.affordability,
    basicbrain.affordability,
    basicbrain.fad?.affordability,
    session.affordability
  );

  const scenario = {
    ...safeObject(input.scenario),
    ...safeObject(basicbrain.scenario)
  };

  return {
    message: clean(input.message),
    profile,
    scenario,
    compensation,
    mortgage,
    affordability,
    selectedBase: safeObject(input.selectedBase),
    basicbrain,
    session,
    metadata,
    debug: Boolean(input.debug || metadata.debug)
  };
}

function messageRequestsRecalc(message) {
  const t = lower(message);
  if (!t) return false;
  return /\b(what if|if i|hypothetical|recalc|recalculate|change(?:d|s)? to|instead of|raise|lower|increase|decrease|bump|drop|new rank|new base|pcs to|move to)\b/.test(
    t
  );
}

function parseExplicitPrice(message) {
  const t = lower(message);
  if (
    !/\b(what if|if i|hypothetical|change(?:d|s)? to|instead of|price of|home (?:at|for))\b/.test(
      t
    )
  ) {
    return null;
  }
  const match =
    t.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(k)?/) ||
    t.match(/\b([\d,]+(?:\.\d+)?)\s*(k)?\s*(?:home|house|price)\b/);
  if (!match) return null;
  let n = Number(String(match[1]).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (match[2]) n *= 1000;
  if (n < 50000 || n > 5000000) return null;
  return Math.round(n);
}

function buildScenarioFromContext(normalized) {
  const p = normalized.profile || {};
  const s = normalized.scenario || {};
  const m = normalized.mortgage || {};
  const explicitPrice = parseExplicitPrice(normalized.message);

  return stripEmpty({
    price: firstNumber(
      explicitPrice,
      s.price,
      s.purchasePrice,
      s.projected_home_price,
      p.projected_home_price,
      m.price
    ),
    downpayment: firstNumber(
      s.downpayment,
      s.downPayment,
      s.down_payment,
      p.downpayment,
      m.downpayment,
      m.downPayment
    ),
    creditScore: firstNumber(s.creditScore, s.credit_score, p.credit_score),
    termYears: firstNumber(s.termYears, s.term_years, p.termYears, 30) || 30,
    loanType: clean(s.loanType || s.loan_type || p.loanType) || null,
    expenses: firstNumber(
      s.expenses,
      s.monthly_expenses,
      p.monthly_expenses
    ),
    debt: firstNumber(s.debt, p.debt),
    rank_paygrade: clean(p.rank_paygrade || p.rank || p.paygrade) || null,
    yos: firstNumber(p.yos, p.yearsOfService, p.years_of_service),
    base: clean(p.base || s.base) || null,
    zip: clean(p.zip || s.zip || p.bahZip) || null,
    family: p.family ?? p.withDependents ?? p.dependents ?? null,
    mode: clean(p.mode) || "active",
    va_disability: firstNumber(p.va_disability, p.vaDisability),
    priceSource: explicitPrice
      ? "question_hypothetical"
      : "resources_page"
  });
}

// ============================================================
// //#4 PACKET NORMALIZERS (adapters — no formulas)
// ============================================================

function normalizeCompensationPacket(raw = {}, meta = {}) {
  const src = safeObject(raw);
  const monthly = isPlainObject(src.monthly) ? src.monthly : {};

  const base_pay = firstNumber(
    src.base_pay,
    src.basePay,
    monthly.basePay,
    monthly.basicPay
  );
  const bas = firstNumber(src.bas, src.BAS, monthly.bas);
  const bah = firstNumber(src.bah, src.BAH, monthly.bah, src.bahMonthly);
  const total_monthly = firstNumber(
    src.total_monthly,
    src.totalMonthly,
    src.total,
    monthly.total
  );
  const retirement_pay = firstNumber(
    src.retirement_pay,
    src.retirementPay,
    monthly.retirement
  );
  const disability_pay = firstNumber(
    src.disability_pay,
    src.disabilityPay,
    src.va_disability_pay,
    monthly.vaDisability
  );

  if (
    ![base_pay, bas, bah, total_monthly, retirement_pay, disability_pay].some(
      (n) => Number.isFinite(n) && n > 0
    )
  ) {
    return null;
  }

  return stripEmpty({
    ok: true,
    module: "compensation",
    base_pay,
    basePay: base_pay,
    bas,
    bah,
    retirement_pay,
    retirementPay: retirement_pay,
    disability_pay,
    disabilityPay: disability_pay,
    va_disability_pay: disability_pay,
    other_pay: firstNumber(src.other_pay, src.otherPay, src.special_pay),
    total_monthly,
    totalMonthly: total_monthly,
    total: total_monthly,
    headline: clean(src.headline) || null,
    source: clean(src.source) || meta.source || "amy-brain compensation adapter",
    calculated: Boolean(meta.newlyCalculated),
    reused: Boolean(meta.reused),
    provenance: provenance({
      moduleId: "compensation",
      moduleVersion: meta.moduleVersion || COMPENSATION_CONTEXT_VERSION,
      dataVersion: meta.dataVersion || src.sourceVersion || null,
      sourceType: meta.reused ? "page_context" : "engine",
      reused: meta.reused,
      newlyCalculated: meta.newlyCalculated,
      officialDataUsed:
        src.provenance?.official_data_used ?? meta.officialDataUsed ?? null
    })
  });
}

function normalizeMortgagePacket(raw = {}, meta = {}) {
  const src = safeObject(raw);
  const monthly = isPlainObject(src.monthly) ? src.monthly : {};
  const mortgage = isPlainObject(src.mortgage) ? src.mortgage : {};
  const breakdown = isPlainObject(src.breakdown) ? src.breakdown : {};

  const all_in_monthly = firstNumber(
    src.all_in_monthly,
    src.allInMonthly,
    src.all_in,
    src.allIn,
    monthly.allIn,
    monthly.all_in,
    monthly.total
  );
  if (!all_in_monthly || all_in_monthly <= 0) return null;

  const principal_interest = firstNumber(
    src.principal_interest,
    src.principalInterest,
    monthly.pi,
    monthly.principalInterest,
    breakdown.pi
  );
  const taxes = firstNumber(src.taxes, monthly.tax, monthly.taxes, breakdown.tax);
  const insurance = firstNumber(
    src.insurance,
    monthly.insurance,
    breakdown.insurance
  );
  const hoa = firstNumber(src.hoa, monthly.hoa, breakdown.hoa);
  const pmi = firstNumber(src.pmi, monthly.pmi, breakdown.pmi);

  const out = {
    ok: true,
    module: "mortgage",
    price: firstNumber(src.price, mortgage.price),
    downpayment: firstNumber(
      src.downpayment,
      src.downPayment,
      mortgage.downPayment
    ),
    loan_amount: firstNumber(
      src.loan_amount,
      src.loanAmount,
      mortgage.loanAmount
    ),
    apr: firstNumber(src.apr, mortgage.apr, src.rate),
    term_years: firstNumber(src.term_years, src.termYears, mortgage.termYears),
    all_in_monthly,
    source: clean(src.source) || meta.source || "amy-brain mortgage adapter",
    calculated: Boolean(meta.newlyCalculated),
    reused: Boolean(meta.reused),
    provenance: provenance({
      moduleId: "mortgage",
      moduleVersion: meta.moduleVersion || MORTGAGE_ENGINE_VERSION,
      sourceType: meta.reused ? "page_context" : "engine",
      reused: meta.reused,
      newlyCalculated: meta.newlyCalculated,
      officialDataUsed: src.provenance?.official_data_used ?? null
    })
  };

  if (Number.isFinite(principal_interest)) {
    out.principal_interest = principal_interest;
  }
  if (Number.isFinite(taxes)) out.taxes = taxes;
  if (Number.isFinite(insurance)) out.insurance = insurance;
  if (Number.isFinite(hoa)) out.hoa = hoa;
  if (Number.isFinite(pmi)) out.pmi = pmi;

  return stripEmpty(out);
}

function normalizeAffordabilityPacket(raw = {}, meta = {}) {
  const src = safeObject(raw);
  if (!src || src.ok === false) return null;

  const housing_ratio = firstNumber(
    src.housing_ratio,
    src.housingRatio,
    typeof src.ratios?.housingRatioPct === "number"
      ? src.ratios.housingRatioPct / 100
      : null
  );
  const backend_ratio = firstNumber(
    src.backend_ratio,
    src.backendRatio,
    typeof src.ratios?.debtRatioPct === "number"
      ? src.ratios.debtRatioPct / 100
      : null
  );
  const income = firstNumber(
    src.income,
    src.monthly?.totalMonthlyIncome,
    src.monthly?.totalMonthlyIntake
  );
  const status = clean(src.status || src.statusLabel);
  if (
    !Number.isFinite(housing_ratio) &&
    !Number.isFinite(backend_ratio) &&
    !status &&
    !Number.isFinite(income)
  ) {
    return null;
  }

  return stripEmpty({
    ok: true,
    module: "affordability",
    income,
    housing_cap_30: firstNumber(src.housing_cap_30),
    housing_ratio,
    backend_ratio,
    residual_income: firstNumber(
      src.residual_income,
      src.residualIncome,
      src.monthly?.residualMonthlyIncome
    ),
    score: src.score ?? src.grade ?? null,
    status: status || "INSUFFICIENT",
    bluf: clean(src.bluf) || null,
    source: clean(src.source) || meta.source || "amy-brain affordability adapter",
    provenance: provenance({
      moduleId: "affordability",
      moduleVersion: meta.moduleVersion || AFFORDABILITY_ENGINE_VERSION,
      sourceType: meta.reused ? "page_context" : "engine",
      reused: meta.reused,
      newlyCalculated: meta.newlyCalculated
    })
  });
}

function normalizeDecisionPacket(raw = {}, meta = {}) {
  const src = safeObject(raw);
  if (!src || src.ok === false) return null;

  const statusRaw = clean(
    src.status || src.decision || src.verdict
  ).toUpperCase();
  const statusMap = {
    GREEN: "GREEN",
    GO: "GREEN",
    CAUTION: "CAUTION",
    WATCH: "WATCH",
    NO_GO: "NO-GO",
    "NO-GO": "NO-GO",
    NOGO: "NO-GO",
    INSUFFICIENT: "INSUFFICIENT"
  };
  const status = statusMap[statusRaw] || statusRaw || null;
  const bluf = clean(src.bluf || src.summary || src.message);
  if (!status && !bluf) return null;

  const reasons = [];
  if (Array.isArray(src.reasons)) reasons.push(...src.reasons);
  if (Array.isArray(src.findings)) {
    for (const finding of src.findings.slice(0, 8)) {
      if (typeof finding === "string") reasons.push(finding);
      else if (finding?.message) reasons.push(String(finding.message));
    }
  }

  return stripEmpty({
    ok: true,
    module: "decision_rules",
    status: status || "INSUFFICIENT",
    grade: src.grade ?? src.score ?? "N/A",
    label: clean(src.label || src.statusLabel) || status || "Decision",
    bluf: bluf || "Decision packet loaded.",
    reasons: reasons.slice(0, 8),
    source: clean(src.source) || meta.source || "amy-brain decision adapter",
    provenance: provenance({
      moduleId: "decision_rules",
      moduleVersion: meta.moduleVersion || DECISION_ENGINE_VERSION,
      sourceType: meta.reused ? "page_context" : "engine",
      reused: meta.reused,
      newlyCalculated: meta.newlyCalculated
    })
  });
}

// ============================================================
// //#5 DETECTORS
// ============================================================

const COMP_MSG_RE =
  /\b(pay|base pay|basic pay|bas|bah|compensation|monthly income|military income|retired pay|retirement pay|va disability pay|total monthly compensation|what do i make|how much do i make|how much (?:do|will) i (?:make|earn|get))\b/i;

const MORTGAGE_MSG_RE =
  /\b(mortgage|monthly payment|principal|piti|property tax|homeowners insurance|hoa|apr|interest rate|loan amount|down ?payment)\b/i;

const AFFORD_MSG_RE =
  /\b(afford|how much house|buying power|housing cap|price range|financially ready|ready to buy|can i buy)\b/i;

const BASE_MSG_RE = new RegExp(
  [
    String.raw`\bbase information\b`,
    String.raw`\binstallation (?:info|information|details)\b`,
    String.raw`\bduty station(?: info| information)?\b`,
    String.raw`\bwhat base (?:is|am|are)\b`,
    String.raw`\bbase demographics\b`,
    String.raw`\babout (?:my |the )?base\b`,
    String.raw`\btell me about (?:the )?(?:[A-Za-z0-9][A-Za-z0-9.\- ]{0,40}?\s)?(?:AFB|Air Force Base|NAS|NS|JBLM)\b`,
    String.raw`\btell me about (?:the )?(Fort\s+[A-Za-z][A-Za-z.\-]{2,40})\b`,
    String.raw`\btell me about (?:the )?(Camp\s+[A-Za-z][A-Za-z.\-]{2,40})\b`
  ].join("|"),
  "i"
);

const VA_EXPLICIT_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed(?:\s+loan)?|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|no pmi|va appraisal|seller concessions?|va closing costs)\b/i;

// Requires VA-home-loan framing — do not treat generic "house"/"afford" as VA.
const VA_HOME_FINANCE_RE =
  /\b(va[\s-]?loan|va[\s-]?mortgage|va[\s-]?backed|va home(?:\s+loan)?|funding fee|entitlement|certificate of eligibility|\bcoe\b|zero down|0 down|no down|no pmi|va appraisal|seller concession|va closing costs?)\b/i;

const VA_DISABILITY_ONLY_RE =
  /\bva\b.{0,24}\bdisability\b|\bdisability\b.{0,24}\b(va|compensation|pay)\b/i;

function detectCompensationNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;
  if (hasCompensationSignal(n.compensation)) {
    score += 60;
    reasons.push("Calculated compensation context is present");
  }
  if (n.message && COMP_MSG_RE.test(n.message)) {
    score += 40;
    reasons.push("Message asks about monthly income or military compensation");
  }
  return {
    id: "compensation",
    matched: score > 0,
    score: score > 0 ? Math.max(score, 1) : 0,
    reasons: uniqueArray(reasons)
  };
}

function detectMortgageNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;
  if (hasMortgageSignal(n.mortgage)) {
    score += 50;
    reasons.push("Mortgage result context is present");
  }
  if (n.message && MORTGAGE_MSG_RE.test(n.message)) {
    score += 45;
    reasons.push("Message asks about mortgage or housing payment");
  }
  if (parseExplicitPrice(n.message)) {
    score += 20;
    reasons.push("Message contains an explicit home-price hypothetical");
  }
  return {
    id: "mortgage",
    matched: score > 0,
    score: score > 0 ? Math.max(score, 1) : 0,
    reasons: uniqueArray(reasons)
  };
}

function detectAffordabilityNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;
  if (isPlainObject(n.affordability) && Object.keys(n.affordability).length) {
    score += 40;
    reasons.push("Affordability context is present");
  }
  if (n.message && AFFORD_MSG_RE.test(n.message)) {
    score += 55;
    reasons.push("Message asks about affordability or buying power");
  }
  // Combined VA affordability questions
  if (
    n.message &&
    /\bafford\b/i.test(n.message) &&
    /\bva\b/i.test(n.message)
  ) {
    score += 15;
    reasons.push("Message links affordability to VA loan planning");
  }
  return {
    id: "affordability",
    matched: score > 0,
    score: score > 0 ? Math.max(score, 1) : 0,
    reasons: uniqueArray(reasons)
  };
}

function detectDecisionNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;
  const aff = detectAffordabilityNeed(n);
  if (aff.matched) {
    score += 50;
    reasons.push("Decision rules follow affordability evaluation");
  }
  if (
    n.message &&
    /\b(should i buy|ready to buy|go or no|verdict|decision|bluf)\b/i.test(
      n.message
    )
  ) {
    score += 40;
    reasons.push("Message asks for a readiness or buy decision");
  }
  return {
    id: "decision_rules",
    matched: score > 0,
    score: score > 0 ? Math.max(score, 1) : 0,
    reasons: uniqueArray(reasons)
  };
}

function detectVaLoanNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const t = lower(n.message);
  if (!t) {
    return { id: "va_loans", matched: false, score: 0, reasons: [] };
  }

  const disabilityOnly =
    VA_DISABILITY_ONLY_RE.test(t) &&
    !VA_EXPLICIT_RE.test(t) &&
    !/\b(mortgage|home loan|house|purchase|closing|appraisal|entitlement|funding fee|coe|zero down|no pmi)\b/i.test(
      t
    );
  if (disabilityOnly) {
    return { id: "va_loans", matched: false, score: 0, reasons: [] };
  }

  const explicit = VA_EXPLICIT_RE.test(t);
  const homeFinance = VA_HOME_FINANCE_RE.test(t);
  let intent = null;
  try {
    intent = detectVaLoanIntent(n.message);
  } catch (_) {
    intent = null;
  }

  const reasons = [];
  let score = 0;
  if (explicit) {
    score += 70;
    reasons.push("Message contains VA Loan language");
  }
  if (homeFinance && intent) {
    score += explicit ? 10 : 50;
    reasons.push(`VA Loan intent detected: ${clean(intent) || "overview"}`);
  }

  const matched = explicit || (homeFinance && Boolean(intent));
  return {
    id: "va_loans",
    matched,
    score: matched ? Math.max(score, 1) : 0,
    reasons: matched ? uniqueArray(reasons) : []
  };
}

function detectBaseNeed(input) {
  const n = normalizeAmyBrainInput(input);
  const reasons = [];
  let score = 0;
  const messageMatched = Boolean(n.message && BASE_MSG_RE.test(n.message));
  if (n.selectedBase && Object.keys(n.selectedBase).length) {
    score += 25;
    reasons.push("Selected base context is present");
  }
  if (n.profile?.base || n.scenario?.base) {
    score += 15;
    reasons.push("Profile/scenario includes a base");
  }
  if (messageMatched) {
    score += 60;
    reasons.push("Message asks about installation or base information");
  }
  return {
    id: "base_information",
    // Require an explicit base-information ask — do not route merely because
    // a duty station appears in profile or an unrelated place name appears.
    matched: messageMatched,
    score: messageMatched ? Math.max(score, 1) : 0,
    reasons: messageMatched ? uniqueArray(reasons) : []
  };
}

// ============================================================
// //#6 MODULE EXECUTORS
// ============================================================

async function executeCompensation(ctx) {
  const { normalized, scenario, results } = ctx;
  const missing = [];
  const forceRecalc = messageRequestsRecalc(normalized.message);

  const supplied = normalizeCompensationPacket(normalized.compensation, {
    reused: true,
    newlyCalculated: false,
    source: "page_context compensation"
  });

  if (supplied && !forceRecalc) {
    return {
      packet: supplied,
      reused: true,
      newlyCalculated: false,
      missing_inputs: missing
    };
  }

  const hasCalcInputs =
    Boolean(scenario.rank_paygrade) &&
    scenario.yos !== null &&
    scenario.yos !== undefined &&
    Boolean(scenario.base || scenario.zip);

  if (!hasCalcInputs) {
    if (COMP_MSG_RE.test(normalized.message || "")) {
      if (!scenario.rank_paygrade) missing.push("rank/paygrade");
      if (scenario.yos === null || scenario.yos === undefined) {
        missing.push("years of service");
      }
      if (!scenario.base && !scenario.zip) missing.push("base or BAH ZIP");
      if (scenario.family === null || scenario.family === undefined) {
        missing.push("dependent status");
      }
      return {
        packet: {
          ok: false,
          partial: true,
          module: "compensation",
          calculated: false,
          warning:
            "Compensation was requested, but no calculated compensation context was available.",
          provenance: provenance({
            moduleId: "compensation",
            moduleVersion: COMPENSATION_CONTEXT_VERSION,
            sourceType: "unavailable",
            newlyCalculated: false
          })
        },
        reused: false,
        newlyCalculated: false,
        missing_inputs: missing
      };
    }
    return { packet: supplied, reused: Boolean(supplied), newlyCalculated: false, missing_inputs: missing };
  }

  const engineResult = safeBuildCompensationContext({
    mode: scenario.mode,
    rank: scenario.rank_paygrade,
    paygrade: scenario.rank_paygrade,
    rank_paygrade: scenario.rank_paygrade,
    yos: scenario.yos,
    yearsOfService: scenario.yos,
    family: scenario.family,
    withDependents: scenario.family,
    base: scenario.base,
    zip: scenario.zip,
    bahZip: scenario.zip,
    va_disability: scenario.va_disability
  });

  const normalizedPacket = normalizeCompensationPacket(engineResult, {
    reused: false,
    newlyCalculated: true,
    moduleVersion: COMPENSATION_CONTEXT_VERSION,
    source: "compensation-context engine"
  });

  return {
    packet: normalizedPacket,
    reused: false,
    newlyCalculated: Boolean(normalizedPacket),
    missing_inputs: missing,
    engine_ok: engineResult?.ok !== false
  };
}

async function executeMortgage(ctx) {
  const { normalized, scenario } = ctx;
  const missing = [];
  const forceRecalc =
    messageRequestsRecalc(normalized.message) ||
    scenario.priceSource === "question_hypothetical";

  const supplied = normalizeMortgagePacket(normalized.mortgage, {
    reused: true,
    newlyCalculated: false,
    source: "page_context mortgage"
  });

  if (supplied && !forceRecalc) {
    return {
      packet: supplied,
      reused: true,
      newlyCalculated: false,
      missing_inputs: missing
    };
  }

  if (!scenario.price || scenario.price <= 0) {
    if (MORTGAGE_MSG_RE.test(normalized.message || "") || forceRecalc) {
      missing.push("target home price");
    }
    return {
      packet: supplied,
      reused: Boolean(supplied),
      newlyCalculated: false,
      missing_inputs: missing
    };
  }

  const engineResult = safeCalculateMortgage({
    price: scenario.price,
    homePrice: scenario.price,
    downpayment: scenario.downpayment || 0,
    downPayment: scenario.downpayment || 0,
    creditScore: scenario.creditScore,
    credit_score: scenario.creditScore,
    termYears: scenario.termYears || 30,
    loanType: scenario.loanType
  });

  const packet = normalizeMortgagePacket(engineResult, {
    reused: false,
    newlyCalculated: true,
    moduleVersion: MORTGAGE_ENGINE_VERSION,
    source: "mortgage-engine"
  });

  if (!packet && scenario.price > 0) {
    return {
      packet: null,
      reused: false,
      newlyCalculated: false,
      missing_inputs: missing,
      error: clean(engineResult?.error) || "Mortgage engine unavailable."
    };
  }

  return {
    packet,
    reused: false,
    newlyCalculated: Boolean(packet),
    missing_inputs: missing
  };
}

async function executeAffordability(ctx) {
  const { normalized, scenario, results } = ctx;
  const compensation = results.compensation?.packet || null;
  const mortgage = results.mortgage?.packet || null;

  const supplied = normalizeAffordabilityPacket(normalized.affordability, {
    reused: true,
    newlyCalculated: false,
    source: "page_context affordability"
  });
  if (supplied && !messageRequestsRecalc(normalized.message)) {
    return {
      packet: supplied,
      reused: true,
      newlyCalculated: false,
      missing_inputs: []
    };
  }

  const income = firstNumber(compensation?.total_monthly);
  const payment = firstNumber(mortgage?.all_in_monthly);
  if (!income && !payment) {
    return {
      packet: supplied,
      reused: Boolean(supplied),
      newlyCalculated: false,
      missing_inputs: [
        !income ? "monthly compensation" : null,
        !payment ? "mortgage estimate" : null
      ].filter(Boolean)
    };
  }

  const engineResult = safeCalculateAffordability({
    incomeMonthly: income,
    totalMonthlyIncome: income,
    expenses: scenario.expenses,
    debt: scenario.debt,
    projectedMortgageMonthly: payment,
    targetHomePrice: scenario.price,
    savings: scenario.downpayment
  });

  const packet = normalizeAffordabilityPacket(engineResult, {
    reused: false,
    newlyCalculated: true,
    moduleVersion: AFFORDABILITY_ENGINE_VERSION,
    source: "affordability-engine"
  });

  return {
    packet,
    reused: false,
    newlyCalculated: Boolean(packet),
    missing_inputs: [],
    error:
      engineResult?.ok === false
        ? clean(engineResult.error) || "Affordability engine unavailable."
        : null
  };
}

async function executeDecisionRules(ctx) {
  const { scenario, results } = ctx;
  const compensation = results.compensation?.packet || null;
  const mortgage = results.mortgage?.packet || null;
  const affordability = results.affordability?.packet || null;

  const engineResult = safeEvaluateDecision({
    compensation,
    mortgage,
    affordability,
    scenario,
    score: affordability?.score,
    status: affordability?.status,
    housingRatio: affordability?.housing_ratio,
    residualIncome: affordability?.residual_income
  });

  const packet = normalizeDecisionPacket(engineResult, {
    reused: false,
    newlyCalculated: true,
    moduleVersion: DECISION_ENGINE_VERSION,
    source: "decision-rules"
  });

  return {
    packet,
    reused: false,
    newlyCalculated: Boolean(packet),
    missing_inputs: [],
    error:
      engineResult?.ok === false
        ? clean(engineResult.error) || "Decision rules unavailable."
        : null
  };
}

async function executeVaLoans(ctx) {
  const { normalized, scenario, results } = ctx;
  const packet = buildVaLoanTruthPacket({
    message: normalized.message,
    profile: normalized.profile,
    scenario,
    compensation: results.compensation?.packet || normalized.compensation,
    mortgage: results.mortgage?.packet || normalized.mortgage,
    affordability: results.affordability?.packet || normalized.affordability
  });

  const withProv = stripEmpty({
    ...safeObject(packet),
    module: "va_loans",
    provenance: provenance({
      moduleId: "va_loans",
      moduleVersion: VA_LOANS_VERSION,
      sourceType: "engine",
      newlyCalculated: true,
      officialDataUsed: packet?.provenance?.official_data_used ?? null
    })
  });

  return {
    packet: withProv,
    reused: false,
    newlyCalculated: true,
    missing_inputs: []
  };
}

let BASE_INDEX_CACHE = null;
let BASE_INDEX_LOADED = false;

async function loadBaseIndexOnce() {
  if (BASE_INDEX_LOADED) return BASE_INDEX_CACHE;
  BASE_INDEX_LOADED = true;
  const candidates = [
    path.join(process.cwd(), "netlify", "functions", "cities", "index.byBase.json"),
    path.join(process.cwd(), "cities", "index.byBase.json"),
    path.join(__dirname, "..", "cities", "index.byBase.json")
  ];
  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.bases) {
        BASE_INDEX_CACHE = parsed;
        return BASE_INDEX_CACHE;
      }
    } catch (_) {
      // try next
    }
  }
  BASE_INDEX_CACHE = null;
  return null;
}

function extractBaseQuery(message, scenario, selectedBase) {
  const fromSelected = clean(selectedBase?.installation_name || selectedBase?.canonical_base);
  if (fromSelected) return fromSelected;
  const fromScenario = clean(scenario?.base);
  if (fromScenario) return fromScenario;
  const t = clean(message);
  const match =
    t.match(/\b([A-Za-z][A-Za-z.\- ]+?\sAFB)\b/) ||
    t.match(/\b(Fort\s+[A-Za-z][A-Za-z.\- ]{2,40})\b/i) ||
    t.match(/\b(?:about|at|near|for)\s+([A-Za-z][A-Za-z.\- ]{2,40})\b/i);
  return match ? clean(match[1]) : "";
}

async function executeBaseInformation(ctx) {
  const { normalized, scenario } = ctx;
  const query = extractBaseQuery(
    normalized.message,
    scenario,
    normalized.selectedBase
  );
  if (!query) {
    return {
      packet: null,
      reused: false,
      newlyCalculated: false,
      missing_inputs: ["base or installation name"],
      error: null
    };
  }

  const index = await loadBaseIndexOnce();
  let indexRow = null;
  let canonical = "";
  if (index?.bases) {
    if (index.bases[query]) {
      canonical = query;
      indexRow = index.bases[query];
    } else if (index.aliases?.[query]) {
      canonical = index.aliases[query];
      indexRow = index.bases[canonical] || null;
    } else {
      const lowerQ = query.toLowerCase();
      for (const key of Object.keys(index.bases)) {
        if (key.toLowerCase() === lowerQ || key.toLowerCase().includes(lowerQ)) {
          canonical = key;
          indexRow = index.bases[key];
          break;
        }
      }
    }
  }

  let bahRecord = null;
  try {
    const getBaseRecord =
      officialBah.getBaseRecord || officialBah.default?.getBaseRecord;
    const canonicalizeBase =
      officialBah.canonicalizeBase || officialBah.default?.canonicalizeBase;
    const key = canonical || query;
    if (typeof canonicalizeBase === "function" && typeof getBaseRecord === "function") {
      const canon = canonicalizeBase(key);
      bahRecord = getBaseRecord(canon);
      if (!canonical) {
        canonical = clean(bahRecord?.base || bahRecord?.canonicalBase || canon);
      }
    } else if (typeof getBaseRecord === "function") {
      bahRecord = getBaseRecord(key);
    }
  } catch (_) {
    bahRecord = null;
  }

  if (!indexRow && !bahRecord) {
    return {
      packet: {
        ok: false,
        module: "base_information",
        warning: "BASE_DATA_UNAVAILABLE",
        provenance: provenance({
          moduleId: "base_information",
          moduleVersion: officialBah.RATE_VERSION || "official-bah",
          sourceType: "unavailable"
        })
      },
      reused: false,
      newlyCalculated: false,
      missing_inputs: [],
      error: "Base data unavailable for the requested installation."
    };
  }

  const packet = stripEmpty({
    ok: true,
    module: "base_information",
    installation_name: canonical || query,
    canonical_base: canonical || query,
    city_key: indexRow?.cityKey || null,
    zip: indexRow?.zip || bahRecord?.dutyZip || bahRecord?.zip || null,
    mha_code: bahRecord?.mhaCode || null,
    mha_name: bahRecord?.mhaName || null,
    source:
      indexRow && bahRecord
        ? "cities/index.byBase.json + official-bah"
        : indexRow
          ? "cities/index.byBase.json"
          : "official-bah",
    provenance: provenance({
      moduleId: "base_information",
      moduleVersion: officialBah.RATE_VERSION || "official-bah",
      dataVersion: officialBah.RATE_VERSION || null,
      sourceType: "shared-base-data",
      newlyCalculated: true,
      officialDataUsed: Boolean(bahRecord)
    })
  });

  return {
    packet,
    reused: false,
    newlyCalculated: true,
    missing_inputs: []
  };
}

// ============================================================
// //#7 MODULE REGISTRY
// ============================================================

function defineModule(def) {
  return Object.freeze({
    id: def.id,
    version: def.version,
    description: def.description || "",
    priority: Number(def.priority) || 0,
    available: def.available !== false,
    supportedIntents: Object.freeze([...(def.supportedIntents || [])]),
    requiredInputs: Object.freeze([...(def.requiredInputs || [])]),
    dependencies: Object.freeze([...(def.dependencies || [])]),
    detect: def.detect,
    normalizeInput:
      typeof def.normalizeInput === "function" ? def.normalizeInput : null,
    execute: def.execute,
    normalizeOutput:
      typeof def.normalizeOutput === "function" ? def.normalizeOutput : null
  });
}

export const AMY_BRAIN_MODULES = Object.freeze({
  compensation: defineModule({
    id: "compensation",
    version: COMPENSATION_CONTEXT_VERSION,
    description: "Military compensation context via compensation-context engine.",
    priority: 100,
    supportedIntents: ["compensation"],
    requiredInputs: ["rank/paygrade", "years of service", "base or BAH ZIP"],
    dependencies: [],
    detect: detectCompensationNeed,
    normalizeOutput: normalizeCompensationPacket,
    execute: executeCompensation
  }),
  mortgage: defineModule({
    id: "mortgage",
    version: MORTGAGE_ENGINE_VERSION,
    description: "Mortgage payment estimates via mortgage-engine.",
    priority: 90,
    supportedIntents: ["mortgage_explanation"],
    requiredInputs: ["target home price"],
    dependencies: [],
    detect: detectMortgageNeed,
    normalizeOutput: normalizeMortgagePacket,
    execute: executeMortgage
  }),
  affordability: defineModule({
    id: "affordability",
    version: AFFORDABILITY_ENGINE_VERSION,
    description: "Affordability scoring via affordability-engine.",
    priority: 80,
    supportedIntents: ["housing_affordability"],
    requiredInputs: ["monthly compensation", "mortgage estimate"],
    dependencies: ["compensation", "mortgage"],
    detect: detectAffordabilityNeed,
    normalizeOutput: normalizeAffordabilityPacket,
    execute: executeAffordability
  }),
  decision_rules: defineModule({
    id: "decision_rules",
    version: DECISION_ENGINE_VERSION,
    description: "Deterministic readiness/decision verdicts.",
    priority: 70,
    supportedIntents: ["housing_affordability", "dashboard_interpretation"],
    requiredInputs: [],
    dependencies: ["affordability"],
    detect: detectDecisionNeed,
    normalizeOutput: normalizeDecisionPacket,
    execute: executeDecisionRules
  }),
  va_loans: defineModule({
    id: "va_loans",
    version: VA_LOANS_VERSION,
    description: "VA Loan education and scenario packets via va-loans.js.",
    priority: 85,
    supportedIntents: ["va_loan"],
    requiredInputs: [],
    dependencies: [],
    detect: detectVaLoanNeed,
    execute: executeVaLoans
  }),
  base_information: defineModule({
    id: "base_information",
    version: officialBah.RATE_VERSION || "official-bah",
    description: "Public installation metadata via official-bah + city index.",
    priority: 60,
    supportedIntents: ["base_information"],
    requiredInputs: ["base or installation name"],
    dependencies: [],
    detect: detectBaseNeed,
    execute: executeBaseInformation
  })
});

function listModules() {
  return Object.values(AMY_BRAIN_MODULES).slice().sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}

// ============================================================
// //#8 DEPENDENCY PLANNING
// ============================================================

function expandWithDependencies(matchedIds) {
  const selected = new Set(matchedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...selected]) {
      const mod = AMY_BRAIN_MODULES[id];
      if (!mod) continue;
      for (const dep of mod.dependencies) {
        if (!selected.has(dep) && AMY_BRAIN_MODULES[dep]) {
          // Soft dependency: include dep so upstream can run if useful,
          // but do not force-match unrelated domains for empty messages.
          selected.add(dep);
          changed = true;
        }
      }
    }
  }
  return [...selected];
}

function planExecutionOrder(moduleIds) {
  const ids = [...new Set(moduleIds)];
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  const cycle = [];

  function visit(id, stack = []) {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      cycle.push(...stack, id);
      return false;
    }
    visiting.add(id);
    const deps = AMY_BRAIN_MODULES[id]?.dependencies || [];
    for (const dep of deps) {
      if (!ids.includes(dep)) continue;
      if (!visit(dep, [...stack, id])) return false;
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
    return true;
  }

  for (const id of ids) {
    if (!visit(id)) {
      return { ok: false, order: [], cycle: uniqueArray(cycle) };
    }
  }
  return { ok: true, order, cycle: [] };
}

function groupIndependentBatches(order) {
  const remaining = new Set(order);
  const completed = new Set();
  const batches = [];

  while (remaining.size) {
    const batch = [];
    for (const id of order) {
      if (!remaining.has(id)) continue;
      const deps = (AMY_BRAIN_MODULES[id]?.dependencies || []).filter((d) =>
        remaining.has(d) || (!completed.has(d) && order.includes(d) && !completed.has(d))
      );
      const unmet = (AMY_BRAIN_MODULES[id]?.dependencies || []).filter(
        (d) => order.includes(d) && !completed.has(d)
      );
      if (unmet.length === 0) batch.push(id);
    }
    if (!batch.length) {
      // Safety: break potential stall by taking next remaining in plan order.
      batch.push([...remaining][0]);
    }
    for (const id of batch) {
      remaining.delete(id);
      completed.add(id);
    }
    batches.push(batch);
  }
  return batches;
}

// ============================================================
// //#9 DETECT / ROUTE / BUILD
// ============================================================

export function detectAmyKnowledgeNeeds(input = {}) {
  const matches = [];
  for (const module of listModules()) {
    if (!module.available || typeof module.detect !== "function") continue;
    let result;
    try {
      result = module.detect(input);
    } catch (_) {
      continue;
    }
    if (!result?.matched) continue;
    matches.push({
      id: clean(result.id) || module.id,
      matched: true,
      score: Number.isFinite(Number(result.score))
        ? Number(result.score)
        : module.priority,
      reasons: uniqueArray(result.reasons)
    });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ap = AMY_BRAIN_MODULES[a.id]?.priority || 0;
    const bp = AMY_BRAIN_MODULES[b.id]?.priority || 0;
    if (bp !== ap) return bp - ap;
    return a.id.localeCompare(b.id);
  });

  return matches;
}

export async function routeAmyKnowledge(input = {}) {
  const normalized = normalizeAmyBrainInput(input);
  const scenario = buildScenarioFromContext(normalized);
  const matches = detectAmyKnowledgeNeeds(normalized);
  const matchedIds = matches.map((m) => m.id);

  // When affordability/decision matched, ensure dependency modules can run.
  const plannedIds = expandWithDependencies(matchedIds);
  const plan = planExecutionOrder(plannedIds);

  const packets = {};
  const errors = [];
  const warnings = [];
  const missing_inputs = [];
  const execution = {
    order: plan.order,
    batches: [],
    modules: {}
  };

  if (!plan.ok) {
    errors.push({
      module: "amy-brain",
      code: "DEPENDENCY_CYCLE",
      message: `Dependency cycle detected: ${plan.cycle.join(" -> ")}`
    });
    return {
      ok: true,
      version: AMY_BRAIN_VERSION,
      contract_version: AMY_TRUTH_PACKET_CONTRACT,
      message: normalized.message,
      matched_modules: matchedIds,
      matches,
      planned_modules: plannedIds,
      packets,
      errors,
      warnings: uniqueArray(warnings),
      missing_inputs: [],
      execution,
      scenario,
      normalized,
      source: "TheWing amy-brain.js"
    };
  }

  if (!matchedIds.length) {
    warnings.push("No deterministic knowledge module matched this request.");
  }

  const results = {};
  const batches = groupIndependentBatches(plan.order);
  execution.batches = batches;

  // plannedIds is expandWithDependencies(matchedIds): every planned module is
  // either matched or a transitive dependency. Execute each at most once.
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (moduleId) => {
        if (execution.modules[moduleId]) {
          return;
        }

        const module = AMY_BRAIN_MODULES[moduleId];
        if (!module?.available || typeof module.execute !== "function") {
          errors.push({
            module: moduleId,
            code: "MODULE_UNAVAILABLE",
            message: "Registered knowledge module is unavailable."
          });
          execution.modules[moduleId] = { status: "unavailable" };
          return;
        }

        const started = Date.now();
        try {
          const result = await module.execute({
            normalized,
            scenario,
            results
          });
          results[moduleId] = result || {};
          if (result?.packet) packets[moduleId] = result.packet;
          if (Array.isArray(result?.missing_inputs)) {
            for (const item of result.missing_inputs) {
              missing_inputs.push({ module: moduleId, field: item });
            }
          }
          if (result?.packet?.warning) warnings.push(clean(result.packet.warning));
          if (Array.isArray(result?.packet?.warnings)) {
            warnings.push(...result.packet.warnings.map(clean).filter(Boolean));
          }
          if (result?.error) {
            errors.push({
              module: moduleId,
              code: "MODULE_EXECUTION_ERROR",
              message: clean(result.error)
            });
          }
          execution.modules[moduleId] = {
            status: result?.packet ? "ok" : result?.error ? "error" : "empty",
            reused: Boolean(result?.reused),
            newly_calculated: Boolean(result?.newlyCalculated),
            version: module.version,
            duration_ms: Date.now() - started,
            dependency:
              matchedIds.includes(moduleId) ? "matched" : "transitive"
          };
        } catch (err) {
          errors.push({
            module: moduleId,
            code: "MODULE_EXCEPTION",
            message: clean(err?.message) || "Knowledge module failed."
          });
          execution.modules[moduleId] = {
            status: "error",
            duration_ms: Date.now() - started
          };
        }
      })
    );
  }

  return {
    ok: true,
    version: AMY_BRAIN_VERSION,
    contract_version: AMY_TRUTH_PACKET_CONTRACT,
    message: normalized.message,
    matched_modules: matchedIds,
    matches,
    planned_modules: plan.order,
    packets,
    errors,
    warnings: uniqueArray(warnings),
    missing_inputs,
    execution,
    scenario,
    normalized,
    source: "TheWing amy-brain.js"
  };
}

function combineTruthPackets(packets = {}, routeWarnings = [], missing = []) {
  const bluf = [];
  const facts = [];
  const risks = [];
  const recommendations = [];
  const next_steps = [];
  const warnings = [];
  const disclaimers = [];

  const compensation = packets.compensation;
  if (isPlainObject(compensation) && compensation.ok !== false) {
    const pushFact = (label, value) => {
      const display = money(value);
      if (!display) return;
      facts.push(`${label}: ${display} per month.`);
    };
    pushFact("Base pay", compensation.base_pay);
    pushFact("BAS", compensation.bas);
    pushFact("BAH", compensation.bah);
    pushFact("Retirement pay", compensation.retirement_pay);
    pushFact("VA disability pay", compensation.disability_pay);
    pushFact("Total monthly compensation", compensation.total_monthly);
    if (clean(compensation.headline)) facts.push(clean(compensation.headline));
  } else if (compensation?.warning) {
    warnings.push(clean(compensation.warning));
  }

  const mortgage = packets.mortgage;
  if (isPlainObject(mortgage) && mortgage.ok !== false) {
    const allIn = money(mortgage.all_in_monthly);
    if (allIn) {
      facts.push(`Estimated all-in housing payment: ${allIn} per month.`);
    }
  }

  const affordability = packets.affordability;
  if (isPlainObject(affordability) && affordability.ok !== false) {
    if (clean(affordability.bluf)) bluf.push(clean(affordability.bluf));
    if (affordability.status) {
      facts.push(`Affordability status: ${clean(affordability.status)}.`);
    }
  }

  const decision = packets.decision_rules;
  if (isPlainObject(decision) && decision.ok !== false) {
    if (clean(decision.bluf)) bluf.push(clean(decision.bluf));
    if (Array.isArray(decision.reasons)) {
      for (const reason of decision.reasons) {
        if (clean(reason)) risks.push(clean(reason));
      }
    }
  }

  const va = packets.va_loans;
  if (isPlainObject(va)) {
    if (clean(va.bluf)) bluf.push(clean(va.bluf));
    const guidance = isPlainObject(va.guidance) ? va.guidance : {};
    for (const point of guidance.key_points || []) {
      if (clean(point)) facts.push(clean(point));
    }
    for (const risk of guidance.risks || []) {
      if (clean(risk)) risks.push(clean(risk));
    }
    for (const step of guidance.next_steps || []) {
      if (clean(step)) next_steps.push(clean(step));
    }
    for (const disclaimer of guidance.disclaimers || []) {
      if (clean(disclaimer)) disclaimers.push(clean(disclaimer));
    }
    for (const warning of va.warnings || []) {
      if (clean(warning)) warnings.push(clean(warning));
    }
  }

  const base = packets.base_information;
  if (isPlainObject(base) && base.ok !== false && base.installation_name) {
    facts.push(`Installation: ${clean(base.installation_name)}.`);
    if (base.zip) facts.push(`Planning ZIP mapping: ${clean(base.zip)}.`);
    if (base.mha_name) facts.push(`BAH market area: ${clean(base.mha_name)}.`);
  }

  for (const warning of routeWarnings || []) {
    if (clean(warning)) warnings.push(clean(warning));
  }
  for (const item of missing || []) {
    const field = typeof item === "string" ? item : item?.field;
    if (clean(field)) {
      recommendations.push(`Add ${clean(field)} to tighten the deterministic result.`);
    }
  }

  return {
    bluf: uniqueArray(bluf),
    facts: uniqueArray(facts),
    risks: uniqueArray(risks),
    recommendations: uniqueArray(recommendations),
    next_steps: uniqueArray(next_steps),
    warnings: uniqueArray(warnings),
    disclaimers: uniqueArray(disclaimers)
  };
}

function buildPublicProjection(routed, combined) {
  const packets = routed.packets || {};
  const missing = uniqueArray(
    (routed.missing_inputs || []).map((m) =>
      typeof m === "string" ? m : m.field
    )
  );

  const scenario = routed.scenario || {};
  const profile = routed.normalized?.profile || {};

  const summaryParts = [];
  if (profile.mode) summaryParts.push(`Status: ${profile.mode}`);
  if (profile.rank_paygrade) summaryParts.push(`Rank: ${profile.rank_paygrade}`);
  if (profile.base) summaryParts.push(`Base: ${profile.base}`);
  if (scenario.price) {
    const display = money(scenario.price);
    if (display) summaryParts.push(`Target Home Price: ${display}`);
  }

  const nextAction = missing.length
    ? {
        type: "collect_input",
        message: `To tighten this Resources-page answer, add: ${missing
          .slice(0, 3)
          .join(", ")}.`
      }
    : combined.next_steps[0]
      ? { type: "next_step", message: combined.next_steps[0] }
      : combined.bluf[0]
        ? { type: "decision", message: combined.bluf[0] }
        : {
            type: "guidance",
            message:
              "Ask about the compensation, mortgage, affordability, base, or VA loan details currently shown on this Resources page."
          };

  return stripEmpty({
    resources_scenario_summary:
      summaryParts.join(" | ") || "No Resources-page scenario loaded.",
    // Deprecated compatibility alias
    profile_summary:
      summaryParts.join(" | ") || "No Resources-page scenario loaded.",
    compensation: packets.compensation || null,
    housing_inputs: stripEmpty({
      price: scenario.price,
      downpayment: scenario.downpayment,
      credit_score: scenario.creditScore,
      expenses: scenario.expenses,
      base: scenario.base,
      zip: scenario.zip
    }),
    mortgage: packets.mortgage || null,
    affordability: packets.affordability || null,
    verdict: packets.decision_rules || null,
    va_loan: packets.va_loans || null,
    base_info: packets.base_information || null,
    next_action: nextAction,
    missing_inputs: missing,
    combined
  });
}

function collectProvenance(packets = {}) {
  const out = {};
  for (const [id, packet] of Object.entries(packets)) {
    if (packet?.provenance) out[id] = packet.provenance;
  }
  return out;
}

export async function buildAmyTruthPacket(input = {}) {
  const routed = await routeAmyKnowledge(input);
  const combined = combineTruthPackets(
    routed.packets,
    routed.warnings,
    routed.missing_inputs
  );
  const publicProjection = buildPublicProjection(routed, combined);
  const normalized = routed.normalized || normalizeAmyBrainInput(input);

  const skipped = Object.entries(routed.execution?.modules || {})
    .filter(([, info]) => info?.status === "skipped")
    .map(([id]) => id);

  const unavailable = Object.entries(routed.execution?.modules || {})
    .filter(([, info]) => info?.status === "unavailable")
    .map(([id]) => id);

  return {
    ok: true,
    contract_version: AMY_TRUTH_PACKET_CONTRACT,
    brain_version: AMY_BRAIN_VERSION,
    version: AMY_BRAIN_VERSION,
    request: {
      message: normalized.message,
      mode: clean(normalized.profile.mode) || clean(normalized.metadata.mode) || null,
      has_profile: Object.keys(normalized.profile).length > 0,
      has_compensation: hasCompensationSignal(normalized.compensation),
      has_mortgage: hasMortgageSignal(normalized.mortgage),
      has_affordability: Object.keys(normalized.affordability).length > 0
    },
    routing: {
      matched_modules: routed.matched_modules,
      matches: routed.matches,
      planned_modules: routed.planned_modules,
      skipped_modules: skipped,
      unavailable_modules: unavailable
    },
    execution: routed.execution,
    profile_used: stripEmpty({
      mode: normalized.profile.mode,
      rank_paygrade: normalized.profile.rank_paygrade || normalized.profile.rank,
      yos: firstNumber(normalized.profile.yos, normalized.profile.yearsOfService),
      base: normalized.profile.base,
      zip: normalized.profile.zip,
      family: normalized.profile.family,
      projected_home_price: firstNumber(
        normalized.profile.projected_home_price,
        normalized.profile.homePrice
      ),
      credit_score: firstNumber(normalized.profile.credit_score)
    }),
    scenario_used: routed.scenario || {},
    truth: routed.packets,
    combined,
    missing_inputs: routed.missing_inputs,
    warnings: uniqueArray([
      ...(routed.warnings || []),
      ...(combined.warnings || [])
    ]),
    errors: Array.isArray(routed.errors) ? routed.errors : [],
    provenance: collectProvenance(routed.packets),
    // Compatibility projection for existing Ask Amy consumers
    public: publicProjection,
    source: "TheWing amy-brain.js"
  };
}

export default Object.freeze({
  AMY_BRAIN_VERSION,
  AMY_TRUTH_PACKET_CONTRACT,
  AMY_BRAIN_MODULES,
  detectAmyKnowledgeNeeds,
  routeAmyKnowledge,
  buildAmyTruthPacket,
  planAmyModuleExecution: planExecutionOrder,
  expandAmyModuleDependencies: expandWithDependencies
});

export {
  planExecutionOrder as planAmyModuleExecution,
  expandWithDependencies as expandAmyModuleDependencies
};
