(() => {
  "use strict";

  /* ============================================================
     PCSUnited • Amy Financial Brief
     v1.0.0-financial • Browser presentation only

     Amy Financial Brief is NOT chat.
     Amy Financial Brief is NOT Amy Brain.
     Amy Financial Brief is NOT the PCSUnited Financial Budget Builder.
     Amy Financial Brief is NOT a replacement for the Financial Analysis Dashboard.

     TheWing calculates.
     Amy explains.
     The browser renders.

     This file only paints financial data that already exists.
     ============================================================ */

  if (window.__PCSU_AMY_FINANCIAL_BRIEF_V100) return;
  window.__PCSU_AMY_FINANCIAL_BRIEF_V100 = true;

  const VERSION = "1.0.0-financial";
  const STYLE_ID = "pcsu-amy-financial-brief-styles-v100";
  const ROOT_ID = "pcsu-amy-financial-brief-root";
  const AMY_AVATAR_URL =
    "https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/6a5e2a4f8a0acd7d99420c0d_1f19deddafa230e0f801d99434aad586_Bento%20Icon%205.png";

  const DEFAULT_FINANCIAL_ACTIONS = [
    "Review Monthly Budget",
    "Review Mortgage Affordability",
    "Compare Housing Strategies",
    "Open Financial Analysis"
  ];

  const DEFAULT_FINANCIAL_DISCLAIMER =
    "PCSUnited and TheWing provide planning estimates and educational guidance. " +
    "Results do not constitute lending approval or replace financial, legal, tax, insurance, or benefits guidance.";

  const DEFAULT_TITLE = "Your Financial Position";
  const DEFAULT_SUBTITLE =
    "Here is a deeper view of your current monthly income, housing costs, debt, expenses, savings, and remaining cash flow.";

  const VERIFIED_SOURCE_TOKENS = [
    "thewing_financial_api",
    "thewing",
    "financial-engine",
    "financial_engine",
    "financial-analysis-engine",
    "financial_analysis_engine",
    "amy-brain",
    "server",
    "truth_packet"
  ];

  const PRELIMINARY_SOURCE_TOKENS = [
    "local_fallback",
    "browser_fallback",
    "browser_derived",
    "preliminary",
    "client_estimate",
    "client_calculation"
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

  function getNestedValue(obj, path) {
    if (!isPlainObject(obj) || !path) return undefined;
    const parts = String(path).split(".");
    let current = obj;
    for (const part of parts) {
      if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
      current = current[part];
    }
    return current;
  }

  function firstNumberFromPaths(obj, paths) {
    const values = paths.map((path) => {
      if (path.includes(".")) return getNestedValue(obj, path);
      return obj[path];
    });
    return firstNumber(...values);
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

    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    const rounded = Math.round(pct * 10) / 10;
    return String(rounded) + "%";
  }

  function formatMonths(value) {
    if (value === null || value === undefined) return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const rounded = Math.round(n * 10) / 10;
    return String(rounded) + " months";
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

  function ratioAsDecimal(value) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.abs(n) <= 1 ? n : n / 100;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #pcsu-amy-financial-brief-root,
      #pcsu-amy-financial-brief-root * {
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

      #pcsu-amy-financial-brief-root {
        --pcsu-financial-brief-ink: #f4efe4;
        --pcsu-financial-brief-muted: rgba(244, 239, 228, 0.62);
        --pcsu-financial-brief-muted-strong: rgba(244, 239, 228, 0.76);
        --pcsu-financial-brief-gold: #e7b553;
        --pcsu-financial-brief-gold2: #f4d58a;
        --pcsu-financial-brief-line: rgba(231, 181, 83, 0.34);
        --pcsu-financial-brief-line-soft: rgba(255, 255, 255, 0.1);
        --pcsu-financial-brief-panel: rgba(0, 0, 0, 0.22);
        --pcsu-financial-brief-green: rgba(143, 196, 143, 0.92);
        --pcsu-financial-brief-amber: rgba(230, 180, 95, 0.92);
        --pcsu-financial-brief-red: rgba(214, 120, 120, 0.92);
        display: block;
        width: 100%;
        padding: 14px 16px 4px;
      }

      #pcsu-amy-financial-brief-root[data-empty="1"] {
        display: none;
      }

      .pcsu-amy-financial-brief-card {
        border: 1px solid var(--pcsu-financial-brief-line-soft);
        border-left: 2px solid var(--pcsu-financial-brief-gold);
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04),
            rgba(0, 0, 0, 0.12)
          ),
          var(--pcsu-financial-brief-panel);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        border-radius: 3px;
        overflow: hidden;
      }

      .pcsu-amy-financial-brief-greeting-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 14px 12px;
        border-bottom: 1px solid var(--pcsu-financial-brief-line-soft);
      }

      .pcsu-amy-financial-brief-avatar {
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

      .pcsu-amy-financial-brief-greeting-copy {
        min-width: 0;
        flex: 1 1 auto;
      }

      .pcsu-amy-financial-brief-greeting-title {
        margin: 0;
        color: var(--pcsu-financial-brief-ink);
        font-size: 15px;
        font-weight: 900;
        line-height: 1.25;
      }

      .pcsu-amy-financial-brief-greeting-subtitle {
        margin: 6px 0 0;
        color: var(--pcsu-financial-brief-muted-strong);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.4;
      }

      .pcsu-amy-financial-brief-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--pcsu-financial-brief-line-soft);
      }

      .pcsu-amy-financial-brief-section:last-child {
        border-bottom: 0;
      }

      .pcsu-amy-financial-brief-label {
        margin: 0 0 8px;
        color: var(--pcsu-financial-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-financial-brief-hero {
        display: grid;
        gap: 4px;
      }

      .pcsu-amy-financial-brief-hero-label {
        margin: 0;
        color: var(--pcsu-financial-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-financial-brief-hero-value {
        margin: 0;
        color: var(--pcsu-financial-brief-gold2);
        font-size: 28px;
        font-weight: 900;
        line-height: 1.15;
        letter-spacing: -0.02em;
      }

      .pcsu-amy-financial-brief-hero-value[data-negative="1"] {
        color: var(--pcsu-financial-brief-red);
      }

      .pcsu-amy-financial-brief-hero-unit {
        color: var(--pcsu-financial-brief-muted-strong);
        font-size: 13px;
        font-weight: 800;
      }

      .pcsu-amy-financial-brief-rows {
        display: grid;
        gap: 8px;
      }

      .pcsu-amy-financial-brief-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .pcsu-amy-financial-brief-row.is-total {
        padding-top: 8px;
        border-top: 1px solid var(--pcsu-financial-brief-line-soft);
      }

      .pcsu-amy-financial-brief-row-name {
        color: var(--pcsu-financial-brief-muted-strong);
        font-size: 12px;
        font-weight: 800;
      }

      .pcsu-amy-financial-brief-row-value {
        color: var(--pcsu-financial-brief-ink);
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      .pcsu-amy-financial-brief-row.is-total .pcsu-amy-financial-brief-row-name,
      .pcsu-amy-financial-brief-row.is-total .pcsu-amy-financial-brief-row-value {
        color: var(--pcsu-financial-brief-gold2);
      }

      .pcsu-amy-financial-brief-row-value[data-health="strong"],
      .pcsu-amy-financial-brief-row-value[data-health="healthy"] {
        color: var(--pcsu-financial-brief-green);
      }

      .pcsu-amy-financial-brief-row-value[data-health="stable"] {
        color: var(--pcsu-financial-brief-gold2);
      }

      .pcsu-amy-financial-brief-row-value[data-health="attention"] {
        color: var(--pcsu-financial-brief-amber);
      }

      .pcsu-amy-financial-brief-row-value[data-health="critical"] {
        color: var(--pcsu-financial-brief-red);
      }

      .pcsu-amy-financial-brief-note {
        margin: 8px 0 0;
        color: var(--pcsu-financial-brief-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.4;
      }

      .pcsu-amy-financial-brief-insight {
        margin: 0;
        color: var(--pcsu-financial-brief-muted-strong);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.45;
      }

      .pcsu-amy-financial-brief-source {
        margin: 0;
        color: var(--pcsu-financial-brief-muted-strong);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.4;
      }

      .pcsu-amy-financial-brief-source[data-state="verified"] {
        color: var(--pcsu-financial-brief-gold2);
      }

      .pcsu-amy-financial-brief-source[data-state="preliminary"] {
        color: rgba(244, 213, 138, 0.9);
      }

      .pcsu-amy-financial-brief-actions {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .pcsu-amy-financial-brief-action {
        display: block;
        padding: 10px 11px;
        border: 1px solid var(--pcsu-financial-brief-line-soft);
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.03);
        color: var(--pcsu-financial-brief-ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.3;
      }

      .pcsu-amy-financial-brief-disclaimer {
        color: var(--pcsu-financial-brief-muted);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.45;
        margin: 0;
      }

      @media (max-width: 420px) {
        .pcsu-amy-financial-brief-avatar {
          width: 84px;
          height: 84px;
        }

        .pcsu-amy-financial-brief-hero-value {
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
    root.setAttribute("aria-label", "Amy Financial Brief");
    root.innerHTML =
      '<div class="pcsu-amy-financial-brief-card" data-pcsu-financial-brief-card></div>';
    return root;
  }

  function getCard() {
    return rootEl
      ? rootEl.querySelector("[data-pcsu-financial-brief-card]")
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

  function packetHasFinancialSignal(obj) {
    if (!isPlainObject(obj)) return false;

    const incomePaths = [
      "totalMonthlyIncome",
      "total_monthly_income",
      "monthlyIncome",
      "monthly_income",
      "totalIncome",
      "total_income",
      "basicIncome",
      "grossMonthlyIncome",
      "gross_monthly_income",
      "income.monthly",
      "income.total",
      "summary.totalIncome",
      "summary.monthlyIncome"
    ];

    const cashPaths = [
      "monthlyCashRemaining",
      "monthly_cash_remaining",
      "cashRemaining",
      "cash_remaining",
      "cashFlow",
      "cash_flow",
      "monthlyCashFlow",
      "monthly_cash_flow",
      "remainingMonthlyIncome",
      "remaining_monthly_income",
      "afterPayment",
      "after_payment",
      "summary.cashRemaining",
      "summary.cashFlow"
    ];

    const expensePaths = [
      "totalMonthlyHousingCost",
      "total_monthly_housing_cost",
      "monthlyHousingCost",
      "monthly_housing_cost",
      "totalMonthlyExpenses",
      "total_monthly_expenses",
      "monthlyExpenses",
      "monthly_expenses",
      "totalMonthlyDebt",
      "total_monthly_debt",
      "monthlyDebt",
      "monthly_debt",
      "totalMonthlySavings",
      "total_monthly_savings",
      "monthlySavings",
      "monthly_savings",
      "financial.totalExpenses",
      "financial.totalDebt",
      "budget.totalExpenses"
    ];

    if (firstNumberFromPaths(obj, incomePaths) !== null) return true;
    if (firstNumberFromPaths(obj, cashPaths) !== null) return true;

    let expenseCount = 0;
    for (const path of expensePaths) {
      if (firstNumberFromPaths(obj, [path]) !== null) expenseCount += 1;
    }
    return expenseCount >= 2;
  }

  function packetIsMortgageOnly(obj) {
    if (!isPlainObject(obj)) return false;
    const hasMortgage =
      firstNumber(
        obj.totalMonthlyHousingCost,
        obj.projected_mortgage_amount,
        obj.projectedMortgageAmount,
        obj.estimatedPayment,
        getNestedValue(obj, "mortgage.totalMonthlyHousingCost"),
        getNestedValue(obj, "mortgage.monthlyPayment")
      ) !== null;
    if (!hasMortgage) return false;
    return !packetHasFinancialSignal(obj);
  }

  function unwrapFinancialCandidate(raw) {
    if (!isPlainObject(raw)) return {};

    const nestedCandidates = [
      raw.financial,
      raw.financialBrief,
      raw.financialAnalysis,
      raw.budget,
      raw.summary,
      raw.result,
      raw.payload,
      raw.data,
      raw.analysis,
      isPlainObject(raw.truth_packet) ? raw.truth_packet.financial : null,
      isPlainObject(raw.truthPacket) ? raw.truthPacket.financial : null,
      isPlainObject(raw.truth) ? raw.truth.financial : null
    ];

    for (const candidate of nestedCandidates) {
      if (packetHasFinancialSignal(candidate) && !packetIsMortgageOnly(candidate)) {
        return candidate;
      }
    }

    for (const candidate of nestedCandidates) {
      if (
        isPlainObject(candidate) &&
        Object.keys(candidate).length &&
        !packetIsMortgageOnly(candidate)
      ) {
        return candidate;
      }
    }

    return raw;
  }

  function classifySource(source, provenance, hasBrowserDerived) {
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
        sourceLabel: "Calculated with TheWing financial engine"
      };
    }

    if (preliminaryByToken || hasBrowserDerived) {
      return {
        verified: false,
        preliminary: true,
        sourceLabel: "Preliminary financial insight — awaiting TheWing verification"
      };
    }

    if (src) {
      return {
        verified: false,
        preliminary: false,
        sourceLabel: "Current PCSUnited financial summary"
      };
    }

    return {
      verified: false,
      preliminary: false,
      sourceLabel: "Financial summary is not available yet"
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
    return labels.length ? labels : DEFAULT_FINANCIAL_ACTIONS.slice();
  }

  function healthStateAttr(status) {
    const text = safeString(status).toLowerCase();
    if (text === "strong") return "strong";
    if (text === "healthy") return "healthy";
    if (text === "stable") return "stable";
    if (text === "needs attention") return "attention";
    if (text === "critical") return "critical";
    return "";
  }

  function gradeFromScore(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  function statusFromGrade(grade) {
    switch (grade) {
      case "A":
        return "Strong";
      case "B":
        return "Healthy";
      case "C":
        return "Stable";
      case "D":
        return "Needs Attention";
      case "F":
        return "Critical";
      default:
        return "";
    }
  }

  function summaryFromStatus(status) {
    switch (safeString(status)) {
      case "Strong":
        return "Your current monthly cash flow, debt load, housing ratio, and reserves indicate a strong overall financial position.";
      case "Healthy":
        return "Your finances appear generally healthy, with manageable obligations and positive monthly cash flow.";
      case "Stable":
        return "Your finances are currently stable, but one or more areas are approaching the recommended range.";
      case "Needs Attention":
        return "Your monthly obligations are placing meaningful pressure on income and should be reviewed before adding new costs.";
      case "Critical":
        return "Your current expenses, debt, housing costs, or negative cash flow indicate significant financial pressure.";
      default:
        return "";
    }
  }

  function computeFinancialHealthGrade(values) {
    const {
      totalMonthlyIncome,
      monthlyCashRemaining,
      debtToIncomeRatio,
      housingToIncomeRatio,
      emergencyFundMonths,
      savingsRate
    } = values;

    const hasMinimumData =
      totalMonthlyIncome !== null &&
      monthlyCashRemaining !== null &&
      (debtToIncomeRatio !== null ||
        housingToIncomeRatio !== null ||
        emergencyFundMonths !== null ||
        savingsRate !== null);

    if (!hasMinimumData) return null;

    let score = 100;

    if (totalMonthlyIncome > 0 && monthlyCashRemaining !== null) {
      const cashFlowRatio = monthlyCashRemaining / totalMonthlyIncome;
      if (cashFlowRatio < 0) score -= 35;
      else if (cashFlowRatio < 0.05) score -= 25;
      else if (cashFlowRatio < 0.1) score -= 16;
      else if (cashFlowRatio < 0.2) score -= 8;
    }

    if (debtToIncomeRatio !== null) {
      const dti = ratioAsDecimal(debtToIncomeRatio);
      if (dti !== null) {
        if (dti > 0.43) score -= 25;
        else if (dti > 0.36) score -= 18;
        else if (dti > 0.25) score -= 12;
        else if (dti > 0.15) score -= 5;
      }
    }

    if (housingToIncomeRatio !== null) {
      const hti = ratioAsDecimal(housingToIncomeRatio);
      if (hti !== null) {
        if (hti > 0.41) score -= 20;
        else if (hti > 0.36) score -= 12;
        else if (hti > 0.28) score -= 6;
      }
    }

    if (emergencyFundMonths !== null) {
      const months = Number(emergencyFundMonths);
      if (months < 1) score -= 15;
      else if (months < 3) score -= 10;
      else if (months < 6) score -= 4;
    }

    if (savingsRate !== null) {
      const sr = ratioAsDecimal(savingsRate);
      if (sr !== null) {
        if (sr <= 0) score -= 5;
        else if (sr < 0.05) score -= 4;
        else if (sr < 0.1) score -= 2;
      }
    }

    score = Math.max(0, Math.min(100, score));
    const grade = gradeFromScore(score);
    const status = statusFromGrade(grade);

    return {
      financialHealthScore: score,
      financialHealthGrade: grade,
      financialHealthStatus: status,
      gradePreliminary: true
    };
  }

  function countFinancialTotals(values) {
    let count = 0;
    const fields = [
      values.totalMonthlyHousingCost,
      values.totalMonthlyExpenses,
      values.totalMonthlyDebt,
      values.totalMonthlySavings,
      values.takeHomeIncome,
      values.emergencyFund
    ];
    for (const field of fields) {
      if (field !== null && field !== undefined) count += 1;
    }
    return count;
  }

  function canRenderBrief(values) {
    if (values.monthlyCashRemaining !== null) return true;
    if (
      values.totalMonthlyIncome !== null &&
      countFinancialTotals(values) >= 2
    ) {
      return true;
    }
    return false;
  }

  function normalizeFinancialBrief(rawInput) {
    const root = isPlainObject(rawInput) ? rawInput : {};
    const financial = unwrapFinancialCandidate(root);
    const income = isPlainObject(financial.income) ? financial.income : {};
    const summary = isPlainObject(financial.summary)
      ? financial.summary
      : isPlainObject(root.summary)
        ? root.summary
        : {};
    const budget = isPlainObject(financial.budget) ? financial.budget : {};
    const ratios = isPlainObject(financial.ratios) ? financial.ratios : {};
    const score = isPlainObject(financial.score) ? financial.score : {};
    const mortgage = isPlainObject(financial.mortgage) ? financial.mortgage : {};
    const provenance = isPlainObject(financial.provenance)
      ? financial.provenance
      : isPlainObject(root.provenance)
        ? root.provenance
        : null;

    const derived = {
      monthlyCashRemaining: false,
      debtToIncomeRatio: false,
      housingToIncomeRatio: false,
      expenseToIncomeRatio: false,
      savingsRate: false,
      cashFlowRatio: false,
      emergencyFundMonths: false,
      grade: false
    };

    const totalMonthlyIncome = firstNumber(
      root.totalMonthlyIncome,
      root.total_monthly_income,
      root.monthlyIncome,
      root.monthly_income,
      root.totalIncome,
      root.total_income,
      root.basicIncome,
      root.grossMonthlyIncome,
      root.gross_monthly_income,
      financial.totalMonthlyIncome,
      financial.total_monthly_income,
      financial.monthlyIncome,
      financial.monthly_income,
      financial.totalIncome,
      financial.total_income,
      financial.basicIncome,
      financial.grossMonthlyIncome,
      income.monthly,
      income.total,
      summary.totalIncome,
      summary.monthlyIncome
    );

    const takeHomeIncome = firstNumber(
      root.takeHomeIncome,
      root.take_home_income,
      root.monthlyTakeHome,
      root.monthly_take_home,
      root.netMonthlyIncome,
      root.net_monthly_income,
      financial.takeHomeIncome,
      financial.take_home_income,
      financial.monthlyTakeHome,
      financial.netMonthlyIncome,
      income.takeHome,
      income.netMonthly
    );

    const totalMonthlyHousingCost = firstNumber(
      root.totalMonthlyHousingCost,
      root.total_monthly_housing_cost,
      root.monthlyHousingCost,
      root.monthly_housing_cost,
      root.housingCost,
      root.housing_cost,
      root.mortgagePayment,
      root.mortgage_payment,
      root.projected_mortgage_amount,
      root.projectedMortgageAmount,
      financial.totalMonthlyHousingCost,
      financial.total_monthly_housing_cost,
      financial.monthlyHousingCost,
      financial.housingCost,
      financial.mortgagePayment,
      mortgage.totalMonthlyHousingCost,
      mortgage.total_monthly_housing_cost,
      mortgage.totalMonthly,
      mortgage.monthlyPayment,
      mortgage.monthly_payment
    );

    const totalMonthlyExpenses = firstNumber(
      root.totalMonthlyExpenses,
      root.total_monthly_expenses,
      root.monthlyExpenses,
      root.monthly_expenses,
      root.totalExpenses,
      root.total_expenses,
      root.expensesTotal,
      root.expenses_total,
      financial.totalMonthlyExpenses,
      financial.total_monthly_expenses,
      financial.monthlyExpenses,
      financial.totalExpenses,
      budget.totalExpenses,
      summary.totalExpenses
    );

    const totalMonthlyDebt = firstNumber(
      root.totalMonthlyDebt,
      root.total_monthly_debt,
      root.monthlyDebt,
      root.monthly_debt,
      root.totalDebt,
      root.total_debt,
      root.debtPayments,
      root.debt_payments,
      financial.totalMonthlyDebt,
      financial.total_monthly_debt,
      financial.monthlyDebt,
      financial.totalDebt,
      budget.totalDebt,
      summary.totalDebt
    );

    const totalMonthlySavings = firstNumber(
      root.totalMonthlySavings,
      root.total_monthly_savings,
      root.monthlySavings,
      root.monthly_savings,
      root.totalSavings,
      root.total_savings,
      root.savingsContribution,
      root.savings_contribution,
      financial.totalMonthlySavings,
      financial.total_monthly_savings,
      financial.monthlySavings,
      financial.totalSavings,
      budget.totalSavings,
      summary.totalSavings
    );

    let monthlyCashRemaining = firstNumber(
      root.monthlyCashRemaining,
      root.monthly_cash_remaining,
      root.cashRemaining,
      root.cash_remaining,
      root.cashFlow,
      root.cash_flow,
      root.monthlyCashFlow,
      root.monthly_cash_flow,
      root.remainingMonthlyIncome,
      root.remaining_monthly_income,
      root.afterPayment,
      root.after_payment,
      financial.monthlyCashRemaining,
      financial.monthly_cash_remaining,
      financial.cashRemaining,
      financial.cashFlow,
      financial.monthlyCashFlow,
      summary.cashRemaining,
      summary.cashFlow
    );

    const emergencyFund = firstNumber(
      root.emergencyFund,
      root.emergency_fund,
      root.emergencySavings,
      root.emergency_savings,
      root.cashReserves,
      root.cash_reserves,
      root.reserves,
      financial.emergencyFund,
      financial.emergency_fund,
      financial.emergencySavings,
      financial.cashReserves,
      budget.emergencyFund
    );

    const essentialMonthlyExpenses = firstNumber(
      root.essentialMonthlyExpenses,
      root.essential_monthly_expenses,
      root.monthlyEssentialExpenses,
      root.monthly_essential_expenses,
      financial.essentialMonthlyExpenses,
      financial.essential_monthly_expenses,
      budget.essentialMonthlyExpenses
    );

    let emergencyFundMonths = firstNumber(
      root.emergencyFundMonths,
      root.emergency_fund_months,
      root.reserveMonths,
      root.reserve_months,
      root.monthsOfReserves,
      root.months_of_reserves,
      financial.emergencyFundMonths,
      financial.emergency_fund_months,
      financial.reserveMonths,
      summary.reserveMonths
    );

    let debtToIncomeRatio = firstNumber(
      root.debtToIncomeRatio,
      root.debt_to_income_ratio,
      root.dti,
      root.dtiRatio,
      root.dti_ratio,
      financial.debtToIncomeRatio,
      financial.debt_to_income_ratio,
      financial.dti,
      ratios.dti,
      summary.dti
    );

    let housingToIncomeRatio = firstNumber(
      root.housingToIncomeRatio,
      root.housing_to_income_ratio,
      root.housingRatio,
      root.housing_ratio,
      root.housingCostRatio,
      root.housing_cost_ratio,
      financial.housingToIncomeRatio,
      financial.housing_to_income_ratio,
      financial.housingRatio,
      ratios.housing,
      ratios.housingRatio,
      summary.housingRatio
    );

    let expenseToIncomeRatio = firstNumber(
      root.expenseToIncomeRatio,
      root.expense_to_income_ratio,
      root.expensesToIncomeRatio,
      root.expenses_to_income_ratio,
      root.expenseRatio,
      root.expense_ratio,
      financial.expenseToIncomeRatio,
      financial.expense_to_income_ratio,
      financial.expenseRatio,
      ratios.expenses,
      summary.expenseRatio
    );

    let savingsRate = firstNumber(
      root.savingsRate,
      root.savings_rate,
      root.savingsRatio,
      root.savings_ratio,
      financial.savingsRate,
      financial.savings_rate,
      financial.savingsRatio,
      ratios.savings,
      summary.savingsRate
    );

    const expenseCategoryCount = [
      totalMonthlyHousingCost,
      totalMonthlyExpenses,
      totalMonthlyDebt,
      totalMonthlySavings
    ].filter((v) => v !== null).length;

    const looksLikeFinancialSummary =
      totalMonthlyIncome !== null && expenseCategoryCount >= 1;

    if (monthlyCashRemaining === null && looksLikeFinancialSummary) {
      monthlyCashRemaining =
        totalMonthlyIncome -
        (totalMonthlyHousingCost || 0) -
        (totalMonthlyExpenses || 0) -
        (totalMonthlyDebt || 0) -
        (totalMonthlySavings || 0);
      derived.monthlyCashRemaining = true;
    }

    if (
      debtToIncomeRatio === null &&
      totalMonthlyIncome !== null &&
      totalMonthlyIncome > 0 &&
      totalMonthlyDebt !== null
    ) {
      debtToIncomeRatio = totalMonthlyDebt / totalMonthlyIncome;
      derived.debtToIncomeRatio = true;
    }

    if (
      housingToIncomeRatio === null &&
      totalMonthlyIncome !== null &&
      totalMonthlyIncome > 0 &&
      totalMonthlyHousingCost !== null
    ) {
      housingToIncomeRatio = totalMonthlyHousingCost / totalMonthlyIncome;
      derived.housingToIncomeRatio = true;
    }

    if (
      expenseToIncomeRatio === null &&
      totalMonthlyIncome !== null &&
      totalMonthlyIncome > 0 &&
      totalMonthlyExpenses !== null
    ) {
      expenseToIncomeRatio = totalMonthlyExpenses / totalMonthlyIncome;
      derived.expenseToIncomeRatio = true;
    }

    if (
      savingsRate === null &&
      totalMonthlyIncome !== null &&
      totalMonthlyIncome > 0 &&
      totalMonthlySavings !== null
    ) {
      savingsRate = totalMonthlySavings / totalMonthlyIncome;
      derived.savingsRate = true;
    }

    if (
      emergencyFundMonths === null &&
      emergencyFund !== null &&
      essentialMonthlyExpenses !== null &&
      essentialMonthlyExpenses > 0
    ) {
      emergencyFundMonths = emergencyFund / essentialMonthlyExpenses;
      derived.emergencyFundMonths = true;
    }

    let cashFlowRatio = null;
    if (
      totalMonthlyIncome !== null &&
      totalMonthlyIncome > 0 &&
      monthlyCashRemaining !== null
    ) {
      cashFlowRatio = monthlyCashRemaining / totalMonthlyIncome;
      derived.cashFlowRatio = true;
    }

    const suppliedGrade = pickFirstString(
      root.financialHealthGrade,
      root.financial_health_grade,
      root.healthGrade,
      root.health_grade,
      root.grade,
      financial.financialHealthGrade,
      financial.healthGrade,
      score.grade
    );

    const suppliedStatus = pickFirstString(
      root.financialHealthStatus,
      root.financial_health_status,
      root.healthStatus,
      root.health_status,
      root.status,
      financial.financialHealthStatus,
      financial.healthStatus,
      score.status
    );

    const suppliedSummary = pickFirstString(
      root.financialHealthSummary,
      root.financial_health_summary,
      root.healthSummary,
      root.health_summary,
      root.summaryText,
      root.summary_text,
      root.insight,
      root.explanation,
      financial.financialHealthSummary,
      financial.healthSummary
    );

    const suppliedScore = firstNumber(
      root.financialHealthScore,
      root.financial_health_score,
      financial.financialHealthScore,
      score.score,
      score.value
    );

    let financialHealthGrade = suppliedGrade || null;
    let financialHealthStatus = suppliedStatus || null;
    let financialHealthScore = suppliedScore;
    let financialHealthSummary = suppliedSummary || null;
    let gradePreliminary = false;

    if (financialHealthGrade) {
      gradePreliminary = false;
      if (!financialHealthStatus) {
        financialHealthStatus = statusFromGrade(financialHealthGrade);
      }
    } else {
      const computed = computeFinancialHealthGrade({
        totalMonthlyIncome,
        monthlyCashRemaining,
        debtToIncomeRatio,
        housingToIncomeRatio,
        emergencyFundMonths,
        savingsRate
      });
      if (computed) {
        financialHealthGrade = computed.financialHealthGrade;
        financialHealthStatus = computed.financialHealthStatus;
        financialHealthScore = computed.financialHealthScore;
        gradePreliminary = true;
        derived.grade = true;
      }
    }

    if (!financialHealthSummary && financialHealthStatus) {
      financialHealthSummary = summaryFromStatus(financialHealthStatus);
    }

    const valuesForRender = {
      totalMonthlyIncome,
      takeHomeIncome,
      totalMonthlyHousingCost,
      totalMonthlyExpenses,
      totalMonthlyDebt,
      totalMonthlySavings,
      monthlyCashRemaining
    };

    if (!canRenderBrief(valuesForRender)) {
      return null;
    }

    const source = pickFirstString(
      root.source,
      financial.source,
      provenance && provenance.source_type,
      provenance && provenance.module_id
    );

    const hasBrowserDerived =
      derived.grade ||
      derived.monthlyCashRemaining ||
      derived.debtToIncomeRatio ||
      derived.housingToIncomeRatio ||
      derived.expenseToIncomeRatio ||
      derived.savingsRate ||
      derived.emergencyFundMonths ||
      derived.cashFlowRatio;

    const sourceState = classifySource(source, provenance, hasBrowserDerived);

    const title = pickFirstString(root.title, financial.title) || DEFAULT_TITLE;
    const subtitle =
      pickFirstString(root.subtitle, financial.subtitle) || DEFAULT_SUBTITLE;
    const disclaimer =
      pickFirstString(root.disclaimer, financial.disclaimer) ||
      DEFAULT_FINANCIAL_DISCLAIMER;

    const actionsProvided =
      Array.isArray(root.actions) || Array.isArray(financial.actions);
    const actions = actionsProvided
      ? normalizeActions(root.actions || financial.actions)
      : DEFAULT_FINANCIAL_ACTIONS.slice();

    let sourceLabel = sourceState.sourceLabel;
    let verified = sourceState.verified;
    let preliminary = sourceState.preliminary;

    if (gradePreliminary && !verified) {
      preliminary = true;
    }

    if (!source && !provenance && !hasBrowserDerived) {
      sourceLabel = "Current PCSUnited financial summary";
      verified = false;
      preliminary = false;
    }

    return stripEmpty({
      type: "financial",
      title,
      subtitle,
      totalMonthlyIncome,
      takeHomeIncome,
      totalMonthlyHousingCost,
      totalMonthlyExpenses,
      totalMonthlyDebt,
      totalMonthlySavings,
      monthlyCashRemaining,
      emergencyFund,
      essentialMonthlyExpenses,
      emergencyFundMonths,
      debtToIncomeRatio,
      housingToIncomeRatio,
      expenseToIncomeRatio,
      savingsRate,
      cashFlowRatio,
      financialHealthScore,
      financialHealthGrade: financialHealthGrade || null,
      financialHealthStatus: financialHealthStatus || null,
      financialHealthSummary: financialHealthSummary || null,
      gradePreliminary,
      source: source || null,
      sourceLabel,
      verified,
      preliminary,
      provenance,
      actions,
      disclaimer,
      raw: root
    });
  }

  function renderMoneyRow(label, amount, options = {}) {
    if (amount === null || amount === undefined) return "";
    if (!Number.isFinite(Number(amount))) return "";
    const money = formatMoney(amount);
    if (!money) return "";

    return (
      '<div class="pcsu-amy-financial-brief-row' +
      (options.isTotal ? " is-total" : "") +
      '">' +
      '<span class="pcsu-amy-financial-brief-row-name">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="pcsu-amy-financial-brief-row-value">' +
      escapeHtml(money) +
      "</span>" +
      "</div>"
    );
  }

  function renderTextRow(label, value, options = {}) {
    const text = safeString(value);
    if (!text) return "";
    const healthAttr = options.health
      ? ' data-health="' + escapeHtml(options.health) + '"'
      : "";
    return (
      '<div class="pcsu-amy-financial-brief-row' +
      (options.isTotal ? " is-total" : "") +
      '">' +
      '<span class="pcsu-amy-financial-brief-row-name">' +
      escapeHtml(label) +
      "</span>" +
      '<span class="pcsu-amy-financial-brief-row-value"' +
      healthAttr +
      ">" +
      escapeHtml(text) +
      "</span>" +
      "</div>"
    );
  }

  function renderPercentRow(label, value) {
    if (value === null || value === undefined) return "";
    const text = formatPercent(value);
    if (!text) return "";
    return renderTextRow(label, text);
  }

  function renderHealthSection(data) {
    if (!data.financialHealthGrade && !data.financialHealthStatus) return "";

    const health = healthStateAttr(data.financialHealthStatus);
    const rows = [
      renderTextRow("Financial Health Grade", data.financialHealthGrade, {
        health
      }),
      renderTextRow("Status", data.financialHealthStatus, { health }),
      data.financialHealthScore !== null &&
      data.financialHealthScore !== undefined
        ? renderTextRow(
            "Financial Health Score",
            String(Math.round(Number(data.financialHealthScore))) + " / 100",
            { health }
          )
        : ""
    ].filter(Boolean);

    if (!rows.length) return "";

    const note = data.gradePreliminary
      ? '<p class="pcsu-amy-financial-brief-note">Preliminary grade based on current supplied values</p>'
      : "";

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Financial Health</h3>' +
      '<div class="pcsu-amy-financial-brief-rows">' +
      rows.join("") +
      "</div>" +
      note +
      "</section>"
    );
  }

  function renderPositionSection(data) {
    const rows = [
      renderMoneyRow("Total Monthly Income", data.totalMonthlyIncome),
      renderMoneyRow("Take-Home Income", data.takeHomeIncome),
      renderMoneyRow("Total Housing Cost", data.totalMonthlyHousingCost),
      renderMoneyRow("Total Expenses", data.totalMonthlyExpenses),
      renderMoneyRow("Total Debt Payments", data.totalMonthlyDebt),
      renderMoneyRow("Total Savings", data.totalMonthlySavings),
      renderMoneyRow("Monthly Cash Remaining", data.monthlyCashRemaining, {
        isTotal: true
      })
    ].filter(Boolean);

    if (!rows.length) return "";

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Monthly Financial Position</h3>' +
      '<div class="pcsu-amy-financial-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderRatiosSection(data) {
    const rows = [
      renderPercentRow("Debt-to-Income Ratio", data.debtToIncomeRatio),
      renderPercentRow("Housing-to-Income Ratio", data.housingToIncomeRatio),
      renderPercentRow("Expenses-to-Income Ratio", data.expenseToIncomeRatio),
      renderPercentRow("Savings Rate", data.savingsRate),
      renderPercentRow("Remaining Cash-Flow Ratio", data.cashFlowRatio)
    ].filter(Boolean);

    if (!rows.length) return "";

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Financial Ratios</h3>' +
      '<div class="pcsu-amy-financial-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderReservesSection(data) {
    const rows = [
      renderMoneyRow("Emergency Fund", data.emergencyFund),
      data.emergencyFundMonths !== null && data.emergencyFundMonths !== undefined
        ? renderTextRow(
            "Emergency Fund Coverage",
            formatMonths(data.emergencyFundMonths)
          )
        : "",
      renderMoneyRow("Monthly Savings", data.totalMonthlySavings),
      renderPercentRow("Savings Rate", data.savingsRate)
    ].filter(Boolean);

    if (!rows.length) return "";

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Reserves and Savings</h3>' +
      '<div class="pcsu-amy-financial-brief-rows">' +
      rows.join("") +
      "</div>" +
      "</section>"
    );
  }

  function renderInsightSection(data) {
    const text = safeString(data.financialHealthSummary);
    if (!text) return "";

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Amy\u2019s Financial Insight</h3>' +
      '<p class="pcsu-amy-financial-brief-insight">' +
      escapeHtml(text) +
      "</p>" +
      "</section>"
    );
  }

  function renderActionList(actions) {
    const labels = normalizeActions(actions);
    return (
      '<ul class="pcsu-amy-financial-brief-actions">' +
      labels
        .map(
          (label) =>
            '<li class="pcsu-amy-financial-brief-action">' +
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

  function renderHeroSection(data) {
    if (
      data.monthlyCashRemaining === null ||
      data.monthlyCashRemaining === undefined
    ) {
      return "";
    }

    const displayHero = formatMoney(data.monthlyCashRemaining);
    if (!displayHero) return "";

    const isNegative = Number(data.monthlyCashRemaining) < 0;

    return (
      '<section class="pcsu-amy-financial-brief-section">' +
      '<div class="pcsu-amy-financial-brief-hero">' +
      '<p class="pcsu-amy-financial-brief-hero-label">Monthly Cash Remaining</p>' +
      '<p class="pcsu-amy-financial-brief-hero-value"' +
      (isNegative ? ' data-negative="1"' : "") +
      ' aria-live="polite">' +
      escapeHtml(displayHero) +
      ' <span class="pcsu-amy-financial-brief-hero-unit">/ month</span>' +
      "</p>" +
      "</div>" +
      "</section>"
    );
  }

  function paintFinancialBrief(data) {
    if (!rootEl) return null;

    const html =
      '<div class="pcsu-amy-financial-brief-greeting-row">' +
      '<div class="pcsu-amy-financial-brief-avatar" style="background-image:url(\'' +
      AMY_AVATAR_URL +
      '\')" aria-hidden="true"></div>' +
      '<div class="pcsu-amy-financial-brief-greeting-copy">' +
      '<p class="pcsu-amy-financial-brief-greeting-title">' +
      escapeHtml(data.title || DEFAULT_TITLE) +
      "</p>" +
      '<p class="pcsu-amy-financial-brief-greeting-subtitle">' +
      escapeHtml(data.subtitle || DEFAULT_SUBTITLE) +
      "</p>" +
      "</div>" +
      "</div>" +
      renderHeroSection(data) +
      renderHealthSection(data) +
      renderPositionSection(data) +
      renderRatiosSection(data) +
      renderReservesSection(data) +
      renderInsightSection(data) +
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Source</h3>' +
      '<p class="pcsu-amy-financial-brief-source" data-state="' +
      escapeHtml(sourceStateAttr(data)) +
      '">' +
      escapeHtml(
        data.sourceLabel || "Financial summary is not available yet"
      ) +
      "</p>" +
      "</section>" +
      '<section class="pcsu-amy-financial-brief-section">' +
      '<h3 class="pcsu-amy-financial-brief-label">Recommended Next Steps</h3>' +
      renderActionList(data.actions) +
      "</section>" +
      '<section class="pcsu-amy-financial-brief-section">' +
      '<p class="pcsu-amy-financial-brief-disclaimer">' +
      escapeHtml(data.disclaimer || DEFAULT_FINANCIAL_DISCLAIMER) +
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
            "PCSUnited Amy Financial Brief: initialize() requires a valid container element."
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
        "PCSUnited Amy Financial Brief: initialize() failed.",
        err
      );
      return null;
    }
  }

  function render(data) {
    try {
      if (!rootEl) {
        console.warn(
          "PCSUnited Amy Financial Brief: render() called before initialize()."
        );
        return null;
      }

      const normalized = normalizeFinancialBrief(data);
      if (!normalized) {
        currentData = null;
        return setEmptyState();
      }

      currentData = normalized;
      return paintFinancialBrief(normalized);
    } catch (err) {
      console.warn("PCSUnited Amy Financial Brief: render() failed.", err);
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

      const previousRaw = isPlainObject(currentData.raw)
        ? currentData.raw
        : cloneNormalized(currentData) || {};
      const merged = { ...previousRaw, ...data };
      return render(merged);
    } catch (err) {
      console.warn("PCSUnited Amy Financial Brief: update() failed.", err);
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

  window.PCSUnitedAmyFinancialBrief = {
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
