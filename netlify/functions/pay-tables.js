// netlify/functions/pay-tables.js
// ============================================================
// TheWing.ai • PCSUnited Pay Tables Endpoint
// v1.0.0
//
// PURPOSE
// - Compatibility endpoint for existing PCSUnited dashboard widgets
// - Reads local netlify/functions/data/militaryPayTables.json
// - Supports CORS / OPTIONS preflight from Webflow
// - Calculates Base Pay, BAS, BAH, VA Disability, and Total Monthly
//
// ENDPOINTS
// - GET  /api/pay-tables
// - POST /api/pay-tables
// - GET  /.netlify/functions/pay-tables
// - POST /.netlify/functions/pay-tables
//
// EXPECTED JSON LOCATION
// - netlify/functions/data/militaryPayTables.json
//
// POST BODY EXAMPLE
// {
//   "rank": "E-7",
//   "yos": 20,
//   "base": "Nellis",
//   "family": true,
//   "va_disability": 70
// }
//
// GET QUERY EXAMPLE
// /api/pay-tables?rank=E-7&yos=20&base=Nellis&family=true&va_disability=70
// ============================================================

/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");

// ============================================================
// #1) CONFIG
// ============================================================

const VERSION = "1.0.0";

const TABLE_PATH = path.join(
  __dirname,
  "data",
  "militaryPayTables.json"
);

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

let TABLE_CACHE = null;

// ============================================================
// #2) NETLIFY HANDLER
// ============================================================

exports.handler = async function handler(event) {
  const origin = getHeader(event, "origin");

  if (event.httpMethod === "OPTIONS") {
    return respond(200, { ok: true, version: VERSION }, origin);
  }

  if (!["GET", "POST"].includes(event.httpMethod)) {
    return respond(
      405,
      {
        ok: false,
        error: "Method not allowed. Use GET, POST, or OPTIONS.",
        version: VERSION
      },
      origin
    );
  }

  try {
    const tables = loadTables();

    const input =
      event.httpMethod === "POST"
        ? normalizeInput(safeJsonParse(event.body))
        : normalizeInput(event.queryStringParameters || {});

    const hasLookupInput =
      Boolean(input.rank) ||
      Boolean(input.yos !== null && input.yos !== undefined) ||
      Boolean(input.base) ||
      Boolean(input.zip) ||
      Boolean(input.va_disability !== null && input.va_disability !== undefined);

    // GET /api/pay-tables with no lookup params should still return 200.
    // This prevents Webflow widgets from failing when they ping the endpoint.
    if (!hasLookupInput) {
      return respond(
        200,
        {
          ok: true,
          version: VERSION,
          tableVersion: tables.version || null,
          updated: tables.updated || null,
          source: tables.source || null,
          message:
            "Pay tables endpoint is live. Send rank, yos, base/zip, family, and optional va_disability to calculate compensation.",
          available: {
            basepay: Boolean(tables.BASEPAY),
            bas: Boolean(tables.BAS),
            bah: Boolean(tables.BAH && tables.BAH.by_zip),
            disability: Boolean(tables.DISABILITY || tables.DISABILITY_FULL),
            retirement: Boolean(tables.RETIREMENT)
          },
          counts: {
            basepayRanks: Object.keys(tables.BASEPAY || {}).length,
            bahZips: Object.keys(tables.BAH?.by_zip || {}).length,
            baseAliases: Object.keys(tables.BAH?.base_to_zip || {}).length
          }
        },
        origin
      );
    }

    const result = calculateCompensation(tables, input);

    return respond(
      200,
      {
        ok: true,
        version: VERSION,
        tableVersion: tables.version || null,
        updated: tables.updated || null,
        input,
        ...result
      },
      origin
    );
  } catch (err) {
    console.error("pay-tables error:", err);

    return respond(
      500,
      {
        ok: false,
        error: "Unable to calculate pay tables.",
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
// #3) CORE CALCULATION
// ============================================================

function calculateCompensation(tables, input) {
  const rank = normalizeRank(input.rank || input.rank_paygrade || input.paygrade);
  const yos = normalizeYos(input.yos);
  const family = boolish(input.family ?? input.withDependents ?? input.dependents, false);

  const mode = normalizeMode(input.mode || input.military_status || "active");
  const zip = resolveZip(tables, input);
  const bahType = family ? "with" : "without";

  const basePay = getBasePay(tables, rank, yos);
  const bas = getBas(tables, rank, mode);
  const bahInfo = getBah(tables, {
    rank,
    zip,
    base: input.base,
    bahType
  });

  const vaDisability = getVaDisability(tables, input);

  const specialPay = toNumber(
    input.specialPayMonthly ??
      input.special_pay_monthly ??
      input.specialPay ??
      input.special_pay,
    0
  );

  const spouseIncome = toNumber(
    input.spouseIncomeMonthly ??
      input.spouse_income_monthly ??
      input.spouseIncome ??
      input.spouse_income,
    0
  );

  const additionalIncome = toNumber(
    input.additionalIncomeMonthly ??
      input.additional_monthly_income ??
      input.additionalIncome ??
      input.additional_income ??
      input.otherIncome ??
      input.other_income,
    0
  );

  const total =
    basePay.amount +
    bas.amount +
    bahInfo.amount +
    vaDisability.amount +
    specialPay +
    spouseIncome +
    additionalIncome;

  return stripEmpty({
    rank,
    rankTitle: rankTitle(rank),
    yos,
    mode,
    family,
    dependents: bahType,

    base: bahInfo.base || input.base || null,
    zip: zip || bahInfo.zip || null,
    resolvedZip: zip || bahInfo.zip || null,
    mha: bahInfo.mha || null,
    location: bahInfo.location || null,

    basePay: round2(basePay.amount),
    base_pay: round2(basePay.amount),
    basicPay: round2(basePay.amount),

    bas: round2(bas.amount),
    BAS: round2(bas.amount),

    bah: round2(bahInfo.amount),
    BAH: round2(bahInfo.amount),

    vaDisability: round2(vaDisability.amount),
    va_disability_pay: round2(vaDisability.amount),

    specialPay: round2(specialPay),
    spouseIncome: round2(spouseIncome),
    additionalIncome: round2(additionalIncome),

    total: round2(total),
    totalMonthly: round2(total),
    total_monthly: round2(total),

    annual: round2(total * 12),
    annualTotal: round2(total * 12),

    breakdown: {
      basePay: round2(basePay.amount),
      bas: round2(bas.amount),
      bah: round2(bahInfo.amount),
      vaDisability: round2(vaDisability.amount),
      specialPay: round2(specialPay),
      spouseIncome: round2(spouseIncome),
      additionalIncome: round2(additionalIncome)
    },

    sources: {
      basePay: basePay.source,
      bas: bas.source,
      bah: bahInfo.source,
      vaDisability: vaDisability.source
    },

    warnings: [
      ...basePay.warnings,
      ...bas.warnings,
      ...bahInfo.warnings,
      ...vaDisability.warnings
    ]
  });
}

// ============================================================
// #4) TABLE READERS
// ============================================================

function loadTables() {
  if (TABLE_CACHE) return TABLE_CACHE;

  if (!fs.existsSync(TABLE_PATH)) {
    throw new Error(
      `militaryPayTables.json not found at ${TABLE_PATH}. Place it at netlify/functions/data/militaryPayTables.json`
    );
  }

  const raw = fs.readFileSync(TABLE_PATH, "utf8");
  TABLE_CACHE = JSON.parse(raw);

  return TABLE_CACHE;
}

function getBasePay(tables, rank, yos) {
  const warnings = [];

  if (!rank) {
    return {
      amount: 0,
      source: "BASEPAY",
      warnings: ["Missing rank/paygrade for base pay."]
    };
  }

  const rankTable = tables.BASEPAY?.[rank];

  if (!rankTable) {
    return {
      amount: 0,
      source: "BASEPAY",
      warnings: [`No BASEPAY table found for ${rank}.`]
    };
  }

  const key = resolveYosKey(rankTable, yos);
  const amount = toNumber(rankTable[key], 0);

  if (!amount) {
    warnings.push(`No base pay amount found for ${rank} at YOS ${yos}.`);
  }

  return {
    amount,
    source: `BASEPAY.${rank}.${key}`,
    warnings
  };
}

function getBas(tables, rank, mode) {
  const warnings = [];

  if (mode === "veteran" || mode === "retired") {
    return {
      amount: 0,
      source: "BAS not applied for veteran/retired mode",
      warnings: []
    };
  }

  const isOfficer = /^O-\d+/i.test(rank || "");
  const basKey = isOfficer ? "officer" : "enlisted";
  const amount = toNumber(tables.BAS?.[basKey], 0);

  if (!amount) {
    warnings.push(`No BAS amount found for ${basKey}.`);
  }

  return {
    amount,
    source: `BAS.${basKey}`,
    warnings
  };
}

function getBah(tables, { rank, zip, base, bahType }) {
  const warnings = [];

  const resolvedZip = String(zip || "").trim();
  const record = resolvedZip ? tables.BAH?.by_zip?.[resolvedZip] : null;

  if (!resolvedZip) {
    return {
      amount: 0,
      zip: "",
      base: base || "",
      mha: "",
      location: "",
      source: "BAH missing ZIP/base",
      warnings: ["Missing base or ZIP for BAH."]
    };
  }

  if (!record) {
    return {
      amount: 0,
      zip: resolvedZip,
      base: base || "",
      mha: "",
      location: "",
      source: `BAH.by_zip.${resolvedZip}`,
      warnings: [`No BAH record found for ZIP ${resolvedZip}.`]
    };
  }

  const bucket = bahType === "with" ? "with" : "without";
  const amount = toNumber(record?.[bucket]?.[rank], 0);

  if (!amount) {
    warnings.push(`No BAH amount found for ${rank} in ZIP ${resolvedZip} (${bucket} dependents).`);
  }

  return {
    amount,
    zip: resolvedZip,
    base: record.base || base || "",
    mha: record.mha || "",
    location: record.location || "",
    source: `BAH.by_zip.${resolvedZip}.${bucket}.${rank}`,
    warnings
  };
}

function getVaDisability(tables, input) {
  const warnings = [];

  const rawRating =
    input.va_disability ??
    input.vaDisability ??
    input.va_rating ??
    input.vaRating ??
    input.disability ??
    input.disabilityRating;

  const rating = normalizeVaRating(rawRating);

  if (!rating) {
    return {
      amount: 0,
      source: "VA disability not provided",
      warnings: []
    };
  }

  const spouse = boolish(input.spouse ?? input.married ?? input.hasSpouse, false);
  const childrenUnder18 = Math.max(
    0,
    Math.round(
      toNumber(
        input.childrenUnder18 ??
          input.children_under_18 ??
          input.children ??
          input.dependent_children,
        0
      )
    )
  );

  const childrenOver18School = Math.max(
    0,
    Math.round(
      toNumber(
        input.childrenInSchoolOver18 ??
          input.children_over_18_school ??
          input.childrenOver18School ??
          input.schoolChildren,
        0
      )
    )
  );

  const full = tables.DISABILITY_FULL?.[String(rating)];

  if (full) {
    let key = "veteran";

    if (spouse && childrenUnder18 > 0) {
      key = "veteran_spouse_one_child";
    } else if (spouse) {
      key = "veteran_spouse";
    } else if (childrenUnder18 > 0) {
      key = "veteran_one_child";
    }

    let amount = toNumber(full[key], 0);

    if (childrenUnder18 > 1) {
      amount += (childrenUnder18 - 1) * toNumber(full.additional_child_under_18, 0);
    }

    if (childrenOver18School > 0) {
      amount += childrenOver18School * toNumber(full.additional_child_over_18_in_school, 0);
    }

    return {
      amount,
      source: `DISABILITY_FULL.${rating}.${key}`,
      warnings
    };
  }

  const simple = toNumber(tables.DISABILITY?.[String(rating)], 0);

  if (!simple) {
    warnings.push(`No VA disability rate found for ${rating}%.`);
  }

  return {
    amount: simple,
    source: `DISABILITY.${rating}`,
    warnings
  };
}

// ============================================================
// #5) INPUT NORMALIZATION
// ============================================================

function normalizeInput(raw) {
  const input = raw && typeof raw === "object" ? raw : {};

  return stripEmpty({
    rank: normalizeRank(
      input.rank ||
        input.rank_paygrade ||
        input.rankPaygrade ||
        input.paygrade
    ),
    yos: normalizeYos(
      input.yos ||
        input.yearsOfService ||
        input.years_of_service ||
        input.years
    ),
    base: clean(
      input.base ||
        input.pcsBase ||
        input.pcs_base ||
        input.baseName ||
        input.base_name ||
        input.installation ||
        input.duty_station ||
        input.dutyStation
    ),
    zip: clean(
      input.zip ||
        input.bahZip ||
        input.bah_zip ||
        input.baseZip ||
        input.base_zip ||
        input.dutyZip ||
        input.duty_zip
    ),
    family: input.family ?? input.withDependents ?? input.with_dependents ?? input.dependents,
    mode: normalizeMode(input.mode || input.status || input.military_status || input.user_type),

    va_disability:
      input.va_disability ??
      input.vaDisability ??
      input.va_rating ??
      input.vaRating ??
      input.disability ??
      input.disabilityRating,

    spouse: input.spouse ?? input.married ?? input.hasSpouse,
    childrenUnder18:
      input.childrenUnder18 ??
      input.children_under_18 ??
      input.children ??
      input.dependent_children,
    childrenInSchoolOver18:
      input.childrenInSchoolOver18 ??
      input.children_over_18_school ??
      input.childrenOver18School ??
      input.schoolChildren,

    specialPayMonthly:
      input.specialPayMonthly ??
      input.special_pay_monthly ??
      input.specialPay ??
      input.special_pay,
    spouseIncomeMonthly:
      input.spouseIncomeMonthly ??
      input.spouse_income_monthly ??
      input.spouseIncome ??
      input.spouse_income,
    additionalIncomeMonthly:
      input.additionalIncomeMonthly ??
      input.additional_monthly_income ??
      input.additionalIncome ??
      input.additional_income ??
      input.otherIncome ??
      input.other_income
  });
}

function normalizeRank(value) {
  const raw = clean(value).toUpperCase().replace(/\s+/g, "");

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
    COL: "O-6"
  };

  return rankMap[raw] || raw;
}

function normalizeYos(value) {
  const n = toNumber(value, 0);

  if (!Number.isFinite(n) || n < 0) return 0;

  return Math.floor(n);
}

function normalizeMode(value) {
  const s = clean(value).toLowerCase();

  if (["veteran", "vet"].includes(s)) return "veteran";
  if (["retired", "retiree"].includes(s)) return "retired";
  if (["reserve", "guard", "reservist"].includes(s)) return "reserve";
  if (["active", "active_duty", "active duty", "ad", ""].includes(s)) return "active";

  return s;
}

function normalizeVaRating(value) {
  const n = toNumber(value, 0);

  if (!n || n <= 0) return 0;

  const rounded = Math.round(n / 10) * 10;

  return Math.max(0, Math.min(100, rounded));
}

function resolveZip(tables, input) {
  const directZip = clean(input.zip || input.bahZip || input.baseZip);

  if (directZip) return directZip;

  const base = clean(input.base);

  if (!base) return "";

  const map = tables.BAH?.base_to_zip || {};

  if (map[base]) return String(map[base]);

  const normalizedBase = normalizeBaseKey(base);

  for (const [key, zip] of Object.entries(map)) {
    if (normalizeBaseKey(key) === normalizedBase) {
      return String(zip);
    }
  }

  return "";
}

function normalizeBaseKey(value) {
  return clean(value)
    .toLowerCase()
    .replace(/air force base/g, "afb")
    .replace(/a\.f\.b\./g, "afb")
    .replace(/[^a-z0-9]/g, "");
}

function resolveYosKey(rankTable, yos) {
  const years = Object.keys(rankTable)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (!years.length) return "0";

  let selected = years[0];

  for (const year of years) {
    if (year <= yos) selected = year;
  }

  return String(selected);
}

function rankTitle(rank) {
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
    "O-1": "Second Lieutenant",
    "O-2": "First Lieutenant",
    "O-3": "Captain",
    "O-4": "Major",
    "O-5": "Lieutenant Colonel",
    "O-6": "Colonel",
    "O-7": "Brigadier General"
  };

  return map[rank] || rank || "";
}

// ============================================================
// #6) GENERAL HELPERS
// ============================================================

function corsHeaders(origin) {
  const cleanOrigin = clean(origin);
  const allowOrigin = ALLOW_ORIGINS.includes(cleanOrigin) ? cleanOrigin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function safeJsonParse(raw) {
  try {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const n = Number(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolish(value, fallback = false) {
  if (value === true || value === false) return value;

  const s = clean(value).toLowerCase();

  if (["true", "yes", "y", "1", "with", "dependent", "dependents", "with dependents", "family", "married"].includes(s)) {
    return true;
  }

  if (["false", "no", "n", "0", "without", "single", "none", "without dependents"].includes(s)) {
    return false;
  }

  if (typeof value === "number") return value > 0;

  return fallback;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
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
