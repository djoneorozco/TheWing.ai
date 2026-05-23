// ============================================================
// TheWing.ai • Voice Base Brief
// v1.1.0
//
// PURPOSE
// - Generates spoken Amy summaries
// - Supports Base Demographics scripts
// - Supports BasicBrain custom_script
// - Uses ElevenLabs
//
// ENDPOINT
// - /.netlify/functions/voice-base-brief
// - /api/voice-base-brief
// ============================================================

"use strict";

const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || "";

const VOICE_ID =
  process.env.ELEVENLABS_AMY_VOICE_ID ||
  "0JGhD2fmQLbYLFLa2sEZ";

const MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID ||
  "eleven_flash_v2_5";

const ALLOWED_ORIGINS = new Set([
  "https://pcsunited.com",
  "https://www.pcsunited.com",
  "https://pcsunited.netlify.app",
  "https://pcsunited-com-28346d.webflow.io",
  "https://pcs-united.webflow.io",
  "https://pcsu.webflow.io",
  "https://thewing.ai",
  "https://www.thewing.ai",
  "https://thewing.netlify.app",
  "http://localhost:3000",
  "http://localhost:8888",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8888"
]);

function getOrigin(event){
  return String(
    event?.headers?.origin ||
    event?.headers?.Origin ||
    ""
  ).trim();
}

function corsHeaders(event){
  const origin = getOrigin(event);

  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function response(event, statusCode, payload){
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(payload || {})
  };
}

function clean(value){
  return String(value || "").trim();
}

function first(...values){
  for(const value of values){
    if(value !== undefined && value !== null && clean(value)){
      return value;
    }
  }

  return "";
}

function normalizeSpaces(text){
  return clean(text).replace(/\s+/g, " ");
}

function buildBaseBriefScript(data = {}){
  const city = clean(
    first(
      data.city,
      data.place,
      data.name
    )
  );

  const state = clean(
    first(
      data.state_code,
      data.state
    )
  );

  const base = clean(
    first(
      data.base,
      data.base_profile?.display_name,
      data.base_profile?.base_name,
      data.name
    )
  );

  const verdict = clean(
    first(
      data.market_bluf?.verdict,
      data.market_bluf?.bluf_headline
    )
  );

  const affordability = clean(
    first(
      data.financial_brief?.affordability_summary
    )
  );

  const buyerOpportunity = clean(
    first(
      data.financial_brief?.buyer_opportunity
    )
  );

  const strategy = clean(
    first(
      data.base_profile?.bah_market_reality?.base_tab_message,
      data.base_profile?.on_base_housing?.pcsu_strategy_note
    )
  );

  return normalizeSpaces(`
    Welcome to ${base || "your gaining base"}.

    ${city || "This market"}${state ? `, ${state},` : ""} remains ${
      verdict || "an important military housing market"
    }.

    ${affordability}

    ${buyerOpportunity}

    ${strategy}

    PCSUnited recommends focusing on affordability, commute balance, long-term ownership costs, and overall mission fit before purchasing.
  `);
}

function buildScript(payload = {}){
  const customScript = clean(payload.custom_script);

  if(customScript){
    return normalizeSpaces(customScript);
  }

  return buildBaseBriefScript(payload);
}

exports.handler = async function handler(event){
  if(event.httpMethod === "OPTIONS"){
    return {
      statusCode: 204,
      headers: corsHeaders(event),
      body: ""
    };
  }

  if(event.httpMethod !== "POST"){
    return response(event, 405, {
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  if(!ELEVENLABS_API_KEY){
    return response(event, 500, {
      ok: false,
      error: "Missing ELEVENLABS_API_KEY"
    });
  }

  let payload = {};

  try{
    payload = JSON.parse(event.body || "{}");
  }catch(_){
    return response(event, 400, {
      ok: false,
      error: "Invalid JSON body."
    });
  }

  try{
    const script = buildScript(payload);

    if(!script){
      return response(event, 400, {
        ok: false,
        error: "No voice script could be generated."
      });
    }

    const eleven = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: script,
          model_id: MODEL_ID,
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.42,
            similarity_boost: 0.82,
            style: 0.28,
            use_speaker_boost: true
          }
        })
      }
    );

    if(!eleven.ok){
      const details = await eleven.text();

      return response(event, 500, {
        ok: false,
        error: "ElevenLabs request failed",
        details
      });
    }

    const arrayBuffer = await eleven.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

    return response(event, 200, {
      ok: true,
      script,
      audio_base64: audioBase64,
      audio_mime_type: "audio/mpeg",
      mime_type: "audio/mpeg",
      source: "thewing.voice-base-brief.v1.1.0"
    });

  }catch(error){
    return response(event, 500, {
      ok: false,
      error: error?.message || "Voice generation failed."
    });
  }
};
