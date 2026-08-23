(() => {
  "use strict";

  //#1) BOOT
  function bootPCSUBAHRuntime() {
    const ROOT = document.getElementById("pcsu-bah-shell");
    if (!ROOT) return;

    //#2) HELPERS
    const $ = (selector) => ROOT.querySelector(selector);

    const els = {
      paygrade: $("#bah-paygrade"),
      yos: $("#bah-yos"),
      location: $("#bah-location"),
      dependents: $("#bah-dependents"),

      totalHeroLabel: $("#bah-total-hero-label"),
      totalHeroValue: $("#bah-total-hero-value"),
      totalHeroSub: $("#bah-total-hero-sub"),

      infoStatus: $("#bah-info-status"),
      infoDependency: $("#bah-info-dependency"),
      infoLocation: $("#bah-info-location"),
      infoRank: $("#bah-info-rank"),
      infoYos: $("#bah-info-yos"),

      payLabel: $("#bah-pay-label"),
      payAmount: $("#bah-pay-amount"),
      annualAmount: $("#bah-annual-amount"),

      basePayLabel: $("#bah-basepay-label"),
      basePayAmount: $("#bah-basepay-amount"),

      basLabel: $("#bah-bas-label"),
      basAmount: $("#bah-bas-amount"),

      totalAmount: $("#bah-total-amount"),
      totalNote: $("#bah-total-note"),

      breakdownBah: $("#bah-breakdown-bah"),
      breakdownBasePay: $("#bah-breakdown-basepay"),
      breakdownBas: $("#bah-breakdown-bas"),

      barBah: $("#bah-bar-bah"),
      barBasePay: $("#bah-bar-basepay"),
      barBas: $("#bah-bar-bas"),

      barBahValue: $("#bah-bar-bah-value"),
      barBasePayValue: $("#bah-bar-basepay-value"),
      barBasValue: $("#bah-bar-bas-value"),

      insightList: $("#bah-insight-list"),
      footerNote: $("#bah-footer-note"),
      scoreRing: $("#scoreRing"),

      resultPanel: $(".bah-result-panel"),
      officialBadgeText: $(".bah-official-badge span"),
      sourceText: $(".bah-source-line p")
    };


    //#3) API
    // PCSUnited owns the public page.
    // TheWing.ai powers the public/open calculation layer.
    //
    // Optional override before this file loads:
    //
    // window.PCSU_THEWING_API_ORIGIN =
    //   "https://thewing.netlify.app";
    //
    // window.PCSU_API_ORIGIN =
    //   "https://thewing.netlify.app";

    const API_ORIGIN =
      window.PCSU_THEWING_API_ORIGIN ||
      window.PCSU_API_ORIGIN ||
      "https://thewing.netlify.app";

    const ENDPOINT =
      API_ORIGIN.replace(/\/+$/, "") +
      "/api/opensource-brain";


    //#3A) BAH HEADER / CROSS-FRAME BRIDGE
    //
    // The public BAH Calculator may run inside a Netlify iframe
    // while the compact compensation header runs on the Webflow
    // parent page.
    //
    // This bridge does NOT calculate or modify compensation.
    // It only publishes the already-determined calculator result.

    const BAH_HEADER_MESSAGE_TYPE =
      "pcsunited-bah-compensation";

    const BAH_HEADER_REQUEST_TYPE =
      "pcsunited-bah-header-request";

    const BAH_CALCULATOR_SOURCE =
      "pcsunited.bah.calculator";


    function cloneSnapshot(value) {
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        return null;
      }

      try {
        return JSON.parse(
          JSON.stringify(value)
        );
      } catch (_) {
        return null;
      }
    }


    function hideLegacyCompensationPanel() {
      const oldPanel =
        ROOT.querySelector(
          ".bah-compensation-panel"
        );

      if (!oldPanel) {
        return false;
      }

      oldPanel.style.display =
        "none";

      oldPanel.setAttribute(
        "aria-hidden",
        "true"
      );

      return true;
    }


    function buildBAHHeaderMessage(snapshot) {
      const safeSnapshot =
        cloneSnapshot(snapshot);

      if (!safeSnapshot) {
        return null;
      }

      return {
        type:
          BAH_HEADER_MESSAGE_TYPE,

        source:
          BAH_CALCULATOR_SOURCE,

        version:
          "1.0.0",

        detail:
          safeSnapshot
      };
    }


    function publishBAHCompensationToParent(snapshot) {
      const safeSnapshot =
        cloneSnapshot(snapshot);

      if (!safeSnapshot) {
        return false;
      }

      const detail = {
        ...safeSnapshot,

        updated_at:
          new Date()
            .toISOString()
      };


      /*
        Save latest successful calculator snapshot.

        This lets the Webflow header ask for the current
        result even if it loaded after the calculator.
      */

      window.PCSU_BAH_COMPENSATION_CURRENT =
        detail;


      const message =
        buildBAHHeaderMessage(
          detail
        );

      if (!message) {
        return false;
      }


      /*
        Send to Webflow parent page.
      */

      try {
        if (
          window.parent &&
          window.parent !== window
        ) {
          window.parent.postMessage(
            message,
            "*"
          );
        }
      } catch (_) {}


      /*
        Also expose the same result locally for any
        future same-document TheWing integrations.
      */

      try {
        window.dispatchEvent(
          new CustomEvent(
            "pcsunited:bah-calculator-updated",
            {
              detail
            }
          )
        );
      } catch (_) {}


      return true;
    }


    function bindBAHHeaderBridge() {
      if (
        window.__PCSU_BAH_HEADER_BRIDGE_BOUND
      ) {
        return;
      }

      window.__PCSU_BAH_HEADER_BRIDGE_BOUND =
        true;


      window.addEventListener(
        "message",
        (event) => {
          const data =
            event &&
            event.data;


          if (
            !data ||
            typeof data !== "object" ||
            data.type !==
              BAH_HEADER_REQUEST_TYPE
          ) {
            return;
          }


          /*
            The external Webflow compensation header is alive.

            Hide the old visible compensation panel INSIDE the
            calculator iframe.

            Important:
            We only hide the panel. We do NOT remove its DOM nodes,
            because bahcalculator.js still owns and updates those
            existing result elements.
          */

          hideLegacyCompensationPanel();


          /*
            Replay latest successful calculation.
          */

          const current =
            cloneSnapshot(
              window.PCSU_BAH_COMPENSATION_CURRENT
            );

          if (!current) {
            return;
          }


          const message =
            buildBAHHeaderMessage(
              current
            );

          if (!message) {
            return;
          }


          try {
            if (
              event.source &&
              typeof event.source.postMessage ===
                "function"
            ) {
              event.source.postMessage(
                message,
                event.origin || "*"
              );
            }
          } catch (_) {}
        }
      );
    }


    //#4) FORMATTERS

    function money0(value) {
      const n = Number(value || 0);

      return (
        "$" +
        Math.round(n).toLocaleString()
      );
    }


    function money2(value) {
      const n = Number(value || 0);

      return (
        "$" +
        n.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )
      );
    }


    function esc(value) {
      return String(
        value == null
          ? ""
          : value
      )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }


    function clamp(value, min, max) {
      return Math.max(
        min,
        Math.min(max, value)
      );
    }


    function pctOf(total, value) {
      const t = Number(total || 0);
      const v = Number(value || 0);

      if (
        !Number.isFinite(t) ||
        t <= 0 ||
        !Number.isFinite(v)
      ) {
        return 0;
      }

      return (v / t) * 100;
    }


    function setText(el, value) {
      if (!el) return;

      el.textContent =
        String(
          value == null
            ? ""
            : value
        );
    }


    function setBarHeight(el, percent) {
      if (!el) return;

      el.style.height =
        clamp(
          Number(percent || 0),
          8,
          100
        ) + "%";
    }


    function setRing(total) {
      if (!els.scoreRing) return;

      const pct =
        clamp(
          Number(total || 0) / 100,
          0,
          100
        );

      els.scoreRing.style.setProperty(
        "--pct",
        String(
          pct.toFixed(2)
        )
      );
    }


    function firstFiniteNumber() {
      for (
        let i = 0;
        i < arguments.length;
        i += 1
      ) {

        const n =
          Number(
            arguments[i]
          );

        if (
          Number.isFinite(n)
        ) {
          return n;
        }
      }

      return 0;
    }


    function firstString() {
      for (
        let i = 0;
        i < arguments.length;
        i += 1
      ) {

        const s =
          String(
            arguments[i] == null
              ? ""
              : arguments[i]
          ).trim();

        if (s) {
          return s;
        }
      }

      return "";
    }


    //#5) NORMALIZERS

    function parseYearsOfService(raw) {
      const n =
        parseInt(
          String(raw || "")
            .replace(
              /[^\d]/g,
              ""
            ),
          10
        );

      return (
        Number.isFinite(n)
          ? n
          : 0
      );
    }


    function normalizeRank(rawRank) {
      const raw =
        String(
          rawRank || ""
        )
          .trim()
          .toUpperCase();

      if (!raw) {
        return "E-5";
      }

      if (
        /^[EWO]-\dE?$/.test(raw)
      ) {
        return raw;
      }

      return raw
        .replace(
          /\s+/g,
          ""
        )
        .replace(
          /^([EWO])(\dE?)$/,
          "$1-$2"
        );
    }


    function normalizeBase(rawBase) {
      const raw =
        String(
          rawBase || ""
        ).trim();

      const compact =
        raw
          .toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          );

      const aliasMap = {

        jbsalackland:
          "Lackland AFB",

        lackland:
          "Lackland AFB",

        lacklandafb:
          "Lackland AFB",


        jbsarandolph:
          "Randolph AFB",

        randolph:
          "Randolph AFB",

        randolphafb:
          "Randolph AFB",


        jbsafortsamhouston:
          "Fort-Sam-Houston AFB",

        fortsamhouston:
          "Fort-Sam-Houston AFB",

        fortsamhoustonafb:
          "Fort-Sam-Houston AFB",


        davismonthan:
          "Davis-Monthan AFB",

        davismonthanafb:
          "Davis-Monthan AFB",

        dmafb:
          "Davis-Monthan AFB",


        fewarren:
          "F.E-Warren AFB",

        fewarrenafb:
          "F.E-Warren AFB",

        fewarrenairforcebase:
          "F.E-Warren AFB",

        francisewarren:
          "F.E-Warren AFB",


        littlerock:
          "Little-Rock AFB",

        littlerockafb:
          "Little-Rock AFB",


        mountainhome:
          "Mountain-Home AFB",

        mountainhomeafb:
          "Mountain-Home AFB",


        seymourjohnson:
          "Seymour-Johnson AFB",

        seymourjohnsonafb:
          "Seymour-Johnson AFB",


        wrightpatterson:
          "Wright-Patterson AFB",

        wrightpattersonafb:
          "Wright-Patterson AFB",

        wpafb:
          "Wright-Patterson AFB"
      };

      return (
        aliasMap[compact] ||
        raw
      );
    }


    function normalizeDependents(raw) {
      const s =
        String(
          raw || ""
        ).toLowerCase();

      return (
        s.includes("without") ||
        s.includes("no")
      )
        ? "without"
        : "with";
    }


    function rankTitle(rank) {
      const map = {

        "E-1":
          "Airman Basic",

        "E-2":
          "Airman",

        "E-3":
          "Airman First Class",

        "E-4":
          "Senior Airman",

        "E-5":
          "Staff Sergeant",

        "E-6":
          "Technical Sergeant",

        "E-7":
          "Master Sergeant",

        "E-8":
          "Senior Master Sergeant",

        "E-9":
          "Chief Master Sergeant",


        "W-1":
          "Warrant Officer 1",

        "W-2":
          "Chief Warrant Officer 2",

        "W-3":
          "Chief Warrant Officer 3",

        "W-4":
          "Chief Warrant Officer 4",

        "W-5":
          "Chief Warrant Officer 5",


        "O-1":
          "Second Lieutenant",

        "O-2":
          "First Lieutenant",

        "O-3":
          "Captain",

        "O-4":
          "Major",

        "O-5":
          "Lieutenant Colonel",

        "O-6":
          "Colonel",

        "O-7":
          "Brigadier General",

        "O-8":
          "Major General",


        "O-1E":
          "Second Lieutenant prior enlisted",

        "O-2E":
          "First Lieutenant prior enlisted",

        "O-3E":
          "Captain prior enlisted"
      };

      return (
        map[rank] ||
        rank
      );
    }


    //#6) THEWING RESPONSE NORMALIZER

    function normalizeTheWingResponse(
      payload,
      data
    ) {

      const source =
        data?.data ||
        data?.payload ||
        data?.result ||
        data ||
        {};


      const profile =
        source.profile ||
        source.user ||
        source.normalizedProfile ||
        data?.payload?.profile ||
        {};


      const compensation =
        source.compensation ||
        source.pay ||
        source.income ||
        source.monthlyIncome ||
        data?.payload?.compensation ||
        {};


      const monthly =
        compensation.monthly ||
        source.monthly ||
        source.paySummary ||
        source.summary ||
        {};


      const detail =
        compensation.detail ||
        source.detail ||
        source.details ||
        {};


      const bahRecord =
        detail.bahRecord ||
        source.bahRecord ||
        compensation.bahRecord ||
        source.officialBah ||
        {};


      const payRecord =
        detail.payRecord ||
        source.payRecord ||
        compensation.payRecord ||
        source.officialPay ||
        {};


      const bah =
        firstFiniteNumber(

          monthly.bah,

          monthly.bahMonthly,

          monthly.monthlyBAH,

          compensation.bah,

          compensation.bahMonthly,

          source.bah,

          source.monthlyBAH,

          bahRecord.bah,

          bahRecord.monthlyBAH,

          data?.bah,

          data?.monthlyBAH
        );


      const basePay =
        firstFiniteNumber(

          monthly.basicPay,

          monthly.basePay,

          monthly.basicPayMonthly,

          monthly.basePayMonthly,

          compensation.basicPay,

          compensation.basePay,

          compensation.basicPayMonthly,

          source.basicPay,

          source.basePay,

          payRecord.basicPayMonthly,

          data?.basicPay,

          data?.basePay
        );


      const bas =
        firstFiniteNumber(

          monthly.bas,

          monthly.basMonthly,

          compensation.bas,

          compensation.basMonthly,

          source.bas,

          source.basMonthly,

          payRecord.basMonthly,

          data?.bas
        );


      const total =
        firstFiniteNumber(

          monthly.grossMonthlyComp,

          monthly.combinedMonthlyGross,

          monthly.totalMilitaryIncome,

          monthly.militaryIncome,

          monthly.householdIncome,

          monthly.totalMonthly,

          compensation.grossMonthlyComp,

          compensation.combinedMonthlyGross,

          compensation.totalMonthly,

          source.totalMonthly,

          source.totalMilitaryIncomeMonthly,

          source.totalHouseholdIncomeMonthly,

          data?.totalMonthly,

          bah +
            basePay +
            bas
        );


      const displayBase =
        firstString(

          profile.currentBase,

          profile.base,

          source.base,

          source.canonicalBase,

          bahRecord.base,

          bahRecord.canonicalBase,

          payload.base
        );


      const displayZip =
        firstString(

          bahRecord.dutyZip,

          source.dutyZip,

          detail.dutyZip
        );


      const displayMha =
        firstString(

          bahRecord.mhaName,

          compensation.mhaName,

          source.mhaName
        );


      const sourceVersion =
        firstString(

          source.sourceVersion,

          source.rateVersion,

          bahRecord.rateVersion,

          payRecord.sourceVersion,

          compensation.sourceVersion,

          data?.sourceVersion,

          data?.sourceVersions
            ?.brainVersion,

          "TheWing.ai"
        );


      return {

        profile,

        compensation,

        monthly,

        detail,

        bahRecord,

        payRecord,

        bah,

        basePay,

        bas,

        total,

        displayBase,

        displayZip,

        displayMha,

        sourceVersion
      };
    }


    //#7) INSIGHTS

    function paintInsights(lines) {
      if (
        !els.insightList
      ) {
        return;
      }

      const tones = [
        "mint",
        "peach",
        "lav"
      ];

      els.insightList.innerHTML =
        (lines || [])
          .slice(0, 3)
          .map(
            function (
              line,
              i
            ) {

              return [
                "<li>",
                '  <span class="dot ' +
                  (
                    tones[i] ||
                    "mint"
                  ) +
                  '"></span>',
                "  <span>" +
                  esc(line) +
                  "</span>",
                "</li>"
              ].join("");
            }
          )
          .join("");
    }


    //#8) INPUT READER

    function readInputs() {

      const rank =
        normalizeRank(
          els.paygrade &&
          els.paygrade.value
        );


      const yos =
        parseYearsOfService(
          els.yos &&
          els.yos.value
        );


      const base =
        normalizeBase(
          els.location &&
          els.location.value
        );


      const dependents =
        normalizeDependents(
          els.dependents &&
          els.dependents.value
        );


      return {

        mode:
          "ACTIVE_DUTY",

        rank,

        rank_paygrade:
          rank,

        paygrade:
          rank,

        yos,

        yearsOfService:
          yos,

        base,

        location:
          base,

        dependents,

        hasDependents:
          dependents === "with",

        basType:
          ""
      };
    }


    //#9) LOADING STATE

    function paintLoading(
      payload
    ) {

      setText(
        els.totalHeroLabel,
        "Total Monthly Military Pay"
      );

      setText(
        els.totalHeroValue,
        "Calculating..."
      );

      setText(
        els.totalHeroSub,
        "Base Pay + BAH + BAS"
      );


      setText(
        els.infoStatus,
        "Active Duty"
      );

      setText(
        els.infoDependency,
        payload.dependents === "with"
          ? "With Dependents"
          : "Without Dependents"
      );

      setText(
        els.infoLocation,
        payload.base
      );

      setText(
        els.infoRank,
        payload.rank
      );

      setText(
        els.infoYos,
        String(
          payload.yos
        ) +
        " Years"
      );


      setText(
        els.payLabel,
        "Projected Monthly BAH"
      );

      setText(
        els.payAmount,
        "—"
      );

      setText(
        els.annualAmount,
        "—"
      );


      setText(
        els.basePayLabel,
        "Estimated Monthly Base Pay"
      );

      setText(
        els.basePayAmount,
        "..."
      );


      setText(
        els.basLabel,
        "Estimated Monthly BAS"
      );

      setText(
        els.basAmount,
        "..."
      );


      setText(
        els.totalAmount,
        "..."
      );

      setText(
        els.totalNote,
        "Powered by TheWing.ai"
      );


      if (
        els.resultPanel
      ) {

        els.resultPanel
          .setAttribute(
            "aria-busy",
            "true"
          );

        els.resultPanel
          .dataset
          .state =
            "loading";
      }


      setText(
        els.officialBadgeText,
        "Checking rate"
      );


      setText(
        els.sourceText,
        "Checking TheWing.ai official BAH data layer…"
      );


      setText(
        els.breakdownBah,
        "BAH Component"
      );

      setText(
        els.breakdownBasePay,
        "Base Pay Component"
      );

      setText(
        els.breakdownBas,
        "BAS Component"
      );


      setText(
        els.barBahValue,
        "..."
      );

      setText(
        els.barBasePayValue,
        "..."
      );

      setText(
        els.barBasValue,
        "..."
      );


      setBarHeight(
        els.barBah,
        45
      );

      setBarHeight(
        els.barBasePay,
        45
      );

      setBarHeight(
        els.barBas,
        20
      );

      setRing(
        4500
      );


      paintInsights([
        "PCSUnited owns this public calculator page; TheWing.ai powers the calculation layer.",

        "TheWing uses official-pay.js and official-bah.js as source-truth modules.",

        "This keeps the public tool fast while aligning the numbers with the Financial Dashboard."
      ]);


      setText(
        els.footerNote,

        "Running TheWing.ai flow: public calculator → /api/opensource-brain → official-pay.js + official-bah.js."
      );
    }


    //#10) ERROR STATE

    function paintError(
      message,
      payload
    ) {

      setText(
        els.totalHeroLabel,
        "Total Monthly Military Pay"
      );

      setText(
        els.totalHeroValue,
        "—"
      );

      setText(
        els.totalHeroSub,
        "Base Pay + BAH + BAS"
      );


      setText(
        els.infoStatus,
        "Active Duty"
      );


      setText(
        els.infoDependency,

        payload.dependents === "with"
          ? "With Dependents"
          : "Without Dependents"
      );


      setText(
        els.infoLocation,

        payload.base ||
        "—"
      );


      setText(
        els.infoRank,

        payload.rank ||
        "—"
      );


      setText(
        els.infoYos,

        String(
          payload.yos ||
          0
        ) +
        " Years"
      );


      setText(
        els.payLabel,
        "Projected Monthly BAH"
      );

      setText(
        els.payAmount,
        "—"
      );

      setText(
        els.annualAmount,
        "—"
      );


      setText(
        els.basePayLabel,
        "Estimated Monthly Base Pay"
      );

      setText(
        els.basePayAmount,
        "—"
      );


      setText(
        els.basLabel,
        "Estimated Monthly BAS"
      );

      setText(
        els.basAmount,
        "—"
      );


      setText(
        els.totalAmount,
        "—"
      );


      setText(
        els.totalNote,
        "Unable to calculate"
      );


      if (
        els.resultPanel
      ) {

        els.resultPanel
          .setAttribute(
            "aria-busy",
            "false"
          );

        els.resultPanel
          .dataset
          .state =
            "error";
      }


      setText(
        els.officialBadgeText,
        "Rate unavailable"
      );


      setText(
        els.sourceText,

        "We could not retrieve the official BAH rate. Check your selections and try again."
      );


      setText(
        els.breakdownBah,
        "BAH Component"
      );

      setText(
        els.breakdownBasePay,
        "Base Pay Component"
      );

      setText(
        els.breakdownBas,
        "BAS Component"
      );


      setText(
        els.barBahValue,
        "—"
      );

      setText(
        els.barBasePayValue,
        "—"
      );

      setText(
        els.barBasValue,
        "—"
      );


      setBarHeight(
        els.barBah,
        10
      );

      setBarHeight(
        els.barBasePay,
        10
      );

      setBarHeight(
        els.barBas,
        10
      );

      setRing(
        0
      );


      paintInsights([
        message ||
        "We could not calculate this estimate.",

        "Confirm TheWing /api/opensource-brain is deployed and importing official-pay.js and official-bah.js correctly.",

        "This public calculator should use opensource-brain, not the logged-in /api/brain endpoint."
      ]);


      setText(
        els.footerNote,

        "Calculator unavailable. Check TheWing.ai /api/opensource-brain and shared official modules."
      );
    }


    //#11) SUCCESS STATE

    function paintSuccess(
      payload,
      data
    ) {

      const normalized =
        normalizeTheWingResponse(
          payload,
          data
        );


      const bah =
        Number(
          normalized.bah ||
          0
        );


      const basePay =
        Number(
          normalized.basePay ||
          0
        );


      const bas =
        Number(
          normalized.bas ||
          0
        );


      const total =
        Number(
          normalized.total ||
          (
            bah +
            basePay +
            bas
          )
        );


      const displayBase =
        normalized.displayBase ||
        payload.base;


      const displayZip =
        normalized.displayZip ||
        "";


      const displayMha =
        normalized.displayMha ||
        "";


      setText(
        els.totalHeroLabel,
        "Total Monthly Military Pay"
      );


      setText(
        els.totalHeroValue,
        money2(total)
      );


      setText(
        els.totalHeroSub,
        "Base Pay + BAH + BAS"
      );


      setText(
        els.infoStatus,
        "Active Duty"
      );


      setText(
        els.infoDependency,

        payload.dependents === "with"
          ? "With Dependents"
          : "Without Dependents"
      );


      setText(
        els.infoLocation,

        displayMha
          ? (
              displayBase +
              " • " +
              displayMha
            )
          : displayBase
      );


      setText(
        els.infoRank,

        payload.rank +
        " • " +
        rankTitle(
          payload.rank
        )
      );


      setText(
        els.infoYos,

        String(
          payload.yos
        ) +
        " Years"
      );


      /*
        PRIMARY BAH
      */

      setText(
        els.payLabel,
        "Projected Monthly BAH"
      );


      setText(
        els.payAmount,
        money0(bah)
      );


      /*
        ANNUAL BAH
        Derived only from the deterministic
        monthly BAH returned by TheWing.
      */

      setText(
        els.annualAmount,

        money0(
          bah * 12
        )
      );


      /*
        BASE PAY
      */

      setText(
        els.basePayLabel,
        "Estimated Monthly Base Pay"
      );


      setText(
        els.basePayAmount,
        money2(basePay)
      );


      /*
        BAS
      */

      setText(
        els.basLabel,
        "Estimated Monthly BAS"
      );


      setText(
        els.basAmount,
        money2(bas)
      );


      /*
        TOTAL COMPENSATION
      */

      setText(
        els.totalAmount,
        money2(total)
      );


      setText(
        els.totalNote,

        "Base Pay + BAH + BAS • Powered by TheWing.ai"
      );


      /*
        RESULT PANEL STATE
      */

      if (
        els.resultPanel
      ) {

        els.resultPanel
          .setAttribute(
            "aria-busy",
            "false"
          );

        els.resultPanel
          .dataset
          .state =
            "success";
      }


      setText(
        els.officialBadgeText,
        "Official BAH Rate"
      );


      /*
        SOURCE / LOCATION CONTEXT

        Example:
        Official 2026 BAH data
        • San Antonio, TX MHA
        • ZIP 78236
        • Powered by TheWing.ai
      */

      setText(
        els.sourceText,

        "Official 2026 BAH data" +

        (
          displayMha
            ? " • " +
              displayMha
            : ""
        ) +

        (
          displayZip
            ? " • ZIP " +
              displayZip
            : ""
        ) +

        " • Powered by TheWing.ai"
      );


      /*
        EXTERNAL BAH COMPENSATION HEADER

        Publish only values already produced by the
        deterministic calculator.
      */

      publishBAHCompensationToParent({

        basePay:
          money2(basePay),

        bah:
          money0(bah),

        bas:
          money2(bas),

        total:
          money2(total),

        rank:
          payload.rank,

        yos:
          String(
            payload.yos
          ) +
          " Years",

        location:
          displayMha
            ? (
                displayBase +
                " • " +
                displayMha
              )
            : displayBase,

        base:
          displayBase,

        mhaName:
          displayMha,

        dutyZip:
          displayZip,

        dependents:
          payload.dependents ===
            "with"
            ? "With Dependents"
            : "Without Dependents"
      });


      /*
        LEGACY RUNTIME TARGETS

        These remain because the current
        HTML preserves them for compatibility.
      */

      setText(
        els.breakdownBah,
        "BAH Component"
      );


      setText(
        els.breakdownBasePay,
        "Base Pay Component"
      );


      setText(
        els.breakdownBas,
        "BAS Component"
      );


      setText(
        els.barBahValue,
        money0(bah)
      );


      setText(
        els.barBasePayValue,
        money2(basePay)
      );


      setText(
        els.barBasValue,
        money2(bas)
      );


      setBarHeight(
        els.barBah,
        pctOf(
          total,
          bah
        )
      );


      setBarHeight(
        els.barBasePay,
        pctOf(
          total,
          basePay
        )
      );


      setBarHeight(
        els.barBas,
        pctOf(
          total,
          bas
        )
      );


      setRing(
        total
      );


      paintInsights([

        rankTitle(
          payload.rank
        ) +
        " at " +
        payload.yos +
        " years of service is estimated at " +
        money0(basePay) +
        " in monthly base pay.",


        "Projected BAH for " +
        displayBase +
        (
          displayZip
            ? " (" +
              displayZip +
              ")"
            : ""
        ) +
        " is " +
        money0(bah) +
        " " +
        (
          payload.dependents ===
          "with"
            ? "with dependents."
            : "without dependents."
        ),


        "Estimated monthly military compensation is " +
        money2(total) +
        ", including BAS of " +
        money2(bas) +
        "."
      ]);


      setText(
        els.footerNote,

        "Estimate generated by TheWing.ai using /api/opensource-brain, official-pay.js, and official-bah.js. PCSUnited owns the public calculator page."
      );
    }


    //#12) MAIN RUNNER

    let runSeq = 0;


    async function run() {

      const seq =
        ++runSeq;


      const payload =
        readInputs();


      paintLoading(
        payload
      );


      try {

        const res =
          await fetch(
            ENDPOINT,
            {

              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  tool:
                    "BAH_CALCULATOR",

                  source:
                    "PCSUnited",

                  poweredBy:
                    "TheWing.ai",

                  input:
                    payload
                })
            }
          );


        const data =
          await res
            .json()
            .catch(
              () => null
            );


        /*
          Ignore stale responses when
          the user changes inputs quickly.
        */

        if (
          seq !==
          runSeq
        ) {
          return;
        }


        if (
          !res.ok ||
          !data ||
          data.ok === false
        ) {

          throw new Error(

            (
              data &&
              (
                data.error ||
                data.message
              )
            ) ||

            "TheWing.ai opensource-brain function error."
          );
        }


        paintSuccess(
          payload,
          data
        );

      } catch (err) {

        /*
          Ignore stale errors from an
          older request.
        */

        if (
          seq !==
          runSeq
        ) {
          return;
        }


        paintError(

          err &&
          err.message

            ? err.message

            : "Unable to calculate estimate.",

          payload
        );
      }
    }


    //#13) BIND EVENTS

    function bind() {

      [
        "paygrade",
        "yos",
        "location",
        "dependents"
      ]
        .forEach(
          function (key) {

            const el =
              els[key];

            if (!el) {
              return;
            }


            /*
              Existing behavior preserved.

              We can revisit input/change
              request optimization later.
            */

            el.addEventListener(
              "change",
              run
            );


            el.addEventListener(
              "input",
              run
            );
          }
        );
    }


    //#14) INIT

    bindBAHHeaderBridge();

    bind();

    run();


    /*
      Preserve existing global runtime
      interface used elsewhere.
    */

    window.PCSU_AURORA_BAH = {

      run:
        run,

      endpoint:
        ENDPOINT,

      apiOrigin:
        API_ORIGIN,

      poweredBy:
        "TheWing.ai",

      route:
        "/api/opensource-brain"
    };
  }


  //#15) DOM READY

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(

      "DOMContentLoaded",

      bootPCSUBAHRuntime,

      {
        once: true
      }
    );

  } else {

    bootPCSUBAHRuntime();
  }

})();
