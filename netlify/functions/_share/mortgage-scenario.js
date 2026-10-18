// Shared complete mortgage calculation, including the existing VA fee overlay.
import {
  ENGINE_VERSION,
  calculateMortgage,
  normalizeMortgageInput,
  validateMortgageRequest,
  reconcileMortgageTotals,
  calculateBudget
} from "./mortgage-engine.js";

import {
  RATE_VERSION as OFFICIAL_VA_RATE_VERSION,
  safeCalculateVaHomeLoan
} from "./official-va.js";

function shortMoney(value) {
  const n = Math.round(Number(value) || 0);
  return `$${n.toLocaleString("en-US")}`;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    return value;
  }
  return null;
}

function isVaLoanType(loanType) {
  return String(loanType || "").trim().toLowerCase() === "va";
}

function buildVaHomeLoanInput(body, input, mortgageResult) {
  const insuranceMonthly = pickFirst(
    body.insuranceMonthly,
    body.insurance_monthly,
    input.insuranceAnnual > 0 ? input.insuranceAnnual / 12 : null
  );

  return {
    purchasePrice: input.price,
    downPayment: input.downPayment,
    priorUse: pickFirst(
      body.priorUse,
      body.prior_use,
      body.firstUse,
      body.first_use,
      "first_use"
    ),
    fundingFeeExempt: pickFirst(
      body.fundingFeeExempt,
      body.funding_fee_exempt,
      body.exempt
    ),
    financeFundingFee: pickFirst(
      body.financeFundingFee,
      body.finance_funding_fee,
      body.financedFundingFee,
      body.financed_funding_fee
    ),
    loanType: "purchase",
    apr: mortgageResult.apr,
    termYears: input.termYears,
    creditScore: input.creditScore,
    propertyTaxAnnual: input.propertyTaxAnnual,
    propertyTaxMonthly: pickFirst(body.propertyTaxMonthly, body.property_tax_monthly),
    insuranceAnnual: input.insuranceAnnual,
    insuranceMonthly,
    hoaMonthly: input.hoaMonthly,
    basePay: pickFirst(body.basePay, body.base_pay, body.basicPay, body.basic_pay),
    bah: pickFirst(body.bah, body.BAH),
    bas: pickFirst(body.bas, body.BAS),
    disability: pickFirst(
      body.disability,
      body.vaDisability,
      body.va_disability,
      body.vaDisabilityMonthly,
      body.va_disability_monthly
    ),
    rating: pickFirst(body.rating, body.vaRating, body.va_rating, body.vaDisabilityRating),
    receivesVaCompensation: pickFirst(
      body.receivesVaCompensation,
      body.receives_va_compensation
    ),
    retirement: pickFirst(body.retirement, body.retirementPay, body.retirement_pay),
    otherIncome: pickFirst(
      body.otherIncome,
      body.other_income,
      body.additionalIncome,
      body.additional_income
    ),
    monthlyDebts: pickFirst(
      body.monthlyDebts,
      body.monthly_debts,
      body.debt,
      body.monthlyDebt,
      body.monthly_debt
    ),
    familySize: pickFirst(body.familySize, body.family_size, body.householdSize),
    state: pickFirst(body.state, body.propertyState, body.property_state),
    region: pickFirst(body.region, body.vaRegion, body.va_region),
    fullEntitlement: pickFirst(body.fullEntitlement, body.full_entitlement),
    countyLoanLimit: pickFirst(body.countyLoanLimit, body.county_loan_limit),
    entitlementUsed: pickFirst(body.entitlementUsed, body.entitlement_used),
    spouse: pickFirst(body.spouse, body.hasSpouse, body.has_spouse),
    dependentParents: pickFirst(body.dependentParents, body.dependent_parents),
    childrenUnder18: pickFirst(body.childrenUnder18, body.children_under_18),
    childrenInSchoolOver18: pickFirst(
      body.childrenInSchoolOver18,
      body.children_in_school_over_18,
      body.childrenOver18School
    ),
    vaCompensationPending: pickFirst(
      body.vaCompensationPending,
      body.va_compensation_pending,
      body.disabilityPending
    ),
    purpleHeart: pickFirst(body.purpleHeart, body.purple_heart),
    maintenanceUtilitiesMonthly: pickFirst(body.maintenanceUtilitiesMonthly, body.maintenance_utilities_monthly),
    estimatedTaxesMonthly: pickFirst(body.estimatedTaxesMonthly, body.estimated_taxes_monthly),
    survivingSpouse: pickFirst(body.survivingSpouse, body.surviving_spouse)
  };
}

function applyVaHomeLoanOverlay(result, vaResult) {
  const warnings = [...(result.meta?.warnings || [])];
  const vaWarnings = Array.isArray(vaResult.warnings) ? [...vaResult.warnings] : [];

  result.mortgage.loanAmount = vaResult.totalLoanAmount;
  result.mortgage.loan_amount = vaResult.totalLoanAmount;
  result.loanAmount = vaResult.totalLoanAmount;

  result.monthly.principalInterest = vaResult.principalAndInterest;
  result.monthly.principal_interest = vaResult.principalAndInterest;
  result.monthly.pi = vaResult.principalAndInterest;

  result.monthly.propertyTax = vaResult.taxesMonthly;
  result.monthly.property_tax = vaResult.taxesMonthly;
  result.monthly.tax = vaResult.taxesMonthly;

  result.monthly.insurance = vaResult.insuranceMonthly;
  result.monthly.insuranceMonthly = vaResult.insuranceMonthly;

  result.monthly.hoa = vaResult.hoaMonthly;
  result.monthly.hoaMonthly = vaResult.hoaMonthly;
  result.monthly.hoa_monthly = vaResult.hoaMonthly;

  result.monthly.pmi = 0;
  result.monthly.pmiMonthly = 0;

  result.monthly.allIn = vaResult.totalMonthlyPayment;
  result.monthly.totalPayment = vaResult.totalMonthlyPayment;
  result.monthly.total_payment = vaResult.totalMonthlyPayment;
  result.monthly.totalMonthly = vaResult.totalMonthlyPayment;

  result.breakdown = {
    ...(result.breakdown || {}),
    pi: vaResult.principalAndInterest,
    tax: vaResult.taxesMonthly,
    insurance: vaResult.insuranceMonthly,
    hoa: vaResult.hoaMonthly,
    pmi: 0,
    allIn: vaResult.totalMonthlyPayment
  };

  result.summary = {
    ...(result.summary || {}),
    paymentLabel: shortMoney(vaResult.totalMonthlyPayment),
    payment_label: shortMoney(vaResult.totalMonthlyPayment),
    monthlyPayment: vaResult.totalMonthlyPayment,
    monthly_payment: vaResult.totalMonthlyPayment
  };

  result.financedFundingFee = vaResult.financedFundingFee;
  result.vaFundingFee = vaResult.fundingFee;
  result.vaFundingFeeRate = vaResult.fundingFeePct;
  result.baseLoanAmount = vaResult.baseLoanAmount;
  result.totalLoanAmount = vaResult.totalLoanAmount;
  result.fundingFeeExempt = vaResult.fundingFeeExempt;
  result.residualIncome = vaResult.residualIncome;
  result.requiredResidualIncome = vaResult.requiredResidualIncome;
  result.residualPass = vaResult.residualPass;
  result.dti = vaResult.dti;
  result.vaNotes = vaResult.notes || [];
  result.vaWarnings = vaWarnings;

  result.meta = {
    ...(result.meta || {}),
    officialVa: OFFICIAL_VA_RATE_VERSION,
    vaHomeLoanRulesVersion: vaResult.homeLoanRulesVersion || null,
    vaOverlayApplied: true
  };

  if (vaWarnings.length) {
    warnings.push(...vaWarnings.map((w) => `VA: ${w}`));
  }

  result.meta.warnings = warnings;

  return result;
}

function enrichWithVaHomeLoan(body, input, result) {
  if (!isVaLoanType(input.loanType)) {
    return result;
  }

  try {
    const vaInput = buildVaHomeLoanInput(body, input, result);
    const vaResult = safeCalculateVaHomeLoan(vaInput);

    if (!vaResult || vaResult.ok === false) {
      const warnings = [...(result.meta?.warnings || [])];
      const message =
        vaResult?.error || "VA home loan overlay unavailable; base mortgage math returned.";

      warnings.push(`VA: ${message}`);

      result.meta = {
        ...(result.meta || {}),
        vaOverlayApplied: false,
        officialVa: OFFICIAL_VA_RATE_VERSION,
        warnings
      };

      result.vaWarnings = [`VA home loan overlay unavailable: ${message}`];
      return result;
    }

    return applyVaHomeLoanOverlay(result, vaResult);
  } catch (error) {
    const warnings = [...(result.meta?.warnings || [])];
    const message = error?.message || "VA home loan overlay failed unexpectedly.";

    warnings.push(`VA: ${message}`);

    result.meta = {
      ...(result.meta || {}),
      vaOverlayApplied: false,
      officialVa: OFFICIAL_VA_RATE_VERSION,
      warnings
    };

    result.vaWarnings = [`VA home loan overlay unavailable: ${message}`];
    return result;
  }
}

export function calculateMortgageScenario(body) {
    const validation = validateMortgageRequest(body);
    if (validation) throw Object.assign(new Error(validation), {statusCode:400});
    const input = normalizeMortgageInput(body);

    if (input.price <= 0) throw Object.assign(new Error("Home price is required and must be greater than 0."), {statusCode:400});

    const result = calculateMortgage(input);
    const enriched = enrichWithVaHomeLoan(body, input, result);
    if (input.loanType === "va" && enriched.meta.vaOverlayApplied !== true) {
      throw Object.assign(new Error("VA funding fee calculation is unavailable. Please try again."), {statusCode:503});
    }
    reconcileMortgageTotals(enriched);
    enriched.budget = calculateBudget(body, enriched.monthly.allIn);
    enriched.meta.calculationContract = "mortgage-v2";
    // Do not present incomplete VA underwriting figures as a pass or approval.
    const required = ["basePay", "bah", "bas", "monthlyDebts", "maintenanceUtilitiesMonthly", "estimatedTaxesMonthly", "familySize", "state"];
    const residualComplete = required.every(k=>body[k] !== null && body[k] !== undefined && body[k] !== "") && Number(body.basePay) + Number(body.bah) + Number(body.bas) > 0;
    if (input.loanType === "va" && !residualComplete) {
      enriched.residualIncome = null;
      enriched.requiredResidualIncome = null;
      enriched.residualPass = null;
      enriched.dti = null;
    }

    return enriched;
}
