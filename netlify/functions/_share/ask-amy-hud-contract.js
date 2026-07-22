// netlify/functions/_share/ask-amy-hud-contract.js
// ============================================================
// TheWing.ai • Ask Amy HUD Contract Helpers (v1.5)
// PURPOSE:
// - Pure sanitizers and contract helpers for agent-amy.js v1.5
// - Safe conversation/memory/origin/response-limit handling
// - No OpenAI, no Supabase, no official-rate math
// ============================================================

export const RESPONSE_CONTRACT_VERSION = "ask-amy-response-v1";
export const DEFAULT_MAX_REPLY_CHARS = 720;
export const MAX_THREAD_MESSAGES = 12;
export const MAX_THREAD_MESSAGE_LENGTH = 2000;
export const MAX_MEMORY_KEYS = 40;
export const MAX_MEMORY_STRING_LENGTH = 1000;
export const MAX_CONVERSATION_ID_LENGTH = 200;
export const DEFAULT_UI = Object.freeze({ speed: 18, startDelay: 80 });

const APPROVED_MODES = new Set([
  "member_guidance",
  "planner",
  "coach",
  "mortgage_guidance",
  "housing_guidance",
  "financial_readiness",
  "education"
]);

const SAFE_STYLE_HINTS = [
  "short answers",
  "plain language",
  "one question",
  "pcs focus",
  "housing focus",
  "concise",
  "bluf",
  "practical",
  "military-aware"
];

const BLOCKED_STYLE_PATTERNS = [
  /ignore (all )?(system|previous|safety)/i,
  /reveal (the )?(system|prompt|rules)/i,
  /invent|fabricate|make up/i,
  /skip (the )?disclaimer/i,
  /approve(d)? (the )?loan/i,
  /another user|other member|load .*profile/i,
  /override (official|engine|truth)/i,
  /change identity/i
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function safeStr(value) {
  return String(value ?? "").trim();
}

export function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function isAllowedOrigin(origin, allowOrigins = []) {
  const cleanOrigin = safeStr(origin);
  if (!cleanOrigin) return { allowed: true, mode: "server" };
  if (allowOrigins.includes(cleanOrigin)) {
    return { allowed: true, mode: "browser", origin: cleanOrigin };
  }
  return { allowed: false, mode: "browser", origin: cleanOrigin };
}

export function sanitizeRequestedMode(value, fallback = "member_guidance") {
  const mode = safeStr(value).toLowerCase().replace(/\s+/g, "_");
  return APPROVED_MODES.has(mode) ? mode : fallback;
}

export function sanitizeResponseLimits(raw = {}, defaults = {}) {
  const source = isPlainObject(raw) ? raw : {};
  const maxChars = clamp(
    num(source.max_chars) ?? defaults.max_chars ?? DEFAULT_MAX_REPLY_CHARS,
    240,
    1600
  );
  const greetingMaxChars = clamp(
    num(source.greeting_max_chars) ?? defaults.greeting_max_chars ?? 220,
    100,
    500
  );
  const maxFollowUps = clamp(
    num(source.max_follow_up_questions) ??
      defaults.max_follow_up_questions ??
      1,
    0,
    2
  );

  return {
    max_chars: maxChars,
    greeting_max_chars: greetingMaxChars,
    max_follow_up_questions: maxFollowUps
  };
}

export function sanitizeThread(rawThread) {
  if (!Array.isArray(rawThread)) return [];

  const out = [];
  for (const item of rawThread) {
    if (!isPlainObject(item)) continue;
    const role = safeStr(item.role).toLowerCase();
    if (role !== "user" && role !== "assistant") continue;
    const content = safeStr(item.content).slice(0, MAX_THREAD_MESSAGE_LENGTH);
    if (!content) continue;
    out.push({ role, content });
  }

  return out.slice(-MAX_THREAD_MESSAGES);
}

export function normalizeHistoricalThread(thread, currentMessage) {
  const sanitized = sanitizeThread(thread);
  const current = safeStr(currentMessage);
  if (!sanitized.length || !current) return sanitized;

  const last = sanitized[sanitized.length - 1];
  if (last.role === "user" && safeStr(last.content) === current) {
    return sanitized.slice(0, -1);
  }
  return sanitized;
}

export function removeDuplicateCurrentMessage(thread, currentMessage) {
  return normalizeHistoricalThread(thread, currentMessage);
}

function sanitizeMemoryValue(value, depth = 0) {
  if (depth > 3) return undefined;
  if (value === null) return null;
  const t = typeof value;
  if (t === "string") return value.slice(0, MAX_MEMORY_STRING_LENGTH);
  if (t === "number") return Number.isFinite(value) ? value : undefined;
  if (t === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.length > 20) return undefined;
    const arr = [];
    for (const item of value) {
      const itemType = typeof item;
      if (
        item === null ||
        itemType === "string" ||
        itemType === "number" ||
        itemType === "boolean"
      ) {
        const cleaned = sanitizeMemoryValue(item, depth + 1);
        if (cleaned !== undefined) arr.push(cleaned);
      }
    }
    return arr;
  }
  if (!isPlainObject(value)) return undefined;

  const out = {};
  const keys = Object.keys(value).slice(0, MAX_MEMORY_KEYS);
  for (const key of keys) {
    if (
      key === "__proto__" ||
      key === "constructor" ||
      key === "prototype" ||
      key.startsWith("__")
    ) {
      continue;
    }
    const cleaned = sanitizeMemoryValue(value[key], depth + 1);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

export function sanitizeMemory(rawMemory) {
  if (!isPlainObject(rawMemory)) return {};
  const cleaned = sanitizeMemoryValue(rawMemory, 0);
  return isPlainObject(cleaned) ? cleaned : {};
}

export function sanitizeClientStyleGuide(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const rules = Array.isArray(source.rules)
    ? source.rules
    : Array.isArray(source)
      ? source
      : typeof source === "string"
        ? [source]
        : [];

  const allowed = [];
  for (const rule of rules) {
    const text = safeStr(rule);
    if (!text || text.length > 120) continue;
    if (BLOCKED_STYLE_PATTERNS.some((re) => re.test(text))) continue;
    const lower = text.toLowerCase();
    const harmless =
      SAFE_STYLE_HINTS.some((hint) => lower.includes(hint)) ||
      /short|plain|concise|pcs|housing|one question|bluf|practical/i.test(text);
    if (harmless) allowed.push(text);
  }

  return {
    preferences: allowed.slice(0, 8),
    tone: safeStr(source.tone).slice(0, 40) || null
  };
}

export function parseClientConversationContext(body = {}, defaults = {}) {
  const context =
    body?.context && typeof body.context === "object" ? body.context : {};

  const conversationId = safeStr(
    context.conversation_id || body.conversation_id || ""
  ).slice(0, MAX_CONVERSATION_ID_LENGTH);

  const responseContract = safeStr(
    context.response_contract ||
      body.response_contract ||
      RESPONSE_CONTRACT_VERSION
  ) || RESPONSE_CONTRACT_VERSION;

  return {
    conversation_id: conversationId || null,
    thread: sanitizeThread(context.thread || body.thread),
    memory: sanitizeMemory(context.memory || body.memory),
    response_contract: responseContract,
    response_limits: sanitizeResponseLimits(
      context.response_limits || body.response_limits,
      defaults
    ),
    requested_mode: sanitizeRequestedMode(
      context.requested_mode || body.requested_mode || body.mode,
      defaults.default_mode || "member_guidance"
    ),
    style_guide: sanitizeClientStyleGuide(
      context.styleGuide || context.style_guide || body.styleGuide
    ),
    page: safeStr(context.page || body.page).slice(0, 120) || null,
    widget: safeStr(context.widget || body.widget).slice(0, 120) || null,
    product: safeStr(context.product || body.product).slice(0, 120) || null,
    client_version: safeStr(context.version || body.client_version).slice(0, 40) || null
  };
}

export function mergeSafeMemory(existingMemory, patch) {
  const base = sanitizeMemory(existingMemory);
  const safePatch = sanitizeMemory(patch);
  return {
    ...base,
    ...safePatch
  };
}

export function buildMemoryPatch({
  message,
  intent,
  normalizedProfile = {},
  deterministic = {},
  conversationContext = {}
}) {
  const scenario = deterministic?.internal?.scenario || {};
  const housing = deterministic?.public?.housing_inputs || {};
  const patch = {};

  if (intent) patch.last_intent = safeStr(intent);
  const base = safeStr(
    scenario.base || normalizedProfile.base || housing.base || ""
  );
  if (base) patch.last_base = base;

  const price = num(
    scenario.price ||
      housing.price ||
      normalizedProfile.projected_home_price
  );
  if (price && price > 0) patch.last_target_home_price = price;

  const credit = num(
    scenario.creditScore ||
      housing.credit_score ||
      normalizedProfile.credit_score
  );
  if (credit && credit > 0) patch.last_credit_score_scenario = credit;

  const loanType = safeStr(
    scenario.loanType || normalizedProfile.loanType || ""
  ).toLowerCase();
  if (loanType) patch.last_loan_type = loanType;

  const pcsMonths = num(
    scenario.pcsTimelineMonths || normalizedProfile.pcsTimelineMonths
  );
  if (pcsMonths !== null) patch.last_pcs_timeline_months = pcsMonths;

  const follow = safeStr(
    deterministic?.public?.next_action?.label ||
      deterministic?.public?.next_action?.action ||
      ""
  ).slice(0, 120);
  if (follow) patch.last_follow_up_topic = follow;

  patch.last_updated_at = new Date().toISOString();

  // Message-only hypothetical credit score if present as digits near "credit"
  const msg = safeStr(message);
  const creditMatch = msg.match(/\b(?:credit(?:\s*score)?|fico)\D{0,12}(\d{3})\b/i);
  if (creditMatch) {
    const c = Number(creditMatch[1]);
    if (c >= 300 && c <= 850) patch.last_credit_score_scenario = c;
  }

  // Never store sensitive fields
  delete patch.email;
  delete patch.phone;
  delete patch.full_name;
  delete patch.access_token;
  delete patch.authorization;

  return sanitizeMemory(patch);
}

function cutAtSafeBoundary(text, maxChars) {
  const raw = String(text || "");
  if (raw.length <= maxChars) return raw;

  const slice = raw.slice(0, maxChars);
  // Prefer sentence boundary
  const sentenceIdx = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (sentenceIdx >= Math.floor(maxChars * 0.55)) {
    return slice.slice(0, sentenceIdx + 1).trim();
  }

  // Avoid cutting currency/number mid-token
  let end = slice.length;
  while (end > Math.floor(maxChars * 0.55)) {
    const ch = slice[end - 1];
    const next = raw[end] || "";
    const inNumber =
      /[\d$,.]/.test(ch) && /[\d$,.%]/.test(next);
    const inWord = /\w/.test(ch) && /\w/.test(next);
    if (!inNumber && !inWord && /\s/.test(ch)) {
      return `${slice.slice(0, end).trim()}…`;
    }
    end -= 1;
  }

  return `${slice.trim()}…`;
}

export function enforceReplyLimits(
  reply,
  {
    intent,
    max_chars = DEFAULT_MAX_REPLY_CHARS,
    greeting_max_chars = 220,
    max_follow_up_questions = 1
  } = {}
) {
  let text = String(reply || "").trim();
  if (!text) return "";

  const limit =
    intent === "greeting" || intent === "capabilities"
      ? greeting_max_chars
      : max_chars;

  // Limit follow-up questions
  if (max_follow_up_questions === 0) {
    text = text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !/\?$/.test(sentence.trim()))
      .join(" ")
      .trim();
  } else if (max_follow_up_questions === 1) {
    let seen = 0;
    text = text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => {
        if (!/\?$/.test(sentence.trim())) return true;
        seen += 1;
        return seen <= 1;
      })
      .join(" ")
      .trim();
  }

  // Preserve estimate/approval disclaimer fragments when present near end
  const disclaimer =
    text.match(
      /(?:estimate|not (?:a )?lend(?:ing)? approval|not loan approval|educational guidance)[^.?!]*[.?!]/i
    )?.[0] || "";

  let limited = cutAtSafeBoundary(text, limit);
  if (
    disclaimer &&
    !limited.toLowerCase().includes("approval") &&
    !limited.toLowerCase().includes("estimate") &&
    text.toLowerCase().includes(disclaimer.toLowerCase().slice(0, 24))
  ) {
    const room = Math.max(0, limit - limited.length - 1);
    if (room > 40) {
      limited = `${limited} ${disclaimer.slice(0, room)}`.trim();
    }
  }

  return limited;
}

export function buildOpenAIProfile(normalizedProfile = {}, intent = "") {
  const p = normalizedProfile || {};
  const out = {
    mode: p.mode || null,
    rank_paygrade: p.rank_paygrade || p.rank || null,
    yos: p.yos ?? p.years_of_service ?? null,
    family: p.family ?? null,
    family_size: p.family_size ?? null,
    base: p.base || null,
    projected_home_price: p.projected_home_price ?? null,
    downpayment: p.downpayment ?? null,
    credit_score: p.credit_score ?? null,
    monthly_expenses: p.monthly_expenses ?? null,
    debt: p.debt ?? null,
    pcsTimelineMonths: p.pcsTimelineMonths ?? null,
    expectedHoldMonths: p.expectedHoldMonths ?? null,
    loanType: p.loanType || p.loan_type || null,
    termYears: p.termYears || p.term_years || null
  };

  const needsZip =
    intent === "compensation" ||
    intent === "housing_affordability" ||
    intent === "pcs_housing_strategy" ||
    intent === "mortgage_explanation";
  if (needsZip) out.zip = p.zip || null;

  const needsVa =
    intent === "va_loan" ||
    intent === "mortgage_explanation" ||
    intent === "housing_affordability";
  if (needsVa) {
    out.va_disability = p.va_disability ?? null;
    out.funding_fee_exempt = p.funding_fee_exempt ?? null;
  }

  // Strip empties
  const cleaned = {};
  for (const [k, v] of Object.entries(out)) {
    if (v === null || v === undefined || v === "") continue;
    cleaned[k] = v;
  }
  return cleaned;
}

export function buildPublicProfileUsed(normalizedProfile = {}, intent = "") {
  const fields = buildOpenAIProfile(normalizedProfile, intent);
  return {
    ...fields,
    field_names: Object.keys(fields)
  };
}

export function normalizeProvidedCompensationPacket(raw) {
  if (!isPlainObject(raw)) return null;
  const total = num(
    raw.total_monthly ??
      raw.totalMonthly ??
      raw.total_monthly_income ??
      raw.totalMonthlyIncome ??
      raw.total
  );
  const bah = num(raw.bah ?? raw.BAH ?? raw.bahMonthly);
  const basePay = num(raw.base_pay ?? raw.basePay ?? raw.basicPay);
  const bas = num(raw.bas ?? raw.BAS);

  const hasUseful =
    (total && total > 0) ||
    (bah && bah > 0) ||
    (basePay && basePay > 0) ||
    (bas && bas > 0);
  if (!hasUseful) return null;

  return {
    ok: true,
    rank_paygrade: safeStr(raw.rank_paygrade || raw.rank || raw.paygrade) || null,
    yos: num(raw.yos ?? raw.yearsOfService ?? raw.years_of_service),
    base: safeStr(raw.base || raw.duty_station) || null,
    zip: safeStr(raw.zip || raw.bah_zip) || null,
    with_dependents:
      raw.with_dependents ?? raw.withDependents ?? raw.family ?? null,
    base_pay: basePay,
    bas,
    bah,
    va_disability_pay: num(raw.va_disability_pay ?? raw.vaDisability ?? raw.va),
    retirement_pay: num(raw.retirement_pay ?? raw.retirement),
    special_pay: num(raw.special_pay ?? raw.specialPay),
    spouse_income: num(raw.spouse_income ?? raw.spouseIncome),
    additional_income: num(raw.additional_income ?? raw.additionalIncome),
    total_monthly: total,
    source: "client_structured_output",
    provenance: {
      type: "client_structured_output",
      engine: "client",
      official_data_used: null
    },
    note: "Structured compensation packet provided by the PCSUnited page session."
  };
}

export function normalizeProvidedMortgagePacket(raw) {
  if (!isPlainObject(raw)) return null;

  const principalInterest = num(
    raw.principal_interest ??
      raw.principalInterest ??
      raw.pi ??
      raw.monthly?.principal_interest ??
      raw.monthly?.principalInterest ??
      raw.monthly?.pi ??
      raw.breakdown?.pi ??
      raw.breakdown?.principal_interest ??
      raw.breakdown?.principalInterest
  );

  const taxes = num(
    raw.taxes ??
      raw.tax ??
      raw.property_tax ??
      raw.monthly?.taxes ??
      raw.monthly?.property_tax ??
      raw.monthly?.propertyTax ??
      raw.breakdown?.tax ??
      raw.breakdown?.taxes ??
      raw.breakdown?.property_tax
  );

  const insurance = num(
    raw.insurance ??
      raw.home_insurance ??
      raw.monthly?.insurance ??
      raw.monthly?.homeowners_insurance ??
      raw.breakdown?.insurance
  );

  const hoa = num(
    raw.hoa ?? raw.monthly?.hoa ?? raw.breakdown?.hoa
  );

  const pmi = num(
    raw.pmi ?? raw.monthly?.pmi ?? raw.breakdown?.pmi
  );

  const allIn = num(
    raw.all_in_monthly ??
      raw.all_in ??
      raw.allIn ??
      raw.total ??
      raw.monthlyPayment ??
      raw.monthly?.all_in ??
      raw.monthly?.allIn ??
      raw.monthly?.total ??
      raw.monthly?.totalMonthly ??
      raw.breakdown?.all_in ??
      raw.breakdown?.allIn ??
      raw.breakdown?.total
  );

  if (!allIn || allIn <= 0) return null;

  const packet = {
    ok: true,
    price: num(raw.price ?? raw.homePrice ?? raw.home_price),
    downpayment: num(raw.downpayment ?? raw.downPayment ?? raw.down_payment),
    loan_amount: num(raw.loan_amount ?? raw.loanAmount),
    apr: num(raw.apr ?? raw.rate),
    term_years: num(raw.term_years ?? raw.termYears),
    all_in_monthly: allIn,
    source: "client_structured_output",
    provenance: {
      type: "client_structured_output",
      engine: "client",
      official_data_used: null
    },
    note: "Structured mortgage packet provided by the PCSUnited page session."
  };

  // Omit unknown components rather than forcing misleading zeros
  if (principalInterest && principalInterest > 0) {
    packet.principal_interest = principalInterest;
  }
  if (taxes && taxes > 0) packet.taxes = taxes;
  if (insurance && insurance > 0) packet.insurance = insurance;
  if (hoa !== null && hoa >= 0) packet.hoa = hoa;
  if (pmi !== null && pmi >= 0) packet.pmi = pmi;

  return packet;
}

export function buildSafeDebug({
  intent,
  registryLoaded,
  supabaseAttempted,
  supabaseLoaded,
  usedOpenAI,
  latencyMs,
  warnings = [],
  toolPath = null
} = {}) {
  return {
    intent: intent || null,
    tool_path: toolPath || null,
    registry_loaded: Boolean(registryLoaded),
    supabase_enrichment_attempted: Boolean(supabaseAttempted),
    supabase_enrichment_succeeded: Boolean(supabaseLoaded),
    used_openai: Boolean(usedOpenAI),
    latency_ms: Number(latencyMs) || 0,
    warnings: Array.isArray(warnings) ? warnings.slice(0, 20) : []
  };
}

export default {
  RESPONSE_CONTRACT_VERSION,
  DEFAULT_MAX_REPLY_CHARS,
  MAX_THREAD_MESSAGES,
  MAX_THREAD_MESSAGE_LENGTH,
  MAX_MEMORY_KEYS,
  MAX_MEMORY_STRING_LENGTH,
  DEFAULT_UI,
  isAllowedOrigin,
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
  buildOpenAIProfile,
  buildPublicProfileUsed,
  enforceReplyLimits,
  buildSafeDebug
};
