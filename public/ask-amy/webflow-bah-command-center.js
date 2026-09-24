/* Inlined into public/ask-amy/webflow-bah-command-center.html for Webflow paste. */
(() => {
  "use strict";

  const root = document.getElementById("ask-amy-shell");
  if (!root || root.__askAmyMountedV62) return;
  root.__askAmyMountedV62 = true;

  const DEFAULT_ENDPOINT =
    "https://thewing.netlify.app/.netlify/functions/agent-amy-public";
  const ENDPOINT = String(root.getAttribute("data-endpoint") || DEFAULT_ENDPOINT).trim();
  const BAH_CALCULATOR_ORIGIN = "https://thewing.netlify.app";
  const BAH_MESSAGE_TYPE = "pcsunited-bah-compensation";
  const BAH_REQUEST_TYPE = "pcsunited-bah-header-request";
  const BAH_CALCULATOR_SOURCE = "pcsunited.bah.calculator";

  const chatEl = document.getElementById("aa-chat");
  const inputEl = document.getElementById("aa-input");
  const sendBtn = document.getElementById("aa-send");
  const promptButtons = Array.from(root.querySelectorAll(".aa-prompt-btn"));
  if (!chatEl || !inputEl || !sendBtn) return;

  const state = {
    conversationId: createConversationId(),
    thread: [],
    memory: {},
    sending: false,
    bahSnapshot: null
  };

  function createConversationId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "thewing-bah-" + window.crypto.randomUUID();
      }
    } catch (_) {}
    return "thewing-bah-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function cloneSafe(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  }

  function firstValue(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  }

  function firstObject(...values) {
    for (const value of values) {
      if (isObject(value) && Object.keys(value).length) return cloneSafe(value, {});
    }
    return {};
  }

  function firstPacket(...values) {
    for (const value of values) {
      if (isObject(value) && Object.keys(value).length) return cloneSafe(value, null);
    }
    return null;
  }

  function stripEmptyObject(object) {
    const output = {};
    if (!isObject(object)) return output;
    for (const [key, value] of Object.entries(object)) {
      if (value === undefined || value === null || value === "") continue;
      output[key] = value;
    }
    return output;
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function numberFromMoney(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const number = Number(String(value).replace(/[$,%\s,]/g, "").trim());
    return Number.isFinite(number) ? number : null;
  }

  function yearsFromValue(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const match = String(value).match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const number = Number(match[0]);
    return Number.isFinite(number) ? number : null;
  }

  function dependentsFromValue(value) {
    if (value === true || value === false) return value;
    if (value === null || value === undefined || value === "") return null;
    const text = String(value).trim().toLowerCase();
    if (text.includes("without") || text === "no" || text === "false" || text === "0") {
      return false;
    }
    if (
      text.includes("with") ||
      text.includes("dependent") ||
      text === "yes" ||
      text === "true" ||
      text === "1"
    ) {
      return true;
    }
    return null;
  }

  function normalizeBahSnapshot(raw) {
    if (!isObject(raw)) return null;

    const detail = isObject(raw.detail)
      ? raw.detail
      : isObject(raw.payload)
        ? raw.payload
        : raw;

    const basePay = numberFromMoney(
      firstValue(detail.basePay, detail.base_pay, detail.basicPay, detail.monthly?.basePay)
    );
    const bah = numberFromMoney(
      firstValue(detail.bah, detail.BAH, detail.monthlyBAH, detail.monthly?.bah)
    );
    const bas = numberFromMoney(
      firstValue(detail.bas, detail.BAS, detail.monthly?.bas)
    );
    const totalMonthly = numberFromMoney(
      firstValue(
        detail.totalMonthly,
        detail.total_monthly,
        detail.total,
        detail.grossMonthlyComp,
        detail.monthly?.total
      )
    );
    const rank = clean(
      firstValue(detail.rank, detail.rank_paygrade, detail.rankPaygrade, detail.paygrade)
    );
    const yos = yearsFromValue(
      firstValue(detail.yos, detail.yearsOfService, detail.years_of_service)
    );
    const location = clean(firstValue(detail.location, detail.base));
    let base = clean(firstValue(detail.base, detail.pcsBase));
    let mhaName = clean(firstValue(detail.mhaName, detail.mha_name));

    if (!base && location) base = location.split("•")[0].trim();
    if (!mhaName && location.includes("•")) {
      mhaName = location.split("•").slice(1).join("•").trim();
    }

    const zip = clean(
      firstValue(detail.zip, detail.dutyZip, detail.bahZip, detail.bah_zip)
    );
    const withDependents = dependentsFromValue(
      firstValue(
        detail.withDependents,
        detail.with_dependents,
        detail.family,
        detail.dependents
      )
    );
    const dependentLabel = clean(detail.dependents);
    const hasCompensation = [basePay, bah, bas, totalMonthly].some((value) =>
      Number.isFinite(value)
    );
    if (!hasCompensation) return null;

    return {
      basePay,
      bah,
      bas,
      totalMonthly,
      rank,
      yos,
      base,
      zip,
      mhaName,
      location,
      withDependents,
      dependentLabel,
      updated_at:
        clean(firstValue(detail.updated_at, detail.updatedAt)) ||
        new Date().toISOString()
    };
  }

  function setLatestBahSnapshot(value) {
    const snapshot = normalizeBahSnapshot(value);
    if (!snapshot) return null;
    state.bahSnapshot = cloneSafe(snapshot, null);
    window.PCSU_BAH_AMY_CURRENT = cloneSafe(snapshot, null);
    return cloneSafe(state.bahSnapshot, null);
  }

  function readBahSnapshotFromHeader() {
    try {
      const headerApi = window.PCSU_BAH_HEADER;
      if (headerApi && typeof headerApi.getSnapshot === "function") {
        return normalizeBahSnapshot(headerApi.getSnapshot());
      }
    } catch (_) {}
    return null;
  }

  function hydrateBahSnapshot() {
    const headerSnapshot = readBahSnapshotFromHeader();
    if (headerSnapshot) return setLatestBahSnapshot(headerSnapshot);
    if (state.bahSnapshot) return cloneSafe(state.bahSnapshot, null);
    return null;
  }

  function requestBahSnapshotFromFrames() {
    const request = {
      type: BAH_REQUEST_TYPE,
      source: "thewing.bah.ask-amy",
      version: "6.2.0"
    };
    Array.from(document.querySelectorAll("iframe")).forEach((frame) => {
      try {
        if (!frame.contentWindow) return;
        const src = frame.getAttribute("src") || "";
        if (src) {
          try {
            const url = new URL(src, window.location.href);
            if (url.origin !== BAH_CALCULATOR_ORIGIN) return;
          } catch (_) {}
        }
        frame.contentWindow.postMessage(request, BAH_CALCULATOR_ORIGIN);
      } catch (_) {}
    });
  }

  function bindBahBridge() {
    if (window.__THEWING_BAH_AMY_BRIDGE_BOUND) return;
    window.__THEWING_BAH_AMY_BRIDGE_BOUND = true;

    window.addEventListener("message", (event) => {
      if (!event || event.origin !== BAH_CALCULATOR_ORIGIN) return;
      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (
        message.type !== BAH_MESSAGE_TYPE &&
        message.source !== BAH_CALCULATOR_SOURCE
      ) {
        return;
      }
      setLatestBahSnapshot(message);
    });

    const headerSnapshot = readBahSnapshotFromHeader();
    if (headerSnapshot) setLatestBahSnapshot(headerSnapshot);

    window.addEventListener("pcsunited:bah-header-ready", () => {
      const snapshot = readBahSnapshotFromHeader();
      if (snapshot) setLatestBahSnapshot(snapshot);
      requestBahSnapshotFromFrames();
    });

    [0, 250, 750, 1500, 3000].forEach((delay) => {
      setTimeout(requestBahSnapshotFromFrames, delay);
    });

    window.PCSU_BAH_AMY_BRIDGE = {
      getSnapshot() {
        return hydrateBahSnapshot();
      },
      refresh() {
        requestBahSnapshotFromFrames();
        return hydrateBahSnapshot();
      }
    };
  }

  bindBahBridge();

  async function getBahSnapshotForAmy() {
    let snapshot = hydrateBahSnapshot();
    if (snapshot) return snapshot;
    requestBahSnapshotFromFrames();
    await new Promise((resolve) => {
      setTimeout(resolve, 180);
    });
    return hydrateBahSnapshot();
  }

  function buildAmyCompensationPacket(snapshot) {
    if (!snapshot) return null;
    return stripEmptyObject({
      basePay: snapshot.basePay,
      bah: snapshot.bah,
      bas: snapshot.bas,
      totalMonthly: snapshot.totalMonthly,
      rank: snapshot.rank,
      yos: snapshot.yos,
      base: snapshot.base,
      zip: snapshot.zip,
      withDependents: snapshot.withDependents,
      mhaName: snapshot.mhaName,
      source: "bah_calculator_displayed_result"
    });
  }

  function buildAmyBahProfile(snapshot) {
    if (!snapshot) return {};
    return stripEmptyObject({
      mode: "active",
      rank_paygrade: snapshot.rank,
      yos: snapshot.yos,
      base: snapshot.base,
      zip: snapshot.zip,
      family: snapshot.withDependents
    });
  }

  function collectPublicPageContext() {
    const basicBrainCurrent = firstObject(
      window.PCSU_BASICBRAIN_CURRENT,
      window.PCSUnitedBasicBrain,
      window.PCSUnitedBasicBrainCurrent
    );
    const profile = firstObject(
      basicBrainCurrent.profile,
      window.PCSUnitedPublicProfile,
      window.PCSUnitedProfile
    );
    const bridge = firstObject(
      basicBrainCurrent.bridge,
      window.PCSU_BASICBRAIN_BRIDGE,
      window.PCSUnitedBridge
    );
    const compensation = firstPacket(
      basicBrainCurrent.compensation,
      window.PCSU_COMPENSATION_CURRENT,
      window.PCSUnitedCompensation
    );
    const mortgage = firstPacket(
      window.PCSU_MORTGAGE_CURRENT,
      window.PCSUnitedMortgage,
      window.PCSUnitedMortgageResults
    );
    const housingPreferences = firstObject(
      window.PCSUnitedHousingPreferences,
      window.PCSU_HOUSING_PREFERENCES
    );
    const fad = firstObject(
      window.PCSUnitedFAD,
      window.PCSU_FAD_CURRENT,
      housingPreferences ? { housing_preferences: housingPreferences } : {}
    );
    return { profile, bridge, compensation, mortgage, fad };
  }

  function mergeMemory(current, patch) {
    const next = isObject(current) ? { ...current } : {};
    if (!isObject(patch)) return next;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (value === null) {
        delete next[key];
        continue;
      }
      next[key] = value;
    }
    return next;
  }

  function scrollToBottom() {
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  function rememberThread(role, content) {
    state.thread.push({ role, content: clean(content) });
    state.thread = state.thread.slice(-12);
  }

  async function pushMessage(role, content, options = {}) {
    const text = clean(content);
    if (!text) return;
    const typewriter = options.typewriter === true;
    const speed = Number(options.speed || 18);
    const delay = Number(options.delay || 80);
    const remember = options.remember !== false;
    const msg = document.createElement("div");
    msg.className = "aa-msg " + (role === "user" ? "aa-user" : "aa-bot");
    const textNode = document.createElement("span");
    msg.appendChild(textNode);
    chatEl.appendChild(msg);
    scrollToBottom();
    if (remember) rememberThread(role === "user" ? "user" : "assistant", text);
    if (!typewriter || prefersReducedMotion() || role === "user") {
      textNode.textContent = text;
      scrollToBottom();
      return;
    }
    await typewriterInto(textNode, text, speed, delay);
    scrollToBottom();
  }

  function showTyping() {
    hideTyping();
    const typing = document.createElement("div");
    typing.className = "aa-msg aa-bot aa-typing";
    typing.id = "aa-typing";
    typing.textContent = "Amy is reviewing your BAH and compensation context…";
    chatEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    const typing = document.getElementById("aa-typing");
    if (typing) typing.remove();
  }

  function typewriterInto(element, text, speed, startDelay) {
    return new Promise((resolve) => {
      element.textContent = "";
      const caret = document.createElement("span");
      caret.className = "aa-caret";
      element.appendChild(caret);
      let index = 0;
      function tick() {
        if (index < text.length) {
          caret.insertAdjacentText("beforebegin", text.charAt(index));
          index += 1;
          scrollToBottom();
          setTimeout(tick, speed);
          return;
        }
        caret.remove();
        resolve();
      }
      setTimeout(tick, startDelay);
    });
  }

  async function postToAmy(userText) {
    const publicContext = collectPublicPageContext();
    const historicalThread = state.thread.slice(0, -1);
    const bahSnapshot = await getBahSnapshotForAmy();
    const bahCompensation = buildAmyCompensationPacket(bahSnapshot);
    const bahProfile = buildAmyBahProfile(bahSnapshot);
    const mergedProfile = { ...publicContext.profile, ...bahProfile };
    const compensation =
      bahCompensation || publicContext.compensation || undefined;

    const payload = {
      message: userText,
      profile: mergedProfile,
      bridge: publicContext.bridge,
      compensation,
      mortgage: publicContext.mortgage || undefined,
      fad: publicContext.fad,
      context: {
        conversation_id: state.conversationId,
        thread: historicalThread,
        memory: state.memory,
        requested_mode: "education",
        response_limits: {
          max_chars: 900,
          greeting_max_chars: 260,
          max_follow_up_questions: 1
        },
        style_guide: {
          tone: "clear, practical, conversational, military compensation and BAH focused",
          format:
            "short paragraphs; explain acronyms; when a current BAH Calculator compensation packet is supplied, treat its displayed BAH, Base Pay, BAS, Total Monthly Compensation, rank, years of service, location, ZIP, and dependent status as the current-session result; do not invent or independently replace displayed calculator values; only calculate a different scenario when the user explicitly asks for a hypothetical or changed scenario; clearly distinguish BAH from housing affordability and actual housing expenses"
        },
        page: "TheWing.ai Air Force BAH Calculator",
        widget: "bah-calculator-ask-amy",
        product: "TheWing.ai",
        version: "6.2.0"
      }
    };

    const response = await fetch(ENDPOINT, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-PCSU-Client": "bah-calculator-ask-amy-v6.2"
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (_) {
      data = {};
    }

    if (!response.ok || !data || data.ok !== true) {
      const message = clean(data.error || data.message || "HTTP " + response.status);
      throw new Error(message || "Request failed.");
    }

    if (clean(data.conversation_id)) {
      state.conversationId = clean(data.conversation_id);
    }
    if (isObject(data.memory_patch)) {
      state.memory = mergeMemory(state.memory, data.memory_patch);
    }
    return data;
  }

  async function callAmy(userText) {
    if (state.sending) return;
    state.sending = true;
    sendBtn.disabled = true;
    inputEl.disabled = true;
    showTyping();
    try {
      const data = await postToAmy(userText);
      hideTyping();
      const reply = clean(
        data.reply ||
          data.answer?.summary ||
          "I’m here. Ask me about your current BAH, Base Pay, BAS, total monthly military compensation, duty location, dependent status, or PCS changes."
      );
      const ui = isObject(data.ui) ? data.ui : {};
      await pushMessage("assistant", reply, {
        typewriter: true,
        speed: Number(ui.speed || 18),
        delay: Number(ui.startDelay || 80),
        remember: true
      });
    } catch (error) {
      hideTyping();
      console.error("Ask Amy connection error:", error);
      await pushMessage(
        "assistant",
        "I hit a connection snag while reaching TheWing.ai. Please try again in a moment.",
        { typewriter: true, speed: 16, delay: 60, remember: false }
      );
    } finally {
      state.sending = false;
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  async function trySend(textOverride) {
    const text = clean(textOverride || inputEl.value);
    if (!text || state.sending) return;
    inputEl.value = "";
    await pushMessage("user", text, { remember: true });
    await callAmy(text);
  }

  sendBtn.addEventListener("click", () => {
    trySend();
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      trySend();
    }
  });

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const question = clean(button.getAttribute("data-question"));
      if (question) trySend(question);
    });
  });

  pushMessage(
    "assistant",
    "Hey — I’m Amy, your Air Force BAH Concierge. I can use the BAH Calculator’s current BAH, Base Pay, BAS, rank, years of service, duty location, and dependent status to explain what your compensation means. TheWing calculates it; I explain it.",
    { typewriter: true, speed: 18, delay: 220, remember: true }
  );
})();
