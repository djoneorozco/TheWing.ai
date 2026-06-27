// netlify/functions/rentcast.js
// ============================================================
// TheWing.ai / PCSUnited • RentCast API Proxy
// v2.1.0
//
// PURPOSE
// - Keeps RENTCAST_API_KEY secure in Netlify
// - Supports Real Estate tab bedroom-specific listing data
// - Supports sale listings, rental listings, market data,
//   rent estimate, value estimate, and property records
//
// REQUIRED NETLIFY ENV VAR:
// RENTCAST_API_KEY
//
// REAL ESTATE TAB EXAMPLES:
// /api/rentcast?action=sale-listings&city=Albuquerque&state=NM&bedrooms=3&limit=50
// /api/rentcast?action=rental-listings&city=Albuquerque&state=NM&bedrooms=3&limit=50
// /api/rentcast?action=market&zipCode=87117
//
// ADDRESS AVM EXAMPLES:
// /api/rentcast?action=rent-estimate&address=123 Main St, Albuquerque, NM
// /api/rentcast?action=value-estimate&address=123 Main St, Albuquerque, NM
// ============================================================

const RENTCAST_BASE_URL = "https://api.rentcast.io/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
  "Vary": "Origin"
};

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

function cleanLimit(value, fallback = 50, max = 100) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) return fallback;

  return Math.min(Math.floor(n), max);
}

function buildQuery(paramsSource, allowedKeys = []) {
  const params = new URLSearchParams();

  allowedKeys.forEach((key) => {
    const value = paramsSource[key];

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value).trim());
    }
  });

  return params;
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.listings)) return data.listings;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.data?.listings)) return data.data.listings;
  if (Array.isArray(data?.data?.properties)) return data.data.properties;

  return [];
}

function normalizeBedrooms(params) {
  const bedrooms =
    cleanNumber(params.bedrooms) ??
    cleanNumber(params.beds) ??
    cleanNumber(params.bed);

  if (!Number.isFinite(bedrooms)) return null;

  return Math.max(0, Math.floor(bedrooms));
}

function listingMatchesBedrooms(item, bedrooms) {
  if (!Number.isFinite(Number(bedrooms))) return true;

  const itemBedrooms =
    cleanNumber(item?.bedrooms) ??
    cleanNumber(item?.beds) ??
    cleanNumber(item?.bedroomCount) ??
    cleanNumber(item?.propertyDetails?.bedrooms);

  if (!Number.isFinite(itemBedrooms)) return true;

  return Number(itemBedrooms) === Number(bedrooms);
}

function filterByBedrooms(data, bedrooms) {
  if (!Number.isFinite(Number(bedrooms))) return data;

  if (Array.isArray(data)) {
    return data.filter((item) => listingMatchesBedrooms(item, bedrooms));
  }

  if (Array.isArray(data?.data)) {
    return {
      ...data,
      data: data.data.filter((item) => listingMatchesBedrooms(item, bedrooms))
    };
  }

  if (Array.isArray(data?.listings)) {
    return {
      ...data,
      listings: data.listings.filter((item) => listingMatchesBedrooms(item, bedrooms))
    };
  }

  if (Array.isArray(data?.properties)) {
    return {
      ...data,
      properties: data.properties.filter((item) => listingMatchesBedrooms(item, bedrooms))
    };
  }

  if (Array.isArray(data?.data?.listings)) {
    return {
      ...data,
      data: {
        ...data.data,
        listings: data.data.listings.filter((item) => listingMatchesBedrooms(item, bedrooms))
      }
    };
  }

  if (Array.isArray(data?.data?.properties)) {
    return {
      ...data,
      data: {
        ...data.data,
        properties: data.data.properties.filter((item) => listingMatchesBedrooms(item, bedrooms))
      }
    };
  }

  return data;
}

function getFilteredCount(data) {
  return getList(data).length;
}

async function callRentCast({ endpoint, query, apiKey }) {
  const url = `${RENTCAST_BASE_URL}${endpoint}${query ? `?${query.toString()}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey,
      "Accept": "application/json"
    }
  });

  let data = null;

  try {
    data = await response.json();
  } catch (_) {
    data = {
      error: "RentCast returned a non-JSON response"
    };
  }

  return {
    response,
    data,
    url
  };
}

function validateSearchGeography(query) {
  return (
    query.get("address") ||
    query.get("zipCode") ||
    (query.get("city") && query.get("state")) ||
    (query.get("latitude") && query.get("longitude"))
  );
}

function buildListingQuery(params, limit) {
  const query = buildQuery(params, [
    "address",
    "city",
    "state",
    "zipCode",
    "latitude",
    "longitude",
    "radius",
    "propertyType",
    "bathrooms",
    "squareFootage",
    "lotSize",
    "yearBuilt",
    "status",
    "price",
    "daysOld",
    "offset",
    "includeTotalCount"
  ]);

  query.set("limit", String(limit));

  return query;
}

function buildBedroomQueryVariant(baseQuery, bedrooms, variant) {
  const query = new URLSearchParams(baseQuery.toString());

  query.delete("bedrooms");
  query.delete("beds");
  query.delete("bed");
  query.delete("minBedrooms");
  query.delete("maxBedrooms");

  if (!Number.isFinite(Number(bedrooms))) return query;

  if (variant === "bedrooms") {
    query.set("bedrooms", String(bedrooms));
  }

  if (variant === "minmax") {
    query.set("minBedrooms", String(bedrooms));
    query.set("maxBedrooms", String(bedrooms));
  }

  return query;
}

async function callListingsWithBedroomFallback({
  endpoint,
  baseQuery,
  bedrooms,
  apiKey
}) {
  const attempts = [];

  if (Number.isFinite(Number(bedrooms))) {
    attempts.push({
      strategy: "bedrooms",
      query: buildBedroomQueryVariant(baseQuery, bedrooms, "bedrooms")
    });

    attempts.push({
      strategy: "minBedrooms/maxBedrooms",
      query: buildBedroomQueryVariant(baseQuery, bedrooms, "minmax")
    });
  }

  attempts.push({
    strategy: "unfiltered-server-filtered",
    query: buildBedroomQueryVariant(baseQuery, bedrooms, "none")
  });

  let lastResult = null;

  for (const attempt of attempts) {
    const result = await callRentCast({
      endpoint,
      query: attempt.query,
      apiKey
    });

    const totalCountHeader = result.response.headers.get("X-Total-Count");
    const rawCount = getList(result.data).length;

    let finalData = result.data;
    let filteredCount = rawCount;

    if (attempt.strategy === "unfiltered-server-filtered" && Number.isFinite(Number(bedrooms))) {
      finalData = filterByBedrooms(result.data, bedrooms);
      filteredCount = getFilteredCount(finalData);
    }

    const enriched = {
      ...result,
      strategy: attempt.strategy,
      finalData,
      rawCount,
      filteredCount,
      totalCountHeader: totalCountHeader ? Number(totalCountHeader) : null
    };

    lastResult = enriched;

    if (result.response.ok && filteredCount > 0) {
      return enriched;
    }

    if (result.response.ok && !Number.isFinite(Number(bedrooms))) {
      return enriched;
    }
  }

  return lastResult;
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

    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
      return json(500, {
        ok: false,
        error: "Missing RENTCAST_API_KEY"
      });
    }

    const params = event.queryStringParameters || {};
    const action = cleanString(params.action || params.type || "rent-estimate").toLowerCase();
    const bedrooms = normalizeBedrooms(params);
    const limit = cleanLimit(params.limit, 50, 100);

    let endpoint = "";
    let query = new URLSearchParams();

    // =========================================================
    // ADDRESS-LEVEL AVM: RENT ESTIMATE
    // =========================================================
    if (action === "rent-estimate" || action === "rent" || action === "avm-rent") {
      const address = cleanString(params.address);

      if (!address) {
        return json(400, {
          ok: false,
          error: "Missing address",
          example: "/api/rentcast?action=rent-estimate&address=123 Main St, Albuquerque, NM"
        });
      }

      endpoint = "/avm/rent/long-term";

      query = buildQuery(params, [
        "address",
        "propertyType",
        "bedrooms",
        "bathrooms",
        "squareFootage",
        "maxRadius",
        "daysOld",
        "compCount"
      ]);

      const { response, data } = await callRentCast({
        endpoint,
        query,
        apiKey: RENTCAST_API_KEY
      });

      return json(response.status, {
        ok: response.ok,
        action,
        endpoint,
        query: Object.fromEntries(query.entries()),
        data
      });
    }

    // =========================================================
    // ADDRESS-LEVEL AVM: VALUE ESTIMATE
    // =========================================================
    if (action === "value-estimate" || action === "value" || action === "avm-value") {
      const address = cleanString(params.address);

      if (!address) {
        return json(400, {
          ok: false,
          error: "Missing address",
          example: "/api/rentcast?action=value-estimate&address=123 Main St, Albuquerque, NM"
        });
      }

      endpoint = "/avm/value";

      query = buildQuery(params, [
        "address",
        "propertyType",
        "bedrooms",
        "bathrooms",
        "squareFootage",
        "maxRadius",
        "daysOld",
        "compCount"
      ]);

      const { response, data } = await callRentCast({
        endpoint,
        query,
        apiKey: RENTCAST_API_KEY
      });

      return json(response.status, {
        ok: response.ok,
        action,
        endpoint,
        query: Object.fromEntries(query.entries()),
        data
      });
    }

    // =========================================================
    // SALE LISTINGS
    // Bedroom-aware:
    // 1. Try bedrooms=3
    // 2. Try minBedrooms=3&maxBedrooms=3
    // 3. Try unfiltered and filter server-side
    // =========================================================
    if (action === "sale-listings" || action === "sales" || action === "for-sale") {
      endpoint = "/listings/sale";
      query = buildListingQuery(params, limit);

      if (!validateSearchGeography(query)) {
        return json(400, {
          ok: false,
          error: "Missing search geography. Provide city+state, zipCode, address, or latitude+longitude.",
          example: "/api/rentcast?action=sale-listings&city=Albuquerque&state=NM&bedrooms=3&limit=50"
        });
      }

      const result = await callListingsWithBedroomFallback({
        endpoint,
        baseQuery: query,
        bedrooms,
        apiKey: RENTCAST_API_KEY
      });

      const data = result?.finalData ?? result?.data ?? null;

      return json(
        result?.response?.status || 500,
        {
          ok: Boolean(result?.response?.ok),
          action,
          endpoint,
          bedroomFilter: bedrooms,
          bedroomFilterStrategy: result?.strategy || null,
          query: Object.fromEntries((result?.query || query).entries()),
          rawCount: result?.rawCount ?? null,
          filteredCount: result?.filteredCount ?? null,
          totalCount: result?.totalCountHeader ?? result?.filteredCount ?? null,
          data
        },
        result?.totalCountHeader ? { "X-Total-Count": String(result.totalCountHeader) } : {}
      );
    }

    // =========================================================
    // RENTAL LISTINGS
    // Bedroom-aware:
    // 1. Try bedrooms=3
    // 2. Try minBedrooms=3&maxBedrooms=3
    // 3. Try unfiltered and filter server-side
    // =========================================================
    if (action === "rental-listings" || action === "rentals" || action === "for-rent") {
      endpoint = "/listings/rental/long-term";
      query = buildListingQuery(params, limit);

      if (!validateSearchGeography(query)) {
        return json(400, {
          ok: false,
          error: "Missing search geography. Provide city+state, zipCode, address, or latitude+longitude.",
          example: "/api/rentcast?action=rental-listings&city=Albuquerque&state=NM&bedrooms=3&limit=50"
        });
      }

      const result = await callListingsWithBedroomFallback({
        endpoint,
        baseQuery: query,
        bedrooms,
        apiKey: RENTCAST_API_KEY
      });

      const data = result?.finalData ?? result?.data ?? null;

      return json(
        result?.response?.status || 500,
        {
          ok: Boolean(result?.response?.ok),
          action,
          endpoint,
          bedroomFilter: bedrooms,
          bedroomFilterStrategy: result?.strategy || null,
          query: Object.fromEntries((result?.query || query).entries()),
          rawCount: result?.rawCount ?? null,
          filteredCount: result?.filteredCount ?? null,
          totalCount: result?.totalCountHeader ?? result?.filteredCount ?? null,
          data
        },
        result?.totalCountHeader ? { "X-Total-Count": String(result.totalCountHeader) } : {}
      );
    }

    // =========================================================
    // MARKET DATA
    // Usually ZIP-based. Not bedroom-specific.
    // =========================================================
    if (action === "market" || action === "market-data" || action === "market-stats") {
      const zipCode = cleanString(params.zipCode || params.zip || "");

      if (!zipCode) {
        return json(400, {
          ok: false,
          error: "Missing zipCode. RentCast market data is zip-code based.",
          example: "/api/rentcast?action=market&zipCode=87117"
        });
      }

      endpoint = "/markets";

      query = new URLSearchParams();
      query.set("zipCode", zipCode.padStart(5, "0"));

      const { response, data } = await callRentCast({
        endpoint,
        query,
        apiKey: RENTCAST_API_KEY
      });

      return json(response.status, {
        ok: response.ok,
        action,
        endpoint,
        query: Object.fromEntries(query.entries()),
        data
      });
    }

    // =========================================================
    // PROPERTY RECORDS
    // Optional later use.
    // =========================================================
    if (action === "properties" || action === "property-records") {
      endpoint = "/properties";

      query = buildQuery(params, [
        "address",
        "city",
        "state",
        "zipCode",
        "latitude",
        "longitude",
        "radius",
        "propertyType",
        "bedrooms",
        "bathrooms",
        "squareFootage",
        "lotSize",
        "yearBuilt",
        "ownerOccupied",
        "limit",
        "offset"
      ]);

      query.set("limit", String(limit));

      if (!validateSearchGeography(query)) {
        return json(400, {
          ok: false,
          error: "Missing search geography. Provide city+state, zipCode, address, or latitude+longitude.",
          example: "/api/rentcast?action=properties&city=Albuquerque&state=NM&bedrooms=3&limit=50"
        });
      }

      const { response, data } = await callRentCast({
        endpoint,
        query,
        apiKey: RENTCAST_API_KEY
      });

      const filteredData = Number.isFinite(Number(bedrooms))
        ? filterByBedrooms(data, bedrooms)
        : data;

      return json(response.status, {
        ok: response.ok,
        action,
        endpoint,
        bedroomFilter: bedrooms,
        query: Object.fromEntries(query.entries()),
        rawCount: getList(data).length,
        filteredCount: getList(filteredData).length,
        data: filteredData
      });
    }

    // =========================================================
    // UNKNOWN ACTION
    // =========================================================
    return json(400, {
      ok: false,
      error: "Unsupported RentCast action",
      action,
      supportedActions: [
        "rent-estimate",
        "value-estimate",
        "sale-listings",
        "rental-listings",
        "market",
        "properties"
      ]
    });

  } catch (err) {
    console.error("RentCast function error:", err);

    return json(500, {
      ok: false,
      error: "RentCast request failed",
      details: err?.message || String(err)
    });
  }
};
