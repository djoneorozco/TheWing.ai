/* ============================================================
  PCSUNITED • BASICBRAIN + AMY GUIDANCE COMBINED JS
  v6.1.0 • RETIREMENT_VA VETERAN INTEGRATION
=============================================================== */

(function () {
  "use strict";

  const VERSION = "6.1.0";
  const API_BASE = "https://thewing.netlify.app/api";
  const BRAIN_ENDPOINT = API_BASE + "/opensource-brain";

  const root = document.getElementById("pcsu-brain-amy-shell");
  if (!root) return;
  if (root.dataset.mounted === "true") return;
  root.dataset.mounted = "true";

  const els = {
    titleText: document.getElementById("bb-title-text"),
    subtitle: document.getElementById("bb-subtitle"),
    modeControl: document.getElementById("bb-mode-control"),
    modeToggle: document.getElementById("bb-mode-toggle"),
    modeText: document.getElementById("bb-mode-text"),
    rank: document.getElementById("bb-rank"),
    rankLabel: document.getElementById("bb-rank-label"),
    yos: document.getElementById("bb-yos"),
    va: document.getElementById("bb-va"),
    dependents: document.getElementById("bb-dependents"),
    base: document.getElementById("bb-base"),
    vaRow: document.getElementById("bb-va-row"),
    baseRow: document.getElementById("bb-base-row"),
    dependentsRow: document.getElementById("bb-dependents-row"),
    marriedRow: document.getElementById("bb-married-row"),
    married: document.getElementById("bb-married"),
    childrenUnderRow: document.getElementById("bb-children-under-row"),
    childrenUnder: document.getElementById("bb-children-under"),
    childrenSchoolRow: document.getElementById("bb-children-school-row"),
    childrenSchool: document.getElementById("bb-children-school"),
    parentsRow: document.getElementById("bb-parents-row"),
    parents: document.getElementById("bb-parents"),
    retirementRow: document.getElementById("bb-retirement-row"),
    retirement: document.getElementById("bb-retirement"),
    status: document.getElementById("bb-status"),

    agGreeting: document.getElementById("ag-greeting"),
    agGreetingSub: document.getElementById("ag-greeting-sub"),
    agBasePay: document.getElementById("ag-basepay"),
    agBah: document.getElementById("ag-bah"),
    agTotal: document.getElementById("ag-total"),
    agBasePayLabel: document.getElementById("ag-label-basepay"),
    agBahLabel: document.getElementById("ag-label-bah"),
    agAccuracyNote: document.getElementById("ag-accuracy-note")
  };

  const RANKS = [
    ["", "Select rank", ""],
    ["Enlisted", "", "group"],
    ["E-1", "E-1 • Airman Basic"],
    ["E-2", "E-2 • Airman"],
    ["E-3", "E-3 • Airman First Class"],
    ["E-4", "E-4 • Senior Airman"],
    ["E-5", "E-5 • Staff Sergeant"],
    ["E-6", "E-6 • Technical Sergeant"],
    ["E-7", "E-7 • Master Sergeant"],
    ["E-8", "E-8 • Senior Master Sergeant"],
    ["E-9", "E-9 • Chief Master Sergeant"],
    ["Officer", "", "group"],
    ["O-1", "O-1 • Second Lieutenant"],
    ["O-2", "O-2 • First Lieutenant"],
    ["O-3", "O-3 • Captain"],
    ["O-4", "O-4 • Major"],
    ["O-5", "O-5 • Lieutenant Colonel"],
    ["O-6", "O-6 • Colonel"],
    ["O-7", "O-7 • Brigadier General"],
    ["O-8", "O-8 • Major General"],
    ["O-9", "O-9 • Lieutenant General"],
    ["O-10", "O-10 • General"]
  ];

  const BASE_META = {
    "Andrews AFB": { zip: "20762", cityKey: "Andrews", state: "MD", market: "Washington DC" },
    "Aviano AB": { zip: "", cityKey: "Aviano", state: "", market: "Aviano" },
    "Barksdale AFB": { zip: "71110", cityKey: "Barksdale", state: "LA", market: "Bossier City" },
    "Beale AFB": { zip: "95903", cityKey: "Beale", state: "CA", market: "Marysville" },
    "Buckley SFB": { zip: "80011", cityKey: "Buckley", state: "CO", market: "Aurora / Denver" },
    "Cannon AFB": { zip: "88103", cityKey: "Cannon", state: "NM", market: "Clovis" },
    "Charleston AFB": { zip: "29404", cityKey: "Charleston", state: "SC", market: "Charleston" },
    "Columbus AFB": { zip: "39710", cityKey: "Columbus", state: "MS", market: "Columbus" },
    "Creech AFB": { zip: "89018", cityKey: "Creech", state: "NV", market: "Indian Springs / Las Vegas" },
    "Davis-Monthan AFB": { zip: "85707", cityKey: "DavisMonthan", state: "AZ", market: "Tucson" },
    "Dover AFB": { zip: "19902", cityKey: "Dover", state: "DE", market: "Dover" },
    "Dyess AFB": { zip: "79607", cityKey: "Dyess", state: "TX", market: "Abilene" },
    "Edwards AFB": { zip: "93524", cityKey: "Edwards", state: "CA", market: "Antelope Valley" },
    "Eglin AFB": { zip: "32542", cityKey: "Eglin", state: "FL", market: "Fort Walton Beach" },
    "Ellsworth AFB": { zip: "57706", cityKey: "Ellsworth", state: "SD", market: "Rapid City" },
    "Fairchild AFB": { zip: "99011", cityKey: "Fairchild", state: "WA", market: "Spokane" },
    "FE Warren AFB": { zip: "82005", cityKey: "FEWarren", state: "WY", market: "Cheyenne" },
    "Grand Forks AFB": { zip: "58205", cityKey: "GrandForks", state: "ND", market: "Grand Forks" },
    "Hanscom AFB": { zip: "01731", cityKey: "Hanscom", state: "MA", market: "Boston Metro" },
    "Hill AFB": { zip: "84056", cityKey: "Hill", state: "UT", market: "Ogden" },
    "Holloman AFB": { zip: "88330", cityKey: "Holloman", state: "NM", market: "Alamogordo" },
    "Hurlburt Field": { zip: "32544", cityKey: "Hurlburt", state: "FL", market: "Fort Walton Beach" },
    "Incirlik AB": { zip: "", cityKey: "Incirlik", state: "", market: "Incirlik" },
    "JBSA Fort Sam Houston": { zip: "78234", cityKey: "FortSamHouston", state: "TX", market: "San Antonio" },
    "JBSA Lackland": { zip: "78236", cityKey: "Lackland", state: "TX", market: "San Antonio" },
    "JBSA Randolph": { zip: "78150", cityKey: "Randolph", state: "TX", market: "San Antonio" },
    "Kadena AB": { zip: "", cityKey: "Kadena", state: "", market: "Okinawa" },
    "Keesler AFB": { zip: "39534", cityKey: "Keesler", state: "MS", market: "Biloxi" },
    "Kirtland AFB": { zip: "87117", cityKey: "Kirtland", state: "NM", market: "Albuquerque" },
    "Langley AFB": { zip: "23665", cityKey: "Langley", state: "VA", market: "Hampton Roads" },
    "Laughlin AFB": { zip: "78843", cityKey: "Laughlin", state: "TX", market: "Del Rio" },
    "Little Rock AFB": { zip: "72099", cityKey: "LittleRock", state: "AR", market: "Little Rock" },
    "Luke AFB": { zip: "85309", cityKey: "Luke", state: "AZ", market: "Phoenix" },
    "MacDill AFB": { zip: "33621", cityKey: "MacDill", state: "FL", market: "Tampa" },
    "Malmstrom AFB": { zip: "59402", cityKey: "Malmstrom", state: "MT", market: "Great Falls" },
    "Maxwell AFB": { zip: "36112", cityKey: "Maxwell", state: "AL", market: "Montgomery" },
    "McConnell AFB": { zip: "67221", cityKey: "McConnell", state: "KS", market: "Wichita" },
    "McGuire AFB": { zip: "08641", cityKey: "McGuire", state: "NJ", market: "Joint Base MDL" },
    "Minot AFB": { zip: "58705", cityKey: "Minot", state: "ND", market: "Minot" },
    "Misawa AB": { zip: "", cityKey: "Misawa", state: "", market: "Misawa" },
    "Moody AFB": { zip: "31699", cityKey: "Moody", state: "GA", market: "Valdosta" },
    "Mountain Home AFB": { zip: "83648", cityKey: "MountainHome", state: "ID", market: "Mountain Home" },
    "Nellis AFB": { zip: "89191", cityKey: "Nellis", state: "NV", market: "Las Vegas" },
    "Offutt AFB": { zip: "68113", cityKey: "Offutt", state: "NE", market: "Omaha" },
    "Osan AB": { zip: "", cityKey: "Osan", state: "", market: "Osan" },
    "Patrick SFB": { zip: "32925", cityKey: "Patrick", state: "FL", market: "Space Coast" },
    "Peterson SFB": { zip: "80914", cityKey: "Peterson", state: "CO", market: "Colorado Springs" },
    "Ramstein AB": { zip: "", cityKey: "Ramstein", state: "", market: "Ramstein" },
    "Robins AFB": { zip: "31098", cityKey: "Robins", state: "GA", market: "Warner Robins" },
    "Scott AFB": { zip: "62225", cityKey: "Scott", state: "IL", market: "St. Louis Metro" },
    "Seymour Johnson AFB": { zip: "27531", cityKey: "SeymourJohnson", state: "NC", market: "Goldsboro" },
    "Shaw AFB": { zip: "29152", cityKey: "Shaw", state: "SC", market: "Sumter" },
    "Sheppard AFB": { zip: "76311", cityKey: "Sheppard", state: "TX", market: "Wichita Falls" },
    "Spangdahlem AB": { zip: "", cityKey: "Spangdahlem", state: "", market: "Spangdahlem" },
    "Tinker AFB": { zip: "73145", cityKey: "Tinker", state: "OK", market: "Oklahoma City" },
    "Travis AFB": { zip: "94535", cityKey: "Travis", state: "CA", market: "Fairfield" },
    "Tyndall AFB": { zip: "32403", cityKey: "Tyndall", state: "FL", market: "Panama City" },
    "Vance AFB": { zip: "73705", cityKey: "Vance", state: "OK", market: "Enid" },
    "Vandenberg SFB": { zip: "93437", cityKey: "Vandenberg", state: "CA", market: "Lompoc" },
    "Whiteman AFB": { zip: "65305", cityKey: "Whiteman", state: "MO", market: "Knob Noster" },
    "Wright-Patterson AFB": { zip: "45433", cityKey: "WrightPatterson", state: "OH", market: "Dayton" }
  };

  let mode = "active_duty";
  let runTimer = null;
  let requestSeq = 0;
  let lastGoodState = null;
  let lastGoodComp = null;

  function clean(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function num(value, fallback) {
    const n = Number(String(value ?? "").replace(/[$,%]/g, "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function money(value) {
    return Number(value || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  }

  function normalizeRank(value) {
    const raw = clean(value).toUpperCase().replace(/\s+/g, "").replace("–", "-").replace("—", "-");
    if (!raw) return "";
    if (/^[EOW]-\d{1,2}$/.test(raw)) return raw;
    if (/^[EOW]\d{1,2}$/.test(raw)) return raw.charAt(0) + "-" + raw.slice(1);
    return raw;
  }

  function rankTitle(rank) {
    const r = clean(rank).toUpperCase();
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
      "O-1": "Second Lieutenant",
      "O-2": "First Lieutenant",
      "O-3": "Captain",
      "O-4": "Major",
      "O-5": "Lieutenant Colonel",
      "O-6": "Colonel",
      "O-7": "Brigadier General",
      "O-8": "Major General",
      "O-9": "Lieutenant General",
      "O-10": "General"
    };
    return map[r] || r || "Member";
  }

  function dispatchSafe(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (_) {}
  }

  function setStatus(text, show) {
    if (!els.status) return;
    els.status.textContent = text || "";
    els.status.classList.toggle("show", !!show);
  }

  function fillSelect(select, items, placeholder) {
    if (!select) return;
    select.innerHTML = "";

    if (placeholder) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = placeholder;
      select.appendChild(option);
    }

    let group = null;

    items.forEach(function (item) {
      if (item[2] === "group") {
        group = document.createElement("optgroup");
        group.label = item[0];
        select.appendChild(group);
        return;
      }

      const option = document.createElement("option");
      option.value = item[0];
      option.textContent = item[1];

      if (group) {
        group.appendChild(option);
      } else {
        select.appendChild(option);
      }
    });
  }

  function countOptions(max) {
    const items = [["", "Select"]];
    for (let i = 0; i <= max; i++) {
      items.push([String(i), String(i)]);
    }
    return items;
  }

  function populateSelects() {
    fillSelect(els.rank, RANKS, null);

    fillSelect(els.yos, [
      ["", "Select years"],
      ["2", "2 Years"],
      ["4", "4 Years"],
      ["6", "6 Years"],
      ["8", "8 Years"],
      ["10", "10 Years"],
      ["12", "12 Years"],
      ["14", "14 Years"],
      ["16", "16 Years"],
      ["18", "18 Years"],
      ["20", "20 Years"],
      ["22", "22 Years"],
      ["24", "24 Years"],
      ["26", "26 Years"],
      ["28", "28 Years"],
      ["30", "30 Years"]
    ], null);

    fillSelect(els.va, [
      ["", "Select rating"],
      ["0", "0%"],
      ["10", "10%"],
      ["20", "20%"],
      ["30", "30%"],
      ["40", "40%"],
      ["50", "50%"],
      ["60", "60%"],
      ["70", "70%"],
      ["80", "80%"],
      ["90", "90%"],
      ["100", "100%"]
    ], null);

    fillSelect(els.dependents, [
      ["", "Select dependents"],
      ["0", "No Dependents"],
      ["1", "1 Dependent"],
      ["2", "2 Dependents"],
      ["3", "3 Dependents"],
      ["4", "4 Dependents"],
      ["5", "5 Dependents"],
      ["6", "6+ Dependents"]
    ], null);

    fillSelect(els.married, [
      ["", "Select"],
      ["true", "Yes"],
      ["false", "No"]
    ], null);

    fillSelect(els.childrenUnder, countOptions(6), null);
    fillSelect(els.childrenSchool, countOptions(4), null);
    fillSelect(els.parents, countOptions(2), null);

    fillSelect(els.retirement, [
      ["HIGH3", "High-3"],
      ["BRS", "Blended Retirement (BRS)"]
    ], null);

    const bases = Object.keys(BASE_META).sort().map(function (base) {
      return [base, base];
    });

    fillSelect(els.base, [["", "Select gaining base"]].concat(bases), null);
  }

  function veteranFieldElements() {
    return [
      els.rank,
      els.yos,
      els.va,
      els.married,
      els.childrenUnder,
      els.childrenSchool,
      els.parents,
      els.retirement
    ];
  }

  function activeDutyFieldElements() {
    return [els.rank, els.yos, els.dependents, els.base];
  }

  function clearValues() {
    veteranFieldElements().concat(activeDutyFieldElements()).forEach(function (el) {
      if (!el) return;
      if (el === els.retirement) {
        el.value = "HIGH3";
        return;
      }
      el.value = "";
    });

    lastGoodState = null;
    lastGoodComp = null;
    setStatus("", false);
    root.classList.remove("is-guidance-ready");

    if (els.agAccuracyNote) {
      els.agAccuracyNote.textContent = "";
      els.agAccuracyNote.style.display = "none";
    }
  }

  function setVeteranRowsVisible(isVet) {
    if (els.vaRow) els.vaRow.classList.toggle("is-hidden", !isVet);
    if (els.marriedRow) els.marriedRow.classList.toggle("is-hidden", !isVet);
    if (els.childrenUnderRow) els.childrenUnderRow.classList.toggle("is-hidden", !isVet);
    if (els.childrenSchoolRow) els.childrenSchoolRow.classList.toggle("is-hidden", !isVet);
    if (els.parentsRow) els.parentsRow.classList.toggle("is-hidden", !isVet);
    if (els.retirementRow) els.retirementRow.classList.toggle("is-hidden", !isVet);

    if (els.baseRow) els.baseRow.classList.toggle("is-hidden", isVet);
    if (els.dependentsRow) els.dependentsRow.classList.toggle("is-hidden", isVet);
  }

  function setMode(nextMode) {
    mode = nextMode === "veteran" ? "veteran" : "active_duty";
    const isVet = mode === "veteran";

    if (els.modeToggle) els.modeToggle.classList.toggle("is-veteran", isVet);
    if (els.modeControl) els.modeControl.classList.toggle("is-veteran", isVet);
    if (els.modeText) els.modeText.textContent = isVet ? "Veteran" : "Active Duty";

    if (els.titleText) {
      els.titleText.textContent = isVet ? "Start Your Veteran Snapshot" : "Start Your PCS Snapshot";
    }

    if (els.subtitle) {
      els.subtitle.textContent = isVet
        ? "Enter your retired profile so PCSUnited can prepare your official veteran compensation from TheWing.ai."
        : "Enter your basic profile so PCSUnited can prepare your compensation preview and guidance flow.";
    }

    if (els.rankLabel) els.rankLabel.textContent = isVet ? "Retired Rank" : "Rank";

    setVeteranRowsVisible(isVet);
    clearValues();
    emitProfileOnly();
  }

  function parseMarried(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  }

  function getState() {
    const rank = normalizeRank(els.rank ? els.rank.value : "");
    const yos = num(els.yos ? els.yos.value : "", 0);

    if (mode === "veteran") {
      const vaRaw = els.va ? els.va.value : "";
      const va = vaRaw === "" ? null : num(vaRaw, 0);
      const married = parseMarried(els.married ? els.married.value : "");
      const childrenUnder18 = els.childrenUnder ? num(els.childrenUnder.value, NaN) : NaN;
      const childrenInSchoolOver18 = els.childrenSchool ? num(els.childrenSchool.value, NaN) : NaN;
      const dependentParents = els.parents ? num(els.parents.value, NaN) : NaN;
      const retirementSystem = clean(els.retirement ? els.retirement.value : "") || "HIGH3";
      const spouse = married === true;
      const dependentsCount =
        (spouse ? 1 : 0) + (Number.isFinite(childrenUnder18) ? childrenUnder18 : 0);

      return {
        source: "pcsunited.basicbrain.combined.v6.1.veteran",
        version: VERSION,
        stored: false,
        updated_at: new Date().toISOString(),
        mode: "veteran",
        type: "veteran",
        status: "veteran",
        retired: true,
        retirement_eligible: true,
        retirementEligible: true,
        rank,
        rank_paygrade: rank,
        rankPaygrade: rank,
        yos,
        years_of_service: yos,
        yearsOfService: yos,
        va_disability: va,
        vaDisability: va,
        disability_rating: va,
        disabilityRating: va,
        vaRating: va,
        spouse,
        married,
        childrenUnder18: Number.isFinite(childrenUnder18) ? childrenUnder18 : null,
        children_under_18: Number.isFinite(childrenUnder18) ? childrenUnder18 : null,
        childrenInSchoolOver18: Number.isFinite(childrenInSchoolOver18) ? childrenInSchoolOver18 : null,
        children_in_school_over_18: Number.isFinite(childrenInSchoolOver18) ? childrenInSchoolOver18 : null,
        dependentParents: Number.isFinite(dependentParents) ? dependentParents : null,
        dependent_parents: Number.isFinite(dependentParents) ? dependentParents : null,
        retirementSystem,
        retirement_system: retirementSystem,
        dependents_count: dependentsCount,
        dependentsCount: dependentsCount,
        has_dependents: dependentsCount > 0,
        hasDependents: dependentsCount > 0,
        base: "",
        selected_base: "",
        selectedBase: "",
        pcs_base: "",
        pcsBase: "",
        zip: "",
        bah_zip: "",
        bahZip: "",
        cityKey: "",
        market: "",
        state: ""
      };
    }

    const depRaw = els.dependents ? els.dependents.value : "";
    const dependents = depRaw === "" ? null : num(depRaw, 0);
    const hasDependents = dependents !== null && dependents > 0;
    const familyCount = dependents === null ? null : dependents + 1;
    const base = clean(els.base ? els.base.value : "");
    const meta = BASE_META[base] || {};

    return {
      source: "pcsunited.basicbrain.combined.v6.1.active_duty",
      version: VERSION,
      stored: false,
      updated_at: new Date().toISOString(),
      mode: "active_duty",
      type: "active_duty",
      status: "active_duty",
      rank,
      rank_paygrade: rank,
      rankPaygrade: rank,
      yos,
      years_of_service: yos,
      yearsOfService: yos,
      dependents: hasDependents ? "yes" : "no",
      dependents_count: dependents,
      dependentsCount: dependents,
      family: familyCount,
      family_size: familyCount,
      familySize: familyCount,
      has_dependents: hasDependents,
      hasDependents: hasDependents,
      base,
      current_base: base,
      currentBase: base,
      selected_base: base,
      selectedBase: base,
      pcs_base: base,
      pcsBase: base,
      zip: meta.zip || "",
      bah_zip: meta.zip || "",
      bahZip: meta.zip || "",
      current_zip: meta.zip || "",
      currentZip: meta.zip || "",
      cityKey: meta.cityKey || "",
      market: meta.market || "",
      state: meta.state || ""
    };
  }

  function isComplete(state) {
    if (!state || !state.rank || !state.yos) return false;

    if (mode === "veteran") {
      return !!(
        state.va_disability !== null &&
        state.married !== null &&
        state.childrenUnder18 !== null &&
        state.childrenInSchoolOver18 !== null &&
        state.dependentParents !== null &&
        state.retirementSystem
      );
    }

    return !!(
      state.dependents_count !== null &&
      state.base
    );
  }

  function buildVeteranApiInput(state) {
    return {
      rank: state.rank,
      yos: state.yos,
      yearsOfService: state.yos,
      retirementSystem: state.retirementSystem || "HIGH3",
      vaRating: state.va_disability,
      va_disability: state.va_disability,
      spouse: state.spouse === true,
      childrenUnder18: state.childrenUnder18,
      childrenInSchoolOver18: state.childrenInSchoolOver18,
      dependentParents: state.dependentParents
    };
  }

  function buildActiveDutyApiInput(state) {
    return {
      mode: "active_duty",
      rank: state.rank,
      rank_paygrade: state.rank,
      rankPaygrade: state.rank,
      yos: state.yos,
      years_of_service: state.yos,
      yearsOfService: state.yos,
      dependents_count: state.dependents_count,
      dependentsCount: state.dependents_count,
      has_dependents: state.has_dependents,
      hasDependents: state.has_dependents,
      dependents: state.dependents,
      family: state.family,
      family_size: state.family_size,
      familySize: state.family_size,
      base: state.base,
      selected_base: state.base,
      selectedBase: state.base,
      pcs_base: state.base,
      pcsBase: state.base,
      zip: state.zip,
      bah_zip: state.bah_zip,
      bahZip: state.bah_zip,
      cityKey: state.cityKey,
      market: state.market,
      state: state.state,
      source: "pcsunited.basicbrain.combined.v6.1"
    };
  }

  function extractActiveDutyComp(data) {
    const payload = (data && (data.payload || data.data || data.result || data)) || {};
    const c = payload.compensation || payload.comp || payload.pay || payload.truth_packet?.pay || {};
    const m = c.monthly || payload.monthly || c || {};

    const basePay =
      m.basicPay ??
      m.basePay ??
      m.base_pay ??
      m.base_pay_monthly ??
      payload.basePay ??
      payload.base_pay ??
      0;

    const bas =
      m.bas ??
      m.BAS ??
      m.basMonthly ??
      payload.bas ??
      payload.BAS ??
      0;

    const bah =
      m.bah ??
      m.BAH ??
      m.bahMonthly ??
      payload.bah ??
      payload.BAH ??
      0;

    const total =
      m.grossMonthlyComp ??
      m.combinedMonthlyGross ??
      m.totalMonthly ??
      m.total_monthly ??
      m.total ??
      payload.totalMonthly ??
      payload.total ??
      0;

    const finalBase = num(basePay, 0);
    const finalBas = num(bas, 0);
    const finalBah = num(bah, 0);
    const finalTotal = num(total, 0) || finalBase + finalBas + finalBah;

    return {
      basePay: finalBase,
      base_pay: finalBase,
      bas: finalBas,
      bah: finalBah,
      total: finalTotal,
      totalMonthly: finalTotal,
      total_monthly: finalTotal,
      source: "thewing.opensource-brain"
    };
  }

  function extractVeteranComp(data) {
    const payload = (data && (data.payload || data.data || data)) || {};
    const monthly = payload.compensation?.monthly || payload.monthly || {};
    const detail = payload.compensation?.detail || {};
    const summary = payload.summary || {};

    const retirementPay = num(
      monthly.retirementPay ??
      monthly.retirement_pay ??
      monthly.retiredPayGross ??
      monthly.grossMonthlyRetiredPay,
      0
    );

    const disabilityPay = num(
      monthly.disabilityPay ??
      monthly.disability_pay ??
      monthly.vaCompensation ??
      monthly.monthlyVA ??
      monthly.vaMonthly,
      0
    );

    const total = num(
      monthly.totalMonthly ??
      monthly.total_monthly ??
      monthly.total ??
      monthly.combinedMonthlyGross ??
      monthly.grossMonthlyComp,
      0
    ) || retirementPay + disabilityPay;

    return {
      retirementPay,
      retirement_pay: retirementPay,
      disabilityPay,
      disability_pay: disabilityPay,
      total,
      totalMonthly: total,
      total_monthly: total,
      compensationAccuracy: detail.compensationAccuracy || "",
      retirementBaseMethod: detail.retirementBaseMethod || "",
      retirementLabel: detail.retirementLabel || "",
      headline: summary.headline || "",
      source: "thewing.opensource-brain"
    };
  }

  function hasActiveDutyComp(comp) {
    return !!(
      comp &&
      (
        num(comp.basePay, 0) ||
        num(comp.bas, 0) ||
        num(comp.bah, 0) ||
        num(comp.total, 0)
      )
    );
  }

  function hasVeteranComp(comp) {
    return !!(
      comp &&
      (
        num(comp.retirementPay, 0) ||
        num(comp.disabilityPay, 0) ||
        num(comp.total, 0)
      )
    );
  }

  async function callTheWing(state) {
    if (mode === "veteran") {
      const body = {
        tool: "RETIREMENT_VA",
        input: buildVeteranApiInput(state)
      };

      try {
        const res = await fetch(BRAIN_ENDPOINT + "?t=" + Date.now(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body)
        });

        const data = await res.json().catch(function () {
          return {};
        });

        if (!res.ok || data.ok === false) return null;

        const comp = extractVeteranComp(data);
        if (hasVeteranComp(comp)) return comp;
      } catch (err) {
        console.warn("TheWing RETIREMENT_VA failed:", err);
      }

      return null;
    }

    const input = buildActiveDutyApiInput(state);
    const bodies = [
      { tool: "PCS_SNAPSHOT", input },
      { type: "PCS_SNAPSHOT", input }
    ];

    for (let i = 0; i < bodies.length; i++) {
      try {
        const res = await fetch(BRAIN_ENDPOINT + "?t=" + Date.now(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(bodies[i])
        });

        const data = await res.json().catch(function () {
          return {};
        });

        if (!res.ok || data.ok === false) continue;

        const comp = extractActiveDutyComp(data);
        if (hasActiveDutyComp(comp)) return comp;
      } catch (err) {
        console.warn("TheWing PCS_SNAPSHOT failed:", err);
      }
    }

    return null;
  }

  function buildSelectedBase(state) {
    return {
      source: "pcsunited.basicbrain.combined.v6.1",
      stored: false,
      base: state.base || "",
      label: state.base || "",
      name: state.base || "",
      cityKey: state.cityKey || "",
      market: state.market || "",
      state: state.state || "",
      zip: state.zip || ""
    };
  }

  function profileStatusFromComp(comp) {
    if (!comp) return "preview_only";
    if (comp.compensationAccuracy === "official_va_and_high36_retirement") {
      return "official_va_and_high36_retirement";
    }
    if (comp.compensationAccuracy === "official_va_and_retirement_estimate") {
      return "official_va_and_retirement_estimate";
    }
    if (mode === "active_duty" && comp.total > 0) return "official_active_duty";
    return "preview_only";
  }

  function emitProfileOnly() {
    const state = getState();
    const selectedBase = buildSelectedBase(state);

    const profile = {
      ...state,
      profile_status: "preview_only"
    };

    const bridge = {
      ...profile,
      compensation: null
    };

    const basicbrain = {
      ...state,
      profile,
      bridge,
      selectedBase,
      compensation: null,
      calculated_comp: null
    };

    window.PCSU_BASICBRAIN_TEMP = basicbrain;
    window.PCSU_BASICBRAIN_CURRENT = basicbrain;

    dispatchSafe("pcsunited:basicbrain-updated", {
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation: null
    });

    dispatchSafe("pcsunited:profile-ready", profile);
    dispatchSafe("pcsunited:bridge-ready", bridge);

    if (mode === "active_duty") {
      dispatchSafe("pcsu:base-selected", selectedBase);
    }

    try {
      window.postMessage({
        type: "pcsunited-basicbrain",
        source: "pcsunited.basicbrain.combined.v6.1",
        basicbrain,
        profile,
        bridge,
        selectedBase,
        compensation: null
      }, "*");
    } catch (_) {}
  }

  function accuracyNoteText(comp) {
    if (!comp || !comp.compensationAccuracy) return "";

    if (comp.compensationAccuracy === "official_va_and_high36_retirement") {
      return "Official VA + High-3 retirement";
    }

    if (comp.compensationAccuracy === "official_va_and_retirement_estimate") {
      return "Official VA + retirement estimate";
    }

    return "";
  }

  function paintAmyGuidance(state, comp) {
    const veteran = state.mode === "veteran";
    const title = rankTitle(state.rank);

    if (els.agGreeting) {
      els.agGreeting.textContent = "Pleasure to Meet You, " + title;
    }

    if (els.agGreetingSub) {
      els.agGreetingSub.textContent = veteran
        ? (comp.headline || "Thank you for your service. Let’s explore your PCSUnited guidance flow and build a clearer strategy together.")
        : "Let’s explore your PCSUnited guidance flow and build a clearer PCS strategy together.";
    }

    if (veteran) {
      if (els.agBasePayLabel) els.agBasePayLabel.textContent = "Retirement";
      if (els.agBahLabel) els.agBahLabel.textContent = "Disability";
      if (els.agBasePay) els.agBasePay.textContent = money(comp.retirementPay);
      if (els.agBah) els.agBah.textContent = money(comp.disabilityPay);
      if (els.agTotal) els.agTotal.textContent = money(comp.total);
    } else {
      if (els.agBasePayLabel) els.agBasePayLabel.textContent = "Base Pay";
      if (els.agBahLabel) els.agBahLabel.textContent = "BAH";
      if (els.agBasePay) els.agBasePay.textContent = money(comp.basePay);
      if (els.agBah) els.agBah.textContent = money(comp.bah);
      if (els.agTotal) els.agTotal.textContent = money(comp.total);
    }

    if (els.agAccuracyNote) {
      const note = veteran ? accuracyNoteText(comp) : "";
      els.agAccuracyNote.textContent = note;
      els.agAccuracyNote.style.display = note ? "block" : "none";
    }

    root.classList.add("is-guidance-ready");
  }

  function emitComp(state, comp) {
    const selectedBase = buildSelectedBase(state);
    const profileStatus = profileStatusFromComp(comp);

    const profile = {
      ...state,
      profile_status: profileStatus
    };

    const bridge = {
      ...profile,
      compensation: comp || null
    };

    if (mode === "veteran") {
      bridge.retirementPay = comp ? comp.retirementPay : 0;
      bridge.disabilityPay = comp ? comp.disabilityPay : 0;
      bridge.totalMonthlyCompensation = comp ? comp.total : 0;
      bridge.compensationAccuracy = comp ? comp.compensationAccuracy : "";
      bridge.retirementBaseMethod = comp ? comp.retirementBaseMethod : "";
    } else {
      bridge.basePay = comp ? comp.basePay : 0;
      bridge.bas = comp ? comp.bas : 0;
      bridge.bah = comp ? comp.bah : 0;
      bridge.totalMonthlyCompensation = comp ? comp.total : 0;
    }

    const basicbrain = {
      ...state,
      profile,
      bridge,
      selectedBase,
      compensation: comp || null,
      calculated_comp: comp || null
    };

    window.PCSU_BASICBRAIN_TEMP = basicbrain;
    window.PCSU_BASICBRAIN_CURRENT = basicbrain;

    dispatchSafe("pcsunited:basicbrain-updated", {
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation: comp || null
    });

    dispatchSafe("pcsunited:profile-ready", profile);
    dispatchSafe("pcsunited:bridge-ready", bridge);

    if (mode === "active_duty") {
      dispatchSafe("pcsu:base-selected", selectedBase);
    }

    if (comp) {
      if (mode === "veteran") {
        dispatchSafe("pcsunited:compensation-ready", {
          source: "pcsunited.basicbrain.combined.v6.1.veteran",
          mode: "veteran",
          profile,
          bridge,
          selectedBase,
          compensation: comp,
          retirementPay: comp.retirementPay,
          retirement_pay: comp.retirementPay,
          disabilityPay: comp.disabilityPay,
          disability_pay: comp.disabilityPay,
          total: comp.total,
          totalMonthly: comp.total,
          total_monthly: comp.total,
          compensationAccuracy: comp.compensationAccuracy,
          retirementBaseMethod: comp.retirementBaseMethod,
          headline: comp.headline,
          updated_at: new Date().toISOString()
        });
      } else {
        dispatchSafe("pcsunited:compensation-ready", {
          source: "pcsunited.basicbrain.combined.v6.1.active_duty",
          mode: "active_duty",
          profile,
          bridge,
          selectedBase,
          compensation: comp,
          basePay: comp.basePay,
          base_pay: comp.basePay,
          bas: comp.bas,
          bah: comp.bah,
          total: comp.total,
          totalMonthly: comp.total,
          total_monthly: comp.total,
          updated_at: new Date().toISOString()
        });
      }

      paintAmyGuidance(state, comp);
    }

    try {
      window.postMessage({
        type: "pcsunited-basicbrain",
        source: "pcsunited.basicbrain.combined.v6.1",
        basicbrain,
        profile,
        bridge,
        selectedBase,
        compensation: comp || null
      }, "*");
    } catch (_) {}

    lastGoodState = state;
    lastGoodComp = comp;
  }

  async function runFlow() {
    const seq = ++requestSeq;
    const state = getState();

    root.classList.remove("is-guidance-ready");
    emitProfileOnly();

    if (!isComplete(state)) {
      setStatus(
        mode === "veteran"
          ? "Waiting for veteran details."
          : "Waiting for PCS details.",
        false
      );
      return;
    }

    setStatus(
      mode === "veteran"
        ? "TheWing.ai is calculating your veteran compensation…"
        : "TheWing.ai is calculating your PCS compensation preview…",
      true
    );

    let comp = null;

    try {
      comp = await callTheWing(state);
    } catch (err) {
      console.warn("BasicBrain combined flow failed:", err);
      comp = null;
    }

    if (seq !== requestSeq) return;

    if (mode === "veteran") {
      if (!comp || !hasVeteranComp(comp)) {
        setStatus("Unable to calculate veteran compensation right now.", true);
        return;
      }

      emitComp(state, comp);
      setStatus("", false);
      return;
    }

    if (!comp || !hasActiveDutyComp(comp)) {
      setStatus("TheWing did not return compensation for this combination yet.", true);
      return;
    }

    emitComp(state, comp);
    setStatus("", false);
  }

  function scheduleRun() {
    window.clearTimeout(runTimer);
    runTimer = window.setTimeout(runFlow, 350);
  }

  populateSelects();

  veteranFieldElements().concat(activeDutyFieldElements()).forEach(function (el) {
    if (!el) return;
    if (el === els.retirement) {
      el.value = "HIGH3";
    } else {
      el.value = "";
    }
    el.addEventListener("change", scheduleRun);
    el.addEventListener("input", scheduleRun);
  });

  if (els.modeToggle) {
    els.modeToggle.addEventListener("click", function () {
      setMode(mode === "active_duty" ? "veteran" : "active_duty");
    });
  }

  window.PCSU_BASICBRAIN = {
    version: VERSION,
    storage: "memory_only",
    endpoint: BRAIN_ENDPOINT,
    getMode: function () { return mode; },
    setMode: function (nextMode) { setMode(nextMode); },
    getState: getState,
    emit: runFlow,
    showInput: function () {
      root.classList.remove("is-guidance-ready");
    },
    showGuidance: function () {
      if (lastGoodState && lastGoodComp) {
        paintAmyGuidance(lastGoodState, lastGoodComp);
      }
    },
    getLastGood: function () {
      return {
        mode: mode,
        state: lastGoodState,
        compensation: lastGoodComp
      };
    },
    clear: function () {
      clearValues();
      emitProfileOnly();
    }
  };

  setMode("active_duty");
})();
