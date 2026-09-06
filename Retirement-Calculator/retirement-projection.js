/* ============================================================
  THEWING.AI • RETIREMENT PAY PROJECTION ENGINE
  retirement-projection.js
  v1.0.0

  LOCATION
  -------------------------------------------------------------
  Retirement-Calculator/retirement-projection.js

  PURPOSE
  -------------------------------------------------------------
  - Build the 36 monthly BASIC PAY values used by High-3 / BRS.
  - Support retirement windows that begin before 2026.
  - Use the official 2026 pay table as the current baseline.
  - Reconstruct 2023-2025 from the 2026 baseline using the known
    annual across-the-board raises for supported grades.
  - Apply TheWing planning assumptions for 2027-2030.
  - Apply a configurable long-range rate beginning in 2031.
  - Account for longevity/YOS threshold changes month by month.
  - Contain NO retirement multiplier or retired-pay formula.

  IMPORTANT
  -------------------------------------------------------------
  This is a BROWSER-SAFE projection module. It intentionally does
  not import Netlify server files directly.

  Canonical retirement math remains in:
    netlify/functions/_share/official-retirement.js

  Canonical 2026 basic-pay source remains:
    netlify/functions/_share/official-pay.js

  Because this file lives in Retirement-Calculator/, it mirrors only
  the 2026 pay rows needed by this UI. The next backend consolidation
  can move this projection work next to official-pay.js and remove the
  browser mirror entirely.

  HISTORICAL NOTE
  -------------------------------------------------------------
  2023-2025 values in this browser module are reconstructed from the
  official 2026 table by reversing the known annual general raises:

    2024: 5.2%
    2025: 4.5%
    2026: 3.8%

  This removes the current pre-2026 blocking error and produces a
  planning-grade historical estimate.

  FUTURE THEWING ASSUMPTIONS
  -------------------------------------------------------------
    2027: 3.6%
    2028: 3.3%
    2029: 3.2%
    2030: 3.0%
    2031+: 2.5% default long-range assumption

  These future values are planning assumptions, not published future
  military pay tables.
============================================================ */

(function () {
  "use strict";


  /* ============================================================
    PREVENT DOUBLE BINDING
  ============================================================ */

  if (
    window.THEWING_RETIREMENT_PROJECTION &&
    window.THEWING_RETIREMENT_PROJECTION.version
  ) {
    return;
  }


  /* ============================================================
    1. VERSION / CONFIGURATION
  ============================================================ */

  const VERSION =
    "retirement-projection-2026.1";


  const PAY_BASELINE_VERSION =
    "official-pay-2026.1";


  const BASELINE_YEAR =
    2026;


  const HISTORICAL_MIN_YEAR =
    2023;


  const HIGH36_MONTHS =
    36;


  const PERIOD_MONTHS =
    12;


  const DEFAULT_LONG_RANGE_GROWTH_PERCENT =
    2.5;


  const MIN_LONG_RANGE_GROWTH_PERCENT =
    0;


  const MAX_LONG_RANGE_GROWTH_PERCENT =
    10;


  const YOS_THRESHOLDS =
    Object.freeze([
      0,
      2,
      3,
      4,
      6,
      8,
      10,
      12,
      14,
      16,
      18,
      20,
      22,
      24,
      26,
      28,
      30,
      32,
      34,
      36,
      38,
      40
    ]);


  /* ============================================================
    2. KNOWN HISTORICAL ANNUAL GENERAL RAISES

    Key = year the raise became effective on January 1.
  ============================================================ */

  const HISTORICAL_PAY_RAISES =
    Object.freeze({

      2023:
        4.6,

      2024:
        5.2,

      2025:
        4.5,

      2026:
        3.8

    });


  /* ============================================================
    3. THEWING FUTURE PLANNING ASSUMPTIONS

    NOTE
    -------------------------------------------------------------
    2030 specifically uses 3.0%.

    Therefore the 2.5% long-range fallback begins in 2031.
  ============================================================ */

  const FORECAST_PAY_RAISES =
    Object.freeze({

      2027:
        3.6,

      2028:
        3.3,

      2029:
        3.2,

      2030:
        3.0

    });


  /* ============================================================
    4. OFFICIAL 2026 BASIC-PAY MIRROR

    UI-supported grades only:

      E-5 through E-9
      O-1 through O-8
      O-1E through O-3E

    Mirrors:
      official-pay-2026.1
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
    5. GENERAL HELPERS
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
        Number(
          value
        ) ||
        0
      ).toFixed(
        2
      )
    );
  }


  function roundToDime(
    value
  ) {

    return (
      Math.round(
        (
          Number(
            value
          ) ||
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
      !Array.isArray(
        values
      ) ||
      !values.length
    ) {

      return 0;
    }


    return (
      values.reduce(
        function (
          sum,
          value
        ) {

          return (
            sum +
            Number(
              value ||
              0
            )
          );
        },
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
    6. DATE HELPERS

    UTC is used intentionally so dates do not shift based on
    user timezone.
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


    const parts =
      raw
        .split("-")
        .map(
          Number
        );


    const year =
      parts[0];


    const month =
      parts[1];


    const day =
      parts[2];


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


  /* ============================================================
    RETIREMENT DATE SEMANTICS

    Planned Retirement Date is currently treated as the
    retirement-effective date.

    If retirement is effective on the first day of a month,
    the prior month is the final active-pay month.

    Example:

      Retirement:
        2029-09-01

      Final active-pay month:
        2029-08
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


  /* ============================================================
    7. SERVICE CREDIT
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
    8. PAY THRESHOLD LOOKUP

    Mirrors official-pay.js threshold behavior:

      Use greatest threshold <= actual YOS.

    Example:

      E-7 at 21.5 YOS
      ->
      Over 20

      E-7 at 22.0 YOS
      ->
      Over 22
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
          function (
            a,
            b
          ) {

            return (
              a -
              b
            );
          }
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


    const firstKey =
      keys[0];


    if (
      yos <
      firstKey
    ) {

      throw new Error(
        `No official 2026 pay value exists for this rank at ` +
        `${round2(yos)} years of service.`
      );
    }


    let chosen =
      firstKey;


    keys.forEach(
      function (
        key
      ) {

        if (
          yos >=
          key
        ) {

          chosen =
            key;
        }
      }
    );


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
    9. ANNUAL RAISE RESOLUTION
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


    /* ========================================================
      HISTORICAL
    ======================================================== */

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


    /* ========================================================
      THEWING 2027-2030 FORECAST
    ======================================================== */

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


    /* ========================================================
      LONG RANGE 2031+
    ======================================================== */

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


  /* ============================================================
    10. YEARLY PAY TRANSFORMATION

    Starting point:
      official 2026 table cell for rank/YOS threshold.

    Historical years:
      reverse one annual raise at a time.

    Future years:
      compound one annual raise at a time.

    Each annual step rounds to nearest $0.10 to mimic the
    resolution of published monthly basic-pay tables.
  ============================================================ */

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


    /* ========================================================
      2026 — OFFICIAL BASELINE
    ======================================================== */

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


    /* ========================================================
      HISTORICAL RECONSTRUCTION
    ======================================================== */

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


    /* ========================================================
      FUTURE PROJECTION
    ======================================================== */

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


  /* ============================================================
    11. BASIC PAY FOR A SPECIFIC YEAR
  ============================================================ */

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
    12. NORMALIZE HIGH-36 BUILD INPUT
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


    const entryDate =
      parseDateInput(

        source.entryDate ||

        source.serviceEntryDate

      );


    const retirementDate =
      parseDateInput(
        source.retirementDate
      );


    /*
      Existing calculator field:
        annualGrowthPercent

      New preferred meaning:
        long-range 2031+ growth assumption

      2027-2030 remain locked to TheWing's selected schedule.
    */

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
        "Select a supported planned retirement rank."
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
        "Planned Retirement Date is required."
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


    return {

      rank,

      entryDate,

      retirementDate,

      longRangeGrowthPercent

    };
  }


  /* ============================================================
    13. THREE 12-MONTH HIGH-3 PERIODS
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
      let startIndex = 0;

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
                function (
                  item
                ) {

                  return (
                    item.projectedBasicPay
                  );
                }
              )
            )
          )

      });
    }


    return periods;
  }


  /* ============================================================
    14. CALENDAR-YEAR SUMMARY

    Useful for UI cards like:

      2027
      $X,XXX

      2028
      $X,XXX

      2029
      $X,XXX
  ============================================================ */

  function buildCalendarYearSummary(
    months
  ) {

    const buckets =
      new Map();


    months.forEach(
      function (
        month
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
    );


    return Array
      .from(
        buckets.entries()
      )
      .sort(
        function (
          a,
          b
        ) {

          return (
            a[0] -
            b[0]
          );
        }
      )
      .map(
        function (
          entry
        ) {

          const year =
            entry[0];


          const values =
            entry[1];


          return {

            year,

            monthsIncluded:
              values.length,

            averageBasicPay:
              round2(
                average(
                  values
                )
              )

          };
        }
      );
  }


  /* ============================================================
    15. BUILD EXACT 36-MONTH PROJECTION
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


    const entryDate =
      normalized.entryDate;


    const retirementDate =
      normalized.retirementDate;


    const longRangeGrowthPercent =
      normalized.longRangeGrowthPercent;


    /* ========================================================
      FINAL ACTIVE-PAY MONTH
    ======================================================== */

    const finalMonth =
      getFinalActivePayMonth(
        retirementDate
      );


    /* ========================================================
      FIRST HIGH-36 MONTH

      36 months inclusive:
        final month
        minus 35 months
    ======================================================== */

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


    const months =
      [];


    /* ========================================================
      BUILD EACH MONTH
    ======================================================== */

    for (
      let index = 0;

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


      const pay =
        getBasicPayForYear({

          rank,

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

        rank,

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


    /* ========================================================
      HIGH-36 ARRAY

      This is what gets sent to official-retirement.js.
    ======================================================== */

    const high36MonthlyArray =
      months.map(
        function (
          month
        ) {

          return (
            month.projectedBasicPay
          );
        }
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


    /* ========================================================
      SERVICE AT RETIREMENT
    ======================================================== */

    const retirementServiceMonths =
      completedServiceMonths(
        entryDate,
        retirementDate
      );


    /* ========================================================
      FINAL RESULT
    ======================================================== */

    return {

      ok:
        true,

      version:
        VERSION,

      payBaselineVersion:
        PAY_BASELINE_VERSION,


      /* ------------------------------------------------------
        PROFILE
      ------------------------------------------------------ */

      rank,

      entryDate:
        toIsoDate(
          entryDate
        ),

      retirementDate:
        toIsoDate(
          retirementDate
        ),


      /* ------------------------------------------------------
        HIGH-36 WINDOW
      ------------------------------------------------------ */

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


      /* ------------------------------------------------------
        SERVICE CREDIT
      ------------------------------------------------------ */

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


      /* ------------------------------------------------------
        LONG-RANGE ASSUMPTION
      ------------------------------------------------------ */

      longRangeGrowthPercent,


      /* ------------------------------------------------------
        THEWING FORECAST SCHEDULE
      ------------------------------------------------------ */

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


      /* ------------------------------------------------------
        HIGH-36 VALUES
      ------------------------------------------------------ */

      high36MonthlyArray,

      high36Average:
        round2(
          average(
            high36MonthlyArray
          )
        ),


      /* ------------------------------------------------------
        DETAIL
      ------------------------------------------------------ */

      months,

      periods:
        buildPeriods(
          months
        ),

      calendarYears:
        buildCalendarYearSummary(
          months
        ),


      /* ------------------------------------------------------
        EXPLICIT ASSUMPTIONS
      ------------------------------------------------------ */

      assumptions: {

        retirementDateTreatedAsEffectiveDate:
          true,

        retirementRankAppliedAcrossHigh36:
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
    16. SAFE WRAPPER
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
    17. PUBLIC API

    retirementcalculator.js will call:

      window.THEWING_RETIREMENT_PROJECTION
        .buildHigh36Projection(...)
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


      /* ------------------------------------------------------
        ASSUMPTION TABLES
      ------------------------------------------------------ */

      historicalPayRaises:
        Object.freeze({
          ...HISTORICAL_PAY_RAISES
        }),

      forecastPayRaises:
        Object.freeze({
          ...FORECAST_PAY_RAISES
        }),


      /* ------------------------------------------------------
        HELPERS
      ------------------------------------------------------ */

      normalizeRank,

      parseDateInput,

      completedServiceMonths,

      serviceYearsFromMonths,

      getAnnualRaisePercent,

      getBasicPay2026,

      getBasicPayForYear,


      /* ------------------------------------------------------
        MAIN
      ------------------------------------------------------ */

      buildHigh36Projection,

      safeBuildHigh36Projection

    });

})();
