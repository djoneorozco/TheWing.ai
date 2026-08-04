/* ============================================================
   THEWING.AI • WAPS CALCULATOR
   WAPS.JS
   Version 1.0.0

   FILE PAIRING
   - index.html v1.0.0
   - waps.css v1.0.0

   PURPOSE
   - Estimate Regular Air Force WAPS points for SSgt and TSgt
   - Support SKT + PFE and authorized PFE-only paths
   - Apply up to three eligible EPB recommendations
   - Apply eligible decoration points
   - Validate minimum promotion-test scores
   - Compare calculated score with an optional verified cutoff

   GOVERNING BASELINE
   - AFI 36-2502, 2 July 2026
   - DAFMAN 36-2664, Change 1, 15 July 2025

   IMPORTANT
   - Test percentages are truncated to two decimal places
   - Scores are never presented as promotion probability
   - Official selection remains dependent on AFPC data,
     promotion AFSC, quotas and cycle-specific cutoffs
============================================================ */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const BOOT_KEY = "__THEWING_WAPS_V100_BOOTED__";

  if (window[BOOT_KEY]) return;
  window[BOOT_KEY] = true;

  /* ==========================================================
     1. CONFIGURATION
  ========================================================== */

  const CONFIG = Object.freeze({
    VERSION,

    MAXIMUMS: Object.freeze({
      PFE: 100,
      SKT: 100,
      TESTING: 200,
      DECORATIONS: 25,
      EPB_PRS: 285,
      TOTAL: 510
    }),

    MINIMUMS: Object.freeze({
      BOTH_PFE: 40,
      BOTH_SKT: 40,
      BOTH_COMBINED: 90,
      PFE_ONLY: 45
    }),

    PATHS: Object.freeze({
      PENDING: "PENDING",
      BOTH: "SKT_PFE",
      PFE_ONLY: "PFE_ONLY"
    }),

    PATH_SOURCES: Object.freeze({
      PENDING: "PENDING_CAFSC",
      DEFAULT: "DEFAULT_SKT_PFE",
      CAFSC_PFE_ONLY: "CAFSC_PFE_ONLY",
      CURRENT_CAFSC: "NOTE_11_CURRENT_CAFSC",
      INDIVIDUAL_EXEMPTION: "INDIVIDUAL_SKT_EXEMPTION",
      MEMBER_ELECTION: "EXEMPT_MEMBER_ELECTED_SKT"
    }),

    EPB_POSITION_KEYS: Object.freeze([
      "current",
      "previous1",
      "previous2"
    ]),

    EPB_TABLE: Object.freeze({
      "promote-now": Object.freeze({
        current: 250,
        previous1: 20,
        previous2: 15
      }),

      "must-promote": Object.freeze({
        current: 220,
        previous1: 15,
        previous2: 10
      }),

      "promote": Object.freeze({
        current: 200,
        previous1: 10,
        previous2: 5
      }),

      "not-ready-now": Object.freeze({
        current: 0,
        previous1: 0,
        previous2: 0
      })
    }),

    EPB_LABELS: Object.freeze({
      "promote-now": "Promote Now",
      "must-promote": "Must Promote",
      "promote": "Promote",
      "not-ready-now": "Not Ready Now",
      "none": "No Eligible EPB",
      "bypass": "Nonrated or Removed"
    }),

    DEFAULTS: Object.freeze({
      PROMO_GRADE: "ssgt",
      PROMOTION_CYCLE: "26e5",
      CAFSC: "",

      SKT_EXEMPTION: "no",
      SKT_ELECTION: "pfe-only",

      PFE: 74,
      SKT: 68,
      DECORATIONS: 12,

      EPB_CURRENT: "must-promote",
      EPB_PREVIOUS_1: "promote",
      EPB_PREVIOUS_2: "promote",

      DECORATION_CONFIRMED: false,
      HISTORICAL_CUTOFF: "",
      CUTOFF_SOURCE: ""
    })
  });


  /* ==========================================================
     2. 2026 AFSC / RI / SDI EXCEPTION DATABASE

     IMPORTANT
     This is an exception table, not a complete AFSC catalog.

     RULE MODEL
     - Listed in PFE_ONLY:
       PFE-only path applies for that grade/cycle table.

     - Listed as NOTE_11_CURRENT_CAFSC:
       Member uses SKT + PFE in the current CAFSC.

     - Not listed:
       Calculator defaults provisionally to SKT + PFE.

     The database should be revalidated against the applicable
     cycle EPRRC before each annual promotion cycle.
  ========================================================== */

  const INTERNAL_AFSC_DB = {
    META: {
      version: "2026.1",
      basis: "User-supplied 2026 E5 and E6 official reference-page extraction",
      supportedCycles: {
        E5: "26E5",
        E6: "26E6"
      },
      defaultPath: "SKT + PFE",
      catalogType: "EXCEPTIONS_ONLY"
    },

    E5: {
      PFE_ONLY: {
        "1A154": "Multi-domain Operations Aviator Journeyman",
        "1A851": "Airborne Cryptologic Language Analyst Journeyman",
        "1A852": "Airborne Intelligence, Surveillance, and Reconnaissance Operator Journeyman",
        "1B451": "Cyber Warfare Operations Journeyman",
        "1C351": "All Domain Command and Control Operations Journeyman",
        "1C651": "Space Systems Operations Journeyman",
        "1D751": "Cyber Defense Operations Journeyman",
        "1D752": "Spectrum Defense Operations Journeyman",
        "1D753": "Cable and Antenna Defense Operations Journeyman",
        "1D754": "Data Engineering",
        "1D755": "Cybersecurity",
        "1N051": "All Source Intelligence Analyst Journeyman",
        "1N151": "Geospatial Intelligence Journeyman",
        "1N251": "Signals Intelligence Analyst Journeyman",
        "1N351": "Cryptologic Language Analyst Journeyman",
        "1N451": "Cyber Intelligence Analyst Journeyman",
        "1N452": "Cryptologic Language Analyst and Reporter Journeyman",
        "1N751": "Human Intelligence Specialist Journeyman",
        "1N851": "Targeting Analyst Journeyman",
        "1S051": "Safety Journeyman",
        "1U151": "Remotely Piloted Aircraft Pilot Journeyman",
        "2A551": "Airlift/Special Mission Aircraft Maintenance Journeyman",
        "2A753": "Aircraft Structural Maintenance Journeyman",
        "2M051": "Missile and Space Systems Electronic Maintenance Journeyman",
        "2T151": "Ground Transportation Journeyman",
        "2T351": "Mission Generation Vehicular Equipment Maintenance Journeyman",
        "2T357": "Fleet Management and Analysis Journeyman",
        "3F051": "Human Resources and Administration Journeyman",
        "3F151": "Services Journeyman",
        "3F351": "Manpower Journeyman",
        "3F451": "Equal Opportunity Journeyman",
        "3G051": "Talent Acquisition Journeyman",
        "3H051": "Historian Journeyman",
        "3N1/3N2/3N3": "Regional/Premier Band Journeyman",
        "4A051": "Health Services Management Journeyman",
        "4A151": "Medical Materiel Journeyman",
        "4C051": "Mental Health Service Journeyman",
        "4J052": "Physical Medicine Journeyman",
        "4J052A": "Physical Medicine Orthotic Journeyman",
        "4R051": "Diagnostic Imaging Journeyman",
        "4T051": "Medical Laboratory Journeyman",
        "7S051": "Special Investigations Journeyman"
      },

      NOTE_11_CURRENT_CAFSC: {}
    },

    E6: {
      PFE_ONLY: {
        "1A174": "Multi-domain Operations Aviator Craftsman",
        "1A871": "Airborne Cryptologic Language Analyst Craftsman",
        "1A872": "Airborne Intelligence, Surveillance, and Reconnaissance Operator Craftsman",
        "1B471": "Cyber Warfare Operations Craftsman",
        "1C371": "All Domain Command and Control Operations Craftsman",
        "1C671": "Space Systems Operations Craftsman",
        "1D771": "Cyber Defense Operations Craftsman",
        "1D772": "Spectrum Defense Craftsman",
        "1D773": "Cable and Antenna Defense Operations Craftsman",
        "1D774": "Data Engineering",
        "1D775": "Cybersecurity",
        "1N071": "All Source Intelligence Analyst Craftsman",
        "1N171": "Geospatial Intelligence Craftsman",
        "1N271": "Signals Intelligence Craftsman",
        "1N371": "Cryptologic Language Analyst Craftsman",
        "1N471": "Cyber Intelligence Analyst Craftsman",
        "1N472": "Cryptologic Analyst and Reporter Craftsman",
        "1N771": "Human Intelligence Specialist Craftsman",
        "1N871": "Targeting Analyst Craftsman",
        "1U171": "Remotely Piloted Aircraft Pilot Craftsman",
        "2A571": "Airlift/Special Mission Aircraft Maintenance Craftsman",
        "2A773": "Aircraft Structural Maintenance Craftsman",
        "2M071": "Missile and Space Systems Electronic Maintenance Craftsman",
        "2T171": "Ground Transportation Craftsman",
        "2T371": "Mission Generation Vehicular Equipment Maintenance Craftsman",
        "2T377": "Fleet Management and Analysis Craftsman",
        "3F071": "Human Resources and Administration",
        "3F171": "Services Craftsman",
        "3F371": "Manpower Craftsman",
        "3G071": "Talent Acquisition Craftsman",
        "3H071": "Historian Craftsman",
        "3N1/3N2/3N3": "Regional/Premier Band Craftsman",
        "4A071": "Health Services Management Craftsman",
        "4A171": "Medical Materiel Craftsman",
        "4C071": "Mental Health Service Craftsman",
        "4J072": "Physical Medicine Craftsman",
        "4J072A": "Physical Medicine Orthotic Craftsman",
        "4R071": "Diagnostic Imaging Craftsman",
        "4R071A": "Diagnostic Imaging Nuclear Medicine Craftsman",
        "4R071B": "Diagnostic Medical Sonography Craftsman",
        "4R071C": "Magnetic Resonance Imaging Craftsman",
        "4R071D": "Mammography Craftsman",
        "4R071E": "Intervention Radiography Craftsman",
        "4R071F": "Computed Tomography Craftsman",
        "4T071": "Medical Laboratory Craftsman",
        "9S100": "Scientific Applications Specialist Craftsman"
      },

      NOTE_11_CURRENT_CAFSC: {},

      RI_SDI: {
        "8A200": {
          title: "Enlisted Aide",
          rule: "PFE_ONLY"
        },

        "8A300": {
          title: "Protocol",
          rule: "PFE_ONLY"
        },

        "8B000": {
          title: "Military Training Instructor",
          rule: "PFE_ONLY"
        },

        "8B200": {
          title: "Academy Military Training Instructor",
          rule: "PFE_ONLY"
        },

        "8B300": {
          title: "AFROTC Training Instructor",
          rule: "PFE_ONLY"
        },

        "8B100": {
          title: "Military Training Leader",
          rule: "PFE_ONLY"
        },

        "8C000": {
          title: "Airman Family Readiness NCO",
          rule: "PFE_ONLY"
        },

        "8D100": {
          title: "Language and Cultural Advisor",
          rule: "PFE_ONLY"
        },

        "8G000": {
          title: "Honor Guard",
          rule: "PFE_ONLY"
        },

        "8G100": {
          title: "Base Honor Guard Program Manager",
          rule: "PFE_ONLY"
        },

        "8H000": {
          title: "Airmen Dorm Leader",
          rule: "PFE_ONLY"
        },

        "8K000": {
          title: "Software Development Specialist",
          rule: "NOTE_11_CURRENT_CAFSC"
        },

        "8L100": {
          title: "Air Advisor",
          rule: "PFE_ONLY"
        },

        "8L200": {
          title: "Air Advisor Basic, Team Sergeant",
          rule: "PFE_ONLY"
        },

        "8L300": {
          title: "Air Advisor Basic, Team Leader",
          rule: "PFE_ONLY"
        },

        "8P000": {
          title: "Courier",
          rule: "PFE_ONLY"
        },

        "8P100": {
          title: "Defense Attaché",
          rule: "PFE_ONLY"
        },

        "8R000": {
          title: "Enlisted Accessions Recruiter",
          rule: "PFE_ONLY"
        },

        "8R200": {
          title: "Second-Tier Recruiter",
          rule: "PFE_ONLY"
        },

        "8S000": {
          title: "Missile Facility Manager",
          rule: "PFE_ONLY"
        },

        "8S200": {
          title: "Combat Crew Communications",
          rule: "NOTE_11_CURRENT_CAFSC"
        },

        "8T000": {
          title: "Professional Military Education Instructor",
          rule: "PFE_ONLY"
        },

        "8T100": {
          title: "Enlisted PME Instructional System Designer",
          rule: "PFE_ONLY"
        },

        "8U000": {
          title: "Unit Deployment Manager",
          rule: "PFE_ONLY"
        },

        "8Y000": {
          title: "Pathfinder",
          rule: "PFE_ONLY"
        },

        "9A000": {
          title: "Enlisted Airman",
          rule: "PFE_ONLY"
        },

        "9A300": {
          title: "Enlisted Airman",
          rule: "PFE_ONLY"
        },

        "9A500": {
          title: "Enlisted Airman",
          rule: "PFE_ONLY"
        },

        "9E100": {
          title: "Command Chief Executive Assistant",
          rule: "NOTE_11_CURRENT_CAFSC"
        },

        "9F000": {
          title: "First Term Airmen Center NCOIC",
          rule: "PFE_ONLY"
        },

        "9I000": {
          title: "Futures Airmen",
          rule: "NOTE_11_CURRENT_CAFSC"
        },

        "9L000": {
          title: "Interpreter/Translator",
          rule: "PFE_ONLY"
        },

        "9M200": {
          title: "International Health Specialists",
          rule: "PFE_ONLY"
        },

        "9P000": {
          title: "Patient",
          rule: "NOTE_11_CURRENT_CAFSC"
        },

        "9U000": {
          title: "Enlisted Airman Ineligible for Local Utilization",
          rule: "PFE_ONLY"
        }
      }
    }
  };

  const AFSC_DB =
    window.AF_PROMO_AFSC_DB &&
    typeof window.AF_PROMO_AFSC_DB === "object"
      ? window.AF_PROMO_AFSC_DB
      : INTERNAL_AFSC_DB;

  if (!window.AF_PROMO_AFSC_DB) {
    window.AF_PROMO_AFSC_DB = AFSC_DB;
  }


  /* ==========================================================
     3. INITIALIZATION
  ========================================================== */

  function initialize() {
    const root = document.getElementById("thewing-waps");

    if (!root) {
      console.warn("[THEWING_WAPS] Root #thewing-waps was not found.");
      return;
    }

    const byId = (id) => document.getElementById(id);

    const el = {
      root,

      promoGrade: byId("promoGrade"),
      promotionCycle: byId("promotionCycle"),

      cafscInput: byId("cafscInput"),
      cafscCatalog: byId("cafscCatalog"),
      cafscClearButton: byId("cafscClearButton"),
      cafscHelp: byId("cafscHelp"),
      cafscStatus: byId("cafscStatus"),

      testingPathDisplay: byId("testingPathDisplay"),
      testingPathText: byId("testingPathText"),
      testingPathHelp: byId("testingPathHelp"),

      inputCompletionBadge: byId("inputCompletionBadge"),
      testingMinimumBadge: byId("testingMinimumBadge"),

      sktExemptionBlock: byId("sktExemptionBlock"),
      sktExemptionNo: byId("sktExemptionNo"),
      sktExemptionYes: byId("sktExemptionYes"),
      sktExemptionHelp: byId("sktExemptionHelp"),

      sktElectionBlock: byId("sktElectionBlock"),
      sktElection: byId("sktElection"),

      pfeRange: byId("pfeRange"),
      pfeScore: byId("pfeScore"),
      pfeScoreHelp: byId("pfeScoreHelp"),

      sktScoreGroup: byId("sktScoreGroup"),
      sktRange: byId("sktRange"),
      sktScore: byId("sktScore"),
      sktScoreDescription: byId("sktScoreDescription"),
      sktScoreHelp: byId("sktScoreHelp"),

      testingValidationCard: byId("testingValidationCard"),
      testingValidationTitle: byId("testingValidationTitle"),
      testingValidationText: byId("testingValidationText"),

      epbCurrent: byId("epbCurrent"),
      epbPrevious1: byId("epbPrevious1"),
      epbPrevious2: byId("epbPrevious2"),

      epbCurrentPoints: byId("epbCurrentPoints"),
      epbPrevious1Points: byId("epbPrevious1Points"),
      epbPrevious2Points: byId("epbPrevious2Points"),
      epbPoints: byId("epbPoints"),

      decorationRange: byId("decorationRange"),
      decorationPoints: byId("decorationPoints"),
      decorationPointsDisplay: byId("decorationPointsDisplay"),
      decorationPointsHelp: byId("decorationPointsHelp"),
      decorationEligibilityConfirmed: byId("decorationEligibilityConfirmed"),

      historicalCutoff: byId("historicalCutoff"),
      cutoffSource: byId("cutoffSource"),
      cutoffComparisonResult: byId("cutoffComparisonResult"),

      resetCalculatorButton: byId("resetCalculatorButton"),

      wapsScoreRing: byId("wapsScoreRing"),
      wapsTotalScore: byId("wapsTotalScore"),
      scoreUtilization: byId("scoreUtilization"),

      overallScoreStatus: byId("overallScoreStatus"),
      overallScoreStatusText: byId("overallScoreStatusText"),

      pfeBreakdownValue: byId("pfeBreakdownValue"),
      pfeBreakdownMaximum: byId("pfeBreakdownMaximum"),
      pfeProgressBar: byId("pfeProgressBar"),

      sktBreakdownItem: byId("sktBreakdownItem"),
      sktBreakdownSubtitle: byId("sktBreakdownSubtitle"),
      sktBreakdownValue: byId("sktBreakdownValue"),
      sktBreakdownMaximum: byId("sktBreakdownMaximum"),
      sktProgressBar: byId("sktProgressBar"),

      decorationsBreakdownValue: byId("decorationsBreakdownValue"),
      decorationsProgressBar: byId("decorationsProgressBar"),

      epbBreakdownValue: byId("epbBreakdownValue"),
      epbProgressBar: byId("epbProgressBar"),

      testPassBadge: byId("testPassBadge"),

      pfeMinimumRow: byId("pfeMinimumRow"),
      pfeMinimumResult: byId("pfeMinimumResult"),

      sktMinimumRow: byId("sktMinimumRow"),
      sktMinimumResult: byId("sktMinimumResult"),

      combinedMinimumRow: byId("combinedMinimumRow"),
      combinedMinimumLabel: byId("combinedMinimumLabel"),
      combinedMinimumResult: byId("combinedMinimumResult"),

      wapsInsightList: byId("wapsInsightList"),

      copyResultsButton: byId("copyResultsButton"),
      copyResultsButtonText: byId("copyResultsButtonText"),
      printResultsButton: byId("printResultsButton"),

      wapsLiveRegion: byId("wapsLiveRegion")
    };

    const requiredKeys = [
      "promoGrade",
      "promotionCycle",
      "cafscInput",
      "cafscCatalog",
      "cafscClearButton",
      "cafscStatus",
      "testingPathDisplay",
      "testingPathText",
      "testingPathHelp",
      "inputCompletionBadge",
      "testingMinimumBadge",
      "sktExemptionBlock",
      "sktExemptionNo",
      "sktExemptionYes",
      "sktExemptionHelp",
      "sktElectionBlock",
      "sktElection",
      "pfeRange",
      "pfeScore",
      "pfeScoreHelp",
      "sktScoreGroup",
      "sktRange",
      "sktScore",
      "sktScoreDescription",
      "sktScoreHelp",
      "testingValidationCard",
      "testingValidationTitle",
      "testingValidationText",
      "epbCurrent",
      "epbPrevious1",
      "epbPrevious2",
      "epbCurrentPoints",
      "epbPrevious1Points",
      "epbPrevious2Points",
      "epbPoints",
      "decorationRange",
      "decorationPoints",
      "decorationPointsDisplay",
      "decorationPointsHelp",
      "decorationEligibilityConfirmed",
      "historicalCutoff",
      "cutoffSource",
      "cutoffComparisonResult",
      "resetCalculatorButton",
      "wapsScoreRing",
      "wapsTotalScore",
      "scoreUtilization",
      "overallScoreStatus",
      "overallScoreStatusText",
      "pfeBreakdownValue",
      "pfeBreakdownMaximum",
      "pfeProgressBar",
      "sktBreakdownItem",
      "sktBreakdownSubtitle",
      "sktBreakdownValue",
      "sktBreakdownMaximum",
      "sktProgressBar",
      "decorationsBreakdownValue",
      "decorationsProgressBar",
      "epbBreakdownValue",
      "epbProgressBar",
      "testPassBadge",
      "pfeMinimumRow",
      "pfeMinimumResult",
      "sktMinimumRow",
      "sktMinimumResult",
      "combinedMinimumRow",
      "combinedMinimumLabel",
      "combinedMinimumResult",
      "wapsInsightList",
      "copyResultsButton",
      "copyResultsButtonText",
      "printResultsButton",
      "wapsLiveRegion"
    ];

    const missing = requiredKeys.filter((key) => !el[key]);

    if (missing.length) {
      console.warn(
        "[THEWING_WAPS] Missing required elements:",
        missing.join(", ")
      );
      return;
    }


    /* ========================================================
       4. LOCAL STATE
    ======================================================== */

    const state = {
      rule: null,
      path: null,
      snapshot: null,
      gradeCycleSyncing: false,
      copyResetTimer: null
    };


    /* ========================================================
       5. BASIC HELPERS
    ======================================================== */

    function clamp(value, minimum, maximum) {
      const number = Number(value);

      if (!Number.isFinite(number)) return minimum;

      return Math.min(
        maximum,
        Math.max(minimum, number)
      );
    }

    function truncate2(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) return 0;

      if (number >= 0) {
        return Math.floor(number * 100) / 100;
      }

      return Math.ceil(number * 100) / 100;
    }

    function format2(value) {
      return truncate2(value).toFixed(2);
    }

    function formatSigned2(value) {
      const number = truncate2(value);

      if (number > 0) return `+${number.toFixed(2)}`;
      return number.toFixed(2);
    }

    function integerValue(value, minimum, maximum) {
      return Math.trunc(
        clamp(value, minimum, maximum)
      );
    }

    function percentage(value, maximum) {
      if (!maximum) return 0;

      return truncate2(
        clamp(
          (Number(value) / Number(maximum)) * 100,
          0,
          100
        )
      );
    }

    function deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function normalizeCAFSC(rawValue) {
      return String(rawValue || "")
        .toUpperCase()
        .replace(/[^A-Z0-9/]/g, "")
        .slice(0, 15);
    }

    function selectedRadioValue(name) {
      const selected = document.querySelector(
        `input[name="${name}"]:checked`
      );

      return selected ? selected.value : "";
    }

    function getGradeBucket() {
      return el.promoGrade.value === "tsgt"
        ? "E6"
        : "E5";
    }

    function getPromotionGradeLabel() {
      return el.promoGrade.value === "tsgt"
        ? "Technical Sergeant"
        : "Staff Sergeant";
    }

    function getCycleLabel() {
      const option =
        el.promotionCycle.options[
          el.promotionCycle.selectedIndex
        ];

      return option
        ? option.textContent.trim()
        : "";
    }

    function isCycleSupported(gradeBucket, cycleValue) {
      if (gradeBucket === "E5") {
        return cycleValue === "26e5";
      }

      if (gradeBucket === "E6") {
        return cycleValue === "26e6";
      }

      return false;
    }

    function setDataStatus(element, status) {
      if (!element) return;
      element.dataset.status = status;
    }

    function setRangeFill(rangeElement) {
      if (!rangeElement) return;

      const minimum = Number(rangeElement.min || 0);
      const maximum = Number(rangeElement.max || 100);
      const value = clamp(
        rangeElement.value,
        minimum,
        maximum
      );

      const fill =
        maximum === minimum
          ? 0
          : ((value - minimum) / (maximum - minimum)) * 100;

      rangeElement.style.setProperty(
        "--range-fill",
        `${fill}%`
      );
    }

    function setProgress(element, value, maximum) {
      if (!element) return;

      element.style.width =
        `${percentage(value, maximum)}%`;
    }

    function setRequirement(row, result, passed, text) {
      row.dataset.status = passed
        ? "pass"
        : "fail";

      result.textContent = text;
    }

    function setRadioGroupDisabled(disabled) {
      el.sktExemptionNo.disabled = disabled;
      el.sktExemptionYes.disabled = disabled;

      el.sktExemptionBlock.setAttribute(
        "aria-disabled",
        String(disabled)
      );

      el.sktExemptionBlock.classList.toggle(
        "is-dimmed",
        disabled
      );
    }

    function announce(message) {
      el.wapsLiveRegion.textContent = "";

      window.setTimeout(() => {
        el.wapsLiveRegion.textContent = message;
      }, 20);
    }


    /* ========================================================
       6. AFSC DATABASE HELPERS
    ======================================================== */

    function findDatabaseMatch(collection, cafsc) {
      if (
        !collection ||
        typeof collection !== "object" ||
        !cafsc
      ) {
        return null;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          collection,
          cafsc
        )
      ) {
        return {
          key: cafsc,
          value: collection[cafsc]
        };
      }

      for (const [key, value] of Object.entries(collection)) {
        if (!key.includes("/")) continue;

        const prefixes = key
          .split("/")
          .map((item) => item.trim())
          .filter(Boolean);

        const matchesComposite = prefixes.some(
          (prefix) => cafsc.startsWith(prefix)
        );

        if (matchesComposite) {
          return {
            key,
            value
          };
        }
      }

      return null;
    }

    function resolveAFSCRule({
      gradeBucket = getGradeBucket(),
      cafsc = normalizeCAFSC(el.cafscInput.value)
    } = {}) {
      const bucket = AFSC_DB[gradeBucket];

      if (!cafsc) {
        return {
          found: false,
          gradeBucket,
          cafsc: "",
          matchedCode: "",
          title: "",
          rule: "PENDING",
          source: "NO_CAFSC"
        };
      }

      if (!bucket) {
        return {
          found: false,
          gradeBucket,
          cafsc,
          matchedCode: "",
          title: cafsc,
          rule: "DEFAULT_BOTH",
          source: "NO_GRADE_BUCKET"
        };
      }

      const pfeMatch = findDatabaseMatch(
        bucket.PFE_ONLY,
        cafsc
      );

      if (pfeMatch) {
        return {
          found: true,
          gradeBucket,
          cafsc,
          matchedCode: pfeMatch.key,
          title:
            typeof pfeMatch.value === "string"
              ? pfeMatch.value
              : pfeMatch.value?.title || cafsc,
          rule: "PFE_ONLY",
          source: `${gradeBucket}.PFE_ONLY`
        };
      }

      const note11Match = findDatabaseMatch(
        bucket.NOTE_11_CURRENT_CAFSC,
        cafsc
      );

      if (note11Match) {
        return {
          found: true,
          gradeBucket,
          cafsc,
          matchedCode: note11Match.key,
          title:
            typeof note11Match.value === "string"
              ? note11Match.value
              : note11Match.value?.title || cafsc,
          rule: "NOTE_11_CURRENT_CAFSC",
          source: `${gradeBucket}.NOTE_11_CURRENT_CAFSC`
        };
      }

      const riSdiMatch = findDatabaseMatch(
        bucket.RI_SDI,
        cafsc
      );

      if (riSdiMatch) {
        const item =
          typeof riSdiMatch.value === "string"
            ? {
                title: riSdiMatch.value,
                rule: "PFE_ONLY"
              }
            : riSdiMatch.value;

        return {
          found: true,
          gradeBucket,
          cafsc,
          matchedCode: riSdiMatch.key,
          title: item?.title || cafsc,
          rule:
            item?.rule === "NOTE_11_CURRENT_CAFSC"
              ? "NOTE_11_CURRENT_CAFSC"
              : "PFE_ONLY",
          source: `${gradeBucket}.RI_SDI`
        };
      }

      return {
        found: false,
        gradeBucket,
        cafsc,
        matchedCode: "",
        title: cafsc,
        rule: "DEFAULT_BOTH",
        source: "DEFAULT"
      };
    }

    function populateCAFSCDataList() {
      const gradeBucket = getGradeBucket();
      const bucket = AFSC_DB[gradeBucket];

      el.cafscCatalog.replaceChildren();

      if (!bucket) return;

      const entries = new Map();

      function addCollection(collection) {
        if (!collection) return;

        Object.entries(collection).forEach(
          ([code, value]) => {
            const title =
              typeof value === "string"
                ? value
                : value?.title || code;

            entries.set(code, title);
          }
        );
      }

      addCollection(bucket.PFE_ONLY);
      addCollection(bucket.NOTE_11_CURRENT_CAFSC);
      addCollection(bucket.RI_SDI);

      const sorted = Array
        .from(entries.entries())
        .sort(([codeA], [codeB]) => {
          return codeA.localeCompare(
            codeB,
            undefined,
            {
              numeric: true,
              sensitivity: "base"
            }
          );
        });

      const fragment = document.createDocumentFragment();

      sorted.forEach(([code, title]) => {
        const option = document.createElement("option");

        option.value = code;
        option.label = `${code} — ${title}`;

        fragment.appendChild(option);
      });

      el.cafscCatalog.appendChild(fragment);
    }


    /* ========================================================
       7. PATH RESOLUTION
    ======================================================== */

    function normalizeExemptionControls(rule) {
      const databaseControlsPath =
        rule.rule === "PFE_ONLY" ||
        rule.rule === "NOTE_11_CURRENT_CAFSC";

      if (databaseControlsPath) {
        el.sktExemptionNo.checked = true;
        el.sktExemptionYes.checked = false;

        setRadioGroupDisabled(true);
        el.sktElectionBlock.hidden = true;

        if (rule.rule === "PFE_ONLY") {
          el.sktExemptionHelp.textContent =
            "This CAFSC is listed as PFE only in the loaded cycle exception table.";
        } else {
          el.sktExemptionHelp.textContent =
            "The loaded current-CAFSC rule requires SKT + PFE for this entry.";
        }

        return;
      }

      setRadioGroupDisabled(false);

      el.sktExemptionHelp.textContent =
        "Select yes only when an official member-specific SKT exemption applies for this cycle.";

      const exemptionSelected =
        selectedRadioValue("sktExemption") === "yes";

      el.sktElectionBlock.hidden = !exemptionSelected;
    }

    function resolveTestingPath(rule) {
      const cafscPending = !rule.cafsc;

      if (rule.rule === "PFE_ONLY") {
        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          source: CONFIG.PATH_SOURCES.CAFSC_PFE_ONLY,
          pendingCAFSC: false,
          label: "PFE Only — CAFSC Rule",
          description:
            "The loaded cycle exception table identifies this CAFSC as PFE only."
        };
      }

      if (rule.rule === "NOTE_11_CURRENT_CAFSC") {
        return {
          mode: CONFIG.PATHS.BOTH,
          source: CONFIG.PATH_SOURCES.CURRENT_CAFSC,
          pendingCAFSC: false,
          label: "SKT + PFE — Current CAFSC",
          description:
            "The loaded rule directs testing in the member’s current CAFSC."
        };
      }

      const hasIndividualExemption =
        selectedRadioValue("sktExemption") === "yes";

      if (hasIndividualExemption) {
        const electedToTakeSKT =
          el.sktElection.value === "take-skt";

        if (electedToTakeSKT) {
          return {
            mode: CONFIG.PATHS.BOTH,
            source: CONFIG.PATH_SOURCES.MEMBER_ELECTION,
            pendingCAFSC: cafscPending,
            label: cafscPending
              ? "SKT + PFE — CAFSC Pending"
              : "SKT + PFE — Member Election",
            description:
              "The member is treated as exempt but has elected to take the SKT."
          };
        }

        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          source: CONFIG.PATH_SOURCES.INDIVIDUAL_EXEMPTION,
          pendingCAFSC: cafscPending,
          label: cafscPending
            ? "PFE Only — CAFSC Pending"
            : "PFE Only — Official Exemption",
          description:
            "The member-specific SKT exemption is being applied to this estimate."
        };
      }

      if (cafscPending) {
        return {
          mode: CONFIG.PATHS.BOTH,
          source: CONFIG.PATH_SOURCES.PENDING,
          pendingCAFSC: true,
          label: "Awaiting CAFSC",
          description:
            "SKT + PFE is used provisionally until a CAFSC is entered."
        };
      }

      return {
        mode: CONFIG.PATHS.BOTH,
        source: CONFIG.PATH_SOURCES.DEFAULT,
        pendingCAFSC: false,
        label: "SKT + PFE",
        description:
          "No PFE-only or current-CAFSC exception matched the loaded table."
      };
    }


    /* ========================================================
       8. INPUT READING
    ======================================================== */

    function readScore(input, maximum) {
      if (input.value === "") return 0;

      return truncate2(
        clamp(input.value, 0, maximum)
      );
    }

    function readDecorationPoints() {
      if (el.decorationPoints.value === "") return 0;

      return integerValue(
        el.decorationPoints.value,
        0,
        CONFIG.MAXIMUMS.DECORATIONS
      );
    }

    function readHistoricalCutoff() {
      const raw = el.historicalCutoff.value.trim();

      if (!raw) return null;

      const number = Number(raw);

      if (!Number.isFinite(number)) return null;

      return truncate2(
        clamp(
          number,
          0,
          CONFIG.MAXIMUMS.TOTAL
        )
      );
    }


    /* ========================================================
       9. EPB CALCULATION

       "none" and "bypass" do not consume an eligible weighted
       position. Remaining eligible EPBs shift forward.
    ======================================================== */

    function calculateEPB() {
      const selections = [
        el.epbCurrent.value,
        el.epbPrevious1.value,
        el.epbPrevious2.value
      ];

      let eligiblePosition = 0;

      const scoredEntries = selections.map(
        (rating, originalIndex) => {
          const omitted =
            rating === "none" ||
            rating === "bypass";

          if (omitted) {
            return {
              originalIndex,
              rating,
              label:
                CONFIG.EPB_LABELS[rating] ||
                rating,
              eligible: false,
              weightedPosition: null,
              points: 0
            };
          }

          const weightedPosition =
            CONFIG.EPB_POSITION_KEYS[
              eligiblePosition
            ];

          eligiblePosition += 1;

          const table =
            CONFIG.EPB_TABLE[rating] ||
            CONFIG.EPB_TABLE["promote"];

          const points =
            table[weightedPosition] || 0;

          return {
            originalIndex,
            rating,
            label:
              CONFIG.EPB_LABELS[rating] ||
              rating,
            eligible: true,
            weightedPosition,
            points
          };
        }
      );

      const total = Math.min(
        CONFIG.MAXIMUMS.EPB_PRS,
        scoredEntries.reduce(
          (sum, entry) => sum + entry.points,
          0
        )
      );

      return {
        selections,
        entries: scoredEntries,
        eligibleCount: scoredEntries.filter(
          (entry) => entry.eligible
        ).length,
        total
      };
    }


    /* ========================================================
       10. TEST MINIMUM CALCULATION
    ======================================================== */

    function calculateMinimums({
      path,
      pfe,
      skt
    }) {
      if (path.mode === CONFIG.PATHS.PFE_ONLY) {
        const pfePass =
          pfe >= CONFIG.MINIMUMS.PFE_ONLY;

        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          pfePass,
          sktPass: true,
          combinedPass: pfePass,
          allPassed: pfePass,
          combinedRaw: truncate2(pfe * 2)
        };
      }

      const combinedRaw = truncate2(pfe + skt);

      const pfePass =
        pfe >= CONFIG.MINIMUMS.BOTH_PFE;

      const sktPass =
        skt >= CONFIG.MINIMUMS.BOTH_SKT;

      const combinedPass =
        combinedRaw >=
        CONFIG.MINIMUMS.BOTH_COMBINED;

      return {
        mode: CONFIG.PATHS.BOTH,
        pfePass,
        sktPass,
        combinedPass,
        allPassed:
          pfePass &&
          sktPass &&
          combinedPass,
        combinedRaw
      };
    }


    /* ========================================================
       11. MASTER CALCULATION
    ======================================================== */

    function calculateSnapshot() {
      const gradeBucket = getGradeBucket();
      const promotionCycle = el.promotionCycle.value;
      const cycleLabel = getCycleLabel();
      const cafsc = normalizeCAFSC(el.cafscInput.value);

      const rule = resolveAFSCRule({
        gradeBucket,
        cafsc
      });

      normalizeExemptionControls(rule);

      const path = resolveTestingPath(rule);

      const pfe = readScore(
        el.pfeScore,
        CONFIG.MAXIMUMS.PFE
      );

      const skt = readScore(
        el.sktScore,
        CONFIG.MAXIMUMS.SKT
      );

      const decorations = readDecorationPoints();
      const epb = calculateEPB();

      const testingComponent =
        path.mode === CONFIG.PATHS.PFE_ONLY
          ? truncate2(pfe * 2)
          : truncate2(pfe + skt);

      const totalScore = truncate2(
        Math.min(
          CONFIG.MAXIMUMS.TOTAL,
          testingComponent +
            decorations +
            epb.total
        )
      );

      const scoreUtilization = percentage(
        totalScore,
        CONFIG.MAXIMUMS.TOTAL
      );

      const minimums = calculateMinimums({
        path,
        pfe,
        skt
      });

      const historicalCutoff =
        readHistoricalCutoff();

      const cutoffDifference =
        historicalCutoff === null
          ? null
          : truncate2(
              totalScore - historicalCutoff
            );

      const supportedCycle =
        isCycleSupported(
          gradeBucket,
          promotionCycle
        );

      const decorationConfirmed =
        decorations === 0 ||
        el.decorationEligibilityConfirmed.checked;

      const hasRequiredCAFSC = cafsc.length >= 3;

      const inputComplete =
        hasRequiredCAFSC &&
        decorationConfirmed &&
        Number.isFinite(pfe) &&
        (
          path.mode === CONFIG.PATHS.PFE_ONLY ||
          Number.isFinite(skt)
        );

      return {
        version: VERSION,

        promotion: {
          targetGrade: el.promoGrade.value,
          targetGradeLabel:
            getPromotionGradeLabel(),
          gradeBucket,
          cycle: promotionCycle,
          cycleLabel,
          supportedCycle,
          cafsc,
          rule
        },

        path,

        scores: {
          pfe,
          skt:
            path.mode === CONFIG.PATHS.PFE_ONLY
              ? null
              : skt,
          rawSKT: skt,
          testingComponent,
          decorations,
          epbPoints: epb.total,
          totalScore,
          scoreUtilization
        },

        epb,

        minimums,

        decorations: {
          points: decorations,
          confirmed: decorationConfirmed,
          checkboxChecked:
            el.decorationEligibilityConfirmed.checked
        },

        cutoff: {
          value: historicalCutoff,
          source: el.cutoffSource.value.trim(),
          difference: cutoffDifference
        },

        completion: {
          hasRequiredCAFSC,
          decorationConfirmed,
          inputComplete
        }
      };
    }


    /* ========================================================
       12. CAFSC AND PATH RENDERING
    ======================================================== */

    function renderCAFSC(snapshot) {
      const {
        rule,
        supportedCycle,
        cafsc
      } = snapshot.promotion;

      el.cafscInput.value = cafsc;
      el.cafscClearButton.hidden = !cafsc;

      if (!cafsc) {
        el.cafscStatus.dataset.status = "neutral";
        el.cafscStatus.textContent =
          "Enter a CAFSC to determine the testing path.";
        return;
      }

      if (!supportedCycle) {
        el.cafscStatus.dataset.status = "warning";

        el.cafscStatus.textContent =
          rule.found
            ? `${rule.title}. The loaded exception match is outside its supported 26E5/26E6 cycle.`
            : "Custom cycle selected. Verify the testing path against the applicable EPRRC.";

        return;
      }

      if (rule.rule === "PFE_ONLY") {
        el.cafscStatus.dataset.status = "valid";
        el.cafscStatus.textContent =
          `${rule.title} — PFE-only exception matched.`;
        return;
      }

      if (rule.rule === "NOTE_11_CURRENT_CAFSC") {
        el.cafscStatus.dataset.status = "valid";
        el.cafscStatus.textContent =
          `${rule.title} — current-CAFSC SKT + PFE rule matched.`;
        return;
      }

      el.cafscStatus.dataset.status = "warning";
      el.cafscStatus.textContent =
        "No exception matched. SKT + PFE is being used provisionally; verify the current cycle EPRRC.";
    }

    function renderPath(snapshot) {
      const { path } = snapshot;
      const usesPFEOnly =
        path.mode === CONFIG.PATHS.PFE_ONLY;

      el.testingPathText.textContent =
        path.label;

      el.testingPathHelp.textContent =
        path.description;

      if (path.pendingCAFSC) {
        el.testingPathDisplay.dataset.path =
          "pending";
      } else if (usesPFEOnly) {
        el.testingPathDisplay.dataset.path =
          "pfe-only";
      } else {
        el.testingPathDisplay.dataset.path =
          "both";
      }

      el.sktScore.disabled = usesPFEOnly;
      el.sktRange.disabled = usesPFEOnly;

      el.sktScoreGroup.classList.toggle(
        "is-disabled",
        usesPFEOnly
      );

      el.sktScoreGroup.setAttribute(
        "aria-disabled",
        String(usesPFEOnly)
      );

      el.sktBreakdownItem.classList.toggle(
        "is-disabled",
        usesPFEOnly
      );

      if (usesPFEOnly) {
        el.sktScoreDescription.textContent =
          "Excluded from the PFE-only calculation";

        el.sktScoreHelp.dataset.status = "neutral";
        el.sktScoreHelp.textContent =
          "SKT is excluded from this estimated testing path.";

        el.sktBreakdownSubtitle.textContent =
          "Excluded from PFE-only calculation";

        el.sktBreakdownValue.textContent =
          "N/A";

        el.sktBreakdownMaximum.textContent =
          " Exempt";

        el.sktProgressBar.style.width = "0%";
      } else {
        el.sktScoreDescription.textContent =
          "Specialty Knowledge Test";

        el.sktBreakdownSubtitle.textContent =
          "Specialty Knowledge Test";

        el.sktBreakdownMaximum.textContent =
          "/ 100";
      }
    }


    /* ========================================================
       13. SCORE-INPUT RENDERING
    ======================================================== */

    function renderInputFeedback(snapshot) {
      const {
        pfe,
        rawSKT,
        decorations
      } = {
        pfe: snapshot.scores.pfe,
        rawSKT: snapshot.scores.rawSKT,
        decorations: snapshot.scores.decorations
      };

      const usesPFEOnly =
        snapshot.path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      setRangeFill(el.pfeRange);
      setRangeFill(el.sktRange);
      setRangeFill(el.decorationRange);

      if (usesPFEOnly) {
        el.pfeScoreHelp.dataset.status =
          snapshot.minimums.pfePass
            ? "pass"
            : "fail";

        el.pfeScoreHelp.textContent =
          snapshot.minimums.pfePass
            ? `PFE-only minimum met: ${format2(pfe)} of at least 45.00.`
            : `PFE-only minimum not met: ${format2(pfe)} of at least 45.00.`;
      } else {
        el.pfeScoreHelp.dataset.status =
          snapshot.minimums.pfePass
            ? "pass"
            : "fail";

        el.pfeScoreHelp.textContent =
          snapshot.minimums.pfePass
            ? `PFE minimum met: ${format2(pfe)} of at least 40.00.`
            : `PFE minimum not met: ${format2(pfe)} of at least 40.00.`;

        el.sktScoreHelp.dataset.status =
          snapshot.minimums.sktPass
            ? "pass"
            : "fail";

        el.sktScoreHelp.textContent =
          snapshot.minimums.sktPass
            ? `SKT minimum met: ${format2(rawSKT)} of at least 40.00.`
            : `SKT minimum not met: ${format2(rawSKT)} of at least 40.00.`;
      }

      el.decorationPointsDisplay.textContent =
        String(decorations);

      if (
        decorations > 0 &&
        !snapshot.decorations.confirmed
      ) {
        el.decorationPointsHelp.dataset.status =
          "warning";

        el.decorationPointsHelp.textContent =
          "Confirm that the entered decorations satisfy the applicable date requirements.";
      } else {
        el.decorationPointsHelp.dataset.status =
          "neutral";

        el.decorationPointsHelp.textContent =
          decorations === CONFIG.MAXIMUMS.DECORATIONS
            ? "Decoration points are capped at 25."
            : "Include only eligible decoration points, up to a maximum of 25.";
      }
    }


    /* ========================================================
       14. EPB RENDERING
    ======================================================== */

    function renderEPB(snapshot) {
      const points = snapshot.epb.entries.map(
        (entry) => entry.points
      );

      el.epbCurrentPoints.textContent =
        String(points[0] || 0);

      el.epbPrevious1Points.textContent =
        String(points[1] || 0);

      el.epbPrevious2Points.textContent =
        String(points[2] || 0);

      el.epbPoints.textContent =
        String(snapshot.epb.total);

      el.epbBreakdownValue.textContent =
        String(snapshot.epb.total);

      setProgress(
        el.epbProgressBar,
        snapshot.epb.total,
        CONFIG.MAXIMUMS.EPB_PRS
      );
    }


    /* ========================================================
       15. TOTAL SCORE RENDERING
    ======================================================== */

    function renderTotalScore(snapshot) {
      const {
        pfe,
        rawSKT,
        testingComponent,
        decorations,
        epbPoints,
        totalScore,
        scoreUtilization
      } = snapshot.scores;

      const usesPFEOnly =
        snapshot.path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      el.wapsTotalScore.textContent =
        format2(totalScore);

      el.scoreUtilization.textContent =
        `${format2(scoreUtilization)}%`;

      el.wapsScoreRing.style.setProperty(
        "--score-percent",
        String(scoreUtilization)
      );

      if (usesPFEOnly) {
        el.pfeBreakdownValue.textContent =
          `${format2(pfe)} × 2`;

        el.pfeBreakdownMaximum.textContent =
          `= ${format2(testingComponent)}`;
      } else {
        el.pfeBreakdownValue.textContent =
          format2(pfe);

        el.pfeBreakdownMaximum.textContent =
          "/ 100";

        el.sktBreakdownValue.textContent =
          format2(rawSKT);

        el.sktBreakdownMaximum.textContent =
          "/ 100";

        setProgress(
          el.sktProgressBar,
          rawSKT,
          CONFIG.MAXIMUMS.SKT
        );
      }

      setProgress(
        el.pfeProgressBar,
        pfe,
        CONFIG.MAXIMUMS.PFE
      );

      el.decorationsBreakdownValue.textContent =
        String(decorations);

      setProgress(
        el.decorationsProgressBar,
        decorations,
        CONFIG.MAXIMUMS.DECORATIONS
      );

      el.epbBreakdownValue.textContent =
        String(epbPoints);

      setProgress(
        el.epbProgressBar,
        epbPoints,
        CONFIG.MAXIMUMS.EPB_PRS
      );
    }


    /* ========================================================
       16. MINIMUM REQUIREMENT RENDERING
    ======================================================== */

    function renderMinimums(snapshot) {
      const usesPFEOnly =
        snapshot.path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      const pfeLabel =
        el.pfeMinimumRow.querySelector(
          ".waps-requirement-label"
        );

      const sktLabel =
        el.sktMinimumRow.querySelector(
          ".waps-requirement-label"
        );

      if (usesPFEOnly) {
        if (pfeLabel) {
          pfeLabel.textContent =
            "PFE-only minimum";
        }

        if (sktLabel) {
          sktLabel.textContent =
            "SKT requirement";
        }

        setRequirement(
          el.pfeMinimumRow,
          el.pfeMinimumResult,
          snapshot.minimums.pfePass,
          `${format2(snapshot.scores.pfe)} / 45.00`
        );

        el.sktMinimumRow.dataset.status = "pass";
        el.sktMinimumResult.textContent = "Exempt";

        el.combinedMinimumLabel.textContent =
          "PFE testing component";

        el.combinedMinimumRow.dataset.status =
          snapshot.minimums.allPassed
            ? "pass"
            : "fail";

        el.combinedMinimumResult.textContent =
          `${format2(snapshot.scores.testingComponent)} / 200.00`;
      } else {
        if (pfeLabel) {
          pfeLabel.textContent =
            "PFE minimum";
        }

        if (sktLabel) {
          sktLabel.textContent =
            "SKT minimum";
        }

        setRequirement(
          el.pfeMinimumRow,
          el.pfeMinimumResult,
          snapshot.minimums.pfePass,
          `${format2(snapshot.scores.pfe)} / 40.00`
        );

        setRequirement(
          el.sktMinimumRow,
          el.sktMinimumResult,
          snapshot.minimums.sktPass,
          `${format2(snapshot.scores.rawSKT)} / 40.00`
        );

        el.combinedMinimumLabel.textContent =
          "Combined test minimum";

        setRequirement(
          el.combinedMinimumRow,
          el.combinedMinimumResult,
          snapshot.minimums.combinedPass,
          `${format2(snapshot.minimums.combinedRaw)} / 90.00`
        );
      }

      if (snapshot.path.pendingCAFSC) {
        el.testingMinimumBadge.dataset.status =
          "warning";

        el.testingMinimumBadge.textContent =
          "Path Pending";

        el.testPassBadge.dataset.status =
          "warning";

        el.testPassBadge.textContent =
          "Provisional";

        el.testingValidationCard.dataset.status =
          "warning";

        el.testingValidationTitle.textContent =
          "CAFSC Required to Confirm Path";

        el.testingValidationText.textContent =
          snapshot.minimums.allPassed
            ? "The provisional SKT + PFE inputs meet the displayed minimums, but the testing path is not confirmed."
            : "The provisional testing inputs do not meet all displayed minimums, and the testing path is not confirmed.";

        el.overallScoreStatus.dataset.status =
          "warning";

        el.overallScoreStatusText.textContent =
          "Enter CAFSC to verify the testing path";

        return;
      }

      if (snapshot.minimums.allPassed) {
        el.testingMinimumBadge.dataset.status =
          "pass";

        el.testingMinimumBadge.textContent =
          "Minimums Met";

        el.testPassBadge.dataset.status =
          "pass";

        el.testPassBadge.textContent =
          "Passed";

        el.testingValidationCard.dataset.status =
          "pass";

        el.testingValidationTitle.textContent =
          "Minimum Test Requirements Met";

        el.testingValidationText.textContent =
          usesPFEOnly
            ? "The entered PFE score meets the displayed PFE-only minimum."
            : "The PFE, SKT and combined testing scores meet the displayed minimums.";

        el.overallScoreStatus.dataset.status =
          "pass";

        el.overallScoreStatusText.textContent =
          "Minimum testing requirements met";
      } else {
        el.testingMinimumBadge.dataset.status =
          "fail";

        el.testingMinimumBadge.textContent =
          "Below Minimum";

        el.testPassBadge.dataset.status =
          "fail";

        el.testPassBadge.textContent =
          "Not Met";

        el.testingValidationCard.dataset.status =
          "fail";

        el.testingValidationTitle.textContent =
          "Minimum Test Requirement Not Met";

        el.testingValidationText.textContent =
          usesPFEOnly
            ? "The PFE score must be at least 45.00 for the displayed PFE-only path."
            : "PFE and SKT must each be at least 40.00, with a combined score of at least 90.00.";

        el.overallScoreStatus.dataset.status =
          "fail";

        el.overallScoreStatusText.textContent =
          "Minimum testing requirements not met";
      }
    }


    /* ========================================================
       17. CUTOFF COMPARISON
    ======================================================== */

    function renderCutoff(snapshot) {
      const {
        value,
        source,
        difference
      } = snapshot.cutoff;

      if (value === null) {
        el.cutoffComparisonResult.dataset.status =
          "empty";

        el.cutoffComparisonResult.textContent =
          "Enter a verified cutoff score to compare it with your calculated total.";

        return;
      }

      const sourceText = source
        ? ` Source: ${source}.`
        : "";

      if (difference > 0) {
        el.cutoffComparisonResult.dataset.status =
          "above";

        el.cutoffComparisonResult.textContent =
          `The calculated score is ${formatSigned2(difference)} points above the entered comparison cutoff of ${format2(value)}.${sourceText}`;

        return;
      }

      if (difference < 0) {
        el.cutoffComparisonResult.dataset.status =
          "below";

        el.cutoffComparisonResult.textContent =
          `The calculated score is ${formatSigned2(difference)} points below the entered comparison cutoff of ${format2(value)}.${sourceText}`;

        return;
      }

      el.cutoffComparisonResult.dataset.status =
        "match";

      el.cutoffComparisonResult.textContent =
        `The calculated score matches the entered comparison cutoff of ${format2(value)}.${sourceText}`;
    }


    /* ========================================================
       18. INSIGHTS
    ======================================================== */

    function createInsight(markerClass, text) {
      const item = document.createElement("li");
      item.className = "waps-insight-item";

      const marker = document.createElement("span");
      marker.className =
        `waps-insight-marker ${markerClass}`;
      marker.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.textContent = text;

      item.append(marker, copy);

      return item;
    }

    function renderInsights(snapshot) {
      const fragment = document.createDocumentFragment();

      fragment.appendChild(
        createInsight(
          "waps-marker-mint",
          `The calculated WAPS score is ${format2(snapshot.scores.totalScore)} out of ${CONFIG.MAXIMUMS.TOTAL}.`
        )
      );

      if (snapshot.path.pendingCAFSC) {
        fragment.appendChild(
          createInsight(
            "waps-marker-peach",
            "The testing path is provisional because a CAFSC has not been entered."
          )
        );
      } else if (
        snapshot.path.mode ===
        CONFIG.PATHS.PFE_ONLY
      ) {
        fragment.appendChild(
          createInsight(
            "waps-marker-peach",
            `The PFE-only testing component is ${format2(snapshot.scores.pfe)} × 2, producing ${format2(snapshot.scores.testingComponent)} testing points.`
          )
        );
      } else {
        fragment.appendChild(
          createInsight(
            "waps-marker-peach",
            `The SKT + PFE testing component is ${format2(snapshot.scores.testingComponent)} out of 200.00.`
          )
        );
      }

      fragment.appendChild(
        createInsight(
          "waps-marker-teal",
          snapshot.minimums.allPassed
            ? "The entered test scores meet the displayed minimum testing requirements."
            : "The entered test scores do not meet all displayed minimum testing requirements."
        )
      );

      if (
        snapshot.scores.decorations > 0 &&
        !snapshot.decorations.confirmed
      ) {
        fragment.appendChild(
          createInsight(
            "waps-marker-peach",
            "Decoration points are included in the estimate, but their date eligibility has not been confirmed."
          )
        );
      } else {
        fragment.appendChild(
          createInsight(
            "waps-marker-mint",
            `The fixed record factors currently include ${snapshot.scores.epbPoints} EPB points and ${snapshot.scores.decorations} decoration points.`
          )
        );
      }

      fragment.appendChild(
        createInsight(
          "waps-marker-teal",
          "Official promotion selection depends on the applicable promotion AFSC, quota, cycle cutoff and official Air Force personnel data."
        )
      );

      el.wapsInsightList.replaceChildren(fragment);
    }


    /* ========================================================
       19. COMPLETION STATUS
    ======================================================== */

    function renderCompletion(snapshot) {
      if (snapshot.completion.inputComplete) {
        el.inputCompletionBadge.dataset.state =
          "complete";

        el.inputCompletionBadge.textContent =
          "Inputs Complete";
      } else {
        el.inputCompletionBadge.dataset.state =
          "incomplete";

        if (!snapshot.completion.hasRequiredCAFSC) {
          el.inputCompletionBadge.textContent =
            "CAFSC Needed";
        } else if (
          !snapshot.completion.decorationConfirmed
        ) {
          el.inputCompletionBadge.textContent =
            "Confirm Awards";
        } else {
          el.inputCompletionBadge.textContent =
            "Incomplete";
        }
      }
    }


    /* ========================================================
       20. MASTER RENDER
    ======================================================== */

    function render(snapshot) {
      state.rule = snapshot.promotion.rule;
      state.path = snapshot.path;
      state.snapshot = snapshot;

      renderCAFSC(snapshot);
      renderPath(snapshot);
      renderInputFeedback(snapshot);
      renderEPB(snapshot);
      renderTotalScore(snapshot);
      renderMinimums(snapshot);
      renderCutoff(snapshot);
      renderInsights(snapshot);
      renderCompletion(snapshot);

      el.root.dataset.ready = "true";

      const eventDetail = deepClone(snapshot);

      window.dispatchEvent(
        new CustomEvent(
          "thewing:waps-updated",
          {
            detail: eventDetail
          }
        )
      );
    }

    function recompute() {
      try {
        const snapshot = calculateSnapshot();
        render(snapshot);
        return snapshot;
      } catch (error) {
        console.error(
          "[THEWING_WAPS] Recompute failed:",
          error
        );

        el.overallScoreStatus.dataset.status =
          "fail";

        el.overallScoreStatusText.textContent =
          "Calculation error";

        return null;
      }
    }


    /* ========================================================
       21. SCORE CONTROL SYNCHRONIZATION
    ======================================================== */

    function bindDecimalScorePair({
      range,
      input,
      maximum
    }) {
      range.addEventListener("input", () => {
        const value = truncate2(
          clamp(
            range.value,
            0,
            maximum
          )
        );

        input.value = format2(value);
        setRangeFill(range);
        recompute();
      });

      input.addEventListener("input", () => {
        if (input.value === "") {
          range.value = "0";
          setRangeFill(range);
          recompute();
          return;
        }

        const value = truncate2(
          clamp(
            input.value,
            0,
            maximum
          )
        );

        range.value = String(value);
        setRangeFill(range);
        recompute();
      });

      input.addEventListener("blur", () => {
        const value = truncate2(
          clamp(
            input.value,
            0,
            maximum
          )
        );

        input.value = format2(value);
        range.value = String(value);

        setRangeFill(range);
        recompute();
      });
    }

    function bindDecorationPair() {
      el.decorationRange.addEventListener(
        "input",
        () => {
          const value = integerValue(
            el.decorationRange.value,
            0,
            CONFIG.MAXIMUMS.DECORATIONS
          );

          el.decorationPoints.value =
            String(value);

          setRangeFill(el.decorationRange);
          recompute();
        }
      );

      el.decorationPoints.addEventListener(
        "input",
        () => {
          if (el.decorationPoints.value === "") {
            el.decorationRange.value = "0";
            setRangeFill(el.decorationRange);
            recompute();
            return;
          }

          const value = integerValue(
            el.decorationPoints.value,
            0,
            CONFIG.MAXIMUMS.DECORATIONS
          );

          el.decorationRange.value =
            String(value);

          setRangeFill(el.decorationRange);
          recompute();
        }
      );

      el.decorationPoints.addEventListener(
        "blur",
        () => {
          const value = integerValue(
            el.decorationPoints.value,
            0,
            CONFIG.MAXIMUMS.DECORATIONS
          );

          el.decorationPoints.value =
            String(value);

          el.decorationRange.value =
            String(value);

          setRangeFill(el.decorationRange);
          recompute();
        }
      );
    }


    /* ========================================================
       22. GRADE AND CYCLE SYNCHRONIZATION
    ======================================================== */

    function synchronizeCycleFromGrade() {
      if (state.gradeCycleSyncing) return;

      state.gradeCycleSyncing = true;

      if (el.promoGrade.value === "tsgt") {
        el.promotionCycle.value = "26e6";
      } else {
        el.promotionCycle.value = "26e5";
      }

      populateCAFSCDataList();

      state.gradeCycleSyncing = false;
      recompute();
    }

    function synchronizeGradeFromCycle() {
      if (state.gradeCycleSyncing) return;

      state.gradeCycleSyncing = true;

      if (el.promotionCycle.value === "26e5") {
        el.promoGrade.value = "ssgt";
      }

      if (el.promotionCycle.value === "26e6") {
        el.promoGrade.value = "tsgt";
      }

      populateCAFSCDataList();

      state.gradeCycleSyncing = false;
      recompute();
    }


    /* ========================================================
       23. RESET
    ======================================================== */

    function resetCalculator({
      announceReset = true
    } = {}) {
      const defaults = CONFIG.DEFAULTS;

      el.promoGrade.value =
        defaults.PROMO_GRADE;

      el.promotionCycle.value =
        defaults.PROMOTION_CYCLE;

      el.cafscInput.value =
        defaults.CAFSC;

      el.sktExemptionNo.checked =
        defaults.SKT_EXEMPTION === "no";

      el.sktExemptionYes.checked =
        defaults.SKT_EXEMPTION === "yes";

      el.sktElection.value =
        defaults.SKT_ELECTION;

      el.pfeScore.value =
        format2(defaults.PFE);

      el.pfeRange.value =
        String(defaults.PFE);

      el.sktScore.value =
        format2(defaults.SKT);

      el.sktRange.value =
        String(defaults.SKT);

      el.decorationPoints.value =
        String(defaults.DECORATIONS);

      el.decorationRange.value =
        String(defaults.DECORATIONS);

      el.epbCurrent.value =
        defaults.EPB_CURRENT;

      el.epbPrevious1.value =
        defaults.EPB_PREVIOUS_1;

      el.epbPrevious2.value =
        defaults.EPB_PREVIOUS_2;

      el.decorationEligibilityConfirmed.checked =
        defaults.DECORATION_CONFIRMED;

      el.historicalCutoff.value =
        defaults.HISTORICAL_CUTOFF;

      el.cutoffSource.value =
        defaults.CUTOFF_SOURCE;

      populateCAFSCDataList();

      [
        el.pfeRange,
        el.sktRange,
        el.decorationRange
      ].forEach(setRangeFill);

      recompute();

      if (announceReset) {
        announce(
          "WAPS calculator reset to default values."
        );
      }
    }


    /* ========================================================
       24. COPY SUMMARY
    ======================================================== */

    function buildCopySummary(snapshot) {
      const lines = [
        "TheWing.ai WAPS Calculator",
        "-----------------------------",
        `Target grade: ${snapshot.promotion.targetGradeLabel}`,
        `Promotion cycle: ${snapshot.promotion.cycleLabel}`,
        `CAFSC on PECD: ${snapshot.promotion.cafsc || "Not entered"}`,
        `Testing path: ${snapshot.path.label}`,
        "",
        `PFE: ${format2(snapshot.scores.pfe)}`,
        `SKT: ${
          snapshot.path.mode === CONFIG.PATHS.PFE_ONLY
            ? "Exempt"
            : format2(snapshot.scores.rawSKT)
        }`,
        `Testing component: ${format2(snapshot.scores.testingComponent)} / 200.00`,
        `EPB promotion recommendation score: ${snapshot.scores.epbPoints} / 285`,
        `Eligible decoration points: ${snapshot.scores.decorations} / 25`,
        "",
        `Calculated WAPS score: ${format2(snapshot.scores.totalScore)} / 510`,
        `Score utilization: ${format2(snapshot.scores.scoreUtilization)}%`,
        `Minimum testing requirements: ${
          snapshot.minimums.allPassed
            ? "Met"
            : "Not met"
        }`
      ];

      if (snapshot.cutoff.value !== null) {
        lines.push(
          "",
          `Entered comparison cutoff: ${format2(snapshot.cutoff.value)}`,
          `Difference: ${formatSigned2(snapshot.cutoff.difference)}`
        );

        if (snapshot.cutoff.source) {
          lines.push(
            `Cutoff source: ${snapshot.cutoff.source}`
          );
        }
      }

      lines.push(
        "",
        "Estimate only. Official eligibility, scores, promotion AFSC, quotas, cutoffs and selection status are determined by Air Force personnel systems and AFPC."
      );

      return lines.join("\n");
    }

    async function writeClipboard(text) {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function" &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const fallback = document.createElement("textarea");

      fallback.value = text;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      fallback.style.pointerEvents = "none";

      document.body.appendChild(fallback);

      fallback.select();
      fallback.setSelectionRange(
        0,
        fallback.value.length
      );

      const copied = document.execCommand("copy");

      fallback.remove();

      if (!copied) {
        throw new Error(
          "Clipboard copy was not supported."
        );
      }
    }

    async function copyResults() {
      const snapshot =
        state.snapshot || recompute();

      if (!snapshot) return;

      const originalText =
        "Copy Score Summary";

      try {
        await writeClipboard(
          buildCopySummary(snapshot)
        );

        el.copyResultsButtonText.textContent =
          "Summary Copied";

        announce(
          "WAPS score summary copied."
        );

        if (state.copyResetTimer) {
          window.clearTimeout(
            state.copyResetTimer
          );
        }

        state.copyResetTimer =
          window.setTimeout(() => {
            el.copyResultsButtonText.textContent =
              originalText;
          }, 1800);
      } catch (error) {
        console.error(
          "[THEWING_WAPS] Copy failed:",
          error
        );

        el.copyResultsButtonText.textContent =
          "Copy Failed";

        announce(
          "The score summary could not be copied."
        );

        window.setTimeout(() => {
          el.copyResultsButtonText.textContent =
            originalText;
        }, 1800);
      }
    }


    /* ========================================================
       25. EVENT BINDINGS
    ======================================================== */

    function bindEvents() {
      bindDecimalScorePair({
        range: el.pfeRange,
        input: el.pfeScore,
        maximum: CONFIG.MAXIMUMS.PFE
      });

      bindDecimalScorePair({
        range: el.sktRange,
        input: el.sktScore,
        maximum: CONFIG.MAXIMUMS.SKT
      });

      bindDecorationPair();

      el.promoGrade.addEventListener(
        "change",
        synchronizeCycleFromGrade
      );

      el.promotionCycle.addEventListener(
        "change",
        synchronizeGradeFromCycle
      );

      el.cafscInput.addEventListener(
        "input",
        () => {
          const normalized = normalizeCAFSC(
            el.cafscInput.value
          );

          if (el.cafscInput.value !== normalized) {
            el.cafscInput.value = normalized;
          }

          el.cafscClearButton.hidden =
            !normalized;

          recompute();
        }
      );

      el.cafscInput.addEventListener(
        "blur",
        () => {
          el.cafscInput.value =
            normalizeCAFSC(
              el.cafscInput.value
            );

          recompute();
        }
      );

      el.cafscClearButton.addEventListener(
        "click",
        () => {
          el.cafscInput.value = "";
          el.cafscInput.focus();
          recompute();
        }
      );

      [
        el.sktExemptionNo,
        el.sktExemptionYes
      ].forEach((radio) => {
        radio.addEventListener(
          "change",
          recompute
        );
      });

      el.sktElection.addEventListener(
        "change",
        recompute
      );

      [
        el.epbCurrent,
        el.epbPrevious1,
        el.epbPrevious2
      ].forEach((select) => {
        select.addEventListener(
          "change",
          recompute
        );
      });

      el.decorationEligibilityConfirmed.addEventListener(
        "change",
        recompute
      );

      el.historicalCutoff.addEventListener(
        "input",
        recompute
      );

      el.historicalCutoff.addEventListener(
        "blur",
        () => {
          const cutoff =
            readHistoricalCutoff();

          if (cutoff !== null) {
            el.historicalCutoff.value =
              format2(cutoff);
          }

          recompute();
        }
      );

      el.cutoffSource.addEventListener(
        "input",
        recompute
      );

      el.resetCalculatorButton.addEventListener(
        "click",
        () => {
          resetCalculator({
            announceReset: true
          });
        }
      );

      el.copyResultsButton.addEventListener(
        "click",
        copyResults
      );

      el.printResultsButton.addEventListener(
        "click",
        () => {
          window.print();
        }
      );
    }


    /* ========================================================
       26. PUBLIC API
    ======================================================== */

    const api = {
      __mounted_v100: true,

      version: VERSION,
      CONFIG,
      AFSC_DB,

      recompute,

      reset() {
        resetCalculator({
          announceReset: false
        });

        return this.getState();
      },

      getState() {
        return state.snapshot
          ? deepClone(state.snapshot)
          : null;
      },

      getCAFSC() {
        return normalizeCAFSC(
          el.cafscInput.value
        );
      },

      setCAFSC(cafsc) {
        el.cafscInput.value =
          normalizeCAFSC(cafsc);

        recompute();

        return this.getState();
      },

      setPromotionGrade(grade) {
        const normalized =
          String(grade || "")
            .trim()
            .toLowerCase();

        if (
          normalized === "tsgt" ||
          normalized === "e6"
        ) {
          el.promoGrade.value = "tsgt";
        } else {
          el.promoGrade.value = "ssgt";
        }

        synchronizeCycleFromGrade();

        return this.getState();
      },

      resolveAFSC({
        grade,
        cafsc
      } = {}) {
        let gradeBucket = getGradeBucket();

        const normalizedGrade =
          String(grade || "")
            .trim()
            .toUpperCase();

        if (
          normalizedGrade === "E6" ||
          normalizedGrade === "TSGT"
        ) {
          gradeBucket = "E6";
        }

        if (
          normalizedGrade === "E5" ||
          normalizedGrade === "SSGT"
        ) {
          gradeBucket = "E5";
        }

        return resolveAFSCRule({
          gradeBucket,
          cafsc: normalizeCAFSC(
            cafsc ?? el.cafscInput.value
          )
        });
      },

      copySummary() {
        return copyResults();
      }
    };

    window.THEWING_WAPS = api;


    /* ========================================================
       27. STARTUP
    ======================================================== */

    bindEvents();
    populateCAFSCDataList();

    [
      el.pfeRange,
      el.sktRange,
      el.decorationRange
    ].forEach(setRangeFill);

    recompute();

    console.info(
      `[THEWING_WAPS] Mounted v${VERSION}`
    );
  }


  /* ==========================================================
     28. DOM READY
  ========================================================== */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }
})();
