(() => {
  "use strict";

  //#1) BOOT
  function bootPCSUnitedMoveCalculator() {
    const ROOT = document.getElementById("pcsu-pcs-shell");
    if (!ROOT) return;

    //#2) HELPERS
    const $ = (selector) => ROOT.querySelector(selector);

    const els = {
      paygrade: $("#pcs-paygrade"),
      dependents: $("#pcs-dependents"),
      currentBase: $("#pcs-current-base"),
      gainingBase: $("#pcs-gaining-base"),
      distance: $("#pcs-distance"),
      povs: $("#pcs-povs"),
      weight: $("#pcs-weight"),
      expenses: $("#pcs-expenses"),

      totalHeroLabel: $("#pcs-total-hero-label"),
      totalHeroValue: $("#pcs-total-hero-value"),
      totalHeroSub: $("#pcs-total-hero-sub"),

      infoCurrent: $("#pcs-info-current"),
      infoGaining: $("#pcs-info-gaining"),
      infoRank: $("#pcs-info-rank"),
      infoDependency: $("#pcs-info-dependency"),

      maltLabel: $("#pcs-malt-label"),
      maltAmount: $("#pcs-malt-amount"),
      maltBreakdown: $("#pcs-malt-breakdown"),

      dlaLabel: $("#pcs-dla-label"),
      dlaAmount: $("#pcs-dla-amount"),
      dlaBreakdown: $("#pcs-dla-breakdown"),

      expenseLabel: $("#pcs-expense-label"),
      expenseAmount: $("#pcs-expense-amount"),
      expenseBreakdown: $("#pcs-expense-breakdown"),

      daysLabel: $("#pcs-days-label"),
      daysAmount: $("#pcs-days-amount"),
      daysBreakdown: $("#pcs-days-breakdown"),

      netAmount: $("#pcs-net-amount"),
      signalLabel: $("#pcs-signal-label"),
      totalNote: $("#pcs-total-note"),

      barMalt: $("#pcs-bar-malt"),
      barDla: $("#pcs-bar-dla"),
      barExpenses: $("#pcs-bar-expenses"),

      barMaltValue: $("#pcs-bar-malt-value"),
      barDlaValue: $("#pcs-bar-dla-value"),
      barExpensesValue: $("#pcs-bar-expenses-value"),

      insightList: $("#pcs-insight-list"),
      footerNote: $("#pcs-footer-note"),
      scoreRing: $("#scoreRing")
    };

    //#3) API
    const API_ORIGIN =
      window.PCSU_THEWING_API_ORIGIN ||
      window.PCSU_API_ORIGIN ||
      "https://thewing.netlify.app";

    const ENDPOINT = API_ORIGIN.replace(/\/+$/, "") + "/api/pcs-move";

    //#4) FORMATTERS
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

    function toNumber(value, fallback) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }

    function setText(el, value) {
      if (el) el.textContent = String(value == null ? "" : value);
    }

    function setBarHeight(el, percent) {
      if (!el) return;
      el.style.height = clamp(Number(percent || 0), 8, 100) + "%";
    }

    function setRingFromNet(netMovePosition) {
      if (!els.scoreRing) return;

      const net = Number(netMovePosition || 0);
      let pct = 50;

      if (net > 0) {
        pct = clamp(50 + Math.min(net / 50, 45), 50, 95);
      } else if (net < 0) {
        pct = clamp(50 - Math.min(Math.abs(net) / 50, 42), 8, 50);
      }

      els.scoreRing.style.setProperty("--pct", String(pct.toFixed(2)));
    }

    function pctOfMax(max, value) {
      const m = Number(max || 0);
      const v = Number(value || 0);
      if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(v)) return 8;
      return (v / m) * 100;
    }

    function parsePovs(raw) {
      const n = parseInt(String(raw || "").replace(/[^\d]/g, ""), 10);
      if (!Number.isFinite(n) || n <= 0) return 1;
      return Math.min(n, 2);
    }

    function normalizeRank(rawRank) {
      const raw = String(rawRank || "").trim().toUpperCase();
      if (!raw) return "E-5";
      if (/^[EWO]-\dE?$/.test(raw)) return raw;
      return raw.replace(/\s+/g, "").replace(/^([EWO])(\dE?)$/, "$1-$2");
    }

    function normalizeDependents(raw) {
      const s = String(raw || "").toLowerCase();
      return s.includes("without") || s.includes("no") ? "without" : "with";
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
        "O-8": "Major General",

        "O-1E": "Second Lieutenant prior enlisted",
        "O-2E": "First Lieutenant prior enlisted",
        "O-3E": "Captain prior enlisted"
      };
      return map[rank] || rank;
    }

    //#5) INPUT READER
    function readInputs() {
      const rank = normalizeRank(els.paygrade && els.paygrade.value);
      const dependents = normalizeDependents(els.dependents && els.dependents.value);
      const currentBase = String((els.currentBase && els.currentBase.value) || "").trim();
      const gainingBase = String((els.gainingBase && els.gainingBase.value) || "").trim();

      const distanceMiles = toNumber(els.distance && els.distance.value, 0);
      const povs = parsePovs(els.povs && els.povs.value);
      const estimatedWeightLbs = toNumber(els.weight && els.weight.value, 0);
      const estimatedExpenses = toNumber(els.expenses && els.expenses.value, 0);

      return {
        rank,
        paygrade: rank,
        hasDependents: dependents === "with",
        dependents,
        familySize: dependents === "with" ? 2 : 1,
        currentBase,
        gainingBase,
        distanceMiles,
        povs,
        estimatedWeightLbs,
        estimatedExpenses,
        year: 2026
      };
    }

    //#6) INSIGHTS
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

    //#7) LOADING STATE
    function paintLoading(payload) {
      setText(els.totalHeroLabel, "Known Move Cash Position");
      setText(els.totalHeroValue, "Calculating...");
      setText(els.totalHeroSub, "MALT only — DLA/per diem pending");

      setText(els.infoCurrent, payload.currentBase);
      setText(els.infoGaining, payload.gainingBase);
      setText(els.infoRank, payload.rank);
      setText(els.infoDependency, payload.hasDependents ? "With Dependents" : "Without Dependents");

      setText(els.maltAmount, "...");
      setText(els.maltBreakdown, "PCS mileage component");

      setText(els.dlaAmount, "...");
      setText(els.dlaBreakdown, "Official DLA table check");

      setText(els.expenseAmount, money2(payload.estimatedExpenses));
      setText(els.expenseBreakdown, "Out-of-pocket estimate");

      setText(els.daysAmount, "...");
      setText(els.daysBreakdown, "Authorized travel-day check");

      setText(els.netAmount, "...");
      setText(els.signalLabel, "Move Cash Signal");
      setText(els.totalNote, "Powered by TheWing.ai");

      setText(els.barMaltValue, "...");
      setText(els.barDlaValue, "...");
      setText(els.barExpensesValue, money0(payload.estimatedExpenses));

      setBarHeight(els.barMalt, 40);
      setBarHeight(els.barDla, 10);
      setBarHeight(els.barExpenses, 65);
      setRingFromNet(0);

      paintInsights([
        "Running PCSUnited move estimate through TheWing.ai /api/pcs-move.",
        "Known PCS data such as MALT and authorized travel days will calculate now.",
        "DLA and HHG estimates will activate once official tables are loaded in the shared engine."
      ]);

      setText(
        els.footerNote,
        "Running TheWing.ai flow: public calculator → /api/pcs-move → official PCS move engine."
      );
    }

    //#8) ERROR STATE
    function paintError(message, payload) {
      setText(els.totalHeroLabel, "Known Move Cash Position");
      setText(els.totalHeroValue, "$0.00");
      setText(els.totalHeroSub, "Unable to calculate");

      setText(els.maltAmount, "$0.00");
      setText(els.maltBreakdown, "PCS mileage unavailable");

      setText(els.dlaAmount, "Pending");
      setText(els.dlaBreakdown, "Official DLA table required");

      setText(els.expenseAmount, money2(payload.estimatedExpenses));
      setText(els.expenseBreakdown, "Out-of-pocket estimate");

      setText(els.daysAmount, "—");
      setText(els.daysBreakdown, "Travel days unavailable");

      setText(els.netAmount, "$0.00");
      setText(els.signalLabel, "Move Cash Signal");
      setText(els.totalNote, "Unable to calculate");

      setText(els.barMaltValue, "$0");
      setText(els.barDlaValue, "Pending");
      setText(els.barExpensesValue, money0(payload.estimatedExpenses));

      setBarHeight(els.barMalt, 8);
      setBarHeight(els.barDla, 8);
      setBarHeight(els.barExpenses, 70);
      setRingFromNet(0);

      paintInsights([
        message || "We could not calculate this PCS move estimate.",
        "Confirm TheWing.ai /api/pcs-move is deployed and importing pcs-move-engine.js correctly.",
        "Use official distance mileage from orders, DPS, TMO, or finance for best accuracy."
      ]);

      setText(
        els.footerNote,
        "Calculator unavailable. Check TheWing.ai /api/pcs-move and shared PCS move modules."
      );
    }

    //#9) SUCCESS NORMALIZER
    function normalizeResult(data) {
      const result = data && data.result ? data.result : {};
      const malt = result.malt || {};
      const dla = result.dla || {};
      const perDiem = result.perDiem || {};
      const travelDays = result.travelDays || {};
      const hhg = (result.allowanceChecks && result.allowanceChecks.hhg) || result.hhg || {};
      const knownEntitlements = result.knownEntitlements || {};

      const maltAmount = Number(
        knownEntitlements.malt != null ? knownEntitlements.malt : (malt.totalAmount || 0)
      );
      const dlaAmount = dla.available ? Number(dla.amount || 0) : 0;
      const perDiemAmount = perDiem.available ? Number(perDiem.amount || 0) : 0;
      const expenses = Number(result.estimatedExpenses || 0);
      const isPartial = result.estimateStatus !== "complete";
      const knownNet = Number(
        result.knownNetPosition != null ? result.knownNetPosition : (maltAmount - expenses)
      );
      const projectedNet = result.projectedNetPosition == null
        ? null
        : Number(result.projectedNetPosition);
      const displayNet = isPartial ? knownNet : (projectedNet != null ? projectedNet : knownNet);

      return {
        result,
        malt,
        dla,
        perDiem,
        travelDays,
        hhg,
        maltAmount,
        dlaAmount,
        perDiemAmount,
        expenses,
        knownNet,
        projectedNet,
        displayNet,
        isPartial,
        summaryLabel: result.summaryLabel || (isPartial ? "Known Move Cash Position" : "Estimated Net Move Position"),
        warnings: Array.isArray(data && data.warnings) ? data.warnings : []
      };
    }

    function heroSubtext(normalized) {
      if (!normalized.isPartial) {
        return "MALT + DLA + Per Diem − Expenses";
      }

      const pending = [];

      if (!normalized.dla.available) pending.push("DLA");
      if (!normalized.perDiem.available) pending.push("per diem");

      if (!pending.length) {
        return "Known entitlements only — additional tables pending";
      }

      return "MALT only — " + pending.join("/") + " pending";
    }

    function signalText(signal, net) {
      if (signal === "surplus") return "Projected Surplus";
      if (signal === "shortfall") return "Projected Shortfall";
      if (signal === "neutral") return "Near Neutral";
      if (net > 250) return "Projected Surplus";
      if (net < -250) return "Projected Shortfall";
      return "Planning Estimate";
    }

    //#10) SUCCESS STATE
    function paintSuccess(payload, data) {
      const normalized = normalizeResult(data);

      const maltAmount = normalized.maltAmount;
      const dlaAvailable = !!normalized.dla.available;
      const dlaAmount = normalized.dlaAmount;
      const expenses = normalized.expenses;
      const displayNet = normalized.displayNet;
      const isPartial = normalized.isPartial;

      const days = normalized.travelDays && normalized.travelDays.ok
        ? normalized.travelDays.days
        : null;

      const ratePerMile = normalized.malt && normalized.malt.ratePerMile
        ? normalized.malt.ratePerMile
        : 0;

      const moveSignal = signalText(normalized.result.moveCashSignal, displayNet);
      const hhg = normalized.hhg || {};

      setText(els.totalHeroLabel, normalized.summaryLabel);
      setText(els.totalHeroValue, money2(displayNet));
      setText(els.totalHeroSub, heroSubtext(normalized));

      setText(els.infoCurrent, payload.currentBase);
      setText(els.infoGaining, payload.gainingBase);
      setText(els.infoRank, payload.rank + " • " + rankTitle(payload.rank));
      setText(els.infoDependency, payload.hasDependents ? "With Dependents" : "Without Dependents");

      setText(els.maltAmount, maltAmount > 0 ? money2(maltAmount) : "$0.00");
      setText(
        els.maltBreakdown,
        payload.distanceMiles + " miles × " + payload.povs + " POV" + (payload.povs === 1 ? "" : "s") + " × $" + ratePerMile + "/mile"
      );

      if (dlaAvailable) {
        setText(els.dlaAmount, money2(dlaAmount));
        setText(els.dlaBreakdown, payload.rank + " • " + (payload.hasDependents ? "With Dependents" : "Without Dependents"));
      } else {
        setText(els.dlaAmount, "Pending");
        setText(els.dlaBreakdown, "Official DLA table not loaded");
      }

      setText(els.expenseAmount, money2(expenses));
      setText(els.expenseBreakdown, "User-entered planning expenses");

      setText(els.daysAmount, days == null ? "—" : days + " Day" + (days === 1 ? "" : "s"));
      setText(els.daysBreakdown, "Authorized travel-day estimate");

      setText(els.netAmount, money2(displayNet));
      setText(els.signalLabel, isPartial ? "Known Move Cash Position" : moveSignal);
      setText(
        els.totalNote,
        isPartial
          ? "Before DLA, per diem, HHG reimbursement, and PPM/GCC are included"
          : "MALT + DLA + Per Diem − estimated expenses"
      );

      const maxBar = Math.max(maltAmount, dlaAmount, expenses, 1);

      setText(els.barMaltValue, money0(maltAmount));
      setText(els.barDlaValue, dlaAvailable ? money0(dlaAmount) : "Pending");
      setText(els.barExpensesValue, money0(expenses));

      setBarHeight(els.barMalt, pctOfMax(maxBar, maltAmount));
      setBarHeight(els.barDla, dlaAvailable ? pctOfMax(maxBar, dlaAmount) : 8);
      setBarHeight(els.barExpenses, pctOfMax(maxBar, expenses));
      setRingFromNet(displayNet);

      const insightLines = [];

      if (maltAmount > 0) {
        insightLines.push(
          "Known MALT is " + money2(maltAmount) + " using " + payload.distanceMiles + " official distance miles and " + payload.povs + " authorized POV" + (payload.povs === 1 ? "." : "s.")
        );
      }

      if (isPartial) {
        insightLines.push(
          "This is a partial estimate because DLA, per diem, and PPM/GCC reimbursement are not loaded yet."
        );
      } else {
        insightLines.push(
          "Estimated net move position is " + money2(displayNet) + " using all loaded official PCS entitlements."
        );
      }

      if (hhg.available && hhg.allowanceLbs != null) {
        if (hhg.estimatedWeightLbs != null) {
          insightLines.push(
            "Official HHG allowance is " + hhg.allowanceLbs.toLocaleString() + " lbs; estimated " + hhg.estimatedWeightLbs.toLocaleString() + " lbs is " + String(hhg.status || "tracked").replace(/_/g, " ") + "."
          );
        } else {
          insightLines.push(
            "Official HHG allowance is " + hhg.allowanceLbs.toLocaleString() + " lbs for this grade and dependency status."
          );
        }
      } else if (normalized.warnings.length) {
        insightLines.push(normalized.warnings[0]);
      }

      paintInsights(insightLines.slice(0, 3));

      setText(
        els.footerNote,
        "Current beta estimate includes MALT, authorized travel days, and official HHG weight allowance checks. DLA and per diem will activate after official DTMO/JTR tables are loaded."
      );
    }

    //#11) MAIN RUNNER
    let runSeq = 0;

    async function run() {
      const seq = ++runSeq;
      const payload = readInputs();

      paintLoading(payload);

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "PCSUnited",
            poweredBy: "TheWing.ai",
            input: payload
          })
        });

        const data = await res.json().catch(() => null);

        if (seq !== runSeq) return;

        if (!res.ok || !data || data.ok === false) {
          throw new Error(
            (data && (data.error || data.message)) ||
            "TheWing.ai pcs-move function error."
          );
        }

        paintSuccess(payload, data);
      } catch (err) {
        if (seq !== runSeq) return;

        paintError(
          err && err.message ? err.message : "Unable to calculate PCS move estimate.",
          payload
        );
      }
    }

    //#12) BIND EVENTS
    function bind() {
      [
        "paygrade",
        "dependents",
        "currentBase",
        "gainingBase",
        "distance",
        "povs",
        "weight",
        "expenses"
      ].forEach(function (key) {
        const el = els[key];
        if (el) {
          el.addEventListener("change", run);
          el.addEventListener("input", run);
        }
      });
    }

    //#13) INIT
    bind();
    run();

    window.PCSU_AURORA_PCS_MOVE = {
      run: run,
      endpoint: ENDPOINT,
      apiOrigin: API_ORIGIN,
      poweredBy: "TheWing.ai",
      route: "/api/pcs-move"
    };
  }

  //#14) DOM READY
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPCSUnitedMoveCalculator, { once: true });
  } else {
    bootPCSUnitedMoveCalculator();
  }
})();
