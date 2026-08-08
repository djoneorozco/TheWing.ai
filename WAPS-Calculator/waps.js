/* ============================================================
   THEWING.AI • AIR FORCE WAPS CALCULATOR
   WAPS.JS
   AFSC-FIRST AURA INTERFACE
   Version 2.2.0

   FILE PAIRING
   - index.html v2.2.0
   - waps.css v2.2.0

   PRIMARY FLOW
   1. User selects CAFSC on the PECD
   2. Catalog record determines:
      - 26E5 or 26E6
      - Promotion to SSgt or TSgt
      - SKT + PFE or PFE-only path
   3. Required score inputs appear automatically
   4. EPB and decoration inputs complete the estimate

   CATALOG BASIS
   - Official 2026 E5 WAPS Catalog, Section IIA
   - Official 2026 E6 WAPS Catalog, Sections IIA and IIB

   SCORING MODEL
   - PFE maximum: 100
   - SKT maximum: 100
   - Testing maximum: 200
   - EPB/PRS maximum: 285
   - Decoration maximum: 25
   - Total maximum: 510

   MINIMUM TESTING REQUIREMENTS
   SKT + PFE:
   - PFE: 40.00 minimum
   - SKT: 40.00 minimum
   - Combined: 90.00 minimum

   PFE Only:
   - PFE: 45.00 minimum
   - Testing points: PFE × 2

   IMPORTANT
   - Test scores are truncated to two decimal places.
   - This calculator is an unofficial estimate.
============================================================ */

(() => {
  "use strict";

  const VERSION = "2.2.0";
  const MOUNT_KEY = "__THEWING_WAPS_V220_MOUNTED__";

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

    RULES: Object.freeze({
      STANDARD: "STANDARD",
      PFE_ONLY: "PFE_ONLY",
      NOTE_11_CURRENT_CAFSC: "NOTE_11_CURRENT_CAFSC",
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
      PFE: 74,
      SKT: 68,

      EPB_CURRENT: "must-promote",
      EPB_SECOND: "promote",
      EPB_THIRD: "promote",

      DECORATIONS: 0,
      INDIVIDUAL_EXEMPTION: false,

      HISTORICAL_CUTOFF: "",
      CUTOFF_SOURCE: ""
    })
  });



  /* ==========================================================
     1B. DECORATION POINT VALUES
     Source: AFI 36-2502, Table 2.4 (Decorations factor)
     Maximum WAPS decoration credit: 25
  ========================================================== */

  const DECORATION_QUANTITY_MAX = 99;

  const DECORATION_DEFINITIONS = Object.freeze([
    Object.freeze({
      key: "msm",
      id: "decorationMsm",
      label: "Meritorious Service Medal",
      pointsEach: 5,
      group: "common"
    }),
    Object.freeze({
      key: "commendation",
      id: "decorationCommendation",
      label: "Air Force Commendation Medal",
      pointsEach: 3,
      group: "common"
    }),
    Object.freeze({
      key: "achievement",
      id: "decorationAchievement",
      label: "Air Force Achievement Medal",
      pointsEach: 1,
      group: "common"
    }),
    Object.freeze({
      key: "airMedal",
      id: "decorationAirMedal",
      label: "Air Medal",
      pointsEach: 3,
      group: "common"
    }),
    Object.freeze({
      key: "bronzeStar",
      id: "decorationBronzeStar",
      label: "Bronze Star Medal",
      pointsEach: 5,
      group: "common"
    }),
    Object.freeze({
      key: "purpleHeart",
      id: "decorationPurpleHeart",
      label: "Purple Heart",
      pointsEach: 5,
      group: "common"
    }),
    Object.freeze({
      key: "medalOfHonor",
      id: "decorationMedalOfHonor",
      label: "Medal of Honor",
      pointsEach: 15,
      group: "additional"
    }),
    Object.freeze({
      key: "airForceCross",
      id: "decorationAirForceCross",
      label: "Air Force Cross",
      pointsEach: 11,
      group: "additional"
    }),
    Object.freeze({
      key: "navyCross",
      id: "decorationNavyCross",
      label: "Navy Cross",
      pointsEach: 11,
      group: "additional"
    }),
    Object.freeze({
      key: "distinguishedServiceCross",
      id: "decorationDistinguishedServiceCross",
      label: "Distinguished Service Cross",
      pointsEach: 11,
      group: "additional"
    }),
    Object.freeze({
      key: "defenseDsm",
      id: "decorationDefenseDsm",
      label: "Defense Distinguished Service Medal",
      pointsEach: 9,
      group: "additional"
    }),
    Object.freeze({
      key: "dsm",
      id: "decorationDsm",
      label: "Distinguished Service Medal",
      pointsEach: 9,
      group: "additional"
    }),
    Object.freeze({
      key: "silverStar",
      id: "decorationSilverStar",
      label: "Silver Star",
      pointsEach: 9,
      group: "additional"
    }),
    Object.freeze({
      key: "legionOfMerit",
      id: "decorationLegionOfMerit",
      label: "Legion of Merit",
      pointsEach: 7,
      group: "additional"
    }),
    Object.freeze({
      key: "dssm",
      id: "decorationDssm",
      label: "Defense Superior Service Medal",
      pointsEach: 7,
      group: "additional"
    }),
    Object.freeze({
      key: "dfc",
      id: "decorationDfc",
      label: "Distinguished Flying Cross",
      pointsEach: 7,
      group: "additional"
    }),
    Object.freeze({
      key: "defenseMsm",
      id: "decorationDefenseMsm",
      label: "Defense Meritorious Service Medal",
      pointsEach: 5,
      group: "additional"
    }),
    Object.freeze({
      key: "aerialAchievement",
      id: "decorationAerialAchievement",
      label: "Aerial Achievement Medal",
      pointsEach: 3,
      group: "additional"
    }),
    Object.freeze({
      key: "armyCommendation",
      id: "decorationArmyCommendation",
      label: "Army Commendation Medal",
      pointsEach: 3,
      group: "additional"
    }),
    Object.freeze({
      key: "navyCommendation",
      id: "decorationNavyCommendation",
      label: "Navy-Marine Corps Commendation Medal",
      pointsEach: 3,
      group: "additional"
    }),
    Object.freeze({
      key: "jointCommendation",
      id: "decorationJointCommendation",
      label: "Joint Service Commendation Medal",
      pointsEach: 3,
      group: "additional"
    }),
    Object.freeze({
      key: "coastGuardCommendation",
      id: "decorationCoastGuardCommendation",
      label: "Coast Guard Commendation Medal",
      pointsEach: 3,
      group: "additional"
    }),
    Object.freeze({
      key: "navyAchievement",
      id: "decorationNavyAchievement",
      label: "Navy-Marine Corps Achievement Medal",
      pointsEach: 1,
      group: "additional"
    }),
    Object.freeze({
      key: "coastGuardAchievement",
      id: "decorationCoastGuardAchievement",
      label: "Coast Guard Achievement Medal",
      pointsEach: 1,
      group: "additional"
    }),
    Object.freeze({
      key: "armyAchievement",
      id: "decorationArmyAchievement",
      label: "Army Achievement Medal",
      pointsEach: 1,
      group: "additional"
    }),
    Object.freeze({
      key: "jointAchievement",
      id: "decorationJointAchievement",
      label: "Joint Service Achievement Medal",
      pointsEach: 1,
      group: "additional"
    })
  ]);

  const DECORATION_POINT_VALUES = Object.freeze(
    Object.fromEntries(
      DECORATION_DEFINITIONS.map((item) => [
        item.key,
        item.pointsEach
      ])
    )
  );

  const DECORATION_BY_KEY = Object.freeze(
    Object.fromEntries(
      DECORATION_DEFINITIONS.map((item) => [
        item.key,
        item
      ])
    )
  );


  /* ==========================================================
     2. COMPACT CATALOG CONSTANTS
  ========================================================== */

  const BOTH = "B";
  const PFE_ONLY = "P";
  const NOTE_11 = "N";


  /* ==========================================================
     3. OFFICIAL 2026 E5 SECTION IIA CATALOG

     Row format:
     [AFSC, title]
     [AFSC, title, "P"] = PFE only
  ========================================================== */

  const E5_SECTION_IIA = [
    ["1A152", "Mobility Force Aviator Journeyman (Includes all shreds)"],
    ["1A153", "Special Mission Aviator Journeyman (Includes all shreds)"],
    ["1A154", "Multi-domain Operations Aviator Journeyman (Includes all shreds)", PFE_ONLY],
    ["1A158", "Executive Mission Aviator Journeyman (Includes all shreds)"],
    ["1A851", "Airborne Cryptologic Language Analyst Journeyman (Includes all shreds)", PFE_ONLY],
    ["1A852", "Airborne Intelligence, Surveillance, and Reconnaissance (ISR) Operator Journeyman", PFE_ONLY],
    ["1B451", "Cyber Warfare Operations Journeyman", PFE_ONLY],
    ["1C052", "Aviation Resource Management Journeyman"],
    ["1C151", "Air Traffic Control Journeyman"],
    ["1C351", "All Domain Command and Control Operations Journeyman", PFE_ONLY],
    ["1C551", "Battle Management Operations Journeyman (Includes D shred)"],
    ["1C651", "Space Systems Operations Journeyman (Transferred to USSF and USAFR)", PFE_ONLY],
    ["1C751", "Airfield Management Journeyman"],
    ["1C853", "Radar, Airfield, and Weather Systems (RAWS) Journeyman"],
    ["1D751", "Cyber Defense Operations Journeyman (Includes all shreds)", PFE_ONLY],
    ["1D752", "Spectrum Defense Operations Journeyman (Includes all shreds)", PFE_ONLY],
    ["1D753", "Cable and Antenna Defense Operations Journeyman (Includes all shreds)", PFE_ONLY],
    ["1D754", "Data Engineering (Includes all shreds)", PFE_ONLY],
    ["1D755", "Cybersecurity", PFE_ONLY],
    ["1H051", "Aerospace Physiology Journeyman"],
    ["1N051", "All Source Intelligence Analyst Journeyman", PFE_ONLY],
    ["1N151", "Geospatial Intelligence (GEOINT) Journeyman (Includes all shreds)", PFE_ONLY],
    ["1N251", "Signals Intelligence Analyst Journeyman (Includes A and C shreds)", PFE_ONLY],
    ["1N351", "Cryptologic Language Analyst Journeyman (Includes all shreds)", PFE_ONLY],
    ["1N451", "Cyber Intelligence Analyst Journeyman (Includes all shreds)", PFE_ONLY],
    ["1N452", "Cryptologic Language Analyst and Reporter Journeyman", PFE_ONLY],
    ["1N751", "Human Intelligence Specialist Journeyman", PFE_ONLY],
    ["1N851", "Targeting Analyst Journeyman", PFE_ONLY],
    ["1P051A", "Aircrew Flight Equipment Journeyman (Ejection Aircraft)"],
    ["1P051B", "Aircrew Flight Equipment Journeyman (Non-Ejection Aircraft)"],
    ["1S051", "Safety Journeyman", PFE_ONLY],
    ["1T051", "Survival, Evasion, Resistance, and Escape (SERE) Journeyman"],
    ["1U151", "Remotely Piloted Aircraft (RPA) Pilot Journeyman (Includes all shreds)", PFE_ONLY],
    ["1W051", "Weather Journeyman"],
    ["1Z151", "Pararescue Journeyman"],
    ["1Z251", "Combat Control Journeyman"],
    ["1Z351", "Tactical Air Control Party (TACP) Journeyman"],
    ["1Z451", "Special Reconnaissance Journeyman"],
    ["2A051", "Avionics Test Station, Components, and Electronic Warfare Systems Journeyman"],
    ["2A353", "Tactical Aircraft Maintenance Journeyman (Includes all shreds)"],
    ["2A354", "Fighter Aircraft Integrated Avionics Journeyman (Includes all shreds)"],
    ["2A355", "Advanced Fighter Aircraft Integrated Avionics Journeyman (Includes all shreds)"],
    ["2A357", "Tactical Aircraft Maintenance (5th Generation) Journeyman (Includes A and B shreds)"],
    ["2A551", "Airlift/Special Mission Aircraft Maintenance Journeyman (Includes all shreds)", PFE_ONLY],
    ["2A552", "Helicopter/Tiltrotor Aircraft Maintenance Journeyman (Includes all shreds)"],
    ["2A554", "Refuel/Bomber Aircraft Maintenance Journeyman (Includes all shreds)"],
    ["2A651C", "Aerospace Propulsion Journeyman (Airlift, Special Mission, and B-52 aircraft engines)"],
    ["2A651F", "Aerospace Propulsion Journeyman (Fighter and bomber aircraft jet engines)"],
    ["2A651H", "Aerospace Propulsion Journeyman (Turboprop and turboshaft engines)"],
    ["2A652", "Aerospace Ground Equipment Journeyman"],
    ["2A653", "Aircrew Egress Systems Journeyman"],
    ["2A654", "Aircraft Fuel Systems Journeyman"],
    ["2A655", "Aircraft Hydraulic Systems Journeyman"],
    ["2A656", "Aircraft Electrical and Environmental Systems Journeyman"],
    ["2A751", "Aircraft Metals Technology Journeyman"],
    ["2A752", "Nondestructive Inspection Journeyman"],
    ["2A753", "Aircraft Structural Maintenance Journeyman", PFE_ONLY],
    ["2A954", "Heavy Aircraft Integrated Avionics Journeyman (Includes B shred)"],
    ["2A954A", "C4ISR Mission Systems Journeyman"],
    ["2F051", "Fuels Journeyman"],
    ["2G051", "Logistics Plans Journeyman"],
    ["2M051", "Missile and Space Systems Electronic Maintenance Journeyman (Includes all shreds)", PFE_ONLY],
    ["2M052", "Missile and Space Systems Maintenance Journeyman"],
    ["2M053", "Missile and Space Facilities Journeyman"],
    ["2P051", "Precision Measurement Equipment Laboratory Journeyman"],
    ["2R251", "Maintenance Management Journeyman"],
    ["2S051", "Materiel Management Journeyman"],
    ["2T051", "Traffic Management Operations Journeyman"],
    ["2T151", "Ground Transportation Journeyman", PFE_ONLY],
    ["2T251", "Air Transportation Journeyman"],
    ["2T351", "Mission Generation Vehicular Equipment Maintenance Journeyman", PFE_ONLY],
    ["2T357", "Fleet Management and Analysis Journeyman", PFE_ONLY],
    ["2W051", "Munitions Systems Journeyman"],
    ["2W151", "Aircraft Armament Systems Journeyman (Includes all shreds)"],
    ["2W251", "Nuclear Weapons Journeyman"],
    ["3E051", "Electrical Systems Journeyman"],
    ["3E052", "Electrical Power Production Journeyman"],
    ["3E151", "Heating, Ventilation, Air Conditioning, and Refrigeration Journeyman"],
    ["3E251", "Pavements and Construction Equipment Journeyman"],
    ["3E351", "Structural Journeyman"],
    ["3E451", "Water and Fuel Systems Maintenance Journeyman (Includes A shred)"],
    ["3E453", "Pest Management Journeyman"],
    ["3E551", "Engineering Journeyman"],
    ["3E651", "Operations Management Journeyman"],
    ["3E751", "Fire Protection Journeyman"],
    ["3E851", "Explosive Ordnance Disposal Journeyman"],
    ["3E951", "Emergency Management Journeyman"],
    ["3F051", "Human Resources and Administration Journeyman", PFE_ONLY],
    ["3F151", "Services Journeyman", PFE_ONLY],
    ["3F251", "Education and Training Journeyman"],
    ["3F351", "Manpower Journeyman (Includes M shred)", PFE_ONLY],
    ["3F451", "Equal Opportunity Journeyman", PFE_ONLY],
    ["3G051", "Talent Acquisition Journeyman", PFE_ONLY],
    ["3H051", "Historian Journeyman", PFE_ONLY],
    ["3N056", "Public Affairs Journeyman"],
    ["3N1/3N2/3N3", "Regional/Premier Band Journeyman (Includes all shreds)", PFE_ONLY],
    ["3P051", "Security Forces Journeyman (Includes applicable shreds)"],
    ["4A051", "Health Services Management Journeyman (Includes S shred)", PFE_ONLY],
    ["4A151", "Medical Materiel Journeyman", PFE_ONLY],
    ["4A251", "Biomedical Equipment Journeyman"],
    ["4B051", "Bioenvironmental Engineering Journeyman"],
    ["4C051", "Mental Health Service Journeyman", PFE_ONLY],
    ["4D051", "Diet Therapy Journeyman"],
    ["4E051", "Public Health Journeyman"],
    ["4H051", "Respiratory Care Practitioner Journeyman"],
    ["4J052", "Physical Medicine Journeyman", PFE_ONLY],
    ["4J052A", "Physical Medicine (Orthotic) Journeyman", PFE_ONLY],
    ["4N051", "Aerospace Medical Service Journeyman (Includes all shreds)"],
    ["4N151", "Surgical Technologist Journeyman (Includes all shreds)"],
    ["4P051", "Pharmacy Journeyman"],
    ["4R051", "Diagnostic Imaging Journeyman (Includes all shreds)", PFE_ONLY],
    ["4T051", "Medical Laboratory Journeyman", PFE_ONLY],
    ["4T052", "Histopathology Journeyman"],
    ["4V051", "Ophthalmic Journeyman (Includes S shred)"],
    ["4Y051", "Dental Assistant Journeyman (Includes H shred)"],
    ["4Y052", "Dental Laboratory Journeyman"],
    ["5J051", "Paralegal Journeyman"],
    ["5R051", "Religious Affairs Journeyman"],
    ["6C051", "Contracting Journeyman"],
    ["6F051", "Financial Management and Comptroller Journeyman"],
    ["7S051", "Special Investigations Journeyman", PFE_ONLY]
  ];


  /* ==========================================================
     4. OFFICIAL 2026 E6 SECTION IIA CATALOG
  ========================================================== */

  const E6_SECTION_IIA = [
    ["1A172", "Mobility Force Aviator Craftsman (Includes all shreds)"],
    ["1A173", "Special Mission Aviator Craftsman (Includes all shreds)"],
    ["1A174", "Multi-domain Operations Aviator Craftsman (Includes all shreds)", PFE_ONLY],
    ["1A178", "Executive Mission Aviator Craftsman (Includes all shreds)"],
    ["1A871", "Airborne Cryptologic Language Analyst Craftsman (Includes all shreds)", PFE_ONLY],
    ["1A872", "Airborne Intelligence, Surveillance, and Reconnaissance (ISR) Operator Craftsman", PFE_ONLY],
    ["1B471", "Cyber Warfare Operations Craftsman", PFE_ONLY],
    ["1C072", "Aviation Resource Management Craftsman"],
    ["1C171", "Air Traffic Control Craftsman"],
    ["1C371", "All Domain Command and Control Operations Craftsman", PFE_ONLY],
    ["1C571", "Battle Management Operations Craftsman (Includes D shred)"],
    ["1C671", "Space Systems Operations Craftsman (Transferred to USSF and USAFR)", PFE_ONLY],
    ["1C771", "Airfield Management Craftsman"],
    ["1C873", "Radar, Airfield, and Weather Systems (RAWS) Craftsman"],
    ["1D771", "Cyber Defense Operations Craftsman (Includes all shreds)", PFE_ONLY],
    ["1D772", "Spectrum Defense Craftsman (Includes all shreds)", PFE_ONLY],
    ["1D773", "Cable and Antenna Defense Operations Craftsman", PFE_ONLY],
    ["1D774", "Data Engineering (Includes all shreds)", PFE_ONLY],
    ["1D775", "Cybersecurity", PFE_ONLY],
    ["1H071", "Aerospace Physiology Craftsman"],
    ["1N071", "All Source Intelligence Analyst Craftsman", PFE_ONLY],
    ["1N171", "Geospatial Intelligence (GEOINT) Craftsman (Includes A shred)", PFE_ONLY],
    ["1N271", "Signals Intelligence Craftsman (Includes A and C shreds)", PFE_ONLY],
    ["1N371", "Cryptologic Language Analyst Craftsman (Includes all shreds)", PFE_ONLY],
    ["1N471", "Cyber Intelligence Analyst Craftsman (Includes A shred)", PFE_ONLY],
    ["1N472", "Cryptologic Analyst and Reporter Craftsman", PFE_ONLY],
    ["1N771", "Human Intelligence Specialist Craftsman", PFE_ONLY],
    ["1N871", "Targeting Analyst Craftsman", PFE_ONLY],
    ["1P071A", "Aircrew Flight Equipment Craftsman (Ejection Aircraft)"],
    ["1P071B", "Aircrew Flight Equipment Craftsman (Non-Ejection Aircraft)"],
    ["1S071", "Safety Craftsman"],
    ["1T071", "Survival, Evasion, Resistance, and Escape (SERE) Craftsman"],
    ["1U171", "Remotely Piloted Aircraft (RPA) Pilot Craftsman (Includes O and R shreds)", PFE_ONLY],
    ["1W071", "Weather Craftsman"],
    ["1Z171", "Pararescue Craftsman"],
    ["1Z271", "Combat Control Craftsman"],
    ["1Z371", "Tactical Air Control Party (TACP) Craftsman"],
    ["1Z471", "Special Reconnaissance Craftsman"],
    ["2A071", "Avionics Test Station, Components, and Electronic Warfare Systems Craftsman"],
    ["2A373", "Tactical Aircraft Maintenance Craftsman (Includes all shreds)"],
    ["2A374", "Fighter Aircraft Integrated Avionics Craftsman (Includes all shreds)"],
    ["2A375", "Advanced Fighter Aircraft Integrated Avionics Craftsman (Includes all shreds)"],
    ["2A377", "Tactical Aircraft Maintenance (5th Generation) Craftsman (Includes A and B shreds)"],
    ["2A571", "Airlift/Special Mission Aircraft Maintenance Craftsman (Includes all shreds)", PFE_ONLY],
    ["2A572", "Helicopter/Tiltrotor Aircraft Maintenance Craftsman (Includes all shreds)"],
    ["2A574", "Refuel/Bomber Aircraft Maintenance Craftsman (Includes all shreds)"],
    ["2A671C", "Aerospace Propulsion Craftsman (Airlift, Special Mission, and B-52 aircraft engines)"],
    ["2A671F", "Aerospace Propulsion Craftsman (Fighter and bomber aircraft jet engines)"],
    ["2A671H", "Aerospace Propulsion Craftsman (Turboprop and turboshaft engines)"],
    ["2A672", "Aerospace Ground Equipment Craftsman"],
    ["2A673", "Aircrew Egress Systems Craftsman"],
    ["2A674", "Aircraft Fuel Systems Craftsman"],
    ["2A675", "Aircraft Hydraulic Systems Craftsman"],
    ["2A676", "Aircraft Electrical and Environmental Systems Craftsman"],
    ["2A771", "Aircraft Metals Technology Craftsman"],
    ["2A772", "Nondestructive Inspection Craftsman"],
    ["2A773", "Aircraft Structural Maintenance Craftsman", PFE_ONLY],
    ["2A974", "Heavy Aircraft Integrated Avionics Craftsman"],
    ["2A974A", "C4ISR Mission Systems Craftsman"],
    ["2F071", "Fuels Craftsman"],
    ["2G071", "Logistics Plans Craftsman"],
    ["2M071", "Missile and Space Systems Electronic Maintenance Craftsman (Includes all shreds)", PFE_ONLY],
    ["2M072", "Missile and Space Systems Maintenance Craftsman"],
    ["2M073", "Missile and Space Facilities Craftsman"],
    ["2P071", "Precision Measurement Equipment Laboratory Craftsman"],
    ["2R271", "Maintenance Management Craftsman"],
    ["2S071", "Materiel Management Craftsman"],
    ["2T071", "Traffic Management Operations Craftsman"],
    ["2T171", "Ground Transportation Craftsman", PFE_ONLY],
    ["2T271", "Air Transportation Craftsman"],
    ["2T371", "Mission Generation Vehicular Equipment Maintenance Craftsman", PFE_ONLY],
    ["2T377", "Fleet Management and Analysis Craftsman", PFE_ONLY],
    ["2W071", "Munitions Systems Craftsman"],
    ["2W171", "Aircraft Armament Systems Craftsman (Includes all shreds)"],
    ["2W271", "Nuclear Weapons Craftsman"],
    ["3E071", "Electrical Systems Craftsman"],
    ["3E072", "Electrical Power Production Craftsman"],
    ["3E171", "Heating, Ventilation, Air Conditioning, and Refrigeration Craftsman"],
    ["3E271", "Pavements and Construction Equipment Craftsman"],
    ["3E371", "Structural Craftsman"],
    ["3E471", "Water and Fuel Systems Maintenance Craftsman (Includes A shred)"],
    ["3E473", "Pest Management Craftsman"],
    ["3E571", "Engineering Craftsman"],
    ["3E671", "Operations Management Craftsman"],
    ["3E771", "Fire Protection Craftsman"],
    ["3E871", "Explosive Ordnance Disposal Craftsman"],
    ["3E971", "Emergency Management Craftsman"],
    ["3F071", "Human Resources and Administration Craftsman", PFE_ONLY],
    ["3F171", "Services Craftsman", PFE_ONLY],
    ["3F271", "Education and Training Craftsman"],
    ["3F371", "Manpower Craftsman (Includes M shred)", PFE_ONLY],
    ["3F471", "Equal Opportunity Craftsman"],
    ["3G071", "Talent Acquisition Craftsman", PFE_ONLY],
    ["3H071", "Historian Craftsman", PFE_ONLY],
    ["3N076", "Public Affairs Craftsman"],
    ["3N1/3N2/3N3", "Regional/Premier Band Craftsman (Includes all shreds)", PFE_ONLY],
    ["3P071", "Security Forces Craftsman (Includes all shreds)"],
    ["4A071", "Health Services Management Craftsman (Includes S shred)", PFE_ONLY],
    ["4A171", "Medical Materiel Craftsman", PFE_ONLY],
    ["4A271", "Biomedical Equipment Craftsman"],
    ["4B071", "Bioenvironmental Engineering Craftsman"],
    ["4C071", "Mental Health Service Craftsman", PFE_ONLY],
    ["4D071", "Diet Therapy Craftsman"],
    ["4E071", "Public Health Craftsman"],
    ["4H071", "Respiratory Care Practitioner Craftsman"],
    ["4J072", "Physical Medicine Craftsman", PFE_ONLY],
    ["4J072A", "Physical Medicine (Orthotic) Craftsman", PFE_ONLY],
    ["4N071", "Aerospace Medical Service Craftsman (Includes B, D, F, G, and H shreds)"],
    ["4N071C", "Aerospace Medical Service Independent Duty Medical Technician Craftsman"],
    ["4N171", "Surgical Technologist Craftsman (Includes B shred)"],
    ["4N171C", "Surgical Technologist (Orthopedics) Craftsman"],
    ["4N171D", "Surgical Technologist (Otolaryngology) Craftsman"],
    ["4P071", "Pharmacy Craftsman"],
    ["4R071", "Diagnostic Imaging Craftsman", PFE_ONLY],
    ["4R071A", "Diagnostic Imaging (Nuclear Medicine) Craftsman", PFE_ONLY],
    ["4R071B", "Diagnostic Imaging (Diagnostic Medical Sonography) Craftsman", PFE_ONLY],
    ["4R071C", "Diagnostic Imaging (Magnetic Resonance Imaging) Craftsman", PFE_ONLY],
    ["4R071D", "Diagnostic Imaging (Mammography) Craftsman", PFE_ONLY],
    ["4R071E", "Diagnostic Imaging (Intervention Radiography)", PFE_ONLY],
    ["4R071F", "Diagnostic Imaging (Computed Tomography) Craftsman", PFE_ONLY],
    ["4T071", "Medical Laboratory Craftsman", PFE_ONLY],
    ["4T072", "Histopathology Craftsman"],
    ["4V071", "Ophthalmic Craftsman (Includes S shred)"],
    ["4Y071", "Dental Assistant Craftsman (Includes H shred)"],
    ["4Y072", "Dental Laboratory Craftsman"],
    ["5J071", "Paralegal Craftsman"],
    ["5R071", "Religious Affairs Craftsman"],
    ["6C071", "Contracting Craftsman"],
    ["6F071", "Financial Management and Comptroller Craftsman"],
    ["7S071", "Special Investigations Craftsman"],
    ["9S100", "Scientific Applications Specialist Craftsman", PFE_ONLY]
  ];


  /* ==========================================================
     5. OFFICIAL 2026 SECTION IIB RI/SDI RECORDS

     Applicability:
     - "E5/6": catalog option is created for both cycles
     - "E6": catalog option is created only for 26E6
     - "*": catalog option is created for both cycles

     Rule:
     - "P": PFE only
     - "N": Note 11, PFE + SKT in current CAFSC
  ========================================================== */

  const RI_SDI_SECTION_IIB = [
    ["8A200", "Enlisted Aide", "E5/6", PFE_ONLY],
    ["8A300", "Protocol", "E5/6", PFE_ONLY],
    ["8B000", "Military Training Instructor", "E6", PFE_ONLY],
    ["8B200", "Academy Military Training Instructor", "E6", PFE_ONLY],
    ["8B300", "AFROTC Training Instructor", "E6", PFE_ONLY],
    ["8B100", "Military Training Leader", "E6", PFE_ONLY],
    ["8C000", "Airman Family Readiness NCO", "E6", PFE_ONLY],
    ["8D100", "Language and Cultural Advisor", "E5/6", PFE_ONLY],
    ["8G000", "Honor Guard", "E5/6", PFE_ONLY],
    ["8G100", "Base Honor Guard Program Manager", "E6", PFE_ONLY],
    ["8H000", "Airmen Dorm Leader", "E6", PFE_ONLY],
    ["8K000", "Software Development Specialist", "E5/6", NOTE_11],
    ["8L100", "Air Advisor", "E5/6", PFE_ONLY],
    ["8L200", "Air Advisor Basic, Team Sergeant", "E5/6", PFE_ONLY],
    ["8L300", "Air Advisor Basic, Team Leader", "E5/6", PFE_ONLY],
    ["8P000", "Courier", "E5/6", PFE_ONLY],
    ["8P100", "Defense Attaché", "E6", PFE_ONLY],
    ["8R000", "Enlisted Accessions Recruiter", "E6", PFE_ONLY],
    ["8R200", "Second-Tier Recruiter", "E6", PFE_ONLY],
    ["8S000", "Missile Facility Manager", "E6", PFE_ONLY],
    ["8S200", "Combat Crew Communications", "E6", NOTE_11],
    ["8T000", "Professional Military Education Instructor", "E6", PFE_ONLY],
    ["8T100", "Enlisted PME Instructional System Designer", "E6", PFE_ONLY],
    ["8U000", "Unit Deployment Manager", "E5/6", PFE_ONLY],
    ["8Y000", "Pathfinder", "E5/6", PFE_ONLY],
    ["9A000", "Enlisted Airman", "E5/6", PFE_ONLY],
    ["9A300", "Enlisted Airman", "E5/6", PFE_ONLY],
    ["9A500", "Enlisted Airman", "*", PFE_ONLY],
    ["9E100", "Command Chief Executive Assistant", "E5/6", NOTE_11],
    ["9F000", "First Term Airmen Center NCOIC", "E5/6", PFE_ONLY],
    ["9I000", "Futures Airmen", "E5/6", NOTE_11],
    ["9L000", "Interpreter/Translator", "E5/6", PFE_ONLY],
    ["9M200", "International Health Specialists", "E6", PFE_ONLY],
    ["9P000", "Patient", "E5/6", NOTE_11],
    ["9U000", "Enlisted Airman Ineligible for Local Utilization", "E5/6", PFE_ONLY]
  ];


  /* ==========================================================
     6. CATALOG CONSTRUCTION
  ========================================================== */

  function decodePathFlag(flag) {
    if (flag === PFE_ONLY) {
      return {
        path: CONFIG.PATHS.PFE_ONLY,
        rule: CONFIG.RULES.PFE_ONLY
      };
    }

    if (flag === NOTE_11) {
      return {
        path: CONFIG.PATHS.BOTH,
        rule: CONFIG.RULES.NOTE_11_CURRENT_CAFSC
      };
    }

    return {
      path: CONFIG.PATHS.BOTH,
      rule: CONFIG.RULES.STANDARD
    };
  }

  function createCatalogRecord({
    code,
    title,
    flag = BOTH,
    grade,
    gradeLabel,
    gradeBucket,
    cycle,
    cycleValue,
    section,
    type
  }) {
    const decoded = decodePathFlag(flag);

    const pathLabel =
      decoded.path === CONFIG.PATHS.PFE_ONLY
        ? "PFE Only"
        : "SKT + PFE";

    const display =
      `${code} — ${title} — ${cycle}`;

    return Object.freeze({
      id: `${cycle}:${code}:${type}`,
      code,
      title,
      display,

      grade,
      gradeLabel,
      gradeBucket,

      cycle,
      cycleValue,

      path: decoded.path,
      pathLabel,
      rule: decoded.rule,

      section,
      type,

      source:
        `2026 ${gradeBucket} WAPS Catalog ${section}`
    });
  }

  function buildSectionIIARecords(
    rows,
    {
      grade,
      gradeLabel,
      gradeBucket,
      cycle,
      cycleValue
    }
  ) {
    return rows.map(([code, title, flag = BOTH]) => {
      return createCatalogRecord({
        code,
        title,
        flag,
        grade,
        gradeLabel,
        gradeBucket,
        cycle,
        cycleValue,
        section: "Section IIA",
        type: "AFSC"
      });
    });
  }

  function buildSectionIIBRecords() {
    const records = [];

    RI_SDI_SECTION_IIB.forEach(
      ([code, title, applicability, flag]) => {
        const supportsE5 =
          applicability === "E5/6" ||
          applicability === "*";

        const supportsE6 =
          applicability === "E5/6" ||
          applicability === "E6" ||
          applicability === "*";

        if (supportsE5) {
          records.push(
            createCatalogRecord({
              code,
              title,
              flag,
              grade: "ssgt",
              gradeLabel: "Staff Sergeant",
              gradeBucket: "E5",
              cycle: "26E5",
              cycleValue: "26e5",
              section: "Section IIB",
              type: "RI_SDI"
            })
          );
        }

        if (supportsE6) {
          records.push(
            createCatalogRecord({
              code,
              title,
              flag,
              grade: "tsgt",
              gradeLabel: "Technical Sergeant",
              gradeBucket: "E6",
              cycle: "26E6",
              cycleValue: "26e6",
              section: "Section IIB",
              type: "RI_SDI"
            })
          );
        }
      }
    );

    return records;
  }

  const INTERNAL_CATALOG = [
    ...buildSectionIIARecords(
      E5_SECTION_IIA,
      {
        grade: "ssgt",
        gradeLabel: "Staff Sergeant",
        gradeBucket: "E5",
        cycle: "26E5",
        cycleValue: "26e5"
      }
    ),

    ...buildSectionIIARecords(
      E6_SECTION_IIA,
      {
        grade: "tsgt",
        gradeLabel: "Technical Sergeant",
        gradeBucket: "E6",
        cycle: "26E6",
        cycleValue: "26e6"
      }
    ),

    ...buildSectionIIBRecords()
  ].sort((a, b) => {
    const codeCompare = a.code.localeCompare(
      b.code,
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );

    if (codeCompare !== 0) return codeCompare;

    return a.cycle.localeCompare(b.cycle);
  });


  /* ==========================================================
     7. OPTIONAL EXTERNAL CATALOG OVERRIDE

     A future waps-data.js file can set:

     window.THEWING_WAPS_AFSC_CATALOG = [ ...records ];

     The external catalog must contain normalized records using
     the same fields as INTERNAL_CATALOG.
  ========================================================== */

  const CATALOG =
    Array.isArray(
      window.THEWING_WAPS_AFSC_CATALOG
    ) &&
    window.THEWING_WAPS_AFSC_CATALOG.length
      ? window.THEWING_WAPS_AFSC_CATALOG
      : INTERNAL_CATALOG;

  if (!window.THEWING_WAPS_AFSC_CATALOG) {
    window.THEWING_WAPS_AFSC_CATALOG = CATALOG;
  }


  /* ==========================================================
     8. HELP CONTENT
  ========================================================== */

  const HELP_TOPICS = Object.freeze({
    general: {
      title: "How WAPS Scoring Works",

      html: `
        <section>
          <h3>Start With Your CAFSC</h3>
          <p>
            Select the CAFSC held on the promotion eligibility
            cutoff date. TheWing uses the selected catalog record
            to determine the promotion cycle and testing path.
          </p>
        </section>

        <section>
          <h3>SKT + PFE</h3>
          <p>
            When both tests apply, the PFE and SKT each contribute
            up to 100 points. Each score must be at least 40.00,
            and the combined score must be at least 90.00.
          </p>
        </section>

        <section>
          <h3>PFE Only</h3>
          <p>
            When the catalog identifies a PFE-only path, the PFE
            score is multiplied by two. The minimum PFE score is
            45.00.
          </p>
        </section>

        <section>
          <h3>EPB Recommendations</h3>
          <p>
            Up to three eligible force-distributed EPB
            recommendations contribute to the promotion
            recommendation score.
          </p>
        </section>

        <section>
          <h3>Official Selection</h3>
          <p>
            The estimate does not guarantee promotion. Official
            selection depends on personnel data, the promotion
            AFSC, quotas and the applicable cycle cutoff.
          </p>
        </section>
      `
    },

    cafsc: {
      title: "Select Your CAFSC",

      html: `
        <section>
          <h3>Use the CAFSC on the PECD</h3>
          <p>
            Select the control Air Force Specialty Code held on
            the promotion eligibility cutoff date.
          </p>
        </section>

        <section>
          <h3>Search by Code or Name</h3>
          <p>
            Begin typing an AFSC code or career-field name, then
            select the matching catalog option.
          </p>
        </section>

        <section>
          <h3>Shared RI/SDI Codes</h3>
          <p>
            Some reporting and special duty identifiers apply to
            both 26E5 and 26E6. Select the option containing the
            promotion cycle for which you are competing.
          </p>
        </section>

        <section>
          <h3>Note 11</h3>
          <p>
            A Note 11 RI or SDI uses both the PFE and SKT in the
            member's current CAFSC.
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
            Enter an official score when available or use a
            projected score to explore a possible WAPS outcome.
          </p>
        </section>

        <section>
          <h3>Two Decimal Places</h3>
          <p>
            Test scores are preserved to two decimal places.
            Additional decimal places are discarded rather than
            rounded.
          </p>
        </section>

        <section>
          <h3>Minimum Requirements</h3>
          <p>
            Minimum test requirements are evaluated separately
            from the total WAPS score.
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
            The most recent eligible force-distributed
            recommendation receives the largest point value.
          </p>
        </section>

        <section>
          <h3>Earlier Eligible EPBs</h3>
          <p>
            The second and third eligible recommendations receive
            the point values assigned to those positions.
          </p>
        </section>

        <section>
          <h3>Bypassed Reports</h3>
          <p>
            Nonrated or successfully removed reports do not
            consume an eligible weighted position. Remaining
            eligible reports shift forward.
          </p>
        </section>
      `
    },

    decorations: {
      title: "Eligible Decorations",

      html: `
        <section>
          <h3>Quantity Inputs</h3>
          <p>
            Enter how many of each qualifying decoration you hold.
            TheWing multiplies each quantity by the AFI 36-2502
            Table 2.4 point value.
          </p>
        </section>

        <section>
          <h3>Maximum Credit</h3>
          <p>
            Raw decoration points may exceed 25, but WAPS decoration
            credit is capped at 25.
          </p>
        </section>

        <section>
          <h3>Cycle Eligibility</h3>
          <p>
            Include only decorations with a closeout date on or
            before the PECD and a Given Under My Hand date before
            the cycle public release date.
          </p>
        </section>
      `
    }
  });


  /* ==========================================================
     9. INITIALIZATION
  ========================================================== */

  function initialize() {
    const root =
      document.getElementById("thewing-waps");

    if (!root) {
      console.warn(
        "[THEWING_WAPS] Root #thewing-waps was not found."
      );
      return;
    }

    const byId = (id) =>
      document.getElementById(id);

    const el = {
      root,

      promotionGrade:
        byId("promotionGrade"),

      promotionCycle:
        byId("promotionCycle"),

      testingPath:
        byId("testingPath"),

      form:
        byId("wapsCalculatorForm"),

      cafscSearchShell:
        byId("cafscSearchShell"),

      cafscInput:
        byId("cafscInput"),

      cafscCatalog:
        byId("cafscCatalog"),

      cafscClearButton:
        byId("cafscClearButton"),

      cafscStatus:
        byId("cafscStatus"),

      wapsInputFlow:
        byId("wapsInputFlow"),

      inputEmptyState:
        byId("inputEmptyState"),

      testingPathNotice:
        byId("testingPathNotice"),

      testingPathNoticeTitle:
        byId("testingPathNoticeTitle"),

      testingPathNoticeText:
        byId("testingPathNoticeText"),

      pfeScoreCard:
        byId("pfeScoreCard"),

      pfeScore:
        byId("pfeScore"),

      pfeRange:
        byId("pfeRange"),

      pfeScoreFeedback:
        byId("pfeScoreFeedback"),

      sktScoreCard:
        byId("sktScoreCard"),

      sktScore:
        byId("sktScore"),

      sktRange:
        byId("sktRange"),

      sktScoreFeedback:
        byId("sktScoreFeedback"),

      testingMinimumNotice:
        byId("testingMinimumNotice"),

      testingMinimumTitle:
        byId("testingMinimumTitle"),

      testingMinimumText:
        byId("testingMinimumText"),

      epbCurrent:
        byId("epbCurrent"),

      epbPrevious1:
        byId("epbPrevious1"),

      epbPrevious2:
        byId("epbPrevious2"),

      epbCurrentPoints:
        byId("epbCurrentPoints"),

      epbPrevious1Points:
        byId("epbPrevious1Points"),

      epbPrevious2Points:
        byId("epbPrevious2Points"),

      decorationPoints:
        byId("decorationPoints"),

      decorationMsm:
        byId("decorationMsm"),

      decorationCommendation:
        byId("decorationCommendation"),

      decorationAchievement:
        byId("decorationAchievement"),

      decorationAirMedal:
        byId("decorationAirMedal"),

      decorationBronzeStar:
        byId("decorationBronzeStar"),

      decorationPurpleHeart:
        byId("decorationPurpleHeart"),

      decorationMedalOfHonor:
        byId("decorationMedalOfHonor"),

      decorationAirForceCross:
        byId("decorationAirForceCross"),

      decorationNavyCross:
        byId("decorationNavyCross"),

      decorationDistinguishedServiceCross:
        byId("decorationDistinguishedServiceCross"),

      decorationDefenseDsm:
        byId("decorationDefenseDsm"),

      decorationDsm:
        byId("decorationDsm"),

      decorationSilverStar:
        byId("decorationSilverStar"),

      decorationLegionOfMerit:
        byId("decorationLegionOfMerit"),

      decorationDssm:
        byId("decorationDssm"),

      decorationDfc:
        byId("decorationDfc"),

      decorationDefenseMsm:
        byId("decorationDefenseMsm"),

      decorationAerialAchievement:
        byId("decorationAerialAchievement"),

      decorationArmyCommendation:
        byId("decorationArmyCommendation"),

      decorationNavyCommendation:
        byId("decorationNavyCommendation"),

      decorationJointCommendation:
        byId("decorationJointCommendation"),

      decorationCoastGuardCommendation:
        byId("decorationCoastGuardCommendation"),

      decorationNavyAchievement:
        byId("decorationNavyAchievement"),

      decorationCoastGuardAchievement:
        byId("decorationCoastGuardAchievement"),

      decorationArmyAchievement:
        byId("decorationArmyAchievement"),

      decorationJointAchievement:
        byId("decorationJointAchievement"),

      decorationSummary:
        byId("decorationSummary"),

      decorationRawTotal:
        byId("decorationRawTotal"),

      decorationCappedTotal:
        byId("decorationCappedTotal"),

      decorationRawRow:
        byId("decorationRawRow"),

      decorationCapNotice:
        byId("decorationCapNotice"),

      additionalDecorations:
        byId("additionalDecorations"),

      advancedOptions:
        byId("advancedOptions"),

      individualSktExemption:
        byId("individualSktExemption"),

      historicalCutoff:
        byId("historicalCutoff"),

      cutoffSource:
        byId("cutoffSource"),

      cutoffComparisonResult:
        byId("cutoffComparisonResult"),

      resultEmptyState:
        byId("resultEmptyState"),

      resultContent:
        byId("resultContent"),

      resetCalculatorButton:
        byId("resetCalculatorButton"),

      wapsScoreRing:
        byId("wapsScoreRing"),

      wapsTotalScore:
        byId("wapsTotalScore"),

      overallScoreStatus:
        byId("overallScoreStatus"),

      overallScoreStatusTitle:
        byId("overallScoreStatusTitle"),

      overallScoreStatusText:
        byId("overallScoreStatusText"),

      testingComponentValue:
        byId("testingComponentValue"),

      epbComponentValue:
        byId("epbComponentValue"),

      decorationComponentValue:
        byId("decorationComponentValue"),

      totalComponentValue:
        byId("totalComponentValue"),

      wapsMeaningText:
        byId("wapsMeaningText"),

      pfeBreakdownLabel:
        byId("pfeBreakdownLabel"),

      pfeBreakdownValue:
        byId("pfeBreakdownValue"),

      pfeBreakdownMaximum:
        byId("pfeBreakdownMaximum"),

      pfeProgressBar:
        byId("pfeProgressBar"),

      sktBreakdownItem:
        byId("sktBreakdownItem"),

      sktBreakdownValue:
        byId("sktBreakdownValue"),

      sktBreakdownMaximum:
        byId("sktBreakdownMaximum"),

      sktProgressBar:
        byId("sktProgressBar"),

      epbBreakdownValue:
        byId("epbBreakdownValue"),

      epbProgressBar:
        byId("epbProgressBar"),

      decorationsBreakdownValue:
        byId("decorationsBreakdownValue"),

      decorationsProgressBar:
        byId("decorationsProgressBar"),

      copyResultsButton:
        byId("copyResultsButton"),

      copyResultsButtonText:
        byId("copyResultsButtonText"),

      helpDialog:
        byId("wapsHelpDialog"),

      helpDialogTitle:
        byId("wapsHelpDialogTitle"),

      helpContent:
        byId("wapsHelpContent"),

      closeHelpButton:
        byId("closeHelpButton"),

      helpDialogDoneButton:
        byId("helpDialogDoneButton"),

      liveRegion:
        byId("wapsLiveRegion")
    };

    const requiredKeys = [
      "promotionGrade",
      "promotionCycle",
      "testingPath",
      "form",
      "cafscSearchShell",
      "cafscInput",
      "cafscCatalog",
      "cafscClearButton",
      "cafscStatus",
      "wapsInputFlow",
      "inputEmptyState",
      "testingPathNotice",
      "testingPathNoticeTitle",
      "testingPathNoticeText",
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
      "decorationMsm",
      "decorationCommendation",
      "decorationAchievement",
      "decorationAirMedal",
      "decorationBronzeStar",
      "decorationPurpleHeart",
      "decorationMedalOfHonor",
      "decorationAirForceCross",
      "decorationNavyCross",
      "decorationDistinguishedServiceCross",
      "decorationDefenseDsm",
      "decorationDsm",
      "decorationSilverStar",
      "decorationLegionOfMerit",
      "decorationDssm",
      "decorationDfc",
      "decorationDefenseMsm",
      "decorationAerialAchievement",
      "decorationArmyCommendation",
      "decorationNavyCommendation",
      "decorationJointCommendation",
      "decorationCoastGuardCommendation",
      "decorationNavyAchievement",
      "decorationCoastGuardAchievement",
      "decorationArmyAchievement",
      "decorationJointAchievement",
      "decorationSummary",
      "decorationRawTotal",
      "decorationCappedTotal",
      "decorationRawRow",
      "decorationCapNotice",
      "individualSktExemption",
      "historicalCutoff",
      "cutoffSource",
      "cutoffComparisonResult",
      "resultEmptyState",
      "resultContent",
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
      "helpDialog",
      "helpDialogTitle",
      "helpContent",
      "closeHelpButton",
      "helpDialogDoneButton",
      "liveRegion"
    ];

    const missing = requiredKeys.filter(
      (key) => !el[key]
    );

    if (missing.length) {
      console.warn(
        "[THEWING_WAPS] Missing required elements:",
        missing.join(", ")
      );
      return;
    }


    /* ========================================================
       10. LOCAL STATE
    ======================================================== */

    const state = {
      selectedRecord: null,
      effectivePath: null,
      snapshot: null,
      copyResetTimer: null,
      decorationOverride: null
    };


    /* ========================================================
       11. CATALOG INDEXES
    ======================================================== */

    const recordByDisplay = new Map();
    const recordsByCode = new Map();
    const recordsByTitle = new Map();

    CATALOG.forEach((record) => {
      recordByDisplay.set(
        String(record.display).toLowerCase(),
        record
      );

      const code =
        normalizeCode(record.code);

      const codeRecords =
        recordsByCode.get(code) || [];

      codeRecords.push(record);
      recordsByCode.set(code, codeRecords);

      const title =
        normalizeSearchText(record.title);

      const titleRecords =
        recordsByTitle.get(title) || [];

      titleRecords.push(record);
      recordsByTitle.set(title, titleRecords);
    });


    /* ========================================================
       12. GENERAL HELPERS
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

      return number >= 0
        ? Math.floor(number * 100) / 100
        : Math.ceil(number * 100) / 100;
    }

    function format2(value) {
      return truncate2(value).toFixed(2);
    }

    function formatSigned2(value) {
      const number = truncate2(value);

      return number > 0
        ? `+${number.toFixed(2)}`
        : number.toFixed(2);
    }

    function integerValue(
      value,
      minimum,
      maximum
    ) {
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
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    }

    function normalizeSearchText(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ");
    }

function normalizeCode(value) {

  const raw = String(value || "")

    .trim()

    .toUpperCase();

  /*

    Extract only the AFSC appearing at the beginning.

    Examples:

    "2A772"                                      → "2A772"

    "2A772 -"                                    → "2A772"

    "2A772 — Nondestructive Inspection"          → "2A772"

    "2A772 — Nondestructive Inspection — 26E6"   → "2A772"

    "3N1/3N2/3N3 — Regional Band — 26E6"         → "3N1/3N2/3N3"

  */

  const match = raw.match(

    /^([0-9][A-Z0-9]*(?:\/[A-Z0-9]+)*)(?=\s|[-–—]|$)/

  );

  return match ? match[1] : "";

}

    function readScore(input, maximum) {
      if (!input || input.value === "") {
        return 0;
      }

      return truncate2(
        clamp(input.value, 0, maximum)
      );
    }

    function getDecorationInputs() {
      return DECORATION_DEFINITIONS.map((definition) => {
        const input = el[definition.id];

        return {
          definition,
          input
        };
      });
    }

    function normalizeDecorationQuantity(value) {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return 0;
      }

      const number = Number(value);

      if (!Number.isFinite(number)) {
        return 0;
      }

      return integerValue(
        number,
        0,
        DECORATION_QUANTITY_MAX
      );
    }

    function readDecorationQuantity(input) {
      if (!input) return 0;

      return normalizeDecorationQuantity(input.value);
    }

    function syncDecorationQuantityInput(input) {
      if (!input) return 0;

      const quantity =
        readDecorationQuantity(input);

      input.value = String(quantity);

      return quantity;
    }

    function emptyDecorationCalculation(overridePoints = null) {
      const quantities = {};

      DECORATION_DEFINITIONS.forEach((definition) => {
        quantities[definition.key] = 0;
      });

      if (overridePoints === null) {
        return {
          quantities,
          lineItems: [],
          rawTotal: 0,
          cappedTotal: 0,
          capApplied: false,
          override: false
        };
      }

      const rawTotal = integerValue(
        overridePoints,
        0,
        Number.MAX_SAFE_INTEGER
      );

      const cappedTotal = Math.min(
        rawTotal,
        CONFIG.MAXIMUMS.DECORATIONS
      );

      return {
        quantities,
        lineItems: [],
        rawTotal,
        cappedTotal,
        capApplied: rawTotal > CONFIG.MAXIMUMS.DECORATIONS,
        override: true
      };
    }

    function calculateDecorations() {
      if (state.decorationOverride !== null) {
        const overrideResult =
          emptyDecorationCalculation(
            state.decorationOverride
          );

        el.decorationPoints.value =
          String(overrideResult.cappedTotal);

        return overrideResult;
      }

      const quantities = {};
      const lineItems = [];
      let rawTotal = 0;

      getDecorationInputs().forEach(({ definition, input }) => {
        const quantity =
          readDecorationQuantity(input);

        quantities[definition.key] = quantity;

        const subtotal =
          quantity * definition.pointsEach;

        rawTotal += subtotal;

        if (quantity > 0) {
          lineItems.push({
            key: definition.key,
            label: definition.label,
            quantity,
            pointsEach: definition.pointsEach,
            subtotal
          });
        }
      });

      const cappedTotal = Math.min(
        rawTotal,
        CONFIG.MAXIMUMS.DECORATIONS
      );

      const result = {
        quantities,
        lineItems,
        rawTotal,
        cappedTotal,
        capApplied:
          rawTotal > CONFIG.MAXIMUMS.DECORATIONS,
        override: false
      };

      el.decorationPoints.value =
        String(result.cappedTotal);

      return result;
    }

    function readDecorations() {
      return calculateDecorations().cappedTotal;
    }

    function renderDecorationSummary(decorations) {
      el.decorationCappedTotal.textContent =
        String(decorations.cappedTotal);

      el.decorationRawTotal.textContent =
        String(decorations.rawTotal);

      el.decorationSummary.dataset.capApplied =
        decorations.capApplied ? "true" : "false";

      el.decorationRawRow.hidden =
        !decorations.capApplied;

      el.decorationCapNotice.hidden =
        !decorations.capApplied;
    }

    function resetDecorationQuantities() {
      state.decorationOverride = null;

      getDecorationInputs().forEach(({ input }) => {
        if (input) {
          input.value = "0";
        }
      });

      el.decorationPoints.value = "0";

      if (el.additionalDecorations) {
        el.additionalDecorations.open = false;
      }

      renderDecorationSummary(
        emptyDecorationCalculation()
      );
    }

    function readHistoricalCutoff() {
      const raw =
        el.historicalCutoff.value.trim();

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

      const minimum =
        Number(range.min || 0);

      const maximum =
        Number(range.max || 100);

      const value =
        clamp(
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

    function setProgress(
      element,
      value,
      maximum
    ) {
      if (!element) return;

      element.style.width =
        `${percentage(value, maximum)}%`;
    }

    function announce(message) {
      el.liveRegion.textContent = "";

      window.setTimeout(() => {
        el.liveRegion.textContent = message;
      }, 20);
    }


    /* ========================================================
       13. CATALOG SEARCH AND SELECTION
    ======================================================== */

    function populateCAFSCDataList() {
      const fragment =
        document.createDocumentFragment();

      CATALOG.forEach((record) => {
        const option =
          document.createElement("option");

        option.value = record.display;

        option.label =
          `${record.code} • ${record.cycle} • ${record.pathLabel}`;

        fragment.appendChild(option);
      });

      el.cafscCatalog.replaceChildren(fragment);
    }

    function findRecordFromRawInput(rawValue) {
      const raw =
        String(rawValue || "").trim();

      if (!raw) {
        return {
          record: null,
          status: "empty",
          matches: []
        };
      }

      const normalizedText =
        normalizeSearchText(raw);

      const exactDisplay =
        recordByDisplay.get(normalizedText);

      if (exactDisplay) {
        return {
          record: exactDisplay,
          status: "exact",
          matches: [exactDisplay]
        };
      }

      const normalizedCode =
        normalizeCode(raw);

      const exactCodeMatches =
        recordsByCode.get(normalizedCode) || [];

      if (exactCodeMatches.length === 1) {
        return {
          record: exactCodeMatches[0],
          status: "exact-code",
          matches: exactCodeMatches
        };
      }

      if (exactCodeMatches.length > 1) {
        const cycleMatch =
          exactCodeMatches.find((record) => {
            return normalizedText.includes(
              record.cycle.toLowerCase()
            );
          });

        if (cycleMatch) {
          return {
            record: cycleMatch,
            status: "exact-code-cycle",
            matches: [cycleMatch]
          };
        }

        return {
          record: null,
          status: "ambiguous",
          matches: exactCodeMatches
        };
      }

      const exactTitleMatches =
        recordsByTitle.get(normalizedText) || [];

      if (exactTitleMatches.length === 1) {
        return {
          record: exactTitleMatches[0],
          status: "exact-title",
          matches: exactTitleMatches
        };
      }

      const partialMatches =
        CATALOG.filter((record) => {
          const searchable =
            normalizeSearchText(
              `${record.code} ${record.title} ${record.cycle}`
            );

          return searchable.includes(
            normalizedText
          );
        });

      return {
        record: null,
        status:
          partialMatches.length === 1
            ? "single-partial"
            : partialMatches.length > 1
              ? "partial"
              : "not-found",
        matches: partialMatches
      };
    }

    function selectRecord(
      record,
      {
        updateInput = true,
        announceSelection = true
      } = {}
    ) {
      if (!record) {
        clearSelection({
          preserveInput: true,
          resetMessage: false
        });
        return;
      }

      state.selectedRecord = record;

      if (updateInput) {
        el.cafscInput.value =
          record.display;
      }

      el.cafscClearButton.hidden = false;

      el.individualSktExemption.disabled =
        record.path ===
        CONFIG.PATHS.PFE_ONLY;

      if (
        record.path ===
        CONFIG.PATHS.PFE_ONLY
      ) {
        el.individualSktExemption.checked =
          false;
      }

      setCalculatorReady(true);
      recompute();

      if (announceSelection) {
        announce(
          `${record.code} selected. ${record.cycle}, ${record.pathLabel}.`
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "thewing:waps-afsc-selected",
          {
            detail: deepClone(record)
          }
        )
      );
    }

    function clearSelection({
      preserveInput = false,
      resetMessage = true
    } = {}) {
      state.selectedRecord = null;
      state.effectivePath = null;
      state.snapshot = null;

      if (!preserveInput) {
        el.cafscInput.value = "";
      }

      el.cafscClearButton.hidden =
        !el.cafscInput.value.trim();

      el.promotionGrade.value = "";
      el.promotionCycle.value = "";
      el.testingPath.value = "";

      el.individualSktExemption.disabled =
        false;

      setCalculatorReady(false);

      if (resetMessage) {
        el.cafscStatus.dataset.status =
          "neutral";

        el.cafscStatus.textContent =
          "Select a CAFSC to begin.";
      }
    }

    function processCAFSCInput({
      allowSinglePartial = false
    } = {}) {
      const result =
        findRecordFromRawInput(
          el.cafscInput.value
        );

      el.cafscClearButton.hidden =
        !el.cafscInput.value.trim();

      if (result.record) {
        selectRecord(result.record, {
          updateInput: true,
          announceSelection: false
        });
        return result;
      }

      if (
        allowSinglePartial &&
        result.status === "single-partial" &&
        result.matches.length === 1
      ) {
        selectRecord(result.matches[0]);
        return {
          ...result,
          record: result.matches[0]
        };
      }

      clearSelection({
        preserveInput: true,
        resetMessage: false
      });

      if (result.status === "empty") {
        el.cafscStatus.dataset.status =
          "neutral";

        el.cafscStatus.textContent =
          "Select a CAFSC to begin.";

        return result;
      }

      if (result.status === "ambiguous") {
        el.cafscStatus.dataset.status =
          "warning";

        el.cafscStatus.textContent =
          "This RI/SDI applies to more than one cycle. Select the 26E5 or 26E6 option from the list.";

        return result;
      }

      if (
        result.status === "partial" ||
        result.status === "single-partial"
      ) {
        el.cafscStatus.dataset.status =
          "neutral";

        el.cafscStatus.textContent =
          `${result.matches.length} matching catalog option${result.matches.length === 1 ? "" : "s"}. Select one from the list.`;

        return result;
      }

      el.cafscStatus.dataset.status =
        "invalid";

      el.cafscStatus.textContent =
        "No exact 2026 catalog record matched. Check the code or select a listed option.";

      return result;
    }


    /* ========================================================
       14. READY AND EMPTY STATES
    ======================================================== */

    function setCalculatorReady(ready) {
      el.root.dataset.afscReady =
        String(ready);

      el.wapsInputFlow.hidden = !ready;
      el.inputEmptyState.hidden = ready;

      el.resultContent.hidden = !ready;
      el.resultEmptyState.hidden = ready;

      if (!ready) {
        el.root.dataset.testingPath =
          "pending";

        el.wapsScoreRing.style.setProperty(
          "--score-percent",
          "0"
        );
      }
    }


    /* ========================================================
       15. EFFECTIVE TESTING PATH
    ======================================================== */

    function getEffectivePath(record) {
      if (!record) return null;

      if (
        record.path ===
        CONFIG.PATHS.PFE_ONLY
      ) {
        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          rule: CONFIG.RULES.PFE_ONLY,
          label: "PFE Only",
          explanation:
            "The 2026 catalog marks this entry as PFE only."
        };
      }

      if (
        el.individualSktExemption.checked
      ) {
        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          rule:
            CONFIG.RULES.INDIVIDUAL_EXEMPTION,
          label: "PFE Only",
          explanation:
            "An official individual SKT exemption is being applied."
        };
      }

      if (
        record.rule ===
        CONFIG.RULES.NOTE_11_CURRENT_CAFSC
      ) {
        return {
          mode: CONFIG.PATHS.BOTH,
          rule:
            CONFIG.RULES.NOTE_11_CURRENT_CAFSC,
          label: "SKT + PFE",
          explanation:
            "Note 11 applies. The member takes the PFE and SKT in the current CAFSC."
        };
      }

      return {
        mode: CONFIG.PATHS.BOTH,
        rule: CONFIG.RULES.STANDARD,
        label: "SKT + PFE",
        explanation:
          "The 2026 catalog lists an SKT for this AFSC."
      };
    }


    /* ========================================================
       16. EPB CALCULATION

       "none" and "bypass" do not consume an eligible
       weighted position. Later eligible reports shift forward.
    ======================================================== */

    function calculateEPB() {
      const selections = [
        el.epbCurrent.value,
        el.epbPrevious1.value,
        el.epbPrevious2.value
      ];

      let eligiblePositionIndex = 0;

      const entries =
        selections.map(
          (rating, originalIndex) => {
            const bypassed =
              rating === "none" ||
              rating === "bypass";

            if (bypassed) {
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

            return {
              originalIndex,
              rating,
              label:
                CONFIG.EPB_LABELS[rating] ||
                rating,
              eligible: true,
              weightedPosition,
              points:
                table[weightedPosition] || 0
            };
          }
        );

      const total =
        Math.min(
          CONFIG.MAXIMUMS.EPB,
          entries.reduce(
            (sum, entry) =>
              sum + entry.points,
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
       17. MINIMUM TEST REQUIREMENTS
    ======================================================== */

    function calculateMinimums({
      path,
      pfe,
      skt
    }) {
      if (
        path.mode ===
        CONFIG.PATHS.PFE_ONLY
      ) {
        const pfePass =
          pfe >= CONFIG.MINIMUMS.PFE_ONLY;

        return {
          mode: CONFIG.PATHS.PFE_ONLY,
          pfePass,
          sktPass: true,
          combinedPass: pfePass,
          allPassed: pfePass,
          combinedScore:
            truncate2(pfe * 2)
        };
      }

      const combinedScore =
        truncate2(pfe + skt);

      const pfePass =
        pfe >=
        CONFIG.MINIMUMS.STANDARD_PFE;

      const sktPass =
        skt >=
        CONFIG.MINIMUMS.STANDARD_SKT;

      const combinedPass =
        combinedScore >=
        CONFIG.MINIMUMS.STANDARD_COMBINED;

      return {
        mode: CONFIG.PATHS.BOTH,
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
       18. MASTER CALCULATION
    ======================================================== */

    function calculateSnapshot() {
      const record =
        state.selectedRecord;

      if (!record) return null;

      const path =
        getEffectivePath(record);

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

      const epb =
        calculateEPB();

      const decorationsDetail =
        calculateDecorations();

      const decorations =
        decorationsDetail.cappedTotal;

      const testingComponent =
        path.mode ===
        CONFIG.PATHS.PFE_ONLY
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

        catalog: {
          id: record.id,
          code: record.code,
          title: record.title,
          type: record.type,
          section: record.section,
          source: record.source
        },

        promotion: {
          grade: record.grade,
          gradeLabel: record.gradeLabel,
          gradeBucket: record.gradeBucket,
          cycle: record.cycle,
          cycleValue: record.cycleValue
        },

        path,

        scores: {
          pfe,

          skt:
            path.mode ===
            CONFIG.PATHS.PFE_ONLY
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
        decorations: decorationsDetail,
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
       19. SELECTED AFSC RENDERING
    ======================================================== */

    function renderAFSCContext(snapshot) {

      const record =

        state.selectedRecord;

      const path =

        snapshot.path;

      el.cafscStatus.dataset.status =

        "valid";

      el.cafscStatus.textContent =

        `${record.code} selected — ${record.cycle}, promotion to ${

          record.grade === "tsgt" ? "TSgt" : "SSgt"

        }.`;

      el.promotionGrade.value =

        record.grade;

      el.promotionCycle.value =

        record.cycleValue;

      el.testingPath.value =

        path.mode;

    }


    /* ========================================================
       20. TESTING PATH RENDERING
    ======================================================== */

    function renderTestingPath(snapshot) {
      const path =
        snapshot.path;

      const usesPFEOnly =
        path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      state.effectivePath = path;

      el.root.dataset.testingPath =
        usesPFEOnly
          ? "pfe-only"
          : "both";

      el.testingPathNotice.dataset.path =
        path.mode;

      if (usesPFEOnly) {
        el.testingPathNoticeTitle.textContent =
          path.rule ===
          CONFIG.RULES.INDIVIDUAL_EXEMPTION
            ? "PFE Only — Individual Exemption"
            : "PFE Only — Catalog Rule";

        el.testingPathNoticeText.textContent =
          path.explanation;

        el.sktScoreCard.hidden = true;
        el.sktBreakdownItem.hidden = true;

        el.sktScore.disabled = true;
        el.sktRange.disabled = true;
      } else {
        el.testingPathNoticeTitle.textContent =
          path.rule ===
          CONFIG.RULES.NOTE_11_CURRENT_CAFSC
            ? "SKT + PFE — Current CAFSC Rule"
            : "SKT + PFE";

        el.testingPathNoticeText.textContent =
          path.explanation;

        el.sktScoreCard.hidden = false;
        el.sktBreakdownItem.hidden = false;

        el.sktScore.disabled = false;
        el.sktRange.disabled = false;
      }

      setRangeFill(el.pfeRange);
      setRangeFill(el.sktRange);
    }


    /* ========================================================
       21. MINIMUM REQUIREMENTS RENDERING
    ======================================================== */

    function renderMinimums(snapshot) {
      const {
        path,
        scores,
        minimums
      } = snapshot;

      const usesPFEOnly =
        path.mode ===
        CONFIG.PATHS.PFE_ONLY;

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
            ? `The PFE is at least 45.00. The testing component is ${format2(scores.testingComponent)} out of 200.`
            : "The PFE must be at least 45.00 for the PFE-only path.";

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
          `PFE and SKT are each at least 40.00. The combined score is ${format2(minimums.combinedScore)}.`;

        return;
      }

      const issues = [];

      if (!minimums.pfePass) {
        issues.push(
          "PFE must be at least 40.00"
        );
      }

      if (!minimums.sktPass) {
        issues.push(
          "SKT must be at least 40.00"
        );
      }

      if (!minimums.combinedPass) {
        issues.push(
          "the combined score must be at least 90.00"
        );
      }

      el.testingMinimumText.textContent =
        `${issues.join("; ")}.`;
    }


    /* ========================================================
       22. EPB RENDERING
    ======================================================== */

    function renderEPB(snapshot) {
      const entries =
        snapshot.epb.entries;

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
       23. SCORE RENDERING
    ======================================================== */

    function renderScore(snapshot) {
      const {
        path,
        scores,
        minimums
      } = snapshot;

      const usesPFEOnly =
        path.mode ===
        CONFIG.PATHS.PFE_ONLY;

      el.wapsTotalScore.textContent =
        format2(scores.totalScore);

      el.testingComponentValue.textContent =
        format2(scores.testingComponent);

      el.decorationComponentValue.textContent =
        String(scores.decorations);

      renderDecorationSummary(
        snapshot.decorations
      );

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
            ? "The PFE score meets the displayed minimum for the PFE-only path."
            : "The PFE, SKT and combined testing scores meet the displayed minimums.";
      } else {
        el.overallScoreStatus.dataset.status =
          "fail";

        el.overallScoreStatusTitle.textContent =
          "Minimum test requirements not met";

        el.overallScoreStatusText.textContent =
          usesPFEOnly
            ? "The PFE must be at least 45.00 for the PFE-only path."
            : "PFE and SKT must each be at least 40.00, with a combined score of at least 90.00.";
      }
    }


    /* ========================================================
       24. MEANING TEXT
    ======================================================== */

    function renderMeaning(snapshot) {
      const {
        catalog,
        promotion,
        path,
        scores,
        minimums,
        cutoff
      } = snapshot;

      const opening =
        `For ${catalog.code} in the ${promotion.cycle} cycle, your estimated WAPS score is ${format2(scores.totalScore)} out of 510.`;

      const testing =
        path.mode ===
        CONFIG.PATHS.PFE_ONLY
          ? ` The testing component is ${format2(scores.pfe)} multiplied by two, for ${format2(scores.testingComponent)} points.`
          : ` The PFE and SKT produce ${format2(scores.testingComponent)} testing points.`;

      const minimum =
        minimums.allPassed
          ? " The displayed minimum testing requirements are met."
          : " One or more displayed minimum testing requirements are not met.";

      let comparison = "";

      if (cutoff.value !== null) {
        if (cutoff.difference > 0) {
          comparison =
            ` The score is ${format2(cutoff.difference)} points above the entered comparison cutoff.`;
        } else if (cutoff.difference < 0) {
          comparison =
            ` The score is ${format2(Math.abs(cutoff.difference))} points below the entered comparison cutoff.`;
        } else {
          comparison =
            " The score matches the entered comparison cutoff.";
        }
      }

      const official =
        " Official selection depends on the promotion AFSC, quota, cycle cutoff and official Air Force personnel data.";

      el.wapsMeaningText.textContent =
        opening +
        testing +
        minimum +
        comparison +
        official;
    }


    /* ========================================================
       25. CUTOFF COMPARISON
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

      const sourceText =
        source
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
       26. MASTER RENDER AND RECOMPUTE
    ======================================================== */

    function render(snapshot) {
      state.snapshot = snapshot;

      renderAFSCContext(snapshot);
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
      if (!state.selectedRecord) {
        return null;
      }

      try {
        const snapshot =
          calculateSnapshot();

        if (!snapshot) return null;

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
       27. TEST SCORE INPUT PAIRS
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
       28. RESET
    ======================================================== */

    function resetCalculator({
      announceReset = true
    } = {}) {
      const defaults =
        CONFIG.DEFAULTS;

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

      resetDecorationQuantities();

      el.individualSktExemption.checked =
        defaults.INDIVIDUAL_EXEMPTION;

      el.historicalCutoff.value =
        defaults.HISTORICAL_CUTOFF;

      el.cutoffSource.value =
        defaults.CUTOFF_SOURCE;

      if (el.advancedOptions) {
        el.advancedOptions.open = false;
      }

      setRangeFill(el.pfeRange);
      setRangeFill(el.sktRange);

      clearSelection({
        preserveInput: false,
        resetMessage: true
      });

      if (announceReset) {
        announce(
          "WAPS calculator reset. Select a CAFSC to begin."
        );
      }
    }


    /* ========================================================
       29. COPY SUMMARY
    ======================================================== */

    function buildScoreSummary(snapshot) {
      const lines = [
        "TheWing.ai WAPS Calculator",
        "--------------------------------",
        `CAFSC: ${snapshot.catalog.code}`,
        `Career field: ${snapshot.catalog.title}`,
        `Promotion cycle: ${snapshot.promotion.cycle}`,
        `Promotion to: ${snapshot.promotion.gradeLabel}`,
        `Testing path: ${snapshot.path.label}`,
        "",
        `PFE score: ${format2(snapshot.scores.pfe)}`,
        `SKT score: ${
          snapshot.path.mode ===
          CONFIG.PATHS.PFE_ONLY
            ? "Not included"
            : format2(snapshot.scores.rawSKT)
        }`,
        `Testing component: ${format2(snapshot.scores.testingComponent)} / 200`,
        `EPB promotion recommendation score: ${snapshot.scores.epb} / 285`,
        "",
        "Decorations:",
        ...(
          snapshot.decorations.lineItems.length
            ? snapshot.decorations.lineItems.map(
                (item) =>
                  `- ${item.label}: ${item.quantity} × ${item.pointsEach} = ${item.subtotal}`
              )
            : ["- None entered"]
        ),
        `Raw decoration points: ${snapshot.decorations.rawTotal}`,
        `WAPS decoration credit: ${snapshot.decorations.cappedTotal} / 25`,
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

      if (!snapshot) {
        announce(
          "Select a CAFSC before copying a score summary."
        );
        return;
      }

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
       30. HELP DIALOG
    ======================================================== */

    function openHelp(topicName = "general") {
      const topic =
        HELP_TOPICS[topicName] ||
        HELP_TOPICS.general;

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
        el.helpDialog.setAttribute(
          "open",
          ""
        );
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
        el.helpDialog.removeAttribute(
          "open"
        );
      }
    }


    /* ========================================================
       31. EVENT BINDINGS
    ======================================================== */

    function bindEvents() {
      el.form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          processCAFSCInput({
            allowSinglePartial: true
          });
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

el.cafscInput.addEventListener(

  "input",

  () => {

    const rawValue = el.cafscInput.value.trim();

    el.cafscClearButton.hidden = !rawValue;

    /* The field was completely cleared. */

    if (!rawValue) {

      clearSelection({

        preserveInput: false,

        resetMessage: true

      });

      return;

    }

    const result = findRecordFromRawInput(rawValue);

    /*

      Immediately accept:

      - A complete datalist selection

      - An exact unique AFSC code

      - An exact career-field title

    */

    if (result.record) {

      selectRecord(result.record, {

        updateInput: true,

        announceSelection: false

      });

      return;

    }

    /*

      Do not clear or hide the calculator while the user

      is still typing a search.

    */

    if (

      result.status === "partial" ||

      result.status === "single-partial"

    ) {

      el.cafscStatus.dataset.status = "neutral";

      el.cafscStatus.textContent =

        `${result.matches.length} matching catalog option${

          result.matches.length === 1 ? "" : "s"

        }. Select one from the list.`;

      return;

    }

    if (result.status === "ambiguous") {

      el.cafscStatus.dataset.status = "warning";

      el.cafscStatus.textContent =

        "This code applies to more than one promotion cycle. Select the 26E5 or 26E6 option from the list.";

      return;

    }

    /*

      While typing an unfinished value, do not display

      the red invalid-record error.

    */

    el.cafscStatus.dataset.status = "neutral";

    el.cafscStatus.textContent =

      "Continue typing or select a matching CAFSC from the list.";

  }

);

      el.cafscInput.addEventListener(
        "change",
        () => {
          processCAFSCInput({
            allowSinglePartial: true
          });
        }
      );

      el.cafscInput.addEventListener(
        "keydown",
        (event) => {
          if (event.key !== "Enter") return;

          event.preventDefault();

          processCAFSCInput({
            allowSinglePartial: true
          });
        }
      );

      el.cafscClearButton.addEventListener(
        "click",
        () => {
          clearSelection({
            preserveInput: false,
            resetMessage: true
          });

          el.cafscInput.focus();
        }
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

      getDecorationInputs().forEach(({ input }) => {
        if (!input) return;

        input.addEventListener(
          "input",
          () => {
            state.decorationOverride = null;
            recompute();
          }
        );

        input.addEventListener(
          "blur",
          () => {
            state.decorationOverride = null;
            syncDecorationQuantityInput(input);
            recompute();
          }
        );
      });

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

      root
        .querySelectorAll("[data-help-topic]")
        .forEach((button) => {
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
            event.target ===
            el.helpDialog
          ) {
            closeHelp();
          }
        }
      );
    }


    /* ========================================================
       32. PUBLIC API
    ======================================================== */

    const api = {
      __mounted_v220: true,

      version: VERSION,
      CONFIG,

      getCatalog() {
        return deepClone(CATALOG);
      },

      searchCatalog(query) {
        const normalized =
          normalizeSearchText(query);

        if (!normalized) return [];

        return deepClone(
          CATALOG.filter((record) => {
            const searchable =
              normalizeSearchText(
                `${record.code} ${record.title} ${record.cycle}`
              );

            return searchable.includes(
              normalized
            );
          })
        );
      },

      selectAFSC(code, cycle = "") {
        const normalizedCode =
          normalizeCode(code);

        const matches =
          recordsByCode.get(
            normalizedCode
          ) || [];

        if (!matches.length) {
          return {
            ok: false,
            reason: "NOT_FOUND",
            matches: []
          };
        }

        let record = null;

        if (matches.length === 1) {
          record = matches[0];
        } else if (cycle) {
          const normalizedCycle =
            String(cycle)
              .trim()
              .toUpperCase();

          record =
            matches.find(
              (item) =>
                item.cycle ===
                normalizedCycle
            ) || null;
        }

        if (!record) {
          return {
            ok: false,
            reason: "AMBIGUOUS",
            matches: deepClone(matches)
          };
        }

        selectRecord(record);

        return {
          ok: true,
          state: this.getState()
        };
      },

      clearAFSC() {
        clearSelection({
          preserveInput: false,
          resetMessage: true
        });
      },

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

      setScores({
        pfe,
        skt
      } = {}) {
        if (pfe !== undefined) {
          const value =
            truncate2(
              clamp(
                pfe,
                0,
                CONFIG.MAXIMUMS.PFE
              )
            );

          el.pfeScore.value =
            format2(value);

          el.pfeRange.value =
            String(value);

          setRangeFill(el.pfeRange);
        }

        if (skt !== undefined) {
          const value =
            truncate2(
              clamp(
                skt,
                0,
                CONFIG.MAXIMUMS.SKT
              )
            );

          el.sktScore.value =
            format2(value);

          el.sktRange.value =
            String(value);

          setRangeFill(el.sktRange);
        }

        recompute();

        return this.getState();
      },

      setDecorations(pointsOrQuantities) {
        if (
          pointsOrQuantities &&
          typeof pointsOrQuantities === "object" &&
          !Array.isArray(pointsOrQuantities)
        ) {
          state.decorationOverride = null;

          DECORATION_DEFINITIONS.forEach((definition) => {
            const input = el[definition.id];

            if (!input) return;

            const raw =
              pointsOrQuantities[definition.key];

            input.value = String(
              normalizeDecorationQuantity(
                raw === undefined ? 0 : raw
              )
            );
          });
        } else {
          getDecorationInputs().forEach(({ input }) => {
            if (input) {
              input.value = "0";
            }
          });

          state.decorationOverride = integerValue(
            pointsOrQuantities,
            0,
            Number.MAX_SAFE_INTEGER
          );
        }

        recompute();

        return this.getState();
      },

      getDecorationPointValues() {
        return deepClone(DECORATION_POINT_VALUES);
      },

      getDecorationDefinitions() {
        return deepClone(DECORATION_DEFINITIONS);
      },

      setIndividualSKTExemption(enabled) {
        if (
          state.selectedRecord?.path ===
          CONFIG.PATHS.PFE_ONLY
        ) {
          el.individualSktExemption.checked =
            false;
        } else {
          el.individualSktExemption.checked =
            Boolean(enabled);
        }

        recompute();

        return this.getState();
      },

      openHelp,
      closeHelp,

      copySummary() {
        return copyResults();
      }
    };

    window.THEWING_WAPS = api;


    /* ========================================================
       33. STARTUP
    ======================================================== */

    bindEvents();
    populateCAFSCDataList();

    setRangeFill(el.pfeRange);
    setRangeFill(el.sktRange);

    setCalculatorReady(false);

    el.root.dataset.ready = "true";

    console.info(
      `[THEWING_WAPS] Mounted v${VERSION} with ${CATALOG.length} catalog records.`
    );
  }


  /* ==========================================================
     34. DOM READY
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
