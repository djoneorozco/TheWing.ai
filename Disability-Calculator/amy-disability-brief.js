/* ============================================================
  THEWING.AI • AMY DISABILITY BRIEF
  Disability-Calculator/amy-disability-brief.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Visual disability-intelligence layer for the dedicated
  Ask Amy Disability Command Center.

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing calculates.
  Amy explains.
  The browser renders.

  IMPORTANT
  -------------------------------------------------------------
  This file DOES NOT:
  - calculate VA combined ratings
  - calculate whole-person math
  - round an official VA rating
  - calculate VA compensation
  - calculate bilateral factor
  - calculate SMC, DIC, retro pay, offsets, or effective dates

  It only renders values already supplied by the authoritative
  Disability Calculator state.

  EXPECTED USE
  -------------------------------------------------------------
  window.TheWingAmyDisabilityBrief.initialize(container);

  window.TheWingAmyDisabilityBrief.render({
    type: "explain_estimate",
    disability: disabilitySnapshot
  });

  SUPPORTED TYPES
  -------------------------------------------------------------
  - explain_estimate
  - combined_rating
  - whole_person
  - rating_steps
  - final_rounding
  - compensation
  - dependents
============================================================ */

(function () {
  "use strict";

  if (window.__THEWING_AMY_DISABILITY_BRIEF_V100) {
    return;
  }

  window.__THEWING_AMY_DISABILITY_BRIEF_V100 =
    true;


  /* ============================================================
    1. CONFIG
  ============================================================ */

  const VERSION =
    "amy-disability-brief-1.0.0";

  const ROOT_ID =
    "aa-disability-brief";

  const STYLE_ID =
    "aa-disability-brief-styles-v100";

  const DEFAULT_TYPE =
    "explain_estimate";

  const DEFAULT_DISCLAIMER =
    "Educational estimate only. This is not an official VA rating decision or benefits determination.";

  const SUPPORTED_TYPES =
    new Set([
      "explain_estimate",
      "combined_rating",
      "whole_person",
      "rating_steps",
      "final_rounding",
      "compensation",
      "dependents"
    ]);

  let mountedContainer =
    null;

  let rootEl =
    null;

  let currentData =
    null;


  /* ============================================================
    2. BASIC HELPERS
  ============================================================ */

  function clean(
    value
  ) {

    return String(
      value == null
        ? ""
        : value
    ).trim();

  }


  function isPlainObject(
    value
  ) {

    return Boolean(
      value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value
      )
    );

  }


  function clone(
    value,
    fallback = null
  ) {

    try {

      return JSON.parse(
        JSON.stringify(
          value
        )
      );

    } catch (_) {

      return fallback;

    }

  }


  function finiteNumber(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return null;

    }

    const number =
      Number(
        value
      );

    return Number.isFinite(
      number
    )
      ? number
      : null;

  }


  function boolOrNull(
    value
  ) {

    if (
      value === true ||
      value === false
    ) {

      return value;

    }

    return null;

  }


  function clamp(
    value,
    min,
    max
  ) {

    const number =
      finiteNumber(
        value
      );

    if (
      number === null
    ) {

      return min;

    }

    return Math.max(
      min,
      Math.min(
        max,
        number
      )
    );

  }


  function escapeHtml(
    value
  ) {

    return clean(
      value
    )
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


  function formatPercent(
    value,
    digits = 0
  ) {

    const number =
      finiteNumber(
        value
      );

    if (
      number === null
    ) {

      return "—";

    }

    return (
      number.toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            0,

          maximumFractionDigits:
            digits
        }
      ) +
      "%"
    );

  }


  function formatMoney2(
    value
  ) {

    const number =
      finiteNumber(
        value
      );

    if (
      number === null
    ) {

      return "—";

    }

    return (
      "$" +
      number.toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )
    );

  }


  function normalizeType(
    value,
    fallback = ""
  ) {

    const type =
      clean(
        value
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          "_"
        );

    return SUPPORTED_TYPES.has(
      type
    )
      ? type
      : fallback;

  }


  function sanitizeRatingArray(
    value
  ) {

    if (
      !Array.isArray(
        value
      )
    ) {

      return [];

    }

    return value
      .slice(
        0,
        20
      )
      .map(
        finiteNumber
      )
      .filter(
        number =>
          number !== null &&
          number >= 0 &&
          number <= 100
      );

  }


  function sanitizeSteps(
    value
  ) {

    if (
      !Array.isArray(
        value
      )
    ) {

      return [];

    }

    return value
      .slice(
        0,
        20
      )
      .map(
        step => {

          const raw =
            isPlainObject(
              step
            )
              ? step
              : {};

          return {

            index:
              finiteNumber(
                raw.index
              ),

            sourceIndex:
              finiteNumber(
                raw.sourceIndex
              ),

            rating:
              finiteNumber(
                raw.rating
              ),

            previousCombined:
              finiteNumber(
                raw.previousCombined
              ),

            remainingBefore:
              finiteNumber(
                raw.remainingBefore
              ),

            rawContribution:
              finiteNumber(
                raw.rawContribution
              ),

            contribution:
              finiteNumber(
                raw.contribution
              ),

            rawCombined:
              finiteNumber(
                raw.rawCombined
              ),

            combined:
              finiteNumber(
                raw.combined
              ),

            remainingAfter:
              finiteNumber(
                raw.remainingAfter
              )

          };

        }
      );

  }


  /* ============================================================
    3. SNAPSHOT NORMALIZATION
  ============================================================ */

  function normalizeSnapshot(
    raw
  ) {

    if (
      !isPlainObject(
        raw
      )
    ) {

      return null;

    }


    const dependents =
      isPlainObject(
        raw.dependents
      )
        ? raw.dependents
        : {};


    const compensation =
      isPlainObject(
        raw.compensation
      )
        ? raw.compensation
        : {};


    return {

      runtimeVersion:
        clean(
          raw.runtimeVersion
        ),

      ruleVersion:
        clean(
          raw.ruleVersion
        ),

      rateVersion:
        clean(
          raw.rateVersion
        ),


      ratingsEntered:
        sanitizeRatingArray(
          raw.ratingsEntered
        ),


      ratingsSorted:
        sanitizeRatingArray(
          raw.ratingsSorted
        ),


      ratingEntries:
        Array.isArray(
          raw.ratingEntries
        )
          ? raw
              .ratingEntries
              .slice(
                0,
                20
              )
              .map(
                entry => ({

                  sourceIndex:
                    finiteNumber(
                      entry?.sourceIndex
                    ),

                  rating:
                    finiteNumber(
                      entry?.rating
                    )

                })
              )
          : [],


      highestRating:
        finiteNumber(
          raw.highestRating
        ),


      combinedValue:
        finiteNumber(
          raw.combinedValue
        ),


      officialRating:
        finiteNumber(
          raw.officialRating
        ),


      remainingEfficiency:
        finiteNumber(
          raw.remainingEfficiency
        ),


      steps:
        sanitizeSteps(
          raw.steps
        ),


      dependents: {

        profile:
          clean(
            dependents.profile
          ),

        profileLabel:
          clean(
            dependents.profileLabel
          ),

        spouse:
          boolOrNull(
            dependents.spouse
          ),

        childrenUnder18:
          finiteNumber(
            dependents.childrenUnder18
          ),

        childrenInSchoolOver18:
          finiteNumber(
            dependents
              .childrenInSchoolOver18
          ),

        dependentParents:
          finiteNumber(
            dependents.dependentParents
          )

      },


      compensation: {

        ok:
          compensation.ok ===
          true,

        error:
          clean(
            compensation.error
          ),

        rating:
          finiteNumber(
            compensation.rating
          ),

        spouse:
          boolOrNull(
            compensation.spouse
          ),

        dependentParents:
          finiteNumber(
            compensation.dependentParents
          ),

        childrenUnder18:
          finiteNumber(
            compensation.childrenUnder18
          ),

        childrenInSchoolOver18:
          finiteNumber(
            compensation
              .childrenInSchoolOver18
          ),

        monthlyVA:
          finiteNumber(
            compensation.monthlyVA
          ),

        baseMonthlyVA:
          finiteNumber(
            compensation.baseMonthlyVA
          ),

        addedChildrenUnder18:
          finiteNumber(
            compensation
              .addedChildrenUnder18
          ),

        addedChildrenInSchoolOver18:
          finiteNumber(
            compensation
              .addedChildrenInSchoolOver18
          ),

        dependentStatusKey:
          clean(
            compensation
              .dependentStatusKey
          ),

        rateVersion:
          clean(
            compensation.rateVersion
          )

      }

    };

  }


  function isAuthoritativeSnapshot(
    data
  ) {

    if (
      !isPlainObject(
        data
      )
    ) {

      return false;

    }


    const combined =
      finiteNumber(
        data.combinedValue
      );


    const official =
      finiteNumber(
        data.officialRating
      );


    const remaining =
      finiteNumber(
        data.remainingEfficiency
      );


    const monthly =
      finiteNumber(
        data
          .compensation
          ?.monthlyVA
      );


    return Boolean(

      combined !== null &&

      official !== null &&

      remaining !== null &&

      monthly !== null &&

      combined >= 0 &&
      combined <= 100 &&

      official >= 0 &&
      official <= 100 &&

      remaining >= 0 &&
      remaining <= 100 &&

      data
        .compensation
        ?.ok === true

    );

  }


  function normalizeRenderData(
    raw
  ) {

    if (
      !isPlainObject(
        raw
      )
    ) {

      return null;

    }


    const snapshot =
      normalizeSnapshot(

        raw.disability ||

        raw.snapshot ||

        raw.state ||

        raw

      );


    if (
      !snapshot
    ) {

      return null;

    }


    return {

      type:
        normalizeType(
          raw.type ||
          raw.intent,
          DEFAULT_TYPE
        ),

      disability:
        snapshot,

      title:
        clean(
          raw.title
        ),

      subtitle:
        clean(
          raw.subtitle
        ),

      disclaimer:
        clean(
          raw.disclaimer
        ) ||
        DEFAULT_DISCLAIMER,

      raw:
        clone(
          raw,
          {}
        )

    };

  }


  /* ============================================================
    4. DATA DISPLAY HELPERS
  ============================================================ */

  function ratingsText(
    data,
    source = "sorted"
  ) {

    const ratings =
      source ===
        "entered"
        ? data.ratingsEntered
        : data.ratingsSorted;


    if (
      !ratings.length
    ) {

      return "No compensable ratings";

    }


    return ratings
      .map(
        value =>
          formatPercent(
            value
          )
      )
      .join(
        " • "
      );

  }


  function getDependentLabel(
    data
  ) {

    return (

      data
        .dependents
        .profileLabel ||

      data
        .dependents
        .profile ||

      "Veteran Only"

    );

  }


  function dependentCount(
    value
  ) {

    const number =
      finiteNumber(
        value
      );

    return number ===
      null
      ? 0
      : Math.max(
          0,
          Math.floor(
            number
          )
        );

  }


  function compensationDependencyNote(
    data
  ) {

    const rating =
      finiteNumber(
        data.officialRating
      ) ||
      0;


    if (
      rating === 10 ||
      rating === 20
    ) {

      return "At 10% and 20%, the calculator's standard compensation amount does not change based on dependent status.";

    }


    if (
      rating >= 30
    ) {

      return "At this estimated rating, the dependent profile can affect the standard compensation estimate.";

    }


    return "Dependent additions are not reflected at the current estimated rating.";

  }


  function meterWidth(
    value
  ) {

    return (
      clamp(
        value,
        0,
        100
      ) +
      "%"
    );

  }


  /* ============================================================
    5. STYLES
  ============================================================ */

  function ensureStyles() {

    if (
      document.getElementById(
        STYLE_ID
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      STYLE_ID;


    style.textContent = `

#${ROOT_ID},
#${ROOT_ID} *{
box-sizing:border-box
}

#${ROOT_ID}{
--adb-ink:#f3f8fc;
--adb-soft:#d6e5ef;
--adb-muted:rgba(195,215,229,.72);
--adb-muted2:rgba(195,215,229,.52);
--adb-line:rgba(174,211,234,.16);
--adb-gold:#f0cc74;
--adb-gold-soft:#ffe2a0;
--adb-mint:#9fe3d4;
--adb-blue:#80c7ff;
--adb-violet:#c6b4ff;
--adb-card:rgba(13,47,72,.62);
--adb-card2:rgba(19,59,87,.6);

position:relative;
width:100%;
min-width:0;
margin:0 0 16px;

color:
var(--adb-ink);

font-family:
Barlow,
Inter,
system-ui,
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
sans-serif
}

#${ROOT_ID}[data-empty="1"]{
display:none
}

.adb-shell{
position:relative;
overflow:hidden;
width:100%;

border:
1px solid rgba(183,211,232,.2);

border-radius:
22px;

background:
radial-gradient(
560px 260px at 0% 0%,
rgba(240,204,116,.12),
transparent 70%
),
radial-gradient(
680px 320px at 100% 0%,
rgba(85,165,206,.15),
transparent 68%
),
linear-gradient(
145deg,
rgba(38,78,106,.88),
rgba(12,41,63,.94)
);

box-shadow:
0 18px 42px rgba(2,12,24,.28),
inset 0 1px 0 rgba(255,255,255,.055)
}

.adb-shell:before{
content:"";

position:absolute;
inset:0;

pointer-events:none;

background:
linear-gradient(
180deg,
rgba(255,255,255,.045),
transparent 38%
)
}

.adb-body{
position:relative;
z-index:2;

padding:
22px
}


/* ============================================================
   HEADER
============================================================ */

.adb-header{
display:flex;
align-items:flex-start;
justify-content:space-between;
gap:18px;

margin-bottom:
18px
}

.adb-eyebrow,
.adb-section-title{
margin:
0 0 7px;

color:
var(--adb-gold);

font-size:
10px;

font-weight:
900;

letter-spacing:
.13em;

text-transform:
uppercase
}

.adb-title{
margin:0;

color:
#f7fbff;

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
27px;

line-height:
1.05;

font-weight:
400
}

.adb-subtitle{
max-width:
700px;

margin:
6px 0 0;

color:
var(--adb-muted);

font-size:
12px;

line-height:
1.45;

font-weight:
600
}

.adb-brand{
flex:
0 0 auto;

padding-top:
2px;

text-align:
right
}

.adb-brand-name{
color:
var(--adb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
18px;

line-height:
1
}

.adb-brand-sub{
margin-top:
4px;

color:
var(--adb-muted);

font-size:
8px;

font-weight:
900;

letter-spacing:
.13em;

text-transform:
uppercase
}


/* ============================================================
   COMMON CARDS
============================================================ */

.adb-grid{
display:grid;

grid-template-columns:
minmax(0,1fr)
minmax(0,1fr);

gap:
12px
}

.adb-grid-3{
display:grid;

grid-template-columns:
repeat(
3,
minmax(0,1fr)
);

gap:
12px
}

.adb-card{
min-width:0;

padding:
16px;

border:
1px solid var(--adb-line);

border-radius:
17px;

background:
linear-gradient(
180deg,
var(--adb-card2),
var(--adb-card)
);

box-shadow:
inset 0 1px 0 rgba(255,255,255,.035)
}

.adb-card-gold{
border-color:
rgba(240,204,116,.28);

background:
radial-gradient(
300px 130px at 0% 0%,
rgba(240,204,116,.11),
transparent 68%
),
linear-gradient(
180deg,
var(--adb-card2),
var(--adb-card)
)
}

.adb-label{
margin:0;

color:
var(--adb-muted);

font-size:
10px;

line-height:
1.3;

font-weight:
800
}

.adb-value{
margin:
6px 0 0;

color:
var(--adb-ink);

font-size:
22px;

line-height:
1;

font-weight:
900;

letter-spacing:
-.025em;

font-variant-numeric:
tabular-nums
}

.adb-value-gold{
color:
var(--adb-gold-soft)
}

.adb-value-mint{
color:
var(--adb-mint)
}

.adb-hero-value{
margin:
7px 0 0;

color:
var(--adb-gold-soft);

font-size:
42px;

line-height:
.95;

font-weight:
900;

letter-spacing:
-.045em;

font-variant-numeric:
tabular-nums
}

.adb-note{
margin:
7px 0 0;

color:
var(--adb-muted);

font-size:
9px;

line-height:
1.45;

font-weight:
600
}

.adb-section{
margin-top:
12px
}


/* ============================================================
   ROWS
============================================================ */

.adb-rows{
overflow:hidden;

border:
1px solid var(--adb-line);

border-radius:
16px;

background:
rgba(7,34,55,.24)
}

.adb-row{
display:flex;
align-items:center;
justify-content:space-between;

gap:
15px;

min-height:
47px;

padding:
10px 13px
}

.adb-row+
.adb-row{
border-top:
1px solid rgba(183,211,232,.1)
}

.adb-row-label{
color:
var(--adb-muted);

font-size:
10px;

font-weight:
700
}

.adb-row-value{
max-width:
62%;

overflow:hidden;

color:
var(--adb-ink);

font-size:
12px;

font-weight:
900;

font-variant-numeric:
tabular-nums;

text-align:
right;

text-overflow:
ellipsis;

white-space:
nowrap
}

.adb-row-value[data-accent="mint"]{
color:
var(--adb-mint)
}

.adb-row-value[data-accent="gold"]{
color:
var(--adb-gold-soft)
}


/* ============================================================
   CHIPS
============================================================ */

.adb-chip-row{
display:flex;
flex-wrap:wrap;

gap:
7px;

margin-top:
10px
}

.adb-chip{
display:inline-flex;
align-items:center;

min-height:
28px;

padding:
0 10px;

border:
1px solid var(--adb-line);

border-radius:
999px;

background:
rgba(10,40,61,.42);

color:
var(--adb-soft);

font-size:
9px;

line-height:
1;

font-weight:
900
}

.adb-chip[data-accent="mint"]{
border-color:
rgba(159,227,212,.28);

color:
var(--adb-mint)
}

.adb-chip[data-accent="gold"]{
border-color:
rgba(240,204,116,.28);

color:
var(--adb-gold-soft)
}


/* ============================================================
   INFO
============================================================ */

.adb-info{
display:flex;
align-items:flex-start;

gap:
9px;

margin-top:
12px;

padding:
11px 12px;

border:
1px solid var(--adb-line);

border-radius:
13px;

background:
rgba(103,136,159,.1)
}

.adb-info-icon{
flex:
0 0 21px;

width:
21px;

height:
21px;

display:flex;
align-items:center;
justify-content:center;

border:
1px solid rgba(240,204,116,.35);

border-radius:
50%;

color:
var(--adb-gold-soft);

font-family:
Georgia,
serif;

font-size:
11px;

font-weight:
700
}

.adb-info-copy{
margin:0;

color:
var(--adb-muted);

font-size:
9px;

line-height:
1.45;

font-weight:
600
}

.adb-disclaimer{
margin:
13px 0 0;

color:
rgba(190,211,225,.55);

font-size:
8px;

line-height:
1.5;

font-weight:
600
}


/* ============================================================
   METERS
============================================================ */

.adb-meter{
position:relative;
overflow:hidden;

height:
12px;

margin-top:
11px;

border:
1px solid rgba(183,211,232,.14);

border-radius:
999px;

background:
rgba(4,26,42,.5)
}

.adb-meter-fill{
height:
100%;

border-radius:
999px;

background:
linear-gradient(
90deg,
var(--adb-mint),
var(--adb-blue)
);

box-shadow:
0 0 16px rgba(159,227,212,.2)
}

.adb-meter-fill[data-tone="gold"]{
background:
linear-gradient(
90deg,
#d3a855,
var(--adb-gold-soft)
)
}

.adb-meter-labels{
display:flex;
justify-content:space-between;

gap:
10px;

margin-top:
7px;

color:
var(--adb-muted2);

font-size:
8px;

font-weight:
800;

text-transform:
uppercase
}


/* ============================================================
   RATING PILLS
============================================================ */

.adb-rating-pills{
display:flex;
flex-wrap:wrap;

gap:
8px
}

.adb-rating-pill{
min-width:
58px;

padding:
9px 10px;

border:
1px solid rgba(128,199,255,.24);

border-radius:
12px;

background:
rgba(10,40,61,.48);

color:
var(--adb-blue);

font-size:
16px;

font-weight:
900;

text-align:
center;

font-variant-numeric:
tabular-nums
}

.adb-arrow-line{
display:flex;
align-items:center;
justify-content:center;

gap:
10px;

margin:
14px 0;

color:
var(--adb-gold);

font-size:
20px
}


/* ============================================================
   RATING STEPS
============================================================ */

.adb-step-list{
display:grid;

gap:
9px
}

.adb-step{
display:grid;

grid-template-columns:
42px minmax(0,1fr) auto;

gap:
11px;

align-items:center;

padding:
12px;

border:
1px solid var(--adb-line);

border-radius:
14px;

background:
rgba(11,43,66,.52)
}

.adb-step-index{
width:
34px;

height:
34px;

display:flex;
align-items:center;
justify-content:center;

border:
1px solid rgba(159,227,212,.3);

border-radius:
50%;

color:
var(--adb-mint);

font-size:
11px;

font-weight:
900
}

.adb-step-title{
color:
var(--adb-ink);

font-size:
11px;

font-weight:
900
}

.adb-step-copy{
margin-top:
3px;

color:
var(--adb-muted);

font-size:
9px;

line-height:
1.4;

font-weight:
600
}

.adb-step-result{
text-align:
right
}

.adb-step-result-main{
color:
var(--adb-gold-soft);

font-size:
16px;

font-weight:
900
}

.adb-step-result-sub{
margin-top:
3px;

color:
var(--adb-muted2);

font-size:
8px;

font-weight:
700
}


/* ============================================================
   ROUNDING COMPARISON
============================================================ */

.adb-compare{
display:grid;

grid-template-columns:
1fr auto 1fr;

gap:
14px;

align-items:center
}

.adb-compare-box{
padding:
18px;

border:
1px solid var(--adb-line);

border-radius:
16px;

background:
rgba(8,32,50,.58);

text-align:
center
}

.adb-compare-label{
color:
var(--adb-muted);

font-size:
9px;

font-weight:
900;

text-transform:
uppercase
}

.adb-compare-value{
margin-top:
7px;

color:
var(--adb-mint);

font-size:
35px;

font-weight:
900
}

.adb-compare-box:last-child
.adb-compare-value{
color:
var(--adb-gold-soft)
}

.adb-compare-arrow{
color:
var(--adb-gold);

font-size:
30px
}


/* ============================================================
   DEPENDENTS
============================================================ */

.adb-dep-grid{
display:grid;

grid-template-columns:
repeat(
4,
minmax(0,1fr)
);

gap:
9px
}

.adb-dep{
padding:
13px;

border:
1px solid var(--adb-line);

border-radius:
14px;

background:
rgba(11,43,66,.52);

text-align:
center
}

.adb-dep-label{
color:
var(--adb-muted);

font-size:
8px;

font-weight:
800;

text-transform:
uppercase
}

.adb-dep-value{
margin-top:
5px;

color:
var(--adb-mint);

font-size:
18px;

font-weight:
900
}


/* ============================================================
   DISABILITY JOURNEY
============================================================ */

.adb-journey{
position:relative;
overflow:hidden;

border:
1px solid rgba(128,202,226,.28);

border-radius:
22px;

background:
radial-gradient(
440px 300px at 82% 16%,
rgba(240,204,116,.15),
transparent 67%
),
radial-gradient(
560px 320px at 15% 6%,
rgba(64,154,185,.15),
transparent 68%
),
linear-gradient(
155deg,
rgba(8,34,53,.91),
rgba(8,27,44,.96)
);

box-shadow:
inset 0 1px 0 rgba(255,255,255,.05),
0 22px 46px rgba(2,12,24,.24)
}

.adb-journey:before{
content:"";

position:absolute;
inset:0;

pointer-events:none;

background:
linear-gradient(
180deg,
rgba(255,255,255,.025),
transparent 28%
)
}


/* Decorative intelligence orbit */

.adb-orbit{
position:absolute;

right:
48px;

top:
24px;

width:
170px;

height:
170px;

border:
1px solid rgba(159,227,212,.14);

border-radius:
50%;

box-shadow:
0 0 0 24px rgba(128,199,255,.025),
0 0 0 48px rgba(240,204,116,.018)
}

.adb-orbit:before,
.adb-orbit:after{
content:"";

position:absolute;

border-radius:
50%
}

.adb-orbit:before{
inset:
34px;

border:
1px dashed rgba(240,204,116,.22)
}

.adb-orbit:after{
width:
12px;

height:
12px;

right:
21px;

top:
42px;

background:
var(--adb-gold-soft);

box-shadow:
0 0 18px rgba(240,204,116,.35)
}


/* Journey heading */

.adb-journey-head{
position:relative;
z-index:3;

padding:
24px 235px 4px 24px
}

.adb-journey-kicker{
margin:0;

color:
var(--adb-gold);

font-size:
9px;

font-weight:
900;

letter-spacing:
.16em;

text-transform:
uppercase
}

.adb-journey-title{
max-width:
610px;

margin:
7px 0 0;

color:
#f6f7f2;

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
42px;

line-height:
1;

font-weight:
400
}

.adb-journey-sub{
max-width:
660px;

margin:
8px 0 0;

color:
var(--adb-soft);

font-size:
15px;

line-height:
1.35;

font-weight:
500
}

.adb-journey-motto{
position:absolute;
z-index:4;

right:
28px;

top:
115px;

width:
175px;

color:
var(--adb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
15px;

line-height:
1.2;

font-style:
italic;

text-align:
right;

transform:
rotate(-4deg);

opacity:
.88
}


/* Journey steps */

.adb-journey-flow{
position:relative;
z-index:4;

display:grid;

grid-template-columns:
repeat(
5,
minmax(0,1fr)
);

gap:
10px;

padding:
34px 20px 20px
}

.adb-journey-step{
position:relative;

min-width:0;

min-height:
220px;

padding:
28px 13px 14px;

border:
1px solid rgba(126,197,224,.2);

border-radius:
16px;

background:
linear-gradient(
180deg,
rgba(17,55,76,.74),
rgba(8,32,50,.8)
);

box-shadow:
inset 0 1px 0 rgba(255,255,255,.035),
0 16px 30px rgba(2,12,24,.18)
}

.adb-journey-step[data-step="5"]{
border-color:
rgba(240,204,116,.42);

background:
radial-gradient(
220px 120px at 100% 0%,
rgba(240,204,116,.1),
transparent 70%
),
linear-gradient(
180deg,
rgba(38,57,68,.8),
rgba(12,35,50,.84)
)
}

.adb-step-number{
position:absolute;

left:
50%;

top:
-25px;

width:
48px;

height:
48px;

display:flex;
align-items:center;
justify-content:center;

border:
2px solid var(--adb-mint);

border-radius:
50%;

background:
rgba(10,42,61,.96);

color:
#fff;

font-size:
16px;

font-weight:
900;

transform:
translateX(-50%);

box-shadow:
0 0 0 5px rgba(11,35,51,.8),
0 0 20px rgba(159,227,212,.28)
}

.adb-journey-step[data-step="2"]
.adb-step-number{
border-color:
var(--adb-blue)
}

.adb-journey-step[data-step="3"]
.adb-step-number{
border-color:
#91aefc
}

.adb-journey-step[data-step="4"]
.adb-step-number{
border-color:
var(--adb-violet)
}

.adb-journey-step[data-step="5"]
.adb-step-number{
border-color:
var(--adb-gold-soft);

color:
var(--adb-gold-soft);

box-shadow:
0 0 0 5px rgba(11,35,51,.8),
0 0 24px rgba(240,204,116,.36)
}

.adb-step-icon{
height:
46px;

display:flex;
align-items:center;
justify-content:center;

margin-bottom:
10px;

color:
var(--adb-mint)
}

.adb-step-icon[data-tone="blue"]{
color:
var(--adb-blue)
}

.adb-step-icon[data-tone="violet"]{
color:
var(--adb-violet)
}

.adb-step-icon[data-tone="gold"]{
color:
var(--adb-gold-soft)
}

.adb-step-icon svg{
width:
38px;

height:
38px;

fill:none;

stroke:
currentColor;

stroke-width:
1.7;

stroke-linecap:
round;

stroke-linejoin:
round
}

.adb-journey-step-title{
margin:0;

color:
#f7fbff;

font-size:
11px;

font-weight:
900;

letter-spacing:
.075em;

text-transform:
uppercase;

text-align:
center
}

.adb-journey-step-copy{
margin:
8px 0 0;

color:
var(--adb-muted);

font-size:
9px;

line-height:
1.45;

font-weight:
600;

text-align:
center
}

.adb-step-live{
margin:
11px 0 0;

padding:
8px 7px;

border:
1px solid rgba(174,211,234,.13);

border-radius:
10px;

background:
rgba(3,25,40,.28);

text-align:
center
}

.adb-step-live-label{
color:
var(--adb-muted2);

font-size:
7px;

font-weight:
900;

letter-spacing:
.08em;

text-transform:
uppercase
}

.adb-step-live-value{
margin-top:
4px;

overflow:hidden;

color:
var(--adb-ink);

font-size:
11px;

font-weight:
900;

font-variant-numeric:
tabular-nums;

text-overflow:
ellipsis;

white-space:
nowrap
}

.adb-journey-step[data-step="5"]
.adb-step-live-value{
color:
var(--adb-gold-soft);

font-size:
14px
}

.adb-step-arrow{
position:absolute;
z-index:8;

right:
-16px;

top:
91px;

color:
rgba(223,239,248,.85);

font-size:
34px;

line-height:
1;

text-shadow:
0 0 10px rgba(135,206,231,.18)
}

.adb-journey-step:last-child
.adb-step-arrow{
display:none
}


/* Journey lower panels */

.adb-journey-bottom{
position:relative;
z-index:4;

display:grid;

grid-template-columns:
minmax(0,1.08fr)
minmax(0,.92fr);

gap:
12px;

padding:
0 20px 20px
}

.adb-takeaway,
.adb-explore{
min-width:0;

padding:
16px;

border:
1px solid var(--adb-line);

border-radius:
15px;

background:
linear-gradient(
180deg,
rgba(14,44,63,.62),
rgba(7,28,44,.68)
)
}

.adb-takeaway-title,
.adb-explore-title{
display:flex;
align-items:center;

gap:
8px;

margin:0;

color:
var(--adb-gold);

font-size:
9px;

font-weight:
900;

letter-spacing:
.12em;

text-transform:
uppercase
}

.adb-takeaway-copy{
margin:
13px 0 0;

color:
var(--adb-soft);

font-size:
12px;

line-height:
1.5;

font-weight:
500
}

.adb-signature{
margin:
16px 0 0;

padding-top:
12px;

border-top:
1px solid rgba(240,204,116,.24);

color:
var(--adb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
15px;

font-style:
italic
}

.adb-explore-list{
margin-top:
10px
}

.adb-explore-item{
display:flex;
align-items:center;
justify-content:space-between;

gap:
10px;

padding:
9px 0;

border-bottom:
1px solid rgba(174,211,234,.09)
}

.adb-explore-item:last-child{
border-bottom:0
}

.adb-explore-item-title{
color:
var(--adb-soft);

font-size:
10px;

font-weight:
800
}

.adb-explore-item-sub{
margin-top:
2px;

color:
var(--adb-muted2);

font-size:
8px;

line-height:
1.3;

font-weight:
600
}

.adb-explore-arrow{
flex:
0 0 auto;

color:
var(--adb-gold);

font-size:
18px
}

.adb-journey-footer{
position:relative;
z-index:4;

display:flex;
align-items:flex-end;
justify-content:space-between;

gap:
16px;

padding:
0 20px 18px
}

.adb-journey-disclaimer{
max-width:
72%;

margin:0;

color:
rgba(190,211,225,.52);

font-size:
8px;

line-height:
1.45;

font-weight:
600
}

.adb-journey-logo{
text-align:
right
}

.adb-journey-logo-main{
color:
var(--adb-soft);

font-size:
15px;

font-weight:
900;

letter-spacing:
.12em
}

.adb-journey-logo-sub{
margin-top:
3px;

color:
var(--adb-muted2);

font-size:
6px;

font-weight:
900;

letter-spacing:
.28em;

text-transform:
uppercase
}


/* ============================================================
   RESPONSIVE
============================================================ */

@media(max-width:1000px){

.adb-journey-flow{
grid-template-columns:
repeat(
3,
minmax(0,1fr)
);

row-gap:
38px
}

.adb-step-arrow{
display:none
}

.adb-journey-bottom{
grid-template-columns:
1fr
}

}


@media(max-width:840px){

.adb-grid,
.adb-grid-3{
grid-template-columns:
1fr
}

.adb-dep-grid{
grid-template-columns:
repeat(
2,
minmax(0,1fr)
)
}

.adb-header{
display:block
}

.adb-brand{
margin-top:
13px;

text-align:
left
}

.adb-journey-head{
padding:
22px 22px 4px
}

.adb-journey-title{
font-size:
34px
}

.adb-journey-motto,
.adb-orbit{
display:none
}

}


@media(max-width:620px){

.adb-journey-flow{
grid-template-columns:
1fr;

padding-top:
38px
}

.adb-journey-step{
min-height:0;

padding:
30px 16px 16px
}

.adb-journey-bottom{
padding:
0 14px 14px
}

.adb-journey-footer{
display:block;

padding:
0 14px 14px
}

.adb-journey-disclaimer{
max-width:none
}

.adb-journey-logo{
margin-top:
12px;

text-align:
left
}

.adb-compare{
grid-template-columns:
1fr
}

.adb-compare-arrow{
transform:
rotate(90deg);

text-align:
center
}

.adb-step{
grid-template-columns:
36px minmax(0,1fr)
}

.adb-step-result{
grid-column:
2;

text-align:
left
}

}


@media(max-width:520px){

.adb-body{
padding:
15px
}

.adb-title{
font-size:
23px
}

.adb-hero-value{
font-size:
35px
}

.adb-row{
align-items:
flex-start
}

.adb-row-value{
max-width:
55%
}

.adb-journey-title{
font-size:
30px
}

.adb-journey-sub{
font-size:
12px
}

.adb-dep-grid{
grid-template-columns:
1fr
}

}

`;


    document.head.appendChild(
      style
    );

  }


  /* ============================================================
    6. SHELL
  ============================================================ */

  function buildShell() {

    const element =
      document.createElement(
        "section"
      );


    element.id =
      ROOT_ID;


    element.setAttribute(
      "data-empty",
      "1"
    );


    element.setAttribute(
      "data-version",
      VERSION
    );


    element.setAttribute(
      "aria-label",
      "Amy Disability Brief"
    );


    return element;

  }


  function setEmptyState() {

    if (
      !rootEl
    ) {

      return null;

    }


    rootEl.innerHTML =
      "";


    rootEl.setAttribute(
      "data-empty",
      "1"
    );


    if (
      mountedContainer
    ) {

      mountedContainer.setAttribute(
        "data-visible",
        "0"
      );

    }


    return rootEl;

  }


  function setCardHtml(
    html
  ) {

    if (
      !rootEl
    ) {

      return null;

    }


    rootEl.innerHTML =
      html;


    rootEl.setAttribute(
      "data-empty",
      "0"
    );


    if (
      mountedContainer
    ) {

      mountedContainer.setAttribute(
        "data-visible",
        "1"
      );

    }


    return rootEl;

  }


  /* ============================================================
    7. COMMON UI HELPERS
  ============================================================ */

  function renderHeader({
    eyebrow,
    title,
    subtitle
  }) {

    return (

      '<div class="adb-header">' +

        "<div>" +

          '<p class="adb-eyebrow">' +
            escapeHtml(
              eyebrow
            ) +
          "</p>" +

          '<h2 class="adb-title">' +
            escapeHtml(
              title
            ) +
          "</h2>" +

          '<p class="adb-subtitle">' +
            escapeHtml(
              subtitle
            ) +
          "</p>" +

        "</div>" +

        '<div class="adb-brand">' +

          '<div class="adb-brand-name">' +
            "TheWing.ai" +
          "</div>" +

          '<div class="adb-brand-sub">' +
            "Disability Brief" +
          "</div>" +

        "</div>" +

      "</div>"

    );

  }


  function renderRow(
    label,
    value,
    accent = ""
  ) {

    const attr =
      accent
        ? (
            ' data-accent="' +
            escapeHtml(
              accent
            ) +
            '"'
          )
        : "";


    return (

      '<div class="adb-row">' +

        '<span class="adb-row-label">' +
          escapeHtml(
            label
          ) +
        "</span>" +

        '<span class="adb-row-value"' +
          attr +
        ">" +

          escapeHtml(
            value
          ) +

        "</span>" +

      "</div>"

    );

  }


  function renderRows(
    rows
  ) {

    return (
      '<div class="adb-rows">' +

        rows
          .filter(
            Boolean
          )
          .join(
            ""
          ) +

      "</div>"
    );

  }


  function renderInfo(
    text
  ) {

    return (

      '<div class="adb-info">' +

        '<div class="adb-info-icon">' +
          "i" +
        "</div>" +

        '<p class="adb-info-copy">' +
          escapeHtml(
            text
          ) +
        "</p>" +

      "</div>"

    );

  }


  function renderDisclaimer(
    text
  ) {

    return (

      '<p class="adb-disclaimer">' +

        escapeHtml(
          text ||
          DEFAULT_DISCLAIMER
        ) +

      "</p>"

    );

  }


  function renderWrapper(
    content
  ) {

    return (

      '<div class="adb-shell">' +

        '<div class="adb-body">' +

          content +

        "</div>" +

      "</div>"

    );

  }


  function renderMeter(
    value,
    left,
    right,
    tone = ""
  ) {

    return (

      '<div class="adb-meter">' +

        '<div class="adb-meter-fill"' +

          (
            tone
              ? (
                  ' data-tone="' +
                  escapeHtml(
                    tone
                  ) +
                  '"'
                )
              : ""
          ) +

          ' style="width:' +
          meterWidth(
            value
          ) +
          '">' +

        "</div>" +

      "</div>" +

      '<div class="adb-meter-labels">' +

        "<span>" +
          escapeHtml(
            left
          ) +
        "</span>" +

        "<span>" +
          escapeHtml(
            right
          ) +
        "</span>" +

      "</div>"

    );

  }


  /* ============================================================
    8. ICONS
  ============================================================ */

  function iconRatings() {

    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 36V25h7v11"></path>
        <path d="M20 36V17h7v19"></path>
        <path d="M32 36V9h7v27"></path>
        <path d="M6 38h36"></path>
      </svg>
    `;

  }


  function iconPerson() {

    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="13" r="7"></circle>
        <path d="M11 40c1-10 5-16 13-16s12 6 13 16"></path>
        <path d="M24 24v16"></path>
      </svg>
    `;

  }


  function iconCombine() {

    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 10h10v10H8z"></path>
        <path d="M30 10h10v10H30z"></path>
        <path d="M19 32h10v10H19z"></path>
        <path d="M13 20v6c0 3 3 6 11 6"></path>
        <path d="M35 20v6c0 3-3 6-11 6"></path>
      </svg>
    `;

  }


  function iconRound() {

    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 15h22"></path>
        <path d="M27 9l6 6-6 6"></path>
        <path d="M38 33H16"></path>
        <path d="M21 27l-6 6 6 6"></path>
      </svg>
    `;

  }


  function iconPay() {

    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="7" y="11" width="34" height="26" rx="4"></rect>
        <circle cx="24" cy="24" r="6"></circle>
        <path d="M12 17h5"></path>
        <path d="M31 31h5"></path>
      </svg>
    `;

  }


  /* ============================================================
    9. JOURNEY STEP
  ============================================================ */

  function renderJourneyStep({
    number,
    tone,
    icon,
    title,
    copy,
    liveLabel,
    liveValue
  }) {

    return (

      '<article class="adb-journey-step" data-step="' +
        escapeHtml(
          number
        ) +
      '">' +

        '<div class="adb-step-number">' +
          escapeHtml(
            number
          ) +
        "</div>" +

        '<div class="adb-step-icon" data-tone="' +
          escapeHtml(
            tone
          ) +
        '">' +

          icon +

        "</div>" +

        '<h3 class="adb-journey-step-title">' +
          escapeHtml(
            title
          ) +
        "</h3>" +

        '<p class="adb-journey-step-copy">' +
          escapeHtml(
            copy
          ) +
        "</p>" +

        '<div class="adb-step-live">' +

          '<div class="adb-step-live-label">' +
            escapeHtml(
              liveLabel
            ) +
          "</div>" +

          '<div class="adb-step-live-value">' +
            escapeHtml(
              liveValue
            ) +
          "</div>" +

        "</div>" +

        '<div class="adb-step-arrow" aria-hidden="true">' +
          "›" +
        "</div>" +

      "</article>"

    );

  }


  /* ============================================================
    10. EXPLAIN ESTIMATE
        VA DISABILITY JOURNEY
  ============================================================ */

  function renderDisabilityJourney(
    data,
    renderData
  ) {

    const monthly =
      formatMoney2(
        data
          .compensation
          .monthlyVA
      );


    const combined =
      formatPercent(
        data.combinedValue
      );


    const official =
      formatPercent(
        data.officialRating
      );


    const remaining =
      formatPercent(
        data.remainingEfficiency
      );


    const dependentLabel =
      getDependentLabel(
        data
      );


    const body =

      '<div class="adb-journey">' +

        '<div class="adb-orbit" aria-hidden="true"></div>' +

        '<div class="adb-journey-head">' +

          '<p class="adb-journey-kicker">' +
            "TheWing.ai • VA Disability Intelligence" +
          "</p>" +

          '<h2 class="adb-journey-title">' +

            escapeHtml(
              renderData.title ||
              "Your VA Disability Journey"
            ) +

          "</h2>" +

          '<p class="adb-journey-sub">' +

            escapeHtml(
              renderData.subtitle ||
              "Five steps. One clear view of how your current calculator estimate comes together."
            ) +

          "</p>" +

        "</div>" +


        '<div class="adb-journey-motto">' +
          "Understand the math.<br>" +
          "Own the picture." +
        "</div>" +


        '<div class="adb-journey-flow">' +


          renderJourneyStep({

            number:
              "1",

            tone:
              "mint",

            icon:
              iconRatings(),

            title:
              "Your Ratings",

            copy:
              "The calculator starts with the disability percentages entered in your current scenario.",

            liveLabel:
              "Ratings Entered",

            liveValue:
              ratingsText(
                data,
                "entered"
              )

          }) +


          renderJourneyStep({

            number:
              "2",

            tone:
              "blue",

            icon:
              iconPerson(),

            title:
              "Whole Person",

            copy:
              "Ratings are applied against the efficiency remaining as the current result builds.",

            liveLabel:
              "Efficiency Remaining",

            liveValue:
              remaining

          }) +


          renderJourneyStep({

            number:
              "3",

            tone:
              "blue",

            icon:
              iconCombine(),

            title:
              "Combined Value",

            copy:
              "The calculator carries the ratings through its displayed whole-person steps.",

            liveLabel:
              "Current Combined Value",

            liveValue:
              combined

          }) +


          renderJourneyStep({

            number:
              "4",

            tone:
              "violet",

            icon:
              iconRound(),

            title:
              "Final Rounding",

            copy:
              "After all displayed ratings combine, the calculator returns its estimated official rating.",

            liveLabel:
              "Estimated VA Rating",

            liveValue:
              official

          }) +


          renderJourneyStep({

            number:
              "5",

            tone:
              "gold",

            icon:
              iconPay(),

            title:
              "Compensation",

            copy:
              "The current estimated rating and dependent profile feed the standard compensation result shown.",

            liveLabel:
              "Estimated Monthly VA",

            liveValue:
              monthly

          }) +


        "</div>" +


        '<div class="adb-journey-bottom">' +


          '<section class="adb-takeaway">' +

            '<h3 class="adb-takeaway-title">' +
              "◇ Key Takeaway" +
            "</h3>" +

            '<p class="adb-takeaway-copy">' +

              "Your current calculator scenario moves from " +

              escapeHtml(
                ratingsText(
                  data,
                  "sorted"
                )
              ) +

              " through whole-person combination to a " +

              escapeHtml(
                combined
              ) +

              " combined value, an estimated " +

              escapeHtml(
                official
              ) +

              " VA rating, and " +

              escapeHtml(
                monthly
              ) +

              " in standard monthly compensation." +

            "</p>" +


            '<div class="adb-chip-row">' +

              '<span class="adb-chip" data-accent="mint">' +
                escapeHtml(
                  dependentLabel
                ) +
              "</span>" +

              '<span class="adb-chip">' +
                "38 CFR § 4.25 Method" +
              "</span>" +

              '<span class="adb-chip" data-accent="gold">' +
                "Bilateral factor not applied" +
              "</span>" +

            "</div>" +


            '<div class="adb-signature">' +
              "Clarity in the numbers. Confidence in the next question." +
            "</div>" +

          "</section>" +


          '<section class="adb-explore">' +

            '<h3 class="adb-explore-title">' +
              "◇ Explore Next" +
            "</h3>" +

            '<div class="adb-explore-list">' +


              '<div class="adb-explore-item">' +

                "<div>" +

                  '<div class="adb-explore-item-title">' +
                    "How Did My Ratings Combine?" +
                  "</div>" +

                  '<div class="adb-explore-item-sub">' +
                    "See your current combined value and rating order" +
                  "</div>" +

                "</div>" +

                '<div class="adb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +


              '<div class="adb-explore-item">' +

                "<div>" +

                  '<div class="adb-explore-item-title">' +
                    "Explain Whole Person Math" +
                  "</div>" +

                  '<div class="adb-explore-item-sub">' +
                    "See remaining efficiency and contributions" +
                  "</div>" +

                "</div>" +

                '<div class="adb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +


              '<div class="adb-explore-item">' +

                "<div>" +

                  '<div class="adb-explore-item-title">' +
                    "Explain My Final Rounding" +
                  "</div>" +

                  '<div class="adb-explore-item-sub">' +
                    "Compare combined value with estimated official rating" +
                  "</div>" +

                "</div>" +

                '<div class="adb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +


              '<div class="adb-explore-item">' +

                "<div>" +

                  '<div class="adb-explore-item-title">' +
                    "Explain My Compensation" +
                  "</div>" +

                  '<div class="adb-explore-item-sub">' +
                    "Review rating, dependents, and monthly VA estimate" +
                  "</div>" +

                "</div>" +

                '<div class="adb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +


            "</div>" +

          "</section>" +


        "</div>" +


        '<div class="adb-journey-footer">' +

          '<p class="adb-journey-disclaimer">' +

            escapeHtml(
              renderData.disclaimer ||
              DEFAULT_DISCLAIMER
            ) +

            " The current calculator does not apply the bilateral factor, SMC, DIC, retroactive benefits, retirement-pay offsets, or claim adjudication." +

          "</p>" +


          '<div class="adb-journey-logo">' +

            '<div class="adb-journey-logo-main">' +
              "THEWING.AI" +
            "</div>" +

            '<div class="adb-journey-logo-sub">' +
              "People • Plan • Progress" +
            "</div>" +

          "</div>" +


        "</div>" +


      "</div>";


    return body;

  }


  /* ============================================================
    11. COMBINED RATING BRIEF
  ============================================================ */

  function renderCombinedRating(
    data,
    renderData
  ) {

    const pills =
      data
        .ratingsSorted
        .length

        ? data
            .ratingsSorted
            .map(
              rating => (

                '<div class="adb-rating-pill">' +

                  escapeHtml(
                    formatPercent(
                      rating
                    )
                  ) +

                "</div>"

              )
            )
            .join(
              ""
            )

        : (
            '<div class="adb-rating-pill">' +
              "0%" +
            "</div>"
          );


    const body =

      renderHeader({

        eyebrow:
          "Combined Rating Intelligence",

        title:
          renderData.title ||
          "How Your Ratings Combine",

        subtitle:
          renderData.subtitle ||
          "The current rating order and combined value returned by the Disability Calculator."

      }) +


      '<div class="adb-card adb-card-gold">' +

        '<p class="adb-section-title">' +
          "Ratings Applied Highest to Lowest" +
        "</p>" +

        '<div class="adb-rating-pills">' +
          pills +
        "</div>" +

        '<div class="adb-arrow-line">' +
          "↓ Whole-Person Combination ↓" +
        "</div>" +


        '<div class="adb-grid">' +

          "<div>" +

            '<p class="adb-label">' +
              "Combined Value" +
            "</p>" +

            '<div class="adb-hero-value">' +

              escapeHtml(
                formatPercent(
                  data.combinedValue
                )
              ) +

            "</div>" +

          "</div>" +


          "<div>" +

            '<p class="adb-label">' +
              "Estimated Official VA Rating" +
            "</p>" +

            '<div class="adb-hero-value" style="color:var(--adb-mint)">' +

              escapeHtml(
                formatPercent(
                  data.officialRating
                )
              ) +

            "</div>" +

          "</div>" +

        "</div>" +


      "</div>" +


      '<section class="adb-section">' +

        renderRows([

          renderRow(
            "Highest Individual Rating",
            formatPercent(
              data.highestRating
            )
          ),

          renderRow(
            "Remaining Efficiency",
            formatPercent(
              data.remainingEfficiency
            ),
            "mint"
          ),

          renderRow(
            "Calculation Rule",
            data.ruleVersion ||
            "38 CFR § 4.25"
          )

        ]) +

      "</section>" +


      renderInfo(
        "The ratings shown here come directly from the current calculator state. This Brief does not independently combine them."
      ) +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    12. WHOLE PERSON BRIEF
  ============================================================ */

  function renderWholePerson(
    data,
    renderData
  ) {

    const combined =
      finiteNumber(
        data.combinedValue
      ) ||
      0;


    const remaining =
      finiteNumber(
        data.remainingEfficiency
      ) ||
      0;


    const contributionChips =
      data.steps.length

        ? data
            .steps
            .map(
              step => (

                '<span class="adb-chip">' +

                  "Disability " +

                  escapeHtml(
                    step.sourceIndex ||
                    step.index ||
                    ""
                  ) +

                  ": " +

                  escapeHtml(
                    formatPercent(
                      step.contribution
                    )
                  ) +

                  " contribution" +

                "</span>"

              )
            )
            .join(
              ""
            )

        : (
            '<span class="adb-chip">' +
              "No positive rating steps" +
            "</span>"
          );


    const body =

      renderHeader({

        eyebrow:
          "Whole Person Method",

        title:
          renderData.title ||
          "Your Remaining Efficiency",

        subtitle:
          renderData.subtitle ||
          "A visual explanation of the whole-person picture returned by the current calculator result."

      }) +


      '<div class="adb-grid">' +


        '<div class="adb-card adb-card-gold">' +

          '<p class="adb-label">' +
            "Combined Disability" +
          "</p>" +

          '<div class="adb-hero-value">' +

            escapeHtml(
              formatPercent(
                combined
              )
            ) +

          "</div>" +

          renderMeter(
            combined,
            "0% combined",
            formatPercent(
              combined
            ),
            "gold"
          ) +

        "</div>" +


        '<div class="adb-card">' +

          '<p class="adb-label">' +
            "Efficiency Remaining" +
          "</p>" +

          '<div class="adb-hero-value" style="color:var(--adb-mint)">' +

            escapeHtml(
              formatPercent(
                remaining
              )
            ) +

          "</div>" +

          renderMeter(
            remaining,
            "0% remaining",
            formatPercent(
              remaining
            )
          ) +

        "</div>" +


      "</div>" +


      '<section class="adb-section">' +

        '<p class="adb-section-title">' +
          "Displayed Contributions" +
        "</p>" +

        '<div class="adb-chip-row">' +
          contributionChips +
        "</div>" +

      "</section>" +


      renderInfo(
        "Whole-person math means additional ratings operate on the efficiency remaining at that point. Amy and this Brief use the calculator's displayed contributions and remaining-efficiency values rather than recalculating them."
      ) +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    13. RATING STEPS BRIEF
  ============================================================ */

  function renderRatingSteps(
    data,
    renderData
  ) {

    const steps =
      data.steps.length

        ? data
            .steps
            .map(
              step => {

                const index =
                  step.index ||
                  "—";


                const rating =
                  formatPercent(
                    step.rating
                  );


                const contribution =
                  formatPercent(
                    step.contribution
                  );


                const combined =
                  formatPercent(
                    step.combined
                  );


                const remaining =
                  formatPercent(
                    step.remainingAfter
                  );


                const before =
                  formatPercent(
                    step.remainingBefore
                  );


                return (

                  '<div class="adb-step">' +

                    '<div class="adb-step-index">' +
                      escapeHtml(
                        index
                      ) +
                    "</div>" +


                    "<div>" +

                      '<div class="adb-step-title">' +

                        "Disability " +

                        escapeHtml(
                          step.sourceIndex ||
                          index
                        ) +

                        " • " +

                        escapeHtml(
                          rating
                        ) +

                      "</div>" +


                      '<div class="adb-step-copy">' +

                        "Remaining before: " +

                        escapeHtml(
                          before
                        ) +

                        " • Displayed contribution: " +

                        escapeHtml(
                          contribution
                        ) +

                      "</div>" +

                    "</div>" +


                    '<div class="adb-step-result">' +

                      '<div class="adb-step-result-main">' +
                        escapeHtml(
                          combined
                        ) +
                      "</div>" +

                      '<div class="adb-step-result-sub">' +

                        escapeHtml(
                          remaining
                        ) +

                        " remaining" +

                      "</div>" +

                    "</div>" +


                  "</div>"

                );

              }
            )
            .join(
              ""
            )

        : (
            '<div class="adb-card">' +

              '<p class="adb-note">' +
                "No positive disability-rating steps are present in the current calculator state." +
              "</p>" +

            "</div>"
          );


    const body =

      renderHeader({

        eyebrow:
          "Calculation Steps",

        title:
          renderData.title ||
          "How Your Rating Builds",

        subtitle:
          renderData.subtitle ||
          "Each whole-person step exactly as supplied by the Disability Calculator."

      }) +


      '<div class="adb-step-list">' +

        steps +

      "</div>" +


      '<section class="adb-section">' +

        renderRows([

          renderRow(
            "Final Combined Value",
            formatPercent(
              data.combinedValue
            ),
            "mint"
          ),

          renderRow(
            "Estimated Official Rating",
            formatPercent(
              data.officialRating
            ),
            "gold"
          ),

          renderRow(
            "Remaining Efficiency",
            formatPercent(
              data.remainingEfficiency
            )
          )

        ]) +

      "</section>" +


      renderInfo(
        "Each contribution, combined value, and remaining-efficiency value shown above is copied from the authoritative calculator step data."
      ) +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    14. FINAL ROUNDING BRIEF
  ============================================================ */

  function renderFinalRounding(
    data,
    renderData
  ) {

    const body =

      renderHeader({

        eyebrow:
          "Final VA Rounding",

        title:
          renderData.title ||
          "Combined Value vs. Estimated VA Rating",

        subtitle:
          renderData.subtitle ||
          "The calculator keeps the combined result separate from the final estimated VA rating."

      }) +


      '<div class="adb-card adb-card-gold">' +

        '<div class="adb-compare">' +


          '<div class="adb-compare-box">' +

            '<div class="adb-compare-label">' +
              "Combined Value" +
            "</div>" +

            '<div class="adb-compare-value">' +

              escapeHtml(
                formatPercent(
                  data.combinedValue
                )
              ) +

            "</div>" +

          "</div>" +


          '<div class="adb-compare-arrow">' +
            "→" +
          "</div>" +


          '<div class="adb-compare-box">' +

            '<div class="adb-compare-label">' +
              "Estimated Official VA Rating" +
            "</div>" +

            '<div class="adb-compare-value">' +

              escapeHtml(
                formatPercent(
                  data.officialRating
                )
              ) +

            "</div>" +

          "</div>" +


        "</div>" +

      "</div>" +


      '<section class="adb-section">' +

        renderRows([

          renderRow(
            "Highest Rating",
            formatPercent(
              data.highestRating
            )
          ),

          renderRow(
            "Combined Value Before Final Rounding",
            formatPercent(
              data.combinedValue
            ),
            "mint"
          ),

          renderRow(
            "Calculator's Final Rating",
            formatPercent(
              data.officialRating
            ),
            "gold"
          )

        ]) +

      "</section>" +


      renderInfo(
        "The Disability Calculator performs its final nearest-10 step after the displayed ratings have combined. This Brief repeats the calculator's final result and does not independently rerun the rounding math."
      ) +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    15. COMPENSATION BRIEF
  ============================================================ */

  function renderCompensation(
    data,
    renderData
  ) {

    const compensation =
      data.compensation;


    const base =
      formatMoney2(
        compensation.baseMonthlyVA
      );


    const childUnder =
      formatMoney2(
        compensation
          .addedChildrenUnder18
      );


    const childSchool =
      formatMoney2(
        compensation
          .addedChildrenInSchoolOver18
      );


    const body =

      renderHeader({

        eyebrow:
          "VA Compensation",

        title:
          renderData.title ||
          "Your Estimated Monthly Compensation",

        subtitle:
          renderData.subtitle ||
          "The standard monthly VA compensation currently returned by the calculator."

      }) +


      '<div class="adb-grid">' +


        '<div class="adb-card adb-card-gold">' +

          '<p class="adb-label">' +
            "Estimated Monthly VA" +
          "</p>" +

          '<div class="adb-hero-value">' +

            escapeHtml(
              formatMoney2(
                compensation.monthlyVA
              )
            ) +

          "</div>" +

          '<p class="adb-note">' +
            "Standard monthly estimate shown by the current calculator result." +
          "</p>" +

        "</div>" +


        renderRows([

          renderRow(
            "Estimated VA Rating",
            formatPercent(
              data.officialRating
            ),
            "mint"
          ),

          renderRow(
            "Dependent Profile",
            getDependentLabel(
              data
            )
          ),

          renderRow(
            "Base Monthly Amount",
            base
          ),

          renderRow(
            "Added Children Under 18",
            childUnder
          ),

          renderRow(
            "Added Children 18+ in School",
            childSchool
          ),

          renderRow(
            "Rate Version",
            compensation.rateVersion ||
            data.rateVersion ||
            "—"
          )

        ]) +


      "</div>" +


      renderInfo(
        compensationDependencyNote(
          data
        )
      ) +


      '<div class="adb-chip-row">' +

        '<span class="adb-chip" data-accent="gold">' +
          "No SMC" +
        "</span>" +

        '<span class="adb-chip">' +
          "No retro pay" +
        "</span>" +

        '<span class="adb-chip">' +
          "No retirement offset logic" +
        "</span>" +

      "</div>" +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    16. DEPENDENTS BRIEF
  ============================================================ */

  function renderDependents(
    data,
    renderData
  ) {

    const deps =
      data.dependents;


    const spouse =
      deps.spouse === true
        ? "Yes"
        : "No";


    const body =

      renderHeader({

        eyebrow:
          "Dependent Profile",

        title:
          renderData.title ||
          "Your Compensation Dependents",

        subtitle:
          renderData.subtitle ||
          "The dependent profile currently supplied to the Disability Calculator's standard compensation estimate."

      }) +


      '<div class="adb-card adb-card-gold">' +

        '<p class="adb-label">' +
          "Current Profile" +
        "</p>" +

        '<div class="adb-value adb-value-gold">' +

          escapeHtml(
            getDependentLabel(
              data
            )
          ) +

        "</div>" +


        '<div class="adb-dep-grid" style="margin-top:14px">' +


          '<div class="adb-dep">' +

            '<div class="adb-dep-label">' +
              "Spouse" +
            "</div>" +

            '<div class="adb-dep-value">' +
              escapeHtml(
                spouse
              ) +
            "</div>" +

          "</div>" +


          '<div class="adb-dep">' +

            '<div class="adb-dep-label">' +
              "Children Under 18" +
            "</div>" +

            '<div class="adb-dep-value">' +

              escapeHtml(
                dependentCount(
                  deps.childrenUnder18
                )
              ) +

            "</div>" +

          "</div>" +


          '<div class="adb-dep">' +

            '<div class="adb-dep-label">' +
              "18+ In School" +
            "</div>" +

            '<div class="adb-dep-value">' +

              escapeHtml(
                dependentCount(
                  deps.childrenInSchoolOver18
                )
              ) +

            "</div>" +

          "</div>" +


          '<div class="adb-dep">' +

            '<div class="adb-dep-label">' +
              "Dependent Parents" +
            "</div>" +

            '<div class="adb-dep-value">' +

              escapeHtml(
                dependentCount(
                  deps.dependentParents
                )
              ) +

            "</div>" +

          "</div>" +


        "</div>" +

      "</div>" +


      '<section class="adb-section">' +

        renderRows([

          renderRow(
            "Estimated VA Rating",
            formatPercent(
              data.officialRating
            ),
            "mint"
          ),

          renderRow(
            "Estimated Monthly VA",
            formatMoney2(
              data
                .compensation
                .monthlyVA
            ),
            "gold"
          ),

          renderRow(
            "Dependent Status Key",
            data
              .compensation
              .dependentStatusKey ||
            "—"
          )

        ]) +

      "</section>" +


      renderInfo(
        compensationDependencyNote(
          data
        )
      ) +


      renderDisclaimer(
        renderData.disclaimer
      );


    return renderWrapper(
      body
    );

  }


  /* ============================================================
    17. RENDER ROUTER
  ============================================================ */

  function paint(
    renderData
  ) {

    if (
      !rootEl ||
      !renderData ||
      !renderData.disability
    ) {

      return setEmptyState();

    }


    const data =
      renderData.disability;


    if (
      !isAuthoritativeSnapshot(
        data
      )
    ) {

      return setEmptyState();

    }


    let html =
      "";


    switch (
      renderData.type
    ) {


      case "combined_rating":

        html =
          renderCombinedRating(
            data,
            renderData
          );

        break;


      case "whole_person":

        html =
          renderWholePerson(
            data,
            renderData
          );

        break;


      case "rating_steps":

        html =
          renderRatingSteps(
            data,
            renderData
          );

        break;


      case "final_rounding":

        html =
          renderFinalRounding(
            data,
            renderData
          );

        break;


      case "compensation":

        html =
          renderCompensation(
            data,
            renderData
          );

        break;


      case "dependents":

        html =
          renderDependents(
            data,
            renderData
          );

        break;


      case "explain_estimate":
      default:

        html =
          renderDisabilityJourney(
            data,
            renderData
          );

        break;

    }


    return setCardHtml(
      html
    );

  }


  /* ============================================================
    18. INITIALIZE
  ============================================================ */

  function initialize(
    container
  ) {

    try {

      const host =
        typeof container ===
          "string"

          ? document.querySelector(
              container
            )

          : container;


      if (
        !host ||
        !(host instanceof Element)
      ) {

        console.warn(
          "TheWing Amy Disability Brief: initialize() requires a valid container."
        );

        return null;

      }


      if (
        mountedContainer &&
        mountedContainer !==
          host
      ) {

        destroy();

      }


      ensureStyles();


      const existing =
        host.querySelector(
          "#" +
          ROOT_ID
        );


      if (
        existing
      ) {

        rootEl =
          existing;

        mountedContainer =
          host;

        currentData =
          null;

        setEmptyState();

        return rootEl;

      }


      rootEl =
        buildShell();


      host.appendChild(
        rootEl
      );


      mountedContainer =
        host;


      mountedContainer.setAttribute(
        "data-visible",
        "0"
      );


      currentData =
        null;


      return rootEl;

    } catch (
      error
    ) {

      console.warn(
        "TheWing Amy Disability Brief: initialize() failed.",
        error
      );

      return null;

    }

  }


  /* ============================================================
    19. RENDER
  ============================================================ */

  function render(
    data
  ) {

    try {

      if (
        !rootEl
      ) {

        console.warn(
          "TheWing Amy Disability Brief: render() called before initialize()."
        );

        return null;

      }


      const normalized =
        normalizeRenderData(
          data
        );


      if (
        !normalized
      ) {

        currentData =
          null;

        return setEmptyState();

      }


      currentData =
        normalized;


      return paint(
        normalized
      );

    } catch (
      error
    ) {

      console.warn(
        "TheWing Amy Disability Brief: render() failed.",
        error
      );


      currentData =
        null;


      return setEmptyState();

    }

  }


  /* ============================================================
    20. UPDATE
  ============================================================ */

  function update(
    patch
  ) {

    try {

      if (
        !isPlainObject(
          patch
        )
      ) {

        return render(
          patch
        );

      }


      if (
        !currentData
      ) {

        return render(
          patch
        );

      }


      const previousRaw =
        isPlainObject(
          currentData.raw
        )
          ? clone(
              currentData.raw,
              {}
            )
          : {};


      const merged =
        {
          ...previousRaw,
          ...patch
        };


      if (
        isPlainObject(
          previousRaw.disability
        ) &&
        isPlainObject(
          patch.disability
        )
      ) {

        merged.disability =
          {
            ...previousRaw.disability,
            ...patch.disability
          };

      }


      return render(
        merged
      );

    } catch (
      error
    ) {

      console.warn(
        "TheWing Amy Disability Brief: update() failed.",
        error
      );

      return null;

    }

  }


  /* ============================================================
    21. CLEAR
  ============================================================ */

  function clear() {

    currentData =
      null;


    if (
      !rootEl
    ) {

      return;

    }


    setEmptyState();

  }


  /* ============================================================
    22. DESTROY
  ============================================================ */

  function destroy() {

    try {

      if (
        rootEl &&
        rootEl.parentNode
      ) {

        rootEl.parentNode.removeChild(
          rootEl
        );

      }

    } catch (_) {

      /* Safe repeated destroy */

    }


    if (
      mountedContainer
    ) {

      mountedContainer.setAttribute(
        "data-visible",
        "0"
      );

    }


    rootEl =
      null;


    mountedContainer =
      null;


    currentData =
      null;

  }


  /* ============================================================
    23. GETTERS
  ============================================================ */

  function getData() {

    return clone(
      currentData,
      null
    );

  }


  function getType() {

    return (
      currentData
        ?.type ||
      null
    );

  }


  function isMounted() {

    return Boolean(
      rootEl &&
      rootEl.isConnected
    );

  }


  /* ============================================================
    24. INTENT RENDERING
  ============================================================ */

  function renderFromIntent(
    intent,
    disability
  ) {

    const type =
      normalizeType(
        intent,
        ""
      );


    if (
      !type
    ) {

      clear();

      return null;

    }


    return render({

      type,

      disability

    });

  }


  function renderFromResponse(
    response,
    disability
  ) {

    if (
      !isPlainObject(
        response
      )
    ) {

      clear();

      return null;

    }


    const intent =
      normalizeType(
        response.intent,
        ""
      );


    /*
      These server intents intentionally do NOT create
      a Disability HUD:

      - greeting
      - capabilities
      - bilateral_factor
      - disability_concept
      - out_of_scope
    */

    if (
      !intent
    ) {

      clear();

      return null;

    }


    return render({

      type:
        intent,

      disability

    });

  }


  /* ============================================================
    25. GLOBAL API
  ============================================================ */

  window.TheWingAmyDisabilityBrief =
    Object.freeze({

      version:
        VERSION,


      supportedTypes:
        Array.from(
          SUPPORTED_TYPES
        ),


      initialize,


      render,


      update,


      clear,


      destroy,


      getData,


      getType,


      isMounted,


      renderFromIntent,


      renderFromResponse

    });


  /* ============================================================
    26. READY EVENT
  ============================================================ */

  try {

    window.dispatchEvent(

      new CustomEvent(
        "thewing:amy-disability-brief-ready",
        {

          detail: {

            version:
              VERSION,

            api:
              window
                .TheWingAmyDisabilityBrief

          }

        }
      )

    );

  } catch (_) {

    /* Fail open */

  }

})();
