/* ============================================================
   TheWing.ai • Base Data API
   netlify/functions/base-data.js

   PURPOSE
   - Loads PCSUnited base JSON files
   - Reads files from netlify/functions/cities/
   - Uses ES Modules
   - Returns CORS headers for Webflow

   EXAMPLE
   /api/base-data?file=Lackland.json
============================================================ */

import fs from "node:fs/promises";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300"
};

function createResponse(statusCode, body){

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

  /*
    Prevent paths such as:
    ../Lackland.json
    cities/Lackland.json
    /Lackland.json
  */

  if(
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..")
  ){
    return "";
  }

  if(
    !/^[a-zA-Z0-9._-]+\.json$/i.test(
      fileName
    )
  ){
    return "";
  }

  return fileName;
}

export async function handler(event){

  const method =
    event?.httpMethod || "GET";

  if(method === "OPTIONS"){

    return {
      statusCode:204,
      headers:CORS_HEADERS,
      body:""
    };
  }

  if(method !== "GET"){

    return createResponse(
      405,
      {
        ok:false,
        error:"Method not allowed."
      }
    );
  }

  const requestedFile =
    event?.queryStringParameters?.file;

  const fileName =
    sanitizeFileName(
      requestedFile
    );

  if(!fileName){

    return createResponse(
      400,
      {
        ok:false,
        error:"A valid JSON filename is required.",
        example:"/api/base-data?file=Lackland.json"
      }
    );
  }

  /*
    base-data.js is located in:

    netlify/functions/base-data.js

    JSON files are located in:

    netlify/functions/cities/Lackland.json
  */

  const fileUrl =
    new URL(
      `./cities/${fileName}`,
      import.meta.url
    );

  try{

    const raw =
      await fs.readFile(
        fileUrl,
        "utf8"
      );

    const data =
      JSON.parse(
        raw
      );

    return createResponse(
      200,
      {
        ok:true,
        file:fileName,
        data
      }
    );

  }catch(error){

    if(error?.code === "ENOENT"){

      return createResponse(
        404,
        {
          ok:false,
          error:"Base JSON file not found.",
          file:fileName
        }
      );
    }

    if(error instanceof SyntaxError){

      return createResponse(
        500,
        {
          ok:false,
          error:"The selected base file contains invalid JSON.",
          file:fileName
        }
      );
    }

    console.error(
      "[TheWing Base Data] Load failed:",
      {
        file:fileName,
        message:
          error?.message ||
          String(error)
      }
    );

    return createResponse(
      500,
      {
        ok:false,
        error:"Unable to load base data.",
        file:fileName
      }
    );
  }
}
