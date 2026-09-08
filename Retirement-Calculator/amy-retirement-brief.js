/* ============================================================
  THEWING.AI • AMY RETIREMENT BRIEF
  Retirement-Calculator/amy-retirement-brief.js
  v1.0.0

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
============================================================ */

(function () {
  "use strict";

  /* ============================================================
    1. CONFIG
  ============================================================ */

  const VERSION =
    "amy-retirement-brief-1.0.0";

  const ROOT_ID =
    "aa-retirement-brief";

  const STYLE_ID =
    "aa-retirement-brief-styles";

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
      value ===
        null ||
      value ===
        undefined ||
      value ===
        ""
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
      value ===
        true ||
      value ===
        false
    ) {
      return value;
    }

    return null;
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


  function formatMoney0(
    value
  ) {
    const number =
      finiteNumber(
        value
      );

    if (
      number ===
      null
    ) {
      return "—";
    }

    return (
      "$" +
      Math.round(
        number
      ).toLocaleString(
        "en-US"
      )
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
      number ===
      null
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


  function formatPercent(
    value,
    digits = 4
  ) {
    const number =
      finiteNumber(
        value
      );

    if (
      number ===
      null
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


  function formatMonth(
    value
  ) {
    const raw =
      clean(
        value
      );

    const match =
      raw.match(
        /^(\d{4})-(\d{2})/
      );

    if (
      !match
    ) {
      return raw || "—";
    }

    const year =
      Number(
        match[1]
      );

    const month =
      Number(
        match[2]
      );

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
    ).format(
      date
    );
  }


  function formatDate(
    value
  ) {
    const raw =
      clean(
        value
      );

    const match =
      raw.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (
      !match
    ) {
      return raw || "—";
    }

    const date =
      new Date(
        Date.UTC(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) - 1,
          Number(
            match[3]
          )
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
    ).format(
      date
    );
  }


  function normalizeType(
    value
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
      : DEFAULT_TYPE;
  }


  function getFirstValue(
    ...values
  ) {
    for (
      const value
      of values
    ) {
      if (
        value !==
          undefined &&
        value !==
          null &&
        value !==
          ""
      ) {
        return value;
      }
    }

    return null;
  }


  /* ============================================================
    3. NORMALIZE RETIREMENT SNAPSHOT
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

    const inputs =
      isPlainObject(
        raw.inputs
      )
        ? raw.inputs
        : {};

    const service =
      isPlainObject(
        raw.service
      )
        ? raw.service
        : {};

    const assumptions =
      isPlainObject(
        raw.assumptions
      )
        ? raw.assumptions
        : {};

    const projection =
      isPlainObject(
        raw.projection
      )
        ? raw.projection
        : {};

    const retirement =
      isPlainObject(
        raw.retirement
      )
        ? raw.retirement
        : {};

    const periods =
      Array.isArray(
        projection.periods
      )
        ? projection.periods
            .slice(
              0,
              3
            )
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
        assumptions
          .forecastSchedule
      )
        ? clone(
            assumptions
              .forecastSchedule,
            {}
          )
        : {};

    return {
      ok:
        raw.ok ===
        true,

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
            inputs
              .longRangeGrowthPercent
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
      }
    };
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
        raw.retirement ||
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
          raw.intent ||
          DEFAULT_TYPE
        ),

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
    4. STYLES
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
--arb-line:rgba(174,211,234,.16);
--arb-line-strong:rgba(159,227,212,.28);
--arb-gold:#f0cc74;
--arb-gold-soft:#ffe2a0;
--arb-mint:#9fe3d4;
--arb-blue:#8dc8fa;
--arb-card:rgba(13,47,72,.62);
--arb-card-2:rgba(19,59,87,.60);
--arb-card-soft:rgba(24,67,96,.42);
--arb-shadow:0 18px 42px rgba(2,12,24,.28);

position:relative;
width:100%;
min-width:0;
margin:0 0 16px;
color:var(--arb-ink);
font-family:Barlow,Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
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
radial-gradient(420px 220px at 0% 0%,rgba(240,204,116,.15),transparent 70%),
radial-gradient(620px 300px at 100% 0%,rgba(85,165,206,.13),transparent 68%),
linear-gradient(145deg,rgba(41,82,110,.82),rgba(13,43,66,.88));
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
linear-gradient(180deg,rgba(255,255,255,.045),transparent 38%);
opacity:.9
}

.arb-body{
position:relative;
z-index:1;
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
font-family:"Gilda Display",Georgia,serif;
font-size:27px;
line-height:1.05;
font-weight:400
}

.arb-subtitle{
max-width:680px;
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
font-family:"Gilda Display",Georgia,serif;
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
linear-gradient(180deg,var(--arb-card-2),var(--arb-card));
box-shadow:
inset 0 1px 0 rgba(255,255,255,.035)
}

.arb-card-gold{
border-color:rgba(240,204,116,.28);
background:
radial-gradient(300px 130px at 0% 0%,rgba(240,204,116,.12),transparent 68%),
linear-gradient(180deg,var(--arb-card-2),var(--arb-card))
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
border-top:1px solid rgba(183,211,232,.10)
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
linear-gradient(90deg,var(--arb-gold),var(--arb-mint));
box-shadow:
0 0 12px rgba(240,204,116,.18)
}

.arb-dot{
position:absolute;
top:50%;
width:14px;
height:14px;
border-radius:50%;
background:var(--arb-gold-soft);
border:2px solid rgba(255,255,255,.20);
box-shadow:0 0 14px rgba(240,204,116,.34);
transform:translate(-50%,-50%)
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
background:rgba(15,53,78,.55)
}

.arb-rank-block+.arb-rank-block{
border-left:1px solid rgba(159,227,212,.24)
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
background:rgba(12,45,69,.52)
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
background:rgba(11,43,66,.52);
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
background:rgba(10,40,61,.42);
color:var(--arb-soft);
font-size:9px;
line-height:1;
font-weight:900
}

.arb-chip[data-accent="gold"]{
border-color:rgba(240,204,116,.28);
color:var(--arb-gold-soft)
}

.arb-chip[data-accent="mint"]{
border-color:rgba(159,227,212,.28);
color:var(--arb-mint)
}

.arb-info{
display:flex;
align-items:flex-start;
gap:9px;
margin-top:12px;
padding:11px 12px;
border:1px solid var(--arb-line);
border-radius:13px;
background:rgba(103,136,159,.10)
}

.arb-info-icon{
flex:0 0 21px;
width:21px;
height:21px;
display:flex;
align-items:center;
justify-content:center;
border:1px solid rgba(240,204,116,.35);
border-radius:50%;
color:var(--arb-gold-soft);
font-family:Georgia,serif;
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
color:rgba(190,211,225,.55);
font-size:8px;
line-height:1.5;
font-weight:600
}

.arb-empty{
padding:18px;
border:1px solid var(--arb-line);
border-radius:16px;
background:rgba(11,42,64,.45)
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

@media(max-width:840px){
.arb-grid,
.arb-grid-3{
grid-template-columns:1fr
}

.arb-periods{
grid-template-columns:1fr
}

.arb-forecast{
grid-template-columns:repeat(2,minmax(0,1fr))
}

.arb-header{
display:block
}

.arb-brand{
margin-top:13px;
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
}
`;

    document.head.appendChild(
      style
    );
  }


  /* ============================================================
    5. SHELL
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
      "aria-label",
      "Amy Retirement Brief"
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
    6. COMMON RENDER HELPERS
  ============================================================ */

  function renderHeader({
    eyebrow,
    title,
    subtitle
  }) {
    return (
      '<div class="arb-header">' +
        '<div>' +
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
          '<div class="arb-brand-name">TheWing.ai</div>' +
          '<div class="arb-brand-sub">Retirement Brief</div>' +
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
        ? ` data-accent="${escapeHtml(accent)}"`
        : "";

    return (
      '<div class="arb-row">' +
        '<span class="arb-row-label">' +
          escapeHtml(
            label
          ) +
        "</span>" +
        '<span class="arb-row-value"' +
          state +
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
      '<div class="arb-rows">' +
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
      '<div class="arb-info">' +
        '<div class="arb-info-icon">i</div>' +
        '<p class="arb-info-copy">' +
          escapeHtml(
            text
          ) +
        "</p>" +
      "</div>"
    );
  }


  function renderDisclaimer(
    value
  ) {
    return (
      '<p class="arb-disclaimer">' +
        escapeHtml(
          value ||
          DEFAULT_DISCLAIMER
        ) +
      "</p>"
    );
  }


  function renderWrapper(
    content
  ) {
    return (
      '<div class="arb-shell">' +
        '<div class="arb-body">' +
          content +
        "</div>" +
      "</div>"
    );
  }


  function getSystemLabel(
    data
  ) {
    return (
      data
        .inputs
        .retirementSystemLabel ||
      data
        .inputs
        .retirementSystem ||
      data
        .retirement
        .retirementSystem ||
      "—"
    );
  }


  function getRankLabel(
    data
  ) {
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


  function getServiceDisplay(
    data
  ) {
    return (
      data
        .service
        .display ||
      (
        finiteNumber(
          data
            .service
            .serviceMonths
        ) !==
        null
          ? String(
              data.service.serviceMonths
            ) +
            " months"
          : "—"
      )
    );
  }


  function getMultiplierPercent(
    data
  ) {
    const direct =
      finiteNumber(
        data
          .retirement
          .multiplierPercent
      );

    if (
      direct !==
      null
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
      multiplier ===
      null
    ) {
      return null;
    }

    /*
      Presentation conversion only.
      The calculator remains the math authority.
    */

    return (
      multiplier *
      100
    );
  }


  /* ============================================================
    7. ESTIMATE BRIEF
  ============================================================ */

  function renderEstimate(
    data,
    renderData
  ) {
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

    const high3 =
      formatMoney2(
        getFirstValue(
          data
            .retirement
            .retiredPayBase,

          data
            .projection
            .high36AverageClient
        )
      );

    const multiplier =
      formatPercent(
        getMultiplierPercent(
          data
        )
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

    const body =
      renderHeader({
        eyebrow:
          "Your Retirement Estimate",

        title:
          renderData.title ||
          "Your Retirement Estimate",

        subtitle:
          renderData.subtitle ||
          "A visual summary of the retirement result currently calculated by TheWing."
      }) +

      '<div class="arb-grid">' +

        '<div>' +

          '<div class="arb-card arb-card-gold">' +
            '<p class="arb-label">Projected Monthly Retired Pay</p>' +
            '<div class="arb-hero-value">' +
              escapeHtml(
                monthly
              ) +
            "</div>" +
            '<p class="arb-note">Gross retired pay before taxes, SBP, or other deductions.</p>' +
          "</div>" +

          '<div class="arb-card arb-card-gold arb-section">' +
            '<p class="arb-label">Projected Yearly Retired Pay</p>' +
            '<div class="arb-value arb-value-gold">' +
              escapeHtml(
                yearly
              ) +
            "</div>" +
          "</div>" +

        "</div>" +

        '<div>' +

          renderRows([
            renderRow(
              "Retirement System",
              getSystemLabel(
                data
              )
            ),

            renderRow(
              "Retirement Rank",
              getRankLabel(
                data
              )
            ),

            renderRow(
              "Years of Service",
              getServiceDisplay(
                data
              )
            ),

            renderRow(
              "Retirement Multiplier",
              multiplier
            ),

            renderRow(
              "Projected High-3 Average",
              high3,
              "mint"
            )
          ]) +

          '<section class="arb-section">' +
            '<p class="arb-section-title">High-36 Pay Window</p>' +

            '<div class="arb-card">' +
              '<div class="arb-value arb-value-gold">' +
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
                    data
                      .retirement
                      .monthsUsedForBase ||
                    36
                  )
                ) +
                " monthly basic-pay values used for the retirement pay base." +
              "</p>" +

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
          "</section>" +

        "</div>" +

      "</div>" +

      renderInfo(
        "This brief illustrates the Retirement Calculator result already produced by TheWing. Amy does not independently recalculate these values."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    8. HIGH-3 BRIEF
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
        getFirstValue(
          data
            .retirement
            .retiredPayBase,

          data
            .projection
            .high36AverageClient
        )
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
                  period.startMonth ||
                  period.endMonth
                    ? (
                        rangeStart +
                        " – " +
                        rangeEnd
                      )
                    : (
                        period.label ||
                        "Period " +
                        (
                          index +
                          1
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
                            index +
                            1
                          )
                        )
                      ) +
                    "</div>" +

                    '<div class="arb-period-range">' +
                      escapeHtml(
                        range
                      ) +
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
            .join(
              ""
            )
        : (
            '<div class="arb-period">' +
              '<div class="arb-period-title">High-36</div>' +
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

          '<div>' +
            '<p class="arb-label">High-3 Average</p>' +
            '<div class="arb-hero-value">' +
              escapeHtml(
                high3
              ) +
            "</div>" +
          "</div>" +

          '<div>' +
            '<p class="arb-label">High-36 Window</p>' +
            '<div class="arb-value arb-value-mint">' +
              escapeHtml(
                firstMonth
              ) +
              " – " +
              escapeHtml(
                finalMonth
              ) +
            "</div>" +

            '<p class="arb-note">Exactly 36 monthly basic-pay values are supplied to the retirement engine.</p>' +
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
        '<p class="arb-section-title">Three 12-Month Periods</p>' +
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

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    9. MULTIPLIER BRIEF
  ============================================================ */

  function renderMultiplier(
    data,
    renderData
  ) {
    const multiplier =
      formatPercent(
        getMultiplierPercent(
          data
        )
      );

    const high3 =
      formatMoney2(
        data
          .retirement
          .retiredPayBase
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
          '<p class="arb-label">Retirement Multiplier</p>' +
          '<div class="arb-hero-value">' +
            escapeHtml(
              multiplier
            ) +
          "</div>" +
          '<p class="arb-note">Authoritative value returned by the retirement engine.</p>' +
        "</div>" +

        renderRows([
          renderRow(
            "Retirement System",
            getSystemLabel(
              data
            )
          ),

          renderRow(
            "Credited Service",
            getServiceDisplay(
              data
            )
          ),

          renderRow(
            "Service Months",
            finiteNumber(
              data
                .service
                .serviceMonths
            ) !==
              null
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

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    10. SERVICE BRIEF
  ============================================================ */

  function renderService(
    data,
    renderData
  ) {
    const service =
      getServiceDisplay(
        data
      );

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
          '<p class="arb-label">Credited Service</p>' +
          '<div class="arb-hero-value">' +
            escapeHtml(
              service
            ) +
          "</div>" +

          '<div class="arb-chip-row">' +

            (
              serviceMonths !==
              null
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
            getSystemLabel(
              data
            )
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

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    11. RANK TIMING BRIEF
  ============================================================ */

  function renderRankTiming(
    data,
    renderData
  ) {
    const promoted =
      data
        .inputs
        .promotedFinal36 ===
        true ||
      data
        .projection
        .promotionDuringFinal36 ===
        true;

    const retirementRank =
      data
        .inputs
        .retirementRankLabel ||
      data
        .inputs
        .retirementRank ||
      "Retirement Rank";

    const previousRank =
      data
        .inputs
        .previousRankLabel ||
      data
        .inputs
        .previousRank ||
      data
        .projection
        .previousRank ||
      "Previous Rank";

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

    if (
      promoted
    ) {
      trackHtml =
        '<div class="arb-rank-track">' +

          '<div class="arb-rank-block">' +
            '<div class="arb-rank-name">' +
              escapeHtml(
                previousRank
              ) +
            "</div>" +
            '<div class="arb-rank-caption">Before promotion month</div>' +
          "</div>" +

          '<div class="arb-rank-block">' +
            '<div class="arb-rank-name">' +
              escapeHtml(
                retirementRank
              ) +
            "</div>" +
            '<div class="arb-rank-caption">Promotion month forward</div>' +
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
            '<div class="arb-rank-caption">Applied across the full High-36 window</div>' +
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
                ? '<span class="arb-dot arb-dot-mid" style="left:58%"></span>'
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
                    .promotionMonthUsesRetirementRank ===
                    false
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

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    12. FORECAST BRIEF
  ============================================================ */

  function normalizeForecastItems(
    data
  ) {
    const schedule =
      data
        .assumptions
        .forecastSchedule ||
      {};

    const items =
      [];

    const knownYears =
      [
        "2027",
        "2028",
        "2029",
        "2030"
      ];

    knownYears.forEach(
      year => {
        const rate =
          finiteNumber(
            schedule[
              year
            ]
          );

        if (
          rate !==
          null
        ) {
          items.push({
            year,
            rate
          });
        }
      }
    );

    const longRange =
      getFirstValue(
        finiteNumber(
          schedule[
            "2031+"
          ]
        ),

        finiteNumber(
          schedule
            .longRange
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
      longRange !==
      null
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
            .join(
              ""
            )
        : (
            '<div class="arb-empty">' +
              '<div class="arb-empty-title">Forecast details unavailable</div>' +
              '<div class="arb-empty-copy">The current calculator state did not include a forecast schedule.</div>' +
            "</div>"
          );

    const reconstructed =
      data
        .assumptions
        .historicalYearsBefore2026AreReconstructed ===
        true;

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

        '<p class="arb-section-title">Projected Annual Pay Growth</p>' +

        '<div class="arb-forecast">' +
          forecastHtml +
        "</div>" +

      "</div>" +

      '<div class="arb-chip-row">' +

        '<span class="arb-chip" data-accent="mint">2026 official baseline</span>' +

        (
          reconstructed
            ? '<span class="arb-chip" data-accent="gold">Pre-2026 reconstructed planning values</span>'
            : ""
        ) +

        '<span class="arb-chip">Future rates are planning assumptions</span>' +

      "</div>" +

      renderInfo(
        "Projected future military pay is not guaranteed. The calculator uses these assumptions only to build retirement planning scenarios."
      ) +

      renderDisclaimer(
        renderData.disclaimer
      );

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    13. RETIREMENT SYSTEM BRIEF
  ============================================================ */

  function renderRetirementSystem(
    data,
    renderData
  ) {
    const system =
      getSystemLabel(
        data
      );

    const multiplier =
      formatPercent(
        getMultiplierPercent(
          data
        )
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
          '<p class="arb-label">Selected Retirement System</p>' +
          '<div class="arb-hero-value">' +
            escapeHtml(
              system
            ) +
          "</div>" +
        "</div>" +

        renderRows([
          renderRow(
            "Credited Service",
            getServiceDisplay(
              data
            )
          ),

          renderRow(
            "Multiplier",
            multiplier,
            "mint"
          ),

          renderRow(
            "High-3 Pay Base",
            formatMoney2(
              data
                .retirement
                .retiredPayBase
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

    return renderWrapper(
      body
    );
  }


  /* ============================================================
    14. ROUTER
  ============================================================ */

  function paint(
    renderData
  ) {
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
      data.ok !==
      true
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
          renderEstimate(
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
    15. PUBLIC METHODS
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
          "TheWing Amy Retirement Brief: initialize() requires a valid container."
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
        "TheWing Amy Retirement Brief: initialize() failed.",
        error
      );

      return null;
    }
  }


  function render(
    data
  ) {
    try {
      if (
        !rootEl
      ) {
        console.warn(
          "TheWing Amy Retirement Brief: render() called before initialize()."
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
        "TheWing Amy Retirement Brief: render() failed.",
        error
      );

      currentData =
        null;

      return setEmptyState();
    }
  }


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


  function renderFromIntent(
    intent,
    retirement
  ) {
    return render({
      type:
        intent,

      retirement
    });
  }


  function renderFromResponse(
    response,
    retirement
  ) {
    if (
      !isPlainObject(
        response
      )
    ) {
      return null;
    }

    const intent =
      normalizeType(
        response.intent
      );

    if (
      !SUPPORTED_TYPES.has(
        intent
      )
    ) {
      return clear();
    }

    return render({
      type:
        intent,

      retirement
    });
  }


  /* ============================================================
    16. GLOBAL API
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
    17. READY EVENT
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
