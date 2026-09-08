/* ============================================================
  THEWING.AI • RETIREMENT PAY PROJECTION ENGINE
  retirement-projection.js
  v1.1.0

  UPDATE
  -------------------------------------------------------------
  - Supports one promotion during the final 36 months.
  - Months before the promotion month use Previous Rank.
  - The promotion month and all later High-36 months use Retirement Rank.
  - If no promotion is reported, Retirement Rank still applies to all 36 months.
  - Retirement Effective Date remains the retirement-effective date.
  - Creditable service still ends the day BEFORE that effective date.
  - High-36 remains exactly 36 monthly basic-pay values.
  - 2023-2025 remain reconstructed planning estimates.
  - Prior-year pay is reconstructed backward from official 2026 pay using
    the applicable annual general pay raises (2026 3.8%, 2025 4.5%, 2024 5.2%).
  - 2027-2030 use TheWing forecast assumptions.
============================================================ */

(function () {
  "use strict";

  if (
    window.THEWING_RETIREMENT_PROJECTION &&
    window.THEWING_RETIREMENT_PROJECTION.version
  ) {
    return;
  }

  const VERSION = "retirement-projection-2026.4";
  const PAY_BASELINE_VERSION = "official-pay-2026.1";
  const BASELINE_YEAR = 2026;
  const HISTORICAL_MIN_YEAR = 2023;
  const HIGH36_MONTHS = 36;
  const PERIOD_MONTHS = 12;

  const DEFAULT_LONG_RANGE_GROWTH_PERCENT = 2.5;
  const MIN_LONG_RANGE_GROWTH_PERCENT = 0;
  const MAX_LONG_RANGE_GROWTH_PERCENT = 10;

  /*
    Historical general military pay raises.

    Each key is the raise that took effect INTO that calendar year.

    For the supported reconstruction window:

      2025 pay = 2026 pay / 1.038
      2024 pay = 2025 pay / 1.045
      2023 pay = 2024 pay / 1.052

    2023's 4.6% value is retained as historical metadata but is not
    needed to reconstruct a 2023 value from the 2026 baseline because
    the reconstruction stops at 2023.
  */
  const HISTORICAL_PAY_RAISES = Object.freeze({
    2023: 4.6,
    2024: 5.2,
    2025: 4.5,
    2026: 3.8
  });

  const FORECAST_PAY_RAISES = Object.freeze({
    2027: 3.6,
    2028: 3.3,
    2029: 3.2,
    2030: 3.0
  });

  /*
    Compressed mirror of official-pay-2026.1.

    Only thresholds where the monthly amount changes are stored.
    If pay remains flat above the last listed threshold, the last
    threshold continues to apply.
  */
  const PAY_2026 = Object.freeze({
    "E-5": Object.freeze({
      0: 3342.90,
      2: 3598.20,
      3: 3775.80,
      4: 3946.80,
      6: 4110.00,
      8: 4299.90,
      10: 4395.30,
      12: 4421.70
    }),

    "E-6": Object.freeze({
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
      18: 5267.70
    }),

    "E-7": Object.freeze({
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
      26: 7067.40
    }),

    "E-8": Object.freeze({
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
      30: 8067.30
    }),

    "E-9": Object.freeze({
      10: 6910.20,
      12: 7066.50,
      14: 7263.60,
      16: 7496.10,
      18: 7730.70,
      20: 8105.10,
      22: 8423.10,
      24: 8756.70,
      26: 9267.90,
      30: 9730.20,
      34: 10217.40,
      38: 10729.20
    }),

    "O-1": Object.freeze({
      0: 4150.20,
      2: 4320.00,
      3: 5222.40
    }),

    "O-2": Object.freeze({
      0: 4782.00,
      2: 5446.20,
      3: 6272.40,
      4: 6484.50,
      6: 6617.70
    }),

    "O-3": Object.freeze({
      0: 5534.10,
      2: 6273.90,
      3: 6770.40,
      4: 7382.70,
      6: 7737.00,
      8: 8125.50,
      10: 8375.70,
      12: 8788.20,
      14: 9004.20
    }),

    "O-4": Object.freeze({
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
      18: 10509.90
    }),

    "O-5": Object.freeze({
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
      22: 12394.80
    }),

    "O-6": Object.freeze({
      0: 8751.30,
      2: 9613.80,
      3: 10245.00,
      6: 10284.30,
      8: 10725.00,
      10: 10783.50,
      14: 11396.40,
      16: 12479.70,
      18: 13115.40,
      20: 13751.10,
      22: 14112.90,
      24: 14479.20,
      26: 15188.70,
      30: 15408.30
    }),

    "O-7": Object.freeze({
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
      26: 16904.40,
      30: 17242.20
    }),

    "O-8": Object.freeze({
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
      22: 18999.90
    }),

    "O-1E": Object.freeze({
      4: 5222.40,
      6: 5576.70,
      8: 5783.10,
      10: 5993.70,
      12: 6200.70,
      14: 6484.50
    }),

    "O-2E": Object.freeze({
      4: 6484.50,
      6: 6617.70,
      8: 6828.00,
      10: 7183.80,
      12: 7458.90,
      14: 7663.50
    }),

    "O-3E": Object.freeze({
      4: 7382.70,
      6: 7737.00,
      8: 8125.50,
      10: 8375.70,
      12: 8788.20,
      14: 9137.10,
      16: 9336.90,
      18: 9609.60
    })
  });

  const SUPPORTED_RANKS = Object.freeze(
    Object.keys(PAY_2026)
  );

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

  function roundToDime(
    value
  ) {
    return (
      Math.round(
        (
          Number(value) ||
          0
        ) *
        10
      ) /
      10
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

  function toGrowthPercent(
    value,
    fallback
  ) {
    const n =
      Number(
        value
      );

    if (
      !Number.isFinite(
        n
      )
    ) {
      return Number(
        fallback
      );
    }

    if (
      n <
        MIN_LONG_RANGE_GROWTH_PERCENT ||
      n >
        MAX_LONG_RANGE_GROWTH_PERCENT
    ) {
      throw new Error(
        `Long-range annual pay growth must be between ` +
        `${MIN_LONG_RANGE_GROWTH_PERCENT}% and ` +
        `${MAX_LONG_RANGE_GROWTH_PERCENT}%.`
      );
    }

    return n;
  }

  /* ============================================================
    DATE HELPERS
  ============================================================ */

  function parseDateInput(
    value
  ) {
    if (
      value instanceof Date &&
      !Number.isNaN(
        value.getTime()
      )
    ) {
      return new Date(
        Date.UTC(
          value.getUTCFullYear(),
          value.getUTCMonth(),
          value.getUTCDate()
        )
      );
    }

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

  function toIsoDate(
    date
  ) {
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

  function addUtcDays(
    date,
    days
  ) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() +
          Number(
            days ||
            0
          )
      )
    );
  }

  /* ============================================================
    RETIREMENT DATE SEMANTICS
  ============================================================ */

  /*
    Retirement Effective Date is treated as the
    retirement-effective date.

    If retirement is effective on the first of the month,
    the prior month is the final active-pay month.
  */
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

  /*
    Creditable active-duty service ends the day before the
    retirement-effective date.

    Example:

      Retirement effective:
        2026-10-01

      Last active-duty day:
        2026-09-30
  */
  function getLastActiveDutyDate(
    retirementDate
  ) {
    if (
      !(
        retirementDate instanceof
        Date
      ) ||
      Number.isNaN(
        retirementDate.getTime()
      )
    ) {
      return null;
    }

    return addUtcDays(
      retirementDate,
      -1
    );
  }

  /* ============================================================
    SERVICE CREDIT
  ============================================================ */

  /*
    Low-level helper.

    Calculates completed whole service months AS OF a specific
    calendar date.

    This is used inside the High-36 monthly longevity model.
  */
  function completedServiceMonthsAsOf(
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

  /*
    PUBLIC retirement-service helper.

    The second argument is the RETIREMENT-EFFECTIVE DATE.

    Example:

      Entry:
        2006-09-01

      Retirement effective:
        2026-10-01

      Last active-duty day:
        2026-09-30

      Completed service:
        240 months
        20y 0m

    This fixes the previous 241-month result.
  */
  function completedServiceMonths(
    entryDate,
    retirementDate
  ) {
    const lastActiveDutyDate =
      getLastActiveDutyDate(
        retirementDate
      );

    if (
      !lastActiveDutyDate
    ) {
      return 0;
    }

    return completedServiceMonthsAsOf(
      entryDate,
      lastActiveDutyDate
    );
  }

  function serviceYearsFromMonths(
    serviceMonths
  ) {
    return (
      Math.max(
        0,
        Number(
          serviceMonths
        ) ||
        0
      ) /
      12
    );
  }

  function formatService(
    serviceMonths
  ) {
    const total =
      Math.max(
        0,
        Math.floor(
          Number(
            serviceMonths
          ) ||
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

  /* ============================================================
    PAY THRESHOLD LOOKUP
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
        "No basic-pay thresholds exist for this rank."
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

    if (
      yos <
      keys[0]
    ) {
      throw new Error(
        `No official 2026 pay value exists for this rank at ` +
        `${round2(yos)} years of service.`
      );
    }

    let chosen =
      keys[0];

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
        `Unable to find 2026 basic pay for ${rankKey} at ` +
        `${round2(yearsOfService)} years of service.`
      );
    }

    return {
      rank:
        rankKey,

      threshold,

      basicPayMonthly:
        amount
    };
  }

  /* ============================================================
    PAY RAISE MODEL
  ============================================================ */

  function getAnnualRaisePercent(
    year,
    longRangeGrowthPercent
  ) {
    const y =
      Number(
        year
      );

    const longRange =
      toGrowthPercent(
        longRangeGrowthPercent,
        DEFAULT_LONG_RANGE_GROWTH_PERCENT
      );

    if (
      !Number.isInteger(
        y
      )
    ) {
      throw new Error(
        "Pay year must be a whole calendar year."
      );
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          HISTORICAL_PAY_RAISES,
          y
        )
    ) {
      return {
        year:
          y,

        percent:
          HISTORICAL_PAY_RAISES[
            y
          ],

        source:
          "HISTORICAL_GENERAL_RAISE"
      };
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          FORECAST_PAY_RAISES,
          y
        )
    ) {
      return {
        year:
          y,

        percent:
          FORECAST_PAY_RAISES[
            y
          ],

        source:
          "THEWING_PLANNING_ASSUMPTION"
      };
    }

    if (
      y >=
      2031
    ) {
      return {
        year:
          y,

        percent:
          longRange,

        source:
          "LONG_RANGE_ASSUMPTION"
      };
    }

    return null;
  }

  function transformPayFrom2026(
    basicPay2026,
    targetYear,
    longRangeGrowthPercent
  ) {
    const year =
      Number(
        targetYear
      );

    if (
      !Number.isInteger(
        year
      )
    ) {
      throw new Error(
        "targetYear must be a whole calendar year."
      );
    }

    if (
      year <
      HISTORICAL_MIN_YEAR
    ) {
      throw new Error(
        `Retirement projection currently supports pay years ` +
        `${HISTORICAL_MIN_YEAR} and later.`
      );
    }

    let pay =
      roundToDime(
        basicPay2026
      );

    const appliedRaises =
      [];

    /* --------------------------------------------------------
      OFFICIAL 2026
    -------------------------------------------------------- */

    if (
      year ===
      BASELINE_YEAR
    ) {
      return {
        pay,

        sourceMode:
          "OFFICIAL_2026",

        appliedRaises
      };
    }

    /* --------------------------------------------------------
      HISTORICAL RECONSTRUCTION
    -------------------------------------------------------- */

    if (
      year <
      BASELINE_YEAR
    ) {
      for (
        let stepYear =
          BASELINE_YEAR;

        stepYear >
          year;

        stepYear -=
          1
      ) {
        const raise =
          getAnnualRaisePercent(
            stepYear,
            longRangeGrowthPercent
          );

        if (
          !raise
        ) {
          throw new Error(
            `Missing historical pay-raise assumption for ${stepYear}.`
          );
        }

        pay =
          roundToDime(
            pay /
            (
              1 +
              raise.percent /
              100
            )
          );

        appliedRaises.push({
          year:
            stepYear,

          percent:
            raise.percent,

          direction:
            "REVERSE",

          source:
            raise.source
        });
      }

      return {
        pay,

        sourceMode:
          "HISTORICAL_RECONSTRUCTION",

        appliedRaises
      };
    }

    /* --------------------------------------------------------
      FUTURE FORECAST
    -------------------------------------------------------- */

    for (
      let stepYear =
        BASELINE_YEAR +
        1;

      stepYear <=
        year;

      stepYear +=
        1
    ) {
      const raise =
        getAnnualRaisePercent(
          stepYear,
          longRangeGrowthPercent
        );

      if (
        !raise
      ) {
        throw new Error(
          `Missing future pay-growth assumption for ${stepYear}.`
        );
      }

      pay =
        roundToDime(
          pay *
          (
            1 +
            raise.percent /
            100
          )
        );

      appliedRaises.push({
        year:
          stepYear,

        percent:
          raise.percent,

        direction:
          "FORWARD",

        source:
          raise.source
      });
    }

    return {
      pay,

      sourceMode:
        year <=
        2030
          ? "THEWING_FORECAST"
          : "LONG_RANGE_FORECAST",

      appliedRaises
    };
  }

  function getBasicPayForYear(
    options
  ) {
    const input =
      options ||
      {};

    const rank =
      normalizeRank(
        input.rank
      );

    const yearsOfService =
      Number(
        input.yearsOfService
      );

    const calendarYear =
      Number(
        input.calendarYear
      );

    const longRangeGrowthPercent =
      toGrowthPercent(
        input.longRangeGrowthPercent,
        DEFAULT_LONG_RANGE_GROWTH_PERCENT
      );

    if (
      !Number.isFinite(
        yearsOfService
      ) ||
      yearsOfService <
        0
    ) {
      throw new Error(
        "yearsOfService must be a non-negative number."
      );
    }

    const baseline =
      getBasicPay2026(
        rank,
        yearsOfService
      );

    const transformed =
      transformPayFrom2026(
        baseline.basicPayMonthly,
        calendarYear,
        longRangeGrowthPercent
      );

    return {
      rank,

      calendarYear,

      yearsOfService,

      threshold:
        baseline.threshold,

      basicPay2026:
        baseline.basicPayMonthly,

      basicPayMonthly:
        round2(
          transformed.pay
        ),

      sourceMode:
        transformed.sourceMode,

      appliedRaises:
        transformed.appliedRaises
    };
  }

  /* ============================================================
    INPUT NORMALIZATION
  ============================================================ */

  function normalizeBuildInput(
    input
  ) {
    const source =
      input ||
      {};

    const rank =
      normalizeRank(
        source.rank ||
        source.retirementRank ||
        source.rankAtRetirement
      );

    const promotionFlag =
      String(
        source.promotedFinal36 !==
          undefined
          ? source.promotedFinal36
          : source.promotionDuringFinal36 ||
            ""
      )
        .trim()
        .toUpperCase();

    const promotionDuringFinal36 =
      source.promotedFinal36 ===
        true ||
      source.promotionDuringFinal36 ===
        true ||
      promotionFlag ===
        "YES" ||
      promotionFlag ===
        "TRUE" ||
      promotionFlag ===
        "1";

    const previousRank =
      promotionDuringFinal36
        ? normalizeRank(
            source.previousRank
          )
        : "";

    const promotionDate =
      promotionDuringFinal36
        ? parseDateInput(
            source.promotionDate
          )
        : null;

    const entryDate =
      parseDateInput(
        source.entryDate ||
        source.serviceEntryDate
      );

    const retirementDate =
      parseDateInput(
        source.retirementDate
      );

    const longRangeGrowthPercent =
      toGrowthPercent(
        source.longRangeGrowthPercent !==
          undefined
          ? source.longRangeGrowthPercent
          : source.annualGrowthPercent,

        DEFAULT_LONG_RANGE_GROWTH_PERCENT
      );

    if (
      !SUPPORTED_RANKS.includes(
        rank
      )
    ) {
      throw new Error(
        "Select a supported retirement rank."
      );
    }

    if (
      promotionDuringFinal36 &&
      !SUPPORTED_RANKS.includes(
        previousRank
      )
    ) {
      throw new Error(
        "Select a supported previous rank."
      );
    }

    if (
      promotionDuringFinal36 &&
      previousRank ===
        rank
    ) {
      throw new Error(
        "Previous Rank must be different from Retirement Rank."
      );
    }

    if (
      promotionDuringFinal36 &&
      !promotionDate
    ) {
      throw new Error(
        "Promotion Date is required when a final-36 promotion is reported."
      );
    }

    if (
      !entryDate
    ) {
      throw new Error(
        "Date Entered Service is required."
      );
    }

    if (
      !retirementDate
    ) {
      throw new Error(
        "Retirement Effective Date is required."
      );
    }

    if (
      retirementDate <=
      entryDate
    ) {
      throw new Error(
        "Retirement Effective Date must be after Date Entered Service."
      );
    }

    return {
      rank,

      promotionDuringFinal36,

      previousRank,

      promotionDate,

      entryDate,

      retirementDate,

      longRangeGrowthPercent
    };
  }

  /* ============================================================
    HIGH-3 PERIOD SUMMARIES
  ============================================================ */

  function formatPeriodLabel(
    startDate,
    endDate
  ) {
    const startYear =
      startDate.getUTCFullYear();

    const endYear =
      endDate.getUTCFullYear();

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

  function buildPeriods(
    months
  ) {
    const periods =
      [];

    for (
      let startIndex =
        0;

      startIndex <
        HIGH36_MONTHS;

      startIndex +=
        PERIOD_MONTHS
    ) {
      const block =
        months.slice(
          startIndex,
          startIndex +
          PERIOD_MONTHS
        );

      const first =
        block[0];

      const last =
        block[
          block.length -
          1
        ];

      periods.push({
        index:
          periods.length +
          1,

        label:
          formatPeriodLabel(
            first.date,
            last.date
          ),

        startMonth:
          first.month,

        endMonth:
          last.month,

        averageBasicPay:
          round2(
            average(
              block.map(
                item =>
                  item.projectedBasicPay
              )
            )
          )
      });
    }

    return periods;
  }

  function buildCalendarYearSummary(
    months
  ) {
    const buckets =
      new Map();

    for (
      const month
      of months
    ) {
      const year =
        month.calendarYear;

      if (
        !buckets.has(
          year
        )
      ) {
        buckets.set(
          year,
          []
        );
      }

      buckets
        .get(
          year
        )
        .push(
          month.projectedBasicPay
        );
    }

    return Array
      .from(
        buckets.entries()
      )
      .sort(
        (
          a,
          b
        ) =>
          a[0] -
          b[0]
      )
      .map(
        (
          [
            year,
            values
          ]
        ) => ({
          year,

          monthsIncluded:
            values.length,

          averageBasicPay:
            round2(
              average(
                values
              )
            )
        })
      );
  }

  /* ============================================================
    BUILD EXACT HIGH-36
  ============================================================ */

  function buildHigh36Projection(
    input
  ) {
    const normalized =
      normalizeBuildInput(
        input
      );

    const rank =
      normalized.rank;

    const promotionDuringFinal36 =
      normalized.promotionDuringFinal36;

    const previousRank =
      normalized.previousRank;

    const promotionDate =
      normalized.promotionDate;

    const entryDate =
      normalized.entryDate;

    const retirementDate =
      normalized.retirementDate;

    const longRangeGrowthPercent =
      normalized.longRangeGrowthPercent;

    /* --------------------------------------------------------
      RETIREMENT / ACTIVE-DUTY DATE
    -------------------------------------------------------- */

    const finalMonth =
      getFinalActivePayMonth(
        retirementDate
      );

    const lastActiveDutyDate =
      getLastActiveDutyDate(
        retirementDate
      );

    if (
      !lastActiveDutyDate
    ) {
      throw new Error(
        "Unable to determine the last active-duty date."
      );
    }

    /* --------------------------------------------------------
      HIGH-36 WINDOW
    -------------------------------------------------------- */

    const firstMonth =
      addUtcMonths(
        finalMonth,
        -(
          HIGH36_MONTHS -
          1
        )
      );

    if (
      firstMonth.getUTCFullYear() <
      HISTORICAL_MIN_YEAR
    ) {
      throw new Error(
        `This High-3 window begins in ` +
        `${firstMonth.getUTCFullYear()}. ` +
        `The current retirement projection supports ` +
        `${HISTORICAL_MIN_YEAR} and later.`
      );
    }

    const promotionMonth =
      promotionDuringFinal36
        ? startOfUtcMonth(
            promotionDate
          )
        : null;

    if (
      promotionDuringFinal36 &&
      (
        promotionMonth <
          firstMonth ||
        promotionMonth >
          finalMonth
      )
    ) {
      throw new Error(
        "Promotion Date must fall within the final 36-month High-3 window."
      );
    }

    if (
      promotionDuringFinal36 &&
      promotionDate >
        lastActiveDutyDate
    ) {
      throw new Error(
        "Promotion Date cannot be after the last active-duty date."
      );
    }

    const months =
      [];

    for (
      let index =
        0;

      index <
        HIGH36_MONTHS;

      index +=
        1
    ) {
      const monthDate =
        addUtcMonths(
          firstMonth,
          index
        );

      /*
        NOTE:
        Monthly longevity still uses the month-specific "as of"
        helper.

        This keeps the retirement-effective-date fix separate from
        the later longevity-timing audit item.
      */
      const serviceMonths =
        completedServiceMonthsAsOf(
          entryDate,
          monthDate
        );

      const yearsOfService =
        serviceYearsFromMonths(
          serviceMonths
        );

      const calendarYear =
        monthDate.getUTCFullYear();

      /*
        Promotion semantics are month-based.

        Months before the promotion month use Previous Rank.
        The promotion month itself and all later months use
        Retirement Rank.
      */
      const monthRank =
        promotionDuringFinal36 &&
        monthDate <
          promotionMonth
          ? previousRank
          : rank;

      const pay =
        getBasicPayForYear({
          rank:
            monthRank,

          yearsOfService,

          calendarYear,

          longRangeGrowthPercent
        });

      months.push({
        index:
          index +
          1,

        date:
          monthDate,

        month:
          toIsoDate(
            monthDate
          ).slice(
            0,
            7
          ),

        calendarYear,

        rank:
          monthRank,

        rankSource:
          promotionDuringFinal36 &&
          monthDate <
            promotionMonth
            ? "PREVIOUS_RANK"
            : "RETIREMENT_RANK",

        serviceMonths,

        yearsOfService:
          round2(
            yearsOfService
          ),

        serviceDisplay:
          formatService(
            serviceMonths
          ),

        payThreshold:
          pay.threshold,

        basicPay2026:
          pay.basicPay2026,

        projectedBasicPay:
          pay.basicPayMonthly,

        paySourceMode:
          pay.sourceMode,

        appliedRaises:
          pay.appliedRaises
      });
    }

    const high36MonthlyArray =
      months.map(
        month =>
          month.projectedBasicPay
      );

    if (
      high36MonthlyArray.length !==
      HIGH36_MONTHS
    ) {
      throw new Error(
        `High-36 projection must contain exactly ` +
        `${HIGH36_MONTHS} months.`
      );
    }

    /* --------------------------------------------------------
      RETIREMENT SERVICE CREDIT

      IMPORTANT FIX:
      retirementDate is an EFFECTIVE date.

      Service is therefore measured through:
        retirementDate - 1 day
    -------------------------------------------------------- */

    const retirementServiceMonths =
      completedServiceMonths(
        entryDate,
        retirementDate
      );

    /* --------------------------------------------------------
      RESPONSE
    -------------------------------------------------------- */

    return {
      ok:
        true,

      version:
        VERSION,

      payBaselineVersion:
        PAY_BASELINE_VERSION,

      rank,

      retirementRank:
        rank,

      promotionDuringFinal36,

      previousRank:
        promotionDuringFinal36
          ? previousRank
          : null,

      promotionDate:
        promotionDuringFinal36
          ? toIsoDate(
              promotionDate
            )
          : null,

      promotionMonth:
        promotionDuringFinal36
          ? toIsoDate(
              promotionMonth
            ).slice(
              0,
              7
            )
          : null,

      entryDate:
        toIsoDate(
          entryDate
        ),

      retirementDate:
        toIsoDate(
          retirementDate
        ),

      lastActiveDutyDate:
        toIsoDate(
          lastActiveDutyDate
        ),

      firstHigh36Month:
        toIsoDate(
          firstMonth
        ).slice(
          0,
          7
        ),

      finalHigh36Month:
        toIsoDate(
          finalMonth
        ).slice(
          0,
          7
        ),

      retirementServiceMonths,

      retirementYearsOfService:
        round2(
          serviceYearsFromMonths(
            retirementServiceMonths
          )
        ),

      retirementServiceDisplay:
        formatService(
          retirementServiceMonths
        ),

      longRangeGrowthPercent,

      forecastSchedule: {
        2027:
          FORECAST_PAY_RAISES[
            2027
          ],

        2028:
          FORECAST_PAY_RAISES[
            2028
          ],

        2029:
          FORECAST_PAY_RAISES[
            2029
          ],

        2030:
          FORECAST_PAY_RAISES[
            2030
          ],

        "2031+":
          longRangeGrowthPercent
      },

      high36MonthlyArray,

      high36Average:
        round2(
          average(
            high36MonthlyArray
          )
        ),

      months,

      periods:
        buildPeriods(
          months
        ),

      calendarYears:
        buildCalendarYearSummary(
          months
        ),

      assumptions: {
        retirementDateTreatedAsEffectiveDate:
          true,

        serviceCreditThroughDayBeforeRetirement:
          true,

        retirementRankAppliedAcrossHigh36:
          !promotionDuringFinal36,

        promotionRankHistoryApplied:
          promotionDuringFinal36,

        promotionMonthUsesRetirementRank:
          true,

        historicalYearsBefore2026AreReconstructed:
          true,

        futureYearsArePlanningEstimates:
          true,

        historicalMinimumYear:
          HISTORICAL_MIN_YEAR,

        officialBaselineYear:
          BASELINE_YEAR
      }
    };
  }

  /* ============================================================
    SAFE WRAPPER
  ============================================================ */

  function safeBuildHigh36Projection(
    input
  ) {
    try {
      return buildHigh36Projection(
        input
      );
    } catch (
      error
    ) {
      return {
        ok:
          false,

        version:
          VERSION,

        error:
          error &&
          error.message
            ? error.message
            : "Unable to build retirement projection."
      };
    }
  }

  /* ============================================================
    PUBLIC API
  ============================================================ */

  window.THEWING_RETIREMENT_PROJECTION =
    Object.freeze({
      version:
        VERSION,

      payBaselineVersion:
        PAY_BASELINE_VERSION,

      baselineYear:
        BASELINE_YEAR,

      historicalMinYear:
        HISTORICAL_MIN_YEAR,

      high36Months:
        HIGH36_MONTHS,

      defaultLongRangeGrowthPercent:
        DEFAULT_LONG_RANGE_GROWTH_PERCENT,

      supportedRanks:
        SUPPORTED_RANKS.slice(),

      historicalPayRaises:
        Object.freeze({
          ...HISTORICAL_PAY_RAISES
        }),

      forecastPayRaises:
        Object.freeze({
          ...FORECAST_PAY_RAISES
        }),

      normalizeRank,

      parseDateInput,

      getLastActiveDutyDate,

      /*
        retirementcalculator.js already calls this helper using:

          entryDate
          retirementDate

        so its service preview and 20-year validation continue to receive
        the corrected retirement-service months automatically.
      */
      completedServiceMonths,

      serviceYearsFromMonths,

      getAnnualRaisePercent,

      getBasicPay2026,

      getBasicPayForYear,

      buildHigh36Projection,

      safeBuildHigh36Projection
    });

})();
