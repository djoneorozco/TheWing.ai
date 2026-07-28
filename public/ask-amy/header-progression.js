/* ============================================================
  PCSUnited • Header Progressive Compensation / Financial Strip
  Standalone Public JavaScript
  v4.0.1

  FILE
  public/ask-amy/header-progression.js

  REQUIRED WEBFLOW MOUNT
  #pcsu-header-progression-widget

  PURPOSE
  - Injects the complete header strip
  - Uses BasicBrain compensation-ready as source of truth
  - Does not automatically call TheWing from profile events
  - Supports compensation and financial modes
  - Prevents automatic page navigation and scrolling
=============================================================== */

(() => {
  "use strict";

  const VERSION = "4.0.1";
  const SOURCE = "pcsunited.header.comp.v4.0.1";

  const MOUNT_ID = "pcsu-header-progression-widget";
  const ROOT_ID = "pcsu-header-comp-basicbrain";
  const STYLE_ID = "pcsu-header-progression-styles-v401";
  const FONT_ID = "pcsu-header-progression-font";

  const API_BASE = "https://thewing.netlify.app/api";
  const BRAIN_ENDPOINT = API_BASE + "/opensource-brain";

  function startHeaderProgression() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn(
        `PCSUnited Header Progression mount #${MOUNT_ID} was not found.`
      );
      return;
    }

    if (
      mount.dataset.mounted === "true" ||
      document.getElementById(ROOT_ID)
    ) {
      return;
    }

    mount.dataset.mounted = "true";

    /* ============================================================
      1. FONT
    ============================================================ */

    if (!document.getElementById(FONT_ID)) {
      const preconnectGoogle = document.createElement("link");
      preconnectGoogle.rel = "preconnect";
      preconnectGoogle.href = "https://fonts.googleapis.com";

      const preconnectStatic = document.createElement("link");
      preconnectStatic.rel = "preconnect";
      preconnectStatic.href = "https://fonts.gstatic.com";
      preconnectStatic.crossOrigin = "anonymous";

      const fontLink = document.createElement("link");
      fontLink.id = FONT_ID;
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";

      document.head.appendChild(preconnectGoogle);
      document.head.appendChild(preconnectStatic);
      document.head.appendChild(fontLink);
    }

    /* ============================================================
      2. STYLES
    ============================================================ */

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;

      style.textContent = `
        #${ROOT_ID},
        #${ROOT_ID} * {
          box-sizing: border-box;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        #${ROOT_ID} {
          display: block;
          width: 100%;
          color: #f5f5f5;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-header-comp-wrap {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-header-comp-inner {
          width: 100%;
        }

        #${ROOT_ID} .pcsu-header-comp-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(84px, 1fr));
          gap: 8px;
          width: min(560px, 100%);
          margin: 0 auto;
          background: transparent !important;
        }

        #${ROOT_ID} .pcsu-header-comp-tile {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 7px 12px 8px;
          min-height: 34px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.88),
              rgba(238, 241, 248, 0.76)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 18px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px) saturate(135%);
          -webkit-backdrop-filter: blur(10px) saturate(135%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;

          transition:
            opacity 0.18s ease,
            transform 0.18s ease,
            filter 0.18s ease;
        }

        #${ROOT_ID} .pcsu-header-comp-tile::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(199, 156, 79, 0.32),
              rgba(106, 167, 255, 0.16),
              transparent
            );
          pointer-events: none;
        }

        #${ROOT_ID} .pcsu-header-comp-label {
          display: block;
          margin-bottom: 2px;
          color: rgba(18, 24, 38, 0.58);
          font-size: 7.5px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-header-comp-value {
          display: block;
          color: #101728;
          font-size: 12.5px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.03em;
          white-space: nowrap;
        }

        #${ROOT_ID} .pcsu-header-comp-value.is-total,
        #${ROOT_ID} .pcsu-header-comp-value.is-gold {
          color: #9b7939;
          font-weight: 900;
        }

        #${ROOT_ID} .pcsu-header-comp-value.is-green {
          color: #16795a;
          font-weight: 900;
        }

        #${ROOT_ID} .pcsu-header-comp-value.is-danger {
          color: #a23c5a;
          font-weight: 900;
        }

        #${ROOT_ID}
          .pcsu-header-comp-tile.is-loading
          .pcsu-header-comp-value {
          opacity: 0.60;
        }

        #${ROOT_ID} .pcsu-header-comp-tile.is-missing {
          opacity: 0.58;
        }

        #${ROOT_ID} .pcsu-header-comp-tile.is-hidden {
          display: none;
        }

        #${ROOT_ID}.is-comp-mode .pcsu-header-comp-grid {
          grid-template-columns: repeat(4, minmax(92px, 1fr));
          width: min(430px, 100%);
        }

        #${ROOT_ID}.is-financial-mode .pcsu-header-comp-grid {
          grid-template-columns: repeat(5, minmax(84px, 1fr));
          width: min(560px, 100%);
        }

        @media (max-width: 900px) {
          #${ROOT_ID}.is-financial-mode .pcsu-header-comp-grid {
            width: min(520px, 100%);
            gap: 6px;
          }

          #${ROOT_ID} .pcsu-header-comp-label {
            font-size: 7px;
          }

          #${ROOT_ID} .pcsu-header-comp-value {
            font-size: 12px;
          }
        }

        @media (max-width: 760px) {
          #${ROOT_ID} .pcsu-header-comp-grid,
          #${ROOT_ID}.is-comp-mode .pcsu-header-comp-grid,
          #${ROOT_ID}.is-financial-mode .pcsu-header-comp-grid {
            grid-template-columns: repeat(2, minmax(110px, 1fr));
            width: 100%;
          }

          #${ROOT_ID} .pcsu-header-comp-tile {
            border-radius: 12px;
            min-height: 44px;
          }

          #${ROOT_ID} .pcsu-header-comp-label {
            font-size: 9px;
          }

          #${ROOT_ID} .pcsu-header-comp-value {
            font-size: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #${ROOT_ID},
          #${ROOT_ID} * {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /* ============================================================
      3. MARKUP
    ============================================================ */

    mount.innerHTML = `
      <div
        id="${ROOT_ID}"
        class="is-comp-mode"
        data-version="${VERSION}"
        style="all: initial;"
      >
        <div class="pcsu-header-comp-wrap">
          <div class="pcsu-header-comp-inner">
            <div class="pcsu-header-comp-grid">

              <div
                class="pcsu-header-comp-tile is-missing"
                id="bb-header-tile-1"
              >
                <span
                  class="pcsu-header-comp-label"
                  id="bb-header-label-1"
                >
                  Base Pay
                </span>

                <span
                  class="pcsu-header-comp-value"
                  id="bb-header-pay1"
                >
                  $0
                </span>
              </div>

              <div
                class="pcsu-header-comp-tile is-missing"
                id="bb-header-tile-2"
              >
                <span
                  class="pcsu-header-comp-label"
                  id="bb-header-label-2"
                >
                  BAS
                </span>

                <span
                  class="pcsu-header-comp-value"
                  id="bb-header-pay2"
                >
                  $0
                </span>
              </div>

              <div
                class="pcsu-header-comp-tile is-missing"
                id="bb-header-tile-3"
              >
                <span
                  class="pcsu-header-comp-label"
                  id="bb-header-label-3"
                >
                  BAH
                </span>

                <span
                  class="pcsu-header-comp-value"
                  id="bb-header-pay3"
                >
                  $0
                </span>
              </div>

              <div
                class="pcsu-header-comp-tile is-missing"
                id="bb-header-tile-4"
              >
                <span
                  class="pcsu-header-comp-label"
                  id="bb-header-label-4"
                >
                  Total
                </span>

                <span
                  class="pcsu-header-comp-value is-total"
                  id="bb-header-total"
                >
                  $0
                </span>
              </div>

              <div
                class="pcsu-header-comp-tile is-missing is-hidden"
                id="bb-header-tile-5"
              >
                <span
                  class="pcsu-header-comp-label"
                  id="bb-header-label-5"
                >
                  Max Pay
                </span>

                <span
                  class="pcsu-header-comp-value is-total"
                  id="bb-header-pay5"
                >
                  $0
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById(ROOT_ID);

    if (!root) return;

    /* ============================================================
      4. ELEMENT REFERENCES
    ============================================================ */

    const els = {
      tile1: root.querySelector("#bb-header-tile-1"),
      tile2: root.querySelector("#bb-header-tile-2"),
      tile3: root.querySelector("#bb-header-tile-3"),
      tile4: root.querySelector("#bb-header-tile-4"),
      tile5: root.querySelector("#bb-header-tile-5"),

      label1: root.querySelector("#bb-header-label-1"),
      label2: root.querySelector("#bb-header-label-2"),
      label3: root.querySelector("#bb-header-label-3"),
      label4: root.querySelector("#bb-header-label-4"),
      label5: root.querySelector("#bb-header-label-5"),

      pay1: root.querySelector("#bb-header-pay1"),
      pay2: root.querySelector("#bb-header-pay2"),
      pay3: root.querySelector("#bb-header-pay3"),
      total: root.querySelector("#bb-header-total"),
      pay5: root.querySelector("#bb-header-pay5")
    };

    const tiles = [
      els.tile1,
      els.tile2,
      els.tile3,
      els.tile4,
      els.tile5
    ].filter(Boolean);

    let currentStripMode = "compensation";

    let latestProfile = null;
    let latestGoodVeteranValues = null;
    let latestGoodActiveValues = null;
    let latestGoodFinancialValues = null;

    let requestSeq = 0;

    /* ============================================================
      5. UTILITIES
    ============================================================ */

    function num(value, fallback = 0) {
      const n = Number(
        String(value ?? "")
          .replace(/[$,%]/g, "")
          .replace(/,/g, "")
      );

      return Number.isFinite(n) ? n : fallback;
    }

    function money(value) {
      return "$" + Number(num(value, 0)).toLocaleString("en-US", {
        maximumFractionDigits: 0
      });
    }

    function pct(value) {
      return Math.round(num(value, 0)) + "%";
    }

    function clean(value) {
      return value === undefined || value === null
        ? ""
        : String(value).trim();
    }

    function normalizeRank(value) {
      const raw = clean(value)
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace("–", "-")
        .replace("—", "-");

      if (!raw) return "";

      if (/^[EOW]-\d{1,2}$/.test(raw)) {
        return raw;
      }

      if (/^[EOW]\d{1,2}$/.test(raw)) {
        return raw.charAt(0) + "-" + raw.slice(1);
      }

      return raw;
    }

    function normalizeMode(value) {
      const raw = clean(value).toLowerCase();

      if (
        raw === "veteran" ||
        raw === "vet" ||
        raw === "retired" ||
        raw === "retiree"
      ) {
        return "veteran";
      }

      return "active_duty";
    }

    function isVeteran(profile) {
      return (
        normalizeMode(
          profile &&
            (
              profile.mode ||
              profile.type ||
              profile.status
            )
        ) === "veteran"
      );
    }

    function setLoading(isLoading) {
      tiles.forEach((tile) => {
        tile.classList.toggle("is-loading", Boolean(isLoading));
      });
    }

    function setMissing(isMissing) {
      tiles.forEach((tile) => {
        tile.classList.toggle("is-missing", Boolean(isMissing));
      });
    }

    function setValueTone(element, tone) {
      if (!element) return;

      element.classList.remove(
        "is-total",
        "is-gold",
        "is-green",
        "is-danger"
      );

      if (tone) {
        element.classList.add(tone);
      }
    }

    function preserveScroll(callback) {
      const startX =
        window.scrollX ||
        window.pageXOffset ||
        0;

      const startY =
        window.scrollY ||
        window.pageYOffset ||
        0;

      try {
        callback();
      } catch (_) {
        // Passive event failures must not affect the page.
      }

      requestAnimationFrame(() => {
        window.scrollTo(startX, startY);
      });

      setTimeout(() => {
        window.scrollTo(startX, startY);
      }, 0);

      setTimeout(() => {
        window.scrollTo(startX, startY);
      }, 60);

      setTimeout(() => {
        window.scrollTo(startX, startY);
      }, 160);

      setTimeout(() => {
        window.scrollTo(startX, startY);
      }, 320);
    }

    function dispatchPreviewReady(profile, compensation) {
      preserveScroll(() => {
        window.dispatchEvent(
          new CustomEvent("pcsunited:compensation-preview-ready", {
            detail: {
              source: SOURCE,
              version: VERSION,
              profile,
              compensation,
              autoNavigate: false,
              updated_at: new Date().toISOString()
            }
          })
        );
      });
    }

    /* ============================================================
      6. DISPLAY MODES
    ============================================================ */

    function activateCompMode() {
      currentStripMode = "compensation";

      root.classList.add("is-comp-mode");
      root.classList.remove("is-financial-mode");

      if (els.tile5) {
        els.tile5.classList.add("is-hidden");
      }

      setValueTone(els.pay1, "");
      setValueTone(els.pay2, "");
      setValueTone(els.pay3, "");
      setValueTone(els.total, "is-total");
      setValueTone(els.pay5, "is-total");
    }

    function activateFinancialMode() {
      currentStripMode = "financial";

      root.classList.remove("is-comp-mode");
      root.classList.add("is-financial-mode");

      if (els.tile5) {
        els.tile5.classList.remove("is-hidden");
      }
    }

    function setCompLabels(profile) {
      if (isVeteran(profile)) {
        els.label1.textContent = "Retirement";
        els.label2.textContent = "Disability";
        els.label3.textContent = "Other Pay";
        els.label4.textContent = "Total";
        return;
      }

      els.label1.textContent = "Base Pay";
      els.label2.textContent = "BAS";
      els.label3.textContent = "BAH";
      els.label4.textContent = "Total";
    }

    function paintCompValues(profile, values, missing) {
      activateCompMode();
      setCompLabels(profile || { mode: "active_duty" });

      els.pay1.textContent = money(values.pay1);
      els.pay2.textContent = money(values.pay2);
      els.pay3.textContent = money(values.pay3);
      els.total.textContent = money(values.total);

      setLoading(false);
      setMissing(Boolean(missing));
    }

    function paintZero(profile) {
      const veteran = isVeteran(profile);

      if (
        veteran &&
        latestGoodVeteranValues &&
        hasAnyCompValues(latestGoodVeteranValues)
      ) {
        paintCompValues(
          profile,
          latestGoodVeteranValues,
          false
        );
        return;
      }

      if (
        !veteran &&
        latestGoodActiveValues &&
        hasAnyCompValues(latestGoodActiveValues)
      ) {
        paintCompValues(
          profile,
          latestGoodActiveValues,
          false
        );
        return;
      }

      paintCompValues(
        profile || { mode: "active_duty" },
        {
          pay1: 0,
          pay2: 0,
          pay3: 0,
          total: 0
        },
        true
      );
    }

    function paintFinancialValues(values) {
      activateFinancialMode();

      els.label1.textContent = "Income";
      els.label2.textContent = "Payment";
      els.label3.textContent = "Debt";
      els.label4.textContent = "Ratio";
      els.label5.textContent = "Max Pay";

      els.pay1.textContent = money(values.income);
      els.pay2.textContent = money(values.payment);
      els.pay3.textContent = money(values.debt);
      els.total.textContent = pct(values.ratio);
      els.pay5.textContent = money(values.maxPayment);

      setValueTone(els.pay1, "is-green");
      setValueTone(els.pay2, "is-gold");
      setValueTone(els.pay3, "is-danger");

      if (num(values.ratio, 0) <= 25) {
        setValueTone(els.total, "is-green");
      } else if (num(values.ratio, 0) <= 30) {
        setValueTone(els.total, "is-gold");
      } else {
        setValueTone(els.total, "is-danger");
      }

      setValueTone(els.pay5, "is-total");

      setLoading(false);
      setMissing(false);
    }

    /* ============================================================
      7. COMPENSATION EXTRACTION
    ============================================================ */

    function deepFindNumber(object, names) {
      const wanted = names.map((name) =>
        String(name).toLowerCase()
      );

      const seen = new WeakSet();

      function walk(node) {
        if (!node || typeof node !== "object") {
          return 0;
        }

        if (seen.has(node)) {
          return 0;
        }

        seen.add(node);

        const keys = Object.keys(node);

        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i];
          const normalizedKey = key.toLowerCase();

          if (wanted.includes(normalizedKey)) {
            const value = num(node[key], 0);

            if (value) {
              return value;
            }
          }
        }

        for (let i = 0; i < keys.length; i += 1) {
          const found = walk(node[keys[i]]);

          if (found) {
            return found;
          }
        }

        return 0;
      }

      return walk(object);
    }

    function safeComp(profile, compensation) {
      const c =
        compensation &&
        typeof compensation === "object"
          ? compensation
          : {};

      if (isVeteran(profile)) {
        const retirement =
          num(
            c.retirementPay ??
            c.retirement_pay ??
            c.retiredPay ??
            c.retired_pay ??
            c.retiredPayGross ??
            c.grossMonthlyRetiredPay ??
            c.monthlyRetirement ??
            c.retirement ??
            c.retirementMonthly ??
            c.retirement_monthly ??
            c.militaryRetirement ??
            c.military_retirement,
            0
          ) ||
          deepFindNumber(c, [
            "retirementPay",
            "retirement_pay",
            "retiredPay",
            "retired_pay",
            "retiredPayGross",
            "grossMonthlyRetiredPay",
            "monthlyRetirement",
            "retirement",
            "retirementMonthly",
            "retirement_monthly",
            "militaryRetirement",
            "military_retirement",
            "retirement_pay_monthly",
            "monthly_retirement"
          ]);

        const disability =
          num(
            c.disabilityPay ??
            c.disability_pay ??
            c.vaDisabilityPay ??
            c.va_disability_pay ??
            c.vaCompensation ??
            c.va_compensation ??
            c.monthlyVA ??
            c.vaMonthly ??
            c.disability ??
            c.disabilityMonthly ??
            c.disability_monthly ??
            c.va_monthly,
            0
          ) ||
          deepFindNumber(c, [
            "disabilityPay",
            "disability_pay",
            "vaDisabilityPay",
            "va_disability_pay",
            "vaCompensation",
            "va_compensation",
            "monthlyVA",
            "vaMonthly",
            "disability",
            "disabilityMonthly",
            "disability_monthly",
            "va_monthly",
            "va_disability_monthly",
            "monthly_va",
            "monthly_disability"
          ]);

        const other =
          num(
            c.otherPay ??
            c.other_pay ??
            c.other ??
            c.otherMonthly ??
            c.other_monthly,
            0
          ) ||
          deepFindNumber(c, [
            "otherPay",
            "other_pay",
            "other",
            "otherMonthly",
            "other_monthly"
          ]);

        const total =
          num(
            c.total ??
            c.totalMonthly ??
            c.total_monthly ??
            c.totalMonthlyCompensation ??
            c.total_monthly_compensation ??
            c.grossMonthlyComp ??
            c.combinedMonthlyGross,
            0
          ) ||
          deepFindNumber(c, [
            "total",
            "totalMonthly",
            "total_monthly",
            "totalMonthlyCompensation",
            "total_monthly_compensation",
            "grossMonthlyComp",
            "combinedMonthlyGross",
            "monthly_total",
            "total_compensation"
          ]) ||
          retirement + disability + other;

        let safe = {
          pay1: retirement,
          pay2: disability,
          pay3: other,
          total
        };

        if (latestGoodVeteranValues) {
          const incomingHasSplit =
            num(safe.pay1, 0) ||
            num(safe.pay2, 0) ||
            num(safe.pay3, 0);

          const incomingOnlyTotal =
            num(safe.total, 0) &&
            !incomingHasSplit;

          if (incomingOnlyTotal) {
            safe = {
              pay1: latestGoodVeteranValues.pay1,
              pay2: latestGoodVeteranValues.pay2,
              pay3: latestGoodVeteranValues.pay3,
              total:
                safe.total ||
                latestGoodVeteranValues.total
            };
          } else {
            safe = {
              pay1:
                safe.pay1 ||
                latestGoodVeteranValues.pay1 ||
                0,

              pay2:
                safe.pay2 ||
                latestGoodVeteranValues.pay2 ||
                0,

              pay3:
                safe.pay3 ||
                latestGoodVeteranValues.pay3 ||
                0,

              total:
                safe.total ||
                latestGoodVeteranValues.total ||
                0
            };
          }
        }

        return safe;
      }

      const basePay =
        num(
          c.basePay ??
          c.base_pay ??
          c.basicPay ??
          c.basic_pay,
          0
        ) ||
        deepFindNumber(c, [
          "basePay",
          "base_pay",
          "basicPay",
          "basic_pay"
        ]);

      const bas =
        num(
          c.bas ??
          c.BAS,
          0
        ) ||
        deepFindNumber(c, [
          "bas",
          "BAS",
          "basMonthly",
          "bas_monthly"
        ]);

      const bah =
        num(
          c.bah ??
          c.BAH,
          0
        ) ||
        deepFindNumber(c, [
          "bah",
          "BAH",
          "bahMonthly",
          "bah_monthly"
        ]);

      const total =
        num(
          c.total ??
          c.totalMonthly ??
          c.total_monthly ??
          c.grossMonthlyComp ??
          c.combinedMonthlyGross ??
          c.totalMonthlyCompensation,
          0
        ) ||
        deepFindNumber(c, [
          "total",
          "totalMonthly",
          "total_monthly",
          "grossMonthlyComp",
          "combinedMonthlyGross",
          "totalMonthlyCompensation"
        ]) ||
        basePay + bas + bah;

      let safe = {
        pay1: basePay,
        pay2: bas,
        pay3: bah,
        total
      };

      if (latestGoodActiveValues) {
        const incomingHasSplit =
          num(safe.pay1, 0) ||
          num(safe.pay2, 0) ||
          num(safe.pay3, 0);

        const incomingOnlyTotal =
          num(safe.total, 0) &&
          !incomingHasSplit;

        if (incomingOnlyTotal) {
          safe = {
            pay1: latestGoodActiveValues.pay1,
            pay2: latestGoodActiveValues.pay2,
            pay3: latestGoodActiveValues.pay3,
            total:
              safe.total ||
              latestGoodActiveValues.total
          };
        } else {
          safe = {
            pay1:
              safe.pay1 ||
              latestGoodActiveValues.pay1 ||
              0,

            pay2:
              safe.pay2 ||
              latestGoodActiveValues.pay2 ||
              0,

            pay3:
              safe.pay3 ||
              latestGoodActiveValues.pay3 ||
              0,

            total:
              safe.total ||
              latestGoodActiveValues.total ||
              0
          };
        }
      }

      return safe;
    }

    function hasAnyCompValues(values) {
      return Boolean(
        values &&
        (
          num(values.pay1, 0) ||
          num(values.pay2, 0) ||
          num(values.pay3, 0) ||
          num(values.total, 0)
        )
      );
    }

    function hasSplitValues(values) {
      return Boolean(
        values &&
        (
          num(values.pay1, 0) ||
          num(values.pay2, 0) ||
          num(values.pay3, 0)
        )
      );
    }

    function rememberGoodCompValues(profile, values) {
      if (!values || !hasAnyCompValues(values)) {
        return;
      }

      if (isVeteran(profile)) {
        if (hasSplitValues(values)) {
          latestGoodVeteranValues = {
            pay1: num(values.pay1, 0),
            pay2: num(values.pay2, 0),
            pay3: num(values.pay3, 0),
            total: num(values.total, 0)
          };
        }

        return;
      }

      if (hasSplitValues(values)) {
        latestGoodActiveValues = {
          pay1: num(values.pay1, 0),
          pay2: num(values.pay2, 0),
          pay3: num(values.pay3, 0),
          total: num(values.total, 0)
        };
      }
    }

    /* ============================================================
      8. PROFILE EXTRACTION
    ============================================================ */

    function extractProfile(detail) {
      const d =
        detail &&
        typeof detail === "object"
          ? detail
          : {};

      const profile =
        d.profile ||
        d.bridge ||
        d.input ||
        d.basicbrain ||
        d.payload ||
        d;

      if (!profile || typeof profile !== "object") {
        return null;
      }

      const mode = normalizeMode(
        profile.mode ||
        profile.type ||
        profile.status
      );

      const rank = normalizeRank(
        profile.rank_paygrade ||
        profile.rankPaygrade ||
        profile.rank ||
        profile.paygrade ||
        ""
      );

      const yos = num(
        profile.yos ??
        profile.years_of_service ??
        profile.yearsOfService,
        0
      );

      const depRaw =
        profile.dependents_count ??
        profile.dependentsCount ??
        profile.dependents ??
        "";

      let dependentsCount = 0;

      if (clean(depRaw).toLowerCase() === "yes") {
        dependentsCount = 1;
      } else if (clean(depRaw).toLowerCase() === "no") {
        dependentsCount = 0;
      } else {
        dependentsCount = num(depRaw, 0);
      }

      const hasDependents =
        profile.has_dependents === true ||
        profile.hasDependents === true ||
        profile.family === true ||
        dependentsCount > 0 ||
        clean(profile.dependents).toLowerCase() === "yes";

      const family =
        num(
          profile.family_size ??
          profile.familySize ??
          profile.family,
          0
        ) ||
        (
          hasDependents
            ? Math.max(dependentsCount + 1, 2)
            : 1
        );

      const base = clean(
        profile.base ||
        profile.current_base ||
        profile.currentBase ||
        profile.selected_base ||
        profile.selectedBase ||
        profile.pcs_base ||
        profile.pcsBase ||
        profile.market ||
        profile.target_market ||
        ""
      );

      const vaRatingRaw =
        profile.vaRating ??
        profile.va_rating ??
        profile.va_disability ??
        profile.vaDisability ??
        profile.disability_rating ??
        profile.disabilityRating;

      const va =
        vaRatingRaw === null ||
        vaRatingRaw === undefined ||
        vaRatingRaw === ""
          ? null
          : num(vaRatingRaw, 0);

      const spouse =
        profile.spouse === true ||
        profile.married === true ||
        clean(profile.spouse).toLowerCase() === "true" ||
        clean(profile.spouse).toLowerCase() === "yes" ||
        clean(profile.married).toLowerCase() === "true" ||
        clean(profile.married).toLowerCase() === "yes";

      const childrenUnder18 = num(
        profile.childrenUnder18 ??
        profile.children_under_18,
        0
      );

      const childrenInSchoolOver18 = num(
        profile.childrenInSchoolOver18 ??
        profile.children_in_school_over_18 ??
        profile.childrenOver18School ??
        profile.children_over_18_school,
        0
      );

      const dependentParents = num(
        profile.dependentParents ??
        profile.dependent_parents,
        0
      );

      const retirementSystem =
        clean(
          profile.retirementSystem ||
          profile.retirement_system ||
          profile.system ||
          "HIGH3"
        ) || "HIGH3";

      return {
        source: SOURCE,

        mode,
        type: mode,
        status: mode,

        rank,
        rank_paygrade: rank,
        rankPaygrade: rank,

        yos,
        years_of_service: yos,
        yearsOfService: yos,

        dependents: hasDependents ? "yes" : "no",
        dependents_count: dependentsCount,
        dependentsCount,
        has_dependents: hasDependents,
        hasDependents,

        family,
        family_size: family,
        familySize: family,

        base,
        selected_base: base,
        selectedBase: base,
        pcs_base: base,
        pcsBase: base,

        vaRating: va,
        va_disability: va,
        vaDisability: va,
        disability_rating: va,
        disabilityRating: va,

        spouse,
        married: spouse,

        childrenUnder18,
        children_under_18: childrenUnder18,

        childrenInSchoolOver18,
        children_in_school_over_18:
          childrenInSchoolOver18,

        dependentParents,
        dependent_parents: dependentParents,

        retirementSystem,
        retirement_system: retirementSystem,

        retired:
          profile.retired === false
            ? false
            : mode === "veteran"
              ? true
              : Boolean(profile.retired),

        email: clean(profile.email || "")
      };
    }

    function extractComp(detail) {
      const d =
        detail &&
        typeof detail === "object"
          ? detail
          : {};

      if (
        d.compensation &&
        typeof d.compensation === "object"
      ) {
        if (
          d.compensation.raw &&
          typeof d.compensation.raw === "object"
        ) {
          return {
            ...d.compensation.raw,
            ...d.compensation
          };
        }

        return d.compensation;
      }

      if (d.comp && typeof d.comp === "object") {
        return d.comp;
      }

      if (d.pay && typeof d.pay === "object") {
        return d.pay;
      }

      const payload =
        d.payload ||
        d.data ||
        d.result ||
        {};

      const payloadComp =
        payload.compensation ||
        payload.comp ||
        payload.pay ||
        {};

      if (payloadComp.monthly) {
        return {
          ...payloadComp,
          ...payloadComp.monthly
        };
      }

      if (Object.keys(payloadComp).length) {
        return payloadComp;
      }

      const truth =
        d.truth_packet ||
        d.truthPacket ||
        payload.truth_packet ||
        payload.truthPacket ||
        {};

      const compRoot = truth.compensation || {};

      if (compRoot.monthly) {
        return compRoot.monthly;
      }

      if (Object.keys(compRoot).length) {
        return compRoot;
      }

      return d;
    }

    function extractCompFromTheWing(data) {
      const payload =
        data &&
        (
          data.payload ||
          data.data ||
          data.result ||
          data
        ) ||
        {};

      const truth =
        payload.truth_packet ||
        payload.truthPacket ||
        data.truth_packet ||
        data.truthPacket ||
        {};

      const compRoot =
        payload.compensation ||
        payload.comp ||
        payload.pay ||
        truth.compensation ||
        {};

      const monthly =
        compRoot.monthly ||
        payload.monthly ||
        compRoot;

      return {
        ...data,
        ...payload,
        ...truth,
        ...compRoot,
        ...monthly
      };
    }

    /* ============================================================
      9. OPTIONAL MANUAL THEWING REFRESH
    ============================================================ */

    function isProfileComplete(profile) {
      if (
        !profile ||
        !profile.rank ||
        !profile.yos
      ) {
        return false;
      }

      if (isVeteran(profile)) {
        return profile.va_disability !== null;
      }

      return Boolean(profile.base);
    }

    function buildActiveDutyInput(profile) {
      return {
        ...profile,

        mode: "active_duty",

        rank: profile.rank,
        rank_paygrade: profile.rank,
        rankPaygrade: profile.rank,

        yos: profile.yos,
        years_of_service: profile.yos,
        yearsOfService: profile.yos,

        base: profile.base,
        selected_base: profile.base,
        selectedBase: profile.base,
        pcs_base: profile.base,
        pcsBase: profile.base,

        dependents:
          profile.has_dependents
            ? "yes"
            : "no",

        dependents_count:
          profile.dependents_count,

        dependentsCount:
          profile.dependents_count,

        has_dependents:
          profile.has_dependents,

        hasDependents:
          profile.has_dependents,

        family: profile.family,
        family_size: profile.family,
        familySize: profile.family,

        source: SOURCE
      };
    }

    function buildVeteranInput(profile) {
      return {
        rank: profile.rank,
        rank_paygrade: profile.rank,
        rankPaygrade: profile.rank,

        yos: profile.yos,
        yearsOfService: profile.yos,
        years_of_service: profile.yos,

        retirementSystem:
          profile.retirementSystem ||
          "HIGH3",

        retirement_system:
          profile.retirementSystem ||
          "HIGH3",

        vaRating: profile.va_disability,
        va_disability: profile.va_disability,
        vaDisability: profile.va_disability,
        rating: profile.va_disability,

        spouse: profile.spouse === true,

        childrenUnder18:
          profile.childrenUnder18 || 0,

        children_under_18:
          profile.childrenUnder18 || 0,

        childrenInSchoolOver18:
          profile.childrenInSchoolOver18 || 0,

        children_in_school_over_18:
          profile.childrenInSchoolOver18 || 0,

        dependentParents:
          profile.dependentParents || 0,

        dependent_parents:
          profile.dependentParents || 0,

        source: SOURCE
      };
    }

    async function callTheWing(profile) {
      const veteran = isVeteran(profile);

      const body = veteran
        ? {
            tool: "RETIREMENT_VA",
            input: buildVeteranInput(profile)
          }
        : {
            tool: "PCS_SNAPSHOT",
            input: buildActiveDutyInput(profile)
          };

      const response = await fetch(
        BRAIN_ENDPOINT + "?t=" + Date.now(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify(body)
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || data.ok === false) {
        console.warn(
          "Header strip TheWing response:",
          data
        );

        return null;
      }

      return extractCompFromTheWing(data);
    }

    function paintComp(profile, compensation) {
      const safe = safeComp(profile, compensation);

      rememberGoodCompValues(profile, safe);

      if (
        currentStripMode === "financial" &&
        latestGoodFinancialValues
      ) {
        paintFinancialValues(
          latestGoodFinancialValues
        );

        return;
      }

      paintCompValues(
        profile,
        safe,
        !hasAnyCompValues(safe)
      );
    }

    async function run(reason) {
      const seq = ++requestSeq;
      const profile = latestProfile;

      if (
        currentStripMode === "financial" &&
        latestGoodFinancialValues
      ) {
        paintFinancialValues(
          latestGoodFinancialValues
        );

        return true;
      }

      if (!isProfileComplete(profile)) {
        paintZero(
          profile ||
          { mode: "active_duty" }
        );

        return false;
      }

      setCompLabels(profile);
      setLoading(true);
      setMissing(false);

      let compensation = null;

      try {
        compensation = await callTheWing(profile);
      } catch (error) {
        console.warn(
          "Header compensation failed:",
          error
        );
      }

      if (seq !== requestSeq) {
        return true;
      }

      if (!compensation) {
        paintZero(profile);
        return true;
      }

      paintComp(profile, compensation);

      dispatchPreviewReady(
        profile,
        compensation
      );

      return true;
    }

    /* ============================================================
      10. PROFILE AND COMPENSATION EVENTS
    ============================================================ */

    function receiveProfileEvent(event) {
      const detail =
        event && event.detail
          ? event.detail
          : {};

      const profile = extractProfile(detail);

      if (!profile) return;

      latestProfile = profile;

      if (
        currentStripMode === "financial" &&
        latestGoodFinancialValues
      ) {
        paintFinancialValues(
          latestGoodFinancialValues
        );

        return;
      }

      const compensation = extractComp(detail);
      const safe = safeComp(
        profile,
        compensation
      );

      if (hasAnyCompValues(safe)) {
        paintComp(profile, compensation);
        return;
      }

      /*
        Passive behavior:
        BasicBrain profile events do not trigger TheWing.
      */

      paintZero(profile);
    }

    function receiveCompEvent(event) {
      const detail =
        event && event.detail
          ? event.detail
          : {};

      const profile =
        extractProfile(detail) ||
        latestProfile ||
        { mode: "active_duty" };

      const compensation = extractComp(detail);

      const safe = safeComp(
        profile,
        compensation
      );

      latestProfile = profile;

      if (
        currentStripMode === "financial" &&
        latestGoodFinancialValues
      ) {
        paintFinancialValues(
          latestGoodFinancialValues
        );

        return;
      }

      if (hasAnyCompValues(safe)) {
        paintComp(profile, compensation);
        return;
      }

      if (
        isVeteran(profile) &&
        latestGoodVeteranValues
      ) {
        paintCompValues(
          profile,
          latestGoodVeteranValues,
          false
        );

        return;
      }

      if (
        !isVeteran(profile) &&
        latestGoodActiveValues
      ) {
        paintCompValues(
          profile,
          latestGoodActiveValues,
          false
        );

        return;
      }

      paintZero(profile);
    }

    /* ============================================================
      11. FINANCIAL EVENTS
    ============================================================ */

    function extractFinancialValues(detail) {
      const d =
        detail &&
        typeof detail === "object"
          ? detail
          : {};

      const headerSnapshot =
        d.headerSnapshot ||
        d.header_snapshot ||
        d.snapshot ||
        {};

      const income = num(
        headerSnapshot.income ??
        headerSnapshot.totalIncome ??
        headerSnapshot.totalMonthlyIncome ??
        d.totalIncome ??
        d.totalMonthlyIncome ??
        d.income ??
        d.monthlyIncome,
        0
      );

      const payment = num(
        headerSnapshot.payment ??
        headerSnapshot.estimatedPayment ??
        headerSnapshot.monthlyPayment ??
        d.estimatedPayment ??
        d.targetPayment ??
        d.monthlyPayment ??
        d.payment,
        0
      );

      const debt = num(
        headerSnapshot.debt ??
        headerSnapshot.monthlyDebt ??
        d.monthlyDebt ??
        d.debt ??
        d.monthlyDebtPayments,
        0
      );

      const ratio = num(
        headerSnapshot.ratio ??
        headerSnapshot.housingRatio ??
        d.housingRatio ??
        d.ratio,
        0
      );

      const maxPayment = num(
        headerSnapshot.maxPayment ??
        headerSnapshot.suggestedMaxPayment ??
        headerSnapshot.suggestedLimit ??
        d.suggestedLimit ??
        d.suggestedMaxPayment ??
        d.maxPayment,
        0
      );

      return {
        income,
        payment,
        debt,
        ratio,
        maxPayment
      };
    }

    function hasValidFinancialValues(values) {
      return Boolean(
        values &&
        num(values.income, 0) > 0
      );
    }

    function receiveFinancialEvent(event) {
      const detail =
        event && event.detail
          ? event.detail
          : {};

      const values =
        extractFinancialValues(detail);

      if (!hasValidFinancialValues(values)) {
        return;
      }

      latestGoodFinancialValues = {
        income: num(values.income, 0),
        payment: num(values.payment, 0),
        debt: num(values.debt, 0),
        ratio: num(values.ratio, 0),
        maxPayment: num(values.maxPayment, 0)
      };

      paintFinancialValues(
        latestGoodFinancialValues
      );
    }

    /* ============================================================
      12. GLOBAL HYDRATION
    ============================================================ */

    function safelyGetGlobalCandidates() {
      const candidates = [];

      try {
        const financialInputs =
          window.PCSU_FINANCIAL_INPUT_PANEL
            ?.getInputs?.();

        if (financialInputs) {
          candidates.push(financialInputs);
        }
      } catch (_) {
        // Continue to the remaining globals.
      }

      if (window.PCSU_BASICBRAIN_CURRENT) {
        candidates.push(
          window.PCSU_BASICBRAIN_CURRENT
        );
      }

      if (window.PCSU_BASICBRAIN_TEMP) {
        candidates.push(
          window.PCSU_BASICBRAIN_TEMP
        );
      }

      try {
        const lastGood =
          window.PCSU_BASICBRAIN
            ?.getLastGood?.();

        if (lastGood) {
          candidates.push(lastGood);
        }
      } catch (_) {
        // Continue.
      }

      try {
        const state =
          window.PCSU_BASICBRAIN
            ?.getState?.();

        if (state) {
          candidates.push(state);
        }
      } catch (_) {
        // Continue.
      }

      return candidates;
    }

    function tryHydrateFromGlobals() {
      const candidates =
        safelyGetGlobalCandidates();

      for (
        let i = 0;
        i < candidates.length;
        i += 1
      ) {
        const item = candidates[i];

        if (!item) continue;

        const financial =
          extractFinancialValues(item);

        if (
          hasValidFinancialValues(financial)
        ) {
          latestGoodFinancialValues =
            financial;

          paintFinancialValues(financial);
          return true;
        }

        const profile =
          extractProfile(item);

        if (!profile) continue;

        latestProfile = profile;

        const compensation =
          extractComp(item);

        const safe = safeComp(
          profile,
          compensation
        );

        if (hasAnyCompValues(safe)) {
          paintComp(
            profile,
            compensation
          );

          return true;
        }

        /*
          Passive hydration only.
          No automatic TheWing request.
        */

        paintZero(profile);
        return true;
      }

      return false;
    }

    /* ============================================================
      13. INITIALIZATION
    ============================================================ */

    function init() {
      root.classList.add("is-comp-mode");

      paintZero({
        mode: "active_duty"
      });

      window.addEventListener(
        "pcsunited:compensation-ready",
        receiveCompEvent
      );

      window.addEventListener(
        "pcsunited:compensation-preview-ready",
        receiveCompEvent
      );

      window.addEventListener(
        "pcsunited:basicbrain-updated",
        receiveProfileEvent
      );

      window.addEventListener(
        "pcsunited:profile-ready",
        receiveProfileEvent
      );

      window.addEventListener(
        "pcsunited:bridge-ready",
        receiveProfileEvent
      );

      window.addEventListener(
        "pcsunited:financial-input-updated",
        receiveFinancialEvent
      );

      window.addEventListener(
        "pcsunited:run-financial-analysis",
        receiveFinancialEvent
      );

      window.addEventListener(
        "message",
        (event) => {
          const data =
            event &&
            event.data;

          if (
            !data ||
            typeof data !== "object"
          ) {
            return;
          }

          if (
            data.type ===
              "pcsunited-financial-input" ||
            data.type ===
              "pcsunited-financial-analysis" ||
            data.source ===
              "pcsunited.financial.input.panel.v1.1.1"
          ) {
            receiveFinancialEvent({
              detail:
                data.detail ||
                data.payload ||
                data
            });

            return;
          }

          if (
            data.type ===
              "pcsunited-basicbrain" ||
            data.type ===
              "pcsunited-profile" ||
            data.type ===
              "pcsunited-bridge" ||
            data.source ===
              "pcsunited.basicbrain.input"
          ) {
            receiveProfileEvent({
              detail:
                data.basicbrain ||
                data.profile ||
                data.bridge ||
                data.payload ||
                data
            });
          }
        }
      );

      /*
        Passive hydration only.
        These calls never trigger the API.
      */

      setTimeout(
        tryHydrateFromGlobals,
        250
      );

      setTimeout(
        tryHydrateFromGlobals,
        1000
      );

      setTimeout(
        tryHydrateFromGlobals,
        1800
      );

      /* ========================================================
        PUBLIC CONTROL API
      ======================================================== */

      window.PCSU_HEADER_COMP_BASICBRAIN = {
        version: VERSION,
        endpoint: BRAIN_ENDPOINT,

        refresh() {
          /*
            Manual refresh is the only header action
            permitted to call TheWing.
          */

          if (
            currentStripMode === "financial" &&
            latestGoodFinancialValues
          ) {
            paintFinancialValues(
              latestGoodFinancialValues
            );

            return true;
          }

          return run("manual-refresh");
        },

        setProfile(profile) {
          latestProfile =
            extractProfile(profile || {});

          currentStripMode =
            "compensation";

          latestGoodFinancialValues =
            null;

          paintZero(
            latestProfile ||
            { mode: "active_duty" }
          );

          return true;
        },

        setFinancial(values) {
          const safe =
            extractFinancialValues(
              values || {}
            );

          if (
            hasValidFinancialValues(safe)
          ) {
            latestGoodFinancialValues =
              safe;

            paintFinancialValues(safe);
            return true;
          }

          return false;
        },

        showCompensation() {
          currentStripMode =
            "compensation";

          latestGoodFinancialValues =
            null;

          if (latestProfile) {
            if (
              isVeteran(latestProfile) &&
              latestGoodVeteranValues
            ) {
              paintCompValues(
                latestProfile,
                latestGoodVeteranValues,
                false
              );

              return true;
            }

            if (
              !isVeteran(latestProfile) &&
              latestGoodActiveValues
            ) {
              paintCompValues(
                latestProfile,
                latestGoodActiveValues,
                false
              );

              return true;
            }
          }

          paintZero(
            latestProfile ||
            { mode: "active_duty" }
          );

          return true;
        },

        showFinancial() {
          if (latestGoodFinancialValues) {
            paintFinancialValues(
              latestGoodFinancialValues
            );

            return true;
          }

          return tryHydrateFromGlobals();
        },

        clear() {
          latestProfile = null;
          latestGoodVeteranValues = null;
          latestGoodActiveValues = null;
          latestGoodFinancialValues = null;

          currentStripMode =
            "compensation";

          paintZero({
            mode: "active_duty"
          });
        },

        getMode() {
          return currentStripMode;
        },

        getProfile() {
          return latestProfile;
        },

        getStickyValues() {
          return {
            veteran:
              latestGoodVeteranValues,

            activeDuty:
              latestGoodActiveValues,

            financial:
              latestGoodFinancialValues
          };
        }
      };

      window.dispatchEvent(
        new CustomEvent(
          "pcsunited:header-progression-ready",
          {
            detail: {
              version: VERSION,
              source: SOURCE,
              root,
              endpoint: BRAIN_ENDPOINT
            }
          }
        )
      );
    }

    init();
  }

  /* ============================================================
    14. SAFE DOM START
  ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startHeaderProgression,
      { once: true }
    );
  } else {
    startHeaderProgression();
  }
})();
