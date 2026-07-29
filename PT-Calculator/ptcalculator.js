(() => {
  const root = document.getElementById("af-pt-shell");
  if (!root) return;

  //#1) ELEMENTS
  const els = {
    gender: root.querySelector("#gender"),
    ageGroup: root.querySelector("#ageGroup"),
    heightSlider: root.querySelector("#heightSlider"),
    heightValue: root.querySelector("#heightValue"),

    cardioEvent: root.querySelector("#cardioEvent"),
    strengthEvent: root.querySelector("#strengthEvent"),
    enduranceEvent: root.querySelector("#enduranceEvent"),

    waistSlider: root.querySelector("#waistSlider"),
    strengthSlider: root.querySelector("#strengthSlider"),
    coreSlider: root.querySelector("#coreSlider"),
    cardioSlider: root.querySelector("#cardioSlider"),

    waistValue: root.querySelector("#waistValue"),
    strengthValue: root.querySelector("#strengthValue"),
    coreValue: root.querySelector("#coreValue"),
    cardioValue: root.querySelector("#cardioValue"),

    strengthModeLabel: root.querySelector("#strengthModeLabel"),
    coreModeLabel: root.querySelector("#coreModeLabel"),
    cardioModeLabel: root.querySelector("#cardioModeLabel"),

    ratioValue: root.querySelector("#ratioValue"),
    bodyCompScoreText: root.querySelector("#bodyCompScoreText"),

    barBody: root.querySelector("#barBody"),
    barStrength: root.querySelector("#barStrength"),
    barCore: root.querySelector("#barCore"),
    barCardio: root.querySelector("#barCardio"),

    scoreRing: root.querySelector("#scoreRing"),
    scoreNumber: root.querySelector("#scoreNumber"),
    scoreLabel: root.querySelector("#scoreLabel"),
    nextAssessment: root.querySelector("#nextAssessment"),

    insightList: root.querySelector("#insightList"),

    waistMeta: root.querySelector("#waistMeta"),
    strengthMeta: root.querySelector("#strengthMeta"),
    coreMeta: root.querySelector("#coreMeta"),
    cardioMeta: root.querySelector("#cardioMeta"),

    strengthTicks: root.querySelector("#strengthTicks"),
    coreTicks: root.querySelector("#coreTicks"),
    cardioTicks: root.querySelector("#cardioTicks")
  };

  //#2) CONFIG
  const DEBUG = false;

  const POLICY = {
    satisfactoryMonths: 6,
    unsatMonths: 3
  };

  const SCORE_CAPS = {
    body: 20,
    strength: 15,
    core: 15,
    cardio: 50,
    total: 100
  };

  const MIN_PASS = {
    strength: 2.5,
    core: 2.5,
    cardio: 35.0,
    bodyMaxRatio: 0.59
  };

  const ORDER = [
    "under25_male","under25_female",
    "25-29_male","25-29_female",
    "30-34_male","30-34_female",
    "35-39_male","35-39_female",
    "40-44_male","40-44_female",
    "45-49_male","45-49_female",
    "50-54_male","50-54_female",
    "55-59_male","55-59_female",
    "60plus_male","60plus_female"
  ];

  //#3) HELPERS
  function clamp(value, min, max){
    return Math.min(Math.max(value, min), max);
  }

  function toSeconds(mmss){
    if (typeof mmss === "number") return mmss;
    let s = String(mmss).trim().replace("*", "");
    if (s.startsWith(":")) s = "0" + s;
    const parts = s.split(":");
    return (Number(parts[0]) * 60) + Number(parts[1]);
  }

  function formatTime(seconds){
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function formatInches(value){
    return `${Number(value).toFixed(1)} in`;
  }

  function setSliderFill(slider){
    if (!slider) return;
    const min = Number(slider.min);
    const max = Number(slider.max);
    const val = Number(slider.value);
    const pct = ((val - min) / (max - min || 1)) * 100;
    slider.style.setProperty("--fill", `${pct}%`);
  }

  function normalizeAgeKey(label){
    const raw = String(label).replace(/–/g, "-").trim().toLowerCase();
    if (raw.includes("under")) return "under25";
    if (raw.includes("60")) return "60plus";
    return raw;
  }

  function buildMap(arr){
    const out = {};
    ORDER.forEach((key, i) => {
      out[key] = arr[i];
    });
    return out;
  }

  function pairKey(){
    return `${normalizeAgeKey(els.ageGroup?.value || "")}_${els.gender?.value || ""}`;
  }

  function setTickLabels(container, labels){
    if (!container) return;
    const spans = container.querySelectorAll("span");
    spans.forEach((span, i) => {
      span.textContent = labels[i] ?? "";
    });
  }

  function buildLinearNumberTicks(minValue, maxValue){
    const values = [
      minValue,
      Math.round(minValue + ((maxValue - minValue) * 0.2)),
      Math.round(minValue + ((maxValue - minValue) * 0.4)),
      Math.round(minValue + ((maxValue - minValue) * 0.6)),
      Math.round(minValue + ((maxValue - minValue) * 0.8)),
      Math.round(maxValue)
    ];
    return values.map(String);
  }

  function buildTimeTicks(minSec, maxSec){
    const steps = 6;
    const out = [];
    for (let i = 0; i < steps; i += 1){
      const ratio = i / (steps - 1);
      const value = Math.round(minSec + ((maxSec - minSec) * ratio));
      out.push(formatTime(value));
    }
    return out;
  }

  function safeText(node, value){
    if (node) node.textContent = value;
  }

  function safeHtml(node, value){
    if (node) node.innerHTML = value;
  }

  function debugLog(...args){
    if (DEBUG) console.log("[AF-PT]", ...args);
  }

  function lookupMissingWarning(componentName){
    return `Missing ${componentName} standard for selected age/gender.`;
  }

  //#4) OFFICIAL TABLES — PFRA Scoring Charts effective 1 MAR 26 (DAFMAN 36-2905)
  const TABLES = {
    // PFRA Scoring Charts p.2 — Push-Up Scoring Standards (reps)
    push: {
      max: buildMap([67,50,63,47,60,44,56,42,52,39,49,36,45,34,42,31,38,28]),
      min: buildMap([30,15,28,14,26,12,23,11,21,10,19,8,17,7,14,5,12,3]),
      rows: [
        [15, buildMap([67,50,63,47,60,44,56,42,52,39,49,36,45,34,42,31,38,28])],
        [14.5, buildMap([66,49,62,46,59,42,55,41,51,38,47,35,44,33,41,30,37,27])],
        [14, buildMap([64,47,60,44,57,41,53,40,50,37,46,34,43,32,40,29,36,26])],
        [13.5, buildMap([63,46,59,43,56,40,52,38,49,36,45,33,42,31,39,28,35,25])],
        [13, buildMap([61,44,57,42,55,39,51,37,48,35,44,32,41,30,38,27,34,24])],
        [12.5, buildMap([60,43,56,40,53,37,49,36,46,33,43,30,39,29,36,26,33,23])],
        [12, buildMap([58,42,55,39,52,36,48,35,45,32,42,29,38,28,35,25,32,22])],
        [11.5, buildMap([57,40,53,38,51,35,47,33,44,31,40,28,37,26,34,24,31,21])],
        [11, buildMap([55,39,52,36,49,34,45,32,42,30,39,27,36,25,33,23,30,20])],
        [10.5, buildMap([54,37,50,35,48,32,44,31,41,29,38,26,35,24,32,22,29,19])],
        [10, buildMap([52,36,49,34,47,31,43,30,40,27,37,25,34,23,31,21,28,18])],
        [9.5, buildMap([51,35,48,32,45,30,41,28,39,26,36,24,33,22,30,20,27,17])],
        [9, buildMap([49,33,46,31,44,29,40,27,37,25,35,23,32,21,29,19,26,16])],
        [8.5, buildMap([48,32,45,30,43,27,39,26,36,24,33,21,30,20,27,17,24,15])],
        [8, buildMap([46,30,43,29,41,26,38,25,35,23,32,20,29,19,26,16,23,14])],
        [7.5, buildMap([45,29,42,27,40,25,36,23,33,21,31,19,28,18,25,15,22,13])],
        [7, buildMap([43,28,41,26,39,24,35,22,32,20,30,18,27,17,24,14,21,12])],
        [6.5, buildMap([42,26,39,25,37,22,34,21,31,19,29,17,26,16,23,13,20,11])],
        [6, buildMap([40,25,38,23,36,21,32,20,30,18,28,16,25,15,22,12,19,10])],
        [5.5, buildMap([39,23,36,22,35,20,31,18,28,17,26,15,24,13,21,11,18,9])],
        [5, buildMap([37,22,35,21,33,19,30,17,27,15,25,14,23,12,20,10,17,8])],
        [4.5, buildMap([36,21,34,19,32,17,28,16,26,14,24,12,21,11,18,9,16,7])],
        [4, buildMap([34,19,32,18,31,16,27,15,24,13,23,11,20,10,17,8,15,6])],
        [3.5, buildMap([33,18,31,17,29,15,26,13,23,12,22,10,19,9,16,7,14,5])],
        [3, buildMap([31,16,29,15,26,14,24,12,22,11,21,9,18,8,15,6,13,4])],
        [2.5, buildMap([30,15,28,14,26,12,23,11,21,10,19,8,17,7,14,5,12,3])],
      ]
    },
    // PFRA Scoring Charts p.3 — Hand Release Push-Up Scoring Standards (reps)
    hrpu: {
      max: buildMap([52,42,50,40,48,38,46,36,44,34,42,32,40,30,38,28,36,26]),
      min: buildMap([27,17,25,15,23,13,21,11,19,9,17,7,15,5,13,3,11,1]),
      rows: [
        [15, buildMap([52,42,50,40,48,38,46,36,44,34,42,32,40,30,38,28,36,26])],
        [14.5, buildMap([51,41,49,39,47,37,45,35,43,33,41,31,39,29,37,27,35,25])],
        [14, buildMap([50,40,48,38,46,36,44,34,42,32,40,30,38,28,36,26,34,24])],
        [13.5, buildMap([49,39,47,37,45,35,43,33,41,31,39,29,37,27,35,25,33,23])],
        [13, buildMap([48,38,46,36,44,34,42,32,40,30,38,28,36,26,34,24,32,22])],
        [12.5, buildMap([47,37,45,35,43,33,41,31,39,29,37,27,35,25,33,23,31,21])],
        [12, buildMap([46,36,44,34,42,32,40,30,38,28,36,26,34,24,32,22,30,20])],
        [11.5, buildMap([45,35,43,33,41,31,39,29,37,27,35,25,33,23,31,21,29,19])],
        [11, buildMap([44,34,42,32,40,30,38,28,36,26,34,24,32,22,30,20,28,18])],
        [10.5, buildMap([43,33,41,31,39,29,37,27,35,25,33,23,31,21,29,19,27,17])],
        [10, buildMap([42,32,40,30,38,28,36,26,34,24,32,22,30,20,28,18,26,16])],
        [9.5, buildMap([41,31,39,29,37,27,35,25,33,23,31,21,29,19,27,17,25,15])],
        [9, buildMap([40,30,38,28,36,26,34,24,32,22,30,20,28,18,26,16,24,14])],
        [8.5, buildMap([39,29,37,27,35,25,33,23,31,21,29,19,27,17,25,15,23,13])],
        [8, buildMap([38,28,36,26,34,24,32,22,30,20,28,18,26,16,24,14,22,12])],
        [7.5, buildMap([37,27,35,25,33,23,31,21,29,19,27,17,25,15,23,13,21,11])],
        [7, buildMap([36,26,34,24,32,22,30,20,28,18,26,16,24,14,22,12,20,10])],
        [6.5, buildMap([35,25,33,23,31,21,29,19,27,17,25,15,23,13,21,11,19,9])],
        [6, buildMap([34,24,32,22,30,20,28,18,26,16,24,14,22,12,20,10,18,8])],
        [5.5, buildMap([33,23,31,21,29,19,27,17,25,15,23,13,21,11,19,9,17,7])],
        [5, buildMap([32,22,30,20,28,18,26,16,24,14,22,12,20,10,18,8,16,6])],
        [4.5, buildMap([31,21,29,19,27,17,25,15,23,13,21,11,19,9,17,7,15,5])],
        [4, buildMap([30,20,28,18,26,16,24,14,22,12,20,10,18,8,16,6,14,4])],
        [3.5, buildMap([29,19,27,17,25,15,23,13,21,11,19,9,17,7,15,5,13,3])],
        [3, buildMap([28,18,26,16,24,14,22,12,20,10,18,8,16,6,14,4,12,2])],
        [2.5, buildMap([27,17,25,15,23,13,21,11,19,9,17,7,15,5,13,3,11,1])],
      ]
    },
    // PFRA Scoring Charts p.4 — Sit-Up Scoring Standards (reps)
    situp: {
      max: buildMap([58,54,56,50,54,45,52,43,50,41,48,35,46,34,44,32,42,31]),
      min: buildMap([33,29,31,25,29,20,27,18,25,16,23,10,21,9,19,7,17,6]),
      rows: [
        [15, buildMap([58,54,56,50,54,45,52,43,50,41,48,35,46,34,44,32,42,31])],
        [14.5, buildMap([57,53,55,49,53,44,51,42,49,40,47,34,45,33,43,31,41,30])],
        [14, buildMap([56,52,54,48,52,43,50,41,48,39,46,33,44,32,42,30,40,29])],
        [13.5, buildMap([55,51,53,47,51,42,49,40,47,38,45,32,43,31,41,29,39,28])],
        [13, buildMap([54,50,52,46,50,41,48,39,46,37,44,31,42,30,40,28,38,27])],
        [12.5, buildMap([53,49,51,45,49,40,47,38,45,36,43,30,41,29,39,27,37,26])],
        [12, buildMap([52,48,50,44,48,39,46,37,44,35,42,29,40,28,38,26,36,25])],
        [11.5, buildMap([51,47,49,43,47,38,45,36,43,34,41,28,39,27,37,25,35,24])],
        [11, buildMap([50,46,48,42,46,37,44,35,42,33,40,27,38,26,36,24,34,23])],
        [10.5, buildMap([49,45,47,41,45,36,43,34,41,32,39,26,37,25,35,23,33,22])],
        [10, buildMap([48,44,46,40,44,35,42,33,40,31,38,25,36,24,34,22,32,21])],
        [9.5, buildMap([47,43,45,39,43,34,41,32,39,30,37,24,35,23,33,21,31,20])],
        [9, buildMap([46,42,44,38,42,33,40,31,38,29,36,23,34,22,32,20,30,19])],
        [8.5, buildMap([45,41,43,37,41,32,39,30,37,28,35,22,33,21,31,19,29,18])],
        [8, buildMap([44,40,42,36,40,31,38,29,36,27,34,21,32,20,30,18,28,17])],
        [7.5, buildMap([43,39,41,35,39,30,37,28,35,26,33,20,31,19,29,17,27,16])],
        [7, buildMap([42,38,40,34,38,29,36,27,34,25,32,19,30,18,28,16,26,15])],
        [6.5, buildMap([41,37,39,33,37,28,35,26,33,24,31,18,29,17,27,15,25,14])],
        [6, buildMap([40,36,38,32,36,27,34,25,32,23,30,17,28,16,26,14,24,13])],
        [5.5, buildMap([39,35,37,31,35,26,33,24,31,22,29,16,27,15,25,13,23,12])],
        [5, buildMap([38,34,36,30,34,25,32,23,30,21,28,15,26,14,24,12,22,11])],
        [4.5, buildMap([37,33,35,29,33,24,31,22,29,20,27,14,25,13,23,11,21,10])],
        [4, buildMap([36,32,34,28,32,23,30,21,28,19,26,13,24,12,22,10,20,9])],
        [3.5, buildMap([35,31,33,27,31,22,29,20,27,18,25,12,23,11,21,9,19,8])],
        [3, buildMap([34,30,32,26,30,21,28,19,26,17,24,11,22,10,20,8,18,7])],
        [2.5, buildMap([33,29,31,25,29,20,27,18,25,16,23,10,21,9,19,7,17,6])],
      ]
    },
    // PFRA Scoring Charts p.5 — Cross-Leg Reverse Crunch Scoring Standards (reps)
    crunch: {
      max: buildMap([60,58,58,56,56,54,54,52,52,50,50,48,48,46,46,44,44,42]),
      min: buildMap([35,33,33,31,31,29,29,27,27,25,25,23,23,21,21,19,19,17]),
      rows: [
        [15, buildMap([60,58,58,56,56,54,54,52,52,50,50,48,48,46,46,44,44,42])],
        [14.5, buildMap([59,57,57,55,55,53,53,51,51,49,49,47,47,45,45,43,43,41])],
        [14, buildMap([58,56,56,54,54,52,52,50,50,48,48,46,46,44,44,42,42,40])],
        [13.5, buildMap([57,55,55,53,53,51,51,49,49,47,47,45,45,43,43,41,41,39])],
        [13, buildMap([56,54,54,52,52,50,50,48,48,46,46,44,44,42,42,40,40,38])],
        [12.5, buildMap([55,53,53,51,51,49,49,47,47,45,45,43,43,41,41,39,39,37])],
        [12, buildMap([54,52,52,50,50,48,48,46,46,44,44,42,42,40,40,38,38,36])],
        [11.5, buildMap([53,51,51,49,49,47,47,45,45,43,43,41,41,39,39,37,37,35])],
        [11, buildMap([52,50,50,48,48,46,46,44,44,42,42,40,40,38,38,36,36,34])],
        [10.5, buildMap([51,49,49,47,47,45,45,43,43,41,41,39,39,37,37,35,35,33])],
        [10, buildMap([50,48,48,46,46,44,44,42,42,40,40,38,38,36,36,34,34,32])],
        [9.5, buildMap([49,47,47,45,45,43,43,41,41,39,39,37,37,35,35,33,33,31])],
        [9, buildMap([48,46,46,44,44,42,42,40,40,38,38,36,36,34,34,32,32,30])],
        [8.5, buildMap([47,45,45,43,43,41,41,39,39,37,37,35,35,33,33,31,31,29])],
        [8, buildMap([46,44,44,42,42,40,40,38,38,36,36,34,34,32,32,30,30,28])],
        [7.5, buildMap([45,43,43,41,41,39,39,37,37,35,35,33,33,31,31,29,29,27])],
        [7, buildMap([44,42,42,40,40,38,38,36,36,34,34,32,32,30,30,28,28,26])],
        [6.5, buildMap([43,41,41,39,39,37,37,35,35,33,33,31,31,29,29,27,27,25])],
        [6, buildMap([42,40,40,38,38,36,36,34,34,32,32,30,30,28,28,26,26,24])],
        [5.5, buildMap([41,39,39,37,37,35,35,33,33,31,31,29,29,27,27,25,25,23])],
        [5, buildMap([40,38,38,36,36,34,34,32,32,30,30,28,28,26,26,24,24,22])],
        [4.5, buildMap([39,37,37,35,35,33,33,31,31,29,29,27,27,25,25,23,23,21])],
        [4, buildMap([38,36,36,34,34,32,32,30,30,28,28,26,26,24,24,22,22,20])],
        [3.5, buildMap([37,35,35,33,33,31,31,29,29,27,27,25,25,23,23,21,21,19])],
        [3, buildMap([36,34,34,32,32,30,30,28,28,26,26,24,24,22,22,20,20,18])],
        [2.5, buildMap([35,33,33,31,31,29,29,27,27,25,25,23,23,21,21,19,19,17])],
      ]
    },
    // PFRA Scoring Charts p.6 — Forearm Plank Scoring Standards (seconds)
    plank: {
      max: buildMap([220,215,215,210,210,205,205,200,200,195,195,190,190,185,185,180,180,175]),
      min: buildMap([95,90,90,85,85,80,80,75,75,70,70,65,65,60,60,55,55,50]),
      rows: [
        [15, buildMap([220,215,215,210,210,205,205,200,200,195,195,190,190,185,185,180,180,175])],
        [14.5, buildMap([215,210,210,205,205,200,200,195,195,190,190,185,185,180,180,175,175,170])],
        [14, buildMap([210,205,205,200,200,195,195,190,190,185,185,180,180,175,175,170,170,165])],
        [13.5, buildMap([205,200,200,195,195,190,190,185,185,180,180,175,175,170,170,165,165,160])],
        [13, buildMap([200,195,195,190,190,185,185,180,180,175,175,170,170,165,165,160,160,155])],
        [12.5, buildMap([195,190,190,185,185,180,180,175,175,170,170,165,165,160,160,155,155,150])],
        [12, buildMap([190,185,185,180,180,175,175,170,170,165,165,160,160,155,155,150,150,145])],
        [11.5, buildMap([185,180,180,175,175,170,170,165,165,160,160,155,155,150,150,145,145,140])],
        [11, buildMap([180,175,175,170,170,165,165,160,160,155,155,150,150,145,145,140,140,135])],
        [10.5, buildMap([175,170,170,165,165,160,160,155,155,150,150,145,145,140,140,135,135,130])],
        [10, buildMap([170,165,165,160,160,155,155,150,150,145,145,140,140,135,135,130,130,125])],
        [9.5, buildMap([165,160,160,155,155,150,150,145,145,140,140,135,135,130,130,125,125,120])],
        [9, buildMap([160,155,155,150,150,145,145,140,140,135,135,130,130,125,125,120,120,115])],
        [8.5, buildMap([155,150,150,145,145,140,140,135,135,130,130,125,125,120,120,115,115,110])],
        [8, buildMap([150,145,145,140,140,135,135,130,130,125,125,120,120,115,115,110,110,105])],
        [7.5, buildMap([145,140,140,135,135,130,130,125,125,120,120,115,115,110,110,105,105,100])],
        [7, buildMap([140,135,135,130,130,125,125,120,120,115,115,110,110,105,105,100,100,95])],
        [6.5, buildMap([135,130,130,125,125,120,120,115,115,110,110,105,105,100,100,95,95,90])],
        [6, buildMap([130,125,125,120,120,115,115,110,110,105,105,100,100,95,95,90,90,85])],
        [5.5, buildMap([125,120,120,115,115,110,110,105,105,100,100,95,95,90,90,85,85,80])],
        [5, buildMap([120,115,115,110,110,105,105,100,100,95,95,90,90,85,85,80,80,75])],
        [4.5, buildMap([115,110,110,105,105,100,100,95,95,90,90,85,85,80,80,75,75,70])],
        [4, buildMap([110,105,105,100,100,95,95,90,90,85,85,80,80,75,75,70,70,65])],
        [3.5, buildMap([105,100,100,95,95,90,90,85,85,80,80,75,75,70,70,65,65,60])],
        [3, buildMap([100,95,95,90,90,85,85,80,80,75,75,70,70,65,65,60,60,55])],
        [2.5, buildMap([95,90,90,85,85,80,80,75,75,70,70,65,65,60,60,55,55,50])],
      ]
    },
    // PFRA Scoring Charts p.7 — 2 Mile Run Scoring Standards (seconds)
    run: [
      [50, buildMap([805,930,815,955,822,970,836,972,845,1005,870,1015,909,1030,928,1063,1018,1100])],
      [49.5, buildMap([824,960,834,984,843,1000,858,1003,869,1035,894,1046,932,1063,952,1096,1039,1134])],
      [49, buildMap([843,989,853,1014,864,1031,880,1034,893,1066,918,1077,955,1096,977,1129,1060,1168])],
      [48, buildMap([862,1019,872,1043,885,1061,902,1065,917,1096,942,1108,978,1128,1001,1162,1081,1202])],
      [47, buildMap([881,1049,891,1072,906,1091,924,1096,941,1126,965,1139,1001,1161,1026,1194,1102,1236])],
      [46, buildMap([900,1078,910,1101,928,1121,946,1127,965,1157,989,1170,1024,1194,1050,1227,1124,1270])],
      [45, buildMap([919,1108,929,1131,949,1152,968,1157,989,1187,1013,1201,1047,1227,1074,1260,1145,1304])],
      [44, buildMap([938,1138,948,1160,970,1182,990,1188,1013,1217,1037,1232,1070,1259,1099,1293,1166,1338])],
      [43, buildMap([957,1167,967,1189,991,1212,1012,1219,1037,1248,1061,1263,1093,1292,1123,1326,1187,1372])],
      [42, buildMap([976,1197,986,1218,1012,1242,1034,1250,1061,1278,1085,1294,1116,1325,1148,1359,1208,1406])],
      [41, buildMap([995,1227,1005,1248,1033,1273,1056,1281,1085,1309,1109,1325,1140,1358,1172,1392,1229,1440])],
      [40, buildMap([1014,1256,1024,1277,1054,1303,1078,1312,1108,1339,1132,1356,1163,1390,1196,1424,1250,1474])],
      [39, buildMap([1033,1286,1043,1306,1075,1333,1100,1343,1132,1369,1156,1387,1186,1423,1221,1457,1271,1508])],
      [38.5, buildMap([1052,1315,1062,1335,1096,1363,1122,1374,1156,1400,1180,1418,1209,1456,1245,1490,1292,1542])],
      [38, buildMap([1071,1345,1081,1365,1117,1394,1144,1405,1180,1430,1204,1449,1232,1489,1270,1523,1313,1576])],
      [37.5, buildMap([1090,1375,1100,1394,1139,1424,1166,1436,1204,1460,1228,1480,1255,1521,1294,1556,1335,1610])],
      [37, buildMap([1109,1404,1119,1423,1160,1454,1188,1466,1228,1491,1252,1511,1278,1554,1318,1589,1347,1644])],
      [36.5, buildMap([1128,1434,1138,1452,1181,1484,1210,1497,1252,1521,1275,1542,1301,1587,1343,1621,1356,1678])],
      [36, buildMap([1147,1464,1157,1482,1202,1515,1232,1528,1276,1551,1299,1573,1324,1620,1367,1654,1398,1712])],
      [35.5, buildMap([1176,1493,1176,1511,1223,1545,1254,1559,1300,1582,1323,1604,1347,1652,1392,1687,1419,1746])],
      [35, buildMap([1185,1523,1195,1540,1244,1575,1276,1590,1324,1612,1347,1635,1370,1685,1416,1720,1440,1780])],
    ],
    // PFRA Scoring Charts p.8 — 20-Meter HAMR Scoring Standards (shuttles)
    hamr: [
      [50, buildMap([87,68,85,65,84,63,82,63,81,59,77,58,71,57,69,53,65,50])],
      [49.5, buildMap([84,65,82,62,81,60,79,60,77,56,73,55,68,53,66,50,62,47])],
      [49, buildMap([81,61,79,58,78,57,75,56,73,53,70,52,65,50,63,47,59,44])],
      [48, buildMap([78,58,76,55,75,53,72,53,70,50,67,49,62,47,60,44,56,41])],
      [47, buildMap([75,55,74,52,72,51,69,50,67,47,64,46,60,44,57,42,54,38])],
      [46, buildMap([72,52,71,50,69,48,66,47,64,45,61,44,57,42,55,39,52,36])],
      [45, buildMap([70,49,69,47,66,45,64,45,61,42,58,41,55,39,52,37,49,34])],
      [44, buildMap([67,46,66,44,63,43,61,42,58,40,56,39,53,37,50,34,47,32])],
      [43, buildMap([65,44,64,42,61,40,59,40,56,38,53,37,50,35,48,32,45,29])],
      [42, buildMap([63,41,62,40,59,38,56,37,53,35,51,34,48,32,45,30,43,27])],
      [41, buildMap([60,39,59,38,56,36,54,35,51,33,49,32,46,30,43,28,41,26])],
      [40, buildMap([58,37,57,36,54,34,52,33,49,31,47,30,44,28,41,26,39,24])],
      [39, buildMap([56,35,55,34,52,32,50,31,47,30,45,29,42,26,40,25,38,22])],
      [38.5, buildMap([54,33,53,32,50,30,48,29,45,28,43,27,40,25,38,23,36,20])],
      [38, buildMap([52,31,52,30,48,28,46,28,43,26,41,25,39,23,36,21,34,19])],
      [37.5, buildMap([51,29,50,28,46,26,44,26,41,24,39,23,37,21,34,20,33,18])],
      [37, buildMap([49,28,48,26,44,25,42,24,39,23,37,22,35,20,33,18,31,17])],
      [36.5, buildMap([47,26,46,25,43,23,40,23,37,21,36,20,34,18,31,17,30,14])],
      [36, buildMap([46,24,45,23,41,22,39,21,36,20,34,19,32,17,30,15,28,13])],
      [35.5, buildMap([44,23,43,22,39,20,37,20,34,19,32,18,31,16,28,14,27,12])],
      [35, buildMap([42,21,42,20,38,19,36,18,32,17,31,16,30,14,27,13,26,11])],
    ],

    // PFRA Scoring Charts p.1 — Waist-to-Height Ratio (WHtR) Scoring Standards
    whtr: [
      { maxRatio: 0.49, points: 20.0 },
      { maxRatio: 0.50, points: 19.0 },
      { maxRatio: 0.51, points: 18.0 },
      { maxRatio: 0.52, points: 17.0 },
      { maxRatio: 0.53, points: 16.0 },
      { maxRatio: 0.54, points: 15.0 },
      { maxRatio: 0.55, points: 12.5 },
      { maxRatio: 0.56, points: 10.0 },
      { maxRatio: 0.57, points: 7.5 },
      { maxRatio: 0.58, points: 5.0 },
      { maxRatio: 0.59, points: 2.5, isMin: true }
    ]
  };

  //#5) RULE HELPERS
  function scoreCategory(total, minimumsMet){
    if (!minimumsMet) return "Unsatisfactory";
    if (total >= 90) return "Excellent";
    if (total >= 75) return "Satisfactory";
    return "Unsatisfactory";
  }

  function nextAssessmentText(total, minimumsMet){
    return (minimumsMet && total >= 75)
      ? `Next assessment<br>in ${POLICY.satisfactoryMonths} months`
      : `Next assessment<br>in ${POLICY.unsatMonths} months`;
  }

  function roundWHtR(ratio){
    return Math.round(Number(ratio) * 100) / 100;
  }

  function getWHtRScore(ratio){
    const rounded = roundWHtR(ratio);
    if (rounded >= 0.60) return 0.0;
    for (const row of TABLES.whtr){
      if (rounded <= row.maxRatio) return row.points;
    }
    return 0.0;
  }

  function bodyCompositionPassed(ratio){
    return roundWHtR(ratio) <= MIN_PASS.bodyMaxRatio;
  }

  function scoreHigherBetter(value, rows, key){
    if (!rows || !rows.length) return null;
    for (const [pts, map] of rows){
      const threshold = map?.[key];
      if (!Number.isFinite(threshold)) continue;
      if (value >= threshold) return pts;
    }
    return 0.0;
  }

  function scoreTimeLowerBetter(sec, rows, key){
    if (!rows || !rows.length) return null;
    for (const [pts, map] of rows){
      const threshold = map?.[key];
      if (!Number.isFinite(threshold)) continue;
      if (sec <= threshold) return pts;
    }
    return 0.0;
  }

  function scoreFromTable(table, key, value, direction){
    if (!table?.rows) return null;
    return direction === "lower"
      ? scoreTimeLowerBetter(value, table.rows, key)
      : scoreHigherBetter(value, table.rows, key);
  }

  function componentMinimumsMet(flags){
    return (
      flags.bodyPassed &&
      flags.strengthPassed &&
      flags.corePassed &&
      flags.cardioPassed
    );
  }

  function getCurrentStrengthBounds(){
    const key = pairKey();
    const table = els.strengthEvent?.value.includes("Hand-Release") ? TABLES.hrpu : TABLES.push;

    return {
      mode: table === TABLES.hrpu ? "hrpu" : "push",
      table,
      type: "reps",
      min: 0,
      sliderMax: (table.max[key] || 0) + 15,
      top: table.max[key],
      passMin: table.min[key]
    };
  }

  function getCurrentCoreBounds(){
    const key = pairKey();

    if (els.enduranceEvent?.value.includes("Cross-Legged")){
      return {
        mode: "crunch",
        table: TABLES.crunch,
        type: "reps",
        min: 0,
        sliderMax: (TABLES.crunch.max[key] || 0) + 10,
        top: TABLES.crunch.max[key],
        passMin: TABLES.crunch.min[key]
      };
    }

    if (els.enduranceEvent?.value.includes("Plank")){
      return {
        mode: "plank",
        table: TABLES.plank,
        type: "time",
        min: 0,
        sliderMax: TABLES.plank.max[key] || 0,
        top: TABLES.plank.max[key],
        passMin: TABLES.plank.min[key]
      };
    }

    return {
      mode: "situp",
      table: TABLES.situp,
      type: "reps",
      min: 0,
      sliderMax: (TABLES.situp.max[key] || 0) + 10,
      top: TABLES.situp.max[key],
      passMin: TABLES.situp.min[key]
    };
  }

  function getCurrentCardioBounds(){
    const key = pairKey();

    if (els.cardioEvent?.value.includes("HAMR")){
      const top = TABLES.hamr[0][1][key];
      const passMin = TABLES.hamr[TABLES.hamr.length - 1][1][key];
      return {
        mode: "hamr",
        table: TABLES.hamr,
        type: "hamr",
        min: 0,
        sliderMax: (top || 0) + 10,
        top,
        passMin
      };
    }

    const top = TABLES.run[0][1][key];
    const passMin = TABLES.run[TABLES.run.length - 1][1][key];
    return {
      mode: "run",
      table: TABLES.run,
      type: "run",
      min: top,
      sliderMax: (passMin || 0) + 300,
      top,
      passMin
    };
  }

  function validateSelectionState(){
    const warnings = [];
    const key = pairKey();

    if (!ORDER.includes(key)){
      warnings.push("Selected age/gender pair is not supported.");
    }

    const strengthBounds = getCurrentStrengthBounds();
    if (!Number.isFinite(strengthBounds.top) || !Number.isFinite(strengthBounds.passMin)){
      warnings.push(lookupMissingWarning("strength"));
    }

    const coreBounds = getCurrentCoreBounds();
    if (!Number.isFinite(coreBounds.top) || !Number.isFinite(coreBounds.passMin)){
      warnings.push(lookupMissingWarning("core"));
    }

    const cardioBounds = getCurrentCardioBounds();
    if (!Number.isFinite(cardioBounds.top) || !Number.isFinite(cardioBounds.passMin)){
      warnings.push(lookupMissingWarning("cardio"));
    }

    return warnings;
  }

  //#6) UI RANGE / TICKS
  function updateRangeMeta(){
    const height = Number(els.heightSlider?.value || 0);

    const waistBest = 0.49 * height;
    const waistMinPass = MIN_PASS.bodyMaxRatio * height;
    safeText(els.waistMeta, `Best: ≤ ${formatInches(waistBest)} • Minimum Passing: ≤ ${formatInches(waistMinPass)}`);

    const strengthBounds = getCurrentStrengthBounds();
    safeText(els.strengthMeta, `Best: ${strengthBounds.top} reps • Minimum Passing: ${strengthBounds.passMin} reps`);

    const coreBounds = getCurrentCoreBounds();
    if (coreBounds.type === "time") {
      safeText(els.coreMeta, `Best: ${formatTime(coreBounds.top)} • Minimum Passing: ${formatTime(coreBounds.passMin)}`);
    } else {
      safeText(els.coreMeta, `Best: ${coreBounds.top} reps • Minimum Passing: ${coreBounds.passMin} reps`);
    }

    const cardioBounds = getCurrentCardioBounds();
    if (cardioBounds.type === "hamr") {
      safeText(els.cardioMeta, `Best: ${cardioBounds.top} shuttles • Minimum Passing: ${cardioBounds.passMin} shuttles`);
    } else {
      safeText(els.cardioMeta, `Best: ${formatTime(cardioBounds.top)} • Minimum Passing: ${formatTime(cardioBounds.passMin)}`);
    }
  }

  function updateTickRows(){
    const strengthBounds = getCurrentStrengthBounds();
    setTickLabels(els.strengthTicks, buildLinearNumberTicks(strengthBounds.min, strengthBounds.sliderMax));

    const coreBounds = getCurrentCoreBounds();
    if (coreBounds.type === "time"){
      setTickLabels(els.coreTicks, buildTimeTicks(coreBounds.min, coreBounds.sliderMax));
    } else {
      setTickLabels(els.coreTicks, buildLinearNumberTicks(coreBounds.min, coreBounds.sliderMax));
    }

    const cardioBounds = getCurrentCardioBounds();
    if (cardioBounds.type === "hamr"){
      setTickLabels(els.cardioTicks, buildLinearNumberTicks(cardioBounds.min, cardioBounds.sliderMax));
    } else {
      setTickLabels(els.cardioTicks, buildTimeTicks(cardioBounds.min, cardioBounds.sliderMax));
    }
  }

  function normalizeCurrentValues(){
    const strengthBounds = getCurrentStrengthBounds();
    const coreBounds = getCurrentCoreBounds();
    const cardioBounds = getCurrentCardioBounds();

    if (els.strengthSlider){
      els.strengthSlider.value = String(clamp(Number(els.strengthSlider.value), strengthBounds.min, strengthBounds.sliderMax));
    }
    if (els.coreSlider){
      els.coreSlider.value = String(clamp(Number(els.coreSlider.value), coreBounds.min, coreBounds.sliderMax));
    }
    if (els.cardioSlider){
      els.cardioSlider.value = String(clamp(Number(els.cardioSlider.value), cardioBounds.min, cardioBounds.sliderMax));
    }
  }

  function updateEventRanges(){
    const strengthBounds = getCurrentStrengthBounds();
    if (els.strengthSlider){
      els.strengthSlider.min = strengthBounds.min;
      els.strengthSlider.max = strengthBounds.sliderMax;
      els.strengthSlider.step = 1;
    }

    const coreBounds = getCurrentCoreBounds();
    if (els.coreSlider){
      els.coreSlider.min = coreBounds.min;
      els.coreSlider.max = coreBounds.sliderMax;
      els.coreSlider.step = coreBounds.type === "time" ? 5 : 1;
    }

    const cardioBounds = getCurrentCardioBounds();
    if (els.cardioSlider){
      els.cardioSlider.min = cardioBounds.min;
      els.cardioSlider.max = cardioBounds.sliderMax;
      els.cardioSlider.step = 1;
    }

    normalizeCurrentValues();
    updateTickRows();
  }

  //#7) SCORING ENGINE
  function computeScores(){
    const warnings = validateSelectionState();
    const key = pairKey();

    const height = Number(els.heightSlider?.value || 0);
    const waist = Number(els.waistSlider?.value || 0);
    const strength = Number(els.strengthSlider?.value || 0);
    const core = Number(els.coreSlider?.value || 0);
    const cardio = Number(els.cardioSlider?.value || 0);

    const ratio = height > 0 ? waist / height : 0;
    const roundedRatio = roundWHtR(ratio);
    const bodyScoreRaw = getWHtRScore(ratio);
    const bodyScore = bodyScoreRaw === null ? 0 : bodyScoreRaw;
    const bodyPassed = bodyCompositionPassed(ratio);

    const strengthBounds = getCurrentStrengthBounds();
    const coreBounds = getCurrentCoreBounds();
    const cardioBounds = getCurrentCardioBounds();

    const strengthScoreRaw = scoreFromTable(strengthBounds.table, key, strength, "higher");
    const coreScoreRaw = scoreFromTable(coreBounds.table, key, core, "higher");
    const strengthScore = strengthScoreRaw === null ? 0 : strengthScoreRaw;
    const coreScore = coreScoreRaw === null ? 0 : coreScoreRaw;

    let cardioScore = 0.0;
    let cardioMode = "run";

    if (cardioBounds.mode === "hamr"){
      cardioMode = "hamr";
      const hamrScore = scoreHigherBetter(cardio, TABLES.hamr, key);
      cardioScore = hamrScore === null ? 0 : hamrScore;
    } else {
      cardioMode = "run";
      const runScore = scoreTimeLowerBetter(cardio, TABLES.run, key);
      cardioScore = runScore === null ? 0 : runScore;
    }

    if (strengthScoreRaw === null) warnings.push(lookupMissingWarning("strength scoring"));
    if (coreScoreRaw === null) warnings.push(lookupMissingWarning("core scoring"));
    if (cardioBounds.mode === "hamr" && scoreHigherBetter(cardio, TABLES.hamr, key) === null){
      warnings.push(lookupMissingWarning("HAMR scoring"));
    }
    if (cardioBounds.mode === "run" && scoreTimeLowerBetter(cardio, TABLES.run, key) === null){
      warnings.push(lookupMissingWarning("run scoring"));
    }

    const strengthPassed = strengthScore >= MIN_PASS.strength;
    const corePassed = coreScore >= MIN_PASS.core;
    const cardioPassed = cardioScore >= MIN_PASS.cardio;

    const minimumsMet = componentMinimumsMet({
      bodyPassed,
      strengthPassed,
      corePassed,
      cardioPassed
    });

    const total = clamp(bodyScore + strengthScore + coreScore + cardioScore, 0, SCORE_CAPS.total);
    const category = scoreCategory(total, minimumsMet);

    const result = {
      ratio: roundedRatio,
      bodyScore,
      strengthScore,
      coreScore,
      cardioScore,
      total,
      category,
      minimumsMet,
      cardioMode,
      bodyPassed,
      strengthPassed,
      corePassed,
      cardioPassed,
      warnings: [...new Set(warnings)],
      breakdown: {
        body: bodyScore,
        strength: strengthScore,
        core: coreScore,
        cardio: cardioScore
      }
    };

    debugLog("computeScores", result);
    return result;
  }

  //#8) INSIGHTS
  function buildInsights(scores){
    if (scores.warnings.length){
      return {
        line1: scores.warnings[0],
        line2: scores.warnings[1] || "Review selected standards and supported event configuration.",
        line3: "Calculator output may be incomplete until all official values are available."
      };
    }

    const lines = [];
    if (!scores.minimumsMet){
      lines.push("One or more components are below the current minimum passing standard.");
    } else if (scores.total >= 90){
      lines.push("This combination projects an excellent official result.");
    } else if (scores.total >= 75){
      lines.push("This combination projects a satisfactory official result.");
    } else {
      lines.push("The current combination projects an unsatisfactory result.");
    }

    if (!scores.bodyPassed){
      lines.push("Body composition is above the passing WHtR threshold and fails as a standalone component.");
    } else if (scores.bodyScore >= 15){
      lines.push("Body composition remains within a solid scoring range.");
    } else if (scores.bodyScore >= 10){
      lines.push("Body composition is moderate, with additional points still available.");
    } else {
      lines.push("Body composition is one of the largest scoring opportunities right now.");
    }

    const weakest = Math.min(scores.strengthScore, scores.coreScore, scores.cardioScore);
    if (weakest === scores.cardioScore){
      lines.push("Cardio is the clearest lever for raising the composite score fastest.");
    } else if (weakest === scores.coreScore){
      lines.push("Improving core performance would be one of the fastest ways to raise the total.");
    } else {
      lines.push("Improving strength output would be one of the fastest ways to raise the total.");
    }

    return {
      line1: lines[0],
      line2: lines[1],
      line3: lines[2]
    };
  }

  //#9) UI RENDER
  function updateUI(){
    setSliderFill(els.heightSlider);
    setSliderFill(els.waistSlider);
    setSliderFill(els.strengthSlider);
    setSliderFill(els.coreSlider);
    setSliderFill(els.cardioSlider);

    safeText(els.heightValue, `${els.heightSlider?.value || 0} in`);
    safeText(els.waistValue, `${els.waistSlider?.value || 0} in`);

    safeText(els.strengthModeLabel, els.strengthEvent?.value || "");
    safeText(els.coreModeLabel, els.enduranceEvent?.value || "");
    safeText(els.cardioModeLabel, els.cardioEvent?.value || "");

    safeText(els.strengthValue, `${els.strengthSlider?.value || 0} reps`);

    if (els.enduranceEvent?.value.includes("Plank")){
      safeText(els.coreValue, formatTime(Number(els.coreSlider?.value || 0)));
    } else {
      safeText(els.coreValue, `${els.coreSlider?.value || 0} reps`);
    }

    const scores = computeScores();

    if (scores.cardioMode === "hamr"){
      safeText(els.cardioValue, `${els.cardioSlider?.value || 0} shuttles`);
    } else {
      safeText(els.cardioValue, formatTime(Number(els.cardioSlider?.value || 0)));
    }

    safeText(els.ratioValue, scores.ratio.toFixed(2));
    safeText(els.bodyCompScoreText, `${scores.bodyScore.toFixed(1)} / ${SCORE_CAPS.body}`);

    if (els.scoreRing) els.scoreRing.style.setProperty("--pct", scores.total.toFixed(1));
    safeText(els.scoreNumber, scores.total.toFixed(1));
    safeText(els.scoreLabel, scores.category);
    safeHtml(els.nextAssessment, nextAssessmentText(scores.total, scores.minimumsMet));

    if (els.barBody) els.barBody.style.height = `${(scores.breakdown.body / SCORE_CAPS.body) * 100}%`;
    if (els.barStrength) els.barStrength.style.height = `${(scores.breakdown.strength / SCORE_CAPS.strength) * 100}%`;
    if (els.barCore) els.barCore.style.height = `${(scores.breakdown.core / SCORE_CAPS.core) * 100}%`;
    if (els.barCardio) els.barCardio.style.height = `${(scores.breakdown.cardio / SCORE_CAPS.cardio) * 100}%`;

    updateRangeMeta();

    const insights = buildInsights(scores);
    safeHtml(els.insightList, `
      <li><span class="dot mint"></span><span>${insights.line1}</span></li>
      <li><span class="dot peach"></span><span>${insights.line2}</span></li>
      <li><span class="dot lav"></span><span>${insights.line3}</span></li>
    `);
  }

  //#10) EVENTS
  [
    els.gender,
    els.heightSlider,
    els.ageGroup,
    els.cardioEvent,
    els.strengthEvent,
    els.enduranceEvent,
    els.waistSlider,
    els.strengthSlider,
    els.coreSlider,
    els.cardioSlider
  ].forEach((el) => {
    if (!el) return;

    const refresh = () => {
      if (
        el === els.gender ||
        el === els.ageGroup ||
        el === els.cardioEvent ||
        el === els.strengthEvent ||
        el === els.enduranceEvent
      ){
        updateEventRanges();
      }
      updateUI();
    };

    el.addEventListener("input", refresh);
    el.addEventListener("change", refresh);
  });

  //#11) INIT
  updateEventRanges();
  updateUI();
})();
