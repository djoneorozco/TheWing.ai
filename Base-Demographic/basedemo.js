/* ============================================================
  TheWing.ai • Base Demographic App
  File: basedemo.js
  Version: v1.2.0
  Purpose:
  - Main app controller
  - Loads selected base/city JSON
  - Calls Supabase-backed member endpoint:
      https://thewing.netlify.app/api/member-base-demo
  - NO opensource-brain usage
  - Paints hero glass panel:
      Base Pay, BAH, Total Monthly Income, Target Price,
      Family Size, Recommended Rooms
  - Supports iframe flow through URL params and postMessage
============================================================ */

(() => {
  "use strict";

  if (window.THEWING_BASE_DEMO_APP?.mounted) return;

  window.THEWING_BASE_DEMO_APP = {
    mounted: true,
    version: "v1.2.0",
    state: {
      profile: null,
      city: null,
      member: null,
      compensation: null,
      housing: null,
      activeTab: "overview",
      selectedJsonUrl: null,
      selectedBase: null,
      email: ""
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

  const MEMBER_BASE_DEMO_ENDPOINT =
    "https://thewing.netlify.app/api/member-base-demo";

  const TAB_PANEL_MAP = {
    overview: "bdTabOverview",
    realestate: "bdTabRealEstate",
    demographics: "bdTabDemographics",
    base: "bdTabBase",
    guidance: "bdTabGuidance"
  };

  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => Array.from(node.querySelectorAll(selector));

  /* ============================================================
    #1 UTILITIES
  ============================================================ */

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

  function cleanString(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function cleanEmail(value) {
    return cleanString(value).toLowerCase();
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

  function readTextStorage(key) {
    try {
      return (
        localStorage.getItem(key) ||
        sessionStorage.getItem(key) ||
        ""
      );
    } catch (_error) {
      return "";
    }
  }

  function getUrlParam(name) {
    try {
      const url = new URL(window.location.href);
      return cleanString(url.searchParams.get(name));
    } catch (_error) {
      return "";
    }
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

  function getInitials(profile = {}) {
    const first = firstDefined(profile.first_name, profile.firstName);
    const last = firstDefined(profile.last_name, profile.lastName);

    if (first || last) {
      return `${String(first || "").charAt(0)}${String(last || "").charAt(0)}`.toUpperCase() || "M";
    }

    const fullName = firstDefined(profile.full_name, profile.fullName, profile.name);
    if (fullName) {
      const parts = String(fullName).trim().split(/\s+/);
      return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
    }

    if (profile.email) return String(profile.email).charAt(0).toUpperCase();

    return "M";
  }

  function resolveFamilySize(profile = {}, housing = {}) {
    const direct = toNumber(
      firstDefined(
        housing.family_size,
        housing.familySize,
        profile.family_size,
        profile.familySize,
        profile.household_size,
        profile.householdSize,
        profile.dependents_count,
        profile.dependentsCount,
        profile.family
      )
    );

    if (direct !== null && direct > 0) return Math.round(direct);

    const dependents = cleanString(profile.dependents).toLowerCase();

    if (
      dependents.includes("spouse") &&
      (dependents.includes("2 children") || dependents.includes("2 child"))
    ) {
      return 4;
    }

    if (
      dependents === "yes" ||
      dependents === "true" ||
      dependents === "with" ||
      dependents === "with dependents" ||
      dependents === "with_dependents"
    ) {
      return 2;
    }

    return 1;
  }

  function resolveRecommendedRooms(profile = {}, housing = {}) {
    const direct = toNumber(
      firstDefined(
        housing.recommended_rooms,
        housing.recommendedRooms,
        profile.recommended_rooms,
        profile.recommendedRooms
      )
    );

    if (direct !== null && direct > 0) return Math.round(direct);

    return Math.max(1, resolveFamilySize(profile, housing) - 1);
  }

  /* ============================================================
    #2 EMAIL / PROFILE / BASE RESOLUTION
  ============================================================ */

  function readEmailFromKnownStorage() {
    const directKeys = [
      "pcsunited.sessionEmail",
      "pcsunited.loginEmail",
      "pcsunited.email",
      "realtysass.email"
    ];

    for (const key of directKeys) {
      const value = cleanEmail(readTextStorage(key));
      if (value && value.includes("@")) return value;
    }

    const objectKeys = [
      "pcsunited.profile.v1",
      "pcsunited.identity.v1",
      "pcsunited.bridge.v1",
      "pcsunited.bridge",
      "realtysass.bridge",
      "pcsunited.session.v1",
      "pcsunited.baseline.v1"
    ];

    for (const key of objectKeys) {
      const parsed = readJsonStorage(key);
      if (!parsed || typeof parsed !== "object") continue;

      const candidates = [
        parsed.email,
        parsed.profile?.email,
        parsed.user?.email,
        parsed.member?.email,
        parsed.identity?.email
      ];

      for (const candidate of candidates) {
        const email = cleanEmail(candidate);
        if (email && email.includes("@")) return email;
      }
    }

    return "";
  }

  function resolveEmail() {
    const fromUrl = cleanEmail(
      firstDefined(
        getUrlParam("email"),
        getUrlParam("member_email"),
        getUrlParam("sessionEmail")
      )
    );

    if (fromUrl && fromUrl.includes("@")) return fromUrl;

    return readEmailFromKnownStorage();
  }

  function normalizeLocalProfile(rawProfile = {}) {
    const profile = rawProfile || {};

    const firstName = firstDefined(profile.first_name, profile.firstName, profile.given_name);
    const lastName = firstDefined(profile.last_name, profile.lastName, profile.surname);

    const fullName = firstDefined(
      profile.full_name,
      profile.fullName,
      profile.name,
      [firstName, lastName].filter(Boolean).join(" ")
    );

    const rank = normalizeRank(
      firstDefined(
        profile.rank_paygrade,
        profile.rankPaygrade,
        profile.rank,
        profile.paygrade,
        profile.grade
      )
    );

    return {
      ...profile,
      email: cleanEmail(profile.email),
      first_name: firstName || "",
      last_name: lastName || "",
      full_name: fullName || "Member",
      rank,
      rank_paygrade: rank,
      yos: firstDefined(profile.yos, profile.years_of_service, profile.yearsOfService, ""),
      base: firstDefined(profile.base, profile.current_base, profile.selected_base, profile.gaining_base, ""),
      projected_home_price: firstDefined(
        profile.projected_home_price,
        profile.home_purchase_price,
        profile.purchase_price,
        profile.target_price,
        profile.price,
        ""
      )
    };
  }

  function readLocalProfileFallback() {
    const keys = [
      "pcsunited.profile.v1",
      "pcsunited.identity.v1",
      "pcsunited.bridge.v1",
      "pcsunited.bridge",
      "realtysass.bridge",
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

    const email = resolveEmail();

    return normalizeLocalProfile({
      ...merged,
      email: firstDefined(merged.email, email)
    });
  }

  function getSelectedCityJsonUrl() {
    const fromUrl = firstDefined(
      getUrlParam("cityJsonUrl"),
      getUrlParam("city_json_url"),
      getUrlParam("jsonUrl")
    );

    if (fromUrl) return fromUrl;

    const direct =
      window.PCSU_SELECTED_CITY_JSON_URL ||
      window.OROZCO_CITY_JSON_URL ||
      window.THEWING_SELECTED_CITY_JSON_URL;

    if (direct) return direct;

    const selectedBase = readJsonStorage("pcsunited.selectedBase.v1");
    if (selectedBase?.jsonUrl) return selectedBase.jsonUrl;

    const selectedCityJsonUrl =
      readTextStorage("pcsunited.selectedCityJsonUrl.v1") ||
      readTextStorage("pcsunited.selectedCityJsonUrl");

    if (selectedCityJsonUrl) return selectedCityJsonUrl;

    return DEFAULT_CITY_JSON_URL;
  }

  function getSelectedBaseName(city = null, profile = null) {
    const fromUrl = firstDefined(
      getUrlParam("selected_base"),
      getUrlParam("base"),
      getUrlParam("baseName")
    );

    if (fromUrl) return fromUrl;

    const selectedBase = readJsonStorage("pcsunited.selectedBase.v1");

    return firstDefined(
      selectedBase?.base,
      selectedBase?.label,
      selectedBase?.name,
      profile?.base,
      city?.base_profile?.display_name,
      city?.base_profile?.base_name,
      city?.name,
      city?.city,
      "Lackland AFB"
    );
  }

  /* ============================================================
    #3 DATA LOADERS
  ============================================================ */

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

  async function loadMemberBaseDemo({ email, cityJsonUrl, selectedBase }) {
    if (!email || !email.includes("@")) {
      return {
        ok: false,
        error: "Missing member email for Supabase lookup."
      };
    }

    const response = await fetch(`${MEMBER_BASE_DEMO_ENDPOINT}?t=${Date.now()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        email,
        cityJsonUrl,
        selected_base: selectedBase
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      return {
        ok: false,
        error: data.error || `Member endpoint failed with status ${response.status}`,
        detail: data.detail || ""
      };
    }

    return data;
  }

  /* ============================================================
    #4 PAINTERS
  ============================================================ */

  function paintProfile(profile = {}) {
    const fullName = profile.full_name || profile.fullName || "Member";
    const rank = normalizeRank(profile.rank || profile.rank_paygrade || profile.rankPaygrade);
    const lastName = profile.last_name || profile.lastName || "";

    const displayName = rank && lastName ? `${rank} ${lastName}` : fullName;

    const rankLine =
      rank && profile.yos
        ? `${rank} • ${profile.yos} YOS`
        : rank || profile.yos || "Member profile";

    setText("bdUserInitials", getInitials(profile));
    setText("bdUserName", displayName);
    setText("bdUserMeta", profile.email || rankLine || "Member profile");
  }

  function paintHero(city = {}) {
    const baseProfile = city.base_profile || {};

    const heroImage = firstDefined(city.image_url, city.base_image_url);

    const heroBg = document.getElementById("bdHeroBg");
    if (heroBg && heroImage) {
      heroBg.style.backgroundImage = `url("${heroImage}")`;
    }

    const title = firstDefined(
      baseProfile.display_name,
      city.name,
      city.city,
      "Base Demographics"
    );

    const state = firstDefined(city.state_code, baseProfile.state_abbr, city.state);
    const market = firstDefined(city.market_label, baseProfile.market_label, "Base Intelligence");

    setText("bdHeroEyebrow", market);
    setText("bdHeroTitle", state ? `${title}, ${state}` : title);

    setText(
      "bdHeroSubtitle",
      firstDefined(
        city.profile,
        baseProfile.base_bluf,
        baseProfile.primary_mission_summary,
        "Personalized base, housing, real estate, and PCS decision intelligence."
      )
    );

    setText("bdSelectedPlace", city.place || city.name || "Selected Base");

    setText(
      "bdDataUpdated",
      `Updated ${firstDefined(city.last_updated_data_from_sources, city.metrics?.as_of, city.market_metrics?.as_of, "N/A")}`
    );

    setText("bdConfidence", "Member View");
  }

  function paintHeroGlass(profile = {}, compensation = {}, housing = {}) {
    const familySize = resolveFamilySize(profile, housing);
    const rooms = resolveRecommendedRooms(profile, housing);

    const basePay = firstDefined(
      compensation.base_pay,
      compensation.basePay,
      compensation.basic_pay,
      compensation.basicPay,
      0
    );

    const bah = firstDefined(
      compensation.bah,
      compensation.BAH,
      profile.bah,
      profile.monthly_bah,
      0
    );

    const totalMonthly = firstDefined(
      compensation.total_monthly,
      compensation.totalMonthly,
      compensation.total,
      profile.total_monthly_income,
      profile.monthly_income,
      profile.income,
      0
    );

    const targetPrice = firstDefined(
      housing.target_price,
      housing.targetPrice,
      profile.projected_home_price,
      profile.home_purchase_price,
      profile.purchase_price,
      profile.target_price,
      0
    );

    profile.bah = bah;
    profile.monthly_income = totalMonthly;
    profile.projected_home_price = targetPrice;
    profile.family_size = familySize;
    profile.recommended_rooms = rooms;

    setText("bdHeroBasePay", formatMoney(basePay));
    setText("bdHeroBah", formatMoney(bah));
    setText("bdHeroTotalMonthly", formatMoney(totalMonthly));
    setText("bdHeroTargetPrice", formatMoney(targetPrice));
    setText("bdHeroFamilySize", familySize ? String(familySize) : "—");
    setText("bdHeroRooms", rooms ? `${rooms} rooms` : "—");
  }

  /* ============================================================
    #5 FIT / CONTEXT
  ============================================================ */

  function buildMemberFit(profile = {}, city = {}) {
    const income = toNumber(profile.monthly_income);
    const bah = toNumber(profile.bah);
    const targetPrice = toNumber(profile.projected_home_price);
    const avgMortgage = toNumber(city.avg_home_mortgage_monthly?.avg);
    const medianRent = toNumber(city.metrics?.median_rent || city.rental_metrics?.median_rent);
    const scorecard = city.scorecard || {};

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

    if (targetPrice && city.avg_home_value) {
      const avgHome = toNumber(city.avg_home_value);

      if (avgHome && targetPrice >= avgHome * 0.9 && targetPrice <= avgHome * 1.25) {
        fitScore += 4;
      }

      if (avgHome && targetPrice > avgHome * 1.45) {
        fitScore -= 6;
      }
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
    const profile = APP.state.profile || {};
    const city = APP.state.city || {};

    return {
      profile,
      city,
      member: APP.state.member,
      compensation: APP.state.compensation,
      housing: APP.state.housing,
      activeTab: APP.state.activeTab,
      selectedJsonUrl: APP.state.selectedJsonUrl,
      selectedBase: APP.state.selectedBase,
      email: APP.state.email,
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

  /* ============================================================
    #6 TABS
  ============================================================ */

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
          <div class="bd-stat-hint">Personalized from Supabase profile + selected base JSON.</div>
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

  /* ============================================================
    #7 RENDER / BOOT
  ============================================================ */

  function renderAll() {
    if (!APP.state.city) return;

    paintProfile(APP.state.profile || {});
    paintHero(APP.state.city);
    paintHeroGlass(
      APP.state.profile || {},
      APP.state.compensation || {},
      APP.state.housing || {}
    );
    renderActiveTab();
  }

  async function boot() {
    hideStatus();

    try {
      APP.state.email = resolveEmail();
      APP.state.selectedJsonUrl = getSelectedCityJsonUrl();

      APP.state.city = await loadCityJson(APP.state.selectedJsonUrl);
      APP.state.selectedBase = getSelectedBaseName(APP.state.city, null);

      const localFallbackProfile = readLocalProfileFallback();

      let memberPayload = null;

      if (APP.state.email) {
        memberPayload = await loadMemberBaseDemo({
          email: APP.state.email,
          cityJsonUrl: APP.state.selectedJsonUrl,
          selectedBase: APP.state.selectedBase
        });
      }

      if (memberPayload?.ok) {
        APP.state.member = memberPayload;
        APP.state.profile = normalizeLocalProfile({
          ...localFallbackProfile,
          ...(memberPayload.profile || {}),
          email: APP.state.email
        });

        APP.state.compensation = memberPayload.compensation || {};
        APP.state.housing = memberPayload.housing || {};

        APP.state.profile.bah = firstDefined(
          APP.state.compensation.bah,
          APP.state.profile.bah
        );

        APP.state.profile.monthly_income = firstDefined(
          APP.state.compensation.total_monthly,
          APP.state.profile.monthly_income
        );

        APP.state.profile.projected_home_price = firstDefined(
          APP.state.housing.target_price,
          APP.state.profile.projected_home_price
        );

        APP.state.profile.family_size = firstDefined(
          APP.state.housing.family_size,
          APP.state.profile.family_size
        );

        APP.state.profile.recommended_rooms = firstDefined(
          APP.state.housing.recommended_rooms,
          APP.state.profile.recommended_rooms
        );
      } else {
        APP.state.member = memberPayload || null;
        APP.state.profile = localFallbackProfile;
        APP.state.compensation = {};
        APP.state.housing = {};

        if (!APP.state.email) {
          showStatus(
            "Member email was not found. Pass email into the iframe URL or send it with postMessage.",
            "warning"
          );
        } else {
          showStatus(
            memberPayload?.error || "Supabase member profile could not be loaded.",
            "warning"
          );
        }
      }

      renderAll();
    } catch (error) {
      console.error("Base Demographic App failed to load:", error);

      showStatus(
        "Base Demographic app could not load. Check the city JSON URL and member-base-demo endpoint."
      );

      APP.state.city = null;
    }
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
      APP.state.selectedBase = getSelectedBaseName(APP.state.city, APP.state.profile);
      await boot();
    };

    APP.setMemberContext = async (payload = {}) => {
      if (payload.email) {
        APP.state.email = cleanEmail(payload.email);
        try {
          sessionStorage.setItem("pcsunited.sessionEmail", APP.state.email);
        } catch (_error) {}
      }

      if (payload.cityJsonUrl || payload.city_json_url || payload.jsonUrl) {
        APP.state.selectedJsonUrl = firstDefined(
          payload.cityJsonUrl,
          payload.city_json_url,
          payload.jsonUrl
        );

        try {
          sessionStorage.setItem("pcsunited.selectedCityJsonUrl.v1", APP.state.selectedJsonUrl);
        } catch (_error) {}
      }

      if (payload.selectedBase || payload.selected_base || payload.base) {
        APP.state.selectedBase = firstDefined(
          payload.selectedBase,
          payload.selected_base,
          payload.base
        );
      }

      await boot();
    };
  }

  /* ============================================================
    #8 IFRAME / EVENTS
  ============================================================ */

  function handleMessage(event) {
    const data = event?.data;
    if (!data || typeof data !== "object") return;

    if (
      data.type === "pcsunited-member-context" ||
      data.type === "pcsunited-profile" ||
      data.type === "pcsunited:profile-ready" ||
      data.source === "pcsunited-login" ||
      data.source === "pcsu_base_selector"
    ) {
      const payload = {
        email: firstDefined(
          data.email,
          data.profile?.email,
          data.identity?.email,
          data.member?.email
        ),
        cityJsonUrl: firstDefined(
          data.cityJsonUrl,
          data.city_json_url,
          data.jsonUrl,
          data.selectedBase?.jsonUrl
        ),
        selectedBase: firstDefined(
          data.selectedBase?.name,
          data.selectedBase?.base,
          data.selected_base,
          data.base
        )
      };

      APP.setMemberContext(payload);
    }
  }

  function bindEvents() {
    window.addEventListener("message", handleMessage);

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
        "pcsunited.session.v1",
        "pcsunited.sessionEmail",
        "pcsunited.loginEmail",
        "pcsunited.selectedBase.v1",
        "pcsunited.selectedCityJsonUrl.v1"
      ];

      if (keys.includes(event.key)) {
        APP.refresh();
      }
    });
  }

  bindTabs();
  exposePublicApi();
  bindEvents();
  boot();
})();
