// netlify/functions/voice-amy-welcome.js
// ============================================================
// TheWing.ai • PCSUnited Voice Amy Welcome
// v1.0.0
//
// PURPOSE
// - Creates a short personalized Amy welcome audio clip
// - Uses ElevenLabs Text-to-Speech
// - Keeps ELEVENLABS_API_KEY private in Netlify
//
// ENDPOINT
// - POST /.netlify/functions/voice-amy-welcome
// - POST /api/voice-amy-welcome if Netlify redirects are active
// ============================================================

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Replace this with the Amy voice_id you want to use.
const AMY_VOICE_ID = process.env.ELEVENLABS_AMY_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

const ELEVENLABS_MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function formatMoney(value) {
  const raw = Number(String(value || "").replace(/[^\d.]/g, ""));

  if (!Number.isFinite(raw) || raw <= 0) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(raw);
}

function buildAmyWelcomeScript(payload) {
  const rank = cleanText(payload.rank || payload.rank_paygrade);
  const lastName = cleanText(payload.last_name || payload.lastName);
  const city = cleanText(payload.city || payload.market || payload.base);
  const price = formatMoney(
    payload.home_purchase_price ||
      payload.projected_home_price ||
      payload.purchasePrice ||
      payload.price
  );

  const nameLine =
    rank && lastName
      ? `Welcome, ${rank} ${lastName}, to PCSUnited.`
      : "Welcome to PCSUnited.";

  const cityPriceLine =
    price && city
      ? `I see you're exploring a home purchase around ${price} in ${city}.`
      : price
        ? `I see you're exploring a home purchase around ${price}.`
        : city
          ? `I see you're reviewing your PCS housing options in ${city}.`
          : "I see you're reviewing your PCS housing options.";

  return `${nameLine} I'm Amy, your virtual concierge. ${cityPriceLine} I can help you understand your PCS budget, BAH, affordability range, and next best move before you buy.`;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "Method not allowed. Use POST.",
    });
  }

  if (!ELEVENLABS_API_KEY) {
    return jsonResponse(500, {
      ok: false,
      error: "Missing ELEVENLABS_API_KEY environment variable.",
    });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "Invalid JSON body.",
    });
  }

  const script = buildAmyWelcomeScript(payload);

  try {
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${AMY_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: script,
          model_id: ELEVENLABS_MODEL_ID,
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.58,
            similarity_boost: 0.78,
            style: 0.18,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();

      return jsonResponse(elevenLabsResponse.status, {
        ok: false,
        error: "ElevenLabs request failed.",
        details: errorText,
      });
    }

    const audioArrayBuffer = await elevenLabsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString("base64");

    return jsonResponse(200, {
      ok: true,
      provider: "elevenlabs",
      voice_id: AMY_VOICE_ID,
      model_id: ELEVENLABS_MODEL_ID,
      script,
      audio_mime_type: "audio/mpeg",
      audio_base64: audioBase64,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: "Voice Amy generation failed.",
      details: error?.message || String(error),
    });
  }
}
