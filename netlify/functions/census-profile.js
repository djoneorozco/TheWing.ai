// netlify/functions/census-profile.js
// ============================================================
// PCSUnited / The Orozco Realty • Census Profile API
// v1.0.0
//
// PURPOSE
// - Uses Netlify ENV: CENSUS_API_KEY
// - Pulls official Census ACS 5-Year profile data
// - Good for Base Demographics, City Pages, Market Pages
//
// ENDPOINT EXAMPLES
// /api/census-profile?state=48&place=65000
// /api/census-profile?state=48&county=029
// /api/census-profile?zip=78236
//
// San Antonio place FIPS example:
// Texas state = 48
// San Antonio place = 65000
// /api/census-profile?state=48&place=65000
// ============================================================

const CENSUS_BASE = "https://api.census.gov/data";

// Latest stable ACS 5-year profile release currently available
const DEFAULT_YEAR = "2024";
const DEFAULT_DATASET = "acs/acs5/profile";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body, null, 2)
  };
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(value) {
  const n = cleanNumber(value);
  return n === null ? null : Number(n.toFixed(1));
}

function money(value) {
  const n = cleanNumber(value);
  return n === null ? null : Math.round(n);
}

function buildGeo(params) {
  const state = params.get("state");
  const place = params.get("place");
  const county = params.get("county");
  const zip = params.get("zip");
  const tract = params.get("tract");

  if (zip) {
    return {
      forValue: `zip code tabulation area:${zip}`,
      inValue: null,
      label: `ZIP Code Tabulation Area ${zip}`
    };
  }

  if (state && place) {
    return {
      forValue: `place:${place}`,
      inValue: `state:${state}`,
      label: `Place ${place}, State ${state}`
    };
  }

  if (state && county && tract) {
    return {
      forValue: `tract:${tract}`,
      inValue: `state:${state} county:${county}`,
      label: `Tract ${tract}, County ${county}, State ${state}`
    };
  }

  if (state && county) {
    return {
      forValue: `county:${county}`,
      inValue: `state:${state}`,
      label: `County ${county}, State ${state}`
    };
  }

  if (state) {
    return {
      forValue: `state:${state}`,
      inValue: null,
      label: `State ${state}`
    };
  }

  return null;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: HEADERS,
      body: ""
    };
  }

  try {
    const key = process.env.CENSUS_API_KEY;

    if (!key) {
      return json(500, {
        ok: false,
        error: "Missing CENSUS_API_KEY in Netlify environment variables."
      });
    }

    const params = new URLSearchParams(event.rawQuery || "");
    const year = params.get("year") || DEFAULT_YEAR;
    const dataset = params.get("dataset") || DEFAULT_DATASET;

    const geo = buildGeo(params);

    if (!geo) {
      return json(400, {
        ok: false,
        error: "Missing geography. Use one of: ?state=48&place=65000, ?state=48&county=029, ?zip=78236, or ?state=48",
        examples: [
          "/api/census-profile?state=48&place=65000",
          "/api/census-profile?state=48&county=029",
          "/api/census-profile?zip=78236"
        ]
      });
    }

    // ACS Data Profile variables.
    // DP02 = social, DP03 = economic, DP04 = housing, DP05 = demographics.
    const variables = [
      "NAME",

      // Population / demographics
      "DP05_0001E", // Total population
      "DP05_0005PE", // Male %
      "DP05_0006PE", // Female %
      "DP05_0018E", // Median age
      "DP05_0037PE", // Under 18 %
      "DP05_0024PE", // 65+ %

      // Race / ethnicity
      "DP05_0038PE", // White %
      "DP05_0039PE", // Black %
      "DP05_0044PE", // Asian %
      "DP05_0071PE", // Hispanic or Latino %

      // Households / family
      "DP02_0001E", // Total households
      "DP02_0016E", // Average household size
      "DP02_0022PE", // Married-couple family %
      "DP02_0067PE", // Veterans %

      // Education
      "DP02_0063PE", // High school graduate or higher %
      "DP02_0064PE", // Bachelor's degree or higher %

      // Income / economy
      "DP03_0009PE", // Unemployment rate %
      "DP03_0051E", // Median household income
      "DP03_0062E", // Per capita income
      "DP03_0128PE", // Poverty %

      // Commute
      "DP03_0025E", // Mean travel time to work

      // Housing
      "DP04_0001E", // Housing units
      "DP04_0046PE", // Owner-occupied %
      "DP04_0047PE", // Renter-occupied %
      "DP04_0003PE", // Vacancy %
      "DP04_0089E", // Median home value
      "DP04_0134E" // Median gross rent
    ];

    const url = new URL(`${CENSUS_BASE}/${year}/${dataset}`);
    url.searchParams.set("get", variables.join(","));
    url.searchParams.set("for", geo.forValue);
    if (geo.inValue) url.searchParams.set("in", geo.inValue);
    url.searchParams.set("key", key);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text();
      return json(response.status, {
        ok: false,
        error: "Census API request failed.",
        status: response.status,
        detail: text
      });
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || rows.length < 2) {
      return json(404, {
        ok: false,
        error: "No Census data returned for this geography.",
        geography: geo
      });
    }

    const headers = rows[0];
    const values = rows[1];

    const raw = {};
    headers.forEach((h, i) => {
      raw[h] = values[i];
    });

    const profile = {
      name: raw.NAME || geo.label,
      year,
      dataset,
      geography: geo,

      population: {
        total: cleanNumber(raw.DP05_0001E),
        median_age: cleanNumber(raw.DP05_0018E),
        under_18_pct: pct(raw.DP05_0037PE),
        age_65_plus_pct: pct(raw.DP05_0024PE),
        male_pct: pct(raw.DP05_0005PE),
        female_pct: pct(raw.DP05_0006PE)
      },

      race_ethnicity: {
        white_pct: pct(raw.DP05_0038PE),
        black_pct: pct(raw.DP05_0039PE),
        asian_pct: pct(raw.DP05_0044PE),
        hispanic_latino_pct: pct(raw.DP05_0071PE)
      },

      households: {
        total: cleanNumber(raw.DP02_0001E),
        average_household_size: cleanNumber(raw.DP02_0016E),
        married_couple_family_pct: pct(raw.DP02_0022PE)
      },

      military_veterans: {
        veterans_pct: pct(raw.DP02_0067PE)
      },

      education: {
        high_school_or_higher_pct: pct(raw.DP02_0063PE),
        bachelors_or_higher_pct: pct(raw.DP02_0064PE)
      },

      economy: {
        unemployment_rate_pct: pct(raw.DP03_0009PE),
        median_household_income: money(raw.DP03_0051E),
        per_capita_income: money(raw.DP03_0062E),
        poverty_pct: pct(raw.DP03_0128PE)
      },

      commute: {
        mean_travel_time_minutes: cleanNumber(raw.DP03_0025E)
      },

      housing: {
        total_housing_units: cleanNumber(raw.DP04_0001E),
        owner_occupied_pct: pct(raw.DP04_0046PE),
        renter_occupied_pct: pct(raw.DP04_0047PE),
        vacancy_pct: pct(raw.DP04_0003PE),
        median_home_value: money(raw.DP04_0089E),
        median_gross_rent: money(raw.DP04_0134E)
      }
    };

    return json(200, {
      ok: true,
      source: "U.S. Census Bureau ACS 5-Year Data Profile",
      fetched_at: new Date().toISOString(),
      profile,
      raw
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message || "Unknown server error."
    });
  }
};
