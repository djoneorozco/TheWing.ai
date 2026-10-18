// netlify/functions/mortgage.js
// ============================================================
// TheWing.ai • Mortgage API Handler
// v1.3.0
//
// ROUTES
// - /.netlify/functions/mortgage
// - /api/mortgage through netlify.toml redirect
//
// MATH
// - Delegates to netlify/functions/_share/mortgage-engine.js
// - VA purchase math overlays official-va.js calculateVaHomeLoan()
// ============================================================

import { ENGINE_VERSION } from "./_share/mortgage-engine.js";
import { calculateMortgageScenario } from "./_share/mortgage-scenario.js";

import {
  RATE_VERSION as OFFICIAL_VA_RATE_VERSION
} from "./_share/official-va.js";

const APP_NAME = "TheWing.ai";
const HANDLER_VERSION = "thewing-mortgage-handler-1.4.0";

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
      handlerVersion: HANDLER_VERSION,
      officialVaVersion: OFFICIAL_VA_RATE_VERSION,
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
    const enriched = calculateMortgageScenario(body);

    return json(200, {
      app: APP_NAME,
      handlerVersion: HANDLER_VERSION,
      ...enriched
    });
  } catch (err) {
    return json(err.statusCode || 500, {
      ok: false,
      app: APP_NAME,
      engineVersion: ENGINE_VERSION,
      error: err?.message || "Unexpected mortgage calculation error."
    });
  }
}

