(() => {
  "use strict";

  /* ============================================================
     PCSUnited • Amy Brief
     Phase 2 • Compensation presentation

     Amy Brief is NOT chat.
     Amy Brief is NOT BasicBrain.
     Amy Brief is NOT a calculator.

     It only paints a normalized brief object that already exists.
     ============================================================ */

  if (window.__PCSU_AMY_BRIEF_V110) return;
  window.__PCSU_AMY_BRIEF_V110 = true;

  const VERSION = "1.1.0-compensation";
  const STYLE_ID = "pcsu-amy-brief-styles-v110";
  const ROOT_ID = "pcsu-amy-brief-root";
  const AMY_AVATAR_URL =
    "https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/6a3334f99ed5987c434df57f_Face.jpg";

  const DEFAULT_COMP_ACTIONS = [
    "Base Demographics",
    "Mortgage Calculator",
    "Housing Quiz",
    "Financial Analysis"
  ];

  const DEFAULT_COMP_DISCLAIMER =
    "PCSUnited and TheWing provide planning estimates and educational guidance. " +
    "Results are not lending approval and do not replace official finance, legal, tax, or benefits guidance.";

  let mountedContainer = null;
  let rootEl = null;
  let currentData = null;

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

  function pickFirstString(...values) {
    for (const value of values) {
      const text = safeString(value);
      if (text) return text;
    }
    return "";
  }

  function readProvidedAmount(...values) {
    for (const value of values) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (typeof value === "number") {
        if (!Number.isFinite(value) || value === 0) continue;
        return value;
      }

      const text = safeString(value).replace(/[$,\s]/g, "");
      if (!text) continue;

      const num = Number(text);
      if (!Number.isFinite(num) || num === 0) continue;
      return num;
    }

    return null;
  }

  function formatMoney(amount) {
    if (amount === null || amount === undefined) return "";

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(amount);
    } catch (_) {
      return "$" + String(Math.round(Number(amount)));
    }
  }

  function escapeHtml(value) {
    return safeString(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #pcsu-amy-brief-root,
      #pcsu-amy-brief-root * {
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

      #pcsu-amy-brief-root {
        --pcsu-brief-ink: #f4efe4;
        --pcsu-brief-muted: rgba(244, 239, 228, 0.62);
        --pcsu-brief-muted-strong: rgba(244, 239, 228, 0.76);
        --pcsu-brief-gold: #e7b553;
        --pcsu-brief-gold2: #f4d58a;
        --pcsu-brief-line: rgba(231, 181, 83, 0.34);
        --pcsu-brief-line-soft: rgba(255, 255, 255, 0.1);
        --pcsu-brief-panel: rgba(0, 0, 0, 0.22);
        display: block;
        width: 100%;
        padding: 14px 16px 4px;
      }

      #pcsu-amy-brief-root[data-empty="1"] {
        display: none;
      }

      .pcsu-amy-brief-card {
        border: 1px solid var(--pcsu-brief-line-soft);
        border-left: 2px solid var(--pcsu-brief-gold);
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04),
            rgba(0, 0, 0, 0.12)
          ),
          var(--pcsu-brief-panel);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        border-radius: 3px;
        overflow: hidden;
      }

      .pcsu-amy-brief-greeting-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 14px 12px;
        border-bottom: 1px solid var(--pcsu-brief-line-soft);
      }

      .pcsu-amy-brief-avatar {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
        border-radius: 999px;
        background-size: cover;
        background-position: center;
        border: 1px solid rgba(231, 181, 83, 0.6);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.35),
          0 0 20px rgba(231, 181, 83, 0.14);
      }

      .pcsu-amy-brief-greeting-copy {
        min-width: 0;
        flex: 1 1 auto;
      }

      .pcsu-amy-brief-greeting-title {
        margin: 0;
        color: var(--pcsu-brief-ink);
        font-size: 15px;
        font-weight: 900;
        line-height: 1.25;
      }

      .pcsu-amy-brief-greeting-subtitle {
        margin: 6px 0 0;
        color: var(--pcsu-brief-muted-strong);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.4;
      }

      .pcsu-amy-brief-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--pcsu-brief-line-soft);
      }

      .pcsu-amy-brief-section:last-child {
        border-bottom: 0;
      }

      .pcsu-amy-brief-label {
        margin: 0 0 8px;
        color: var(--pcsu-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-brief-comp-rows {
        display: grid;
        gap: 8px;
      }

      .pcsu-amy-brief-comp-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .pcsu-amy-brief-comp-row.is-total {
        padding-top: 8px;
        border-top: 1px solid var(--pcsu-brief-line-soft);
      }

      .pcsu-amy-brief-comp-name {
        color: var(--pcsu-brief-muted-strong);
        font-size: 12px;
        font-weight: 800;
      }

      .pcsu-amy-brief-comp-value {
        color: var(--pcsu-brief-ink);
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      .pcsu-amy-brief-comp-row.is-total .pcsu-amy-brief-comp-name,
      .pcsu-amy-brief-comp-row.is-total .pcsu-amy-brief-comp-value {
        color: var(--pcsu-brief-gold2);
      }

      .pcsu-amy-brief-actions {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .pcsu-amy-brief-action {
        display: block;
        padding: 10px 11px;
        border: 1px solid var(--pcsu-brief-line-soft);
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.03);
        color: var(--pcsu-brief-ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.3;
      }

      .pcsu-amy-brief-disclaimer {
        color: var(--pcsu-brief-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.45;
        margin: 0;
      }

      .pcsu-amy-brief-empty {
        padding: 14px;
        color: var(--pcsu-brief-muted-strong);
        font-size: 12px;
        font-weight: 700;
      }
    `;

    document.head.appendChild(style);
  }

  function buildShell() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-empty", "1");
    root.setAttribute("data-version", VERSION);
    root.setAttribute("aria-label", "Amy Brief");
    root.innerHTML = `<div class="pcsu-amy-brief-card" data-pcsu-brief-card></div>`;
    return root;
  }

  function getCard() {
    return rootEl
      ? rootEl.querySelector("[data-pcsu-brief-card]")
      : null;
  }

  function setCardHtml(html) {
    const card = getCard();
    if (!card) return null;
    card.innerHTML = html;
    rootEl.setAttribute("data-empty", "0");
    return rootEl;
  }

  function actionLabel(item) {
    if (typeof item === "string") return safeString(item);
    if (!isPlainObject(item)) return "";
    return pickFirstString(item.label, item.title, item.text, item.name);
  }

  function renderActionList(actions) {
    const labels = (Array.isArray(actions) ? actions : [])
      .map(actionLabel)
      .filter(Boolean);

    const finalLabels = labels.length ? labels : DEFAULT_COMP_ACTIONS;

    return (
      '<ul class="pcsu-amy-brief-actions">' +
      finalLabels
        .map(
          (label) =>
            '<li class="pcsu-amy-brief-action">' +
            escapeHtml(label) +
            "</li>"
        )
        .join("") +
      "</ul>"
    );
  }

  function renderCompensationRows(compensation) {
    const packet = isPlainObject(compensation) ? compensation : {};
    const monthly = isPlainObject(packet.monthly) ? packet.monthly : {};

    const rows = [
      {
        key: "basePay",
        label: "Base Pay",
        amount: readProvidedAmount(
          packet.basePay,
          packet.base_pay,
          packet.basicPay,
          packet.basic_pay,
          monthly.basePay,
          monthly.base_pay
        )
      },
      {
        key: "bah",
        label: "BAH",
        amount: readProvidedAmount(
          packet.bah,
          packet.BAH,
          monthly.bah,
          monthly.BAH
        )
      },
      {
        key: "bas",
        label: "BAS",
        amount: readProvidedAmount(
          packet.bas,
          packet.BAS,
          monthly.bas,
          monthly.BAS
        )
      },
      {
        key: "total",
        label: "Total Monthly Compensation",
        amount: readProvidedAmount(
          packet.totalMonthlyCompensation,
          packet.total_monthly_compensation,
          packet.total,
          packet.totalPay,
          monthly.total,
          monthly.totalMonthlyCompensation
        ),
        isTotal: true
      }
    ].filter((row) => row.amount !== null);

    if (!rows.length) {
      return '<p class="pcsu-amy-brief-empty">No compensation values were provided for this brief.</p>';
    }

    return (
      '<div class="pcsu-amy-brief-comp-rows">' +
      rows
        .map((row) => {
          return (
            '<div class="pcsu-amy-brief-comp-row' +
            (row.isTotal ? " is-total" : "") +
            '">' +
            '<span class="pcsu-amy-brief-comp-name">' +
            escapeHtml(row.label) +
            "</span>" +
            '<span class="pcsu-amy-brief-comp-value">' +
            escapeHtml(formatMoney(row.amount)) +
            "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function resolveRankTitle(profile) {
    const packet = isPlainObject(profile) ? profile : {};
    return pickFirstString(
      packet.rankTitle,
      packet.rank_title,
      packet.title,
      packet.rankDisplay,
      packet.rank_display,
      packet.rankName,
      packet.rank_name,
      packet.rank
    );
  }

  function renderCompensation(data) {
    if (!rootEl) return null;

    const brief = isPlainObject(data) ? data : {};
    const profile = isPlainObject(brief.profile) ? brief.profile : {};
    const compensation = isPlainObject(brief.compensation)
      ? brief.compensation
      : {};
    const rankTitle = resolveRankTitle(profile);

    const greetingTitle = rankTitle
      ? "Hello " + rankTitle + "!"
      : "Hello!";

    const greetingSubtitle =
      "I've reviewed your current PCSUnited compensation package.";

    const disclaimer =
      safeString(brief.disclaimer) || DEFAULT_COMP_DISCLAIMER;

    const html =
      '<div class="pcsu-amy-brief-greeting-row">' +
      '<div class="pcsu-amy-brief-avatar" style="background-image:url(\'' +
      AMY_AVATAR_URL +
      '\')" aria-hidden="true"></div>' +
      '<div class="pcsu-amy-brief-greeting-copy">' +
      '<p class="pcsu-amy-brief-greeting-title">' +
      escapeHtml(greetingTitle) +
      "</p>" +
      '<p class="pcsu-amy-brief-greeting-subtitle">' +
      escapeHtml(greetingSubtitle) +
      "</p>" +
      "</div>" +
      "</div>" +
      '<section class="pcsu-amy-brief-section">' +
      '<h3 class="pcsu-amy-brief-label">Current Monthly Compensation</h3>' +
      renderCompensationRows(compensation) +
      "</section>" +
      '<section class="pcsu-amy-brief-section">' +
      '<h3 class="pcsu-amy-brief-label">Recommended Next Steps</h3>' +
      renderActionList(brief.actions) +
      "</section>" +
      '<section class="pcsu-amy-brief-section">' +
      '<p class="pcsu-amy-brief-disclaimer">' +
      escapeHtml(disclaimer) +
      "</p>" +
      "</section>";

    return setCardHtml(html);
  }

  /* Future specialized renderers:
     renderMortgage()
     renderFinancial()
     renderHousing()
     renderBaseResearch()
  */

  function renderUnsupported(data) {
    const type = safeString(data && data.type) || "unknown";
    return setCardHtml(
      '<p class="pcsu-amy-brief-empty">Amy Brief type "' +
        escapeHtml(type) +
        '" is not supported yet.</p>'
    );
  }

  function initialize(container) {
    const host =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    if (!host || !(host instanceof Element)) {
      console.warn(
        "PCSUnited Amy Brief: initialize() requires a valid container element."
      );
      return null;
    }

    if (mountedContainer && mountedContainer !== host) {
      destroy();
    }

    ensureStyles();

    const existing = host.querySelector("#" + ROOT_ID);
    if (existing) {
      rootEl = existing;
      mountedContainer = host;
      currentData = null;
      rootEl.setAttribute("data-empty", "1");
      const card = getCard();
      if (card) card.innerHTML = "";
      return rootEl;
    }

    rootEl = buildShell();
    host.appendChild(rootEl);
    mountedContainer = host;
    currentData = null;

    return rootEl;
  }

  function render(data) {
    if (!rootEl) {
      console.warn(
        "PCSUnited Amy Brief: render() called before initialize()."
      );
      return null;
    }

    currentData = isPlainObject(data) ? data : null;

    if (!currentData) {
      rootEl.setAttribute("data-empty", "1");
      const card = getCard();
      if (card) card.innerHTML = "";
      return rootEl;
    }

    switch (safeString(currentData.type)) {
      case "compensation":
        return renderCompensation(currentData);
      default:
        return renderUnsupported(currentData);
    }
  }

  function update(data) {
    return render(data);
  }

  function clear() {
    currentData = null;

    if (!rootEl) return;

    const card = getCard();
    if (card) card.innerHTML = "";
    rootEl.setAttribute("data-empty", "1");
  }

  function destroy() {
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }

    rootEl = null;
    mountedContainer = null;
    currentData = null;
  }

  window.PCSUnitedAmyBrief = {
    version: VERSION,
    initialize,
    render,
    update,
    clear,
    destroy
  };
})();
