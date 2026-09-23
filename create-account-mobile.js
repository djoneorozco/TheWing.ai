/* ============================================================
   THEWING.AI — CREATE ACCOUNT MOBILE
   External Webflow Component
   File: /public/create-account-mobile.js

   Webflow only needs:
   <div id="thewing-create-account"></div>
   <script src="https://thewing.netlify.app/create-account-mobile.js"></script>
============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     CONFIG
  ========================================================== */

  const CONFIG = {
    mountId: "thewing-create-account",

    image:
      "https://cdn.prod.website-files.com/6a6ff0545aa01c93602db711/6a8d915fa65ab682dafc84a3_e130fd7ed0166aa534b699ae2243f681_Create%20Account%20TheWing.ai.jpg",

    accountUrl:
      "https://the-wing.webflow.io/military/new-user-account"
  };


  /* ==========================================================
     INITIALIZE
  ========================================================== */

  function initTheWingCreateAccount() {

    const mount = document.getElementById(CONFIG.mountId);

    if (!mount) {
      console.warn(
        "[TheWing.ai] Create Account mount not found:",
        CONFIG.mountId
      );
      return;
    }

    /*
      Prevent duplicate rendering if Webflow somehow loads
      this script more than once.
    */

    if (mount.dataset.twcaLoaded === "true") {
      return;
    }

    mount.dataset.twcaLoaded = "true";

    /* ========================================================
       HTML
    ======================================================== */

    mount.innerHTML = `

      <div class="twca-component">

        <div
          class="twca-stage"
          role="region"
          aria-label="Create a TheWing.ai account"
        >

          <!-- REAL IMAGE -->
          <img
            class="twca-image"
            src="${CONFIG.image}"
            alt=""
            loading="eager"
            decoding="async"
          >

          <!-- STATIC IMAGE SHADE -->
          <div
            class="twca-stage-shade"
            aria-hidden="true"
          ></div>

          <!-- HUD POSITIONING -->
          <div class="twca-inner">

            <div class="twca-panel">

              <!-- GOLD HUD CORNERS -->

              <div
                class="twca-corner twca-corner-top"
                aria-hidden="true"
              ></div>

              <div
                class="twca-corner twca-corner-bottom"
                aria-hidden="true"
              ></div>

              <!-- CONTENT -->

              <div class="twca-content">

                <!-- HEADER -->

                <div class="twca-header">

                  <div class="twca-brand">
                    THEWING.AI
                  </div>

                  <div class="twca-status">

                    <span
                      class="twca-status-dot"
                      aria-hidden="true"
                    ></span>

                    <span>
                      SECURE
                    </span>

                  </div>

                </div>


                <!-- INFORMATION -->

                <div class="twca-information">

                  <div class="twca-eyebrow">
                    PERSONALIZED INTELLIGENCE
                  </div>

                  <div
                    class="twca-title"
                    role="heading"
                    aria-level="2"
                  >

                    <span class="twca-title-line">
                      CREATE AN
                    </span>

                    <span class="twca-title-line">
                      ACCOUNT
                    </span>

                  </div>

                  <div class="twca-description">
                    Unlock personalized military decision intelligence built around you.
                  </div>


                  <!-- CTA -->

                  <a
                    class="twca-cta"
                    href="${CONFIG.accountUrl}"
                    aria-label="Create your TheWing.ai account"
                  >

                    <!-- ANIMATED GOLD LIGHT -->
                    <span
                      class="twca-cta-light"
                      aria-hidden="true"
                    ></span>

                    <!-- SUBTLE SECONDARY GLOW -->
                    <span
                      class="twca-cta-glow"
                      aria-hidden="true"
                    ></span>

                    <span class="twca-cta-text">
                      Get Started
                    </span>

                    <span
                      class="twca-cta-arrow"
                      aria-hidden="true"
                    >
                      →
                    </span>

                  </a>

                </div>


                <!-- FLEX SPACE -->

                <div
                  class="twca-flex-space"
                  aria-hidden="true"
                ></div>


                <!-- TRUST STRIP -->

                <div
                  class="twca-trust"
                  aria-label="TheWing.ai account benefits"
                >

                  <div class="twca-trust-item">

                    <div
                      class="twca-trust-icon"
                      aria-hidden="true"
                    >
                      ◇
                    </div>

                    <div class="twca-trust-label">
                      PRIVATE
                    </div>

                  </div>


                  <div class="twca-trust-item">

                    <div
                      class="twca-trust-icon"
                      aria-hidden="true"
                    >
                      ◎
                    </div>

                    <div class="twca-trust-label">
                      SECURE
                    </div>

                  </div>


                  <div class="twca-trust-item">

                    <div
                      class="twca-trust-icon"
                      aria-hidden="true"
                    >
                      ✦
                    </div>

                    <div class="twca-trust-label">
                      MISSION<br>
                      FOCUSED
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    `;


    /* ========================================================
       CSS
    ======================================================== */

    const style = document.createElement("style");

    style.id = "twca-external-styles";

    style.textContent = `

      /* ======================================================
         COMPONENT RESET
      ====================================================== */

      #${CONFIG.mountId} {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;

        margin: 0 !important;
        padding: 0 !important;

        overflow: visible !important;

        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }


      #${CONFIG.mountId},
      #${CONFIG.mountId} *,
      #${CONFIG.mountId} *::before,
      #${CONFIG.mountId} *::after {
        box-sizing: border-box;
      }


      .twca-component {
        --twca-gold: #d7a85e;
        --twca-gold-bright: #f2cc86;

        display: block;

        width: 100%;
        max-width: 100%;

        margin: 0;
        padding: 0;

        color: #ffffff;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Arial,
          Helvetica,
          sans-serif;

        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;

        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }


      /* ======================================================
         STAGE
      ====================================================== */

      .twca-stage {
        position: relative;

        display: block;

        width: 100%;
        height: 520px;

        margin: 0;
        padding: 0;

        overflow: hidden;

        border-radius: 18px;

        background: #07101c;

        box-shadow:
          0 22px 60px rgba(0, 0, 0, 0.32),
          0 5px 18px rgba(0, 0, 0, 0.22);

        isolation: isolate;
      }


      /* ======================================================
         REAL IMAGE

         Deliberately uses IMG instead of CSS background.
         This is more predictable on physical iPhones.
      ====================================================== */

      .twca-image {
        position: absolute;

        z-index: 0;

        top: 0;
        left: 0;

        display: block;

        width: 100%;
        height: 100%;

        max-width: none;

        margin: 0;
        padding: 0;

        border: 0;

        object-fit: cover;
        object-position: 57% center;

        opacity: 1;
      }


      /* ======================================================
         STATIC IMAGE SHADE
      ====================================================== */

      .twca-stage-shade {
        position: absolute;

        z-index: 1;

        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        pointer-events: none;

        background:

          linear-gradient(
            90deg,
            rgba(3, 7, 13, 0.34) 0%,
            rgba(3, 7, 13, 0.21) 43%,
            rgba(3, 7, 13, 0.04) 73%,
            rgba(3, 7, 13, 0) 100%
          ),

          linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.02) 0%,
            rgba(0, 0, 0, 0) 70%,
            rgba(0, 0, 0, 0.18) 100%
          );
      }


      /* ======================================================
         HUD POSITIONING
      ====================================================== */

      .twca-inner {
        position: absolute;

        z-index: 2;

        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        display: flex;

        align-items: center;

        width: 100%;
        height: 100%;

        margin: 0;

        padding: 18px;
      }


      /* ======================================================
         HUD PANEL
      ====================================================== */

      .twca-panel {
        position: relative;

        display: flex;

        flex-direction: column;

        width: 58%;
        height: 480px;

        min-width: 0;

        margin: 0;

        padding:
          20px
          14px
          18px;

        overflow: hidden;

        border:
          1px solid
          rgba(255, 255, 255, 0.25);

        border-radius: 18px;

        background:

          radial-gradient(
            120% 90% at 0% 0%,
            rgba(110, 124, 148, 0.30) 0%,
            rgba(66, 78, 98, 0.14) 34%,
            transparent 62%
          ),

          radial-gradient(
            100% 85% at 100% 100%,
            rgba(36, 77, 126, 0.12) 0%,
            transparent 68%
          ),

          linear-gradient(
            145deg,
            rgba(38, 45, 57, 0.96) 0%,
            rgba(18, 27, 41, 0.97) 52%,
            rgba(7, 17, 31, 0.98) 100%
          );

        box-shadow:
          0 24px 55px rgba(0, 0, 0, 0.30),
          0 7px 22px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.22),
          inset 1px 0 0 rgba(255, 255, 255, 0.05),
          inset -1px 0 0 rgba(255, 255, 255, 0.03),
          inset 0 -1px 0 rgba(255, 255, 255, 0.04);
      }


      /* ======================================================
         GOLD HUD CORNERS
      ====================================================== */

      .twca-corner {
        position: absolute;

        z-index: 1;

        pointer-events: none;
      }


      .twca-corner-top {
        top: 18px;
        left: 20px;

        width: 115px;
        height: 105px;

        border-top:
          2px solid
          var(--twca-gold);

        border-left:
          2px solid
          var(--twca-gold);
      }


      .twca-corner-bottom {
        right: 20px;
        bottom: 18px;

        width: 115px;
        height: 105px;

        border-right:
          2px solid
          var(--twca-gold);

        border-bottom:
          2px solid
          var(--twca-gold);
      }


      /* ======================================================
         HUD CONTENT
      ====================================================== */

      .twca-content {
        position: relative;

        z-index: 5;

        display: flex;

        flex-direction: column;

        flex: 1;

        width: 100%;
        height: 100%;

        min-width: 0;

        margin: 0;
        padding: 0;
      }


      /* ======================================================
         HEADER
      ====================================================== */

      .twca-header {
        display: flex;

        align-items: center;
        justify-content: space-between;

        width: 100%;

        min-width: 0;

        gap: 8px;

        margin:
          0 0 20px;

        padding:
          0 0 11px;

        border-bottom:
          1px solid
          rgba(255, 255, 255, 0.13);
      }


      .twca-brand {
        display: block;

        margin: 0;
        padding: 0;

        color: #edf0f5;

        font-family:
          Georgia,
          "Times New Roman",
          serif;

        font-size: 8px;

        line-height: 1;

        font-style: normal;

        font-weight: 700;

        letter-spacing: 0.14em;

        text-transform: uppercase;

        white-space: nowrap;
      }


      /* ======================================================
         SECURE STATUS
      ====================================================== */

      .twca-status {
        display: flex;

        align-items: center;

        flex: 0 0 auto;

        gap: 5px;

        margin: 0;
        padding: 0;

        color:
          var(--twca-gold-bright);

        font-size: 8px;

        line-height: 1;

        font-style: normal;

        font-weight: 800;

        letter-spacing: 0.08em;

        text-transform: uppercase;

        white-space: nowrap;
      }


      .twca-status-dot {
        display: block;

        flex: 0 0 auto;

        width: 5px;
        height: 5px;

        margin: 0;
        padding: 0;

        border-radius: 50%;

        background:
          var(--twca-gold-bright);

        box-shadow:
          0 0 8px rgba(242, 204, 134, 0.45);

        animation:
          twcaSecurePulse
          2s
          ease-in-out
          infinite;
      }


      @keyframes twcaSecurePulse {

        0%,
        100% {
          opacity: 0.38;
        }

        50% {
          opacity: 1;
        }

      }


      /* ======================================================
         INFORMATION
      ====================================================== */

      .twca-information {
        display: block;

        width: 100%;

        min-width: 0;

        margin: 0;
        padding: 0;
      }


      .twca-eyebrow {
        display: block;

        width: 100%;

        margin:
          0 0 6px;

        padding: 0;

        color:
          var(--twca-gold-bright);

        font-family:
          Arial,
          Helvetica,
          sans-serif;

        font-size: 11px;

        line-height: 1.05;

        font-style: normal;

        font-weight: 800;

        letter-spacing: 0.07em;

        text-transform: uppercase;
      }


      /* ======================================================
         TITLE
      ====================================================== */

      .twca-title {
        display: block;

        width: 100%;

        margin: 0;
        padding: 0;

        color: #ffffff;

        font-family:
          Impact,
          "Arial Narrow",
          Arial,
          Helvetica,
          sans-serif;

        font-size:
          clamp(26px, 8vw, 35px);

        line-height: 0.92;

        font-style: normal;

        font-weight: 700;

        letter-spacing: -0.01em;

        text-align: left;

        text-transform: uppercase;

        white-space: normal;
      }


      .twca-title-line {
        display: block;

        margin: 0;
        padding: 0;
      }


      /* ======================================================
         DESCRIPTION
      ====================================================== */

      .twca-description {
        display: block;

        width: 100%;

        margin:
          12px 0 0;

        padding: 0;

        color: #e0e4eb;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Arial,
          Helvetica,
          sans-serif;

        font-size: 10px;

        line-height: 1.5;

        font-style: normal;

        font-weight: 500;

        letter-spacing: normal;

        text-align: left;

        text-transform: none;

        white-space: normal;
      }


      /* ======================================================
         GET STARTED BUTTON
      ====================================================== */

      .twca-cta {
        position: relative;

        display: flex;

        align-items: center;
        justify-content: space-between;

        width: 100%;

        min-height: 44px;

        margin:
          20px 0 0;

        padding:
          0 13px;

        overflow: hidden;

        border:
          1px solid
          rgba(215, 168, 94, 0.70);

        border-radius: 9px;

        outline: none;

        color:
          var(--twca-gold-bright);

        background:
          linear-gradient(
            180deg,
            #172231 0%,
            #091321 100%
          );

        box-shadow:
          inset 0 1px 0
          rgba(255, 255, 255, 0.10),

          0 5px 14px
          rgba(0, 0, 0, 0.27),

          0 0 0
          rgba(215, 168, 94, 0);

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Arial,
          sans-serif;

        font-size: 11px;

        line-height: 1;

        font-style: normal;

        font-weight: 800;

        letter-spacing: 0.02em;

        text-align: left;

        text-decoration: none;

        -webkit-tap-highlight-color:
          transparent;

        touch-action:
          manipulation;

        animation:
          twcaButtonBreath
          4.2s
          ease-in-out
          infinite;
      }


      /* ======================================================
         BUTTON GOLD SWEEP

         THIS IS THE MAIN ANIMATION.
      ====================================================== */

      .twca-cta-light {
        position: absolute;

        z-index: 1;

        top: 0;
        bottom: 0;

        left: -45%;

        width: 28%;

        pointer-events: none;

        background:
          linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 224, 165, 0.05) 15%,
            rgba(255, 224, 165, 0.18) 32%,
            rgba(255, 224, 165, 0.68) 50%,
            rgba(255, 224, 165, 0.18) 68%,
            rgba(255, 224, 165, 0.05) 85%,
            transparent 100%
          );

        animation:
          twcaButtonSweep
          4.2s
          ease-in-out
          infinite;
      }


      @keyframes twcaButtonSweep {

        0% {
          left: -45%;
          opacity: 0;
        }

        14% {
          left: -45%;
          opacity: 0;
        }

        23% {
          opacity: 0.9;
        }

        48% {
          left: 120%;
          opacity: 0.9;
        }

        58% {
          left: 120%;
          opacity: 0;
        }

        100% {
          left: 120%;
          opacity: 0;
        }

      }


      /* ======================================================
         BUTTON AMBIENT GLOW
      ====================================================== */

      .twca-cta-glow {
        position: absolute;

        z-index: 0;

        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        pointer-events: none;

        border-radius: inherit;

        box-shadow:
          inset 0 0 15px
          rgba(242, 204, 134, 0);

        animation:
          twcaInnerGlow
          4.2s
          ease-in-out
          infinite;
      }


      @keyframes twcaInnerGlow {

        0%,
        100% {
          box-shadow:
            inset 0 0 15px
            rgba(242, 204, 134, 0);
        }

        38% {
          box-shadow:
            inset 0 0 18px
            rgba(242, 204, 134, 0.10);
        }

        55% {
          box-shadow:
            inset 0 0 15px
            rgba(242, 204, 134, 0);
        }

      }


      @keyframes twcaButtonBreath {

        0%,
        100% {
          border-color:
            rgba(215, 168, 94, 0.62);

          box-shadow:
            inset 0 1px 0
            rgba(255, 255, 255, 0.10),

            0 5px 14px
            rgba(0, 0, 0, 0.27),

            0 0 0
            rgba(215, 168, 94, 0);
        }

        42% {
          border-color:
            rgba(242, 204, 134, 0.88);

          box-shadow:
            inset 0 1px 0
            rgba(255, 255, 255, 0.13),

            0 5px 14px
            rgba(0, 0, 0, 0.27),

            0 0 12px
            rgba(215, 168, 94, 0.12);
        }

      }


      .twca-cta-text {
        position: relative;

        z-index: 3;

        display: block;

        margin: 0;
        padding: 0;

        color:
          var(--twca-gold-bright);
      }


      .twca-cta-arrow {
        position: relative;

        z-index: 3;

        display: block;

        margin: 0;
        padding: 0;

        color:
          var(--twca-gold-bright);

        font-size: 19px;

        line-height: 1;

        animation:
          twcaArrowMove
          4.2s
          ease-in-out
          infinite;
      }


      @keyframes twcaArrowMove {

        0%,
        28%,
        100% {
          transform: translateX(0);
        }

        42% {
          transform: translateX(4px);
        }

        52% {
          transform: translateX(0);
        }

      }


      .twca-cta:active {
        border-color:
          var(--twca-gold-bright);

        background:
          linear-gradient(
            180deg,
            #223248 0%,
            #0d1b2c 100%
          );
      }


      /* ======================================================
         FLEX SPACE
      ====================================================== */

      .twca-flex-space {
        display: block;

        flex: 1;

        min-height: 20px;
      }


      /* ======================================================
         TRUST STRIP
      ====================================================== */

      .twca-trust {
        display: grid;

        grid-template-columns:
          repeat(3, minmax(0, 1fr));

        width: 100%;

        margin: 0;

        padding:
          14px 0 0;

        border-top:
          1px solid
          rgba(255, 255, 255, 0.10);
      }


      .twca-trust-item {
        display: flex;

        flex-direction: column;

        align-items: center;
        justify-content: center;

        min-width: 0;

        min-height: 46px;

        gap: 5px;

        margin: 0;
        padding: 0;

        color: #d5dae2;

        text-align: center;
      }


      .twca-trust-item +
      .twca-trust-item {
        border-left:
          1px solid
          rgba(255, 255, 255, 0.10);
      }


      .twca-trust-icon {
        display: block;

        margin: 0;
        padding: 0;

        color:
          var(--twca-gold-bright);

        font-size: 15px;

        line-height: 1;
      }


      .twca-trust-label {
        display: block;

        margin: 0;
        padding: 0;

        color: #d9dde4;

        font-family:
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Arial,
          sans-serif;

        font-size: 6px;

        line-height: 1.2;

        font-style: normal;

        font-weight: 800;

        letter-spacing: 0.04em;

        text-align: center;

        text-transform: uppercase;
      }


      /* ======================================================
         PHYSICAL iPHONE / MOBILE
      ====================================================== */

      @media screen and (max-width: 600px) {

        .twca-stage {
          height: 520px;

          border-radius: 17px;
        }


        .twca-image {
          object-position:
            57% center;
        }


        .twca-inner {
          padding: 18px;
        }


        .twca-panel {
          width: 58%;
          height: 480px;

          padding:
            20px
            14px
            18px;

          border-radius: 18px;
        }


        .twca-header {
          margin-bottom: 20px;
        }


        .twca-brand {
          font-size: 8px;
        }


        .twca-status {
          font-size: 8px;
        }


        .twca-eyebrow {
          font-size: 11px;
        }


        .twca-title {
          font-size:
            clamp(26px, 8vw, 35px);
        }


        .twca-description {
          font-size: 10px;
        }


        .twca-cta {
          min-height: 44px;

          margin-top: 20px;

          font-size: 11px;
        }


        .twca-trust-label {
          font-size: 6px;
        }

      }


      /* ======================================================
         SMALL iPHONE
      ====================================================== */

      @media screen and (max-width: 390px) {

        .twca-stage {
          height: 500px;
        }


        .twca-image {
          object-position:
            57% center;
        }


        .twca-inner {
          padding: 12px;
        }


        .twca-panel {
          width: 62%;
          height: 465px;

          padding:
            17px
            11px
            15px;

          border-radius: 17px;
        }


        .twca-header {
          margin-bottom: 17px;
        }


        .twca-brand {
          font-size: 7px;
        }


        .twca-status {
          font-size: 7px;
        }


        .twca-eyebrow {
          font-size: 9px;
        }


        .twca-title {
          font-size: 27px;
        }


        .twca-description {
          font-size: 9px;
        }


        .twca-cta {
          min-height: 40px;

          margin-top: 16px;

          font-size: 10px;
        }


        .twca-trust-label {
          font-size: 5.5px;
        }

      }


      /* ======================================================
         TABLET / DESKTOP
      ====================================================== */

      @media screen and (min-width: 601px) {

        .twca-panel {
          width: 48%;

          max-width: 380px;

          height: 480px;

          padding:
            22px
            20px
            20px;
        }


        .twca-brand {
          font-size: 10px;
        }


        .twca-status {
          font-size: 10px;
        }


        .twca-eyebrow {
          font-size: 13px;
        }


        .twca-title {
          font-size: 40px;
        }


        .twca-description {
          font-size: 12px;
        }


        .twca-cta {
          min-height: 46px;

          font-size: 13px;
        }


        .twca-trust-label {
          font-size: 7px;
        }

      }


      /* ======================================================
         ACCESSIBILITY
      ====================================================== */

      @media (prefers-reduced-motion: reduce) {

        .twca-status-dot,
        .twca-cta,
        .twca-cta-light,
        .twca-cta-glow,
        .twca-cta-arrow {
          animation: none !important;
        }

      }

    `;


    /*
      Only install CSS once.
    */

    if (!document.getElementById(style.id)) {
      document.head.appendChild(style);
    }

  }


  /* ==========================================================
     RUN

     Handles both normal page load and a script loaded after
     the DOM is already available.
  ========================================================== */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      initTheWingCreateAccount,
      { once: true }
    );

  } else {

    initTheWingCreateAccount();

  }

})();
