/* ============================================================
  THEWING.AI • RETIREMENT CALCULATOR
  retirementcalculator.js
  v2.1.0
  PURPOSE
  -------------------------------------------------------------
  - Drives the Retirement Calculator UI
  - Uses Retirement-Calculator/retirement-projection.js to build
    the exact 36 monthly BASIC PAY values
  - Sends that High-36 array to TheWing's public backend
  - Keeps official-retirement.js as the retirement math authority
  - Supports one promotion during the final 36 months
  - Exposes calculator state for future Ask Amy integration
  REQUIRED SCRIPT ORDER
  -------------------------------------------------------------
  1. retirement-projection.js
  2. retirementcalculator.js
  IMPORTANT
  -------------------------------------------------------------
  - No pay tables are duplicated here
  - No retirement multiplier formula is recreated here
  - No retired-pay formula is recreated here
  - No localStorage / sessionStorage
  - Promotion month itself uses Retirement Rank
============================================================ */
(function () {
  "use strict";

  /* ============================================================
    1. ROOT / CONFIG
  ============================================================ */

  const ROOT = document.getElementById("tw-retirement-shell");

  if (!ROOT || ROOT.dataset.runtimeBound === "true") {
    return;
  }

  ROOT.dataset.runtimeBound = "true";
  ROOT.dataset.ready = "false";

  const $ = (selector) => ROOT.querySelector(selector);

  const RUNTIME_VERSION = "retirement-calculator-2026.4";

  const API_ENDPOINT =
    "https://thewing.netlify.app/api/opensource-brain";

  const API_TOOL =
    "RETIREMENT_VA";

  const HIGH36_MONTHS =
    36;

  const MIN_REGULAR_RETIREMENT_MONTHS =
    240;

  const MIN_LONG_RANGE_GROWTH_PERCENT =
    0;

  const MAX_LONG_RANGE_GROWTH_PERCENT =
    10;

  const DEFAULT_LONG_RANGE_GROWTH_PERCENT =
    2.5;

  /*
    retirement-projection.js must load before this file.
  */

  const PROJECTION =
    window.THEWING_RETIREMENT_PROJECTION ||
    null;

  /* ============================================================
    2. DOM
  ============================================================ */

  const els = {
    system:
      $("#ret-system"),

    rank:
      $("#ret-rank"),

    promotedFinal36:
      $("#ret-promoted-final-36"),

    previousRank:
      $("#ret-previous-rank"),

    promotionDate:
      $("#ret-promotion-date"),

    previousRankCard:
      $("#ret-previous-rank-card"),

    promotionDateCard:
      $("#ret-promotion-date-card"),

    entryDate:
      $("#ret-entry-date"),

    retirementDate:
      $("#ret-retirement-date"),

    payGrowth:
      $("#ret-pay-growth"),

    calculateButton:
      $("#ret-calculate-button"),

    calculateButtonLabel:
      $("#ret-calculate-button > span:nth-child(2)"),

    formMessage:
      $("#ret-form-message"),

    livePill:
      $("#ret-live-pill"),

    overviewPanel:
      $(".ret-overview"),

    payRing:
      $("#ret-pay-ring"),

    monthlyPay:
      $("#ret-monthly-pay"),

    monthlyPayMirror:
      $("#ret-monthly-pay-mirror"),

    yearlyPay:
      $("#ret-yearly-pay"),

    high3Pay:
      $("#ret-high3-pay"),

    overviewStatus:
      $("#ret-overview-status"),

    serviceAtRetirement:
      $("#ret-service-at-retirement"),

    multiplier:
      $("#ret-multiplier"),

    assumptionsCurrent:
      $(".ret-assumptions-current"),

    breakdownSystem:
      $("#ret-breakdown-system"),

    breakdownRank:
      $("#ret-breakdown-rank"),

    breakdownYos:
      $("#ret-breakdown-yos"),

    breakdownMultiplier:
      $("#ret-breakdown-multiplier"),

    breakdownHigh3:
      $("#ret-breakdown-high3"),

    breakdownMonthly:
      $("#ret-breakdown-monthly"),

    breakdownYearly:
      $("#ret-breakdown-yearly"),

    projectionIntro:
      $(".ret-projection-intro"),

    growthPillValue:
      $("#ret-growth-pill-value"),

    projectionYear1:
      $("#ret-projection-year-1"),

    projectionYear2:
      $("#ret-projection-year-2"),

    projectionYear3:
      $("#ret-projection-year-3"),

    projectionPay1:
      $("#ret-projection-pay-1"),

    projectionPay2:
      $("#ret-projection-pay-2"),

    projectionPay3:
      $("#ret-projection-pay-3"),

    high36Average:
      $("#ret-high36-average")
  };

  /* ============================================================
    3. SMALL HELPERS
  ============================================================ */

  function round2(
    value
  ) {
    return Number(
      (
        Number(value) ||
        0
      ).toFixed(2)
    );
  }

  function money0(
    value
  ) {
    return "$" +
      Math.round(
        Number(value) ||
        0
      ).toLocaleString(
        "en-US"
      );
  }

  function money2(
    value
  ) {
    return "$" +
      (
        Number(value) ||
        0
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      );
  }

  function setText(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      String(
        value == null
          ? ""
          : value
      );
  }

  function selectedOptionText(
    select
  ) {
    if (
      !select ||
      select.selectedIndex < 0
    ) {
      return "";
    }

    return String(
      select.options[
        select.selectedIndex
      ]?.textContent ||
      ""
    )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function dateToInputValue(
    date
  ) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const year =
      date.getUTCFullYear();

    const month =
      String(
        date.getUTCMonth() +
        1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getUTCDate()
      ).padStart(
        2,
        "0"
      );

    return (
      `${year}-${month}-${day}`
    );
  }

  function formatServiceMonths(
    serviceMonths
  ) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(serviceMonths) ||
          0
        )
      );

    const years =
      Math.floor(
        total /
        12
      );

    const months =
      total %
      12;

    return (
      `${years}y ${months}m`
    );
  }

  /*
    DO NOT round this before sending it to the backend.

    Example:

      241 months / 12
      =
      20.083333333333332 years
  */

  function exactYearsFromMonths(
    serviceMonths
  ) {
    return (
      Math.max(
        0,
        Number(serviceMonths) ||
        0
      ) /
      12
    );
  }

  function formatMultiplier(
    retirementRecord
  ) {
    const directPercent =
      Number(
        retirementRecord
          ?.multiplierPercent
      );

    if (
      Number.isFinite(
        directPercent
      )
    ) {
      return (
        directPercent.toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              directPercent %
              1 ===
              0
                ? 1
                : 0,

            maximumFractionDigits:
              4
          }
        ) +
        "%"
      );
    }

    const multiplier =
      Number(
        retirementRecord
          ?.multiplier
      );

    if (
      !Number.isFinite(
        multiplier
      )
    ) {
      return "—";
    }

    const percent =
      multiplier *
      100;

    return (
      percent.toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            percent %
            1 ===
            0
              ? 1
              : 0,

          maximumFractionDigits:
            4
        }
      ) +
      "%"
    );
  }

  function monthKeyToLabel(
    value
  ) {
    const raw =
      String(
        value ||
        ""
      );

    const match =
      raw.match(
        /^(\d{4})-(\d{2})/
      );

    if (!match) {
      return raw;
    }

    const date =
      new Date(
        Date.UTC(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) -
          1,
          1
        )
      );

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        year:
          "numeric",

        timeZone:
          "UTC"
      }
    ).format(
      date
    );
  }

  function cloneForPublic(
    value
  ) {
    return JSON.parse(
      JSON.stringify(
        value
      )
    );
  }

  function syncPromotionFields() {
    const promoted =
      String(
        els.promotedFinal36
          ? els.promotedFinal36.value
          : "NO"
      )
        .trim()
        .toUpperCase() ===
      "YES";

    if (
      els.previousRankCard
    ) {
      els.previousRankCard.hidden =
        !promoted;
    }

    if (
      els.promotionDateCard
    ) {
      els.promotionDateCard.hidden =
        !promoted;
    }

    if (
      els.previousRank
    ) {
      els.previousRank.disabled =
        !promoted;
    }

    if (
      els.promotionDate
    ) {
      els.promotionDate.disabled =
        !promoted;
    }

    return promoted;
  }

  function revealInitialResultOnMobile() {
    if (
      !els.overviewPanel ||
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(max-width: 768px)").matches
    ) {
      return;
    }

    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    window.requestAnimationFrame(
      () => {
        const top =
          els.overviewPanel
            .getBoundingClientRect()
            .top +
          window.scrollY -
          16;

        window.scrollTo({
          top:
            Math.max(
              0,
              top
            ),

          behavior:
            reduceMotion
              ? "auto"
              : "smooth"
        });
      }
    );
  }

  /* ============================================================
    4. PROJECTION ENGINE BRIDGE
  ============================================================ */

  function requireProjectionEngine() {
    if (
      !PROJECTION ||
      typeof PROJECTION
        .buildHigh36Projection !==
        "function"
    ) {
      throw new Error(
        "The retirement projection engine did not load. " +
        "Confirm retirement-projection.js loads before retirementcalculator.js."
      );
    }

    return PROJECTION;
  }

  function normalizeRank(
    rank
  ) {
    const engine =
      requireProjectionEngine();

    if (
      typeof engine
        .normalizeRank ===
      "function"
    ) {
      return engine.normalizeRank(
        rank
      );
    }

    return String(
      rank ||
      ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /\s+/g,
        ""
      );
  }

  function parseDateInput(
    value
  ) {
    const engine =
      requireProjectionEngine();

    if (
      typeof engine
        .parseDateInput !==
      "function"
    ) {
      throw new Error(
        "The retirement projection engine is missing parseDateInput()."
      );
    }

    return engine.parseDateInput(
      value
    );
  }

  function completedServiceMonths(
    entryDate,
    retirementDate
  ) {
    const engine =
      requireProjectionEngine();

    if (
      typeof engine
        .completedServiceMonths !==
        "function"
    ) {
      throw new Error(
        "The retirement projection engine is missing completedServiceMonths()."
      );
    }

    return engine.completedServiceMonths(
      entryDate,
      retirementDate
    );
  }

  function buildHigh36Projection(
    input
  ) {
    const engine =
      requireProjectionEngine();

    return engine.buildHigh36Projection({
      rank:
        input.rank,

      promotedFinal36:
        input.promotedFinal36,

      previousRank:
        input.previousRank,

      promotionDate:
        input.promotionDate,

      entryDate:
        input.entryDate,

      retirementDate:
        input.retirementDate,

      longRangeGrowthPercent:
        input.longRangeGrowthPercent
    });
  }

  /* ============================================================
    5. READ INPUTS
  ============================================================ */

  function readInputs() {
    const retirementSystem =
      String(
        els.system
          ? els.system.value
          : "HIGH3"
      )
        .trim()
        .toUpperCase();

    const rank =
      normalizeRank(
        els.rank
          ? els.rank.value
          : ""
      );

    const promotedFinal36 =
      String(
        els.promotedFinal36
          ? els.promotedFinal36.value
          : "NO"
      )
        .trim()
        .toUpperCase() ===
      "YES";

    const previousRank =
      promotedFinal36
        ? normalizeRank(
            els.previousRank
              ? els.previousRank.value
              : ""
          )
        : "";

    const promotionDate =
      promotedFinal36
        ? parseDateInput(
            els.promotionDate
              ? els.promotionDate.value
              : ""
          )
        : null;

    const entryDate =
      parseDateInput(
        els.entryDate
          ? els.entryDate.value
          : ""
      );

    const retirementDate =
      parseDateInput(
        els.retirementDate
          ? els.retirementDate.value
          : ""
      );

    const longRangeGrowthPercent =
      Number(
        els.payGrowth
          ? els.payGrowth.value
          : DEFAULT_LONG_RANGE_GROWTH_PERCENT
      );

    return {
      retirementSystem,

      systemLabel:
        selectedOptionText(
          els.system
        ),

      rank,

      rankLabel:
        selectedOptionText(
          els.rank
        ),

      promotedFinal36,

      previousRank,

      previousRankLabel:
        promotedFinal36
          ? selectedOptionText(
              els.previousRank
            )
          : "",

      promotionDate,

      entryDate,

      retirementDate,

      longRangeGrowthPercent
    };
  }

  /* ============================================================
    6. VALIDATION
  ============================================================ */

  function validateInputs(
    input,
    options = {}
  ) {
    const requireDates =
      options.requireDates !==
      false;

    const engine =
      requireProjectionEngine();

    if (
      ![
        "HIGH3",
        "BRS"
      ].includes(
        input.retirementSystem
      )
    ) {
      throw new Error(
        "Select High-3 or Blended Retirement System (BRS)."
      );
    }

    const supportedRanks =
      Array.isArray(
        engine.supportedRanks
      )
        ? engine.supportedRanks
        : [];

    if (
      supportedRanks.length &&
      !supportedRanks.includes(
        input.rank
      )
    ) {
      throw new Error(
        "Select a supported retirement rank."
      );
    }

    if (
      input.promotedFinal36 &&
      !input.previousRank
    ) {
      throw new Error(
        "Select your Previous Rank."
      );
    }

    if (
      input.promotedFinal36 &&
      supportedRanks.length &&
      !supportedRanks.includes(
        input.previousRank
      )
    ) {
      throw new Error(
        "Select a supported previous rank."
      );
    }

    if (
      input.promotedFinal36 &&
      input.previousRank ===
        input.rank
    ) {
      throw new Error(
        "Previous Rank must be different from Retirement Rank."
      );
    }

    if (
      requireDates &&
      input.promotedFinal36 &&
      !input.promotionDate
    ) {
      throw new Error(
        "Enter your Promotion Date."
      );
    }

    if (
      requireDates &&
      !input.entryDate
    ) {
      throw new Error(
        "Enter your Date Entered Service."
      );
    }

    if (
      requireDates &&
      !input.retirementDate
    ) {
      throw new Error(
        "Enter your Retirement Effective Date."
      );
    }

    if (
      input.entryDate &&
      input.retirementDate &&
      input.retirementDate <=
        input.entryDate
    ) {
      throw new Error(
        "Retirement Effective Date must be after Date Entered Service."
      );
    }

    if (
      input.promotedFinal36 &&
      input.promotionDate &&
      input.entryDate &&
      input.promotionDate <=
        input.entryDate
    ) {
      throw new Error(
        "Promotion Date must be after Date Entered Service."
      );
    }

    if (
      input.promotedFinal36 &&
      input.promotionDate &&
      input.retirementDate &&
      input.promotionDate >=
        input.retirementDate
    ) {
      throw new Error(
        "Promotion Date must be before Retirement Effective Date."
      );
    }

    if (
      !Number.isFinite(
        input.longRangeGrowthPercent
      ) ||
      input.longRangeGrowthPercent <
        MIN_LONG_RANGE_GROWTH_PERCENT ||
      input.longRangeGrowthPercent >
        MAX_LONG_RANGE_GROWTH_PERCENT
    ) {
      throw new Error(
        `Long-range annual pay growth must be between ` +
        `${MIN_LONG_RANGE_GROWTH_PERCENT}% and ` +
        `${MAX_LONG_RANGE_GROWTH_PERCENT}%.`
      );
    }

    if (
      input.entryDate &&
      input.retirementDate
    ) {
      const serviceMonths =
        completedServiceMonths(
          input.entryDate,
          input.retirementDate
        );

      if (
        serviceMonths <
        MIN_REGULAR_RETIREMENT_MONTHS
      ) {
        throw new Error(
          `Active-duty regular retirement requires at least 20 years ` +
          `of creditable service. Your selected dates produce ` +
          `${formatServiceMonths(serviceMonths)}.`
        );
      }
    }

    return input;
  }

  /* ============================================================
    7. DERIVED PROFILE
  ============================================================ */

  function buildServiceProfile(
    entryDate,
    retirementDate
  ) {
    if (
      !entryDate ||
      !retirementDate ||
      retirementDate <=
        entryDate
    ) {
      return null;
    }

    const serviceMonths =
      completedServiceMonths(
        entryDate,
        retirementDate
      );

    return {
      serviceMonths,

      yearsOfService:
        exactYearsFromMonths(
          serviceMonths
        ),

      display:
        formatServiceMonths(
          serviceMonths
        )
    };
  }

  function updateAssumptionLabels(
    growthPercent
  ) {
    const growth =
      Number.isFinite(
        Number(
          growthPercent
        )
      )
        ? Number(
            growthPercent
          )
        : DEFAULT_LONG_RANGE_GROWTH_PERCENT;

    setText(
      els.assumptionsCurrent,
      `2027–2030 forecast · ${round2(growth)}% long-range`
    );

    setText(
      els.growthPillValue,
      `${round2(growth)}% 2031+`
    );
  }

  function renderDerivedProfile(
    input
  ) {
    updateAssumptionLabels(
      input.longRangeGrowthPercent
    );

    setText(
      els.breakdownSystem,
      input.systemLabel ||
        input.retirementSystem ||
        "High-3"
    );

    setText(
      els.breakdownRank,
      input.rankLabel ||
        input.rank ||
        "—"
    );

    const service =
      buildServiceProfile(
        input.entryDate,
        input.retirementDate
      );

    if (!service) {
      setText(
        els.serviceAtRetirement,
        "—"
      );

      setText(
        els.breakdownYos,
        "—"
      );

      setText(
        els.multiplier,
        "—"
      );

      setText(
        els.breakdownMultiplier,
        "—"
      );

      return null;
    }

    setText(
      els.serviceAtRetirement,
      service.display
    );

    setText(
      els.breakdownYos,
      service.display
    );

    /*
      official-retirement.js owns the multiplier.

      Leave this blank until the server returns
      the official calculation.
    */

    setText(
      els.multiplier,
      "—"
    );

    setText(
      els.breakdownMultiplier,
      "—"
    );

    return service;
  }

  /* ============================================================
    8. OFFICIAL RETIREMENT API
  ============================================================ */

  let activeController =
    null;

  let requestSequence =
    0;

  async function requestOfficialRetirement(
    input,
    projection
  ) {
    if (activeController) {
      try {
        activeController.abort();
      } catch (_) {
        /* Fail open */
      }
    }

    activeController =
      new AbortController();

    const sequence =
      ++requestSequence;

    const serviceMonths =
      Number(
        projection
          .retirementServiceMonths
      );

    if (
      !Number.isFinite(
        serviceMonths
      )
    ) {
      throw new Error(
        "The projection engine did not return retirement service months."
      );
    }

    /*
      Preserve exact service precision.

      DO NOT use projection.retirementYearsOfService here because
      that value is presentation-rounded by the projection module.

      Example:

        241 / 12
        =
        20.083333333333332
    */

    const exactYearsOfService =
      exactYearsFromMonths(
        serviceMonths
      );

    const high36MonthlyArray =
      Array.isArray(
        projection.high36MonthlyArray
      )
        ? projection
            .high36MonthlyArray
            .map(
              Number
            )
        : [];

    if (
      high36MonthlyArray.length !==
      HIGH36_MONTHS
    ) {
      throw new Error(
        `The retirement projection must contain exactly ` +
        `${HIGH36_MONTHS} monthly basic-pay values.`
      );
    }

    if (
      high36MonthlyArray.some(
        value =>
          !Number.isFinite(
            value
          ) ||
          value <=
            0
      )
    ) {
      throw new Error(
        "The retirement projection contains an invalid monthly basic-pay value."
      );
    }

    /*
      CURRENT BACKEND BRIDGE
      -----------------------------------------------------------
      opensource-brain currently exposes RETIREMENT_VA.

      vaRating: 0 keeps the request retirement-only.

      serviceMonths is included for forward compatibility with
      official-retirement.js v1.2+, while exact yos remains
      necessary for the current opensource-brain bridge.
    */

    const body = {
      tool:
        API_TOOL,

      input: {
        rank:
          input.rank,

        yos:
          exactYearsOfService,

        yearsOfService:
          exactYearsOfService,

        serviceMonths,

        retirementSystem:
          input.retirementSystem,

        /*
          RETIREMENT ONLY
        */

        vaRating:
          0,

        spouse:
          false,

        childrenUnder18:
          0,

        childrenInSchoolOver18:
          0,

        dependentParents:
          0,

        /*
          EXACT HIGH-36
        */

        high36MonthlyArray
      }
    };

    const response =
      await fetch(
        API_ENDPOINT,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              body
            ),

          signal:
            activeController.signal
        }
      );

    let data =
      null;

    try {
      data =
        await response.json();
    } catch (_) {
      throw new Error(
        "The retirement service returned an unreadable response."
      );
    }

    if (
      sequence !==
      requestSequence
    ) {
      throw new DOMException(
        "Stale retirement request.",
        "AbortError"
      );
    }

    if (
      !response.ok ||
      !data ||
      data.ok !==
        true
    ) {
      throw new Error(
        data?.error ||
        `Retirement service error (${response.status}).`
      );
    }

    const payload =
      data.payload ||
      data.data ||
      {};

    const retirementRecord =
      payload.retirementRecord ||
      payload
        .calculator
        ?.retirementRecord ||
      payload
        .compensation
        ?.detail
        ?.retirementRecord ||
      null;

    if (
      !retirementRecord ||
      retirementRecord.ok ===
        false
    ) {
      throw new Error(
        retirementRecord?.error ||
        "The official retirement engine did not return a calculation."
      );
    }

    /*
      Do not accept a final-month-pay proxy.

      This calculator must use the exact projected High-36.
    */

    if (
      retirementRecord.baseMethod !==
      "HIGH36_AVERAGE"
    ) {
      throw new Error(
        "The official retirement engine did not use the projected High-36 array."
      );
    }

    if (
      Number(
        retirementRecord
          .monthsUsedForBase ||
        0
      ) !==
      HIGH36_MONTHS
    ) {
      throw new Error(
        `Expected ${HIGH36_MONTHS} months in the High-3 calculation, ` +
        `but the server used ${retirementRecord.monthsUsedForBase || 0}.`
      );
    }

    /*
      VERSION LOCK
      -----------------------------------------------------------
      retirement-projection.js mirrors official-pay-2026.1.

      If official-pay.js is updated later, stop rather than silently
      calculating from a stale browser projection baseline.
    */

    const backendPayVersion =
      payload.payRateVersion ||
      data.meta
        ?.sourceVersions
        ?.payVersion ||
      payload.sourceVersions
        ?.payVersion ||
      null;

    const projectionPayVersion =
      projection.payBaselineVersion ||
      PROJECTION
        ?.payBaselineVersion ||
      null;

    if (
      backendPayVersion &&
      projectionPayVersion &&
      backendPayVersion !==
        projectionPayVersion
    ) {
      throw new Error(
        `Pay-table version mismatch. retirement-projection.js uses ` +
        `${projectionPayVersion}, but the backend reports ` +
        `${backendPayVersion}.`
      );
    }

    return {
      data,

      payload,

      retirementRecord,

      exactYearsOfService,

      serviceMonths,

      sourceVersions:
        data.meta
          ?.sourceVersions ||
        payload.sourceVersions ||
        {}
    };
  }

  /* ============================================================
    9. UI STATE
  ============================================================ */

  function setLoading(
    isLoading
  ) {
    ROOT.dataset.loading =
      isLoading
        ? "true"
        : "false";

    if (
      els.calculateButton
    ) {
      els.calculateButton.disabled =
        Boolean(
          isLoading
        );

      els.calculateButton.setAttribute(
        "aria-busy",
        isLoading
          ? "true"
          : "false"
      );
    }

    if (
      els.calculateButtonLabel
    ) {
      els.calculateButtonLabel.textContent =
        isLoading
          ? "Calculating..."
          : "Calculate Retirement Pay";
    }
  }

  function clearError() {
    ROOT.dataset.error =
      "false";

    setText(
      els.formMessage,
      ""
    );
  }

  function showError(
    message
  ) {
    ROOT.dataset.error =
      "true";

    ROOT.dataset.hasResult =
      "false";

    setText(
      els.formMessage,
      message ||
        "Unable to calculate retirement pay."
    );
  }

  function resetResults(
    options = {}
  ) {
    const preserveProfile =
      options.preserveProfile ===
      true;

    ROOT.dataset.hasResult =
      "false";

    if (
      els.payRing
    ) {
      els.payRing.style.setProperty(
        "--pct",
        "0"
      );
    }

    setText(
      els.monthlyPay,
      "$0"
    );

    setText(
      els.monthlyPayMirror,
      "$0"
    );

    setText(
      els.yearlyPay,
      "$0"
    );

    setText(
      els.high3Pay,
      "$0"
    );

    setText(
      els.breakdownHigh3,
      "$0"
    );

    setText(
      els.breakdownMonthly,
      "$0"
    );

    setText(
      els.breakdownYearly,
      "$0"
    );

    setText(
      els.multiplier,
      "—"
    );

    setText(
      els.breakdownMultiplier,
      "—"
    );

    setText(
      els.high36Average,
      "$0"
    );

    setText(
      els.projectionYear1,
      "—"
    );

    setText(
      els.projectionYear2,
      "—"
    );

    setText(
      els.projectionYear3,
      "—"
    );

    setText(
      els.projectionPay1,
      "$0"
    );

    setText(
      els.projectionPay2,
      "$0"
    );

    setText(
      els.projectionPay3,
      "$0"
    );

    if (
      !preserveProfile
    ) {
      setText(
        els.serviceAtRetirement,
        "—"
      );

      setText(
        els.breakdownYos,
        "—"
      );
    }

    setText(
      els.projectionIntro,
      "Your final 36 months are assembled from reconstructed " +
      "prior-year basic pay, official 2026 basic pay, and future " +
      "planning projections to estimate your High-3 average."
    );

    setText(
      els.overviewStatus,
      "Enter your retirement profile below to build your estimate."
    );
  }

  /* ============================================================
    10. PROJECTION UI
  ============================================================ */

  function renderProjectionPeriods(
    projection
  ) {
    const periods =
      Array.isArray(
        projection.periods
      )
        ? projection.periods
        : [];

    const labelElements = [
      els.projectionYear1,
      els.projectionYear2,
      els.projectionYear3
    ];

    const payElements = [
      els.projectionPay1,
      els.projectionPay2,
      els.projectionPay3
    ];

    for (
      let index = 0;
      index < 3;
      index += 1
    ) {
      const period =
        periods[
          index
        ];

      setText(
        labelElements[
          index
        ],
        period?.label ||
        "—"
      );

      setText(
        payElements[
          index
        ],
        period
          ? money0(
              period.averageBasicPay
            )
          : "$0"
      );
    }
  }

  function getProjectionModes(
    projection
  ) {
    const modes =
      new Set();

    const months =
      Array.isArray(
        projection.months
      )
        ? projection.months
        : [];

    months.forEach(
      month => {
        if (
          month?.paySourceMode
        ) {
          modes.add(
            month.paySourceMode
          );
        }
      }
    );

    return modes;
  }

  function updateProjectionPill(
    projection,
    growthPercent
  ) {
    const modes =
      getProjectionModes(
        projection
      );

    if (
      modes.has(
        "LONG_RANGE_FORECAST"
      )
    ) {
      setText(
        els.growthPillValue,
        `${round2(growthPercent)}% 2031+`
      );

      return;
    }

    if (
      modes.has(
        "THEWING_FORECAST"
      )
    ) {
      setText(
        els.growthPillValue,
        "FORECAST"
      );

      return;
    }

    if (
      modes.has(
        "HISTORICAL_RECONSTRUCTION"
      )
    ) {
      setText(
        els.growthPillValue,
        "HISTORY"
      );

      return;
    }

    setText(
      els.growthPillValue,
      "OFFICIAL"
    );
  }

  function buildProjectionStatus(
    projection,
    input
  ) {
    const modes =
      getProjectionModes(
        projection
      );

    const parts =
      [];

    if (
      modes.has(
        "HISTORICAL_RECONSTRUCTION"
      )
    ) {
      parts.push(
        "historical pay reconstruction"
      );
    }

    if (
      modes.has(
        "OFFICIAL_2026"
      )
    ) {
      parts.push(
        "official 2026 basic pay"
      );
    }

    if (
      modes.has(
        "THEWING_FORECAST"
      )
    ) {
      parts.push(
        "TheWing 2027–2030 forecast"
      );
    }

    if (
      modes.has(
        "LONG_RANGE_FORECAST"
      )
    ) {
      parts.push(
        `${round2(input.longRangeGrowthPercent)}% long-range growth`
      );
    }

    const sourceText =
      parts.length
        ? parts.join(
            ", "
          )
        : "the retirement pay model";

    return (
      `High-3 window ${monthKeyToLabel(projection.firstHigh36Month)} ` +
      `through ${monthKeyToLabel(projection.finalHigh36Month)} using ` +
      `${sourceText}.`
    );
  }

  /* ============================================================
    11. RESULT RENDERING
  ============================================================ */

  function renderResult(
    input,
    projection,
    official
  ) {
    const retirementRecord =
      official.retirementRecord;

    const monthly =
      Number(
        retirementRecord
          .grossMonthlyRetiredPay
        ??
        retirementRecord
          .retiredPayGross
        ??
        retirementRecord
          .monthlyRetirement
        ??
        0
      );

    const annualFromServer =
      Number(
        retirementRecord
          .grossAnnualRetiredPay
        ??
        retirementRecord
          .annualRetirement
      );

    const yearly =
      Number.isFinite(
        annualFromServer
      )
        ? annualFromServer
        : monthly *
          12;

    const high3 =
      Number(
        retirementRecord
          .retiredPayBase ||
        0
      );

    const multiplier =
      Number(
        retirementRecord
          .multiplier ||
        0
      );

    const multiplierPercent =
      Number.isFinite(
        Number(
          retirementRecord
            .multiplierPercent
        )
      )
        ? Number(
            retirementRecord
              .multiplierPercent
          )
        : multiplier *
          100;

    if (
      !Number.isFinite(
        monthly
      ) ||
      monthly < 0
    ) {
      throw new Error(
        "The retirement engine returned an invalid monthly retired-pay value."
      );
    }

    if (
      !Number.isFinite(
        high3
      ) ||
      high3 <= 0
    ) {
      throw new Error(
        "The retirement engine returned an invalid High-3 average."
      );
    }

    if (
      !Number.isFinite(
        multiplier
      ) ||
      multiplier <= 0
    ) {
      throw new Error(
        "The retirement engine returned an invalid retirement multiplier."
      );
    }

    /*
      RING REPRESENTS THE OFFICIAL RETIREMENT MULTIPLIER
    */

    if (
      els.payRing
    ) {
      els.payRing.style.setProperty(
        "--pct",
        String(
          Math.max(
            0,
            Math.min(
              100,
              multiplierPercent
            )
          )
        )
      );
    }

    /* ========================================================
      OVERVIEW
    ======================================================== */

    setText(
      els.monthlyPay,
      money0(
        monthly
      )
    );

    setText(
      els.monthlyPayMirror,
      money0(
        monthly
      )
    );

    setText(
      els.yearlyPay,
      money0(
        yearly
      )
    );

    setText(
      els.high3Pay,
      money0(
        high3
      )
    );

    /* ========================================================
      SERVICE
    ======================================================== */

    const serviceDisplay =
      projection
        .retirementServiceDisplay ||
      formatServiceMonths(
        official.serviceMonths
      );

    const multiplierDisplay =
      formatMultiplier(
        retirementRecord
      );

    setText(
      els.serviceAtRetirement,
      serviceDisplay
    );

    setText(
      els.multiplier,
      multiplierDisplay
    );

    /* ========================================================
      BREAKDOWN
    ======================================================== */

    setText(
      els.breakdownSystem,
      input.systemLabel ||
        input.retirementSystem
    );

    setText(
      els.breakdownRank,
      input.rankLabel ||
        input.rank
    );

    setText(
      els.breakdownYos,
      serviceDisplay
    );

    setText(
      els.breakdownMultiplier,
      multiplierDisplay
    );

    setText(
      els.breakdownHigh3,
      money2(
        high3
      )
    );

    setText(
      els.breakdownMonthly,
      money0(
        monthly
      )
    );

    setText(
      els.breakdownYearly,
      money0(
        yearly
      )
    );

    /* ========================================================
      HIGH-36
    ======================================================== */

    renderProjectionPeriods(
      projection
    );

    setText(
      els.high36Average,
      money2(
        high3
      )
    );

    updateProjectionPill(
      projection,
      input.longRangeGrowthPercent
    );

    setText(
      els.projectionIntro,
      `High-3 window: ` +
      `${monthKeyToLabel(projection.firstHigh36Month)} through ` +
      `${monthKeyToLabel(projection.finalHigh36Month)}. ` +
      `The 36 monthly basic-pay values are averaged before the ` +
      `official retirement multiplier is applied.`
    );

    setText(
      els.overviewStatus,
      buildProjectionStatus(
        projection,
        input
      )
    );

    ROOT.dataset.hasResult =
      "true";

    ROOT.dataset.error =
      "false";

    ROOT.dataset.ready =
      "true";

    return {
      monthly,

      yearly,

      high3,

      multiplier,

      multiplierPercent
    };
  }

  /* ============================================================
    12. PUBLIC STATE / ASK AMY EVENT
  ============================================================ */

  let currentState =
    null;

  function emitRetirementEvent(
    state
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent(
          "thewing:retirement-updated",
          {
            detail:
              cloneForPublic(
                state
              )
          }
        )
      );
    } catch (_) {
      /* Fail open */
    }
  }

  function buildPublicState(
    input,
    projection,
    official,
    result
  ) {
    return {
      ok:
        true,

      runtimeVersion:
        RUNTIME_VERSION,

      projectionVersion:
        projection.version ||
        PROJECTION?.version ||
        null,

      payBaselineVersion:
        projection.payBaselineVersion ||
        PROJECTION?.payBaselineVersion ||
        null,

      generatedAt:
        new Date().toISOString(),

      /* ========================================================
        INPUTS
      ======================================================== */

      inputs: {
        retirementSystem:
          input.retirementSystem,

        retirementSystemLabel:
          input.systemLabel,

        retirementRank:
          input.rank,

        retirementRankLabel:
          input.rankLabel,

        promotedFinal36:
          input.promotedFinal36,

        previousRank:
          input.promotedFinal36
            ? input.previousRank
            : null,

        previousRankLabel:
          input.promotedFinal36
            ? input.previousRankLabel
            : null,

        promotionDate:
          input.promotedFinal36
            ? dateToInputValue(
                input.promotionDate
              )
            : null,

        entryDate:
          dateToInputValue(
            input.entryDate
          ),

        retirementDate:
          dateToInputValue(
            input.retirementDate
          ),

        longRangeGrowthPercent:
          input.longRangeGrowthPercent
      },

      /* ========================================================
        SERVICE
      ======================================================== */

      service: {
        serviceMonths:
          official.serviceMonths,

        yearsOfService:
          official.exactYearsOfService,

        display:
          projection
            .retirementServiceDisplay ||
          formatServiceMonths(
            official.serviceMonths
          )
      },

      /* ========================================================
        ASSUMPTIONS
      ======================================================== */

      assumptions: {
        retirementRankAppliedAcrossHigh36:
          projection
            .assumptions
            ?.retirementRankAppliedAcrossHigh36
          ??
          !input.promotedFinal36,

        promotionRankHistoryApplied:
          projection
            .assumptions
            ?.promotionRankHistoryApplied
          ??
          input.promotedFinal36,

        promotionMonthUsesRetirementRank:
          projection
            .assumptions
            ?.promotionMonthUsesRetirementRank
          ??
          true,

        retirementDateTreatedAsEffectiveDate:
          true,

        forecastSchedule:
          cloneForPublic(
            projection
              .forecastSchedule ||
            {}
          ),

        longRangeGrowthPercent:
          input.longRangeGrowthPercent,

        historicalYearsBefore2026AreReconstructed:
          Boolean(
            projection
              .assumptions
              ?.historicalYearsBefore2026AreReconstructed
          )
      },

      /* ========================================================
        PROJECTION
      ======================================================== */

      projection: {
        firstHigh36Month:
          projection.firstHigh36Month,

        finalHigh36Month:
          projection.finalHigh36Month,

        promotionDuringFinal36:
          Boolean(
            projection.promotionDuringFinal36
          ),

        previousRank:
          projection.previousRank ||
          null,

        promotionDate:
          projection.promotionDate ||
          null,

        promotionMonth:
          projection.promotionMonth ||
          null,

        high36MonthlyArray:
          projection
            .high36MonthlyArray
            .slice(),

        high36AverageClient:
          projection.high36Average,

        periods:
          cloneForPublic(
            projection.periods ||
            []
          ),

        calendarYears:
          cloneForPublic(
            projection.calendarYears ||
            []
          )
      },

      /* ========================================================
        OFFICIAL RETIREMENT RESULT
      ======================================================== */

      retirement: {
        retirementSystem:
          official
            .retirementRecord
            .retirementSystem,

        yearsOfService:
          official
            .retirementRecord
            .yearsOfService,

        serviceMonths:
          official
            .retirementRecord
            .serviceMonths
          ??
          null,

        multiplier:
          official
            .retirementRecord
            .multiplier,

        multiplierPercent:
          official
            .retirementRecord
            .multiplierPercent
          ??
          result.multiplierPercent,

        retiredPayBase:
          official
            .retirementRecord
            .retiredPayBase,

        baseMethod:
          official
            .retirementRecord
            .baseMethod,

        monthsUsedForBase:
          official
            .retirementRecord
            .monthsUsedForBase,

        grossMonthlyRetiredPay:
          result.monthly,

        grossYearlyRetiredPay:
          result.yearly,

        rateVersion:
          official
            .retirementRecord
            .rateVersion ||
          null
      },

      sourceVersions: {
        ...official.sourceVersions
      }
    };
  }

  /* ============================================================
    13. MAIN CALCULATION
  ============================================================ */

  let hasCalculatedOnce =
    false;

  async function calculate(
    options = {}
  ) {
    const userInitiated =
      options.userInitiated ===
      true;

    const shouldRevealInitialResult =
      userInitiated &&
      !hasCalculatedOnce;

    clearError();

    let input =
      null;

    try {
      input =
        readInputs();

      renderDerivedProfile(
        input
      );

      validateInputs(
        input
      );
    } catch (
      error
    ) {
      resetResults({
        preserveProfile:
          true
      });

      if (
        input
      ) {
        renderDerivedProfile(
          input
        );
      }

      if (
        userInitiated ||
        hasCalculatedOnce
      ) {
        showError(
          error?.message ||
          "Check your retirement inputs."
        );
      }

      return null;
    }

    setLoading(
      true
    );

    try {
      /* ======================================================
        STEP 1
        BUILD HIGH-36 VIA retirement-projection.js
      ====================================================== */

      const projection =
        buildHigh36Projection(
          input
        );

      if (
        !projection ||
        projection.ok ===
          false
      ) {
        throw new Error(
          projection?.error ||
          "Unable to build the High-36 retirement projection."
        );
      }

      if (
        !Array.isArray(
          projection
            .high36MonthlyArray
        ) ||
        projection
          .high36MonthlyArray
          .length !==
          HIGH36_MONTHS
      ) {
        throw new Error(
          `The projection engine did not return exactly ` +
          `${HIGH36_MONTHS} months.`
        );
      }

      /* ======================================================
        STEP 2
        SEND HIGH-36 TO official-retirement.js
      ====================================================== */

      const official =
        await requestOfficialRetirement(
          input,
          projection
        );

      /* ======================================================
        STEP 3
        RENDER RESULT
      ====================================================== */

      const result =
        renderResult(
          input,
          projection,
          official
        );

      hasCalculatedOnce =
        true;

      currentState =
        buildPublicState(
          input,
          projection,
          official,
          result
        );

      clearError();

      emitRetirementEvent(
        currentState
      );

      if (
        shouldRevealInitialResult
      ) {
        revealInitialResultOnMobile();
      }

      return cloneForPublic(
        currentState
      );
    } catch (
      error
    ) {
      if (
        error?.name ===
          "AbortError"
      ) {
        return null;
      }

      showError(
        error?.message ||
        "Unable to calculate retirement pay."
      );

      currentState = {
        ok:
          false,

        runtimeVersion:
          RUNTIME_VERSION,

        error:
          error?.message ||
          "Unable to calculate retirement pay."
      };

      return null;
    } finally {
      setLoading(
        false
      );

      ROOT.dataset.ready =
        "true";
    }
  }

  /* ============================================================
    14. INPUT CHANGES

    BEFORE FIRST CALCULATION
    -------------------------------------------------------------
    Show service preview only.
    Do not automatically hit the backend.

    AFTER FIRST SUCCESSFUL CALCULATION
    -------------------------------------------------------------
    Recalculate after a short debounce.
  ============================================================ */

  let debounceTimer =
    null;

  function scheduleCalculation() {
    window.clearTimeout(
      debounceTimer
    );

    let input =
      null;

    try {
      input =
        readInputs();

      clearError();

      renderDerivedProfile(
        input
      );

      updateAssumptionLabels(
        input.longRangeGrowthPercent
      );

      if (
        !input.entryDate ||
        !input.retirementDate
      ) {
        resetResults({
          preserveProfile:
            true
        });

        renderDerivedProfile(
          input
        );

        return;
      }

      /*
        Keep the first interaction button-driven.
      */

      if (
        !hasCalculatedOnce
      ) {
        return;
      }

      validateInputs(
        input
      );

      debounceTimer =
        window.setTimeout(
          () => {
            calculate({
              userInitiated:
                false
            });
          },
          280
        );
    } catch (
      error
    ) {
      if (
        hasCalculatedOnce
      ) {
        resetResults({
          preserveProfile:
            true
        });

        if (
          input
        ) {
          renderDerivedProfile(
            input
          );
        }

        showError(
          error?.message ||
          "Check your retirement inputs."
        );
      }
    }
  }

  /* ============================================================
    15. EVENTS
  ============================================================ */

  [
    els.system,
    els.rank,
    els.previousRank,
    els.promotionDate,
    els.entryDate,
    els.retirementDate
  ].forEach(
    element => {
      if (!element) {
        return;
      }

      element.addEventListener(
        "change",
        scheduleCalculation
      );
    }
  );

  if (
    els.promotedFinal36
  ) {
    els.promotedFinal36.addEventListener(
      "change",
      () => {
        syncPromotionFields();
        scheduleCalculation();
      }
    );
  }

  if (
    els.payGrowth
  ) {
    els.payGrowth.addEventListener(
      "input",
      scheduleCalculation
    );

    els.payGrowth.addEventListener(
      "change",
      scheduleCalculation
    );
  }

  if (
    els.calculateButton
  ) {
    els.calculateButton.addEventListener(
      "click",
      () => {
        window.clearTimeout(
          debounceTimer
        );

        calculate({
          userInitiated:
            true
        });
      }
    );
  }

  /* ============================================================
    16. PUBLIC API
  ============================================================ */

  window.THEWING_RETIREMENT =
    Object.freeze({
      version:
        RUNTIME_VERSION,

      calculate,

      readInputs,

      buildHigh36Projection,

      buildServiceProfile,

      getProjectionEngine() {
        return PROJECTION;
      },

      getState() {
        return currentState
          ? cloneForPublic(
              currentState
            )
          : null;
      }
    });

  /* ============================================================
    17. INITIALIZE
  ============================================================ */

  function initialize() {
    ROOT.dataset.loading =
      "false";

    ROOT.dataset.error =
      "false";

    ROOT.dataset.hasResult =
      "false";

    try {
      /*
        Confirm retirement-projection.js loaded correctly.
      */

      requireProjectionEngine();

      syncPromotionFields();

      const input =
        readInputs();

      updateAssumptionLabels(
        input.longRangeGrowthPercent
      );

      resetResults({
        preserveProfile:
          true
      });

      renderDerivedProfile(
        input
      );

      ROOT.dataset.ready =
        "true";
    } catch (
      error
    ) {
      ROOT.dataset.ready =
        "true";

      showError(
        error?.message ||
        "The retirement calculator could not initialize."
      );

      if (
        els.calculateButton
      ) {
        els.calculateButton.disabled =
          true;
      }
    }
  }

  initialize();

})();
