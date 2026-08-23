<!-- ============================================================
  PCSUNITED • BASICBRAIN + AMY GUIDANCE COMBINED JS
  v6.1.6 • SCROLL-SAFE PASSIVE EVENTS + AMY-ONLY BASE DEMO HANDOFF
=============================================================== -->

<script>
(function(){
  "use strict";

  const VERSION = "6.1.6";
  const MOUNT_KEY = "PCSU_BASICBRAIN_V615_MOUNTED";
  const API_BASE = "https://thewing.netlify.app/api";
  const BRAIN_ENDPOINT = API_BASE + "/opensource-brain";
  const HANDOFF_KEY = "pcsunited.basicbrain.handoff.v1";

  if(window[MOUNT_KEY]){
    console.warn("[PCSU BasicBrain] Duplicate mount blocked:", VERSION);
    return;
  }
  window[MOUNT_KEY] = true;

  const root = document.getElementById("pcsu-brain-amy-shell");
  if(!root) return;
  if(root.dataset.mounted === "true"){
    console.warn("[PCSU BasicBrain] Shell already marked mounted.");
    return;
  }
  root.dataset.mounted = "true";

  const SCROLL_DEBUG =
    window.PCSU_SCROLL_DEBUG === true ||
    /(?:\?|&)pcsuScrollDebug=1(?:&|$)/.test(window.location.search || "");

  function logScrollDebug(tag, extra){
    if(!SCROLL_DEBUG) return;
    console.log("[PCSU Scroll Debug · BasicBrain]", {
      tag,
      scrollX:window.scrollX || window.pageXOffset || 0,
      scrollY:window.scrollY || window.pageYOffset || 0,
      version:VERSION,
      ...(extra || {})
    });
  }

  function readScroll(){
    return {
      x:window.scrollX || window.pageXOffset || 0,
      y:window.scrollY || window.pageYOffset || 0
    };
  }

  function restoreScroll(target, label){
    const current = readScroll();
    if(current.x !== target.x || current.y !== target.y){
      logScrollDebug("restore-scroll", {
        label:label || "unspecified",
        fromY:current.y,
        toY:target.y,
        deltaY:current.y - target.y
      });
      window.scrollTo(target.x, target.y);
    }
  }

  function preserveScroll(callback, allowNavigate){

    const start = readScroll();
    logScrollDebug("preserveScroll:before", {
      allowNavigate:!!allowNavigate
    });

    try{
      callback();
    }catch(_){}

    if(allowNavigate === true){
      logScrollDebug("preserveScroll:skipped-restore", {
        allowNavigate:true
      });
      return;
    }

    [0,16,40,80,120,200,320,500,800,1200].forEach(function(ms){
      setTimeout(function(){
        restoreScroll(start, "preserveScroll+" + ms + "ms");
      }, ms);
    });
  }

  function withScrollLock(fn, label){

    const start = readScroll();
    logScrollDebug((label || "scroll-lock") + ":before", start);

    preserveScroll(function(){
      fn();
    }, false);

    setTimeout(function(){
      const end = readScroll();
      logScrollDebug((label || "scroll-lock") + ":after", {
        deltaY:end.y - start.y
      });
    }, 900);
  }

  const els = {
    titleText:document.getElementById("bb-title-text"),
    subtitle:document.getElementById("bb-subtitle"),
    modeControl:document.getElementById("bb-mode-control"),
    modeToggle:document.getElementById("bb-mode-toggle"),
    modeText:document.getElementById("bb-mode-text"),

    rank:document.getElementById("bb-rank"),
    rankLabel:document.getElementById("bb-rank-label"),
    yos:document.getElementById("bb-yos"),
    va:document.getElementById("bb-va"),
    dependents:document.getElementById("bb-dependents"),
    base:document.getElementById("bb-base"),

    vaRow:document.getElementById("bb-va-row"),
    baseRow:document.getElementById("bb-base-row"),
    dependentsRow:document.getElementById("bb-dependents-row"),
    status:document.getElementById("bb-status"),

    agGreeting:document.getElementById("ag-greeting"),
    agGreetingSub:document.getElementById("ag-greeting-sub"),
    agBasePay:document.getElementById("ag-basepay"),
    agBah:document.getElementById("ag-bah"),
    agTotal:document.getElementById("ag-total"),
    agBasePayLabel:document.getElementById("ag-label-basepay"),
    agBahLabel:document.getElementById("ag-label-bah"),
    agAccuracyNote:document.getElementById("ag-accuracy-note")
  };

  function $(id){
    return document.getElementById(id);
  }

  function clean(value){
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function num(value,fallback){
    const n = Number(String(value ?? "").replace(/[$,%]/g,"").replace(/,/g,""));
    return Number.isFinite(n) ? n : (fallback ?? 0);
  }

  function money(value){
    return Number(value || 0).toLocaleString("en-US",{
      style:"currency",
      currency:"USD",
      maximumFractionDigits:0
    });
  }

  function dispatchSafe(name,detail){

    const payload =
      detail && typeof detail === "object"
        ? detail
        : {};

    const allowNavigate =
      payload.autoNavigate === true;

    const before = readScroll();

    preserveScroll(function(){

      window.dispatchEvent(
        new CustomEvent(name,{
          detail:payload
        })
      );

      logScrollDebug("dispatch:" + name, {
        autoNavigate:payload.autoNavigate === true,
        source:payload.source || null,
        deltaY:(readScroll().y - before.y)
      });

    },allowNavigate);
  }

  function postMessageSafe(payload){

    preserveScroll(function(){

      window.postMessage(
        payload || {},
        "*"
      );

      logScrollDebug("postMessage:" + (payload?.type || "unknown"), {
        autoNavigate:payload?.autoNavigate === true
      });

    },false);
  }

  function setStatus(text,show){
    if(!els.status) return;
    els.status.textContent = text || "";
    els.status.classList.toggle("show",!!show);
  }

  function normalizeRank(value){
    const raw = clean(value)
      .toUpperCase()
      .replace(/\s+/g,"")
      .replace("–","-")
      .replace("—","-");

    if(!raw) return "";
    if(/^[EOW]-\d{1,2}$/.test(raw)) return raw;
    if(/^[EOW]\d{1,2}$/.test(raw)) return raw.charAt(0) + "-" + raw.slice(1);

    return raw;
  }

  function rankTitle(rank){
    const r = clean(rank).toUpperCase();

    const map = {
      "E-1":"Airman Basic",
      "E-2":"Airman",
      "E-3":"Airman First Class",
      "E-4":"Senior Airman",
      "E-5":"Staff Sergeant",
      "E-6":"Technical Sergeant",
      "E-7":"Master Sergeant",
      "E-8":"Senior Master Sergeant",
      "E-9":"Chief Master Sergeant",
      "O-1":"Second Lieutenant",
      "O-2":"First Lieutenant",
      "O-3":"Captain",
      "O-4":"Major",
      "O-5":"Lieutenant Colonel",
      "O-6":"Colonel",
      "O-7":"Brigadier General",
      "O-8":"Major General",
      "O-9":"Lieutenant General",
      "O-10":"General"
    };

    return map[r] || r || "Member";
  }

  const RANKS = [
    ["","Select rank",""],
    ["Enlisted","","group"],
    ["E-1","E-1 • Airman Basic"],
    ["E-2","E-2 • Airman"],
    ["E-3","E-3 • Airman First Class"],
    ["E-4","E-4 • Senior Airman"],
    ["E-5","E-5 • Staff Sergeant"],
    ["E-6","E-6 • Technical Sergeant"],
    ["E-7","E-7 • Master Sergeant"],
    ["E-8","E-8 • Senior Master Sergeant"],
    ["E-9","E-9 • Chief Master Sergeant"],
    ["Officer","","group"],
    ["O-1","O-1 • Second Lieutenant"],
    ["O-2","O-2 • First Lieutenant"],
    ["O-3","O-3 • Captain"],
    ["O-4","O-4 • Major"],
    ["O-5","O-5 • Lieutenant Colonel"],
    ["O-6","O-6 • Colonel"],
    ["O-7","O-7 • Brigadier General"],
    ["O-8","O-8 • Major General"]
  ];

  const BASE_META = {
    "Andrews AFB":{zip:"20762",cityKey:"Andrews",state:"MD",market:"Washington DC"},
    "Barksdale AFB":{zip:"71110",cityKey:"Barksdale",state:"LA",market:"Bossier City"},
    "Beale AFB":{zip:"95903",cityKey:"Beale",state:"CA",market:"Marysville"},
    "Cannon AFB":{zip:"88103",cityKey:"Cannon",state:"NM",market:"Clovis"},
    "Charleston AFB":{zip:"29404",cityKey:"Charleston",state:"SC",market:"Charleston"},
    "Creech AFB":{zip:"89018",cityKey:"Creech",state:"NV",market:"Indian Springs / Las Vegas"},
    "Davis-Monthan AFB":{zip:"85707",cityKey:"DavisMonthan",state:"AZ",market:"Tucson"},
    "Dover AFB":{zip:"19902",cityKey:"Dover",state:"DE",market:"Dover"},
    "Dyess AFB":{zip:"79607",cityKey:"Dyess",state:"TX",market:"Abilene"},
    "Eglin AFB":{zip:"32542",cityKey:"Eglin",state:"FL",market:"Fort Walton Beach"},
    "Fairchild AFB":{zip:"99011",cityKey:"Fairchild",state:"WA",market:"Spokane"},
    "FE Warren AFB":{zip:"82005",cityKey:"FEWarren",state:"WY",market:"Cheyenne"},
    "Holloman AFB":{zip:"88330",cityKey:"Holloman",state:"NM",market:"Alamogordo"},
    "Hurlburt Field":{zip:"32544",cityKey:"Hurlburt",state:"FL",market:"Fort Walton Beach"},
    "JBSA Fort Sam Houston":{zip:"78234",cityKey:"FortSamHouston",state:"TX",market:"San Antonio"},
    "JBSA Lackland":{zip:"78236",cityKey:"Lackland",state:"TX",market:"San Antonio"},
    "JBSA Randolph":{zip:"78150",cityKey:"Randolph",state:"TX",market:"San Antonio"},
    "Keesler AFB":{zip:"39534",cityKey:"Keesler",state:"MS",market:"Biloxi"},
    "Kirtland AFB":{zip:"87117",cityKey:"Kirtland",state:"NM",market:"Albuquerque"},
    "Langley AFB":{zip:"23665",cityKey:"Langley",state:"VA",market:"Hampton Roads"},
    "Laughlin AFB":{zip:"78843",cityKey:"Laughlin",state:"TX",market:"Del Rio"},
    "Little Rock AFB":{zip:"72099",cityKey:"LittleRock",state:"AR",market:"Little Rock"},
    "Luke AFB":{zip:"85309",cityKey:"Luke",state:"AZ",market:"Phoenix"},
    "MacDill AFB":{zip:"33621",cityKey:"MacDill",state:"FL",market:"Tampa"},
    "Malmstrom AFB":{zip:"59402",cityKey:"Malmstrom",state:"MT",market:"Great Falls"},
    "Maxwell AFB":{zip:"36112",cityKey:"Maxwell",state:"AL",market:"Montgomery"},
    "McConnell AFB":{zip:"67221",cityKey:"McConnell",state:"KS",market:"Wichita"},
    "McGuire AFB":{zip:"08641",cityKey:"McGuire",state:"NJ",market:"Joint Base MDL"},
    "Minot AFB":{zip:"58705",cityKey:"Minot",state:"ND",market:"Minot"},
    "Moody AFB":{zip:"31699",cityKey:"Moody",state:"GA",market:"Valdosta"},
    "Mountain Home AFB":{zip:"83648",cityKey:"MountainHome",state:"ID",market:"Mountain Home"},
    "Nellis AFB":{zip:"89191",cityKey:"Nellis",state:"NV",market:"Las Vegas"},
    "Offutt AFB":{zip:"68113",cityKey:"Offutt",state:"NE",market:"Omaha"},
    "Patrick SFB":{zip:"32925",cityKey:"Patrick",state:"FL",market:"Space Coast"},
    "Peterson SFB":{zip:"80914",cityKey:"Peterson",state:"CO",market:"Colorado Springs"},
    "Robins AFB":{zip:"31098",cityKey:"Robins",state:"GA",market:"Warner Robins"},
    "Scott AFB":{zip:"62225",cityKey:"Scott",state:"IL",market:"St. Louis Metro"},
    "Seymour Johnson AFB":{zip:"27531",cityKey:"SeymourJohnson",state:"NC",market:"Goldsboro"},
    "Shaw AFB":{zip:"29152",cityKey:"Shaw",state:"SC",market:"Sumter"},
    "Sheppard AFB":{zip:"76311",cityKey:"Sheppard",state:"TX",market:"Wichita Falls"},
    "Tinker AFB":{zip:"73145",cityKey:"Tinker",state:"OK",market:"Oklahoma City"},
    "Travis AFB":{zip:"94535",cityKey:"Travis",state:"CA",market:"Fairfield"},
    "Tyndall AFB":{zip:"32403",cityKey:"Tyndall",state:"FL",market:"Panama City"},
    "Vance AFB":{zip:"73705",cityKey:"Vance",state:"OK",market:"Enid"},
    "Vandenberg SFB":{zip:"93437",cityKey:"Vandenberg",state:"CA",market:"Lompoc"},
    "Whiteman AFB":{zip:"65305",cityKey:"Whiteman",state:"MO",market:"Knob Noster"},
    "Wright-Patterson AFB":{zip:"45433",cityKey:"WrightPatterson",state:"OH",market:"Dayton"}
  };

  let mode = "active_duty";
  let runTimer = null;
  let requestSeq = 0;
  let lastGoodState = null;
  let lastGoodComp = null;

  function makeOption(value,label){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function fillSelect(select,items){
    if(!select) return;

    select.innerHTML = "";

    let group = null;

    items.forEach(function(item){

      if(item[2] === "group"){
        group = document.createElement("optgroup");
        group.label = item[0];
        select.appendChild(group);
        return;
      }

      const option = makeOption(item[0],item[1]);

      if(group){
        group.appendChild(option);
      }else{
        select.appendChild(option);
      }

    });
  }

  function countOptions(label,max){
    const items = [["",label]];

    for(let i = 0; i <= max; i++){
      items.push([String(i),String(i)]);
    }

    return items;
  }

  function createRow(id,icon,label,selectId,afterNode){
    if($(id)) return $(id);

    const row = document.createElement("div");
    row.className = "bb-row is-hidden";
    row.id = id;

    row.innerHTML =
      '<div class="bb-row-head">' +
        '<div class="bb-icon">' + icon + '</div>' +
        '<label class="bb-label" for="' + selectId + '">' + label + '</label>' +
      '</div>' +
      '<div class="bb-select-wrap">' +
        '<select id="' + selectId + '" class="bb-select" autocomplete="off"></select>' +
      '</div>';

    if(afterNode && afterNode.parentNode){
      afterNode.parentNode.insertBefore(row,afterNode.nextSibling);
    }

    return row;
  }

  function ensureShellCompatibility(){

    if(!els.dependentsRow && els.dependents){
      els.dependentsRow = els.dependents.closest(".bb-row");

      if(els.dependentsRow){
        els.dependentsRow.id = "bb-dependents-row";
      }
    }

    const insertAfter = els.vaRow || els.dependentsRow || els.baseRow;

    els.marriedRow = $("bb-married-row") || createRow("bb-married-row","💍","Married?","bb-married",insertAfter);
    els.married = $("bb-married");

    els.childrenUnderRow = $("bb-children-under-row") || createRow("bb-children-under-row","👧","Children Under 18","bb-children-under",els.marriedRow);
    els.childrenUnder = $("bb-children-under");

    els.childrenSchoolRow = $("bb-children-school-row") || createRow("bb-children-school-row","🎓","Children In School 18+","bb-children-school",els.childrenUnderRow);
    els.childrenSchool = $("bb-children-school");

    els.parentsRow = $("bb-parents-row") || createRow("bb-parents-row","👵","Dependent Parents","bb-parents",els.childrenSchoolRow);
    els.parents = $("bb-parents");

    els.retirementRow = $("bb-retirement-row") || createRow("bb-retirement-row","🛡️","Retirement System","bb-retirement",els.parentsRow);
    els.retirement = $("bb-retirement");

    if(!els.agAccuracyNote){
      const footer = document.querySelector("#pcsu-brain-amy-shell .ag-footer");
      const note = document.createElement("div");

      note.id = "ag-accuracy-note";
      note.style.display = "none";
      note.style.marginTop = "10px";
      note.style.color = "var(--gold2)";
      note.style.fontWeight = "900";
      note.style.letterSpacing = ".08em";
      note.style.textTransform = "uppercase";
      note.style.fontSize = ".72rem";

      if(footer){
        footer.appendChild(note);
      }

      els.agAccuracyNote = note;
    }
  }

  function populateSelects(){

    fillSelect(els.rank,RANKS);

    fillSelect(els.yos,[
      ["","Select years"],
      ["2","2 Years"],
      ["4","4 Years"],
      ["6","6 Years"],
      ["8","8 Years"],
      ["10","10 Years"],
      ["12","12 Years"],
      ["14","14 Years"],
      ["16","16 Years"],
      ["18","18 Years"],
      ["20","20 Years"],
      ["22","22 Years"],
      ["24","24 Years"],
      ["26","26 Years"],
      ["28","28 Years"],
      ["30","30 Years"]
    ]);

    fillSelect(els.va,[
      ["","Select rating"],
      ["0","0%"],
      ["10","10%"],
      ["20","20%"],
      ["30","30%"],
      ["40","40%"],
      ["50","50%"],
      ["60","60%"],
      ["70","70%"],
      ["80","80%"],
      ["90","90%"],
      ["100","100%"]
    ]);

    fillSelect(els.dependents,[
      ["","Select dependents"],
      ["0","No Dependents"],
      ["1","1 Dependent"],
      ["2","2 Dependents"],
      ["3","3 Dependents"],
      ["4","4 Dependents"],
      ["5","5 Dependents"],
      ["6","6+ Dependents"]
    ]);

    fillSelect(els.married,[
      ["","Select"],
      ["true","Yes"],
      ["false","No"]
    ]);

    fillSelect(els.childrenUnder,countOptions("Select children",6));
    fillSelect(els.childrenSchool,countOptions("Select children",4));
    fillSelect(els.parents,countOptions("Select parents",2));

    fillSelect(els.retirement,[
      ["HIGH3","High-3"],
      ["BRS","Blended Retirement System"]
    ]);

    const bases = Object.keys(BASE_META).sort().map(function(base){
      return [base,base];
    });

    fillSelect(els.base,[["","Select gaining base"]].concat(bases));
  }

  function allFields(){
    return [
      els.rank,
      els.yos,
      els.va,
      els.dependents,
      els.base,
      els.married,
      els.childrenUnder,
      els.childrenSchool,
      els.parents,
      els.retirement
    ];
  }

  function clearHandoff(){
    try{
      localStorage.removeItem(HANDOFF_KEY);
    }catch(err){
      console.warn("BasicBrain handoff clear failed:",err);
    }
  }

  function clearValues(){

    allFields().forEach(function(el){
      if(!el) return;
      el.value = el === els.retirement ? "HIGH3" : "";
    });

    lastGoodState = null;
    lastGoodComp = null;

    root.classList.remove("is-guidance-ready");
    setStatus("",false);

    if(els.agAccuracyNote){
      els.agAccuracyNote.textContent = "";
      els.agAccuracyNote.style.display = "none";
    }
  }

  function setVeteranRowsVisible(isVet){

    if(els.vaRow) els.vaRow.classList.toggle("is-hidden",!isVet);

    if(els.marriedRow) els.marriedRow.classList.toggle("is-hidden",!isVet);
    if(els.childrenUnderRow) els.childrenUnderRow.classList.toggle("is-hidden",!isVet);
    if(els.childrenSchoolRow) els.childrenSchoolRow.classList.toggle("is-hidden",!isVet);
    if(els.parentsRow) els.parentsRow.classList.toggle("is-hidden",!isVet);
    if(els.retirementRow) els.retirementRow.classList.toggle("is-hidden",!isVet);

    if(els.baseRow) els.baseRow.classList.toggle("is-hidden",isVet);
    if(els.dependentsRow) els.dependentsRow.classList.toggle("is-hidden",isVet);
  }

  function setMode(nextMode){

    mode = nextMode === "veteran" ? "veteran" : "active_duty";

    const isVet = mode === "veteran";

    if(els.modeToggle) els.modeToggle.classList.toggle("is-veteran",isVet);
    if(els.modeControl) els.modeControl.classList.toggle("is-veteran",isVet);
    if(els.modeText) els.modeText.textContent = isVet ? "Veteran" : "Active Duty";

    if(els.titleText){
      els.titleText.textContent = isVet ? "Start Your Veteran Snapshot" : "Start Your PCS Snapshot";
    }

    if(els.subtitle){
      els.subtitle.textContent = isVet
        ? "Enter your retired profile so PCSUnited can prepare your veteran compensation from TheWing.ai."
        : "Enter your basic profile so PCSUnited can prepare your compensation preview and guidance flow.";
    }

    if(els.rankLabel){
      els.rankLabel.textContent = isVet ? "Retired Rank" : "Rank";
    }

    setVeteranRowsVisible(isVet);
    clearValues();
    emitProfileOnly({ save:false });
  }

  function parseBool(value){
    if(value === true || value === "true") return true;
    if(value === false || value === "false") return false;
    return null;
  }

  function getState(){

    const rank = normalizeRank(els.rank ? els.rank.value : "");
    const yos = num(els.yos ? els.yos.value : "",0);

    if(mode === "veteran"){

      const vaRaw = els.va ? els.va.value : "";
      const va = vaRaw === "" ? null : num(vaRaw,0);

      const married = parseBool(els.married ? els.married.value : "");
      const childrenUnder18 = els.childrenUnder && els.childrenUnder.value !== "" ? num(els.childrenUnder.value,0) : null;
      const childrenInSchoolOver18 = els.childrenSchool && els.childrenSchool.value !== "" ? num(els.childrenSchool.value,0) : null;
      const dependentParents = els.parents && els.parents.value !== "" ? num(els.parents.value,0) : null;
      const retirementSystem = clean(els.retirement ? els.retirement.value : "") || "HIGH3";

      const spouse = married === true;

      const depCount =
        (spouse ? 1 : 0) +
        (childrenUnder18 || 0) +
        (childrenInSchoolOver18 || 0) +
        (dependentParents || 0);

      return {
        source:"pcsunited.basicbrain.combined.v6.1.6.veteran",
        version:VERSION,
        stored:false,
        updated_at:new Date().toISOString(),

        mode:"veteran",
        type:"veteran",
        status:"veteran",

        retired:true,
        retirement_eligible:true,
        retirementEligible:true,

        rank,
        rank_paygrade:rank,
        rankPaygrade:rank,

        yos,
        years_of_service:yos,
        yearsOfService:yos,

        va_disability:va,
        vaDisability:va,
        disability_rating:va,
        disabilityRating:va,
        vaRating:va,

        married,
        spouse,

        childrenUnder18,
        children_under_18:childrenUnder18,

        childrenInSchoolOver18,
        children_in_school_over_18:childrenInSchoolOver18,

        dependentParents,
        dependent_parents:dependentParents,

        retirementSystem,
        retirement_system:retirementSystem,

        dependents_count:depCount,
        dependentsCount:depCount,

        family:depCount + 1,
        family_size:depCount + 1,
        familySize:depCount + 1,

        has_dependents:depCount > 0,
        hasDependents:depCount > 0,

        base:"",
        current_base:"",
        currentBase:"",
        selected_base:"",
        selectedBase:"",
        pcs_base:"",
        pcsBase:"",

        zip:"",
        bah_zip:"",
        bahZip:"",
        current_zip:"",
        currentZip:"",
        cityKey:"",
        market:"",
        state:""
      };
    }

    const depRaw = els.dependents ? els.dependents.value : "";
    const dependents = depRaw === "" ? null : num(depRaw,0);
    const hasDependents = dependents !== null && dependents > 0;
    const familyCount = dependents === null ? null : dependents + 1;

    const base = clean(els.base ? els.base.value : "");
    const meta = BASE_META[base] || {};

    return {
      source:"pcsunited.basicbrain.combined.v6.1.6.active_duty",
      version:VERSION,
      stored:false,
      updated_at:new Date().toISOString(),

      mode:"active_duty",
      type:"active_duty",
      status:"active_duty",

      rank,
      rank_paygrade:rank,
      rankPaygrade:rank,

      yos,
      years_of_service:yos,
      yearsOfService:yos,

      dependents:hasDependents ? "yes" : "no",
      dependents_count:dependents,
      dependentsCount:dependents,

      family:familyCount,
      family_size:familyCount,
      familySize:familyCount,

      has_dependents:hasDependents,
      hasDependents:hasDependents,

      base,
      current_base:base,
      currentBase:base,
      selected_base:base,
      selectedBase:base,
      pcs_base:base,
      pcsBase:base,

      zip:meta.zip || "",
      bah_zip:meta.zip || "",
      bahZip:meta.zip || "",
      current_zip:meta.zip || "",
      currentZip:meta.zip || "",

      cityKey:meta.cityKey || "",
      market:meta.market || "",
      state:meta.state || ""
    };
  }

  function isComplete(state){

    if(!state || !state.rank || !state.yos) return false;

    if(mode === "veteran"){
      return (
        state.va_disability !== null &&
        state.married !== null &&
        state.childrenUnder18 !== null &&
        state.childrenInSchoolOver18 !== null &&
        state.dependentParents !== null &&
        !!state.retirementSystem
      );
    }

    return state.dependents_count !== null && !!state.base;
  }

  function shouldSaveHandoff(profile,selectedBase,comp){

    if(comp){
      return true;
    }

    if(!profile || !profile.rank || !profile.yos){
      return false;
    }

    if(profile.mode === "veteran"){
      return (
        profile.va_disability !== null &&
        profile.married !== null &&
        profile.childrenUnder18 !== null &&
        profile.childrenInSchoolOver18 !== null &&
        profile.dependentParents !== null
      );
    }

    return !!(
      profile.base &&
      selectedBase &&
      selectedBase.base &&
      profile.dependents_count !== null
    );
  }

  function buildActiveDutyApiInput(state){
    return {
      mode:"active_duty",

      rank:state.rank,
      rank_paygrade:state.rank,
      rankPaygrade:state.rank,

      yos:state.yos,
      years_of_service:state.yos,
      yearsOfService:state.yos,

      dependents:state.dependents,
      dependents_count:state.dependents_count,
      dependentsCount:state.dependents_count,

      has_dependents:state.has_dependents,
      hasDependents:state.has_dependents,

      family:state.family,
      family_size:state.family_size,
      familySize:state.family_size,

      base:state.base,
      current_base:state.base,
      currentBase:state.base,
      selected_base:state.base,
      selectedBase:state.base,
      pcs_base:state.base,
      pcsBase:state.base,

      zip:state.zip,
      bah_zip:state.bah_zip,
      bahZip:state.bah_zip,

      cityKey:state.cityKey,
      market:state.market,
      state:state.state,

      source:"pcsunited.basicbrain.combined.v6.1.6"
    };
  }

  function buildVeteranApiInput(state){
    return {
      rank:state.rank,
      rank_paygrade:state.rank,
      rankPaygrade:state.rank,

      yos:state.yos,
      yearsOfService:state.yos,
      years_of_service:state.yos,

      retirementSystem:state.retirementSystem || "HIGH3",
      retirement_system:state.retirementSystem || "HIGH3",

      vaRating:state.va_disability,
      va_disability:state.va_disability,
      vaDisability:state.va_disability,
      rating:state.va_disability,

      spouse:state.spouse === true,

      childrenUnder18:state.childrenUnder18 || 0,
      children_under_18:state.childrenUnder18 || 0,

      childrenInSchoolOver18:state.childrenInSchoolOver18 || 0,
      children_in_school_over_18:state.childrenInSchoolOver18 || 0,

      dependentParents:state.dependentParents || 0,
      dependent_parents:state.dependentParents || 0,

      source:"pcsunited.basicbrain.combined.v6.1.6"
    };
  }

  function extractPayload(data){
    return data && (data.payload || data.data || data.result || data) || {};
  }

  function extractActiveDutyComp(data){

    const payload = extractPayload(data);
    const c = payload.compensation || payload.comp || payload.pay || {};
    const m = c.monthly || payload.monthly || c || {};

    const basePay = num(
      m.basicPay ??
      m.basePay ??
      m.base_pay ??
      payload.basePay ??
      payload.base_pay,
      0
    );

    const bas = num(
      m.bas ??
      m.BAS ??
      payload.bas ??
      payload.BAS,
      0
    );

    const bah = num(
      m.bah ??
      m.BAH ??
      payload.bah ??
      payload.BAH,
      0
    );

    const total = num(
      m.grossMonthlyComp ??
      m.combinedMonthlyGross ??
      m.totalMonthly ??
      m.total_monthly ??
      m.total ??
      payload.totalMonthly ??
      payload.total_monthly ??
      payload.total,
      0
    ) || basePay + bas + bah;

    return {
      basePay,
      base_pay:basePay,
      bas,
      bah,
      total,
      totalMonthly:total,
      total_monthly:total,
      source:"thewing.opensource-brain"
    };
  }

  function extractVeteranComp(data){

    const payload = extractPayload(data);
    const compensation = payload.compensation || {};
    const monthly = compensation.monthly || payload.monthly || {};
    const detail = compensation.detail || {};
    const summary = payload.summary || {};

    const retirementPay = num(
      monthly.retirementPay ??
      monthly.retirement_pay ??
      monthly.retiredPay ??
      monthly.retired_pay ??
      monthly.retiredPayGross ??
      monthly.grossMonthlyRetiredPay ??
      payload.calculator?.retirementPay,
      0
    );

    const disabilityPay = num(
      monthly.disabilityPay ??
      monthly.disability_pay ??
      monthly.vaDisabilityPay ??
      monthly.va_disability_pay ??
      monthly.vaCompensation ??
      monthly.monthlyVA ??
      monthly.vaMonthly ??
      payload.calculator?.vaCompensation,
      0
    );

    const total = num(
      monthly.total ??
      monthly.totalMonthly ??
      monthly.total_monthly ??
      monthly.combinedMonthlyGross ??
      monthly.grossMonthlyComp ??
      payload.calculator?.totalMonthly,
      0
    ) || retirementPay + disabilityPay;

    return {
      retirementPay,
      retirement_pay:retirementPay,

      disabilityPay,
      disability_pay:disabilityPay,

      otherPay:0,
      other_pay:0,

      total,
      totalMonthly:total,
      total_monthly:total,

      compensationAccuracy:
        detail.compensationAccuracy ||
        payload.calculator?.compensationAccuracy ||
        summary.compensationAccuracy ||
        "",

      retirementBaseMethod:
        detail.retirementBaseMethod ||
        payload.calculator?.retirementBaseMethod ||
        summary.retirementBaseMethod ||
        "",

      retirementLabel:
        detail.retirementLabel ||
        payload.calculator?.retirementLabel ||
        summary.retirementLabel ||
        "",

      headline:summary.headline || "",

      source:"thewing.opensource-brain"
    };
  }

  function hasActiveDutyComp(comp){
    return !!(
      comp &&
      (
        num(comp.basePay,0) ||
        num(comp.bas,0) ||
        num(comp.bah,0) ||
        num(comp.total,0)
      )
    );
  }

  function hasVeteranComp(comp){
    return !!(
      comp &&
      (
        num(comp.retirementPay,0) ||
        num(comp.disabilityPay,0) ||
        num(comp.total,0)
      )
    );
  }

  async function callTheWing(state){

    const body = mode === "veteran"
      ? {
          tool:"RETIREMENT_VA",
          input:buildVeteranApiInput(state)
        }
      : {
          tool:"PCS_SNAPSHOT",
          input:buildActiveDutyApiInput(state)
        };

    try{
      const res = await fetch(BRAIN_ENDPOINT + "?t=" + Date.now(),{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        cache:"no-store",
        body:JSON.stringify(body)
      });

      const data = await res.json().catch(function(){
        return {};
      });

      if(!res.ok || data.ok === false){
        console.warn("TheWing returned error:",data);
        return null;
      }

      const comp = mode === "veteran"
        ? extractVeteranComp(data)
        : extractActiveDutyComp(data);

      if(mode === "veteran" && hasVeteranComp(comp)) return comp;
      if(mode === "active_duty" && hasActiveDutyComp(comp)) return comp;

      return null;

    }catch(err){
      console.warn("TheWing call failed:",err);
      return null;
    }
  }

  function buildSelectedBase(state){
    return {
      source:"pcsunited.basicbrain.combined.v6.1.6",
      stored:false,
      base:state.base || "",
      label:state.base || "",
      name:state.base || "",
      cityKey:state.cityKey || "",
      market:state.market || "",
      state:state.state || "",
      zip:state.zip || ""
    };
  }

  function profileStatusFromComp(comp){
    if(!comp) return "preview_only";
    if(comp.compensationAccuracy) return comp.compensationAccuracy;
    if(mode === "active_duty" && comp.total > 0) return "official_active_duty";
    return "preview_only";
  }

  function saveHandoff(profile,bridge,selectedBase,comp,basicbrain){

    if(!shouldSaveHandoff(profile,selectedBase,comp)){
      return;
    }

    try{
      localStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({
          source:"pcsunited.basicbrain.combined.v6.1.6",
          version:VERSION,
          mode,
          profile,
          bridge,
          selectedBase,
          compensation:comp || null,
          calculated_comp:comp || null,
          basicbrain,
          updated_at:new Date().toISOString()
        })
      );
    }catch(err){
      console.warn("BasicBrain handoff save failed:",err);
    }
  }

  function emitProfileOnly(options){

    const shouldSave =
      options && options.save === false
        ? false
        : true;

    const state = getState();
    const selectedBase = buildSelectedBase(state);

    const profile = {
      ...state,
      profile_status:"preview_only"
    };

    const bridge = {
      ...profile,
      compensation:null
    };

    const basicbrain = {
      ...state,
      profile,
      bridge,
      selectedBase,
      compensation:null,
      calculated_comp:null
    };

    window.PCSU_BASICBRAIN_TEMP = basicbrain;
    window.PCSU_BASICBRAIN_CURRENT = basicbrain;

    if(shouldSave){
      saveHandoff(profile,bridge,selectedBase,null,basicbrain);
    }

    dispatchSafe("pcsunited:basicbrain-updated",{
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation:null,
      autoNavigate:false
    });

    dispatchSafe("pcsunited:profile-ready",{
      ...profile,
      autoNavigate:false
    });

    dispatchSafe("pcsunited:bridge-ready",{
      ...bridge,
      autoNavigate:false
    });

    if(mode === "active_duty"){
      dispatchSafe("pcsunited:base-preview-ready",{
        selectedBase,
        profile,
        bridge,
        compensation:null,
        autoNavigate:false,
        source:"basicbrain-preview"
      });
    }

    postMessageSafe({
      type:"pcsunited-basicbrain",
      source:"pcsunited.basicbrain.combined.v6.1.6",
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation:null,
      autoNavigate:false
    });
  }

  function accuracyNoteText(comp){

    if(!comp || !comp.compensationAccuracy) return "";

    if(comp.compensationAccuracy === "official_va_and_high36_retirement"){
      return "Official VA + High-3 retirement";
    }

    if(comp.compensationAccuracy === "official_va_and_retirement_estimate"){
      return "Official VA + retirement estimate";
    }

    return comp.compensationAccuracy.replace(/_/g," ");
  }

  function paintAmyGuidance(state,comp){

    const veteran = state.mode === "veteran";
    const title = rankTitle(state.rank);

    if(els.agGreeting){
      els.agGreeting.textContent = "Pleasure to Meet You, " + title;
    }

    if(els.agGreetingSub){
      els.agGreetingSub.textContent = veteran
        ? (comp.headline || "Thank you for your service. Let's explore your PCSUnited guidance flow and build a clearer strategy together.")
        : "Let's explore your PCSUnited guidance flow and build a clearer PCS strategy together.";
    }

    if(veteran){

      if(els.agBasePayLabel) els.agBasePayLabel.textContent = "Retirement";
      if(els.agBahLabel) els.agBahLabel.textContent = "Disability";

      if(els.agBasePay) els.agBasePay.textContent = money(comp.retirementPay);
      if(els.agBah) els.agBah.textContent = money(comp.disabilityPay);
      if(els.agTotal) els.agTotal.textContent = money(comp.total);

    }else{

      if(els.agBasePayLabel) els.agBasePayLabel.textContent = "Base Pay";
      if(els.agBahLabel) els.agBahLabel.textContent = "BAH";

      if(els.agBasePay) els.agBasePay.textContent = money(comp.basePay);
      if(els.agBah) els.agBah.textContent = money(comp.bah);
      if(els.agTotal) els.agTotal.textContent = money(comp.total);
    }

    if(els.agAccuracyNote){
      const note = veteran ? accuracyNoteText(comp) : "";
      els.agAccuracyNote.textContent = note;
      els.agAccuracyNote.style.display = note ? "block" : "none";
    }

    preserveScroll(function(){
      root.classList.add("is-guidance-ready");
    }, false);
  }

  function emitComp(state,comp){

    const selectedBase = buildSelectedBase(state);
    const profileStatus = profileStatusFromComp(comp);

    const profile = {
      ...state,
      profile_status:profileStatus
    };

    const bridge = {
      ...profile,
      compensation:comp || null
    };

    if(mode === "veteran"){

      bridge.retirementPay = comp ? comp.retirementPay : 0;
      bridge.disabilityPay = comp ? comp.disabilityPay : 0;
      bridge.otherPay = comp ? (comp.otherPay || 0) : 0;
      bridge.totalMonthlyCompensation = comp ? comp.total : 0;
      bridge.compensationAccuracy = comp ? comp.compensationAccuracy : "";
      bridge.retirementBaseMethod = comp ? comp.retirementBaseMethod : "";

    }else{

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
      compensation:comp || null,
      calculated_comp:comp || null
    };

    window.PCSU_BASICBRAIN_TEMP = basicbrain;
    window.PCSU_BASICBRAIN_CURRENT = basicbrain;

    saveHandoff(profile,bridge,selectedBase,comp,basicbrain);

    dispatchSafe("pcsunited:basicbrain-updated",{
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation:comp || null,
      autoNavigate:false
    });

    dispatchSafe("pcsunited:profile-ready",{
      ...profile,
      autoNavigate:false
    });

    dispatchSafe("pcsunited:bridge-ready",{
      ...bridge,
      autoNavigate:false
    });

    if(mode === "active_duty"){
      dispatchSafe("pcsunited:base-preview-ready",{
        selectedBase,
        profile,
        bridge,
        compensation:comp || null,
        autoNavigate:false,
        source:"basicbrain-comp-preview"
      });
    }

    if(comp){

      if(mode === "veteran"){

        dispatchSafe("pcsunited:compensation-ready",{
          source:"pcsunited.basicbrain.combined.v6.1.6.veteran",
          mode:"veteran",

          profile,
          bridge,
          selectedBase,

          compensation:comp,

          retirementPay:comp.retirementPay,
          retirement_pay:comp.retirementPay,

          disabilityPay:comp.disabilityPay,
          disability_pay:comp.disabilityPay,

          otherPay:comp.otherPay || 0,
          other_pay:comp.otherPay || 0,

          total:comp.total,
          totalMonthly:comp.total,
          total_monthly:comp.total,

          compensationAccuracy:comp.compensationAccuracy,
          retirementBaseMethod:comp.retirementBaseMethod,
          headline:comp.headline,

          autoNavigate:false,
          updated_at:new Date().toISOString()
        });

      }else{

        dispatchSafe("pcsunited:compensation-ready",{
          source:"pcsunited.basicbrain.combined.v6.1.6.active_duty",
          mode:"active_duty",

          profile,
          bridge,
          selectedBase,

          compensation:comp,

          basePay:comp.basePay,
          base_pay:comp.basePay,

          bas:comp.bas,
          bah:comp.bah,

          total:comp.total,
          totalMonthly:comp.total,
          total_monthly:comp.total,

          autoNavigate:false,
          updated_at:new Date().toISOString()
        });
      }

      paintAmyGuidance(state,comp);
    }

    postMessageSafe({
      type:"pcsunited-basicbrain",
      source:"pcsunited.basicbrain.combined.v6.1.6",
      basicbrain,
      profile,
      bridge,
      selectedBase,
      compensation:comp || null,
      autoNavigate:false
    });

    lastGoodState = state;
    lastGoodComp = comp;
  }

  async function runFlow(){

    const seq = ++requestSeq;
    const state = getState();

    preserveScroll(function(){
      root.classList.remove("is-guidance-ready");
    }, false);

    emitProfileOnly({ save:true });

    if(!isComplete(state)){

      setStatus(
        mode === "veteran"
          ? "Complete all veteran fields to calculate compensation."
          : "Complete all PCS fields to calculate compensation.",
        true
      );

      return;
    }

    setStatus(
      mode === "veteran"
        ? "TheWing.ai is calculating your veteran compensation..."
        : "TheWing.ai is calculating your PCS compensation preview...",
      true
    );

    let comp = null;

    try{
      comp = await callTheWing(state);
    }catch(err){
      console.warn("BasicBrain flow failed:",err);
      comp = null;
    }

    if(seq !== requestSeq) return;

    if(mode === "veteran"){

      if(!comp || !hasVeteranComp(comp)){
        setStatus("Unable to calculate veteran compensation right now.",true);
        return;
      }

      emitComp(state,comp);
      setStatus("",false);
      return;
    }

    if(!comp || !hasActiveDutyComp(comp)){
      setStatus("TheWing did not return compensation for this combination yet.",true);
      return;
    }

    emitComp(state,comp);
    setStatus("",false);
  }

  function scheduleRun(event){

    const isBaseChange =
      !!(event && event.target && els.base && event.target === els.base);

    window.clearTimeout(runTimer);

    if(isBaseChange){
      logScrollDebug("bb-base-change:scheduled", {
        base:els.base ? els.base.value : ""
      });

      runTimer = window.setTimeout(function(){
        withScrollLock(runFlow, "bb-base-change");
      }, 350);

      return;
    }

    runTimer = window.setTimeout(runFlow, 350);
  }

  function openBaseDemoFromAmy(){

    const current = window.PCSU_BASICBRAIN_CURRENT || window.PCSU_BASICBRAIN_TEMP || null;

    if(!current || !current.selectedBase || !current.selectedBase.base){
      setStatus("Select a gaining base first, then open Base Demo.",true);
      return;
    }

    dispatchSafe("pcsu:base-selected",{
      ...current.selectedBase,
      profile:current.profile || null,
      bridge:current.bridge || null,
      compensation:current.compensation || current.calculated_comp || null,
      autoNavigate:true,
      source:"amy-guidance-base-demo-click",
      updated_at:new Date().toISOString()
    });
  }

  function enableAmyFlowClicks(){

    const cards = root.querySelectorAll(".ag-flow-card");
    if(!cards || !cards.length) return;

    const baseDemoCard = cards[0];

    if(baseDemoCard){
      baseDemoCard.style.cursor = "pointer";
      baseDemoCard.setAttribute("role","button");
      baseDemoCard.setAttribute("tabindex","0");
      baseDemoCard.setAttribute("aria-label","Open Base Demographics");

      baseDemoCard.addEventListener("click",openBaseDemoFromAmy);

      baseDemoCard.addEventListener("keydown",function(event){
        if(event.key === "Enter" || event.key === " "){
          event.preventDefault();
          openBaseDemoFromAmy();
        }
      });
    }
  }

  ensureShellCompatibility();
  populateSelects();

  allFields().forEach(function(el){

    if(!el) return;

    el.value = el === els.retirement ? "HIGH3" : "";

    el.addEventListener("change",scheduleRun);
    el.addEventListener("input",scheduleRun);
  });

  if(els.modeToggle){
    els.modeToggle.addEventListener("click",function(){
      setMode(mode === "active_duty" ? "veteran" : "active_duty");
    });
  }

  enableAmyFlowClicks();

  window.PCSU_BASICBRAIN = {
    version:VERSION,
    storage:"memory_only_with_page_handoff",
    endpoint:BRAIN_ENDPOINT,

    getMode:function(){
      return mode;
    },

    setMode:function(nextMode){
      setMode(nextMode);
    },

    getState:getState,

    emit:runFlow,

    showInput:function(){
      root.classList.remove("is-guidance-ready");
    },

    showGuidance:function(){
      if(lastGoodState && lastGoodComp){
        paintAmyGuidance(lastGoodState,lastGoodComp);
      }
    },

    openBaseDemo:function(){
      openBaseDemoFromAmy();
    },

    getLastGood:function(){
      return {
        mode,
        state:lastGoodState,
        compensation:lastGoodComp
      };
    },

    clear:function(){
      clearValues();
      clearHandoff();
      emitProfileOnly({ save:false });
    },

    logScrollDebug:logScrollDebug
  };

  setMode("active_duty");

})();
</script>
