/* =========================================================
  PCSUNITED • LIGHTWEIGHT FAD / MORTGAGE HEALTH DASHBOARD
  mortgage.js
  v1.3.0 • VA OVERLAY PAYLOAD + READINESS UI

  Synced from webflow-js-embed.html for local index.html dev.
========================================================= */

(function(){
  "use strict";

  /* =========================================================
    //#1 CONFIG
  ========================================================= */

  const VERSION = "1.3.0-va-overlay-payload-readiness-ui";

  const API_BASE = "https://thewing.netlify.app/api";
  const EP_MORTGAGE = API_BASE + "/mortgage";
  const EP_BRAIN = API_BASE + "/opensource-brain";

  const DEFAULT_TERM_YEARS = 30;

  const STORAGE_KEYS = {
    intakeModern:"pcsunited.financial.intake.v1",
    intakeLegacy:"pcsunited.financial_intake.v1",
    bridgeV1:"pcsunited.bridge.v1",
    bridge:"pcsunited.bridge",
    realtyBridge:"realtysass.bridge",
    profile:"pcsunited.profile.v1",
    identity:"pcsunited.identity.v1",
    kpi:"pcsunited.kpi_overrides.v1",
    openFlow:"pcsunited.open_flow_ready.v1",
    mortgageResult:"pcsunited.mortgage_snapshot.v1",
    mortgageMirror:"realtysass.mortgage_cache.v1"
  };

  const BAS = {
    enlisted:465.77,
    officer:320.78
  };

  const BASE_META = {
    "Andrews AFB": { zip:"20762", market:"Washington DC" },
    "Barksdale AFB": { zip:"71110", market:"Bossier City" },
    "Beale AFB": { zip:"95903", market:"Marysville" },
    "Cannon AFB": { zip:"88103", market:"Clovis" },
    "Charleston AFB": { zip:"29404", market:"Charleston" },
    "Davis-Monthan AFB": { zip:"85707", market:"Tucson" },
    "Dover AFB": { zip:"19902", market:"Dover" },
    "Dyess AFB": { zip:"79607", market:"Abilene" },
    "Eglin AFB": { zip:"32542", market:"Fort Walton Beach" },
    "Fairchild AFB": { zip:"99011", market:"Spokane" },
    "FE Warren AFB": { zip:"82005", market:"Cheyenne" },
    "Holloman AFB": { zip:"88330", market:"Alamogordo" },
    "Hurlburt Field": { zip:"32544", market:"Fort Walton Beach" },
    "JBSA Fort Sam Houston": { zip:"78234", market:"San Antonio" },
    "JBSA Lackland": { zip:"78236", market:"San Antonio" },
    "JBSA Randolph": { zip:"78150", market:"San Antonio" },
    "Keesler AFB": { zip:"39534", market:"Biloxi" },
    "Kirtland AFB": { zip:"87117", market:"Albuquerque" },
    "Langley AFB": { zip:"23665", market:"Hampton Roads" },
    "Laughlin AFB": { zip:"78843", market:"Del Rio" },
    "Little Rock AFB": { zip:"72099", market:"Little Rock" },
    "Luke AFB": { zip:"85309", market:"Phoenix" },
    "MacDill AFB": { zip:"33621", market:"Tampa" },
    "Malmstrom AFB": { zip:"59402", market:"Great Falls" },
    "Maxwell AFB": { zip:"36112", market:"Montgomery" },
    "McConnell AFB": { zip:"67221", market:"Wichita" },
    "McGuire AFB": { zip:"08641", market:"Joint Base MDL" },
    "Minot AFB": { zip:"58705", market:"Minot" },
    "Moody AFB": { zip:"31699", market:"Valdosta" },
    "Mountain Home AFB": { zip:"83648", market:"Mountain Home" },
    "Nellis AFB": { zip:"89191", market:"Las Vegas" },
    "Offutt AFB": { zip:"68113", market:"Omaha" },
    "Patrick SFB": { zip:"32925", market:"Space Coast" },
    "Peterson SFB": { zip:"80914", market:"Colorado Springs" },
    "Robins AFB": { zip:"31098", market:"Warner Robins" },
    "Scott AFB": { zip:"62225", market:"St. Louis Metro" },
    "Seymour Johnson AFB": { zip:"27531", market:"Goldsboro" },
    "Shaw AFB": { zip:"29152", market:"Sumter" },
    "Sheppard AFB": { zip:"76311", market:"Wichita Falls" },
    "Tinker AFB": { zip:"73145", market:"Oklahoma City" },
    "Travis AFB": { zip:"94535", market:"Fairfield" },
    "Tyndall AFB": { zip:"32403", market:"Panama City" },
    "Vance AFB": { zip:"73705", market:"Enid" },
    "Vandenberg SFB": { zip:"93437", market:"Lompoc" },
    "Whiteman AFB": { zip:"65305", market:"Knob Noster" },
    "Wright-Patterson AFB": { zip:"45433", market:"Dayton" }
  };

  const ZIP_TO_STATE = {
    "20762":"MD","71110":"LA","95903":"CA","88103":"NM","29404":"SC","85707":"AZ",
    "19902":"DE","79607":"TX","32542":"FL","99011":"WA","82005":"WY","88330":"NM",
    "32544":"FL","78234":"TX","78236":"TX","78150":"TX","39534":"MS","87117":"NM",
    "23665":"VA","78843":"TX","72099":"AR","85309":"AZ","33621":"FL","59402":"MT",
    "36112":"AL","67221":"KS","08641":"NJ","58705":"ND","31699":"GA","83648":"ID",
    "89191":"NV","68113":"NE","32925":"FL","80914":"CO","31098":"GA","62225":"IL",
    "27531":"NC","29152":"SC","76311":"TX","73145":"OK","94535":"CA","32403":"FL",
    "73705":"OK","93437":"CA","65305":"MO","45433":"OH"
  };

  const state = {
    income:{
      basePay:0,
      bah:0,
      bas:0,
      additional:0,
      total:0,
      source:"—",
      lockedOfficial:false,
      raw:null
    },
    mortgage:null,
    obligations:0,
    residual:0,
    residualPct:0,
    health:"Needs Inputs",
    healthKind:"warn",
    healthNote:""
  };

  /* =========================================================
    //#2 DOM
  ========================================================= */

  const root = document.getElementById("pcsu-mortgage-shell");
  if(!root) return;

  const $ = function(id){
    return document.getElementById(id);
  };

  const el = {
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
    errorBox:$("errorBox"),

    homePrice:$("homePrice"),
    downPayment:$("downPayment"),
    creditScore:$("creditScore"),
    loanType:$("loanType"),
    taxRate:$("taxRate"),
    insuranceMonthly:$("insuranceMonthly"),
    hoaMonthly:$("hoaMonthly"),
    pmiMonthly:$("pmiMonthly"),

    statusPill:$("statusPill"),
    statusText:$("statusText"),
    rateLine:$("rateLine"),

    heroHealth:$("hero-health"),
    heroHealthNote:$("hero-health-note"),
    heroIncome:$("hero-income"),
    heroPayment:$("hero-payment"),
    heroResidual:$("hero-residual"),
    heroResidualPct:$("hero-residual-pct"),

    healthRing:$("healthRing"),
    residualPercent:$("residualPercent"),

    healthIncome:$("healthIncome"),
    healthMortgage:$("healthMortgage"),
    healthObligations:$("healthObligations"),
    healthOutflow:$("healthOutflow"),
    healthResidual:$("healthResidual"),

    buyerRangeTarget:$("buyerRangeTarget"),
    buyerRangeMin:$("buyerRangeMin"),
    buyerRangeMax:$("buyerRangeMax"),
    buyerRangeFill:$("buyerRangeFill"),
    buyerRangeNote:$("buyerRangeNote"),
    buyerRangeProgress:$("buyerRangeProgress"),

    allInPayment:$("allInPayment"),
    loanAmount:$("loanAmount"),
    piPayment:$("piPayment"),
    taxMonthly:$("taxMonthly"),
    insuranceOut:$("insuranceOut"),
    hoaOut:$("hoaOut"),
    pmiOut:$("pmiOut"),
    mortgageSource:$("mortgageSource"),

    vaReadinessPanel:$("vaReadinessPanel"),
    vaFundingFeeOut:$("vaFundingFeeOut"),
    vaTotalLoanOut:$("vaTotalLoanOut"),
    vaDtiOut:$("vaDtiOut"),
    vaResidualIncomeOut:$("vaResidualIncomeOut"),
    vaResidualRequiredOut:$("vaResidualRequiredOut"),
    vaResidualPassOut:$("vaResidualPassOut"),
    vaReadinessNote:$("vaReadinessNote"),

    totalIncome:$("totalIncome"),
    housingRatio:$("housingRatio"),
    basePay:$("basePay"),
    bah:$("bah"),
    bas:$("bas"),
    additionalIncomeOut:$("additionalIncomeOut"),
    compSource:$("compSource"),
    verdictBox:$("verdictBox")
  };

  /* =========================================================
    //#3 UTILITIES
  ========================================================= */

  function n(v, fallback){
    const x = Number(String(v ?? "").replace(/[$,%]/g,"").replace(/,/g,""));
    return Number.isFinite(x) ? x : (fallback || 0);
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function money(value, decimals){
    const x = Number(value);
    if(!Number.isFinite(x)) return "$—";

    return x.toLocaleString("en-US",{
      style:"currency",
      currency:"USD",
      minimumFractionDigits:decimals || 0,
      maximumFractionDigits:decimals || 0
    });
  }

  function pct(value, decimals){
    const x = Number(value);
    if(!Number.isFinite(x)) return "—";
    return x.toFixed(decimals ?? 1) + "%";
  }

  function readJSON(key, fallback){
    try{
      const rawLocal = localStorage.getItem(key);
      if(rawLocal) return JSON.parse(rawLocal);

      const rawSession = sessionStorage.getItem(key);
      if(rawSession) return JSON.parse(rawSession);

      return fallback;
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
      window.dispatchEvent(new CustomEvent(name,{ detail:detail || {} }));
    }catch(_){}
  }

  function setText(node, value){
    if(node) node.textContent = value;
  }

  function setInputValue(node, value){
    if(!node) return;
    if(value === undefined || value === null || value === "") return;
    node.value = String(value);
  }

  function setError(message){
    if(!el.errorBox) return;
    el.errorBox.textContent = message || "";
  }

  function setStatus(kind, text){
    if(el.statusPill){
      const dot = el.statusPill.querySelector(".dot");
      if(dot){
        dot.classList.remove("ok","warn","bad");
        if(kind) dot.classList.add(kind);
      }
    }

    setText(el.statusText, text || "Ready");
  }

  function clearClasses(node){
    if(!node) return;
    node.classList.remove("ok","warn","bad");
  }

  function applyKind(node, kind){
    if(!node) return;
    clearClasses(node);
    if(kind) node.classList.add(kind);
  }

  function rankType(rank){
    const r = String(rank || "").toUpperCase();
    if(r.startsWith("O-") || r.startsWith("W-")) return "officer";
    if(r.startsWith("E-")) return "enlisted";
    return "enlisted";
  }

  function hasDependents(){
    return String(el.dependents?.value || "without") === "with";
  }

  function familyCount(){
    return hasDependents() ? 2 : 1;
  }

  function scoreAPR(score){
    const s = Number(score) || 720;

    if(s >= 780) return 6.50;
    if(s >= 760) return 6.75;
    if(s >= 720) return 7.00;
    if(s >= 700) return 7.20;
    if(s >= 680) return 7.35;
    if(s >= 660) return 7.85;
    if(s >= 640) return 8.25;
    if(s >= 620) return 9.25;
    return 9.95;
  }

  function mortgagePI(loanAmount, apr, termYears){
    const principal = Math.max(0, n(loanAmount,0));
    const monthlyRate = (Math.max(0, n(apr,0)) / 100) / 12;
    const months = Math.max(1, Math.round(n(termYears, DEFAULT_TERM_YEARS) * 12));

    if(principal <= 0) return 0;
    if(monthlyRate <= 0) return principal / months;

    const pow = Math.pow(1 + monthlyRate, months);
    return principal * ((monthlyRate * pow) / (pow - 1));
  }

  function normalizeRank(value){
    const raw = String(value || "").toUpperCase();
    const match = raw.match(/[EOW]-?\d{1,2}/);
    if(!match) return raw;
    return match[0].replace(/([EOW])(\d)/,"$1-$2");
  }

  function nearestYos(value){
    const y = Number(value) || 0;
    if(!y) return "";
    const allowed = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30];
    let best = allowed[0];
    let diff = Math.abs(y - best);

    allowed.forEach(function(item){
      const d = Math.abs(y - item);
      if(d < diff){
        best = item;
        diff = d;
      }
    });

    return String(best);
  }

  function setSelectIfOptionExists(select, value){
    if(!select || !value) return;

    const wanted = String(value).trim().toLowerCase();
    const options = Array.from(select.options || []);

    const exact = options.find(function(opt){
      return String(opt.value || "").trim().toLowerCase() === wanted;
    });

    if(exact){
      select.value = exact.value;
      return;
    }

    const loose = options.find(function(opt){
      return String(opt.value || "").trim().toLowerCase().includes(wanted) ||
             wanted.includes(String(opt.value || "").trim().toLowerCase());
    });

    if(loose){
      select.value = loose.value;
    }
  }

  function collectInputs(){
    return {
      rank:String(el.rank?.value || "").trim(),
      yos:n(el.yos?.value,0),
      base:String(el.base?.value || "").trim(),
      dependents:String(el.dependents?.value || "without"),
      additionalIncome:Math.max(0,n(el.additionalIncome?.value,0)),
      obligations:Math.max(0,n(el.monthlyObligations?.value,0)),
      homePrice:Math.max(0,n(el.homePrice?.value,450000)),
      downPayment:Math.max(0,n(el.downPayment?.value,22500)),
      creditScore:clamp(Math.round(n(el.creditScore?.value,720)),300,850),
      loanType:String(el.loanType?.value || "va"),
      taxRate:Math.max(0,n(el.taxRate?.value,2.10)),
      insuranceMonthly:Math.max(0,n(el.insuranceMonthly?.value,180)),
      hoaMonthly:Math.max(0,n(el.hoaMonthly?.value,0)),
      pmiMonthly:Math.max(0,n(el.pmiMonthly?.value,0))
    };
  }

  function pickFirstString(){
    for(let i = 0; i < arguments.length; i += 1){
      const value = String(arguments[i] == null ? "" : arguments[i]).trim();
      if(value) return value;
    }
    return "";
  }

  function pickStoredNumber(){
    for(let i = 0; i < arguments.length; i += 1){
      const value = n(arguments[i], NaN);
      if(Number.isFinite(value) && value >= 0) return value;
    }
    return null;
  }

  function pickNullableNumber(){
    for(let i = 0; i < arguments.length; i += 1){
      const value = n(arguments[i], NaN);
      if(Number.isFinite(value)) return value;
    }
    return null;
  }

  function isVaLoanType(loanType){
    return String(loanType || "").trim().toLowerCase() === "va";
  }

  function stateFromBaseZip(baseName){
    const meta = BASE_META[String(baseName || "").trim()] || {};
    const zip = String(meta.zip || "").trim();
    return zip ? (ZIP_TO_STATE[zip] || "") : "";
  }

  function resolveFamilySize(input, stored){
    const storedSize = pickStoredNumber(
      stored.family_size,
      stored.familySize,
      stored.householdSize,
      stored.household_size
    );

    if(storedSize !== null && storedSize > 0){
      return Math.max(1, Math.round(storedSize));
    }

    const family = stored.family ?? stored.dependents_count ?? stored.dependents;
    const familyNum = Number(family);

    if(Number.isFinite(familyNum) && familyNum > 0){
      return Math.max(1, Math.round(familyNum));
    }

    return input.dependents === "with" ? 2 : 1;
  }

  function buildVaOverlayPayload(input){
    if(!isVaLoanType(input.loanType)){
      return {};
    }

    syncIncomeTotal();

    const stored = getMergedStoredContext();
    const income = state.income;
    const payload = { loanType:"va" };

    const basePay = pickStoredNumber(
      income.basePay,
      stored.basePay,
      stored.base_pay,
      stored.basicPay,
      stored.basic_pay
    );
    if(basePay !== null) payload.basePay = basePay;

    const bah = pickStoredNumber(income.bah, stored.bah, stored.BAH);
    if(bah !== null) payload.bah = bah;

    const bas = pickStoredNumber(income.bas, stored.bas, stored.BAS);
    if(bas !== null) payload.bas = bas;

    const otherIncome = pickStoredNumber(
      input.additionalIncome,
      stored.otherIncome,
      stored.other_income,
      stored.additionalIncome,
      stored.additional_income
    );
    if(otherIncome !== null) payload.otherIncome = otherIncome;

    const monthlyDebts = pickStoredNumber(
      input.obligations,
      stored.monthlyDebts,
      stored.monthly_debts,
      stored.monthly_debt,
      stored.debt,
      stored.monthlyDebt,
      stored.non_housing_debt,
      stored.nonHousingDebt
    );
    if(monthlyDebts !== null) payload.monthlyDebts = monthlyDebts;

    const disability = pickStoredNumber(
      stored.disability,
      stored.vaDisability,
      stored.va_disability,
      stored.vaDisabilityMonthly,
      stored.va_disability_monthly,
      stored.monthlyVA,
      stored.vaCompensation,
      stored.va_compensation
    );
    if(disability !== null && disability > 0) payload.disability = disability;

    const rating = n(
      stored.rating ??
      stored.vaRating ??
      stored.va_rating ??
      stored.va_disability ??
      stored.vaDisability ??
      stored.vaDisabilityRating,
      NaN
    );
    if(Number.isFinite(rating) && rating >= 0){
      payload.rating = Math.round(rating);
    }

    const retirement = pickStoredNumber(
      stored.retirement,
      stored.retirementPay,
      stored.retirement_pay,
      stored.retiredPayGross,
      stored.grossMonthlyRetiredPay,
      stored.retirementPayGross
    );
    if(retirement !== null && retirement > 0) payload.retirement = retirement;

    payload.familySize = resolveFamilySize(input, stored);

    const stateAbbr = pickFirstString(
      stored.state,
      stored.propertyState,
      stored.property_state,
      stored.usState,
      stateFromBaseZip(input.base)
    ).toUpperCase().slice(0, 2);
    if(stateAbbr) payload.state = stateAbbr;

    const maintenanceUtilitiesMonthly = pickStoredNumber(
      stored.maintenanceUtilitiesMonthly,
      stored.maintenance_utilities_monthly,
      stored.maintenanceAndUtilities
    );
    if(maintenanceUtilitiesMonthly !== null && maintenanceUtilitiesMonthly > 0){
      payload.maintenanceUtilitiesMonthly = maintenanceUtilitiesMonthly;
    }

    const estimatedTaxesMonthly = pickStoredNumber(
      stored.estimatedTaxesMonthly,
      stored.estimated_taxes_monthly,
      stored.federalStateTaxesMonthly
    );
    if(estimatedTaxesMonthly !== null && estimatedTaxesMonthly > 0){
      payload.estimatedTaxesMonthly = estimatedTaxesMonthly;
    }

    if(
      stored.receivesVaCompensation === true ||
      stored.receives_va_compensation === true ||
      stored.likely_funding_fee_exempt === true
    ){
      payload.receivesVaCompensation = true;
    }else if(Number.isFinite(rating) && rating >= 10){
      payload.receivesVaCompensation = true;
    }

    if(
      stored.fundingFeeExempt === true ||
      stored.funding_fee_exempt === true ||
      stored.exempt === true
    ){
      payload.fundingFeeExempt = true;
    }

    const priorUse = pickFirstString(
      stored.priorUse,
      stored.prior_use,
      stored.firstUse,
      stored.first_use
    );
    if(priorUse) payload.priorUse = priorUse;

    if(stored.financeFundingFee === false || stored.finance_funding_fee === false){
      payload.financeFundingFee = false;
    }

    return payload;
  }

  function extractVaMortgageFields(data){
    const payload = unwrapApiPayload(data);

    return {
      vaFundingFee:pickNullableNumber(data.vaFundingFee, payload.vaFundingFee),
      vaFundingFeeRate:pickNullableNumber(data.vaFundingFeeRate, payload.vaFundingFeeRate),
      baseLoanAmount:pickNullableNumber(data.baseLoanAmount, payload.baseLoanAmount),
      totalLoanAmount:pickNullableNumber(data.totalLoanAmount, payload.totalLoanAmount),
      fundingFeeExempt:(
        data.fundingFeeExempt === true ||
        payload.fundingFeeExempt === true
          ? true
          : data.fundingFeeExempt === false || payload.fundingFeeExempt === false
            ? false
            : null
      ),
      residualIncome:pickNullableNumber(data.residualIncome, payload.residualIncome),
      requiredResidualIncome:pickNullableNumber(
        data.requiredResidualIncome,
        payload.requiredResidualIncome
      ),
      residualPass:(
        data.residualPass === true || payload.residualPass === true
          ? true
          : data.residualPass === false || payload.residualPass === false
            ? false
            : null
      ),
      dti:pickNullableNumber(data.dti, payload.dti),
      vaNotes:Array.isArray(data.vaNotes)
        ? data.vaNotes
        : Array.isArray(payload.vaNotes)
          ? payload.vaNotes
          : [],
      vaWarnings:Array.isArray(data.vaWarnings)
        ? data.vaWarnings
        : Array.isArray(payload.vaWarnings)
          ? payload.vaWarnings
          : []
    };
  }

  function syncIncomeTotal(){
    const input = collectInputs();

    state.income.additional = input.additionalIncome;
    state.income.total =
      n(state.income.basePay,0) +
      n(state.income.bah,0) +
      n(state.income.bas,0) +
      input.additionalIncome;

    return state.income;
  }

  function isPayControl(node){
    return (
      node === el.rank ||
      node === el.yos ||
      node === el.base ||
      node === el.dependents
    );
  }

  function isAdditionalIncomeControl(node){
    return node === el.additionalIncome;
  }

  function isMortgageControl(node){
    return (
      node === el.homePrice ||
      node === el.downPayment ||
      node === el.creditScore ||
      node === el.loanType ||
      node === el.taxRate ||
      node === el.insuranceMonthly ||
      node === el.hoaMonthly ||
      node === el.pmiMonthly
    );
  }

  function unwrapApiPayload(data){
    return (data && (data.payload || data.data || data.result || data)) || {};
  }

  async function postJSON(url, body){
    const res = await fetch(url,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(body)
    });

    const data = await res.json().catch(function(){ return {}; });

    if(!res.ok || data.ok === false){
      throw new Error(data.error || data.message || "Request failed.");
    }

    return data;
  }

  /* =========================================================
    //#4 STORAGE PREFILL
  ========================================================= */

  function getMergedStoredContext(){
    const intakeModern = readJSON(STORAGE_KEYS.intakeModern,{}) || {};
    const intakeLegacy = readJSON(STORAGE_KEYS.intakeLegacy,{}) || {};
    const bridgeV1 = readJSON(STORAGE_KEYS.bridgeV1,{}) || {};
    const bridge = readJSON(STORAGE_KEYS.bridge,{}) || {};
    const realtyBridge = readJSON(STORAGE_KEYS.realtyBridge,{}) || {};
    const profile = readJSON(STORAGE_KEYS.profile,{}) || {};
    const identity = readJSON(STORAGE_KEYS.identity,{}) || {};
    const kpi = readJSON(STORAGE_KEYS.kpi,{}) || {};

    return {
      ...realtyBridge,
      ...bridge,
      ...bridgeV1,
      ...intakeLegacy,
      ...intakeModern,
      ...identity,
      ...profile,
      ...kpi
    };
  }

  function prefillFromStorage(){
    const data = getMergedStoredContext();

    const expenses =
      data.monthly_expenses ??
      data.monthlyExpenses ??
      data.expenses ??
      data.expensesOverride ??
      "";

    const price =
      data.projected_home_price ??
      data.projectedHomePrice ??
      data.homePrice ??
      data.price ??
      data.housing ??
      data.housingOverride ??
      "";

    const down =
      data.downpayment ??
      data.downPayment ??
      data.dpAmt ??
      data.savingsOverride ??
      "";

    const credit =
      data.credit_score ??
      data.creditScore ??
      data.fico ??
      "";

    const rank =
      data.rank_paygrade ??
      data.rankPaygrade ??
      data.rank ??
      "";

    const yos =
      data.yos ??
      data.years_of_service ??
      data.yearsOfService ??
      "";

    const base =
      data.base ??
      data.selected_base ??
      data.selectedBase ??
      data.pcs_base ??
      data.pcsBase ??
      "";

    const family =
      data.family ??
      data.dependents_count ??
      data.dependents ??
      "";

    if(rank) setInputValue(el.rank, normalizeRank(rank));
    if(yos) setInputValue(el.yos, nearestYos(yos));
    if(base) setSelectIfOptionExists(el.base, base);

    if(family !== ""){
      const familyNum = Number(family);
      if(Number.isFinite(familyNum)){
        setInputValue(el.dependents, familyNum > 1 ? "with" : "without");
      }else{
        const f = String(family).toLowerCase();
        if(f.includes("without")) setInputValue(el.dependents,"without");
        if(f.includes("with")) setInputValue(el.dependents,"with");
      }
    }

    setInputValue(el.monthlyObligations, expenses);
    setInputValue(el.homePrice, price);
    setInputValue(el.downPayment, down);
    setInputValue(el.creditScore, credit);

    if(!el.downPayment?.value && price){
      setInputValue(el.downPayment, Math.round(Number(price) * 0.05));
    }
  }

  /* =========================================================
    //#5 LOCAL FALLBACK PAY — PREVIEW ONLY
  ========================================================= */

  function estimateLocalBasePay(rank, yos){
    const r = String(rank || "E-5").toUpperCase();
    const y = Number(yos || 6);

    const enlisted = {
      "E-1": 2017,
      "E-2": 2261,
      "E-3": 2380,
      "E-4": 2634,
      "E-5": 3199,
      "E-6": 3632,
      "E-7": 4625,
      "E-8": 5666,
      "E-9": 6949
    };

    const officer = {
      "O-1": 3826,
      "O-2": 4410,
      "O-3": 5102,
      "O-4": 5803,
      "O-5": 6909,
      "O-6": 8281,
      "O-7": 10339,
      "O-8": 12457,
      "O-9": 17715,
      "O-10": 18667
    };

    let base = enlisted[r] || officer[r] || 3199;

    if(y >= 4) base *= 1.08;
    if(y >= 8) base *= 1.16;
    if(y >= 12) base *= 1.24;
    if(y >= 16) base *= 1.33;
    if(y >= 20) base *= 1.42;
    if(y >= 24) base *= 1.50;

    return Math.round(base);
  }

  function estimateLocalBAH(baseName, rank, dependents){
    const meta = BASE_META[baseName] || {};
    const market = String(meta.market || "").toLowerCase();
    const hasDeps = String(dependents || "with") === "with";
    const r = String(rank || "E-5").toUpperCase();

    let bah = 1850;

    if(market.includes("san antonio")) bah = 1850;
    else if(market.includes("las vegas")) bah = 2250;
    else if(market.includes("phoenix")) bah = 2350;
    else if(market.includes("tampa")) bah = 2550;
    else if(market.includes("colorado springs")) bah = 2300;
    else if(market.includes("washington")) bah = 3250;
    else if(market.includes("fairfield")) bah = 3100;
    else if(market.includes("space coast")) bah = 2400;
    else if(market.includes("charleston")) bah = 2400;
    else if(market.includes("hampton")) bah = 2250;
    else if(market.includes("spokane")) bah = 1950;
    else if(market.includes("albuquerque")) bah = 1900;
    else if(market.includes("tucson")) bah = 1850;
    else if(market.includes("omaha")) bah = 1750;
    else if(market.includes("oklahoma")) bah = 1650;
    else if(market.includes("biloxi")) bah = 1600;
    else if(market.includes("wichita")) bah = 1500;
    else if(market.includes("clovis")) bah = 1400;

    if(hasDeps) bah += 220;

    if(r.startsWith("O-")) bah += 450;
    else if(["E-7","E-8","E-9"].includes(r)) bah += 250;
    else if(["E-1","E-2","E-3","E-4"].includes(r)) bah -= 150;

    return Math.max(950, Math.round(bah));
  }

  function applyLocalPay(reason){
    const input = collectInputs();
    const type = rankType(input.rank);

    if(!input.rank || !input.yos){
      state.income = {
        basePay:0,
        bah:0,
        bas:0,
        additional:input.additionalIncome,
        total:input.additionalIncome,
        source:reason || "Needs inputs",
        lockedOfficial:false,
        raw:null
      };
      return state.income;
    }

    const basePay = estimateLocalBasePay(input.rank, input.yos);
    const bah = input.base
      ? estimateLocalBAH(input.base, input.rank, input.dependents)
      : 0;
    const bas = BAS[type] || BAS.enlisted;
    const total = basePay + bah + bas + input.additionalIncome;

    state.income = {
      basePay,
      bah,
      bas,
      additional:input.additionalIncome,
      total,
      source:reason || "Local preview",
      lockedOfficial:false,
      raw:null
    };

    return state.income;
  }

  /* =========================================================
    //#6 THEWING.AI PAY ENGINE
  ========================================================= */

  function buildBrainInput(){
    const input = collectInputs();
    const meta = BASE_META[input.base] || {};

    return {
      source:"pcsunited.mortgage.health.webflow." + VERSION,
      mode:"active_duty",
      status:"active_duty",

      rank:input.rank,
      rank_paygrade:input.rank,
      paygrade:input.rank,

      yos:input.yos,
      yearsOfService:input.yos,
      years_of_service:input.yos,

      base:input.base,
      currentBase:input.base,
      current_base:input.base,
      pcsBase:input.base,
      pcs_base:input.base,
      selected_base:input.base,

      dependents:input.dependents,
      dependentStatus:input.dependents,
      hasDependents:hasDependents(),
      has_dependents:hasDependents(),
      with_dependents:hasDependents(),

      family:familyCount(),
      familySize:familyCount(),
      family_size:familyCount(),
      dependents_count:hasDependents() ? 1 : 0,

      zip:meta.zip || "",
      bah_zip:meta.zip || "",

      additionalIncome:input.additionalIncome,
      additional_income:input.additionalIncome,

      monthlyExpenses:input.obligations,
      monthly_expenses:input.obligations,
      expenses:input.obligations,

      projectedHomePrice:input.homePrice,
      projected_home_price:input.homePrice,
      price:input.homePrice,

      downpayment:input.downPayment,
      downPayment:input.downPayment,

      creditScore:input.creditScore,
      credit_score:input.creditScore
    };
  }

  function validatePayInputs(){
    const input = collectInputs();

    if(!input.rank){
      throw new Error("Select a rank before calculating military pay.");
    }

    if(!input.yos){
      throw new Error("Select years of service before calculating military pay.");
    }

    if(!input.base){
      throw new Error("Select a base before calculating military pay.");
    }

    return input;
  }

  function pickFirstNumber(){
    for(let i = 0; i < arguments.length; i++){
      const value = n(arguments[i], NaN);
      if(Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function extractCompensation(data){
    const payload = unwrapApiPayload(data);
    const truth = payload.truth_packet || payload.truthPacket || data.truth_packet || data.truthPacket || {};
    const compRoot = payload.compensation || payload.comp || truth.compensation || {};
    const payRoot = payload.pay || truth.pay || {};
    const monthly =
      compRoot.monthly ||
      payload.monthly ||
      truth.monthly ||
      payRoot ||
      compRoot ||
      {};

    const basePay = pickFirstNumber(
      monthly.basicPay,
      monthly.basePay,
      monthly.base_pay,
      monthly.monthly_base_pay,
      payRoot.basePay,
      payRoot.basicPay,
      payRoot.base_pay,
      payload.basePay,
      payload.base_pay
    );

    const bah = pickFirstNumber(
      monthly.bah,
      monthly.BAH,
      monthly.monthly_bah,
      monthly.housing_allowance,
      payRoot.bah,
      payRoot.BAH,
      payload.bah,
      payload.BAH
    );

    const bas = pickFirstNumber(
      monthly.bas,
      monthly.BAS,
      monthly.monthly_bas,
      payRoot.bas,
      payRoot.BAS,
      payload.bas,
      payload.BAS
    ) || BAS[rankType(collectInputs().rank)] || BAS.enlisted;

    const totalFromBackend = pickFirstNumber(
      monthly.grossMonthlyComp,
      monthly.combinedMonthlyGross,
      monthly.totalMilitaryIncome,
      monthly.totalMonthly,
      monthly.total_monthly,
      monthly.total,
      payRoot.totalPay,
      payRoot.total,
      payload.totalMonthly,
      payload.total_monthly
    );

    const additional = collectInputs().additionalIncome;
    const total = totalFromBackend > 0
      ? totalFromBackend + additional
      : basePay + bas + bah + additional;

    return {
      basePay,
      bah,
      bas,
      additional,
      total,
      raw:data
    };
  }

  async function fetchTheWingPay(options){
    const opts = options || {};

    setError("");
    setStatus("warn","Loading TheWing.ai pay…");

    if(el.btnFetchPay) el.btnFetchPay.disabled = true;
    if(el.btnCalc && opts.disableCalc !== false) el.btnCalc.disabled = true;

    try{
      validatePayInputs();
      const input = buildBrainInput();

      const bodies = [
        { tool:"PCS_SNAPSHOT", input:input },
        { type:"PCS_SNAPSHOT", input:input },
        input
      ];

      let parsed = null;
      let lastError = null;
      let rawResponse = null;

      for(let i = 0; i < bodies.length; i++){
        try{
          rawResponse = await postJSON(EP_BRAIN + "?t=" + Date.now(), bodies[i]);
          parsed = extractCompensation(rawResponse);

          if(parsed.basePay > 0 && parsed.bah >= 0){
            break;
          }

          lastError = new Error("TheWing.ai response did not include readable Base Pay and BAH.");
        }catch(err){
          lastError = err;
        }
      }

      if(!parsed || !(parsed.basePay > 0)){
        throw lastError || new Error("TheWing.ai pay estimate failed.");
      }

      state.income = {
        basePay:parsed.basePay,
        bah:parsed.bah,
        bas:parsed.bas,
        additional:parsed.additional,
        total:parsed.total,
        source:"TheWing.ai",
        lockedOfficial:true,
        raw:parsed.raw
      };

      setStatus("ok","TheWing.ai pay loaded");
      renderAll();
      saveSnapshot();

      dispatchSafe("pcsunited:compensation-ready",{
        source:"pcsunited.mortgage.health",
        engine:"TheWing.ai",
        income:state.income,
        raw:rawResponse
      });

      return state.income;
    }catch(err){
      applyLocalPay("Local preview — TheWing.ai unavailable");
      setStatus("warn","Local pay preview");
      setError((err?.message || "TheWing.ai pay was unavailable.") + " This is using a local preview.");

      renderAll();
      saveSnapshot();

      return state.income;
    }finally{
      if(el.btnFetchPay) el.btnFetchPay.disabled = false;
      if(el.btnCalc) el.btnCalc.disabled = false;
    }
  }

  /* =========================================================
    //#7 MORTGAGE ENGINE
  ========================================================= */

  function buildLocalMortgage(){
    const input = collectInputs();

    const homePrice = input.homePrice;
    const downPayment = Math.min(input.downPayment, homePrice);
    const loanAmount = Math.max(0, homePrice - downPayment);
    const apr = scoreAPR(input.creditScore);
    const pi = mortgagePI(loanAmount, apr, DEFAULT_TERM_YEARS);
    const taxMonthly = (homePrice * (input.taxRate / 100)) / 12;
    const insuranceMonthly = input.insuranceMonthly;
    const hoaMonthly = input.hoaMonthly;
    const pmiMonthly = input.loanType === "va" ? 0 : input.pmiMonthly;
    const allIn = pi + taxMonthly + insuranceMonthly + hoaMonthly + pmiMonthly;

    return {
      homePrice,
      downPayment,
      creditScore:input.creditScore,
      loanType:input.loanType,
      apr,
      termYears:DEFAULT_TERM_YEARS,
      loanAmount,
      pi,
      taxMonthly,
      insuranceMonthly,
      hoaMonthly,
      pmiMonthly,
      allIn,
      source:"Local fallback",
      lockedOfficial:false,
      meta:{}
    };
  }

  function setLocalMortgage(){
    state.mortgage = buildLocalMortgage();
    return state.mortgage;
  }

  function normalizeMortgageResult(data){
    const payload = unwrapApiPayload(data);
    const mortgage = payload.mortgage || data.mortgage || payload.result || data.result || payload;
    const monthly = mortgage.monthly || payload.monthly || data.monthly || {};
    const breakdown = mortgage.breakdown || payload.breakdown || data.breakdown || {};
    const meta = payload.meta || data.meta || mortgage.meta || {};
    const input = collectInputs();

    const homePrice = n(
      mortgage.price ||
      payload.price ||
      data.price ||
      input.homePrice,
      input.homePrice
    );

    const loanAmount = n(
      mortgage.loanAmount ||
      mortgage.loan_amount ||
      payload.loanAmount ||
      payload.loan_amount ||
      data.loanAmount ||
      data.loan_amount,
      Math.max(0, homePrice - input.downPayment)
    );

    const apr = n(
      mortgage.apr ||
      payload.apr ||
      data.apr ||
      data.rate,
      scoreAPR(input.creditScore)
    );

    const pi = pickFirstNumber(
      breakdown.pi,
      monthly.pi,
      monthly.principalInterest,
      monthly.principal_interest,
      monthly.monthlyPI
    );

    const taxMonthly = pickFirstNumber(
      breakdown.tax,
      monthly.tax,
      monthly.propertyTax,
      monthly.property_tax,
      monthly.taxMonthly
    );

    const insuranceMonthly = pickFirstNumber(
      breakdown.insurance,
      monthly.insurance,
      monthly.insuranceMonthly
    );

    const hoaMonthly = pickFirstNumber(
      breakdown.hoa,
      monthly.hoa,
      monthly.hoaMonthly
    );

    const pmiMonthly = input.loanType === "va"
      ? 0
      : pickFirstNumber(
          breakdown.pmi,
          monthly.pmi,
          monthly.pmiMonthly
        );

    const allIn = pickFirstNumber(
      breakdown.allIn,
      monthly.allIn,
      monthly.totalMonthly,
      monthly.totalPayment,
      payload.totalMonthly,
      data.totalMonthly,
      pi + taxMonthly + insuranceMonthly + hoaMonthly + pmiMonthly
    );

    const va = extractVaMortgageFields(data);
    const displayLoanAmount =
      isVaLoanType(input.loanType) && va.totalLoanAmount !== null
        ? va.totalLoanAmount
        : loanAmount;

    return {
      homePrice,
      downPayment:input.downPayment,
      creditScore:input.creditScore,
      loanType:input.loanType,
      apr,
      termYears:n(mortgage.termYears || payload.termYears || data.termYears || DEFAULT_TERM_YEARS, DEFAULT_TERM_YEARS),
      loanAmount:displayLoanAmount,
      pi,
      taxMonthly,
      insuranceMonthly,
      hoaMonthly,
      pmiMonthly,
      allIn,
      source:"TheWing.ai",
      lockedOfficial:true,
      va:va,
      vaFundingFee:va.vaFundingFee,
      vaFundingFeeRate:va.vaFundingFeeRate,
      baseLoanAmount:va.baseLoanAmount,
      totalLoanAmount:va.totalLoanAmount,
      fundingFeeExempt:va.fundingFeeExempt,
      residualIncome:va.residualIncome,
      requiredResidualIncome:va.requiredResidualIncome,
      residualPass:va.residualPass,
      dti:va.dti,
      vaNotes:va.vaNotes,
      vaWarnings:va.vaWarnings,
      meta:{
        engineVersion:meta.engineVersion || data.engineVersion || payload.engineVersion || "",
        aprSource:meta.aprSource || data.aprSource || "",
        propertyTaxSource:meta.propertyTaxSource || "",
        insuranceSource:meta.insuranceSource || "",
        pmiSource:meta.pmiSource || "",
        generatedAt:meta.generatedAt || "",
        vaOverlayApplied:meta.vaOverlayApplied === true
      },
      raw:data
    };
  }

  function getMortgageSnapshot(){
    if(state.mortgage && Number.isFinite(state.mortgage.allIn)){
      return state.mortgage;
    }
    return buildLocalMortgage();
  }

  async function fetchTheWingMortgage(options){
    const opts = options || {};
    const input = collectInputs();

    setStatus("warn","Calculating mortgage…");

    if(el.btnCalc && opts.disableCalc !== false) el.btnCalc.disabled = true;

    try{
      const payload = {
        price:input.homePrice,
        homePrice:input.homePrice,
        projected_home_price:input.homePrice,
        downpayment:input.downPayment,
        downPayment:input.downPayment,
        credit_score:input.creditScore,
        creditScore:input.creditScore,
        termYears:DEFAULT_TERM_YEARS,
        loanType:input.loanType,
        taxRate:input.taxRate,
        propertyTaxRate:input.taxRate,
        insuranceMonthly:input.insuranceMonthly,
        hoaMonthly:input.hoaMonthly,
        pmiMonthly:input.pmiMonthly,
        source:"pcsunited.mortgage.health.webflow." + VERSION,
        ...buildVaOverlayPayload(input)
      };

      const data = await postJSON(EP_MORTGAGE + "?t=" + Date.now(), payload);
      state.mortgage = normalizeMortgageResult(data);

      setStatus("ok","Ready");
      renderAll();
      saveSnapshot();

      dispatchSafe("pcsunited:mortgage-ready",{
        source:"pcsunited.mortgage.health",
        engine:"TheWing.ai",
        mortgage:state.mortgage,
        raw:data
      });

      return state.mortgage;
    }catch(err){
      state.mortgage = buildLocalMortgage();
      setStatus("warn","Local mortgage estimate");
      setError("TheWing.ai mortgage engine was unavailable, so this is using the local mortgage fallback. " + (err?.message || ""));

      renderAll();
      saveSnapshot();

      return state.mortgage;
    }finally{
      if(el.btnCalc) el.btnCalc.disabled = false;
    }
  }

  async function calculateFullTheWingFlow(){
    setError("");
    setStatus("warn","Running TheWing.ai flow…");

    if(el.btnCalc) el.btnCalc.disabled = true;
    if(el.btnFetchPay) el.btnFetchPay.disabled = true;

    try{
      await fetchTheWingPay({ disableCalc:false });
      await fetchTheWingMortgage({ disableCalc:false });

      setStatus("ok","TheWing.ai snapshot ready");
      renderAll();
      saveSnapshot();
    }catch(err){
      setStatus("warn","Snapshot completed with fallback");
      setError("TheWing.ai flow had an issue. " + (err?.message || ""));
      renderAll();
      saveSnapshot();
    }finally{
      if(el.btnCalc) el.btnCalc.disabled = false;
      if(el.btnFetchPay) el.btnFetchPay.disabled = false;
    }
  }

  /* =========================================================
    //#8 HEALTH + BUYER RANGE
  ========================================================= */

  function computeHealth(){
    const input = collectInputs();
    const mortgage = getMortgageSnapshot();

    syncIncomeTotal();

    state.obligations = input.obligations;

    const totalIncome = n(state.income.total,0);
    const allInMortgage = n(mortgage.allIn,0);
    const obligations = n(state.obligations,0);
    const residual = totalIncome - allInMortgage - obligations;
    const residualPct = totalIncome > 0 ? (residual / totalIncome) * 100 : 0;

    state.residual = residual;
    state.residualPct = residualPct;

    let health = "Needs Inputs";
    let note = "Add income data to generate a lightweight financial health signal.";
    let kind = "warn";

    if(totalIncome <= 0){
      health = "Needs Inputs";
      kind = "warn";
      note = "Add income data to generate a lightweight financial health signal.";
    }else if(residualPct >= 35){
      health = "Strong";
      kind = "ok";
      note = "Strong residual margin after mortgage and obligations.";
    }else if(residualPct >= 20){
      health = "Stable";
      kind = "ok";
      note = "Healthy residual margin. You still have meaningful breathing room after the mortgage.";
    }else if(residualPct >= 10){
      health = "Stressed";
      kind = "warn";
      note = "Residual margin is thin. Consider reducing price or obligations.";
    }else if(residualPct >= 0){
      health = "High Risk";
      kind = "bad";
      note = "Very limited residual margin after mortgage and obligations.";
    }else{
      health = "Not Ready";
      kind = "bad";
      note = "Projected outflow is higher than income. Lower price, reduce obligations, or increase income before buying.";
    }

    state.health = health;
    state.healthKind = kind;
    state.healthNote = note;

    return {
      totalIncome,
      allInMortgage,
      obligations,
      residual,
      residualPct,
      health,
      kind,
      note,
      mortgage
    };
  }

  function computeBuyerRange(){
    const health = computeHealth();
    const mortgage = health.mortgage || getMortgageSnapshot();

    const currentPrice = Math.max(0, mortgage.homePrice || collectInputs().homePrice);
    const residualPct = Number(health.residualPct) || 0;

    if(health.totalIncome <= 0 || currentPrice <= 0){
      return {
        min:0,
        target:currentPrice,
        max:0,
        leftPct:47,
        widthPct:6,
        kind:"warn",
        note:"Enter income, obligations, and home price to generate a smarter purchase range."
      };
    }

    let leftRoomPct = 8;
    let rightRoomPct = 8;
    let downsidePct = 0.08;
    let upsidePct = 0.08;

    if(residualPct >= 70){
      leftRoomPct = 0;
      rightRoomPct = 42;
      downsidePct = 0.00;
      upsidePct = 0.36;
    }else if(residualPct >= 60){
      leftRoomPct = 3;
      rightRoomPct = 38;
      downsidePct = 0.02;
      upsidePct = 0.30;
    }else if(residualPct >= 50){
      leftRoomPct = 6;
      rightRoomPct = 32;
      downsidePct = 0.04;
      upsidePct = 0.24;
    }else if(residualPct >= 40){
      leftRoomPct = 9;
      rightRoomPct = 26;
      downsidePct = 0.06;
      upsidePct = 0.18;
    }else if(residualPct >= 35){
      leftRoomPct = 12;
      rightRoomPct = 22;
      downsidePct = 0.08;
      upsidePct = 0.14;
    }else if(residualPct >= 25){
      leftRoomPct = 16;
      rightRoomPct = 14;
      downsidePct = 0.11;
      upsidePct = 0.09;
    }else if(residualPct >= 20){
      leftRoomPct = 20;
      rightRoomPct = 8;
      downsidePct = 0.15;
      upsidePct = 0.05;
    }else if(residualPct >= 15){
      leftRoomPct = 25;
      rightRoomPct = 4;
      downsidePct = 0.20;
      upsidePct = 0.02;
    }else if(residualPct >= 10){
      leftRoomPct = 30;
      rightRoomPct = 1;
      downsidePct = 0.25;
      upsidePct = 0.00;
    }else if(residualPct >= 5){
      leftRoomPct = 35;
      rightRoomPct = 0;
      downsidePct = 0.30;
      upsidePct = 0.00;
    }else if(residualPct >= 0){
      leftRoomPct = 40;
      rightRoomPct = 0;
      downsidePct = 0.36;
      upsidePct = 0.00;
    }else{
      leftRoomPct = 45;
      rightRoomPct = 0;
      downsidePct = 0.42;
      upsidePct = 0.00;
    }

    const leftPct = clamp(50 - leftRoomPct, 0, 100);
    const widthPct = clamp(leftRoomPct + rightRoomPct, 6, 92);

    const targetPrice = currentPrice;
    const minPrice = Math.max(0, Math.round((currentPrice * (1 - downsidePct)) / 1000) * 1000);
    const maxPrice = Math.max(minPrice, Math.round((currentPrice * (1 + upsidePct)) / 1000) * 1000);

    let kind = health.kind;
    let note = "";

    if(health.kind === "ok"){
      if(upsidePct > 0){
        note =
          health.health +
          ": Your selected " +
          money(targetPrice,0) +
          " target is within the green zone. You may have room up to " +
          money(maxPrice,0) +
          " if desired.";
      }else{
        note =
          health.health +
          ": Your selected " +
          money(targetPrice,0) +
          " target is within range.";
      }
    }else if(health.kind === "warn"){
      note =
        health.health +
        ": Your selected " +
        money(targetPrice,0) +
        " target is workable but tight. Safer lane is " +
        money(minPrice,0) +
        " to " +
        money(maxPrice,0) +
        ".";
    }else{
      note =
        health.health +
        ": Your selected " +
        money(targetPrice,0) +
        " target is under pressure. Safer lane is closer to " +
        money(minPrice,0) +
        " to " +
        money(maxPrice,0) +
        ".";
    }

    return {
      min:minPrice,
      target:targetPrice,
      max:maxPrice,
      leftPct,
      widthPct,
      kind,
      note
    };
  }

  /* =========================================================
    //#9 RENDER
  ========================================================= */

  function renderAll(){
    const health = computeHealth();
    const range = computeBuyerRange();

    renderPills();
    renderMortgage(health.mortgage);
    renderVaReadiness(health.mortgage);
    renderIncome();
    renderHealth(health);
    renderBuyerRange(range);
    renderVerdict(health, range);
  }

  function renderPills(){
    const input = collectInputs();

    if(!el.profilePills) return;

    const bits = [
      ["Rank", input.rank || "—"],
      ["YOS", input.yos || "—"],
      ["Base", input.base || "Select base"],
      ["Deps", input.dependents === "with" ? "With" : "Without"],
      ["Extra", money(input.additionalIncome,0)]
    ];

    el.profilePills.innerHTML = bits.map(function(pair){
      return '<div class="info-pill"><span>' + pair[0] + ':</span><b>' + pair[1] + '</b></div>';
    }).join("");
  }

  function renderMortgage(mortgage){
    const m = mortgage || getMortgageSnapshot();
    const input = collectInputs();
    const loanLabelAmount =
      isVaLoanType(input.loanType) && Number.isFinite(m.totalLoanAmount)
        ? m.totalLoanAmount
        : m.loanAmount;

    setText(el.heroPayment, money(m.allIn,2));
    setText(el.allInPayment, money(m.allIn,2));
    setText(
      el.loanAmount,
      money(loanLabelAmount,0) + (isVaLoanType(input.loanType) ? " VA loan" : " loan")
    );
    setText(el.piPayment, money(m.pi,2));
    setText(el.taxMonthly, money(m.taxMonthly,2));
    setText(el.insuranceOut, money(m.insuranceMonthly,2));
    setText(el.hoaOut, money(m.hoaMonthly,2));
    setText(el.pmiOut, money(m.pmiMonthly,2));
    setText(el.mortgageSource, "Mortgage source: " + (m.source || "Local fallback"));
    setText(el.rateLine, (Number(m.apr || 0).toFixed(2)) + "% APR • " + DEFAULT_TERM_YEARS + " years");
  }

  function hasVaOverlayData(mortgage){
    const m = mortgage || {};
    return (
      (m.vaFundingFee !== null && m.vaFundingFee !== undefined) ||
      (m.totalLoanAmount !== null && m.totalLoanAmount !== undefined) ||
      (m.dti !== null && m.dti !== undefined) ||
      (m.residualIncome !== null && m.residualIncome !== undefined)
    );
  }

  function renderVaReadiness(mortgage){
    const panel = el.vaReadinessPanel;
    const input = collectInputs();

    if(!panel){
      return;
    }

    if(!isVaLoanType(input.loanType)){
      panel.hidden = true;
      return;
    }

    panel.hidden = false;

    const m = mortgage || getMortgageSnapshot();
    const hasOverlay = hasVaOverlayData(m) && m.lockedOfficial;

    if(!hasOverlay){
      setText(el.vaFundingFeeOut, "$—");
      setText(el.vaTotalLoanOut, "$—");
      setText(el.vaDtiOut, "—");
      setText(el.vaResidualIncomeOut, "$—");
      setText(el.vaResidualRequiredOut, "$—");
      setText(el.vaResidualPassOut, "—");
      setText(
        el.vaReadinessNote,
        "Run Calculate Mortgage Health to load VA funding fee, DTI, and residual income from TheWing.ai."
      );
      if(el.vaReadinessNote) el.vaReadinessNote.classList.remove("warn","bad");
      [el.vaFundingFeeOut, el.vaTotalLoanOut, el.vaDtiOut, el.vaResidualIncomeOut, el.vaResidualRequiredOut, el.vaResidualPassOut]
        .forEach(function(node){
          if(node) node.classList.remove("ok","warn","bad");
        });
      return;
    }

    const fundingFeeExempt = m.fundingFeeExempt === true;
    const fundingFeeText = fundingFeeExempt
      ? "Exempt ($0)"
      : money(m.vaFundingFee,0);

    setText(el.vaFundingFeeOut, fundingFeeText);
    setText(
      el.vaTotalLoanOut,
      m.totalLoanAmount !== null ? money(m.totalLoanAmount,0) : money(m.loanAmount,0)
    );
    setText(el.vaDtiOut, m.dti !== null ? pct(m.dti * 100,1) : "—");
    setText(
      el.vaResidualIncomeOut,
      m.residualIncome !== null ? money(m.residualIncome,0) : "$—"
    );
    setText(
      el.vaResidualRequiredOut,
      m.requiredResidualIncome !== null ? money(m.requiredResidualIncome,0) : "$—"
    );

    let residualStatus = "Review";
    let residualKind = "warn";

    if(m.residualPass === true){
      residualStatus = "Pass";
      residualKind = "ok";
    }else if(m.residualPass === false){
      residualStatus = "Review";
      residualKind = "warn";
    }

    setText(el.vaResidualPassOut, residualStatus);
    applyKind(el.vaResidualPassOut, residualKind);

    let note = "VA readiness from TheWing.ai official-va overlay.";
    if(Array.isArray(m.vaWarnings) && m.vaWarnings.length){
      note += " " + m.vaWarnings[0];
    }else if(Array.isArray(m.vaNotes) && m.vaNotes.length){
      note += " " + m.vaNotes[0];
    }

    setText(el.vaReadinessNote, note);
    if(el.vaReadinessNote){
      el.vaReadinessNote.classList.remove("warn","bad");
      if(residualKind === "warn") el.vaReadinessNote.classList.add("warn");
    }
  }

  function renderIncome(){
    const i = state.income;
    const mortgage = getMortgageSnapshot();
    const housingRatio = i.total > 0 ? (mortgage.allIn / i.total) * 100 : 0;

    setText(el.heroIncome, i.total > 0 ? money(i.total,2) : "$—");
    setText(el.totalIncome, i.total > 0 ? money(i.total,2) : "$—");
    setText(el.housingRatio, i.total > 0 ? pct(housingRatio,1) + " housing ratio" : "— housing ratio");

    setText(el.basePay, i.basePay > 0 ? money(i.basePay,2) : "$—");
    setText(el.bah, i.base ? money(i.bah,2) : "$—");
    setText(el.bas, i.basePay > 0 ? money(i.bas,2) : "$—");
    setText(el.additionalIncomeOut, money(i.additional,2));
    setText(el.compSource, i.source || "—");

    setText(el.healthIncome, i.total > 0 ? money(i.total,2) : "$—");
  }

  function renderHealth(health){
    const ringPct = clamp(Math.max(0, health.residualPct),0,100);

    setText(el.heroHealth, health.health);
    setText(
      el.heroHealthNote,
      health.note + (health.totalIncome > 0 ? " Residual margin is " + pct(health.residualPct,1) + " of total monthly income." : "")
    );

    setText(el.residualPercent, health.totalIncome > 0 ? pct(health.residualPct,1) : "—");
    setText(el.heroResidual, health.totalIncome > 0 ? money(health.residual,2) : "$—");
    setText(el.heroResidualPct, health.totalIncome > 0 ? pct(health.residualPct,1) : "—");

    setText(el.healthObligations, money(health.obligations,2));
    setText(el.healthMortgage, money(health.allInMortgage,2));
    setText(el.healthOutflow, money(health.allInMortgage + health.obligations,2));
    setText(el.healthResidual, health.totalIncome > 0 ? money(health.residual,2) : "$—");

    applyKind(el.heroHealth, health.kind);
    applyKind(el.heroResidual, health.kind);
    applyKind(el.heroResidualPct, health.kind);

    if(el.healthRing){
      el.healthRing.style.setProperty("--pct", String(ringPct));
      el.healthRing.style.setProperty(
        "--ring-color",
        health.kind === "ok" ? "var(--mint)" : health.kind === "bad" ? "var(--danger)" : "var(--gold)"
      );
    }
  }

  function renderBuyerRange(range){
    setText(el.buyerRangeMin, range.min > 0 ? money(range.min,0) : "$—");
    setText(el.buyerRangeTarget, range.target > 0 ? money(range.target,0) : "$—");
    setText(el.buyerRangeMax, range.max > 0 ? money(range.max,0) : "$—");

    if(el.buyerRangeFill){
      el.buyerRangeFill.style.left = range.leftPct + "%";
      el.buyerRangeFill.style.width = range.widthPct + "%";
      el.buyerRangeFill.style.transform = "none";

      el.buyerRangeFill.style.setProperty("--buyer-fill-left", range.leftPct + "%");
      el.buyerRangeFill.style.setProperty("--buyer-fill-width", range.widthPct + "%");

      if(range.kind === "ok"){
        el.buyerRangeFill.style.background =
          "linear-gradient(90deg,var(--mint) 0%,var(--mint) 58%,var(--blue) 100%)";
      }else if(range.kind === "warn"){
        el.buyerRangeFill.style.background =
          "linear-gradient(90deg,var(--gold) 0%,var(--blue) 100%)";
      }else{
        el.buyerRangeFill.style.background =
          "linear-gradient(90deg,var(--danger) 0%,var(--gold) 100%)";
      }

      el.buyerRangeFill.classList.remove("warn","bad");
      if(range.kind === "warn") el.buyerRangeFill.classList.add("warn");
      if(range.kind === "bad") el.buyerRangeFill.classList.add("bad");
    }

    if(el.buyerRangeNote){
      el.buyerRangeNote.textContent = range.note;
      el.buyerRangeNote.classList.remove("warn","bad");
      if(range.kind === "warn") el.buyerRangeNote.classList.add("warn");
      if(range.kind === "bad") el.buyerRangeNote.classList.add("bad");
    }

    if(el.buyerRangeProgress){
      const minVal = range.min > 0 ? range.min : 0;
      const maxVal = range.max > 0 ? range.max : (range.target > 0 ? range.target : 100);
      const nowVal = range.target > 0 ? range.target : 0;

      el.buyerRangeProgress.setAttribute("aria-valuemin", String(minVal));
      el.buyerRangeProgress.setAttribute("aria-valuemax", String(Math.max(maxVal, minVal + 1)));
      el.buyerRangeProgress.setAttribute("aria-valuenow", String(nowVal));
      el.buyerRangeProgress.setAttribute(
        "aria-valuetext",
        range.target > 0
          ? "Preferred target " + money(range.target,0) + ", range " + money(range.min,0) + " to " + money(range.max,0)
          : "Enter income, obligations, and home price to generate a purchase range."
      );
    }
  }

  function renderVerdict(health, range){
    if(!el.verdictBox) return;

    el.verdictBox.classList.remove("ok","warn","bad");

    let sourceNote = state.income.lockedOfficial
      ? " Compensation source: TheWing.ai."
      : " Compensation source: local preview. Click Calculate Mortgage Health to run TheWing.ai.";

    if(!collectInputs().base){
      sourceNote = " Select a base to calculate BAH through TheWing.ai.";
    }

    let message = "Verdict: Need income data." + sourceNote;

    if(health.totalIncome > 0){
      message =
        "Verdict: " +
        health.health +
        ". " +
        health.note +
        " Selected buyer target: " +
        (range.target > 0 ? money(range.target,0) : "$—") +
        "." +
        sourceNote;

      el.verdictBox.classList.add(health.kind);
    }

    el.verdictBox.textContent = message;
  }

  /* =========================================================
    //#10 SAVE SNAPSHOT
  ========================================================= */

  function saveSnapshot(){
    const payload = {
      source:"pcsunited.mortgage.health.webflow." + VERSION,
      version:VERSION,
      saved_at:new Date().toISOString(),
      inputs:collectInputs(),
      income:{
        basePay:state.income.basePay,
        bah:state.income.bah,
        bas:state.income.bas,
        additional:state.income.additional,
        total:state.income.total,
        source:state.income.source,
        lockedOfficial:state.income.lockedOfficial
      },
      mortgage:getMortgageSnapshot(),
      obligations:state.obligations,
      residual:state.residual,
      residual_pct:state.residualPct,
      health:state.health,
      health_kind:state.healthKind,
      buyer_range:computeBuyerRange()
    };

    writeJSON(STORAGE_KEYS.mortgageResult,payload);
    writeJSON(STORAGE_KEYS.mortgageMirror,payload);

    dispatchSafe("pcsunited:mortgage-health-ready",payload);
  }

  /* =========================================================
    //#11 ACTIONS
  ========================================================= */

  function clearAll(){
    setInputValue(el.rank,"");
    setInputValue(el.yos,"");
    setInputValue(el.base,"");
    setInputValue(el.dependents,"without");
    setInputValue(el.additionalIncome,"0");
    setInputValue(el.monthlyObligations,"");
    setInputValue(el.homePrice,"450000");
    setInputValue(el.downPayment,"22500");
    setInputValue(el.creditScore,"720");
    setInputValue(el.loanType,"va");
    setInputValue(el.taxRate,"2.10");
    setInputValue(el.insuranceMonthly,"180");
    setInputValue(el.hoaMonthly,"0");
    setInputValue(el.pmiMonthly,"0");

    state.income = {
      basePay:0,
      bah:0,
      bas:0,
      additional:0,
      total:0,
      source:"—",
      lockedOfficial:false,
      raw:null
    };

    setError("");
    setStatus(null,"Ready");

    setLocalMortgage();
    renderAll();
    saveSnapshot();
  }

  function handleInputChange(event){
    setError("");

    const changedNode = event?.target || document.activeElement;

    if(isPayControl(changedNode)){
      state.income.lockedOfficial = false;
      applyLocalPay("Local preview — pay inputs changed");
    }else if(isAdditionalIncomeControl(changedNode)){
      if(state.income.lockedOfficial){
        syncIncomeTotal();
      }else{
        applyLocalPay("Local preview");
      }
    }else if(isMortgageControl(changedNode)){
      if(!state.mortgage || !state.mortgage.lockedOfficial){
        setLocalMortgage();
      }
    }else if(state.income.lockedOfficial){
      syncIncomeTotal();
    }

    renderAll();
    saveSnapshot();
  }

  /* =========================================================
    //#12 WIRE UP
  ========================================================= */

  function bind(){
    const liveInputs = [
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
    ];

    liveInputs.forEach(function(node){
      if(!node) return;
      node.addEventListener("input", handleInputChange);
      node.addEventListener("change", handleInputChange);
    });

    if(el.btnFetchPay){
      el.btnFetchPay.addEventListener("click", function(){
        fetchTheWingPay();
      });
    }

    if(el.btnCalc){
      el.btnCalc.addEventListener("click", function(){
        calculateFullTheWingFlow();
      });
    }

    if(el.btnClear){
      el.btnClear.addEventListener("click", clearAll);
    }
  }

  /* =========================================================
    //#13 BOOT
  ========================================================= */

  function boot(){
    prefillFromStorage();

    if(collectInputs().rank && collectInputs().yos){
      applyLocalPay("Local preview");
    }else{
      state.income = {
        basePay:0,
        bah:0,
        bas:0,
        additional:collectInputs().additionalIncome,
        total:collectInputs().additionalIncome,
        source:"—",
        lockedOfficial:false,
        raw:null
      };
    }

    setLocalMortgage();
    renderAll();
    saveSnapshot();
    bind();

    window.PCSU_MORTGAGE_HEALTH = {
      version:VERSION,
      state:state,
      collectInputs:collectInputs,
      buildBrainInput:buildBrainInput,
      extractCompensation:extractCompensation,
      normalizeMortgageResult:normalizeMortgageResult,
      computeHealth:computeHealth,
      computeBuyerRange:computeBuyerRange,
      renderAll:renderAll,
      fetchTheWingPay:fetchTheWingPay,
      fetchTheWingMortgage:fetchTheWingMortgage,
      calculateFullTheWingFlow:calculateFullTheWingFlow,
      clearAll:clearAll
    };

    console.log("PCSUnited Mortgage Health loaded:", VERSION);
  }

  boot();

})();
