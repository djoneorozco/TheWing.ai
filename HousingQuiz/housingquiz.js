/* =========================================================
  PCSUnited • Housing Quiz + AIOU Companion Flow
  housingquiz.js
  GitHub-ready JavaScript

  FILES REQUIRED:
  - index.html
  - housingquiz.css
  - housingquiz.js

  STORAGE:
  - localStorage["pcsunited.housing_quiz.v1"]
  - localStorage["pcsunited.user_aiou_inputs.v1"]
  - localStorage["pcsunited.pending_intake.v1"]
========================================================= */

(function(){

"use strict";

/* =========================================================
  1. SHARED HELPERS
========================================================= */

function clamp(n,min,max){
  return Math.max(min,Math.min(max,n));
}

function readJSON(key,fallback){
  try{
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  }catch(_){
    return fallback;
  }
}

function writeJSON(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
  }catch(_){}
}

function updateSliderFill(range,minOverride,maxOverride,selector){
  if(!range) return;

  const min = Number(minOverride ?? range.min ?? 0);
  const max = Number(maxOverride ?? range.max ?? 100);
  const val = Number(range.value || min);

  const pct = clamp(
    ((val - min) / (max - min)) * 100,
    0,
    100
  );

  const shell = range.closest(selector || ".hq-slider-shell");

  if(!shell) return;

  shell.style.setProperty(
    "--rail-bg",
    "linear-gradient(90deg,#8ef3c5 0%,#6aa7ff " +
    pct +
    "%,rgba(255,255,255,.15) " +
    pct +
    "%,rgba(255,255,255,.15) 100%)"
  );
}

/* =========================================================
  2. HOUSING QUIZ
========================================================= */

const HOUSING_STORAGE_KEY = "pcsunited.housing_quiz.v1";

const housingQuestions = [

  {
    id:"homeStyle",
    type:"options",
    kicker:"Housing Identity",
    question:"What type of home feels most like the life you want right now?",
    sub:"Choose the housing identity that feels closest to your current season of life.",
    helper:"This helps PCSUnited understand whether your housing goals are driven more by payment, family comfort, updates, or lifestyle upgrade.",
    options:[
      {
        value:"practical",
        title:"Practical & Financially Smart",
        copy:"A home that works well, keeps payment under control, and avoids unnecessary stretch."
      },
      {
        value:"family",
        title:"Family Comfort",
        copy:"A home built around space, routines, safety, and everyday peace."
      },
      {
        value:"modern",
        title:"Updated & Move-In Ready",
        copy:"A home with cleaner finishes, fewer projects, and a newer-home feeling."
      },
      {
        value:"elevated",
        title:"Elevated Lifestyle",
        copy:"A home that feels like a major upgrade in comfort, pride, and quality of life."
      }
    ]
  },

  {
    id:"bedBath",
    type:"sliders",
    kicker:"Bedroom & Bathroom Wants",
    question:"How many bedrooms and bathrooms do you want?",
    sub:"This helps PCSUnited understand the size of home that feels right before we compare it against the market.",
    helper:"These are wants, not hard requirements. The dashboard can later compare your ideal home against affordability and local inventory.",
    defaults:{
      bedrooms:3,
      bathrooms:2
    }
  },

  {
    id:"priority",
    type:"options",
    kicker:"Market Compromise",
    question:"If the market forces a compromise, what would you protect first?",
    sub:"Choose the thing you would be least willing to sacrifice if the perfect home is not available.",
    helper:"This reveals your real tradeoff priority: payment, space, location, or condition.",
    options:[
      {
        value:"payment",
        title:"Protect the Payment",
        copy:"I would rather stay financially comfortable than chase extra features."
      },
      {
        value:"space",
        title:"Protect the Space",
        copy:"Bedrooms, bathrooms, and usable room matter most to my daily life."
      },
      {
        value:"location",
        title:"Protect the Location",
        copy:"Commute, schools, base access, or neighborhood fit matter most."
      },
      {
        value:"condition",
        title:"Protect the Condition",
        copy:"I would rather have fewer repairs, cleaner finishes, and less uncertainty."
      }
    ]
  },

  {
    id:"commute",
    type:"options",
    kicker:"Commute Lifestyle",
    question:"What commute feels realistic for your lifestyle?",
    sub:"Commute time can heavily affect stress, energy, and family time.",
    helper:"A better home sometimes means a longer drive. This helps PCSUnited understand your tradeoff comfort zone.",
    options:[
      {
        value:"short",
        title:"Under 15 Minutes",
        copy:"Convenience and time efficiency matter most."
      },
      {
        value:"balanced",
        title:"15–25 Minutes",
        copy:"A healthy balance between location and comfort."
      },
      {
        value:"longer",
        title:"25–40 Minutes",
        copy:"Willing to drive for a better home or neighborhood."
      },
      {
        value:"any",
        title:"I Don't Mind Driving",
        copy:"Home quality matters more than commute time."
      }
    ]
  },

  {
    id:"homeCondition",
    type:"condition",
    kicker:"Home Condition Preference",
    question:"Where are you between these two options right now?",
    sub:"Choose where you fall between a home that may need work and a brand new or move-in ready home.",
    helper:"This helps PCSUnited understand whether you prefer move-in ready comfort or are open to trading repairs for value.",
    defaults:{
      conditionScore:50
    }
  }

];

let housingCurrent = 0;
const housingAnswers = {};

const hqKickerEl          = document.getElementById("hq-kicker");
const hqQuestionEl        = document.getElementById("hq-question");
const hqSubEl             = document.getElementById("hq-sub");
const hqOptionsEl         = document.getElementById("hq-options");
const hqSliderPanelEl     = document.getElementById("hq-slider-panel");
const hqConditionPanelEl  = document.getElementById("hq-condition-panel");
const hqNextBtn           = document.getElementById("hq-next");
const hqBackBtn           = document.getElementById("hq-back");
const hqFinishEl          = document.getElementById("hq-finish");
const hqHelperCopyEl      = document.getElementById("hq-helper-copy");

const bedroomsRange       = document.getElementById("hq-bedrooms-range");
const bathroomsRange      = document.getElementById("hq-bathrooms-range");
const bedroomsValue       = document.getElementById("hq-bedrooms-value");
const bathroomsValue      = document.getElementById("hq-bathrooms-value");
const bedroomsPill        = document.getElementById("hq-bedrooms-pill");
const bathroomsPill       = document.getElementById("hq-bathrooms-pill");

const conditionRange      = document.getElementById("hq-condition-range");
const conditionCurrent    = document.getElementById("hq-condition-current");

const housingScoreEls = {
  openness:document.getElementById("hq-score-openness"),
  discipline:document.getElementById("hq-score-discipline"),
  lifestylePull:document.getElementById("hq-score-lifestyle"),
  flexibility:document.getElementById("hq-score-flexibility"),
  riskAversion:document.getElementById("hq-score-risk")
};

function pluralLabel(num,singular,plural){
  return Number(num) === 1 ? singular : plural;
}

function getConditionLabel(value){
  const n = Number(value);

  if(n <= 20) return "Strongly Needs Fixes";
  if(n <= 40) return "Leans Needs Fixes";
  if(n < 60) return "Neutral";
  if(n < 80) return "Leans Brand New";

  return "Strongly Brand New";
}

function hideHousingPanels(){
  hqOptionsEl.style.display = "none";
  hqSliderPanelEl.style.display = "none";
  hqConditionPanelEl.style.display = "none";
}

function updateBedBathAnswer(){
  const bedrooms = clamp(
    Number(bedroomsRange && bedroomsRange.value) || 3,
    1,
    6
  );

  const bathrooms = clamp(
    Number(bathroomsRange && bathroomsRange.value) || 2,
    1,
    4
  );

  if(bedroomsValue){
    bedroomsValue.textContent = String(bedrooms);
  }

  if(bathroomsValue){
    bathroomsValue.textContent = String(bathrooms);
  }

  if(bedroomsPill){
    bedroomsPill.textContent = pluralLabel(
      bedrooms,
      "Bedroom",
      "Bedrooms"
    );
  }

  if(bathroomsPill){
    bathroomsPill.textContent = pluralLabel(
      bathrooms,
      "Bathroom",
      "Bathrooms"
    );
  }

  updateSliderFill(bedroomsRange,null,null,".hq-slider-shell");
  updateSliderFill(bathroomsRange,null,null,".hq-slider-shell");

  housingAnswers.bedBath = {
    bedrooms:bedrooms,
    bathrooms:bathrooms
  };

  hqNextBtn.disabled = false;
}

function updateConditionAnswer(){
  const score = clamp(
    Number(conditionRange && conditionRange.value) || 50,
    0,
    100
  );

  const label = getConditionLabel(score);

  if(conditionCurrent){
    conditionCurrent.textContent = label;
  }

  updateSliderFill(conditionRange,null,null,".hq-slider-shell");

  housingAnswers.homeCondition = {
    score:score,
    label:label,
    left:"needs_fixes",
    right:"brand_new"
  };

  hqNextBtn.disabled = false;
}

function scoreHousingQuizBaseline(answers){
  const scores = {
    openness:3,
    discipline:3,
    lifestylePull:3,
    flexibility:3,
    riskAversion:3
  };

  const homeStyle = answers.homeStyle;
  const bedBath = answers.bedBath || {};
  const priority = answers.priority;
  const commute = answers.commute;
  const condition = answers.homeCondition || {};

  if(homeStyle === "practical"){
    scores.openness += -0.4;
    scores.discipline += 0.8;
    scores.lifestylePull += -0.1;
    scores.flexibility += 0.3;
    scores.riskAversion += 0.1;
  }

  if(homeStyle === "family"){
    scores.openness += 0.1;
    scores.discipline += 0.2;
    scores.lifestylePull += 0.8;
    scores.flexibility += 0.2;
    scores.riskAversion += 0.3;
  }

  if(homeStyle === "modern"){
    scores.openness += 0.7;
    scores.discipline += -0.1;
    scores.lifestylePull += 0.4;
    scores.flexibility += -0.1;
    scores.riskAversion += 0.4;
  }

  if(homeStyle === "elevated"){
    scores.openness += 1.0;
    scores.discipline += -0.5;
    scores.lifestylePull += 0.9;
    scores.flexibility += -0.2;
    scores.riskAversion += 0.1;
  }

  const bedrooms = Number(bedBath.bedrooms || 3);
  const bathrooms = Number(bedBath.bathrooms || 2);

  if(bedrooms <= 2){
    scores.discipline += 0.5;
    scores.lifestylePull += -0.2;
    scores.flexibility += 0.3;
  }

  if(bedrooms === 3 || bedrooms === 4){
    scores.discipline += 0.2;
    scores.lifestylePull += 0.3;
  }

  if(bedrooms >= 5){
    scores.openness += 0.3;
    scores.discipline += -0.4;
    scores.lifestylePull += 0.7;
    scores.flexibility += -0.2;
  }

  if(bathrooms >= 3){
    scores.openness += 0.2;
    scores.discipline += -0.2;
    scores.lifestylePull += 0.4;
  }

  if(priority === "payment"){
    scores.openness += -0.3;
    scores.discipline += 0.9;
    scores.lifestylePull += -0.2;
    scores.flexibility += 0.4;
    scores.riskAversion += 0.2;
  }

  if(priority === "space"){
    scores.openness += 0.1;
    scores.discipline += -0.2;
    scores.lifestylePull += 0.8;
    scores.flexibility += -0.1;
    scores.riskAversion += 0.1;
  }

  if(priority === "location"){
    scores.openness += 0.1;
    scores.discipline += 0.3;
    scores.lifestylePull += 0.5;
    scores.flexibility += 0.2;
    scores.riskAversion += 0.3;
  }

  if(priority === "condition"){
    scores.openness += 0.4;
    scores.discipline += -0.1;
    scores.lifestylePull += 0.3;
    scores.flexibility += -0.2;
    scores.riskAversion += 0.7;
  }

  if(commute === "short"){
    scores.discipline += 0.3;
    scores.lifestylePull += 0.4;
    scores.flexibility += -0.4;
    scores.riskAversion += 0.5;
  }

  if(commute === "balanced"){
    scores.discipline += 0.5;
    scores.lifestylePull += 0.3;
    scores.flexibility += 0.3;
    scores.riskAversion += 0.1;
  }

  if(commute === "longer"){
    scores.openness += 0.2;
    scores.discipline += -0.1;
    scores.lifestylePull += 0.4;
    scores.flexibility += 0.6;
    scores.riskAversion += -0.2;
  }

  if(commute === "any"){
    scores.openness += 0.3;
    scores.discipline += -0.3;
    scores.lifestylePull += 0.5;
    scores.flexibility += 0.8;
    scores.riskAversion += -0.4;
  }

  const conditionScore = Number(condition.score ?? 50);

  if(conditionScore <= 20){
    scores.openness += 0.2;
    scores.discipline += 0.5;
    scores.flexibility += 0.8;
    scores.riskAversion += -0.8;
  }

  else if(conditionScore <= 40){
    scores.openness += 0.1;
    scores.discipline += 0.3;
    scores.flexibility += 0.5;
    scores.riskAversion += -0.4;
  }

  else if(conditionScore < 60){
    scores.discipline += 0.2;
    scores.flexibility += 0.2;
  }

  else if(conditionScore < 80){
    scores.openness += 0.4;
    scores.discipline += -0.1;
    scores.flexibility += -0.2;
    scores.riskAversion += 0.4;
  }

  else{
    scores.openness += 0.7;
    scores.discipline += -0.3;
    scores.flexibility += -0.4;
    scores.riskAversion += 0.8;
  }

  Object.keys(scores).forEach(key => {
    scores[key] = Math.max(
      1,
      Math.min(5,scores[key])
    );

    scores[key] = Number(scores[key].toFixed(2));
  });

  return scores;
}

function paintHousingBaseline(scores){
  if(!scores) return;

  if(housingScoreEls.openness){
    housingScoreEls.openness.textContent = scores.openness.toFixed(2);
  }

  if(housingScoreEls.discipline){
    housingScoreEls.discipline.textContent = scores.discipline.toFixed(2);
  }

  if(housingScoreEls.lifestylePull){
    housingScoreEls.lifestylePull.textContent = scores.lifestylePull.toFixed(2);
  }

  if(housingScoreEls.flexibility){
    housingScoreEls.flexibility.textContent = scores.flexibility.toFixed(2);
  }

  if(housingScoreEls.riskAversion){
    housingScoreEls.riskAversion.textContent = scores.riskAversion.toFixed(2);
  }
}

function renderHousingOptionQuestion(q){
  hideHousingPanels();

  hqOptionsEl.style.display = "grid";
  hqOptionsEl.innerHTML = "";

  q.options.forEach(opt => {
    const btn = document.createElement("button");

    btn.type = "button";
    btn.className = "hq-option";

    if(housingAnswers[q.id] === opt.value){
      btn.classList.add("active");
    }

    btn.innerHTML = `
      <div class="hq-check">✓</div>

      <span class="hq-option-title">
        ${opt.title}
      </span>

      <span class="hq-option-copy">
        ${opt.copy}
      </span>
    `;

    btn.addEventListener("click",function(){
      housingAnswers[q.id] = opt.value;

      hqOptionsEl
        .querySelectorAll(".hq-option")
        .forEach(el => el.classList.remove("active"));

      btn.classList.add("active");

      hqNextBtn.disabled = false;
    });

    hqOptionsEl.appendChild(btn);
  });

  hqNextBtn.disabled = !housingAnswers[q.id];
}

function renderHousingSliderQuestion(q){
  hideHousingPanels();

  hqSliderPanelEl.style.display = "grid";
  hqOptionsEl.innerHTML = "";

  if(!housingAnswers[q.id]){
    housingAnswers[q.id] = {
      bedrooms:q.defaults.bedrooms,
      bathrooms:q.defaults.bathrooms
    };
  }

  if(bedroomsRange){
    bedroomsRange.value = String(
      housingAnswers[q.id].bedrooms || q.defaults.bedrooms
    );
  }

  if(bathroomsRange){
    bathroomsRange.value = String(
      housingAnswers[q.id].bathrooms || q.defaults.bathrooms
    );
  }

  updateBedBathAnswer();

  hqNextBtn.disabled = false;
}

function renderHousingConditionQuestion(q){
  hideHousingPanels();

  hqConditionPanelEl.style.display = "block";
  hqOptionsEl.innerHTML = "";

  if(!housingAnswers[q.id]){
    housingAnswers[q.id] = {
      score:q.defaults.conditionScore,
      label:getConditionLabel(q.defaults.conditionScore),
      left:"needs_fixes",
      right:"brand_new"
    };
  }

  if(conditionRange){
    conditionRange.value = String(
      housingAnswers[q.id].score || q.defaults.conditionScore
    );
  }

  updateConditionAnswer();

  hqNextBtn.disabled = false;
}

function renderHousingQuestion(){
  const q = housingQuestions[housingCurrent];

  hqKickerEl.textContent = q.kicker;
  hqQuestionEl.textContent = q.question;
  hqSubEl.textContent = q.sub;

  if(hqHelperCopyEl){
    hqHelperCopyEl.textContent = q.helper || "There are no right or wrong answers.";
  }

  if(q.type === "sliders"){
    renderHousingSliderQuestion(q);
  }else if(q.type === "condition"){
    renderHousingConditionQuestion(q);
  }else{
    renderHousingOptionQuestion(q);
  }

  hqBackBtn.style.visibility =
    housingCurrent === 0
      ? "hidden"
      : "visible";

  hqNextBtn.textContent =
    housingCurrent === housingQuestions.length - 1
      ? "Finish"
      : "Continue";
}

function finishHousingQuiz(){
  const baselineScores = scoreHousingQuizBaseline(housingAnswers);

  const payload = {
    completedAt:new Date().toISOString(),
    source:"pcsunited.housing.quiz.v1",
    answers:housingAnswers,
    baselineScores:baselineScores,
    baselineLabels:{
      openness:"Openness",
      discipline:"Discipline",
      lifestylePull:"Lifestyle Pull",
      flexibility:"Flexibility",
      riskAversion:"Risk Aversion"
    }
  };

  writeJSON(HOUSING_STORAGE_KEY,payload);

  paintHousingBaseline(baselineScores);

  hqOptionsEl.style.display = "none";
  hqSliderPanelEl.style.display = "none";
  hqConditionPanelEl.style.display = "none";
  hqBackBtn.style.display = "none";
  hqNextBtn.style.display = "none";

  hqKickerEl.style.display = "none";
  hqQuestionEl.style.display = "none";
  hqSubEl.style.display = "none";

  const bottomEl = document.getElementById("hq-bottom");

  if(bottomEl){
    bottomEl.style.display = "none";
  }

  hqFinishEl.style.display = "block";

  try{
    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:housing-quiz-complete",
        { detail:payload }
      )
    );
  }catch(_){}
}

if(bedroomsRange){
  bedroomsRange.addEventListener("input",updateBedBathAnswer);
  bedroomsRange.addEventListener("change",updateBedBathAnswer);
}

if(bathroomsRange){
  bathroomsRange.addEventListener("input",updateBedBathAnswer);
  bathroomsRange.addEventListener("change",updateBedBathAnswer);
}

if(conditionRange){
  conditionRange.addEventListener("input",updateConditionAnswer);
  conditionRange.addEventListener("change",updateConditionAnswer);
}

if(hqNextBtn){
  hqNextBtn.addEventListener("click",function(){
    if(housingCurrent >= housingQuestions.length - 1){
      finishHousingQuiz();
      return;
    }

    housingCurrent++;
    renderHousingQuestion();
  });
}

if(hqBackBtn){
  hqBackBtn.addEventListener("click",function(){
    if(housingCurrent <= 0) return;

    housingCurrent--;
    renderHousingQuestion();
  });
}

/* =========================================================
  3. AIOU COMPANION TEST
========================================================= */

const AIOU_LOCAL_KEY = "pcsunited.user_aiou_inputs.v1";
const PENDING_KEY = "pcsunited.pending_intake.v1";

const LOGIN_EMAIL_KEYS = [
  "pcsunited.loginEmail",
  "pcsunited.sessionEmail",
  "realtysass.loginEmail",
  "realtysass.sessionEmail"
];

const aiouRoot = document.getElementById("aiou-shell");

const AIOU_ENDPOINT = (
  aiouRoot?.dataset?.endpoint ||
  "https://theorozcorealty.netlify.app/.netlify/functions/aiou-report"
).trim();

const aiouQuestions = [

  {
    id:"V1",
    type:"visual",
    dim:"O",
    text:"Where are you between these two options right now?",
    rev:false
  },

  {
    id:"O1",
    dim:"O",
    text:"I believe an updated, modern-looking home would make me happier long-term.",
    rev:false,
    ctrlPair:"O1b"
  },
  {
    id:"O1b",
    dim:"O",
    text:"I would be satisfied with an older or plain-looking home if it gave me the right payment, location, and space.",
    rev:true,
    ctrlPair:"O1"
  },

  {
    id:"O2",
    dim:"O",
    text:"I would pay more for features like newer finishes, open layout, natural light, or a better kitchen.",
    rev:false,
    ctrlPair:"O2b"
  },
  {
    id:"O2b",
    dim:"O",
    text:"If the payment felt uncomfortable, I would quickly give up style and upgrades.",
    rev:true,
    ctrlPair:"O2"
  },

  {
    id:"C1",
    dim:"C",
    text:"If I found a home I loved, I would be tempted to stretch above my planned budget.",
    rev:true,
    ctrlPair:"C1b"
  },
  {
    id:"C1b",
    dim:"C",
    text:"Even if I loved the home, I would walk away if the numbers did not make sense.",
    rev:false,
    ctrlPair:"C1"
  },

  {
    id:"C2",
    dim:"C",
    text:"My housing needs are clear enough that I can separate true must-haves from nice-to-haves.",
    rev:false,
    ctrlPair:"C2b"
  },
  {
    id:"C2b",
    dim:"C",
    text:"When looking at homes, I often find myself changing what I thought mattered most.",
    rev:true,
    ctrlPair:"C2"
  },

  {
    id:"C3",
    dim:"C",
    text:"I want enough space even if it means higher utilities, more maintenance, or a slightly higher payment.",
    rev:true,
    ctrlPair:"C3b"
  },
  {
    id:"C3b",
    dim:"C",
    text:"I would rather choose a right-sized home than pay more for rooms I may not truly use.",
    rev:false,
    ctrlPair:"C3"
  },

  {
    id:"E1",
    dim:"E",
    text:"I picture using my home for hosting, family gatherings, cookouts, or visiting relatives.",
    rev:false,
    ctrlPair:"E1b"
  },
  {
    id:"E1b",
    dim:"E",
    text:"Most of the time, I prefer my home to feel private, quiet, and low-traffic.",
    rev:true,
    ctrlPair:"E1"
  },

  {
    id:"E2",
    dim:"E",
    text:"I would accept a smaller or less impressive home if it placed me closer to work, school, base, or daily life.",
    rev:false,
    ctrlPair:"E2b"
  },
  {
    id:"E2b",
    dim:"E",
    text:"I would rather drive farther if it means getting the home, space, or neighborhood I really want.",
    rev:true,
    ctrlPair:"E2"
  },

  {
    id:"A1",
    dim:"A",
    text:"I can compromise on cosmetic details if the home solves the bigger picture.",
    rev:false,
    ctrlPair:"A1b"
  },
  {
    id:"A1b",
    dim:"A",
    text:"If a home misses several details I care about, I usually struggle to see it as a real option.",
    rev:true,
    ctrlPair:"A1"
  },

  {
    id:"N1",
    dim:"N",
    text:"A home needing repairs, updates, or unknown costs would make me anxious.",
    rev:false,
    ctrlPair:"N1b"
  },
  {
    id:"N1b",
    dim:"N",
    text:"I am comfortable buying a home that needs work if the discount is strong enough.",
    rev:true,
    ctrlPair:"N1"
  },

  {
    id:"N2",
    dim:"N",
    text:"I trust newer homes more because they feel cleaner, safer, and less risky.",
    rev:false,
    ctrlPair:"N2b"
  },
  {
    id:"N2b",
    dim:"N",
    text:"I would trust an older home if inspection, maintenance history, and neighborhood quality were strong.",
    rev:true,
    ctrlPair:"N2"
  },

  {
    id:"N3",
    dim:"N",
    text:"I would choose a quieter, safer-feeling area even if it meant being farther from restaurants, shopping, or events.",
    rev:false,
    ctrlPair:"N3b"
  },
  {
    id:"N3b",
    dim:"N",
    text:"I would accept a busier area if it gave me better access to daily convenience and lifestyle.",
    rev:true,
    ctrlPair:"N3"
  },

  {
    id:"X1",
    dim:"O",
    text:"If I had to choose, I would rather get the home that feels right than the lowest possible monthly payment.",
    rev:false,
    ctrlPair:"X1b"
  },
  {
    id:"X1b",
    dim:"C",
    text:"If I had to choose, I would rather protect my monthly payment than get the home that feels emotionally perfect.",
    rev:false,
    ctrlPair:"X1"
  }

];

let aiouIndex = 0;
let aiouAnswers = {};
let aiouTimer = null;
let aiouTimeLeft = 10;
let aiouStarted = false;
let housingPayload = null;

window.__AIOU_STYLE_V_PRICE = 0;

const aiouStage = document.getElementById("aiou-stage");
const aiouQuizPanel = document.getElementById("aiou-quiz-panel");
const aiouResultsPanel = document.getElementById("aiou-results");

const aiouQTitle = document.getElementById("aiou-qtitle");
const aiouQText = document.getElementById("aiou-qtext");
const aiouClock = document.getElementById("aiou-clock");
const aiouProgressBar = document.getElementById("aiou-progress-bar");

const aiouVisualArea = document.getElementById("aiou-visual-area");
const aiouScaleBlock = document.getElementById("aiou-scale");
const aiouVSlider = document.getElementById("aiou-vslider");
const aiouVLabel = document.getElementById("aiou-vlabel");
const aiouVImgA = document.getElementById("aiou-vimg-a");
const aiouVImgB = document.getElementById("aiou-vimg-b");

const aiouSkipBtn = document.getElementById("aiou-skip");
const aiouResetBtn = document.getElementById("aiou-reset");

function getAnyEmail(){
  for(const key of LOGIN_EMAIL_KEYS){
    try{
      const value = String(localStorage.getItem(key) || "").trim().toLowerCase();
      if(value) return value;
    }catch(_){}
  }

  try{
    const sessionEmail = String(sessionStorage.getItem("pcsunited.sessionEmail") || "").trim().toLowerCase();
    if(sessionEmail) return sessionEmail;
  }catch(_){}

  return "";
}

function makeAttemptId(){
  return "aiouatt_" + Date.now().toString(36) + "_" + Math.random().toString(16).slice(2);
}

function mergePending(partial){
  const existing = readJSON(PENDING_KEY,null);

  const base = existing && typeof existing === "object"
    ? existing
    : {
        attempt_id:makeAttemptId(),
        created_at:new Date().toISOString(),
        source:"pcsunited.aiou.quiz.v5.inline"
      };

  const merged = {
    ...base,
    ...partial,
    attempt_id:base.attempt_id || makeAttemptId(),
    created_at:base.created_at || new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  writeJSON(PENDING_KEY,merged);

  return merged;
}

function getAiouVisualLabel(v){
  const n = Number(v || 0);

  if(n <= -3) return "Prefers Needs Fixes strongly";
  if(n === -2 || n === -1) return "Leans Needs Fixes";
  if(n === 0) return "Neutral";
  if(n === 1 || n === 2) return "Leans Brand New";

  return "Prefers Brand New strongly";
}

function mapHomeConditionFromSlider(v){
  const x = Number(v || 0);

  if(x >= 3) return "new";
  if(x <= -3) return "value_add";

  return "light";
}

function buildAiouScalePills(){
  aiouScaleBlock.innerHTML = "";

  for(let v = -5; v <= 5; v++){
    const btn = document.createElement("button");

    btn.type = "button";
    btn.className = "aiou-pill";
    btn.textContent = String(v);
    btn.dataset.val = String(v);

    btn.addEventListener("click",function(){
      selectAiouValue(v);
    });

    aiouScaleBlock.appendChild(btn);
  }
}

function selectAiouValue(v){
  clearInterval(aiouTimer);
  recordAiouAnswer(v);
}

function initAiouVisualQuestion(){
  if(!aiouVSlider) return;

  aiouVSlider.value = String(window.__AIOU_STYLE_V_PRICE || 0);

  function paint(){
    const value = Number(aiouVSlider.value || 0);

    window.__AIOU_STYLE_V_PRICE = value;

    if(aiouVLabel){
      aiouVLabel.textContent = getAiouVisualLabel(value);
    }

    updateSliderFill(aiouVSlider,-5,5,".aiou-slider-shell");
  }

  aiouVSlider.oninput = paint;
  aiouVSlider.onchange = paint;

  if(aiouVImgA){
    aiouVImgA.onclick = function(){
      aiouVSlider.value = String(
        Math.max(-5,Number(aiouVSlider.value || 0) - 1)
      );
      paint();
    };
  }

  if(aiouVImgB){
    aiouVImgB.onclick = function(){
      aiouVSlider.value = String(
        Math.min(5,Number(aiouVSlider.value || 0) + 1)
      );
      paint();
    };
  }

  paint();
}

function renderAiouQuestion(){
  const q = aiouQuestions[aiouIndex];

  const pct = ((aiouIndex) / aiouQuestions.length) * 100;

  aiouProgressBar.style.width = pct + "%";
  aiouQTitle.textContent = "Question " + (aiouIndex + 1) + " / " + aiouQuestions.length;
  aiouQText.textContent = q.text;

  if(q.type === "visual"){
    aiouVisualArea.classList.add("active");
    aiouScaleBlock.classList.remove("active");
    initAiouVisualQuestion();
  }else{
    aiouVisualArea.classList.remove("active");
    aiouScaleBlock.classList.add("active");
    buildAiouScalePills();
  }

  startAiouTimer();
}

function startAiouTimer(){
  clearInterval(aiouTimer);

  aiouTimeLeft = 10;
  aiouClock.textContent = "10";

  aiouTimer = setInterval(function(){
    aiouTimeLeft -= 1;

    aiouClock.textContent = String(Math.max(0,aiouTimeLeft));

    if(aiouTimeLeft <= 0){
      clearInterval(aiouTimer);
      recordAiouAnswer(null);
    }
  },1000);
}

function recordAiouAnswer(v){
  const q = aiouQuestions[aiouIndex];

  if(q.type === "visual"){
    const raw = v === null
      ? 0
      : Number(aiouVSlider && aiouVSlider.value || 0);

    aiouAnswers[q.id] = raw;
    window.__AIOU_STYLE_V_PRICE = raw;
  }else{
    aiouAnswers[q.id] = v === null ? 0 : Number(v);
  }

  aiouIndex++;

  if(aiouIndex < aiouQuestions.length){
    renderAiouQuestion();
  }else{
    finishAiouQuiz();
  }
}

function scoreAiouAll(){
  const dims = {
    O:[],
    C:[],
    E:[],
    A:[],
    N:[]
  };

  const qMap = Object.fromEntries(aiouQuestions.map(q => [q.id,q]));

  aiouQuestions.forEach(function(q){
    if(q.type === "visual") return;

    let value = aiouAnswers[q.id];

    if(value === undefined || value === null){
      value = 0;
    }

    if(q.rev){
      value = -value;
    }

    const mapped = ((value + 5) * 0.4) + 1;

    if(dims[q.dim]){
      dims[q.dim].push(mapped);
    }
  });

  const avg = function(arr){
    return arr.reduce((a,b) => a + b,0) / arr.length || 3;
  };

  const scores = {
    O:Number(avg(dims.O).toFixed(2)),
    C:Number(avg(dims.C).toFixed(2)),
    E:Number(avg(dims.E).toFixed(2)),
    A:Number(avg(dims.A).toFixed(2)),
    N:Number(avg(dims.N).toFixed(2))
  };

  const visual = Number(window.__AIOU_STYLE_V_PRICE || 0);

  scores.O = Number(
    Math.max(1,Math.min(5,scores.O + (visual / 12.5))).toFixed(2)
  );

  const flags = [];
  const handled = new Set();

  aiouQuestions.forEach(function(q){
    if(q.ctrlPair && !handled.has(q.id)){
      const a = aiouAnswers[q.id];
      const b = aiouAnswers[q.ctrlPair];

      if(a !== null && b !== null && a !== undefined && b !== undefined && qMap[q.ctrlPair]){
        const aAdj = q.rev ? -a : a;
        const bAdj = qMap[q.ctrlPair].rev ? -b : b;

        if(Math.abs(aAdj - bAdj) >= 6){
          flags.push(q.id + "/" + q.ctrlPair);
        }
      }

      handled.add(q.id);
      handled.add(q.ctrlPair);
    }
  });

  return {
    scores:scores,
    inconsistencies:flags
  };
}

const MBTI_BUYER_GUIDE = {
  ISTJ:"Stable, detail-first. Prefers proven neighborhoods, low-variance costs, and strong inspection records.",
  ISFJ:"Practical caretaker. Values safety, schools, and quiet streets; favors move-in-ready over projects.",
  INFJ:"Purpose-driven. Wants harmony and meaningful space; calm areas and quality renovations matter.",
  INTJ:"Planner/optimizer. Seeks value efficiency and long-term upside; ignores fluffy upgrades.",
  ISTP:"Hands-on problem-solver. Open to light projects if priced right; needs clear scope/timeline.",
  ISFP:"Aesthetic + comfort. Drawn to warm finishes, natural light, and cozy outdoor spots.",
  INFP:"Idealistic. Wants character and story; needs guardrails so budget doesn’t drift.",
  INTP:"Analytical. Structure/systems/future flexibility > staging glam.",
  ESTP:"Action-oriented. Loves lively areas and entertainment spaces; avoid payment creep.",
  ESFP:"Experience-first. Open layouts and social hubs; size payment first, then pick the fun.",
  ENFP:"Vision + people. Creative layouts, natural light; watch impulsive upgrades.",
  ENTP:"Options hunter. Wants flexibility/ADU potential; negotiate hard.",
  ESTJ:"Structured operator. Predictability, commute efficiency, and low-maintenance wins.",
  ESFJ:"Community anchor. Schools/parks close; turnkey > fixer to keep harmony.",
  ENFJ:"Connector. Hosting flow matters; choose move-in-ready to keep momentum.",
  ENTJ:"Decisive strategist. Location + resale math; newish or quality reno to avoid downtime."
};

function mbtiLabel(type){
  const map = {
    ISTJ:"Inspector",
    ISFJ:"Protector",
    INFJ:"Sage",
    INTJ:"Architect",
    ISTP:"Crafter",
    ISFP:"Artist",
    INFP:"Idealist",
    INTP:"Analyst",
    ESTP:"Promoter",
    ESFP:"Performer",
    ENFP:"Champion",
    ENTP:"Debater",
    ESTJ:"Executive",
    ESFJ:"Consul",
    ENFJ:"Protagonist",
    ENTJ:"Commander"
  };

  return map[type] || "Persona";
}

function letterEI(E){
  return E >= 3.75 ? "E" : E <= 3.25 ? "I" : E >= 3.5 ? "E" : "I";
}

function letterSN(O){
  return O >= 3.75 ? "N" : O <= 3.25 ? "S" : O >= 3.5 ? "N" : "S";
}

function letterTF(A){
  return A >= 3.75 ? "F" : A <= 3.25 ? "T" : A >= 3.5 ? "F" : "T";
}

function letterJP(C){
  return C >= 3.75 ? "J" : C <= 3.25 ? "P" : C >= 3.5 ? "J" : "P";
}

function scoresToMBTI(scores){
  const ei = letterEI(scores.E);
  const sn = letterSN(scores.O);
  const tf = letterTF(scores.A);
  const jp = letterJP(scores.C);

  const type = ei + sn + tf + jp;

  const dist = function(v,high){
    return high
      ? Math.max(0,v - 3.5) / 1.5
      : Math.max(0,3.5 - v) / 1.5;
  };

  const parts = [
    ei === "E" ? dist(scores.E,true) : dist(scores.E,false),
    sn === "N" ? dist(scores.O,true) : dist(scores.O,false),
    tf === "F" ? dist(scores.A,true) : dist(scores.A,false),
    jp === "J" ? dist(scores.C,true) : dist(scores.C,false)
  ];

  const confidence = Math.max(
    0.35,
    Number((parts.reduce((a,b) => a + b,0) / 4).toFixed(2))
  );

  return {
    type:type,
    confidence:confidence
  };
}

function archetypeFromScores(scores){
  const hi = v => v >= 4.0;
  const lo = v => v <= 2.5;

  if(hi(scores.O) && hi(scores.E) && scores.C < 3.4){
    return "Emotion-Led Dream Hunter";
  }

  if(hi(scores.C) && lo(scores.O) && !hi(scores.E)){
    return "Payment-Disciplined Planner";
  }

  if(hi(scores.N) && lo(scores.E)){
    return "Risk-Guarded Nest-Builder";
  }

  if(hi(scores.A) && hi(scores.C)){
    return "Flexible Family Optimizer";
  }

  if(hi(scores.O) && scores.N < 3.3){
    return "Design-Forward Value Seeker";
  }

  if(hi(scores.C) && hi(scores.N)){
    return "Protection-First Buyer";
  }

  return "Balanced Explorer";
}

function queueAiouPending(brief){
  const email = getAnyEmail();
  const homeCondition = mapHomeConditionFromSlider(brief.visual.styleVsPriceSlider);

  const aiouRow = {
    email:email || null,
    bedrooms:brief.profile.bedrooms || null,
    bathrooms:brief.profile.bathrooms || null,
    sqft:null,
    property_type:null,
    amenities:null,
    home_condition:homeCondition,
    downpayment:null,
    credit_score:null,
    time_to_buy:null,
    aiou_scores:brief.scores || null,
    aiou_archetype:brief.archetype || null,
    aiou_mbti:brief.mbti || null,
    aiou_assumption_flags:brief.psych.inconsistencies || [],
    housing_quiz:brief.housingQuiz || null,
    source:"pcsunited.aiou.quiz.v5.inline",
    saved_at:new Date().toISOString()
  };

  const finLegacy = readJSON("pcsunited.financial_intake.v1",null);
  const finModern = readJSON("pcsunited.financial.intake.v1",null);
  const ov = readJSON("pcsunited.kpi_overrides.v1",null);

  const financial = {
    ...(finLegacy || {}),
    ...(finModern || {})
  };

  if(financial){
    aiouRow.time_to_buy = financial.mode || financial.purchase_time || financial.time_to_buy || aiouRow.time_to_buy;
    aiouRow.credit_score = Number(financial.creditScore || financial.credit_score || 0) || aiouRow.credit_score;
    aiouRow.downpayment = Number(financial.downpayment || financial.downPayment || financial.dpAmt || 0) || aiouRow.downpayment;
  }

  if(ov){
    const sc = Number(ov.credit_score ?? ov.creditScore ?? 0) || 0;
    const dp = Number(ov.downpayment ?? ov.savingsOverride ?? 0) || 0;

    if(!aiouRow.credit_score && sc){
      aiouRow.credit_score = sc;
    }

    if(!aiouRow.downpayment && dp){
      aiouRow.downpayment = dp;
    }
  }

  writeJSON(AIOU_LOCAL_KEY,aiouRow);

  mergePending({
    email:email || null,
    aiou:aiouRow,
    aiou_brief:brief,
    source:"pcsunited.pending.v1"
  });
}

function paintAiouResults(scores,inconsistencies,archetype,mbti){
  document.getElementById("aiou-k-open").textContent = scores.O.toFixed(2);
  document.getElementById("aiou-k-disc").textContent = scores.C.toFixed(2);
  document.getElementById("aiou-k-life").textContent = scores.E.toFixed(2);
  document.getElementById("aiou-k-flex").textContent = scores.A.toFixed(2);
  document.getElementById("aiou-k-risk").textContent = scores.N.toFixed(2);

  const consistencyEl = document.getElementById("aiou-consistency");
  const archetypeEl = document.getElementById("aiou-archetype");
  const mbtiEl = document.getElementById("aiou-mbti");

  if(inconsistencies.length){
    consistencyEl.innerHTML =
      '<span class="aiou-flag">⚠ Assumption mismatch flags:</span> ' +
      inconsistencies.join(", ") +
      '<br><span style="color:rgba(230,236,255,.72);font-weight:700;">These are not bad answers. They show where a stated preference may conflict with another tradeoff.</span>';
  }else{
    consistencyEl.innerHTML =
      '<span class="aiou-ok">✓ Your responses appear consistent across tradeoff checks.</span>';
  }

  archetypeEl.textContent = "Archetype: " + archetype;

  const blurb = MBTI_BUYER_GUIDE[mbti.type] ||
    "Personality informs your tradeoffs; size budget first, then match how you live.";

  mbtiEl.innerHTML =
    "MBTI: <b>" +
    mbti.type +
    "</b> — " +
    mbtiLabel(mbti.type) +
    ' <span style="opacity:.7">(' +
    Math.round(mbti.confidence * 100) +
    "% match)</span><br>" +
    '<span style="color:rgba(230,236,255,.72);font-weight:400;">' +
    blurb +
    "</span>";
}

async function sendAiouToLLM(brief){
  const box = document.getElementById("aiou-report-box");

  if(!box) return;

  box.innerHTML = "(Generating your personalized memo…)";

  try{
    const response = await fetch(AIOU_ENDPOINT,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(brief)
    });

    if(!response.ok){
      throw new Error("Server returned " + response.status);
    }

    const data = await response.json();

    const html =
      data.memoHtml ||
      (
        data.memo
          ? "<p>" + String(data.memo).replace(/</g,"&lt;") + "</p>"
          : "<p>No memo returned.</p>"
      );

    box.innerHTML = html;
  }catch(err){
    box.innerHTML =
      '<span class="aiou-flag">Memo generation unavailable:</span> ' +
      String(err.message || err);
  }
}

function finishAiouQuiz(){
  clearInterval(aiouTimer);

  aiouProgressBar.style.width = "100%";

  const scored = scoreAiouAll();
  const scores = scored.scores;
  const inconsistencies = scored.inconsistencies;
  const archetype = archetypeFromScores(scores);
  const mbti = scoresToMBTI(scores);

  const bedBath = housingPayload?.answers?.bedBath || {};
  const hqAnswers = housingPayload?.answers || {};
  const hqBaseline = housingPayload?.baselineScores || null;

  const brief = {
    version:"aiou.v5.inline.housing_companion",
    ts:new Date().toISOString(),
    profile:{
      firstName:"",
      lastName:"",
      bedrooms:Number(bedBath.bedrooms || 0),
      bathrooms:Number(bedBath.bathrooms || 0),
      budgetMax:0,
      setting:"",
      safetyPriority:null
    },
    housingQuiz:{
      answers:hqAnswers,
      baselineScores:hqBaseline,
      completedAt:housingPayload?.completedAt || null
    },
    scores:scores,
    archetype:archetype,
    mbti:mbti,
    psych:{
      totalItems:aiouQuestions.length,
      inconsistencies:inconsistencies,
      purpose:"Tests whether buyer assumptions match actual housing tradeoff behavior."
    },
    visual:{
      styleVsPriceSlider:Number(window.__AIOU_STYLE_V_PRICE || 0),
      homeCondition:mapHomeConditionFromSlider(Number(window.__AIOU_STYLE_V_PRICE || 0))
    },
    answers:aiouAnswers
  };

  queueAiouPending(brief);
  paintAiouResults(scores,inconsistencies,archetype,mbti);

  aiouQuizPanel.style.display = "none";
  aiouResultsPanel.classList.add("active");

  try{
    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:aiou-complete",
        { detail:brief }
      )
    );
  }catch(_){}

  sendAiouToLLM(brief);
}

function startAiou(payload){
  if(aiouStarted) return;

  aiouStarted = true;
  housingPayload = payload || readJSON(HOUSING_STORAGE_KEY,null);

  aiouStage.classList.add("active");
  aiouQuizPanel.style.display = "block";
  aiouResultsPanel.classList.remove("active");

  aiouIndex = 0;
  aiouAnswers = {};
  window.__AIOU_STYLE_V_PRICE = 0;

  aiouQuestions.forEach(q => {
    aiouAnswers[q.id] = undefined;
  });

  renderAiouQuestion();

  try{
    aiouStage.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  }catch(_){}
}

function resetAiou(){
  clearInterval(aiouTimer);

  aiouStarted = false;
  aiouIndex = 0;
  aiouAnswers = {};
  window.__AIOU_STYLE_V_PRICE = 0;

  aiouResultsPanel.classList.remove("active");
  aiouQuizPanel.style.display = "block";

  startAiou(housingPayload);
}

if(aiouSkipBtn){
  aiouSkipBtn.addEventListener("click",function(){
    clearInterval(aiouTimer);
    recordAiouAnswer(null);
  });
}

if(aiouResetBtn){
  aiouResetBtn.addEventListener("click",function(){
    resetAiou();
  });
}

window.addEventListener("pcsunited:housing-quiz-complete",function(event){
  startAiou(event.detail || null);
});

const existingHousingPayload = readJSON(HOUSING_STORAGE_KEY,null);

if(existingHousingPayload && existingHousingPayload.completedAt){
  setTimeout(function(){
    startAiou(existingHousingPayload);
  },500);
}

/* =========================================================
  4. PUBLIC DEBUG API
========================================================= */

window.PCSU_HOUSING_QUIZ = {
  version:"1.0.0-github-split",
  renderHousingQuestion:renderHousingQuestion,
  scoreHousingQuizBaseline:scoreHousingQuizBaseline,
  startAiou:startAiou,
  resetAiou:resetAiou,
  housingQuestions:housingQuestions,
  aiouQuestions:aiouQuestions
};

/* =========================================================
  5. INITIALIZE
========================================================= */

if(
  hqKickerEl &&
  hqQuestionEl &&
  hqSubEl &&
  hqOptionsEl &&
  hqNextBtn &&
  hqBackBtn
){
  renderHousingQuestion();
}

})();
