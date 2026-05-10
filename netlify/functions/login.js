// netlify/functions/login.js
// ============================================================
// TheWing.ai • PCSUnited Login
// v1.1.0
//
// PURPOSE:
// - POST { email, password }
// - Authenticates with Supabase Auth using email/password
// - Returns a MERGED dashboard-ready profile object from:
//    1) public.profiles
//    2) public.user_financial_inputs   latest by updated_at
//    3) public.financial_intakes       latest/first matching fallback
//    4) public.user_aiou_inputs        latest by updated_at
// - Supports PCSUnited / TheWing / Webflow CORS
// - Blocks login if profile is still pending verification
// - Updates last_login_at when available
// - Preserves dashboard aliases expected by PCSUnited modules
//
// FRONTEND ENDPOINTS:
// - POST /api/login
// - POST /.netlify/functions/login
//
// REQUIRED ENV:
// - SUPABASE_URL
//   or SUPABASE_PROJECT_URL
// - SUPABASE_SERVICE_ROLE_KEY
//   or SUPABASE_SERVICE_KEY
//
// OPTIONAL ENV:
// - SUPABASE_ANON_KEY
// - PUBLIC_SUPABASE_ANON_KEY
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// NOTE:
// - If anon key is missing, auth falls back to service key so older
//   PCSUnited / TheWing deployments do not break.
// ============================================================

"use strict";

const { createClient } = require("@supabase/supabase-js");

const FUNCTION_VERSION = "thewing-login-1.1.0";

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
    : "https://pcsunited.com";

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
function firstRow(data) {
  return Array.isArray(data) && data.length ? data[0] : null;
}

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
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toBoolOrNull(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return null;
}

function pickFirstString(...values) {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const n = toNumberOrNull(value);
    if (n !== null) return n;
  }
  return null;
}

function normalizeRank(value) {
  const raw = cleanString(value).toUpperCase();
  if (!raw) return "";

  // E7 -> E-7, O5 -> O-5, W2 -> W-2
  if (/^[EOW]\d{1,2}$/.test(raw)) {
    return raw.replace(/^([EOW])(\d{1,2})$/, "$1-$2");
  }

  // E-7, O-5, W-2
  if (/^[EOW]-\d{1,2}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function normalizeMode(value) {
  const raw = cleanString(value).toLowerCase();

  if (["ad", "active", "active_duty", "active duty"].includes(raw)) return "ad";
  if (["vet", "veteran", "retired"].includes(raw)) return "vet";

  return raw;
}

function normalizeStatus(value) {
  return cleanString(value).toLowerCase();
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

function getAnonKey() {
  return cleanString(
    process.env.SUPABASE_ANON_KEY ||
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

function getAuthKey() {
  const anon = getAnonKey();
  const service = getServiceKey();
  return anon || service || "";
}

// ------------------------------------------------------------
// #5) CLIENT FACTORIES
// ------------------------------------------------------------
function makeAdminClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function makeAuthClient(url, authKey) {
  return createClient(url, authKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

// ------------------------------------------------------------
// #6) PROFILE MERGE
// ------------------------------------------------------------
function mergeProfile({
  profileRow,
  userFinancialRow,
  financialIntakeRow,
  aiouRow,
  authUser
}) {
  const p = profileRow || {};
  const uf = userFinancialRow || {};
  const fi = financialIntakeRow || {};
  const ai = aiouRow || {};

  const merged = {
    ...p
  };

  const email = safeLower(
    p.email ||
    uf.email ||
    fi.email ||
    ai.email ||
    authUser?.email ||
    ""
  );

  const firstName = pickFirstString(
    p.first_name,
    p.firstName
  );

  const lastName = pickFirstString(
    p.last_name,
    p.lastName
  );

  const fullName = pickFirstString(
    p.full_name,
    p.fullName,
    p.name,
    [firstName, lastName].filter(Boolean).join(" ")
  );

  const rawRank = pickFirstString(
    p.rank,
    p.rank_paygrade,
    p.rankPaygrade,
    fi.rank,
    fi.rank_paygrade,
    uf.rank,
    uf.rank_paygrade
  );

  const rawRankPaygrade = pickFirstString(
    p.rank_paygrade,
    p.rankPaygrade,
    p.rank,
    fi.rank_paygrade,
    fi.rank,
    uf.rank_paygrade,
    uf.rank
  );

  const rank = normalizeRank(rawRank);
  const rankPaygrade = normalizeRank(rawRankPaygrade || rank);

  const monthlyExpenses = pickFirstNumber(
    uf.monthly_expenses,
    uf.monthlyExpenses,
    uf.expenses,
    fi.expenses,
    fi.monthly_expenses,
    p.monthly_expenses,
    p.monthlyExpenses,
    p.expenses
  );

  const projectedHomePrice = pickFirstNumber(
    uf.projected_home_price,
    uf.projectedHomePrice,
    uf.home_price,
    uf.price,
    fi.price,
    fi.projected_home_price,
    p.projected_home_price,
    p.projectedHomePrice,
    p.homePrice,
    p.price
  );

  const downpayment = pickFirstNumber(
    uf.downpayment,
    uf.downPayment,
    uf.down_payment,
    fi.downpayment,
    fi.downPayment,
    fi.down_payment,
    p.downpayment,
    p.downPayment,
    p.down_payment
  );

  const creditScore = pickFirstNumber(
    uf.credit_score,
    uf.creditScore,
    fi.credit_score,
    fi.creditScore,
    p.credit_score,
    p.creditScore
  );

  const income = pickFirstNumber(
    uf.income,
    uf.monthly_income,
    uf.monthlyIncome,
    uf.total_monthly_income,
    uf.totalMonthlyIncome,
    fi.income,
    fi.monthly_income,
    fi.monthlyIncome,
    p.income,
    p.monthly_income,
    p.monthlyIncome,
    p.total_monthly_income,
    p.totalMonthlyIncome,
    p.pay_total,
    p.total_pay
  );

  const debt = pickFirstNumber(
    uf.debt,
    uf.monthly_debt,
    uf.monthlyDebt,
    uf.debt_monthly,
    uf.non_housing_debt,
    uf.nonHousingDebt,
    fi.debt,
    fi.monthly_debt,
    fi.monthlyDebt,
    p.debt,
    p.monthly_debt,
    p.monthlyDebt,
    p.debt_monthly,
    p.non_housing_debt,
    p.nonHousingDebt
  );

  const family = pickFirstNumber(
    p.family,
    fi.family,
    uf.family
  );

  const yos = pickFirstNumber(
    p.yos,
    fi.yos,
    uf.yos
  );

  const vaDisability = pickFirstNumber(
    p.va_disability,
    p.vaDisability,
    fi.va_disability,
    fi.vaDisability,
    uf.va_disability,
    uf.vaDisability
  );

  const bedrooms = pickFirstNumber(
    ai.bedrooms,
    p.bedrooms
  );

  const bathrooms = pickFirstNumber(
    ai.bathrooms,
    p.bathrooms
  );

  const sqft = pickFirstNumber(
    ai.sqft,
    p.sqft
  );

  const propertyType = pickFirstString(
    ai.property_type,
    ai.propertyType,
    p.property_type,
    p.propertyType
  );

  const amenities = pickFirstString(
    ai.amenities,
    p.amenities
  );

  const homeCondition = pickFirstString(
    ai.home_year,
    ai.home_condition,
    ai.homeCondition,
    p.home_condition,
    p.homeCondition
  );

  const timeToBuy = pickFirstString(
    uf.purchase_time,
    uf.time_to_buy,
    fi.purchase_time,
    fi.time_to_buy,
    p.time_to_buy,
    p.purchase_time
  );

  const status = pickFirstString(
    p.status,
    "active"
  );

  const emailVerified =
    p.email_verified === true ||
    p.emailVerified === true ||
    normalizeStatus(p.status) === "active";

  const base = pickFirstString(
    p.base,
    p.pcs_base,
    p.pcsBase,
    fi.base,
    uf.base
  );

  const mode = normalizeMode(
    p.mode ||
    fi.mode ||
    uf.mode
  );

  merged.id = p.id || null;
  merged.profiles_user_id_unique = p.profiles_user_id_unique || authUser?.id || null;
  merged.auth_user_id = authUser?.id || p.profiles_user_id_unique || null;

  merged.email = email;
  merged.first_name = firstName;
  merged.firstName = firstName;
  merged.last_name = lastName;
  merged.lastName = lastName;
  merged.full_name = fullName;
  merged.fullName = fullName;
  merged.name = fullName;

  merged.phone = pickFirstString(p.phone, fi.phone, uf.phone);
  merged.mode = mode;

  merged.rank = rank || rankPaygrade;
  merged.rank_paygrade = rankPaygrade || rank;
  merged.rankPaygrade = rankPaygrade || rank;
  merged.rank_title = pickFirstString(p.rank_title, p.rankTitle);
  merged.rankTitle = merged.rank_title;

  merged.base = base;
  merged.pcs_base = base;
  merged.pcsBase = base;

  merged.family = family;
  merged.yos = yos;

  merged.va_disability = vaDisability;
  merged.vaDisability = vaDisability;

  merged.retired = toBoolOrNull(p.retired);
  merged.retire_system = pickFirstString(p.retire_system, p.retireSystem);
  merged.retireSystem = merged.retire_system;

  merged.monthly_expenses = monthlyExpenses;
  merged.monthlyExpenses = monthlyExpenses;
  merged.expenses = monthlyExpenses;

  merged.projected_home_price = projectedHomePrice;
  merged.projectedHomePrice = projectedHomePrice;
  merged.homePrice = projectedHomePrice;
  merged.price = projectedHomePrice;
  merged.housing = projectedHomePrice;

  merged.downpayment = downpayment;
  merged.downPayment = downpayment;
  merged.dpAmt = downpayment;
  merged.savings = downpayment;

  merged.credit_score = creditScore;
  merged.creditScore = creditScore;

  merged.time_to_buy = timeToBuy;
  merged.timeToBuy = timeToBuy;
  merged.purchase_time = timeToBuy;
  merged.purchaseTime = timeToBuy;

  merged.bedrooms = bedrooms;
  merged.bathrooms = bathrooms;
  merged.sqft = sqft;

  merged.property_type = propertyType;
  merged.propertyType = propertyType;

  merged.amenities = amenities;

  merged.home_condition = homeCondition;
  merged.homeCondition = homeCondition;
  merged.home_year = homeCondition;
  merged.homeYear = homeCondition;

  merged.income = income;
  merged.monthly_income = income;
  merged.monthlyIncome = income;
  merged.total_monthly_income = income;
  merged.totalMonthlyIncome = income;

  merged.debt = debt;
  merged.monthly_debt = debt;
  merged.monthlyDebt = debt;
  merged.debt_monthly = debt;
  merged.debtPayments = debt;
  merged.non_housing_debt = debt;
  merged.nonHousingDebt = debt;

  merged.status = status;
  merged.email_verified = emailVerified;
  merged.emailVerified = emailVerified;
  merged.email_verified_at = p.email_verified_at || p.emailVerifiedAt || null;
  merged.emailVerifiedAt = merged.email_verified_at;

  merged.last_login_at = p.last_login_at || p.lastLoginAt || null;
  merged.updated_at = p.updated_at || p.updatedAt || null;
  merged.source = pickFirstString(p.source, "thewing.login.v1.1.0");

  merged._merge_source = "thewing.login.v1.1.0";
  merged._merged_at = new Date().toISOString();

  return merged;
}

// ------------------------------------------------------------
// #7) PROFILE FETCH
// ------------------------------------------------------------
async function fetchMergedProfileByEmail(admin, email, authUser) {
  const [
    profileRes,
    userFinancialRes,
    financialIntakeRes,
    aiouRes
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
      .limit(1),

    admin
      .from("user_aiou_inputs")
      .select("*")
      .eq("email", email)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (userFinancialRes.error) throw new Error(userFinancialRes.error.message);
  if (financialIntakeRes.error) throw new Error(financialIntakeRes.error.message);
  if (aiouRes.error) throw new Error(aiouRes.error.message);

  const profileRow = profileRes.data || null;
  const userFinancialRow = firstRow(userFinancialRes.data);
  const financialIntakeRow = firstRow(financialIntakeRes.data);
  const aiouRow = firstRow(aiouRes.data);

  if (!profileRow) {
    return {
      mergedProfile: null,
      debug: {
        has_profile: false,
        has_user_financial_inputs: !!userFinancialRow,
        has_financial_intakes: !!financialIntakeRow,
        has_user_aiou_inputs: !!aiouRow
      }
    };
  }

  return {
    mergedProfile: mergeProfile({
      profileRow,
      userFinancialRow,
      financialIntakeRow,
      aiouRow,
      authUser
    }),
    debug: {
      has_profile: !!profileRow,
      has_user_financial_inputs: !!userFinancialRow,
      has_financial_intakes: !!financialIntakeRow,
      has_user_aiou_inputs: !!aiouRow
    }
  };
}

// ------------------------------------------------------------
// #8) LAST LOGIN UPDATE
// ------------------------------------------------------------
async function updateLastLogin(admin, email) {
  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from("profiles")
    .update({
      last_login_at: nowIso,
      updated_at: nowIso
    })
    .eq("email", email);

  if (error) {
    console.warn("TheWing login last_login_at update warning:", error.message || error);
  }

  return nowIso;
}

// ------------------------------------------------------------
// #9) VERIFICATION GATE
// ------------------------------------------------------------
function isProfilePendingVerification(profile) {
  if (!profile || typeof profile !== "object") return true;

  const status = normalizeStatus(profile.status);
  const verified = profile.email_verified === true || profile.emailVerified === true;

  if (status === "pending_verification") return true;
  if (status === "pending") return true;
  if (status === "unverified") return true;

  // If status is active, allow even if older rows do not have email_verified populated.
  if (status === "active") return false;

  // If no status exists, use email_verified.
  if (!status && verified) return false;

  // New flow expects email_verified=true or status=active.
  if (!verified) return true;

  return false;
}

// ------------------------------------------------------------
// #10) MAIN HANDLER
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

  const email = safeLower(body.email || "");
  const password = cleanString(body.password || "");

  if (!email || !isValidEmail(email)) {
    return respond(event, 400, {
      ok: false,
      error: "Valid email is required.",
      version: FUNCTION_VERSION
    });
  }

  if (!password) {
    return respond(event, 400, {
      ok: false,
      error: "Password is required.",
      version: FUNCTION_VERSION
    });
  }

  const SUPABASE_URL = getSupabaseUrl();
  const SERVICE_KEY = getServiceKey();
  const AUTH_KEY = getAuthKey();

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

  if (!AUTH_KEY) {
    return respond(event, 500, {
      ok: false,
      error: "Missing Supabase auth key.",
      missing: {
        SUPABASE_ANON_KEY_or_SERVICE_KEY: true
      },
      version: FUNCTION_VERSION
    });
  }

  try {
    const admin = makeAdminClient(SUPABASE_URL, SERVICE_KEY);
    const authClient = makeAuthClient(SUPABASE_URL, AUTH_KEY);

    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email,
        password
      });

    if (authError || !authData?.user) {
      return respond(event, 401, {
        ok: false,
        error: "Invalid email or password.",
        details: authError?.message || null,
        version: FUNCTION_VERSION
      });
    }

    const authUser = authData.user;
    const session = authData.session || null;

    const { mergedProfile, debug } = await fetchMergedProfileByEmail(
      admin,
      email,
      authUser
    );

    if (!mergedProfile) {
      return respond(event, 404, {
        ok: false,
        error: "Account exists, but no PCSUnited profile was found.",
        email,
        user: {
          id: authUser.id,
          email: authUser.email || email
        },
        needs_profile: true,
        debug: {
          ...debug,
          auth_user_found: !!authUser,
          used_auth_key: getAnonKey() ? "anon" : "service_fallback"
        },
        version: FUNCTION_VERSION
      });
    }

    if (isProfilePendingVerification(mergedProfile)) {
      return respond(event, 403, {
        ok: false,
        error: "Please verify your email before logging in.",
        needs_verification: true,
        email,
        user: {
          id: authUser.id,
          email: authUser.email || email
        },
        profile: mergedProfile,
        debug: {
          ...debug,
          auth_user_found: !!authUser,
          used_auth_key: getAnonKey() ? "anon" : "service_fallback",
          status: mergedProfile.status || null,
          email_verified: mergedProfile.email_verified === true
        },
        version: FUNCTION_VERSION
      });
    }

    const lastLoginAt = await updateLastLogin(admin, email);
    mergedProfile.last_login_at = lastLoginAt;
    mergedProfile.lastLoginAt = lastLoginAt;

    return respond(event, 200, {
      ok: true,
      message: "Login successful.",
      email,
      user: {
        id: authUser.id,
        email: authUser.email || email,
        created_at: authUser.created_at || null,
        last_sign_in_at: authUser.last_sign_in_at || null
      },
      profile: mergedProfile,
      session: {
        access_token: session?.access_token || "",
        refresh_token: session?.refresh_token || "",
        expires_at: session?.expires_at || null,
        expires_in: session?.expires_in || null,
        token_type: session?.token_type || "bearer"
      },
      debug: {
        ...debug,
        auth_user_found: !!authUser,
        used_auth_key: getAnonKey() ? "anon" : "service_fallback",
        income_found: mergedProfile.income != null,
        debt_found: mergedProfile.debt != null,
        monthly_expenses_found: mergedProfile.monthly_expenses != null,
        projected_home_price_found: mergedProfile.projected_home_price != null,
        aiou_found: !!debug.has_user_aiou_inputs
      },
      version: FUNCTION_VERSION
    });
  } catch (error) {
    console.error("TheWing login error:", error);

    return respond(event, 500, {
      ok: false,
      error: error?.message || "Server error during login.",
      version: FUNCTION_VERSION
    });
  }
};
