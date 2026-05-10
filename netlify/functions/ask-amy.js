// netlify/functions/ask-amy.js
// ============================================================
// TheWing.ai • PCSUnited AI Concierge — Ask Amy
// v1.0.0
//
// PURPOSE
// - Member-facing PCSUnited AI Concierge endpoint
// - Powered by TheWing.ai intelligence layer
// - Reads profile/bridge/dashboard context from PCSUnited frontend
// - Uses deterministic engines when available
// - Uses OpenAI only as the explanation/conversation layer
// - Returns both:
//   1) polished conversational reply
//   2) structured answer object for future dashboard UI cards
//
// CORE IDEA
// - PCSUnited = trusted public military brand
// - TheWing.ai = private software intelligence layer
// - Amy = PCSUnited AI Concierge powered by TheWing.ai
//
// CLIENT
// POST https://thewing.netlify.app/api/ask-amy
// POST /.netlify/functions/ask-amy
//
// BODY EXAMPLE
// {
//   "message": "Can I afford to buy near Nellis?",
//   "email": "member@email.com",
//   "profile": {},
//   "bridge": {},
//   "identity": {},
//   "context": {
//     "profile": {},
//     "bridge": {},
//     "fad": {},
//     "financial_intake": {},
//     "kpi_overrides": {}
//   },
//   "debug": false
// }
//
// REQUIRED ENV
// - OPENAI_API_KEY
//
// OPTIONAL ENV
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// - PCSUNITED_APP_URL
// - THEWING_APP_URL
//
// ============================================================

/* eslint-disable no-console */

// ============================================================
// //#1) IMPORTS
// ============================================================

let createClient = null;

try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch (_) {
  createClient = null;
}

// Optional shared engines.
// These are loaded defensively so this endpoint does not crash if
// one shared file has a different export name during migration.
const shared = {
  profileNormalizer: safeRequire("./_share/profile-normalizer.js"),
  payEngine: safeRequire("./_share/pay-engine.js"),
  mortgageEngine: safeRequire("./_share/mortgage-engine.js"),
  affordabilityEngine: safeRequire("./_share/affordability-engine.js"),
  decisionRules: safeRequire("./_share/decision-rules.js"),
  response: safeRequire("./_share/response.js"),
};

// ============================================================
// //#2) CONFIG
// ============================================================

const VERSION = "1.0.0";

const ALLOW_ORIGINS = [
  // PCSUnited production
  "https://pcsunited.com",
  "https://www.pcsunited.com",

  // PCSUnited Netlify / staging
  "https://pcsunited.netlify.app",
  "https://www.pcsunited.netlify.app",
  "https://pcsunited-com-28346d.webflow.io",
  "https://www.pcsunited-com-28346d.webflow.io",
  "https://pcsunited.webflow.io",
  "https://www.pcsunited.webflow.io",

  // TheWing
  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",
  "https://www.thewing.netlify.app",

  // Local dev
  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000",
];

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const DEFAULT_RESPONSE_MODE = "member_guidance";

const MAX_MESSAGE_LENGTH = 5000;

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// ============================================================
// //#3) NETLIFY HANDLER
// ============================================================

exports.handler = async function handler(event) {
  const origin = getHeader(event, "origin");

  if (event.httpMethod === "OPTIONS") {
    return respond(200, { ok: true }, origin);
  }

  if (event.httpMethod !== "POST") {
    return respond(
      405,
      {
        ok: false,
        error: "Method not allowed. Use POST.",
        version: VERSION,
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
          version: VERSION,
        },
        origin
      );
    }

    const email = getEmailFromPayload(body);

    const clientContext = collectClientContext(body);
    const loadedProfile = await loadSupabaseProfileIfNeeded(email, clientContext.profile);

    const mergedContext = mergeDeep(
      {},
      clientContext,
      loadedProfile ? { profile: loadedProfile } : {}
    );

    const normalizedProfile = normalizeProfileUniversal(mergedContext);

    const intent = detectIntent(message);

    const deterministic = await buildTruthPacket({
      message,
      intent,
      email,
      mergedContext,
      normalizedProfile,
      debug,
    });

    const profileSummary = buildProfileSummary(normalizedProfile, deterministic);

    const directReply = buildDirectDeterministicReply({
      message,
      intent,
      normalizedProfile,
      deterministic,
    });

    if (directReply && !shouldUseOpenAI(message, intent, deterministic)) {
      const structured = buildStructuredAnswerFromText({
        reply: directReply,
        deterministic,
        normalizedProfile,
        intent,
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
          answer: structured,
          profile_used: stripSensitiveProfile(normalizedProfile),
          truth_packet: deterministic.public,
          context_used: deterministic.context_used,
          latency_ms: Date.now() - startedAt,
          ...(debug ? { debug: deterministic.debug } : {}),
        },
        origin
      );
    }

    let aiReply = "";

    if (OPENAI_API_KEY) {
      const systemPrompt = buildSystemPrompt({
        profileSummary,
        deterministic,
      });

      const userPayload = buildUserPayload({
        message,
        email,
        intent,
        normalizedProfile,
        deterministic,
        mergedContext,
      });

      aiReply = await callOpenAI({
        systemPrompt,
        userPayload,
        model: DEFAULT_MODEL,
      });
    }

    if (!aiReply) {
      aiReply = directReply || buildFallbackReply({
        message,
        intent,
        normalizedProfile,
        deterministic,
      });
    }

    const answer = extractOrBuildStructuredAnswer({
      aiReply,
      deterministic,
      normalizedProfile,
      intent,
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
                used_openai: Boolean(OPENAI_API_KEY),
              },
            }
          : {}),
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
        version: VERSION,
      },
      origin
    );
  }
};

// ============================================================
// //#4) RESPONSE / CORS HELPERS
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
    "Vary": "Origin",
  };
}

function respond(statusCode, payload, origin) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(payload || {}),
  };
}

function getHeader(event, name) {
  const headers = event?.headers || {};
  const lower = String(name || "").toLowerCase();

  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === lower) return v;
  }

  return "";
}

// ============================================================
// //#5) SAFE UTILS
// ============================================================

function safeRequire(relPath) {
  try {
    return require(relPath);
  } catch (_) {
    return null;
  }
}

function safeJsonParse(raw) {
  try {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function safeStr(x) {
  return String(x ?? "").trim();
}

function normalizeEmail(x) {
  const email = safeStr(x).toLowerCase();
  return email.includes("@") ? email : "";
}

function num(x) {
  if (x === null || x === undefined || x === "") return null;

  if (typeof x === "string") {
    const cleaned = x.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function boolish(x) {
  if (x === true || x === false) return x;

  const s = safeStr(x).toLowerCase();

  if (["true", "yes", "y", "1", "with", "dependent", "dependents"].includes(s)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "single"].includes(s)) {
    return false;
  }

  return Boolean(x);
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (
      v !== undefined &&
      v !== null &&
      v !== "" &&
      !(typeof v === "number" && !Number.isFinite(v))
    ) {
      return v;
    }
  }

  return null;
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(x);
  } catch (_) {
    return "$" + Math.round(x).toLocaleString("en-US");
  }
}

function pct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function roundMoney(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x) : null;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(min, Math.min(max, x));
}

function nowIso() {
  return new Date().toISOString();
}

function mergeDeep(target, ...sources) {
  const out = target || {};

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

// ============================================================
// //#6) PAYLOAD / CONTEXT INGEST
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
  const context = body?.context && typeof body.context === "object" ? body.context : {};

  const profile = mergeDeep(
    {},
    body?.profile || {},
    context?.profile || {},
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
    raw_context: context,
  };
}

// ============================================================
// //#7) OPTIONAL SUPABASE PROFILE LOAD
// ============================================================

async function loadSupabaseProfileIfNeeded(email, existingProfile) {
  const hasUsefulProfile =
    existingProfile &&
    typeof existingProfile === "object" &&
    Object.keys(existingProfile).some((k) => existingProfile[k] !== null && existingProfile[k] !== "");

  if (hasUsefulProfile) return null;

  if (!email || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !createClient) {
    return null;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("profiles")
      .select(
        [
          "id",
          "profiles_user_id_unique",
          "email",
          "full_name",
          "last_name",
          "phone",
          "mode",
          "rank",
          "rank_paygrade",
          "va_disability",
          "yos",
          "family",
          "base",
          "notes",
          "status",
          "email_verified",
          "email_verified_at",
          "updated_at",
          "source",
        ].join(",")
      )
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.warn("Supabase profile load failed:", error.message);
      return null;
    }

    return data || null;
  } catch (err) {
    console.warn("Supabase profile load exception:", err?.message || err);
    return null;
  }
}

// ============================================================
// //#8) PROFILE NORMALIZATION
// ============================================================

function normalizeProfileUniversal(ctx) {
  const profileRaw = mergeDeep(
    {},
    ctx?.identity || {},
    ctx?.profile || {},
    ctx?.bridge || {},
    ctx?.financial_intake || {},
    ctx?.fad || {},
    ctx?.kpi_overrides || {}
  );

  if (shared.profileNormalizer) {
    const candidates = [
      "normalizeProfile",
      "normalize",
      "profileNormalizer",
      "normalizeMemberProfile",
      "normalizePCSProfile",
    ];

    for (const name of candidates) {
      if (typeof shared.profileNormalizer[name] === "function") {
        try {
          const result = shared.profileNormalizer[name](profileRaw);
          if (result && typeof result === "object") {
            return normalizeProfileFallback(result);
          }
        } catch (_) {
          // keep fallback path
        }
      }
    }

    if (typeof shared.profileNormalizer === "function") {
      try {
        const result = shared.profileNormalizer(profileRaw);
        if (result && typeof result === "object") {
          return normalizeProfileFallback(result);
        }
      } catch (_) {
        // keep fallback path
      }
    }
  }

  return normalizeProfileFallback(profileRaw);
}

function normalizeProfileFallback(raw) {
  const email = normalizeEmail(
    pickFirst(raw.email, raw.user_email, raw.member_email)
  );

  const fullName = safeStr(
    pickFirst(raw.full_name, raw.fullName, raw.name, raw.displayName)
  );

  const lastName = safeStr(
    pickFirst(raw.last_name, raw.lastName, deriveLastName(fullName))
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
      raw.selectedBase
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

  const familySize = num(
    pickFirst(raw.family_size, raw.familySize, raw.household_size, raw.householdSize)
  );

  const profile = {
    email,
    full_name: fullName,
    last_name: lastName,
    phone: safeStr(pickFirst(raw.phone, raw.phone_number, raw.phoneNumber)),

    mode,
    military_status: mode,
    rank,
    rank_paygrade: rankPaygrade,
    yos: num(pickFirst(raw.yos, raw.years_of_service, raw.yearsOfService)),
    family: familyRaw === null ? null : boolish(familyRaw),
    family_size: familySize,

    base,
    zip,

    va_disability: num(
      pickFirst(raw.va_disability, raw.vaDisability, raw.va, raw.disability)
    ),

    retired_rank: normalizePaygrade(
      pickFirst(raw.retired_rank, raw.retiredRank, raw.retire_rank, raw.retireRank)
    ),
    retire_yos: num(
      pickFirst(raw.retire_yos, raw.retireYos, raw.retirement_yos, raw.retirementYos)
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

    downpayment: num(
      pickFirst(
        raw.downpayment,
        raw.downPayment,
        raw.down_payment,
        raw.dpAmt,
        raw.savingsOverride,
        raw.currentSavings
      )
    ),

    savings: num(pickFirst(raw.savings, raw.cash, raw.cash_on_hand, raw.cashOnHand)),

    credit_score: num(
      pickFirst(raw.credit_score, raw.creditScore, raw.fico, raw.score)
    ),

    bedrooms: num(pickFirst(raw.bedrooms, raw.beds)),
    bathrooms: num(pickFirst(raw.bathrooms, raw.baths)),
    cityKey: safeStr(pickFirst(raw.cityKey, raw.city_key, raw.market, raw.marketSlug)),
    notes: safeStr(pickFirst(raw.notes, raw.comments)),
  };

  const out = {};

  for (const [k, v] of Object.entries(profile)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }

  return out;
}

function deriveLastName(fullName) {
  const parts = safeStr(fullName).split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function normalizeMode(x) {
  const s = safeStr(x).toLowerCase();

  if (["ad", "active", "active_duty", "active duty", "servicemember"].includes(s)) {
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

function normalizePaygrade(x) {
  const raw = safeStr(x).toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";

  if (/^[EOW]-\d{1,2}$/.test(raw)) return raw;
  if (/^[EOW]\d{1,2}$/.test(raw)) return `${raw[0]}-${raw.slice(1)}`;

  const rankMap = {
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
    COL: "O-6",
  };

  return rankMap[raw] || raw;
}

function rankShort(paygradeOrRank) {
  const p = normalizePaygrade(paygradeOrRank);

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
    "O-6": "Col",
    "O-7": "Brig Gen",
    "O-8": "Maj Gen",
    "O-9": "Lt Gen",
    "O-10": "Gen",
  };

  return map[p] || p || "";
}

// ============================================================
// //#9) INTENT DETECTION
// ============================================================

function detectIntent(message) {
  const t = safeStr(message).toLowerCase();

  if (!t) return "unknown";

  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|sup)\b/.test(t)) {
    return "greeting";
  }

  if (
    /\bwhat can you do\b|\bhow can you help\b|\bwhat do you do\b|\bwho are you\b|\bhelp me\b/.test(t)
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
  if (t.length > 120) return true;

  if (
    [
      "housing_affordability",
      "mortgage_explanation",
      "rent_vs_buy",
      "pcs_housing_strategy",
      "dashboard_interpretation",
      "general_guidance",
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
// //#10) DETERMINISTIC TRUTH PACKET
// ============================================================

async function buildTruthPacket({
  message,
  intent,
  email,
  mergedContext,
  normalizedProfile,
  debug,
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
      shared_engines: {
        profile_normalizer: Boolean(shared.profileNormalizer),
        pay_engine: Boolean(shared.payEngine),
        mortgage_engine: Boolean(shared.mortgageEngine),
        affordability_engine: Boolean(shared.affordabilityEngine),
        decision_rules: Boolean(shared.decisionRules),
        response: Boolean(shared.response),
      },
    },
    internal: {},
    public: {
      profile_summary: null,
      compensation: null,
      housing_inputs: null,
      mortgage: null,
      affordability: null,
      verdict: null,
      next_action: null,
      missing_inputs: [],
    },
    debug: debug ? {} : undefined,
  };

  const scenario = buildScenario({
    message,
    mergedContext,
    normalizedProfile,
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
    zip: scenario.zip,
  });

  const compensation = await computeCompensationSafe(normalizedProfile, scenario);

  if (compensation) {
    truth.context_used.compensation = true;
    truth.public.compensation = compensation;
  }

  const mortgage = await computeMortgageSafe(normalizedProfile, scenario, compensation);

  if (mortgage) {
    truth.context_used.housing = true;
    truth.public.mortgage = mortgage;
  }

  const affordability = await computeAffordabilitySafe({
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
  });

  if (affordability) {
    truth.context_used.housing = true;
    truth.public.affordability = affordability;
  }

  const verdict = computeVerdictSafe({
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
    affordability,
  });

  if (verdict) {
    truth.public.verdict = verdict;
  }

  truth.public.missing_inputs = listMissingInputs({
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
  });

  truth.public.next_action = buildNextAction({
    intent,
    missing: truth.public.missing_inputs,
    verdict,
    compensation,
    mortgage,
    affordability,
  });

  if (debug) {
    truth.debug = {
      email,
      scenario,
      shared_loaded: truth.context_used.shared_engines,
      merged_context_keys: Object.keys(mergedContext || {}),
      normalized_profile_keys: Object.keys(normalizedProfile || {}),
    };
  }

  return truth;
}

function buildScenario({ message, mergedContext, normalizedProfile }) {
  const fad = mergedContext?.fad || {};
  const bridge = mergedContext?.bridge || {};
  const profile = normalizedProfile || {};
  const intake = mergedContext?.financial_intake || {};
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
        bridge.credit_score,
        bridge.creditScore,
        profile.credit_score
      )
    );

  const termYears = clamp(
    num(
      pickFirst(
        fad.termYears,
        fad.term_years,
        intake.term_years,
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

  const yos = num(
    pickFirst(profile.yos, bridge.yos, fad.yos, intake.yos)
  );

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
    creditScoreSource: hypotheticalCreditScore ? "question_hypothetical" : "profile_or_dashboard",
    termYears: termYears || 30,
    loanType: loanType || "va",
    rank_paygrade: rankPaygrade,
    yos,
    base,
    zip,
    family: family === null ? null : boolish(family),
    mode: normalizeMode(pickFirst(profile.mode, bridge.mode, fad.mode, "active")),
    va_disability: num(
      pickFirst(profile.va_disability, bridge.va_disability, fad.va_disability)
    ),
    bedrooms: num(pickFirst(profile.bedrooms, bridge.bedrooms, fad.bedrooms)),
    cityKey: safeStr(pickFirst(profile.cityKey, bridge.cityKey, fad.cityKey)),
  };
}

function parseHypotheticalCreditScore(message) {
  const t = safeStr(message).toLowerCase();
  if (!t) return null;

  const looksHypothetical =
    /\bif\b|\bwent up\b|\braise\b|\bbump\b|\bincrease\b|\bimprove\b|\bup to\b|\bto\s+\d{3}\b/.test(t);

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
// //#11) COMPENSATION ENGINE
// ============================================================

async function computeCompensationSafe(profile, scenario) {
  const input = {
    mode: scenario.mode || profile.mode || "active",
    rank: scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    paygrade: scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    rank_paygrade: scenario.rank_paygrade || profile.rank_paygrade || profile.rank,
    yos: scenario.yos ?? profile.yos,
    yearsOfService: scenario.yos ?? profile.yos,
    family: scenario.family ?? profile.family,
    withDependents: scenario.family ?? profile.family,
    base: scenario.base || profile.base,
    zip: scenario.zip || profile.zip,
    bahZip: scenario.zip || profile.zip,
    va_disability: scenario.va_disability ?? profile.va_disability,
  };

  const engineResult = trySharedPayEngine(input);

  if (engineResult) return normalizeCompensation(engineResult, input);

  return null;
}

function trySharedPayEngine(input) {
  const mod = shared.payEngine;
  if (!mod) return null;

  const functionNames = [
    "computePay",
    "computePayBasics",
    "calculatePay",
    "calculateCompensation",
    "getCompensation",
    "payEngine",
  ];

  for (const name of functionNames) {
    if (typeof mod[name] === "function") {
      try {
        const result = mod[name](input);
        if (result && typeof result === "object") return result;
      } catch (err) {
        console.warn(`pay-engine.${name} failed:`, err?.message || err);
      }
    }
  }

  if (typeof mod === "function") {
    try {
      const result = mod(input);
      if (result && typeof result === "object") return result;
    } catch (err) {
      console.warn("pay-engine default function failed:", err?.message || err);
    }
  }

  return null;
}

function normalizeCompensation(result, input) {
  const basePay = num(
    pickFirst(result.basePay, result.base_pay, result.base, result.monthly_base_pay)
  );

  const bas = num(pickFirst(result.bas, result.BAS, result.basic_allowance_subsistence));

  const bah = num(pickFirst(result.bah, result.BAH, result.housing_allowance));

  const va = num(
    pickFirst(result.va, result.va_disability_pay, result.disability, result.vaCompensation)
  );

  const retirement = num(
    pickFirst(result.retirement, result.retired_pay, result.retirement_pay)
  );

  const total = num(
    pickFirst(
      result.total,
      result.totalMonthly,
      result.total_monthly,
      result.monthly_total,
      [basePay, bas, bah, va, retirement]
        .filter((x) => Number.isFinite(x))
        .reduce((a, b) => a + b, 0)
    )
  );

  if (![basePay, bas, bah, va, retirement, total].some((x) => Number.isFinite(x) && x > 0)) {
    return null;
  }

  return stripEmpty({
    ok: result.ok !== false,
    rank_paygrade: normalizePaygrade(
      pickFirst(result.rank_paygrade, result.paygrade, input.rank_paygrade)
    ),
    rank_short: rankShort(
      pickFirst(result.rank_paygrade, result.paygrade, input.rank_paygrade)
    ),
    yos: num(pickFirst(result.yos, input.yos)),
    base: safeStr(pickFirst(result.base, input.base)),
    zip: safeStr(pickFirst(result.resolvedZip, result.zip, input.zip)),
    with_dependents: input.withDependents ?? input.family,
    base_pay: roundMoney(basePay),
    bas: roundMoney(bas),
    bah: roundMoney(bah),
    va_disability_pay: roundMoney(va),
    retirement_pay: roundMoney(retirement),
    total_monthly: roundMoney(total),
    source: safeStr(pickFirst(result.source, "TheWing pay-engine")),
    note: safeStr(pickFirst(result.note, result.bahNote, result.reason)),
  });
}

// ============================================================
// //#12) MORTGAGE ENGINE
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
    cityKey: scenario.cityKey || profile.cityKey,
  };

  const engineResult = trySharedMortgageEngine(input);

  if (engineResult) {
    return normalizeMortgage(engineResult, input);
  }

  return computeMortgageFallback(input);
}

function trySharedMortgageEngine(input) {
  const mod = shared.mortgageEngine;
  if (!mod) return null;

  const functionNames = [
    "computeMortgage",
    "calculateMortgage",
    "mortgageEngine",
    "getMortgage",
    "buildMortgage",
  ];

  for (const name of functionNames) {
    if (typeof mod[name] === "function") {
      try {
        const result = mod[name](input);
        if (result && typeof result === "object") return result;
      } catch (err) {
        console.warn(`mortgage-engine.${name} failed:`, err?.message || err);
      }
    }
  }

  if (typeof mod === "function") {
    try {
      const result = mod(input);
      if (result && typeof result === "object") return result;
    } catch (err) {
      console.warn("mortgage-engine default function failed:", err?.message || err);
    }
  }

  return null;
}

function normalizeMortgage(result, input) {
  const principalInterest = num(
    pickFirst(
      result.principal_interest,
      result.principalInterest,
      result.pi,
      result.p_and_i,
      result.monthlyPI
    )
  );

  const taxes = num(
    pickFirst(result.taxes, result.tax, result.property_tax, result.propertyTax)
  );

  const insurance = num(
    pickFirst(result.insurance, result.home_insurance, result.homeownersInsurance)
  );

  const hoa = num(pickFirst(result.hoa, result.hoa_monthly, result.hoaMonthly));

  const pmi = num(pickFirst(result.pmi, result.PMI));

  const allIn = num(
    pickFirst(
      result.all_in,
      result.allIn,
      result.total,
      result.total_monthly,
      result.monthly_total,
      result.payment,
      result.monthlyPayment,
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
    apr: num(pickFirst(result.apr, result.rate, result.apr_percent)),
    term_years: num(pickFirst(result.term_years, result.termYears, input.termYears)),
    principal_interest: roundMoney(principalInterest),
    taxes: roundMoney(taxes),
    insurance: roundMoney(insurance),
    hoa: roundMoney(hoa),
    pmi: roundMoney(pmi),
    all_in_monthly: roundMoney(allIn),
    source: safeStr(pickFirst(result.source, "TheWing mortgage-engine")),
    note: safeStr(pickFirst(result.note, result.reason)),
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

  // Conservative fallback assumptions.
  // Shared mortgage-engine should replace this when deployed.
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
    note: "Fallback estimate only. The shared mortgage-engine should be treated as source of truth when available.",
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
// //#13) AFFORDABILITY ENGINE
// ============================================================

async function computeAffordabilitySafe({
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
}) {
  const income = num(compensation?.total_monthly);
  if (!income || income <= 0) return null;

  const expenses = num(scenario.expenses) || num(normalizedProfile.monthly_expenses) || 0;
  const housingAllIn = num(mortgage?.all_in_monthly);
  const price = num(scenario.price);
  const downpayment = num(scenario.downpayment) || 0;

  const input = {
    income,
    monthlyIncome: income,
    expenses,
    monthlyExpenses: expenses,
    housingAllIn,
    mortgage: housingAllIn,
    price,
    homePrice: price,
    downpayment,
    creditScore: scenario.creditScore,
  };

  const engineResult = trySharedAffordabilityEngine(input);

  if (engineResult) return normalizeAffordability(engineResult, input);

  return computeAffordabilityFallback(input);
}

function trySharedAffordabilityEngine(input) {
  const mod = shared.affordabilityEngine;
  if (!mod) return null;

  const functionNames = [
    "computeAffordability",
    "calculateAffordability",
    "affordabilityEngine",
    "scoreAffordability",
    "buildAffordability",
  ];

  for (const name of functionNames) {
    if (typeof mod[name] === "function") {
      try {
        const result = mod[name](input);
        if (result && typeof result === "object") return result;
      } catch (err) {
        console.warn(`affordability-engine.${name} failed:`, err?.message || err);
      }
    }
  }

  if (typeof mod === "function") {
    try {
      const result = mod(input);
      if (result && typeof result === "object") return result;
    } catch (err) {
      console.warn("affordability-engine default function failed:", err?.message || err);
    }
  }

  return null;
}

function normalizeAffordability(result, input) {
  const income = num(pickFirst(result.income, result.monthlyIncome, input.income));
  const housingAllIn = num(
    pickFirst(result.housingAllIn, result.housing_all_in, result.mortgage, input.housingAllIn)
  );
  const expenses = num(pickFirst(result.expenses, result.monthlyExpenses, input.expenses)) || 0;

  return stripEmpty({
    ok: result.ok !== false,
    income: roundMoney(income),
    housing_cap_30: roundMoney(pickFirst(result.housing_cap_30, result.housingCap, income * 0.3)),
    housing_ratio: num(
      pickFirst(
        result.housing_ratio,
        result.housingRatio,
        income && housingAllIn ? housingAllIn / income : null
      )
    ),
    expense_ratio: num(
      pickFirst(
        result.expense_ratio,
        result.expenseRatio,
        income && expenses ? expenses / income : null
      )
    ),
    backend_ratio: num(
      pickFirst(
        result.backend_ratio,
        result.backEndRatio,
        income && housingAllIn ? (housingAllIn + expenses) / income : null
      )
    ),
    residual_income: roundMoney(
      pickFirst(
        result.residual_income,
        result.residual,
        income && housingAllIn ? income - housingAllIn - expenses : null
      )
    ),
    score: pickFirst(result.score, result.grade, null),
    status: pickFirst(result.status, result.verdict, null),
    source: safeStr(pickFirst(result.source, "TheWing affordability-engine")),
    note: safeStr(pickFirst(result.note, result.reason)),
  });
}

function computeAffordabilityFallback(input) {
  const income = num(input.income);
  if (!income || income <= 0) return null;

  const expenses = num(input.expenses) || 0;
  const housingAllIn = num(input.housingAllIn) || null;

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
    source: "ask-amy fallback affordability math",
  };
}

// ============================================================
// //#14) VERDICT / DECISION RULES
// ============================================================

function computeVerdictSafe({
  normalizedProfile,
  scenario,
  compensation,
  mortgage,
  affordability,
}) {
  const engineResult = trySharedDecisionRules({
    normalizedProfile,
    scenario,
    compensation,
    mortgage,
    affordability,
  });

  if (engineResult) return normalizeVerdict(engineResult);

  return computeVerdictFallback({
    compensation,
    mortgage,
    affordability,
  });
}

function trySharedDecisionRules(input) {
  const mod = shared.decisionRules;
  if (!mod) return null;

  const functionNames = [
    "computeVerdict",
    "getVerdict",
    "scoreDecision",
    "decisionRules",
    "buildDecision",
    "evaluate",
  ];

  for (const name of functionNames) {
    if (typeof mod[name] === "function") {
      try {
        const result = mod[name](input);
        if (result && typeof result === "object") return result;
      } catch (err) {
        console.warn(`decision-rules.${name} failed:`, err?.message || err);
      }
    }
  }

  if (typeof mod === "function") {
    try {
      const result = mod(input);
      if (result && typeof result === "object") return result;
    } catch (err) {
      console.warn("decision-rules default function failed:", err?.message || err);
    }
  }

  return null;
}

function normalizeVerdict(result) {
  const status = safeStr(
    pickFirst(result.status, result.verdict, result.label, result.decision)
  ).toUpperCase();

  return stripEmpty({
    status: status || null,
    grade: pickFirst(result.grade, result.score, null),
    label: pickFirst(result.label, status || null),
    bluf: safeStr(pickFirst(result.bluf, result.summary, result.message)),
    reasons: Array.isArray(result.reasons)
      ? result.reasons
      : Array.isArray(result.notes)
      ? result.notes
      : [],
    source: safeStr(pickFirst(result.source, "TheWing decision-rules")),
  });
}

function computeVerdictFallback({ compensation, mortgage, affordability }) {
  const income = num(compensation?.total_monthly);
  const housing = num(mortgage?.all_in_monthly);
  const housingRatio = num(affordability?.housing_ratio);
  const backendRatio = num(affordability?.backend_ratio);

  if (!income) {
    return {
      status: "INSUFFICIENT",
      grade: "N/A",
      label: "Missing income",
      bluf: "I need income or compensation data before I can give a clean readiness verdict.",
      reasons: ["Missing total monthly income."],
      source: "ask-amy fallback decision rules",
    };
  }

  if (!housing) {
    return {
      status: "PARTIAL",
      grade: "N/A",
      label: "Income loaded",
      bluf: "Your income is loaded, but I need a home price or mortgage estimate to judge housing readiness.",
      reasons: ["Missing housing payment or target home price."],
      source: "ask-amy fallback decision rules",
    };
  }

  if (housingRatio <= 0.3 && backendRatio <= 0.43) {
    return {
      status: "GREEN",
      grade: "A",
      label: "Strong range",
      bluf: "This looks workable based on the current income, debt, and housing estimate.",
      reasons: [
        `Housing ratio is about ${pct(housingRatio)}.`,
        `Back-end ratio is about ${pct(backendRatio)}.`,
      ],
      source: "ask-amy fallback decision rules",
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
        `Back-end ratio is about ${pct(backendRatio)}.`,
      ],
      source: "ask-amy fallback decision rules",
    };
  }

  return {
    status: "NO-GO",
    grade: "D",
    label: "High-risk range",
    bluf: "This looks too tight unless income rises, expenses drop, price comes down, or cash reserves improve.",
    reasons: [
      `Housing ratio is about ${pct(housingRatio)}.`,
      `Back-end ratio is about ${pct(backendRatio)}.`,
    ],
    source: "ask-amy fallback decision rules",
  };
}

function listMissingInputs({ normalizedProfile, scenario, compensation, mortgage }) {
  const missing = [];

  if (!normalizedProfile?.rank_paygrade && !scenario?.rank_paygrade) {
    missing.push("rank/paygrade");
  }

  if (scenario?.yos === null || scenario?.yos === undefined) {
    missing.push("years of service");
  }

  if (!scenario?.base && !scenario?.zip) {
    missing.push("base or BAH ZIP");
  }

  if (!compensation?.total_monthly) {
    missing.push("total monthly compensation");
  }

  if (!scenario?.price && !mortgage?.all_in_monthly) {
    missing.push("target home price");
  }

  if (!scenario?.creditScore) {
    missing.push("credit score");
  }

  if (scenario?.downpayment === null || scenario?.downpayment === undefined) {
    missing.push("down payment/savings");
  }

  if (!scenario?.expenses) {
    missing.push("monthly expenses");
  }

  return [...new Set(missing)];
}

function buildNextAction({ intent, missing, verdict, compensation, mortgage }) {
  if (missing?.length) {
    const top = missing.slice(0, 3).join(", ");

    return {
      type: "collect_missing_inputs",
      label: "Tighten the profile",
      message: `To give a sharper answer, I need: ${top}.`,
      missing: missing.slice(0, 5),
    };
  }

  if (verdict?.status === "GREEN") {
    return {
      type: "proceed_with_guardrails",
      label: "Proceed carefully",
      message:
        "Next move: compare the target payment against BAH, emergency savings, and commute/market risk before you commit.",
    };
  }

  if (verdict?.status === "CAUTION") {
    return {
      type: "reduce_risk",
      label: "Create more buffer",
      message:
        "Next move: lower the target price, increase down payment, reduce monthly debt, or compare renting before buying.",
    };
  }

  if (verdict?.status === "NO-GO") {
    return {
      type: "pause_or_rework",
      label: "Rework the plan",
      message:
        "Next move: avoid forcing the purchase. Rebuild the scenario with a lower price, lower debt, or stronger savings.",
    };
  }

  if (intent === "compensation" && compensation?.total_monthly) {
    return {
      type: "review_housing_cap",
      label: "Review housing cap",
      message:
        "Next move: use this income to set a safe monthly housing cap before choosing a price range.",
    };
  }

  if (mortgage?.all_in_monthly) {
    return {
      type: "review_payment",
      label: "Review payment",
      message:
        "Next move: compare this all-in payment against BAH and your monthly expense load.",
    };
  }

  return {
    type: "continue",
    label: "Continue",
    message: "Ask Amy a specific housing, PCS, pay, or dashboard question.",
  };
}

// ============================================================
// //#15) DIRECT DETERMINISTIC REPLIES
// ============================================================

function buildDirectDeterministicReply({
  message,
  intent,
  normalizedProfile,
  deterministic,
}) {
  const p = normalizedProfile || {};
  const packet = deterministic?.public || {};
  const comp = packet.compensation;
  const mortgage = packet.mortgage;
  const affordability = packet.affordability;
  const verdict = packet.verdict;

  if (intent === "greeting") {
    const name = firstName(p.full_name);

    return [
      `Hey${name ? ` ${name}` : ""} — I’m Amy, your PCSUnited AI Concierge powered by TheWing.ai.`,
      "I can help explain your pay, BAH, housing affordability, PCS strategy, mortgage numbers, and dashboard readiness in plain English.",
    ].join(" ");
  }

  if (intent === "capabilities") {
    return [
      "I can help with five things: explain your military compensation, estimate housing affordability, interpret your dashboard, compare rent vs. buy, and turn your PCS/base situation into clear next steps.",
      "The goal is simple: less guessing, better decisions.",
    ].join(" ");
  }

  if (intent === "profile_question") {
    const pieces = [];

    if (p.full_name) pieces.push(`Name: ${p.full_name}`);
    if (p.rank_paygrade || p.rank) {
      pieces.push(`Rank: ${p.rank_paygrade || p.rank}`);
    }
    if (p.yos !== undefined) pieces.push(`YOS: ${p.yos}`);
    if (p.base) pieces.push(`Base: ${p.base}`);
    if (p.email) pieces.push(`Email: ${p.email}`);

    if (!pieces.length) {
      return "I do not have enough saved profile details loaded yet. Once you log in or pass the PCSUnited profile context, I can answer from your actual member profile.";
    }

    return `Here’s what I have loaded from your member profile: ${pieces.join(" • ")}.`;
  }

  if (intent === "compensation" && comp?.total_monthly) {
    return [
      `BLUF: Your estimated monthly compensation is ${money(comp.total_monthly)}.`,
      `That breaks down as Base Pay ${money(comp.base_pay)}, BAS ${money(comp.bas)}, and BAH ${money(comp.bah)}.`,
      comp.base || comp.zip
        ? `I’m using ${[comp.rank_paygrade, comp.base, comp.zip].filter(Boolean).join(" • ")}.`
        : "",
      comp.note ? `Note: ${comp.note}` : "",
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

    lines.push(`BLUF: ${verdict.bluf || "I have enough data to give you a first-pass housing read."}`);

    if (comp?.total_monthly) {
      lines.push(`Income loaded: ${money(comp.total_monthly)} monthly.`);
    }

    if (mortgage?.all_in_monthly) {
      lines.push(`Estimated all-in housing payment: ${money(mortgage.all_in_monthly)} monthly.`);
    }

    if (affordability?.housing_ratio !== undefined && affordability?.housing_ratio !== null) {
      lines.push(`Housing ratio: about ${pct(affordability.housing_ratio)}.`);
    }

    if (affordability?.backend_ratio !== undefined && affordability?.backend_ratio !== null) {
      lines.push(`Back-end ratio: about ${pct(affordability.backend_ratio)}.`);
    }

    lines.push(`Readiness: ${verdict.status}${verdict.grade ? ` (${verdict.grade})` : ""}.`);

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
// //#16) OPENAI PROMPTING
// ============================================================

function buildSystemPrompt({ profileSummary, deterministic }) {
  const packet = deterministic?.public || {};

  return [
    "You are Amy, PCSUnited’s AI Concierge, powered by TheWing.ai.",
    "PCSUnited is the trusted military PCS, housing, and financial-readiness brand.",
    "TheWing.ai is the software intelligence layer behind the calculations, profile loading, decision logic, and concierge guidance.",
    "",
    "Your job:",
    "- Help military members understand pay, BAH, BAS, VA disability, retirement, affordability, mortgage estimates, PCS housing strategy, dashboard readiness, and next steps.",
    "- Be useful immediately.",
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
    "- Keep the answer concise unless the user asks for depth.",
    "",
    "Hard rules:",
    "- Never invent pay, BAH, mortgage, approval, or affordability numbers.",
    "- If a deterministic truth packet is provided, trust it over your own math.",
    "- Do not perform legal, tax, or lending approval advice.",
    "- Do not guarantee loan approval, appreciation, rent growth, or investment outcomes.",
    "- If data is missing, say exactly what is missing and ask for the smallest next input.",
    "- If the user asks about their profile, answer only from verified/profile context.",
    "- If the user asks about affordability, use the provided compensation, mortgage, affordability, and verdict packets.",
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
  ].join("\n");
}

function buildUserPayload({
  message,
  email,
  intent,
  normalizedProfile,
  deterministic,
  mergedContext,
}) {
  return {
    user_message: message,
    email: email || null,
    intent,
    agent: {
      name: "Amy",
      display_name: "PCSUnited AI Concierge",
      brand: "PCSUnited",
      powered_by: "TheWing.ai",
    },
    behavior_rules: {
      bluf_first: true,
      use_truth_packet_over_model_math: true,
      do_not_fabricate_numbers: true,
      concise_by_default: true,
      explain_numbers_plainly: true,
    },
    member_profile: stripSensitiveProfile(normalizedProfile),
    truth_packet: deterministic?.public || null,
    dashboard_context_present: Boolean(
      Object.keys(mergedContext?.fad || {}).length ||
        Object.keys(mergedContext?.kpi_overrides || {}).length
    ),
    output_request:
      "Return a polished conversational answer only. Do not return JSON unless the user explicitly asks for JSON.",
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 850,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(userPayload),
          },
        ],
      }),
      signal: controller.signal,
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
// //#17) FALLBACK REPLIES
// ============================================================

function buildFallbackReply({
  message,
  intent,
  normalizedProfile,
  deterministic,
}) {
  const packet = deterministic?.public || {};
  const missing = packet.missing_inputs || [];

  if (intent === "compensation") {
    if (missing.length) {
      return `I can explain your PCSUnited compensation, but I’m missing ${missing.slice(0, 3).join(", ")}. Once those are loaded, I can calculate Base Pay, BAS, BAH, and total monthly income.`;
    }

    return "I can help explain Base Pay, BAS, BAH, VA disability, retirement pay, and total monthly compensation once your member profile is loaded.";
  }

  if (intent === "housing_affordability") {
    if (missing.length) {
      return `BLUF: I need a few more inputs before I can give a reliable affordability read. The biggest missing pieces are ${missing.slice(0, 3).join(", ")}.`;
    }

    return "BLUF: I can help judge affordability by comparing your total monthly income, BAH, monthly expenses, target home price, down payment, and estimated mortgage payment.";
  }

  return [
    "I can help with PCS housing strategy, military pay, BAH, mortgage estimates, dashboard readiness, and rent-vs-buy decisions.",
    "Ask me something like: “Can I afford this home?” or “Explain my dashboard.”",
  ].join(" ");
}

// ============================================================
// //#18) STRUCTURED ANSWER BUILDER
// ============================================================

function extractOrBuildStructuredAnswer({
  aiReply,
  deterministic,
  normalizedProfile,
  intent,
}) {
  return buildStructuredAnswerFromText({
    reply: aiReply,
    deterministic,
    normalizedProfile,
    intent,
  });
}

function buildStructuredAnswerFromText({
  reply,
  deterministic,
  normalizedProfile,
  intent,
}) {
  const packet = deterministic?.public || {};
  const comp = packet.compensation || null;
  const mortgage = packet.mortgage || null;
  const affordability = packet.affordability || null;
  const verdict = packet.verdict || null;
  const nextAction = packet.next_action || null;

  const numbers = [];

  if (comp?.total_monthly) {
    numbers.push({
      label: "Total Monthly Compensation",
      value: money(comp.total_monthly),
      raw: comp.total_monthly,
    });
  }

  if (comp?.base_pay) {
    numbers.push({
      label: "Base Pay",
      value: money(comp.base_pay),
      raw: comp.base_pay,
    });
  }

  if (comp?.bas) {
    numbers.push({
      label: "BAS",
      value: money(comp.bas),
      raw: comp.bas,
    });
  }

  if (comp?.bah) {
    numbers.push({
      label: "BAH",
      value: money(comp.bah),
      raw: comp.bah,
    });
  }

  if (mortgage?.all_in_monthly) {
    numbers.push({
      label: "Estimated All-In Housing Payment",
      value: money(mortgage.all_in_monthly),
      raw: mortgage.all_in_monthly,
    });
  }

  if (affordability?.housing_ratio !== undefined && affordability?.housing_ratio !== null) {
    numbers.push({
      label: "Housing Ratio",
      value: pct(affordability.housing_ratio),
      raw: affordability.housing_ratio,
    });
  }

  if (affordability?.backend_ratio !== undefined && affordability?.backend_ratio !== null) {
    numbers.push({
      label: "Back-End Ratio",
      value: pct(affordability.backend_ratio),
      raw: affordability.backend_ratio,
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

  const recommendations = [];

  if (nextAction?.message) recommendations.push(nextAction.message);

  if (intent === "housing_affordability" && !mortgage?.all_in_monthly) {
    recommendations.push("Add a target home price to generate a sharper mortgage and readiness estimate.");
  }

  if (intent === "compensation" && comp?.total_monthly) {
    recommendations.push("Use this income as the baseline before choosing a safe housing cap.");
  }

  return {
    bluf: verdict?.bluf || firstSentence(reply) || "Amy has a first-pass recommendation.",
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
      affordability,
    }),
  };
}

function firstSentence(text) {
  const s = safeStr(text);
  if (!s) return "";
  const match = s.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : s.slice(0, 180);
}

function buildFollowUpQuestion({ intent, missing, mortgage }) {
  if (missing?.length) {
    return `Want to add ${missing[0]} so I can tighten the answer?`;
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
// //#19) PROFILE / OUTPUT FORMAT HELPERS
// ============================================================

function buildProfileSummary(profile, deterministic) {
  const p = profile || {};
  const comp = deterministic?.public?.compensation || null;

  const parts = [];

  if (p.full_name) parts.push(`Name: ${p.full_name}`);
  if (p.email) parts.push(`Email: ${p.email}`);
  if (p.mode) parts.push(`Status: ${p.mode}`);
  if (p.rank_paygrade || p.rank) {
    parts.push(`Rank: ${p.rank_paygrade || p.rank}`);
  }
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
  if (p.downpayment) {
    parts.push(`Down Payment: ${money(p.downpayment)}`);
  }
  if (p.credit_score) {
    parts.push(`Credit Score: ${p.credit_score}`);
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
    downpayment: p.downpayment,
    savings: p.savings,
    credit_score: p.credit_score,
    bedrooms: p.bedrooms,
    cityKey: p.cityKey,
  });
}

function stripEmpty(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const out = {};

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;

    if (Array.isArray(v)) {
      if (v.length) out[k] = v;
      continue;
    }

    if (typeof v === "object") {
      const nested = stripEmpty(v);
      if (nested && Object.keys(nested).length) out[k] = nested;
      continue;
    }

    out[k] = v;
  }

  return out;
}
