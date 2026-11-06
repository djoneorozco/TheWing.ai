// Fixed-rate purchase scenarios for the Military-Mortgage client.
// Existing VA/conventional calculations remain in mortgage-scenario/official-va.
// Rates are percentage points (6.25 means 6.25%); money is USD.
import { calculateMortgageScenario } from './mortgage-scenario.js';
import { monthlyPrincipalInterest, monthlyPmiEstimate, amortizationTotals, round2 } from './mortgage-engine.js';

export const MILITARY_MORTGAGE_CONTRACT = 'military-mortgage-v1';
// Verified against HUD Handbook 4000.1, revised 2026-08-12, printed page 1749.
const FHA_SOURCE = 'https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf';
const VA_SOURCE = 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/';
const FHA_UPFRONT_RATE = 0.0175;
const FHA_MIP_BASE_THRESHOLD = 726200; // HUD 4000.1 Appendix 1.0, March 20, 2023 table.

function invalid(field, message) {
  throw Object.assign(new Error(message), { code: 'INVALID_INPUT', field });
}
function number(body, key, min, max, optional = false) {
  const value = body[key];
  if (optional && (value === null || value === undefined || value === '')) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    invalid(key, `${key} must be a number from ${min} to ${max}.`);
  }
  if (['homePrice','downPayment','propertyTaxAnnual','insuranceAnnual','hoaMonthly','otherOwnershipMonthly','pmiMonthly'].includes(key) && Math.abs(value - round2(value)) > 1e-7) {
    invalid(key, `${key} must use dollars and cents (at most two decimal places).`);
  }
  return value;
}
function choice(body, key, values) {
  if (!values.includes(body[key])) invalid(key, `Choose a valid ${key}.`);
  return body[key];
}

// Standard FHA forward purchase loans only; no streamline/203(k)/special programs.
// Premium table: HUD Mortgagee Letter 2023-05, Appendix 1.0.
export function fhaPremiumTerms(baseLoan, price, years) {
  const ltv = baseLoan / price;
  const high = baseLoan > FHA_MIP_BASE_THRESHOLD;
  const annualRate = years > 15
    ? (high ? (ltv > 0.95 ? 0.0075 : 0.0070) : (ltv > 0.95 ? 0.0055 : 0.0050))
    : (high ? (ltv > 0.90 ? 0.0065 : ltv > 0.78 ? 0.0040 : 0.0015) : (ltv > 0.90 ? 0.0040 : 0.0015));
  return { annualRate, durationYears: ltv <= 0.90 ? Math.min(11, years) : years };
}

// HUD monthly premium method: first 12 opening balances, cent-rounded interest,
// annual premium rounded before removing financed upfront MIP, then /12.
// https://www.glb.hud.gov/hud-partners/housing-premium-calculation
export function fhaFirstYearMonthlyMip(loan, interestRate, payment, annualRate, financed) {
  if (loan === 0) return 0;
  let balance = loan, sum = balance;
  for (let month = 1; month < 12; month++) {
    const interest = round2(round2(balance * interestRate) / 1200);
    balance = round2(Math.max(0, balance + interest - payment));
    sum += balance;
  }
  let annual = round2(sum / 12 * annualRate);
  if (financed) annual = round2(annual / (1 + FHA_UPFRONT_RATE));
  return round2(annual / 12);
}

export function calculateMilitaryMortgage(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('request', 'Enter a mortgage scenario.');
  const loanType = choice(body, 'loanType', ['VA', 'CONVENTIONAL', 'FHA']);
  const homePrice = number(body, 'homePrice', 1, 10000000);
  const downPayment = number(body, 'downPayment', 0, homePrice);
  const interestRate = number(body, 'interestRate', 0, 30);
  // Four decimal places covers mortgage quotes and avoids numerical noise near zero.
  if (interestRate > 0 && interestRate < 0.0001) invalid('interestRate', 'Use 0% or an interest rate of at least 0.0001%.');
  const termYears = number(body, 'termYears', 1, 30);
  const creditScore = number(body, 'creditScore', 580, 850);
  if (!Number.isInteger(termYears)) invalid('termYears', 'Loan term must be a whole number of years.');
  if (!Number.isInteger(creditScore)) invalid('creditScore', 'Credit score must be a whole number.');
  const propertyTaxAnnual = number(body, 'propertyTaxAnnual', 0, 1000000);
  const insuranceAnnual = number(body, 'insuranceAnnual', 0, 1000000);
  const hoaMonthly = number(body, 'hoaMonthly', 0, 100000);
  const otherOwnershipMonthly = number(body, 'otherOwnershipMonthly', 0, 100000);
  const pmiMonthly = number(body, 'pmiMonthly', 0, 100000, true);
  const baseLoan = round2(homePrice - downPayment);
  let fee = 0, financedFee = 0, loanAmount = baseLoan, principalInterest, mortgageInsurance;
  let feeLabel = 'Upfront loan fee', insuranceNote = '', feeRate = 0;
  const notes = [];
  let vaFeeStatus = null, feePayment = null;
  let mipDurationYears = null, annualMipRate = null;

  if (loanType === 'FHA') {
    if (downPayment / homePrice < 0.035 - 1e-12) invalid('downPayment', 'FHA: enter at least 3.5% down for this purchase estimate.');
    feePayment = choice(body, 'feePayment', ['finance', 'cash']);
    feeRate = baseLoan > 0 ? FHA_UPFRONT_RATE : 0;
    fee = round2(baseLoan * feeRate);
    financedFee = feePayment === 'finance' ? fee : 0;
    loanAmount = round2(baseLoan + financedFee);
    principalInterest = round2(monthlyPrincipalInterest(loanAmount, interestRate, termYears));
    const premium = fhaPremiumTerms(baseLoan, homePrice, termYears);
    annualMipRate = baseLoan > 0 ? premium.annualRate : 0;
    mipDurationYears = baseLoan > 0 ? premium.durationYears : 0;
    mortgageInsurance = fhaFirstYearMonthlyMip(loanAmount, interestRate, principalInterest, annualMipRate, feePayment === 'finance');
    feeLabel = 'FHA upfront MIP';
    insuranceNote = `FHA MIP: first-year monthly estimate; recalculated annually as the balance falls. Duration: ${mipDurationYears} years.`;
    notes.push('Standard FHA purchase scenario. County loan limits, appraisal value, eligibility and lender approval are not evaluated.');
  } else {
    if (loanType === 'VA') {
      vaFeeStatus = choice(body, 'vaFeeStatus', ['first', 'subsequent', 'exempt']);
      feePayment = choice(body, 'feePayment', ['finance', 'cash']);
    }
    // Exact down-payment ratio avoids rounding 19.999% to 20% before PMI rules.
    const pmi = monthlyPmiEstimate({ loanType: loanType.toLowerCase(), downPercent: downPayment / homePrice * 100,
      loanAmount: baseLoan, creditScore, pmiMonthlyOverride: pmiMonthly });
    const result = calculateMortgageScenario({ loanType: loanType.toLowerCase(), price: homePrice, downPayment,
      interestRate, termYears, creditScore, propertyTaxAnnual, insuranceAnnual, hoaMonthly,
      pmiMonthly: pmi.pmiMonthly, fundingFeeExempt: vaFeeStatus === 'exempt',
      priorUse: vaFeeStatus === 'subsequent' ? 'subsequent_use' : 'first_use', financeFundingFee: feePayment === 'finance' });
    loanAmount = result.mortgage.loanAmount;
    principalInterest = result.monthly.principalInterest;
    mortgageInsurance = result.monthly.pmi;
    if (loanType === 'VA') {
      feeLabel = 'VA funding fee';
      fee = result.vaFundingFee;
      financedFee = result.financedFundingFee;
      feeRate = baseLoan > 0 ? result.vaFundingFeeRate : 0;
      insuranceNote = 'VA loans have no monthly mortgage insurance.';
      notes.push('VA fee uses the status you selected. Confirm exemption and entitlement with your lender.');
    } else {
      insuranceNote = pmi.pmiSource === 'planningEstimate'
        ? 'PMI is a planning estimate based on down payment and credit score. Enter your lender’s monthly PMI quote when available.'
        : pmi.pmiSource === 'monthlyOverride' ? 'PMI uses your monthly quote.' : 'No monthly PMI assumed at this down payment.';
    }
  }
  const monthly = { principalInterest, propertyTax: round2(propertyTaxAnnual / 12), insurance: round2(insuranceAnnual / 12),
    hoa: round2(hoaMonthly), mortgageInsurance, otherOwnership: round2(otherOwnershipMonthly) };
  monthly.mortgagePayment = round2(monthly.principalInterest + monthly.propertyTax + monthly.insurance + monthly.hoa + monthly.mortgageInsurance);
  monthly.totalHousing = round2(monthly.mortgagePayment + monthly.otherOwnership);
  const feePaidAtClosing = round2(fee - financedFee);
  return {
    ok: true, contract: MILITARY_MORTGAGE_CONTRACT, version: '1.1.0',
    inputs: { loanType, homePrice, downPayment, interestRate, termYears, creditScore, propertyTaxAnnual, insuranceAnnual,
      hoaMonthly, otherOwnershipMonthly, pmiMonthly, vaFeeStatus, feePayment },
    monthly, loan: { baseLoan, financedFee, loanAmount, fee, feeRate, feeLabel, feePaidAtClosing },
    // Reuse the canonical schedule after financed fees establish final principal.
    // These totals cover P&I only; do not extrapolate taxes or insurance premiums.
    amortization: { ...amortizationTotals(loanAmount, interestRate, termYears),
      principal: loanAmount, basis: 'fixed-rate-no-extra-payments',
      excludes: 'Taxes, insurance, HOA, other ownership costs and upfront cash are excluded.' },
    upfront: { downPayment, feePaidAtClosing, knownSubtotal: round2(downPayment + feePaidAtClosing),
      excludes: 'Other closing costs, prepaid items and escrow deposits are not included in this subtotal.' },
    mortgageInsurance: { note: insuranceNote, annualRate: annualMipRate, durationYears: mipDurationYears },
    notes, sources: loanType === 'VA' ? [VA_SOURCE] : loanType === 'FHA' ? [FHA_SOURCE] : [],
    assumptions: { rateMeaning: 'note-interest-rate-not-apr', fixedRate: true, purchaseOnly: true,
      appraisalValue: 'Assumed equal to purchase price.', rulesChecked: '2026-11-06',
      excludedCosts: 'Only ownership costs entered above are included. Taxes, insurance, dues and premiums may change.' }
  };
}
