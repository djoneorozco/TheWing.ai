// netlify/functions/send-code.js
// ============================================================
// TheWing.ai • send-code
// v1.0.2
//
// PURPOSE:
// - Accepts POST { email, rank, lastName, phone, full_name, first_name, last_name }
// - Generates a secure 6-digit verification code
// - Hashes the code before saving
// - Inserts row into public.email_codes
// - Sends verification email through Resend
// - Uses PCSUnited sender branding
//
// FRONTEND ENDPOINT:
// - POST /api/send-code
// - POST /.netlify/functions/send-code
//
// REQUIRED ENV:
// - SUPABASE_URL
// - SUPABASE_SERVICE_KEY
//   or SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY
//
// REQUIRED / RECOMMENDED ENV FOR PCSUNITED BRANDING:
// - EMAIL_FROM=PCS United <concierge@pcsunited.com>
// - FROM_EMAIL=PCS United <concierge@pcsunited.com>
//
// IMPORTANT:
// - pcsunited.com must be verified in Resend before sending from @pcsunited.com.
// - Cloudflare Email Routing only receives/forwards email.
// - Resend controls which domains can send outbound email.
//
// EXPECTED email_codes TABLE FIELDS:
// - email text
// - code_hash text
// - attempts int4
// - created_at timestamptz
// - expires_at timestamptz
// ============================================================

"use strict";

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const FUNCTION_VERSION = "thewing-send-code-1.0.2";

const ALLOWED_ORIGINS = new Set([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",
  "https://pcs-united.webflow.io",
  "https://pcsu.webflow.io",
  "https://pcsunited-com-28346d.webflow.io",

  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",

  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8888",
  "http://127.0.0.1:8888"
]);

function getRequestOrigin(event) {
  return (
    event?.headers?.origin ||
    event?.headers?.Origin ||
    ""
  ).trim();
}

function getCorsHeaders(event) {
  const origin = getRequestOrigin(event);

  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function respond(event, statusCode, payload) {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(payload || {})
  };
}

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function makeSixDigitCode() {
  const number = crypto.randomInt(0, 1000000);
  return number.toString().padStart(6, "0");
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function getSupabaseUrl() {
  return cleanString(
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ""
  );
}

function getServiceKey() {
  return cleanString(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
  );
}

function getFromAddress() {
  return cleanString(
    process.env.EMAIL_FROM ||
    process.env.FROM_EMAIL ||
    "PCS United <concierge@pcsunited.com>"
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildGreeting(body) {
  const rank = cleanString(body.rank || body.rank_title || body.rankTitle);
  const lastName = cleanString(body.lastName || body.last_name);
  const firstName = cleanString(body.firstName || body.first_name);
  const fullName = cleanString(body.fullName || body.full_name || body.name);

  if (rank && lastName) return `${rank} ${lastName}`;
  if (firstName) return firstName;
  if (fullName) return fullName.split(/\s+/).filter(Boolean)[0] || fullName;
  return "there";
}

function buildTextEmail({ greeting, code }) {
  return `Hi ${greeting},

Your PCS United verification code is: ${code}

This code expires in 15 minutes.

If you did not request this code, you can ignore this email.

— PCS United`;
}

function buildHtmlEmail({ greeting, code, phone }) {
  const safeGreeting = escapeHtml(greeting);
  const safeCode = escapeHtml(code);
  const safePhone = escapeHtml(phone);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PCS United Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#080b12;font-family:Inter,Arial,sans-serif;color:#f4f7ff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080b12;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.035));border:1px solid rgba(255,255,255,.16);border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45);">
          <tr>
            <td style="padding:28px 28px 18px;">
              <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8ef3c5;font-weight:800;">
                PCS United Verification
              </div>

              <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.1;color:#ffffff;">
                Your verification code
              </h1>

              <p style="margin:0;color:#b8c0dc;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#ffffff;">${safeGreeting}</strong>, use this code to continue your signup.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 24px;">
              <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:24px;text-align:center;">
                <div style="font-size:40px;letter-spacing:.18em;font-weight:900;color:#ffffff;">
                  ${safeCode}
                </div>
                <div style="margin-top:10px;color:#9aa6c7;font-size:13px;">
                  This code expires in 15 minutes.
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 28px;">
              <div style="height:1px;background:rgba(255,255,255,.10);margin:0 0 18px;"></div>

              <p style="margin:0;color:#8f98b8;font-size:13px;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.
              </p>

              ${
                safePhone
                  ? `<p style="margin:12px 0 0;color:#8f98b8;font-size:12px;line-height:1.6;">Phone on file: ${safePhone}</p>`
                  : ""
              }

              <p style="margin:22px 0 0;color:#cbd3ee;font-size:14px;line-height:1.6;">
                — PCS United
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendWithResend({ apiKey, from, to, subject, text, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.name ||
      `Resend failed with HTTP ${response.status}`;

    const error = new Error(message);
    error.response = data;
    throw error;
  }

  return data;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return respond(event, 405, {
      ok: false,
      error: "Method not allowed. Use POST.",
      version: FUNCTION_VERSION
    });
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return respond(event, 400, {
      ok: false,
      error: "Invalid JSON body.",
      version: FUNCTION_VERSION
    });
  }

  const email = cleanEmail(body.email);
  const phone = cleanString(body.phone);
  const greeting = buildGreeting(body);

  if (!email || !isValidEmail(email)) {
    return respond(event, 400, {
      ok: false,
      error: "Valid email required.",
      version: FUNCTION_VERSION
    });
  }

  const SUPABASE_URL = getSupabaseUrl();
  const SERVICE_KEY = getServiceKey();
  const RESEND_API_KEY = cleanString(process.env.RESEND_API_KEY);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return respond(event, 500, {
      ok: false,
      error: "Supabase environment variables are not configured.",
      missing: {
        SUPABASE_URL: !SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY_or_SERVICE_KEY: !SERVICE_KEY
      },
      version: FUNCTION_VERSION
    });
  }

  if (!RESEND_API_KEY) {
    return respond(event, 500, {
      ok: false,
      error: "Email service is not configured. Missing RESEND_API_KEY.",
      version: FUNCTION_VERSION
    });
  }

  const from = getFromAddress();

  if (!from || !/@pcsunited\.com>/i.test(from)) {
    console.warn("TheWing send-code warning: EMAIL_FROM is not using @pcsunited.com.", {
      from
    });
  }

  const code = makeSixDigitCode();
  const code_hash = hashCode(code);
  const created_at = new Date().toISOString();
  const expires_at = minutesFromNow(15);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    const { error: insertError } = await supabase
      .from("email_codes")
      .insert([
        {
          email,
          code_hash,
          attempts: 0,
          created_at,
          expires_at
        }
      ]);

    if (insertError) {
      console.error("TheWing send-code Supabase insert error:", insertError);

      return respond(event, 500, {
        ok: false,
        error: "Verification code could not be saved.",
        details: insertError.message || null,
        version: FUNCTION_VERSION
      });
    }

    const subject = "PCS United • Your 6-Digit Verification Code";

    const text = buildTextEmail({
      greeting,
      code
    });

    const html = buildHtmlEmail({
      greeting,
      code,
      phone
    });

    const emailResult = await sendWithResend({
      apiKey: RESEND_API_KEY,
      from,
      to: email,
      subject,
      text,
      html
    });

    return respond(event, 200, {
      ok: true,
      message: "Verification code created, stored, and queued for delivery.",
      email,
      from,
      emailId: emailResult?.id || null,
      expires_at,
      version: FUNCTION_VERSION
    });
  } catch (error) {
    console.error("TheWing send-code error:", error);

    return respond(event, 500, {
      ok: false,
      error: error?.message || "Verification email could not be sent.",
      details: error?.response || null,
      from,
      version: FUNCTION_VERSION
    });
  }
};
