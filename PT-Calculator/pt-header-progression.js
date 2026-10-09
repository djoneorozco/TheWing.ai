/* ============================================================
  PCSUnited • PT Score Header Strip
  Standalone Public JavaScript
  v1.2.0 • RESPONSIVE SCORE HEADER

  FILE
  PT-Calculator/pt-header-progression.js

  REQUIRED MOUNT
  #pcsu-pt-header-progression-widget

  PURPOSE
  - Injects a responsive live PT score breakdown strip
  - Consumes snapshots from ptcalculator.js only
  - Does not recalculate official PFRA scoring
  - No API requests, storage, navigation, or scrolling
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.2.0";
  const SOURCE = "pcsunited.pt.header.v1.2.0";

  const MOUNT_ID = "pcsu-pt-header-progression-widget";
  const ROOT_ID = "pcsu-pt-header-score-strip";
  const STYLE_ID = "pcsu-pt-header-progression-styles-v120";
  const FONT_ID = "pcsu-pt-header-progression-font";

  const CAPS = {
    body: 20,
    strength: 15,
    core: 15,
    cardio: 50,
    total: 100
  };

  function startPTHeaderProgression() {
    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn(
        `PCSUnited PT Header Progression mount #${MOUNT_ID} was not found.`
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
      const preconnectGoogle =
        document.createElement("link");

      preconnectGoogle.rel = "preconnect";
      preconnectGoogle.href =
        "https://fonts.googleapis.com";

      const preconnectStatic =
        document.createElement("link");

      preconnectStatic.rel = "preconnect";
      preconnectStatic.href =
        "https://fonts.gstatic.com";

      preconnectStatic.crossOrigin =
        "anonymous";

      const fontLink =
        document.createElement("link");

      fontLink.id = FONT_ID;
      fontLink.rel = "stylesheet";

      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";

      document.head.appendChild(
        preconnectGoogle
      );

      document.head.appendChild(
        preconnectStatic
      );

      document.head.appendChild(
        fontLink
      );
    }

    /* ============================================================
      2. STYLES
    ============================================================ */

    if (!document.getElementById(STYLE_ID)) {
      const style =
        document.createElement("style");

      style.id = STYLE_ID;

      style.textContent = `
        #${ROOT_ID} {
          all:initial;
          display:block;
          width:100%;
          min-width:0;
          margin:16px 0 20px;
          color:#f3f8fc;
          background:transparent;
        }

        #${ROOT_ID},
        #${ROOT_ID} * {
          box-sizing:border-box;
          font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        #${ROOT_ID} .pcsu-pt-header-wrap {
          width:100%;
          container-type:inline-size;
          container-name:pcsu-pt-header;
        }

        #${ROOT_ID} .pcsu-pt-header-inner {
          width:100%;
          min-width:0;
        }

        #${ROOT_ID} .pcsu-pt-header-grid {
          display:grid;
          grid-template-columns:repeat(4, minmax(0, 1fr)) minmax(0, 1.5fr);
          align-items:stretch;
          gap:12px;
          width:min(900px, 100%);
          margin:0 auto;
        }

        #${ROOT_ID} .pcsu-pt-header-tile {
          min-width:0;
          min-height:104px;
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          gap:6px;
          padding:16px 12px;
          border:1px solid rgba(200,224,241,.16);
          border-radius:20px;
          background:rgba(20,46,66,.32);
          color:#f3f8fc;
          text-align:center;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
        }

        #${ROOT_ID} .pcsu-pt-header-label {
          display:block;
          max-width:100%;
          color:#b9cddd;
          font-size:10px;
          line-height:1.35;
          font-weight:700;
          text-transform:uppercase;
          letter-spacing:.1em;
          overflow-wrap:anywhere;
        }

        #${ROOT_ID} .pcsu-pt-header-value {
          display:block;
          max-width:100%;
          color:#f4f8fb;
          font-size:22px;
          line-height:1.1;
          font-weight:800;
          font-variant-numeric:tabular-nums;
          letter-spacing:-.035em;
          overflow-wrap:anywhere;
        }

        #${ROOT_ID} .pcsu-pt-header-support {
          display:block;
          max-width:100%;
          color:#b9cddd;
          font-size:11px;
          line-height:1.4;
          font-weight:500;
          overflow-wrap:anywhere;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-gold,
        #${ROOT_ID} .pcsu-pt-header-support.is-gold {
          color:#f0cf83;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-green,
        #${ROOT_ID} .pcsu-pt-header-support.is-green {
          color:#9fe3d4;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-danger,
        #${ROOT_ID} .pcsu-pt-header-support.is-danger {
          color:#ff9fb0;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-amber,
        #${ROOT_ID} .pcsu-pt-header-support.is-amber {
          color:#e4c071;
        }

        #${ROOT_ID} .pcsu-pt-header-value.is-aqua {
          color:#86dfe0;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-missing {
          opacity:.7;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total {
          gap:5px;
          border-color:rgba(240,207,131,.36);
          background:linear-gradient(135deg,
            rgba(240,207,131,.09), rgba(20,46,66,.38));
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total .pcsu-pt-header-label {
          color:#e6e4d9;
          font-size:11px;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total .pcsu-pt-header-value {
          font-size:36px;
          font-weight:800;
          letter-spacing:-.045em;
        }

        #${ROOT_ID} .pcsu-pt-header-tile.is-total .pcsu-pt-header-support {
          font-size:12px;
          font-weight:600;
        }

        /* Fit narrow embeds as well as phone screens. */
        @container pcsu-pt-header (max-width:700px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            grid-template-columns:repeat(2, minmax(0, 1fr));
            gap:10px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            min-height:96px;
            padding:14px 10px;
            border-radius:18px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total {
            grid-column:1 / -1;
            grid-row:1;
            min-height:116px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total .pcsu-pt-header-value {
            font-size:42px;
          }
        }

        /* Also covers browsers without container query support. */
        @media (max-width:700px) {
          #${ROOT_ID} .pcsu-pt-header-grid {
            grid-template-columns:repeat(2, minmax(0, 1fr));
            gap:10px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile {
            min-height:96px;
            padding:14px 10px;
            border-radius:18px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total {
            grid-column:1 / -1;
            grid-row:1;
            min-height:116px;
          }

          #${ROOT_ID} .pcsu-pt-header-tile.is-total .pcsu-pt-header-value {
            font-size:42px;
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
        data-version="${VERSION}"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Estimated PT score breakdown"
      >
        <div class="pcsu-pt-header-wrap">
          <div class="pcsu-pt-header-inner">
            <div class="pcsu-pt-header-grid">

              <div
                class="
                  pcsu-pt-header-tile
                  is-missing
                "
                data-accent="body"
                id="pcsu-pt-tile-body"
              >
                <span
                  class="pcsu-pt-header-label"
                  id="pcsu-pt-label-body"
                >
                  Body
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-value-body"
                >
                  — / 20
                </span>

                <span
                  class="pcsu-pt-header-support"
                  id="pcsu-pt-support-body"
                ></span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-missing
                "
                data-accent="strength"
                id="pcsu-pt-tile-strength"
              >
                <span
                  class="pcsu-pt-header-label"
                  id="pcsu-pt-label-strength"
                >
                  Strength
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-value-strength"
                >
                  — / 15
                </span>

                <span
                  class="pcsu-pt-header-support"
                  id="pcsu-pt-support-strength"
                ></span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-missing
                "
                data-accent="core"
                id="pcsu-pt-tile-core"
              >
                <span
                  class="pcsu-pt-header-label"
                  id="pcsu-pt-label-core"
                >
                  Core
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-value-core"
                >
                  — / 15
                </span>

                <span
                  class="pcsu-pt-header-support"
                  id="pcsu-pt-support-core"
                ></span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-missing
                "
                data-accent="cardio"
                id="pcsu-pt-tile-cardio"
              >
                <span
                  class="pcsu-pt-header-label"
                  id="pcsu-pt-label-cardio"
                >
                  Cardio
                </span>

                <span
                  class="pcsu-pt-header-value"
                  id="pcsu-pt-value-cardio"
                >
                  — / 50
                </span>

                <span
                  class="pcsu-pt-header-support"
                  id="pcsu-pt-support-cardio"
                ></span>
              </div>

              <div
                class="
                  pcsu-pt-header-tile
                  is-total
                  is-missing
                "
                data-accent="total"
                id="pcsu-pt-tile-total"
              >
                <span
                  class="pcsu-pt-header-label"
                  id="pcsu-pt-label-total"
                >
                  Total Score
                </span>

                <span
                  class="
                    pcsu-pt-header-value
                    is-gold
                  "
                  id="pcsu-pt-value-total"
                >
                  —
                </span>

                <span
                  class="pcsu-pt-header-support"
                  id="pcsu-pt-support-total"
                >
                  Adjust inputs
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;

    const root =
      document.getElementById(ROOT_ID);

    if (!root) {
      return;
    }

    /* ============================================================
      4. ELEMENT REFERENCES
    ============================================================ */

    const els = {
      tileBody:
        root.querySelector(
          "#pcsu-pt-tile-body"
        ),

      tileStrength:
        root.querySelector(
          "#pcsu-pt-tile-strength"
        ),

      tileCore:
        root.querySelector(
          "#pcsu-pt-tile-core"
        ),

      tileCardio:
        root.querySelector(
          "#pcsu-pt-tile-cardio"
        ),

      tileTotal:
        root.querySelector(
          "#pcsu-pt-tile-total"
        ),

      valueBody:
        root.querySelector(
          "#pcsu-pt-value-body"
        ),

      valueStrength:
        root.querySelector(
          "#pcsu-pt-value-strength"
        ),

      valueCore:
        root.querySelector(
          "#pcsu-pt-value-core"
        ),

      valueCardio:
        root.querySelector(
          "#pcsu-pt-value-cardio"
        ),

      valueTotal:
        root.querySelector(
          "#pcsu-pt-value-total"
        ),

      supportBody:
        root.querySelector(
          "#pcsu-pt-support-body"
        ),

      supportStrength:
        root.querySelector(
          "#pcsu-pt-support-strength"
        ),

      supportCore:
        root.querySelector(
          "#pcsu-pt-support-core"
        ),

      supportCardio:
        root.querySelector(
          "#pcsu-pt-support-cardio"
        ),

      supportTotal:
        root.querySelector(
          "#pcsu-pt-support-total"
        )
    };

    let latestSnapshot = null;
    let lastPaintKey = "";

    /* ============================================================
      5. UTILITIES
    ============================================================ */

    function safeText(node, value) {
      if (!node) {
        return;
      }

      node.textContent =
        value == null
          ? ""
          : String(value);
    }

    function clearTone(node) {
      if (!node) {
        return;
      }

      node.classList.remove(
        "is-gold",
        "is-green",
        "is-danger",
        "is-amber",
        "is-aqua"
      );
    }

    function setTone(node, tone) {
      clearTone(node);

      if (!node || !tone) {
        return;
      }

      node.classList.add(tone);
    }

    function formatOneDecimal(value) {
      const number =
        Number(value);

      if (!Number.isFinite(number)) {
        return null;
      }

      return number.toFixed(1);
    }

    function asFiniteNumber(value) {
      const number =
        Number(value);

      return Number.isFinite(number)
        ? number
        : null;
    }

    function asBoolean(value) {
      if (typeof value === "boolean") {
        return value;
      }

      return null;
    }

    function asString(value) {
      if (typeof value === "string") {
        return value.trim();
      }

      if (value == null) {
        return "";
      }

      return String(value).trim();
    }

    function shortEventName(name) {
      const raw =
        asString(name);

      if (!raw) {
        return "";
      }

      return raw
        .replace(
          /^2\.0\s*Mile\s*/i,
          "2 mi "
        )
        .replace(
          /^20m\s*/i,
          "20m "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();
    }

    function normalizeSnapshot(raw) {
      if (
        !raw ||
        typeof raw !== "object"
      ) {
        return null;
      }

      const detail =
        raw.detail &&
        typeof raw.detail === "object"
          ? raw.detail
          : raw.payload &&
              typeof raw.payload ===
                "object"
            ? raw.payload
            : raw;

      if (
        !detail ||
        typeof detail !== "object"
      ) {
        return null;
      }

      const type =
        asString(detail.type);

      const source =
        asString(detail.source);

      if (
        type &&
        type !== "pcsunited-pt-score" &&
        source !==
          "pcsunited.pt.calculator"
      ) {
        return null;
      }

      if (
        !type &&
        source &&
        source !==
          "pcsunited.pt.calculator"
      ) {
        return null;
      }

      const events =
        detail.events &&
        typeof detail.events === "object"
          ? detail.events
          : {};

      const caps =
        detail.caps &&
        typeof detail.caps === "object"
          ? detail.caps
          : CAPS;

      return {
        source:
          source ||
          "pcsunited.pt.calculator",

        version:
          asString(detail.version) ||
          "1.0.0",

        type:
          "pcsunited-pt-score",

        bodyScore:
          asFiniteNumber(
            detail.bodyScore
          ),

        strengthScore:
          asFiniteNumber(
            detail.strengthScore
          ),

        coreScore:
          asFiniteNumber(
            detail.coreScore
          ),

        cardioScore:
          asFiniteNumber(
            detail.cardioScore
          ),

        total:
          asFiniteNumber(
            detail.total
          ),

        category:
          asString(
            detail.category
          ),

        minimumsMet:
          asBoolean(
            detail.minimumsMet
          ),

        strengthPassed:
          asBoolean(
            detail.strengthPassed
          ),

        corePassed:
          asBoolean(
            detail.corePassed
          ),

        cardioPassed:
          asBoolean(
            detail.cardioPassed
          ),

        cardioMode:
          asString(
            detail.cardioMode
          ),

        walkPassed:
          asBoolean(
            detail.walkPassed
          ),

        ratio:
          asFiniteNumber(
            detail.ratio
          ),

        riskLabel:
          asString(
            detail.riskLabel
          ),

        events: {
          strength:
            asString(
              events.strength
            ),

          core:
            asString(
              events.core
            ),

          cardio:
            asString(
              events.cardio
            )
        },

        caps: {
          body:
            asFiniteNumber(
              caps.body
            ) ?? CAPS.body,

          strength:
            asFiniteNumber(
              caps.strength
            ) ?? CAPS.strength,

          core:
            asFiniteNumber(
              caps.core
            ) ?? CAPS.core,

          cardio:
            asFiniteNumber(
              caps.cardio
            ) ?? CAPS.cardio,

          total:
            asFiniteNumber(
              caps.total
            ) ?? CAPS.total
        },

        updated_at:
          asString(
            detail.updated_at
          )
      };
    }

    function bodyTone(snapshot) {
      const risk =
        asString(
          snapshot.riskLabel
        ).toLowerCase();

      if (risk.includes("high")) {
        return "is-danger";
      }

      if (
        risk.includes("moderate")
      ) {
        return "is-gold";
      }

      return "is-aqua";
    }

    function categoryDisplay(category) {
      if (
        category === "Unresolved-90"
      ) {
        return "Verify Rating";
      }

      if (
        category === "Excellent"
      ) {
        return "Excellent";
      }

      if (
        category === "Satisfactory"
      ) {
        return "Satisfactory";
      }

      if (
        category === "Unsatisfactory"
      ) {
        return "Unsatisfactory";
      }

      if (
        category === "Walk-Pass"
      ) {
        return "Confirm in myFitness";
      }

      if (
        category === "Walk-Fail"
      ) {
        return "Walk Failed.";
      }

      return category || "";
    }

    function totalTone(snapshot) {
      if (
        snapshot.cardioMode === "walk"
      ) {
        return snapshot.walkPassed === true
          ? "is-gold"
          : "is-danger";
      }

      if (
        snapshot.minimumsMet === false
      ) {
        return "is-danger";
      }

      if (
        snapshot.category ===
        "Excellent"
      ) {
        return "is-green";
      }

      if (
        snapshot.category ===
        "Satisfactory"
      ) {
        return "is-gold";
      }

      if (
        snapshot.category ===
        "Unresolved-90"
      ) {
        return "is-amber";
      }

      if (
        snapshot.category ===
        "Unsatisfactory"
      ) {
        return "is-danger";
      }

      return "is-gold";
    }

    function paintMissing() {
      latestSnapshot = null;
      lastPaintKey = "missing";

      [
        els.tileBody,
        els.tileStrength,
        els.tileCore,
        els.tileCardio,
        els.tileTotal
      ].forEach((tile) => {
        if (tile) {
          tile.classList.add(
            "is-missing"
          );
        }
      });

      safeText(
        els.valueBody,
        `— / ${CAPS.body}`
      );

      safeText(
        els.valueStrength,
        `— / ${CAPS.strength}`
      );

      safeText(
        els.valueCore,
        `— / ${CAPS.core}`
      );

      safeText(
        els.valueCardio,
        `— / ${CAPS.cardio}`
      );

      safeText(
        els.valueTotal,
        "—"
      );

      safeText(
        els.supportBody,
        ""
      );

      safeText(
        els.supportStrength,
        ""
      );

      safeText(
        els.supportCore,
        ""
      );

      safeText(
        els.supportCardio,
        ""
      );

      safeText(
        els.supportTotal,
        "Adjust inputs"
      );

      setTone(
        els.valueBody,
        null
      );

      setTone(
        els.valueStrength,
        null
      );

      setTone(
        els.valueCore,
        null
      );

      setTone(
        els.valueCardio,
        null
      );

      setTone(
        els.valueTotal,
        "is-gold"
      );

      setTone(
        els.supportTotal,
        null
      );

      root.setAttribute(
        "aria-label",
        "Estimated PT score breakdown. Adjust calculator inputs to see scores."
      );
    }

    function paintSnapshot(snapshot) {
      const paintKey =
        JSON.stringify({
          bodyScore:
            snapshot.bodyScore,

          strengthScore:
            snapshot.strengthScore,

          coreScore:
            snapshot.coreScore,

          cardioScore:
            snapshot.cardioScore,

          total:
            snapshot.total,

          category:
            snapshot.category,

          minimumsMet:
            snapshot.minimumsMet,

          strengthPassed:
            snapshot.strengthPassed,

          corePassed:
            snapshot.corePassed,

          cardioPassed:
            snapshot.cardioPassed,

          cardioMode:
            snapshot.cardioMode,

          walkPassed:
            snapshot.walkPassed,

          ratio:
            snapshot.ratio,

          riskLabel:
            snapshot.riskLabel,

          events:
            snapshot.events
        });

      if (paintKey === lastPaintKey) {
        return;
      }

      lastPaintKey = paintKey;
      latestSnapshot = snapshot;

      [
        els.tileBody,
        els.tileStrength,
        els.tileCore,
        els.tileCardio,
        els.tileTotal
      ].forEach((tile) => {
        if (tile) {
          tile.classList.remove(
            "is-missing"
          );
        }
      });

      const bodyCap =
        snapshot.caps.body;

      const strengthCap =
        snapshot.caps.strength;

      const coreCap =
        snapshot.caps.core;

      const cardioCap =
        snapshot.caps.cardio;

      const bodyText =
        formatOneDecimal(
          snapshot.bodyScore
        );

      const strengthText =
        formatOneDecimal(
          snapshot.strengthScore
        );

      const coreText =
        formatOneDecimal(
          snapshot.coreScore
        );

      const cardioText =
        formatOneDecimal(
          snapshot.cardioScore
        );

      const totalText =
        formatOneDecimal(
          snapshot.total
        );

      safeText(
        els.valueBody,

        bodyText == null
          ? `— / ${bodyCap}`
          : `${bodyText} / ${bodyCap}`
      );

      setTone(
        els.valueBody,
        bodyTone(snapshot)
      );

      if (snapshot.ratio != null) {
        safeText(
          els.supportBody,
          `WHtR ${snapshot.ratio.toFixed(2)}`
        );
      } else {
        safeText(
          els.supportBody,
          ""
        );
      }

      safeText(
        els.valueStrength,

        strengthText == null
          ? `— / ${strengthCap}`
          : `${strengthText} / ${strengthCap}`
      );

      setTone(
        els.valueStrength,

        snapshot.strengthPassed ===
          false
          ? "is-danger"
          : null
      );

      safeText(
        els.supportStrength,

        shortEventName(
          snapshot.events.strength
        )
      );

      safeText(
        els.valueCore,

        coreText == null
          ? `— / ${coreCap}`
          : `${coreText} / ${coreCap}`
      );

      setTone(
        els.valueCore,

        snapshot.corePassed === false
          ? "is-danger"
          : null
      );

      safeText(
        els.supportCore,

        shortEventName(
          snapshot.events.core
        )
      );

      let ariaLabel = "";

      if (
        snapshot.cardioMode === "walk"
      ) {
        const walkPass =
          snapshot.walkPassed === true;

        safeText(
          els.valueCardio,

          walkPass
            ? "PASS"
            : "FAIL"
        );

        setTone(
          els.valueCardio,

          walkPass
            ? "is-green"
            : "is-danger"
        );

        safeText(
          els.supportCardio,
          "2 km Walk"
        );

        if (walkPass) {
          safeText(
            els.valueTotal,
            "Adjusted"
          );

          setTone(
            els.valueTotal,
            "is-gold"
          );

          safeText(
            els.supportTotal,
            "Confirm in myFitness"
          );

          setTone(
            els.supportTotal,
            "is-gold"
          );

          ariaLabel =
            "2 kilometer walk passed. Official adjusted composite must be confirmed in myFitness.";
        } else {
          safeText(
            els.valueTotal,
            "Adjusted"
          );

          setTone(
            els.valueTotal,
            "is-danger"
          );

          safeText(
            els.supportTotal,
            "Walk Failed."
          );

          setTone(
            els.supportTotal,
            "is-danger"
          );

          ariaLabel =
            "2 kilometer walk failed. Estimated PT score is unsatisfactory for the walk component.";
        }
      } else {
        safeText(
          els.valueCardio,

          cardioText == null
            ? `— / ${cardioCap}`
            : `${cardioText} / ${cardioCap}`
        );

        setTone(
          els.valueCardio,

          snapshot.cardioPassed === false
            ? "is-danger"
            : null
        );

        safeText(
          els.supportCardio,

          shortEventName(
            snapshot.events.cardio
          )
        );

        const displayCategory =
          categoryDisplay(
            snapshot.category
          );

        const tone =
          totalTone(snapshot);

        if (totalText == null) {
          safeText(
            els.valueTotal,
            "—"
          );
        } else {
          safeText(
            els.valueTotal,
            totalText
          );
        }

        setTone(
          els.valueTotal,
          tone
        );

        safeText(
          els.supportTotal,
          displayCategory
        );

        setTone(
          els.supportTotal,
          tone
        );

        if (
          snapshot.category ===
          "Unresolved-90"
        ) {
          ariaLabel =
            "Estimated total PT score 90.0, Verify Rating.";
        } else if (
          totalText != null
        ) {
          ariaLabel =
            `Estimated total PT score ${totalText}, ${displayCategory || "pending"}.`;
        } else {
          ariaLabel =
            "Estimated PT score breakdown.";
        }
      }

      root.setAttribute(
        "aria-label",
        ariaLabel
      );
    }

    function receivePTScore(
      eventOrSnapshot
    ) {
      const raw =
        eventOrSnapshot &&
        typeof eventOrSnapshot ===
          "object" &&
        "detail" in eventOrSnapshot
          ? eventOrSnapshot
          : {
              detail:
                eventOrSnapshot
            };

      const snapshot =
        normalizeSnapshot(raw);

      if (!snapshot) {
        return false;
      }

      const hasAnyScore =
        snapshot.bodyScore != null ||
        snapshot.strengthScore != null ||
        snapshot.coreScore != null ||
        snapshot.cardioScore != null ||
        snapshot.total != null ||
        snapshot.cardioMode === "walk" ||
        snapshot.category !== "";

      if (!hasAnyScore) {
        return false;
      }

      paintSnapshot(snapshot);

      return true;
    }

    function tryHydrateFromGlobals() {
      if (
        window.PCSU_PT_SCORE_CURRENT
      ) {
        if (
          receivePTScore({
            detail:
              window.PCSU_PT_SCORE_CURRENT
          })
        ) {
          return true;
        }
      }

      try {
        const fromApi =
          window.PCSU_PT_CALCULATOR &&
          typeof window
            .PCSU_PT_CALCULATOR
            .getScoreSnapshot ===
              "function"
            ? window
                .PCSU_PT_CALCULATOR
                .getScoreSnapshot()
            : null;

        if (
          fromApi &&
          receivePTScore({
            detail:fromApi
          })
        ) {
          return true;
        }
      } catch (_error) {
        /*
          Ignore passive hydration errors.
        */
      }

      return false;
    }

    /* ============================================================
      6. INIT
    ============================================================ */

    function init() {
      paintMissing();

      window.addEventListener(
        "pcsunited:pt-score-updated",
        receivePTScore
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
              "pcsunited-pt-score" ||
            data.source ===
              "pcsunited.pt.calculator"
          ) {
            receivePTScore({
              detail:
                data.detail ||
                data.payload ||
                data
            });
          }
        }
      );

      /*
        Passive hydration only.

        These calls never trigger
        calculator inputs or APIs.
      */

      setTimeout(
        tryHydrateFromGlobals,
        100
      );

      setTimeout(
        tryHydrateFromGlobals,
        500
      );

      setTimeout(
        tryHydrateFromGlobals,
        1200
      );

      const existingHeaderApi =
        window.PCSU_PT_HEADER &&
        typeof window
          .PCSU_PT_HEADER ===
            "object"
          ? window.PCSU_PT_HEADER
          : {};

      window.PCSU_PT_HEADER =
        Object.assign(
          {},
          existingHeaderApi,
          {
            version:VERSION,
            source:SOURCE,

            getScoreSnapshot() {
              return latestSnapshot;
            },

            setScoreSnapshot(
              snapshot
            ) {
              return receivePTScore({
                detail:
                  snapshot || {}
              });
            },

            clear() {
              paintMissing();

              return true;
            },

            refresh() {
              if (
                tryHydrateFromGlobals()
              ) {
                return true;
              }

              try {
                if (
                  window
                    .PCSU_PT_CALCULATOR &&
                  typeof window
                    .PCSU_PT_CALCULATOR
                    .emitScoreSnapshot ===
                      "function"
                ) {
                  return Boolean(
                    window
                      .PCSU_PT_CALCULATOR
                      .emitScoreSnapshot()
                  );
                }
              } catch (_error) {
                return false;
              }

              return false;
            }
          }
        );

      window.dispatchEvent(
        new CustomEvent(
          "pcsunited:pt-header-ready",
          {
            detail: {
              version:VERSION,
              source:SOURCE,
              root
            }
          }
        )
      );
    }

    init();
  }

  /* ============================================================
    SAFE DOM START
  ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      startPTHeaderProgression,
      {
        once:true
      }
    );
  } else {
    startPTHeaderProgression();
  }
})();
