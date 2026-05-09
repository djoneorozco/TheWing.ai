// netlify/functions/_share/response.js
// ============================================================
// TheWing.ai • Response Helpers
// v1.0.0
// PURPOSE:
// - Shared Netlify response helpers
// - CORS-safe JSON responses
// ============================================================

"use strict";

const DEFAULT_ALLOWED_ORIGIN = "*";

function corsHeaders(origin = DEFAULT_ALLOWED_ORIGIN) {
  return {
    "Access-Control-Allow-Origin": origin || DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(statusCode, body, origin = DEFAULT_ALLOWED_ORIGIN) {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body ?? {}),
  };
}

function ok(body = {}, origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(200, body, origin);
}

function created(body = {}, origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(201, body, origin);
}

function badRequest(message = "Bad request", details = null, origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(
    400,
    {
      ok: false,
      error: message,
      details,
    },
    origin
  );
}

function unauthorized(message = "Unauthorized", origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(
    401,
    {
      ok: false,
      error: message,
    },
    origin
  );
}

function forbidden(message = "Forbidden", origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(
    403,
    {
      ok: false,
      error: message,
    },
    origin
  );
}

function notFound(message = "Not found", origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(
    404,
    {
      ok: false,
      error: message,
    },
    origin
  );
}

function serverError(message = "Server error", details = null, origin = DEFAULT_ALLOWED_ORIGIN) {
  return json(
    500,
    {
      ok: false,
      error: message,
      details,
    },
    origin
  );
}

function options(origin = DEFAULT_ALLOWED_ORIGIN) {
  return {
    statusCode: 204,
    headers: corsHeaders(origin),
    body: "",
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

module.exports = {
  corsHeaders,
  json,
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  options,
  safeParseJson,
};
