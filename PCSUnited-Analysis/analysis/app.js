/* ============================================================
   PCSUnited
   Home Buying Financial Analysis Dashboard
   analysis/app.js
   v1.0.0

   PURPOSE
   ------------------------------------------------------------
   Combines and normalizes data from:

   1. PCSUnited BasicBrain
   2. PCSUnited Mortgage Calculator
   3. PCSUnited Financial Budget Builder

   Then produces:

   - Housing affordability verdict
   - Monthly housing payment breakdown
   - Monthly cash-flow analysis
   - Debt-to-income analysis
   - Estimated upfront costs
   - Post-closing reserve analysis
   - Home-price comparisons
   - Key takeaways
   - Full report content
   - Ask Amy analysis context

   PUBLIC API
   ------------------------------------------------------------
   window.PCSUnitedAnalysis.getState()
   window.PCSUnitedAnalysis.getAnalysis()
   window.PCSUnitedAnalysis.refresh()
   window.PCSUnitedAnalysis.updateSources()
   window.PCSUnitedAnalysis.openAmy()
   window.PCSUnitedAnalysis.openReport()
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     1. CONFIGURATION
     ========================================================== */

  const PCSU_ANALYSIS_CONFIG = Object.freeze({
    version: "1.0.0",

    storageKeys: Object.freeze({
      analysis: "pcsunited.analysis.v1",
      basicBrain: "pcsunited.basicbrain.v1",
      mortgage: "pcsunited.mortgage.v1",
      financial: "pcsunited.financial.v1",
      selectedHome: "pcsunited.selectedHome.v1"
    }),

    globalKeys: Object.freeze({
      basicBrain: [
        "PCSUnitedBasicBrain",
        "PCSU_BASICBRAIN_CURRENT",
        "PCSUnitedProfile",
        "PCSUnitedCompensation"
      ],

      mortgage: [
        "PCSUnitedMortgage",
        "PCSU_MORTGAGE_CURRENT",
        "PCSUnitedMortgageResult"
      ],

      financial: [
        "PCSUnitedFinancial",
        "PCSU_FINANCIAL_CURRENT",
        "PCSUnitedBudget"
      ],

      selectedHome: [
        "PCSUnitedSelectedHome",
        "PCSU_SELECTED_HOME"
      ]
    }),

    affordability: Object.freeze({
      healthyHousingRatio: 0.36,
      strongHousingRatio: 0.30,
      cautionHousingRatio: 0.41,
      maximumDTI: 0.43,
      strongDTI: 0.25,
      minimumReserveMonths: 3,
      strongReserveMonths: 6,
      recommendedCashFlowRatio: 0.15
    }),

    mortgageDefaults: Object.freeze({
      interestRate: 6.375,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceRate: 0.004,
      closingCostRate: 0.03,
      prepaidRate: 0.0065,
      downPaymentPercent: 10,
      hoaMonthly: 100,
      pmiMonthly: 0,
      fundingFee: 0
    }),

    navigation: Object.freeze({
      nextUrl: "../",
      debtDetailsUrl: "../"
    })
  });


  /* ==========================================================
     2. DEMO FALLBACK DATA
     ========================================================== */

  const PCSU_ANALYSIS_DEMO = Object.freeze({
    profile: {
      firstName: "John",
      rank: "E-7",
      rankLabel: "Master Sergeant",
      base: "Lackland AFB",
      baseCity: "San Antonio",
      state: "TX",
      yearsOfService: 16,
      dependents: true,
      vaDisabilityExempt: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=85"
    },

    selectedHome: {
      price: 475000,
      bedrooms: 4,
      bathrooms: 2.5,
      squareFeet: 2100,
      city: "San Antonio",
      state: "TX",
      imageUrl:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=85"
    },

    income: {
      monthlyGross: 10000,
      monthlyTakeHome: 7910,
      basePay: 5200,
      bah: 2100,
      bas: 460,
      otherIncome: 150
    },

    mortgage: {
      homePrice: 475000,
      downPayment: 47500,
      downPaymentPercent: 10,
      loanAmount: 427500,
      interestRate: 6.375,
      loanTermYears: 30,
      principalInterest: 1910,
      propertyTaxes: 380,
      insurance: 150,
      hoa: 100,
      pmi: 40,
      fundingFee: 0,
      totalMonthly: 2580,
      closingCosts: 14250,
      prepaidsEscrow: 3100,
      loanProgram: "VA Loan"
    },

    financial: {
      monthlyExpenses: 1890,
      monthlyDebt: 450,
      monthlySavings: 1270,
      availableCash: 83600,
      emergencyFund: 18750,
      expenseCategories: {
        housing: 0,
        utilities: 430,
        transportation: 620,
        food: 540,
        personal: 300
      },

      debtItems: [
        {
          name: "Vehicle Loan",
          balance: 16500,
          monthlyPayment: 390
        },
        {
          name: "Credit Card",
          balance: 1800,
          monthlyPayment: 60
        }
      ]
    }
  });


  /* ==========================================================
     3. STATE
     ========================================================== */

  const analysisState = {
    version: PCSU_ANALYSIS_CONFIG.version,

    initialized: false,
    usingDemoData: false,

    sources: {
      profile: null,
      selectedHome: null,
      income: null,
      mortgage: null,
      financial: null
    },

    analysis: null,

    ui: {
      cashFlowPeriod: "monthly",
      scenariosExpanded: true,
      amyOpen: false,
      reportOpen: false
    },

    updatedAt: null
  };


  /* ==========================================================
     4. DOM CACHE
     ========================================================== */

  const DOM = {};


  /* ==========================================================
     5. GENERAL UTILITIES
     ========================================================== */

  function isPlainObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function safeNumber(value, fallback = 0) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? value
        : fallback;
    }

    if (typeof value === "string") {
      const cleaned = value
        .replace(/[$,%\s]/g, "")
        .replace(/,/g, "");

      const parsed = Number(cleaned);

      return Number.isFinite(parsed)
        ? parsed
        : fallback;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }


  function safeString(value, fallback = "") {
    if (
      value === null ||
      value === undefined
    ) {
      return fallback;
    }

    const stringValue = String(value).trim();

    return stringValue || fallback;
  }


  function safeBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    if (typeof value === "string") {
      const normalized = value
        .trim()
        .toLowerCase();

      if (
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "1"
      ) {
        return true;
      }

      if (
        normalized === "false" ||
        normalized === "no" ||
        normalized === "0"
      ) {
        return false;
      }
    }

    return fallback;
  }


  function clamp(value, minimum, maximum) {
    return Math.min(
      Math.max(value, minimum),
      maximum
    );
  }


  function round(value, precision = 0) {
    const multiplier = 10 ** precision;

    return (
      Math.round(
        (safeNumber(value) + Number.EPSILON) *
        multiplier
      ) / multiplier
    );
  }


  function sum(values) {
    return values.reduce(
      (total, value) =>
        total + safeNumber(value),
      0
    );
  }


  function divide(numerator, denominator, fallback = 0) {
    const safeDenominator = safeNumber(denominator);

    if (safeDenominator === 0) {
      return fallback;
    }

    return (
      safeNumber(numerator) /
      safeDenominator
    );
  }


  function deepClone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      try {
        return JSON.parse(
          JSON.stringify(value)
        );
      } catch (jsonError) {
        return value;
      }
    }
  }


  function getNestedValue(object, paths, fallback = undefined) {
    if (!isPlainObject(object)) {
      return fallback;
    }

    const pathList = Array.isArray(paths)
      ? paths
      : [paths];

    for (const path of pathList) {
      if (!path) {
        continue;
      }

      const segments = String(path).split(".");
      let current = object;
      let found = true;

      for (const segment of segments) {
        if (
          current === null ||
          current === undefined ||
          !Object.prototype.hasOwnProperty.call(
            current,
            segment
          )
        ) {
          found = false;
          break;
        }

        current = current[segment];
      }

      if (
        found &&
        current !== null &&
        current !== undefined &&
        current !== ""
      ) {
        return current;
      }
    }

    return fallback;
  }


  function firstDefined(...values) {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        return value;
      }
    }

    return undefined;
  }


  function mergeObjects(...objects) {
    return objects.reduce(
      (result, object) => {
        if (!isPlainObject(object)) {
          return result;
        }

        Object.entries(object).forEach(
          ([key, value]) => {
            if (
              isPlainObject(value) &&
              isPlainObject(result[key])
            ) {
              result[key] = mergeObjects(
                result[key],
                value
              );
            } else if (
              value !== undefined &&
              value !== null
            ) {
              result[key] = deepClone(value);
            }
          }
        );

        return result;
      },
      {}
    );
  }


  function formatCurrency(
    value,
    options = {}
  ) {
    const {
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
      showSign = false
    } = options;

    const number = safeNumber(value);

    const formatter = new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        minimumFractionDigits,
        maximumFractionDigits,
        signDisplay: showSign
          ? "exceptZero"
          : "auto"
      }
    );

    return formatter.format(number);
  }


  function formatCompactCurrency(value) {
    const number = safeNumber(value);

    if (Math.abs(number) >= 1000000) {
      return `$${round(number / 1000000, 1)}M`;
    }

    if (Math.abs(number) >= 1000) {
      return `$${round(number / 1000, 1)}K`;
    }

    return formatCurrency(number);
  }


  function formatPercent(
    value,
    options = {}
  ) {
    const {
      decimals = 0,
      inputIsRatio = true
    } = options;

    const normalized = inputIsRatio
      ? safeNumber(value) * 100
      : safeNumber(value);

    return `${round(normalized, decimals)}%`;
  }


  function formatInteger(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 0
      }
    ).format(
      safeNumber(value)
    );
  }


  function setText(element, value) {
    if (!element) {
      return;
    }

    element.textContent =
      value === null ||
      value === undefined
        ? ""
        : String(value);
  }


  function setHTML(element, value) {
    if (!element) {
      return;
    }

    element.innerHTML =
      value === null ||
      value === undefined
        ? ""
        : String(value);
  }


  function setImageSource(
    element,
    source,
    fallbackSource = ""
  ) {
    if (!element) {
      return;
    }

    const resolvedSource =
      safeString(source) ||
      safeString(fallbackSource);

    if (resolvedSource) {
      element.src = resolvedSource;
    }
  }


  function toggleClass(
    element,
    className,
    enabled
  ) {
    if (!element) {
      return;
    }

    element.classList.toggle(
      className,
      Boolean(enabled)
    );
  }


  function setStatusClass(
    element,
    baseClass,
    status
  ) {
    if (!element) {
      return;
    }

    const statuses = [
      "excellent",
      "strong",
      "healthy",
      "good",
      "warning",
      "caution",
      "danger",
      "weak"
    ];

    statuses.forEach((item) => {
      element.classList.remove(
        `${baseClass}--${item}`
      );
    });

    if (status) {
      element.classList.add(
        `${baseClass}--${status}`
      );
    }
  }


  function emitEvent(name, detail) {
    try {
      window.dispatchEvent(
        new CustomEvent(name, {
          detail
        })
      );
    } catch (error) {
      console.warn(
        `[PCSUnited Analysis] Unable to emit ${name}`,
        error
      );
    }
  }


  function parseJSON(value) {
    if (!value) {
      return null;
    }

    if (isPlainObject(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);

      return isPlainObject(parsed)
        ? parsed
        : null;
    } catch (error) {
      return null;
    }
  }


  /* ==========================================================
     6. STORAGE READERS
     ========================================================== */

  function readStorage(
    storage,
    keys
  ) {
    if (!storage) {
      return null;
    }

    const keyList = Array.isArray(keys)
      ? keys
      : [keys];

    for (const key of keyList) {
      try {
        const rawValue = storage.getItem(key);
        const parsed = parseJSON(rawValue);

        if (parsed) {
          return parsed;
        }
      } catch (error) {
        console.warn(
          `[PCSUnited Analysis] Could not read storage key: ${key}`,
          error
        );
      }
    }

    return null;
  }


  function readWindowGlobals(keys) {
    const keyList = Array.isArray(keys)
      ? keys
      : [keys];

    const objects = [];

    keyList.forEach((key) => {
      const value = window[key];

      if (isPlainObject(value)) {
        objects.push(value);
      }
    });

    if (!objects.length) {
      return null;
    }

    return mergeObjects(...objects);
  }


  function readSourceData(
    globalKeys,
    storageKeys
  ) {
    const globalData =
      readWindowGlobals(globalKeys);

    const sessionData =
      readStorage(
        window.sessionStorage,
        storageKeys
      );

    const localData =
      readStorage(
        window.localStorage,
        storageKeys
      );

    const combined =
      mergeObjects(
        localData || {},
        sessionData || {},
        globalData || {}
      );

    return Object.keys(combined).length
      ? combined
      : null;
  }


  function collectRawSources() {
    const basicBrain = readSourceData(
      PCSU_ANALYSIS_CONFIG.globalKeys.basicBrain,
      [
        PCSU_ANALYSIS_CONFIG.storageKeys.basicBrain,
        "pcsunited.profile.v1",
        "pcsunited.compensation.v1",
        "pcsunited.basicbrain.current",
        "pcsu.basicbrain.v1"
      ]
    );

    const mortgage = readSourceData(
      PCSU_ANALYSIS_CONFIG.globalKeys.mortgage,
      [
        PCSU_ANALYSIS_CONFIG.storageKeys.mortgage,
        "pcsunited.mortgage.current",
        "pcsunited.mortgage.result",
        "pcsu.mortgage.v1"
      ]
    );

    const financial = readSourceData(
      PCSU_ANALYSIS_CONFIG.globalKeys.financial,
      [
        PCSU_ANALYSIS_CONFIG.storageKeys.financial,
        "pcsunited.budget.v1",
        "pcsunited.financial.current",
        "pcsu.financial.v1"
      ]
    );

    const selectedHome = readSourceData(
      PCSU_ANALYSIS_CONFIG.globalKeys.selectedHome,
      [
        PCSU_ANALYSIS_CONFIG.storageKeys.selectedHome,
        "pcsunited.home.v1",
        "pcsunited.selected-property.v1"
      ]
    );

    return {
      basicBrain,
      mortgage,
      financial,
      selectedHome
    };
  }


  /* ==========================================================
     7. NORMALIZATION — PROFILE
     ========================================================== */

  function normalizeProfile(raw = {}) {
    const profileSource = mergeObjects(
      getNestedValue(
        raw,
        [
          "profile",
          "profile_used",
          "user",
          "militaryProfile"
        ],
        {}
      ),
      raw
    );

    const firstName = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "firstName",
            "first_name",
            "name.first",
            "givenName"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.firstName
      ),
      PCSU_ANALYSIS_DEMO.profile.firstName
    );

    const rank = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "rank",
            "payGrade",
            "pay_grade",
            "grade"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.rank
      ),
      PCSU_ANALYSIS_DEMO.profile.rank
    ).toUpperCase();

    const rankLabel = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "rankLabel",
            "rank_label",
            "rankName",
            "rank_name",
            "gradeLabel"
          ]
        ),
        rankToLabel(rank)
      ),
      rankToLabel(rank)
    );

    const base = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "base",
            "selectedBase",
            "selected_base",
            "installation",
            "dutyStation",
            "duty_station",
            "base.name"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.base
      ),
      PCSU_ANALYSIS_DEMO.profile.base
    );

    const baseCity = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "baseCity",
            "base_city",
            "city",
            "location.city"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.baseCity
      ),
      PCSU_ANALYSIS_DEMO.profile.baseCity
    );

    const state = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "state",
            "stateCode",
            "state_code",
            "location.state"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.state
      ),
      PCSU_ANALYSIS_DEMO.profile.state
    ).toUpperCase();

    const yearsOfService = safeNumber(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "yearsOfService",
            "years_of_service",
            "yos",
            "serviceYears"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.yearsOfService
      ),
      PCSU_ANALYSIS_DEMO.profile.yearsOfService
    );

    const dependents = safeBoolean(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "dependents",
            "hasDependents",
            "has_dependents",
            "withDependents"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.dependents
      ),
      PCSU_ANALYSIS_DEMO.profile.dependents
    );

    const vaDisabilityExempt = safeBoolean(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "vaDisabilityExempt",
            "va_disability_exempt",
            "fundingFeeExempt",
            "funding_fee_exempt"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.vaDisabilityExempt
      ),
      PCSU_ANALYSIS_DEMO.profile.vaDisabilityExempt
    );

    const avatarUrl = safeString(
      firstDefined(
        getNestedValue(
          profileSource,
          [
            "avatarUrl",
            "avatar_url",
            "photoUrl",
            "photo_url"
          ]
        ),
        PCSU_ANALYSIS_DEMO.profile.avatarUrl
      ),
      PCSU_ANALYSIS_DEMO.profile.avatarUrl
    );

    return {
      firstName,
      rank,
      rankLabel,
      base,
      baseCity,
      state,
      yearsOfService,
      dependents,
      vaDisabilityExempt,
      avatarUrl
    };
  }


  function rankToLabel(rank) {
    const rankMap = {
      E1: "Airman Basic",
      "E-1": "Airman Basic",
      E2: "Airman",
      "E-2": "Airman",
      E3: "Airman First Class",
      "E-3": "Airman First Class",
      E4: "Senior Airman",
      "E-4": "Senior Airman",
      E5: "Staff Sergeant",
      "E-5": "Staff Sergeant",
      E6: "Technical Sergeant",
      "E-6": "Technical Sergeant",
      E7: "Master Sergeant",
      "E-7": "Master Sergeant",
      E8: "Senior Master Sergeant",
      "E-8": "Senior Master Sergeant",
      E9: "Chief Master Sergeant",
      "E-9": "Chief Master Sergeant",
      O1: "Second Lieutenant",
      "O-1": "Second Lieutenant",
      O2: "First Lieutenant",
      "O-2": "First Lieutenant",
      O3: "Captain",
      "O-3": "Captain",
      O4: "Major",
      "O-4": "Major",
      O5: "Lieutenant Colonel",
      "O-5": "Lieutenant Colonel",
      O6: "Colonel",
      "O-6": "Colonel"
    };

    return (
      rankMap[rank] ||
      safeString(rank, "Service Member")
    );
  }


  /* ==========================================================
     8. NORMALIZATION — SELECTED HOME
     ========================================================== */

  function normalizeSelectedHome(
    rawHome = {},
    rawMortgage = {},
    rawProfile = {}
  ) {
    const homeSource = mergeObjects(
      getNestedValue(
        rawHome,
        [
          "selectedHome",
          "home",
          "property",
          "selectedProperty"
        ],
        {}
      ),
      getNestedValue(
        rawMortgage,
        [
          "selectedHome",
          "home",
          "property"
        ],
        {}
      ),
      rawHome
    );

    const price = safeNumber(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "price",
            "homePrice",
            "home_price",
            "purchasePrice",
            "purchase_price",
            "listPrice",
            "list_price"
          ]
        ),
        getNestedValue(
          rawMortgage,
          [
            "homePrice",
            "home_price",
            "purchasePrice",
            "inputs.homePrice"
          ]
        ),
        PCSU_ANALYSIS_DEMO.selectedHome.price
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.price
    );

    const bedrooms = safeNumber(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "bedrooms",
            "beds",
            "bedroomCount",
            "bedroom_count"
          ]
        ),
        PCSU_ANALYSIS_DEMO.selectedHome.bedrooms
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.bedrooms
    );

    const bathrooms = safeNumber(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "bathrooms",
            "baths",
            "bathroomCount",
            "bathroom_count"
          ]
        ),
        PCSU_ANALYSIS_DEMO.selectedHome.bathrooms
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.bathrooms
    );

    const squareFeet = safeNumber(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "squareFeet",
            "square_feet",
            "sqft",
            "livingArea"
          ]
        ),
        PCSU_ANALYSIS_DEMO.selectedHome.squareFeet
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.squareFeet
    );

    const city = safeString(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "city",
            "location.city",
            "address.city"
          ]
        ),
        rawProfile.baseCity,
        PCSU_ANALYSIS_DEMO.selectedHome.city
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.city
    );

    const state = safeString(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "state",
            "stateCode",
            "state_code",
            "location.state",
            "address.state"
          ]
        ),
        rawProfile.state,
        PCSU_ANALYSIS_DEMO.selectedHome.state
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.state
    ).toUpperCase();

    const imageUrl = safeString(
      firstDefined(
        getNestedValue(
          homeSource,
          [
            "imageUrl",
            "image_url",
            "photo",
            "photoUrl",
            "photo_url",
            "primaryImage"
          ]
        ),
        PCSU_ANALYSIS_DEMO.selectedHome.imageUrl
      ),
      PCSU_ANALYSIS_DEMO.selectedHome.imageUrl
    );

    return {
      price,
      bedrooms,
      bathrooms,
      squareFeet,
      city,
      state,
      imageUrl
    };
  }


  /* ==========================================================
     9. NORMALIZATION — INCOME
     ========================================================== */

  function normalizeIncome(raw = {}) {
    const incomeSource = mergeObjects(
      getNestedValue(
        raw,
        [
          "income",
          "compensation",
          "results",
          "monthly"
        ],
        {}
      ),
      raw
    );

    const basePay = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "basePay",
            "base_pay",
            "monthlyBasePay",
            "monthly_base_pay",
            "compensation.base_pay"
          ]
        ),
        PCSU_ANALYSIS_DEMO.income.basePay
      ),
      PCSU_ANALYSIS_DEMO.income.basePay
    );

    const bah = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "bah",
            "monthlyBah",
            "monthly_bah",
            "housingAllowance",
            "housing_allowance"
          ]
        ),
        PCSU_ANALYSIS_DEMO.income.bah
      ),
      PCSU_ANALYSIS_DEMO.income.bah
    );

    const bas = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "bas",
            "monthlyBas",
            "monthly_bas",
            "subsistenceAllowance",
            "subsistence_allowance"
          ]
        ),
        PCSU_ANALYSIS_DEMO.income.bas
      ),
      PCSU_ANALYSIS_DEMO.income.bas
    );

    const otherIncome = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "otherIncome",
            "other_income",
            "monthlyOtherIncome",
            "monthly_other_income",
            "specialPay",
            "special_pay"
          ]
        ),
        PCSU_ANALYSIS_DEMO.income.otherIncome
      ),
      PCSU_ANALYSIS_DEMO.income.otherIncome
    );

    let monthlyGross = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "monthlyGross",
            "monthly_gross",
            "grossMonthlyIncome",
            "gross_monthly_income",
            "totalMonthlyCompensation",
            "total_monthly_compensation",
            "monthlyTotal",
            "monthly_total",
            "total"
          ]
        )
      )
    );

    if (!monthlyGross) {
      monthlyGross = sum([
        basePay,
        bah,
        bas,
        otherIncome
      ]);
    }

    if (!monthlyGross) {
      monthlyGross =
        PCSU_ANALYSIS_DEMO.income.monthlyGross;
    }

    let monthlyTakeHome = safeNumber(
      firstDefined(
        getNestedValue(
          incomeSource,
          [
            "monthlyTakeHome",
            "monthly_take_home",
            "takeHome",
            "take_home",
            "netMonthlyIncome",
            "net_monthly_income",
            "monthlyNet",
            "monthly_net"
          ]
        )
      )
    );

    if (!monthlyTakeHome) {
      monthlyTakeHome =
        monthlyGross * 0.791;
    }

    return {
      monthlyGross: round(monthlyGross),
      monthlyTakeHome:
        round(monthlyTakeHome),
      basePay: round(basePay),
      bah: round(bah),
      bas: round(bas),
      otherIncome: round(otherIncome)
    };
  }
    /* ==========================================================
     10. NORMALIZATION — MORTGAGE
     ========================================================== */

  function normalizeMortgage(
    raw = {},
    selectedHome = {},
    profile = {}
  ) {
    const defaults =
      PCSU_ANALYSIS_CONFIG.mortgageDefaults;

    const mortgageSource = mergeObjects(
      getNestedValue(
        raw,
        [
          "mortgage",
          "result",
          "results",
          "calculation",
          "output"
        ],
        {}
      ),
      raw
    );

    const homePrice = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "homePrice",
            "home_price",
            "purchasePrice",
            "purchase_price",
            "price",
            "inputs.homePrice"
          ]
        ),
        selectedHome.price,
        PCSU_ANALYSIS_DEMO.mortgage.homePrice
      ),
      PCSU_ANALYSIS_DEMO.mortgage.homePrice
    );

    let downPaymentPercent = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "downPaymentPercent",
            "down_payment_percent",
            "downPaymentPercentage",
            "inputs.downPaymentPercent"
          ]
        ),
        defaults.downPaymentPercent
      ),
      defaults.downPaymentPercent
    );

    if (
      downPaymentPercent > 0 &&
      downPaymentPercent <= 1
    ) {
      downPaymentPercent *= 100;
    }

    let downPayment = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "downPayment",
            "down_payment",
            "cashDown",
            "cash_down",
            "inputs.downPayment"
          ]
        )
      )
    );

    if (!downPayment) {
      downPayment =
        homePrice *
        (downPaymentPercent / 100);
    }

    const loanAmount = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "loanAmount",
            "loan_amount",
            "principal",
            "financedAmount",
            "financed_amount"
          ]
        ),
        homePrice - downPayment
      ),
      homePrice - downPayment
    );

    let interestRate = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "interestRate",
            "interest_rate",
            "rate",
            "inputs.interestRate"
          ]
        ),
        defaults.interestRate
      ),
      defaults.interestRate
    );

    if (
      interestRate > 0 &&
      interestRate < 1
    ) {
      interestRate *= 100;
    }

    const loanTermYears = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "loanTermYears",
            "loan_term_years",
            "termYears",
            "term_years",
            "term"
          ]
        ),
        defaults.loanTermYears
      ),
      defaults.loanTermYears
    );

    let principalInterest = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "principalInterest",
            "principal_interest",
            "principalAndInterest",
            "principal_and_interest",
            "monthlyPrincipalInterest",
            "monthly_principal_interest",
            "payment.principal_interest"
          ]
        )
      )
    );

    if (!principalInterest) {
      principalInterest =
        calculateMonthlyPrincipalInterest(
          loanAmount,
          interestRate,
          loanTermYears
        );
    }

    let propertyTaxes = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "propertyTaxes",
            "property_taxes",
            "taxesMonthly",
            "taxes_monthly",
            "monthlyPropertyTax",
            "monthly_property_tax",
            "payment.taxes"
          ]
        )
      )
    );

    if (!propertyTaxes) {
      const propertyTaxRate =
        normalizeRate(
          firstDefined(
            getNestedValue(
              mortgageSource,
              [
                "propertyTaxRate",
                "property_tax_rate",
                "propertyTaxRatePercent"
              ]
            ),
            defaults.propertyTaxRate
          )
        );

      propertyTaxes =
        homePrice *
        propertyTaxRate /
        12;
    }

    let insurance = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "insurance",
            "homeInsurance",
            "home_insurance",
            "insuranceMonthly",
            "insurance_monthly",
            "monthlyInsurance",
            "monthly_insurance",
            "payment.insurance"
          ]
        )
      )
    );

    if (!insurance) {
      const insuranceRate =
        normalizeRate(
          firstDefined(
            getNestedValue(
              mortgageSource,
              [
                "insuranceRate",
                "insurance_rate",
                "insuranceRatePercent"
              ]
            ),
            defaults.insuranceRate
          )
        );

      insurance =
        homePrice *
        insuranceRate /
        12;
    }

    const hoa = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "hoa",
            "hoaMonthly",
            "hoa_monthly",
            "monthlyHoa",
            "monthly_hoa",
            "payment.hoa"
          ]
        ),
        defaults.hoaMonthly
      ),
      defaults.hoaMonthly
    );

    const pmi = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "pmi",
            "pmiMonthly",
            "pmi_monthly",
            "monthlyPmi",
            "monthly_pmi",
            "payment.pmi"
          ]
        ),
        defaults.pmiMonthly
      ),
      defaults.pmiMonthly
    );

    const fundingFee = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "fundingFee",
            "funding_fee",
            "vaFundingFee",
            "va_funding_fee"
          ]
        ),
        profile.vaDisabilityExempt
          ? 0
          : defaults.fundingFee
      ),
      0
    );

    let totalMonthly = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "totalMonthly",
            "total_monthly",
            "monthlyPayment",
            "monthly_payment",
            "totalMonthlyHousingCost",
            "total_monthly_housing_cost",
            "payment.total"
          ]
        )
      )
    );

    if (!totalMonthly) {
      totalMonthly = sum([
        principalInterest,
        propertyTaxes,
        insurance,
        hoa,
        pmi
      ]);
    }

    let closingCosts = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "closingCosts",
            "closing_costs",
            "estimatedClosingCosts",
            "estimated_closing_costs"
          ]
        )
      )
    );

    if (!closingCosts) {
      closingCosts =
        homePrice *
        defaults.closingCostRate;
    }

    let prepaidsEscrow = safeNumber(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "prepaidsEscrow",
            "prepaids_escrow",
            "prepaids",
            "escrowPrepaids",
            "escrow_prepaids"
          ]
        )
      )
    );

    if (!prepaidsEscrow) {
      prepaidsEscrow =
        homePrice *
        defaults.prepaidRate;
    }

    const loanProgram = safeString(
      firstDefined(
        getNestedValue(
          mortgageSource,
          [
            "loanProgram",
            "loan_program",
            "loanType",
            "loan_type",
            "program"
          ]
        ),
        "VA Loan"
      ),
      "VA Loan"
    );

    return {
      homePrice: round(homePrice),
      downPayment: round(downPayment),
      downPaymentPercent:
        round(downPaymentPercent, 1),
      loanAmount: round(loanAmount),
      interestRate:
        round(interestRate, 3),
      loanTermYears:
        round(loanTermYears),
      principalInterest:
        round(principalInterest),
      propertyTaxes:
        round(propertyTaxes),
      insurance:
        round(insurance),
      hoa:
        round(hoa),
      pmi:
        round(pmi),
      fundingFee:
        round(fundingFee),
      totalMonthly:
        round(totalMonthly),
      closingCosts:
        round(closingCosts),
      prepaidsEscrow:
        round(prepaidsEscrow),
      loanProgram
    };
  }


  function normalizeRate(value) {
    let rate = safeNumber(value);

    if (rate > 1) {
      rate /= 100;
    }

    return rate;
  }


  function calculateMonthlyPrincipalInterest(
    principal,
    annualRatePercent,
    years
  ) {
    const loanPrincipal =
      safeNumber(principal);

    const loanYears =
      Math.max(safeNumber(years, 30), 1);

    const monthlyRate =
      safeNumber(annualRatePercent) /
      100 /
      12;

    const numberOfPayments =
      loanYears * 12;

    if (!loanPrincipal) {
      return 0;
    }

    if (!monthlyRate) {
      return (
        loanPrincipal /
        numberOfPayments
      );
    }

    const compound =
      (1 + monthlyRate) **
      numberOfPayments;

    return (
      loanPrincipal *
      (
        monthlyRate *
        compound
      ) /
      (
        compound - 1
      )
    );
  }


  /* ==========================================================
     11. NORMALIZATION — FINANCIAL DATA
     ========================================================== */

  function normalizeFinancial(raw = {}) {
    const financialSource = mergeObjects(
      getNestedValue(
        raw,
        [
          "financial",
          "budget",
          "summary",
          "results"
        ],
        {}
      ),
      raw
    );

    const expenseCategories = getNestedValue(
      financialSource,
      [
        "expenseCategories",
        "expense_categories",
        "categories",
        "expensesByCategory"
      ],
      {}
    );

    let monthlyExpenses = safeNumber(
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "monthlyExpenses",
            "monthly_expenses",
            "totalExpenses",
            "total_expenses",
            "expensesTotal",
            "expenses_total"
          ]
        )
      )
    );

    if (!monthlyExpenses) {
      monthlyExpenses =
        calculateCategoryTotal(
          expenseCategories,
          [
            "debt",
            "savings",
            "housing",
            "mortgage",
            "rent"
          ]
        );
    }

    if (!monthlyExpenses) {
      monthlyExpenses =
        PCSU_ANALYSIS_DEMO.financial.monthlyExpenses;
    }

    let monthlyDebt = safeNumber(
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "monthlyDebt",
            "monthly_debt",
            "totalDebtPayments",
            "total_debt_payments",
            "debtMonthly",
            "debt_monthly"
          ]
        )
      )
    );

    const debtItemsRaw =
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "debtItems",
            "debt_items",
            "debts",
            "liabilities"
          ]
        ),
        []
      );

    const debtItems =
      Array.isArray(debtItemsRaw)
        ? debtItemsRaw.map(
            normalizeDebtItem
          )
        : [];

    if (!monthlyDebt && debtItems.length) {
      monthlyDebt = sum(
        debtItems.map(
          (item) => item.monthlyPayment
        )
      );
    }

    if (!monthlyDebt) {
      monthlyDebt =
        PCSU_ANALYSIS_DEMO.financial.monthlyDebt;
    }

    let monthlySavings = safeNumber(
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "monthlySavings",
            "monthly_savings",
            "savingsMonthly",
            "savings_monthly",
            "savingsContribution",
            "savings_contribution"
          ]
        )
      )
    );

    if (!monthlySavings) {
      monthlySavings =
        PCSU_ANALYSIS_DEMO.financial.monthlySavings;
    }

    const availableCash = safeNumber(
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "availableCash",
            "available_cash",
            "cashAvailable",
            "cash_available",
            "totalCash",
            "total_cash",
            "cashSavings"
          ]
        ),
        PCSU_ANALYSIS_DEMO.financial.availableCash
      ),
      PCSU_ANALYSIS_DEMO.financial.availableCash
    );

    const emergencyFund = safeNumber(
      firstDefined(
        getNestedValue(
          financialSource,
          [
            "emergencyFund",
            "emergency_fund",
            "emergencySavings",
            "emergency_savings",
            "reserves"
          ]
        ),
        PCSU_ANALYSIS_DEMO.financial.emergencyFund
      ),
      PCSU_ANALYSIS_DEMO.financial.emergencyFund
    );

    return {
      monthlyExpenses:
        round(monthlyExpenses),
      monthlyDebt:
        round(monthlyDebt),
      monthlySavings:
        round(monthlySavings),
      availableCash:
        round(availableCash),
      emergencyFund:
        round(emergencyFund),
      expenseCategories:
        isPlainObject(expenseCategories)
          ? deepClone(expenseCategories)
          : {},
      debtItems
    };
  }


  function calculateCategoryTotal(
    categories,
    excludedKeys = []
  ) {
    if (!isPlainObject(categories)) {
      return 0;
    }

    const exclusions = new Set(
      excludedKeys.map(
        (key) => key.toLowerCase()
      )
    );

    return Object.entries(categories)
      .reduce(
        (total, [key, value]) => {
          if (
            exclusions.has(
              key.toLowerCase()
            )
          ) {
            return total;
          }

          if (isPlainObject(value)) {
            return (
              total +
              calculateCategoryTotal(
                value,
                excludedKeys
              )
            );
          }

          return (
            total +
            safeNumber(value)
          );
        },
        0
      );
  }


  function normalizeDebtItem(item = {}) {
    return {
      name: safeString(
        firstDefined(
          item.name,
          item.label,
          item.type
        ),
        "Debt"
      ),

      balance: round(
        safeNumber(
          firstDefined(
            item.balance,
            item.amount,
            item.currentBalance
          )
        )
      ),

      monthlyPayment: round(
        safeNumber(
          firstDefined(
            item.monthlyPayment,
            item.monthly_payment,
            item.payment
          )
        )
      )
    };
  }


  /* ==========================================================
     12. SOURCE ASSEMBLY
     ========================================================== */

  function buildNormalizedSources(
    overrides = {}
  ) {
    const raw =
      collectRawSources();

    const hasRealData = Boolean(
      raw.basicBrain ||
      raw.mortgage ||
      raw.financial ||
      raw.selectedHome ||
      overrides.basicBrain ||
      overrides.mortgage ||
      overrides.financial ||
      overrides.selectedHome
    );

    analysisState.usingDemoData =
      !hasRealData;

    const rawBasicBrain = mergeObjects(
      hasRealData
        ? {}
        : PCSU_ANALYSIS_DEMO.profile,
      raw.basicBrain || {},
      overrides.basicBrain || {}
    );

    const profile =
      normalizeProfile(rawBasicBrain);

    const income =
      normalizeIncome(
        mergeObjects(
          hasRealData
            ? {}
            : PCSU_ANALYSIS_DEMO.income,
          raw.basicBrain || {},
          overrides.basicBrain || {}
        )
      );

    const rawMortgage = mergeObjects(
      hasRealData
        ? {}
        : PCSU_ANALYSIS_DEMO.mortgage,
      raw.mortgage || {},
      overrides.mortgage || {}
    );

    const rawSelectedHome =
      mergeObjects(
        hasRealData
          ? {}
          : PCSU_ANALYSIS_DEMO.selectedHome,
        raw.selectedHome || {},
        overrides.selectedHome || {}
      );

    const selectedHome =
      normalizeSelectedHome(
        rawSelectedHome,
        rawMortgage,
        profile
      );

    const mortgage =
      normalizeMortgage(
        rawMortgage,
        selectedHome,
        profile
      );

    const financial =
      normalizeFinancial(
        mergeObjects(
          hasRealData
            ? {}
            : PCSU_ANALYSIS_DEMO.financial,
          raw.financial || {},
          overrides.financial || {}
        )
      );

    return {
      profile,
      selectedHome,
      income,
      mortgage,
      financial
    };
  }


  /* ==========================================================
     13. ANALYSIS CALCULATIONS
     ========================================================== */

  function calculateAnalysis(sources) {
    const {
      profile,
      selectedHome,
      income,
      mortgage,
      financial
    } = sources;

    const housingRatio = divide(
      mortgage.totalMonthly,
      income.monthlyTakeHome
    );

    const grossHousingRatio = divide(
      mortgage.totalMonthly,
      income.monthlyGross
    );

    const dti = divide(
      mortgage.totalMonthly +
      financial.monthlyDebt,
      income.monthlyGross
    );

    const cashLeftMonthly =
      income.monthlyTakeHome -
      mortgage.totalMonthly -
      financial.monthlyExpenses -
      financial.monthlyDebt -
      financial.monthlySavings;

    const cashLeftRatio = divide(
      cashLeftMonthly,
      income.monthlyTakeHome
    );

    const totalDueAtClosing = sum([
      mortgage.downPayment,
      mortgage.closingCosts,
      mortgage.prepaidsEscrow
    ]);

    const computedReserves =
      financial.availableCash -
      totalDueAtClosing;

    const reservesAfterClosing =
      Math.max(
        computedReserves,
        financial.emergencyFund,
        0
      );

    const essentialMonthlyOutflow = sum([
      mortgage.totalMonthly,
      financial.monthlyExpenses,
      financial.monthlyDebt
    ]);

    const reserveMonths = divide(
      reservesAfterClosing,
      essentialMonthlyOutflow
    );

    const paymentBreakdown =
      calculatePaymentBreakdown(
        mortgage
      );

    const scoreComponents =
      calculateScoreComponents({
        housingRatio,
        dti,
        cashLeftRatio,
        reserveMonths,
        totalDueAtClosing,
        availableCash:
          financial.availableCash
      });

    const affordabilityScore =
      calculateAffordabilityScore(
        scoreComponents
      );

    const verdict =
      determineAffordabilityVerdict({
        housingRatio,
        dti,
        cashLeftMonthly,
        reserveMonths,
        affordabilityScore,
        totalDueAtClosing,
        availableCash:
          financial.availableCash
      });

    const scenarios =
      calculatePriceScenarios({
        selectedHome,
        mortgage,
        income
      });

    const takeaways =
      buildTakeaways({
        profile,
        mortgage,
        financial,
        housingRatio,
        dti,
        cashLeftMonthly,
        reserveMonths,
        affordabilityScore,
        verdict
      });

    return {
      profile,
      selectedHome,
      income,
      mortgage,
      financial,

      ratios: {
        housing: housingRatio,
        grossHousing: grossHousingRatio,
        dti,
        cashLeft: cashLeftRatio
      },

      cashFlow: {
        income:
          income.monthlyTakeHome,
        housing:
          mortgage.totalMonthly,
        expenses:
          financial.monthlyExpenses,
        debt:
          financial.monthlyDebt,
        savings:
          financial.monthlySavings,
        remaining:
          cashLeftMonthly
      },

      upfront: {
        downPayment:
          mortgage.downPayment,
        closingCosts:
          mortgage.closingCosts,
        prepaidsEscrow:
          mortgage.prepaidsEscrow,
        totalDueAtClosing
      },

      reserves: {
        availableCash:
          financial.availableCash,
        afterClosing:
          reservesAfterClosing,
        months:
          reserveMonths
      },

      paymentBreakdown,
      scoreComponents,
      affordabilityScore,
      verdict,
      scenarios,
      takeaways,

      calculatedAt:
        new Date().toISOString()
    };
  }


  function calculatePaymentBreakdown(mortgage) {
    const items = [
      {
        key: "principalInterest",
        label: "Principal & Interest",
        amount:
          mortgage.principalInterest
      },
      {
        key: "propertyTaxes",
        label: "Property Taxes",
        amount:
          mortgage.propertyTaxes
      },
      {
        key: "insurance",
        label: "Homeowner's Insurance",
        amount:
          mortgage.insurance
      },
      {
        key: "hoa",
        label: "HOA Fees",
        amount:
          mortgage.hoa
      },
      {
        key: "pmi",
        label: "PMI",
        amount:
          mortgage.pmi
      }
    ];

    const total = Math.max(
      sum(
        items.map(
          (item) => item.amount
        )
      ),
      1
    );

    return items.map((item) => ({
      ...item,
      percentage:
        divide(item.amount, total)
    }));
  }


  function calculateScoreComponents({
    housingRatio,
    dti,
    cashLeftRatio,
    reserveMonths,
    totalDueAtClosing,
    availableCash
  }) {
    const housingScore =
      housingRatio <= 0.28
        ? 100
        : housingRatio <= 0.36
          ? interpolateScore(
              housingRatio,
              0.28,
              0.36,
              100,
              78
            )
          : housingRatio <= 0.43
            ? interpolateScore(
                housingRatio,
                0.36,
                0.43,
                78,
                45
              )
            : Math.max(
                0,
                interpolateScore(
                  housingRatio,
                  0.43,
                  0.55,
                  45,
                  0
                )
              );

    const dtiScore =
      dti <= 0.25
        ? 100
        : dti <= 0.43
          ? interpolateScore(
              dti,
              0.25,
              0.43,
              100,
              65
            )
          : Math.max(
              0,
              interpolateScore(
                dti,
                0.43,
                0.60,
                65,
                0
              )
            );

    const cashFlowScore =
      cashLeftRatio >= 0.20
        ? 100
        : cashLeftRatio >= 0.10
          ? interpolateScore(
              cashLeftRatio,
              0.10,
              0.20,
              70,
              100
            )
          : cashLeftRatio >= 0
            ? interpolateScore(
                cashLeftRatio,
                0,
                0.10,
                35,
                70
              )
            : 0;

    const reserveScore =
      reserveMonths >= 6
        ? 100
        : reserveMonths >= 3
          ? interpolateScore(
              reserveMonths,
              3,
              6,
              70,
              100
            )
          : reserveMonths >= 1
            ? interpolateScore(
                reserveMonths,
                1,
                3,
                35,
                70
              )
            : Math.max(
                0,
                reserveMonths * 35
              );

    const closingReadinessRatio =
      divide(
        availableCash,
        totalDueAtClosing
      );

    const closingReadinessScore =
      closingReadinessRatio >= 1.25
        ? 100
        : closingReadinessRatio >= 1
          ? interpolateScore(
              closingReadinessRatio,
              1,
              1.25,
              70,
              100
            )
          : Math.max(
              0,
              closingReadinessRatio * 70
            );

    return {
      housing: clamp(
        housingScore,
        0,
        100
      ),
      dti: clamp(
        dtiScore,
        0,
        100
      ),
      cashFlow: clamp(
        cashFlowScore,
        0,
        100
      ),
      reserves: clamp(
        reserveScore,
        0,
        100
      ),
      closingReadiness: clamp(
        closingReadinessScore,
        0,
        100
      )
    };
  }


  function interpolateScore(
    value,
    minimumValue,
    maximumValue,
    minimumScore,
    maximumScore
  ) {
    if (
      maximumValue === minimumValue
    ) {
      return maximumScore;
    }

    const progress = clamp(
      (
        value -
        minimumValue
      ) /
      (
        maximumValue -
        minimumValue
      ),
      0,
      1
    );

    return (
      minimumScore +
      progress *
      (
        maximumScore -
        minimumScore
      )
    );
  }


  function calculateAffordabilityScore(
    components
  ) {
    const score =
      components.housing * 0.30 +
      components.dti * 0.20 +
      components.cashFlow * 0.20 +
      components.reserves * 0.18 +
      components.closingReadiness * 0.12;

    return round(
      clamp(score, 0, 100)
    );
  }


  function determineAffordabilityVerdict({
    housingRatio,
    dti,
    cashLeftMonthly,
    reserveMonths,
    affordabilityScore,
    totalDueAtClosing,
    availableCash
  }) {
    const closingGap =
      availableCash -
      totalDueAtClosing;

    const criticalFailure =
      cashLeftMonthly < 0 ||
      dti > 0.50 ||
      housingRatio > 0.46 ||
      closingGap < 0;

    const caution =
      housingRatio > 0.36 ||
      dti > 0.43 ||
      reserveMonths < 3 ||
      cashLeftMonthly <
        0.08 * Math.max(
          totalDueAtClosing,
          1
        );

    if (
      !criticalFailure &&
      affordabilityScore >= 85 &&
      housingRatio <= 0.36 &&
      dti <= 0.43 &&
      reserveMonths >= 3
    ) {
      return {
        answer: "YES",
        position: "You’re in a Strong Position",
        rating: "Excellent",
        status: "strong",
        headline:
          "You can comfortably afford this home.",
        copy:
          "Your projected housing payment, debt load, monthly cash flow, and remaining reserves are all within a healthy range."
      };
    }

    if (
      !criticalFailure &&
      !caution &&
      affordabilityScore >= 70
    ) {
      return {
        answer: "YES",
        position: "This Home Appears Affordable",
        rating: "Good",
        status: "healthy",
        headline:
          "This home appears affordable.",
        copy:
          "The payment fits your current financial picture, though you should continue protecting your monthly cash flow and emergency reserves."
      };
    }

    if (
      !criticalFailure &&
      affordabilityScore >= 55
    ) {
      return {
        answer: "MAYBE",
        position: "Proceed With Caution",
        rating: "Caution",
        status: "caution",
        headline:
          "This home may be affordable with caution.",
        copy:
          "One or more areas—such as housing ratio, debt, available cash, or post-closing reserves—are close to the recommended limit."
      };
    }

    return {
      answer: "NO",
      position: "Financial Risk Is Too High",
      rating: "High Risk",
      status: "danger",
      headline:
        "This home does not currently fit comfortably.",
      copy:
        "The projected payment or upfront cash requirement places too much pressure on your current financial position."
    };
  }


  function calculatePriceScenarios({
    selectedHome,
    mortgage,
    income
  }) {
    const basePrice =
      selectedHome.price ||
      mortgage.homePrice;

    const prices = {
      lower:
        Math.max(
          basePrice - 50000,
          basePrice * 0.85
        ),

      selected:
        basePrice,

      higher:
        basePrice + 50000
    };

    return Object.entries(prices)
      .reduce(
        (result, [key, price]) => {
          const payment =
            estimateScenarioPayment({
              price,
              mortgage
            });

          result[key] = {
            price: round(price),
            payment: round(payment),
            ratio: divide(
              payment,
              income.monthlyTakeHome
            )
          };

          return result;
        },
        {}
      );
  }


  function estimateScenarioPayment({
    price,
    mortgage
  }) {
    const downPaymentRate =
      mortgage.homePrice > 0
        ? mortgage.downPayment /
          mortgage.homePrice
        : mortgage.downPaymentPercent /
          100;

    const loanAmount =
      price *
      (
        1 -
        clamp(
          downPaymentRate,
          0,
          1
        )
      );

    const principalInterest =
      calculateMonthlyPrincipalInterest(
        loanAmount,
        mortgage.interestRate,
        mortgage.loanTermYears
      );

    const taxes =
      mortgage.homePrice > 0
        ? mortgage.propertyTaxes *
          (
            price /
            mortgage.homePrice
          )
        : 0;

    const insurance =
      mortgage.homePrice > 0
        ? mortgage.insurance *
          (
            price /
            mortgage.homePrice
          )
        : 0;

    return sum([
      principalInterest,
      taxes,
      insurance,
      mortgage.hoa,
      mortgage.pmi
    ]);
  }


  function buildTakeaways({
    profile,
    mortgage,
    housingRatio,
    dti,
    cashLeftMonthly,
    reserveMonths,
    verdict
  }) {
    const affordability =
      verdict.status === "strong"
        ? "This home fits well within your current budget."
        : verdict.status === "healthy"
          ? "This home appears affordable within your current budget."
          : verdict.status === "caution"
            ? "This home is close to the upper edge of your comfortable range."
            : "This home currently places too much pressure on your budget.";

    const cashFlow =
      cashLeftMonthly >= 0
        ? `You’ll have approximately ${formatCurrency(
            cashLeftMonthly
          )} left each month after housing, expenses, debt, and planned savings.`
        : `Your projected budget is short by approximately ${formatCurrency(
            Math.abs(cashLeftMonthly)
          )} each month.`;

    const reserves =
      reserveMonths >= 6
        ? `Your estimated post-closing reserves are strong at ${round(
            reserveMonths,
            1
          )} months.`
        : reserveMonths >= 3
          ? `Your estimated reserves are adequate at ${round(
              reserveMonths,
              1
            )} months.`
          : `Your estimated reserves are below the preferred three-month minimum at ${round(
              reserveMonths,
              1
            )} months.`;

    const loanProgram =
      mortgage.loanProgram
        .toLowerCase()
        .includes("va")
        ? profile.vaDisabilityExempt
          ? "Your VA loan funding-fee exemption helps preserve more of your buying power."
          : "Your VA loan may reduce the cash required for conventional mortgage insurance."
        : `Your ${mortgage.loanProgram} structure is included in this analysis.`;

    const debt =
      dti <= 0.25
        ? "Your debt-to-income ratio is currently strong."
        : dti <= 0.43
          ? "Your debt-to-income ratio remains within a generally manageable range."
          : "Your debt-to-income ratio is above the preferred range and deserves close review.";

    return {
      affordability,
      cashFlow,
      reserves,
      loanProgram,
      debt,
      housingRatio:
        `Housing uses ${formatPercent(
          housingRatio
        )} of estimated take-home pay.`
    };
  }


  /* ==========================================================
     14. DOM CACHE
     ========================================================== */

  function cacheDOM() {
    const ids = [
      "pcsuAnalysisApp",

      "selectedHomeImage",
      "selectedHomePrice",
      "selectedHomeBedrooms",
      "selectedHomeBathrooms",
      "selectedHomeSquareFeet",
      "selectedHomeLocation",

      "analysisUserAvatar",
      "analysisUserGreeting",
      "analysisUserRank",
      "analysisUserBase",

      "askAmyButton",

      "affordabilityAnswer",
      "affordabilityPosition",
      "heroMonthlyPayment",
      "heroHousingRatio",
      "heroPaymentStatus",
      "heroCashLeft",
      "heroCashStatus",
      "heroDownPayment",
      "heroDownPaymentPercent",
      "heroDownPaymentStatus",
      "heroClosingCosts",
      "affordabilityScore",
      "affordabilityScoreRating",

      "paymentDonutTotal",
      "principalInterestAmount",
      "principalInterestPercentage",
      "propertyTaxesAmount",
      "propertyTaxesPercentage",
      "homeInsuranceAmount",
      "homeInsurancePercentage",
      "hoaFeesAmount",
      "hoaFeesPercentage",
      "pmiAmount",
      "pmiPercentage",
      "interestRateAssumption",
      "loanProgram",

      "cashFlowPeriod",
      "cashFlowWaterfall",
      "waterfallIncomeValue",
      "waterfallIncomeBar",
      "waterfallHousingValue",
      "waterfallHousingBar",
      "waterfallExpensesValue",
      "waterfallExpensesBar",
      "waterfallDebtValue",
      "waterfallDebtBar",
      "waterfallSavingsValue",
      "waterfallSavingsBar",
      "waterfallRemainingValue",
      "waterfallRemainingBar",
      "waterfallConnector",
      "waterfallConnectorPath",
      "monthlyFlowInsightAmount",

      "debtSummaryMonthly",
      "debtSummaryRatio",
      "debtSummaryRatioStatus",
      "vaFundingFee",
      "vaFundingFeeStatus",
      "viewDebtDetailsButton",

      "downPaymentSummaryLabel",
      "downPaymentSummaryAmount",
      "closingCostsSummary",
      "prepaidsEscrowAmount",
      "totalDueAtClosing",

      "reservesAfterClosing",
      "reservesStatus",
      "reservesDescription",

      "affordabilityResultHeadline",
      "affordabilityResultCopy",
      "affordabilityGaugeNeedle",
      "affordabilityGaugePercentage",
      "affordabilityGaugeStatus",

      "priceScenariosToggle",
      "priceScenariosList",
      "lowerScenarioPrice",
      "lowerScenarioPayment",
      "lowerScenarioRatio",
      "selectedScenarioPrice",
      "selectedScenarioPayment",
      "selectedScenarioRatio",
      "higherScenarioPrice",
      "higherScenarioPayment",
      "higherScenarioRatio",

      "takeawayAffordability",
      "takeawayCashFlow",
      "takeawayReserves",
      "takeawayVALoan",
      "fullAnalysisReportButton",

      "analysisNextButton",

      "amyPanelBackdrop",
      "amyPanel",
      "closeAmyPanelButton",
      "amyConversation",
      "amyComposer",
      "amyMessageInput",

      "analysisReportModal",
      "analysisReportContent",
      "closeAnalysisReportButton"
    ];

    ids.forEach((id) => {
      DOM[id] =
        document.getElementById(id);
    });

    DOM.paymentDonutSegments = {
      principalInterest:
        document.querySelector(
          ".payment-donut__segment--principal"
        ),

      propertyTaxes:
        document.querySelector(
          ".payment-donut__segment--taxes"
        ),

      insurance:
        document.querySelector(
          ".payment-donut__segment--insurance"
        ),

      hoa:
        document.querySelector(
          ".payment-donut__segment--hoa"
        ),

      pmi:
        document.querySelector(
          ".payment-donut__segment--pmi"
        )
    };

    DOM.progressSteps =
      Array.from(
        document.querySelectorAll(
          "[data-analysis-step]"
        )
      );
  }
    /* ==========================================================
     15. MAIN RENDER PIPELINE
     ========================================================== */

  function renderApplication() {
    if (!analysisState.analysis) {
      return;
    }

    renderHeader();
    renderHero();
    renderPaymentBreakdown();
    renderCashFlow();
    renderDebtSummary();
    renderUpfrontCosts();
    renderReserves();
    renderAffordabilityResult();
    renderPriceScenarios();
    renderTakeaways();
    renderReport();

    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          "stroke-width": 2
        }
      });
    }

    requestAnimationFrame(() => {
      document.body.classList.add(
        "pcsu-analysis-ready"
      );

      updateWaterfallConnector();
    });
  }


  /* ==========================================================
     16. HEADER RENDERING
     ========================================================== */

  function renderHeader() {
    const {
      profile,
      selectedHome
    } = analysisState.analysis;

    setImageSource(
      DOM.selectedHomeImage,
      selectedHome.imageUrl,
      PCSU_ANALYSIS_DEMO.selectedHome.imageUrl
    );

    setText(
      DOM.selectedHomePrice,
      formatCurrency(
        selectedHome.price
      )
    );

    setText(
      DOM.selectedHomeBedrooms,
      `${round(
        selectedHome.bedrooms,
        1
      )} bd`
    );

    setText(
      DOM.selectedHomeBathrooms,
      `${round(
        selectedHome.bathrooms,
        1
      )} ba`
    );

    setText(
      DOM.selectedHomeSquareFeet,
      `${formatInteger(
        selectedHome.squareFeet
      )} sq ft`
    );

    setText(
      DOM.selectedHomeLocation,
      [
        selectedHome.city,
        selectedHome.state
      ]
        .filter(Boolean)
        .join(", ")
    );

    setImageSource(
      DOM.analysisUserAvatar,
      profile.avatarUrl,
      PCSU_ANALYSIS_DEMO.profile.avatarUrl
    );

    setText(
      DOM.analysisUserGreeting,
      `${getGreeting()}, ${profile.firstName}!`
    );

    setText(
      DOM.analysisUserRank,
      profile.rankLabel
        ? `${profile.rankLabel} (${profile.rank})`
        : profile.rank
    );

    setText(
      DOM.analysisUserBase,
      [
        profile.base,
        profile.state
      ]
        .filter(Boolean)
        .join(", ")
    );
  }


  function getGreeting() {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }


  /* ==========================================================
     17. HERO RENDERING
     ========================================================== */

  function renderHero() {
    const analysis =
      analysisState.analysis;

    const {
      mortgage,
      cashFlow,
      upfront,
      ratios,
      affordabilityScore,
      verdict
    } = analysis;

    setText(
      DOM.affordabilityAnswer,
      verdict.answer
    );

    setHTML(
      DOM.affordabilityPosition,
      escapeHTML(
        verdict.position
      ).replace(
        /\s+/g,
        " "
      )
    );

    setText(
      DOM.heroMonthlyPayment,
      formatCurrency(
        mortgage.totalMonthly
      )
    );

    setText(
      DOM.heroHousingRatio,
      `${formatPercent(
        ratios.housing
      )} of your take-home pay`
    );

    const paymentStatus =
      getHousingStatus(
        ratios.housing
      );

    setText(
      DOM.heroPaymentStatus,
      paymentStatus.label
    );

    setStatusClass(
      DOM.heroPaymentStatus,
      "hero-status",
      paymentStatus.className
    );

    setText(
      DOM.heroCashLeft,
      formatCurrency(
        cashFlow.remaining
      )
    );

    const cashStatus =
      getCashFlowStatus(
        cashFlow.remaining,
        analysis.income.monthlyTakeHome
      );

    setText(
      DOM.heroCashStatus,
      cashStatus.label
    );

    setStatusClass(
      DOM.heroCashStatus,
      "hero-status",
      cashStatus.className
    );

    setText(
      DOM.heroDownPayment,
      formatCurrency(
        upfront.downPayment
      )
    );

    setText(
      DOM.heroDownPaymentPercent,
      `${round(
        mortgage.downPaymentPercent,
        1
      )}% of home price`
    );

    const downPaymentStatus =
      getDownPaymentStatus(
        mortgage.downPaymentPercent
      );

    setText(
      DOM.heroDownPaymentStatus,
      downPaymentStatus.label
    );

    setStatusClass(
      DOM.heroDownPaymentStatus,
      "hero-status",
      downPaymentStatus.className
    );

    setText(
      DOM.heroClosingCosts,
      formatCurrency(
        upfront.closingCosts
      )
    );

    setText(
      DOM.affordabilityScore,
      affordabilityScore
    );

    setText(
      DOM.affordabilityScoreRating,
      verdict.rating
    );
  }


  function getHousingStatus(ratio) {
    if (ratio <= 0.30) {
      return {
        label: "Strong",
        className: "strong"
      };
    }

    if (ratio <= 0.36) {
      return {
        label: "Healthy",
        className: "healthy"
      };
    }

    if (ratio <= 0.41) {
      return {
        label: "Caution",
        className: "caution"
      };
    }

    return {
      label: "High",
      className: "danger"
    };
  }


  function getCashFlowStatus(
    cashLeft,
    monthlyTakeHome
  ) {
    const ratio =
      divide(
        cashLeft,
        monthlyTakeHome
      );

    if (
      cashLeft > 0 &&
      ratio >= 0.15
    ) {
      return {
        label: "Strong",
        className: "strong"
      };
    }

    if (
      cashLeft > 0 &&
      ratio >= 0.08
    ) {
      return {
        label: "Good",
        className: "good"
      };
    }

    if (cashLeft >= 0) {
      return {
        label: "Tight",
        className: "caution"
      };
    }

    return {
      label: "Deficit",
      className: "danger"
    };
  }


  function getDownPaymentStatus(percent) {
    if (percent >= 10) {
      return {
        label: "Good",
        className: "good"
      };
    }

    if (percent > 0) {
      return {
        label: "Low Down",
        className: "healthy"
      };
    }

    return {
      label: "Zero Down",
      className: "strong"
    };
  }


  /* ==========================================================
     18. PAYMENT BREAKDOWN RENDERING
     ========================================================== */

  function renderPaymentBreakdown() {
    const {
      mortgage,
      paymentBreakdown
    } = analysisState.analysis;

    setText(
      DOM.paymentDonutTotal,
      formatCurrency(
        mortgage.totalMonthly
      )
    );

    const mapping = {
      principalInterest: {
        amount:
          DOM.principalInterestAmount,
        percentage:
          DOM.principalInterestPercentage
      },

      propertyTaxes: {
        amount:
          DOM.propertyTaxesAmount,
        percentage:
          DOM.propertyTaxesPercentage
      },

      insurance: {
        amount:
          DOM.homeInsuranceAmount,
        percentage:
          DOM.homeInsurancePercentage
      },

      hoa: {
        amount:
          DOM.hoaFeesAmount,
        percentage:
          DOM.hoaFeesPercentage
      },

      pmi: {
        amount:
          DOM.pmiAmount,
        percentage:
          DOM.pmiPercentage
      }
    };

    paymentBreakdown.forEach(
      (item) => {
        const target =
          mapping[item.key];

        if (!target) {
          return;
        }

        setText(
          target.amount,
          formatCurrency(
            item.amount
          )
        );

        setText(
          target.percentage,
          formatPercent(
            item.percentage
          )
        );
      }
    );

    renderDonutSegments(
      paymentBreakdown
    );

    setText(
      DOM.interestRateAssumption,
      `${round(
        mortgage.interestRate,
        3
      )}%`
    );

    setText(
      DOM.loanProgram,
      mortgage.loanProgram
    );
  }


  function renderDonutSegments(items) {
    let cumulativeOffset = 0;

    items.forEach((item) => {
      const segment =
        DOM.paymentDonutSegments[
          item.key
        ];

      if (!segment) {
        return;
      }

      const percentage =
        clamp(
          item.percentage * 100,
          0,
          100
        );

      segment.style.strokeDasharray =
        `${percentage} ${100 - percentage}`;

      segment.style.strokeDashoffset =
        String(-cumulativeOffset);

      cumulativeOffset += percentage;
    });
  }


  /* ==========================================================
     19. CASH-FLOW RENDERING
     ========================================================== */

  function renderCashFlow() {
    const multiplier =
      analysisState.ui.cashFlowPeriod ===
      "annual"
        ? 12
        : 1;

    const cashFlow =
      analysisState.analysis.cashFlow;

    const values = {
      income:
        cashFlow.income * multiplier,

      housing:
        cashFlow.housing * multiplier,

      expenses:
        cashFlow.expenses * multiplier,

      debt:
        cashFlow.debt * multiplier,

      savings:
        cashFlow.savings * multiplier,

      remaining:
        cashFlow.remaining * multiplier
    };

    setText(
      DOM.waterfallIncomeValue,
      formatCurrency(
        values.income
      )
    );

    setText(
      DOM.waterfallHousingValue,
      `-${formatCurrency(
        values.housing
      )}`
    );

    setText(
      DOM.waterfallExpensesValue,
      `-${formatCurrency(
        values.expenses
      )}`
    );

    setText(
      DOM.waterfallDebtValue,
      `-${formatCurrency(
        values.debt
      )}`
    );

    setText(
      DOM.waterfallSavingsValue,
      `-${formatCurrency(
        values.savings
      )}`
    );

    setText(
      DOM.waterfallRemainingValue,
      formatCurrency(
        values.remaining
      )
    );

    setText(
      DOM.monthlyFlowInsightAmount,
      formatCurrency(
        cashFlow.remaining
      )
    );

    renderWaterfallBars(values);

    requestAnimationFrame(
      updateWaterfallConnector
    );
  }


  function renderWaterfallBars(values) {
    const largest =
      Math.max(
        values.income,
        values.housing,
        values.expenses,
        values.debt,
        values.savings,
        Math.abs(
          values.remaining
        ),
        1
      );

    const barMap = [
      [
        DOM.waterfallIncomeBar,
        values.income,
        165
      ],
      [
        DOM.waterfallHousingBar,
        values.housing,
        125
      ],
      [
        DOM.waterfallExpensesBar,
        values.expenses,
        105
      ],
      [
        DOM.waterfallDebtBar,
        values.debt,
        85
      ],
      [
        DOM.waterfallSavingsBar,
        values.savings,
        95
      ],
      [
        DOM.waterfallRemainingBar,
        Math.abs(
          values.remaining
        ),
        125
      ]
    ];

    barMap.forEach(
      ([element, value, maximumHeight]) => {
        if (!element) {
          return;
        }

        const height = clamp(
          divide(
            value,
            largest
          ) *
          maximumHeight,
          12,
          maximumHeight
        );

        element.style.height =
          `${round(height)}px`;
      }
    );
  }


  function updateWaterfallConnector() {
    if (
      !DOM.cashFlowWaterfall ||
      !DOM.waterfallConnectorPath
    ) {
      return;
    }

    const chartRect =
      DOM.cashFlowWaterfall
        .getBoundingClientRect();

    if (
      !chartRect.width ||
      !chartRect.height
    ) {
      return;
    }

    const bars = [
      DOM.waterfallIncomeBar,
      DOM.waterfallHousingBar,
      DOM.waterfallExpensesBar,
      DOM.waterfallDebtBar,
      DOM.waterfallSavingsBar,
      DOM.waterfallRemainingBar
    ].filter(Boolean);

    if (bars.length < 2) {
      return;
    }

    const points = bars.map(
      (bar) => {
        const rect =
          bar.getBoundingClientRect();

        const x =
          rect.left -
          chartRect.left +
          rect.width / 2;

        const y =
          rect.top -
          chartRect.top;

        return [
          round(x, 1),
          round(y, 1)
        ];
      }
    );

    const path = points
      .map(
        ([x, y], index) =>
          `${index === 0 ? "M" : "L"}${x} ${y}`
      )
      .join(" ");

    DOM.waterfallConnectorPath
      .setAttribute(
        "d",
        path
      );
  }


  /* ==========================================================
     20. SUMMARY CARD RENDERING
     ========================================================== */

  function renderDebtSummary() {
    const {
      financial,
      ratios,
      mortgage,
      profile
    } = analysisState.analysis;

    setText(
      DOM.debtSummaryMonthly,
      formatCurrency(
        financial.monthlyDebt
      )
    );

    setText(
      DOM.debtSummaryRatio,
      formatPercent(
        ratios.dti
      )
    );

    const dtiStatus =
      getDTIStatus(
        ratios.dti
      );

    setText(
      DOM.debtSummaryRatioStatus,
      dtiStatus.label
    );

    setStatusClass(
      DOM.debtSummaryRatioStatus,
      "compact-status",
      dtiStatus.className
    );

    setText(
      DOM.vaFundingFee,
      formatCurrency(
        mortgage.fundingFee
      )
    );

    const feeStatus =
      profile.vaDisabilityExempt ||
      mortgage.fundingFee === 0
        ? {
            label: "Exempt",
            className: "good"
          }
        : {
            label: "Included",
            className: "warning"
          };

    setText(
      DOM.vaFundingFeeStatus,
      feeStatus.label
    );

    setStatusClass(
      DOM.vaFundingFeeStatus,
      "compact-status",
      feeStatus.className
    );
  }


  function getDTIStatus(ratio) {
    if (ratio <= 0.25) {
      return {
        label: "Excellent",
        className: "excellent"
      };
    }

    if (ratio <= 0.36) {
      return {
        label: "Good",
        className: "good"
      };
    }

    if (ratio <= 0.43) {
      return {
        label: "Manageable",
        className: "warning"
      };
    }

    return {
      label: "High",
      className: "danger"
    };
  }


  function renderUpfrontCosts() {
    const {
      mortgage,
      upfront
    } = analysisState.analysis;

    setText(
      DOM.downPaymentSummaryLabel,
      `Down Payment (${round(
        mortgage.downPaymentPercent,
        1
      )}%)`
    );

    setText(
      DOM.downPaymentSummaryAmount,
      formatCurrency(
        upfront.downPayment
      )
    );

    setText(
      DOM.closingCostsSummary,
      formatCurrency(
        upfront.closingCosts
      )
    );

    setText(
      DOM.prepaidsEscrowAmount,
      formatCurrency(
        upfront.prepaidsEscrow
      )
    );

    setText(
      DOM.totalDueAtClosing,
      formatCurrency(
        upfront.totalDueAtClosing
      )
    );
  }


  function renderReserves() {
    const {
      reserves
    } = analysisState.analysis;

    setText(
      DOM.reservesAfterClosing,
      formatCurrency(
        reserves.afterClosing
      )
    );

    const reserveStatus =
      getReserveStatus(
        reserves.months
      );

    setText(
      DOM.reservesStatus,
      reserveStatus.label
    );

    setStatusClass(
      DOM.reservesStatus,
      "compact-status",
      reserveStatus.className
    );

    setText(
      DOM.reservesDescription,
      `You’ll have approximately ${round(
        reserves.months,
        1
      )} months of essential expenses in reserve.`
    );
  }


  function getReserveStatus(months) {
    if (months >= 6) {
      return {
        label: "Strong",
        className: "excellent"
      };
    }

    if (months >= 3) {
      return {
        label: "Good",
        className: "good"
      };
    }

    if (months >= 1) {
      return {
        label: "Limited",
        className: "warning"
      };
    }

    return {
      label: "Low",
      className: "danger"
    };
  }


  /* ==========================================================
     21. AFFORDABILITY SIDEBAR
     ========================================================== */

  function renderAffordabilityResult() {
    const {
      verdict,
      ratios
    } = analysisState.analysis;

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
        ratios.housing
      )
    );

    const housingStatus =
      getHousingStatus(
        ratios.housing
      );

    const statusText =
      ratios.housing <= 0.36
        ? "Within the healthy range (Below 36%)"
        : ratios.housing <= 0.41
          ? "Near the upper affordability range"
          : "Above the preferred affordability range";

    setText(
      DOM.affordabilityGaugeStatus,
      statusText
    );

    setGaugeNeedle(
      ratios.housing
    );

    if (DOM.affordabilityGaugeStatus) {
      DOM.affordabilityGaugeStatus.style.color =
        getStatusColor(
          housingStatus.className
        );

      DOM.affordabilityGaugeStatus.style.background =
        getStatusBackground(
          housingStatus.className
        );
    }
  }


  function setGaugeNeedle(ratio) {
    if (!DOM.affordabilityGaugeNeedle) {
      return;
    }

    const minimumRatio = 0.18;
    const maximumRatio = 0.50;

    const progress = clamp(
      divide(
        ratio - minimumRatio,
        maximumRatio - minimumRatio
      ),
      0,
      1
    );

    const angle =
      -58 +
      progress * 116;

    DOM.affordabilityGaugeNeedle
      .style.transform =
        `rotate(${angle}deg)`;
  }


  function getStatusColor(status) {
    const map = {
      strong: "#17724a",
      healthy: "#17724a",
      good: "#17724a",
      caution: "#9a6810",
      warning: "#9a6810",
      danger: "#a43f49"
    };

    return (
      map[status] ||
      "#43506b"
    );
  }


  function getStatusBackground(status) {
    const map = {
      strong: "#effbf4",
      healthy: "#effbf4",
      good: "#effbf4",
      caution: "#fff9e8",
      warning: "#fff9e8",
      danger: "#fff2f3"
    };

    return (
      map[status] ||
      "#f8f9fc"
    );
  }


  /* ==========================================================
     22. PRICE SCENARIOS
     ========================================================== */

  function renderPriceScenarios() {
    const scenarios =
      analysisState.analysis.scenarios;

    renderScenario(
      "lower",
      scenarios.lower
    );

    renderScenario(
      "selected",
      scenarios.selected
    );

    renderScenario(
      "higher",
      scenarios.higher
    );

    updateScenarioExpansion();
  }


  function renderScenario(
    key,
    scenario
  ) {
    const map = {
      lower: {
        price:
          DOM.lowerScenarioPrice,
        payment:
          DOM.lowerScenarioPayment,
        ratio:
          DOM.lowerScenarioRatio
      },

      selected: {
        price:
          DOM.selectedScenarioPrice,
        payment:
          DOM.selectedScenarioPayment,
        ratio:
          DOM.selectedScenarioRatio
      },

      higher: {
        price:
          DOM.higherScenarioPrice,
        payment:
          DOM.higherScenarioPayment,
        ratio:
          DOM.higherScenarioRatio
      }
    };

    const target = map[key];

    if (!target || !scenario) {
      return;
    }

    setText(
      target.price,
      formatCurrency(
        scenario.price
      )
    );

    setHTML(
      target.payment,
      `${escapeHTML(
        formatCurrency(
          scenario.payment
        )
      )}<span>/mo</span>`
    );

    setText(
      target.ratio,
      formatPercent(
        scenario.ratio
      )
    );

    const status =
      scenario.ratio <= 0.36
        ? "healthy"
        : scenario.ratio <= 0.41
          ? "caution"
          : "danger";

    setStatusClass(
      target.ratio,
      "price-scenario__ratio",
      status
    );
  }


  function updateScenarioExpansion() {
    if (!DOM.priceScenariosList) {
      return;
    }

    DOM.priceScenariosList.hidden =
      !analysisState.ui.scenariosExpanded;

    if (DOM.priceScenariosToggle) {
      DOM.priceScenariosToggle
        .setAttribute(
          "aria-expanded",
          String(
            analysisState.ui
              .scenariosExpanded
          )
        );

      const icon =
        DOM.priceScenariosToggle
          .querySelector("svg");

      if (icon) {
        icon.style.transform =
          analysisState.ui
            .scenariosExpanded
            ? "rotate(0deg)"
            : "rotate(-90deg)";
      }
    }
  }


  /* ==========================================================
     23. TAKEAWAYS
     ========================================================== */

  function renderTakeaways() {
    const takeaways =
      analysisState.analysis.takeaways;

    setText(
      DOM.takeawayAffordability,
      takeaways.affordability
    );

    setText(
      DOM.takeawayCashFlow,
      takeaways.cashFlow
    );

    setText(
      DOM.takeawayReserves,
      takeaways.reserves
    );

    setText(
      DOM.takeawayVALoan,
      takeaways.loanProgram
    );
  }


  /* ==========================================================
     24. FULL REPORT
     ========================================================== */

  function renderReport() {
    if (!DOM.analysisReportContent) {
      return;
    }

    const analysis =
      analysisState.analysis;

    const reportSections = [
      {
        title: "Affordability Verdict",
        content:
          `${analysis.verdict.headline} ` +
          `${analysis.verdict.copy}`
      },
      {
        title: "Selected Home",
        content:
          `The selected home price is ${formatCurrency(
            analysis.selectedHome.price
          )}. The estimated total housing payment is ${formatCurrency(
            analysis.mortgage.totalMonthly
          )} per month.`
      },
      {
        title: "Monthly Housing Ratio",
        content:
          `The estimated housing payment uses ${formatPercent(
            analysis.ratios.housing
          )} of monthly take-home pay and ${formatPercent(
            analysis.ratios.grossHousing
          )} of monthly gross income.`
      },
      {
        title: "Debt-to-Income Position",
        content:
          `The estimated total debt-to-income ratio, including the new housing payment, is ${formatPercent(
            analysis.ratios.dti
          )}.`
      },
      {
        title: "Monthly Cash Flow",
        content:
          analysis.cashFlow.remaining >= 0
            ? `After housing, other expenses, debt payments, and planned savings, approximately ${formatCurrency(
                analysis.cashFlow.remaining
              )} remains each month.`
            : `The projected monthly budget has an estimated shortfall of ${formatCurrency(
                Math.abs(
                  analysis.cashFlow.remaining
                )
              )}.`
      },
      {
        title: "Upfront Cash Requirement",
        content:
          `Estimated cash due at closing is ${formatCurrency(
            analysis.upfront.totalDueAtClosing
          )}, including ${formatCurrency(
            analysis.upfront.downPayment
          )} for the down payment, ${formatCurrency(
            analysis.upfront.closingCosts
          )} in estimated closing costs, and ${formatCurrency(
            analysis.upfront.prepaidsEscrow
          )} for estimated prepaids and escrow.`
      },
      {
        title: "Post-Closing Reserves",
        content:
          `Estimated reserves after closing are ${formatCurrency(
            analysis.reserves.afterClosing
          )}, equal to approximately ${round(
            analysis.reserves.months,
            1
          )} months of essential expenses.`
      },
      {
        title: "Affordability Score",
        content:
          `The PCSUnited Home Affordability Score is ${analysis.affordabilityScore} out of 100, rated ${analysis.verdict.rating}.`
      }
    ];

    DOM.analysisReportContent.innerHTML =
      reportSections
        .map(
          (section) => `
            <section class="analysis-report-section">
              <h3>${escapeHTML(
                section.title
              )}</h3>

              <p>${escapeHTML(
                section.content
              )}</p>
            </section>
          `
        )
        .join("");
  }


  /* ==========================================================
     25. ASK AMY
     ========================================================== */

  function openAmyPanel() {
    if (!DOM.amyPanelBackdrop) {
      return;
    }

    analysisState.ui.amyOpen = true;
    DOM.amyPanelBackdrop.hidden = false;

    document.body.style.overflow =
      "hidden";

    requestAnimationFrame(() => {
      DOM.amyMessageInput?.focus();
    });
  }


  function closeAmyPanel() {
    if (!DOM.amyPanelBackdrop) {
      return;
    }

    analysisState.ui.amyOpen = false;
    DOM.amyPanelBackdrop.hidden = true;

    restoreBodyScroll();
  }


  function handleAmySubmit(event) {
    event.preventDefault();

    const message =
      safeString(
        DOM.amyMessageInput?.value
      );

    if (!message) {
      return;
    }

    appendAmyMessage(
      message,
      "user"
    );

    if (DOM.amyMessageInput) {
      DOM.amyMessageInput.value = "";
    }

    const response =
      buildLocalAmyResponse(message);

    window.setTimeout(() => {
      appendAmyMessage(
        response,
        "assistant"
      );
    }, 250);
  }


  function appendAmyMessage(
    message,
    role
  ) {
    if (!DOM.amyConversation) {
      return;
    }

    const article =
      document.createElement(
        "article"
      );

    article.className =
      `amy-message amy-message--${role}`;

    const paragraph =
      document.createElement("p");

    paragraph.textContent = message;

    article.appendChild(paragraph);
    DOM.amyConversation.appendChild(
      article
    );

    DOM.amyConversation.scrollTop =
      DOM.amyConversation.scrollHeight;
  }


  function buildLocalAmyResponse(message) {
    const normalized =
      message.toLowerCase();

    const analysis =
      analysisState.analysis;

    if (
      normalized.includes("afford") ||
      normalized.includes("can i buy") ||
      normalized.includes("can we buy")
    ) {
      return (
        `${analysis.verdict.headline} ` +
        `The payment is ${formatPercent(
          analysis.ratios.housing
        )} of estimated take-home pay, and your projected monthly cash remaining is ${formatCurrency(
          analysis.cashFlow.remaining
        )}.`
      );
    }

    if (
      normalized.includes("payment") ||
      normalized.includes("mortgage")
    ) {
      return (
        `The estimated total monthly housing payment is ${formatCurrency(
          analysis.mortgage.totalMonthly
        )}. That includes ${formatCurrency(
          analysis.mortgage.principalInterest
        )} for principal and interest, ${formatCurrency(
          analysis.mortgage.propertyTaxes
        )} for property taxes, ${formatCurrency(
          analysis.mortgage.insurance
        )} for insurance, ${formatCurrency(
          analysis.mortgage.hoa
        )} for HOA fees, and ${formatCurrency(
          analysis.mortgage.pmi
        )} for PMI.`
      );
    }

    if (
      normalized.includes("closing") ||
      normalized.includes("cash needed") ||
      normalized.includes("upfront")
    ) {
      return (
        `Estimated cash due at closing is ${formatCurrency(
          analysis.upfront.totalDueAtClosing
        )}. This includes the down payment, estimated closing costs, and estimated prepaids and escrow.`
      );
    }

    if (
      normalized.includes("reserve") ||
      normalized.includes("emergency")
    ) {
      return (
        `Estimated reserves after closing are ${formatCurrency(
          analysis.reserves.afterClosing
        )}, which is approximately ${round(
          analysis.reserves.months,
          1
        )} months of essential expenses.`
      );
    }

    if (
      normalized.includes("debt") ||
      normalized.includes("dti")
    ) {
      return (
        `Your estimated debt-to-income ratio after adding the home is ${formatPercent(
          analysis.ratios.dti
        )}. Monthly non-housing debt payments are approximately ${formatCurrency(
          analysis.financial.monthlyDebt
        )}.`
      );
    }

    if (
      normalized.includes("lower") ||
      normalized.includes("cheaper")
    ) {
      const scenario =
        analysis.scenarios.lower;

      return (
        `At approximately ${formatCurrency(
          scenario.price
        )}, the estimated payment falls to about ${formatCurrency(
          scenario.payment
        )} per month, or ${formatPercent(
          scenario.ratio
        )} of take-home pay.`
      );
    }

    return (
      `${analysis.verdict.headline} ` +
      `Your affordability score is ${analysis.affordabilityScore}/100. ` +
      `The estimated payment is ${formatCurrency(
        analysis.mortgage.totalMonthly
      )} per month, and projected cash remaining is ${formatCurrency(
        analysis.cashFlow.remaining
      )} per month.`
    );
  }


  /* ==========================================================
     26. REPORT MODAL
     ========================================================== */

  function openReportModal() {
    if (!DOM.analysisReportModal) {
      return;
    }

    analysisState.ui.reportOpen = true;
    DOM.analysisReportModal.hidden = false;

    document.body.style.overflow =
      "hidden";
  }


  function closeReportModal() {
    if (!DOM.analysisReportModal) {
      return;
    }

    analysisState.ui.reportOpen = false;
    DOM.analysisReportModal.hidden = true;

    restoreBodyScroll();
  }


  function restoreBodyScroll() {
    if (
      !analysisState.ui.amyOpen &&
      !analysisState.ui.reportOpen
    ) {
      document.body.style.overflow = "";
    }
  }


  /* ==========================================================
     27. EVENT HANDLERS
     ========================================================== */

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
        (event) => {
          if (
            event.target ===
            DOM.amyPanelBackdrop
          ) {
            closeAmyPanel();
          }
        }
      );

    DOM.amyComposer?.addEventListener(
      "submit",
      handleAmySubmit
    );

    DOM.fullAnalysisReportButton
      ?.addEventListener(
        "click",
        openReportModal
      );

    DOM.closeAnalysisReportButton
      ?.addEventListener(
        "click",
        closeReportModal
      );

    DOM.analysisReportModal
      ?.addEventListener(
        "click",
        (event) => {
          if (
            event.target ===
            DOM.analysisReportModal
          ) {
            closeReportModal();
          }
        }
      );

    DOM.cashFlowPeriod
      ?.addEventListener(
        "change",
        (event) => {
          analysisState.ui
            .cashFlowPeriod =
              event.target.value ===
              "annual"
                ? "annual"
                : "monthly";

          renderCashFlow();
        }
      );

    DOM.priceScenariosToggle
      ?.addEventListener(
        "click",
        () => {
          analysisState.ui
            .scenariosExpanded =
              !analysisState.ui
                .scenariosExpanded;

          updateScenarioExpansion();
        }
      );

    DOM.viewDebtDetailsButton
      ?.addEventListener(
        "click",
        handleDebtDetails
      );

    DOM.analysisNextButton
      ?.addEventListener(
        "click",
        handleSaveAndContinue
      );

    DOM.progressSteps.forEach(
      (step) => {
        step.addEventListener(
          "click",
          handleProgressStep
        );
      }
    );

    window.addEventListener(
      "resize",
      debounce(
        updateWaterfallConnector,
        100
      )
    );

    window.addEventListener(
      "keydown",
      handleGlobalKeydown
    );

    bindDataRefreshEvents();
  }


  function bindDataRefreshEvents() {
    const eventNames = [
      "pcsunited:basicbrain-updated",
      "pcsunited:profile-ready",
      "pcsunited:compensation-ready",
      "pcsunited:mortgage-updated",
      "pcsunited:mortgage-ready",
      "pcsunited:financial-updated",
      "pcsunited:budget-updated",
      "pcsunited:selected-home-updated",
      "pcsu:analysis-refresh"
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(
        eventName,
        debounce(
          refreshAnalysis,
          120
        )
      );
    });
  }


  function handleDebtDetails() {
    const debtItems =
      analysisState.analysis
        ?.financial
        ?.debtItems || [];

    if (!debtItems.length) {
      openAmyPanel();

      appendAmyMessage(
        "No itemized debt accounts were found. The analysis currently uses the total monthly debt amount supplied by your budget.",
        "assistant"
      );

      return;
    }

    openAmyPanel();

    const summary = debtItems
      .map(
        (item) =>
          `${item.name}: ${formatCurrency(
            item.monthlyPayment
          )}/month`
      )
      .join("; ");

    appendAmyMessage(
      `Your current debt details are: ${summary}.`,
      "assistant"
    );
  }


  function handleSaveAndContinue() {
    saveAnalysisSnapshot();

    if (DOM.analysisNextButton) {
      const originalHTML =
        DOM.analysisNextButton.innerHTML;

      DOM.analysisNextButton
        .classList.add(
          "analysis-next-button--complete"
        );

      DOM.analysisNextButton.innerHTML = `
        <span>Saved</span>
        <i data-lucide="check" aria-hidden="true"></i>
      `;

      if (window.lucide) {
        window.lucide.createIcons();
      }

      window.setTimeout(() => {
        DOM.analysisNextButton
          .classList.remove(
            "analysis-next-button--complete"
          );

        DOM.analysisNextButton.innerHTML =
          originalHTML;

        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, 1400);
    }

    emitEvent(
      "pcsunited:analysis-saved",
      deepClone(
        analysisState.analysis
      )
    );
  }


  function handleProgressStep(event) {
    const step =
      event.currentTarget
        .dataset.analysisStep;

    if (!step) {
      return;
    }

    emitEvent(
      "pcsunited:analysis-step-selected",
      {
        step
      }
    );
  }


  function handleGlobalKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (analysisState.ui.amyOpen) {
      closeAmyPanel();
      return;
    }

    if (
      analysisState.ui.reportOpen
    ) {
      closeReportModal();
    }
  }


  /* ==========================================================
     28. PERSISTENCE
     ========================================================== */

  function saveAnalysisSnapshot() {
    if (!analysisState.analysis) {
      return false;
    }

    const payload = {
      version:
        PCSU_ANALYSIS_CONFIG.version,

      savedAt:
        new Date().toISOString(),

      usingDemoData:
        analysisState.usingDemoData,

      analysis:
        analysisState.analysis
    };

    let saved = false;

    try {
      window.sessionStorage.setItem(
        PCSU_ANALYSIS_CONFIG
          .storageKeys.analysis,
        JSON.stringify(payload)
      );

      saved = true;
    } catch (error) {
      console.warn(
        "[PCSUnited Analysis] Unable to save analysis to sessionStorage.",
        error
      );
    }

    try {
      window.localStorage.setItem(
        PCSU_ANALYSIS_CONFIG
          .storageKeys.analysis,
        JSON.stringify(payload)
      );

      saved = true;
    } catch (error) {
      console.warn(
        "[PCSUnited Analysis] Unable to save analysis to localStorage.",
        error
      );
    }

    return saved;
  }


  /* ==========================================================
     29. REFRESH AND SOURCE UPDATES
     ========================================================== */

  function refreshAnalysis() {
    const sources =
      buildNormalizedSources();

    analysisState.sources =
      sources;

    analysisState.analysis =
      calculateAnalysis(sources);

    analysisState.updatedAt =
      new Date().toISOString();

    renderApplication();

    emitEvent(
      "pcsunited:analysis-ready",
      deepClone(
        analysisState.analysis
      )
    );

    return deepClone(
      analysisState.analysis
    );
  }


  function updateSources(
    updates = {}
  ) {
    // Merge aliases instead of OR-picking the first truthy object.
    // profile + income both feed basicBrain and must coexist.
    const sources =
      buildNormalizedSources({
        basicBrain: mergeObjects(
          updates.basicBrain || {},
          updates.profile || {},
          updates.income || {}
        ),

        mortgage:
          updates.mortgage ||
          {},

        financial: mergeObjects(
          updates.budget || {},
          updates.financial || {}
        ),

        selectedHome: mergeObjects(
          updates.home || {},
          updates.selectedHome || {}
        )
      });

    analysisState.sources =
      sources;

    analysisState.analysis =
      calculateAnalysis(sources);

    analysisState.updatedAt =
      new Date().toISOString();

    renderApplication();

    emitEvent(
      "pcsunited:analysis-updated",
      deepClone(
        analysisState.analysis
      )
    );

    return deepClone(
      analysisState.analysis
    );
  }


  /* ==========================================================
     30. PUBLIC API
     ========================================================== */

  function exposePublicAPI() {
    window.PCSUnitedAnalysis = {
      version:
        PCSU_ANALYSIS_CONFIG.version,

      getState() {
        return deepClone(
          analysisState
        );
      },

      getAnalysis() {
        return deepClone(
          analysisState.analysis
        );
      },

      getSources() {
        return deepClone(
          analysisState.sources
        );
      },

      refresh() {
        return refreshAnalysis();
      },

      updateSources(updates) {
        return updateSources(
          updates
        );
      },

      save() {
        return saveAnalysisSnapshot();
      },

      openAmy() {
        openAmyPanel();
      },

      closeAmy() {
        closeAmyPanel();
      },

      openReport() {
        openReportModal();
      },

      closeReport() {
        closeReportModal();
      }
    };
  }


  /* ==========================================================
     31. INITIALIZATION
     ========================================================== */

  function initializePCSUnitedAnalysis() {
    if (analysisState.initialized) {
      return;
    }

    analysisState.initialized = true;

    cacheDOM();
    bindEvents();
    exposePublicAPI();
    refreshAnalysis();

    if (DOM.cashFlowPeriod) {
      DOM.cashFlowPeriod.value =
        analysisState.ui
          .cashFlowPeriod;
    }

    emitEvent(
      "pcsunited:analysis-initialized",
      {
        version:
          PCSU_ANALYSIS_CONFIG.version,

        usingDemoData:
          analysisState.usingDemoData
      }
    );
  }


  /* ==========================================================
     32. SMALL HELPERS
     ========================================================== */

  function debounce(
    callback,
    delay = 100
  ) {
    let timeoutId = null;

    return function debounced(
      ...args
    ) {
      window.clearTimeout(
        timeoutId
      );

      timeoutId =
        window.setTimeout(
          () => {
            callback.apply(
              this,
              args
            );
          },
          delay
        );
    };
  }


  function escapeHTML(value) {
    return safeString(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  /* ==========================================================
     33. START APPLICATION
     ========================================================== */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializePCSUnitedAnalysis,
      {
        once: true
      }
    );
  } else {
    initializePCSUnitedAnalysis();
  }
})();
