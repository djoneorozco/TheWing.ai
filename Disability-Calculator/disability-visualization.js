/* ============================================================
  THEWING.AI • VA DISABILITY VISUALIZATION
  Disability-Calculator/disability-visualization.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Interactive visual explanation of how the CURRENT Disability
  Calculator ratings combine under the calculator's whole-person
  calculation.

  TRIGGER
  -------------------------------------------------------------
  Intended for:

    "How Did My Ratings Combine?"

  / intent:

    combined_rating

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing calculates.
  Amy explains.
  The browser renders.

  IMPORTANT
  -------------------------------------------------------------
  THIS FILE DOES NOT CALCULATE VA RATINGS.

  It does NOT:
  - combine ratings
  - calculate contributions
  - calculate remaining efficiency
  - calculate final VA rounding
  - calculate compensation
  - calculate bilateral factor

  It ONLY visualizes the authoritative values already supplied
  by disability.js:

    ratingsSorted
    combinedValue
    officialRating
    remainingEfficiency
    steps[]

  Each step already contains:

    rating
    previousCombined
    remainingBefore
    rawContribution
    contribution
    rawCombined
    combined
    remainingAfter
============================================================ */

(function () {
  "use strict";


  /* ============================================================
    1. GUARD / CONFIG
  ============================================================ */

  if (
    window.__THEWING_DISABILITY_VISUALIZATION_V100
  ) {
    return;
  }

  window.__THEWING_DISABILITY_VISUALIZATION_V100 =
    true;


  const VERSION =
    "disability-visualization-1.0.0";

  const ROOT_ID =
    "thewing-disability-visualization";

  const STYLE_ID =
    "thewing-disability-visualization-styles-v100";

  const SUPPORTED_INTENT =
    "combined_rating";

  const AUTO_PLAY_DELAY =
    500;

  const STEP_DELAY =
    1450;


  let mountedContainer =
    null;

  let rootEl =
    null;

  let currentSnapshot =
    null;

  let currentStepIndex =
    -1;

  let playing =
    false;

  let timers =
    [];


  /* ============================================================
    2. HELPERS
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


  function isObject(
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


  function formatPoints(
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

    return number.toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          digits
      }
    );

  }


  function reducedMotion() {

    try {

      return Boolean(
        window.matchMedia &&
        window
          .matchMedia(
            "(prefers-reduced-motion: reduce)"
          )
          .matches
      );

    } catch (_) {

      return false;

    }

  }


  function clearTimers() {

    timers.forEach(
      timer =>
        clearTimeout(
          timer
        )
    );

    timers =
      [];

  }


  function later(
    callback,
    delay
  ) {

    const timer =
      setTimeout(
        callback,
        delay
      );

    timers.push(
      timer
    );

    return timer;

  }


  /* ============================================================
    3. SNAPSHOT NORMALIZATION
  ============================================================ */

  function normalizeStep(
    raw
  ) {

    if (
      !isObject(
        raw
      )
    ) {

      return null;

    }


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


  function normalizeSnapshot(
    raw
  ) {

    if (
      !isObject(
        raw
      )
    ) {

      return null;

    }


    const ratingsSorted =
      Array.isArray(
        raw.ratingsSorted
      )
        ? raw
            .ratingsSorted
            .map(
              finiteNumber
            )
            .filter(
              value =>
                value !== null
            )
        : [];


    const steps =
      Array.isArray(
        raw.steps
      )
        ? raw
            .steps
            .map(
              normalizeStep
            )
            .filter(
              Boolean
            )
        : [];


    return {

      runtimeVersion:
        clean(
          raw.runtimeVersion
        ),

      ruleVersion:
        clean(
          raw.ruleVersion
        ),

      ratingsSorted,

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

      steps

    };

  }


  function validSnapshot(
    data
  ) {

    return Boolean(

      isObject(
        data
      ) &&

      Array.isArray(
        data.steps
      ) &&

      finiteNumber(
        data.combinedValue
      ) !== null &&

      finiteNumber(
        data.officialRating
      ) !== null &&

      finiteNumber(
        data.remainingEfficiency
      ) !== null

    );

  }


  /* ============================================================
    4. COLORS / STEP CLASSES
  ============================================================ */

  function stepTone(
    index
  ) {

    const tones =
      [
        "mint",
        "blue",
        "violet",
        "gold",
        "cyan",
        "rose"
      ];

    return tones[
      index %
      tones.length
    ];

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
--dv-ink:#f4f8fb;
--dv-soft:#d6e5ef;
--dv-muted:rgba(194,215,230,.70);
--dv-muted2:rgba(194,215,230,.48);
--dv-line:rgba(176,211,234,.16);
--dv-line-strong:rgba(159,227,212,.30);
--dv-gold:#efd18a;
--dv-gold2:#ffe3a1;
--dv-mint:#9fe3d4;
--dv-blue:#76bdf5;
--dv-violet:#bda9f5;
--dv-cyan:#7dd7dc;
--dv-rose:#e3a7bc;
--dv-panel:rgba(9,35,54,.86);
--dv-card:rgba(18,55,80,.62);

position:relative;
width:100%;
min-width:0;
color:var(--dv-ink);

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

.dv-shell{
position:relative;
overflow:hidden;

border:
1px solid rgba(177,211,232,.20);

border-radius:
22px;

background:
radial-gradient(
600px 320px at 0% 0%,
rgba(68,151,190,.18),
transparent 65%
),
radial-gradient(
500px 250px at 100% 0%,
rgba(239,209,138,.10),
transparent 67%
),
linear-gradient(
150deg,
rgba(25,65,93,.94),
rgba(7,30,48,.96)
);

box-shadow:
0 20px 45px rgba(2,12,24,.28),
inset 0 1px 0 rgba(255,255,255,.055)
}

.dv-shell:before{
content:"";

position:absolute;
inset:0;

pointer-events:none;

background:
linear-gradient(
180deg,
rgba(255,255,255,.035),
transparent 34%
)
}

.dv-inner{
position:relative;
z-index:2;

padding:
22px
}


/* ============================================================
   HEADER
============================================================ */

.dv-header{
display:flex;
align-items:flex-start;
justify-content:space-between;

gap:
18px;

margin-bottom:
18px
}

.dv-kicker{
margin:
0 0 5px;

color:
var(--dv-gold);

font-size:
9px;

font-weight:
900;

letter-spacing:
.15em;

text-transform:
uppercase
}

.dv-title{
margin:0;

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
30px;

line-height:
1.05;

font-weight:
400;

color:
#f8fbfd
}

.dv-sub{
max-width:
720px;

margin:
7px 0 0;

color:
var(--dv-muted);

font-size:
12px;

line-height:
1.5;

font-weight:
600
}

.dv-brand{
flex:
0 0 auto;

text-align:
right
}

.dv-brand-main{
color:
var(--dv-gold2);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:
18px
}

.dv-brand-sub{
margin-top:
4px;

color:
var(--dv-muted2);

font-size:
7px;

font-weight:
900;

letter-spacing:
.15em;

text-transform:
uppercase
}


/* ============================================================
   TOP RESULT BAR
============================================================ */

.dv-summary{
display:grid;

grid-template-columns:
repeat(
3,
minmax(0,1fr)
);

gap:
10px;

margin-bottom:
15px
}

.dv-summary-card{
padding:
13px 14px;

border:
1px solid var(--dv-line);

border-radius:
14px;

background:
rgba(13,45,68,.52)
}

.dv-summary-label{
color:
var(--dv-muted);

font-size:
8px;

font-weight:
900;

letter-spacing:
.08em;

text-transform:
uppercase
}

.dv-summary-value{
margin-top:
5px;

color:
var(--dv-mint);

font-size:
21px;

font-weight:
900;

font-variant-numeric:
tabular-nums
}

.dv-summary-card[data-accent="gold"]
.dv-summary-value{
color:
var(--dv-gold2)
}


/* ============================================================
   RATING PILLS
============================================================ */

.dv-rating-row{
display:flex;
flex-wrap:wrap;

gap:
7px;

margin-bottom:
15px
}

.dv-rating-pill{
display:inline-flex;
align-items:center;

padding:
8px 11px;

border:
1px solid rgba(118,189,245,.22);

border-radius:
999px;

background:
rgba(15,49,73,.55);

color:
var(--dv-blue);

font-size:
11px;

font-weight:
900
}


/* ============================================================
   WHOLE PERSON VISUAL
============================================================ */

.dv-person-panel{
padding:
18px;

border:
1px solid var(--dv-line);

border-radius:
18px;

background:
rgba(5,29,47,.42)
}

.dv-panel-head{
display:flex;
align-items:flex-end;
justify-content:space-between;

gap:
14px;

margin-bottom:
12px
}

.dv-panel-title{
margin:0;

color:
var(--dv-soft);

font-size:
11px;

font-weight:
900;

letter-spacing:
.08em;

text-transform:
uppercase
}

.dv-panel-value{
color:
var(--dv-gold2);

font-size:
15px;

font-weight:
900
}

.dv-whole-track{
position:relative;

display:flex;

width:100%;
height:66px;

overflow:hidden;

border:
1px solid rgba(183,211,232,.20);

border-radius:
15px;

background:
rgba(3,24,39,.72)
}

.dv-segment{
position:relative;

display:flex;
align-items:center;
justify-content:center;

width:0;

min-width:0;

overflow:hidden;

transition:
width .65s cubic-bezier(.22,.8,.3,1);

border-right:
1px solid rgba(255,255,255,.12)
}

.dv-segment:last-child{
border-right:0
}

.dv-segment-label{
padding:
0 8px;

overflow:hidden;

color:
#061d2d;

font-size:
10px;

font-weight:
900;

text-align:center;

text-overflow:
ellipsis;

white-space:
nowrap
}

.dv-tone-mint{
background:
linear-gradient(
180deg,
#b1ecdf,
#76cbbb
)
}

.dv-tone-blue{
background:
linear-gradient(
180deg,
#8bcafa,
#559ed8
)
}

.dv-tone-violet{
background:
linear-gradient(
180deg,
#cabafa,
#9d87df
)
}

.dv-tone-gold{
background:
linear-gradient(
180deg,
#ffe3a1,
#dcb55e
)
}

.dv-tone-cyan{
background:
linear-gradient(
180deg,
#9ce5e7,
#63c1c7
)
}

.dv-tone-rose{
background:
linear-gradient(
180deg,
#edbfd0,
#cf8fa8
)
}

.dv-segment-remaining{
background:
repeating-linear-gradient(
-45deg,
rgba(152,183,203,.11),
rgba(152,183,203,.11) 8px,
rgba(152,183,203,.04) 8px,
rgba(152,183,203,.04) 16px
);

color:
var(--dv-muted)
}

.dv-segment-remaining
.dv-segment-label{
color:
var(--dv-muted)
}

.dv-track-legend{
display:flex;
align-items:center;
justify-content:space-between;

gap:
12px;

margin-top:
8px;

color:
var(--dv-muted2);

font-size:
8px;

font-weight:
800;

text-transform:
uppercase
}


/* ============================================================
   CURRENT EXPLANATION
============================================================ */

.dv-explanation{
margin-top:
13px;

padding:
14px;

border:
1px solid var(--dv-line);

border-radius:
14px;

background:
linear-gradient(
180deg,
rgba(17,55,79,.56),
rgba(8,34,52,.58)
)
}

.dv-explanation-step{
color:
var(--dv-gold);

font-size:
8px;

font-weight:
900;

letter-spacing:
.12em;

text-transform:
uppercase
}

.dv-explanation-title{
margin-top:
5px;

color:
var(--dv-ink);

font-size:
15px;

font-weight:
900
}

.dv-explanation-copy{
margin-top:
5px;

color:
var(--dv-muted);

font-size:
11px;

line-height:
1.5;

font-weight:
600
}

.dv-equation{
display:flex;
align-items:center;
flex-wrap:wrap;

gap:
6px;

margin-top:
10px
}

.dv-eq-piece{
display:inline-flex;
align-items:center;

min-height:
29px;

padding:
0 9px;

border:
1px solid var(--dv-line);

border-radius:
9px;

background:
rgba(2,24,39,.35);

color:
var(--dv-soft);

font-size:
10px;

font-weight:
900;

font-variant-numeric:
tabular-nums
}

.dv-eq-op{
color:
var(--dv-gold);

font-size:
13px;

font-weight:
900
}


/* ============================================================
   STEP TIMELINE
============================================================ */

.dv-step-grid{
display:grid;

grid-template-columns:
repeat(
auto-fit,
minmax(150px,1fr)
);

gap:
8px;

margin-top:
14px
}

.dv-step-card{
position:relative;

padding:
12px;

border:
1px solid var(--dv-line);

border-radius:
13px;

background:
rgba(11,43,65,.48);

opacity:
.48;

transition:
opacity .25s ease,
border-color .25s ease,
transform .25s ease,
background .25s ease
}

.dv-step-card[data-active="1"]{
opacity:
1;

border-color:
rgba(159,227,212,.38);

background:
rgba(20,62,86,.70);

transform:
translateY(-1px)
}

.dv-step-card[data-complete="1"]{
opacity:
.88
}

.dv-step-number{
width:
26px;
height:
26px;

display:flex;
align-items:center;
justify-content:center;

border:
1px solid rgba(159,227,212,.26);

border-radius:
50%;

color:
var(--dv-mint);

font-size:
9px;

font-weight:
900
}

.dv-step-rating{
margin-top:
8px;

color:
var(--dv-ink);

font-size:
17px;

font-weight:
900
}

.dv-step-meta{
margin-top:
5px;

color:
var(--dv-muted);

font-size:
8px;

line-height:
1.45;

font-weight:
700
}

.dv-step-combined{
margin-top:
8px;

color:
var(--dv-gold2);

font-size:
12px;

font-weight:
900
}


/* ============================================================
   FINAL ROUNDING
============================================================ */

.dv-final{
display:grid;

grid-template-columns:
1fr auto 1fr;

align-items:center;

gap:
12px;

margin-top:
14px;

padding:
14px;

border:
1px solid rgba(240,204,116,.23);

border-radius:
15px;

background:
radial-gradient(
280px 120px at 100% 0%,
rgba(239,209,138,.08),
transparent 70%
),
rgba(8,31,47,.55)
}

.dv-final-box{
text-align:center
}

.dv-final-label{
color:
var(--dv-muted);

font-size:
8px;

font-weight:
900;

text-transform:
uppercase
}

.dv-final-value{
margin-top:
4px;

color:
var(--dv-mint);

font-size:
27px;

font-weight:
900
}

.dv-final-box:last-child
.dv-final-value{
color:
var(--dv-gold2)
}

.dv-final-arrow{
color:
var(--dv-gold);

font-size:
27px;

font-weight:
900
}


/* ============================================================
   CONTROLS
============================================================ */

.dv-controls{
display:flex;
align-items:center;
flex-wrap:wrap;

gap:
8px;

margin-top:
14px
}

.dv-btn{
appearance:none;

min-height:
38px;

padding:
0 13px;

border:
1px solid var(--dv-line);

border-radius:
999px;

background:
rgba(17,50,74,.72);

color:
var(--dv-soft);

font-size:
9px;

font-weight:
900;

letter-spacing:
.05em;

cursor:pointer;

transition:
.18s ease
}

.dv-btn:hover{
border-color:
var(--dv-line-strong);

background:
rgba(159,227,212,.09);

color:
#fff
}

.dv-btn-primary{
border-color:
rgba(240,204,116,.32);

background:
linear-gradient(
180deg,
rgba(239,209,138,.98),
rgba(202,163,88,.98)
);

color:
#152333
}

.dv-btn-primary:hover{
color:
#152333;

filter:
brightness(1.05)
}

.dv-btn:disabled{
opacity:
.42;

cursor:
default
}

.dv-note{
margin:
13px 0 0;

color:
var(--dv-muted2);

font-size:
8px;

line-height:
1.5;

font-weight:
600
}


/* ============================================================
   RESPONSIVE
============================================================ */

@media(max-width:760px){

.dv-header{
display:block
}

.dv-brand{
margin-top:
10px;

text-align:left
}

.dv-summary{
grid-template-columns:
1fr
}

.dv-whole-track{
height:
58px
}

.dv-segment-label{
font-size:
8px
}

}


@media(max-width:520px){

.dv-inner{
padding:
15px
}

.dv-title{
font-size:
25px
}

.dv-final{
grid-template-columns:
1fr
}

.dv-final-arrow{
transform:
rotate(90deg);

text-align:center
}

}

@media(prefers-reduced-motion:reduce){

.dv-segment,
.dv-step-card{
transition:none
}

}

`;


    document.head.appendChild(
      style
    );

  }


  /* ============================================================
    6. ROOT
  ============================================================ */

  function buildRoot() {

    const section =
      document.createElement(
        "section"
      );


    section.id =
      ROOT_ID;


    section.dataset.empty =
      "1";


    section.dataset.version =
      VERSION;


    section.setAttribute(
      "aria-label",
      "VA disability whole person visualization"
    );


    return section;

  }


  function setVisible(
    visible
  ) {

    if (
      !rootEl
    ) {

      return;
    }


    rootEl.dataset.empty =
      visible
        ? "0"
        : "1";


    if (
      mountedContainer
    ) {

      mountedContainer.setAttribute(
        "data-visible",
        visible
          ? "1"
          : "0"
      );

    }

  }


  /* ============================================================
    7. STATIC HTML
  ============================================================ */

  function ratingPillsHtml(
    data
  ) {

    if (
      !data.ratingsSorted.length
    ) {

      return (
        '<span class="dv-rating-pill">No positive ratings</span>'
      );

    }


    return data
      .ratingsSorted
      .map(
        (
          rating,
          index
        ) => (

          '<span class="dv-rating-pill">' +

            "Step " +
            (
              index +
              1
            ) +
            " • " +

            escapeHtml(
              formatPercent(
                rating
              )
            ) +

          "</span>"

        )
      )
      .join(
        ""
      );

  }


  function segmentHtml(
    step,
    index
  ) {

    const tone =
      stepTone(
        index
      );


    return (

      '<div class="dv-segment dv-tone-' +
        tone +
        '" ' +

        'data-dv-segment="' +
        index +
        '" ' +

        'style="width:0%">' +

        '<span class="dv-segment-label"></span>' +

      "</div>"

    );

  }


  function stepCardsHtml(
    data
  ) {

    return data.steps
      .map(
        (
          step,
          index
        ) => (

          '<article class="dv-step-card" ' +
            'data-dv-step-card="' +
            index +
            '" ' +
            'data-active="0" ' +
            'data-complete="0">' +

            '<div class="dv-step-number">' +
              escapeHtml(
                step.index ||
                (
                  index +
                  1
                )
              ) +
            "</div>" +

            '<div class="dv-step-rating">' +
              escapeHtml(
                formatPercent(
                  step.rating
                )
              ) +
            "</div>" +

            '<div class="dv-step-meta">' +

              "Remaining before: " +

              escapeHtml(
                formatPercent(
                  step.remainingBefore
                )
              ) +

              "<br>" +

              "Contribution: " +

              escapeHtml(
                formatPoints(
                  step.contribution
                )
              ) +

              " points" +

            "</div>" +

            '<div class="dv-step-combined">' +

              "Combined: " +

              escapeHtml(
                formatPercent(
                  step.combined
                )
              ) +

            "</div>" +

          "</article>"

        )
      )
      .join(
        ""
      );

  }


  function shellHtml(
    data
  ) {

    const segments =
      data.steps
        .map(
          segmentHtml
        )
        .join(
          ""
        );


    return (

      '<div class="dv-shell">' +

        '<div class="dv-inner">' +


          '<header class="dv-header">' +

            "<div>" +

              '<p class="dv-kicker">' +
                "38 CFR § 4.25 • Whole Person Visualizer" +
              "</p>" +

              '<h2 class="dv-title">' +
                "How Your Ratings Combine" +
              "</h2>" +

              '<p class="dv-sub">' +
                "Watch each disability consume part of the efficiency that remains. The values below come directly from your current Disability Calculator result." +
              "</p>" +

            "</div>" +

            '<div class="dv-brand">' +

              '<div class="dv-brand-main">' +
                "TheWing.ai" +
              "</div>" +

              '<div class="dv-brand-sub">' +
                "Disability Intelligence" +
              "</div>" +

            "</div>" +

          "</header>" +


          '<div class="dv-summary">' +

            '<div class="dv-summary-card">' +

              '<div class="dv-summary-label">' +
                "Highest Rating" +
              "</div>" +

              '<div class="dv-summary-value">' +
                escapeHtml(
                  formatPercent(
                    data.highestRating
                  )
                ) +
              "</div>" +

            "</div>" +

            '<div class="dv-summary-card">' +

              '<div class="dv-summary-label">' +
                "Combined Value" +
              "</div>" +

              '<div class="dv-summary-value">' +
                escapeHtml(
                  formatPercent(
                    data.combinedValue
                  )
                ) +
              "</div>" +

            "</div>" +

            '<div class="dv-summary-card" data-accent="gold">' +

              '<div class="dv-summary-label">' +
                "Estimated VA Rating" +
              "</div>" +

              '<div class="dv-summary-value">' +
                escapeHtml(
                  formatPercent(
                    data.officialRating
                  )
                ) +
              "</div>" +

            "</div>" +

          "</div>" +


          '<div class="dv-rating-row">' +
            ratingPillsHtml(
              data
            ) +
          "</div>" +


          '<section class="dv-person-panel">' +

            '<div class="dv-panel-head">' +

              '<h3 class="dv-panel-title">' +
                "100% Whole Person" +
              "</h3>" +

              '<div class="dv-panel-value" id="dv-current-status">' +
                "100% Efficient" +
              "</div>" +

            "</div>" +


            '<div class="dv-whole-track" id="dv-whole-track">' +

              segments +

              '<div class="dv-segment dv-segment-remaining" ' +
                'id="dv-remaining-segment" ' +
                'style="width:100%">' +

                '<span class="dv-segment-label">' +
                  "100% Remaining" +
                "</span>" +

              "</div>" +

            "</div>" +


            '<div class="dv-track-legend">' +

              "<span>" +
                "Disability contribution" +
              "</span>" +

              "<span>" +
                "Remaining efficiency" +
              "</span>" +

            "</div>" +


            '<div class="dv-explanation">' +

              '<div class="dv-explanation-step" id="dv-explain-step">' +
                "Start" +
              "</div>" +

              '<div class="dv-explanation-title" id="dv-explain-title">' +
                "Begin with a 100% whole person." +
              "</div>" +

              '<div class="dv-explanation-copy" id="dv-explain-copy">' +
                "Press Play Calculation to watch the calculator result build one disability at a time." +
              "</div>" +

              '<div class="dv-equation" id="dv-equation"></div>' +

            "</div>" +


            '<div class="dv-step-grid">' +

              stepCardsHtml(
                data
              ) +

            "</div>" +


            '<div class="dv-final">' +

              '<div class="dv-final-box">' +

                '<div class="dv-final-label">' +
                  "Combined Value" +
                "</div>" +

                '<div class="dv-final-value">' +
                  escapeHtml(
                    formatPercent(
                      data.combinedValue
                    )
                  ) +
                "</div>" +

              "</div>" +

              '<div class="dv-final-arrow">' +
                "→" +
              "</div>" +

              '<div class="dv-final-box">' +

                '<div class="dv-final-label">' +
                  "Estimated VA Rating" +
                "</div>" +

                '<div class="dv-final-value">' +
                  escapeHtml(
                    formatPercent(
                      data.officialRating
                    )
                  ) +
                "</div>" +

              "</div>" +

            "</div>" +


            '<div class="dv-controls">' +

              '<button type="button" ' +
                'class="dv-btn dv-btn-primary" ' +
                'id="dv-play">' +
                "Play Calculation" +
              "</button>" +

              '<button type="button" ' +
                'class="dv-btn" ' +
                'id="dv-next">' +
                "Next Step" +
              "</button>" +

              '<button type="button" ' +
                'class="dv-btn" ' +
                'id="dv-restart">' +
                "Restart" +
              "</button>" +

            "</div>" +


            '<p class="dv-note">' +
              "Visualization only. Contribution, combined-value, remaining-efficiency, and final-rating values are supplied by the Disability Calculator. This visualization does not calculate or modify them. The bilateral factor is not applied by the current calculator." +
            "</p>" +


          "</section>" +


        "</div>" +

      "</div>"

    );

  }


  /* ============================================================
    8. DOM HELPERS
  ============================================================ */

  function $(
    selector
  ) {

    return rootEl
      ? rootEl.querySelector(
          selector
        )
      : null;

  }


  function $$(
    selector
  ) {

    return rootEl
      ? Array.from(
          rootEl.querySelectorAll(
            selector
          )
        )
      : [];

  }


  /* ============================================================
    9. VISUAL STATE
  ============================================================ */

  function resetVisual() {

    if (
      !rootEl ||
      !currentSnapshot
    ) {

      return;
    }


    clearTimers();

    playing =
      false;

    currentStepIndex =
      -1;


    $$(
      "[data-dv-segment]"
    ).forEach(
      segment => {

        segment.style.width =
          "0%";

        const label =
          segment.querySelector(
            ".dv-segment-label"
          );

        if (
          label
        ) {

          label.textContent =
            "";

        }

      }
    );


    const remaining =
      $(
        "#dv-remaining-segment"
      );


    if (
      remaining
    ) {

      remaining.style.width =
        "100%";

      const label =
        remaining.querySelector(
          ".dv-segment-label"
        );

      if (
        label
      ) {

        label.textContent =
          "100% Remaining";

      }

    }


    $$(
      "[data-dv-step-card]"
    ).forEach(
      card => {

        card.dataset.active =
          "0";

        card.dataset.complete =
          "0";

      }
    );


    const status =
      $(
        "#dv-current-status"
      );


    if (
      status
    ) {

      status.textContent =
        "100% Efficient";

    }


    const step =
      $(
        "#dv-explain-step"
      );


    const title =
      $(
        "#dv-explain-title"
      );


    const copy =
      $(
        "#dv-explain-copy"
      );


    const equation =
      $(
        "#dv-equation"
      );


    if (
      step
    ) {

      step.textContent =
        "Start";

    }


    if (
      title
    ) {

      title.textContent =
        "Begin with a 100% whole person.";

    }


    if (
      copy
    ) {

      copy.textContent =
        "Each disability will be applied in the exact order returned by the calculator.";

    }


    if (
      equation
    ) {

      equation.innerHTML =
        "";

    }


    updateButtons();

  }


  function updateButtons() {

    const play =
      $(
        "#dv-play"
      );


    const next =
      $(
        "#dv-next"
      );


    if (
      play
    ) {

      play.disabled =
        playing;

      play.textContent =
        playing
          ? "Playing…"
          : "Play Calculation";

    }


    if (
      next
    ) {

      next.disabled =
        playing ||
        !currentSnapshot ||
        currentStepIndex >=
          currentSnapshot.steps.length -
          1;

    }

  }


  /* ============================================================
    10. EXPLANATION CONTENT
  ============================================================ */

  function equationHtml(
    step
  ) {

    const rating =
      formatPercent(
        step.rating
      );


    const remainingBefore =
      formatPercent(
        step.remainingBefore
      );


    const rawContribution =
      finiteNumber(
        step.rawContribution
      );


    const contribution =
      formatPoints(
        step.contribution
      );


    const combined =
      formatPercent(
        step.combined
      );


    if (
      step.index === 1 ||
      step.previousCombined === 0
    ) {

      return (

        '<span class="dv-eq-piece">' +
          "100% Whole Person" +
        "</span>" +

        '<span class="dv-eq-op">→</span>' +

        '<span class="dv-eq-piece">' +
          escapeHtml(
            rating
          ) +
          " disability" +
        "</span>" +

        '<span class="dv-eq-op">=</span>' +

        '<span class="dv-eq-piece">' +
          escapeHtml(
            contribution
          ) +
          " points" +
        "</span>"

      );

    }


    return (

      '<span class="dv-eq-piece">' +
        escapeHtml(
          rating
        ) +
        " of" +
      "</span>" +

      '<span class="dv-eq-piece">' +
        escapeHtml(
          remainingBefore
        ) +
        " remaining" +
      "</span>" +

      '<span class="dv-eq-op">=</span>' +

      '<span class="dv-eq-piece">' +

        escapeHtml(
          rawContribution !== null
            ? formatPoints(
                rawContribution,
                2
              )
            : contribution
        ) +

        " raw points" +

      "</span>" +

      '<span class="dv-eq-op">→</span>' +

      '<span class="dv-eq-piece">' +
        escapeHtml(
          contribution
        ) +
        " carried points" +
      "</span>" +

      '<span class="dv-eq-op">→</span>' +

      '<span class="dv-eq-piece">' +
        escapeHtml(
          combined
        ) +
        " combined" +
      "</span>"

    );

  }


  function stepExplanation(
    step,
    index
  ) {

    const number =
      step.index ||
      (
        index +
        1
      );


    const rating =
      formatPercent(
        step.rating
      );


    const remainingBefore =
      formatPercent(
        step.remainingBefore
      );


    const contribution =
      formatPoints(
        step.contribution
      );


    const combined =
      formatPercent(
        step.combined
      );


    const remainingAfter =
      formatPercent(
        step.remainingAfter
      );


    if (
      number === 1 ||
      step.previousCombined === 0
    ) {

      return {

        step:
          "Step " +
          number,

        title:
          "Apply the highest rating first.",

        copy:
          "The " +
          rating +
          " rating is applied to the original 100% whole person. " +
          "The calculator records " +
          contribution +
          " disability points, leaving " +
          remainingAfter +
          " efficiency remaining."

      };

    }


    return {

      step:
        "Step " +
        number,

      title:
        rating +
        " is applied only to what remains.",

      copy:
        "Before this step, the calculator shows " +
        remainingBefore +
        " efficiency remaining. The " +
        rating +
        " rating contributes " +
        contribution +
        " additional disability points, producing " +
        combined +
        " combined disability and leaving " +
        remainingAfter +
        " efficiency."

    };

  }


  /* ============================================================
    11. APPLY STEP
  ============================================================ */

  function applyStep(
    index
  ) {

    if (
      !currentSnapshot
    ) {

      return false;

    }


    const step =
      currentSnapshot.steps[
        index
      ];


    if (
      !step
    ) {

      return false;

    }


    currentStepIndex =
      index;


    const segment =
      rootEl.querySelector(
        '[data-dv-segment="' +
        index +
        '"]'
      );


    if (
      segment
    ) {

      const contribution =
        clamp(
          step.contribution,
          0,
          100
        );


      segment.style.width =
        contribution +
        "%";


      const label =
        segment.querySelector(
          ".dv-segment-label"
        );


      if (
        label
      ) {

        label.textContent =
          contribution > 6
            ? (
                "+" +
                formatPoints(
                  contribution
                )
              )
            : "";

      }

    }


    const remaining =
      $(
        "#dv-remaining-segment"
      );


    if (
      remaining
    ) {

      const remainingAfter =
        clamp(
          step.remainingAfter,
          0,
          100
        );


      remaining.style.width =
        remainingAfter +
        "%";


      const label =
        remaining.querySelector(
          ".dv-segment-label"
        );


      if (
        label
      ) {

        label.textContent =
          remainingAfter >
            10

            ? (
                formatPercent(
                  remainingAfter
                ) +
                " Remaining"
              )

            : "";

      }

    }


    const cards =
      $$(
        "[data-dv-step-card]"
      );


    cards.forEach(
      (
        card,
        cardIndex
      ) => {

        card.dataset.active =
          cardIndex === index
            ? "1"
            : "0";


        card.dataset.complete =
          cardIndex <= index
            ? "1"
            : "0";

      }
    );


    const explanation =
      stepExplanation(
        step,
        index
      );


    const explainStep =
      $(
        "#dv-explain-step"
      );


    const explainTitle =
      $(
        "#dv-explain-title"
      );


    const explainCopy =
      $(
        "#dv-explain-copy"
      );


    const equation =
      $(
        "#dv-equation"
      );


    if (
      explainStep
    ) {

      explainStep.textContent =
        explanation.step;

    }


    if (
      explainTitle
    ) {

      explainTitle.textContent =
        explanation.title;

    }


    if (
      explainCopy
    ) {

      explainCopy.textContent =
        explanation.copy;

    }


    if (
      equation
    ) {

      equation.innerHTML =
        equationHtml(
          step
        );

    }


    const status =
      $(
        "#dv-current-status"
      );


    if (
      status
    ) {

      status.textContent =
        formatPercent(
          step.combined
        ) +
        " Disabled • " +
        formatPercent(
          step.remainingAfter
        ) +
        " Efficient";

    }


    updateButtons();


    return true;

  }


  /* ============================================================
    12. FINAL RESULT
  ============================================================ */

  function showFinalResult() {

    if (
      !currentSnapshot
    ) {

      return;

    }


    $$(
      "[data-dv-step-card]"
    ).forEach(
      card => {

        card.dataset.active =
          "0";

        card.dataset.complete =
          "1";

      }
    );


    const explainStep =
      $(
        "#dv-explain-step"
      );


    const explainTitle =
      $(
        "#dv-explain-title"
      );


    const explainCopy =
      $(
        "#dv-explain-copy"
      );


    const equation =
      $(
        "#dv-equation"
      );


    if (
      explainStep
    ) {

      explainStep.textContent =
        "Final Result";

    }


    if (
      explainTitle
    ) {

      explainTitle.textContent =
        "The whole-person combination is complete.";

    }


    if (
      explainCopy
    ) {

      explainCopy.textContent =
        "The calculator's combined value is " +
        formatPercent(
          currentSnapshot.combinedValue
        ) +
        ". After the calculator's final VA rounding step, the estimated official rating is " +
        formatPercent(
          currentSnapshot.officialRating
        ) +
        ".";

    }


    if (
      equation
    ) {

      equation.innerHTML =

        '<span class="dv-eq-piece">' +

          escapeHtml(
            formatPercent(
              currentSnapshot.combinedValue
            )
          ) +

          " combined" +

        "</span>" +

        '<span class="dv-eq-op">→</span>' +

        '<span class="dv-eq-piece">' +

          escapeHtml(
            formatPercent(
              currentSnapshot.officialRating
            )
          ) +

          " estimated VA rating" +

        "</span>";

    }


    const status =
      $(
        "#dv-current-status"
      );


    if (
      status
    ) {

      status.textContent =
        formatPercent(
          currentSnapshot.remainingEfficiency
        ) +
        " Efficiency Remaining";

    }


    playing =
      false;


    updateButtons();

  }


  /* ============================================================
    13. NEXT STEP
  ============================================================ */

  function nextStep() {

    if (
      !currentSnapshot ||
      playing
    ) {

      return;

    }


    const nextIndex =
      currentStepIndex +
      1;


    if (
      nextIndex <
      currentSnapshot.steps.length
    ) {

      applyStep(
        nextIndex
      );


      if (
        nextIndex ===
        currentSnapshot.steps.length -
        1
      ) {

        later(
          showFinalResult,
          reducedMotion()
            ? 0
            : 650
        );

      }

    }

  }


  /* ============================================================
    14. PLAY
  ============================================================ */

  function play() {

    if (
      !currentSnapshot ||
      !currentSnapshot.steps.length
    ) {

      return;

    }


    clearTimers();

    resetVisual();


    playing =
      true;


    updateButtons();


    const immediate =
      reducedMotion();


    currentSnapshot
      .steps
      .forEach(
        (
          step,
          index
        ) => {

          const delay =
            immediate
              ? 0
              : (
                  AUTO_PLAY_DELAY +
                  (
                    index *
                    STEP_DELAY
                  )
                );


          later(
            () => {

              applyStep(
                index
              );

            },
            delay
          );

        }
      );


    const finalDelay =
      immediate
        ? 0
        : (
            AUTO_PLAY_DELAY +
            (
              currentSnapshot
                .steps
                .length *
              STEP_DELAY
            )
          );


    later(
      () => {

        showFinalResult();

      },
      finalDelay
    );

  }


  /* ============================================================
    15. RESTART
  ============================================================ */

  function restart() {

    resetVisual();

  }


  /* ============================================================
    16. BIND CONTROLS
  ============================================================ */

  function bindControls() {

    const playButton =
      $(
        "#dv-play"
      );


    const nextButton =
      $(
        "#dv-next"
      );


    const restartButton =
      $(
        "#dv-restart"
      );


    if (
      playButton
    ) {

      playButton.addEventListener(
        "click",
        play
      );

    }


    if (
      nextButton
    ) {

      nextButton.addEventListener(
        "click",
        nextStep
      );

    }


    if (
      restartButton
    ) {

      restartButton.addEventListener(
        "click",
        restart
      );

    }

  }


  /* ============================================================
    17. INITIALIZE
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
          "TheWing Disability Visualization: initialize() requires a valid container."
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

        clear();

        return rootEl;

      }


      rootEl =
        buildRoot();


      host.appendChild(
        rootEl
      );


      mountedContainer =
        host;


      mountedContainer.setAttribute(
        "data-visible",
        "0"
      );


      return rootEl;

    } catch (
      error
    ) {

      console.warn(
        "TheWing Disability Visualization initialization failed:",
        error
      );


      return null;

    }

  }


  /* ============================================================
    18. RENDER
  ============================================================ */

  function render(
    disability
  ) {

    try {

      if (
        !rootEl
      ) {

        console.warn(
          "TheWing Disability Visualization: render() called before initialize()."
        );

        return null;

      }


      const snapshot =
        normalizeSnapshot(
          disability
        );


      if (
        !validSnapshot(
          snapshot
        )
      ) {

        clear();

        return null;

      }


      clearTimers();


      currentSnapshot =
        snapshot;


      currentStepIndex =
        -1;


      playing =
        false;


      rootEl.innerHTML =
        shellHtml(
          snapshot
        );


      setVisible(
        true
      );


      bindControls();


      resetVisual();


      /*
        Auto-play when the visualization first appears.

        This makes the HUD feel alive immediately after the user
        clicks "How Did My Ratings Combine?"
      */

      later(
        play,
        reducedMotion()
          ? 0
          : 250
      );


      return rootEl;

    } catch (
      error
    ) {

      console.warn(
        "TheWing Disability Visualization render failed:",
        error
      );


      clear();


      return null;

    }

  }


  /* ============================================================
    19. RENDER FROM INTENT
  ============================================================ */

  function renderFromIntent(
    intent,
    disability
  ) {

    if (
      clean(
        intent
      ).toLowerCase() !==
        SUPPORTED_INTENT
    ) {

      clear();

      return null;

    }


    return render(
      disability
    );

  }


  function renderFromResponse(
    response,
    disability
  ) {

    if (
      !isObject(
        response
      )
    ) {

      clear();

      return null;

    }


    return renderFromIntent(
      response.intent,
      disability
    );

  }


  /* ============================================================
    20. CLEAR
  ============================================================ */

  function clear() {

    clearTimers();


    playing =
      false;


    currentStepIndex =
      -1;


    currentSnapshot =
      null;


    if (
      rootEl
    ) {

      rootEl.innerHTML =
        "";

      rootEl.dataset.empty =
        "1";

    }


    if (
      mountedContainer
    ) {

      mountedContainer.setAttribute(
        "data-visible",
        "0"
      );

    }

  }


  /* ============================================================
    21. DESTROY
  ============================================================ */

  function destroy() {

    clearTimers();


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


    currentSnapshot =
      null;


    currentStepIndex =
      -1;


    playing =
      false;

  }


  /* ============================================================
    22. GETTERS
  ============================================================ */

  function getData() {

    return clone(
      currentSnapshot,
      null
    );

  }


  function getCurrentStep() {

    return currentStepIndex;

  }


  function isMounted() {

    return Boolean(
      rootEl &&
      rootEl.isConnected
    );

  }


  function isPlaying() {

    return playing;

  }


  /* ============================================================
    23. PUBLIC API
  ============================================================ */

  window.TheWingDisabilityVisualization =
    Object.freeze({

      version:
        VERSION,

      supportedIntent:
        SUPPORTED_INTENT,

      initialize,

      render,

      renderFromIntent,

      renderFromResponse,

      play,

      next:
        nextStep,

      restart,

      clear,

      destroy,

      getData,

      getCurrentStep,

      isMounted,

      isPlaying

    });


  /* ============================================================
    24. READY EVENT
  ============================================================ */

  try {

    window.dispatchEvent(
      new CustomEvent(
        "thewing:disability-visualization-ready",
        {

          detail: {

            version:
              VERSION,

            api:
              window
                .TheWingDisabilityVisualization

          }

        }
      )
    );

  } catch (_) {

    /* Fail open */

  }

})();
