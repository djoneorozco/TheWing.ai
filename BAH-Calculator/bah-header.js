/* ============================================================
  PCSUnited • BAH Compensation Header Strip
  Standalone Public JavaScript
  v1.1.0 • MIDNIGHT AF BLUE / AURORA

  FILE
  BAH-Calculator/bah-header.js

  REQUIRED MOUNT
  #pcsu-bah-header-progression-widget

  ARCHITECTURE
  - Runs on the Webflow parent page.
  - Does NOT require #pcsu-bah-shell in the parent document.
  - Receives compensation snapshots from the BAH Calculator iframe
    through window.postMessage().
  - Sends a passive snapshot request to embedded frames on mount.
  - Does NOT calculate BAH, Base Pay, BAS, or Total Compensation.
  - Does NOT make API requests or use storage.
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.1.0";
  const SOURCE = "pcsunited.bah.header.v1.1.0";

  const MOUNT_ID =
    "pcsu-bah-header-progression-widget";

  const ROOT_ID =
    "pcsu-bah-header-compensation-strip";

  const STYLE_ID =
    "pcsu-bah-header-styles-v110";

  const FONT_ID =
    "pcsu-bah-header-font";

  const MESSAGE_TYPE =
    "pcsunited-bah-compensation";

  const REQUEST_TYPE =
    "pcsunited-bah-header-request";

  const CALCULATOR_SOURCE =
    "pcsunited.bah.calculator";


  /* ============================================================
    ALLOWED CALCULATOR ORIGINS
  ============================================================ */

  const ALLOWED_ORIGINS =
    new Set([
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

    return ALLOWED_ORIGINS.has(
      origin
    );
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


    const text =
      clean(value);


    return (
      text ||
      "—"
    );
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
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";


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
    STYLES
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
          10px 0 14px;
      }


      #${ROOT_ID} {

        display:
          block;

        width:
          100%;

        color:
          #f3f8fc;

        background:
          transparent !important;
      }


      #${ROOT_ID}
      .pcsu-bah-header-wrap {

        width:
          100%;

        display:
          flex;

        align-items:
          center;

        justify-content:
          center;

        background:
          transparent !important;
      }


      /* ========================================================
        MAIN FORMULA GRID
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-grid {

        display:
          grid;

        grid-template-columns:

          minmax(82px,1fr)
          18px

          minmax(82px,1fr)
          18px

          minmax(82px,1fr)
          18px

          minmax(118px,1.25fr);

        gap:
          8px;

        align-items:
          center;

        width:
          min(820px,100%);

        margin:
          0 auto;
      }


      /* ========================================================
        TILE
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-tile {

        position:
          relative;

        overflow:
          hidden;

        min-width:
          0;

        min-height:
          52px;

        display:
          flex;

        flex-direction:
          column;

        justify-content:
          center;

        align-items:
          center;

        padding:
          8px
          12px
          10px;

        border:
          1px solid
          rgba(183,211,232,.18);

        border-radius:
          999px;

        background:

          radial-gradient(
            120px 58px
            at 24% 0%,
            rgba(116,177,216,.15),
            transparent 70%
          ),

          linear-gradient(
            180deg,
            rgba(25,52,78,.94),
            rgba(10,30,48,.92)
          );

        color:
          #f3f8fc;

        text-align:
          center;

        box-shadow:

          inset
          0 1px 0
          rgba(221,237,247,.10),

          0 10px 24px
          rgba(2,12,24,.30);

        backdrop-filter:
          blur(12px)
          saturate(145%);

        -webkit-backdrop-filter:
          blur(12px)
          saturate(145%);

        transition:

          opacity .18s ease,
          transform .18s ease,
          filter .18s ease,
          border-color .18s ease;
      }


      #${ROOT_ID}
      .pcsu-bah-header-tile::before {

        content:
          "";

        position:
          absolute;

        inset:
          0 0 auto;

        height:
          1px;

        background:

          linear-gradient(
            90deg,
            transparent,
            rgba(228,192,113,.32),
            rgba(124,203,217,.18),
            transparent
          );

        pointer-events:
          none;
      }


      #${ROOT_ID}
      .pcsu-bah-header-tile::after {

        content:
          "";

        position:
          absolute;

        inset:
          0;

        border-radius:
          inherit;

        background:

          linear-gradient(
            180deg,
            rgba(218,235,246,.035),
            rgba(218,235,246,0)
            46%
          );

        pointer-events:
          none;
      }


      /* ========================================================
        ACCENT
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-accent {

        position:
          absolute;

        left:
          10px;

        right:
          10px;

        bottom:
          6px;

        height:
          2px;

        border-radius:
          999px;

        opacity:
          .82;

        pointer-events:
          none;
      }


      #${ROOT_ID}
      [data-accent="basepay"]
      .pcsu-bah-header-accent {

        background:

          linear-gradient(
            90deg,
            transparent,
            #84b9ff,
            transparent
          );
      }


      #${ROOT_ID}
      [data-accent="bah"]
      .pcsu-bah-header-accent {

        background:

          linear-gradient(
            90deg,
            transparent,
            #76d6d0,
            transparent
          );
      }


      #${ROOT_ID}
      [data-accent="bas"]
      .pcsu-bah-header-accent {

        background:

          linear-gradient(
            90deg,
            transparent,
            #c997ff,
            transparent
          );
      }


      #${ROOT_ID}
      [data-accent="total"]
      .pcsu-bah-header-accent {

        background:

          linear-gradient(
            90deg,
            transparent,
            #9fe3d4,
            #e4c071,
            transparent
          );
      }


      /* ========================================================
        LABEL
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-label {

        position:
          relative;

        z-index:
          2;

        display:
          block;

        max-width:
          100%;

        margin-bottom:
          3px;

        overflow:
          hidden;

        color:
          rgba(205,223,236,.66);

        font-size:
          7.5px;

        line-height:
          1;

        font-weight:
          900;

        letter-spacing:
          .10em;

        text-transform:
          uppercase;

        text-overflow:
          ellipsis;

        white-space:
          nowrap;
      }


      /* ========================================================
        VALUE
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-value {

        position:
          relative;

        z-index:
          2;

        display:
          block;

        max-width:
          100%;

        overflow:
          hidden;

        color:
          #f4f8fb;

        font-size:
          13px;

        line-height:
          1.05;

        font-weight:
          900;

        letter-spacing:
          -.03em;

        text-overflow:
          ellipsis;

        white-space:
          nowrap;

        font-variant-numeric:
          tabular-nums;
      }


      /* ========================================================
        SUPPORT
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-support {

        position:
          relative;

        z-index:
          2;

        display:
          block;

        max-width:
          100%;

        min-height:
          9px;

        margin-top:
          2px;

        overflow:
          hidden;

        color:
          rgba(190,210,225,.62);

        font-size:
          7.5px;

        line-height:
          1.1;

        font-weight:
          600;

        text-overflow:
          ellipsis;

        white-space:
          nowrap;
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
          rgba(214,228,239,.68);

        font-size:
          18px;

        line-height:
          1;

        font-weight:
          800;

        user-select:
          none;
      }


      /* ========================================================
        COLORS
      ======================================================== */

      #${ROOT_ID}
      .is-basepay {

        color:
          #9bc4ff;
      }


      #${ROOT_ID}
      .is-bah {

        color:
          #8fe4d7;
      }


      #${ROOT_ID}
      .is-bas {

        color:
          #d29bff;
      }


      #${ROOT_ID}
      .is-total {

        color:
          #82e6d9;
      }


      /* ========================================================
        TOTAL
      ======================================================== */

      #${ROOT_ID}
      .pcsu-bah-header-tile.is-total-tile {

        border-color:
          rgba(159,227,212,.30);

        background:

          radial-gradient(
            150px 70px
            at 30% 0%,
            rgba(159,227,212,.14),
            transparent 72%
          ),

          radial-gradient(
            130px 66px
            at 88% 0%,
            rgba(228,192,113,.08),
            transparent 74%
          ),

          linear-gradient(
            180deg,
            rgba(31,57,75,.96),
            rgba(13,31,47,.94)
          );
      }


      #${ROOT_ID}
      .pcsu-bah-header-tile.is-missing {

        opacity:
          .58;
      }


      #${ROOT_ID}
      .pcsu-bah-header-tile:hover {

        transform:
          translateY(-1px);

        border-color:
          rgba(183,211,232,.28);

        filter:
          brightness(1.04);
      }


      /* ========================================================
        PHONE
      ======================================================== */

      @media (max-width:760px) {

        #${MOUNT_ID} {

          margin:
            8px 0 10px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-grid {

          grid-template-columns:

            minmax(58px,1fr)
            12px

            minmax(58px,1fr)
            12px

            minmax(58px,1fr)
            12px

            minmax(82px,1.18fr);

          gap:
            4px;

          width:
            100%;
        }


        #${ROOT_ID}
        .pcsu-bah-header-tile {

          min-height:
            54px;

          padding:
            8px
            6px
            10px;

          border-radius:
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
            7px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-operator {

          font-size:
            15px;
        }
      }


      /* ========================================================
        VERY SMALL PHONES
      ======================================================== */

      @media (max-width:359px) {

        #${ROOT_ID}
        .pcsu-bah-header-grid {

          grid-template-columns:

            minmax(52px,1fr)
            9px

            minmax(52px,1fr)
            9px

            minmax(52px,1fr)
            9px

            minmax(70px,1.16fr);

          gap:
            2px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-tile {

          min-height:
            50px;

          padding:
            7px
            4px
            9px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-label {

          font-size:
            6.2px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value {

          font-size:
            10.5px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-support {

          font-size:
            6.2px;
        }


        #${ROOT_ID}
        .pcsu-bah-header-operator {

          font-size:
            13px;
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


    /*
      IMPORTANT:
      We intentionally DO NOT search for
      #pcsu-bah-shell here anymore.

      That calculator lives in the iframe.
    */

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
          class="pcsu-bah-header-wrap"
        >

          <div
            class="pcsu-bah-header-grid"
          >


            <!-- BASE PAY -->

            <div
              class="
                pcsu-bah-header-tile
                is-missing
              "
              data-accent="basepay"
              id="pcsu-bah-header-tile-basepay"
            >

              <span
                class="pcsu-bah-header-accent"
                aria-hidden="true"
              ></span>


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
                pcsu-bah-header-tile
                is-missing
              "
              data-accent="bah"
              id="pcsu-bah-header-tile-bah"
            >

              <span
                class="pcsu-bah-header-accent"
                aria-hidden="true"
              ></span>


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
                pcsu-bah-header-tile
                is-missing
              "
              data-accent="bas"
              id="pcsu-bah-header-tile-bas"
            >

              <span
                class="pcsu-bah-header-accent"
                aria-hidden="true"
              ></span>


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
              class="pcsu-bah-header-operator"
              aria-hidden="true"
            >
              =
            </div>


            <!-- TOTAL -->

            <div
              class="
                pcsu-bah-header-tile
                is-total-tile
                is-missing
              "
              data-accent="total"
              id="pcsu-bah-header-tile-total"
            >

              <span
                class="pcsu-bah-header-accent"
                aria-hidden="true"
              ></span>


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
      TEXT HELPER
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
      TILE STATE
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
      ASK EMBEDDED CALCULATOR FOR CURRENT SNAPSHOT
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

          } catch (_) {

            /*
              Ignore unrelated iframe access errors.
            */
          }
        }
      );
    }


    /*
      Send several passive requests because
      Webflow and the calculator iframe can
      finish booting at slightly different times.
    */

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
