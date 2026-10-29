/* PCS Snapshot: official API compensation and mortgage results; recorded market data. */
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

  function money(value, cents) {
    if (!Number.isFinite(value)) return "Unavailable";
    return value.toLocaleString("en-US", {
      style: "currency", currency: "USD",
      minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0
    });
  }

  function moneyK(value) {
    var n = safeNum(value, null);
    if (n === null) return "Unavailable";
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
    return money(n);
  }

  function pct(value) {
    var n = safeNum(value, null);
    if (n === null) return "Unavailable";
    return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n || 0)));
  }

  function safeNum(value, fallback) {
    if (value === null || value === undefined || typeof value === "boolean" ||
        (typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && !value.trim())) return fallback;
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function amount(value) {
    var n = safeNum(value, null);
    return n !== null && n >= 0 ? n : null;
  }

  function sumKnown(values) {
    return values.every(Number.isFinite)
      ? Math.round(values.reduce(function (sum, value) { return sum + value; }, 0) * 100) / 100
      : null;
  }

  function grossIncome() {
    return sumKnown([getBasePay(), getBah(STATE.newCityKey, "new"), getBasAmount()]);
  }

  async function fetchWithTimeout(url, options) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    try {
      var response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
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
    return String(raw || "").toUpperCase().replace("-", "");
  }

  function prettyRank(raw) {
    var r = normalizeRank(raw);
    return r.replace(/^([EOW])(\d+E?)$/, "$1-$2");
  }

  function normalizeBaseKey(raw) {
    return String(raw || "")
      .replace(/\+/g, " ")
      .replace(/\s+AFB$/i, "")
      .replace(/\s+SFB$/i, "")
      .replace(/\s+/g, "-")
      .trim();
  }

  function baseDisplayName(raw) {
    var s = String(raw || "").replace(/\+/g, " ").trim();
    if (!s) return "";
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
    // A destination-only Brief has no previous duty station. Stale session
    // data and sample bases must never become the comparison baseline.
    return String(getParam("curBase", getParam("currentBase", getParam("currentLocation", ""))) || "")
      .replace(/\+/g, " ").trim();
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
              getStorageItem("pcs_new_base") || ""
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

    if (hasExplicitHandoff() && baseLabel) return normalizeBaseKey(baseLabel);

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
    rank: normalizeRank(getParam("rank", getStorageItem("pcs_rank") || "")),
    yos: safeNum(getParam("yos", getStorageItem("pcs_yos")), null),
    family: safeNum(getParam("family", getStorageItem("pcs_family")), null),

    currentBase: CURRENT_BASE_LABEL,
    newBase: NEW_BASE_LABEL,

    currentCityKey: CURRENT_BASE_LABEL ? resolveCityKey(
      ["curCityKey", "curFileKey"],
      [],
      CURRENT_BASE_LABEL,
      ""
    ) : "",

    newCityKey: resolveCityKey(
      ["newCityKey", "cityKey", "newFileKey"],
      ["pcs_new_cityKey", "pcs_new_fileKey"],
      NEW_BASE_LABEL,
      ""
    ),

    currentZip: CURRENT_BASE_LABEL ? getParam("curZip", "") : "",
    newZip: getParam("newZip", getStorageItem("pcs_new_zip") || ""),

    bedroom: 3,
    livingMode: "buy",
    trendYears: 1
  };

  var COMP = {
    loaded: false,
    source: "unavailable",
    basePay: null,
    bas: null,
    bahNew: null,
    bahCurrent: null
  };

  var PCS_MOVE = {
    loaded: false,
    source: "pending",
    total: 0,
    dla: 0,
    malt: 0,
    distanceMiles: 0,
    povs: 1,
    warnings: []
  };

  // Unknown data stays unknown; official rates remain in the backend modules.
  var HOUSING = {};

  function getBasePay() { return amount(COMP.basePay); }
  function getBasAmount() { return amount(COMP.bas); }
  function dependentsLabel() { return STATE.family >= 2 ? "with" : "without"; }
  function getBah(cityKey, role) {
    return role === "current" ? amount(COMP.bahCurrent) : amount(COMP.bahNew);
  }

  function baseIdentity(value) {
    return String(value || "").replace(/\s+(AFB|SFB|Field)$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function compensationInputAvailable() {
    return /^(E[1-9]|O(?:[1-9]|10)|O[1-3]E|W[1-5])$/.test(STATE.rank) &&
      Number.isInteger(STATE.yos) && STATE.yos >= 0 && STATE.yos <= 40 &&
      Number.isInteger(STATE.family) && STATE.family >= 1 &&
      ["ad", "active", "active_duty"].indexOf(String(STATE.type).toLowerCase()) !== -1;
  }

  function extractCompensationMonthly(data, baseName) {
    var source = (data && data.payload) || (data && data.data) || {};
    var comp = source.compensation || {};
    var profile = source.profile || {};
    if (!data || data.ok !== true || comp.ok !== true || source.tool !== "PCS_SNAPSHOT" ||
        normalizeRank(profile.rank) !== STATE.rank || profile.yos !== STATE.yos ||
        profile.hasDependents !== (STATE.family >= 2) ||
        baseIdentity(profile.base) !== baseIdentity(baseName)) return {};
    return comp.monthly || {};
  }

  async function fetchCompensationForBase(baseName) {
    if (!baseName || !compensationInputAvailable()) return null;
    try {
      var data = await fetchWithTimeout(getApiOrigin() + "/api/opensource-brain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "PCS_SNAPSHOT", input: {
          rank: prettyRank(STATE.rank), yos: STATE.yos, base: baseName,
          family: STATE.family, dependents: dependentsLabel()
        } })
      });
      var monthly = extractCompensationMonthly(data, baseName);
      return {
        basePay: amount(monthly.basicPay !== undefined ? monthly.basicPay : monthly.basePay),
        bah: amount(monthly.bah), bas: amount(monthly.bas)
      };
    } catch (err) {
      console.warn("[PCS Snapshot] Compensation unavailable for", baseName, err);
      return null;
    }
  }

  async function loadCompensation() {
    var results = await Promise.all([
      fetchCompensationForBase(STATE.newBase), fetchCompensationForBase(STATE.currentBase)
    ]);
    var destination = results[0] || {};
    COMP.basePay = amount(destination.basePay);
    COMP.bas = amount(destination.bas);
    COMP.bahNew = amount(destination.bah);
    COMP.bahCurrent = amount(results[1] && results[1].bah);
    COMP.source = grossIncome() !== null ? "official" : "unavailable";
    COMP.loaded = true;
  }

  /* =========================================================
    #4B) PCS MOVE CASH — DLA + MALT
  ========================================================= */

  var BASE_COORDS = {
    "Andrews AFB": [38.8108, -76.8669],
    "Barksdale AFB": [32.5018, -93.6627],
    "Beale AFB": [39.1361, -121.4366],
    "Cannon AFB": [34.3828, -103.3221],
    "Charleston AFB": [32.8986, -80.0405],
    "Creech AFB": [36.5872, -115.6731],
    "Davis-Monthan AFB": [32.1665, -110.8832],
    "Dover AFB": [39.1295, -75.4659],
    "Dyess AFB": [32.4208, -99.8546],
    "Edwards AFB": [34.9054, -117.8837],
    "Eglin AFB": [30.4832, -86.5254],
    "Elmendorf AFB": [61.2500, -149.8065],
    "Fairchild AFB": [47.6151, -117.6558],
    "F.E. Warren AFB": [41.1333, -104.8667],
    "F.E-Warren AFB": [41.1333, -104.8667],
    "Fort-Sam-Houston AFB": [29.4594, -98.4151],
    "Fort Sam Houston AFB": [29.4594, -98.4151],
    "JBSA-Fort Sam Houston": [29.4594, -98.4151],
    "Goodfellow AFB": [31.4332, -100.4012],
    "Grand Forks AFB": [47.9611, -97.4012],
    "Hanscom AFB": [42.4699, -71.2890],
    "Hill AFB": [41.1239, -111.9730],
    "Holloman AFB": [32.8525, -106.1066],
    "Hurlburt Field": [30.4278, -86.6893],
    "Lackland AFB": [29.3842, -98.5811],
    "Randolph AFB": [29.5297, -98.2789],
    "JBSA-Randolph": [29.5297, -98.2789],
    "Keesler AFB": [30.4106, -88.9244],
    "Kirtland AFB": [35.0402, -106.6090],
    "Langley AFB": [37.0829, -76.3605],
    "Laughlin AFB": [29.3595, -100.7780],
    "Little Rock AFB": [34.9169, -92.1497],
    "Little-Rock AFB": [34.9169, -92.1497],
    "Los Angeles AFB": [33.9180, -118.3800],
    "Luke AFB": [33.5350, -112.3831],
    "MacDill AFB": [27.8493, -82.5212],
    "Malmstrom AFB": [47.5047, -111.1873],
    "Maxwell AFB": [32.3829, -86.3658],
    "McChord Field": [47.1377, -122.4765],
    "McConnell AFB": [37.6231, -97.2672],
    "McGuire AFB": [40.0156, -74.5917],
    "Minot AFB": [48.4156, -101.3580],
    "Moody AFB": [30.9678, -83.1930],
    "Mountain Home AFB": [43.0436, -115.8724],
    "Mountain-Home AFB": [43.0436, -115.8724],
    "Nellis AFB": [36.2362, -115.0343],
    "Offutt AFB": [41.1183, -95.9125],
    "Peterson AFB": [38.8230, -104.7008],
    "Robins AFB": [32.6401, -83.5919],
    "Scott AFB": [38.5452, -89.8504],
    "Seymour Johnson AFB": [35.3394, -77.9606],
    "Seymour-Johnson AFB": [35.3394, -77.9606],
    "Shaw AFB": [33.9727, -80.4706],
    "Sheppard AFB": [33.9888, -98.4919],
    "Tinker AFB": [35.4147, -97.3866],
    "Travis AFB": [38.2627, -121.9275],
    "Tyndall AFB": [30.0707, -85.5766],
    "Whiteman AFB": [38.7303, -93.5482],
    "Wright-Patterson AFB": [39.8261, -84.0483]
  };

  function normalizeBaseForDistance(value) {
    var s = baseDisplayName(value)
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!s) return "";

    var noSuffix = s
      .replace(/\s+AFB$/i, "")
      .replace(/\s+SFB$/i, "")
      .replace(/\s+Field$/i, "")
      .trim();

    var aliases = {
      "Fort-Sam-Houston": "Fort-Sam-Houston AFB",
      "Fort Sam Houston": "Fort Sam Houston AFB",
      "JBSA Fort Sam Houston": "JBSA-Fort Sam Houston",
      "JBSA-Fort-Sam-Houston": "JBSA-Fort Sam Houston",
      "Randolph": "Randolph AFB",
      "JBSA Randolph": "JBSA-Randolph",
      "JBSA-Randolph": "JBSA-Randolph",
      "Lackland": "Lackland AFB",
      "Andrews": "Andrews AFB",
      "Barksdale": "Barksdale AFB",
      "Beale": "Beale AFB",
      "Cannon": "Cannon AFB",
      "Charleston": "Charleston AFB",
      "Creech": "Creech AFB",
      "Davis-Monthan": "Davis-Monthan AFB",
      "Davis Monthan": "Davis-Monthan AFB",
      "Dover": "Dover AFB",
      "Dyess": "Dyess AFB",
      "Edwards": "Edwards AFB",
      "Eglin": "Eglin AFB",
      "Elmendorf": "Elmendorf AFB",
      "Fairchild": "Fairchild AFB",
      "F.E. Warren": "F.E. Warren AFB",
      "F.E-Warren": "F.E-Warren AFB",
      "Goodfellow": "Goodfellow AFB",
      "Grand Forks": "Grand Forks AFB",
      "Hanscom": "Hanscom AFB",
      "Hill": "Hill AFB",
      "Holloman": "Holloman AFB",
      "Hurlburt": "Hurlburt Field",
      "Keesler": "Keesler AFB",
      "Kirtland": "Kirtland AFB",
      "Langley": "Langley AFB",
      "Laughlin": "Laughlin AFB",
      "Little Rock": "Little Rock AFB",
      "Little-Rock": "Little-Rock AFB",
      "Los Angeles": "Los Angeles AFB",
      "Luke": "Luke AFB",
      "MacDill": "MacDill AFB",
      "Malmstrom": "Malmstrom AFB",
      "Maxwell": "Maxwell AFB",
      "McChord": "McChord Field",
      "McConnell": "McConnell AFB",
      "McGuire": "McGuire AFB",
      "Minot": "Minot AFB",
      "Moody": "Moody AFB",
      "Mountain Home": "Mountain Home AFB",
      "Mountain-Home": "Mountain-Home AFB",
      "Nellis": "Nellis AFB",
      "Offutt": "Offutt AFB",
      "Peterson": "Peterson AFB",
      "Robins": "Robins AFB",
      "Scott": "Scott AFB",
      "Seymour Johnson": "Seymour Johnson AFB",
      "Seymour-Johnson": "Seymour-Johnson AFB",
      "Shaw": "Shaw AFB",
      "Sheppard": "Sheppard AFB",
      "Tinker": "Tinker AFB",
      "Travis": "Travis AFB",
      "Tyndall": "Tyndall AFB",
      "Whiteman": "Whiteman AFB",
      "Wright-Patterson": "Wright-Patterson AFB",
      "Wright Patterson": "Wright-Patterson AFB"
    };

    if (BASE_COORDS[s]) return s;
    if (BASE_COORDS[noSuffix]) return noSuffix;
    if (aliases[s]) return aliases[s];
    if (aliases[noSuffix]) return aliases[noSuffix];

    if (BASE_COORDS[noSuffix + " AFB"]) return noSuffix + " AFB";

    return s;
  }

  function milesBetweenCoords(a, b) {
    var R = 3958.8;

    function toRad(deg) {
      return deg * Math.PI / 180;
    }

    var lat1 = toRad(a[0]);
    var lon1 = toRad(a[1]);
    var lat2 = toRad(b[0]);
    var lon2 = toRad(b[1]);

    var dLat = lat2 - lat1;
    var dLon = lon2 - lon1;

    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function estimateBaseDistanceMiles(currentBase, newBase) {
    if (!String(currentBase || "").trim() || !String(newBase || "").trim()) return 0;
    var from = normalizeBaseForDistance(currentBase);
    var to = normalizeBaseForDistance(newBase);

    if (!from || !to || from === to) return 0;

    var a = BASE_COORDS[from];
    var b = BASE_COORDS[to];

    if (!a || !b) {
      console.warn("[PCS Snapshot] Missing base coordinates for PCS move distance:", {
        fromInput: currentBase,
        toInput: newBase,
        fromResolved: from,
        toResolved: to
      });

      return 0;
    }

    return Math.round(milesBetweenCoords(a, b) * 1.18);
  }

  function resolvePcsDistanceMiles() {
    var fromUrl = safeNum(getParam("distanceMiles", getParam("distance", "")), 0);
    if (fromUrl > 0) return fromUrl;

    // Route mileage must belong to this request, not an earlier session.
    return estimateBaseDistanceMiles(STATE.currentBase, STATE.newBase);
  }

  function resolvePcsPovs() {
    var fromUrl = safeNum(getParam("povs", getParam("pov", "")), 0);
    if (fromUrl > 0) return clamp(Math.round(fromUrl), 1, 2);

    var fromStorage = safeNum(
      getStorageItem("pcs_povs") || getStorageItem("pcs_pov"),
      0
    );

    if (fromStorage > 0) return clamp(Math.round(fromStorage), 1, 2);

    return 1;
  }

  function extractPcsMoveResult(data) {
    var result = data && data.result ? data.result : {};
    var dla = result.dla || {};
    var malt = result.malt || {};
    var knownEntitlements = result.knownEntitlements || {};

    var dlaAmount = dla.available ? safeNum(dla.amount, 0) : safeNum(knownEntitlements.dla, 0);
    var maltAmount = safeNum(malt.totalAmount, safeNum(knownEntitlements.malt, 0));
    var total = dlaAmount + maltAmount;

    return {
      loaded: true,
      source: "official",
      total: total,
      dla: dlaAmount,
      malt: maltAmount,
      distanceMiles: safeNum(malt.distanceMiles, resolvePcsDistanceMiles()),
      povs: safeNum(malt.povs, resolvePcsPovs()),
      warnings: Array.isArray(data && data.warnings) ? data.warnings : []
    };
  }

  // Explicit iframe URL inputs take precedence over standalone defaults.
  function sharedPcsMoveInput(distanceMiles, povs) {
    var rawDate = getParam("travelDate", "");
    var validDate = /^2026-\d{2}-\d{2}$/.test(rawDate) && !isNaN(Date.parse(rawDate)) && new Date(rawDate).toISOString().slice(0, 10) === rawDate;
    return {
      rank: prettyRank(STATE.rank), yos: STATE.yos, familySize: STATE.family,
      hasDependents: STATE.family >= 2, dependents: dependentsLabel(),
      currentBase: STATE.currentBase, gainingBase: STATE.newBase,
      distanceMiles: distanceMiles,
      distanceSource: getParam("distanceSource", "") === "manual" ? "manual" : "estimated_base_to_base",
      povs: povs, year: 2026, travelDate: validDate ? rawDate : null
    };
  }

  async function loadPcsMoveEstimate() {
    var distanceMiles = resolvePcsDistanceMiles();
    var povs = resolvePcsPovs();

    if (!distanceMiles || distanceMiles <= 0) {
      PCS_MOVE = {
        loaded: true,
        source: "missing_distance",
        total: 0,
        dla: 0,
        malt: 0,
        distanceMiles: 0,
        povs: povs,
        warnings: ["Missing distance estimate for PCS move calculation."]
      };

      return PCS_MOVE;
    }

    var endpoint = getApiOrigin() + "/api/pcs-move";

    try {
      var data = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "PCS Snapshot",
          poweredBy: "TheWing.ai",
          input: sharedPcsMoveInput(distanceMiles, povs)
        })
      });

      PCS_MOVE = extractPcsMoveResult(data);

      console.info(
        "[PCS Snapshot] PCS move estimate loaded:",
        "DLA " + money(PCS_MOVE.dla),
        "MALT " + money(PCS_MOVE.malt),
        "Total " + money(PCS_MOVE.total),
        Math.round(PCS_MOVE.distanceMiles || 0) + " miles",
        (PCS_MOVE.povs || 1) + " POV"
      );

      return PCS_MOVE;
    } catch (err) {
      console.warn("[PCS Snapshot] PCS move estimate failed:", err);

      PCS_MOVE = {
        loaded: true,
        source: "error",
        total: 0,
        dla: 0,
        malt: 0,
        distanceMiles: distanceMiles,
        povs: povs,
        warnings: [err && err.message ? err.message : "PCS move estimate failed."]
      };

      return PCS_MOVE;
    }
  }

  /* =========================================================
    #5) DATA LOADING
  ========================================================= */

  async function fetchJsonSafe(url) {
    try { return await fetchWithTimeout(url, { cache: "no-store" }); }
    catch (e) { return null; }
  }

  async function loadCityData(cityKey, fallback, label) {
    var key = normalizeBaseKey(cityKey);
    if (!/^[A-Za-z][A-Za-z0-9.-]*$/.test(key) || key.indexOf("..") !== -1) {
      return markFallbackData(null, key, label);
    }
    var encoded = encodeURIComponent(key) + ".json";
    // The supported API also works from PCSUnited's cross-origin embeds.
    var packet = await fetchJsonSafe(getApiOrigin() + "/api/base-data?file=" + encoded);
    if (packet && packet.ok === true && packet.file === key + ".json" && packet.data) return packet.data;
    var data = await fetchJsonSafe(getApiOrigin() + "/netlify/functions/cities/" + encoded);
    return data && data.by_bedroom ? data : markFallbackData(null, key, label);
  }

  function markFallbackData(fallback, requestedKey, label) {
    return { __pcs_fallback: true, __pcs_requested_key: requestedKey || "", __pcs_fallback_label: label };
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

    var city = getByPath(data, ["city", "place", "name"], STATE.newBase || "Destination unavailable");
    var state = getByPath(data, ["state_code", "state"], "");

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

    return "";
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
      ], null),
      null
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
      ], null),
      null
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
      ], null),
      null
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
      ], null),
      null
    );
  }

  function populationCity(data) {
    return safeNum(
      getByPath(data, [
        "population.city",
        "demographics.population.city",
        "snapshot.population_city",
        "snapshot.population",
        "population.estimate",
        "population.total"
      ], null),
      null
    );
  }

  function populationLabel(value) {
    return Number.isFinite(value)
      ? value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })
      : "Unavailable";
  }

  function populationMetro(data) {
    return safeNum(
      getByPath(data, [
        "population.metro",
        "demographics.population.metro",
        "snapshot.metro_population",
        "snapshot.population_metro"
      ], null),
      null
    );
  }

  function marketSignal(data) {
    return getByPath(data, [
      "housing.market.inventory_signal",
      "market_bluf.signal",
      "market_bluf.status",
      "scorecard.market_signal"
    ], "Unavailable");
  }

  function trafficLevel(data) {
    return getByPath(data, [
      "scorecard.traffic",
      "snapshot.traffic_level",
      "lifestyle.traffic",
      "commute_intelligence.traffic"
    ], "Unavailable");
  }

  function employmentStatus(data) {
    return getByPath(data, [
      "scorecard.employment",
      "snapshot.employment_status",
      "labor.employment_status",
      "snapshot.employment"
    ], "Unavailable");
  }

  function marketHeadline(data) {
    return getByPath(data, [
      "market_bluf.headline",
      "market_bluf.bluf_headline",
      "financial_brief.market_headline",
      "snapshot.market_headline"
    ], "Unavailable");
  }

  function marketSummary(data) {
    return getByPath(data, [
      "market_bluf.summary",
      "market_bluf.bluf_summary",
      "market_bluf.bluf",
      "financial_brief.market_summary",
      "snapshot.market_summary"
    ], "Unavailable");
  }

  function financialHeadline(data) {
    return getByPath(data, [
      "financial_brief.headline",
      "financial_brief.title",
      "financial_brief.bah_vs_buy_position",
      "market_bluf.financial_headline"
    ], "Unavailable");
  }

  function financialSummary(data) {
    return getByPath(data, [
      "financial_brief.summary",
      "financial_brief.affordability_summary",
      "financial_brief.bluf",
      "market_bluf.financial_summary"
    ], "Unavailable");
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
    if (typeof value === "number") return amount(value) === null ? fallback : value;
    if (value && typeof value === "object") {
      var avg = amount(value.avg), low = amount(value.low), high = amount(value.high);
      if (avg !== null) return avg;
      if (low !== null && high !== null && high >= low) return (low + high) / 2;
    }
    return fallback;
  }

  function bedroomData(data, bedroom) {
    var node = getByPath(data, ["by_bedroom." + bedroom], {});
    var mortgage = HOUSING[String(bedroom)] || {};
    var homeRaw = getByPath(node, ["home_price", "price", "average_home_price"], null);
    var rent = avgFromRange(getByPath(node, ["rent", "rent_monthly", "average_rent"], null), null);
    var utilities = avgFromRange(getByPath(node, ["utilities.total", "utilities", "utilities_monthly", "average_utilities"], null), null);
    return {
      home: avgFromRange(homeRaw, null), low: amount(homeRaw && homeRaw.low), high: amount(homeRaw && homeRaw.high),
      mortgage: amount(mortgage.principalInterest), taxes: amount(mortgage.propertyTax),
      insurance: amount(mortgage.insurance), hoa: amount(mortgage.hoa), rent: rent, utilities: utilities,
      totalHousing: sumKnown([amount(mortgage.allIn), utilities]),
      totalRent: sumKnown([rent, utilities]),
      asOf: getByPath(node, ["home_price.as_of", "utilities.as_of"], "date unavailable")
    };
  }

  // Only adapt city inputs here. Amortization, tax, insurance and VA fee math
  // come from the existing mortgage API and shared mortgage-scenario module.
  function mortgageRequest(data, bedroom) {
    var node = getByPath(data, ["by_bedroom." + bedroom], null);
    if (!node || data.__pcs_fallback) return null;
    var assumptions = data.mortgage_assumptions || {};
    var price = avgFromRange(node.home_price, null);
    var rate = amount(assumptions.apr_percent), term = amount(assumptions.term_years);
    var down = amount(assumptions.down_payment_percent);
    var taxPercent = amount(getByPath(data, ["property_tax_rate_percent", "ownership_costs.property_tax_rate_percent"], null));
    var insurancePercent = amount(getByPath(data, ["insurance_rate_percent", "ownership_costs.insurance_rate_percent"], null));
    var taxRate = amount(getByPath(data, ["property_tax_rate", "ownership_costs.property_tax_rate"], null));
    var insuranceRate = amount(getByPath(data, ["insurance_rate", "ownership_costs.insurance_rate_estimate"], null));
    var hoa = amount(getByPath(node, ["hoa", "hoa_monthly"], getByPath(data, ["hoa_monthly", "ownership_costs.hoa_monthly_default", "costs.hoa_monthly_default"], null)));
    if (!(price > 0) || rate === null || !(term >= 1 && term <= 40) || down === null || down > 100 ||
        hoa === null || (taxPercent === null && taxRate === null) || (insurancePercent === null && insuranceRate === null)) return null;
    var request = {
      price: price, interestRate: rate, termYears: term, downPct: down, hoaMonthly: hoa,
      loanType: "va", priorUse: "first_use", fundingFeeExempt: false, financeFundingFee: true
    };
    if (taxPercent !== null) request.propertyTaxPercent = taxPercent;
    else request.propertyTaxRate = taxRate;
    if (insurancePercent !== null) request.insurancePercent = insurancePercent;
    else request.insuranceRate = insuranceRate;
    return request;
  }

  function readMortgage(data) {
    var m = data && data.monthly;
    if (!data || data.ok !== true || !data.meta || data.meta.vaOverlayApplied !== true || !m ||
        ![m.principalInterest, m.propertyTax, m.insurance, m.hoa, m.pmi, m.allIn].every(function (n) { return typeof n === "number" && amount(n) !== null; }) ||
        m.allIn <= 0 || m.pmi !== 0 ||
        Math.abs(sumKnown([m.principalInterest, m.propertyTax, m.insurance, m.hoa, m.pmi]) - m.allIn) > 0.03) return null;
    return m;
  }

  async function loadHousingCosts(data) {
    HOUSING = {};
    await Promise.all([2, 3, 4, 5].map(async function (bedroom) {
      var request = mortgageRequest(data, bedroom);
      if (!request) return;
      try {
        var result = await fetchWithTimeout(getApiOrigin() + "/api/mortgage", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request)
        });
        HOUSING[String(bedroom)] = readMortgage(result);
      } catch (err) {
        console.warn("[PCS Snapshot] Housing estimate unavailable:", bedroom, err);
      }
    }));
  }

  function housingComparison(bed) {
    var gap = Number.isFinite(bed.totalHousing) && Number.isFinite(bed.totalRent)
      ? Math.round((bed.totalHousing - bed.totalRent) * 100) / 100 : null;
    return { monthlyGap: gap, annualGap: gap === null ? null : Math.round(gap * 12 * 100) / 100 };
  }

  function recordedHistory(data, years) {
    var rows = getByPath(data, ["housing.market.sale_history_36_months"], []);
    var byMonth = {};
    if (!data || !Array.isArray(rows) || data.__pcs_fallback) return [];
    rows.forEach(function (row) {
      if (row && /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) && amount(row.median_sale_price) > 0) {
        var date = Date.parse(row.month + "-01T00:00:00Z");
        if (date <= Date.now()) byMonth[row.month] = { x: date, y: amount(row.median_sale_price) };
      }
    });
    var points = Object.keys(byMonth).sort().map(function (month) { return byMonth[month]; });
    if (!points.length) return [];
    var start = new Date(points[points.length - 1].x);
    start.setUTCMonth(start.getUTCMonth() - (years === 3 ? 36 : 12));
    return points.filter(function (point) { return point.x >= start.getTime(); });
  }

  function monthLabel(timestamp) {
    return new Date(timestamp).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
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
    var points = recordedHistory(data, years);
    text("pcs-trend-title", (years === 3 ? "3-Year" : "12-Month") + " Housing History");
    text("pcs-trend-subtitle", "Recorded median sale prices • sparse observations");
    text("pcs-trend-summary", points.length
      ? points.length + " recorded observations • " + monthLabel(points[0].x) + " – " + monthLabel(points[points.length - 1].x) + ". Lines connect records; missing months are not estimated."
      : "No dated sale-price history is available for this destination.");

    if (!el || typeof ApexCharts === "undefined") return;
    destroyChart(trendChart);
    trendChart = null;

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
        type: "datetime",
        labels: { datetimeUTC: true, format: "MMM yy" },
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
      markers: { size: 4 },
      noData: { text: "History unavailable", style: { color: "#cbd5e1" } },
      stroke: {
        curve: "straight",
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
        x: { format: "MMM yyyy" },
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
    var totalIncome = grossIncome();
    var comparisonAvailable = Number.isFinite(currentBah) && Number.isFinite(newBah);
    var bahDelta = comparisonAvailable ? newBah - currentBah : null;

    text("pcs-income-main", money(totalIncome, true));
    var incomeNode = $("pcs-income-main");
    if (incomeNode) {
      incomeNode.style.fontSize = totalIncome === null ? "18px" : "";
      var incomeUnit = incomeNode.parentElement.querySelector(".pts-unit");
      if (incomeUnit) incomeUnit.hidden = totalIncome === null;
    }
    html("pcs-income-breakdown", "Base Pay: " + money(basePay, true) + ", BAH " + money(newBah) + ",<br />BAS " + money(getBasAmount(), true));
    text("pts-income-meta", totalIncome === null
      ? "Complete, verified compensation is unavailable. Check inputs and retry."
      : "Gross base pay + BAH + BAS; before deductions");

    text("pts-bah-delta", comparisonAvailable ? (bahDelta >= 0 ? "+" : "-") + money(Math.abs(bahDelta)) : "Unavailable");
    var deltaNode = $("pts-bah-delta");
    if (deltaNode) {
      deltaNode.style.fontSize = comparisonAvailable ? "" : "18px";
      var deltaUnit = deltaNode.parentElement.querySelector(".pts-unit");
      if (deltaUnit) deltaUnit.hidden = !comparisonAvailable;
    }
    text("pts-bah-copy", comparisonAvailable ? "Compared with your previous duty station housing allowance." : STATE.currentBase ? "Both duty stations need verified BAH for comparison." : "No current duty station was provided.");
    text("pts-bah-meta", comparisonAvailable ? "vs. Previous Duty Station" : "Comparison unavailable");

    if (PCS_MOVE && PCS_MOVE.loaded && PCS_MOVE.total > 0) {
      text("pts-market-signal", money(PCS_MOVE.total));
      html(
        "pts-market-copy",
        "DLA: <strong>" + money(PCS_MOVE.dla) + "</strong> • MALT: <strong>" + money(PCS_MOVE.malt) + "</strong>"
      );
      text(
        "pts-market-meta",
        (getParam("distanceSource", "") === "manual" ? "Entered Miles = " : "Estimated Miles = ") + Math.round(PCS_MOVE.distanceMiles || 0).toLocaleString() + " mi • " + (PCS_MOVE.povs || 1) + " POV"
      );
    } else {
      text("pts-market-signal", "Unavailable");
      text("pts-market-copy", STATE.currentBase ? "DLA + MALT unavailable for this route." : "Provide a current base or route distance to estimate travel allotments.");
      text("pts-market-meta", "PCS move cash estimate");
    }

    var bed = bedroomData(newData, STATE.bedroom);
    var housingRatio = Number.isFinite(bed.totalHousing) && totalIncome > 0 ? bed.totalHousing / totalIncome : null;
    text("pts-power-score", housingRatio === null ? "—" : (housingRatio * 100).toFixed(1) + "%");
    text("pts-power-stars", "");
    text("pts-power-copy", "Estimated housing as a share of gross base pay, BAH and BAS.");
    text("pts-power-meta", "Excludes debts and other living expenses");
  }

  function paintCityBrief(newData) {
    if (newData && newData.__pcs_fallback) {
      console.warn(
        "[PCS Snapshot] Destination base JSON unavailable for",
        newData.__pcs_requested_key || STATE.newCityKey,
        "- showing unavailable fields"
      );
      text(
        "pcs-city-line",
        (STATE.newBase || "Selected Base") + " • Base data unavailable"
      );
    } else {
      text("pcs-city-line", cityLabel(newData) + " • Quick PCS Snapshot");
    }

    setImage("img-current", cityImage(newData), cityLabel(newData));

    text("pcs-current-city", cityLabel(newData).toUpperCase());
    text("pcs-current-tagline", "“" + getByPath(newData, ["market_label", "base_profile.market_label", "snapshot.market_label"], "Military Market Intelligence") + "”");

    text("pcs-current-bluf-headline", marketHeadline(newData));
    text("pcs-current-bluf-summary", marketSummary(newData));

    text("pcs-cur-population-city", populationLabel(populationCity(newData)));
    text("pcs-cur-population-metro", "Metro: " + populationLabel(populationMetro(newData)));

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
    var costAvailable = Number.isFinite(bed.totalHousing);
    var comparable = costAvailable && Number.isFinite(bah);
    var buffer = comparable ? Math.round((bah - bed.totalHousing) * 100) / 100 : null;
    var covered = comparable && bed.totalHousing > 0 ? Math.round(bah / bed.totalHousing * 100) : null;

    text("pcs-bedroom-value", STATE.bedroom);
    html("pcs-afford-headline", money(buffer) + " <span>BAH Balance</span>");
    html("pcs-afford-subline", covered === null ? "Verified BAH and a complete housing estimate are required."
      : "BAH covers <strong>" + covered + "%</strong> of estimated housing costs");
    ["home", "mortgage", "taxes", "insurance", "hoa", "utilities"].forEach(function (key) {
      text(key === "home" ? "pcs-afford-home-price" : "pcs-afford-" + key, money(bed[key]));
      if (key !== "home") text("pcs-amt-" + key, Number.isFinite(bed[key]) ? money(bed[key]) : "—");
    });
    text("pcs-donut-buffer", covered === null ? "—" : covered + "%");
    text("pcs-donut-buffer-label", "BAH Covered");
    var request = mortgageRequest(newData, STATE.bedroom);
    text("pcs-afford-footer", costAvailable && request
      ? "Estimate: " + money(bed.totalHousing, true) + "/mo including HOA + utilities. VA " + request.termYears + " years, " + request.interestRate + "% interest, " + request.downPct + "% down; first use, non-exempt, fee financed. Data: " + bed.asOf + ". Excludes repairs and closing costs."
      : "Housing estimate unavailable for this bedroom profile. Missing data or an unavailable service is not a zero cost.");

    var donut = $("pcs-afford-donut");
    if (donut) {
      if (!costAvailable || bed.totalHousing <= 0) {
        donut.style.background = "rgba(255,255,255,.08)";
        return;
      }
      var total = bed.totalHousing;
      var mortgageDeg = bed.mortgage / total * 360;
      var taxDeg = (bed.mortgage + bed.taxes) / total * 360;
      var insDeg = (bed.mortgage + bed.taxes + bed.insurance) / total * 360;
      var hoaDeg = (bed.mortgage + bed.taxes + bed.insurance + bed.hoa) / total * 360;
      donut.style.background = "conic-gradient("
        + "rgba(157,232,255,.95) 0deg " + mortgageDeg + "deg,"
        + "rgba(80,229,191,.92) " + mortgageDeg + "deg " + taxDeg + "deg,"
        + "rgba(255,181,107,.92) " + taxDeg + "deg " + insDeg + "deg,"
        + "rgba(142,136,255,.92) " + insDeg + "deg " + hoaDeg + "deg,"
        + "rgba(255,255,255,.35) " + hoaDeg + "deg 360deg)";
    }
  }

  function paintLivingStrategy(newData) {
    var bed = bedroomData(newData, STATE.bedroom);
    var comparison = housingComparison(bed);
    var mode = STATE.livingMode;
    var base = mode === "base", rent = mode === "rent";
    var cost = base ? null : rent ? bed.totalRent : bed.totalHousing;
    var monthlyGap = base ? null : comparison.monthlyGap;
    text("pcs-ls-status", base ? "BASE HOUSING • QUOTE REQUIRED" : "MONTHLY COST COMPARISON");
    text("pcs-ls-main", base ? "Base Housing" : rent ? "Rent" : "Buy");
    text("pcs-ls-sub", base ? "Actual rent and utility terms depend on the housing provider."
      : cost === null ? "Housing cost unavailable" : "Estimated housing: " + money(cost, true) + "/month");
    text("pcs-ls-equity", "Equity is not projected");
    text("pcs-ls-bluf", base ? "BAH alone does not establish the cost of base housing."
      : monthlyGap === null ? "Complete buy and rent costs are needed to compare."
      : "Buying costs " + money(Math.abs(monthlyGap), true) + (monthlyGap < 0 ? " less" : " more")
        + " per month than renting. Both include the same utility estimate; repairs, transaction costs and rent changes are excluded.");
    text("pcs-ls-annual", money(base ? null : comparison.annualGap, true));
    text("pcs-ls-vs", base ? "Quote required" : "Buy − rent");
    text("pcs-ls-gap", money(monthlyGap, true));

    destroyChart(livingChart);
    livingChart = cost === null ? null : renderDoughnut("pcs-ls-chart",
      rent ? ["Rent", "Utilities"] : ["Principal & interest", "Taxes", "Insurance", "HOA", "Utilities"],
      rent ? [bed.rent, bed.utilities] : [bed.mortgage, bed.taxes, bed.insurance, bed.hoa, bed.utilities]);
  }

  function paintComparison(currentData, newData) {
    var currentBah = getBah(STATE.currentCityKey, "current");
    var newBah = getBah(STATE.newCityKey, "new");
    var comparisonAvailable = Number.isFinite(currentBah) && Number.isFinite(newBah);
    var newHome = medianHome(newData);

    setImage("img-upcoming", cityImage(newData), cityLabel(newData));

    text("side-current", STATE.currentBase || "Current base not provided");
    text("side-upcoming", STATE.newBase);
    text("loc-upcoming", cityLabel(newData));

    text("bah-upcoming", money(newBah));
    text("price-upcoming", moneyK(newHome));
    text("yoy-upcoming", pct(yoyChange(newData)));
    text("dom-upcoming", daysOnMarket(newData) === null ? "Unavailable" : String(daysOnMarket(newData)));

    text(
      "pcsc-status",
      !comparisonAvailable ? "Comparison unavailable: provide a current duty station with verified BAH." : newBah >= currentBah
        ? "BAH improves by " + money(newBah - currentBah) + " per month."
        : "BAH decreases by " + money(currentBah - newBah) + " per month."
    );

    html(
      "facts-upcoming",
      "<li>Median home: " + moneyK(newHome) + "</li>"
      + "<li>Days on market: " + (daysOnMarket(newData) === null ? "Unavailable" : daysOnMarket(newData)) + "</li>"
      + "<li>Market signal: " + marketSignal(newData) + "</li>"
    );

    // These legacy targets remain available without unsupported star ratings.
    text("rating-current", "Unavailable");
    text("rating-upcoming", "Unavailable");
    text("stars-current", "");
    text("stars-upcoming", "");
    destroyChart(chartCurrent);
    destroyChart(chartUpcoming);
    chartCurrent = Number.isFinite(currentBah) ? renderSimpleCanvasChart("chart-current", ["BAH"], [currentBah]) : null;
    chartUpcoming = Number.isFinite(newBah) ? renderSimpleCanvasChart("chart-upcoming", ["BAH"], [newBah]) : null;
  }

  function paintQuickFacts(newData) {
    text("pcs-qf-poverty", getByPath(newData, ["income.poverty_rate_percent", "income.poverty_rate", "demographics.poverty_rate"], "Unavailable"));
    text("pcs-qf-home", moneyK(medianHome(newData)));
    text("pcs-qf-dom", daysOnMarket(newData) === null ? "Unavailable" : String(daysOnMarket(newData)));

    var basePay = getBasePay(STATE.rank);
    var bah = getBah(STATE.newCityKey, "new");

    destroyChart(incomeChart);
    destroyChart(bahChart);

    incomeChart = grossIncome() === null ? null : renderSimpleCanvasChart("pcs-income-chart", ["Base Pay", "BAH", "BAS"], [basePay, bah, getBasAmount()]);
    var currentBah = getBah(STATE.currentCityKey, "current");
    bahChart = Number.isFinite(currentBah) && Number.isFinite(bah) ? renderSimpleCanvasChart("pcs-bah-chart", ["Current", "New"], [currentBah, bah]) : null;

    text("pcs-income-summary", "Gross base pay + BAH + BAS before deductions: " + money(grossIncome(), true));
    text("pcs-bah-summary", "New duty station BAH estimate: " + money(bah));
  }

  function paintOwnershipRange(newData) {
    var bed = bedroomData(newData, STATE.bedroom);
    var low = bed.low;
    var high = bed.high;
    var median = medianHome(newData);

    text("pcs-own-gap-note", "Typical entry range around " + cityLabel(newData));
    text("pcs-own-right-text", "Comparing low vs high market entry");

    var ceiling = high > 0 ? high : null;
    text("pcs-own-y1", moneyK(ceiling));
    text("pcs-own-y2", moneyK(ceiling === null ? null : ceiling * 0.75));
    text("pcs-own-y3", moneyK(ceiling === null ? null : ceiling * 0.5));
    text("pcs-own-y4", moneyK(ceiling === null ? null : ceiling * 0.25));

    text("pcs-own-low-value", moneyK(low));
    text("pcs-own-high-value", moneyK(high));
    text("pcs-own-high-tag", "Upper Range");
    text("pcs-own-chip-median", "Median: " + moneyK(median));
    text("pcs-own-chip-gap-low", "Low: " + moneyK(low));
    text("pcs-own-chip-gap-high", "High: " + moneyK(high));

    var lowBar = $("pcs-own-bar-low");
    var highBar = $("pcs-own-bar-high");

    if (lowBar) lowBar.style.height = (ceiling && low !== null ? clamp(low / ceiling * 100, 0, 100) : 0) + "%";
    if (highBar) highBar.style.height = (ceiling ? 100 : 0) + "%";

    destroyChart(affordChart);
    destroyChart(priceBreakChart);

    affordChart = Number.isFinite(bed.totalHousing) && Number.isFinite(getBah(STATE.newCityKey, "new")) ? renderDoughnut("pcs-afford-chart", ["Mortgage", "Utilities", "Buffer"], [
      bed.mortgage,
      bed.utilities,
      Math.max(0, getBah(STATE.newCityKey, "new") - bed.totalHousing)
    ]) : null;

    priceBreakChart = [low, median, high].every(Number.isFinite) ? renderSimpleCanvasChart("pcs-pricebreak-chart", ["Low", "Median", "High"], [low, median, high]) : null;

    text("pcs-afford-summary", "Affordability is based on BAH compared against mortgage, utilities, taxes, insurance, and HOA.");
    text("pcs-pricebreak-note", "Price range uses the selected bedroom record; no range is invented for missing data.");
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
    renderTrendChart(newData, STATE.trendYears);
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
        STATE.trendYears = 1;
        renderTrendChart(newData, STATE.trendYears);
      });
    }

    if (btn3) {
      btn3.addEventListener("click", function () {
        btn3.classList.add("active");
        if (btn1) btn1.classList.remove("active");
        STATE.trendYears = 3;
        renderTrendChart(newData, STATE.trendYears);
      });
    }

    var tabs = document.querySelectorAll(".pcs-ls-tab");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("active");
        });

        tab.classList.add("active");

        STATE.livingMode = tab.getAttribute("data-mode") || "buy";
        paintLivingStrategy(newData);
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
        STATE.currentBase ? loadCityData(STATE.currentCityKey, null, "current") : Promise.resolve(null),
        loadCityData(STATE.newCityKey, null, "destination"),
        loadCompensation(),
        loadPcsMoveEstimate()
      ]);

      var currentData = results[0];
      var newData = results[1];
      await loadHousingCosts(newData);

      paintAll(currentData, newData);
      wireEvents(currentData, newData);

      window.PCS_SNAPSHOT_STATE = {
        input: STATE,
        compensation: COMP,
        housing: HOUSING,
        pcsMove: PCS_MOVE,
        currentData: currentData,
        newData: newData
      };

      console.log("PCS Snapshot loaded:", window.PCS_SNAPSHOT_STATE);
    } catch (err) {
      console.error("PCS Snapshot failed to load:", err);

      var unavailable = markFallbackData(null, STATE.newCityKey, "destination");
      paintAll(null, unavailable);
      wireEvents(null, unavailable);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
