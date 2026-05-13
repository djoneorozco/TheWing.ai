// ============================================================
// TheWing.ai • Voice Base Brief
// v1.0.0
//
// PURPOSE
// - Generates short spoken city/base summaries
// - Uses deterministic JSON data
// - Sends script to ElevenLabs
//
// ENDPOINT
// - /.netlify/functions/voice-base-brief
// - /api/voice-base-brief
// ============================================================

const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || "";

const VOICE_ID =
  process.env.ELEVENLABS_AMY_VOICE_ID ||
  "0JGhD2fmQLbYLFLa2sEZ";

const MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID ||
  "eleven_flash_v2_5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(statusCode, body, contentType = "application/json"){
  return {
    statusCode,
    headers:{
      ...corsHeaders,
      "Content-Type": contentType
    },
    body
  };
}

function clean(v){
  return String(v || "").trim();
}

function first(...vals){
  for(const v of vals){
    if(v !== undefined && v !== null && v !== ""){
      return v;
    }
  }
  return "";
}

function buildScript(data = {}){

  const city =
    clean(
      first(
        data.city,
        data.place,
        data.name
      )
    );

  const state =
    clean(
      first(
        data.state_code,
        data.state
      )
    );

  const base =
    clean(
      first(
        data.base_profile?.display_name,
        data.base_profile?.base_name,
        data.name
      )
    );

  const verdict =
    clean(
      first(
        data.market_bluf?.verdict,
        data.market_bluf?.bluf_headline
      )
    );

  const affordability =
    clean(
      first(
        data.financial_brief?.affordability_summary
      )
    );

  const buyerOpportunity =
    clean(
      first(
        data.financial_brief?.buyer_opportunity
      )
    );

  const strategy =
    clean(
      first(
        data.base_profile?.bah_market_reality?.base_tab_message,
        data.base_profile?.on_base_housing?.pcsu_strategy_note
      )
    );

  return `
Welcome to ${base}.

${city}${state ? `, ${state},` : ""} remains ${
verdict || "an important military housing market"
}.

${affordability}

${buyerOpportunity}

${strategy}

PCSUnited recommends focusing on affordability, commute balance, long-term ownership costs, and overall mission fit before purchasing.
  `
  .replace(/\s+/g, " ")
  .trim();
}

export async function handler(event){

  if(event.httpMethod === "OPTIONS"){
    return {
      statusCode:204,
      headers:corsHeaders,
      body:""
    };
  }

  if(event.httpMethod !== "POST"){
    return response(
      405,
      JSON.stringify({
        ok:false,
        error:"Method not allowed. Use POST."
      })
    );
  }

  if(!ELEVENLABS_API_KEY){
    return response(
      500,
      JSON.stringify({
        ok:false,
        error:"Missing ELEVENLABS_API_KEY"
      })
    );
  }

  try{

    const payload =
      JSON.parse(event.body || "{}");

    const script =
      buildScript(payload);

    const eleven =
      await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method:"POST",
          headers:{
            "xi-api-key":ELEVENLABS_API_KEY,
            "Content-Type":"application/json",
            "Accept":"audio/mpeg"
          },
          body:JSON.stringify({
            text:script,
            model_id:MODEL_ID,
            output_format:"mp3_44100_128",
            voice_settings:{
              stability:0.42,
              similarity_boost:0.82,
              style:0.28,
              use_speaker_boost:true
            }
          })
        }
      );

    if(!eleven.ok){

      const details =
        await eleven.text();

      return response(
        500,
        JSON.stringify({
          ok:false,
          error:"ElevenLabs request failed",
          details
        })
      );
    }

    const arrayBuffer =
      await eleven.arrayBuffer();

    const base64 =
      Buffer.from(arrayBuffer)
      .toString("base64");

    return response(
      200,
      JSON.stringify({
        ok:true,
        script,
        audio_base64:base64,
        mime_type:"audio/mpeg"
      })
    );

  }catch(err){

    return response(
      500,
      JSON.stringify({
        ok:false,
        error:String(err?.message || err)
      })
    );
  }
}
