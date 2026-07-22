// netlify/functions/_share/ask-amy-hud-contract.js
// ============================================================
// TheWing.ai • Ask Amy HUD Response Contract
// v1.0.0
//
// PURPOSE
// - Shared response/context contract helpers for agent-amy.js v1.5
// - Sanitizes client HUD context before it reaches deterministic engines or OpenAI
// - Keeps memory patches deterministic and safe for browser-side persistence
// ============================================================

// ============================================================
// //#1) CONTRACT CONSTANTS
// ============================================================

export const RESPONSE_CONTRACT_VERSION = "ask-amy-response-v1";
export const DEFAULT_MAX_REPLY_CHARS = 720;
export const MAX_THREAD_MESSAGES = 12;
export const MAX_THREAD_MESSAGE_LENGTH = 2000;
export const MAX_MEMORY_KEYS = 40;
export const MAX_MEMORY_STRING_LENGTH = 1000;
export const DEFAULT_UI = Object.freeze({ speed: 18, startDelay: 80 });
export const APPROVED_MODES = Object.freeze([
  "member_guidance",
  "planner",
  "coach",
  "mortgage_guidance",
  "housing_guidance",
  "financial_readiness",
  "education"
]);

const MEMORY_MAX_DEPTH = 3;
const MEMORY_ARRAY_MAX_LENGTH = 20;
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MEMORY_PATCH_KEYS = new Set([
  "last_intent",
  "last_base",
  "last_target_home_price",
  "last_credit_score_scenario",
  "last_loan_type",
  "last_pcs_timeline_months",
  "last_follow_up_topic",
  "last_updated_at"
]);

// ============================================================
// //#2) BASIC HELPERS
// ============================================================

export function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cleanString(value, maxLength = 500) {
  if (value === undefined || value === null) return "";

  return String(value).trim().slice(0, maxLength);
}

function cleanLooseString(value, maxLength = 500) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";

  return String(value).trim().slice(0, maxLength);
}

function normalizeSpaces(value, maxLength = 500) {
  return cleanLooseString(value, maxLength).replace(/\s+/g, " ").trim();
}

function lowerKey(value) {
  return cleanString(value, 120).toLowerCase();
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const normalized = value.replace(/[$,%\s,]/g, "");
    if (!normalized) return null;

    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPositiveNumber(value) {
  const n = toFiniteNumber(value);
  return n !== null && n > 0 ? n : null;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundWhole(value) {
  return Math.round(Number(value) || 0);
}

function clampNumber(value, min, max, fallback) {
  const n = toFiniteNumber(value);
  const base = n === null ? fallback : n;
  return Math.max(min, Math.min(max, Math.round(base)));
}

function firstDefined(...values) {
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

function firstString(...values) {
  for (const value of values) {
    const s = cleanLooseString(value, 500);
    if (s) return s;
  }

  return "";
}

function firstNumber(...values) {
  for (const value of values) {
    const n = toFiniteNumber(value);
    if (n !== null) return n;
  }

  return null;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = toPositiveNumber(value);
    if (n !== null) return n;
  }

  return null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === 0) return Boolean(value);

  const s = lowerKey(value);
  if (!s) return null;

  if (["true", "yes", "y", "1", "with", "dependent", "dependents", "with_dependents", "with dependents"].includes(s)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "none", "single", "without_dependents", "without dependents"].includes(s)) {
    return false;
  }

  return null;
}

function stripEmptyObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (isPlainObject(value) && Object.keys(value).length === 0) continue;

    out[key] = value;
  }

  return out;
}

function uniqueStrings(values, maxLength = 300) {
  const seen = new Set();
  const out = [];

  for (const value of Array.isArray(values) ? values : []) {
    const s = normalizeSpaces(value, maxLength);
    if (!s) continue;

    const key = s.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(s);
  }

  return out;
}

// ============================================================
// //#3) CLIENT CONTEXT NORMALIZATION
// ============================================================

export function parseClientConversationContext(
  body,
  {
    defaultMode = "member_guidance",
    responseContractVersion = RESPONSE_CONTRACT_VERSION
  } = {}
) {
  const root = isPlainObject(body) ? body : {};
  const context = isPlainObject(root.context) ? root.context : {};

  const rawConversationId = firstString(
    context.conversation_id,
    context.conversationId,
    context.id,
    root.conversation_id,
    root.conversationId
  );

  const rawStyleGuide = firstDefined(
    context.style_guide,
    context.styleGuide,
    root.style_guide,
    root.styleGuide
  );

  const rawClientVersion = firstDefined(
    context.client_version,
    context.clientVersion,
    context.version,
    root.client_version,
    root.clientVersion,
    root.version
  );

  const rawResponseContract = firstString(
    context.response_contract,
    context.responseContract,
    root.response_contract,
    root.responseContract,
    responseContractVersion
  );

  return {
    conversation_id: rawConversationId ? rawConversationId.slice(0, 200) : null,
    thread: sanitizeThread(firstDefined(context.thread, context.messages, root.thread, root.messages)),
    memory: sanitizeMemory(firstDefined(context.memory, root.memory)),
    response_contract: rawResponseContract || responseContractVersion,
    response_limits: sanitizeResponseLimits(firstDefined(
      context.response_limits,
      context.responseLimits,
      root.response_limits,
      root.responseLimits
    )),
    requested_mode: sanitizeRequestedMode(
      firstDefined(context.requested_mode, context.requestedMode, context.mode, root.requested_mode, root.requestedMode, root.mode),
      defaultMode
    ),
    style_guide: sanitizeClientStyleGuide(rawStyleGuide),
    page: sanitizeClientContextValue(firstDefined(context.page, root.page)),
    widget: sanitizeClientContextValue(firstDefined(context.widget, root.widget)),
    product: sanitizeClientContextValue(firstDefined(context.product, root.product)),
    client_version: sanitizeClientContextValue(rawClientVersion)
  };
}

function sanitizeClientContextValue(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const s = normalizeSpaces(value, 300);
    return s || null;
  }

  if (Array.isArray(value)) {
    const clean = value
      .slice(0, 10)
      .map((item) => sanitizeClientContextValue(item))
      .filter((item) => item !== null);

    return clean.length ? clean : null;
  }

  if (isPlainObject(value)) {
    const clean = sanitizeMemory(value);
    return Object.keys(clean).length ? clean : null;
  }

  return null;
}

// ============================================================
// //#4) THREAD SANITIZATION
// ============================================================

export function sanitizeThread(thread) {
  if (!Array.isArray(thread)) return [];

  const clean = [];

  for (const item of thread) {
    if (!isPlainObject(item)) continue;

    const role = lowerKey(item.role);
    if (role !== "user" && role !== "assistant") continue;

    const content = normalizeSpaces(firstDefined(item.content, item.text, item.message), MAX_THREAD_MESSAGE_LENGTH);
    if (!content) continue;

    clean.push({ role, content });
  }

  return clean.slice(-MAX_THREAD_MESSAGES);
}

export function removeDuplicateCurrentMessage(thread, currentMessage) {
  const clean = sanitizeThread(thread);
  const current = normalizeSpaces(currentMessage, MAX_THREAD_MESSAGE_LENGTH);

  if (!current || !clean.length) return clean;

  const last = clean[clean.length - 1];
  if (last?.role === "user" && last.content.trim() === current.trim()) {
    return clean.slice(0, -1);
  }

  return clean;
}

export function normalizeHistoricalThread(thread, currentMessage) {
  return removeDuplicateCurrentMessage(thread, currentMessage);
}

// ============================================================
// //#5) MEMORY SANITIZATION
// ============================================================

export function sanitizeMemory(memory) {
  if (!isPlainObject(memory)) return {};

  const state = { keys: 0 };
  const clean = sanitizeMemoryObject(memory, 0, state);
  return isPlainObject(clean) ? clean : {};
}

function sanitizeMemoryObject(obj, depth, state) {
  if (!isPlainObject(obj) || depth > MEMORY_MAX_DEPTH) return {};

  const out = {};

  for (const [rawKey, rawValue] of Object.entries(obj)) {
    if (state.keys >= MAX_MEMORY_KEYS) break;

    const key = cleanString(rawKey, 100);
    if (!key || DANGEROUS_KEYS.has(key)) continue;

    const value = sanitizeMemoryValue(rawValue, depth + 1, state);
    if (value === undefined) continue;

    out[key] = value;
    state.keys += 1;
  }

  return out;
}

function sanitizeMemoryValue(value, depth, state) {
  if (value === null) return null;

  if (typeof value === "string") return value.slice(0, MAX_MEMORY_STRING_LENGTH);
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    if (depth > MEMORY_MAX_DEPTH) return undefined;

    const out = [];
    for (const item of value.slice(0, MEMORY_ARRAY_MAX_LENGTH)) {
      const clean = sanitizeMemoryValue(item, depth + 1, state);
      if (clean !== undefined) out.push(clean);
    }

    return out;
  }

  if (isPlainObject(value)) {
    if (depth > MEMORY_MAX_DEPTH) return undefined;
    return sanitizeMemoryObject(value, depth, state);
  }

  return undefined;
}

export function mergeSafeMemory(existingMemory, patch) {
  return sanitizeMemory({
    ...sanitizeMemory(existingMemory),
    ...sanitizeMemory(patch)
  });
}

// ============================================================
// //#6) DETERMINISTIC MEMORY PATCHES
// ============================================================

export function buildMemoryPatch({
  message,
  intent,
  normalizedProfile,
  deterministic,
  conversationContext
} = {}) {
  const profile = isPlainObject(normalizedProfile) ? normalizedProfile : {};
  const context = isPlainObject(conversationContext) ? conversationContext : {};
  const contextProfile = isPlainObject(context.profile) ? context.profile : {};
  const contextScenario = isPlainObject(context.scenario) ? context.scenario : {};
  const contextTruth = isPlainObject(context.truth_packet) ? context.truth_packet : {};
  const packet = extractPublicTruthPacket(deterministic);
  const fallbackPacket = extractPublicTruthPacket(contextTruth);
  const housing = isPlainObject(packet.housing_inputs) ? packet.housing_inputs : {};
  const mortgage = isPlainObject(packet.mortgage) ? packet.mortgage : {};
  const compensation = isPlainObject(packet.compensation) ? packet.compensation : {};
  const scenario = extractScenario(deterministic);

  const patch = {};
  const cleanIntent = normalizeMemoryLabel(intent, 80);

  if (cleanIntent) {
    patch.last_intent = cleanIntent;
    if (isUsefulFollowUpTopic(cleanIntent)) patch.last_follow_up_topic = cleanIntent;
  }

  const base = firstString(
    housing.base,
    mortgage.base,
    compensation.base,
    compensation.duty_base,
    scenario.base,
    contextScenario.base,
    profile.base,
    profile.duty_base,
    contextProfile.base,
    contextProfile.duty_base,
    fallbackPacket.housing_inputs?.base,
    fallbackPacket.compensation?.base
  );
  if (base) patch.last_base = base.slice(0, 160);

  const targetHomePrice = firstPositiveNumber(
    housing.price,
    housing.projected_home_price,
    mortgage.price,
    mortgage.home_price,
    mortgage.projected_home_price,
    scenario.price,
    contextScenario.price,
    profile.projected_home_price,
    profile.homePrice,
    profile.home_price,
    contextProfile.projected_home_price,
    contextProfile.homePrice,
    fallbackPacket.housing_inputs?.price,
    fallbackPacket.mortgage?.price,
    extractHomePriceFromMessage(message)
  );
  if (targetHomePrice !== null) patch.last_target_home_price = roundWhole(targetHomePrice);

  const creditScore = firstPositiveNumber(
    housing.credit_score,
    mortgage.credit_score,
    mortgage.creditScore,
    scenario.creditScore,
    scenario.credit_score,
    contextScenario.creditScore,
    contextScenario.credit_score,
    profile.credit_score,
    profile.creditScore,
    contextProfile.credit_score,
    contextProfile.creditScore,
    fallbackPacket.housing_inputs?.credit_score,
    fallbackPacket.mortgage?.credit_score,
    extractCreditScoreFromMessage(message)
  );
  if (creditScore !== null) patch.last_credit_score_scenario = clampNumber(creditScore, 300, 850, creditScore);

  const loanType = normalizeLoanType(firstString(
    mortgage.loan_type,
    mortgage.loanType,
    scenario.loanType,
    scenario.loan_type,
    contextScenario.loanType,
    contextScenario.loan_type,
    profile.loanType,
    profile.loan_type,
    contextProfile.loanType,
    contextProfile.loan_type,
    fallbackPacket.mortgage?.loan_type,
    extractLoanTypeFromMessage(message)
  ));
  if (loanType) patch.last_loan_type = loanType;

  const pcsTimelineMonths = firstPositiveNumber(
    scenario.pcsTimelineMonths,
    scenario.pcs_timeline_months,
    contextScenario.pcsTimelineMonths,
    contextScenario.pcs_timeline_months,
    profile.pcsTimelineMonths,
    profile.pcs_timeline_months,
    contextProfile.pcsTimelineMonths,
    contextProfile.pcs_timeline_months,
    extractTimelineMonthsFromMessage(message)
  );
  if (pcsTimelineMonths !== null) patch.last_pcs_timeline_months = clampNumber(pcsTimelineMonths, 1, 120, pcsTimelineMonths);

  if (Object.keys(patch).length) patch.last_updated_at = new Date().toISOString();

  return sanitizeMemory(filterAllowedMemoryPatch(patch));
}

function extractPublicTruthPacket(deterministic) {
  if (!isPlainObject(deterministic)) return {};
  if (isPlainObject(deterministic.public)) return deterministic.public;
  if (isPlainObject(deterministic.truth_packet)) return deterministic.truth_packet;
  return deterministic;
}

function extractScenario(deterministic) {
  if (!isPlainObject(deterministic)) return {};
  if (isPlainObject(deterministic.scenario)) return deterministic.scenario;
  if (isPlainObject(deterministic.internal?.scenario)) return deterministic.internal.scenario;
  if (isPlainObject(deterministic.public?.scenario)) return deterministic.public.scenario;
  return {};
}

function normalizeMemoryLabel(value, maxLength = 80) {
  return cleanLooseString(value, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isUsefulFollowUpTopic(intent) {
  return Boolean(intent && !["unknown", "general", "general_guidance", "greeting"].includes(intent));
}

function normalizeLoanType(value) {
  const s = normalizeMemoryLabel(value, 40);
  if (!s) return "";

  if (s.includes("va")) return "va";
  if (s.includes("fha")) return "fha";
  if (s.includes("usda")) return "usda";
  if (s.includes("conv")) return "conventional";

  return s.slice(0, 40);
}

function extractHomePriceFromMessage(message) {
  const text = cleanLooseString(message, 500);
  if (!text) return null;

  const match = text.match(/(?:\$?\s*)(\d{2,3}(?:,\d{3})+|\d{3,6})(?:\s*(k|thousand))?(?:\s*(?:home|house|price|mortgage|purchase))?/i);
  if (!match) return null;

  let value = toFiniteNumber(match[1]);
  if (value === null) return null;
  if (match[2]) value *= 1000;

  return value >= 50000 ? value : null;
}

function extractCreditScoreFromMessage(message) {
  const text = cleanLooseString(message, 500);
  if (!text) return null;

  const match = text.match(/\b(?:credit(?:\s*score)?|fico|score)\D{0,16}([3-8]\d{2})\b/i);
  if (!match) return null;

  return toFiniteNumber(match[1]);
}

function extractLoanTypeFromMessage(message) {
  const text = lowerKey(message);
  if (!text) return "";

  if (/\bva\b|va loan/.test(text)) return "va";
  if (/\bfha\b/.test(text)) return "fha";
  if (/\busda\b/.test(text)) return "usda";
  if (/\bconventional\b/.test(text)) return "conventional";

  return "";
}

function extractTimelineMonthsFromMessage(message) {
  const text = cleanLooseString(message, 500);
  if (!text) return null;

  const match = text.match(/\b(?:pcs|move|moving|relocat(?:e|ing)|timeline)\D{0,24}(\d{1,2})\s*(months?|mos?|m)\b/i);
  if (match) return toFiniteNumber(match[1]);

  const reverse = text.match(/\b(\d{1,2})\s*(months?|mos?|m)\D{0,24}(?:pcs|move|moving|relocat(?:e|ing))\b/i);
  return reverse ? toFiniteNumber(reverse[1]) : null;
}

function filterAllowedMemoryPatch(patch) {
  const out = {};

  for (const [key, value] of Object.entries(patch || {})) {
    if (MEMORY_PATCH_KEYS.has(key)) out[key] = value;
  }

  return out;
}

// ============================================================
// //#7) RESPONSE LIMITS, MODES, AND STYLE HINTS
// ============================================================

export function sanitizeResponseLimits(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const directMax = !isPlainObject(raw) && raw !== undefined ? raw : undefined;

  return {
    max_chars: clampNumber(
      firstDefined(source.max_chars, source.maxChars, source.max, directMax),
      240,
      1600,
      DEFAULT_MAX_REPLY_CHARS
    ),
    greeting_max_chars: clampNumber(
      firstDefined(source.greeting_max_chars, source.greetingMaxChars, source.greetingMax),
      100,
      500,
      220
    ),
    max_follow_up_questions: clampNumber(
      firstDefined(source.max_follow_up_questions, source.maxFollowUpQuestions, source.follow_up_questions),
      0,
      2,
      1
    )
  };
}

export function sanitizeRequestedMode(value, defaultMode = "member_guidance") {
  const fallback = APPROVED_MODES.includes(defaultMode) ? defaultMode : "member_guidance";
  const mode = cleanLooseString(value, 80).toLowerCase().replace(/[\s-]+/g, "_");

  return APPROVED_MODES.includes(mode) ? mode : fallback;
}

export function sanitizeClientStyleGuide(raw) {
  const hints = collectStyleHints(raw);
  const allowed = [];
  const ignored = [];

  const allowedRe = /\b(short|plain|one\s*question|pcs|housing|concise|bluf)\b/i;
  const rejectedRe = /\b(ignore\s+(?:the\s+)?system|system\s+prompt|invent\s+(?:numbers|data)|make\s+up|skip\s+(?:the\s+)?disclaimer|no\s+disclaimer|reveal\s+(?:the\s+)?prompt|approval|override\s+(?:engines|tools|system)|load\s+another\s+user|increase\s+exposure|jailbreak|secret|token)\b/i;

  for (const hint of hints) {
    if (rejectedRe.test(hint)) {
      ignored.push(hint);
    } else if (allowedRe.test(hint)) {
      allowed.push(hint);
    } else {
      ignored.push(hint);
    }
  }

  return {
    allowed_hints: uniqueStrings(allowed, 160),
    ignored: uniqueStrings(ignored, 160)
  };
}

function collectStyleHints(raw) {
  if (raw === undefined || raw === null || raw === "") return [];

  if (typeof raw === "string") {
    return raw
      .split(/[,\n;]/)
      .map((item) => normalizeSpaces(item, 160))
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => collectStyleHints(item)).slice(0, 20);
  }

  if (isPlainObject(raw)) {
    const out = [];

    for (const [key, value] of Object.entries(raw)) {
      if (DANGEROUS_KEYS.has(key)) continue;

      if (value === true) out.push(normalizeSpaces(key, 160));
      else if (typeof value === "string" || typeof value === "number") out.push(normalizeSpaces(value, 160));
      else if (Array.isArray(value)) out.push(...collectStyleHints(value));
    }

    return out.slice(0, 20);
  }

  return [];
}

// ============================================================
// //#8) CLIENT PROVIDED STRUCTURED PACKETS
// ============================================================

export function normalizeProvidedCompensationPacket(raw) {
  if (!isPlainObject(raw)) return null;

  const monthly = isPlainObject(raw.monthly) ? raw.monthly : {};
  const pay = isPlainObject(raw.pay) ? raw.pay : {};
  const input = isPlainObject(raw.input) ? raw.input : {};

  const out = stripEmptyObject({
    total_monthly: positiveMoney(firstPositiveNumber(
      raw.total_monthly,
      raw.totalMonthly,
      raw.monthly_total,
      raw.monthlyTotal,
      raw.total,
      raw.totalCompensationMonthly,
      monthly.total,
      monthly.total_monthly,
      monthly.totalMonthly
    )),
    base_pay: positiveMoney(firstPositiveNumber(raw.base_pay, raw.basePay, pay.base_pay, pay.basePay, monthly.base_pay, monthly.basePay)),
    bas: positiveMoney(firstPositiveNumber(raw.bas, raw.bAS, pay.bas, monthly.bas)),
    bah: positiveMoney(firstPositiveNumber(raw.bah, raw.bah_monthly, raw.bahMonthly, pay.bah, monthly.bah)),
    va_disability_monthly: positiveMoney(firstPositiveNumber(
      raw.va_disability_monthly,
      raw.vaDisabilityMonthly,
      raw.va_compensation_monthly,
      raw.vaCompensationMonthly,
      monthly.va_disability,
      monthly.vaDisability
    )),
    rank_paygrade: normalizePaygrade(firstString(raw.rank_paygrade, raw.rankPaygrade, raw.paygrade, raw.rank, input.rank, input.paygrade)),
    yos: nonNegativeNumber(firstNumber(raw.yos, raw.years_of_service, raw.yearsOfService, input.yos, input.years_of_service)),
    base: firstString(raw.base, raw.duty_base, raw.dutyBase, input.base, input.duty_base).slice(0, 160),
    zip: normalizeZip(firstString(raw.zip, raw.duty_zip, raw.dutyZip, raw.bah_zip, input.zip, input.duty_zip)),
    with_dependents: normalizeBoolean(firstDefined(
      raw.with_dependents,
      raw.withDependents,
      raw.has_dependents,
      raw.hasDependents,
      raw.dependents,
      input.with_dependents,
      input.dependents
    ))
  });

  if (!Object.keys(out).length) return null;

  return {
    ...out,
    provenance: {
      type: "client_structured_output",
      engine: "client",
      official_data_used: null
    }
  };
}

export function normalizeProvidedMortgagePacket(raw) {
  if (!isPlainObject(raw)) return null;

  const normalized = normalizeMortgageLikePacket(raw, null, "client");
  if (!normalized) return null;

  return {
    ...normalized,
    provenance: {
      type: "client_structured_output",
      engine: "client",
      official_data_used: null
    }
  };
}

function positiveMoney(value) {
  if (value === null || value === undefined) return undefined;
  return value > 0 ? roundMoney(value) : undefined;
}

function nonNegativeNumber(value) {
  if (value === null || value === undefined || value < 0) return undefined;
  return Number(value);
}

function normalizePaygrade(value) {
  const raw = cleanLooseString(value, 20).toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";

  const match = raw.match(/^([EOW])-?(\d{1,2})(E)?$/);
  return match ? `${match[1]}-${match[2]}${match[3] || ""}` : raw;
}

function normalizeZip(value) {
  const raw = cleanLooseString(value, 20);
  if (!raw) return "";

  const digits = raw.match(/\d{5}/);
  return digits ? digits[0] : raw.slice(0, 20);
}

// ============================================================
// //#9) MORTGAGE ENGINE RESULT NORMALIZATION
// ============================================================

export function normalizeMortgageEngineResult(result, input, sourceLabel) {
  const rawResult = isPlainObject(result?.result) ? result.result : result;
  if (!isPlainObject(rawResult)) return null;

  const normalized = normalizeMortgageLikePacket(rawResult, input, sourceLabel || "mortgage-engine");
  if (!normalized) return null;

  return {
    ...normalized,
    provenance: {
      type: "calculated",
      engine: sourceLabel || "mortgage-engine",
      official_data_used: false
    }
  };
}

function normalizeMortgageLikePacket(raw, input, sourceLabel) {
  const monthly = isPlainObject(raw.monthly) ? raw.monthly : {};
  const breakdown = isPlainObject(raw.breakdown) ? raw.breakdown : {};
  const mortgage = isPlainObject(raw.mortgage) ? raw.mortgage : {};
  const summary = isPlainObject(raw.summary) ? raw.summary : {};
  const inputs = isPlainObject(raw.inputs) ? raw.inputs : (isPlainObject(input) ? input : {});
  const hasNestedDetail = Object.keys(monthly).length > 0 || Object.keys(breakdown).length > 0;

  let allIn = firstPositiveNumber(
    monthly.all_in_monthly,
    monthly.allInMonthly,
    monthly.allIn,
    monthly.totalPayment,
    monthly.total_payment,
    monthly.totalMonthly,
    monthly.monthlyPayment,
    breakdown.allIn,
    breakdown.all_in,
    breakdown.total,
    raw.all_in_monthly,
    raw.allInMonthly,
    raw.allIn,
    raw.totalPayment,
    raw.total_payment,
    raw.totalMonthly,
    raw.monthly_payment,
    raw.monthlyPayment,
    summary.monthlyPayment,
    summary.monthly_payment
  );

  const components = {
    principal_interest: pickMortgageComponent([
      monthly.principal_interest,
      monthly.principalInterest,
      monthly.pi,
      breakdown.principal_interest,
      breakdown.principalInterest,
      breakdown.pi,
      raw.principal_interest,
      raw.principalInterest,
      raw.pi
    ]),
    taxes: pickMortgageComponent([
      monthly.taxes,
      monthly.tax,
      monthly.property_tax,
      monthly.propertyTax,
      breakdown.taxes,
      breakdown.tax,
      breakdown.property_tax,
      breakdown.propertyTax,
      raw.taxes,
      raw.tax,
      raw.property_tax,
      raw.propertyTax
    ]),
    insurance: pickMortgageComponent([
      monthly.insurance,
      monthly.home_insurance,
      monthly.homeInsurance,
      breakdown.insurance,
      raw.insurance,
      raw.home_insurance,
      raw.homeInsurance
    ]),
    hoa: pickMortgageComponent([
      monthly.hoa,
      monthly.hoa_monthly,
      monthly.hoaMonthly,
      breakdown.hoa,
      raw.hoa,
      raw.hoa_monthly,
      raw.hoaMonthly
    ]),
    pmi: pickMortgageComponent([
      monthly.pmi,
      breakdown.pmi,
      raw.pmi,
      raw.pmi_monthly,
      raw.pmiMonthly
    ])
  };

  const hasCompleteComponents =
    components.principal_interest !== null &&
    components.taxes !== null &&
    components.insurance !== null;

  if ((allIn === null || allIn <= 0) && hasCompleteComponents) {
    allIn =
      Math.max(0, components.principal_interest) +
      Math.max(0, components.taxes) +
      Math.max(0, components.insurance) +
      Math.max(0, components.hoa || 0) +
      Math.max(0, components.pmi || 0);
  }

  if (!allIn || allIn <= 0) return null;
  if (!hasCompleteComponents && !allIn) return null;

  const out = {
    all_in_monthly: roundMoney(allIn)
  };

  const piTaxBothZero =
    allIn > 0 &&
    components.principal_interest === 0 &&
    components.taxes === 0;

  for (const [key, value] of Object.entries(components)) {
    if (value === null) continue;

    if (allIn > 0 && value === 0 && !hasNestedDetail) continue;
    if (piTaxBothZero && (key === "principal_interest" || key === "taxes")) continue;

    out[key] = roundMoney(value);
  }

  const details = stripEmptyObject({
    price: positiveMoney(firstPositiveNumber(mortgage.price, raw.price, raw.home_price, raw.homePrice, inputs.price, inputs.home_price, inputs.homePrice)),
    downpayment: positiveMoney(firstPositiveNumber(mortgage.downpayment, mortgage.downPayment, raw.downpayment, raw.downPayment, inputs.downpayment, inputs.downPayment)),
    credit_score: validCreditScore(firstNumber(mortgage.credit_score, mortgage.creditScore, raw.credit_score, raw.creditScore, inputs.credit_score, inputs.creditScore)),
    loan_type: normalizeLoanType(firstString(mortgage.loan_type, mortgage.loanType, raw.loan_type, raw.loanType, inputs.loan_type, inputs.loanType)),
    apr: validApr(firstNumber(mortgage.apr, raw.apr, raw.rate, inputs.apr, inputs.rate)),
    term_years: validTermYears(firstNumber(mortgage.term_years, mortgage.termYears, raw.term_years, raw.termYears, inputs.term_years, inputs.termYears))
  });

  return stripEmptyObject({
    ...out,
    ...details
  });
}

function pickMortgageComponent(values) {
  for (const value of values) {
    const n = toFiniteNumber(value);
    if (n !== null && n >= 0) return n;
  }

  return null;
}

function validCreditScore(value) {
  if (value === null || value === undefined) return undefined;
  return value >= 300 && value <= 850 ? roundWhole(value) : undefined;
}

function validApr(value) {
  if (value === null || value === undefined) return undefined;
  return value > 0 && value < 30 ? roundMoney(value) : undefined;
}

function validTermYears(value) {
  if (value === null || value === undefined) return undefined;
  return value >= 1 && value <= 40 ? roundWhole(value) : undefined;
}

// ============================================================
// //#10) PROFILE REDACTION FOR OPENAI AND PUBLIC RESPONSES
// ============================================================

export function buildOpenAIProfile(profile, intent = "") {
  if (!isPlainObject(profile)) return {};

  const relevant = profileRelevance(intent);
  const out = stripEmptyObject({
    mode: firstString(profile.mode, profile.status, profile.member_status).slice(0, 80),
    rank_paygrade: normalizePaygrade(firstString(profile.rank_paygrade, profile.rankPaygrade, profile.paygrade, profile.rank)),
    yos: nonNegativeNumber(firstNumber(profile.yos, profile.years_of_service, profile.yearsOfService)),
    family: firstString(profile.family, profile.family_status, profile.familyStatus).slice(0, 80),
    family_size: nonNegativeNumber(firstNumber(profile.family_size, profile.familySize, profile.dependents_count, profile.dependents)),
    base: firstString(profile.base, profile.duty_base, profile.dutyBase).slice(0, 160),
    zip: relevant.needsZip ? normalizeZip(firstString(profile.zip, profile.duty_zip, profile.dutyZip, profile.bah_zip)) : "",
    va_disability: relevant.needsVa ? validVaDisability(firstNumber(profile.va_disability, profile.vaDisability, profile.va_rating, profile.vaRating)) : undefined,
    funding_fee_exempt: relevant.needsVa ? normalizeBoolean(firstDefined(profile.funding_fee_exempt, profile.fundingFeeExempt, profile.va_funding_fee_exempt)) : undefined,
    projected_home_price: positiveMoney(firstPositiveNumber(profile.projected_home_price, profile.projectedHomePrice, profile.home_price, profile.homePrice)),
    downpayment: nonNegativeMoney(firstNumber(profile.downpayment, profile.down_payment, profile.downPayment)),
    credit_score: validCreditScore(firstNumber(profile.credit_score, profile.creditScore)),
    monthly_expenses: nonNegativeMoney(firstNumber(profile.monthly_expenses, profile.monthlyExpenses, profile.expenses)),
    debt: nonNegativeMoney(firstNumber(profile.debt, profile.monthly_debt, profile.monthlyDebt, profile.debt_payment)),
    pcsTimelineMonths: validSmallMonths(firstNumber(profile.pcsTimelineMonths, profile.pcs_timeline_months)),
    expectedHoldMonths: validSmallMonths(firstNumber(profile.expectedHoldMonths, profile.expected_hold_months)),
    loanType: normalizeLoanType(firstString(profile.loanType, profile.loan_type)),
    termYears: validTermYears(firstNumber(profile.termYears, profile.term_years))
  });

  return out;
}

export function buildPublicProfileUsed(profile, intent = "") {
  if (!isPlainObject(profile)) return {};

  const relevant = profileRelevance(intent);

  return stripEmptyObject({
    mode: firstString(profile.mode, profile.status, profile.member_status).slice(0, 80),
    rank_paygrade: normalizePaygrade(firstString(profile.rank_paygrade, profile.rankPaygrade, profile.paygrade, profile.rank)),
    yos: nonNegativeNumber(firstNumber(profile.yos, profile.years_of_service, profile.yearsOfService)),
    family: firstString(profile.family, profile.family_status, profile.familyStatus).slice(0, 80),
    family_size: nonNegativeNumber(firstNumber(profile.family_size, profile.familySize, profile.dependents_count, profile.dependents)),
    base: firstString(profile.base, profile.duty_base, profile.dutyBase).slice(0, 160),
    zip: relevant.needsZip ? normalizeZip(firstString(profile.zip, profile.duty_zip, profile.dutyZip, profile.bah_zip)) : "",
    projected_home_price: positiveMoney(firstPositiveNumber(profile.projected_home_price, profile.projectedHomePrice, profile.home_price, profile.homePrice)),
    downpayment: nonNegativeMoney(firstNumber(profile.downpayment, profile.down_payment, profile.downPayment)),
    credit_score: validCreditScore(firstNumber(profile.credit_score, profile.creditScore)),
    monthly_expenses: nonNegativeMoney(firstNumber(profile.monthly_expenses, profile.monthlyExpenses, profile.expenses)),
    debt: nonNegativeMoney(firstNumber(profile.debt, profile.monthly_debt, profile.monthlyDebt, profile.debt_payment)),
    loanType: normalizeLoanType(firstString(profile.loanType, profile.loan_type)),
    termYears: validTermYears(firstNumber(profile.termYears, profile.term_years)),
    pcsTimelineMonths: validSmallMonths(firstNumber(profile.pcsTimelineMonths, profile.pcs_timeline_months)),
    expectedHoldMonths: validSmallMonths(firstNumber(profile.expectedHoldMonths, profile.expected_hold_months)),
    funding_fee_exempt: relevant.needsVa ? normalizeBoolean(firstDefined(profile.funding_fee_exempt, profile.fundingFeeExempt, profile.va_funding_fee_exempt)) : undefined
  });
}

function profileRelevance(intent) {
  const s = lowerKey(intent).replace(/[_-]+/g, " ");
  return {
    needsZip: /\b(housing|mortgage|afford|bah|compensation|pcs|rent|buy|loan|va)\b/.test(s),
    needsVa: /\b(va|mortgage|housing|loan|funding)\b/.test(s)
  };
}

function nonNegativeMoney(value) {
  if (value === null || value === undefined || value < 0) return undefined;
  return roundMoney(value);
}

function validVaDisability(value) {
  if (value === null || value === undefined || value < 0 || value > 100) return undefined;
  return roundWhole(value);
}

function validSmallMonths(value) {
  if (value === null || value === undefined || value <= 0 || value > 240) return undefined;
  return roundWhole(value);
}

// ============================================================
// //#11) REPLY LIMIT ENFORCEMENT
// ============================================================

export function enforceReplyLimits(reply, limits = {}) {
  const safeLimits = sanitizeResponseLimits(limits);
  const intent = cleanLooseString(limits.intent, 80);
  const maxFollowUpQuestions = safeLimits.max_follow_up_questions;
  const maxChars = isGreetingReply(reply, intent) ? safeLimits.greeting_max_chars : safeLimits.max_chars;
  const original = cleanString(reply, 10000);

  if (!original) return "";

  const questionLimited = limitFollowUpQuestions(original, maxFollowUpQuestions);
  if (questionLimited.length <= maxChars) return questionLimited;

  const disclaimer = findShortTrailingDisclaimer(questionLimited);
  return truncateReply(questionLimited, maxChars, disclaimer);
}

function isGreetingReply(reply, intent) {
  const s = lowerKey(intent);
  if (/\b(greeting|hello|intro|welcome)\b/.test(s)) return true;

  const text = lowerKey(reply).slice(0, 80);
  return /^(hi|hello|hey|welcome)\b/.test(text);
}

function limitFollowUpQuestions(text, maxQuestions) {
  if (maxQuestions >= 2) return text;

  const sentences = splitSentences(text);
  let questions = 0;
  const kept = [];

  for (const sentence of sentences) {
    if (/\?\s*$/.test(sentence)) {
      questions += 1;
      if (questions > maxQuestions) continue;
    }

    kept.push(sentence);
  }

  return kept.join(" ").replace(/\s+\n/g, "\n").trim();
}

function splitSentences(text) {
  const normalized = cleanString(text, 10000).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const matches = normalized.match(/[^.!?]+[.!?]+["')\]]?|[^.!?]+$/g);
  return (matches || [normalized]).map((item) => item.trim()).filter(Boolean);
}

function findShortTrailingDisclaimer(text) {
  const sentences = splitSentences(text);
  const candidates = sentences.slice(-3);

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const sentence = candidates[i];
    if (
      sentence.length <= 220 &&
      /\b(estimate|planning estimate|not\s+(?:a\s+)?(?:loan\s+)?approval|not\s+lender|not\s+financial\s+advice)\b/i.test(sentence)
    ) {
      return sentence;
    }
  }

  return "";
}

function truncateReply(text, maxChars, requiredEnding = "") {
  const sentences = splitSentences(text);
  const ending = requiredEnding && requiredEnding.length < maxChars ? requiredEnding : "";
  const endingReserve = ending ? ending.length + 1 : 0;
  const limit = Math.max(0, maxChars - endingReserve);
  const kept = [];
  let length = 0;
  let omitted = false;

  for (const sentence of sentences) {
    if (ending && sentence === ending) {
      omitted = true;
      continue;
    }

    const nextLength = length + (kept.length ? 1 : 0) + sentence.length;
    if (nextLength > limit) {
      omitted = true;
      break;
    }

    kept.push(sentence);
    length = nextLength;
  }

  if (ending && kept.join(" ").length + endingReserve <= maxChars) {
    kept.push(ending);
  }

  const sentenceText = kept.join(" ").trim();
  if (sentenceText) return sentenceText.slice(0, maxChars).trim();

  const cut = safeTextCut(text, maxChars - 3);
  return `${cut}${omitted || text.length > maxChars ? "..." : ""}`.slice(0, maxChars).trim();
}

function safeTextCut(text, maxChars) {
  const source = cleanString(text, 10000).replace(/\s+/g, " ").trim();
  if (source.length <= maxChars) return source;

  const window = source.slice(0, Math.max(0, maxChars));
  const boundary = Math.max(
    window.lastIndexOf(" "),
    window.lastIndexOf("."),
    window.lastIndexOf(","),
    window.lastIndexOf(";"),
    window.lastIndexOf(":")
  );

  const cutAt = boundary > Math.floor(maxChars * 0.6) ? boundary : maxChars;
  return window.slice(0, cutAt).replace(/[$\d.,]+$/, "").replace(/\w+$/, "").trim();
}

// ============================================================
// //#12) DEBUG AND WARNING HELPERS
// ============================================================

export function buildSafeDebug({
  intent,
  registryLoaded,
  supabaseAttempted,
  supabaseLoaded,
  usedOpenAI,
  latencyMs,
  warnings,
  toolPath
} = {}) {
  return stripEmptyObject({
    intent: cleanLooseString(intent, 80) || null,
    registry_loaded: Boolean(registryLoaded),
    supabase_attempted: Boolean(supabaseAttempted),
    supabase_loaded: Boolean(supabaseLoaded),
    used_openai: Boolean(usedOpenAI),
    latency_ms: toFiniteNumber(latencyMs),
    warnings: uniqueWarnings(warnings),
    tool_path: cleanLooseString(toolPath, 240) || null
  });
}

export function uniqueWarnings(list) {
  return uniqueStrings(list, 300);
}

// ============================================================
// //#13) RESPONSE ENVELOPES
// ============================================================

export function buildResponseEnvelope(args = {}) {
  const responseLimits = sanitizeResponseLimits(args.response_limits || args.responseLimits);
  const mode = sanitizeRequestedMode(args.mode || args.requested_mode, "member_guidance");
  const intent = cleanLooseString(args.intent, 80);
  const rawReply = cleanString(firstDefined(args.reply, args.answer, ""), 10000);
  const reply = enforceReplyLimits(rawReply, {
    intent,
    ...responseLimits
  });
  const memoryPatch = sanitizeMemory(args.memory_patch || args.memoryPatch || {});
  const memoryEcho = sanitizeMemory(args.memory_echo || args.memoryEcho || {});

  const envelope = {
    ok: true,
    agent: args.agent || "Amy",
    display_name: args.display_name || args.displayName || "PCSUnited AI Concierge",
    brand: args.brand || "PCSUnited",
    powered_by: args.powered_by || args.poweredBy || "TheWing.ai",
    endpoint: "agent-amy",
    version: cleanLooseString(args.version, 80) || null,
    response_contract: cleanLooseString(args.response_contract || args.responseContract, 120) || RESPONSE_CONTRACT_VERSION,
    mode,
    intent,
    reply,
    answer: args.answer !== undefined ? args.answer : reply,
    profile_used: sanitizeResponseProfile(args.profile_used || args.profileUsed || args.profile, intent),
    truth_packet: sanitizeResponsePacket(args.truth_packet || args.truthPacket || null),
    context_used: sanitizeMemory(args.context_used || args.contextUsed || {}),
    conversation_id: cleanLooseString(args.conversation_id || args.conversationId, 200) || null,
    memory_patch: memoryPatch,
    memory_echo: memoryEcho,
    ui: { ...DEFAULT_UI },
    warnings: uniqueWarnings(args.warnings),
    latency_ms: toFiniteNumber(args.latency_ms || args.latencyMs)
  };

  if (args.debug) {
    envelope.debug = buildSafeDebug(args.debug);
  }

  return envelope;
}

export function buildErrorEnvelope(args = {}) {
  return {
    ok: false,
    agent: args.agent || "Amy",
    endpoint: "agent-amy",
    version: cleanLooseString(args.version, 80) || null,
    response_contract: cleanLooseString(args.response_contract || args.responseContract, 120) || RESPONSE_CONTRACT_VERSION,
    error: cleanLooseString(args.error || args.message, 500) || "Request failed",
    code: cleanLooseString(args.code, 80) || "ASK_AMY_ERROR",
    conversation_id: cleanLooseString(args.conversation_id || args.conversationId, 200) || null,
    memory_patch: {},
    memory_echo: sanitizeMemory(args.memory_echo || args.memoryEcho || {}),
    ui: { ...DEFAULT_UI }
  };
}

function sanitizeResponseProfile(profile, intent) {
  if (!isPlainObject(profile)) return {};
  return buildPublicProfileUsed(profile, intent);
}

function sanitizeResponsePacket(packet) {
  if (packet === null || packet === undefined) return null;
  if (!isPlainObject(packet)) return null;
  return sanitizeMemory(packet);
}

// ============================================================
// //#14) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RESPONSE_CONTRACT_VERSION,
  DEFAULT_MAX_REPLY_CHARS,
  MAX_THREAD_MESSAGES,
  MAX_THREAD_MESSAGE_LENGTH,
  MAX_MEMORY_KEYS,
  MAX_MEMORY_STRING_LENGTH,
  DEFAULT_UI,
  APPROVED_MODES,

  parseClientConversationContext,
  sanitizeThread,
  normalizeHistoricalThread,
  removeDuplicateCurrentMessage,
  sanitizeMemory,
  mergeSafeMemory,
  buildMemoryPatch,
  sanitizeResponseLimits,
  sanitizeRequestedMode,
  sanitizeClientStyleGuide,
  normalizeProvidedCompensationPacket,
  normalizeProvidedMortgagePacket,
  normalizeMortgageEngineResult,
  buildOpenAIProfile,
  buildPublicProfileUsed,
  enforceReplyLimits,
  buildSafeDebug,
  buildResponseEnvelope,
  buildErrorEnvelope,
  uniqueWarnings,
  isPlainObject
});
