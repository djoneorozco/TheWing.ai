(function () {
  "use strict";

  if (window.__PCSU_PT_ASK_AMY_V100_MOUNTED__) return;
  window.__PCSU_PT_ASK_AMY_V100_MOUNTED__ = true;

  const launcher = document.getElementById("pcsu-pt-amy-launcher");
  const launcherScore = document.getElementById("pcsu-pt-amy-launcher-score");
  const modal = document.getElementById("pcsu-pt-amy-modal");
  const closeButton = document.getElementById("pcsu-pt-amy-close");
  const shell = document.getElementById("pcsu-pt-amy-shell");
  const chatElement = document.getElementById("pcsu-pt-aa-chat");
  const inputElement = document.getElementById("pcsu-pt-aa-input");
  const sendButton = document.getElementById("pcsu-pt-aa-send");
  const promptButtons = Array.from(document.querySelectorAll(".pcsu-pt-aa-prompt"));
  const snapshotElements = {
    total: document.getElementById("pcsu-pt-aa-total"),
    status: document.getElementById("pcsu-pt-aa-status"),
    body: document.getElementById("pcsu-pt-aa-body"),
    strength: document.getElementById("pcsu-pt-aa-strength"),
    core: document.getElementById("pcsu-pt-aa-core"),
    cardio: document.getElementById("pcsu-pt-aa-cardio"),
    whtr: document.getElementById("pcsu-pt-aa-whtr")
  };

  if (!launcher || !launcherScore || !modal || !closeButton || !shell || !chatElement || !inputElement || !sendButton) {
    return;
  }

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const DEFAULT_ENDPOINT = "https://thewing.netlify.app/.netlify/functions/agent-amy-public";
  const endpoint = String(shell.getAttribute("data-endpoint") || DEFAULT_ENDPOINT).trim();

  const state = {
    conversationId: createConversationId(),
    thread: [],
    memory: {},
    sending: false,
    currentSnapshot: {},
    previousHtmlOverflow: "",
    previousBodyOverflow: "",
    refreshTimer: null
  };

  function createConversationId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "pcsu-pt-" + window.crypto.randomUUID();
      }
    } catch (_) {}
    return "pcsu-pt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
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

  function firstObject() {
    const values = Array.prototype.slice.call(arguments);
    for (const value of values) {
      if (isObject(value) && Object.keys(value).length) {
        return cloneSafe(value, {});
      }
    }
    return {};
  }

  function normalizeKey(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function deepRead(object, aliases, depth) {
    const level = Number(depth || 0);
    if (!isObject(object) || level > 5) return undefined;
    const normalizedAliases = aliases.map(normalizeKey);
    for (const [key, value] of Object.entries(object)) {
      if (normalizedAliases.includes(normalizeKey(key))) return value;
    }
    for (const value of Object.values(object)) {
      if (isObject(value)) {
        const result = deepRead(value, aliases, level + 1);
        if (result !== undefined && result !== null && result !== "") return result;
      }
    }
    return undefined;
  }

  function firstDefined() {
    const values = Array.prototype.slice.call(arguments);
    for (const value of values) {
      if (value !== undefined && value !== null && clean(value) !== "") return value;
    }
    return null;
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const match = clean(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const number = Number(match[0]);
    return Number.isFinite(number) ? number : null;
  }

  function formatNumber(value, digits) {
    const number = parseNumber(value);
    if (number === null) return "--";
    const decimals = Number.isInteger(number) ? 0 : Number(digits == null ? 1 : digits);
    return number.toFixed(decimals);
  }

  function pageText() {
    return clean(document.body && document.body.innerText ? document.body.innerText : "").replace(/\s+/g, " ");
  }

  function matchText(text, regularExpression) {
    const match = text.match(regularExpression);
    return match && match[1] ? clean(match[1]) : null;
  }

  function getControlDescription(control) {
    if (!control) return "";
    const parts = [
      control.id,
      control.name,
      control.getAttribute("aria-label"),
      control.getAttribute("data-label"),
      control.getAttribute("placeholder")
    ];
    if (control.id) {
      try {
        const label = document.querySelector('label[for="' + CSS.escape(control.id) + '"]');
        if (label) parts.push(label.innerText);
      } catch (_) {}
    }
    const parent =
      control.closest(
        "label,[data-field],[data-control],.field,.control,.input-row,.component-input,.score-control,.calculator-control,.card"
      ) || control.parentElement;
    if (parent) parts.push(clean(parent.innerText).slice(0, 320));
    return clean(parts.filter(Boolean).join(" ")).toLowerCase();
  }

  function readableControlValue(control) {
    if (!control) return null;
    if (control.tagName === "SELECT") {
      const option =
        control.options && control.selectedIndex >= 0
          ? control.options[control.selectedIndex]
          : null;
      return clean(option ? option.textContent : control.value);
    }
    if (control.type === "radio" || control.type === "checkbox") {
      return control.checked ? clean(control.value || "Selected") : null;
    }
    return clean(control.value);
  }

  function findControlValue(keywords, options) {
    const settings = isObject(options) ? options : {};
    const normalizedKeywords = keywords.map((keyword) => clean(keyword).toLowerCase());
    const controls = Array.from(document.querySelectorAll("input, select, textarea"));
    for (const control of controls) {
      if (modal.contains(control) || control.disabled || control.type === "hidden") continue;
      if (settings.selectOnly && control.tagName !== "SELECT") continue;
      if (settings.excludeSelect && control.tagName === "SELECT") continue;
      if (
        settings.numericOnly &&
        !["number", "range", "time", "text"].includes(clean(control.type).toLowerCase())
      ) {
        continue;
      }
      const description = getControlDescription(control);
      const matches = normalizedKeywords.every((keyword) => description.includes(keyword));
      if (!matches) continue;
      const value = readableControlValue(control);
      if (value !== null && value !== "") return value;
    }
    return null;
  }

  function collectGlobalPtState() {
    return firstObject(
      window.PCSU_PT_CURRENT,
      window.PCSU_PT_CALCULATOR_CURRENT,
      window.PCSUnitedPTCurrent,
      window.PCSUnitedPTCalculator,
      window.PCSUnitedPT,
      window.PT_CALCULATOR_STATE,
      window.ptCalculatorState
    );
  }

  function collectPtSnapshot() {
    const text = pageText();
    const globalState = collectGlobalPtState();

    const totalFromText = matchText(text, /TOTAL\s+SCORE\s*([0-9]+(?:\.[0-9]+)?)/i);
    const bodyFromText = matchText(text, /BODY(?:\s+COMPOSITION)?\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*20/i);
    const strengthFromText = matchText(text, /STRENGTH\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*15/i);
    const coreFromText = matchText(text, /(?:CORE|ENDURANCE)\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*15/i);
    const cardioFromText = matchText(text, /CARDIO\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*50/i);
    const statusFromText = matchText(
      text,
      /TOTAL\s+SCORE\s*[0-9]+(?:\.[0-9]+)?\s*(Excellent|Satisfactory|Unsatisfactory)/i
    );
    const ageGroupFromText = matchText(text, /Age\s+Group\s*([0-9]{2}\s*[–—-]\s*[0-9]{2}|[0-9]{2}\+)/i);
    const sexFromText = matchText(text, /Sex\s+for\s+PFRA\s+Scoring\s*(Male|Female)/i);
    const heightFromText = matchText(text, /HEIGHT\s*([0-9]+(?:\.[0-9]+)?)\s*in/i);
    const waistFromText = matchText(text, /Waist\s*([0-9]+(?:\.[0-9]+)?)\s*in/i);
    const whtrFromText = firstDefined(
      matchText(text, /WtHR\s*([0-9]+(?:\.[0-9]+)?)/i),
      matchText(text, /Waist[-\s]*to[-\s]*Height(?:\s+Ratio)?\s*([0-9]+(?:\.[0-9]+)?)/i)
    );

    const ageGroup = firstDefined(
      findControlValue(["age", "group"], { selectOnly: true }),
      deepRead(globalState, ["age_group", "ageGroup", "scoring_age_group"]),
      ageGroupFromText
    );
    const sex = firstDefined(
      findControlValue(["sex"], { selectOnly: true }),
      deepRead(globalState, ["sex", "scoring_sex", "gender"]),
      sexFromText
    );
    const cardioEvent = firstDefined(
      findControlValue(["cardio", "event"], { selectOnly: true }),
      deepRead(globalState, ["cardio_event", "cardioEvent"])
    );
    const strengthEvent = firstDefined(
      findControlValue(["strength", "event"], { selectOnly: true }),
      deepRead(globalState, ["strength_event", "strengthEvent"])
    );
    const coreEvent = firstDefined(
      findControlValue(["endurance", "event"], { selectOnly: true }),
      findControlValue(["core", "event"], { selectOnly: true }),
      deepRead(globalState, ["core_event", "coreEvent", "endurance_event", "enduranceEvent"])
    );
    const height = firstDefined(
      findControlValue(["height"], { excludeSelect: true, numericOnly: true }),
      deepRead(globalState, ["height", "height_in", "heightInches"]),
      heightFromText
    );
    const waist = firstDefined(
      findControlValue(["waist"], { excludeSelect: true, numericOnly: true }),
      deepRead(globalState, ["waist", "waist_in", "waistInches"]),
      waistFromText
    );

    const snapshot = {
      calculator: "PCSUnited Air Force PT Calculator",
      standard_year: 2026,
      age_group: ageGroup,
      scoring_sex: sex,
      height_in: parseNumber(height),
      waist_in: parseNumber(waist),
      waist_to_height_ratio: parseNumber(
        firstDefined(
          whtrFromText,
          deepRead(globalState, ["whtr", "waist_to_height_ratio", "waistToHeightRatio"])
        )
      ),
      selected_events: {
        cardio: cardioEvent,
        strength: strengthEvent,
        core: coreEvent
      },
      scores: {
        body: parseNumber(
          firstDefined(
            bodyFromText,
            deepRead(globalState, ["body_score", "bodyScore", "body_composition_score"])
          )
        ),
        strength: parseNumber(
          firstDefined(strengthFromText, deepRead(globalState, ["strength_score", "strengthScore"]))
        ),
        core: parseNumber(
          firstDefined(
            coreFromText,
            deepRead(globalState, ["core_score", "coreScore", "endurance_score", "enduranceScore"])
          )
        ),
        cardio: parseNumber(
          firstDefined(cardioFromText, deepRead(globalState, ["cardio_score", "cardioScore"]))
        ),
        total: parseNumber(
          firstDefined(
            totalFromText,
            deepRead(globalState, ["total_score", "totalScore", "pt_total_score", "ptScore"])
          )
        )
      },
      classification: firstDefined(
        statusFromText,
        deepRead(globalState, ["classification", "status", "rating", "score_status"])
      ),
      source: "Current visible PT Calculator values",
      captured_at: new Date().toISOString()
    };

    if (isObject(globalState) && Object.keys(globalState).length) {
      snapshot.calculator_state = globalState;
    }

    return snapshot;
  }

  function ptSummary(snapshot) {
    const pt = isObject(snapshot) ? snapshot : {};
    const scores = isObject(pt.scores) ? pt.scores : {};
    const events = isObject(pt.selected_events) ? pt.selected_events : {};
    return [
      "Calculator: PCSUnited Air Force PT Calculator",
      "Standard year: " + clean(pt.standard_year || 2026),
      pt.scoring_sex ? "Scoring sex: " + clean(pt.scoring_sex) : "",
      pt.age_group ? "Age group: " + clean(pt.age_group) : "",
      pt.height_in !== null && pt.height_in !== undefined
        ? "Height: " + formatNumber(pt.height_in, 1) + " in"
        : "",
      pt.waist_in !== null && pt.waist_in !== undefined
        ? "Waist: " + formatNumber(pt.waist_in, 1) + " in"
        : "",
      pt.waist_to_height_ratio !== null && pt.waist_to_height_ratio !== undefined
        ? "Waist-to-height ratio: " + formatNumber(pt.waist_to_height_ratio, 2)
        : "",
      events.strength ? "Strength event: " + clean(events.strength) : "",
      events.core ? "Core event: " + clean(events.core) : "",
      events.cardio ? "Cardio event: " + clean(events.cardio) : "",
      scores.body !== null && scores.body !== undefined
        ? "Body score: " + formatNumber(scores.body, 1) + " / 20"
        : "",
      scores.strength !== null && scores.strength !== undefined
        ? "Strength score: " + formatNumber(scores.strength, 1) + " / 15"
        : "",
      scores.core !== null && scores.core !== undefined
        ? "Core score: " + formatNumber(scores.core, 1) + " / 15"
        : "",
      scores.cardio !== null && scores.cardio !== undefined
        ? "Cardio score: " + formatNumber(scores.cardio, 1) + " / 50"
        : "",
      scores.total !== null && scores.total !== undefined
        ? "Total estimated score: " + formatNumber(scores.total, 1)
        : "",
      pt.classification ? "Current classification: " + clean(pt.classification) : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  function updateSnapshotInterface(snapshot) {
    const scores = isObject(snapshot.scores) ? snapshot.scores : {};
    const total = parseNumber(scores.total);

    if (total !== null) {
      const totalText = formatNumber(total, 1);
      launcherScore.textContent = totalText;
      launcherScore.setAttribute("data-visible", "1");
      snapshotElements.total.textContent = totalText;
    } else {
      launcherScore.textContent = "--";
      launcherScore.setAttribute("data-visible", "0");
      snapshotElements.total.textContent = "--";
    }

    snapshotElements.status.textContent = clean(snapshot.classification || "Estimated Score");
    snapshotElements.body.textContent = formatNumber(scores.body, 1) + " / 20";
    snapshotElements.strength.textContent = formatNumber(scores.strength, 1) + " / 15";
    snapshotElements.core.textContent = formatNumber(scores.core, 1) + " / 15";
    snapshotElements.cardio.textContent = formatNumber(scores.cardio, 1) + " / 50";
    snapshotElements.whtr.textContent =
      snapshot.waist_to_height_ratio !== null && snapshot.waist_to_height_ratio !== undefined
        ? formatNumber(snapshot.waist_to_height_ratio, 2)
        : "--";
  }

  function refreshPtSnapshot() {
    const snapshot = collectPtSnapshot();
    state.currentSnapshot = snapshot;
    updateSnapshotInterface(snapshot);
    window.PCSU_PT_AMY_CONTEXT = cloneSafe(snapshot, {});
  }

  function scheduleSnapshotRefresh() {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(refreshPtSnapshot, 100);
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function scrollChatToBottom() {
    chatElement.scrollTop = chatElement.scrollHeight;
  }

  function rememberThread(role, content) {
    state.thread.push({ role: role, content: clean(content) });
    state.thread = state.thread.slice(-12);
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

  function typewriterInto(element, text, speed, startDelay) {
    return new Promise((resolve) => {
      element.textContent = "";
      const caret = document.createElement("span");
      caret.className = "pcsu-pt-aa-caret";
      element.appendChild(caret);
      let index = 0;
      function tick() {
        if (index < text.length) {
          caret.insertAdjacentText("beforebegin", text.charAt(index));
          index += 1;
          scrollChatToBottom();
          window.setTimeout(tick, speed);
          return;
        }
        caret.remove();
        resolve();
      }
      window.setTimeout(tick, startDelay);
    });
  }

  async function pushMessage(role, content, options) {
    const settings = isObject(options) ? options : {};
    const text = clean(content);
    if (!text) return;

    const message = document.createElement("div");
    message.className =
      "pcsu-pt-aa-message " + (role === "user" ? "pcsu-pt-aa-user" : "pcsu-pt-aa-bot");
    const textNode = document.createElement("span");
    message.appendChild(textNode);
    chatElement.appendChild(message);
    scrollChatToBottom();

    if (settings.remember !== false) {
      rememberThread(role === "user" ? "user" : "assistant", text);
    }

    if (settings.typewriter !== true || role === "user" || prefersReducedMotion()) {
      textNode.textContent = text;
      scrollChatToBottom();
      return;
    }

    await typewriterInto(
      textNode,
      text,
      Number(settings.speed || 16),
      Number(settings.delay || 70)
    );
    scrollChatToBottom();
  }

  function showTyping() {
    hideTyping();
    const typing = document.createElement("div");
    typing.id = "pcsu-pt-aa-typing";
    typing.className = "pcsu-pt-aa-message pcsu-pt-aa-bot pcsu-pt-aa-typing";
    typing.textContent = "Amy is reviewing your PT results…";
    chatElement.appendChild(typing);
    scrollChatToBottom();
  }

  function hideTyping() {
    const typing = document.getElementById("pcsu-pt-aa-typing");
    if (typing) typing.remove();
  }

  async function postToAmy(userMessage) {
    refreshPtSnapshot();
    const ptSnapshot = cloneSafe(state.currentSnapshot, {});
    const historicalThread = state.thread.slice(0, -1);

    const payload = {
      message: userMessage,
      profile: {
        fitness_scoring_sex: ptSnapshot.scoring_sex || null,
        fitness_age_group: ptSnapshot.age_group || null
      },
      pt_calculator: ptSnapshot,
      context: {
        conversation_id: state.conversationId,
        thread: historicalThread,
        memory: state.memory,
        requested_mode: "pt_calculator_guidance",
        page: "PCSUnited Air Force PT Calculator",
        widget: "pt-calculator-ask-amy-v1.0",
        product: "PCSUnited",
        version: "1.0.0",
        standard_year: 2026,
        pt_calculator: ptSnapshot,
        page_snapshot: ptSummary(ptSnapshot),
        response_limits: {
          max_chars: 1000,
          greeting_max_chars: 300,
          max_follow_up_questions: 1
        },
        style_guide: {
          tone: "clear, encouraging, practical, and familiar with Air Force fitness terminology",
          format:
            "Use short paragraphs. Explain the current score first. Use component scores when available. Avoid unnecessary disclaimers.",
          calculator_instruction:
            "Use the supplied PT Calculator values as the current source of truth. Never invent missing repetitions, times, scores, thresholds, or medical conclusions."
        },
        guardrails: [
          "Treat the displayed PCSUnited PT result as an estimate.",
          "Official assessment results and due dates are determined in myFitness.",
          "Do not provide medical diagnoses or unsafe exercise instructions.",
          "Clearly state when a requested value is not present in the calculator context."
        ]
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-PCSU-Client": "pt-calculator-ask-amy-v1.0"
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
      const errorMessage = clean(data.error || data.message || "HTTP " + response.status);
      throw new Error(errorMessage || "Ask Amy request failed.");
    }

    if (clean(data.conversation_id)) {
      state.conversationId = clean(data.conversation_id);
    }
    if (isObject(data.memory_patch)) {
      state.memory = mergeMemory(state.memory, data.memory_patch);
    }

    return data;
  }

  async function callAmy(userMessage) {
    if (state.sending) return;
    state.sending = true;
    sendButton.disabled = true;
    inputElement.disabled = true;
    showTyping();

    try {
      const data = await postToAmy(userMessage);
      hideTyping();
      const reply = clean(
        data.reply ||
          (isObject(data.answer) ? data.answer.summary : "") ||
          "I can help explain the PT score currently displayed on this calculator."
      );
      const ui = isObject(data.ui) ? data.ui : {};
      await pushMessage("assistant", reply, {
        typewriter: true,
        speed: Number(ui.speed || 16),
        delay: Number(ui.startDelay || 70),
        remember: true
      });
    } catch (error) {
      hideTyping();
      console.error("PCSUnited PT Ask Amy error:", error);
      await pushMessage(
        "assistant",
        "I hit a connection snag while reaching TheWing.ai. Your PT Calculator results are still available on this page, so please try the question again in a moment.",
        { typewriter: true, speed: 15, delay: 60, remember: false }
      );
    } finally {
      state.sending = false;
      sendButton.disabled = false;
      inputElement.disabled = false;
      inputElement.focus();
    }
  }

  async function trySend(messageOverride) {
    const message = clean(messageOverride || inputElement.value);
    if (!message || state.sending) return;
    inputElement.value = "";
    await pushMessage("user", message, { remember: true });
    await callAmy(message);
  }

  function openModal() {
    refreshPtSnapshot();
    state.previousHtmlOverflow = document.documentElement.style.overflow;
    state.previousBodyOverflow = document.body.style.overflow;
    modal.setAttribute("data-open", "1");
    modal.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.setTimeout(function () {
      inputElement.focus();
      scrollChatToBottom();
    }, 80);
  }

  function closeModal() {
    modal.setAttribute("data-open", "0");
    modal.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = state.previousHtmlOverflow;
    document.body.style.overflow = state.previousBodyOverflow;
    launcher.focus();
  }

  launcher.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.getAttribute("data-open") === "1") {
      closeModal();
    }
  });

  sendButton.addEventListener("click", function () {
    trySend();
  });

  inputElement.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      trySend();
    }
  });

  promptButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const question = clean(button.getAttribute("data-question"));
      if (question) trySend(question);
    });
  });

  document.addEventListener("input", scheduleSnapshotRefresh, true);
  document.addEventListener("change", scheduleSnapshotRefresh, true);

  [
    "pcsunited:pt-updated",
    "pcsunited:pt-score-updated",
    "pcsunited:pt-score-ready",
    "pcsunited:pt-calculator-updated",
    "pcsu:pt-updated",
    "pcsu:pt-score-ready",
    "pt-calculator:updated"
  ].forEach(function (eventName) {
    window.addEventListener(eventName, scheduleSnapshotRefresh);
    document.addEventListener(eventName, scheduleSnapshotRefresh);
  });

  window.setInterval(function () {
    if (document.visibilityState === "visible") refreshPtSnapshot();
  }, 2500);

  refreshPtSnapshot();

  const greeting =
    "Hey — I’m Amy. I can see the current estimated results from this PT Calculator and explain your total score, body composition, strength, core, and cardio breakdown. I can also help identify which component may offer the clearest opportunity to improve your score.";

  pushMessage("assistant", greeting, {
    typewriter: true,
    speed: 16,
    delay: 180,
    remember: true
  });
})();
