// netlify/functions/brain.js
// ============================================================
// TheWing.ai • Central Brain
// v1.0.0
//
// FILE
// - netlify/functions/brain.js
//
// PURPOSE
// - Public API coordinator for TheWing.ai intelligence layer
// - Supports PCSUnited public calculator calls with NO email required
// - Supports future logged-in Financial Dashboard calls with Supabase profile
// - Uses deterministic official modules from netlify/functions/_share/
//
// CURRENT PUBLIC TOOL SUPPORT
// - BAH_CALCULATOR
// - PCS_SNAPSHOT basic compensation mode
// - FINANCIAL_DASHBOARD basic profile/override compensation mode
//
// ARCHITECTURE
// - API route files stay thin.
// - Official source files live in _share/.
// - Deterministic math happens in official/shared modules.
// - OpenAI is NOT used for calculations.
//
// EXPECTED MODULES
// - ./_share/official-pay.js
// - ./_share/official-bah.js
// - ./_share/official-va.js
// - ./_share/official-retirement.js optional
//
// ROUTES
// - /.netlify/functions/brain
// - /api/brain through netlify.toml redirect
// ============================================================

import { createClient } from "@supabase/supabase-js";

import {
  RATE_VERSION as OFFICIAL_PAY_RATE_VERSION,
  getPayRecord2026,
  normalizeRank as normalizeOfficialPayRank
} from "./_share/official-pay.js";

import {
  RATE_VERSION as OFFICIAL_BAH_RATE_VERSION,
  getBahRecord,
  canonicalizeBase
} from "./_share/official-bah.js";

import {
  RATE_VERSION as OFFICIAL_VA_RATE_VERSION,
  getVACompensation,
  safeGetVACompensation
} from "./_share/official-va.js";

// Retirement is optional for this first clean TheWing brain.
// If this import fails in your repo because official-retirement.js is not added yet,
// add that file first or temporarily comment out this import and the retirement block.
import {
  RATE_VERSION as OFFICIAL_RETIREMENT_RATE_VERSION,
  safeGetRetirementPay
} from "./_share/official-retirement.js";

// ============================================================
// //#1) CONFIG
// ============================================================

const APP_NAME = "TheWing.ai";
const SCHEMA_VERSION = "thewing-brain-1.0.0";

const ALLOWED_ORIGINS = new Set([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",
  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",
  "https://pcs-united.webflow.io",
  "https://pcsunited-com-28346d.webflow.io",
  "https://pcsu.webflow.io",
  "https://new-real-estate-purchase.webflow.io",
  "https://theorozcorealty.com",
  "https://www.theorozcorealty.com",
  "https://theorozcorealty.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8888",
  "http://127.0.0.1:8888"
]);

// ============================================================
// //#2) RESPONSE HELPERS
// ============================================================

function buildCorsHeaders(event) {
  const origin =
    event?.headers?.origin ||
    event?.headers?.Origin ||
    "";

  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function respond(event, statusCode, obj) {
  return {
    statusCode,
    headers: buildCorsHeaders(event),
    body: JSON.stringify(obj)
  };
}

function ok(event, data = {}, extra = {}) {
  return respond(event, 200, {
    ok: true,
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    ...extra,
    data
  });
}

function fail(event, statusCode, message, extra = {}) {
  return respond(event, statusCode, {
    ok: false,
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    error: String(message || "Request failed."),
    ...extra
  });
}

// ============================================================
// //#3) SMALL HELPERS
// ============================================================

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  return Math.round(toNumber(value, 0) * 100) / 100;
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return normalizeString(value).toLowerCase();
}

function firstString(...values) {
  for (const value of values) {
    const s = normalizeString(value);
    if (s) return s;
  }
  return "";
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;

  const s = lower(value);

  if (["true", "yes", "y", "1", "with", "dependent", "dependents", "with_dependents", "with dependents"].includes(s)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "single", "none", "without_dependents", "without dependents"].includes(s)) {
    return false;
  }

  return fallback;
}

function normalizeTool(value) {
  return normalizeString(value || "BRAIN")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function normalizeRank(rank) {
  const raw = normalizeString(rank).toUpperCase();
  if (!raw) return "";

  // Supports E5, E-5, e 5, O3E, O-3E, W2, W-2
  const m = raw.match(/^([EOW])\s*-?\s*(\d{1,2})(E)?$/);
  if (m) return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;

  return raw.replace(/\s+/g, "");
}

function normalizeDependents(value, input = {}) {
  const explicit = firstDefined(
    value,
    input.dependents,
    input.dependentStatus,
    input.dependent_status,
    input.family,
    input.familySize,
    input.family_size,
    input.hasDependents,
    input.has_dependents
  );

  if (typeof explicit === "number") {
    return explicit >= 2 ? "with" : "without";
  }

  const s = lower(explicit);

  if (!s) {
    const family = toInt(firstDefined(input.family, input.familySize, input.family_size), 1);
    return family >= 2 ? "with" : "without";
  }

  if (["with", "yes", "true", "1", "with_dependents", "with dependents", "dependent", "dependents"].includes(s)) {
    return "with";
  }

  if (["without", "no", "false", "0", "without_dependents", "without dependents", "single", "none"].includes(s)) {
    return "without";
  }

  const maybeNumber = Number(s);
  if (Number.isFinite(maybeNumber)) {
    return maybeNumber >= 2 ? "with" : "without";
  }

  return s.includes("without") || s.includes("no") ? "without" : "with";
}

function normalizeMode(input = {}) {
  const raw = lower(firstDefined(
    input.mode,
    input.status,
    input.member_status,
    input.memberStatus,
    input.service_status,
    input.serviceStatus
  ));

  if (["vet", "veteran", "retired", "retiree", "separated", "civilian"].includes(raw)) {
    return "VETERAN";
  }

  return "ACTIVE_DUTY";
}

function getRankTitle(rank) {
  const map = {
    "E-1": "Airman Basic",
    "E-2": "Airman",
    "E-3": "Airman First Class",
    "E-4": "Senior Airman",
    "E-5": "Staff Sergeant",
    "E-6": "Technical Sergeant",
    "E-7": "Master Sergeant",
    "E-8": "Senior Master Sergeant",
    "E-9": "Chief Master Sergeant",

    "W-1": "Warrant Officer 1",
    "W-2": "Chief Warrant Officer 2",
    "W-3": "Chief Warrant Officer 3",
    "W-4": "Chief Warrant Officer 4",
    "W-5": "Chief Warrant Officer 5",

    "O-1": "Second Lieutenant",
    "O-2": "First Lieutenant",
    "O-3": "Captain",
    "O-4": "Major",
    "O-5": "Lieutenant Colonel",
    "O-6": "Colonel",
    "O-7": "Brigadier General",
    "O-8": "Major General",

    "O-1E": "Second Lieutenant prior enlisted",
    "O-2E": "First Lieutenant prior enlisted",
    "O-3E": "Captain prior enlisted"
  };

  return map[rank] || rank;
}

function removeUndefined(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) out[key] = value;
  }

  return out;
}

// ============================================================
// //#4) SUPABASE OPTIONAL PROFILE MODE
// ============================================================

function hasSupabaseEnv() {
  return !!(
    process.env.SUPABASE_URL &&
    (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY
    )
  );
}

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

async function fetchProfileByEmail(email) {
  if (!email) return null;

  const sb = getSupabase();

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Supabase profile fetch failed.");
  }

  return data || null;
}

// ============================================================
// //#5) INPUT NORMALIZATION
// ============================================================

function extractInput(body = {}) {
  const directInput =
    body.input && typeof body.input === "object"
      ? body.input
      : {};

  const overrides =
    body.overrides && typeof body.overrides === "object"
      ? body.overrides
      : {};

  return {
    ...directInput,
    ...overrides,

    // top-level fallback keys
    email: firstDefined(body.email, directInput.email, overrides.email),
    tool: normalizeTool(firstDefined(body.tool, directInput.tool, "BRAIN")),
    source: firstDefined(body.source, directInput.source, "Unknown"),
    poweredBy: firstDefined(body.poweredBy, directInput.poweredBy, APP_NAME)
  };
}

function mergeProfileAndInput(profile = {}, input = {}) {
  return {
    ...(profile || {}),
    ...(input || {})
  };
}

function normalizeCompensationInput(effective = {}) {
  const rank = normalizeRank(firstString(
    effective.rank_paygrade,
    effective.rankPaygrade,
    effective.paygrade,
    effective.rank,
    effective.grade
  ));

  const yearsOfService = toNumber(firstDefined(
    effective.yearsOfService,
    effective.yos,
    effective.years_of_service,
    effective.serviceYears
  ), 0);

  const base = firstString(
    effective.base,
    effective.currentBase,
    effective.current_base,
    effective.duty_station,
    effective.dutyStation,
    effective.station,
    effective.pcs_base,
    effective.pcsBase,
    effective.location
  );

  const dependents = normalizeDependents(firstDefined(
    effective.dependents,
    effective.dependentStatus,
    effective.dependent_status,
    effective.hasDependents,
    effective.has_dependents,
    effective.family,
    effective.familySize,
    effective.family_size
  ), effective);

  const hasDependents = dependents === "with";

  const basType = firstString(
    effective.basType,
    effective.bas_type
  );

  const mode = normalizeMode(effective);

  return {
    mode,
    rank,
    yearsOfService,
    yos: yearsOfService,
    base,
    dependents,
    hasDependents,
    basType
  };
}

// ============================================================
// //#6) DETERMINISTIC COMPENSATION ENGINE
// ============================================================

function calculateActiveDutyCompensation(input = {}) {
  const normalized = normalizeCompensationInput(input);

  if (!normalized.rank) {
    throw new Error("Missing rank/paygrade.");
  }

  if (!normalized.base) {
    throw new Error("Missing base/location.");
  }

  const payRecord = getPayRecord2026(
    normalized.rank,
    normalized.yearsOfService,
    {
      basType: normalized.basType
    }
  );

  const bahRecord = getBahRecord(
    normalized.base,
    normalized.rank,
    normalized.dependents
  );

  const basicPay = money(payRecord.basicPayMonthly);
  const bas = money(payRecord.basMonthly);
  const bah = money(bahRecord.bah);

  const grossMonthlyComp = money(basicPay + bas + bah);

  return {
    ok: true,

    profile: {
      mode: normalized.mode,
      rank: payRecord.rank,
      rankTitle: getRankTitle(payRecord.rank),
      yearsOfService: payRecord.yearsOfService,
      yos: payRecord.yearsOfService,
      base: bahRecord.base,
      currentBase: bahRecord.base,
      canonicalBase: bahRecord.canonicalBase || bahRecord.base,
      dependents: normalized.dependents,
      hasDependents: normalized.hasDependents
    },

    compensation: {
      ok: true,
      payModel: "active",
      payAccuracy: "deterministic_official_modules",
      monthly: {
        basicPay,
        basePay: basicPay,
        bas,
        bah,
        grossMonthlyComp,
        combinedMonthlyGross: grossMonthlyComp,
        totalMilitaryIncome: grossMonthlyComp,
        totalMonthly: grossMonthlyComp
      },
      detail: {
        payRecord,
        bahRecord,
        rankTitle: getRankTitle(payRecord.rank),
        sourceModules: {
          officialPay: OFFICIAL_PAY_RATE_VERSION,
          officialBah: OFFICIAL_BAH_RATE_VERSION
        }
      },
      sourceVersion: `${OFFICIAL_PAY_RATE_VERSION}+${OFFICIAL_BAH_RATE_VERSION}`
    },

    pay: {
      ok: true,
      payModel: "active",
      payAccuracy: "deterministic_official_modules",
      basePay: basicPay,
      basicPay,
      bas,
      bah,
      totalPay: grossMonthlyComp,
      total: grossMonthlyComp,
      rankUsed: payRecord.rank,
      yosUsed: payRecord.yearsOfService,
      familyUsed: normalized.hasDependents,
      zipUsed: bahRecord.dutyZip || null,
      zipSource: "official-bah.js",
      detail: {
        payRecord,
        bahRecord
      }
    },

    monthly: {
      basicPay,
      basePay: basicPay,
      bas,
      bah,
      grossMonthlyComp,
      combinedMonthlyGross: grossMonthlyComp,
      totalMilitaryIncome: grossMonthlyComp,
      totalMonthly: grossMonthlyComp
    },

    bahRecord,
    payRecord,

    sourceVersion: `${OFFICIAL_PAY_RATE_VERSION}+${OFFICIAL_BAH_RATE_VERSION}`,
    rateVersion: {
      officialPay: OFFICIAL_PAY_RATE_VERSION,
      officialBah: OFFICIAL_BAH_RATE_VERSION
    }
  };
}

function buildVaInput(effective = {}) {
  const ratingRaw = firstDefined(
    effective.vaRating,
    effective.va_rating,
    effective.vaDisability,
    effective.va_disability,
    effective.rating
  );

  const rating = toInt(ratingRaw, 0);

  const familySize = toInt(firstDefined(
    effective.family,
    effective.familySize,
    effective.family_size
  ), 1);

  const spouse = normalizeBoolean(firstDefined(
    effective.spouse,
    effective.hasSpouse,
    effective.has_spouse
  ), familySize >= 2);

  const childrenUnder18 = toInt(firstDefined(
    effective.childrenUnder18,
    effective.children_under_18,
    effective.kidsUnder18,
    effective.kids_under_18
  ), Math.max(familySize - (spouse ? 2 : 1), 0));

  const childrenInSchoolOver18 = toInt(firstDefined(
    effective.childrenInSchoolOver18,
    effective.children_in_school_over_18,
    effective.childrenOver18School,
    effective.children_over_18_school
  ), 0);

  const dependentParents = toInt(firstDefined(
    effective.dependentParents,
    effective.dependent_parents
  ), 0);

  return {
    rating,
    spouse,
    dependentParents,
    childrenUnder18,
    childrenInSchoolOver18
  };
}

function calculateVeteranCompensation(input = {}) {
  const normalized = normalizeCompensationInput(input);
  const vaInput = buildVaInput(input);
  const vaResult = vaInput.rating > 0
    ? safeGetVACompensation(vaInput)
    : {
        ok: true,
        rating: 0,
        monthlyVA: 0,
        baseMonthlyVA: 0,
        rateVersion: OFFICIAL_VA_RATE_VERSION
      };

  const retirementSystem = firstString(
    input.retirementSystem,
    input.retirement_system,
    input.retirement,
    "HIGH3"
  ).toUpperCase();

  const monthlyBasicPayAtRetirement = toNumber(firstDefined(
    input.monthlyBasicPayAtRetirement,
    input.monthly_basic_pay_at_retirement,
    input.retireBasePay,
    input.retire_base_pay
  ), 0);

  const yearsOfService = toNumber(firstDefined(
    input.yearsOfService,
    input.yos,
    input.years_of_service
  ), 0);

  let retirementResult = {
    ok: true,
    grossMonthlyRetiredPay: 0,
    rateVersion: OFFICIAL_RETIREMENT_RATE_VERSION,
    note: "Retirement estimate not calculated because monthlyBasicPayAtRetirement was not provided."
  };

  if (monthlyBasicPayAtRetirement > 0 && yearsOfService >= 20) {
    retirementResult = safeGetRetirementPay({
      retirementSystem,
      yearsOfService,
      monthlyBasicPayAtRetirement
    });
  }

  const vaMonthly = money(vaResult?.monthlyVA || 0);
  const retirementMonthly = money(retirementResult?.grossMonthlyRetiredPay || 0);
  const grossMonthlyComp = money(vaMonthly + retirementMonthly);

  return {
    ok: true,

    profile: {
      mode: "VETERAN",
      rank: normalized.rank || null,
      rankTitle: normalized.rank ? getRankTitle(normalized.rank) : null,
      yearsOfService,
      yos: yearsOfService,
      base: normalized.base || null,
      dependents: normalized.dependents,
      hasDependents: normalized.hasDependents
    },

    compensation: {
      ok: true,
      payModel: "veteran",
      payAccuracy: "deterministic_va_retirement_basic",
      monthly: {
        basicPay: 0,
        basePay: 0,
        bas: 0,
        bah: 0,
        vaDisability: vaMonthly,
        retirementPay: retirementMonthly,
        grossMonthlyComp,
        combinedMonthlyGross: grossMonthlyComp,
        totalMilitaryIncome: grossMonthlyComp,
        totalMonthly: grossMonthlyComp
      },
      detail: {
        vaRecord: vaResult,
        retirementRecord: retirementResult,
        sourceModules: {
          officialVa: OFFICIAL_VA_RATE_VERSION,
          officialRetirement: OFFICIAL_RETIREMENT_RATE_VERSION
        }
      },
      sourceVersion: `${OFFICIAL_VA_RATE_VERSION}+${OFFICIAL_RETIREMENT_RATE_VERSION}`
    },

    pay: {
      ok: grossMonthlyComp > 0,
      payModel: "veteran",
      payAccuracy: "deterministic_va_retirement_basic",
      basePay: 0,
      basicPay: 0,
      bas: 0,
      bah: 0,
      vaDisabilityPay: vaMonthly,
      retirementPay: retirementMonthly,
      totalPay: grossMonthlyComp,
      total: grossMonthlyComp,
      rankUsed: normalized.rank || null,
      yosUsed: yearsOfService,
      familyUsed: normalized.hasDependents,
      detail: {
        vaRecord: vaResult,
        retirementRecord: retirementResult
      }
    },

    monthly: {
      basicPay: 0,
      basePay: 0,
      bas: 0,
      bah: 0,
      vaDisability: vaMonthly,
      retirementPay: retirementMonthly,
      grossMonthlyComp,
      combinedMonthlyGross: grossMonthlyComp,
      totalMilitaryIncome: grossMonthlyComp,
      totalMonthly: grossMonthlyComp
    },

    vaRecord: vaResult,
    retirementRecord: retirementResult,

    sourceVersion: `${OFFICIAL_VA_RATE_VERSION}+${OFFICIAL_RETIREMENT_RATE_VERSION}`,
    rateVersion: {
      officialVa: OFFICIAL_VA_RATE_VERSION,
      officialRetirement: OFFICIAL_RETIREMENT_RATE_VERSION
    }
  };
}

function calculateCompensation(input = {}) {
  const normalized = normalizeCompensationInput(input);

  if (normalized.mode === "VETERAN") {
    return calculateVeteranCompensation(input);
  }

  return calculateActiveDutyCompensation(input);
}

// ============================================================
// //#7) TOOL HANDLERS
// ============================================================

function handlePublicCalculator(input = {}, meta = {}) {
  const result = calculateActiveDutyCompensation(input);

  const displayBase = result?.bahRecord?.base || result?.profile?.base || input.base;
  const displayZip = result?.bahRecord?.dutyZip || "";
  const displayMha = result?.bahRecord?.mhaName || "";

  return {
    ...result,

    tool: meta.tool || "BAH_CALCULATOR",
    source: meta.source || "PCSUnited",
    poweredBy: APP_NAME,

    bluf: `${result.profile.rank} at ${result.profile.yearsOfService} years of service receives an estimated ${formatMoney(result.monthly.grossMonthlyComp)} monthly total from Basic Pay, BAH, and BAS for ${displayBase}.`,

    summary: {
      label: "Total Monthly Military Pay",
      totalMonthly: result.monthly.grossMonthlyComp,
      basicPay: result.monthly.basicPay,
      bas: result.monthly.bas,
      bah: result.monthly.bah,
      base: displayBase,
      dutyZip: displayZip,
      mhaName: displayMha,
      dependents: result.profile.dependents,
      rank: result.profile.rank,
      rankTitle: result.profile.rankTitle,
      yearsOfService: result.profile.yearsOfService
    },

    insights: [
      `${result.profile.rankTitle} at ${result.profile.yearsOfService} years of service is estimated at ${formatMoney(result.monthly.basicPay)} in monthly basic pay.`,
      `Projected BAH for ${displayBase}${displayZip ? ` (${displayZip})` : ""} is ${formatMoney(result.monthly.bah)} ${result.profile.dependents === "with" ? "with dependents." : "without dependents."}`,
      `Estimated monthly military compensation is ${formatMoney(result.monthly.grossMonthlyComp)}, including BAS of ${formatMoney(result.monthly.bas)}.`
    ]
  };
}

function handleDashboardBasic(input = {}, profile = null) {
  const effective = mergeProfileAndInput(profile || {}, input || {});
  const result = calculateCompensation(effective);

  return {
    ...result,
    tool: "FINANCIAL_DASHBOARD",
    source: "TheWing.ai",
    poweredBy: APP_NAME,
    profileRaw: profile || null,
    profileEffective: effective,
    dashboard: {
      ready: true,
      currentScope: "compensation_only",
      nextModules: [
        "mortgage-engine.js",
        "affordability-engine.js",
        "decision-brief.js",
        "ask-amy.js"
      ]
    }
  };
}

function formatMoney(value) {
  return "$" + money(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ============================================================
// //#8) REQUEST BODY PARSING
// ============================================================

function parseBody(event) {
  if (!event?.body) return {};

  try {
    return JSON.parse(event.body);
  } catch (_) {
    throw new Error("Invalid JSON body.");
  }
}

// ============================================================
// //#9) NETLIFY HANDLER
// ============================================================

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: buildCorsHeaders(event),
        body: ""
      };
    }

    if (event.httpMethod === "GET") {
      return respond(event, 200, {
        ok: true,
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        status: "online",
        role: "PCSUnited SaaS intelligence layer",
        routes: {
          brain: "/api/brain"
        },
        supportedTools: [
          "BAH_CALCULATOR",
          "PCS_SNAPSHOT",
          "FINANCIAL_DASHBOARD"
        ],
        examples: {
          publicBahCalculator: {
            method: "POST",
            body: {
              tool: "BAH_CALCULATOR",
              input: {
                rank: "E-5",
                yos: 8,
                base: "Lackland AFB",
                dependents: "with"
              }
            }
          },
          dashboardProfileMode: {
            method: "POST",
            body: {
              tool: "FINANCIAL_DASHBOARD",
              email: "user@example.com",
              overrides: {
                rank: "E-5",
                yos: 8,
                base: "Lackland AFB",
                dependents: "with"
              }
            }
          }
        },
        versions: {
          officialPay: OFFICIAL_PAY_RATE_VERSION,
          officialBah: OFFICIAL_BAH_RATE_VERSION,
          officialVa: OFFICIAL_VA_RATE_VERSION,
          officialRetirement: OFFICIAL_RETIREMENT_RATE_VERSION
        }
      });
    }

    if (event.httpMethod !== "POST") {
      return fail(event, 405, "Method not allowed.");
    }

    const body = parseBody(event);
    const input = extractInput(body);
    const tool = normalizeTool(firstDefined(body.tool, input.tool, "BRAIN"));

    const email = lower(firstDefined(body.email, input.email));
    const wantsProfile =
      !!email &&
      [
        "FINANCIAL_DASHBOARD",
        "DASHBOARD",
        "PROFILE",
        "ASK_AMY",
        "DECISION_BRIEF"
      ].includes(tool);

    let profile = null;
    let profileSource = "none";

    if (wantsProfile) {
      if (!hasSupabaseEnv()) {
        return fail(event, 500, "Supabase environment variables are missing for profile mode.", {
          tool,
          email
        });
      }

      profile = await fetchProfileByEmail(email);
      profileSource = profile ? "supabase.profiles" : "not_found";

      if (!profile) {
        return fail(event, 404, "Profile not found for this email.", {
          tool,
          email
        });
      }
    }

    let data = null;

    if (["BAH_CALCULATOR", "PCS_SNAPSHOT", "PUBLIC_COMPENSATION", "OPEN_COMPENSATION"].includes(tool)) {
      data = handlePublicCalculator(input, {
        tool,
        source: firstString(body.source, input.source, "PCSUnited")
      });
    } else if (["FINANCIAL_DASHBOARD", "DASHBOARD", "BRAIN"].includes(tool)) {
      data = handleDashboardBasic(input, profile);
    } else {
      // Default fallback: calculate compensation from provided input.
      data = handleDashboardBasic(input, profile);
    }

    const responsePayload = {
      ok: true,
      app: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      tool,
      source: firstString(body.source, input.source, data.source, "Unknown"),
      poweredBy: APP_NAME,

      profileSource,
      email: email || null,

      input: removeUndefined({
        rank: input.rank || input.rank_paygrade || input.paygrade,
        yos: input.yos || input.yearsOfService,
        base: input.base || input.location,
        dependents: input.dependents,
        mode: input.mode
      }),

      ...data,

      meta: {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        tool,
        generatedAt: new Date().toISOString(),
        versions: {
          officialPay: OFFICIAL_PAY_RATE_VERSION,
          officialBah: OFFICIAL_BAH_RATE_VERSION,
          officialVa: OFFICIAL_VA_RATE_VERSION,
          officialRetirement: OFFICIAL_RETIREMENT_RATE_VERSION
        }
      }
    };

    // Return both top-level fields and data/payload wrappers for compatibility
    // with older PCSUnited widgets and newer TheWing consumers.
    return respond(event, 200, {
      ...responsePayload,
      data: responsePayload,
      payload: responsePayload
    });
  } catch (error) {
    return fail(event, 500, error?.message || "TheWing brain failed.", {
      meta: {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString()
      }
    });
  }
}

export default {
  handler
};
