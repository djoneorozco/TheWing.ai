/* ============================================================
  PCSUnited • Air Force PT Score Header Strip
  Standalone Public JavaScript
  v1.0.0

  FILE
  PT-Calculator/pt-header.js

  REQUIRED MOUNT
  #pcsu-pt-header-widget

  PURPOSE
  - Injects a compact PT score breakdown into the page header
  - Displays:
      • Body Composition / 20
      • Strength / 15
      • Core / 15
      • Cardio / 50
      • Total PT Score / 100
  - Reads the existing Air Force PT Calculator DOM
  - Updates automatically as calculator inputs change
  - Supports the medical-only 2 km Walk presentation
  - Supports optional PCSUnited PT score events
  - Does not call an API
  - Does not use localStorage or sessionStorage
  - Does not navigate or scroll the page

  CURRENT CALCULATOR ROOT
  #af-pt-shell

  OPTIONAL EVENT
  pcsunited:pt-score-updated
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE = "pcsunited.pt.header.v1.0.0";

  const MOUNT_ID = "pcsu-pt-header-widget";
  const ROOT_ID = "pcsu-pt-header-strip";
  const STYLE_ID = "pcsu-pt-header-styles-v100";
  const FONT_ID = "pcsu-pt-header-font";

  const CALCULATOR_ROOT_ID = "af-pt-shell";

  const SCORE_CAPS = {
    body: 20,
    strength: 15,
    core: 15,
    cardio: 50,
    total: 100
  };

  const COMPONENT_MINIMUMS = {
    strength: 2.5,
    core: 2.5,
    cardio: 35
  };

  /* ============================================================
    1. START
  ============================================================ */

  function startPTHeader() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn(
        `PCSUnited PT Header mount #${MOUNT_ID} was not found.`
      );

      return;
    }

    if (
      mount.dataset.mounted === "true" ||
      document.getElementById(ROOT_ID)
    ) {
      return;
    }

    mount.dataset.mounted = "true";

    /* ============================================================
      2. FONT
    ============================================================ */

    if (!document.getElementById(FONT_ID)) {
      const fontLink = document.createElement("link");

      fontLink.id = FONT_ID;
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";

      document.head.appendChild(fontLink);
    }

    /* ============================================================
      3. STYLES
    ============================================================ */

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");

      style.id = STYLE_ID;

      style.textContent = `
        #${ROOT_ID},
        #${ROOT_ID} * {
          box-sizing: border-box;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        #${ROOT_ID} {
          display: block;
          width: 100%;
          color: #f5f5f5;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-pt-header-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-pt-header-inner {
          width: 100%;
        }

        #${ROOT_ID} .pcsu-pt-header-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(94px, 1fr))
            minmax(112px, 1.15fr);
          gap: 8px;
          width: min(700px, 100%);
          margin: 0 auto;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-pt-header-tile {
          --pcsu-pt-accent: rgba(106, 167, 255, 0.34);

          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 48px;
          padding: 7px 10px 8px;
          overflow: hidden;
          text-align: center;

          border:
            1px solid
            rgba(255, 255, 255, 0.17);

          border-radius: 999px;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.90),
              rgba(238, 241, 248, 0.77)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.96),
            0 8px 18px
              rgba(0, 0, 0, 0.18);

          backdrop-filter:
            blur(10px)
            saturate(135%);

          -webkit-backdrop-filter:
            blur(10px)
            saturate(135%);

          transition:
            opacity 0.18s ease,
            transform 0.18s ease,
            filter 0.18s ease,
            border-color 0.18s ease;
        }

        #${ROOT_ID} .pcsu-pt-header-tile::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              var(--pcsu-pt-accent),
              transparent
            );

          pointer-events: none;
        }

        #${ROOT_ID} .pcsu-pt-header-tile::after {
          content: "";
          position: absolute;
          right: 18%;
          bottom: 0;
          left: 18%;
          height: 2px;
          border-radius: 999px 999px 0 0;
          background: var(--pcsu-pt-accent);
          opacity: 0.68;
          pointer-events: none;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-body {
          --pcsu-pt-accent:
            rgba(77, 177, 196, 0.74);
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-strength {
          --pcsu-pt-accent:
            rgba(222, 132, 91, 0.76);
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-core {
          --pcsu-pt-accent:
            rgba(126, 141, 205, 0.76);
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-cardio {
          --pcsu-pt-accent:
            rgba(69, 173, 143, 0.76);
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total {
          --pcsu-pt-accent:
            rgba(199, 156, 79, 0.84);

          border-color:
            rgba(199, 156, 79, 0.29);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.95),
              rgba(244, 238, 222, 0.83)
            );
        }

        #${ROOT_ID} .pcsu-pt-header-label {
          display: block;
          max-width: 100%;
          margin-bottom: 2px;
          overflow: hidden;

          color:
            rgba(18, 24, 38, 0.58);

          font-size: 7.5px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.11em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-pt-header-value {
          display: block;
          max-width: 100%;
          overflow: hidden;

          color: #101728;

          font-size: 12.5px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.03em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-pt-header-meta {
          display: block;
          max-width: 100%;
          min-height: 8px;
          margin-top: 3px;
          overflow: hidden;

          color:
            rgba(18, 24, 38, 0.52);

          font-size: 6.8px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.01em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${ROOT_ID}
          .pcsu-pt-header-tile.is-body
          .pcsu-pt-header-value {
          color: #26778a;
        }

        #${ROOT_ID}
          .pcsu-pt-header-tile.is-strength
          .pcsu-pt-header-value {
          color: #a85435;
        }

        #${ROOT_ID}
          .pcsu-pt-header-tile.is-core
          .pcsu-pt-header-value {
          color: #5866a5;
        }

        #${ROOT_ID}
          .pcsu-pt-header-tile.is-cardio
          .pcsu-pt-header-value {
          color: #18795c;
        }

        #${ROOT_ID}
          .pcsu-pt-header-tile.is-total
          .pcsu-pt-header-value {
          color: #927032;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-good {
          color: #16795a !important;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-caution {
          color: #9b7939 !important;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-danger {
          color: #a23c5a !important;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-neutral {
          color: #101728 !important;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-missing {
          opacity: 0.60;
          filter: saturate(72%);
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-updating {
          opacity: 0.76;
        }

        #${ROOT_ID} .pcsu-pt-header-sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        @media (max-width: 900px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            width: min(650px, 100%);
            gap: 6px;
          }

          #${ROOT_ID} .pcsu-pt-header-label {
            font-size: 7px;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: 12px;
          }

          #${ROOT_ID} .pcsu-pt-header-meta {
            font-size: 6.5px;
          }
        }

        @media (max-width: 760px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            width: 100%;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            min-height: 50px;
            padding: 8px 10px;
            border-radius: 13px;
          }

          #${ROOT_ID}
            .pcsu-pt-header-tile.is-total {
            grid-column: 1 / -1;
          }

          #${ROOT_ID} .pcsu-pt-header-label {
            font-size: 8.5px;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: 15px;
          }

          #${ROOT_ID} .pcsu-pt-header-meta {
            min-height: 9px;
            font-size: 7.5px;
          }
        }

        @media (max-width: 390px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            gap: 5px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            min-height: 48px;
            padding-right: 7px;
            padding-left: 7px;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #${ROOT_ID},
          #${ROOT_ID} * {
            transition-duration:
              0.01ms !important;

            animation-duration:
              0.01ms !important;

            animation-iteration-count:
              1 !important;

            scroll-behavior:
              auto !important;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /* ============================================================
      4. MARKUP
    ============================================================ */

    mount.innerHTML = `
      <div
        id="${ROOT_ID}"
        data-version="${VERSION}"
        data-source="${SOURCE}"
        data-mode="standard"
        role="region"
        aria-label="Air Force PT score breakdown"
        style="all: initial;"
      >
        <div class="pcsu-pt-header-wrap">
          <div class="pcsu-pt-header-inner">
            <div class="pcsu-pt-header-grid">

              <div
                class="
                  pcsu-pt-header-tile
                  is-body
                  is-missing
                "
                id="pcsu-pt-header-body-tile"
              >
                <span class="pcsu-pt-header-label">
                  Body Comp
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-header-body-value"
                >
                  — / 20
                </span>

                <span
                  class="pcsu-pt-header-meta"
                  id="pcsu-pt-header-body-meta"
                >
                  Waiting for calculator
                </span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-strength
                  is-missing
                "
                id="pcsu-pt-header-strength-tile"
              >
                <span class="pcsu-pt-header-label">
                  Strength
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-header-strength-value"
                >
                  — / 15
                </span>

                <span
                  class="pcsu-pt-header-meta"
                  id="pcsu-pt-header-strength-meta"
                >
                  Waiting for calculator
                </span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-core
                  is-missing
                "
                id="pcsu-pt-header-core-tile"
              >
                <span class="pcsu-pt-header-label">
                  Core
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-header-core-value"
                >
                  — / 15
                </span>

                <span
                  class="pcsu-pt-header-meta"
                  id="pcsu-pt-header-core-meta"
                >
                  Waiting for calculator
                </span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-cardio
                  is-missing
                "
                id="pcsu-pt-header-cardio-tile"
              >
                <span class="pcsu-pt-header-label">
                  Cardio
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-header-cardio-value"
                >
                  — / 50
                </span>

                <span
                  class="pcsu-pt-header-meta"
                  id="pcsu-pt-header-cardio-meta"
                >
                  Waiting for calculator
                </span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-total
                  is-missing
                "
                id="pcsu-pt-header-total-tile"
              >
                <span class="pcsu-pt-header-label">
                  PT Score
                </span>

                <span
                  class="
                    pcsu-pt-header-value
                    is-caution
                  "
                  id="pcsu-pt-header-total-value"
                >
                  —
                </span>

                <span
                  class="pcsu-pt-header-meta"
                  id="pcsu-pt-header-total-meta"
                >
                  Waiting for calculator
                </span>
              </div>

            </div>

            <span
              class="pcsu-pt-header-sr-only"
              id="pcsu-pt-header-live-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            ></span>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(ROOT_ID);

    if (!root) return;

    /* ============================================================
      5. ELEMENT REFERENCES
    ============================================================ */

    const els = {
      bodyTile:
        root.querySelector(
          "#pcsu-pt-header-body-tile"
        ),

      bodyValue:
        root.querySelector(
          "#pcsu-pt-header-body-value"
        ),

      bodyMeta:
        root.querySelector(
          "#pcsu-pt-header-body-meta"
        ),

      strengthTile:
        root.querySelector(
          "#pcsu-pt-header-strength-tile"
        ),

      strengthValue:
        root.querySelector(
          "#pcsu-pt-header-strength-value"
        ),

      strengthMeta:
        root.querySelector(
          "#pcsu-pt-header-strength-meta"
        ),

      coreTile:
        root.querySelector(
          "#pcsu-pt-header-core-tile"
        ),

      coreValue:
        root.querySelector(
          "#pcsu-pt-header-core-value"
        ),

      coreMeta:
        root.querySelector(
          "#pcsu-pt-header-core-meta"
        ),

      cardioTile:
        root.querySelector(
          "#pcsu-pt-header-cardio-tile"
        ),

      cardioValue:
        root.querySelector(
          "#pcsu-pt-header-cardio-value"
        ),

      cardioMeta:
        root.querySelector(
          "#pcsu-pt-header-cardio-meta"
        ),

      totalTile:
        root.querySelector(
          "#pcsu-pt-header-total-tile"
        ),

      totalValue:
        root.querySelector(
          "#pcsu-pt-header-total-value"
        ),

      totalMeta:
        root.querySelector(
          "#pcsu-pt-header-total-meta"
        ),

      liveStatus:
        root.querySelector(
          "#pcsu-pt-header-live-status"
        )
    };

    const tiles = [
      els.bodyTile,
      els.strengthTile,
      els.coreTile,
      els.cardioTile,
      els.totalTile
    ].filter(Boolean);

    let calculatorRoot = null;
    let calculatorObserver = null;
    let calculatorEventHandler = null;

    let syncQueued = false;
    let retryCount = 0;
    let retryTimer = null;

    let latestState = createEmptyState();

    /* ============================================================
      6. GENERAL UTILITIES
    ============================================================ */

    function clean(value) {
      return value === undefined ||
        value === null
        ? ""
        : String(value).trim();
    }

    function clamp(value, min, max) {
      return Math.min(
        Math.max(value, min),
        max
      );
    }

    function finiteOrNull(value) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      if (
        typeof value === "number" &&
        Number.isFinite(value)
      ) {
        return value;
      }

      const normalized = String(value)
        .replace(/,/g, "")
        .replace(/[^0-9.+-]/g, "");

      if (!normalized) {
        return null;
      }

      const number = Number(normalized);

      return Number.isFinite(number)
        ? number
        : null;
    }

    function firstFinite(...values) {
      for (
        let i = 0;
        i < values.length;
        i += 1
      ) {
        const number =
          finiteOrNull(values[i]);

        if (number !== null) {
          return number;
        }
      }

      return null;
    }

    function firstBoolean(...values) {
      for (
        let i = 0;
        i < values.length;
        i += 1
      ) {
        if (values[i] === true) {
          return true;
        }

        if (values[i] === false) {
          return false;
        }
      }

      return null;
    }

    function roundToHalf(value) {
      const number = finiteOrNull(value);

      if (number === null) {
        return null;
      }

      return (
        Math.round(
          (number + Number.EPSILON) * 2
        ) / 2
      );
    }

    function formatScore(value) {
      const number = finiteOrNull(value);

      if (number === null) {
        return "—";
      }

      return number.toFixed(1);
    }

    function formatComponent(
      value,
      maximum
    ) {
      const number = finiteOrNull(value);

      if (number === null) {
        return `— / ${maximum}`;
      }

      return (
        `${number.toFixed(1)} / ${maximum}`
      );
    }

    function safeText(node, value) {
      if (!node) return;

      node.textContent =
        value === undefined ||
        value === null
          ? ""
          : String(value);
    }

    function textFrom(
      parent,
      selector
    ) {
      const node =
        parent &&
        parent.querySelector(selector);

      return clean(
        node && node.textContent
      );
    }

    function valueFrom(
      parent,
      selector
    ) {
      const node =
        parent &&
        parent.querySelector(selector);

      if (!node) return "";

      return clean(node.value);
    }

    function createEmptyState() {
      return {
        bodyScore: null,
        strengthScore: null,
        coreScore: null,
        cardioScore: null,
        total: null,

        category: "",
        ratio: null,

        cardioMode: "standard",
        walkMode: false,
        walkPassed: null,

        strengthPassed: null,
        corePassed: null,
        cardioPassed: null,

        strengthEvent: "",
        coreEvent: "",
        cardioEvent: "",

        ageGroup: "",
        sex: "",

        source: SOURCE,
        updatedAt: null
      };
    }

    function hasScoreData(state) {
      return Boolean(
        state &&
        (
          finiteOrNull(
            state.bodyScore
          ) !== null ||
          finiteOrNull(
            state.strengthScore
          ) !== null ||
          finiteOrNull(
            state.coreScore
          ) !== null ||
          finiteOrNull(
            state.cardioScore
          ) !== null ||
          finiteOrNull(
            state.total
          ) !== null ||
          state.walkPassed === true ||
          state.walkPassed === false
        )
      );
    }

    /* ============================================================
      7. BAR SCORE EXTRACTION
    ============================================================ */

    function readBarScore(
      bar,
      maximum
    ) {
      if (!bar) return null;

      const explicitScore = firstFinite(
        bar.dataset &&
          bar.dataset.score,

        bar.getAttribute(
          "data-points"
        ),

        bar.getAttribute(
          "aria-valuenow"
        )
      );

      if (explicitScore !== null) {
        return roundToHalf(
          clamp(
            explicitScore,
            0,
            maximum
          )
        );
      }

      const inlineHeight =
        clean(bar.style.height);

      if (
        inlineHeight &&
        inlineHeight.endsWith("%")
      ) {
        const percentage =
          finiteOrNull(inlineHeight);

        if (percentage !== null) {
          return roundToHalf(
            clamp(
              percentage,
              0,
              100
            ) /
              100 *
              maximum
          );
        }
      }

      const parent =
        bar.parentElement;

      if (!parent) return null;

      const barHeight =
        bar.getBoundingClientRect()
          .height;

      const parentHeight =
        parent.getBoundingClientRect()
          .height;

      if (
        !Number.isFinite(barHeight) ||
        !Number.isFinite(parentHeight) ||
        parentHeight <= 0
      ) {
        return null;
      }

      return roundToHalf(
        clamp(
          barHeight / parentHeight,
          0,
          1
        ) * maximum
      );
    }

    /* ============================================================
      8. DOM STATE EXTRACTION
    ============================================================ */

    function readBodyScore(
      calculator
    ) {
      const bodyText =
        textFrom(
          calculator,
          "#bodyCompScoreText"
        );

      const match =
        bodyText.match(
          /(-?\d+(?:\.\d+)?)\s*\/\s*20/
        );

      if (match) {
        return roundToHalf(
          clamp(
            Number(match[1]),
            0,
            SCORE_CAPS.body
          )
        );
      }

      const bodyBar =
        calculator.querySelector(
          "#barBody"
        );

      return readBarScore(
        bodyBar,
        SCORE_CAPS.body
      );
    }

    function readTotalScore(
      calculator
    ) {
      const raw =
        textFrom(
          calculator,
          "#scoreNumber"
        );

      const upper =
        raw.toUpperCase();

      if (
        upper === "PASS" ||
        upper === "FAIL"
      ) {
        return null;
      }

      const value =
        finiteOrNull(raw);

      if (value === null) {
        return null;
      }

      return clamp(
        value,
        0,
        SCORE_CAPS.total
      );
    }

    function stateFromCalculatorDOM() {
      const calculator =
        document.getElementById(
          CALCULATOR_ROOT_ID
        );

      if (!calculator) {
        return createEmptyState();
      }

      const strengthBar =
        calculator.querySelector(
          "#barStrength"
        );

      const coreBar =
        calculator.querySelector(
          "#barCore"
        );

      const cardioBar =
        calculator.querySelector(
          "#barCardio"
        );

      const scoreNumberText =
        textFrom(
          calculator,
          "#scoreNumber"
        );

      const category =
        textFrom(
          calculator,
          "#scoreLabel"
        );

      const cardioEvent =
        valueFrom(
          calculator,
          "#cardioEvent"
        );

      const cardioModeLabel =
        textFrom(
          calculator,
          "#cardioModeLabel"
        );

      const normalizedCardio =
        (
          cardioEvent ||
          cardioModeLabel
        ).toLowerCase();

      const normalizedScoreNumber =
        scoreNumberText.toUpperCase();

      const walkMode =
        normalizedCardio.includes("walk") ||
        normalizedScoreNumber === "PASS" ||
        normalizedScoreNumber === "FAIL" ||
        category
          .toLowerCase()
          .includes("2 km walk");

      const walkPassed =
        walkMode
          ? normalizedScoreNumber ===
              "PASS"
          : null;

      const bodyScore =
        readBodyScore(calculator);

      const strengthScore =
        readBarScore(
          strengthBar,
          SCORE_CAPS.strength
        );

      const coreScore =
        readBarScore(
          coreBar,
          SCORE_CAPS.core
        );

      const cardioScore =
        walkMode
          ? 0
          : readBarScore(
              cardioBar,
              SCORE_CAPS.cardio
            );

      let total =
        walkMode
          ? null
          : readTotalScore(calculator);

      if (
        !walkMode &&
        total === null &&
        bodyScore !== null &&
        strengthScore !== null &&
        coreScore !== null &&
        cardioScore !== null
      ) {
        total = clamp(
          bodyScore +
            strengthScore +
            coreScore +
            cardioScore,
          0,
          SCORE_CAPS.total
        );
      }

      const ratio = finiteOrNull(
        textFrom(
          calculator,
          "#ratioValue"
        )
      );

      return normalizeState({
        bodyScore,
        strengthScore,
        coreScore,
        cardioScore,
        total,

        category,
        ratio,

        cardioMode:
          walkMode
            ? "walk"
            : normalizedCardio.includes(
                  "hamr"
                )
              ? "hamr"
              : "run",

        walkMode,
        walkPassed,

        strengthEvent:
          valueFrom(
            calculator,
            "#strengthEvent"
          ) ||
          textFrom(
            calculator,
            "#strengthModeLabel"
          ),

        coreEvent:
          valueFrom(
            calculator,
            "#enduranceEvent"
          ) ||
          textFrom(
            calculator,
            "#coreModeLabel"
          ),

        cardioEvent:
          cardioEvent ||
          cardioModeLabel,

        ageGroup:
          valueFrom(
            calculator,
            "#ageGroup"
          ),

        sex:
          valueFrom(
            calculator,
            "#gender"
          ),

        source:
          "calculator-dom",

        updatedAt:
          new Date().toISOString()
      });
    }

    /* ============================================================
      9. EVENT STATE EXTRACTION
    ============================================================ */

    function stateFromEventDetail(
      detail
    ) {
      const d =
        detail &&
        typeof detail === "object"
          ? detail
          : {};

      const result =
        d.scores ||
        d.score ||
        d.result ||
        d.payload ||
        d;

      const breakdown =
        result.breakdown ||
        result.components ||
        {};

      const events =
        d.events ||
        result.events ||
        d.selection ||
        result.selection ||
        {};

      const cardioMode =
        clean(
          result.cardioMode ||
          result.cardio_mode ||
          d.cardioMode ||
          d.cardio_mode ||
          events.cardioMode ||
          events.cardio_mode
        ).toLowerCase();

      const cardioEvent =
        clean(
          events.cardio ||
          events.cardioEvent ||
          events.cardio_event ||
          d.cardioEvent ||
          d.cardio_event ||
          result.cardioEvent ||
          result.cardio_event
        );

      const walkMode =
        result.walkMode === true ||
        result.walk_mode === true ||
        cardioMode === "walk" ||
        cardioEvent
          .toLowerCase()
          .includes("walk");

      const state = {
        bodyScore:
          firstFinite(
            result.bodyScore,
            result.body_score,
            breakdown.body,
            breakdown.bodyComposition,
            breakdown.body_composition
          ),

        strengthScore:
          firstFinite(
            result.strengthScore,
            result.strength_score,
            breakdown.strength
          ),

        coreScore:
          firstFinite(
            result.coreScore,
            result.core_score,
            breakdown.core
          ),

        cardioScore:
          walkMode
            ? 0
            : firstFinite(
                result.cardioScore,
                result.cardio_score,
                breakdown.cardio
              ),

        total:
          walkMode
            ? null
            : firstFinite(
                result.total,
                result.totalScore,
                result.total_score,
                result.composite,
                result.compositeScore,
                result.composite_score
              ),

        category:
          clean(
            result.category ||
            result.rating ||
            result.label ||
            d.category ||
            d.rating
          ),

        ratio:
          firstFinite(
            result.ratio,
            result.whtr,
            result.WHtR,
            d.ratio,
            d.whtr
          ),

        cardioMode:
          walkMode
            ? "walk"
            : cardioMode ||
              (
                cardioEvent
                  .toLowerCase()
                  .includes("hamr")
                  ? "hamr"
                  : "run"
              ),

        walkMode,

        walkPassed:
          firstBoolean(
            result.walkPassed,
            result.walk_passed,
            d.walkPassed,
            d.walk_passed
          ),

        strengthPassed:
          firstBoolean(
            result.strengthPassed,
            result.strength_passed
          ),

        corePassed:
          firstBoolean(
            result.corePassed,
            result.core_passed
          ),

        cardioPassed:
          firstBoolean(
            result.cardioPassed,
            result.cardio_passed
          ),

        strengthEvent:
          clean(
            events.strength ||
            events.strengthEvent ||
            events.strength_event ||
            d.strengthEvent ||
            d.strength_event
          ),

        coreEvent:
          clean(
            events.core ||
            events.coreEvent ||
            events.core_event ||
            d.coreEvent ||
            d.core_event ||
            d.enduranceEvent ||
            d.endurance_event
          ),

        cardioEvent,

        ageGroup:
          clean(
            d.ageGroup ||
            d.age_group ||
            result.ageGroup ||
            result.age_group
          ),

        sex:
          clean(
            d.sex ||
            d.gender ||
            result.sex ||
            result.gender
          ),

        source:
          clean(
            d.source ||
            result.source ||
            SOURCE
          ),

        updatedAt:
          clean(
            d.updatedAt ||
            d.updated_at ||
            result.updatedAt ||
            result.updated_at
          ) ||
          new Date().toISOString()
      };

      return normalizeState(state);
    }

    /* ============================================================
      10. NORMALIZATION
    ============================================================ */

    function normalizeState(
      incoming
    ) {
      const state = {
        ...createEmptyState(),
        ...(incoming || {})
      };

      state.bodyScore =
        state.bodyScore === null
          ? null
          : roundToHalf(
              clamp(
                state.bodyScore,
                0,
                SCORE_CAPS.body
              )
            );

      state.strengthScore =
        state.strengthScore === null
          ? null
          : roundToHalf(
              clamp(
                state.strengthScore,
                0,
                SCORE_CAPS.strength
              )
            );

      state.coreScore =
        state.coreScore === null
          ? null
          : roundToHalf(
              clamp(
                state.coreScore,
                0,
                SCORE_CAPS.core
              )
            );

      state.cardioScore =
        state.cardioScore === null
          ? null
          : roundToHalf(
              clamp(
                state.cardioScore,
                0,
                SCORE_CAPS.cardio
              )
            );

      state.walkMode =
        state.walkMode === true ||
        clean(state.cardioMode)
          .toLowerCase() === "walk" ||
        clean(state.cardioEvent)
          .toLowerCase()
          .includes("walk");

      if (state.walkMode) {
        state.cardioMode = "walk";
        state.cardioScore = 0;
        state.total = null;
      } else {
        state.total =
          state.total === null
            ? null
            : clamp(
                Number(state.total),
                0,
                SCORE_CAPS.total
              );
      }

      if (
        state.strengthPassed === null &&
        state.strengthScore !== null
      ) {
        state.strengthPassed =
          state.strengthScore >=
          COMPONENT_MINIMUMS.strength;
      }

      if (
        state.corePassed === null &&
        state.coreScore !== null
      ) {
        state.corePassed =
          state.coreScore >=
          COMPONENT_MINIMUMS.core;
      }

      if (
        state.cardioPassed === null &&
        !state.walkMode &&
        state.cardioScore !== null
      ) {
        state.cardioPassed =
          state.cardioScore >=
          COMPONENT_MINIMUMS.cardio;
      }

      state.category =
        clean(state.category);

      state.ratio =
        finiteOrNull(state.ratio);

      state.strengthEvent =
        clean(state.strengthEvent);

      state.coreEvent =
        clean(state.coreEvent);

      state.cardioEvent =
        clean(state.cardioEvent);

      state.ageGroup =
        clean(state.ageGroup);

      state.sex =
        clean(state.sex);

      state.source =
        clean(state.source) ||
        SOURCE;

      state.updatedAt =
        clean(state.updatedAt) ||
        new Date().toISOString();

      return state;
    }

    /* ============================================================
      11. DISPLAY TONES
    ============================================================ */

    function clearValueTone(
      element
    ) {
      if (!element) return;

      element.classList.remove(
        "is-good",
        "is-caution",
        "is-danger",
        "is-neutral"
      );
    }

    function setValueTone(
      element,
      tone
    ) {
      if (!element) return;

      clearValueTone(element);

      if (tone) {
        element.classList.add(tone);
      }
    }

    function bodyTone(state) {
      if (
        state.ratio === null &&
        state.bodyScore === null
      ) {
        return "";
      }

      if (state.ratio !== null) {
        if (state.ratio <= 0.49) {
          return "is-good";
        }

        if (state.ratio <= 0.54) {
          return "is-caution";
        }

        return "is-danger";
      }

      if (state.bodyScore === 0) {
        return "is-danger";
      }

      if (state.bodyScore >= 15) {
        return "is-caution";
      }

      return "";
    }

    function componentTone(
      score,
      minimum
    ) {
      const value =
        finiteOrNull(score);

      if (value === null) {
        return "";
      }

      return value >= minimum
        ? "is-good"
        : "is-danger";
    }

    function totalTone(
      state
    ) {
      if (state.walkMode) {
        if (state.walkPassed === true) {
          return "is-good";
        }

        if (state.walkPassed === false) {
          return "is-danger";
        }

        return "is-caution";
      }

      const category =
        clean(state.category)
          .toLowerCase();

      if (
        category.includes("excellent")
      ) {
        if (
          category.includes(
            "not excellent"
          )
        ) {
          return "is-caution";
        }

        return "is-good";
      }

      if (
        category.includes("satisfactory")
      ) {
        if (
          category.includes(
            "unsatisfactory"
          )
        ) {
          return "is-danger";
        }

        return "is-caution";
      }

      if (
        category.includes("fail") ||
        category.includes(
          "unsatisfactory"
        )
      ) {
        return "is-danger";
      }

      if (
        category.includes("90") ||
        category.includes("unresolved")
      ) {
        return "is-caution";
      }

      const total =
        finiteOrNull(state.total);

      if (total === null) {
        return "";
      }

      if (total > 90) {
        return "is-good";
      }

      if (total >= 75) {
        return "is-caution";
      }

      return "is-danger";
    }

    /* ============================================================
      12. DISPLAY HELPERS
    ============================================================ */

    function setMissing(
      tile,
      missing
    ) {
      if (!tile) return;

      tile.classList.toggle(
        "is-missing",
        Boolean(missing)
      );
    }

    function setUpdating(
      isUpdating
    ) {
      tiles.forEach((tile) => {
        tile.classList.toggle(
          "is-updating",
          Boolean(isUpdating)
        );
      });
    }

    function ratioMeta(state) {
      if (state.ratio === null) {
        return "Waist-to-height ratio";
      }

      return (
        `WHtR ${state.ratio.toFixed(2)}`
      );
    }

    function eventMeta(
      value,
      fallback
    ) {
      const text = clean(value);

      return text || fallback;
    }

    function categoryText(
      state
    ) {
      const category =
        clean(state.category);

      if (category) {
        return category;
      }

      const total =
        finiteOrNull(state.total);

      if (total === null) {
        return "Estimated composite";
      }

      if (total > 90) {
        return "Excellent estimate";
      }

      if (total === 90) {
        return "Verify 90.0 in myFitness";
      }

      if (total >= 75) {
        return "Satisfactory estimate";
      }

      return "Unsatisfactory estimate";
    }

    function walkCardioMeta(
      state
    ) {
      if (state.walkPassed === true) {
        return "2 km Walk · medical only";
      }

      if (state.walkPassed === false) {
        return "Time exceeds walk standard";
      }

      return "2 km Walk · pass/fail";
    }

    function totalAnnouncement(
      state
    ) {
      if (state.walkMode) {
        if (state.walkPassed === true) {
          return (
            "Two kilometer walk result: pass. " +
            "Body composition " +
            formatScore(state.bodyScore) +
            " points, strength " +
            formatScore(state.strengthScore) +
            " points, and core " +
            formatScore(state.coreScore) +
            " points. The official adjusted composite is calculated in myFitness."
          );
        }

        if (state.walkPassed === false) {
          return (
            "Two kilometer walk result: fail. " +
            "The official result must be confirmed in myFitness."
          );
        }

        return (
          "Two kilometer walk selected. " +
          "The walk is pass or fail and the official adjusted composite is calculated in myFitness."
        );
      }

      return (
        "Estimated Air Force PT score " +
        formatScore(state.total) +
        ". " +
        categoryText(state) +
        ". Body composition " +
        formatScore(state.bodyScore) +
        " of 20, strength " +
        formatScore(state.strengthScore) +
        " of 15, core " +
        formatScore(state.coreScore) +
        " of 15, and cardio " +
        formatScore(state.cardioScore) +
        " of 50."
      );
    }

    /* ============================================================
      13. PAINT
    ============================================================ */

    function paint(
      incomingState,
      options = {}
    ) {
      const state =
        normalizeState(incomingState);

      latestState = state;

      const hasData =
        hasScoreData(state);

      root.dataset.mode =
        state.walkMode
          ? "walk"
          : "standard";

      root.dataset.category =
        clean(state.category)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      /* Body */

      safeText(
        els.bodyValue,
        formatComponent(
          state.bodyScore,
          SCORE_CAPS.body
        )
      );

      safeText(
        els.bodyMeta,
        ratioMeta(state)
      );

      setValueTone(
        els.bodyValue,
        bodyTone(state)
      );

      setMissing(
        els.bodyTile,
        state.bodyScore === null
      );

      /* Strength */

      safeText(
        els.strengthValue,
        formatComponent(
          state.strengthScore,
          SCORE_CAPS.strength
        )
      );

      safeText(
        els.strengthMeta,
        eventMeta(
          state.strengthEvent,
          "Strength event"
        )
      );

      setValueTone(
        els.strengthValue,
        componentTone(
          state.strengthScore,
          COMPONENT_MINIMUMS.strength
        )
      );

      setMissing(
        els.strengthTile,
        state.strengthScore === null
      );

      /* Core */

      safeText(
        els.coreValue,
        formatComponent(
          state.coreScore,
          SCORE_CAPS.core
        )
      );

      safeText(
        els.coreMeta,
        eventMeta(
          state.coreEvent,
          "Core event"
        )
      );

      setValueTone(
        els.coreValue,
        componentTone(
          state.coreScore,
          COMPONENT_MINIMUMS.core
        )
      );

      setMissing(
        els.coreTile,
        state.coreScore === null
      );

      /* Cardio */

      if (state.walkMode) {
        let walkValue = "—";

        if (state.walkPassed === true) {
          walkValue = "PASS";
        } else if (
          state.walkPassed === false
        ) {
          walkValue = "FAIL";
        }

        safeText(
          els.cardioValue,
          walkValue
        );

        safeText(
          els.cardioMeta,
          walkCardioMeta(state)
        );

        setValueTone(
          els.cardioValue,
          state.walkPassed === true
            ? "is-good"
            : state.walkPassed === false
              ? "is-danger"
              : "is-caution"
        );

        setMissing(
          els.cardioTile,
          state.walkPassed === null
        );
      } else {
        safeText(
          els.cardioValue,
          formatComponent(
            state.cardioScore,
            SCORE_CAPS.cardio
          )
        );

        safeText(
          els.cardioMeta,
          eventMeta(
            state.cardioEvent,
            "Cardio event"
          )
        );

        setValueTone(
          els.cardioValue,
          componentTone(
            state.cardioScore,
            COMPONENT_MINIMUMS.cardio
          )
        );

        setMissing(
          els.cardioTile,
          state.cardioScore === null
        );
      }

      /* Total */

      if (state.walkMode) {
        safeText(
          els.totalValue,
          "—"
        );

        safeText(
          els.totalMeta,
          state.walkPassed === true
            ? "Adjusted score in myFitness"
            : state.walkPassed === false
              ? "Walk standard not met"
              : "Official score in myFitness"
        );

        setValueTone(
          els.totalValue,
          totalTone(state)
        );

        setMissing(
          els.totalTile,
          state.walkPassed === null
        );
      } else {
        safeText(
          els.totalValue,
          formatScore(state.total)
        );

        safeText(
          els.totalMeta,
          categoryText(state)
        );

        setValueTone(
          els.totalValue,
          totalTone(state)
        );

        setMissing(
          els.totalTile,
          state.total === null
        );
      }

      setUpdating(false);

      if (
        options.announce === true &&
        hasData
      ) {
        safeText(
          els.liveStatus,
          totalAnnouncement(state)
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "pcsunited:pt-header-updated",
          {
            detail: {
              source: SOURCE,
              version: VERSION,
              state: {
                ...state
              },
              updated_at:
                new Date().toISOString()
            }
          }
        )
      );
    }

    /* ============================================================
      14. CALCULATOR SYNCHRONIZATION
    ============================================================ */

    function syncFromCalculator(
      announce = false
    ) {
      const state =
        stateFromCalculatorDOM();

      if (!hasScoreData(state)) {
        paint(
          state,
          { announce: false }
        );

        return false;
      }

      paint(
        state,
        { announce }
      );

      return true;
    }

    function scheduleSync(
      announce = false
    ) {
      if (syncQueued) {
        return;
      }

      syncQueued = true;
      setUpdating(true);

      requestAnimationFrame(() => {
        syncQueued = false;

        syncFromCalculator(
          announce
        );
      });
    }

    function disconnectCalculator() {
      if (
        calculatorRoot &&
        calculatorEventHandler
      ) {
        calculatorRoot.removeEventListener(
          "input",
          calculatorEventHandler,
          true
        );

        calculatorRoot.removeEventListener(
          "change",
          calculatorEventHandler,
          true
        );
      }

      if (calculatorObserver) {
        calculatorObserver.disconnect();
      }

      calculatorRoot = null;
      calculatorObserver = null;
      calculatorEventHandler = null;
    }

    function bindCalculator() {
      const found =
        document.getElementById(
          CALCULATOR_ROOT_ID
        );

      if (!found) {
        return false;
      }

      if (
        calculatorRoot === found &&
        calculatorObserver
      ) {
        scheduleSync(false);
        return true;
      }

      disconnectCalculator();

      calculatorRoot = found;

      calculatorEventHandler = () => {
        scheduleSync(true);

        setTimeout(() => {
          scheduleSync(false);
        }, 30);
      };

      calculatorRoot.addEventListener(
        "input",
        calculatorEventHandler,
        true
      );

      calculatorRoot.addEventListener(
        "change",
        calculatorEventHandler,
        true
      );

      calculatorObserver =
        new MutationObserver(() => {
          scheduleSync(false);
        });

      calculatorObserver.observe(
        calculatorRoot,
        {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            "style",
            "class",
            "value",
            "data-score",
            "data-points",
            "aria-valuenow"
          ]
        }
      );

      scheduleSync(false);

      return true;
    }

    function retryCalculatorBinding() {
      if (bindCalculator()) {
        retryCount = 0;
        return;
      }

      retryCount += 1;

      if (retryCount > 40) {
        console.warn(
          "PCSUnited PT Header could not find " +
          `#${CALCULATOR_ROOT_ID}.`
        );

        return;
      }

      retryTimer = setTimeout(
        retryCalculatorBinding,
        250
      );
    }

    /* ============================================================
      15. OPTIONAL SCORE EVENTS
    ============================================================ */

    function receivePTScoreEvent(
      event
    ) {
      const detail =
        event &&
        event.detail
          ? event.detail
          : {};

      const state =
        stateFromEventDetail(detail);

      if (!hasScoreData(state)) {
        scheduleSync(false);
        return;
      }

      paint(
        state,
        { announce: true }
      );
    }

    window.addEventListener(
      "pcsunited:pt-score-updated",
      receivePTScoreEvent
    );

    window.addEventListener(
      "pcsunited:pt-calculator-updated",
      receivePTScoreEvent
    );

    window.addEventListener(
      "pcsunited:pt-score-ready",
      receivePTScoreEvent
    );

    /* ============================================================
      16. PUBLIC CONTROL API
    ============================================================ */

    window.PCSU_PT_HEADER = {
      version: VERSION,
      source: SOURCE,

      refresh() {
        bindCalculator();

        return syncFromCalculator(
          false
        );
      },

      setScore(payload) {
        const state =
          stateFromEventDetail(
            payload || {}
          );

        if (!hasScoreData(state)) {
          return false;
        }

        paint(
          state,
          { announce: true }
        );

        return true;
      },

      getState() {
        return {
          ...latestState
        };
      },

      getCalculatorRoot() {
        return calculatorRoot;
      },

      clear() {
        const state =
          createEmptyState();

        latestState = state;

        paint(
          state,
          { announce: false }
        );

        return true;
      },

      reconnect() {
        disconnectCalculator();

        retryCount = 0;

        retryCalculatorBinding();

        return true;
      },

      destroy() {
        disconnectCalculator();

        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }

        window.removeEventListener(
          "pcsunited:pt-score-updated",
          receivePTScoreEvent
        );

        window.removeEventListener(
          "pcsunited:pt-calculator-updated",
          receivePTScoreEvent
        );

        window.removeEventListener(
          "pcsunited:pt-score-ready",
          receivePTScoreEvent
        );

        mount.innerHTML = "";
        mount.dataset.mounted = "false";

        try {
          delete window.PCSU_PT_HEADER;
        } catch (_) {
          window.PCSU_PT_HEADER =
            undefined;
        }

        return true;
      }
    };

    /* ============================================================
      17. INITIALIZATION
    ============================================================ */

    paint(
      createEmptyState(),
      { announce: false }
    );

    retryCalculatorBinding();

    setTimeout(() => {
      bindCalculator();
      syncFromCalculator(false);
    }, 250);

    setTimeout(() => {
      bindCalculator();
      syncFromCalculator(false);
    }, 1000);

    setTimeout(() => {
      bindCalculator();
      syncFromCalculator(false);
    }, 1800);

    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:pt-header-ready",
        {
          detail: {
            version: VERSION,
            source: SOURCE,
            root,
            mount,
            calculatorRootId:
              CALCULATOR_ROOT_ID
          }
        }
      )
    );
  }

  /* ============================================================
    18. SAFE DOM START
  ============================================================ */

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      startPTHeader,
      { once: true }
    );
  } else {
    startPTHeader();
  }
})();
