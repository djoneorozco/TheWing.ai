// ==========================================================
// TheWing.ai
// /api/base-data
//
// Returns a PCSUnited Base JSON file
//
// Example:
// /api/base-data?file=Lackland.json
// /api/base-data?file=Cannon.json
// ==========================================================

const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {

  try {

    const file =
      String(event.queryStringParameters?.file || "")
        .trim();

    if (!file) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          success: false,
          error: "Missing file parameter."
        })
      };
    }

    // ------------------------------------------------------
    // Prevent directory traversal
    // ------------------------------------------------------

    const safeFile =
      path.basename(file);

    if (!safeFile.toLowerCase().endsWith(".json")) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          success: false,
          error: "Only JSON files are allowed."
        })
      };
    }

    // ------------------------------------------------------
    // Cities folder
    // ------------------------------------------------------

    const jsonPath = path.join(
      __dirname,
      "cities",
      safeFile
    );

    if (!fs.existsSync(jsonPath)) {

      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          success: false,
          error: "Base JSON not found.",
          file: safeFile
        })
      };

    }

    const json =
      fs.readFileSync(
        jsonPath,
        "utf8"
      );

    return {

      statusCode: 200,

      headers: {

        "Content-Type": "application/json",

        "Cache-Control":
          "public, max-age=300",

        "Access-Control-Allow-Origin": "*"

      },

      body: json

    };

  }

  catch (err) {

    console.error(err);

    return {

      statusCode: 500,

      headers: {

        "Content-Type": "application/json",

        "Access-Control-Allow-Origin": "*"

      },

      body: JSON.stringify({

        success: false,

        error: err.message

      })

    };

  }

};
