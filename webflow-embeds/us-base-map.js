<!-- =========================================================
  PCSUnited • Real Interactive U.S. Base Demographics Map
  v3.0.7 • PASSIVE BASICBRAIN ISOLATION + SCROLL-SAFE PRESELECT

  ROOT CAUSE FIXED (v3.0.5):
  - bindBasicBrainEvents() reacted to passive pcsunited:* events
  - preselectFromGlobals() hydrated from PCSU_BASICBRAIN_CURRENT on load
  - renderState() always called scrollIntoView() on the selected base button,
    which scrolled the page down to the Base Demographics embed

  v3.0.7 RULE:
  - Ignore ALL passive BasicBrain events (autoNavigate !== true)
  - Only pcsu:base-selected with autoNavigate === true may update the map
  - scrollIntoView only runs on intentional user navigation
========================================================= -->

<div id="pcsu-real-us-map">

  <style>

    #pcsu-real-us-map,
    #pcsu-real-us-map *{
      box-sizing:border-box;
      font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }

    #pcsu-real-us-map{
      width:100%;
      color:#e9ecff;
    }

    #pcsu-map-card{
      position:relative;
      width:100%;
      padding:34px;
      border-radius:34px;
      overflow:hidden;

      background:
        radial-gradient(circle at top left, rgba(142,243,197,.14), transparent 28%),
        radial-gradient(circle at bottom right, rgba(106,167,255,.14), transparent 30%),
        linear-gradient(
          145deg,
          rgba(12,16,30,.92),
          rgba(9,12,24,.96)
        );

      border:1px solid rgba(255,255,255,.10);

      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.05),
        inset 0 -1px 0 rgba(255,255,255,.02),
        0 30px 80px rgba(0,0,0,.42);
    }

    #pcsu-map-card::before{
      content:"";
      position:absolute;
      inset:0;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.05),
          transparent 24%
        );

      pointer-events:none;
    }

    #pcsu-map-eyebrow{
      display:inline-flex;
      align-items:center;

      padding:8px 14px;

      border-radius:999px;

      border:1px solid rgba(142,243,197,.14);

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.06),
          rgba(255,255,255,.03)
        );

      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);

      color:#8ef3c5;

      font-size:10px;
      font-weight:900;
      letter-spacing:.18em;
      text-transform:uppercase;

      margin-bottom:14px;

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.08),
        0 12px 26px rgba(0,0,0,.14);
    }

    #pcsu-map-title{
      font-size:clamp(34px,4vw,58px);
      line-height:.96;
      font-weight:900;
      letter-spacing:-.065em;

      margin:0;
      color:#ffffff;

      text-shadow:
        0 2px 18px rgba(0,0,0,.20);
    }

    #pcsu-map-copy{
      max-width:820px;

      margin-top:18px;
      margin-bottom:28px;

      color:#aeb8db;

      font-size:16px;
      line-height:1.75;
      font-weight:500;
    }

    #pcsu-map-layout{
      display:grid;

      grid-template-columns:
        minmax(0,1.5fr)
        minmax(320px,.58fr);

      gap:24px;
      align-items:stretch;
    }

    #pcsu-map-stage{
      position:relative;

      min-height:540px;

      padding:20px;

      border-radius:30px;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.065),
          rgba(255,255,255,.035)
        );

      border:1px solid rgba(255,255,255,.10);

      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.06),
        inset 0 -1px 0 rgba(255,255,255,.02),
        0 24px 54px rgba(0,0,0,.20);
    }

    #pcsu-map-stage::before{
      content:"";

      position:absolute;
      inset:0;

      border-radius:inherit;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.04),
          transparent 34%
        );

      pointer-events:none;
    }

    #pcsu-us-svg{
      width:100%;
      height:100%;
      min-height:500px;
      display:block;
    }

    .pcsu-state{
      fill:#dfe6f2;

      stroke:#18233b;
      stroke-width:1.15;

      cursor:pointer;

      transition:
        fill .18s ease,
        transform .18s ease,
        filter .18s ease,
        opacity .18s ease;
    }

    .pcsu-state.has-bases{
      fill:#edf2fb;
    }

    .pcsu-state:hover{
      fill:#8ef3c5;

      filter:
        drop-shadow(0 0 12px rgba(142,243,197,.55));

      opacity:1;
    }

    .pcsu-state.is-active{
      fill:#8ef3c5;

      filter:
        drop-shadow(0 0 18px rgba(142,243,197,.75));
    }

    .pcsu-state-label{
      fill:#152038;

      font-size:10px;
      font-weight:900;

      letter-spacing:.02em;

      pointer-events:none;
      text-anchor:middle;
    }

    #pcsu-base-marker-layer{
      pointer-events:none;
    }

    .pcsu-base-marker-ring{
      fill:none;
      stroke:#8ef3c5;
      stroke-width:2;
      opacity:.72;
      filter:drop-shadow(0 0 10px rgba(142,243,197,.85));
      animation:pcsuBasePulse 1.9s ease-out infinite;
    }

    .pcsu-base-marker-dot{
      fill:#8ef3c5;
      stroke:#ffffff;
      stroke-width:1.4;
      filter:
        drop-shadow(0 0 10px rgba(142,243,197,.95))
        drop-shadow(0 0 20px rgba(142,243,197,.55));
    }

    .pcsu-base-marker-pin{
      fill:#f6d06d;
      stroke:#ffffff;
      stroke-width:1.1;
      filter:
        drop-shadow(0 0 10px rgba(246,208,109,.75))
        drop-shadow(0 0 18px rgba(142,243,197,.45));
    }

    .pcsu-base-marker-label-bg{
      fill:rgba(7,12,24,.92);
      stroke:rgba(142,243,197,.32);
      stroke-width:1;
      rx:10;
      ry:10;
      filter:drop-shadow(0 10px 22px rgba(0,0,0,.35));
    }

    .pcsu-base-marker-label{
      fill:#ffffff;
      font-size:11px;
      font-weight:900;
      letter-spacing:-.02em;
    }

    .pcsu-base-marker-sub{
      fill:#a8b0d6;
      font-size:9px;
      font-weight:800;
    }

    @keyframes pcsuBasePulse{
      0%{
        r:5;
        opacity:.9;
      }

      70%{
        r:20;
        opacity:0;
      }

      100%{
        r:22;
        opacity:0;
      }
    }

    #pcsu-base-panel{
      position:relative;

      padding:26px;

      border-radius:30px;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.07),
          rgba(255,255,255,.04)
        );

      border:1px solid rgba(255,255,255,.10);

      backdrop-filter:blur(14px);
      -webkit-backdrop-filter:blur(14px);

      min-height:540px;

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.06),
        inset 0 -1px 0 rgba(255,255,255,.02),
        0 24px 54px rgba(0,0,0,.20);
    }

    #pcsu-base-panel::before{
      content:"";

      position:absolute;
      inset:0;

      border-radius:inherit;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.04),
          transparent 36%
        );

      pointer-events:none;
    }

    #pcsu-panel-kicker{
      display:inline-flex;
      align-items:center;

      padding:8px 13px;

      border-radius:999px;

      border:1px solid rgba(106,167,255,.18);

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.05),
          rgba(255,255,255,.03)
        );

      color:#6aa7ff;

      font-size:10px;
      font-weight:900;
      letter-spacing:.18em;
      text-transform:uppercase;

      margin-bottom:14px;
    }

    #pcsu-selected-state{
      font-size:34px;
      line-height:1;
      font-weight:900;
      letter-spacing:-.05em;

      color:#ffffff;

      margin-bottom:12px;

      text-shadow:
        0 2px 14px rgba(0,0,0,.16);
    }

    #pcsu-panel-copy{
      color:#a8b0d6;

      font-size:15px;
      line-height:1.7;
      font-weight:500;

      margin-bottom:22px;
    }

    #pcsu-base-list{
      display:grid;
      gap:12px;

      max-height:620px;
      overflow:auto;
      padding-right:4px;
    }

    #pcsu-base-list::-webkit-scrollbar{
      width:8px;
    }

    #pcsu-base-list::-webkit-scrollbar-thumb{
      background:rgba(255,255,255,.12);
      border-radius:999px;
    }

    .pcsu-base-btn{
      appearance:none;

      position:relative;

      width:100%;

      border:1px solid rgba(255,255,255,.10);

      border-radius:22px;

      padding:18px 18px;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.06),
          rgba(255,255,255,.035)
        );

      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);

      color:#e9ecff;

      text-align:left;

      cursor:pointer;

      overflow:hidden;

      transition:
        transform .18s ease,
        border-color .18s ease,
        background .18s ease,
        box-shadow .18s ease;

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.06),
        0 18px 34px rgba(0,0,0,.12);
    }

    .pcsu-base-btn::before{
      content:"";

      position:absolute;
      inset:0;

      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,.04),
          transparent 42%
        );

      pointer-events:none;
    }

    .pcsu-base-btn:hover{
      transform:translateY(-2px);

      border-color:rgba(142,243,197,.34);

      background:
        linear-gradient(
          180deg,
          rgba(142,243,197,.10),
          rgba(106,167,255,.06)
        );

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.08),
        0 24px 42px rgba(0,0,0,.18);
    }

    .pcsu-base-btn.is-selected{
      border-color:rgba(142,243,197,.62);

      background:
        linear-gradient(
          180deg,
          rgba(142,243,197,.16),
          rgba(106,167,255,.08)
        );

      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.10),
        0 0 0 1px rgba(142,243,197,.12),
        0 24px 44px rgba(0,0,0,.22),
        0 0 28px rgba(142,243,197,.20);
    }

    .pcsu-base-btn.is-selected::after{
      content:"AFB Selected";

      position:absolute;
      right:14px;
      top:14px;

      padding:5px 8px;

      border-radius:999px;

      background:rgba(142,243,197,.12);
      border:1px solid rgba(142,243,197,.22);

      color:#8ef3c5;

      font-size:8px;
      font-weight:900;
      letter-spacing:.14em;
      text-transform:uppercase;
    }

    .pcsu-base-btn.is-selected .pcsu-base-name{
      color:#8ef3c5;
    }

    .pcsu-base-name{
      display:block;

      font-size:16px;
      line-height:1.2;
      font-weight:900;
      letter-spacing:-.02em;

      color:#ffffff;
    }

    .pcsu-base-meta{
      display:block;

      margin-top:7px;

      font-size:12px;
      line-height:1.6;
      font-weight:600;

      color:#a8b0d6;
    }

    @media(max-width:980px){

      #pcsu-map-layout{
        grid-template-columns:1fr;
      }

      #pcsu-map-stage,
      #pcsu-base-panel{
        min-height:auto;
      }

      #pcsu-us-svg{
        min-height:400px;
      }

    }

    @media(max-width:640px){

      #pcsu-map-card{
        padding:22px;
        border-radius:28px;
      }

      #pcsu-map-title{
        font-size:36px;
      }

      #pcsu-map-copy{
        font-size:14px;
        line-height:1.7;
      }

      #pcsu-map-stage,
      #pcsu-base-panel{
        padding:18px;
        border-radius:24px;
      }

      #pcsu-selected-state{
        font-size:28px;
      }

      .pcsu-base-btn{
        border-radius:18px;
      }

      .pcsu-base-btn.is-selected::after{
        position:relative;
        display:inline-flex;
        right:auto;
        top:auto;
        margin-top:10px;
      }

    }

  </style>

  <div id="pcsu-map-card">

    <div id="pcsu-map-eyebrow">
      Base Demographics Explorer
    </div>

    <h2 id="pcsu-map-title">
      Search Air Force Bases by State
    </h2>

    <div id="pcsu-map-copy">
      Hover over a state to explore available PCSUnited base markets. Click a state to view supported Air Force bases and open the matching Base Demographics profile.
    </div>

    <div id="pcsu-map-layout">

      <div id="pcsu-map-stage">
        <svg id="pcsu-us-svg" viewBox="0 0 960 600" preserveAspectRatio="xMidYMid meet"></svg>
      </div>

      <aside id="pcsu-base-panel">

        <div id="pcsu-panel-kicker">
          Selected State
        </div>

        <div id="pcsu-selected-state">
          Choose a state
        </div>

        <div id="pcsu-panel-copy">
          Click a state on the map to view available profiles.
        </div>

        <div id="pcsu-base-list"></div>

      </aside>

    </div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/topojson-client@3"></script>

  <script>

    (() => {

      "use strict";

      const VERSION = "3.0.7";
      const MOUNT_KEY = "PCSU_US_BASE_MAP_V307_MOUNTED";

      if(window[MOUNT_KEY]){
        console.warn("[PCSU Base Map] Duplicate mount blocked:", VERSION);
        return;
      }
      window[MOUNT_KEY] = true;

      if(window.PCSU_US_BASE_MAP?.__mounted_v305){
        console.warn("[PCSU Base Map] Older v3.0.5 instance detected on page — remove the old embed to prevent duplicate listeners.");
      }

      const mapRoot = document.getElementById("pcsu-real-us-map");
      if(!mapRoot){
        console.warn("[PCSU Base Map] Root element missing.");
        return;
      }

      const SCROLL_DEBUG =
        window.PCSU_SCROLL_DEBUG === true ||
        /(?:\?|&)pcsuScrollDebug=1(?:&|$)/.test(window.location.search || "");

      function logScrollDebug(tag, extra){
        if(!SCROLL_DEBUG) return;
        const payload = {
          tag,
          scrollX:window.scrollX || window.pageXOffset || 0,
          scrollY:window.scrollY || window.pageYOffset || 0,
          version:VERSION,
          ...(extra || {})
        };
        console.log("[PCSU Scroll Debug · Base Map]", payload);
      }

      window.PCSU_US_BASE_MAP = {
        version:VERSION,
        __mounted_v307:true
      };

      const STORAGE_KEY =
        "pcsunited.selectedBase.v1";

      const JSON_URL_KEY =
        "pcsunited.selectedCityJsonUrl.v1";

      const LIVE_BASE_DEMOGRAPHICS_PATH =
        "/air-force/base-demographics-air-force";

      const JSON_BASE_URL =
        window.PCSU_CITIES_BASE_URL ||
        "https://raw.githubusercontent.com/djoneorozco/PCSUnited/main/netlify/functions/cities/";

      const DEFAULT_STATE =
        "TX";

      const FIPS_TO_ABBR = {
        "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC",
        "12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY",
        "22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT",
        "31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
        "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT",
        "50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY"
      };

      const STATE_NAMES = {
        AL:"Alabama", AK:"Alaska", AZ:"Arizona", CA:"California", CO:"Colorado",
        DE:"Delaware", FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho",
        IL:"Illinois", KS:"Kansas", LA:"Louisiana", MA:"Massachusetts", MD:"Maryland",
        MS:"Mississippi", MT:"Montana", NC:"North Carolina", ND:"North Dakota",
        NE:"Nebraska", NJ:"New Jersey", NM:"New Mexico", NV:"Nevada", OH:"Ohio",
        OK:"Oklahoma", SC:"South Carolina", SD:"South Dakota", TX:"Texas",
        UT:"Utah", VA:"Virginia", WA:"Washington", WY:"Wyoming"
      };

      const BASE_REGISTRY = {

        AK:[
          ["Joint Base Elmendorf-Richardson","Elmendorf.json","Anchorage, AK",61.2500,-149.8065],
          ["Eielson AFB","Eielson.json","Fairbanks, AK",64.6657,-147.1015]
        ],

        AL:[
          ["Maxwell AFB","Maxwell.json","Montgomery, AL",32.3829,-86.3658]
        ],

        AZ:[
          ["Davis-Monthan AFB","Davis-Monthan.json","Tucson, AZ",32.1665,-110.8832],
          ["Luke AFB","Luke.json","Glendale, AZ",33.5350,-112.3832]
        ],

        CA:[
          ["Beale AFB","Beale.json","Marysville, CA",39.1361,-121.4366],
          ["Edwards AFB","Edwards.json","Edwards, CA",34.9054,-117.8837],
          ["Los Angeles AFB","Los-Angeles.json","El Segundo, CA",33.9189,-118.3807],
          ["Travis AFB","Travis.json","Fairfield, CA",38.2627,-121.9275],
          ["Vandenberg SFB","Vandenberg.json","Lompoc, CA",34.7420,-120.5724]
        ],

        CO:[
          ["Peterson SFB","Peterson.json","Colorado Springs, CO",38.8236,-104.7006],
          ["Schriever SFB","Schriever.json","Colorado Springs, CO",38.8030,-104.5255],
          ["U.S. Air Force Academy","Air-Force-Academy.json","Colorado Springs, CO",39.0088,-104.8911]
        ],

        DE:[
          ["Dover AFB","Dover.json","Dover, DE",39.1295,-75.4660]
        ],

        FL:[
          ["Eglin AFB","Eglin.json","Valparaiso, FL",30.4832,-86.5254],
          ["Hurlburt Field","Hurlburt.json","Mary Esther, FL",30.4278,-86.6893],
          ["MacDill AFB","MacDill.json","Tampa, FL",27.8493,-82.5212],
          ["Patrick SFB","Patrick.json","Cocoa Beach, FL",28.2349,-80.6101],
          ["Tyndall AFB","Tyndall.json","Panama City, FL",30.0696,-85.5754]
        ],

        GA:[
          ["Moody AFB","Moody.json","Valdosta, GA",30.9678,-83.1930],
          ["Robins AFB","Robins.json","Warner Robins, GA",32.6401,-83.5919]
        ],

        HI:[
          ["Joint Base Pearl Harbor-Hickam","Hickam.json","Honolulu, HI",21.3187,-157.9224]
        ],

        ID:[
          ["Mountain Home AFB","Mountain-Home.json","Mountain Home, ID",43.0436,-115.8724]
        ],

        IL:[
          ["Scott AFB","Scott.json","Belleville, IL",38.5452,-89.8352]
        ],

        KS:[
          ["McConnell AFB","McConnell.json","Wichita, KS",37.6231,-97.2672]
        ],

        LA:[
          ["Barksdale AFB","Barksdale.json","Bossier City, LA",32.5018,-93.6627]
        ],

        MA:[
          ["Hanscom AFB","Hanscom.json","Bedford, MA",42.4699,-71.2890]
        ],

        MD:[
          ["Joint Base Andrews","Andrews.json","Camp Springs, MD",38.8108,-76.8669]
        ],

        MS:[
          ["Columbus AFB","Columbus.json","Columbus, MS",33.6438,-88.4438],
          ["Keesler AFB","Keesler.json","Biloxi, MS",30.4104,-88.9244]
        ],

        MT:[
          ["Malmstrom AFB","Malmstrom.json","Great Falls, MT",47.5053,-111.1873]
        ],

        NC:[
          ["Seymour Johnson AFB","Seymour-Johnson.json","Goldsboro, NC",35.3394,-77.9606]
        ],

        ND:[
          ["Grand Forks AFB","Grand-Forks.json","Grand Forks, ND",47.9611,-97.4012],
          ["Minot AFB","Minot.json","Minot, ND",48.4158,-101.3580]
        ],

        NE:[
          ["Offutt AFB","Offutt.json","Bellevue, NE",41.1183,-95.9125]
        ],

        NJ:[
          ["Joint Base McGuire-Dix-Lakehurst","McGuire.json","Wrightstown, NJ",40.0156,-74.5917]
        ],

        NM:[
          ["Cannon AFB","Cannon.json","Clovis, NM",34.3828,-103.3221],
          ["Holloman AFB","Holloman.json","Alamogordo, NM",32.8525,-106.1065],
          ["Kirtland AFB","Kirtland.json","Albuquerque, NM",35.0402,-106.6092]
        ],

        NV:[
          ["Creech AFB","Creech.json","Indian Springs, NV",36.5872,-115.6734],
          ["Nellis AFB","Nellis.json","Las Vegas, NV",36.2362,-115.0343]
        ],

        OH:[
          ["Wright-Patterson AFB","Wright-Patterson.json","Dayton, OH",39.8261,-84.0483]
        ],

        OK:[
          ["Altus AFB","Altus.json","Altus, OK",34.6671,-99.2667],
          ["Tinker AFB","Tinker.json","Oklahoma City, OK",35.4147,-97.3866],
          ["Vance AFB","Vance.json","Enid, OK", 36.3392,-97.9165]
        ],

        SC:[
          ["Joint Base Charleston","Charleston.json","Charleston, SC",32.8986,-80.0405],
          ["Shaw AFB","Shaw.json","Sumter, SC",33.9727,-80.4706]
        ],

        SD:[
          ["Ellsworth AFB","Ellsworth.json","Rapid City, SD",44.1450,-103.1036]
        ],

        TX:[
          ["Dyess AFB","Dyess.json","Abilene, TX",32.4208,-99.8546],
          ["Goodfellow AFB","Goodfellow.json","San Angelo, TX",31.4343,-100.4027],
          ["Joint Base San Antonio-Lackland","Lackland.json","San Antonio, TX",29.3842,-98.5811],
          ["Laughlin AFB","Laughlin.json","Del Rio, TX",29.3595,-100.7780],
          ["Joint Base San Antonio-Randolph","Randolph.json","San Antonio, TX",29.5297,-98.2789],
          ["Sheppard AFB","Sheppard.json","Wichita Falls, TX",33.9888,-98.4919]
        ],

        UT:[
          ["Hill AFB","Hill.json","Ogden, UT",41.1240,-111.9730]
        ],

        VA:[
          ["Joint Base Langley-Eustis","Langley.json","Hampton, VA",37.0838,-76.3605]
        ],

        WA:[
          ["Fairchild AFB","Fairchild.json","Spokane, WA",47.6151,-117.6558],
          ["Joint Base Lewis-McChord","McChord.json","Tacoma, WA",47.1339,-122.4916]
        ],

        WY:[
          ["F. E. Warren AFB","F-E-Warren.json","Cheyenne, WY",41.1339,-104.8660]
        ]

      };

      const BASICBRAIN_BASE_ALIASES = {
        "Andrews AFB":"MD",
        "Joint Base Andrews":"MD",

        "Barksdale AFB":"LA",
        "Beale AFB":"CA",
        "Cannon AFB":"NM",
        "Charleston AFB":"SC",
        "Joint Base Charleston":"SC",
        "Columbus AFB":"MS",
        "Davis-Monthan AFB":"AZ",
        "Dover AFB":"DE",
        "Dyess AFB":"TX",
        "Edwards AFB":"CA",
        "Eglin AFB":"FL",
        "Ellsworth AFB":"SD",
        "Fairchild AFB":"WA",
        "FE Warren AFB":"WY",
        "F.E. Warren AFB":"WY",
        "F. E. Warren AFB":"WY",
        "Grand Forks AFB":"ND",
        "Hanscom AFB":"MA",
        "Hill AFB":"UT",
        "Holloman AFB":"NM",
        "Hurlburt Field":"FL",

        "JBSA Fort Sam Houston":"TX",
        "Fort Sam Houston":"TX",
        "Joint Base San Antonio-Fort Sam Houston":"TX",

        "JBSA Lackland":"TX",
        "Lackland AFB":"TX",
        "Joint Base San Antonio-Lackland":"TX",

        "JBSA Randolph":"TX",
        "Randolph AFB":"TX",
        "Joint Base San Antonio-Randolph":"TX",

        "Keesler AFB":"MS",
        "Kirtland AFB":"NM",
        "Langley AFB":"VA",
        "Joint Base Langley-Eustis":"VA",
        "Laughlin AFB":"TX",
        "Little Rock AFB":"AR",
        "Luke AFB":"AZ",
        "MacDill AFB":"FL",
        "Malmstrom AFB":"MT",
        "Maxwell AFB":"AL",
        "McConnell AFB":"KS",
        "McGuire AFB":"NJ",
        "Joint Base McGuire-Dix-Lakehurst":"NJ",
        "Minot AFB":"ND",
        "Moody AFB":"GA",
        "Mountain Home AFB":"ID",
        "Nellis AFB":"NV",
        "Offutt AFB":"NE",
        "Patrick SFB":"FL",
        "Peterson SFB":"CO",
        "Robins AFB":"GA",
        "Scott AFB":"IL",
        "Seymour Johnson AFB":"NC",
        "Shaw AFB":"SC",
        "Sheppard AFB":"TX",
        "Tinker AFB":"OK",
        "Travis AFB":"CA",
        "Tyndall AFB":"FL",
        "Vance AFB":"OK",
        "Vandenberg SFB":"CA",
        "Whiteman AFB":"MO",
        "Wright-Patterson AFB":"OH"
      };

      const svg = d3.select("#pcsu-us-svg");

      const selectedStateEl =
        document.getElementById("pcsu-selected-state");

      const panelCopyEl =
        document.getElementById("pcsu-panel-copy");

      const baseListEl =
        document.getElementById("pcsu-base-list");

      let mapReady = false;
      let pendingStateCode = "";
      let pendingBaseId = "";
      let pendingAllowScroll = false;
      let currentStateCode = "";
      let currentBaseId = "";
      let projection = null;
      let markerLayer = null;

      function esc(str){
        return String(str ?? "")
          .replaceAll("&","&amp;")
          .replaceAll("<","&lt;")
          .replaceAll(">","&gt;")
          .replaceAll('"',"&quot;")
          .replaceAll("'","&#039;");
      }

      function slugify(fileName){
        return String(fileName || "")
          .replace(/\.json$/i, "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      function normalizeKey(value){
        return String(value || "")
          .toLowerCase()
          .replace(/jointbase/g, "jb")
          .replace(/airforcebase/g, "afb")
          .replace(/[^a-z0-9]/g, "");
      }

      function makeBase(row, stateCode){

        const name     = row[0];
        const fileName = row[1];
        const city     = row[2];
        const lat      = row[3];
        const lng      = row[4];

        const id = slugify(fileName);

        return {
          id,
          slug:id,
          fileName,
          base:name,
          label:name,
          name,
          city,
          state:stateCode,
          lat,
          lng,
          jsonUrl:JSON_BASE_URL + fileName
        };
      }

      const STATE_BASES = Object.fromEntries(
        Object.entries(BASE_REGISTRY).map(([stateCode, rows]) => [
          stateCode,
          rows.map(row => makeBase(row, stateCode))
        ])
      );

      const BASE_TO_STATE = (() => {

        const out = {};

        Object.entries(STATE_BASES).forEach(([stateCode, bases]) => {

          bases.forEach(base => {

            [
              base.base,
              base.name,
              base.label,
              base.fileName,
              base.id,
              base.slug
            ].forEach(value => {

              const key = normalizeKey(value);

              if(key) out[key] = stateCode;

            });

          });

        });

        Object.entries(BASICBRAIN_BASE_ALIASES).forEach(([baseName, stateCode]) => {

          const key = normalizeKey(baseName);

          if(key) out[key] = stateCode;

        });

        return out;

      })();

      function getDestinationUrl(){

        return new URL(
          LIVE_BASE_DEMOGRAPHICS_PATH,
          window.location.origin
        );
      }

      function saveSelection(item){

        try{

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(item)
          );

          localStorage.setItem(
            JSON_URL_KEY,
            item.jsonUrl || ""
          );

          localStorage.setItem(
            "pcsunited.selectedBaseSlug.v1",
            item.id || ""
          );

        }catch(err){
          console.warn(err);
        }
      }

      function openBase(item){

        if (!item) return;

        saveSelection(item);

        const url = getDestinationUrl();

        url.searchParams.set("base", item.id);

        window.open(
          url.toString(),
          "_blank",
          "noopener,noreferrer"
        );
      }

      function clearBaseMarker(){

        if(markerLayer){
          markerLayer.selectAll("*").remove();
        }

      }

      function drawBaseMarker(base){

        clearBaseMarker();

        if(!base || !markerLayer || !projection) return;

        const lat =
          Number(base.lat);

        const lng =
          Number(base.lng);

        if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const point =
          projection([lng, lat]);

        if(!point) return;

        const x = point[0];
        const y = point[1];

        const label =
          base.base || "Selected Base";

        const city =
          base.city || "";

        let labelX =
          x + 18;

        let labelY =
          y - 18;

        if(x > 760){
          labelX = x - 190;
        }

        if(y < 70){
          labelY = y + 18;
        }

        const labelWidth =
          Math.max(126, Math.min(230, label.length * 7.2 + 26));

        const group =
          markerLayer
            .append("g")
            .attr("class","pcsu-base-marker")
            .attr("transform",`translate(${x},${y})`);

        group
          .append("circle")
          .attr("class","pcsu-base-marker-ring")
          .attr("r",5);

        group
          .append("circle")
          .attr("class","pcsu-base-marker-dot")
          .attr("r",6);

        group
          .append("path")
          .attr("class","pcsu-base-marker-pin")
          .attr("d","M0,-14 C7,-14 12,-9 12,-2 C12,7 0,17 0,17 C0,17 -12,7 -12,-2 C-12,-9 -7,-14 0,-14 Z")
          .attr("transform","translate(0,-12)");

        group
          .append("circle")
          .attr("fill","#071018")
          .attr("r",3.3)
          .attr("transform","translate(0,-14)");

        const labelGroup =
          markerLayer
            .append("g")
            .attr("class","pcsu-base-marker-label-group")
            .attr("transform",`translate(${labelX},${labelY})`);

        labelGroup
          .append("rect")
          .attr("class","pcsu-base-marker-label-bg")
          .attr("width",labelWidth)
          .attr("height",42)
          .attr("x",0)
          .attr("y",0);

        labelGroup
          .append("text")
          .attr("class","pcsu-base-marker-label")
          .attr("x",12)
          .attr("y",17)
          .text(label);

        labelGroup
          .append("text")
          .attr("class","pcsu-base-marker-sub")
          .attr("x",12)
          .attr("y",31)
          .text(city);

      }

      function scrollSelectedButtonIntoList(selectedButton){

        if(!selectedButton || !baseListEl) return;

        const listTop = baseListEl.scrollTop;
        const listHeight = baseListEl.clientHeight;
        const buttonTop = selectedButton.offsetTop;
        const buttonHeight = selectedButton.offsetHeight;

        const nextScroll =
          Math.max(0, buttonTop - Math.max(0, (listHeight - buttonHeight) / 2));

        if(Math.abs(nextScroll - listTop) > 2){
          baseListEl.scrollTop = nextScroll;
        }
      }

      function scrollMapSectionIntoView(){

        if(!mapRoot) return;

        logScrollDebug("intentional-map-scroll:before");

        mapRoot.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });

        setTimeout(function(){
          logScrollDebug("intentional-map-scroll:after");
        }, 400);
      }

      function renderState(stateCode, selectedBaseId, options){

        const opts =
          options && typeof options === "object"
            ? options
            : {};

        const allowScroll = opts.allowScroll === true;
        const allowSectionScroll = opts.allowSectionScroll === true;

        const beforeY = window.scrollY || window.pageYOffset || 0;
        logScrollDebug("renderState:before", {
          stateCode,
          selectedBaseId,
          allowScroll,
          allowSectionScroll
        });

        const safeState =
          String(stateCode || "").toUpperCase();

        const safeBaseId =
          String(selectedBaseId || "").trim();

        if(!safeState) return;

        if(!mapReady){

          pendingStateCode = safeState;
          pendingBaseId = safeBaseId;
          pendingAllowScroll = allowScroll;

          return;

        }

        const bases =
          STATE_BASES[safeState] || [];

        const stateName =
          STATE_NAMES[safeState] || safeState;

        currentStateCode = safeState;
        currentBaseId = safeBaseId;

        d3.selectAll(".pcsu-state")
          .classed("is-active", false);

        d3.select(`#state-${safeState}`)
          .classed("is-active", true);

        selectedStateEl.textContent =
          stateName;

        if (!bases.length){

          panelCopyEl.textContent =
            "PCSUnited does not have supported Base Demographics profiles for this state yet.";

          baseListEl.innerHTML = "";

          clearBaseMarker();

          logScrollDebug("renderState:after-empty", {
            deltaY:(window.scrollY || 0) - beforeY
          });

          return;
        }

        panelCopyEl.textContent =
          `${bases.length} supported base profile${bases.length > 1 ? "s" : ""} available.`;

        baseListEl.innerHTML =
          bases.map(base => `

            <button
              class="pcsu-base-btn${base.id === currentBaseId ? " is-selected" : ""}"
              type="button"
              data-base-id="${esc(base.id)}">

              <span class="pcsu-base-name">
                ${esc(base.base)}
              </span>

              <span class="pcsu-base-meta">
                ${esc(base.city)} • ${esc(base.fileName)} • Open Base Demographics
              </span>

            </button>

          `).join("");

        baseListEl
          .querySelectorAll(".pcsu-base-btn")
          .forEach(button => {

            button.addEventListener("click", () => {

              const selected =
                bases.find(base =>
                  base.id === button.dataset.baseId
                );

              if (selected) openBase(selected);

            });

          });

        const selectedBase =
          bases.find(base => base.id === currentBaseId);

        if(selectedBase){
          drawBaseMarker(selectedBase);
        }else{
          clearBaseMarker();
        }

        const selectedButton =
          baseListEl.querySelector(".pcsu-base-btn.is-selected");

        if(selectedButton && allowScroll){
          scrollSelectedButtonIntoList(selectedButton);
        }

        if(allowSectionScroll){
          scrollMapSectionIntoView();
        }

        const afterY = window.scrollY || window.pageYOffset || 0;
        logScrollDebug("renderState:after", {
          deltaY:afterY - beforeY,
          allowScroll,
          allowSectionScroll
        });
      }

      function findStateFromBaseName(baseName){

        const key = normalizeKey(baseName);

        if(!key) return "";

        if(BASE_TO_STATE[key]) return BASE_TO_STATE[key];

        const foundKey =
          Object.keys(BASE_TO_STATE).find(existingKey => {
            return (
              existingKey.includes(key) ||
              key.includes(existingKey)
            );
          });

        return foundKey ? BASE_TO_STATE[foundKey] : "";

      }

      function findBaseIdInState(stateCode, baseName){

        const safeState =
          String(stateCode || "").toUpperCase();

        const bases =
          STATE_BASES[safeState] || [];

        const key =
          normalizeKey(baseName);

        if(!safeState || !key || !bases.length) return "";

        const exact =
          bases.find(base => {
            return [
              base.base,
              base.name,
              base.label,
              base.fileName,
              base.id,
              base.slug
            ].some(value => normalizeKey(value) === key);
          });

        if(exact) return exact.id;

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
              const baseKey = normalizeKey(value);
              return baseKey.includes(key) || key.includes(baseKey);
            });
          });

        return fuzzy ? fuzzy.id : "";

      }

      function findSelectionFromDetail(detail){

        const d =
          detail && typeof detail === "object"
            ? detail
            : {};

        const selectedBase =
          d.selectedBase ||
          d.baseSelection ||
          d.base ||
          {};

        const profile =
          d.profile ||
          d.bridge ||
          d.basicbrain ||
          d.input ||
          d.state ||
          d;

        const directState =
          selectedBase.state ||
          selectedBase.stateCode ||
          profile.state ||
          profile.stateCode ||
          d.state ||
          "";

        const baseName =
          selectedBase.base ||
          selectedBase.name ||
          selectedBase.label ||
          d.base ||
          d.name ||
          d.label ||
          profile.selected_base ||
          profile.selectedBase ||
          profile.pcs_base ||
          profile.pcsBase ||
          profile.current_base ||
          profile.currentBase ||
          profile.base ||
          "";

        let stateCode = "";

        if(
          directState &&
          STATE_NAMES[String(directState).toUpperCase()]
        ){
          stateCode = String(directState).toUpperCase();
        }else{
          stateCode = findStateFromBaseName(baseName);
        }

        if(!stateCode){
          return {
            stateCode:"",
            baseId:""
          };
        }

        return {
          stateCode,
          baseId:findBaseIdInState(stateCode, baseName)
        };

      }

      function preselectFromDetail(detail, options){

        const selection =
          findSelectionFromDetail(detail);

        if(!selection.stateCode) return false;

        renderState(
          selection.stateCode,
          selection.baseId,
          options
        );

        return true;

      }

      function isIntentionalNavigation(detail){

        return !!(
          detail &&
          typeof detail === "object" &&
          detail.autoNavigate === true
        );
      }

      function handleIntentionalBaseSelection(detail){

        logScrollDebug("pcsu:base-selected:intentional", {
          source:detail?.source || "unknown"
        });

        preselectFromDetail(detail, {
          allowScroll:true,
          allowSectionScroll:true
        });
      }

      function bindNavigationEvents(){

        window.addEventListener("pcsu:base-selected", function(event){

          const detail = event.detail || {};

          if(!isIntentionalNavigation(detail)){
            logScrollDebug("ignored-pcsu:base-selected-passive", {
              autoNavigate:detail.autoNavigate,
              source:detail.source || "unknown"
            });
            return;
          }

          handleIntentionalBaseSelection(detail);

        });

      }

      window.PCSU_US_BASE_MAP.renderState = renderState;
      window.PCSU_US_BASE_MAP.selectState = renderState;
      window.PCSU_US_BASE_MAP.preselectFromBasicBrain = function(detail, options){
        return preselectFromDetail(detail, options);
      };
      window.PCSU_US_BASE_MAP.getCurrentState = function(){
        return currentStateCode;
      };
      window.PCSU_US_BASE_MAP.getCurrentBase = function(){
        return currentBaseId;
      };
      window.PCSU_US_BASE_MAP.logScrollDebug = logScrollDebug;

      bindNavigationEvents();

      d3.json(
        "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
      ).then(us => {

        const states =
          topojson
            .feature(us, us.objects.states)
            .features;

        projection =
          d3.geoAlbersUsa()
            .translate([480,300])
            .scale(1250);

        const path =
          d3.geoPath(projection);

        svg.append("g")
          .selectAll("path")
          .data(states)
          .join("path")
          .attr("class", d => {

            const abbr =
              FIPS_TO_ABBR[
                String(d.id).padStart(2,"0")
              ];

            return STATE_BASES[abbr]
              ? "pcsu-state has-bases"
              : "pcsu-state";
          })

          .attr("id", d => {

            const abbr =
              FIPS_TO_ABBR[
                String(d.id).padStart(2,"0")
              ];

            return `state-${abbr}`;
          })

          .attr("d", path)

          .on("click", (event, d) => {

            const abbr =
              FIPS_TO_ABBR[
                String(d.id).padStart(2,"0")
              ];

            renderState(abbr, "", { allowScroll:false });

          });

        svg.append("path")
          .datum(
            topojson.mesh(
              us,
              us.objects.states,
              (a,b) => a !== b
            )
          )

          .attr("fill","none")
          .attr("stroke","rgba(16,20,38,.75)")
          .attr("stroke-width",1)
          .attr("d", path);

        svg.append("g")
          .selectAll("text")
          .data(states)
          .join("text")

          .attr("class","pcsu-state-label")

          .attr("x", d => path.centroid(d)[0])

          .attr("y", d => path.centroid(d)[1])

          .text(d =>
            FIPS_TO_ABBR[
              String(d.id).padStart(2,"0")
            ] || ""
          )

          .style("display", d => {

            const abbr =
              FIPS_TO_ABBR[
                String(d.id).padStart(2,"0")
              ];

            return [
              "RI","DE","CT","NJ","MD","MA","DC"
            ].includes(abbr)
              ? "none"
              : "block";
          });

        markerLayer =
          svg.append("g")
            .attr("id","pcsu-base-marker-layer");

        mapReady = true;

        if(pendingStateCode){

          renderState(
            pendingStateCode,
            pendingBaseId,
            { allowScroll:pendingAllowScroll }
          );

        }else{

          renderState(DEFAULT_STATE, "", { allowScroll:false });

        }

      }).catch(() => {

        selectedStateEl.textContent =
          "Map unavailable";

        panelCopyEl.textContent =
          "The map data could not load. Please refresh the page.";

        baseListEl.innerHTML = "";

      });

    })();

  </script>

</div>
