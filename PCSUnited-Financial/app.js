/* ============================================================
   PCSUnited Financial
   Monthly Budget Builder
   app.js

   Responsibilities
   - Initialize sliders and value bubbles
   - Synchronize sliders and number inputs
   - Recalculate cash flow and financial metrics
   - Sort expense rows
   - Manage category tabs
   - Add custom expenses
   - Manage modal behavior
   - Manage step navigation
   - Save the current session locally
   ============================================================ */

"use strict";


/* ============================================================
   1. APPLICATION CONFIGURATION
   ============================================================ */

const PCSU_CONFIG = Object.freeze({
  locale: "en-US",
  currency: "USD",

  storageKey: "pcsunited.financialBudget.v1",

  monthlyIncome: 7910,
  totalDebt: 1320,
  totalSavings: 0,
  emergencyFund: 6000,

  /*
   * The expense rows visible in the reference image total $2,160.
   * The image displays total monthly expenses of $4,870.
   *
   * This $2,710 baseline represents expenses located in the other
   * category tabs, such as Housing, Transportation, Lifestyle,
   * and Other.
   */
  hiddenCategoryExpenses: 2710,

  /*
   * Used to reproduce the initial emergency-fund display of
   * approximately 3.2 months from the reference design.
   */
  essentialMonthlyExpenses: 1875,

  categoryLabels: {
    "monthly-expenses": "Adjust your monthly expenses",
    housing: "Adjust your monthly housing costs",
    transportation: "Adjust your transportation costs",
    lifestyle: "Adjust your lifestyle spending",
    other: "Adjust your other monthly expenses"
  },

  categoryEmptyMessages: {
    housing: "Housing expenses will appear here.",
    transportation: "Transportation expenses will appear here.",
    lifestyle: "Lifestyle expenses will appear here.",
    other: "Other monthly expenses will appear here."
  }
});


/* ============================================================
   2. NUMBER FORMATTERS
   ============================================================ */

const currencyFormatter = new Intl.NumberFormat(PCSU_CONFIG.locale, {
  style: "currency",
  currency: PCSU_CONFIG.currency,
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat(PCSU_CONFIG.locale, {
  maximumFractionDigits: 0
});

const percentageFormatter = new Intl.NumberFormat(PCSU_CONFIG.locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});


/* ============================================================
   3. APPLICATION STATE
   ============================================================ */

const state = {
  activeCategory: "monthly-expenses",

  monthlyIncome: PCSU_CONFIG.monthlyIncome,
  totalDebt: PCSU_CONFIG.totalDebt,
  totalSavings: PCSU_CONFIG.totalSavings,
  emergencyFund: PCSU_CONFIG.emergencyFund,

  hiddenCategoryExpenses: PCSU_CONFIG.hiddenCategoryExpenses,
  essentialMonthlyExpenses: PCSU_CONFIG.essentialMonthlyExpenses,

  currentStep: "expenses",

  expenses: {}
};


/* ============================================================
   4. DOM REFERENCES
   ============================================================ */

const DOM = {
  budgetApp: null,

  categoryTabs: [],
  editorTitle: null,
  expenseList: null,
  expenseSort: null,

  addExpenseButton: null,
  customExpenseModal: null,
  customExpenseForm: null,
  customExpenseName: null,
  customExpenseAmount: null,
  closeExpenseModal: null,
  cancelExpenseModal: null,

  cashFlowAmount: null,
  cashFlowFooterAmount: null,
  cashFlowPercentage: null,

  monthlyIncomeDonut: null,
  monthlyIncomeValue: null,
  totalExpensesValue: null,
  totalDebtValue: null,
  totalSavingsValue: null,

  expensesIncomeRatio: null,
  emergencyFundAmount: null,
  emergencyFundMonths: null,
  debtIncomeRatio: null,

  stepItems: [],
  nextStepButton: null,

  locationSelector: null,
  selectedLocation: null
};


/* ============================================================
   5. GENERAL HELPERS
   ============================================================ */

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}


function parseNumericValue(value, fallback = 0) {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}


function formatCurrency(value) {
  return currencyFormatter.format(parseNumericValue(value));
}


function formatSignedCurrency(value, options = {}) {
  const {
    forceNegative = false,
    preserveNegativeZero = false
  } = options;

  const numericValue = parseNumericValue(value);

  if (preserveNegativeZero && numericValue === 0) {
    return "-$0";
  }

  if (forceNegative) {
    return `-${formatCurrency(Math.abs(numericValue))}`;
  }

  return formatCurrency(numericValue);
}


function formatPlainNumber(value) {
  return numberFormatter.format(parseNumericValue(value));
}


function formatPercentage(value) {
  return `${percentageFormatter.format(parseNumericValue(value))}%`;
}


function createUniqueId(prefix = "item") {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);

  return `${prefix}-${timePart}-${randomPart}`;
}


function announce(message) {
  let liveRegion = document.getElementById("pcsuLiveRegion");

  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "pcsuLiveRegion";
    liveRegion.className = "sr-only";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = "";

  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 40);
}


/* ============================================================
   6. EXPENSE STATE
   ============================================================ */

function readExpenseRowsFromDOM() {
  const rows = [...document.querySelectorAll(".expense-row")];

  rows.forEach((row) => {
    registerExpenseRow(row);
  });
}


function registerExpenseRow(row) {
  if (!(row instanceof HTMLElement)) {
    return;
  }

  const id = row.dataset.expenseId;

  if (!id) {
    return;
  }

  const range = row.querySelector(".expense-range");
  const amountInput = row.querySelector(
    ".expense-amount-input input[type='number']"
  );
  const bubble = row.querySelector(".slider-value-bubble");
  const label = row.querySelector(".expense-row__name");

  if (!range || !amountInput || !bubble || !label) {
    console.warn(`Expense row "${id}" is missing required controls.`);
    return;
  }

  const minimum = parseNumericValue(
    range.min,
    parseNumericValue(row.dataset.min, 0)
  );

  const maximum = parseNumericValue(
    range.max,
    parseNumericValue(row.dataset.max, 1000)
  );

  const step = parseNumericValue(
    range.step,
    parseNumericValue(row.dataset.step, 1)
  );

  const value = clamp(
    parseNumericValue(range.value, minimum),
    minimum,
    maximum
  );

  state.expenses[id] = {
    id,
    label: label.textContent.trim(),
    value,
    minimum,
    maximum,
    step,
    color: row.dataset.color || "purple",
    custom: row.dataset.custom === "true"
  };

  range.value = String(value);
  amountInput.value = String(value);

  bindExpenseRowEvents(row);
  updateExpenseRowVisuals(row, value);
}


function bindExpenseRowEvents(row) {
  if (row.dataset.eventsBound === "true") {
    return;
  }

  const range = row.querySelector(".expense-range");
  const amountInput = row.querySelector(
    ".expense-amount-input input[type='number']"
  );
  const expandButton = row.querySelector(".expense-row__expand");

  range?.addEventListener("input", handleRangeInput);
  range?.addEventListener("change", handleRangeChange);

  amountInput?.addEventListener("input", handleAmountInput);
  amountInput?.addEventListener("change", handleAmountChange);
  amountInput?.addEventListener("blur", handleAmountBlur);
  amountInput?.addEventListener("keydown", handleAmountKeydown);

  expandButton?.addEventListener("click", handleExpenseExpand);

  row.dataset.eventsBound = "true";
}


function handleRangeInput(event) {
  const range = event.currentTarget;
  const row = range.closest(".expense-row");

  if (!row) {
    return;
  }

  const expense = state.expenses[row.dataset.expenseId];

  if (!expense) {
    return;
  }

  const value = clamp(
    parseNumericValue(range.value, expense.minimum),
    expense.minimum,
    expense.maximum
  );

  setExpenseValue(row, value, {
    updateRange: false,
    updateAmount: true,
    calculate: true,
    save: false
  });
}


function handleRangeChange(event) {
  const range = event.currentTarget;
  const row = range.closest(".expense-row");

  if (!row) {
    return;
  }

  saveState();

  const expense = state.expenses[row.dataset.expenseId];

  if (expense) {
    announce(`${expense.label} updated to ${formatCurrency(expense.value)}.`);
  }
}


function handleAmountInput(event) {
  const input = event.currentTarget;
  const row = input.closest(".expense-row");

  if (!row) {
    return;
  }

  const expense = state.expenses[row.dataset.expenseId];

  if (!expense || input.value.trim() === "") {
    return;
  }

  const value = clamp(
    parseNumericValue(input.value, expense.minimum),
    expense.minimum,
    expense.maximum
  );

  setExpenseValue(row, value, {
    updateRange: true,
    updateAmount: false,
    calculate: true,
    save: false
  });
}


function handleAmountChange(event) {
  normalizeAmountInput(event.currentTarget);
  saveState();
}


function handleAmountBlur(event) {
  normalizeAmountInput(event.currentTarget);
}


function handleAmountKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}


function normalizeAmountInput(input) {
  const row = input.closest(".expense-row");

  if (!row) {
    return;
  }

  const expense = state.expenses[row.dataset.expenseId];

  if (!expense) {
    return;
  }

  let value = parseNumericValue(input.value, expense.value);

  value = snapToStep(
    clamp(value, expense.minimum, expense.maximum),
    expense.step,
    expense.minimum
  );

  setExpenseValue(row, value, {
    updateRange: true,
    updateAmount: true,
    calculate: true,
    save: false
  });
}


function snapToStep(value, step, minimum = 0) {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }

  const snapped = Math.round((value - minimum) / step) * step + minimum;

  return Number(snapped.toFixed(8));
}


function setExpenseValue(row, value, options = {}) {
  const {
    updateRange = true,
    updateAmount = true,
    calculate = true,
    save = false
  } = options;

  const id = row.dataset.expenseId;
  const expense = state.expenses[id];

  if (!expense) {
    return;
  }

  const normalizedValue = snapToStep(
    clamp(
      parseNumericValue(value, expense.value),
      expense.minimum,
      expense.maximum
    ),
    expense.step,
    expense.minimum
  );

  expense.value = normalizedValue;
  row.dataset.value = String(normalizedValue);

  const range = row.querySelector(".expense-range");
  const amountInput = row.querySelector(
    ".expense-amount-input input[type='number']"
  );

  if (updateRange && range) {
    range.value = String(normalizedValue);
  }

  if (updateAmount && amountInput) {
    amountInput.value = String(normalizedValue);
  }

  updateExpenseRowVisuals(row, normalizedValue);

  if (calculate) {
    recalculateFinancialSummary();
  }

  if (save) {
    saveState();
  }
}


/* ============================================================
   7. SLIDER VISUALS
   ============================================================ */

function updateExpenseRowVisuals(row, value) {
  const range = row.querySelector(".expense-range");
  const bubble = row.querySelector(".slider-value-bubble");

  if (!range || !bubble) {
    return;
  }

  const minimum = parseNumericValue(range.min, 0);
  const maximum = parseNumericValue(range.max, 100);

  const percentage =
    maximum === minimum
      ? 0
      : ((value - minimum) / (maximum - minimum)) * 100;

  const safePercentage = clamp(percentage, 0, 100);

  range.style.setProperty("--range-progress", `${safePercentage}%`);

  /*
   * The bubble uses the slider percentage, with a small compensation
   * for the width of the slider thumb so it remains centered.
   */
  const thumbWidth = 30;
  const compensatedPosition = `calc(
    ${safePercentage}% +
    (${thumbWidth / 2}px - ${safePercentage * thumbWidth / 100}px)
  )`;

  bubble.style.left = compensatedPosition;
  bubble.textContent = formatCurrency(value);
  bubble.value = String(value);
}


function initializeSliderVisuals() {
  document.querySelectorAll(".expense-row").forEach((row) => {
    const id = row.dataset.expenseId;
    const expense = state.expenses[id];

    if (expense) {
      updateExpenseRowVisuals(row, expense.value);
    }
  });
}


/* ============================================================
   8. FINANCIAL CALCULATIONS
   ============================================================ */

function getVisibleExpenseTotal() {
  return Object.values(state.expenses).reduce(
    (total, expense) => total + parseNumericValue(expense.value),
    0
  );
}


function getTotalMonthlyExpenses() {
  return getVisibleExpenseTotal() + state.hiddenCategoryExpenses;
}


function calculateFinancialMetrics() {
  const monthlyIncome = state.monthlyIncome;
  const totalExpenses = getTotalMonthlyExpenses();
  const totalDebt = state.totalDebt;
  const totalSavings = state.totalSavings;

  const cashFlow =
    monthlyIncome -
    totalExpenses -
    totalDebt -
    totalSavings;

  const expensesIncomeRatio =
    monthlyIncome > 0
      ? (totalExpenses / monthlyIncome) * 100
      : 0;

  const debtIncomeRatio =
    monthlyIncome > 0
      ? (totalDebt / monthlyIncome) * 100
      : 0;

  const cashFlowPercentage =
    monthlyIncome > 0
      ? (cashFlow / monthlyIncome) * 100
      : 0;

  const emergencyFundMonths =
    state.essentialMonthlyExpenses > 0
      ? state.emergencyFund / state.essentialMonthlyExpenses
      : 0;

  return {
    monthlyIncome,
    totalExpenses,
    totalDebt,
    totalSavings,
    cashFlow,
    expensesIncomeRatio,
    debtIncomeRatio,
    cashFlowPercentage,
    emergencyFundMonths
  };
}


function recalculateFinancialSummary() {
  const metrics = calculateFinancialMetrics();

  updateCashFlowDisplay(metrics);
  updateMetricCards(metrics);
  updateCashFlowDonut(metrics);
  updateFinancialHealthStatuses(metrics);
}


function updateCashFlowDisplay(metrics) {
  const cashFlowText = formatCurrency(metrics.cashFlow);

  setText(DOM.cashFlowAmount, cashFlowText);
  setText(DOM.cashFlowFooterAmount, cashFlowText);

  setText(
    DOM.cashFlowPercentage,
    `${formatPercentage(metrics.cashFlowPercentage)} of income`
  );

  setText(
    DOM.monthlyIncomeDonut,
    formatCurrency(metrics.monthlyIncome)
  );

  setText(
    DOM.monthlyIncomeValue,
    formatCurrency(metrics.monthlyIncome)
  );

  setText(
    DOM.totalExpensesValue,
    formatSignedCurrency(metrics.totalExpenses, {
      forceNegative: true
    })
  );

  setText(
    DOM.totalDebtValue,
    formatSignedCurrency(metrics.totalDebt, {
      forceNegative: true
    })
  );

  setText(
    DOM.totalSavingsValue,
    formatSignedCurrency(metrics.totalSavings, {
      forceNegative: true,
      preserveNegativeZero: true
    })
  );

  const positive = metrics.cashFlow >= 0;

  [DOM.cashFlowAmount, DOM.cashFlowFooterAmount].forEach((element) => {
    if (!element) {
      return;
    }

    element.style.color = positive ? "var(--green)" : "var(--red)";
  });

  if (DOM.cashFlowPercentage) {
    DOM.cashFlowPercentage.style.color = positive
      ? "#2c8b4d"
      : "#c92d45";

    DOM.cashFlowPercentage.style.background = positive
      ? "#ecf8ef"
      : "#fff0f3";
  }
}


function updateMetricCards(metrics) {
  setText(
    DOM.expensesIncomeRatio,
    formatPercentage(metrics.expensesIncomeRatio)
  );

  setText(
    DOM.emergencyFundAmount,
    formatCurrency(state.emergencyFund)
  );

  setText(
    DOM.emergencyFundMonths,
    `${percentageFormatter.format(metrics.emergencyFundMonths)} months`
  );

  setText(
    DOM.debtIncomeRatio,
    formatPercentage(metrics.debtIncomeRatio)
  );
}


function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}


/* ============================================================
   9. DONUT CHART
   ============================================================ */

function updateCashFlowDonut(metrics) {
  const donut = document.querySelector(".income-donut");

  if (!donut || metrics.monthlyIncome <= 0) {
    return;
  }

  const expensePercentage = clamp(
    (metrics.totalExpenses / metrics.monthlyIncome) * 100,
    0,
    100
  );

  const debtPercentage = clamp(
    (metrics.totalDebt / metrics.monthlyIncome) * 100,
    0,
    100
  );

  const savingsPercentage = clamp(
    (metrics.totalSavings / metrics.monthlyIncome) * 100,
    0,
    100
  );

  const usedPercentage = clamp(
    expensePercentage + debtPercentage + savingsPercentage,
    0,
    100
  );

  const remainingPercentage = clamp(100 - usedPercentage, 0, 100);

  const expenseSegment = donut.querySelector(
    ".income-donut__segment--expenses"
  );

  const debtSegment = donut.querySelector(
    ".income-donut__segment--debt"
  );

  const incomeSegment = donut.querySelector(
    ".income-donut__segment--income"
  );

  if (expenseSegment) {
    expenseSegment.style.strokeDasharray =
      `${expensePercentage} ${100 - expensePercentage}`;

    expenseSegment.style.strokeDashoffset = "0";
  }

  if (debtSegment) {
    debtSegment.style.strokeDasharray =
      `${debtPercentage} ${100 - debtPercentage}`;

    debtSegment.style.strokeDashoffset =
      String(-expensePercentage);
  }

  if (incomeSegment) {
    incomeSegment.style.strokeDasharray =
      `${remainingPercentage} ${100 - remainingPercentage}`;

    incomeSegment.style.strokeDashoffset =
      String(-(expensePercentage + debtPercentage + savingsPercentage));
  }

  donut.setAttribute(
    "aria-label",
    `${formatCurrency(metrics.monthlyIncome)} monthly income. ` +
    `${formatCurrency(metrics.totalExpenses)} in expenses, ` +
    `${formatCurrency(metrics.totalDebt)} in debt payments, and ` +
    `${formatCurrency(metrics.cashFlow)} remaining cash flow.`
  );
}


/* ============================================================
   10. HEALTH STATUS LABELS
   ============================================================ */

function updateFinancialHealthStatuses(metrics) {
  const expensesCard = DOM.expensesIncomeRatio?.closest(
    ".health-metric-card"
  );

  const emergencyCard = DOM.emergencyFundMonths?.closest(
    ".health-metric-card"
  );

  const debtCard = DOM.debtIncomeRatio?.closest(
    ".health-metric-card"
  );

  const expenseStatus = expensesCard?.querySelector(".health-status");
  const emergencyStatus = emergencyCard?.querySelector(".health-status");
  const debtStatus = debtCard?.querySelector(".health-status");

  if (expenseStatus) {
    if (metrics.expensesIncomeRatio < 60) {
      setStatus(expenseStatus, "Excellent", "good");
    } else if (metrics.expensesIncomeRatio < 70) {
      setStatus(expenseStatus, "Good", "good");
    } else if (metrics.expensesIncomeRatio < 80) {
      setStatus(expenseStatus, "High", "warning");
    } else {
      setStatus(expenseStatus, "Critical", "danger");
    }
  }

  if (emergencyStatus) {
    emergencyStatus.textContent =
      `${percentageFormatter.format(metrics.emergencyFundMonths)} months`;

    if (metrics.emergencyFundMonths >= 6) {
      applyStatusAppearance(emergencyStatus, "good");
    } else if (metrics.emergencyFundMonths >= 3) {
      applyStatusAppearance(emergencyStatus, "good");
    } else if (metrics.emergencyFundMonths >= 1) {
      applyStatusAppearance(emergencyStatus, "warning");
    } else {
      applyStatusAppearance(emergencyStatus, "danger");
    }
  }

  if (debtStatus) {
    if (metrics.debtIncomeRatio < 20) {
      setStatus(debtStatus, "Low", "good");
    } else if (metrics.debtIncomeRatio < 36) {
      setStatus(debtStatus, "Good", "good");
    } else if (metrics.debtIncomeRatio < 43) {
      setStatus(debtStatus, "High", "warning");
    } else {
      setStatus(debtStatus, "Critical", "danger");
    }
  }
}


function setStatus(element, text, type) {
  element.textContent = text;
  applyStatusAppearance(element, type);
}


function applyStatusAppearance(element, type) {
  const appearances = {
    good: {
      color: "#278744",
      background: "rgba(230, 247, 233, 0.95)"
    },

    warning: {
      color: "#a66508",
      background: "rgba(255, 244, 220, 0.98)"
    },

    danger: {
      color: "#c92d45",
      background: "rgba(255, 233, 238, 0.98)"
    }
  };

  const appearance = appearances[type] || appearances.good;

  element.style.color = appearance.color;
  element.style.background = appearance.background;
}


/* ============================================================
   11. SORTING
   ============================================================ */

function handleExpenseSort() {
  const sortMode = DOM.expenseSort?.value || "high-low";
  const rows = [...DOM.expenseList.querySelectorAll(".expense-row")];

  rows.sort((firstRow, secondRow) => {
    const firstExpense = state.expenses[firstRow.dataset.expenseId];
    const secondExpense = state.expenses[secondRow.dataset.expenseId];

    if (!firstExpense || !secondExpense) {
      return 0;
    }

    if (sortMode === "low-high") {
      return firstExpense.value - secondExpense.value;
    }

    if (sortMode === "alphabetical") {
      return firstExpense.label.localeCompare(
        secondExpense.label,
        PCSU_CONFIG.locale
      );
    }

    return secondExpense.value - firstExpense.value;
  });

  rows.forEach((row) => DOM.expenseList.appendChild(row));
  saveState();
}


/* ============================================================
   12. CATEGORY TABS
   ============================================================ */

function handleCategoryTabClick(event) {
  const button = event.currentTarget;
  const category = button.dataset.category;

  if (!category) {
    return;
  }

  state.activeCategory = category;

  DOM.categoryTabs.forEach((tab) => {
    const active = tab === button;

    tab.classList.toggle("category-tab--active", active);
    tab.setAttribute("aria-pressed", String(active));
  });

  if (DOM.editorTitle) {
    DOM.editorTitle.textContent =
      PCSU_CONFIG.categoryLabels[category] ||
      "Adjust your monthly expenses";
  }

  /*
   * The initial build currently contains the Monthly Expenses rows.
   * Other tabs retain the complete shell and can be populated later.
   */
  document
    .querySelectorAll(".expense-row")
    .forEach((row) => {
      row.hidden = category !== "monthly-expenses";
    });

  if (DOM.addExpenseButton) {
    DOM.addExpenseButton.hidden = category !== "monthly-expenses";
  }

  toggleEmptyCategoryMessage(category);

  saveState();
}


function toggleEmptyCategoryMessage(category) {
  let message = document.getElementById("categoryEmptyState");

  if (category === "monthly-expenses") {
    message?.remove();
    return;
  }

  if (!message) {
    message = document.createElement("div");
    message.id = "categoryEmptyState";
    message.setAttribute("role", "status");

    Object.assign(message.style, {
      minHeight: "420px",
      display: "grid",
      placeItems: "center",
      padding: "40px 20px",
      color: "#7b8294",
      fontSize: "0.95rem",
      textAlign: "center",
      borderTop: "1px solid var(--border-soft)"
    });

    DOM.expenseList.appendChild(message);
  }

  message.textContent =
    PCSU_CONFIG.categoryEmptyMessages[category] ||
    "This category will be available soon.";
}


/* ============================================================
   13. CUSTOM EXPENSE MODAL
   ============================================================ */

function openCustomExpenseModal() {
  if (!DOM.customExpenseModal) {
    return;
  }

  DOM.customExpenseModal.hidden = false;
  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    DOM.customExpenseName?.focus();
  });
}


function closeCustomExpenseModal() {
  if (!DOM.customExpenseModal) {
    return;
  }

  DOM.customExpenseModal.hidden = true;
  document.body.style.overflow = "";

  DOM.customExpenseForm?.reset();
  DOM.addExpenseButton?.focus();
}


function handleModalBackdropClick(event) {
  if (event.target === DOM.customExpenseModal) {
    closeCustomExpenseModal();
  }
}


function handleModalKeydown(event) {
  if (
    event.key === "Escape" &&
    DOM.customExpenseModal &&
    !DOM.customExpenseModal.hidden
  ) {
    closeCustomExpenseModal();
  }
}


function handleCustomExpenseSubmit(event) {
  event.preventDefault();

  const name = DOM.customExpenseName?.value.trim();
  const amount = parseNumericValue(
    DOM.customExpenseAmount?.value,
    0
  );

  if (!name) {
    DOM.customExpenseName?.focus();
    return;
  }

  if (amount < 0) {
    DOM.customExpenseAmount?.focus();
    return;
  }

  const row = createCustomExpenseRow({
    name,
    value: amount
  });

  DOM.expenseList.appendChild(row);
  registerExpenseRow(row);

  /*
   * Refresh Lucide icons after dynamic HTML has been added.
   */
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2
      }
    });
  }

  recalculateFinancialSummary();
  saveState();
  closeCustomExpenseModal();

  announce(`${name} added at ${formatCurrency(amount)} per month.`);
}


function createCustomExpenseRow({
  id = createUniqueId("custom-expense"),
  name,
  value,
  minimum = 0,
  maximum,
  step = 5,
  color = "slate"
}) {
  const safeValue = Math.max(0, parseNumericValue(value, 0));

  const calculatedMaximum =
    maximum ??
    Math.max(
      500,
      Math.ceil((safeValue * 2.5) / 100) * 100
    );

  const row = document.createElement("article");

  row.className = "expense-row";
  row.dataset.expenseId = id;
  row.dataset.value = String(safeValue);
  row.dataset.min = String(minimum);
  row.dataset.max = String(calculatedMaximum);
  row.dataset.step = String(step);
  row.dataset.color = color;
  row.dataset.custom = "true";

  const rangeId = `${id}Range`;
  const bubbleId = `${id}Bubble`;
  const valueId = `${id}Value`;

  row.innerHTML = `
    <div class="expense-row__identity">
      <div class="expense-icon expense-icon--${escapeAttribute(color)}">
        <i data-lucide="circle-dollar-sign" aria-hidden="true"></i>
      </div>

      <h3 class="expense-row__name">
        ${escapeHTML(name)}
      </h3>
    </div>

    <div class="expense-row__slider">
      <output
        class="slider-value-bubble slider-value-bubble--${escapeAttribute(color)}"
        for="${escapeAttribute(rangeId)}"
        id="${escapeAttribute(bubbleId)}"
      >
        ${formatCurrency(safeValue)}
      </output>

      <input
        class="expense-range expense-range--${escapeAttribute(color)}"
        id="${escapeAttribute(rangeId)}"
        name="${escapeAttribute(id)}"
        type="range"
        min="${minimum}"
        max="${calculatedMaximum}"
        step="${step}"
        value="${safeValue}"
        aria-label="${escapeAttribute(name)} monthly expense"
        data-output="${escapeAttribute(valueId)}"
        data-bubble="${escapeAttribute(bubbleId)}"
      >

      <div class="expense-range-labels">
        <span>${formatCurrency(minimum)}</span>
        <span>${formatCurrency(calculatedMaximum)}</span>
      </div>
    </div>

    <div class="expense-row__amount">
      <label class="sr-only" for="${escapeAttribute(valueId)}">
        ${escapeHTML(name)} monthly amount
      </label>

      <div class="expense-amount-input expense-amount-input--${escapeAttribute(color)}">
        <span class="expense-amount-input__currency">$</span>

        <input
          id="${escapeAttribute(valueId)}"
          type="number"
          min="${minimum}"
          max="${calculatedMaximum}"
          step="${step}"
          value="${safeValue}"
          inputmode="numeric"
          aria-label="${escapeAttribute(name)} amount"
        >

        <span class="expense-amount-input__suffix">
          /mo
        </span>
      </div>
    </div>

    <button
      class="expense-row__expand"
      type="button"
      aria-label="Manage ${escapeAttribute(name)}"
      aria-expanded="false"
      data-custom-expense-action="true"
    >
      <i data-lucide="trash-2" aria-hidden="true"></i>
    </button>
  `;

  return row;
}


function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}


function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


/* ============================================================
   14. EXPENSE EXPAND / DELETE
   ============================================================ */

function handleExpenseExpand(event) {
  const button = event.currentTarget;
  const row = button.closest(".expense-row");

  if (!row) {
    return;
  }

  const id = row.dataset.expenseId;
  const expense = state.expenses[id];

  if (!expense) {
    return;
  }

  if (expense.custom) {
    const confirmed = window.confirm(
      `Remove "${expense.label}" from your monthly expenses?`
    );

    if (!confirmed) {
      return;
    }

    delete state.expenses[id];
    row.remove();

    recalculateFinancialSummary();
    saveState();

    announce(`${expense.label} removed.`);
    return;
  }

  const expanded = button.getAttribute("aria-expanded") === "true";

  button.setAttribute("aria-expanded", String(!expanded));

  const icon = button.querySelector("svg");

  if (icon) {
    icon.style.transform = expanded
      ? "rotate(0deg)"
      : "rotate(180deg)";

    icon.style.transition = "transform 160ms ease";
  }
}


/* ============================================================
   15. STEP NAVIGATION
   ============================================================ */

const STEP_ORDER = [
  "income",
  "expenses",
  "debt",
  "savings",
  "summary"
];


function handleStepClick(event) {
  const button = event.currentTarget;
  const step = button.dataset.step;

  if (!step) {
    return;
  }

  setCurrentStep(step);
}


function setCurrentStep(step) {
  if (!STEP_ORDER.includes(step)) {
    return;
  }

  state.currentStep = step;

  const activeIndex = STEP_ORDER.indexOf(step);

  DOM.stepItems.forEach((button) => {
    const itemStep = button.dataset.step;
    const itemIndex = STEP_ORDER.indexOf(itemStep);

    button.classList.toggle(
      "step-item--complete",
      itemIndex < activeIndex
    );

    button.classList.toggle(
      "step-item--active",
      itemStep === step
    );

    if (itemStep === step) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  updateNextButton(step);
  saveState();
}


function updateNextButton(step) {
  if (!DOM.nextStepButton) {
    return;
  }

  const label = DOM.nextStepButton.querySelector("span");

  const labels = {
    income: "Next: Add Expenses",
    expenses: "Next: Add Debt",
    debt: "Next: Add Savings",
    savings: "Next: View Summary",
    summary: "Financial Setup Complete"
  };

  if (label) {
    label.textContent = labels[step] || "Continue";
  }

  DOM.nextStepButton.disabled = false;
  DOM.nextStepButton.style.opacity = "1";
}


function handleNextStep() {
  const currentIndex = STEP_ORDER.indexOf(state.currentStep);

  if (currentIndex < 0) {
    setCurrentStep("expenses");
    return;
  }

  if (currentIndex === STEP_ORDER.length - 1) {
    announce("Your financial setup is complete.");
    return;
  }

  const nextStep = STEP_ORDER[currentIndex + 1];
  setCurrentStep(nextStep);

  const nextButton = DOM.stepItems.find(
    (button) => button.dataset.step === nextStep
  );

  nextButton?.focus();

  announce(
    `${nextStep.charAt(0).toUpperCase() + nextStep.slice(1)} step selected.`
  );
}


/* ============================================================
   16. LOCATION SELECTOR
   ============================================================ */

function handleLocationSelector() {
  if (!DOM.locationSelector) {
    return;
  }

  const expanded =
    DOM.locationSelector.getAttribute("aria-expanded") === "true";

  DOM.locationSelector.setAttribute(
    "aria-expanded",
    String(!expanded)
  );

  /*
   * The location menu is intentionally deferred until base-selection
   * data is connected. This feedback confirms the control is active.
   */
  if (!expanded) {
    announce(
      `Currently viewing as ${DOM.selectedLocation?.textContent || "selected location"}.`
    );
  }
}


/* ============================================================
   17. LOCAL STORAGE
   ============================================================ */

function saveState() {
  try {
    const payload = {
      version: 1,
      activeCategory: state.activeCategory,
      currentStep: state.currentStep,

      monthlyIncome: state.monthlyIncome,
      totalDebt: state.totalDebt,
      totalSavings: state.totalSavings,
      emergencyFund: state.emergencyFund,

      hiddenCategoryExpenses: state.hiddenCategoryExpenses,
      essentialMonthlyExpenses: state.essentialMonthlyExpenses,

      expenseSort: DOM.expenseSort?.value || "high-low",

      expenses: Object.values(state.expenses).map((expense) => ({
        id: expense.id,
        label: expense.label,
        value: expense.value,
        minimum: expense.minimum,
        maximum: expense.maximum,
        step: expense.step,
        color: expense.color,
        custom: expense.custom
      }))
    };

    window.localStorage.setItem(
      PCSU_CONFIG.storageKey,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.warn("PCSUnited budget state could not be saved.", error);
  }
}


function loadSavedState() {
  try {
    const stored = window.localStorage.getItem(
      PCSU_CONFIG.storageKey
    );

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== 1
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn("PCSUnited budget state could not be loaded.", error);
    return null;
  }
}


function restoreSavedState(savedState) {
  if (!savedState) {
    return;
  }

  state.monthlyIncome = parseNumericValue(
    savedState.monthlyIncome,
    state.monthlyIncome
  );

  state.totalDebt = parseNumericValue(
    savedState.totalDebt,
    state.totalDebt
  );

  state.totalSavings = parseNumericValue(
    savedState.totalSavings,
    state.totalSavings
  );

  state.emergencyFund = parseNumericValue(
    savedState.emergencyFund,
    state.emergencyFund
  );

  state.hiddenCategoryExpenses = parseNumericValue(
    savedState.hiddenCategoryExpenses,
    state.hiddenCategoryExpenses
  );

  state.essentialMonthlyExpenses = parseNumericValue(
    savedState.essentialMonthlyExpenses,
    state.essentialMonthlyExpenses
  );

  if (Array.isArray(savedState.expenses)) {
    savedState.expenses.forEach((savedExpense) => {
      if (!savedExpense?.id) {
        return;
      }

      const existingRow = DOM.expenseList.querySelector(
        `.expense-row[data-expense-id="${CSS.escape(savedExpense.id)}"]`
      );

      if (existingRow) {
        const expense = state.expenses[savedExpense.id];

        if (expense) {
          setExpenseValue(existingRow, savedExpense.value, {
            updateRange: true,
            updateAmount: true,
            calculate: false,
            save: false
          });
        }

        return;
      }

      if (savedExpense.custom) {
        const customRow = createCustomExpenseRow({
          id: savedExpense.id,
          name: savedExpense.label || "Custom Expense",
          value: savedExpense.value,
          minimum: savedExpense.minimum,
          maximum: savedExpense.maximum,
          step: savedExpense.step,
          color: savedExpense.color || "slate"
        });

        DOM.expenseList.appendChild(customRow);
        registerExpenseRow(customRow);
      }
    });
  }

  if (DOM.expenseSort && savedState.expenseSort) {
    DOM.expenseSort.value = savedState.expenseSort;
    handleExpenseSort();
  }

  if (
    savedState.activeCategory &&
    PCSU_CONFIG.categoryLabels[savedState.activeCategory]
  ) {
    const categoryButton = DOM.categoryTabs.find(
      (button) =>
        button.dataset.category === savedState.activeCategory
    );

    categoryButton?.click();
  }

  if (STEP_ORDER.includes(savedState.currentStep)) {
    setCurrentStep(savedState.currentStep);
  }
}


/* ============================================================
   18. DOM CACHE
   ============================================================ */

function cacheDOMReferences() {
  DOM.budgetApp = document.getElementById("budgetApp");

  DOM.categoryTabs = [
    ...document.querySelectorAll(".category-tab")
  ];

  DOM.editorTitle = document.getElementById("expenseEditorTitle");
  DOM.expenseList = document.getElementById("expenseList");
  DOM.expenseSort = document.getElementById("expenseSort");

  DOM.addExpenseButton = document.getElementById(
    "addExpenseButton"
  );

  DOM.customExpenseModal = document.getElementById(
    "customExpenseModal"
  );

  DOM.customExpenseForm = document.getElementById(
    "customExpenseForm"
  );

  DOM.customExpenseName = document.getElementById(
    "customExpenseName"
  );

  DOM.customExpenseAmount = document.getElementById(
    "customExpenseAmount"
  );

  DOM.closeExpenseModal = document.getElementById(
    "closeExpenseModal"
  );

  DOM.cancelExpenseModal = document.getElementById(
    "cancelExpenseModal"
  );

  DOM.cashFlowAmount = document.getElementById(
    "cashFlowAmount"
  );

  DOM.cashFlowFooterAmount = document.getElementById(
    "cashFlowFooterAmount"
  );

  DOM.cashFlowPercentage = document.getElementById(
    "cashFlowPercentage"
  );

  DOM.monthlyIncomeDonut = document.getElementById(
    "monthlyIncomeDonut"
  );

  DOM.monthlyIncomeValue = document.getElementById(
    "monthlyIncomeValue"
  );

  DOM.totalExpensesValue = document.getElementById(
    "totalExpensesValue"
  );

  DOM.totalDebtValue = document.getElementById(
    "totalDebtValue"
  );

  DOM.totalSavingsValue = document.getElementById(
    "totalSavingsValue"
  );

  DOM.expensesIncomeRatio = document.getElementById(
    "expensesIncomeRatio"
  );

  DOM.emergencyFundAmount = document.getElementById(
    "emergencyFundAmount"
  );

  DOM.emergencyFundMonths = document.getElementById(
    "emergencyFundMonths"
  );

  DOM.debtIncomeRatio = document.getElementById(
    "debtIncomeRatio"
  );

  DOM.stepItems = [
    ...document.querySelectorAll(".step-item")
  ];

  DOM.nextStepButton = document.getElementById(
    "nextStepButton"
  );

  DOM.locationSelector = document.getElementById(
    "locationSelector"
  );

  DOM.selectedLocation = document.getElementById(
    "selectedLocation"
  );
}


/* ============================================================
   19. GLOBAL EVENT BINDING
   ============================================================ */

function bindGlobalEvents() {
  DOM.expenseSort?.addEventListener(
    "change",
    handleExpenseSort
  );

  DOM.categoryTabs.forEach((button) => {
    button.addEventListener(
      "click",
      handleCategoryTabClick
    );
  });

  DOM.addExpenseButton?.addEventListener(
    "click",
    openCustomExpenseModal
  );

  DOM.closeExpenseModal?.addEventListener(
    "click",
    closeCustomExpenseModal
  );

  DOM.cancelExpenseModal?.addEventListener(
    "click",
    closeCustomExpenseModal
  );

  DOM.customExpenseModal?.addEventListener(
    "click",
    handleModalBackdropClick
  );

  DOM.customExpenseForm?.addEventListener(
    "submit",
    handleCustomExpenseSubmit
  );

  document.addEventListener(
    "keydown",
    handleModalKeydown
  );

  DOM.stepItems.forEach((button) => {
    button.addEventListener(
      "click",
      handleStepClick
    );
  });

  DOM.nextStepButton?.addEventListener(
    "click",
    handleNextStep
  );

  DOM.locationSelector?.addEventListener(
    "click",
    handleLocationSelector
  );

  window.addEventListener(
    "resize",
    initializeSliderVisuals,
    { passive: true }
  );

  window.addEventListener("beforeunload", saveState);
}


/* ============================================================
   20. PUBLIC API
   ============================================================ */

window.PCSUnitedFinancial = {
  getState() {
    return structuredClone
      ? structuredClone(state)
      : JSON.parse(JSON.stringify(state));
  },

  getMetrics() {
    return calculateFinancialMetrics();
  },

  updateIncome(value) {
    state.monthlyIncome = Math.max(
      0,
      parseNumericValue(value, state.monthlyIncome)
    );

    recalculateFinancialSummary();
    saveState();
  },

  updateDebt(value) {
    state.totalDebt = Math.max(
      0,
      parseNumericValue(value, state.totalDebt)
    );

    recalculateFinancialSummary();
    saveState();
  },

  updateSavings(value) {
    state.totalSavings = Math.max(
      0,
      parseNumericValue(value, state.totalSavings)
    );

    recalculateFinancialSummary();
    saveState();
  },

  updateEmergencyFund(value) {
    state.emergencyFund = Math.max(
      0,
      parseNumericValue(value, state.emergencyFund)
    );

    recalculateFinancialSummary();
    saveState();
  },

  reset() {
    try {
      window.localStorage.removeItem(PCSU_CONFIG.storageKey);
      window.location.reload();
    } catch (error) {
      console.warn("PCSUnited budget could not be reset.", error);
    }
  }
};


/* ============================================================
   21. INITIALIZATION
   ============================================================ */

function initializeApplication() {
  cacheDOMReferences();

  if (!DOM.budgetApp || !DOM.expenseList) {
    console.error(
      "PCSUnited Financial could not initialize because required DOM elements are missing."
    );

    return;
  }

  readExpenseRowsFromDOM();
  bindGlobalEvents();

  const savedState = loadSavedState();

  restoreSavedState(savedState);

  initializeSliderVisuals();
  recalculateFinancialSummary();

  /*
   * Recreate icons after any custom rows have been restored.
   */
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2
      }
    });
  }

  document.documentElement.classList.add("pcsu-financial-ready");

  window.dispatchEvent(
    new CustomEvent("pcsunited:financial-ready", {
      detail: {
        state: window.PCSUnitedFinancial.getState(),
        metrics: calculateFinancialMetrics()
      }
    })
  );
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApplication,
    { once: true }
  );
} else {
  initializeApplication();
}
