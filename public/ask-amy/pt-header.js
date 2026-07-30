<!-- =========================================================
  PCSUnited • PT Score Header Strip
  SHELL — HTML + CSS ONLY
  v1.1.0

  PURPOSE
  - Displays the live Air Force PT score breakdown
  - Body Composition / 20
  - Strength / 15
  - Core / 15
  - Cardio / 50
  - Total Score / 100

  JAVASCRIPT
  - The separate PT Header JavaScript will populate this shell
  - Do not place the previous inline PT Header JavaScript here
  - Do not use the compensation header mount ID

  REQUIRED ROOT
  #pcsu-pt-header-strip
========================================================= -->

<div
  id="pcsu-pt-header-strip"
  data-version="1.1.0"
  data-state="waiting"
  style="all:initial;"
>
  <link
    rel="preconnect"
    href="https://fonts.googleapis.com"
  >

  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin
  >

  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
    rel="stylesheet"
  >

  <style>
    /* =========================================================
      ROOT
    ========================================================= */

    #pcsu-pt-header-strip,
    #pcsu-pt-header-strip *{
      box-sizing:border-box;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    #pcsu-pt-header-strip{
      display:block;
      width:100%;
      margin:0;
      padding:0;
      color:#f5f5f5;
      background:transparent !important;
    }

    #pcsu-pt-header-strip .pcsu-pt-header-wrap{
      display:flex;
      align-items:center;
      justify-content:center;
      width:100%;
      margin:0;
      padding:0;
      background:transparent !important;
    }

    #pcsu-pt-header-strip .pcsu-pt-header-inner{
      width:100%;
      margin:0;
      padding:0;
    }

    /* =========================================================
      GRID
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-header-grid{
      display:grid;
      grid-template-columns:
        repeat(4, minmax(88px, 1fr))
        minmax(108px, 1.12fr);

      gap:8px;

      width:min(600px, 100%);
      margin:0 auto;
      padding:0;

      background:transparent !important;
    }

    /* =========================================================
      TILE
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-header-tile{
      --pcsu-pt-accent:rgba(106,167,255,.34);

      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;

      min-width:0;
      min-height:50px;

      padding:7px 11px 8px;

      overflow:hidden;
      text-align:center;

      border:1px solid rgba(255,255,255,.18);
      border-radius:999px;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.91),
          rgba(226,234,242,.78)
        );

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.96),
        0 7px 17px rgba(0,0,0,.18);

      backdrop-filter:
        blur(10px)
        saturate(135%);

      -webkit-backdrop-filter:
        blur(10px)
        saturate(135%);

      transition:
        opacity .18s ease,
        filter .18s ease,
        transform .18s ease,
        border-color .18s ease,
        background .18s ease;
    }

    #pcsu-pt-header-strip .pcsu-pt-header-tile::before{
      content:"";

      position:absolute;
      inset:0 0 auto;
      height:1px;

      background:
        linear-gradient(
          90deg,
          transparent,
          var(--pcsu-pt-accent),
          transparent
        );

      pointer-events:none;
    }

    #pcsu-pt-header-strip .pcsu-pt-header-tile::after{
      content:"";

      position:absolute;
      right:19%;
      bottom:0;
      left:19%;

      height:2px;

      border-radius:
        999px
        999px
        0
        0;

      background:
        var(--pcsu-pt-accent);

      opacity:.68;
      pointer-events:none;
    }

    /* =========================================================
      COMPONENT ACCENTS
    ========================================================= */

    #pcsu-pt-header-strip .is-body{
      --pcsu-pt-accent:
        rgba(61,165,187,.80);
    }

    #pcsu-pt-header-strip .is-strength{
      --pcsu-pt-accent:
        rgba(221,128,85,.80);
    }

    #pcsu-pt-header-strip .is-core{
      --pcsu-pt-accent:
        rgba(120,132,200,.82);
    }

    #pcsu-pt-header-strip .is-cardio{
      --pcsu-pt-accent:
        rgba(57,169,137,.82);
    }

    #pcsu-pt-header-strip .is-total{
      --pcsu-pt-accent:
        rgba(199,156,79,.92);

      border-color:
        rgba(199,156,79,.31);

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.96),
          rgba(244,238,221,.85)
        );
    }

    /* =========================================================
      LABEL
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-header-label{
      display:block;

      max-width:100%;
      margin:0 0 2px;

      overflow:hidden;

      color:
        rgba(18,24,38,.59);

      font-size:7px;
      line-height:1;
      font-weight:900;

      letter-spacing:.12em;
      text-transform:uppercase;

      text-overflow:ellipsis;
      white-space:nowrap;
    }

    /* =========================================================
      VALUE
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-header-value{
      display:block;

      max-width:100%;
      margin:0;

      overflow:hidden;

      color:#101728;

      font-size:12.5px;
      line-height:1.05;
      font-weight:900;

      letter-spacing:-.03em;

      text-overflow:ellipsis;
      white-space:nowrap;
    }

    #pcsu-pt-header-strip
      .is-body
      .pcsu-pt-header-value{
      color:#24778a;
    }

    #pcsu-pt-header-strip
      .is-strength
      .pcsu-pt-header-value{
      color:#a45233;
    }

    #pcsu-pt-header-strip
      .is-core
      .pcsu-pt-header-value{
      color:#5664a0;
    }

    #pcsu-pt-header-strip
      .is-cardio
      .pcsu-pt-header-value{
      color:#18795c;
    }

    #pcsu-pt-header-strip
      .is-total
      .pcsu-pt-header-value{
      color:#947133;
    }

    /* =========================================================
      SUPPORTING META
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-header-meta{
      display:block;

      max-width:100%;
      min-height:8px;

      margin:3px 0 0;

      overflow:hidden;

      color:
        rgba(18,24,38,.53);

      font-size:6.5px;
      line-height:1;
      font-weight:800;

      letter-spacing:0;

      text-overflow:ellipsis;
      white-space:nowrap;
    }

    /* =========================================================
      VALUE STATES
    ========================================================= */

    #pcsu-pt-header-strip .is-good{
      color:#16795a !important;
    }

    #pcsu-pt-header-strip .is-caution{
      color:#9b7939 !important;
    }

    #pcsu-pt-header-strip .is-danger{
      color:#a23c5a !important;
    }

    #pcsu-pt-header-strip .is-neutral{
      color:#101728 !important;
    }

    /* =========================================================
      TILE STATES
    ========================================================= */

    #pcsu-pt-header-strip
      .pcsu-pt-header-tile.is-missing{
      opacity:.60;
      filter:saturate(.70);
    }

    #pcsu-pt-header-strip
      .pcsu-pt-header-tile.is-updating{
      opacity:.78;
    }

    #pcsu-pt-header-strip
      .pcsu-pt-header-tile.is-failed{
      border-color:
        rgba(162,60,90,.32);
    }

    #pcsu-pt-header-strip
      .pcsu-pt-header-tile.is-passed{
      border-color:
        rgba(22,121,90,.28);
    }

    /* =========================================================
      ACCESSIBILITY
    ========================================================= */

    #pcsu-pt-header-strip .pcsu-pt-sr-only{
      position:absolute !important;

      width:1px !important;
      height:1px !important;

      padding:0 !important;
      margin:-1px !important;

      overflow:hidden !important;

      clip:rect(0,0,0,0) !important;
      clip-path:inset(50%) !important;

      white-space:nowrap !important;

      border:0 !important;
    }

    /* =========================================================
      TABLET
    ========================================================= */

    @media(max-width:900px){
      #pcsu-pt-header-strip
        .pcsu-pt-header-grid{
        width:min(570px, 100%);
        gap:6px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-tile{
        padding-right:9px;
        padding-left:9px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-label{
        font-size:6.8px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-value{
        font-size:12px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-meta{
        font-size:6.3px;
      }
    }

    /* =========================================================
      MOBILE
    ========================================================= */

    @media(max-width:760px){
      #pcsu-pt-header-strip
        .pcsu-pt-header-grid{
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        width:100%;
        gap:7px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-tile{
        min-height:52px;

        padding:
          8px
          10px;

        border-radius:13px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-tile.is-total{
        grid-column:1 / -1;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-label{
        font-size:8.5px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-value{
        font-size:15px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-meta{
        min-height:9px;
        font-size:7.5px;
      }
    }

    @media(max-width:390px){
      #pcsu-pt-header-strip
        .pcsu-pt-header-grid{
        gap:5px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-tile{
        min-height:49px;

        padding-right:7px;
        padding-left:7px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-value{
        font-size:14px;
      }

      #pcsu-pt-header-strip
        .pcsu-pt-header-meta{
        font-size:7px;
      }
    }

    /* =========================================================
      REDUCED MOTION
    ========================================================= */

    @media(prefers-reduced-motion:reduce){
      #pcsu-pt-header-strip,
      #pcsu-pt-header-strip *{
        transition-duration:
          .01ms !important;

        animation-duration:
          .01ms !important;

        animation-iteration-count:
          1 !important;

        scroll-behavior:
          auto !important;
      }
    }
  </style>

  <!-- =======================================================
    PT SCORE HEADER MARKUP
  ======================================================== -->

  <div class="pcsu-pt-header-wrap">
    <div class="pcsu-pt-header-inner">

      <div
        class="pcsu-pt-header-grid"
        role="group"
        aria-label="Estimated Air Force PT score breakdown"
      >

        <!-- BODY COMPOSITION -->

        <div
          class="pcsu-pt-header-tile is-body is-missing"
          id="pcsu-pt-tile-body"
          data-component="body"
        >
          <span class="pcsu-pt-header-label">
            Body
          </span>

          <span
            class="pcsu-pt-header-value"
            id="pcsu-pt-value-body"
          >
            — / 20
          </span>

          <span
            class="pcsu-pt-header-meta"
            id="pcsu-pt-meta-body"
          >
            Waiting for calculator
          </span>
        </div>

        <!-- STRENGTH -->

        <div
          class="pcsu-pt-header-tile is-strength is-missing"
          id="pcsu-pt-tile-strength"
          data-component="strength"
        >
          <span class="pcsu-pt-header-label">
            Strength
          </span>

          <span
            class="pcsu-pt-header-value"
            id="pcsu-pt-value-strength"
          >
            — / 15
          </span>

          <span
            class="pcsu-pt-header-meta"
            id="pcsu-pt-meta-strength"
          >
            Waiting for calculator
          </span>
        </div>

        <!-- CORE -->

        <div
          class="pcsu-pt-header-tile is-core is-missing"
          id="pcsu-pt-tile-core"
          data-component="core"
        >
          <span class="pcsu-pt-header-label">
            Core
          </span>

          <span
            class="pcsu-pt-header-value"
            id="pcsu-pt-value-core"
          >
            — / 15
          </span>

          <span
            class="pcsu-pt-header-meta"
            id="pcsu-pt-meta-core"
          >
            Waiting for calculator
          </span>
        </div>

        <!-- CARDIO -->

        <div
          class="pcsu-pt-header-tile is-cardio is-missing"
          id="pcsu-pt-tile-cardio"
          data-component="cardio"
        >
          <span class="pcsu-pt-header-label">
            Cardio
          </span>

          <span
            class="pcsu-pt-header-value"
            id="pcsu-pt-value-cardio"
          >
            — / 50
          </span>

          <span
            class="pcsu-pt-header-meta"
            id="pcsu-pt-meta-cardio"
          >
            Waiting for calculator
          </span>
        </div>

        <!-- TOTAL SCORE -->

        <div
          class="pcsu-pt-header-tile is-total is-missing"
          id="pcsu-pt-tile-total"
          data-component="total"
        >
          <span class="pcsu-pt-header-label">
            Total Score
          </span>

          <span
            class="pcsu-pt-header-value is-caution"
            id="pcsu-pt-value-total"
          >
            —
          </span>

          <span
            class="pcsu-pt-header-meta"
            id="pcsu-pt-meta-total"
          >
            Adjust calculator inputs
          </span>
        </div>

      </div>

      <!-- One polite live region for all score changes -->

      <span
        class="pcsu-pt-sr-only"
        id="pcsu-pt-live-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ></span>

    </div>
  </div>

</div>
