/* =========================================================
  PCS SNAPSHOT v5.1.3
  FILE: snapshot.js

  FIX:
  - URL params win over sessionStorage for all handoff fields.
  - sessionStorage fallbacks added for rank/yos/family/fileKey keys.
  - Official compensation via /api/opensource-brain (rank, YOS, dependents).
  - Absolute TheWing city JSON fetch paths for Webflow embed hosting.
  - Labeled fallback + console errors when base JSON is unavailable.
========================================================= */

(function () {
  "use strict";

  /* =========================================================
    #1) HELPERS
  ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function text(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  function html(id, value) {
    var el = $(id);
    if (el) el.innerHTML = value;
  }

  function money(value) {
    var n = Number(value || 0);
    return "$" + Math.round(n).toLocaleString();
  }

  function moneyK(value) {
    var n = Number(value || 0);
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
    return money(n);
  }

  function pct(value) {
    var n = Number(value || 0);
    return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n || 0)));
  }

  function safeNum(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getParam(name, fallback) {
    var params = new URLSearchParams(window.location.search || "");
    var value = params.get(name);
    return value !== null && value !== "" ? value : fallback;
  }

  function hasUrlParam(name) {
    var params = new URLSearchParams(window.location.search || "");
    var value = params.get(name);
    return value !== null && value !== "";
  }

  function getStorageItem(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function hasExplicitHandoff() {
    return (
      hasUrlParam("newBase") ||
      hasUrlParam("base") ||
      hasUrlParam("newFileKey") ||
      hasUrlParam("newCityKey") ||
      hasUrlParam("cityKey") ||
      hasUrlParam("curBase") ||
      hasUrlParam("rank") ||
      hasUrlParam("yos") ||
      hasUrlParam("family")
    );
  }

  function getApiOrigin() {
    return String(
      window.PCSU_THEWING_API_ORIGIN ||
      window.PCSU_API_ORIGIN ||
      "https://thewing.netlify.app"
    ).replace(/\/+$/, "");
  }

  function normalizeRank(raw) {
    return String(raw || "E7").toUpperCase().replace("-", "");
  }

  function prettyRank(raw) {
    var r = normalizeRank(raw);
    return r.replace(/^([EO])(\d+)$/, "$1-$2");
  }

  function normalizeBaseKey(raw) {
    return String(raw || "Lackland")
      .replace(/\+/g, " ")
      .replace(/\s+AFB$/i, "")
      .replace(/\s+SFB$/i, "")
      .replace(/\s+/g, "-")
      .trim();
  }

  function baseDisplayName(raw) {
    var s = String(raw || "Lackland AFB").replace(/\+/g, " ").trim();
    if (!s) return "Lackland AFB";
    return s;
  }

  function getByPath(obj, paths, fallback) {
    if (!obj) return fallback;

    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      var parts = path.split(".");
      var cur = obj;

      for (var j = 0; j < parts.length; j++) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, parts[j])) {
          cur = cur[parts[j]];
        } else {
          cur = undefined;
          break;
        }
      }

      if (cur !== undefined && cur !== null && cur !== "") {
        return cur;
      }
    }

    return fallback;
  }

  function setImage(id, src, alt) {
    var img = $(id);
    if (!img) return;

    if (src) {
      img.src = src;
      img.alt = alt || "PCS location image";
    } else {
      img.removeAttribute("src");
      img.alt = alt || "PCS location image";
    }
  }

  /* =========================================================
    #2) INPUT STATE FROM URL / SESSION
    URL params always win when present.
  ========================================================= */

  function resolveCurrentBaseLabel() {
    return baseDisplayName(
      getParam(
        "curBase",
        getParam(
          "currentBase",
          getParam(
            "currentLocation",
            getStorageItem("pcs_current_base") || (hasExplicitHandoff() ? "" : "Fort-Sam-Houston AFB")
          )
        )
      )
    );
  }

  function resolveNewBaseLabel() {
    return baseDisplayName(
      getParam(
        "newBase",
        getParam(
          "base",
          getParam(
            "destinationBase",
            getParam(
              "newLocation",
              getStorageItem("pcs_new_base") || (hasExplicitHandoff() ? "" : "Lackland AFB")
            )
          )
        )
      )
    );
  }

  function resolveCityKey(paramNames, storageKeys, baseLabel, demoDefault) {
    var i;
    var fromParam = "";

    for (i = 0; i < paramNames.length; i++) {
      fromParam = getParam(paramNames[i], "");
      if (fromParam) return normalizeBaseKey(fromParam);
    }

    for (i = 0; i < storageKeys.length; i++) {
      fromParam = getStorageItem(storageKeys[i]) || "";
      if (fromParam) return normalizeBaseKey(fromParam);
    }

    if (baseLabel) return normalizeBaseKey(baseLabel);
    return hasExplicitHandoff() ? "" : normalizeBaseKey(demoDefault);
  }

  var CURRENT_BASE_LABEL = resolveCurrentBaseLabel();
  var NEW_BASE_LABEL = resolveNewBaseLabel();

  var STATE = {
    type: getParam("type", "ad"),
    rank: normalizeRank(getParam("rank", getStorageItem("pcs_rank") || "E7")),
    yos: safeNum(getParam("yos", getStorageItem("pcs_yos") || "16"), 16),
    family: safeNum(getParam("family", getStorageItem("pcs_family") || "4"), 4),

    currentBase: CURRENT_BASE_LABEL,
    newBase: NEW_BASE_LABEL,

    currentCityKey: resolveCityKey(
      ["curCityKey", "curFileKey"],
      ["pcs_current_cityKey", "pcs_current_fileKey"],
      CURRENT_BASE_LABEL,
      "Fort-Sam-Houston"
    ),

    newCityKey: resolveCityKey(
      ["newCityKey", "cityKey", "newFileKey"],
      ["pcs_new_cityKey", "pcs_new_fileKey"],
      NEW_BASE_LABEL,
      "Lackland"
    ),

    currentZip: getParam("curZip", getStorageItem("pcs_current_zip") || "78234"),
    newZip: getParam("newZip", getStorageItem("pcs_new_zip") || "78236"),

    bedroom: 3
  };

  var COMP = {
    loaded: false,
    source: "static",
    basePay: null,
    bas: null,
    bahNew: null,
    bahCurrent: null
  };

  /* =========================================================
    #3) FALLBACK DATA
  ========================================================= */

  var SAN_ANTONIO_FALLBACK_IMAGE = "https://cdn.prod.website-files.com/69b6b526f23748df9f189b16/69c0dc6d478fad1e706ff1f4_dc56ce56878bed382d61aab987ab76eb_San_Antonio.png";

  var FALLBACK_CITY = {
    city: "San Antonio",
    place: "San Antonio",
    state: "TX",
    market_label: "Military Metropolis with Affordable Expansion",
    image_url: SAN_ANTONIO_FALLBACK_IMAGE,
    base_image_url: "https://cdn.prod.website-files.com/69eb162337c57d450e0e19a3/69f75f2d5218031764a79775_Lackland.png",

    population: {
      city: 1500000,
      metro: 2600000
    },

    income: {
      median_household_income: 69906
    },

    housing: {
      market: {
        median_home_price: 288700,
        yoy_change: -3.2,
        days_on_market: 83,
        inventory_signal: "Buyer-Friendly"
      }
    },

    market_bluf: {
      headline: "Buyer-Leaning Market",
      summary: "Softening prices and extended inventory create strong opportunity for negotiation below asking."
    },

    financial_brief: {
      headline: "Strategic Buy Window",
      summary: "Favorable pricing and elevated inventory create opportunity for below-market acquisition."
    },

    scorecard: {
      traffic: "Moderate",
      employment: "Stable"
    },

    lifestyle: [
      "Hot summers, mild winters, low snow risk",
      "Strong military presence and family-heavy suburbs",
      "Moderate congestion with typical 20–35 min commute"
    ],

    by_bedroom: {
      "2": {
        home_price: 255000,
        mortgage_monthly: 1650,
        rent: 1550,
        utilities: 210
      },
      "3": {
        home_price: 302500,
        mortgage_monthly: 1912,
        rent: 1850,
        utilities: 235
      },
      "4": {
        home_price: 365000,
        mortgage_monthly: 2325,
        rent: 2250,
        utilities: 275
      },
      "5": {
        home_price: 430000,
        mortgage_monthly: 2740,
        rent: 2650,
        utilities: 325
      }
    }
  };

  var FALLBACK_CURRENT_CITY = {
    city: "Previous Duty Station",
    place: "Previous Duty Station",
    state: "",
    market_label: "Previous duty station comparison baseline",
    image_url: SAN_ANTONIO_FALLBACK_IMAGE,

    population: {
      city: 1000000,
      metro: 1500000
    },

    income: {
      median_household_income: 65000
    },

    housing: {
      market: {
        median_home_price: 315000,
        yoy_change: 1.5,
        days_on_market: 55,
        inventory_signal: "Balanced"
      }
    },

    market_bluf: {
      headline: "Comparison Market",
      summary: "Used as a baseline to compare BAH, home prices, and housing pressure."
    },

    financial_brief: {
      headline: "Previous Market Baseline",
      summary: "This location is used to compare PCS affordability against the new duty station."
    },

    scorecard: {
      traffic: "Moderate",
      employment: "Stable"
    },

    lifestyle: [
      "Previous location comparison baseline",
      "Used to compare housing allowance and market pressure",
      "Actual city data loads when a matching JSON file is available"
    ],

    by_bedroom: {
      "2": {
        home_price: 280000,
        mortgage_monthly: 1800,
        rent: 1700,
        utilities: 220
      },
      "3": {
        home_price: 330000,
        mortgage_monthly: 2100,
        rent: 2000,
        utilities: 250
      },
      "4": {
        home_price: 390000,
        mortgage_monthly: 2500,
        rent: 2400,
        utilities: 290
      },
      "5": {
        home_price: 455000,
        mortgage_monthly: 2920,
        rent: 2800,
        utilities: 340
      }
    }
  };

  /* =========================================================
    #4) PAY TABLE FALLBACK
  ========================================================= */

  var BASE_PAY = {
    E1: 2017,
    E2: 2261,
    E3: 2378,
    E4: 2633,
    E5: 3214,
    E6: 3987,
    E7: 5621,
    E8: 6440,
    E9: 7360,
    O1: 3826,
    O2: 4419,
    O3: 5127,
    O4: 6064,
    O5: 7030,
    O6: 8430,
    O7: 10700,
    O8: 12800
  };

  var BAS = 466;

  var BAH_BY_KEY = {
    Andrews: 3096,
    Barksdale: 1599,
    Beale: 2550,
    Cannon: 1320,
    Charleston: 2445,
    "Davis-Monthan": 1869,
    Dover: 2142,
    Dyess: 1551,
    Eglin: 2424,
    Elmendorf: 2718,
    "F.E-Warren": 1785,
    Fairchild: 2070,
    "Fort-Sam-Houston": 2172,
    Holloman: 1410,
    Hurlburt: 2424,
    Keesler: 1815,
    Kirtland: 1989,
    Lackland: 2172,
    Langley: 2355,
    Laughlin: 1530,
    "Little-Rock": 1665,
    Luke: 2442,
    MacDill: 2748,
    Malmstrom: 1590,
    Maxwell: 1665,
    McConnell: 1659,
    McGuire: 2862,
    Minot: 1620,
    Moody: 1560,
    "Mountain-Home": 1740,
    Nellis: 2391,
    Offutt: 1890,
    Peterson: 2520,
    Randolph: 2172,
    Robins: 1650,
    Scott: 1860,
    "Seymour-Johnson": 1710,
    Shaw: 1590,
    Sheppard: 1425,
    Tinker: 1704,
    Travis: 3270,
    Tyndall: 2160,
    Whiteman: 1425,
    "Wright-Patterson": 1740
  };

  function getBasePay(rank) {
    if (COMP.basePay !== null && COMP.basePay !== undefined) return COMP.basePay;
    return BASE_PAY[normalizeRank(rank)] || BASE_PAY.E7;
  }

  function getBasAmount() {
    if (COMP.bas !== null && COMP.bas !== undefined) return COMP.bas;
    return BAS;
  }

  function dependentsLabel() {
    return STATE.family >= 2 ? "with" : "without";
  }

  function getBah(cityKey, role) {
    if (role === "current" && COMP.bahCurrent !== null && COMP.bahCurrent !== undefined) {
      return COMP.bahCurrent;
    }

    if (role !== "current" && COMP.bahNew !== null && COMP.bahNew !== undefined) {
      return COMP.bahNew;
    }

    var staticVal = BAH_BY_KEY[cityKey] || BAH_BY_KEY[normalizeBaseKey(cityKey)];

    if (staticVal !== undefined) return staticVal;

    console.warn(
      "[PCS Snapshot] Static BAH fallback used for",
      cityKey || "(empty)",
      role === "current" ? "(current base)" : "(destination base)"
    );

    return 2172;
  }

  function extractCompensationMonthly(data) {
    var source = (data && data.payload) || (data && data.data) || data || {};
    var compensation = source.compensation || source.pay || source.income || {};
    return compensation.monthly || source.monthly || source.paySummary || {};
  }

  async function fetchCompensationForBase(baseName) {
    if (!baseName) return null;

    var endpoint = getApiOrigin() + "/api/opensource-brain";

    try {
      var res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "PCS_SNAPSHOT",
          input: {
            rank: prettyRank(STATE.rank),
            yos: STATE.yos,
            base: baseName,
            family: STATE.family,
            dependents: dependentsLabel()
          }
        })
      });

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      var data = await res.json();
      var monthly = extractCompensationMonthly(data);

      return {
        basePay: safeNum(monthly.basicPay || monthly.basePay, null),
        bah: safeNum(monthly.bah, null),
        bas: safeNum(monthly.bas, null)
      };
    } catch (err) {
      console.warn("[PCS Snapshot] Official compensation fetch failed for", baseName + ":", err);
      return null;
    }
  }

  async function loadCompensation() {
    var results = await Promise.all([
      fetchCompensationForBase(STATE.newBase),
      fetchCompensationForBase(STATE.currentBase)
    ]);

    var newComp = results[0];
    var curComp = results[1];

    if (newComp && newComp.bah !== null) {
      COMP.bahNew = newComp.bah;
      COMP.basePay = newComp.basePay;
      COMP.bas = newComp.bas;
      COMP.source = "official";
    }

    if (curComp && curComp.bah !== null) {
      COMP.bahCurrent = curComp.bah;
    }

    COMP.loaded = true;

    if (COMP.source === "official") {
      console.info(
        "[PCS Snapshot] Official compensation loaded:",
        prettyRank(STATE.rank),
        STATE.yos + " YOS",
        dependentsLabel() + " dependents",
        "destination BAH " + money(COMP.bahNew || 0)
      );
    } else {
      console.warn(
        "[PCS Snapshot] Using static compensation tables for",
        prettyRank(STATE.rank),
        dependentsLabel() + " dependents"
      );
    }
  }

  /* =========================================================
    #5) DATA LOADING
  ========================================================= */

  async function fetchJsonSafe(url) {
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function loadCityData(cityKey, fallback, label) {
    label = label || "destination";
    var key = normalizeBaseKey(cityKey);

    if (!key) {
      console.error("[PCS Snapshot] Missing base file key for " + label + " load.");
      return markFallbackData(fallback, key, label);
    }

    var encoded = encodeURIComponent(key) + ".json";
    var origin = getApiOrigin();
    var host = String(window.location.origin || "").replace(/\/+$/, "");

    var urls = [
      "./cities/" + encoded,
      "/cities/" + encoded,
      host + "/netlify/functions/cities/" + encoded,
      host + "/.netlify/functions/cities/" + encoded,
      origin + "/netlify/functions/cities/" + encoded,
      origin + "/.netlify/functions/cities/" + encoded,
      origin + "/api/cities/" + encodeURIComponent(key),
      "/api/city?cityKey=" + encodeURIComponent(key)
    ];

    for (var i = 0; i < urls.length; i++) {
      var data = await fetchJsonSafe(urls[i]);
      if (data) {
        console.info("[PCS Snapshot] Loaded " + label + " data for", key, "from", urls[i]);
        return data;
      }
    }

    console.error(
      "[PCS Snapshot] Failed to load " + label + " JSON for key '" + key + "'.",
      "Tried:",
      urls
    );

    return markFallbackData(fallback, key, label);
  }

  function markFallbackData(fallback, requestedKey, label) {
    var copy = Object.assign({}, fallback);
    copy.__pcs_fallback = true;
    copy.__pcs_requested_key = requestedKey || "";
    copy.__pcs_fallback_label = label;
    return copy;
  }

  /* =========================================================
    #6) DATA EXTRACTION
  ========================================================= */

  function cityLabel(data) {
    var placeDetail = getByPath(data, ["place_detail"], "");
    if (placeDetail) return String(placeDetail);

    var submarket = getByPath(data, ["submarket"], "");
    var stateCode = getByPath(data, ["state_code"], "");

    if (submarket && stateCode) {
      return String(submarket) + ", " + String(stateCode).toUpperCase();
    }

    var city = getByPath(data, ["city", "place", "name"], "San Antonio");
    var state = getByPath(data, ["state_code", "state"], "TX");

    if (String(city).toUpperCase().indexOf(String(state).toUpperCase()) > -1) {
      return String(city);
    }

    return String(city) + (state ? ", " + String(state).toUpperCase() : "");
  }

  function cityImage(data) {
    var img = getByPath(data, [
      "image_url",
      "snapshot.image_url"
    ], "");

    if (img && typeof img === "string") {
      return img;
    }

    var baseImg = getByPath(data, [
      "base_image_url",
      "base_profile.base_map_image.url"
    ], "");

    if (baseImg && typeof baseImg === "string") {
      return baseImg;
    }

    return SAN_ANTONIO_FALLBACK_IMAGE;
  }

  function medianHome(data) {
    return safeNum(
      getByPath(data, [
        "housing.market.median_home_price",
        "housing.market.median_sale_price_current",
        "market_metrics.median_home_price",
        "market_metrics.median_sold_price",
        "market_metrics.median_sale_price",
        "metrics.median_sold_price",
        "metrics.median_sale_price",
        "snapshot.median_home_price",
        "avg_home_value",
        "average_home_value",
        "avgHome",
        "city_avg_home"
      ], 288700),
      288700
    );
  }

  function yoyChange(data) {
    return safeNum(
      getByPath(data, [
        "housing.market.yoy_change",
        "housing.market.zillow_one_year_change_percent",
        "market_metrics.yoy_change",
        "market_metrics.zillow_one_year_change_percent",
        "snapshot.yoy_change",
        "snapshot.market_trend_yoy",
        "scorecard.home_price_yoy"
      ], -3.2),
      -3.2
    );
  }

  function daysOnMarket(data) {
    return safeNum(
      getByPath(data, [
        "housing.market.days_on_market",
        "housing.market.average_days_on_market",
        "market_metrics.days_on_market",
        "market_metrics.dom",
        "metrics.days_on_market",
        "snapshot.days_on_market"
      ], 83),
      83
    );
  }

  function medianIncome(data) {
    return safeNum(
      getByPath(data, [
        "income.median_household_income",
        "demographics.income.median_household_income",
        "households.median_income",
        "snapshot.median_income",
        "snapshot.median_household_income"
      ], 69906),
      69906
    );
  }

  function populationCity(data) {
    return safeNum(
      getByPath(data, [
        "population.city",
        "population.estimate",
        "demographics.population.city",
        "population.total",
        "snapshot.population",
        "snapshot.population_city"
      ], 1500000),
      1500000
    );
  }

  function populationMetro(data) {
    return safeNum(
      getByPath(data, [
        "population.metro",
        "demographics.population.metro",
        "snapshot.metro_population",
        "snapshot.population_metro"
      ], 2600000),
      2600000
    );
  }

  function marketSignal(data) {
    return getByPath(data, [
      "housing.market.inventory_signal",
      "market_bluf.signal",
      "market_bluf.status",
      "scorecard.market_signal"
    ], "Buyer-Friendly");
  }

  function trafficLevel(data) {
    return getByPath(data, [
      "scorecard.traffic",
      "snapshot.traffic_level",
      "lifestyle.traffic",
      "commute_intelligence.traffic"
    ], "Moderate");
  }

  function employmentStatus(data) {
    return getByPath(data, [
      "scorecard.employment",
      "snapshot.employment_status",
      "labor.employment_status",
      "snapshot.employment"
    ], "Stable");
  }

  function marketHeadline(data) {
    return getByPath(data, [
      "market_bluf.headline",
      "market_bluf.bluf_headline",
      "financial_brief.market_headline",
      "snapshot.market_headline"
    ], "Buyer-Leaning Market");
  }

  function marketSummary(data) {
    return getByPath(data, [
      "market_bluf.summary",
      "market_bluf.bluf_summary",
      "market_bluf.bluf",
      "financial_brief.market_summary",
      "snapshot.market_summary"
    ], "Softening prices and extended inventory create strong opportunity for negotiation below asking.");
  }

  function financialHeadline(data) {
    return getByPath(data, [
      "financial_brief.headline",
      "financial_brief.title",
      "financial_brief.bah_vs_buy_position",
      "market_bluf.financial_headline"
    ], "Strategic Buy Window");
  }

  function financialSummary(data) {
    return getByPath(data, [
      "financial_brief.summary",
      "financial_brief.affordability_summary",
      "financial_brief.bluf",
      "market_bluf.financial_summary"
    ], "Favorable pricing and elevated inventory create opportunity for below-market acquisition.");
  }

  function lifestyleList(data) {
    var raw = getByPath(data, ["lifestyle", "military_lifestyle_fit.bullets", "summary_points", "snapshot.lifestyle"], null);

    if (Array.isArray(raw)) return raw.slice(0, 3);

    return [
      "Military-friendly community with PCS turnover awareness",
      "Housing choice depends heavily on commute and school priorities",
      "Compare BAH against full housing cost, not just mortgage"
    ];
  }

  function avgFromRange(value, fallback) {
    if (typeof value === "number") return value;

    if (value && typeof value === "object") {
      if (Number.isFinite(Number(value.avg))) return Number(value.avg);

      var low = Number(value.low);
      var high = Number(value.high);

      if (Number.isFinite(low) && Number.isFinite(high)) {
        return (low + high) / 2;
      }
    }

    return fallback;
  }

  function bedroomData(data, bedroom) {
    var b = String(bedroom);
    var node = getByPath(data, ["by_bedroom." + b], null);

    if (!node) {
      node = getByPath(FALLBACK_CITY, ["by_bedroom." + b], FALLBACK_CITY.by_bedroom["3"]);
    }

    var homeRaw = getByPath(node, ["home_price", "price", "average_home_price"], medianHome(data));
    var home = safeNum(avgFromRange(homeRaw, medianHome(data)), medianHome(data));

    var mortgageRaw = getByPath(node, ["mortgage_monthly", "avg_home_mortgage_monthly", "monthly_mortgage"], home * 0.00635);
    var mortgage = safeNum(avgFromRange(mortgageRaw, home * 0.00635), home * 0.00635);

    var rentRaw = getByPath(node, ["rent", "rent_monthly", "average_rent"], mortgage * 0.92);
    var rent = safeNum(avgFromRange(rentRaw, mortgage * 0.92), mortgage * 0.92);

    var utilitiesRaw = getByPath(node, ["utilities.total", "utilities", "utilities_monthly", "average_utilities"], 235);
    var utilities = safeNum(avgFromRange(utilitiesRaw, 235), 235);

    var taxes = safeNum(
      getByPath(node, ["taxes", "tax_monthly", "property_tax_monthly"], 0),
      0
    );

    var insurance = safeNum(
      getByPath(node, ["insurance", "insurance_monthly"], 0),
      0
    );

    var hoa = safeNum(
      getByPath(node, ["hoa", "hoa_monthly"], getByPath(data, ["hoa_monthly", "ownership_costs.hoa_monthly_default", "costs.hoa_monthly_default"], 0)),
      0
    );

    return {
      home: home,
      mortgage: mortgage,
      rent: rent,
      utilities: utilities,
      taxes: taxes,
      insurance: insurance,
      hoa: hoa,
      totalHousing: mortgage + taxes + insurance + hoa + utilities
    };
  }

  /* =========================================================
    #7) CHARTS
  ========================================================= */

  var trendChart = null;
  var livingChart = null;
  var chartCurrent = null;
  var chartUpcoming = null;
  var incomeChart = null;
  var bahChart = null;
  var affordChart = null;
  var priceBreakChart = null;

  function destroyChart(chart) {
    try {
      if (chart && chart.destroy) chart.destroy();
    } catch (e) {}
  }

  function renderTrendChart(data, years) {
    var el = $("pcs-trend-chart-apex");
    if (!el || typeof ApexCharts === "undefined") return;

    if (trendChart) {
      try { trendChart.destroy(); } catch (e) {}
      trendChart = null;
    }

    var base = medianHome(data);
    var months = years === 3 ? 36 : 12;
    var yoy = yoyChange(data);
    var points = [];
    var labels = [];

    for (var i = months - 1; i >= 0; i--) {
      var progress = (months - i) / months;
      var seasonal = Math.sin(progress * Math.PI * 2) * 0.015;
      var drift = (yoy / 100) * progress;
      var value = base * (1 - drift + seasonal);
      points.push(Math.round(value));
      labels.push(i === 0 ? "Now" : "-" + i + "m");
    }

    trendChart = new ApexCharts(el, {
      chart: {
        type: "area",
        height: 230,
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: "rgba(244,248,255,.72)"
      },
      series: [
        {
          name: "Median Home Price",
          data: points
        }
      ],
      xaxis: {
        categories: labels,
        labels: {
          show: false
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return moneyK(val);
          }
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: 3
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.32,
          opacityTo: 0.04,
          stops: [0, 90, 100]
        }
      },
      grid: {
        borderColor: "rgba(255,255,255,.08)",
        strokeDashArray: 4
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return money(val);
          }
        }
      }
    });

    trendChart.render();
  }

  function renderSimpleCanvasChart(canvasId, labels, values) {
    var canvas = $(canvasId);

    if (!canvas || typeof Chart === "undefined") return null;

    var ctx = canvas.getContext("2d");

    return new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            borderWidth: 1,
            borderRadius: 12
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return money(context.raw);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "rgba(244,248,255,.74)" }
          },
          y: {
            grid: { color: "rgba(255,255,255,.08)" },
            ticks: {
              color: "rgba(244,248,255,.74)",
              callback: function (value) {
                return moneyK(value);
              }
            }
          }
        }
      }
    });
  }

  function renderDoughnut(canvasId, labels, values) {
    var canvas = $(canvasId);

    if (!canvas || typeof Chart === "undefined") return null;

    var ctx = canvas.getContext("2d");

    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            borderWidth: 0,
            cutout: "68%"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.label + ": " + money(context.raw);
              }
            }
          }
        }
      }
    });
  }

  /* =========================================================
    #8) PAINT UI
  ========================================================= */

  function paintTopStrip(currentData, newData) {
    var basePay = getBasePay(STATE.rank);
    var newBah = getBah(STATE.newCityKey, "new");
    var currentBah = getBah(STATE.currentCityKey, "current");
    var totalIncome = basePay + newBah + getBasAmount();
    var bahDelta = newBah - currentBah;

    text("pcs-income-main", money(totalIncome));
    html("pcs-income-breakdown", "Base Pay: " + money(basePay) + ", BAH " + money(newBah) + ",<br />BAS " + money(getBasAmount()));
    text("pts-income-meta", "True disposable baseline before housing");

    text("pts-bah-delta", (bahDelta >= 0 ? "+" : "-") + money(Math.abs(bahDelta)));
    text("pts-bah-copy", "Compared with your previous duty station housing allowance.");
    text("pts-bah-meta", "vs. Previous Duty Station");

    text("pts-market-signal", marketSignal(newData));
    text("pts-market-copy", "Inventory elevated • Softer prices • Better leverage");
    text("pts-market-meta", "Current market condition");

    var bed = bedroomData(newData, STATE.bedroom);
    var housingRatio = bed.totalHousing / Math.max(totalIncome, 1);
    var score = clamp(5 - Math.max(0, housingRatio - 0.25) * 10, 1, 5);

    text("pts-power-score", score.toFixed(1));
    text("pts-power-stars", "★★★★★");
    text("pts-power-copy", "Based on total income & housing market");
    text("pts-power-meta", "Overall affordability signal");
  }

  function paintCityBrief(newData) {
    if (newData && newData.__pcs_fallback) {
      console.warn(
        "[PCS Snapshot] Destination base JSON unavailable for",
        newData.__pcs_requested_key || STATE.newCityKey,
        "- showing labeled preview data"
      );
      text(
        "pcs-city-line",
        (STATE.newBase || "Selected Base") + " • Data preview (base file unavailable)"
      );
    } else {
      text("pcs-city-line", cityLabel(newData) + " • Quick PCS Snapshot");
    }

    setImage("img-current", cityImage(newData), cityLabel(newData));

    text("pcs-current-city", cityLabel(newData).toUpperCase());
    text("pcs-current-tagline", "“" + getByPath(newData, ["market_label", "base_profile.market_label", "snapshot.market_label"], "Military Market Intelligence") + "”");

    text("pcs-current-bluf-headline", marketHeadline(newData));
    text("pcs-current-bluf-summary", marketSummary(newData));

    text("pcs-cur-population-city", (populationCity(newData) / 1000000).toFixed(1) + "M");
    text("pcs-cur-population-metro", "Metro: " + (populationMetro(newData) / 1000000).toFixed(1) + "M");

    text("pcs-cur-median-income", money(medianIncome(newData)));
    text("pcs-cur-market-trend", pct(yoyChange(newData)) + " YoY");
    text("pcs-cur-median-home", moneyK(medianHome(newData)));
    text("pcs-cur-traffic-level", trafficLevel(newData));
    text("pcs-cur-employment-status", employmentStatus(newData));

    var list = lifestyleList(newData);
    var listHtml = "";

    list.forEach(function (item) {
      listHtml += ""
        + '<li class="pcs-mini-item">'
        + '<span class="pcs-mini-dot"></span>'
        + "<span>" + String(item) + "</span>"
        + "</li>";
    });

    html("pcs-cur-lifestyle-list", listHtml);

    text("pcs-cur-financial-headline", financialHeadline(newData));
    text("pcs-cur-financial-summary", financialSummary(newData));
  }

  function paintAffordability(newData) {
    var bed = bedroomData(newData, STATE.bedroom);
    var bah = getBah(STATE.newCityKey, "new");
    var buffer = bah - bed.totalHousing;
    var covered = Math.round((bah / Math.max(bed.totalHousing, 1)) * 100);

    text("pcs-bedroom-value", STATE.bedroom);

    html(
      "pcs-afford-headline",
      (buffer >= 0 ? money(buffer) : "-" + money(Math.abs(buffer))) + " <span>Monthly Buffer</span>"
    );

    html(
      "pcs-afford-subline",
      "BAH covers <strong>" + covered + "%</strong> of a typical mortgage stack"
    );

    text("pcs-afford-home-price", money(bed.home));
    text("pcs-afford-mortgage", money(bed.mortgage));
    text("pcs-afford-taxes", money(bed.taxes));
    text("pcs-afford-insurance", money(bed.insurance));
    text("pcs-afford-hoa", money(bed.hoa));
    text("pcs-afford-utilities", money(bed.utilities));

    text("pcs-donut-buffer", (buffer >= 0 ? "+" : "-") + Math.abs(Math.round(buffer)));
    text("pcs-donut-buffer-label", "Monthly Buffer");

    text("pcs-amt-mortgage", money(bed.mortgage));
    text("pcs-amt-taxes", money(bed.taxes));
    text("pcs-amt-insurance", money(bed.insurance));
    text("pcs-amt-hoa", money(bed.hoa));
    text("pcs-amt-utilities", money(bed.utilities));

    text(
      "pcs-afford-footer",
      buffer >= 0
        ? "BAH is currently covering the estimated housing stack for this bedroom profile."
        : "BAH does not fully cover the estimated housing stack for this bedroom profile."
    );

    var donut = $("pcs-afford-donut");
    if (donut) {
      var total = Math.max(bed.totalHousing, 1);
      var mortgageDeg = Math.round((bed.mortgage / total) * 360);
      var taxDeg = Math.round(((bed.mortgage + bed.taxes) / total) * 360);
      var insDeg = Math.round(((bed.mortgage + bed.taxes + bed.insurance) / total) * 360);
      var hoaDeg = Math.round(((bed.mortgage + bed.taxes + bed.insurance + bed.hoa) / total) * 360);

      donut.style.background =
        "conic-gradient("
        + "rgba(157,232,255,.95) 0deg " + mortgageDeg + "deg,"
        + "rgba(80,229,191,.92) " + mortgageDeg + "deg " + taxDeg + "deg,"
        + "rgba(255,181,107,.92) " + taxDeg + "deg " + insDeg + "deg,"
        + "rgba(142,136,255,.92) " + insDeg + "deg " + hoaDeg + "deg,"
        + "rgba(255,255,255,.35) " + hoaDeg + "deg 360deg"
        + ")";
    }
  }

  function paintLivingStrategy(newData) {
    var bed = bedroomData(newData, STATE.bedroom);
    var income = getBasePay(STATE.rank) + getBah(STATE.newCityKey, "new") + getBasAmount();
    var residualBuy = income - bed.totalHousing;
    var residualRent = income - bed.rent - bed.utilities;

    var buyWins = residualBuy >= residualRent - 150;

    text("pcs-ls-status", buyWins ? "WEALTH BUILDING • HIGHER COST" : "RENT FLEXIBILITY • LOWER RISK");
    text("pcs-ls-main", buyWins ? "Buy" : "Rent");

    text(
      "pcs-ls-sub",
      buyWins
        ? "Buying can work if you want stability and can tolerate ownership costs."
        : "Renting may protect flexibility if the PCS timeline is short."
    );

    text("pcs-ls-equity", money(Math.max(0, bed.home * 0.035)) + " estimated first-year equity movement");
    text("pcs-ls-bluf", buyWins ? "Buy is viable with disciplined price control." : "Rent is safer unless the purchase price is below market.");
    text("pcs-ls-annual", money(Math.abs((bed.totalHousing - bed.rent) * 12)));
    text("pcs-ls-vs", "Buy vs Rent Annual Cost Gap");
    text("pcs-ls-gap", money(Math.abs(residualBuy - residualRent)) + " monthly residual difference");

    destroyChart(livingChart);
    livingChart = renderDoughnut("pcs-ls-chart", ["Buy Stack", "Rent Stack", "Residual"], [
      bed.totalHousing,
      bed.rent + bed.utilities,
      Math.max(0, residualBuy)
    ]);
  }

  function paintComparison(currentData, newData) {
    var currentBah = getBah(STATE.currentCityKey, "current");
    var newBah = getBah(STATE.newCityKey, "new");
    var currentHome = medianHome(currentData);
    var newHome = medianHome(newData);

    setImage("img-upcoming", cityImage(newData), cityLabel(newData));

    text("side-current", STATE.currentBase);
    text("side-upcoming", STATE.newBase);
    text("loc-upcoming", cityLabel(newData));

    text("bah-upcoming", money(newBah));
    text("price-upcoming", moneyK(newHome));
    text("yoy-upcoming", pct(yoyChange(newData)));
    text("dom-upcoming", String(daysOnMarket(newData)));

    text(
      "pcsc-status",
      newBah >= currentBah
        ? "BAH improves by " + money(newBah - currentBah) + " per month."
        : "BAH decreases by " + money(currentBah - newBah) + " per month."
    );

    html(
      "facts-upcoming",
      "<li>Median home: " + moneyK(newHome) + "</li>"
      + "<li>Days on market: " + daysOnMarket(newData) + "</li>"
      + "<li>Market signal: " + marketSignal(newData) + "</li>"
    );

    text("rating-current", (currentBah / Math.max(currentHome * 0.00635, 1) * 5).toFixed(1));
    text("rating-upcoming", (newBah / Math.max(newHome * 0.00635, 1) * 5).toFixed(1));
    text("stars-current", "★★★★★");
    text("stars-upcoming", "★★★★★");

    destroyChart(chartCurrent);
    destroyChart(chartUpcoming);

    chartCurrent = renderSimpleCanvasChart("chart-current", ["BAH", "Home"], [currentBah, currentHome / 100]);
    chartUpcoming = renderSimpleCanvasChart("chart-upcoming", ["BAH", "Home"], [newBah, newHome / 100]);
  }

  function paintQuickFacts(newData) {
    text("pcs-qf-poverty", getByPath(newData, ["income.poverty_rate_percent", "income.poverty_rate", "demographics.poverty_rate"], "14.4%"));
    text("pcs-qf-home", moneyK(medianHome(newData)));
    text("pcs-qf-dom", String(daysOnMarket(newData)));

    var basePay = getBasePay(STATE.rank);
    var bah = getBah(STATE.newCityKey, "new");

    destroyChart(incomeChart);
    destroyChart(bahChart);

    incomeChart = renderSimpleCanvasChart("pcs-income-chart", ["Base Pay", "BAH", "BAS"], [basePay, bah, getBasAmount()]);
    bahChart = renderSimpleCanvasChart("pcs-bah-chart", ["Current", "New"], [getBah(STATE.currentCityKey, "current"), bah]);

    text("pcs-income-summary", "Total monthly compensation estimate: " + money(basePay + bah + getBasAmount()));
    text("pcs-bah-summary", "New duty station BAH estimate: " + money(bah));
  }

  function paintOwnershipRange(newData) {
    var bed = bedroomData(newData, STATE.bedroom);
    var low = bed.home * 0.85;
    var high = bed.home * 1.15;
    var median = medianHome(newData);

    text("pcs-own-gap-note", "Typical entry range around " + cityLabel(newData));
    text("pcs-own-right-text", "Comparing low vs high market entry");

    text("pcs-own-y1", "$450K");
    text("pcs-own-y2", "$350K");
    text("pcs-own-y3", "$250K");
    text("pcs-own-y4", "$150K");

    text("pcs-own-low-value", moneyK(low));
    text("pcs-own-high-value", moneyK(high));
    text("pcs-own-high-tag", "Upper Range");
    text("pcs-own-chip-median", "Median: " + moneyK(median));
    text("pcs-own-chip-gap-low", "Low: " + moneyK(low));
    text("pcs-own-chip-gap-high", "High: " + moneyK(high));

    var lowBar = $("pcs-own-bar-low");
    var highBar = $("pcs-own-bar-high");

    if (lowBar) lowBar.style.height = clamp((low / 450000) * 100, 8, 100) + "%";
    if (highBar) highBar.style.height = clamp((high / 450000) * 100, 8, 100) + "%";

    destroyChart(affordChart);
    destroyChart(priceBreakChart);

    affordChart = renderDoughnut("pcs-afford-chart", ["Mortgage", "Utilities", "Buffer"], [
      bed.mortgage,
      bed.utilities,
      Math.max(0, getBah(STATE.newCityKey, "new") - bed.totalHousing)
    ]);

    priceBreakChart = renderSimpleCanvasChart("pcs-pricebreak-chart", ["Low", "Median", "High"], [low, median, high]);

    text("pcs-afford-summary", "Affordability is based on BAH compared against mortgage, utilities, taxes, insurance, and HOA.");
    text("pcs-pricebreak-note", "Price range is estimated from the selected bedroom profile and local market baseline.");
  }

  function paintLegend(newData) {
    var bed = bedroomData(newData, STATE.bedroom);

    text("pcs-leg-mortgage", money(bed.mortgage));
    text("pcs-leg-taxes", money(bed.taxes));
    text("pcs-leg-insurance", money(bed.insurance));
    text("pcs-leg-hoa", money(bed.hoa));
    text("pcs-leg-utilities", money(bed.utilities));
  }

  function paintAll(currentData, newData) {
    paintTopStrip(currentData, newData);
    paintCityBrief(newData);
    paintAffordability(newData);
    paintLivingStrategy(newData);
    paintComparison(currentData, newData);
    paintQuickFacts(newData);
    paintOwnershipRange(newData);
    paintLegend(newData);
    renderTrendChart(newData, 1);
  }

  /* =========================================================
    #9) EVENTS
  ========================================================= */

  function wireEvents(currentData, newData) {
    var up = $("pcs-bedroom-up");
    var down = $("pcs-bedroom-down");

    if (up) {
      up.addEventListener("click", function () {
        STATE.bedroom = clamp(STATE.bedroom + 1, 2, 5);
        paintAll(currentData, newData);
      });
    }

    if (down) {
      down.addEventListener("click", function () {
        STATE.bedroom = clamp(STATE.bedroom - 1, 2, 5);
        paintAll(currentData, newData);
      });
    }

    var btn1 = $("btn-1yr");
    var btn3 = $("btn-3yr");

    if (btn1) {
      btn1.addEventListener("click", function () {
        btn1.classList.add("active");
        if (btn3) btn3.classList.remove("active");
        renderTrendChart(newData, 1);
      });
    }

    if (btn3) {
      btn3.addEventListener("click", function () {
        btn3.classList.add("active");
        if (btn1) btn1.classList.remove("active");
        renderTrendChart(newData, 3);
      });
    }

    var tabs = document.querySelectorAll(".pcs-ls-tab");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("active");
        });

        tab.classList.add("active");

        var mode = tab.getAttribute("data-mode") || "buy";
        var bed = bedroomData(newData, STATE.bedroom);

        if (mode === "rent") {
          text("pcs-ls-main", "Rent");
          text("pcs-ls-sub", "Renting protects flexibility and lowers maintenance exposure.");
          text("pcs-ls-bluf", "Rent is the safer short-PCS strategy.");
          text("pcs-ls-status", "FLEXIBILITY • LOWER COMMITMENT");
          text("pcs-ls-annual", money((bed.rent + bed.utilities) * 12));
        } else if (mode === "base") {
          text("pcs-ls-main", "Base Housing");
          text("pcs-ls-sub", "Base housing can simplify commute and reduce market exposure.");
          text("pcs-ls-bluf", "Base housing is best when certainty beats wealth building.");
          text("pcs-ls-status", "STABILITY • COMMUTE CONTROL");
          text("pcs-ls-annual", money(getBah(STATE.newCityKey, "new") * 12));
        } else {
          paintLivingStrategy(newData);
        }
      });
    });
  }

  /* =========================================================
    #10) BOOT
  ========================================================= */

  async function boot() {
    try {
      if (hasExplicitHandoff()) {
        console.info("[PCS Snapshot] Handoff state:", STATE);
      }

      var results = await Promise.all([
        loadCityData(STATE.currentCityKey, FALLBACK_CURRENT_CITY, "current"),
        loadCityData(STATE.newCityKey, FALLBACK_CITY, "destination"),
        loadCompensation()
      ]);

      var currentData = results[0];
      var newData = results[1];

      paintAll(currentData, newData);
      wireEvents(currentData, newData);

      window.PCS_SNAPSHOT_STATE = {
        input: STATE,
        compensation: COMP,
        currentData: currentData,
        newData: newData
      };

      console.log("PCS Snapshot loaded:", window.PCS_SNAPSHOT_STATE);
    } catch (err) {
      console.error("PCS Snapshot failed to load:", err);

      paintAll(FALLBACK_CURRENT_CITY, FALLBACK_CITY);
      wireEvents(FALLBACK_CURRENT_CITY, FALLBACK_CITY);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
