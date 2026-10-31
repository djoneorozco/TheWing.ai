// Derived planning coordinates from existing base inventories; tests detect drift.
// Base centers are approximate, not verified installation gate routes.
export const PCS_BASE_COORDINATES = Object.freeze({
  "Andrews AFB": {
    "latitude": 38.8108,
    "longitude": -76.8669,
    "region": "MD",
    "location": "Camp Springs, MD",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Barksdale AFB": {
    "latitude": 32.5018,
    "longitude": -93.6627,
    "region": "LA",
    "location": "Bossier City, LA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Beale AFB": {
    "latitude": 39.1361,
    "longitude": -121.4366,
    "region": "CA",
    "location": "Marysville, CA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Cannon AFB": {
    "latitude": 34.3828,
    "longitude": -103.3221,
    "region": "NM",
    "location": "Clovis, NM",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Charleston AFB": {
    "latitude": 32.8986,
    "longitude": -80.0405,
    "region": "SC",
    "location": "Charleston, SC",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Davis-Monthan AFB": {
    "latitude": 32.1665,
    "longitude": -110.8832,
    "region": "AZ",
    "location": "Tucson, AZ",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Dover AFB": {
    "latitude": 39.1295,
    "longitude": -75.466,
    "region": "DE",
    "location": "Dover, DE",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Dyess AFB": {
    "latitude": 32.4208,
    "longitude": -99.8546,
    "region": "TX",
    "location": "Abilene, TX",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Eglin AFB": {
    "latitude": 30.4832,
    "longitude": -86.5254,
    "region": "FL",
    "location": "Valparaiso, FL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Elmendorf AFB": {
    "latitude": 61.25,
    "longitude": -149.8065,
    "region": "AK",
    "location": "Anchorage, AK",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "F.E-Warren AFB": {
    "latitude": 41.1339,
    "longitude": -104.866,
    "region": "WY",
    "location": "Cheyenne, WY",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Fairchild AFB": {
    "latitude": 47.6151,
    "longitude": -117.6558,
    "region": "WA",
    "location": "Spokane, WA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Fort-Sam-Houston AFB": {
    "latitude": 29.4594,
    "longitude": -98.4151,
    "region": "TX",
    "location": "San Antonio, TX",
    "coordinateSource": "PCS-Calculator/pcs-calculator.js"
  },
  "Holloman AFB": {
    "latitude": 32.8525,
    "longitude": -106.1065,
    "region": "NM",
    "location": "Alamogordo, NM",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Hurlburt AFB": {
    "latitude": 30.4278,
    "longitude": -86.6893,
    "region": "FL",
    "location": "Mary Esther, FL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Keesler AFB": {
    "latitude": 30.4104,
    "longitude": -88.9244,
    "region": "MS",
    "location": "Biloxi, MS",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Kirtland AFB": {
    "latitude": 35.0402,
    "longitude": -106.6092,
    "region": "NM",
    "location": "Albuquerque, NM",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Lackland AFB": {
    "latitude": 29.3842,
    "longitude": -98.5811,
    "region": "TX",
    "location": "San Antonio, TX",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Langley AFB": {
    "latitude": 37.0838,
    "longitude": -76.3605,
    "region": "VA",
    "location": "Hampton, VA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Laughlin AFB": {
    "latitude": 29.3595,
    "longitude": -100.778,
    "region": "TX",
    "location": "Del Rio, TX",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Little-Rock AFB": {
    "latitude": 34.9169,
    "longitude": -92.1497,
    "region": "AR",
    "location": "Little Rock AFB, AR",
    "coordinateSource": "PCS-Calculator/pcs-calculator.js"
  },
  "Luke AFB": {
    "latitude": 33.535,
    "longitude": -112.3832,
    "region": "AZ",
    "location": "Glendale, AZ",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "MacDill AFB": {
    "latitude": 27.8493,
    "longitude": -82.5212,
    "region": "FL",
    "location": "Tampa, FL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Malmstrom AFB": {
    "latitude": 47.5053,
    "longitude": -111.1873,
    "region": "MT",
    "location": "Great Falls, MT",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Maxwell AFB": {
    "latitude": 32.3829,
    "longitude": -86.3658,
    "region": "AL",
    "location": "Montgomery, AL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "McConnell AFB": {
    "latitude": 37.6231,
    "longitude": -97.2672,
    "region": "KS",
    "location": "Wichita, KS",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "McGuire AFB": {
    "latitude": 40.0156,
    "longitude": -74.5917,
    "region": "NJ",
    "location": "Wrightstown, NJ",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Minot AFB": {
    "latitude": 48.4158,
    "longitude": -101.358,
    "region": "ND",
    "location": "Minot, ND",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Moody AFB": {
    "latitude": 30.9678,
    "longitude": -83.193,
    "region": "GA",
    "location": "Valdosta, GA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Mountain-Home AFB": {
    "latitude": 43.0436,
    "longitude": -115.8724,
    "region": "ID",
    "location": "Mountain Home, ID",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Nellis AFB": {
    "latitude": 36.2362,
    "longitude": -115.0343,
    "region": "NV",
    "location": "Las Vegas, NV",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Offutt AFB": {
    "latitude": 41.1183,
    "longitude": -95.9125,
    "region": "NE",
    "location": "Bellevue, NE",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Peterson AFB": {
    "latitude": 38.8236,
    "longitude": -104.7006,
    "region": "CO",
    "location": "Colorado Springs, CO",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Randolph AFB": {
    "latitude": 29.5297,
    "longitude": -98.2789,
    "region": "TX",
    "location": "San Antonio, TX",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Robins AFB": {
    "latitude": 32.6401,
    "longitude": -83.5919,
    "region": "GA",
    "location": "Warner Robins, GA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Scott AFB": {
    "latitude": 38.5452,
    "longitude": -89.8352,
    "region": "IL",
    "location": "Belleville, IL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Seymour-Johnson AFB": {
    "latitude": 35.3394,
    "longitude": -77.9606,
    "region": "NC",
    "location": "Goldsboro, NC",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Shaw AFB": {
    "latitude": 33.9727,
    "longitude": -80.4706,
    "region": "SC",
    "location": "Sumter, SC",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Sheppard AFB": {
    "latitude": 33.9888,
    "longitude": -98.4919,
    "region": "TX",
    "location": "Wichita Falls, TX",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Tinker AFB": {
    "latitude": 35.4147,
    "longitude": -97.3866,
    "region": "OK",
    "location": "Oklahoma City, OK",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Travis AFB": {
    "latitude": 38.2627,
    "longitude": -121.9275,
    "region": "CA",
    "location": "Fairfield, CA",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Tyndall AFB": {
    "latitude": 30.0696,
    "longitude": -85.5754,
    "region": "FL",
    "location": "Panama City, FL",
    "coordinateSource": "Base-Map/base-map.js"
  },
  "Whiteman AFB": {
    "latitude": 38.7303,
    "longitude": -93.5482,
    "region": "MO",
    "location": "Knob Noster, MO",
    "coordinateSource": "PCS-Calculator/pcs-calculator.js"
  },
  "Wright-Patterson AFB": {
    "latitude": 39.8261,
    "longitude": -84.0483,
    "region": "OH",
    "location": "Dayton, OH",
    "coordinateSource": "Base-Map/base-map.js"
  }
});
