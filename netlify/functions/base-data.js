/* ============================================================
   TheWing.ai • Base Data API
   netlify/functions/base-data.js

   PURPOSE
   - Safely loads PCSUnited base JSON files
   - Reads files from netlify/functions/cities/
   - Supports ES Modules
   - Returns Webflow-safe CORS headers

   EXAMPLE
   /api/base-data?file=Lackland.json
============================================================ */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300"
};

function response(statusCode, body){

  return {
    statusCode,
    headers:CORS_HEADERS,
    body:JSON.stringify(body)
  };
}

function sanitizeFileName(value){

  const fileName =
    String(value || "")
      .trim();

  if(!fileName){
    return "";
  }

  const safeName =
    path.basename(fileName);

  if(
    safeName !== fileName ||
    !/^[a-zA-Z0-9._-]+\.json$/i.test(safeName)
  ){
    return "";
  }

  return safeName;
}

export async function handler(event){

  if(event.httpMethod === "OPTIONS"){

    return {
      statusCode:204,
      headers:CORS_HEADERS,
      body:""
    };
  }

  if(event.httpMethod !== "GET"){

    return response(
      405,
      {
        ok:false,
        error:"Method not allowed."
      }
    );
  }

  const requestedFile =
    event.queryStringParameters?.file;

  const fileName =
    sanitizeFileName(requestedFile);

  if(!fileName){

    return response(
      400,
      {
        ok:false,
        error:"A valid JSON filename is required.",
        example:"/api/base-data?file=Lackland.json"
      }
    );
  }

  const citiesDirectory =
    path.join(
      __dirname,
      "cities"
    );

  const filePath =
    path.join(
      citiesDirectory,
      fileName
    );

  try{

    const raw =
      await fs.readFile(
        filePath,
        "utf8"
      );

    const data =
      JSON.parse(raw);

    return response(
      200,
      {
        ok:true,
        file:fileName,
        data
      }
    );

  }catch(error){

    if(error?.code === "ENOENT"){

      return response(
        404,
        {
          ok:false,
          error:"Base JSON file not found.",
          file:fileName
        }
      );
    }

    if(error instanceof SyntaxError){

      return response(
        500,
        {
          ok:false,
          error:"The base JSON file contains invalid JSON.",
          file:fileName
        }
      );
    }

    console.error(
      "[TheWing Base Data] Failed to load base JSON:",
      {
        file:fileName,
        message:error?.message || String(error)
      }
    );

    return response(
      500,
      {
        ok:false,
        error:"Unable to load base data.",
        file:fileName
      }
    );
  }
}
