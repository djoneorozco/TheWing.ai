// netlify/functions/rentcast.js

exports.handler = async function (event) {
  try {
    const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY;

    if (!RENTCAST_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing RENTCAST_API_KEY" }),
      };
    }

    const params = event.queryStringParameters || {};
    const address = params.address;

    if (!address) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing address" }),
      };
    }

    const url =
      "https://api.rentcast.io/v1/avm/rent/long-term?" +
      new URLSearchParams({ address });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": RENTCAST_API_KEY,
        "Accept": "application/json",
      },
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "RentCast request failed",
        details: err.message,
      }),
    };
  }
};
