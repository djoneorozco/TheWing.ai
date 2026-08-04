/* ============================================================
   THEWING.AI • AIR FORCE WAPS CALCULATOR
   WAPS.JS
   SIMPLIFIED AURA INTERFACE
   Version 2.0.0

   FILE PAIRING
   - index.html v2.0.0
   - waps.css v2.0.0

   PRIMARY EXPERIENCE
   1. Select promotion grade
   2. Select testing type
   3. Enter test scores
   4. Select up to three eligible EPB recommendations
   5. Enter eligible decoration points
   6. View the estimated WAPS score

   SCORING BASELINE
   - PFE maximum: 100
   - SKT maximum: 100
   - Testing maximum: 200
   - EPB PRS maximum: 285
   - Decoration maximum: 25
   - Total maximum: 510

   STANDARD TEST MINIMUMS
   - PFE: 40
   - SKT: 40
   - Combined: 90

   PFE-ONLY MINIMUM
   - PFE: 45
   - Testing component: PFE × 2

   IMPORTANT
   - Test scores are truncated to two decimal places.
   - The calculator does not predict official selection.
   - Official promotion outcomes depend on AFPC data,
     promotion AFSC, quotas, cutoffs and eligibility.
============================================================ */

(() => {
  "use strict";

  const VERSION = "2.0.0";
  const MOUNT_KEY = "__THEWING_WAPS_V200_MOUNTED__";

  if (window[MOUNT_KEY]) return;
  window[MOUNT_KEY] = true;


  /* ==========================================================
     1. CONFIGURATION
  ========================================================== */

  const CONFIG = Object.freeze({
    VERSION,

    MAXIMUMS: Object.freeze({
      PFE: 100,
      SKT: 100,
      TESTING: 200,
      EPB: 285,
      DECORATIONS: 25,
      TOTAL: 510
    }),

    MINIMUMS: Object.freeze({
      STANDARD_PFE: 40,
      STANDARD_SKT: 40,
      STANDARD_COMBINED: 90,
      PFE_ONLY: 45
    }),

    PATHS: Object.freeze({
      BOTH: "both",
      PFE_ONLY: "pfe-only"
    }),

    PATH_SOURCES: Object.freeze({
      USER_SELECTION: "USER_SELECTION",
      CAFSC_PFE_ONLY: "CAFSC_PFE_ONLY",
      CAFSC_CURRENT_RULE: "CAFSC_CURRENT_RULE",
      INDIVIDUAL_EXEMPTION: "INDIVIDUAL_EXEMPTION"
    }),

    EPB_POSITIONS: Object.freeze([
      "current",
      "second",
      "third"
    ]),

    EPB_POINTS: Object.freeze({
      "promote-now": Object.freeze({
        current: 250,
        second: 20,
        third: 15
      }),

      "must-promote": Object.freeze({
        current: 220,
        second: 15,
        third: 10
      }),

      "promote": Object.freeze({
        current: 200,
        second: 10,
        third: 5
      }),

      "not-ready-now": Object.freeze({
        current: 0,
        second: 0,
        third: 0
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
      PROMOTION_GRADE: "ssgt",
      TESTING_PATH: "both",
      PROMOTION_CYCLE: "26e5",
      CAFSC: "",
      INDIVIDUAL_EXEMPTION: false,

      PFE: 74,
      SKT: 68,

      EPB_CURRENT: "must-promote",
      EPB_SECOND: "promote",
      EPB_THIRD: "promote",

      DECORATIONS: 12,

      HISTORICAL_CUTOFF: "",
      CUTOFF_SOURCE: ""
    })
  });


  /* ==========================================================
     2. 2026 AFSC EXCEPTION DATABASE

     This is an exception database, not a complete AFSC list.

     LOGIC
     - PFE_ONLY:
       The loaded cycle table identifies the CAFSC as PFE only.

     - NOTE_11_CURRENT_CAFSC:
       The member follows SKT + PFE using the current CAFSC.

     - No match:
       The primary testing-type selection remains in effect.

     This data must be reviewed for each promotion cycle.
  ========================================================== */

  const INTERNAL_AFSC_DB = {
    META: {
      version: "2026.1",
      sourceType: "CYCLE_EXCEPTION_TABLE",
      catalogType: "EXCEPTIONS_ONLY",
      supportedCycles: {
        E5: "26E5",
        E6: "26E6"
      }
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
        "2A551": "Airlift and Special Mission Aircraft Maintenance Journeyman",
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
        "3N1/3N2/3N3": "Regional or Premier Band Journeyman",
        "4A051": "Health Services Management Journeyman",
        "4A151": "Medical Materiel Journeyman",
        "4C051": "Mental Health Service Journeyman",
        "4J052": "Physical Medicine Journeyman",
        "4J052A": "Physical Medicine Orthotic Journeyman",
        "4R051": "Diagnostic Imaging Journeyman",
        "4T051": "Medical Laboratory Journeyman",
        "7S051": "Special Investigations Journeyman"
      },

      NOTE_11_CURRENT_CAFSC: {},

      RI_SDI: {}
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
        "1D772": "Spectrum Defense Operations Craftsman",
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
        "2A571": "Airlift and Special Mission Aircraft Maintenance Craftsman",
        "2A773": "Aircraft Structural Maintenance Craftsman",
        "2M071": "Missile and Space Systems Electronic Maintenance Craftsman",
        "2T171": "Ground Transportation Craftsman",
        "2T371": "Mission Generation Vehicular Equipment Maintenance Craftsman",
        "2T377": "Fleet Management and Analysis Craftsman",
        "3F071": "Human Resources and Administration Craftsman",
        "3F171": "Services Craftsman",
        "3F371": "Manpower Craftsman",
        "3G071": "Talent Acquisition Craftsman",
        "3H071": "Historian Craftsman",
        "3N1/3N2/3N3": "Regional or Premier Band Craftsman",
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

        "8B100": {
          title: "Military Training Leader",
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
          title: "Interpreter or Translator",
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
     3. HELP CONTENT
  ========================================================== */

  const HELP_TOPICS = Object.freeze({
    general: {
      title: "How WAPS Scoring Works",

      html: `
        <section>
          <h3>Standard Testing Path</h3>
          <p>
            The SKT + PFE path provides up to 100 points from each
            examination, for a maximum testing component of 200.
          </p>
          <p>
            The PFE and SKT must each be at least 40.00, and the
            combined testing score must be at least 90.00.
          </p>
        </section>

        <section>
          <h3>PFE-Only Path</h3>
          <p>
            The PFE-only testing component equals the PFE score
            multiplied by two. The minimum PFE score is 45.00.
          </p>
        </section>

        <section>
          <h3>EPB Recommendations</h3>
          <p>
            Up to three eligible force-distributed EPB recommendations
            contribute to the promotion recommendation score.
            Nonrated or successfully removed reports are bypassed.
          </p>
        </section>

        <section>
          <h3>Decoration Points</h3>
          <p>
            Eligible decorations may contribute up to 25 points.
            Only decorations that qualify for the applicable promotion
            cycle should be entered.
          </p>
        </section>

        <section>
          <h3>Official Selection</h3>
          <p>
            A calculated WAPS score does not guarantee promotion.
            Selection depends on official personnel data, the promotion
            AFSC, quotas and the applicable cycle cutoff.
          </p>
        </section>
      `
    },

    "promotion-grade": {
      title: "Select the Promotion Grade",

      html: `
        <section>
          <h3>Staff Sergeant</h3>
          <p>
            Select SSgt when competing for promotion from Senior Airman
            to Staff Sergeant.
          </p>
        </section>

        <section>
          <h3>Technical Sergeant</h3>
          <p>
            Select TSgt when competing for promotion from Staff Sergeant
            to Technical Sergeant.
          </p>
        </section>

        <section>
          <h3>Promotion Cycle</h3>
          <p>
            The calculator automatically pairs SSgt with the 26E5 cycle
            and TSgt with the 26E6 cycle. The cycle can be adjusted under
            Advanced Options.
          </p>
        </section>
      `
    },

    "testing-type": {
      title: "Choose the Testing Type",

      html: `
        <section>
          <h3>SKT + PFE</h3>
          <p>
            Choose this path when both the Specialty Knowledge Test and
            Promotion Fitness Examination apply.
          </p>
          <p>
            Each score must be at least 40.00, and the combined score
            must be at least 90.00.
          </p>
        </section>

        <section>
          <h3>PFE Only</h3>
          <p>
            Choose this path only when the member has an authorized
            PFE-only testing requirement or official SKT exemption.
          </p>
          <p>
            The PFE score is doubled for the testing component and must
            be at least 45.00.
          </p>
        </section>

        <section>
          <h3>CAFSC Verification</h3>
          <p>
            Advanced Options can check the entered CAFSC against the
            loaded cycle exception table. The table is cycle-specific
            and should be verified against current official guidance.
          </p>
        </section>
      `
    },

    "test-scores": {
      title: "Enter Test Scores",

      html: `
        <section>
          <h3>Official or Projected Scores</h3>
          <p>
            Enter an official score when it is available, or use a
            projected score to explore a possible WAPS outcome.
          </p>
        </section>

        <section>
          <h3>Two Decimal Places</h3>
          <p>
            PFE and SKT values are preserved to two decimal places.
            Additional decimal places are discarded rather than rounded.
          </p>
        </section>

        <section>
          <h3>Minimum Requirements</h3>
          <p>
            The calculator checks the minimum requirements separately
            from the total WAPS score. A high total does not override a
            failed minimum test requirement.
          </p>
        </section>
      `
    },

    epb: {
      title: "EPB Promotion Recommendations",

      html: `
        <section>
          <h3>Most Recent Eligible EPB</h3>
          <p>
            The most recent eligible force-distributed recommendation
            carries the largest point value.
          </p>
        </section>

        <section>
          <h3>Prior Eligible EPBs</h3>
          <p>
            The second and third eligible recommendations receive the
            lower point values assigned to those positions.
          </p>
        </section>

        <section>
          <h3>Bypassed Reports</h3>
          <p>
            Select Nonrated or Removed when a report should be bypassed.
            Remaining eligible reports shift forward into the applicable
            weighted positions.
          </p>
        </section>

        <section>
          <h3>No Eligible EPB</h3>
          <p>
            Select No Eligible EPB when an eligible report does not
            exist for that position.
          </p>
        </section>
      `
    },

    decorations: {
      title: "Eligible Decoration Points",

      html: `
        <section>
          <h3>Maximum Points</h3>
          <p>
            Eligible decorations can contribute no more than 25 total
            points to the WAPS calculation.
          </p>
        </section>

        <section>
          <h3>Cycle Eligibility</h3>
          <p>
            Enter only decorations that meet the closeout-date and
            official approval-date requirements for the applicable
            promotion cycle.
          </p>
        </section>

        <section>
          <h3>Not Projected Awards</h3>
          <p>
            Do not include an expected or projected decoration that has
            not become eligible for the cycle.
          </p>
        </section>
      `
    }
  });


  /* ==========================================================
     4. INITIALIZATION
  ========================================================== */

  function initialize() {
    const root = document.getElementById("thewing-waps");

    if (!root) {
      console.warn(
        "[THEWING_WAPS] Root element #thewing-waps was not found."
      );
      return;
    }

    const byId = (id) => document.getElementById(id);

    const el = {
      root,

      form: byId("wapsCalculatorForm"),

      promoGradeSSgt: byId("promoGradeSSgt"),
      promoGradeTSgt: byId("promoGradeTSgt"),

      testingPathBoth: byId("testingPathBoth"),
      testingPathPFEOnly: byId("testingPathPFEOnly"),
      testingPathControl:
        root.querySelector('[data-control="testing-type"]'),

      pfeScore: byId("pfeScore"),
      pfeRange: byId("pfeRange"),
      pfeScoreFeedback: byId("pfeScoreFeedback"),

      sktScoreCard: byId("sktScoreCard"),
      sktScore: byId("sktScore"),
      sktRange: byId("sktRange"),
      sktScoreFeedback: byId("sktScoreFeedback"),

      testingMinimumNotice: byId("testingMinimumNotice"),
      testingMinimumTitle: byId("testingMinimumTitle"),
      testingMinimumText: byId("testingMinimumText"),

      epbCurrent: byId("epbCurrent"),
      epbPrevious1: byId("epbPrevious1"),
      epbPrevious2: byId("epbPrevious2"),

      epbCurrentPoints: byId("epbCurrentPoints"),
      epbPrevious1Points: byId("epbPrevious1Points"),
      epbPrevious2Points: byId("epbPrevious2Points"),

      decorationPoints: byId("decorationPoints"),

      advancedOptions: byId("advancedOptions"),
      promotionCycle: byId("promotionCycle"),

      cafscInput: byId("cafscInput"),
      cafscCatalog: byId("cafscCatalog"),
      cafscClearButton: byId("cafscClearButton"),
      cafscStatus: byId("cafscStatus"),

      individualSktExemption: byId("individualSktExemption"),

      historicalCutoff: byId("historicalCutoff"),
      cutoffSource: byId("cutoffSource"),
      cutoffComparisonResult: byId("cutoffComparisonResult"),

      resetCalculatorButton: byId("resetCalculatorButton"),

      wapsScoreRing: byId("wapsScoreRing"),
      wapsTotalScore: byId("wapsTotalScore"),

      overallScoreStatus: byId("overallScoreStatus"),
      overallScoreStatusTitle: byId("overallScoreStatusTitle"),
      overallScoreStatusText: byId("overallScoreStatusText"),

      testingComponentValue: byId("testingComponentValue"),
      epbComponentValue: byId("epbComponentValue"),
      decorationComponentValue: byId("decorationComponentValue"),
      totalComponentValue: byId("totalComponentValue"),

      wapsMeaningText: byId("wapsMeaningText"),

      pfeBreakdownLabel: byId("pfeBreakdownLabel"),
      pfeBreakdownValue: byId("pfeBreakdownValue"),
      pfeBreakdownMaximum: byId("pfeBreakdownMaximum"),
      pfeProgressBar: byId("pfeProgressBar"),

      sktBreakdownItem: byId("sktBreakdownItem"),
      sktBreakdownValue: byId("sktBreakdownValue"),
      sktBreakdownMaximum: byId("sktBreakdownMaximum"),
      sktProgressBar: byId("sktProgressBar"),

      epbBreakdownValue: byId("epbBreakdownValue"),
      epbProgressBar: byId("epbProgressBar"),

      decorationsBreakdownValue:
        byId("decorationsBreakdownValue"),
      decorationsProgressBar:
        byId("decorationsProgressBar"),

      copyResultsButton: byId("copyResultsButton"),
      copyResultsButtonText: byId("copyResultsButtonText"),

      openHelpButton: byId("openHelpButton"),
      testingPathHelpButton: byId("testingPathHelpButton"),

      helpDialog: byId("wapsHelpDialog"),
      helpDialogSurface:
        root.querySelector(".waps-dialog-surface"),
      helpDialogTitle: byId("wapsHelpDialogTitle"),
      helpContent: byId("wapsHelpContent"),
      closeHelpButton: byId("closeHelpButton"),
      helpDialogDoneButton: byId("helpDialogDoneButton"),

      liveRegion: byId("wapsLiveRegion")
    };

    const requiredKeys = [
      "form",
      "promoGradeSSgt",
      "promoGradeTSgt",
      "testingPathBoth",
      "testingPathPFEOnly",
      "testingPathControl",
      "pfeScore",
      "pfeRange",
      "pfeScoreFeedback",
      "sktScoreCard",
      "sktScore",
      "sktRange",
      "sktScoreFeedback",
      "testingMinimumNotice",
      "testingMinimumTitle",
      "testingMinimumText",
      "epbCurrent",
      "epbPrevious1",
      "epbPrevious2",
      "epbCurrentPoints",
      "epbPrevious1Points",
      "epbPrevious2Points",
      "decorationPoints",
      "promotionCycle",
      "cafscInput",
      "cafscCatalog",
      "cafscClearButton",
      "cafscStatus",
      "individualSktExemption",
      "historicalCutoff",
      "cutoffSource",
      "cutoffComparisonResult",
      "resetCalculatorButton",
      "wapsScoreRing",
      "wapsTotalScore",
      "overallScoreStatus",
      "overallScoreStatusTitle",
      "overallScoreStatusText",
      "testingComponentValue",
      "epbComponentValue",
      "decorationComponentValue",
      "totalComponentValue",
      "wapsMeaningText",
      "pfeBreakdownLabel",
      "pfeBreakdownValue",
      "pfeBreakdownMaximum",
      "pfeProgressBar",
      "sktBreakdownItem",
      "sktBreakdownValue",
      "sktBreakdownMaximum",
      "sktProgressBar",
      "epbBreakdownValue",
      "epbProgressBar",
      "decorationsBreakdownValue",
      "decorationsProgressBar",
      "copyResultsButton",
      "copyResultsButtonText",
      "openHelpButton",
      "testingPathHelpButton",
      "helpDialog",
      "helpDialogSurface",
      "helpDialogTitle",
      "helpContent",
      "closeHelpButton",
      "helpDialogDoneButton",
      "liveRegion"
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
       5. LOCAL STATE
    ======================================================== */

    const state = {
      snapshot: null,
      pathLocked: false,
      gradeCycleSyncing: false,
      copyResetTimer: null,
      activeHelpTopic: "general"
    };


    /* ========================================================
       6. BASIC HELPERS
    ======================================================== */

    function clamp(value, minimum, maximum) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return minimum;
      }

      return Math.min(
        maximum,
        Math.max(minimum, number)
      );
    }

    function truncate2(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return 0;
      }

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

      if (number > 0) {
        return `+${number.toFixed(2)}`;
      }

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

    function normalizeCAFSC(value) {
      return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9/]/g, "")
        .slice(0, 15);
    }

    function deepClone(value) {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    }

    function selectedRadioValue(name) {
      const selected =
        root.querySelector(
          `input[name="${name}"]:checked`
        );

      return selected ? selected.value : "";
    }

    function getPromotionGrade() {
      return selectedRadioValue("promoGrade") || "ssgt";
    }

    function getPromotionGradeLabel() {
      return getPromotionGrade() === "tsgt"
        ? "Technical Sergeant"
        : "Staff Sergeant";
    }

    function getGradeBucket() {
      return getPromotionGrade() === "tsgt"
        ? "E6"
        : "E5";
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

    function isSupportedCycle(gradeBucket, cycleValue) {
      if (gradeBucket === "E5") {
        return cycleValue === "26e5";
      }

      if (gradeBucket === "E6") {
        return cycleValue === "26e6";
      }

      return false;
    }

    function readScore(input, maximum) {
      if (!input || input.value === "") {
        return 0;
      }

      return truncate2(
        clamp(input.value, 0, maximum)
      );
    }

    function readDecorations() {
      if (el.decorationPoints.value === "") {
        return 0;
      }

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

      if (!Number.isFinite(number)) {
        return null;
      }

      return truncate2(
        clamp(
          number,
          0,
          CONFIG.MAXIMUMS.TOTAL
        )
      );
    }

    function setRangeFill(range) {
      if (!range) return;

      const minimum = Number(range.min || 0);
      const maximum = Number(range.max || 100);

      const value = clamp(
        range.value,
        minimum,
        maximum
      );

      const fill =
        maximum === minimum
          ? 0
          : (
              (value - minimum) /
              (maximum - minimum)
            ) * 100;

      range.style.setProperty(
        "--range-fill",
        `${fill}%`
      );
    }

    function setProgress(element, value, maximum) {
      if (!element) return;

      element.style.width =
        `${percentage(value, maximum)}%`;
    }

    function setRadioValue(name, value) {
      const target =
        root.querySelector(
          `input[name="${name}"][value="${value}"]`
        );

      if (target) {
        target.checked = true;
      }
    }

    function announce(message) {
      el.liveRegion.textContent = "";

      window.setTimeout(() => {
        el.liveRegion.textContent = message;
      }, 20);
    }


    /* ========================================================
       7. AFSC DATABASE HELPERS
    ======================================================== */

    function normalizeDatabaseRule(rule) {
      const normalized = String(rule || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");

      if (
        normalized === "PFE_ONLY" ||
        normalized.includes("PFE_ONLY")
      ) {
        return "PFE_ONLY";
      }

      if (
        normalized.includes("NOTE_11") ||
        normalized.includes("CURRENT_CAFSC")
      ) {
        return "NOTE_11_CURRENT_CAFSC";
      }

      return "DEFAULT";
    }

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
          matchedCode: cafsc,
          value: collection[cafsc]
        };
      }

      for (const [code, value] of Object.entries(collection)) {
        if (!code.includes("/")) continue;

        const prefixes = code
          .split("/")
          .map((item) => item.trim())
          .filter(Boolean);

        const matched = prefixes.some(
          (prefix) => cafsc.startsWith(prefix)
        );

        if (matched) {
          return {
            matchedCode: code,
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
      if (!cafsc) {
        return {
          found: false,
          cafsc: "",
          matchedCode: "",
          gradeBucket,
          title: "",
          rule: "DEFAULT",
          source: "NO_CAFSC"
        };
      }

      const bucket = AFSC_DB[gradeBucket];

      if (!bucket) {
        return {
          found: false,
          cafsc,
          matchedCode: "",
          gradeBucket,
          title: cafsc,
          rule: "DEFAULT",
          source: "NO_BUCKET"
        };
      }

      const pfeOnlyMatch =
        findDatabaseMatch(
          bucket.PFE_ONLY,
          cafsc
        );

      if (pfeOnlyMatch) {
        const title =
          typeof pfeOnlyMatch.value === "string"
            ? pfeOnlyMatch.value
            : pfeOnlyMatch.value?.title || cafsc;

        return {
          found: true,
          cafsc,
          matchedCode: pfeOnlyMatch.matchedCode,
          gradeBucket,
          title,
          rule: "PFE_ONLY",
          source: `${gradeBucket}.PFE_ONLY`
        };
      }

      const currentCAFSCMatch =
        findDatabaseMatch(
          bucket.NOTE_11_CURRENT_CAFSC,
          cafsc
        );

      if (currentCAFSCMatch) {
        const title =
          typeof currentCAFSCMatch.value === "string"
            ? currentCAFSCMatch.value
            : currentCAFSCMatch.value?.title || cafsc;

        return {
          found: true,
          cafsc,
          matchedCode: currentCAFSCMatch.matchedCode,
          gradeBucket,
          title,
          rule: "NOTE_11_CURRENT_CAFSC",
          source:
            `${gradeBucket}.NOTE_11_CURRENT_CAFSC`
        };
      }

      const riSdiMatch =
        findDatabaseMatch(
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
          cafsc,
          matchedCode: riSdiMatch.matchedCode,
          gradeBucket,
          title: item?.title || cafsc,
          rule: normalizeDatabaseRule(item?.rule),
          source: `${gradeBucket}.RI_SDI`
        };
      }

      return {
        found: false,
        cafsc,
        matchedCode: "",
        gradeBucket,
        title: cafsc,
        rule: "DEFAULT",
        source: "NO_EXCEPTION_MATCH"
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

      const fragment =
        document.createDocumentFragment();

      sorted.forEach(([code, title]) => {
        const option = document.createElement("option");

        option.value = code;
        option.label = `${code} — ${title}`;

        fragment.appendChild(option);
      });

      el.cafscCatalog.appendChild(fragment);
    }


    /* ========================================================
       8. EFFECTIVE TESTING PATH
    ======================================================== */

    function setTestingPathLock(locked) {
      state.pathLocked = locked;

      el.testingPathBoth.disabled = locked;
      el.testingPathPFEOnly.disabled = locked;

      el.testingPathControl.classList.toggle(
        "is-disabled",
        locked
      );

      el.testingPathControl.setAttribute(
        "aria-disabled",
        String(locked)
      );
    }

    function resolveEffectiveTestingPath({
      rule,
      supportedCycle
    }) {
      if (
        supportedCycle &&
        rule.rule === "PFE_ONLY"
      ) {
        setRadioValue(
          "testingPath",
          CONFIG.PATHS.PFE_ONLY
        );

        setTestingPathLock(true);

        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          source: CONFIG.PATH_SOURCES.CAFSC_PFE_ONLY,
          locked: true,
          label: "PFE Only",
          explanation:
            "The loaded cycle exception table identifies this CAFSC as PFE only."
        };
      }

      if (
        supportedCycle &&
        rule.rule === "NOTE_11_CURRENT_CAFSC"
      ) {
        setRadioValue(
          "testingPath",
          CONFIG.PATHS.BOTH
        );

        setTestingPathLock(true);

        return {
          mode: CONFIG.PATHS.BOTH,
          source:
            CONFIG.PATH_SOURCES.CAFSC_CURRENT_RULE,
          locked: true,
          label: "SKT + PFE",
          explanation:
            "The loaded current-CAFSC rule requires the SKT + PFE path."
        };
      }

      if (el.individualSktExemption.checked) {
        setRadioValue(
          "testingPath",
          CONFIG.PATHS.PFE_ONLY
        );

        setTestingPathLock(true);

        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          source:
            CONFIG.PATH_SOURCES.INDIVIDUAL_EXEMPTION,
          locked: true,
          label: "PFE Only",
          explanation:
            "The official member-specific SKT exemption is being applied."
        };
      }

      setTestingPathLock(false);

      const userPath =
        selectedRadioValue("testingPath") ||
        CONFIG.PATHS.BOTH;

      return {
        mode:
          userPath === CONFIG.PATHS.PFE_ONLY
            ? CONFIG.PATHS.PFE_ONLY
            : CONFIG.PATHS.BOTH,

        source: CONFIG.PATH_SOURCES.USER_SELECTION,
        locked: false,

        label:
          userPath === CONFIG.PATHS.PFE_ONLY
            ? "PFE Only"
            : "SKT + PFE",

        explanation:
          userPath === CONFIG.PATHS.PFE_ONLY
            ? "The PFE-only testing path was selected."
            : "The standard SKT + PFE testing path was selected."
      };
    }


    /* ========================================================
       9. EPB CALCULATION

       "none" and "bypass" do not consume an eligible weighted
       position. Remaining eligible reports shift forward.
    ======================================================== */

    function calculateEPB() {
      const selections = [
        el.epbCurrent.value,
        el.epbPrevious1.value,
        el.epbPrevious2.value
      ];

      let eligiblePositionIndex = 0;

      const entries = selections.map(
        (rating, originalIndex) => {
          const isBypassed =
            rating === "none" ||
            rating === "bypass";

          if (isBypassed) {
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
            CONFIG.EPB_POSITIONS[
              eligiblePositionIndex
            ];

          eligiblePositionIndex += 1;

          const table =
            CONFIG.EPB_POINTS[rating] ||
            CONFIG.EPB_POINTS.promote;

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
        CONFIG.MAXIMUMS.EPB,
        entries.reduce(
          (sum, entry) => sum + entry.points,
          0
        )
      );

      return {
        selections,
        entries,
        eligibleCount:
          entries.filter(
            (entry) => entry.eligible
          ).length,
        total
      };
    }


    /* ========================================================
       10. MINIMUM TEST REQUIREMENTS
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
          path: CONFIG.PATHS.PFE_ONLY,
          pfePass,
          sktPass: true,
          combinedPass: pfePass,
          allPassed: pfePass,
          combinedScore: truncate2(pfe * 2)
        };
      }

      const combinedScore = truncate2(pfe + skt);

      const pfePass =
        pfe >= CONFIG.MINIMUMS.STANDARD_PFE;

      const sktPass =
        skt >= CONFIG.MINIMUMS.STANDARD_SKT;

      const combinedPass =
        combinedScore >=
        CONFIG.MINIMUMS.STANDARD_COMBINED;

      return {
        path: CONFIG.PATHS.BOTH,
        pfePass,
        sktPass,
        combinedPass,
        allPassed:
          pfePass &&
          sktPass &&
          combinedPass,
        combinedScore
      };
    }


    /* ========================================================
       11. MASTER CALCULATION
    ======================================================== */

    function calculateSnapshot() {
      const promotionGrade = getPromotionGrade();
      const gradeBucket = getGradeBucket();

      const promotionCycle =
        el.promotionCycle.value;

      const cycleLabel = getCycleLabel();

      const supportedCycle =
        isSupportedCycle(
          gradeBucket,
          promotionCycle
        );

      const cafsc =
        normalizeCAFSC(
          el.cafscInput.value
        );

      const afscRule =
        resolveAFSCRule({
          gradeBucket,
          cafsc
        });

      const path =
        resolveEffectiveTestingPath({
          rule: afscRule,
          supportedCycle
        });

      const pfe =
        readScore(
          el.pfeScore,
          CONFIG.MAXIMUMS.PFE
        );

      const skt =
        readScore(
          el.sktScore,
          CONFIG.MAXIMUMS.SKT
        );

      const epb = calculateEPB();
      const decorations = readDecorations();

      const testingComponent =
        path.mode === CONFIG.PATHS.PFE_ONLY
          ? truncate2(pfe * 2)
          : truncate2(pfe + skt);

      const totalScore =
        truncate2(
          Math.min(
            CONFIG.MAXIMUMS.TOTAL,
            testingComponent +
              epb.total +
              decorations
          )
        );

      const scorePercentage =
        percentage(
          totalScore,
          CONFIG.MAXIMUMS.TOTAL
        );

      const minimums =
        calculateMinimums({
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
              totalScore -
              historicalCutoff
            );

      return {
        version: VERSION,

        promotion: {
          grade: promotionGrade,
          gradeLabel:
            getPromotionGradeLabel(),
          gradeBucket,
          cycle: promotionCycle,
          cycleLabel,
          supportedCycle,
          cafsc,
          afscRule
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
          epb: epb.total,
          decorations,
          totalScore,
          scorePercentage
        },

        epb,

        minimums,

        cutoff: {
          value: historicalCutoff,
          source:
            el.cutoffSource.value.trim(),
          difference: cutoffDifference
        }
      };
    }


    /* ========================================================
       12. AFSC STATUS RENDERING
    ======================================================== */

    function renderCAFSCStatus(snapshot) {
      const {
        cafsc,
        supportedCycle,
        afscRule
      } = snapshot.promotion;

      el.cafscInput.value = cafsc;
      el.cafscClearButton.hidden = !cafsc;

      if (!cafsc) {
        el.cafscStatus.dataset.status = "neutral";

        el.cafscStatus.textContent =
          "Optional CAFSC verification.";

        return;
      }

      if (!supportedCycle) {
        el.cafscStatus.dataset.status = "warning";

        el.cafscStatus.textContent =
          "Custom cycle selected. Verify the testing path against the applicable official promotion references.";

        return;
      }

      if (afscRule.rule === "PFE_ONLY") {
        el.cafscStatus.dataset.status = "valid";

        el.cafscStatus.textContent =
          `${afscRule.title} — PFE-only exception matched.`;

        return;
      }

      if (
        afscRule.rule ===
        "NOTE_11_CURRENT_CAFSC"
      ) {
        el.cafscStatus.dataset.status = "valid";

        el.cafscStatus.textContent =
          `${afscRule.title} — current-CAFSC SKT + PFE rule matched.`;

        return;
      }

      el.cafscStatus.dataset.status = "neutral";

      el.cafscStatus.textContent =
        "No exception matched. Your selected testing type remains in use.";
    }


    /* ========================================================
       13. TESTING-PATH RENDERING
    ======================================================== */

    function renderTestingPath(snapshot) {
      const usesPFEOnly =
        snapshot.path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      el.root.dataset.testingPath =
        usesPFEOnly
          ? "pfe-only"
          : "both";

      if (usesPFEOnly) {
        el.sktScore.disabled = true;
        el.sktRange.disabled = true;
      } else {
        el.sktScore.disabled = false;
        el.sktRange.disabled = false;
      }

      setRangeFill(el.pfeRange);
      setRangeFill(el.sktRange);
    }


    /* ========================================================
       14. TESTING-MINIMUM RENDERING
    ======================================================== */

    function renderMinimums(snapshot) {
      const {
        path,
        minimums,
        scores
      } = snapshot;

      const usesPFEOnly =
        path.mode === CONFIG.PATHS.PFE_ONLY;

      if (usesPFEOnly) {
        el.pfeScoreFeedback.dataset.status =
          minimums.pfePass
            ? "pass"
            : "fail";

        el.pfeScoreFeedback.textContent =
          minimums.pfePass
            ? `PFE-only minimum met: ${format2(scores.pfe)} of at least 45.00.`
            : `PFE-only minimum not met: ${format2(scores.pfe)} of at least 45.00.`;

        el.testingMinimumNotice.dataset.status =
          minimums.allPassed
            ? "pass"
            : "fail";

        el.testingMinimumTitle.textContent =
          minimums.allPassed
            ? "Minimum test requirement met"
            : "Minimum test requirement not met";

        el.testingMinimumText.textContent =
          minimums.allPassed
            ? `The PFE score is at least 45.00. The testing component is ${format2(scores.testingComponent)} out of 200.`
            : "The PFE score must be at least 45.00 for the PFE-only path.";

        return;
      }

      el.pfeScoreFeedback.dataset.status =
        minimums.pfePass
          ? "pass"
          : "fail";

      el.pfeScoreFeedback.textContent =
        minimums.pfePass
          ? `PFE minimum met: ${format2(scores.pfe)} of at least 40.00.`
          : `PFE minimum not met: ${format2(scores.pfe)} of at least 40.00.`;

      el.sktScoreFeedback.dataset.status =
        minimums.sktPass
          ? "pass"
          : "fail";

      el.sktScoreFeedback.textContent =
        minimums.sktPass
          ? `SKT minimum met: ${format2(scores.rawSKT)} of at least 40.00.`
          : `SKT minimum not met: ${format2(scores.rawSKT)} of at least 40.00.`;

      el.testingMinimumNotice.dataset.status =
        minimums.allPassed
          ? "pass"
          : "fail";

      el.testingMinimumTitle.textContent =
        minimums.allPassed
          ? "Minimum test requirements met"
          : "Minimum test requirements not met";

      if (minimums.allPassed) {
        el.testingMinimumText.textContent =
          `PFE and SKT are each at least 40.00, and the combined score is ${format2(minimums.combinedScore)}.`;

        return;
      }

      const issues = [];

      if (!minimums.pfePass) {
        issues.push("PFE must be at least 40.00");
      }

      if (!minimums.sktPass) {
        issues.push("SKT must be at least 40.00");
      }

      if (!minimums.combinedPass) {
        issues.push(
          "combined testing score must be at least 90.00"
        );
      }

      el.testingMinimumText.textContent =
        `${issues.join("; ")}.`;
    }


    /* ========================================================
       15. EPB RENDERING
    ======================================================== */

    function renderEPB(snapshot) {
      const entries = snapshot.epb.entries;

      el.epbCurrentPoints.textContent =
        String(entries[0]?.points || 0);

      el.epbPrevious1Points.textContent =
        String(entries[1]?.points || 0);

      el.epbPrevious2Points.textContent =
        String(entries[2]?.points || 0);

      el.epbComponentValue.textContent =
        String(snapshot.scores.epb);

      el.epbBreakdownValue.textContent =
        String(snapshot.scores.epb);

      setProgress(
        el.epbProgressBar,
        snapshot.scores.epb,
        CONFIG.MAXIMUMS.EPB
      );
    }


    /* ========================================================
       16. SCORE AND BREAKDOWN RENDERING
    ======================================================== */

    function renderScore(snapshot) {
      const {
        path,
        scores,
        minimums
      } = snapshot;

      const usesPFEOnly =
        path.mode === CONFIG.PATHS.PFE_ONLY;

      el.wapsTotalScore.textContent =
        format2(scores.totalScore);

      el.testingComponentValue.textContent =
        format2(scores.testingComponent);

      el.decorationComponentValue.textContent =
        String(scores.decorations);

      el.totalComponentValue.textContent =
        format2(scores.totalScore);

      el.wapsScoreRing.style.setProperty(
        "--score-percent",
        String(scores.scorePercentage)
      );

      if (usesPFEOnly) {
        el.pfeBreakdownLabel.textContent =
          "PFE Score (×2)";

        el.pfeBreakdownValue.textContent =
          `${format2(scores.pfe)} × 2`;

        el.pfeBreakdownMaximum.textContent =
          `= ${format2(scores.testingComponent)}`;
      } else {
        el.pfeBreakdownLabel.textContent =
          "PFE Score";

        el.pfeBreakdownValue.textContent =
          format2(scores.pfe);

        el.pfeBreakdownMaximum.textContent =
          "/ 100";

        el.sktBreakdownValue.textContent =
          format2(scores.rawSKT);

        el.sktBreakdownMaximum.textContent =
          "/ 100";

        setProgress(
          el.sktProgressBar,
          scores.rawSKT,
          CONFIG.MAXIMUMS.SKT
        );
      }

      setProgress(
        el.pfeProgressBar,
        scores.pfe,
        CONFIG.MAXIMUMS.PFE
      );

      el.decorationsBreakdownValue.textContent =
        String(scores.decorations);

      setProgress(
        el.decorationsProgressBar,
        scores.decorations,
        CONFIG.MAXIMUMS.DECORATIONS
      );

      if (minimums.allPassed) {
        el.overallScoreStatus.dataset.status =
          "pass";

        el.overallScoreStatusTitle.textContent =
          "Minimum test requirements met";

        el.overallScoreStatusText.textContent =
          usesPFEOnly
            ? "Your PFE score meets the displayed minimum for the PFE-only testing path."
            : "Your PFE, SKT and combined testing scores meet the displayed minimum requirements.";
      } else {
        el.overallScoreStatus.dataset.status =
          "fail";

        el.overallScoreStatusTitle.textContent =
          "Minimum test requirements not met";

        el.overallScoreStatusText.textContent =
          usesPFEOnly
            ? "The PFE score must be at least 45.00 for the PFE-only testing path."
            : "PFE and SKT must each be at least 40.00, with a combined score of at least 90.00.";
      }
    }


    /* ========================================================
       17. MEANING TEXT
    ======================================================== */

    function renderMeaning(snapshot) {
      const {
        path,
        scores,
        minimums,
        cutoff
      } = snapshot;

      const scoreText =
        `Your estimated WAPS score is ${format2(scores.totalScore)} out of ${CONFIG.MAXIMUMS.TOTAL}.`;

      const pathText =
        path.mode === CONFIG.PATHS.PFE_ONLY
          ? ` The PFE-only testing component is ${format2(scores.pfe)} multiplied by two.`
          : ` The SKT + PFE testing component is ${format2(scores.testingComponent)} out of 200.`;

      const minimumText =
        minimums.allPassed
          ? " The displayed minimum testing requirements are met."
          : " One or more displayed minimum testing requirements are not met.";

      const officialText =
        " Official selection depends on the promotion AFSC, quota, cycle cutoff and official Air Force personnel data.";

      let cutoffText = "";

      if (cutoff.value !== null) {
        if (cutoff.difference > 0) {
          cutoffText =
            ` The score is ${format2(cutoff.difference)} points above the entered comparison cutoff.`;
        } else if (cutoff.difference < 0) {
          cutoffText =
            ` The score is ${format2(Math.abs(cutoff.difference))} points below the entered comparison cutoff.`;
        } else {
          cutoffText =
            " The score matches the entered comparison cutoff.";
        }
      }

      el.wapsMeaningText.textContent =
        scoreText +
        pathText +
        minimumText +
        cutoffText +
        officialText;
    }


    /* ========================================================
       18. CUTOFF COMPARISON
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
          "Enter a verified cutoff to compare it with the estimate.";

        return;
      }

      const sourceText = source
        ? ` Source: ${source}.`
        : "";

      if (difference > 0) {
        el.cutoffComparisonResult.dataset.status =
          "above";

        el.cutoffComparisonResult.textContent =
          `The estimated score is ${formatSigned2(difference)} points above the entered cutoff of ${format2(value)}.${sourceText}`;

        return;
      }

      if (difference < 0) {
        el.cutoffComparisonResult.dataset.status =
          "below";

        el.cutoffComparisonResult.textContent =
          `The estimated score is ${formatSigned2(difference)} points below the entered cutoff of ${format2(value)}.${sourceText}`;

        return;
      }

      el.cutoffComparisonResult.dataset.status =
        "match";

      el.cutoffComparisonResult.textContent =
        `The estimated score matches the entered cutoff of ${format2(value)}.${sourceText}`;
    }


    /* ========================================================
       19. MASTER RENDER
    ======================================================== */

    function render(snapshot) {
      state.snapshot = snapshot;

      renderCAFSCStatus(snapshot);
      renderTestingPath(snapshot);
      renderMinimums(snapshot);
      renderEPB(snapshot);
      renderScore(snapshot);
      renderMeaning(snapshot);
      renderCutoff(snapshot);

      el.root.dataset.ready = "true";

      window.dispatchEvent(
        new CustomEvent(
          "thewing:waps-updated",
          {
            detail: deepClone(snapshot)
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
          "[THEWING_WAPS] Calculation failed:",
          error
        );

        el.overallScoreStatus.dataset.status =
          "fail";

        el.overallScoreStatusTitle.textContent =
          "Calculation unavailable";

        el.overallScoreStatusText.textContent =
          "The calculator could not process the current inputs.";

        return null;
      }
    }


    /* ========================================================
       20. SCORE INPUT SYNCHRONIZATION
    ======================================================== */

    function bindScorePair({
      numberInput,
      rangeInput,
      maximum
    }) {
      rangeInput.addEventListener(
        "input",
        () => {
          const value =
            truncate2(
              clamp(
                rangeInput.value,
                0,
                maximum
              )
            );

          numberInput.value =
            format2(value);

          setRangeFill(rangeInput);
          recompute();
        }
      );

      numberInput.addEventListener(
        "input",
        () => {
          if (numberInput.value === "") {
            rangeInput.value = "0";
            setRangeFill(rangeInput);
            recompute();
            return;
          }

          const value =
            truncate2(
              clamp(
                numberInput.value,
                0,
                maximum
              )
            );

          rangeInput.value =
            String(value);

          setRangeFill(rangeInput);
          recompute();
        }
      );

      numberInput.addEventListener(
        "blur",
        () => {
          const value =
            truncate2(
              clamp(
                numberInput.value,
                0,
                maximum
              )
            );

          numberInput.value =
            format2(value);

          rangeInput.value =
            String(value);

          setRangeFill(rangeInput);
          recompute();
        }
      );
    }


    /* ========================================================
       21. GRADE AND CYCLE SYNCHRONIZATION
    ======================================================== */

    function synchronizeCycleFromGrade() {
      if (state.gradeCycleSyncing) return;

      state.gradeCycleSyncing = true;

      el.promotionCycle.value =
        getPromotionGrade() === "tsgt"
          ? "26e6"
          : "26e5";

      populateCAFSCDataList();

      state.gradeCycleSyncing = false;
      recompute();
    }

    function synchronizeGradeFromCycle() {
      if (state.gradeCycleSyncing) return;

      state.gradeCycleSyncing = true;

      if (el.promotionCycle.value === "26e5") {
        el.promoGradeSSgt.checked = true;
      }

      if (el.promotionCycle.value === "26e6") {
        el.promoGradeTSgt.checked = true;
      }

      populateCAFSCDataList();

      state.gradeCycleSyncing = false;
      recompute();
    }


    /* ========================================================
       22. RESET
    ======================================================== */

    function resetCalculator({
      announceReset = true
    } = {}) {
      const defaults = CONFIG.DEFAULTS;

      setRadioValue(
        "promoGrade",
        defaults.PROMOTION_GRADE
      );

      setRadioValue(
        "testingPath",
        defaults.TESTING_PATH
      );

      el.promotionCycle.value =
        defaults.PROMOTION_CYCLE;

      el.cafscInput.value =
        defaults.CAFSC;

      el.individualSktExemption.checked =
        defaults.INDIVIDUAL_EXEMPTION;

      el.pfeScore.value =
        format2(defaults.PFE);

      el.pfeRange.value =
        String(defaults.PFE);

      el.sktScore.value =
        format2(defaults.SKT);

      el.sktRange.value =
        String(defaults.SKT);

      el.epbCurrent.value =
        defaults.EPB_CURRENT;

      el.epbPrevious1.value =
        defaults.EPB_SECOND;

      el.epbPrevious2.value =
        defaults.EPB_THIRD;

      el.decorationPoints.value =
        String(defaults.DECORATIONS);

      el.historicalCutoff.value =
        defaults.HISTORICAL_CUTOFF;

      el.cutoffSource.value =
        defaults.CUTOFF_SOURCE;

      if (el.advancedOptions) {
        el.advancedOptions.open = false;
      }

      setTestingPathLock(false);
      populateCAFSCDataList();

      setRangeFill(el.pfeRange);
      setRangeFill(el.sktRange);

      recompute();

      if (announceReset) {
        announce(
          "WAPS calculator reset to default values."
        );
      }
    }


    /* ========================================================
       23. COPY SCORE SUMMARY
    ======================================================== */

    function buildScoreSummary(snapshot) {
      const lines = [
        "TheWing.ai WAPS Calculator",
        "--------------------------------",
        `Promotion to: ${snapshot.promotion.gradeLabel}`,
        `Promotion cycle: ${snapshot.promotion.cycleLabel}`,
        `Testing type: ${snapshot.path.label}`,
        `CAFSC on PECD: ${snapshot.promotion.cafsc || "Not entered"}`,
        "",
        `PFE score: ${format2(snapshot.scores.pfe)}`,
        `SKT score: ${
          snapshot.path.mode === CONFIG.PATHS.PFE_ONLY
            ? "Not included"
            : format2(snapshot.scores.rawSKT)
        }`,
        `Testing component: ${format2(snapshot.scores.testingComponent)} / 200`,
        `EPB promotion recommendation score: ${snapshot.scores.epb} / 285`,
        `Decoration points: ${snapshot.scores.decorations} / 25`,
        "",
        `Estimated WAPS score: ${format2(snapshot.scores.totalScore)} / 510`,
        `Minimum test requirements: ${
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
        "Unofficial estimate only. Official eligibility, scores, promotion AFSC, quotas, cutoffs and selection status are determined by the Air Force and AFPC."
      );

      return lines.join("\n");
    }

    async function writeClipboard(text) {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function" &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const fallback =
        document.createElement("textarea");

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

      const copied =
        document.execCommand("copy");

      fallback.remove();

      if (!copied) {
        throw new Error(
          "Clipboard access is unavailable."
        );
      }
    }

    async function copyResults() {
      const snapshot =
        state.snapshot || recompute();

      if (!snapshot) return;

      const normalLabel =
        "Copy Score Summary";

      try {
        await writeClipboard(
          buildScoreSummary(snapshot)
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
              normalLabel;
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
            normalLabel;
        }, 1800);
      }
    }


    /* ========================================================
       24. HELP DIALOG
    ======================================================== */

    function openHelp(topicName = "general") {
      const topic =
        HELP_TOPICS[topicName] ||
        HELP_TOPICS.general;

      state.activeHelpTopic =
        HELP_TOPICS[topicName]
          ? topicName
          : "general";

      el.helpDialogTitle.textContent =
        topic.title;

      el.helpContent.innerHTML =
        topic.html;

      if (
        typeof el.helpDialog.showModal ===
        "function"
      ) {
        if (!el.helpDialog.open) {
          el.helpDialog.showModal();
        }
      } else {
        el.helpDialog.setAttribute("open", "");
      }
    }

    function closeHelp() {
      if (
        typeof el.helpDialog.close ===
        "function"
      ) {
        if (el.helpDialog.open) {
          el.helpDialog.close();
        }
      } else {
        el.helpDialog.removeAttribute("open");
      }
    }


    /* ========================================================
       25. EVENT BINDINGS
    ======================================================== */

    function bindEvents() {
      el.form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
        }
      );

      bindScorePair({
        numberInput: el.pfeScore,
        rangeInput: el.pfeRange,
        maximum: CONFIG.MAXIMUMS.PFE
      });

      bindScorePair({
        numberInput: el.sktScore,
        rangeInput: el.sktRange,
        maximum: CONFIG.MAXIMUMS.SKT
      });

      [
        el.promoGradeSSgt,
        el.promoGradeTSgt
      ].forEach((radio) => {
        radio.addEventListener(
          "change",
          synchronizeCycleFromGrade
        );
      });

      [
        el.testingPathBoth,
        el.testingPathPFEOnly
      ].forEach((radio) => {
        radio.addEventListener(
          "change",
          recompute
        );
      });

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

      el.decorationPoints.addEventListener(
        "input",
        recompute
      );

      el.decorationPoints.addEventListener(
        "blur",
        () => {
          const points = readDecorations();

          el.decorationPoints.value =
            String(points);

          recompute();
        }
      );

      el.promotionCycle.addEventListener(
        "change",
        synchronizeGradeFromCycle
      );

      el.cafscInput.addEventListener(
        "input",
        () => {
          const normalized =
            normalizeCAFSC(
              el.cafscInput.value
            );

          if (
            el.cafscInput.value !==
            normalized
          ) {
            el.cafscInput.value =
              normalized;
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
          el.cafscClearButton.hidden = true;

          el.cafscInput.focus();
          recompute();
        }
      );

      el.individualSktExemption.addEventListener(
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

      el.openHelpButton.addEventListener(
        "click",
        () => {
          openHelp("general");
        }
      );

      el.testingPathHelpButton.addEventListener(
        "click",
        () => {
          openHelp("testing-type");
        }
      );

      root
        .querySelectorAll("[data-help-topic]")
        .forEach((button) => {
          if (button === el.testingPathHelpButton) {
            return;
          }

          button.addEventListener(
            "click",
            () => {
              openHelp(
                button.dataset.helpTopic ||
                "general"
              );
            }
          );
        });

      el.closeHelpButton.addEventListener(
        "click",
        closeHelp
      );

      el.helpDialogDoneButton.addEventListener(
        "click",
        closeHelp
      );

      el.helpDialog.addEventListener(
        "click",
        (event) => {
          if (
            event.target === el.helpDialog
          ) {
            closeHelp();
          }
        }
      );
    }


    /* ========================================================
       26. PUBLIC API
    ======================================================== */

    const api = {
      __mounted_v200: true,

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

      setPromotionGrade(grade) {
        const normalized =
          String(grade || "")
            .trim()
            .toLowerCase();

        setRadioValue(
          "promoGrade",
          normalized === "tsgt" ||
          normalized === "e6"
            ? "tsgt"
            : "ssgt"
        );

        synchronizeCycleFromGrade();

        return this.getState();
      },

      setTestingPath(path) {
        const normalized =
          String(path || "")
            .trim()
            .toLowerCase();

        setRadioValue(
          "testingPath",
          normalized === "pfe-only" ||
          normalized === "pfe_only" ||
          normalized === "pfe"
            ? "pfe-only"
            : "both"
        );

        recompute();

        return this.getState();
      },

      setScores({
        pfe,
        skt
      } = {}) {
        if (pfe !== undefined) {
          const pfeValue =
            truncate2(
              clamp(
                pfe,
                0,
                CONFIG.MAXIMUMS.PFE
              )
            );

          el.pfeScore.value =
            format2(pfeValue);

          el.pfeRange.value =
            String(pfeValue);

          setRangeFill(el.pfeRange);
        }

        if (skt !== undefined) {
          const sktValue =
            truncate2(
              clamp(
                skt,
                0,
                CONFIG.MAXIMUMS.SKT
              )
            );

          el.sktScore.value =
            format2(sktValue);

          el.sktRange.value =
            String(sktValue);

          setRangeFill(el.sktRange);
        }

        recompute();

        return this.getState();
      },

      setCAFSC(cafsc) {
        el.cafscInput.value =
          normalizeCAFSC(cafsc);

        recompute();

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
          normalizedGrade === "E5" ||
          normalizedGrade === "SSGT"
        ) {
          gradeBucket = "E5";
        }

        if (
          normalizedGrade === "E6" ||
          normalizedGrade === "TSGT"
        ) {
          gradeBucket = "E6";
        }

        return resolveAFSCRule({
          gradeBucket,
          cafsc:
            normalizeCAFSC(
              cafsc ??
              el.cafscInput.value
            )
        });
      },

      openHelp(topic = "general") {
        openHelp(topic);
      },

      closeHelp,

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

    setRangeFill(el.pfeRange);
    setRangeFill(el.sktRange);

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
