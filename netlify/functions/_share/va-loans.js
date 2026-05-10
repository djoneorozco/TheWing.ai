// netlify/functions/_share/va-loans.js
// ============================================================
// TheWing.ai • VA Loan Guidance Engine
// v1.0.0 • ES MODULE
//
// FILE
// - netlify/functions/_share/va-loans.js
//
// PURPOSE
// - Shared deterministic VA Loan education + strategy layer
// - Gives Ask Amy / PCSUnited a more precise, less generic VA Loan brain
// - Does NOT replace lender approval, VA COE verification, underwriting,
//   appraisal, title, legal, or tax guidance
//
// DESIGN
// - NO Netlify handler
// - NO Supabase dependency
// - NO OpenAI dependency
// - NO localStorage dependency
// - Uses plain JS, deterministic outputs, and profile-aware recommendations
//
// PRIMARY USE
// import {
//   buildVaLoanTruthPacket,
//   getVaLoanGuidance,
//   analyzeVaLoanQuestion,
//   calculateVaFundingFee,
//   estimateVaPurchaseScenario
// } from "./_share/va-loans.js";
//
// MAIN EXPORTS
// - VA_LOANS_VERSION
// - VA_FUNDING_FEE_TABLE
// - VA_GUIDANCE_TOPICS
// - detectVaLoanIntent(message)
// - getVaLoanGuidance(intentOrMessage, profile, scenario)
// - analyzeVaLoanQuestion(message, profile, scenario)
// - calculateVaFundingFee(input)
// - estimateVaPurchaseScenario(input)
// - buildVaLoanTruthPacket({ message, profile, scenario, compensation, mortgage, affordability })
//
// OFFICIAL REFERENCE NOTES
// - Funding fee / closing cost / seller concession rules should be reviewed
//   periodically against VA.gov.
// - This module intentionally phrases VA Loan facts with caution:
//   “generally,” “may,” “often,” “eligible borrower,” “lender determines,” etc.
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const VA_LOANS_VERSION = "va-loans-2026.1";

// ============================================================
// //#2) OFFICIAL-STYLE CONSTANTS
// ============================================================
//
// Funding fee table:
// Current VA purchase/cash-out funding fee structure is commonly represented
// by first use vs subsequent use and down payment tier.
// This module uses the modern VA funding fee percentages:
// - Purchase / construction:
//   First use: 2.15% with <5% down, 1.50% with 5-9.99%, 1.25% with 10%+
//   Subsequent use: 3.30% with <5% down, 1.50% with 5-9.99%, 1.25% with 10%+
// - IRRRL: 0.50%
// - Manufactured home not permanently affixed: 1.00%
// - Assumption: 0.50%
// - Vendee: 2.25%
//
// Keep these values centralized so future updates only happen here.
// ============================================================

export const VA_FUNDING_FEE_TABLE = Object.freeze({
  version: "VA funding fee table reference 2026.1",
  purchase: {
    first_use: [
      {
        minDownPct: 0,
        maxDownPct: 4.999999,
        feePct: 0.0215,
        label: "First use, less than 5% down"
      },
      {
        minDownPct: 5,
        maxDownPct: 9.999999,
        feePct: 0.015,
        label: "First use, 5% to 9.99% down"
      },
      {
        minDownPct: 10,
        maxDownPct: Infinity,
        feePct: 0.0125,
        label: "First use, 10% or more down"
      }
    ],
    subsequent_use: [
      {
        minDownPct: 0,
        maxDownPct: 4.999999,
        feePct: 0.033,
        label: "Subsequent use, less than 5% down"
      },
      {
        minDownPct: 5,
        maxDownPct: 9.999999,
        feePct: 0.015,
        label: "Subsequent use, 5% to 9.99% down"
      },
      {
        minDownPct: 10,
        maxDownPct: Infinity,
        feePct: 0.0125,
        label: "Subsequent use, 10% or more down"
      }
    ]
  },
  cash_out_refinance: {
    first_use: 0.0215,
    subsequent_use: 0.033
  },
  irrrl: 0.005,
  manufactured_home_not_permanently_affixed: 0.01,
  assumption: 0.005,
  vendee: 0.0225
});

export const VA_LOAN_RULES = Object.freeze({
  sellerConcessionCapPct: 0.04,
  commonGuarantyCoveragePct: 0.25,
  standardOccupancyDays: 60,
  noMonthlyPmi: true,
  zeroDownPossible: true,
  vaMinimumCreditScore: null,
  fullEntitlementNoVaLoanLimit: true,
  purchaseClosingCostsCanBeFinanced: false,
  purchaseFundingFeeCanBeFinanced: true
});

// ============================================================
// //#3) GUIDANCE TOPICS
// ============================================================

export const VA_GUIDANCE_TOPICS = Object.freeze({
  overview: {
    title: "VA Loan Overview",
    bluf:
      "A VA Loan can be one of the strongest military home-buying tools when the payment, PCS timeline, and market risk still make sense.",
    key_points: [
      "Eligible borrowers may be able to buy with $0 down, but $0 down is not the same as zero cash needed.",
      "VA Loans do not require monthly private mortgage insurance.",
      "The lender still determines approval based on income, credit, debt, assets, residual income, and property eligibility.",
      "The property must generally be intended as the borrower’s primary residence.",
      "The VA benefit helps the lender by providing a guaranty; it does not guarantee that every buyer should buy."
    ],
    risks: [
      "A low down payment can leave the buyer with little equity if they PCS quickly.",
      "Buying too high against BAH can create a cash-flow trap.",
      "VA appraisal and property condition requirements can affect deal execution.",
      "Funding fee, closing costs, taxes, insurance, and maintenance still matter."
    ],
    next_steps: [
      "Confirm COE eligibility.",
      "Estimate the full all-in monthly payment.",
      "Compare payment to BAH and total monthly income.",
      "Stress test the plan against PCS timeline and likely resale/rent-out risk."
    ]
  },

  eligibility: {
    title: "VA Loan Eligibility",
    bluf:
      "Eligibility starts with service history and a Certificate of Eligibility, but loan approval still depends on the lender’s underwriting.",
    key_points: [
      "A Certificate of Eligibility helps show the lender that the borrower qualifies for the VA home loan benefit.",
      "Service requirements depend on duty status and service period.",
      "Active-duty service members, Veterans, National Guard/Reserve members, and some surviving spouses may qualify.",
      "Even with eligibility, the borrower must meet lender credit, income, occupancy, and debt requirements."
    ],
    risks: [
      "Having a COE is not the same as loan approval.",
      "Some borrowers have partial entitlement or prior VA loan usage that affects the down payment calculation.",
      "Discharge character or unresolved service records can affect eligibility."
    ],
    next_steps: [
      "Request or confirm the COE.",
      "Check whether entitlement is full or partial.",
      "Compare at least two VA-experienced lenders."
    ]
  },

  zero_down: {
    title: "Zero Down",
    bluf:
      "$0 down is often possible for eligible VA borrowers with sufficient entitlement, but it should be treated as a tool, not a green light.",
    key_points: [
      "A VA-backed purchase loan often allows eligible borrowers to buy without a required down payment.",
      "No down payment does not remove the need for closing costs, cash reserves, moving costs, inspections, or maintenance funds.",
      "A down payment can still be useful because it may reduce the funding fee and monthly payment.",
      "If entitlement is partial, the lender may require a down payment to satisfy guaranty requirements."
    ],
    risks: [
      "Low equity can be risky if orders change quickly.",
      "Rolling the funding fee into the loan increases the loan balance.",
      "A buyer may feel approved but still be financially stretched."
    ],
    next_steps: [
      "Estimate $0 down and with-down-payment scenarios side by side.",
      "Review cash reserves after closing.",
      "Check whether the down payment would reduce the funding fee tier."
    ]
  },

  funding_fee: {
    title: "VA Funding Fee",
    bluf:
      "The VA funding fee is a one-time cost for many VA borrowers, but some borrowers are exempt.",
    key_points: [
      "The fee depends on loan type, prior VA loan usage, and down payment tier.",
      "For purchase loans, the funding fee may be paid at closing or financed into the loan.",
      "Borrowers receiving VA disability compensation are commonly exempt.",
      "Active-duty Purple Heart recipients and certain surviving spouses may also qualify for exemption.",
      "The funding fee is separate from lender fees, title fees, taxes, insurance, and prepaid costs."
    ],
    risks: [
      "Financing the funding fee increases the loan amount and total interest paid.",
      "A borrower expecting exemption should confirm status before closing.",
      "If VA disability is pending, the funding fee treatment may require follow-up or refund handling."
    ],
    next_steps: [
      "Confirm funding fee exemption on the COE or with the lender.",
      "Calculate the funding fee both financed and paid at closing.",
      "Compare first-use vs subsequent-use fee status."
    ]
  },

  no_pmi: {
    title: "No Monthly PMI",
    bluf:
      "One of the strongest VA Loan advantages is that it does not require monthly private mortgage insurance.",
    key_points: [
      "Conventional loans often require PMI when the down payment is below 20%.",
      "VA Loans do not require monthly PMI, even when the borrower puts $0 down.",
      "No PMI can improve monthly affordability compared with a low-down-payment conventional loan.",
      "The funding fee is a separate one-time VA program cost and should not be confused with PMI."
    ],
    risks: [
      "No PMI does not mean the payment is automatically affordable.",
      "Taxes, insurance, HOA, maintenance, and utilities can still push the payment beyond a safe range."
    ],
    next_steps: [
      "Compare VA all-in payment against conventional with PMI.",
      "Do not evaluate affordability from principal and interest only."
    ]
  },

  appraisal: {
    title: "VA Appraisal",
    bluf:
      "The VA appraisal protects the lender and checks minimum property requirements; it is not a substitute for a home inspection.",
    key_points: [
      "The VA appraisal helps establish value and whether the property meets minimum property requirements.",
      "The appraisal can create repair conditions before closing.",
      "A home inspection is optional in many transactions but strongly recommended.",
      "The inspection is for the buyer’s understanding of property condition, not the VA guaranty."
    ],
    risks: [
      "Skipping an inspection can hide expensive issues.",
      "A VA appraisal condition can slow the deal or require negotiation.",
      "A house can appraise but still have maintenance risks."
    ],
    next_steps: [
      "Order an independent home inspection.",
      "Ask the agent and lender how likely the property is to clear VA appraisal.",
      "Budget for repairs even if the seller handles appraisal-required items."
    ]
  },

  occupancy: {
    title: "Occupancy",
    bluf:
      "A VA Loan is generally for a primary residence, not a pure investment property.",
    key_points: [
      "The borrower generally certifies intent to occupy the home as a primary residence.",
      "Standard occupancy is often expected within a reasonable period after closing.",
      "Active-duty PCS situations can have practical exceptions, but they must be handled carefully with the lender.",
      "A spouse or dependent may satisfy occupancy in certain circumstances."
    ],
    risks: [
      "Using a VA Loan as a disguised investment purchase can create compliance problems.",
      "PCS timing, deployment, and overseas orders should be disclosed and documented.",
      "Assuming rental conversion is always allowed can create lender or occupancy issues."
    ],
    next_steps: [
      "Tell the lender the actual PCS/deployment timeline.",
      "Document who will occupy the home and when.",
      "Ask the lender before making assumptions about exceptions."
    ]
  },

  seller_concessions: {
    title: "Seller Concessions",
    bluf:
      "VA can be powerful in negotiations because sellers may help with closing costs, but concessions have rules.",
    key_points: [
      "Sellers/builders may offer credits to cover some or all buyer closing costs.",
      "VA limits seller concessions to no more than 4% of the home’s reasonable value.",
      "Seller concessions can include items like funding-fee credits, debt payoff, or hazard insurance prepayment.",
      "Closing-cost credits and concessions are related but not always treated the same way."
    ],
    risks: [
      "Poorly structured concessions can be rejected or reduced.",
      "The appraisal value can limit what the transaction can support.",
      "A seller credit is useful only if the contract, lender, and title process can apply it correctly."
    ],
    next_steps: [
      "Ask the lender how much credit can be used before writing the offer.",
      "Have the agent structure the concession language clearly.",
      "Use seller help to reduce cash-to-close, not to hide an unaffordable payment."
    ]
  },

  entitlement: {
    title: "Entitlement",
    bluf:
      "Full entitlement usually means no VA loan limit, but the lender still decides what the borrower can afford and the appraisal must support value.",
    key_points: [
      "The COE shows entitlement information.",
      "With full entitlement, the VA does not set a loan limit for a qualified borrower.",
      "The lender still reviews credit, income, debts, assets, and appraisal support.",
      "With remaining or partial entitlement, the borrower may need a down payment if the VA guaranty is not enough."
    ],
    risks: [
      "A borrower may confuse VA entitlement with affordability.",
      "Prior VA loan usage can reduce available entitlement.",
      "County loan limits matter more when entitlement is not full."
    ],
    next_steps: [
      "Review the COE for entitlement status.",
      "Tell the lender about any prior VA loan still charged to entitlement.",
      "Calculate whether remaining entitlement supports the target loan."
    ]
  },

  closing_costs: {
    title: "Closing Costs",
    bluf:
      "VA does not mean zero cash to close. The funding fee may be financed, but most other purchase closing costs cannot simply be rolled into the base loan.",
    key_points: [
      "Closing costs vary by lender, location, property, taxes, insurance, and prepaid items.",
      "Seller credits may cover some or all eligible closing costs.",
      "On a purchase loan, the VA funding fee can generally be financed.",
      "Other purchase closing costs typically must be paid at closing through buyer funds, credits, or negotiated seller/lender credits."
    ],
    risks: [
      "A buyer can be approved but short on cash to close.",
      "Prepaids and escrow setup can surprise first-time buyers.",
      "Rate buydowns and points must be evaluated against expected time in the home."
    ],
    next_steps: [
      "Request a Loan Estimate.",
      "Ask for estimated cash to close, not just monthly payment.",
      "Stress test cash reserves after closing."
    ]
  },

  pcs_strategy: {
    title: "PCS Housing Strategy",
    bluf:
      "The VA Loan is a tool. The PCS decision still has to pass the timeline, cash-flow, exit-strategy, and market-risk test.",
    key_points: [
      "Buying can make sense when the payment is safe, timeline is long enough, and the exit strategy is realistic.",
      "Renting can be smarter when PCS timeline is short, market risk is high, or cash reserves are thin.",
      "BAH should not be treated as a permission slip to max out housing.",
      "A strong PCS plan includes a resale and rent-out fallback."
    ],
    risks: [
      "Short holding period plus low equity can create negative-sale risk.",
      "Maintenance and vacancy risk can turn a good payment into a bad plan.",
      "A strong mortgage approval can still be a weak PCS decision."
    ],
    next_steps: [
      "Compare rent vs buy using expected time on station.",
      "Estimate resale break-even and rental fallback.",
      "Keep emergency reserves separate from down payment."
    ]
  },

  when_not_to_buy: {
    title: "When Not To Buy",
    bluf:
      "A VA Loan should help you buy well, not help you force a risky purchase.",
    key_points: [
      "Do not buy just because the loan allows $0 down.",
      "Do not buy if the all-in payment leaves no monthly buffer.",
      "Do not buy if the PCS timeline is too short for transaction costs and market movement.",
      "Do not buy if you cannot handle maintenance, vacancy, or unexpected repairs."
    ],
    risks: [
      "Negative equity risk after a short stay.",
      "House-poor cash flow.",
      "Stress from repairs, tenants, or forced sale under orders."
    ],
    next_steps: [
      "Lower the target price.",
      "Increase cash reserves.",
      "Rent first if the market/timeline is unclear.",
      "Re-run the scenario with conservative assumptions."
    ]
  }
});

// ============================================================
// //#4) BASIC HELPERS
// ============================================================

function clean(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,%\s,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function round0(value) {
  return Math.round(Number(value) || 0);
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
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

function boolish(value, fallback = false) {
  if (typeof value === "boolean") return value;

  const s = lower(value);

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "with",
      "dependent",
      "dependents",
      "with_dependents",
      "with dependents",
      "married",
      "spouse",
      "family",
      "exempt",
      "eligible"
    ].includes(s)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "without",
      "single",
      "none",
      "without_dependents",
      "without dependents",
      "not exempt",
      "ineligible"
    ].includes(s)
  ) {
    return false;
  }

  if (typeof value === "number") return value > 0;

  return fallback;
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

function pct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(2).replace(/\.00$/, "")}%`;
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

function cloneArray(arr) {
  return Array.isArray(arr) ? [...arr] : [];
}

function uniqueArray(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

// ============================================================
// //#5) INPUT NORMALIZATION
// ============================================================

export function normalizeVaLoanProfile(profile = {}) {
  const safe = profile && typeof profile === "object" ? profile : {};

  const fullName = clean(
    pickFirst(
      safe.full_name,
      safe.fullName,
      safe.name,
      safe.display_name,
      safe.displayName
    )
  );

  const mode = normalizeMilitaryMode(
    pickFirst(
      safe.mode,
      safe.military_status,
      safe.militaryStatus,
      safe.user_type,
      safe.userType,
      safe.status
    )
  );

  const vaDisability = toNullableNumber(
    pickFirst(
      safe.va_disability,
      safe.vaDisability,
      safe.va_rating,
      safe.vaRating,
      safe.disability,
      safe.disabilityRating
    )
  );

  const familySize = toNullableNumber(
    pickFirst(
      safe.family_size,
      safe.familySize,
      safe.household_size,
      safe.householdSize,
      safe.family
    )
  );

  const hasDependents = boolish(
    pickFirst(
      safe.hasDependents,
      safe.withDependents,
      safe.with_dependents,
      safe.dependents,
      safe.family
    ),
    familySize ? familySize > 1 : false
  );

  return stripEmpty({
    email: clean(safe.email),
    full_name: fullName,
    first_name: clean(pickFirst(safe.first_name, safe.firstName, fullName.split(/\s+/)[0])),
    mode,
    military_status: mode,

    rank: clean(pickFirst(safe.rank, safe.rank_paygrade, safe.rankPaygrade)),
    rank_paygrade: clean(pickFirst(safe.rank_paygrade, safe.rankPaygrade, safe.paygrade, safe.rank)),
    yos: toNullableNumber(pickFirst(safe.yos, safe.yearsOfService, safe.years_of_service)),

    base: clean(pickFirst(safe.base, safe.pcsBase, safe.pcs_base, safe.installation, safe.dutyStation, safe.duty_station)),
    zip: clean(pickFirst(safe.zip, safe.base_zip, safe.baseZip, safe.bah_zip, safe.bahZip)),

    family_size: familySize,
    has_dependents: hasDependents,

    va_disability: vaDisability,
    likely_funding_fee_exempt: isLikelyFundingFeeExempt(safe),

    projected_home_price: toNullableNumber(
      pickFirst(
        safe.projected_home_price,
        safe.projectedHomePrice,
        safe.home_price,
        safe.homePrice,
        safe.price,
        safe.housing,
        safe.housingPrice
      )
    ),

    downpayment: toNullableNumber(
      pickFirst(
        safe.downpayment,
        safe.downPayment,
        safe.down_payment,
        safe.dpAmt,
        safe.savingsOverride
      )
    ),

    credit_score: toNullableNumber(
      pickFirst(safe.credit_score, safe.creditScore, safe.fico, safe.score)
    ),

    monthly_expenses: toNullableNumber(
      pickFirst(
        safe.monthly_expenses,
        safe.monthlyExpenses,
        safe.expenses,
        safe.expensesOverride
      )
    ),

    monthly_income: toNullableNumber(
      pickFirst(
        safe.monthly_income,
        safe.monthlyIncome,
        safe.income,
        safe.total_monthly_income,
        safe.totalMonthlyIncome,
        safe.total_monthly,
        safe.totalMonthly
      )
    ),

    debt: toNullableNumber(
      pickFirst(
        safe.debt,
        safe.monthly_debt,
        safe.monthlyDebt,
        safe.debt_monthly,
        safe.debtPayments,
        safe.non_housing_debt,
        safe.nonHousingDebt
      )
    )
  });
}

export function normalizeVaLoanScenario(input = {}) {
  const safe = input && typeof input === "object" ? input : {};

  const price = toNullableNumber(
    pickFirst(
      safe.price,
      safe.purchasePrice,
      safe.purchase_price,
      safe.homePrice,
      safe.home_price,
      safe.projected_home_price,
      safe.projectedHomePrice
    )
  );

  const downpayment = toNumber(
    pickFirst(
      safe.downpayment,
      safe.downPayment,
      safe.down_payment,
      safe.dpAmt,
      safe.cashDown,
      safe.cash_down
    ),
    0
  );

  const priorUse = normalizePriorUse(
    pickFirst(
      safe.priorUse,
      safe.prior_use,
      safe.vaPriorUse,
      safe.va_prior_use,
      safe.usedVaBefore,
      safe.used_va_before,
      safe.firstUse,
      safe.first_use
    )
  );

  const loanType = normalizeLoanType(
    pickFirst(safe.loanType, safe.loan_type, safe.type, "purchase")
  );

  const fundingFeeExempt = boolish(
    pickFirst(
      safe.fundingFeeExempt,
      safe.funding_fee_exempt,
      safe.vaFundingFeeExempt,
      safe.va_funding_fee_exempt,
      safe.exempt
    ),
    false
  );

  return stripEmpty({
    loanType,
    price,
    purchasePrice: price,
    appraisedValue: toNullableNumber(
      pickFirst(
        safe.appraisedValue,
        safe.appraised_value,
        safe.reasonableValue,
        safe.reasonable_value,
        safe.value
      )
    ),
    downpayment,
    downPayment: downpayment,
    downPaymentPct: price && price > 0 ? round2(downpayment / price) : 0,
    priorUse,
    firstUse: priorUse === "first_use",
    fundingFeeExempt,
    creditScore: toNullableNumber(
      pickFirst(safe.creditScore, safe.credit_score, safe.fico, safe.score)
    ),
    loanAmountBeforeFundingFee: price ? Math.max(0, price - downpayment) : null,
    occupancyIntent: normalizeOccupancyIntent(
      pickFirst(safe.occupancyIntent, safe.occupancy_intent, safe.occupancy, safe.primaryResidence, safe.primary_residence)
    ),
    pcsTimelineMonths: toNullableNumber(
      pickFirst(safe.pcsTimelineMonths, safe.pcs_timeline_months, safe.monthsOnStation, safe.months_on_station, safe.timelineMonths)
    ),
    expectedHoldMonths: toNullableNumber(
      pickFirst(safe.expectedHoldMonths, safe.expected_hold_months, safe.holdMonths, safe.hold_months)
    ),
    sellerCredit: toNullableNumber(
      pickFirst(safe.sellerCredit, safe.seller_credit, safe.sellerConcession, safe.seller_concession)
    ),
    countyLoanLimit: toNullableNumber(
      pickFirst(safe.countyLoanLimit, safe.county_loan_limit, safe.fhfaLimit, safe.fhfa_limit)
    ),
    entitlementUsed: toNullableNumber(
      pickFirst(safe.entitlementUsed, safe.entitlement_used, safe.priorEntitlementCharged, safe.prior_entitlement_charged)
    ),
    fullEntitlement: boolish(
      pickFirst(safe.fullEntitlement, safe.full_entitlement),
      true
    )
  });
}

function normalizeMilitaryMode(value) {
  const s = lower(value);

  if (["ad", "active", "active_duty", "active duty", "servicemember", "service member"].includes(s)) {
    return "active_duty";
  }

  if (["vet", "veteran"].includes(s)) return "veteran";
  if (["retired", "retiree"].includes(s)) return "retired";
  if (["guard", "reserve", "reservist"].includes(s)) return "reserve";

  return s || "";
}

function normalizeLoanType(value) {
  const s = lower(value).replace(/[\s-]+/g, "_");

  if (["purchase", "buy", "home_purchase", "va_purchase"].includes(s)) {
    return "purchase";
  }

  if (["construction", "construction_permanent", "build"].includes(s)) {
    return "construction";
  }

  if (["cash_out", "cashout", "cash_out_refinance", "cashout_refinance"].includes(s)) {
    return "cash_out_refinance";
  }

  if (["irrrl", "streamline", "interest_rate_reduction_refinance_loan"].includes(s)) {
    return "irrrl";
  }

  if (["manufactured", "manufactured_home", "mobile_home"].includes(s)) {
    return "manufactured_home_not_permanently_affixed";
  }

  if (["assumption", "assume"].includes(s)) {
    return "assumption";
  }

  if (["vendee"].includes(s)) {
    return "vendee";
  }

  return s || "purchase";
}

function normalizePriorUse(value) {
  if (value === true) return "subsequent_use";
  if (value === false) return "first_use";

  const s = lower(value);

  if (["first", "first_use", "first use", "no", "never", "0", "false"].includes(s)) {
    return "first_use";
  }

  if (["second", "subsequent", "subsequent_use", "used", "yes", "true", "1", "again"].includes(s)) {
    return "subsequent_use";
  }

  return "first_use";
}

function normalizeOccupancyIntent(value) {
  if (typeof value === "boolean") return value ? "primary_residence" : "not_primary";

  const s = lower(value);

  if (
    [
      "primary",
      "primary_residence",
      "primary residence",
      "owner_occupy",
      "owner occupy",
      "occupy",
      "yes",
      "true",
      "1"
    ].includes(s)
  ) {
    return "primary_residence";
  }

  if (
    [
      "investment",
      "rental",
      "not_primary",
      "not primary",
      "no",
      "false",
      "0"
    ].includes(s)
  ) {
    return "not_primary";
  }

  return s || "unknown";
}

function isLikelyFundingFeeExempt(profile = {}) {
  const explicit = pickFirst(
    profile.fundingFeeExempt,
    profile.funding_fee_exempt,
    profile.vaFundingFeeExempt,
    profile.va_funding_fee_exempt
  );

  if (explicit !== null) return boolish(explicit, false);

  const rating = toNullableNumber(
    pickFirst(
      profile.va_disability,
      profile.vaDisability,
      profile.va_rating,
      profile.vaRating,
      profile.disability,
      profile.disabilityRating
    )
  );

  if (rating && rating > 0) return true;

  const receivesComp = boolish(
    pickFirst(
      profile.receivesVaCompensation,
      profile.receives_va_compensation,
      profile.vaCompensation,
      profile.va_compensation
    ),
    false
  );

  if (receivesComp) return true;

  const purpleHeartActiveDuty = boolish(
    pickFirst(
      profile.purpleHeartActiveDuty,
      profile.purple_heart_active_duty,
      profile.purpleHeart
    ),
    false
  );

  if (purpleHeartActiveDuty) return true;

  const survivingSpouse = boolish(
    pickFirst(profile.survivingSpouse, profile.surviving_spouse),
    false
  );

  if (survivingSpouse) return true;

  return false;
}

// ============================================================
// //#6) INTENT DETECTION
// ============================================================

export function detectVaLoanIntent(message = "") {
  const t = lower(message);

  if (!t) return "overview";

  if (/\bcoe\b|\bcertificate of eligibility\b|\beligib|\bqualify\b|\bqualified\b|\bcan i use\b|\bcan i get\b/.test(t)) {
    return "eligibility";
  }

  if (/\bfunding fee\b|\bfee\b|\bexempt\b|\bexemption\b|\bdisabled veteran\b|\bva disability\b/.test(t)) {
    return "funding_fee";
  }

  if (/\bzero down\b|\b0 down\b|\bno down\b|\bdown payment\b|\bdownpayment\b|\bput down\b/.test(t)) {
    return "zero_down";
  }

  if (/\bpmi\b|\bmortgage insurance\b|\bprivate mortgage insurance\b/.test(t)) {
    return "no_pmi";
  }

  if (/\bappraisal\b|\binspection\b|\bminimum property\b|\bmpr\b|\brepair\b|\bcondition\b/.test(t)) {
    return "appraisal";
  }

  if (/\boccupy\b|\boccupancy\b|\bprimary residence\b|\blive in\b|\binvestment\b|\brent it out\b|\brental\b/.test(t)) {
    return "occupancy";
  }

  if (/\bseller concession\b|\bseller credit\b|\bclosing cost credit\b|\bclosing costs\b|\bcash to close\b|\bcredits\b/.test(t)) {
    return "seller_concessions";
  }

  if (/\bentitlement\b|\bbonus entitlement\b|\bpartial entitlement\b|\bloan limit\b|\bcounty loan limit\b|\bremaining entitlement\b/.test(t)) {
    return "entitlement";
  }

  if (/\bclosing costs\b|\bcash to close\b|\bprepaids\b|\bescrow\b|\btitle\b|\bloan estimate\b/.test(t)) {
    return "closing_costs";
  }

  if (/\bpcs\b|\borders\b|\bmove\b|\bshort timeline\b|\btime on station\b|\brelocat\b|\bdeployment\b/.test(t)) {
    return "pcs_strategy";
  }

  if (/\bshould i buy\b|\bnot buy\b|\bwait\b|\brent\b|\btoo risky\b|\bbad idea\b/.test(t)) {
    return "when_not_to_buy";
  }

  if (/\bva loan\b|\bva mortgage\b|\bva-backed\b|\bva backed\b|\bhome loan\b/.test(t)) {
    return "overview";
  }

  return "overview";
}

// ============================================================
// //#7) FUNDING FEE CALCULATOR
// ============================================================

export function calculateVaFundingFee(input = {}) {
  const scenario = normalizeVaLoanScenario(input);
  const profile = normalizeVaLoanProfile(input.profile || input.member || input.user || input);

  const price = toNullableNumber(
    pickFirst(scenario.price, scenario.purchasePrice, input.price, input.purchasePrice)
  );

  const loanType = scenario.loanType || "purchase";
  const downpayment = Math.max(0, toNumber(scenario.downpayment, 0));
  const baseLoanAmount =
    toNullableNumber(
      pickFirst(
        input.baseLoanAmount,
        input.base_loan_amount,
        input.loanAmountBeforeFundingFee,
        scenario.loanAmountBeforeFundingFee
      )
    ) ??
    (price ? Math.max(0, price - downpayment) : 0);

  const downPaymentPct = price && price > 0 ? downpayment / price : 0;
  const priorUse = scenario.priorUse || "first_use";

  const exempt =
    scenario.fundingFeeExempt ||
    profile.likely_funding_fee_exempt ||
    isLikelyFundingFeeExempt(profile) ||
    boolish(input.exempt, false);

  if (exempt) {
    return stripEmpty({
      ok: true,
      version: VA_LOANS_VERSION,
      exempt: true,
      feePct: 0,
      feeAmount: 0,
      financedFeeAmount: 0,
      totalLoanWithFinancedFee: round2(baseLoanAmount),
      baseLoanAmount: round2(baseLoanAmount),
      downPaymentPct: round2(downPaymentPct),
      priorUse,
      loanType,
      label: "Funding fee exempt",
      bluf:
        "The borrower appears likely exempt from the VA funding fee based on the provided profile. Confirm exemption status on the COE or with the lender.",
      warnings: [],
      source: "TheWing va-loans.js"
    });
  }

  const feePct = resolveFundingFeePct({
    loanType,
    priorUse,
    downPaymentPct
  });

  const feeAmount = round2(baseLoanAmount * feePct);
  const financeFundingFee = boolish(
    pickFirst(input.financeFundingFee, input.finance_funding_fee, input.rollInFundingFee, input.roll_in_funding_fee),
    true
  );

  const financedFeeAmount = financeFundingFee ? feeAmount : 0;
  const totalLoanWithFinancedFee = round2(baseLoanAmount + financedFeeAmount);

  const warnings = [];

  if (!price && !baseLoanAmount) {
    warnings.push("Missing purchase price or base loan amount for funding fee estimate.");
  }

  if (loanType === "purchase" || loanType === "construction") {
    if (downPaymentPct >= 0.05 && downPaymentPct < 0.10) {
      warnings.push("Down payment appears to reach the 5% funding fee tier.");
    }

    if (downPaymentPct >= 0.10) {
      warnings.push("Down payment appears to reach the 10% funding fee tier.");
    }
  }

  return stripEmpty({
    ok: true,
    version: VA_LOANS_VERSION,
    exempt: false,
    feePct: round2(feePct),
    feePctDisplay: pct(feePct),
    feeAmount,
    financedFeeAmount,
    totalLoanWithFinancedFee,
    baseLoanAmount: round2(baseLoanAmount),
    price: price ? round2(price) : null,
    downpayment: round2(downpayment),
    downPaymentPct: round2(downPaymentPct),
    downPaymentPctDisplay: pct(downPaymentPct),
    priorUse,
    loanType,
    label: buildFundingFeeLabel({ loanType, priorUse, downPaymentPct, feePct }),
    bluf:
      financeFundingFee
        ? `Estimated VA funding fee is ${money(feeAmount)} and is assumed financed into the loan.`
        : `Estimated VA funding fee is ${money(feeAmount)} and is assumed paid at closing.`,
    warnings,
    source: "TheWing va-loans.js"
  });
}

function resolveFundingFeePct({ loanType, priorUse, downPaymentPct }) {
  const lt = normalizeLoanType(loanType);
  const use = priorUse === "subsequent_use" ? "subsequent_use" : "first_use";

  if (lt === "purchase" || lt === "construction") {
    const rows = VA_FUNDING_FEE_TABLE.purchase[use] || VA_FUNDING_FEE_TABLE.purchase.first_use;
    const row = rows.find(
      (r) => downPaymentPct * 100 >= r.minDownPct && downPaymentPct * 100 <= r.maxDownPct
    );

    return row ? row.feePct : rows[0].feePct;
  }

  if (lt === "cash_out_refinance") {
    return VA_FUNDING_FEE_TABLE.cash_out_refinance[use];
  }

  if (lt === "irrrl") return VA_FUNDING_FEE_TABLE.irrrl;

  if (lt === "manufactured_home_not_permanently_affixed") {
    return VA_FUNDING_FEE_TABLE.manufactured_home_not_permanently_affixed;
  }

  if (lt === "assumption") return VA_FUNDING_FEE_TABLE.assumption;
  if (lt === "vendee") return VA_FUNDING_FEE_TABLE.vendee;

  return VA_FUNDING_FEE_TABLE.purchase[use][0].feePct;
}

function buildFundingFeeLabel({ loanType, priorUse, downPaymentPct, feePct }) {
  const lt = normalizeLoanType(loanType);

  if (lt === "purchase" || lt === "construction") {
    const use = priorUse === "subsequent_use" ? "subsequent_use" : "first_use";
    const rows = VA_FUNDING_FEE_TABLE.purchase[use] || [];
    const row = rows.find(
      (r) => downPaymentPct * 100 >= r.minDownPct && downPaymentPct * 100 <= r.maxDownPct
    );

    return row?.label || `${use.replace(/_/g, " ")} purchase`;
  }

  return `${lt.replace(/_/g, " ")} funding fee at ${pct(feePct)}`;
}

// ============================================================
// //#8) PURCHASE SCENARIO ESTIMATOR
// ============================================================

export function estimateVaPurchaseScenario(input = {}) {
  const profile = normalizeVaLoanProfile(input.profile || input.member || input.user || input);
  const scenario = normalizeVaLoanScenario(input.scenario || input);

  const price = toNullableNumber(
    pickFirst(scenario.price, profile.projected_home_price)
  );

  const downpayment = toNumber(
    pickFirst(scenario.downpayment, profile.downpayment),
    0
  );

  const fundingFee = calculateVaFundingFee({
    ...scenario,
    profile,
    price,
    downpayment
  });

  const baseLoanAmount = price ? Math.max(0, price - downpayment) : 0;
  const finalLoanAmount = fundingFee.totalLoanWithFinancedFee || baseLoanAmount;

  const sellerCredit = toNumber(scenario.sellerCredit, 0);
  const appraisedOrReasonableValue = toNumber(
    pickFirst(scenario.appraisedValue, price),
    price || 0
  );
  const maxSellerConcession = round2(
    appraisedOrReasonableValue * VA_LOAN_RULES.sellerConcessionCapPct
  );

  const sellerCreditStatus =
    sellerCredit <= 0
      ? "none_provided"
      : sellerCredit <= maxSellerConcession
        ? "within_common_va_concession_cap"
        : "above_common_va_concession_cap_review_required";

  const cashToCloseNotes = [];

  if (fundingFee.exempt) {
    cashToCloseNotes.push("Funding fee appears exempt based on profile data; lender/COE must confirm.");
  } else if (fundingFee.financedFeeAmount > 0) {
    cashToCloseNotes.push("Funding fee is assumed financed into the loan estimate.");
  } else {
    cashToCloseNotes.push("Funding fee is assumed paid at closing.");
  }

  cashToCloseNotes.push("Purchase closing costs other than the VA funding fee generally need buyer funds, seller credits, or lender credits.");

  if (sellerCredit > 0) {
    cashToCloseNotes.push(
      sellerCreditStatus === "within_common_va_concession_cap"
        ? "Seller credit appears within the 4% seller-concession reference cap, but lender classification still matters."
        : "Seller credit appears above the 4% concession reference cap; the lender must review structure and allowable use."
    );
  }

  const warnings = [];

  if (!price) {
    warnings.push("Missing purchase price; scenario estimate is partial.");
  }

  if (scenario.occupancyIntent === "not_primary") {
    warnings.push("VA purchase loans are generally for primary residences, not pure investment purchases.");
  }

  if (scenario.expectedHoldMonths && scenario.expectedHoldMonths < 36) {
    warnings.push("Expected hold period under 36 months increases PCS resale/negative-equity risk.");
  }

  if (profile.credit_score && profile.credit_score < 620) {
    warnings.push("VA does not set a universal minimum credit score, but many lenders apply their own overlays.");
  }

  return stripEmpty({
    ok: true,
    version: VA_LOANS_VERSION,
    profile,
    scenario: {
      price: price ? round2(price) : null,
      downpayment: round2(downpayment),
      downPaymentPct: price ? round2(downpayment / price) : 0,
      priorUse: scenario.priorUse,
      loanType: scenario.loanType,
      occupancyIntent: scenario.occupancyIntent,
      expectedHoldMonths: scenario.expectedHoldMonths,
      pcsTimelineMonths: scenario.pcsTimelineMonths
    },
    loan: {
      baseLoanAmount: round2(baseLoanAmount),
      fundingFeeAmount: fundingFee.feeAmount || 0,
      fundingFeeFinanced: fundingFee.financedFeeAmount || 0,
      estimatedFinalLoanAmount: round2(finalLoanAmount),
      fundingFee
    },
    seller: {
      sellerCredit: round2(sellerCredit),
      maxSellerConcessionReference: round2(maxSellerConcession),
      sellerConcessionCapPct: VA_LOAN_RULES.sellerConcessionCapPct,
      sellerCreditStatus
    },
    cashToClose: {
      notes: cashToCloseNotes
    },
    warnings,
    bluf: buildScenarioBluf({ profile, scenario, fundingFee, price, downpayment }),
    source: "TheWing va-loans.js"
  });
}

function buildScenarioBluf({ profile, scenario, fundingFee, price, downpayment }) {
  if (!price) {
    return "I can explain the VA Loan, but I need a target purchase price to estimate the funding fee and loan structure.";
  }

  const downPct = price ? downpayment / price : 0;

  if (fundingFee.exempt) {
    return `At ${money(price)} with ${money(downpayment)} down, the borrower appears likely funding-fee exempt based on profile data. Confirm the exemption on the COE or with the lender.`;
  }

  if (downPct <= 0) {
    return `At ${money(price)} with $0 down, the VA Loan may reduce upfront cash need, but the estimated funding fee is ${money(fundingFee.feeAmount)} unless exempt.`;
  }

  return `At ${money(price)} with ${money(downpayment)} down, the estimated VA funding fee is ${money(fundingFee.feeAmount)} unless exempt.`;
}

// ============================================================
// //#9) ENTITLEMENT HELPER
// ============================================================

export function estimateEntitlementPosition(input = {}) {
  const scenario = normalizeVaLoanScenario(input);
  const price = toNullableNumber(pickFirst(scenario.price, input.price, input.purchasePrice));
  const baseLoanAmount =
    toNullableNumber(pickFirst(input.baseLoanAmount, input.base_loan_amount)) ||
    (price ? Math.max(0, price - toNumber(scenario.downpayment, 0)) : 0);

  const fullEntitlement = boolish(
    pickFirst(scenario.fullEntitlement, input.fullEntitlement, input.full_entitlement),
    true
  );

  if (fullEntitlement) {
    return stripEmpty({
      ok: true,
      fullEntitlement: true,
      downPaymentMayBeRequiredForEntitlement: false,
      bluf:
        "With full entitlement, VA does not set a loan limit, but the lender still must approve the borrower and the appraisal must support the value.",
      source: "TheWing va-loans.js"
    });
  }

  const countyLoanLimit = toNullableNumber(
    pickFirst(scenario.countyLoanLimit, input.countyLoanLimit, input.county_loan_limit)
  );

  const entitlementUsed = toNumber(
    pickFirst(scenario.entitlementUsed, input.entitlementUsed, input.entitlement_used),
    0
  );

  if (!countyLoanLimit) {
    return {
      ok: false,
      fullEntitlement: false,
      error: "County loan limit is required to estimate partial entitlement.",
      bluf:
        "Partial entitlement needs county loan limit and prior entitlement charged before estimating whether a down payment may be required.",
      source: "TheWing va-loans.js"
    };
  }

  const bonusEntitlement = Math.max(
    0,
    countyLoanLimit * VA_LOAN_RULES.commonGuarantyCoveragePct - entitlementUsed
  );

  const maxNoDownLoanEstimate = bonusEntitlement * 4;
  const downPaymentMayBeRequired = baseLoanAmount > maxNoDownLoanEstimate;

  const estimatedRequiredCoverage = baseLoanAmount * VA_LOAN_RULES.commonGuarantyCoveragePct;
  const gap = Math.max(0, estimatedRequiredCoverage - bonusEntitlement);
  const estimatedDownPaymentToCoverGap = gap;

  return stripEmpty({
    ok: true,
    fullEntitlement: false,
    countyLoanLimit: round2(countyLoanLimit),
    entitlementUsed: round2(entitlementUsed),
    estimatedRemainingBonusEntitlement: round2(bonusEntitlement),
    estimatedMaxNoDownLoan: round2(maxNoDownLoanEstimate),
    baseLoanAmount: round2(baseLoanAmount),
    downPaymentMayBeRequiredForEntitlement: downPaymentMayBeRequired,
    estimatedDownPaymentToCoverGuarantyGap: round2(estimatedDownPaymentToCoverGap),
    bluf:
      downPaymentMayBeRequired
        ? "Partial entitlement may require a down payment or lower loan amount to meet common guaranty coverage expectations."
        : "Partial entitlement appears to support the estimated loan amount without an entitlement-driven down payment, but the lender must confirm.",
    source: "TheWing va-loans.js"
  });
}

// ============================================================
// //#10) GUIDANCE BUILDER
// ============================================================

export function getVaLoanGuidance(intentOrMessage = "overview", profile = {}, scenario = {}) {
  const intent = VA_GUIDANCE_TOPICS[intentOrMessage]
    ? intentOrMessage
    : detectVaLoanIntent(intentOrMessage);

  const normalizedProfile = normalizeVaLoanProfile(profile);
  const normalizedScenario = normalizeVaLoanScenario({
    ...normalizedProfile,
    ...scenario
  });

  const topic = VA_GUIDANCE_TOPICS[intent] || VA_GUIDANCE_TOPICS.overview;
  const purchaseScenario = estimateVaPurchaseScenario({
    profile: normalizedProfile,
    scenario: normalizedScenario
  });

  const personalized = buildPersonalizedVaGuidance({
    intent,
    topic,
    profile: normalizedProfile,
    scenario: normalizedScenario,
    purchaseScenario
  });

  return stripEmpty({
    ok: true,
    version: VA_LOANS_VERSION,
    intent,
    topic: topic.title,
    bluf: personalized.bluf || topic.bluf,
    key_points: personalized.key_points,
    risks: personalized.risks,
    next_steps: personalized.next_steps,
    numbers: personalized.numbers,
    scenario: purchaseScenario,
    disclaimers: [
      "This is educational guidance, not lender approval, legal advice, tax advice, or an official VA eligibility decision.",
      "Final approval, rate, fees, cash to close, appraisal treatment, and underwriting conditions come from the lender and official VA/COE process."
    ],
    source: "TheWing va-loans.js"
  });
}

function buildPersonalizedVaGuidance({ intent, topic, profile, scenario, purchaseScenario }) {
  const keyPoints = cloneArray(topic.key_points);
  const risks = cloneArray(topic.risks);
  const nextSteps = cloneArray(topic.next_steps);
  const numbers = [];

  const price = toNullableNumber(
    pickFirst(scenario.price, profile.projected_home_price)
  );

  const downpayment = toNumber(
    pickFirst(scenario.downpayment, profile.downpayment),
    0
  );

  const downPct = price ? downpayment / price : null;

  if (price) {
    numbers.push({
      label: "Target purchase price",
      value: money(price),
      raw: round2(price)
    });
  }

  if (downpayment) {
    numbers.push({
      label: "Down payment",
      value: money(downpayment),
      raw: round2(downpayment)
    });
  }

  if (downPct !== null) {
    numbers.push({
      label: "Down payment percentage",
      value: pct(downPct),
      raw: round2(downPct)
    });
  }

  const fundingFee = purchaseScenario?.loan?.fundingFee;

  if (fundingFee) {
    numbers.push({
      label: "Estimated VA funding fee",
      value: money(fundingFee.feeAmount || 0),
      raw: fundingFee.feeAmount || 0
    });

    if (fundingFee.feePctDisplay) {
      numbers.push({
        label: "Funding fee rate",
        value: fundingFee.feePctDisplay,
        raw: fundingFee.feePct
      });
    }
  }

  if (profile.va_disability && profile.va_disability > 0) {
    keyPoints.unshift(
      `Your profile shows VA disability at ${profile.va_disability}%, so you may be funding-fee exempt. Confirm this on the COE or with the lender.`
    );
  }

  if (profile.base) {
    nextSteps.push(`Use ${profile.base} market numbers to compare buying against renting and BAH coverage.`);
  }

  if (profile.monthly_expenses === null || profile.monthly_expenses === undefined) {
    risks.push("Monthly expenses are missing, so affordability guidance is only partial.");
    nextSteps.unshift("Add monthly expenses so Amy can judge whether the VA payment fits your actual budget.");
  }

  if (scenario.occupancyIntent === "not_primary") {
    risks.unshift("The scenario appears to involve non-primary occupancy. That is a major VA Loan red flag.");
    nextSteps.unshift("Confirm occupancy requirements with the lender before proceeding.");
  }

  if (scenario.expectedHoldMonths && scenario.expectedHoldMonths < 36) {
    risks.unshift("Expected hold period appears short, which increases transaction-cost and negative-equity risk.");
  }

  let bluf = topic.bluf;

  if (intent === "funding_fee" && fundingFee) {
    bluf = fundingFee.exempt
      ? "BLUF: Your profile suggests a possible VA funding fee exemption. Confirm it on the COE or with the lender before relying on it."
      : `BLUF: Estimated VA funding fee is ${money(fundingFee.feeAmount)} at ${fundingFee.feePctDisplay || pct(fundingFee.feePct)} unless you qualify for an exemption.`;
  }

  if (intent === "zero_down" && price) {
    bluf =
      downpayment <= 0
        ? `BLUF: $0 down may be possible at ${money(price)}, but you still need to plan for closing costs, reserves, and the funding fee unless exempt.`
        : `BLUF: You are not modeling $0 down right now; your ${money(downpayment)} down payment may reduce payment and possibly the funding fee tier.`;
  }

  if (intent === "pcs_strategy") {
    bluf =
      "BLUF: For a PCS buyer, VA Loan approval is only one gate. The real decision is whether the payment, time on station, cash reserves, and exit strategy survive stress testing.";
  }

  return {
    bluf,
    key_points: uniqueArray(keyPoints),
    risks: uniqueArray(risks),
    next_steps: uniqueArray(nextSteps),
    numbers
  };
}

// ============================================================
// //#11) QUESTION ANALYZER
// ============================================================

export function analyzeVaLoanQuestion(message = "", profile = {}, scenario = {}) {
  const intent = detectVaLoanIntent(message);
  const guidance = getVaLoanGuidance(intent, profile, scenario);
  const normalizedProfile = normalizeVaLoanProfile(profile);
  const normalizedScenario = normalizeVaLoanScenario({
    ...normalizedProfile,
    ...scenario
  });

  const quickAnswer = buildVaQuickAnswer({
    message,
    intent,
    guidance,
    profile: normalizedProfile,
    scenario: normalizedScenario
  });

  return stripEmpty({
    ok: true,
    version: VA_LOANS_VERSION,
    intent,
    reply: quickAnswer,
    guidance,
    profile_used: normalizedProfile,
    scenario_used: normalizedScenario,
    source: "TheWing va-loans.js"
  });
}

function buildVaQuickAnswer({ intent, guidance }) {
  const lines = [];

  lines.push(guidance.bluf);

  if (guidance.numbers?.length) {
    lines.push(
      "Numbers: " +
        guidance.numbers
          .slice(0, 4)
          .map((n) => `${n.label}: ${n.value}`)
          .join(" • ")
    );
  }

  if (guidance.key_points?.length) {
    lines.push("Why: " + guidance.key_points.slice(0, 3).join(" "));
  }

  if (guidance.risks?.length) {
    lines.push("Risk: " + guidance.risks.slice(0, 2).join(" "));
  }

  if (guidance.next_steps?.length) {
    lines.push("Next move: " + guidance.next_steps[0]);
  }

  if (intent === "overview") {
    lines.push(
      "Bottom line: VA is a powerful tool, but PCSUnited should still judge the payment against BAH, total income, monthly expenses, time on station, and exit strategy."
    );
  }

  return lines.filter(Boolean).join("\n\n");
}

// ============================================================
// //#12) TRUTH PACKET FOR ASK AMY
// ============================================================

export function buildVaLoanTruthPacket({
  message = "",
  profile = {},
  scenario = {},
  compensation = {},
  mortgage = {},
  affordability = {}
} = {}) {
  const normalizedProfile = normalizeVaLoanProfile({
    ...profile,
    monthly_income: pickFirst(
      profile.monthly_income,
      profile.income,
      compensation.total_monthly,
      compensation.totalMonthly,
      compensation.monthly?.total,
      compensation.monthly?.householdIncome
    )
  });

  const normalizedScenario = normalizeVaLoanScenario({
    ...normalizedProfile,
    ...scenario,
    price: pickFirst(
      scenario.price,
      scenario.purchasePrice,
      profile.projected_home_price,
      mortgage.price
    ),
    downpayment: pickFirst(
      scenario.downpayment,
      profile.downpayment,
      mortgage.downpayment
    )
  });

  const intent = detectVaLoanIntent(message);
  const guidance = getVaLoanGuidance(intent, normalizedProfile, normalizedScenario);
  const fundingFee = calculateVaFundingFee({
    ...normalizedScenario,
    profile: normalizedProfile
  });
  const purchaseScenario = estimateVaPurchaseScenario({
    profile: normalizedProfile,
    scenario: normalizedScenario
  });
  const entitlement = estimateEntitlementPosition(normalizedScenario);

  const warnings = [];

  if (fundingFee?.warnings?.length) warnings.push(...fundingFee.warnings);
  if (purchaseScenario?.warnings?.length) warnings.push(...purchaseScenario.warnings);

  if (!normalizedProfile.monthly_expenses && !affordability?.expense_ratio) {
    warnings.push("Monthly expenses are missing; VA Loan affordability interpretation is partial.");
  }

  if (!normalizedScenario.price) {
    warnings.push("Target purchase price is missing; scenario-specific VA Loan numbers are partial.");
  }

  return stripEmpty({
    ok: true,
    version: VA_LOANS_VERSION,
    intent,
    topic: guidance.topic,
    bluf: guidance.bluf,
    profile: normalizedProfile,
    scenario: normalizedScenario,
    guidance: {
      key_points: guidance.key_points,
      risks: guidance.risks,
      next_steps: guidance.next_steps,
      disclaimers: guidance.disclaimers
    },
    numbers: guidance.numbers,
    funding_fee: fundingFee,
    purchase_scenario: purchaseScenario,
    entitlement,
    rules: {
      zeroDownPossible: VA_LOAN_RULES.zeroDownPossible,
      noMonthlyPmi: VA_LOAN_RULES.noMonthlyPmi,
      sellerConcessionCapPct: VA_LOAN_RULES.sellerConcessionCapPct,
      commonGuarantyCoveragePct: VA_LOAN_RULES.commonGuarantyCoveragePct,
      purchaseFundingFeeCanBeFinanced: VA_LOAN_RULES.purchaseFundingFeeCanBeFinanced,
      purchaseClosingCostsCanBeFinanced: VA_LOAN_RULES.purchaseClosingCostsCanBeFinanced
    },
    warnings: uniqueArray(warnings),
    source: "TheWing va-loans.js"
  });
}

// ============================================================
// //#13) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  VA_LOANS_VERSION,
  VA_FUNDING_FEE_TABLE,
  VA_LOAN_RULES,
  VA_GUIDANCE_TOPICS,

  normalizeVaLoanProfile,
  normalizeVaLoanScenario,

  detectVaLoanIntent,
  getVaLoanGuidance,
  analyzeVaLoanQuestion,

  calculateVaFundingFee,
  estimateVaPurchaseScenario,
  estimateEntitlementPosition,

  buildVaLoanTruthPacket
});
