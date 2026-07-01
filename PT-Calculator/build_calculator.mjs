import fs from "fs";

const tablesSnippet = fs.readFileSync("/tmp/tables_snippet.js", "utf8");

const js = `(() => {
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
    return \`\${mins}:\${String(secs).padStart(2, "0")}\`;
  }

  function formatInches(value){
    return \`\${Number(value).toFixed(1)} in\`;
  }

  function setSliderFill(slider){
    if (!slider) return;
    const min = Number(slider.min);
    const max = Number(slider.max);
    const val = Number(slider.value);
    const pct = ((val - min) / (max - min || 1)) * 100;
    slider.style.setProperty("--fill", \`\${pct}%\`);
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
    return \`\${normalizeAgeKey(els.ageGroup?.value || "")}_\${els.gender?.value || ""}\`;
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
    return \`Missing \${componentName} standard for selected age/gender.\`;
  }

  //#4) OFFICIAL TABLES — PFRA Scoring Charts effective 1 MAR 26 (DAFMAN 36-2905)
  const TABLES = {${tablesSnippet}

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
      ? \`Next assessment<br>in \${POLICY.satisfactoryMonths} months\`
      : \`Next assessment<br>in \${POLICY.unsatMonths} months\`;
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
    safeText(els.waistMeta, \`Best: ≤ \${formatInches(waistBest)} • Minimum Passing: ≤ \${formatInches(waistMinPass)}\`);

    const strengthBounds = getCurrentStrengthBounds();
    safeText(els.strengthMeta, \`Best: \${strengthBounds.top} reps • Minimum Passing: \${strengthBounds.passMin} reps\`);

    const coreBounds = getCurrentCoreBounds();
    if (coreBounds.type === "time") {
      safeText(els.coreMeta, \`Best: \${formatTime(coreBounds.top)} • Minimum Passing: \${formatTime(coreBounds.passMin)}\`);
    } else {
      safeText(els.coreMeta, \`Best: \${coreBounds.top} reps • Minimum Passing: \${coreBounds.passMin} reps\`);
    }

    const cardioBounds = getCurrentCardioBounds();
    if (cardioBounds.type === "hamr") {
      safeText(els.cardioMeta, \`Best: \${cardioBounds.top} shuttles • Minimum Passing: \${cardioBounds.passMin} shuttles\`);
    } else {
      safeText(els.cardioMeta, \`Best: \${formatTime(cardioBounds.top)} • Minimum Passing: \${formatTime(cardioBounds.passMin)}\`);
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

    safeText(els.heightValue, \`\${els.heightSlider?.value || 0} in\`);
    safeText(els.waistValue, \`\${els.waistSlider?.value || 0} in\`);

    safeText(els.strengthModeLabel, els.strengthEvent?.value || "");
    safeText(els.coreModeLabel, els.enduranceEvent?.value || "");
    safeText(els.cardioModeLabel, els.cardioEvent?.value || "");

    safeText(els.strengthValue, \`\${els.strengthSlider?.value || 0} reps\`);

    if (els.enduranceEvent?.value.includes("Plank")){
      safeText(els.coreValue, formatTime(Number(els.coreSlider?.value || 0)));
    } else {
      safeText(els.coreValue, \`\${els.coreSlider?.value || 0} reps\`);
    }

    const scores = computeScores();

    if (scores.cardioMode === "hamr"){
      safeText(els.cardioValue, \`\${els.cardioSlider?.value || 0} shuttles\`);
    } else {
      safeText(els.cardioValue, formatTime(Number(els.cardioSlider?.value || 0)));
    }

    safeText(els.ratioValue, scores.ratio.toFixed(2));
    safeText(els.bodyCompScoreText, \`\${scores.bodyScore.toFixed(1)} / \${SCORE_CAPS.body}\`);

    if (els.scoreRing) els.scoreRing.style.setProperty("--pct", scores.total.toFixed(1));
    safeText(els.scoreNumber, scores.total.toFixed(1));
    safeText(els.scoreLabel, scores.category);
    safeHtml(els.nextAssessment, nextAssessmentText(scores.total, scores.minimumsMet));

    if (els.barBody) els.barBody.style.height = \`\${(scores.breakdown.body / SCORE_CAPS.body) * 100}%\`;
    if (els.barStrength) els.barStrength.style.height = \`\${(scores.breakdown.strength / SCORE_CAPS.strength) * 100}%\`;
    if (els.barCore) els.barCore.style.height = \`\${(scores.breakdown.core / SCORE_CAPS.core) * 100}%\`;
    if (els.barCardio) els.barCardio.style.height = \`\${(scores.breakdown.cardio / SCORE_CAPS.cardio) * 100}%\`;

    updateRangeMeta();

    const insights = buildInsights(scores);
    safeHtml(els.insightList, \`
      <li><span class="dot mint"></span><span>\${insights.line1}</span></li>
      <li><span class="dot peach"></span><span>\${insights.line2}</span></li>
      <li><span class="dot lav"></span><span>\${insights.line3}</span></li>
    \`);
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
`;

fs.writeFileSync("/workspace/PT-Calculator/ptcalculator.js", js);
console.log("Wrote ptcalculator.js", js.length, "bytes");
