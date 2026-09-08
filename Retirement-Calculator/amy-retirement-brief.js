/* ============================================================
  THEWING.AI • AMY RETIREMENT BRIEF
  Retirement-Calculator/amy-retirement-brief.js
  v1.1.0

  PURPOSE
  -------------------------------------------------------------
  Visual retirement intelligence layer for the dedicated
  Ask Amy Retirement Command Center.

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing calculates.
  Amy explains.
  The browser renders.

  IMPORTANT
  -------------------------------------------------------------
  This file DOES NOT:
  - calculate High-3
  - calculate High-36
  - calculate retirement multipliers
  - calculate credited service
  - calculate retired pay
  - calculate rank history
  - calculate promotion timing
  - calculate future military pay

  It only renders values already supplied by the authoritative
  Retirement Calculator state.

  EXPECTED USE
  -------------------------------------------------------------
  window.TheWingAmyRetirementBrief.initialize(container);

  window.TheWingAmyRetirementBrief.render({
    type: "explain_estimate",
    retirement: retirementSnapshot
  });

  SUPPORTED TYPES
  -------------------------------------------------------------
  - explain_estimate
  - high3
  - multiplier
  - service
  - rank_timing
  - forecast
  - retirement_system

  v1.1.0
  -------------------------------------------------------------
  - "Explain My Estimate" now renders the full
    Retirement Journey HUD.
  - Five-step visual retirement process.
  - Live profile / High-36 / High-3 / multiplier / retired-pay
    values from calculator state.
  - Other specialized Briefs remain available.
============================================================ */

(function () {
  "use strict";

  /* ============================================================
    1. CONFIG
  ============================================================ */

  if (window.__THEWING_AMY_RETIREMENT_BRIEF_V110) {
    return;
  }

  window.__THEWING_AMY_RETIREMENT_BRIEF_V110 = true;

  const VERSION =
    "amy-retirement-brief-1.1.0";

  const ROOT_ID =
    "aa-retirement-brief";

  const STYLE_ID =
    "aa-retirement-brief-styles-v110";

  const DEFAULT_TYPE =
    "explain_estimate";

  const SUPPORTED_TYPES =
    new Set([
      "explain_estimate",
      "high3",
      "multiplier",
      "service",
      "rank_timing",
      "forecast",
      "retirement_system"
    ]);

  const DEFAULT_DISCLAIMER =
    "Planning estimate only. Gross retired pay is shown before taxes, SBP, or other deductions.";

  let mountedContainer =
    null;

  let rootEl =
    null;

  let currentData =
    null;


  /* ============================================================
    2. BASIC HELPERS
  ============================================================ */

  function clean(value) {
    return String(
      value == null
        ? ""
        : value
    ).trim();
  }


  function isPlainObject(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
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


  function finiteNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }


  function boolOrNull(value) {
    if (
      value === true ||
      value === false
    ) {
      return value;
    }

    return null;
  }


  function escapeHtml(value) {
    return clean(value)
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


  function formatMoney0(value) {
    const number =
      finiteNumber(value);

    if (number === null) {
      return "—";
    }

    return (
      "$" +
      Math.round(number).toLocaleString(
        "en-US"
      )
    );
  }


  function formatMoney2(value) {
    const number =
      finiteNumber(value);

    if (number === null) {
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


  function formatPercent(
    value,
    digits = 4
  ) {
    const number =
      finiteNumber(value);

    if (number === null) {
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


  function formatMonth(value) {
    const raw =
      clean(value);

    const match =
      raw.match(
        /^(\d{4})-(\d{2})/
      );

    if (!match) {
      return raw || "—";
    }

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    if (
      !year ||
      month < 1 ||
      month > 12
    ) {
      return raw;
    }

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
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
    ).format(date);
  }


  function formatDate(value) {
    const raw =
      clean(value);

    const match =
      raw.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (!match) {
      return raw || "—";
    }

    const date =
      new Date(
        Date.UTC(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        )
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return raw;
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",

        timeZone:
          "UTC"
      }
    ).format(date);
  }


  function firstValue(
    ...values
  ) {
    for (
      const value
      of values
    ) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }

    return null;
  }


  function normalizeSupportedType(
    value,
    fallback = ""
  ) {
    const type =
      clean(value)
        .toLowerCase()
        .replace(
          /\s+/g,
          "_"
        );

    if (
      SUPPORTED_TYPES.has(type)
    ) {
      return type;
    }

    return fallback;
  }


  /* ============================================================
    3. SNAPSHOT NORMALIZATION
  ============================================================ */

  function normalizeSnapshot(raw) {
    if (
      !isPlainObject(raw)
    ) {
      return null;
    }

    const inputs =
      isPlainObject(raw.inputs)
        ? raw.inputs
        : {};

    const service =
      isPlainObject(raw.service)
        ? raw.service
        : {};

    const assumptions =
      isPlainObject(raw.assumptions)
        ? raw.assumptions
        : {};

    const projection =
      isPlainObject(raw.projection)
        ? raw.projection
        : {};

    const retirement =
      isPlainObject(raw.retirement)
        ? raw.retirement
        : {};

    const sourceVersions =
      isPlainObject(raw.sourceVersions)
        ? raw.sourceVersions
        : {};

    const periods =
      Array.isArray(
        projection.periods
      )
        ? projection.periods
            .slice(0, 3)
            .map(
              item => ({
                label:
                  clean(
                    item?.label
                  ),

                startMonth:
                  clean(
                    item?.startMonth
                  ),

                endMonth:
                  clean(
                    item?.endMonth
                  ),

                averageBasicPay:
                  finiteNumber(
                    item?.averageBasicPay
                  )
              })
            )
        : [];

    const forecastSchedule =
      isPlainObject(
        assumptions.forecastSchedule
      )
        ? clone(
            assumptions.forecastSchedule,
            {}
          )
        : {};

    return {
      ok:
        raw.ok === true,

      generatedAt:
        clean(
          raw.generatedAt
        ),

      inputs: {
        retirementSystem:
          clean(
            inputs.retirementSystem
          ),

        retirementSystemLabel:
          clean(
            inputs.retirementSystemLabel
          ),

        retirementRank:
          clean(
            inputs.retirementRank
          ),

        retirementRankLabel:
          clean(
            inputs.retirementRankLabel
          ),

        promotedFinal36:
          boolOrNull(
            inputs.promotedFinal36
          ),

        previousRank:
          clean(
            inputs.previousRank
          ),

        previousRankLabel:
          clean(
            inputs.previousRankLabel
          ),

        promotionDate:
          clean(
            inputs.promotionDate
          ),

        entryDate:
          clean(
            inputs.entryDate
          ),

        retirementDate:
          clean(
            inputs.retirementDate
          ),

        longRangeGrowthPercent:
          finiteNumber(
            inputs.longRangeGrowthPercent
          )
      },

      service: {
        serviceMonths:
          finiteNumber(
            service.serviceMonths
          ),

        yearsOfService:
          finiteNumber(
            service.yearsOfService
          ),

        display:
          clean(
            service.display
          )
      },

      assumptions: {
        retirementRankAppliedAcrossHigh36:
          boolOrNull(
            assumptions
              .retirementRankAppliedAcrossHigh36
          ),

        promotionRankHistoryApplied:
          boolOrNull(
            assumptions
              .promotionRankHistoryApplied
          ),

        promotionMonthUsesRetirementRank:
          boolOrNull(
            assumptions
              .promotionMonthUsesRetirementRank
          ),

        retirementDateTreatedAsEffectiveDate:
          boolOrNull(
            assumptions
              .retirementDateTreatedAsEffectiveDate
          ),

        forecastSchedule,

        longRangeGrowthPercent:
          finiteNumber(
            assumptions
              .longRangeGrowthPercent
          ),

        historicalYearsBefore2026AreReconstructed:
          boolOrNull(
            assumptions
              .historicalYearsBefore2026AreReconstructed
          )
      },

      projection: {
        firstHigh36Month:
          clean(
            projection.firstHigh36Month
          ),

        finalHigh36Month:
          clean(
            projection.finalHigh36Month
          ),

        promotionDuringFinal36:
          boolOrNull(
            projection
              .promotionDuringFinal36
          ),

        previousRank:
          clean(
            projection.previousRank
          ),

        promotionDate:
          clean(
            projection.promotionDate
          ),

        promotionMonth:
          clean(
            projection.promotionMonth
          ),

        high36AverageClient:
          finiteNumber(
            projection
              .high36AverageClient
          ),

        periods
      },

      retirement: {
        retirementSystem:
          clean(
            retirement.retirementSystem
          ),

        yearsOfService:
          finiteNumber(
            retirement.yearsOfService
          ),

        serviceMonths:
          finiteNumber(
            retirement.serviceMonths
          ),

        multiplier:
          finiteNumber(
            retirement.multiplier
          ),

        multiplierPercent:
          finiteNumber(
            retirement.multiplierPercent
          ),

        retiredPayBase:
          finiteNumber(
            retirement.retiredPayBase
          ),

        baseMethod:
          clean(
            retirement.baseMethod
          ),

        monthsUsedForBase:
          finiteNumber(
            retirement.monthsUsedForBase
          ),

        grossMonthlyRetiredPay:
          finiteNumber(
            retirement
              .grossMonthlyRetiredPay
          ),

        grossYearlyRetiredPay:
          finiteNumber(
            retirement
              .grossYearlyRetiredPay
          ),

        rateVersion:
          clean(
            retirement.rateVersion
          )
      },

      sourceVersions:
        clone(
          sourceVersions,
          {}
        )
    };
  }


  function normalizeRenderData(raw) {
    if (
      !isPlainObject(raw)
    ) {
      return null;
    }

    const snapshot =
      normalizeSnapshot(
        raw.retirement ||
        raw.snapshot ||
        raw.state ||
        raw
      );

    if (!snapshot) {
      return null;
    }

    const type =
      normalizeSupportedType(
        raw.type ||
        raw.intent,
        DEFAULT_TYPE
      );

    return {
      type,

      retirement:
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

  function getSystemLabel(data) {
    const direct =
      data
        .inputs
        .retirementSystemLabel;

    if (direct) {
      return direct;
    }

    const code =
      clean(
        data
          .inputs
          .retirementSystem ||
        data
          .retirement
          .retirementSystem
      )
        .toUpperCase();

    if (
      code === "HIGH3"
    ) {
      return "High-3";
    }

    if (
      code === "BRS"
    ) {
      return "Blended Retirement System";
    }

    return code || "—";
  }


  function getSystemShortLabel(data) {
    const code =
      clean(
        data
          .inputs
          .retirementSystem ||
        data
          .retirement
          .retirementSystem
      )
        .toUpperCase();

    if (
      code === "HIGH3"
    ) {
      return "High-3";
    }

    if (
      code === "BRS"
    ) {
      return "BRS";
    }

    return (
      data
        .inputs
        .retirementSystemLabel ||
      code ||
      "—"
    );
  }


  function getRankLabel(data) {
    return (
      data
        .inputs
        .retirementRankLabel ||
      data
        .inputs
        .retirementRank ||
      "—"
    );
  }


  function getRankShort(data) {
    return (
      data
        .inputs
        .retirementRank ||
      data
        .inputs
        .retirementRankLabel ||
      "—"
    );
  }


  function getPreviousRank(data) {
    return (
      data
        .inputs
        .previousRankLabel ||
      data
        .inputs
        .previousRank ||
      data
        .projection
        .previousRank ||
      "—"
    );
  }


  function getServiceDisplay(data) {
    return (
      data
        .service
        .display ||
      (
        finiteNumber(
          data
            .service
            .serviceMonths
        ) !== null
          ? (
              String(
                data
                  .service
                  .serviceMonths
              ) +
              " months"
            )
          : "—"
      )
    );
  }


  function getMultiplierPercent(data) {
    const direct =
      finiteNumber(
        data
          .retirement
          .multiplierPercent
      );

    if (
      direct !== null
    ) {
      return direct;
    }

    const multiplier =
      finiteNumber(
        data
          .retirement
          .multiplier
      );

    if (
      multiplier === null
    ) {
      return null;
    }

    /*
      Presentation conversion only.

      The authoritative retirement engine owns
      the multiplier value itself.
    */

    return multiplier * 100;
  }


  function getHigh3(data) {
    return firstValue(
      finiteNumber(
        data
          .retirement
          .retiredPayBase
      ),

      finiteNumber(
        data
          .projection
          .high36AverageClient
      )
    );
  }


  function getHigh36Months(data) {
    const months =
      finiteNumber(
        data
          .retirement
          .monthsUsedForBase
      );

    return (
      months !== null
        ? months
        : 36
    );
  }


  function hasPromotion(data) {
    return (
      data
        .inputs
        .promotedFinal36 === true ||
      data
        .projection
        .promotionDuringFinal36 === true
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
--arb-ink:#f3f8fc;
--arb-soft:#d6e5ef;
--arb-muted:rgba(195,215,229,.72);
--arb-muted2:rgba(195,215,229,.54);
--arb-line:rgba(174,211,234,.16);
--arb-line-strong:rgba(159,227,212,.28);
--arb-gold:#f0cc74;
--arb-gold-soft:#ffe2a0;
--arb-gold-dim:rgba(240,204,116,.15);
--arb-mint:#9fe3d4;
--arb-cyan:#72d6df;
--arb-blue:#8dc8fa;
--arb-violet:#c6b4ff;
--arb-card:rgba(13,47,72,.62);
--arb-card-2:rgba(19,59,87,.60);
--arb-card-soft:rgba(24,67,96,.42);
--arb-shadow:0 18px 42px rgba(2,12,24,.28);

position:relative;
width:100%;
min-width:0;
margin:0 0 16px;
color:var(--arb-ink);

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

.arb-shell{
position:relative;
overflow:hidden;
width:100%;

border:1px solid rgba(183,211,232,.20);
border-radius:22px;

background:
radial-gradient(560px 260px at 0% 0%,rgba(240,204,116,.13),transparent 70%),
radial-gradient(680px 320px at 100% 0%,rgba(85,165,206,.15),transparent 68%),
linear-gradient(145deg,rgba(38,78,106,.88),rgba(12,41,63,.94));

box-shadow:
var(--arb-shadow),
inset 0 1px 0 rgba(255,255,255,.055)
}

.arb-shell:before{
content:"";
position:absolute;
inset:0;
pointer-events:none;

background:
linear-gradient(
180deg,
rgba(255,255,255,.045),
transparent 38%
);

opacity:.9
}

.arb-body{
position:relative;
z-index:2;
padding:22px
}

.arb-header{
display:flex;
align-items:flex-start;
justify-content:space-between;
gap:18px;
margin-bottom:18px
}

.arb-eyebrow{
margin:0 0 5px;

color:var(--arb-gold);

font-size:10px;
font-weight:900;
letter-spacing:.13em;
text-transform:uppercase
}

.arb-title{
margin:0;

color:#f7fbff;

font-family:
"Gilda Display",
Georgia,
serif;

font-size:27px;
line-height:1.05;
font-weight:400
}

.arb-subtitle{
max-width:700px;
margin:6px 0 0;

color:var(--arb-muted);

font-size:12px;
line-height:1.45;
font-weight:600
}

.arb-brand{
flex:0 0 auto;
padding-top:2px;
text-align:right
}

.arb-brand-name{
color:var(--arb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:18px;
line-height:1
}

.arb-brand-sub{
margin-top:4px;

color:var(--arb-muted);

font-size:8px;
font-weight:900;
letter-spacing:.13em;
text-transform:uppercase
}

.arb-grid{
display:grid;
grid-template-columns:minmax(0,1fr) minmax(0,1fr);
gap:12px
}

.arb-grid-3{
display:grid;
grid-template-columns:repeat(3,minmax(0,1fr));
gap:12px
}

.arb-card{
min-width:0;
padding:16px;

border:1px solid var(--arb-line);
border-radius:17px;

background:
linear-gradient(
180deg,
var(--arb-card-2),
var(--arb-card)
);

box-shadow:
inset 0 1px 0 rgba(255,255,255,.035)
}

.arb-card-gold{
border-color:rgba(240,204,116,.28);

background:
radial-gradient(
300px 130px at 0% 0%,
rgba(240,204,116,.12),
transparent 68%
),
linear-gradient(
180deg,
var(--arb-card-2),
var(--arb-card)
)
}

.arb-label{
margin:0;

color:var(--arb-muted);

font-size:10px;
line-height:1.3;
font-weight:800
}

.arb-value{
margin:6px 0 0;

color:var(--arb-ink);

font-size:22px;
line-height:1;
font-weight:900;
letter-spacing:-.025em;
font-variant-numeric:tabular-nums
}

.arb-value-gold{
color:var(--arb-gold-soft)
}

.arb-value-mint{
color:var(--arb-mint)
}

.arb-hero-value{
margin:7px 0 0;

color:var(--arb-gold-soft);

font-size:42px;
line-height:.95;
font-weight:900;
letter-spacing:-.045em;
font-variant-numeric:tabular-nums
}

.arb-unit{
margin-left:4px;

color:var(--arb-muted);

font-size:10px;
font-weight:700;
letter-spacing:0
}

.arb-note{
margin:7px 0 0;

color:var(--arb-muted);

font-size:9px;
line-height:1.45;
font-weight:600
}

.arb-section{
margin-top:12px
}

.arb-section-title{
margin:0 0 9px;

color:var(--arb-gold);

font-size:10px;
font-weight:900;
letter-spacing:.12em;
text-transform:uppercase
}

.arb-rows{
overflow:hidden;

border:1px solid var(--arb-line);
border-radius:16px;

background:rgba(7,34,55,.24)
}

.arb-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:15px;

min-height:47px;
padding:10px 13px
}

.arb-row+.arb-row{
border-top:
1px solid rgba(183,211,232,.10)
}

.arb-row-label{
color:var(--arb-muted);

font-size:10px;
font-weight:700
}

.arb-row-value{
max-width:60%;
overflow:hidden;

color:var(--arb-ink);

font-size:12px;
font-weight:900;
font-variant-numeric:tabular-nums;

text-align:right;
text-overflow:ellipsis;
white-space:nowrap
}

.arb-row-value[data-accent="mint"]{
color:var(--arb-mint)
}

.arb-row-value[data-accent="gold"]{
color:var(--arb-gold-soft)
}

.arb-timeline{
position:relative;
padding:18px 6px 4px
}

.arb-line{
position:relative;
height:4px;
margin:12px 13px;

border-radius:999px;

background:
linear-gradient(
90deg,
var(--arb-gold),
var(--arb-mint)
);

box-shadow:
0 0 12px rgba(240,204,116,.18)
}

.arb-dot{
position:absolute;
top:50%;

width:14px;
height:14px;

border-radius:50%;

background:
var(--arb-gold-soft);

border:
2px solid rgba(255,255,255,.20);

box-shadow:
0 0 14px rgba(240,204,116,.34);

transform:
translate(-50%,-50%)
}

.arb-dot-start{
left:0
}

.arb-dot-end{
left:100%
}

.arb-dot-mid{
background:var(--arb-mint)
}

.arb-timeline-labels{
display:flex;
align-items:flex-start;
justify-content:space-between;
gap:12px;

margin-top:11px
}

.arb-timeline-label{
color:var(--arb-muted);

font-size:9px;
font-weight:900;
text-transform:uppercase
}

.arb-rank-track{
display:grid;
grid-template-columns:var(--arb-split,50%) 1fr;

overflow:hidden;

margin-top:13px;

border:1px solid var(--arb-line);
border-radius:13px
}

.arb-rank-block{
min-width:0;
padding:11px 10px;

background:
rgba(15,53,78,.55)
}

.arb-rank-block+.arb-rank-block{
border-left:
1px solid rgba(159,227,212,.24)
}

.arb-rank-name{
color:var(--arb-ink);

font-size:13px;
font-weight:900
}

.arb-rank-caption{
margin-top:3px;

color:var(--arb-muted);

font-size:8px;
font-weight:700;
text-transform:uppercase
}

.arb-periods{
display:grid;
grid-template-columns:repeat(3,minmax(0,1fr));
gap:10px
}

.arb-period{
padding:13px;

border:1px solid var(--arb-line);
border-radius:14px;

background:
rgba(12,45,69,.52)
}

.arb-period-title{
color:var(--arb-blue);

font-size:9px;
font-weight:900;
letter-spacing:.08em;
text-transform:uppercase
}

.arb-period-range{
margin-top:6px;

color:var(--arb-muted);

font-size:9px;
line-height:1.35;
font-weight:700
}

.arb-period-value{
margin-top:8px;

color:var(--arb-mint);

font-size:17px;
font-weight:900;
font-variant-numeric:tabular-nums
}

.arb-forecast{
display:grid;
grid-template-columns:repeat(5,minmax(0,1fr));
gap:8px
}

.arb-forecast-item{
position:relative;

padding:12px 8px;

border:1px solid var(--arb-line);
border-radius:14px;

background:
rgba(11,43,66,.52);

text-align:center
}

.arb-forecast-year{
color:var(--arb-muted);

font-size:9px;
font-weight:900
}

.arb-forecast-rate{
margin-top:6px;

color:var(--arb-mint);

font-size:17px;
font-weight:900;
font-variant-numeric:tabular-nums
}

.arb-chip-row{
display:flex;
flex-wrap:wrap;
gap:7px;
margin-top:10px
}

.arb-chip{
display:inline-flex;
align-items:center;

min-height:28px;
padding:0 10px;

border:1px solid var(--arb-line);
border-radius:999px;

background:
rgba(10,40,61,.42);

color:var(--arb-soft);

font-size:9px;
line-height:1;
font-weight:900
}

.arb-chip[data-accent="gold"]{
border-color:
rgba(240,204,116,.28);

color:
var(--arb-gold-soft)
}

.arb-chip[data-accent="mint"]{
border-color:
rgba(159,227,212,.28);

color:
var(--arb-mint)
}

.arb-info{
display:flex;
align-items:flex-start;
gap:9px;

margin-top:12px;
padding:11px 12px;

border:1px solid var(--arb-line);
border-radius:13px;

background:
rgba(103,136,159,.10)
}

.arb-info-icon{
flex:0 0 21px;

width:21px;
height:21px;

display:flex;
align-items:center;
justify-content:center;

border:
1px solid rgba(240,204,116,.35);

border-radius:50%;

color:
var(--arb-gold-soft);

font-family:
Georgia,
serif;

font-size:11px;
font-weight:700
}

.arb-info-copy{
margin:0;

color:var(--arb-muted);

font-size:9px;
line-height:1.45;
font-weight:600
}

.arb-disclaimer{
margin:13px 0 0;

color:
rgba(190,211,225,.55);

font-size:8px;
line-height:1.5;
font-weight:600
}

.arb-empty{
padding:18px;

border:1px solid var(--arb-line);
border-radius:16px;

background:
rgba(11,42,64,.45)
}

.arb-empty-title{
color:var(--arb-ink);

font-size:13px;
font-weight:900
}

.arb-empty-copy{
margin-top:5px;

color:var(--arb-muted);

font-size:10px;
line-height:1.45
}


/* ============================================================
   RETIREMENT JOURNEY
============================================================ */

.arb-journey{
position:relative;
overflow:hidden;

border:
1px solid rgba(128,202,226,.28);

border-radius:22px;

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

.arb-journey:before{
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


/* Decorative mountain range */

.arb-mountains{
position:absolute;
inset:0;
pointer-events:none;
overflow:hidden;
opacity:.67
}

.arb-mountain{
position:absolute;
bottom:182px;

width:0;
height:0;

border-left:
130px solid transparent;

border-right:
130px solid transparent;

border-bottom:
180px solid rgba(13,42,60,.76);

filter:
drop-shadow(
0 -1px 0 rgba(130,186,214,.08)
)
}

.arb-mountain-one{
right:130px;
transform:scale(1.15)
}

.arb-mountain-two{
right:-10px;
bottom:173px;
transform:scale(.82)
}

.arb-mountain-three{
right:310px;
bottom:175px;
transform:scale(.72)
}

.arb-mountain:after{
content:"";

position:absolute;

left:-46px;
top:63px;

width:0;
height:0;

border-left:
46px solid transparent;

border-right:
46px solid transparent;

border-bottom:
65px solid rgba(206,224,234,.09)
}


/* Summit */

.arb-summit{
position:absolute;
right:80px;
top:34px;

width:145px;
height:145px;

pointer-events:none
}

.arb-summit-glow{
position:absolute;
inset:-30px;

border-radius:50%;

background:
radial-gradient(
circle,
rgba(240,204,116,.26),
rgba(240,204,116,.08) 38%,
transparent 70%
);

filter:blur(4px)
}

.arb-summit-line{
position:absolute;

left:69px;
top:44px;

width:2px;
height:54px;

background:
linear-gradient(
180deg,
var(--arb-gold-soft),
rgba(240,204,116,.12)
)
}

.arb-summit-flag{
position:absolute;

left:71px;
top:44px;

width:28px;
height:17px;

background:
linear-gradient(
135deg,
var(--arb-gold-soft),
#c89843
);

clip-path:
polygon(
0 0,
100% 18%,
77% 57%,
100% 100%,
0 82%
);

box-shadow:
0 0 18px rgba(240,204,116,.28)
}


/* Journey introduction */

.arb-journey-head{
position:relative;
z-index:3;

padding:
24px 235px 4px 24px
}

.arb-journey-kicker{
margin:0;

color:
var(--arb-gold);

font-size:9px;
font-weight:900;
letter-spacing:.16em;
text-transform:uppercase
}

.arb-journey-title{
max-width:610px;

margin:
7px 0 0;

color:
#f6f7f2;

font-family:
"Gilda Display",
Georgia,
serif;

font-size:42px;
line-height:1;
font-weight:400
}

.arb-journey-sub{
max-width:660px;

margin:
8px 0 0;

color:
var(--arb-soft);

font-size:15px;
line-height:1.35;
font-weight:500
}

.arb-journey-motto{
position:absolute;
z-index:4;

right:28px;
top:112px;

width:170px;

color:
var(--arb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:15px;
line-height:1.2;
font-style:italic;

text-align:right;

transform:
rotate(-5deg);

opacity:.88
}


/* Main path */

.arb-journey-flow{
position:relative;
z-index:4;

display:grid;

grid-template-columns:
repeat(5,minmax(0,1fr));

gap:10px;

padding:
34px 20px 20px
}

.arb-journey-step{
position:relative;

min-width:0;
min-height:220px;

padding:
28px 13px 14px;

border:
1px solid rgba(126,197,224,.20);

border-radius:16px;

background:
linear-gradient(
180deg,
rgba(17,55,76,.74),
rgba(8,32,50,.80)
);

box-shadow:
inset 0 1px 0 rgba(255,255,255,.035),
0 16px 30px rgba(2,12,24,.18)
}

.arb-journey-step[data-step="1"]{
border-color:
rgba(106,224,218,.34)
}

.arb-journey-step[data-step="2"]{
border-color:
rgba(103,178,242,.32)
}

.arb-journey-step[data-step="3"]{
border-color:
rgba(125,175,255,.34)
}

.arb-journey-step[data-step="4"]{
border-color:
rgba(192,168,255,.34)
}

.arb-journey-step[data-step="5"]{
border-color:
rgba(240,204,116,.42);

background:
radial-gradient(
220px 120px at 100% 0%,
rgba(240,204,116,.10),
transparent 70%
),
linear-gradient(
180deg,
rgba(38,57,68,.80),
rgba(12,35,50,.84)
)
}

.arb-step-number{
position:absolute;

left:50%;
top:-25px;

width:48px;
height:48px;

display:flex;
align-items:center;
justify-content:center;

border-radius:50%;

background:
rgba(10,42,61,.96);

color:#fff;

font-size:16px;
font-weight:900;

transform:
translateX(-50%);

box-shadow:
0 0 0 5px rgba(11,35,51,.8),
0 0 20px rgba(121,203,222,.30)
}

.arb-journey-step[data-step="1"]
.arb-step-number{
border:
2px solid var(--arb-mint);

box-shadow:
0 0 0 5px rgba(11,35,51,.8),
0 0 20px rgba(159,227,212,.34)
}

.arb-journey-step[data-step="2"]
.arb-step-number{
border:
2px solid #67b2f2
}

.arb-journey-step[data-step="3"]
.arb-step-number{
border:
2px solid #82aefc
}

.arb-journey-step[data-step="4"]
.arb-step-number{
border:
2px solid var(--arb-violet)
}

.arb-journey-step[data-step="5"]
.arb-step-number{
border:
2px solid var(--arb-gold-soft);

color:
var(--arb-gold-soft);

box-shadow:
0 0 0 5px rgba(11,35,51,.8),
0 0 24px rgba(240,204,116,.36)
}

.arb-step-icon{
height:46px;

display:flex;
align-items:center;
justify-content:center;

margin-bottom:10px
}

.arb-step-icon svg{
width:38px;
height:38px;

fill:none;
stroke:currentColor;
stroke-width:1.7;
stroke-linecap:round;
stroke-linejoin:round
}

.arb-step-icon[data-tone="mint"]{
color:var(--arb-mint)
}

.arb-step-icon[data-tone="blue"]{
color:#70b9ff
}

.arb-step-icon[data-tone="violet"]{
color:var(--arb-violet)
}

.arb-step-icon[data-tone="gold"]{
color:var(--arb-gold-soft)
}

.arb-step-title{
margin:0;

color:#f7fbff;

font-size:11px;
font-weight:900;
letter-spacing:.075em;
text-transform:uppercase;

text-align:center
}

.arb-step-copy{
margin:
8px 0 0;

color:
var(--arb-muted);

font-size:9px;
line-height:1.45;
font-weight:600;

text-align:center
}

.arb-step-live{
margin:
11px 0 0;

padding:
8px 7px;

border:
1px solid rgba(174,211,234,.13);

border-radius:10px;

background:
rgba(3,25,40,.28);

text-align:center
}

.arb-step-live-label{
color:
var(--arb-muted2);

font-size:7px;
font-weight:900;
letter-spacing:.08em;
text-transform:uppercase
}

.arb-step-live-value{
margin-top:4px;

overflow:hidden;

color:
var(--arb-ink);

font-size:11px;
font-weight:900;
font-variant-numeric:tabular-nums;

text-overflow:ellipsis;
white-space:nowrap
}

.arb-journey-step[data-step="5"]
.arb-step-live-value{
color:
var(--arb-gold-soft);

font-size:14px
}

.arb-step-arrow{
position:absolute;
z-index:8;

right:-16px;
top:91px;

color:
rgba(223,239,248,.85);

font-size:34px;
line-height:1;

text-shadow:
0 0 10px rgba(135,206,231,.18)
}

.arb-journey-step:last-child
.arb-step-arrow{
display:none
}


/* Journey bottom */

.arb-journey-bottom{
position:relative;
z-index:4;

display:grid;
grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);
gap:12px;

padding:
0 20px 20px
}

.arb-takeaway,
.arb-explore{
min-width:0;
padding:16px;

border:
1px solid var(--arb-line);

border-radius:15px;

background:
linear-gradient(
180deg,
rgba(14,44,63,.62),
rgba(7,28,44,.68)
)
}

.arb-takeaway-title,
.arb-explore-title{
display:flex;
align-items:center;
gap:8px;

margin:0;

color:
var(--arb-gold);

font-size:9px;
font-weight:900;
letter-spacing:.12em;
text-transform:uppercase
}

.arb-bulb{
width:27px;
height:27px;

display:flex;
align-items:center;
justify-content:center;

border:
1px solid rgba(240,204,116,.38);

border-radius:50%;

color:
var(--arb-gold-soft);

font-size:14px
}

.arb-takeaway-copy{
margin:
13px 0 0;

color:
var(--arb-soft);

font-size:12px;
line-height:1.5;
font-weight:500
}

.arb-signature{
margin:
16px 0 0;

padding-top:12px;

border-top:
1px solid rgba(240,204,116,.24);

color:
var(--arb-gold-soft);

font-family:
"Gilda Display",
Georgia,
serif;

font-size:15px;
font-style:italic
}

.arb-explore-list{
margin-top:10px
}

.arb-explore-item{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px;

padding:
9px 0;

border-bottom:
1px solid rgba(174,211,234,.09)
}

.arb-explore-item:last-child{
border-bottom:0
}

.arb-explore-item-title{
color:var(--arb-soft);

font-size:10px;
font-weight:800
}

.arb-explore-item-sub{
margin-top:2px;

color:var(--arb-muted2);

font-size:8px;
line-height:1.3;
font-weight:600
}

.arb-explore-arrow{
flex:0 0 auto;

color:
var(--arb-gold);

font-size:18px
}

.arb-journey-footer{
position:relative;
z-index:4;

display:flex;
align-items:flex-end;
justify-content:space-between;
gap:16px;

padding:
0 20px 18px
}

.arb-journey-disclaimer{
max-width:70%;

margin:0;

color:
rgba(190,211,225,.52);

font-size:8px;
line-height:1.45;
font-weight:600
}

.arb-journey-logo{
text-align:right
}

.arb-journey-logo-main{
color:
var(--arb-soft);

font-size:15px;
font-weight:900;
letter-spacing:.12em
}

.arb-journey-logo-sub{
margin-top:3px;

color:
var(--arb-muted2);

font-size:6px;
font-weight:900;
letter-spacing:.28em;
text-transform:uppercase
}


/* ============================================================
   RESPONSIVE
============================================================ */

@media(max-width:1000px){

.arb-journey-flow{
grid-template-columns:
repeat(3,minmax(0,1fr));

row-gap:38px
}

.arb-step-arrow{
display:none
}

.arb-journey-bottom{
grid-template-columns:1fr
}

}

@media(max-width:840px){

.arb-grid,
.arb-grid-3{
grid-template-columns:1fr
}

.arb-periods{
grid-template-columns:1fr
}

.arb-forecast{
grid-template-columns:
repeat(2,minmax(0,1fr))
}

.arb-header{
display:block
}

.arb-brand{
margin-top:13px;
text-align:left
}

.arb-journey-head{
padding:
22px 22px 4px
}

.arb-journey-title{
font-size:34px
}

.arb-journey-motto,
.arb-summit{
display:none
}

.arb-mountains{
opacity:.38
}

}

@media(max-width:620px){

.arb-journey-flow{
grid-template-columns:1fr;

padding-top:38px
}

.arb-journey-step{
min-height:0;

padding:
30px 16px 16px
}

.arb-journey-bottom{
padding:
0 14px 14px
}

.arb-journey-footer{
display:block;

padding:
0 14px 14px
}

.arb-journey-disclaimer{
max-width:none
}

.arb-journey-logo{
margin-top:12px;
text-align:left
}

}

@media(max-width:520px){

.arb-body{
padding:15px
}

.arb-title{
font-size:23px
}

.arb-hero-value{
font-size:35px
}

.arb-forecast{
grid-template-columns:1fr
}

.arb-row{
align-items:flex-start
}

.arb-row-value{
max-width:55%
}

.arb-journey-title{
font-size:30px
}

.arb-journey-sub{
font-size:12px
}

}

`;

    document.head.appendChild(style);
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
      "Amy Retirement Brief"
    );

    return element;
  }


  function setEmptyState() {
    if (!rootEl) {
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


  function setCardHtml(html) {
    if (!rootEl) {
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
      '<div class="arb-header">' +

        "<div>" +

          '<p class="arb-eyebrow">' +
            escapeHtml(
              eyebrow
            ) +
          "</p>" +

          '<h2 class="arb-title">' +
            escapeHtml(
              title
            ) +
          "</h2>" +

          '<p class="arb-subtitle">' +
            escapeHtml(
              subtitle
            ) +
          "</p>" +

        "</div>" +

        '<div class="arb-brand">' +

          '<div class="arb-brand-name">' +
            "TheWing.ai" +
          "</div>" +

          '<div class="arb-brand-sub">' +
            "Retirement Brief" +
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
    const state =
      accent
        ? (
            ' data-accent="' +
            escapeHtml(accent) +
            '"'
          )
        : "";

    return (
      '<div class="arb-row">' +

        '<span class="arb-row-label">' +
          escapeHtml(label) +
        "</span>" +

        '<span class="arb-row-value"' +
          state +
        ">" +
          escapeHtml(value) +
        "</span>" +

      "</div>"
    );
  }


  function renderRows(rows) {
    return (
      '<div class="arb-rows">' +
        rows
          .filter(Boolean)
          .join("") +
      "</div>"
    );
  }


  function renderInfo(text) {
    return (
      '<div class="arb-info">' +

        '<div class="arb-info-icon">' +
          "i" +
        "</div>" +

        '<p class="arb-info-copy">' +
          escapeHtml(text) +
        "</p>" +

      "</div>"
    );
  }


  function renderDisclaimer(value) {
    return (
      '<p class="arb-disclaimer">' +
        escapeHtml(
          value ||
          DEFAULT_DISCLAIMER
        ) +
      "</p>"
    );
  }


  function renderWrapper(content) {
    return (
      '<div class="arb-shell">' +
        '<div class="arb-body">' +
          content +
        "</div>" +
      "</div>"
    );
  }


  /* ============================================================
    8. ICONS
  ============================================================ */

  function iconProfile() {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="14" r="7"></circle>
        <path d="M10 39c1-9 6-14 14-14s13 5 14 14"></path>
        <path d="M5 34c1-6 4-9 9-10"></path>
        <path d="M43 34c-1-6-4-9-9-10"></path>
      </svg>
    `;
  }


  function iconHistory() {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7 39V25h8v14"></path>
        <path d="M20 39V17h8v22"></path>
        <path d="M33 39V8h8v31"></path>
        <path d="M5 40h38"></path>
      </svg>
    `;
  }


  function iconCalculator() {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="10" y="5" width="28" height="38" rx="4"></rect>
        <rect x="15" y="10" width="18" height="7" rx="1"></rect>
        <path d="M16 25h5"></path>
        <path d="M18.5 22.5v5"></path>
        <path d="M27 22.5l4 5"></path>
        <path d="M31 22.5l-4 5"></path>
        <path d="M16 34h5"></path>
        <path d="M27 34h5"></path>
      </svg>
    `;
  }


  function iconPercent() {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="15" cy="15" r="5"></circle>
        <circle cx="33" cy="33" r="5"></circle>
        <path d="M35 11L13 37"></path>
      </svg>
    `;
  }


  function iconPay() {
    return `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="16" cy="14" rx="9" ry="4"></ellipse>
        <path d="M7 14v8c0 2 4 4 9 4 2 0 4-.4 6-1"></path>
        <path d="M7 21v8c0 2 4 4 9 4"></path>
        <ellipse cx="31" cy="28" rx="10" ry="4"></ellipse>
        <path d="M21 28v9c0 2 4 4 10 4s10-2 10-4v-9"></path>
        <path d="M21 34c0 2 4 4 10 4s10-2 10-4"></path>
      </svg>
    `;
  }


  /* ============================================================
    9. RETIREMENT JOURNEY HUD
    EXPLAIN MY ESTIMATE
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
      '<article class="arb-journey-step" data-step="' +
        escapeHtml(number) +
      '">' +

        '<div class="arb-step-number">' +
          escapeHtml(number) +
        "</div>" +

        '<div class="arb-step-icon" data-tone="' +
          escapeHtml(tone) +
        '">' +
          icon +
        "</div>" +

        '<h3 class="arb-step-title">' +
          escapeHtml(title) +
        "</h3>" +

        '<p class="arb-step-copy">' +
          escapeHtml(copy) +
        "</p>" +

        '<div class="arb-step-live">' +

          '<div class="arb-step-live-label">' +
            escapeHtml(liveLabel) +
          "</div>" +

          '<div class="arb-step-live-value">' +
            escapeHtml(liveValue) +
          "</div>" +

        "</div>" +

        '<div class="arb-step-arrow" aria-hidden="true">' +
          "›" +
        "</div>" +

      "</article>"
    );
  }


  function renderRetirementJourney(
    data,
    renderData
  ) {
    const rank =
      getRankShort(data);

    const service =
      getServiceDisplay(data);

    const system =
      getSystemShortLabel(data);

    const firstMonth =
      formatMonth(
        data
          .projection
          .firstHigh36Month
      );

    const finalMonth =
      formatMonth(
        data
          .projection
          .finalHigh36Month
      );

    const high36Months =
      getHigh36Months(data);

    const high3 =
      formatMoney2(
        getHigh3(data)
      );

    const multiplier =
      formatPercent(
        getMultiplierPercent(data)
      );

    const monthly =
      formatMoney0(
        data
          .retirement
          .grossMonthlyRetiredPay
      );

    const yearly =
      formatMoney0(
        data
          .retirement
          .grossYearlyRetiredPay
      );

    const promotion =
      hasPromotion(data);

    const rankTimingLine =
      promotion
        ? (
            getPreviousRank(data) +
            " → " +
            getRankShort(data)
          )
        : (
            getRankShort(data) +
            " across High-36"
          );

    const body =

      '<div class="arb-journey">' +

        '<div class="arb-mountains" aria-hidden="true">' +

          '<span class="arb-mountain arb-mountain-one"></span>' +
          '<span class="arb-mountain arb-mountain-two"></span>' +
          '<span class="arb-mountain arb-mountain-three"></span>' +

        "</div>" +

        '<div class="arb-summit" aria-hidden="true">' +

          '<div class="arb-summit-glow"></div>' +
          '<div class="arb-summit-line"></div>' +
          '<div class="arb-summit-flag"></div>' +

        "</div>" +

        '<div class="arb-journey-head">' +

          '<p class="arb-journey-kicker">' +
            "TheWing.ai • Retirement Intelligence" +
          "</p>" +

          '<h2 class="arb-journey-title">' +
            escapeHtml(
              renderData.title ||
              "Your Retirement Journey"
            ) +
          "</h2>" +

          '<p class="arb-journey-sub">' +
            escapeHtml(
              renderData.subtitle ||
              "Five steps. One clear path. A more informed retirement projection."
            ) +
          "</p>" +

        "</div>" +

        '<div class="arb-journey-motto">' +
          "Service today.<br>Security tomorrow." +
        "</div>" +

        '<div class="arb-journey-flow">' +

          renderJourneyStep({
            number:
              "1",

            tone:
              "mint",

            icon:
              iconProfile(),

            title:
              "Your Profile",

            copy:
              "Your retirement scenario begins with your rank, credited service, retirement system, and effective retirement date.",

            liveLabel:
              "Current Profile",

            liveValue:
              rank +
              " • " +
              service +
              " • " +
              system
          }) +

          renderJourneyStep({
            number:
              "2",

            tone:
              "blue",

            icon:
              iconHistory(),

            title:
              "Basic Pay History",

            copy:
              "TheWing assembles the 36 monthly basic-pay values inside your final retirement pay window.",

            liveLabel:
              String(
                high36Months
              ) +
              "-Month Window",

            liveValue:
              firstMonth +
              " – " +
              finalMonth
          }) +

          renderJourneyStep({
            number:
              "3",

            tone:
              "blue",

            icon:
              iconCalculator(),

            title:
              "High-3 Average",

            copy:
              "Those monthly values establish the High-3 retired-pay base returned by the retirement engine.",

            liveLabel:
              "Current High-3",

            liveValue:
              high3
          }) +

          renderJourneyStep({
            number:
              "4",

            tone:
              "violet",

            icon:
              iconPercent(),

            title:
              "Apply Multiplier",

            copy:
              "The retirement engine applies the multiplier associated with your system and credited service.",

            liveLabel:
              "Retirement Multiplier",

            liveValue:
              multiplier
          }) +

          renderJourneyStep({
            number:
              "5",

            tone:
              "gold",

            icon:
              iconPay(),

            title:
              "Your Estimate",

            copy:
              "Your final result is the projected gross retired pay produced by the current calculator scenario.",

            liveLabel:
              monthly +
              " / month",

            liveValue:
              yearly +
              " / year"
          }) +

        "</div>" +

        '<div class="arb-journey-bottom">' +

          '<section class="arb-takeaway">' +

            '<h3 class="arb-takeaway-title">' +

              '<span class="arb-bulb" aria-hidden="true">' +
                "◉" +
              "</span>" +

              "Key Takeaway" +

            "</h3>" +

            '<p class="arb-takeaway-copy">' +

              "Your retirement projection moves from your service profile, " +
              "through your final " +
              escapeHtml(
                String(
                  high36Months
                )
              ) +
              " months of basic pay, into a High-3 pay base and retirement multiplier. " +
              "The current calculator result projects " +
              escapeHtml(monthly) +
              " in gross monthly retired pay." +

            "</p>" +

            '<div class="arb-chip-row">' +

              '<span class="arb-chip" data-accent="mint">' +
                escapeHtml(
                  rankTimingLine
                ) +
              "</span>" +

              '<span class="arb-chip">' +
                escapeHtml(
                  system
                ) +
              "</span>" +

              '<span class="arb-chip" data-accent="gold">' +
                escapeHtml(
                  service
                ) +
              "</span>" +

            "</div>" +

            '<div class="arb-signature">' +
              "More clarity today. A stronger tomorrow." +
            "</div>" +

          "</section>" +

          '<section class="arb-explore">' +

            '<h3 class="arb-explore-title">' +

              '<span aria-hidden="true">' +
                "◇" +
              "</span>" +

              "Explore Next" +

            "</h3>" +

            '<div class="arb-explore-list">' +

              '<div class="arb-explore-item">' +

                "<div>" +

                  '<div class="arb-explore-item-title">' +
                    "Understand Your High-3" +
                  "</div>" +

                  '<div class="arb-explore-item-sub">' +
                    "See how your 36-month pay window is built" +
                  "</div>" +

                "</div>" +

                '<div class="arb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +

              '<div class="arb-explore-item">' +

                "<div>" +

                  '<div class="arb-explore-item-title">' +
                    "Learn About Your Multiplier" +
                  "</div>" +

                  '<div class="arb-explore-item-sub">' +
                    "Understand the multiplier returned for this scenario" +
                  "</div>" +

                "</div>" +

                '<div class="arb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +

              '<div class="arb-explore-item">' +

                "<div>" +

                  '<div class="arb-explore-item-title">' +
                    "Explore Rank Timing" +
                  "</div>" +

                  '<div class="arb-explore-item-sub">' +
                    (
                      promotion
                        ? "See how your final-36 promotion affects the pay window"
                        : "Review how retirement rank is used across High-36"
                    ) +
                  "</div>" +

                "</div>" +

                '<div class="arb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +

              '<div class="arb-explore-item">' +

                "<div>" +

                  '<div class="arb-explore-item-title">' +
                    "Review Future Pay Assumptions" +
                  "</div>" +

                  '<div class="arb-explore-item-sub">' +
                    "Understand projected versus published basic pay" +
                  "</div>" +

                "</div>" +

                '<div class="arb-explore-arrow">' +
                  "→" +
                "</div>" +

              "</div>" +

            "</div>" +

          "</section>" +

        "</div>" +

        '<div class="arb-journey-footer">' +

          '<p class="arb-journey-disclaimer">' +
            escapeHtml(
              renderData.disclaimer ||
              DEFAULT_DISCLAIMER
            ) +
            " TheWing provides retirement planning estimates and educational guidance; official retirement determinations remain with the appropriate government agencies." +
          "</p>" +

          '<div class="arb-journey-logo">' +

            '<div class="arb-journey-logo-main">' +
              "THEWING.AI" +
            "</div>" +

            '<div class="arb-journey-logo-sub">' +
              "People • Plan • Progress" +
            "</div>" +

          "</div>" +

        "</div>" +

      "</div>";

    return body;
  }


  /* ============================================================
    10. HIGH-3 BRIEF
  ============================================================ */

  function renderHigh3(
    data,
    renderData
  ) {
    const firstMonth =
      formatMonth(
        data
          .projection
          .firstHigh36Month
      );

    const finalMonth =
      formatMonth(
        data
          .projection
          .finalHigh36Month
      );

    const high3 =
      formatMoney2(
        getHigh3(data)
      );

    const periods =
      data
        .projection
        .periods ||
      [];

    const periodHtml =
      periods.length
        ? periods
            .map(
              (
                period,
                index
              ) => {
                const rangeStart =
                  formatMonth(
                    period.startMonth
                  );

                const rangeEnd =
                  formatMonth(
                    period.endMonth
                  );

                const range =
                  (
                    period.startMonth ||
                    period.endMonth
                  )
                    ? (
                        rangeStart +
                        " – " +
                        rangeEnd
                      )
                    : (
                        period.label ||
                        (
                          "Period " +
                          (
                            index + 1
                          )
                        )
                      );

                return (
                  '<div class="arb-period">' +

                    '<div class="arb-period-title">' +
                      escapeHtml(
                        period.label ||
                        (
                          "Period " +
                          (
                            index + 1
                          )
                        )
                      ) +
                    "</div>" +

                    '<div class="arb-period-range">' +
                      escapeHtml(range) +
                    "</div>" +

                    '<div class="arb-period-value">' +
                      escapeHtml(
                        formatMoney2(
                          period
                            .averageBasicPay
                        )
                      ) +
                    "</div>" +

                  "</div>"
                );
              }
            )
            .join("")
        : (
            '<div class="arb-period">' +

              '<div class="arb-period-title">' +
                "High-36" +
              "</div>" +

              '<div class="arb-period-range">' +
                escapeHtml(
                  firstMonth
                ) +
                " – " +
                escapeHtml(
                  finalMonth
                ) +
              "</div>" +

              '<div class="arb-period-value">' +
                escapeHtml(
                  high3
                ) +
              "</div>" +

            "</div>"
          );

    const body =

      renderHeader({
        eyebrow:
          "High-3 Intelligence",

        title:
          renderData.title ||
          "Your High-3 Pay Window",

        subtitle:
          renderData.subtitle ||
          "The 36-month basic-pay window used to establish the retirement pay base."
      }) +

      '<div class="arb-card arb-card-gold">' +

        '<div class="arb-grid">' +

          "<div>" +

            '<p class="arb-label">' +
              "High-3 Average" +
            "</p>" +

            '<div class="arb-hero-value">' +
              escapeHtml(
                high3
              ) +
            "</div>" +

          "</div>" +

          "<div>" +

            '<p class="arb-label">' +
              "High-36 Window" +
            "</p>" +

            '<div class="arb-value arb-value-mint">' +
              escapeHtml(
                firstMonth
              ) +
              " – " +
              escapeHtml(
                finalMonth
              ) +
            "</div>" +

            '<p class="arb-note">' +
              escapeHtml(
                String(
                  getHigh36Months(
                    data
                  )
                )
              ) +
              " monthly basic-pay values are supplied to the retirement engine." +
            "</p>" +

          "</div>" +

        "</div>" +

        '<div class="arb-timeline">' +

          '<div class="arb-line">' +

            '<span class="arb-dot arb-dot-start"></span>' +
            '<span class="arb-dot arb-dot-end"></span>' +

          "</div>" +

          '<div class="arb-timeline-labels">' +

            '<span class="arb-timeline-label">' +
              escapeHtml(
                firstMonth
              ) +
            "</span>" +

            '<span class="arb-timeline-label">' +
              escapeHtml(
                finalMonth
              ) +
            "</span>" +

          "</div>" +

        "</div>" +

      "</div>" +

      '<section class="arb-section">' +

        '<p class="arb-section-title">' +
          "Three 12-Month Periods" +
        "</p>" +

        '<div class="arb-periods">' +
          periodHtml +
        "</div>" +

      "</section>" +

      renderInfo(
        "The High-3 displayed here comes directly from the Retirement Calculator result. This brief does not independently average or rebuild the 36 months."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    11. MULTIPLIER BRIEF
  ============================================================ */

  function renderMultiplier(
    data,
    renderData
  ) {
    const multiplier =
      formatPercent(
        getMultiplierPercent(data)
      );

    const high3 =
      formatMoney2(
        getHigh3(data)
      );

    const monthly =
      formatMoney0(
        data
          .retirement
          .grossMonthlyRetiredPay
      );

    const body =

      renderHeader({
        eyebrow:
          "Retirement Multiplier",

        title:
          renderData.title ||
          "Your Retirement Multiplier",

        subtitle:
          renderData.subtitle ||
          "How the multiplier returned by the retirement engine fits into your current projection."
      }) +

      '<div class="arb-grid">' +

        '<div class="arb-card arb-card-gold">' +

          '<p class="arb-label">' +
            "Retirement Multiplier" +
          "</p>" +

          '<div class="arb-hero-value">' +
            escapeHtml(
              multiplier
            ) +
          "</div>" +

          '<p class="arb-note">' +
            "Authoritative value returned by the retirement engine." +
          "</p>" +

        "</div>" +

        renderRows([

          renderRow(
            "Retirement System",
            getSystemLabel(data)
          ),

          renderRow(
            "Credited Service",
            getServiceDisplay(data)
          ),

          renderRow(
            "Service Months",
            finiteNumber(
              data
                .service
                .serviceMonths
            ) !== null
              ? String(
                  data
                    .service
                    .serviceMonths
                )
              : "—"
          ),

          renderRow(
            "High-3 Pay Base",
            high3,
            "mint"
          ),

          renderRow(
            "Gross Monthly Retired Pay",
            monthly,
            "gold"
          )

        ]) +

      "</div>" +

      renderInfo(
        "TheWing's retirement engine owns the multiplier. Amy explains the value already returned rather than recomputing it."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    12. SERVICE BRIEF
  ============================================================ */

  function renderService(
    data,
    renderData
  ) {
    const service =
      getServiceDisplay(data);

    const serviceMonths =
      finiteNumber(
        data
          .service
          .serviceMonths
      );

    const body =

      renderHeader({
        eyebrow:
          "Credited Service",

        title:
          renderData.title ||
          "Your Service at Retirement",

        subtitle:
          renderData.subtitle ||
          "The credited service used by the current retirement projection."
      }) +

      '<div class="arb-grid">' +

        '<div class="arb-card arb-card-gold">' +

          '<p class="arb-label">' +
            "Credited Service" +
          "</p>" +

          '<div class="arb-hero-value">' +
            escapeHtml(
              service
            ) +
          "</div>" +

          '<div class="arb-chip-row">' +

            (
              serviceMonths !== null
                ? (
                    '<span class="arb-chip" data-accent="mint">' +
                      escapeHtml(
                        String(
                          serviceMonths
                        )
                      ) +
                      " completed months" +
                    "</span>"
                  )
                : ""
            ) +

          "</div>" +

        "</div>" +

        renderRows([

          renderRow(
            "Date Entered Service",
            formatDate(
              data
                .inputs
                .entryDate
            )
          ),

          renderRow(
            "Retirement Effective Date",
            formatDate(
              data
                .inputs
                .retirementDate
            )
          ),

          renderRow(
            "Retirement System",
            getSystemLabel(data)
          ),

          renderRow(
            "Retirement Multiplier",
            formatPercent(
              getMultiplierPercent(
                data
              )
            )
          )

        ]) +

      "</div>" +

      renderInfo(
        "The Retirement Effective Date is the date retirement begins. The calculator credits active-duty service through the day before that date."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    13. RANK TIMING BRIEF
  ============================================================ */

  function renderRankTiming(
    data,
    renderData
  ) {
    const promoted =
      hasPromotion(data);

    const retirementRank =
      getRankLabel(data);

    const previousRank =
      getPreviousRank(data);

    const promotionMonth =
      formatMonth(
        data
          .projection
          .promotionMonth ||
        data
          .inputs
          .promotionDate
      );

    const firstMonth =
      formatMonth(
        data
          .projection
          .firstHigh36Month
      );

    const finalMonth =
      formatMonth(
        data
          .projection
          .finalHigh36Month
      );

    let trackHtml =
      "";

    if (promoted) {
      trackHtml =
        '<div class="arb-rank-track">' +

          '<div class="arb-rank-block">' +

            '<div class="arb-rank-name">' +
              escapeHtml(
                previousRank
              ) +
            "</div>" +

            '<div class="arb-rank-caption">' +
              "Before promotion month" +
            "</div>" +

          "</div>" +

          '<div class="arb-rank-block">' +

            '<div class="arb-rank-name">' +
              escapeHtml(
                retirementRank
              ) +
            "</div>" +

            '<div class="arb-rank-caption">' +
              "Promotion month forward" +
            "</div>" +

          "</div>" +

        "</div>";
    } else {
      trackHtml =
        '<div class="arb-rank-track" style="grid-template-columns:1fr">' +

          '<div class="arb-rank-block">' +

            '<div class="arb-rank-name">' +
              escapeHtml(
                retirementRank
              ) +
            "</div>" +

            '<div class="arb-rank-caption">' +
              "Applied across the full High-36 window" +
            "</div>" +

          "</div>" +

        "</div>";
    }

    const body =

      renderHeader({
        eyebrow:
          "Rank Timing",

        title:
          renderData.title ||
          "Your High-36 Rank History",

        subtitle:
          renderData.subtitle ||
          "How rank timing is applied across the current 36-month retirement pay window."
      }) +

      '<div class="arb-card arb-card-gold">' +

        '<div class="arb-timeline">' +

          '<div class="arb-line">' +

            '<span class="arb-dot arb-dot-start"></span>' +

            (
              promoted
                ? (
                    '<span class="arb-dot arb-dot-mid" style="left:58%"></span>'
                  )
                : ""
            ) +

            '<span class="arb-dot arb-dot-end"></span>' +

          "</div>" +

          '<div class="arb-timeline-labels">' +

            '<span class="arb-timeline-label">' +
              escapeHtml(
                firstMonth
              ) +
            "</span>" +

            (
              promoted
                ? (
                    '<span class="arb-timeline-label">' +
                      escapeHtml(
                        promotionMonth
                      ) +
                    "</span>"
                  )
                : ""
            ) +

            '<span class="arb-timeline-label">' +
              escapeHtml(
                finalMonth
              ) +
            "</span>" +

          "</div>" +

        "</div>" +

        trackHtml +

      "</div>" +

      '<section class="arb-section">' +

        renderRows([

          renderRow(
            "Retirement Rank",
            retirementRank
          ),

          promoted
            ? renderRow(
                "Previous Rank",
                previousRank
              )
            : "",

          promoted
            ? renderRow(
                "Promotion Month",
                promotionMonth,
                "gold"
              )
            : "",

          renderRow(
            "Promotion Month Rule",
            promoted
              ? (
                  data
                    .assumptions
                    .promotionMonthUsesRetirementRank === false
                    ? "See calculator state"
                    : "Uses Retirement Rank"
                )
              : "No final-36 promotion applied",
            promoted
              ? "mint"
              : ""
          )

        ]) +

      "</section>" +

      renderInfo(
        promoted
          ? "Months before the promotion month use Previous Rank. The promotion month itself and every later High-36 month use Retirement Rank."
          : "The current calculator result does not report a promotion during the final 36 months, so Retirement Rank is applied across the High-36 period."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    14. FORECAST HELPERS
  ============================================================ */

  function normalizeForecastItems(data) {
    const schedule =
      data
        .assumptions
        .forecastSchedule ||
      {};

    const items =
      [];

    [
      "2027",
      "2028",
      "2029",
      "2030"
    ].forEach(
      year => {
        const rate =
          finiteNumber(
            schedule[year]
          );

        if (
          rate !== null
        ) {
          items.push({
            year,
            rate
          });
        }
      }
    );

    const longRange =
      firstValue(

        finiteNumber(
          schedule["2031+"]
        ),

        finiteNumber(
          schedule.longRange
        ),

        finiteNumber(
          schedule
            .longRangeGrowthPercent
        ),

        finiteNumber(
          data
            .assumptions
            .longRangeGrowthPercent
        ),

        finiteNumber(
          data
            .inputs
            .longRangeGrowthPercent
        )

      );

    if (
      longRange !== null
    ) {
      items.push({
        year:
          "2031+",

        rate:
          longRange
      });
    }

    return items;
  }


  /* ============================================================
    15. FORECAST BRIEF
  ============================================================ */

  function renderForecast(
    data,
    renderData
  ) {
    const items =
      normalizeForecastItems(
        data
      );

    const forecastHtml =
      items.length
        ? items
            .map(
              item => (
                '<div class="arb-forecast-item">' +

                  '<div class="arb-forecast-year">' +
                    escapeHtml(
                      item.year
                    ) +
                  "</div>" +

                  '<div class="arb-forecast-rate">' +
                    "+" +
                    escapeHtml(
                      formatPercent(
                        item.rate,
                        2
                      )
                    ) +
                  "</div>" +

                "</div>"
              )
            )
            .join("")
        : (
            '<div class="arb-empty">' +

              '<div class="arb-empty-title">' +
                "Forecast details unavailable" +
              "</div>" +

              '<div class="arb-empty-copy">' +
                "The current calculator state did not include a forecast schedule." +
              "</div>" +

            "</div>"
          );

    const reconstructed =
      data
        .assumptions
        .historicalYearsBefore2026AreReconstructed === true;

    const body =

      renderHeader({
        eyebrow:
          "Basic Pay Forecast",

        title:
          renderData.title ||
          "Future Pay Assumptions",

        subtitle:
          renderData.subtitle ||
          "The military basic-pay planning assumptions currently used by this retirement projection."
      }) +

      '<div class="arb-card arb-card-gold">' +

        '<p class="arb-section-title">' +
          "Projected Annual Pay Growth" +
        "</p>" +

        '<div class="arb-forecast">' +
          forecastHtml +
        "</div>" +

      "</div>" +

      '<div class="arb-chip-row">' +

        '<span class="arb-chip" data-accent="mint">' +
          "2026 official baseline" +
        "</span>" +

        (
          reconstructed
            ? (
                '<span class="arb-chip" data-accent="gold">' +
                  "Pre-2026 reconstructed planning values" +
                "</span>"
              )
            : ""
        ) +

        '<span class="arb-chip">' +
          "Future rates are planning assumptions" +
        "</span>" +

      "</div>" +

      renderInfo(
        "Projected future military pay is not guaranteed. The calculator uses these assumptions only to build retirement planning scenarios."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    16. RETIREMENT SYSTEM BRIEF
  ============================================================ */

  function renderRetirementSystem(
    data,
    renderData
  ) {
    const system =
      getSystemLabel(data);

    const multiplier =
      formatPercent(
        getMultiplierPercent(data)
      );

    const body =

      renderHeader({
        eyebrow:
          "Retirement System",

        title:
          renderData.title ||
          "Your Retirement System",

        subtitle:
          renderData.subtitle ||
          "The retirement system selected in the current calculator scenario."
      }) +

      '<div class="arb-grid">' +

        '<div class="arb-card arb-card-gold">' +

          '<p class="arb-label">' +
            "Selected Retirement System" +
          "</p>" +

          '<div class="arb-hero-value">' +
            escapeHtml(
              system
            ) +
          "</div>" +

        "</div>" +

        renderRows([

          renderRow(
            "Credited Service",
            getServiceDisplay(data)
          ),

          renderRow(
            "Multiplier",
            multiplier,
            "mint"
          ),

          renderRow(
            "High-3 Pay Base",
            formatMoney2(
              getHigh3(data)
            )
          ),

          renderRow(
            "Gross Monthly Retired Pay",
            formatMoney0(
              data
                .retirement
                .grossMonthlyRetiredPay
            ),
            "gold"
          )

        ]) +

      "</div>" +

      renderInfo(
        "This brief reflects the retirement system and values already returned by the calculator. Amy does not substitute a different retirement formula."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(body);
  }


  /* ============================================================
    17. RENDER ROUTER
  ============================================================ */

  function paint(renderData) {
    if (
      !rootEl ||
      !renderData ||
      !renderData.retirement
    ) {
      return setEmptyState();
    }

    const data =
      renderData.retirement;

    if (
      data.ok !== true
    ) {
      return setEmptyState();
    }

    let html =
      "";

    switch (
      renderData.type
    ) {
      case "high3":

        html =
          renderHigh3(
            data,
            renderData
          );

        break;


      case "multiplier":

        html =
          renderMultiplier(
            data,
            renderData
          );

        break;


      case "service":

        html =
          renderService(
            data,
            renderData
          );

        break;


      case "rank_timing":

        html =
          renderRankTiming(
            data,
            renderData
          );

        break;


      case "forecast":

        html =
          renderForecast(
            data,
            renderData
          );

        break;


      case "retirement_system":

        html =
          renderRetirementSystem(
            data,
            renderData
          );

        break;


      case "explain_estimate":
      default:

        html =
          renderRetirementJourney(
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

  function initialize(container) {
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
          "TheWing Amy Retirement Brief: initialize() requires a valid container."
        );

        return null;
      }

      if (
        mountedContainer &&
        mountedContainer !== host
      ) {
        destroy();
      }

      ensureStyles();

      const existing =
        host.querySelector(
          "#" +
          ROOT_ID
        );

      if (existing) {
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
        "TheWing Amy Retirement Brief: initialize() failed.",
        error
      );

      return null;
    }
  }


  /* ============================================================
    19. RENDER
  ============================================================ */

  function render(data) {
    try {
      if (!rootEl) {
        console.warn(
          "TheWing Amy Retirement Brief: render() called before initialize()."
        );

        return null;
      }

      const normalized =
        normalizeRenderData(
          data
        );

      if (!normalized) {
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
        "TheWing Amy Retirement Brief: render() failed.",
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

  function update(patch) {
    try {
      if (
        !isPlainObject(patch)
      ) {
        return render(
          patch
        );
      }

      if (!currentData) {
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
          previousRaw.retirement
        ) &&
        isPlainObject(
          patch.retirement
        )
      ) {
        merged.retirement = {
          ...previousRaw.retirement,
          ...patch.retirement
        };
      }

      return render(
        merged
      );

    } catch (
      error
    ) {
      console.warn(
        "TheWing Amy Retirement Brief: update() failed.",
        error
      );

      return null;
    }
  }


  /* ============================================================
    21. CLEAR / DESTROY
  ============================================================ */

  function clear() {
    currentData =
      null;

    if (!rootEl) {
      return;
    }

    setEmptyState();
  }


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
    22. GETTERS
  ============================================================ */

  function getData() {
    return clone(
      currentData,
      null
    );
  }


  function isMounted() {
    return Boolean(
      rootEl &&
      rootEl.isConnected
    );
  }


  function getType() {
    return (
      currentData?.type ||
      null
    );
  }


  /* ============================================================
    23. INTENT RENDERING
  ============================================================ */

  function renderFromIntent(
    intent,
    retirement
  ) {
    const type =
      normalizeSupportedType(
        intent,
        ""
      );

    if (!type) {
      clear();
      return null;
    }

    return render({
      type,
      retirement
    });
  }


  function renderFromResponse(
    response,
    retirement
  ) {
    if (
      !isPlainObject(response)
    ) {
      clear();
      return null;
    }

    const intent =
      normalizeSupportedType(
        response.intent,
        ""
      );

    /*
      Greeting, capabilities, concept questions,
      and out-of-scope replies do NOT create
      a Retirement HUD.
    */

    if (!intent) {
      clear();
      return null;
    }

    return render({
      type:
        intent,

      retirement
    });
  }


  /* ============================================================
    24. GLOBAL API
  ============================================================ */

  window.TheWingAmyRetirementBrief =
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
    25. READY EVENT
  ============================================================ */

  try {
    window.dispatchEvent(
      new CustomEvent(
        "thewing:amy-retirement-brief-ready",
        {
          detail: {
            version:
              VERSION,

            api:
              window
                .TheWingAmyRetirementBrief
          }
        }
      )
    );
  } catch (_) {
    /* Fail open */
  }

})();
