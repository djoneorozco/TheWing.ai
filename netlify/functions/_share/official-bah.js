// official-bah.js
// ============================================================
// TheWing.ai • Official BAH Source
// v1.0.0
//
// FILE
// - netlify/functions/_share/official-bah.js
//
// PURPOSE
// - Single source of truth for 2026 official BAH
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
// MODULE STYLE
// - ES Module exports for Netlify Functions with "type": "module"
// ============================================================

export const RATE_VERSION = "official-bah-2026.1";

export const SUPPORTED_RANKS = Object.freeze([
  "E-1","E-2","E-3","E-4","E-5","E-6","E-7","E-8","E-9",
  "W-1","W-2","W-3","W-4","W-5",
  "O-1E","O-2E","O-3E",
  "O-1","O-2","O-3","O-4","O-5","O-6","O-7"
]);

// ============================================================
// //#1) HELPERS
// ============================================================
export function normalizeString(value) {
  return String(value || "").trim();
}

export function normalizeRank(rank) {
  const s = String(rank || "").toUpperCase().trim();
  const m = s.match(/^([EOW])\s*[-]?\s*(\d)(E)?$/);
  if (!m) return s.replace(/\s+/g, "");
  return `${m[1]}-${m[2]}${m[3] ? "E" : ""}`;
}

export function normalizeDependents(dependents) {
  const raw = String(dependents || "").trim().toLowerCase();

  if (["yes", "with", "with_dependents", "true", "1"].includes(raw)) {
    return "with";
  }

  if (["no", "without", "without_dependents", "false", "0"].includes(raw)) {
    return "without";
  }

  throw new Error(
    'Dependents must be one of: "yes", "no", "with_dependents", "without_dependents".'
  );
}

export function assertSupportedRank(rank) {
  if (!SUPPORTED_RANKS.includes(rank)) {
    throw new Error(
      `Unsupported rank "${rank}". Supported ranks: ${SUPPORTED_RANKS.join(", ")}`
    );
  }
}

// ============================================================
// //#2) CANONICAL BASE ALIAS MAP
// ============================================================
export const BASE_ALIASES = Object.freeze({
  "Andrews": "Andrews AFB",
  "AndrewsAFB": "Andrews AFB",
  "Andrews AFB": "Andrews AFB",
  "Joint Base Andrews": "Andrews AFB",
  "JB Andrews": "Andrews AFB",

  "Barksdale": "Barksdale AFB",
  "BarksdaleAFB": "Barksdale AFB",
  "Barksdale AFB": "Barksdale AFB",

  "Beale": "Beale AFB",
  "BealeAFB": "Beale AFB",
  "Beale AFB": "Beale AFB",

  "Cannon": "Cannon AFB",
  "CannonAFB": "Cannon AFB",
  "Cannon AFB": "Cannon AFB",

  "Charleston": "Charleston AFB",
  "CharlestonAFB": "Charleston AFB",
  "Charleston AFB": "Charleston AFB",
  "Joint Base Charleston": "Charleston AFB",

  "Davis Monthan": "Davis-Monthan AFB",
  "Davis-Monthan": "Davis-Monthan AFB",
  "DavisMonthan": "Davis-Monthan AFB",
  "Davis Monthan AFB": "Davis-Monthan AFB",
  "Davis-Monthan AFB": "Davis-Monthan AFB",

  "Dover": "Dover AFB",
  "DoverAFB": "Dover AFB",
  "Dover AFB": "Dover AFB",

  "Dyess": "Dyess AFB",
  "DyessAFB": "Dyess AFB",
  "Dyess AFB": "Dyess AFB",

  "Eglin": "Eglin AFB",
  "EglinAFB": "Eglin AFB",
  "Eglin AFB": "Eglin AFB",

  "Elmendorf": "Elmendorf AFB",
  "ElmendorfAFB": "Elmendorf AFB",
  "Elmendorf AFB": "Elmendorf AFB",
  "Joint Base Elmendorf Richardson": "Elmendorf AFB",
  "JBER": "Elmendorf AFB",

  "F.E Warren": "F.E-Warren AFB",
  "F.E. Warren": "F.E-Warren AFB",
  "FE Warren": "F.E-Warren AFB",
  "FEWarren": "F.E-Warren AFB",
  "F.E-Warren": "F.E-Warren AFB",
  "F.E Warren AFB": "F.E-Warren AFB",
  "F.E-Warren AFB": "F.E-Warren AFB",

  "Fairchild": "Fairchild AFB",
  "FairchildAFB": "Fairchild AFB",
  "Fairchild AFB": "Fairchild AFB",

  "Holloman": "Holloman AFB",
  "HollomanAFB": "Holloman AFB",
  "Holloman AFB": "Holloman AFB",

  "Hurlburt": "Hurlburt Field",
  "HurlburtField": "Hurlburt Field",
  "Hurlburt Field": "Hurlburt Field",
  "Hurlburt AFB": "Hurlburt Field",

  "Keesler": "Keesler AFB",
  "KeeslerAFB": "Keesler AFB",
  "Keesler AFB": "Keesler AFB",

  "Kirtland": "Kirtland AFB",
  "KirtlandAFB": "Kirtland AFB",
  "Kirtland AFB": "Kirtland AFB",

  "Lackland": "Lackland AFB",
  "LacklandAFB": "Lackland AFB",
  "Lackland AFB": "Lackland AFB",
  "JBSA Lackland": "Lackland AFB",
  "JBSA-Lackland": "Lackland AFB",

  "Langley": "Langley AFB",
  "LangleyAFB": "Langley AFB",
  "Langley AFB": "Langley AFB",
  "Joint Base Langley Eustis": "Langley AFB",

  "Laughlin": "Laughlin AFB",
  "LaughlinAFB": "Laughlin AFB",
  "Laughlin AFB": "Laughlin AFB",

  "Little Rock": "Little-Rock AFB",
  "LittleRock": "Little-Rock AFB",
  "Little Rock AFB": "Little-Rock AFB",
  "Little-Rock AFB": "Little-Rock AFB",

  "Luke": "Luke AFB",
  "LukeAFB": "Luke AFB",
  "Luke AFB": "Luke AFB",

  "MacDill": "MacDill AFB",
  "MacDillAFB": "MacDill AFB",
  "MacDill AFB": "MacDill AFB",

  "Malmstrom": "Malmstrom AFB",
  "MalmstromAFB": "Malmstrom AFB",
  "Malmstrom AFB": "Malmstrom AFB",

  "Maxwell": "Maxwell AFB",
  "MaxwellAFB": "Maxwell AFB",
  "Maxwell AFB": "Maxwell AFB",

  "McChord": "McChord AFB",
  "McChordAFB": "McChord AFB",
  "McChord AFB": "McChord AFB",
  "Joint Base Lewis McChord": "McChord AFB",
  "JBLM": "McChord AFB",

  "McConnell": "McConnell AFB",
  "McConnellAFB": "McConnell AFB",
  "McConnell AFB": "McConnell AFB",

  "Minot": "Minot AFB",
  "MinotAFB": "Minot AFB",
  "Minot AFB": "Minot AFB",

  "Mountain Home": "Mountain-Home AFB",
  "MountainHome": "Mountain-Home AFB",
  "Mountain Home AFB": "Mountain-Home AFB",
  "Mountain-Home AFB": "Mountain-Home AFB",

  "Nellis": "Nellis AFB",
  "NellisAFB": "Nellis AFB",
  "Nellis AFB": "Nellis AFB",

  "Offutt": "Offutt AFB",
  "OffuttAFB": "Offutt AFB",
  "Offutt AFB": "Offutt AFB",

  "Peterson": "Peterson AFB",
  "PetersonAFB": "Peterson AFB",
  "Peterson AFB": "Peterson AFB",
  "Peterson SFB": "Peterson AFB",

  "Ramstein": "Ramstein AB",
  "RamsteinAB": "Ramstein AB",
  "Ramstein AB": "Ramstein AB",
  "Ramstein AFB": "Ramstein AB",

  "Randolph": "Randolph AFB",
  "RandolphAFB": "Randolph AFB",
  "Randolph AFB": "Randolph AFB",
  "JBSA Randolph": "Randolph AFB",
  "JBSA-Randolph": "Randolph AFB",

  "Robins": "Robins AFB",
  "RobinsAFB": "Robins AFB",
  "Robins AFB": "Robins AFB",

  "Scott": "Scott AFB",
  "ScottAFB": "Scott AFB",
  "Scott AFB": "Scott AFB",

  "Seymour Johnson": "Seymour-Johnson AFB",
  "SeymourJohnson": "Seymour-Johnson AFB",
  "Seymour Johnson AFB": "Seymour-Johnson AFB",
  "Seymour-Johnson AFB": "Seymour-Johnson AFB",

  "Shaw": "Shaw AFB",
  "ShawAFB": "Shaw AFB",
  "Shaw AFB": "Shaw AFB",

  "Sheppard": "Sheppard AFB",
  "SheppardAFB": "Sheppard AFB",
  "Sheppard AFB": "Sheppard AFB",

  "Tinker": "Tinker AFB",
  "TinkerAFB": "Tinker AFB",
  "Tinker AFB": "Tinker AFB",

  "Travis": "Travis AFB",
  "TravisAFB": "Travis AFB",
  "Travis AFB": "Travis AFB",

  "Vandenberg": "Vandenberg SFB",
  "VandenbergSFB": "Vandenberg SFB",
  "Vandenberg SFB": "Vandenberg SFB",
  "Vandenberg AFB": "Vandenberg SFB",

  "Whiteman": "Whiteman AFB",
  "WhitemanAFB": "Whiteman AFB",
  "Whiteman AFB": "Whiteman AFB",

  "Wright Patterson": "Wright-Patterson AFB",
  "WrightPatterson": "Wright-Patterson AFB",
  "Wright Patterson AFB": "Wright-Patterson AFB",
  "Wright-Patterson AFB": "Wright-Patterson AFB"
});

// Case-insensitive / punctuation-insensitive base matching.
export function canonicalizeBase(base) {
  const raw = normalizeString(base);

  if (!raw) {
    throw new Error("Base is required.");
  }

  if (BASE_ALIASES[raw]) {
    return BASE_ALIASES[raw];
  }

  const compactRaw = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const [alias, canonical] of Object.entries(BASE_ALIASES)) {
    const compactAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compactAlias === compactRaw) {
      return canonical;
    }
  }

  return raw;
}

// ============================================================
// //#3) BASE → DUTY ZIP
// ============================================================
export const BASE_TO_ZIP = Object.freeze({
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
  "Holloman AFB": "88330",
  "Hurlburt Field": "32544",
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
  "McChord AFB": "98438",
  "McConnell AFB": "67221",
  "Minot AFB": "58705",
  "Mountain-Home AFB": "83648",
  "Nellis AFB": "89191",
  "Offutt AFB": "68113",
  "Peterson AFB": "80914",
  "Ramstein AB": "09094",
  "Randolph AFB": "78150",
  "Robins AFB": "31098",
  "Scott AFB": "62225",
  "Seymour-Johnson AFB": "27531",
  "Shaw AFB": "29152",
  "Sheppard AFB": "76311",
  "Tinker AFB": "73145",
  "Travis AFB": "94535",
  "Vandenberg SFB": "93437",
  "Whiteman AFB": "65305",
  "Wright-Patterson AFB": "45433"
});

export function getDutyZip(base) {
  const canonicalBase = canonicalizeBase(base);
  const zip = BASE_TO_ZIP[canonicalBase];

  if (!zip) {
    throw new Error(`No duty ZIP found for base "${base}".`);
  }

  return zip;
}

// ============================================================
// //#4) 2026 BAH TABLE BY BASE
// ============================================================
export const BAH_2026_BY_BASE = Object.freeze({
  "Andrews AFB": {
    base: "Andrews AFB",
    dutyZip: "20762",
    mhaCode: "DC053",
    mhaName: "Washington DC Metro Area",
    with: {
      "E-1": 2880, "E-2": 2880, "E-3": 2880, "E-4": 2880, "E-5": 3066,
      "E-6": 3498, "E-7": 3549, "E-8": 3600, "E-9": 3696,
      "W-1": 3504, "W-2": 3561, "W-3": 3615, "W-4": 3711, "W-5": 3834,
      "O-1E": 3516, "O-2E": 3588, "O-3E": 3729,
      "O-1": 3129, "O-2": 3495, "O-3": 3606, "O-4": 3852, "O-5": 3897, "O-6": 3930, "O-7": 3960
    },
    without: {
      "E-1": 2250, "E-2": 2250, "E-3": 2250, "E-4": 2250, "E-5": 2460,
      "E-6": 2865, "E-7": 3069, "E-8": 3321, "E-9": 3453,
      "W-1": 2886, "W-2": 3144, "W-3": 3354, "W-4": 3480, "W-5": 3501,
      "O-1E": 3054, "O-2E": 3318, "O-3E": 3486,
      "O-1": 2439, "O-2": 2862, "O-3": 3411, "O-4": 3510, "O-5": 3534, "O-6": 3567, "O-7": 3597
    }
  },

  "Barksdale AFB": {
    base: "Barksdale AFB",
    dutyZip: "71110",
    mhaCode: "LA117",
    mhaName: "Shreveport / Bossier City LA",
    with: {
      "E-1": 1356, "E-2": 1356, "E-3": 1356, "E-4": 1356, "E-5": 1500,
      "E-6": 1710, "E-7": 1737, "E-8": 1764, "E-9": 1812,
      "W-1": 1716, "W-2": 1746, "W-3": 1773, "W-4": 1821, "W-5": 1881,
      "O-1E": 1722, "O-2E": 1758, "O-3E": 1830,
      "O-1": 1533, "O-2": 1710, "O-3": 1767, "O-4": 1887, "O-5": 1908, "O-6": 1926, "O-7": 1941
    },
    without: {
      "E-1": 1059, "E-2": 1059, "E-3": 1059, "E-4": 1059, "E-5": 1203,
      "E-6": 1404, "E-7": 1503, "E-8": 1626, "E-9": 1692,
      "W-1": 1413, "W-2": 1542, "W-3": 1641, "W-4": 1704, "W-5": 1713,
      "O-1E": 1497, "O-2E": 1626, "O-3E": 1710,
      "O-1": 1194, "O-2": 1401, "O-3": 1671, "O-4": 1719, "O-5": 1731, "O-6": 1746, "O-7": 1761
    }
  },

  "Beale AFB": {
    base: "Beale AFB",
    dutyZip: "95903",
    mhaCode: "CA037",
    mhaName: "Yuba City CA",
    with: {
      "E-1": 2073, "E-2": 2073, "E-3": 2073, "E-4": 2073, "E-5": 2226,
      "E-6": 2541, "E-7": 2580, "E-8": 2619, "E-9": 2688,
      "W-1": 2547, "W-2": 2592, "W-3": 2631, "W-4": 2700, "W-5": 2787,
      "O-1E": 2556, "O-2E": 2607, "O-3E": 2715,
      "O-1": 2277, "O-2": 2541, "O-3": 2622, "O-4": 2802, "O-5": 2835, "O-6": 2859, "O-7": 2880
    },
    without: {
      "E-1": 1617, "E-2": 1617, "E-3": 1617, "E-4": 1617, "E-5": 1785,
      "E-6": 2085, "E-7": 2232, "E-8": 2415, "E-9": 2511,
      "W-1": 2100, "W-2": 2289, "W-3": 2436, "W-4": 2526, "W-5": 2544,
      "O-1E": 2220, "O-2E": 2415, "O-3E": 2535,
      "O-1": 1770, "O-2": 2082, "O-3": 2475, "O-4": 2550, "O-5": 2568, "O-6": 2592, "O-7": 2616
    }
  },

  "Cannon AFB": {
    base: "Cannon AFB",
    dutyZip: "88103",
    mhaCode: "NM205",
    mhaName: "Clovis NM",
    with: {
      "E-1": 1230, "E-2": 1230, "E-3": 1230, "E-4": 1230, "E-5": 1356,
      "E-6": 1548, "E-7": 1572, "E-8": 1596, "E-9": 1641,
      "W-1": 1554, "W-2": 1581, "W-3": 1608, "W-4": 1650, "W-5": 1704,
      "O-1E": 1560, "O-2E": 1590, "O-3E": 1659,
      "O-1": 1386, "O-2": 1548, "O-3": 1599, "O-4": 1710, "O-5": 1731, "O-6": 1746, "O-7": 1761
    },
    without: {
      "E-1": 960, "E-2": 960, "E-3": 960, "E-4": 960, "E-5": 1089,
      "E-6": 1272, "E-7": 1362, "E-8": 1473, "E-9": 1533,
      "W-1": 1281, "W-2": 1395, "W-3": 1485, "W-4": 1542, "W-5": 1551,
      "O-1E": 1356, "O-2E": 1473, "O-3E": 1551,
      "O-1": 1083, "O-2": 1269, "O-3": 1512, "O-4": 1557, "O-5": 1566, "O-6": 1581, "O-7": 1596
    }
  },

  "Charleston AFB": {
    base: "Charleston AFB",
    dutyZip: "29404",
    mhaCode: "SC262",
    mhaName: "Charleston SC",
    with: {
      "E-1": 2199, "E-2": 2199, "E-3": 2199, "E-4": 2199, "E-5": 2388,
      "E-6": 2724, "E-7": 2766, "E-8": 2808, "E-9": 2883,
      "W-1": 2730, "W-2": 2778, "W-3": 2820, "W-4": 2895, "W-5": 2988,
      "O-1E": 2742, "O-2E": 2796, "O-3E": 2910,
      "O-1": 2442, "O-2": 2721, "O-3": 2811, "O-4": 3006, "O-5": 3039, "O-6": 3066, "O-7": 3090
    },
    without: {
      "E-1": 1716, "E-2": 1716, "E-3": 1716, "E-4": 1716, "E-5": 1914,
      "E-6": 2235, "E-7": 2394, "E-8": 2589, "E-9": 2691,
      "W-1": 2250, "W-2": 2451, "W-3": 2610, "W-4": 2709, "W-5": 2727,
      "O-1E": 2382, "O-2E": 2589, "O-3E": 2718,
      "O-1": 1905, "O-2": 2232, "O-3": 2655, "O-4": 2736, "O-5": 2757, "O-6": 2778, "O-7": 2802
    }
  },

  "Davis-Monthan AFB": {
    base: "Davis-Monthan AFB",
    dutyZip: "85707",
    mhaCode: "AZ016",
    mhaName: "Tucson AZ",
    with: {
      "E-1": 1743, "E-2": 1743, "E-3": 1743, "E-4": 1743, "E-5": 1908,
      "E-6": 2175, "E-7": 2208, "E-8": 2241, "E-9": 2301,
      "W-1": 2181, "W-2": 2217, "W-3": 2253, "W-4": 2313, "W-5": 2388,
      "O-1E": 2190, "O-2E": 2232, "O-3E": 2325,
      "O-1": 1950, "O-2": 2175, "O-3": 2244, "O-4": 2400, "O-5": 2427, "O-6": 2448, "O-7": 2466
    },
    without: {
      "E-1": 1362, "E-2": 1362, "E-3": 1362, "E-4": 1362, "E-5": 1530,
      "E-6": 1785, "E-7": 1911, "E-8": 2067, "E-9": 2148,
      "W-1": 1797, "W-2": 1959, "W-3": 2085, "W-4": 2163, "W-5": 2178,
      "O-1E": 1902, "O-2E": 2067, "O-3E": 2172,
      "O-1": 1524, "O-2": 1782, "O-3": 2121, "O-4": 2187, "O-5": 2202, "O-6": 2220, "O-7": 2238
    }
  },
    "Dover AFB": {
    base: "Dover AFB",
    dutyZip: "19902",
    mhaCode: "DE053",
    mhaName: "Dover DE",
    with: {
      "E-1": 1725, "E-2": 1725, "E-3": 1725, "E-4": 1725, "E-5": 1890,
      "E-6": 2157, "E-7": 2190, "E-8": 2223, "E-9": 2283,
      "W-1": 2163, "W-2": 2199, "W-3": 2235, "W-4": 2295, "W-5": 2367,
      "O-1E": 2172, "O-2E": 2214, "O-3E": 2307,
      "O-1": 1932, "O-2": 2157, "O-3": 2226, "O-4": 2382, "O-5": 2409, "O-6": 2430, "O-7": 2448
    },
    without: {
      "E-1": 1347, "E-2": 1347, "E-3": 1347, "E-4": 1347, "E-5": 1515,
      "E-6": 1770, "E-7": 1896, "E-8": 2049, "E-9": 2130,
      "W-1": 1782, "W-2": 1941, "W-3": 2067, "W-4": 2145, "W-5": 2160,
      "O-1E": 1887, "O-2E": 2049, "O-3E": 2154,
      "O-1": 1509, "O-2": 1767, "O-3": 2103, "O-4": 2166, "O-5": 2181, "O-6": 2199, "O-7": 2217
    }
  },

  "Dyess AFB": {
    base: "Dyess AFB",
    dutyZip: "79607",
    mhaCode: "TX270",
    mhaName: "Abilene TX",
    with: {
      "E-1": 1476, "E-2": 1476, "E-3": 1476, "E-4": 1476, "E-5": 1620,
      "E-6": 1848, "E-7": 1875, "E-8": 1905, "E-9": 1956,
      "W-1": 1854, "W-2": 1887, "W-3": 1917, "W-4": 1968, "W-5": 2031,
      "O-1E": 1860, "O-2E": 1899, "O-3E": 1977,
      "O-1": 1656, "O-2": 1848, "O-3": 1908, "O-4": 2040, "O-5": 2064, "O-6": 2082, "O-7": 2097
    },
    without: {
      "E-1": 1152, "E-2": 1152, "E-3": 1152, "E-4": 1152, "E-5": 1302,
      "E-6": 1518, "E-7": 1626, "E-8": 1758, "E-9": 1827,
      "W-1": 1527, "W-2": 1665, "W-3": 1773, "W-4": 1842, "W-5": 1854,
      "O-1E": 1617, "O-2E": 1758, "O-3E": 1848,
      "O-1": 1296, "O-2": 1515, "O-3": 1806, "O-4": 1860, "O-5": 1875, "O-6": 1887, "O-7": 1902
    }
  },

  "Eglin AFB": {
    base: "Eglin AFB",
    dutyZip: "32542",
    mhaCode: "FL064",
    mhaName: "Eglin AFB / Fort Walton Beach FL",
    with: {
      "E-1": 2016, "E-2": 2016, "E-3": 2016, "E-4": 2016, "E-5": 2196,
      "E-6": 2505, "E-7": 2544, "E-8": 2583, "E-9": 2652,
      "W-1": 2511, "W-2": 2556, "W-3": 2595, "W-4": 2664, "W-5": 2751,
      "O-1E": 2520, "O-2E": 2571, "O-3E": 2676,
      "O-1": 2247, "O-2": 2505, "O-3": 2586, "O-4": 2763, "O-5": 2796, "O-6": 2820, "O-7": 2841
    },
    without: {
      "E-1": 1572, "E-2": 1572, "E-3": 1572, "E-4": 1572, "E-5": 1761,
      "E-6": 2055, "E-7": 2202, "E-8": 2382, "E-9": 2475,
      "W-1": 2070, "W-2": 2256, "W-3": 2403, "W-4": 2493, "W-5": 2508,
      "O-1E": 2190, "O-2E": 2382, "O-3E": 2502,
      "O-1": 1752, "O-2": 2052, "O-3": 2442, "O-4": 2517, "O-5": 2535, "O-6": 2556, "O-7": 2577
    }
  },

  "Elmendorf AFB": {
    base: "Elmendorf AFB",
    dutyZip: "99506",
    mhaCode: "AK404",
    mhaName: "Anchorage AK",
    with: {
      "E-1": 2550, "E-2": 2550, "E-3": 2550, "E-4": 2550, "E-5": 2742,
      "E-6": 3129, "E-7": 3177, "E-8": 3225, "E-9": 3312,
      "W-1": 3138, "W-2": 3192, "W-3": 3240, "W-4": 3327, "W-5": 3432,
      "O-1E": 3150, "O-2E": 3210, "O-3E": 3342,
      "O-1": 2805, "O-2": 3126, "O-3": 3228, "O-4": 3450, "O-5": 3489, "O-6": 3519, "O-7": 3546
    },
    without: {
      "E-1": 1989, "E-2": 1989, "E-3": 1989, "E-4": 1989, "E-5": 2199,
      "E-6": 2571, "E-7": 2754, "E-8": 2979, "E-9": 3096,
      "W-1": 2589, "W-2": 2820, "W-3": 3003, "W-4": 3117, "W-5": 3135,
      "O-1E": 2739, "O-2E": 2979, "O-3E": 3126,
      "O-1": 2187, "O-2": 2568, "O-3": 3051, "O-4": 3144, "O-5": 3168, "O-6": 3192, "O-7": 3219
    }
  },

  "F.E-Warren AFB": {
    base: "F.E-Warren AFB",
    dutyZip: "82005",
    mhaCode: "WY100",
    mhaName: "Cheyenne WY",
    with: {
      "E-1": 1686, "E-2": 1686, "E-3": 1686, "E-4": 1686, "E-5": 1848,
      "E-6": 2109, "E-7": 2142, "E-8": 2175, "E-9": 2235,
      "W-1": 2115, "W-2": 2154, "W-3": 2187, "W-4": 2244, "W-5": 2316,
      "O-1E": 2124, "O-2E": 2163, "O-3E": 2253,
      "O-1": 1890, "O-2": 2109, "O-3": 2178, "O-4": 2328, "O-5": 2355, "O-6": 2376, "O-7": 2394
    },
    without: {
      "E-1": 1317, "E-2": 1317, "E-3": 1317, "E-4": 1317, "E-5": 1482,
      "E-6": 1731, "E-7": 1854, "E-8": 2007, "E-9": 2085,
      "W-1": 1743, "W-2": 1902, "W-3": 2025, "W-4": 2103, "W-5": 2118,
      "O-1E": 1845, "O-2E": 2007, "O-3E": 2106,
      "O-1": 1476, "O-2": 1728, "O-3": 2055, "O-4": 2118, "O-5": 2133, "O-6": 2154, "O-7": 2172
    }
  },

  "Fairchild AFB": {
    base: "Fairchild AFB",
    dutyZip: "99011",
    mhaCode: "WA309",
    mhaName: "Spokane WA",
    with: {
      "E-1": 1863, "E-2": 1863, "E-3": 1863, "E-4": 1863, "E-5": 2034,
      "E-6": 2322, "E-7": 2358, "E-8": 2394, "E-9": 2457,
      "W-1": 2328, "W-2": 2370, "W-3": 2406, "W-4": 2469, "W-5": 2547,
      "O-1E": 2337, "O-2E": 2382, "O-3E": 2481,
      "O-1": 2082, "O-2": 2322, "O-3": 2397, "O-4": 2562, "O-5": 2592, "O-6": 2613, "O-7": 2634
    },
    without: {
      "E-1": 1455, "E-2": 1455, "E-3": 1455, "E-4": 1455, "E-5": 1632,
      "E-6": 1905, "E-7": 2040, "E-8": 2208, "E-9": 2295,
      "W-1": 1920, "W-2": 2091, "W-3": 2229, "W-4": 2316, "W-5": 2331,
      "O-1E": 2031, "O-2E": 2208, "O-3E": 2319,
      "O-1": 1623, "O-2": 1902, "O-3": 2262, "O-4": 2331, "O-5": 2349, "O-6": 2370, "O-7": 2391
    }
  },

  "Holloman AFB": {
    base: "Holloman AFB",
    dutyZip: "88330",
    mhaCode: "NM204",
    mhaName: "Alamogordo NM",
    with: {
      "E-1": 1200, "E-2": 1200, "E-3": 1200, "E-4": 1200, "E-5": 1323,
      "E-6": 1509, "E-7": 1533, "E-8": 1557, "E-9": 1599,
      "W-1": 1515, "W-2": 1542, "W-3": 1566, "W-4": 1608, "W-5": 1659,
      "O-1E": 1521, "O-2E": 1551, "O-3E": 1617,
      "O-1": 1353, "O-2": 1509, "O-3": 1557, "O-4": 1668, "O-5": 1686, "O-6": 1701, "O-7": 1716
    },
    without: {
      "E-1": 936, "E-2": 936, "E-3": 936, "E-4": 936, "E-5": 1062,
      "E-6": 1242, "E-7": 1329, "E-8": 1437, "E-9": 1497,
      "W-1": 1248, "W-2": 1359, "W-3": 1446, "W-4": 1503, "W-5": 1512,
      "O-1E": 1323, "O-2E": 1437, "O-3E": 1512,
      "O-1": 1056, "O-2": 1239, "O-3": 1473, "O-4": 1518, "O-5": 1527, "O-6": 1542, "O-7": 1557
    }
  },

  "Hurlburt Field": {
    base: "Hurlburt Field",
    dutyZip: "32544",
    mhaCode: "FL064",
    mhaName: "Eglin AFB / Fort Walton Beach FL",
    with: {
      "E-1": 2016, "E-2": 2016, "E-3": 2016, "E-4": 2016, "E-5": 2196,
      "E-6": 2505, "E-7": 2544, "E-8": 2583, "E-9": 2652,
      "W-1": 2511, "W-2": 2556, "W-3": 2595, "W-4": 2664, "W-5": 2751,
      "O-1E": 2520, "O-2E": 2571, "O-3E": 2676,
      "O-1": 2247, "O-2": 2505, "O-3": 2586, "O-4": 2763, "O-5": 2796, "O-6": 2820, "O-7": 2841
    },
    without: {
      "E-1": 1572, "E-2": 1572, "E-3": 1572, "E-4": 1572, "E-5": 1761,
      "E-6": 2055, "E-7": 2202, "E-8": 2382, "E-9": 2475,
      "W-1": 2070, "W-2": 2256, "W-3": 2403, "W-4": 2493, "W-5": 2508,
      "O-1E": 2190, "O-2E": 2382, "O-3E": 2502,
      "O-1": 1752, "O-2": 2052, "O-3": 2442, "O-4": 2517, "O-5": 2535, "O-6": 2556, "O-7": 2577
    }
  },

  "Keesler AFB": {
    base: "Keesler AFB",
    dutyZip: "39534",
    mhaCode: "MS168",
    mhaName: "Biloxi / Gulfport MS",
    with: {
      "E-1": 1530, "E-2": 1530, "E-3": 1530, "E-4": 1530, "E-5": 1677,
      "E-6": 1914, "E-7": 1944, "E-8": 1974, "E-9": 2028,
      "W-1": 1920, "W-2": 1953, "W-3": 1983, "W-4": 2037, "W-5": 2103,
      "O-1E": 1929, "O-2E": 1965, "O-3E": 2046,
      "O-1": 1716, "O-2": 1914, "O-3": 1977, "O-4": 2115, "O-5": 2139, "O-6": 2157, "O-7": 2175
    },
    without: {
      "E-1": 1194, "E-2": 1194, "E-3": 1194, "E-4": 1194, "E-5": 1347,
      "E-6": 1572, "E-7": 1683, "E-8": 1821, "E-9": 1893,
      "W-1": 1581, "W-2": 1722, "W-3": 1836, "W-4": 1905, "W-5": 1920,
      "O-1E": 1674, "O-2E": 1821, "O-3E": 1911,
      "O-1": 1341, "O-2": 1569, "O-3": 1869, "O-4": 1926, "O-5": 1941, "O-6": 1953, "O-7": 1968
    }
  },

  "Kirtland AFB": {
    base: "Kirtland AFB",
    dutyZip: "87117",
    mhaCode: "NM207",
    mhaName: "Albuquerque NM",
    with: {
      "E-1": 1770, "E-2": 1770, "E-3": 1770, "E-4": 1770, "E-5": 1935,
      "E-6": 2208, "E-7": 2241, "E-8": 2277, "E-9": 2337,
      "W-1": 2214, "W-2": 2253, "W-3": 2289, "W-4": 2352, "W-5": 2427,
      "O-1E": 2223, "O-2E": 2265, "O-3E": 2361,
      "O-1": 1977, "O-2": 2208, "O-3": 2280, "O-4": 2436, "O-5": 2463, "O-6": 2487, "O-7": 2505
    },
    without: {
      "E-1": 1383, "E-2": 1383, "E-3": 1383, "E-4": 1383, "E-5": 1554,
      "E-6": 1815, "E-7": 1944, "E-8": 2103, "E-9": 2184,
      "W-1": 1827, "W-2": 1992, "W-3": 2121, "W-4": 2202, "W-5": 2217,
      "O-1E": 1935, "O-2E": 2103, "O-3E": 2208,
      "O-1": 1548, "O-2": 1812, "O-3": 2157, "O-4": 2223, "O-5": 2241, "O-6": 2256, "O-7": 2274
    }
  },

  "Lackland AFB": {
    base: "Lackland AFB",
    dutyZip: "78236",
    mhaCode: "TX279",
    mhaName: "San Antonio TX",
    with: {
      "E-1": 1815, "E-2": 1815, "E-3": 1815, "E-4": 1815, "E-5": 1914,
      "E-6": 2175, "E-7": 2208, "E-8": 2241, "E-9": 2301,
      "W-1": 2181, "W-2": 2217, "W-3": 2253, "W-4": 2313, "W-5": 2388,
      "O-1E": 2190, "O-2E": 2232, "O-3E": 2325,
      "O-1": 1950, "O-2": 2175, "O-3": 2244, "O-4": 2400, "O-5": 2427, "O-6": 2448, "O-7": 2466
    },
    without: {
      "E-1": 1416, "E-2": 1416, "E-3": 1416, "E-4": 1416, "E-5": 1533,
      "E-6": 1785, "E-7": 1911, "E-8": 2067, "E-9": 2148,
      "W-1": 1797, "W-2": 1959, "W-3": 2085, "W-4": 2163, "W-5": 2178,
      "O-1E": 1902, "O-2E": 2067, "O-3E": 2172,
      "O-1": 1524, "O-2": 1782, "O-3": 2121, "O-4": 2187, "O-5": 2202, "O-6": 2220, "O-7": 2238
    }
  },

  "Langley AFB": {
    base: "Langley AFB",
    dutyZip: "23665",
    mhaCode: "VA298",
    mhaName: "Hampton / Newport News VA",
    with: {
      "E-1": 2010, "E-2": 2010, "E-3": 2010, "E-4": 2010, "E-5": 2190,
      "E-6": 2496, "E-7": 2535, "E-8": 2574, "E-9": 2643,
      "W-1": 2502, "W-2": 2547, "W-3": 2586, "W-4": 2655, "W-5": 2742,
      "O-1E": 2514, "O-2E": 2562, "O-3E": 2670,
      "O-1": 2238, "O-2": 2496, "O-3": 2577, "O-4": 2754, "O-5": 2787, "O-6": 2811, "O-7": 2832
    },
    without: {
      "E-1": 1569, "E-2": 1569, "E-3": 1569, "E-4": 1569, "E-5": 1755,
      "E-6": 2049, "E-7": 2196, "E-8": 2373, "E-9": 2469,
      "W-1": 2064, "W-2": 2247, "W-3": 2394, "W-4": 2484, "W-5": 2499,
      "O-1E": 2184, "O-2E": 2373, "O-3E": 2493,
      "O-1": 1746, "O-2": 2046, "O-3": 2433, "O-4": 2508, "O-5": 2526, "O-6": 2547, "O-7": 2568
    }
  },

  "Laughlin AFB": {
    base: "Laughlin AFB",
    dutyZip: "78843",
    mhaCode: "TX282",
    mhaName: "Del Rio TX",
    with: {
      "E-1": 1221, "E-2": 1221, "E-3": 1221, "E-4": 1221, "E-5": 1344,
      "E-6": 1533, "E-7": 1557, "E-8": 1581, "E-9": 1623,
      "W-1": 1539, "W-2": 1566, "W-3": 1590, "W-4": 1632, "W-5": 1686,
      "O-1E": 1545, "O-2E": 1575, "O-3E": 1641,
      "O-1": 1374, "O-2": 1533, "O-3": 1581, "O-4": 1695, "O-5": 1713, "O-6": 1728, "O-7": 1743
    },
    without: {
      "E-1": 954, "E-2": 954, "E-3": 954, "E-4": 954, "E-5": 1080,
      "E-6": 1260, "E-7": 1350, "E-8": 1458, "E-9": 1518,
      "W-1": 1269, "W-2": 1380, "W-3": 1467, "W-4": 1524, "W-5": 1536,
      "O-1E": 1344, "O-2E": 1458, "O-3E": 1536,
      "O-1": 1074, "O-2": 1257, "O-3": 1494, "O-4": 1539, "O-5": 1551, "O-6": 1566, "O-7": 1581
    }
  },

  "Little-Rock AFB": {
    base: "Little-Rock AFB",
    dutyZip: "72099",
    mhaCode: "AR113",
    mhaName: "Little Rock AR",
    with: {
      "E-1": 1470, "E-2": 1470, "E-3": 1470, "E-4": 1470, "E-5": 1614,
      "E-6": 1839, "E-7": 1866, "E-8": 1896, "E-9": 1947,
      "W-1": 1845, "W-2": 1878, "W-3": 1908, "W-4": 1959, "W-5": 2022,
      "O-1E": 1851, "O-2E": 1890, "O-3E": 1968,
      "O-1": 1647, "O-2": 1839, "O-3": 1899, "O-4": 2031, "O-5": 2055, "O-6": 2073, "O-7": 2088
    },
    without: {
      "E-1": 1149, "E-2": 1149, "E-3": 1149, "E-4": 1149, "E-5": 1296,
      "E-6": 1512, "E-7": 1620, "E-8": 1752, "E-9": 1821,
      "W-1": 1521, "W-2": 1656, "W-3": 1764, "W-4": 1830, "W-5": 1845,
      "O-1E": 1611, "O-2E": 1752, "O-3E": 1839,
      "O-1": 1290, "O-2": 1509, "O-3": 1797, "O-4": 1851, "O-5": 1866, "O-6": 1878, "O-7": 1893
    }
  },

  "Luke AFB": {
    base: "Luke AFB",
    dutyZip: "85309",
    mhaCode: "AZ014",
    mhaName: "Phoenix AZ",
    with: {
      "E-1": 2076, "E-2": 2076, "E-3": 2076, "E-4": 2076, "E-5": 2265,
      "E-6": 2583, "E-7": 2622, "E-8": 2661, "E-9": 2733,
      "W-1": 2589, "W-2": 2634, "W-3": 2673, "W-4": 2745, "W-5": 2832,
      "O-1E": 2601, "O-2E": 2649, "O-3E": 2760,
      "O-1": 2316, "O-2": 2583, "O-3": 2667, "O-4": 2850, "O-5": 2883, "O-6": 2907, "O-7": 2928
    },
    without: {
      "E-1": 1620, "E-2": 1620, "E-3": 1620, "E-4": 1620, "E-5": 1815,
      "E-6": 2118, "E-7": 2268, "E-8": 2454, "E-9": 2553,
      "W-1": 2133, "W-2": 2325, "W-3": 2475, "W-4": 2571, "W-5": 2586,
      "O-1E": 2256, "O-2E": 2454, "O-3E": 2577,
      "O-1": 1806, "O-2": 2115, "O-3": 2514, "O-4": 2592, "O-5": 2610, "O-6": 2634, "O-7": 2658
    }
  },

  "MacDill AFB": {
    base: "MacDill AFB",
    dutyZip: "33621",
    mhaCode: "FL066",
    mhaName: "Tampa FL",
    with: {
      "E-1": 2526, "E-2": 2526, "E-3": 2526, "E-4": 2526, "E-5": 2733,
      "E-6": 3117, "E-7": 3165, "E-8": 3213, "E-9": 3300,
      "W-1": 3126, "W-2": 3180, "W-3": 3228, "W-4": 3315, "W-5": 3420,
      "O-1E": 3138, "O-2E": 3198, "O-3E": 3330,
      "O-1": 2796, "O-2": 3114, "O-3": 3216, "O-4": 3438, "O-5": 3477, "O-6": 3507, "O-7": 3534
    },
    without: {
      "E-1": 1971, "E-2": 1971, "E-3": 1971, "E-4": 1971, "E-5": 2190,
      "E-6": 2562, "E-7": 2745, "E-8": 2967, "E-9": 3084,
      "W-1": 2580, "W-2": 2811, "W-3": 2991, "W-4": 3105, "W-5": 3123,
      "O-1E": 2730, "O-2E": 2967, "O-3E": 3114,
      "O-1": 2181, "O-2": 2559, "O-3": 3039, "O-4": 3132, "O-5": 3156, "O-6": 3180, "O-7": 3207
    }
  },

  "Malmstrom AFB": {
    base: "Malmstrom AFB",
    dutyZip: "59402",
    mhaCode: "MT171",
    mhaName: "Great Falls MT",
    with: {
      "E-1": 1536, "E-2": 1536, "E-3": 1536, "E-4": 1536, "E-5": 1683,
      "E-6": 1920, "E-7": 1950, "E-8": 1980, "E-9": 2034,
      "W-1": 1926, "W-2": 1959, "W-3": 1989, "W-4": 2043, "W-5": 2109,
      "O-1E": 1935, "O-2E": 1971, "O-3E": 2052,
      "O-1": 1722, "O-2": 1920, "O-3": 1983, "O-4": 2121, "O-5": 2145, "O-6": 2163, "O-7": 2181
    },
    without: {
      "E-1": 1200, "E-2": 1200, "E-3": 1200, "E-4": 1200, "E-5": 1350,
      "E-6": 1578, "E-7": 1689, "E-8": 1827, "E-9": 1899,
      "W-1": 1587, "W-2": 1728, "W-3": 1842, "W-4": 1911, "W-5": 1926,
      "O-1E": 1680, "O-2E": 1827, "O-3E": 1917,
      "O-1": 1344, "O-2": 1575, "O-3": 1875, "O-4": 1932, "O-5": 1947, "O-6": 1959, "O-7": 1974
    }
  },

  "Maxwell AFB": {
    base: "Maxwell AFB",
    dutyZip: "36112",
    mhaCode: "AL005",
    mhaName: "Montgomery AL",
    with: {
      "E-1": 1440, "E-2": 1440, "E-3": 1440, "E-4": 1440, "E-5": 1581,
      "E-6": 1803, "E-7": 1830, "E-8": 1857, "E-9": 1908,
      "W-1": 1809, "W-2": 1842, "W-3": 1869, "W-4": 1920, "W-5": 1980,
      "O-1E": 1815, "O-2E": 1851, "O-3E": 1929,
      "O-1": 1614, "O-2": 1803, "O-3": 1860, "O-4": 1992, "O-5": 2013, "O-6": 2031, "O-7": 2046
    },
    without: {
      "E-1": 1125, "E-2": 1125, "E-3": 1125, "E-4": 1125, "E-5": 1269,
      "E-6": 1482, "E-7": 1587, "E-8": 1716, "E-9": 1785,
      "W-1": 1491, "W-2": 1623, "W-3": 1728, "W-4": 1794, "W-5": 1806,
      "O-1E": 1578, "O-2E": 1716, "O-3E": 1803,
      "O-1": 1263, "O-2": 1479, "O-3": 1761, "O-4": 1815, "O-5": 1830, "O-6": 1842, "O-7": 1857
    }
  },
    "McChord AFB": {
    base: "McChord AFB",
    dutyZip: "98438",
    mhaCode: "WA306",
    mhaName: "Tacoma WA",
    with: {
      "E-1": 2310, "E-2": 2310, "E-3": 2310, "E-4": 2310, "E-5": 2505,
      "E-6": 2856, "E-7": 2898, "E-8": 2943, "E-9": 3021,
      "W-1": 2865, "W-2": 2913, "W-3": 2958, "W-4": 3036, "W-5": 3132,
      "O-1E": 2877, "O-2E": 2931, "O-3E": 3054,
      "O-1": 2559, "O-2": 2853, "O-3": 2946, "O-4": 3150, "O-5": 3186, "O-6": 3213, "O-7": 3237
    },
    without: {
      "E-1": 1803, "E-2": 1803, "E-3": 1803, "E-4": 1803, "E-5": 2010,
      "E-6": 2343, "E-7": 2511, "E-8": 2715, "E-9": 2823,
      "W-1": 2358, "W-2": 2571, "W-3": 2736, "W-4": 2841, "W-5": 2859,
      "O-1E": 2499, "O-2E": 2715, "O-3E": 2850,
      "O-1": 2001, "O-2": 2340, "O-3": 2781, "O-4": 2865, "O-5": 2889, "O-6": 2913, "O-7": 2937
    }
  },

  "McConnell AFB": {
    base: "McConnell AFB",
    dutyZip: "67221",
    mhaCode: "KS100",
    mhaName: "Wichita KS",
    with: {
      "E-1": 1536, "E-2": 1536, "E-3": 1536, "E-4": 1536, "E-5": 1683,
      "E-6": 1920, "E-7": 1950, "E-8": 1980, "E-9": 2034,
      "W-1": 1926, "W-2": 1959, "W-3": 1989, "W-4": 2043, "W-5": 2109,
      "O-1E": 1935, "O-2E": 1971, "O-3E": 2052,
      "O-1": 1722, "O-2": 1920, "O-3": 1983, "O-4": 2121, "O-5": 2145, "O-6": 2163, "O-7": 2181
    },
    without: {
      "E-1": 1200, "E-2": 1200, "E-3": 1200, "E-4": 1200, "E-5": 1350,
      "E-6": 1578, "E-7": 1689, "E-8": 1827, "E-9": 1899,
      "W-1": 1587, "W-2": 1728, "W-3": 1842, "W-4": 1911, "W-5": 1926,
      "O-1E": 1680, "O-2E": 1827, "O-3E": 1917,
      "O-1": 1344, "O-2": 1575, "O-3": 1875, "O-4": 1932, "O-5": 1947, "O-6": 1959, "O-7": 1974
    }
  },

  "Minot AFB": {
    base: "Minot AFB",
    dutyZip: "58705",
    mhaCode: "ND190",
    mhaName: "Minot ND",
    with: {
      "E-1": 1542, "E-2": 1542, "E-3": 1542, "E-4": 1542, "E-5": 1689,
      "E-6": 1926, "E-7": 1956, "E-8": 1986, "E-9": 2040,
      "W-1": 1932, "W-2": 1965, "W-3": 1995, "W-4": 2049, "W-5": 2115,
      "O-1E": 1941, "O-2E": 1977, "O-3E": 2058,
      "O-1": 1728, "O-2": 1926, "O-3": 1989, "O-4": 2127, "O-5": 2151, "O-6": 2169, "O-7": 2187
    },
    without: {
      "E-1": 1206, "E-2": 1206, "E-3": 1206, "E-4": 1206, "E-5": 1356,
      "E-6": 1584, "E-7": 1695, "E-8": 1833, "E-9": 1905,
      "W-1": 1593, "W-2": 1734, "W-3": 1848, "W-4": 1917, "W-5": 1932,
      "O-1E": 1686, "O-2E": 1833, "O-3E": 1923,
      "O-1": 1350, "O-2": 1581, "O-3": 1881, "O-4": 1938, "O-5": 1953, "O-6": 1965, "O-7": 1980
    }
  },

  "Mountain-Home AFB": {
    base: "Mountain-Home AFB",
    dutyZip: "83648",
    mhaCode: "ID100",
    mhaName: "Boise ID",
    with: {
      "E-1": 1800, "E-2": 1800, "E-3": 1800, "E-4": 1800, "E-5": 1968,
      "E-6": 2244, "E-7": 2280, "E-8": 2313, "E-9": 2376,
      "W-1": 2250, "W-2": 2289, "W-3": 2325, "W-4": 2388, "W-5": 2463,
      "O-1E": 2259, "O-2E": 2301, "O-3E": 2397,
      "O-1": 2013, "O-2": 2244, "O-3": 2316, "O-4": 2478, "O-5": 2505, "O-6": 2529, "O-7": 2547
    },
    without: {
      "E-1": 1407, "E-2": 1407, "E-3": 1407, "E-4": 1407, "E-5": 1581,
      "E-6": 1842, "E-7": 1974, "E-8": 2133, "E-9": 2220,
      "W-1": 1857, "W-2": 2022, "W-3": 2154, "W-4": 2235, "W-5": 2250,
      "O-1E": 1965, "O-2E": 2133, "O-3E": 2241,
      "O-1": 1575, "O-2": 1839, "O-3": 2190, "O-4": 2256, "O-5": 2274, "O-6": 2292, "O-7": 2310
    }
  },

  "Nellis AFB": {
    base: "Nellis AFB",
    dutyZip: "89191",
    mhaCode: "NV212",
    mhaName: "Las Vegas NV",
    with: {
      "E-1": 2019, "E-2": 2019, "E-3": 2019, "E-4": 2019, "E-5": 2202,
      "E-6": 2511, "E-7": 2550, "E-8": 2589, "E-9": 2658,
      "W-1": 2517, "W-2": 2562, "W-3": 2601, "W-4": 2670, "W-5": 2757,
      "O-1E": 2529, "O-2E": 2577, "O-3E": 2685,
      "O-1": 2253, "O-2": 2511, "O-3": 2592, "O-4": 2772, "O-5": 2805, "O-6": 2829, "O-7": 2850
    },
    without: {
      "E-1": 1575, "E-2": 1575, "E-3": 1575, "E-4": 1575, "E-5": 1764,
      "E-6": 2061, "E-7": 2208, "E-8": 2388, "E-9": 2484,
      "W-1": 2076, "W-2": 2262, "W-3": 2409, "W-4": 2502, "W-5": 2520,
      "O-1E": 2196, "O-2E": 2388, "O-3E": 2508,
      "O-1": 1758, "O-2": 2058, "O-3": 2448, "O-4": 2523, "O-5": 2541, "O-6": 2562, "O-7": 2583
    }
  },

  "Offutt AFB": {
    base: "Offutt AFB",
    dutyZip: "68113",
    mhaCode: "NE192",
    mhaName: "Omaha NE / Council Bluffs IA",
    with: {
      "E-1": 1710, "E-2": 1710, "E-3": 1710, "E-4": 1710, "E-5": 1872,
      "E-6": 2136, "E-7": 2169, "E-8": 2202, "E-9": 2262,
      "W-1": 2142, "W-2": 2181, "W-3": 2214, "W-4": 2274, "W-5": 2346,
      "O-1E": 2151, "O-2E": 2193, "O-3E": 2283,
      "O-1": 1914, "O-2": 2136, "O-3": 2205, "O-4": 2358, "O-5": 2385, "O-6": 2406, "O-7": 2424
    },
    without: {
      "E-1": 1335, "E-2": 1335, "E-3": 1335, "E-4": 1335, "E-5": 1503,
      "E-6": 1755, "E-7": 1881, "E-8": 2034, "E-9": 2115,
      "W-1": 1767, "W-2": 1926, "W-3": 2052, "W-4": 2130, "W-5": 2145,
      "O-1E": 1872, "O-2E": 2034, "O-3E": 2136,
      "O-1": 1497, "O-2": 1752, "O-3": 2085, "O-4": 2148, "O-5": 2166, "O-6": 2181, "O-7": 2199
    }
  },

  "Peterson AFB": {
    base: "Peterson AFB",
    dutyZip: "80914",
    mhaCode: "CO046",
    mhaName: "Colorado Springs CO",
    with: {
      "E-1": 2070, "E-2": 2070, "E-3": 2070, "E-4": 2070, "E-5": 2259,
      "E-6": 2577, "E-7": 2616, "E-8": 2655, "E-9": 2727,
      "W-1": 2583, "W-2": 2628, "W-3": 2667, "W-4": 2739, "W-5": 2826,
      "O-1E": 2595, "O-2E": 2643, "O-3E": 2754,
      "O-1": 2310, "O-2": 2577, "O-3": 2661, "O-4": 2844, "O-5": 2877, "O-6": 2901, "O-7": 2922
    },
    without: {
      "E-1": 1617, "E-2": 1617, "E-3": 1617, "E-4": 1617, "E-5": 1812,
      "E-6": 2115, "E-7": 2265, "E-8": 2448, "E-9": 2547,
      "W-1": 2130, "W-2": 2322, "W-3": 2472, "W-4": 2565, "W-5": 2580,
      "O-1E": 2253, "O-2E": 2448, "O-3E": 2571,
      "O-1": 1803, "O-2": 2112, "O-3": 2511, "O-4": 2589, "O-5": 2607, "O-6": 2628, "O-7": 2652
    }
  },

  "Ramstein AB": {
    base: "Ramstein AB",
    dutyZip: "09094",
    mhaCode: "OHA",
    mhaName: "Overseas Housing Allowance / Germany",
    with: {
      "E-1": 0, "E-2": 0, "E-3": 0, "E-4": 0, "E-5": 0,
      "E-6": 0, "E-7": 0, "E-8": 0, "E-9": 0,
      "W-1": 0, "W-2": 0, "W-3": 0, "W-4": 0, "W-5": 0,
      "O-1E": 0, "O-2E": 0, "O-3E": 0,
      "O-1": 0, "O-2": 0, "O-3": 0, "O-4": 0, "O-5": 0, "O-6": 0, "O-7": 0
    },
    without: {
      "E-1": 0, "E-2": 0, "E-3": 0, "E-4": 0, "E-5": 0,
      "E-6": 0, "E-7": 0, "E-8": 0, "E-9": 0,
      "W-1": 0, "W-2": 0, "W-3": 0, "W-4": 0, "W-5": 0,
      "O-1E": 0, "O-2E": 0, "O-3E": 0,
      "O-1": 0, "O-2": 0, "O-3": 0, "O-4": 0, "O-5": 0, "O-6": 0, "O-7": 0
    }
  },

  "Randolph AFB": {
    base: "Randolph AFB",
    dutyZip: "78150",
    mhaCode: "TX279",
    mhaName: "San Antonio TX",
    with: {
      "E-1": 1815, "E-2": 1815, "E-3": 1815, "E-4": 1815, "E-5": 1914,
      "E-6": 2175, "E-7": 2208, "E-8": 2241, "E-9": 2301,
      "W-1": 2181, "W-2": 2217, "W-3": 2253, "W-4": 2313, "W-5": 2388,
      "O-1E": 2190, "O-2E": 2232, "O-3E": 2325,
      "O-1": 1950, "O-2": 2175, "O-3": 2244, "O-4": 2400, "O-5": 2427, "O-6": 2448, "O-7": 2466
    },
    without: {
      "E-1": 1416, "E-2": 1416, "E-3": 1416, "E-4": 1416, "E-5": 1533,
      "E-6": 1785, "E-7": 1911, "E-8": 2067, "E-9": 2148,
      "W-1": 1797, "W-2": 1959, "W-3": 2085, "W-4": 2163, "W-5": 2178,
      "O-1E": 1902, "O-2E": 2067, "O-3E": 2172,
      "O-1": 1524, "O-2": 1782, "O-3": 2121, "O-4": 2187, "O-5": 2202, "O-6": 2220, "O-7": 2238
    }
  },

  "Robins AFB": {
    base: "Robins AFB",
    dutyZip: "31098",
    mhaCode: "GA081",
    mhaName: "Warner Robins GA",
    with: {
      "E-1": 1479, "E-2": 1479, "E-3": 1479, "E-4": 1479, "E-5": 1623,
      "E-6": 1851, "E-7": 1878, "E-8": 1908, "E-9": 1959,
      "W-1": 1857, "W-2": 1890, "W-3": 1920, "W-4": 1971, "W-5": 2034,
      "O-1E": 1863, "O-2E": 1902, "O-3E": 1980,
      "O-1": 1659, "O-2": 1851, "O-3": 1911, "O-4": 2043, "O-5": 2067, "O-6": 2085, "O-7": 2100
    },
    without: {
      "E-1": 1155, "E-2": 1155, "E-3": 1155, "E-4": 1155, "E-5": 1305,
      "E-6": 1521, "E-7": 1629, "E-8": 1761, "E-9": 1830,
      "W-1": 1530, "W-2": 1668, "W-3": 1776, "W-4": 1845, "W-5": 1857,
      "O-1E": 1620, "O-2E": 1761, "O-3E": 1851,
      "O-1": 1299, "O-2": 1518, "O-3": 1809, "O-4": 1863, "O-5": 1878, "O-6": 1890, "O-7": 1905
    }
  },

  "Scott AFB": {
    base: "Scott AFB",
    dutyZip: "62225",
    mhaCode: "IL345",
    mhaName: "St Louis MO / IL Metro",
    with: {
      "E-1": 1830, "E-2": 1830, "E-3": 1830, "E-4": 1830, "E-5": 1998,
      "E-6": 2280, "E-7": 2316, "E-8": 2352, "E-9": 2415,
      "W-1": 2286, "W-2": 2328, "W-3": 2364, "W-4": 2427, "W-5": 2505,
      "O-1E": 2295, "O-2E": 2340, "O-3E": 2436,
      "O-1": 2043, "O-2": 2280, "O-3": 2355, "O-4": 2517, "O-5": 2547, "O-6": 2568, "O-7": 2589
    },
    without: {
      "E-1": 1428, "E-2": 1428, "E-3": 1428, "E-4": 1428, "E-5": 1605,
      "E-6": 1872, "E-7": 2004, "E-8": 2169, "E-9": 2256,
      "W-1": 1887, "W-2": 2055, "W-3": 2190, "W-4": 2274, "W-5": 2289,
      "O-1E": 1995, "O-2E": 2169, "O-3E": 2280,
      "O-1": 1596, "O-2": 1869, "O-3": 2223, "O-4": 2289, "O-5": 2307, "O-6": 2328, "O-7": 2349
    }
  },

  "Seymour-Johnson AFB": {
    base: "Seymour-Johnson AFB",
    dutyZip: "27531",
    mhaCode: "NC178",
    mhaName: "Goldsboro NC",
    with: {
      "E-1": 1386, "E-2": 1386, "E-3": 1386, "E-4": 1386, "E-5": 1521,
      "E-6": 1734, "E-7": 1761, "E-8": 1788, "E-9": 1836,
      "W-1": 1740, "W-2": 1770, "W-3": 1800, "W-4": 1848, "W-5": 1908,
      "O-1E": 1746, "O-2E": 1782, "O-3E": 1854,
      "O-1": 1554, "O-2": 1734, "O-3": 1791, "O-4": 1917, "O-5": 1938, "O-6": 1956, "O-7": 1971
    },
    without: {
      "E-1": 1083, "E-2": 1083, "E-3": 1083, "E-4": 1083, "E-5": 1221,
      "E-6": 1425, "E-7": 1527, "E-8": 1650, "E-9": 1716,
      "W-1": 1434, "W-2": 1560, "W-3": 1662, "W-4": 1725, "W-5": 1737,
      "O-1E": 1518, "O-2E": 1650, "O-3E": 1734,
      "O-1": 1215, "O-2": 1422, "O-3": 1692, "O-4": 1743, "O-5": 1758, "O-6": 1770, "O-7": 1785
    }
  },

  "Shaw AFB": {
    base: "Shaw AFB",
    dutyZip: "29152",
    mhaCode: "SC260",
    mhaName: "Sumter SC",
    with: {
      "E-1": 1326, "E-2": 1326, "E-3": 1326, "E-4": 1326, "E-5": 1455,
      "E-6": 1659, "E-7": 1683, "E-8": 1710, "E-9": 1755,
      "W-1": 1665, "W-2": 1695, "W-3": 1722, "W-4": 1767, "W-5": 1824,
      "O-1E": 1671, "O-2E": 1704, "O-3E": 1773,
      "O-1": 1488, "O-2": 1659, "O-3": 1713, "O-4": 1833, "O-5": 1854, "O-6": 1869, "O-7": 1884
    },
    without: {
      "E-1": 1035, "E-2": 1035, "E-3": 1035, "E-4": 1035, "E-5": 1167,
      "E-6": 1362, "E-7": 1458, "E-8": 1578, "E-9": 1641,
      "W-1": 1371, "W-2": 1491, "W-3": 1587, "W-4": 1647, "W-5": 1659,
      "O-1E": 1452, "O-2E": 1578, "O-3E": 1659,
      "O-1": 1161, "O-2": 1359, "O-3": 1617, "O-4": 1665, "O-5": 1680, "O-6": 1695, "O-7": 1710
    }
  },

  "Sheppard AFB": {
    base: "Sheppard AFB",
    dutyZip: "76311",
    mhaCode: "TX278",
    mhaName: "Wichita Falls TX",
    with: {
      "E-1": 1260, "E-2": 1260, "E-3": 1260, "E-4": 1260, "E-5": 1386,
      "E-6": 1581, "E-7": 1605, "E-8": 1629, "E-9": 1674,
      "W-1": 1587, "W-2": 1614, "W-3": 1641, "W-4": 1683, "W-5": 1737,
      "O-1E": 1593, "O-2E": 1623, "O-3E": 1692,
      "O-1": 1416, "O-2": 1581, "O-3": 1632, "O-4": 1746, "O-5": 1767, "O-6": 1782, "O-7": 1797
    },
    without: {
      "E-1": 984, "E-2": 984, "E-3": 984, "E-4": 984, "E-5": 1113,
      "E-6": 1299, "E-7": 1392, "E-8": 1506, "E-9": 1566,
      "W-1": 1308, "W-2": 1425, "W-3": 1518, "W-4": 1575, "W-5": 1584,
      "O-1E": 1386, "O-2E": 1506, "O-3E": 1584,
      "O-1": 1107, "O-2": 1296, "O-3": 1542, "O-4": 1590, "O-5": 1602, "O-6": 1614, "O-7": 1629
    }
  },

  "Tinker AFB": {
    base: "Tinker AFB",
    dutyZip: "73145",
    mhaCode: "OK237",
    mhaName: "Oklahoma City OK",
    with: {
      "E-1": 1569, "E-2": 1569, "E-3": 1569, "E-4": 1569, "E-5": 1719,
      "E-6": 1962, "E-7": 1992, "E-8": 2022, "E-9": 2076,
      "W-1": 1968, "W-2": 2001, "W-3": 2034, "W-4": 2088, "W-5": 2154,
      "O-1E": 1977, "O-2E": 2013, "O-3E": 2097,
      "O-1": 1761, "O-2": 1962, "O-3": 2025, "O-4": 2166, "O-5": 2190, "O-6": 2208, "O-7": 2226
    },
    without: {
      "E-1": 1224, "E-2": 1224, "E-3": 1224, "E-4": 1224, "E-5": 1380,
      "E-6": 1611, "E-7": 1725, "E-8": 1866, "E-9": 1941,
      "W-1": 1620, "W-2": 1767, "W-3": 1881, "W-4": 1953, "W-5": 1965,
      "O-1E": 1716, "O-2E": 1866, "O-3E": 1962,
      "O-1": 1374, "O-2": 1608, "O-3": 1914, "O-4": 1971, "O-5": 1989, "O-6": 2001, "O-7": 2016
    }
  },

  "Travis AFB": {
    base: "Travis AFB",
    dutyZip: "94535",
    mhaCode: "CA040",
    mhaName: "Fairfield / Vacaville CA",
    with: {
      "E-1": 2730, "E-2": 2730, "E-3": 2730, "E-4": 2730, "E-5": 2931,
      "E-6": 3345, "E-7": 3396, "E-8": 3447, "E-9": 3540,
      "W-1": 3354, "W-2": 3411, "W-3": 3462, "W-4": 3555, "W-5": 3669,
      "O-1E": 3366, "O-2E": 3429, "O-3E": 3570,
      "O-1": 2997, "O-2": 3342, "O-3": 3450, "O-4": 3690, "O-5": 3732, "O-6": 3765, "O-7": 3792
    },
    without: {
      "E-1": 2130, "E-2": 2130, "E-3": 2130, "E-4": 2130, "E-5": 2349,
      "E-6": 2739, "E-7": 2934, "E-8": 3174, "E-9": 3300,
      "W-1": 2760, "W-2": 3006, "W-3": 3204, "W-4": 3324, "W-5": 3348,
      "O-1E": 2922, "O-2E": 3174, "O-3E": 3333,
      "O-1": 2337, "O-2": 2736, "O-3": 3252, "O-4": 3351, "O-5": 3375, "O-6": 3411, "O-7": 3441
    }
  },

  "Vandenberg SFB": {
    base: "Vandenberg SFB",
    dutyZip: "93437",
    mhaCode: "CA039",
    mhaName: "Santa Barbara County CA",
    with: {
      "E-1": 3060, "E-2": 3060, "E-3": 3060, "E-4": 3060, "E-5": 3282,
      "E-6": 3747, "E-7": 3804, "E-8": 3861, "E-9": 3966,
      "W-1": 3756, "W-2": 3822, "W-3": 3879, "W-4": 3984, "W-5": 4110,
      "O-1E": 3771, "O-2E": 3843, "O-3E": 4002,
      "O-1": 3354, "O-2": 3744, "O-3": 3864, "O-4": 4134, "O-5": 4182, "O-6": 4218, "O-7": 4248
    },
    without: {
      "E-1": 2388, "E-2": 2388, "E-3": 2388, "E-4": 2388, "E-5": 2628,
      "E-6": 3069, "E-7": 3288, "E-8": 3555, "E-9": 3696,
      "W-1": 3090, "W-2": 3366, "W-3": 3585, "W-4": 3720, "W-5": 3747,
      "O-1E": 3273, "O-2E": 3555, "O-3E": 3735,
      "O-1": 2619, "O-2": 3066, "O-3": 3645, "O-4": 3756, "O-5": 3783, "O-6": 3822, "O-7": 3855
    }
  },

  "Whiteman AFB": {
    base: "Whiteman AFB",
    dutyZip: "65305",
    mhaCode: "MO162",
    mhaName: "Johnson County MO",
    with: {
      "E-1": 1449, "E-2": 1449, "E-3": 1449, "E-4": 1449, "E-5": 1590,
      "E-6": 1815, "E-7": 1842, "E-8": 1869, "E-9": 1920,
      "W-1": 1821, "W-2": 1854, "W-3": 1881, "W-4": 1932, "W-5": 1995,
      "O-1E": 1827, "O-2E": 1863, "O-3E": 1941,
      "O-1": 1623, "O-2": 1815, "O-3": 1872, "O-4": 2004, "O-5": 2028, "O-6": 2046, "O-7": 2061
    },
    without: {
      "E-1": 1131, "E-2": 1131, "E-3": 1131, "E-4": 1131, "E-5": 1275,
      "E-6": 1488, "E-7": 1593, "E-8": 1725, "E-9": 1794,
      "W-1": 1497, "W-2": 1632, "W-3": 1737, "W-4": 1803, "W-5": 1818,
      "O-1E": 1584, "O-2E": 1725, "O-3E": 1815,
      "O-1": 1269, "O-2": 1485, "O-3": 1770, "O-4": 1824, "O-5": 1839, "O-6": 1854, "O-7": 1869
    }
  },

  "Wright-Patterson AFB": {
    base: "Wright-Patterson AFB",
    dutyZip: "45433",
    mhaCode: "OH228",
    mhaName: "Dayton OH",
    with: {
      "E-1": 1590, "E-2": 1590, "E-3": 1590, "E-4": 1590, "E-5": 1743,
      "E-6": 1989, "E-7": 2019, "E-8": 2052, "E-9": 2106,
      "W-1": 1995, "W-2": 2031, "W-3": 2061, "W-4": 2115, "W-5": 2184,
      "O-1E": 2004, "O-2E": 2043, "O-3E": 2127,
      "O-1": 1785, "O-2": 1989, "O-3": 2055, "O-4": 2196, "O-5": 2220, "O-6": 2238, "O-7": 2256
    },
    without: {
      "E-1": 1242, "E-2": 1242, "E-3": 1242, "E-4": 1242, "E-5": 1398,
      "E-6": 1635, "E-7": 1752, "E-8": 1896, "E-9": 1971,
      "W-1": 1644, "W-2": 1791, "W-3": 1908, "W-4": 1980, "W-5": 1992,
      "O-1E": 1743, "O-2E": 1896, "O-3E": 1992,
      "O-1": 1392, "O-2": 1632, "O-3": 1941, "O-4": 2001, "O-5": 2016, "O-6": 2031, "O-7": 2049
    }
  }
});

// ============================================================
// //#5) LOOKUPS
// ============================================================
export function getBaseRecord(base) {
  const canonicalBase = canonicalizeBase(base);
  const record = BAH_2026_BY_BASE[canonicalBase];

  if (!record) {
    throw new Error(`No BAH record found for base "${base}".`);
  }

  return record;
}

export function getBahRecord(base, rank, dependents) {
  const canonicalBase = canonicalizeBase(base);
  const record = getBaseRecord(canonicalBase);
  const rankKey = normalizeRank(rank);
  const depKey = normalizeDependents(dependents);

  assertSupportedRank(rankKey);

  const bah = Number(record[depKey]?.[rankKey]);

  if (!Number.isFinite(bah)) {
    throw new Error(
      `No BAH value found for base "${canonicalBase}", rank "${rankKey}", dependents "${depKey}".`
    );
  }

  return {
    base: record.base,
    canonicalBase,
    dutyZip: record.dutyZip,
    mhaCode: record.mhaCode,
    mhaName: record.mhaName,
    rank: rankKey,
    dependents: depKey,
    bah,
    monthlyBAH: bah,
    rateVersion: RATE_VERSION
  };
}

export function getBAH(base, rank, dependents) {
  return getBahRecord(base, rank, dependents).bah;
}

export function listSupportedBases() {
  return Object.freeze(Object.keys(BAH_2026_BY_BASE));
}

// ============================================================
// //#6) DEFAULT EXPORT
// ============================================================
export default Object.freeze({
  RATE_VERSION,
  SUPPORTED_RANKS,
  BASE_ALIASES,
  BASE_TO_ZIP,
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
  listSupportedBases
});
