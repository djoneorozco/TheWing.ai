/* ============================================================
   THEWING.AI • WAPS INTELLIGENCE HEADER
   Standalone Public JavaScript
   v1.0.0

   FILE
   WAPS-Calculator/waps-header.js

   REQUIRED MOUNT
   #waps-header-widget

   PURPOSE
   - Compact CAFSC + optional prior-cycle comparison intake
   - Configures the existing WAPS calculator through its public API
   - Does not recalculate official WAPS scores
   - Does not duplicate the AFSC catalog or scoring engine

   PRINCIPLE
   "TheWing calculates. The header configures."

   DEPENDS ON
   window.THEWING_WAPS (from waps.js) when available

   EVENTS CONSUMED
   - thewing:waps-afsc-selected
   - thewing:waps-updated

   EVENTS DISPATCHED
   - thewing:waps-historical-input
   - thewing:waps-header-ready
============================================================ */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE = "thewing.waps.header.v1.0.0";

  const MOUNT_ID = "waps-header-widget";
  const ROOT_ID = "thewing-waps-header";
  const STYLE_ID = "thewing-waps-header-styles-v100";
  const FONT_ID = "thewing-waps-header-font";
  const MOUNT_KEY = "__THEWING_WAPS_HEADER_V100_MOUNTED__";

  const HYDRATION_DELAYS_MS = Object.freeze([
    100,
    500,
    1200,
    2500
  ]);

  const LIMITS = Object.freeze({
    CUTOFF_MIN: 0,
    CUTOFF_MAX: 510,
    SCORE_MIN: 0,
    SCORE_MAX: 100,
    SEARCH_RESULT_LIMIT: 12
  });

  const PATH_BOTH = "both";
  const PATH_PFE_ONLY = "pfe-only";


  /* ============================================================
     0. SINGLETON / MOUNT GUARD
  ============================================================ */

  if (window[MOUNT_KEY]) {
    return;
  }

  function startWapsHeader() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn(
        `[THEWING_WAPS_HEADER] Mount #${MOUNT_ID} was not found.`
      );
      return;
    }

    if (
      mount.dataset.mounted === "true" ||
      document.getElementById(ROOT_ID)
    ) {
      return;
    }

    window[MOUNT_KEY] = true;
    mount.dataset.mounted = "true";


    /* ==========================================================
       1. FONT
    ========================================================== */

    if (!document.getElementById(FONT_ID)) {
      const preconnectGoogle =
        document.createElement("link");
      preconnectGoogle.rel = "preconnect";
      preconnectGoogle.href =
        "https://fonts.googleapis.com";

      const preconnectStatic =
        document.createElement("link");
      preconnectStatic.rel = "preconnect";
      preconnectStatic.href =
        "https://fonts.gstatic.com";
      preconnectStatic.crossOrigin = "anonymous";

      const fontLink =
        document.createElement("link");
      fontLink.id = FONT_ID;
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";

      document.head.appendChild(preconnectGoogle);
      document.head.appendChild(preconnectStatic);
      document.head.appendChild(fontLink);
    }


    /* ==========================================================
       2. STYLES
    ========================================================== */

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;

      style.textContent = `
        #${ROOT_ID},
        #${ROOT_ID} * {
          box-sizing: border-box;
        }

        #${ROOT_ID} {
          all: initial;

          --waps-h-bg: rgba(10, 31, 48, 0.88);
          --waps-h-panel: rgba(17, 42, 62, 0.78);
          --waps-h-stroke: rgba(207, 229, 247, 0.17);
          --waps-h-stroke-strong: rgba(207, 229, 247, 0.30);
          --waps-h-white: #f8fbff;
          --waps-h-ink: #edf5ff;
          --waps-h-ink-soft: rgba(231, 241, 252, 0.82);
          --waps-h-muted: rgba(216, 231, 247, 0.64);
          --waps-h-faint: rgba(216, 231, 247, 0.42);
          --waps-h-teal: #78ded3;
          --waps-h-teal-bright: #91eee3;
          --waps-h-teal-soft: rgba(120, 222, 211, 0.14);
          --waps-h-blue: #85d4f4;
          --waps-h-amber: #f1d989;
          --waps-h-success: #93e4b2;
          --waps-h-radius: 18px;
          --waps-h-shadow:
            0 22px 54px rgba(0, 7, 16, 0.34),
            0 10px 24px rgba(0, 7, 16, 0.18);

          display: block;
          width: 100%;
          margin: 0 0 18px;

          color: var(--waps-h-ink);

          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          line-height: 1.4;
          -webkit-font-smoothing: antialiased;
        }

        #${ROOT_ID} .waps-h-shell {
          position: relative;
          overflow: hidden;

          width: 100%;
          padding: 18px 18px 16px;

          border: 1px solid var(--waps-h-stroke);
          border-radius: var(--waps-h-radius);

          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.016) 46%
            ),
            var(--waps-h-panel);

          box-shadow:
            var(--waps-h-shadow),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);

          backdrop-filter: blur(16px) saturate(135%);
          -webkit-backdrop-filter: blur(16px) saturate(135%);
        }

        #${ROOT_ID} .waps-h-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;

          background:
            radial-gradient(
              520px 220px at 92% -10%,
              rgba(120, 222, 211, 0.10),
              transparent 60%
            ),
            radial-gradient(
              420px 220px at 0% 110%,
              rgba(133, 212, 244, 0.08),
              transparent 62%
            );
        }

        #${ROOT_ID} .waps-h-inner {
          position: relative;
          z-index: 1;
        }

        #${ROOT_ID} .waps-h-eyebrow {
          margin: 0 0 12px;

          color: var(--waps-h-teal-bright);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        #${ROOT_ID} .waps-h-grid {
          display: grid;

          grid-template-columns:
            minmax(300px, 1.6fr)
            repeat(3, minmax(120px, 0.7fr));

          gap: 12px;
          align-items: end;
        }

        #${ROOT_ID}[data-path="pfe-only"] .waps-h-grid {
          grid-template-columns:
            minmax(300px, 1.8fr)
            repeat(2, minmax(130px, 0.75fr));
        }

        #${ROOT_ID} .waps-h-field {
          min-width: 0;
        }

        #${ROOT_ID} .waps-h-field-cafsc {
          position: relative;
        }

        #${ROOT_ID} .waps-h-label {
          display: block;
          margin: 0 0 6px;

          color: var(--waps-h-ink-soft);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        #${ROOT_ID} .waps-h-optional {
          margin: 0 0 8px;

          color: var(--waps-h-faint);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        #${ROOT_ID} .waps-h-input-shell,
        #${ROOT_ID} .waps-h-search-shell {
          position: relative;
          display: flex;
          align-items: center;

          min-height: 46px;

          border: 1px solid var(--waps-h-stroke);
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.05),
              rgba(255, 255, 255, 0.02)
            );

          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04);

          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        #${ROOT_ID} .waps-h-input-shell:hover,
        #${ROOT_ID} .waps-h-search-shell:hover {
          border-color: var(--waps-h-stroke-strong);
        }

        #${ROOT_ID} .waps-h-input-shell:focus-within,
        #${ROOT_ID} .waps-h-search-shell:focus-within {
          border-color: rgba(120, 222, 211, 0.72);

          box-shadow:
            0 0 0 3px rgba(120, 222, 211, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        #${ROOT_ID} .waps-h-search-icon {
          position: absolute;
          left: 13px;

          display: grid;
          place-items: center;

          width: 16px;
          height: 16px;

          color: var(--waps-h-teal);
          pointer-events: none;
        }

        #${ROOT_ID} .waps-h-search-icon svg {
          width: 16px;
          height: 16px;
          display: block;
        }

        #${ROOT_ID} .waps-h-input,
        #${ROOT_ID} .waps-h-search-input {
          width: 100%;
          min-width: 0;
          min-height: 44px;

          border: 0;
          outline: 0;

          color: var(--waps-h-white);
          background: transparent;

          font: inherit;
          font-size: 14px;
          font-weight: 700;
        }

        #${ROOT_ID} .waps-h-search-input {
          padding: 0 42px 0 38px;
        }

        #${ROOT_ID} .waps-h-input {
          padding: 0 12px;

          font-variant-numeric: tabular-nums;
          appearance: textfield;
          -moz-appearance: textfield;
        }

        #${ROOT_ID} .waps-h-input::-webkit-inner-spin-button,
        #${ROOT_ID} .waps-h-input::-webkit-outer-spin-button {
          margin: 0;
          appearance: none;
          -webkit-appearance: none;
        }

        #${ROOT_ID} .waps-h-input::placeholder,
        #${ROOT_ID} .waps-h-search-input::placeholder {
          color: rgba(216, 231, 247, 0.38);
          font-weight: 600;
        }

        #${ROOT_ID} .waps-h-clear {
          position: absolute;
          right: 8px;

          display: grid;
          place-items: center;

          width: 30px;
          height: 30px;
          padding: 0;

          border: 0;
          border-radius: 8px;

          color: var(--waps-h-muted);
          background: transparent;

          cursor: pointer;
        }

        #${ROOT_ID} .waps-h-clear[hidden] {
          display: none !important;
        }

        #${ROOT_ID} .waps-h-clear:hover {
          color: var(--waps-h-white);
          background: rgba(255, 255, 255, 0.06);
        }

        #${ROOT_ID} .waps-h-clear svg {
          width: 15px;
          height: 15px;
          display: block;
        }

        #${ROOT_ID} .waps-h-results {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 40;

          max-height: 280px;
          overflow: auto;
          padding: 6px;

          border: 1px solid var(--waps-h-stroke-strong);
          border-radius: 12px;

          background: rgba(8, 26, 40, 0.98);

          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.42);

          list-style: none;
          margin: 0;
        }

        #${ROOT_ID} .waps-h-results[hidden] {
          display: none !important;
        }

        #${ROOT_ID} .waps-h-result {
          display: grid;
          gap: 2px;

          width: 100%;
          padding: 10px 11px;

          border: 0;
          border-radius: 9px;

          color: var(--waps-h-ink);
          background: transparent;
          text-align: left;

          cursor: pointer;
          font: inherit;
        }

        #${ROOT_ID} .waps-h-result:hover,
        #${ROOT_ID} .waps-h-result[aria-selected="true"] {
          background: rgba(120, 222, 211, 0.12);
        }

        #${ROOT_ID} .waps-h-result-code {
          color: var(--waps-h-white);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        #${ROOT_ID} .waps-h-result-title {
          color: var(--waps-h-ink-soft);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${ROOT_ID} .waps-h-result-meta {
          color: var(--waps-h-teal-bright);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        #${ROOT_ID} .waps-h-empty-result {
          padding: 12px 11px;

          color: var(--waps-h-muted);
          font-size: 12px;
          font-weight: 600;
        }

        #${ROOT_ID} .waps-h-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px 18px;

          margin-top: 14px;
          padding-top: 13px;

          border-top: 1px solid rgba(207, 229, 247, 0.10);
        }

        #${ROOT_ID} .waps-h-context {
          min-width: 0;

          color: var(--waps-h-ink-soft);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        #${ROOT_ID} .waps-h-context-code {
          color: var(--waps-h-white);
          font-weight: 800;
        }

        #${ROOT_ID} .waps-h-context-sep {
          color: var(--waps-h-faint);
          font-weight: 600;
        }

        #${ROOT_ID} .waps-h-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          min-height: 28px;
          padding: 5px 10px;

          border: 1px solid var(--waps-h-stroke);
          border-radius: 999px;

          color: var(--waps-h-muted);
          background: rgba(255, 255, 255, 0.03);

          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        #${ROOT_ID} .waps-h-status[data-status="ready"] {
          color: var(--waps-h-success);
          border-color: rgba(147, 228, 178, 0.30);
          background: rgba(147, 228, 178, 0.10);
        }

        #${ROOT_ID} .waps-h-status[data-status="partial"] {
          color: var(--waps-h-amber);
          border-color: rgba(241, 217, 137, 0.30);
          background: rgba(241, 217, 137, 0.10);
        }

        #${ROOT_ID} .waps-h-status[data-status="optional"] {
          color: var(--waps-h-blue);
          border-color: rgba(133, 212, 244, 0.28);
          background: rgba(133, 212, 244, 0.08);
        }

        #${ROOT_ID} .waps-h-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.9;
        }

        #${ROOT_ID} .waps-h-visually-hidden {
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

        #${ROOT_ID} :focus-visible {
          outline: 2px solid var(--waps-h-teal-bright);
          outline-offset: 2px;
        }

        #${ROOT_ID} .waps-h-field-skt[hidden],
        #${ROOT_ID} .waps-h-history-note[hidden] {
          display: none !important;
        }

        @media (max-width: 980px) {
          #${ROOT_ID} .waps-h-grid,
          #${ROOT_ID}[data-path="pfe-only"] .waps-h-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          #${ROOT_ID} .waps-h-field-cafsc {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          #${ROOT_ID} .waps-h-shell {
            padding: 15px 14px 14px;
          }

          #${ROOT_ID} .waps-h-grid,
          #${ROOT_ID}[data-path="pfe-only"] .waps-h-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          #${ROOT_ID} .waps-h-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          #${ROOT_ID} .waps-h-status {
            white-space: normal;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #${ROOT_ID} *,
          #${ROOT_ID} *::before,
          #${ROOT_ID} *::after {
            transition-duration: 0.001ms !important;
            animation-duration: 0.001ms !important;
          }
        }
      `;

      document.head.appendChild(style);
    }


    /* ==========================================================
       3. DOM
    ========================================================== */

    const root = document.createElement("section");
    root.id = ROOT_ID;
    root.setAttribute("data-path", "pending");
    root.setAttribute("data-ready", "false");
    root.setAttribute(
      "aria-label",
      "WAPS intelligence setup"
    );

    root.innerHTML = `
      <div class="waps-h-shell">
        <div class="waps-h-inner">
          <div class="waps-h-eyebrow">
            WAPS Intelligence Setup
          </div>

          <div class="waps-h-optional" id="wapsHeaderHistoryNote">
            Last Year's Data — Optional
          </div>

          <div class="waps-h-grid">
            <div class="waps-h-field waps-h-field-cafsc">
              <label class="waps-h-label" for="wapsHeaderCafsc">
                CAFSC on the PECD
              </label>

              <div class="waps-h-search-shell">
                <span class="waps-h-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="10.8"
                      cy="10.8"
                      r="6.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    ></circle>
                    <path
                      d="m16 16 4.2 4.2"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    ></path>
                  </svg>
                </span>

                <input
                  id="wapsHeaderCafsc"
                  class="waps-h-search-input"
                  type="text"
                  inputmode="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="Search AFSC code or career field"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded="false"
                  aria-controls="wapsHeaderCafscResults"
                  aria-describedby="wapsHeaderContext wapsHeaderStatus"
                >

                <button
                  id="wapsHeaderCafscClear"
                  class="waps-h-clear"
                  type="button"
                  aria-label="Clear selected CAFSC"
                  hidden
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="m7 7 10 10M17 7 7 17"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    ></path>
                  </svg>
                </button>
              </div>

              <ul
                id="wapsHeaderCafscResults"
                class="waps-h-results"
                role="listbox"
                aria-label="Matching CAFSC catalog records"
                hidden
              ></ul>
            </div>

            <div class="waps-h-field" id="wapsHeaderCutoffField">
              <label
                class="waps-h-label"
                for="wapsHeaderCutoff"
                id="wapsHeaderCutoffLabel"
              >
                Prior-cycle Cutoff
              </label>

              <div class="waps-h-input-shell">
                <input
                  id="wapsHeaderCutoff"
                  class="waps-h-input"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="510"
                  step="0.01"
                  placeholder="Optional"
                  aria-describedby="wapsHeaderStatus"
                >
              </div>
            </div>

            <div class="waps-h-field" id="wapsHeaderPfeField">
              <label
                class="waps-h-label"
                for="wapsHeaderAveragePfe"
                id="wapsHeaderPfeLabel"
              >
                Prior-cycle Avg PFE
              </label>

              <div class="waps-h-input-shell">
                <input
                  id="wapsHeaderAveragePfe"
                  class="waps-h-input"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Optional"
                  aria-describedby="wapsHeaderStatus"
                >
              </div>
            </div>

            <div class="waps-h-field waps-h-field-skt" id="wapsHeaderSktField">
              <label
                class="waps-h-label"
                for="wapsHeaderAverageSkt"
                id="wapsHeaderSktLabel"
              >
                Prior-cycle Avg SKT
              </label>

              <div class="waps-h-input-shell">
                <input
                  id="wapsHeaderAverageSkt"
                  class="waps-h-input"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Optional"
                  aria-describedby="wapsHeaderStatus"
                >
              </div>
            </div>
          </div>

          <div class="waps-h-footer">
            <div
              id="wapsHeaderContext"
              class="waps-h-context"
              aria-live="polite"
            >
              Select a CAFSC to configure the calculator.
            </div>

            <div
              id="wapsHeaderStatus"
              class="waps-h-status"
              data-status="idle"
              role="status"
              aria-live="polite"
            >
              <span class="waps-h-status-dot" aria-hidden="true"></span>
              <span id="wapsHeaderStatusText">
                Select a CAFSC to begin
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    mount.replaceChildren(root);

    const el = {
      root,
      cafscInput: root.querySelector("#wapsHeaderCafsc"),
      cafscClear: root.querySelector("#wapsHeaderCafscClear"),
      results: root.querySelector("#wapsHeaderCafscResults"),
      cutoff: root.querySelector("#wapsHeaderCutoff"),
      averagePfe: root.querySelector("#wapsHeaderAveragePfe"),
      averageSkt: root.querySelector("#wapsHeaderAverageSkt"),
      cutoffLabel: root.querySelector("#wapsHeaderCutoffLabel"),
      pfeLabel: root.querySelector("#wapsHeaderPfeLabel"),
      sktLabel: root.querySelector("#wapsHeaderSktLabel"),
      sktField: root.querySelector("#wapsHeaderSktField"),
      historyNote: root.querySelector("#wapsHeaderHistoryNote"),
      context: root.querySelector("#wapsHeaderContext"),
      status: root.querySelector("#wapsHeaderStatus"),
      statusText: root.querySelector("#wapsHeaderStatusText")
    };


    /* ==========================================================
       4. STATE
    ========================================================== */

    const state = {
      catalog: [],
      hydrated: false,
      hooksInstalled: false,
      suppressHistoricalEmit: false,
      syncingFromCalculator: false,
      selectingFromHeader: false,

      activeResultIndex: -1,
      filteredResults: [],

      selected: null,

      historical: {
        cutoff: null,
        averagePfe: null,
        averageSkt: null
      }
    };


    /* ==========================================================
       5. HELPERS
    ========================================================== */

    function deepClone(value) {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    }

    function clamp(value, minimum, maximum) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return null;
      }

      return Math.min(maximum, Math.max(minimum, number));
    }

    function truncate2(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return null;
      }

      return number >= 0
        ? Math.floor(number * 100) / 100
        : Math.ceil(number * 100) / 100;
    }

    function format2(value) {
      const number = truncate2(value);
      return number === null ? "" : number.toFixed(2);
    }

    function normalizeSearchText(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ");
    }

    function normalizeCode(value) {
      const raw = String(value || "")
        .trim()
        .toUpperCase();

      const match = raw.match(
        /^([0-9][A-Z0-9]*(?:\/[A-Z0-9]+)*)(?=\s|[-–—]|$)/
      );

      return match ? match[1] : "";
    }

    function derivePriorCycle(cycle) {
      const raw = String(cycle || "").trim().toUpperCase();
      const match = raw.match(/^(\d{2})(E[56])$/);

      if (!match) {
        return "";
      }

      const year = Number(match[1]);

      if (!Number.isFinite(year) || year <= 0) {
        return "";
      }

      const priorYear = String(year - 1).padStart(2, "0");
      return `${priorYear}${match[2]}`;
    }

    function isPfeOnlyPath(pathMode, recordPath) {
      return (
        pathMode === PATH_PFE_ONLY ||
        recordPath === PATH_PFE_ONLY
      );
    }

    function getWapsApi() {
      const api = window.THEWING_WAPS;

      if (
        !api ||
        typeof api !== "object"
      ) {
        return null;
      }

      return api;
    }

    function parseOptionalScore(raw, minimum, maximum) {
      const text = String(raw ?? "").trim();

      if (!text) {
        return null;
      }

      const clamped = clamp(text, minimum, maximum);

      if (clamped === null) {
        return null;
      }

      return truncate2(clamped);
    }

    function readHistoricalFromInputs() {
      return {
        cutoff: parseOptionalScore(
          el.cutoff.value,
          LIMITS.CUTOFF_MIN,
          LIMITS.CUTOFF_MAX
        ),
        averagePfe: parseOptionalScore(
          el.averagePfe.value,
          LIMITS.SCORE_MIN,
          LIMITS.SCORE_MAX
        ),
        averageSkt: parseOptionalScore(
          el.averageSkt.value,
          LIMITS.SCORE_MIN,
          LIMITS.SCORE_MAX
        )
      };
    }

    function syncHistoricalInputDisplay() {
      el.cutoff.value =
        state.historical.cutoff === null
          ? ""
          : format2(state.historical.cutoff);

      el.averagePfe.value =
        state.historical.averagePfe === null
          ? ""
          : format2(state.historical.averagePfe);

      el.averageSkt.value =
        state.historical.averageSkt === null
          ? ""
          : format2(state.historical.averageSkt);
    }


    /* ==========================================================
       6. STATUS / CONTEXT
    ========================================================== */

    function getSelectionMeta() {
      if (!state.selected) {
        return null;
      }

      const selected = state.selected;
      const pfeOnly = isPfeOnlyPath(
        selected.testingPathMode,
        selected.recordPath
      );

      let testingPathLabel =
        selected.testingPathLabel ||
        (pfeOnly ? "PFE Only" : "SKT + PFE");

      if (
        selected.rule === "NOTE_11_CURRENT_CAFSC" &&
        !pfeOnly
      ) {
        testingPathLabel = "SKT + PFE";
      }

      if (selected.rule === "INDIVIDUAL_EXEMPTION") {
        testingPathLabel = "PFE Only";
      }

      return {
        cafsc: selected.code,
        title: selected.title,
        cycle: selected.cycle,
        priorCycle: selected.priorCycle,
        targetGrade: selected.targetGrade,
        testingPath: testingPathLabel,
        testingPathMode: pfeOnly
          ? PATH_PFE_ONLY
          : PATH_BOTH,
        rule: selected.rule || "STANDARD",
        pfeOnly
      };
    }

    function buildStatus(meta) {
      if (!meta) {
        return {
          key: "idle",
          tone: "idle",
          text: "Select a CAFSC to begin"
        };
      }

      const cutoffProvided =
        state.historical.cutoff !== null;

      const pfeProvided =
        state.historical.averagePfe !== null;

      const sktProvided =
        !meta.pfeOnly &&
        state.historical.averageSkt !== null;

      const averagesReady = meta.pfeOnly
        ? pfeProvided
        : pfeProvided && sktProvided;

      const fullReady =
        cutoffProvided && averagesReady;

      if (fullReady) {
        return {
          key: "historical-comparison-ready",
          tone: "ready",
          text: "Historical comparison ready"
        };
      }

      if (cutoffProvided && !averagesReady) {
        return {
          key: "cutoff-comparison-ready",
          tone: "partial",
          text: "Cutoff comparison ready"
        };
      }

      if (!cutoffProvided && averagesReady) {
        return {
          key: "score-average-comparison-ready",
          tone: "partial",
          text: "Score-average comparison ready"
        };
      }

      if (cutoffProvided || pfeProvided || sktProvided) {
        return {
          key: "partial-historical-data",
          tone: "partial",
          text: "Historical comparison optional"
        };
      }

      return {
        key: "historical-optional",
        tone: "optional",
        text: "Historical comparison optional"
      };
    }

    function updateHistoricalLabels(meta) {
      const prior = meta?.priorCycle || "";

      el.cutoffLabel.textContent = prior
        ? `${prior} Cutoff`
        : "Prior-cycle Cutoff";

      el.pfeLabel.textContent = prior
        ? `${prior} Avg PFE`
        : "Prior-cycle Avg PFE";

      el.sktLabel.textContent = prior
        ? `${prior} Avg SKT`
        : "Prior-cycle Avg SKT";
    }

    function updatePathVisibility(meta) {
      const pfeOnly = Boolean(meta?.pfeOnly);

      root.dataset.path = meta
        ? (pfeOnly ? PATH_PFE_ONLY : PATH_BOTH)
        : "pending";

      el.sktField.hidden = !meta || pfeOnly;

      if (pfeOnly) {
        state.historical.averageSkt = null;
        el.averageSkt.value = "";
      }
    }

    function renderContextAndStatus() {
      const meta = getSelectionMeta();
      const status = buildStatus(meta);

      updateHistoricalLabels(meta);
      updatePathVisibility(meta);

      if (!meta) {
        el.context.textContent =
          "Select a CAFSC to configure the calculator.";
      } else {
        const note11 =
          meta.rule === "NOTE_11_CURRENT_CAFSC" &&
          !meta.pfeOnly
            ? ` <span class="waps-h-context-sep">•</span> Current CAFSC Rule`
            : "";

        const exemption =
          meta.rule === "INDIVIDUAL_EXEMPTION"
            ? ` <span class="waps-h-context-sep">•</span> Individual SKT Exemption`
            : "";

        el.context.innerHTML =
          `<span class="waps-h-context-code">${escapeHtml(meta.cafsc)}</span>` +
          ` <span class="waps-h-context-sep">•</span> ${escapeHtml(meta.cycle)}` +
          ` <span class="waps-h-context-sep">•</span> Promotion to ${escapeHtml(meta.targetGrade)}` +
          ` <span class="waps-h-context-sep">•</span> ${escapeHtml(meta.testingPath)}` +
          note11 +
          exemption;
      }

      el.status.dataset.status = status.tone;
      el.statusText.textContent = status.text;
      root.dataset.ready = meta ? "true" : "false";
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }


    /* ==========================================================
       7. PUBLIC STATE / EVENT MODEL
    ========================================================== */

    function buildPublicState() {
      const meta = getSelectionMeta();
      const status = buildStatus(meta);

      const cutoffProvided =
        state.historical.cutoff !== null;

      const averagePfeProvided =
        state.historical.averagePfe !== null;

      const averageSktProvided =
        Boolean(meta) &&
        !meta.pfeOnly &&
        state.historical.averageSkt !== null;

      return {
        version: VERSION,
        source: SOURCE,
        hydrated: state.hydrated,
        catalogCount: state.catalog.length,

        cafsc: meta?.cafsc || null,
        title: meta?.title || null,
        cycle: meta?.cycle || null,
        priorCycle: meta?.priorCycle || null,
        targetGrade: meta?.targetGrade || null,
        testingPath: meta?.testingPath || null,
        testingPathMode: meta?.testingPathMode || null,
        rule: meta?.rule || null,

        historical: {
          cutoff: state.historical.cutoff,
          averagePfe: state.historical.averagePfe,
          averageSkt: meta?.pfeOnly
            ? null
            : state.historical.averageSkt
        },

        historicalFields: {
          cutoffProvided,
          pfeProvided: averagePfeProvided,
          sktProvided: averageSktProvided
        },

        status: {
          key: status.key,
          text: status.text
        },

        comparisonReady:
          status.key === "historical-comparison-ready"
      };
    }

    function emitHistoricalSnapshot() {
      const meta = getSelectionMeta();
      const publicState = buildPublicState();

      const detail = {
        source: SOURCE,
        version: VERSION,

        cafsc: meta?.cafsc || null,
        title: meta?.title || null,

        cycle: meta?.cycle || null,
        priorCycle: meta?.priorCycle || null,
        targetGrade: meta?.targetGrade || null,
        testingPath: meta?.testingPath || null,
        testingPathMode: meta?.testingPathMode || null,
        rule: meta?.rule || null,

        cutoff: publicState.historical.cutoff,
        averagePfe: publicState.historical.averagePfe,
        averageSkt: publicState.historical.averageSkt,

        cutoffProvided:
          publicState.historicalFields.cutoffProvided,
        averagePfeProvided:
          publicState.historicalFields.pfeProvided,
        averageSktProvided:
          publicState.historicalFields.sktProvided,

        comparisonReady: publicState.comparisonReady,
        statusKey: publicState.status.key,
        statusText: publicState.status.text,

        updated_at: new Date().toISOString()
      };

      window.dispatchEvent(
        new CustomEvent(
          "thewing:waps-historical-input",
          {
            detail: deepClone(detail)
          }
        )
      );

      return deepClone(detail);
    }

    function commitHistoricalFromInputs({
      emit = true,
      normalizeDisplay = false
    } = {}) {
      const next = readHistoricalFromInputs();
      const meta = getSelectionMeta();

      state.historical.cutoff = next.cutoff;
      state.historical.averagePfe = next.averagePfe;

      if (!meta || meta.pfeOnly) {
        state.historical.averageSkt = null;
      } else {
        state.historical.averageSkt = next.averageSkt;
      }

      if (normalizeDisplay) {
        syncHistoricalInputDisplay();
      }

      renderContextAndStatus();

      if (emit && !state.suppressHistoricalEmit) {
        emitHistoricalSnapshot();
      }
    }


    /* ==========================================================
       8. CAFSC SEARCH
    ========================================================== */

    function closeResults() {
      state.activeResultIndex = -1;
      el.results.hidden = true;
      el.results.innerHTML = "";
      el.cafscInput.setAttribute(
        "aria-expanded",
        "false"
      );
    }

    function openResults() {
      el.results.hidden = false;
      el.cafscInput.setAttribute(
        "aria-expanded",
        "true"
      );
    }

    function searchCatalog(query) {
      const normalized = normalizeSearchText(query);

      if (!normalized || !state.catalog.length) {
        return [];
      }

      const exactCode = normalizeCode(query);
      const scored = [];

      state.catalog.forEach((record) => {
        const code = normalizeSearchText(record.code);
        const title = normalizeSearchText(record.title);
        const cycle = normalizeSearchText(record.cycle);
        const display = normalizeSearchText(record.display);

        let rank = 0;

        if (exactCode && record.code === exactCode) {
          rank = 100;
        } else if (code.startsWith(normalized)) {
          rank = 80;
        } else if (code.includes(normalized)) {
          rank = 70;
        } else if (title.includes(normalized)) {
          rank = 50;
        } else if (display.includes(normalized)) {
          rank = 40;
        } else if (cycle.includes(normalized)) {
          rank = 20;
        }

        if (rank > 0) {
          scored.push({ record, rank });
        }
      });

      scored.sort((a, b) => {
        if (b.rank !== a.rank) {
          return b.rank - a.rank;
        }

        const codeCompare =
          a.record.code.localeCompare(b.record.code);

        if (codeCompare !== 0) {
          return codeCompare;
        }

        return a.record.cycle.localeCompare(
          b.record.cycle
        );
      });

      return scored
        .slice(0, LIMITS.SEARCH_RESULT_LIMIT)
        .map((item) => item.record);
    }

    function renderResults(records) {
      state.filteredResults = records.slice();
      state.activeResultIndex = records.length ? 0 : -1;

      if (!records.length) {
        el.results.innerHTML =
          `<li class="waps-h-empty-result" role="presentation">` +
          `No matching 2026 catalog record.</li>`;
        openResults();
        return;
      }

      const fragment =
        document.createDocumentFragment();

      records.forEach((record, index) => {
        const item = document.createElement("li");
        item.setAttribute("role", "option");
        item.id = `wapsHeaderResult-${index}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "waps-h-result";
        button.dataset.index = String(index);
        button.setAttribute(
          "aria-selected",
          index === 0 ? "true" : "false"
        );

        const pathLabel =
          record.pathLabel ||
          (record.path === PATH_PFE_ONLY
            ? "PFE Only"
            : "SKT + PFE");

        button.innerHTML =
          `<span class="waps-h-result-code">${escapeHtml(record.code)} — ${escapeHtml(record.cycle)}</span>` +
          `<span class="waps-h-result-title" title="${escapeHtml(record.title)}">${escapeHtml(record.title)}</span>` +
          `<span class="waps-h-result-meta">${escapeHtml(pathLabel)}</span>`;

        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });

        button.addEventListener("click", () => {
          selectCatalogRecord(record, {
            throughHeader: true
          });
        });

        item.appendChild(button);
        fragment.appendChild(item);
      });

      el.results.replaceChildren(fragment);
      openResults();
      highlightActiveResult();
    }

    function highlightActiveResult() {
      const buttons =
        el.results.querySelectorAll(".waps-h-result");

      buttons.forEach((button, index) => {
        const active =
          index === state.activeResultIndex;

        button.setAttribute(
          "aria-selected",
          active ? "true" : "false"
        );

        if (active) {
          button.scrollIntoView({
            block: "nearest"
          });

          el.cafscInput.setAttribute(
            "aria-activedescendant",
            `wapsHeaderResult-${index}`
          );
        }
      });

      if (state.activeResultIndex < 0) {
        el.cafscInput.removeAttribute(
          "aria-activedescendant"
        );
      }
    }


    /* ==========================================================
       9. SELECTION
    ========================================================== */

    function buildSelectedFromRecord(
      record,
      pathOverride = null
    ) {
      const pathMode =
        pathOverride?.mode ||
        record.path ||
        PATH_BOTH;

      const pathLabel =
        pathOverride?.label ||
        record.pathLabel ||
        (pathMode === PATH_PFE_ONLY
          ? "PFE Only"
          : "SKT + PFE");

      const rule =
        pathOverride?.rule ||
        record.rule ||
        "STANDARD";

      const gradeLabel =
        record.gradeLabel ||
        (record.grade === "tsgt"
          ? "Technical Sergeant"
          : "Staff Sergeant");

      const shortGrade =
        record.grade === "tsgt" ||
        /technical/i.test(gradeLabel)
          ? "TSgt"
          : "SSgt";

      return {
        id: record.id,
        code: record.code,
        title: record.title,
        display:
          record.display ||
          `${record.code} — ${record.title} — ${record.cycle}`,
        cycle: record.cycle,
        priorCycle: derivePriorCycle(record.cycle),
        targetGrade: shortGrade,
        targetGradeLabel: gradeLabel,
        testingPathMode: pathMode,
        testingPathLabel: pathLabel,
        recordPath: record.path,
        rule
      };
    }

    function applySelectedToHeader(
      selected,
      {
        updateInput = true,
        clearHistoryOnCodeChange = false
      } = {}
    ) {
      const previousCode = state.selected?.code || null;
      const previousCycle = state.selected?.cycle || null;

      if (
        clearHistoryOnCodeChange &&
        previousCode &&
        (
          previousCode !== selected.code ||
          previousCycle !== selected.cycle
        )
      ) {
        state.historical.cutoff = null;
        state.historical.averagePfe = null;
        state.historical.averageSkt = null;
        syncHistoricalInputDisplay();
      }

      state.selected = selected;

      if (updateInput) {
        el.cafscInput.value = selected.display;
        el.cafscInput.title = selected.display;
        el.cafscClear.hidden = false;
      }

      closeResults();
      renderContextAndStatus();
    }

    function clearHeaderSelection({
      clearHistorical = true,
      emit = true
    } = {}) {
      state.selected = null;
      el.cafscInput.value = "";
      el.cafscInput.removeAttribute("title");
      el.cafscClear.hidden = true;
      closeResults();

      if (clearHistorical) {
        state.historical.cutoff = null;
        state.historical.averagePfe = null;
        state.historical.averageSkt = null;
        syncHistoricalInputDisplay();
      }

      renderContextAndStatus();

      if (emit && !state.suppressHistoricalEmit) {
        emitHistoricalSnapshot();
      }
    }

    function selectCatalogRecord(
      record,
      {
        throughHeader = false
      } = {}
    ) {
      if (!record) {
        return {
          ok: false,
          reason: "NOT_FOUND"
        };
      }

      const selected = buildSelectedFromRecord(record);

      if (throughHeader) {
        const api = getWapsApi();

        if (
          !api ||
          typeof api.selectAFSC !== "function"
        ) {
          applySelectedToHeader(selected, {
            updateInput: true,
            clearHistoryOnCodeChange: true
          });

          if (!state.suppressHistoricalEmit) {
            emitHistoricalSnapshot();
          }

          return {
            ok: false,
            reason: "API_UNAVAILABLE",
            selected
          };
        }

        state.selectingFromHeader = true;

        const result = api.selectAFSC(
          record.code,
          record.cycle
        );

        state.selectingFromHeader = false;

        if (!result || result.ok === false) {
          return result || {
            ok: false,
            reason: "NOT_FOUND"
          };
        }

        const snapshotPath =
          result.state?.path || null;

        const nextSelected =
          buildSelectedFromRecord(
            record,
            snapshotPath
          );

        applySelectedToHeader(nextSelected, {
          updateInput: true,
          clearHistoryOnCodeChange: true
        });

        if (!state.suppressHistoricalEmit) {
          emitHistoricalSnapshot();
        }

        return {
          ok: true,
          selected: nextSelected,
          state: result.state || null
        };
      }

      applySelectedToHeader(selected, {
        updateInput: true,
        clearHistoryOnCodeChange: false
      });

      return {
        ok: true,
        selected
      };
    }

    function findCatalogRecord(code, cycle = "") {
      const normalizedCode = normalizeCode(code);

      if (!normalizedCode) {
        return null;
      }

      const matches = state.catalog.filter(
        (record) => record.code === normalizedCode
      );

      if (!matches.length) {
        return null;
      }

      if (matches.length === 1) {
        return matches[0];
      }

      if (cycle) {
        const normalizedCycle = String(cycle)
          .trim()
          .toUpperCase();

        return (
          matches.find(
            (record) =>
              record.cycle === normalizedCycle
          ) || null
        );
      }

      return null;
    }


    /* ==========================================================
       10. CALCULATOR SYNCHRONIZATION
    ========================================================== */

    function selectionIdentity(selected) {
      if (!selected) {
        return "";
      }

      return [
        selected.code || "",
        selected.cycle || "",
        selected.testingPathMode || "",
        selected.rule || ""
      ].join("|");
    }

    function applySnapshotToHeader(snapshot) {
      if (!snapshot || !snapshot.catalog) {
        clearHeaderSelection({
          clearHistorical: true,
          emit: true
        });
        return;
      }

      const record =
        findCatalogRecord(
          snapshot.catalog.code,
          snapshot.promotion?.cycle
        ) || {
          id: snapshot.catalog.id,
          code: snapshot.catalog.code,
          title: snapshot.catalog.title,
          display:
            `${snapshot.catalog.code} — ${snapshot.catalog.title} — ${snapshot.promotion?.cycle || ""}`,
          cycle: snapshot.promotion?.cycle || "",
          grade: snapshot.promotion?.grade,
          gradeLabel: snapshot.promotion?.gradeLabel,
          path: snapshot.path?.mode,
          pathLabel: snapshot.path?.label,
          rule: snapshot.path?.rule
        };

      const selected = buildSelectedFromRecord(
        record,
        snapshot.path || null
      );

      const before =
        selectionIdentity(state.selected);

      const after =
        selectionIdentity(selected);

      const changed = before !== after;

      state.syncingFromCalculator = true;

      applySelectedToHeader(selected, {
        updateInput: true,
        clearHistoryOnCodeChange: true
      });

      state.syncingFromCalculator = false;

      /*
        Emit historical snapshots when CAFSC / cycle /
        testing-path context changes — not on every
        score recompute from the calculator.
      */
      if (
        changed &&
        !state.suppressHistoricalEmit
      ) {
        emitHistoricalSnapshot();
      }
    }

    function handleCalculatorCleared() {
      if (state.selectingFromHeader) {
        return;
      }

      clearHeaderSelection({
        clearHistorical: true,
        emit: true
      });
    }

    function onAfscSelected(event) {
      if (state.selectingFromHeader) {
        return;
      }

      const record = event?.detail;

      if (!record || !record.code) {
        return;
      }

      const selected = buildSelectedFromRecord(record);
      const before = selectionIdentity(state.selected);
      const after = selectionIdentity(selected);
      const changed = before !== after;

      state.syncingFromCalculator = true;

      applySelectedToHeader(selected, {
        updateInput: true,
        clearHistoryOnCodeChange: true
      });

      state.syncingFromCalculator = false;

      if (changed && !state.suppressHistoricalEmit) {
        emitHistoricalSnapshot();
      }
    }

    function onWapsUpdated(event) {
      if (state.selectingFromHeader) {
        return;
      }

      const snapshot = event?.detail;

      if (!snapshot || !snapshot.catalog) {
        handleCalculatorCleared();
        return;
      }

      applySnapshotToHeader(snapshot);
    }

    function installApiHooks() {
      const api = getWapsApi();

      if (!api || state.hooksInstalled) {
        return Boolean(api);
      }

      if (typeof api.reset === "function") {
        const originalReset = api.reset.bind(api);

        api.reset = function patchedReset(...args) {
          const result = originalReset(...args);
          handleCalculatorCleared();
          return result;
        };
      }

      if (typeof api.clearAFSC === "function") {
        const originalClear = api.clearAFSC.bind(api);

        api.clearAFSC = function patchedClear(...args) {
          const result = originalClear(...args);
          handleCalculatorCleared();
          return result;
        };
      }

      state.hooksInstalled = true;
      api.__wapsHeaderHooksInstalled = true;

      return true;
    }

    function observeCalculatorReadyFlag() {
      const calculatorRoot =
        document.getElementById("thewing-waps");

      if (!calculatorRoot) {
        return;
      }

      const observer = new MutationObserver(() => {
        if (state.selectingFromHeader) {
          return;
        }

        const ready =
          calculatorRoot.dataset.afscReady === "true";

        if (!ready && state.selected) {
          handleCalculatorCleared();
        }
      });

      observer.observe(calculatorRoot, {
        attributes: true,
        attributeFilter: ["data-afsc-ready"]
      });
    }


    /* ==========================================================
       11. HYDRATION
    ========================================================== */

    function hydrateFromApi() {
      const api = getWapsApi();

      if (!api) {
        return false;
      }

      installApiHooks();

      try {
        if (typeof api.getCatalog === "function") {
          const catalog = api.getCatalog();

          if (Array.isArray(catalog) && catalog.length) {
            state.catalog = catalog;
          }
        }
      } catch (_error) {
        /*
          Passive hydration only.
        */
      }

      if (!state.catalog.length) {
        return false;
      }

      state.hydrated = true;
      root.dataset.ready =
        state.selected ? "true" : "false";

      try {
        if (typeof api.getState === "function") {
          const snapshot = api.getState();

          if (snapshot && snapshot.catalog) {
            applySnapshotToHeader(snapshot);
          }
        }
      } catch (_error) {
        /*
          Ignore passive state hydration errors.
        */
      }

      return true;
    }

    function scheduleHydration() {
      if (hydrateFromApi()) {
        return;
      }

      HYDRATION_DELAYS_MS.forEach((delay) => {
        window.setTimeout(() => {
          if (!state.hydrated) {
            hydrateFromApi();
          }
        }, delay);
      });
    }


    /* ==========================================================
       12. EVENT BINDINGS
    ========================================================== */

    function onCafscInput() {
      const value = el.cafscInput.value;
      el.cafscClear.hidden = !value.trim();

      if (!value.trim()) {
        closeResults();

        if (state.selected) {
          const api = getWapsApi();

          state.selectingFromHeader = true;

          if (api && typeof api.clearAFSC === "function") {
            api.clearAFSC();
          }

          state.selectingFromHeader = false;

          clearHeaderSelection({
            clearHistorical: true,
            emit: true
          });
        }

        return;
      }

      if (!state.hydrated) {
        hydrateFromApi();
      }

      const matches = searchCatalog(value);
      renderResults(matches);
    }

    function onCafscKeydown(event) {
      const open = !el.results.hidden;

      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          closeResults();
        }
        return;
      }

      if (
        event.key === "ArrowDown" &&
        state.filteredResults.length
      ) {
        event.preventDefault();

        if (!open) {
          renderResults(state.filteredResults);
          return;
        }

        state.activeResultIndex = Math.min(
          state.filteredResults.length - 1,
          state.activeResultIndex + 1
        );

        highlightActiveResult();
        return;
      }

      if (
        event.key === "ArrowUp" &&
        state.filteredResults.length
      ) {
        event.preventDefault();

        if (!open) {
          renderResults(state.filteredResults);
          return;
        }

        state.activeResultIndex = Math.max(
          0,
          state.activeResultIndex - 1
        );

        highlightActiveResult();
        return;
      }

      if (event.key === "Enter") {
        if (
          open &&
          state.activeResultIndex >= 0 &&
          state.filteredResults[state.activeResultIndex]
        ) {
          event.preventDefault();

          selectCatalogRecord(
            state.filteredResults[
              state.activeResultIndex
            ],
            {
              throughHeader: true
            }
          );
        }
      }
    }

    function onDocumentPointerDown(event) {
      if (!root.contains(event.target)) {
        closeResults();
      }
    }

    function bindEvents() {
      el.cafscInput.addEventListener(
        "input",
        onCafscInput
      );

      el.cafscInput.addEventListener(
        "keydown",
        onCafscKeydown
      );

      el.cafscInput.addEventListener(
        "focus",
        () => {
          if (
            el.cafscInput.value.trim() &&
            !state.selected
          ) {
            renderResults(
              searchCatalog(el.cafscInput.value)
            );
          }
        }
      );

      el.cafscClear.addEventListener(
        "click",
        () => {
          const api = getWapsApi();

          state.selectingFromHeader = true;

          if (
            api &&
            typeof api.clearAFSC === "function"
          ) {
            api.clearAFSC();
          }

          state.selectingFromHeader = false;

          clearHeaderSelection({
            clearHistorical: true,
            emit: true
          });

          el.cafscInput.focus();
        }
      );

      [
        el.cutoff,
        el.averagePfe,
        el.averageSkt
      ].forEach((input) => {
        input.addEventListener("input", () => {
          commitHistoricalFromInputs({
            emit: true,
            normalizeDisplay: false
          });
        });

        input.addEventListener("blur", () => {
          commitHistoricalFromInputs({
            emit: true,
            normalizeDisplay: true
          });
        });
      });

      document.addEventListener(
        "pointerdown",
        onDocumentPointerDown
      );

      window.addEventListener(
        "thewing:waps-afsc-selected",
        onAfscSelected
      );

      window.addEventListener(
        "thewing:waps-updated",
        onWapsUpdated
      );
    }


    /* ==========================================================
       13. PUBLIC API
    ========================================================== */

    function publishApi() {
      const existing =
        window.THEWING_WAPS_HEADER &&
        typeof window.THEWING_WAPS_HEADER === "object"
          ? window.THEWING_WAPS_HEADER
          : {};

      window.THEWING_WAPS_HEADER = Object.assign(
        {},
        existing,
        {
          version: VERSION,
          source: SOURCE,

          getState() {
            return deepClone(buildPublicState());
          },

          refresh() {
            return hydrateFromApi();
          },

          setCAFSC(code, cycle = "") {
            if (!state.hydrated) {
              hydrateFromApi();
            }

            const record =
              findCatalogRecord(code, cycle);

            if (!record) {
              const api = getWapsApi();

              if (
                api &&
                typeof api.selectAFSC === "function"
              ) {
                const result =
                  api.selectAFSC(code, cycle);

                if (result?.ok && result.state) {
                  applySnapshotToHeader(result.state);
                  return {
                    ok: true,
                    state: buildPublicState()
                  };
                }

                return result || {
                  ok: false,
                  reason: "NOT_FOUND"
                };
              }

              return {
                ok: false,
                reason: "NOT_FOUND"
              };
            }

            return selectCatalogRecord(record, {
              throughHeader: true
            });
          },

          clearCAFSC() {
            const api = getWapsApi();

            state.selectingFromHeader = true;

            if (
              api &&
              typeof api.clearAFSC === "function"
            ) {
              api.clearAFSC();
            }

            state.selectingFromHeader = false;

            clearHeaderSelection({
              clearHistorical: true,
              emit: true
            });

            return deepClone(buildPublicState());
          },

          setHistoricalInputs({
            cutoff,
            averagePfe,
            averageSkt
          } = {}) {
            if (cutoff !== undefined) {
              state.historical.cutoff =
                cutoff === null || cutoff === ""
                  ? null
                  : parseOptionalScore(
                      cutoff,
                      LIMITS.CUTOFF_MIN,
                      LIMITS.CUTOFF_MAX
                    );
            }

            if (averagePfe !== undefined) {
              state.historical.averagePfe =
                averagePfe === null || averagePfe === ""
                  ? null
                  : parseOptionalScore(
                      averagePfe,
                      LIMITS.SCORE_MIN,
                      LIMITS.SCORE_MAX
                    );
            }

            if (averageSkt !== undefined) {
              const meta = getSelectionMeta();

              state.historical.averageSkt =
                !meta || meta.pfeOnly
                  ? null
                  : (
                      averageSkt === null ||
                      averageSkt === ""
                        ? null
                        : parseOptionalScore(
                            averageSkt,
                            LIMITS.SCORE_MIN,
                            LIMITS.SCORE_MAX
                          )
                    );
            }

            syncHistoricalInputDisplay();
            renderContextAndStatus();

            return emitHistoricalSnapshot();
          },

          clearHistoricalInputs() {
            state.historical.cutoff = null;
            state.historical.averagePfe = null;
            state.historical.averageSkt = null;

            syncHistoricalInputDisplay();
            renderContextAndStatus();

            return emitHistoricalSnapshot();
          },

          emitHistoricalSnapshot
        }
      );
    }


    /* ==========================================================
       14. INIT
    ========================================================== */

    bindEvents();
    renderContextAndStatus();
    observeCalculatorReadyFlag();
    scheduleHydration();
    publishApi();

    window.dispatchEvent(
      new CustomEvent(
        "thewing:waps-header-ready",
        {
          detail: {
            version: VERSION,
            source: SOURCE,
            root
          }
        }
      )
    );

    console.info(
      `[THEWING_WAPS_HEADER] Mounted v${VERSION}.`
    );
  }


  /* ============================================================
     SAFE DOM START
  ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startWapsHeader,
      {
        once: true
      }
    );
  } else {
    startWapsHeader();
  }
})();
