/* ============================================================
  TheWing.ai • Base Demographic App
  File: basedemo.js
  Version: v1.1.0
  Updates:
  - Hero glass panel profile data
  - Calls TheWing /api/opensource-brain
  - Paints Base Pay, BAH, Total Monthly Income
  - Calculates Recommended Rooms = Family Size - 1
============================================================ */

(() => {
  "use strict";

  if (window.THEWING_BASE_DEMO_APP?.mounted) return;

  window.THEWING_BASE_DEMO_APP = {
    mounted: true,
    version: "v1.1.0",
    state: {
      profile: null,
      city: null,
      comp: null,
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

  const API_BASE = "https://thewing.netlify.app/api";
  const OPEN_SOURCE_ENDPOINT = API_BASE + "/opensource-brain";

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
    } catch (_error) {
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
    const num = Number(String(value ?? "").replace(/[$,]/g, ""));
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

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? "—";
  }

  function cleanString(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function normalizeRank(value) {
    const raw = cleanString(value).toUpperCase();
    if (!raw) return "";

    const compact = raw.replace(/\s+/g, "").replace("–", "-").replace("—", "-");

    if (/^[EOW]-\d{1,2}$/.test(compact)) return compact;
    if (/^[EOW]\d{1,2}$/.test(compact)) {
      return compact.charAt(0) + "-" + compact.slice(1);
    }

    return compact;
  }

  function normalizeMode(value) {
    const raw = cleanString(value).toLowerCase();

    if (
      raw === "ad" ||
      raw === "active" ||
      raw === "active_duty" ||
      raw === "active duty" ||
      raw === "service_member"
    ) {
      return "ACTIVE_DUTY";
    }

    if (
      raw === "vet" ||
      raw === "veteran" ||
      raw === "retired" ||
      raw === "retiree"
    ) {
      return "VETERAN";
    }

    return raw ? raw.toUpperCase() : "ACTIVE_DUTY";
  }

  function cleanZip(value) {
    const match = String(value || "").match(/\b\d{5}\b/);
    return match ? match[0] : "";
  }

  function getInitials(profile) {
    const first = firstDefined(profile?.first_name, profile?.firstName);
    const last = firstDefined(profile?.last_name, profile?.lastName);

    if (first || last) {
      return `${String(first || "").charAt(0)}${String(last || "").charAt(0)}`.toUpperCase() || "M";
    }

    const fullName = firstDefined(profile?.full_name, profile?.name);
    if (fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
    }

    if (profile?.email) return String(profile.email).charAt(0).toUpperCase();

    return "M";
  }

  function resolveFamilyCount(profile) {
    const raw = firstDefined(
      profile?.family_size,
      profile?.familySize,
      profile?.family,
      profile?.dependents_count,
      profile?.dependentsCount,
      profile?.household_size,
      profile?.householdSize
    );

    const parsed = toNumber(raw);

    if (parsed !== null && parsed > 0) return Math.round(parsed);

    const depText = cleanString(profile?.dependents).toLowerCase();

    if (
      depText.includes("spouse") &&
      (depText.includes("2 children") || depText.includes("2 child"))
    ) {
      return 4;
    }

    if (
      depText === "yes" ||
      depText === "true" ||
      depText === "with" ||
      depText === "with_dependents" ||
      depText === "with dependents"
    ) {
      return 2;
    }

    return 1;
  }

  function resolveRecommendedRooms(profile) {
    const familySize = resolveFamilyCount(profile);
    return Math.max(1, familySize - 1);
  }

  function resolveRank(profile) {
    return normalizeRank(
      firstDefined(
        profile?.rank_paygrade,
        profile?.rankPaygrade,
        profile?.rank,
        profile?.paygrade,
        profile?.last_held_rank,
        profile?.lastHeldRank
      )
    );
  }

  function resolveYos(profile) {
    const raw = firstDefined(
      profile?.yos,
      profile?.yearsOfService,
      profile?.years_of_service,
      profile?.service_years
    );

    if (String(raw).toLowerCase() === "not_retired") return 0;

    return toNumber(raw) || 0;
  }

  function resolveFamilyBoolean(profile) {
    if (typeof profile?.has_dependents === "boolean") return profile.has_dependents;
    if (typeof profile?.hasDependents === "boolean") return profile.hasDependents;
    if (typeof profile?.dependents === "boolean") return profile.dependents;

    const count = resolveFamilyCount(profile);
    if (count > 1) return true;

    const depText = cleanString(profile?.dependents).toLowerCase();

    return ["yes", "true", "with", "with_dependents", "with dependents"].includes(depText);
  }

  function normalizeProfile(rawProfile = {}) {
    const profile = rawProfile || {};

    const firstName = firstDefined(profile.first_name, profile.firstName, profile.given_name);
    const lastName = firstDefined(profile.last_name, profile.lastName, profile.surname);

    const fullName = firstDefined(
      profile.full_name,
      profile.fullName,
      profile.name,
      [firstName, lastName].filter(Boolean).join(" ")
    );

    const rank = resolveRank(profile);

    const projectedHomePrice = firstDefined(
      profile.projected_home_price,
      profile.home_purchase_price,
      profile.purchase_price,
      profile.target_price,
      profile.price
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

    return {
      ...profile,
      first_name: firstName || "",
      last_name: lastName || "",
      full_name: fullName || "Member",
      email: profile.email || "",
      rank,
      rank_paygrade: rank,
      yos: resolveYos(profile),
      family: firstDefined(profile.family, profile.family_size, profile.familySize, ""),
      family_size: resolveFamilyCount(profile),
      dependents: profile.dependents || "",
      base: firstDefined(profile.base, profile.current_base, profile.selected_base, ""),
      projected_home_price: projectedHomePrice || "",
      monthly_income: monthlyIncome || "",
      bah: bah || "",
      monthly_expenses: firstDefined(profile.monthly_expenses, profile.expenses, ""),
      credit_score: firstDefined(profile.credit_score, profile.creditScore, "")
    };
  }

  function readJsonStorage(key) {
    try {
      const localRaw = localStorage.getItem(key);
      if (localRaw) return safeJsonParse(localRaw);

      const sessionRaw = sessionStorage.getItem(key);
      if (sessionRaw) return safeJsonParse(sessionRaw);

      return null;
    } catch (_error) {
      return null;
    }
  }

  function readProfileFromStorage() {
    const keys = [
      "realtysass.bridge",
      "pcsunited.bridge",
      "pcsunited.bridge.v1",
      "pcsunited.identity.v1",
      "pcsunited.profile.v1",
      "pcsunited.session.v1",
      "pcsunited.baseline.v1"
    ];

    let merged = {};

    keys.forEach((key) => {
      const parsed = readJsonStorage(key);
      if (!parsed || typeof parsed !== "object") return;

      const candidate =
        parsed.profile ||
        parsed.user ||
        parsed.member ||
        parsed.identity ||
        parsed;

      if (candidate && typeof candidate === "object") {
        merged = {
          ...merged,
          ...candidate
        };
      }
    });

    return normalizeProfile(merged);
  }

  function getSelectedCityJsonUrl() {
    const direct =
      window.PCSU_SELECTED_CITY_JSON_URL ||
      window.OROZCO_CITY_JSON_URL ||
      window.THEWING_SELECTED_CITY_JSON_URL;

    if (direct) return direct;

    const selectedBase = readJsonStorage("pcsunited.selectedBase.v1");
    if (selectedBase?.jsonUrl) return selectedBase.jsonUrl;

    const selectedCityJsonUrl =
      localStorage.getItem("pcsunited.selectedCityJsonUrl.v1") ||
      sessionStorage.getItem("pcsunited.selectedCityJsonUrl.v1");

    if (selectedCityJsonUrl) return selectedCityJsonUrl;

    return DEFAULT_CITY_JSON_URL;
  }

  async function loadCityJson(url) {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Unable to load base JSON. Status: ${response.status}`);
    }

    return response.json();
  }

  function extractZipFromCityJson(city) {
    return cleanZip(
      city?.zip ||
      city?.base_profile?.zip ||
      city?.profile?.zip ||
      city?.market?.zip ||
      ""
    );
  }

  function buildBrainInput(profile, city) {
    const baseProfile = city?.base_profile || {};

    const baseName = firstDefined(
      profile?.base,
      city?.name,
      city?.city,
      baseProfile?.display_name,
      baseProfile?.base_name
    );

    const zip = cleanZip(
      extractZipFromCityJson(city) ||
      profile?.bahZip ||
      profile?.bah_zip ||
      profile?.zip ||
      profile?.current_zip ||
      profile?.base_zip
    );

    const rank = resolveRank(profile);
    const yos = resolveYos(profile);
    const familyCount = resolveFamilyCount(profile);
    const familyBool = resolveFamilyBoolean(profile);

    return {
      mode: normalizeMode(profile?.mode),
      rank,
      rank_paygrade: rank,
      rankPaygrade: rank,
      yos,
      family: familyCount,
      dependents: familyBool ? "yes" : "no",
      has_dependents: familyBool,
      hasDependents: familyBool,

      base: baseName,
      current_base: baseName,
      currentBase: baseName,
      selected_base: baseName,
      selectedBase: baseName,

      zip,
      bahZip: zip,
      bah_zip: zip,
      current_zip: zip,
      currentZip: zip,

      email: profile?.email || "",
      full_name: profile?.full_name || "",
      fullName: profile?.full_name || "",

      source: "thewing.base-demographic.v1.1.0"
    };
  }

  function extractOpenSourceMonthly(data) {
    const payload = data?.payload || data?.data || data || {};
    const c = payload.compensation || payload.comp || payload.pay || {};
    const m = c.monthly || payload.monthly || c || {};

    const basePay =
      m.basicPay ??
      m.basePay ??
      m.base_pay ??
      m.BASEPAY ??
      m.base ??
      payload.basePay ??
      payload.base_pay ??
      0;

    const bas =
      m.bas ??
      m.BAS ??
      m.basMonthly ??
      payload.bas ??
      payload.BAS ??
      0;

    const bah =
      m.bah ??
      m.BAH ??
      m.bahMonthly ??
      payload.bah ??
      payload.BAH ??
      0;

    const total =
      m.grossMonthlyComp ??
      m.combinedMonthlyGross ??
      m.totalMonthly ??
      m.total_monthly ??
      m.total ??
      payload.total ??
      payload.totalMonthly ??
      payload.total_monthly ??
      0;

    const finalBasePay = toNumber(basePay) || 0;
    const finalBas = toNumber(bas) || 0;
    const finalBah = toNumber(bah) || 0;
    const finalTotal = toNumber(total) || finalBasePay + finalBas + finalBah;

    return {
      basePay: finalBasePay,
      bas: finalBas,
      bah: finalBah,
      total: finalTotal
    };
  }

  function hasAnyComp(comp) {
    return !!(
      comp &&
      (
        toNumber(comp.basePay) ||
        toNumber(comp.bas) ||
        toNumber(comp.bah) ||
        toNumber(comp.total)
      )
    );
  }

  async function callOpenSourceBrain(input) {
    const requestBodies = [
      { tool: "PCS_SNAPSHOT", input },
      { type: "PCS_SNAPSHOT", input },
      input
    ];

    for (const body of requestBodies) {
      try {
        const response = await fetch(`${OPEN_SOURCE_ENDPOINT}?t=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.ok === false) continue;

        const comp = extractOpenSourceMonthly(data);
        if (hasAnyComp(comp)) return comp;
      } catch (_error) {}
    }

    return null;
  }

  async function loadCompensation(profile, city) {
    const input = buildBrainInput(profile, city);

    if (!input.rank) return null;

    const comp = await callOpenSourceBrain(input);

    if (!hasAnyComp(comp)) return null;

    return comp;
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

    const displayName = rank && lastName ? `${rank} ${lastName}` : fullName;

    const rankLine =
      rank && profile.yos
        ? `${rank} • ${profile.yos} YOS`
        : rank || profile.yos || "Profile detected";

    setText("bdUserInitials", getInitials(profile));
    setText("bdUserName", displayName);
    setText("bdUserMeta", profile.email || profile.base || "Member profile");
  }

  function paintHero(city) {
    const baseProfile = city?.base_profile || {};

    const heroImage = firstDefined(city?.image_url, city?.base_image_url);

    const heroBg = document.getElementById("bdHeroBg");
    if (heroBg && heroImage) {
      heroBg.style.backgroundImage = `url("${heroImage}")`;
    }

    const title = firstDefined(
      baseProfile.display_name,
      city?.name,
      city?.city,
      "Base Demographics"
    );

    const state = firstDefined(city?.state_code, baseProfile.state_abbr, city?.state);
    const market = firstDefined(city?.market_label, baseProfile.market_label, "Base Intelligence");

    setText("bdHeroEyebrow", market);
    setText("bdHeroTitle", state ? `${title}, ${state}` : title);

    setText(
      "bdHeroSubtitle",
      firstDefined(
        city?.profile,
        baseProfile.base_bluf,
        baseProfile.primary_mission_summary,
        "Personalized base, housing, real estate, and PCS decision intelligence."
      )
    );

    setText("bdSelectedPlace", city?.place || city?.name || "Selected Base");

    setText(
      "bdDataUpdated",
      `Updated ${firstDefined(city?.last_updated_data_from_sources, city?.metrics?.as_of, city?.market_metrics?.as_of, "N/A")}`
    );

    setText("bdConfidence", "Member View");
  }

  function paintHeroGlass(profile, comp) {
    const familySize = resolveFamilyCount(profile);
    const rooms = resolveRecommendedRooms(profile);

    const basePay = comp?.basePay || 0;
    const bah = comp?.bah || profile?.bah || 0;
    const totalMonthly = comp?.total || profile?.monthly_income || 0;

    profile.bah = bah;
    profile.monthly_income = totalMonthly;

    setText("bdHeroBasePay", formatMoney(basePay));
    setText("bdHeroBah", formatMoney(bah));
    setText("bdHeroTotalMonthly", formatMoney(totalMonthly));
    setText("bdHeroTargetPrice", formatMoney(profile?.projected_home_price));
    setText("bdHeroFamilySize", familySize ? String(familySize) : "—");
    setText("bdHeroRooms", rooms ? `${rooms} rooms` : "—");
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
      comp: APP.state.comp,
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
    paintHeroGlass(APP.state.profile || {}, APP.state.comp || {});
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
        setActiveTab(button.dataset.tab);
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
      APP.state.comp = await loadCompensation(APP.state.profile, APP.state.city);
      renderAll();
    };
  }

  async function boot() {
    hideStatus();

    try {
      APP.state.profile = readProfileFromStorage();
      APP.state.selectedJsonUrl = getSelectedCityJsonUrl();
      APP.state.city = await loadCityJson(APP.state.selectedJsonUrl);
      APP.state.comp = await loadCompensation(APP.state.profile, APP.state.city);

      if (APP.state.comp) {
        APP.state.profile.bah = APP.state.comp.bah || APP.state.profile.bah;
        APP.state.profile.monthly_income = APP.state.comp.total || APP.state.profile.monthly_income;
      }

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

  window.addEventListener("pcsunited:logged-in", () => APP.refresh());
  window.addEventListener("pcsunited:profile-ready", () => APP.refresh());
  window.addEventListener("pcsunited:bridge-ready", () => APP.refresh());
  window.addEventListener("pcsu:base-selected", () => APP.refresh());

  window.addEventListener("storage", (event) => {
    const keys = [
      "pcsunited.profile.v1",
      "pcsunited.identity.v1",
      "pcsunited.bridge.v1",
      "pcsunited.bridge",
      "realtysass.bridge",
      "pcsunited.selectedBase.v1",
      "pcsunited.selectedCityJsonUrl.v1"
    ];

    if (keys.includes(event.key)) {
      APP.refresh();
    }
  });
})();
