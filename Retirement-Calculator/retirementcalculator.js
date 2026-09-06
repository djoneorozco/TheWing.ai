/* ============================================================
  THEWING.AI • RETIREMENT CALCULATOR
  retirementcalculator.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  - Drive the mobile-first Retirement Calculator UI
  - Build a projected 36-month High-3 basic-pay array
  - Use official-pay-2026.1 as the projection baseline
  - Apply the user-selected annual future pay-growth assumption
  - Send the exact projected High-36 array to TheWing's public API
  - Keep official-retirement.js as the retirement formula authority
  - Return projected gross monthly + yearly retired pay

  CURRENT BACKEND BRIDGE
  -------------------------------------------------------------
  The current public endpoint exposes RETIREMENT_VA rather than a
  retirement-only route. This client sends vaRating: 0 so the endpoint
  reaches official-retirement.js without adding VA compensation.

  IMPORTANT
  -------------------------------------------------------------
  - No localStorage or sessionStorage
  - No retirement multiplier formula is recreated here
  - No retired-pay formula is recreated here
  - The browser only projects the 36 monthly BASIC PAY values
  - official-retirement.js calculates the High-3 base, multiplier,
    and gross monthly retired pay on the server
  - Selected retirement rank is assumed for the full projected
    High-3 window unless the UI is expanded later with promotion dates
  - Future pay raises are estimates, not published DFAS pay tables
============================================================ */

(function () {
  "use strict";

  const ROOT = document.getElementById("tw-retirement-shell");

  if (
    !ROOT ||
    ROOT.dataset.runtimeBound === "true"
  ) {
    return;
  }

  ROOT.dataset.runtimeBound = "true";
  ROOT.dataset.ready = "false";


  const $ = (selector) =>
    ROOT.querySelector(selector);

  const $$ = (selector) =>
    Array.from(
      ROOT.querySelectorAll(selector)
    );


  /* ============================================================
    1. CONFIGURATION
  ============================================================ */

  const RUNTIME_VERSION =
    "retirement-2026.1";

  const PAY_BASELINE_YEAR =
    2026;

  const PAY_BASELINE_VERSION =
    "official-pay-2026.1";

  const API_ENDPOINT =
    "https://thewing.netlify.app/api/opensource-brain";

  const API_TOOL =
    "RETIREMENT_VA";

  const HIGH36_MONTHS =
    36;

  const PERIOD_MONTHS =
    12;

  const MIN_GROWTH_PERCENT =
    0;

  const MAX_GROWTH_PERCENT =
    10;


  /* ============================================================
    2. DOM REFERENCES
  ============================================================ */

  const els = {

    /* INPUTS */

    system:
      $("#ret-system"),

    rank:
      $("#ret-rank"),

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


    /* OVERVIEW */

    livePill:
      $("#ret-live-pill"),

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


    /* DERIVED PROFILE */

    serviceAtRetirement:
      $("#ret-service-at-retirement"),

    multiplier:
      $("#ret-multiplier"),


    /* ASSUMPTIONS */

    assumptionsCurrent:
      $(".ret-assumptions-current"),


    /* BREAKDOWN */

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


    /* PROJECTION */

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
    3. 2026 BASIC-PAY BASELINE

    Browser projection mirror of:

      netlify/functions/_share/official-pay.js

    Version lock:

      official-pay-2026.1

    Only ranks exposed by the current Retirement Calculator UI
    are included here.

    The backend remains the canonical source module.
  ============================================================ */

  const PAY_2026 =
    Object.freeze({


      /* ========================================================
        ENLISTED
      ======================================================== */

      "E-5":
        Object.freeze({

          0: 3342.90,
          2: 3598.20,
          3: 3775.80,
          4: 3946.80,
          6: 4110.00,
          8: 4299.90,
          10: 4395.30,
          12: 4421.70,
          14: 4421.70,
          16: 4421.70,
          18: 4421.70,
          20: 4421.70,
          22: 4421.70,
          24: 4421.70,
          26: 4421.70,
          28: 4421.70,
          30: 4421.70,
          32: 4421.70,
          34: 4421.70,
          36: 4421.70,
          38: 4421.70,
          40: 4421.70

        }),


      "E-6":
        Object.freeze({

          0: 3401.10,
          2: 3743.10,
          3: 3908.10,
          4: 4068.90,
          6: 4235.70,
          8: 4612.80,
          10: 4759.50,
          12: 5043.30,
          14: 5130.30,
          16: 5193.60,
          18: 5267.70,
          20: 5267.70,
          22: 5267.70,
          24: 5267.70,
          26: 5267.70,
          28: 5267.70,
          30: 5267.70,
          32: 5267.70,
          34: 5267.70,
          36: 5267.70,
          38: 5267.70,
          40: 5267.70

        }),


      "E-7":
        Object.freeze({

          0: 3932.10,
          2: 4291.50,
          3: 4456.20,
          4: 4673.10,
          6: 4843.80,
          8: 5135.70,
          10: 5300.40,
          12: 5591.70,
          14: 5835.00,
          16: 6000.90,
          18: 6177.30,
          20: 6245.70,
          22: 6475.20,
          24: 6598.20,
          26: 7067.40,
          28: 7067.40,
          30: 7067.40,
          32: 7067.40,
          34: 7067.40,
          36: 7067.40,
          38: 7067.40,
          40: 7067.40

        }),


      "E-8":
        Object.freeze({

          8: 5656.50,
          10: 5907.00,
          12: 6061.80,
          14: 6247.20,
          16: 6448.20,
          18: 6811.20,
          20: 6995.40,
          22: 7308.30,
          24: 7481.70,
          26: 7908.90,
          28: 7908.90,
          30: 8067.30,
          32: 8067.30,
          34: 8067.30,
          36: 8067.30,
          38: 8067.30,
          40: 8067.30

        }),


      "E-9":
        Object.freeze({

          10: 6910.20,
          12: 7066.50,
          14: 7263.60,
          16: 7496.10,
          18: 7730.70,
          20: 8105.10,
          22: 8423.10,
          24: 8756.70,
          26: 9267.90,
          28: 9267.90,
          30: 9730.20,
          32: 9730.20,
          34: 10217.40,
          36: 10217.40,
          38: 10729.20,
          40: 10729.20

        }),



      /* ========================================================
        OFFICERS
      ======================================================== */

      "O-1":
        Object.freeze({

          0: 4150.20,
          2: 4320.00,
          3: 5222.40,
          4: 5222.40,
          6: 5222.40,
          8: 5222.40,
          10: 5222.40,
          12: 5222.40,
          14: 5222.40,
          16: 5222.40,
          18: 5222.40,
          20: 5222.40,
          22: 5222.40,
          24: 5222.40,
          26: 5222.40,
          28: 5222.40,
          30: 5222.40,
          32: 5222.40,
          34: 5222.40,
          36: 5222.40,
          38: 5222.40,
          40: 5222.40

        }),


      "O-2":
        Object.freeze({

          0: 4782.00,
          2: 5446.20,
          3: 6272.40,
          4: 6484.50,
          6: 6617.70,
          8: 6617.70,
          10: 6617.70,
          12: 6617.70,
          14: 6617.70,
          16: 6617.70,
          18: 6617.70,
          20: 6617.70,
          22: 6617.70,
          24: 6617.70,
          26: 6617.70,
          28: 6617.70,
          30: 6617.70,
          32: 6617.70,
          34: 6617.70,
          36: 6617.70,
          38: 6617.70,
          40: 6617.70

        }),


      "O-3":
        Object.freeze({

          0: 5534.10,
          2: 6273.90,
          3: 6770.40,
          4: 7382.70,
          6: 7737.00,
          8: 8125.50,
          10: 8375.70,
          12: 8788.20,
          14: 9004.20,
          16: 9004.20,
          18: 9004.20,
          20: 9004.20,
          22: 9004.20,
          24: 9004.20,
          26: 9004.20,
          28: 9004.20,
          30: 9004.20,
          32: 9004.20,
          34: 9004.20,
          36: 9004.20,
          38: 9004.20,
          40: 9004.20

        }),


      "O-4":
        Object.freeze({

          0: 6294.60,
          2: 7286.40,
          3: 7773.60,
          4: 7881.00,
          6: 8332.20,
          8: 8816.40,
          10: 9420.00,
          12: 9888.30,
          14: 10214.40,
          16: 10401.60,
          18: 10509.90,
          20: 10509.90,
          22: 10509.90,
          24: 10509.90,
          26: 10509.90,
          28: 10509.90,
          30: 10509.90,
          32: 10509.90,
          34: 10509.90,
          36: 10509.90,
          38: 10509.90,
          40: 10509.90

        }),


      "O-5":
        Object.freeze({

          0: 7295.40,
          2: 8218.20,
          3: 8787.00,
          4: 8894.10,
          6: 9249.60,
          8: 9461.40,
          10: 9928.50,
          12: 10271.70,
          14: 10715.10,
          16: 11391.30,
          18: 11713.80,
          20: 12032.70,
          22: 12394.80,
          24: 12394.80,
          26: 12394.80,
          28: 12394.80,
          30: 12394.80,
          32: 12394.80,
          34: 12394.80,
          36: 12394.80,
          38: 12394.80,
          40: 12394.80

        }),


      "O-6":
        Object.freeze({

          0: 8751.30,
          2: 9613.80,
          3: 10245.00,
          4: 10245.00,
          6: 10284.30,
          8: 10725.00,
          10: 10783.50,
          12: 10783.50,
          14: 11396.40,
          16: 12479.70,
          18: 13115.40,
          20: 13751.10,
          22: 14112.90,
          24: 14479.20,
          26: 15188.70,
          28: 15188.70,
          30: 15408.30,
          32: 15408.30,
          34: 15408.30,
          36: 15408.30,
          38: 15408.30,
          40: 15408.30

        }),


      "O-7":
        Object.freeze({

          0: 11540.10,
          2: 12076.20,
          3: 12324.30,
          4: 12522.00,
          6: 12878.70,
          8: 13231.80,
          10: 13639.20,
          12: 14045.70,
          14: 14454.30,
          16: 15735.30,
          18: 16817.70,
          20: 16817.70,
          22: 16817.70,
          24: 16817.70,
          26: 16904.40,
          28: 16904.40,
          30: 17242.20,
          32: 17242.20,
          34: 17242.20,
          36: 17242.20,
          38: 17242.20,
          40: 17242.20

        }),


      "O-8":
        Object.freeze({

          0: 13888.50,
          2: 14343.90,
          3: 14645.40,
          4: 14729.40,
          6: 15106.50,
          8: 15735.30,
          10: 15882.00,
          12: 16479.60,
          14: 16651.80,
          16: 17166.60,
          18: 17911.80,
          20: 18598.20,
          22: 18999.90,
          24: 18999.90,
          26: 18999.90,
          28: 18999.90,
          30: 18999.90,
          32: 18999.90,
          34: 18999.90,
          36: 18999.90,
          38: 18999.90,
          40: 18999.90

        }),



      /* ========================================================
        PRIOR-ENLISTED OFFICERS
      ======================================================== */

      "O-1E":
        Object.freeze({

          4: 5222.40,
          6: 5576.70,
          8: 5783.10,
          10: 5993.70,
          12: 6200.70,
          14: 6484.50,
          16: 6484.50,
          18: 6484.50,
          20: 6484.50,
          22: 6484.50,
          24: 6484.50,
          26: 6484.50,
          28: 6484.50,
          30: 6484.50,
          32: 6484.50,
          34: 6484.50,
          36: 6484.50,
          38: 6484.50,
          40: 6484.50

        }),


      "O-2E":
        Object.freeze({

          4: 6484.50,
          6: 6617.70,
          8: 6828.00,
          10: 7183.80,
          12: 7458.90,
          14: 7663.50,
          16: 7663.50,
          18: 7663.50,
          20: 7663.50,
          22: 7663.50,
          24: 7663.50,
          26: 7663.50,
          28: 7663.50,
          30: 7663.50,
          32: 7663.50,
          34: 7663.50,
          36: 7663.50,
          38: 7663.50,
          40: 7663.50

        }),


      "O-3E":
        Object.freeze({

          4: 7382.70,
          6: 7737.00,
          8: 8125.50,
          10: 8375.70,
          12: 8788.20,
          14: 9137.10,
          16: 9336.90,
          18: 9609.60,
          20: 9609.60,
          22: 9609.60,
          24: 9609.60,
          26: 9609.60,
          28: 9609.60,
          30: 9609.60,
          32: 9609.60,
          34: 9609.60,
          36: 9609.60,
          38: 9609.60,
          40: 9609.60

        })

    });


  const SUPPORTED_RANKS =
    Object.freeze(
      Object.keys(
        PAY_2026
      )
    );


  /* ============================================================
    4. SMALL HELPERS
  ============================================================ */

  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }


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


  function average(
    values
  ) {

    if (
      !Array.isArray(values) ||
      !values.length
    ) {

      return 0;
    }


    return (
      values.reduce(
        (
          sum,
          value
        ) =>
          sum +
          Number(
            value ||
            0
          ),
        0
      ) /
      values.length
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

    if (
      !element
    ) {

      return;
    }


    element.textContent =
      String(
        value == null
          ? ""
          : value
      );
  }


  function normalizeRank(
    rank
  ) {

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


  /* ============================================================
    5. DATE HELPERS

    UTC dates are used intentionally to prevent timezone movement
    when the calculator is used from Japan, CONUS, Europe, etc.
  ============================================================ */

  function parseDateInput(
    value
  ) {

    const raw =
      String(
        value ||
        ""
      ).trim();


    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        raw
      )
    ) {

      return null;
    }


    const [
      year,
      month,
      day
    ] =
      raw
        .split("-")
        .map(
          Number
        );


    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );


    if (
      date.getUTCFullYear() !==
        year ||

      date.getUTCMonth() !==
        month - 1 ||

      date.getUTCDate() !==
        day
    ) {

      return null;
    }


    return date;
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


  function addUtcMonths(
    date,
    months
  ) {

    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() +
          Number(
            months ||
            0
          ),
        1
      )
    );
  }


  function startOfUtcMonth(
    date
  ) {

    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        1
      )
    );
  }


  /* ============================================================
    6. SERVICE CREDIT

    We use completed service months because retirement service
    multipliers are naturally expressed in years + months.

    Example:

      24 years 6 months
      =
      294 months
      =
      24.5 years

    official-retirement.js still owns the multiplier formula.
  ============================================================ */

  function completedServiceMonths(
    entryDate,
    targetDate
  ) {

    if (
      !entryDate ||
      !targetDate ||
      targetDate <
        entryDate
    ) {

      return 0;
    }


    let months =

      (
        targetDate.getUTCFullYear() -
        entryDate.getUTCFullYear()
      ) *

      12 +

      (
        targetDate.getUTCMonth() -
        entryDate.getUTCMonth()
      );


    if (
      targetDate.getUTCDate() <
      entryDate.getUTCDate()
    ) {

      months -=
        1;
    }


    return Math.max(
      0,
      months
    );
  }


  function serviceYearsFromMonths(
    months
  ) {

    return round2(
      Math.max(
        0,
        Number(months) ||
        0
      ) /
      12
    );
  }


  function formatServiceMonths(
    months
  ) {

    const total =
      Math.max(
        0,
        Math.floor(
          Number(months) ||
          0
        )
      );


    const years =
      Math.floor(
        total /
        12
      );


    const remainder =
      total %
      12;


    return (
      `${years}y ${remainder}m`
    );
  }


  function formatPercentFromMultiplier(
    multiplier
  ) {

    const percent =
      round2(
        (
          Number(multiplier) ||
          0
        ) *
        100
      );


    return percent.toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          percent %
          1 ===
          0
            ? 1
            : 0,

        maximumFractionDigits:
          2
      }
    ) +
    "%";
  }


  function formatMonthYear(
    date
  ) {

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


  function formatPeriodLabel(
    start,
    end
  ) {

    const startYear =
      start.getUTCFullYear();


    const endYear =
      end.getUTCFullYear();


    if (
      startYear ===
      endYear
    ) {

      return String(
        startYear
      );
    }


    return (
      `${startYear}–${String(endYear).slice(-2)}`
    );
  }


  function selectedOptionText(
    select
  ) {

    if (
      !select ||
      select.selectedIndex <
        0
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


  /* ============================================================
    7. 2026 BASIC-PAY LOOKUP

    This mirrors official-pay.js threshold behavior:

      Choose the highest official threshold <= YOS.

    Example:

      E-7
      YOS 21.5
      ->
      "Over 20"

      E-7
      YOS 22.0
      ->
      "Over 22"
  ============================================================ */

  function pickThreshold(
    row,
    yearsOfService
  ) {

    const keys =
      Object.keys(
        row
      )
        .map(
          Number
        )
        .filter(
          Number.isFinite
        )
        .sort(
          (
            a,
            b
          ) =>
            a -
            b
        );


    if (
      !keys.length
    ) {

      throw new Error(
        "No official basic-pay thresholds are available for this rank."
      );
    }


    const yos =
      clamp(
        Number(
          yearsOfService
        ) ||
        0,
        0,
        40
      );


    const firstKey =
      keys[0];


    if (
      yos <
      firstKey
    ) {

      throw new Error(
        `No official 2026 pay value exists for this rank at ${yos.toFixed(2)} years of service.`
      );
    }


    let chosen =
      firstKey;


    for (
      const key
      of keys
    ) {

      if (
        yos >=
        key
      ) {

        chosen =
          key;
      }
    }


    return chosen;
  }


  function getBasicPay2026(
    rank,
    yearsOfService
  ) {

    const rankKey =
      normalizeRank(
        rank
      );


    const row =
      PAY_2026[
        rankKey
      ];


    if (
      !row ||
      !SUPPORTED_RANKS.includes(
        rankKey
      )
    ) {

      throw new Error(
        `Unsupported retirement rank: ${rank || "UNKNOWN"}.`
      );
    }


    const threshold =
      pickThreshold(
        row,
        yearsOfService
      );


    const amount =
      Number(
        row[
          threshold
        ]
      );


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <=
        0
    ) {

      throw new Error(
        `Unable to find official 2026 basic pay for ${rankKey} at ${yearsOfService} YOS.`
      );
    }


    return amount;
  }


  /* ============================================================
    8. FUTURE BASIC-PAY PROJECTION

    2026:
      Official DFAS 2026 basic pay.

    2027:
      2026 pay × 1.025

    2028:
      2026 pay × 1.025²

    2029:
      2026 pay × 1.025³

    The growth percentage remains user-configurable.
  ============================================================ */

  function getProjectionFactor(
    calendarYear,
    annualGrowthPercent
  ) {

    const year =
      Number(
        calendarYear
      );


    const growth =
      Number(
        annualGrowthPercent
      );


    if (
      !Number.isInteger(
        year
      )
    ) {

      throw new Error(
        "Invalid calendar year in retirement projection."
      );
    }


    if (
      year <
      PAY_BASELINE_YEAR
    ) {

      throw new Error(
        `The current projection baseline begins in ${PAY_BASELINE_YEAR}. ` +
        `A High-3 window containing earlier years needs historical pay tables.`
      );
    }


    if (
      !Number.isFinite(
        growth
      ) ||

      growth <
        MIN_GROWTH_PERCENT ||

      growth >
        MAX_GROWTH_PERCENT
    ) {

      throw new Error(
        `Annual pay growth must be between ${MIN_GROWTH_PERCENT}% and ${MAX_GROWTH_PERCENT}%.`
      );
    }


    const yearsForward =
      year -
      PAY_BASELINE_YEAR;


    const annualFactor =
      1 +
      growth /
      100;


    return Math.pow(
      annualFactor,
      yearsForward
    );
  }


  function projectMonthlyBasicPay(
    rank,
    yearsOfService,
    calendarYear,
    annualGrowthPercent
  ) {

    const base2026 =
      getBasicPay2026(
        rank,
        yearsOfService
      );


    const factor =
      getProjectionFactor(
        calendarYear,
        annualGrowthPercent
      );


    return round2(
      base2026 *
      factor
    );
  }


  /* ============================================================
    9. HIGH-36 WINDOW

    Planned Retirement Date is treated as the retirement-effective
    date.

    If retirement occurs on the first of a month, the previous
    month is treated as the final active-duty pay month.

    EXAMPLE

      Retirement date:
        2029-09-01

      Final active-duty pay month:
        2029-08

      High-36:
        2026-09 through 2029-08
  ============================================================ */

  function getFinalActivePayMonth(
    retirementDate
  ) {

    const monthStart =
      startOfUtcMonth(
        retirementDate
      );


    if (
      retirementDate.getUTCDate() ===
      1
    ) {

      return addUtcMonths(
        monthStart,
        -1
      );
    }


    return monthStart;
  }


  function buildHigh36Projection(
    input
  ) {

    const rank =
      normalizeRank(
        input.rank
      );


    const entryDate =
      input.entryDate;


    const retirementDate =
      input.retirementDate;


    const annualGrowthPercent =
      Number(
        input.annualGrowthPercent
      );


    if (
      !entryDate ||
      !retirementDate
    ) {

      throw new Error(
        "Date Entered Service and Planned Retirement Date are required."
      );
    }


    if (
      retirementDate <=
      entryDate
    ) {

      throw new Error(
        "Planned Retirement Date must be after Date Entered Service."
      );
    }


    if (
      !SUPPORTED_RANKS.includes(
        rank
      )
    ) {

      throw new Error(
        "Select a supported planned retirement rank."
      );
    }


    if (
      !Number.isFinite(
        annualGrowthPercent
      ) ||

      annualGrowthPercent <
        MIN_GROWTH_PERCENT ||

      annualGrowthPercent >
        MAX_GROWTH_PERCENT
    ) {

      throw new Error(
        `Annual pay growth must be between ${MIN_GROWTH_PERCENT}% and ${MAX_GROWTH_PERCENT}%.`
      );
    }


    const finalMonth =
      getFinalActivePayMonth(
        retirementDate
      );


    const firstMonth =
      addUtcMonths(
        finalMonth,
        -(
          HIGH36_MONTHS -
          1
        )
      );


    /* ========================================================
      We do NOT invent pre-2026 pay.

      If the High-3 window crosses before the current official
      pay baseline, stop and require historical tables.
    ======================================================== */

    if (
      firstMonth.getUTCFullYear() <
      PAY_BASELINE_YEAR
    ) {

      throw new Error(
        `This High-3 window begins in ${firstMonth.getUTCFullYear()}. ` +
        `The current calculator uses the official ${PAY_BASELINE_YEAR} pay table as its projection baseline, ` +
        `so historical pay tables must be added before projecting this retirement date.`
      );
    }


    const months =
      [];


    for (
      let index = 0;
      index < HIGH36_MONTHS;
      index += 1
    ) {

      const monthDate =
        addUtcMonths(
          firstMonth,
          index
        );


      const serviceMonths =
        completedServiceMonths(
          entryDate,
          monthDate
        );


      const yearsOfService =
        serviceYearsFromMonths(
          serviceMonths
        );


      const calendarYear =
        monthDate.getUTCFullYear();


      const base2026 =
        round2(
          getBasicPay2026(
            rank,
            yearsOfService
          )
        );


      const projectionFactor =
        getProjectionFactor(
          calendarYear,
          annualGrowthPercent
        );


      const projectedBasicPay =
        round2(
          base2026 *
          projectionFactor
        );


      months.push({

        index:
          index +
          1,

        month:
          dateToInputValue(
            monthDate
          ).slice(
            0,
            7
          ),

        date:
          monthDate,

        calendarYear,

        rank,

        serviceMonths,

        yearsOfService,

        base2026,

        projectionFactor:
          round2(
            projectionFactor
          ),

        projectedBasicPay

      });
    }


    const high36MonthlyArray =
      months.map(
        month =>
          month.projectedBasicPay
      );


    const high36AverageClient =
      round2(
        average(
          high36MonthlyArray
        )
      );


    /* ========================================================
      Split High-36 into three chronological 12-month blocks.

      This remains accurate even when the High-3 window crosses
      four calendar years.

      Example:

        Sep 2026 – Aug 2027
        Sep 2027 – Aug 2028
        Sep 2028 – Aug 2029
    ======================================================== */

    const periods =
      [];


    for (
      let start = 0;
      start < HIGH36_MONTHS;
      start += PERIOD_MONTHS
    ) {

      const block =
        months.slice(
          start,
          start +
          PERIOD_MONTHS
        );


      const blockStart =
        block[0];


      const blockEnd =
        block[
          block.length -
          1
        ];


      periods.push({

        index:
          periods.length +
          1,

        startDate:
          blockStart.date,

        endDate:
          blockEnd.date,

        label:
          formatPeriodLabel(
            blockStart.date,
            blockEnd.date
          ),

        averageBasicPay:
          round2(
            average(
              block.map(
                month =>
                  month.projectedBasicPay
              )
            )
          )

      });
    }


    return {

      rank,

      annualGrowthPercent,

      firstMonth,

      finalMonth,

      months,

      high36MonthlyArray,

      high36AverageClient,

      periods

    };
  }


  /* ============================================================
    10. READ USER INPUT
  ============================================================ */

  function readInputs() {

    const retirementSystem =
      String(
        els.system
          ? els.system.value
          : "HIGH3"
      ).trim();


    const rank =
      normalizeRank(
        els.rank
          ? els.rank.value
          : ""
      );


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


    const annualGrowthPercent =
      Number(
        els.payGrowth
          ? els.payGrowth.value
          : 2.5
      );


    return {

      retirementSystem,

      rank,

      rankLabel:
        selectedOptionText(
          els.rank
        ),

      systemLabel:
        selectedOptionText(
          els.system
        ),

      entryDate,

      retirementDate,

      annualGrowthPercent

    };
  }


  /* ============================================================
    11. VALIDATION
  ============================================================ */

  function validateInputs(
    input,
    options = {}
  ) {

    const requireDates =
      options.requireDates !==
      false;


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


    if (
      !SUPPORTED_RANKS.includes(
        input.rank
      )
    ) {

      throw new Error(
        "Select a planned retirement rank."
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
        "Enter your Planned Retirement Date."
      );
    }


    if (
      input.entryDate &&
      input.retirementDate &&
      input.retirementDate <=
        input.entryDate
    ) {

      throw new Error(
        "Planned Retirement Date must be after Date Entered Service."
      );
    }


    if (
      !Number.isFinite(
        input.annualGrowthPercent
      ) ||

      input.annualGrowthPercent <
        MIN_GROWTH_PERCENT ||

      input.annualGrowthPercent >
        MAX_GROWTH_PERCENT
    ) {

      throw new Error(
        `Annual pay growth must be between ${MIN_GROWTH_PERCENT}% and ${MAX_GROWTH_PERCENT}%.`
      );
    }


    return input;
  }


  /* ============================================================
    12. SERVICE PROFILE

    The service date calculation happens locally.

    The retirement MULTIPLIER does not.

    We pass decimal YOS into official-retirement.js and allow that
    official server module to determine:

      HIGH3:
        multiplier

      BRS:
        multiplier
  ============================================================ */

  function buildServiceProfile(
    entryDate,
    retirementDate
  ) {

    const serviceMonths =
      completedServiceMonths(
        entryDate,
        retirementDate
      );


    return {

      serviceMonths,

      yearsOfService:
        serviceYearsFromMonths(
          serviceMonths
        ),

      display:
        formatServiceMonths(
          serviceMonths
        )

    };
  }


  /* ============================================================
    13. API BRIDGE TO OFFICIAL RETIREMENT ENGINE
  ============================================================ */

  let activeController =
    null;

  let requestSequence =
    0;


  async function requestOfficialRetirement(
    input,
    projection
  ) {

    /* ========================================================
      Cancel stale calculator requests.
    ======================================================== */

    if (
      activeController
    ) {

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


    const service =
      buildServiceProfile(
        input.entryDate,
        input.retirementDate
      );


    /* ========================================================
      CURRENT API BRIDGE

      The existing public endpoint currently routes retirement
      through RETIREMENT_VA.

      vaRating: 0 means:

        VA compensation = $0

      while still allowing the endpoint to pass the exact
      high36MonthlyArray to official-retirement.js.
    ======================================================== */

    const body = {

      tool:
        API_TOOL,

      input: {

        rank:
          input.rank,

        yos:
          service.yearsOfService,

        yearsOfService:
          service.yearsOfService,

        retirementSystem:
          input.retirementSystem,


        /* RETIREMENT ONLY */

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


        /* EXACT PROJECTED HIGH-36 */

        high36MonthlyArray:
          projection.high36MonthlyArray

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


    /* ========================================================
      Ignore a response from a request that has already been
      replaced by a newer calculation.
    ======================================================== */

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
        data
          ? data.error ||
            `Retirement service error (${response.status}).`
          : `Retirement service error (${response.status}).`
      );
    }


    const payload =
      data.payload ||
      data.data ||
      {};


    const retirementRecord =

      payload.retirementRecord ||

      (
        payload.calculator
          ? payload.calculator.retirementRecord
          : null
      ) ||

      (
        payload.compensation &&
        payload.compensation.detail
          ? payload.compensation.detail.retirementRecord
          : null
      ) ||

      null;


    if (
      !retirementRecord ||
      retirementRecord.ok ===
        false
    ) {

      throw new Error(
        retirementRecord &&
        retirementRecord.error
          ? retirementRecord.error
          : "The official retirement engine did not return a calculation."
      );
    }


    /* ========================================================
      CRITICAL VALIDATION

      We do not accept a final-month-pay estimate.

      This calculator is specifically intended to use the
      projected High-36 average.
    ======================================================== */

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
        retirementRecord.monthsUsedForBase ||
        0
      ) !==
      HIGH36_MONTHS
    ) {

      throw new Error(
        `Expected ${HIGH36_MONTHS} months in the High-3 calculation, but the server used ` +
        `${retirementRecord.monthsUsedForBase || 0}.`
      );
    }


    /* ========================================================
      PAY SOURCE VERSION LOCK

      Because the browser uses a projection mirror of the 2026
      table, stop rather than silently calculate with stale pay
      data if the backend official-pay version changes.
    ======================================================== */

    const backendPayVersion =

      payload.payRateVersion ||

      (
        data.meta &&
        data.meta.sourceVersions
          ? data.meta.sourceVersions.payVersion
          : null
      ) ||

      (
        payload.sourceVersions
          ? payload.sourceVersions.payVersion
          : null
      ) ||

      null;


    if (
      backendPayVersion &&
      backendPayVersion !==
        PAY_BASELINE_VERSION
    ) {

      throw new Error(
        `Pay-table version mismatch. This browser projection uses ${PAY_BASELINE_VERSION}, ` +
        `but the backend reports ${backendPayVersion}. Update retirementcalculator.js before publishing results.`
      );
    }


    return {

      data,

      payload,

      retirementRecord,

      service,

      sourceVersions:

        (
          data.meta &&
          data.meta.sourceVersions
        )

        ||

        payload.sourceVersions

        ||

        {}

    };
  }


  /* ============================================================
    14. UI HELPERS
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


  function updateGrowthLabels(
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

        : 2.5;


    const label =
      `${round2(growth)}%`;


    setText(
      els.growthPillValue,
      label
    );


    if (
      els.assumptionsCurrent
    ) {

      els.assumptionsCurrent.textContent =
        `${round2(growth)}% annual basic-pay growth`;
    }
  }


  function renderDerivedProfile(
    input
  ) {

    updateGrowthLabels(
      input.annualGrowthPercent
    );


    if (
      !input.entryDate ||
      !input.retirementDate
    ) {

      setText(
        els.serviceAtRetirement,
        "—"
      );


      setText(
        els.multiplier,
        "—"
      );


      return null;
    }


    if (
      input.retirementDate <=
      input.entryDate
    ) {

      setText(
        els.serviceAtRetirement,
        "—"
      );


      setText(
        els.multiplier,
        "—"
      );


      return null;
    }


    const service =
      buildServiceProfile(
        input.entryDate,
        input.retirementDate
      );


    setText(
      els.serviceAtRetirement,
      service.display
    );


    /* ========================================================
      The multiplier stays blank until official-retirement.js
      returns it.
    ======================================================== */

    setText(
      els.multiplier,
      "—"
    );


    return service;
  }


  function resetResults(
    options = {}
  ) {

    const preserveService =
      options.preserveService ===
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


    /* OVERVIEW */

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


    /* BREAKDOWN */

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
      els.breakdownMultiplier,
      "—"
    );


    /* HIGH-36 */

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
      !preserveService
    ) {

      setText(
        els.serviceAtRetirement,
        "—"
      );
    }


    setText(
      els.multiplier,
      "—"
    );


    if (
      els.projectionIntro
    ) {

      els.projectionIntro.textContent =
        "Your final 36 months of projected basic pay are used to estimate your High-3 average.";
    }


    if (
      els.overviewStatus
    ) {

      els.overviewStatus.textContent =
        "Enter your retirement profile below to build your estimate.";
    }
  }


  /* ============================================================
    15. PROJECTION PERIOD RENDERING
  ============================================================ */

  function renderProjectionPeriods(
    projection
  ) {

    const periods =
      projection.periods ||
      [];


    const yearEls = [

      els.projectionYear1,

      els.projectionYear2,

      els.projectionYear3

    ];


    const payEls = [

      els.projectionPay1,

      els.projectionPay2,

      els.projectionPay3

    ];


    periods
      .slice(
        0,
        3
      )
      .forEach(
        (
          period,
          index
        ) => {

          setText(
            yearEls[
              index
            ],
            period.label
          );


          setText(
            payEls[
              index
            ],
            money0(
              period.averageBasicPay
            )
          );
        }
      );


    /* ========================================================
      Because each card is a true 12-month block, make that
      explicit instead of implying one calendar-year pay table.
    ======================================================== */

    $$(
      ".ret-year-caption"
    ).forEach(
      caption => {

        caption.textContent =
          "12-mo average basic pay";
      }
    );
  }


  /* ============================================================
    16. RESULT RENDERING
  ============================================================ */

  function renderResult(
    input,
    projection,
    official
  ) {

    const retirementRecord =
      official.retirementRecord;


    const service =
      official.service;


    const monthly =
      Number(

        retirementRecord.grossMonthlyRetiredPay

        ??

        retirementRecord.retiredPayGross

        ??

        retirementRecord.monthlyRetirement

        ??

        0
      );


    const yearly =
      monthly *
      12;


    const high3 =
      Number(
        retirementRecord.retiredPayBase ||
        0
      );


    const multiplier =
      Number(
        retirementRecord.multiplier ||
        0
      );


    const multiplierPercent =
      clamp(
        multiplier *
        100,
        0,
        100
      );


    if (
      !Number.isFinite(
        monthly
      ) ||
      monthly <
        0
    ) {

      throw new Error(
        "The retirement engine returned an invalid monthly retired-pay value."
      );
    }


    if (
      !Number.isFinite(
        high3
      ) ||
      high3 <=
        0
    ) {

      throw new Error(
        "The retirement engine returned an invalid High-3 average."
      );
    }


    /* ========================================================
      RING

      The ring reflects the official retirement multiplier.

      Example:

        24 YOS HIGH3
        ->
        60%
    ======================================================== */

    if (
      els.payRing
    ) {

      els.payRing.style.setProperty(
        "--pct",
        String(
          round2(
            multiplierPercent
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
      DERIVED PROFILE
    ======================================================== */

    setText(
      els.serviceAtRetirement,
      service.display
    );


    setText(
      els.multiplier,
      formatPercentFromMultiplier(
        multiplier
      )
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
      service.display
    );


    setText(
      els.breakdownMultiplier,
      formatPercentFromMultiplier(
        multiplier
      )
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
      HIGH-3 PROJECTION
    ======================================================== */

    updateGrowthLabels(
      input.annualGrowthPercent
    );


    renderProjectionPeriods(
      projection
    );


    setText(
      els.high36Average,
      money2(
        high3
      )
    );


    if (
      els.projectionIntro
    ) {

      els.projectionIntro.textContent =

        `High-3 window: ${formatMonthYear(projection.firstMonth)} through ` +

        `${formatMonthYear(projection.finalMonth)}. ` +

        `The 36 projected monthly basic-pay values are averaged before the retirement multiplier is applied.`;
    }


    /* ========================================================
      OVERVIEW CONTEXT
    ======================================================== */

    if (
      els.overviewStatus
    ) {

      els.overviewStatus.textContent =

        `Projected using ${HIGH36_MONTHS} monthly basic-pay values, ` +

        `${round2(input.annualGrowthPercent)}% annual pay growth, and ` +

        `${input.rank} as the selected rank throughout the High-3 window.`;
    }


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

      multiplier

    };
  }


  /* ============================================================
    17. STATE + ASK AMY EVENT
  ============================================================ */

  let currentState =
    null;


  function cloneForPublic(
    value
  ) {

    return JSON.parse(
      JSON.stringify(
        value,
        (
          key,
          item
        ) => {

          if (
            item instanceof
            Date
          ) {

            return item.toISOString();
          }


          return item;
        }
      )
    );
  }


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


  /* ============================================================
    18. MAIN CALCULATION
  ============================================================ */

  let hasCalculatedOnce =
    false;


  async function calculate(
    options = {}
  ) {

    const userInitiated =
      options.userInitiated ===
      true;


    const input =
      readInputs();


    clearError();


    renderDerivedProfile(
      input
    );


    /* ========================================================
      BASIC VALIDATION
    ======================================================== */

    try {

      validateInputs(
        input
      );

    } catch (
      error
    ) {

      resetResults({
        preserveService:
          true
      });


      renderDerivedProfile(
        input
      );


      if (
        userInitiated
      ) {

        showError(
          error.message
        );
      }


      return null;
    }


    setLoading(
      true
    );


    try {

      /* ======================================================
        SERVICE CREDIT
      ====================================================== */

      const service =
        buildServiceProfile(
          input.entryDate,
          input.retirementDate
        );


      /* ======================================================
        BUILD EXACT PROJECTED HIGH-36
      ====================================================== */

      const projection =
        buildHigh36Projection(
          input
        );


      /* ======================================================
        SEND TO OFFICIAL RETIREMENT ENGINE
      ====================================================== */

      const official =
        await requestOfficialRetirement(
          input,
          projection
        );


      /* ======================================================
        RENDER
      ====================================================== */

      const result =
        renderResult(
          input,
          projection,
          official
        );


      hasCalculatedOnce =
        true;


      /* ======================================================
        PUBLIC STATE
      ====================================================== */

      currentState = {

        ok:
          true,

        runtimeVersion:
          RUNTIME_VERSION,

        payBaselineYear:
          PAY_BASELINE_YEAR,

        payBaselineVersion:
          PAY_BASELINE_VERSION,

        generatedAt:
          new Date().toISOString(),


        /* USER INPUT */

        inputs: {

          retirementSystem:
            input.retirementSystem,

          retirementSystemLabel:
            input.systemLabel,

          retirementRank:
            input.rank,

          retirementRankLabel:
            input.rankLabel,

          entryDate:
            dateToInputValue(
              input.entryDate
            ),

          retirementDate:
            dateToInputValue(
              input.retirementDate
            ),

          annualGrowthPercent:
            input.annualGrowthPercent

        },


        /* SERVICE */

        service: {

          serviceMonths:
            service.serviceMonths,

          yearsOfService:
            service.yearsOfService,

          display:
            service.display

        },


        /* PROJECTION ASSUMPTIONS */

        assumptions: {

          selectedRankAppliesAcrossHigh36:
            true,

          annualPayGrowthPercent:
            input.annualGrowthPercent,

          projectionBaselineYear:
            PAY_BASELINE_YEAR,

          projectionBaselineVersion:
            PAY_BASELINE_VERSION,

          retirementDateTreatedAsEffectiveDate:
            true

        },


        /* HIGH-36 */

        projection: {

          firstMonth:
            dateToInputValue(
              projection.firstMonth
            ).slice(
              0,
              7
            ),

          finalMonth:
            dateToInputValue(
              projection.finalMonth
            ).slice(
              0,
              7
            ),

          high36MonthlyArray:
            projection
              .high36MonthlyArray
              .slice(),

          high36AverageClient:
            projection.high36AverageClient,

          periods:

            projection.periods.map(
              period => ({

                index:
                  period.index,

                label:
                  period.label,

                startMonth:
                  dateToInputValue(
                    period.startDate
                  ).slice(
                    0,
                    7
                  ),

                endMonth:
                  dateToInputValue(
                    period.endDate
                  ).slice(
                    0,
                    7
                  ),

                averageBasicPay:
                  period.averageBasicPay

              })
            )

        },


        /* OFFICIAL RETIREMENT RESULT */

        retirement: {

          retirementSystem:
            official
              .retirementRecord
              .retirementSystem,

          yearsOfService:
            official
              .retirementRecord
              .yearsOfService,

          multiplier:
            official
              .retirementRecord
              .multiplier,

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


        /* SOURCE VERSIONS */

        sourceVersions: {
          ...official.sourceVersions
        }

      };


      clearError();


      emitRetirementEvent(
        currentState
      );


      return cloneForPublic(
        currentState
      );

    } catch (
      error
    ) {

      /* ======================================================
        ABORTED REQUESTS ARE NOT USER ERRORS
      ====================================================== */

      if (
        error &&
        error.name ===
          "AbortError"
      ) {

        return null;
      }


      resetResults({
        preserveService:
          true
      });


      renderDerivedProfile(
        input
      );


      showError(
        error &&
        error.message

          ? error.message

          : "Unable to calculate retirement pay."
      );


      currentState = {

        ok:
          false,

        runtimeVersion:
          RUNTIME_VERSION,

        error:

          error &&
          error.message

            ? error.message

            : "Unable to calculate retirement pay."

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
    19. LIVE RECALCULATION

    FIRST USE
    -------------------------------------------------------------
    Once both dates exist, calculate automatically.

    AFTER FIRST RESULT
    -------------------------------------------------------------
    Input changes recalculate quickly so the calculator feels live.

    The explicit Calculate button remains available for clarity
    and touch-first usability.
  ============================================================ */

  let debounceTimer =
    null;


  function scheduleCalculation() {

    window.clearTimeout(
      debounceTimer
    );


    const input =
      readInputs();


    clearError();


    renderDerivedProfile(
      input
    );


    updateGrowthLabels(
      input.annualGrowthPercent
    );


    /* ========================================================
      Do not call the API until both dates exist.
    ======================================================== */

    if (
      !input.entryDate ||
      !input.retirementDate
    ) {

      resetResults({
        preserveService:
          true
      });


      renderDerivedProfile(
        input
      );


      return;
    }


    debounceTimer =
      window.setTimeout(
        () => {

          calculate({
            userInitiated:
              false
          });

        },

        hasCalculatedOnce
          ? 260
          : 420
      );
  }


  /* ============================================================
    20. EVENT BINDING
  ============================================================ */

  [

    els.system,

    els.rank,

    els.entryDate,

    els.retirementDate

  ].forEach(
    element => {

      if (
        !element
      ) {

        return;
      }


      element.addEventListener(
        "change",
        scheduleCalculation
      );
    }
  );


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
    21. PUBLIC API

    This makes the calculator state available to a future
    page-specific Ask Amy module without localStorage.
  ============================================================ */

  window.THEWING_RETIREMENT =
    Object.freeze({

      version:
        RUNTIME_VERSION,

      payBaselineYear:
        PAY_BASELINE_YEAR,

      payBaselineVersion:
        PAY_BASELINE_VERSION,


      /* MAIN */

      calculate,


      /* INPUT */

      readInputs,


      /* PROJECTION */

      buildHigh36Projection,

      getBasicPay2026,

      projectMonthlyBasicPay,

      buildServiceProfile,


      /* STATE */

      getState() {

        return currentState

          ? cloneForPublic(
              currentState
            )

          : null;
      }

    });


  /* ============================================================
    22. INITIALIZE
  ============================================================ */

  function initialize() {

    ROOT.dataset.loading =
      "false";


    ROOT.dataset.error =
      "false";


    ROOT.dataset.hasResult =
      "false";


    const input =
      readInputs();


    updateGrowthLabels(
      input.annualGrowthPercent
    );


    renderDerivedProfile(
      input
    );


    resetResults({
      preserveService:
        true
    });


    renderDerivedProfile(
      input
    );


    setText(
      els.breakdownSystem,
      input.systemLabel ||
      "High-3"
    );


    setText(
      els.breakdownRank,
      input.rankLabel ||
      input.rank ||
      "—"
    );


    ROOT.dataset.ready =
      "true";
  }


  initialize();

})();
