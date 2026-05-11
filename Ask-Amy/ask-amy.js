/* ============================================================
  THEWING.ai / PCSUnited • Ask Amy Command Center
  ask-amy.js
  v1.0.0
  Plain JavaScript • Standalone frontend

  ARCHITECTURE
  - Frontend only.
  - No backend logic.
  - No OpenAI logic.
  - Calls:
      POST https://thewing.netlify.app/api/agent-amy

  EXPECTED BACKEND RESPONSE
  - data.reply
  - data.intent
  - data.latency_ms
  - data.truth_packet
  - data.profile_used
  - data.context_used
============================================================ */

(() => {
  "use strict";

  /* ============================================================
    //#1) CONFIG
  ============================================================ */

  const APP_ID = "ask-amy-app";
  const FALLBACK_ENDPOINT = "https://thewing.netlify.app/api/agent-amy";
  const MAX_MESSAGE_LENGTH = 5000;

  const STORAGE_KEYS = {
    profile: "pcsunited.profile.v1",
    identity: "pcsunited.identity.v1",
    bridge: "pcsunited.bridge.v1",
    legacyBridge: "realtysass.bridge",
    session: "pcsunited.session.v1",
    financialIntake: "pcsunited.financial.intake.v1",
    kpiOverrides: "pcsunited.kpi_overrides.v1",
    baseline: "pcsunited.baseline.v1",
    selectedBase: "pcsunited.selectedBase.v1",
    selectedCityJsonUrl: "pcsunited.selectedCityJsonUrl.v1",
    sessionEmail: "pcsunited.sessionEmail",
    loginEmail: "pcsunited.loginEmail"
  };

  const dom = {};

  let state = {
    endpoint: FALLBACK_ENDPOINT,
    mounted: false,
    busy: false,
    localContext: null,
    mergedProfile: null,
    lastTruthPacket: null,
    lastResponse: null,
    messageCount: 0
  };

  /* ============================================================
    //#2) BOOT
  ============================================================ */

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const app = document.getElementById(APP_ID);
    if (!app || app.__askAmyMountedV100) return;

    app.__askAmyMountedV100 = true;

    state.endpoint = resolveEndpoint(app);
    cacheDom();
    bindEvents();

    state.localContext = collectLocalContext();
    state.mergedProfile = normalizeProfile(state.localContext.profile || {});

    hydrateProfileRail();
    hydrateSignalRail();
    hydrateInitialIntel();

    greetUser();
    setConnectionState("ready", "Ready");

    state.mounted = true;
  }

  function resolveEndpoint(app) {
    const raw = clean(app.getAttribute("data-endpoint"));

    if (raw) return raw;

    if (location.hostname && /webflow\.io$/i.test(location.hostname)) {
      return FALLBACK_ENDPOINT;
    }

    if (location.hostname && /thewing\.netlify\.app$/i.test(location.hostname)) {
      return "/api/agent-amy";
    }

    return FALLBACK_ENDPOINT;
  }

  function cacheDom() {
    dom.app = document.getElementById(APP_ID);

    dom.connectionPill = document.getElementById("amy-connection-pill");
    dom.connectionDot = document.getElementById("amy-connection-dot");
    dom.connectionLabel = document.getElementById("amy-connection-label");

    dom.profileName = document.getElementById("amy-profile-name");
    dom.profileStatus = document.getElementById("amy-profile-status");
    dom.profileRank = document.getElementById("amy-profile-rank");
    dom.profileBase = document.getElementById("amy-profile-base");
    dom.profileZip = document.getElementById("amy-profile-zip");
    dom.profileMode = document.getElementById("amy-profile-mode");

    dom.signalProfile = document.getElementById("amy-signal-profile");
    dom.signalProfileText = document.getElementById("amy-signal-profile-text");
    dom.signalBridge = document.getElementById("amy-signal-bridge");
    dom.signalBridgeText = document.getElementById("amy-signal-bridge-text");
    dom.signalFinancial = document.getElementById("amy-signal-financial");
    dom.signalFinancialText = document.getElementById("amy-signal-financial-text");
    dom.signalBase = document.getElementById("amy-signal-base");
    dom.signalBaseText = document.getElementById("amy-signal-base-text");

    dom.quickButtons = Array.from(document.querySelectorAll(".amy-quick-btn"));

    dom.chatTitle = document.getElementById("amy-chat-title");
    dom.chatSubtitle = document.getElementById("amy-chat-subtitle");
    dom.intentPill = document.getElementById("amy-intent-pill");
    dom.latencyPill = document.getElementById("amy-latency-pill");

    dom.chat = document.getElementById("amy-chat");
    dom.form = document.getElementById("amy-form");
    dom.input = document.getElementById("amy-input");
    dom.send = document.getElementById("amy-send");

    dom.errorStrip = document.getElementById("amy-error-strip");
    dom.errorText = document.getElementById("amy-error-text");

    dom.verdictCard = document.getElementById("amy-verdict-card");
    dom.verdictLabel = document.getElementById("amy-verdict-label");
    dom.verdictGrade = document.getElementById("amy-verdict-grade");
    dom.verdictBluf = document.getElementById("amy-verdict-bluf");

    dom.compStatus = document.getElementById("amy-comp-status");
    dom.compTotal = document.getElementById("amy-comp-total");
    dom.compBasePay = document.getElementById("amy-comp-basepay");
    dom.compBas = document.getElementById("amy-comp-bas");
    dom.compBah = document.getElementById("amy-comp-bah");

    dom.mtgStatus = document.getElementById("amy-mtg-status");
    dom.mtgAllIn = document.getElementById("amy-mtg-allin");
    dom.mtgPrice = document.getElementById("amy-mtg-price");
    dom.mtgLoan = document.getElementById("amy-mtg-loan");
    dom.mtgApr = document.getElementById("amy-mtg-apr");

    dom.affordStatus = document.getElementById("amy-afford-status");
    dom.affordHousingRatio = document.getElementById("amy-afford-housing-ratio");
    dom.affordBackendRatio = document.getElementById("amy-afford-backend-ratio");
    dom.affordHousingBar = document.getElementById("amy-afford-housing-bar");
    dom.affordBackendBar = document.getElementById("amy-afford-backend-bar");
    dom.affordResidual = document.getElementById("amy-afford-residual");

    dom.vaStatus = document.getElementById("amy-va-status");
    dom.vaTitle = document.getElementById("amy-va-title");
    dom.vaBluf = document.getElementById("amy-va-bluf");

    dom.nextLabel = document.getElementById("amy-next-label");
    dom.nextMessage = document.getElementById("amy-next-message");

    dom.missingCount = document.getElementById("amy-missing-count");
    dom.missingList = document.getElementById("amy-missing-list");
  }

  function bindEvents() {
    if (dom.form) {
      dom.form.addEventListener("submit", (event) => {
        event.preventDefault();
        trySend();
      });
    }

    if (dom.input) {
      dom.input.addEventListener("keydown", handleInputKeydown);
      dom.input.addEventListener("input", autoResizeInput);
    }

    dom.quickButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const prompt = clean(button.getAttribute("data-prompt"));
        if (!prompt || state.busy) return;

        if (dom.input) {
          dom.input.value = prompt;
          autoResizeInput();
          dom.input.focus();
        }

        trySend();
      });
    });

    window.addEventListener("storage", handleStorageChange);

    window.addEventListener("pcsunited:unlocked", refreshLocalContext);
    window.addEventListener("pcsunited:bridge-ready", refreshLocalContext);
    window.addEventListener("realtysass:bridge-ready", refreshLocalContext);
    window.addEventListener("pcsunited:loggedout", refreshLocalContext);
  }

  /* ============================================================
    //#3) LOCAL CONTEXT COLLECTION
  ============================================================ */

  function refreshLocalContext() {
    state.localContext = collectLocalContext();
    state.mergedProfile = normalizeProfile(state.localContext.profile || {});

    hydrateProfileRail();
    hydrateSignalRail();
  }

  function handleStorageChange(event) {
    if (!event || !event.key) return;

    const watchList = Object.values(STORAGE_KEYS);

    if (watchList.includes(event.key)) {
      refreshLocalContext();
    }
  }

  function collectLocalContext() {
    const profileRaw = readStore(STORAGE_KEYS.profile, null);
    const identityRaw = readStore(STORAGE_KEYS.identity, null);
    const bridgeRaw = readStore(STORAGE_KEYS.bridge, null);
    const legacyBridgeRaw = readStore(STORAGE_KEYS.legacyBridge, null);
    const sessionRaw = readStore(STORAGE_KEYS.session, null);
    const financialIntakeRaw = readStore(STORAGE_KEYS.financialIntake, null);
    const kpiOverridesRaw = readStore(STORAGE_KEYS.kpiOverrides, null);
    const baselineRaw = readStore(STORAGE_KEYS.baseline, null);

    const selectedBase = readFlexibleStore(STORAGE_KEYS.selectedBase, null);
    const selectedCityJsonUrl = readTextStore(STORAGE_KEYS.selectedCityJsonUrl, "");

    const sessionEmail =
      readTextStore(STORAGE_KEYS.sessionEmail, "") ||
      readTextStore(STORAGE_KEYS.loginEmail, "");

    const identity = normalizeObject(identityRaw);
    const profile = normalizeObject(profileRaw);
    const bridge = normalizeObject(bridgeRaw);
    const legacyBridge = normalizeObject(legacyBridgeRaw);
    const session = normalizeObject(sessionRaw);
    const financialIntake = normalizeObject(financialIntakeRaw);
    const kpiOverrides = normalizeObject(kpiOverridesRaw);
    const baseline = normalizeObject(baselineRaw);

    const mergedProfileRaw = mergeObjects(
      baseline,
      identity,
      profile,
      bridge,
      legacyBridge,
      financialIntake,
      kpiOverrides,
      selectedBaseToProfile(selectedBase),
      sessionEmail ? { email: sessionEmail } : {}
    );

    const mergedProfile = normalizeProfile(mergedProfileRaw);

    const context = {
      profile: mergedProfile || profile || {},
      identity: identity || {},
      bridge: mergeObjects(bridge || {}, legacyBridge || {}, baseline || {}),
      session: session || {},
      financial_intake: financialIntake || {},
      kpi_overrides: kpiOverrides || {},
      baseline: baseline || {},
      selected_base: selectedBase,
      selected_city_json_url: selectedCityJsonUrl || "",
      profile_summary: buildContextSummary(mergedProfile)
    };

    return {
      ...context,
      _raw: {
        profile: profileRaw,
        identity: identityRaw,
        bridge: bridgeRaw,
        legacy_bridge: legacyBridgeRaw,
        session: sessionRaw,
        financial_intake: financialIntakeRaw,
        kpi_overrides: kpiOverridesRaw,
        baseline: baselineRaw,
        selected_base: selectedBase,
        selected_city_json_url: selectedCityJsonUrl,
        session_email: sessionEmail
      }
    };
  }

  function selectedBaseToProfile(selectedBase) {
    if (!selectedBase) return {};

    if (typeof selectedBase === "string") {
      return { base: selectedBase };
    }

    if (typeof selectedBase !== "object") return {};

    return {
      base:
        selectedBase.base ||
        selectedBase.name ||
        selectedBase.base_name ||
        selectedBase.baseName ||
        selectedBase.installation ||
        "",
      zip:
        selectedBase.zip ||
        selectedBase.bahZip ||
        selectedBase.bah_zip ||
        selectedBase.baseZip ||
        selectedBase.base_zip ||
        "",
      cityKey:
        selectedBase.cityKey ||
        selectedBase.city_key ||
        selectedBase.market ||
        ""
    };
  }

  /* ============================================================
    //#4) STORAGE HELPERS
  ============================================================ */

  function safeParse(raw, fallback = null) {
    try {
      if (raw === undefined || raw === null || raw === "") return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function readStore(key, fallback = null) {
    try {
      const localRaw = window.localStorage ? localStorage.getItem(key) : null;
      if (localRaw) return safeParse(localRaw, fallback);

      const sessionRaw = window.sessionStorage ? sessionStorage.getItem(key) : null;
      if (sessionRaw) return safeParse(sessionRaw, fallback);

      return fallback;
    } catch {
      return fallback;
    }
  }

  function readTextStore(key, fallback = "") {
    try {
      const localRaw = window.localStorage ? localStorage.getItem(key) : null;
      if (localRaw) return localRaw;

      const sessionRaw = window.sessionStorage ? sessionStorage.getItem(key) : null;
      if (sessionRaw) return sessionRaw;

      return fallback;
    } catch {
      return fallback;
    }
  }

  function readFlexibleStore(key, fallback = null) {
    try {
      const localRaw = window.localStorage ? localStorage.getItem(key) : null;
      if (localRaw) return safeParse(localRaw, localRaw);

      const sessionRaw = window.sessionStorage ? sessionStorage.getItem(key) : null;
      if (sessionRaw) return safeParse(sessionRaw, sessionRaw);

      return fallback;
    } catch {
      return fallback;
    }
  }

  /* ============================================================
    //#5) PROFILE NORMALIZATION
  ============================================================ */

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== "object") return null;

    const fullName = clean(
      pickFirst(
        profile.full_name,
        profile.fullName,
        [profile.first_name, profile.last_name].filter(Boolean).join(" "),
        [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        profile.name,
        profile.displayName
      )
    );

    const first = clean(
      pickFirst(
        profile.first_name,
        profile.firstName,
        fullName ? fullName.split(/\s+/)[0] : ""
      )
    );

    const last = clean(
      pickFirst(
        profile.last_name,
        profile.lastName,
        fullName ? fullName.split(/\s+/).slice(1).join(" ") : ""
      )
    );

    const rankPaygrade = clean(
      pickFirst(
        profile.rank_paygrade,
        profile.rankPaygrade,
        profile.paygrade,
        profile.rank
      )
    );

    const base = clean(
      pickFirst(
        profile.base,
        profile.base_name,
        profile.baseName,
        profile.installation,
        profile.duty_station,
        profile.dutyStation,
        profile.pcsBase,
        profile.pcs_base,
        profile.selectedBase
      )
    );

    const zip = clean(
      pickFirst(
        profile.zip,
        profile.base_zip,
        profile.baseZip,
        profile.bah_zip,
        profile.bahZip,
        profile.dutyZip,
        profile.mhaZip
      )
    );

    const projectedHomePrice = num(
      pickFirst(
        profile.projected_home_price,
        profile.projectedHomePrice,
        profile.home_price,
        profile.homePrice,
        profile.price,
        profile.housingPrice,
        profile.projected_mortgage_amount
      )
    );

    const monthlyExpenses = num(
      pickFirst(
        profile.monthly_expenses,
        profile.monthlyExpenses,
        profile.expenses,
        profile.expensesOverride,
        profile.total_expenses
      )
    );

    const downpayment = num(
      pickFirst(
        profile.downpayment,
        profile.downPayment,
        profile.down_payment,
        profile.dpAmt,
        profile.savingsOverride,
        profile.currentSavings,
        profile.current_savings
      )
    );

    const savings = num(
      pickFirst(
        profile.savings,
        profile.cash,
        profile.cash_on_hand,
        profile.cashOnHand
      )
    );

    const income = num(
      pickFirst(
        profile.income,
        profile.monthly_income,
        profile.monthlyIncome,
        profile.total_monthly_income,
        profile.totalMonthlyIncome,
        profile.total_monthly,
        profile.totalMonthly
      )
    );

    const debt = num(
      pickFirst(
        profile.debt,
        profile.monthly_debt,
        profile.monthlyDebt,
        profile.debt_monthly,
        profile.debtPayments,
        profile.non_housing_debt,
        profile.nonHousingDebt
      )
    );

    return stripEmpty({
      id: pickFirst(profile.id, profile.profile_id, profile.profileId),
      profiles_user_id_unique: pickFirst(
        profile.profiles_user_id_unique,
        profile.user_id,
        profile.userId
      ),

      email: lowerEmail(profile.email || ""),
      full_name: fullName,
      first_name: first,
      last_name: last,
      phone: clean(profile.phone || ""),

      mode: clean(
        pickFirst(
          profile.mode,
          profile.user_type,
          profile.userType,
          profile.status_type,
          profile.military_status
        )
      ),
      military_status: clean(
        pickFirst(
          profile.military_status,
          profile.mode,
          profile.user_type,
          profile.userType
        )
      ),

      rank: clean(pickFirst(profile.rank, rankPaygrade)),
      rank_paygrade: rankPaygrade,

      va_disability: num(
        pickFirst(profile.va_disability, profile.vaDisability, profile.va)
      ),

      funding_fee_exempt: pickFirst(
        profile.funding_fee_exempt,
        profile.fundingFeeExempt,
        profile.va_funding_fee_exempt,
        profile.vaFundingFeeExempt
      ),

      yos: num(
        pickFirst(profile.yos, profile.years_of_service, profile.yearsOfService)
      ),

      family: pickFirst(
        profile.family,
        profile.dependents,
        profile.withDependents,
        profile.with_dependents,
        profile.hasDependents
      ),

      family_size: num(
        pickFirst(
          profile.family_size,
          profile.familySize,
          profile.household_size,
          profile.householdSize
        )
      ),

      base,
      zip,

      projected_home_price: projectedHomePrice,
      monthly_expenses: monthlyExpenses,
      income,
      debt,
      downpayment,
      savings,

      credit_score: num(
        pickFirst(profile.credit_score, profile.creditScore, profile.fico, profile.score)
      ),

      bedrooms: num(pickFirst(profile.bedrooms, profile.beds)),
      bathrooms: num(pickFirst(profile.bathrooms, profile.baths)),
      sqft: num(profile.sqft),
      property_type: clean(pickFirst(profile.property_type, profile.propertyType)),
      amenities: clean(profile.amenities || ""),
      home_condition: clean(pickFirst(profile.home_condition, profile.homeCondition)),

      cityKey: clean(
        pickFirst(profile.cityKey, profile.city_key, profile.market, profile.marketSlug)
      ),

      loanType: clean(pickFirst(profile.loanType, profile.loan_type, "va")),
      termYears: num(pickFirst(profile.termYears, profile.term_years, 30)),

      priorUse: pickFirst(
        profile.priorUse,
        profile.prior_use,
        profile.vaPriorUse,
        profile.va_prior_use,
        profile.usedVaBefore,
        profile.used_va_before
      ),

      occupancyIntent: pickFirst(
        profile.occupancyIntent,
        profile.occupancy_intent,
        profile.occupancy,
        profile.primaryResidence,
        profile.primary_residence
      ),

      fullEntitlement: pickFirst(profile.fullEntitlement, profile.full_entitlement),
      entitlementUsed: num(pickFirst(profile.entitlementUsed, profile.entitlement_used)),
      sellerCredit: num(pickFirst(profile.sellerCredit, profile.seller_credit)),
      pcsTimelineMonths: num(
        pickFirst(profile.pcsTimelineMonths, profile.pcs_timeline_months)
      ),
      expectedHoldMonths: num(
        pickFirst(profile.expectedHoldMonths, profile.expected_hold_months)
      ),

      notes: clean(profile.notes || "")
    });
  }

  function getFirstName(profile) {
    if (!profile || typeof profile !== "object") return "";

    return clean(
      profile.first_name ||
      profile.firstName ||
      (profile.full_name || profile.fullName || profile.name || "").split(/\s+/)[0]
    );
  }

  function buildContextSummary(profile) {
    if (!profile || typeof profile !== "object") return "";

    const parts = [];

    if (profile.full_name) parts.push("Name: " + profile.full_name);
    if (profile.email) parts.push("Email: " + profile.email);
    if (profile.mode) parts.push("Status: " + profile.mode);
    if (profile.base) parts.push("Base: " + profile.base);
    if (profile.zip) parts.push("ZIP: " + profile.zip);
    if (profile.rank_paygrade || profile.rank) {
      parts.push("Rank: " + (profile.rank_paygrade || profile.rank));
    }
    if (profile.yos != null) parts.push("YOS: " + profile.yos);
    if (profile.family != null) parts.push("Dependents: " + String(profile.family));
    if (profile.family_size != null) parts.push("Family Size: " + profile.family_size);

    if (profile.va_disability != null) {
      parts.push("VA Disability: " + profile.va_disability + "%");
    }

    if (profile.projected_home_price) {
      parts.push("Target Price: " + money(profile.projected_home_price));
    }

    if (profile.monthly_expenses) {
      parts.push("Monthly Expenses: " + money(profile.monthly_expenses));
    }

    if (profile.downpayment) {
      parts.push("Down Payment: " + money(profile.downpayment));
    }

    if (profile.savings) {
      parts.push("Savings: " + money(profile.savings));
    }

    if (profile.credit_score) parts.push("Credit Score: " + profile.credit_score);
    if (profile.bedrooms) parts.push("Bedrooms: " + profile.bedrooms);

    return parts.join(" | ");
  }

  /* ============================================================
    //#6) PROFILE + SIGNAL RENDERING
  ============================================================ */

  function hydrateProfileRail() {
    const profile = state.mergedProfile || {};
    const first = getFirstName(profile);
    const displayName =
      profile.full_name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      first ||
      "Guest User";

    setText(dom.profileName, displayName || "Guest User");

    if (hasUsefulProfile(profile)) {
      setText(dom.profileStatus, "Loaded");
      setClassState(dom.profileStatus, "is-live", true);
      setClassState(dom.profileStatus, "is-warn", false);
    } else {
      setText(dom.profileStatus, "Guest");
      setClassState(dom.profileStatus, "is-live", false);
      setClassState(dom.profileStatus, "is-warn", true);
    }

    setText(dom.profileRank, profile.rank_paygrade || profile.rank || "—");
    setText(dom.profileBase, profile.base || "—");
    setText(dom.profileZip, profile.zip || "—");
    setText(dom.profileMode, profile.mode || profile.military_status || "—");

    if (dom.chatTitle && first) {
      dom.chatTitle.textContent = `Amy is online, ${first}`;
    }
  }

  function hydrateSignalRail() {
    const raw = state.localContext?._raw || {};
    const profile = state.mergedProfile || {};

    const hasProfile = hasUsefulProfile(profile);
    const hasBridge = objectHasKeys(raw.bridge) || objectHasKeys(raw.legacy_bridge);
    const hasFinancial =
      objectHasKeys(raw.financial_intake) ||
      objectHasKeys(raw.kpi_overrides) ||
      Boolean(profile.projected_home_price || profile.monthly_expenses || profile.credit_score);
    const hasBase =
      Boolean(profile.base || profile.zip) ||
      Boolean(raw.selected_base) ||
      Boolean(raw.selected_city_json_url);

    renderSignal(dom.signalProfile, dom.signalProfileText, hasProfile, hasProfile ? "Profile loaded" : "Guest mode");
    renderSignal(dom.signalBridge, dom.signalBridgeText, hasBridge, hasBridge ? "Bridge found" : "No bridge");
    renderSignal(dom.signalFinancial, dom.signalFinancialText, hasFinancial, hasFinancial ? "Inputs found" : "No inputs");
    renderSignal(dom.signalBase, dom.signalBaseText, hasBase, hasBase ? "Base context found" : "No base");
  }

  function renderSignal(element, textElement, isLive, text) {
    if (!element || !textElement) return;

    element.classList.toggle("is-live", Boolean(isLive));
    element.classList.toggle("is-warn", !isLive);
    textElement.textContent = text;
  }

  function hasUsefulProfile(profile) {
    if (!profile || typeof profile !== "object") return false;

    return Boolean(
      profile.email ||
      profile.full_name ||
      profile.first_name ||
      profile.rank_paygrade ||
      profile.rank ||
      profile.base ||
      profile.zip ||
      profile.projected_home_price ||
      profile.monthly_expenses
    );
  }

  /* ============================================================
    //#7) CHAT UX
  ============================================================ */

  function greetUser() {
    const profile = state.mergedProfile || {};
    const first = getFirstName(profile);

    const greeting = first
      ? `Hey ${first} — I’m Amy, your PCSUnited AI Concierge powered by TheWing.ai. Ask me about your military pay, BAH, PCS housing strategy, affordability, mortgage estimate, VA Loan plan, or what your financial dashboard is really telling you.`
      : "Hey — I’m Amy, your PCSUnited AI Concierge powered by TheWing.ai. Ask me about military pay, BAH, PCS housing strategy, affordability, mortgage estimates, VA Loan planning, or financial readiness.";

    pushMessage("amy", greeting, { typewriter: true, speed: 13, delay: 160 });
  }

  function handleInputKeydown(event) {
    if (!event) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      trySend();
      return;
    }

    window.setTimeout(autoResizeInput, 0);
  }

  function autoResizeInput() {
    if (!dom.input) return;

    dom.input.style.height = "auto";
    dom.input.style.height = Math.min(dom.input.scrollHeight, 150) + "px";
  }

  async function trySend() {
    if (state.busy || !dom.input) return;

    const text = clean(dom.input.value);

    if (!text) return;

    const safeText = text.slice(0, MAX_MESSAGE_LENGTH);

    clearError();

    dom.input.value = "";
    autoResizeInput();

    await pushMessage("user", safeText);
    await callAmy(safeText);
  }

  async function pushMessage(role, content, options = {}) {
    if (!dom.chat) return null;

    const { typewriter = false, speed = 14, delay = 70 } = options;

    const msg = document.createElement("article");
    msg.className = role === "user" ? "amy-msg amy-msg--user" : "amy-msg amy-msg--amy";

    const meta = document.createElement("div");
    meta.className = "amy-msg__meta";
    meta.textContent = role === "user" ? "You" : "Amy";

    const body = document.createElement("div");
    body.className = "amy-msg__content";

    msg.appendChild(meta);
    msg.appendChild(body);

    dom.chat.appendChild(msg);
    state.messageCount += 1;

    scrollChatToBottom();

    if (!typewriter || prefersReducedMotion() || role === "user") {
      body.textContent = content;
      scrollChatToBottom();
      return msg;
    }

    await typewriterInto(body, content, speed, delay);
    scrollChatToBottom();

    return msg;
  }

  function showTyping() {
    if (!dom.chat) return;

    hideTyping();

    const msg = document.createElement("article");
    msg.className = "amy-msg amy-msg--amy";
    msg.id = "amy-typing-message";

    const meta = document.createElement("div");
    meta.className = "amy-msg__meta";
    meta.textContent = "Amy";

    const body = document.createElement("div");
    body.className = "amy-msg__content";

    const typing = document.createElement("span");
    typing.className = "amy-typing";
    typing.setAttribute("aria-label", "Amy is reviewing your question");
    typing.innerHTML = "<span></span><span></span><span></span>";

    const text = document.createElement("span");
    text.textContent = " Reviewing your PCSUnited context…";
    text.style.color = "var(--amy-muted)";

    body.appendChild(typing);
    body.appendChild(text);

    msg.appendChild(meta);
    msg.appendChild(body);

    dom.chat.appendChild(msg);
    scrollChatToBottom();
  }

  function hideTyping() {
    const existing = document.getElementById("amy-typing-message");
    if (existing) existing.remove();
  }

  function scrollChatToBottom() {
    if (!dom.chat) return;
    dom.chat.scrollTop = dom.chat.scrollHeight;
  }

  function typewriterInto(element, text, speed = 14, startDelay = 70) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      element.textContent = "";

      const caret = document.createElement("span");
      caret.className = "amy-type-caret";
      element.appendChild(caret);

      let index = 0;
      const safeText = String(text || "");

      const tick = () => {
        if (index < safeText.length) {
          caret.insertAdjacentText("beforebegin", safeText.charAt(index));
          index += 1;
          scrollChatToBottom();
          window.setTimeout(tick, speed);
        } else {
          caret.remove();
          resolve();
        }
      };

      window.setTimeout(tick, startDelay);
    });
  }

  /* ============================================================
    //#8) API CALL
  ============================================================ */

  async function callAmy(userText) {
    state.busy = true;
    setBusy(true);
    setConnectionState("working", "Thinking");
    showTyping();

    const started = Date.now();

    try {
      refreshLocalContext();

      const localContext = state.localContext || collectLocalContext();
      const mergedProfile = normalizeProfile(localContext.profile || {});
      const contextSummary = buildContextSummary(mergedProfile);

      const payload = buildAmyPayload({
        message: userText,
        localContext,
        mergedProfile,
        contextSummary
      });

      const response = await fetch(state.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      const elapsed = Date.now() - started;

      hideTyping();

      if (!response.ok || !data || data.ok !== true) {
        const msg =
          data?.error ||
          data?.detail ||
          `TheWing.ai returned HTTP ${response.status}.`;

        throw new Error(msg);
      }

      state.lastResponse = data;
      state.lastTruthPacket = data.truth_packet || null;

      const reply = clean(
        data.reply ||
        data.answer?.summary ||
        data.answer?.bluf ||
        "I’m here. What would you like to explore?"
      );

      renderResponseMeta(data, elapsed);
      renderTruthPacket(data.truth_packet || null, data);
      setConnectionState("ready", "Connected");

      const ui = data.ui || {};
      const speed = Number(ui.speed || 12);
      const delay = Number(ui.startDelay || 60);

      await pushMessage("amy", reply, {
        typewriter: true,
        speed: Number.isFinite(speed) ? speed : 12,
        delay: Number.isFinite(delay) ? delay : 60
      });
    } catch (error) {
      hideTyping();

      const message = clean(error?.message) || "Amy could not reach TheWing.ai.";
      showError(
        `${message} Confirm this frontend is posting to ${state.endpoint}.`
      );

      setConnectionState("error", "Connection issue");

      await pushMessage(
        "amy",
        "I hit a connection snag. The frontend is loaded, but I could not get a clean response from TheWing.ai. Confirm the endpoint is reachable, CORS allows this domain, and agent-amy.js is deployed.",
        { typewriter: true, speed: 11, delay: 50 }
      );
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  function buildAmyPayload({ message, localContext, mergedProfile, contextSummary }) {
    const email =
      mergedProfile?.email ||
      localContext?.identity?.email ||
      localContext?.bridge?.email ||
      localContext?._raw?.session_email ||
      undefined;

    return {
      message,
      email,
      profile: mergedProfile || undefined,
      identity: localContext?.identity || undefined,
      bridge: localContext?.bridge || undefined,
      context: {
        profile: mergedProfile || undefined,
        identity: localContext?.identity || undefined,
        bridge: localContext?.bridge || undefined,
        session: localContext?.session || undefined,
        financial_intake: localContext?.financial_intake || undefined,
        kpi_overrides: localContext?.kpi_overrides || undefined,
        baseline: localContext?.baseline || undefined,
        selected_base: localContext?.selected_base || undefined,
        selected_city_json_url: localContext?.selected_city_json_url || undefined,
        profile_summary: contextSummary || undefined
      },
      profileContext: contextSummary || undefined
    };
  }

  /* ============================================================
    //#9) RESPONSE META RENDERING
  ============================================================ */

  function renderResponseMeta(data, elapsed) {
    const intent = clean(data?.intent || "ready");
    const latency = Number(data?.latency_ms || elapsed || 0);

    if (dom.intentPill) {
      dom.intentPill.textContent = `Intent: ${formatIntent(intent)}`;
    }

    if (dom.latencyPill) {
      dom.latencyPill.textContent = latency ? `Latency: ${latency}ms` : "Latency: —";
    }
  }

  function setBusy(isBusy) {
    if (dom.send) dom.send.disabled = Boolean(isBusy);
    if (dom.input) dom.input.disabled = Boolean(isBusy);
  }

  function setConnectionState(status, label) {
    if (dom.connectionLabel) dom.connectionLabel.textContent = label || "Ready";

    if (!dom.connectionDot) return;

    dom.connectionDot.classList.remove(
      "amy-dot--idle",
      "amy-dot--ready",
      "amy-dot--working",
      "amy-dot--error"
    );

    if (status === "ready") {
      dom.connectionDot.classList.add("amy-dot--ready");
    } else if (status === "working") {
      dom.connectionDot.classList.add("amy-dot--working");
    } else if (status === "error") {
      dom.connectionDot.classList.add("amy-dot--error");
    } else {
      dom.connectionDot.classList.add("amy-dot--idle");
    }
  }

  function showError(message) {
    if (dom.errorStrip) dom.errorStrip.hidden = false;
    if (dom.errorText) dom.errorText.textContent = message;
  }

  function clearError() {
    if (dom.errorStrip) dom.errorStrip.hidden = true;
    if (dom.errorText) dom.errorText.textContent = "";
  }

  /* ============================================================
    //#10) TRUTH PACKET RENDERING
  ============================================================ */

  function hydrateInitialIntel() {
    renderTruthPacket(null, null);
  }

  function renderTruthPacket(packet, fullResponse) {
    const truth = packet && typeof packet === "object" ? packet : {};

    renderVerdict(truth.verdict || null);
    renderCompensation(truth.compensation || null);
    renderMortgage(truth.mortgage || null);
    renderAffordability(truth.affordability || null);
    renderVaLoan(truth.va_loan || null);
    renderNextAction(truth.next_action || null);
    renderMissingInputs(truth.missing_inputs || []);

    if (fullResponse?.profile_used) {
      const profileUsed = normalizeProfile(fullResponse.profile_used);
      if (profileUsed) {
        state.mergedProfile = mergeObjects(state.mergedProfile || {}, profileUsed);
        hydrateProfileRail();
      }
    }
  }

  function renderVerdict(verdict) {
    const safe = verdict && typeof verdict === "object" ? verdict : null;

    if (dom.verdictCard) {
      dom.verdictCard.classList.remove(
        "is-green",
        "is-caution",
        "is-partial",
        "is-no-go",
        "is-insufficient"
      );
    }

    if (!safe) {
      setText(dom.verdictLabel, "Waiting for analysis");
      setText(dom.verdictGrade, "—");
      setText(dom.verdictBluf, "Ask Amy a question to generate a readiness read.");
      return;
    }

    const status = clean(safe.status || safe.label || "Analysis");
    const grade = clean(safe.grade || safe.score || "—");
    const label = clean(safe.label || formatIntent(status) || "Decision Read");
    const bluf = clean(safe.bluf || safe.summary || "Amy has a first-pass read.");

    setText(dom.verdictLabel, label);
    setText(dom.verdictGrade, grade);
    setText(dom.verdictBluf, bluf);

    const statusKey = status.toLowerCase();

    if (dom.verdictCard) {
      if (statusKey.includes("green")) dom.verdictCard.classList.add("is-green");
      else if (statusKey.includes("caution")) dom.verdictCard.classList.add("is-caution");
      else if (statusKey.includes("partial")) dom.verdictCard.classList.add("is-partial");
      else if (statusKey.includes("no-go") || statusKey.includes("nogo")) dom.verdictCard.classList.add("is-no-go");
      else if (statusKey.includes("insufficient")) dom.verdictCard.classList.add("is-insufficient");
    }
  }

  function renderCompensation(comp) {
    const safe = comp && typeof comp === "object" ? comp : null;

    if (!safe) {
      setTag(dom.compStatus, "Idle", "warn");
      setText(dom.compTotal, "—");
      setText(dom.compBasePay, "—");
      setText(dom.compBas, "—");
      setText(dom.compBah, "—");
      return;
    }

    setTag(dom.compStatus, "Loaded", "live");

    setText(dom.compTotal, money(safe.total_monthly));
    setText(dom.compBasePay, money(safe.base_pay));
    setText(dom.compBas, money(safe.bas));
    setText(dom.compBah, money(safe.bah));

    const profileUpdates = stripEmpty({
      rank_paygrade: safe.rank_paygrade,
      rank: safe.rank_short || safe.rank,
      base: safe.base,
      zip: safe.zip
    });

    if (objectHasKeys(profileUpdates)) {
      state.mergedProfile = mergeObjects(state.mergedProfile || {}, profileUpdates);
      hydrateProfileRail();
    }
  }

  function renderMortgage(mortgage) {
    const safe = mortgage && typeof mortgage === "object" ? mortgage : null;

    if (!safe) {
      setTag(dom.mtgStatus, "Idle", "warn");
      setText(dom.mtgAllIn, "—");
      setText(dom.mtgPrice, "—");
      setText(dom.mtgLoan, "—");
      setText(dom.mtgApr, "—");
      return;
    }

    setTag(dom.mtgStatus, "Loaded", "live");

    setText(dom.mtgAllIn, money(safe.all_in_monthly));
    setText(dom.mtgPrice, money(safe.price));
    setText(dom.mtgLoan, money(safe.loan_amount));
    setText(dom.mtgApr, formatApr(safe.apr));
  }

  function renderAffordability(affordability) {
    const safe = affordability && typeof affordability === "object" ? affordability : null;

    if (!safe) {
      setTag(dom.affordStatus, "Idle", "warn");
      setText(dom.affordHousingRatio, "—");
      setText(dom.affordBackendRatio, "—");
      setText(dom.affordResidual, "—");
      setRatioBar(dom.affordHousingBar, null);
      setRatioBar(dom.affordBackendBar, null);
      return;
    }

    const status = clean(safe.status || safe.score || "Loaded");
    const tagTone = status.toLowerCase().includes("no-go")
      ? "error"
      : status.toLowerCase().includes("caution")
        ? "warn"
        : "live";

    setTag(dom.affordStatus, status, tagTone);

    setText(dom.affordHousingRatio, pct(safe.housing_ratio));
    setText(dom.affordBackendRatio, pct(safe.backend_ratio));
    setText(dom.affordResidual, money(safe.residual_income));

    setRatioBar(dom.affordHousingBar, safe.housing_ratio);
    setRatioBar(dom.affordBackendBar, safe.backend_ratio);
  }

  function renderVaLoan(vaLoan) {
    const safe = vaLoan && typeof vaLoan === "object" ? vaLoan : null;

    if (!safe) {
      setTag(dom.vaStatus, "Idle", "warn");
      setText(dom.vaTitle, "No VA Loan packet loaded yet.");
      setText(
        dom.vaBluf,
        "Ask Amy about VA eligibility, funding fee, zero down, no PMI, entitlement, or PCS buying strategy."
      );
      return;
    }

    setTag(dom.vaStatus, "Loaded", "live");

    setText(dom.vaTitle, safe.title || formatIntent(safe.topic || "VA Loan"));
    setText(
      dom.vaBluf,
      safe.bluf ||
        safe.summary ||
        "Amy loaded VA Loan guidance for the current question."
    );
  }

  function renderNextAction(nextAction) {
    const safe = nextAction && typeof nextAction === "object" ? nextAction : null;

    if (!safe) {
      setText(dom.nextLabel, "Stand by");
      setText(dom.nextMessage, "Ask a question and Amy will recommend a practical next move.");
      return;
    }

    setText(dom.nextLabel, safe.label || formatIntent(safe.type || "Next Action"));
    setText(dom.nextMessage, safe.message || "Continue with the next best PCSUnited action.");
  }

  function renderMissingInputs(missing) {
    const list = Array.isArray(missing) ? missing.filter(Boolean) : [];

    setText(dom.missingCount, String(list.length));

    if (!dom.missingList) return;

    dom.missingList.innerHTML = "";

    if (!list.length) {
      const item = document.createElement("li");
      item.textContent = "No missing inputs detected.";
      dom.missingList.appendChild(item);
      return;
    }

    list.slice(0, 8).forEach((input) => {
      const item = document.createElement("li");
      item.textContent = formatIntent(input);
      dom.missingList.appendChild(item);
    });
  }

  function setRatioBar(element, value) {
    if (!element) return;

    element.classList.remove("is-warn", "is-danger");

    const n = Number(value);

    if (!Number.isFinite(n) || n < 0) {
      element.style.width = "0%";
      return;
    }

    const pctValue = Math.max(0, Math.min(100, Math.round(n * 100)));

    element.style.width = Math.min(100, pctValue * 2) + "%";

    if (n >= 0.5) {
      element.classList.add("is-danger");
    } else if (n >= 0.35) {
      element.classList.add("is-warn");
    }
  }

  /* ============================================================
    //#11) UI HELPERS
  ============================================================ */

  function setText(element, value) {
    if (!element) return;

    const text = value === null || value === undefined || value === "" ? "—" : String(value);
    element.textContent = text;
  }

  function setTag(element, label, tone) {
    if (!element) return;

    element.textContent = label || "Idle";
    element.classList.remove("is-live", "is-warn", "is-error");

    if (tone === "live") element.classList.add("is-live");
    if (tone === "warn") element.classList.add("is-warn");
    if (tone === "error") element.classList.add("is-error");
  }

  function setClassState(element, className, enabled) {
    if (!element) return;
    element.classList.toggle(className, Boolean(enabled));
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ============================================================
    //#12) FORMAT HELPERS
  ============================================================ */

  function clean(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function lowerEmail(value) {
    const email = clean(value).toLowerCase();
    return email.includes("@") ? email : "";
  }

  function num(value) {
    if (value === null || value === undefined || value === "") return null;

    if (typeof value === "string") {
      const cleaned = value.replace(/[$,%\s,]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function money(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "—";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Math.round(n));
  }

  function pct(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "—";

    return `${(n * 100).toFixed(1)}%`;
  }

  function formatApr(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) return "—";

    if (n <= 1) return `${(n * 100).toFixed(2)}%`;

    return `${n.toFixed(2)}%`;
  }

  function formatIntent(value) {
    const s = clean(value);

    if (!s) return "—";

    return s
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function pickFirst(...values) {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(typeof value === "number" && !Number.isFinite(value))
      ) {
        return value;
      }
    }

    return null;
  }

  function normalizeObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value;
  }

  function objectHasKeys(value) {
    return Boolean(value && typeof value === "object" && Object.keys(value).length);
  }

  function stripEmpty(obj) {
    if (!obj || typeof obj !== "object") return {};

    const out = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      if (Array.isArray(value)) {
        if (value.length) out[key] = value;
        return;
      }

      if (typeof value === "object") {
        const nested = stripEmpty(value);
        if (Object.keys(nested).length) out[key] = nested;
        return;
      }

      out[key] = value;
    });

    return out;
  }

  function mergeObjects(...objects) {
    const out = {};

    objects.forEach((obj) => {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;

      Object.entries(obj).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;

        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          out[key] = mergeObjects(out[key] || {}, value);
        } else {
          out[key] = value;
        }
      });
    });

    return out;
  }

  /* ============================================================
    //#13) DEBUG HOOK
  ============================================================ */

  window.AskAmyCommandCenter = {
    version: "1.0.0",
    getState() {
      return {
        ...state,
        dom: undefined
      };
    },
    refreshContext: refreshLocalContext,
    collectLocalContext,
    normalizeProfile,
    send(message) {
      if (!message || state.busy) return;
      pushMessage("user", String(message));
      return callAmy(String(message));
    },
    renderTruthPacket(packet) {
      renderTruthPacket(packet || null, null);
    }
  };
})();
