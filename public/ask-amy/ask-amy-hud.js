(() => {
  "use strict";

/* ========================================================
         1. SINGLE-LOAD GUARD
      ======================================================== */

      if (window.__PCSU_ASK_AMY_HUD_V130) return;
      window.__PCSU_ASK_AMY_HUD_V130 = true;

      const root = document.getElementById("pcsu-ask-amy-hud-widget");

      if (!root) {
        console.warn("PCSUnited Ask Amy HUD mount element #pcsu-ask-amy-hud-widget was not found.");
        return;
      }

      if (!document.getElementById("pcsu-ask-amy-hud-styles-v123")) {
        const style = document.createElement("style");
        style.id = "pcsu-ask-amy-hud-styles-v123";
        style.textContent = `
    #pcsu-ask-amy-hud-widget,
    #pcsu-ask-amy-hud-widget * {
      box-sizing: border-box;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Roboto,
        Arial,
        sans-serif;
    }

    #pcsu-ask-amy-hud-widget {
      --pcsu-bg: #14100f;
      --pcsu-bg2: #1b1715;
      --pcsu-panel: rgba(18, 17, 16, 0.9);
      --pcsu-panel2: rgba(28, 25, 22, 0.94);
      --pcsu-line: rgba(231, 181, 83, 0.34);
      --pcsu-line-strong: rgba(231, 181, 83, 0.58);
      --pcsu-line-soft: rgba(255, 255, 255, 0.1);
      --pcsu-gold: #e7b553;
      --pcsu-gold2: #f4d58a;
      --pcsu-ink: #f4efe4;
      --pcsu-muted: rgba(244, 239, 228, 0.62);
      --pcsu-muted-strong: rgba(244, 239, 228, 0.76);
      --pcsu-danger: #f09a8f;
      --pcsu-shadow: 0 24px 60px rgba(0, 0, 0, 0.62);
      --pcsu-top-offset: 98px;
    }

    #pcsu-amy-hud {
      position: fixed;
      top: var(--pcsu-top-offset);
      right: 0;
      width: 50vw;
      max-width: 720px;
      min-width: 420px;
      height: calc(100vh - var(--pcsu-top-offset));
      z-index: 2147483646;
      pointer-events: none;
      transform: translateX(100%);
      opacity: 0;
      transition:
        transform 0.24s ease,
        opacity 0.24s ease;
    }

    #pcsu-amy-hud[data-open="1"] {
      pointer-events: auto;
      transform: translateX(0);
      opacity: 1;
    }

    #pcsu-amy-panel {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      border-left: 1px solid var(--pcsu-line);
      background:
        radial-gradient(
          900px 520px at 12% 0%,
          rgba(231, 181, 83, 0.13),
          transparent 58%
        ),
        radial-gradient(
          900px 620px at 95% 100%,
          rgba(255, 255, 255, 0.06),
          transparent 58%
        ),
        linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.035),
          rgba(0, 0, 0, 0.1)
        ),
        var(--pcsu-panel);
      -webkit-backdrop-filter: blur(22px) saturate(150%);
      backdrop-filter: blur(22px) saturate(150%);
      box-shadow: var(--pcsu-shadow);
      overflow: hidden;
      position: relative;
    }

    #pcsu-amy-panel::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.035) 1px,
          transparent 1px
        ),
        linear-gradient(
          0deg,
          rgba(255, 255, 255, 0.025) 1px,
          transparent 1px
        );
      background-size: 34px 34px;
      opacity: 0.08;
      mix-blend-mode: overlay;
    }

    #pcsu-amy-panel > * {
      position: relative;
      z-index: 2;
    }

    .pcsu-amy-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--pcsu-line-soft);
      background:
        linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.055),
          rgba(0, 0, 0, 0)
        ),
        rgba(0, 0, 0, 0.12);
    }

    .pcsu-amy-titlewrap {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .pcsu-amy-avatar {
      width: 80px;
      height: 80px;
      border-radius: 999px;
      flex: 0 0 auto;
      background-image: url("https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/6a3334f99ed5987c434df57f_Face.jpg");
      background-size: cover;
      background-position: center;
      border: 1px solid rgba(231, 181, 83, 0.6);
      box-shadow:
        0 0 0 2px rgba(0, 0, 0, 0.35),
        0 0 20px rgba(231, 181, 83, 0.14);
      filter: saturate(0.92) contrast(1.03);
    }

    .pcsu-amy-title {
      color: var(--pcsu-ink);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      line-height: 1.05;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pcsu-amy-sub {
      margin-top: 5px;
      color: var(--pcsu-muted);
      font-size: 11px;
      font-weight: 800;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pcsu-amy-close {
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      border-radius: 2px;
      border: 1px solid var(--pcsu-line-soft);
      background: rgba(0, 0, 0, 0.16);
      color: var(--pcsu-ink);
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      transition:
        background 0.16s ease,
        border-color 0.16s ease,
        transform 0.16s ease;
    }

    .pcsu-amy-close:hover {
      background: rgba(231, 181, 83, 0.14);
      border-color: var(--pcsu-line);
      transform: translateY(-1px);
    }

    .pcsu-amy-info {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 18px;
      border-bottom: 1px solid var(--pcsu-line-soft);
      background:
        linear-gradient(
          90deg,
          rgba(231, 181, 83, 0.09),
          rgba(255, 255, 255, 0.018)
        ),
        rgba(0, 0, 0, 0.12);
    }

    .pcsu-amy-info-icon {
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      margin-top: 1px;
      border: 1px solid var(--pcsu-line);
      color: var(--pcsu-gold2);
      font-size: 11px;
      font-weight: 900;
      border-radius: 999px;
      background: rgba(231, 181, 83, 0.08);
    }

    .pcsu-amy-info-copy {
      color: var(--pcsu-muted-strong);
      font-size: 10.5px;
      line-height: 1.45;
      font-weight: 700;
    }

    .pcsu-amy-info-copy strong {
      color: var(--pcsu-ink);
      font-weight: 900;
    }

    .pcsu-amy-brief-container {
      display: none;
      width: 100%;
      flex: 0 0 auto;
      padding: 0;
      margin: 0;
    }

    .pcsu-amy-brief-container[data-visible="1"] {
      display: block;
    }

    .pcsu-amy-chat {
      padding: 18px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background:
        radial-gradient(
          700px 460px at 24% 0%,
          rgba(231, 181, 83, 0.08),
          transparent 62%
        ),
        linear-gradient(
          180deg,
          rgba(0, 0, 0, 0.02),
          rgba(0, 0, 0, 0.16)
        );
      scroll-behavior: smooth;
    }

    .pcsu-amy-msg {
      max-width: 86%;
      padding: 12px 13px;
      border-radius: 3px;
      line-height: 1.48;
      font-size: 13px;
      color: var(--pcsu-ink) !important;
      border: 1px solid var(--pcsu-line-soft);
      background: rgba(0, 0, 0, 0.18);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .pcsu-amy-bot {
      align-self: flex-start;
      border-left: 2px solid var(--pcsu-gold);
    }

    .pcsu-amy-user {
      align-self: flex-end;
      background: rgba(231, 181, 83, 0.12);
      border-color: rgba(231, 181, 83, 0.32);
    }

    .pcsu-amy-error {
      border-left-color: var(--pcsu-danger);
    }

    .pcsu-amy-typing {
      font-size: 12px;
      color: var(--pcsu-muted);
    }

    .pcsu-amy-msg small {
      display: block;
      margin-top: 8px;
      color: var(--pcsu-muted);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .pcsu-amy-footer-wrap {
      border-top: 1px solid var(--pcsu-line-soft);
      background: rgba(0, 0, 0, 0.2);
    }

    .pcsu-amy-footer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      padding: 14px 16px 8px;
    }

    .pcsu-amy-input {
      width: 100%;
      min-height: 44px;
      border-radius: 3px;
      border: 1px solid var(--pcsu-line-soft);
      background: rgba(8, 10, 14, 0.72);
      color: var(--pcsu-ink) !important;
      padding: 12px;
      outline: none;
      font-size: 13px;
      font-weight: 800;
    }

    .pcsu-amy-input::placeholder {
      color: rgba(244, 239, 228, 0.38);
    }

    .pcsu-amy-input:focus {
      border-color: rgba(231, 181, 83, 0.55);
      box-shadow: 0 0 0 3px rgba(231, 181, 83, 0.1);
    }

    .pcsu-amy-send {
      min-width: 96px;
      height: 44px;
      border: 0;
      border-radius: 3px;
      cursor: pointer;
      color: #15100b;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: linear-gradient(
        180deg,
        var(--pcsu-gold2),
        var(--pcsu-gold)
      );
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.42);
      transition:
        transform 0.16s ease,
        filter 0.16s ease;
    }

    .pcsu-amy-send:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
    }

    .pcsu-amy-send:disabled {
      opacity: 0.62;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .pcsu-amy-disclosure {
      padding: 0 16px 12px;
      color: rgba(244, 239, 228, 0.48);
      font-size: 9.5px;
      line-height: 1.45;
      font-weight: 700;
      text-align: left;
    }

    .pcsu-amy-disclosure strong {
      color: rgba(244, 239, 228, 0.7);
      font-weight: 900;
    }

    .tw-caret {
      display: inline-block;
      width: 1px;
      height: 1.2em;
      margin-left: 2px;
      background: currentColor;
      animation: tw-blink 1s steps(1, end) infinite;
    }

    @keyframes tw-blink {
      50% {
        opacity: 0;
      }
    }

    @media (max-width: 860px) {
      #pcsu-amy-hud {
        top: var(--pcsu-top-offset);
        width: 100vw;
        max-width: 100vw;
        min-width: 0;
        height: calc(100vh - var(--pcsu-top-offset));
      }

      .pcsu-amy-info {
        padding-left: 14px;
        padding-right: 14px;
      }

      .pcsu-amy-chat {
        padding: 14px;
      }

      .pcsu-amy-msg {
        max-width: 92%;
      }
    }

    @media (max-width: 540px) {
      #pcsu-ask-amy-hud-widget {
        --pcsu-top-offset: 90px;
      }

      .pcsu-amy-header {
        padding: 13px 14px;
      }

      .pcsu-amy-footer {
        grid-template-columns: 1fr;
        padding: 12px 12px 8px;
      }

      .pcsu-amy-send {
        width: 100%;
      }

      .pcsu-amy-disclosure {
        padding: 0 12px 10px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #pcsu-amy-hud,
      .pcsu-amy-close,
      .pcsu-amy-send {
        transition: none !important;
      }

      .tw-caret {
        animation: none;
      }
    }
  `;
        document.head.appendChild(style);
      }

      root.innerHTML = `<div
    id="pcsu-amy-hud"
    data-open="0"
    role="dialog"
    aria-modal="false"
    aria-label="Ask Amy"
    aria-live="polite"
  >
    <div id="pcsu-amy-panel">
      <div class="pcsu-amy-header">
        <div class="pcsu-amy-titlewrap">
          <div class="pcsu-amy-avatar" aria-hidden="true"></div>

          <div style="min-width: 0;">
            <div class="pcsu-amy-title">Ask Amy</div>

            <div class="pcsu-amy-sub">
              Powered by TheWing • PCSUnited Decision Guidance
            </div>
          </div>
        </div>

        <button
          class="pcsu-amy-close"
          id="pcsu-amy-close"
          type="button"
          aria-label="Close Ask Amy"
        >
          ×
        </button>
      </div>

      <div class="pcsu-amy-info">
        <div class="pcsu-amy-info-icon" aria-hidden="true">i</div>

        <div class="pcsu-amy-info-copy">
          <strong>TheWing calculates. Amy explains.</strong>
          Ask about PCS planning, military compensation, BAH, housing,
          mortgages, VA loans, financial readiness, or your next step.
        </div>
      </div>

      <div
        class="pcsu-amy-chat"
        id="pcsu-amy-chat"
        aria-label="Ask Amy conversation"
      >
        <div
          id="pcsu-amy-brief-container"
          class="pcsu-amy-brief-container"
        ></div>
      </div>

      <div class="pcsu-amy-footer-wrap">
        <div class="pcsu-amy-footer">
          <input
            id="pcsu-amy-input"
            class="pcsu-amy-input"
            type="text"
            placeholder="Ask Amy about your PCS, BAH, housing, mortgage, or next step…"
            autocomplete="off"
            maxlength="5000"
            aria-label="Ask Amy a question"
          />

          <button
            id="pcsu-amy-send"
            class="pcsu-amy-send"
            type="button"
          >
            Send
          </button>
        </div>

        <div class="pcsu-amy-disclosure">
          PCSUnited and TheWing provide planning estimates and educational
          guidance. <strong>Results are not lending approval</strong> and do
          not replace official finance, legal, tax, or benefits guidance.
        </div>
      </div>
    </div>
  </div>`;


      /* ========================================================
         2. ELEMENTS / CONFIG
      ======================================================== */

      const endpoint =
        String(root.getAttribute("data-endpoint") || "").trim() ||
        "https://thewing.netlify.app/.netlify/functions/agent-amy-public";

      const hud = root.querySelector("#pcsu-amy-hud");
      const panel = root.querySelector("#pcsu-amy-panel");
      const closeBtn = root.querySelector("#pcsu-amy-close");
      const briefContainer = root.querySelector("#pcsu-amy-brief-container");
      const chatEl = root.querySelector("#pcsu-amy-chat");
      const inputEl = root.querySelector("#pcsu-amy-input");
      const sendBtn = root.querySelector("#pcsu-amy-send");

      if (
        !hud ||
        !panel ||
        !closeBtn ||
        !chatEl ||
        !inputEl ||
        !sendBtn
      ) {
        console.warn("PCSUnited Ask Amy HUD could not initialize.");
        return;
      }

      /* ========================================================
         2b. DUAL BRIEF CONTROLLER
         Compensation: window.PCSUnitedAmyBrief
         Mortgage:     window.PCSUnitedAmyMortgageBrief

         Mortgage Brief activates only after a user-initiated
         pcsunited:financial-input-updated event, once the Header
         Strip is confirmed in "financial" mode.
      ======================================================== */

      let activeBriefType = null;
      let mortgageBriefActivated = false;
      let latestMortgageBriefData = null;
      let pendingMortgageActivationTimer = null;
      let compensationBriefInitialized = false;
      let mortgageBriefInitialized = false;
      let warnedMissingMortgageBrief = false;

      // In-memory PT Calculator context for Ask Amy (no localStorage/sessionStorage).
      let latestPtCalculatorData = null;
      let ptCalculatorListenersBound = false;

      function clonePtSnapshot(value) {
        if (!value || typeof value !== "object") return null;
        try {
          return JSON.parse(JSON.stringify(value));
        } catch (_) {
          return null;
        }
      }

      function readCurrentPtGlobals() {
        try {
          if (
            window.PCSU_PT_SCORE_CURRENT &&
            typeof window.PCSU_PT_SCORE_CURRENT === "object"
          ) {
            const cloned = clonePtSnapshot(window.PCSU_PT_SCORE_CURRENT);
            if (cloned) return cloned;
          }
        } catch (_) {
          // ignore
        }

        try {
          const api = window.PCSU_PT_CALCULATOR;
          if (api && typeof api.getScoreSnapshot === "function") {
            const snapshot = api.getScoreSnapshot();
            if (snapshot && typeof snapshot === "object") {
              const cloned = clonePtSnapshot(snapshot);
              if (cloned) return cloned;
            }
          }
        } catch (_) {
          // ignore
        }

        return null;
      }

      function readLegacyPtCalculatorData() {
        try {
          const api = window.PCSUnitedPTCalculator;
          if (api && typeof api.getData === "function") {
            const data = api.getData();
            if (data && typeof data === "object") {
              return clonePtSnapshot(data);
            }
          }
        } catch (_) {
          // ignore
        }
        return null;
      }

      function readPtCalculatorData() {
        const current = readCurrentPtGlobals();
        if (current) return current;

        if (latestPtCalculatorData && typeof latestPtCalculatorData === "object") {
          return clonePtSnapshot(latestPtCalculatorData);
        }

        return readLegacyPtCalculatorData();
      }

      function setLatestPtCalculatorData(pt, sourceEvent) {
        const cloned = clonePtSnapshot(pt);
        if (!cloned) return;
        latestPtCalculatorData = {
          ...cloned,
          _captured_at: new Date().toISOString(),
          _source_event: sourceEvent || "pcsunited-pt-score"
        };
      }

      function hydratePtCalculatorSnapshot(sourceLabel) {
        const live = readCurrentPtGlobals() || readLegacyPtCalculatorData();
        if (!live) return false;
        setLatestPtCalculatorData(live, sourceLabel || "hydrate");
        return true;
      }

      function bindPtCalculatorListeners() {
        if (ptCalculatorListenersBound) return;
        ptCalculatorListenersBound = true;

        const onScoreUpdated = (event) => {
          const detail = event && event.detail;
          if (detail && typeof detail === "object") {
            setLatestPtCalculatorData(detail, "pcsunited:pt-score-updated");
            return;
          }
          hydratePtCalculatorSnapshot("pcsunited:pt-score-updated");
        };

        // Legacy fallback events only.
        const onLegacyReady = (event) => {
          const detail = event && event.detail ? event.detail : {};
          const pt =
            (detail.pt && typeof detail.pt === "object" && detail.pt) ||
            (detail &&
            typeof detail === "object" &&
            (detail.total != null || detail.bodyScore != null)
              ? detail
              : null) ||
            readLegacyPtCalculatorData();
          if (pt) {
            setLatestPtCalculatorData(pt, "pcsunited:pt-calculator-ready");
          }
        };

        const onLegacyUpdated = (event) => {
          const detail = event && event.detail ? event.detail : {};
          const pt =
            (detail.pt && typeof detail.pt === "object" && detail.pt) ||
            (detail &&
            typeof detail === "object" &&
            (detail.total != null || detail.bodyScore != null)
              ? detail
              : null) ||
            readLegacyPtCalculatorData();
          if (pt) {
            setLatestPtCalculatorData(pt, "pcsunited:pt-calculator-updated");
          }
        };

        const onPostMessage = (event) => {
          const data = event && event.data;
          if (!data || typeof data !== "object") return;
          if (data.type !== "pcsunited-pt-score") return;
          if (!data.detail || typeof data.detail !== "object") return;
          setLatestPtCalculatorData(
            data.detail,
            "postMessage:pcsunited-pt-score"
          );
        };

        window.addEventListener("pcsunited:pt-score-updated", onScoreUpdated);
        window.addEventListener("pcsunited:pt-calculator-ready", onLegacyReady);
        window.addEventListener(
          "pcsunited:pt-calculator-updated",
          onLegacyUpdated
        );
        window.addEventListener("message", onPostMessage);

        hydratePtCalculatorSnapshot("init");
        window.setTimeout(
          () => hydratePtCalculatorSnapshot("retry-100ms"),
          100
        );
        window.setTimeout(
          () => hydratePtCalculatorSnapshot("retry-500ms"),
          500
        );
        window.setTimeout(
          () => hydratePtCalculatorSnapshot("retry-1200ms"),
          1200
        );
      }

      function getMortgageBriefApi() {
        return window.PCSUnitedAmyMortgageBrief || null;
      }

      function cancelPendingMortgageActivation() {
        if (pendingMortgageActivationTimer != null) {
          clearTimeout(pendingMortgageActivationTimer);
          pendingMortgageActivationTimer = null;
        }
      }

      function initializeBriefRenderers() {
        if (!briefContainer) return false;

        if (window.PCSUnitedAmyBrief && !compensationBriefInitialized) {
          window.PCSUnitedAmyBrief.initialize(briefContainer);
          compensationBriefInitialized = true;
        }

        const mortgageApi = getMortgageBriefApi();
        if (mortgageApi && !mortgageBriefInitialized) {
          mortgageApi.initialize(briefContainer);
          mortgageBriefInitialized = true;
        }

        return true;
      }

      function firstDefined(...values) {
        for (const value of values) {
          if (value !== undefined && value !== null && value !== "") {
            return value;
          }
        }

        return undefined;
      }

      function firstPositiveNumber(...values) {
        for (const value of values) {
          if (value === undefined || value === null || value === "") {
            continue;
          }

          if (typeof value === "number") {
            if (Number.isFinite(value) && value > 0) return value;
            continue;
          }

          const text = String(value).replace(/[$,%\s,]/g, "");
          if (!text) continue;
          const num = Number(text);
          if (Number.isFinite(num) && num > 0) return num;
        }

        return null;
      }

      function getHeaderStripMode() {
        try {
          const mode =
            window.PCSU_HEADER_COMP_BASICBRAIN &&
            typeof window.PCSU_HEADER_COMP_BASICBRAIN.getMode === "function"
              ? window.PCSU_HEADER_COMP_BASICBRAIN.getMode()
              : "";
          return safeString(mode).toLowerCase();
        } catch (_) {
          return "";
        }
      }

      function isHeaderFinancialMode() {
        return getHeaderStripMode() === "financial";
      }

      function hasPositiveBasicBrainIncome(detail) {
        const d = isPlainObject(detail) ? detail : {};
        const headerSnapshot = isPlainObject(d.headerSnapshot)
          ? d.headerSnapshot
          : {};
        const eventCompensation = isPlainObject(d.compensation)
          ? d.compensation
          : {};
        const sessionCompensation = isPlainObject(getCompensation())
          ? getCompensation()
          : {};

        return (
          firstPositiveNumber(
            d.totalIncome,
            d.basicIncome,
            headerSnapshot.income,
            eventCompensation.total,
            eventCompensation.totalMonthly,
            eventCompensation.total_monthly,
            eventCompensation.totalMonthlyCompensation,
            sessionCompensation.total,
            sessionCompensation.totalMonthly,
            sessionCompensation.total_monthly,
            sessionCompensation.totalMonthlyCompensation
          ) !== null
        );
      }

      function readFinancialPanelInputs() {
        try {
          const panel = window.PCSU_FINANCIAL_INPUT_PANEL;
          if (
            panel &&
            typeof panel.getInputs === "function"
          ) {
            const inputs = panel.getInputs();
            return isPlainObject(inputs) ? inputs : {};
          }
        } catch (_) {}

        return {};
      }

      function patchPublicSessionFromFinancialDetail(detail) {
        if (!isPlainObject(detail)) {
          return loadPublicSession();
        }

        const mortgagePacket =
          (isPlainObject(detail.mortgageApiResult) &&
            detail.mortgageApiResult) ||
          (isPlainObject(detail.mortgage) && detail.mortgage) ||
          detail;

        return patchPublicSession({
          financial_intake: detail,
          user_financial_inputs: detail,
          mortgage: mortgagePacket
        });
      }

      function buildMortgageBriefData(eventDetail) {
        const detail = isPlainObject(eventDetail) ? eventDetail : {};
        const panelInputs = readFinancialPanelInputs();
        const session = loadPublicSession();

        // Preferred source order (later wins):
        // session mortgage → user_financial_inputs → financial_intake
        // → panel getInputs() → qualifying event detail
        return {
          ...(isPlainObject(session.mortgage) ? session.mortgage : {}),
          ...(isPlainObject(session.user_financial_inputs)
            ? session.user_financial_inputs
            : {}),
          ...(isPlainObject(session.financial_intake)
            ? session.financial_intake
            : {}),
          ...panelInputs,
          ...detail,
          compensation: firstDefined(
            detail.compensation,
            getCompensation()
          ),
          basicbrain: firstDefined(
            detail.basicbrain,
            session.basicbrain
          ),
          mortgageApiResult: firstDefined(
            detail.mortgageApiResult,
            isPlainObject(detail.mortgage) ? detail.mortgage : undefined,
            isPlainObject(session.mortgage) ? session.mortgage : undefined
          )
        };
      }

      function hideAllBriefs() {
        if (window.PCSUnitedAmyBrief) {
          window.PCSUnitedAmyBrief.clear();
        }

        const mortgageApi = getMortgageBriefApi();
        if (mortgageApi && typeof mortgageApi.clear === "function") {
          mortgageApi.clear();
        }

        if (briefContainer) {
          briefContainer.setAttribute("data-visible", "0");
        }

        activeBriefType = null;
      }

      function showCompensationBrief(data) {
        initializeBriefRenderers();

        if (!window.PCSUnitedAmyBrief || !briefContainer || !data) {
          return false;
        }

        const mortgageApi = getMortgageBriefApi();
        if (mortgageApi && typeof mortgageApi.clear === "function") {
          mortgageApi.clear();
        }

        briefContainer.setAttribute("data-visible", "1");
        window.PCSUnitedAmyBrief.render(data);
        activeBriefType = "compensation";
        return true;
      }

      function showMortgageBrief(data, options = {}) {
        initializeBriefRenderers();

        const mortgageApi = getMortgageBriefApi();
        if (!mortgageApi || !briefContainer) {
          if (!warnedMissingMortgageBrief) {
            console.warn(
              "PCSUnited Ask Amy HUD: Mortgage Brief renderer is unavailable. Keeping Compensation Brief."
            );
            warnedMissingMortgageBrief = true;
          }
          return false;
        }

        if (!data || typeof data !== "object") {
          return false;
        }

        if (window.PCSUnitedAmyBrief) {
          window.PCSUnitedAmyBrief.clear();
        }

        briefContainer.setAttribute("data-visible", "1");

        const alreadyActive =
          activeBriefType === "mortgage" && mortgageBriefActivated;

        if (alreadyActive && typeof mortgageApi.update === "function") {
          mortgageApi.update(data);
        } else if (typeof mortgageApi.render === "function") {
          mortgageApi.render(data);
        } else {
          return false;
        }

        latestMortgageBriefData = data;
        activeBriefType = "mortgage";

        const firstTransition = !mortgageBriefActivated;
        if (firstTransition) {
          mortgageBriefActivated = true;

          if (options.openIfFirst !== false && !isOpen()) {
            openAmy();
          }
        }

        return true;
      }

      function buildCompensationBriefData() {
        const context = getPCSContext();

        const profile =
          isPlainObject(context.profile)
            ? context.profile
            : {};

        const compensation =
          isPlainObject(context.compensation)
            ? context.compensation
            : {};

        const basicbrain =
          isPlainObject(context.basicbrain)
            ? context.basicbrain
            : {};

        const selectedBase =
          (isPlainObject(basicbrain.selectedBase) && basicbrain.selectedBase) ||
          (isPlainObject(profile.selectedBase) && profile.selectedBase) ||
          {};

        const normalizedProfile = {
          rankTitle: firstDefined(
            profile.rankTitle,
            profile.rank_title,
            profile.rankDisplay,
            profile.rank_display,
            profile.rankName,
            profile.rank_name,
            profile.rank,
            basicbrain.rankTitle,
            basicbrain.rank
          ),

          selectedBase: firstDefined(
            selectedBase.name,
            selectedBase.base,
            profile.selected_base,
            profile.base,
            basicbrain.selected_base,
            basicbrain.base
          )
        };

        const normalizedCompensation = {
          basePay: firstDefined(
            compensation.basePay,
            compensation.base_pay,
            compensation.basicPay,
            compensation.basic_pay
          ),

          bah: firstDefined(
            compensation.bah,
            compensation.BAH
          ),

          bas: firstDefined(
            compensation.bas,
            compensation.BAS
          ),

          totalMonthlyCompensation: firstDefined(
            compensation.totalMonthlyCompensation,
            compensation.total_monthly_compensation,
            compensation.total
          )
        };

        const hasCompensation = Object.values(normalizedCompensation).some(
          (value) => value !== undefined && value !== null && value !== ""
        );

        if (!hasCompensation) {
          return null;
        }

        return {
          type: "compensation",

          profile: normalizedProfile,

          compensation: normalizedCompensation,

          selectedBase,

          actions: [
            "Base Demographics",
            "Mortgage Calculator",
            "Housing Quiz",
            "Financial Analysis"
          ]
        };
      }

      function refreshActiveBrief(options = {}) {
        initializeBriefRenderers();

        if (
          (activeBriefType === "mortgage" || mortgageBriefActivated) &&
          latestMortgageBriefData
        ) {
          showMortgageBrief(latestMortgageBriefData, {
            openIfFirst: false
          });
          return true;
        }

        const briefData = buildCompensationBriefData();

        if (!briefData) {
          hideAllBriefs();
          return false;
        }

        showCompensationBrief(briefData);

        if (options.open === true) {
          openAmy();
        }

        return true;
      }

      function refreshAmyBrief(options = {}) {
        return refreshActiveBrief(options);
      }

      function showAmyBrief(data) {
        if (isPlainObject(data) && safeString(data.type) === "mortgage") {
          return showMortgageBrief(data, { openIfFirst: false });
        }

        return showCompensationBrief(data);
      }

      function hideAmyBrief() {
        hideAllBriefs();
      }

      function activateMortgageBriefFromFinancialEvent(event) {
        const detail =
          event && isPlainObject(event.detail) ? event.detail : null;

        if (!detail) return;

        patchPublicSessionFromFinancialDetail(detail);

        const briefData = buildMortgageBriefData(detail);
        latestMortgageBriefData = briefData;

        if (detail.userInitiated !== true) {
          return;
        }

        if (!hasPositiveBasicBrainIncome(detail)) {
          return;
        }

        cancelPendingMortgageActivation();

        let attempts = 0;
        const maxAttempts = 5;

        const attemptActivation = () => {
          attempts += 1;

          if (isHeaderFinancialMode()) {
            showMortgageBrief(latestMortgageBriefData || briefData, {
              openIfFirst: true
            });
            return;
          }

          if (attempts >= maxAttempts) {
            return;
          }

          pendingMortgageActivationTimer = setTimeout(() => {
            pendingMortgageActivationTimer = null;
            attemptActivation();
          }, attempts === 1 ? 0 : 25);
        };

        // Wait until the current event dispatch finishes, then verify the
        // Header Strip has entered financial mode before switching Briefs.
        queueMicrotask(() => {
          requestAnimationFrame(attemptActivation);
        });
      }

      initializeBriefRenderers();

      /* ========================================================
         3. STORAGE KEYS
      ======================================================== */

      const KEY_THREAD = "pcsunited.askamy.thread.v1";
      const KEY_MEMORY = "pcsunited.askamy.memory.v1";
      const KEY_CID = "pcsunited.askamy.cid.v1";
      const KEY_PUBLIC_SESSION =
        "pcsunited.resources.public-session.v1";
      const KEY_BASICBRAIN_HANDOFF =
        "pcsunited.basicbrain.handoff.v1";

      const MAX_STORED_MESSAGES = 24;
      const MAX_RENDERED_MESSAGES = 12;
      const REQUEST_TIMEOUT_MS = 30000;

      window.__PCSU_AMY_THREAD =
        window.__PCSU_AMY_THREAD || [];

      window.__PCSU_AMY_MEMORY =
        window.__PCSU_AMY_MEMORY || {};

      window.__PCSU_AMY_CID =
        window.__PCSU_AMY_CID || "";

      /* ========================================================
         4. SAFE HELPERS
      ======================================================== */

      function safeJSON(value, fallback = null) {
        try {
          if (value === null || value === undefined || value === "") {
            return fallback;
          }

          if (typeof value === "object") {
            return value;
          }

          return JSON.parse(value);
        } catch (_) {
          return fallback;
        }
      }

      function safeString(value) {
        return String(value ?? "").trim();
      }

      function isPlainObject(value) {
        return Boolean(
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        );
      }

      function stripEmptyObject(value) {
        if (!isPlainObject(value)) return value;

        const output = {};

        Object.entries(value).forEach(([key, item]) => {
          if (
            item === undefined ||
            item === null ||
            item === ""
          ) {
            return;
          }

          if (Array.isArray(item)) {
            if (item.length) output[key] = item;
            return;
          }

          if (isPlainObject(item)) {
            const nested = stripEmptyObject(item);

            if (Object.keys(nested).length) {
              output[key] = nested;
            }

            return;
          }

          output[key] = item;
        });

        return output;
      }

      function lsGet(key) {
        try {
          return localStorage.getItem(key);
        } catch (_) {
          return null;
        }
      }

      function lsSet(key, value) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (_) {
          return false;
        }
      }

      function lsDel(key) {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (_) {
          return false;
        }
      }

      function ssGet(key) {
        try {
          return sessionStorage.getItem(key);
        } catch (_) {
          return null;
        }
      }

      function ssSet(key, value) {
        try {
          sessionStorage.setItem(key, value);
          return true;
        } catch (_) {
          return false;
        }
      }

      function ssDel(key) {
        try {
          sessionStorage.removeItem(key);
          return true;
        } catch (_) {
          return false;
        }
      }

      function uuid(prefix = "pcsu_amy_") {
        if (
          window.crypto &&
          typeof window.crypto.randomUUID === "function"
        ) {
          return prefix + window.crypto.randomUUID();
        }

        return (
          prefix +
          Math.random().toString(16).slice(2) +
          "_" +
          Date.now().toString(16)
        );
      }

      function getCID() {
        const stored = safeString(ssGet(KEY_CID));
        const runtime = safeString(window.__PCSU_AMY_CID);

        if (stored) {
          window.__PCSU_AMY_CID = stored;
          return stored;
        }

        if (runtime) {
          ssSet(KEY_CID, runtime);
          return runtime;
        }

        const id = uuid();

        window.__PCSU_AMY_CID = id;
        ssSet(KEY_CID, id);

        return id;
      }

      /* ========================================================
         5. THREAD MEMORY (sessionStorage only)
      ======================================================== */

      function loadThread() {
        const parsed = safeJSON(ssGet(KEY_THREAD), []);

        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .filter((item) => {
              return (
                item &&
                typeof item === "object" &&
                ["user", "assistant"].includes(item.role) &&
                typeof item.content === "string"
              );
            })
            .slice(-MAX_STORED_MESSAGES);

          window.__PCSU_AMY_THREAD = cleaned;
          return cleaned;
        }

        return Array.isArray(window.__PCSU_AMY_THREAD)
          ? window.__PCSU_AMY_THREAD.slice(-MAX_STORED_MESSAGES)
          : [];
      }

      function saveThread(thread) {
        const cleaned = Array.isArray(thread)
          ? thread
              .filter((item) => {
                return (
                  item &&
                  typeof item === "object" &&
                  ["user", "assistant"].includes(item.role) &&
                  typeof item.content === "string"
                );
              })
              .slice(-MAX_STORED_MESSAGES)
          : [];

        window.__PCSU_AMY_THREAD = cleaned;
        ssSet(KEY_THREAD, JSON.stringify(cleaned));

        return cleaned;
      }

      function addToThread(role, content) {
        const cleanContent = safeString(content);

        if (!cleanContent) return;

        const thread = loadThread();

        thread.push({
          role: role === "assistant" ? "assistant" : "user",
          content: cleanContent,
          ts: Date.now()
        });

        saveThread(thread);
      }

      function loadMemory() {
        const parsed = safeJSON(ssGet(KEY_MEMORY), {});

        if (isPlainObject(parsed)) {
          window.__PCSU_AMY_MEMORY = parsed;
          return parsed;
        }

        return isPlainObject(window.__PCSU_AMY_MEMORY)
          ? window.__PCSU_AMY_MEMORY
          : {};
      }

      function saveMemory(memory) {
        const clean = isPlainObject(memory) ? memory : {};

        window.__PCSU_AMY_MEMORY = clean;
        ssSet(KEY_MEMORY, JSON.stringify(clean));

        return clean;
      }

      function applyMemoryPatch(patch) {
        if (!isPlainObject(patch)) {
          return loadMemory();
        }

        const memory = {
          ...loadMemory()
        };

        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined) return;

          if (value === null) {
            delete memory[key];
            return;
          }

          memory[key] = value;
        });

        return saveMemory(memory);
      }

      /* ========================================================
         6. RESOURCES PUBLIC SESSION CONTEXT

         Public Amy only uses context created during the current
         Resources page session. Historical localStorage profile /
         compensation / mortgage / FAD objects are ignored.
      ======================================================== */

      function emptyPublicSession() {
        return {
          id: uuid("pcsu_resources_"),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile: null,
          bridge: null,
          compensation: null,
          mortgage: null,
          financial_intake: null,
          user_financial_inputs: null,
          user_aiou_inputs: null,
          fad: null,
          kpi_overrides: null,
          basicbrain: null
        };
      }

      function loadPublicSession() {
        const parsed = safeJSON(ssGet(KEY_PUBLIC_SESSION), null);

        if (isPlainObject(parsed) && safeString(parsed.id)) {
          return parsed;
        }

        const fresh = emptyPublicSession();
        savePublicSession(fresh);
        return fresh;
      }

      function savePublicSession(session) {
        const clean = isPlainObject(session)
          ? session
          : emptyPublicSession();

        clean.updated_at = new Date().toISOString();
        ssSet(KEY_PUBLIC_SESSION, JSON.stringify(clean));
        window.__PCSU_RESOURCES_PUBLIC_SESSION = clean;
        return clean;
      }

      function patchPublicSession(patch) {
        if (!isPlainObject(patch)) {
          return loadPublicSession();
        }

        const session = {
          ...loadPublicSession()
        };

        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined) return;

          if (value === null) {
            session[key] = null;
            return;
          }

          if (isPlainObject(value) && isPlainObject(session[key])) {
            session[key] = {
              ...session[key],
              ...value
            };
            return;
          }

          session[key] = value;
        });

        return savePublicSession(session);
      }

      function hasUsableScenarioFields(value) {
        if (!isPlainObject(value)) return false;

        const rank = safeString(
          value.rank ||
          value.rank_paygrade ||
          value.rankPaygrade ||
          value.paygrade
        );

        const base = safeString(
          value.base ||
          value.selected_base ||
          value.pcs_base ||
          value.pcsBase ||
          value.current_base ||
          value.currentBase ||
          (isPlainObject(value.selectedBase)
            ? value.selectedBase.base || value.selectedBase.name
            : "")
        );

        const yos = Number(
          value.yos ||
          value.years_of_service ||
          value.yearsOfService ||
          0
        );

        const homePrice = Number(
          value.home_price ||
          value.homePrice ||
          value.price ||
          value.purchase_price ||
          0
        );

        const total = Number(
          value.total ||
          value.totalMonthlyCompensation ||
          value.total_monthly_compensation ||
          0
        );

        return Boolean(
          rank ||
          base ||
          (Number.isFinite(yos) && yos > 0) ||
          (Number.isFinite(homePrice) && homePrice > 0) ||
          (Number.isFinite(total) && total > 0)
        );
      }

      function isValidBasicBrainHandoff(handoff) {
        if (!isPlainObject(handoff)) return false;

        return (
          hasUsableScenarioFields(handoff.profile) ||
          hasUsableScenarioFields(handoff.bridge) ||
          hasUsableScenarioFields(handoff.compensation) ||
          hasUsableScenarioFields(handoff.calculated_comp) ||
          hasUsableScenarioFields(handoff.basicbrain) ||
          hasUsableScenarioFields(handoff.selectedBase)
        );
      }

      function absorbBasicBrainHandoff() {
        const raw = lsGet(KEY_BASICBRAIN_HANDOFF);

        if (!raw) return null;

        const handoff = safeJSON(raw, null);

        // One-time handoff: always remove after read.
        lsDel(KEY_BASICBRAIN_HANDOFF);

        if (!isValidBasicBrainHandoff(handoff)) {
          return null;
        }

        const session = loadPublicSession();
        const handoffCreated = Date.parse(
          safeString(handoff.updated_at || handoff.created_at)
        );
        const sessionCreated = Date.parse(
          safeString(session.created_at)
        );

        // Ignore leftover handoffs from previous page visits.
        if (
          Number.isFinite(handoffCreated) &&
          Number.isFinite(sessionCreated) &&
          handoffCreated < sessionCreated
        ) {
          return null;
        }

        return patchPublicSession({
          profile: isPlainObject(handoff.profile)
            ? handoff.profile
            : undefined,
          bridge: isPlainObject(handoff.bridge)
            ? handoff.bridge
            : undefined,
          compensation:
            (isPlainObject(handoff.compensation) &&
              handoff.compensation) ||
            (isPlainObject(handoff.calculated_comp) &&
              handoff.calculated_comp) ||
            undefined,
          basicbrain: isPlainObject(handoff.basicbrain)
            ? handoff.basicbrain
            : undefined
        });
      }

      function syncLiveRuntimeContext() {
        absorbBasicBrainHandoff();

        const live =
          (isPlainObject(window.PCSU_BASICBRAIN_CURRENT) &&
            window.PCSU_BASICBRAIN_CURRENT) ||
          (isPlainObject(window.PCSU_BASICBRAIN_TEMP) &&
            window.PCSU_BASICBRAIN_TEMP) ||
          null;

        if (!live || !hasUsableScenarioFields(live)) {
          return loadPublicSession();
        }

        return patchPublicSession({
          profile: isPlainObject(live.profile)
            ? live.profile
            : hasUsableScenarioFields(live)
              ? live
              : undefined,
          bridge: isPlainObject(live.bridge)
            ? live.bridge
            : undefined,
          compensation:
            (isPlainObject(live.compensation) &&
              live.compensation) ||
            (isPlainObject(live.calculated_comp) &&
              live.calculated_comp) ||
            undefined,
          basicbrain: live
        });
      }

      function onResourcesContextEvent(event) {
        const detail =
          event && isPlainObject(event.detail)
            ? event.detail
            : null;

        if (!detail) return;

        const type = safeString(event.type);
        const patch = {};

        if (
          type === "pcsunited:basicbrain-updated" ||
          type === "pcsunited:profile-ready" ||
          type === "pcsunited:bridge-ready" ||
          type === "pcsunited:compensation-ready" ||
          type === "pcsunited:base-preview-ready"
        ) {
          if (isPlainObject(detail.profile)) {
            patch.profile = detail.profile;
          } else if (
            type === "pcsunited:profile-ready" &&
            hasUsableScenarioFields(detail)
          ) {
            patch.profile = detail;
          }

          if (isPlainObject(detail.bridge)) {
            patch.bridge = detail.bridge;
          } else if (
            type === "pcsunited:bridge-ready" &&
            hasUsableScenarioFields(detail)
          ) {
            patch.bridge = detail;
          }

          if (isPlainObject(detail.compensation)) {
            patch.compensation = detail.compensation;
          } else if (
            type === "pcsunited:compensation-ready" &&
            hasUsableScenarioFields(detail)
          ) {
            patch.compensation = detail;
          }

          if (isPlainObject(detail.basicbrain)) {
            patch.basicbrain = detail.basicbrain;
          }
        }

        if (
          type === "pcsunited:mortgage-ready" ||
          type === "pcsunited:mortgage-health-ready"
        ) {
          patch.mortgage =
            (isPlainObject(detail.mortgage) && detail.mortgage) ||
            (isPlainObject(detail.result) && detail.result) ||
            detail;

          if (Object.keys(patch).length) {
            patchPublicSession(patch);
          }

          // Enrich an already-active Mortgage Brief. Never activate from
          // mortgage-ready / mortgage-health-ready alone.
          if (mortgageBriefActivated || activeBriefType === "mortgage") {
            latestMortgageBriefData = buildMortgageBriefData({
              ...(isPlainObject(latestMortgageBriefData)
                ? latestMortgageBriefData
                : {}),
              ...detail,
              mortgageApiResult: patch.mortgage
            });
            showMortgageBrief(latestMortgageBriefData, {
              openIfFirst: false
            });
          }

          return;
        }

        if (Object.keys(patch).length) {
          patchPublicSession(patch);
        }

        absorbBasicBrainHandoff();

        // After Mortgage Brief is active, keep it sticky. Compensation /
        // BasicBrain events may still update the public session above.
        if (mortgageBriefActivated || activeBriefType === "mortgage") {
          refreshActiveBrief({ open: false });
          return;
        }

        const shouldOpen =
          !isOpen() &&
          (
            type === "pcsunited:compensation-ready" ||
            type === "pcsunited:basicbrain-updated"
          );

        refreshActiveBrief({
          open: shouldOpen
        });
      }

      function onFinancialInputUpdated(event) {
        activateMortgageBriefFromFinancialEvent(event);
      }

      function onFinancialInputPreloaded(event) {
        const detail =
          event && isPlainObject(event.detail) ? event.detail : null;

        if (!detail) return;

        // Preload may update session state only. Never activate Mortgage Brief.
        patchPublicSessionFromFinancialDetail(detail);
      }

      function bindResourcesContextListeners() {
        const events = [
          "pcsunited:basicbrain-updated",
          "pcsunited:profile-ready",
          "pcsunited:bridge-ready",
          "pcsunited:compensation-ready",
          "pcsunited:base-preview-ready",
          "pcsunited:mortgage-ready",
          "pcsunited:mortgage-health-ready"
        ];

        events.forEach((name) => {
          window.addEventListener(name, onResourcesContextEvent);
        });

        window.addEventListener(
          "pcsunited:financial-input-updated",
          onFinancialInputUpdated
        );

        window.addEventListener(
          "pcsunited:financial-input-preloaded",
          onFinancialInputPreloaded
        );

        window.addEventListener(
          "pcsunited:mortgage-input-preloaded",
          onFinancialInputPreloaded
        );
      }

      function getProfile() {
        const session = syncLiveRuntimeContext();
        return isPlainObject(session.profile) ? session.profile : null;
      }

      function getBridge() {
        const session = loadPublicSession();
        return isPlainObject(session.bridge) ? session.bridge : null;
      }

      function getCompensation() {
        const session = loadPublicSession();
        return isPlainObject(session.compensation)
          ? session.compensation
          : null;
      }

      function getMortgage() {
        const session = loadPublicSession();
        return isPlainObject(session.mortgage) ? session.mortgage : null;
      }

      function getFinancialInputs() {
        const session = loadPublicSession();
        return isPlainObject(session.user_financial_inputs)
          ? session.user_financial_inputs
          : null;
      }

      function getFinancialIntake() {
        const session = loadPublicSession();
        return isPlainObject(session.financial_intake)
          ? session.financial_intake
          : null;
      }

      function getAIOUInputs() {
        const session = loadPublicSession();
        return isPlainObject(session.user_aiou_inputs)
          ? session.user_aiou_inputs
          : null;
      }

      function getDashboardSnapshot() {
        const session = loadPublicSession();
        return isPlainObject(session.fad) ? session.fad : null;
      }

      function getKPIOverrides() {
        const session = loadPublicSession();
        return isPlainObject(session.kpi_overrides)
          ? session.kpi_overrides
          : null;
      }

      function getPtCalculatorContext() {
        const live = readCurrentPtGlobals();
        if (live) {
          setLatestPtCalculatorData(live, "window.PCSU_PT_*");
          return clonePtSnapshot(latestPtCalculatorData);
        }

        if (isPlainObject(latestPtCalculatorData)) {
          return clonePtSnapshot(latestPtCalculatorData);
        }

        const legacy = readLegacyPtCalculatorData();
        if (legacy) {
          setLatestPtCalculatorData(legacy, "window.PCSUnitedPTCalculator");
          return clonePtSnapshot(latestPtCalculatorData);
        }

        return null;
      }

      function getPCSContext() {
        syncLiveRuntimeContext();

        const session = loadPublicSession();
        const pt = getPtCalculatorContext();

        return stripEmptyObject({
          resources_session_id: session.id || undefined,
          profile: getProfile() || undefined,
          bridge: getBridge() || undefined,
          compensation: getCompensation() || undefined,
          mortgage: getMortgage() || undefined,
          pt: pt || undefined,
          financial_intake: getFinancialIntake() || undefined,
          user_financial_inputs:
            getFinancialInputs() || undefined,
          user_aiou_inputs:
            getAIOUInputs() || undefined,
          fad: getDashboardSnapshot() || undefined,
          kpi_overrides:
            getKPIOverrides() || undefined,
          basicbrain: isPlainObject(session.basicbrain)
            ? session.basicbrain
            : undefined
        });
      }

      /* ========================================================
         7. HUD OPEN / CLOSE
      ======================================================== */

      function openAmy() {
        hud.setAttribute("data-open", "1");
        hud.setAttribute("aria-modal", "true");

        setTimeout(() => {
          inputEl.focus();
          scrollToBottom();
        }, 80);
      }

      function closeAmy() {
        hud.setAttribute("data-open", "0");
        hud.setAttribute("aria-modal", "false");
      }

      function isOpen() {
        return hud.getAttribute("data-open") === "1";
      }

      document.addEventListener("click", (event) => {
        const trigger =
          event.target && event.target.closest
            ? event.target.closest(
                "#pcsu-ask-amy-sidebar .pcsu-amy-card, " +
                "[data-pcsu-open-amy='1']"
              )
            : null;

        if (!trigger) return;

        event.preventDefault();

        if (isOpen()) {
          closeAmy();
        } else {
          openAmy();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen()) {
          closeAmy();
        }
      });

      document.addEventListener(
        "pointerdown",
        (event) => {
          if (!isOpen()) return;

          const trigger =
            event.target && event.target.closest
              ? event.target.closest(
                  "#pcsu-ask-amy-sidebar .pcsu-amy-card, " +
                  "[data-pcsu-open-amy='1']"
                )
              : null;

          if (trigger) return;
          if (panel.contains(event.target)) return;

          closeAmy();
        },
        true
      );

      closeBtn.addEventListener("click", closeAmy);

      /* ========================================================
         8. MESSAGE RENDERING
      ======================================================== */

      function scrollToBottom() {
        chatEl.scrollTop = chatEl.scrollHeight;
      }

      function timeStamp(role) {
        const date = new Date();
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");

        return (
          (role === "user" ? "You" : "Amy") +
          " • " +
          hh +
          ":" +
          mm
        );
      }

      function prefersReducedMotion() {
        return Boolean(
          window.matchMedia &&
          window
            .matchMedia("(prefers-reduced-motion: reduce)")
            .matches
        );
      }

      function typewriterInto(
        element,
        text,
        speed = 18,
        delay = 80
      ) {
        return new Promise((resolve) => {
          element.textContent = "";

          const caret = document.createElement("span");
          caret.className = "tw-caret";
          element.appendChild(caret);

          let index = 0;
          const cleanText = String(text || "");

          const tick = () => {
            if (index < cleanText.length) {
              caret.insertAdjacentText(
                "beforebegin",
                cleanText.charAt(index)
              );

              index += 1;
              scrollToBottom();

              window.setTimeout(tick, speed);
              return;
            }

            caret.remove();
            resolve();
          };

          window.setTimeout(tick, delay);
        });
      }

      async function pushMsg(
        role,
        content,
        options = {}
      ) {
        const cleanRole =
          role === "user" ? "user" : "assistant";

        const cleanContent = safeString(content);

        if (!cleanContent) return;

        const message = document.createElement("div");

        message.className =
          "pcsu-amy-msg " +
          (cleanRole === "user"
            ? "pcsu-amy-user"
            : "pcsu-amy-bot") +
          (options.error ? " pcsu-amy-error" : "");

        const body = document.createElement("span");
        message.appendChild(body);

        const meta = document.createElement("small");
        meta.textContent = timeStamp(cleanRole);

        chatEl.appendChild(message);
        message.appendChild(meta);

        scrollToBottom();

        if (options.save !== false) {
          addToThread(cleanRole, cleanContent);
        }

        if (
          options.typewriter &&
          !prefersReducedMotion() &&
          cleanRole !== "user"
        ) {
          await typewriterInto(
            body,
            cleanContent,
            Number(options.speed || 18),
            Number(options.delay || 80)
          );
        } else {
          body.textContent = cleanContent;
        }

        scrollToBottom();
      }

      function showTyping() {
        hideTyping();

        const typing = document.createElement("div");

        typing.className =
          "pcsu-amy-msg pcsu-amy-bot pcsu-amy-typing";

        typing.id = "pcsu-amy-typing";

        typing.textContent =
          "Amy is reviewing your PCSUnited context…";

        chatEl.appendChild(typing);
        scrollToBottom();
      }

      function hideTyping() {
        const typing = root.querySelector("#pcsu-amy-typing");

        if (typing) typing.remove();
      }

      function renderThread() {
        const thread = loadThread();

        if (!thread.length) return;

        thread
          .slice(-MAX_RENDERED_MESSAGES)
          .forEach((item) => {
            const role =
              item.role === "assistant"
                ? "assistant"
                : "user";

            const message = document.createElement("div");

            message.className =
              "pcsu-amy-msg " +
              (role === "user"
                ? "pcsu-amy-user"
                : "pcsu-amy-bot");

            const body = document.createElement("span");
            body.textContent = safeString(item.content);

            const meta = document.createElement("small");
            meta.textContent =
              role === "user" ? "You" : "Amy";

            message.appendChild(body);
            message.appendChild(meta);
            chatEl.appendChild(message);
          });

        scrollToBottom();
      }

      /* ========================================================
         9. API REQUEST

         Public Amy never authenticates members and must not send
         Supabase identity, session, or Authorization headers.
      ======================================================== */

      async function postJSON(url, body) {
        const controller = new AbortController();

        const timeoutId = window.setTimeout(() => {
          controller.abort();
        }, REQUEST_TIMEOUT_MS);

        try {
          const headers = {
            "Content-Type": "application/json"
          };

          const response = await fetch(url, {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            headers,
            body: JSON.stringify(body || {}),
            signal: controller.signal
          });

          const text = await response.text();

          let data = {};

          try {
            data = JSON.parse(text || "{}");
          } catch (_) {
            data = {
              raw: text
            };
          }

          if (!response.ok || data.ok === false) {
            const error = new Error(
              data.error ||
              data.message ||
              "HTTP " + response.status
            );

            error.status = response.status;
            error.payload = data;

            throw error;
          }

          return data;
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      /* ========================================================
         10. PAYLOAD CONTRACT

         The HUD supplies structured PCSUnited context from the
         current Resources page session only.

         agent-amy-public.js should:
         - validate and normalize it;
         - use shared engines for missing calculations;
         - preserve deterministic outputs;
         - use OpenAI only to explain and guide.
      ======================================================== */

      function buildPayload(message) {
        const pcsContext = getPCSContext();
        const thread = loadThread();
        const memory = loadMemory();
        const currentPtSnapshot = getPtCalculatorContext();

        return stripEmptyObject({
          message,

          pt: currentPtSnapshot || undefined,

          context: {
            source: "web",
            widget: "pcsunited-ask-amy-hud",
            product: "pcsunited",
            version: "pcsu-ask-amy-hud-v1.3.0",
            response_contract: "ask-amy-response-v1",

            page: {
              href: window.location.href,
              path: window.location.pathname,
              origin: window.location.origin,
              title: document.title || ""
            },

            conversation_id: getCID(),

            thread: thread.slice(-12),

            memory,

            profile:
              pcsContext.profile || undefined,

            bridge:
              pcsContext.bridge || undefined,

            compensation:
              pcsContext.compensation || undefined,

            mortgage:
              pcsContext.mortgage || undefined,

            pt:
              currentPtSnapshot || pcsContext.pt || undefined,

            financial_intake:
              pcsContext.financial_intake || undefined,

            user_financial_inputs:
              pcsContext.user_financial_inputs || undefined,

            user_aiou_inputs:
              pcsContext.user_aiou_inputs || undefined,

            fad:
              pcsContext.fad || undefined,

            kpi_overrides:
              pcsContext.kpi_overrides || undefined,

            basicbrain:
              pcsContext.basicbrain || undefined,

            resources_session_id:
              pcsContext.resources_session_id || undefined,

            response_limits: {
              max_chars: 720,
              greeting_max_chars: 220,
              max_follow_up_questions: 1
            },

            role: "pcsu_public_resources_helper",

            requested_mode: "public_resources_guidance",

            styleGuide: {
              rules: [
                "Answer in clear, short paragraphs.",
                "Focus on PCS, military compensation, BAH, housing, mortgages, VA loans, financial readiness, and practical next steps.",
                "Use only the current Resources-page session calculations as the source of truth.",
                "Do not invent official rates, benefits, approvals, or member information.",
                "Do not recalculate a result when a valid structured PCSUnited result is already provided.",
                "If required information is missing, say that no current Resources scenario has been loaded and ask one focused follow-up question.",
                "Clearly distinguish estimates from verified official data.",
                "Do not claim mortgage approval, VA eligibility approval, or guaranteed benefits.",
                "For financial topics, explain that results are planning guidance and not financial advice."
              ]
            }
          }
        });
      }

      /* ========================================================
         11. RESPONSE HANDLING
      ======================================================== */

      function getReplyFromResponse(data) {
        const candidates = [
          data?.reply,
          data?.answer?.summary,
          data?.answer?.bluf,
          data?.message
        ];

        for (const candidate of candidates) {
          const value = safeString(candidate);

          if (value) return value;
        }

        return (
          "I’m here. Tell me which PCSUnited result " +
          "or PCS decision you want to work through."
        );
      }

      async function callAmy(userText) {
        sendBtn.disabled = true;
        inputEl.disabled = true;

        showTyping();

        try {
          const payload = buildPayload(userText);
          const data = await postJSON(endpoint, payload);

          hideTyping();

          if (
            data.memory_patch &&
            isPlainObject(data.memory_patch)
          ) {
            applyMemoryPatch(data.memory_patch);
          }

          if (
            data.memory_echo &&
            isPlainObject(data.memory_echo)
          ) {
            saveMemory(data.memory_echo);
          }

          const reply = getReplyFromResponse(data);
          const ui = isPlainObject(data.ui) ? data.ui : {};

          await pushMsg("assistant", reply, {
            typewriter: true,
            speed: Number(ui.speed || 18),
            delay: Number(ui.startDelay || 80)
          });
        } catch (error) {
          hideTyping();

          const aborted =
            error &&
            (error.name === "AbortError" ||
              String(error.message || "")
                .toLowerCase()
                .includes("abort"));

          const message = aborted
            ? "The request took too long to complete. Please try again."
            : "I hit a connection snag while reaching TheWing. Please try again in a moment.";

          await pushMsg("assistant", message, {
            typewriter: true,
            speed: 18,
            delay: 60,
            error: true
          });

          console.warn(
            "PCSUnited Ask Amy request failed:",
            {
              status: error?.status || null,
              message: error?.message || "Request failed"
            }
          );
        } finally {
          sendBtn.disabled = false;
          inputEl.disabled = false;
          inputEl.focus();
        }
      }

      /* ========================================================
         12. SEND / RESET
      ======================================================== */

      function clearConversationState() {
        ssDel(KEY_THREAD);
        ssDel(KEY_MEMORY);
        ssDel(KEY_CID);

        // Migration cleanup: never leave conversation history
        // in localStorage for Public Amy.
        lsDel(KEY_THREAD);
        lsDel(KEY_MEMORY);
        lsDel(KEY_CID);

        window.__PCSU_AMY_THREAD = [];
        window.__PCSU_AMY_MEMORY = {};
        window.__PCSU_AMY_CID = "";

        // Preserve the Amy Brief mount node inside the shared transcript.
        Array.from(chatEl.children).forEach((child) => {
          if (child !== briefContainer) {
            child.remove();
          }
        });
        inputEl.value = "";
      }

      function startFreshPublicSession(options = {}) {
        clearConversationState();

        const session = emptyPublicSession();
        savePublicSession(session);

        // Drop stale previous-visit BasicBrain handoffs without
        // importing them into this fresh Resources page session.
        if (options.importHandoff !== true) {
          lsDel(KEY_BASICBRAIN_HANDOFF);
        }

        return session;
      }

      function resetAmy() {
        cancelPendingMortgageActivation();
        latestMortgageBriefData = null;
        mortgageBriefActivated = false;
        hideAllBriefs();
        startFreshPublicSession();

        pushMsg(
          "assistant",
          "Done. Amy’s conversation memory was cleared for this Resources page session.",
          {
            typewriter: true,
            speed: 18,
            delay: 60
          }
        );
      }

      async function send() {
        const text = safeString(inputEl.value);

        if (!text || sendBtn.disabled) return;

        if (text.toLowerCase() === "/reset") {
          resetAmy();
          return;
        }

        await pushMsg("user", text);

        inputEl.value = "";

        await callAmy(text);
      }

      sendBtn.addEventListener("click", send);

      inputEl.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          send();
        }
      });

      /* ========================================================
         13. INITIALIZATION
      ======================================================== */

      bindResourcesContextListeners();
      bindPtCalculatorListeners();

      // Fresh conversation each page load. Optionally import a current-page
      // BasicBrain handoff, then sync live runtime context into the session.
      startFreshPublicSession({
        importHandoff: true
      });
      absorbBasicBrainHandoff();
      syncLiveRuntimeContext();

      const initialBriefRendered = refreshActiveBrief({
        open: false
      });

      renderThread();

      pushMsg(
        "assistant",
        initialBriefRendered
          ? "I’ve reviewed the compensation package shown above. Ask me what it means for housing, affordability, or your next PCS decision."
          : "Hi, I’m Amy. TheWing gives me access to PCSUnited’s military compensation, housing, mortgage, VA loan, and readiness tools. What would you like to work through?",
        {
          typewriter: true,
          speed: 18,
          delay: 140
        }
      );

      /* ========================================================
         14. PUBLIC API
      ======================================================== */

      window.PCSUnitedAskAmy =
        window.PCSUnitedAskAmy || {};

      window.PCSUnitedAskAmy.open = openAmy;
      window.PCSUnitedAskAmy.close = closeAmy;

      window.PCSUnitedAskAmy.toggle = () => {
        if (isOpen()) {
          closeAmy();
        } else {
          openAmy();
        }
      };

      window.PCSUnitedAskAmy.reset = resetAmy;

      window.PCSUnitedAskAmy.ask = async (message) => {
        const text = safeString(message);

        if (!text) return false;

        openAmy();
        await pushMsg("user", text);
        await callAmy(text);

        return true;
      };

      window.PCSUnitedAskAmy.getEndpoint = () => endpoint;
      window.PCSUnitedAskAmy.getThread = () => loadThread();
      window.PCSUnitedAskAmy.getMemory = () => loadMemory();
      window.PCSUnitedAskAmy.getContext = () => getPCSContext();
      window.PCSUnitedAskAmy.getPublicSession = () =>
        loadPublicSession();
      window.PCSUnitedAskAmy.showBrief = showAmyBrief;
      window.PCSUnitedAskAmy.hideBrief = hideAmyBrief;
      window.PCSUnitedAskAmy.refreshBrief = refreshActiveBrief;
      window.PCSUnitedAskAmy.getActiveBriefType = () => activeBriefType;
})();
