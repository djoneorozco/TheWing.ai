// official-bah.js
// ============================================================
// TheWing.ai • Official BAH Source
// v1.1.0
//
// FILE
// - netlify/functions/_share/official-bah.js
//
// PURPOSE
// - Single source of truth for 2026 official BAH for PCSUnited-supported bases
// - PCSUnited base scope only (44 supported bases)
// - Uses canonical base aliases + duty ZIP normalization
// - Returns exact with / without dependent BAH by rank
// - No UI logic
// - No localStorage
// - No Basic Pay
// - No BAS
// - No VA
// - No retirement
//
// SOURCE
// - Uploaded DTMO 2026 BAH Rates PDF: 2026_BAH_Rates_d303.pdf
// - Rates effective January 1, 2026
//
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
//
// UPDATE v1.1.0
// - Regenerated BAH rows from the official 2026 BAH PDF for repo-supported bases.
// - Added Fort Sam Houston, McGuire, Moody, and Tyndall coverage from cities index.
// - Corrected MHA mappings for JBSA/San Antonio, Eglin/Hurlburt, Langley, and others.
// - Added base-or-ZIP lookup support.
// - Hardened dependent and rank normalization.
// ============================================================

export const RATE_VERSION = "official-bah-2026.2";

export const SUPPORTED_RANKS = Object.freeze(["E-1", "E-2", "E-3", "E-4", "E-5", "E-6", "E-7", "E-8", "E-9", "W-1", "W-2", "W-3", "W-4", "W-5", "O-1E", "O-2E", "O-3E", "O-1", "O-2", "O-3", "O-4", "O-5", "O-6", "O-7"]);

export const RATE_COLUMNS = Object.freeze(["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "W01", "W02", "W03", "W04", "W05", "O01E", "O02E", "O03E", "O01", "O02", "O03", "O04", "O05", "O06", "O07"]);

// ============================================================
// //#1) HELPERS
// ============================================================

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;

  Object.freeze(value);

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return value;
}

export function normalizeString(value) {
  return String(value ?? "").trim();
}

function compactKey(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeRank(rank) {
  const s = normalizeString(rank).toUpperCase();
  const m = s.match(/^([EOW])\s*[-]?\s*(\d{1,2})(E)?$/);

  if (!m) return s.replace(/\s+/g, "");

  return `${m[1]}-${Number(m[2])}${m[3] ? "E" : ""}`;
}

export function normalizeDependents(dependents) {
  if (typeof dependents === "boolean") return dependents ? "with" : "without";

  if (typeof dependents === "number" && Number.isFinite(dependents)) {
    return dependents >= 2 ? "with" : "without";
  }

  const raw = normalizeString(dependents).toLowerCase();

  if (["yes", "y", "true", "1", "with", "dependent", "dependents", "with dependents", "with_dependents", "with-dependent", "family", "married"].includes(raw)) {
    return "with";
  }

  if (["no", "n", "false", "0", "without", "single", "none", "without dependents", "without_dependents", "without-dependent"].includes(raw)) {
    return "without";
  }

  const maybeNumber = Number(raw);

  if (Number.isFinite(maybeNumber)) {
    return maybeNumber >= 2 ? "with" : "without";
  }

  throw new Error(
    'Dependents must resolve to either "with" or "without" dependents.'
  );
}

export function assertSupportedRank(rank) {
  const rankKey = normalizeRank(rank);

  if (!SUPPORTED_RANKS.includes(rankKey)) {
    throw new Error(
      `Unsupported rank "${rank}". Supported ranks: ${SUPPORTED_RANKS.join(", ")}`
    );
  }

  return rankKey;
}

// ============================================================
// //#2) CANONICAL BASE ALIAS MAP
// ============================================================

export const BASE_ALIASES = deepFreeze({
  "Andrews": "Andrews AFB",
  "Andrews AFB": "Andrews AFB",
  "AndrewsAFB": "Andrews AFB",
  "Barksdale": "Barksdale AFB",
  "Barksdale AFB": "Barksdale AFB",
  "BarksdaleAFB": "Barksdale AFB",
  "Beale": "Beale AFB",
  "Beale AFB": "Beale AFB",
  "BealeAFB": "Beale AFB",
  "Cannon": "Cannon AFB",
  "Cannon AFB": "Cannon AFB",
  "CannonAFB": "Cannon AFB",
  "Charleston": "Charleston AFB",
  "Charleston AFB": "Charleston AFB",
  "CharlestonAFB": "Charleston AFB",
  "DMAFB": "Davis-Monthan AFB",
  "Davis Monthan AFB": "Davis-Monthan AFB",
  "Davis-Monthan": "Davis-Monthan AFB",
  "Davis-Monthan AFB": "Davis-Monthan AFB",
  "DavisMonthan": "Davis-Monthan AFB",
  "DavisMonthanAFB": "Davis-Monthan AFB",
  "Dover": "Dover AFB",
  "Dover AFB": "Dover AFB",
  "DoverAFB": "Dover AFB",
  "Dyess": "Dyess AFB",
  "Dyess AFB": "Dyess AFB",
  "DyessAFB": "Dyess AFB",
  "Eglin": "Eglin AFB",
  "Eglin AFB": "Eglin AFB",
  "EglinAFB": "Eglin AFB",
  "Elmendorf": "Elmendorf AFB",
  "Elmendorf AFB": "Elmendorf AFB",
  "ElmendorfAFB": "Elmendorf AFB",
  "F E Warren": "F.E-Warren AFB",
  "F.E Warren AFB": "F.E-Warren AFB",
  "F.E-Warren": "F.E-Warren AFB",
  "F.E-Warren AFB": "F.E-Warren AFB",
  "FEWarren": "F.E-Warren AFB",
  "FEWarrenAFB": "F.E-Warren AFB",
  "Fairchild": "Fairchild AFB",
  "Fairchild AFB": "Fairchild AFB",
  "FairchildAFB": "Fairchild AFB",
  "Fort Sam Houston": "Fort-Sam-Houston AFB",
  "Fort Sam Houston AFB": "Fort-Sam-Houston AFB",
  "Fort-Sam-Houston": "Fort-Sam-Houston AFB",
  "Fort-Sam-Houston AFB": "Fort-Sam-Houston AFB",
  "FortSamHouston": "Fort-Sam-Houston AFB",
  "FortSamHoustonAFB": "Fort-Sam-Houston AFB",
  "Holloman": "Holloman AFB",
  "Holloman AFB": "Holloman AFB",
  "HollomanAFB": "Holloman AFB",
  "Hurlburt": "Hurlburt AFB",
  "Hurlburt AFB": "Hurlburt AFB",
  "Hurlburt Field": "Hurlburt AFB",
  "HurlburtAFB": "Hurlburt AFB",
  "JB Andrews": "Andrews AFB",
  "JBER": "Elmendorf AFB",
  "JBMDL": "McGuire AFB",
  "JBSA": "Lackland AFB",
  "JBSA Fort Sam Houston": "Fort-Sam-Houston AFB",
  "JBSA Lackland": "Lackland AFB",
  "JBSA Randolph": "Randolph AFB",
  "JBSA-Fort-Sam-Houston": "Fort-Sam-Houston AFB",
  "JBSA-Lackland": "Lackland AFB",
  "JBSA-Randolph": "Randolph AFB",
  "Joint Base Andrews": "Andrews AFB",
  "Joint Base Charleston": "Charleston AFB",
  "Joint Base Elmendorf-Richardson": "Elmendorf AFB",
  "Joint Base Langley-Eustis": "Langley AFB",
  "Joint Base McGuire Dix Lakehurst": "McGuire AFB",
  "Joint Base McGuire-Dix-Lakehurst": "McGuire AFB",
  "Joint Base San Antonio": "Lackland AFB",
  "Joint Base San Antonio Lackland": "Lackland AFB",
  "Joint Base San Antonio Randolph": "Randolph AFB",
  "Keesler": "Keesler AFB",
  "Keesler AFB": "Keesler AFB",
  "KeeslerAFB": "Keesler AFB",
  "Kirtland": "Kirtland AFB",
  "Kirtland AFB": "Kirtland AFB",
  "KirtlandAFB": "Kirtland AFB",
  "Lackland": "Lackland AFB",
  "Lackland AFB": "Lackland AFB",
  "LacklandAFB": "Lackland AFB",
  "Langley": "Langley AFB",
  "Langley AFB": "Langley AFB",
  "LangleyAFB": "Langley AFB",
  "Laughlin": "Laughlin AFB",
  "Laughlin AFB": "Laughlin AFB",
  "LaughlinAFB": "Laughlin AFB",
  "Little Rock": "Little-Rock AFB",
  "Little Rock AFB": "Little-Rock AFB",
  "Little-Rock": "Little-Rock AFB",
  "Little-Rock AFB": "Little-Rock AFB",
  "LittleRock": "Little-Rock AFB",
  "LittleRockAFB": "Little-Rock AFB",
  "Luke": "Luke AFB",
  "Luke AFB": "Luke AFB",
  "LukeAFB": "Luke AFB",
  "MacDill": "MacDill AFB",
  "MacDill AFB": "MacDill AFB",
  "MacDillAFB": "MacDill AFB",
  "Malmstrom": "Malmstrom AFB",
  "Malmstrom AFB": "Malmstrom AFB",
  "MalmstromAFB": "Malmstrom AFB",
  "Maxwell": "Maxwell AFB",
  "Maxwell AFB": "Maxwell AFB",
  "MaxwellAFB": "Maxwell AFB",
  "McConnell": "McConnell AFB",
  "McConnell AFB": "McConnell AFB",
  "McConnellAFB": "McConnell AFB",
  "McGuire": "McGuire AFB",
  "McGuire AFB": "McGuire AFB",
  "McGuireAFB": "McGuire AFB",
  "Minot": "Minot AFB",
  "Minot AFB": "Minot AFB",
  "MinotAFB": "Minot AFB",
  "Moody": "Moody AFB",
  "Moody AFB": "Moody AFB",
  "MoodyAFB": "Moody AFB",
  "Mountain Home": "Mountain-Home AFB",
  "Mountain Home AFB": "Mountain-Home AFB",
  "Mountain-Home": "Mountain-Home AFB",
  "Mountain-Home AFB": "Mountain-Home AFB",
  "MountainHome": "Mountain-Home AFB",
  "MountainHomeAFB": "Mountain-Home AFB",
  "Nellis": "Nellis AFB",
  "Nellis AFB": "Nellis AFB",
  "NellisAFB": "Nellis AFB",
  "Offutt": "Offutt AFB",
  "Offutt AFB": "Offutt AFB",
  "OffuttAFB": "Offutt AFB",
  "Peterson": "Peterson AFB",
  "Peterson AFB": "Peterson AFB",
  "Peterson SFB": "Peterson AFB",
  "Peterson Space Force Base": "Peterson AFB",
  "PetersonAFB": "Peterson AFB",
  "Randolph": "Randolph AFB",
  "Randolph AFB": "Randolph AFB",
  "RandolphAFB": "Randolph AFB",
  "Robins": "Robins AFB",
  "Robins AFB": "Robins AFB",
  "RobinsAFB": "Robins AFB",
  "Scott": "Scott AFB",
  "Scott AFB": "Scott AFB",
  "ScottAFB": "Scott AFB",
  "Seymour Johnson AFB": "Seymour-Johnson AFB",
  "Seymour-Johnson": "Seymour-Johnson AFB",
  "Seymour-Johnson AFB": "Seymour-Johnson AFB",
  "SeymourJohnson": "Seymour-Johnson AFB",
  "SeymourJohnsonAFB": "Seymour-Johnson AFB",
  "Shaw": "Shaw AFB",
  "Shaw AFB": "Shaw AFB",
  "ShawAFB": "Shaw AFB",
  "Sheppard": "Sheppard AFB",
  "Sheppard AFB": "Sheppard AFB",
  "SheppardAFB": "Sheppard AFB",
  "Tinker": "Tinker AFB",
  "Tinker AFB": "Tinker AFB",
  "TinkerAFB": "Tinker AFB",
  "Travis": "Travis AFB",
  "Travis AFB": "Travis AFB",
  "TravisAFB": "Travis AFB",
  "Tyndall": "Tyndall AFB",
  "Tyndall AFB": "Tyndall AFB",
  "TyndallAFB": "Tyndall AFB",
  "WPAFB": "Wright-Patterson AFB",
  "Whiteman": "Whiteman AFB",
  "Whiteman AFB": "Whiteman AFB",
  "WhitemanAFB": "Whiteman AFB",
  "Wright Patterson AFB": "Wright-Patterson AFB",
  "Wright-Patterson": "Wright-Patterson AFB",
  "Wright-Patterson AFB": "Wright-Patterson AFB",
  "WrightPatterson": "Wright-Patterson AFB",
  "WrightPattersonAFB": "Wright-Patterson AFB"
});

export const BASE_TO_ZIP = deepFreeze({
  "Andrews AFB": "20762",
  "Barksdale AFB": "71110",
  "Beale AFB": "95903",
  "Cannon AFB": "88103",
  "Charleston AFB": "29404",
  "Davis-Monthan AFB": "85707",
  "Dover AFB": "19902",
  "Dyess AFB": "79607",
  "Eglin AFB": "32542",
  "Elmendorf AFB": "99506",
  "F.E-Warren AFB": "82005",
  "Fairchild AFB": "99011",
  "Fort-Sam-Houston AFB": "78234",
  "Holloman AFB": "88330",
  "Hurlburt AFB": "32544",
  "Keesler AFB": "39534",
  "Kirtland AFB": "87117",
  "Lackland AFB": "78236",
  "Langley AFB": "23665",
  "Laughlin AFB": "78843",
  "Little-Rock AFB": "72099",
  "Luke AFB": "85309",
  "MacDill AFB": "33621",
  "Malmstrom AFB": "59402",
  "Maxwell AFB": "36112",
  "McConnell AFB": "67221",
  "McGuire AFB": "08641",
  "Minot AFB": "58705",
  "Moody AFB": "31699",
  "Mountain-Home AFB": "83648",
  "Nellis AFB": "89191",
  "Offutt AFB": "68113",
  "Peterson AFB": "80914",
  "Randolph AFB": "78150",
  "Robins AFB": "31098",
  "Scott AFB": "62225",
  "Seymour-Johnson AFB": "27531",
  "Shaw AFB": "29152",
  "Sheppard AFB": "76311",
  "Tinker AFB": "73145",
  "Travis AFB": "94535",
  "Tyndall AFB": "32403",
  "Whiteman AFB": "65305",
  "Wright-Patterson AFB": "45433"
});

export const ZIP_TO_BASE = deepFreeze({
  "20762": "Andrews AFB",
  "71110": "Barksdale AFB",
  "95903": "Beale AFB",
  "88103": "Cannon AFB",
  "29404": "Charleston AFB",
  "85707": "Davis-Monthan AFB",
  "19902": "Dover AFB",
  "79607": "Dyess AFB",
  "32542": "Eglin AFB",
  "99506": "Elmendorf AFB",
  "82005": "F.E-Warren AFB",
  "99011": "Fairchild AFB",
  "78234": "Fort-Sam-Houston AFB",
  "88330": "Holloman AFB",
  "32544": "Hurlburt AFB",
  "39534": "Keesler AFB",
  "87117": "Kirtland AFB",
  "78236": "Lackland AFB",
  "23665": "Langley AFB",
  "78843": "Laughlin AFB",
  "72099": "Little-Rock AFB",
  "85309": "Luke AFB",
  "33621": "MacDill AFB",
  "59402": "Malmstrom AFB",
  "36112": "Maxwell AFB",
  "67221": "McConnell AFB",
  "08641": "McGuire AFB",
  "58705": "Minot AFB",
  "31699": "Moody AFB",
  "83648": "Mountain-Home AFB",
  "89191": "Nellis AFB",
  "68113": "Offutt AFB",
  "80914": "Peterson AFB",
  "78150": "Randolph AFB",
  "31098": "Robins AFB",
  "62225": "Scott AFB",
  "27531": "Seymour-Johnson AFB",
  "29152": "Shaw AFB",
  "76311": "Sheppard AFB",
  "73145": "Tinker AFB",
  "94535": "Travis AFB",
  "32403": "Tyndall AFB",
  "65305": "Whiteman AFB",
  "45433": "Wright-Patterson AFB"
});

export const BASE_TO_MHA = deepFreeze({
  "Andrews AFB": "DC053",
  "Barksdale AFB": "LA117",
  "Beale AFB": "CA033",
  "Cannon AFB": "NM207",
  "Charleston AFB": "SC259",
  "Davis-Monthan AFB": "AZ015",
  "Dover AFB": "DE054",
  "Dyess AFB": "TX270",
  "Eglin AFB": "FL056",
  "Elmendorf AFB": "AK404",
  "F.E-Warren AFB": "WY324",
  "Fairchild AFB": "WA310",
  "Fort-Sam-Houston AFB": "TX285",
  "Holloman AFB": "NM205",
  "Hurlburt AFB": "FL056",
  "Keesler AFB": "MS168",
  "Kirtland AFB": "NM206",
  "Lackland AFB": "TX285",
  "Langley AFB": "VA297",
  "Laughlin AFB": "TX278",
  "Little-Rock AFB": "AR010",
  "Luke AFB": "AZ013",
  "MacDill AFB": "FL066",
  "Malmstrom AFB": "MT175",
  "Maxwell AFB": "AL005",
  "McConnell AFB": "KS101",
  "McGuire AFB": "NJ204",
  "Minot AFB": "ND191",
  "Moody AFB": "GA081",
  "Mountain-Home AFB": "ID086",
  "Nellis AFB": "NV212",
  "Offutt AFB": "NE192",
  "Peterson AFB": "CO046",
  "Randolph AFB": "TX285",
  "Robins AFB": "GA076",
  "Scott AFB": "IL093",
  "Seymour-Johnson AFB": "NC183",
  "Shaw AFB": "SC263",
  "Sheppard AFB": "TX288",
  "Tinker AFB": "OK239",
  "Travis AFB": "CA036",
  "Tyndall AFB": "FL063",
  "Whiteman AFB": "MO162",
  "Wright-Patterson AFB": "OH231"
});

export function canonicalizeBase(baseOrZip) {
  const raw = normalizeString(baseOrZip);

  if (!raw) {
    throw new Error("Base or duty ZIP is required.");
  }

  if (/^\d{5}$/.test(raw) && ZIP_TO_BASE[raw]) {
    return ZIP_TO_BASE[raw];
  }

  if (BASE_ALIASES[raw]) {
    return BASE_ALIASES[raw];
  }

  const compactRaw = compactKey(raw);

  for (const [alias, canonical] of Object.entries(BASE_ALIASES)) {
    if (compactKey(alias) === compactRaw) {
      return canonical;
    }
  }

  throw new Error(`No supported BAH base found for "${baseOrZip}".`);
}

// ============================================================
// //#3) 2026 BAH TABLE BY SUPPORTED BASE
// ============================================================

export const BAH_2026_BY_BASE = deepFreeze({
  "Andrews AFB": {
    base: "Andrews AFB",
    canonicalBase: "Andrews AFB",
    dutyZip: "20762",
    mhaCode: "DC053",
    mhaName: "WASHINGTON, DC METRO AREA",
    with: {
      "E-1": 3096, "E-2": 3096, "E-3": 3096, "E-4": 3096, "E-5": 3132,
      "E-6": 3759, "E-7": 3855, "E-8": 3957, "E-9": 4128, "W-1": 3780,
      "W-2": 3894, "W-3": 4023, "W-4": 4167, "W-5": 4350, "O-1E": 3870,
      "O-2E": 4002, "O-3E": 4197, "O-1": 3213, "O-2": 3753, "O-3": 4020,
      "O-4": 4410, "O-5": 4692, "O-6": 4731, "O-7": 4770
    },
    without: {
      "E-1": 2409, "E-2": 2409, "E-3": 2409, "E-4": 2409, "E-5": 2832,
      "E-6": 3057, "E-7": 3099, "E-8": 3261, "E-9": 3447, "W-1": 3096,
      "W-2": 3258, "W-3": 3471, "W-4": 3777, "W-5": 3876, "O-1E": 3129,
      "O-2E": 3405, "O-3E": 3753, "O-1": 3054, "O-2": 3126, "O-3": 3531,
      "O-4": 3855, "O-5": 3909, "O-6": 3999, "O-7": 4071
    }
  },

  "Barksdale AFB": {
    base: "Barksdale AFB",
    canonicalBase: "Barksdale AFB",
    dutyZip: "71110",
    mhaCode: "LA117",
    mhaName: "SHREVEPORT/BARKSDALE AFB, LA",
    with: {
      "E-1": 1701, "E-2": 1701, "E-3": 1701, "E-4": 1701, "E-5": 1845,
      "E-6": 2028, "E-7": 2112, "E-8": 2208, "E-9": 2352, "W-1": 2043,
      "W-2": 2151, "W-3": 2271, "W-4": 2382, "W-5": 2520, "O-1E": 2127,
      "O-2E": 2250, "O-3E": 2403, "O-1": 1875, "O-2": 2025, "O-3": 2268,
      "O-4": 2562, "O-5": 2778, "O-6": 2799, "O-7": 2817
    },
    without: {
      "E-1": 1281, "E-2": 1281, "E-3": 1281, "E-4": 1281, "E-5": 1452,
      "E-6": 1566, "E-7": 1704, "E-8": 1887, "E-9": 1932, "W-1": 1662,
      "W-2": 1884, "W-3": 1941, "W-4": 2040, "W-5": 2133, "O-1E": 1842,
      "O-2E": 1920, "O-3E": 2016, "O-1": 1551, "O-2": 1800, "O-3": 1956,
      "O-4": 2112, "O-5": 2163, "O-6": 2247, "O-7": 2283
    }
  },

  "Beale AFB": {
    base: "Beale AFB",
    canonicalBase: "Beale AFB",
    dutyZip: "95903",
    mhaCode: "CA033",
    mhaName: "BEALE AFB, CA",
    with: {
      "E-1": 2733, "E-2": 2733, "E-3": 2733, "E-4": 2733, "E-5": 2967,
      "E-6": 3132, "E-7": 3150, "E-8": 3159, "E-9": 3195, "W-1": 3147,
      "W-2": 3156, "W-3": 3168, "W-4": 3216, "W-5": 3315, "O-1E": 3153,
      "O-2E": 3162, "O-3E": 3231, "O-1": 2994, "O-2": 3129, "O-3": 3165,
      "O-4": 3342, "O-5": 3492, "O-6": 3522, "O-7": 3546
    },
    without: {
      "E-1": 2133, "E-2": 2133, "E-3": 2133, "E-4": 2133, "E-5": 2367,
      "E-6": 2523, "E-7": 2742, "E-8": 3006, "E-9": 3042, "W-1": 2661,
      "W-2": 3003, "W-3": 3051, "W-4": 3123, "W-5": 3132, "O-1E": 2964,
      "O-2E": 3033, "O-3E": 3120, "O-1": 2496, "O-2": 2892, "O-3": 3066,
      "O-4": 3126, "O-5": 3135, "O-6": 3138, "O-7": 3171
    }
  },

  "Cannon AFB": {
    base: "Cannon AFB",
    canonicalBase: "Cannon AFB",
    dutyZip: "88103",
    mhaCode: "NM207",
    mhaName: "CANNON AFB/CLOVIS, NM",
    with: {
      "E-1": 1260, "E-2": 1260, "E-3": 1260, "E-4": 1260, "E-5": 1365,
      "E-6": 1593, "E-7": 1695, "E-8": 1806, "E-9": 1890, "W-1": 1611,
      "W-2": 1740, "W-3": 1878, "W-4": 1893, "W-5": 1917, "O-1E": 1713,
      "O-2E": 1857, "O-3E": 1896, "O-1": 1401, "O-2": 1590, "O-3": 1875,
      "O-4": 1920, "O-5": 1944, "O-6": 1956, "O-7": 1968
    },
    without: {
      "E-1": 1050, "E-2": 1050, "E-3": 1050, "E-4": 1050, "E-5": 1107,
      "E-6": 1194, "E-7": 1272, "E-8": 1416, "E-9": 1476, "W-1": 1236,
      "W-2": 1413, "W-3": 1485, "W-4": 1611, "W-5": 1719, "O-1E": 1362,
      "O-2E": 1461, "O-3E": 1584, "O-1": 1152, "O-2": 1335, "O-3": 1506,
      "O-4": 1695, "O-5": 1755, "O-6": 1857, "O-7": 1887
    }
  },

  "Charleston AFB": {
    base: "Charleston AFB",
    canonicalBase: "Charleston AFB",
    dutyZip: "29404",
    mhaCode: "SC259",
    mhaName: "CHARLESTON, SC",
    with: {
      "E-1": 2220, "E-2": 2220, "E-3": 2220, "E-4": 2220, "E-5": 2385,
      "E-6": 2616, "E-7": 2652, "E-8": 2694, "E-9": 2769, "W-1": 2634,
      "W-2": 2667, "W-3": 2724, "W-4": 2790, "W-5": 2880, "O-1E": 2655,
      "O-2E": 2712, "O-3E": 2802, "O-1": 2421, "O-2": 2613, "O-3": 2721,
      "O-4": 2904, "O-5": 3039, "O-6": 3060, "O-7": 3081
    },
    without: {
      "E-1": 1755, "E-2": 1755, "E-3": 1755, "E-4": 1755, "E-5": 1941,
      "E-6": 2064, "E-7": 2223, "E-8": 2439, "E-9": 2496, "W-1": 2172,
      "W-2": 2436, "W-3": 2508, "W-4": 2619, "W-5": 2661, "O-1E": 2382,
      "O-2E": 2484, "O-3E": 2607, "O-1": 2049, "O-2": 2334, "O-3": 2529,
      "O-4": 2646, "O-5": 2664, "O-6": 2697, "O-7": 2742
    }
  },

  "Davis-Monthan AFB": {
    base: "Davis-Monthan AFB",
    canonicalBase: "Davis-Monthan AFB",
    dutyZip: "85707",
    mhaCode: "AZ015",
    mhaName: "DAVIS-MONTHAN AFB, AZ",
    with: {
      "E-1": 1695, "E-2": 1695, "E-3": 1695, "E-4": 1695, "E-5": 1905,
      "E-6": 2121, "E-7": 2145, "E-8": 2178, "E-9": 2253, "W-1": 2136,
      "W-2": 2157, "W-3": 2202, "W-4": 2274, "W-5": 2373, "O-1E": 2148,
      "O-2E": 2190, "O-3E": 2289, "O-1": 1938, "O-2": 2118, "O-3": 2199,
      "O-4": 2400, "O-5": 2550, "O-6": 2568, "O-7": 2583
    },
    without: {
      "E-1": 1272, "E-2": 1272, "E-3": 1272, "E-4": 1272, "E-5": 1428,
      "E-6": 1587, "E-7": 1701, "E-8": 1953, "E-9": 2007, "W-1": 1632,
      "W-2": 1950, "W-3": 2019, "W-4": 2118, "W-5": 2151, "O-1E": 1902,
      "O-2E": 1995, "O-3E": 2109, "O-1": 1482, "O-2": 1839, "O-3": 2037,
      "O-4": 2139, "O-5": 2154, "O-6": 2175, "O-7": 2211
    }
  },

  "Dover AFB": {
    base: "Dover AFB",
    canonicalBase: "Dover AFB",
    dutyZip: "19902",
    mhaCode: "DE054",
    mhaName: "DOVER AFB/REHOBOTH, DE",
    with: {
      "E-1": 2160, "E-2": 2160, "E-3": 2160, "E-4": 2160, "E-5": 2277,
      "E-6": 2493, "E-7": 2694, "E-8": 2916, "E-9": 3063, "W-1": 2511,
      "W-2": 2787, "W-3": 3060, "W-4": 3066, "W-5": 3075, "O-1E": 2736,
      "O-2E": 3018, "O-3E": 3069, "O-1": 2310, "O-2": 2490, "O-3": 3051,
      "O-4": 3078, "O-5": 3081, "O-6": 3105, "O-7": 3123
    },
    without: {
      "E-1": 1782, "E-2": 1782, "E-3": 1782, "E-4": 1782, "E-5": 1947,
      "E-6": 2052, "E-7": 2163, "E-8": 2325, "E-9": 2379, "W-1": 2133,
      "W-2": 2322, "W-3": 2391, "W-4": 2535, "W-5": 2745, "O-1E": 2274,
      "O-2E": 2367, "O-3E": 2481, "O-1": 2043, "O-2": 2241, "O-3": 2409,
      "O-4": 2706, "O-5": 2832, "O-6": 3039, "O-7": 3090
    }
  },

  "Dyess AFB": {
    base: "Dyess AFB",
    canonicalBase: "Dyess AFB",
    dutyZip: "79607",
    mhaCode: "TX270",
    mhaName: "ABILENE/DYESS AFB, TX",
    with: {
      "E-1": 1458, "E-2": 1458, "E-3": 1458, "E-4": 1458, "E-5": 1554,
      "E-6": 2214, "E-7": 2238, "E-8": 2247, "E-9": 2298, "W-1": 2235,
      "W-2": 2244, "W-3": 2256, "W-4": 2325, "W-5": 2448, "O-1E": 2241,
      "O-2E": 2250, "O-3E": 2343, "O-1": 1635, "O-2": 2205, "O-3": 2253,
      "O-4": 2484, "O-5": 2676, "O-6": 2694, "O-7": 2712
    },
    without: {
      "E-1": 1170, "E-2": 1170, "E-3": 1170, "E-4": 1170, "E-5": 1287,
      "E-6": 1662, "E-7": 1680, "E-8": 1692, "E-9": 1884, "W-1": 1677,
      "W-2": 1689, "W-3": 1908, "W-4": 2211, "W-5": 2220, "O-1E": 1686,
      "O-2E": 1842, "O-3E": 2208, "O-1": 1362, "O-2": 1683, "O-3": 1974,
      "O-4": 2214, "O-5": 2223, "O-6": 2226, "O-7": 2241
    }
  },

  "Eglin AFB": {
    base: "Eglin AFB",
    canonicalBase: "Eglin AFB",
    dutyZip: "32542",
    mhaCode: "FL056",
    mhaName: "EGLIN AFB, FL",
    with: {
      "E-1": 2340, "E-2": 2340, "E-3": 2340, "E-4": 2340, "E-5": 2433,
      "E-6": 2526, "E-7": 2841, "E-8": 3189, "E-9": 3447, "W-1": 2544,
      "W-2": 2985, "W-3": 3414, "W-4": 3456, "W-5": 3516, "O-1E": 2910,
      "O-2E": 3351, "O-3E": 3468, "O-1": 2451, "O-2": 2523, "O-3": 3399,
      "O-4": 3528, "O-5": 3612, "O-6": 3642, "O-7": 3669
    },
    without: {
      "E-1": 2007, "E-2": 2007, "E-3": 2007, "E-4": 2007, "E-5": 2157,
      "E-6": 2250, "E-7": 2340, "E-8": 2457, "E-9": 2586, "W-1": 2322,
      "W-2": 2454, "W-3": 2589, "W-4": 2604, "W-5": 2922, "O-1E": 2430,
      "O-2E": 2514, "O-3E": 2601, "O-1": 2244, "O-2": 2406, "O-3": 2592,
      "O-4": 2865, "O-5": 3066, "O-6": 3393, "O-7": 3453
    }
  },

  "Elmendorf AFB": {
    base: "Elmendorf AFB",
    canonicalBase: "Elmendorf AFB",
    dutyZip: "99506",
    mhaCode: "AK404",
    mhaName: "ANCHORAGE, AK",
    with: {
      "E-1": 2277, "E-2": 2277, "E-3": 2277, "E-4": 2277, "E-5": 2874,
      "E-6": 2892, "E-7": 3045, "E-8": 3240, "E-9": 3486, "W-1": 2895,
      "W-2": 3123, "W-3": 3369, "W-4": 3528, "W-5": 3723, "O-1E": 3078,
      "O-2E": 3333, "O-3E": 3558, "O-1": 2886, "O-2": 2889, "O-3": 3360,
      "O-4": 3789, "O-5": 4095, "O-6": 4131, "O-7": 4161
    },
    without: {
      "E-1": 1707, "E-2": 1707, "E-3": 1707, "E-4": 1707, "E-5": 2157,
      "E-6": 2169, "E-7": 2283, "E-8": 2430, "E-9": 2616, "W-1": 2172,
      "W-2": 2385, "W-3": 2619, "W-4": 2901, "W-5": 3087, "O-1E": 2310,
      "O-2E": 2523, "O-3E": 2853, "O-1": 2166, "O-2": 2286, "O-3": 2643,
      "O-4": 3051, "O-5": 3162, "O-6": 3348, "O-7": 3405
    }
  },

  "F.E-Warren AFB": {
    base: "F.E-Warren AFB",
    canonicalBase: "F.E-Warren AFB",
    dutyZip: "82005",
    mhaCode: "WY324",
    mhaName: "CHEYENNE, WY",
    with: {
      "E-1": 1539, "E-2": 1539, "E-3": 1539, "E-4": 1539, "E-5": 1653,
      "E-6": 2217, "E-7": 2301, "E-8": 2388, "E-9": 2520, "W-1": 2238,
      "W-2": 2334, "W-3": 2445, "W-4": 2547, "W-5": 2676, "O-1E": 2313,
      "O-2E": 2427, "O-3E": 2568, "O-1": 1725, "O-2": 2211, "O-3": 2442,
      "O-4": 2715, "O-5": 2916, "O-6": 2937, "O-7": 2955
    },
    without: {
      "E-1": 1161, "E-2": 1161, "E-3": 1161, "E-4": 1161, "E-5": 1326,
      "E-6": 1662, "E-7": 1725, "E-8": 1791, "E-9": 1935, "W-1": 1680,
      "W-2": 1764, "W-3": 1956, "W-4": 2232, "W-5": 2319, "O-1E": 1734,
      "O-2E": 1899, "O-3E": 2211, "O-1": 1422, "O-2": 1728, "O-3": 2010,
      "O-4": 2298, "O-5": 2343, "O-6": 2424, "O-7": 2463
    }
  },

  "Fairchild AFB": {
    base: "Fairchild AFB",
    canonicalBase: "Fairchild AFB",
    dutyZip: "99011",
    mhaCode: "WA310",
    mhaName: "SPOKANE, WA",
    with: {
      "E-1": 1947, "E-2": 1947, "E-3": 1947, "E-4": 1947, "E-5": 2184,
      "E-6": 2553, "E-7": 2658, "E-8": 2772, "E-9": 2901, "W-1": 2574,
      "W-2": 2706, "W-3": 2847, "W-4": 2922, "W-5": 3021, "O-1E": 2679,
      "O-2E": 2826, "O-3E": 2937, "O-1": 2235, "O-2": 2550, "O-3": 2844,
      "O-4": 3048, "O-5": 3195, "O-6": 3222, "O-7": 3243
    },
    without: {
      "E-1": 1611, "E-2": 1611, "E-3": 1611, "E-4": 1611, "E-5": 1665,
      "E-6": 1914, "E-7": 1995, "E-8": 2262, "E-9": 2367, "W-1": 1932,
      "W-2": 2259, "W-3": 2382, "W-4": 2574, "W-5": 2685, "O-1E": 2181,
      "O-2E": 2343, "O-3E": 2547, "O-1": 1707, "O-2": 2106, "O-3": 2418,
      "O-4": 2658, "O-5": 2721, "O-6": 2826, "O-7": 2874
    }
  },

  "Fort-Sam-Houston AFB": {
    base: "Fort-Sam-Houston AFB",
    canonicalBase: "Fort-Sam-Houston AFB",
    dutyZip: "78234",
    mhaCode: "TX285",
    mhaName: "SAN ANTONIO, TX",
    with: {
      "E-1": 1728, "E-2": 1728, "E-3": 1728, "E-4": 1728, "E-5": 1869,
      "E-6": 2094, "E-7": 2112, "E-8": 2121, "E-9": 2157, "W-1": 2109,
      "W-2": 2118, "W-3": 2130, "W-4": 2178, "W-5": 2280, "O-1E": 2115,
      "O-2E": 2124, "O-3E": 2196, "O-1": 1905, "O-2": 2091, "O-3": 2127,
      "O-4": 2307, "O-5": 2457, "O-6": 2475, "O-7": 2490
    },
    without: {
      "E-1": 1359, "E-2": 1359, "E-3": 1359, "E-4": 1359, "E-5": 1500,
      "E-6": 1596, "E-7": 1731, "E-8": 1920, "E-9": 1977, "W-1": 1692,
      "W-2": 1917, "W-3": 1986, "W-4": 2085, "W-5": 2097, "O-1E": 1866,
      "O-2E": 1965, "O-3E": 2082, "O-1": 1584, "O-2": 1827, "O-3": 2007,
      "O-4": 2088, "O-5": 2100, "O-6": 2103, "O-7": 2112
    }
  },

  "Holloman AFB": {
    base: "Holloman AFB",
    canonicalBase: "Holloman AFB",
    dutyZip: "88330",
    mhaCode: "NM205",
    mhaName: "HOLLOMAN AFB/ALAMOGORDO, NM",
    with: {
      "E-1": 1419, "E-2": 1419, "E-3": 1419, "E-4": 1419, "E-5": 1590,
      "E-6": 1869, "E-7": 1890, "E-8": 1899, "E-9": 1980, "W-1": 1887,
      "W-2": 1896, "W-3": 1908, "W-4": 2007, "W-5": 2136, "O-1E": 1893,
      "O-2E": 1902, "O-3E": 2028, "O-1": 1632, "O-2": 1866, "O-3": 1905,
      "O-4": 2175, "O-5": 2376, "O-6": 2394, "O-7": 2406
    },
    without: {
      "E-1": 1131, "E-2": 1131, "E-3": 1131, "E-4": 1131, "E-5": 1197,
      "E-6": 1401, "E-7": 1425, "E-8": 1650, "E-9": 1725, "W-1": 1416,
      "W-2": 1647, "W-3": 1737, "W-4": 1863, "W-5": 1881, "O-1E": 1587,
      "O-2E": 1710, "O-3E": 1860, "O-1": 1245, "O-2": 1536, "O-3": 1764,
      "O-4": 1869, "O-5": 1884, "O-6": 1887, "O-7": 1911
    }
  },

  "Hurlburt AFB": {
    base: "Hurlburt AFB",
    canonicalBase: "Hurlburt AFB",
    dutyZip: "32544",
    mhaCode: "FL056",
    mhaName: "EGLIN AFB, FL",
    with: {
      "E-1": 2340, "E-2": 2340, "E-3": 2340, "E-4": 2340, "E-5": 2433,
      "E-6": 2526, "E-7": 2841, "E-8": 3189, "E-9": 3447, "W-1": 2544,
      "W-2": 2985, "W-3": 3414, "W-4": 3456, "W-5": 3516, "O-1E": 2910,
      "O-2E": 3351, "O-3E": 3468, "O-1": 2451, "O-2": 2523, "O-3": 3399,
      "O-4": 3528, "O-5": 3612, "O-6": 3642, "O-7": 3669
    },
    without: {
      "E-1": 2007, "E-2": 2007, "E-3": 2007, "E-4": 2007, "E-5": 2157,
      "E-6": 2250, "E-7": 2340, "E-8": 2457, "E-9": 2586, "W-1": 2322,
      "W-2": 2454, "W-3": 2589, "W-4": 2604, "W-5": 2922, "O-1E": 2430,
      "O-2E": 2514, "O-3E": 2601, "O-1": 2244, "O-2": 2406, "O-3": 2592,
      "O-4": 2865, "O-5": 3066, "O-6": 3393, "O-7": 3453
    }
  },

  "Keesler AFB": {
    base: "Keesler AFB",
    canonicalBase: "Keesler AFB",
    dutyZip: "39534",
    mhaCode: "MS168",
    mhaName: "GULFPORT, MS",
    with: {
      "E-1": 1509, "E-2": 1509, "E-3": 1509, "E-4": 1509, "E-5": 1602,
      "E-6": 1620, "E-7": 1770, "E-8": 1938, "E-9": 2139, "W-1": 1635,
      "W-2": 1836, "W-3": 2046, "W-4": 2175, "W-5": 2331, "O-1E": 1800,
      "O-2E": 2016, "O-3E": 2199, "O-1": 1614, "O-2": 1617, "O-3": 2040,
      "O-4": 2379, "O-5": 2625, "O-6": 2643, "O-7": 2658
    },
    without: {
      "E-1": 1305, "E-2": 1305, "E-3": 1305, "E-4": 1305, "E-5": 1365,
      "E-6": 1416, "E-7": 1509, "E-8": 1611, "E-9": 1617, "W-1": 1488,
      "W-2": 1608, "W-3": 1620, "W-4": 1653, "W-5": 1806, "O-1E": 1599,
      "O-2E": 1614, "O-3E": 1650, "O-1": 1410, "O-2": 1575, "O-3": 1623,
      "O-4": 1785, "O-5": 1968, "O-6": 2025, "O-7": 2058
    }
  },

  "Kirtland AFB": {
    base: "Kirtland AFB",
    canonicalBase: "Kirtland AFB",
    dutyZip: "87117",
    mhaCode: "NM206",
    mhaName: "ALBUQUERQUE/KIRTLAND AFB, NM",
    with: {
      "E-1": 1992, "E-2": 1992, "E-3": 1992, "E-4": 1992, "E-5": 2211,
      "E-6": 2328, "E-7": 2352, "E-8": 2379, "E-9": 2472, "W-1": 2343,
      "W-2": 2361, "W-3": 2400, "W-4": 2502, "W-5": 2631, "O-1E": 2355,
      "O-2E": 2391, "O-3E": 2520, "O-1": 2235, "O-2": 2325, "O-3": 2397,
      "O-4": 2670, "O-5": 2871, "O-6": 2892, "O-7": 2910
    },
    without: {
      "E-1": 1557, "E-2": 1557, "E-3": 1557, "E-4": 1557, "E-5": 1689,
      "E-6": 1794, "E-7": 2001, "E-8": 2241, "E-9": 2265, "W-1": 1926,
      "W-2": 2238, "W-3": 2271, "W-4": 2325, "W-5": 2355, "O-1E": 2208,
      "O-2E": 2259, "O-3E": 2316, "O-1": 1770, "O-2": 2142, "O-3": 2280,
      "O-4": 2343, "O-5": 2358, "O-6": 2376, "O-7": 2415
    }
  },

  "Lackland AFB": {
    base: "Lackland AFB",
    canonicalBase: "Lackland AFB",
    dutyZip: "78236",
    mhaCode: "TX285",
    mhaName: "SAN ANTONIO, TX",
    with: {
      "E-1": 1728, "E-2": 1728, "E-3": 1728, "E-4": 1728, "E-5": 1869,
      "E-6": 2094, "E-7": 2112, "E-8": 2121, "E-9": 2157, "W-1": 2109,
      "W-2": 2118, "W-3": 2130, "W-4": 2178, "W-5": 2280, "O-1E": 2115,
      "O-2E": 2124, "O-3E": 2196, "O-1": 1905, "O-2": 2091, "O-3": 2127,
      "O-4": 2307, "O-5": 2457, "O-6": 2475, "O-7": 2490
    },
    without: {
      "E-1": 1359, "E-2": 1359, "E-3": 1359, "E-4": 1359, "E-5": 1500,
      "E-6": 1596, "E-7": 1731, "E-8": 1920, "E-9": 1977, "W-1": 1692,
      "W-2": 1917, "W-3": 1986, "W-4": 2085, "W-5": 2097, "O-1E": 1866,
      "O-2E": 1965, "O-3E": 2082, "O-1": 1584, "O-2": 1827, "O-3": 2007,
      "O-4": 2088, "O-5": 2100, "O-6": 2103, "O-7": 2112
    }
  },

  "Langley AFB": {
    base: "Langley AFB",
    canonicalBase: "Langley AFB",
    dutyZip: "23665",
    mhaCode: "VA297",
    mhaName: "HAMPTON/NEWPORT NEWS, VA",
    with: {
      "E-1": 2082, "E-2": 2082, "E-3": 2082, "E-4": 2082, "E-5": 2274,
      "E-6": 2421, "E-7": 2439, "E-8": 2457, "E-9": 2571, "W-1": 2436,
      "W-2": 2445, "W-3": 2478, "W-4": 2610, "W-5": 2778, "O-1E": 2442,
      "O-2E": 2466, "O-3E": 2637, "O-1": 2301, "O-2": 2418, "O-3": 2475,
      "O-4": 2835, "O-5": 3099, "O-6": 3123, "O-7": 3144
    },
    without: {
      "E-1": 1599, "E-2": 1599, "E-3": 1599, "E-4": 1599, "E-5": 1779,
      "E-6": 1905, "E-7": 2088, "E-8": 2310, "E-9": 2343, "W-1": 2022,
      "W-2": 2307, "W-3": 2349, "W-4": 2415, "W-5": 2439, "O-1E": 2271,
      "O-2E": 2334, "O-3E": 2409, "O-1": 1884, "O-2": 2214, "O-3": 2361,
      "O-4": 2427, "O-5": 2442, "O-6": 2451, "O-7": 2493
    }
  },

  "Laughlin AFB": {
    base: "Laughlin AFB",
    canonicalBase: "Laughlin AFB",
    dutyZip: "78843",
    mhaCode: "TX278",
    mhaName: "LAUGHLIN AFB/DEL RIO, TX",
    with: {
      "E-1": 1371, "E-2": 1371, "E-3": 1371, "E-4": 1371, "E-5": 1470,
      "E-6": 1704, "E-7": 1854, "E-8": 2019, "E-9": 2238, "W-1": 1722,
      "W-2": 1923, "W-3": 2127, "W-4": 2280, "W-5": 2466, "O-1E": 1884,
      "O-2E": 2097, "O-3E": 2307, "O-1": 1506, "O-2": 1701, "O-3": 2121,
      "O-4": 2526, "O-5": 2820, "O-6": 2841, "O-7": 2859
    },
    without: {
      "E-1": 1110, "E-2": 1110, "E-3": 1110, "E-4": 1110, "E-5": 1209,
      "E-6": 1275, "E-7": 1392, "E-8": 1521, "E-9": 1680, "W-1": 1350,
      "W-2": 1518, "W-3": 1683, "W-4": 1734, "W-5": 1899, "O-1E": 1467,
      "O-2E": 1572, "O-3E": 1731, "O-1": 1269, "O-2": 1440, "O-3": 1686,
      "O-4": 1896, "O-5": 2115, "O-6": 2130, "O-7": 2145
    }
  },

  "Little-Rock AFB": {
    base: "Little-Rock AFB",
    canonicalBase: "Little-Rock AFB",
    dutyZip: "72099",
    mhaCode: "AR010",
    mhaName: "LITTLE ROCK, AR",
    with: {
      "E-1": 1758, "E-2": 1758, "E-3": 1758, "E-4": 1758, "E-5": 1848,
      "E-6": 1941, "E-7": 1959, "E-8": 1968, "E-9": 2061, "W-1": 1956,
      "W-2": 1965, "W-3": 1977, "W-4": 2100, "W-5": 2274, "O-1E": 1962,
      "O-2E": 1971, "O-3E": 2127, "O-1": 1869, "O-2": 1938, "O-3": 1974,
      "O-4": 2328, "O-5": 2598, "O-6": 2619, "O-7": 2634
    },
    without: {
      "E-1": 1341, "E-2": 1341, "E-3": 1341, "E-4": 1341, "E-5": 1548,
      "E-6": 1671, "E-7": 1758, "E-8": 1875, "E-9": 1887, "W-1": 1740,
      "W-2": 1872, "W-3": 1893, "W-4": 1932, "W-5": 1947, "O-1E": 1845,
      "O-2E": 1884, "O-3E": 1929, "O-1": 1665, "O-2": 1824, "O-3": 1902,
      "O-4": 1935, "O-5": 1950, "O-6": 1965, "O-7": 1977
    }
  },

  "Luke AFB": {
    base: "Luke AFB",
    canonicalBase: "Luke AFB",
    dutyZip: "85309",
    mhaCode: "AZ013",
    mhaName: "PHOENIX, AZ",
    with: {
      "E-1": 2061, "E-2": 2061, "E-3": 2061, "E-4": 2061, "E-5": 2289,
      "E-6": 2457, "E-7": 2475, "E-8": 2484, "E-9": 2517, "W-1": 2472,
      "W-2": 2481, "W-3": 2493, "W-4": 2535, "W-5": 2622, "O-1E": 2478,
      "O-2E": 2487, "O-3E": 2547, "O-1": 2319, "O-2": 2454, "O-3": 2490,
      "O-4": 2646, "O-5": 2775, "O-6": 2796, "O-7": 2814
    },
    without: {
      "E-1": 1587, "E-2": 1587, "E-3": 1587, "E-4": 1587, "E-5": 1740,
      "E-6": 1857, "E-7": 2070, "E-8": 2331, "E-9": 2367, "W-1": 1992,
      "W-2": 2328, "W-3": 2376, "W-4": 2448, "W-5": 2460, "O-1E": 2286,
      "O-2E": 2358, "O-3E": 2445, "O-1": 1830, "O-2": 2217, "O-3": 2391,
      "O-4": 2451, "O-5": 2463, "O-6": 2466, "O-7": 2487
    }
  },

  "MacDill AFB": {
    base: "MacDill AFB",
    canonicalBase: "MacDill AFB",
    dutyZip: "33621",
    mhaCode: "FL066",
    mhaName: "TAMPA, FL",
    with: {
      "E-1": 2520, "E-2": 2520, "E-3": 2520, "E-4": 2520, "E-5": 2709,
      "E-6": 3042, "E-7": 3066, "E-8": 3075, "E-9": 3123, "W-1": 3063,
      "W-2": 3072, "W-3": 3084, "W-4": 3141, "W-5": 3231, "O-1E": 3069,
      "O-2E": 3078, "O-3E": 3156, "O-1": 2757, "O-2": 3039, "O-3": 3081,
      "O-4": 3255, "O-5": 3390, "O-6": 3417, "O-7": 3441
    },
    without: {
      "E-1": 1932, "E-2": 1932, "E-3": 1932, "E-4": 1932, "E-5": 2187,
      "E-6": 2346, "E-7": 2526, "E-8": 2781, "E-9": 2874, "W-1": 2463,
      "W-2": 2778, "W-3": 2886, "W-4": 3039, "W-5": 3054, "O-1E": 2706,
      "O-2E": 2853, "O-3E": 3036, "O-1": 2328, "O-2": 2649, "O-3": 2919,
      "O-4": 3042, "O-5": 3057, "O-6": 3060, "O-7": 3102
    }
  },

  "Malmstrom AFB": {
    base: "Malmstrom AFB",
    canonicalBase: "Malmstrom AFB",
    dutyZip: "59402",
    mhaCode: "MT175",
    mhaName: "MALMSTROM SFB/GREAT FALLS, MT",
    with: {
      "E-1": 1539, "E-2": 1539, "E-3": 1539, "E-4": 1539, "E-5": 1608,
      "E-6": 1821, "E-7": 1980, "E-8": 2160, "E-9": 2346, "W-1": 1839,
      "W-2": 2052, "W-3": 2274, "W-4": 2373, "W-5": 2496, "O-1E": 2013,
      "O-2E": 2241, "O-3E": 2391, "O-1": 1641, "O-2": 1818, "O-3": 2268,
      "O-4": 2532, "O-5": 2724, "O-6": 2745, "O-7": 2760
    },
    without: {
      "E-1": 1266, "E-2": 1266, "E-3": 1266, "E-4": 1266, "E-5": 1392,
      "E-6": 1470, "E-7": 1539, "E-8": 1656, "E-9": 1761, "W-1": 1530,
      "W-2": 1653, "W-3": 1764, "W-4": 1851, "W-5": 2022, "O-1E": 1605,
      "O-2E": 1698, "O-3E": 1809, "O-1": 1467, "O-2": 1590, "O-3": 1767,
      "O-4": 1989, "O-5": 2088, "O-6": 2253, "O-7": 2289
    }
  },

  "Maxwell AFB": {
    base: "Maxwell AFB",
    canonicalBase: "Maxwell AFB",
    dutyZip: "36112",
    mhaCode: "AL005",
    mhaName: "MONTGOMERY, AL",
    with: {
      "E-1": 1605, "E-2": 1605, "E-3": 1605, "E-4": 1605, "E-5": 1683,
      "E-6": 1758, "E-7": 1818, "E-8": 1887, "E-9": 2034, "W-1": 1773,
      "W-2": 1845, "W-3": 1935, "W-4": 2073, "W-5": 2244, "O-1E": 1827,
      "O-2E": 1920, "O-3E": 2100, "O-1": 1701, "O-2": 1755, "O-3": 1932,
      "O-4": 2298, "O-5": 2565, "O-6": 2583, "O-7": 2598
    },
    without: {
      "E-1": 1269, "E-2": 1269, "E-3": 1269, "E-4": 1269, "E-5": 1431,
      "E-6": 1527, "E-7": 1605, "E-8": 1704, "E-9": 1713, "W-1": 1590,
      "W-2": 1701, "W-3": 1719, "W-4": 1764, "W-5": 1833, "O-1E": 1680,
      "O-2E": 1710, "O-3E": 1746, "O-1": 1524, "O-2": 1662, "O-3": 1725,
      "O-4": 1815, "O-5": 1923, "O-6": 1938, "O-7": 1950
    }
  },

  "McConnell AFB": {
    base: "McConnell AFB",
    canonicalBase: "McConnell AFB",
    dutyZip: "67221",
    mhaCode: "KS101",
    mhaName: "WICHITA/MCCONNELL AFB, KS",
    with: {
      "E-1": 1320, "E-2": 1320, "E-3": 1320, "E-4": 1320, "E-5": 1377,
      "E-6": 1689, "E-7": 1779, "E-8": 1878, "E-9": 2022, "W-1": 1710,
      "W-2": 1821, "W-3": 1941, "W-4": 2052, "W-5": 2190, "O-1E": 1797,
      "O-2E": 1923, "O-3E": 2073, "O-1": 1422, "O-2": 1686, "O-3": 1938,
      "O-4": 2232, "O-5": 2445, "O-6": 2463, "O-7": 2478
    },
    without: {
      "E-1": 1137, "E-2": 1137, "E-3": 1137, "E-4": 1137, "E-5": 1212,
      "E-6": 1266, "E-7": 1335, "E-8": 1443, "E-9": 1530, "W-1": 1317,
      "W-2": 1440, "W-3": 1545, "W-4": 1707, "W-5": 1800, "O-1E": 1374,
      "O-2E": 1512, "O-3E": 1683, "O-1": 1263, "O-2": 1362, "O-3": 1572,
      "O-4": 1779, "O-5": 1833, "O-6": 1920, "O-7": 1950
    }
  },

  "McGuire AFB": {
    base: "McGuire AFB",
    canonicalBase: "McGuire AFB",
    dutyZip: "08641",
    mhaCode: "NJ204",
    mhaName: "JB MCGUIRE-DIX-LAKEHURST, NJ",
    with: {
      "E-1": 2715, "E-2": 2715, "E-3": 2715, "E-4": 2715, "E-5": 2823,
      "E-6": 3444, "E-7": 3486, "E-8": 3525, "E-9": 3642, "W-1": 3465,
      "W-2": 3501, "W-3": 3555, "W-4": 3678, "W-5": 3831, "O-1E": 3489,
      "O-2E": 3543, "O-3E": 3702, "O-1": 2904, "O-2": 3438, "O-3": 3552,
      "O-4": 3882, "O-5": 4122, "O-6": 4155, "O-7": 4188
    },
    without: {
      "E-1": 2085, "E-2": 2085, "E-3": 2085, "E-4": 2085, "E-5": 2421,
      "E-6": 2610, "E-7": 2715, "E-8": 2952, "E-9": 3135, "W-1": 2691,
      "W-2": 2949, "W-3": 3159, "W-4": 3450, "W-5": 3492, "O-1E": 2820,
      "O-2E": 3096, "O-3E": 3438, "O-1": 2604, "O-2": 2793, "O-3": 3219,
      "O-4": 3477, "O-5": 3495, "O-6": 3531, "O-7": 3594
    }
  },

  "Minot AFB": {
    base: "Minot AFB",
    canonicalBase: "Minot AFB",
    dutyZip: "58705",
    mhaCode: "ND191",
    mhaName: "MINOT AFB, ND",
    with: {
      "E-1": 1428, "E-2": 1428, "E-3": 1428, "E-4": 1428, "E-5": 1548,
      "E-6": 1980, "E-7": 2052, "E-8": 2127, "E-9": 2229, "W-1": 2001,
      "W-2": 2082, "W-3": 2178, "W-4": 2247, "W-5": 2343, "O-1E": 2064,
      "O-2E": 2163, "O-3E": 2262, "O-1": 1605, "O-2": 1977, "O-3": 2175,
      "O-4": 2367, "O-5": 2508, "O-6": 2526, "O-7": 2541
    },
    without: {
      "E-1": 1206, "E-2": 1206, "E-3": 1206, "E-4": 1206, "E-5": 1260,
      "E-6": 1485, "E-7": 1539, "E-8": 1638, "E-9": 1764, "W-1": 1503,
      "W-2": 1635, "W-3": 1782, "W-4": 1995, "W-5": 2067, "O-1E": 1548,
      "O-2E": 1737, "O-3E": 1974, "O-1": 1302, "O-2": 1542, "O-3": 1824,
      "O-4": 2049, "O-5": 2088, "O-6": 2154, "O-7": 2190
    }
  },

  "Moody AFB": {
    base: "Moody AFB",
    canonicalBase: "Moody AFB",
    dutyZip: "31699",
    mhaCode: "GA081",
    mhaName: "MOODY AFB, GA",
    with: {
      "E-1": 1503, "E-2": 1503, "E-3": 1503, "E-4": 1503, "E-5": 1524,
      "E-6": 1917, "E-7": 1950, "E-8": 1980, "E-9": 2097, "W-1": 1938,
      "W-2": 1962, "W-3": 2007, "W-4": 2130, "W-5": 2289, "O-1E": 1953,
      "O-2E": 1995, "O-3E": 2157, "O-1": 1578, "O-2": 1914, "O-3": 2004,
      "O-4": 2340, "O-5": 2589, "O-6": 2607, "O-7": 2622
    },
    without: {
      "E-1": 1320, "E-2": 1320, "E-3": 1320, "E-4": 1320, "E-5": 1416,
      "E-6": 1479, "E-7": 1512, "E-8": 1608, "E-9": 1722, "W-1": 1509,
      "W-2": 1605, "W-3": 1737, "W-4": 1920, "W-5": 1956, "O-1E": 1524,
      "O-2E": 1695, "O-3E": 1911, "O-1": 1476, "O-2": 1521, "O-3": 1773,
      "O-4": 1941, "O-5": 1959, "O-6": 1980, "O-7": 2013
    }
  },

  "Mountain-Home AFB": {
    base: "Mountain-Home AFB",
    canonicalBase: "Mountain-Home AFB",
    dutyZip: "83648",
    mhaCode: "ID086",
    mhaName: "MOUNTAIN HOME AFB, ID",
    with: {
      "E-1": 1563, "E-2": 1563, "E-3": 1563, "E-4": 1563, "E-5": 1605,
      "E-6": 2187, "E-7": 2238, "E-8": 2292, "E-9": 2418, "W-1": 2208,
      "W-2": 2259, "W-3": 2328, "W-4": 2451, "W-5": 2610, "O-1E": 2244,
      "O-2E": 2316, "O-3E": 2478, "O-1": 1680, "O-2": 2181, "O-3": 2325,
      "O-4": 2658, "O-5": 2901, "O-6": 2925, "O-7": 2943
    },
    without: {
      "E-1": 1521, "E-2": 1521, "E-3": 1521, "E-4": 1521, "E-5": 1524,
      "E-6": 1641, "E-7": 1680, "E-8": 1725, "E-9": 1899, "W-1": 1656,
      "W-2": 1722, "W-3": 1920, "W-4": 2196, "W-5": 2250, "O-1E": 1686,
      "O-2E": 1860, "O-3E": 2181, "O-1": 1527, "O-2": 1683, "O-3": 1977,
      "O-4": 2232, "O-5": 2259, "O-6": 2304, "O-7": 2343
    }
  },

  "Nellis AFB": {
    base: "Nellis AFB",
    canonicalBase: "Nellis AFB",
    dutyZip: "89191",
    mhaCode: "NV212",
    mhaName: "NELLIS AFB/LAS VEGAS, NV",
    with: {
      "E-1": 1941, "E-2": 1941, "E-3": 1941, "E-4": 1941, "E-5": 2070,
      "E-6": 2208, "E-7": 2268, "E-8": 2337, "E-9": 2445, "W-1": 2223,
      "W-2": 2298, "W-3": 2385, "W-4": 2469, "W-5": 2577, "O-1E": 2277,
      "O-2E": 2370, "O-3E": 2487, "O-1": 2094, "O-2": 2205, "O-3": 2382,
      "O-4": 2610, "O-5": 2775, "O-6": 2796, "O-7": 2814
    },
    without: {
      "E-1": 1629, "E-2": 1629, "E-3": 1629, "E-4": 1629, "E-5": 1737,
      "E-6": 1818, "E-7": 1941, "E-8": 2103, "E-9": 2133, "W-1": 1908,
      "W-2": 2100, "W-3": 2139, "W-4": 2214, "W-5": 2283, "O-1E": 2067,
      "O-2E": 2127, "O-3E": 2196, "O-1": 1806, "O-2": 2031, "O-3": 2151,
      "O-4": 2265, "O-5": 2301, "O-6": 2361, "O-7": 2400
    }
  },

  "Offutt AFB": {
    base: "Offutt AFB",
    canonicalBase: "Offutt AFB",
    dutyZip: "68113",
    mhaCode: "NE192",
    mhaName: "OMAHA/OFFUTT AFB, NE",
    with: {
      "E-1": 1887, "E-2": 1887, "E-3": 1887, "E-4": 1887, "E-5": 2085,
      "E-6": 2376, "E-7": 2457, "E-8": 2547, "E-9": 2706, "W-1": 2394,
      "W-2": 2493, "W-3": 2604, "W-4": 2742, "W-5": 2913, "O-1E": 2472,
      "O-2E": 2586, "O-3E": 2769, "O-1": 2127, "O-2": 2373, "O-3": 2601,
      "O-4": 2967, "O-5": 3231, "O-6": 3258, "O-7": 3279
    },
    without: {
      "E-1": 1425, "E-2": 1425, "E-3": 1425, "E-4": 1425, "E-5": 1587,
      "E-6": 1779, "E-7": 1893, "E-8": 2148, "E-9": 2229, "W-1": 1827,
      "W-2": 2145, "W-3": 2241, "W-4": 2388, "W-5": 2475, "O-1E": 2082,
      "O-2E": 2211, "O-3E": 2367, "O-1": 1683, "O-2": 2022, "O-3": 2268,
      "O-4": 2454, "O-5": 2502, "O-6": 2583, "O-7": 2625
    }
  },

  "Peterson AFB": {
    base: "Peterson AFB",
    canonicalBase: "Peterson AFB",
    dutyZip: "80914",
    mhaCode: "CO046",
    mhaName: "COLORADO SPRINGS, CO",
    with: {
      "E-1": 2160, "E-2": 2160, "E-3": 2160, "E-4": 2160, "E-5": 2358,
      "E-6": 2433, "E-7": 2487, "E-8": 2553, "E-9": 2646, "W-1": 2448,
      "W-2": 2514, "W-3": 2598, "W-4": 2664, "W-5": 2754, "O-1E": 2496,
      "O-2E": 2583, "O-3E": 2679, "O-1": 2376, "O-2": 2430, "O-3": 2595,
      "O-4": 2778, "O-5": 2913, "O-6": 2934, "O-7": 2955
    },
    without: {
      "E-1": 1689, "E-2": 1689, "E-3": 1689, "E-4": 1689, "E-5": 1860,
      "E-6": 1980, "E-7": 2166, "E-8": 2379, "E-9": 2388, "W-1": 2103,
      "W-2": 2376, "W-3": 2394, "W-4": 2436, "W-5": 2502, "O-1E": 2355,
      "O-2E": 2385, "O-3E": 2418, "O-1": 1959, "O-2": 2295, "O-3": 2397,
      "O-4": 2484, "O-5": 2517, "O-6": 2574, "O-7": 2616
    }
  },

  "Randolph AFB": {
    base: "Randolph AFB",
    canonicalBase: "Randolph AFB",
    dutyZip: "78150",
    mhaCode: "TX285",
    mhaName: "SAN ANTONIO, TX",
    with: {
      "E-1": 1728, "E-2": 1728, "E-3": 1728, "E-4": 1728, "E-5": 1869,
      "E-6": 2094, "E-7": 2112, "E-8": 2121, "E-9": 2157, "W-1": 2109,
      "W-2": 2118, "W-3": 2130, "W-4": 2178, "W-5": 2280, "O-1E": 2115,
      "O-2E": 2124, "O-3E": 2196, "O-1": 1905, "O-2": 2091, "O-3": 2127,
      "O-4": 2307, "O-5": 2457, "O-6": 2475, "O-7": 2490
    },
    without: {
      "E-1": 1359, "E-2": 1359, "E-3": 1359, "E-4": 1359, "E-5": 1500,
      "E-6": 1596, "E-7": 1731, "E-8": 1920, "E-9": 1977, "W-1": 1692,
      "W-2": 1917, "W-3": 1986, "W-4": 2085, "W-5": 2097, "O-1E": 1866,
      "O-2E": 1965, "O-3E": 2082, "O-1": 1584, "O-2": 1827, "O-3": 2007,
      "O-4": 2088, "O-5": 2100, "O-6": 2103, "O-7": 2112
    }
  },

  "Robins AFB": {
    base: "Robins AFB",
    canonicalBase: "Robins AFB",
    dutyZip: "31098",
    mhaCode: "GA076",
    mhaName: "ROBINS AFB, GA",
    with: {
      "E-1": 1692, "E-2": 1692, "E-3": 1692, "E-4": 1692, "E-5": 1800,
      "E-6": 1878, "E-7": 1992, "E-8": 2118, "E-9": 2283, "W-1": 1893,
      "W-2": 2043, "W-3": 2202, "W-4": 2313, "W-5": 2451, "O-1E": 2013,
      "O-2E": 2178, "O-3E": 2334, "O-1": 1818, "O-2": 1875, "O-3": 2199,
      "O-4": 2496, "O-5": 2709, "O-6": 2730, "O-7": 2745
    },
    without: {
      "E-1": 1341, "E-2": 1341, "E-3": 1341, "E-4": 1341, "E-5": 1491,
      "E-6": 1590, "E-7": 1695, "E-8": 1824, "E-9": 1833, "W-1": 1668,
      "W-2": 1821, "W-3": 1839, "W-4": 1896, "W-5": 2019, "O-1E": 1797,
      "O-2E": 1830, "O-3E": 1866, "O-1": 1581, "O-2": 1770, "O-3": 1842,
      "O-4": 1992, "O-5": 2064, "O-6": 2181, "O-7": 2217
    }
  },

  "Scott AFB": {
    base: "Scott AFB",
    canonicalBase: "Scott AFB",
    dutyZip: "62225",
    mhaCode: "IL093",
    mhaName: "SCOTT AFB, IL",
    with: {
      "E-1": 1536, "E-2": 1536, "E-3": 1536, "E-4": 1536, "E-5": 1542,
      "E-6": 1998, "E-7": 2076, "E-8": 2157, "E-9": 2325, "W-1": 2019,
      "W-2": 2109, "W-3": 2211, "W-4": 2367, "W-5": 2562, "O-1E": 2088,
      "O-2E": 2193, "O-3E": 2397, "O-1": 1602, "O-2": 1995, "O-3": 2208,
      "O-4": 2625, "O-5": 2928, "O-6": 2952, "O-7": 2970
    },
    without: {
      "E-1": 1233, "E-2": 1233, "E-3": 1233, "E-4": 1233, "E-5": 1422,
      "E-6": 1530, "E-7": 1557, "E-8": 1638, "E-9": 1770, "W-1": 1551,
      "W-2": 1635, "W-3": 1788, "W-4": 2013, "W-5": 2094, "O-1E": 1566,
      "O-2E": 1740, "O-3E": 1992, "O-1": 1527, "O-2": 1560, "O-3": 1830,
      "O-4": 2073, "O-5": 2196, "O-6": 2214, "O-7": 2229
    }
  },

  "Seymour-Johnson AFB": {
    base: "Seymour-Johnson AFB",
    canonicalBase: "Seymour-Johnson AFB",
    dutyZip: "27531",
    mhaCode: "NC183",
    mhaName: "SEYMOUR JOHNSON AFB, NC",
    with: {
      "E-1": 1500, "E-2": 1500, "E-3": 1500, "E-4": 1500, "E-5": 1521,
      "E-6": 1950, "E-7": 2052, "E-8": 2160, "E-9": 2295, "W-1": 1971,
      "W-2": 2094, "W-3": 2229, "W-4": 2322, "W-5": 2436, "O-1E": 2067,
      "O-2E": 2208, "O-3E": 2340, "O-1": 1578, "O-2": 1947, "O-3": 2226,
      "O-4": 2472, "O-5": 2649, "O-6": 2667, "O-7": 2685
    },
    without: {
      "E-1": 1365, "E-2": 1365, "E-3": 1365, "E-4": 1365, "E-5": 1428,
      "E-6": 1479, "E-7": 1539, "E-8": 1620, "E-9": 1734, "W-1": 1509,
      "W-2": 1608, "W-3": 1752, "W-4": 1968, "W-5": 2073, "O-1E": 1551,
      "O-2E": 1707, "O-3E": 1944, "O-1": 1476, "O-2": 1542, "O-3": 1794,
      "O-4": 2052, "O-5": 2109, "O-6": 2208, "O-7": 2244
    }
  },

  "Shaw AFB": {
    base: "Shaw AFB",
    canonicalBase: "Shaw AFB",
    dutyZip: "29152",
    mhaCode: "SC263",
    mhaName: "SUMTER/SHAW AFB, SC",
    with: {
      "E-1": 1440, "E-2": 1440, "E-3": 1440, "E-4": 1440, "E-5": 1503,
      "E-6": 1947, "E-7": 1986, "E-8": 2025, "E-9": 2139, "W-1": 1968,
      "W-2": 2001, "W-3": 2055, "W-4": 2169, "W-5": 2316, "O-1E": 1989,
      "O-2E": 2043, "O-3E": 2193, "O-1": 1563, "O-2": 1944, "O-3": 2052,
      "O-4": 2361, "O-5": 2589, "O-6": 2607, "O-7": 2625
    },
    without: {
      "E-1": 1149, "E-2": 1149, "E-3": 1149, "E-4": 1149, "E-5": 1290,
      "E-6": 1461, "E-7": 1491, "E-8": 1596, "E-9": 1725, "W-1": 1476,
      "W-2": 1593, "W-3": 1743, "W-4": 1953, "W-5": 1995, "O-1E": 1500,
      "O-2E": 1695, "O-3E": 1941, "O-1": 1374, "O-2": 1494, "O-3": 1785,
      "O-4": 1980, "O-5": 1998, "O-6": 2031, "O-7": 2064
    }
  },

  "Sheppard AFB": {
    base: "Sheppard AFB",
    canonicalBase: "Sheppard AFB",
    dutyZip: "76311",
    mhaCode: "TX288",
    mhaName: "WICHITA FLS/SHEPPARD AFB, TX",
    with: {
      "E-1": 1392, "E-2": 1392, "E-3": 1392, "E-4": 1392, "E-5": 1491,
      "E-6": 2112, "E-7": 2190, "E-8": 2271, "E-9": 2427, "W-1": 2133,
      "W-2": 2223, "W-3": 2328, "W-4": 2463, "W-5": 2634, "O-1E": 2202,
      "O-2E": 2310, "O-3E": 2490, "O-1": 1572, "O-2": 2106, "O-3": 2325,
      "O-4": 2691, "O-5": 2955, "O-6": 2979, "O-7": 2997
    },
    without: {
      "E-1": 1044, "E-2": 1044, "E-3": 1044, "E-4": 1044, "E-5": 1182,
      "E-6": 1584, "E-7": 1644, "E-8": 1704, "E-9": 1821, "W-1": 1602,
      "W-2": 1668, "W-3": 1827, "W-4": 2127, "W-5": 2208, "O-1E": 1653,
      "O-2E": 1764, "O-3E": 2106, "O-1": 1290, "O-2": 1647, "O-3": 1887,
      "O-4": 2187, "O-5": 2229, "O-6": 2304, "O-7": 2343
    }
  },

  "Tinker AFB": {
    base: "Tinker AFB",
    canonicalBase: "Tinker AFB",
    dutyZip: "73145",
    mhaCode: "OK239",
    mhaName: "OKLAHOMA CITY, OK",
    with: {
      "E-1": 1542, "E-2": 1542, "E-3": 1542, "E-4": 1542, "E-5": 1644,
      "E-6": 1854, "E-7": 1896, "E-8": 1944, "E-9": 2034, "W-1": 1869,
      "W-2": 1914, "W-3": 1977, "W-4": 2055, "W-5": 2157, "O-1E": 1902,
      "O-2E": 1965, "O-3E": 2070, "O-1": 1677, "O-2": 1851, "O-3": 1974,
      "O-4": 2184, "O-5": 2337, "O-6": 2355, "O-7": 2367
    },
    without: {
      "E-1": 1248, "E-2": 1248, "E-3": 1248, "E-4": 1248, "E-5": 1365,
      "E-6": 1443, "E-7": 1542, "E-8": 1692, "E-9": 1743, "W-1": 1518,
      "W-2": 1689, "W-3": 1752, "W-4": 1854, "W-5": 1905, "O-1E": 1641,
      "O-2E": 1731, "O-3E": 1842, "O-1": 1434, "O-2": 1614, "O-3": 1773,
      "O-4": 1890, "O-5": 1911, "O-6": 1953, "O-7": 1986
    }
  },

  "Travis AFB": {
    base: "Travis AFB",
    canonicalBase: "Travis AFB",
    dutyZip: "94535",
    mhaCode: "CA036",
    mhaName: "VALLEJO/TRAVIS AFB, CA",
    with: {
      "E-1": 3090, "E-2": 3090, "E-3": 3090, "E-4": 3090, "E-5": 3369,
      "E-6": 3498, "E-7": 3516, "E-8": 3525, "E-9": 3597, "W-1": 3513,
      "W-2": 3522, "W-3": 3540, "W-4": 3621, "W-5": 3729, "O-1E": 3519,
      "O-2E": 3531, "O-3E": 3636, "O-1": 3393, "O-2": 3495, "O-3": 3537,
      "O-4": 3762, "O-5": 3927, "O-6": 3960, "O-7": 3987
    },
    without: {
      "E-1": 2412, "E-2": 2412, "E-3": 2412, "E-4": 2412, "E-5": 2664,
      "E-6": 2838, "E-7": 3099, "E-8": 3402, "E-9": 3426, "W-1": 2997,
      "W-2": 3399, "W-3": 3435, "W-4": 3489, "W-5": 3510, "O-1E": 3366,
      "O-2E": 3420, "O-3E": 3486, "O-1": 2805, "O-2": 3279, "O-3": 3444,
      "O-4": 3498, "O-5": 3513, "O-6": 3516, "O-7": 3576
    }
  },

  "Tyndall AFB": {
    base: "Tyndall AFB",
    canonicalBase: "Tyndall AFB",
    dutyZip: "32403",
    mhaCode: "FL063",
    mhaName: "PANAMA CITY, FL",
    with: {
      "E-1": 2058, "E-2": 2058, "E-3": 2058, "E-4": 2058, "E-5": 2163,
      "E-6": 2442, "E-7": 2538, "E-8": 2643, "E-9": 2766, "W-1": 2460,
      "W-2": 2580, "W-3": 2712, "W-4": 2787, "W-5": 2886, "O-1E": 2556,
      "O-2E": 2691, "O-3E": 2802, "O-1": 2202, "O-2": 2439, "O-3": 2709,
      "O-4": 2913, "O-5": 3060, "O-6": 3084, "O-7": 3105
    },
    without: {
      "E-1": 1713, "E-2": 1713, "E-3": 1713, "E-4": 1713, "E-5": 1863,
      "E-6": 1959, "E-7": 2058, "E-8": 2223, "E-9": 2298, "W-1": 2037,
      "W-2": 2220, "W-3": 2310, "W-4": 2460, "W-5": 2562, "O-1E": 2160,
      "O-2E": 2280, "O-3E": 2433, "O-1": 1953, "O-2": 2133, "O-3": 2337,
      "O-4": 2538, "O-5": 2595, "O-6": 2691, "O-7": 2736
    }
  },

  "Whiteman AFB": {
    base: "Whiteman AFB",
    canonicalBase: "Whiteman AFB",
    dutyZip: "65305",
    mhaCode: "MO162",
    mhaName: "WHITEMAN AFB, MO",
    with: {
      "E-1": 1449, "E-2": 1449, "E-3": 1449, "E-4": 1449, "E-5": 1611,
      "E-6": 1929, "E-7": 2043, "E-8": 2166, "E-9": 2322, "W-1": 1950,
      "W-2": 2094, "W-3": 2247, "W-4": 2349, "W-5": 2478, "O-1E": 2064,
      "O-2E": 2223, "O-3E": 2370, "O-1": 1656, "O-2": 1926, "O-3": 2244,
      "O-4": 2517, "O-5": 2715, "O-6": 2736, "O-7": 2751
    },
    without: {
      "E-1": 1110, "E-2": 1110, "E-3": 1110, "E-4": 1110, "E-5": 1215,
      "E-6": 1446, "E-7": 1533, "E-8": 1680, "E-9": 1767, "W-1": 1464,
      "W-2": 1677, "W-3": 1782, "W-4": 1953, "W-5": 2070, "O-1E": 1608,
      "O-2E": 1749, "O-3E": 1923, "O-1": 1281, "O-2": 1560, "O-3": 1812,
      "O-4": 2046, "O-5": 2112, "O-6": 2226, "O-7": 2262
    }
  },

  "Wright-Patterson AFB": {
    base: "Wright-Patterson AFB",
    canonicalBase: "Wright-Patterson AFB",
    dutyZip: "45433",
    mhaCode: "OH231",
    mhaName: "WRIGHT-PATTERSON AFB, OH",
    with: {
      "E-1": 1533, "E-2": 1533, "E-3": 1533, "E-4": 1533, "E-5": 1650,
      "E-6": 1851, "E-7": 1938, "E-8": 2037, "E-9": 2196, "W-1": 1866,
      "W-2": 1977, "W-3": 2100, "W-4": 2232, "W-5": 2397, "O-1E": 1953,
      "O-2E": 2082, "O-3E": 2259, "O-1": 1683, "O-2": 1848, "O-3": 2097,
      "O-4": 2448, "O-5": 2703, "O-6": 2724, "O-7": 2742
    },
    without: {
      "E-1": 1224, "E-2": 1224, "E-3": 1224, "E-4": 1224, "E-5": 1341,
      "E-6": 1422, "E-7": 1536, "E-8": 1695, "E-9": 1746, "W-1": 1506,
      "W-2": 1692, "W-3": 1755, "W-4": 1863, "W-5": 1959, "O-1E": 1647,
      "O-2E": 1734, "O-3E": 1839, "O-1": 1413, "O-2": 1614, "O-3": 1773,
      "O-4": 1938, "O-5": 2028, "O-6": 2079, "O-7": 2112
    }
  }

});

// ============================================================
// //#4) LOOKUPS
// ============================================================

export function getDutyZip(baseOrZip) {
  const canonicalBase = canonicalizeBase(baseOrZip);
  const zip = BASE_TO_ZIP[canonicalBase];

  if (!zip) {
    throw new Error(`No duty ZIP found for base "${baseOrZip}".`);
  }

  return zip;
}

export function getBaseRecord(baseOrZip) {
  const canonicalBase = canonicalizeBase(baseOrZip);
  const record = BAH_2026_BY_BASE[canonicalBase];

  if (!record) {
    throw new Error(`No BAH record found for base "${baseOrZip}".`);
  }

  return record;
}

export function getBahRecord(baseOrZip, rank, dependents) {
  const record = getBaseRecord(baseOrZip);
  const rankKey = assertSupportedRank(rank);
  const depKey = normalizeDependents(dependents);
  const bah = Number(record[depKey]?.[rankKey]);

  if (!Number.isFinite(bah)) {
    throw new Error(
      `No BAH value found for base "${record.base}", rank "${rankKey}", dependents "${depKey}".`
    );
  }

  return {
    base: record.base,
    canonicalBase: record.canonicalBase || record.base,
    dutyZip: record.dutyZip,
    zip: record.dutyZip,
    mhaCode: record.mhaCode,
    mhaName: record.mhaName,
    rank: rankKey,
    dependents: depKey,
    bah,
    monthlyBAH: bah,
    rateVersion: RATE_VERSION
  };
}

export function getBAH(baseOrZip, rank, dependents) {
  return getBahRecord(baseOrZip, rank, dependents).bah;
}

export function listSupportedBases() {
  return Object.freeze(Object.keys(BAH_2026_BY_BASE));
}

export function listSupportedZips() {
  return Object.freeze(Object.keys(ZIP_TO_BASE));
}

// ============================================================
// //#5) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  RATE_VERSION,
  SUPPORTED_RANKS,
  RATE_COLUMNS,
  BASE_ALIASES,
  BASE_TO_ZIP,
  ZIP_TO_BASE,
  BASE_TO_MHA,
  BAH_2026_BY_BASE,
  normalizeString,
  normalizeRank,
  normalizeDependents,
  canonicalizeBase,
  getDutyZip,
  assertSupportedRank,
  getBaseRecord,
  getBahRecord,
  getBAH,
  listSupportedBases,
  listSupportedZips
});
