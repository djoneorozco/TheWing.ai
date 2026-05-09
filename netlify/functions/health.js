// =========================================================
// TheWing.ai • Health Check Function
// v1.0.0
// PURPOSE
// - Confirms Netlify Functions are working
// - Confirms TheWing SaaS API layer is live
// - Does NOT expose secrets
// ROUTE
// - /.netlify/functions/health
// - /api/health through netlify.toml redirect
// =========================================================

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      app: "TheWing.ai",
      role: "PCSUnited SaaS intelligence layer",
      status: "online",
      routes: {
        health: "/api/health"
      },
      timestamp: new Date().toISOString()
    })
  };
}
