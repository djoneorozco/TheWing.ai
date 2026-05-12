// netlify/functions/member-base-demo.js
// ============================================================
// TheWing.ai • Member Base Demographic API
// v1.0.0
//
// PURPOSE
// - Member-only Base Demographic data source
// - Reads Supabase profile data by email
// - Merges profile + financial inputs + intake data
// - Returns clean member profile, compensation, housing profile
//
// ENDPOINT
// - POST /.netlify/functions/member-base-demo
// - POST /api/member-base-demo
//
// ENV REQUIRED
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// ============================================================

"use strict";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanString(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function num(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeRank(value) {
  const raw = cleanString(value).toUpperCase();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "").replace("–", "-").replace("—", "-");

  if (/^[EOW]-\d{1,2}$/.test(compact)) return compact;

  if (/^[EOW]\d{1,2}$/.test(compact)) {
    return compact.charAt(0) + "-" + compact.slice(1);
  }

  return compact;
}

function cleanZip(value) {
  const match = String(value || "").match(/\b\d{5}\b/);
  return match ? match[0] : "";
}

function resolveFamilySize(profile) {
  const direct = num(
    firstDefined(
      profile.family_size,
      profile.familySize,
      profile.household_size,
      profile.householdSize,
      profile.dependents_count,
      profile.dependentsCount,
      profile.family
    ),
    0
  );

  if (direct > 0) return Math.round(direct);

  const dependents = cleanString(profile.dependents).toLowerCase();

  if (
    dependents.includes("spouse") &&
    (dependents.includes("2 children") || dependents.includes("2 child"))
  ) {
    return 4;
  }

  if (
    dependents === "yes" ||
    dependents === "true" ||
    dependents === "with" ||
    dependents === "with dependents" ||
    dependents === "with_dependents"
  ) {
    return 2;
  }

  return 1;
}

function resolveRecommendedRooms(profile) {
  return Math.max(1, resolveFamilySize(profile) - 1);
}

async function supabaseSelect(table, email) {
  const url =
    `${SUPABASE_URL}/rest/v1/${table}` +
    `?email=eq.${encodeURIComponent(email)}` +
    `&select=*` +
    `&limit=1`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) return null;

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function fetchCityJson(cityJsonUrl) {
  if (!cityJsonUrl) return null;

  try {
    const res = await fetch(cityJsonUrl, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) return null;

    return await res.json();
  } catch (_error) {
    return null;
  }
}

function extractZipFromCityJson(cityJson) {
  return cleanZip(
    firstDefined(
      cityJson?.zip,
      cityJson?.base_profile?.zip,
      cityJson?.base?.zip,
      cityJson?.market?.zip
    )
  );
}

function mergeProfile(records) {
  const merged = {
    ...(records.profile || {}),
    ...(records.financial || {}),
    ...(records.intake || {}),
    ...(records.aiou || {})
  };

  const rank = normalizeRank(
    firstDefined(
      merged.rank_paygrade,
      merged.rankPaygrade,
      merged.rank,
      merged.paygrade
    )
  );

  const yos = num(
    firstDefined(
      merged.yos,
      merged.years_of_service,
      merged.yearsOfService
    ),
    0
  );

  const fullName = firstDefined(
    merged.full_name,
    merged.fullName,
    [merged.first_name, merged.last_name].filter(Boolean).join(" ")
  );

  return {
    ...merged,
    email: cleanEmail(merged.email),
    full_name: fullName || "Member",
    first_name: merged.first_name || merged.firstName || "",
    last_name: merged.last_name || merged.lastName || "",
    rank,
    rank_paygrade: rank,
    yos,
    family_size: resolveFamilySize(merged),
    recommended_rooms: resolveRecommendedRooms(merged),
    base: firstDefined(
      merged.base,
      merged.current_base,
      merged.selected_base,
      merged.gaining_base
    ),
    projected_home_price: num(
      firstDefined(
        merged.projected_home_price,
        merged.home_purchase_price,
        merged.purchase_price,
        merged.target_price
      ),
      0
    )
  };
}

function extractStoredComp(profile) {
  const basePay = num(
    firstDefined(
      profile.base_pay,
      profile.basePay,
      profile.basic_pay,
      profile.basicPay
    ),
    0
  );

  const bas = num(
    firstDefined(
      profile.bas,
      profile.BAS,
      profile.bas_monthly,
      profile.basMonthly
    ),
    0
  );

  const bah = num(
    firstDefined(
      profile.bah,
      profile.BAH,
      profile.monthly_bah,
      profile.bah_monthly,
      profile.bahMonthly
    ),
    0
  );

  const totalMonthly = num(
    firstDefined(
      profile.total_monthly_income,
      profile.totalMonthlyIncome,
      profile.monthly_income,
      profile.income,
      profile.total_monthly_pay,
      profile.totalPay
    ),
    basePay + bas + bah
  );

  return {
    base_pay: basePay,
    bas,
    bah,
    total_monthly: totalMonthly || basePay + bas + bah
  };
}

async function trySharedPayEngine(input) {
  try {
    const payEngine = require("./_share/pay-engine.js");

    const candidates = [
      payEngine.calculateMilitaryPay,
      payEngine.calculatePay,
      payEngine.getMonthlyCompensation,
      payEngine.buildCompensation,
      payEngine.computePay,
      payEngine.default
    ].filter((fn) => typeof fn === "function");

    for (const fn of candidates) {
      try {
        const result = await fn(input);

        if (!result || typeof result !== "object") continue;

        const monthly =
          result.monthly ||
          result.compensation?.monthly ||
          result.compensation ||
          result.pay ||
          result;

        const basePay = num(
          firstDefined(monthly.basePay, monthly.base_pay, monthly.basicPay, monthly.basic_pay),
          0
        );

        const bas = num(firstDefined(monthly.bas, monthly.BAS), 0);
        const bah = num(firstDefined(monthly.bah, monthly.BAH), 0);

        const total = num(
          firstDefined(
            monthly.total,
            monthly.totalMonthly,
            monthly.total_monthly,
            monthly.grossMonthlyComp,
            monthly.combinedMonthlyGross
          ),
          basePay + bas + bah
        );

        if (basePay || bas || bah || total) {
          return {
            base_pay: basePay,
            bas,
            bah,
            total_monthly: total || basePay + bas + bah
          };
        }
      } catch (_innerError) {}
    }

    return null;
  } catch (_error) {
    return null;
  }
}

async function buildCompensation(profile, cityJson, body) {
  const zip = cleanZip(
    firstDefined(
      body.zip,
      body.bahZip,
      body.bah_zip,
      extractZipFromCityJson(cityJson),
      profile.zip,
      profile.current_zip,
      profile.bah_zip,
      profile.base_zip
    )
  );

  const input = {
    email: profile.email,
    mode: firstDefined(profile.mode, "ACTIVE_DUTY"),
    rank: profile.rank,
    rank_paygrade: profile.rank_paygrade,
    yos: profile.yos,
    family: profile.family_size,
    dependents: profile.family_size > 1 ? "yes" : "no",
    has_dependents: profile.family_size > 1,
    base: firstDefined(body.selected_base, profile.base, cityJson?.name),
    current_base: firstDefined(body.selected_base, profile.base, cityJson?.name),
    zip,
    bahZip: zip,
    bah_zip: zip,
    source: "member-base-demo"
  };

  const engineComp = await trySharedPayEngine(input);
  const storedComp = extractStoredComp(profile);

  return {
    base_pay: engineComp?.base_pay || storedComp.base_pay || 0,
    bas: engineComp?.bas || storedComp.bas || 0,
    bah: engineComp?.bah || storedComp.bah || 0,
    total_monthly:
      engineComp?.total_monthly ||
      storedComp.total_monthly ||
      0,
    source: engineComp ? "thewing-pay-engine" : "supabase-stored-fields"
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, {
      ok: false,
      error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (_error) {
    return json(400, {
      ok: false,
      error: "Invalid JSON body."
    });
  }

  const email = cleanEmail(body.email);

  if (!email) {
    return json(400, {
      ok: false,
      error: "Missing required email."
    });
  }

  try {
    const [profile, financial, intake, aiou] = await Promise.all([
      supabaseSelect("profiles", email),
      supabaseSelect("user_financial_inputs", email),
      supabaseSelect("financial_intakes", email),
      supabaseSelect("user_aiou_inputs", email)
    ]);

    if (!profile && !financial && !intake && !aiou) {
      return json(404, {
        ok: false,
        error: "No Supabase member profile found for this email."
      });
    }

    const mergedProfile = mergeProfile({
      profile,
      financial,
      intake,
      aiou
    });

    mergedProfile.email = email;

    const cityJson = await fetchCityJson(body.cityJsonUrl || body.city_json_url);

    const compensation = await buildCompensation(mergedProfile, cityJson, body);

    const housing = {
      target_price: mergedProfile.projected_home_price || 0,
      family_size: resolveFamilySize(mergedProfile),
      recommended_rooms: resolveRecommendedRooms(mergedProfile)
    };

    return json(200, {
      ok: true,
      source: "supabase",
      profile: mergedProfile,
      compensation,
      housing,
      selected_base: {
        name: firstDefined(body.selected_base, mergedProfile.base, cityJson?.name),
        zip: extractZipFromCityJson(cityJson),
        city_json_loaded: !!cityJson
      }
    });
  } catch (error) {
    console.error("member-base-demo error:", error);

    return json(500, {
      ok: false,
      error: "Member base demographic data could not be loaded.",
      detail: error.message
    });
  }
};
