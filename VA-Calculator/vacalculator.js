(function () {
  "use strict";

  function bootPCSURetireVARuntime() {
    const ROOT = document.getElementById("pcsu-retire-va-shell");
    if (!ROOT) return;

    const $ = (selector) => ROOT.querySelector(selector);

    const els = {
      retirementSystem: $("#rv-retirement-system"),
      rank: $("#rv-rank"),
      yos: $("#rv-yos"),
      vaRating: $("#rv-va-rating"),
      dependentProfile: $("#rv-dependent-profile"),

      totalHeroLabel: $("#rv-total-hero-label"),
      totalHeroValue: $("#rv-total-hero-value"),
      totalHeroSub: $("#rv-total-hero-sub"),

      infoSystem: $("#rv-info-system"),
      infoRank: $("#rv-info-rank"),
      infoYos: $("#rv-info-yos"),
      infoRating: $("#rv-info-rating"),
      infoProfile: $("#rv-info-profile"),

      retirementLabel: $("#rv-retirement-label"),
      retirementAmount: $("#rv-retirement-amount"),
      vaLabel: $("#rv-va-label"),
      vaAmount: $("#rv-va-amount"),
      combinedAmount: $("#rv-combined-amount"),

      breakdownRetirement: $("#rv-breakdown-retirement"),
      breakdownVA: $("#rv-breakdown-va"),
      breakdownCombined: $("#rv-breakdown-combined"),

      barRetirement: $("#rv-bar-retirement"),
      barVA: $("#rv-bar-va"),
      barCombined: $("#rv-bar-combined"),

      scoreRing: $("#scoreRing"),
      scoreLabel: $("#scoreLabel"),

      insightList: $("#rv-insight-list"),
      totalWrapNote: $("#rv-total-wrap .total-pay-note"),
      footerNote: ROOT.querySelector(".footer-note")
    };

    // ============================================================
    // //#1) API
    // ============================================================
    // PCSUnited owns the public page.
    // TheWing.ai powers the open/public calculator layer.
    //
    // Optional override before this file loads:
    // window.PCSU_THEWING_API_ORIGIN = "https://thewing.netlify.app";
    // window.PCSU_API_ORIGIN = "https://thewing.netlify.app";
    const API_ORIGIN =
      window.PCSU_THEWING_API_ORIGIN ||
      window.PCSU_API_ORIGIN ||
      "https://thewing.netlify.app";

    const ENDPOINT = API_ORIGIN.replace(/\/+$/, "") + "/api/opensource-brain";

    // ============================================================
    // //#2) FORMATTERS
    // ============================================================

    function money0(value) {
      const n = Number(value || 0);
      return "$" + Math.round(n).toLocaleString();
    }

    function money2(value) {
      const n = Number(value || 0);
      return "$" + n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function esc(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function pctOf(total, value) {
      const t = Number(total || 0);
      const v = Number(value || 0);
      if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(v)) return 0;
      return (v / t) * 100;
    }

    function firstFiniteNumber() {
      for (let i = 0; i < arguments.length; i += 1) {
        const n = Number(arguments[i]);
        if (Number.isFinite(n)) return n;
      }
      return 0;
    }

    function firstString() {
      for (let i = 0; i < arguments.length; i += 1) {
        const s = String(arguments[i] == null ? "" : arguments[i]).trim();
        if (s) return s;
      }
      return "";
    }

    function setText(el, value) {
      if (el) el.textContent = String(value == null ? "" : value);
    }

    function setBarHeight(el, percent) {
      if (!el) return;
      el.style.height = clamp(Number(percent || 0), 8, 100) + "%";
    }

    function setRing(el, percent) {
      if (!el) return;
      el.style.setProperty("--pct", String(clamp(Number(percent || 0), 0, 100)));
    }

    // ============================================================
    // //#3) NORMALIZERS
    // ============================================================

    function parseYearsOfService(raw) {
      const n = parseInt(String(raw || "").replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) ? n : 20;
    }

    function parseVARating(raw) {
      const n = parseInt(String(raw || "").replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) ? n : 0;
    }

    function normalizeRank(rawRank) {
      const raw = String(rawRank || "").trim().toUpperCase();
      if (!raw) return "E-6";

      if (/^[EWO]-\d+$/.test(raw)) return raw;

      return raw
        .replace(/\s+/g, "")
        .replace(/^([EWO])(\d+)$/, "$1-$2");
    }

    function normalizeRetirementSystem(rawSystem) {
      const raw = String(rawSystem || "").trim().toUpperCase();

      if (raw === "HIGH-3" || raw === "HIGH3" || raw === "HIGH 3") return "HIGH3";
      if (raw === "BRS") return "BRS";

      return "HIGH3";
    }

    function retirementSystemLabel(system) {
      const raw = String(system || "").trim().toUpperCase();

      if (raw === "HIGH3" || raw === "HIGH-3" || raw === "HIGH 3") return "High-3";
      if (raw === "BRS") return "BRS";

      return "High-3";
    }

    function normalizeDependentProfile(rawProfile) {
      return String(rawProfile || "Veteran Only").trim();
    }

    function dependentProfileToFields(profile) {
      const p = String(profile || "").trim().toLowerCase();

      if (p === "veteran only") {
        return {
          spouse: false,
          childrenUnder18: 0,
          childrenInSchoolOver18: 0,
          dependentParents: 0
        };
      }

      if (p === "veteran + spouse") {
        return {
          spouse: true,
          childrenUnder18: 0,
          childrenInSchoolOver18: 0,
          dependentParents: 0
        };
      }

      if (p === "veteran + spouse + child") {
        return {
          spouse: true,
          childrenUnder18: 1,
          childrenInSchoolOver18: 0,
          dependentParents: 0
        };
      }

      if (p === "veteran + child") {
        return {
          spouse: false,
          childrenUnder18: 1,
          childrenInSchoolOver18: 0,
          dependentParents: 0
        };
      }

      return {
        spouse: false,
        childrenUnder18: 0,
        childrenInSchoolOver18: 0,
        dependentParents: 0
      };
    }

    function rankTitle(rank) {
      const map = {
        "E-1": "Airman Basic",
        "E-2": "Airman",
        "E-3": "Airman First Class",
        "E-4": "Senior Airman",
        "E-5": "Staff Sergeant",
        "E-6": "Technical Sergeant",
        "E-7": "Master Sergeant",
        "E-8": "Senior Master Sergeant",
        "E-9": "Chief Master Sergeant",

        "W-1": "Warrant Officer 1",
        "W-2": "Chief Warrant Officer 2",
        "W-3": "Chief Warrant Officer 3",
        "W-4": "Chief Warrant Officer 4",
        "W-5": "Chief Warrant Officer 5",

        "O-1": "Second Lieutenant",
        "O-2": "First Lieutenant",
        "O-3": "Captain",
        "O-4": "Major",
        "O-5": "Lieutenant Colonel",
        "O-6": "Colonel",
        "O-7": "Brigadier General",
        "O-8": "Major General"
      };

      return map[rank] || rank;
    }

    // ============================================================
    // //#4) THEWING RESPONSE NORMALIZER
    // ============================================================

    function normalizeTheWingResponse(payload, data) {
      const source =
        data?.payload ||
        data?.data ||
        data?.result ||
        data ||
        {};

      const calculator =
        source.calculator ||
        source.retirementVa ||
        source.retirement_va ||
        source.retireVa ||
        source.vaRetirement ||
        {};

      const summary =
        source.summary ||
        {};

      const profile =
        source.profile ||
        source.user ||
        source.normalizedProfile ||
        {};

      const compensation =
        source.compensation ||
        source.pay ||
        source.income ||
        {};

      const monthly =
        compensation.monthly ||
        source.monthly ||
        calculator.monthly ||
        {};

      const detail =
        compensation.detail ||
        source.detail ||
        source.details ||
        {};

      const retirementRecord =
        detail.retirementRecord ||
        source.retirementRecord ||
        compensation.retirementRecord ||
        calculator.retirementRecord ||
        source.officialRetirement ||
        {};

      const vaRecord =
        detail.vaRecord ||
        source.vaRecord ||
        compensation.vaRecord ||
        calculator.vaRecord ||
        source.officialVa ||
        {};

      const retirement = firstFiniteNumber(
        calculator.retiredPayGross,
        calculator.grossMonthlyRetiredPay,
        calculator.retirementPay,
        calculator.retirementMonthly,
        monthly.retiredPayGross,
        monthly.grossMonthlyRetiredPay,
        monthly.retirementPay,
        monthly.retirementMonthly,
        monthly.retiredPay,
        compensation.retiredPayGross,
        compensation.retirementPay,
        source.retiredPayGross,
        source.retirementPay,
        retirementRecord.grossMonthlyRetiredPay,
        retirementRecord.monthlyRetirement,
        retirementRecord.retiredPayGross,
        data?.retiredPayGross,
        data?.retirementPay
      );

      const va = firstFiniteNumber(
        calculator.vaCompensation,
        calculator.monthlyVA,
        calculator.vaMonthly,
        monthly.vaCompensation,
        monthly.monthlyVA,
        monthly.vaMonthly,
        compensation.vaCompensation,
        compensation.monthlyVA,
        source.vaCompensation,
        source.monthlyVA,
        vaRecord.monthlyVA,
        vaRecord.vaCompensation,
        data?.monthlyVA,
        data?.vaCompensation
      );

      const combined = firstFiniteNumber(
        calculator.combinedMonthlyGross,
        calculator.totalMonthly,
        summary.combinedMonthlyGross,
        summary.monthlyIncome,
        monthly.combinedMonthlyGross,
        monthly.grossMonthlyComp,
        monthly.totalMonthly,
        compensation.combinedMonthlyGross,
        compensation.totalMonthly,
        source.combinedMonthlyGross,
        source.totalMonthly,
        data?.combinedMonthlyGross,
        data?.totalMonthly,
        retirement + va
      );

      const displaySystem = firstString(
        calculator.retirementSystem,
        profile.retirementSystem,
        profile.retirement_system,
        retirementRecord.retirementSystem,
        payload.retirementSystem,
        "HIGH3"
      );

      const displayRank = firstString(
        calculator.rank,
        profile.rank,
        retirementRecord.rank,
        payload.rank
      );

      const displayYos = firstFiniteNumber(
        calculator.yearsOfService,
        profile.yearsOfService,
        profile.yos,
        retirementRecord.yearsOfService,
        payload.yos
      );

      const displayRating = firstFiniteNumber(
        calculator.vaRating,
        profile.vaRating,
        profile.va_rating,
        profile.vaDisability,
        profile.va_disability,
        vaRecord.rating,
        payload.vaRating
      );

      const sourceVersion = firstString(
        source.sourceVersion,
        source.rateVersion,
        compensation.sourceVersion,
        retirementRecord.rateVersion,
        vaRecord.rateVersion,
        data?.sourceVersion,
        data?.sourceVersions?.brainVersion,
        "TheWing.ai"
      );

      return {
        source,
        calculator,
        summary,
        profile,
        compensation,
        monthly,
        detail,
        retirementRecord,
        vaRecord,
        retirement,
        va,
        combined,
        displaySystem,
        displayRank,
        displayYos,
        displayRating,
        sourceVersion
      };
    }

    // ============================================================
    // //#5) PAINTERS
    // ============================================================

    function paintInsights(lines) {
      if (!els.insightList) return;

      const tones = ["mint", "peach", "lav"];

      els.insightList.innerHTML = (lines || []).slice(0, 3).map(function (line, i) {
        return [
          "<li>",
          '  <span class="dot ' + (tones[i] || "mint") + '"></span>',
          "  <span>" + esc(line) + "</span>",
          "</li>"
        ].join("");
      }).join("");
    }

    function paintLoading(payload) {
      setText(els.totalHeroLabel, "Estimated Combined Monthly Income");
      setText(els.totalHeroValue, "Calculating...");
      setText(els.totalHeroSub, "Retirement Pay + VA Disability");

      setText(els.infoSystem, payload.retirementSystemDisplay);
      setText(els.infoRank, payload.rank);
      setText(els.infoYos, String(payload.yos) + " Years");
      setText(els.infoRating, String(payload.vaRating) + "%");
      setText(els.infoProfile, payload.dependentProfile);

      setText(els.retirementLabel, "Estimated Retirement Pay");
      setText(els.retirementAmount, "...");
      setText(els.vaLabel, "Estimated VA Disability");
      setText(els.vaAmount, "...");
      setText(els.combinedAmount, "...");

      setText(els.breakdownRetirement, "...");
      setText(els.breakdownVA, "...");
      setText(els.breakdownCombined, "...");

      setBarHeight(els.barRetirement, 58);
      setBarHeight(els.barVA, 40);
      setBarHeight(els.barCombined, 78);
      setRing(els.scoreRing, 54.82);
      setText(els.scoreLabel, "Combined Monthly Total");

      paintInsights([
        "PCSUnited owns this public calculator page; TheWing.ai powers the calculation layer.",
        "TheWing uses official-retirement.js and official-va.js as source-truth modules.",
        "This keeps the public retirement and VA tool aligned with the Financial Dashboard."
      ]);

      setText(
        els.totalWrapNote,
        "Retirement Pay + VA Disability"
      );

      setText(
        els.footerNote,
        "Running TheWing.ai flow: public calculator → /api/opensource-brain → official-retirement.js + official-va.js."
      );
    }

    function paintError(message, payload) {
      setText(els.totalHeroLabel, "Estimated Combined Monthly Income");
      setText(els.totalHeroValue, "$0.00");
      setText(els.totalHeroSub, "Retirement Pay + VA Disability");

      setText(els.infoSystem, payload.retirementSystemDisplay || "High-3");
      setText(els.infoRank, payload.rank || "—");
      setText(els.infoYos, String(payload.yos || 0) + " Years");
      setText(els.infoRating, String(payload.vaRating || 0) + "%");
      setText(els.infoProfile, payload.dependentProfile || "Veteran Only");

      setText(els.retirementLabel, "Estimated Retirement Pay");
      setText(els.retirementAmount, "$0");
      setText(els.vaLabel, "Estimated VA Disability");
      setText(els.vaAmount, "$0");
      setText(els.combinedAmount, "$0");

      setText(els.breakdownRetirement, "$0");
      setText(els.breakdownVA, "$0");
      setText(els.breakdownCombined, "$0");

      setBarHeight(els.barRetirement, 10);
      setBarHeight(els.barVA, 10);
      setBarHeight(els.barCombined, 10);
      setRing(els.scoreRing, 0);
      setText(els.scoreLabel, "Unavailable");

      paintInsights([
        message || "We could not calculate this estimate.",
        "Confirm TheWing /api/opensource-brain supports tool RETIREMENT_VA.",
        "Then confirm official-retirement.js and official-va.js are deployed in TheWing _share."
      ]);

      setText(
        els.totalWrapNote,
        "Retirement Pay + VA Disability"
      );

      setText(
        els.footerNote,
        "Calculator unavailable. Check TheWing.ai /api/opensource-brain and shared official modules."
      );
    }

    function paintSuccess(payload, data) {
      const normalized = normalizeTheWingResponse(payload, data);

      const retirement = Number(normalized.retirement || 0);
      const va = Number(normalized.va || 0);
      const combined = Number(normalized.combined || retirement + va);

      const displaySystem = normalized.displaySystem || payload.retirementSystem || "HIGH3";
      const displayRank = normalized.displayRank || payload.rank;
      const displayYos = normalized.displayYos || payload.yos;
      const displayRating = normalized.displayRating ?? payload.vaRating;
      const displayProfile = payload.dependentProfile;

      setText(els.totalHeroLabel, "Estimated Combined Monthly Income");
      setText(els.totalHeroValue, money2(combined));
      setText(els.totalHeroSub, "Retirement Pay + VA Disability");

      setText(els.infoSystem, retirementSystemLabel(displaySystem));
      setText(els.infoRank, displayRank + " • " + rankTitle(displayRank));
      setText(els.infoYos, String(displayYos) + " Years");
      setText(els.infoRating, String(displayRating) + "%");
      setText(els.infoProfile, displayProfile);

      setText(els.retirementLabel, "Estimated Retirement Pay");
      setText(els.retirementAmount, money0(retirement));
      setText(els.vaLabel, "Estimated VA Disability");
      setText(els.vaAmount, money0(va));
      setText(els.combinedAmount, money0(combined));

      setText(els.breakdownRetirement, money0(retirement));
      setText(els.breakdownVA, money0(va));
      setText(els.breakdownCombined, money0(combined));

      setBarHeight(els.barRetirement, pctOf(combined, retirement));
      setBarHeight(els.barVA, pctOf(combined, va));
      setBarHeight(els.barCombined, 100);

      setRing(els.scoreRing, clamp(combined / 100, 0, 100));
      setText(els.scoreLabel, "Combined Monthly Total");

      paintInsights([
        rankTitle(displayRank) + " retiring under " + retirementSystemLabel(displaySystem) + " at " + displayYos + " years is estimated at " + money0(retirement) + " per month.",
        "Projected VA disability at " + displayRating + "% for " + displayProfile + " is " + money0(va) + " per month.",
        "Estimated combined monthly income is " + money2(combined) + "."
      ]);

      setText(
        els.totalWrapNote,
        "Retirement Pay + VA Disability"
      );

      setText(
        els.footerNote,
        "Estimate generated by TheWing.ai using /api/opensource-brain, official-retirement.js, and official-va.js. PCSUnited owns the public calculator page."
      );
    }

    // ============================================================
    // //#6) INPUT + REQUEST
    // ============================================================

    function readInputs() {
      const retirementSystem = normalizeRetirementSystem(
        els.retirementSystem && els.retirementSystem.value
      );

      const dependentProfile = normalizeDependentProfile(
        els.dependentProfile && els.dependentProfile.value
      );

      const depFields = dependentProfileToFields(dependentProfile);

      const rank = normalizeRank(els.rank && els.rank.value);
      const yos = parseYearsOfService(els.yos && els.yos.value);
      const vaRating = parseVARating(els.vaRating && els.vaRating.value);

      return {
        mode: "VETERAN",
        rank,
        rank_paygrade: rank,
        paygrade: rank,
        yos,
        yearsOfService: yos,
        retirementSystem,
        retirement_system: retirementSystem,
        retirementSystemDisplay: retirementSystemLabel(retirementSystem),
        vaRating,
        va_rating: vaRating,
        vaDisability: vaRating,
        va_disability: vaRating,
        dependentProfile,
        spouse: depFields.spouse,
        childrenUnder18: depFields.childrenUnder18,
        childrenInSchoolOver18: depFields.childrenInSchoolOver18,
        dependentParents: depFields.dependentParents
      };
    }

    async function parseJSONResponse(res) {
      const text = await res.text();
      let data = null;

      try {
        data = JSON.parse(text || "{}");
      } catch (_err) {
        throw new Error("Invalid JSON response from TheWing opensource-brain.");
      }

      if (!res.ok || !data || data.ok === false) {
        const msg =
          (data && (data.error || data.message)) ||
          ("HTTP " + res.status);

        throw new Error(msg);
      }

      return data;
    }

    let runSeq = 0;

    async function run() {
      const seq = ++runSeq;
      const raw = readInputs();
      paintLoading(raw);

      const requestBody = {
        tool: "RETIREMENT_VA",
        source: "PCSUnited",
        poweredBy: "TheWing.ai",
        input: {
          mode: "VETERAN",

          rank: raw.rank,
          rank_paygrade: raw.rank,
          paygrade: raw.rank,

          yos: raw.yos,
          yearsOfService: raw.yos,
          years_of_service: raw.yos,

          retirementSystem: raw.retirementSystem,
          retirement_system: raw.retirementSystem,

          vaRating: raw.vaRating,
          va_rating: raw.vaRating,
          vaDisability: raw.vaRating,
          va_disability: raw.vaRating,
          rating: raw.vaRating,

          spouse: raw.spouse,
          childrenUnder18: raw.childrenUnder18,
          children_under_18: raw.childrenUnder18,
          childrenInSchoolOver18: raw.childrenInSchoolOver18,
          children_in_school_over_18: raw.childrenInSchoolOver18,
          dependentParents: raw.dependentParents,
          dependent_parents: raw.dependentParents,

          dependentProfile: raw.dependentProfile
        }
      };

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        const data = await parseJSONResponse(res);

        if (seq !== runSeq) return;

        paintSuccess(raw, data);
      } catch (err) {
        if (seq !== runSeq) return;

        console.error("PCSU Retire+VA calculator error:", err);
        console.error("Request body sent to TheWing opensource-brain:", requestBody);

        paintError(
          err && err.message ? err.message : "Unable to calculate estimate.",
          raw
        );
      }
    }

    function bind() {
      ["retirementSystem", "rank", "yos", "vaRating", "dependentProfile"].forEach(function (key) {
        const el = els[key];

        if (el) {
          el.addEventListener("change", run);
          el.addEventListener("input", run);
        }
      });
    }

    bind();
    run();

    window.PCSU_RETIRE_VA = {
      run: run,
      endpoint: ENDPOINT,
      apiOrigin: API_ORIGIN,
      poweredBy: "TheWing.ai",
      route: "/api/opensource-brain",
      tool: "RETIREMENT_VA"
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPCSURetireVARuntime, { once: true });
  } else {
    bootPCSURetireVARuntime();
  }
})();
