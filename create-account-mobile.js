/* ============================================================
   THEWING.AI — CREATE ACCOUNT MOBILE
   CLEAN ISOLATED BUILD
   File: /create-account-mobile.js

   Purpose:
   - Render Create Account promo inside an isolated iframe
   - Prevent Webflow CSS from interfering
   - Optimized for real iPhone Safari
   - Keep animated premium HUD
============================================================ */

(function () {
  "use strict";

  const MOUNT_ID = "thewing-create-account";

  const IMAGE_URL =
    "https://cdn.prod.website-files.com/6a6ff0545aa01c93602db711/6a8d915fa65ab682dafc84a3_e130fd7ed0166aa534b699ae2243f681_Create%20Account%20TheWing.ai.jpg";

  const ACCOUNT_URL =
    "https://the-wing.webflow.io/military/new-user-account";


  /* ============================================================
     FIND MOUNT
  ============================================================ */

  function start() {

    const mount = document.getElementById(MOUNT_ID);

    if (!mount) {
      console.warn("[TheWing.ai] Create Account mount not found.");
      return;
    }

    if (mount.dataset.twLoaded === "1") {
      return;
    }

    mount.dataset.twLoaded = "1";


    /* ==========================================================
       RESET THE WEBFLOW MOUNT
    ========================================================== */

    mount.innerHTML = "";

    mount.style.setProperty("display", "block", "important");
    mount.style.setProperty("position", "relative", "important");
    mount.style.setProperty("width", "100%", "important");
    mount.style.setProperty("max-width", "100%", "important");
    mount.style.setProperty("height", "auto", "important");
    mount.style.setProperty("min-height", "0", "important");
    mount.style.setProperty("margin", "0", "important");
    mount.style.setProperty("padding", "0", "important");
    mount.style.setProperty("border", "0", "important");
    mount.style.setProperty("overflow", "hidden", "important");
    mount.style.setProperty("background", "transparent", "important");


    /* ==========================================================
       CREATE ISOLATED IFRAME

       This is intentional.

       Webflow CSS cannot reach inside this document.
    ========================================================== */

    const frame = document.createElement("iframe");

    frame.id = "tw-create-account-frame";

    frame.title = "Create a TheWing.ai account";

    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    );

    frame.setAttribute("scrolling", "no");

    frame.style.setProperty("display", "block", "important");
    frame.style.setProperty("width", "100%", "important");
    frame.style.setProperty("height", "540px", "important");
    frame.style.setProperty("max-width", "100%", "important");
    frame.style.setProperty("margin", "0", "important");
    frame.style.setProperty("padding", "0", "important");
    frame.style.setProperty("border", "0", "important");
    frame.style.setProperty("overflow", "hidden", "important");
    frame.style.setProperty("background", "transparent", "important");

    mount.appendChild(frame);


    /* ==========================================================
       IFRAME DOCUMENT
    ========================================================== */

    const doc = frame.contentDocument || frame.contentWindow.document;

    doc.open();

    doc.write(`<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
>

<style>

  /* ==========================================================
     HARD RESET
  ========================================================== */

  html,
  body {
    width: 100%;
    height: 100%;

    margin: 0;
    padding: 0;

    overflow: hidden;

    background: transparent;

    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }


  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }


  body {
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Arial,
      Helvetica,
      sans-serif;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }


  /* ==========================================================
     COMPONENT
  ========================================================== */

  #tw-app {
    --gold: #d8aa60;
    --gold-bright: #f4cf88;
    --navy: #081522;

    position: relative;

    width: 100%;
    height: 520px;

    overflow: hidden;

    border-radius: 18px;

    background: #08101a;

    isolation: isolate;
  }


  /* ==========================================================
     AMY IMAGE
  ========================================================== */

  .photo {
    position: absolute;

    z-index: 1;

    inset: 0;

    display: block;

    width: 100%;
    height: 100%;

    max-width: none;

    border: 0;

    object-fit: cover;

    /*
       Pushes image so Amy remains on right
       while HUD occupies left.
    */

    object-position: 55% center;

    user-select: none;

    -webkit-user-drag: none;
  }


  /* ==========================================================
     IMAGE GRADING
  ========================================================== */

  .shade {
    position: absolute;

    z-index: 2;

    inset: 0;

    pointer-events: none;

    background:
      linear-gradient(
        90deg,
        rgba(2, 7, 13, .42) 0%,
        rgba(2, 7, 13, .26) 34%,
        rgba(2, 7, 13, .08) 58%,
        rgba(2, 7, 13, 0) 78%
      ),
      linear-gradient(
        180deg,
        rgba(0, 0, 0, .02) 0%,
        rgba(0, 0, 0, 0) 70%,
        rgba(0, 0, 0, .18) 100%
      );
  }


  /* ==========================================================
     LAYOUT
  ========================================================== */

  .layout {
    position: absolute;

    z-index: 5;

    inset: 0;

    display: flex;

    align-items: center;

    width: 100%;
    height: 100%;

    padding: 16px;
  }


  /* ==========================================================
     HUD
  ========================================================== */

  .hud {
    position: relative;

    display: flex;

    flex-direction: column;

    width: 57%;
    height: 486px;

    min-width: 0;

    padding:
      21px
      15px
      17px;

    overflow: hidden;

    border:
      1px solid
      rgba(190, 204, 224, .35);

    border-radius: 20px;

    color: #fff;

    background:
      radial-gradient(
        120% 85% at 0% 0%,
        rgba(109, 126, 153, .32),
        transparent 57%
      ),
      linear-gradient(
        145deg,
        rgba(39, 48, 63, .97) 0%,
        rgba(17, 27, 42, .98) 48%,
        rgba(6, 17, 31, .99) 100%
      );

    box-shadow:
      0 22px 50px rgba(0, 0, 0, .38),
      inset 0 1px 0 rgba(255, 255, 255, .20),
      inset 1px 0 0 rgba(255, 255, 255, .06);

    transform: translateZ(0);

    -webkit-transform: translateZ(0);
  }


  /* ==========================================================
     GOLD CORNERS
  ========================================================== */

  .corner-top {
    position: absolute;

    z-index: 1;

    top: 18px;
    left: 20px;

    width: 116px;
    height: 106px;

    border-top:
      3px solid var(--gold);

    border-left:
      3px solid var(--gold);

    pointer-events: none;
  }


  .corner-bottom {
    position: absolute;

    z-index: 1;

    right: 20px;
    bottom: 18px;

    width: 116px;
    height: 106px;

    border-right:
      3px solid var(--gold);

    border-bottom:
      3px solid var(--gold);

    pointer-events: none;
  }


  /* ==========================================================
     CONTENT
  ========================================================== */

  .content {
    position: relative;

    z-index: 4;

    display: flex;

    flex: 1;

    flex-direction: column;

    width: 100%;
    height: 100%;

    min-width: 0;
  }


  /* ==========================================================
     HEADER
  ========================================================== */

  .header {
    display: flex;

    align-items: center;
    justify-content: space-between;

    gap: 7px;

    width: 100%;

    margin-bottom: 18px;

    padding-bottom: 11px;

    border-bottom:
      1px solid
      rgba(255, 255, 255, .13);
  }


  .brand {
    color: #f4f5f7;

    font-family:
      Georgia,
      "Times New Roman",
      serif;

    font-size: 8px;

    line-height: 1;

    font-weight: 700;

    letter-spacing: .14em;

    white-space: nowrap;
  }


  /* ==========================================================
     SECURE
  ========================================================== */

  .secure {
    display: flex;

    align-items: center;

    gap: 5px;

    color: var(--gold-bright);

    font-size: 8px;

    line-height: 1;

    font-weight: 800;

    letter-spacing: .08em;

    white-space: nowrap;
  }


  .secure-dot {
    width: 6px;
    height: 6px;

    flex: 0 0 auto;

    border-radius: 50%;

    background: var(--gold-bright);

    box-shadow:
      0 0 8px
      rgba(244, 207, 136, .55);

    animation:
      securePulse
      2s
      ease-in-out
      infinite;
  }


  @keyframes securePulse {

    0%,
    100% {
      opacity: .35;

      box-shadow:
        0 0 3px
        rgba(244, 207, 136, .2);
    }

    50% {
      opacity: 1;

      box-shadow:
        0 0 10px
        rgba(244, 207, 136, .8);
    }

  }


  /* ==========================================================
     EYEBROW
  ========================================================== */

  .eyebrow {
    margin-bottom: 5px;

    color: var(--gold-bright);

    font-size: 10px;

    line-height: 1.1;

    font-weight: 800;

    letter-spacing: .07em;

    text-transform: uppercase;
  }


  /* ==========================================================
     TITLE
  ========================================================== */

  .title {
    margin: 0;

    padding: 0;

    color: #fff;

    font-family:
      Impact,
      "Arial Narrow",
      Arial,
      sans-serif;

    font-size: 32px;

    line-height: .91;

    font-weight: 700;

    letter-spacing: -.02em;

    text-transform: uppercase;
  }


  .title span {
    display: block;
  }


  /* ==========================================================
     DESCRIPTION
  ========================================================== */

  .description {
    margin-top: 13px;

    color: rgba(241, 244, 248, .91);

    font-size: 10px;

    line-height: 1.45;

    font-weight: 500;
  }


  /* ==========================================================
     GET STARTED
  ========================================================== */

  .cta {
    position: relative;

    display: flex;

    align-items: center;
    justify-content: space-between;

    width: 100%;
    height: 46px;

    margin-top: 19px;

    padding:
      0 14px;

    overflow: hidden;

    border:
      1px solid
      rgba(222, 175, 95, .76);

    border-radius: 10px;

    color: var(--gold-bright);

    background:
      linear-gradient(
        180deg,
        #172536 0%,
        #091522 100%
      );

    box-shadow:
      inset 0 1px 0
      rgba(255, 255, 255, .10),

      0 5px 15px
      rgba(0, 0, 0, .27);

    font-size: 11px;

    line-height: 1;

    font-weight: 800;

    text-decoration: none;

    -webkit-tap-highlight-color:
      transparent;

    touch-action: manipulation;

    animation:
      buttonBreath
      4.4s
      ease-in-out
      infinite;
  }


  /* ==========================================================
     ANIMATED SWEEP
  ========================================================== */

  .sweep {
    position: absolute;

    z-index: 1;

    top: -20%;

    bottom: -20%;

    left: -45%;

    width: 30%;

    pointer-events: none;

    transform:
      skewX(-16deg);

    background:
      linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 228, 178, .04) 10%,
        rgba(255, 228, 178, .18) 30%,
        rgba(255, 230, 180, .70) 50%,
        rgba(255, 228, 178, .18) 70%,
        rgba(255, 228, 178, .04) 90%,
        transparent 100%
      );

    filter:
      blur(.2px);

    animation:
      sweepAcross
      4.4s
      ease-in-out
      infinite;
  }


  @keyframes sweepAcross {

    0% {
      left: -45%;
      opacity: 0;
    }

    14% {
      left: -45%;
      opacity: 0;
    }

    21% {
      opacity: .95;
    }

    48% {
      left: 120%;
      opacity: .95;
    }

    57% {
      left: 120%;
      opacity: 0;
    }

    100% {
      left: 120%;
      opacity: 0;
    }

  }


  /* ==========================================================
     CTA GLOW
  ========================================================== */

  .cta-glow {
    position: absolute;

    z-index: 0;

    inset: 0;

    border-radius: inherit;

    pointer-events: none;

    animation:
      glowPulse
      4.4s
      ease-in-out
      infinite;
  }


  @keyframes glowPulse {

    0%,
    100% {
      box-shadow:
        inset 0 0 0
        rgba(244, 207, 136, 0);
    }

    39% {
      box-shadow:
        inset 0 0 20px
        rgba(244, 207, 136, .12);
    }

    58% {
      box-shadow:
        inset 0 0 0
        rgba(244, 207, 136, 0);
    }

  }


  @keyframes buttonBreath {

    0%,
    100% {
      border-color:
        rgba(222, 175, 95, .67);

      box-shadow:
        inset 0 1px 0
        rgba(255, 255, 255, .10),

        0 5px 15px
        rgba(0, 0, 0, .27),

        0 0 0
        rgba(222, 175, 95, 0);
    }

    42% {
      border-color:
        rgba(244, 207, 136, .95);

      box-shadow:
        inset 0 1px 0
        rgba(255, 255, 255, .13),

        0 5px 15px
        rgba(0, 0, 0, .27),

        0 0 14px
        rgba(222, 175, 95, .17);
    }

  }


  .cta-text {
    position: relative;

    z-index: 5;
  }


  .arrow {
    position: relative;

    z-index: 5;

    color: var(--gold-bright);

    font-size: 20px;

    line-height: 1;

    animation:
      arrowMove
      4.4s
      ease-in-out
      infinite;
  }


  @keyframes arrowMove {

    0%,
    27%,
    100% {
      transform:
        translateX(0);
    }

    40% {
      transform:
        translateX(5px);
    }

    51% {
      transform:
        translateX(0);
    }

  }


  .cta:active {
    transform:
      scale(.985);

    background:
      linear-gradient(
        180deg,
        #21354b 0%,
        #0c1c2d 100%
      );
  }


  /* ==========================================================
     FLEXIBLE EMPTY HUD AREA
  ========================================================== */

  .space {
    flex: 1;

    min-height: 16px;
  }


  /* ==========================================================
     TRUST AREA
  ========================================================== */

  .trust {
    display: grid;

    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    width: 100%;

    padding-top: 14px;

    border-top:
      1px solid
      rgba(255, 255, 255, .11);
  }


  .trust-item {
    display: flex;

    flex-direction: column;

    align-items: center;
    justify-content: center;

    min-width: 0;
    min-height: 47px;

    gap: 5px;

    text-align: center;
  }


  .trust-item + .trust-item {
    border-left:
      1px solid
      rgba(255, 255, 255, .10);
  }


  .trust-icon {
    color: var(--gold-bright);

    font-size: 15px;

    line-height: 1;
  }


  .trust-label {
    color: #e2e5ea;

    font-size: 6px;

    line-height: 1.15;

    font-weight: 800;

    letter-spacing: .05em;

    text-transform: uppercase;
  }


  /* ==========================================================
     STANDARD iPHONE
  ========================================================== */

  @media (max-width: 600px) {

    #tw-app {
      height: 520px;
    }


    .layout {
      padding: 16px;
    }


    .hud {
      width: 57%;
      height: 486px;
    }


    .photo {
      object-position:
        55% center;
    }

  }


  /* ==========================================================
     NARROW iPHONE
  ========================================================== */

  @media (max-width: 390px) {

    #tw-app {
      height: 500px;

      border-radius: 16px;
    }


    .layout {
      padding: 11px;
    }


    .hud {
      width: 61%;
      height: 476px;

      padding:
        18px
        11px
        15px;

      border-radius: 17px;
    }


    .corner-top {
      top: 15px;
      left: 16px;

      width: 98px;
      height: 92px;
    }


    .corner-bottom {
      right: 16px;
      bottom: 15px;

      width: 98px;
      height: 92px;
    }


    .header {
      margin-bottom: 16px;
    }


    .brand {
      font-size: 7px;
    }


    .secure {
      font-size: 7px;
    }


    .secure-dot {
      width: 5px;
      height: 5px;
    }


    .eyebrow {
      font-size: 8.5px;
    }


    .title {
      font-size: 27px;
    }


    .description {
      margin-top: 10px;

      font-size: 8.7px;

      line-height: 1.4;
    }


    .cta {
      height: 41px;

      margin-top: 15px;

      padding:
        0 11px;

      font-size: 10px;
    }


    .trust {
      padding-top: 11px;
    }


    .trust-item {
      min-height: 43px;
    }


    .trust-icon {
      font-size: 13px;
    }


    .trust-label {
      font-size: 5.3px;
    }

  }


  /* ==========================================================
     VERY NARROW PHONE
  ========================================================== */

  @media (max-width: 350px) {

    .hud {
      width: 63%;
    }


    .title {
      font-size: 24px;
    }


    .description {
      font-size: 8px;
    }

  }


  /* ==========================================================
     TABLET / DESKTOP
  ========================================================== */

  @media (min-width: 601px) {

    .hud {
      width: 48%;
      max-width: 380px;

      padding:
        22px
        20px
        19px;
    }


    .brand,
    .secure {
      font-size: 10px;
    }


    .eyebrow {
      font-size: 12px;
    }


    .title {
      font-size: 40px;
    }


    .description {
      font-size: 12px;
    }


    .cta {
      height: 47px;

      font-size: 13px;
    }


    .trust-label {
      font-size: 7px;
    }

  }


  /* ==========================================================
     REDUCED MOTION
  ========================================================== */

  @media (prefers-reduced-motion: reduce) {

    .secure-dot,
    .cta,
    .sweep,
    .cta-glow,
    .arrow {
      animation: none !important;
    }

  }

</style>

</head>


<body>

<div id="tw-app">

  <!-- ========================================================
       REAL IMAGE
  ========================================================= -->

  <img
    class="photo"
    src="${IMAGE_URL}"
    alt=""
    loading="eager"
    decoding="async"
  >


  <div
    class="shade"
    aria-hidden="true"
  ></div>


  <!-- ========================================================
       HUD
  ========================================================= -->

  <div class="layout">

    <section
      class="hud"
      aria-label="Create your TheWing.ai account"
    >

      <div
        class="corner-top"
        aria-hidden="true"
      ></div>

      <div
        class="corner-bottom"
        aria-hidden="true"
      ></div>


      <div class="content">


        <!-- HEADER -->

        <div class="header">

          <div class="brand">
            THEWING.AI
          </div>


          <div class="secure">

            <span
              class="secure-dot"
              aria-hidden="true"
            ></span>

            <span>
              SECURE
            </span>

          </div>

        </div>


        <!-- PRIMARY MESSAGE -->

        <div class="eyebrow">
          PERSONALIZED INTELLIGENCE
        </div>


        <div
          class="title"
          role="heading"
          aria-level="2"
        >

          <span>
            CREATE AN
          </span>

          <span>
            ACCOUNT
          </span>

        </div>


        <div class="description">
          Unlock personalized military decision intelligence built around you.
        </div>


        <!-- ==================================================
             ANIMATED CTA
        =================================================== -->

        <a
          class="cta"
          href="${ACCOUNT_URL}"
          target="_top"
          aria-label="Create your TheWing.ai account"
        >

          <span
            class="cta-glow"
            aria-hidden="true"
          ></span>

          <span
            class="sweep"
            aria-hidden="true"
          ></span>

          <span class="cta-text">
            Get Started
          </span>

          <span
            class="arrow"
            aria-hidden="true"
          >
            →
          </span>

        </a>


        <div
          class="space"
          aria-hidden="true"
        ></div>


        <!-- TRUST -->

        <div class="trust">


          <div class="trust-item">

            <div
              class="trust-icon"
              aria-hidden="true"
            >
              ◇
            </div>

            <div class="trust-label">
              PRIVATE
            </div>

          </div>


          <div class="trust-item">

            <div
              class="trust-icon"
              aria-hidden="true"
            >
              ◎
            </div>

            <div class="trust-label">
              SECURE
            </div>

          </div>


          <div class="trust-item">

            <div
              class="trust-icon"
              aria-hidden="true"
            >
              ✦
            </div>

            <div class="trust-label">
              MISSION<br>
              FOCUSED
            </div>

          </div>


        </div>

      </div>

    </section>

  </div>

</div>


<script>

  /*
     Tell parent page the exact component height.
     This avoids Webflow deciding iframe dimensions.
  */

  function reportHeight() {

    try {

      var width =
        document.documentElement.clientWidth ||
        window.innerWidth;

      var height =
        width <= 390
          ? 500
          : 520;

      window.parent.postMessage(
        {
          type: "THEWING_CREATE_ACCOUNT_HEIGHT",
          height: height
        },
        "*"
      );

    } catch (e) {}

  }


  window.addEventListener(
    "load",
    reportHeight
  );


  window.addEventListener(
    "resize",
    reportHeight
  );


  reportHeight();

</script>

</body>

</html>`);

    doc.close();


    /* ==========================================================
       HEIGHT COMMUNICATION
    ========================================================== */

    function receiveMessage(event) {

      if (
        !event.data ||
        event.data.type !==
          "THEWING_CREATE_ACCOUNT_HEIGHT"
      ) {
        return;
      }

      const height =
        Number(event.data.height);

      if (
        !Number.isFinite(height) ||
        height < 300 ||
        height > 800
      ) {
        return;
      }

      frame.style.setProperty(
        "height",
        height + "px",
        "important"
      );

      mount.style.setProperty(
        "height",
        height + "px",
        "important"
      );
    }


    window.addEventListener(
      "message",
      receiveMessage
    );

  }


  /* ============================================================
     INITIALIZE
  ============================================================ */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );

  } else {

    start();

  }

})();
