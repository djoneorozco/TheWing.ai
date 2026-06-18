// netlify/functions/pcs-move.js
// ============================================================
// TheWing.ai • PCS Move API Handler
// v1.0.0
//
// PURPOSE
// - Test endpoint for the shared PCS move engine
// - Delegates to netlify/functions/_share/pcs-move-engine.js
// - Does NOT connect to PCS Snapshot yet
//
// ROUTES
// - /.netlify/functions/pcs-move
// - /api/pcs-move through netlify.toml redirect
// ============================================================

import {
  PCS_MOVE_ENGINE_VERSION,
  calculatePcsMoveEstimate
} from "./_share/pcs-move-engine.js";

const APP_NAME = "TheWing.ai";
const HANDLER_VERSION = "thewing-pcs-move-handler-1.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
  "Content-Type": "application/json; charset=utf-8"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function safeParseJson(rawBody) {
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed. Use POST.",
      result: null,
      warnings: []
    });
  }

  const body = safeParseJson(event.body);

  if (body == null) {
    return json(400, {
      ok: false,
      error: "Invalid JSON body.",
      result: null,
      warnings: []
    });
  }

  try {
    const input = body?.input && typeof body.input === "object" ? body.input : body;
    const result = calculatePcsMoveEstimate(input);
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];

    return json(200, {
      ok: true,
      app: APP_NAME,
      handlerVersion: HANDLER_VERSION,
      engineVersion: PCS_MOVE_ENGINE_VERSION,
      result,
      warnings
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error?.message || "PCS move calculation failed.",
      result: null,
      warnings: []
    });
  }
}
