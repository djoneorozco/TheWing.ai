/* ============================================================
  THEWING.AI • VA DISABILITY RATING CALCULATOR
  disability.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  1. Read individual VA disability ratings
  2. Sort ratings from highest to lowest
  3. Combine ratings using the VA "whole person" method
  4. Preserve intermediate combined values
  5. Perform final VA rounding only after all ratings combine
  6. Render the simple "How Your VA Rating Builds" graph
  7. Estimate standard monthly VA disability compensation
  8. Expose clean state for future Ask Amy HUD integration

  SOURCE / RULE BASIS
  -------------------------------------------------------------
  - Combined rating:
      38 CFR § 4.25

  - Compensation:
      Browser-side mirror of:
      netlify/functions/_share/official-va.js
      RATE_VERSION = official-va-2026.2

  IMPORTANT
  -------------------------------------------------------------
  - This calculator does NOT implement 38 CFR § 4.26 bilateral factor
  - This calculator does NOT implement SMC
  - This calculator does NOT implement spouse A&A
  - This calculator does NOT implement DIC
  - This calculator does NOT calculate retirement pay
  - 0% disabilities do not change the combined rating
  - Intermediate combined values are NOT rounded to nearest 10
  - Final nearest-10 rounding occurs only once, at the end

  FUTURE BACKEND MIGRATION
  -------------------------------------------------------------
  When TheWing.ai exposes a dedicated public VA compensation route,
  the getVACompensation() function can be replaced by that API call
  without changing the calculator UI or §4.25 rating engine.
============================================================ */


(function () {

  "use strict";


  /* ============================================================
    1. ROOT
  ============================================================ */

  const ROOT =
    document.getElementById(
      "thewing-disability-calculator"
    );


  if (!ROOT) {
    return;
  }


  if (
    ROOT.dataset.runtimeBound === "true"
  ) {
    return;
  }


  ROOT.dataset.runtimeBound =
    "true";


  const $ = function (selector) {

    return ROOT.querySelector(
      selector
    );
  };


  const $$ = function (selector) {

    return Array.from(
      ROOT.querySelectorAll(
        selector
      )
    );
  };



  /* ============================================================
    2. VERSION / CONFIGURATION
  ============================================================ */

  const DISABILITY_RUNTIME_VERSION =
    "disability-2026.1";


  const COMBINED_RATING_RULE_VERSION =
    "38-cfr-4.25";


  const VA_RATE_VERSION =
    "official-va-2026.2";


  const MAX_DISABILITIES =
    20;


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
    3. DOM REFERENCES
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


    /* GRAPH */

    ratingBuildGraph:
      $("#dcRatingBuildGraph"),

    additionalBuildSteps:
      $("#dcAdditionalBuildSteps"),

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
    4. CURRENT VA COMPENSATION TABLES

    Browser mirror of official-va.js
    Rate version: official-va-2026.2

    Rates effective Dec. 1, 2025.
  ============================================================ */


  /* ============================================================
    4A. 10% / 20%
  ============================================================ */

  const SOLO_10_20 =
    Object.freeze({

      10:
        180.42,

      20:
        356.66

    });



  /* ============================================================
    4B. 30%–60% — NO CHILDREN
  ============================================================ */

  const BASE_30_60_NO_CHILDREN =
    Object.freeze({

      alone: {

        30:
          552.47,

        40:
          795.84,

        50:
          1132.90,

        60:
          1435.02
      },


      spouse: {

        30:
          617.47,

        40:
          882.84,

        50:
          1241.90,

        60:
          1566.02
      },


      spouse_1_parent: {

        30:
          669.47,

        40:
          952.84,

        50:
          1329.90,

        60:
          1671.02
      },


      spouse_2_parents: {

        30:
          721.47,

        40:
          1022.84,

        50:
          1417.90,

        60:
          1776.02
      },


      one_parent: {

        30:
          604.47,

        40:
          865.84,

        50:
          1220.90,

        60:
          1540.02
      },


      two_parents: {

        30:
          656.47,

        40:
          935.84,

        50:
          1308.90,

        60:
          1645.02
      }

    });



  /* ============================================================
    4C. 30%–60% — WITH CHILDREN
  ============================================================ */

  const BASE_30_60_WITH_CHILDREN =
    Object.freeze({

      child_only: {

        30:
          596.47,

        40:
          853.84,

        50:
          1205.90,

        60:
          1523.02
      },


      spouse_child: {

        30:
          666.47,

        40:
          947.84,

        50:
          1322.90,

        60:
          1663.02
      },


      spouse_child_1_parent: {

        30:
          718.47,

        40:
          1017.84,

        50:
          1410.90,

        60:
          1768.02
      },


      spouse_child_2_parents: {

        30:
          770.47,

        40:
          1087.84,

        50:
          1498.90,

        60:
          1873.02
      },


      child_1_parent: {

        30:
          648.47,

        40:
          923.84,

        50:
          1293.90,

        60:
          1628.02
      },


      child_2_parents: {

        30:
          700.47,

        40:
          993.84,

        50:
          1381.90,

        60:
          1733.02
      }

    });



  /* ============================================================
    4D. 30%–60% — ADDITIONAL CHILDREN
  ============================================================ */

  const ADDED_30_60 =
    Object.freeze({

      childUnder18: {

        30:
          32.00,

        40:
          43.00,

        50:
          54.00,

        60:
          65.00
      },


      childOver18School: {

        30:
          105.00,

        40:
          140.00,

        50:
          176.00,

        60:
          211.00
      }

    });



  /* ============================================================
    4E. 70%–100% — NO CHILDREN
  ============================================================ */

  const BASE_70_100_NO_CHILDREN =
    Object.freeze({

      alone: {

        70:
          1808.45,

        80:
          2102.15,

        90:
          2362.30,

        100:
          3938.58
      },


      spouse: {

        70:
          1961.45,

        80:
          2277.15,

        90:
          2559.30,

        100:
          4158.17
      },


      spouse_1_parent: {

        70:
          2084.45,

        80:
          2417.15,

        90:
          2717.30,

        100:
          4334.41
      },


      spouse_2_parents: {

        70:
          2207.45,

        80:
          2557.15,

        90:
          2875.30,

        100:
          4510.65
      },


      one_parent: {

        70:
          1931.45,

        80:
          2242.15,

        90:
          2520.30,

        100:
          4114.82
      },


      two_parents: {

        70:
          2054.45,

        80:
          2382.15,

        90:
          2678.30,

        100:
          4291.06
      }

    });



  /* ============================================================
    4F. 70%–100% — WITH CHILDREN
  ============================================================ */

  const BASE_70_100_WITH_CHILDREN =
    Object.freeze({

      child_only: {

        70:
          1910.45,

        80:
          2219.15,

        90:
          2494.30,

        100:
          4085.43
      },


      spouse_child: {

        70:
          2074.45,

        80:
          2406.15,

        90:
          2704.30,

        100:
          4318.99
      },


      spouse_child_1_parent: {

        70:
          2197.45,

        80:
          2546.15,

        90:
          2862.30,

        100:
          4495.23
      },


      spouse_child_2_parents: {

        70:
          2320.45,

        80:
          2686.15,

        90:
          3020.30,

        100:
          4671.47
      },


      child_1_parent: {

        70:
          2033.45,

        80:
          2359.15,

        90:
          2652.30,

        100:
          4261.67
      },


      child_2_parents: {

        70:
          2156.45,

        80:
          2499.15,

        90:
          2810.30,

        100:
          4437.91
      }

    });



  /* ============================================================
    4G. 70%–100% — ADDITIONAL CHILDREN
  ============================================================ */

  const ADDED_70_100 =
    Object.freeze({

      childUnder18: {

        70:
          76.00,

        80:
          87.00,

        90:
          98.00,

        100:
          109.11
      },


      childOver18School: {

        70:
          246.00,

        80:
          281.00,

        90:
          317.00,

        100:
          352.45
      }

    });



  /* ============================================================
    5. BASIC HELPERS
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
        Number(value) || 0
      ).toFixed(2)
    );
  }


  function money2(
    value
  ) {

    const n =
      Number(value) || 0;


    return "$" +
      n.toLocaleString(
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
    fallback
  ) {

    const n =
      Number(value);


    if (
      !Number.isFinite(n) ||
      n < 0
    ) {

      return Number(
        fallback || 0
      );
    }


    return Math.floor(
      n
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
    6. FINAL VA ROUNDING

    38 CFR § 4.25:
    - final value converts to nearest degree divisible by 10
    - values ending in 5 round upward
    - this happens only after all disabilities are combined
  ============================================================ */

  function roundFinalVARating(
    combinedValue
  ) {

    const n =
      clamp(
        Math.round(
          Number(combinedValue) || 0
        ),
        0,
        100
      );


    if (n === 0) {
      return 0;
    }


    return clamp(

      Math.floor(
        (
          n + 5
        ) / 10
      ) * 10,

      0,
      100
    );
  }



  /* ============================================================
    7. COMBINE TWO RATINGS

    WHOLE PERSON CONCEPT

    Example:
    60% rating

    Remaining efficiency:
    100 - 60 = 40

    Add a 40% rating:
    40% of remaining 40 = 16

    60 + 16 = 76

    Result:
    76% combined value

    IMPORTANT:
    The whole-number intermediate result continues forward.
    It is NOT rounded to nearest 10 here.
  ============================================================ */

  function combineTwoRatings(
    currentCombined,
    nextRating
  ) {

    const current =
      clamp(
        Number(currentCombined) || 0,
        0,
        100
      );


    const rating =
      clamp(
        Number(nextRating) || 0,
        0,
        100
      );


    const remainingBefore =
      100 - current;


    const rawContribution =
      remainingBefore *
      (
        rating / 100
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
        combined - current,

      remainingAfter:
        100 - combined
    };
  }



  /* ============================================================
    8. COMPLETE 38 CFR § 4.25 CALCULATION
  ============================================================ */

  function calculateCombinedRating(
    inputRatings
  ) {

    const ratings =
      (
        Array.isArray(
          inputRatings
        )
          ? inputRatings
          : []
      )

        .map(function (
          value
        ) {

          return Number(
            value
          );
        })

        .filter(function (
          value
        ) {

          return (
            isValidRating(
              value
            ) &&
            value > 0
          );
        })

        .sort(function (
          a,
          b
        ) {

          return b - a;
        });


    if (
      ratings.length === 0
    ) {

      return {

        ratings:
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


    ratings.forEach(function (
      rating,
      index
    ) {

      if (
        index === 0
      ) {

        combined =
          rating;


        steps.push({

          index:
            1,

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
            100 - combined

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

    });


    const officialRating =
      roundFinalVARating(
        combined
      );


    return {

      ratings,

      highestRating:
        ratings[0] || 0,

      combinedValue:
        combined,

      officialRating,

      remainingEfficiency:
        100 - combined,

      steps
    };
  }



  /* ============================================================
    9. READ DISABILITY RATINGS
  ============================================================ */

  function getRatingSelects() {

    return $$(
      "[data-disability-rating]"
    );
  }


  function readRatings() {

    return getRatingSelects()
      .map(function (
        select
      ) {

        const rating =
          Number(
            select.value
          );


        return isValidRating(
          rating
        )
          ? rating
          : 0;
      });
  }



  /* ============================================================
    10. DEPENDENT PROFILE
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


    if (
      profile ===
      "veteran-spouse"
    ) {

      return {

        profile,

        profileLabel:
          getDependentProfileLabel(
            profile
          ),

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

        profileLabel:
          getDependentProfileLabel(
            profile
          ),

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

        profileLabel:
          getDependentProfileLabel(
            profile
          ),

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

        profileLabel:
          getDependentProfileLabel(
            profile
          ),

        spouse:
          Boolean(
            els.hasSpouse &&
            els.hasSpouse.checked
          ),

        childrenUnder18:
          toNonNegativeInt(
            els.childrenUnder18
              ? els.childrenUnder18.value
              : 0,
            0
          ),

        childrenInSchoolOver18:
          toNonNegativeInt(
            els.childrenSchool
              ? els.childrenSchool.value
              : 0,
            0
          ),

        dependentParents:
          clamp(
            toNonNegativeInt(
              els.dependentParents
                ? els.dependentParents.value
                : 0,
              0
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
    11. DEPENDENT TABLE HELPERS
  ============================================================ */

  function getRateBand(
    rating
  ) {

    const n =
      Number(
        rating
      );


    if (
      n === 10 ||
      n === 20
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
        n
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
        n
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
    12. VA COMPENSATION CALCULATION

    Mirrors current official-va.js behavior.
  ============================================================ */

  function getVACompensation(
    input
  ) {

    const rating =
      Number(
        input &&
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
          input.dependentParents,
          0
        ),
        0,
        2
      );


    const childrenUnder18 =
      toNonNegativeInt(
        input.childrenUnder18,
        0
      );


    const childrenInSchoolOver18 =
      toNonNegativeInt(
        input.childrenInSchoolOver18,
        0
      );


    /*
      10% / 20%
      ----------------------------------------------------------
      Current official-va.js does not apply dependent additions
      at these ratings.
    */

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
      ) > 0;


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


    /*
      Current official-va.js behavior:

      - Base "with children" rate includes one child
      - Additional under-18 children are added after the first
      - School-age children are added separately
    */

    if (
      hasAnyChildren &&
      addedTable
    ) {

      const extraUnder18Count =
        Math.max(
          0,
          childrenUnder18 - 1
        );


      const schoolCount =
        childrenInSchoolOver18;


      addedChildrenUnder18 =
        extraUnder18Count *
        Number(
          addedTable
            .childUnder18[
              rating
            ] || 0
        );


      addedChildrenInSchoolOver18 =
        schoolCount *
        Number(
          addedTable
            .childOver18School[
              rating
            ] || 0
        );
    }


    const monthlyVA =
      round2(

        baseMonthlyVA +

        addedChildrenUnder18 +

        addedChildrenInSchoolOver18
      );


    return {

      ok:
        true,

      rating,

      spouse,

      dependentParents,

      childrenUnder18,

      childrenInSchoolOver18,

      monthlyVA,

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
    13. UPDATE CUSTOM DEPENDENT VISIBILITY
  ============================================================ */

  function updateCustomDependentVisibility() {

    if (
      !els.dependentProfile ||
      !els.customDependents
    ) {

      return;
    }


    const isCustom =
      els.dependentProfile.value ===
      "custom";


    els.customDependents.hidden =
      !isCustom;
  }



  /* ============================================================
    14. OVERVIEW RENDERING
  ============================================================ */

  function renderOverview(
    result,
    compensation
  ) {

    const combined =
      Number(
        result.combinedValue || 0
      );


    const official =
      Number(
        result.officialRating || 0
      );


    const highest =
      Number(
        result.highestRating || 0
      );


    const monthly =
      Number(
        compensation.monthlyVA || 0
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
      official + "%"
    );


    setText(
      els.combinedValue,
      combined + "%"
    );


    setText(
      els.monthlyCompensation,
      money2(
        monthly
      )
    );


    setText(
      els.highestRating,
      highest + "%"
    );


    setText(
      els.combinedValueSummary,
      combined + "%"
    );


    setText(
      els.officialRatingSummary,
      official + "%"
    );
  }



  /* ============================================================
    15. GRAPH — FIXED STEP RENDERER
  ============================================================ */

  function renderFixedBuildStep(
    stepNumber,
    step
  ) {

    const row =
      ROOT.querySelector(
        '[data-build-step="' +
        stepNumber +
        '"]'
      );


    if (!row) {
      return;
    }


    if (!step) {

      row.hidden =
        true;

      return;
    }


    row.hidden =
      false;


    const value =
      $(
        "#dcBuildValue" +
        stepNumber
      );


    const fill =
      $(
        "#dcBuildFill" +
        stepNumber
      );


    const added =
      $(
        "#dcBuildAdded" +
        stepNumber
      );


    const remaining =
      $(
        "#dcBuildRemaining" +
        stepNumber
      );


    setText(
      value,
      step.combined + "%"
    );


    if (fill) {

      fill.style.width =
        clamp(
          step.combined,
          0,
          100
        ) + "%";
    }


    if (
      stepNumber === 1
    ) {

      setText(
        added,
        "+" +
        step.rating +
        "% disability"
      );

    } else {

      setText(
        added,
        "+" +
        step.contribution +
        "% from your " +
        step.rating +
        "% rating"
      );
    }


    setText(
      remaining,
      step.remainingAfter +
      "% remaining"
    );
  }



  /* ============================================================
    16. GRAPH — DYNAMIC STEP CREATION
  ============================================================ */

  function createDynamicBuildStep(
    step
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "dc-build-row";


    row.dataset.buildStep =
      String(
        step.index
      );


    const value =
      document.createElement(
        "div"
      );


    value.className =
      "dc-build-value";


    value.textContent =
      step.combined +
      "%";


    const main =
      document.createElement(
        "div"
      );


    main.className =
      "dc-build-main";


    const track =
      document.createElement(
        "div"
      );


    track.className =
      "dc-build-track";


    const fill =
      document.createElement(
        "span"
      );


    fill.className =
      "dc-build-fill";


    fill.style.width =
      clamp(
        step.combined,
        0,
        100
      ) + "%";


    track.appendChild(
      fill
    );


    const meta =
      document.createElement(
        "div"
      );


    meta.className =
      "dc-build-meta";


    const added =
      document.createElement(
        "span"
      );


    added.textContent =
      "+" +
      step.contribution +
      "% from your " +
      step.rating +
      "% rating";


    const remaining =
      document.createElement(
        "span"
      );


    remaining.textContent =
      step.remainingAfter +
      "% remaining";


    meta.appendChild(
      added
    );


    meta.appendChild(
      remaining
    );


    main.appendChild(
      track
    );


    main.appendChild(
      meta
    );


    row.appendChild(
      value
    );


    row.appendChild(
      main
    );


    return row;
  }



  /* ============================================================
    17. GRAPH RENDERER
  ============================================================ */

  function renderBuildGraph(
    result
  ) {

    const steps =
      result.steps || [];


    renderFixedBuildStep(
      1,
      steps[0] || null
    );


    renderFixedBuildStep(
      2,
      steps[1] || null
    );


    renderFixedBuildStep(
      3,
      steps[2] || null
    );


    if (
      els.additionalBuildSteps
    ) {

      els.additionalBuildSteps
        .replaceChildren();


      steps
        .slice(3)
        .forEach(function (
          step
        ) {

          els.additionalBuildSteps
            .appendChild(
              createDynamicBuildStep(
                step
              )
            );
        });
    }


    setText(
      els.buildCombinedFinal,
      result.combinedValue +
      "%"
    );


    setText(
      els.buildOfficialFinal,
      result.officialRating +
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
      result.officialRating === 0
    ) {

      els.compensationNote.textContent =
        "Add a compensable disability rating to estimate monthly VA compensation.";


      return;
    }


    if (
      result.officialRating === 10 ||
      result.officialRating === 20
    ) {

      els.compensationNote.textContent =
        "At 10% and 20%, the standard VA compensation amount does not change based on dependent status.";


      return;
    }


    els.compensationNote.textContent =
      "Compensation is based on your estimated official VA rating and dependent profile. Dependent additions generally begin at a 30% VA disability rating.";
  }



  /* ============================================================
    19. LIVE REGION
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
      " percent. " +
      "Combined value " +
      result.combinedValue +
      " percent. " +
      "Estimated monthly compensation " +
      money2(
        compensation.monthlyVA || 0
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

    Future HUD integrations can listen for:

    window.addEventListener(
      "thewing:disability-updated",
      function (event) {
        console.log(event.detail);
      }
    );

    No localStorage / sessionStorage required.
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

    } catch (
      error
    ) {

      /*
        The calculator must continue even if
        CustomEvent is unavailable.
      */

    }
  }



  /* ============================================================
    21. CREATE RATING OPTIONS
  ============================================================ */

  function populateRatingOptions(
    select,
    selectedValue
  ) {

    VALID_RATINGS.forEach(function (
      rating
    ) {

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
    });
  }



  /* ============================================================
    22. CREATE NEW DISABILITY CARD
  ============================================================ */

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


    shell.appendChild(
      select
    );


    shell.appendChild(
      chevron
    );


    card.appendChild(
      actions
    );


    card.appendChild(
      label
    );


    card.appendChild(
      shell
    );


    return card;
  }



  /* ============================================================
    23. RENUMBER DISABILITY CARDS
  ============================================================ */

  function renumberDisabilityCards() {

    const cards =
      $$(
        ".dc-rating-card"
      );


    cards.forEach(function (
      card,
      index
    ) {

      const number =
        index + 1;


      const label =
        card.querySelector(
          ".dc-rating-label"
        );


      const select =
        card.querySelector(
          "[data-disability-rating]"
        );


      if (!select) {
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


      if (label) {

        label.htmlFor =
          id;


        label.textContent =
          "Disability " +
          number;
      }

    });


    updateAddButtonState();
  }



  /* ============================================================
    24. ADD BUTTON STATE
  ============================================================ */

  function updateAddButtonState() {

    if (
      !els.addDisabilityButton
    ) {

      return;
    }


    const count =
      getRatingSelects()
        .length;


    const atMaximum =
      count >=
      MAX_DISABILITIES;


    els.addDisabilityButton.disabled =
      atMaximum;


    if (
      atMaximum
    ) {

      els.addDisabilityButton.setAttribute(
        "aria-label",
        "Maximum number of disabilities reached"
      );


    } else {

      els.addDisabilityButton.setAttribute(
        "aria-label",
        "Add another disability"
      );
    }
  }



  /* ============================================================
    25. ADD DISABILITY
  ============================================================ */

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


    if (select) {

      select.focus();
    }


    run();
  }



  /* ============================================================
    26. REMOVE DISABILITY
  ============================================================ */

  function removeDisability(
    button
  ) {

    const card =
      button.closest(
        ".dc-rating-card"
      );


    if (!card) {
      return;
    }


    card.remove();


    renumberDisabilityCards();


    run();
  }



  /* ============================================================
    27. CURRENT CALCULATOR STATE
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
          function (
            step
          ) {

            return {
              ...step
            };
          }
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
    28. MAIN RUN
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
    29. EVENT BINDING — DISABILITIES
  ============================================================ */

  if (
    els.disabilityList
  ) {

    els.disabilityList.addEventListener(
      "change",
      function (
        event
      ) {

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
      function (
        event
      ) {

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



  /* ============================================================
    30. EVENT BINDING — ADD DISABILITY
  ============================================================ */

  if (
    els.addDisabilityButton
  ) {

    els.addDisabilityButton.addEventListener(
      "click",
      addDisability
    );
  }



  /* ============================================================
    31. EVENT BINDING — DEPENDENT PROFILE
  ============================================================ */

  if (
    els.dependentProfile
  ) {

    els.dependentProfile.addEventListener(
      "change",
      function () {

        updateCustomDependentVisibility();

        run();
      }
    );
  }



  /* ============================================================
    32. EVENT BINDING — CUSTOM DEPENDENTS
  ============================================================ */

  [
    els.hasSpouse,
    els.childrenUnder18,
    els.childrenSchool,
    els.dependentParents

  ].forEach(function (
    element
  ) {

    if (!element) {
      return;
    }


    element.addEventListener(
      "change",
      run
    );


    /*
      Number inputs can update live.
      Checkbox/select changes are already handled above.
    */

    if (
      element.type ===
      "number"
    ) {

      element.addEventListener(
        "input",
        run
      );
    }

  });



  /* ============================================================
    33. INITIALIZE
  ============================================================ */

  function initialize() {

    renumberDisabilityCards();


    updateCustomDependentVisibility();


    updateAddButtonState();


    run();
  }



  /* ============================================================
    34. PUBLIC API

    Useful later for:
    - Ask Amy HUD
    - debugging
    - automated tests
    - subscriber/account integrations
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


      getState:
        function () {

          if (!currentState) {
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
    35. BOOT
  ============================================================ */

  initialize();


})();
