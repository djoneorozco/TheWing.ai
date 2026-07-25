/* ============================================================
   PCSUnited Financial
   Monthly Budget Builder
   app.js — CATEGORY-BASED BUILD v2.0.0

   REPLACES THE CURRENT app.js

   INCLUDED CATEGORIES
   - Monthly Expenses
   - Debt
   - Lifestyle
   - Other

   CORE RULE
   - Monthly Expenses, Lifestyle, and Other count toward Total Expenses.
   - Debt payments count toward Total Debt.
   - All values update cash flow in real time.
   ============================================================ */

"use strict";


/* ============================================================
   1. CONFIGURATION
   ============================================================ */

const PCSU_CONFIG = Object.freeze({
  locale: "en-US",
  currency: "USD",
  storageKey: "pcsunited.financialBudget.v2",

  monthlyIncome: 7910,
  totalSavings: 0,
  emergencyFund: 6000,
  essentialMonthlyExpenses: 1875,

  categoryOrder: [
    "monthly-expenses",
    "debt",
    "lifestyle",
    "other"
  ],

  categoryLabels: {
    "monthly-expenses": "Adjust your monthly expenses",
    debt: "Adjust your monthly debt payments",
    lifestyle: "Adjust your lifestyle spending",
    other: "Adjust your other monthly expenses"
  },

  addButtonLabels: {
    "monthly-expenses": "Add Custom Expense",
    debt: "Add Custom Debt",
    lifestyle: "Add Lifestyle Expense",
    other: "Add Other Expense"
  }
});


/* ============================================================
   2. DEFAULT CATEGORY DATA
   ============================================================ */

const DEFAULT_ITEMS = Object.freeze({
  "monthly-expenses": [
    {
      id: "groceries",
      label: "Groceries",
      icon: "utensils",
      color: "purple",
      value: 650,
      min: 200,
      max: 1500,
      step: 10
    },
    {
      id: "utilities",
      label: "Utilities",
      icon: "zap",
      color: "blue",
      value: 280,
      min: 80,
      max: 600,
      step: 10
    },
    {
      id: "phone-internet",
      label: "Phone / Internet",
      icon: "smartphone",
      color: "teal",
      value: 120,
      min: 40,
      max: 250,
      step: 5
    },
    {
      id: "childcare-education",
      label: "Childcare / Education",
      icon: "graduation-cap",
      color: "purple",
      value: 450,
      min: 0,
      max: 1200,
      step: 10
    },
    {
      id: "health-medical",
      label: "Health / Medical",
      icon: "heart-pulse",
      color: "red",
      value: 150,
      min: 50,
      max: 600,
      step: 5
    },
    {
      id: "insurance-other",
      label: "Insurance (Other)",
      icon: "shield-check",
      color: "orange",
      value: 195,
      min: 50,
      max: 500,
      step: 5
    },
    {
      id: "personal-misc",
      label: "Personal / Misc.",
      icon: "ellipsis",
      color: "slate",
      value: 165,
      min: 50,
      max: 600,
      step: 5
    }
  ],

  debt: [
    {
      id: "mortgage",
      label: "Mortgage / Home Loan",
      icon: "house",
      color: "purple",
      value: 0,
      min: 0,
      max: 4000,
      step: 25
    },
    {
      id: "auto-loan",
      label: "Auto Loan",
      icon: "car-front",
      color: "blue",
      value: 620,
      min: 0,
      max: 1800,
      step: 10
    },
    {
      id: "credit-cards",
      label: "Credit Card Minimums",
      icon: "credit-card",
      color: "red",
      value: 250,
      min: 0,
      max: 1500,
      step: 10
    },
    {
      id: "student-loans",
      label: "Student Loans",
      icon: "graduation-cap",
      color: "teal",
      value: 250,
      min: 0,
      max: 1800,
      step: 10
    },
    {
      id: "personal-loans",
      label: "Personal Loans",
      icon: "landmark",
      color: "orange",
      value: 200,
      min: 0,
      max: 1500,
      step: 10
    },
    {
      id: "other-debt",
      label: "Other Debt Payments",
      icon: "receipt-text",
      color: "slate",
      value: 0,
      min: 0,
      max: 1500,
      step: 10
    }
  ],

  lifestyle: [
    {
      id: "dining-out",
      label: "Dining Out",
      icon: "utensils-crossed",
      color: "orange",
      value: 250,
      min: 0,
      max: 1000,
      step: 10
    },
    {
      id: "entertainment",
      label: "Entertainment",
      icon: "monitor-play",
      color: "pink",
      value: 150,
      min: 0,
      max: 800,
      step: 5
    },
    {
      id: "subscriptions",
      label: "Subscriptions",
      icon: "repeat-2",
      color: "purple",
      value: 85,
      min: 0,
      max: 400,
      step: 5
    },
    {
      id: "fitness-wellness",
      label: "Fitness / Wellness",
      icon: "dumbbell",
      color: "blue",
      value: 75,
      min: 0,
      max: 500,
      step: 5
    },
    {
      id: "shopping",
      label: "Shopping",
      icon: "shopping-bag",
      color: "pink",
      value: 150,
      min: 0,
      max: 1200,
      step: 10
    },
    {
      id: "travel-vacation",
      label: "Travel / Vacation",
      icon: "plane",
      color: "teal",
      value: 100,
      min: 0,
      max: 1500,
      step: 10
    },
    {
      id: "hobbies-recreation",
      label: "Hobbies / Recreation",
      icon: "gamepad-2",
      color: "purple",
      value: 100,
      min: 0,
      max: 800,
      step: 10
    },
    {
      id: "pet-care",
      label: "Pet Care",
      icon: "paw-print",
      color: "slate",
      value: 75,
      min: 0,
      max: 600,
      step: 5
    }
  ],

  other: [
    {
      id: "rent",
      label: "Rent",
      icon: "building-2",
      color: "purple",
      value: 0,
      min: 0,
      max: 4000,
      step: 25
    },
    {
      id: "gas-fuel",
      label: "Gas / Fuel",
      icon: "fuel",
      color: "orange",
      value: 250,
      min: 0,
      max: 1000,
      step: 10
    },
    {
      id: "vehicle-maintenance",
      label: "Vehicle Maintenance",
      icon: "wrench",
      color: "blue",
      value: 100,
      min: 0,
      max: 800,
      step: 10
    },
    {
      id: "parking-tolls",
      label: "Parking / Tolls",
      icon: "circle-parking",
      color: "teal",
      value: 50,
      min: 0,
      max: 500,
      step: 5
    },
    {
      id: "giving-charity",
      label: "Giving / Charity",
      icon: "hand-heart",
      color: "red",
      value: 100,
      min: 0,
      max: 1500,
      step: 10
    },
    {
      id: "support-payments",
      label: "Support Payments",
      icon: "users",
      color: "slate",
      value: 0,
      min: 0,
      max: 2500,
      step: 25
    },
    {
      id: "storage-fees",
      label: "Storage / Recurring Fees",
      icon: "archive",
      color: "purple",
      value: 0,
      min: 0,
      max: 800,
      step: 10
    }
  ]
});


/* ============================================================
   3. FORMATTERS
   ============================================================ */

const currencyFormatter = new Intl.NumberFormat(PCSU_CONFIG.locale, {
  style: "currency",
  currency: PCSU_CONFIG.currency,
  maximumFractionDigits: 0
});

const percentageFormatter = new Intl.NumberFormat(PCSU_CONFIG.locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});


/* ============================================================
   4. STATE
   ============================================================ */

const state = {
  activeCategory: "monthly-expenses",
  currentStep: "expenses",
  monthlyIncome: PCSU_CONFIG.monthlyIncome,
  totalSavings: PCSU_CONFIG.totalSavings,
  emergencyFund: PCSU_CONFIG.emergencyFund,
  essentialMonthlyExpenses: PCSU_CONFIG.essentialMonthlyExpenses,
  sortMode: "high-low",
  categories: createDefaultCategoryState()
};


function createDefaultCategoryState() {
  const categories = {};

  for (const category of PCSU_CONFIG.categoryOrder) {
    categories[category] = DEFAULT_ITEMS[category].map((item) => ({
      ...item,
      category,
      custom: false
    }));
  }

  return categories;
}


/* ============================================================
   5. DOM
   ============================================================ */

const DOM = {
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
  customExpenseTitle: null,

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
   6. HELPERS
   ============================================================ */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function formatCurrency(value) {
  return currencyFormatter.format(toNumber(value));
}


function formatNegativeCurrency(value) {
  return `-${formatCurrency(Math.abs(toNumber(value)))}`;
}


function formatPercentage(value) {
  return `${percentageFormatter.format(toNumber(value))}%`;
}


function snapToStep(value, step, min = 0) {
  if (!Number.isFinite(step) || step <= 0) return value;

  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(8));
}


function escapeHTML(value) {
  const node = document.createElement("div");
  node.textContent = String(value);
  return node.innerHTML;
}


function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


function createUniqueId(prefix = "custom") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}


function getActiveItems() {
  return state.categories[state.activeCategory] || [];
}


function findItem(category, id) {
  return state.categories[category]?.find((item) => item.id === id);
}


function setText(element, value) {
  if (element) element.textContent = value;
}


/* ============================================================
   7. CATEGORY TOTALS
   ============================================================ */

function sumCategory(category) {
  return (state.categories[category] || []).reduce(
    (sum, item) => sum + toNumber(item.value),
    0
  );
}


function getTotalExpenses() {
  return (
    sumCategory("monthly-expenses") +
    sumCategory("lifestyle") +
    sumCategory("other")
  );
}


function getTotalDebt() {
  return sumCategory("debt");
}


function calculateMetrics() {
  const monthlyIncome = state.monthlyIncome;
  const totalExpenses = getTotalExpenses();
  const totalDebt = getTotalDebt();
  const totalSavings = state.totalSavings;

  const cashFlow =
    monthlyIncome -
    totalExpenses -
    totalDebt -
    totalSavings;

  return {
    monthlyIncome,
    totalExpenses,
    totalDebt,
    totalSavings,
    cashFlow,

    cashFlowPercentage:
      monthlyIncome > 0 ? (cashFlow / monthlyIncome) * 100 : 0,

    expensesIncomeRatio:
      monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 0,

    debtIncomeRatio:
      monthlyIncome > 0 ? (totalDebt / monthlyIncome) * 100 : 0,

    emergencyFundMonths:
      state.essentialMonthlyExpenses > 0
        ? state.emergencyFund / state.essentialMonthlyExpenses
        : 0
  };
}


/* ============================================================
   8. RENDER ACTIVE CATEGORY
   ============================================================ */

function renderActiveCategory() {
  if (!DOM.expenseList) return;

  const items = sortItems([...getActiveItems()], state.sortMode);

  DOM.expenseList.innerHTML = items.map(createExpenseRowHTML).join("");

  if (DOM.editorTitle) {
    DOM.editorTitle.textContent =
      PCSU_CONFIG.categoryLabels[state.activeCategory];
  }

  if (DOM.addExpenseButton) {
    const label = DOM.addExpenseButton.querySelector(
      ".add-expense-button__label"
    );

    if (label) {
      label.textContent =
        PCSU_CONFIG.addButtonLabels[state.activeCategory];
    }

    DOM.addExpenseButton.hidden = false;
  }

  updateAllSliderVisuals();

  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2
      }
    });
  }
}


function sortItems(items, mode) {
  if (mode === "low-high") {
    return items.sort((a, b) => a.value - b.value);
  }

  if (mode === "alphabetical") {
    return items.sort((a, b) =>
      a.label.localeCompare(b.label, PCSU_CONFIG.locale)
    );
  }

  return items.sort((a, b) => b.value - a.value);
}


function createExpenseRowHTML(item) {
  const rangeId = `${item.category}-${item.id}-range`;
  const valueId = `${item.category}-${item.id}-value`;
  const bubbleId = `${item.category}-${item.id}-bubble`;

  return `
    <article
      class="expense-row"
      data-category="${escapeAttribute(item.category)}"
      data-expense-id="${escapeAttribute(item.id)}"
      data-color="${escapeAttribute(item.color)}"
      data-custom="${item.custom ? "true" : "false"}"
    >
      <div class="expense-row__identity">
        <div class="expense-icon expense-icon--${escapeAttribute(item.color)}">
          <i data-lucide="${escapeAttribute(item.icon)}" aria-hidden="true"></i>
        </div>

        <h3 class="expense-row__name">
          ${escapeHTML(item.label)}
        </h3>
      </div>

      <div class="expense-row__slider">
        <output
          class="slider-value-bubble slider-value-bubble--${escapeAttribute(item.color)}"
          id="${escapeAttribute(bubbleId)}"
          for="${escapeAttribute(rangeId)}"
        >
          ${formatCurrency(item.value)}
        </output>

        <input
          class="expense-range expense-range--${escapeAttribute(item.color)}"
          id="${escapeAttribute(rangeId)}"
          type="range"
          min="${item.min}"
          max="${item.max}"
          step="${item.step}"
          value="${item.value}"
          aria-label="${escapeAttribute(item.label)} monthly amount"
        >

        <div class="expense-range-labels">
          <span>${formatCurrency(item.min)}</span>
          <span>${formatCurrency(item.max)}</span>
        </div>
      </div>

      <div class="expense-row__amount">
        <label class="sr-only" for="${escapeAttribute(valueId)}">
          ${escapeHTML(item.label)} monthly amount
        </label>

        <div class="expense-amount-input expense-amount-input--${escapeAttribute(item.color)}">
          <span class="expense-amount-input__currency">$</span>

          <input
            id="${escapeAttribute(valueId)}"
            type="number"
            min="${item.min}"
            max="${item.max}"
            step="${item.step}"
            value="${item.value}"
            inputmode="numeric"
            aria-label="${escapeAttribute(item.label)} amount"
          >

          <span class="expense-amount-input__suffix">/mo</span>
        </div>
      </div>

      <button
        class="expense-row__expand"
        type="button"
        aria-label="${
          item.custom
            ? `Remove ${escapeAttribute(item.label)}`
            : `View ${escapeAttribute(item.label)} details`
        }"
        aria-expanded="false"
      >
        <i
          data-lucide="${item.custom ? "trash-2" : "chevron-down"}"
          aria-hidden="true"
        ></i>
      </button>
    </article>
  `;
}


/* ============================================================
   9. SLIDER INTERACTIONS
   ============================================================ */

function handleExpenseListInput(event) {
  const row = event.target.closest(".expense-row");
  if (!row) return;

  const category = row.dataset.category;
  const id = row.dataset.expenseId;
  const item = findItem(category, id);
  if (!item) return;

  if (event.target.matches(".expense-range")) {
    setItemValue(
      item,
      event.target.value,
      row,
      "range"
    );
  }

  if (
    event.target.matches(
      ".expense-amount-input input[type='number']"
    )
  ) {
    if (event.target.value.trim() === "") return;

    setItemValue(
      item,
      event.target.value,
      row,
      "number"
    );
  }
}


function handleExpenseListChange(event) {
  const row = event.target.closest(".expense-row");
  if (!row) return;

  const item = findItem(
    row.dataset.category,
    row.dataset.expenseId
  );

  if (!item) return;

  if (
    event.target.matches(".expense-range") ||
    event.target.matches(
      ".expense-amount-input input[type='number']"
    )
  ) {
    const normalized = normalizeItemValue(
      item,
      event.target.value
    );

    item.value = normalized;

    const range = row.querySelector(".expense-range");
    const numberInput = row.querySelector(
      ".expense-amount-input input[type='number']"
    );

    if (range) range.value = String(normalized);
    if (numberInput) numberInput.value = String(normalized);

    updateSliderVisual(row, item);
    updateFinancialSummary();
    saveState();
  }
}


function handleExpenseListClick(event) {
  const button = event.target.closest(".expense-row__expand");
  if (!button) return;

  const row = button.closest(".expense-row");
  if (!row) return;

  const category = row.dataset.category;
  const id = row.dataset.expenseId;
  const item = findItem(category, id);

  if (!item) return;

  if (item.custom) {
    const shouldDelete = window.confirm(
      `Remove "${item.label}" from this category?`
    );

    if (!shouldDelete) return;

    state.categories[category] =
      state.categories[category].filter(
        (candidate) => candidate.id !== id
      );

    renderActiveCategory();
    updateFinancialSummary();
    saveState();
    return;
  }

  const expanded = button.getAttribute("aria-expanded") === "true";
  button.setAttribute("aria-expanded", String(!expanded));

  const svg = button.querySelector("svg");
  if (svg) {
    svg.style.transition = "transform 160ms ease";
    svg.style.transform = expanded
      ? "rotate(0deg)"
      : "rotate(180deg)";
  }
}


function setItemValue(item, rawValue, row, source) {
  const normalized = normalizeItemValue(item, rawValue);
  item.value = normalized;

  const range = row.querySelector(".expense-range");
  const numberInput = row.querySelector(
    ".expense-amount-input input[type='number']"
  );

  if (source !== "range" && range) {
    range.value = String(normalized);
  }

  if (source !== "number" && numberInput) {
    numberInput.value = String(normalized);
  }

  updateSliderVisual(row, item);
  updateFinancialSummary();
}


function normalizeItemValue(item, rawValue) {
  const clamped = clamp(
    toNumber(rawValue, item.value),
    item.min,
    item.max
  );

  return snapToStep(clamped, item.step, item.min);
}


function updateAllSliderVisuals() {
  DOM.expenseList
    ?.querySelectorAll(".expense-row")
    .forEach((row) => {
      const item = findItem(
        row.dataset.category,
        row.dataset.expenseId
      );

      if (item) updateSliderVisual(row, item);
    });
}


function updateSliderVisual(row, item) {
  const range = row.querySelector(".expense-range");
  const bubble = row.querySelector(".slider-value-bubble");

  if (!range || !bubble) return;

  const percentage =
    item.max === item.min
      ? 0
      : ((item.value - item.min) /
          (item.max - item.min)) *
        100;

  const safePercentage = clamp(percentage, 0, 100);

  range.style.setProperty(
    "--range-progress",
    `${safePercentage}%`
  );

  const thumbWidth = 30;

  bubble.style.left = `calc(
    ${safePercentage}% +
    (${thumbWidth / 2}px -
    ${safePercentage * thumbWidth / 100}px)
  )`;

  bubble.textContent = formatCurrency(item.value);
}


/* ============================================================
   10. CATEGORY TABS
   ============================================================ */

function handleCategoryTabClick(event) {
  const tab = event.currentTarget;
  const category = tab.dataset.category;

  if (!PCSU_CONFIG.categoryOrder.includes(category)) return;

  state.activeCategory = category;

  DOM.categoryTabs.forEach((candidate) => {
    const active = candidate.dataset.category === category;

    candidate.classList.toggle(
      "category-tab--active",
      active
    );

    candidate.setAttribute(
      "aria-pressed",
      String(active)
    );
  });

  renderActiveCategory();
  saveState();
}


/* ============================================================
   11. SORTING
   ============================================================ */

function handleSortChange() {
  state.sortMode = DOM.expenseSort?.value || "high-low";
  renderActiveCategory();
  saveState();
}


/* ============================================================
   12. CUSTOM ITEM MODAL
   ============================================================ */

function openCustomItemModal() {
  if (!DOM.customExpenseModal) return;

  const categoryName =
    state.activeCategory === "debt"
      ? "Debt"
      : state.activeCategory === "lifestyle"
        ? "Lifestyle Expense"
        : state.activeCategory === "other"
          ? "Other Expense"
          : "Custom Expense";

  if (DOM.customExpenseTitle) {
    DOM.customExpenseTitle.textContent = `Add ${categoryName}`;
  }

  DOM.customExpenseModal.hidden = false;
  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    DOM.customExpenseName?.focus();
  });
}


function closeCustomItemModal() {
  if (!DOM.customExpenseModal) return;

  DOM.customExpenseModal.hidden = true;
  document.body.style.overflow = "";
  DOM.customExpenseForm?.reset();
  DOM.addExpenseButton?.focus();
}


function handleCustomItemSubmit(event) {
  event.preventDefault();

  const label = DOM.customExpenseName?.value.trim();
  const value = Math.max(
    0,
    toNumber(DOM.customExpenseAmount?.value, 0)
  );

  if (!label) {
    DOM.customExpenseName?.focus();
    return;
  }

  const max = Math.max(
    state.activeCategory === "debt" ? 1500 : 500,
    Math.ceil((value * 2.5) / 100) * 100
  );

  state.categories[state.activeCategory].push({
    id: createUniqueId(state.activeCategory),
    category: state.activeCategory,
    label,
    icon:
      state.activeCategory === "debt"
        ? "receipt-text"
        : "circle-dollar-sign",
    color: "slate",
    value,
    min: 0,
    max,
    step: 5,
    custom: true
  });

  closeCustomItemModal();
  renderActiveCategory();
  updateFinancialSummary();
  saveState();
}


/* ============================================================
   13. FINANCIAL SUMMARY
   ============================================================ */

function updateFinancialSummary() {
  const metrics = calculateMetrics();

  setText(DOM.cashFlowAmount, formatCurrency(metrics.cashFlow));
  setText(
    DOM.cashFlowFooterAmount,
    formatCurrency(metrics.cashFlow)
  );

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
    formatNegativeCurrency(metrics.totalExpenses)
  );

  setText(
    DOM.totalDebtValue,
    formatNegativeCurrency(metrics.totalDebt)
  );

  setText(
    DOM.totalSavingsValue,
    metrics.totalSavings === 0
      ? "-$0"
      : formatNegativeCurrency(metrics.totalSavings)
  );

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
    `${percentageFormatter.format(
      metrics.emergencyFundMonths
    )} months`
  );

  setText(
    DOM.debtIncomeRatio,
    formatPercentage(metrics.debtIncomeRatio)
  );

  updateCashFlowAppearance(metrics);
  updateHealthStatuses(metrics);
  updateDonut(metrics);
}


function updateCashFlowAppearance(metrics) {
  const positive = metrics.cashFlow >= 0;

  for (const element of [
    DOM.cashFlowAmount,
    DOM.cashFlowFooterAmount
  ]) {
    if (element) {
      element.style.color = positive
        ? "var(--green)"
        : "var(--red)";
    }
  }

  if (DOM.cashFlowPercentage) {
    DOM.cashFlowPercentage.style.color = positive
      ? "#2c8b4d"
      : "#c92d45";

    DOM.cashFlowPercentage.style.background = positive
      ? "#ecf8ef"
      : "#fff0f3";
  }
}


function updateHealthStatuses(metrics) {
  const expenseStatus =
    DOM.expensesIncomeRatio
      ?.closest(".health-metric-card")
      ?.querySelector(".health-status");

  const emergencyStatus =
    DOM.emergencyFundMonths
      ?.closest(".health-metric-card")
      ?.querySelector(".health-status");

  const debtStatus =
    DOM.debtIncomeRatio
      ?.closest(".health-metric-card")
      ?.querySelector(".health-status");

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
      `${percentageFormatter.format(
        metrics.emergencyFundMonths
      )} months`;

    applyStatusStyle(
      emergencyStatus,
      metrics.emergencyFundMonths >= 3
        ? "good"
        : metrics.emergencyFundMonths >= 1
          ? "warning"
          : "danger"
    );
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
  applyStatusStyle(element, type);
}


function applyStatusStyle(element, type) {
  const styles = {
    good: {
      color: "#278744",
      background: "rgba(230,247,233,.95)"
    },
    warning: {
      color: "#a66508",
      background: "rgba(255,244,220,.98)"
    },
    danger: {
      color: "#c92d45",
      background: "rgba(255,233,238,.98)"
    }
  };

  const style = styles[type] || styles.good;

  element.style.color = style.color;
  element.style.background = style.background;
}


function updateDonut(metrics) {
  const donut = document.querySelector(".income-donut");
  if (!donut || metrics.monthlyIncome <= 0) return;

  const expensePercent = clamp(
    (metrics.totalExpenses / metrics.monthlyIncome) * 100,
    0,
    100
  );

  const debtPercent = clamp(
    (metrics.totalDebt / metrics.monthlyIncome) * 100,
    0,
    100
  );

  const used = clamp(
    expensePercent + debtPercent,
    0,
    100
  );

  const remaining = 100 - used;

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
      `${expensePercent} ${100 - expensePercent}`;
    expenseSegment.style.strokeDashoffset = "0";
  }

  if (debtSegment) {
    debtSegment.style.strokeDasharray =
      `${debtPercent} ${100 - debtPercent}`;
    debtSegment.style.strokeDashoffset =
      String(-expensePercent);
  }

  if (incomeSegment) {
    incomeSegment.style.strokeDasharray =
      `${remaining} ${100 - remaining}`;
    incomeSegment.style.strokeDashoffset =
      String(-(expensePercent + debtPercent));
  }
}


/* ============================================================
   14. STEP NAVIGATION
   ============================================================ */

const STEP_ORDER = [
  "income",
  "expenses",
  "debt",
  "savings",
  "summary"
];


function setCurrentStep(step) {
  if (!STEP_ORDER.includes(step)) return;

  state.currentStep = step;
  const activeIndex = STEP_ORDER.indexOf(step);

  DOM.stepItems.forEach((button) => {
    const buttonStep = button.dataset.step;
    const buttonIndex = STEP_ORDER.indexOf(buttonStep);

    button.classList.toggle(
      "step-item--complete",
      buttonIndex < activeIndex
    );

    button.classList.toggle(
      "step-item--active",
      buttonStep === step
    );

    if (buttonStep === step) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  updateNextButton();
  saveState();
}


function updateNextButton() {
  if (!DOM.nextStepButton) return;

  const labels = {
    income: "Next: Add Expenses",
    expenses: "Next: Add Debt",
    debt: "Next: Add Savings",
    savings: "Next: View Summary",
    summary: "Financial Setup Complete"
  };

  const label = DOM.nextStepButton.querySelector("span");

  if (label) {
    label.textContent =
      labels[state.currentStep] || "Continue";
  }
}


function handleNextStep() {
  const currentIndex =
    STEP_ORDER.indexOf(state.currentStep);

  if (currentIndex >= STEP_ORDER.length - 1) return;

  setCurrentStep(STEP_ORDER[currentIndex + 1]);
}


/* ============================================================
   15. STORAGE
   ============================================================ */

function saveState() {
  try {
    window.localStorage.setItem(
      PCSU_CONFIG.storageKey,
      JSON.stringify({
        version: 2,
        ...state
      })
    );
  } catch (error) {
    console.warn("Budget state could not be saved.", error);
  }
}


function loadState() {
  try {
    const raw = window.localStorage.getItem(
      PCSU_CONFIG.storageKey
    );

    if (!raw) return;

    const saved = JSON.parse(raw);

    if (
      !saved ||
      saved.version !== 2 ||
      !saved.categories
    ) {
      return;
    }

    state.activeCategory =
      PCSU_CONFIG.categoryOrder.includes(
        saved.activeCategory
      )
        ? saved.activeCategory
        : state.activeCategory;

    state.currentStep =
      STEP_ORDER.includes(saved.currentStep)
        ? saved.currentStep
        : state.currentStep;

    state.monthlyIncome = toNumber(
      saved.monthlyIncome,
      state.monthlyIncome
    );

    state.totalSavings = toNumber(
      saved.totalSavings,
      state.totalSavings
    );

    state.emergencyFund = toNumber(
      saved.emergencyFund,
      state.emergencyFund
    );

    state.essentialMonthlyExpenses = toNumber(
      saved.essentialMonthlyExpenses,
      state.essentialMonthlyExpenses
    );

    state.sortMode = saved.sortMode || state.sortMode;

    for (const category of PCSU_CONFIG.categoryOrder) {
      if (Array.isArray(saved.categories[category])) {
        state.categories[category] =
          saved.categories[category];
      }
    }
  } catch (error) {
    console.warn("Budget state could not be loaded.", error);
  }
}


/* ============================================================
   16. DOM CACHE
   ============================================================ */

function cacheDOM() {
  DOM.categoryTabs = [
    ...document.querySelectorAll(".category-tab")
  ];

  DOM.editorTitle =
    document.getElementById("expenseEditorTitle");

  DOM.expenseList =
    document.getElementById("expenseList");

  DOM.expenseSort =
    document.getElementById("expenseSort");

  DOM.addExpenseButton =
    document.getElementById("addExpenseButton");

  DOM.customExpenseModal =
    document.getElementById("customExpenseModal");

  DOM.customExpenseForm =
    document.getElementById("customExpenseForm");

  DOM.customExpenseName =
    document.getElementById("customExpenseName");

  DOM.customExpenseAmount =
    document.getElementById("customExpenseAmount");

  DOM.closeExpenseModal =
    document.getElementById("closeExpenseModal");

  DOM.cancelExpenseModal =
    document.getElementById("cancelExpenseModal");

  DOM.customExpenseTitle =
    document.getElementById("customExpenseTitle");

  DOM.cashFlowAmount =
    document.getElementById("cashFlowAmount");

  DOM.cashFlowFooterAmount =
    document.getElementById("cashFlowFooterAmount");

  DOM.cashFlowPercentage =
    document.getElementById("cashFlowPercentage");

  DOM.monthlyIncomeDonut =
    document.getElementById("monthlyIncomeDonut");

  DOM.monthlyIncomeValue =
    document.getElementById("monthlyIncomeValue");

  DOM.totalExpensesValue =
    document.getElementById("totalExpensesValue");

  DOM.totalDebtValue =
    document.getElementById("totalDebtValue");

  DOM.totalSavingsValue =
    document.getElementById("totalSavingsValue");

  DOM.expensesIncomeRatio =
    document.getElementById("expensesIncomeRatio");

  DOM.emergencyFundAmount =
    document.getElementById("emergencyFundAmount");

  DOM.emergencyFundMonths =
    document.getElementById("emergencyFundMonths");

  DOM.debtIncomeRatio =
    document.getElementById("debtIncomeRatio");

  DOM.stepItems = [
    ...document.querySelectorAll(".step-item")
  ];

  DOM.nextStepButton =
    document.getElementById("nextStepButton");

  DOM.locationSelector =
    document.getElementById("locationSelector");

  DOM.selectedLocation =
    document.getElementById("selectedLocation");
}


/* ============================================================
   17. EVENTS
   ============================================================ */

function bindEvents() {
  DOM.categoryTabs.forEach((tab) => {
    tab.addEventListener(
      "click",
      handleCategoryTabClick
    );
  });

  DOM.expenseSort?.addEventListener(
    "change",
    handleSortChange
  );

  DOM.expenseList?.addEventListener(
    "input",
    handleExpenseListInput
  );

  DOM.expenseList?.addEventListener(
    "change",
    handleExpenseListChange
  );

  DOM.expenseList?.addEventListener(
    "click",
    handleExpenseListClick
  );

  DOM.addExpenseButton?.addEventListener(
    "click",
    openCustomItemModal
  );

  DOM.closeExpenseModal?.addEventListener(
    "click",
    closeCustomItemModal
  );

  DOM.cancelExpenseModal?.addEventListener(
    "click",
    closeCustomItemModal
  );

  DOM.customExpenseModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === DOM.customExpenseModal) {
        closeCustomItemModal();
      }
    }
  );

  DOM.customExpenseForm?.addEventListener(
    "submit",
    handleCustomItemSubmit
  );

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      DOM.customExpenseModal &&
      !DOM.customExpenseModal.hidden
    ) {
      closeCustomItemModal();
    }
  });

  DOM.stepItems.forEach((button) => {
    button.addEventListener("click", () => {
      setCurrentStep(button.dataset.step);
    });
  });

  DOM.nextStepButton?.addEventListener(
    "click",
    handleNextStep
  );

  window.addEventListener(
    "resize",
    updateAllSliderVisuals,
    { passive: true }
  );

  window.addEventListener(
    "beforeunload",
    saveState
  );
}


/* ============================================================
   18. INITIALIZE ACTIVE UI
   ============================================================ */

function syncActiveCategoryTab() {
  DOM.categoryTabs.forEach((tab) => {
    const active =
      tab.dataset.category === state.activeCategory;

    tab.classList.toggle(
      "category-tab--active",
      active
    );

    tab.setAttribute(
      "aria-pressed",
      String(active)
    );
  });
}


/* ============================================================
   19. PUBLIC API
   ============================================================ */

window.PCSUnitedFinancial = {
  getState() {
    return JSON.parse(JSON.stringify(state));
  },

  getMetrics() {
    return calculateMetrics();
  },

  updateIncome(value) {
    state.monthlyIncome = Math.max(
      0,
      toNumber(value, state.monthlyIncome)
    );

    updateFinancialSummary();
    saveState();
  },

  updateSavings(value) {
    state.totalSavings = Math.max(
      0,
      toNumber(value, state.totalSavings)
    );

    updateFinancialSummary();
    saveState();
  },

  updateEmergencyFund(value) {
    state.emergencyFund = Math.max(
      0,
      toNumber(value, state.emergencyFund)
    );

    updateFinancialSummary();
    saveState();
  },

  reset() {
    window.localStorage.removeItem(
      PCSU_CONFIG.storageKey
    );

    window.location.reload();
  }
};


/* ============================================================
   20. INITIALIZATION
   ============================================================ */

function initializeApplication() {
  cacheDOM();

  if (!DOM.expenseList) {
    console.error(
      "PCSUnited Financial could not initialize: #expenseList is missing."
    );
    return;
  }

  loadState();
  bindEvents();

  if (DOM.expenseSort) {
    DOM.expenseSort.value = state.sortMode;
  }

  syncActiveCategoryTab();
  renderActiveCategory();
  setCurrentStep(state.currentStep);
  updateFinancialSummary();

  window.dispatchEvent(
    new CustomEvent("pcsunited:financial-ready", {
      detail: {
        state: window.PCSUnitedFinancial.getState(),
        metrics: calculateMetrics()
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
