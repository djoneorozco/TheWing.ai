// netlify/functions/_share/agent-registry.js
// ============================================================
// TheWing.ai • Agent Registry
// v1.0.0
//
// PURPOSE
// - Central intelligence switchboard for Ask Amy and future agents
// - Lets ask-amy.js call one registry instead of importing every
//   future _share module directly
// - Loads approved shared tools defensively
// - Builds deterministic tool packets
// - Builds direct replies when a tool can answer without OpenAI
//
// WHY THIS EXISTS
// - ask-amy.js should stay stable
// - new intelligence modules should be added here, not hardwired
//   into Ask Amy every time
//
// CURRENT SUPPORTED TOOLS
// - compensation_context
// - mortgage_engine
// - affordability_engine
// - decision_rules
// - va_loans
//
// FUTURE TOOL PATTERN
// Add a new object to TOOL_DEFINITIONS:
// {
//   name: "base_schools",
//   path: "./base-schools.js",
//   intents: ["base_schools", "pcs_housing_strategy"],
//   contextFunctions: ["buildBaseSchoolsPacket", "analyzeBaseSchools"],
//   replyFunctions: ["buildDirectReply"],
//   normalize: normalizeGenericPacket
// }
//
// NETLIFY NOTE
// Make sure netlify.toml includes:
// [functions]
//   included_files = ["netlify/functions/_share/**"]
// ============================================================

/* eslint-disable no-console */

// ============================================================
// //#1 REGISTRY CONFIG
// ============================================================

const VERSION = "1.0.0";

const MODULE_CACHE = new Map();

const TOOL_DEFINITIONS = [
  {
    name: "compensation_context",
    label: "Compensation Context",
    path: "./compensation-context.js",
    intents: ["compensation", "housing_affordability", "dashboard_interpretation", "pcs_housing_strategy"],
    contextFunctions: [
      "safeBuildCompensationContext",
      "buildCompensationContext",
      "calculateCompensation",
      "getCompensation"
    ],
    replyFunctions: [],
    normalize: normalizeCompensationPacket
  },
  {
    name: "mortgage_engine",
    label: "Mortgage Engine",
    path: "./mortgage-engine.js",
    intents: ["mortgage_explanation", "housing_affordability", "dashboard_interpretation", "va_loan"],
    contextFunctions: [
      "safeCalculateMortgage",
      "calculateMortgage",
      "computeMortgage",
      "buildMortgage",
      "getMortgage"
    ],
    replyFunctions: [],
    normalize: normalizeMortgagePacket
  },
  {
    name: "affordability_engine",
    label: "Affordability Engine",
    path: "./affordability-engine.js",
    intents: ["housing_affordability", "dashboard_interpretation", "rent_vs_buy", "pcs_housing_strategy"],
    contextFunctions: [
      "computeAffordability",
      "calculateAffordability",
      "scoreAffordability",
      "buildAffordability",
      "affordabilityEngine"
    ],
    replyFunctions: [],
    normalize: normalizeAffordabilityPacket
  },
  {
    name: "decision_rules",
    label: "Decision Rules",
    path: "./decision-rules.js",
    intents: ["housing_affordability", "dashboard_interpretation", "rent_vs_buy", "pcs_housing_strategy"],
    contextFunctions: [
      "computeVerdict",
      "getVerdict",
      "scoreDecision",
      "buildDecision",
      "evaluate",
      "decisionRules"
    ],
    replyFunctions: [],
    normalize: normalizeVerdictPacket
  },
  {
    name: "va_loans",
    label: "VA Loans",
    path: "./va-loans.js",
    intents: ["va_loan", "mortgage_explanation", "pcs_housing_strategy"],
    contextFunctions: [
      "buildVaLoanTruthPacket",
      "analyzeVaLoanQuestion",
      "getVaLoanGuidance",
      "buildVaLoanPacket",
      "vaLoanEngine"
    ],
    replyFunctions: [
      "buildDirectVaLoanReply",
      "buildDirectReply",
      "formatVaLoanReply"
    ],
    normalize: normalizeVaLoanPacket
  }
];

// ============================================================
// //#2 PUBLIC API
// ============================================================

export function getAgentRegistryInfo() {
  return {
    ok: true,
    version: VERSION,
    tools: TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      label: tool.label,
      path: tool.path,
      intents: tool.intents,
      contextFunctions: tool.contextFunctions,
      replyFunctions: tool.replyFunctions
    }))
  };
}

export function listToolDefinitions() {
  return TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
}

export async function loadTool(name) {
  const def = TOOL_DEFINITIONS.find((tool) => tool.name === name);

  if (!def) {
    return {
      ok: false,
      name,
      error: "Tool is not registered."
    };
  }

  const mod = await safeLoadModule(def.path);

  return {
    ok: Boolean(mod),
    name: def.name,
    label: def.label,
    path: def.path,
    module: mod,
    definition: def,
    error: mod ? null : "Module could not be loaded."
  };
}

export async function buildToolPackets(input = {}) {
  const normalizedInput = normalizeRegistryInput(input);
  const activeTools = getToolsForIntent(normalizedInput.intent);

  const packets = {};
  const contextUsed = {};
  const errors = [];

  for (const def of activeTools) {
    const loaded = await loadTool(def.name);

    contextUsed[def.name] = {
      loaded: Boolean(loaded.ok),
      used: false,
      path: def.path,
      label: def.label
    };

    if (!loaded.ok || !loaded.module) {
      errors.push({
        tool: def.name,
        error: loaded.error || "Tool failed to load."
      });
      continue;
    }

    const fn = getExportedFunction(loaded.module, def.contextFunctions);

    if (typeof fn !== "function") {
      errors.push({
        tool: def.name,
        error: `No compatible context function found. Expected one of: ${def.contextFunctions.join(", ")}`
      });
      continue;
    }

    try {
      const raw = await fn(buildToolInput(normalizedInput, def));
      const normalized = def.normalize ? def.normalize(raw, normalizedInput) : normalizeGenericPacket(raw, def);

      if (normalized) {
        packets[def.name] = normalized;
        contextUsed[def.name].used = true;
      }
    } catch (err) {
      console.warn(`agent-registry ${def.name} failed:`, err?.message || err);

      errors.push({
        tool: def.name,
        error: String(err?.message || err)
      });
    }
  }

  return {
    ok: true,
    version: VERSION,
    intent: normalizedInput.intent,
    packets,
    context_used: contextUsed,
    errors
  };
}

export async function buildDirectToolReply(input = {}) {
  const normalizedInput = normalizeRegistryInput(input);
  const activeTools = getToolsForIntent(normalizedInput.intent);

  for (const def of activeTools) {
    const loaded = await loadTool(def.name);

    if (!loaded.ok || !loaded.module) continue;

    const fn = getExportedFunction(loaded.module, def.replyFunctions);

    if (typeof fn !== "function") continue;

    try {
      const reply = await fn(buildToolInput(normalizedInput, def));

      if (typeof reply === "string" && reply.trim()) {
        return {
          ok: true,
          tool: def.name,
          reply: reply.trim()
        };
      }

      if (reply && typeof reply === "object") {
        const text =
          reply.reply ||
          reply.text ||
          reply.message ||
          reply.summary ||
          reply.bluf ||
          "";

        if (safeStr(text)) {
          return {
            ok: true,
            tool: def.name,
            reply: safeStr(text),
            raw: reply
          };
        }
      }
    } catch (err) {
      console.warn(`agent-registry direct reply ${def.name} failed:`, err?.message || err);
    }
  }

  return {
    ok: false,
    reply: ""
  };
}

export async function runTool(name, input = {}) {
  const def = TOOL_DEFINITIONS.find((tool) => tool.name === name);

  if (!def) {
    return {
      ok: false,
      name,
      error: "Tool is not registered."
    };
  }

  const normalizedInput = normalizeRegistryInput(input);
  const loaded = await loadTool(def.name);

  if (!loaded.ok || !loaded.module) {
    return {
      ok: false,
      name: def.name,
      error: loaded.error || "Tool failed to load."
    };
  }

  const fn = getExportedFunction(loaded.module, def.contextFunctions);

  if (typeof fn !== "function") {
    return {
      ok: false,
      name: def.name,
      error: `No compatible context function found. Expected one of: ${def.contextFunctions.join(", ")}`
    };
  }

  try {
    const raw = await fn(buildToolInput(normalizedInput, def));
    const packet = def.normalize ? def.normalize(raw, normalizedInput) : normalizeGenericPacket(raw, def);

    return {
      ok: true,
      name: def.name,
      packet
    };
  } catch (err) {
    return {
      ok: false,
      name: def.name,
      error: String(err?.message || err)
    };
  }
}

// ============================================================
// //#3 TOOL SELECTION
// ============================================================

function getToolsForIntent(intent) {
  const cleanIntent = safeStr(intent) || "general_guidance";

  const exact = TOOL_DEFINITIONS.filter((tool) =>
    Array.isArray(tool.intents) && tool.intents.includes(cleanIntent)
  );

  if (exact.length) return exact;

  if (cleanIntent === "general_guidance") {
    return TOOL_DEFINITIONS.filter((tool) =>
      ["compensation_context", "mortgage_engine", "va_loans"].includes(tool.name)
    );
  }

  return TOOL_DEFINITIONS.filter((tool) =>
    ["compensation_context", "mortgage_engine", "affordability_engine", "decision_rules"].includes(tool.name)
  );
}

// ============================================================
// //#4 MODULE LOADING
// ============================================================

async function safeLoadModule(path) {
  const cleanPath = safeStr(path);

  if (!cleanPath) return null;

  if (MODULE_CACHE.has(cleanPath)) {
    return MODULE_CACHE.get(cleanPath);
  }

  try {
    const mod = await import(cleanPath);
    const unwrapped = unwrapModule(mod);

    MODULE_CACHE.set(cleanPath, unwrapped);
    return unwrapped;
  } catch (err) {
    console.warn(`agent-registry import failed for ${cleanPath}:`, err?.message || err);
    MODULE_CACHE.set(cleanPath, null);
    return null;
  }
}

function unwrapModule(mod) {
  if (!mod) return null;

  if (mod.default && typeof mod.default === "object") {
    return {
      ...mod.default,
      ...mod
    };
  }

  return mod;
}

function getExportedFunction(mod, names = []) {
  if (!mod) return null;

  for (const name of names) {
    if (typeof mod[name] === "function") return mod[name];

    if (mod.default && typeof mod.default[name] === "function") {
      return mod.default[name];
    }
  }

  if (typeof mod === "function") return mod;

  if (typeof mod.default === "function") return mod.default;

  return null;
}

// ============================================================
// //#5 INPUT NORMALIZATION
// ============================================================

function normalizeRegistryInput(input = {}) {
  const context = input.context && typeof input.context === "object" ? input.context : {};

  const profile = mergeDeep(
    {},
    context.profile || {},
    input.profile || {},
    input.normalizedProfile || {},
    input.member_profile || {}
  );

  const scenario = mergeDeep(
    {},
    context.scenario || {},
    input.scenario || {},
    input.housing_inputs || {}
  );

  const compensation = mergeDeep(
    {},
    context.compensation || {},
    input.compensation || {}
  );

  const mortgage = mergeDeep(
    {},
    context.mortgage || {},
    input.mortgage || {}
  );

  const affordability = mergeDeep(
    {},
    context.affordability || {},
    input.affordability || {}
  );

  const verdict = mergeDeep(
    {},
    context.verdict || {},
    input.verdict || {}
  );

  return {
    message: safeStr(input.message || input.question || input.prompt || ""),
    intent: safeStr(input.intent || context.intent || detectIntentFallback(input.message || "")),
    email: normalizeEmail(input.email || profile.email || context.email || ""),
    profile,
    scenario,
    compensation,
    mortgage,
    affordability,
    verdict,
    raw: input
  };
}

function buildToolInput(input, def) {
  return {
    message: input.message,
    intent: input.intent,
    email: input.email,
    profile: input.profile,
    normalizedProfile: input.profile,
    scenario: input.scenario,
    compensation: input.compensation,
    mortgage: input.mortgage,
    affordability: input.affordability,
    verdict: input.verdict,
    tool: {
      name: def.name,
      label: def.label,
      path: def.path
    },
    context: {
      profile: input.profile,
      scenario: input.scenario,
      compensation: input.compensation,
      mortgage: input.mortgage,
      affordability: input.affordability,
      verdict: input.verdict
    }
  };
}

// ============================================================
// //#6 NORMALIZERS
// ============================================================

function normalizeGenericPacket(raw, def = {}) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  return stripEmpty({
    ...raw,
    ok: raw.ok !== false,
    source: safeStr(raw.source || raw._source || def.label || def.name),
    tool: def.name || raw.tool || null
  });
}

function normalizeCompensationPacket(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  const basePay = num(
    pickFirst(
      raw.basePay,
      raw.base_pay,
      raw.basicPay,
      raw.monthly_base_pay,
      raw.monthly?.basePay,
      raw.monthly?.basicPay,
      raw.basicPayMonthly,
      raw.monthly?.basic_pay
    )
  );

  const bas = num(
    pickFirst(
      raw.bas,
      raw.BAS,
      raw.basic_allowance_subsistence,
      raw.monthly?.bas,
      raw.basMonthly
    )
  );

  const bah = num(
    pickFirst(
      raw.bah,
      raw.BAH,
      raw.bahMonthly,
      raw.monthlyBah,
      raw.housing_allowance,
      raw.monthly?.bah,
      raw.components?.bah?.bahMonthly
    )
  );

  const va = num(
    pickFirst(
      raw.va,
      raw.va_disability_pay,
      raw.vaCompensation,
      raw.vaMonthly,
      raw.disability,
      raw.monthly?.vaDisability,
      raw.components?.va?.vaMonthly
    )
  );

  const retirement = num(
    pickFirst(
      raw.retirement,
      raw.retired_pay,
      raw.retirement_pay,
      raw.retirementMonthly,
      raw.monthly?.retirement,
      raw.components?.retirement?.retirementMonthly
    )
  );

  const total = num(
    pickFirst(
      raw.total,
      raw.totalMonthly,
      raw.total_monthly,
      raw.monthly_total,
      raw.householdIncomeMonthly,
      raw.militaryIncomeMonthly,
      raw.monthly?.total,
      raw.monthly?.householdIncome,
      raw.monthly?.militaryIncome,
      [basePay, bas, bah, va, retirement]
        .filter((x) => Number.isFinite(x))
        .reduce((a, b) => a + b, 0)
    )
  );

  if (![basePay, bas, bah, va, retirement, total].some((x) => Number.isFinite(x) && x > 0)) {
    return normalizeGenericPacket(raw, { name: "compensation_context", label: "Compensation Context" });
  }

  return stripEmpty({
    ok: raw.ok !== false,
    rank_paygrade: safeStr(
      pickFirst(raw.rank_paygrade, raw.paygrade, raw.rank, raw.profile?.rank_paygrade)
    ),
    yos: num(pickFirst(raw.yos, raw.yearsOfService, raw.profile?.yos)),
    base: safeStr(
      pickFirst(raw.resolvedBase, raw.canonicalBase, raw.base, raw.profile?.base)
    ),
    zip: safeStr(
      pickFirst(raw.resolvedZip, raw.dutyZip, raw.zip, raw.profile?.zip)
    ),
    with_dependents: pickFirst(
      raw.with_dependents,
      raw.profile?.hasDependents,
      raw.profile?.withDependents
    ),
    base_pay: roundMoney(basePay),
    bas: roundMoney(bas),
    bah: roundMoney(bah),
    va_disability_pay: roundMoney(va),
    retirement_pay: roundMoney(retirement),
    total_monthly: roundMoney(total),
    source: safeStr(
      pickFirst(raw.source, raw.sourceVersion, "TheWing compensation-context")
    ),
    note: safeStr(
      pickFirst(
        raw.note,
        Array.isArray(raw.notes) ? raw.notes.join(" ") : "",
        raw.bahNote,
        raw.reason
      )
    ),
    warnings: Array.isArray(raw.warnings) ? raw.warnings : undefined,
    raw: raw.includeRaw === true ? raw : undefined
  });
}

function normalizeMortgagePacket(raw, input = {}) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  const principalInterest = num(
    pickFirst(
      raw.principal_interest,
      raw.principalInterest,
      raw.pi,
      raw.p_and_i,
      raw.monthlyPI,
      raw.breakdown?.principalInterest
    )
  );

  const taxes = num(
    pickFirst(
      raw.taxes,
      raw.tax,
      raw.property_tax,
      raw.propertyTax,
      raw.breakdown?.taxes
    )
  );

  const insurance = num(
    pickFirst(
      raw.insurance,
      raw.home_insurance,
      raw.homeownersInsurance,
      raw.breakdown?.insurance
    )
  );

  const hoa = num(
    pickFirst(raw.hoa, raw.hoa_monthly, raw.hoaMonthly, raw.breakdown?.hoa)
  );

  const pmi = num(
    pickFirst(raw.pmi, raw.PMI, raw.breakdown?.pmi)
  );

  const allIn = num(
    pickFirst(
      raw.all_in,
      raw.allIn,
      raw.total,
      raw.total_monthly,
      raw.monthly_total,
      raw.payment,
      raw.monthlyPayment,
      raw.allInMonthly,
      raw.breakdown?.allIn,
      [principalInterest, taxes, insurance, hoa, pmi]
        .filter((x) => Number.isFinite(x))
        .reduce((a, b) => a + b, 0)
    )
  );

  if (!allIn || allIn <= 0) {
    return normalizeGenericPacket(raw, { name: "mortgage_engine", label: "Mortgage Engine" });
  }

  return stripEmpty({
    ok: raw.ok !== false,
    price: roundMoney(pickFirst(raw.price, input?.scenario?.price)),
    downpayment: roundMoney(pickFirst(raw.downpayment, input?.scenario?.downpayment)),
    loan_amount: roundMoney(
      pickFirst(raw.loan_amount, raw.loanAmount, raw.baseLoanAmount)
    ),
    apr: num(pickFirst(raw.apr, raw.rate, raw.apr_percent, raw.aprPct)),
    term_years: num(pickFirst(raw.term_years, raw.termYears)),
    principal_interest: roundMoney(principalInterest),
    taxes: roundMoney(taxes),
    insurance: roundMoney(insurance),
    hoa: roundMoney(hoa),
    pmi: roundMoney(pmi),
    all_in_monthly: roundMoney(allIn),
    source: safeStr(pickFirst(raw.source, "TheWing mortgage-engine")),
    note: safeStr(pickFirst(raw.note, raw.reason))
  });
}

function normalizeAffordabilityPacket(raw, input = {}) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  const income = num(
    pickFirst(raw.income, raw.monthlyIncome, input?.compensation?.total_monthly)
  );

  const housingAllIn = num(
    pickFirst(
      raw.housingAllIn,
      raw.housing_all_in,
      raw.mortgage,
      input?.mortgage?.all_in_monthly
    )
  );

  const expenses = num(
    pickFirst(raw.expenses, raw.monthlyExpenses, input?.scenario?.expenses)
  );

  const housingRatio = num(
    pickFirst(
      raw.housing_ratio,
      raw.housingRatio,
      income && housingAllIn ? housingAllIn / income : null
    )
  );

  const backendRatio = num(
    pickFirst(
      raw.backend_ratio,
      raw.backEndRatio,
      income && housingAllIn ? (housingAllIn + (expenses || 0)) / income : null
    )
  );

  return stripEmpty({
    ok: raw.ok !== false,
    income: roundMoney(income),
    housing_cap_30: roundMoney(
      pickFirst(raw.housing_cap_30, raw.housingCap, income ? income * 0.3 : null)
    ),
    housing_ratio: housingRatio,
    expense_ratio: num(pickFirst(raw.expense_ratio, raw.expenseRatio)),
    backend_ratio: backendRatio,
    residual_income: roundMoney(
      pickFirst(
        raw.residual_income,
        raw.residual,
        income && housingAllIn ? income - housingAllIn - (expenses || 0) : null
      )
    ),
    score: pickFirst(raw.score, raw.grade, null),
    status: pickFirst(raw.status, raw.verdict, null),
    source: safeStr(pickFirst(raw.source, "TheWing affordability-engine")),
    note: safeStr(pickFirst(raw.note, raw.reason))
  });
}

function normalizeVerdictPacket(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  const status = safeStr(
    pickFirst(raw.status, raw.verdict, raw.label, raw.decision)
  ).toUpperCase();

  return stripEmpty({
    ok: raw.ok !== false,
    status: status || null,
    grade: pickFirst(raw.grade, raw.score, null),
    label: pickFirst(raw.label, status || null),
    bluf: safeStr(pickFirst(raw.bluf, raw.summary, raw.message)),
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons
      : Array.isArray(raw.notes)
        ? raw.notes
        : [],
    source: safeStr(pickFirst(raw.source, "TheWing decision-rules"))
  });
}

function normalizeVaLoanPacket(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.ok === false) return null;

  const guidance = raw.guidance && typeof raw.guidance === "object" ? raw.guidance : {};

  const keyPoints = Array.isArray(raw.key_points)
    ? raw.key_points
    : Array.isArray(raw.keyPoints)
      ? raw.keyPoints
      : Array.isArray(guidance.key_points)
        ? guidance.key_points
        : Array.isArray(guidance.keyPoints)
          ? guidance.keyPoints
          : undefined;

  const risks = Array.isArray(raw.risks)
    ? raw.risks
    : Array.isArray(guidance.risks)
      ? guidance.risks
      : undefined;

  const nextSteps = Array.isArray(raw.next_steps)
    ? raw.next_steps
    : Array.isArray(raw.nextSteps)
      ? raw.nextSteps
      : Array.isArray(guidance.next_steps)
        ? guidance.next_steps
        : Array.isArray(guidance.nextSteps)
          ? guidance.nextSteps
          : undefined;

  return stripEmpty({
    ...raw,
    ok: raw.ok !== false,
    source: safeStr(pickFirst(raw.source, raw._source, "TheWing va-loans.js")),
    topic: safeStr(pickFirst(raw.topic, raw.intent, raw.category)),
    title: safeStr(pickFirst(raw.title, raw.topic_title, guidance.title)),
    bluf: safeStr(pickFirst(raw.bluf, raw.summary, guidance.bluf)),
    key_points: keyPoints,
    risks,
    next_steps: nextSteps,
    funding_fee: pickFirst(raw.funding_fee, raw.fundingFee, raw.purchase_scenario?.loan?.fundingFee),
    purchase_scenario: raw.purchase_scenario || raw.purchaseScenario,
    profile_signals: raw.profile_signals || raw.profileSignals
  });
}

// ============================================================
// //#7 FALLBACK INTENT DETECTION
// ============================================================

function detectIntentFallback(message) {
  const t = safeStr(message).toLowerCase();

  if (!t) return "unknown";

  if (
    /\bva loan\b|\bva mortgage\b|\bva-backed\b|\bva backed\b|\bcoe\b|\bcertificate of eligibility\b|\bfunding fee\b|\bva funding fee\b|\bva appraisal\b|\bva inspection\b|\bentitlement\b|\bfull entitlement\b|\bpartial entitlement\b|\bseller concession\b|\bseller credit\b|\bzero down\b|\b0 down\b|\bno down payment\b|\bno pmi\b|\boccupancy\b|\bprimary residence\b|\bva closing costs\b|\bva home loan\b/.test(t)
  ) {
    return "va_loan";
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

// ============================================================
// //#8 SMALL UTILITIES
// ============================================================

function safeStr(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  const email = safeStr(value).toLowerCase();
  return email.includes("@") ? email : "";
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickFirst(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(typeof value === "number" && !Number.isFinite(value))
    ) {
      return value;
    }
  }

  return null;
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

function roundMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function mergeDeep(target, ...sources) {
  const out = target && typeof target === "object" ? target : {};

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

      if (nested && Object.keys(nested).length) {
        out[key] = nested;
      }

      continue;
    }

    out[key] = value;
  }

  return out;
}

export default {
  version: VERSION,
  getAgentRegistryInfo,
  listToolDefinitions,
  loadTool,
  runTool,
  buildToolPackets,
  buildDirectToolReply
};
