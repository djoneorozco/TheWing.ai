/* =========================================================
   PCSUnited Base Demographics Map
   Map Engine v3.1.2
   Base Essentials Sidebar v2.1.0
========================================================= */

/* =========================================================
   MAP ENGINE
========================================================= */

(() => {
  "use strict";

  const VERSION = "3.1.2";
  const MOUNT_KEY = "PCSU_US_BASE_MAP_V312_MOUNTED";

  if (window[MOUNT_KEY]) {
    console.warn(
      "[PCSU Base Map] Duplicate mount blocked:",
      VERSION
    );

    return;
  }

  window[MOUNT_KEY] = true;

  const mapRoot =
    document.getElementById("pcsu-real-us-map");

  const svgElement =
    document.getElementById("pcsu-us-svg");

  const baseListEl =
    document.getElementById("pcsu-base-list");

  const selectedStateEl =
    document.getElementById("pcsu-selected-state");

  const selectedBaseHeaderEl =
    document.getElementById("pcsu-selected-base-header");

  const panelCopyEl =
    document.getElementById("pcsu-panel-copy");

  if (
    !mapRoot ||
    !svgElement ||
    !baseListEl
  ) {
    console.warn(
      "[PCSU Base Map] Required shell elements are missing."
    );

    return;
  }

  if (
    typeof window.d3 === "undefined" ||
    typeof window.topojson === "undefined"
  ) {
    console.warn(
      "[PCSU Base Map] D3 or TopoJSON is unavailable."
    );

    return;
  }

  const SCROLL_DEBUG =
    window.PCSU_SCROLL_DEBUG === true ||
    /(?:\?|&)pcsuScrollDebug=1(?:&|$)/.test(
      window.location.search || ""
    );

  function logScrollDebug(tag, extra) {
    if (!SCROLL_DEBUG) {
      return;
    }

    console.log(
      "[PCSU Scroll Debug · Base Map]",
      {
        tag,
        scrollX:
          window.scrollX ||
          window.pageXOffset ||
          0,

        scrollY:
          window.scrollY ||
          window.pageYOffset ||
          0,

        version: VERSION,

        ...(extra || {})
      }
    );
  }

  window.PCSU_US_BASE_MAP = {
    version: VERSION,
    __mounted_v312: true
  };

  const STORAGE_KEY =
    "pcsunited.selectedBase.v1";

  const JSON_URL_KEY =
    "pcsunited.selectedCityJsonUrl.v1";

  const SLUG_STORAGE_KEY =
    "pcsunited.selectedBaseSlug.v1";

  const LIVE_BASE_DEMOGRAPHICS_URL =
    "https://pcsunited-com-28346d.webflow.io/air-force/base-demographics-air-force";

  const JSON_BASE_URL =
    window.PCSU_CITIES_BASE_URL ||
    "https://thewing.netlify.app/api/base-data?file=";

  const DEFAULT_STATE = "TX";

  const FIPS_TO_ABBR = {
    "01": "AL",
    "02": "AK",
    "04": "AZ",
    "05": "AR",
    "06": "CA",
    "08": "CO",
    "09": "CT",
    "10": "DE",
    "11": "DC",
    "12": "FL",
    "13": "GA",
    "15": "HI",
    "16": "ID",
    "17": "IL",
    "18": "IN",
    "19": "IA",
    "20": "KS",
    "21": "KY",
    "22": "LA",
    "23": "ME",
    "24": "MD",
    "25": "MA",
    "26": "MI",
    "27": "MN",
    "28": "MS",
    "29": "MO",
    "30": "MT",
    "31": "NE",
    "32": "NV",
    "33": "NH",
    "34": "NJ",
    "35": "NM",
    "36": "NY",
    "37": "NC",
    "38": "ND",
    "39": "OH",
    "40": "OK",
    "41": "OR",
    "42": "PA",
    "44": "RI",
    "45": "SC",
    "46": "SD",
    "47": "TN",
    "48": "TX",
    "49": "UT",
    "50": "VT",
    "51": "VA",
    "53": "WA",
    "54": "WV",
    "55": "WI",
    "56": "WY"
  };

  const STATE_NAMES = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    MA: "Massachusetts",
    MD: "Maryland",
    ME: "Maine",
    MI: "Michigan",
    MN: "Minnesota",
    MO: "Missouri",
    MS: "Mississippi",
    MT: "Montana",
    NC: "North Carolina",
    ND: "North Dakota",
    NE: "Nebraska",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NV: "Nevada",
    NY: "New York",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VA: "Virginia",
    VT: "Vermont",
    WA: "Washington",
    WI: "Wisconsin",
    WV: "West Virginia",
    WY: "Wyoming",
    DC: "District of Columbia"
  };

  const BASE_REGISTRY = {
    AK: [
      [
        "Joint Base Elmendorf-Richardson",
        "Elmendorf.json",
        "Anchorage, AK",
        61.25,
        -149.8065
      ],
      [
        "Eielson AFB",
        "Eielson.json",
        "Fairbanks, AK",
        64.6657,
        -147.1015
      ]
    ],

    AL: [
      [
        "Maxwell AFB",
        "Maxwell.json",
        "Montgomery, AL",
        32.3829,
        -86.3658
      ]
    ],

    AZ: [
      [
        "Davis-Monthan AFB",
        "Davis-Monthan.json",
        "Tucson, AZ",
        32.1665,
        -110.8832
      ],
      [
        "Luke AFB",
        "Luke.json",
        "Glendale, AZ",
        33.535,
        -112.3832
      ]
    ],

    CA: [
      [
        "Beale AFB",
        "Beale.json",
        "Marysville, CA",
        39.1361,
        -121.4366
      ],
      [
        "Edwards AFB",
        "Edwards.json",
        "Edwards, CA",
        34.9054,
        -117.8837
      ],
      [
        "Los Angeles AFB",
        "Los-Angeles.json",
        "El Segundo, CA",
        33.9189,
        -118.3807
      ],
      [
        "Travis AFB",
        "Travis.json",
        "Fairfield, CA",
        38.2627,
        -121.9275
      ],
      [
        "Vandenberg SFB",
        "Vandenberg.json",
        "Lompoc, CA",
        34.742,
        -120.5724
      ]
    ],

    CO: [
      [
        "Peterson SFB",
        "Peterson.json",
        "Colorado Springs, CO",
        38.8236,
        -104.7006
      ],
      [
        "Schriever SFB",
        "Schriever.json",
        "Colorado Springs, CO",
        38.803,
        -104.5255
      ],
      [
        "U.S. Air Force Academy",
        "Air-Force-Academy.json",
        "Colorado Springs, CO",
        39.0088,
        -104.8911
      ]
    ],

    DE: [
      [
        "Dover AFB",
        "Dover.json",
        "Dover, DE",
        39.1295,
        -75.466
      ]
    ],

    FL: [
      [
        "Eglin AFB",
        "Eglin.json",
        "Valparaiso, FL",
        30.4832,
        -86.5254
      ],
      [
        "Hurlburt Field",
        "Hurlburt.json",
        "Mary Esther, FL",
        30.4278,
        -86.6893
      ],
      [
        "MacDill AFB",
        "MacDill.json",
        "Tampa, FL",
        27.8493,
        -82.5212
      ],
      [
        "Patrick SFB",
        "Patrick.json",
        "Cocoa Beach, FL",
        28.2349,
        -80.6101
      ],
      [
        "Tyndall AFB",
        "Tyndall.json",
        "Panama City, FL",
        30.0696,
        -85.5754
      ]
    ],

    GA: [
      [
        "Moody AFB",
        "Moody.json",
        "Valdosta, GA",
        30.9678,
        -83.193
      ],
      [
        "Robins AFB",
        "Robins.json",
        "Warner Robins, GA",
        32.6401,
        -83.5919
      ]
    ],

    HI: [
      [
        "Joint Base Pearl Harbor-Hickam",
        "Hickam.json",
        "Honolulu, HI",
        21.3187,
        -157.9224
      ]
    ],

    ID: [
      [
        "Mountain Home AFB",
        "Mountain-Home.json",
        "Mountain Home, ID",
        43.0436,
        -115.8724
      ]
    ],

    IL: [
      [
        "Scott AFB",
        "Scott.json",
        "Belleville, IL",
        38.5452,
        -89.8352
      ]
    ],

    KS: [
      [
        "McConnell AFB",
        "McConnell.json",
        "Wichita, KS",
        37.6231,
        -97.2672
      ]
    ],

    LA: [
      [
        "Barksdale AFB",
        "Barksdale.json",
        "Bossier City, LA",
        32.5018,
        -93.6627
      ]
    ],

    MA: [
      [
        "Hanscom AFB",
        "Hanscom.json",
        "Bedford, MA",
        42.4699,
        -71.289
      ]
    ],

    MD: [
      [
        "Joint Base Andrews",
        "Andrews.json",
        "Camp Springs, MD",
        38.8108,
        -76.8669
      ]
    ],

    MS: [
      [
        "Columbus AFB",
        "Columbus.json",
        "Columbus, MS",
        33.6438,
        -88.4438
      ],
      [
        "Keesler AFB",
        "Keesler.json",
        "Biloxi, MS",
        30.4104,
        -88.9244
      ]
    ],

    MT: [
      [
        "Malmstrom AFB",
        "Malmstrom.json",
        "Great Falls, MT",
        47.5053,
        -111.1873
      ]
    ],

    NC: [
      [
        "Seymour Johnson AFB",
        "Seymour-Johnson.json",
        "Goldsboro, NC",
        35.3394,
        -77.9606
      ]
    ],

    ND: [
      [
        "Grand Forks AFB",
        "Grand-Forks.json",
        "Grand Forks, ND",
        47.9611,
        -97.4012
      ],
      [
        "Minot AFB",
        "Minot.json",
        "Minot, ND",
        48.4158,
        -101.358
      ]
    ],

    NE: [
      [
        "Offutt AFB",
        "Offutt.json",
        "Bellevue, NE",
        41.1183,
        -95.9125
      ]
    ],

    NJ: [
      [
        "Joint Base McGuire-Dix-Lakehurst",
        "McGuire.json",
        "Wrightstown, NJ",
        40.0156,
        -74.5917
      ]
    ],

    NM: [
      [
        "Cannon AFB",
        "Cannon.json",
        "Clovis, NM",
        34.3828,
        -103.3221
      ],
      [
        "Holloman AFB",
        "Holloman.json",
        "Alamogordo, NM",
        32.8525,
        -106.1065
      ],
      [
        "Kirtland AFB",
        "Kirtland.json",
        "Albuquerque, NM",
        35.0402,
        -106.6092
      ]
    ],

    NV: [
      [
        "Creech AFB",
        "Creech.json",
        "Indian Springs, NV",
        36.5872,
        -115.6734
      ],
      [
        "Nellis AFB",
        "Nellis.json",
        "Las Vegas, NV",
        36.2362,
        -115.0343
      ]
    ],

    OH: [
      [
        "Wright-Patterson AFB",
        "Wright-Patterson.json",
        "Dayton, OH",
        39.8261,
        -84.0483
      ]
    ],

    OK: [
      [
        "Altus AFB",
        "Altus.json",
        "Altus, OK",
        34.6671,
        -99.2667
      ],
      [
        "Tinker AFB",
        "Tinker.json",
        "Oklahoma City, OK",
        35.4147,
        -97.3866
      ],
      [
        "Vance AFB",
        "Vance.json",
        "Enid, OK",
        36.3392,
        -97.9165
      ]
    ],

    SC: [
      [
        "Joint Base Charleston",
        "Charleston.json",
        "Charleston, SC",
        32.8986,
        -80.0405
      ],
      [
        "Shaw AFB",
        "Shaw.json",
        "Sumter, SC",
        33.9727,
        -80.4706
      ]
    ],

    SD: [
      [
        "Ellsworth AFB",
        "Ellsworth.json",
        "Rapid City, SD",
        44.145,
        -103.1036
      ]
    ],

    TX: [
      [
        "Dyess AFB",
        "Dyess.json",
        "Abilene, TX",
        32.4208,
        -99.8546
      ],
      [
        "Goodfellow AFB",
        "Goodfellow.json",
        "San Angelo, TX",
        31.4343,
        -100.4027
      ],
      [
        "Joint Base San Antonio-Lackland",
        "Lackland.json",
        "San Antonio, TX",
        29.3842,
        -98.5811
      ],
      [
        "Laughlin AFB",
        "Laughlin.json",
        "Del Rio, TX",
        29.3595,
        -100.778
      ],
      [
        "Joint Base San Antonio-Randolph",
        "Randolph.json",
        "San Antonio, TX",
        29.5297,
        -98.2789
      ],
      [
        "Sheppard AFB",
        "Sheppard.json",
        "Wichita Falls, TX",
        33.9888,
        -98.4919
      ]
    ],

    UT: [
      [
        "Hill AFB",
        "Hill.json",
        "Ogden, UT",
        41.124,
        -111.973
      ]
    ],

    VA: [
      [
        "Joint Base Langley-Eustis",
        "Langley.json",
        "Hampton, VA",
        37.0838,
        -76.3605
      ]
    ],

    WA: [
      [
        "Fairchild AFB",
        "Fairchild.json",
        "Spokane, WA",
        47.6151,
        -117.6558
      ],
      [
        "Joint Base Lewis-McChord",
        "McChord.json",
        "Tacoma, WA",
        47.1339,
        -122.4916
      ]
    ],

    WY: [
      [
        "F. E. Warren AFB",
        "F-E-Warren.json",
        "Cheyenne, WY",
        41.1339,
        -104.866
      ]
    ]
  };

  const BASICBRAIN_BASE_ALIASES = {
    "Andrews AFB": "MD",
    "Joint Base Andrews": "MD",

    "Barksdale AFB": "LA",
    "Beale AFB": "CA",
    "Cannon AFB": "NM",

    "Charleston AFB": "SC",
    "Joint Base Charleston": "SC",

    "Columbus AFB": "MS",
    "Creech AFB": "NV",
    "Davis-Monthan AFB": "AZ",
    "Dover AFB": "DE",
    "Dyess AFB": "TX",
    "Edwards AFB": "CA",
    "Eglin AFB": "FL",
    "Eielson AFB": "AK",
    "Ellsworth AFB": "SD",
    "Elmendorf AFB": "AK",
    "Joint Base Elmendorf-Richardson": "AK",
    "Fairchild AFB": "WA",

    "FE Warren AFB": "WY",
    "F.E. Warren AFB": "WY",
    "F. E. Warren AFB": "WY",

    "Goodfellow AFB": "TX",
    "Grand Forks AFB": "ND",
    "Hanscom AFB": "MA",
    "Hickam AFB": "HI",
    "Joint Base Pearl Harbor-Hickam": "HI",
    "Hill AFB": "UT",
    "Holloman AFB": "NM",
    "Hurlburt Field": "FL",

    "JBSA Fort Sam Houston": "TX",
    "Fort Sam Houston": "TX",
    "Joint Base San Antonio-Fort Sam Houston": "TX",

    "JBSA Lackland": "TX",
    "Lackland AFB": "TX",
    "Joint Base San Antonio-Lackland": "TX",

    "JBSA Randolph": "TX",
    "Randolph AFB": "TX",
    "Joint Base San Antonio-Randolph": "TX",

    "Keesler AFB": "MS",
    "Kirtland AFB": "NM",

    "Langley AFB": "VA",
    "Joint Base Langley-Eustis": "VA",

    "Laughlin AFB": "TX",
    "Little Rock AFB": "AR",
    "Los Angeles AFB": "CA",
    "Luke AFB": "AZ",
    "MacDill AFB": "FL",
    "Malmstrom AFB": "MT",
    "Maxwell AFB": "AL",
    "McChord AFB": "WA",
    "Joint Base Lewis-McChord": "WA",
    "McConnell AFB": "KS",

    "McGuire AFB": "NJ",
    "Joint Base McGuire-Dix-Lakehurst": "NJ",

    "Minot AFB": "ND",
    "Moody AFB": "GA",
    "Mountain Home AFB": "ID",
    "Nellis AFB": "NV",
    "Offutt AFB": "NE",
    "Patrick SFB": "FL",
    "Peterson SFB": "CO",
    "Robins AFB": "GA",
    "Schriever SFB": "CO",
    "Scott AFB": "IL",
    "Seymour Johnson AFB": "NC",
    "Shaw AFB": "SC",
    "Sheppard AFB": "TX",
    "Tinker AFB": "OK",
    "Travis AFB": "CA",
    "Tyndall AFB": "FL",
    "U.S. Air Force Academy": "CO",
    "Air Force Academy": "CO",
    "Vance AFB": "OK",
    "Vandenberg SFB": "CA",
    "Whiteman AFB": "MO",
    "Wright-Patterson AFB": "OH"
  };

  const svg = d3.select(svgElement);

  let mapReady = false;

  let pendingStateCode = "";
  let pendingBaseId = "";

  let pendingAllowScroll = false;
  let pendingAllowSectionScroll = false;

  let currentStateCode = "";
  let currentBaseId = "";

  let projection = null;
  let markerLayer = null;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(fileName) {
    return String(fileName || "")
      .replace(/\.json$/i, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/jointbase/g, "jb")
      .replace(/airforcebase/g, "afb")
      .replace(/[^a-z0-9]/g, "");
  }

  function makeBase(row, stateCode) {
    const [
      name,
      fileName,
      city,
      lat,
      lng
    ] = row;

    const id = slugify(fileName);

    return {
      id,
      slug: id,
      fileName,

      base: name,
      label: name,
      name,

      city,

      state: stateCode,
      stateCode,

      lat,
      lng,

      jsonUrl:
        JSON_BASE_URL +
        fileName
    };
  }

  const STATE_BASES =
    Object.fromEntries(
      Object.entries(BASE_REGISTRY).map(
        ([stateCode, rows]) => [
          stateCode,
          rows.map(
            row =>
              makeBase(
                row,
                stateCode
              )
          )
        ]
      )
    );

  const BASE_TO_STATE = (() => {
    const out = {};

    Object.entries(STATE_BASES).forEach(
      ([stateCode, bases]) => {
        bases.forEach(base => {
          [
            base.base,
            base.name,
            base.label,
            base.fileName,
            base.id,
            base.slug
          ].forEach(value => {
            const key =
              normalizeKey(value);

            if (key) {
              out[key] = stateCode;
            }
          });
        });
      }
    );

    Object.entries(
      BASICBRAIN_BASE_ALIASES
    ).forEach(
      ([baseName, stateCode]) => {
        const key =
          normalizeKey(baseName);

        if (key) {
          out[key] = stateCode;
        }
      }
    );

    return out;
  })();

  function getDestinationUrl() {
    return new URL(
      LIVE_BASE_DEMOGRAPHICS_URL
    );
  }

  function getBaseDestinationUrl(item) {
    const destination =
      getDestinationUrl();

    if (item && item.id) {
      destination.searchParams.set(
        "base",
        item.id
      );
    }

    return destination;
  }

  function saveSelection(item) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(item)
      );

      localStorage.setItem(
        JSON_URL_KEY,
        item.jsonUrl || ""
      );

      localStorage.setItem(
        SLUG_STORAGE_KEY,
        item.id || ""
      );
    } catch (error) {
      console.warn(
        "[PCSU Base Map] Selection storage failed:",
        error
      );
    }
  }

  function dispatchBaseSelection(
    item,
    options
  ) {
    const opts =
      options &&
      typeof options === "object"
        ? options
        : {};

    const detail = {
      ...item,

      selectedBase: {
        ...item
      },

      autoNavigate:
        opts.autoNavigate === true,

      source:
        opts.source ||
        "pcsunited-interactive-base-map",

      updated_at:
        new Date().toISOString()
    };

    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:map-base-selected",
        {
          detail
        }
      )
    );
  }

  function openBase(item) {
    if (!item) {
      return;
    }

    saveSelection(item);

    dispatchBaseSelection(
      item,
      {
        autoNavigate: false,

        source:
          "pcsunited-interactive-base-map-card"
      }
    );

    const destination =
      getBaseDestinationUrl(item);

    window.open(
      destination.toString(),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function updateSidebarHeaderLink(
    selectedBase
  ) {
    if (!selectedBaseHeaderEl) {
      return;
    }

    if (!selectedBase) {
      selectedBaseHeaderEl.removeAttribute(
        "href"
      );

      selectedBaseHeaderEl.setAttribute(
        "aria-disabled",
        "true"
      );

      selectedBaseHeaderEl.setAttribute(
        "aria-label",
        "Choose a base to open Base Demographics"
      );

      selectedBaseHeaderEl.removeAttribute(
        "title"
      );

      return;
    }

    selectedBaseHeaderEl.href =
      getBaseDestinationUrl(
        selectedBase
      ).toString();

    selectedBaseHeaderEl.setAttribute(
      "aria-disabled",
      "false"
    );

    selectedBaseHeaderEl.setAttribute(
      "aria-label",
      `Open ${selectedBase.base} Base Demographics`
    );

    selectedBaseHeaderEl.title =
      `Open ${selectedBase.base} Base Demographics`;
  }

  function clearBaseMarker() {
    if (markerLayer) {
      markerLayer
        .selectAll("*")
        .remove();
    }
  }

  function drawBaseMarker(base) {
    clearBaseMarker();

    if (
      !base ||
      !markerLayer ||
      !projection
    ) {
      return;
    }

    const lat = Number(base.lat);
    const lng = Number(base.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const point =
      projection([lng, lat]);

    if (!point) {
      return;
    }

    const [x, y] = point;

    const label =
      base.base ||
      "Selected Base";

    const city =
      base.city ||
      "";

    let labelX = x + 18;
    let labelY = y - 18;

    if (x > 760) {
      labelX = x - 190;
    }

    if (y < 70) {
      labelY = y + 18;
    }

    const labelWidth =
      Math.max(
        126,
        Math.min(
          230,
          label.length * 7.2 + 26
        )
      );

    const group =
      markerLayer
        .append("g")
        .attr(
          "class",
          "pcsu-base-marker"
        )
        .attr(
          "transform",
          `translate(${x},${y})`
        );

    group
      .append("circle")
      .attr(
        "class",
        "pcsu-base-marker-ring"
      )
      .attr("r", 5);

    group
      .append("circle")
      .attr(
        "class",
        "pcsu-base-marker-dot"
      )
      .attr("r", 6);

    group
      .append("path")
      .attr(
        "class",
        "pcsu-base-marker-pin"
      )
      .attr(
        "d",
        "M0,-14 C7,-14 12,-9 12,-2 C12,7 0,17 0,17 C0,17 -12,7 -12,-2 C-12,-9 -7,-14 0,-14 Z"
      )
      .attr(
        "transform",
        "translate(0,-12)"
      );

    group
      .append("circle")
      .attr("fill", "#071018")
      .attr("r", 3.3)
      .attr(
        "transform",
        "translate(0,-14)"
      );

    const labelGroup =
      markerLayer
        .append("g")
        .attr(
          "class",
          "pcsu-base-marker-label-group"
        )
        .attr(
          "transform",
          `translate(${labelX},${labelY})`
        );

    labelGroup
      .append("rect")
      .attr(
        "class",
        "pcsu-base-marker-label-bg"
      )
      .attr(
        "width",
        labelWidth
      )
      .attr("height", 42)
      .attr("x", 0)
      .attr("y", 0);

    labelGroup
      .append("text")
      .attr(
        "class",
        "pcsu-base-marker-label"
      )
      .attr("x", 12)
      .attr("y", 17)
      .text(label);

    labelGroup
      .append("text")
      .attr(
        "class",
        "pcsu-base-marker-sub"
      )
      .attr("x", 12)
      .attr("y", 31)
      .text(city);
  }

  function scrollSelectedButtonIntoList(
    selectedButton
  ) {
    if (
      !selectedButton ||
      !baseListEl
    ) {
      return;
    }

    const listLeft =
      baseListEl.scrollLeft;

    const listWidth =
      baseListEl.clientWidth;

    const buttonLeft =
      selectedButton.offsetLeft;

    const buttonWidth =
      selectedButton.offsetWidth;

    const nextScroll =
      Math.max(
        0,
        buttonLeft -
          Math.max(
            0,
            (
              listWidth -
              buttonWidth
            ) / 2
          )
      );

    if (
      Math.abs(
        nextScroll -
        listLeft
      ) > 2
    ) {
      baseListEl.scrollTo({
        left: nextScroll,
        behavior: "smooth"
      });
    }
  }

  function scrollMapSectionIntoView() {
    if (!mapRoot) {
      return;
    }

    logScrollDebug(
      "intentional-map-scroll:before"
    );

    mapRoot.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    setTimeout(() => {
      logScrollDebug(
        "intentional-map-scroll:after"
      );
    }, 400);
  }

  function getBaseById(
    stateCode,
    baseId
  ) {
    const bases =
      STATE_BASES[
        String(
          stateCode || ""
        ).toUpperCase()
      ] || [];

    return (
      bases.find(
        base =>
          base.id === baseId
      ) || null
    );
  }

  function updateSelectedBasePanel(
    stateCode,
    selectedBase,
    bases
  ) {
    if (!selectedStateEl) {
      return;
    }

    if (selectedBase) {
      selectedStateEl.textContent =
        selectedBase.base;

      updateSidebarHeaderLink(
        selectedBase
      );

      if (panelCopyEl) {
        panelCopyEl.textContent =
          "Open the selected gaining base profile.";
      }

      return;
    }

    selectedStateEl.textContent =
      "Choose a base";

    updateSidebarHeaderLink(null);

    if (panelCopyEl) {
      const stateName =
        STATE_NAMES[stateCode] ||
        stateCode;

      if (bases && bases.length) {
        panelCopyEl.textContent =
          `${bases.length} supported base profile${bases.length > 1 ? "s" : ""} available in ${stateName}. Select a base above.`;
      } else {
        panelCopyEl.textContent =
          "PCSUnited does not have supported Base Demographics profiles for this state yet.";
      }
    }
  }

  function emitMapState(
    stateCode,
    selectedBase
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:base-map-updated",
        {
          detail: {
            source:
              "pcsunited-interactive-base-map",

            state:
              stateCode,

            stateCode,

            stateName:
              STATE_NAMES[stateCode] ||
              stateCode,

            baseId:
              selectedBase
                ? selectedBase.id
                : "",

            selectedBase:
              selectedBase
                ? {
                    ...selectedBase
                  }
                : null,

            updated_at:
              new Date().toISOString()
          }
        }
      )
    );
  }

  function renderState(
    stateCode,
    selectedBaseId,
    options
  ) {
    const opts =
      options &&
      typeof options === "object"
        ? options
        : {};

    const allowScroll =
      opts.allowScroll === true;

    const allowSectionScroll =
      opts.allowSectionScroll === true;

    const beforeY =
      window.scrollY ||
      window.pageYOffset ||
      0;

    const safeState =
      String(
        stateCode || ""
      ).toUpperCase();

    let safeBaseId =
      String(
        selectedBaseId || ""
      ).trim();

    if (
      !safeBaseId &&
      safeState === currentStateCode &&
      currentBaseId
    ) {
      safeBaseId =
        currentBaseId;
    }

    logScrollDebug(
      "renderState:before",
      {
        stateCode: safeState,
        selectedBaseId: safeBaseId,
        allowScroll,
        allowSectionScroll
      }
    );

    if (!safeState) {
      return;
    }

    if (!mapReady) {
      pendingStateCode =
        safeState;

      pendingBaseId =
        safeBaseId;

      pendingAllowScroll =
        allowScroll;

      pendingAllowSectionScroll =
        allowSectionScroll;

      return;
    }

    const bases =
      STATE_BASES[safeState] ||
      [];

    currentStateCode =
      safeState;

    currentBaseId =
      safeBaseId;

    svg
      .selectAll(".pcsu-state")
      .classed(
        "is-active",
        false
      );

    svg
      .select(
        `#state-${safeState}`
      )
      .classed(
        "is-active",
        true
      );

    if (!bases.length) {
      baseListEl.innerHTML = "";

      clearBaseMarker();

      updateSelectedBasePanel(
        safeState,
        null,
        bases
      );

      emitMapState(
        safeState,
        null
      );

      logScrollDebug(
        "renderState:after-empty",
        {
          deltaY:
            (
              window.scrollY ||
              0
            ) -
            beforeY
        }
      );

      return;
    }

    baseListEl.innerHTML =
      bases
        .map(
          base => `
            <button
              class="pcsu-base-btn${base.id === currentBaseId ? " is-selected" : ""}"
              type="button"
              data-base-id="${esc(base.id)}"
              aria-label="Open ${esc(base.base)} Base Demographics"
              aria-pressed="${base.id === currentBaseId ? "true" : "false"}">

              <span class="pcsu-base-name">
                ${esc(base.base)}
              </span>

              <span class="pcsu-base-meta">
                ${esc(base.city)} • Open Base Demographics
              </span>
            </button>
          `
        )
        .join("");

    baseListEl
      .querySelectorAll(
        ".pcsu-base-btn"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            const selected =
              bases.find(
                base =>
                  base.id ===
                  button.dataset.baseId
              );

            if (selected) {
              openBase(selected);
            }
          }
        );
      });

    const selectedBase =
      getBaseById(
        safeState,
        currentBaseId
      );

    if (selectedBase) {
      drawBaseMarker(
        selectedBase
      );
    } else {
      clearBaseMarker();
    }

    updateSelectedBasePanel(
      safeState,
      selectedBase,
      bases
    );

    emitMapState(
      safeState,
      selectedBase
    );

    const selectedButton =
      baseListEl.querySelector(
        ".pcsu-base-btn.is-selected"
      );

    if (
      selectedButton &&
      allowScroll
    ) {
      scrollSelectedButtonIntoList(
        selectedButton
      );
    }

    if (allowSectionScroll) {
      scrollMapSectionIntoView();
    }

    const afterY =
      window.scrollY ||
      window.pageYOffset ||
      0;

    logScrollDebug(
      "renderState:after",
      {
        deltaY:
          afterY -
          beforeY,

        allowScroll,
        allowSectionScroll
      }
    );
  }

  function findStateFromBaseName(
    baseName
  ) {
    const key =
      normalizeKey(baseName);

    if (!key) {
      return "";
    }

    if (BASE_TO_STATE[key]) {
      return BASE_TO_STATE[key];
    }

    const foundKey =
      Object.keys(
        BASE_TO_STATE
      ).find(
        existingKey =>
          existingKey.includes(key) ||
          key.includes(existingKey)
      );

    return foundKey
      ? BASE_TO_STATE[foundKey]
      : "";
  }

  function findBaseIdInState(
    stateCode,
    baseName
  ) {
    const safeState =
      String(
        stateCode || ""
      ).toUpperCase();

    const bases =
      STATE_BASES[safeState] ||
      [];

    const key =
      normalizeKey(baseName);

    if (
      !safeState ||
      !key ||
      !bases.length
    ) {
      return "";
    }

    const exact =
      bases.find(base => {
        return [
          base.base,
          base.name,
          base.label,
          base.fileName,
          base.id,
          base.slug
        ].some(
          value =>
            normalizeKey(value) ===
            key
        );
      });

    if (exact) {
      return exact.id;
    }

    const fuzzy =
      bases.find(base => {
        return [
          base.base,
          base.name,
          base.label,
          base.fileName,
          base.id,
          base.slug
        ].some(value => {
          const baseKey =
            normalizeKey(value);

          return (
            baseKey.includes(key) ||
            key.includes(baseKey)
          );
        });
      });

    return fuzzy
      ? fuzzy.id
      : "";
  }

  function findSelectionFromDetail(
    detail
  ) {
    const data =
      detail &&
      typeof detail === "object"
        ? detail
        : {};

    const basicbrain =
      data.basicbrain &&
      typeof data.basicbrain === "object"
        ? data.basicbrain
        : {};

    const profile =
      data.profile &&
      typeof data.profile === "object"
        ? data.profile
        : {};

    const bridge =
      data.bridge &&
      typeof data.bridge === "object"
        ? data.bridge
        : {};

    const directSelectedBase =
      data.selectedBase &&
      typeof data.selectedBase === "object"
        ? data.selectedBase
        : {};

    const basicBrainSelectedBase =
      basicbrain.selectedBase &&
      typeof basicbrain.selectedBase === "object"
        ? basicbrain.selectedBase
        : {};

    const selectedBase = {
      ...basicBrainSelectedBase,
      ...directSelectedBase
    };

    const directState =
      selectedBase.state ||
      selectedBase.stateCode ||
      profile.stateCode ||
      profile.state ||
      bridge.stateCode ||
      bridge.state ||
      basicbrain.stateCode ||
      basicbrain.state ||
      data.stateCode ||
      (
        typeof data.state === "string"
          ? data.state
          : ""
      ) ||
      "";

    const baseName =
      selectedBase.base ||
      selectedBase.name ||
      selectedBase.label ||

      profile.selected_base ||
      (
        typeof profile.selectedBase === "string"
          ? profile.selectedBase
          : ""
      ) ||
      profile.pcs_base ||
      profile.pcsBase ||
      profile.current_base ||
      profile.currentBase ||
      profile.base ||

      bridge.selected_base ||
      (
        typeof bridge.selectedBase === "string"
          ? bridge.selectedBase
          : ""
      ) ||
      bridge.pcs_base ||
      bridge.pcsBase ||
      bridge.current_base ||
      bridge.currentBase ||
      bridge.base ||

      basicbrain.selected_base ||
      (
        typeof basicbrain.selectedBase === "string"
          ? basicbrain.selectedBase
          : ""
      ) ||
      basicbrain.pcs_base ||
      basicbrain.pcsBase ||
      basicbrain.current_base ||
      basicbrain.currentBase ||
      basicbrain.base ||

      (
        typeof data.base === "string"
          ? data.base
          : ""
      ) ||
      data.name ||
      data.label ||
      "";

    const normalizedState =
      String(
        directState || ""
      ).toUpperCase();

    const stateCode =
      normalizedState &&
      STATE_NAMES[normalizedState]
        ? normalizedState
        : findStateFromBaseName(
            baseName
          );

    if (!stateCode) {
      return {
        stateCode: "",
        baseId: "",
        baseName: ""
      };
    }

    return {
      stateCode,

      baseId:
        findBaseIdInState(
          stateCode,
          baseName
        ),

      baseName:
        baseName || ""
    };
  }

  function preselectFromDetail(
    detail,
    options
  ) {
    const selection =
      findSelectionFromDetail(
        detail
      );

    if (!selection.stateCode) {
      return false;
    }

    renderState(
      selection.stateCode,
      selection.baseId,
      options
    );

    return true;
  }

  function preselectFromCurrentBasicBrain() {
    const candidates = [
      window.PCSU_BASICBRAIN_CURRENT,
      window.PCSU_BASICBRAIN_TEMP,
      window.PCSU_BASICBRAIN?.getLastGood?.(),
      window.PCSU_BASICBRAIN?.getState?.()
    ];

    for (const candidate of candidates) {
      if (
        preselectFromDetail(
          candidate,
          {
            allowScroll: false,
            allowSectionScroll: false
          }
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function isIntentionalNavigation(
    detail
  ) {
    return Boolean(
      detail &&
      typeof detail === "object" &&
      detail.autoNavigate === true
    );
  }

  function handlePassiveBaseSelection(
    detail
  ) {
    logScrollDebug(
      "passive-base-selection",
      {
        source:
          detail?.source ||
          "unknown"
      }
    );

    preselectFromDetail(
      detail,
      {
        allowScroll: false,
        allowSectionScroll: false
      }
    );
  }

  function handleIntentionalBaseSelection(
    detail
  ) {
    logScrollDebug(
      "intentional-base-selection",
      {
        source:
          detail?.source ||
          "unknown"
      }
    );

    preselectFromDetail(
      detail,
      {
        allowScroll: true,
        allowSectionScroll: true
      }
    );
  }

  function bindNavigationEvents() {
    [
      "pcsunited:basicbrain-updated",
      "pcsunited:base-preview-ready",
      "pcsunited:profile-ready",
      "pcsunited:bridge-ready",
      "pcsunited:compensation-ready"
    ].forEach(eventName => {
      window.addEventListener(
        eventName,
        event => {
          handlePassiveBaseSelection(
            event.detail || {}
          );
        }
      );
    });

    window.addEventListener(
      "pcsu:base-selected",
      event => {
        const detail =
          event.detail || {};

        if (
          isIntentionalNavigation(
            detail
          )
        ) {
          handleIntentionalBaseSelection(
            detail
          );

          return;
        }

        handlePassiveBaseSelection(
          detail
        );
      }
    );

    window.addEventListener(
      "message",
      event => {
        const data =
          event &&
          event.data &&
          typeof event.data === "object"
            ? event.data
            : {};

        if (
          data.type ===
          "pcsunited-basicbrain"
        ) {
          handlePassiveBaseSelection(
            data
          );
        }
      }
    );
  }

  window.PCSU_US_BASE_MAP.renderState =
    renderState;

  window.PCSU_US_BASE_MAP.selectState =
    renderState;

  window.PCSU_US_BASE_MAP.preselectFromBasicBrain =
    (detail, options) =>
      preselectFromDetail(
        detail,
        options
      );

  window.PCSU_US_BASE_MAP.findSelectionFromDetail =
    findSelectionFromDetail;

  window.PCSU_US_BASE_MAP.getCurrentState =
    () => currentStateCode;

  window.PCSU_US_BASE_MAP.getCurrentBase =
    () => currentBaseId;

  window.PCSU_US_BASE_MAP.getStateBases =
    stateCode => [
      ...(
        STATE_BASES[
          String(
            stateCode || ""
          ).toUpperCase()
        ] || []
      )
    ];

  window.PCSU_US_BASE_MAP.getSelectedBase =
    () =>
      getBaseById(
        currentStateCode,
        currentBaseId
      );

  window.PCSU_US_BASE_MAP.openBase =
    item => openBase(item);

  window.PCSU_US_BASE_MAP.getDestinationUrl =
    item =>
      getBaseDestinationUrl(
        item
      ).toString();

  window.PCSU_US_BASE_MAP.logScrollDebug =
    logScrollDebug;

  bindNavigationEvents();

  d3.json(
    "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
  )
    .then(us => {
      const states =
        topojson
          .feature(
            us,
            us.objects.states
          )
          .features;

      projection =
        d3
          .geoAlbersUsa()
          .translate([480, 300])
          .scale(1250);

      const path =
        d3.geoPath(
          projection
        );

      svg
        .append("g")
        .attr(
          "class",
          "pcsu-state-layer"
        )
        .selectAll("path")
        .data(states)
        .join("path")
        .attr("class", state => {
          const stateCode =
            FIPS_TO_ABBR[
              String(
                state.id
              ).padStart(
                2,
                "0"
              )
            ];

          return STATE_BASES[stateCode]
            ? "pcsu-state has-bases"
            : "pcsu-state";
        })
        .attr("id", state => {
          const stateCode =
            FIPS_TO_ABBR[
              String(
                state.id
              ).padStart(
                2,
                "0"
              )
            ];

          return `state-${stateCode}`;
        })
        .attr("d", path)
        .on(
          "click",
          (event, state) => {
            const stateCode =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            renderState(
              stateCode,
              "",
              {
                allowScroll: false,
                allowSectionScroll: false
              }
            );
          }
        );

      svg
        .append("path")
        .datum(
          topojson.mesh(
            us,
            us.objects.states,
            (a, b) =>
              a !== b
          )
        )
        .attr("fill", "none")
        .attr(
          "stroke",
          "rgba(16,20,38,.75)"
        )
        .attr(
          "stroke-width",
          1
        )
        .attr(
          "pointer-events",
          "none"
        )
        .attr("d", path);

      svg
        .append("g")
        .attr(
          "class",
          "pcsu-state-label-layer"
        )
        .selectAll("text")
        .data(states)
        .join("text")
        .attr(
          "class",
          "pcsu-state-label"
        )
        .attr("x", state => {
          const centroid =
            path.centroid(state);

          return Number.isFinite(
            centroid[0]
          )
            ? centroid[0]
            : -100;
        })
        .attr("y", state => {
          const centroid =
            path.centroid(state);

          return Number.isFinite(
            centroid[1]
          )
            ? centroid[1]
            : -100;
        })
        .text(state => {
          return (
            FIPS_TO_ABBR[
              String(
                state.id
              ).padStart(
                2,
                "0"
              )
            ] || ""
          );
        })
        .style(
          "display",
          state => {
            const stateCode =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            return [
              "RI",
              "DE",
              "CT",
              "NJ",
              "MD",
              "MA",
              "DC"
            ].includes(stateCode)
              ? "none"
              : "block";
          }
        );

      markerLayer =
        svg
          .append("g")
          .attr(
            "id",
            "pcsu-base-marker-layer"
          );

      mapReady = true;

      if (pendingStateCode) {
        renderState(
          pendingStateCode,
          pendingBaseId,
          {
            allowScroll:
              pendingAllowScroll,

            allowSectionScroll:
              pendingAllowSectionScroll
          }
        );
      } else if (
        !preselectFromCurrentBasicBrain()
      ) {
        renderState(
          DEFAULT_STATE,
          "",
          {
            allowScroll: false,
            allowSectionScroll: false
          }
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "pcsunited:base-map-ready",
          {
            detail: {
              source:
                "pcsunited-interactive-base-map",

              version:
                VERSION,

              state:
                currentStateCode,

              baseId:
                currentBaseId,

              selectedBase:
                getBaseById(
                  currentStateCode,
                  currentBaseId
                ),

              updated_at:
                new Date().toISOString()
            }
          }
        )
      );
    })
    .catch(error => {
      console.warn(
        "[PCSU Base Map] Map data could not load:",
        error
      );

      updateSidebarHeaderLink(null);

      if (selectedStateEl) {
        selectedStateEl.textContent =
          "Map unavailable";
      }

      if (panelCopyEl) {
        panelCopyEl.textContent =
          "The map data could not load. Please refresh the page.";
      }

      baseListEl.innerHTML = `
        <div
          style="
            width:100%;
            padding:14px;
            border:1px solid rgba(255,255,255,.10);
            border-radius:14px;
            color:#aeb8db;
            font-size:12px;
            font-weight:700;
            line-height:1.5;
            text-align:center;
          ">
          The map data could not load. Please refresh the page.
        </div>
      `;
    });
})();

/* =========================================================
   BASE ESSENTIALS SIDEBAR
========================================================= */

(() => {
  "use strict";

  const VERSION = "2.1.0";

  const MOUNT_KEY =
    "PCSU_BASE_ESSENTIALS_SIDEBAR_V210_MOUNTED";

  const API =
    "https://thewing.netlify.app/api/base-data";

  if (window[MOUNT_KEY]) {
    return;
  }

  window[MOUNT_KEY] = true;

  const root =
    document.getElementById(
      "pcsu-base-essentials-module"
    );

  const slot =
    document.getElementById(
      "pcsu-map-sidebar-slot"
    );

  if (!root) {
    return;
  }

  if (
    slot &&
    root.parentElement !== slot
  ) {
    slot.innerHTML = "";
    slot.appendChild(root);
  }

  const $ =
    selector =>
      root.querySelector(
        selector
      );

  const el = {
    status:
      $("#pcsu-be-status"),

    statusText:
      $("#pcsu-be-status-text"),

    content:
      $("#pcsu-be-content"),

    visitorSection:
      $("#pcsu-be-visitor-section"),

    visitorName:
      $("#pcsu-be-visitor-name"),

    visitorDetails:
      $("#pcsu-be-visitor-details"),

    visitorLink:
      $("#pcsu-be-visitor-link"),

    gatesSection:
      $("#pcsu-be-gates-section"),

    gateList:
      $("#pcsu-be-gate-list"),

    extraGates:
      $("#pcsu-be-extra-gates"),

    gateToggle:
      $("#pcsu-be-gate-toggle"),

    housingSection:
      $("#pcsu-be-housing-section"),

    housingName:
      $("#pcsu-be-housing-name"),

    housingDetails:
      $("#pcsu-be-housing-details"),

    housingCall:
      $("#pcsu-be-housing-call"),

    housingEmail:
      $("#pcsu-be-housing-email"),

    housingLink:
      $("#pcsu-be-housing-link"),

    servicesSection:
      $("#pcsu-be-services-section"),

    serviceGrid:
      $("#pcsu-be-service-grid"),

    watchout:
      $("#pcsu-be-watchout"),

    watchoutTitle:
      $("#pcsu-be-watchout-title"),

    watchoutMessage:
      $("#pcsu-be-watchout-message")
  };

  let sequence = 0;
  let currentBase = null;
  let currentData = null;
  let currentFile = "";

  function clean(value) {
    return (
      value === undefined ||
      value === null
    )
      ? ""
      : String(value).trim();
  }

  function esc(value) {
    return clean(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normal(value) {
    return clean(value)
      .toLowerCase()
      .replace(
        /joint\s*base/g,
        "jb"
      )
      .replace(
        /air\s*force\s*base/g,
        "afb"
      )
      .replace(
        /space\s*force\s*base/g,
        "sfb"
      )
      .replace(
        /[^a-z0-9]/g,
        ""
      );
  }

  function safeUrl(value) {
    if (!clean(value)) {
      return "";
    }

    try {
      return new URL(
        value,
        window.location.origin
      ).toString();
    } catch (_) {
      return "";
    }
  }

  function phone(value) {
    const first =
      clean(value)
        .split("/")
        .map(
          item =>
            item.trim()
        )
        .find(Boolean) ||
      "";

    const normalized =
      first.replace(
        /[^0-9+]/g,
        ""
      );

    return normalized
      ? `tel:${normalized}`
      : "";
  }

  function email(value) {
    return clean(value)
      ? `mailto:${clean(value)}`
      : "";
  }

  function link(node, href) {
    if (!node) {
      return;
    }

    node.hidden = !href;

    if (href) {
      node.href = href;
    } else {
      node.removeAttribute(
        "href"
      );
    }
  }

  function showStatus(message) {
    el.statusText.textContent =
      message;

    el.status.hidden =
      false;

    el.content.hidden =
      true;
  }

  function showContent() {
    el.status.hidden =
      true;

    el.content.hidden =
      false;
  }

  function mapBase() {
    const api =
      window.PCSU_US_BASE_MAP;

    return (
      api &&
      typeof api.getSelectedBase ===
        "function"
    )
      ? api.getSelectedBase()
      : null;
  }

  function brainBase() {
    const candidates = [
      window.PCSU_BASICBRAIN_CURRENT,
      window.PCSU_BASICBRAIN_TEMP,
      window.PCSU_BASICBRAIN?.getLastGood?.(),
      window.PCSU_BASICBRAIN?.getState?.()
    ];

    for (const candidate of candidates) {
      if (
        !candidate ||
        typeof candidate !== "object"
      ) {
        continue;
      }

      const basicbrain =
        candidate.basicbrain || {};

      const profile =
        candidate.profile || {};

      const bridge =
        candidate.bridge || {};

      const selected =
        candidate.selectedBase ||
        basicbrain.selectedBase ||
        profile.selectedBase ||
        bridge.selectedBase;

      if (
        selected &&
        typeof selected === "object"
      ) {
        return selected;
      }

      const name =
        (
          typeof candidate.selectedBase ===
          "string"
            ? candidate.selectedBase
            : ""
        ) ||

        candidate.selected_base ||
        candidate.pcs_base ||
        candidate.current_base ||
        candidate.base ||

        basicbrain.selected_base ||
        basicbrain.pcs_base ||
        basicbrain.current_base ||
        basicbrain.base ||

        profile.selected_base ||
        profile.pcs_base ||
        profile.current_base ||
        profile.base ||

        bridge.selected_base ||
        bridge.pcs_base ||
        bridge.current_base ||
        bridge.base;

      if (name) {
        return {
          base: name,
          name,
          label: name,

          state:
            candidate.state ||
            basicbrain.state ||
            profile.state ||
            bridge.state ||
            "",

          stateCode:
            candidate.stateCode ||
            basicbrain.stateCode ||
            profile.stateCode ||
            bridge.stateCode ||
            ""
        };
      }
    }

    return null;
  }

  function storedBase() {
    try {
      const raw =
        localStorage.getItem(
          "pcsunited.selectedBase.v1"
        );

      return raw
        ? JSON.parse(raw)
        : null;
    } catch (_) {
      return null;
    }
  }

  function selectedBase() {
    return (
      mapBase() ||
      brainBase() ||
      storedBase()
    );
  }

  function fileFromUrl(value) {
    if (!clean(value)) {
      return "";
    }

    try {
      const parsed =
        new URL(
          value,
          window.location.origin
        );

      const file =
        decodeURIComponent(
          parsed.pathname
        )
          .split("/")
          .filter(Boolean)
          .pop() ||
        "";

      return /\.json$/i.test(file)
        ? file
        : "";
    } catch (_) {
      const file =
        clean(value)
          .split("?")[0]
          .split("#")[0]
          .split("/")
          .pop() ||
        "";

      return /\.json$/i.test(file)
        ? file
        : "";
    }
  }

  function fileName(base) {
    if (
      !base ||
      typeof base !== "object"
    ) {
      return "";
    }

    let file =
      clean(
        base.fileName ||
        base.filename ||
        base.file ||
        base.jsonFile ||
        base.json_file
      );

    if (file) {
      return /\.json$/i.test(file)
        ? file
        : `${file}.json`;
    }

    file =
      fileFromUrl(
        base.jsonUrl ||
        base.json_url ||
        base.cityJsonUrl ||
        base.city_json_url
      );

    if (file) {
      return file;
    }

    const api =
      window.PCSU_US_BASE_MAP;

    if (
      api &&
      typeof api.getStateBases ===
        "function"
    ) {
      const state =
        base.stateCode ||
        base.state ||
        (
          typeof api.getCurrentState ===
          "function"
            ? api.getCurrentState()
            : ""
        );

      const keys = [
        base.id,
        base.slug,
        base.base,
        base.name,
        base.label
      ]
        .map(normal)
        .filter(Boolean);

      const match =
        (
          api.getStateBases(state) ||
          []
        ).find(item => {
          const itemKeys = [
            item.id,
            item.slug,
            item.base,
            item.name,
            item.label,
            item.fileName
          ]
            .map(normal)
            .filter(Boolean);

          return keys.some(key => {
            return itemKeys.some(
              itemKey =>
                itemKey === key ||
                itemKey.includes(key) ||
                key.includes(itemKey)
            );
          });
        });

      if (match) {
        return (
          clean(match.fileName) ||
          fileFromUrl(
            match.jsonUrl
          )
        );
      }
    }

    try {
      return fileFromUrl(
        localStorage.getItem(
          "pcsunited.selectedCityJsonUrl.v1"
        )
      );
    } catch (_) {
      return "";
    }
  }

  function apiUrl(file) {
    const endpoint =
      new URL(API);

    endpoint.searchParams.set(
      "file",
      file
    );

    endpoint.searchParams.set(
      "pcsuSidebar",
      Date.now()
    );

    return endpoint.toString();
  }

  function format(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    if (Array.isArray(value)) {
      return value
        .map(format)
        .filter(Boolean)
        .join(" • ");
    }

    if (
      typeof value === "object"
    ) {
      return Object.entries(value)
        .map(([key, child]) => {
          const label =
            key
              .replaceAll(
                "_",
                " "
              )
              .replace(
                /\b\w/g,
                letter =>
                  letter.toUpperCase()
              );

          const text =
            format(child);

          return text
            ? `${label}: ${text}`
            : "";
        })
        .filter(Boolean)
        .join(" • ");
    }

    return clean(value);
  }

  function gateHours(gate) {
    const values = [
      gate?.hours,
      gate?.gate_hours,
      gate?.operating_hours,
      gate?.operation_hours,
      gate?.hours_of_operation,
      gate?.schedule,
      gate?.operating_schedule,
      gate?.access_hours,
      gate?.open_hours,
      gate?.daily_hours
    ];

    for (const value of values) {
      const text =
        format(value);

      if (text) {
        return text;
      }
    }

    const parts = [];

    const weekday =
      format(
        gate?.weekday_hours ||
        gate?.weekdays ||
        gate?.monday_friday ||
        gate?.mon_fri
      );

    const weekend =
      format(
        gate?.weekend_hours ||
        gate?.weekends
      );

    const saturday =
      format(
        gate?.saturday_hours ||
        gate?.saturday
      );

    const sunday =
      format(
        gate?.sunday_hours ||
        gate?.sunday
      );

    if (weekday) {
      parts.push(
        `Mon–Fri: ${weekday}`
      );
    }

    if (weekend) {
      parts.push(
        `Weekends: ${weekend}`
      );
    } else {
      if (saturday) {
        parts.push(
          `Sat: ${saturday}`
        );
      }

      if (sunday) {
        parts.push(
          `Sun: ${sunday}`
        );
      }
    }

    return parts.join(" • ");
  }

  function gates(profile) {
    const source =
      profile?.gates ||
      profile?.gate_information ||
      profile?.gate_info ||
      [];

    if (Array.isArray(source)) {
      return source
        .map((gate, index) => {
          if (
            gate &&
            typeof gate === "object"
          ) {
            return {
              ...gate,

              name:
                gate.name ||
                gate.gate_name ||
                gate.label ||
                `Gate ${index + 1}`
            };
          }

          return clean(gate)
            ? {
                name: clean(gate)
              }
            : null;
        })
        .filter(Boolean);
    }

    if (
      source &&
      typeof source === "object"
    ) {
      return Object.entries(source)
        .map(([key, value]) => {
          if (
            value &&
            typeof value === "object"
          ) {
            return {
              name:
                value.name ||
                value.gate_name ||
                value.label ||
                key,

              ...value
            };
          }

          return {
            name: key,
            hours: value
          };
        });
    }

    return [];
  }

  function gateClass(gate) {
    const text =
      (
        `${clean(gate?.status)} ` +
        gateHours(gate)
      ).toLowerCase();

    if (
      text.includes("closed") ||
      text.includes("inactive")
    ) {
      return "is-closed";
    }

    if (
      text.includes("limited") ||
      text.includes("weekday") ||
      text.includes("morning") ||
      text.includes("part time") ||
      text.includes("part-time") ||
      text.includes("restricted")
    ) {
      return "is-limited";
    }

    return "is-open";
  }

  function gateStatus(gate) {
    const explicit =
      clean(
        gate?.status ||
        gate?.operating_status ||
        gate?.access_status
      ).replaceAll(
        "_",
        " "
      );

    if (explicit) {
      return explicit;
    }

    const hours =
      gateHours(gate)
        .toLowerCase();

    if (
      hours.includes("24/7") ||
      hours.includes("24 hours") ||
      hours.includes("24-hour")
    ) {
      return "Open 24/7";
    }

    if (
      hours.includes("closed")
    ) {
      return "Closed";
    }

    if (hours) {
      return "Scheduled Access";
    }

    return "Hours Unavailable";
  }

  function gateCard(gate) {
    const hours =
      gateHours(gate);

    const location =
      clean(
        gate?.location ||
        gate?.address ||
        gate?.intersection ||
        gate?.entrance
      );

    const number =
      clean(
        gate?.phone ||
        gate?.telephone ||
        gate?.contact_phone
      );

    const telephone =
      phone(number);

    return `
      <div class="pcsu-be-gate ${gateClass(gate)}">

        <div>

          <div class="pcsu-be-gate-name">
            ${esc(
              gate?.name ||
              gate?.gate_name ||
              "Base Gate"
            )}
          </div>

          ${
            location
              ? `
                <div class="pcsu-be-gate-location">
                  ${esc(location)}
                </div>
              `
              : ""
          }

          <div class="pcsu-be-gate-status">
            <span class="pcsu-be-gate-status-dot"></span>
            ${esc(gateStatus(gate))}
          </div>

        </div>

        <div class="pcsu-be-gate-hours">

          <span class="pcsu-be-gate-hours-label">
            Hours
          </span>

          ${esc(
            hours ||
            "Hours unavailable"
          )}

          ${
            number
              ? `
                <span class="pcsu-be-gate-phone">
                  ${
                    telephone
                      ? `
                        <a href="${esc(telephone)}">
                          ${esc(number)}
                        </a>
                      `
                      : esc(number)
                  }
                </span>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  function services(profile) {
    const source =
      profile?.major_services;

    if (Array.isArray(source)) {
      return source;
    }

    if (
      source &&
      typeof source === "object"
    ) {
      return Object.entries(source)
        .map(([category, value]) => {
          return (
            value &&
            typeof value === "object"
          )
            ? {
                category,
                ...value
              }
            : {
                category,
                name: value
              };
        });
    }

    return [];
  }

  function serviceIcon(category) {
    const icons = {
      medical: "🏥",
      hospital: "🏥",
      clinic: "🏥",
      commissary: "🛒",
      exchange_bx: "🛍",
      bx: "🛍",
      exchange: "🛍",
      military_clothing: "🎖",
      housing_office: "🏠",
      housing: "🏠",
      unaccompanied_housing: "🛏",
      lodging: "🧳",
      banking: "🏦",
      bank: "🏦",
      admin_support: "📄",
      family_support: "👨‍👩‍👧",
      legal: "⚖️",
      finance: "💳"
    };

    return (
      icons[
        clean(category)
          .toLowerCase()
      ] ||
      "📍"
    );
  }

  function housing(
    profile,
    list
  ) {
    const housingData =
      profile?.on_base_housing &&
      typeof profile.on_base_housing ===
        "object"
        ? profile.on_base_housing
        : {};

    const service =
      list.find(item => {
        const category =
          clean(
            item?.category
          ).toLowerCase();

        const name =
          clean(
            item?.name
          ).toLowerCase();

        return (
          category ===
            "housing_office" ||
          category ===
            "housing" ||
          name.includes(
            "housing office"
          ) ||
          name.includes(
            "military housing"
          )
        );
      }) || {};

    return {
      name:
        service.name ||
        housingData.housing_office_name ||
        housingData.office_name ||
        housingData.name ||
        "Military Housing Office",

      address:
        service.address ||
        service.location ||
        housingData.housing_office_address ||
        housingData.office_address ||
        housingData.address ||
        "",

      phone:
        service.phone ||
        service.telephone ||
        housingData.housing_office_phone ||
        housingData.office_phone ||
        housingData.phone ||
        "",

      email:
        service.email ||
        housingData.housing_office_email ||
        housingData.office_email ||
        housingData.email ||
        "",

      hours:
        format(
          service.hours ||
          service.operating_hours ||
          housingData.housing_office_hours ||
          housingData.office_hours ||
          housingData.hours
        ),

      website:
        service.website ||
        service.url ||
        housingData.website ||
        housingData.url ||
        ""
    };
  }

  function officialLink(
    links,
    keys
  ) {
    for (const key of keys) {
      if (links?.[key]) {
        return safeUrl(
          links[key]
        );
      }
    }

    return "";
  }

  function renderVisitor(
    visitor,
    links
  ) {
    const value =
      visitor &&
      typeof visitor === "object"
        ? visitor
        : {};

    const available =
      Boolean(
        value.name ||
        value.phone ||
        value.address ||
        value.location ||
        value.hours ||
        value.operating_hours
      );

    el.visitorSection.hidden =
      !available;

    if (!available) {
      el.visitorDetails.innerHTML =
        "";

      link(
        el.visitorLink,
        ""
      );

      return;
    }

    el.visitorName.textContent =
      value.name ||
      "Visitor Control Center";

    const rows = [];

    const address =
      value.address ||
      value.location ||
      "";

    const hours =
      format(
        value.hours ||
        value.operating_hours ||
        value.hours_of_operation ||
        value.schedule
      );

    if (address) {
      rows.push(`
        <div class="pcsu-be-detail-row">
          <div class="pcsu-be-detail-icon">
            📍
          </div>

          <div class="pcsu-be-detail-value">
            ${esc(address)}
          </div>
        </div>
      `);
    }

    if (value.phone) {
      const telephone =
        phone(value.phone);

      rows.push(`
        <div class="pcsu-be-detail-row">

          <div class="pcsu-be-detail-icon">
            ☎
          </div>

          <div class="pcsu-be-detail-value">
            ${
              telephone
                ? `
                  <a href="${esc(telephone)}">
                    ${esc(value.phone)}
                  </a>
                `
                : esc(value.phone)
            }
          </div>

        </div>
      `);
    }

    if (hours) {
      rows.push(`
        <div class="pcsu-be-detail-row">

          <div class="pcsu-be-detail-icon">
            🕒
          </div>

          <div class="pcsu-be-detail-value">
            ${esc(hours)}
          </div>

        </div>
      `);
    }

    if (value.notes) {
      rows.push(`
        <div class="pcsu-be-detail-row">

          <div class="pcsu-be-detail-icon">
            ℹ
          </div>

          <div class="pcsu-be-detail-value">
            ${esc(value.notes)}
          </div>

        </div>
      `);
    }

    el.visitorDetails.innerHTML =
      rows.join("");

    link(
      el.visitorLink,

      safeUrl(
        value.website ||
        value.url
      ) ||

      officialLink(
        links,
        [
          "visitor_info",
          "visitor_information",
          "visitor_center",
          "visitor_control_center",
          "jbsa_lackland_visitor_info"
        ]
      )
    );
  }

  function renderGates(profile) {
    const list =
      gates(profile);

    el.gatesSection.hidden =
      !list.length;

    if (!list.length) {
      el.gateList.innerHTML =
        "";

      el.extraGates.innerHTML =
        "";

      el.gateToggle.hidden =
        true;

      return;
    }

    const withHours =
      list.filter(
        gate =>
          gateHours(gate)
      );

    const pool =
      withHours.length
        ? withHours
        : list;

    const visible = [];

    pool
      .filter(gate => {
        const hours =
          gateHours(gate)
            .toLowerCase();

        return (
          hours.includes("24/7") ||
          hours.includes("24 hours") ||
          hours.includes("24-hour")
        );
      })
      .slice(0, 2)
      .forEach(
        gate =>
          visible.push(gate)
      );

    pool.forEach(gate => {
      if (
        visible.length < 3 &&
        !visible.includes(gate)
      ) {
        visible.push(gate);
      }
    });

    const extra =
      list.filter(
        gate =>
          !visible.includes(gate)
      );

    el.gateList.innerHTML =
      visible
        .map(gateCard)
        .join("");

    el.extraGates.innerHTML =
      extra
        .map(gateCard)
        .join("");

    el.extraGates.classList.remove(
      "is-open"
    );

    el.gateToggle.hidden =
      !extra.length;

    el.gateToggle.textContent =
      "View All";
  }

  function renderHousing(
    profile,
    list,
    links
  ) {
    const value =
      housing(
        profile,
        list
      );

    const available =
      Boolean(
        value.name ||
        value.phone ||
        value.email ||
        value.address ||
        value.hours ||
        value.website
      );

    el.housingSection.hidden =
      !available;

    if (!available) {
      link(
        el.housingCall,
        ""
      );

      link(
        el.housingEmail,
        ""
      );

      link(
        el.housingLink,
        ""
      );

      return;
    }

    el.housingName.textContent =
      value.name;

    el.housingDetails.innerHTML =
      [
        value.address,
        value.phone,
        value.hours
      ]
        .filter(Boolean)
        .map(
          item =>
            `<div style="margin-top:4px">${esc(item)}</div>`
        )
        .join("");

    link(
      el.housingCall,
      phone(value.phone)
    );

    link(
      el.housingEmail,
      email(value.email)
    );

    link(
      el.housingLink,

      safeUrl(
        value.website
      ) ||

      officialLink(
        links,
        [
          "housing",
          "housing_office",
          "military_housing_office",
          "jbsa_housing",
          "air_force_housing_jbsa"
        ]
      )
    );
  }

  function renderServices(list) {
    const desired = [
      "medical",
      "hospital",
      "commissary",
      "exchange_bx",
      "bx",
      "unaccompanied_housing",
      "lodging",
      "banking"
    ];

    const selected = [];

    desired.forEach(category => {
      const match =
        list.find(
          item =>
            clean(
              item?.category
            ).toLowerCase() ===
            category
        );

      if (
        match &&
        !selected.includes(match)
      ) {
        selected.push(match);
      }
    });

    list.forEach(item => {
      if (
        selected.length < 4 &&
        !selected.includes(item)
      ) {
        selected.push(item);
      }
    });

    const items =
      selected.slice(0, 4);

    el.servicesSection.hidden =
      !items.length;

    if (!items.length) {
      el.serviceGrid.innerHTML =
        "";

      return;
    }

    el.serviceGrid.innerHTML =
      items
        .map(service => {
          const contact =
            service.phone ||
            format(
              service.hours ||
              service.operating_hours
            ) ||
            service.address ||
            service.location ||
            "";

          const telephone =
            phone(
              service.phone
            );

          return `
            <div class="pcsu-be-service">

              <div class="pcsu-be-service-icon">
                ${serviceIcon(service.category)}
              </div>

              <div class="pcsu-be-service-name">
                ${esc(
                  service.name ||
                  service.label ||
                  "Base Service"
                )}
              </div>

              <div class="pcsu-be-service-contact">
                ${
                  telephone
                    ? `
                      <a href="${esc(telephone)}">
                        ${esc(contact)}
                      </a>
                    `
                    : esc(contact)
                }
              </div>

            </div>
          `;
        })
        .join("");
  }

  function watchout(profile) {
    const list =
      Array.isArray(
        profile?.pcs_watchouts
      )
        ? profile.pcs_watchouts
        : [];

    if (list.length) {
      const items =
        list.map(item => {
          return (
            item &&
            typeof item === "object"
          )
            ? item
            : {
                title:
                  "PCS Watchout",

                message:
                  clean(item)
              };
        });

      return (
        items.find(item => {
          const text =
            (
              `${clean(item.title)} ` +
              clean(item.message)
            ).toLowerCase();

          return (
            text.includes("gate") ||
            text.includes("access") ||
            text.includes("arrival") ||
            text.includes("commute")
          );
        }) ||
        items[0]
      );
    }

    const arrival =
      Array.isArray(
        profile?.arrival_checklist
      )
        ? profile.arrival_checklist[0]
        : "";

    if (arrival) {
      return (
        typeof arrival === "object"
      )
        ? arrival
        : {
            title:
              "Arrival Reminder",

            message:
              arrival
          };
    }

    const commute =
      clean(
        profile
          ?.commute_intelligence
          ?.commute_bluf
      );

    return commute
      ? {
          title:
            "Commute Planning",

          message:
            commute
        }
      : {
          title:
            "Verify Before Travel",

          message:
            "Gate hours, access requirements, office hours, and installation procedures may change."
        };
  }

  function renderWatchout(profile) {
    const item =
      watchout(profile);

    el.watchout.hidden =
      !item;

    if (!item) {
      return;
    }

    el.watchoutTitle.textContent =
      item.title ||
      item.name ||
      "PCS Watchout";

    el.watchoutMessage.textContent =
      item.message ||
      item.description ||
      item.note ||
      "";
  }

  function render(json) {
    const data =
      json &&
      typeof json === "object"
        ? json
        : {};

    const profile =
      data.base_profile &&
      typeof data.base_profile ===
        "object"
        ? data.base_profile
        : {};

    const links =
      profile.official_links &&
      typeof profile.official_links ===
        "object"
        ? profile.official_links
        : (
            data.official_links &&
            typeof data.official_links ===
              "object"
              ? data.official_links
              : {}
          );

    const list =
      services(profile);

    renderVisitor(
      profile.visitor_control_center,
      links
    );

    renderGates(profile);

    renderHousing(
      profile,
      list,
      links
    );

    renderServices(list);

    renderWatchout(profile);

    showContent();
  }

  async function load(base) {
    const request =
      ++sequence;

    if (
      !base ||
      typeof base !== "object"
    ) {
      currentBase = null;
      currentData = null;
      currentFile = "";

      showStatus(
        "Select a gaining base in BasicBrain or choose a base from the map."
      );

      return;
    }

    const file =
      fileName(base);

    if (!file) {
      currentBase = base;

      showStatus(
        "The selected base was found, but its Base Intelligence filename is unavailable."
      );

      return;
    }

    if (
      currentData &&
      currentFile.toLowerCase() ===
        file.toLowerCase()
    ) {
      currentBase = base;

      render(
        currentData
      );

      return;
    }

    currentBase = base;
    currentFile = file;

    showStatus(
      "Loading selected base essentials..."
    );

    try {
      const response =
        await fetch(
          apiUrl(file),
          {
            method: "GET",
            mode: "cors",
            cache: "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      if (request !== sequence) {
        return;
      }

      if (
        !result ||
        result.ok === false
      ) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Invalid base-data response."
        );
      }

      const json =
        result.data &&
        typeof result.data ===
          "object"
          ? result.data
          : null;

      if (!json) {
        throw new Error(
          "Missing data object."
        );
      }

      currentData = json;

      render(json);
    } catch (error) {
      if (request !== sequence) {
        return;
      }

      console.warn(
        "[PCSU Base Essentials] Base-data API load failed:",
        error
      );

      showStatus(
        "The selected base information could not load. Please select the base again or refresh the page."
      );
    }
  }

  function refresh() {
    load(
      selectedBase()
    );
  }

  el.gateToggle.addEventListener(
    "click",
    () => {
      const open =
        el.extraGates
          .classList
          .toggle(
            "is-open"
          );

      el.gateToggle.textContent =
        open
          ? "Show Less"
          : "View All";
    }
  );

  window.addEventListener(
    "pcsunited:base-map-updated",
    event => {
      load(
        event.detail?.selectedBase ||
        mapBase()
      );
    }
  );

  window.addEventListener(
    "pcsunited:map-base-selected",
    event => {
      load(
        event.detail?.selectedBase ||
        event.detail
      );
    }
  );

  [
    "pcsunited:basicbrain-updated",
    "pcsunited:base-preview-ready",
    "pcsunited:profile-ready",
    "pcsunited:bridge-ready",
    "pcsunited:compensation-ready",
    "pcsu:base-selected",
    "pcsunited:base-map-ready"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      () =>
        setTimeout(
          refresh,
          0
        )
    );
  });

  window.addEventListener(
    "message",
    event => {
      if (
        event.data?.type ===
        "pcsunited-basicbrain"
      ) {
        setTimeout(
          refresh,
          0
        );
      }
    }
  );

  window.PCSUBaseEssentialsSidebar = {
    version:
      VERSION,

    endpoint:
      API,

    refresh,

    getSelectedBase:
      () => currentBase,

    getData:
      () => currentData,

    getFileName:
      () => currentFile,

    clear() {
      sequence++;

      currentBase = null;
      currentData = null;
      currentFile = "";

      showStatus(
        "Select a gaining base in BasicBrain or choose a base from the map."
      );
    }
  };

  setTimeout(
    refresh,
    0
  );

  setTimeout(
    refresh,
    350
  );

  setTimeout(
    refresh,
    900
  );
})();
