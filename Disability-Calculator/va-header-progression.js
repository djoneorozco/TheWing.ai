/* ============================================================
   THEWING.AI • VA Rating Header • v1.0.0
   Save as va-header-progression.js (JavaScript only).
   Required mount: #pcsu-va-header-progression-widget

   Reads disability.js results without recalculating VA ratings.
   Annual estimate = the current monthly amount multiplied by 12.
   Desktop: five cards. Phones: VA Rating only.
============================================================ */
(() => {
  "use strict";

  const VERSION = "1.0.0";
  const MOUNT_ID = "pcsu-va-header-progression-widget";
  const ROOT_ID = "pcsu-va-header-score-strip";
  const STYLE_ID = "pcsu-va-header-styles-v100";
  const CALCULATOR_ORIGIN = "https://thewing.netlify.app";
  const UPDATE_TYPE = "thewing:disability-updated";
  const UPDATE_SOURCE = "thewing-disability-calculator";

  function start() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount || document.getElementById(ROOT_ID)) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${MOUNT_ID} {
          width:100%;
          min-width:0;
        }

        #${ROOT_ID}, #${ROOT_ID} * {
          box-sizing:border-box;
          font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
        }

        #${ROOT_ID} {
          display:block;
          width:100%;
          min-width:0;
          margin:10px 0;
          color:#101728;
        }

        #${ROOT_ID} .vah-grid {
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:8px;
          width:min(760px,calc(100vw - 32px));
          max-width:100%;
          margin:0 auto;
        }

        #${ROOT_ID} .vah-card {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:3px;
          min-width:0;
          min-height:60px;
          padding:9px 8px;
          border:1px solid rgba(255,255,255,.18);
          border-radius:999px;

          background:linear-gradient(
            180deg,
            rgba(255,255,255,.90),
            rgba(238,241,248,.78)
          );

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            0 8px 18px rgba(0,0,0,.18);

          -webkit-backdrop-filter:blur(10px) saturate(135%);
          backdrop-filter:blur(10px) saturate(135%);
          text-align:center;
        }

        #${ROOT_ID} .vah-label {
          color:rgba(18,24,38,.65);
          font-size:8px;
          line-height:1.2;
          font-weight:800;
          letter-spacing:.07em;
          text-transform:uppercase;
        }

        #${ROOT_ID} .vah-value {
          color:#101728;
          font-size:16px;
          line-height:1.1;
          font-weight:900;
          letter-spacing:-.03em;
          font-variant-numeric:tabular-nums;
          white-space:nowrap;
        }

        #${ROOT_ID} .vah-money .vah-value {
          font-size:clamp(11px,1.15vw,14px);
        }

        #${ROOT_ID} .vah-support {
          max-width:100%;
          color:rgba(18,24,38,.64);
          font-size:8px;
          line-height:1.25;
          font-weight:600;
        }

        #${ROOT_ID} .vah-total {
          border-color:rgba(201,164,90,.42);
        }

        #${ROOT_ID} .vah-total .vah-value {
          color:#9b7939;
          font-size:22px;
        }

        #${ROOT_ID} .vah-total .vah-support {
          color:#84642c;
        }

        @media (max-width:767px),
          (max-width:991px) and (max-height:500px) and (pointer:coarse) {

          #${ROOT_ID} .vah-card:not(.vah-total) {
            display:none;
          }

          #${ROOT_ID} .vah-grid {
            grid-template-columns:minmax(0,1fr);
            width:100%;
            max-width:360px;
          }

          #${ROOT_ID} .vah-total {
            min-height:64px;
            border-radius:16px;
          }

          #${ROOT_ID} .vah-total .vah-label {
            font-size:10px;
          }

          #${ROOT_ID} .vah-total .vah-value {
            font-size:26px;
          }

          #${ROOT_ID} .vah-total .vah-support {
            font-size:10px;
          }
        }
      `;

      document.head.appendChild(style);
    }

    const cards = [
      ["highest", "Highest Rating", "Individual rating", ""],
      ["combined", "Combined Value", "Before rounding", ""],
      ["monthly", "Monthly", "Per month", "vah-money"],
      ["annual", "Annual", "Per year", "vah-money"],
      ["rating", "VA Rating", "Estimated rating", "vah-total"]
    ];

    mount.innerHTML = `
      <div
        id="${ROOT_ID}"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Waiting for VA calculator results"
        data-version="${VERSION}"
      >
        <div class="vah-grid">
          ${cards.map(([key, label, support, extra]) => `
            <div
              class="vah-card ${extra}"
              data-va-card="${key}"
            >
              <span class="vah-label">
                ${label}
              </span>

              <span
                class="vah-value"
                data-va-value="${key}"
              >—</span>

              <span class="vah-support">
                ${support}
              </span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    const root = document.getElementById(ROOT_ID);

    const values = Object.fromEntries(
      cards.map(([key]) => [
        key,
        root.querySelector(`[data-va-value="${key}"]`)
      ])
    );

    const currency = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    let latest = null;
    let lastKey = "";
    let activeFrame = null;

    function number(value) {
      if (
        value == null ||
        value === "" ||
        typeof value === "boolean"
      ) {
        return null;
      }

      const result = Number(value);

      return Number.isFinite(result)
        ? result
        : null;
    }

    function percent(value) {
      const result = number(value);

      return (
        result != null &&
        result >= 0 &&
        result <= 100
      )
        ? result
        : null;
    }

    function receive(raw) {
      if (!raw || typeof raw !== "object") {
        return false;
      }

      const state =
        raw.disability ||
        raw.detail ||
        raw;

      const rating = percent(state.officialRating);
      const combined = percent(state.combinedValue);
      const highest = percent(state.highestRating);

      if (rating == null || combined == null) {
        return false;
      }

      const compensation = state.compensation || {};
      const amount = number(compensation.monthlyVA);

      const monthly = (
        compensation.ok === true &&
        amount != null &&
        amount >= 0
      )
        ? amount
        : null;

      const annual = monthly == null
        ? null
        : Math.round(monthly * 100) * 12 / 100;

      const display = {
        highest,
        combined,
        rating,
        monthly,
        annual
      };

      const key = JSON.stringify(display);

      latest = JSON.parse(JSON.stringify(state));

      if (key === lastKey) {
        return true;
      }

      lastKey = key;

      values.highest.textContent =
        highest == null ? "—" : `${highest}%`;

      values.combined.textContent = `${combined}%`;
      values.rating.textContent = `${rating}%`;

      values.monthly.textContent =
        monthly == null
          ? "—"
          : currency.format(monthly);

      values.annual.textContent =
        annual == null
          ? "—"
          : currency.format(annual);

      root.setAttribute(
        "aria-label",
        monthly == null
          ? `Estimated VA rating ${rating} percent. Compensation unavailable.`
          : `Estimated VA rating ${rating} percent. Monthly compensation ${currency.format(monthly)}. Annual estimate ${currency.format(annual)}.`
      );

      return true;
    }

    function clear() {
      latest = null;
      lastKey = "";

      Object.values(values).forEach(element => {
        element.textContent = "—";
      });

      root.setAttribute(
        "aria-label",
        "Waiting for VA calculator results"
      );
    }

    function calculatorFrames() {
      return Array.from(
        document.querySelectorAll("iframe")
      ).flatMap(frame => {
        try {
          const url = new URL(
            frame.getAttribute("src") || "",
            location.href
          );

          if (!/^https?:$/.test(url.protocol)) {
            return [];
          }

          if (
            url.origin !== CALCULATOR_ORIGIN &&
            url.origin !== location.origin
          ) {
            return [];
          }

          return [{
            frame,
            origin: url.origin
          }];
        } catch (_) {
          return [];
        }
      });
    }

    function refresh() {
      let hydrated = false;

      try {
        const api = window.THEWING_DISABILITY;

        if (api && typeof api.getState === "function") {
          hydrated = receive(api.getState());
        }
      } catch (_) {}

      calculatorFrames().forEach(({frame, origin}) => {
        if (!frame.contentWindow) {
          return;
        }

        /*
          disability.js already accepts this request
          from the Ask Amy bridge.

          It returns existing state.
          It does not send a chat or recalculate.
        */

        frame.contentWindow.postMessage(
          {
            type: "thewing:disability-request-state",
            source: "ask-amy-disability"
          },
          origin
        );
      });

      return hydrated;
    }

    window.addEventListener(
      UPDATE_TYPE,
      event => receive(event.detail)
    );

    window.addEventListener("message", event => {
      const data = event.data;

      if (
        !data ||
        data.type !== UPDATE_TYPE ||
        data.source !== UPDATE_SOURCE
      ) {
        return;
      }

      const sender = calculatorFrames().find(
        ({frame, origin}) =>
          frame.contentWindow === event.source &&
          origin === event.origin
      );

      if (!sender) {
        return;
      }

      if (receive(data.disability)) {
        activeFrame = sender.frame;
      }
    });

    document.addEventListener(
      "load",
      event => {
        if (!(event.target instanceof HTMLIFrameElement)) {
          return;
        }

        if (event.target === activeFrame) {
          clear();
        }

        refresh();
      },
      true
    );

    window.addEventListener("pageshow", refresh);

    window.THEWING_VA_HEADER = Object.freeze({
      version: VERSION,
      refresh,
      clear,
      setScoreSnapshot: receive,

      getScoreSnapshot() {
        return latest
          ? JSON.parse(JSON.stringify(latest))
          : null;
      }
    });

    refresh();

    [100, 500, 1500].forEach(delay => {
      setTimeout(refresh, delay);
    });

    window.dispatchEvent(
      new CustomEvent("thewing:va-header-ready", {
        detail: {
          version: VERSION,
          root
        }
      })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {once: true}
    );
  } else {
    start();
  }
})();
