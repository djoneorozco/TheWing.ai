(() => {
  "use strict";

  /* ============================================================
     PCSUnited • Amy Mortgage Brief
     v1.0.0-mortgage • Browser presentation only

     Amy Mortgage Brief is NOT chat.
     Amy Mortgage Brief is NOT Amy Brain.
     Amy Mortgage Brief is NOT a mortgage calculator.

     TheWing calculates.
     Amy explains.
     The browser renders.

     This file only paints mortgage data that already exists.
     ============================================================ */

  if (window.__PCSU_AMY_MORTGAGE_BRIEF_V100) return;
  window.__PCSU_AMY_MORTGAGE_BRIEF_V100 = true;

  const VERSION = "1.0.0-mortgage";
  const STYLE_ID = "pcsu-amy-mortgage-brief-styles-v100";
  const ROOT_ID = "pcsu-amy-mortgage-brief-root";
  const AMY_AVATAR_URL =
    "https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/6a5e2a4f8a0acd7d99420c0d_1f19deddafa230e0f801d99434aad586_Bento%20Icon%205.png";

  const DEFAULT_MORTGAGE_ACTIONS = [
    "Review Affordability",
    "Compare Loan Types",
    "Financial Analysis"
  ];

  const DEFAULT_MORTGAGE_DISCLAIMER =
    "PCSUnited and TheWing provide planning estimates and educational guidance. " +
    "Results are not lending approval and do not replace lender, legal, tax, insurance, or benefits guidance.";

  const DEFAULT_TITLE = "Your Mortgage Scenario";
  const DEFAULT_SUBTITLE =
    "Here is the current housing-cost estimate from your PCSUnited mortgage scenario.";

  const VERIFIED_SOURCE_TOKENS = [
    "thewing_mortgage_api",
    "thewing",
    "mortgage-engine",
    "mortgage_engine",
    "amy-brain",
    "server",
    "truth_packet"
  ];

  const PRELIMINARY_SOURCE_TOKENS = [
    "local_fallback",
    "browser_fallback",
    "preliminary",
    "client_estimate"
  ];

  let mountedContainer = null;
  let rootEl = null;
  let currentData = null;
  let warnedMissingContainer = false;

  function safeString(value) {
    return String(value ?? "").trim();
  }

  function isPlainObject(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
    );
  }

  function pickFirstString(...values) {
    for (const value of values) {
      const text = safeString(value);
      if (text) return text;
    }
    return "";
  }

  function firstNumber(...values) {
    for (const value of values) {
      if (value === undefined || value === null || value === "") continue;

      if (typeof value === "number") {
        if (!Number.isFinite(value)) continue;
        return value;
      }

      const text = safeString(value)
        .replace(/[$,%\s,]/g, "")
        .replace(/[^\d.\-]/g, "");
      if (!text || text === "-" || text === "." || text === "-.") continue;

      const num = Number(text);
      if (!Number.isFinite(num)) continue;
      return num;
    }

    return null;
  }

  function formatMoney(amount) {
    if (amount === null || amount === undefined) return "";
    if (!Number.isFinite(Number(amount))) return "";

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(Number(amount));
    } catch (_) {
      return "$" + String(Math.round(Number(amount)));
    }
  }

  function formatPercent(value) {
    if (value === null || value === undefined) return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";

    // Accept either 0.25 or 25 as percent input; do not calculate ratios.
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    const rounded = Math.round(pct * 10) / 10;
    return Number.isInteger(rounded)
      ? String(rounded) + "%"
      : String(rounded) + "%";
  }

  function escapeHtml(value) {
    return safeString(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function stripEmpty(obj) {
    if (!isPlainObject(obj)) return obj;
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value) && !value.length) continue;
      out[key] = value;
    }
    return out;
  }

  function cloneNormalized(data) {
    if (!isPlainObject(data)) return null;
    const copy = { ...data };
    delete copy.raw;
    return copy;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #pcsu-amy-mortgage-brief-root,
      #pcsu-amy-mortgage-brief-root * {
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

      #pcsu-amy-mortgage-brief-root {
        --pcsu-mortgage-brief-ink: #f4efe4;
        --pcsu-mortgage-brief-muted: rgba(244, 239, 228, 0.62);
        --pcsu-mortgage-brief-muted-strong: rgba(244, 239, 228, 0.76);
        --pcsu-mortgage-brief-gold: #e7b553;
        --pcsu-mortgage-brief-gold2: #f4d58a;
        --pcsu-mortgage-brief-line: rgba(231, 181, 83, 0.34);
        --pcsu-mortgage-brief-line-soft: rgba(255, 255, 255, 0.1);
        --pcsu-mortgage-brief-panel: rgba(0, 0, 0, 0.22);
        display: block;
        width: 100%;
        padding: 14px 16px 4px;
      }

      #pcsu-amy-mortgage-brief-root[data-empty="1"] {
        display: none;
      }

      .pcsu-amy-mortgage-brief-card {
        border: 1px solid var(--pcsu-mortgage-brief-line-soft);
        border-left: 2px solid var(--pcsu-mortgage-brief-gold);
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04),
            rgba(0, 0, 0, 0.12)
          ),
          var(--pcsu-mortgage-brief-panel);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        border-radius: 3px;
        overflow: hidden;
      }

      .pcsu-amy-mortgage-brief-greeting-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 14px 12px;
        border-bottom: 1px solid var(--pcsu-mortgage-brief-line-soft);
      }

      .pcsu-amy-mortgage-brief-avatar {
        width: 120px;
        height: 120px;
        flex: 0 0 auto;
        border-radius: 999px;
        background-size: cover;
        background-position: center;
        border: 2px solid rgba(231, 181, 83, 0.6);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.35),
          0 0 20px rgba(231, 181, 83, 0.14);
      }

      .pcsu-amy-mortgage-brief-greeting-copy {
        min-width: 0;
        flex: 1 1 auto;
      }

      .pcsu-amy-mortgage-brief-greeting-title {
        margin: 0;
        color: var(--pcsu-mortgage-brief-ink);
        font-size: 15px;
        font-weight: 900;
        line-height: 1.25;
      }

      .pcsu-amy-mortgage-brief-greeting-subtitle {
        margin: 6px 0 0;
        color: var(--pcsu-mortgage-brief-muted-strong);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.4;
      }

      .pcsu-amy-mortgage-brief-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--pcsu-mortgage-brief-line-soft);
      }

      .pcsu-amy-mortgage-brief-section:last-child {
        border-bottom: 0;
      }

      .pcsu-amy-mortgage-brief-label {
        margin: 0 0 8px;
        color: var(--pcsu-mortgage-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-mortgage-brief-hero {
        display: grid;
        gap: 4px;
      }

      .pcsu-amy-mortgage-brief-hero-label {
        margin: 0;
        color: var(--pcsu-mortgage-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-mortgage-brief-hero-value {
        margin: 0;
        color: var(--pcsu-mortgage-brief-gold2);
        font-size: 28px;
        font-weight: 900;
        line-height: 1.15;
        letter-spacing: -0.02em;
      }

      .pcsu-amy-mortgage-brief-hero-unit {
        color: var(--pcsu-mortgage-brief-muted-strong);
        font-size: 13px;
        font-weight: 800;
      }

      .pcsu-amy-mortgage-brief-rows {
        display: grid;
        gap: 8px;
      }

      .pcsu-amy-mortgage-brief-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .pcsu-amy-mortgage-brief-row.is-total {
        padding-top: 8px;
        border-top: 1px solid var(--pcsu-mortgage-brief-line-soft);
      }

      .pcsu-amy-mortgage-brief-row-name {
        color: var(--pcsu-mortgage-brief-muted-strong);
        font-size: 12px;
        font-weight: 800;
      }

      .pcsu-amy-mortgage-brief-row-value {
        color: var(--pcsu-mortgage-brief-ink);
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      .pcsu-amy-mortgage-brief-row.is-total .pcsu-amy-mortgage-brief-row-name,
      .pcsu-amy-mortgage-brief-row.is-total .pcsu-amy-mortgage-brief-row-value {
        color: var(--pcsu-mortgage-brief-gold2);
      }

      .pcsu-amy-mortgage-brief-source {
        margin: 0;
        color: var(--pcsu-mortgage-brief-muted-strong);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.4;
      }

      .pcsu-amy-mortgage-brief-source[data-state="verified"] {
        color: var(--pcsu-mortgage-brief-gold2);
      }

      .pcsu-amy-mortgage-brief-source[data-state="preliminary"] {
        color: rgba(244, 213, 138, 0.9);
      }

      .pcsu-amy-mortgage-brief-actions {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .pcsu-amy-mortgage-brief-action {
        display: block;
        padding: 10px 11px;
        border: 1px solid var(--pcsu-mortgage-brief-line-soft);
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.03);
        color: var(--pcsu-mortgage-brief-ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.3;
      }

      .pcsu-amy-mortgage-brief-disclaimer {
        color: var(--pcsu-mortgage-brief-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.45;
        margin: 0;
      }

      @media (max-width: 420px) {
        .pcsu-amy-mortgage-brief-avatar {
          width: 84px;
          height: 84px;
        }

        .pcsu-amy-mortgage-brief-hero-value {
          font-size: 24px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildShell() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-empty", "1");
    root.setAttribute("data-version", VERSION);
    root.setAttribute("aria-label", "Amy Mortgage Brief");
    root.innerHTML =
      '<div class="pcsu-amy-mortgage-brief-card" data-pcsu-mortgage-brief-card></div>';
    return root;
  }

  function getCard() {
    return rootEl
      ? rootEl.querySelector("[data-pcsu-mortgage-brief-card]")
      : null;
  }

  function setEmptyState() {
    if (!rootEl) return rootEl;
    const card = getCard();
    if (card) card.innerHTML = "";
    rootEl.setAttribute("data-empty", "1");
    return rootEl;
  }

  function setCardHtml(html) {
    const card = getCard();
    if (!card || !rootEl) return null;
    card.innerHTML = html;
    rootEl.setAttribute("data-empty", "0");
    return rootEl;
  }

  function packetHasMortgageSignal(obj) {
    if (!isPlainObject(obj)) return false;
    const monthly = isPlainObject(obj.monthly) ? obj.monthly : {};
    const summary = isPlainObject(obj.summary) ? obj.summary : {};
    return (
      firstNumber(
        obj.totalMonthlyHousingCost,
        obj.total_monthly_housing_cost,
        obj.estimatedPayment,
        obj.all_in_monthly,
        obj.allInMonthly,
        obj.all_in,
        obj.allIn,
        obj.projected_mortgage_amount,
        obj.projectedMortgageAmount,
        monthly.total_payment,
        monthly.totalPayment,
        monthly.totalMonthly,
        monthly.allIn,
        monthly.all_in,
        monthly.monthlyPayment,
        summary.monthlyPayment,
        summary.monthly_payment,
        summary.payment
      ) !== null
    );
  }

  function unwrapMortgageCandidate(raw) {
    if (!isPlainObject(raw)) return {};

    // Prefer nested mortgage-shaped packets over the wrapper object itself.
    const nestedCandidates = [
      raw.mortgage,
      raw.mortgageApiResult,
      raw.result,
      raw.payload,
      raw.data,
      isPlainObject(raw.truth_packet) ? raw.truth_packet.mortgage : null,
      isPlainObject(raw.truthPacket) ? raw.truthPacket.mortgage : null,
      isPlainObject(raw.truth) ? raw.truth.mortgage : null
    ];

    for (const candidate of nestedCandidates) {
      if (packetHasMortgageSignal(candidate)) {
        return candidate;
      }
    }

    for (const candidate of nestedCandidates) {
      if (isPlainObject(candidate) && Object.keys(candidate).length) {
        return candidate;
      }
    }

    return raw;
  }

  function normalizeLoanType(value) {
    const raw = safeString(value).toLowerCase();
    if (!raw) return "";
    if (raw === "va" || raw === "va loan" || raw === "va_loan") return "VA Loan";
    if (raw === "fha" || raw === "fha loan" || raw === "fha_loan") return "FHA";
    if (
      raw === "conventional" ||
      raw === "conv" ||
      raw === "conventional loan"
    ) {
      return "Conventional";
    }
    if (raw === "usda" || raw === "usda loan") return "USDA";
    return safeString(value);
  }

  function classifySource(source, provenance) {
    const src = safeString(source).toLowerCase();
    const prov = isPlainObject(provenance) ? provenance : {};
    const sourceType = safeString(prov.source_type || prov.sourceType).toLowerCase();

    const verifiedByToken = VERIFIED_SOURCE_TOKENS.some(
      (token) => src === token || src.includes(token)
    );
    const verifiedByProvenance =
      prov.newly_calculated === true ||
      prov.newlyCalculated === true ||
      sourceType === "engine";

    const preliminaryByToken = PRELIMINARY_SOURCE_TOKENS.some(
      (token) => src === token || src.includes(token)
    );

    if (verifiedByToken || verifiedByProvenance) {
      return {
        verified: true,
        preliminary: false,
        sourceLabel: "Calculated with TheWing mortgage engine"
      };
    }

    if (preliminaryByToken) {
      return {
        verified: false,
        preliminary: true,
        sourceLabel: "Preliminary estimate — awaiting TheWing verification"
      };
    }

    if (src) {
      return {
        verified: false,
        preliminary: false,
        sourceLabel: "Current PCSUnited mortgage estimate"
      };
    }

    return {
      verified: false,
      preliminary: false,
      sourceLabel: "Mortgage estimate is not available yet"
    };
  }

  function actionLabel(item) {
    if (typeof item === "string") return safeString(item);
    if (!isPlainObject(item)) return "";
    return pickFirstString(item.label, item.title, item.text, item.name);
  }

  function normalizeActions(actions) {
    const labels = (Array.isArray(actions) ? actions : [])
      .map(actionLabel)
      .filter(Boolean);
    return labels.length ? labels : DEFAULT_MORTGAGE_ACTIONS.slice();
  }

  function normalizeMortgageBrief(rawInput) {
    const root = isPlainObject(rawInput) ? rawInput : {};
    const mortgage = unwrapMortgageCandidate(root);
    const monthly = isPlainObject(mortgage.monthly)
      ? mortgage.monthly
      : isPlainObject(root.monthly)
        ? root.monthly
        : {};
    const summary = isPlainObject(mortgage.summary)
      ? mortgage.summary
      : isPlainObject(root.summary)
        ? root.summary
        : {};
    const breakdown = isPlainObject(mortgage.breakdown)
      ? mortgage.breakdown
      : isPlainObject(root.breakdown)
        ? root.breakdown
        : {};
    const mortgageNested = isPlainObject(mortgage.mortgage)
      ? mortgage.mortgage
      : {};
    const provenance = isPlainObject(mortgage.provenance)
      ? mortgage.provenance
      : isPlainObject(root.provenance)
        ? root.provenance
        : null;

    const totalMonthlyHousingCost = firstNumber(
      root.totalMonthlyHousingCost,
      root.total_monthly_housing_cost,
      root.estimatedPayment,
      root.targetPayment,
      root.projected_mortgage_amount,
      root.projectedMortgageAmount,
      mortgage.totalMonthlyHousingCost,
      mortgage.total_monthly_housing_cost,
      mortgage.all_in_monthly,
      mortgage.allInMonthly,
      mortgage.all_in,
      mortgage.allIn,
      mortgage.estimatedPayment,
      monthly.total_payment,
      monthly.totalPayment,
      monthly.totalMonthly,
      monthly.allIn,
      monthly.all_in,
      monthly.monthlyPayment,
      summary.monthlyPayment,
      summary.monthly_payment,
      summary.payment
    );

    const principalInterest = firstNumber(
      root.principal_interest,
      root.principalInterest,
      mortgage.principal_interest,
      mortgage.principalInterest,
      monthly.principal_interest,
      monthly.principalInterest,
      monthly.pi,
      breakdown.pi,
      breakdown.principal_interest,
      breakdown.principalInterest
    );

    const taxes = firstNumber(
      root.taxes,
      root.tax,
      mortgage.taxes,
      mortgage.tax,
      monthly.tax,
      monthly.taxes,
      breakdown.tax,
      breakdown.taxes
    );

    const insurance = firstNumber(
      root.insurance,
      mortgage.insurance,
      monthly.insurance,
      breakdown.insurance
    );

    const mortgageInsurance = firstNumber(
      root.mortgageInsurance,
      root.mortgage_insurance,
      root.pmi,
      mortgage.mortgageInsurance,
      mortgage.pmi,
      monthly.pmi,
      breakdown.pmi
    );

    const hoa = firstNumber(
      root.hoa,
      mortgage.hoa,
      monthly.hoa,
      breakdown.hoa
    );

    const fundingFeeMonthlyEffect = firstNumber(
      root.fundingFeeMonthlyEffect,
      root.funding_fee_monthly_effect,
      root.vaFundingFeeMonthly,
      root.va_funding_fee_monthly,
      mortgage.fundingFeeMonthlyEffect,
      mortgage.funding_fee_monthly_effect,
      mortgage.vaFundingFeeMonthly,
      mortgage.va_funding_fee_monthly
    );

    const homePrice = firstNumber(
      root.homePrice,
      root.targetHomePrice,
      root.projectedHomePrice,
      root.projected_home_price,
      root.price,
      mortgage.homePrice,
      mortgage.price,
      mortgageNested.price,
      mortgageNested.homePrice
    );

    const downPayment = firstNumber(
      root.downPayment,
      root.downpayment,
      root.down_payment,
      mortgage.downPayment,
      mortgage.downpayment,
      mortgage.down_payment,
      mortgageNested.downPayment,
      mortgageNested.downpayment
    );

    const downPaymentPercent = firstNumber(
      root.downPaymentPercent,
      root.down_payment_percent,
      root.downPercent,
      mortgage.downPaymentPercent,
      mortgage.downPercent,
      mortgageNested.downPercent
    );

    const creditScore = firstNumber(
      root.creditScore,
      root.credit_score,
      mortgage.creditScore,
      mortgage.credit_score
    );

    const apr = firstNumber(
      root.apr,
      root.estimatedApr,
      root.estimated_apr,
      mortgage.apr,
      mortgageNested.apr
    );

    const loanAmount = firstNumber(
      root.loanAmount,
      root.loan_amount,
      mortgage.loanAmount,
      mortgage.loan_amount,
      mortgageNested.loanAmount,
      mortgageNested.loan_amount
    );

    const termYears = firstNumber(
      root.termYears,
      root.term_years,
      root.term,
      mortgage.termYears,
      mortgage.term_years,
      mortgageNested.termYears,
      mortgageNested.term_years
    );

    const totalIncome = firstNumber(
      root.totalIncome,
      root.basicIncome,
      root.total_income,
      mortgage.totalIncome,
      mortgage.basicIncome
    );

    const housingRatio = firstNumber(
      root.housingRatio,
      root.housing_ratio,
      mortgage.housingRatio,
      mortgage.housing_ratio
    );

    const suggestedLimit = firstNumber(
      root.suggestedLimit,
      root.suggested_limit,
      mortgage.suggestedLimit,
      mortgage.suggested_limit
    );

    const emergencyFund = firstNumber(
      root.emergencyFund,
      root.emergency_fund,
      mortgage.emergencyFund,
      mortgage.emergency_fund
    );

    const afterPayment = firstNumber(
      root.afterPayment,
      root.after_payment,
      root.remainingMonthlyIncome,
      root.remaining_monthly_income,
      mortgage.afterPayment,
      mortgage.after_payment
    );

    const monthlyDebt = firstNumber(
      root.monthlyDebt,
      root.monthly_debt,
      mortgage.monthlyDebt,
      mortgage.monthly_debt
    );

    const loanType = normalizeLoanType(
      pickFirstString(
        root.loanType,
        root.mortgageLoanType,
        root.loan_type,
        mortgage.loanType,
        mortgage.loan_type,
        mortgageNested.loanType
      )
    );

    const source = pickFirstString(
      root.mortgageEstimateSource,
      root.source,
      mortgage.mortgageEstimateSource,
      mortgage.source,
      provenance && provenance.source_type,
      provenance && provenance.module_id
    );

    const sourceState = classifySource(source, provenance);
    const hasMeaningfulTotal =
      totalMonthlyHousingCost !== null &&
      Number.isFinite(totalMonthlyHousingCost);

    if (!hasMeaningfulTotal) {
      return null;
    }

    const title = pickFirstString(root.title, mortgage.title) || DEFAULT_TITLE;
    const subtitle =
      pickFirstString(root.subtitle, mortgage.subtitle) || DEFAULT_SUBTITLE;
    const disclaimer =
      pickFirstString(root.disclaimer, mortgage.disclaimer) ||
      DEFAULT_MORTGAGE_DISCLAIMER;

    const actionsProvided =
      Array.isArray(root.actions) || Array.isArray(mortgage.actions);
    const actions = actionsProvided
      ? normalizeActions(root.actions || mortgage.actions)
      : DEFAULT_MORTGAGE_ACTIONS.slice();

    // When no source markers exist but a total is present, keep neutral copy.
    let sourceLabel = sourceState.sourceLabel;
    let verified = sourceState.verified;
    let preliminary = sourceState.preliminary;
    if (!source && !provenance) {
      sourceLabel = "Current PCSUnited mortgage estimate";
      verified = false;
      preliminary = false;
    }

    return stripEmpty({
      type: "mortgage",
      title,
      subtitle,
      loanType: loanType || null,
      homePrice,
      downPayment,
      downPaymentPercent,
      creditScore,
      apr,
      loanAmount,
      termYears,
      principalInterest,
      taxes,
      insurance,
      mortgageInsurance,
      hoa,
      fundingFeeMonthlyEffect,
      totalMonthlyHousingCost,
      totalIncome,
      housingRatio,
      suggestedLimit,
      emergencyFund,
      afterPayment,
      monthlyDebt,
      source: source || null,
      sourceLabel,
      verified,
      preliminary,
      disclaimer,
      actions,
      raw: root
    });
  }

  function renderMoneyRow(label, amount, options = {}) {
    if (amount === null || amount === undefined) return "";
    if (!Number.isFinite(Number(amount))) return "";
    const money = formatMoney(amount);
    if (!money) return "";

    return (
      '<div class="pcsu-amy-mortgage-brief-row' +
      (options.isTotal ? " is-total" : "") +
      '">' +
      '<span class="pcsu-amy-mortgage-brief-row-name">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="pcsu-amy-mortgage-brief-row-value">' +
      escapeHtml(money) +
      "</span>" +
      "</div>"
    );
  }

  function renderTextRow(label, value) {
    const text = safeString(value);
    if (!text) return "";
    return (
      '<div class="pcsu-amy-mortgage-brief-row">' +
      '<span class="pcsu-amy-mortgage-brief-row-name">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="pcsu-amy-mortgage-brief-row-value">' +
      escapeHtml(text) +
      "</span>" +
      "</div>"
    );
  }

  function renderScenarioSection(data) {
    const rows = [
      renderTextRow("Loan Type", data.loanType),
      renderMoneyRow("Home Price", data.homePrice),
      renderMoneyRow("Down Payment", data.downPayment),
      data.downPaymentPercent !== null && data.downPaymentPercent !== undefined
        ? renderTextRow("Down Payment %", formatPercent(data.downPaymentPercent))
        : "",
      data.creditScore !== null && data.creditScore !== undefined
        ? renderTextRow("Credit Score", String(Math.round(Number(data.creditScore))))
        : "",
      data.apr !== null && data.apr !== undefined
        ? renderTextRow("Estimated APR", formatPercent(data.apr))
        : "",
      renderMoneyRow("Loan Amount", data.loanAmount),
      data.termYears !== null && data.termYears !== undefined
        ? renderTextRow(
            "Term",
            String(Math.round(Number(data.termYears))) + " years"
          )
        : ""
    ].filter(Boolean);

    if (!rows.length) return "";

    return (
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<h3 class="pcsu-amy-mortgage-brief-label">Scenario Summary</h3>' +
      '<div class="pcsu-amy-mortgage-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderBreakdownSection(data) {
    const rows = [
      renderMoneyRow("Principal & Interest", data.principalInterest),
      renderMoneyRow("Property Taxes", data.taxes),
      renderMoneyRow("Homeowners Insurance", data.insurance),
      renderMoneyRow("Mortgage Insurance / PMI", data.mortgageInsurance),
      renderMoneyRow("HOA", data.hoa),
      renderMoneyRow(
        "VA Funding Fee Effect",
        data.fundingFeeMonthlyEffect
      ),
      renderMoneyRow("Total Monthly Housing Cost", data.totalMonthlyHousingCost, {
        isTotal: true
      })
    ].filter(Boolean);

    // Prefer not to show a breakdown section that only repeats the total.
    const detailCount = rows.length - 1;
    if (detailCount <= 0) return "";

    return (
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<h3 class="pcsu-amy-mortgage-brief-label">Monthly Breakdown</h3>' +
      '<div class="pcsu-amy-mortgage-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderContextSection(data) {
    const rows = [
      renderMoneyRow("Total Monthly Income", data.totalIncome),
      data.housingRatio !== null && data.housingRatio !== undefined
        ? renderTextRow("Housing Ratio", formatPercent(data.housingRatio))
        : "",
      renderMoneyRow("Suggested Payment Limit", data.suggestedLimit),
      renderMoneyRow("Emergency Fund", data.emergencyFund),
      renderMoneyRow("Remaining Monthly Income", data.afterPayment),
      renderMoneyRow("Monthly Debt", data.monthlyDebt)
    ].filter(Boolean);

    if (!rows.length) return "";

    return (
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<h3 class="pcsu-amy-mortgage-brief-label">Financial Context</h3>' +
      '<div class="pcsu-amy-mortgage-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderActionList(actions) {
    const labels = normalizeActions(actions);
    return (
      '<ul class="pcsu-amy-mortgage-brief-actions">' +
      labels
        .map(
          (label) =>
            '<li class="pcsu-amy-mortgage-brief-action">' +
            escapeHtml(label) +
            "</li>"
        )
        .join("") +
      "</ul>"
    );
  }

  function sourceStateAttr(data) {
    if (data.verified) return "verified";
    if (data.preliminary) return "preliminary";
    return "neutral";
  }

  function paintMortgageBrief(data) {
    if (!rootEl) return null;

    const totalDisplay = formatMoney(data.totalMonthlyHousingCost);
    if (!totalDisplay) {
      currentData = null;
      return setEmptyState();
    }

    const html =
      '<div class="pcsu-amy-mortgage-brief-greeting-row">' +
      '<div class="pcsu-amy-mortgage-brief-avatar" style="background-image:url(\'' +
      AMY_AVATAR_URL +
      '\')" aria-hidden="true"></div>' +
      '<div class="pcsu-amy-mortgage-brief-greeting-copy">' +
      '<p class="pcsu-amy-mortgage-brief-greeting-title">' +
      escapeHtml(data.title || DEFAULT_TITLE) +
      "</p>" +
      '<p class="pcsu-amy-mortgage-brief-greeting-subtitle">' +
      escapeHtml(data.subtitle || DEFAULT_SUBTITLE) +
      "</p>" +
      "</div>" +
      "</div>" +
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<div class="pcsu-amy-mortgage-brief-hero">' +
      '<p class="pcsu-amy-mortgage-brief-hero-label">Total Monthly Housing Cost</p>' +
      '<p class="pcsu-amy-mortgage-brief-hero-value" aria-live="polite">' +
      escapeHtml(totalDisplay) +
      ' <span class="pcsu-amy-mortgage-brief-hero-unit">/ month</span>' +
      "</p>" +
      "</div>" +
      "</section>" +
      renderScenarioSection(data) +
      renderBreakdownSection(data) +
      renderContextSection(data) +
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<h3 class="pcsu-amy-mortgage-brief-label">Source</h3>' +
      '<p class="pcsu-amy-mortgage-brief-source" data-state="' +
      escapeHtml(sourceStateAttr(data)) +
      '">' +
      escapeHtml(data.sourceLabel || "Mortgage estimate is not available yet") +
      "</p>" +
      "</section>" +
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<h3 class="pcsu-amy-mortgage-brief-label">Recommended Next Steps</h3>' +
      renderActionList(data.actions) +
      "</section>" +
      '<section class="pcsu-amy-mortgage-brief-section">' +
      '<p class="pcsu-amy-mortgage-brief-disclaimer">' +
      escapeHtml(data.disclaimer || DEFAULT_MORTGAGE_DISCLAIMER) +
      "</p>" +
      "</section>";

    return setCardHtml(html);
  }

  function initialize(container) {
    try {
      const host =
        typeof container === "string"
          ? document.querySelector(container)
          : container;

      if (!host || !(host instanceof Element)) {
        if (!warnedMissingContainer) {
          console.warn(
            "PCSUnited Amy Mortgage Brief: initialize() requires a valid container element."
          );
          warnedMissingContainer = true;
        }
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
        setEmptyState();
        return rootEl;
      }

      rootEl = buildShell();
      host.appendChild(rootEl);
      mountedContainer = host;
      currentData = null;
      return rootEl;
    } catch (err) {
      console.warn(
        "PCSUnited Amy Mortgage Brief: initialize() failed.",
        err
      );
      return null;
    }
  }

  function render(data) {
    try {
      if (!rootEl) {
        console.warn(
          "PCSUnited Amy Mortgage Brief: render() called before initialize()."
        );
        return null;
      }

      const normalized = normalizeMortgageBrief(data);
      if (!normalized) {
        currentData = null;
        return setEmptyState();
      }

      currentData = normalized;
      return paintMortgageBrief(normalized);
    } catch (err) {
      console.warn("PCSUnited Amy Mortgage Brief: render() failed.", err);
      currentData = null;
      return setEmptyState();
    }
  }

  function update(data) {
    try {
      if (!isPlainObject(data)) {
        return render(data);
      }

      if (!currentData) {
        return render(data);
      }

      // Merge shallow top-level fields with the previously supplied raw payload
      // so callers can patch scenario fields without dropping an existing total.
      const previousRaw = isPlainObject(currentData.raw)
        ? currentData.raw
        : cloneNormalized(currentData) || {};
      const merged = { ...previousRaw, ...data };
      return render(merged);
    } catch (err) {
      console.warn("PCSUnited Amy Mortgage Brief: update() failed.", err);
      return null;
    }
  }

  function clear() {
    currentData = null;
    if (!rootEl) return;
    setEmptyState();
  }

  function destroy() {
    try {
      if (rootEl && rootEl.parentNode) {
        rootEl.parentNode.removeChild(rootEl);
      }
    } catch (_) {
      // Safe to call repeatedly.
    }

    rootEl = null;
    mountedContainer = null;
    currentData = null;
  }

  function getData() {
    return cloneNormalized(currentData);
  }

  function isMounted() {
    return Boolean(rootEl && rootEl.isConnected);
  }

  function renderFromEvent(detail) {
    return render(detail);
  }

  window.PCSUnitedAmyMortgageBrief = {
    version: VERSION,
    initialize,
    render,
    update,
    clear,
    destroy,
    getData,
    isMounted,
    renderFromEvent
  };
})();
