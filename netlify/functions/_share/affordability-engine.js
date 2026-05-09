// netlify/functions/_share/affordability-engine.js
// ============================================================
// TheWing.ai • Affordability Engine
// v1.0.0
//
// PURPOSE
// - Deterministic affordability scoring for TheWing.ai
// - Works with profile, pay, mortgage, debt, and expense inputs
// - NO Supabase
// - NO OpenAI
// - Pure shared engine for brain.js / opensource-brain.js
//
// MAIN EXPORTS
// - calculateAffordability(input)
// - safeCalculateAffordability(input)
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const ENGINE_VERSION = "thewing-affordability-engine-1.0.0";

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

export function money(value) {
  return round2(value);
}

// ============================================================
// //#3) GRADE ENGINE
// ============================================================

export function scoreToGrade(score) {
  const s = clamp(round0(score), 0, 100);

  if (s >= 97) return "A+";
  if (s >= 93) return "A";
  if (s >= 90) return "A-";
  if (s >= 87) return "B+";
  if (s >= 83) return "B";
  if (s >= 80) return "B-";
  if (s >= 77) return "C+";
  if (s >= 73) return "C";
  if (s >= 70) return "C-";
  if (s >= 67) return "D+";
  if (s >= 63) return "D";
  if (s >= 60) return "D-";

  return "F";
}

export function scoreToStatus(score) {
  const s = clamp(round0(score), 0, 100);

  if (s >= 85) return "GREEN";
  if (s >= 70) return "CAUTION";
  if (s >= 55) return "WATCH";
  return "NO_GO";
}

export function statusLabel(status) {
  const s = String(status || "").toUpperCase();

  if (s === "GREEN") return "Strong";
  if (s === "CAUTION") return "Caution";
  if (s === "WATCH") return "Watch";
  if (s === "NO_GO") return "No-Go";

  return "Unknown";
}

// ============================================================
// //#4) INPUT NORMALIZATION
// ============================================================

export function normalizeAffordabilityInput(input = {}) {
  const profile = input.profile || {};
  const pay = input.pay || {};
  const compensation = input.compensation || {};
  const mortgage = input.mortgage || {};
  const monthly = input.monthly || mortgage.monthly || {};
  const breakdown = input.breakdown || mortgage.breakdown || {};

  const incomeMonthly = firstNumber(
    input.incomeMonthly,
    input.totalMonthlyIncome,
    input.total_monthly_income,
    input.totalMonthlyIntake,
    input.total_monthly_intake,
    input.grossMonthlyIncome,
    input.gross_monthly_income,

    pay.totalPay,
    pay.total,
    pay.totalMonthly,
    pay.grossMonthlyComp,
    pay.combinedMonthlyGross,

    compensation.monthly?.combinedMonthlyGross,
    compensation.monthly?.grossMonthlyComp,
    compensation.monthly?.totalMonthly,
    compensation.monthly?.totalMilitaryIncome,

    profile.total_monthly_income,
    profile.monthly_income,
    profile.income,
    profile.pay_total
  );

  const additionalIncomeMonthly = firstNumber(
    input.additionalIncomeMonthly,
    input.additional_income,
    input.additionalIncome,
    profile.additional_monthly_income,
    profile.additional_income,
    profile.additionalIncome
  );

  const baseExpensesMonthly = firstNumber(
    input.expensesMonthly,
    input.monthlyExpenses,
    input.monthly_expenses,
    input.expenses,
    profile.monthly_expenses,
    profile.monthlyExpenses,
    profile.expenses
  );

  const debtMonthly = firstNumber(
    input.debtMonthly,
    input.monthlyDebt,
    input.monthly_debt,
    input.debt,
    profile.monthly_debt,
    profile.monthlyDebt,
    profile.debt,
    profile.non_housing_debt,
    profile.nonHousingDebt
  );

  const projectedMortgageMonthly = firstNumber(
    input.projectedMortgageMonthly,
    input.projected_mortgage_amount,
    input.mortgageMonthly,
    input.housingMonthly,
    input.housing_monthly,

    mortgage.totalMonthly,
    mortgage.estimatedMonthlyMortgage,
    mortgage.monthly?.totalMonthly,
    mortgage.monthly?.totalPayment,
    mortgage.monthly?.allIn,
    mortgage.breakdown?.allIn,

    monthly.totalMonthly,
    monthly.totalPayment,
    monthly.allIn,
    breakdown.allIn
  );

  const savings = firstNumber(
    input.savings,
    input.currentSavings,
    input.current_savings,
    input.downpayment,
    input.downPayment,
    profile.savings,
    profile.current_savings,
    profile.downpayment,
    profile.downPayment
  );

  const targetHomePrice = firstNumber(
    input.targetHomePrice,
    input.projectedHomePrice,
    input.projected_home_price,
    input.price,
    mortgage.price,
    mortgage.mortgage?.price,
    profile.projected_home_price,
    profile.projectedHomePrice,
    profile.price
  );

  const creditScore = firstNumber(
    input.creditScore,
    input.credit_score,
    mortgage.creditScore,
    mortgage.mortgage?.creditScore,
    profile.credit_score,
    profile.creditScore
  );

  const totalMonthlyIncome = money(incomeMonthly);
  const totalMonthlyIntake = money(incomeMonthly + additionalIncomeMonthly);
  const totalMonthlyExpenses = money(baseExpensesMonthly + debtMonthly + projectedMortgageMonthly);
  const residualMonthlyIncome = money(totalMonthlyIntake - totalMonthlyExpenses);

  return {
    incomeMonthly: money(incomeMonthly),
    additionalIncomeMonthly: money(additionalIncomeMonthly),
    totalMonthlyIncome,
    totalMonthlyIntake,

    baseExpensesMonthly: money(baseExpensesMonthly),
    debtMonthly: money(debtMonthly),
    projectedMortgageMonthly: money(projectedMortgageMonthly),
    totalMonthlyExpenses,
    residualMonthlyIncome,

    savings: money(savings),
    targetHomePrice: money(targetHomePrice),
    creditScore: round0(creditScore),

    housingRatioPct: round2(pct(projectedMortgageMonthly, totalMonthlyIntake)),
    debtRatioPct: round2(pct(debtMonthly, totalMonthlyIntake)),
    baseExpenseRatioPct: round2(pct(baseExpensesMonthly, totalMonthlyIntake)),
    totalExpenseRatioPct: round2(pct(totalMonthlyExpenses, totalMonthlyIntake)),
    residualRatioPct: round2(pct(residualMonthlyIncome, totalMonthlyIntake)),
    savingsToPricePct: round2(pct(savings, targetHomePrice))
  };
}

// ============================================================
// //#5) SCORING
// ============================================================

export function calculateAffordabilityScore(normalized = {}) {
  let score = 100;
  const factors = [];

  const housing = n0(normalized.housingRatioPct);
  const debt = n0(normalized.debtRatioPct);
  const totalExpense = n0(normalized.totalExpenseRatioPct);
  const residual = n0(normalized.residualRatioPct);
  const savingsToPrice = n0(normalized.savingsToPricePct);
  const credit = n0(normalized.creditScore);
  const income = n0(normalized.totalMonthlyIntake);
  const mortgage = n0(normalized.projectedMortgageMonthly);

  // Required input penalties
  if (income <= 0) {
    score -= 45;
    factors.push({
      type: "risk",
      code: "missing_income",
      label: "Income is missing",
      impact: -45
    });
  }

  if (mortgage <= 0) {
    score -= 15;
    factors.push({
      type: "warning",
      code: "missing_mortgage",
      label: "Mortgage estimate is missing",
      impact: -15
    });
  }

  // Housing ratio
  if (housing > 40) {
    score -= 28;
    factors.push({
      type: "risk",
      code: "housing_over_40",
      label: "Housing payment is above 40% of monthly intake",
      impact: -28
    });
  } else if (housing > 35) {
    score -= 18;
    factors.push({
      type: "risk",
      code: "housing_over_35",
      label: "Housing payment is above the stretch lane",
      impact: -18
    });
  } else if (housing > 30) {
    score -= 10;
    factors.push({
      type: "warning",
      code: "housing_over_30",
      label: "Housing payment is above the preferred 30% planning lane",
      impact: -10
    });
  } else if (housing > 0 && housing <= 28) {
    score += 3;
    factors.push({
      type: "strength",
      code: "housing_under_28",
      label: "Housing payment sits inside a strong planning lane",
      impact: +3
    });
  }

  // Debt ratio
  if (debt > 20) {
    score -= 18;
    factors.push({
      type: "risk",
      code: "debt_over_20",
      label: "Non-housing debt is above 20% of monthly intake",
      impact: -18
    });
  } else if (debt > 12) {
    score -= 10;
    factors.push({
      type: "warning",
      code: "debt_over_12",
      label: "Non-housing debt is elevated",
      impact: -10
    });
  } else if (debt <= 8) {
    score += 3;
    factors.push({
      type: "strength",
      code: "debt_under_8",
      label: "Debt load is controlled",
      impact: +3
    });
  }

  // Total expenses
  if (totalExpense > 90) {
    score -= 30;
    factors.push({
      type: "risk",
      code: "expense_over_90",
      label: "Total monthly obligations consume most income",
      impact: -30
    });
  } else if (totalExpense > 80) {
    score -= 20;
    factors.push({
      type: "risk",
      code: "expense_over_80",
      label: "Total monthly obligations are high",
      impact: -20
    });
  } else if (totalExpense > 70) {
    score -= 10;
    factors.push({
      type: "warning",
      code: "expense_over_70",
      label: "Budget is workable but tight",
      impact: -10
    });
  } else if (totalExpense > 0 && totalExpense <= 65) {
    score += 4;
    factors.push({
      type: "strength",
      code: "expense_under_65",
      label: "Total monthly obligations are manageable",
      impact: +4
    });
  }

  // Residual
  if (residual < 0) {
    score -= 35;
    factors.push({
      type: "risk",
      code: "negative_residual",
      label: "Residual monthly income is negative",
      impact: -35
    });
  } else if (residual < 8) {
    score -= 15;
    factors.push({
      type: "warning",
      code: "low_residual",
      label: "Residual income cushion is thin",
      impact: -15
    });
  } else if (residual >= 20) {
    score += 5;
    factors.push({
      type: "strength",
      code: "strong_residual",
      label: "Residual income cushion is strong",
      impact: +5
    });
  }

  // Savings
  if (savingsToPrice >= 10) {
    score += 4;
    factors.push({
      type: "strength",
      code: "savings_over_10",
      label: "Savings position supports purchase readiness",
      impact: +4
    });
  } else if (savingsToPrice > 0 && savingsToPrice < 3) {
    score -= 6;
    factors.push({
      type: "warning",
      code: "low_savings",
      label: "Savings position is thin relative to target home price",
      impact: -6
    });
  }

  // Credit
  if (credit > 0 && credit < 620) {
    score -= 16;
    factors.push({
      type: "risk",
      code: "credit_under_620",
      label: "Credit score may limit loan options",
      impact: -16
    });
  } else if (credit >= 700) {
    score += 3;
    factors.push({
      type: "strength",
      code: "credit_over_700",
      label: "Credit score supports stronger financing options",
      impact: +3
    });
  }

  const finalScore = clamp(round0(score), 0, 100);

  return {
    score: finalScore,
    grade: scoreToGrade(finalScore),
    status: scoreToStatus(finalScore),
    statusLabel: statusLabel(scoreToStatus(finalScore)),
    factors
  };
}

// ============================================================
// //#6) MAIN API
// ============================================================

export function calculateAffordability(input = {}) {
  const normalized = normalizeAffordabilityInput(input);
  const scoring = calculateAffordabilityScore(normalized);

  const safeHousingTarget = money(normalized.totalMonthlyIntake * 0.28);
  const preferredHousingTarget = money(normalized.totalMonthlyIntake * 0.30);
  const stretchHousingTarget = money(normalized.totalMonthlyIntake * 0.35);

  const bluf =
    scoring.status === "GREEN"
      ? `Strong affordability position. Estimated housing is ${normalized.housingRatioPct}% of monthly intake.`
      : scoring.status === "CAUTION"
        ? `Workable but watch the margins. Estimated housing is ${normalized.housingRatioPct}% of monthly intake.`
        : scoring.status === "WATCH"
          ? `Tight planning lane. Estimated housing is ${normalized.housingRatioPct}% of monthly intake.`
          : `No-go until inputs improve. Estimated housing is ${normalized.housingRatioPct}% of monthly intake.`;

  return {
    ok: true,
    engineVersion: ENGINE_VERSION,

    score: scoring.score,
    grade: scoring.grade,
    status: scoring.status,
    statusLabel: scoring.statusLabel,
    bluf,

    normalized,

    lanes: {
      safeHousingTarget,
      preferredHousingTarget,
      stretchHousingTarget
    },

    ratios: {
      housingRatioPct: normalized.housingRatioPct,
      debtRatioPct: normalized.debtRatioPct,
      baseExpenseRatioPct: normalized.baseExpenseRatioPct,
      totalExpenseRatioPct: normalized.totalExpenseRatioPct,
      residualRatioPct: normalized.residualRatioPct,
      savingsToPricePct: normalized.savingsToPricePct
    },

    monthly: {
      incomeMonthly: normalized.incomeMonthly,
      additionalIncomeMonthly: normalized.additionalIncomeMonthly,
      totalMonthlyIncome: normalized.totalMonthlyIncome,
      totalMonthlyIntake: normalized.totalMonthlyIntake,
      baseExpensesMonthly: normalized.baseExpensesMonthly,
      debtMonthly: normalized.debtMonthly,
      projectedMortgageMonthly: normalized.projectedMortgageMonthly,
      totalMonthlyExpenses: normalized.totalMonthlyExpenses,
      residualMonthlyIncome: normalized.residualMonthlyIncome
    },

    factors: scoring.factors,

    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION
    }
  };
}

export function safeCalculateAffordability(input = {}) {
  try {
    return calculateAffordability(input);
  } catch (error) {
    return {
      ok: false,
      engineVersion: ENGINE_VERSION,
      error: error?.message || "Affordability calculation failed."
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
  money,

  scoreToGrade,
  scoreToStatus,
  statusLabel,

  normalizeAffordabilityInput,
  calculateAffordabilityScore,
  calculateAffordability,
  safeCalculateAffordability
});
