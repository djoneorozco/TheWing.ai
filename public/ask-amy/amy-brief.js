(() => {
  "use strict";

  /* ============================================================
     PCSUnited • Amy Brief Framework
     Phase 1 • Presentation layer only

     Amy Brief is NOT chat.
     Amy Brief is NOT BasicBrain.
     Amy Brief is NOT a calculator.

     It only renders a normalized brief object that already exists.
     ============================================================ */

  if (window.__PCSU_AMY_BRIEF_V100) return;
  window.__PCSU_AMY_BRIEF_V100 = true;

  const VERSION = "1.0.0-phase1";
  const STYLE_ID = "pcsu-amy-brief-styles-v100";
  const ROOT_ID = "pcsu-amy-brief-root";

  let mountedContainer = null;
  let rootEl = null;
  let currentData = null;

  function safeString(value) {
    return String(value ?? "").trim();
  }

  function isPlainObject(value) {
    return Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #pcsu-amy-brief-root,
      #pcsu-amy-brief-root * {
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

      #pcsu-amy-brief-root {
        --pcsu-brief-ink: #f4efe4;
        --pcsu-brief-muted: rgba(244, 239, 228, 0.62);
        --pcsu-brief-muted-strong: rgba(244, 239, 228, 0.76);
        --pcsu-brief-gold: #e7b553;
        --pcsu-brief-gold2: #f4d58a;
        --pcsu-brief-line: rgba(231, 181, 83, 0.34);
        --pcsu-brief-line-soft: rgba(255, 255, 255, 0.1);
        --pcsu-brief-panel: rgba(0, 0, 0, 0.22);
        display: block;
        width: 100%;
        padding: 14px 16px 4px;
      }

      #pcsu-amy-brief-root[data-empty="1"] {
        display: none;
      }

      .pcsu-amy-brief-card {
        border: 1px solid var(--pcsu-brief-line-soft);
        border-left: 2px solid var(--pcsu-brief-gold);
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04),
            rgba(0, 0, 0, 0.12)
          ),
          var(--pcsu-brief-panel);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        border-radius: 3px;
        overflow: hidden;
      }

      .pcsu-amy-brief-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 14px 10px;
        border-bottom: 1px solid var(--pcsu-brief-line-soft);
      }

      .pcsu-amy-brief-kicker {
        color: var(--pcsu-brief-gold2);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .pcsu-amy-brief-type {
        color: var(--pcsu-brief-muted);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .pcsu-amy-brief-section {
        padding: 12px 14px;
        border-bottom: 1px solid var(--pcsu-brief-line-soft);
      }

      .pcsu-amy-brief-section:last-child {
        border-bottom: 0;
      }

      .pcsu-amy-brief-label {
        margin: 0 0 6px;
        color: var(--pcsu-brief-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .pcsu-amy-brief-body {
        margin: 0;
        color: var(--pcsu-brief-ink);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .pcsu-amy-brief-body.is-placeholder {
        color: var(--pcsu-brief-muted-strong);
        font-weight: 700;
      }

      .pcsu-amy-brief-list {
        margin: 0;
        padding-left: 18px;
        color: var(--pcsu-brief-ink);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.45;
      }

      .pcsu-amy-brief-list li + li {
        margin-top: 4px;
      }

      .pcsu-amy-brief-disclaimer .pcsu-amy-brief-body {
        color: var(--pcsu-brief-muted);
        font-size: 11px;
        font-weight: 700;
      }
    `;

    document.head.appendChild(style);
  }

  function buildShell() {
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-empty", "0");
    root.setAttribute("data-version", VERSION);
    root.setAttribute("aria-label", "Amy Brief");

    root.innerHTML = `
      <div class="pcsu-amy-brief-card">
        <div class="pcsu-amy-brief-header">
          <div class="pcsu-amy-brief-kicker">Amy Brief Initialized</div>
          <div class="pcsu-amy-brief-type" data-pcsu-brief-type>phase1</div>
        </div>

        <section class="pcsu-amy-brief-section" data-pcsu-brief-section="greeting">
          <h3 class="pcsu-amy-brief-label">Greeting</h3>
          <p class="pcsu-amy-brief-body is-placeholder" data-pcsu-brief-greeting>
            Placeholder greeting
          </p>
        </section>

        <section class="pcsu-amy-brief-section" data-pcsu-brief-section="summary">
          <h3 class="pcsu-amy-brief-label">Summary</h3>
          <p class="pcsu-amy-brief-body is-placeholder" data-pcsu-brief-summary>
            Placeholder summary
          </p>
        </section>

        <section class="pcsu-amy-brief-section" data-pcsu-brief-section="actions">
          <h3 class="pcsu-amy-brief-label">Suggested Actions</h3>
          <ul class="pcsu-amy-brief-list is-placeholder" data-pcsu-brief-actions>
            <li>Placeholder action</li>
          </ul>
        </section>

        <section class="pcsu-amy-brief-section pcsu-amy-brief-disclaimer" data-pcsu-brief-section="disclaimer">
          <h3 class="pcsu-amy-brief-label">Disclaimer</h3>
          <p class="pcsu-amy-brief-body is-placeholder" data-pcsu-brief-disclaimer>
            Placeholder disclaimer
          </p>
        </section>
      </div>
    `;

    return root;
  }

  function paintPlaceholder() {
    if (!rootEl) return;

    const typeEl = rootEl.querySelector("[data-pcsu-brief-type]");
    const greetingEl = rootEl.querySelector("[data-pcsu-brief-greeting]");
    const summaryEl = rootEl.querySelector("[data-pcsu-brief-summary]");
    const actionsEl = rootEl.querySelector("[data-pcsu-brief-actions]");
    const disclaimerEl = rootEl.querySelector("[data-pcsu-brief-disclaimer]");

    if (typeEl) typeEl.textContent = "phase1";
    if (greetingEl) {
      greetingEl.textContent = "Placeholder greeting";
      greetingEl.classList.add("is-placeholder");
    }
    if (summaryEl) {
      summaryEl.textContent = "Placeholder summary";
      summaryEl.classList.add("is-placeholder");
    }
    if (actionsEl) {
      actionsEl.innerHTML = "<li>Placeholder action</li>";
      actionsEl.classList.add("is-placeholder");
    }
    if (disclaimerEl) {
      disclaimerEl.textContent = "Placeholder disclaimer";
      disclaimerEl.classList.add("is-placeholder");
    }

    rootEl.setAttribute("data-empty", "0");
  }

  function paintData(data) {
    if (!rootEl) return;

    const brief = isPlainObject(data) ? data : {};
    const greeting = isPlainObject(brief.greeting) ? brief.greeting : {};
    const summary = isPlainObject(brief.summary) ? brief.summary : {};
    const actions = Array.isArray(brief.actions) ? brief.actions : [];

    const typeEl = rootEl.querySelector("[data-pcsu-brief-type]");
    const greetingEl = rootEl.querySelector("[data-pcsu-brief-greeting]");
    const summaryEl = rootEl.querySelector("[data-pcsu-brief-summary]");
    const actionsEl = rootEl.querySelector("[data-pcsu-brief-actions]");
    const disclaimerEl = rootEl.querySelector("[data-pcsu-brief-disclaimer]");

    const typeText = safeString(brief.type) || "brief";
    const greetingText =
      safeString(greeting.title) ||
      safeString(greeting.subtitle) ||
      "Greeting unavailable";
    const summaryText =
      safeString(summary.text) ||
      safeString(summary.bluf) ||
      safeString(summary.message) ||
      (Object.keys(summary).length
        ? JSON.stringify(summary)
        : "Summary unavailable");
    const disclaimerText =
      safeString(brief.disclaimer) || "Disclaimer unavailable";

    if (typeEl) typeEl.textContent = typeText;

    if (greetingEl) {
      const subtitle = safeString(greeting.subtitle);
      greetingEl.textContent = subtitle && safeString(greeting.title)
        ? safeString(greeting.title) + "\n" + subtitle
        : greetingText;
      greetingEl.classList.toggle(
        "is-placeholder",
        !safeString(greeting.title) && !safeString(greeting.subtitle)
      );
    }

    if (summaryEl) {
      summaryEl.textContent = summaryText;
      summaryEl.classList.toggle(
        "is-placeholder",
        !(
          safeString(summary.text) ||
          safeString(summary.bluf) ||
          safeString(summary.message) ||
          Object.keys(summary).length
        )
      );
    }

    if (actionsEl) {
      actionsEl.innerHTML = "";
      const labels = actions
        .map((item) => {
          if (typeof item === "string") return safeString(item);
          if (isPlainObject(item)) {
            return (
              safeString(item.label) ||
              safeString(item.title) ||
              safeString(item.text)
            );
          }
          return "";
        })
        .filter(Boolean);

      if (!labels.length) {
        const li = document.createElement("li");
        li.textContent = "No suggested actions";
        actionsEl.appendChild(li);
        actionsEl.classList.add("is-placeholder");
      } else {
        labels.forEach((label) => {
          const li = document.createElement("li");
          li.textContent = label;
          actionsEl.appendChild(li);
        });
        actionsEl.classList.remove("is-placeholder");
      }
    }

    if (disclaimerEl) {
      disclaimerEl.textContent = disclaimerText;
      disclaimerEl.classList.toggle(
        "is-placeholder",
        !safeString(brief.disclaimer)
      );
    }

    rootEl.setAttribute("data-empty", "0");
  }

  function initialize(container) {
    const host =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    if (!host || !(host instanceof Element)) {
      console.warn(
        "PCSUnited Amy Brief: initialize() requires a valid container element."
      );
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
      paintPlaceholder();
      currentData = null;
      return rootEl;
    }

    rootEl = buildShell();
    host.appendChild(rootEl);
    mountedContainer = host;
    paintPlaceholder();
    currentData = null;

    return rootEl;
  }

  function render(data) {
    if (!rootEl) {
      console.warn(
        "PCSUnited Amy Brief: render() called before initialize()."
      );
      return null;
    }

    currentData = isPlainObject(data) ? data : null;

    if (!currentData) {
      paintPlaceholder();
      return rootEl;
    }

    paintData(currentData);
    return rootEl;
  }

  function update(data) {
    return render(data);
  }

  function clear() {
    currentData = null;

    if (!rootEl) return;

    paintPlaceholder();
    rootEl.setAttribute("data-empty", "1");
  }

  function destroy() {
    if (rootEl && rootEl.parentNode) {
      rootEl.parentNode.removeChild(rootEl);
    }

    rootEl = null;
    mountedContainer = null;
    currentData = null;
  }

  window.PCSUnitedAmyBrief = {
    version: VERSION,
    initialize,
    render,
    update,
    clear,
    destroy
  };
})();
