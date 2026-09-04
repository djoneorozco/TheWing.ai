/* ============================================================
  THEWING.AI • VA DISABILITY RATING CALCULATOR
  disability.js
  v1.1.0

  PURPOSE
  -------------------------------------------------------------
  - Calculate VA combined ratings under 38 CFR § 4.25
  - Render the new segmented whole-person graph
  - Estimate standard monthly VA disability compensation
  - Expose live calculator state for Ask Amy

  IMPORTANT
  -------------------------------------------------------------
  - No 38 CFR § 4.26 bilateral-factor calculation
  - No SMC, spouse A&A, DIC, retirement pay, or offset logic
  - 0% conditions do not increase the combined value
  - Intermediate values are carried forward as whole numbers
  - Final nearest-10 rounding happens only after all ratings combine
============================================================ */

(function () {
  "use strict";

  const ROOT = document.getElementById("thewing-disability-calculator");

  if (
    !ROOT ||
    ROOT.dataset.runtimeBound === "true"
  ) {
    return;
  }

  ROOT.dataset.runtimeBound = "true";

  const $ = (selector) =>
    ROOT.querySelector(selector);

  const $$ = (selector) =>
    Array.from(
      ROOT.querySelectorAll(selector)
    );


  /* ============================================================
    1. CONFIGURATION
  ============================================================ */

  const DISABILITY_RUNTIME_VERSION =
    "disability-2026.2";

  const COMBINED_RATING_RULE_VERSION =
    "38-cfr-4.25";

  const VA_RATE_VERSION =
    "official-va-2026.2";

  const MAX_DISABILITIES =
    20;

  const GRAPH_COLOR_COUNT =
    8;

  const VALID_RATINGS =
    Object.freeze([
      0,
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100
    ]);

  const SUPPORTED_COMPENSATION_RATINGS =
    Object.freeze([
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100
    ]);


  /* ============================================================
    2. DOM REFERENCES
  ============================================================ */

  const els = {

    /* OVERVIEW */

    scoreRing:
      $("#dcScoreRing"),

    officialRating:
      $("#dcOfficialRating"),

    combinedValue:
      $("#dcCombinedValue"),

    monthlyCompensation:
      $("#dcMonthlyCompensation"),

    highestRating:
      $("#dcHighestRating"),

    combinedValueSummary:
      $("#dcCombinedValueSummary"),

    officialRatingSummary:
      $("#dcOfficialRatingSummary"),


    /* DISABILITY INPUTS */

    disabilityList:
      $("#dcDisabilityList"),

    addDisabilityButton:
      $("#dcAddDisabilityButton"),


    /* NEW GRAPH */

    ratingBuildGraph:
      $("#dcRatingBuildGraph"),

    graphCombinedValue:
      $("#dcGraphCombinedValue"),

    contributionTrack:
      $("#dcContributionTrack"),

    graphWholePersonLabel:
      $("#dcGraphWholePersonLabel"),

    graphRemaining:
      $("#dcGraphRemaining"),

    graphDisabilityRows:
      $("#dcGraphDisabilityRows"),

    buildCombinedFinal:
      $("#dcBuildCombinedFinal"),

    buildOfficialFinal:
      $("#dcBuildOfficialFinal"),


    /* DEPENDENTS */

    dependentProfile:
      $("#dcDependentProfile"),

    customDependents:
      $("#dcCustomDependents"),

    hasSpouse:
      $("#dcHasSpouse"),

    childrenUnder18:
      $("#dcChildrenUnder18"),

    childrenSchool:
      $("#dcChildrenSchool"),

    dependentParents:
      $("#dcDependentParents"),


    /* COMPENSATION */

    compensationAmount:
      $("#dcCompensationAmount"),

    compensationNote:
      $(".dc-compensation-note"),


    /* HUD / ACCESSIBILITY */

    amyHudSlot:
      $("#dcAmyHudSlot"),

    liveRegion:
      $("#dcLiveRegion")
  };


  /* ============================================================
    3. CURRENT VA COMPENSATION TABLES

    Browser mirror of official-va.js
    Rate version: official-va-2026.2
    Effective Dec. 1, 2025
  ============================================================ */

  const SOLO_10_20 =
    Object.freeze({

      10:
        180.42,

      20:
        356.66

    });


  const BASE_30_60_NO_CHILDREN =
    Object.freeze({

      alone: {
        30: 552.47,
        40: 795.84,
        50: 1132.90,
        60: 1435.02
      },

      spouse: {
        30: 617.47,
        40: 882.84,
        50: 1241.90,
        60: 1566.02
      },

      spouse_1_parent: {
        30: 669.47,
        40: 952.84,
        50: 1329.90,
        60: 1671.02
      },

      spouse_2_parents: {
        30: 721.47,
        40: 1022.84,
        50: 1417.90,
        60: 1776.02
      },

      one_parent: {
        30: 604.47,
        40: 865.84,
        50: 1220.90,
        60: 1540.02
      },

      two_parents: {
        30: 656.47,
        40: 935.84,
        50: 1308.90,
        60: 1645.02
      }

    });


  const BASE_30_60_WITH_CHILDREN =
    Object.freeze({

      child_only: {
        30: 596.47,
        40: 853.84,
        50: 1205.90,
        60: 1523.02
      },

      spouse_child: {
        30: 666.47,
        40: 947.84,
        50: 1322.90,
        60: 1663.02
      },

      spouse_child_1_parent: {
        30: 718.47,
        40: 1017.84,
        50: 1410.90,
        60: 1768.02
      },

      spouse_child_2_parents: {
        30: 770.47,
        40: 1087.84,
        50: 1498.90,
        60: 1873.02
      },

      child_1_parent: {
        30: 648.47,
        40: 923.84,
        50: 1293.90,
        60: 1628.02
      },

      child_2_parents: {
        30: 700.47,
        40: 993.84,
        50: 1381.90,
        60: 1733.02
      }

    });


  const ADDED_30_60 =
    Object.freeze({

      childUnder18: {
        30: 32.00,
        40: 43.00,
        50: 54.00,
        60: 65.00
      },

      childOver18School: {
        30: 105.00,
        40: 140.00,
        50: 176.00,
        60: 211.00
      }

    });


  const BASE_70_100_NO_CHILDREN =
    Object.freeze({

      alone: {
        70: 1808.45,
        80: 2102.15,
        90: 2362.30,
        100: 3938.58
      },

      spouse: {
        70: 1961.45,
        80: 2277.15,
        90: 2559.30,
        100: 4158.17
      },

      spouse_1_parent: {
        70: 2084.45,
        80: 2417.15,
        90: 2717.30,
        100: 4334.41
      },

      spouse_2_parents: {
        70: 2207.45,
        80: 2557.15,
        90: 2875.30,
        100: 4510.65
      },

      one_parent: {
        70: 1931.45,
        80: 2242.15,
        90: 2520.30,
        100: 4114.82
      },

      two_parents: {
        70: 2054.45,
        80: 2382.15,
        90: 2678.30,
        100: 4291.06
      }

    });


  const BASE_70_100_WITH_CHILDREN =
    Object.freeze({

      child_only: {
        70: 1910.45,
        80: 2219.15,
        90: 2494.30,
        100: 4085.43
      },

      spouse_child: {
        70: 2074.45,
        80: 2406.15,
        90: 2704.30,
        100: 4318.99
      },

      spouse_child_1_parent: {
        70: 2197.45,
        80: 2546.15,
        90: 2862.30,
        100: 4495.23
      },

      spouse_child_2_parents: {
        70: 2320.45,
        80: 2686.15,
        90: 3020.30,
        100: 4671.47
      },

      child_1_parent: {
        70: 2033.45,
        80: 2359.15,
        90: 2652.30,
        100: 4261.67
      },

      child_2_parents: {
        70: 2156.45,
        80: 2499.15,
        90: 2810.30,
        100: 4437.91
      }

    });


  const ADDED_70_100 =
    Object.freeze({

      childUnder18: {
        70: 76.00,
        80: 87.00,
        90: 98.00,
        100: 109.11
      },

      childOver18School: {
        70: 246.00,
        80: 281.00,
        90: 317.00,
        100: 352.45
      }

    });


  /* ============================================================
    4. HELPERS
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


  function money2(
    value
  ) {

    return "$" +
      (
        Number(value) ||
        0
      ).toLocaleString(
        undefined,
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


  function toNonNegativeInt(
    value,
    fallback = 0
  ) {

    const number =
      Number(value);

    return (
      Number.isFinite(number) &&
      number >= 0
    )
      ? Math.floor(number)
      : Number(
          fallback ||
          0
        );
  }


  function isValidRating(
    value
  ) {

    return VALID_RATINGS.includes(
      Number(value)
    );
  }


  /* ============================================================
    5. FINAL VA ROUNDING
  ============================================================ */

  function roundFinalVARating(
    combinedValue
  ) {

    const value =
      clamp(
        Math.round(
          Number(combinedValue) ||
          0
        ),
        0,
        100
      );

    if (
      value === 0
    ) {

      return 0;
    }

    return clamp(
      Math.floor(
        (
          value +
          5
        ) /
        10
      ) *
      10,
      0,
      100
    );
  }


  /* ============================================================
    6. COMBINE TWO RATINGS
  ============================================================ */

  function combineTwoRatings(
    currentCombined,
    nextRating
  ) {

    const current =
      clamp(
        Number(currentCombined) ||
        0,
        0,
        100
      );

    const rating =
      clamp(
        Number(nextRating) ||
        0,
        0,
        100
      );

    const remainingBefore =
      100 -
      current;

    const rawContribution =
      remainingBefore *
      (
        rating /
        100
      );

    const rawCombined =
      current +
      rawContribution;

    const combined =
      clamp(
        Math.round(
          rawCombined
        ),
        0,
        100
      );

    return {

      current,

      rating,

      remainingBefore,

      rawContribution,

      rawCombined,

      combined,

      contribution:
        combined -
        current,

      remainingAfter:
        100 -
        combined

    };
  }


  /* ============================================================
    7. COMPLETE 38 CFR § 4.25 CALCULATION

    sourceIndex preserves the current input-card identity so the
    graph can keep each Disability # tied to one color even after
    ratings are sorted highest-to-lowest for the VA calculation.
  ============================================================ */

  function calculateCombinedRating(
    inputRatings
  ) {

    const ratingEntries =
      (
        Array.isArray(
          inputRatings
        )
          ? inputRatings
          : []
      )

        .map(
          (
            value,
            index
          ) => ({
            rating:
              Number(value),

            sourceIndex:
              index + 1
          })
        )

        .filter(
          entry =>
            isValidRating(
              entry.rating
            ) &&
            entry.rating > 0
        )

        .sort(
          (
            a,
            b
          ) =>
            (
              b.rating -
              a.rating
            ) ||
            (
              a.sourceIndex -
              b.sourceIndex
            )
        );


    const ratings =
      ratingEntries.map(
        entry =>
          entry.rating
      );


    if (
      !ratingEntries.length
    ) {

      return {

        ratings:
          [],

        ratingEntries:
          [],

        highestRating:
          0,

        combinedValue:
          0,

        officialRating:
          0,

        remainingEfficiency:
          100,

        steps:
          []

      };
    }


    const steps =
      [];

    let combined =
      0;


    ratingEntries.forEach(
      (
        entry,
        index
      ) => {

        const rating =
          entry.rating;


        if (
          index === 0
        ) {

          combined =
            rating;

          steps.push({

            index:
              1,

            sourceIndex:
              entry.sourceIndex,

            rating,

            previousCombined:
              0,

            remainingBefore:
              100,

            rawContribution:
              rating,

            contribution:
              rating,

            rawCombined:
              rating,

            combined,

            remainingAfter:
              100 -
              combined

          });

          return;
        }


        const result =
          combineTwoRatings(
            combined,
            rating
          );


        combined =
          result.combined;


        steps.push({

          index:
            index + 1,

          sourceIndex:
            entry.sourceIndex,

          rating,

          previousCombined:
            result.current,

          remainingBefore:
            result.remainingBefore,

          rawContribution:
            result.rawContribution,

          contribution:
            result.contribution,

          rawCombined:
            result.rawCombined,

          combined:
            result.combined,

          remainingAfter:
            result.remainingAfter

        });

      }
    );


    return {

      ratings,

      ratingEntries:
        ratingEntries.map(
          entry => ({
            ...entry
          })
        ),

      highestRating:
        ratings[0] ||
        0,

      combinedValue:
        combined,

      officialRating:
        roundFinalVARating(
          combined
        ),

      remainingEfficiency:
        100 -
        combined,

      steps

    };
  }


  /* ============================================================
    8. READ RATINGS
  ============================================================ */

  function getRatingSelects() {

    return $$(
      "[data-disability-rating]"
    );
  }


  function readRatings() {

    return getRatingSelects()
      .map(
        select => {

          const rating =
            Number(
              select.value
            );

          return isValidRating(
            rating
          )
            ? rating
            : 0;
        }
      );
  }


  /* ============================================================
    9. DEPENDENT PROFILE
  ============================================================ */

  function getDependentProfileLabel(
    value
  ) {

    const labels = {

      "veteran-only":
        "Veteran Only",

      "veteran-spouse":
        "Veteran + Spouse",

      "veteran-child":
        "Veteran + Child",

      "veteran-spouse-child":
        "Veteran + Spouse + Child",

      "custom":
        "Custom Dependents"

    };

    return (
      labels[value] ||
      "Veteran Only"
    );
  }


  function readDependents() {

    const profile =
      String(
        els.dependentProfile
          ? els.dependentProfile.value
          : "veteran-only"
      );


    const profileLabel =
      getDependentProfileLabel(
        profile
      );


    if (
      profile ===
      "veteran-spouse"
    ) {

      return {

        profile,

        profileLabel,

        spouse:
          true,

        childrenUnder18:
          0,

        childrenInSchoolOver18:
          0,

        dependentParents:
          0

      };
    }


    if (
      profile ===
      "veteran-child"
    ) {

      return {

        profile,

        profileLabel,

        spouse:
          false,

        childrenUnder18:
          1,

        childrenInSchoolOver18:
          0,

        dependentParents:
          0

      };
    }


    if (
      profile ===
      "veteran-spouse-child"
    ) {

      return {

        profile,

        profileLabel,

        spouse:
          true,

        childrenUnder18:
          1,

        childrenInSchoolOver18:
          0,

        dependentParents:
          0

      };
    }


    if (
      profile ===
      "custom"
    ) {

      return {

        profile,

        profileLabel,

        spouse:
          Boolean(
            els.hasSpouse &&
            els.hasSpouse.checked
          ),

        childrenUnder18:
          toNonNegativeInt(
            els.childrenUnder18
              ? els.childrenUnder18.value
              : 0
          ),

        childrenInSchoolOver18:
          toNonNegativeInt(
            els.childrenSchool
              ? els.childrenSchool.value
              : 0
          ),

        dependentParents:
          clamp(
            toNonNegativeInt(
              els.dependentParents
                ? els.dependentParents.value
                : 0
            ),
            0,
            2
          )

      };
    }


    return {

      profile:
        "veteran-only",

      profileLabel:
        "Veteran Only",

      spouse:
        false,

      childrenUnder18:
        0,

      childrenInSchoolOver18:
        0,

      dependentParents:
        0

    };
  }


  /* ============================================================
    10. COMPENSATION HELPERS
  ============================================================ */

  function getRateBand(
    rating
  ) {

    const value =
      Number(
        rating
      );

    if (
      value === 10 ||
      value === 20
    ) {

      return "10_20";
    }


    if (
      [
        30,
        40,
        50,
        60
      ].includes(
        value
      )
    ) {

      return "30_60";
    }


    if (
      [
        70,
        80,
        90,
        100
      ].includes(
        value
      )
    ) {

      return "70_100";
    }


    return null;
  }


  function pickBaseKey(
    spouse,
    parents,
    hasAnyChildren
  ) {

    if (
      !hasAnyChildren
    ) {

      if (
        spouse &&
        parents === 0
      ) {
        return "spouse";
      }

      if (
        spouse &&
        parents === 1
      ) {
        return "spouse_1_parent";
      }

      if (
        spouse &&
        parents === 2
      ) {
        return "spouse_2_parents";
      }

      if (
        !spouse &&
        parents === 0
      ) {
        return "alone";
      }

      if (
        !spouse &&
        parents === 1
      ) {
        return "one_parent";
      }

      if (
        !spouse &&
        parents === 2
      ) {
        return "two_parents";
      }
    }


    if (
      hasAnyChildren
    ) {

      if (
        spouse &&
        parents === 0
      ) {
        return "spouse_child";
      }

      if (
        spouse &&
        parents === 1
      ) {
        return "spouse_child_1_parent";
      }

      if (
        spouse &&
        parents === 2
      ) {
        return "spouse_child_2_parents";
      }

      if (
        !spouse &&
        parents === 0
      ) {
        return "child_only";
      }

      if (
        !spouse &&
        parents === 1
      ) {
        return "child_1_parent";
      }

      if (
        !spouse &&
        parents === 2
      ) {
        return "child_2_parents";
      }
    }


    return null;
  }


  function getBaseRateTable(
    rating,
    hasAnyChildren
  ) {

    const band =
      getRateBand(
        rating
      );


    if (
      band ===
      "30_60"
    ) {

      return hasAnyChildren
        ? BASE_30_60_WITH_CHILDREN
        : BASE_30_60_NO_CHILDREN;
    }


    if (
      band ===
      "70_100"
    ) {

      return hasAnyChildren
        ? BASE_70_100_WITH_CHILDREN
        : BASE_70_100_NO_CHILDREN;
    }


    return null;
  }


  function getAddedAmountsTable(
    rating
  ) {

    const band =
      getRateBand(
        rating
      );


    if (
      band ===
      "30_60"
    ) {

      return ADDED_30_60;
    }


    if (
      band ===
      "70_100"
    ) {

      return ADDED_70_100;
    }


    return null;
  }


  /* ============================================================
    11. VA COMPENSATION
  ============================================================ */

  function getVACompensation(
    input = {}
  ) {

    const rating =
      Number(
        input.rating
      );


    if (
      rating === 0
    ) {

      return {

        ok:
          true,

        rating:
          0,

        monthlyVA:
          0,

        baseMonthlyVA:
          0,

        addedChildrenUnder18:
          0,

        addedChildrenInSchoolOver18:
          0,

        dependentStatusKey:
          "none",

        rateVersion:
          VA_RATE_VERSION

      };
    }


    if (
      !SUPPORTED_COMPENSATION_RATINGS.includes(
        rating
      )
    ) {

      return {

        ok:
          false,

        error:
          "Unsupported VA compensation rating.",

        rating,

        monthlyVA:
          0,

        rateVersion:
          VA_RATE_VERSION

      };
    }


    const spouse =
      Boolean(
        input.spouse
      );


    const dependentParents =
      clamp(
        toNonNegativeInt(
          input.dependentParents
        ),
        0,
        2
      );


    const childrenUnder18 =
      toNonNegativeInt(
        input.childrenUnder18
      );


    const childrenInSchoolOver18 =
      toNonNegativeInt(
        input.childrenInSchoolOver18
      );


    if (
      rating === 10 ||
      rating === 20
    ) {

      return {

        ok:
          true,

        rating,

        spouse,

        dependentParents,

        childrenUnder18,

        childrenInSchoolOver18,

        monthlyVA:
          SOLO_10_20[
            rating
          ],

        baseMonthlyVA:
          SOLO_10_20[
            rating
          ],

        addedChildrenUnder18:
          0,

        addedChildrenInSchoolOver18:
          0,

        dependentStatusKey:
          "solo_10_20",

        rateVersion:
          VA_RATE_VERSION

      };
    }


    const hasAnyChildren =
      (
        childrenUnder18 +
        childrenInSchoolOver18
      ) >
      0;


    const baseKey =
      pickBaseKey(
        spouse,
        dependentParents,
        hasAnyChildren
      );


    const baseTable =
      getBaseRateTable(
        rating,
        hasAnyChildren
      );


    if (
      !baseKey ||
      !baseTable ||
      !baseTable[
        baseKey
      ]
    ) {

      return {

        ok:
          false,

        error:
          "Unable to determine VA dependent status.",

        rating,

        monthlyVA:
          0,

        rateVersion:
          VA_RATE_VERSION

      };
    }


    const baseMonthlyVA =
      Number(
        baseTable[
          baseKey
        ][
          rating
        ]
      );


    if (
      !Number.isFinite(
        baseMonthlyVA
      )
    ) {

      return {

        ok:
          false,

        error:
          "VA compensation rate not found.",

        rating,

        monthlyVA:
          0,

        rateVersion:
          VA_RATE_VERSION

      };
    }


    let addedChildrenUnder18 =
      0;


    let addedChildrenInSchoolOver18 =
      0;


    const addedTable =
      getAddedAmountsTable(
        rating
      );


    if (
      hasAnyChildren &&
      addedTable
    ) {

      const extraUnder18Count =
        Math.max(
          0,
          childrenUnder18 -
          1
        );


      const schoolCount =
        childrenInSchoolOver18;


      addedChildrenUnder18 =
        extraUnder18Count *
        Number(
          addedTable
            .childUnder18[
              rating
            ] ||
          0
        );


      addedChildrenInSchoolOver18 =
        schoolCount *
        Number(
          addedTable
            .childOver18School[
              rating
            ] ||
          0
        );
    }


    return {

      ok:
        true,

      rating,

      spouse,

      dependentParents,

      childrenUnder18,

      childrenInSchoolOver18,

      monthlyVA:
        round2(
          baseMonthlyVA +
          addedChildrenUnder18 +
          addedChildrenInSchoolOver18
        ),

      baseMonthlyVA:
        round2(
          baseMonthlyVA
        ),

      addedChildrenUnder18:
        round2(
          addedChildrenUnder18
        ),

      addedChildrenInSchoolOver18:
        round2(
          addedChildrenInSchoolOver18
        ),

      dependentStatusKey:
        baseKey,

      rateVersion:
        VA_RATE_VERSION

    };
  }


  /* ============================================================
    12. DEPENDENT VISIBILITY
  ============================================================ */

  function updateCustomDependentVisibility() {

    if (
      !els.dependentProfile ||
      !els.customDependents
    ) {

      return;
    }


    els.customDependents.hidden =
      els.dependentProfile.value !==
      "custom";
  }


  /* ============================================================
    13. OVERVIEW RENDERING
  ============================================================ */

  function renderOverview(
    result,
    compensation
  ) {

    const combined =
      Number(
        result.combinedValue ||
        0
      );


    const official =
      Number(
        result.officialRating ||
        0
      );


    const highest =
      Number(
        result.highestRating ||
        0
      );


    const monthly =
      Number(
        compensation.monthlyVA ||
        0
      );


    if (
      els.scoreRing
    ) {

      els.scoreRing.style.setProperty(
        "--rating-percent",
        String(
          clamp(
            official,
            0,
            100
          )
        )
      );
    }


    setText(
      els.officialRating,
      official +
      "%"
    );


    setText(
      els.combinedValue,
      combined +
      "%"
    );


    setText(
      els.monthlyCompensation,
      money2(
        monthly
      )
    );


    setText(
      els.highestRating,
      highest +
      "%"
    );


    setText(
      els.combinedValueSummary,
      combined +
      "%"
    );


    setText(
      els.officialRatingSummary,
      official +
      "%"
    );
  }


  /* ============================================================
    14. GRAPH HELPERS
  ============================================================ */

  function getGraphColorClass(
    sourceIndex
  ) {

    const safeIndex =
      Math.max(
        1,
        Number(
          sourceIndex
        ) ||
        1
      );


    const colorIndex =
      (
        (
          safeIndex -
          1
        ) %
        GRAPH_COLOR_COUNT
      ) +
      1;


    return (
      "dc-graph-color-" +
      colorIndex
    );
  }


  function createGraphSpan(
    className
  ) {

    const span =
      document.createElement(
        "span"
      );


    span.className =
      className;


    span.setAttribute(
      "aria-hidden",
      "true"
    );


    return span;
  }


  /* ============================================================
    15. MAIN CUMULATIVE CONTRIBUTION BAR

    Main-bar widths use actual whole-person contribution:

      50 / 50 / 20

      #1 contributes 50 points
      #2 contributes 25 points
      #3 contributes  5 points

      20 points remain

    The individual rows below still show 50%, 50%, and 20%.
  ============================================================ */

  function renderContributionTrack(
    result
  ) {

    if (
      !els.contributionTrack
    ) {

      return;
    }


    els.contributionTrack
      .replaceChildren();


    const steps =
      Array.isArray(
        result.steps
      )
        ? result.steps
        : [];


    steps.forEach(
      step => {

        const contribution =
          clamp(
            Number(
              step.contribution
            ) ||
            0,
            0,
            100
          );


        if (
          contribution <= 0
        ) {

          return;
        }


        const sourceIndex =
          step.sourceIndex ||
          step.index;


        const segment =
          createGraphSpan(
            "dc-contribution-segment " +
            getGraphColorClass(
              sourceIndex
            )
          );


        segment.style.width =
          contribution +
          "%";


        segment.dataset.contribution =
          String(
            contribution
          );


        segment.dataset.rating =
          String(
            step.rating
          );


        segment.dataset.disabilityIndex =
          String(
            sourceIndex
          );


        els.contributionTrack
          .appendChild(
            segment
          );
      }
    );


    const remaining =
      clamp(
        Number(
          result.remainingEfficiency
        ) ||
        0,
        0,
        100
      );


    const remainingSegment =
      createGraphSpan(
        "dc-contribution-remaining"
      );


    remainingSegment.style.width =
      remaining +
      "%";


    remainingSegment.dataset.contributionRemaining =
      "true";


    els.contributionTrack
      .appendChild(
        remainingSegment
      );


    els.contributionTrack.setAttribute(
      "aria-label",
      "Combined disability contribution bar showing " +
      result.combinedValue +
      "% combined disability and " +
      remaining +
      "% remaining efficiency."
    );
  }


  /* ============================================================
    16. INDIVIDUAL DISABILITY ROWS

    Individual row width = assigned rating.
    Main cumulative segment width = actual contribution.
  ============================================================ */

  function createDisabilityGraphRow(
    step
  ) {

    const sourceIndex =
      Number(
        step.sourceIndex ||
        step.index ||
        1
      );


    const rating =
      clamp(
        Number(
          step.rating
        ) ||
        0,
        0,
        100
      );


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "dc-disability-graph-row";


    row.dataset.graphDisabilityRow =
      String(
        sourceIndex
      );


    row.dataset.calculationStep =
      String(
        step.index ||
        1
      );


    const value =
      document.createElement(
        "div"
      );


    value.className =
      "dc-disability-graph-value";


    value.textContent =
      rating +
      "%";


    const main =
      document.createElement(
        "div"
      );


    main.className =
      "dc-disability-graph-main";


    const track =
      document.createElement(
        "div"
      );


    track.className =
      "dc-disability-graph-track";


    const fill =
      createGraphSpan(
        "dc-disability-graph-fill " +
        getGraphColorClass(
          sourceIndex
        )
      );


    fill.style.width =
      rating +
      "%";


    track.appendChild(
      fill
    );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "dc-disability-graph-meta";


    const label =
      document.createElement(
        "span"
      );


    label.className =
      "dc-disability-graph-label";


    label.textContent =
      "Disability #" +
      sourceIndex;


    meta.appendChild(
      label
    );


    main.append(
      track,
      meta
    );


    row.append(
      value,
      main
    );


    return row;
  }


  function createEmptyDisabilityGraphRow() {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "dc-disability-graph-row dc-disability-graph-row-empty";


    const value =
      document.createElement(
        "div"
      );


    value.className =
      "dc-disability-graph-value";


    value.textContent =
      "0%";


    const main =
      document.createElement(
        "div"
      );


    main.className =
      "dc-disability-graph-main";


    const track =
      document.createElement(
        "div"
      );


    track.className =
      "dc-disability-graph-track";


    const fill =
      createGraphSpan(
        "dc-disability-graph-fill dc-graph-color-1"
      );


    fill.style.width =
      "0%";


    track.appendChild(
      fill
    );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "dc-disability-graph-meta";


    const label =
      document.createElement(
        "span"
      );


    label.className =
      "dc-disability-graph-label";


    label.textContent =
      "No compensable disability rating entered";


    meta.appendChild(
      label
    );


    main.append(
      track,
      meta
    );


    row.append(
      value,
      main
    );


    return row;
  }


  function renderDisabilityRows(
    result
  ) {

    if (
      !els.graphDisabilityRows
    ) {

      return;
    }


    els.graphDisabilityRows
      .replaceChildren();


    const steps =
      Array.isArray(
        result.steps
      )
        ? result.steps
        : [];


    if (
      !steps.length
    ) {

      els.graphDisabilityRows
        .appendChild(
          createEmptyDisabilityGraphRow()
        );

      return;
    }


    steps.forEach(
      step => {

        els.graphDisabilityRows
          .appendChild(
            createDisabilityGraphRow(
              step
            )
          );
      }
    );
  }


  /* ============================================================
    17. GRAPH RENDERER
  ============================================================ */

  function renderBuildGraph(
    result
  ) {

    const combinedValue =
      clamp(
        Number(
          result.combinedValue
        ) ||
        0,
        0,
        100
      );


    const officialRating =
      clamp(
        Number(
          result.officialRating
        ) ||
        0,
        0,
        100
      );


    const remaining =
      clamp(
        Number.isFinite(
          Number(
            result.remainingEfficiency
          )
        )
          ? Number(
              result.remainingEfficiency
            )
          : (
              100 -
              combinedValue
            ),
        0,
        100
      );


    setText(
      els.graphCombinedValue,
      combinedValue +
      "%"
    );


    setText(
      els.graphWholePersonLabel,
      "100% Whole Person"
    );


    setText(
      els.graphRemaining,
      remaining +
      "% Remaining"
    );


    renderContributionTrack({
      ...result,

      combinedValue,

      remainingEfficiency:
        remaining
    });


    renderDisabilityRows(
      result
    );


    setText(
      els.buildCombinedFinal,
      combinedValue +
      "%"
    );


    setText(
      els.buildOfficialFinal,
      officialRating +
      "%"
    );
  }


  /* ============================================================
    18. COMPENSATION RENDERING
  ============================================================ */

  function renderCompensation(
    result,
    compensation
  ) {

    const monthly =
      compensation.ok
        ? compensation.monthlyVA
        : 0;


    setText(
      els.compensationAmount,
      money2(
        monthly
      )
    );


    if (
      !els.compensationNote
    ) {

      return;
    }


    if (
      result.officialRating ===
      0
    ) {

      els.compensationNote.textContent =
        "Add a compensable disability rating to estimate monthly VA compensation.";

      return;
    }


    if (
      result.officialRating ===
        10 ||
      result.officialRating ===
        20
    ) {

      els.compensationNote.textContent =
        "At 10% and 20%, the standard VA compensation amount does not change based on dependent status.";

      return;
    }


    els.compensationNote.textContent =
      "Compensation is based on your estimated official VA rating and dependent profile. Dependent additions generally begin at a 30% VA disability rating.";
  }


  /* ============================================================
    19. ACCESSIBILITY ANNOUNCEMENT
  ============================================================ */

  let lastAnnouncement =
    "";


  function announce(
    result,
    compensation
  ) {

    if (
      !els.liveRegion
    ) {

      return;
    }


    const message =
      "Estimated VA rating " +
      result.officialRating +
      " percent. Combined value " +
      result.combinedValue +
      " percent. Estimated monthly compensation " +
      money2(
        compensation.monthlyVA ||
        0
      ) +
      ".";


    if (
      message ===
      lastAnnouncement
    ) {

      return;
    }


    lastAnnouncement =
      message;


    els.liveRegion.textContent =
      message;
  }


  /* ============================================================
    20. ASK AMY / PAGE EVENT
  ============================================================ */

  function emitDisabilityEvent(
    state
  ) {

    try {

      window.dispatchEvent(
        new CustomEvent(
          "thewing:disability-updated",
          {
            detail:
              state
          }
        )
      );

    } catch (_) {

      /* Fail open */

    }
  }


  /* ============================================================
    21. DYNAMIC DISABILITY INPUTS
  ============================================================ */

  function populateRatingOptions(
    select,
    selectedValue
  ) {

    VALID_RATINGS.forEach(
      rating => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          String(
            rating
          );


        option.textContent =
          rating +
          "%";


        if (
          rating ===
          selectedValue
        ) {

          option.selected =
            true;
        }


        select.appendChild(
          option
        );
      }
    );
  }


  function createDisabilityCard() {

    const card =
      document.createElement(
        "div"
      );


    card.className =
      "dc-rating-card";


    card.dataset.dynamicDisability =
      "true";


    const actions =
      document.createElement(
        "div"
      );


    actions.className =
      "dc-rating-card-actions";


    const remove =
      document.createElement(
        "button"
      );


    remove.type =
      "button";


    remove.className =
      "dc-remove-disability-button";


    remove.dataset.removeDisability =
      "true";


    remove.setAttribute(
      "aria-label",
      "Remove disability"
    );


    remove.textContent =
      "×";


    actions.appendChild(
      remove
    );


    const label =
      document.createElement(
        "label"
      );


    label.className =
      "dc-rating-label";


    const shell =
      document.createElement(
        "div"
      );


    shell.className =
      "dc-select-shell";


    const select =
      document.createElement(
        "select"
      );


    select.className =
      "dc-rating-select";


    select.name =
      "disability";


    select.dataset.disabilityRating =
      "";


    populateRatingOptions(
      select,
      0
    );


    const chevron =
      document.createElement(
        "span"
      );


    chevron.className =
      "dc-chevron";


    chevron.setAttribute(
      "aria-hidden",
      "true"
    );


    shell.append(
      select,
      chevron
    );


    card.append(
      actions,
      label,
      shell
    );


    return card;
  }


  function renumberDisabilityCards() {

    $$(
      ".dc-rating-card"
    ).forEach(
      (
        card,
        index
      ) => {

        const number =
          index +
          1;


        const label =
          card.querySelector(
            ".dc-rating-label"
          );


        const select =
          card.querySelector(
            "[data-disability-rating]"
          );


        if (
          !select
        ) {

          return;
        }


        const id =
          "dcDisability" +
          number;


        card.dataset.disabilityRow =
          String(
            number
          );


        select.id =
          id;


        select.name =
          "disability" +
          number;


        select.setAttribute(
          "aria-label",
          "Disability " +
          number +
          " rating"
        );


        if (
          label
        ) {

          label.htmlFor =
            id;


          label.textContent =
            "Disability " +
            number;
        }
      }
    );


    updateAddButtonState();
  }


  function updateAddButtonState() {

    if (
      !els.addDisabilityButton
    ) {

      return;
    }


    const atMaximum =
      getRatingSelects()
        .length >=
      MAX_DISABILITIES;


    els.addDisabilityButton.disabled =
      atMaximum;


    els.addDisabilityButton.setAttribute(
      "aria-label",
      atMaximum
        ? "Maximum number of disabilities reached"
        : "Add another disability"
    );
  }


  function addDisability() {

    if (
      !els.disabilityList ||
      !els.addDisabilityButton
    ) {

      return;
    }


    if (
      getRatingSelects()
        .length >=
      MAX_DISABILITIES
    ) {

      return;
    }


    const card =
      createDisabilityCard();


    els.disabilityList.insertBefore(
      card,
      els.addDisabilityButton
    );


    renumberDisabilityCards();


    const select =
      card.querySelector(
        "[data-disability-rating]"
      );


    if (
      select
    ) {

      select.focus();
    }


    run();
  }


  function removeDisability(
    button
  ) {

    const card =
      button.closest(
        ".dc-rating-card"
      );


    if (
      !card
    ) {

      return;
    }


    card.remove();


    renumberDisabilityCards();


    run();
  }


  /* ============================================================
    22. CALCULATOR STATE
  ============================================================ */

  let currentState =
    null;


  function buildState() {

    const ratings =
      readRatings();


    const result =
      calculateCombinedRating(
        ratings
      );


    const dependents =
      readDependents();


    const compensation =
      getVACompensation({

        rating:
          result.officialRating,

        spouse:
          dependents.spouse,

        dependentParents:
          dependents.dependentParents,

        childrenUnder18:
          dependents.childrenUnder18,

        childrenInSchoolOver18:
          dependents.childrenInSchoolOver18

      });


    return {

      runtimeVersion:
        DISABILITY_RUNTIME_VERSION,

      ruleVersion:
        COMBINED_RATING_RULE_VERSION,

      rateVersion:
        VA_RATE_VERSION,


      ratingsEntered:
        ratings.slice(),


      ratingsSorted:
        result.ratings.slice(),


      ratingEntries:
        result.ratingEntries.map(
          entry => ({
            ...entry
          })
        ),


      highestRating:
        result.highestRating,


      combinedValue:
        result.combinedValue,


      officialRating:
        result.officialRating,


      remainingEfficiency:
        result.remainingEfficiency,


      steps:
        result.steps.map(
          step => ({
            ...step
          })
        ),


      dependents:
        {
          ...dependents
        },


      compensation:
        {
          ...compensation
        }

    };
  }


  /* ============================================================
    23. MAIN RUN
  ============================================================ */

  function run() {

    updateCustomDependentVisibility();


    const state =
      buildState();


    currentState =
      state;


    const result = {

      ratings:
        state.ratingsSorted,

      highestRating:
        state.highestRating,

      combinedValue:
        state.combinedValue,

      officialRating:
        state.officialRating,

      remainingEfficiency:
        state.remainingEfficiency,

      steps:
        state.steps

    };


    renderOverview(
      result,
      state.compensation
    );


    renderBuildGraph(
      result
    );


    renderCompensation(
      result,
      state.compensation
    );


    ROOT.dataset.combinedValue =
      String(
        state.combinedValue
      );


    ROOT.dataset.officialRating =
      String(
        state.officialRating
      );


    ROOT.dataset.highestRating =
      String(
        state.highestRating
      );


    ROOT.dataset.rateVersion =
      VA_RATE_VERSION;


    ROOT.dataset.ready =
      "true";


    announce(
      result,
      state.compensation
    );


    emitDisabilityEvent(
      state
    );


    return state;
  }


  /* ============================================================
    24. EVENT BINDING
  ============================================================ */

  if (
    els.disabilityList
  ) {

    els.disabilityList.addEventListener(
      "change",
      event => {

        if (
          event.target.matches(
            "[data-disability-rating]"
          )
        ) {

          run();
        }
      }
    );


    els.disabilityList.addEventListener(
      "click",
      event => {

        const removeButton =
          event.target.closest(
            "[data-remove-disability]"
          );


        if (
          removeButton
        ) {

          removeDisability(
            removeButton
          );
        }
      }
    );
  }


  if (
    els.addDisabilityButton
  ) {

    els.addDisabilityButton.addEventListener(
      "click",
      addDisability
    );
  }


  if (
    els.dependentProfile
  ) {

    els.dependentProfile.addEventListener(
      "change",
      () => {

        updateCustomDependentVisibility();

        run();
      }
    );
  }


  [
    els.hasSpouse,
    els.childrenUnder18,
    els.childrenSchool,
    els.dependentParents

  ].forEach(
    element => {

      if (
        !element
      ) {

        return;
      }


      element.addEventListener(
        "change",
        run
      );


      if (
        element.type ===
        "number"
      ) {

        element.addEventListener(
          "input",
          run
        );
      }
    }
  );


  /* ============================================================
    25. PUBLIC API
  ============================================================ */

  window.THEWING_DISABILITY =
    Object.freeze({

      version:
        DISABILITY_RUNTIME_VERSION,

      ruleVersion:
        COMBINED_RATING_RULE_VERSION,

      rateVersion:
        VA_RATE_VERSION,

      run,

      calculateCombinedRating,

      combineTwoRatings,

      roundFinalVARating,

      getVACompensation,

      readRatings,

      readDependents,


      getState() {

        if (
          !currentState
        ) {

          return null;
        }


        return JSON.parse(
          JSON.stringify(
            currentState
          )
        );
      }

    });


  /* ============================================================
    26. INITIALIZE
  ============================================================ */

  function initialize() {

    renumberDisabilityCards();

    updateCustomDependentVisibility();

    updateAddButtonState();

    run();
  }


  initialize();

})();
