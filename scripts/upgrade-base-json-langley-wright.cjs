#!/usr/bin/env node
/**
 * Upgrade Langley.json through Wright-Patterson.json to Lackland-style PCSUnited schema.
 * Preserves base-specific market/demographic data; adds structural fields and base_profile.
 */

const fs = require("fs");
const path = require("path");

const CITIES_DIR = path.join(__dirname, "../netlify/functions/cities");

const STATE_NAMES = {
  AL: "Alabama", AR: "Arkansas", AZ: "Arizona", CA: "California", CO: "Colorado",
  FL: "Florida", GA: "Georgia", ID: "Idaho", IL: "Illinois", KS: "Kansas",
  MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NJ: "New Jersey", NM: "New Mexico",
  NV: "Nevada", OH: "Ohio", OK: "Oklahoma", SC: "South Carolina", TX: "Texas",
  VA: "Virginia",
};

const TOP_LEVEL_ORDER = [
  "slug", "name", "city", "submarket", "place", "place_detail", "state", "state_code", "geo_id",
  "year", "last_updated_data_from_sources", "image_url", "base_image_url", "zip", "market_label", "profile",
  "avg_home_value", "average_home_value", "avgHome", "city_avg_home",
  "snapshot", "market_metrics", "metrics", "mortgage_assumptions",
  "property_tax_rate", "property_tax_rate_percent", "insurance_rate", "insurance_rate_percent", "hoa_monthly",
  "ownership_costs", "costs", "avg_home_mortgage_monthly",
  "population", "households", "income", "education", "veterans", "immigration", "labor",
  "crime_status", "school_quality", "rental_vacancy", "rental_metrics", "climate_weather", "special_events",
  "military_lifestyle_fit", "financial_brief", "market_bluf", "scorecard", "rules",
  "summary_points", "opportunities", "risks", "buyer_notes", "seller_notes", "investor_angles",
  "neighborhoods", "target_neighborhoods", "buyer_guidance", "seller_guidance", "landlord_notes",
  "by_bedroom", "housing", "base_profile", "sources", "compatibility",
];

const FILES = [
  "Langley", "Laughlin", "Little-Rock", "Luke", "MacDill", "Malmstrom", "Maxwell",
  "McConnell", "McGuire", "Minot", "Moody", "Mountain-Home", "Nellis", "Offutt",
  "Peterson", "Randolph", "Robins", "Scott", "Seymour-Johnson", "Shaw", "Sheppard",
  "Tinker", "Travis", "Tyndall", "Whiteman", "Wright-Patterson",
];

const BASE_CONFIG = {
  Langley: {
    slug: "langley-afb", name: "Langley AFB", city: "Hampton", submarket: "Hampton Roads / Newport News / Yorktown",
    place: "Langley AFB, VA", place_detail: "Hampton Roads, VA", state_code: "VA", branch: "Air Force", joint_base: true,
    parent_installation: "Joint Base Langley-Eustis", display_name: "Joint Base Langley-Eustis", short_name: "Langley",
    base_id: "langley-afb", metro: "Virginia Beach-Norfolk-Newport News, VA-NC",
    installation_type: "Fighter / Air Combat Command / Joint Base Operations",
    host_command: "1st Fighter Wing / Air Combat Command",
    mission_summary: "Joint Base Langley-Eustis is a major Air Force installation in Hampton Roads supporting fighter operations, air dominance missions, joint-base operations, and a dense military ecosystem alongside Navy and Army installations.",
    official_home: "https://www.langley.af.mil/",
    neighborhoods: ["Yorktown", "Poquoson", "Hampton", "Newport News", "Williamsburg corridor"],
  },
  Laughlin: {
    slug: "laughlin-afb", name: "Laughlin AFB", city: "Del Rio", submarket: "Del Rio / Laughlin corridor",
    place: "Laughlin AFB, TX", place_detail: "Del Rio, TX", state_code: "TX", branch: "Air Force", joint_base: false,
    parent_installation: "Laughlin AFB", display_name: "Laughlin Air Force Base", short_name: "Laughlin",
    base_id: "laughlin-afb", metro: "Del Rio, TX",
    installation_type: "Pilot Training / Specialized Undergraduate Pilot Training",
    host_command: "47th Flying Training Wing / Air Education and Training Command",
    mission_summary: "Laughlin AFB is a specialized undergraduate pilot training installation on the Texas-Mexico border supporting pilot pipeline production, instructor missions, and a tight training-community PCS environment.",
    official_home: "https://www.laughlin.af.mil/",
    neighborhoods: ["Del Rio", "Laughlin corridor", "South Del Rio", "Cienegas Terrace"],
  },
  "Little-Rock": {
    slug: "little-rock-afb", name: "Little Rock AFB", city: "Jacksonville", submarket: "Jacksonville / Cabot / Sherwood",
    place: "Little Rock AFB, AR", place_detail: "Jacksonville / Pulaski County, AR", state_code: "AR", branch: "Air Force", joint_base: false,
    parent_installation: "Little Rock AFB", display_name: "Little Rock Air Force Base", short_name: "Little Rock",
    base_id: "little-rock-afb", metro: "Little Rock-North Little Rock-Conway, AR",
    installation_type: "Airlift / C-130 Mobility / Training and Mission Support",
    host_command: "19th Airlift Wing / Air Mobility Command",
    mission_summary: "Little Rock AFB is the Home of Herk Nation, supporting C-130 airlift, mobility training, and mission support in central Arkansas with strong local military identity.",
    official_home: "https://www.littlerock.af.mil/",
    neighborhoods: ["Cabot", "Sherwood", "Jacksonville", "North Little Rock corridor"],
  },
  Luke: {
    slug: "luke-afb", name: "Luke AFB", city: "Glendale", submarket: "West Valley / Glendale / Surprise",
    place: "Luke AFB, AZ", place_detail: "Phoenix West Valley, AZ", state_code: "AZ", branch: "Air Force", joint_base: false,
    parent_installation: "Luke AFB", display_name: "Luke Air Force Base", short_name: "Luke",
    base_id: "luke-afb", metro: "Phoenix-Mesa-Chandler, AZ",
    installation_type: "Fighter Training / F-35 Training / Mission Support",
    host_command: "56th Fighter Wing / Air Education and Training Command",
    mission_summary: "Luke AFB is a major fighter training installation in the Phoenix West Valley supporting F-35 and legacy fighter training, instructor pipelines, and high-tempo aircrew production.",
    official_home: "https://www.luke.af.mil/",
    neighborhoods: ["Surprise", "Glendale", "Goodyear", "Litchfield Park", "West Valley corridor"],
  },
  MacDill: {
    slug: "macdill-afb", name: "MacDill AFB", city: "Tampa", submarket: "South Tampa / Brandon / Riverview",
    place: "MacDill AFB, FL", place_detail: "Tampa Bay, FL", state_code: "FL", branch: "Air Force", joint_base: false,
    parent_installation: "MacDill AFB", display_name: "MacDill Air Force Base", short_name: "MacDill",
    base_id: "macdill-afb", metro: "Tampa-St. Petersburg-Clearwater, FL",
    installation_type: "Combatant Command / Special Operations / Air Refueling / Mission Support",
    host_command: "6th Air Refueling Wing / CENTCOM / SOCOM",
    mission_summary: "MacDill AFB is a high-visibility Tampa Bay installation hosting CENTCOM, SOCOM, air refueling, and mission support in a premium coastal metro.",
    official_home: "https://www.macdill.af.mil/",
    neighborhoods: ["South Tampa", "Brandon", "Riverview", "Apollo Beach", "FishHawk"],
  },
  Malmstrom: {
    slug: "malmstrom-afb", name: "Malmstrom AFB", city: "Great Falls", submarket: "Great Falls / Cascade County",
    place: "Malmstrom AFB, MT", place_detail: "Great Falls, MT", state_code: "MT", branch: "Air Force", joint_base: false,
    parent_installation: "Malmstrom AFB", display_name: "Malmstrom Air Force Base", short_name: "Malmstrom",
    base_id: "malmstrom-afb", metro: "Great Falls, MT",
    installation_type: "ICBM / Nuclear Deterrence / Mission Support",
    host_command: "341st Missile Wing / Air Force Global Strike Command",
    mission_summary: "Malmstrom AFB supports nuclear deterrence and ICBM mission operations across Montana with a tight-knit Big Sky community and limited housing inventory.",
    official_home: "https://www.malmstrom.af.mil/",
    neighborhoods: ["Great Falls", "Black Eagle", "Sun River corridor", "Northwest Great Falls"],
  },
  Maxwell: {
    slug: "maxwell-afb", name: "Maxwell AFB", city: "Montgomery", submarket: "Montgomery / Prattville",
    place: "Maxwell AFB, AL", place_detail: "Montgomery, AL", state_code: "AL", branch: "Air Force", joint_base: true,
    parent_installation: "Maxwell-Gunter", display_name: "Maxwell Air Force Base", short_name: "Maxwell",
    base_id: "maxwell-afb", metro: "Montgomery, AL",
    installation_type: "Professional Military Education / Air University / Mission Support",
    host_command: "Air University / Air Education and Training Command",
    mission_summary: "Maxwell AFB is the intellectual hub of the Air Force, hosting Air University, professional military education, and mission support in the Montgomery metro.",
    official_home: "https://www.maxwell.af.mil/",
    neighborhoods: ["Prattville", "East Montgomery", "Pike Road corridor", "Millbrook"],
  },
  McConnell: {
    slug: "mcconnell-afb", name: "McConnell AFB", city: "Wichita", submarket: "Wichita / Derby / Andover",
    place: "McConnell AFB, KS", place_detail: "Wichita, KS", state_code: "KS", branch: "Air Force", joint_base: false,
    parent_installation: "McConnell AFB", display_name: "McConnell Air Force Base", short_name: "McConnell",
    base_id: "mcconnell-afb", metro: "Wichita, KS",
    installation_type: "Air Refueling / Tanker Operations / Mission Support",
    host_command: "22nd Air Refueling Wing / Air Mobility Command",
    mission_summary: "McConnell AFB is a major tanker installation in the Air Capital of the World supporting air refueling, mobility missions, and strong aviation-community ties.",
    official_home: "https://www.mcconnell.af.mil/",
    neighborhoods: ["Derby", "Andover", "East Wichita", "Haysville corridor"],
  },
  McGuire: {
    slug: "mcguire-afb", name: "McGuire AFB", city: "Wrightstown", submarket: "Burlington County / Joint Base MDL",
    place: "McGuire AFB, NJ", place_detail: "Joint Base McGuire-Dix-Lakehurst, NJ", state_code: "NJ", branch: "Air Force", joint_base: true,
    parent_installation: "Joint Base McGuire-Dix-Lakehurst", display_name: "Joint Base McGuire-Dix-Lakehurst", short_name: "McGuire",
    base_id: "mcguire-afb", metro: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
    installation_type: "Airlift / Mobility / Tri-Service Joint Base",
    host_command: "305th Air Mobility Wing / Air Mobility Command",
    mission_summary: "McGuire AFB is part of Joint Base McGuire-Dix-Lakehurst, supporting air mobility, tri-service operations, and high-demand housing across the Philadelphia and New Jersey corridor.",
    official_home: "https://www.jbmdl.af.mil/",
    neighborhoods: ["Wrightstown", "Mount Holly", "Columbus", "Jackson", "Bordentown corridor"],
  },
  Minot: {
    slug: "minot-afb", name: "Minot AFB", city: "Minot", submarket: "Minot / Ward County",
    place: "Minot AFB, ND", place_detail: "Minot, ND", state_code: "ND", branch: "Air Force", joint_base: false,
    parent_installation: "Minot AFB", display_name: "Minot Air Force Base", short_name: "Minot",
    base_id: "minot-afb", metro: "Minot, ND",
    installation_type: "Bomber / ICBM / Nuclear Deterrence",
    host_command: "5th Bomb Wing / 91st Missile Wing / Air Force Global Strike Command",
    mission_summary: "Minot AFB supports bomber and ICBM nuclear deterrence missions in northern North Dakota with a supportive local community and extreme seasonal weather considerations.",
    official_home: "https://www.minot.af.mil/",
    neighborhoods: ["Minot", "Burlington", "Surrey corridor", "North Minot"],
  },
  Moody: {
    slug: "moody-afb", name: "Moody AFB", city: "Valdosta", submarket: "Valdosta / Lowndes County",
    place: "Moody AFB, GA", place_detail: "Valdosta, GA", state_code: "GA", branch: "Air Force", joint_base: false,
    parent_installation: "Moody AFB", display_name: "Moody Air Force Base", short_name: "Moody",
    base_id: "moody-afb", metro: "Valdosta, GA",
    installation_type: "Rescue / Close Air Support / Mission Support",
    host_command: "23rd Wing / Air Combat Command",
    mission_summary: "Moody AFB supports rescue and A-10 close air support missions in south Georgia with classic military-town housing dynamics.",
    official_home: "https://www.moody.af.mil/",
    neighborhoods: ["Valdosta", "Lake Park", "Hahira corridor", "North Valdosta"],
  },
  "Mountain-Home": {
    slug: "mountain-home-afb", name: "Mountain Home AFB", city: "Mountain Home", submarket: "Mountain Home / Elmore County",
    place: "Mountain Home AFB, ID", place_detail: "Mountain Home, ID", state_code: "ID", branch: "Air Force", joint_base: false,
    parent_installation: "Mountain Home AFB", display_name: "Mountain Home Air Force Base", short_name: "Mountain Home",
    base_id: "mountain-home-afb", metro: "Mountain Home, ID",
    installation_type: "Fighter / Gunfighter / Mission Support",
    host_command: "366th Fighter Wing / Air Combat Command",
    mission_summary: "Mountain Home AFB is a high-desert fighter installation supporting Gunfighter operations with a tight military-town housing market and Boise metro alternatives.",
    official_home: "https://www.mountainhome.af.mil/",
    neighborhoods: ["Mountain Home", "Boise corridor", "Eagle / Meridian alternatives", "Elmore County"],
  },
  Nellis: {
    slug: "nellis-afb", name: "Nellis AFB", city: "Nellis AFB", submarket: "Las Vegas / North Las Vegas",
    place: "Nellis AFB, NV", place_detail: "Las Vegas, NV", state_code: "NV", branch: "Air Force", joint_base: false,
    parent_installation: "Nellis AFB", display_name: "Nellis Air Force Base", short_name: "Nellis",
    base_id: "nellis-afb", metro: "Las Vegas-Henderson-Paradise, NV",
    installation_type: "Combat Training / Test / Mission Support",
    host_command: "57th Wing / Air Combat Command",
    mission_summary: "Nellis AFB is a major combat training and test installation supporting advanced air combat training, Red Flag, and access to the broader Las Vegas housing market.",
    official_home: "https://www.nellis.af.mil/",
    neighborhoods: ["North Las Vegas", "Aliante", "Centennial Hills", "Henderson", "Summerlin"],
  },
  Offutt: {
    slug: "offutt-afb", name: "Offutt AFB", city: "Bellevue", submarket: "Bellevue / Papillion / Omaha",
    place: "Offutt AFB, NE", place_detail: "Omaha, NE", state_code: "NE", branch: "Air Force", joint_base: false,
    parent_installation: "Offutt AFB", display_name: "Offutt Air Force Base", short_name: "Offutt",
    base_id: "offutt-afb", metro: "Omaha-Council Bluffs, NE-IA",
    installation_type: "Strategic Command / Intelligence / Mission Support",
    host_command: "USSTRATCOM / 55th Wing",
    mission_summary: "Offutt AFB is home to USSTRATCOM and supports intelligence, reconnaissance, and strategic mission operations in the Omaha metro.",
    official_home: "https://www.offutt.af.mil/",
    neighborhoods: ["Bellevue", "Papillion", "Gretna", "South Omaha corridor"],
  },
  Peterson: {
    slug: "peterson-afb", name: "Peterson SFB", city: "Colorado Springs", submarket: "Colorado Springs / Fountain",
    place: "Peterson SFB, CO", place_detail: "Colorado Springs, CO", state_code: "CO", branch: "Space Force", joint_base: true,
    parent_installation: "Peterson Space Force Base", display_name: "Peterson Space Force Base", short_name: "Peterson",
    base_id: "peterson-sfb", metro: "Colorado Springs, CO",
    installation_type: "Space Operations / NORAD / Mission Support",
    host_command: "Space Operations Command / NORAD-USNORTHCOM support",
    mission_summary: "Peterson Space Force Base supports space operations, NORAD-related mission support, and defense-community housing in Colorado Springs.",
    official_home: "https://www.peterson.spaceforce.mil/",
    neighborhoods: ["Fountain", "Security-Widefield", "Powers corridor", "Briargate", "North Colorado Springs"],
  },
  Randolph: {
    slug: "randolph-afb", name: "Randolph AFB", city: "Universal City", submarket: "San Antonio / Universal City / Schertz",
    place: "Randolph AFB, TX", place_detail: "San Antonio, TX", state_code: "TX", branch: "Air Force", joint_base: true,
    parent_installation: "Joint Base San Antonio", display_name: "Joint Base San Antonio - Randolph", short_name: "Randolph",
    base_id: "jbsa-randolph", metro: "San Antonio-New Braunfels, TX",
    installation_type: "Training / Personnel Center / Joint Base Support",
    host_command: "Joint Base San Antonio / 12th Flying Training Wing",
    mission_summary: "JBSA-Randolph supports pilot training, personnel center functions, and joint-base operations on the northeast side of the San Antonio metro.",
    official_home: "https://www.jbsa.mil/",
    neighborhoods: ["Schertz", "Cibolo", "Universal City", "Live Oak", "Northeast San Antonio"],
  },
  Robins: {
    slug: "robins-afb", name: "Robins AFB", city: "Warner Robins", submarket: "Warner Robins / Houston County",
    place: "Robins AFB, GA", place_detail: "Warner Robins, GA", state_code: "GA", branch: "Air Force", joint_base: false,
    parent_installation: "Robins AFB", display_name: "Robins Air Force Base", short_name: "Robins",
    base_id: "robins-afb", metro: "Warner Robins, GA",
    installation_type: "Logistics / Sustainment / Mission Support",
    host_command: "78th Air Base Wing / Air Force Materiel Command",
    mission_summary: "Robins AFB is a major logistics and sustainment installation in Warner Robins with deep local military-community integration.",
    official_home: "https://www.robins.af.mil/",
    neighborhoods: ["Warner Robins", "Bonaire", "Centerville", "Perry corridor"],
  },
  Scott: {
    slug: "scott-afb", name: "Scott AFB", city: "Belleville", submarket: "Belleville / O'Fallon / Shiloh",
    place: "Scott AFB, IL", place_detail: "Metro East / St. Louis, IL", state_code: "IL", branch: "Air Force", joint_base: false,
    parent_installation: "Scott AFB", display_name: "Scott Air Force Base", short_name: "Scott",
    base_id: "scott-afb", metro: "St. Louis, MO-IL",
    installation_type: "Airlift / Mobility / TRANSCOM Support",
    host_command: "375th Air Mobility Wing / Air Mobility Command",
    mission_summary: "Scott AFB supports air mobility, TRANSCOM-related mission support, and military housing across the Metro East and St. Louis region.",
    official_home: "https://www.scott.af.mil/",
    neighborhoods: ["O'Fallon", "Shiloh", "Belleville", "Mascoutah", "Fairview Heights"],
  },
  "Seymour-Johnson": {
    slug: "seymour-johnson-afb", name: "Seymour Johnson AFB", city: "Goldsboro", submarket: "Goldsboro / Wayne County",
    place: "Seymour Johnson AFB, NC", place_detail: "Goldsboro, NC", state_code: "NC", branch: "Air Force", joint_base: false,
    parent_installation: "Seymour Johnson AFB", display_name: "Seymour Johnson Air Force Base", short_name: "Seymour Johnson",
    base_id: "seymour-johnson-afb", metro: "Goldsboro, NC",
    installation_type: "Fighter / Air Refueling / Mission Support",
    host_command: "4th Fighter Wing / 916th Air Refueling Wing",
    mission_summary: "Seymour Johnson AFB supports fighter and air refueling missions in eastern North Carolina with affordable military-town housing.",
    official_home: "https://www.seymourjohnson.af.mil/",
    neighborhoods: ["Goldsboro", "Pikeville", "Fremont corridor", "Northern Wayne County"],
  },
  Shaw: {
    slug: "shaw-afb", name: "Shaw AFB", city: "Sumter", submarket: "Sumter / Shaw corridor",
    place: "Shaw AFB, SC", place_detail: "Sumter, SC", state_code: "SC", branch: "Air Force", joint_base: false,
    parent_installation: "Shaw AFB", display_name: "Shaw Air Force Base", short_name: "Shaw",
    base_id: "shaw-afb", metro: "Sumter, SC",
    installation_type: "Fighter / CENTAF Support / Mission Support",
    host_command: "20th Fighter Wing / Air Combat Command",
    mission_summary: "Shaw AFB supports fighter operations and mission support in Sumter with high affordability and strong local military identity.",
    official_home: "https://www.shaw.af.mil/",
    neighborhoods: ["Sumter", "Dalzell", "Rembert corridor", "East Sumter"],
  },
  Sheppard: {
    slug: "sheppard-afb", name: "Sheppard AFB", city: "Wichita Falls", submarket: "Wichita Falls / Burkburnett",
    place: "Sheppard AFB, TX", place_detail: "Wichita Falls, TX", state_code: "TX", branch: "Air Force", joint_base: false,
    parent_installation: "Sheppard AFB", display_name: "Sheppard Air Force Base", short_name: "Sheppard",
    base_id: "sheppard-afb", metro: "Wichita Falls, TX",
    installation_type: "Technical Training / Pilot Training / Mission Support",
    host_command: "82nd Training Wing / 80th Flying Training Wing",
    mission_summary: "Sheppard AFB is a major technical and pilot training installation in Wichita Falls with affordable training-community housing.",
    official_home: "https://www.sheppard.af.mil/",
    neighborhoods: ["Wichita Falls", "Burkburnett", "Iowa Park corridor", "North Wichita Falls"],
  },
  Tinker: {
    slug: "tinker-afb", name: "Tinker AFB", city: "Oklahoma City", submarket: "Midwest City / Moore / Edmond",
    place: "Tinker AFB, OK", place_detail: "Oklahoma City, OK", state_code: "OK", branch: "Air Force", joint_base: false,
    parent_installation: "Tinker AFB", display_name: "Tinker Air Force Base", short_name: "Tinker",
    base_id: "tinker-afb", metro: "Oklahoma City, OK",
    installation_type: "Depot / Sustainment / Logistics / Mission Support",
    host_command: "72nd Air Base Wing / Air Force Materiel Command",
    mission_summary: "Tinker AFB is a major depot and sustainment installation in Oklahoma City with strong military-friendly metro amenities.",
    official_home: "https://www.tinker.af.mil/",
    neighborhoods: ["Midwest City", "Moore", "Edmond", "Choctaw corridor"],
  },
  Travis: {
    slug: "travis-afb", name: "Travis AFB", city: "Fairfield", submarket: "Fairfield / Vacaville / Dixon",
    place: "Travis AFB, CA", place_detail: "Solano County, CA", state_code: "CA", branch: "Air Force", joint_base: false,
    parent_installation: "Travis AFB", display_name: "Travis Air Force Base", short_name: "Travis",
    base_id: "travis-afb", metro: "Vallejo-Fairfield, CA",
    installation_type: "Airlift / Mobility / Mission Support",
    host_command: "60th Air Mobility Wing / Air Mobility Command",
    mission_summary: "Travis AFB supports air mobility and airlift missions in Solano County between the Bay Area and Sacramento with high California housing costs.",
    official_home: "https://www.travis.af.mil/",
    neighborhoods: ["Fairfield", "Vacaville", "Dixon", "Suisun City", "Benicia corridor"],
  },
  Tyndall: {
    slug: "tyndall-afb", name: "Tyndall AFB", city: "Panama City", submarket: "Panama City / Panama City Beach",
    place: "Tyndall AFB, FL", place_detail: "Panama City, FL", state_code: "FL", branch: "Air Force", joint_base: false,
    parent_installation: "Tyndall AFB", display_name: "Tyndall Air Force Base", short_name: "Tyndall",
    base_id: "tyndall-afb", metro: "Panama City, FL",
    installation_type: "Fighter Training / Mission Support / Coastal Operations",
    host_command: "325th Fighter Wing / Air Combat Command",
    mission_summary: "Tyndall AFB supports fighter training and coastal mission operations in the Panama City area with hurricane and insurance considerations.",
    official_home: "https://www.tyndall.af.mil/",
    neighborhoods: ["Panama City", "Panama City Beach", "Callaway", "Lynn Haven"],
  },
  Whiteman: {
    slug: "whiteman-afb", name: "Whiteman AFB", city: "Knob Noster", submarket: "Knob Noster / Warrensburg",
    place: "Whiteman AFB, MO", place_detail: "Knob Noster / Warrensburg, MO", state_code: "MO", branch: "Air Force", joint_base: false,
    parent_installation: "Whiteman AFB", display_name: "Whiteman Air Force Base", short_name: "Whiteman",
    base_id: "whiteman-afb", metro: "Warrensburg, MO",
    installation_type: "Bomber / Stealth / Mission Support",
    host_command: "509th Bomb Wing / Air Force Global Strike Command",
    mission_summary: "Whiteman AFB supports B-2 bomber operations in rural Missouri with affordable housing and quiet military-community dynamics.",
    official_home: "https://www.whiteman.af.mil/",
    neighborhoods: ["Knob Noster", "Warrensburg", "Lakewood", "Centerview corridor"],
  },
  "Wright-Patterson": {
    slug: "wright-patterson-afb", name: "Wright-Patterson AFB", city: "Dayton", submarket: "Beavercreek / Fairborn / Dayton",
    place: "Wright-Patterson AFB, OH", place_detail: "Dayton, OH", state_code: "OH", branch: "Air Force", joint_base: false,
    parent_installation: "Wright-Patterson AFB", display_name: "Wright-Patterson Air Force Base", short_name: "Wright-Patterson",
    base_id: "wright-patterson-afb", metro: "Dayton-Kettering-Beavercreek, OH",
    installation_type: "Research / Acquisition / Test / Mission Support",
    host_command: "88th Air Base Wing / Air Force Materiel Command",
    mission_summary: "Wright-Patterson AFB is a major research, acquisition, and test installation in the Dayton metro with strong defense-industry housing demand.",
    official_home: "https://www.wpafb.af.mil/",
    neighborhoods: ["Beavercreek", "Fairborn", "Centerville", "Riverside", "Oakwood corridor"],
  },
};

function normalizeDecimalRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n >= 0.1) return Math.round((n / 100) * 1000000) / 1000000;
  return n;
}

function pctAlias(decimal) {
  return Math.round(decimal * 10000) / 100;
}

function pickStateCode(old, cfg) {
  if (cfg.state_code) return cfg.state_code;
  const s = String(old.state || "").trim();
  if (s.length === 2) return s.toUpperCase();
  const entry = Object.entries(STATE_NAMES).find(([, name]) => name === s);
  return entry ? entry[0] : s.slice(0, 2).toUpperCase();
}

function cleanCity(oldCity, cfgCity) {
  if (cfgCity) return cfgCity;
  return String(oldCity || "").replace(/, [A-Z]{2}$/, "").trim();
}

function deriveNeighborhoods(old, cfg) {
  if (Array.isArray(old.neighborhoods) && old.neighborhoods.length) return old.neighborhoods;
  if (Array.isArray(old.target_neighborhoods) && old.target_neighborhoods.length) return old.target_neighborhoods;
  return cfg.neighborhoods || [];
}

function buildMarketMetrics(old, medianHome, medianRent, taxRate) {
  const market = old.housing?.market || {};
  const existing = old.market_metrics || {};
  return {
    median_list_price: existing.median_list_price ?? market.median_listing_price_realtor ?? Math.round(medianHome * 1.03),
    median_sold_price: existing.median_sold_price ?? market.median_sale_price_current ?? medianHome,
    median_sale_price: existing.median_sale_price ?? market.median_sale_price_current ?? medianHome,
    days_on_market: existing.days_on_market ?? market.average_days_on_market ?? null,
    inventory_months: existing.inventory_months ?? null,
    price_per_sqft: existing.price_per_sqft ?? market.median_listing_price_per_sqft ?? null,
    active_listings_total: existing.active_listings_total ?? market.active_listings_total ?? null,
    market_type_summary: existing.market_type_summary ?? market.market_type_summary ?? old.market_bluf?.bluf_summary ?? "",
    zillow_average_home_value: existing.zillow_average_home_value ?? market.zillow_average_home_value ?? old.avg_home_value,
    zillow_one_year_change_percent: existing.zillow_one_year_change_percent ?? market.zillow_one_year_change_percent ?? old.snapshot?.market_trend_yoy ?? null,
    as_of: existing.as_of ?? "2026-03",
  };
}

function buildSummaryPoints(old, cfg, neighborhoods) {
  if (Array.isArray(old.summary_points) && old.summary_points.length) return old.summary_points;
  const base = cfg.short_name;
  const metro = cfg.submarket;
  const bluf = old.market_bluf?.bluf_summary || "";
  const points = [
    `${cfg.display_name} sits in the ${metro} housing market with base-specific affordability, commute, and neighborhood tradeoffs.`,
    old.snapshot?.market_trend_yoy != null
      ? `Current market trend is approximately ${old.snapshot.market_trend_yoy}% year-over-year, which should shape buyer leverage and pricing discipline.`
      : `Current market conditions around ${base} should be evaluated using inventory, days on market, and all-in monthly ownership cost.`,
    old.financial_brief?.affordability_summary || `Military households should compare BAH against rent, mortgage, taxes, insurance, and commute before committing.`,
    neighborhoods.length
      ? `Neighborhood quality varies across ${neighborhoods.slice(0, 3).join(", ")} and other nearby corridors — citywide averages should not be the only filter.`
      : `Neighborhood quality varies materially across the ${metro} area — citywide averages should not be the only filter.`,
    bluf || `The strongest PCS move near ${base} depends on gate access, school zones, BAH fit, and realistic commute testing.`,
  ];
  return points.filter(Boolean);
}

function buildGuidanceArrays(old, cfg, neighborhoods) {
  const base = cfg.short_name;
  const n = neighborhoods;
  const mk = (arr, fallback) => (Array.isArray(arr) && arr.length ? arr : fallback);

  return {
    opportunities: mk(old.opportunities, [
      `${base} military demand can support durable housing relevance for disciplined buyers and landlords.`,
      `Local inventory and pricing may offer opportunity for households that stress-test taxes, insurance, and commute together.`,
      n.length ? `${n[0]} and nearby corridors may offer stronger family or value positioning depending on assignment length.` : `Nearby corridors may offer stronger family or value positioning depending on assignment length.`,
      `Assignment-length clarity can improve rent-versus-buy decisions near ${base}.`,
    ]),
    risks: mk(old.risks, [
      `Neighborhood quality, schools, commute, and monthly carrying costs vary across the ${cfg.submarket} market.`,
      `Property taxes, insurance, HOA, and utilities can widen the gap between list price and true monthly payment.`,
      `Market averages can hide weak submarkets — property-level review matters.`,
      old.financial_brief?.renter_advantage ? `Some BAH profiles may be better served by renting than buying in this market.` : `Stretching beyond a safe housing ratio can reduce PCS flexibility.`,
    ]),
    buyer_notes: mk(old.buyer_notes, [
      `${base} buyers should compare all-in monthly cost, not just principal and interest.`,
      `Verify school zones, commute timing, and BAH fit by exact address before signing.`,
      old.financial_brief?.buyer_opportunity || `Focus on corridors that balance commute, schools, and resale flexibility.`,
      `This market rewards disciplined buyers who test the commute during expected report hours.`,
    ]),
    seller_notes: mk(old.seller_notes, [
      `Sellers should price against current inventory and days on market rather than older peak assumptions.`,
      `Move-in-ready presentation and realistic pricing matter when buyers have leverage.`,
      `Military-adjacent commute convenience can be a listing strength if framed clearly.`,
    ]),
    investor_angles: mk(old.investor_angles, [
      `Military turnover near ${base} can support rental demand, but vacancy and maintenance should be modeled conservatively.`,
      `Investors should underwrite taxes, insurance, HOA, and property condition — not just acquisition price.`,
      `Practical commute corridors often outperform generic metro averages for military renter demand.`,
    ]),
    neighborhoods: n,
    target_neighborhoods: Array.isArray(old.target_neighborhoods) && old.target_neighborhoods.length ? old.target_neighborhoods : n,
    buyer_guidance: mk(old.buyer_guidance, [
      `Use all-in monthly payment as the primary screen.`,
      `Compare taxes, insurance, commute, school quality, and resale flexibility before locking a neighborhood.`,
      `Do not choose housing based only on distance to ${base}.`,
      `A slightly lower purchase price can materially improve monthly PCS flexibility.`,
    ]),
    seller_guidance: mk(old.seller_guidance, [
      `Price against active inventory and days on market.`,
      `Condition and presentation matter when buyers can compare more options.`,
      `Military commute convenience can help positioning if described accurately.`,
    ]),
    landlord_notes: mk(old.landlord_notes, [
      `Military renter demand can improve occupancy durability near ${base}.`,
      `Model vacancy, repairs, insurance, and turnover conservatively.`,
      `Stable spread matters more than headline affordability alone.`,
    ]),
  };
}

function buildBaseProfile(old, cfg, neighborhoods, taxRate, insuranceRate) {
  const short = cfg.short_name;
  const display = cfg.display_name;
  const city = cleanCity(old.city, cfg.city);
  const stateCode = pickStateCode(old, cfg);
  const stateName = STATE_NAMES[stateCode] || old.state || stateCode;
  const zip = old.zip || "";
  const marketLabel = old.market_label || `${cfg.submarket} Military Housing Market`;

  const recommended = neighborhoods.slice(0, 6).map((name, i) => ({
    name,
    type: i === 0 ? "primary_corridor" : "nearby_neighborhood",
    fit_summary: `${name} is a common ${short} PCS research corridor with base-specific commute, school, and affordability tradeoffs.`,
    best_for: ["Families", "Renters", "VA buyers", "Commute-focused households"],
    commute_band: "Approx. 10-35 minutes depending on gate, route, traffic, and exact address",
    likely_gate_logic: ["Primary Gate", "Commuter Gate depending on route"],
    bah_fit: i < 2 ? "medium" : "medium_high",
    family_fit: i < 3 ? "high" : "medium",
    single_airman_fit: "medium",
    va_buyer_fit: "medium_high",
    traffic_risk: "medium",
    watchouts: [
      "Verify exact commute during expected report hours",
      "School zones must be verified by exact address",
      "Property condition and monthly carrying costs vary by street and subdivision",
    ],
    pcsu_recommendation: `Treat ${name} as a planning candidate and validate with commute testing, school-zone verification, and all-in payment math.`,
  }));

  return {
    schema_version: "pcsu-base-profile-v1.0.0",
    base_id: cfg.base_id,
    base_name: cfg.name,
    display_name: display,
    short_name: short,
    branch: cfg.branch,
    joint_base: cfg.joint_base,
    parent_installation: cfg.parent_installation,
    city,
    state: stateName,
    state_abbr: stateCode,
    zip,
    metro: cfg.metro,
    market_label: marketLabel,
    installation_type: cfg.installation_type,
    host_or_major_command: cfg.host_command,
    primary_mission_summary: cfg.mission_summary,
    pcs_personality: old.military_lifestyle_fit?.description || `${short} PCS planning is mission-aware, commute-sensitive, BAH-conscious, and neighborhood-specific.`,
    base_bluf: old.market_bluf?.bluf_summary || `${short} housing is a gate-access, commute, BAH, school-zone, and neighborhood-fit decision — not just a metro average decision.`,
    user_positioning: {
      military_family_bluf: `Prioritize school-zone verification, BAH fit, commute testing, childcare access, and total monthly housing cost before signing near ${short}.`,
      single_airman_bluf: `Prioritize commute simplicity, affordability, rental flexibility, and access to daily services around ${city}.`,
      realtor_bluf: `Lead with BAH realism, commute risk, school-zone confidence, and all-in payment math for ${short} clients — not generic ${cfg.submarket} stats alone.`,
      investor_bluf: `Rental demand near ${short} is influenced by PCS turnover, training/permanent-party mix, and practical commute corridors.`,
    },
    base_map_image: {
      url: old.base_profile?.base_map_image?.url || "",
      alt: `PCSUnited public-facing ${display} base orientation map for gates, housing, major services, and nearby recommended neighborhoods.`,
      title: `${display} Base & Housing Overview`,
      caption: `Public-facing PCS orientation map for gates, housing, major services, and nearby neighborhood strategy.`,
      last_updated: "2026-06-26",
      status: "static_map_first",
      map_type: "schematic_orientation_map",
      confidence: "medium",
      safety_note: "This is not an official DoD map. It is a public-facing PCS orientation graphic using publicly available information and should not be used for access control, emergency routing, or official navigation.",
    },
    official_links: {
      base_home: cfg.official_home,
      housing: `https://www.housing.af.mil/`,
      visitor_info: cfg.official_home,
      exchange: "https://www.shopmyexchange.com/",
      commissary: "https://corp.commissaries.com/",
      medical: `${cfg.official_home}`,
    },
    visitor_control_center: {
      name: `${display} Visitor Control Center`,
      building: "Verify current building",
      address: `Verify current VCC address at ${display}, ${city}, ${stateCode} ${zip}`,
      phone: "Verify with official installation visitor information",
      hours: "Verify official gate and visitor hours before travel",
      best_for: ["Visitors", "Newcomers", "Family members without routine installation access", "PCS arrival planning"],
      map_label: "Visitor Control Center",
      map_zone: "primary visitor access area",
      note: `Use official ${display} visitor information before arrival. Access requirements, sponsor rules, gate procedures, and hours can change.`,
    },
    gates: [
      {
        name: "Main Gate",
        type: "primary_gate",
        status: "verify_current_status",
        hours: "Verify official gate hours before travel",
        map_label: "Main Gate",
        map_zone: "primary access area",
        best_for: ["Visitors", "Newcomers", "General base access"],
        commute_notes: `Primary newcomer and visitor routing anchor for many ${short} PCS households.`,
        user_warning: `Verify current gate status with official ${display} sources before travel.`,
      },
      {
        name: "Commuter Gate",
        type: "commuter_gate",
        status: "verify_current_status",
        hours: "Verify official gate hours before travel",
        map_label: "Commuter Gate",
        map_zone: "commuter access area",
        best_for: ["Daily commuters", "Off-base residents", "Alternate access"],
        commute_notes: "May support daily commuting depending on duty location and current gate rules.",
        user_warning: "Gate hours and route suitability should be verified before relying on this gate.",
      },
    ],
    major_services: [
      {
        name: `${display} Medical Clinic / Medical Group`,
        category: "medical",
        map_label: "Medical",
        address: "Verify current medical facility routing before travel",
        phone: "Verify through official TRICARE / installation medical source",
        hours: "Verify current clinic and pharmacy hours",
        best_for: ["Primary military medical services", "Family medical orientation", "PCS arrival healthcare setup"],
        map_zone: "medical support area",
        user_note: "Verify emergency care options, pharmacy procedures, and clinic availability directly with official medical sources.",
      },
      {
        name: "Installation Commissary",
        category: "commissary",
        map_label: "Commissary",
        address: "Verify current commissary address before travel",
        phone: "Verify current phone number with DeCA",
        best_for: ["Grocery savings", "Family shopping", "BAH and monthly budget planning"],
        map_zone: "main services / retail area",
        user_note: "Commissary access can materially affect monthly food budget for eligible users.",
      },
      {
        name: "Installation Exchange",
        category: "exchange_bx",
        map_label: "BX / Exchange",
        address: "Verify current Exchange location before travel",
        phone: "Verify current phone number with AAFES",
        hours: "Verify current Exchange hours",
        best_for: ["Shopping", "Uniform-related errands", "Food court / daily services", "Family convenience"],
        map_zone: "main services / retail area",
        user_note: "Important daily-life anchor for new arrivals and families.",
      },
      {
        name: "Military Housing Office",
        category: "housing_office",
        map_label: "Housing Office",
        address: "Verify current housing office address before travel",
        phone: "Verify with official housing office contact",
        hours: "Monday-Friday typical business hours; verify holidays",
        best_for: ["On-base housing questions", "Off-base housing guidance", "PCS housing counseling"],
        map_zone: "housing support area",
        user_note: "Contact the housing office before committing to on-base or off-base housing.",
      },
    ],
    on_base_housing: {
      housing_type: "Military housing support environment; verify privatized housing and waitlist details officially",
      housing_office_name: `${display} Military Housing Office`,
      housing_office_address: "Verify current housing office address before travel",
      housing_office_phone: "Verify with official housing office contact",
      housing_office_email: "Verify with official housing office contact",
      housing_office_hours: "Monday-Friday typical business hours; verify holidays",
      map_label: "Family Housing / Housing Office",
      map_zone: "housing support area",
      best_for: ["Families prioritizing proximity", "New arrivals wanting simplicity", "Users comparing on-base vs off-base monthly cost"],
      watchouts: [
        "Availability and waitlists can change",
        "On-base housing may capture BAH differently than off-base renting",
        "Pet policies and breed restrictions should be verified",
        "School assignment must be verified by exact address",
      ],
      pcsu_strategy_note: `Compare on-base housing against off-base rent and mortgage options near ${short}. The best choice depends on rank, dependents, BAH, commute tolerance, school priorities, and assignment length.`,
    },
    recommended_neighborhoods: recommended,
    commute_intelligence: {
      commute_bluf: `For ${short}, gate access and traffic timing often matter more than straight-line distance.`,
      primary_commute_factors: ["Gate hours", "Morning inbound traffic", "Afternoon outbound traffic", "School drop-off timing", "Exact duty location", "Shift schedule or early report time"],
      commute_bands: [
        { label: "Close-in", range: "0-15 minutes", fit: "Best for users prioritizing proximity and daily convenience", watchout: "Close-in areas still need property, school, and safety screening." },
        { label: "Balanced", range: "15-30 minutes", fit: "Often the best balance between housing quality, services, and commute", watchout: "Traffic and gate choice can still change the real commute." },
        { label: "Lifestyle tradeoff", range: "30-45+ minutes", fit: "May work for families wanting larger homes or specific schools", watchout: "Can become painful for early reporting or frequent base errands." },
      ],
      gate_selection_logic: [
        "Start with the user's likely duty location.",
        "Identify the most realistic primary gate.",
        "Compare the commute during the user's actual report window.",
        "Do not choose a neighborhood based only on mileage.",
      ],
      user_instruction: "Before signing a lease or contract, test the commute from the exact property address to the expected gate during the same time window you would normally report to work.",
    },
    bah_market_reality: {
      bah_bluf: `${short} housing decisions should compare BAH against rent, mortgage, utilities, debt, and commute. BAH is a decision filter, not a promise of affordability.`,
      recommended_calculations: ["BAH with dependents vs estimated rent", "BAH without dependents vs estimated rent", "BAH vs estimated mortgage payment", "Total housing cost vs 30% income lane", "Residual monthly income after expenses and housing", "Rent vs buy break-even horizon"],
      pcsu_decision_outputs: ["Rent", "Buy", "Wait", "Widen search", "Reduce target price", "Consider roommate", "Use on-base housing as comparison"],
      base_tab_message: `Show BAH as a decision filter for ${short}, not a promise of affordability. Push users into PCSUnited financial calculators when the housing gap looks tight.`,
    },
    family_readiness: {
      family_bluf: `Families PCSing to ${short} should verify school zones, childcare options, medical access, commute reality, and housing availability before choosing a neighborhood.`,
      school_guidance: {
        school_zone_warning: "Always verify school assignment by exact address before signing a lease or purchase contract.",
        nearby_school_district_note: old.school_quality?.off_base || `School districts around ${cfg.submarket} vary by exact address; verify before housing commitment.`,
        school_liaison_note: "Use official school liaison resources where available for military school transition support.",
      },
      childcare_guidance: {
        cdc_note: "Child Development Center availability, waitlists, and eligibility should be verified directly with official base resources.",
        youth_program_note: "Youth programs and school-age care can materially affect family housing decisions.",
      },
      medical_guidance: {
        primary_medical_anchor: `${display} medical services`,
        medical_warning: "Verify clinic availability, pharmacy procedures, and emergency care options directly with official medical sources.",
      },
      spouse_employment_note: old.snapshot?.population_metro
        ? `The broader ${cfg.submarket} metro may offer spouse employment options, but commute, childcare, and credentialing should be considered together.`
        : `Spouse employment options should be evaluated alongside commute, childcare, and credentialing needs.`,
    },
    arrival_checklist: {
      before_arrival: [
        "Verify official gate and Visitor Control Center hours.",
        "Confirm sponsor contact and unit reporting instructions.",
        "Confirm lodging or temporary housing plan.",
        "Review housing office guidance before signing any lease or purchase contract.",
        "Compare BAH against rent, mortgage, utilities, and debt.",
        "Shortlist neighborhoods by likely gate and commute band.",
        "Verify school zones by exact property address.",
      ],
      first_week: [
        "Complete unit check-in requirements.",
        "Visit or contact the housing office if still deciding between on-base and off-base options.",
        "Confirm medical/pharmacy setup.",
        "Drive the commute from target neighborhoods during expected report time.",
        "Tour properties before committing when possible.",
      ],
      first_30_days: [
        "Finalize housing only after comparing commute, BAH fit, school zones, and total monthly cost.",
        "Save emergency, medical, gate, and housing office contact information.",
        "Update PCSUnited profile and financial readiness dashboard with final housing numbers.",
      ],
    },
    pcs_watchouts: [
      { title: "Gate hours can change", severity: "high", message: `Use official ${display} gate pages before travel or commute planning.` },
      { title: "Distance is not the same as commute", severity: "high", message: "Neighborhoods should be compared by realistic gate access and traffic timing." },
      { title: "School zones are address-specific", severity: "high", message: "Never assume a school assignment from neighborhood name alone." },
      { title: "BAH is not the full affordability picture", severity: "high", message: "Users must compare rent or mortgage against income, debt, expenses, utilities, and savings goals." },
      { title: "Property taxes and insurance shape true payment", severity: "medium_high", message: `In this market, taxes (~${pctAlias(taxRate)}%) and insurance assumptions must be included in all-in comparisons.` },
    ],
    realtor_intelligence: {
      buyer_personas: [
        { persona: "First-time VA buyer", likely_questions: [`Can I afford to buy near ${short}?`, "Which areas fit my BAH?", "Should I rent first?"], agent_strategy: "Lead with BAH realism, monthly payment clarity, commute testing, and VA loan education." },
        { persona: "E-5 / E-6 family with dependents", likely_questions: ["Where do military families usually live?", "Which school zones should I research?", "Is on-base housing better?"], agent_strategy: `Compare top ${short} corridors against commute, schools, and all-in monthly cost.` },
        { persona: "Single airman / short-term renter", likely_questions: ["What is close and affordable?", "Do I need a roommate?"], agent_strategy: "Keep recommendations practical: commute, rent, safety, property condition, and lease flexibility." },
      ],
      listing_angles: [`Near ${display}`, "Military PCS-friendly positioning", "BAH-conscious rental or purchase option", "Commute-conscious neighborhood positioning"],
      common_objections: ["Commute uncertainty", "School-zone confusion", "Affordability gap between BAH and mortgage", "Short assignment timeline"],
      recommended_agent_behavior: [
        "Do not overpromise commute times.",
        "Always recommend school-zone verification by address.",
        "Use payment math, not just listing price.",
        `Avoid generic ${cfg.submarket} advice when the user is assigned to ${short}.`,
      ],
    },
    data_confidence: {
      overall: "medium",
      gate_data: "medium_low",
      visitor_control_center: "medium_low",
      housing_office: "medium",
      major_services: "medium",
      recommended_neighborhoods: "curated_pcsunited_intelligence",
      commute_bands: "estimated_requires_address_level_validation",
      bah_market_guidance: "strategy_layer_requires_rank_family_and_financial_inputs",
      last_reviewed: "2026-06-26",
    },
    source_notes: [
      { label: `Official ${display} website`, type: "official", url: cfg.official_home, used_for: ["Installation overview", "Visitor guidance", "Official reference links"] },
      { label: "Air Force Housing", type: "official", url: "https://www.housing.af.mil/", used_for: ["Housing office reference", "On-base housing guidance"] },
      { label: "PCSUnited market planning layer", type: "planning", url: "", used_for: ["Market metrics", "BAH guidance", "Neighborhood orientation", "PCS watchouts"] },
    ],
    disclaimer: "PCSUnited is not an official DoD source. This Base tab is intended for public-facing PCS orientation, housing research, and relocation planning. Users should verify gate hours, access requirements, medical services, housing availability, school zones, and official procedures directly with the installation or official service provider before travel, lease signing, or home purchase.",
  };
}

function upgradeFile(fileName) {
  const cfg = BASE_CONFIG[fileName];
  if (!cfg) throw new Error(`Missing config for ${fileName}`);

  const filePath = path.join(CITIES_DIR, `${fileName}.json`);
  const old = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const stateCode = pickStateCode(old, cfg);
  const stateName = STATE_NAMES[stateCode] || (String(old.state).length > 2 ? old.state : stateCode);
  const city = cleanCity(old.city, cfg.city);
  const medianHome = old.snapshot?.median_home_price ?? old.avg_home_value ?? old.housing?.market?.median_sale_price_current ?? 0;
  const medianRent = old.by_bedroom?.["3"]?.rent_monthly?.avg ?? old.metrics?.median_rent ?? null;
  const taxRate = normalizeDecimalRate(old.property_tax_rate ?? old.metrics?.property_tax_rate);
  const insuranceRate = normalizeDecimalRate(old.insurance_rate);
  const insuranceAnnual = Math.round((old.avg_home_value || medianHome) * insuranceRate) || null;
  const neighborhoods = deriveNeighborhoods(old, cfg);
  const guidance = buildGuidanceArrays(old, cfg, neighborhoods);
  const marketMetrics = buildMarketMetrics(old, medianHome, medianRent, taxRate);

  const upgraded = {
    ...old,
    slug: old.slug || cfg.slug,
    name: old.name || cfg.name,
    city: old.city && old.city.includes("AFB") ? old.city : city,
    submarket: old.submarket || cfg.submarket,
    place: old.place && old.place.includes("AFB") ? old.place : cfg.place,
    place_detail: old.place_detail || cfg.place_detail,
    state: stateName,
    state_code: stateCode,
    profile: old.profile || `Military-friendly ${cfg.name} housing snapshot anchored to ${cfg.submarket}, built for PCSUnited base-level market overviews.`,
    base_image_url: old.base_image_url || "",
    property_tax_rate: taxRate,
    property_tax_rate_percent: old.property_tax_rate_percent ?? pctAlias(taxRate),
    insurance_rate: insuranceRate,
    insurance_rate_percent: old.insurance_rate_percent ?? pctAlias(insuranceRate),
    market_metrics: marketMetrics,
    metrics: {
      ...(old.metrics || {}),
      median_list_price: old.metrics?.median_list_price ?? marketMetrics.median_list_price,
      median_sold_price: old.metrics?.median_sold_price ?? marketMetrics.median_sold_price,
      median_sale_price: old.metrics?.median_sale_price ?? marketMetrics.median_sale_price,
      days_on_market: old.metrics?.days_on_market ?? marketMetrics.days_on_market,
      inventory_months: old.metrics?.inventory_months ?? null,
      price_per_sqft: old.metrics?.price_per_sqft ?? marketMetrics.price_per_sqft,
      median_rent: old.metrics?.median_rent ?? medianRent,
      active_listings_total: old.metrics?.active_listings_total ?? marketMetrics.active_listings_total,
      property_tax_rate: old.metrics?.property_tax_rate ?? taxRate,
      as_of: old.metrics?.as_of ?? "2026-03",
    },
    ownership_costs: old.ownership_costs || {
      property_tax_rate: taxRate,
      property_tax_rate_percent: pctAlias(taxRate),
      insurance_rate_estimate: insuranceRate,
      insurance_rate_percent: pctAlias(insuranceRate),
      insurance_annual_default: insuranceAnnual,
      hoa_monthly_default: old.hoa_monthly ?? 0,
      notes: [
        `Property taxes and insurance materially affect true monthly ownership cost near ${cfg.short_name}.`,
        "Insurance and HOA should be included in all-in housing cost comparisons.",
      ],
    },
    costs: old.costs || {
      property_tax_rate: taxRate,
      insurance_annual_default: insuranceAnnual,
      hoa_monthly_default: old.hoa_monthly ?? 0,
    },
    rental_metrics: old.rental_metrics || {
      median_rent: medianRent,
      vacancy_rate_percent: old.rental_vacancy?.rate_percent ?? null,
      notes: old.rental_vacancy?.notes || `Planning estimate for 3-bedroom military-family rentals near ${cfg.short_name}.`,
    },
    summary_points: buildSummaryPoints(old, cfg, neighborhoods),
    ...guidance,
    base_profile: buildBaseProfile(old, cfg, neighborhoods, taxRate, insuranceRate),
    sources: {
      ...(old.sources || {}),
      base_profile: old.sources?.base_profile || {
        provider: "PCSUnited planning profile using public-facing installation, housing, and market research structure",
        as_of: "2026-06",
      },
    },
    compatibility: {
      orozco_realty_ready: true,
      pcsunited_ready: true,
      intended_primary_slug: cfg.slug,
      parser_notes: [
        `This ${cfg.name} file was upgraded to the Lackland-style PCSUnited schema with slug, name, state_code, profile, market_metrics, metrics, ownership_costs, costs, rental_metrics, summary_points, risks, opportunities, buyer_notes, seller_notes, investor_angles, and guidance arrays.`,
        `${cfg.submarket} is preserved as the surrounding metro/submarket context; base-specific market data was retained.`,
        "property_tax_rate and insurance_rate are normalized to decimal form for deterministic math, with percent aliases preserved for display compatibility.",
        "This file now includes base_profile for the PCSUnited Base tab, including gate orientation, visitor control center, major services, on-base housing, recommended nearby neighborhoods, commute intelligence, BAH market guidance, PCS watchouts, and source notes.",
      ],
    },
  };

  const ordered = {};
  for (const key of TOP_LEVEL_ORDER) {
    if (upgraded[key] !== undefined) ordered[key] = upgraded[key];
  }
  for (const key of Object.keys(upgraded)) {
    if (!(key in ordered)) ordered[key] = upgraded[key];
  }

  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2) + "\n");
  return fileName;
}

function validate(fileName) {
  const filePath = path.join(CITIES_DIR, `${fileName}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const required = ["slug", "name", "market_metrics", "metrics", "base_profile", "compatibility", "summary_points"];
  const missing = required.filter((k) => !data[k]);
  if (missing.length) throw new Error(`${fileName} missing: ${missing.join(", ")}`);
  if (data.property_tax_rate >= 0.1) throw new Error(`${fileName} property_tax_rate not normalized: ${data.property_tax_rate}`);
  if (!data.compatibility.intended_primary_slug) throw new Error(`${fileName} missing intended_primary_slug`);
}

const results = FILES.map(upgradeFile);
results.forEach(validate);
console.log(`Upgraded and validated ${results.length} files.`);
