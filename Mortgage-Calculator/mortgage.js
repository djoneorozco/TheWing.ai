/* =========================================================
  PCSUNITED • LIGHTWEIGHT FAD / MORTGAGE HEALTH DASHBOARD
  mortgage.js
  v1.0.1

  THEWING ENDPOINTS
  - Compensation: https://thewing.netlify.app/api/opensource-brain
  - Mortgage:     https://thewing.netlify.app/api/mortgage
========================================================= */

(function(){
  "use strict";

  // =========================================================
  // //#1 CONFIG
  // =========================================================
  const API_BASE = "https://thewing.netlify.app/api";
  const EP_BRAIN = API_BASE + "/opensource-brain";
  const EP_MORTGAGE = API_BASE + "/mortgage";

  const TERM_YEARS = 30;

  const KEY_INTAKE = "pcsunited.financial.intake.v1";
  const KEY_INTAKE_LEGACY = "pcsunited.financial_intake.v1";
  const KEY_OVERRIDES = "pcsunited.kpi_overrides.v1";
  const KEY_BRIDGE_V1 = "pcsunited.bridge.v1";
  const KEY_BRIDGE = "pcsunited.bridge";
  const KEY_REALTY_BRIDGE = "realtysass.bridge";

  const KEY_OUTPUT = "pcsunited.lightweight_fad.snapshot.v1";
  const KEY_MORTGAGE_HEALTH = "pcsunited.mortgage_health.v1";

  const BASE_META = {
    "Andrews AFB": { zip:"20762", cityKey:"Andrews", state:"MD", market:"Washington DC" },
    "Barksdale AFB": { zip:"71110", cityKey:"Barksdale", state:"LA", market:"Bossier City" },
    "Beale AFB": { zip:"95903", cityKey:"Beale", state:"CA", market:"Marysville" },
    "Cannon AFB": { zip:"88103", cityKey:"Cannon", state:"NM", market:"Clovis" },
    "Charleston AFB": { zip:"29404", cityKey:"Charleston", state:"SC", market:"Charleston" },
    "Davis-Monthan AFB": { zip:"85707", cityKey:"DavisMonthan", state:"AZ", market:"Tucson" },
    "Dover AFB": { zip:"19902", cityKey:"Dover", state:"DE", market:"Dover" },
    "Dyess AFB": { zip:"79607", cityKey:"Dyess", state:"TX", market:"Abilene" },
    "Eglin AFB": { zip:"32542", cityKey:"Eglin", state:"FL", market:"Fort Walton Beach" },
    "Fairchild AFB": { zip:"99011", cityKey:"Fairchild", state:"WA", market:"Spokane" },
    "FE Warren AFB": { zip:"82005", cityKey:"FEWarren", state:"WY", market:"Cheyenne" },
    "Holloman AFB": { zip:"88330", cityKey:"Holloman", state:"NM", market:"Alamogordo" },
    "Hurlburt Field": { zip:"32544", cityKey:"Hurlburt", state:"FL", market:"Fort Walton Beach" },
    "JBSA Fort Sam Houston": { zip:"78234", cityKey:"FortSamHouston", state:"TX", market:"San Antonio" },
    "JBSA Lackland": { zip:"78236", cityKey:"Lackland", state:"TX", market:"San Antonio" },
    "JBSA Randolph": { zip:"78150", cityKey:"Randolph", state:"TX", market:"San Antonio" },
    "Keesler AFB": { zip:"39534", cityKey:"Keesler", state:"MS", market:"Biloxi" },
    "Kirtland AFB": { zip:"87117", cityKey:"Kirtland", state:"NM", market:"Albuquerque" },
    "Langley AFB": { zip:"23665", cityKey:"Langley", state:"VA", market:"Hampton Roads" },
    "Laughlin AFB": { zip:"78843", cityKey:"Laughlin", state:"TX", market:"Del Rio" },
    "Little Rock AFB": { zip:"72099", cityKey:"LittleRock", state:"AR", market:"Little Rock" },
    "Luke AFB": { zip:"85309", cityKey:"Luke", state:"AZ", market:"Phoenix" },
    "MacDill AFB": { zip:"33621", cityKey:"MacDill", state:"FL", market:"Tampa" },
    "Malmstrom AFB": { zip:"59402", cityKey:"Malmstrom", state:"MT", market:"Great Falls" },
    "Maxwell AFB": { zip:"36112", cityKey:"Maxwell", state:"AL", market:"Montgomery" },
    "McConnell AFB": { zip:"67221", cityKey:"McConnell", state:"KS", market:"Wichita" },
    "McGuire AFB": { zip:"08641", cityKey:"McGuire", state:"NJ", market:"Joint Base MDL" },
    "Minot AFB": { zip:"58705", cityKey:"Minot", state:"ND", market:"Minot" },
    "Moody AFB": { zip:"31699", cityKey:"Moody", state:"GA", market:"Valdosta" },
    "Mountain Home AFB": { zip:"83648", cityKey:"MountainHome", state:"ID", market:"Mountain Home" },
    "Nellis AFB": { zip:"89191", cityKey:"Nellis", state:"NV", market:"Las Vegas" },
    "Offutt AFB": { zip:"68113", cityKey:"Offutt", state:"NE", market:"Omaha" },
    "Patrick SFB": { zip:"32925", cityKey:"Patrick", state:"FL", market:"Space Coast" },
    "Peterson SFB": { zip:"80914", cityKey:"Peterson", state:"CO", market:"Colorado Springs" },
    "Robins AFB": { zip:"31098", cityKey:"Robins", state:"GA", market:"Warner Robins" },
    "Scott AFB": { zip:"62225", cityKey:"Scott", state:"IL", market:"St. Louis Metro" },
    "Seymour Johnson AFB": { zip:"27531", cityKey:"SeymourJohnson", state:"NC", market:"Goldsboro" },
    "Shaw AFB": { zip:"29152", cityKey:"Shaw", state:"SC", market:"Sumter" },
    "Sheppard AFB": { zip:"76311", cityKey:"Sheppard", state:"TX", market:"Wichita Falls" },
    "Tinker AFB": { zip:"73145", cityKey:"Tinker", state:"OK", market:"Oklahoma City" },
    "Travis AFB": { zip:"94535", cityKey:"Travis", state:"CA", market:"Fairfield" },
    "Tyndall AFB": { zip:"32403", cityKey:"Tyndall", state:"FL", market:"Panama City" },
    "Vance AFB": { zip:"73705", cityKey:"Vance", state:"OK", market:"Enid" },
    "Vandenberg SFB": { zip:"93437", cityKey:"Vandenberg", state:"CA", market:"Lompoc" },
    "Whiteman AFB": { zip:"65305", cityKey:"Whiteman", state:"MO", market:"Knob Noster" },
    "Wright-Patterson AFB": { zip:"45433", cityKey:"WrightPatterson", state:"OH", market:"Dayton" }
  };

  // =========================================================
  // //#2 DOM
  // =========================================================
  const $ = (id) => document.getElementById(id);

  const el = {
    heroHealth:$("hero-health"),
    heroHealthNote:$("hero-health-note"),
    heroPayment:$("hero-payment"),
    heroIncome:$("hero-income"),
    heroResidual:$("hero-residual"),
    heroResidualPct:$("hero-residual-pct"),

    statusPill:$("statusPill"),
    statusText:$("statusText"),
    errorBox:$("errorBox"),

    rank:$("rank"),
    yos:$("yos"),
    base:$("base"),
    dependents:$("dependents"),
    additionalIncome:$("additionalIncome"),
    monthlyObligations:$("monthlyObligations"),

    btnFetchPay:$("btn-fetch-pay"),
    btnCalc:$("btn-calc"),
    btnClear:$("btn-clear"),

    profilePills:$("profilePills"),

    homePrice:$("homePrice"),
    downPayment:$("downPayment"),
    creditScore:$("creditScore"),
    loanType:$("loanType"),
    taxRate:$("taxRate"),
    insuranceMonthly:$("insuranceMonthly"),
    hoaMonthly:$("hoaMonthly"),
    pmiMonthly:$("pmiMonthly"),

    rateLine:$("rateLine"),

    allInPayment:$("allInPayment"),
    loanAmount:$("loanAmount"),
    piPayment:$("piPayment"),
    taxMonthly:$("taxMonthly"),
    insuranceOut:$("insuranceOut"),
    hoaOut:$("hoaOut"),
    pmiOut:$("pmiOut"),
    mortgageSource:$("mortgageSource"),

    totalIncome:$("totalIncome"),
    housingRatio:$("housingRatio"),
    basePay:$("basePay"),
    bah:$("bah"),
    bas:$("bas"),
    additionalIncomeOut:$("additionalIncomeOut"),
    compSource:$("compSource"),
    verdictBox:$("verdictBox"),

    healthRing:$("healthRing"),
    residualPercent:$("residualPercent"),
    healthBarFill:$("healthBarFill"),
    healthIncome:$("healthIncome"),
    healthMortgage:$("healthMortgage"),
    healthObligations:$("healthObligations"),
    healthOutflow:$("healthOutflow"),
    healthResidual:$("healthResidual"),
    healthNote:$("healthNote")
  };

  // =========================================================
  // //#3 HELPERS
  // =========================================================
  function n(value, fallback){
    const parsed = Number(String(value ?? "").replace(/[$,%]/g, "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function round2(value){
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function money(value){
    const x = Number(value);
    if(!Number.isFinite(x)) return "—";
    return x.toLocaleString("en-US", {
      style:"currency",
      currency:"USD",
      maximumFractionDigits:0
    });
  }

  function money2(value){
    const x = Number(value);
    if(!Number.isFinite(x)) return "—";
    return x.toLocaleString("en-US", {
      style:"currency",
      currency:"USD",
      minimumFractionDigits:2,
      maximumFractionDigits:2
    });
  }

  function pct(value){
    const x = Number(value);
    if(!Number.isFinite(x)) return "—";
    return `${round2(x)}%`;
  }

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_){
      return fallback;
    }
  }

  function writeJSON(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch(_){}
  }

  function dispatchSafe(name, detail){
    try{
      window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }catch(_){}
  }

  async function postJSON(url, body){
    const response = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      cache:"no-store",
      body:JSON.stringify(body || {})
    });

    const data = await response.json().catch(() => ({}));

    if(!response.ok || data.ok === false){
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  function setStatus(kind, text){
    if(!el.statusPill) return;

    const dot = el.statusPill.querySelector(".dot");
    if(dot){
      dot.classList.remove("ok","warn","bad");
      if(kind) dot.classList.add(kind);
    }

    el.statusText.textContent = text || "Ready";
  }

  function setError(message){
    el.errorBox.textContent = message ? String(message) : "";
  }

  function classTone(node, tone){
    if(!node) return;
    node.classList.remove("ok","warn","bad");
    if(tone) node.classList.add(tone);
  }

  function getBaseMeta(){
    const baseName = String(el.base.value || "").trim();
    return BASE_META[baseName] || {};
  }

  function familyCount(){
    return String(el.dependents.value || "") === "with" ? 2 : 1;
  }

  function hasDependents(){
    return String(el.dependents.value || "") === "with";
  }

  function aprFromCreditScore(score){
    const s = clamp(Math.floor(n(score, 720) || 720), 300, 850);

    if(s >= 780) return 6.10;
    if(s >= 760) return 6.25;
    if(s >= 740) return 6.45;
    if(s >= 720) return 6.65;
    if(s >= 700) return 6.95;
    if(s >= 680) return 7.25;
    if(s >= 660) return 7.55;
    if(s >= 640) return 7.85;

    return 8.25;
  }

  function monthlyPI(loanAmount, aprPct, termYears){
    const loan = Math.max(0, n(loanAmount, 0));
    const apr = Math.max(0, n(aprPct, 0)) / 100;
    const years = Math.max(1, Math.round(n(termYears, 30) || 30));
    const months = years * 12;
    const monthlyRate = apr / 12;

    if(loan <= 0) return 0;
    if(monthlyRate <= 0) return loan / months;

    const pow = Math.pow(1 + monthlyRate, months);
    const payment = loan * monthlyRate * pow / (pow - 1);

    return Number.isFinite(payment) ? payment : 0;
  }

  function safeSetInput(input, value){
    if(!input) return;
    const valueNumber = n(value, 0);
    if(valueNumber > 0){
      input.value = String(Math.round(valueNumber));
    }
  }

  // =========================================================
  // //#4 STATE
  // =========================================================
  const state = {
    intake:null,
    compensation:null,
    mortgage:null,
    health:null,
    compSource:"none",
    mortgageSource:"local"
  };

  // =========================================================
  // //#5 FINANCIAL INTAKE PREFILL
  // =========================================================
  function getFinancialIntake(){
    const intakeModern = readJSON(KEY_INTAKE, {}) || {};
    const intakeLegacy = readJSON(KEY_INTAKE_LEGACY, {}) || {};
    const overrides = readJSON(KEY_OVERRIDES, {}) || {};
    const bridgeV1 = readJSON(KEY_BRIDGE_V1, {}) || {};
    const bridge = readJSON(KEY_BRIDGE, {}) || {};
    const realtyBridge = readJSON(KEY_REALTY_BRIDGE, {}) || {};

    return {
      ...realtyBridge,
      ...bridge,
      ...bridgeV1,
      ...intakeLegacy,
      ...intakeModern,
      ...overrides
    };
  }

  function prefillFromIntake(){
    const intake = getFinancialIntake();
    state.intake = intake;

    const price =
      n(intake.projected_home_price, 0) ||
      n(intake.projectedHomePrice, 0) ||
      n(intake.homePrice, 0) ||
      n(intake.price, 0) ||
      n(intake.housingOverride, 0) ||
      n(intake.housing, 0);

    const down =
      n(intake.downpayment, 0) ||
      n(intake.downPayment, 0) ||
      n(intake.down_payment, 0) ||
      n(intake.dpAmt, 0) ||
      n(intake.savingsOverride, 0);

    const score =
      n(intake.credit_score, 0) ||
      n(intake.creditScore, 0) ||
      n(intake.fico, 0);

    const expenses =
      n(intake.monthly_expenses, 0) ||
      n(intake.monthlyExpenses, 0) ||
      n(intake.expenses, 0) ||
      n(intake.expensesOverride, 0);

    safeSetInput(el.homePrice, price);
    safeSetInput(el.downPayment, down);
    safeSetInput(el.creditScore, score);
    safeSetInput(el.monthlyObligations, expenses);

    const rank = String(
      intake.rank_paygrade ||
      intake.rankPaygrade ||
      intake.rank ||
      ""
    ).trim().toUpperCase();

    if(rank && Array.from(el.rank.options).some(option => option.value === rank)){
      el.rank.value = rank;
    }

    const yos = String(
      intake.yos ||
      intake.yearsOfService ||
      intake.years_of_service ||
      ""
    ).replace(/[^\d]/g,"");

    if(yos && Array.from(el.yos.options).some(option => option.value === yos)){
      el.yos.value = yos;
    }

    const baseName = String(
      intake.base ||
      intake.currentBase ||
      intake.current_base ||
      intake.pcsBase ||
      intake.pcs_base ||
      ""
    ).trim();

    if(baseName && Array.from(el.base.options).some(option => option.value === baseName)){
      el.base.value = baseName;
    }

    const family =
      n(intake.family, 0) ||
      n(intake.familySize, 0) ||
      n(intake.family_size, 0) ||
      n(intake.dependents_count, 0);

    if(family){
      el.dependents.value = family > 1 ? "with" : "without";
    }

    const additional =
      n(intake.additional_income, 0) ||
      n(intake.additionalIncome, 0) ||
      n(intake.additional_monthly_income, 0);

    if(additional > 0){
      el.additionalIncome.value = String(Math.round(additional));
    }

    const insurance =
      n(intake.insurance_monthly, 0) ||
      n(intake.insuranceMonthly, 0) ||
      n(intake.home_insurance_monthly, 0) ||
      n(intake.homeInsuranceMonthly, 0);

    safeSetInput(el.insuranceMonthly, insurance);
  }

  // =========================================================
  // //#6 COMPENSATION
  // =========================================================
  function extractCompensation(data){
    const payload = data && (data.payload || data.data || data.result || data) || {};
    const truth = payload.truth_packet || payload.truthPacket || data.truth_packet || {};
    const comp = payload.compensation || payload.comp || payload.pay || truth.compensation || {};
    const monthly = comp.monthly || payload.monthly || truth.monthly || comp || {};

    const basePay =
      n(monthly.basicPay, 0) ||
      n(monthly.basePay, 0) ||
      n(monthly.base_pay, 0) ||
      n(payload.basePay, 0) ||
      n(payload.base_pay, 0);

    const bas =
      n(monthly.bas, 0) ||
      n(monthly.BAS, 0) ||
      n(payload.bas, 0) ||
      n(payload.BAS, 0);

    const bah =
      n(monthly.bah, 0) ||
      n(monthly.BAH, 0) ||
      n(payload.bah, 0) ||
      n(payload.BAH, 0);

    const total =
      n(monthly.grossMonthlyComp, 0) ||
      n(monthly.combinedMonthlyGross, 0) ||
      n(monthly.totalMilitaryIncome, 0) ||
      n(monthly.totalMonthly, 0) ||
      n(monthly.total_monthly, 0) ||
      n(payload.totalMonthly, 0) ||
      n(payload.total_monthly, 0) ||
      (basePay + bas + bah);

    return {
      basePay,
      bas,
      bah,
      total,
      raw:data
    };
  }

  async function fetchCompensation(){
    setError("");
    setStatus("warn", "Fetching TheWing pay…");
    el.btnFetchPay.disabled = true;

    const rank = String(el.rank.value || "").trim();
    const yos = n(el.yos.value, 0);
    const baseName = String(el.base.value || "").trim();
    const meta = getBaseMeta();
    const additionalIncome = Math.max(0, n(el.additionalIncome.value, 0));
    const monthlyExpenses = Math.max(0, n(el.monthlyObligations.value, 0));

    if(!rank){
      setStatus("bad", "Missing rank");
      setError("Select a rank.");
      el.btnFetchPay.disabled = false;
      return;
    }

    if(!yos){
      setStatus("bad", "Missing YOS");
      setError("Select years of service.");
      el.btnFetchPay.disabled = false;
      return;
    }

    if(!baseName){
      setStatus("bad", "Missing base");
      setError("Select a base.");
      el.btnFetchPay.disabled = false;
      return;
    }

    const input = {
      source:"pcsunited.lightweight_fad.mortgage_health.saas.v1",
      mode:"active_duty",
      status:"active_duty",

      rank,
      rank_paygrade:rank,
      paygrade:rank,

      yos,
      yearsOfService:yos,
      years_of_service:yos,

      base:baseName,
      currentBase:baseName,
      current_base:baseName,
      pcsBase:baseName,
      pcs_base:baseName,

      dependents:el.dependents.value,
      dependentStatus:el.dependents.value,
      hasDependents:hasDependents(),
      has_dependents:hasDependents(),

      family:familyCount(),
      familySize:familyCount(),
      family_size:familyCount(),

      zip:meta.zip || "",
      bah_zip:meta.zip || "",
      cityKey:meta.cityKey || "",
      market:meta.market || "",

      additionalIncome,
      additional_income:additionalIncome,
      additionalIncomeMonthly:additionalIncome,

      monthlyExpenses,
      monthly_expenses:monthlyExpenses,
      expenses:monthlyExpenses,

      projectedHomePrice:n(el.homePrice.value,0),
      projected_home_price:n(el.homePrice.value,0),
      price:n(el.homePrice.value,0),

      downpayment:n(el.downPayment.value,0),
      downPayment:n(el.downPayment.value,0),

      creditScore:n(el.creditScore.value,720),
      credit_score:n(el.creditScore.value,720)
    };

    const bodies = [
      { tool:"PCS_SNAPSHOT", input },
      { type:"PCS_SNAPSHOT", input },
      input
    ];

    let lastError = null;

    try{
      for(const body of bodies){
        try{
          const data = await postJSON(`${EP_BRAIN}?t=${Date.now()}`, body);
          const comp = extractCompensation(data);

          if(comp && (comp.basePay || comp.bas || comp.bah || comp.total)){
            state.compensation = comp;
            state.compSource = "TheWing.ai";
            paintCompensation();
            computeHealth();
            setStatus("ok", "TheWing pay loaded");
            el.btnFetchPay.disabled = false;
            return;
          }
        }catch(err){
          lastError = err;
        }
      }

      throw lastError || new Error("TheWing did not return compensation for this combination.");
    }catch(err){
      state.compensation = null;
      state.compSource = "error";
      paintCompensation();
      computeHealth();
      setStatus("bad", "Pay error");
      setError(err && err.message ? err.message : String(err));
    }finally{
      el.btnFetchPay.disabled = false;
    }
  }

  function paintCompensation(){
    const comp = state.compensation || {};
    const additional = Math.max(0, n(el.additionalIncome.value, 0));
    const totalIncome = n(comp.total, 0) + additional;

    el.basePay.textContent = comp.basePay ? money2(comp.basePay) : "$—";
    el.bah.textContent = comp.bah ? money2(comp.bah) : "$—";
    el.bas.textContent = comp.bas ? money2(comp.bas) : "$—";
    el.additionalIncomeOut.textContent = money2(additional);
    el.totalIncome.textContent = totalIncome > 0 ? money2(totalIncome) : "$—";
    el.heroIncome.textContent = totalIncome > 0 ? money2(totalIncome) : "$—";
    el.compSource.textContent = state.compSource === "TheWing.ai" ? "TheWing.ai" : "—";

    renderPills();
  }

  // =========================================================
  // //#7 MORTGAGE
  // =========================================================
  function localMortgageFallback(){
    const price = Math.max(0, n(el.homePrice.value, 0));
    const downPayment = clamp(Math.max(0, n(el.downPayment.value, 0)), 0, price);
    const loanAmount = Math.max(0, price - downPayment);
    const creditScore = clamp(n(el.creditScore.value, 720), 300, 850);
    const apr = aprFromCreditScore(creditScore);

    const pi = monthlyPI(loanAmount, apr, TERM_YEARS);
    const taxMonthly = (price * (Math.max(0, n(el.taxRate.value, 0)) / 100)) / 12;
    const insuranceMonthly = Math.max(0, n(el.insuranceMonthly.value, 0));
    const hoaMonthly = Math.max(0, n(el.hoaMonthly.value, 0));
    const pmiMonthly = Math.max(0, n(el.pmiMonthly.value, 0));
    const allIn = pi + taxMonthly + insuranceMonthly + hoaMonthly + pmiMonthly;

    return {
      ok:true,
      source:"local_fallback",
      apr,
      termYears:TERM_YEARS,
      price,
      downPayment,
      loanAmount,
      monthly:{
        principalInterest:round2(pi),
        pi:round2(pi),
        propertyTax:round2(taxMonthly),
        tax:round2(taxMonthly),
        insurance:round2(insuranceMonthly),
        hoa:round2(hoaMonthly),
        pmi:round2(pmiMonthly),
        allIn:round2(allIn),
        totalMonthly:round2(allIn),
        totalPayment:round2(allIn)
      },
      breakdown:{
        pi:round2(pi),
        tax:round2(taxMonthly),
        insurance:round2(insuranceMonthly),
        hoa:round2(hoaMonthly),
        pmi:round2(pmiMonthly),
        allIn:round2(allIn)
      }
    };
  }

  function normalizeMortgageResult(data){
    const mortgage = data.mortgage || data.result || data;
    const monthly = mortgage.monthly || data.monthly || {};
    const breakdown = mortgage.breakdown || data.breakdown || {};
    const meta = data.meta || mortgage.meta || {};

    const price = n(
      mortgage.price ||
      data.price ||
      n(el.homePrice.value,0),
      0
    );

    const loanAmount = n(
      mortgage.loanAmount ||
      mortgage.loan_amount ||
      data.loanAmount ||
      data.loan_amount ||
      data.loan ||
      price - n(el.downPayment.value,0),
      0
    );

    const apr = n(
      mortgage.apr ||
      data.apr ||
      data.rate ||
      aprFromCreditScore(el.creditScore.value),
      0
    );

    const pi =
      n(breakdown.pi,0) ||
      n(monthly.principalInterest,0) ||
      n(monthly.monthlyPI,0) ||
      n(monthly.pi,0) ||
      n(monthly.principal_interest,0);

    const tax =
      n(breakdown.tax,0) ||
      n(monthly.propertyTax,0) ||
      n(monthly.tax,0) ||
      n(monthly.taxMonthly,0);

    const insurance =
      n(breakdown.insurance,0) ||
      n(monthly.insurance,0) ||
      n(monthly.insuranceMonthly,0);

    const hoa =
      n(breakdown.hoa,0) ||
      n(monthly.hoa,0) ||
      n(monthly.hoaMonthly,0);

    const pmi =
      n(breakdown.pmi,0) ||
      n(monthly.pmi,0) ||
      n(monthly.pmiMonthly,0);

    const allIn =
      n(breakdown.allIn,0) ||
      n(monthly.allIn,0) ||
      n(monthly.totalMonthly,0) ||
      n(monthly.totalPayment,0) ||
      n(data.totalMonthly,0) ||
      (pi + tax + insurance + hoa + pmi);

    return {
      ok:true,
      source:data.source || data.app || "thewing_mortgage",
      apr,
      termYears:n(mortgage.termYears || data.termYears || TERM_YEARS, TERM_YEARS),
      price,
      loanAmount,
      monthly:{
        principalInterest:round2(pi),
        pi:round2(pi),
        propertyTax:round2(tax),
        tax:round2(tax),
        insurance:round2(insurance),
        hoa:round2(hoa),
        pmi:round2(pmi),
        allIn:round2(allIn),
        totalMonthly:round2(allIn),
        totalPayment:round2(allIn)
      },
      breakdown:{
        pi:round2(pi),
        tax:round2(tax),
        insurance:round2(insurance),
        hoa:round2(hoa),
        pmi:round2(pmi),
        allIn:round2(allIn)
      },
      meta:{
        engineVersion:meta.engineVersion || data.engineVersion || "",
        insuranceSource:meta.insuranceSource || "",
        propertyTaxSource:meta.propertyTaxSource || "",
        aprSource:meta.aprSource || data.aprSource || "",
        pmiSource:meta.pmiSource || "",
        generatedAt:meta.generatedAt || ""
      },
      raw:data
    };
  }

  async function calculateMortgage(){
    setError("");
    setStatus("warn", "Calculating mortgage…");
    el.btnCalc.disabled = true;

    const price = Math.max(0, n(el.homePrice.value,0));
    const downPayment = Math.max(0, n(el.downPayment.value,0));
    const creditScore = clamp(n(el.creditScore.value,720), 300, 850);
    const taxRate = Math.max(0, n(el.taxRate.value,0));
    const insuranceMonthly = Math.max(0, n(el.insuranceMonthly.value,0));
    const hoaMonthly = Math.max(0, n(el.hoaMonthly.value,0));
    const pmiMonthly = Math.max(0, n(el.pmiMonthly.value,0));
    const loanType = String(el.loanType.value || "va");

    const payload = {
      source:"pcsunited.lightweight_fad.mortgage_health.saas.v1",

      price,
      projected_home_price:price,
      projectedHomePrice:price,

      downpayment:downPayment,
      downPayment,
      down_payment:downPayment,

      creditScore,
      credit_score:creditScore,

      termYears:TERM_YEARS,
      term_years:TERM_YEARS,

      loanType,
      loan_type:loanType,

      property_tax_rate:taxRate,
      propertyTaxRate:taxRate,
      taxRate,

      insurance_monthly:insuranceMonthly,
      insuranceMonthly,
      home_insurance_monthly:insuranceMonthly,
      homeInsuranceMonthly:insuranceMonthly,

      hoa_monthly:hoaMonthly,
      hoaMonthly,

      pmi_monthly:pmiMonthly,
      pmiMonthly
    };

    try{
      const data = await postJSON(`${EP_MORTGAGE}?t=${Date.now()}`, payload);
      state.mortgage = normalizeMortgageResult(data);
      state.mortgageSource = "TheWing.ai";

      paintMortgage();
      computeHealth();
      setStatus("ok", "Mortgage ready");
    }catch(err){
      state.mortgage = localMortgageFallback();
      state.mortgageSource = "Local fallback";

      paintMortgage();
      computeHealth();
      setStatus("warn", "Local mortgage math");
      setError(
        "TheWing mortgage endpoint did not respond, so this dashboard used local fallback math. " +
        (err && err.message ? err.message : "")
      );
    }finally{
      el.btnCalc.disabled = false;
    }
  }

  function paintMortgage(){
    const mortgage = state.mortgage || localMortgageFallback();
    const breakdown = mortgage.breakdown || {};
    const monthly = mortgage.monthly || {};

    const allIn =
      n(breakdown.allIn,0) ||
      n(monthly.allIn,0) ||
      n(monthly.totalMonthly,0);

    const pi =
      n(breakdown.pi,0) ||
      n(monthly.pi,0) ||
      n(monthly.principalInterest,0);

    const tax =
      n(breakdown.tax,0) ||
      n(monthly.tax,0) ||
      n(monthly.propertyTax,0);

    const insurance =
      n(breakdown.insurance,0) ||
      n(monthly.insurance,0);

    const hoa =
      n(breakdown.hoa,0) ||
      n(monthly.hoa,0);

    const pmi =
      n(breakdown.pmi,0) ||
      n(monthly.pmi,0);

    el.allInPayment.textContent = money2(allIn);
    el.heroPayment.textContent = money2(allIn);
    el.loanAmount.textContent = `${money(mortgage.loanAmount)} loan`;
    el.piPayment.textContent = money2(pi);
    el.taxMonthly.textContent = money2(tax);
    el.insuranceOut.textContent = money2(insurance);
    el.hoaOut.textContent = money2(hoa);
    el.pmiOut.textContent = money2(pmi);

    const apr = n(mortgage.apr,0);
    const termYears = n(mortgage.termYears, TERM_YEARS) || TERM_YEARS;

    el.rateLine.textContent = apr > 0
      ? `${apr.toFixed(2)}% APR • ${termYears} years`
      : "TheWing mortgage engine";

    if(state.mortgageSource === "TheWing.ai"){
      const meta = mortgage.meta || {};
      const parts = ["Mortgage calculation powered by TheWing.ai /api/mortgage."];

      if(meta.engineVersion){
        parts.push(`Engine ${meta.engineVersion}.`);
      }

      if(meta.insuranceSource === "inputMonthly"){
        parts.push("Insurance uses your monthly input.");
      }

      el.mortgageSource.textContent = parts.join(" ");
    }else{
      el.mortgageSource.textContent = "Mortgage calculation is using local fallback math.";
    }
  }

  // =========================================================
  // //#8 FINANCIAL HEALTH
  // =========================================================
  function getHealthStatus(residualRatio, residual, income){
    if(income <= 0){
      return {
        label:"Needs Inputs",
        tone:"warn",
        note:"Fetch pay or enter income details to calculate financial health."
      };
    }

    if(residual < 0){
      return {
        label:"High Risk",
        tone:"bad",
        note:"Estimated mortgage and obligations exceed monthly income."
      };
    }

    if(residualRatio >= 35){
      return {
        label:"Strong",
        tone:"ok",
        note:"Strong residual margin after mortgage and obligations."
      };
    }

    if(residualRatio >= 25){
      return {
        label:"Healthy",
        tone:"ok",
        note:"Healthy residual income after required outflow."
      };
    }

    if(residualRatio >= 15){
      return {
        label:"Workable",
        tone:"warn",
        note:"Workable, but the budget should be watched closely."
      };
    }

    if(residualRatio >= 5){
      return {
        label:"Stressed",
        tone:"warn",
        note:"Residual margin is thin. Consider reducing price or obligations."
      };
    }

    return {
      label:"High Risk",
      tone:"bad",
      note:"Very limited residual margin after mortgage and obligations."
    };
  }

  function computeHealth(){
    const mortgage = state.mortgage || localMortgageFallback();

    const allIn =
      n(mortgage.breakdown && mortgage.breakdown.allIn,0) ||
      n(mortgage.monthly && mortgage.monthly.allIn,0) ||
      n(mortgage.monthly && mortgage.monthly.totalMonthly,0);

    const comp = state.compensation || {};
    const militaryIncome = n(comp.total,0);
    const additionalIncome = Math.max(0, n(el.additionalIncome.value,0));
    const totalIncome = militaryIncome + additionalIncome;

    const monthlyObligations = Math.max(0, n(el.monthlyObligations.value,0));
    const totalOutflow = allIn + monthlyObligations;
    const residual = totalIncome - totalOutflow;

    const residualRatio = totalIncome > 0 ? (residual / totalIncome) * 100 : 0;
    const housingRatio = totalIncome > 0 ? (allIn / totalIncome) * 100 : 0;
    const outflowRatio = totalIncome > 0 ? (totalOutflow / totalIncome) * 100 : 0;

    const status = getHealthStatus(residualRatio, residual, totalIncome);

    state.health = {
      totalIncome:round2(totalIncome),
      militaryIncome:round2(militaryIncome),
      additionalIncome:round2(additionalIncome),
      mortgagePayment:round2(allIn),
      monthlyObligations:round2(monthlyObligations),
      totalOutflow:round2(totalOutflow),
      residualIncome:round2(residual),
      residualRatioPct:round2(residualRatio),
      housingRatioPct:round2(housingRatio),
      totalOutflowRatioPct:round2(outflowRatio),
      status:status.label,
      tone:status.tone,
      note:status.note
    };

    paintHealth();
    saveSnapshot();

    return state.health;
  }

  function paintHealth(){
    const health = state.health || {};
    const tone = health.tone || "warn";

    const ringColor =
      tone === "ok"
        ? "var(--mint)"
        : tone === "bad"
          ? "var(--danger)"
          : "var(--gold)";

    const residualPct = n(health.residualRatioPct,0);
    const ringPct = clamp(residualPct, 0, 100);

    el.healthRing.style.setProperty("--pct", ringPct);
    el.healthRing.style.setProperty("--ring-color", ringColor);

    el.residualPercent.textContent = health.totalIncome > 0 ? pct(residualPct) : "—";

    el.healthBarFill.classList.remove("warn","bad");
    if(tone === "warn") el.healthBarFill.classList.add("warn");
    if(tone === "bad") el.healthBarFill.classList.add("bad");
    el.healthBarFill.style.width = `${ringPct}%`;

    el.healthIncome.textContent = health.totalIncome > 0 ? money2(health.totalIncome) : "$—";
    el.healthMortgage.textContent = health.mortgagePayment > 0 ? money2(health.mortgagePayment) : "$—";
    el.healthObligations.textContent = money2(health.monthlyObligations || 0);
    el.healthOutflow.textContent = health.totalOutflow > 0 ? money2(health.totalOutflow) : "$—";
    el.healthResidual.textContent = health.totalIncome > 0 ? money2(health.residualIncome) : "$—";

    classTone(el.healthResidual, tone);
    classTone(el.healthNote, tone);
    classTone(el.heroHealth, tone);
    classTone(el.heroResidual, tone);
    classTone(el.heroResidualPct, tone);
    classTone(el.verdictBox, tone);

    el.totalIncome.textContent = health.totalIncome > 0 ? money2(health.totalIncome) : "$—";
    el.heroIncome.textContent = health.totalIncome > 0 ? money2(health.totalIncome) : "$—";
    el.housingRatio.textContent = health.totalIncome > 0 ? `${pct(health.housingRatioPct)} housing ratio` : "— housing ratio";

    el.heroResidual.textContent = health.totalIncome > 0 ? money2(health.residualIncome) : "$—";
    el.heroResidualPct.textContent = health.totalIncome > 0 ? pct(health.residualRatioPct) : "—";

    el.heroHealth.textContent = health.status || "Needs Inputs";
    el.heroHealthNote.textContent = health.note || "Calculate mortgage health to generate your snapshot.";

    el.healthNote.textContent =
      health.totalIncome > 0
        ? `${health.status}: ${health.note} Residual margin is ${pct(health.residualRatioPct)} of total monthly income.`
        : "Add income data to generate a lightweight financial health signal.";

    el.verdictBox.textContent =
      health.totalIncome > 0
        ? `Verdict: ${health.status}. Total income is ${money2(health.totalIncome)}, total outflow is ${money2(health.totalOutflow)}, and residual income is ${money2(health.residualIncome)}.`
        : "Verdict: Need income data. Use optional military inputs and fetch TheWing pay.";
  }

  // =========================================================
  // //#9 SNAPSHOT SAVE
  // =========================================================
  function saveSnapshot(){
    const payload = {
      source:"pcsunited.lightweight_fad.mortgage_health.saas.v1",
      saved_at:new Date().toISOString(),

      profile:{
        rank:el.rank.value,
        rank_paygrade:el.rank.value,
        yos:n(el.yos.value,0),
        base:el.base.value,
        dependents:el.dependents.value,
        family:familyCount()
      },

      inputs:{
        price:n(el.homePrice.value,0),
        downpayment:n(el.downPayment.value,0),
        credit_score:n(el.creditScore.value,720),
        loan_type:el.loanType.value,
        property_tax_rate:n(el.taxRate.value,0),
        insurance_monthly:n(el.insuranceMonthly.value,0),
        hoa_monthly:n(el.hoaMonthly.value,0),
        pmi_monthly:n(el.pmiMonthly.value,0),
        additional_income:n(el.additionalIncome.value,0),
        monthly_obligations:n(el.monthlyObligations.value,0)
      },

      compensation:state.compensation,
      mortgage:state.mortgage,
      financial_health:state.health
    };

    writeJSON(KEY_OUTPUT, payload);
    writeJSON(KEY_MORTGAGE_HEALTH, payload);

    dispatchSafe("pcsunited:mortgage-health-ready", payload);
    dispatchSafe("pcsunited:lightweight-fad-ready", payload);
  }

  // =========================================================
  // //#10 UI
  // =========================================================
  function renderPills(){
    const items = [
      ["Rank", el.rank.value || "—"],
      ["YOS", el.yos.value || "—"],
      ["Base", el.base.value || "—"],
      ["Deps", el.dependents.value === "with" ? "With" : "Without"],
      ["Extra", money(n(el.additionalIncome.value,0))]
    ];

    el.profilePills.innerHTML = items.map(([label, value]) => {
      return `<div class="info-pill"><span>${label}:</span><b>${String(value)}</b></div>`;
    }).join("");
  }

  function clearAll(){
    state.intake = null;
    state.compensation = null;
    state.mortgage = null;
    state.health = null;
    state.compSource = "none";
    state.mortgageSource = "local";

    el.rank.value = "E-5";
    el.yos.value = "6";
    el.base.value = "JBSA Lackland";
    el.dependents.value = "with";
    el.additionalIncome.value = "0";
    el.monthlyObligations.value = "";

    el.homePrice.value = "450000";
    el.downPayment.value = "22500";
    el.creditScore.value = "720";
    el.loanType.value = "va";
    el.taxRate.value = "2.10";
    el.insuranceMonthly.value = "180";
    el.hoaMonthly.value = "0";
    el.pmiMonthly.value = "0";

    el.basePay.textContent = "$—";
    el.bah.textContent = "$—";
    el.bas.textContent = "$—";
    el.additionalIncomeOut.textContent = "$—";
    el.totalIncome.textContent = "$—";
    el.heroIncome.textContent = "$—";
    el.compSource.textContent = "—";

    setError("");
    setStatus(null, "Ready");
    renderPills();

    state.mortgage = localMortgageFallback();
    paintMortgage();
    paintCompensation();
    computeHealth();
  }

  function recalcLocal(){
    renderPills();

    if(state.mortgageSource !== "TheWing.ai"){
      state.mortgage = localMortgageFallback();
      paintMortgage();
    }

    paintCompensation();
    computeHealth();
  }

  function wireEvents(){
    el.btnFetchPay.addEventListener("click", fetchCompensation);
    el.btnCalc.addEventListener("click", calculateMortgage);
    el.btnClear.addEventListener("click", clearAll);

    [
      el.rank,
      el.yos,
      el.base,
      el.dependents,
      el.additionalIncome,
      el.monthlyObligations,
      el.homePrice,
      el.downPayment,
      el.creditScore,
      el.loanType,
      el.taxRate,
      el.insuranceMonthly,
      el.hoaMonthly,
      el.pmiMonthly
    ].forEach((input) => {
      if(!input) return;

      input.addEventListener("input", recalcLocal);
      input.addEventListener("change", recalcLocal);
    });
  }

  // =========================================================
  // //#11 BOOT
  // =========================================================
  function boot(){
    prefillFromIntake();
    wireEvents();
    renderPills();

    state.mortgage = localMortgageFallback();

    paintMortgage();
    paintCompensation();
    computeHealth();

    setStatus(null, "Ready");

    window.PCSU_LIGHTWEIGHT_FAD = {
      version:"1.0.1",
      endpoints:{
        brain:EP_BRAIN,
        mortgage:EP_MORTGAGE
      },
      getState:function(){
        return JSON.parse(JSON.stringify(state));
      },
      calculateMortgage,
      fetchCompensation,
      computeHealth,
      clear:clearAll
    };
  }

  boot();
})();
