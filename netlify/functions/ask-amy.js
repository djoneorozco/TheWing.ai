// netlify/functions/ask-amy.js
// ============================================================
// TheWing.ai • PCSUnited AI Concierge — Ask Amy
// v1.2.1 • COMMONJS STABLE + VA LOAN SHARED ENGINE
//
// PURPOSE
// - Member-facing PCSUnited AI Concierge endpoint
// - Stable CommonJS-style Netlify function
// - Reads PCSUnited profile/bridge/dashboard context from frontend
// - Enriches from Supabase when email exists
// - Uses _share/compensation-context.js for Base Pay + BAS + BAH + VA
// - Uses _share/mortgage-engine.js for mortgage math when available
// - Uses _share/affordability-engine.js and _share/decision-rules.js when available
// - Uses _share/va-loans.js for deterministic VA Loan education + strategy
// - Uses OpenAI only as the conversational explanation layer when needed
//
// CLIENT
// - POST https://thewing.netlify.app/api/ask-amy
// - POST /.netlify/functions/ask-amy
//
// REQUIRED ENV
// - OPENAI_API_KEY optional, only needed for conversational AI expansion
//
// OPTIONAL ENV
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_MODEL
// ============================================================

/* eslint-disable no-console */

// ============================================================
// //#1 SAFE MODULE LOADING
// ============================================================

let createClient = null;

try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch (_) {
  createClient = null;
}

function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.warn(`[ask-amy] safeRequire failed for ${path}:`, err?.message || err);
    return null;
  }
}

async function safeImport(path) {
  try {
    return await import(path);
  } catch (err) {
    console.warn(`[ask-amy] safeImport failed for ${path}:`, err?.message || err);
    return null;
  }
}

function unwrapModule(mod) {
  if (!mod) return null;
  if (mod.default && typeof mod.default === "object") {
    return { ...mod.default, ...mod };
  }
  return mod;
}

function getExportedFunction(mod, names = []) {
  const unwrapped = unwrapModule(mod);
  if (!unwrapped) return null;

  for (const name of names) {
    if (typeof unwrapped[name] === "function") return unwrapped[name];
  }

  if (typeof unwrapped === "function") return unwrapped;

  return null;
}

const shared = {
  compensationContext: safeRequire("./_share/compensation-context.js"),
  compensationContextPath: "./_share/compensation-context.js",

  profileNormalizer: safeRequire("./_share/profile-normalizer.js"),
  profileNormalizerPath: "./_share/profile-normalizer.js",

  payEngine: safeRequire("./_share/pay-engine.js"),
  payEnginePath: "./_share/pay-engine.js",

  mortgageEngine: safeRequire("./_share/mortgage-engine.js"),
  mortgageEnginePath: "./_share/mortgage-engine.js",

  affordabilityEngine: safeRequire("./_share/affordability-engine.js"),
  affordabilityEnginePath: "./_share/affordability-engine.js",

  decisionRules: safeRequire("./_share/decision-rules.js"),
  decisionRulesPath: "./_share/decision-rules.js",

  response: safeRequire("./_share/response.js"),
  responsePath: "./_share/response.js",

  vaLoans: safeRequire("./_share/va-loans.js"),
  vaLoansPath: "./_share/va-loans.js"
};

// ============================================================
// //#2 CONFIG
// ============================================================

const VERSION = "1.2.1-va-loans";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_RESPONSE_MODE = "member_guidance";
const MAX_MESSAGE_LENGTH = 5000;

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const ALLOW_ORIGINS = [
  "https://pcsunited.com",
  "https://www.pcsunited.com",

  "https://pcsunited.netlify.app",
  "https://www.pcsunited.netlify.app",

  "https://pcsunited-com-28346d.webflow.io",
  "https://www.pcsunited-com-28346d.webflow.io",

  "https://pcsunited.webflow.io",
  "https://www.pcsunited.webflow.io",

  "https://thewing.ai",
  "https://www.thewing.ai",

  "https://thewing.netlify.app",
  "https://www.thewing.netlify.app",

  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000"
];

// ============================================================
// //#3 NETLIFY HANDLER
// ============================================================

exports.handler = async function handler(event) {
  const origin = getHeader(event, "origin");

  if (event.httpMethod === "OPTIONS") {
    return respond(200, { ok: true, version: VERSION }, origin);
  }

  if (event.httpMethod !== "POST") {
    return respond(
      405,
      {
        ok: false,
        error: "Method not allowed. Use POST.",
        version: VERSION
      },
      origin
    );
  }

  const startedAt = Date.now();

  try {
    const body = safeJsonParse(event.body);
    const debug = body?.debug === true;

    const message = safeStr(
      body.message ||
        body.question ||
        body.prompt ||
        body.text ||
        ""
    ).slice(0, MAX_MESSAGE_LENGTH);

    if (!message) {
      return respond(
        400,
        {
          ok: false,
          error: "Missing message.",
          version: VERSION
        },
        origin
      );
    }

    const email = getEmailFromPayload(body);
    const clientContext = collectClientContext(body);
    const supabaseContext = await loadSupabaseMemberContext(email);

    const mergedContext = mergeDeep(
      {},
      clientContext || {},
      supabaseContext || {},
      {
        profile: mergeDeep(
          {},
          clientContext?.profile || {},
          supabaseContext?.profile || {}
        ),
        bridge: mergeDeep(
          {},
          clientContext?.bridge || {},
          supabaseContext?.bridge || {}
        ),
        financial_intake: mergeDeep(
          {},
          clientContext?.financial_intake || {},
          supabaseContext?.financial_intake || {}
        ),
        kpi_overrides: mergeDeep(
          {},
          clientContext?.kpi_overrides || {},
          supabaseContext?.kpi_overrides || {}
        ),
        user_financial_inputs: mergeDeep(
          {},
          clientContext?.user_financial_inputs || {},
          supabaseContext?.user_financial_inputs || {}
        ),
        user_aiou_inputs: mergeDeep(
          {},
          clientContext?.user_aiou_inputs || {},
          supabaseContext?.user_aiou_inputs || {}
        )
      }
    );

    const normalizedProfile = normalizeProfileUniversal(mergedContext);
    const intent = detectIntent(message);

    const deterministic = await buildTruthPacket({
      message,
      intent,
      email,
      mergedContext,
      normalizedProfile,
      debug
    });

    const profileSummary = buildProfileSummary(normalizedProfile, deterministic);

    const directReply = buildDirectDeterministicReply({
      message,
      intent,
      normalizedProfile,
      deterministic
    });

    if (directReply && !shouldUseOpenAI(message, intent, deterministic)) {
      const answer = buildStructuredAnswerFromText({
        reply: directReply,
        deterministic,
        normalizedProfile,
        intent
      });

      return respond(
        200,
        {
          ok: true,
          agent: "Amy",
          display_name: "PCSUnited AI Concierge",
          brand: "PCSUnited",
          powered_by: "TheWing.ai",
          version: VERSION,
          mode: DEFAULT_RESPONSE_MODE,
          intent,
          reply: directReply,
          answer,
          profile_used: stripSensitiveProfile(normalizedProfile),
          truth_packet: deterministic.public,
          context_used: deterministic.context_used,
          latency_ms: Date.now() - startedAt,
          ...(debug
            ? {
                debug: {
                  ...deterministic.debug,
                  used_openai: false,
                  supabase_loaded: Boolean(supabaseContext?.supabase_loaded)
                }
              }
            : {})
        },
        origin
      );
    }

    let aiReply = "";

    if (OPENAI_API_KEY) {
      const systemPrompt = buildSystemPrompt({
        profileSummary,
        deterministic
      });

      const userPayload = buildUserPayload({
        message,
        email,
        intent,
        normalizedProfile,
        deterministic,
        mergedContext
      });

      aiReply = await callOpenAI({
        systemPrompt,
        userPayload,
        model: DEFAULT_MODEL
      });
    }

    if (!aiReply) {
      aiReply =
        directReply ||
        buildFallbackReply({
          intent,
          normalizedProfile,
          deterministic
        });
    }

    const answer = buildStructuredAnswerFromText({
      reply: aiReply,
      deterministic,
      normalizedProfile,
      intent
    });

    return respond(
      200,
      {
        ok: true,
        agent: "Amy",
        display_name: "PCSUnited AI Concierge",
        brand: "PCSUnited",
        powered_by: "TheWing.ai",
        version: VERSION,
        mode: DEFAULT_RESPONSE_MODE,
        intent,
        reply: aiReply,
        answer,
        profile_used: stripSensitiveProfile(normalizedProfile),
        truth_packet: deterministic.public,
        context_used: deterministic.context_used,
        latency_ms: Date.now() - startedAt,
        ...(debug
          ? {
              debug: {
                ...deterministic.debug,
                model: OPENAI_API_KEY ? DEFAULT_MODEL : null,
                used_openai: Boolean(OPENAI_API_KEY && aiReply),
                supabase_loaded: Boolean(supabaseContext?.supabase_loaded)
              }
            }
          : {})
      },
      origin
    );
  } catch (err) {
    console.error("ask-amy error:", err);

    return respond(
      500,
      {
        ok: false,
        error: "Amy could not complete the request.",
        detail:
          process.env.NODE_ENV === "development"
            ? String(err?.message || err)
            : undefined,
        version: VERSION
      },
      origin
    );
  }
};

// ============================================================
// //#4 RESPONSE / CORS HELPERS
// ============================================================

function corsHeaders(origin) {
  const cleanOrigin = safeStr(origin);
  const allowOrigin = ALLOW_ORIGINS.includes(cleanOrigin) ? cleanOrigin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    Vary: "Origin"
  };
}

function respond(statusCode, payload, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(payload || {})
  };
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const target = String(name || "").toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) return value;
  }

  return "";
}

// ============================================================
// //#5 GENERAL HELPERS
// ============================================================

function safeJsonParse(raw) {
  try {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function safeStr(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  const email = safeStr(value).toLowerCase();
  return email.includes("@") ? email : "";
}

function clean(value) {
  return String(value ?? "").trim();
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boolish(value, fallback = false) {
  if (value === true || value === false) return value;

  const s = safeStr(value).toLowerCase();

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "with",
      "dependent",
      "dependents",
      "with dependents",
      "with_dependents",
      "family",
      "married",
      "exempt",
      "eligible"
    ].includes(s)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "without",
      "single",
      "none",
      "without dependents",
      "without_dependents",
      "not exempt",
      "ineligible"
    ].includes(s)
  ) {
    return false;
  }

  if (typeof value === "number") return value > 0;

  return fallback;
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

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function roundMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function nowIso() {
  return new Date().toISOString();
}

function mergeDeep(target, ...sources) {
  const out = target && typeof target === "object" ? target : {};

  for (const src of sources) {
    if (!src || typeof src !== "object") continue;

    for (const [key, value] of Object.entries(src)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        out[key] = mergeDeep(out[key] || {}, value);
      } else if (value !== undefined && value !== null && value !== "") {
        out[key] = value;
      }
    }
  }

  return out;
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

// ============================================================
// //#6 PAYLOAD / CONTEXT INGEST
// ============================================================

function getEmailFromPayload(body) {
  return normalizeEmail(
    pickFirst(
      body?.email,
      body?.identity?.email,
      body?.profile?.email,
      body?.bridge?.email,
      body?.context?.email,
      body?.context?.identity?.email,
      body?.context?.profile?.email,
      body?.context?.bridge?.email,
      body?.user?.email
    )
  );
}

function collectClientContext(body) {
  const context =
    body?.context && typeof body.context === "object" ? body.context : {};

  const profile = mergeDeep(
    {},
    body?.profile || {},
    context?.profile || {},
    body?.verifiedProfile || {},
    body?.user || {}
  );

  const bridge = mergeDeep({}, body?.bridge || {}, context?.bridge || {});

  const identity = mergeDeep(
    {},
    body?.identity || {},
    context?.identity || {}
  );

  const fad = mergeDeep(
    {},
    body?.fad || {},
    body?.fad_snapshot || {},
    body?.snapshot || {},
    context?.fad || {},
    context?.dashboard || {}
  );

  const financialIntake = mergeDeep(
    {},
    body?.financial_intake || {},
    body?.financialIntake || {},
    context?.financial_intake || {},
    context?.financialIntake || {}
  );

  const kpiOverrides = mergeDeep(
    {},
    body?.kpi_overrides || {},
    body?.kpiOverrides || {},
    context?.kpi_overrides || {},
    context?.kpiOverrides || {}
  );

  return {
    profile,
    bridge,
    identity,
    fad,
    financial_intake: financialIntake,
    kpi_overrides: kpiOverrides,
    user_financial_inputs:
      body?.user_financial_inputs ||
      context?.user_financial_inputs ||
      {},
    user_aiou_inputs:
      body?.user_aiou_inputs ||
      context?.user_aiou_inputs ||
      {},
    raw_context: context
  };
}

// ============================================================
// //#7 SUPABASE CONTEXT ENRICHMENT
// ============================================================

async function loadSupabaseMemberContext(email) {
  if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !createClient) {
    return null;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

    const profilePromise = supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    const financialInputsPromise = supabase
      .from("user_financial_inputs")
      .select("*")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const financialIntakesPromise = supabase
      .from("financial_intakes")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const aiouPromise = supabase
      .from("user_aiou_inputs")
      .select("*")
      .eq("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [
      profileRes,
      financialInputsRes,
      financialIntakesRes,
      aiouRes
    ] = await Promise.allSettled([
      profilePromise,
      financialInputsPromise,
      financialIntakesPromise,
      aiouPromise
    ]);

    const profile = unwrapSupabaseResult(profileRes, "profiles");
    const financialInputs = unwrapSupabaseResult(
      financialInputsRes,
      "user_financial_inputs"
    );
    const financialIntake = unwrapSupabaseResult(
      financialIntakesRes,
      "financial_intakes"
    );
    const aiou = unwrapSupabaseResult(aiouRes, "user_aiou_inputs");

    const hasAnyData = [profile, financialInputs, financialIntake, aiou].some(
      (x) => x && typeof x === "object" && Object.keys(x).length
    );

    if (!hasAnyData) return null;

    const mergedProfile = mergeDeep(
      {},
      profile || {},
      financialInputs || {},
      financialIntake || {},
      aiou || {}
    );

    return {
      profile: mergedProfile,
      bridge: normalizeSupabaseBridge(mergedProfile),
      financial_intake: financialIntake || {},
      user_financial_inputs: financialInputs || {},
      user_aiou_inputs: aiou || {},
      supabase_loaded: true
    };
  } catch (err) {
    console.warn("Supabase member context load failed:", err?.message || err);
    return null;
  }
}

function unwrapSupabaseResult(settledResult, label) {
  if (!settledResult || settledResult.status !== "fulfilled") {
    console.warn(`Supabase ${label} query failed.`);
    return {};
  }

  const value = settledResult.value;

  if (value?.error) {
    console.warn(`Supabase ${label} warning:`, value.error.message || value.error);
    return {};
  }

  return value?.data || {};
}

function normalizeSupabaseBridge(raw) {
  const safe = raw && typeof raw === "object" ? raw : {};

  const projectedHomePrice = pickFirst(
    safe.projected_home_price,
    safe.projectedHomePrice,
    safe.home_price,
    safe.homePrice,
    safe.price,
    safe.housing,
    safe.housing_price,
    safe.projected_mortgage_amount
  );

  const downpayment = pickFirst(
    safe.downpayment,
    safe.downPayment,
    safe.down_payment,
    safe.dpAmt,
    safe.savings,
    safe.current_savings,
    safe.currentSavings
  );

  const creditScore = pickFirst(
    safe.credit_score,
    safe.creditScore,
    safe.fico,
    safe.score
  );

  const monthlyExpenses = pickFirst(
    safe.monthly_expenses,
    safe.monthlyExpenses,
    safe.expenses,
    safe.expensesOverride,
    safe.total_expenses
  );

  const income = pickFirst(
    safe.income,
    safe.monthly_income,
    safe.monthlyIncome,
    safe.total_monthly_income,
    safe.totalMonthlyIncome,
    safe.total_monthly,
    safe.totalMonthly
  );

  const debt = pickFirst(
    safe.debt,
    safe.monthly_debt,
    safe.monthlyDebt,
    safe.debt_monthly,
    safe.debtPayments,
    safe.non_housing_debt,
    safe.nonHousingDebt
  );

  const base = pickFirst(
    safe.base,
    safe.pcsBase,
    safe.pcs_base,
    safe.base_name,
    safe.baseName,
    safe.installation,
    safe.duty_station,
    safe.dutyStation
  );

  const rank = pickFirst(
    safe.rank_paygrade,
    safe.rankPaygrade,
    safe.paygrade,
    safe.rank
  );

  const yos = pickFirst(
    safe.yos,
    safe.years_of_service,
    safe.yearsOfService
  );

  const family = pickFirst(
    safe.family,
    safe.dependents,
    safe.withDependents,
    safe.with_dependents,
    safe.hasDependents
  );

  const zip = pickFirst(
    safe.zip,
    safe.base_zip,
    safe.baseZip,
    safe.bah_zip,
    safe.bahZip
  );

  return stripEmpty({
    ...safe,

    email: safe.email || "",
    full_name: safe.full_name || safe.fullName || safe.name || "",
    fullName: safe.fullName || safe.full_name || safe.name || "",
    name: safe.name || safe.full_name || safe.fullName || "",

    first_name: safe.first_name || safe.firstName || "",
    firstName: safe.firstName || safe.first_name || "",
    last_name: safe.last_name || safe.lastName || "",
    lastName: safe.lastName || safe.last_name || "",

    mode: safe.mode || safe.user_type || safe.userType || "",
    military_status: safe.military_status || safe.mode || safe.user_type || "",

    rank,
    rank_paygrade: rank,
    rankPaygrade: rank,

    yos,
    years_of_service: yos,
    yearsOfService: yos,

    family,
    dependents: family,
    withDependents: family,
    family_size: pickFirst(
      safe.family_size,
      safe.familySize,
      safe.household_size
    ),

    base,
    pcsBase: base,
    pcs_base: base,

    zip,
    bahZip: zip,
    bah_zip: zip,

    va_disability: pickFirst(safe.va_disability, safe.vaDisability, safe.va),
    vaDisability: pickFirst(safe.vaDisability, safe.va_disability, safe.va),

    projected_home_price: projectedHomePrice,
    projectedHomePrice,
    homePrice: projectedHomePrice,
    price: projectedHomePrice,
    housing: projectedHomePrice,

    downpayment,
    downPayment: downpayment,
    down_payment: downpayment,
    dpAmt: downpayment,
    savings: downpayment,

    credit_score: creditScore,
    creditScore,

    monthly_expenses: monthlyExpenses,
    monthlyExpenses: monthlyExpenses,
    expenses: monthlyExpenses,

    income,
    monthly_income: income,
    monthlyIncome: income,
    total_monthly_income: income,
    totalMonthlyIncome: income,

    debt,
    monthly_debt: debt,
    monthlyDebt: debt,
    debt_monthly: debt,
    debtPayments: debt,
    non_housing_debt: debt,
    nonHousingDebt: debt,

    bedrooms: pickFirst(safe.bedrooms, safe.beds),
    bathrooms: pickFirst(safe.bathrooms, safe.baths),
    sqft: safe.sqft,

    cityKey: pickFirst(
      safe.cityKey,
      safe.city_key,
      safe.market,
      safe.marketSlug
    ),

    _source: "thewing.supabase.member-context",
    _loadedAt: nowIso()
  });
}

// ============================================================
// //#8 PROFILE NORMALIZATION
// ============================================================

function normalizeProfileUniversal(ctx) {
  const sharedNormalize = getExportedFunction(shared.profileNormalizer, [
    "normalizeProfile",
    "normalizeMemberProfile",
    "normalizeProfileUniversal"
  ]);

  if (sharedNormalize) {
    try {
      const result = sharedNormalize(ctx);
      if (result && typeof result === "object") return stripEmpty(result);
    } catch (err) {
      console.warn("profile-normalizer failed:", err?.message || err);
    }
  }

  const profileRaw = mergeDeep(
    {},
    ctx?.identity || {},
    ctx?.profile || {},
    ctx?.bridge || {},
    ctx?.financial_intake || {},
    ctx?.user_financial_inputs || {},
    ctx?.user_aiou_inputs || {},
    ctx?.fad || {},
    ctx?.kpi_overrides || {}
  );

  return normalizeProfileFallback(profileRaw);
}

function normalizeProfileFallback(raw = {}) {
  const email = normalizeEmail(
    pickFirst(raw.email, raw.user_email, raw.member_email)
  );

  const fullName = safeStr(
    pickFirst(raw.full_name, raw.fullName, raw.name, raw.displayName)
  );

  const rankPaygrade = normalizePaygrade(
    pickFirst(raw.rank_paygrade, raw.rankPaygrade, raw.paygrade, raw.rank)
  );

  const rank = safeStr(pickFirst(raw.rank, raw.rank_name, rankPaygrade));

  const mode = normalizeMode(
    pickFirst(raw.mode, raw.user_type, raw.userType, raw.status_type, "active")
  );

  const base = safeStr(
    pickFirst(
      raw.base,
      raw.base_name,
      raw.baseName,
      raw.installation,
      raw.duty_station,
      raw.dutyStation,
      raw.selectedBase,
      raw.pcsBase,
      raw.pcs_base
    )
  );

  const zip = safeStr(
    pickFirst(raw.zip, raw.base_zip, raw.baseZip, raw.bah_zip, raw.bahZip)
  );

  const familyRaw = pickFirst(
    raw.family,
    raw.dependents,
    raw.with_dependents,
    raw.withDependents,
    raw.hasDependents
  );

  const profile = {
    email,
    full_name: fullName,
    first_name: safeStr(pickFirst(raw.first_name, raw.firstName, deriveFirstName(fullName))),
    last_name: safeStr(
      pickFirst(raw.last_name, raw.lastName, deriveLastName(fullName))
    ),
    phone: safeStr(pickFirst(raw.phone, raw.phone_number, raw.phoneNumber)),

    mode,
    military_status: mode,
    rank,
    rank_paygrade: rankPaygrade,

    yos: num(pickFirst(raw.yos, raw.years_of_service, raw.yearsOfService)),
    family: familyRaw === null ? null : boolish(familyRaw, false),
    family_size: num(
      pickFirst(
        raw.family_size,
        raw.familySize,
        raw.household_size,
        raw.householdSize
      )
    ),

    base,
    zip,

    va_disability: num(
      pickFirst(raw.va_disability, raw.vaDisability, raw.va, raw.disability)
    ),

    funding_fee_exempt: boolish(
      pickFirst(
        raw.funding_fee_exempt,
        raw.fundingFeeExempt,
        raw.va_funding_fee_exempt,
        raw.vaFundingFeeExempt
      ),
      num(pickFirst(raw.va_disability, raw.vaDisability, raw.va, raw.disability)) > 0
    ),

    retired_rank: normalizePaygrade(
      pickFirst(
        raw.retired_rank,
        raw.retiredRank,
        raw.retire_rank,
        raw.retireRank
      )
    ),
    retire_yos: num(
      pickFirst(
        raw.retire_yos,
        raw.retireYos,
        raw.retirement_yos,
        raw.retirementYos
      )
    ),
    retirement_system: safeStr(
      pickFirst(raw.retirement_system, raw.retirementSystem, raw.brs, raw.high3)
    ),

    projected_home_price: num(
      pickFirst(
        raw.projected_home_price,
        raw.projectedHomePrice,
        raw.home_price,
        raw.homePrice,
        raw.price,
        raw.housingPrice,
        raw.projected_mortgage_amount
      )
    ),

    monthly_expenses: num(
      pickFirst(
        raw.monthly_expenses,
        raw.monthlyExpenses,
        raw.expenses,
        raw.expensesOverride,
        raw.total_expenses
      )
    ),

    income: num(
      pickFirst(
        raw.income,
        raw.monthly_income,
        raw.monthlyIncome,
        raw.total_monthly_income,
        raw.totalMonthlyIncome,
        raw.total_monthly,
        raw.totalMonthly
      )
    ),

    debt: num(
      pickFirst(
        raw.debt,
        raw.monthly_debt,
        raw.monthlyDebt,
        raw.debt_monthly,
        raw.debtPayments,
        raw.non_housing_debt,
        raw.nonHousingDebt
      )
    ),

    downpayment: num(
      pickFirst(
        raw.downpayment,
        raw.downPayment,
        raw.down_payment,
        raw.dpAmt,
        raw.savingsOverride,
        raw.currentSavings,
        raw.current_savings
      )
    ),

    savings: num(
      pickFirst(raw.savings, raw.cash, raw.cash_on_hand, raw.cashOnHand)
    ),

    credit_score: num(
      pickFirst(raw.credit_score, raw.creditScore, raw.fico, raw.score)
    ),

    bedrooms: num(pickFirst(raw.bedrooms, raw.beds)),
    bathrooms: num(pickFirst(raw.bathrooms, raw.baths)),
    sqft: num(raw.sqft),

    cityKey: safeStr(
      pickFirst(raw.cityKey, raw.city_key, raw.market, raw.marketSlug)
    ),

    loanType: safeStr(pickFirst(raw.loanType, raw.loan_type, "va")),
    termYears: num(pickFirst(raw.termYears, raw.term_years, 30)),
    notes: safeStr(pickFirst(raw.notes, raw.comments))
  };

  return stripEmpty(profile);
}

function deriveFirstName(fullName) {
  const parts = safeStr(fullName).split(/\s+/).filter(Boolean);
  return parts.length ? parts[0] : "";
}

function deriveLastName(fullName) {
  const parts = safeStr(fullName).split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function normalizeMode(value) {
  const s = safeStr(value).toLowerCase();

  if (
    ["ad", "active", "active_duty", "active duty", "servicemember"].includes(s)
  ) {
    return "active";
  }

  if (["vet", "veteran", "retired", "retiree"].includes(s)) {
    return "veteran";
  }

  if (["guard", "reserve", "reservist"].includes(s)) {
    return "reserve";
  }

  return s || "active";
}

function normalizePaygrade(value) {
  const raw = safeStr(value).toUpperCase().replace(/\s+/g, "");

  if (!raw) return "";
  if (/^[EOW]-\d{1,2}E?$/.test(raw)) return raw;
  if (/^[EOW]\d{1,2}E?$/.test(raw)) return `${raw[0]}-${raw.slice(1)}`;

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
    "2LT": "O-1",
    "1LT": "O-2",
    CAPT: "O-3",
    MAJ: "O-4",
    LTCOL: "O-5",
    COL: "O-6"
  };

  return map[raw] || raw;
}

function rankShort(value) {
  const p = normalizePaygrade(value);

  const map = {
    "E-1": "AB",
    "E-2": "Amn",
    "E-3": "A1C",
    "E-4": "SrA",
    "E-5": "SSgt",
    "E-6": "TSgt",
    "E-7": "MSgt",
    "E-8": "SMSgt",
    "E-9": "CMSgt",
    "W-1": "WO1",
    "W-2": "CWO2",
    "W-3": "CWO3",
    "W-4": "CWO4",
    "W-5": "CWO5",
    "O-1": "2nd Lt",
    "O-2": "1st Lt",
    "O-3": "Capt",
    "O-4": "Maj",
    "O-5": "Lt Col",
    "O-6": "Col"
  };

  return map[p] || p || "";
}

// ============================================================
// //#9 INTENT DETECTION
// ============================================================

function detectIntent(message) {
  const t = safeStr(message).toLowerCase();

  if (!t) return "unknown";

  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup)\b/.test(t)) {
    return "greeting";
  }

  if (
    /\bva loan\b|\bva mortgage\b|\bva-backed\b|\bva backed\b|\bcoe\b|\bcertificate of eligibility\b|\bfunding fee\b|\bva funding fee\b|\bva appraisal\b|\bva inspection\b|\bentitlement\b|\bfull entitlement\b|\bpartial entitlement\b|\bseller concession\b|\bseller concessions\b|\bseller credit\b|\bseller credits\b|\bzero down\b|\b0 down\b|\bno down payment\b|\bno pmi\b|\boccupancy\b|\bprimary residence\b|\bva closing costs\b|\bva close costs\b|\bva purchase\b|\bva home loan\b/.test(t)
  ) {
    return "va_loan";
  }

  if (
    /\bwhat can you do\b|\bhow can you help\b|\bwhat do you do\b|\bwho are you\b|\bhelp me\b|\bare you working\b/.test(t)
  ) {
    return "capabilities";
  }

  if (
    /\bmy name\b|\bwho am i\b|\bmy profile\b|\bwhat do you know about me\b|\bmy rank\b|\bmy base\b|\bmy email\b/.test(t)
  ) {
    return "profile_question";
  }

  if (
    /\bpay\b|\bbase pay\b|\bbas\b|\bbah\b|\bcompensation\b|\btotal monthly\b|\bincome\b|\ballowance\b/.test(t)
  ) {
    return "compensation";
  }

  if (
    /\bafford\b|\bhow much house\b|\bbuying power\b|\bhousing cap\b|\bprice range\b|\bfinancially ready\b|\bready to buy\b/.test(t)
  ) {
    return "housing_affordability";
  }

  if (
    /\bmortgage\b|\bmonthly payment\b|\bprincipal\b|\binterest\b|\bproperty tax\b|\binsurance\b|\bhoa\b|\bpiti\b|\bpayment\b/.test(t)
  ) {
    return "mortgage_explanation";
  }

  if (
    /\brent\b|\bbuy\b|\brent vs buy\b|\bshould i rent\b|\bshould i buy\b/.test(t)
  ) {
    return "rent_vs_buy";
  }

  if (
    /\bpcs\b|\bmove\b|\borders\b|\bbase\b|\bduty station\b|\bcommute\b|\bneighborhood\b|\bmarket\b/.test(t)
  ) {
    return "pcs_housing_strategy";
  }

  if (
    /\bdashboard\b|\bscore\b|\bgrade\b|\bwhy is my\b|\bexplain this\b|\bwhat does this mean\b|\bbluf\b/.test(t)
  ) {
    return "dashboard_interpretation";
  }

  return "general_guidance";
}

function shouldUseOpenAI(message, intent, deterministic) {
  if (!OPENAI_API_KEY) return false;
  if (intent === "greeting" || intent === "capabilities") return false;

  const t = safeStr(message);

  if (intent === "va_loan") {
    if (t.length > 140) return true;
    return false;
  }

  if (t.length > 120) return true;

  if (
    [
      "housing_affordability",
      "mortgage_explanation",
      "rent_vs_buy",
      "pcs_housing_strategy",
      "dashboard_interpretation",
      "general_guidance"
    ].includes(intent)
  ) {
    return true;
  }

  if (deterministic?.public?.verdict || deterministic?.public?.mortgage) {
    return true;
  }

  return false;
}

// ============================================================
// //#10 TRUTH PACKET
// ============================================================

async function buildTruthPacket({
  message,
  intent,
  email,
  mergedContext,
  normalizedProfile,
  debug
}) {
  const truth = {
    ok: true,
    ts: nowIso(),
    intent,
    context_used: {
      profile: Boolean(Object.keys(normalizedProfile || {}).length),
      compensation: false,
      housing: false,
      dashboard: Boolean(
        Object.keys(mergedContext?.fad || {}).length ||
          Object.keys(mergedContext?.kpi_overrides || {}).length
      ),
      supabase: Boolean(mergedContext?.supabase_loaded),
      va_loan: false,
      shared_engines: {
        compensation_context: Boolean(shared.compensationContext),
        pay_engine: Boolean(shared.payEngine),
        mortgage_engine: Boolean(shared.mortgageEngine),
        affordability_engine: Boolean(shared.affordabilityEngine),
        decision_rules: Boolean(shared.decisionRules),
        response: Boolean(shared.response),
        va_loans: Boolean(shared.vaLoans)
      }
    },
    internal: {},
    public: {
      profile_summary: null,
      compensation: null,
      housing_inputs: null,
      mortgage: null,
      affordability: null,
      verdict: null,
      va_loan: null,
      next_action: null,
      missing_inputs: []
    },
    debug: debug ? {} : undefined
  };

  const scenario = buildScenario({
    message,
    mergedContext,
    normalizedProfile
  });

  truth.internal.scenario = scenario;
  truth.public.profile_summary = buildProfileSummary(normalizedProfile, null);

  truth.public.housing_inputs = stripEmpty({
    price: scenario.price,
    downpayment: scenario.downpayment,
    credit_score: scenario.creditScore,
    expenses: scenario.expenses,
    bedrooms: scenario.bedrooms,
    cityKey: scenario.cityKey,
    base: scenario.base,
    zip: scenario.zip
  });

  const compensation = await computeCompensationSafe(normalizedProfile, scenario);

  if (compensation) {
    truth.context_used.compensation = true;
    truth.public.compensation = compensation;
  }

  const mortgage = await computeMortgageSafe(
    normalizedProfile,
    scenario,
    compensation
  );

  if (mortgage) {
    truth.context_used.housing = true;
    truth.public.mortgage = mortgage;
  }

  const affordability = computeAffordabilitySafe({
    normalizedProfile,
    scenario,
    compensation,
    mortgage
  });

  if (affordability) {
    truth.context_used.housing = true;
    truth.public.affordability = affordability;
  }

  const verdict = computeVerdictSafe({
    compensation,
    mortgage,
    affordability,
    scenario,
    normalizedProfile
  });

  if (verdict) {
    truth.public.verdict = verdict;
  }

  const vaLoan = await buildVaLoanContextSafe({
    message,
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
    affordability
  });

  if (vaLoan) {
    truth.context_used.va_loan = true;
    truth.public.va_loan = vaLoan;
  }

  truth.public.missing_inputs = listMissingInputs({
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
    intent
  });

  truth.public.next_action = buildNextAction({
    intent,
    missing: truth.public.missing_inputs,
    verdict,
    compensation,
    mortgage,
    affordability,
    vaLoan
  });

  if (debug) {
    truth.debug = {
      email,
      scenario,
      merged_context_keys: Object.keys(mergedContext || {}),
      normalized_profile_keys: Object.keys(normalizedProfile || {}),
      compensation_loaded: Boolean(compensation),
      mortgage_loaded: Boolean(mortgage),
      affordability_loaded: Boolean(affordability),
      verdict_loaded: Boolean(verdict),
      va_loan_loaded: Boolean(vaLoan),
      supabase_loaded: Boolean(mergedContext?.supabase_loaded)
    };
  }

  return truth;
}

function buildScenario({ message, mergedContext, normalizedProfile }) {
  const fad = mergedContext?.fad || {};
  const bridge = mergedContext?.bridge || {};
  const profile = normalizedProfile || {};
  const intake = mergedContext?.financial_intake || {};
  const userFinancial = mergedContext?.user_financial_inputs || {};
  const aiou = mergedContext?.user_aiou_inputs || {};
  const kpi = mergedContext?.kpi_overrides || {};

  const hypotheticalCreditScore = parseHypotheticalCreditScore(message);

  const price = num(
    pickFirst(
      kpi.price,
      kpi.housing,
      kpi.housing_cost,
      kpi.projected_home_price,
      fad.price,
      fad.homePrice,
      fad.projected_home_price,
      fad.housingPrice,
      intake.projected_home_price,
      intake.homePrice,
      userFinancial.projected_home_price,
      userFinancial.homePrice,
      bridge.projected_home_price,
      bridge.homePrice,
      profile.projected_home_price
    )
  );

  const expenses = num(
    pickFirst(
      kpi.expenses,
      kpi.monthly_expenses,
      fad.expenses,
      fad.monthlyExpenses,
      fad.monthly_expenses,
      intake.monthly_expenses,
      intake.monthlyExpenses,
      userFinancial.monthly_expenses,
      userFinancial.monthlyExpenses,
      bridge.monthly_expenses,
      bridge.monthlyExpenses,
      profile.monthly_expenses
    )
  );

  const downpayment = num(
    pickFirst(
      kpi.downpayment,
      kpi.down_payment,
      kpi.savings,
      fad.downpayment,
      fad.downPayment,
      fad.dpAmt,
      fad.currentSavings,
      intake.downpayment,
      intake.downPayment,
      userFinancial.downpayment,
      userFinancial.downPayment,
      bridge.downpayment,
      bridge.dpAmt,
      profile.downpayment,
      profile.savings
    )
  );

  const creditScore =
    hypotheticalCreditScore ||
    num(
      pickFirst(
        kpi.credit_score,
        kpi.creditScore,
        fad.creditScore,
        fad.credit_score,
        fad.score,
        intake.credit_score,
        intake.creditScore,
        userFinancial.credit_score,
        userFinancial.creditScore,
        bridge.credit_score,
        bridge.creditScore,
        profile.credit_score
      )
    );

  const income = num(
    pickFirst(
      profile.income,
      profile.monthly_income,
      profile.monthlyIncome,
      profile.total_monthly_income,
      profile.totalMonthlyIncome,
      bridge.income,
      bridge.monthly_income,
      bridge.monthlyIncome,
      bridge.total_monthly_income,
      bridge.totalMonthlyIncome,
      intake.income,
      intake.monthly_income,
      userFinancial.income,
      userFinancial.monthly_income,
      fad.income,
      fad.monthlyIncome
    )
  );

  const debt = num(
    pickFirst(
      profile.debt,
      profile.monthly_debt,
      profile.monthlyDebt,
      bridge.debt,
      bridge.monthly_debt,
      bridge.monthlyDebt,
      intake.debt,
      userFinancial.debt,
      fad.debt
    )
  );

  const termYears = clamp(
    num(
      pickFirst(
        fad.termYears,
        fad.term_years,
        intake.term_years,
        userFinancial.term_years,
        bridge.termYears,
        profile.termYears,
        30
      )
    ),
    10,
    40
  );

  const loanType = safeStr(
    pickFirst(
      fad.loanType,
      fad.loan_type,
      intake.loan_type,
      userFinancial.loan_type,
      bridge.loanType,
      profile.loanType,
      "va"
    )
  ).toLowerCase();

  const rankPaygrade = normalizePaygrade(
    pickFirst(
      profile.rank_paygrade,
      profile.rank,
      bridge.rank_paygrade,
      bridge.rank,
      intake.rank_paygrade,
      userFinancial.rank_paygrade
    )
  );

  const base = safeStr(
    pickFirst(profile.base, bridge.base, intake.base, userFinancial.base)
  );

  const zip = safeStr(
    pickFirst(profile.zip, bridge.zip, intake.zip, userFinancial.zip)
  );

  const family = pickFirst(profile.family, bridge.family, intake.family);
  const vaDisability = num(
    pickFirst(profile.va_disability, bridge.va_disability, intake.va_disability)
  );

  const bedrooms = num(
    pickFirst(
      profile.bedrooms,
      bridge.bedrooms,
      aiou.bedrooms,
      fad.bedrooms,
      intake.bedrooms
    )
  );

  const cityKey = safeStr(
    pickFirst(
      profile.cityKey,
      bridge.cityKey,
      fad.cityKey,
      intake.cityKey,
      userFinancial.cityKey
    )
  );

  return stripEmpty({
    message,
    price,
    expenses,
    downpayment,
    creditScore,
    income,
    debt,
    termYears: termYears || 30,
    loanType,
    rankPaygrade,
    rank: rankPaygrade,
    yos: num(pickFirst(profile.yos, bridge.yos, intake.yos)),
    base,
    zip,
    family: family === null ? null : boolish(family, false),
    family_size: num(pickFirst(profile.family_size, bridge.family_size)),
    vaDisability,
    va_disability: vaDisability,
    fundingFeeExempt: boolish(
      pickFirst(
        profile.funding_fee_exempt,
        profile.fundingFeeExempt,
        bridge.funding_fee_exempt,
        bridge.fundingFeeExempt
      ),
      vaDisability > 0
    ),
    bedrooms,
    cityKey,
    apr: num(pickFirst(fad.apr, intake.apr, userFinancial.apr, bridge.apr)),
    propertyTaxAnnual: num(
      pickFirst(
        fad.taxAnnual,
        fad.propertyTaxAnnual,
        intake.property_tax_annual,
        userFinancial.property_tax_annual
      )
    ),
    insuranceAnnual: num(
      pickFirst(
        fad.insAnnual,
        fad.insuranceAnnual,
        intake.insurance_annual,
        userFinancial.insurance_annual
      )
    ),
    hoa: num(pickFirst(fad.hoa, intake.hoa, userFinancial.hoa, bridge.hoa)),
    pmi: num(pickFirst(fad.pmi, intake.pmi, userFinancial.pmi, bridge.pmi)),
    priorUse: pickFirst(
      fad.priorUse,
      fad.va_prior_use,
      intake.priorUse,
      profile.priorUse,
      bridge.priorUse
    ),
    occupancyIntent: pickFirst(
      fad.occupancyIntent,
      profile.occupancyIntent,
      bridge.occupancyIntent,
      "primary_residence"
    ),
    pcsTimelineMonths: num(
      pickFirst(
        fad.pcsTimelineMonths,
        profile.pcsTimelineMonths,
        bridge.pcsTimelineMonths
      )
    ),
    expectedHoldMonths: num(
      pickFirst(
        fad.expectedHoldMonths,
        profile.expectedHoldMonths,
        bridge.expectedHoldMonths
      )
    ),
    sellerCredit: num(
      pickFirst(fad.sellerCredit, profile.sellerCredit, bridge.sellerCredit)
    ),
    fullEntitlement: boolish(
      pickFirst(profile.fullEntitlement, bridge.fullEntitlement),
      true
    ),
    entitlementUsed: num(
      pickFirst(profile.entitlementUsed, bridge.entitlementUsed)
    )
  });
}

function parseHypotheticalCreditScore(message) {
  const t = safeStr(message).toLowerCase();
  const m =
    t.match(/\b(?:credit|score|fico)\D{0,12}(\d{3})\b/) ||
    t.match(/\b(\d{3})\D{0,12}(?:credit|score|fico)\b/);

  if (!m) return null;

  const score = Number(m[1]);
  return score >= 300 && score <= 850 ? score : null;
}

// ============================================================
// //#11 COMPENSATION
// ============================================================

async function computeCompensationSafe(normalizedProfile, scenario) {
  const fromCompContext = await trySharedCompensationContext(
    normalizedProfile,
    scenario
  );
  if (fromCompContext) return normalizeCompensation(fromCompContext);

  const fromPayEngine = await trySharedPayEngine(normalizedProfile, scenario);
  if (fromPayEngine) return normalizeCompensation(fromPayEngine);

  return computeCompensationFallback(normalizedProfile, scenario);
}

async function trySharedCompensationContext(normalizedProfile, scenario) {
  let mod = shared.compensationContext;

  if (!mod) {
    mod = await safeImport(shared.compensationContextPath || "./_share/compensation-context.js");
  }

  const fn = getExportedFunction(mod, [
    "buildCompensationContext",
    "getCompensationContext",
    "calculateCompensation",
    "buildCompensationTruthPacket",
    "getMilitaryCompensation"
  ]);

  if (!fn) return null;

  try {
    return await fn({
      profile: normalizedProfile,
      scenario,
      rank: scenario?.rankPaygrade || normalizedProfile?.rank_paygrade,
      yos: scenario?.yos || normalizedProfile?.yos,
      zip: scenario?.zip || normalizedProfile?.zip,
      base: scenario?.base || normalizedProfile?.base,
      family: scenario?.family ?? normalizedProfile?.family,
      va_disability: scenario?.vaDisability ?? normalizedProfile?.va_disability
    });
  } catch (err) {
    console.warn("compensation-context failed:", err?.message || err);
    return null;
  }
}

async function trySharedPayEngine(normalizedProfile, scenario) {
  let mod = shared.payEngine;

  if (!mod) {
    mod = await safeImport(shared.payEnginePath || "./_share/pay-engine.js");
  }

  const fn = getExportedFunction(mod, [
    "calculatePay",
    "calculateMilitaryPay",
    "buildPayPacket",
    "getPayContext"
  ]);

  if (!fn) return null;

  try {
    return await fn({
      profile: normalizedProfile,
      scenario,
      rank: scenario?.rankPaygrade || normalizedProfile?.rank_paygrade,
      yos: scenario?.yos || normalizedProfile?.yos,
      zip: scenario?.zip || normalizedProfile?.zip,
      family: scenario?.family ?? normalizedProfile?.family,
      va_disability: scenario?.vaDisability ?? normalizedProfile?.va_disability
    });
  } catch (err) {
    console.warn("pay-engine failed:", err?.message || err);
    return null;
  }
}

function normalizeCompensation(raw) {
  if (!raw || typeof raw !== "object") return null;

  const totalMonthly = num(
    pickFirst(
      raw.totalMonthly,
      raw.total_monthly,
      raw.monthlyTotal,
      raw.monthly_total,
      raw.total,
      raw.totalPay,
      raw.total_pay,
      raw.compensation?.totalMonthly,
      raw.compensation?.total_monthly
    )
  );

  const basePay = num(
    pickFirst(raw.basePay, raw.base_pay, raw.base, raw.pay?.basePay)
  );

  const bah = num(pickFirst(raw.bah, raw.BAH, raw.allowances?.bah));
  const bas = num(pickFirst(raw.bas, raw.BAS, raw.allowances?.bas));
  const va = num(
    pickFirst(
      raw.va,
      raw.vaDisability,
      raw.va_disability,
      raw.disability,
      raw.allowances?.va
    )
  );

  const resolvedTotal =
    totalMonthly ||
    [basePay, bah, bas, va].reduce((sum, n) => sum + (Number(n) || 0), 0) ||
    null;

  return stripEmpty({
    source: raw.source || raw._source || "shared_engine",
    rank: pickFirst(raw.rank, raw.rank_paygrade, raw.paygrade),
    yos: pickFirst(raw.yos, raw.years_of_service),
    zip: pickFirst(raw.zip, raw.bah_zip, raw.base_zip),
    basePay: roundMoney(basePay),
    bas: roundMoney(bas),
    bah: roundMoney(bah),
    va: roundMoney(va),
    totalMonthly: roundMoney(resolvedTotal),
    annualized: roundMoney(resolvedTotal ? resolvedTotal * 12 : null),
    raw: raw.raw ? undefined : undefined
  });
}

function computeCompensationFallback(normalizedProfile, scenario) {
  const income = num(pickFirst(scenario?.income, normalizedProfile?.income));
  if (!income) return null;

  return stripEmpty({
    source: "profile_income_fallback",
    totalMonthly: roundMoney(income),
    annualized: roundMoney(income * 12)
  });
}

// ============================================================
// //#12 MORTGAGE
// ============================================================

async function computeMortgageSafe(normalizedProfile, scenario, compensation) {
  const fromShared = await trySharedMortgageEngine(
    normalizedProfile,
    scenario,
    compensation
  );

  if (fromShared) return normalizeMortgage(fromShared);

  return computeMortgageFallback(normalizedProfile, scenario);
}

async function trySharedMortgageEngine(normalizedProfile, scenario, compensation) {
  let mod = shared.mortgageEngine;

  if (!mod) {
    mod = await safeImport(shared.mortgageEnginePath || "./_share/mortgage-engine.js");
  }

  const fn = getExportedFunction(mod, [
    "calculateMortgage",
    "calculateMortgagePayment",
    "buildMortgagePacket",
    "getMortgageContext"
  ]);

  if (!fn) return null;

  try {
    return await fn({
      profile: normalizedProfile,
      scenario,
      compensation,
      price: scenario?.price,
      down: scenario?.downpayment,
      downpayment: scenario?.downpayment,
      apr: scenario?.apr,
      termYears: scenario?.termYears || 30,
      taxAnnual: scenario?.propertyTaxAnnual,
      insAnnual: scenario?.insuranceAnnual,
      hoa: scenario?.hoa,
      pmi: scenario?.pmi,
      loanType: scenario?.loanType || "va"
    });
  } catch (err) {
    console.warn("mortgage-engine failed:", err?.message || err);
    return null;
  }
}

function normalizeMortgage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const monthly = num(
    pickFirst(
      raw.allIn,
      raw.all_in,
      raw.monthly,
      raw.monthlyPayment,
      raw.monthly_payment,
      raw.totalMonthly,
      raw.total_monthly,
      raw.payment,
      raw.breakdown?.allIn
    )
  );

  return stripEmpty({
    source: raw.source || raw._source || "mortgage_engine",
    price: roundMoney(pickFirst(raw.price, raw.homePrice, raw.purchasePrice)),
    loan: roundMoney(pickFirst(raw.loan, raw.loanAmount, raw.loan_amount)),
    downpayment: roundMoney(
      pickFirst(raw.downpayment, raw.downPayment, raw.down)
    ),
    apr: num(pickFirst(raw.apr, raw.rate, raw.interestRate)),
    termYears: num(pickFirst(raw.termYears, raw.term_years, raw.years)),
    pi: roundMoney(pickFirst(raw.pi, raw.principalInterest, raw.principal_interest)),
    taxes: roundMoney(pickFirst(raw.taxes, raw.taxMonthly, raw.propertyTaxes)),
    insurance: roundMoney(pickFirst(raw.insurance, raw.ins, raw.insuranceMonthly)),
    hoa: roundMoney(raw.hoa),
    pmi: roundMoney(raw.pmi),
    allIn: roundMoney(monthly),
    monthly: roundMoney(monthly)
  });
}

function computeMortgageFallback(normalizedProfile, scenario) {
  const price = num(pickFirst(scenario?.price, normalizedProfile?.projected_home_price));
  if (!price) return null;

  const down = Math.max(0, num(scenario?.downpayment) || 0);
  const apr = num(scenario?.apr) || 6.75;
  const years = num(scenario?.termYears) || 30;
  const loan = Math.max(0, price - down);

  const pi = pmtPI(loan, apr, years);
  const taxes = num(scenario?.propertyTaxAnnual) ? num(scenario.propertyTaxAnnual) / 12 : price * 0.0125 / 12;
  const insurance = num(scenario?.insuranceAnnual) ? num(scenario.insuranceAnnual) / 12 : price * 0.0035 / 12;
  const hoa = num(scenario?.hoa) || 0;
  const pmi = scenario?.loanType === "va" ? 0 : num(scenario?.pmi) || 0;
  const allIn = pi + taxes + insurance + hoa + pmi;

  return stripEmpty({
    source: "fallback_mortgage_estimate",
    price: roundMoney(price),
    loan: roundMoney(loan),
    downpayment: roundMoney(down),
    apr,
    termYears: years,
    pi: roundMoney(pi),
    taxes: roundMoney(taxes),
    insurance: roundMoney(insurance),
    hoa: roundMoney(hoa),
    pmi: roundMoney(pmi),
    allIn: roundMoney(allIn),
    monthly: roundMoney(allIn)
  });
}

function pmtPI(loanAmount, aprPctValue, years) {
  const principal = Number(loanAmount) || 0;
  const annualRate = Number(aprPctValue) || 0;
  const months = (Number(years) || 30) * 12;

  if (principal <= 0 || months <= 0) return 0;

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate <= 0) return principal / months;

  return (
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

// ============================================================
// //#13 AFFORDABILITY / VERDICT
// ============================================================

function computeAffordabilitySafe({
  normalizedProfile,
  scenario,
  compensation,
  mortgage
}) {
  const fromShared = trySharedAffordabilityEngine({
    normalizedProfile,
    scenario,
    compensation,
    mortgage
  });

  if (fromShared) return normalizeAffordability(fromShared);

  const income = num(
    pickFirst(
      compensation?.totalMonthly,
      scenario?.income,
      normalizedProfile?.income
    )
  );

  const monthlyHousing = num(
    pickFirst(mortgage?.allIn, mortgage?.monthly, mortgage?.monthlyPayment)
  );

  const expenses = num(
    pickFirst(scenario?.expenses, normalizedProfile?.monthly_expenses)
  );

  if (!income || !monthlyHousing) return null;

  const housingRatio = monthlyHousing / income;
  const totalOutflow = monthlyHousing + (expenses || 0);
  const residual = income - totalOutflow;
  const residualRatio = residual / income;

  let grade = "B";
  let status = "watch";
  let bluf = "This looks workable, but Amy would still stress test reserves, PCS timeline, and exit strategy.";

  if (housingRatio <= 0.25 && residualRatio >= 0.3) {
    grade = "A";
    status = "strong";
    bluf = "This looks financially strong on the monthly-payment side.";
  } else if (housingRatio > 0.35 || residualRatio < 0.15) {
    grade = "C";
    status = "caution";
    bluf = "This may be tight. Approval is not the same as a smart PCS decision.";
  }

  return stripEmpty({
    source: "fallback_affordability",
    income: roundMoney(income),
    housingMonthly: roundMoney(monthlyHousing),
    expenses: roundMoney(expenses),
    totalOutflow: roundMoney(totalOutflow),
    residual: roundMoney(residual),
    housingRatio: round2(housingRatio),
    residualRatio: round2(residualRatio),
    grade,
    status,
    bluf
  });
}

function trySharedAffordabilityEngine({
  normalizedProfile,
  scenario,
  compensation,
  mortgage
}) {
  const fn = getExportedFunction(shared.affordabilityEngine, [
    "calculateAffordability",
    "buildAffordabilityPacket",
    "scoreAffordability",
    "analyzeAffordability"
  ]);

  if (!fn) return null;

  try {
    return fn({
      profile: normalizedProfile,
      scenario,
      compensation,
      mortgage
    });
  } catch (err) {
    console.warn("affordability-engine failed:", err?.message || err);
    return null;
  }
}

function normalizeAffordability(raw) {
  if (!raw || typeof raw !== "object") return null;

  return stripEmpty({
    source: raw.source || raw._source || "affordability_engine",
    income: roundMoney(pickFirst(raw.income, raw.monthlyIncome)),
    housingMonthly: roundMoney(
      pickFirst(raw.housingMonthly, raw.housing_monthly, raw.payment)
    ),
    expenses: roundMoney(pickFirst(raw.expenses, raw.monthlyExpenses)),
    residual: roundMoney(pickFirst(raw.residual, raw.monthlyResidual)),
    housingRatio: num(pickFirst(raw.housingRatio, raw.housing_ratio)),
    residualRatio: num(pickFirst(raw.residualRatio, raw.residual_ratio)),
    dti: num(pickFirst(raw.dti, raw.debtToIncome)),
    grade: safeStr(pickFirst(raw.grade, raw.scoreGrade)),
    status: safeStr(pickFirst(raw.status, raw.verdictStatus)),
    bluf: safeStr(pickFirst(raw.bluf, raw.summary))
  });
}

function computeVerdictSafe({
  compensation,
  mortgage,
  affordability,
  scenario,
  normalizedProfile
}) {
  const fromShared = trySharedDecisionRules({
    compensation,
    mortgage,
    affordability,
    scenario,
    normalizedProfile
  });

  if (fromShared) return normalizeVerdict(fromShared);

  return computeVerdictFallback({
    compensation,
    mortgage,
    affordability
  });
}

function trySharedDecisionRules({
  compensation,
  mortgage,
  affordability,
  scenario,
  normalizedProfile
}) {
  const fn = getExportedFunction(shared.decisionRules, [
    "buildDecisionVerdict",
    "calculateDecisionVerdict",
    "getDecisionRules",
    "scoreDecision"
  ]);

  if (!fn) return null;

  try {
    return fn({
      profile: normalizedProfile,
      scenario,
      compensation,
      mortgage,
      affordability
    });
  } catch (err) {
    console.warn("decision-rules failed:", err?.message || err);
    return null;
  }
}

function normalizeVerdict(raw) {
  if (!raw || typeof raw !== "object") return null;

  return stripEmpty({
    source: raw.source || raw._source || "decision_rules",
    grade: safeStr(pickFirst(raw.grade, raw.score, raw.rating)),
    status: safeStr(pickFirst(raw.status, raw.verdict, raw.level)),
    bluf: safeStr(pickFirst(raw.bluf, raw.summary, raw.message)),
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    next_steps: Array.isArray(raw.next_steps) ? raw.next_steps : raw.nextSteps || []
  });
}

function computeVerdictFallback({ compensation, mortgage, affordability }) {
  if (!compensation && !mortgage && !affordability) return null;

  const grade = affordability?.grade || "B";
  const status = affordability?.status || "review";
  const bluf =
    affordability?.bluf ||
    "Amy can make a stronger call once income, expenses, projected price, and payment are all loaded.";

  const risks = [];
  const strengths = [];

  if (compensation?.totalMonthly) {
    strengths.push(`Monthly compensation context is loaded at about ${money(compensation.totalMonthly)}.`);
  }

  if (mortgage?.allIn || mortgage?.monthly) {
    strengths.push(`Estimated housing payment is loaded at about ${money(mortgage.allIn || mortgage.monthly)}.`);
  }

  if (affordability?.housingRatio && affordability.housingRatio > 0.35) {
    risks.push("Housing payment may be high compared with monthly income.");
  }

  if (affordability?.residual && affordability.residual < 1000) {
    risks.push("Residual monthly buffer may be thin after housing and expenses.");
  }

  if (!risks.length) {
    risks.push("PCS timeline, cash reserves, maintenance, and exit strategy still need to be tested.");
  }

  return stripEmpty({
    source: "fallback_verdict",
    grade,
    status,
    bluf,
    risks,
    strengths,
    next_steps: [
      "Confirm all-in housing payment.",
      "Compare payment to BAH and total monthly income.",
      "Stress test cash reserves and PCS timeline."
    ]
  });
}

// ============================================================
// //#14 VA LOAN CONTEXT
// ============================================================

async function buildVaLoanContextSafe({
  message,
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  affordability
}) {
  const packet = await trySharedVaLoans({
    message,
    profile: normalizedProfile,
    scenario,
    compensation,
    mortgage,
    affordability
  });

  if (packet) return packet;

  return buildVaLoanFallbackPacket({
    message,
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
    affordability
  });
}

async function trySharedVaLoans(input) {
  let mod = shared.vaLoans;

  if (!mod) {
    mod = await safeImport(shared.vaLoansPath || "./_share/va-loans.js");
  }

  const fn = getExportedFunction(mod, [
    "buildVaLoanTruthPacket",
    "analyzeVaLoanQuestion",
    "getVaLoanGuidance"
  ]);

  if (!fn) return null;

  try {
    const result = await fn(input);
    if (result && typeof result === "object") {
      return stripEmpty({
        source: result.source || result._source || "va-loans.js",
        ...result
      });
    }
    return result || null;
  } catch (err) {
    console.warn("va-loans shared engine failed:", err?.message || err);
    return null;
  }
}

function buildVaLoanFallbackPacket({
  message,
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  affordability
}) {
  const t = safeStr(message).toLowerCase();
  const price = num(pickFirst(scenario?.price, normalizedProfile?.projected_home_price));
  const downpayment = Math.max(0, num(pickFirst(scenario?.downpayment, normalizedProfile?.downpayment)) || 0);
  const vaDisability = num(pickFirst(normalizedProfile?.va_disability, scenario?.vaDisability));
  const fundingFeeExempt = boolish(
    pickFirst(
      normalizedProfile?.funding_fee_exempt,
      normalizedProfile?.fundingFeeExempt,
      scenario?.fundingFeeExempt
    ),
    vaDisability > 0
  );

  const priorUse = normalizePriorVaUse(scenario?.priorUse);
  const downPct = price > 0 ? downpayment / price : 0;
  const fundingFee = estimateVaFundingFeeFallback({
    price,
    downpayment,
    priorUse,
    fundingFeeExempt
  });

  let topic = "overview";

  if (/\bcoe\b|\bcertificate of eligibility\b|\beligib|\bqualify\b/.test(t)) topic = "eligibility";
  if (/\bfunding fee\b|\bexempt\b|\bexemption\b|\bdisabled veteran\b|\bva disability\b/.test(t)) topic = "funding_fee";
  if (/\bzero down\b|\b0 down\b|\bno down\b|\bdown payment\b|\bdownpayment\b/.test(t)) topic = "zero_down";
  if (/\bno pmi\b|\bpmi\b|\bprivate mortgage insurance\b/.test(t)) topic = "no_pmi";
  if (/\bappraisal\b|\binspection\b|\bminimum property\b/.test(t)) topic = "appraisal";
  if (/\boccupancy\b|\bprimary residence\b|\bowner occupy\b/.test(t)) topic = "occupancy";
  if (/\bseller concession\b|\bseller credit\b|\bseller concessions\b|\bseller credits\b/.test(t)) topic = "seller_concessions";
  if (/\bentitlement\b|\bfull entitlement\b|\bpartial entitlement\b/.test(t)) topic = "entitlement";
  if (/\bclosing cost\b|\bclosing costs\b|\bcash to close\b/.test(t)) topic = "closing_costs";
  if (/\bpcs\b|\brent vs buy\b|\bshould i buy\b|\bshould i rent\b/.test(t)) topic = "pcs_strategy";
  if (/\bnot buy\b|\bwhen not\b|\bbad idea\b|\btoo risky\b/.test(t)) topic = "when_not_to_buy";

  const topicGuidance = getFallbackVaTopic(topic);

  return stripEmpty({
    source: "fallback_va_loan_guidance",
    topic,
    title: topicGuidance.title,
    bluf: topicGuidance.bluf,
    key_points: topicGuidance.key_points,
    risks: topicGuidance.risks,
    next_steps: topicGuidance.next_steps,
    rules: {
      zero_down_possible: true,
      no_monthly_pmi: true,
      purchase_funding_fee_can_be_financed: true,
      purchase_closing_costs_can_be_financed: false,
      seller_concession_cap_pct: 0.04,
      standard_occupancy_days: 60
    },
    profile_signals: {
      va_disability: vaDisability,
      likely_funding_fee_exempt: fundingFeeExempt,
      base: normalizedProfile?.base || scenario?.base || null,
      rank: normalizedProfile?.rank_paygrade || scenario?.rankPaygrade || null
    },
    purchase_scenario: price
      ? {
          price: roundMoney(price),
          downpayment: roundMoney(downpayment),
          downPaymentPct: round2(downPct),
          priorUse,
          fundingFeeExempt,
          loan: {
            baseLoanAmount: roundMoney(Math.max(0, price - downpayment)),
            fundingFee: fundingFee ? roundMoney(fundingFee.amount) : 0,
            fundingFeePct: fundingFee ? fundingFee.feePct : 0,
            estimatedLoanWithFinancedFundingFee: fundingFee
              ? roundMoney(Math.max(0, price - downpayment) + fundingFee.amount)
              : roundMoney(Math.max(0, price - downpayment))
          }
        }
      : null,
    funding_fee: fundingFee,
    mortgage_context: mortgage || null,
    affordability_context: affordability || null,
    compensation_context: compensation || null,
    disclaimer:
      "VA Loan guidance is educational. Eligibility, funding fee exemption, approval, appraisal, and closing details must be confirmed with the lender, COE, and official VA/lender documentation."
  });
}

function normalizePriorVaUse(value) {
  if (value === true) return "subsequent_use";
  if (value === false) return "first_use";

  const s = safeStr(value).toLowerCase();

  if (["subsequent", "subsequent_use", "used", "yes", "true", "1", "again"].includes(s)) {
    return "subsequent_use";
  }

  return "first_use";
}

function estimateVaFundingFeeFallback({
  price,
  downpayment,
  priorUse,
  fundingFeeExempt
}) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return null;

  const down = Math.max(0, Number(downpayment) || 0);
  const baseLoan = Math.max(0, p - down);

  if (fundingFeeExempt) {
    return {
      exempt: true,
      feePct: 0,
      amount: 0,
      label: "Likely exempt based on provided profile signals"
    };
  }

  const downPct = p > 0 ? (down / p) * 100 : 0;
  const use = priorUse === "subsequent_use" ? "subsequent_use" : "first_use";

  let feePct = use === "subsequent_use" ? 0.033 : 0.0215;
  let label =
    use === "subsequent_use"
      ? "Subsequent use, less than 5% down"
      : "First use, less than 5% down";

  if (downPct >= 10) {
    feePct = 0.0125;
    label = `${use === "subsequent_use" ? "Subsequent" : "First"} use, 10% or more down`;
  } else if (downPct >= 5) {
    feePct = 0.015;
    label = `${use === "subsequent_use" ? "Subsequent" : "First"} use, 5% to 9.99% down`;
  }

  return {
    exempt: false,
    priorUse: use,
    downPaymentPct: round2(down / p),
    feePct,
    amount: roundMoney(baseLoan * feePct),
    label
  };
}

function getFallbackVaTopic(topic) {
  const topics = {
    overview: {
      title: "VA Loan Overview",
      bluf:
        "A VA Loan can be one of the strongest military home-buying tools when the payment, PCS timeline, and market risk still make sense.",
      key_points: [
        "Eligible borrowers may be able to buy with $0 down.",
        "VA Loans do not require monthly PMI.",
        "The lender still decides approval using income, credit, debt, assets, residual income, and property rules.",
        "The home generally must be intended as a primary residence."
      ],
      risks: [
        "Low down payment can mean low equity if you PCS quickly.",
        "Approval does not mean the decision is financially smart.",
        "Funding fee, closing costs, taxes, insurance, and maintenance still matter."
      ],
      next_steps: [
        "Confirm COE eligibility.",
        "Estimate the full all-in monthly payment.",
        "Compare payment to BAH, income, expenses, and PCS timeline."
      ]
    },
    eligibility: {
      title: "VA Loan Eligibility",
      bluf:
        "Eligibility starts with service history and a Certificate of Eligibility, but approval still depends on lender underwriting.",
      key_points: [
        "A COE helps show the lender that the borrower qualifies for the VA home loan benefit.",
        "Active-duty service members, Veterans, Guard/Reserve members, and some surviving spouses may qualify.",
        "A COE is not the same as loan approval."
      ],
      risks: [
        "Prior VA loan usage can affect entitlement.",
        "Partial entitlement may change the down payment requirement."
      ],
      next_steps: [
        "Request or confirm the COE.",
        "Ask the lender whether entitlement is full or partial.",
        "Compare at least two VA-experienced lenders."
      ]
    },
    funding_fee: {
      title: "VA Funding Fee",
      bluf:
        "The VA funding fee is a one-time cost for many VA borrowers, but some borrowers are exempt.",
      key_points: [
        "The fee depends on loan type, prior VA usage, down payment tier, and exemption status.",
        "The funding fee may often be financed into the loan on a purchase.",
        "Borrowers receiving VA disability compensation are commonly exempt."
      ],
      risks: [
        "Financing the fee increases the loan balance.",
        "Exemption status should be confirmed before closing.",
        "The funding fee is separate from lender fees, title fees, taxes, insurance, and prepaids."
      ],
      next_steps: [
        "Confirm funding-fee exemption on the COE or with the lender.",
        "Calculate the funding fee as paid upfront and financed.",
        "Compare first-use versus subsequent-use fee status."
      ]
    },
    zero_down: {
      title: "Zero Down",
      bluf:
        "$0 down is often possible for eligible VA borrowers with sufficient entitlement, but it should be treated as a tool, not a green light.",
      key_points: [
        "$0 down does not mean zero cash needed.",
        "Closing costs, inspections, reserves, moving costs, and maintenance still matter.",
        "A down payment may reduce the funding fee and monthly payment."
      ],
      risks: [
        "Low equity can be risky if orders change quickly.",
        "Rolling the funding fee into the loan increases the balance."
      ],
      next_steps: [
        "Compare $0 down and with-down-payment scenarios.",
        "Review cash reserves after closing.",
        "Check whether a down payment changes the funding-fee tier."
      ]
    },
    no_pmi: {
      title: "No Monthly PMI",
      bluf:
        "One of the strongest VA Loan advantages is that it does not require monthly private mortgage insurance.",
      key_points: [
        "VA Loans do not require monthly PMI, even with $0 down.",
        "The funding fee is separate from PMI.",
        "No PMI can improve monthly affordability versus low-down-payment conventional loans."
      ],
      risks: [
        "No PMI does not make the payment automatically safe.",
        "Taxes, insurance, HOA, maintenance, and utilities still matter."
      ],
      next_steps: [
        "Compare VA all-in payment against conventional with PMI.",
        "Evaluate affordability from all-in payment, not principal and interest only."
      ]
    },
    appraisal: {
      title: "VA Appraisal",
      bluf:
        "The VA appraisal checks value and minimum property requirements; it is not a substitute for a home inspection.",
      key_points: [
        "The appraisal helps establish value and property acceptability.",
        "A home inspection is for the buyer’s understanding of condition.",
        "VA appraisal conditions can require repairs before closing."
      ],
      risks: [
        "Skipping inspection can hide expensive issues.",
        "Appraisal repairs can slow or complicate the deal."
      ],
      next_steps: [
        "Order an independent home inspection.",
        "Ask the agent and lender how likely the property is to clear VA appraisal.",
        "Budget for repairs and maintenance."
      ]
    },
    occupancy: {
      title: "Occupancy",
      bluf:
        "A VA Loan is generally for a primary residence, not a pure investment property.",
      key_points: [
        "The borrower generally certifies intent to occupy as a primary residence.",
        "PCS, deployment, and spouse occupancy situations should be discussed with the lender.",
        "Do not treat VA financing as a disguised investment-loan shortcut."
      ],
      risks: [
        "Incorrect occupancy assumptions can create compliance problems.",
        "PCS timing must be disclosed and documented."
      ],
      next_steps: [
        "Tell the lender the actual PCS/deployment timeline.",
        "Document who will occupy the home and when.",
        "Ask the lender before assuming an exception applies."
      ]
    },
    seller_concessions: {
      title: "Seller Concessions",
      bluf:
        "VA can be powerful in negotiations because sellers may help with closing costs, but concessions have rules.",
      key_points: [
        "Sellers/builders may offer credits to cover some buyer costs.",
        "VA seller concessions are generally capped at 4% of reasonable value.",
        "Credits must be structured correctly with the lender and contract."
      ],
      risks: [
        "Poorly structured credits can be rejected or reduced.",
        "The appraisal value can limit what the transaction supports."
      ],
      next_steps: [
        "Ask the lender how much seller credit can be used before writing the offer.",
        "Have the agent structure concession language clearly.",
        "Use credits to reduce cash-to-close, not to hide an unaffordable payment."
      ]
    },
    entitlement: {
      title: "Entitlement",
      bluf:
        "Full entitlement usually means no VA loan limit, but it does not replace lender affordability or appraisal requirements.",
      key_points: [
        "The COE shows entitlement information.",
        "Prior VA loan usage can reduce available entitlement.",
        "Partial entitlement may create a down payment requirement."
      ],
      risks: [
        "Entitlement is often confused with affordability.",
        "County loan limits matter more when entitlement is not full."
      ],
      next_steps: [
        "Review the COE for entitlement status.",
        "Tell the lender about any prior VA loan still charged to entitlement.",
        "Calculate whether remaining entitlement supports the target loan."
      ]
    },
    closing_costs: {
      title: "Closing Costs",
      bluf:
        "VA does not mean zero cash to close. The funding fee may be financed, but most other purchase closing costs need buyer funds, seller credits, or lender credits.",
      key_points: [
        "Closing costs vary by lender, location, property, taxes, insurance, and prepaids.",
        "Seller credits may cover eligible closing costs.",
        "The funding fee is separate from normal closing costs."
      ],
      risks: [
        "A buyer can be approved but short on cash to close.",
        "Escrows and prepaids can surprise first-time buyers."
      ],
      next_steps: [
        "Request a Loan Estimate.",
        "Ask for estimated cash to close, not just monthly payment.",
        "Stress test reserves after closing."
      ]
    },
    pcs_strategy: {
      title: "PCS Housing Strategy",
      bluf:
        "The VA Loan is a tool. The PCS decision still has to pass timeline, cash-flow, exit-strategy, and market-risk tests.",
      key_points: [
        "Buying can make sense when payment is safe and the timeline is long enough.",
        "Renting can be smarter when the PCS timeline is short or reserves are thin.",
        "BAH should not be treated as permission to max out housing."
      ],
      risks: [
        "Short holding period plus low equity can create negative-sale risk.",
        "Maintenance and vacancy can turn a good payment into a bad plan."
      ],
      next_steps: [
        "Compare rent vs buy using expected time on station.",
        "Estimate resale break-even and rental fallback.",
        "Keep emergency reserves separate from down payment."
      ]
    },
    when_not_to_buy: {
      title: "When Not To Buy",
      bluf:
        "A VA Loan should help you buy well, not help you force a risky purchase.",
      key_points: [
        "Do not buy just because $0 down is available.",
        "Do not buy if the all-in payment leaves no monthly buffer.",
        "Do not buy if the PCS timeline is too short for transaction costs and market movement."
      ],
      risks: [
        "Negative equity risk after a short stay.",
        "House-poor cash flow.",
        "Maintenance, tenant, or forced-sale stress."
      ],
      next_steps: [
        "Lower the target price.",
        "Increase cash reserves.",
        "Rent first if the market or timeline is unclear.",
        "Re-run the scenario with conservative assumptions."
      ]
    }
  };

  return topics[topic] || topics.overview;
}

// ============================================================
// //#15 MISSING INPUTS / NEXT ACTION
// ============================================================

function listMissingInputs({
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  intent
}) {
  const missing = [];

  if (!normalizedProfile?.full_name && !normalizedProfile?.first_name) {
    missing.push("name");
  }

  if (
    ["compensation", "housing_affordability", "rent_vs_buy", "pcs_housing_strategy"].includes(intent)
  ) {
    if (!scenario?.rankPaygrade && !normalizedProfile?.rank_paygrade) missing.push("rank");
    if (!scenario?.yos && !normalizedProfile?.yos) missing.push("years_of_service");
    if (!scenario?.zip && !scenario?.base && !normalizedProfile?.zip && !normalizedProfile?.base) {
      missing.push("base_or_bah_zip");
    }
  }

  if (
    ["housing_affordability", "mortgage_explanation", "rent_vs_buy", "va_loan"].includes(intent)
  ) {
    if (!scenario?.price && !normalizedProfile?.projected_home_price) missing.push("home_price");
    if (!scenario?.creditScore && !normalizedProfile?.credit_score) missing.push("credit_score");
    if (!scenario?.expenses && !normalizedProfile?.monthly_expenses) missing.push("monthly_expenses");
  }

  if (intent === "va_loan") {
    if (normalizedProfile?.funding_fee_exempt === undefined && !normalizedProfile?.va_disability) {
      missing.push("funding_fee_exemption_status");
    }
    if (!scenario?.priorUse) missing.push("first_or_subsequent_va_use");
  }

  if (!compensation && intent === "compensation") {
    missing.push("compensation_context");
  }

  if (!mortgage && intent === "mortgage_explanation") {
    missing.push("mortgage_context");
  }

  return [...new Set(missing)];
}

function buildNextAction({
  intent,
  missing,
  verdict,
  compensation,
  mortgage,
  affordability,
  vaLoan
}) {
  if (intent === "va_loan") {
    if (vaLoan?.profile_signals?.likely_funding_fee_exempt || vaLoan?.funding_fee?.exempt) {
      return "Next move: compare the VA payment against BAH, monthly expenses, cash reserves, and PCS timeline.";
    }

    return "Next move: confirm COE and funding-fee status, then estimate all-in VA payment and cash-to-close.";
  }

  if (missing && missing.length) {
    return `Next move: add ${missing.slice(0, 3).join(", ")} so Amy can sharpen the answer.`;
  }

  if (verdict?.next_steps?.length) return verdict.next_steps[0];

  if (affordability?.status === "caution") {
    return "Next move: lower the target price or increase cash buffer before treating this as ready-to-buy.";
  }

  if (mortgage && compensation) {
    return "Next move: compare the payment against BAH, income, expenses, and PCS timeline.";
  }

  return "Next move: load profile, pay, housing price, and expenses for a stronger Amy recommendation.";
}

// ============================================================
// //#16 DIRECT REPLIES
// ============================================================

function buildDirectDeterministicReply({
  message,
  intent,
  normalizedProfile,
  deterministic
}) {
  const packet = deterministic?.public || {};
  const profile = normalizedProfile || {};
  const firstName = safeStr(profile.first_name || deriveFirstName(profile.full_name));

  if (intent === "greeting") {
    return `Hey${firstName ? ` ${firstName}` : ""} — Amy is online. I can help you understand pay, BAH, BAS, VA disability context, VA Loan strategy, mortgage estimates, affordability, PCS rent-vs-buy decisions, and your Financial Dashboard.`;
  }

  if (intent === "capabilities") {
    return [
      "BLUF: I’m Amy, PCSUnited’s AI Concierge powered by TheWing.ai.",
      "",
      "I can help with military compensation, BAH/BAS, VA disability context, VA Loan questions, mortgage estimates, affordability, rent-vs-buy strategy, PCS housing decisions, and dashboard interpretation.",
      "",
      "The sharper the profile data, the sharper the answer."
    ].join("\n");
  }

  if (intent === "profile_question") {
    return buildProfileQuestionReply(profile, packet);
  }

  if (intent === "compensation" && packet.compensation) {
    return buildCompensationReply(packet.compensation, profile);
  }

  if (intent === "va_loan" && packet.va_loan) {
    return buildDirectVaLoanReply({ packet: packet.va_loan });
  }

  return "";
}

function buildProfileQuestionReply(profile, packet) {
  const lines = [];

  lines.push("BLUF: Here is what I can safely see from your PCSUnited profile context.");

  if (profile.full_name || profile.first_name) {
    lines.push(`Name: ${profile.full_name || profile.first_name}`);
  }

  if (profile.rank_paygrade || profile.rank) {
    lines.push(`Rank: ${rankShort(profile.rank_paygrade || profile.rank) || profile.rank_paygrade || profile.rank}`);
  }

  if (profile.base) {
    lines.push(`Base / duty station: ${profile.base}`);
  }

  if (profile.zip) {
    lines.push(`BAH ZIP / location ZIP: ${profile.zip}`);
  }

  if (profile.yos !== undefined) {
    lines.push(`Years of service: ${profile.yos}`);
  }

  if (packet?.compensation?.totalMonthly) {
    lines.push(`Estimated monthly compensation loaded: ${money(packet.compensation.totalMonthly)}`);
  }

  if (lines.length === 1) {
    lines.push("I do not have enough member profile data loaded yet.");
  }

  return lines.join("\n");
}

function buildCompensationReply(comp, profile) {
  const name = safeStr(profile?.first_name || deriveFirstName(profile?.full_name));
  const rank = rankShort(comp.rank || profile?.rank_paygrade || profile?.rank);

  return [
    `BLUF: ${name ? `${name}, ` : ""}${rank ? `for ${rank}, ` : ""}your estimated monthly compensation context is ${money(comp.totalMonthly)}.`,
    "",
    `Base Pay: ${money(comp.basePay)}`,
    `BAH: ${money(comp.bah)}`,
    `BAS: ${money(comp.bas)}`,
    `VA / disability context: ${money(comp.va)}`,
    `Total Monthly: ${money(comp.totalMonthly)}`,
    "",
    "Use this as a planning estimate, then compare it against housing payment, expenses, savings, and PCS timeline."
  ].join("\n");
}

function buildDirectVaLoanReply({ packet }) {
  if (!packet) return "";

  const title = safeStr(packet.title || packet.topic || "VA Loan");
  const bluf = safeStr(
    packet.bluf ||
      "A VA Loan can be powerful, but it still needs a payment, timeline, reserve, and exit-strategy test."
  );

  const lines = [];

  lines.push(`BLUF: ${bluf}`);
  lines.push("");

  if (title) {
    lines.push(`Topic: ${title}`);
    lines.push("");
  }

  const fundingFee = pickFirst(
    packet.funding_fee,
    packet.fundingFee,
    packet.purchase_scenario?.loan?.fundingFee,
    packet.purchase_scenario?.loan?.funding_fee
  );

  if (fundingFee) {
    if (typeof fundingFee === "object") {
      const feeAmount = pickFirst(fundingFee.amount, fundingFee.fundingFee);
      const feePct = pickFirst(fundingFee.feePct, fundingFee.fee_pct);
      const exempt = fundingFee.exempt === true;

      lines.push("Numbers:");
      lines.push(
        exempt
          ? "- VA funding fee: likely exempt based on provided profile signals, but confirm with COE/lender."
          : `- Estimated VA funding fee: ${money(feeAmount)}${feePct ? ` (${pct(feePct)})` : ""}.`
      );

      if (packet.purchase_scenario?.loan?.estimatedLoanWithFinancedFundingFee) {
        lines.push(
          `- Estimated loan if financed: ${money(packet.purchase_scenario.loan.estimatedLoanWithFinancedFundingFee)}.`
        );
      }

      lines.push("");
    } else {
      lines.push("Numbers:");
      lines.push(`- VA funding fee: ${money(fundingFee)}.`);
      lines.push("");
    }
  }

  const keyPoints = Array.isArray(packet.key_points)
    ? packet.key_points
    : Array.isArray(packet.keyPoints)
      ? packet.keyPoints
      : [];

  if (keyPoints.length) {
    lines.push("Why it matters:");
    keyPoints.slice(0, 4).forEach((point) => {
      lines.push(`- ${point}`);
    });
    lines.push("");
  } else {
    lines.push("Why it matters:");
    lines.push("- Eligible VA borrowers can often buy with $0 down.");
    lines.push("- VA Loans do not require monthly PMI.");
    lines.push("- Closing costs, funding-fee status, appraisal/property condition, and occupancy still matter.");
    lines.push("");
  }

  const risks = Array.isArray(packet.risks) ? packet.risks : [];
  if (risks.length) {
    lines.push("Risks:");
    risks.slice(0, 4).forEach((risk) => {
      lines.push(`- ${risk}`);
    });
    lines.push("");
  } else {
    lines.push("Risk:");
    lines.push("- Approval does not mean the decision is good. The plan still has to survive PCS timeline, reserves, resale/rent-out fallback, and monthly cash flow.");
    lines.push("");
  }

  const nextSteps = Array.isArray(packet.next_steps)
    ? packet.next_steps
    : Array.isArray(packet.nextSteps)
      ? packet.nextSteps
      : [];

  lines.push("Next move:");
  if (nextSteps.length) {
    nextSteps.slice(0, 3).forEach((step) => {
      lines.push(`- ${step}`);
    });
  } else {
    lines.push("- Confirm COE and funding-fee status.");
    lines.push("- Estimate all-in payment and cash-to-close.");
    lines.push("- Compare payment to BAH, income, expenses, reserves, and PCS timeline.");
  }

  return lines.join("\n");
}

// ============================================================
// //#17 FALLBACK REPLIES
// ============================================================

function buildFallbackReply({ intent, normalizedProfile, deterministic }) {
  const packet = deterministic?.public || {};
  const firstName = safeStr(
    normalizedProfile?.first_name || deriveFirstName(normalizedProfile?.full_name)
  );

  if (intent === "va_loan") {
    return [
      "BLUF: A VA Loan can be powerful, but it still needs a payment, timeline, reserve, and exit-strategy test.",
      "",
      "Why: eligible borrowers can often use $0 down and VA Loans do not require monthly PMI, but closing costs, funding-fee status, property condition, appraisal, and occupancy rules still matter.",
      "",
      "Risk: approval does not mean the decision is good. A PCS timeline, thin reserves, high payment, or weak exit plan can turn a technically approved loan into a bad move.",
      "",
      "Next move: confirm COE and funding-fee status, estimate the all-in payment, then compare it to BAH, total income, monthly expenses, cash reserves, and expected time on station."
    ].join("\n");
  }

  if (intent === "compensation") {
    return [
      `BLUF: ${firstName ? `${firstName}, ` : ""}I need rank, years of service, dependent status, and BAH ZIP/base to calculate the compensation picture cleanly.`,
      "",
      "Once those are loaded, I can estimate Base Pay, BAS, BAH, VA disability context, and total monthly planning income."
    ].join("\n");
  }

  if (intent === "mortgage_explanation") {
    return [
      "BLUF: I can estimate the mortgage once I have price, down payment, APR, term, taxes, insurance, HOA, and loan type.",
      "",
      "For PCS planning, the all-in monthly payment matters more than principal and interest alone."
    ].join("\n");
  }

  if (intent === "housing_affordability" || intent === "rent_vs_buy") {
    return [
      "BLUF: Buying power is not just what a lender approves. The better test is payment versus BAH, income, expenses, reserves, PCS timeline, and exit strategy.",
      "",
      "Next move: load income, projected price, expenses, savings/down payment, credit score, and expected time on station."
    ].join("\n");
  }

  if (packet?.verdict?.bluf) {
    return packet.verdict.bluf;
  }

  return [
    "BLUF: Amy is online, but I need a little more context to give the sharp answer.",
    "",
    "I can help with military compensation, VA Loan strategy, mortgage estimates, affordability, PCS rent-vs-buy decisions, and dashboard interpretation."
  ].join("\n");
}

// ============================================================
// //#18 STRUCTURED ANSWER
// ============================================================

function buildStructuredAnswerFromText({
  reply,
  deterministic,
  normalizedProfile,
  intent
}) {
  const packet = deterministic?.public || {};
  const vaLoan = packet.va_loan || null;

  const numbers = {};

  if (packet.compensation?.totalMonthly) {
    numbers.total_monthly_compensation = packet.compensation.totalMonthly;
  }

  if (packet.compensation?.basePay) numbers.base_pay = packet.compensation.basePay;
  if (packet.compensation?.bah) numbers.bah = packet.compensation.bah;
  if (packet.compensation?.bas) numbers.bas = packet.compensation.bas;
  if (packet.compensation?.va) numbers.va_disability_context = packet.compensation.va;

  if (packet.mortgage?.allIn || packet.mortgage?.monthly) {
    numbers.estimated_housing_payment = packet.mortgage.allIn || packet.mortgage.monthly;
  }

  if (packet.affordability?.housingRatio !== undefined) {
    numbers.housing_ratio = packet.affordability.housingRatio;
  }

  if (packet.affordability?.residual !== undefined) {
    numbers.monthly_residual = packet.affordability.residual;
  }

  const vaFundingFee = pickFirst(
    vaLoan?.funding_fee,
    vaLoan?.fundingFee,
    vaLoan?.purchase_scenario?.loan?.fundingFee,
    vaLoan?.purchase_scenario?.loan?.funding_fee
  );

  if (vaFundingFee) {
    if (typeof vaFundingFee === "object") {
      numbers.va_funding_fee = pickFirst(
        vaFundingFee.amount,
        vaFundingFee.fundingFee,
        vaFundingFee.fee
      );
      numbers.va_funding_fee_pct = pickFirst(
        vaFundingFee.feePct,
        vaFundingFee.fee_pct,
        vaFundingFee.percent
      );
      numbers.va_funding_fee_exempt = vaFundingFee.exempt === true;
    } else {
      numbers.va_funding_fee = vaFundingFee;
    }
  }

  const warnings = [];

  if (Array.isArray(packet.verdict?.risks)) {
    warnings.push(...packet.verdict.risks);
  }

  if (Array.isArray(vaLoan?.risks)) {
    warnings.push(...vaLoan.risks);
  }

  const nextSteps = [];

  if (intent === "va_loan") {
    if (Array.isArray(vaLoan?.next_steps)) {
      nextSteps.push(...vaLoan.next_steps);
    } else if (Array.isArray(vaLoan?.nextSteps)) {
      nextSteps.push(...vaLoan.nextSteps);
    }

    if (!nextSteps.length) {
      nextSteps.push(
        "Confirm COE and funding-fee status.",
        "Estimate all-in payment and cash-to-close.",
        "Compare payment against BAH, income, expenses, reserves, and PCS timeline."
      );
    }
  } else if (Array.isArray(packet.verdict?.next_steps)) {
    nextSteps.push(...packet.verdict.next_steps);
  } else if (packet.next_action) {
    nextSteps.push(packet.next_action);
  }

  const followUp = buildFollowUpQuestion({
    intent,
    packet,
    normalizedProfile
  });

  return stripEmpty({
    summary: safeStr(reply),
    numbers,
    warnings: [...new Set(warnings)].slice(0, 6),
    next_steps: [...new Set(nextSteps)].slice(0, 6),
    follow_up_question: followUp,
    intent,
    profile_name: normalizedProfile?.full_name || normalizedProfile?.first_name || null
  });
}

function buildFollowUpQuestion({ intent, packet, normalizedProfile }) {
  if (intent === "va_loan") {
    const vaLoan = packet?.va_loan || {};
    const exempt =
      vaLoan?.funding_fee?.exempt === true ||
      vaLoan?.profile_signals?.likely_funding_fee_exempt === true ||
      normalizedProfile?.funding_fee_exempt === true ||
      normalizedProfile?.va_disability > 0;

    if (exempt) {
      return "Want me to compare the VA payment against your BAH, monthly expenses, and PCS timeline?";
    }

    return "Want me to estimate the VA funding fee and show how it changes your loan balance?";
  }

  if (intent === "compensation") {
    return "Want me to compare this monthly compensation against a target home payment?";
  }

  if (intent === "housing_affordability") {
    return "Want me to turn this into a safer target home-price range?";
  }

  if (intent === "rent_vs_buy") {
    return "Want me to run this as a PCS rent-vs-buy decision using your expected time on station?";
  }

  return "Want me to run the numbers against your PCS timeline and housing budget?";
}

// ============================================================
// //#19 OPENAI PROMPTS
// ============================================================

function buildSystemPrompt({ profileSummary, deterministic }) {
  const packet = deterministic?.public || {};

  return [
    "You are Amy, the PCSUnited AI Concierge powered by TheWing.ai.",
    "",
    "Your job:",
    "- Help military members and families understand PCS housing decisions.",
    "- Explain military compensation, BAH, BAS, VA disability context, mortgage estimates, affordability, rent-vs-buy decisions, VA Loan strategy, and PCS risk.",
    "- Keep answers practical, concise, and member-safe.",
    "",
    "Hard rules:",
    "- Never invent or change the member’s name.",
    "- Never invent rank, pay, BAH, VA disability, funding-fee exemption, eligibility, approval, entitlement, or loan terms.",
    "- Never claim the user is approved for a loan.",
    "- Never claim the user is eligible for a VA Loan unless the deterministic packet clearly supports that.",
    "- Never claim funding-fee exemption is guaranteed. Say it must be confirmed on COE/lender documentation.",
    "- Use deterministic packets as the source of truth.",
    "- If data is missing, say what is missing and what to do next.",
    "- Do not give legal, tax, underwriting, or lender approval as fact.",
    "",
    "Tone:",
    "- Clear, confident, warm, and direct.",
    "- Use BLUF first.",
    "- Avoid generic fluff.",
    "- Explain risk like a smart PCS advisor.",
    "",
    `Profile summary:\n${JSON.stringify(profileSummary || {}, null, 2)}`,
    "",
    `Compensation packet available:\n${JSON.stringify(packet?.compensation || {}, null, 2)}`,
    "",
    `Mortgage packet available:\n${JSON.stringify(packet?.mortgage || {}, null, 2)}`,
    "",
    `Affordability packet available:\n${JSON.stringify(packet?.affordability || {}, null, 2)}`,
    "",
    `VA Loan packet available:\n${JSON.stringify(packet?.va_loan || {}, null, 2)}`,
    "",
    `Verdict packet available:\n${JSON.stringify(packet?.verdict || {}, null, 2)}`
  ].join("\n");
}

function buildUserPayload({
  message,
  email,
  intent,
  normalizedProfile,
  deterministic,
  mergedContext
}) {
  return {
    message,
    email,
    intent,
    profile: stripSensitiveProfile(normalizedProfile),
    truth_packet: deterministic?.public || {},
    va_loan_packet: deterministic?.public?.va_loan || null,
    context_used: deterministic?.context_used || {},
    behavior_rules: {
      use_truth_packet_first: true,
      use_va_loan_packet_for_va_questions: true,
      do_not_invent_or_change_member_name: true,
      do_not_invent_compensation: true,
      do_not_invent_va_loan_eligibility: true,
      do_not_invent_funding_fee_exemption: true,
      do_not_claim_loan_approval: true,
      ask_for_missing_inputs_when_needed: true
    },
    context_keys: Object.keys(mergedContext || {})
  };
}

async function callOpenAI({ systemPrompt, userPayload, model }) {
  if (!OPENAI_API_KEY) return "";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify(userPayload, null, 2)
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn("OpenAI call failed:", response.status, text);
      return "";
    }

    const data = await response.json();
    return safeStr(data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.warn("OpenAI call failed:", err?.message || err);
    return "";
  }
}

// ============================================================
// //#20 PROFILE SUMMARY / PRIVACY
// ============================================================

function buildProfileSummary(normalizedProfile, deterministic) {
  const p = normalizedProfile || {};
  const comp = deterministic?.public?.compensation || null;
  const mortgage = deterministic?.public?.mortgage || null;
  const affordability = deterministic?.public?.affordability || null;

  return stripEmpty({
    name: p.full_name || p.first_name || null,
    first_name: p.first_name || deriveFirstName(p.full_name),
    rank: rankShort(p.rank_paygrade || p.rank) || p.rank_paygrade || p.rank,
    paygrade: p.rank_paygrade || null,
    years_of_service: p.yos,
    base: p.base,
    zip: p.zip,
    family: p.family,
    family_size: p.family_size,
    military_status: p.mode || p.military_status,
    va_disability: p.va_disability,
    likely_funding_fee_exempt: p.funding_fee_exempt,
    projected_home_price: p.projected_home_price,
    monthly_expenses: p.monthly_expenses,
    credit_score: p.credit_score,
    compensation_total_monthly: comp?.totalMonthly,
    estimated_housing_payment: mortgage?.allIn || mortgage?.monthly,
    affordability_grade: affordability?.grade,
    affordability_status: affordability?.status
  });
}

function stripSensitiveProfile(profile) {
  const p = profile || {};

  return stripEmpty({
    email: p.email ? maskEmail(p.email) : undefined,
    full_name: p.full_name,
    first_name: p.first_name,
    rank: p.rank,
    rank_paygrade: p.rank_paygrade,
    yos: p.yos,
    mode: p.mode,
    military_status: p.military_status,
    base: p.base,
    zip: p.zip,
    family: p.family,
    family_size: p.family_size,
    va_disability: p.va_disability,
    funding_fee_exempt: p.funding_fee_exempt,
    projected_home_price: p.projected_home_price,
    monthly_expenses: p.monthly_expenses,
    income: p.income,
    debt: p.debt,
    downpayment: p.downpayment,
    savings: p.savings,
    credit_score: p.credit_score,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    cityKey: p.cityKey,
    loanType: p.loanType,
    termYears: p.termYears
  });
}

function maskEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return "";
  const [local, domain] = e.split("@");
  if (!local || !domain) return e;
  const visible = local.length <= 2 ? local[0] || "" : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}
