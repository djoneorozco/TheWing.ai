// netlify/functions/_share/decision-rules.js
// ============================================================
// TheWing.ai • Decision Rules Engine
// v1.0.0
//
// PURPOSE
// - Converts deterministic calculator outputs into clear decisions
// - Used by Financial Dashboard, BuyerBrief, Ask Amy, and decision-brief.js
// - NO Supabase
// - NO OpenAI
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const ENGINE_VERSION = "thewing-decision-rules-1.0.0";

// ============================================================
// //#2) HELPERS
// ============================================================

export function n0(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function round0(value) {
  return Math.round(Number(value) || 0);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const n = Number(value);

    if (Number.isFinite(n)) return n;
  }

  return 0;
}

export function firstString(...values) {
  for (const value of values) {
    const s = String(value ?? "").trim();

    if (s) return s;
  }

  return "";
}

export function pct(part, whole) {
  const p = n0(part);
  const w = n0(whole);

  if (w <= 0) return 0;

  return (p / w) * 100;
}

// ============================================================
// //#3) DECISION STATUS
// ============================================================

export function normalizeStatus(value) {
  const s = String(value || "").trim().toUpperCase();

  if (["GREEN", "STRONG", "GO", "READY"].includes(s)) return "GREEN";
  if (["CAUTION", "YELLOW", "WORKABLE"].includes(s)) return "CAUTION";
  if (["WATCH", "TIGHT"].includes(s)) return "WATCH";
  if (["NO_GO", "NO-GO", "RED", "RISK"].includes(s)) return "NO_GO";

  return "UNKNOWN";
}

export function decisionFromScore(score) {
  const s = clamp(round0(score), 0, 100);

  if (s >= 85) return "GREEN";
  if (s >= 70) return "CAUTION";
  if (s >= 55) return "WATCH";
  return "NO_GO";
}

export function decisionLabel(decision) {
  const d = normalizeStatus(decision);

  if (d === "GREEN") return "Ready";
  if (d === "CAUTION") return "Proceed Carefully";
  if (d === "WATCH") return "Needs Work";
  if (d === "NO_GO") return "No-Go";

  return "Needs Inputs";
}

export function decisionTone(decision) {
  const d = normalizeStatus(decision);

  if (d === "GREEN") return "positive";
  if (d === "CAUTION") return "caution";
  if (d === "WATCH") return "warning";
  if (d === "NO_GO") return "risk";

  return "neutral";
}

// ============================================================
// //#4) RULE EVALUATION
// ============================================================

export function evaluateAffordabilityRules(input = {}) {
  const affordability = input.affordability || {};
  const normalized = affordability.normalized || input.normalized || {};
  const monthly = affordability.monthly || input.monthly || {};

  const totalMonthlyIntake = firstNumber(
    monthly.totalMonthlyIntake,
    normalized.totalMonthlyIntake,
    input.totalMonthlyIntake
  );

  const housingMonthly = firstNumber(
    monthly.projectedMortgageMonthly,
    normalized.projectedMortgageMonthly,
    input.projectedMortgageMonthly,
    input.mortgageMonthly
  );

  const debtMonthly = firstNumber(
    monthly.debtMonthly,
    normalized.debtMonthly,
    input.debtMonthly
  );

  const expensesMonthly = firstNumber(
    monthly.baseExpensesMonthly,
    normalized.baseExpensesMonthly,
    input.expensesMonthly
  );

  const residualMonthly = firstNumber(
    monthly.residualMonthlyIncome,
    normalized.residualMonthlyIncome,
    input.residualMonthlyIncome
  );

  const housingRatio = firstNumber(
    affordability.ratios?.housingRatioPct,
    normalized.housingRatioPct,
    pct(housingMonthly, totalMonthlyIntake)
  );

  const debtRatio = firstNumber(
    affordability.ratios?.debtRatioPct,
    normalized.debtRatioPct,
    pct(debtMonthly, totalMonthlyIntake)
  );

  const totalExpenseRatio = firstNumber(
    affordability.ratios?.totalExpenseRatioPct,
    normalized.totalExpenseRatioPct,
    pct(housingMonthly + debtMonthly + expensesMonthly, totalMonthlyIntake)
  );

  const score = firstNumber(
    affordability.score,
    input.score
  );

  const decision = score > 0
    ? decisionFromScore(score)
    : totalMonthlyIntake <= 0
      ? "UNKNOWN"
      : residualMonthly < 0
        ? "NO_GO"
        : housingRatio > 40 || totalExpenseRatio > 90
          ? "NO_GO"
          : housingRatio > 35 || totalExpenseRatio > 80
            ? "WATCH"
            : housingRatio > 30 || totalExpenseRatio > 70
              ? "CAUTION"
              : "GREEN";

  const findings = [];

  if (totalMonthlyIntake <= 0) {
    findings.push({
      severity: "missing",
      code: "income_missing",
      title: "Income input needed",
      message: "Monthly income is missing, so the decision is incomplete."
    });
  }

  if (housingRatio > 35) {
    findings.push({
      severity: "risk",
      code: "housing_high",
      title: "Housing cost is elevated",
      message: `Projected housing is ${round2(housingRatio)}% of monthly intake.`
    });
  } else if (housingRatio > 0 && housingRatio <= 30) {
    findings.push({
      severity: "strength",
      code: "housing_workable",
      title: "Housing lane is workable",
      message: `Projected housing is ${round2(housingRatio)}% of monthly intake.`
    });
  }

  if (debtRatio > 15) {
    findings.push({
      severity: "warning",
      code: "debt_elevated",
      title: "Debt load deserves attention",
      message: `Non-housing debt is ${round2(debtRatio)}% of monthly intake.`
    });
  }

  if (residualMonthly < 0) {
    findings.push({
      severity: "risk",
      code: "negative_residual",
      title: "Residual income is negative",
      message: "Estimated obligations exceed monthly intake."
    });
  } else if (residualMonthly > 1500) {
    findings.push({
      severity: "strength",
      code: "strong_residual",
      title: "Residual income is strong",
      message: `Estimated residual income is $${round0(residualMonthly).toLocaleString()}/mo.`
    });
  }

  return {
    decision,
    label: decisionLabel(decision),
    tone: decisionTone(decision),
    findings,
    metrics: {
      totalMonthlyIntake: round2(totalMonthlyIntake),
      housingMonthly: round2(housingMonthly),
      debtMonthly: round2(debtMonthly),
      expensesMonthly: round2(expensesMonthly),
      residualMonthly: round2(residualMonthly),
      housingRatioPct: round2(housingRatio),
      debtRatioPct: round2(debtRatio),
      totalExpenseRatioPct: round2(totalExpenseRatio)
    }
  };
}

export function evaluateReadinessRules(input = {}) {
  const profile = input.profile || {};
  const affordability = input.affordability || {};
  const decision = input.decision || {};
  const missing = [];

  const required = [
    ["rank", profile.rank || profile.rank_paygrade || profile.paygrade],
    ["yearsOfService", profile.yos || profile.yearsOfService || profile.years_of_service],
    ["base", profile.base || profile.currentBase || profile.location],
    ["income", affordability.monthly?.totalMonthlyIntake || affordability.normalized?.totalMonthlyIntake],
    ["mortgage", affordability.monthly?.projectedMortgageMonthly || affordability.normalized?.projectedMortgageMonthly]
  ];

  for (const [key, value] of required) {
    if (value === undefined || value === null || value === "" || Number(value) === 0) {
      missing.push(key);
    }
  }

  const baseDecision = normalizeStatus(decision.decision || affordability.status);

  let readiness = "NEEDS_INPUTS";

  if (missing.length > 0) {
    readiness = "NEEDS_INPUTS";
  } else if (baseDecision === "GREEN") {
    readiness = "READY";
  } else if (baseDecision === "CAUTION") {
    readiness = "READY_WITH_CAUTION";
  } else if (baseDecision === "WATCH") {
    readiness = "NEEDS_WORK";
  } else if (baseDecision === "NO_GO") {
    readiness = "NOT_READY";
  }

  return {
    readiness,
    missing,
    ready: readiness === "READY" || readiness === "READY_WITH_CAUTION",
    label:
      readiness === "READY"
        ? "Ready"
        : readiness === "READY_WITH_CAUTION"
          ? "Ready With Caution"
          : readiness === "NEEDS_WORK"
            ? "Needs Work"
            : readiness === "NOT_READY"
              ? "Not Ready"
              : "Needs Inputs"
  };
}

// ============================================================
// //#5) ACTION PLAN
// ============================================================

export function buildActionPlan(input = {}) {
  const rules = evaluateAffordabilityRules(input);
  const readiness = evaluateReadinessRules({
    ...input,
    decision: rules
  });

  const actions = [];

  if (readiness.missing.length > 0) {
    actions.push({
      priority: 1,
      type: "inputs",
      title: "Complete missing inputs",
      detail: `Missing: ${readiness.missing.join(", ")}.`
    });
  }

  if (rules.metrics.housingRatioPct > 35) {
    actions.push({
      priority: 2,
      type: "housing",
      title: "Reduce projected housing cost",
      detail: "Lower target price, increase down payment, or compare lower-cost neighborhoods."
    });
  } else if (rules.metrics.housingRatioPct > 30) {
    actions.push({
      priority: 2,
      type: "housing",
      title: "Keep housing inside the preferred lane",
      detail: "Aim for housing closer to 28–30% of monthly intake."
    });
  }

  if (rules.metrics.debtRatioPct > 12) {
    actions.push({
      priority: 3,
      type: "debt",
      title: "Reduce non-housing debt",
      detail: "Focus on high-payment debts first to improve residual income."
    });
  }

  if (rules.metrics.residualMonthly < 500) {
    actions.push({
      priority: 4,
      type: "cashflow",
      title: "Protect monthly cash flow",
      detail: "Build more monthly cushion before taking on a larger mortgage."
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: 1,
      type: "maintain",
      title: "Maintain current lane",
      detail: "Current affordability signals look strong. Keep validating taxes, insurance, HOA, and commute costs."
    });
  }

  return {
    decision: rules.decision,
    readiness: readiness.readiness,
    actions: actions.sort((a, b) => a.priority - b.priority)
  };
}

// ============================================================
// //#6) MAIN API
// ============================================================

export function evaluateDecision(input = {}) {
  const affordabilityRules = evaluateAffordabilityRules(input);
  const readinessRules = evaluateReadinessRules({
    ...input,
    decision: affordabilityRules
  });
  const actionPlan = buildActionPlan({
    ...input,
    decision: affordabilityRules
  });

  return {
    ok: true,
    engineVersion: ENGINE_VERSION,
    decision: affordabilityRules.decision,
    label: affordabilityRules.label,
    tone: affordabilityRules.tone,
    readiness: readinessRules,
    findings: affordabilityRules.findings,
    metrics: affordabilityRules.metrics,
    actions: actionPlan.actions,
    bluf:
      affordabilityRules.decision === "GREEN"
        ? "The current scenario is financially workable."
        : affordabilityRules.decision === "CAUTION"
          ? "The scenario is workable, but the margins should be watched."
          : affordabilityRules.decision === "WATCH"
            ? "The scenario is tight and needs adjustment before moving forward."
            : affordabilityRules.decision === "NO_GO"
              ? "The scenario is not recommended without improving the inputs."
              : "More inputs are needed before making a decision.",
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION
    }
  };
}

export function safeEvaluateDecision(input = {}) {
  try {
    return evaluateDecision(input);
  } catch (error) {
    return {
      ok: false,
      engineVersion: ENGINE_VERSION,
      error: error?.message || "Decision rules failed."
    };
  }
}

// ============================================================
// //#7) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  ENGINE_VERSION,

  n0,
  round2,
  round0,
  clamp,
  firstNumber,
  firstString,
  pct,

  normalizeStatus,
  decisionFromScore,
  decisionLabel,
  decisionTone,

  evaluateAffordabilityRules,
  evaluateReadinessRules,
  buildActionPlan,
  evaluateDecision,
  safeEvaluateDecision
});
