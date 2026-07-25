/* ============================================================
   PCSUnited Analysis
   Home Buying Financial Analysis Dashboard
   app.js
   v1.0.0

   PURPOSE
   - Reads profile data from BasicBrain
   - Reads mortgage and selected-home data
   - Reads PCSUnited Financial budget data
   - Normalizes the different data shapes
   - Calculates the final home-buying analysis
   - Updates every dashboard card in real time
   - Provides safe demo fallbacks when source data is unavailable

   CORE PRINCIPLE
   - TheWing calculates.
   - Amy explains.
   ============================================================ */

"use strict";


/* ============================================================
   1. APPLICATION CONFIGURATION
   ============================================================ */

const PCSU_ANALYSIS_CONFIG = Object.freeze({
  locale: "en-US",
  currency: "USD",

  storageKeys: {
    analysis: "pcsunited.homeAnalysis.v1",

    basicBrain: [
      "pcsunited.basicbrain.v1",
      "pcsunited.basicBrain.v1",
      "pcsunited.profile.v1",
      "pcsunited.profile",
      "pcsunited.militaryProfile.v1"
    ],

    mortgage: [
      "pcsunited.mortgage.v1",
      "pcsunited.mortgageScenario.v1",
      "pcsunited.mortgagePrefill.v1",
      "pcsunited.selectedHome.v1",
      "pcsunited.homeScenario.v1"
    ],

    financial: [
      "pcsunited.financialBudget.v2",
      "pcsunited.financialBudget.v1",
      "pcsunited.financial.v1",
      "pcsunited.budget.v1"
    ]
  },

  globalKeys: {
    basicBrain: [
      "PCSUnitedBasicBrain",
      "PCSU_BASICBRAIN_CURRENT",
      "PCSUnitedProfile",
      "PCSUnitedMilitaryProfile"
    ],

    mortgage: [
      "PCSUnitedMortgage",
      "PCSUnitedMortgageResult",
      "PCSUnitedMortgageScenario",
      "PCSUnitedSelectedHome",
      "PCSUnitedMortgagePrefill"
    ],

    financial: [
      "PCSUnitedFinancial",
      "PCSUnitedFinancialState",
      "PCSUnitedBudget",
      "PCSUnitedFinancialBudget"
    ]
  },

  thresholds: {
    housingExcellent: 28,
    housingHealthy: 36,
    housingCaution: 43,

    dtiExcellent: 20,
    dtiHealthy: 36,
    dtiCaution: 43,

    reservesStrong: 6,
    reservesGood: 3,
    reservesCaution: 1,

    cashFlowStrongPercent: 20,
    cashFlowHealthyPercent: 10,
    cashFlowCautionPercent: 0
  },

  scenarioChange: 50000
});


/* ============================================================
   2. FALLBACK DEMO DATA
   ============================================================ */

const PCSU_ANALYSIS_DEMO = Object.freeze({
  profile: {
    firstName: "John",
    greetingName: "John",
    rank: "Master Sergeant",
    payGrade: "E-7",
    rankDisplay: "Master Sergeant (E-7)",
    base: "Lackland AFB",
    baseDisplay: "Lackland AFB, TX",
    location: "San Antonio, TX",
    dependents: true,
    monthlyIncome: 7910,
    takeHomeIncome: 7910
  },

  home: {
    price: 475000,
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2100,
    city: "San Antonio",
    state: "TX",
    location: "San Antonio, TX",

    imageUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=85"
  },

  mortgage: {
    homePrice: 475000,
    downPayment: 47500,
    downPaymentPercent: 10,

    principalInterest: 1910,
    propertyTaxes: 380,
    homeownersInsurance: 150,
    hoa: 100,
    pmi: 40,

    totalMonthlyPayment: 2580,

    interestRate: 6.375,
    loanProgram: "VA Loan",

    closingCosts: 14250,
    prepaidsEscrow: 3100,

    vaFundingFee: 0,
    vaFundingFeeExempt: true
  },

  financial: {
    monthlyExpenses: 1890,
    monthlyDebt: 450,
    monthlySavings: 1270,

    emergencyFund: 83600,
    liquidCash: 83600,

    categories: {
      "monthly-expenses": [],
      debt: [],
      lifestyle: [],
      other: []
    }
  }
});


/* ============================================================
   3. NUMBER FORMATTERS
   ============================================================ */

const currencyFormatter = new Intl.NumberFormat(
  PCSU_ANALYSIS_CONFIG.locale,
  {
    style: "currency",
    currency: PCSU_ANALYSIS_CONFIG.currency,
    maximumFractionDigits: 0
  }
);

const numberFormatter = new Intl.NumberFormat(
  PCSU_ANALYSIS_CONFIG.locale,
  {
    maximumFractionDigits: 0
  }
);

const decimalFormatter = new Intl.NumberFormat(
  PCSU_ANALYSIS_CONFIG.locale,
  {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }
);


/* ============================================================
   4. APPLICATION STATE
   ============================================================ */

const analysisState = {
  source: {
    profile: null,
    mortgage: null,
    financial: null
  },

  normalized: {
    profile: {},
    home: {},
    mortgage: {},
    financial: {}
  },

  analysis: {},

  ui: {
    cashFlowPeriod: "monthly",
    scenariosExpanded: true,
    amyOpen: false,
    reportOpen: false
  }
};


/* ============================================================
   5. DOM REFERENCES
   ============================================================ */

const DOM = {
  app: null,

  selectedHomeImage: null,
  selectedHomePrice: null,
  selectedHomeBedrooms: null,
  selectedHomeBathrooms: null,
  selectedHomeSquareFeet: null,
  selectedHomeLocation: null,

  analysisUserGreeting: null,
  analysisUserRank: null,
  analysisUserBase: null,
  analysisUserAvatar: null,

  askAmyButton: null,
  amyPanelBackdrop: null,
  amyPanel: null,
  closeAmyPanelButton: null,
  amyComposer: null,
  amyMessageInput: null,
  amyConversation: null,

  affordabilityAnswer: null,
  affordabilityPosition: null,
  heroMonthlyPayment: null,
  heroHousingRatio: null,
  heroPaymentStatus: null,
  heroCashLeft: null,
  heroCashStatus: null,
  heroDownPayment: null,
  heroDownPaymentPercent: null,
  heroDownPaymentStatus: null,
  heroClosingCosts: null,
  affordabilityScore: null,
  affordabilityScoreRating: null,

  paymentDonutTotal: null,
  principalInterestAmount: null,
  principalInterestPercentage: null,
  propertyTaxesAmount: null,
  propertyTaxesPercentage: null,
  homeInsuranceAmount: null,
  homeInsurancePercentage: null,
  hoaFeesAmount: null,
  hoaFeesPercentage: null,
  pmiAmount: null,
  pmiPercentage: null,
  interestRateAssumption: null,
  loanProgram: null,

  paymentDonutSegments: {
    principal: null,
    taxes: null,
    insurance: null,
    hoa: null,
    pmi: null
  },

  cashFlowPeriod: null,
  waterfallIncomeValue: null,
  waterfallHousingValue: null,
  waterfallExpensesValue: null,
  waterfallDebtValue: null,
  waterfallSavingsValue: null,
  waterfallRemainingValue: null,

  waterfallIncomeBar: null,
  waterfallHousingBar: null,
  waterfallExpensesBar: null,
  waterfallDebtBar: null,
  waterfallSavingsBar: null,
  waterfallRemainingBar: null,

  waterfallConnectorPath: null,
  monthlyFlowInsightAmount: null,

  debtSummaryMonthly: null,
  debtSummaryRatio: null,
  debtSummaryRatioStatus: null,
  vaFundingFee: null,
  vaFundingFeeStatus: null,

  downPaymentSummaryLabel: null,
  downPaymentSummaryAmount: null,
  closingCostsSummary: null,
  prepaidsEscrowAmount: null,
  totalDueAtClosing: null,

  reservesAfterClosing: null,
  reservesStatus: null,
  reservesDescription: null,

  affordabilityResultHeadline: null,
  affordabilityResultCopy: null,
  affordabilityGaugeNeedle: null,
  affordabilityGaugePercentage: null,
  affordabilityGaugeStatus: null,

  priceScenariosToggle: null,
  priceScenariosList: null,

  lowerScenarioPrice: null,
  lowerScenarioPayment: null,
  lowerScenarioRatio: null,

  selectedScenarioPrice: null,
  selectedScenarioPayment: null,
  selectedScenarioRatio: null,

  higherScenarioPrice: null,
  higherScenarioPayment: null,
  higherScenarioRatio: null,

  takeawayAffordability: null,
  takeawayCashFlow: null,
  takeawayReserves: null,
  takeawayVALoan: null,

  viewDebtDetailsButton: null,
  fullAnalysisReportButton: null,

  analysisReportModal: null,
  closeAnalysisReportButton: null,
  analysisReportContent: null,

  analysisNextButton: null,
  progressSteps: []
};


/* ============================================================
   6. GENERAL HELPERS
   ============================================================ */

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/[$,%]/g, "")
      .replace(/,/g, "")
      .trim();

    const parsed = Number.parseFloat(cleaned);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}


function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}


function formatCurrency(value) {
  return currencyFormatter.format(toNumber(value));
}


function formatNegativeCurrency(value) {
  return `-${formatCurrency(Math.abs(toNumber(value)))}`;
}


function formatNumber(value) {
  return numberFormatter.format(toNumber(value));
}


function formatPercent(value, digits = 0) {
  const numeric = toNumber(value);

  if (digits === 1) {
    return `${decimalFormatter.format(numeric)}%`;
  }

  return `${Math.round(numeric)}%`;
}


function safeDivide(numerator, denominator, fallback = 0) {
  const top = toNumber(numerator);
  const bottom = toNumber(denominator);

  if (!bottom) {
    return fallback;
  }

  return top / bottom;
}


function calculatePercent(part, total) {
  return safeDivide(part, total, 0) * 100;
}


function firstDefined(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return undefined;
}


function getNestedValue(object, path) {
  if (!object || !path) {
    return undefined;
  }

  return path
    .split(".")
    .reduce((current, key) => {
      if (
        current === undefined ||
        current === null
      ) {
        return undefined;
      }

      return current[key];
    }, object);
}


function pickValue(object, paths, fallback) {
  for (const path of paths) {
    const value = getNestedValue(object, path);

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return fallback;
}


function cloneData(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}


function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}


function setHTML(element, value) {
  if (element) {
    element.innerHTML = value;
  }
}


function setStatusClass(
  element,
  baseClass,
  modifier
) {
  if (!element) {
    return;
  }

  [...element.classList].forEach((className) => {
    if (
      className.startsWith(`${baseClass}--`)
    ) {
      element.classList.remove(className);
    }
  });

  element.classList.add(
    `${baseClass}--${modifier}`
  );
}


function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}


/* ============================================================
   7. SOURCE DATA READERS
   ============================================================ */

function readGlobalSource(keys) {
  for (const key of keys) {
    const value = window[key];

    if (value !== undefined && value !== null) {
      if (
        typeof value === "object" &&
        typeof value.getState === "function"
      ) {
        try {
          return value.getState();
        } catch {
          return value;
        }
      }

      return value;
    }
  }

  return null;
}


function readStoredSource(keys) {
  const storageProviders = [
    window.sessionStorage,
    window.localStorage
  ];

  for (const storage of storageProviders) {
    if (!storage) {
      continue;
    }

    for (const key of keys) {
      try {
        const raw = storage.getItem(key);

        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw);

        if (parsed !== null) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}


function readSource(globalKeys, storageKeys) {
  return (
    readGlobalSource(globalKeys) ||
    readStoredSource(storageKeys)
  );
}


function collectSourceData() {
  analysisState.source.profile = readSource(
    PCSU_ANALYSIS_CONFIG.globalKeys.basicBrain,
    PCSU_ANALYSIS_CONFIG.storageKeys.basicBrain
  );

  analysisState.source.mortgage = readSource(
    PCSU_ANALYSIS_CONFIG.globalKeys.mortgage,
    PCSU_ANALYSIS_CONFIG.storageKeys.mortgage
  );

  analysisState.source.financial = readSource(
    PCSU_ANALYSIS_CONFIG.globalKeys.financial,
    PCSU_ANALYSIS_CONFIG.storageKeys.financial
  );
}


/* ============================================================
   8. PROFILE NORMALIZATION
   ============================================================ */

function normalizeProfile(rawProfile) {
  const source = rawProfile || {};

  const firstName = String(
    pickValue(
      source,
      [
        "firstName",
        "first_name",
        "profile.firstName",
        "profile.first_name",
        "user.firstName",
        "user.first_name",
        "name.first",
        "basicInfo.firstName"
      ],
      PCSU_ANALYSIS_DEMO.profile.firstName
    )
  );

  const rank = String(
    pickValue(
      source,
      [
        "rank",
        "rankName",
        "rank_name",
        "profile.rank",
        "military.rank",
        "basicInfo.rank",
        "member.rank"
      ],
      PCSU_ANALYSIS_DEMO.profile.rank
    )
  );

  const payGrade = String(
    pickValue(
      source,
      [
        "payGrade",
        "pay_grade",
        "grade",
        "profile.payGrade",
        "military.payGrade",
        "basicInfo.payGrade"
      ],
      PCSU_ANALYSIS_DEMO.profile.payGrade
    )
  );

  const base = String(
    pickValue(
      source,
      [
        "base",
        "baseName",
        "base_name",
        "installation",
        "profile.base",
        "military.base",
        "basicInfo.base",
        "location.base"
      ],
      PCSU_ANALYSIS_DEMO.profile.base
    )
  );

  const baseDisplay = String(
    pickValue(
      source,
      [
        "baseDisplay",
        "base_display",
        "profile.baseDisplay",
        "location.baseDisplay",
        "selectedBase.label"
      ],
      PCSU_ANALYSIS_DEMO.profile.baseDisplay
    )
  );

  const monthlyIncome = toNumber(
    pickValue(
      source,
      [
        "monthlyIncome",
        "monthly_income",
        "income.monthly",
        "income.totalMonthly",
        "compensation.totalMonthly",
        "compensation.total_monthly",
        "totalMonthlyCompensation",
        "total_monthly_compensation",
        "results.totalMonthly",
        "results.total_monthly",
        "profile.monthlyIncome",
        "basicInfo.monthlyIncome"
      ],
      PCSU_ANALYSIS_DEMO.profile.monthlyIncome
    ),
    PCSU_ANALYSIS_DEMO.profile.monthlyIncome
  );

  const takeHomeIncome = toNumber(
    pickValue(
      source,
      [
        "takeHomeIncome",
        "take_home_income",
        "income.takeHome",
        "income.take_home",
        "income.netMonthly",
        "income.net_monthly",
        "netMonthlyIncome",
        "net_monthly_income"
      ],
      monthlyIncome
    ),
    monthlyIncome
  );

  return {
    firstName,
    greetingName: firstName,
    rank,
    payGrade,

    rankDisplay:
      payGrade && !rank.includes(payGrade)
        ? `${rank} (${payGrade})`
        : rank,

    base,
    baseDisplay:
      baseDisplay || base,

    monthlyIncome,
    takeHomeIncome,

    raw: cloneData(source)
  };
}


/* ============================================================
   9. MORTGAGE AND HOME NORMALIZATION
   ============================================================ */

function normalizeMortgage(rawMortgage) {
  const source = rawMortgage || {};

  const result =
    pickValue(
      source,
      [
        "result",
        "results",
        "mortgage",
        "calculation",
        "scenario"
      ],
      {}
    ) || {};

  const home =
    pickValue(
      source,
      [
        "selectedHome",
        "selected_home",
        "home",
        "property",
        "scenario.home"
      ],
      {}
    ) || {};

  const homePrice = toNumber(
    firstDefined(
      pickValue(home, [
        "price",
        "homePrice",
        "home_price",
        "listPrice",
        "list_price"
      ]),
      pickValue(result, [
        "homePrice",
        "home_price",
        "purchasePrice",
        "purchase_price",
        "price"
      ]),
      pickValue(source, [
        "homePrice",
        "home_price",
        "purchasePrice",
        "purchase_price",
        "selectedHomePrice"
      ]),
      PCSU_ANALYSIS_DEMO.home.price
    ),
    PCSU_ANALYSIS_DEMO.home.price
  );

  const downPayment = toNumber(
    firstDefined(
      pickValue(result, [
        "downPayment",
        "down_payment",
        "downPaymentAmount",
        "down_payment_amount"
      ]),
      pickValue(source, [
        "downPayment",
        "down_payment",
        "downPaymentAmount",
        "down_payment_amount"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.downPayment
    ),
    PCSU_ANALYSIS_DEMO.mortgage.downPayment
  );

  const downPaymentPercent = toNumber(
    firstDefined(
      pickValue(result, [
        "downPaymentPercent",
        "down_payment_percent",
        "downPercent",
        "down_percent"
      ]),
      pickValue(source, [
        "downPaymentPercent",
        "down_payment_percent",
        "downPercent",
        "down_percent"
      ]),
      calculatePercent(downPayment, homePrice)
    ),
    PCSU_ANALYSIS_DEMO.mortgage.downPaymentPercent
  );

  const principalInterest = toNumber(
    firstDefined(
      pickValue(result, [
        "principalInterest",
        "principal_interest",
        "principalAndInterest",
        "principal_and_interest",
        "pi"
      ]),
      pickValue(source, [
        "principalInterest",
        "principal_interest",
        "principalAndInterest",
        "principal_and_interest"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.principalInterest
    ),
    PCSU_ANALYSIS_DEMO.mortgage.principalInterest
  );

  const propertyTaxes = toNumber(
    firstDefined(
      pickValue(result, [
        "propertyTaxes",
        "property_taxes",
        "taxesMonthly",
        "taxes_monthly",
        "monthlyTaxes",
        "monthly_taxes"
      ]),
      pickValue(source, [
        "propertyTaxes",
        "property_taxes",
        "taxesMonthly",
        "taxes_monthly"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.propertyTaxes
    ),
    PCSU_ANALYSIS_DEMO.mortgage.propertyTaxes
  );

  const homeownersInsurance = toNumber(
    firstDefined(
      pickValue(result, [
        "homeownersInsurance",
        "homeowners_insurance",
        "insuranceMonthly",
        "insurance_monthly",
        "monthlyInsurance",
        "monthly_insurance"
      ]),
      pickValue(source, [
        "homeownersInsurance",
        "homeowners_insurance",
        "insuranceMonthly",
        "insurance_monthly"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.homeownersInsurance
    ),
    PCSU_ANALYSIS_DEMO.mortgage.homeownersInsurance
  );

  const hoa = toNumber(
    firstDefined(
      pickValue(result, [
        "hoa",
        "hoaMonthly",
        "hoa_monthly",
        "monthlyHoa",
        "monthly_hoa"
      ]),
      pickValue(source, [
        "hoa",
        "hoaMonthly",
        "hoa_monthly"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.hoa
    ),
    PCSU_ANALYSIS_DEMO.mortgage.hoa
  );

  const pmi = toNumber(
    firstDefined(
      pickValue(result, [
        "pmi",
        "pmiMonthly",
        "pmi_monthly",
        "monthlyPmi",
        "monthly_pmi"
      ]),
      pickValue(source, [
        "pmi",
        "pmiMonthly",
        "pmi_monthly"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.pmi
    ),
    PCSU_ANALYSIS_DEMO.mortgage.pmi
  );

  const calculatedTotal =
    principalInterest +
    propertyTaxes +
    homeownersInsurance +
    hoa +
    pmi;

  const totalMonthlyPayment = toNumber(
    firstDefined(
      pickValue(result, [
        "totalMonthlyPayment",
        "total_monthly_payment",
        "totalMonthly",
        "total_monthly",
        "monthlyPayment",
        "monthly_payment",
        "totalHousingPayment",
        "total_housing_payment"
      ]),
      pickValue(source, [
        "totalMonthlyPayment",
        "total_monthly_payment",
        "totalMonthly",
        "total_monthly",
        "monthlyPayment",
        "monthly_payment"
      ]),
      calculatedTotal
    ),
    calculatedTotal
  );

  const interestRate = toNumber(
    firstDefined(
      pickValue(result, [
        "interestRate",
        "interest_rate",
        "rate"
      ]),
      pickValue(source, [
        "interestRate",
        "interest_rate",
        "rate"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.interestRate
    ),
    PCSU_ANALYSIS_DEMO.mortgage.interestRate
  );

  const loanProgram = String(
    firstDefined(
      pickValue(result, [
        "loanProgram",
        "loan_program",
        "loanType",
        "loan_type"
      ]),
      pickValue(source, [
        "loanProgram",
        "loan_program",
        "loanType",
        "loan_type"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.loanProgram
    )
  );

  const closingCosts = toNumber(
    firstDefined(
      pickValue(result, [
        "closingCosts",
        "closing_costs",
        "estimatedClosingCosts",
        "estimated_closing_costs"
      ]),
      pickValue(source, [
        "closingCosts",
        "closing_costs"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.closingCosts
    ),
    PCSU_ANALYSIS_DEMO.mortgage.closingCosts
  );

  const prepaidsEscrow = toNumber(
    firstDefined(
      pickValue(result, [
        "prepaidsEscrow",
        "prepaids_escrow",
        "prepaidsAndEscrow",
        "prepaids_and_escrow"
      ]),
      pickValue(source, [
        "prepaidsEscrow",
        "prepaids_escrow"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.prepaidsEscrow
    ),
    PCSU_ANALYSIS_DEMO.mortgage.prepaidsEscrow
  );

  const vaFundingFee = toNumber(
    firstDefined(
      pickValue(result, [
        "vaFundingFee",
        "va_funding_fee",
        "fundingFee",
        "funding_fee"
      ]),
      pickValue(source, [
        "vaFundingFee",
        "va_funding_fee"
      ]),
      PCSU_ANALYSIS_DEMO.mortgage.vaFundingFee
    ),
    PCSU_ANALYSIS_DEMO.mortgage.vaFundingFee
  );

  const vaFundingFeeExempt = Boolean(
    firstDefined(
      pickValue(result, [
        "vaFundingFeeExempt",
        "va_funding_fee_exempt",
        "fundingFeeExempt",
        "funding_fee_exempt"
      ]),
      pickValue(source, [
        "vaFundingFeeExempt",
        "va_funding_fee_exempt"
      ]),
      vaFundingFee === 0
    )
  );

  const normalizedHome = {
    price: homePrice,

    bedrooms: toNumber(
      pickValue(
        home,
        [
          "bedrooms",
          "beds",
          "bedroomCount",
          "bedroom_count"
        ],
        PCSU_ANALYSIS_DEMO.home.bedrooms
      ),
      PCSU_ANALYSIS_DEMO.home.bedrooms
    ),

    bathrooms: toNumber(
      pickValue(
        home,
        [
          "bathrooms",
          "baths",
          "bathroomCount",
          "bathroom_count"
        ],
        PCSU_ANALYSIS_DEMO.home.bathrooms
      ),
      PCSU_ANALYSIS_DEMO.home.bathrooms
    ),

    squareFeet: toNumber(
      pickValue(
        home,
        [
          "squareFeet",
          "square_feet",
          "sqft",
          "livingArea",
          "living_area"
        ],
        PCSU_ANALYSIS_DEMO.home.squareFeet
      ),
      PCSU_ANALYSIS_DEMO.home.squareFeet
    ),

    city: String(
      pickValue(
        home,
        ["city", "address.city"],
        PCSU_ANALYSIS_DEMO.home.city
      )
    ),

    state: String(
      pickValue(
        home,
        ["state", "stateCode", "state_code", "address.state"],
        PCSU_ANALYSIS_DEMO.home.state
      )
    ),

    location: String(
      pickValue(
        home,
        [
          "location",
          "displayLocation",
          "display_location",
          "address.full",
          "address"
        ],
        PCSU_ANALYSIS_DEMO.home.location
      )
    ),

    imageUrl: String(
      pickValue(
        home,
        [
          "imageUrl",
          "image_url",
          "photo",
          "photoUrl",
          "photo_url",
          "primaryImage",
          "primary_image"
        ],
        PCSU_ANALYSIS_DEMO.home.imageUrl
      )
    )
  };

  return {
    home: normalizedHome,

    mortgage: {
      homePrice,
      downPayment,
      downPaymentPercent,

      principalInterest,
      propertyTaxes,
      homeownersInsurance,
      hoa,
      pmi,

      totalMonthlyPayment,

      interestRate,
      loanProgram,

      closingCosts,
      prepaidsEscrow,

      vaFundingFee,
      vaFundingFeeExempt,

      raw: cloneData(source)
    }
  };
}


/* ============================================================
   10. FINANCIAL NORMALIZATION
   ============================================================ */

function sumFinancialCategory(categoryItems) {
  if (!Array.isArray(categoryItems)) {
    return 0;
  }

  return categoryItems.reduce(
    (sum, item) =>
      sum +
      toNumber(
        firstDefined(
          item?.value,
          item?.amount,
          item?.monthlyAmount,
          item?.monthly_amount
        ),
        0
      ),
    0
  );
}


function normalizeFinancial(rawFinancial) {
  let source = rawFinancial || {};

  if (
    source &&
    typeof source.getState === "function"
  ) {
    try {
      source = source.getState();
    } catch {
      source = {};
    }
  }

  const categories =
    pickValue(
      source,
      [
        "categories",
        "state.categories",
        "budget.categories"
      ],
      {}
    ) || {};

  const monthlyExpenseCategory =
    sumFinancialCategory(
      categories["monthly-expenses"]
    );

  const lifestyleCategory =
    sumFinancialCategory(
      categories.lifestyle
    );

  const otherCategory =
    sumFinancialCategory(
      categories.other
    );

  const debtCategory =
    sumFinancialCategory(
      categories.debt
    );

  const calculatedExpenses =
    monthlyExpenseCategory +
    lifestyleCategory +
    otherCategory;

  const monthlyExpenses = toNumber(
    firstDefined(
      pickValue(source, [
        "monthlyExpenses",
        "monthly_expenses",
        "totalExpenses",
        "total_expenses",
        "metrics.totalExpenses",
        "metrics.total_expenses",
        "summary.totalExpenses"
      ]),
      calculatedExpenses,
      PCSU_ANALYSIS_DEMO.financial.monthlyExpenses
    ),
    PCSU_ANALYSIS_DEMO.financial.monthlyExpenses
  );

  const monthlyDebt = toNumber(
    firstDefined(
      pickValue(source, [
        "monthlyDebt",
        "monthly_debt",
        "totalDebt",
        "total_debt",
        "metrics.totalDebt",
        "metrics.total_debt",
        "summary.totalDebt"
      ]),
      debtCategory,
      PCSU_ANALYSIS_DEMO.financial.monthlyDebt
    ),
    PCSU_ANALYSIS_DEMO.financial.monthlyDebt
  );

  const monthlySavings = toNumber(
    firstDefined(
      pickValue(source, [
        "monthlySavings",
        "monthly_savings",
        "totalSavings",
        "total_savings",
        "metrics.totalSavings",
        "metrics.total_savings"
      ]),
      PCSU_ANALYSIS_DEMO.financial.monthlySavings
    ),
    PCSU_ANALYSIS_DEMO.financial.monthlySavings
  );

  const emergencyFund = toNumber(
    firstDefined(
      pickValue(source, [
        "emergencyFund",
        "emergency_fund",
        "cashReserves",
        "cash_reserves",
        "reserves",
        "savings.emergencyFund",
        "savings.emergency_fund"
      ]),
      PCSU_ANALYSIS_DEMO.financial.emergencyFund
    ),
    PCSU_ANALYSIS_DEMO.financial.emergencyFund
  );

  const liquidCash = toNumber(
    firstDefined(
      pickValue(source, [
        "liquidCash",
        "liquid_cash",
        "availableCash",
        "available_cash",
        "cashAvailable",
        "cash_available",
        "cashReserves",
        "cash_reserves"
      ]),
      emergencyFund
    ),
    emergencyFund
  );

  return {
    monthlyExpenses,
    monthlyDebt,
    monthlySavings,

    emergencyFund,
    liquidCash,

    categories: cloneData(categories),

    raw: cloneData(source)
  };
}


/* ============================================================
   11. ANALYSIS CALCULATIONS
   ============================================================ */

function calculateScenarioPayment(
  scenarioPrice,
  selectedPrice,
  selectedPayment
) {
  if (
    selectedPrice <= 0 ||
    selectedPayment <= 0
  ) {
    return selectedPayment;
  }

  return (
    selectedPayment *
    (scenarioPrice / selectedPrice)
  );
}


function calculateAffordabilityScore({
  housingRatio,
  dtiRatio,
  cashFlowPercent,
  reserveMonths,
  cashDueCoverage
}) {
  let score = 100;

  if (housingRatio > 28) {
    score -= (housingRatio - 28) * 1.8;
  }

  if (housingRatio > 36) {
    score -= (housingRatio - 36) * 2.5;
  }

  if (dtiRatio > 20) {
    score -= (dtiRatio - 20) * 0.9;
  }

  if (dtiRatio > 36) {
    score -= (dtiRatio - 36) * 2;
  }

  if (cashFlowPercent < 20) {
    score -= (20 - cashFlowPercent) * 1.25;
  }

  if (cashFlowPercent < 0) {
    score -= Math.abs(cashFlowPercent) * 2;
  }

  if (reserveMonths < 6) {
    score -= (6 - reserveMonths) * 2.5;
  }

  if (reserveMonths < 3) {
    score -= (3 - reserveMonths) * 5;
  }

  if (cashDueCoverage < 1) {
    score -= (1 - cashDueCoverage) * 30;
  }

  return Math.round(
    clamp(score, 0, 100)
  );
}


function determineVerdict(analysis) {
  const {
    affordabilityScore,
    monthlyCashFlow,
    housingRatio,
    dtiRatio,
    reserveMonths,
    reservesAfterClosing
  } = analysis;

  if (
    affordabilityScore >= 85 &&
    monthlyCashFlow > 0 &&
    housingRatio <= 36 &&
    dtiRatio <= 36 &&
    reserveMonths >= 3 &&
    reservesAfterClosing >= 0
  ) {
    return {
      answer: "YES",
      position: "You’re in a<br>Strong Position",
      rating: "Excellent",
      headline:
        "You can comfortably afford this home.",
      copy:
        "Based on your income, expenses, debt, available cash, and the projected housing payment, this home fits well within your current financial picture.",
      paymentStatus: "Healthy",
      cashStatus: "Strong",
      downPaymentStatus: "Good",
      statusType: "strong"
    };
  }

  if (
    affordabilityScore >= 70 &&
    monthlyCashFlow > 0 &&
    housingRatio <= 43 &&
    dtiRatio <= 43 &&
    reservesAfterClosing >= 0
  ) {
    return {
      answer: "YES",
      position: "Affordable<br>With Caution",
      rating: "Good",
      headline:
        "This home appears affordable, but your margin is tighter.",
      copy:
        "The purchase may work, but changes in monthly expenses, rates, or upfront costs could reduce your flexibility.",
      paymentStatus: "Manageable",
      cashStatus: "Moderate",
      downPaymentStatus: "Review",
      statusType: "caution"
    };
  }

  if (
    monthlyCashFlow >= 0 &&
    reservesAfterClosing >= 0
  ) {
    return {
      answer: "MAYBE",
      position: "Financially<br>Stretched",
      rating: "Caution",
      headline:
        "This home may stretch your monthly budget.",
      copy:
        "Your projected payment is possible, but your remaining cash flow or reserves leave less protection for unexpected costs.",
      paymentStatus: "High",
      cashStatus: "Tight",
      downPaymentStatus: "Review",
      statusType: "warning"
    };
  }

  return {
    answer: "NO",
    position: "Not Recommended<br>Right Now",
    rating: "High Risk",
    headline:
      "This home does not currently fit your financial picture.",
    copy:
      "The projected housing payment, expenses, debt, or upfront cash requirement creates an unsustainable position based on the information provided.",
    paymentStatus: "Too High",
    cashStatus: "Negative",
    downPaymentStatus: "Insufficient",
    statusType: "danger"
  };
}


function buildAnalysis() {
  const profile =
    analysisState.normalized.profile;

  const home =
    analysisState.normalized.home;

  const mortgage =
    analysisState.normalized.mortgage;

  const financial =
    analysisState.normalized.financial;

  const income =
    profile.takeHomeIncome ||
    profile.monthlyIncome;

  const monthlyHousing =
    mortgage.totalMonthlyPayment;

  const monthlyExpenses =
    financial.monthlyExpenses;

  const monthlyDebt =
    financial.monthlyDebt;

  const monthlySavings =
    financial.monthlySavings;

  const monthlyCashFlow =
    income -
    monthlyHousing -
    monthlyExpenses -
    monthlyDebt -
    monthlySavings;

  const housingRatio =
    calculatePercent(
      monthlyHousing,
      income
    );

  const dtiRatio =
    calculatePercent(
      monthlyDebt,
      income
    );

  const combinedDebtHousingRatio =
    calculatePercent(
      monthlyDebt + monthlyHousing,
      income
    );

  const cashFlowPercent =
    calculatePercent(
      monthlyCashFlow,
      income
    );

  const totalDueAtClosing =
    mortgage.downPayment +
    mortgage.closingCosts +
    mortgage.prepaidsEscrow +
    mortgage.vaFundingFee;

  const availableCash =
    financial.liquidCash ||
    financial.emergencyFund;

  const reservesAfterClosing =
    availableCash -
    totalDueAtClosing;

  const monthlyReserveBasis =
    monthlyHousing +
    monthlyExpenses +
    monthlyDebt;

  const reserveMonths =
    monthlyReserveBasis > 0
      ? reservesAfterClosing /
        monthlyReserveBasis
      : 0;

  const cashDueCoverage =
    totalDueAtClosing > 0
      ? availableCash /
        totalDueAtClosing
      : 1;

  const affordabilityScore =
    calculateAffordabilityScore({
      housingRatio,
      dtiRatio,
      cashFlowPercent,
      reserveMonths,
      cashDueCoverage
    });

  const lowerPrice = Math.max(
    0,
    home.price -
      PCSU_ANALYSIS_CONFIG.scenarioChange
  );

  const higherPrice =
    home.price +
    PCSU_ANALYSIS_CONFIG.scenarioChange;

  const lowerPayment =
    calculateScenarioPayment(
      lowerPrice,
      home.price,
      monthlyHousing
    );

  const higherPayment =
    calculateScenarioPayment(
      higherPrice,
      home.price,
      monthlyHousing
    );

  const lowerRatio =
    calculatePercent(
      lowerPayment,
      income
    );

  const selectedRatio =
    housingRatio;

  const higherRatio =
    calculatePercent(
      higherPayment,
      income
    );

  const analysis = {
    income,

    monthlyHousing,
    monthlyExpenses,
    monthlyDebt,
    monthlySavings,
    monthlyCashFlow,

    housingRatio,
    dtiRatio,
    combinedDebtHousingRatio,
    cashFlowPercent,

    totalDueAtClosing,
    availableCash,
    reservesAfterClosing,
    reserveMonths,
    cashDueCoverage,

    affordabilityScore,

    scenarios: {
      lower: {
        price: lowerPrice,
        payment: lowerPayment,
        ratio: lowerRatio
      },

      selected: {
        price: home.price,
        payment: monthlyHousing,
        ratio: selectedRatio
      },

      higher: {
        price: higherPrice,
        payment: higherPayment,
        ratio: higherRatio
      }
    }
  };

  analysis.verdict =
    determineVerdict(analysis);

  return analysis;
}


/* ============================================================
   12. SOURCE NORMALIZATION PIPELINE
   ============================================================ */

function normalizeAllData() {
  const profile = normalizeProfile(
    analysisState.source.profile
  );

  const mortgageResult =
    normalizeMortgage(
      analysisState.source.mortgage
    );

  const financial =
    normalizeFinancial(
      analysisState.source.financial
    );

  analysisState.normalized.profile =
    profile;

  analysisState.normalized.home =
    mortgageResult.home;

  analysisState.normalized.mortgage =
    mortgageResult.mortgage;

  analysisState.normalized.financial =
    financial;

  analysisState.analysis =
    buildAnalysis();
}


/* ============================================================
   13. HEADER RENDERING
   ============================================================ */

function renderHeader() {
  const profile =
    analysisState.normalized.profile;

  const home =
    analysisState.normalized.home;

  const greeting =
    `${getTimeGreeting()}, ${profile.greetingName}!`;

  setText(
    DOM.analysisUserGreeting,
    greeting
  );

  setText(
    DOM.analysisUserRank,
    profile.rankDisplay
  );

  setText(
    DOM.analysisUserBase,
    profile.baseDisplay
  );

  if (
    DOM.selectedHomeImage &&
    home.imageUrl
  ) {
    DOM.selectedHomeImage.src =
      home.imageUrl;
  }

  setText(
    DOM.selectedHomePrice,
    formatCurrency(home.price)
  );

  setText(
    DOM.selectedHomeBedrooms,
    `${formatNumber(home.bedrooms)} bd`
  );

  setText(
    DOM.selectedHomeBathrooms,
    `${home.bathrooms} ba`
  );

  setText(
    DOM.selectedHomeSquareFeet,
    `${formatNumber(home.squareFeet)} sq ft`
  );

  setText(
    DOM.selectedHomeLocation,
    home.location ||
      `${home.city}, ${home.state}`
  );
}


/* ============================================================
   14. HERO RENDERING
   ============================================================ */

function renderHero() {
  const mortgage =
    analysisState.normalized.mortgage;

  const analysis =
    analysisState.analysis;

  const verdict =
    analysis.verdict;

  setText(
    DOM.affordabilityAnswer,
    verdict.answer
  );

  setHTML(
    DOM.affordabilityPosition,
    verdict.position
  );

  setText(
    DOM.heroMonthlyPayment,
    formatCurrency(
      mortgage.totalMonthlyPayment
    )
  );

  setText(
    DOM.heroHousingRatio,
    `${formatPercent(
      analysis.housingRatio
    )} of your take-home pay`
  );

  setText(
    DOM.heroPaymentStatus,
    verdict.paymentStatus
  );

  setText(
    DOM.heroCashLeft,
    formatCurrency(
      analysis.monthlyCashFlow
    )
  );

  setText(
    DOM.heroCashStatus,
    verdict.cashStatus
  );

  setText(
    DOM.heroDownPayment,
    formatCurrency(
      mortgage.downPayment
    )
  );

  setText(
    DOM.heroDownPaymentPercent,
    `${formatPercent(
      mortgage.downPaymentPercent
    )} of home price`
  );

  setText(
    DOM.heroDownPaymentStatus,
    verdict.downPaymentStatus
  );

  setText(
    DOM.heroClosingCosts,
    formatCurrency(
      mortgage.closingCosts
    )
  );

  setText(
    DOM.affordabilityScore,
    String(
      analysis.affordabilityScore
    )
  );

  setText(
    DOM.affordabilityScoreRating,
    verdict.rating
  );
}


/* ============================================================
   15. PAYMENT BREAKDOWN RENDERING
   ============================================================ */

function updateDonutSegment(
  element,
  percentage,
  offset
) {
  if (!element) {
    return;
  }

  const safePercentage =
    clamp(percentage, 0, 100);

  element.style.strokeDasharray =
    `${safePercentage} ${100 - safePercentage}`;

  element.style.strokeDashoffset =
    String(-offset);
}


function renderPaymentBreakdown() {
  const mortgage =
    analysisState.normalized.mortgage;

  const total =
    mortgage.totalMonthlyPayment || 1;

  const principalPercent =
    calculatePercent(
      mortgage.principalInterest,
      total
    );

  const taxesPercent =
    calculatePercent(
      mortgage.propertyTaxes,
      total
    );

  const insurancePercent =
    calculatePercent(
      mortgage.homeownersInsurance,
      total
    );

  const hoaPercent =
    calculatePercent(
      mortgage.hoa,
      total
    );

  const pmiPercent =
    calculatePercent(
      mortgage.pmi,
      total
    );

  setText(
    DOM.paymentDonutTotal,
    formatCurrency(total)
  );

  setText(
    DOM.principalInterestAmount,
    formatCurrency(
      mortgage.principalInterest
    )
  );

  setText(
    DOM.principalInterestPercentage,
    formatPercent(principalPercent)
  );

  setText(
    DOM.propertyTaxesAmount,
    formatCurrency(
      mortgage.propertyTaxes
    )
  );

  setText(
    DOM.propertyTaxesPercentage,
    formatPercent(taxesPercent)
  );

  setText(
    DOM.homeInsuranceAmount,
    formatCurrency(
      mortgage.homeownersInsurance
    )
  );

  setText(
    DOM.homeInsurancePercentage,
    formatPercent(insurancePercent)
  );

  setText(
    DOM.hoaFeesAmount,
    formatCurrency(
      mortgage.hoa
    )
  );

  setText(
    DOM.hoaFeesPercentage,
    formatPercent(hoaPercent)
  );

  setText(
    DOM.pmiAmount,
    formatCurrency(
      mortgage.pmi
    )
  );

  setText(
    DOM.pmiPercentage,
    formatPercent(pmiPercent)
  );

  setText(
    DOM.interestRateAssumption,
    `${mortgage.interestRate}%`
  );

  setText(
    DOM.loanProgram,
    mortgage.loanProgram
  );

  let offset = 0;

  updateDonutSegment(
    DOM.paymentDonutSegments.principal,
    principalPercent,
    offset
  );

  offset += principalPercent;

  updateDonutSegment(
    DOM.paymentDonutSegments.taxes,
    taxesPercent,
    offset
  );

  offset += taxesPercent;

  updateDonutSegment(
    DOM.paymentDonutSegments.insurance,
    insurancePercent,
    offset
  );

  offset += insurancePercent;

  updateDonutSegment(
    DOM.paymentDonutSegments.hoa,
    hoaPercent,
    offset
  );

  offset += hoaPercent;

  updateDonutSegment(
    DOM.paymentDonutSegments.pmi,
    pmiPercent,
    offset
  );
}


/* ============================================================
   16. WATERFALL CHART RENDERING
   ============================================================ */

function getPeriodMultiplier() {
  return (
    analysisState.ui.cashFlowPeriod ===
    "annual"
      ? 12
      : 1
  );
}


function calculateBarHeight(
  value,
  maximum,
  minimumHeight,
  maximumHeight
) {
  if (maximum <= 0) {
    return minimumHeight;
  }

  const ratio =
    Math.abs(value) / maximum;

  return clamp(
    minimumHeight +
      ratio *
        (maximumHeight - minimumHeight),
    minimumHeight,
    maximumHeight
  );
}


function setBarHeight(
  element,
  height
) {
  if (element) {
    element.style.height =
      `${height}px`;
  }
}


function renderWaterfallChart() {
  const analysis =
    analysisState.analysis;

  const multiplier =
    getPeriodMultiplier();

  const income =
    analysis.income *
    multiplier;

  const housing =
    analysis.monthlyHousing *
    multiplier;

  const expenses =
    analysis.monthlyExpenses *
    multiplier;

  const debt =
    analysis.monthlyDebt *
    multiplier;

  const savings =
    analysis.monthlySavings *
    multiplier;

  const remaining =
    analysis.monthlyCashFlow *
    multiplier;

  setText(
    DOM.waterfallIncomeValue,
    formatCurrency(income)
  );

  setText(
    DOM.waterfallHousingValue,
    formatNegativeCurrency(housing)
  );

  setText(
    DOM.waterfallExpensesValue,
    formatNegativeCurrency(expenses)
  );

  setText(
    DOM.waterfallDebtValue,
    formatNegativeCurrency(debt)
  );

  setText(
    DOM.waterfallSavingsValue,
    formatNegativeCurrency(savings)
  );

  setText(
    DOM.waterfallRemainingValue,
    formatCurrency(remaining)
  );

  setText(
    DOM.monthlyFlowInsightAmount,
    formatCurrency(remaining)
  );

  const maximum =
    Math.max(
      income,
      housing,
      expenses,
      debt,
      savings,
      Math.abs(remaining),
      1
    );

  const incomeHeight =
    calculateBarHeight(
      income,
      maximum,
      30,
      165
    );

  const housingHeight =
    calculateBarHeight(
      housing,
      maximum,
      14,
      72
    );

  const expensesHeight =
    calculateBarHeight(
      expenses,
      maximum,
      12,
      62
    );

  const debtHeight =
    calculateBarHeight(
      debt,
      maximum,
      10,
      44
    );

  const savingsHeight =
    calculateBarHeight(
      savings,
      maximum,
      10,
      50
    );

  const remainingHeight =
    calculateBarHeight(
      remaining,
      maximum,
      18,
      88
    );

  setBarHeight(
    DOM.waterfallIncomeBar,
    incomeHeight
  );

  setBarHeight(
    DOM.waterfallHousingBar,
    housingHeight
  );

  setBarHeight(
    DOM.waterfallExpensesBar,
    expensesHeight
  );

  setBarHeight(
    DOM.waterfallDebtBar,
    debtHeight
  );

  setBarHeight(
    DOM.waterfallSavingsBar,
    savingsHeight
  );

  setBarHeight(
    DOM.waterfallRemainingBar,
    remainingHeight
  );

  updateWaterfallConnector({
    income,
    housing,
    expenses,
    debt,
    savings
  });
}


function updateWaterfallConnector({
  income,
  housing,
  expenses,
  debt,
  savings
}) {
  if (!DOM.waterfallConnectorPath) {
    return;
  }

  const maximum =
    Math.max(income, 1);

  const cumulative = [
    income,
    income - housing,
    income - housing - expenses,
    income -
      housing -
      expenses -
      debt,
    income -
      housing -
      expenses -
      debt -
      savings
  ];

  const xPoints = [
    85,
    210,
    335,
    460,
    585
  ];

  const chartTop = 38;
  const chartBottom = 220;
  const chartRange =
    chartBottom - chartTop;

  const points =
    cumulative.map(
      (value, index) => {
        const ratio =
          clamp(
            value / maximum,
            0,
            1
          );

        const y =
          chartBottom -
          ratio * chartRange;

        return `${xPoints[index]} ${y}`;
      }
    );

  const path =
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point}`
      )
      .join(" ");

  DOM.waterfallConnectorPath.setAttribute(
    "d",
    path
  );
}


/* ============================================================
   17. SUMMARY CARD RENDERING
   ============================================================ */

function getDtiStatus(dtiRatio) {
  if (
    dtiRatio <
    PCSU_ANALYSIS_CONFIG.thresholds
      .dtiExcellent
  ) {
    return {
      label: "Excellent",
      modifier: "excellent"
    };
  }

  if (
    dtiRatio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .dtiHealthy
  ) {
    return {
      label: "Good",
      modifier: "good"
    };
  }

  if (
    dtiRatio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .dtiCaution
  ) {
    return {
      label: "High",
      modifier: "warning"
    };
  }

  return {
    label: "Critical",
    modifier: "danger"
  };
}


function getReserveStatus(months) {
  if (
    months >=
    PCSU_ANALYSIS_CONFIG.thresholds
      .reservesStrong
  ) {
    return {
      label: "Strong",
      modifier: "excellent"
    };
  }

  if (
    months >=
    PCSU_ANALYSIS_CONFIG.thresholds
      .reservesGood
  ) {
    return {
      label: "Good",
      modifier: "good"
    };
  }

  if (
    months >=
    PCSU_ANALYSIS_CONFIG.thresholds
      .reservesCaution
  ) {
    return {
      label: "Low",
      modifier: "warning"
    };
  }

  return {
    label: "Critical",
    modifier: "danger"
  };
}


function renderSummaryCards() {
  const mortgage =
    analysisState.normalized.mortgage;

  const analysis =
    analysisState.analysis;

  const dtiStatus =
    getDtiStatus(
      analysis.dtiRatio
    );

  const reserveStatus =
    getReserveStatus(
      analysis.reserveMonths
    );

  setText(
    DOM.debtSummaryMonthly,
    formatCurrency(
      analysis.monthlyDebt
    )
  );

  setText(
    DOM.debtSummaryRatio,
    formatPercent(
      analysis.dtiRatio
    )
  );

  setText(
    DOM.debtSummaryRatioStatus,
    dtiStatus.label
  );

  setStatusClass(
    DOM.debtSummaryRatioStatus,
    "compact-status",
    dtiStatus.modifier
  );

  setText(
    DOM.vaFundingFee,
    formatCurrency(
      mortgage.vaFundingFee
    )
  );

  setText(
    DOM.vaFundingFeeStatus,
    mortgage.vaFundingFeeExempt
      ? "Exempt"
      : "Included"
  );

  setText(
    DOM.downPaymentSummaryLabel,
    `Down Payment (${formatPercent(
      mortgage.downPaymentPercent
    )})`
  );

  setText(
    DOM.downPaymentSummaryAmount,
    formatCurrency(
      mortgage.downPayment
    )
  );

  setText(
    DOM.closingCostsSummary,
    formatCurrency(
      mortgage.closingCosts
    )
  );

  setText(
    DOM.prepaidsEscrowAmount,
    formatCurrency(
      mortgage.prepaidsEscrow
    )
  );

  setText(
    DOM.totalDueAtClosing,
    formatCurrency(
      analysis.totalDueAtClosing
    )
  );

  setText(
    DOM.reservesAfterClosing,
    formatCurrency(
      analysis.reservesAfterClosing
    )
  );

  setText(
    DOM.reservesStatus,
    reserveStatus.label
  );

  setStatusClass(
    DOM.reservesStatus,
    "compact-status",
    reserveStatus.modifier
  );

  setText(
    DOM.reservesDescription,
    analysis.reservesAfterClosing >= 0
      ? `You’ll have ${decimalFormatter.format(
          Math.max(
            analysis.reserveMonths,
            0
          )
        )} months of expenses in reserve.`
      : `You are short ${formatCurrency(
          Math.abs(
            analysis.reservesAfterClosing
          )
        )} for the projected cash needed at closing.`
  );
}


/* ============================================================
   18. AFFORDABILITY RESULT RENDERING
   ============================================================ */

function getHousingStatus(
  housingRatio
) {
  if (
    housingRatio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .housingExcellent
  ) {
    return {
      label:
        "Within the excellent range (Below 28%)",
      modifier: "excellent"
    };
  }

  if (
    housingRatio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .housingHealthy
  ) {
    return {
      label:
        "Within the healthy range (Below 36%)",
      modifier: "good"
    };
  }

  if (
    housingRatio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .housingCaution
  ) {
    return {
      label:
        "Above the preferred range",
      modifier: "warning"
    };
  }

  return {
    label:
      "Housing payment is financially high",
    modifier: "danger"
  };
}


function calculateGaugeRotation(
  housingRatio
) {
  const minimumRatio = 15;
  const maximumRatio = 50;

  const normalized =
    clamp(
      (housingRatio - minimumRatio) /
        (maximumRatio - minimumRatio),
      0,
      1
    );

  return -70 + normalized * 140;
}


function renderAffordabilityResult() {
  const analysis =
    analysisState.analysis;

  const verdict =
    analysis.verdict;

  const housingStatus =
    getHousingStatus(
      analysis.housingRatio
    );

  setText(
    DOM.affordabilityResultHeadline,
    verdict.headline
  );

  setText(
    DOM.affordabilityResultCopy,
    verdict.copy
  );

  setText(
    DOM.affordabilityGaugePercentage,
    formatPercent(
      analysis.housingRatio
    )
  );

  setText(
    DOM.affordabilityGaugeStatus,
    housingStatus.label
  );

  if (
    DOM.affordabilityGaugeNeedle
  ) {
    const rotation =
      calculateGaugeRotation(
        analysis.housingRatio
      );

    DOM.affordabilityGaugeNeedle.style.transform =
      `rotate(${rotation}deg)`;
  }
}


/* ============================================================
   19. PRICE SCENARIO RENDERING
   ============================================================ */

function applyRatioAppearance(
  element,
  ratio
) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "price-scenario__ratio--healthy",
    "price-scenario__ratio--caution",
    "price-scenario__ratio--danger"
  );

  if (
    ratio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .housingHealthy
  ) {
    element.classList.add(
      "price-scenario__ratio--healthy"
    );
    return;
  }

  if (
    ratio <=
    PCSU_ANALYSIS_CONFIG.thresholds
      .housingCaution
  ) {
    element.classList.add(
      "price-scenario__ratio--caution"
    );
    return;
  }

  element.classList.add(
    "price-scenario__ratio--danger"
  );
}


function renderPriceScenarios() {
  const scenarios =
    analysisState.analysis.scenarios;

  setText(
    DOM.lowerScenarioPrice,
    formatCurrency(
      scenarios.lower.price
    )
  );

  setHTML(
    DOM.lowerScenarioPayment,
    `${formatCurrency(
      scenarios.lower.payment
    )}<span>/mo</span>`
  );

  setText(
    DOM.lowerScenarioRatio,
    formatPercent(
      scenarios.lower.ratio
    )
  );

  applyRatioAppearance(
    DOM.lowerScenarioRatio,
    scenarios.lower.ratio
  );

  setText(
    DOM.selectedScenarioPrice,
    formatCurrency(
      scenarios.selected.price
    )
  );

  setHTML(
    DOM.selectedScenarioPayment,
    `${formatCurrency(
      scenarios.selected.payment
    )}<span>/mo</span>`
  );

  setText(
    DOM.selectedScenarioRatio,
    formatPercent(
      scenarios.selected.ratio
    )
  );

  applyRatioAppearance(
    DOM.selectedScenarioRatio,
    scenarios.selected.ratio
  );

  setText(
    DOM.higherScenarioPrice,
    formatCurrency(
      scenarios.higher.price
    )
  );

  setHTML(
    DOM.higherScenarioPayment,
    `${formatCurrency(
      scenarios.higher.payment
    )}<span>/mo</span>`
  );

  setText(
    DOM.higherScenarioRatio,
    formatPercent(
      scenarios.higher.ratio
    )
  );

  applyRatioAppearance(
    DOM.higherScenarioRatio,
    scenarios.higher.ratio
  );
}


/* ============================================================
   20. KEY TAKEAWAYS RENDERING
   ============================================================ */

function renderKeyTakeaways() {
  const analysis =
    analysisState.analysis;

  const mortgage =
    analysisState.normalized.mortgage;

  setText(
    DOM.takeawayAffordability,
    analysis.verdict.answer === "YES"
      ? "This home fits within your projected budget."
      : analysis.verdict.answer === "MAYBE"
        ? "This home may work, but your financial margin is limited."
        : "This home does not currently fit your projected budget."
  );

  setText(
    DOM.takeawayCashFlow,
    analysis.monthlyCashFlow >= 0
      ? `You’ll have ${formatCurrency(
          analysis.monthlyCashFlow
        )} left over each month.`
      : `Your monthly cash flow would be short by ${formatCurrency(
          Math.abs(
            analysis.monthlyCashFlow
          )
        )}.`
  );

  setText(
    DOM.takeawayReserves,
    analysis.reservesAfterClosing >= 0
      ? `Your projected reserves equal ${decimalFormatter.format(
          Math.max(
            analysis.reserveMonths,
            0
          )
        )} months of expenses.`
      : `Your available cash does not fully cover the projected closing requirement.`
  );

  setText(
    DOM.takeawayVALoan,
    mortgage.loanProgram
      .toLowerCase()
      .includes("va")
      ? mortgage.vaFundingFeeExempt
        ? "You’re using VA benefits and appear exempt from the VA funding fee."
        : "You’re using VA benefits to support your home-buying strategy."
      : `Your analysis uses the ${mortgage.loanProgram} program.`
  );
}


/* ============================================================
   21. FULL REPORT CONTENT
   ============================================================ */

function buildFullReportHTML() {
  const profile =
    analysisState.normalized.profile;

  const home =
    analysisState.normalized.home;

  const mortgage =
    analysisState.normalized.mortgage;

  const financial =
    analysisState.normalized.financial;

  const analysis =
    analysisState.analysis;

  return `
    <section class="analysis-report-section">
      <h3>Executive Result</h3>

      <p>
        ${profile.firstName}, the selected
        ${formatCurrency(home.price)} home is rated
        <strong>${analysis.verdict.rating}</strong>
        with a PCSUnited affordability score of
        <strong>${analysis.affordabilityScore}/100</strong>.
        ${analysis.verdict.copy}
      </p>
    </section>

    <section class="analysis-report-section">
      <h3>Monthly Housing Position</h3>

      <p>
        The projected total housing payment is
        <strong>${formatCurrency(
          mortgage.totalMonthlyPayment
        )} per month</strong>.
        This equals
        <strong>${formatPercent(
          analysis.housingRatio,
          1
        )}</strong>
        of projected take-home income.
      </p>
    </section>

    <section class="analysis-report-section">
      <h3>Monthly Cash Flow</h3>

      <p>
        Projected monthly income is
        <strong>${formatCurrency(
          analysis.income
        )}</strong>.
        After housing, other expenses, debt payments,
        and savings, projected monthly cash flow is
        <strong>${formatCurrency(
          analysis.monthlyCashFlow
        )}</strong>.
      </p>
    </section>

    <section class="analysis-report-section">
      <h3>Debt Position</h3>

      <p>
        Monthly debt payments total
        <strong>${formatCurrency(
          financial.monthlyDebt
        )}</strong>,
        representing approximately
        <strong>${formatPercent(
          analysis.dtiRatio,
          1
        )}</strong>
        of monthly income before including the selected
        home payment.
      </p>
    </section>

    <section class="analysis-report-section">
      <h3>Cash Needed at Closing</h3>

      <p>
        Estimated cash required at closing is
        <strong>${formatCurrency(
          analysis.totalDueAtClosing
        )}</strong>.
        This includes the down payment, closing costs,
        prepaid expenses, escrow, and any applicable VA
        funding fee.
      </p>
    </section>

    <section class="analysis-report-section">
      <h3>Reserves After Closing</h3>

      <p>
        Projected remaining reserves are
        <strong>${formatCurrency(
          analysis.reservesAfterClosing
        )}</strong>,
        equal to approximately
        <strong>${decimalFormatter.format(
          Math.max(
            analysis.reserveMonths,
            0
          )
        )} months</strong>
        of housing, expenses, and debt payments.
      </p>
    </section>
  `;
}


/* ============================================================
   22. MODAL AND PANEL CONTROLS
   ============================================================ */

function openAmyPanel() {
  if (!DOM.amyPanelBackdrop) {
    return;
  }

  analysisState.ui.amyOpen = true;

  DOM.amyPanelBackdrop.hidden = false;
  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    DOM.amyMessageInput?.focus();
  });
}


function closeAmyPanel() {
  if (!DOM.amyPanelBackdrop) {
    return;
  }

  analysisState.ui.amyOpen = false;

  DOM.amyPanelBackdrop.hidden = true;
  document.body.style.overflow = "";
}


function openAnalysisReport() {
  if (!DOM.analysisReportModal) {
    return;
  }

  analysisState.ui.reportOpen = true;

  setHTML(
    DOM.analysisReportContent,
    buildFullReportHTML()
  );

  DOM.analysisReportModal.hidden = false;
  document.body.style.overflow = "hidden";
}


function closeAnalysisReport() {
  if (!DOM.analysisReportModal) {
    return;
  }

  analysisState.ui.reportOpen = false;

  DOM.analysisReportModal.hidden = true;
  document.body.style.overflow = "";
}


function handleBackdropClick(event) {
  if (
    event.target ===
    DOM.amyPanelBackdrop
  ) {
    closeAmyPanel();
  }

  if (
    event.target ===
    DOM.analysisReportModal
  ) {
    closeAnalysisReport();
  }
}


/* ============================================================
   23. AMY DEMO INTERACTION
   ============================================================ */

function appendAmyMessage(
  role,
  message
) {
  if (!DOM.amyConversation) {
    return;
  }

  const article =
    document.createElement("article");

  article.className =
    `amy-message amy-message--${role}`;

  const paragraph =
    document.createElement("p");

  paragraph.textContent = message;

  article.appendChild(paragraph);
  DOM.amyConversation.appendChild(article);

  DOM.amyConversation.scrollTop =
    DOM.amyConversation.scrollHeight;
}


function buildAmyResponse(message) {
  const analysis =
    analysisState.analysis;

  const normalized =
    message.toLowerCase();

  if (
    normalized.includes("afford") ||
    normalized.includes("buy")
  ) {
    return `${analysis.verdict.headline} Your housing payment is ${formatPercent(
      analysis.housingRatio,
      1
    )} of take-home income, and projected monthly cash flow is ${formatCurrency(
      analysis.monthlyCashFlow
    )}.`;
  }

  if (
    normalized.includes("cash") ||
    normalized.includes("left")
  ) {
    return `After the selected home payment, other expenses, debt, and savings, you are projected to have ${formatCurrency(
      analysis.monthlyCashFlow
    )} remaining each month.`;
  }

  if (
    normalized.includes("reserve") ||
    normalized.includes("closing")
  ) {
    return `Estimated cash due at closing is ${formatCurrency(
      analysis.totalDueAtClosing
    )}. Your projected reserves after closing are ${formatCurrency(
      analysis.reservesAfterClosing
    )}, equal to about ${decimalFormatter.format(
      Math.max(
        analysis.reserveMonths,
        0
      )
    )} months of expenses.`;
  }

  if (
    normalized.includes("debt") ||
    normalized.includes("dti")
  ) {
    return `Your monthly debt payments are ${formatCurrency(
      analysis.monthlyDebt
    )}, producing a debt-to-income ratio of approximately ${formatPercent(
      analysis.dtiRatio,
      1
    )}.`;
  }

  return `Your PCSUnited affordability score is ${analysis.affordabilityScore}/100. ${analysis.verdict.copy}`;
}


function handleAmySubmit(event) {
  event.preventDefault();

  const message =
    DOM.amyMessageInput?.value.trim();

  if (!message) {
    return;
  }

  appendAmyMessage(
    "user",
    message
  );

  DOM.amyMessageInput.value = "";

  const response =
    buildAmyResponse(message);

  window.setTimeout(() => {
    appendAmyMessage(
      "assistant",
      response
    );
  }, 250);
}


/* ============================================================
   24. UI EVENTS
   ============================================================ */

function togglePriceScenarios() {
  analysisState.ui.scenariosExpanded =
    !analysisState.ui.scenariosExpanded;

  if (DOM.priceScenariosList) {
    DOM.priceScenariosList.hidden =
      !analysisState.ui.scenariosExpanded;
  }

  DOM.priceScenariosToggle?.setAttribute(
    "aria-expanded",
    String(
      analysisState.ui.scenariosExpanded
    )
  );

  const icon =
    DOM.priceScenariosToggle?.querySelector(
      "svg"
    );

  if (icon) {
    icon.style.transition =
      "transform 160ms ease";

    icon.style.transform =
      analysisState.ui.scenariosExpanded
        ? "rotate(0deg)"
        : "rotate(-90deg)";
  }
}


function handleCashFlowPeriodChange() {
  analysisState.ui.cashFlowPeriod =
    DOM.cashFlowPeriod?.value ||
    "monthly";

  renderWaterfallChart();
}


function handleDebtDetails() {
  window.location.href = "../";
}


function handleNext() {
  saveAnalysisSnapshot();

  const detail = {
    profile:
      cloneData(
        analysisState.normalized.profile
      ),

    home:
      cloneData(
        analysisState.normalized.home
      ),

    mortgage:
      cloneData(
        analysisState.normalized.mortgage
      ),

    financial:
      cloneData(
        analysisState.normalized.financial
      ),

    analysis:
      cloneData(
        analysisState.analysis
      )
  };

  window.dispatchEvent(
    new CustomEvent(
      "pcsunited:analysis-complete",
      { detail }
    )
  );

  DOM.analysisNextButton
    ?.classList.add(
      "analysis-next-button--complete"
    );

  const label =
    DOM.analysisNextButton
      ?.querySelector("span");

  if (label) {
    label.textContent =
      "Analysis Saved";
  }
}


function handleEscape(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (analysisState.ui.amyOpen) {
    closeAmyPanel();
  }

  if (analysisState.ui.reportOpen) {
    closeAnalysisReport();
  }
}


/* ============================================================
   25. PERSISTENCE
   ============================================================ */

function saveAnalysisSnapshot() {
  try {
    const snapshot = {
      version: 1,
      savedAt:
        new Date().toISOString(),

      profile:
        analysisState.normalized.profile,

      home:
        analysisState.normalized.home,

      mortgage:
        analysisState.normalized.mortgage,

      financial:
        analysisState.normalized.financial,

      analysis:
        analysisState.analysis
    };

    window.sessionStorage.setItem(
      PCSU_ANALYSIS_CONFIG.storageKeys
        .analysis,
      JSON.stringify(snapshot)
    );
  } catch (error) {
    console.warn(
      "PCSUnited Analysis could not save the current snapshot.",
      error
    );
  }
}


/* ============================================================
   26. MAIN RENDER PIPELINE
   ============================================================ */

function renderApplication() {
  renderHeader();
  renderHero();
  renderPaymentBreakdown();
  renderWaterfallChart();
  renderSummaryCards();
  renderAffordabilityResult();
  renderPriceScenarios();
  renderKeyTakeaways();

  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2
      }
    });
  }
}


/* ============================================================
   27. DOM CACHE
   ============================================================ */

function cacheDOM() {
  DOM.app =
    document.getElementById(
      "pcsuAnalysisApp"
    );

  DOM.selectedHomeImage =
    document.getElementById(
      "selectedHomeImage"
    );

  DOM.selectedHomePrice =
    document.getElementById(
      "selectedHomePrice"
    );

  DOM.selectedHomeBedrooms =
    document.getElementById(
      "selectedHomeBedrooms"
    );

  DOM.selectedHomeBathrooms =
    document.getElementById(
      "selectedHomeBathrooms"
    );

  DOM.selectedHomeSquareFeet =
    document.getElementById(
      "selectedHomeSquareFeet"
    );

  DOM.selectedHomeLocation =
    document.getElementById(
      "selectedHomeLocation"
    );

  DOM.analysisUserGreeting =
    document.getElementById(
      "analysisUserGreeting"
    );

  DOM.analysisUserRank =
    document.getElementById(
      "analysisUserRank"
    );

  DOM.analysisUserBase =
    document.getElementById(
      "analysisUserBase"
    );

  DOM.analysisUserAvatar =
    document.getElementById(
      "analysisUserAvatar"
    );

  DOM.askAmyButton =
    document.getElementById(
      "askAmyButton"
    );

  DOM.amyPanelBackdrop =
    document.getElementById(
      "amyPanelBackdrop"
    );

  DOM.amyPanel =
    document.getElementById(
      "amyPanel"
    );

  DOM.closeAmyPanelButton =
    document.getElementById(
      "closeAmyPanelButton"
    );

  DOM.amyComposer =
    document.getElementById(
      "amyComposer"
    );

  DOM.amyMessageInput =
    document.getElementById(
      "amyMessageInput"
    );

  DOM.amyConversation =
    document.getElementById(
      "amyConversation"
    );

  DOM.affordabilityAnswer =
    document.getElementById(
      "affordabilityAnswer"
    );

  DOM.affordabilityPosition =
    document.getElementById(
      "affordabilityPosition"
    );

  DOM.heroMonthlyPayment =
    document.getElementById(
      "heroMonthlyPayment"
    );

  DOM.heroHousingRatio =
    document.getElementById(
      "heroHousingRatio"
    );

  DOM.heroPaymentStatus =
    document.getElementById(
      "heroPaymentStatus"
    );

  DOM.heroCashLeft =
    document.getElementById(
      "heroCashLeft"
    );

  DOM.heroCashStatus =
    document.getElementById(
      "heroCashStatus"
    );

  DOM.heroDownPayment =
    document.getElementById(
      "heroDownPayment"
    );

  DOM.heroDownPaymentPercent =
    document.getElementById(
      "heroDownPaymentPercent"
    );

  DOM.heroDownPaymentStatus =
    document.getElementById(
      "heroDownPaymentStatus"
    );

  DOM.heroClosingCosts =
    document.getElementById(
      "heroClosingCosts"
    );

  DOM.affordabilityScore =
    document.getElementById(
      "affordabilityScore"
    );

  DOM.affordabilityScoreRating =
    document.getElementById(
      "affordabilityScoreRating"
    );

  DOM.paymentDonutTotal =
    document.getElementById(
      "paymentDonutTotal"
    );

  DOM.principalInterestAmount =
    document.getElementById(
      "principalInterestAmount"
    );

  DOM.principalInterestPercentage =
    document.getElementById(
      "principalInterestPercentage"
    );

  DOM.propertyTaxesAmount =
    document.getElementById(
      "propertyTaxesAmount"
    );

  DOM.propertyTaxesPercentage =
    document.getElementById(
      "propertyTaxesPercentage"
    );

  DOM.homeInsuranceAmount =
    document.getElementById(
      "homeInsuranceAmount"
    );

  DOM.homeInsurancePercentage =
    document.getElementById(
      "homeInsurancePercentage"
    );

  DOM.hoaFeesAmount =
    document.getElementById(
      "hoaFeesAmount"
    );

  DOM.hoaFeesPercentage =
    document.getElementById(
      "hoaFeesPercentage"
    );

  DOM.pmiAmount =
    document.getElementById(
      "pmiAmount"
    );

  DOM.pmiPercentage =
    document.getElementById(
      "pmiPercentage"
    );

  DOM.interestRateAssumption =
    document.getElementById(
      "interestRateAssumption"
    );

  DOM.loanProgram =
    document.getElementById(
      "loanProgram"
    );

  DOM.paymentDonutSegments.principal =
    document.querySelector(
      ".payment-donut__segment--principal"
    );

  DOM.paymentDonutSegments.taxes =
    document.querySelector(
      ".payment-donut__segment--taxes"
    );

  DOM.paymentDonutSegments.insurance =
    document.querySelector(
      ".payment-donut__segment--insurance"
    );

  DOM.paymentDonutSegments.hoa =
    document.querySelector(
      ".payment-donut__segment--hoa"
    );

  DOM.paymentDonutSegments.pmi =
    document.querySelector(
      ".payment-donut__segment--pmi"
    );

  DOM.cashFlowPeriod =
    document.getElementById(
      "cashFlowPeriod"
    );

  DOM.waterfallIncomeValue =
    document.getElementById(
      "waterfallIncomeValue"
    );

  DOM.waterfallHousingValue =
    document.getElementById(
      "waterfallHousingValue"
    );

  DOM.waterfallExpensesValue =
    document.getElementById(
      "waterfallExpensesValue"
    );

  DOM.waterfallDebtValue =
    document.getElementById(
      "waterfallDebtValue"
    );

  DOM.waterfallSavingsValue =
    document.getElementById(
      "waterfallSavingsValue"
    );

  DOM.waterfallRemainingValue =
    document.getElementById(
      "waterfallRemainingValue"
    );

  DOM.waterfallIncomeBar =
    document.getElementById(
      "waterfallIncomeBar"
    );

  DOM.waterfallHousingBar =
    document.getElementById(
      "waterfallHousingBar"
    );

  DOM.waterfallExpensesBar =
    document.getElementById(
      "waterfallExpensesBar"
    );

  DOM.waterfallDebtBar =
    document.getElementById(
      "waterfallDebtBar"
    );

  DOM.waterfallSavingsBar =
    document.getElementById(
      "waterfallSavingsBar"
    );

  DOM.waterfallRemainingBar =
    document.getElementById(
      "waterfallRemainingBar"
    );

  DOM.waterfallConnectorPath =
    document.getElementById(
      "waterfallConnectorPath"
    );

  DOM.monthlyFlowInsightAmount =
    document.getElementById(
      "monthlyFlowInsightAmount"
    );

  DOM.debtSummaryMonthly =
    document.getElementById(
      "debtSummaryMonthly"
    );

  DOM.debtSummaryRatio =
    document.getElementById(
      "debtSummaryRatio"
    );

  DOM.debtSummaryRatioStatus =
    document.getElementById(
      "debtSummaryRatioStatus"
    );

  DOM.vaFundingFee =
    document.getElementById(
      "vaFundingFee"
    );

  DOM.vaFundingFeeStatus =
    document.getElementById(
      "vaFundingFeeStatus"
    );

  DOM.downPaymentSummaryLabel =
    document.getElementById(
      "downPaymentSummaryLabel"
    );

  DOM.downPaymentSummaryAmount =
    document.getElementById(
      "downPaymentSummaryAmount"
    );

  DOM.closingCostsSummary =
    document.getElementById(
      "closingCostsSummary"
    );

  DOM.prepaidsEscrowAmount =
    document.getElementById(
      "prepaidsEscrowAmount"
    );

  DOM.totalDueAtClosing =
    document.getElementById(
      "totalDueAtClosing"
    );

  DOM.reservesAfterClosing =
    document.getElementById(
      "reservesAfterClosing"
    );

  DOM.reservesStatus =
    document.getElementById(
      "reservesStatus"
    );

  DOM.reservesDescription =
    document.getElementById(
      "reservesDescription"
    );

  DOM.affordabilityResultHeadline =
    document.getElementById(
      "affordabilityResultHeadline"
    );

  DOM.affordabilityResultCopy =
    document.getElementById(
      "affordabilityResultCopy"
    );

  DOM.affordabilityGaugeNeedle =
    document.getElementById(
      "affordabilityGaugeNeedle"
    );

  DOM.affordabilityGaugePercentage =
    document.getElementById(
      "affordabilityGaugePercentage"
    );

  DOM.affordabilityGaugeStatus =
    document.getElementById(
      "affordabilityGaugeStatus"
    );

  DOM.priceScenariosToggle =
    document.getElementById(
      "priceScenariosToggle"
    );

  DOM.priceScenariosList =
    document.getElementById(
      "priceScenariosList"
    );

  DOM.lowerScenarioPrice =
    document.getElementById(
      "lowerScenarioPrice"
    );

  DOM.lowerScenarioPayment =
    document.getElementById(
      "lowerScenarioPayment"
    );

  DOM.lowerScenarioRatio =
    document.getElementById(
      "lowerScenarioRatio"
    );

  DOM.selectedScenarioPrice =
    document.getElementById(
      "selectedScenarioPrice"
    );

  DOM.selectedScenarioPayment =
    document.getElementById(
      "selectedScenarioPayment"
    );

  DOM.selectedScenarioRatio =
    document.getElementById(
      "selectedScenarioRatio"
    );

  DOM.higherScenarioPrice =
    document.getElementById(
      "higherScenarioPrice"
    );

  DOM.higherScenarioPayment =
    document.getElementById(
      "higherScenarioPayment"
    );

  DOM.higherScenarioRatio =
    document.getElementById(
      "higherScenarioRatio"
    );

  DOM.takeawayAffordability =
    document.getElementById(
      "takeawayAffordability"
    );

  DOM.takeawayCashFlow =
    document.getElementById(
      "takeawayCashFlow"
    );

  DOM.takeawayReserves =
    document.getElementById(
      "takeawayReserves"
    );

  DOM.takeawayVALoan =
    document.getElementById(
      "takeawayVALoan"
    );

  DOM.viewDebtDetailsButton =
    document.getElementById(
      "viewDebtDetailsButton"
    );

  DOM.fullAnalysisReportButton =
    document.getElementById(
      "fullAnalysisReportButton"
    );

  DOM.analysisReportModal =
    document.getElementById(
      "analysisReportModal"
    );

  DOM.closeAnalysisReportButton =
    document.getElementById(
      "closeAnalysisReportButton"
    );

  DOM.analysisReportContent =
    document.getElementById(
      "analysisReportContent"
    );

  DOM.analysisNextButton =
    document.getElementById(
      "analysisNextButton"
    );

  DOM.progressSteps = [
    ...document.querySelectorAll(
      ".analysis-progress__step"
    )
  ];
}


/* ============================================================
   28. EVENT BINDING
   ============================================================ */

function bindEvents() {
  DOM.askAmyButton?.addEventListener(
    "click",
    openAmyPanel
  );

  DOM.closeAmyPanelButton
    ?.addEventListener(
      "click",
      closeAmyPanel
    );

  DOM.amyPanelBackdrop
    ?.addEventListener(
      "click",
      handleBackdropClick
    );

  DOM.amyComposer?.addEventListener(
    "submit",
    handleAmySubmit
  );

  DOM.cashFlowPeriod
    ?.addEventListener(
      "change",
      handleCashFlowPeriodChange
    );

  DOM.priceScenariosToggle
    ?.addEventListener(
      "click",
      togglePriceScenarios
    );

  DOM.viewDebtDetailsButton
    ?.addEventListener(
      "click",
      handleDebtDetails
    );

  DOM.fullAnalysisReportButton
    ?.addEventListener(
      "click",
      openAnalysisReport
    );

  DOM.closeAnalysisReportButton
    ?.addEventListener(
      "click",
      closeAnalysisReport
    );

  DOM.analysisReportModal
    ?.addEventListener(
      "click",
      handleBackdropClick
    );

  DOM.analysisNextButton
    ?.addEventListener(
      "click",
      handleNext
    );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  window.addEventListener(
    "resize",
    renderWaterfallChart,
    { passive: true }
  );

  window.addEventListener(
    "pcsunited:basicbrain-updated",
    refreshAnalysis
  );

  window.addEventListener(
    "pcsunited:compensation-ready",
    refreshAnalysis
  );

  window.addEventListener(
    "pcsunited:mortgage-ready",
    refreshAnalysis
  );

  window.addEventListener(
    "pcsunited:mortgage-updated",
    refreshAnalysis
  );

  window.addEventListener(
    "pcsunited:financial-ready",
    refreshAnalysis
  );

  window.addEventListener(
    "pcsunited:financial-updated",
    refreshAnalysis
  );
}


/* ============================================================
   29. LIVE REFRESH
   ============================================================ */

function refreshAnalysis() {
  collectSourceData();
  normalizeAllData();
  renderApplication();
  saveAnalysisSnapshot();
}


/* ============================================================
   30. PUBLIC API
   ============================================================ */

window.PCSUnitedAnalysis = {
  getState() {
    return cloneData(
      analysisState
    );
  },

  getAnalysis() {
    return cloneData(
      analysisState.analysis
    );
  },

  refresh() {
    refreshAnalysis();
  },

  updateSources({
    profile,
    mortgage,
    financial
  } = {}) {
    if (profile !== undefined) {
      analysisState.source.profile =
        profile;
    }

    if (mortgage !== undefined) {
      analysisState.source.mortgage =
        mortgage;
    }

    if (financial !== undefined) {
      analysisState.source.financial =
        financial;
    }

    normalizeAllData();
    renderApplication();
    saveAnalysisSnapshot();
  },

  openAmy() {
    openAmyPanel();
  },

  openReport() {
    openAnalysisReport();
  }
};


/* ============================================================
   31. INITIALIZATION
   ============================================================ */

function initializePCSUnitedAnalysis() {
  cacheDOM();

  if (!DOM.app) {
    console.error(
      "PCSUnited Analysis could not initialize because #pcsuAnalysisApp is missing."
    );

    return;
  }

  bindEvents();
  collectSourceData();
  normalizeAllData();
  renderApplication();
  saveAnalysisSnapshot();

  document.documentElement.classList.add(
    "pcsu-analysis-ready"
  );

  window.dispatchEvent(
    new CustomEvent(
      "pcsunited:analysis-ready",
      {
        detail: {
          profile:
            cloneData(
              analysisState.normalized.profile
            ),

          home:
            cloneData(
              analysisState.normalized.home
            ),

          mortgage:
            cloneData(
              analysisState.normalized.mortgage
            ),

          financial:
            cloneData(
              analysisState.normalized.financial
            ),

          analysis:
            cloneData(
              analysisState.analysis
            )
        }
      }
    )
  );
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializePCSUnitedAnalysis,
    { once: true }
  );
} else {
  initializePCSUnitedAnalysis();
}
