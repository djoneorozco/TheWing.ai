// netlify/functions/arcgis.js
// ============================================================
// TheWing.ai / PCSUnited • ArcGIS API Proxy
// v2.0.0 • Base Tab Ready
//
// PURPOSE
// - Keeps ARCGIS_API_KEY secure in Netlify
// - Supports Base-tab nearby intelligence
// - Supports geocode, reverse geocode, places, route
// - Adds base-nearby and base-profile helper actions
//
// REQUIRED NETLIFY ENV VAR:
// ARCGIS_API_KEY
//
// EXAMPLES:
// /api/arcgis?action=geocode&address=Kirtland Air Force Base, Albuquerque, NM
// /api/arcgis?action=places&lat=35.0402&lon=-106.6090&category=hospital&limit=5
// /api/arcgis?action=base-nearby&lat=35.0402&lon=-106.6090
// /api/arcgis?action=base-profile&address=Kirtland Air Force Base, Albuquerque, NM
// /api/arcgis?action=route&fromLat=35.0402&fromLon=-106.6090&toLat=35.0844&toLon=-106.6504
// ============================================================

const ARCGIS_GEOCODE_BASE =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

const ARCGIS_PLACES_BASE =
  "https://places-api.arcgis.com/arcgis/rest/services/places-service/v1";

const ARCGIS_ROUTE_BASE =
  "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
  "Vary": "Origin"
};

const CATEGORY_SEARCH_TEXT = {
  hospital: "hospital",
  medical: "hospital",
  clinic: "medical clinic",
  emergency: "emergency room",
  airport: "airport",
  school: "school",
  schools: "school",
  grocery: "grocery store",
  groceries: "grocery store",
  supermarket: "supermarket",
  bank: "bank",
  atm: "atm",
  park: "park",
  parks: "park",
  restaurant: "restaurant",
  food: "restaurant",
  childcare: "child care",
  daycare: "daycare",
  pharmacy: "pharmacy",
  gas: "gas station",
  fuel: "gas station",
  shopping: "shopping",
  retail: "shopping",
  gym: "gym",
  fitness: "fitness center",
  hotel: "hotel",
  lodging: "hotel",
  library: "library",
  police: "police station",
  fire: "fire station",
  postoffice: "post office",
  post_office: "post office",
  va: "VA clinic",
  veteran: "VA clinic"
};

const BASE_NEARBY_CATEGORIES = [
  {
    key: "medical",
    label: "Nearby Medical",
    category: "hospital",
    radius: 25000,
    limit: 5
  },
  {
    key: "airport",
    label: "Nearby Airport / Travel",
    category: "airport",
    radius: 50000,
    limit: 5
  },
  {
    key: "schools",
    label: "Nearby Schools",
    category: "school",
    radius: 25000,
    limit: 5
  },
  {
    key: "grocery",
    label: "Grocery",
    category: "grocery",
    radius: 16000,
    limit: 5
  },
  {
    key: "banks",
    label: "Banks",
    category: "bank",
    radius: 16000,
    limit: 5
  },
  {
    key: "parks",
    label: "Parks",
    category: "park",
    radius: 16000,
    limit: 5
  },
  {
    key: "restaurants",
    label: "Food / Restaurants",
    category: "restaurant",
    radius: 12000,
    limit: 5
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    category: "pharmacy",
    radius: 16000,
    limit: 5
  },
  {
    key: "childcare",
    label: "Childcare",
    category: "childcare",
    radius: 16000,
    limit: 5
  }
];

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanLimit(value, fallback = 10, max = 50) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.min(Math.floor(n), max);
}

function cleanRadius(value, fallback = 10000, max = 100000) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.min(Math.floor(n), max);
}

function getSearchText(category, fallbackSearchText = "") {
  const cleanCategory = cleanString(category).toLowerCase();
  const cleanSearchText = cleanString(fallbackSearchText);

  if (cleanSearchText) return cleanSearchText;

  return CATEGORY_SEARCH_TEXT[cleanCategory] || cleanCategory || "";
}

function isLikelyCategoryId(value) {
  const v = cleanString(value);

  if (!v) return false;

  // ArcGIS category IDs are commonly UUID-like.
  return /^[a-f0-9-]{20,}$/i.test(v);
}

function milesFromMeters(value) {
  const n = cleanNumber(value);

  if (n === null) return null;

  return n / 1609.344;
}

function normalizeCandidate(candidate = {}) {
  const attrs = candidate.attributes || {};
  const location = candidate.location || {};

  const lat =
    cleanNumber(location.y) ??
    cleanNumber(candidate.y) ??
    cleanNumber(attrs.y) ??
    cleanNumber(attrs.Y);

  const lon =
    cleanNumber(location.x) ??
    cleanNumber(candidate.x) ??
    cleanNumber(attrs.x) ??
    cleanNumber(attrs.X);

  return {
    address:
      candidate.address ||
      attrs.Match_addr ||
      attrs.LongLabel ||
      attrs.ShortLabel ||
      attrs.PlaceName ||
      "",
    score: cleanNumber(candidate.score),
    type:
      attrs.Addr_type ||
      attrs.Type ||
      attrs.Place_addr ||
      "",
    city:
      attrs.City ||
      attrs.Subregion ||
      "",
    state:
      attrs.Region ||
      attrs.RegionAbbr ||
      "",
    postal:
      attrs.Postal ||
      "",
    country:
      attrs.Country ||
      "",
    lat,
    lon,
    raw: candidate
  };
}

function normalizePlace(place = {}) {
  const attrs = place.attributes || place.place || place || {};
  const location = place.location || place.geometry || attrs.location || {};
  const categories = attrs.categories || place.categories || [];

  const rawDistance =
    attrs.distance ||
    attrs.Distance ||
    attrs.distanceMeters ||
    place.distance ||
    place.distanceMeters;

  let distanceMeters = cleanNumber(rawDistance);
  let distanceMiles = null;

  if (distanceMeters !== null) {
    distanceMiles = distanceMeters > 100
      ? milesFromMeters(distanceMeters)
      : distanceMeters;
  }

  const name =
    attrs.name ||
    attrs.Name ||
    attrs.PlaceName ||
    attrs.placeName ||
    attrs.label ||
    attrs.Match_addr ||
    attrs.address ||
    "Unnamed place";

  const address =
    attrs.address ||
    attrs.Address ||
    attrs.Match_addr ||
    attrs.formattedAddress ||
    attrs.streetAddress ||
    attrs.fullAddress ||
    attrs.place_addr ||
    "";

  const lat =
    cleanNumber(location.y) ??
    cleanNumber(location.lat) ??
    cleanNumber(location.latitude) ??
    cleanNumber(attrs.y) ??
    cleanNumber(attrs.lat) ??
    cleanNumber(attrs.latitude);

  const lon =
    cleanNumber(location.x) ??
    cleanNumber(location.lon) ??
    cleanNumber(location.lng) ??
    cleanNumber(location.longitude) ??
    cleanNumber(attrs.x) ??
    cleanNumber(attrs.lon) ??
    cleanNumber(attrs.lng) ??
    cleanNumber(attrs.longitude);

  return {
    name,
    address,
    categories,
    distanceMeters,
    distanceMiles,
    lat,
    lon,
    raw: place
  };
}

function normalizePlacesPayload(data) {
  const candidates =
    data?.results ||
    data?.places ||
    data?.candidates ||
    data?.features ||
    data?.data ||
    [];

  if (!Array.isArray(candidates)) return [];

  return candidates.map(normalizePlace).filter((item) => item.name);
}

async function fetchJson(url) {
  const response = await fetch(url);

  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = {
      error: "ArcGIS returned a non-JSON response"
    };
  }

  return {
    response,
    data
  };
}

async function geocodeAddress({ address, limit, apiKey }) {
  const url =
    `${ARCGIS_GEOCODE_BASE}/findAddressCandidates?` +
    new URLSearchParams({
      f: "json",
      singleLine: address,
      outFields:
        "Match_addr,Addr_type,PlaceName,City,Region,RegionAbbr,Postal,Country,LongLabel,ShortLabel",
      maxLocations: String(cleanLimit(limit, 5, 20)),
      token: apiKey
    });

  const { response, data } = await fetchJson(url);

  const candidates = Array.isArray(data?.candidates)
    ? data.candidates.map(normalizeCandidate)
    : [];

  return {
    response,
    data,
    normalized: {
      candidates,
      best: candidates[0] || null
    }
  };
}

async function reverseGeocode({ lat, lon, apiKey }) {
  const url =
    `${ARCGIS_GEOCODE_BASE}/reverseGeocode?` +
    new URLSearchParams({
      f: "json",
      location: `${lon},${lat}`,
      outSR: "4326",
      token: apiKey
    });

  const { response, data } = await fetchJson(url);

  return {
    response,
    data,
    normalized: {
      address: data?.address || null,
      location: data?.location || null
    }
  };
}

async function placesNearPoint({
  lat,
  lon,
  category,
  categoryIds,
  searchText,
  radius,
  limit,
  apiKey
}) {
  const cleanCategoryIds = cleanString(categoryIds);
  const cleanCategory = cleanString(category);

  const params = new URLSearchParams({
    f: "json",
    x: String(lon),
    y: String(lat),
    radius: String(cleanRadius(radius, 10000, 100000)),
    pageSize: String(cleanLimit(limit, 10, 50)),
    token: apiKey
  });

  if (cleanCategoryIds) {
    params.set("categoryIds", cleanCategoryIds);
  } else if (isLikelyCategoryId(cleanCategory)) {
    params.set("categoryIds", cleanCategory);
  } else {
    const text = getSearchText(cleanCategory, searchText);
    if (text) params.set("searchText", text);
  }

  const url =
    `${ARCGIS_PLACES_BASE}/places/near-point?` +
    params.toString();

  const { response, data } = await fetchJson(url);

  const places = normalizePlacesPayload(data);

  return {
    response,
    data,
    normalized: {
      places,
      count: places.length,
      category: cleanCategory || cleanCategoryIds || cleanString(searchText),
      radiusMeters: cleanRadius(radius, 10000, 100000)
    }
  };
}

async function routeBetweenPoints({
  fromLat,
  fromLon,
  toLat,
  toLon,
  apiKey
}) {
  const url =
    `${ARCGIS_ROUTE_BASE}/solve?` +
    new URLSearchParams({
      f: "json",
      stops: `${fromLon},${fromLat};${toLon},${toLat}`,
      returnDirections: "true",
      returnRoutes: "true",
      returnStops: "false",
      returnBarriers: "false",
      token: apiKey
    });

  const { response, data } = await fetchJson(url);

  const route =
    data?.routes?.features?.[0]?.attributes ||
    data?.routes?.features?.[0] ||
    null;

  const summary = {
    totalMinutes:
      cleanNumber(route?.Total_TravelTime) ??
      cleanNumber(route?.TotalTime) ??
      null,
    totalMiles:
      cleanNumber(route?.Total_Miles) ??
      cleanNumber(route?.TotalLength) ??
      null
  };

  return {
    response,
    data,
    normalized: {
      summary,
      route
    }
  };
}

async function baseNearby({ lat, lon, apiKey }) {
  const grouped = {};

  const results = await Promise.allSettled(
    BASE_NEARBY_CATEGORIES.map(async (item) => {
      const result = await placesNearPoint({
        lat,
        lon,
        category: item.category,
        radius: item.radius,
        limit: item.limit,
        apiKey
      });

      return {
        key: item.key,
        label: item.label,
        category: item.category,
        places: result.normalized.places,
        rawOk: result.response.ok
      };
    })
  );

  results.forEach((result, index) => {
    const fallback = BASE_NEARBY_CATEGORIES[index];

    if (result.status === "fulfilled") {
      grouped[result.value.key] = {
        label: result.value.label,
        category: result.value.category,
        places: result.value.places,
        ok: result.value.rawOk
      };
    } else {
      grouped[fallback.key] = {
        label: fallback.label,
        category: fallback.category,
        places: [],
        ok: false,
        error: result.reason?.message || String(result.reason)
      };
    }
  });

  return grouped;
}

exports.handler = async function (event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: ""
      };
    }

    if (event.httpMethod !== "GET") {
      return json(405, {
        ok: false,
        error: "Method not allowed. Use GET."
      });
    }

    const ARCGIS_API_KEY = process.env.ARCGIS_API_KEY;

    if (!ARCGIS_API_KEY) {
      return json(500, {
        ok: false,
        error: "Missing ARCGIS_API_KEY"
      });
    }

    const params = event.queryStringParameters || {};
    const action = cleanString(params.action || "geocode").toLowerCase();

    // =========================================================
    // GEOCODE
    // =========================================================
    if (action === "geocode") {
      const address = cleanString(params.address);

      if (!address) {
        return json(400, {
          ok: false,
          error: "Missing address",
          example: "/api/arcgis?action=geocode&address=Kirtland Air Force Base, Albuquerque, NM"
        });
      }

      const result = await geocodeAddress({
        address,
        limit: params.limit,
        apiKey: ARCGIS_API_KEY
      });

      return json(result.response.status, {
        ok: result.response.ok,
        source: "arcgis",
        action,
        query: {
          address,
          limit: cleanLimit(params.limit, 5, 20)
        },
        data: result.data,
        normalized: result.normalized
      });
    }

    // =========================================================
    // REVERSE GEOCODE
    // =========================================================
    if (action === "reverse") {
      const lat = cleanNumber(params.lat);
      const lon = cleanNumber(params.lon ?? params.lng);

      if (lat === null || lon === null) {
        return json(400, {
          ok: false,
          error: "Missing lat or lon",
          example: "/api/arcgis?action=reverse&lat=35.0402&lon=-106.6090"
        });
      }

      const result = await reverseGeocode({
        lat,
        lon,
        apiKey: ARCGIS_API_KEY
      });

      return json(result.response.status, {
        ok: result.response.ok,
        source: "arcgis",
        action,
        query: {
          lat,
          lon
        },
        data: result.data,
        normalized: result.normalized
      });
    }

    // =========================================================
    // PLACES NEAR POINT
    // =========================================================
    if (action === "places") {
      const lat = cleanNumber(params.lat);
      const lon = cleanNumber(params.lon ?? params.lng);

      if (lat === null || lon === null) {
        return json(400, {
          ok: false,
          error: "Missing lat or lon",
          example: "/api/arcgis?action=places&lat=35.0402&lon=-106.6090&category=hospital"
        });
      }

      const result = await placesNearPoint({
        lat,
        lon,
        category: params.category,
        categoryIds: params.categoryIds,
        searchText: params.searchText,
        radius: params.radius,
        limit: params.limit,
        apiKey: ARCGIS_API_KEY
      });

      return json(result.response.status, {
        ok: result.response.ok,
        source: "arcgis",
        action,
        query: {
          lat,
          lon,
          category: cleanString(params.category),
          categoryIds: cleanString(params.categoryIds),
          searchText: cleanString(params.searchText),
          radius: cleanRadius(params.radius, 10000, 100000),
          limit: cleanLimit(params.limit, 10, 50)
        },
        data: result.data,
        normalized: result.normalized
      });
    }

    // =========================================================
    // BASE NEARBY
    // One request returns grouped nearby base support places.
    // =========================================================
    if (action === "base-nearby") {
      const lat = cleanNumber(params.lat);
      const lon = cleanNumber(params.lon ?? params.lng);

      if (lat === null || lon === null) {
        return json(400, {
          ok: false,
          error: "Missing lat or lon",
          example: "/api/arcgis?action=base-nearby&lat=35.0402&lon=-106.6090"
        });
      }

      const grouped = await baseNearby({
        lat,
        lon,
        apiKey: ARCGIS_API_KEY
      });

      return json(200, {
        ok: true,
        source: "arcgis",
        action,
        query: {
          lat,
          lon
        },
        normalized: {
          center: {
            lat,
            lon
          },
          groups: grouped
        },
        data: grouped
      });
    }

    // =========================================================
    // BASE PROFILE
    // Geocodes an installation address, then returns nearby groups.
    // =========================================================
    if (action === "base-profile") {
      const address = cleanString(params.address);

      if (!address) {
        return json(400, {
          ok: false,
          error: "Missing address",
          example: "/api/arcgis?action=base-profile&address=Kirtland Air Force Base, Albuquerque, NM"
        });
      }

      const geoResult = await geocodeAddress({
        address,
        limit: 1,
        apiKey: ARCGIS_API_KEY
      });

      const best = geoResult.normalized.best;

      if (!best?.lat || !best?.lon) {
        return json(404, {
          ok: false,
          source: "arcgis",
          action,
          error: "Could not geocode base address",
          query: {
            address
          },
          geocode: geoResult.normalized
        });
      }

      const grouped = await baseNearby({
        lat: best.lat,
        lon: best.lon,
        apiKey: ARCGIS_API_KEY
      });

      return json(200, {
        ok: true,
        source: "arcgis",
        action,
        query: {
          address
        },
        normalized: {
          base: best,
          groups: grouped
        },
        data: {
          geocode: geoResult.data,
          nearby: grouped
        }
      });
    }

    // =========================================================
    // ROUTE
    // =========================================================
    if (action === "route") {
      const fromLat = cleanNumber(params.fromLat);
      const fromLon = cleanNumber(params.fromLon ?? params.fromLng);
      const toLat = cleanNumber(params.toLat);
      const toLon = cleanNumber(params.toLon ?? params.toLng);

      if (fromLat === null || fromLon === null || toLat === null || toLon === null) {
        return json(400, {
          ok: false,
          error: "Missing route coordinates",
          required: ["fromLat", "fromLon", "toLat", "toLon"],
          example: "/api/arcgis?action=route&fromLat=35.0402&fromLon=-106.6090&toLat=35.0844&toLon=-106.6504"
        });
      }

      const result = await routeBetweenPoints({
        fromLat,
        fromLon,
        toLat,
        toLon,
        apiKey: ARCGIS_API_KEY
      });

      return json(result.response.status, {
        ok: result.response.ok,
        source: "arcgis",
        action,
        query: {
          fromLat,
          fromLon,
          toLat,
          toLon
        },
        data: result.data,
        normalized: result.normalized
      });
    }

    // =========================================================
    // UNKNOWN ACTION
    // =========================================================
    return json(400, {
      ok: false,
      error: "Invalid ArcGIS action",
      action,
      allowed: [
        "geocode",
        "reverse",
        "places",
        "base-nearby",
        "base-profile",
        "route"
      ]
    });

  } catch (err) {
    console.error("ArcGIS function error:", err);

    return json(500, {
      ok: false,
      error: "ArcGIS request failed",
      details: err?.message || String(err)
    });
  }
};
