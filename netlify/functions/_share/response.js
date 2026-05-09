// netlify/functions/_brain/response.js
// ============================================================
// TheWing.ai • Response Helpers
// v1.0.0
//
// PURPOSE
// - Shared Netlify response helpers
// - Standardizes CORS, JSON responses, errors, health responses,
//   and API compatibility wrappers
// ============================================================

// ============================================================
// //#1) VERSION
// ============================================================

export const ENGINE_VERSION = "thewing-response-helpers-1.0.0";

// ============================================================
// //#2) DEFAULT CONFIG
// ============================================================

export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",
  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",
  "https://pcs-united.webflow.io",
  "https://pcsunited-com-28346d.webflow.io",
  "https://pcsu.webflow.io",
  "https://new-real-estate-purchase.webflow.io",
  "https://theorozcorealty.com",
  "https://www.theorozcorealty.com",
  "https://theorozcorealty.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8888",
  "http://127.0.0.1:8888"
]);

// ============================================================
// //#3) CORS
// ============================================================

export function getOrigin(event) {
  return (
    event?.headers?.origin ||
    event?.headers?.Origin ||
    ""
  );
}

export function buildCorsHeaders(event, options = {}) {
  const allowedOrigins = Array.isArray(options.allowedOrigins)
    ? options.allowedOrigins
    : DEFAULT_ALLOWED_ORIGINS;

  const origin = getOrigin(event);

  const allowOrigin =
    options.allowAll === true
      ? "*"
      : allowedOrigins.includes(origin)
        ? origin
        : options.defaultOrigin || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": options.allowHeaders || "Content-Type, Authorization",
    "Access-Control-Allow-Methods": options.allowMethods || "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": options.credentials === true ? "true" : "false",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

// ============================================================
// //#4) BASIC RESPONSES
// ============================================================

export function json(event, statusCode, body, options = {}) {
  return {
    statusCode,
    headers: buildCorsHeaders(event, options),
    body: JSON.stringify(body)
  };
}

export function ok(event, data = {}, options = {}) {
  const body = {
    ok: true,
    ...(options.app ? { app: options.app } : {}),
    ...(options.schemaVersion ? { schemaVersion: options.schemaVersion } : {}),
    ...(options.engineVersion ? { engineVersion: options.engineVersion } : {}),
    ...data
  };

  return json(event, options.statusCode || 200, body, options);
}

export function fail(event, statusCode = 500, error = "Request failed.", extra = {}, options = {}) {
  const body = {
    ok: false,
    ...(options.app ? { app: options.app } : {}),
    ...(options.schemaVersion ? { schemaVersion: options.schemaVersion } : {}),
    ...(options.engineVersion ? { engineVersion: options.engineVersion } : {}),
    error: String(error || "Request failed."),
    ...extra
  };

  return json(event, statusCode, body, options);
}

export function noContent(event, options = {}) {
  return {
    statusCode: 204,
    headers: buildCorsHeaders(event, options),
    body: ""
  };
}

export function methodNotAllowed(event, method = "POST", options = {}) {
  return fail(
    event,
    405,
    `Method not allowed. Use ${method}.`,
    {
      allowedMethod: method
    },
    options
  );
}

export function badRequest(event, error = "Bad request.", extra = {}, options = {}) {
  return fail(event, 400, error, extra, options);
}

export function serverError(event, error = "Server error.", extra = {}, options = {}) {
  return fail(
    event,
    500,
    error?.message || error || "Server error.",
    {
      ...(error?.stack && options.includeStack === true ? { stack: error.stack } : {}),
      ...extra
    },
    options
  );
}

// ============================================================
// //#5) BODY PARSING
// ============================================================

export function parseJsonBody(event) {
  try {
    if (!event?.body) return {};
    return JSON.parse(event.body || "{}");
  } catch (_error) {
    const err = new Error("Invalid JSON body.");
    err.code = "INVALID_JSON";
    throw err;
  }
}

export function getBodyInput(body = {}) {
  if (body.input && typeof body.input === "object") {
    return body.input;
  }

  return body;
}

// ============================================================
// //#6) COMPATIBILITY WRAPPERS
// ============================================================

export function withCompatibilityPayload(payload = {}) {
  return {
    ...payload,
    data: payload,
    payload
  };
}

export function apiSuccess(event, payload = {}, options = {}) {
  return ok(
    event,
    withCompatibilityPayload(payload),
    options
  );
}

export function apiError(event, statusCode, error, extra = {}, options = {}) {
  return fail(event, statusCode, error, extra, options);
}

// ============================================================
// //#7) HEALTH RESPONSE
// ============================================================

export function health(event, config = {}) {
  return ok(
    event,
    {
      status: "online",
      app: config.app || "TheWing.ai",
      role: config.role || "TheWing.ai API",
      route: config.route || null,
      timestamp: new Date().toISOString(),
      versions: config.versions || {},
      routes: config.routes || {},
      examples: config.examples || {}
    },
    {
      app: config.app || "TheWing.ai",
      schemaVersion: config.schemaVersion,
      engineVersion: config.engineVersion,
      allowAll: config.allowAll !== false
    }
  );
}

// ============================================================
// //#8) HANDLER GUARD
// ============================================================

export async function guardHandler(event, config = {}, callback) {
  const options = {
    app: config.app || "TheWing.ai",
    schemaVersion: config.schemaVersion,
    engineVersion: config.engineVersion,
    allowAll: config.allowAll !== false,
    allowedOrigins: config.allowedOrigins || DEFAULT_ALLOWED_ORIGINS,
    defaultOrigin: config.defaultOrigin || "*",
    includeStack: config.includeStack === true
  };

  try {
    if (event.httpMethod === "OPTIONS") {
      return noContent(event, options);
    }

    if (typeof callback !== "function") {
      return serverError(event, "Handler callback missing.", {}, options);
    }

    return await callback(event, options);
  } catch (error) {
    if (error?.code === "INVALID_JSON") {
      return badRequest(event, error.message, {}, options);
    }

    return serverError(event, error, {}, options);
  }
}

// ============================================================
// //#9) DEFAULT EXPORT
// ============================================================

export default Object.freeze({
  ENGINE_VERSION,
  DEFAULT_ALLOWED_ORIGINS,

  getOrigin,
  buildCorsHeaders,

  json,
  ok,
  fail,
  noContent,
  methodNotAllowed,
  badRequest,
  serverError,

  parseJsonBody,
  getBodyInput,

  withCompatibilityPayload,
  apiSuccess,
  apiError,

  health,
  guardHandler
});
