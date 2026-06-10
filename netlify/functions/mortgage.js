// netlify/functions/mortgage.js
// ============================================================
// TheWing.ai • Mortgage API Handler
// v1.2.0
//
// ROUTES
// - /.netlify/functions/mortgage
// - /api/mortgage through netlify.toml redirect
//
// MATH
// - Delegates to netlify/functions/_share/mortgage-engine.js
// ============================================================

import {
  ENGINE_VERSION,
  calculateMortgage,
  normalizeMortgageInput
} from "./_share/mortgage-engine.js";

const APP_NAME = "TheWing.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ""
    };
  }

  if (event.httpMethod === "GET") {
    return json(200, {
      ok: true,
      app: APP_NAME,
      engineVersion: ENGINE_VERSION,
      status: "online",
      route: "/api/mortgage",
      purpose: "Unified mortgage engine for TheWing.ai and PCSUnited.",
      example: {
        method: "POST",
        body: {
          price: 350000,
          down: 5,
          creditScore: 720,
          termYears: 30,
          taxRate: 1.2,
          insRate: 0.5,
          hoaMonthly: 75,
          loanType: "conventional"
        }
      }
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      app: APP_NAME,
      engineVersion: ENGINE_VERSION,
      error: "Method not allowed. Use POST."
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (_err) {
    return json(400, {
      ok: false,
      app: APP_NAME,
      engineVersion: ENGINE_VERSION,
      error: "Invalid JSON body."
    });
  }

  try {
    const input = normalizeMortgageInput(body);

    if (input.price <= 0) {
      return json(400, {
        ok: false,
        app: APP_NAME,
        engineVersion: ENGINE_VERSION,
        error: "Home price is required and must be greater than 0."
      });
    }

    const result = calculateMortgage(input);

    return json(200, {
      app: APP_NAME,
      ...result
    });
  } catch (err) {
    return json(500, {
      ok: false,
      app: APP_NAME,
      engineVersion: ENGINE_VERSION,
      error: err?.message || "Unexpected mortgage calculation error."
    });
  }
}
