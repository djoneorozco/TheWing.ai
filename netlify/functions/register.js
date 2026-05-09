// netlify/functions/register.js
// ============================================================
// TheWing.ai • register
// v1.0.0
//
// PURPOSE:
// - Creates a Supabase Auth user with email + password
// - Inserts/updates public.profiles
// - Supports PCSUnited signup payloads
// - Saves basic military profile fields
// - Saves optional housing intake fields directly to profiles
// - Starts profile as pending_verification
//
// IMPORTANT:
// - This keeps compatibility with the existing PCSUnited signup embed
// - Frontend can call:
//      POST /api/register
//      POST /.netlify/functions/register
//
// EXPECTS ENV:
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
//   or SUPABASE_SERVICE_ROLE_KEY
//
// BODY SUPPORTED:
// {
//   email,
//   password,
//   first_name,
//   last_name,
//   full_name,
//   fullName,
//   phone,
//   mode,
//   rank,
//   rank_paygrade,
//   rank_title,
//   va_disability,
//   retired,
//   retire_system,
//   yos,
//   family,
//   base,
//   notes,
//   projected_home_price,
//   downpayment,
//   credit_score
// }
// ============================================================

"use strict";

const { createClient } = require("@supabase/supabase-js");

const FUNCTION_VERSION = "thewing-register-1.0.0";

const ALLOWED_ORIGINS = new Set([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",
  "https://pcs-united.webflow.io",
  "https://pcsu.webflow.io",

  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing-ai.netlify.app",
  "https://thewingai.netlify.app",

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

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function toNullableNumber(value) {
  if (value === undefined || value === null) return null;

  const raw = String(value).replace(/[$,%\s,]/g, "").trim();
  if (!raw) return null;

  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function toNullableInteger(value) {
  const num = toNullableNumber(value);
  if (num === null) return null;
  return Math.round(num);
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(min, Math.min(max, num));
}

function deriveFirstName(fullName) {
  const clean = cleanString(fullName);
  if (!clean) return "";
  return clean.split(/\s+/).filter(Boolean)[0] || "";
}

function deriveLastName(fullName) {
  const clean = cleanString(fullName);
  if (!clean) return "";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(1).join(" ");
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

function getProjectRefFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const host = String(url.hostname || "");
    const ref = host.split(".")[0] || "";
    return {
      host,
      ref
    };
  } catch (_) {
    return {
      host: String(urlString || ""),
      ref: ""
    };
  }
}

async function findAuthUserIdByEmail(supabase, emailLower) {
  const perPage = 200;
  let page = 1;

  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      return {
        id: null,
        error: error.message || String(error)
      };
    }

    const users = data && Array.isArray(data.users) ? data.users : [];
    const hit = users.find((user) => {
      return String(user.email || "").toLowerCase() === emailLower;
    });

    if (hit && hit.id) {
      return {
        id: hit.id,
        error: null
      };
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return {
    id: null,
    error: null
  };
}

function buildProfilePayload(body, authUserId) {
  const firstNameInput = cleanString(body.first_name || body.firstName);
  const lastNameInput = cleanString(body.last_name || body.lastName);

  const fullNameInput = cleanString(
    body.full_name ||
    body.fullName ||
    body.name ||
    [firstNameInput, lastNameInput].filter(Boolean).join(" ")
  );

  const finalFirstName = firstNameInput || deriveFirstName(fullNameInput);
  const finalLastName = lastNameInput || deriveLastName(fullNameInput);
  const finalFullName =
    fullNameInput ||
    [finalFirstName, finalLastName].filter(Boolean).join(" ");

  const email = cleanEmail(body.email);
  const mode = cleanString(body.mode).toLowerCase();

  const finalRankPaygrade = cleanString(
    body.rank_paygrade ||
    body.rankPaygrade ||
    body.rank ||
    ""
  ) || null;

  const finalRank = cleanString(
    body.rank ||
    body.rank_paygrade ||
    body.rankPaygrade ||
    ""
  ) || null;

  const yosNum = toNullableInteger(body.yos);
  const familyNum = toNullableInteger(body.family);

  const vaDisabilityNum = toNullableInteger(
    body.va_disability ??
    body.vaDisability
  );

  const projectedHomePriceNum = toNullableNumber(
    body.projected_home_price ??
    body.projectedHomePrice ??
    body.price ??
    body.housing
  );

  const downpaymentNum = toNullableNumber(
    body.downpayment ??
    body.downPayment ??
    body.dpAmt
  );

  const creditScoreRaw = toNullableInteger(
    body.credit_score ??
    body.creditScore
  );

  const creditScoreNum =
    creditScoreRaw === null
      ? null
      : Math.round(clampNumber(creditScoreRaw, 300, 850));

  const retiredRaw = body.retired;
  const retired =
    retiredRaw === true ||
    retiredRaw === "true" ||
    retiredRaw === 1 ||
    retiredRaw === "1";

  const now = new Date().toISOString();

  return {
    profiles_user_id_unique: authUserId,

    email,
    first_name: finalFirstName || null,
    last_name: finalLastName || null,
    full_name: finalFullName || null,
    phone: cleanString(body.phone) || null,

    mode: mode || null,
    rank: finalRank,
    rank_paygrade: finalRankPaygrade,
    rank_title: cleanString(body.rank_title || body.rankTitle) || null,

    va_disability: vaDisabilityNum,
    retired,
    retire_system: cleanString(body.retire_system || body.retireSystem) || null,

    yos: yosNum,
    family: familyNum,
    base: cleanString(body.base) || null,
    notes: cleanString(body.notes) || null,

    projected_home_price: projectedHomePriceNum,
    downpayment: downpaymentNum,
    credit_score: creditScoreNum,

    status: "pending_verification",
    email_verified: false,
    email_verified_at: null,

    role: cleanString(body.role) || "user",
    source: cleanString(body.source) || "thewing.register.v1",

    updated_at: now
  };
}

function publicProfile(row) {
  if (!row || typeof row !== "object") return null;

  return {
    id: row.id || null,
    profiles_user_id_unique: row.profiles_user_id_unique || null,

    email: row.email || "",
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    full_name: row.full_name || "",

    phone: row.phone || "",
    mode: row.mode || "",
    rank: row.rank || "",
    rank_paygrade: row.rank_paygrade || "",
    rank_title: row.rank_title || "",

    va_disability: row.va_disability ?? null,
    retired: row.retired ?? null,
    retire_system: row.retire_system || "",

    yos: row.yos ?? null,
    family: row.family ?? null,
    base: row.base || "",

    projected_home_price: row.projected_home_price ?? null,
    downpayment: row.downpayment ?? null,
    credit_score: row.credit_score ?? null,

    status: row.status || "pending_verification",
    email_verified: row.email_verified === true,
    email_verified_at: row.email_verified_at || null
  };
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
      error: "Method not allowed. Use POST."
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return respond(event, 400, {
      ok: false,
      error: "Invalid JSON body."
    });
  }

  const email = cleanEmail(body.email);
  const password = cleanString(body.password);

  const firstName = cleanString(body.first_name || body.firstName);
  const lastName = cleanString(body.last_name || body.lastName);
  const fullName = cleanString(
    body.full_name ||
    body.fullName ||
    [firstName, lastName].filter(Boolean).join(" ")
  );

  if (!fullName) {
    return respond(event, 400, {
      ok: false,
      error: "Full name is required."
    });
  }

  if (!email || !isValidEmail(email)) {
    return respond(event, 400, {
      ok: false,
      error: "Valid email is required."
    });
  }

  if (!password || password.length < 8) {
    return respond(event, 400, {
      ok: false,
      error: "Password must be at least 8 characters."
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
      }
    });
  }

  const { host: supabase_host, ref: supabase_project_ref } =
    getProjectRefFromUrl(SUPABASE_URL);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let authUserId = null;

  try {
    const { data: userData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,

        // This keeps compatibility with your custom code verification flow.
        // Supabase Auth user is created immediately, but app-level profile
        // remains pending until verify-code.js updates public.profiles.
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
          first_name: firstName || deriveFirstName(fullName),
          last_name: lastName || deriveLastName(fullName),
          source: "thewing.register.v1"
        }
      });

    if (authError || !userData?.user?.id) {
      const msg = authError?.message || "Auth registration failed.";
      const duplicate = /already|exists|registered|duplicate/i.test(msg);

      if (duplicate) {
        const found = await findAuthUserIdByEmail(supabase, email);

        return respond(event, 409, {
          ok: false,
          error: "A user with this email address has already been registered.",
          existing_user_id: found.id || null,
          supabase_project_ref,
          supabase_host,
          version: FUNCTION_VERSION
        });
      }

      return respond(event, 400, {
        ok: false,
        error: msg,
        supabase_project_ref,
        supabase_host,
        version: FUNCTION_VERSION
      });
    }

    authUserId = userData.user.id;

    const profilePayload = buildProfilePayload(body, authUserId);

    const { data: insertedProfile, error: profileError } = await supabase
      .from("profiles")
      .insert(profilePayload)
      .select("*")
      .single();

    if (profileError) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (rollbackError) {
        console.error("TheWing register rollback failed:", rollbackError);
      }

      const msg = profileError.message || "Profile save failed.";
      const status = /duplicate|unique/i.test(msg) ? 409 : 500;

      return respond(event, status, {
        ok: false,
        error: msg,
        details: msg,
        code: profileError.code || null,
        supabase_project_ref,
        supabase_host,
        version: FUNCTION_VERSION
      });
    }

    return respond(event, 200, {
      ok: true,
      message: "Registered successfully. Email verification is required.",
      version: FUNCTION_VERSION,
      user_id: authUserId,
      email,
      profile: publicProfile(insertedProfile),
      next: "verify-account",
      supabase_project_ref,
      supabase_host
    });
  } catch (error) {
    if (authUserId) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch (rollbackError) {
        console.error("TheWing register emergency rollback failed:", rollbackError);
      }
    }

    console.error("TheWing register error:", error);

    return respond(event, 500, {
      ok: false,
      error: error?.message || "Server error during registration.",
      version: FUNCTION_VERSION,
      supabase_project_ref,
      supabase_host
    });
  }
};
