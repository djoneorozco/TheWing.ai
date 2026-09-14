/* =========================================================
   PCSUnited Interactive U.S. Air Force Base Map
   Map Engine v4.1.0

   REQUIRED FLOW
   1. User clicks a state.
   2. USAF bases in that state appear above the map.
   3. A location dot is drawn for every listed base in that state.
   4. User clicks a base card.
   5. The base remains on this page; its JSON is loaded directly.
   6. The right panel shows Operator Phone, Gate Hours,
      Mission, Base Population, plus Visitor Control Center.
   7. ONLY the "Go to Base Demographics" link navigates away.

   DIRECT JSON ONLY
   This file does NOT call /api/base-data.

   JSON root priority:
   1. window.PCSU_BASE_JSON_ROOT
   2. data-json-root on #pcsu-real-us-map
   3. ./cities/
========================================================= */

(() => {
  "use strict";

  const VERSION = "4.1.0";
  const MOUNT_KEY = "PCSU_US_BASE_MAP_V410_MOUNTED";

  if (window[MOUNT_KEY]) {
    console.warn("[PCSU Base Map] Duplicate mount blocked:", VERSION);
    return;
  }

  window[MOUNT_KEY] = true;

  /* =======================================================
     REQUIRED DOM
  ======================================================= */

  const mapRoot =
    document.getElementById("pcsu-real-us-map");

  const svgElement =
    document.getElementById("pcsu-us-svg");

  const baseListEl =
    document.getElementById("pcsu-base-list");

  const selectedBaseNameEl =
    document.getElementById("pcsu-selected-state");

  const panelCopyEl =
    document.getElementById("pcsu-panel-copy");

  const demographicsLinkEl =
    document.getElementById(
      "pcsu-base-demographics-link"
    );

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

  const d3 = window.d3;
  const topojson = window.topojson;

  /* =======================================================
     CONFIGURATION
  ======================================================= */

  const LIVE_BASE_DEMOGRAPHICS_URL =
    window.PCSU_BASE_DEMOGRAPHICS_URL ||
    "https://pcsunited-com-28346d.webflow.io/air-force/base-demographics-air-force";

  /*
    If your JSON files are NOT in ./cities/,
    define this before base-map.js loads:

    window.PCSU_BASE_JSON_ROOT =
      "https://your-domain.com/cities/";
  */

  const BASE_JSON_ROOT =
  window.PCSU_BASE_JSON_ROOT ||
  "https://thewing.netlify.app/netlify/functions/cities/";

  const DEFAULT_STATE = "TX";

  /* =======================================================
     STATE LOOKUPS
  ======================================================= */

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

  /* =======================================================
     BASE REGISTRY

     Format:
     [
       Base Name,
       JSON Filename,
       City / State,
       Latitude,
       Longitude
     ]
  ======================================================= */

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

  /* =======================================================
     STATE / BASE NORMALIZATION
  ======================================================= */

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

  function slugify(fileName) {
    return clean(fileName)
      .replace(/\.json$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeKey(value) {
    return clean(value)
      .toLowerCase()
      .replace(/joint\s*base/g, "jb")
      .replace(/air\s*force\s*base/g, "afb")
      .replace(/[^a-z0-9]/g, "");
  }

  function directJsonUrl(fileName) {
    const file =
      clean(fileName);

    if (!file) {
      return "";
    }

    try {
      const root =
        new URL(
          BASE_JSON_ROOT,
          window.location.href
        );

      if (
        !root.pathname.endsWith("/")
      ) {
        root.pathname += "/";
      }

      return new URL(
        file,
        root
      ).toString();

    } catch (_) {
      return (
        String(BASE_JSON_ROOT)
          .replace(/\/+$/, "") +
        "/" +
        file
      );
    }
  }

  function makeBase(
    row,
    stateCode
  ) {
    const [
      name,
      fileName,
      city,
      lat,
      lng
    ] = row;

    const id =
      slugify(fileName);

    return {
      id,
      slug: id,

      fileName,

      base: name,
      name,
      label: name,

      city,

      state: stateCode,
      stateCode,

      lat,
      lng,

      jsonUrl:
        directJsonUrl(
          fileName
        )
    };
  }

  const STATE_BASES =
    Object.fromEntries(
      Object.entries(
        BASE_REGISTRY
      ).map(
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

    Object.entries(
      STATE_BASES
    ).forEach(
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
              normalizeKey(
                value
              );

            if (key) {
              out[key] =
                stateCode;
            }
          });

        });

      }
    );

    return out;
  })();

  /* =======================================================
     MAP STATE
  ======================================================= */

  const svg =
    d3.select(
      svgElement
    );

  let mapReady = false;
  let projection = null;
  let markerLayer = null;

  let currentStateCode = "";
  let currentBaseId = "";

  let pendingSelection = null;

  function getBases(
    stateCode
  ) {
    return (
      STATE_BASES[
        clean(stateCode)
          .toUpperCase()
      ] ||
      []
    );
  }

  function getBaseById(
    stateCode,
    baseId
  ) {
    return (
      getBases(stateCode)
        .find(
          base =>
            base.id ===
            clean(baseId)
        ) ||
      null
    );
  }

  function projectBase(base) {
    if (
      !projection ||
      !base
    ) {
      return null;
    }

    const lat =
      Number(base.lat);

    const lng =
      Number(base.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    return projection(
      [lng, lat]
    );
  }

  /* =======================================================
     BASE DEMOGRAPHICS CTA
  ======================================================= */

  function baseDemographicsUrl(
    base
  ) {
    const url =
      new URL(
        LIVE_BASE_DEMOGRAPHICS_URL,
        window.location.href
      );

    if (
      base &&
      base.id
    ) {
      url.searchParams.set(
        "base",
        base.id
      );
    }

    return url.toString();
  }

  function updateDemographicsLink(
    base
  ) {
    if (
      !demographicsLinkEl
    ) {
      return;
    }

    if (!base) {

      demographicsLinkEl
        .removeAttribute(
          "href"
        );

      demographicsLinkEl
        .setAttribute(
          "aria-disabled",
          "true"
        );

      demographicsLinkEl
        .setAttribute(
          "tabindex",
          "-1"
        );

      demographicsLinkEl
        .setAttribute(
          "aria-label",
          "Choose a base before opening Base Demographics"
        );

      return;
    }

    demographicsLinkEl.href =
      baseDemographicsUrl(
        base
      );

    demographicsLinkEl
      .setAttribute(
        "aria-disabled",
        "false"
      );

    demographicsLinkEl
      .setAttribute(
        "tabindex",
        "0"
      );

    demographicsLinkEl
      .setAttribute(
        "aria-label",
        `Go to ${base.base} Base Demographics`
      );
  }

  if (demographicsLinkEl) {

    demographicsLinkEl
      .addEventListener(
        "click",
        event => {

          if (
            demographicsLinkEl
              .getAttribute(
                "aria-disabled"
              ) === "true"
          ) {
            event.preventDefault();
          }

        }
      );

  }

  /* =======================================================
     MARKERS / DOTS
  ======================================================= */

  function clearMarkers() {
    if (markerLayer) {
      markerLayer
        .selectAll("*")
        .remove();
    }
  }

  function drawBaseDots(
    bases,
    selectedBase
  ) {
    clearMarkers();

    if (
      !markerLayer ||
      !projection
    ) {
      return;
    }

    bases.forEach(base => {

      const point =
        projectBase(base);

      if (!point) {
        return;
      }

      const [x, y] =
        point;

      const selected =
        selectedBase &&
        selectedBase.id ===
          base.id;

      markerLayer
        .append("circle")
        .attr(
          "class",
          "pcsu-base-location-dot"
        )
        .attr(
          "cx",
          x
        )
        .attr(
          "cy",
          y
        )
        .attr(
          "r",
          selected
            ? 6
            : 4.5
        )
        .attr(
          "fill",
          selected
            ? "#f6d06d"
            : "#8ef3c5"
        )
        .attr(
          "stroke",
          "#ffffff"
        )
        .attr(
          "stroke-width",
          selected
            ? 1.6
            : 1.1
        )
        .attr(
          "opacity",
          selected
            ? 1
            : 0.92
        )
        .style(
          "filter",
          selected
            ? "drop-shadow(0 0 10px rgba(246,208,109,.9))"
            : "drop-shadow(0 0 7px rgba(142,243,197,.75))"
        );

    });

    if (selectedBase) {
      drawSelectedMarker(
        selectedBase
      );
    }
  }

  function drawSelectedMarker(
    base
  ) {
    const point =
      projectBase(base);

    if (
      !point ||
      !markerLayer
    ) {
      return;
    }

    const [x, y] =
      point;

    const label =
      base.base ||
      "Selected Base";

    const city =
      base.city ||
      "";

    let labelX =
      x + 18;

    let labelY =
      y - 18;

    if (x > 760) {
      labelX =
        x - 190;
    }

    if (y < 70) {
      labelY =
        y + 18;
    }

    const labelWidth =
      Math.max(
        126,
        Math.min(
          230,
          label.length * 7.2 + 26
        )
      );

    const marker =
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

    marker
      .append("circle")
      .attr(
        "class",
        "pcsu-base-marker-ring"
      )
      .attr(
        "r",
        5
      );

    marker
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

    marker
      .append("circle")
      .attr(
        "fill",
        "#071018"
      )
      .attr(
        "r",
        3.3
      )
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
      .attr(
        "height",
        42
      )
      .attr(
        "x",
        0
      )
      .attr(
        "y",
        0
      );

    labelGroup
      .append("text")
      .attr(
        "class",
        "pcsu-base-marker-label"
      )
      .attr(
        "x",
        12
      )
      .attr(
        "y",
        17
      )
      .text(
        label
      );

    labelGroup
      .append("text")
      .attr(
        "class",
        "pcsu-base-marker-sub"
      )
      .attr(
        "x",
        12
      )
      .attr(
        "y",
        31
      )
      .text(
        city
      );
  }

  /* =======================================================
     RIGHT PANEL HEADER
  ======================================================= */

  function updatePanelHeader(
    stateCode,
    selectedBase,
    bases
  ) {

    if (selectedBaseNameEl) {

      selectedBaseNameEl
        .textContent =
          selectedBase
            ? selectedBase.base
            : "Choose a base";

    }

    updateDemographicsLink(
      selectedBase
    );

    if (!panelCopyEl) {
      return;
    }

    if (selectedBase) {

      panelCopyEl.textContent =
        selectedBase.city ||
        STATE_NAMES[stateCode] ||
        stateCode;

      return;
    }

    const stateName =
      STATE_NAMES[stateCode] ||
      stateCode;

    panelCopyEl.textContent =
      bases.length
        ? `${bases.length} Air Force base${bases.length === 1 ? "" : "s"} in ${stateName}. Select a base above.`
        : `No supported Air Force bases are currently listed for ${stateName}.`;
  }

  /* =======================================================
     EVENTS
  ======================================================= */

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
              new Date()
                .toISOString()
          }
        }
      )
    );

  }

  function emitBaseSelection(
    base
  ) {

    window.dispatchEvent(
      new CustomEvent(
        "pcsunited:map-base-selected",
        {
          detail: {

            ...base,

            selectedBase: {
              ...base
            },

            autoNavigate:
              false,

            source:
              "pcsunited-interactive-base-map-card",

            updated_at:
              new Date()
                .toISOString()
          }
        }
      )
    );

  }

  /* =======================================================
     BASE CARDS
  ======================================================= */

  function renderBaseCards(
    bases,
    selectedBase
  ) {

    baseListEl.innerHTML =
      bases
        .map(base => `
          <button
            class="pcsu-base-btn${selectedBase && selectedBase.id === base.id ? " is-selected" : ""}"
            type="button"
            data-base-id="${esc(base.id)}"
            aria-label="Select ${esc(base.base)}"
            aria-pressed="${selectedBase && selectedBase.id === base.id ? "true" : "false"}">

            <span class="pcsu-base-name">
              ${esc(base.base)}
            </span>

            <span class="pcsu-base-meta">
              ${esc(base.city)} • Select Base
            </span>

          </button>
        `)
        .join("");

    baseListEl
      .querySelectorAll(
        ".pcsu-base-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const base =
              bases.find(
                item =>
                  item.id ===
                  button.dataset.baseId
              );

            if (base) {
              selectBase(base);
            }

          }
        );

      });
  }

  function scrollSelectedCardIntoView() {

    const selected =
      baseListEl
        .querySelector(
          ".pcsu-base-btn.is-selected"
        );

    if (!selected) {
      return;
    }

    try {

      selected.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });

    } catch (_) {
      /*
        Older browser fallback:
        simply leave card at current position.
      */
    }
  }

  /* =======================================================
     STATE / BASE SELECTION
  ======================================================= */

  function renderState(
    stateCode,
    selectedBaseId = "",
    options = {}
  ) {

    const safeState =
      clean(stateCode)
        .toUpperCase();

    if (!safeState) {
      return;
    }

    if (!mapReady) {

      pendingSelection = {
        stateCode:
          safeState,

        selectedBaseId,

        options
      };

      return;
    }

    const bases =
      getBases(
        safeState
      );

    const selectedBase =
      getBaseById(
        safeState,
        selectedBaseId
      );

    currentStateCode =
      safeState;

    currentBaseId =
      selectedBase
        ? selectedBase.id
        : "";

    svg
      .selectAll(
        ".pcsu-state"
      )
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

    renderBaseCards(
      bases,
      selectedBase
    );

    drawBaseDots(
      bases,
      selectedBase
    );

    updatePanelHeader(
      safeState,
      selectedBase,
      bases
    );

    emitMapState(
      safeState,
      selectedBase
    );

    if (
      selectedBase &&
      options.scrollCard !== false
    ) {
      scrollSelectedCardIntoView();
    }
  }

  function selectState(
    stateCode
  ) {

    renderState(
      stateCode,
      "",
      {
        scrollCard:
          false
      }
    );

  }

  function selectBase(
    base
  ) {

    if (!base) {
      return;
    }

    /*
      IMPORTANT:
      Selecting a base DOES NOT navigate away.

      It only:
      - selects the base
      - updates the marker
      - loads the JSON
      - fills the information panel
    */

    renderState(
      base.stateCode ||
      base.state,

      base.id,

      {
        scrollCard:
          true
      }
    );

    emitBaseSelection(
      base
    );
  }

  /* =======================================================
     OPTIONAL BASICBRAIN / EXISTING PCSU EVENT COMPATIBILITY
  ======================================================= */

  function findStateFromBaseName(
    baseName
  ) {

    const key =
      normalizeKey(
        baseName
      );

    if (!key) {
      return "";
    }

    if (
      BASE_TO_STATE[key]
    ) {
      return (
        BASE_TO_STATE[key]
      );
    }

    const fuzzyKey =
      Object.keys(
        BASE_TO_STATE
      ).find(
        existingKey =>
          existingKey.includes(key) ||
          key.includes(existingKey)
      );

    return fuzzyKey
      ? BASE_TO_STATE[
          fuzzyKey
        ]
      : "";
  }

  function findBaseId(
    stateCode,
    baseName
  ) {

    const bases =
      getBases(
        stateCode
      );

    const key =
      normalizeKey(
        baseName
      );

    if (!key) {
      return "";
    }

    const exact =
      bases.find(
        base =>

          [
            base.base,
            base.name,
            base.label,
            base.fileName,
            base.id
          ].some(
            value =>
              normalizeKey(
                value
              ) === key
          )
      );

    if (exact) {
      return exact.id;
    }

    const fuzzy =
      bases.find(
        base =>

          [
            base.base,
            base.name,
            base.label,
            base.fileName,
            base.id
          ].some(
            value => {

              const candidate =
                normalizeKey(
                  value
                );

              return (
                candidate.includes(
                  key
                ) ||
                key.includes(
                  candidate
                )
              );
            }
          )
      );

    return fuzzy
      ? fuzzy.id
      : "";
  }

  function selectionFromDetail(
    detail
  ) {

    const data =
      detail &&
      typeof detail === "object"
        ? detail
        : {};

    const selected =
      data.selectedBase &&
      typeof data.selectedBase ===
        "object"
        ? data.selectedBase
        : {};

    const profile =
      data.profile &&
      typeof data.profile ===
        "object"
        ? data.profile
        : {};

    const basicbrain =
      data.basicbrain &&
      typeof data.basicbrain ===
        "object"
        ? data.basicbrain
        : {};

    const baseName =

      selected.base ||
      selected.name ||
      selected.label ||

      data.base ||
      data.name ||
      data.label ||

      profile.selected_base ||
      profile.base ||
      profile.pcs_base ||
      profile.current_base ||

      basicbrain.selected_base ||
      basicbrain.base ||
      basicbrain.pcs_base ||
      basicbrain.current_base ||

      "";

    const rawState =

      selected.stateCode ||
      selected.state ||

      data.stateCode ||
      (
        typeof data.state ===
        "string"
          ? data.state
          : ""
      ) ||

      profile.stateCode ||
      profile.state ||

      basicbrain.stateCode ||
      basicbrain.state ||

      "";

    const candidateState =
      clean(rawState)
        .toUpperCase();

    const stateCode =
      STATE_NAMES[
        candidateState
      ]
        ? candidateState
        : findStateFromBaseName(
            baseName
          );

    return {
      stateCode,

      baseId:
        stateCode
          ? findBaseId(
              stateCode,
              baseName
            )
          : ""
    };
  }

  function applyExternalSelection(
    detail
  ) {

    const selection =
      selectionFromDetail(
        detail
      );

    if (
      !selection.stateCode
    ) {
      return false;
    }

    renderState(
      selection.stateCode,
      selection.baseId,
      {
        scrollCard:
          false
      }
    );

    return true;
  }

  [
    "pcsunited:basicbrain-updated",
    "pcsunited:base-preview-ready",
    "pcsunited:profile-ready",
    "pcsunited:bridge-ready",
    "pcsunited:compensation-ready",
    "pcsu:base-selected"

  ].forEach(
    eventName => {

      window.addEventListener(
        eventName,
        event => {

          applyExternalSelection(
            event.detail ||
            {}
          );

        }
      );

    }
  );

  /* =======================================================
     PUBLIC MAP API
  ======================================================= */

  window.PCSU_US_BASE_MAP = {

    version:
      VERSION,

    selectState,

    selectBase,

    renderState,

    getCurrentState:
      () =>
        currentStateCode,

    getCurrentBaseId:
      () =>
        currentBaseId,

    getSelectedBase:
      () =>
        getBaseById(
          currentStateCode,
          currentBaseId
        ),

    getStateBases:
      stateCode => [
        ...getBases(
          stateCode
        )
      ],

    getJsonUrl:
      base =>
        base &&
        base.jsonUrl
          ? base.jsonUrl
          : directJsonUrl(
              base
                ? base.fileName
                : ""
            ),

    getBaseDemographicsUrl:
      base =>
        baseDemographicsUrl(
          base
        )
  };

  /* =======================================================
     BASE INFORMATION PANEL
  ======================================================= */

  const panelRoot =
    document.getElementById(
      "pcsu-base-essentials-module"
    );

  const panel =
    panelRoot
      ? {

          status:
            panelRoot.querySelector(
              "#pcsu-be-status"
            ),

          statusText:
            panelRoot.querySelector(
              "#pcsu-be-status-text"
            ),

          content:
            panelRoot.querySelector(
              "#pcsu-be-content"
            ),

          overviewSection:
            panelRoot.querySelector(
              "#pcsu-be-overview-section"
            ),

          locationCard:
            panelRoot.querySelector(
              "#pcsu-be-location-card"
            ),

          location:
            panelRoot.querySelector(
              "#pcsu-be-location"
            ),

          branchCard:
            panelRoot.querySelector(
              "#pcsu-be-branch-card"
            ),

          branch:
            panelRoot.querySelector(
              "#pcsu-be-branch"
            ),

          operatorSection:
            panelRoot.querySelector(
              "#pcsu-be-operator-section"
            ),

          operatorName:
            panelRoot.querySelector(
              "#pcsu-be-operator-name"
            ),

          operatorCall:
            panelRoot.querySelector(
              "#pcsu-be-operator-call"
            ),

          operatorPhone:
            panelRoot.querySelector(
              "#pcsu-be-operator-phone"
            ),

          populationSection:
            panelRoot.querySelector(
              "#pcsu-be-population-section"
            ),

          populationTotal:
            panelRoot.querySelector(
              "#pcsu-be-population-total"
            ),

          populationDetails:
            panelRoot.querySelector(
              "#pcsu-be-population-details"
            ),

          missionSection:
            panelRoot.querySelector(
              "#pcsu-be-mission-section"
            ),

          mission:
            panelRoot.querySelector(
              "#pcsu-be-mission"
            ),

          gatesSection:
            panelRoot.querySelector(
              "#pcsu-be-gates-section"
            ),

          gateList:
            panelRoot.querySelector(
              "#pcsu-be-gate-list"
            ),

          extraGates:
            panelRoot.querySelector(
              "#pcsu-be-extra-gates"
            ),

          gateToggle:
            panelRoot.querySelector(
              "#pcsu-be-gate-toggle"
            ),

          visitorSection:
            panelRoot.querySelector(
              "#pcsu-be-visitor-section"
            ),

          visitorName:
            panelRoot.querySelector(
              "#pcsu-be-visitor-name"
            ),

          visitorDetails:
            panelRoot.querySelector(
              "#pcsu-be-visitor-details"
            ),

          visitorLink:
            panelRoot.querySelector(
              "#pcsu-be-visitor-link"
            )
        }

      : null;

  let panelRequest = 0;

  let loadedFile = "";

  let loadedJson = null;

  /* =======================================================
     PANEL HELPERS
  ======================================================= */

  function showPanelStatus(
    message
  ) {

    if (!panel) {
      return;
    }

    if (panel.status) {
      panel.status.hidden =
        false;
    }

    if (panel.content) {
      panel.content.hidden =
        true;
    }

    if (panel.statusText) {
      panel.statusText.textContent =
        message;
    }
  }

  function showPanelContent() {

    if (!panel) {
      return;
    }

    if (panel.status) {
      panel.status.hidden =
        true;
    }

    if (panel.content) {
      panel.content.hidden =
        false;
    }
  }

  function safeUrl(
    value
  ) {

    const raw =
      clean(value);

    if (!raw) {
      return "";
    }

    try {

      const url =
        new URL(
          raw,
          window.location.href
        );

      return (
        [
          "http:",
          "https:"
        ].includes(
          url.protocol
        )
          ? url.toString()
          : ""
      );

    } catch (_) {

      return "";
    }
  }

  function telUrl(
    value
  ) {

    const raw =
      clean(value);

    if (!raw) {
      return "";
    }

    const first =
      raw
        .split(/[\/|,]/)[0]
        .trim();

    const digits =
      first.replace(
        /[^0-9+]/g,
        ""
      );

    return digits
      ? `tel:${digits}`
      : "";
  }

  function formatNumber(
    value
  ) {

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "";
    }

    const number =
      Number(
        String(value)
          .replace(/,/g, "")
      );

    return (
      Number.isFinite(number)
        ? new Intl.NumberFormat(
            "en-US"
          ).format(
            number
          )
        : clean(value)
    );
  }

  function getProfile(
    json
  ) {

    return (
      json &&
      json.base_profile &&
      typeof json.base_profile ===
        "object"
    )
      ? json.base_profile
      : {};
  }

  /* =======================================================
     BASE OVERVIEW
  ======================================================= */

  function renderOverview(
    profile,
    base
  ) {

    if (!panel) {
      return;
    }

    const city =
      clean(
        profile.city
      ) ||
      clean(
        base
          ? base.city
          : ""
      )
        .split(",")[0];

    const state =
      clean(
        profile.state
      ) ||
      clean(
        profile.state_abbr
      ) ||
      clean(
        base
          ? base.stateCode
          : ""
      );

    const location =
      [
        city,
        state
      ]
        .filter(Boolean)
        .join(", ");

    const branch =
      clean(
        profile.branch
      ) ||
      "Air Force";

    if (
      panel.locationCard
    ) {
      panel.locationCard.hidden =
        !location;
    }

    if (panel.location) {
      panel.location.textContent =
        location;
    }

    if (
      panel.branchCard
    ) {
      panel.branchCard.hidden =
        !branch;
    }

    if (panel.branch) {
      panel.branch.textContent =
        branch;
    }

    if (
      panel.overviewSection
    ) {
      panel.overviewSection.hidden =
        !location &&
        !branch;
    }
  }

  /* =======================================================
     OPERATOR PHONE
  ======================================================= */

  function getOperator(
    profile,
    json
  ) {

    const objectValue =

      (
        profile.base_operator &&
        typeof profile.base_operator ===
          "object" &&
        profile.base_operator
      ) ||

      (
        profile.operator &&
        typeof profile.operator ===
          "object" &&
        profile.operator
      ) ||

      (
        profile.installation_operator &&
        typeof profile.installation_operator ===
          "object" &&
        profile.installation_operator
      ) ||

      {};

    const label =
      clean(
        objectValue.label ||
        objectValue.name ||
        profile.main_phone_label ||
        profile.operator_phone_label
      ) ||
      "Installation Operator";

    const phone =
      clean(
        objectValue.phone ||
        objectValue.telephone ||
        objectValue.number ||

        profile.operator_phone ||
        profile.base_operator_phone ||
        profile.installation_operator_phone ||
        profile.main_phone ||
        profile.main_base_phone ||

        (
          json
            ? json.operator_phone
            : ""
        ) ||

        (
          json
            ? json.base_operator_phone
            : ""
        ) ||

        (
          json
            ? json.main_phone
            : ""
        )
      );

    return {
      label,
      phone
    };
  }

  function renderOperator(
    profile,
    json
  ) {

    if (!panel) {
      return;
    }

    const operator =
      getOperator(
        profile,
        json
      );

    if (
      panel.operatorSection
    ) {
      panel.operatorSection.hidden =
        false;
    }

    if (
      panel.operatorName
    ) {
      panel.operatorName.textContent =
        operator.label;
    }

    if (
      panel.operatorPhone
    ) {
      panel.operatorPhone.textContent =
        operator.phone ||
        "Not yet available";
    }

    if (
      panel.operatorCall
    ) {

      const tel =
        telUrl(
          operator.phone
        );

      panel.operatorCall.hidden =
        false;

      if (tel) {

        panel.operatorCall.href =
          tel;

        panel.operatorCall
          .setAttribute(
            "aria-disabled",
            "false"
          );

      } else {

        panel.operatorCall
          .removeAttribute(
            "href"
          );

        panel.operatorCall
          .setAttribute(
            "aria-disabled",
            "true"
          );
      }
    }
  }

  /* =======================================================
     BASE POPULATION
  ======================================================= */

  function getPopulation(
    profile,
    json
  ) {

    const raw =

      profile.installation_population ??

      profile.base_population ??

      profile.population_on_base ??

      (
        json
          ? json.installation_population
          : null
      ) ??

      (
        json
          ? json.base_population
          : null
      ) ??

      null;

    /*
      IMPORTANT:

      Do NOT fall back to:

        json.population

      because in the PCSUnited base/city JSON
      structure that represents the surrounding
      CITY population, not the installation.
    */

    if (
      raw === null ||
      raw === undefined ||
      raw === ""
    ) {

      return {
        total: "",
        details: []
      };
    }

    if (
      typeof raw !== "object" ||
      Array.isArray(raw)
    ) {

      return {
        total:
          formatNumber(
            raw
          ),

        details:
          []
      };
    }

    const total =
      formatNumber(

        raw.total ??

        raw.total_population ??

        raw.estimated_total ??

        raw.population ??

        ""
      );

    const candidates = [

      [
        "active_duty",
        "Active Duty"
      ],

      [
        "military",
        "Military"
      ],

      [
        "civilian",
        "Civilians"
      ],

      [
        "civilians",
        "Civilians"
      ],

      [
        "dependents",
        "Dependents"
      ],

      [
        "family_members",
        "Family Members"
      ],

      [
        "reservists",
        "Reserve / Guard"
      ],

      [
        "reserve_guard",
        "Reserve / Guard"
      ],

      [
        "retirees",
        "Retirees"
      ]
    ];

    const details = [];

    const usedLabels =
      new Set();

    candidates.forEach(
      ([key, label]) => {

        if (
          usedLabels.has(
            label
          )
        ) {
          return;
        }

        const value =
          raw[key];

        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          return;
        }

        usedLabels.add(
          label
        );

        details.push(
          `${label}: ${formatNumber(value)}`
        );
      }
    );

    const note =
      clean(
        raw.note ||
        raw.notes ||
        raw.as_of_note
      );

    if (note) {
      details.push(
        note
      );
    }

    return {
      total,
      details
    };
  }

  function renderPopulation(
    profile,
    json
  ) {

    if (!panel) {
      return;
    }

    const population =
      getPopulation(
        profile,
        json
      );

    if (
      panel.populationSection
    ) {
      panel.populationSection.hidden =
        false;
    }

    if (
      panel.populationTotal
    ) {

      panel.populationTotal.textContent =
        population.total
          ? `${population.total} people`
          : "Not yet available";
    }

    if (
      panel.populationDetails
    ) {

      panel.populationDetails.innerHTML =
        population.details
          .map(
            item => `
              <div style="margin-top:4px">
                ${esc(item)}
              </div>
            `
          )
          .join("");
    }
  }

  /* =======================================================
     MISSION
  ======================================================= */

  function renderMission(
    profile
  ) {

    if (!panel) {
      return;
    }

    const mission =
      clean(
        profile.primary_mission_summary ||
        profile.mission_summary ||
        profile.mission ||
        profile.primary_mission
      );

    if (
      panel.missionSection
    ) {
      panel.missionSection.hidden =
        !mission;
    }

    if (
      panel.mission
    ) {
      panel.mission.textContent =
        mission;
    }
  }

  /* =======================================================
     GATES
  ======================================================= */

  function normalizeGates(
    profile
  ) {

    const value =
      profile
        ? profile.gates
        : null;

    if (
      Array.isArray(value)
    ) {
      return value;
    }

    if (
      value &&
      typeof value ===
        "object"
    ) {

      return Object.entries(
        value
      ).map(
        ([name, gate]) => {

          return (
            gate &&
            typeof gate ===
              "object"
          )
            ? {
                name,
                ...gate
              }

            : {
                name,
                hours:
                  gate
              };
        }
      );
    }

    return [];
  }

  function gateHours(
    gate
  ) {

    return clean(

      (
        gate
          ? gate.hours
          : ""
      ) ||

      (
        gate
          ? gate.operating_hours
          : ""
      ) ||

      (
        gate
          ? gate.hours_of_operation
          : ""
      ) ||

      (
        gate
          ? gate.schedule
          : ""
      )
    );
  }

  function gateStatus(
    gate
  ) {

    const explicit =
      clean(

        (
          gate
            ? gate.status
            : ""
        ) ||

        (
          gate
            ? gate.operating_status
            : ""
        ) ||

        (
          gate
            ? gate.access_status
            : ""
        )

      ).replaceAll(
        "_",
        " "
      );

    if (explicit) {
      return explicit;
    }

    const hours =
      gateHours(
        gate
      ).toLowerCase();

    if (
      hours.includes(
        "closed"
      )
    ) {
      return "Closed";
    }

    if (
      hours.includes(
        "24/7"
      ) ||

      hours.includes(
        "24 hours"
      ) ||

      hours.includes(
        "24-hour"
      )
    ) {
      return "Open 24/7";
    }

    if (hours) {
      return "Scheduled Access";
    }

    return "Hours Unavailable";
  }

  function gateClass(
    gate
  ) {

    const text =
      (
        clean(
          gate
            ? gate.status
            : ""
        ) +
        " " +
        gateHours(
          gate
        )
      ).toLowerCase();

    if (
      text.includes(
        "closed"
      )
    ) {
      return "is-closed";
    }

    if (
      text.includes(
        "limited"
      ) ||

      text.includes(
        "weekday"
      ) ||

      text.includes(
        "morning"
      ) ||

      text.includes(
        "restricted"
      ) ||

      text.includes(
        "outbound only"
      )
    ) {
      return "is-limited";
    }

    return "is-open";
  }

  function gateCard(
    gate
  ) {

    const hours =
      gateHours(
        gate
      );

    const location =
      clean(

        (
          gate
            ? gate.location
            : ""
        ) ||

        (
          gate
            ? gate.address
            : ""
        ) ||

        (
          gate
            ? gate.intersection
            : ""
        ) ||

        (
          gate
            ? gate.entrance
            : ""
        ) ||

        (
          gate
            ? gate.map_zone
            : ""
        )
      );

    const number =
      clean(

        (
          gate
            ? gate.phone
            : ""
        ) ||

        (
          gate
            ? gate.telephone
            : ""
        ) ||

        (
          gate
            ? gate.contact_phone
            : ""
        )
      );

    const tel =
      telUrl(
        number
      );

    return `
      <div class="pcsu-be-gate ${gateClass(gate)}">

        <div>

          <div class="pcsu-be-gate-name">
            ${esc(
              (
                gate
                  ? gate.name
                  : ""
              ) ||
              (
                gate
                  ? gate.gate_name
                  : ""
              ) ||
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

            ${esc(
              gateStatus(
                gate
              )
            )}

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
                    tel
                      ? `
                        <a href="${esc(tel)}">
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

  function renderGates(
    profile
  ) {

    if (!panel) {
      return;
    }

    const gates =
      normalizeGates(
        profile
      );

    if (
      panel.gatesSection
    ) {
      panel.gatesSection.hidden =
        !gates.length;
    }

    if (!gates.length) {

      if (
        panel.gateList
      ) {
        panel.gateList.innerHTML =
          "";
      }

      if (
        panel.extraGates
      ) {
        panel.extraGates.innerHTML =
          "";
      }

      if (
        panel.gateToggle
      ) {
        panel.gateToggle.hidden =
          true;
      }

      return;
    }

    const withHours =
      gates.filter(
        gate =>
          gateHours(
            gate
          )
      );

    const pool =
      withHours.length
        ? withHours
        : gates;

    const visible = [];

    pool
      .filter(
        gate => {

          const hours =
            gateHours(
              gate
            ).toLowerCase();

          return (
            hours.includes(
              "24/7"
            ) ||

            hours.includes(
              "24 hours"
            ) ||

            hours.includes(
              "24-hour"
            )
          );
        }
      )
      .slice(
        0,
        2
      )
      .forEach(
        gate =>
          visible.push(
            gate
          )
      );

    pool.forEach(
      gate => {

        if (
          visible.length < 3 &&
          !visible.includes(
            gate
          )
        ) {
          visible.push(
            gate
          );
        }

      }
    );

    const extra =
      gates.filter(
        gate =>
          !visible.includes(
            gate
          )
      );

    if (
      panel.gateList
    ) {

      panel.gateList.innerHTML =
        visible
          .map(
            gateCard
          )
          .join("");
    }

    if (
      panel.extraGates
    ) {

      panel.extraGates.innerHTML =
        extra
          .map(
            gateCard
          )
          .join("");

      panel.extraGates
        .classList
        .remove(
          "is-open"
        );
    }

    if (
      panel.gateToggle
    ) {

      panel.gateToggle.hidden =
        !extra.length;

      panel.gateToggle.textContent =
        "View All";
    }
  }

  /* =======================================================
     VISITOR CENTER
  ======================================================= */

  function officialLink(
    links,
    keys
  ) {

    for (
      const key of keys
    ) {

      if (
        links &&
        links[key]
      ) {

        return safeUrl(
          links[key]
        );
      }
    }

    return "";
  }

  function renderVisitor(
    profile,
    links
  ) {

    if (!panel) {
      return;
    }

    const visitor =
      (
        profile &&
        profile.visitor_control_center &&
        typeof profile.visitor_control_center ===
          "object"
      )
        ? profile.visitor_control_center
        : {};

    const available =
      Boolean(

        visitor.name ||

        visitor.phone ||

        visitor.address ||

        visitor.location ||

        visitor.hours ||

        visitor.operating_hours
      );

    if (
      panel.visitorSection
    ) {

      panel.visitorSection.hidden =
        !available;
    }

    if (!available) {

      if (
        panel.visitorDetails
      ) {
        panel.visitorDetails.innerHTML =
          "";
      }

      if (
        panel.visitorLink
      ) {
        panel.visitorLink.hidden =
          true;
      }

      return;
    }

    if (
      panel.visitorName
    ) {

      panel.visitorName.textContent =
        visitor.name ||
        "Visitor Control Center";
    }

    const rows = [];

    const address =
      clean(
        visitor.address ||
        visitor.location
      );

    const hours =
      clean(

        visitor.hours ||

        visitor.operating_hours ||

        visitor.hours_of_operation ||

        visitor.schedule
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

    if (
      visitor.phone
    ) {

      const tel =
        telUrl(
          visitor.phone
        );

      rows.push(`
        <div class="pcsu-be-detail-row">

          <div class="pcsu-be-detail-icon">
            ☎
          </div>

          <div class="pcsu-be-detail-value">

            ${
              tel
                ? `
                  <a href="${esc(tel)}">
                    ${esc(visitor.phone)}
                  </a>
                `
                : esc(
                    visitor.phone
                  )
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

    if (
      panel.visitorDetails
    ) {

      panel.visitorDetails.innerHTML =
        rows.join("");
    }

    if (
      panel.visitorLink
    ) {

      const href =

        safeUrl(
          visitor.website ||
          visitor.url
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
        );

      if (href) {

        panel.visitorLink.href =
          href;

        panel.visitorLink.hidden =
          false;

      } else {

        panel.visitorLink.hidden =
          true;
      }
    }
  }

  /* =======================================================
     RENDER BASE JSON
  ======================================================= */

  function renderBaseInformation(
    json,
    base
  ) {

    if (!panel) {
      return;
    }

    const data =
      json &&
      typeof json ===
        "object"
        ? json
        : {};

    const profile =
      getProfile(
        data
      );

    const links =
      (
        profile.official_links &&
        typeof profile.official_links ===
          "object"
      )
        ? profile.official_links

        : (
            data.official_links &&
            typeof data.official_links ===
              "object"
              ? data.official_links
              : {}
          );

    renderOverview(
      profile,
      base
    );

    renderOperator(
      profile,
      data
    );

    renderPopulation(
      profile,
      data
    );

    renderMission(
      profile
    );

    renderGates(
      profile
    );

    renderVisitor(
      profile,
      links
    );

    showPanelContent();
  }

  /* =======================================================
     DIRECT JSON LOADING
  ======================================================= */

  function getBaseFileName(
    base
  ) {

    const file =
      clean(

        (
          base
            ? base.fileName
            : ""
        ) ||

        (
          base
            ? base.filename
            : ""
        ) ||

        (
          base
            ? base.file
            : ""
        ) ||

        (
          base
            ? base.jsonFile
            : ""
        ) ||

        (
          base
            ? base.json_file
            : ""
        )
      );

    if (!file) {
      return "";
    }

    return (
      /\.json$/i.test(
        file
      )
        ? file
        : `${file}.json`
    );
  }

  async function loadBaseInformation(
    base
  ) {

    if (!panel) {
      return;
    }

    const request =
      ++panelRequest;

    if (!base) {

      loadedFile = "";

      loadedJson = null;

      showPanelStatus(
        "Select a state and choose an Air Force base to view installation information."
      );

      return;
    }

    const file =
      getBaseFileName(
        base
      );

    const url =
      (
        base &&
        base.jsonUrl
      )
        ? base.jsonUrl
        : directJsonUrl(
            file
          );

    if (
      !file ||
      !url
    ) {

      showPanelStatus(
        "The selected base does not have a JSON file configured."
      );

      return;
    }

    if (
      loadedJson &&
      loadedFile
        .toLowerCase() ===
        file.toLowerCase()
    ) {

      renderBaseInformation(
        loadedJson,
        base
      );

      return;
    }

    showPanelStatus(
      "Loading selected base information..."
    );

    try {

      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (
        !response.ok
      ) {

        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      if (
        request !==
        panelRequest
      ) {
        return;
      }

      /*
        Direct JSON is expected.

        This also tolerates:
        {
          "data": { ... }
        }
        if you ever wrap it later.
      */

      const json =
        (
          result &&
          result.data &&
          typeof result.data ===
            "object"
        )
          ? result.data
          : result;

      if (
        !json ||
        typeof json !==
          "object"
      ) {

        throw new Error(
          "Invalid JSON payload."
        );
      }

      loadedFile =
        file;

      loadedJson =
        json;

      renderBaseInformation(
        json,
        base
      );

    } catch (error) {

      if (
        request !==
        panelRequest
      ) {
        return;
      }

      console.warn(
        `[PCSU Base Map] Could not load ${file}:`,
        error
      );

      loadedFile = "";

      loadedJson = null;

      showPanelStatus(
        `Base information for ${base.base || "this installation"} could not load. Verify the direct JSON path.`
      );
    }
  }

  /* =======================================================
     GATE VIEW ALL BUTTON
  ======================================================= */

  if (
    panel &&
    panel.gateToggle
  ) {

    panel.gateToggle
      .addEventListener(
        "click",
        () => {

          if (
            !panel.extraGates
          ) {
            return;
          }

          const open =
            panel.extraGates
              .classList
              .toggle(
                "is-open"
              );

          panel.gateToggle.textContent =
            open
              ? "Show Less"
              : "View All";
        }
      );
  }

  /* =======================================================
     MAP -> PANEL CONNECTION
  ======================================================= */

  window.addEventListener(
    "pcsunited:base-map-updated",
    event => {

      loadBaseInformation(
        event.detail &&
        event.detail.selectedBase
          ? event.detail.selectedBase
          : null
      );

    }
  );

  /* =======================================================
     INITIAL EMPTY STATE
  ======================================================= */

  updateDemographicsLink(
    null
  );

  showPanelStatus(
    "Select a state and choose an Air Force base to view installation information."
  );

  /* =======================================================
     BUILD THE USA MAP
  ======================================================= */

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
          .translate(
            [480, 300]
          )
          .scale(
            1250
          );

      const path =
        d3.geoPath(
          projection
        );

      /* ===================================================
         STATE SHAPES
      =================================================== */

      svg
        .append("g")
        .attr(
          "class",
          "pcsu-state-layer"
        )
        .selectAll(
          "path"
        )
        .data(
          states
        )
        .join(
          "path"
        )
        .attr(
          "class",
          state => {

            const code =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            return (
              STATE_BASES[
                code
              ]
                ? "pcsu-state has-bases"
                : "pcsu-state"
            );
          }
        )
        .attr(
          "id",
          state => {

            const code =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            return (
              `state-${code}`
            );
          }
        )
        .attr(
          "d",
          path
        )
        .on(
          "click",
          (
            event,
            state
          ) => {

            const code =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            if (code) {
              selectState(
                code
              );
            }
          }
        );

      /* ===================================================
         STATE BORDER MESH
      =================================================== */

      svg
        .append(
          "path"
        )
        .datum(
          topojson.mesh(
            us,
            us.objects.states,
            (a, b) =>
              a !== b
          )
        )
        .attr(
          "fill",
          "none"
        )
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
        .attr(
          "d",
          path
        );

      /* ===================================================
         STATE LABELS
      =================================================== */

      svg
        .append("g")
        .attr(
          "class",
          "pcsu-state-label-layer"
        )
        .selectAll(
          "text"
        )
        .data(
          states
        )
        .join(
          "text"
        )
        .attr(
          "class",
          "pcsu-state-label"
        )
        .attr(
          "x",
          state => {

            const centroid =
              path.centroid(
                state
              );

            return (
              Number.isFinite(
                centroid[0]
              )
                ? centroid[0]
                : -100
            );
          }
        )
        .attr(
          "y",
          state => {

            const centroid =
              path.centroid(
                state
              );

            return (
              Number.isFinite(
                centroid[1]
              )
                ? centroid[1]
                : -100
            );
          }
        )
        .text(
          state => {

            return (
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ] ||
              ""
            );
          }
        )
        .style(
          "display",
          state => {

            const code =
              FIPS_TO_ABBR[
                String(
                  state.id
                ).padStart(
                  2,
                  "0"
                )
              ];

            return (
              [
                "RI",
                "DE",
                "CT",
                "NJ",
                "MD",
                "MA",
                "DC"
              ].includes(
                code
              )
                ? "none"
                : "block"
            );
          }
        );

      /* ===================================================
         BASE MARKER LAYER
      =================================================== */

      markerLayer =
        svg
          .append("g")
          .attr(
            "id",
            "pcsu-base-marker-layer"
          );

      mapReady =
        true;

      /* ===================================================
         INITIAL STATE
      =================================================== */

      if (
        pendingSelection
      ) {

        const pending =
          pendingSelection;

        pendingSelection =
          null;

        renderState(
          pending.stateCode,
          pending.selectedBaseId,
          pending.options
        );

      } else {

        /*
          Keep Texas as the existing default state,
          but DO NOT auto-select a base.
        */

        renderState(
          DEFAULT_STATE,
          "",
          {
            scrollCard:
              false
          }
        );
      }

      /* ===================================================
         READY EVENT
      =================================================== */

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
                new Date()
                  .toISOString()
            }
          }
        )
      );

    })

    .catch(error => {

      console.warn(
        "[PCSU Base Map] USA map data could not load:",
        error
      );

      if (
        selectedBaseNameEl
      ) {

        selectedBaseNameEl.textContent =
          "Map unavailable";
      }

      if (
        panelCopyEl
      ) {

        panelCopyEl.textContent =
          "The map could not load. Please refresh the page.";
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

          The map data could not load.
          Please refresh the page.

        </div>
      `;

      showPanelStatus(
        "The map data could not load. Please refresh the page."
      );

    });

})();
