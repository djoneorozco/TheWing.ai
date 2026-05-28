// netlify/functions/census-profile.js
// ============================================================
// PCSUnited / The Orozco Realty • Census Profile API
// v1.1.0
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
// San Antonio city example:
// Texas state = 48
// San Antonio place = 65000
// /api/census-profile?state=48&place=65000
// ============================================================

const CENSUS_BASE = "https://api.census.gov/data";

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
      type: "zip",
      forValue: `zip code tabulation area:${zip}`,
      inValue: null,
      label: `ZIP Code Tabulation Area ${zip}`,
      state,
      place,
      county,
      tract,
      zip
    };
  }

  if (state && place) {
    return {
      type: "place",
      forValue: `place:${place}`,
      inValue: `state:${state}`,
      label: `Place ${place}, State ${state}`,
      state,
      place,
      county,
      tract,
      zip
    };
  }

  if (state && county && tract) {
    return {
      type: "tract",
      forValue: `tract:${tract}`,
      inValue: `state:${state} county:${county}`,
      label: `Tract ${tract}, County ${county}, State ${state}`,
      state,
      place,
      county,
      tract,
      zip
    };
  }

  if (state && county) {
    return {
      type: "county",
      forValue: `county:${county}`,
      inValue: `state:${state}`,
      label: `County ${county}, State ${state}`,
      state,
      place,
      county,
      tract,
      zip
    };
  }

  if (state) {
    return {
      type: "state",
      forValue: `state:${state}`,
      inValue: null,
      label: `State ${state}`,
      state,
      place,
      county,
      tract,
      zip
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
    // DP02 = Social / Household / Education / Veterans
    // DP03 = Economic / Income / Employment / Commute
    // DP04 = Housing / Rent / Owner Costs
    // DP05 = Population / Age / Race / Ethnicity
    const variables = [
      "NAME",

      // ========================================================
      // DP05 • Population / Age / Race / Ethnicity
      // ========================================================
      "DP05_0001E",   // Total population
      "DP05_0005PE",  // Male %
      "DP05_0006PE",  // Female %
      "DP05_0018E",   // Median age
      "DP05_0019PE",  // Under 5 %
      "DP05_0037PE",  // Under 18 %
      "DP05_0024PE",  // 65+ %
      "DP05_0038PE",  // White %
      "DP05_0039PE",  // Black %
      "DP05_0044PE",  // Asian %
      "DP05_0052PE",  // Two or more races %
      "DP05_0071PE",  // Hispanic or Latino %

      // ========================================================
      // DP02 • Households / Families / Education / Veterans
      // ========================================================
      "DP02_0001E",   // Total households
      "DP02_0016E",   // Average household size
      "DP02_0017E",   // Average family size
      "DP02_0022PE",  // Married-couple family %
      "DP02_0059PE",  // School enrollment %
      "DP02_0063PE",  // High school graduate or higher %
      "DP02_0064PE",  // Bachelor's degree or higher %
      "DP02_0067E",   // Civilian veterans estimate
      "DP02_0067PE",  // Civilian veterans %
      "DP02_0092PE",  // Foreign born %
      "DP02_0111PE",  // Language other than English at home %
      "DP02_0152PE",  // Households with computer %
      "DP02_0153PE",  // Households with broadband internet %

      // ========================================================
      // DP03 • Economy / Labor / Income / Commute / Poverty
      // ========================================================
      "DP03_0004PE",  // Labor force participation %
      "DP03_0009PE",  // Unemployment rate %
      "DP03_0025E",   // Mean travel time to work
      "DP03_0051E",   // Median household income
      "DP03_0052E",   // Mean household income
      "DP03_0062E",   // Per capita income
      "DP03_0128PE",  // Poverty %
      "DP03_0099PE",  // Health insurance coverage %
      "DP03_0119PE",  // No health insurance coverage %

      // ========================================================
      // DP04 • Housing / Rent / Vacancy / Owner Costs
      // ========================================================
      "DP04_0001E",   // Total housing units
      "DP04_0002E",   // Occupied housing units
      "DP04_0003PE",  // Vacant housing units %
      "DP04_0046PE",  // Owner-occupied %
      "DP04_0047PE",  // Renter-occupied %
      "DP04_0048E",   // Avg household size of owner-occupied unit
      "DP04_0049E",   // Avg household size of renter-occupied unit
      "DP04_0089E",   // Median owner-occupied home value
      "DP04_0134E",   // Median gross rent

      // Renter cost burden
      "DP04_0140PE",  // Rent is 30% to 34.9% of income
      "DP04_0141PE",  // Rent is 35% or more of income

      // Owner cost burden
      "DP04_0104PE",  // Owner cost is 30% to 34.9% of income
      "DP04_0105PE"   // Owner cost is 35% or more of income
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
        detail: text,
        requested_url_without_key: url
          .toString()
          .replace(key, "HIDDEN_CENSUS_API_KEY")
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

    const renter30Plus =
      (pct(raw.DP04_0140PE) || 0) +
      (pct(raw.DP04_0141PE) || 0);

    const owner30Plus =
      (pct(raw.DP04_0104PE) || 0) +
      (pct(raw.DP04_0105PE) || 0);

    const profile = {
      name: raw.NAME || geo.label,
      year,
      dataset,
      geography: geo,

      population: {
        total: cleanNumber(raw.DP05_0001E),
        median_age: cleanNumber(raw.DP05_0018E),
        under_5_pct: pct(raw.DP05_0019PE),
        under_18_pct: pct(raw.DP05_0037PE),
        age_65_plus_pct: pct(raw.DP05_0024PE),
        male_pct: pct(raw.DP05_0005PE),
        female_pct: pct(raw.DP05_0006PE)
      },

      race_ethnicity: {
        white_pct: pct(raw.DP05_0038PE),
        black_pct: pct(raw.DP05_0039PE),
        asian_pct: pct(raw.DP05_0044PE),
        two_or_more_races_pct: pct(raw.DP05_0052PE),
        hispanic_latino_pct: pct(raw.DP05_0071PE)
      },

      households: {
        total: cleanNumber(raw.DP02_0001E),
        average_household_size: cleanNumber(raw.DP02_0016E),
        average_family_size: cleanNumber(raw.DP02_0017E),
        married_couple_family_pct: pct(raw.DP02_0022PE)
      },

      education: {
        school_enrollment_pct: pct(raw.DP02_0059PE),
        high_school_or_higher_pct: pct(raw.DP02_0063PE),
        bachelors_or_higher_pct: pct(raw.DP02_0064PE)
      },

      military_veterans: {
        civilian_veterans_estimate: cleanNumber(raw.DP02_0067E),
        civilian_veterans_pct: pct(raw.DP02_0067PE)
      },

      immigration_language: {
        foreign_born_pct: pct(raw.DP02_0092PE),
        language_other_than_english_home_pct: pct(raw.DP02_0111PE)
      },

      digital_access: {
        households_with_computer_pct: pct(raw.DP02_0152PE),
        households_with_broadband_pct: pct(raw.DP02_0153PE)
      },

      economy: {
        labor_force_participation_pct: pct(raw.DP03_0004PE),
        unemployment_rate_pct: pct(raw.DP03_0009PE),
        median_household_income: money(raw.DP03_0051E),
        mean_household_income: money(raw.DP03_0052E),
        per_capita_income: money(raw.DP03_0062E),
        poverty_pct: pct(raw.DP03_0128PE),
        health_insurance_coverage_pct: pct(raw.DP03_0099PE),
        no_health_insurance_coverage_pct: pct(raw.DP03_0119PE)
      },

      commute: {
        mean_travel_time_minutes: cleanNumber(raw.DP03_0025E)
      },

      housing: {
        total_housing_units: cleanNumber(raw.DP04_0001E),
        occupied_housing_units: cleanNumber(raw.DP04_0002E),
        vacancy_pct: pct(raw.DP04_0003PE),
        owner_occupied_pct: pct(raw.DP04_0046PE),
        renter_occupied_pct: pct(raw.DP04_0047PE),
        owner_household_size: cleanNumber(raw.DP04_0048E),
        renter_household_size: cleanNumber(raw.DP04_0049E),
        median_owner_occupied_home_value: money(raw.DP04_0089E),
        median_home_value: money(raw.DP04_0089E),
        median_gross_rent: money(raw.DP04_0134E)
      },

      housing_cost_burden: {
        renter_30_to_34_9_pct: pct(raw.DP04_0140PE),
        renter_35_plus_pct: pct(raw.DP04_0141PE),
        renter_30_plus_pct: Number(renter30Plus.toFixed(1)),
        owner_30_to_34_9_pct: pct(raw.DP04_0104PE),
        owner_35_plus_pct: pct(raw.DP04_0105PE),
        owner_30_plus_pct: Number(owner30Plus.toFixed(1))
      }
    };

    return json(200, {
      ok: true,
      source: "U.S. Census Bureau ACS 5-Year Data Profile",
      fetched_at: new Date().toISOString(),
      profile,
      census: profile,
      raw
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message || "Unknown server error."
    });
  }
};
