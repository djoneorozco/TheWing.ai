// netlify/functions/opensource-brain.js
// ============================================================
// TheWing.ai • Open Source Brain
// v1.0.0
//
// PURPOSE
// - Public calculator endpoint for PCSUnited tools
// - NO email required
// - NO Supabase required
// - Uses TheWing official source modules
// - Designed for BAH Calculator, PCS Snapshot, and public comp tools
//
// REQUIRED FILES
// - netlify/functions/_share/official-pay.js
// - netlify/functions/_share/official-bah.js
//
// ROUTES
// - /.netlify/functions/opensource-brain
// - /api/opensource-brain through netlify.toml redirect
// ============================================================

import {
  RATE_VERSION as OFFICIAL_PAY_RATE_VERSION,
  getPayRecord2026
} from "./_share/official-pay.js";

import {
  RATE_VERSION as OFFICIAL_BAH_RATE_VERSION,
  getBahRecord
} from "./_share/official-bah.js";

// ============================================================
// //#1) CONFIG
// ============================================================

const BRAIN_VERSION = "thewing-open-brain-1.0.0";
const APP_NAME = "TheWing.ai";
const ALLOW_ORIGIN = "*";

// ============================================================
// //#2) RESPONSE HELPERS
// ============================================================

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

// ============================================================
// //#3) SMALL HELPERS
// ============================================================

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeUpper(value) {
  return normalizeString(value).toUpperCase();
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function money(value) {
  return round2(value);
}

function inferToolName(toolName) {
  const s = normalizeUpper(toolName || "GENERIC");

  return [
    "BAH_CALCULATOR",
    "PCS_SNAPSHOT",
    "FAD",
    "ASK_ELENA",
    "AIOU",
    "GENERIC",
    "PUBLIC_COMPENSATION",
    "OPEN_COMPENSATION"
  ].includes(s)
    ? s
    : "GENERIC";
}

function normalizeRank(rank) {
  const raw = normalizeUpper(rank);

  if (!raw) return "E-5";

  const m = raw.match(/^([EOW])\s*-?\s*(\d{1,2})(E)?$/);

  if (m) {
    return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;
  }

  return raw.replace(/\s+/g, "");
}

function normalizeDependents(value, input = {}) {
  const raw =
    value ??
    input.dependents ??
    input.dependentStatus ??
    input.dependent_status ??
    input.hasDependents ??
    input.has_dependents ??
    input.family ??
    input.familySize ??
    input.family_size ??
    "with";

  if (typeof raw === "boolean") {
    return raw ? "with" : "without";
  }

  if (typeof raw === "number") {
    return raw >= 2 ? "with" : "without";
  }

  const s = normalizeString(raw).toLowerCase();

  if (!s) return "with";

  if (
    [
      "with",
      "yes",
      "true",
      "1",
      "dependent",
      "dependents",
      "with dependents",
      "with_dependents"
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
      "single",
      "none",
      "without dependents",
      "without_dependents"
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

function normalizeBase(value) {
  const raw = normalizeString(value);

  if (!raw) return "";

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  const aliasMap = {
    jbsalackland: "Lackland AFB",
    lackland: "Lackland AFB",
    lacklandafb: "Lackland AFB",

    jbsarandolph: "Randolph AFB",
    randolph: "Randolph AFB",
    randolphafb: "Randolph AFB",

    jbsafortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhouston: "Fort-Sam-Houston AFB",
    fortsamhoustonafb: "Fort-Sam-Houston AFB",

    davismonthan: "Davis-Monthan AFB",
    davismonthanafb: "Davis-Monthan AFB",
    dmafb: "Davis-Monthan AFB",

    fewarren: "F.E-Warren AFB",
    fewarrenafb: "F.E-Warren AFB",
    fewarrenairforcebase: "F.E-Warren AFB",
    francisewarren: "F.E-Warren AFB",

    littlerock: "Little-Rock AFB",
    littlerockafb: "Little-Rock AFB",

    mountainhome: "Mountain-Home AFB",
    mountainhomeafb: "Mountain-Home AFB",

    seymourjohnson: "Seymour-Johnson AFB",
    seymourjohnsonafb: "Seymour-Johnson AFB",

    wrightpatterson: "Wright-Patterson AFB",
    wrightpattersonafb: "Wright-Patterson AFB",
    wpafb: "Wright-Patterson AFB"
  };

  return aliasMap[compact] || raw;
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

function sourceVersions() {
  return {
    brainVersion: BRAIN_VERSION,
    app: APP_NAME,
    payVersion: OFFICIAL_PAY_RATE_VERSION || null,
    bahVersion: OFFICIAL_BAH_RATE_VERSION || null
  };
}

// ============================================================
// //#4) PROFILE NORMALIZATION
// ============================================================

function buildCanonicalProfile(input = {}) {
  const rank = normalizeRank(
    input.rank ||
    input.rank_paygrade ||
    input.rankPaygrade ||
    input.paygrade ||
    input.grade ||
    "E-5"
  );

  const yearsOfService = toFiniteNumber(
    input.yos ??
    input.yearsOfService ??
    input.years_of_service ??
    input.serviceYears ??
    0,
    0
  );

  const currentBase = normalizeBase(
    input.base ||
    input.currentBase ||
    input.current_base ||
    input.location ||
    input.duty_station ||
    input.dutyStation ||
    input.station ||
    input.pcs_base ||
    input.pcsBase ||
    ""
  );

  const dependents = normalizeDependents(
    input.dependents ??
    input.dependentStatus ??
    input.dependent_status ??
    input.hasDependents ??
    input.has_dependents ??
    input.family ??
    input.familySize ??
    input.family_size,
    input
  );

  return {
    mode: "ACTIVE_DUTY",
    rank,
    rankTitle: rankTitle(rank),
    yearsOfService,
    yos: yearsOfService,
    currentBase,
    base: currentBase,
    dependents,
    hasDependents: dependents === "with",

    additionalIncome: toFiniteNumber(input.additionalIncome ?? input.additional_income, 0),
    monthlyExpenses: toFiniteNumber(input.monthlyExpenses ?? input.monthly_expenses ?? input.expenses, 0),
    monthlyDebt: toFiniteNumber(input.monthlyDebt ?? input.monthly_debt ?? input.debt, 0),
    downpayment: toFiniteNumber(input.downpayment ?? input.downPayment ?? input.down_payment, 0),
    projectedHomePrice: toFiniteNumber(input.projectedHomePrice ?? input.projected_home_price ?? input.price, 0),
    creditScore: toFiniteNumber(input.creditScore ?? input.credit_score, 0)
  };
}

// ============================================================
// //#5) COMPENSATION ENGINE
// ============================================================

function getCompensationProfile(profile) {
  const payRecord = getPayRecord2026(profile.rank, profile.yearsOfService, {
    basType: profile.basType || ""
  });

  const bahRecord = getBahRecord(
    profile.currentBase,
    profile.rank,
    profile.dependents
  );

  const basicPay = money(payRecord.basicPayMonthly);
  const bas = money(payRecord.basMonthly);
  const bah = money(bahRecord.bah);
  const grossMonthlyComp = money(basicPay + bas + bah);

  return {
    ok: true,
    lane: "ACTIVE_DUTY",
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
      rankTitle: profile.rankTitle,
      sourceModules: {
        officialPay: OFFICIAL_PAY_RATE_VERSION,
        officialBah: OFFICIAL_BAH_RATE_VERSION
      }
    },
    sourceVersion: `${OFFICIAL_PAY_RATE_VERSION}+${OFFICIAL_BAH_RATE_VERSION}`
  };
}

// ============================================================
// //#6) PAYLOAD BUILDERS
// ============================================================

function buildSummaryFromComp(profile, compensation) {
  const monthly = compensation?.monthly || {};
  const combinedMonthlyGross = round2(monthly.combinedMonthlyGross || monthly.grossMonthlyComp || 0);

  return {
    mode: profile.mode,
    headline: `Estimated monthly active-duty compensation is $${combinedMonthlyGross.toLocaleString()}.`,
    monthlyIncome: combinedMonthlyGross,
    monthlyHousingAllowance: round2(monthly.bah || 0),
    monthlyFoodAllowance: round2(monthly.bas || 0),
    monthlyRetiredPay: null,
    monthlyVA: null,
    combinedMonthlyGross
  };
}

function buildHousingBaseline(profile, compensation) {
  const monthly = compensation?.monthly || {};
  const grossMonthly =
    monthly.combinedMonthlyGross ??
    monthly.grossMonthlyComp ??
    0;

  const gross = round2(grossMonthly);

  return {
    base: profile.currentBase || profile.base || "",
    grossMonthlyIncomeForHousing: gross,
    safeHousingTarget: round2(gross * 0.30),
    stretchHousingTarget: round2(gross * 0.35)
  };
}

function buildFinancialInputs(profile) {
  return {
    additionalIncome: round2(profile.additionalIncome || 0),
    monthlyExpenses: round2(profile.monthlyExpenses || 0),
    monthlyDebt: round2(profile.monthlyDebt || 0),
    downpayment: round2(profile.downpayment || 0),
    projectedHomePrice: round2(profile.projectedHomePrice || 0),
    creditScore: toFiniteNumber(profile.creditScore, 0)
  };
}

function buildReadinessSignals(profile, compensation) {
  const financial = buildFinancialInputs(profile);
  const monthly = compensation?.monthly || {};

  const gross =
    monthly.combinedMonthlyGross ??
    monthly.grossMonthlyComp ??
    0;

  const totalIncome = round2((gross || 0) + (financial.additionalIncome || 0));
  const totalExpenses = round2(
    (financial.monthlyExpenses || 0) + (financial.monthlyDebt || 0)
  );
  const residual = round2(totalIncome - totalExpenses);

  let readiness = "UNKNOWN";

  if (totalIncome <= 0) readiness = "NEEDS_INPUTS";
  else if (residual < 0) readiness = "AT_RISK";
  else if (residual < 500) readiness = "TIGHT";
  else if (residual < 1500) readiness = "STABLE";
  else readiness = "STRONG";

  return {
    totalIncome,
    totalExpenses,
    residual,
    readiness
  };
}

function buildGenericPayload(profile, compensation, tool) {
  const bahRecord = compensation?.detail?.bahRecord || {};
  const payRecord = compensation?.detail?.payRecord || {};
  const monthly = compensation?.monthly || {};

  return {
    tool,
    app: APP_NAME,
    profile,
    compensation,
    summary: buildSummaryFromComp(profile, compensation),
    housing: buildHousingBaseline(profile, compensation),
    financialInputs: buildFinancialInputs(profile),
    readiness: buildReadinessSignals(profile, compensation),

    // Compatibility layer for current BAH calculator JS
    monthly,
    bahRecord,
    payRecord,
    pay: {
      ok: true,
      payModel: "active",
      payAccuracy: "deterministic_official_modules",
      basePay: monthly.basicPay || 0,
      basicPay: monthly.basicPay || 0,
      bas: monthly.bas || 0,
      bah: monthly.bah || 0,
      totalPay: monthly.grossMonthlyComp || 0,
      total: monthly.grossMonthlyComp || 0,
      rankUsed: profile.rank,
      yosUsed: profile.yearsOfService,
      familyUsed: profile.hasDependents,
      zipUsed: bahRecord.dutyZip || null,
      zipSource: "official-bah.js",
      detail: {
        payRecord,
        bahRecord
      }
    },

    sourceVersions: sourceVersions()
  };
}

function buildFadPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "FAD");

  return {
    ...payload,
    fad: {
      incomeMonthly: payload.readiness.totalIncome,
      baselineCompMonthly: round2(
        compensation?.monthly?.combinedMonthlyGross ??
        compensation?.monthly?.grossMonthlyComp ??
        0
      ),
      additionalIncomeMonthly: payload.financialInputs.additionalIncome,
      monthlyExpenses: payload.financialInputs.monthlyExpenses,
      monthlyDebt: payload.financialInputs.monthlyDebt,
      projectedHomePrice: payload.financialInputs.projectedHomePrice,
      downpayment: payload.financialInputs.downpayment,
      creditScore: payload.financialInputs.creditScore
    }
  };
}

function buildAskElenaPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "ASK_ELENA");

  return {
    ...payload,
    askElena: {
      bluf: payload.summary.headline,
      mode: profile.mode,
      rank: profile.rank,
      yearsOfService: profile.yearsOfService,
      currentBase: profile.currentBase,
      dependents: profile.dependents,
      readiness: payload.readiness.readiness,
      residual: payload.readiness.residual,
      housingSafeTarget: payload.housing.safeHousingTarget,
      housingStretchTarget: payload.housing.stretchHousingTarget
    }
  };
}

function buildAiouPayload(profile, compensation) {
  const payload = buildGenericPayload(profile, compensation, "AIOU");

  return {
    ...payload,
    aiou: {
      mode: profile.mode,
      rank: profile.rank,
      yearsOfService: profile.yearsOfService,
      baselineMonthlyComp: round2(
        compensation?.monthly?.combinedMonthlyGross ??
        compensation?.monthly?.grossMonthlyComp ??
        0
      ),
      base: profile.currentBase || "",
      dependents: profile.dependents
    }
  };
}

function buildPayload(input, toolName) {
  const tool = inferToolName(toolName);
  const profile = buildCanonicalProfile(input);
  const compensation = getCompensationProfile(profile);

  if (tool === "FAD") {
    return buildFadPayload(profile, compensation);
  }

  if (tool === "ASK_ELENA") {
    return buildAskElenaPayload(profile, compensation);
  }

  if (tool === "AIOU") {
    return buildAiouPayload(profile, compensation);
  }

  return buildGenericPayload(profile, compensation, tool);
}

// ============================================================
// //#7) HANDLER
// ============================================================

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod === "GET") {
    return json(200, {
      ok: true,
      app: APP_NAME,
      brainVersion: BRAIN_VERSION,
      status: "online",
      route: "/api/opensource-brain",
      purpose: "Public calculator brain for PCSUnited tools powered by TheWing.ai.",
      sourceVersions: sourceVersions(),
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
    return json(405, {
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const input = body.input || body;
    const toolName = body.tool || "GENERIC";

    const payload = buildPayload(input, toolName);

    return json(200, {
      ok: true,
      app: APP_NAME,
      payload,

      // Compatibility wrappers
      data: payload,

      meta: {
        app: APP_NAME,
        brainVersion: BRAIN_VERSION,
        generatedAt: new Date().toISOString(),
        sourceVersions: sourceVersions()
      }
    });
  } catch (err) {
    return json(400, {
      ok: false,
      app: APP_NAME,
      brainVersion: BRAIN_VERSION,
      error: err?.message || "Unknown error"
    });
  }
};
