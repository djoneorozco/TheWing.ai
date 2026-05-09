// netlify/functions/verify-code.js
// ============================================================
// TheWing.ai • verify-code
// v1.0.1
//
// PURPOSE:
// - Accepts POST { email, code }
// - Hashes the user-entered 6-digit code
// - Looks up the latest verification code in public.email_codes
// - Confirms:
//     1) Email exists
//     2) Code hash matches
//     3) Code is not expired
//     4) Attempts are below limit
// - Increments attempts when wrong
// - On success:
//     1) Updates public.profiles:
//          email_verified = true
//          email_verified_at = now()
//          status = "active"
//          updated_at = now()
//     2) Returns canonical profile
//
// FRONTEND ENDPOINT:
// - POST /api/verify-code
// - POST /.netlify/functions/verify-code
//
// REQUIRED ENV:
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
//   or SUPABASE_SERVICE_ROLE_KEY
//
// EXPECTED email_codes TABLE FIELDS:
// - email text
// - code_hash text
// - attempts int4
// - created_at timestamptz
// - expires_at timestamptz
//
// EXPECTED profiles TABLE FIELDS:
// - email text
// - status text
// - email_verified boolean
// - email_verified_at timestamptz
// - updated_at timestamptz
// ============================================================

"use strict";

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const FUNCTION_VERSION = "thewing-verify-code-1.0.1";
const MAX_ATTEMPTS = 5;

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

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

function cleanCode(value) {
  return cleanString(value).replace(/\D/g, "").slice(0, 6);
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

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

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstRow(data) {
  return Array.isArray(data) && data.length ? data[0] : null;
}

function isExpired(expiresAt) {
  const exp = new Date(expiresAt).getTime();
  if (!Number.isFinite(exp)) return true;
  return Date.now() > exp;
}

function publicProfile(row, emailFallback) {
  if (!row || typeof row !== "object") {
    return {
      email: emailFallback || "",
      status: "",
      email_verified: false
    };
  }

  const projectedHomePrice = toNumberOrNull(row.projected_home_price);
  const downpayment = toNumberOrNull(row.downpayment);
  const creditScore = toNumberOrNull(row.credit_score);
  const monthlyExpenses = toNumberOrNull(row.monthly_expenses);

  return {
    id: row.id || null,
    profiles_user_id_unique: row.profiles_user_id_unique || null,

    email: row.email || emailFallback || "",
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    full_name: row.full_name || "",

    phone: row.phone || "",
    mode: row.mode || "",
    rank: row.rank || "",
    rank_paygrade: row.rank_paygrade || "",
    rank_title: row.rank_title || "",

    va_disability: toNumberOrNull(row.va_disability),
    retired: row.retired ?? null,
    retire_system: row.retire_system || "",

    yos: toNumberOrNull(row.yos),
    family: toNumberOrNull(row.family),
    base: row.base || "",
    notes: row.notes || "",

    monthly_expenses: monthlyExpenses,
    projected_home_price: projectedHomePrice,
    downpayment,
    credit_score: creditScore,

    price: projectedHomePrice,
    homePrice: projectedHomePrice,

    expenses: monthlyExpenses,
    monthlyExpenses,

    dpAmt: downpayment,
    downPayment: downpayment,

    creditScore,

    pcs_base: row.base || "",
    pcsBase: row.base || "",

    status: row.status || "",
    email_verified: row.email_verified === true,
    email_verified_at: row.email_verified_at || null,
    updated_at: row.updated_at || null
  };
}

async function fetchLatestCodeRecord(supabase, email) {
  const { data, error } = await supabase
    .from("email_codes")
    .select("email, code_hash, attempts, expires_at, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return firstRow(data);
}

async function incrementAttempts(supabase, record, attempts) {
  const { error } = await supabase
    .from("email_codes")
    .update({
      attempts: attempts + 1
    })
    .eq("email", record.email)
    .eq("created_at", record.created_at);

  if (error) {
    console.error("TheWing verify-code attempt update error:", error);
  }
}

async function fetchProfileByEmail(supabase, email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .limit(1);

  if (error) throw error;
  return firstRow(data);
}

async function updateProfileVerified(supabase, email) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      status: "active",
      email_verified: true,
      email_verified_at: nowIso,
      updated_at: nowIso
    })
    .eq("email", email)
    .select("*")
    .limit(1);

  if (error) throw error;
  return firstRow(data);
}

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

  const email = cleanEmail(body.email);
  const code = cleanCode(body.code);

  if (!email || !isValidEmail(email)) {
    return respond(event, 400, {
      ok: false,
      error: "Valid email required.",
      version: FUNCTION_VERSION
    });
  }

  if (!code || code.length !== 6) {
    return respond(event, 400, {
      ok: false,
      error: "Email and 6-digit code required.",
      version: FUNCTION_VERSION
    });
  }

  const SUPABASE_URL = getSupabaseUrl();
  const SERVICE_KEY = getServiceKey();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return respond(event, 500, {
      ok: false,
      error: "Supabase environment variables are not configured.",
      missing: {
        SUPABASE_URL: !SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY_or_SERVICE_KEY: !SERVICE_KEY
      },
      version: FUNCTION_VERSION
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    const record = await fetchLatestCodeRecord(supabase, email);

    if (!record) {
      return respond(event, 400, {
        ok: false,
        error: "Invalid or expired code.",
        version: FUNCTION_VERSION
      });
    }

    const attempts = Number(record.attempts || 0);

    if (attempts >= MAX_ATTEMPTS) {
      return respond(event, 400, {
        ok: false,
        error: "Too many attempts. Request a new code.",
        version: FUNCTION_VERSION
      });
    }

    if (isExpired(record.expires_at)) {
      return respond(event, 400, {
        ok: false,
        error: "Code expired. Request a new code.",
        version: FUNCTION_VERSION
      });
    }

    const submittedHash = hashCode(code);

    if (submittedHash !== record.code_hash) {
      await incrementAttempts(supabase, record, attempts);

      return respond(event, 400, {
        ok: false,
        error: "Invalid code.",
        attempts_remaining: Math.max(0, MAX_ATTEMPTS - attempts - 1),
        version: FUNCTION_VERSION
      });
    }

    let profileRow = null;
    let profileUpdateWarning = null;

    try {
      profileRow = await updateProfileVerified(supabase, email);
    } catch (profileUpdateError) {
      console.error("TheWing verify-code profile update error:", profileUpdateError);
      profileUpdateWarning = profileUpdateError?.message || "Profile verification update failed.";

      try {
        profileRow = await fetchProfileByEmail(supabase, email);
      } catch (profileFetchError) {
        console.error("TheWing verify-code profile fallback fetch error:", profileFetchError);
      }
    }

    if (!profileRow) {
      try {
        profileRow = await fetchProfileByEmail(supabase, email);
      } catch (profileFetchError) {
        console.error("TheWing verify-code profile fetch error:", profileFetchError);
      }
    }

    return respond(event, 200, {
      ok: true,
      message: profileUpdateWarning
        ? "Code verified, but profile verification status could not be updated."
        : "Code verified. Account is active.",
      warning: profileUpdateWarning ? true : false,
      warning_detail: profileUpdateWarning,
      email,
      profile: publicProfile(profileRow, email),
      session: {
        auth_ok: true,
        email
      },
      version: FUNCTION_VERSION
    });
  } catch (error) {
    console.error("TheWing verify-code error:", error);

    return respond(event, 500, {
      ok: false,
      error: error?.message || "Server error during code verification.",
      version: FUNCTION_VERSION
    });
  }
};
