/* ============================================================
  TheWing.ai • Base Demographic App
  File: basedemo.js
  Version: v1.0.0
  Purpose:
  - Main app controller
  - Loads PCSUnited/TheWing profile context
  - Loads selected base JSON
  - Controls tab switching
  - Sends app state into modular tab renderers
============================================================ */

(() => {
  "use strict";

  if (window.THEWING_BASE_DEMO_APP?.mounted) return;

  window.THEWING_BASE_DEMO_APP = {
    mounted: true,
    version: "v1.0.0",
    state: {
      profile: null,
      city: null,
      activeTab: "overview",
      selectedJsonUrl: null
    }
  };

  const APP = window.THEWING_BASE_DEMO_APP;
  const root = document.getElementById("baseDemoApp");

  if (!root) {
    console.warn("Base Demographic App root not found.");
    return;
  }

  const DEFAULT_CITY_JSON_URL =
    "https://raw.githubusercontent.com/djoneorozco/PCSUnited/main/netlify/functions/cities/Lackland.json";

  const TAB_PANEL_MAP = {
    overview: "bdTabOverview",
    realestate: "bdTabRealEstate",
    demographics: "bdTabDemographics",
    base: "bdTabBase",
    guidance: "bdTabGuidance"
  };

  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => Array.from(node.querySelectorAll(selector));

  function safeJsonParse(value, fallback = null) {
    try {
      if (!value) return fallback;
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function firstDefined(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  }

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function formatMoney(value) {
    const num = toNumber(value);
    if (num === null) return "—";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(num);
  }

  function formatNumber(value) {
    const num = toNumber(value);
    if (num === null) return "—";

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(num);
  }

  function formatPercent(value, digits = 1) {
    const num = toNumber(value);
    if (num === null) return "—";
    return `${num.toFixed(digits)}%`;
  }

  function getInitials(profile) {
    const first = firstDefined(profile?.first_name, profile?.firstName, profile?.given_name);
    const last = firstDefined(profile?.last_name, profile?.lastName, profile?.surname);

    if (first || last) {
      return `${String(first || "").charAt(0)}${String(last || "").charAt(0)}`.toUpperCase() || "M";
    }

    const fullName = firstDefined(profile?.full_name, profile?.name);
    if (fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
    }

    const email = profile?.email;
    if (email) return String(email).charAt(0).toUpperCase();

    return "M";
  }

  function normalizeProfile(rawProfile = {}) {
    const profile = rawProfile || {};

    const rank = firstDefined(
      profile.rank,
      profile.rank_paygrade,
      profile.paygrade,
      profile.grade
    );

    const lastName = firstDefined(
      profile.last_name,
      profile.lastName,
      profile.surname
    );

    const firstName = firstDefined(
      profile.first_name,
      profile.firstName,
      profile.given_name
    );

    const fullName = firstDefined(
      profile.full_name,
      profile.fullName,
      profile.name,
      [firstName, lastName].filter(Boolean).join(" ")
    );

    const yos = firstDefined(
      profile.yos,
      profile.years_of_service,
      profile.yearsOfService,
      profile.time_in_service
    );

    const family = firstDefined(
      profile.family,
      profile.dependents,
      profile.dependent_status,
      profile.has_dependents
    );

    const base = firstDefined(
      profile.base,
      profile.selected_base,
      profile.current_base,
      profile.gaining_base
    );

    const projectedHomePrice = firstDefined(
      profile.projected_home_price,
      profile.home_purchase_price,
      profile.purchase_price,
      profile.target_price
    );

    const monthlyIncome = firstDefined(
      profile.total_monthly_income,
      profile.monthly_income,
      profile.income,
      profile.pay_total,
      profile.totalPay,
      profile.total_monthly_pay
    );

    const bah = firstDefined(
      profile.bah,
      profile.BAH,
      profile.monthly_bah,
      profile.bah_monthly
    );

    const monthlyExpenses = firstDefined(
      profile.monthly_expenses,
      profile.expenses,
      profile.total_monthly_expenses
    );

    const creditScore = firstDefined(
      profile.credit_score,
      profile.creditScore
    );

    return {
      ...profile,
      first_name: firstName || "",
      last_name: lastName || "",
      full_name: fullName || "Member",
      email: profile.email || "",
      rank: rank || "",
      yos: yos || "",
      family: family || "",
      base: base || "",
      projected_home_price: projectedHomePrice || "",
      monthly_income: monthlyIncome || "",
      bah: bah || "",
      monthly_expenses: monthlyExpenses || "",
      credit_score: creditScore || ""
    };
  }

  function readProfileFromStorage() {
    const keys = [
      "pcsunited.profile.v1",
      "pcsunited.identity.v1",
      "pcsunited.bridge.v1",
      "pcsunited.bridge",
      "realtysass.bridge",
      "pcsunited.session.v1",
      "pcsunited.baseline.v1"
    ];

    for (const key of keys) {
      const parsed = safeJsonParse(localStorage.getItem(key));

      if (parsed && typeof parsed === "object") {
        const profileCandidate =
          parsed.profile ||
          parsed.user ||
          parsed.member ||
          parsed.identity ||
          parsed;

        if (profileCandidate && typeof profileCandidate === "object") {
          return normalizeProfile(profileCandidate);
        }
      }
    }

    return normalizeProfile({});
  }

  function getSelectedCityJsonUrl() {
    const direct =
      window.PCSU_SELECTED_CITY_JSON_URL ||
      window.OROZCO_CITY_JSON_URL ||
      window.THEWING_SELECTED_CITY_JSON_URL;

    if (direct) return direct;

    const selectedBase = safeJsonParse(localStorage.getItem("pcsunited.selectedBase.v1"));
    if (selectedBase?.jsonUrl) return selectedBase.jsonUrl;

    const selectedCity = safeJsonParse(localStorage.getItem("pcsunited.selectedCity.v1"));
    if (selectedCity?.jsonUrl) return selectedCity.jsonUrl;

    const selectedCityJsonUrl = localStorage.getItem("pcsunited.selectedCityJsonUrl.v1");
    if (selectedCityJsonUrl) return selectedCityJsonUrl;

    return DEFAULT_CITY_JSON_URL;
  }

  async function loadCityJson(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Unable to load base JSON. Status: ${response.status}`);
    }

    return response.json();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? "—";
  }

  function showStatus(message, type = "error") {
    const box = document.getElementById("bdAppStatus");
    if (!box) return;

    box.hidden = false;
    box.textContent = message;
    box.dataset.type = type;
  }

  function hideStatus() {
    const box = document.getElementById("bdAppStatus");
    if (!box) return;

    box.hidden = true;
    box.textContent = "";
    delete box.dataset.type;
  }

  function paintProfile(profile) {
    const fullName = profile.full_name || "Member";
    const rank = profile.rank || "";
    const lastName = profile.last_name || "";

    const displayName =
      rank && lastName
        ? `${rank} ${lastName}`
        : fullName;

    const rankLine =
      rank && profile.yos
        ? `${rank} • ${profile.yos} YOS`
        : rank || profile.yos || "Profile detected";

    setText("bdUserInitials", getInitials(profile));
    setText("bdUserName", displayName);
    setText("bdUserMeta", profile.email || profile.base || "Member profile");

    setText("bdProfileRank", rankLine);
    setText("bdProfileDependents", profile.family || "—");
    setText("bdProfileBah", formatMoney(profile.bah));
    setText("bdProfileIncome", formatMoney(profile.monthly_income));

    const goal = profile.projected_home_price
      ? `${formatMoney(profile.projected_home_price)} Target`
      : "Buy / Rent Analysis";

    setText("bdProfileGoal", goal);
  }

  function paintHero(city) {
    const baseProfile = city?.base_profile || {};

    const heroImage = firstDefined(
      city?.image_url,
      city?.base_image_url
    );

    const heroBg = document.getElementById("bdHeroBg");
    if (heroBg && heroImage) {
      heroBg.style.backgroundImage = `url("${heroImage}")`;
    }

    const place = firstDefined(
      city?.place,
      city?.place_detail,
      city?.name,
      city?.city,
      baseProfile?.display_name
    );

    const title = firstDefined(
      baseProfile?.display_name,
      city?.name,
      city?.city,
      "Base Demographics"
    );

    const state = firstDefined(city?.state_code, baseProfile?.state_abbr, city?.state);
    const market = firstDefined(city?.market_label, baseProfile?.market_label, "Base Intelligence");

    setText("bdHeroEyebrow", `${market}`);
    setText("bdHeroTitle", state ? `${title}, ${state}` : title);
    setText(
      "bdHeroSubtitle",
      firstDefined(
        city?.profile,
        baseProfile?.base_bluf,
        baseProfile?.primary_mission_summary,
        "Personalized base, housing, real estate, and PCS decision intelligence."
      )
    );

    setText("bdSelectedPlace", place || "Selected Base");
    setText(
      "bdDataUpdated",
      `Updated ${firstDefined(city?.last_updated_data_from_sources, city?.metrics?.as_of, city?.market_metrics?.as_of, "N/A")}`
    );
    setText("bdConfidence", "Member View");
  }

  function buildMemberFit(profile, city) {
    const income = toNumber(profile?.monthly_income);
    const bah = toNumber(profile?.bah);
    const targetPrice = toNumber(profile?.projected_home_price);
    const avgMortgage = toNumber(city?.avg_home_mortgage_monthly?.avg);
    const medianRent = toNumber(city?.metrics?.median_rent || city?.rental_metrics?.median_rent);
    const scorecard = city?.scorecard || {};

    const marketScore = toNumber(scorecard.overall_score) || 75;
    let fitScore = marketScore;

    if (income && avgMortgage) {
      const ratio = avgMortgage / income;

      if (ratio <= 0.28) fitScore += 8;
      else if (ratio <= 0.32) fitScore += 2;
      else if (ratio <= 0.38) fitScore -= 8;
      else fitScore -= 18;
    }

    if (bah && avgMortgage) {
      if (bah >= avgMortgage * 0.9) fitScore += 5;
      else if (bah < avgMortgage * 0.7) fitScore -= 8;
    }

    if (targetPrice && city?.avg_home_value) {
      const avgHome = toNumber(city.avg_home_value);
      if (avgHome && targetPrice >= avgHome * 0.9 && targetPrice <= avgHome * 1.25) fitScore += 4;
      if (avgHome && targetPrice > avgHome * 1.45) fitScore -= 6;
    }

    fitScore = Math.max(0, Math.min(99, Math.round(fitScore)));

    let verdict = "Strong Fit";
    if (fitScore < 60) verdict = "Needs Caution";
    else if (fitScore < 75) verdict = "Moderate Fit";
    else if (fitScore < 88) verdict = "Good Fit";

    return {
      score: fitScore,
      verdict,
      income,
      bah,
      targetPrice,
      avgMortgage,
      medianRent
    };
  }

  function buildAppContext() {
    const profile = APP.state.profile;
    const city = APP.state.city;

    return {
      profile,
      city,
      activeTab: APP.state.activeTab,
      selectedJsonUrl: APP.state.selectedJsonUrl,
      fit: buildMemberFit(profile, city),
      utils: {
        formatMoney,
        formatNumber,
        formatPercent,
        toNumber,
        firstDefined,
        safeJsonParse
      }
    };
  }

  function renderFallbackTab(tabName, panel) {
    const city = APP.state.city || {};
    const profile = APP.state.profile || {};
    const fit = buildMemberFit(profile, city);

    const titleMap = {
      overview: "Overview",
      realestate: "Real Estate",
      demographics: "Demographics",
      base: "Base",
      guidance: "Guidance"
    };

    panel.innerHTML = `
      <div class="bd-section-head">
        <div>
          <div class="bd-section-kicker">TheWing Member App</div>
          <h2 class="bd-section-title">${titleMap[tabName] || "Base Intelligence"}</h2>
          <p class="bd-section-subtitle">
            This tab module is ready to connect. Once we build <strong>tabs/${tabName}.js</strong>,
            this area will render the personalized ${titleMap[tabName] || tabName} experience.
          </p>
        </div>
        <span class="bd-pill">Fit Score ${fit.score}</span>
      </div>

      <div class="bd-grid-3">
        <article class="bd-stat">
          <div class="bd-stat-label">Selected Base</div>
          <div class="bd-stat-value">${city.name || "—"}</div>
          <div class="bd-stat-hint">${city.market_label || city.place || "Base JSON loaded."}</div>
        </article>

        <article class="bd-stat">
          <div class="bd-stat-label">Market Verdict</div>
          <div class="bd-stat-value">${city.market_bluf?.verdict || "—"}</div>
          <div class="bd-stat-hint">${city.market_bluf?.status || "Awaiting market data."}</div>
        </article>

        <article class="bd-stat">
          <div class="bd-stat-label">Member Fit</div>
          <div class="bd-stat-value">${fit.verdict}</div>
          <div class="bd-stat-hint">Personalized from profile + selected base JSON.</div>
        </article>
      </div>
    `;
  }

  function renderActiveTab() {
    const activeTab = APP.state.activeTab;
    const panelId = TAB_PANEL_MAP[activeTab];
    const panel = document.getElementById(panelId);

    if (!panel) return;

    const context = buildAppContext();
    const registry = window.TheWingBaseDemoTabs || {};
    const renderer = registry[activeTab];

    if (typeof renderer === "function") {
      renderer(panel, context);
    } else {
      renderFallbackTab(activeTab, panel);
    }
  }

  function renderAll() {
    if (!APP.state.city) return;

    paintProfile(APP.state.profile || {});
    paintHero(APP.state.city);
    renderActiveTab();
  }

  function setActiveTab(tabName) {
    if (!TAB_PANEL_MAP[tabName]) return;

    APP.state.activeTab = tabName;

    $$(".bd-nav-btn", root).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === tabName);
    });

    $$(".bd-tab-panel", root).forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === tabName);
    });

    renderActiveTab();
  }

  function bindTabs() {
    $$(".bd-nav-btn", root).forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.dataset.tab;
        setActiveTab(tabName);
      });
    });
  }

  function exposePublicApi() {
    APP.refresh = async () => {
      await boot();
    };

    APP.setActiveTab = setActiveTab;

    APP.getContext = () => buildAppContext();

    APP.reloadCity = async (jsonUrl) => {
      APP.state.selectedJsonUrl = jsonUrl || getSelectedCityJsonUrl();
      APP.state.city = await loadCityJson(APP.state.selectedJsonUrl);
      renderAll();
    };
  }

  async function boot() {
    hideStatus();

    try {
      APP.state.profile = readProfileFromStorage();
      APP.state.selectedJsonUrl = getSelectedCityJsonUrl();
      APP.state.city = await loadCityJson(APP.state.selectedJsonUrl);

      renderAll();
    } catch (error) {
      console.error("Base Demographic App failed to load:", error);

      showStatus(
        "Base Demographic app could not load the selected base data. Check the selected JSON URL or local file path."
      );

      APP.state.city = null;
    }
  }

  bindTabs();
  exposePublicApi();
  boot();
})();
