// netlify/functions/financial-intake.js
// ============================================================
// TheWing.ai • PCSUnited Financial Intake
// v1.0.0
//
// PURPOSE:
// - Accepts Financial Intake data from PCSUnited user-dashboard
// - Saves by email into Supabase
// - Inserts a historical row into public.financial_intakes
// - Attempts to insert latest row into public.user_financial_inputs
// - Mirrors latest values into public.profiles when columns exist
// - Designed to work with TheWing login.js merge flow
//
// FRONTEND ENDPOINTS:
// - POST /api/financial-intake
// - POST /.netlify/functions/financial-intake
//
// REQUIRED ENV:
// - SUPABASE_URL
//   or SUPABASE_PROJECT_URL
// - SUPABASE_SERVICE_ROLE_KEY
//   or SUPABASE_SERVICE_KEY
//
// EXPECTED BODY:
// {
//   email,
//   mode,
//   expenses,
//   monthly_expenses,
//   price,
//   projected_home_price,
//   downpayment,
//   credit_score,
//   estimated_apr,
//   downpayment_percent,
//   source
// }
//
// SUPABASE TABLES USED:
// - public.financial_intakes
// - public.user_financial_inputs       best effort
// - public.profiles                    best effort mirror
// ============================================================

"use strict";

const { createClient } = require("@supabase/supabase-js");

const FUNCTION_VERSION = "thewing-financial-intake-1.0.0";

// ------------------------------------------------------------
// #1) ALLOWED ORIGINS
// ------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",

  "https://pcs-united.webflow.io",
  "https://pcsu.webflow.io",
  "https://pcsunited-com-28346d.webflow.io",

  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",

  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8888",
  "http://127.0.0.1:8888"
]);

// ------------------------------------------------------------
// #2) CORS HELPERS
// ------------------------------------------------------------
function getRequestOrigin(event) {
  return (
    event?.headers?.origin ||
    event?.headers?.Origin ||
    ""
  ).trim();
}

function getCorsHeaders(event) {
  const origin = getRequestOrigin(event);

  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function respond(event, statusCode, payload) {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(payload || {})
  };
}

// ------------------------------------------------------------
// #3) SMALL UTILS
// ------------------------------------------------------------
function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function safeLower(value) {
  return cleanString(value).toLowerCase();
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanString(email));
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const raw = String(value)
    .replace(/[$,]/g, "")
    .trim();

  if (!raw) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toIntegerOrNull(value, min, max) {
  const n = toNumberOrNull(value);
  if (n === null) return null;

  let rounded = Math.round(n);

  if (typeof min === "number") rounded = Math.max(min, rounded);
  if (typeof max === "number") rounded = Math.min(max, rounded);

  return rounded;
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const n = toNumberOrNull(value);
    if (n !== null) return n;
  }
  return null;
}

function pickFirstString(...values) {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function makeIntakeId(email) {
  const safeEmail = safeLower(email).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `pcsu_fi_${safeEmail}_${Date.now().toString(36)}`;
}

function compactObject(obj) {
  const out = {};

  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined) out[key] = value;
  });

  return out;
}

// ------------------------------------------------------------
// #4) ENV HELPERS
// ------------------------------------------------------------
function getSupabaseUrl() {
  return cleanString(
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ""
  );
}

function getServiceKey() {
  return cleanString(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  );
}

function makeAdminClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

// ------------------------------------------------------------
// #5) NORMALIZE INTAKE
// ------------------------------------------------------------
function normalizeFinancialIntake(body) {
  const email = safeLower(body.email);

  const mode = pickFirstString(
    body.mode,
    body.purchase_time,
    body.time_to_buy,
    "ready"
  );

  const monthlyExpenses = pickFirstNumber(
    body.monthly_expenses,
    body.monthlyExpenses,
    body.expenses,
    body.expensesOverride
  );

  const projectedHomePrice = pickFirstNumber(
    body.projected_home_price,
    body.projectedHomePrice,
    body.price,
    body.homePrice,
    body.housing,
    body.housingOverride
  );

  const downpayment = pickFirstNumber(
    body.downpayment,
    body.downPayment,
    body.down_payment,
    body.dpAmt,
    body.savings,
    body.savingsOverride
  );

  const creditScore = toIntegerOrNull(
    pickFirstNumber(
      body.credit_score,
      body.creditScore,
      body.fico
    ),
    300,
    850
  );

  const estimatedApr = pickFirstNumber(
    body.estimated_apr,
    body.estimatedApr,
    body.apr
  );

  const downpaymentPercent = pickFirstNumber(
    body.downpayment_percent,
    body.downpaymentPercent,
    body.down_percent,
    body.downPercent
  );

  const source = pickFirstString(
    body.source,
    "pcsunited.financial_intake.thewing"
  );

  const intakeId = pickFirstString(
    body.intake_id,
    body.intakeId,
    makeIntakeId(email)
  );

  const nowIso = new Date().toISOString();

  return {
    email,
    mode,
    monthlyExpenses,
    projectedHomePrice,
    downpayment,
    creditScore,
    estimatedApr,
    downpaymentPercent,
    source,
    intakeId,
    nowIso
  };
}

// ------------------------------------------------------------
// #6) SAVE HELPERS
// ------------------------------------------------------------
async function insertFinancialIntake(admin, intake) {
  const fullPayload = compactObject({
    email: intake.email,
    mode: intake.mode,

    // canonical financial_intakes fields
    expenses: intake.monthlyExpenses,
    monthly_expenses: intake.monthlyExpenses,

    price: intake.projectedHomePrice,
    projected_home_price: intake.projectedHomePrice,

    downpayment: intake.downpayment,
    credit_score: intake.creditScore,

    estimated_apr: intake.estimatedApr,
    downpayment_percent: intake.downpaymentPercent,

    source: intake.source,
    intake_id: intake.intakeId,

    created_at: intake.nowIso,
    updated_at: intake.nowIso
  });

  const first = await admin
    .from("financial_intakes")
    .insert(fullPayload)
    .select("*")
    .maybeSingle();

  if (!first.error) {
    return {
      ok: true,
      table: "financial_intakes",
      action: "insert_full",
      row: first.data || null,
      error: null
    };
  }

  // Schema-safe fallback for the known minimal table shape:
  // id, email, mode, expenses, price, downpayment, credit_score, source, intake_id
  const fallbackPayload = compactObject({
    email: intake.email,
    mode: intake.mode,
    expenses: intake.monthlyExpenses,
    price: intake.projectedHomePrice,
    downpayment: intake.downpayment,
    credit_score: intake.creditScore,
    source: intake.source,
    intake_id: intake.intakeId
  });

  const fallback = await admin
    .from("financial_intakes")
    .insert(fallbackPayload)
    .select("*")
    .maybeSingle();

  if (!fallback.error) {
    return {
      ok: true,
      table: "financial_intakes",
      action: "insert_fallback",
      row: fallback.data || null,
      warning: first.error.message || null,
      error: null
    };
  }

  return {
    ok: false,
    table: "financial_intakes",
    action: "insert_failed",
    row: null,
    error: fallback.error.message || first.error.message || "financial_intakes insert failed"
  };
}

async function insertUserFinancialInputs(admin, intake) {
  const fullPayload = compactObject({
    email: intake.email,
    mode: intake.mode,

    monthly_expenses: intake.monthlyExpenses,
    expenses: intake.monthlyExpenses,

    projected_home_price: intake.projectedHomePrice,
    price: intake.projectedHomePrice,
    home_price: intake.projectedHomePrice,

    downpayment: intake.downpayment,
    down_payment: intake.downpayment,

    credit_score: intake.creditScore,

    purchase_time: intake.mode,
    time_to_buy: intake.mode,

    estimated_apr: intake.estimatedApr,
    downpayment_percent: intake.downpaymentPercent,

    source: intake.source,
    updated_at: intake.nowIso,
    created_at: intake.nowIso
  });

  const first = await admin
    .from("user_financial_inputs")
    .insert(fullPayload)
    .select("*")
    .maybeSingle();

  if (!first.error) {
    return {
      ok: true,
      table: "user_financial_inputs",
      action: "insert_full",
      row: first.data || null,
      error: null
    };
  }

  // Fallback if that table has fewer columns.
  const fallbackPayload = compactObject({
    email: intake.email,
    monthly_expenses: intake.monthlyExpenses,
    projected_home_price: intake.projectedHomePrice,
    downpayment: intake.downpayment,
    credit_score: intake.creditScore,
    updated_at: intake.nowIso
  });

  const fallback = await admin
    .from("user_financial_inputs")
    .insert(fallbackPayload)
    .select("*")
    .maybeSingle();

  if (!fallback.error) {
    return {
      ok: true,
      table: "user_financial_inputs",
      action: "insert_fallback",
      row: fallback.data || null,
      warning: first.error.message || null,
      error: null
    };
  }

  return {
    ok: false,
    table: "user_financial_inputs",
    action: "insert_skipped_or_failed",
    row: null,
    error: fallback.error.message || first.error.message || "user_financial_inputs insert failed"
  };
}

async function updateProfilesMirror(admin, intake) {
  const fullPayload = compactObject({
    monthly_expenses: intake.monthlyExpenses,
    projected_home_price: intake.projectedHomePrice,
    downpayment: intake.downpayment,
    credit_score: intake.creditScore,
    time_to_buy: intake.mode,
    updated_at: intake.nowIso,
    source: intake.source
  });

  const first = await admin
    .from("profiles")
    .update(fullPayload)
    .eq("email", intake.email)
    .select("email, monthly_expenses, projected_home_price, downpayment, credit_score, updated_at")
    .maybeSingle();

  if (!first.error) {
    return {
      ok: true,
      table: "profiles",
      action: "update_full",
      row: first.data || null,
      error: null
    };
  }

  // Fallback if profiles does not have time_to_buy/source or some newer columns.
  const fallbackPayload = compactObject({
    monthly_expenses: intake.monthlyExpenses,
    projected_home_price: intake.projectedHomePrice,
    downpayment: intake.downpayment,
    credit_score: intake.creditScore,
    updated_at: intake.nowIso
  });

  const fallback = await admin
    .from("profiles")
    .update(fallbackPayload)
    .eq("email", intake.email)
    .select("email")
    .maybeSingle();

  if (!fallback.error) {
    return {
      ok: true,
      table: "profiles",
      action: "update_fallback",
      row: fallback.data || null,
      warning: first.error.message || null,
      error: null
    };
  }

  return {
    ok: false,
    table: "profiles",
    action: "update_skipped_or_failed",
    row: null,
    error: fallback.error.message || first.error.message || "profiles update failed"
  };
}

async function fetchLatestMergedFinancial(admin, email) {
  const [
    profileRes,
    userFinancialRes,
    financialIntakeRes
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle(),

    admin
      .from("user_financial_inputs")
      .select("*")
      .eq("email", email)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1),

    admin
      .from("financial_intakes")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1)
  ]);

  const profile = profileRes.error ? null : profileRes.data || null;
  const userFinancial = userFinancialRes.error ? null : Array.isArray(userFinancialRes.data) ? userFinancialRes.data[0] || null : null;
  const financialIntake = financialIntakeRes.error ? null : Array.isArray(financialIntakeRes.data) ? financialIntakeRes.data[0] || null : null;

  const monthlyExpenses = pickFirstNumber(
    userFinancial?.monthly_expenses,
    userFinancial?.expenses,
    financialIntake?.monthly_expenses,
    financialIntake?.expenses,
    profile?.monthly_expenses,
    profile?.expenses
  );

  const projectedHomePrice = pickFirstNumber(
    userFinancial?.projected_home_price,
    userFinancial?.price,
    financialIntake?.projected_home_price,
    financialIntake?.price,
    profile?.projected_home_price,
    profile?.price
  );

  const downpayment = pickFirstNumber(
    userFinancial?.downpayment,
    userFinancial?.down_payment,
    financialIntake?.downpayment,
    financialIntake?.down_payment,
    profile?.downpayment,
    profile?.down_payment
  );

  const creditScore = pickFirstNumber(
    userFinancial?.credit_score,
    financialIntake?.credit_score,
    profile?.credit_score
  );

  return {
    profile,
    user_financial_inputs: userFinancial,
    financial_intakes: financialIntake,
    merged_financial: {
      email,
      monthly_expenses: monthlyExpenses,
      expenses: monthlyExpenses,
      projected_home_price: projectedHomePrice,
      price: projectedHomePrice,
      homePrice: projectedHomePrice,
      housing: projectedHomePrice,
      downpayment,
      downPayment: downpayment,
      dpAmt: downpayment,
      credit_score: creditScore,
      creditScore
    }
  };
}

// ------------------------------------------------------------
// #7) MAIN HANDLER
// ------------------------------------------------------------
exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return respond(event, 405, {
      ok: false,
      error: "Method not allowed. Use POST.",
      version: FUNCTION_VERSION
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return respond(event, 400, {
      ok: false,
      error: "Invalid JSON body.",
      version: FUNCTION_VERSION
    });
  }

  const intake = normalizeFinancialIntake(body);

  if (!intake.email || !isValidEmail(intake.email)) {
    return respond(event, 400, {
      ok: false,
      error: "Valid email is required.",
      version: FUNCTION_VERSION
    });
  }

  if (
    intake.monthlyExpenses === null &&
    intake.projectedHomePrice === null &&
    intake.downpayment === null &&
    intake.creditScore === null
  ) {
    return respond(event, 400, {
      ok: false,
      error: "At least one financial intake field is required.",
      required_any_of: [
        "monthly_expenses",
        "expenses",
        "projected_home_price",
        "price",
        "downpayment",
        "credit_score"
      ],
      version: FUNCTION_VERSION
    });
  }

  if (
    intake.projectedHomePrice !== null &&
    intake.downpayment !== null &&
    intake.downpayment > intake.projectedHomePrice
  ) {
    return respond(event, 400, {
      ok: false,
      error: "Downpayment cannot be greater than projected home price.",
      version: FUNCTION_VERSION
    });
  }

  const SUPABASE_URL = getSupabaseUrl();
  const SERVICE_KEY = getServiceKey();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return respond(event, 500, {
      ok: false,
      error: "Missing Supabase environment variables.",
      missing: {
        SUPABASE_URL: !SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY_or_SERVICE_KEY: !SERVICE_KEY
      },
      version: FUNCTION_VERSION
    });
  }

  const admin = makeAdminClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Confirm profile exists. This prevents silent saves for mistyped emails.
    const { data: profileRow, error: profileLookupError } = await admin
      .from("profiles")
      .select("email")
      .eq("email", intake.email)
      .maybeSingle();

    if (profileLookupError) {
      return respond(event, 500, {
        ok: false,
        error: "Profile lookup failed.",
        details: profileLookupError.message || null,
        version: FUNCTION_VERSION
      });
    }

    if (!profileRow) {
      return respond(event, 404, {
        ok: false,
        error: "No PCSUnited profile found for this email.",
        email: intake.email,
        version: FUNCTION_VERSION
      });
    }

    const financialIntakeResult = await insertFinancialIntake(admin, intake);

    if (!financialIntakeResult.ok) {
      return respond(event, 500, {
        ok: false,
        error: "Financial intake could not be saved.",
        details: financialIntakeResult.error,
        result: financialIntakeResult,
        version: FUNCTION_VERSION
      });
    }

    // Best effort because schemas may vary.
    const userFinancialResult = await insertUserFinancialInputs(admin, intake);
    const profilesMirrorResult = await updateProfilesMirror(admin, intake);

    const latest = await fetchLatestMergedFinancial(admin, intake.email);

    return respond(event, 200, {
      ok: true,
      message: "Financial intake saved.",
      email: intake.email,
      intake_id: intake.intakeId,
      saved_at: intake.nowIso,
      saved: {
        financial_intakes: financialIntakeResult,
        user_financial_inputs: userFinancialResult,
        profiles: profilesMirrorResult
      },
      latest,
      profile: {
        ...latest.profile,
        ...latest.merged_financial
      },
      bridge: latest.merged_financial,
      version: FUNCTION_VERSION
    });
  } catch (error) {
    console.error("TheWing financial-intake error:", error);

    return respond(event, 500, {
      ok: false,
      error: error?.message || "Server error while saving financial intake.",
      version: FUNCTION_VERSION
    });
  }
};
