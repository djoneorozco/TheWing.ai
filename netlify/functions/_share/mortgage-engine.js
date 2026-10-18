// netlify/functions/_share/mortgage-engine.js
// ============================================================
// TheWing.ai • Shared Mortgage Engine
// v1.1.0
//
// FILE
// - netlify/functions/_share/mortgage-engine.js
//
// PURPOSE
// - Shared deterministic mortgage math module for TheWing.ai
// - Used by:
//   1) netlify/functions/mortgage.js
//   2) future brain.js / opensource-brain.js integrations
//   3) Housing Calculator
//   4) Financial Dashboard
//   5) Affordability scoring
//   6) Decision Brief / Ask Amy future flows
//
// DESIGN
// - NO Netlify handler in this file
// - NO Supabase dependency
// - NO OpenAI dependency
// - Pure reusable mortgage functions only
// - ES Module exports for TheWing repo with "type": "module"
//
// MAIN EXPORTS
// - normalizeMortgageInput(body)
// - calculateMortgage(inputOrBody)
// - safeCalculateMortgage(inputOrBody)
// - monthlyPrincipalInterest(loanAmount, aprPct, termYears)
// - amortizationTotals(loanAmount, aprPct, termYears)
// - aprFromCreditScore(score)
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const ENGINE_VERSION = "thewing-mortgage-engine-shared-1.2.0";

// ============================================================
// //#2) BASIC HELPERS
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

export function shortMoney(value) {
  const n = round0(value);
  return `$${n.toLocaleString("en-US")}`;
}

export function pctFromAmount(amount, base) {
  const a = Math.max(0, n0(amount));
  const b = Math.max(0, n0(base));

  if (b <= 0) return 0;

  return (a / b) * 100;
}

export function amountFromPct(base, pct) {
  const b = Math.max(0, n0(base));
  const p = clamp(n0(pct), 0, 100);

  return b * (p / 100);
}

export function normalizeRateToFraction(rate) {
  const r = n0(rate);

  if (r <= 0) return 0;

  // Supports both:
  // - 1.2   = 1.2%
  // - 0.012 = 1.2%
  if (r > 0.25) return r / 100;

  return r;
}


// Missing and zero are deliberately different in public financial inputs.
export function optionalNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "boolean" || (typeof value !== "number" && typeof value !== "string")) continue;
    if (typeof value === "string" && !value.trim()) continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function projectedPmiMonths(loan, rate, years, originalValue, monthlyPmi) {
  if (!(loan > 0) || !(monthlyPmi > 0)) return 0;
  const months = years * 12;
  const payment = monthlyPrincipalInterest(loan, rate, years);
  let balance = loan;
  for (let month = 1; month <= months; month++) {
    balance = Math.max(0, balance * (1 + rate / 1200) - payment);
    if (balance <= originalValue * 0.78 + 0.000001) return month - 1;
    if (month >= months / 2) return month;
  }
  return months;
}

// Run after the VA fee overlay so every total uses the final financed principal.
export function reconcileMortgageTotals(result) {
  const m = result.mortgage, v = result.monthly, input = result.inputs;
  const amort = amortizationTotals(m.loanAmount, m.apr, m.termYears);
  const pmiMonths = projectedPmiMonths(m.loanAmount, m.apr, m.termYears, m.price, v.pmi);
  const tax = input.propertyTaxAnnual / 12 * amort.months;
  const insurance = input.insuranceAnnual / 12 * amort.months;
  const hoa = v.hoa * amort.months, pmi = v.pmi * pmiMonths;
  const total = round2(amort.totalPaymentsPI + tax + insurance + hoa + pmi);
  Object.assign(result.totals, {
    months:amort.months, pmiMonths,
    principalInterestTotal:amort.totalPaymentsPI, principal_interest_total:amort.totalPaymentsPI,
    totalInterest:amort.totalInterest, total_interest:amort.totalInterest,
    propertyTaxTotal:round2(tax), property_tax_total:round2(tax),
    insuranceTotal:round2(insurance), insurance_total:round2(insurance),
    hoaTotal:round2(hoa), hoa_total:round2(hoa), pmiTotal:round2(pmi), pmi_total:round2(pmi),
    outOfPocketTotal:total, out_of_pocket_total:total, scheduledHousingPayments:total
  });
  result.upfrontKnown = {
    downPayment:m.downPayment,
    fundingFeePaidAtClosing:round2(Math.max(0, (result.vaFundingFee || 0) - (result.financedFundingFee || 0))),
    excludes:"Closing costs, prepaid expenses and escrow deposits are not included."
  };
  result.upfrontKnown.total = round2(result.upfrontKnown.downPayment + result.upfrontKnown.fundingFeePaidAtClosing);
  return result;
}

export function calculateBudget(body, monthlyHousing) {
  const income = optionalNumber(body.takeHomeMonthly);
  const expenses = optionalNumber(body.otherExpensesMonthly);
  const missing = [];
  if (income === null) missing.push("takeHomeMonthly");
  if (expenses === null) missing.push("otherExpensesMonthly");
  if (missing.length) return {complete:false, missing, income, expenses, remainder:null, remainderPct:null};
  const remainder = round2(income - monthlyHousing - expenses);
  return {complete:true, missing:[], income, expenses, housing:monthlyHousing,
    totalOutflow:round2(monthlyHousing + expenses), remainder,
    remainderPct:income > 0 ? round2(remainder / income * 100) : null,
    note:"Projected cash flow after this housing payment and your entered other expenses. No buying range or lending qualification is inferred."};
}

export function validateMortgageRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Send a JSON object.";
  const groups = [
    ["price","homePrice","home_price","purchasePrice","purchase_price","projectedHomePrice","projected_home_price"],
    ["downPayment","downpayment","down_payment","dpAmt","dpAmount"],
    ["interestRate","interest_rate","apr","aprOverride","apr_override"],
    ["creditScore","credit_score","score","fico"], ["termYears","term_years","term"],
    ["propertyTaxAnnual","property_tax_annual","taxAnnual","tax_annual","propertyTaxPercent","propertyTaxRate","property_tax_rate","taxRate","tax_rate"],
    ["insuranceAnnual","insurance_annual","insuranceMonthly","insurance_monthly","insurancePercent","insAnnual","ins_annual","insuranceRate","insurance_rate","insRate","ins_rate","pmiRate","pmi_rate"],
    ["hoaMonthly","hoa_monthly","hoa","pmiMonthly","pmi_monthly","pmi","pmiMonthlyOverride","pmi_monthly_override"],
    ["takeHomeMonthly","otherExpensesMonthly","monthlyDebts","maintenanceUtilitiesMonthly","estimatedTaxesMonthly"]
  ];
  for (const keys of groups) for (const key of keys) {
    const v = body[key];
    if (v === null || v === undefined || v === "") continue;
    const n = optionalNumber(v);
    if (n === null || n < 0 || n > 100000000) return `Invalid ${key}: enter a non-negative number.`;
  }
  for (const name of ["cityDefaults","city_defaults"]) {
    const defaults = body[name];
    if (defaults === undefined || defaults === null) continue;
    if (typeof defaults !== "object" || Array.isArray(defaults)) return "City defaults must be an object.";
    for (const keys of groups.slice(5,8)) for (const key of keys) {
      const v = defaults[key];
      if (v === undefined || v === null || v === "") continue;
      const n = optionalNumber(v);
      if (n === null || n < 0 || n > 100000000) return `Invalid city default: ${key}.`;
    }
  }
  for (const key of ["down","down_raw","downRaw"]) {
    const v = body[key];
    if (v !== undefined && v !== null && v !== "" && (optionalNumber(v) === null || Number(v) < 0)) return "Invalid down payment.";
  }
  const price = optionalNumber(...groups[0].map(k=>body[k]));
  if (!(price > 0)) return "Home price must be greater than zero.";
  for (const key of ["downPct","down_pct","down_payment_pct","downPaymentPct"]) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      const pct = optionalNumber(body[key]);
      if (pct === null || pct < 0 || pct > 100) return "Down payment percentage must be between 0 and 100.";
    }
  }
  const down = optionalNumber(...groups[1].map(k=>body[k]));
  if (down !== null && down > price) return "Down payment cannot exceed home price.";
  const rate = optionalNumber(...groups[2].map(k=>body[k]));
  if (rate !== null && rate > 30) return "Interest rate must be between 0 and 30 percent.";
  const credit = optionalNumber(...groups[3].map(k=>body[k]));
  if (credit !== null && (!Number.isInteger(credit) || credit < 300 || credit > 850)) return "Credit score must be an integer from 300 to 850.";
  const term = optionalNumber(...groups[4].map(k=>body[k]));
  if (term !== null && (!Number.isInteger(term) || term < 1 || term > 40)) return "Term must be 1 to 40 whole years.";
  const lt = String(body.loanType || body.loan_type || "conventional").toLowerCase();
  if (!["va","conventional"].includes(lt)) return "FHA and other loan programs are not supported. Use VA or conventional.";
  return null;
}

// ============================================================
// //#3) APR MODEL
// ============================================================

export function aprFromCreditScore(score) {
  const s = clamp(Math.floor(n0(score) || 720), 300, 850);

  // Deterministic planning APR tiers.
  // These are estimates, not lender quotes.
  if (s >= 780) return 6.10;
  if (s >= 760) return 6.25;
  if (s >= 740) return 6.45;
  if (s >= 720) return 6.65;
  if (s >= 700) return 6.95;
  if (s >= 680) return 7.25;
  if (s >= 660) return 7.55;
  if (s >= 640) return 7.85;

  return 8.25;
}

export function resolveApr({ creditScore, aprOverride } = {}) {
  const forced = optionalNumber(aprOverride);

  if (forced !== null && forced >= 0) {
    return {
      apr: Number(forced.toFixed(4)),
      aprSource: "override"
    };
  }

  const score = clamp(round0(creditScore || 720), 300, 850);

  return {
    apr: round2(aprFromCreditScore(score)),
    aprSource: "creditScoreTiers"
  };
}

// ============================================================
// //#4) DOWN PAYMENT MODEL
// ============================================================

export function normalizeDownPayment({
  price,
  downRaw,
  downAmountRaw,
  downPctRaw
} = {}) {
  const p = Math.max(0, n0(price));

  if (p <= 0) {
    return {
      downPayment: 0,
      downPercent: 0,
      downSource: "none"
    };
  }

  const explicitAmount = Math.max(0, n0(downAmountRaw));
  const explicitPct = n0(downPctRaw);
  const flexibleDown = n0(downRaw);

  // 1) Explicit dollar amount wins
  if (optionalNumber(downAmountRaw) !== null) {
    const downPayment = clamp(explicitAmount, 0, p);

    return {
      downPayment: round2(downPayment),
      downPercent: round2(pctFromAmount(downPayment, p)),
      downSource: "amount"
    };
  }

  // 2) Explicit percent next
  if (optionalNumber(downPctRaw) !== null) {
    const pct = clamp(explicitPct, 0, 100);
    const downPayment = amountFromPct(p, pct);

    return {
      downPayment: round2(downPayment),
      downPercent: round2(pct),
      downSource: "percent"
    };
  }

  // 3) Flexible `down` behavior:
  //    <= 1 means fraction
  //    <= 100 means percent
  //    > 100 means dollar amount
  if (flexibleDown > 0 && flexibleDown <= 1) {
    const pct = flexibleDown * 100;
    const downPayment = amountFromPct(p, pct);

    return {
      downPayment: round2(downPayment),
      downPercent: round2(pct),
      downSource: "fraction"
    };
  }

  if (flexibleDown > 1 && flexibleDown <= 100) {
    const pct = flexibleDown;
    const downPayment = amountFromPct(p, pct);

    return {
      downPayment: round2(downPayment),
      downPercent: round2(pct),
      downSource: "percent"
    };
  }

  if (flexibleDown > 100) {
    const downPayment = clamp(flexibleDown, 0, p);

    return {
      downPayment: round2(downPayment),
      downPercent: round2(pctFromAmount(downPayment, p)),
      downSource: "amount"
    };
  }

  return {
    downPayment: 0,
    downPercent: 0,
    downSource: "none"
  };
}

// ============================================================
// //#5) PMI MODEL
// ============================================================

export function monthlyPmiEstimate({
  loanType,
  downPercent,
  loanAmount,
  creditScore,
  pmiRate,
  pmiMonthlyOverride
} = {}) {
  const warnings = [];
  const lt = String(loanType || "conventional").trim().toLowerCase();
  if (!["va", "conventional"].includes(lt)) throw new Error("FHA and other loan programs are not supported by this mortgage model.");
  const dp = clamp(n0(downPercent), 0, 100);
  const loan = Math.max(0, n0(loanAmount));
  const score = clamp(round0(creditScore || 720), 300, 850);
  if (lt === "va" || loan === 0) {
    return {pmiMonthly:0, pmiApplied:false, pmiSource:lt === "va" ? "va_no_monthly_pmi" : "no_loan", warnings};
  }
  const override = optionalNumber(pmiMonthlyOverride);
  if (override !== null) {
    return {pmiMonthly:round2(override), pmiApplied:override > 0, pmiSource:"monthlyOverride", warnings};
  }

  if (dp >= 20) {
    return {
      pmiMonthly: 0,
      pmiApplied: false,
      pmiSource: "down_payment_20_plus",
      warnings
    };
  }

  if (loan <= 0) {
    warnings.push("PMI: loanAmount invalid, PMI forced to 0.");

    return {
      pmiMonthly: 0,
      pmiApplied: false,
      pmiSource: "invalid_loan",
      warnings
    };
  }

  const explicitRate = n0(pmiRate);

  if (optionalNumber(pmiRate) !== null) {
    const annualFraction = normalizeRateToFraction(explicitRate);
    const pmiMonthly = (loan * annualFraction) / 12;

    return {
      pmiMonthly: round2(pmiMonthly),
      pmiApplied: pmiMonthly > 0,
      pmiSource: "rateOverride",
      warnings
    };
  }

  // Planning estimate based on down payment + credit.
  let annualRate = 0;

  if (dp >= 15) annualRate = 0.0035;
  else if (dp >= 10) annualRate = 0.0050;
  else if (dp >= 5) annualRate = 0.0070;
  else annualRate = 0.0090;

  if (score < 680) annualRate += 0.0010;
  if (score < 640) annualRate += 0.0015;

  const annual = loan * annualRate;

  return {
    pmiMonthly: round2(annual / 12),
    pmiApplied: annual > 0,
    pmiSource: "planningEstimate",
    warnings
  };
}

// ============================================================
// //#6) PAYMENT MATH
// ============================================================

export function monthlyPrincipalInterest(loanAmount, aprPct, termYears) {
  const loan = Math.max(0, n0(loanAmount));
  const apr = Math.max(0, n0(aprPct)) / 100;
  const years = Math.max(1, round0(termYears) || 30);
  const months = years * 12;
  const monthlyRate = apr / 12;

  if (loan <= 0) return 0;
  if (monthlyRate <= 0) return loan / months;

  const pow = Math.pow(1 + monthlyRate, months);
  const payment = loan * monthlyRate * pow / (pow - 1);

  return Number.isFinite(payment) ? payment : 0;
}

export function amortizationTotals(loanAmount, aprPct, termYears) {
  const loan = Math.max(0, n0(loanAmount));
  const apr = Math.max(0, n0(aprPct)) / 100;
  const years = Math.max(1, round0(termYears) || 30);
  const months = years * 12;
  const monthlyRate = apr / 12;

  if (loan <= 0) {
    return {
      months,
      monthly_pi: 0,
      monthlyPI: 0,
      total_payments_pi: 0,
      totalPaymentsPI: 0,
      total_interest: 0,
      totalInterest: 0
    };
  }

  if (monthlyRate <= 0) {
    const monthlyPI = loan / months;

    return {
      months,
      monthly_pi: round2(monthlyPI),
      monthlyPI: round2(monthlyPI),
      total_payments_pi: round2(monthlyPI * months),
      totalPaymentsPI: round2(monthlyPI * months),
      total_interest: 0,
      totalInterest: 0
    };
  }

  const monthlyPI = monthlyPrincipalInterest(loan, aprPct, years);

  let balance = loan;
  let totalInterest = 0;

  for (let i = 0; i < months; i += 1) {
    const interest = balance * monthlyRate;
    const principal = monthlyPI - interest;

    totalInterest += interest;
    balance = Math.max(0, balance - principal);
  }

  return {
    months,
    monthly_pi: round2(monthlyPI),
    monthlyPI: round2(monthlyPI),
    total_payments_pi: round2(monthlyPI * months),
    totalPaymentsPI: round2(monthlyPI * months),
    total_interest: round2(totalInterest),
    totalInterest: round2(totalInterest)
  };
}

// ============================================================
// //#7) INPUT NORMALIZATION
// ============================================================

export function normalizeMortgageInput(body = {}) {
  const cityDefaults =
    body.city_defaults && typeof body.city_defaults === "object"
      ? body.city_defaults
      : body.cityDefaults && typeof body.cityDefaults === "object"
        ? body.cityDefaults
        : {};

  const price = Math.max(
    0,
    firstNumber(
      body.price,
      body.projected_home_price,
      body.projectedHomePrice,
      body.homePrice,
      body.home_price,
      body.purchasePrice,
      body.purchase_price
    )
  );

  const downRaw = firstNumber(
    body.down,
    body.down_raw,
    body.downRaw
  );

  const downAmountRaw = optionalNumber(
    body.downpayment,
    body.downPayment,
    body.down_payment,
    body.dpAmt,
    body.dpAmount
  );

  const downPctRaw = optionalNumber(
    body.downPct,
    body.down_pct,
    body.down_payment_pct,
    body.downPaymentPct
  );

  const normalizedDown = normalizeDownPayment({
    price,
    downRaw,
    downAmountRaw,
    downPctRaw
  });

  const creditScore = clamp(
    round0(
      firstNumber(
        body.credit_score,
        body.creditScore,
        body.score,
        body.fico,
        720
      )
    ),
    300,
    850
  );

  const termYears = clamp(
    round0(
      firstNumber(
        body.term_years,
        body.termYears,
        body.term,
        30
      )
    ),
    1,
    40
  );

  const loanType = firstString(
    body.loan_type,
    body.loanType,
    "conventional"
  ).toLowerCase();

  const aprOverride = optionalNumber(body.interestRate, body.interest_rate, body.apr_override, body.aprOverride, body.apr);
  const pmiRate = optionalNumber(body.pmi_rate, body.pmiRate);
  const pmiMonthlyOverride = optionalNumber(body.pmi_monthly, body.pmiMonthly, body.pmi,
    body.pmiMonthlyOverride, body.pmi_monthly_override);

  // ------------------------------------------------------------
  // Property Tax
  // ------------------------------------------------------------
  const propertyTaxAnnualInput = optionalNumber(
      body.property_tax_annual,
      body.propertyTaxAnnual,
      body.taxAnnual,
      body.tax_annual
  );

  const propertyTaxRateInput = optionalNumber(
      body.property_tax_rate,
      body.propertyTaxRate,
      body.taxRate,
      body.tax_rate
  );

  const cityTaxAnnual = optionalNumber(
      cityDefaults.property_tax_annual,
      cityDefaults.propertyTaxAnnual,
      cityDefaults.taxAnnual,
      cityDefaults.tax_annual
  );

  const cityTaxRate = optionalNumber(
      cityDefaults.property_tax_rate,
      cityDefaults.propertyTaxRate,
      cityDefaults.taxRate,
      cityDefaults.tax_rate
  );

  let propertyTaxAnnual = 0;
  let propertyTaxSource = "none";

  if (optionalNumber(body.propertyTaxPercent) !== null) {
    propertyTaxAnnual = price * Number(body.propertyTaxPercent) / 100;
    propertyTaxSource = "inputPercent";
  } else if (propertyTaxAnnualInput !== null) {
    propertyTaxAnnual = propertyTaxAnnualInput;
    propertyTaxSource = "inputAnnual";
  } else if (propertyTaxRateInput !== null && price > 0) {
    propertyTaxAnnual = price * normalizeRateToFraction(propertyTaxRateInput);
    propertyTaxSource = "inputRate";
  } else if (cityTaxAnnual !== null) {
    propertyTaxAnnual = cityTaxAnnual;
    propertyTaxSource = "cityDefaultAnnual";
  } else if (cityTaxRate !== null && price > 0) {
    propertyTaxAnnual = price * normalizeRateToFraction(cityTaxRate);
    propertyTaxSource = "cityDefaultRate";
  } else if (price > 0) {
    propertyTaxAnnual = price * 0.012;
    propertyTaxSource = "fallback_1_2_percent";
  }

  // ------------------------------------------------------------
  // Insurance
  // ------------------------------------------------------------
  const insuranceMonthlyInput = optionalNumber(
      body.insurance_monthly,
      body.insuranceMonthly,
      body.home_insurance_monthly,
      body.homeInsuranceMonthly
  );

  const insuranceAnnualInput = optionalNumber(
      body.insurance_annual,
      body.insuranceAnnual,
      body.insAnnual,
      body.ins_annual
  );

  const insuranceRateInput = optionalNumber(
      body.insurance_rate,
      body.insuranceRate,
      body.insRate,
      body.ins_rate
  );

  const cityInsuranceAnnual = optionalNumber(
      cityDefaults.insurance_annual,
      cityDefaults.insuranceAnnual,
      cityDefaults.insAnnual,
      cityDefaults.ins_annual
  );

  const cityInsuranceRate = optionalNumber(
      cityDefaults.insurance_rate,
      cityDefaults.insuranceRate,
      cityDefaults.insRate,
      cityDefaults.ins_rate
  );

  let insuranceAnnual = 0;
  let insuranceSource = "none";

  if (optionalNumber(body.insurancePercent) !== null) {
    insuranceAnnual = price * Number(body.insurancePercent) / 100;
    insuranceSource = "inputPercent";
  } else if (insuranceMonthlyInput !== null) {
    insuranceAnnual = insuranceMonthlyInput * 12;
    insuranceSource = "inputMonthly";
  } else if (insuranceAnnualInput !== null) {
    insuranceAnnual = insuranceAnnualInput;
    insuranceSource = "inputAnnual";
  } else if (insuranceRateInput !== null && price > 0) {
    insuranceAnnual = price * normalizeRateToFraction(insuranceRateInput);
    insuranceSource = "inputRate";
  } else if (cityInsuranceAnnual !== null) {
    insuranceAnnual = cityInsuranceAnnual;
    insuranceSource = "cityDefaultAnnual";
  } else if (cityInsuranceRate !== null && price > 0) {
    insuranceAnnual = price * normalizeRateToFraction(cityInsuranceRate);
    insuranceSource = "cityDefaultRate";
  } else if (price > 0) {
    insuranceAnnual = price * 0.005;
    insuranceSource = "fallback_0_5_percent";
  }

  // ------------------------------------------------------------
  // HOA
  // ------------------------------------------------------------
  const hoaMonthlyInput = optionalNumber(
      body.hoa_monthly,
      body.hoaMonthly,
      body.hoa
  );

  const cityHoaMonthly = optionalNumber(
      cityDefaults.hoa_monthly,
      cityDefaults.hoaMonthly,
      cityDefaults.hoa
  );

  const hoaMonthly =
    hoaMonthlyInput !== null
      ? hoaMonthlyInput
      : cityHoaMonthly !== null
        ? cityHoaMonthly
        : 0;

  const hoaSource =
    hoaMonthlyInput !== null
      ? "input"
      : cityHoaMonthly !== null
        ? "cityDefault"
        : "none";

  return {
    price: round2(price),

    downRaw: downRaw || null,
    downpayment: round2(normalizedDown.downPayment),
    downPayment: round2(normalizedDown.downPayment),
    downPct: round2(normalizedDown.downPercent),
    downPercent: round2(normalizedDown.downPercent),
    downSource: normalizedDown.downSource,

    credit_score: creditScore,
    creditScore,

    term_years: termYears,
    termYears,

    loan_type: loanType,
    loanType,

    apr_override: aprOverride,
    aprOverride,

    property_tax_annual: round2(propertyTaxAnnual),
    propertyTaxAnnual: round2(propertyTaxAnnual),
    propertyTaxSource,

    insurance_annual: round2(insuranceAnnual),
    insuranceAnnual: round2(insuranceAnnual),
    insuranceSource,

    hoa_monthly: round2(hoaMonthly),
    hoaMonthly: round2(hoaMonthly),
    hoaSource,

    pmi_rate: pmiRate,
    pmiRate,

    pmi_monthly_override: pmiMonthlyOverride,
    pmiMonthlyOverride,

    city_defaults: cityDefaults
  };
}

// ============================================================
// //#8) CORE CALCULATION
// ============================================================

export function calculateMortgage(inputOrBody = {}) {
  const input =
    inputOrBody &&
    inputOrBody.price !== undefined &&
    inputOrBody.propertyTaxSource !== undefined
      ? inputOrBody
      : normalizeMortgageInput(inputOrBody);

  const warnings = [];
  if (!["va", "conventional"].includes(input.loanType)) throw new Error("Unsupported loan type. Use VA or conventional.");

  const price = Math.max(0, input.price);
  const downPayment = clamp(Math.max(0, input.downPayment), 0, price);
  const downPercent = clamp(input.downPercent, 0, 100);
  const loanAmount = Math.max(0, price - downPayment);

  const aprResult = resolveApr({
    creditScore: input.creditScore,
    aprOverride: input.aprOverride
  });

  const apr = aprResult.apr;
  const aprSource = aprResult.aprSource;

  const principalInterest = monthlyPrincipalInterest(
    loanAmount,
    apr,
    input.termYears
  );

  const propertyTax = input.propertyTaxAnnual / 12;
  const insurance = input.insuranceAnnual / 12;
  const hoa = input.hoaMonthly;

  const pmiResult = monthlyPmiEstimate({
    loanType: input.loanType,
    downPercent,
    loanAmount,
    creditScore: input.creditScore,
    pmiRate: input.pmiRate,
    pmiMonthlyOverride: input.pmiMonthlyOverride
  });

  warnings.push(...pmiResult.warnings);
  if (pmiResult.pmiSource === "planningEstimate") warnings.push("PMI is a planning estimate, not a lender quote. Enter your quoted monthly PMI when available.");

  if (input.propertyTaxSource && input.propertyTaxSource.startsWith("fallback")) {
    warnings.push("Tax: no tax input/default provided; used fallback planning rate.");
  }

  if (input.insuranceSource && input.insuranceSource.startsWith("fallback")) {
    warnings.push("Insurance: no insurance input/default provided; used fallback planning rate.");
  }

  const pmi = pmiResult.pmiMonthly;

  const allIn = round2(principalInterest) + round2(propertyTax) + round2(insurance) + round2(hoa) + round2(pmi);

  const amort = amortizationTotals(
    loanAmount,
    apr,
    input.termYears
  );

  const totalTaxPaid = propertyTax * amort.months;
  const totalInsurancePaid = insurance * amort.months;
  const totalHoaPaid = hoa * amort.months;
  const pmiMonths = projectedPmiMonths(loanAmount, apr, input.termYears, price, pmi);
  const totalPmiPaid = pmi * pmiMonths;

  const totalOutOfPocket =
    amort.total_payments_pi +
    totalTaxPaid +
    totalInsurancePaid +
    totalHoaPaid +
    totalPmiPaid;

  const mortgage = {
    price: round2(price),
    downPayment: round2(downPayment),
    downpayment: round2(downPayment),
    downPercent: round2(downPercent),
    downpayment_pct: round2(downPercent),
    loanAmount: round2(loanAmount),
    loan_amount: round2(loanAmount),
    creditScore: input.creditScore,
    credit_score: input.creditScore,
    loanType: input.loanType,
    loan_type: input.loanType,
    apr: Number(apr.toFixed(4)),
    interestRate: Number(apr.toFixed(4)),
    termYears: input.termYears,
    term_years: input.termYears
  };

  const monthly = {
    principalInterest: round2(principalInterest),
    principal_interest: round2(principalInterest),
    pi: round2(principalInterest),

    propertyTax: round2(propertyTax),
    property_tax: round2(propertyTax),
    tax: round2(propertyTax),

    insurance: round2(insurance),

    hoa: round2(hoa),
    hoaMonthly: round2(hoa),
    hoa_monthly: round2(hoa),

    pmi: round2(pmi),

    allIn: round2(allIn),
    totalPayment: round2(allIn),
    total_payment: round2(allIn),
    totalMonthly: round2(allIn)
  };

  const totals = {
    months: amort.months,
    pmiMonths,
    assumptions: "Fixed interest rate; unchanged tax, insurance and HOA; PMI projection assumes current payments and original value equal to price. Excludes upfront cash, repairs and utilities.",

    principalInterestTotal: round2(amort.total_payments_pi),
    principal_interest_total: round2(amort.total_payments_pi),

    totalInterest: round2(amort.total_interest),
    total_interest: round2(amort.total_interest),

    propertyTaxTotal: round2(totalTaxPaid),
    property_tax_total: round2(totalTaxPaid),

    insuranceTotal: round2(totalInsurancePaid),
    insurance_total: round2(totalInsurancePaid),

    hoaTotal: round2(totalHoaPaid),
    hoa_total: round2(totalHoaPaid),

    pmiTotal: round2(totalPmiPaid),
    pmi_total: round2(totalPmiPaid),

    outOfPocketTotal: round2(totalOutOfPocket),
    out_of_pocket_total: round2(totalOutOfPocket)
  };

  return {
    ok: true,
    engineVersion: ENGINE_VERSION,

    inputs: input,
    mortgage,
    monthly,
    totals,

    // Compact dashboard / brain compatibility.
    apr: mortgage.apr,
    interestRate: mortgage.apr,
    aprSource,
    termYears: mortgage.termYears,
    price: mortgage.price,
    downPayment: mortgage.downPayment,
    downPercent: mortgage.downPercent,
    loanAmount: mortgage.loanAmount,

    breakdown: {
      pi: monthly.pi,
      tax: monthly.tax,
      insurance: monthly.insurance,
      hoa: monthly.hoa,
      pmi: monthly.pmi,
      allIn: monthly.allIn
    },

    summary: {
      paymentLabel: shortMoney(monthly.allIn),
      payment_label: shortMoney(monthly.allIn),
      aprLabel: `${mortgage.apr.toFixed(2)}%`,
      apr_label: `${mortgage.apr.toFixed(2)}%`,
      monthlyPayment: monthly.allIn,
      monthly_payment: monthly.allIn
    },

    meta: {
      calculationContract: "mortgage-v2",
      rateMeaning: "interest-rate-not-apr",
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      aprSource,
      pmiApplied: pmiResult.pmiApplied,
      pmiSource: pmiResult.pmiSource,
      propertyTaxSource: input.propertyTaxSource,
      insuranceSource: input.insuranceSource,
      hoaSource: input.hoaSource,
      warnings
    }
  };
}

// ============================================================
// //#9) SAFE WRAPPER
// ============================================================

export function safeCalculateMortgage(inputOrBody = {}) {
  try {
    const result = calculateMortgage(inputOrBody);

    return {
      ok: true,
      ...result
    };
  } catch (error) {
    return {
      ok: false,
      engineVersion: ENGINE_VERSION,
      error: error?.message || "Mortgage calculation failed."
    };
  }
}

// ============================================================
// //#10) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  ENGINE_VERSION,

  n0,
  round2,
  round0,
  clamp,
  firstNumber,
  firstString,
  shortMoney,
  pctFromAmount,
  amountFromPct,
  normalizeRateToFraction,

  aprFromCreditScore,
  resolveApr,

  normalizeDownPayment,
  monthlyPmiEstimate,

  monthlyPrincipalInterest,
  amortizationTotals,

  normalizeMortgageInput,
  calculateMortgage,
  safeCalculateMortgage
});

