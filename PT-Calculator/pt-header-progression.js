/* ============================================================
  PCSUnited • PT Score Header Strip
  Standalone Public JavaScript
  v1.1.0 • MIDNIGHT AF BLUE

  FILE
  PT-Calculator/pt-header-progression.js

  REQUIRED MOUNT
  #pcsu-pt-header-progression-widget

  PURPOSE
  - Injects a compact live PT score breakdown strip
  - Consumes snapshots from ptcalculator.js only
  - Does not recalculate official PFRA scoring
  - No API requests, storage, navigation, or scrolling
=============================================================== */

(() => {
  "use strict";

  const VERSION = "1.1.0";
  const SOURCE = "pcsunited.pt.header.v1.1.0";

  const MOUNT_ID = "pcsu-pt-header-progression-widget";
  const ROOT_ID = "pcsu-pt-header-score-strip";
  const STYLE_ID = "pcsu-pt-header-progression-styles-v110";
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
        #${ROOT_ID},
        #${ROOT_ID} * {
          box-sizing:border-box;

          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        #${ROOT_ID} {
          display:block;
          width:100%;

          color:#f3f8fc;

          background:
            transparent !important;

          margin:10px 0 14px;
        }

        #${ROOT_ID}
        .pcsu-pt-header-wrap {
          width:100%;

          display:flex;
          align-items:center;
          justify-content:center;

          background:
            transparent !important;
        }

        #${ROOT_ID}
        .pcsu-pt-header-inner {
          width:100%;
        }

        #${ROOT_ID}
        .pcsu-pt-header-grid {
          display:grid;

          grid-template-columns:
            repeat(
              5,
              minmax(84px, 1fr)
            );

          gap:10px;

          width:min(680px, 100%);

          margin:0 auto;

          background:
            transparent !important;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile {
          position:relative;
          overflow:hidden;

          min-height:50px;

          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;

          padding:
            8px
            12px
            9px;

          border:
            1px solid
            rgba(183,211,232,.18);

          border-radius:999px;

          background:
            radial-gradient(
              120px 58px
              at 24% 0%,
              rgba(116,177,216,.15),
              transparent 70%
            ),
            linear-gradient(
              180deg,
              rgba(25,52,78,.94),
              rgba(10,30,48,.92)
            );

          color:#f3f8fc;

          text-align:center;

          box-shadow:
            inset 0 1px 0
              rgba(221,237,247,.10),

            0 10px 24px
              rgba(2,12,24,.30);

          backdrop-filter:
            blur(12px)
            saturate(145%);

          -webkit-backdrop-filter:
            blur(12px)
            saturate(145%);

          transition:
            opacity .18s ease,
            transform .18s ease,
            filter .18s ease,
            border-color .18s ease;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile::before {
          content:"";

          position:absolute;
          inset:0 0 auto;

          height:1px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(228,192,113,.32),
              rgba(124,203,217,.18),
              transparent
            );

          pointer-events:none;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile::after {
          content:"";

          position:absolute;
          inset:0;

          border-radius:inherit;

          background:
            linear-gradient(
              180deg,
              rgba(218,235,246,.035),
              rgba(218,235,246,0)
              46%
            );

          pointer-events:none;
        }

        #${ROOT_ID}
        .pcsu-pt-header-accent {
          position:absolute;

          left:10px;
          right:10px;
          bottom:6px;

          height:2px;

          border-radius:999px;

          opacity:.78;

          pointer-events:none;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile[
          data-accent="body"
        ]
        .pcsu-pt-header-accent {
          background:
            linear-gradient(
              90deg,
              transparent,
              #76d6d0,
              transparent
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile[
          data-accent="strength"
        ]
        .pcsu-pt-header-accent {
          background:
            linear-gradient(
              90deg,
              transparent,
              #d8a58e,
              transparent
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile[
          data-accent="core"
        ]
        .pcsu-pt-header-accent {
          background:
            linear-gradient(
              90deg,
              transparent,
              #aebfe8,
              transparent
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile[
          data-accent="cardio"
        ]
        .pcsu-pt-header-accent {
          background:
            linear-gradient(
              90deg,
              transparent,
              #9fe3d4,
              transparent
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile[
          data-accent="total"
        ]
        .pcsu-pt-header-accent {
          background:
            linear-gradient(
              90deg,
              transparent,
              #e4c071,
              transparent
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-label {
          position:relative;
          z-index:2;

          display:block;

          margin-bottom:2px;

          color:
            rgba(205,223,236,.66);

          font-size:7.5px;
          line-height:1;
          font-weight:900;

          text-transform:uppercase;

          letter-spacing:.12em;

          white-space:nowrap;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value {
          position:relative;
          z-index:2;

          display:block;

          color:#f4f8fb;

          font-size:12.5px;
          line-height:1.05;
          font-weight:900;

          letter-spacing:-.03em;

          white-space:nowrap;
        }

        #${ROOT_ID}
        .pcsu-pt-header-support {
          position:relative;
          z-index:2;

          display:block;

          max-width:100%;

          margin-top:2px;

          overflow:hidden;

          color:
            rgba(190,210,225,.64);

          font-size:8px;
          line-height:1.1;
          font-weight:600;

          letter-spacing:.01em;

          text-overflow:ellipsis;
          white-space:nowrap;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value.is-gold {
          color:#f0cf83;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value.is-green {
          color:#9fe3d4;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value.is-danger {
          color:#ff9fb0;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value.is-amber {
          color:#e4c071;
        }

        #${ROOT_ID}
        .pcsu-pt-header-value.is-aqua {
          color:#86dfe0;
        }

        #${ROOT_ID}
        .pcsu-pt-header-support.is-gold {
          color:#f0cf83;
        }

        #${ROOT_ID}
        .pcsu-pt-header-support.is-green {
          color:#9fe3d4;
        }

        #${ROOT_ID}
        .pcsu-pt-header-support.is-danger {
          color:#ff9fb0;
        }

        #${ROOT_ID}
        .pcsu-pt-header-support.is-amber {
          color:#e4c071;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile.is-missing {
          opacity:.52;
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile.is-total {
          min-height:50px;

          border-color:
            rgba(228,192,113,.28);

          background:
            radial-gradient(
              130px 64px
              at 30% 0%,
              rgba(228,192,113,.14),
              transparent 72%
            ),
            linear-gradient(
              180deg,
              rgba(33,52,71,.96),
              rgba(14,30,45,.94)
            );
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile:hover {
          transform:
            translateY(-1px);

          border-color:
            rgba(183,211,232,.28);

          filter:
            brightness(1.04);
        }

        #${ROOT_ID}
        .pcsu-pt-header-tile.is-total:hover {
          border-color:
            rgba(228,192,113,.40);
        }

        @media (max-width:900px) {
          #${ROOT_ID}
          .pcsu-pt-header-grid {
            width:min(620px, 100%);
            gap:6px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-label {
            font-size:7px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-value {
            font-size:12px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-support {
            font-size:7.5px;
          }
        }

        @media (max-width:760px) {
          #${ROOT_ID}
          .pcsu-pt-header-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(110px, 1fr)
              );

            width:100%;
            gap:8px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-tile {
            min-height:54px;

            padding:
              9px
              11px
              11px;

            border-radius:14px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-tile.is-total {
            grid-column:1 / -1;
          }

          #${ROOT_ID}
          .pcsu-pt-header-label {
            font-size:9px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-value {
            font-size:15px;
          }

          #${ROOT_ID}
          .pcsu-pt-header-support {
            font-size:9px;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          #${ROOT_ID},
          #${ROOT_ID} * {
            transition-duration:
              .01ms !important;

            animation-duration:
              .01ms !important;

            animation-iteration-count:
              1 !important;

            scroll-behavior:
              auto !important;
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
        style="all:initial;"
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
                  class="pcsu-pt-header-accent"
                  aria-hidden="true"
                ></span>

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
                  class="pcsu-pt-header-accent"
                  aria-hidden="true"
                ></span>

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
                  class="pcsu-pt-header-accent"
                  aria-hidden="true"
                ></span>

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
                  class="pcsu-pt-header-accent"
                  aria-hidden="true"
                ></span>

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
                  class="pcsu-pt-header-accent"
                  aria-hidden="true"
                ></span>

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
