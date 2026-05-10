// netlify/functions/ask-amy.js
// ============================================================
// TheWing.ai • PCSUnited AI Concierge — Ask Amy
// v1.4.0 • ES MODULE FULL REPLACEMENT
//
// PURPOSE
// - Member-facing PCSUnited AI Concierge endpoint
// - Compatible with package.json: { "type": "module" }
// - Reads PCSUnited profile/bridge/dashboard context from frontend
// - Enriches from Supabase when email exists
// - Uses _share/compensation-context.js for Base Pay + BAS + BAH + VA
// - Uses _share/mortgage-engine.js for mortgage math when available
// - Uses _share/va-loans.js for VA Loan education, funding-fee guidance,
//   entitlement logic, appraisal/inspection guidance, and PCS buyer strategy
// - Uses OpenAI only as the conversational explanation layer
//
// CLIENT
// - POST https://thewing.netlify.app/api/ask-amy
// - POST /.netlify/functions/ask-amy
//
// REQUIRED ENV
// - OPENAI_API_KEY
//
// OPTIONAL ENV
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_MODEL
// ============================================================

/* eslint-disable no-console */

// ============================================================
// //#1 IMPORTS — ES MODULE ONLY
// ============================================================

import { createClient } from "@supabase/supabase-js";
import * as compensationContext from "./_share/compensation-context.js";
import * as mortgageEngine from "./_share/mortgage-engine.js";
import * as vaLoans from "./_share/va-loans.js";

// ============================================================
// //#2 CONFIG
// ============================================================

const VERSION = "1.4.0";
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
// //#3 NETLIFY HANDLER — ES MODULE EXPORT
// ============================================================

export async function handler(event) {
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
}

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
      "married"
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
      "without_dependents"
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

  const bridge = mergeDeep(
    {},
    body?.bridge || {},
    context?.bridge || {}
  );

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
  if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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
    first_name: safeStr(pickFirst(raw.first_name, raw.firstName)),
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
    /\bva loan\b|\bva mortgage\b|\bva-backed\b|\bva backed\b|\bcertificate of eligibility\b|\bcoe\b|\bfunding fee\b|\bva funding fee\b|\bva appraisal\b|\bva inspection\b|\bva entitlement\b|\bfull entitlement\b|\bpartial entitlement\b|\bseller concession\b|\bseller credit\b|\bzero down\b|\b0 down\b|\bno down payment\b|\bno pmi\b|\boccupancy\b|\bprimary residence\b|\bva closing costs\b/.test(t)
  ) {
    return "va_loan";
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

  if (t.length > 120) return true;

  if (
    [
      "housing_affordability",
      "mortgage_explanation",
      "rent_vs_buy",
      "pcs_housing_strategy",
      "dashboard_interpretation",
      "general_guidance",
      "va_loan"
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
      va_loan: false,
      dashboard: Boolean(
        Object.keys(mergedContext?.fad || {}).length ||
          Object.keys(mergedContext?.kpi_overrides || {}).length
      ),
      supabase: Boolean(mergedContext?.supabase_loaded),
      shared_engines: {
        compensation_context: Boolean(compensationContext),
        mortgage_engine: Boolean(mortgageEngine),
        va_loans: Boolean(vaLoans)
      }
    },
    internal: {},
    public: {
      profile_summary: null,
      compensation: null,
      housing_inputs: null,
      mortgage: null,
      affordability: null,
      va_loan: null,
      verdict: null,
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

  const vaLoan = buildVaLoanContextSafe({
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

  const verdict = computeVerdictFallback({
    compensation,
    mortgage,
    affordability
  });

  if (verdict) {
    truth.public.verdict = verdict;
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
    affordability
  });

  if (debug) {
    truth.debug = {
      email,
      scenario,
      merged_context_keys: Object.keys(mergedContext || {}),
      normalized_profile_keys: Object.keys(normalizedProfile || {}),
      compensation_loaded: Boolean(compensation),
      mortgage_loaded: Boolean(mortgage),
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
      fad.rank_paygrade,
      fad.rank
    )
  );

  const yos = num(pickFirst(profile.yos, bridge.yos, fad.yos, intake.yos));

  const base = safeStr(
    pickFirst(profile.base, bridge.base, fad.base, intake.base)
  );

  const zip = safeStr(
    pickFirst(profile.zip, bridge.zip, bridge.bahZip, fad.zip, fad.baseZip)
  );

  const family = pickFirst(
    profile.family,
    bridge.family,
    bridge.withDependents,
    fad.family,
    fad.withDependents
  );

  return {
    message,
    price,
    expenses,
    downpayment,
    creditScore: creditScore ? clamp(Math.round(creditScore), 300, 850) : null,
    creditScoreSource: hypotheticalCreditScore
      ? "question_hypothetical"
      : "profile_or_dashboard",
    termYears: termYears || 30,
    loanType: loanType || "va",
    income,
    debt,
    rank_paygrade: rankPaygrade,
    yos,
    base,
    zip,
    family: family === null ? null : boolish(family, false),
    mode: normalizeMode(pickFirst(profile.mode, bridge.mode, fad.mode, "active")),
    va_disability: num(
      pickFirst(profile.va_disability, bridge.va_disability, fad.va_disability)
    ),
    bedrooms: num(pickFirst(profile.bedrooms, bridge.bedrooms, fad.bedrooms)),
    cityKey: safeStr(pickFirst(profile.cityKey, bridge.cityKey, fad.cityKey)),
    aiou
  };
}

function parseHypotheticalCreditScore(message) {
  const t = safeStr(message).toLowerCase();
  if (!t) return null;

  const looksHypothetical =
    /\bif\b|\bwent up\b|\braise\b|\bbump\b|\bincrease\b|\bimprove\b|\bup to\b|\bto\s+\d{3}\b/.test(
      t
    );

  if (!looksHypothetical) return null;

  const match =
    t.match(/(?:credit\s*score|fico)\D{0,16}(\d{3})\b/) ||
    t.match(/\bto\D{0,4}(\d{3})\b/);

  if (!match) return null;

  const score = Number(match[1]);

  if (!Number.isFinite(score) || score < 300 || score > 850) return null;

  return Math.round(score);
}

// ============================================================
// //#11 COMPENSATION ENGINE
// ============================================================

async function computeCompensationSafe(profile, scenario) {
  const input = {
    mode: scenario.mode || profile.mode || "active",
    rank: scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    paygrade: scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    rank_paygrade:
      scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    yos: scenario.yos ?? profile.yos,
    yearsOfService: scenario.yos ?? profile.yos,
    family: scenario.family ?? profile.family,
    withDependents: scenario.family ?? profile.family,
    base: scenario.base || profile.base,
    zip: scenario.zip || profile.zip,
    bahZip: scenario.zip || profile.zip,
    va_disability: scenario.va_disability ?? profile.va_disability
  };

  const fn =
    compensationContext.safeBuildCompensationContext ||
    compensationContext.buildCompensationContext ||
    compensationContext.default?.safeBuildCompensationContext ||
    compensationContext.default?.buildCompensationContext;

  if (typeof fn === "function") {
    try {
      const result = await fn(input);
      if (result && typeof result === "object" && result.ok !== false) {
        return normalizeCompensation(result, input);
      }
    } catch (err) {
      console.warn("compensation-context failed:", err?.message || err);
    }
  }

  const fallbackIncome = num(
    pickFirst(
      profile.total_monthly,
      profile.totalMonthly,
      profile.total_monthly_income,
      profile.totalMonthlyIncome,
      profile.monthly_income,
      profile.monthlyIncome,
      profile.income,
      scenario.income
    )
  );

  if (fallbackIncome && fallbackIncome > 0) {
    return stripEmpty({
      ok: true,
      rank_paygrade: normalizePaygrade(input.rank_paygrade),
      rank_short: rankShort(input.rank_paygrade),
      yos: num(input.yos),
      base: safeStr(input.base),
      zip: safeStr(input.zip),
      with_dependents: input.withDependents ?? input.family,
      total_monthly: roundMoney(fallbackIncome),
      source: "Supabase/member profile income fallback",
      note:
        "Compensation context did not return a breakdown, so Amy used saved monthly income from the member profile."
    });
  }

  return null;
}

function normalizeCompensation(result, input) {
  const basePay = num(
    pickFirst(
      result.basePay,
      result.base_pay,
      result.basicPay,
      result.monthly_base_pay,
      result.monthly?.basePay,
      result.monthly?.basicPay,
      result.basicPayMonthly,
      result.monthly?.basic_pay
    )
  );

  const bas = num(
    pickFirst(
      result.bas,
      result.BAS,
      result.basic_allowance_subsistence,
      result.monthly?.bas,
      result.basMonthly
    )
  );

  const bah = num(
    pickFirst(
      result.bah,
      result.BAH,
      result.bahMonthly,
      result.monthlyBah,
      result.housing_allowance,
      result.monthly?.bah,
      result.components?.bah?.bahMonthly
    )
  );

  const va = num(
    pickFirst(
      result.va,
      result.va_disability_pay,
      result.vaCompensation,
      result.vaMonthly,
      result.disability,
      result.monthly?.vaDisability,
      result.components?.va?.vaMonthly
    )
  );

  const retirement = num(
    pickFirst(
      result.retirement,
      result.retired_pay,
      result.retirement_pay,
      result.retirementMonthly,
      result.monthly?.retirement,
      result.components?.retirement?.retirementMonthly
    )
  );

  const specialPay = num(
    pickFirst(
      result.specialPay,
      result.specialPayMonthly,
      result.monthly?.specialPay
    )
  );

  const spouseIncome = num(
    pickFirst(
      result.spouseIncome,
      result.spouseIncomeMonthly,
      result.monthly?.spouseIncome
    )
  );

  const additionalIncome = num(
    pickFirst(
      result.additionalIncome,
      result.additionalIncomeMonthly,
      result.monthly?.additionalIncome
    )
  );

  const computedTotal = [
    basePay,
    bas,
    bah,
    va,
    retirement,
    specialPay,
    spouseIncome,
    additionalIncome
  ]
    .filter((x) => Number.isFinite(x))
    .reduce((a, b) => a + b, 0);

  const total = num(
    pickFirst(
      result.total,
      result.totalMonthly,
      result.total_monthly,
      result.monthly_total,
      result.householdIncomeMonthly,
      result.militaryIncomeMonthly,
      result.monthly?.total,
      result.monthly?.householdIncome,
      result.monthly?.militaryIncome,
      result.totalMonthlyMilitaryIncome,
      result.totalHouseholdIncomeMonthly,
      computedTotal
    )
  );

  if (
    ![
      basePay,
      bas,
      bah,
      va,
      retirement,
      specialPay,
      spouseIncome,
      additionalIncome,
      total
    ].some((x) => Number.isFinite(x) && x > 0)
  ) {
    return null;
  }

  return stripEmpty({
    ok: result.ok !== false,

    rank_paygrade: normalizePaygrade(
      pickFirst(
        result.rank_paygrade,
        result.paygrade,
        result.rank,
        result.profile?.rank_paygrade,
        input.rank_paygrade
      )
    ),
    rank_short: rankShort(
      pickFirst(
        result.rank_paygrade,
        result.paygrade,
        result.rank,
        result.profile?.rank_paygrade,
        input.rank_paygrade
      )
    ),
    yos: num(
      pickFirst(
        result.yos,
        result.yearsOfService,
        result.profile?.yos,
        result.profile?.yearsOfService,
        input.yos
      )
    ),

    base: safeStr(
      pickFirst(
        result.resolvedBase,
        result.canonicalBase,
        result.base,
        result.profile?.base,
        input.base
      )
    ),
    zip: safeStr(
      pickFirst(
        result.resolvedZip,
        result.dutyZip,
        result.zip,
        result.profile?.zip,
        result.profile?.dutyZip,
        input.zip
      )
    ),
    mha_code: safeStr(pickFirst(result.mhaCode, result.profile?.mhaCode)),
    mha_name: safeStr(pickFirst(result.mhaName, result.profile?.mhaName)),

    with_dependents: pickFirst(
      result.with_dependents,
      result.profile?.hasDependents,
      input.withDependents,
      input.family
    ),
    dependents: pickFirst(result.dependents, result.profile?.dependents),

    base_pay: roundMoney(basePay),
    bas: roundMoney(bas),
    bah: roundMoney(bah),
    va_disability_pay: roundMoney(va),
    retirement_pay: roundMoney(retirement),
    special_pay: roundMoney(specialPay),
    spouse_income: roundMoney(spouseIncome),
    additional_income: roundMoney(additionalIncome),
    total_monthly: roundMoney(total),

    source: safeStr(
      pickFirst(
        result.source,
        result.sourceVersion,
        "TheWing compensation-context"
      )
    ),
    note: safeStr(
      pickFirst(
        result.note,
        Array.isArray(result.notes) ? result.notes.join(" ") : "",
        result.bahNote,
        result.reason
      )
    ),
    warnings: Array.isArray(result.warnings) ? result.warnings : undefined
  });
}

// ============================================================
// //#12 MORTGAGE ENGINE
// ============================================================

async function computeMortgageSafe(profile, scenario, compensation) {
  const price = num(scenario.price);
  if (!price || price <= 0) return null;

  const downpayment = num(scenario.downpayment) || 0;
  const creditScore = num(scenario.creditScore);
  const termYears = num(scenario.termYears) || 30;
  const loanType = scenario.loanType || "va";

  const input = {
    price,
    homePrice: price,
    purchasePrice: price,
    downpayment,
    downPayment: downpayment,
    creditScore,
    credit_score: creditScore,
    termYears,
    term_years: termYears,
    loanType,
    loan_type: loanType,
    income: compensation?.total_monthly || null,
    monthlyIncome: compensation?.total_monthly || null,
    base: scenario.base || profile.base,
    zip: scenario.zip || profile.zip,
    cityKey: scenario.cityKey || profile.cityKey
  };

  const fn =
    mortgageEngine.safeCalculateMortgage ||
    mortgageEngine.calculateMortgage ||
    mortgageEngine.default?.safeCalculateMortgage ||
    mortgageEngine.default?.calculateMortgage;

  if (typeof fn === "function") {
    try {
      const result = await fn(input);
      if (result && typeof result === "object" && result.ok !== false) {
        return normalizeMortgage(result, input);
      }
    } catch (err) {
      console.warn("mortgage-engine failed:", err?.message || err);
    }
  }

  return computeMortgageFallback(input);
}

function normalizeMortgage(result, input) {
  const principalInterest = num(
    pickFirst(
      result.principal_interest,
      result.principalInterest,
      result.pi,
      result.p_and_i,
      result.monthlyPI,
      result.breakdown?.principalInterest
    )
  );

  const taxes = num(
    pickFirst(
      result.taxes,
      result.tax,
      result.property_tax,
      result.propertyTax,
      result.breakdown?.taxes
    )
  );

  const insurance = num(
    pickFirst(
      result.insurance,
      result.home_insurance,
      result.homeownersInsurance,
      result.breakdown?.insurance
    )
  );

  const hoa = num(
    pickFirst(result.hoa, result.hoa_monthly, result.hoaMonthly, result.breakdown?.hoa)
  );

  const pmi = num(
    pickFirst(result.pmi, result.PMI, result.breakdown?.pmi)
  );

  const allIn = num(
    pickFirst(
      result.all_in,
      result.allIn,
      result.total,
      result.total_monthly,
      result.monthly_total,
      result.payment,
      result.monthlyPayment,
      result.allInMonthly,
      result.breakdown?.allIn,
      [principalInterest, taxes, insurance, hoa, pmi]
        .filter((x) => Number.isFinite(x))
        .reduce((a, b) => a + b, 0)
    )
  );

  if (!allIn || allIn <= 0) return null;

  return stripEmpty({
    ok: result.ok !== false,
    price: roundMoney(pickFirst(result.price, input.price)),
    downpayment: roundMoney(pickFirst(result.downpayment, input.downpayment)),
    loan_amount: roundMoney(
      pickFirst(result.loan_amount, result.loanAmount, input.price - input.downpayment)
    ),
    apr: num(pickFirst(result.apr, result.rate, result.apr_percent, result.aprPct)),
    term_years: num(pickFirst(result.term_years, result.termYears, input.termYears)),
    principal_interest: roundMoney(principalInterest),
    taxes: roundMoney(taxes),
    insurance: roundMoney(insurance),
    hoa: roundMoney(hoa),
    pmi: roundMoney(pmi),
    all_in_monthly: roundMoney(allIn),
    source: safeStr(pickFirst(result.source, "TheWing mortgage-engine")),
    note: safeStr(pickFirst(result.note, result.reason))
  });
}

function computeMortgageFallback(input) {
  const price = num(input.price);
  if (!price || price <= 0) return null;

  const downpayment = Math.max(0, num(input.downpayment) || 0);
  const loanAmount = Math.max(0, price - downpayment);

  const apr = aprFromCreditScore(input.creditScore);
  const termYears = num(input.termYears) || 30;

  const principalInterest = monthlyPaymentPI(loanAmount, apr, termYears);

  const taxes = price * 0.0125 / 12;
  const insurance = price * 0.004 / 12;
  const hoa = 0;

  const isVA = String(input.loanType || "").toLowerCase() === "va";
  const ltv = loanAmount / price;
  const pmi = !isVA && ltv > 0.8 ? price * 0.006 / 12 : 0;

  const allIn = principalInterest + taxes + insurance + hoa + pmi;

  return {
    ok: true,
    price: roundMoney(price),
    downpayment: roundMoney(downpayment),
    loan_amount: roundMoney(loanAmount),
    apr,
    term_years: termYears,
    principal_interest: roundMoney(principalInterest),
    taxes: roundMoney(taxes),
    insurance: roundMoney(insurance),
    hoa: roundMoney(hoa),
    pmi: roundMoney(pmi),
    all_in_monthly: roundMoney(allIn),
    source: "ask-amy fallback mortgage math",
    note:
      "Fallback estimate only. The shared mortgage-engine should be treated as source of truth when available."
  };
}

function aprFromCreditScore(score) {
  const s = num(score);

  if (!s) return 0.07;
  if (s >= 780) return 0.0625;
  if (s >= 740) return 0.0675;
  if (s >= 700) return 0.0725;
  if (s >= 660) return 0.08;

  return 0.09;
}

function monthlyPaymentPI(principal, apr, termYears) {
  const P = Number(principal);
  const r = Number(apr) / 12;
  const n = Math.round((Number(termYears) || 30) * 12);

  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0;
  if (!Number.isFinite(r) || r <= 0) return P / n;

  const pow = Math.pow(1 + r, n);
  return P * ((r * pow) / (pow - 1));
}

// ============================================================
// //#12B VA LOAN ENGINE
// ============================================================

function buildVaLoanContextSafe({
  message,
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  affordability
}) {
  try {
    const fn =
      vaLoans.buildVaLoanTruthPacket ||
      vaLoans.default?.buildVaLoanTruthPacket;

    if (typeof fn !== "function") return null;

    const packet = fn({
      message,
      profile: normalizedProfile || {},
      scenario: scenario || {},
      compensation: compensation || {},
      mortgage: mortgage || {},
      affordability: affordability || {}
    });

    if (!packet || packet.ok === false) return null;

    return packet;
  } catch (err) {
    console.warn("va-loans.js failed:", err?.message || err);
    return null;
  }
}

function buildDirectVaLoanReply({ packet }) {
  if (!packet || packet.ok === false) return "";

  const lines = [];

  if (packet.bluf) {
    lines.push(packet.bluf.startsWith("BLUF:") ? packet.bluf : `BLUF: ${packet.bluf}`);
  }

  const fundingFee = packet.funding_fee || packet.purchase_scenario?.loan?.fundingFee;

  if (fundingFee) {
    if (fundingFee.exempt) {
      lines.push(
        "Funding fee: Your profile suggests you may be exempt from the VA funding fee, but your lender or COE should confirm that before you rely on it."
      );
    } else if (fundingFee.feeAmount !== undefined && fundingFee.feeAmount !== null) {
      lines.push(
        `Funding fee: Estimated at ${money(fundingFee.feeAmount)}${fundingFee.feePctDisplay ? ` (${fundingFee.feePctDisplay})` : ""} unless you qualify for an exemption.`
      );
    }
  }

  if (Array.isArray(packet.guidance?.key_points) && packet.guidance.key_points.length) {
    lines.push(`Why: ${packet.guidance.key_points.slice(0, 3).join(" ")}`);
  }

  if (Array.isArray(packet.guidance?.risks) && packet.guidance.risks.length) {
    lines.push(`Risk: ${packet.guidance.risks.slice(0, 2).join(" ")}`);
  }

  if (Array.isArray(packet.guidance?.next_steps) && packet.guidance.next_steps.length) {
    lines.push(`Next move: ${packet.guidance.next_steps[0]}`);
  }

  return lines.filter(Boolean).join("\n\n");
}
// ============================================================
// //#13 AFFORDABILITY + VERDICT
// ============================================================

function computeAffordabilitySafe({
  normalizedProfile,
  scenario,
  compensation,
  mortgage
}) {
  const income =
    num(compensation?.total_monthly) ||
    num(scenario.income) ||
    num(normalizedProfile.income);

  if (!income || income <= 0) return null;

  const expenses =
    num(scenario.expenses) ||
    num(normalizedProfile.monthly_expenses) ||
    num(scenario.debt) ||
    num(normalizedProfile.debt) ||
    0;

  const housingAllIn = num(mortgage?.all_in_monthly);

  const housingCap = income * 0.3;
  const residual = housingAllIn ? income - housingAllIn - expenses : null;
  const housingRatio = housingAllIn ? housingAllIn / income : null;
  const expenseRatio = expenses ? expenses / income : null;
  const backendRatio = housingAllIn ? (housingAllIn + expenses) / income : null;

  let status = "INSUFFICIENT";
  let score = "N/A";

  if (housingRatio !== null) {
    if (housingRatio <= 0.3 && backendRatio <= 0.43) {
      status = "GREEN";
      score = "A";
    } else if (housingRatio <= 0.35 && backendRatio <= 0.5) {
      status = "CAUTION";
      score = "B-/C+";
    } else {
      status = "NO-GO";
      score = "D";
    }
  }

  return {
    ok: true,
    income: roundMoney(income),
    housing_cap_30: roundMoney(housingCap),
    housing_ratio: housingRatio,
    expense_ratio: expenseRatio,
    backend_ratio: backendRatio,
    residual_income: roundMoney(residual),
    score,
    status,
    source: "ask-amy deterministic affordability math"
  };
}

function computeVerdictFallback({ compensation, mortgage, affordability }) {
  const income = num(compensation?.total_monthly) || num(affordability?.income);
  const housing = num(mortgage?.all_in_monthly);
  const housingRatio = num(affordability?.housing_ratio);
  const backendRatio = num(affordability?.backend_ratio);

  if (!income) {
    return {
      status: "INSUFFICIENT",
      grade: "N/A",
      label: "Missing income",
      bluf:
        "I need income or compensation data before I can give a clean readiness verdict.",
      reasons: ["Missing total monthly income."],
      source: "ask-amy fallback decision rules"
    };
  }

  if (!housing) {
    return {
      status: "PARTIAL",
      grade: "N/A",
      label: "Income loaded",
      bluf:
        "Your income is loaded, but I need a home price or mortgage estimate to judge housing readiness.",
      reasons: ["Missing housing payment or target home price."],
      source: "ask-amy fallback decision rules"
    };
  }

  if (housingRatio <= 0.3 && backendRatio <= 0.43) {
    return {
      status: "GREEN",
      grade: "A",
      label: "Strong range",
      bluf:
        "This looks workable based on the current income, debt, and housing estimate.",
      reasons: [
        `Housing ratio is about ${pct(housingRatio)}.`,
        `Back-end ratio is about ${pct(backendRatio)}.`
      ],
      source: "ask-amy fallback decision rules"
    };
  }

  if (housingRatio <= 0.35 && backendRatio <= 0.5) {
    return {
      status: "CAUTION",
      grade: "B-/C+",
      label: "Caution range",
      bluf: "This may be possible, but the buffer is getting tight.",
      reasons: [
        `Housing ratio is about ${pct(housingRatio)}.`,
        `Back-end ratio is about ${pct(backendRatio)}.`
      ],
      source: "ask-amy fallback decision rules"
    };
  }

  return {
    status: "NO-GO",
    grade: "D",
    label: "High-risk range",
    bluf:
      "This looks too tight unless income rises, expenses drop, price comes down, or cash reserves improve.",
    reasons: [
      `Housing ratio is about ${pct(housingRatio)}.`,
      `Back-end ratio is about ${pct(backendRatio)}.`
    ],
    source: "ask-amy fallback decision rules"
  };
}

function listMissingInputs({
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  intent
}) {
  const missing = [];
  const isCompOnly =
    intent === "compensation" ||
    intent === "profile_question" ||
    intent === "va_loan";

  if (!normalizedProfile?.rank_paygrade && !scenario?.rank_paygrade) {
    missing.push("rank/paygrade");
  }

  if (scenario?.yos === null || scenario?.yos === undefined) {
    missing.push("years of service");
  }

  if (!scenario?.base && !scenario?.zip) {
    missing.push("base or BAH ZIP");
  }

  if (
    !compensation?.total_monthly &&
    !scenario?.income &&
    !normalizedProfile?.income
  ) {
    missing.push("total monthly compensation");
  }

  if (!isCompOnly) {
    if (!scenario?.price && !mortgage?.all_in_monthly) {
      missing.push("target home price");
    }

    if (!scenario?.creditScore) {
      missing.push("credit score");
    }

    if (scenario?.downpayment === null || scenario?.downpayment === undefined) {
      missing.push("down payment/savings");
    }

    if (
      !scenario?.expenses &&
      !normalizedProfile?.monthly_expenses &&
      !scenario?.debt
    ) {
      missing.push("monthly expenses");
    }
  }

  return [...new Set(missing)];
}

function buildNextAction({
  intent,
  missing,
  verdict,
  compensation,
  mortgage,
  affordability
}) {
  if (intent === "va_loan") {
    return {
      type: "va_loan_review",
      label: "Review VA Loan fit",
      message:
        "Next move: confirm COE/funding-fee status, compare the all-in payment against BAH and income, then stress test the plan against PCS timeline and cash reserves."
    };
  }

  if (missing?.length) {
    const top = missing.slice(0, 3).join(", ");

    return {
      type: "collect_missing_inputs",
      label: "Tighten the profile",
      message: `To give a sharper answer, I need: ${top}.`,
      missing: missing.slice(0, 5)
    };
  }

  if (verdict?.status === "GREEN") {
    return {
      type: "proceed_with_guardrails",
      label: "Proceed carefully",
      message:
        "Next move: compare the target payment against BAH, emergency savings, and commute/market risk before you commit."
    };
  }

  if (verdict?.status === "CAUTION") {
    return {
      type: "reduce_risk",
      label: "Create more buffer",
      message:
        "Next move: lower the target price, increase down payment, reduce monthly debt, or compare renting before buying."
    };
  }

  if (verdict?.status === "NO-GO") {
    return {
      type: "pause_or_rework",
      label: "Rework the plan",
      message:
        "Next move: avoid forcing the purchase. Rebuild the scenario with a lower price, lower debt, or stronger savings."
    };
  }

  if (intent === "compensation" && compensation?.total_monthly) {
    return {
      type: "review_housing_cap",
      label: "Review housing cap",
      message:
        "Next move: use this income to set a safe monthly housing cap before choosing a price range."
    };
  }

  if (mortgage?.all_in_monthly) {
    return {
      type: "review_payment",
      label: "Review payment",
      message:
        "Next move: compare this all-in payment against BAH and your monthly expense load."
    };
  }

  if (affordability?.status) {
    return {
      type: "review_affordability",
      label: "Review affordability",
      message:
        "Next move: use the affordability status as a checkpoint, then pressure-test the plan with rent-vs-buy and PCS timeline."
    };
  }

  return {
    type: "continue",
    label: "Continue",
    message: "Ask Amy a specific housing, PCS, pay, VA Loan, or dashboard question."
  };
}

// ============================================================
// //#14 DIRECT REPLIES
// ============================================================

function buildDirectDeterministicReply({
  intent,
  normalizedProfile,
  deterministic
}) {
  const p = normalizedProfile || {};
  const packet = deterministic?.public || {};
  const comp = packet.compensation;
  const mortgage = packet.mortgage;
  const affordability = packet.affordability;
  const verdict = packet.verdict;
  const vaLoan = packet.va_loan;

  if (intent === "greeting") {
    const name = firstName(p.full_name);

    return [
      `Hey${name ? ` ${name}` : ""} — I’m Amy, your PCSUnited AI Concierge powered by TheWing.ai.`,
      "I can help explain your pay, BAH, housing affordability, PCS strategy, mortgage numbers, VA Loan questions, and dashboard readiness in plain English."
    ].join(" ");
  }

  if (intent === "capabilities") {
    const name = firstName(p.full_name);

    const profileLine =
      p.rank_paygrade || p.base
        ? ` I have ${[p.rank_paygrade || p.rank, p.base, p.zip]
            .filter(Boolean)
            .join(" • ")} loaded.`
        : "";

    return [
      `Yes${name ? ` ${name}` : ""} — I’m working.`,
      "I can help with pay, BAH, affordability, mortgage estimates, VA Loan basics, funding-fee guidance, rent vs. buy, PCS housing strategy, and dashboard readiness.",
      profileLine
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (intent === "profile_question") {
    const pieces = [];

    if (p.full_name) pieces.push(`Name: ${p.full_name}`);
    if (p.rank_paygrade || p.rank) pieces.push(`Rank: ${p.rank_paygrade || p.rank}`);
    if (p.yos !== undefined) pieces.push(`YOS: ${p.yos}`);
    if (p.base) pieces.push(`Base: ${p.base}`);
    if (p.zip) pieces.push(`ZIP: ${p.zip}`);
    if (p.email) pieces.push(`Email: ${p.email}`);
    if (p.income) pieces.push(`Saved Income: ${money(p.income)}`);
    if (p.monthly_expenses) {
      pieces.push(`Monthly Expenses: ${money(p.monthly_expenses)}`);
    }
    if (p.projected_home_price) {
      pieces.push(`Target Home Price: ${money(p.projected_home_price)}`);
    }

    if (!pieces.length) {
      return "I do not have enough saved profile details loaded yet. Once you log in or pass the PCSUnited profile context, I can answer from your actual member profile.";
    }

    return `Here’s what I have loaded from your member profile: ${pieces.join(" • ")}.`;
  }

  if (intent === "va_loan" && vaLoan) {
    const reply = buildDirectVaLoanReply({ packet: vaLoan });

    if (reply) return reply;
  }

  if (intent === "compensation" && comp?.total_monthly) {
    return [
      `BLUF: Your estimated monthly compensation is ${money(comp.total_monthly)}.`,
      comp.base_pay || comp.bas || comp.bah
        ? `That breaks down as Base Pay ${money(comp.base_pay)}, BAS ${money(comp.bas)}, and BAH ${money(comp.bah)}.`
        : "I do not have the full pay breakdown, but I do have a saved monthly income value from your member profile.",
      comp.va_disability_pay
        ? `VA disability compensation loaded: ${money(comp.va_disability_pay)} monthly.`
        : "",
      comp.base || comp.zip
        ? `I’m using ${[comp.rank_paygrade, comp.base, comp.zip]
            .filter(Boolean)
            .join(" • ")}.`
        : "",
      comp.note ? `Note: ${comp.note}` : ""
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (
    ["housing_affordability", "mortgage_explanation", "dashboard_interpretation"].includes(intent) &&
    verdict &&
    (mortgage || affordability)
  ) {
    const lines = [];

    lines.push(
      `BLUF: ${
        verdict.bluf || "I have enough data to give you a first-pass housing read."
      }`
    );

    if (comp?.total_monthly) {
      lines.push(`Income loaded: ${money(comp.total_monthly)} monthly.`);
    }

    if (mortgage?.all_in_monthly) {
      lines.push(
        `Estimated all-in housing payment: ${money(mortgage.all_in_monthly)} monthly.`
      );
    }

    if (
      affordability?.housing_ratio !== undefined &&
      affordability?.housing_ratio !== null
    ) {
      lines.push(`Housing ratio: about ${pct(affordability.housing_ratio)}.`);
    }

    if (
      affordability?.backend_ratio !== undefined &&
      affordability?.backend_ratio !== null
    ) {
      lines.push(`Back-end ratio: about ${pct(affordability.backend_ratio)}.`);
    }

    lines.push(
      `Readiness: ${verdict.status}${verdict.grade ? ` (${verdict.grade})` : ""}.`
    );

    if (packet.next_action?.message) {
      lines.push(packet.next_action.message);
    }

    return lines.join(" ");
  }

  return "";
}

function firstName(fullName) {
  const s = safeStr(fullName);
  if (!s) return "";
  return s.split(/\s+/)[0] || "";
}

// ============================================================
// //#15 OPENAI
// ============================================================

function buildSystemPrompt({ profileSummary, deterministic }) {
  const packet = deterministic?.public || {};

  return [
    "You are Amy, PCSUnited’s AI Concierge, powered by TheWing.ai.",
    "PCSUnited is the trusted military PCS, housing, and financial-readiness brand.",
    "TheWing.ai is the software intelligence layer behind calculations, profile loading, decision logic, and concierge guidance.",
    "",
    "Your job:",
    "- Help military members understand pay, BAH, BAS, VA disability, retirement, affordability, mortgage estimates, VA Loans, PCS housing strategy, dashboard readiness, and next steps.",
    "- Be BLUF-first.",
    "- Explain numbers clearly.",
    "- Recommend practical next steps.",
    "- Do not sound like generic ChatGPT.",
    "",
    "Style:",
    "- Calm, confident, military-aware, practical, warm.",
    "- Short paragraphs.",
    "- No fluff.",
    "- Do not over-disclaim.",
    "- Do not be salesy.",
    "",
    "Hard rules:",
    "- Never invent pay, BAH, mortgage, approval, VA Loan eligibility, funding fee, or affordability numbers.",
    "- Never infer or change the member's name. Use only the exact full_name or first_name from the member_profile/truth_packet. If no name is present, do not invent one.",
    "- If a deterministic truth packet is provided, trust it over your own math.",
    "- If a VA Loan packet is provided, use it for VA Loan answers.",
    "- Do not perform legal, tax, or lending approval advice.",
    "- Do not guarantee loan approval, appreciation, rent growth, or investment outcomes.",
    "- If data is missing, say exactly what is missing and ask for the smallest next input.",
    "- If the user asks about their profile, answer only from verified/profile context.",
    "",
    "Preferred answer shape:",
    "BLUF: one clear recommendation.",
    "Why: explain the most important numbers.",
    "Risk: identify the biggest risk.",
    "Next move: one practical action.",
    "",
    "Profile summary available:",
    profileSummary || "No profile summary available.",
    "",
    "Truth packet available:",
    JSON.stringify(packet || {}, null, 2),
    "",
    "VA Loan packet available:",
    JSON.stringify(packet?.va_loan || {}, null, 2)
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
    user_message: message,
    email: email || null,
    intent,
    agent: {
      name: "Amy",
      display_name: "PCSUnited AI Concierge",
      brand: "PCSUnited",
      powered_by: "TheWing.ai"
    },
    behavior_rules: {
      bluf_first: true,
      use_truth_packet_over_model_math: true,
      use_va_loan_packet_for_va_questions: true,
      do_not_fabricate_numbers: true,
      do_not_invent_or_change_member_name: true,
      concise_by_default: true,
      explain_numbers_plainly: true
    },
    member_profile: stripSensitiveProfile(normalizedProfile),
    truth_packet: deterministic?.public || null,
    va_loan_packet: deterministic?.public?.va_loan || null,
    dashboard_context_present: Boolean(
      Object.keys(mergedContext?.fad || {}).length ||
        Object.keys(mergedContext?.kpi_overrides || {}).length
    ),
    output_request:
      "Return a polished conversational answer only. Do not return JSON unless the user explicitly asks for JSON."
  };
}

async function callOpenAI({ systemPrompt, userPayload, model }) {
  if (!OPENAI_API_KEY) return "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 850,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: JSON.stringify(userPayload)
          }
        ]
      }),
      signal: controller.signal
    });

    const text = await res.text();
    const data = safeJsonParse(text);

    if (!res.ok) {
      console.warn("OpenAI call failed:", res.status, text);
      return "";
    }

    return safeStr(data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.warn("OpenAI exception:", err?.message || err);
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// //#16 FALLBACK REPLIES
// ============================================================

function buildFallbackReply({ intent, normalizedProfile, deterministic }) {
  const packet = deterministic?.public || {};
  const missing = packet.missing_inputs || [];
  const name = firstName(normalizedProfile?.full_name);

  if (intent === "va_loan") {
    const vaLoan = packet.va_loan;
    const vaReply = buildDirectVaLoanReply({ packet: vaLoan });

    if (vaReply) return vaReply;

    return [
      `BLUF: A VA Loan can be a strong PCS buying tool${name ? `, ${name}` : ""}, but it still has to pass the payment, timeline, cash-reserve, and exit-strategy test.`,
      "Why: Eligible borrowers can often use $0 down and avoid monthly PMI, but closing costs, funding fee status, property condition, appraisal, and occupancy rules still matter.",
      "Risk: Do not treat VA approval as automatic permission to buy. A short PCS timeline or thin reserves can turn a good loan into a bad plan.",
      "Next move: confirm COE/funding-fee status, estimate the full all-in payment, then compare it against BAH, total income, and monthly expenses."
    ].join("\n\n");
  }

  if (intent === "compensation") {
    if (missing.length) {
      return `I can explain your PCSUnited compensation${name ? `, ${name}` : ""}, but I’m missing ${missing
        .slice(0, 3)
        .join(", ")}. Once those are loaded, I can calculate Base Pay, BAS, BAH, and total monthly income.`;
    }

    return "I can help explain Base Pay, BAS, BAH, VA disability, retirement pay, and total monthly compensation once your member profile is loaded.";
  }

  if (intent === "housing_affordability") {
    if (missing.length) {
      return `BLUF: I need a few more inputs before I can give a reliable affordability read. The biggest missing pieces are ${missing
        .slice(0, 3)
        .join(", ")}.`;
    }

    return "BLUF: I can help judge affordability by comparing your total monthly income, BAH, monthly expenses, target home price, down payment, and estimated mortgage payment.";
  }

  return [
    `I’m working${name ? `, ${name}` : ""}.`,
    "I can help with PCS housing strategy, military pay, BAH, VA Loans, mortgage estimates, dashboard readiness, and rent-vs-buy decisions.",
    "Ask me something like: “What is my Base Pay, BAS, BAH, and total monthly compensation?” or “Can you explain the VA Loan for my situation?”"
  ].join(" ");
}

// ============================================================
// //#17 STRUCTURED ANSWER
// ============================================================

function buildStructuredAnswerFromText({
  reply,
  deterministic,
  normalizedProfile,
  intent
}) {
  const packet = deterministic?.public || {};
  const comp = packet.compensation || null;
  const mortgage = packet.mortgage || null;
  const affordability = packet.affordability || null;
  const verdict = packet.verdict || null;
  const nextAction = packet.next_action || null;
  const vaLoan = packet.va_loan || null;

  const numbers = [];

  if (comp?.total_monthly) {
    numbers.push({
      label: "Total Monthly Compensation",
      value: money(comp.total_monthly),
      raw: comp.total_monthly
    });
  }

  if (comp?.base_pay) {
    numbers.push({
      label: "Base Pay",
      value: money(comp.base_pay),
      raw: comp.base_pay
    });
  }

  if (comp?.bas) {
    numbers.push({
      label: "BAS",
      value: money(comp.bas),
      raw: comp.bas
    });
  }

  if (comp?.bah) {
    numbers.push({
      label: "BAH",
      value: money(comp.bah),
      raw: comp.bah
    });
  }

  if (comp?.va_disability_pay) {
    numbers.push({
      label: "VA Disability",
      value: money(comp.va_disability_pay),
      raw: comp.va_disability_pay
    });
  }

  if (mortgage?.all_in_monthly) {
    numbers.push({
      label: "Estimated All-In Housing Payment",
      value: money(mortgage.all_in_monthly),
      raw: mortgage.all_in_monthly
    });
  }

  const vaFundingFee =
    vaLoan?.funding_fee ||
    vaLoan?.purchase_scenario?.loan?.fundingFee ||
    null;

  if (vaFundingFee?.feeAmount !== undefined && vaFundingFee?.feeAmount !== null) {
    numbers.push({
      label: "Estimated VA Funding Fee",
      value: money(vaFundingFee.feeAmount),
      raw: vaFundingFee.feeAmount
    });
  }

  if (vaFundingFee?.feePctDisplay) {
    numbers.push({
      label: "VA Funding Fee Rate",
      value: vaFundingFee.feePctDisplay,
      raw: vaFundingFee.feePct
    });
  }

  if (
    affordability?.housing_ratio !== undefined &&
    affordability?.housing_ratio !== null
  ) {
    numbers.push({
      label: "Housing Ratio",
      value: pct(affordability.housing_ratio),
      raw: affordability.housing_ratio
    });
  }

  if (
    affordability?.backend_ratio !== undefined &&
    affordability?.backend_ratio !== null
  ) {
    numbers.push({
      label: "Back-End Ratio",
      value: pct(affordability.backend_ratio),
      raw: affordability.backend_ratio
    });
  }

  const risks = [];

  if (verdict?.status === "CAUTION") {
    risks.push("The plan may work, but the monthly buffer is tight.");
  }

  if (verdict?.status === "NO-GO") {
    risks.push("The current housing scenario appears too aggressive for the loaded numbers.");
  }

  if (packet.missing_inputs?.length) {
    risks.push(`Missing inputs: ${packet.missing_inputs.slice(0, 4).join(", ")}.`);
  }

  if (Array.isArray(vaLoan?.warnings) && vaLoan.warnings.length) {
    risks.push(...vaLoan.warnings.slice(0, 2));
  }

  if (Array.isArray(vaLoan?.guidance?.risks) && vaLoan.guidance.risks.length) {
    risks.push(...vaLoan.guidance.risks.slice(0, 2));
  }

  const recommendations = [];

  if (nextAction?.message) recommendations.push(nextAction.message);

  if (intent === "housing_affordability" && !mortgage?.all_in_monthly) {
    recommendations.push(
      "Add a target home price to generate a sharper mortgage and readiness estimate."
    );
  }

  if (intent === "compensation" && comp?.total_monthly) {
    recommendations.push(
      "Use this income as the baseline before choosing a safe housing cap."
    );
  }

  if (intent === "va_loan" && Array.isArray(vaLoan?.guidance?.next_steps)) {
    recommendations.push(...vaLoan.guidance.next_steps.slice(0, 2));
  }

  return {
    bluf:
      verdict?.bluf ||
      vaLoan?.bluf ||
      firstSentence(reply) ||
      "Amy has a first-pass recommendation.",
    summary: reply,
    status: verdict?.status || null,
    grade: verdict?.grade || null,
    numbers,
    risks,
    recommendations,
    next_steps: recommendations.slice(0, 3),
    follow_up_question: buildFollowUpQuestion({
      intent,
      missing: packet.missing_inputs || [],
      mortgage,
      vaLoan
    }),
    profile_used: stripSensitiveProfile(normalizedProfile)
  };
}

function firstSentence(text) {
  const s = safeStr(text);
  if (!s) return "";
  const match = s.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : s.slice(0, 180);
}

function buildFollowUpQuestion({ intent, missing, mortgage, vaLoan }) {
  if (missing?.length && intent !== "va_loan") {
    return `Want to add ${missing[0]} so I can tighten the answer?`;
  }

  if (intent === "va_loan") {
    if (vaLoan?.funding_fee?.exempt) {
      return "Want me to compare the VA Loan payment against your BAH and PCS timeline?";
    }

    return "Want me to estimate the VA funding fee and show how it affects the loan balance?";
  }

  if (intent === "housing_affordability" && mortgage?.all_in_monthly) {
    return "Want me to compare this payment against your BAH and monthly expenses?";
  }

  if (intent === "compensation") {
    return "Want me to turn this income into a safe housing price range?";
  }

  return "Want me to turn this into a clear next-step plan?";
}

// ============================================================
// //#18 PROFILE / OUTPUT HELPERS
// ============================================================

function buildProfileSummary(profile, deterministic) {
  const p = profile || {};
  const comp = deterministic?.public?.compensation || null;

  const parts = [];

  if (p.full_name) parts.push(`Name: ${p.full_name}`);
  if (p.email) parts.push(`Email: ${p.email}`);
  if (p.mode) parts.push(`Status: ${p.mode}`);
  if (p.rank_paygrade || p.rank) parts.push(`Rank: ${p.rank_paygrade || p.rank}`);
  if (p.yos !== undefined) parts.push(`YOS: ${p.yos}`);

  if (p.family !== undefined) {
    parts.push(`Dependents: ${p.family ? "Yes" : "No"}`);
  }

  if (p.family_size !== undefined) parts.push(`Family Size: ${p.family_size}`);
  if (p.base) parts.push(`Base: ${p.base}`);
  if (p.zip) parts.push(`ZIP: ${p.zip}`);

  if (p.va_disability !== undefined) {
    parts.push(`VA Disability: ${p.va_disability}%`);
  }

  if (p.projected_home_price) {
    parts.push(`Target Home Price: ${money(p.projected_home_price)}`);
  }

  if (p.monthly_expenses) {
    parts.push(`Monthly Expenses: ${money(p.monthly_expenses)}`);
  }

  if (p.income) {
    parts.push(`Saved Monthly Income: ${money(p.income)}`);
  }

  if (p.debt) {
    parts.push(`Saved Monthly Debt: ${money(p.debt)}`);
  }

  if (p.downpayment) {
    parts.push(`Down Payment: ${money(p.downpayment)}`);
  }

  if (p.credit_score) {
    parts.push(`Credit Score: ${p.credit_score}`);
  }

  if (p.bedrooms) {
    parts.push(`Bedrooms: ${p.bedrooms}`);
  }

  if (comp?.total_monthly) {
    parts.push(`Calculated Monthly Compensation: ${money(comp.total_monthly)}`);
  }

  return [...new Set(parts)].join(" | ");
}

function stripSensitiveProfile(profile) {
  const p = profile || {};

  return stripEmpty({
    full_name: p.full_name,
    first_name: firstName(p.full_name),
    mode: p.mode,
    military_status: p.military_status,
    rank: p.rank,
    rank_paygrade: p.rank_paygrade,
    yos: p.yos,
    family: p.family,
    family_size: p.family_size,
    base: p.base,
    zip: p.zip,
    va_disability: p.va_disability,
    projected_home_price: p.projected_home_price,
    monthly_expenses: p.monthly_expenses,
    income: p.income,
    debt: p.debt,
    downpayment: p.downpayment,
    savings: p.savings,
    credit_score: p.credit_score,
    bedrooms: p.bedrooms,
    cityKey: p.cityKey
  });
}
