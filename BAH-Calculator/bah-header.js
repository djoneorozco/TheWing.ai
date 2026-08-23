/* ============================================================
  PCSUnited • BAH Compensation Header Strip
  Standalone Public JavaScript
  v1.2.0 • AURORA GLASS

  FILE
  BAH-Calculator/bah-header.js

  REQUIRED MOUNT
  #pcsu-bah-header-progression-widget

  ARCHITECTURE
  - Runs on the Webflow parent page.
  - Receives BAH compensation snapshots from the calculator iframe
    through window.postMessage().
  - Does NOT calculate BAH, Base Pay, BAS, or Total Compensation.
  - Does NOT make API requests or use storage.
  - Visual update only: simplified to match the BAH Calculator Aurora UI.
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.2.0";
  const SOURCE = "pcsunited.bah.header.v1.2.0";

  const MOUNT_ID = "pcsu-bah-header-progression-widget";
  const ROOT_ID = "pcsu-bah-header-compensation-strip";
  const STYLE_ID = "pcsu-bah-header-styles-v120";
  const FONT_ID = "pcsu-bah-header-font";

  const MESSAGE_TYPE = "pcsunited-bah-compensation";
  const REQUEST_TYPE = "pcsunited-bah-header-request";
  const CALCULATOR_SOURCE = "pcsunited.bah.calculator";

  const ALLOWED_ORIGINS = new Set([
    "https://thewing.netlify.app"
  ]);


  /* ============================================================
    HELPERS
  ============================================================ */

  function clean(value) {
    return String(
      value == null
        ? ""
        : value
    ).trim();
  }


  function isObject(value) {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.has(origin);
  }


  function normalizeMoney(
    value,
    digits = 2
  ) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return (
        "$" +
        value.toLocaleString(
          undefined,
          {
            minimumFractionDigits:
              digits,

            maximumFractionDigits:
              digits
          }
        )
      );
    }

    return clean(value) || "—";
  }


  /* ============================================================
    NORMALIZE INCOMING CALCULATOR SNAPSHOT
  ============================================================ */

  function normalizeSnapshot(raw) {
    if (!isObject(raw)) {
      return null;
    }

    const detail =
      isObject(raw.detail)

        ? raw.detail

        : isObject(raw.payload)

          ? raw.payload

          : raw;


    const basePay =
      detail.basePay ??
      detail.basicPay ??
      detail.monthly?.basePay ??
      detail.monthly?.basicPay;


    const bah =
      detail.bah ??
      detail.monthlyBAH ??
      detail.monthly?.bah;


    const bas =
      detail.bas ??
      detail.monthly?.bas;


    const total =
      detail.total ??
      detail.totalMonthly ??
      detail.grossMonthlyComp ??
      detail.monthly?.totalMonthly ??
      detail.monthly?.grossMonthlyComp;


    if (
      basePay == null &&
      bah == null &&
      bas == null &&
      total == null
    ) {
      return null;
    }


    return {
      basePay:
        normalizeMoney(
          basePay,
          2
        ),

      bah:
        normalizeMoney(
          bah,
          0
        ),

      bas:
        normalizeMoney(
          bas,
          2
        ),

      total:
        normalizeMoney(
          total,
          2
        ),

      rank:
        clean(
          detail.rank
        ),

      yos:
        clean(
          detail.yos ??
          detail.yearsOfService
        ),

      location:
        clean(
          detail.location ??
          detail.base ??
          detail.mhaName
        ),

      dependents:
        clean(
          detail.dependents ??
          detail.dependencyStatus
        ),

      updated_at:
        clean(
          detail.updated_at
        )
    };
  }


  /* ============================================================
    FONT
  ============================================================ */

  function ensureFont() {
    if (
      document.getElementById(
        FONT_ID
      )
    ) {
      return;
    }


    const preconnectGoogle =
      document.createElement(
        "link"
      );

    preconnectGoogle.rel =
      "preconnect";

    preconnectGoogle.href =
      "https://fonts.googleapis.com";


    const preconnectStatic =
      document.createElement(
        "link"
      );

    preconnectStatic.rel =
      "preconnect";

    preconnectStatic.href =
      "https://fonts.gstatic.com";

    preconnectStatic.crossOrigin =
      "anonymous";


    const fontLink =
      document.createElement(
        "link"
      );

    fontLink.id =
      FONT_ID;

    fontLink.rel =
      "stylesheet";

    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";


    document.head.appendChild(
      preconnectGoogle
    );

    document.head.appendChild(
      preconnectStatic
    );

    document.head.appendChild(
      fontLink
    );
  }


  /* ============================================================
    AURORA STYLES
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
      #${ROOT_ID} * {

        box-sizing:
          border-box;

        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }


      #${MOUNT_ID} {

        width:
          100%;

        margin:
          0;
      }


      #${ROOT_ID} {

        width:
          100%;

        display:
          block;

        color:
          #eef5ff;

        background:
          transparent !important;
      }


      /* ========================================================
        SINGLE AURORA GLASS CARD
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-card {

        width:
          min(860px,100%);

        margin:
          0 auto;

        padding:
          9px 14px;

        border:
          1px solid
          rgba(255,255,255,.18);

        border-radius:
          18px;

        background:

          radial-gradient(
            360px 100px
            at 18% 0%,
            rgba(114,215,228,.07),
            transparent 72%
          ),

          linear-gradient(
            180deg,
            rgba(255,255,255,.10),
            rgba(255,255,255,.065)
          );

        box-shadow:

          0 10px 24px
          rgba(3,15,30,.12),

          inset 0 1px 0
          rgba(255,255,255,.08);

        backdrop-filter:
          blur(18px)
          saturate(140%);

        -webkit-backdrop-filter:
          blur(18px)
          saturate(140%);
      }


      /* ========================================================
        FORMULA GRID
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-grid {

        display:
          grid;

        grid-template-columns:

          minmax(90px,1fr)
          18px

          minmax(90px,1fr)
          18px

          minmax(90px,1fr)
          18px

          minmax(122px,1.18fr);

        align-items:
          center;

        gap:
          6px;

        min-width:
          0;
      }


      /* ========================================================
        METRIC
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-metric {

        min-width:
          0;

        padding:
          3px 10px;

        text-align:
          center;
      }


      /* ========================================================
        LABEL
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-label {

        display:
          block;

        margin-bottom:
          3px;

        color:
          rgba(233,241,255,.62);

        font-size:
          8px;

        line-height:
          1;

        font-weight:
          700;

        letter-spacing:
          .08em;

        text-transform:
          uppercase;

        white-space:
          nowrap;

        overflow:
          hidden;

        text-overflow:
          ellipsis;
      }


      /* ========================================================
        VALUE
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-value {

        display:
          block;

        color:
          #f5f9ff;

        font-size:
          14px;

        line-height:
          1.08;

        font-weight:
          800;

        letter-spacing:
          -.025em;

        font-variant-numeric:
          tabular-nums;

        white-space:
          nowrap;

        overflow:
          hidden;

        text-overflow:
          ellipsis;
      }


      /* ========================================================
        SUPPORT TEXT
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-support {

        display:
          block;

        min-height:
          9px;

        margin-top:
          3px;

        color:
          rgba(233,241,255,.50);

        font-size:
          7px;

        line-height:
          1.1;

        font-weight:
          500;

        white-space:
          nowrap;

        overflow:
          hidden;

        text-overflow:
          ellipsis;
      }


      /* ========================================================
        OPERATORS
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-operator {

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        color:
          rgba(233,241,255,.58);

        font-size:
          16px;

        line-height:
          1;

        font-weight:
          600;

        user-select:
          none;
      }


      /* ========================================================
        AURORA VALUE COLORS
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-value.is-basepay {

        color:
          #a9c9f5;
      }


      #${ROOT_ID}
      .pcsu-bah-header-value.is-bah {

        color:
          #8fe4d7;
      }


      #${ROOT_ID}
      .pcsu-bah-header-value.is-bas {

        color:
          #d6b3f4;
      }


      /* ========================================================
        TOTAL
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-metric.is-total {

        padding-left:
          14px;

        border-left:
          1px solid
          rgba(255,255,255,.13);
      }


      #${ROOT_ID}
      .pcsu-bah-header-value.is-total {

        color:
          #82e6d9;

        font-size:
          16px;
      }


      /* ========================================================
        MISSING
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-metric.is-missing {

        opacity:
          .58;
      }


      /* ========================================================
        PHONE
      ======================================================== */

      @media (max-width:760px) {

        #${ROOT_ID}
        .pcsu-bah-header-card {

          width:
            100%;

          padding:
            10px 12px;

          border-radius:
            16px;
        }


        /*
          MOBILE LAYOUT

          Base Pay + BAH + BAS

          = Total Monthly Compensation
        */

        #${ROOT_ID}
        .pcsu-bah-header-grid {

          grid-template-columns:

            minmax(70px,1fr)
            12px

            minmax(70px,1fr)
            12px

            minmax(70px,1fr);

          gap:
            4px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric {

          padding:
            2px 5px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-operator {

          font-size:
            14px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-label {

          font-size:
            7px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value {

          font-size:
            12px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-support {

          font-size:
            6.5px;
        }


        /*
          Hide desktop equals operator.

          Mobile total moves to its own line.
        */

        #${ROOT_ID}
        .pcsu-bah-header-equals {

          display:
            none;
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total {

          grid-column:
            1 / -1;

          margin-top:
            7px;

          padding:
            8px 6px 1px;

          border-left:
            0;

          border-top:
            1px solid
            rgba(255,255,255,.12);
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total::before {

          content:
            "= ";

          color:
            rgba(233,241,255,.58);

          font-size:
            13px;

          font-weight:
            600;
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total
        .pcsu-bah-header-label,

        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total
        .pcsu-bah-header-value {

          display:
            inline;
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total
        .pcsu-bah-header-label {

          margin-right:
            7px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value.is-total {

          font-size:
            15px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-metric.is-total
        .pcsu-bah-header-support {

          margin-top:
            3px;
        }
      }


      /* ========================================================
        VERY SMALL PHONES
      ======================================================== */

      @media (max-width:359px) {

        #${ROOT_ID}
        .pcsu-bah-header-card {

          padding:
            9px 8px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-grid {

          grid-template-columns:

            minmax(60px,1fr)
            9px

            minmax(60px,1fr)
            9px

            minmax(60px,1fr);

          gap:
            2px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-label {

          font-size:
            6.2px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value {

          font-size:
            10.8px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-support {

          font-size:
            6px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value.is-total {

          font-size:
            14px;
        }
      }


      /* ========================================================
        REDUCED MOTION
      ======================================================== */

      @media (
        prefers-reduced-motion:
        reduce
      ) {

        #${ROOT_ID},
        #${ROOT_ID} * {

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
    `;


    document.head.appendChild(
      style
    );
  }


  /* ============================================================
    START HEADER
  ============================================================ */

  function startBAHHeader() {

    const mount =
      document.getElementById(
        MOUNT_ID
      );


    if (!mount) {

      console.warn(
        `PCSUnited BAH Header mount #${MOUNT_ID} was not found.`
      );

      return false;
    }


    if (
      mount.dataset.mounted ===
        "true" ||

      document.getElementById(
        ROOT_ID
      )
    ) {

      return true;
    }


    mount.dataset.mounted =
      "true";


    ensureFont();

    ensureStyles();


    /* ============================================================
      MARKUP
    ============================================================ */

    mount.innerHTML = `

      <div
        id="${ROOT_ID}"
        data-version="${VERSION}"
        style="all:initial;"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Monthly military compensation breakdown"
      >

        <div
          class="pcsu-bah-header-card"
        >

          <div
            class="pcsu-bah-header-grid"
          >


            <!-- BASE PAY -->

            <div
              class="
                pcsu-bah-header-metric
                is-missing
              "
              id="pcsu-bah-header-tile-basepay"
            >

              <span
                class="pcsu-bah-header-label"
              >
                Base Pay
              </span>


              <span
                class="
                  pcsu-bah-header-value
                  is-basepay
                "
                id="pcsu-bah-header-value-basepay"
              >
                —
              </span>


              <span
                class="pcsu-bah-header-support"
                id="pcsu-bah-header-support-basepay"
              ></span>

            </div>


            <div
              class="pcsu-bah-header-operator"
              aria-hidden="true"
            >
              +
            </div>


            <!-- BAH -->

            <div
              class="
                pcsu-bah-header-metric
                is-missing
              "
              id="pcsu-bah-header-tile-bah"
            >

              <span
                class="pcsu-bah-header-label"
              >
                BAH
              </span>


              <span
                class="
                  pcsu-bah-header-value
                  is-bah
                "
                id="pcsu-bah-header-value-bah"
              >
                —
              </span>


              <span
                class="pcsu-bah-header-support"
                id="pcsu-bah-header-support-bah"
              ></span>

            </div>


            <div
              class="pcsu-bah-header-operator"
              aria-hidden="true"
            >
              +
            </div>


            <!-- BAS -->

            <div
              class="
                pcsu-bah-header-metric
                is-missing
              "
              id="pcsu-bah-header-tile-bas"
            >

              <span
                class="pcsu-bah-header-label"
              >
                BAS
              </span>


              <span
                class="
                  pcsu-bah-header-value
                  is-bas
                "
                id="pcsu-bah-header-value-bas"
              >
                —
              </span>


              <span
                class="pcsu-bah-header-support"
                id="pcsu-bah-header-support-bas"
              >
                Monthly
              </span>

            </div>


            <div
              class="
                pcsu-bah-header-operator
                pcsu-bah-header-equals
              "
              aria-hidden="true"
            >
              =
            </div>


            <!-- TOTAL -->

            <div
              class="
                pcsu-bah-header-metric
                is-total
                is-missing
              "
              id="pcsu-bah-header-tile-total"
            >

              <span
                class="pcsu-bah-header-label"
              >
                Total Monthly
              </span>


              <span
                class="
                  pcsu-bah-header-value
                  is-total
                "
                id="pcsu-bah-header-value-total"
              >
                —
              </span>


              <span
                class="pcsu-bah-header-support"
                id="pcsu-bah-header-support-total"
              >
                Compensation
              </span>

            </div>


          </div>
        </div>
      </div>
    `;


    const root =
      document.getElementById(
        ROOT_ID
      );


    if (!root) {

      return false;
    }


    /* ============================================================
      ELEMENT REFERENCES
    ============================================================ */

    const els = {

      tileBasePay:
        root.querySelector(
          "#pcsu-bah-header-tile-basepay"
        ),

      tileBah:
        root.querySelector(
          "#pcsu-bah-header-tile-bah"
        ),

      tileBas:
        root.querySelector(
          "#pcsu-bah-header-tile-bas"
        ),

      tileTotal:
        root.querySelector(
          "#pcsu-bah-header-tile-total"
        ),


      valueBasePay:
        root.querySelector(
          "#pcsu-bah-header-value-basepay"
        ),

      valueBah:
        root.querySelector(
          "#pcsu-bah-header-value-bah"
        ),

      valueBas:
        root.querySelector(
          "#pcsu-bah-header-value-bas"
        ),

      valueTotal:
        root.querySelector(
          "#pcsu-bah-header-value-total"
        ),


      supportBasePay:
        root.querySelector(
          "#pcsu-bah-header-support-basepay"
        ),

      supportBah:
        root.querySelector(
          "#pcsu-bah-header-support-bah"
        ),

      supportBas:
        root.querySelector(
          "#pcsu-bah-header-support-bas"
        ),

      supportTotal:
        root.querySelector(
          "#pcsu-bah-header-support-total"
        )
    };


    let latestSnapshot =
      null;


    let lastPaintKey =
      "";


    /* ============================================================
      TEXT
    ============================================================ */

    function safeText(
      node,
      value
    ) {

      if (!node) {

        return;
      }


      node.textContent =

        value == null

          ? ""

          : String(value);
    }


    /* ============================================================
      MISSING STATE
    ============================================================ */

    function setMissing(
      tile,
      value
    ) {

      if (!tile) {

        return;
      }


      const text =
        clean(value);


      tile.classList.toggle(

        "is-missing",

        (
          !text ||
          text === "—"
        )
      );
    }


    /* ============================================================
      PAINT
    ============================================================ */

    function paintSnapshot(
      snapshot
    ) {

      if (!snapshot) {

        return false;
      }


      const paintKey =
        JSON.stringify(
          snapshot
        );


      if (
        paintKey ===
        lastPaintKey
      ) {

        return true;
      }


      lastPaintKey =
        paintKey;


      latestSnapshot = {
        ...snapshot
      };


      /* VALUES */

      safeText(

        els.valueBasePay,

        snapshot.basePay ||
        "—"
      );


      safeText(

        els.valueBah,

        snapshot.bah ||
        "—"
      );


      safeText(

        els.valueBas,

        snapshot.bas ||
        "—"
      );


      safeText(

        els.valueTotal,

        snapshot.total ||
        "—"
      );


      /* CONTEXT */

      safeText(

        els.supportBasePay,

        [
          snapshot.rank,
          snapshot.yos
        ]
          .filter(Boolean)
          .join(" • ")
      );


      safeText(

        els.supportBah,

        [
          snapshot.location,
          snapshot.dependents
        ]
          .filter(Boolean)
          .join(" • ")
      );


      safeText(

        els.supportBas,

        "Monthly"
      );


      safeText(

        els.supportTotal,

        "Compensation"
      );


      /* STATE */

      setMissing(
        els.tileBasePay,
        snapshot.basePay
      );


      setMissing(
        els.tileBah,
        snapshot.bah
      );


      setMissing(
        els.tileBas,
        snapshot.bas
      );


      setMissing(
        els.tileTotal,
        snapshot.total
      );


      /* ACCESSIBILITY */

      root.setAttribute(

        "aria-label",

        `Monthly military compensation: Base Pay ${
          snapshot.basePay ||
          "unavailable"
        }, plus BAH ${
          snapshot.bah ||
          "unavailable"
        }, plus BAS ${
          snapshot.bas ||
          "unavailable"
        }, equals total monthly compensation ${
          snapshot.total ||
          "unavailable"
        }.`
      );


      return true;
    }


    /* ============================================================
      RECEIVE DATA FROM BAH CALCULATOR IFRAME
    ============================================================ */

    function receiveMessage(
      event
    ) {

      if (
        !event ||
        !isAllowedOrigin(
          event.origin
        )
      ) {

        return;
      }


      const data =
        event.data;


      if (!isObject(data)) {

        return;
      }


      if (
        data.type !==
          MESSAGE_TYPE &&

        data.source !==
          CALCULATOR_SOURCE
      ) {

        return;
      }


      const snapshot =
        normalizeSnapshot(
          data
        );


      if (!snapshot) {

        return;
      }


      paintSnapshot(
        snapshot
      );
    }


    window.addEventListener(
      "message",
      receiveMessage
    );


    /* ============================================================
      ASK IFRAME FOR CURRENT SNAPSHOT
    ============================================================ */

    function requestSnapshotFromFrames() {

      const request = {

        type:
          REQUEST_TYPE,

        source:
          SOURCE,

        version:
          VERSION
      };


      const frames =
        Array.from(
          document.querySelectorAll(
            "iframe"
          )
        );


      frames.forEach(
        (frame) => {

          try {

            if (
              frame.contentWindow
            ) {

              frame.contentWindow
                .postMessage(
                  request,
                  "*"
                );
            }

          } catch (_) {}
        }
      );
    }


    [
      0,
      250,
      750,
      1500,
      3000
    ]
      .forEach(
        (delay) => {

          setTimeout(
            requestSnapshotFromFrames,
            delay
          );
        }
      );


    /* ============================================================
      PUBLIC API
    ============================================================ */

    const existingApi =

      window.PCSU_BAH_HEADER &&
      typeof window.PCSU_BAH_HEADER ===
        "object"

        ? window.PCSU_BAH_HEADER

        : {};


    window.PCSU_BAH_HEADER =
      Object.assign(
        {},
        existingApi,
        {

          version:
            VERSION,

          source:
            SOURCE,


          getSnapshot() {

            return latestSnapshot

              ? {
                  ...latestSnapshot
                }

              : null;
          },


          setSnapshot(
            snapshot
          ) {

            const normalized =
              normalizeSnapshot(
                snapshot
              );


            return normalized

              ? paintSnapshot(
                  normalized
                )

              : false;
          },


          refresh() {

            requestSnapshotFromFrames();

            return true;
          },


          clear() {

            lastPaintKey =
              "";


            latestSnapshot =
              null;


            paintSnapshot({

              basePay:
                "—",

              bah:
                "—",

              bas:
                "—",

              total:
                "—",

              rank:
                "",

              yos:
                "",

              location:
                "",

              dependents:
                ""
            });


            return true;
          }
        }
      );


    /* ============================================================
      READY
    ============================================================ */

    window.dispatchEvent(

      new CustomEvent(
        "pcsunited:bah-header-ready",
        {

          detail: {

            version:
              VERSION,

            source:
              SOURCE,

            root
          }
        }
      )
    );


    return true;
  }


  /* ============================================================
    SAFE WEBFLOW START
  ============================================================ */

  let startAttempts =
    0;


  const MAX_START_ATTEMPTS =
    120;


  function safelyStartBAHHeader() {

    startAttempts +=
      1;


    if (
      startBAHHeader()
    ) {

      return;
    }


    if (
      startAttempts <
      MAX_START_ATTEMPTS
    ) {

      setTimeout(
        safelyStartBAHHeader,
        100
      );

      return;
    }


    console.error(

      `PCSUnited BAH Header could not find mount #${MOUNT_ID}.`
    );
  }


  if (
    document.readyState ===
      "loading"
  ) {

    document.addEventListener(

      "DOMContentLoaded",

      safelyStartBAHHeader,

      {
        once:true
      }
    );

  } else {

    safelyStartBAHHeader();
  }

})();
