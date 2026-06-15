// netlify/functions/arcgis.js

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const ARCGIS_API_KEY = process.env.ARCGIS_API_KEY;

    if (!ARCGIS_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing ARCGIS_API_KEY" }),
      };
    }

    const params = event.queryStringParameters || {};
    const action = params.action || "geocode";

    let url;

    if (action === "geocode") {
      const address = params.address;

      if (!address) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing address" }),
        };
      }

      url =
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?" +
        new URLSearchParams({
          f: "json",
          singleLine: address,
          outFields: "Match_addr,Addr_type,PlaceName,City,Region,Postal,Country",
          maxLocations: params.limit || "5",
          token: ARCGIS_API_KEY,
        });
    }

    else if (action === "reverse") {
      const lat = params.lat;
      const lon = params.lon;

      if (!lat || !lon) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing lat or lon" }),
        };
      }

      url =
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?" +
        new URLSearchParams({
          f: "json",
          location: `${lon},${lat}`,
          token: ARCGIS_API_KEY,
        });
    }

    else if (action === "places") {
      const lat = params.lat;
      const lon = params.lon;

      if (!lat || !lon) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing lat or lon" }),
        };
      }

      url =
        "https://places-api.arcgis.com/arcgis/rest/services/places-service/v1/places/near-point?" +
        new URLSearchParams({
          f: "json",
          x: lon,
          y: lat,
          radius: params.radius || "10000",
          categoryIds: params.categoryIds || params.category || "",
          searchText: params.searchText || "",
          pageSize: params.limit || "10",
          token: ARCGIS_API_KEY,
        });
    }

    else if (action === "route") {
      const fromLat = params.fromLat;
      const fromLon = params.fromLon;
      const toLat = params.toLat;
      const toLon = params.toLon;

      if (!fromLat || !fromLon || !toLat || !toLon) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "Missing route coordinates",
            required: ["fromLat", "fromLon", "toLat", "toLon"],
          }),
        };
      }

      url =
        "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve?" +
        new URLSearchParams({
          f: "json",
          stops: `${fromLon},${fromLat};${toLon},${toLat}`,
          returnDirections: "true",
          returnRoutes: "true",
          returnStops: "false",
          returnBarriers: "false",
          token: ARCGIS_API_KEY,
        });
    }

    else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid action",
          allowed: ["geocode", "reverse", "places", "route"],
        }),
      };
    }

    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify({
        ok: response.ok,
        source: "arcgis",
        action,
        data,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "ArcGIS request failed",
        details: err.message,
      }),
    };
  }
};
