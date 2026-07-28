/* ============================================================
  PCSUnited • Ask Amy Sidebar Dock + Overview Video
  Standalone Public JavaScript

  FILE
  public/ask-amy/ask-amy-sidebar.js

  PURPOSE
  - Injects the Ask Amy sidebar into a Webflow mount element
  - Opens the existing Ask Amy HUD
  - Displays an optional page-overview video
  - Synchronizes its active appearance with the HUD
  - Does not call OpenAI or the backend directly

  REQUIRED MOUNT
  #pcsu-ask-amy-sidebar-widget

  HUD COMPATIBILITY
  #pcsu-amy-hud[data-open]
  [data-pcsu-open-amy="1"]
=============================================================== */

(() => {
  "use strict";

  /* ============================================================
    1. SINGLE-LOAD GUARD
  ============================================================ */

  if (window.__PCSU_ASK_AMY_SIDEBAR_LOADED) return;
  window.__PCSU_ASK_AMY_SIDEBAR_LOADED = true;

  const MOUNT_ID = "pcsu-ask-amy-sidebar-widget";
  const SIDEBAR_ID = "pcsu-ask-amy-sidebar";
  const STYLE_ID = "pcsu-ask-amy-sidebar-styles";

  const mount = document.getElementById(MOUNT_ID);

  if (!mount) {
    console.warn(
      `PCSUnited Ask Amy sidebar mount #${MOUNT_ID} was not found.`
    );
    return;
  }

  if (document.getElementById(SIDEBAR_ID)) return;

  /* ============================================================
    2. CONFIGURATION FROM WEBFLOW DATA ATTRIBUTES
  ============================================================ */

  const videoUrl = String(
    mount.dataset.videoUrl ||
    mount.dataset.video ||
    ""
  ).trim();

  const videoTitle = String(
    mount.dataset.videoTitle ||
    "PCSUnited — Page Overview"
  ).trim();

  /* ============================================================
    3. STYLES
  ============================================================ */

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      #${SIDEBAR_ID},
      #${SIDEBAR_ID} * {
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

      #${SIDEBAR_ID} {
        --pcsu-bg: #14100f;
        --pcsu-bg2: #1b1715;
        --pcsu-line: rgba(235, 186, 82, 0.34);
        --pcsu-line-soft: rgba(255, 255, 255, 0.10);
        --pcsu-gold: #e7b553;
        --pcsu-gold2: #f4d58a;
        --pcsu-ink: #f4efe4;
        --pcsu-muted: rgba(244, 239, 228, 0.62);
        --pcsu-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);

        display: block;
        width: 100%;
      }

      #${SIDEBAR_ID} .pcsu-amy-dock {
        width: 100%;
        padding: 0 18px;
        margin: 0 auto;
      }

      /* ========================================================
        OVERVIEW VIDEO PANEL
      ======================================================== */

      #${SIDEBAR_ID} #pcsu-amy-video-wrap {
        position: relative;
        width: 100%;
        max-width: 100%;
        height: 0;
        margin-bottom: 0;
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
        border-radius: 10px;
        background: rgba(8, 8, 10, 0.92);
        border: 1px solid transparent;
        box-shadow: none;
        transform: translateY(10px);

        transition:
          opacity 0.35s ease,
          transform 0.35s ease,
          height 0.35s ease,
          margin-bottom 0.35s ease,
          border-color 0.35s ease,
          box-shadow 0.35s ease;
      }

      #${SIDEBAR_ID} #pcsu-amy-video-wrap[data-open="1"] {
        height: 360px;
        margin-bottom: 12px;
        opacity: 1;
        pointer-events: auto;
        border-color: var(--pcsu-line);
        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55);
        transform: translateY(0);
      }

      #${SIDEBAR_ID} .pcsu-amy-video-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        height: 38px;
        padding: 0.55rem 0.75rem;
        background: rgba(0, 0, 0, 0.22);
        border-bottom: 1px solid var(--pcsu-line-soft);
      }

      #${SIDEBAR_ID} .pcsu-amy-video-title {
        min-width: 0;
        color: var(--pcsu-muted);
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #${SIDEBAR_ID} #pcsu-amy-video-close {
        appearance: none;
        flex: 0 0 auto;
        border: 1px solid var(--pcsu-line-soft);
        background: rgba(255, 255, 255, 0.06);
        color: var(--pcsu-ink);
        font-size: 0.8rem;
        line-height: 1;
        padding: 0.35rem 0.55rem;
        border-radius: 4px;
        cursor: pointer;

        transition:
          background 0.16s ease,
          border-color 0.16s ease;
      }

      #${SIDEBAR_ID} #pcsu-amy-video-close:hover {
        background: rgba(231, 181, 83, 0.14);
        border-color: var(--pcsu-line);
      }

      #${SIDEBAR_ID} #pcsu-amy-video-close:focus-visible,
      #${SIDEBAR_ID} .pcsu-amy-video-btn:focus-visible,
      #${SIDEBAR_ID} .pcsu-amy-card:focus-visible {
        outline: 2px solid rgba(244, 213, 138, 0.88);
        outline-offset: 3px;
      }

      #${SIDEBAR_ID} #pcsu-amy-video {
        display: block;
        width: 100%;
        height: calc(100% - 38px);
        object-fit: cover;
        background: #000;
      }

      /* ========================================================
        ASK AMY FRONT PANEL
      ======================================================== */

      #${SIDEBAR_ID} .pcsu-amy-card {
        width: 100%;
        min-height: 54px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 9px 11px;
        border-radius: 2px;
        border-top: 1px solid var(--pcsu-line-soft);
        border-right: 0;
        border-bottom: 1px solid var(--pcsu-line-soft);
        border-left: 0;
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.035),
            rgba(0, 0, 0, 0.08)
          ),
          var(--pcsu-bg2);
        cursor: pointer;
        user-select: none;

        transition:
          background 0.16s ease,
          border-color 0.16s ease,
          transform 0.16s ease,
          box-shadow 0.16s ease;
      }

      #${SIDEBAR_ID} .pcsu-amy-card:hover {
        background:
          linear-gradient(
            180deg,
            rgba(231, 181, 83, 0.16),
            rgba(231, 181, 83, 0.08)
          ),
          var(--pcsu-bg2);
        border-top-color: var(--pcsu-line);
        border-bottom-color: var(--pcsu-line);
        transform: translateY(-1px);
      }

      /* HUD OPEN STATE */

      #${SIDEBAR_ID}[data-active="1"] .pcsu-amy-card {
        background:
          linear-gradient(
            180deg,
            rgba(231, 181, 83, 0.25),
            rgba(231, 181, 83, 0.11)
          ),
          var(--pcsu-bg2);
        border-top-color: rgba(231, 181, 83, 0.70);
        border-bottom-color: rgba(231, 181, 83, 0.70);
        box-shadow:
          0 0 0 1px rgba(231, 181, 83, 0.22),
          0 0 20px rgba(231, 181, 83, 0.16),
          0 12px 28px rgba(0, 0, 0, 0.42);
      }

      #${SIDEBAR_ID}[data-active="1"] .pcsu-amy-avatar {
        border-color: rgba(244, 213, 138, 0.86);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.35),
          0 0 16px rgba(231, 181, 83, 0.28);
      }

      #${SIDEBAR_ID}[data-active="1"] .pcsu-amy-mark {
        background: var(--pcsu-gold2);
        box-shadow:
          0 0 10px rgba(231, 181, 83, 0.80),
          0 0 20px rgba(231, 181, 83, 0.35);
      }

      #${SIDEBAR_ID} .pcsu-amy-avatar {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        flex: 0 0 auto;
        background-image:
          url("https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/6a3334f99ed5987c434df57f_Face.jpg");
        background-size: cover;
        background-position: center;
        border: 1px solid rgba(231, 181, 83, 0.55);
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
        filter: saturate(0.9) contrast(1.02);

        transition:
          border-color 0.16s ease,
          box-shadow 0.16s ease;
      }

      #${SIDEBAR_ID} .pcsu-amy-copy {
        min-width: 0;
        flex: 1;
      }

      #${SIDEBAR_ID} .pcsu-amy-title {
        color: var(--pcsu-ink);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #${SIDEBAR_ID} .pcsu-amy-sub {
        margin-top: 5px;
        color: var(--pcsu-muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #${SIDEBAR_ID} .pcsu-amy-actions {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
      }

      #${SIDEBAR_ID} .pcsu-amy-video-btn {
        appearance: none;
        border: 1px solid rgba(231, 181, 83, 0.42);
        background: rgba(231, 181, 83, 0.10);
        color: var(--pcsu-gold2);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 7px 8px;
        border-radius: 3px;
        cursor: pointer;
        white-space: nowrap;

        transition:
          background 0.16s ease,
          border-color 0.16s ease;
      }

      #${SIDEBAR_ID} .pcsu-amy-video-btn:hover {
        background: rgba(231, 181, 83, 0.18);
        border-color: rgba(231, 181, 83, 0.68);
      }

      #${SIDEBAR_ID} .pcsu-amy-video-btn[hidden] {
        display: none !important;
      }

      #${SIDEBAR_ID} .pcsu-amy-mark {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        flex: 0 0 auto;
        background: var(--pcsu-gold);
        box-shadow: 0 0 10px rgba(231, 181, 83, 0.55);

        transition:
          background 0.16s ease,
          box-shadow 0.16s ease;
      }

      @media (max-width: 480px) {
        #${SIDEBAR_ID} .pcsu-amy-dock {
          padding: 0 12px;
        }

        #${SIDEBAR_ID} #pcsu-amy-video-wrap[data-open="1"] {
          height: 320px;
        }

        #${SIDEBAR_ID} .pcsu-amy-card {
          min-height: 50px;
          padding: 8px 10px;
        }

        #${SIDEBAR_ID} .pcsu-amy-avatar {
          width: 31px;
          height: 31px;
        }

        #${SIDEBAR_ID} .pcsu-amy-title {
          font-size: 11px;
        }

        #${SIDEBAR_ID} .pcsu-amy-sub {
          font-size: 9.5px;
        }

        #${SIDEBAR_ID} .pcsu-amy-video-btn {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${SIDEBAR_ID},
        #${SIDEBAR_ID} * {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ============================================================
    4. INTERFACE MARKUP
  ============================================================ */

  mount.innerHTML = `
    <div
      id="${SIDEBAR_ID}"
      data-active="0"
      style="all: initial;"
    >
      <div class="pcsu-amy-dock">

        <div
          id="pcsu-amy-video-wrap"
          data-open="0"
          aria-hidden="true"
        >
          <div class="pcsu-amy-video-head">
            <div class="pcsu-amy-video-title"></div>

            <button
              id="pcsu-amy-video-close"
              type="button"
              aria-label="Close overview video"
            >
              ✕
            </button>
          </div>

          <video
            id="pcsu-amy-video"
            playsinline
            controls
            preload="metadata"
          ></video>
        </div>

        <div
          class="pcsu-amy-card"
          role="button"
          tabindex="0"
          aria-label="Open Ask Amy"
          aria-expanded="false"
          data-pcsu-open-amy="1"
        >
          <div
            class="pcsu-amy-avatar"
            aria-hidden="true"
          ></div>

          <div class="pcsu-amy-copy">
            <div class="pcsu-amy-title">
              Ask Amy
            </div>

            <div class="pcsu-amy-sub">
              The Wing calculates, Amy explains
            </div>
          </div>

          <div class="pcsu-amy-actions">
            <button
              class="pcsu-amy-video-btn"
              id="pcsu-amy-video-btn"
              type="button"
              aria-label="Play PCSUnited page overview video"
            >
              Video
            </button>

            <div
              class="pcsu-amy-mark"
              aria-hidden="true"
            ></div>
          </div>
        </div>

      </div>
    </div>
  `;

  /* ============================================================
    5. ELEMENT REFERENCES
  ============================================================ */

  const sidebar = document.getElementById(SIDEBAR_ID);
  const card = sidebar?.querySelector(".pcsu-amy-card");
  const videoWrap = document.getElementById("pcsu-amy-video-wrap");
  const video = document.getElementById("pcsu-amy-video");
  const videoBtn = document.getElementById("pcsu-amy-video-btn");
  const videoClose = document.getElementById("pcsu-amy-video-close");
  const videoTitleElement = sidebar?.querySelector(
    ".pcsu-amy-video-title"
  );

  if (!sidebar || !card) return;

  if (videoTitleElement) {
    videoTitleElement.textContent = videoTitle;
  }

  /* ============================================================
    6. VIDEO CONFIGURATION
  ============================================================ */

  if (video && videoUrl) {
    video.src = videoUrl;
    video.load();
  } else if (videoBtn) {
    videoBtn.hidden = true;
    videoBtn.setAttribute("aria-hidden", "true");
  }

  function openVideo() {
    if (!videoWrap || !video || !videoUrl) return;

    videoWrap.setAttribute("data-open", "1");
    videoWrap.setAttribute("aria-hidden", "false");

    try {
      const playPromise = video.play();

      if (
        playPromise &&
        typeof playPromise.catch === "function"
      ) {
        playPromise.catch(() => {
          // Browser may require the user to press play manually.
        });
      }
    } catch (_) {
      // Fail quietly. Native controls remain available.
    }
  }

  function closeVideo() {
    if (!videoWrap || !video) return;

    try {
      video.pause();
    } catch (_) {
      // Do nothing.
    }

    videoWrap.setAttribute("data-open", "0");
    videoWrap.setAttribute("aria-hidden", "true");
  }

  /* ============================================================
    7. HUD ACTIVE-STATE SYNCHRONIZATION
  ============================================================ */

  let hudAttributeObserver = null;
  let hudDiscoveryObserver = null;

  function syncAmyActiveState(hudElement) {
    const hud =
      hudElement ||
      document.getElementById("pcsu-amy-hud");

    const isOpen =
      Boolean(hud) &&
      hud.getAttribute("data-open") === "1";

    sidebar.setAttribute(
      "data-active",
      isOpen ? "1" : "0"
    );

    card.setAttribute(
      "aria-expanded",
      isOpen ? "true" : "false"
    );
  }

  function bindToHud() {
    const hud = document.getElementById("pcsu-amy-hud");

    if (!hud) {
      syncAmyActiveState(null);
      return false;
    }

    if (hudAttributeObserver) {
      hudAttributeObserver.disconnect();
    }

    syncAmyActiveState(hud);

    hudAttributeObserver = new MutationObserver(() => {
      syncAmyActiveState(hud);
    });

    hudAttributeObserver.observe(hud, {
      attributes: true,
      attributeFilter: ["data-open"]
    });

    return true;
  }

  if (!bindToHud()) {
    hudDiscoveryObserver = new MutationObserver(() => {
      if (!bindToHud()) return;

      hudDiscoveryObserver.disconnect();
      hudDiscoveryObserver = null;
    });

    hudDiscoveryObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /* ============================================================
    8. EVENT LISTENERS
  ============================================================ */

  if (videoBtn) {
    videoBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openVideo();
    });
  }

  if (videoClose) {
    videoClose.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeVideo();
    });
  }

  if (video) {
    video.addEventListener("ended", closeVideo);
  }

  card.addEventListener("keydown", (event) => {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    event.preventDefault();
    card.click();
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      videoWrap?.getAttribute("data-open") === "1"
    ) {
      closeVideo();
    }
  });

  /* ============================================================
    9. READY EVENT
  ============================================================ */

  window.dispatchEvent(
    new CustomEvent("pcsunited:ask-amy-sidebar-ready", {
      detail: {
        mount,
        sidebar,
        hasVideo: Boolean(videoUrl)
      }
    })
  );
})();
