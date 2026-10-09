/* ============================================================
  PCSUnited • PT Score Header Strip
  Standalone Public JavaScript
  v1.0.0

  FILE
  PT-Calculator/pt-header-progression.js

  REQUIRED MOUNT
  #pcsu-pt-header-progression-widget

  PURPOSE
  - Injects a compact live PT score breakdown strip
  - Consumes snapshots from ptcalculator.js only
  - Does not recalculate official PFRA scoring
  - No API requests, storage, navigation, or scrolling
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const SOURCE = "pcsunited.pt.header.v1.0.0";

  const MOUNT_ID = "pcsu-pt-header-progression-widget";
  const ROOT_ID = "pcsu-pt-header-score-strip";
  const STYLE_ID = "pcsu-pt-header-progression-styles-v100";
  const FONT_ID = "pcsu-pt-header-progression-font";

  const CAPS = {
    body: 20,
    strength: 15,
    core: 15,
    cardio: 50,
    total: 100
  };

  function startPTHeaderProgression() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn(
        `PCSUnited PT Header Progression mount #${MOUNT_ID} was not found.`
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
      1. FONT
    ============================================================ */

    if (!document.getElementById(FONT_ID)) {
      const preconnectGoogle = document.createElement("link");
      preconnectGoogle.rel = "preconnect";
      preconnectGoogle.href = "https://fonts.googleapis.com";

      const preconnectStatic = document.createElement("link");
      preconnectStatic.rel = "preconnect";
      preconnectStatic.href = "https://fonts.gstatic.com";
      preconnectStatic.crossOrigin = "anonymous";

      const fontLink = document.createElement("link");
      fontLink.id = FONT_ID;
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";

      document.head.appendChild(preconnectGoogle);
      document.head.appendChild(preconnectStatic);
      document.head.appendChild(fontLink);
    }

    /* ============================================================
      2. STYLES
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
          color: #101728;
          background: transparent !important;
          margin: 10px 0 14px;
        }

        #${ROOT_ID} .pcsu-pt-header-wrap {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-pt-header-inner {
          width: 100%;
        }

        #${ROOT_ID} .pcsu-pt-header-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(84px, 1fr));
          gap: 8px;
          width: min(640px, 100%);
          margin: 0 auto;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-pt-header-tile {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 7px 10px 8px;
          min-height: 46px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.90),
              rgba(238, 241, 248, 0.78)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 18px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px) saturate(135%);
          -webkit-backdrop-filter: blur(10px) saturate(135%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition:
            opacity 0.18s ease,
            transform 0.18s ease,
            filter 0.18s ease;
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
              rgba(199, 156, 79, 0.28),
              rgba(106, 167, 255, 0.14),
              transparent
            );
          pointer-events: none;
        }

        #${ROOT_ID} .pcsu-pt-header-accent {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 5px;
          height: 2px;
          border-radius: 999px;
          opacity: 0.55;
          pointer-events: none;
        }

        #${ROOT_ID} .pcsu-pt-header-tile[data-accent="body"] .pcsu-pt-header-accent {
          background: linear-gradient(90deg, transparent, #5ec8c8, transparent);
        }

        #${ROOT_ID} .pcsu-pt-header-tile[data-accent="strength"] .pcsu-pt-header-accent {
          background: linear-gradient(90deg, transparent, #e8b48a, transparent);
        }

        #${ROOT_ID} .pcsu-pt-header-tile[data-accent="core"] .pcsu-pt-header-accent {
          background: linear-gradient(90deg, transparent, #b7a6e0, transparent);
        }

        #${ROOT_ID} .pcsu-pt-header-tile[data-accent="cardio"] .pcsu-pt-header-accent {
          background: linear-gradient(90deg, transparent, #8ed4b5, transparent);
        }

        #${ROOT_ID} .pcsu-pt-header-tile[data-accent="total"] .pcsu-pt-header-accent {
          background: linear-gradient(90deg, transparent, #c9a45a, transparent);
        }

        #${ROOT_ID} .pcsu-pt-header-label {
          display: block;
          margin-bottom: 2px;
          color: rgba(18, 24, 38, 0.58);
          font-size: 7.5px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-pt-header-value {
          display: block;
          color: #101728;
          font-size: 12.5px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.03em;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-pt-header-support {
          display: block;
          margin-top: 2px;
          color: rgba(18, 24, 38, 0.52);
          font-size: 8px;
          line-height: 1.1;
          font-weight: 600;
          letter-spacing: 0.01em;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-gold {
          color: #9b7939;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-green {
          color: #16795a;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-danger {
          color: #a23c5a;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-amber {
          color: #a67c2d;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-aqua {
          color: #1e7a7a;
        }

        #${ROOT_ID} .pcsu-pt-header-support.is-gold {
          color: #9b7939;
        }

        #${ROOT_ID} .pcsu-pt-header-support.is-green {
          color: #16795a;
        }

        #${ROOT_ID} .pcsu-pt-header-support.is-danger {
          color: #a23c5a;
        }

        #${ROOT_ID} .pcsu-pt-header-support.is-amber {
          color: #a67c2d;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-missing {
          opacity: 0.58;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total {
          min-height: 48px;
        }

        @media (max-width: 900px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            width: min(560px, 100%);
            gap: 6px;
          }

          #${ROOT_ID} .pcsu-pt-header-label {
            font-size: 7px;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: 12px;
          }

          #${ROOT_ID} .pcsu-pt-header-support {
            font-size: 7.5px;
          }
        }

        @media (max-width: 760px) {
          /* Phone sizing only; desktop styles are unchanged. */
          #${MOUNT_ID} {
            display: block !important;
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          /* Override the root's inline reset on phone screens. */
          #${ROOT_ID} {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          #${ROOT_ID} .pcsu-pt-header-wrap,
          #${ROOT_ID} .pcsu-pt-header-inner {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          #${ROOT_ID} .pcsu-pt-header-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
            gap: 8px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            min-width: 0;
            border-radius: 12px;
            min-height: 52px;
            padding: 8px 10px 10px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total {
            grid-column: 1 / -1;
          }

          #${ROOT_ID} .pcsu-pt-header-label {
            font-size: 9px;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: 15px;
          }

          #${ROOT_ID} .pcsu-pt-header-support {
            font-size: 9px;
            white-space: normal;
            overflow-wrap: break-word;
          }
        }

        /* Webflow hides this score-only nav menu below 992px. */
        @media (max-width: 991px) {
          [data-pcsu-pt-mobile-header="true"] {
            background: rgba(29, 57, 79, 0.96);
          }

          [data-pcsu-pt-mobile-menu="true"] {
            display: block !important;
            position: absolute !important;
            top: 100% !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 10px 12px !important;
            transform: none !important;
            box-sizing: border-box;
            background: rgba(29, 57, 79, 0.96);
          }

          [data-pcsu-pt-mobile-menu="true"] .pt-header-progressive {
            display: block !important;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            margin: 0 !important;
            padding: 0 !important;
          }

          #pcsu-pt-header-mobile-spacer {
            display: block;
          }
        }

        @media (min-width: 992px) {
          #pcsu-pt-header-mobile-spacer {
            display: none;
          }
        }

        /* Keep all five scores in one row on phones. */
        @media (max-width: 767px),
          (max-width: 991px) and (max-height: 500px) and (pointer: coarse) {
          [data-pcsu-pt-mobile-menu="true"] {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          #${ROOT_ID} .pcsu-pt-header-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            width: min(560px, 100%);
            gap: 4px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            display: flex;
            min-width: 0;
            min-height: 50px;
            padding: 7px 2px 8px;
            border-radius: 999px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total {
            grid-column: auto;
          }

          #${ROOT_ID} .pcsu-pt-header-label {
            font-size: clamp(6px, 1.8vw, 7.5px);
            letter-spacing: .06em;
          }

          #${ROOT_ID} .pcsu-pt-header-value {
            font-size: clamp(10px, 3vw, 12.5px);
          }

          #${ROOT_ID} .pcsu-pt-header-support {
            font-size: clamp(6px, 1.8vw, 8px);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #${ROOT_ID},
          #${ROOT_ID} * {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /* ============================================================
      3. MARKUP
    ============================================================ */

    mount.innerHTML = `
      <div
        id="${ROOT_ID}"
        data-version="${VERSION}"
        style="all: initial;"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Estimated PT score breakdown"
      >
        <div class="pcsu-pt-header-wrap">
          <div class="pcsu-pt-header-inner">
            <div class="pcsu-pt-header-grid">

              <div
                class="pcsu-pt-header-tile is-missing"
                data-accent="body"
                id="pcsu-pt-tile-body"
              >
                <span class="pcsu-pt-header-accent" aria-hidden="true"></span>
                <span class="pcsu-pt-header-label" id="pcsu-pt-label-body">Body</span>
                <span class="pcsu-pt-header-value" id="pcsu-pt-value-body">— / 20</span>
                <span class="pcsu-pt-header-support" id="pcsu-pt-support-body"></span>
              </div>

              <div
                class="pcsu-pt-header-tile is-missing"
                data-accent="strength"
                id="pcsu-pt-tile-strength"
              >
                <span class="pcsu-pt-header-accent" aria-hidden="true"></span>
                <span class="pcsu-pt-header-label" id="pcsu-pt-label-strength">Strength</span>
                <span class="pcsu-pt-header-value" id="pcsu-pt-value-strength">— / 15</span>
                <span class="pcsu-pt-header-support" id="pcsu-pt-support-strength"></span>
              </div>

              <div
                class="pcsu-pt-header-tile is-missing"
                data-accent="core"
                id="pcsu-pt-tile-core"
              >
                <span class="pcsu-pt-header-accent" aria-hidden="true"></span>
                <span class="pcsu-pt-header-label" id="pcsu-pt-label-core">Core</span>
                <span class="pcsu-pt-header-value" id="pcsu-pt-value-core">— / 15</span>
                <span class="pcsu-pt-header-support" id="pcsu-pt-support-core"></span>
              </div>

              <div
                class="pcsu-pt-header-tile is-missing"
                data-accent="cardio"
                id="pcsu-pt-tile-cardio"
              >
                <span class="pcsu-pt-header-accent" aria-hidden="true"></span>
                <span class="pcsu-pt-header-label" id="pcsu-pt-label-cardio">Cardio</span>
                <span class="pcsu-pt-header-value" id="pcsu-pt-value-cardio">— / 50</span>
                <span class="pcsu-pt-header-support" id="pcsu-pt-support-cardio"></span>
              </div>

              <div
                class="pcsu-pt-header-tile is-total is-missing"
                data-accent="total"
                id="pcsu-pt-tile-total"
              >
                <span class="pcsu-pt-header-accent" aria-hidden="true"></span>
                <span class="pcsu-pt-header-label" id="pcsu-pt-label-total">Total Score</span>
                <span class="pcsu-pt-header-value is-gold" id="pcsu-pt-value-total">—</span>
                <span class="pcsu-pt-header-support" id="pcsu-pt-support-total">Adjust inputs</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    /* Keep this Webflow score menu visible on phones and reserve
       its height so the fixed header cannot cover the calculator. */
    const webflowMenu = mount.closest(
      ".pt-cal-navbar .nav-menu-wrapper-6.w-nav-menu"
    );
    const webflowNavbar = mount.closest(".pt-cal-navbar");

    if (webflowMenu && webflowNavbar) {
      webflowNavbar.setAttribute("data-pcsu-pt-mobile-header", "true");
      webflowMenu.setAttribute("data-pcsu-pt-mobile-menu", "true");

      let mobileSpacer = document.getElementById(
        "pcsu-pt-header-mobile-spacer"
      );

      if (!mobileSpacer) {
        mobileSpacer = document.createElement("div");
        mobileSpacer.id = "pcsu-pt-header-mobile-spacer";
        mobileSpacer.setAttribute("aria-hidden", "true");
        webflowNavbar.insertAdjacentElement("afterend", mobileSpacer);
      }

      const mobileQuery = window.matchMedia("(max-width: 991px)");
      const syncMobileSpacing = () => {
        mobileSpacer.style.height = mobileQuery.matches
          ? `${Math.ceil(webflowMenu.getBoundingClientRect().height)}px`
          : "0px";
      };

      if ("ResizeObserver" in window) {
        const mobileResizeObserver = new ResizeObserver(syncMobileSpacing);
        mobileResizeObserver.observe(webflowMenu);
      }

      window.addEventListener("resize", syncMobileSpacing, { passive: true });
      syncMobileSpacing();
    }

    /* ============================================================
      4. ELEMENT REFERENCES
    ============================================================ */

    const els = {
      tileBody: root.querySelector("#pcsu-pt-tile-body"),
      tileStrength: root.querySelector("#pcsu-pt-tile-strength"),
      tileCore: root.querySelector("#pcsu-pt-tile-core"),
      tileCardio: root.querySelector("#pcsu-pt-tile-cardio"),
      tileTotal: root.querySelector("#pcsu-pt-tile-total"),

      valueBody: root.querySelector("#pcsu-pt-value-body"),
      valueStrength: root.querySelector("#pcsu-pt-value-strength"),
      valueCore: root.querySelector("#pcsu-pt-value-core"),
      valueCardio: root.querySelector("#pcsu-pt-value-cardio"),
      valueTotal: root.querySelector("#pcsu-pt-value-total"),

      supportBody: root.querySelector("#pcsu-pt-support-body"),
      supportStrength: root.querySelector("#pcsu-pt-support-strength"),
      supportCore: root.querySelector("#pcsu-pt-support-core"),
      supportCardio: root.querySelector("#pcsu-pt-support-cardio"),
      supportTotal: root.querySelector("#pcsu-pt-support-total")
    };

    let latestSnapshot = null;
    let lastPaintKey = "";

    /* ============================================================
      5. UTILITIES
    ============================================================ */

    function safeText(node, value) {
      if (!node) return;
      node.textContent = value == null ? "" : String(value);
    }

    function clearTone(node) {
      if (!node) return;
      node.classList.remove(
        "is-gold",
        "is-green",
        "is-danger",
        "is-amber",
        "is-aqua"
      );
    }

    function setTone(node, tone) {
      clearTone(node);
      if (!node || !tone) return;
      node.classList.add(tone);
    }

    function formatOneDecimal(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      return n.toFixed(1);
    }

    function asFiniteNumber(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    function asBoolean(value) {
      if (typeof value === "boolean") return value;
      return null;
    }

    function asString(value) {
      if (typeof value === "string") return value.trim();
      if (value == null) return "";
      return String(value).trim();
    }

    function shortEventName(name) {
      const raw = asString(name);
      if (!raw) return "";
      return raw
        .replace(/^2\.0\s*Mile\s*/i, "2 mi ")
        .replace(/^20m\s*/i, "20m ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeSnapshot(raw) {
      if (!raw || typeof raw !== "object") return null;

      const detail =
        raw.detail && typeof raw.detail === "object"
          ? raw.detail
          : raw.payload && typeof raw.payload === "object"
            ? raw.payload
            : raw;

      if (!detail || typeof detail !== "object") return null;

      const type = asString(detail.type);
      const source = asString(detail.source);

      if (
        type &&
        type !== "pcsunited-pt-score" &&
        source !== "pcsunited.pt.calculator"
      ) {
        return null;
      }

      if (
        !type &&
        source &&
        source !== "pcsunited.pt.calculator"
      ) {
        return null;
      }

      const events =
        detail.events && typeof detail.events === "object"
          ? detail.events
          : {};

      const caps =
        detail.caps && typeof detail.caps === "object"
          ? detail.caps
          : CAPS;

      return {
        source: source || "pcsunited.pt.calculator",
        version: asString(detail.version) || "1.0.0",
        type: "pcsunited-pt-score",

        bodyScore: asFiniteNumber(detail.bodyScore),
        strengthScore: asFiniteNumber(detail.strengthScore),
        coreScore: asFiniteNumber(detail.coreScore),
        cardioScore: asFiniteNumber(detail.cardioScore),
        total: asFiniteNumber(detail.total),
        category: asString(detail.category),
        minimumsMet: asBoolean(detail.minimumsMet),

        strengthPassed: asBoolean(detail.strengthPassed),
        corePassed: asBoolean(detail.corePassed),
        cardioPassed: asBoolean(detail.cardioPassed),

        cardioMode: asString(detail.cardioMode),
        walkPassed: asBoolean(detail.walkPassed),

        ratio: asFiniteNumber(detail.ratio),
        riskLabel: asString(detail.riskLabel),

        events: {
          strength: asString(events.strength),
          core: asString(events.core),
          cardio: asString(events.cardio)
        },

        caps: {
          body: asFiniteNumber(caps.body) ?? CAPS.body,
          strength: asFiniteNumber(caps.strength) ?? CAPS.strength,
          core: asFiniteNumber(caps.core) ?? CAPS.core,
          cardio: asFiniteNumber(caps.cardio) ?? CAPS.cardio,
          total: asFiniteNumber(caps.total) ?? CAPS.total
        },

        updated_at: asString(detail.updated_at)
      };
    }

    function bodyTone(snapshot) {
      const risk = asString(snapshot.riskLabel).toLowerCase();
      if (risk.includes("high")) return "is-danger";
      if (risk.includes("moderate")) return "is-gold";
      return "is-aqua";
    }

    function categoryDisplay(category) {
      if (category === "Unresolved-90") return "Verify Rating";
      if (category === "Excellent") return "Excellent";
      if (category === "Satisfactory") return "Satisfactory";
      if (category === "Unsatisfactory") return "Unsatisfactory";
      if (category === "Walk-Pass") return "Confirm in myFitness";
      if (category === "Walk-Fail") return "Walk Failed.";
      return category || "";
    }

    function totalTone(snapshot) {
      if (snapshot.cardioMode === "walk") {
        return snapshot.walkPassed === true ? "is-gold" : "is-danger";
      }

      if (snapshot.minimumsMet === false) return "is-danger";

      if (snapshot.category === "Excellent") return "is-green";
      if (snapshot.category === "Satisfactory") return "is-gold";
      if (snapshot.category === "Unresolved-90") return "is-amber";
      if (snapshot.category === "Unsatisfactory") return "is-danger";
      return "is-gold";
    }

    function paintMissing() {
      latestSnapshot = null;
      lastPaintKey = "missing";

      [
        els.tileBody,
        els.tileStrength,
        els.tileCore,
        els.tileCardio,
        els.tileTotal
      ].forEach((tile) => {
        if (tile) tile.classList.add("is-missing");
      });

      safeText(els.valueBody, `— / ${CAPS.body}`);
      safeText(els.valueStrength, `— / ${CAPS.strength}`);
      safeText(els.valueCore, `— / ${CAPS.core}`);
      safeText(els.valueCardio, `— / ${CAPS.cardio}`);
      safeText(els.valueTotal, "—");

      safeText(els.supportBody, "");
      safeText(els.supportStrength, "");
      safeText(els.supportCore, "");
      safeText(els.supportCardio, "");
      safeText(els.supportTotal, "Adjust inputs");

      setTone(els.valueBody, null);
      setTone(els.valueStrength, null);
      setTone(els.valueCore, null);
      setTone(els.valueCardio, null);
      setTone(els.valueTotal, "is-gold");
      setTone(els.supportTotal, null);

      root.setAttribute(
        "aria-label",
        "Estimated PT score breakdown. Adjust calculator inputs to see scores."
      );
    }

    function paintSnapshot(snapshot) {
      const paintKey = JSON.stringify({
        bodyScore: snapshot.bodyScore,
        strengthScore: snapshot.strengthScore,
        coreScore: snapshot.coreScore,
        cardioScore: snapshot.cardioScore,
        total: snapshot.total,
        category: snapshot.category,
        minimumsMet: snapshot.minimumsMet,
        strengthPassed: snapshot.strengthPassed,
        corePassed: snapshot.corePassed,
        cardioPassed: snapshot.cardioPassed,
        cardioMode: snapshot.cardioMode,
        walkPassed: snapshot.walkPassed,
        ratio: snapshot.ratio,
        riskLabel: snapshot.riskLabel,
        events: snapshot.events
      });

      if (paintKey === lastPaintKey) return;
      lastPaintKey = paintKey;
      latestSnapshot = snapshot;

      [
        els.tileBody,
        els.tileStrength,
        els.tileCore,
        els.tileCardio,
        els.tileTotal
      ].forEach((tile) => {
        if (tile) tile.classList.remove("is-missing");
      });

      const bodyCap = snapshot.caps.body;
      const strengthCap = snapshot.caps.strength;
      const coreCap = snapshot.caps.core;
      const cardioCap = snapshot.caps.cardio;

      const bodyText = formatOneDecimal(snapshot.bodyScore);
      const strengthText = formatOneDecimal(snapshot.strengthScore);
      const coreText = formatOneDecimal(snapshot.coreScore);
      const cardioText = formatOneDecimal(snapshot.cardioScore);
      const totalText = formatOneDecimal(snapshot.total);

      safeText(
        els.valueBody,
        bodyText == null ? `— / ${bodyCap}` : `${bodyText} / ${bodyCap}`
      );
      setTone(els.valueBody, bodyTone(snapshot));

      if (snapshot.ratio != null) {
        safeText(els.supportBody, `WHtR ${snapshot.ratio.toFixed(2)}`);
      } else {
        safeText(els.supportBody, "");
      }

      safeText(
        els.valueStrength,
        strengthText == null
          ? `— / ${strengthCap}`
          : `${strengthText} / ${strengthCap}`
      );
      setTone(
        els.valueStrength,
        snapshot.strengthPassed === false ? "is-danger" : null
      );
      safeText(
        els.supportStrength,
        shortEventName(snapshot.events.strength)
      );

      safeText(
        els.valueCore,
        coreText == null ? `— / ${coreCap}` : `${coreText} / ${coreCap}`
      );
      setTone(
        els.valueCore,
        snapshot.corePassed === false ? "is-danger" : null
      );
      safeText(els.supportCore, shortEventName(snapshot.events.core));

      let ariaLabel = "";

      if (snapshot.cardioMode === "walk") {
        const walkPass = snapshot.walkPassed === true;
        safeText(els.valueCardio, walkPass ? "PASS" : "FAIL");
        setTone(els.valueCardio, walkPass ? "is-green" : "is-danger");
        safeText(els.supportCardio, "2 km Walk");

        if (walkPass) {
          safeText(els.valueTotal, "Adjusted");
          setTone(els.valueTotal, "is-gold");
          safeText(els.supportTotal, "Confirm in myFitness");
          setTone(els.supportTotal, "is-gold");
          ariaLabel =
            "2 kilometer walk passed. Official adjusted composite must be confirmed in myFitness.";
        } else {
          safeText(els.valueTotal, "Adjusted");
          setTone(els.valueTotal, "is-danger");
          safeText(els.supportTotal, "Walk Failed.");
          setTone(els.supportTotal, "is-danger");
          ariaLabel =
            "2 kilometer walk failed. Estimated PT score is unsatisfactory for the walk component.";
        }
      } else {
        safeText(
          els.valueCardio,
          cardioText == null
            ? `— / ${cardioCap}`
            : `${cardioText} / ${cardioCap}`
        );
        setTone(
          els.valueCardio,
          snapshot.cardioPassed === false ? "is-danger" : null
        );
        safeText(
          els.supportCardio,
          shortEventName(snapshot.events.cardio)
        );

        const displayCategory = categoryDisplay(snapshot.category);
        const tone = totalTone(snapshot);

        if (totalText == null) {
          safeText(els.valueTotal, "—");
        } else {
          safeText(els.valueTotal, totalText);
        }

        setTone(els.valueTotal, tone);
        safeText(els.supportTotal, displayCategory);
        setTone(els.supportTotal, tone);

        if (snapshot.category === "Unresolved-90") {
          ariaLabel =
            "Estimated total PT score 90.0, Verify Rating.";
        } else if (totalText != null) {
          ariaLabel = `Estimated total PT score ${totalText}, ${displayCategory || "pending"}.`;
        } else {
          ariaLabel = "Estimated PT score breakdown.";
        }
      }

      root.setAttribute("aria-label", ariaLabel);
    }

    function receivePTScore(eventOrSnapshot) {
      const raw =
        eventOrSnapshot &&
        typeof eventOrSnapshot === "object" &&
        "detail" in eventOrSnapshot
          ? eventOrSnapshot
          : { detail: eventOrSnapshot };

      const snapshot = normalizeSnapshot(raw);
      if (!snapshot) return false;

      const hasAnyScore =
        snapshot.bodyScore != null ||
        snapshot.strengthScore != null ||
        snapshot.coreScore != null ||
        snapshot.cardioScore != null ||
        snapshot.total != null ||
        snapshot.cardioMode === "walk" ||
        snapshot.category !== "";

      if (!hasAnyScore) return false;

      paintSnapshot(snapshot);
      return true;
    }

    function tryHydrateFromGlobals() {
      if (window.PCSU_PT_SCORE_CURRENT) {
        if (receivePTScore({ detail: window.PCSU_PT_SCORE_CURRENT })) {
          return true;
        }
      }

      try {
        const fromApi =
          window.PCSU_PT_CALCULATOR &&
          typeof window.PCSU_PT_CALCULATOR.getScoreSnapshot === "function"
            ? window.PCSU_PT_CALCULATOR.getScoreSnapshot()
            : null;

        if (fromApi && receivePTScore({ detail: fromApi })) {
          return true;
        }
      } catch (_err) {
        /* Ignore hydration errors. */
      }

      return false;
    }

    /* ============================================================
      6. INIT
    ============================================================ */

    function init() {
      paintMissing();

      window.addEventListener(
        "pcsunited:pt-score-updated",
        receivePTScore
      );

      window.addEventListener("message", (event) => {
        const data = event && event.data;

        if (!data || typeof data !== "object") {
          return;
        }

        if (
          data.type === "pcsunited-pt-score" ||
          data.source === "pcsunited.pt.calculator"
        ) {
          receivePTScore({
            detail: data.detail || data.payload || data
          });
        }
      });

      /*
        Passive hydration only.
        These calls never trigger calculator inputs or APIs.
      */
      setTimeout(tryHydrateFromGlobals, 100);
      setTimeout(tryHydrateFromGlobals, 500);
      setTimeout(tryHydrateFromGlobals, 1200);

      const existingHeaderApi =
        window.PCSU_PT_HEADER &&
        typeof window.PCSU_PT_HEADER === "object"
          ? window.PCSU_PT_HEADER
          : {};

      window.PCSU_PT_HEADER = Object.assign({}, existingHeaderApi, {
        version: VERSION,
        source: SOURCE,

        getScoreSnapshot() {
          return latestSnapshot;
        },

        setScoreSnapshot(snapshot) {
          return receivePTScore({ detail: snapshot || {} });
        },

        clear() {
          paintMissing();
          return true;
        },

        refresh() {
          if (tryHydrateFromGlobals()) {
            return true;
          }

          try {
            if (
              window.PCSU_PT_CALCULATOR &&
              typeof window.PCSU_PT_CALCULATOR.emitScoreSnapshot ===
                "function"
            ) {
              return !!window.PCSU_PT_CALCULATOR.emitScoreSnapshot();
            }
          } catch (_err) {
            return false;
          }

          return false;
        }
      });

      window.dispatchEvent(
        new CustomEvent("pcsunited:pt-header-ready", {
          detail: {
            version: VERSION,
            source: SOURCE,
            root
          }
        })
      );
    }

    init();
  }

  /* ============================================================
    SAFE DOM START
  ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startPTHeaderProgression,
      { once: true }
    );
  } else {
    startPTHeaderProgression();
  }
})();
