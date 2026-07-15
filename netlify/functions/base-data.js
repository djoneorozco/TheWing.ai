/* ============================================================
   TheWing.ai • Base Data API
   netlify/functions/base-data.js

   PURPOSE
   - Loads PCSUnited base JSON files
   - Reads files from netlify/functions/cities/
   - Compatible with the repository's ES module setup
   - Returns CORS headers for Webflow

   EXAMPLE
   /api/base-data?file=Lackland.json
============================================================ */

import fs from "node:fs/promises";
import path from "node:path";

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
    Block path traversal and folder paths.

    Rejected examples:
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

async function readBaseFile(fileName){

  /*
    Netlify may place included files in either of these locations,
    depending on how the function is bundled.

    Primary:
    /var/task/netlify/functions/cities/Lackland.json

    Fallback:
    /var/task/cities/Lackland.json
  */

  const candidatePaths = [

    path.join(
      process.cwd(),
      "netlify",
      "functions",
      "cities",
      fileName
    ),

    path.join(
      process.cwd(),
      "cities",
      fileName
    ),

    path.join(
      "/var/task",
      "netlify",
      "functions",
      "cities",
      fileName
    ),

    path.join(
      "/var/task",
      "cities",
      fileName
    )

  ];

  let lastError =
    null;

  for(const filePath of candidatePaths){

    try{

      const raw =
        await fs.readFile(
          filePath,
          "utf8"
        );

      return {
        raw,
        filePath
      };

    }catch(error){

      lastError =
        error;

      if(error?.code !== "ENOENT"){
        throw error;
      }
    }
  }

  const notFoundError =
    new Error(
      `Base JSON file not found: ${fileName}`
    );

  notFoundError.code =
    "ENOENT";

  notFoundError.candidatePaths =
    candidatePaths;

  notFoundError.cause =
    lastError;

  throw notFoundError;
}

export async function handler(event){

  const method =
    event?.httpMethod ||
    "GET";

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

  try{

    const result =
      await readBaseFile(
        fileName
      );

    const data =
      JSON.parse(
        result.raw
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

      console.warn(
        "[TheWing Base Data] File not found:",
        {
          file:fileName,
          checked:
            error.candidatePaths ||
            []
        }
      );

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

      console.error(
        "[TheWing Base Data] Invalid JSON:",
        {
          file:fileName,
          message:error.message
        }
      );

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
