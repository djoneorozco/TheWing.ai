/* ============================================================
  PCSUnited • BAH Compensation Header Strip
  Standalone Public JavaScript
  v1.0.0 • MIDNIGHT AF BLUE / AURORA

  FILE
  BAH-Calculator/bah-header.js

  OPTIONAL MOUNT
  #pcsu-bah-header-progression-widget

  PURPOSE
  - Replaces the visible Full Monthly Military Compensation panel
    with a compact live compensation header strip.
  - Displays existing calculator output only:

      Base Pay + BAH + BAS = Total Monthly Compensation

  - Does NOT calculate or modify official pay / BAH values.
  - Does NOT make API requests.
  - Does NOT use storage, navigation, or scrolling.
  - Passively reads the current BAH Calculator DOM outputs.
  - Keeps the original compensation panel in the DOM but hides it,
    preserving the existing bahcalculator.js element bindings.
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE = "pcsunited.bah.header.v1.0.0";

  const MOUNT_ID =
    "pcsu-bah-header-progression-widget";

  const ROOT_ID =
    "pcsu-bah-header-compensation-strip";

  const STYLE_ID =
    "pcsu-bah-header-styles-v100";

  const FONT_ID =
    "pcsu-bah-header-font";


  /* ============================================================
    1. SOURCE SELECTORS
  ============================================================ */

  const SELECTORS = Object.freeze({

    shell:
      "#pcsu-bah-shell",

    oldPanel:
      ".bah-compensation-panel",

    resultPanel:
      ".bah-result-panel",

    basePay:
      "#bah-basepay-amount",

    bah:
      "#bah-pay-amount",

    bas:
      "#bah-bas-amount",

    total:
      "#bah-total-amount",

    rank:
      "#bah-info-rank",

    yos:
      "#bah-info-yos",

    location:
      "#bah-info-location",

    dependents:
      "#bah-info-dependency"
  });


  /* ============================================================
    2. START
  ============================================================ */

  function startBAHHeader() {

    const shell =
      document.querySelector(
        SELECTORS.shell
      );

    if (!shell) {

      console.warn(
        "PCSUnited BAH Header could not find #pcsu-bah-shell."
      );

      return;
    }


    let mount =
      document.getElementById(
        MOUNT_ID
      );


    const oldPanel =
      shell.querySelector(
        SELECTORS.oldPanel
      );


    /* ============================================================
      3. MOUNT

      Preferred optional HTML:

      <div id="pcsu-bah-header-progression-widget"></div>

      If no mount exists, this script automatically creates one
      immediately before the current compensation panel.
    ============================================================ */

    if (!mount) {

      mount =
        document.createElement(
          "div"
        );

      mount.id =
        MOUNT_ID;


      if (
        oldPanel &&
        oldPanel.parentNode
      ) {

        oldPanel.parentNode
          .insertBefore(
            mount,
            oldPanel
          );

      } else {

        const resultPanel =
          shell.querySelector(
            SELECTORS.resultPanel
          );


        if (
          resultPanel &&
          resultPanel.parentNode
        ) {

          resultPanel
            .insertAdjacentElement(
              "afterend",
              mount
            );

        } else {

          shell.appendChild(
            mount
          );
        }
      }
    }


    if (
      mount.dataset.mounted ===
        "true" ||
      document.getElementById(
        ROOT_ID
      )
    ) {
      return;
    }


    mount.dataset.mounted =
      "true";


    /* ============================================================
      4. FONT
    ============================================================ */

    if (
      !document.getElementById(
        FONT_ID
      )
    ) {

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
      5. STYLES
    ============================================================ */

    if (
      !document.getElementById(
        STYLE_ID
      )
    ) {

      const style =
        document.createElement(
          "style"
        );

      style.id =
        STYLE_ID;


      style.textContent = `

        /* ========================================================
          ROOT
        ======================================================== */

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
            0 0 12px;
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


        #${ROOT_ID}
        .pcsu-bah-header-inner {

          width:
            100%;
        }


        /* ========================================================
          FORMULA GRID

          Base Pay + BAH + BAS = Total
        ======================================================== */

        #${ROOT_ID}
        .pcsu-bah-header-formula {

          display:
            grid;

          grid-template-columns:
            minmax(64px, 1fr)
            16px
            minmax(64px, 1fr)
            16px
            minmax(64px, 1fr)
            16px
            minmax(92px, 1.24fr);

          gap:
            6px;

          align-items:
            center;

          width:
            min(760px, 100%);

          margin:
            0 auto;

          background:
            transparent !important;
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
            10px
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
          ACCENT LINE
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


        /* Base Pay */

        #${ROOT_ID}
        .pcsu-bah-header-tile[
          data-accent="basepay"
        ]
        .pcsu-bah-header-accent {

          background:

            linear-gradient(
              90deg,
              transparent,
              #84b9ff,
              transparent
            );
        }


        /* BAH */

        #${ROOT_ID}
        .pcsu-bah-header-tile[
          data-accent="bah"
        ]
        .pcsu-bah-header-accent {

          background:

            linear-gradient(
              90deg,
              transparent,
              #76d6d0,
              transparent
            );
        }


        /* BAS */

        #${ROOT_ID}
        .pcsu-bah-header-tile[
          data-accent="bas"
        ]
        .pcsu-bah-header-accent {

          background:

            linear-gradient(
              90deg,
              transparent,
              #c997ff,
              transparent
            );
        }


        /* Total */

        #${ROOT_ID}
        .pcsu-bah-header-tile[
          data-accent="total"
        ]
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

          text-transform:
            uppercase;

          letter-spacing:
            .10em;

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
            1.08;

          font-weight:
            900;

          letter-spacing:
            -.035em;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          font-variant-numeric:
            tabular-nums;
        }


        /* ========================================================
          SUPPORT TEXT
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
            rgba(190,210,225,.60);

          font-size:
            7.5px;

          line-height:
            1.1;

          font-weight:
            600;

          letter-spacing:
            .01em;

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

          min-width:
            0;

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
          VALUE COLORS
        ======================================================== */

        #${ROOT_ID}
        .pcsu-bah-header-value.is-basepay {

          color:
            #9bc4ff;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value.is-bah {

          color:
            #8fe4d7;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value.is-bas {

          color:
            #d29bff;
        }


        #${ROOT_ID}
        .pcsu-bah-header-value.is-total {

          color:
            #82e6d9;
        }


        /* ========================================================
          TOTAL TILE
        ======================================================== */

        #${ROOT_ID}
        .pcsu-bah-header-tile.is-total {

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


        /* ========================================================
          MISSING / LOADING
        ======================================================== */

        #${ROOT_ID}
        .pcsu-bah-header-tile.is-missing {

          opacity:
            .58;
        }


        /* ========================================================
          HOVER
        ======================================================== */

        #${ROOT_ID}
        .pcsu-bah-header-tile:hover {

          transform:
            translateY(-1px);

          border-color:
            rgba(183,211,232,.28);

          filter:
            brightness(1.04);
        }


        #${ROOT_ID}
        .pcsu-bah-header-tile.is-total:hover {

          border-color:
            rgba(159,227,212,.42);
        }


        /* ========================================================
          REPLACE OLD COMPENSATION TABLE

          IMPORTANT:
          The old panel is hidden, not removed from the DOM.

          bahcalculator.js can therefore continue updating:
          #bah-basepay-amount
          #bah-pay-amount
          #bah-bas-amount
          #bah-total-amount
        ======================================================== */

        #pcsu-bah-shell.pcsu-bah-header-mounted
        .bah-compensation-panel {

          display:
            none !important;
        }


        /* ========================================================
          PHONE
        ======================================================== */

        @media (max-width:760px) {

          #${MOUNT_ID} {

            margin-bottom:
              10px;
          }


          #${ROOT_ID}
          .pcsu-bah-header-formula {

            grid-template-columns:

              minmax(58px,1fr)
              12px

              minmax(58px,1fr)
              12px

              minmax(58px,1fr)
              12px

              minmax(78px,1.16fr);

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

            letter-spacing:
              .08em;
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
          .pcsu-bah-header-formula {

            grid-template-columns:

              minmax(53px,1fr)
              10px

              minmax(53px,1fr)
              10px

              minmax(53px,1fr)
              10px

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
          DESKTOP
        ======================================================== */

        @media (min-width:900px) {

          #${ROOT_ID}
          .pcsu-bah-header-formula {

            width:
              min(820px,100%);

            gap:
              8px;
          }


          #${ROOT_ID}
          .pcsu-bah-header-tile {

            min-height:
              56px;
          }


          #${ROOT_ID}
          .pcsu-bah-header-label {

            font-size:
              8px;
          }


          #${ROOT_ID}
          .pcsu-bah-header-value {

            font-size:
              14px;
          }


          #${ROOT_ID}
          .pcsu-bah-header-support {

            font-size:
              8px;
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
      6. MARKUP
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
            class="pcsu-bah-header-inner"
          >

            <div
              class="pcsu-bah-header-formula"
            >


              <!-- ===============================================
                BASE PAY
              ================================================ -->

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


              <!-- PLUS -->

              <div
                class="pcsu-bah-header-operator"
                aria-hidden="true"
              >
                +
              </div>


              <!-- ===============================================
                BAH
              ================================================ -->

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


              <!-- PLUS -->

              <div
                class="pcsu-bah-header-operator"
                aria-hidden="true"
              >
                +
              </div>


              <!-- ===============================================
                BAS
              ================================================ -->

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
                ></span>

              </div>


              <!-- EQUALS -->

              <div
                class="pcsu-bah-header-operator"
                aria-hidden="true"
              >
                =
              </div>


              <!-- ===============================================
                TOTAL MONTHLY COMPENSATION
              ================================================ -->

              <div
                class="
                  pcsu-bah-header-tile
                  is-total
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
      </div>
    `;


    const root =
      document.getElementById(
        ROOT_ID
      );


    if (!root) {
      return;
    }


    /*
      The new header is now safely mounted.

      Hide the old compensation table visually,
      but DO NOT destroy its DOM nodes.
    */

    shell.classList.add(
      "pcsu-bah-header-mounted"
    );


    /* ============================================================
      7. HEADER ELEMENT REFERENCES
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

    let observer =
      null;


    /* ============================================================
      8. UTILITIES
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


    function cleanText(
      value
    ) {

      return String(
        value == null
          ? ""
          : value
      ).trim();
    }


    function isPendingText(
      value
    ) {

      const text =
        cleanText(value)
          .toLowerCase();


      return (

        !text ||

        text === "—" ||

        text === "..." ||

        text ===
          "calculating..."
      );
    }


    function readText(
      selector
    ) {

      const node =
        shell.querySelector(
          selector
        );


      return node
        ? cleanText(
            node.textContent
          )
        : "";
    }


    function moneyForAria(
      value
    ) {

      const text =
        cleanText(value);


      return (
        text ||
        "unavailable"
      );
    }


    /* ============================================================
      9. READ CURRENT CALCULATOR RESULTS

      IMPORTANT:
      No math happens here.

      Values come directly from bahcalculator.js.
    ============================================================ */

    function buildSnapshotFromCalculatorDOM() {

      const basePay =
        readText(
          SELECTORS.basePay
        );


      const bah =
        readText(
          SELECTORS.bah
        );


      const bas =
        readText(
          SELECTORS.bas
        );


      const total =
        readText(
          SELECTORS.total
        );


      const rank =
        readText(
          SELECTORS.rank
        );


      const yos =
        readText(
          SELECTORS.yos
        );


      const location =
        readText(
          SELECTORS.location
        );


      const dependents =
        readText(
          SELECTORS.dependents
        );


      return {

        source:
          SOURCE,

        version:
          VERSION,

        type:
          "pcsunited-bah-compensation",

        basePay,

        bah,

        bas,

        total,

        rank,

        yos,

        location,

        dependents,

        updated_at:
          new Date()
            .toISOString()
      };
    }


    function hasUsableCompensation(
      snapshot
    ) {

      if (!snapshot) {
        return false;
      }


      return (

        !isPendingText(
          snapshot.basePay
        ) ||

        !isPendingText(
          snapshot.bah
        ) ||

        !isPendingText(
          snapshot.bas
        ) ||

        !isPendingText(
          snapshot.total
        )
      );
    }


    /* ============================================================
      10. OPTIONAL FUTURE SNAPSHOT SUPPORT
    ============================================================ */

    function normalizeExternalSnapshot(
      raw
    ) {

      if (
        !raw ||
        typeof raw !== "object"
      ) {
        return null;
      }


      const detail =

        raw.detail &&
        typeof raw.detail === "object"

          ? raw.detail

          : raw.payload &&
            typeof raw.payload === "object"

            ? raw.payload

            : raw;


      const basePay =
        cleanText(

          detail.basePay ??

          detail.basicPay ??

          detail.monthly?.basePay ??

          detail.monthly?.basicPay ??

          ""
        );


      const bah =
        cleanText(

          detail.bah ??

          detail.monthlyBAH ??

          detail.monthly?.bah ??

          ""
        );


      const bas =
        cleanText(

          detail.bas ??

          detail.monthly?.bas ??

          ""
        );


      const total =
        cleanText(

          detail.total ??

          detail.totalMonthly ??

          detail.grossMonthlyComp ??

          detail.monthly
            ?.totalMonthly ??

          detail.monthly
            ?.grossMonthlyComp ??

          ""
        );


      if (
        !basePay &&
        !bah &&
        !bas &&
        !total
      ) {
        return null;
      }


      return {

        source:
          cleanText(
            detail.source
          ) ||
          SOURCE,

        version:
          cleanText(
            detail.version
          ) ||
          VERSION,

        type:
          "pcsunited-bah-compensation",

        basePay,

        bah,

        bas,

        total,

        rank:
          cleanText(
            detail.rank
          ),

        yos:
          cleanText(

            detail.yos ??

            detail.yearsOfService
          ),

        location:
          cleanText(

            detail.location ??

            detail.base
          ),

        dependents:
          cleanText(
            detail.dependents
          ),

        updated_at:

          cleanText(
            detail.updated_at
          ) ||

          new Date()
            .toISOString()
      };
    }


    /* ============================================================
      11. MISSING STATE
    ============================================================ */

    function paintMissing() {

      latestSnapshot =
        null;

      lastPaintKey =
        "missing";


      [
        els.tileBasePay,
        els.tileBah,
        els.tileBas,
        els.tileTotal
      ]
        .forEach(
          (tile) => {

            if (tile) {

              tile.classList.add(
                "is-missing"
              );
            }
          }
        );


      safeText(
        els.valueBasePay,
        "—"
      );


      safeText(
        els.valueBah,
        "—"
      );


      safeText(
        els.valueBas,
        "—"
      );


      safeText(
        els.valueTotal,
        "—"
      );


      safeText(
        els.supportBasePay,
        ""
      );


      safeText(
        els.supportBah,
        ""
      );


      safeText(
        els.supportBas,
        ""
      );


      safeText(
        els.supportTotal,
        "Compensation"
      );


      root.setAttribute(

        "aria-label",

        "Monthly military compensation breakdown. Adjust calculator inputs to see Base Pay, BAH, BAS, and total monthly compensation."
      );
    }


    /* ============================================================
      12. PAINT SNAPSHOT
    ============================================================ */

    function paintSnapshot(
      snapshot
    ) {

      const paintKey =
        JSON.stringify({

          basePay:
            snapshot.basePay,

          bah:
            snapshot.bah,

          bas:
            snapshot.bas,

          total:
            snapshot.total,

          rank:
            snapshot.rank,

          yos:
            snapshot.yos,

          location:
            snapshot.location,

          dependents:
            snapshot.dependents
        });


      if (
        paintKey ===
        lastPaintKey
      ) {
        return;
      }


      lastPaintKey =
        paintKey;


      latestSnapshot = {
        ...snapshot
      };


      const values = [

        [
          els.tileBasePay,
          snapshot.basePay
        ],

        [
          els.tileBah,
          snapshot.bah
        ],

        [
          els.tileBas,
          snapshot.bas
        ],

        [
          els.tileTotal,
          snapshot.total
        ]
      ];


      values.forEach(
        ([tile,value]) => {

          if (!tile) {
            return;
          }


          if (
            isPendingText(
              value
            )
          ) {

            tile.classList.add(
              "is-missing"
            );

          } else {

            tile.classList.remove(
              "is-missing"
            );
          }
        }
      );


      /* ========================================================
        VALUES
      ======================================================== */

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


      /* ========================================================
        SUPPORTING CONTEXT
      ======================================================== */

      const basePaySupport =
        [
          snapshot.rank,
          snapshot.yos
        ]
          .filter(Boolean)
          .join(" • ");


      const bahSupport =
        [
          snapshot.location,
          snapshot.dependents
        ]
          .filter(Boolean)
          .join(" • ");


      safeText(
        els.supportBasePay,
        basePaySupport
      );


      safeText(
        els.supportBah,
        bahSupport
      );


      safeText(
        els.supportBas,
        "Monthly"
      );


      safeText(
        els.supportTotal,
        "Compensation"
      );


      /* ========================================================
        ACCESSIBILITY
      ======================================================== */

      root.setAttribute(

        "aria-label",

        `Monthly military compensation: Base Pay ${moneyForAria(
          snapshot.basePay
        )}, plus BAH ${moneyForAria(
          snapshot.bah
        )}, plus BAS ${moneyForAria(
          snapshot.bas
        )}, equals total monthly compensation ${moneyForAria(
          snapshot.total
        )}.`
      );
    }


    /* ============================================================
      13. REFRESH FROM CALCULATOR
    ============================================================ */

    function refreshFromCalculatorDOM() {

      const snapshot =
        buildSnapshotFromCalculatorDOM();


      if (
        !hasUsableCompensation(
          snapshot
        )
      ) {

        paintMissing();

        return false;
      }


      paintSnapshot(
        snapshot
      );


      return true;
    }


    /* ============================================================
      14. RECEIVE OPTIONAL SNAPSHOT
    ============================================================ */

    function receiveSnapshot(
      eventOrSnapshot
    ) {

      const raw =

        eventOrSnapshot &&
        typeof eventOrSnapshot ===
          "object" &&
        "detail" in eventOrSnapshot

          ? eventOrSnapshot

          : {
              detail:
                eventOrSnapshot
            };


      const snapshot =
        normalizeExternalSnapshot(
          raw
        );


      if (!snapshot) {
        return false;
      }


      paintSnapshot(
        snapshot
      );


      return true;
    }


    /* ============================================================
      15. PASSIVE DOM OBSERVER

      bahcalculator.js already paints official/deterministic values
      into the existing result nodes.

      We simply mirror those values into the new header.
    ============================================================ */

    function bindCalculatorObserver() {

      const targets = [

        shell.querySelector(
          SELECTORS.basePay
        ),

        shell.querySelector(
          SELECTORS.bah
        ),

        shell.querySelector(
          SELECTORS.bas
        ),

        shell.querySelector(
          SELECTORS.total
        ),

        shell.querySelector(
          SELECTORS.rank
        ),

        shell.querySelector(
          SELECTORS.yos
        ),

        shell.querySelector(
          SELECTORS.location
        ),

        shell.querySelector(
          SELECTORS.dependents
        )
      ]
        .filter(Boolean);


      if (
        !targets.length ||
        typeof MutationObserver !==
          "function"
      ) {
        return false;
      }


      observer =
        new MutationObserver(
          () => {

            refreshFromCalculatorDOM();
          }
        );


      targets.forEach(
        (target) => {

          observer.observe(
            target,
            {

              childList:
                true,

              characterData:
                true,

              subtree:
                true
            }
          );
        }
      );


      return true;
    }


    /* ============================================================
      16. INIT
    ============================================================ */

    function init() {

      paintMissing();


      bindCalculatorObserver();


      /* ========================================================
        FUTURE-COMPATIBLE EVENTS

        Current BAH calculator does not need these events for the
        header to work.

        DOM observation handles the current implementation.
      ======================================================== */

      window.addEventListener(

        "pcsunited:bah-calculator-updated",

        (event) => {

          if (
            !receiveSnapshot(
              event
            )
          ) {

            refreshFromCalculatorDOM();
          }
        }
      );


      window.addEventListener(

        "pcsunited:bah-result-updated",

        (event) => {

          if (
            !receiveSnapshot(
              event
            )
          ) {

            refreshFromCalculatorDOM();
          }
        }
      );


      /* ========================================================
        POSTMESSAGE FUTURE SUPPORT
      ======================================================== */

      window.addEventListener(

        "message",

        (event) => {

          const data =
            event &&
            event.data;


          if (
            !data ||
            typeof data !==
              "object"
          ) {
            return;
          }


          if (
            data.type ===
              "pcsunited-bah-compensation" ||

            data.source ===
              "pcsunited.bah.calculator"
          ) {

            if (
              !receiveSnapshot({
                detail:
                  data.detail ||
                  data.payload ||
                  data
              })
            ) {

              refreshFromCalculatorDOM();
            }
          }
        }
      );


      /* ========================================================
        PASSIVE HYDRATION
      ======================================================== */

      refreshFromCalculatorDOM();


      setTimeout(
        refreshFromCalculatorDOM,
        100
      );


      setTimeout(
        refreshFromCalculatorDOM,
        500
      );


      setTimeout(
        refreshFromCalculatorDOM,
        1200
      );


      /* ========================================================
        PUBLIC HEADER API
      ======================================================== */

      const existingHeaderApi =

        window.PCSU_BAH_HEADER &&

        typeof window
          .PCSU_BAH_HEADER ===
          "object"

          ? window.PCSU_BAH_HEADER

          : {};


      window.PCSU_BAH_HEADER =
        Object.assign(
          {},
          existingHeaderApi,
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

              return receiveSnapshot({
                detail:
                  snapshot || {}
              });
            },


            refresh() {

              return (
                refreshFromCalculatorDOM()
              );
            },


            clear() {

              paintMissing();

              return true;
            },


            destroy() {

              if (observer) {

                observer.disconnect();

                observer =
                  null;
              }


              shell.classList.remove(
                "pcsu-bah-header-mounted"
              );


              return true;
            }
          }
        );


      /* ========================================================
        READY EVENT
      ======================================================== */

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
    }


    init();
  }


  /* ============================================================
  17. SAFE WEBFLOW DOM START
=============================================================== */

let bahHeaderStartAttempts = 0;

const BAH_HEADER_MAX_ATTEMPTS = 120;

function safelyStartBAHHeader() {

  bahHeaderStartAttempts += 1;

  const shell =
    document.getElementById(
      "pcsu-bah-shell"
    );

  const mount =
    document.getElementById(
      "pcsu-bah-header-progression-widget"
    );

  if (
    shell &&
    mount
  ) {

    startBAHHeader();

    return;
  }


  if (
    bahHeaderStartAttempts <
    BAH_HEADER_MAX_ATTEMPTS
  ) {

    setTimeout(
      safelyStartBAHHeader,
      100
    );

    return;
  }


  console.error(
    "BAH Header could not start.",
    {
      shellFound:Boolean(shell),
      mountFound:Boolean(mount)
    }
  );
}


/* Start after DOM is available */

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
