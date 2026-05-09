// netlify/functions/brain.js
// ============================================================
// TheWing.ai • Central Brain
// v1.0.2 SAFE IMPORT VERSION
//
// PURPOSE
// - Fixes 502 Bad Gateway caused by top-level module import crashes
// - Uses dynamic imports inside the handler
// - Supports public BAH Calculator with NO email required
// - Returns readable JSON errors instead of Netlify 502 when a shared file fails
//
// REQUIRED FILES
// - netlify/functions/_share/official-pay.js
// - netlify/functions/_share/official-bah.js
//
// ROUTES
// - /.netlify/functions/brain
// - /api/brain through Netlify redirect
// ============================================================

// ============================================================
// //#1) CONFIG
// ============================================================

const APP_NAME = "TheWing.ai";
const SCHEMA_VERSION = "thewing-brain-1.0.2";

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
// //#3) BASIC HELPERS
// ============================================================

function normalizeString(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return normalizeString(value).toLowerCase();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  return Math.round(toNumber(value, 0) * 100) / 100;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function firstString(...values) {
  for (const value of values) {
    const s = normalizeString(value);
    if (s) return s;
  }
  return "";
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

  const m = raw.match(/^([EOW])\s*-?\s*(\d{1,2})(E)?$/);

  if (m) {
    return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;
  }

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

  if (typeof explicit === "boolean") {
    return explicit ? "with" : "without";
  }

  if (typeof explicit === "number") {
    return explicit >= 2 ? "with" : "without";
  }

  const s = lower(explicit);

  if (!s) return "with";

  if (
    [
      "with",
      "yes",
      "true",
      "1",
      "with_dependents",
      "with dependents",
      "dependent",
      "dependents"
    ].includes(s)
  ) {
    return "with";
  }

  if (
    [
      "without",
      "no",
      "false",
      "0",
      "without_dependents",
      "without dependents",
      "single",
      "none"
    ].includes(s)
  ) {
    return "without";
  }

  const maybeNumber = Number(s);

  if (Number.isFinite(maybeNumber)) {
    return maybeNumber >= 2 ? "with" : "without";
  }

  return s.includes("without") || s.includes("no") ? "without" : "with";
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

function formatMoney(value) {
  return "$" + money(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseBody(event) {
  if (!event?.body) return {};

  try {
    return JSON.parse(event.body);
  } catch (_) {
    throw new Error("Invalid JSON body.");
  }
}

// ============================================================
// //#4) DYNAMIC MODULE LOADER
// ============================================================

let SHARED_CACHE = null;

async function loadSharedModules() {
  if (SHARED_CACHE) return SHARED_CACHE;

  try {
    const officialPay = await import("./_share/official-pay.js");
    const officialBah = await import("./_share/official-bah.js");

    if (typeof officialPay.getPayRecord2026 !== "function") {
      throw new Error("official-pay.js is missing getPayRecord2026 export.");
    }

    if (typeof officialBah.getBahRecord !== "function") {
      throw new Error("official-bah.js is missing getBahRecord export.");
    }

    SHARED_CACHE = {
      officialPay,
      officialBah
    };

    return SHARED_CACHE;
  } catch (error) {
    throw new Error(
      `Shared module load failed: ${error?.message || String(error)}`
    );
  }
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

    tool: normalizeTool(firstDefined(body.tool, directInput.tool, "BRAIN")),
    source: firstDefined(body.source, directInput.source, "PCSUnited"),
    poweredBy: firstDefined(body.poweredBy, directInput.poweredBy, APP_NAME)
  };
}

function normalizeCompensationInput(input = {}) {
  const rank = normalizeRank(firstString(
    input.rank_paygrade,
    input.rankPaygrade,
    input.paygrade,
    input.rank,
    input.grade
  ));

  const yearsOfService = toNumber(firstDefined(
    input.yearsOfService,
    input.yos,
    input.years_of_service,
    input.serviceYears
  ), 0);

  const base = firstString(
    input.base,
    input.currentBase,
    input.current_base,
    input.duty_station,
    input.dutyStation,
    input.station,
    input.pcs_base,
    input.pcsBase,
    input.location
  );

  const dependents = normalizeDependents(firstDefined(
    input.dependents,
    input.dependentStatus,
    input.dependent_status,
    input.hasDependents,
    input.has_dependents,
    input.family,
    input.familySize,
    input.family_size
  ), input);

  const basType = firstString(
    input.basType,
    input.bas_type
  );

  return {
    mode: "ACTIVE_DUTY",
    rank,
    yearsOfService,
    yos: yearsOfService,
    base,
    dependents,
    hasDependents: dependents === "with",
    basType
  };
}

// ============================================================
// //#6) COMPENSATION CALCULATION
// ============================================================

async function calculateActiveDutyCompensation(input = {}) {
  const { officialPay, officialBah } = await loadSharedModules();

  const normalized = normalizeCompensationInput(input);

  if (!normalized.rank) {
    throw new Error("Missing rank/paygrade.");
  }

  if (!normalized.base) {
    throw new Error("Missing base/location.");
  }

  const payRecord = officialPay.getPayRecord2026(
    normalized.rank,
    normalized.yearsOfService,
    {
      basType: normalized.basType
    }
  );

  const bahRecord = officialBah.getBahRecord(
    normalized.base,
    normalized.rank,
    normalized.dependents
  );

  const basicPay = money(payRecord.basicPayMonthly);
  const bas = money(payRecord.basMonthly);
  const bah = money(bahRecord.bah);
  const grossMonthlyComp = money(basicPay + bas + bah);

  const rankTitle = getRankTitle(payRecord.rank);

  return {
    ok: true,

    profile: {
      mode: "ACTIVE_DUTY",
      rank: payRecord.rank,
      rankTitle,
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
        rankTitle,
        sourceModules: {
          officialPay: officialPay.RATE_VERSION || "official-pay",
          officialBah: officialBah.RATE_VERSION || "official-bah"
        }
      },
      sourceVersion: `${officialPay.RATE_VERSION || "official-pay"}+${officialBah.RATE_VERSION || "official-bah"}`
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

    sourceVersion: `${officialPay.RATE_VERSION || "official-pay"}+${officialBah.RATE_VERSION || "official-bah"}`,
    rateVersion: {
      officialPay: officialPay.RATE_VERSION || "official-pay",
      officialBah: officialBah.RATE_VERSION || "official-bah"
    }
  };
}

async function handlePublicCalculator(input = {}, meta = {}) {
  const result = await calculateActiveDutyCompensation(input);

  const displayBase =
    result?.bahRecord?.base ||
    result?.profile?.base ||
    input.base;

  const displayZip =
    result?.bahRecord?.dutyZip ||
    "";

  const displayMha =
    result?.bahRecord?.mhaName ||
    "";

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

// ============================================================
// //#7) NETLIFY HANDLER
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
      let moduleStatus = {
        ok: false,
        officialPay: "not_checked",
        officialBah: "not_checked"
      };

      try {
        const { officialPay, officialBah } = await loadSharedModules();

        moduleStatus = {
          ok: true,
          officialPay: officialPay.RATE_VERSION || "loaded",
          officialBah: officialBah.RATE_VERSION || "loaded"
        };
      } catch (error) {
        moduleStatus = {
          ok: false,
          error: error?.message || String(error),
          officialPay: "check_failed",
          officialBah: "check_failed"
        };
      }

      return respond(event, 200, {
        ok: true,
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        status: "online",
        role: "PCSUnited SaaS intelligence layer",
        route: "/api/brain",
        moduleStatus,
        supportedTools: [
          "BAH_CALCULATOR",
          "PCS_SNAPSHOT",
          "PUBLIC_COMPENSATION",
          "OPEN_COMPENSATION"
        ],
        example: {
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
        }
      });
    }

    if (event.httpMethod !== "POST") {
      return fail(event, 405, "Method not allowed.");
    }

    const body = parseBody(event);
    const input = extractInput(body);
    const tool = normalizeTool(firstDefined(body.tool, input.tool, "BAH_CALCULATOR"));

    const responsePayload = await handlePublicCalculator(input, {
      tool,
      source: firstString(body.source, input.source, "PCSUnited")
    });

    const finalPayload = {
      ok: true,
      app: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      tool,
      source: firstString(body.source, input.source, responsePayload.source, "PCSUnited"),
      poweredBy: APP_NAME,

      input: {
        rank: input.rank || input.rank_paygrade || input.paygrade || null,
        yos: input.yos || input.yearsOfService || null,
        base: input.base || input.location || null,
        dependents: input.dependents || null,
        mode: input.mode || "ACTIVE_DUTY"
      },

      ...responsePayload,

      meta: {
        app: APP_NAME,
        schemaVersion: SCHEMA_VERSION,
        tool,
        generatedAt: new Date().toISOString(),
        version: SCHEMA_VERSION
      }
    };

    return respond(event, 200, {
      ...finalPayload,
      data: finalPayload,
      payload: finalPayload
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
