/* ============================================================
  THEWING.AI • ASK AMY BASE MAP SERVER
  ask-amy-base-map-server.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Dedicated server-side Amy for the Interactive U.S. Air Force
  Base Map.

  ARCHITECTURE
  -------------------------------------------------------------
  Interactive Base Map
        ↓
  selected base file (example: Randolph.json)
        ↓
  /.netlify/functions/ask-amy-base-map
        ↓
  THIS FILE
        ↓
  netlify/functions/cities/<base>.json
        ↓
  OpenAI
        ↓
  Amy explains the selected installation

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing data is authoritative. Amy explains.

  IMPORTANT
  -------------------------------------------------------------
  - The browser chooses the base; it does not supply factual truth.
  - This server loads the selected base JSON itself.
  - Never invent missing operator numbers, gate hours, population,
    mission details, services, addresses, or installation facts.
  - Time-sensitive gate/access information must preserve the
    verification language contained in the JSON.
  - Public session only.
  - No Supabase.
  - No member accounts.
============================================================ */

import fs from "node:fs/promises";
import path from "node:path";


/* ============================================================
   1. CONFIG
============================================================ */

const VERSION =
  "ask-amy-base-map-server-1.0.0";

const RESPONSE_CONTRACT_VERSION =
  "ask-amy-base-map-response-v1";

const SCOPE =
  "interactive_base_map";

const DISPLAY_NAME =
  "Amy — Base Map Concierge";


const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  "";


const DEFAULT_MODEL =
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";


const MAX_MESSAGE_LENGTH =
  5000;

const MAX_THREAD_MESSAGES =
  12;

const MAX_THREAD_MESSAGE_LENGTH =
  5000;

const MAX_MEMORY_KEYS =
  20;

const MAX_MEMORY_STRING_LENGTH =
  500;

const DEFAULT_MAX_REPLY_CHARS =
  1200;

const DEFAULT_GREETING_MAX_CHARS =
  340;

const DEFAULT_MAX_FOLLOW_UP_QUESTIONS =
  1;

const MIN_REPLY_CHARS =
  180;

const MAX_REPLY_CHARS =
  1800;

const OPENAI_TIMEOUT_MS =
  25000;

const MAX_BASE_JSON_BYTES =
  750000;


/*

  NETLIFY / LOCAL FILE ROOT

  Netlify deploys the bundled function under /var/task.

  LAMBDA_TASK_ROOT is preferred in production.

  process.cwd() provides the local-development fallback.

  Do NOT use import.meta.url here because Netlify may bundle

  this server through a CommonJS wrapper.

*/

const FUNCTION_ROOT =

  process.env.LAMBDA_TASK_ROOT ||

  process.cwd();

/*

  Authoritative base JSON directory candidates.

  Production expected location:

  /var/task/netlify/functions/cities/<base>.json

  Local development expected location:

  <repo>/netlify/functions/cities/<base>.json

*/

const CITIES_DIR_CANDIDATES =

  Object.freeze([

    path.join(

      FUNCTION_ROOT,

      "netlify",

      "functions",

      "cities"

    ),

    path.join(

      process.cwd(),

      "netlify",

      "functions",

      "cities"

    ),

    path.join(

      FUNCTION_ROOT,

      "cities"

    ),

    path.join(

      process.cwd(),

      "cities"

    )

  ]);


/* ============================================================
   2. BASE MAP INTENTS
============================================================ */

const INTENTS =
  Object.freeze({

    GREETING:
      "greeting",

    CAPABILITIES:
      "capabilities",

    NO_BASE_SELECTED:
      "no_base_selected",

    OVERVIEW:
      "base_overview",

    MISSION:
      "mission",

    OPERATOR:
      "operator_phone",

    GATES:
      "gate_hours",

    POPULATION:
      "base_population",

    VISITOR:
      "visitor_control_center",

    SERVICES:
      "major_services",

    HOUSING:
      "on_base_housing",

    NEIGHBORHOODS:
      "recommended_neighborhoods",

    COMMUTE:
      "commute_intelligence",

    ARRIVAL:
      "arrival_guidance",

    LINKS:
      "official_links",

    GENERAL_BASE:
      "general_base_question",

    OUT_OF_SCOPE:
      "out_of_scope"

  });


/* ============================================================
   3. GENERIC HELPERS
============================================================ */

function clean(
  value
) {

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


function lower(
  value
) {

  return clean(
    value
  ).toLowerCase();

}


function isPlainObject(
  value
) {

  return Boolean(

    value &&

    typeof value ===
      "object" &&

    !Array.isArray(
      value
    )

  );

}


function safeJsonParse(
  value,
  fallback = null
) {

  try {

    return JSON.parse(
      value
    );

  } catch (_) {

    return fallback;

  }

}


function clone(
  value,
  fallback = null
) {

  try {

    return JSON.parse(
      JSON.stringify(
        value
      )
    );

  } catch (_) {

    return fallback;

  }

}


function clamp(
  value,
  min,
  max
) {

  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {

    return null;

  }

  return Math.max(
    min,
    Math.min(
      max,
      number
    )
  );

}


function finiteNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }

  const number =
    Number(
      String(
        value
      ).replace(
        /,/g,
        ""
      )
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


function formatNumber(
  value
) {

  const number =
    finiteNumber(
      value
    );

  if (
    number === null
  ) {

    return clean(
      value
    );

  }

  return number
    .toLocaleString(
      "en-US"
    );

}


function safeArray(
  value,
  max = 20
) {

  return Array.isArray(
    value
  )
    ? value.slice(
        0,
        max
      )
    : [];

}


function safeText(
  value,
  max = 4000
) {

  const text =
    clean(
      value
    );

  return text
    ? text.slice(
        0,
        max
      )
    : "";

}


function stripEmpty(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        stripEmpty
      )
      .filter(
        item =>
          item !== undefined &&
          item !== null &&
          item !== ""
      );

  }


  if (
    !isPlainObject(
      value
    )
  ) {

    return value;

  }


  const output =
    {};


  for (
    const [
      key,
      nested
    ]
    of Object.entries(
      value
    )
  ) {

    if (
      nested === undefined ||
      nested === null ||
      nested === ""
    ) {

      continue;

    }


    if (
      Array.isArray(
        nested
      )
    ) {

      const array =
        stripEmpty(
          nested
        );

      if (
        array.length
      ) {

        output[
          key
        ] =
          array;

      }

      continue;

    }


    if (
      isPlainObject(
        nested
      )
    ) {

      const object =
        stripEmpty(
          nested
        );

      if (
        Object.keys(
          object
        ).length
      ) {

        output[
          key
        ] =
          object;

      }

      continue;

    }


    output[
      key
    ] =
      nested;

  }


  return output;

}


/* ============================================================
   4. CORS / HTTP
============================================================ */

function resolveAllowedOrigin(
  event
) {

  const origin =
    clean(

      event
        ?.headers
        ?.origin ||

      event
        ?.headers
        ?.Origin

    );


  if (
    !origin
  ) {

    return "*";

  }


  try {

    const url =
      new URL(
        origin
      );


    const hostname =
      lower(
        url.hostname
      );


    if (

      hostname ===
        "thewing.ai" ||

      hostname ===
        "www.thewing.ai" ||

      hostname.endsWith(
        ".thewing.ai"
      ) ||

      hostname.endsWith(
        ".webflow.io"
      ) ||

      hostname.endsWith(
        ".netlify.app"
      ) ||

      hostname ===
        "localhost" ||

      hostname ===
        "127.0.0.1"

    ) {

      return origin;

    }

  } catch (_) {

    /* Ignore malformed origin */

  }


  return (
    "https://thewing.ai"
  );

}


function corsHeaders(
  event
) {

  return {

    "Access-Control-Allow-Origin":
      resolveAllowedOrigin(
        event
      ),

    "Access-Control-Allow-Headers":
      "Content-Type, X-TheWing-Client",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Max-Age":
      "86400",

    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    "Vary":
      "Origin"

  };

}


function respond(
  event,
  statusCode,
  payload
) {

  return {

    statusCode,

    headers:
      corsHeaders(
        event
      ),

    body:
      JSON.stringify(
        payload
      )

  };

}


function respondError(
  event,
  statusCode,
  error,
  code,
  conversationId = null
) {

  return respond(
    event,
    statusCode,
    {

      ok:
        false,

      error:
        clean(
          error
        ) ||
        "Ask Amy Base Map could not complete the request.",

      code:
        clean(
          code
        ) ||
        "REQUEST_FAILED",

      scope:
        SCOPE,

      conversation_id:
        conversationId ||
        null

    }
  );

}


/* ============================================================
   5. REQUEST PARSING
============================================================ */

function parseRequestBody(
  event
) {

  if (
    !event
  ) {

    return {};

  }


  if (
    isPlainObject(
      event.body
    )
  ) {

    return event.body;

  }


  const raw =
    clean(
      event.body
    );


  if (
    !raw
  ) {

    return {};

  }


  if (
    event.isBase64Encoded ===
      true
  ) {

    try {

      return (
        safeJsonParse(

          Buffer
            .from(
              raw,
              "base64"
            )
            .toString(
              "utf8"
            ),

          {}

        ) ||
        {}
      );

    } catch (_) {

      return {};

    }

  }


  return (
    safeJsonParse(
      raw,
      {}
    ) ||
    {}
  );

}


/* ============================================================
   6. CONVERSATION CONTEXT
============================================================ */

function sanitizeMemoryValue(
  value,
  depth = 0
) {

  if (
    depth >
      3
  ) {

    return undefined;

  }


  if (
    value ===
      null
  ) {

    return null;

  }


  if (
    typeof value ===
      "string"
  ) {

    return value.slice(
      0,
      MAX_MEMORY_STRING_LENGTH
    );

  }


  if (
    typeof value ===
      "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : undefined;

  }


  if (
    typeof value ===
      "boolean"
  ) {

    return value;

  }


  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .slice(
        0,
        20
      )
      .map(
        item =>
          sanitizeMemoryValue(
            item,
            depth + 1
          )
      )
      .filter(
        item =>
          item !== undefined
      );

  }


  if (
    !isPlainObject(
      value
    )
  ) {

    return undefined;

  }


  const output =
    {};

  let count =
    0;


  for (
    const [
      key,
      nested
    ]
    of Object.entries(
      value
    )
  ) {

    if (
      count >=
        MAX_MEMORY_KEYS
    ) {

      break;

    }


    const safeKey =
      clean(
        key
      );


    if (

      !safeKey ||

      safeKey ===
        "__proto__" ||

      safeKey ===
        "constructor" ||

      safeKey ===
        "prototype" ||

      safeKey.startsWith(
        "__"
      )

    ) {

      continue;

    }


    const sanitized =
      sanitizeMemoryValue(
        nested,
        depth + 1
      );


    if (
      sanitized !==
        undefined
    ) {

      output[
        safeKey
      ] =
        sanitized;

      count +=
        1;

    }

  }


  return output;

}


function sanitizeMemory(
  value
) {

  if (
    !isPlainObject(
      value
    )
  ) {

    return {};

  }


  return (
    sanitizeMemoryValue(
      value,
      0
    ) ||
    {}
  );

}


function sanitizeThread(
  value,
  currentMessage = ""
) {

  if (
    !Array.isArray(
      value
    )
  ) {

    return [];

  }


  const output =
    [];


  for (
    const item
    of value
  ) {

    if (
      !isPlainObject(
        item
      )
    ) {

      continue;

    }


    const role =
      lower(
        item.role
      );


    if (

      role !==
        "user" &&

      role !==
        "assistant"

    ) {

      continue;

    }


    const content =
      clean(
        item.content
      ).slice(
        0,
        MAX_THREAD_MESSAGE_LENGTH
      );


    if (
      !content
    ) {

      continue;

    }


    output.push({

      role,

      content

    });

  }


  const newest =
    output.slice(
      -MAX_THREAD_MESSAGES
    );


  const current =
    clean(
      currentMessage
    );


  if (

    current &&

    newest.length &&

    newest[
      newest.length - 1
    ].role ===
      "user" &&

    newest[
      newest.length - 1
    ].content ===
      current

  ) {

    newest.pop();

  }


  return newest;

}


function parseConversationContext(
  body,
  message
) {

  const context =
    isPlainObject(
      body.context
    )
      ? body.context
      : {};


  const responseLimits =

    isPlainObject(
      context.response_limits
    )
      ? context.response_limits

      : isPlainObject(
          body.response_limits
        )
        ? body.response_limits
        : {};


  return {

    conversation_id:
      clean(

        context
          .conversation_id ||

        body
          .conversation_id

      ).slice(
        0,
        200
      ) ||
      null,


    thread:
      sanitizeThread(

        Array.isArray(
          context.thread
        )
          ? context.thread
          : body.thread,

        message

      ),


    memory:
      sanitizeMemory(

        isPlainObject(
          context.memory
        )
          ? context.memory
          : body.memory

      ),


    page:
      clean(

        context.page ||

        body.page

      ).slice(
        0,
        200
      ) ||
      "interactive-base-map",


    widget:
      clean(

        context.widget ||

        body.widget

      ).slice(
        0,
        200
      ) ||
      "ask-amy-base-map",


    response_limits: {

      max_chars:
        clamp(

          responseLimits
            .max_chars,

          MIN_REPLY_CHARS,

          MAX_REPLY_CHARS

        ) ||
        DEFAULT_MAX_REPLY_CHARS,


      greeting_max_chars:
        clamp(

          responseLimits
            .greeting_max_chars,

          100,

          1000

        ) ||
        DEFAULT_GREETING_MAX_CHARS,


      max_follow_up_questions:
        clamp(

          responseLimits
            .max_follow_up_questions,

          0,

          2

        )
        ??
        DEFAULT_MAX_FOLLOW_UP_QUESTIONS

    }

  };

}


/* ============================================================
   7. BASE FILE SELECTION
============================================================ */

function getRequestedBaseFile(
  body
) {

  const base =
    isPlainObject(
      body.base
    )
      ? body.base
      : {};


  const context =
    isPlainObject(
      body.context
    )
      ? body.context
      : {};


  const contextBase =
    isPlainObject(
      context.base
    )
      ? context.base
      : {};


  return clean(

    body.base_file ||

    body.baseFile ||

    body.fileName ||

    body.filename ||

    base.fileName ||

    base.filename ||

    base.file ||

    context.base_file ||

    context.baseFile ||

    contextBase.fileName ||

    contextBase.filename ||

    contextBase.file

  );

}


function normalizeBaseFile(
  value
) {

  let file =
    clean(
      value
    );


  if (
    !file
  ) {

    return "";

  }


  if (
    !/\.json$/i.test(
      file
    )
  ) {

    file +=
      ".json";

  }


  /*
    IMPORTANT SECURITY RULE

    Only a single JSON filename is accepted.

    Allowed:
    Randolph.json
    F.E-Warren.json
    Davis-Monthan.json

    Rejected:
    ../../file
    /etc/passwd
    https://...
  */

  if (

    file.includes(
      "/"
    ) ||

    file.includes(
      "\\"
    ) ||

    file.includes(
      ".."
    ) ||

    !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/i.test(
      file
    )

  ) {

    return "";

  }


  return file;

}


/* ============================================================
   8. LOAD AUTHORITATIVE BASE JSON
============================================================ */

async function loadBaseJson(
  fileName
) {

  const file =
    normalizeBaseFile(
      fileName
    );


  if (
    !file
  ) {

    const error =
      new Error(
        "Invalid base file."
      );

    error.code =
      "INVALID_BASE_FILE";

    throw error;

  }


  let lastError =
    null;


  for (
    const directory
    of CITIES_DIR_CANDIDATES
  ) {

    const candidate =
      path.join(
        directory,
        file
      );


    try {

      const stat =
        await fs.stat(
          candidate
        );


      if (
        !stat.isFile()
      ) {

        continue;

      }


      if (
        stat.size >
          MAX_BASE_JSON_BYTES
      ) {

        const error =
          new Error(
            "Base JSON is larger than the allowed limit."
          );

        error.code =
          "BASE_JSON_TOO_LARGE";

        throw error;

      }


      const raw =
        await fs.readFile(
          candidate,
          "utf8"
        );


      const json =
        safeJsonParse(
          raw,
          null
        );


      if (
        !isPlainObject(
          json
        )
      ) {

        const error =
          new Error(
            "Base JSON is invalid."
          );

        error.code =
          "INVALID_BASE_JSON";

        throw error;

      }


      return {

        fileName:
          file,

        json

      };


    } catch (
      error
    ) {


      if (

        error
          ?.code ===
          "ENOENT" ||

        error
          ?.code ===
          "ENOTDIR"

      ) {

        lastError =
          error;

        continue;

      }


      throw error;

    }

  }


  const error =
    new Error(
      `Base data file not found: ${file}`
    );


  error.code =
    "BASE_FILE_NOT_FOUND";


  error.cause =
    lastError;


  throw error;

}


/* ============================================================
   9. BASE SNAPSHOT SANITIZERS
============================================================ */

function sanitizeGate(
  gate
) {

  if (
    !isPlainObject(
      gate
    )
  ) {

    return null;

  }


  return stripEmpty({

    name:
      safeText(

        gate.name ||

        gate.gate_name,

        200

      ),


    type:
      safeText(
        gate.type,
        120
      ),


    status:
      safeText(

        gate.status ||

        gate.operating_status ||

        gate.access_status,

        200

      ),


    hours:
      safeText(

        gate.hours ||

        gate.operating_hours ||

        gate.hours_of_operation ||

        gate.schedule,

        500

      ),


    phone:
      safeText(

        gate.phone ||

        gate.telephone ||

        gate.contact_phone,

        100

      ),


    location:
      safeText(

        gate.location ||

        gate.address ||

        gate.intersection ||

        gate.map_zone,

        500

      ),


    best_for:
      safeArray(
        gate.best_for,
        10
      )
        .map(
          value =>
            safeText(
              value,
              200
            )
        ),


    commute_notes:
      safeText(
        gate.commute_notes,
        800
      ),


    user_warning:
      safeText(
        gate.user_warning,
        800
      )

  });

}


function sanitizeService(
  service
) {

  if (
    !isPlainObject(
      service
    )
  ) {

    return null;

  }


  return stripEmpty({

    name:
      safeText(
        service.name,
        250
      ),

    category:
      safeText(
        service.category,
        100
      ),

    address:
      safeText(
        service.address,
        500
      ),

    phone:
      safeText(
        service.phone,
        120
      ),

    hours:
      safeText(
        service.hours,
        500
      ),

    best_for:
      safeArray(
        service.best_for,
        10
      )
        .map(
          value =>
            safeText(
              value,
              200
            )
        ),

    user_note:
      safeText(
        service.user_note,
        800
      )

  });

}


function sanitizeNeighborhood(
  item
) {

  if (
    typeof item ===
      "string"
  ) {

    return {

      name:
        safeText(
          item,
          200
        )

    };

  }


  if (
    !isPlainObject(
      item
    )
  ) {

    return null;

  }


  return stripEmpty({

    name:
      safeText(
        item.name,
        200
      ),

    type:
      safeText(
        item.type,
        100
      ),

    fit_summary:
      safeText(
        item.fit_summary,
        1000
      ),

    best_for:
      safeArray(
        item.best_for,
        10
      )
        .map(
          value =>
            safeText(
              value,
              200
            )
        ),

    commute_band:
      safeText(
        item.commute_band,
        300
      ),

    likely_gate_logic:
      safeArray(
        item.likely_gate_logic,
        8
      )
        .map(
          value =>
            safeText(
              value,
              200
            )
        ),

    bah_fit:
      safeText(
        item.bah_fit,
        100
      ),

    family_fit:
      safeText(
        item.family_fit,
        100
      ),

    single_airman_fit:
      safeText(
        item.single_airman_fit,
        100
      ),

    va_buyer_fit:
      safeText(
        item.va_buyer_fit,
        100
      ),

    traffic_risk:
      safeText(
        item.traffic_risk,
        100
      ),

    watchouts:
      safeArray(
        item.watchouts,
        10
      )
        .map(
          value =>
            safeText(
              value,
              300
            )
        ),

    pcsu_recommendation:
      safeText(
        item.pcsu_recommendation,
        1000
      )

  });

}


/* ============================================================
   10. OPERATOR + POPULATION
============================================================ */

function extractOperator(
  profile,
  json
) {

  const candidates =
    [

      profile.base_operator,

      profile.operator,

      profile.installation_operator

    ]
      .filter(
        isPlainObject
      );


  const object =
    candidates[
      0
    ] ||
    {};


  const phone =
    clean(

      object.phone ||

      object.telephone ||

      object.number ||

      profile.operator_phone ||

      profile.base_operator_phone ||

      profile.installation_operator_phone ||

      profile.main_phone ||

      profile.main_base_phone ||

      json.operator_phone ||

      json.base_operator_phone ||

      json.main_phone

    );


  return stripEmpty({

    label:
      safeText(

        object.label ||

        object.name ||

        profile.main_phone_label ||

        profile.operator_phone_label ||

        "Installation Operator",

        200

      ),


    phone:
      safeText(
        phone,
        120
      )

  });

}


function extractInstallationPopulation(
  profile,
  json
) {

  const raw =

    profile
      .installation_population
      ??

    profile
      .base_population
      ??

    profile
      .population_on_base
      ??

    json
      .installation_population
      ??

    json
      .base_population
      ??

    null;


  /*
    CRITICAL:

    DO NOT fall back to:

      json.population

    Your city/base JSON files use that top-level field
    for the surrounding community population.

    It is NOT necessarily the installation population.
  */


  if (

    raw === null ||

    raw === undefined ||

    raw === ""

  ) {

    return null;

  }


  if (
    !isPlainObject(
      raw
    )
  ) {

    return {

      total:
        formatNumber(
          raw
        )

    };

  }


  return stripEmpty({

    total:
      formatNumber(

        raw.total
        ??

        raw.total_population
        ??

        raw.estimated_total
        ??

        raw.population
        ??

        ""

      ),


    active_duty:
      formatNumber(
        raw.active_duty
      ),


    military:
      formatNumber(
        raw.military
      ),


    civilian:
      formatNumber(

        raw.civilian
        ??

        raw.civilians

      ),


    dependents:
      formatNumber(
        raw.dependents
      ),


    family_members:
      formatNumber(
        raw.family_members
      ),


    reserve_guard:
      formatNumber(

        raw.reserve_guard
        ??

        raw.reservists

      ),


    retirees:
      formatNumber(
        raw.retirees
      ),


    note:
      safeText(

        raw.note ||

        raw.notes ||

        raw.as_of_note,

        1000

      )

  });

}


/* ============================================================
   11. BUILD AUTHORITATIVE BASE SNAPSHOT
============================================================ */

function sanitizeBaseSnapshot(
  json,
  fileName
) {

  const profile =
    isPlainObject(
      json.base_profile
    )
      ? json.base_profile
      : {};


  const visitor =
    isPlainObject(
      profile.visitor_control_center
    )
      ? profile.visitor_control_center
      : {};


  const officialLinks =

    isPlainObject(
      profile.official_links
    )
      ? profile.official_links

      : isPlainObject(
          json.official_links
        )
        ? json.official_links
        : {};


  const gates =
    safeArray(
      profile.gates,
      20
    )
      .map(
        sanitizeGate
      )
      .filter(
        Boolean
      );


  const services =
    safeArray(
      profile.major_services,
      20
    )
      .map(
        sanitizeService
      )
      .filter(
        Boolean
      );


  const neighborhoods =
    safeArray(

      profile
        .recommended_neighborhoods,

      20

    )
      .map(
        sanitizeNeighborhood
      )
      .filter(
        Boolean
      );


  return stripEmpty({

    source: {

      authority:
        "server_loaded_base_json",

      file:
        fileName,

      schema_version:
        safeText(
          profile.schema_version,
          100
        ),

      last_updated:
        safeText(

          json
            .last_updated_data_from_sources ||

          profile
            .last_updated ||

          json
            .last_updated,

          200

        )

    },


    identity: {

      base_id:
        safeText(

          profile.base_id ||

          json.slug,

          200

        ),


      base_name:
        safeText(

          profile.base_name ||

          json.name,

          250

        ),


      display_name:
        safeText(

          profile.display_name ||

          profile.base_name ||

          json.name,

          300

        ),


      short_name:
        safeText(
          profile.short_name,
          150
        ),


      branch:
        safeText(

          profile.branch ||

          "Air Force",

          100

        ),


      joint_base:
        profile.joint_base ===
          true,


      parent_installation:
        safeText(
          profile.parent_installation,
          250
        ),


      city:
        safeText(

          profile.city ||

          json.city,

          200

        ),


      state:
        safeText(

          profile.state ||

          json.state,

          120

        ),


      state_abbr:
        safeText(

          profile.state_abbr ||

          json.state_code,

          20

        ),


      zip:
        safeText(

          profile.zip ||

          json.zip,

          20

        ),


      metro:
        safeText(
          profile.metro,
          250
        ),


      installation_type:
        safeText(
          profile.installation_type,
          300
        ),


      host_or_major_command:
        safeText(
          profile.host_or_major_command,
          400
        )

    },


    mission: {

      primary_mission_summary:
        safeText(

          profile
            .primary_mission_summary ||

          profile
            .mission_summary ||

          profile
            .mission,

          2200

        ),


      base_bluf:
        safeText(
          profile.base_bluf,
          1800
        ),


      pcs_personality:
        safeText(
          profile.pcs_personality,
          1200
        )

    },


    operator:
      extractOperator(
        profile,
        json
      ),


    installation_population:
      extractInstallationPopulation(
        profile,
        json
      ),


    visitor_control_center:
      stripEmpty({

        name:
          safeText(
            visitor.name,
            250
          ),


        building:
          safeText(
            visitor.building,
            150
          ),


        address:
          safeText(

            visitor.address ||

            visitor.location,

            600

          ),


        phone:
          safeText(
            visitor.phone,
            150
          ),


        hours:
          safeText(

            visitor.hours ||

            visitor.operating_hours ||

            visitor.hours_of_operation,

            700

          ),


        best_for:
          safeArray(
            visitor.best_for,
            10
          )
            .map(
              value =>
                safeText(
                  value,
                  200
                )
            ),


        note:
          safeText(
            visitor.note,
            1000
          )

      }),


    gates,


    major_services:
      services,


    on_base_housing:

      isPlainObject(
        profile.on_base_housing
      )
        ? clone(
            profile.on_base_housing,
            {}
          )
        : {},


    recommended_neighborhoods:
      neighborhoods,


    commute_intelligence:

      isPlainObject(
        profile.commute_intelligence
      )
        ? clone(
            profile.commute_intelligence,
            {}
          )
        : {},


    bah_market_reality:

      isPlainObject(
        profile.bah_market_reality
      )
        ? clone(
            profile.bah_market_reality,
            {}
          )
        : {},


    family_readiness:

      isPlainObject(
        profile.family_readiness
      )
        ? clone(
            profile.family_readiness,
            {}
          )
        : {},


    arrival_checklist:

      Array.isArray(
        profile.arrival_checklist
      )
        ? profile
            .arrival_checklist
            .slice(
              0,
              30
            )

        : isPlainObject(
            profile.arrival_checklist
          )
          ? clone(
              profile.arrival_checklist,
              {}
            )
          : null,


    pcs_watchouts:

      Array.isArray(
        profile.pcs_watchouts
      )
        ? profile
            .pcs_watchouts
            .slice(
              0,
              30
            )

        : isPlainObject(
            profile.pcs_watchouts
          )
          ? clone(
              profile.pcs_watchouts,
              {}
            )
          : null,


    official_links:
      stripEmpty({

        base_home:
          safeText(
            officialLinks.base_home,
            1000
          ),


        visitor_info:
          safeText(

            officialLinks.visitor_info ||

            officialLinks
              .visitor_information ||

            officialLinks
              .visitor_center,

            1000

          ),


        housing:
          safeText(
            officialLinks.housing,
            1000
          ),


        medical:
          safeText(
            officialLinks.medical,
            1000
          ),


        commissary:
          safeText(
            officialLinks.commissary,
            1000
          ),


        exchange:
          safeText(
            officialLinks.exchange,
            1000
          )

      })

  });

}


function hasBaseSnapshot(
  snapshot
) {

  return Boolean(

    isPlainObject(
      snapshot
    ) &&

    isPlainObject(
      snapshot.identity
    ) &&

    clean(

      snapshot
        .identity
        .display_name ||

      snapshot
        .identity
        .base_name

    )

  );

}


/* ============================================================
   12. INTENT DETECTION
============================================================ */

function detectIntent(
  message
) {

  const text =
    lower(
      message
    );


  if (
    !text
  ) {

    return INTENTS
      .GENERAL_BASE;

  }


  /* ----------------------------------------------------------
     GREETING
  ---------------------------------------------------------- */

  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(
      text
    )
  ) {

    return INTENTS
      .GREETING;

  }


  /* ----------------------------------------------------------
     CAPABILITIES
  ---------------------------------------------------------- */

  if (
    /\bwhat can you do\b|\bhow can you help\b|\bwhat do you do\b|\bwho are you\b/.test(
      text
    )
  ) {

    return INTENTS
      .CAPABILITIES;

  }


  /* ----------------------------------------------------------
     MISSION
  ---------------------------------------------------------- */

  if (
    /\bmission\b|\bwhat does.*base do\b|\bwhat is.*known for\b|\bmajor command\b|\bcommand\b|\btraining mission\b/.test(
      text
    )
  ) {

    return INTENTS
      .MISSION;

  }


  /* ----------------------------------------------------------
     OPERATOR
  ---------------------------------------------------------- */

  if (
    /\boperator\b|\bmain phone\b|\bbase phone\b|\bphone number\b|\btelephone\b|\bcall the base\b/.test(
      text
    )
  ) {

    return INTENTS
      .OPERATOR;

  }


  /* ----------------------------------------------------------
     GATES
  ---------------------------------------------------------- */

  if (
    /\bgate\b|\bgates\b|\bgate hours\b|\bopen 24\/?7\b|\bentrance\b|\baccess gate\b/.test(
      text
    )
  ) {

    return INTENTS
      .GATES;

  }


  /* ----------------------------------------------------------
     POPULATION
  ---------------------------------------------------------- */

  if (
    /\bpopulation\b|\bhow many people\b|\bhow many.*stationed\b|\bactive duty population\b|\bbase size\b/.test(
      text
    )
  ) {

    return INTENTS
      .POPULATION;

  }


  /* ----------------------------------------------------------
     VISITOR CENTER
  ---------------------------------------------------------- */

  if (
    /\bvisitor\b|\bvisitor center\b|\bvisitor control\b|\bvcc\b|\bpass and id\b|\bvisitor pass\b/.test(
      text
    )
  ) {

    return INTENTS
      .VISITOR;

  }


  /* ----------------------------------------------------------
     HOUSING
  ---------------------------------------------------------- */

  if (
    /\bon[- ]base housing\b|\bbase housing\b|\bfamily housing\b|\bhousing office\b|\blive on base\b/.test(
      text
    )
  ) {

    return INTENTS
      .HOUSING;

  }


  /* ----------------------------------------------------------
     SERVICES
  ---------------------------------------------------------- */

  if (
    /\bmedical\b|\bclinic\b|\bcommissary\b|\bexchange\b|\bbx\b|\bservices\b|\bpharmacy\b/.test(
      text
    )
  ) {

    return INTENTS
      .SERVICES;

  }


  /* ----------------------------------------------------------
     NEIGHBORHOODS
  ---------------------------------------------------------- */

  if (
    /\bneighborhood\b|\bneighborhoods\b|\bwhere should i live\b|\bwhere to live\b|\barea to live\b|\bnearby areas\b/.test(
      text
    )
  ) {

    return INTENTS
      .NEIGHBORHOODS;

  }


  /* ----------------------------------------------------------
     COMMUTE
  ---------------------------------------------------------- */

  if (
    /\bcommute\b|\btraffic\b|\bdrive time\b|\bhow far\b|\breport time\b|\broute\b/.test(
      text
    )
  ) {

    return INTENTS
      .COMMUTE;

  }


  /* ----------------------------------------------------------
     ARRIVAL
  ---------------------------------------------------------- */

  if (
    /\barrival\b|\barrive\b|\bnewcomer\b|\bpcs in\b|\bchecking in\b|\bcheck in\b|\bfirst day\b/.test(
      text
    )
  ) {

    return INTENTS
      .ARRIVAL;

  }


  /* ----------------------------------------------------------
     LINKS
  ---------------------------------------------------------- */

  if (
    /\bofficial link\b|\bofficial website\b|\bwebsite\b|\bofficial page\b/.test(
      text
    )
  ) {

    return INTENTS
      .LINKS;

  }


  /* ----------------------------------------------------------
     OVERVIEW
  ---------------------------------------------------------- */

  if (
    /\boverview\b|\btell me about\b|\bwhat should i know\b|\bbase info\b|\bbase information\b/.test(
      text
    )
  ) {

    return INTENTS
      .OVERVIEW;

  }


  /* ----------------------------------------------------------
     OTHER THEWING TOOLS
  ---------------------------------------------------------- */

  if (
    /\bva disability\b|\bdisability rating\b|\bretirement pay\b|\bhigh[- ]?3\b|\bhigh[- ]?36\b|\bwaps\b|\bpromotion test\b|\bpt test\b|\bpfra\b|\bmortgage calculator\b/.test(
      text
    )
  ) {

    return INTENTS
      .OUT_OF_SCOPE;

  }


  return INTENTS
    .GENERAL_BASE;

}


/* ============================================================
   13. DETERMINISTIC FALLBACKS
============================================================ */

function baseName(
  snapshot
) {

  return clean(

    snapshot
      ?.identity
      ?.display_name ||

    snapshot
      ?.identity
      ?.base_name ||

    "the selected base"

  );

}


function buildGreetingReply(
  snapshot
) {

  if (
    hasBaseSnapshot(
      snapshot
    )
  ) {

    return (

      `Hey — I’m Amy, your Base Map Concierge for ${baseName(snapshot)}. ` +

      "Ask me about the mission, operator number, gates, visitor access, installation population, major services, housing, nearby neighborhoods, commute considerations, or PCS arrival guidance."

    );

  }


  return (

    "Hey — I’m Amy, your Base Map Concierge. " +

    "Choose a base on the interactive map first, then I can answer questions using that installation’s PCSUnited base data."

  );

}


function buildCapabilitiesReply(
  snapshot
) {

  const selected =

    hasBaseSnapshot(
      snapshot
    )
      ? `For ${baseName(snapshot)}, `
      : "After you select a base, ";


  return (

    selected +

    "I can explain the installation mission, operator contact, gate information, visitor center, population when available, major services, on-base housing, nearby neighborhoods, commute guidance, official links, and PCS arrival notes contained in the base file."

  );

}


function buildNoBaseReply() {

  return (

    "Choose a base on the interactive map first. " +

    "Once a base is selected, I’ll use that installation’s server-side JSON file as the source of truth for your questions."

  );

}


function buildOutOfScopeReply(
  snapshot
) {

  return (

    `I’m the Base Map concierge${

      hasBaseSnapshot(
        snapshot
      )
        ? ` for ${baseName(snapshot)}`
        : ""

    }, so I’m keeping this session focused on installation and PCS-orientation questions. ` +

    "Use the appropriate TheWing.ai calculator or tool for disability, retirement, PT, WAPS, or another specialized calculation."

  );

}


function buildMissionFallback(
  snapshot
) {

  const mission =
    clean(

      snapshot
        ?.mission
        ?.primary_mission_summary

    );


  if (
    !mission
  ) {

    return (

      `The current ${baseName(snapshot)} file does not contain a verified mission summary yet. ` +

      "I won’t invent one; use the official installation link or update the base JSON when you have a trusted source."

    );

  }


  return mission;

}


function buildOperatorFallback(
  snapshot
) {

  const operator =
    snapshot
      ?.operator ||
    {};


  const phone =
    clean(
      operator.phone
    );


  if (
    !phone
  ) {

    return (

      `The current ${baseName(snapshot)} file does not contain a verified base operator phone number yet. ` +

      "I won’t substitute the Visitor Control Center or another service number unless the file explicitly identifies it as the operator."

    );

  }


  return (

    `${

      clean(
        operator.label
      ) ||
      "Base Operator"

    }: ${phone}.`

  );

}


function buildPopulationFallback(
  snapshot
) {

  const population =
    snapshot
      ?.installation_population;


  if (
    !isPlainObject(
      population
    )
  ) {

    return (

      `The current ${baseName(snapshot)} file does not contain a verified installation population figure yet. ` +

      "I’m not using the surrounding city population as a substitute."

    );

  }


  const pieces =
    [];


  if (
    clean(
      population.total
    )
  ) {

    pieces.push(

      `The file lists a total installation population of ${population.total}.`

    );

  }


  const labels =
    [

      [
        "active_duty",
        "Active duty"
      ],

      [
        "military",
        "Military"
      ],

      [
        "civilian",
        "Civilian"
      ],

      [
        "dependents",
        "Dependents"
      ],

      [
        "family_members",
        "Family members"
      ],

      [
        "reserve_guard",
        "Reserve/Guard"
      ],

      [
        "retirees",
        "Retirees"
      ]

    ];


  for (
    const [
      key,
      label
    ]
    of labels
  ) {

    if (
      clean(
        population[
          key
        ]
      )
    ) {

      pieces.push(

        `${label}: ${population[key]}.`

      );

    }

  }


  if (
    clean(
      population.note
    )
  ) {

    pieces.push(
      population.note
    );

  }


  return pieces.length

    ? pieces.join(
        " "
      )

    : (

        `The current ${baseName(snapshot)} file does not contain a verified installation population figure yet. ` +

        "I’m not using the surrounding city population as a substitute."

      );

}


function buildGateFallback(
  snapshot
) {

  const gates =
    safeArray(
      snapshot?.gates,
      20
    );


  if (
    !gates.length
  ) {

    return (

      `The current ${baseName(snapshot)} file does not contain gate information yet. ` +

      "Check the official installation source before travel."

    );

  }


  const summary =
    gates

      .slice(
        0,
        5
      )

      .map(
        gate => {

          const name =
            clean(
              gate.name
            ) ||
            "Gate";


          const hours =
            clean(
              gate.hours
            ) ||
            "hours not listed";


          const status =
            clean(
              gate.status
            );


          return (

            `${name}: ${hours}${

              status
                ? ` (${status.replaceAll("_", " ")})`
                : ""

            }`

          );

        }
      )

      .join(
        "; "
      );


  return (

    `${baseName(snapshot)} gate information: ${summary}. ` +

    "Gate schedules and access procedures can change, so verify time-sensitive details with the installation before travel."

  );

}


function buildVisitorFallback(
  snapshot
) {

  const visitor =
    snapshot
      ?.visitor_control_center ||
    {};


  const details =
    [

      clean(
        visitor.name
      ),

      clean(
        visitor.address
      ),

      clean(
        visitor.phone
      ),

      clean(
        visitor.hours
      )

    ]
      .filter(
        Boolean
      );


  if (
    !details.length
  ) {

    return (

      `The current ${baseName(snapshot)} file does not contain Visitor Control Center details yet. ` +

      "Use the official installation visitor source before arrival."

    );

  }


  return details.join(
    " • "
  );

}


function buildServicesFallback(
  snapshot
) {

  const services =
    safeArray(
      snapshot?.major_services,
      20
    );


  if (
    !services.length
  ) {

    return (

      `The current ${baseName(snapshot)} file does not list major installation services yet.`

    );

  }


  return (

    "The base file currently lists: " +

    services

      .slice(
        0,
        8
      )

      .map(
        service =>
          clean(
            service.name
          )
      )

      .filter(
        Boolean
      )

      .join(
        ", "
      ) +

    "."

  );

}


function buildOverviewFallback(
  snapshot
) {

  const identity =
    snapshot
      ?.identity ||
    {};


  const mission =
    clean(

      snapshot
        ?.mission
        ?.primary_mission_summary

    );


  const pieces =
    [];


  const location =
    [

      clean(
        identity.city
      ),

      clean(

        identity.state_abbr ||

        identity.state

      )

    ]

      .filter(
        Boolean
      )

      .join(
        ", "
      );


  if (
    location
  ) {

    pieces.push(

      `${baseName(snapshot)} is located in ${location}.`

    );

  }


  if (
    clean(
      identity.installation_type
    )
  ) {

    pieces.push(

      `Installation type: ${identity.installation_type}.`

    );

  }


  if (
    clean(
      identity.host_or_major_command
    )
  ) {

    pieces.push(

      `Host/major command: ${identity.host_or_major_command}.`

    );

  }


  if (
    mission
  ) {

    pieces.push(
      mission
    );

  }


  return pieces.length

    ? pieces.join(
        " "
      )

    : (

        `I have the ${baseName(snapshot)} file loaded, but the basic overview fields are limited.`

      );

}


function buildGenericFallback(
  intent,
  snapshot
) {

  switch (
    intent
  ) {

    case INTENTS
      .GREETING:

      return buildGreetingReply(
        snapshot
      );


    case INTENTS
      .CAPABILITIES:

      return buildCapabilitiesReply(
        snapshot
      );


    case INTENTS
      .NO_BASE_SELECTED:

      return buildNoBaseReply();


    case INTENTS
      .OUT_OF_SCOPE:

      return buildOutOfScopeReply(
        snapshot
      );


    case INTENTS
      .MISSION:

      return buildMissionFallback(
        snapshot
      );


    case INTENTS
      .OPERATOR:

      return buildOperatorFallback(
        snapshot
      );


    case INTENTS
      .POPULATION:

      return buildPopulationFallback(
        snapshot
      );


    case INTENTS
      .GATES:

      return buildGateFallback(
        snapshot
      );


    case INTENTS
      .VISITOR:

      return buildVisitorFallback(
        snapshot
      );


    case INTENTS
      .SERVICES:

      return buildServicesFallback(
        snapshot
      );


    case INTENTS
      .OVERVIEW:

      return buildOverviewFallback(
        snapshot
      );


    default:

      return (

        `I have ${baseName(snapshot)} loaded. ` +

        "Ask me about its mission, operator number, gate information, Visitor Control Center, installation population, major services, housing, nearby neighborhoods, commute considerations, official links, or PCS arrival guidance."

      );

  }

}


/* ============================================================
   14. DIRECT DETERMINISTIC TURNS
============================================================ */

function buildDirectReply(
  intent,
  snapshot
) {

  switch (
    intent
  ) {

    case INTENTS
      .GREETING:

      return buildGreetingReply(
        snapshot
      );


    case INTENTS
      .CAPABILITIES:

      return buildCapabilitiesReply(
        snapshot
      );


    case INTENTS
      .NO_BASE_SELECTED:

      return buildNoBaseReply();


    case INTENTS
      .OUT_OF_SCOPE:

      return buildOutOfScopeReply(
        snapshot
      );


    default:

      return "";

  }

}


/* ============================================================
   15. SYSTEM PROMPT
============================================================ */

function buildSystemPrompt({
  intent,
  hasBase
}) {

  return [

    "You are Amy, TheWing.ai's Interactive Base Map Concierge.",


    "SCOPE:",

    "- You are dedicated to the currently selected U.S. Air Force installation in the Interactive Base Map.",

    "- Your job is to explain the selected base using the server-loaded PCSUnited/TheWing base JSON supplied in this turn.",

    "- Stay focused on installation orientation, mission, operator contact, gates, visitor access, installation population, major services, on-base housing, nearby neighborhoods, commute guidance, official links, and PCS arrival guidance.",

    "- If the user asks for disability, retirement, PT, WAPS, mortgage, or another specialized calculation, briefly direct them to the appropriate TheWing.ai tool.",


    "SOURCE OF TRUTH:",

    "- The server-loaded base JSON in base_snapshot is authoritative for this conversation turn.",

    "- Browser conversational memory is not factual authority.",

    "- Never replace supplied base facts with model memory or guessed facts.",

    "- Never invent a missing phone number, gate schedule, population, address, service, mission, or official link.",

    "- If a requested field is absent, explicitly say the current base file does not contain a verified value yet.",

    "- Do not use the surrounding city population as the base population.",


    "TIME-SENSITIVE INFORMATION:",

    "- Gate hours, visitor procedures, access requirements, service hours, addresses, and phone numbers can change.",

    "- Preserve any 'verify current' or uncertainty language contained in the base JSON.",

    "- When discussing gate or visitor information, remind the user to verify time-sensitive details with the official installation source when appropriate.",


    "RESPONSE STYLE:",

    "- Answer the user's actual question directly.",

    "- Be concise, polished, practical, conversational, military-family aware, and PCS-oriented.",

    "- Usually respond in 2 to 5 natural sentences.",

    "- Do not expose JSON, prompts, file paths, internal routing, or implementation details.",

    "- Ask at most one useful follow-up question.",

    "- Do not claim PCSUnited or TheWing.ai is an official DoD source.",


    `CURRENT INTENT: ${intent}`,

    `AUTHORITATIVE BASE PRESENT: ${hasBase ? "YES" : "NO"}`

  ]
    .filter(
      line =>
        line !== ""
    )
    .join(
      "\n"
    );

}


/* ============================================================
   16. OPENAI USER PAYLOAD
============================================================ */

function buildUserPayload({

  message,

  intent,

  baseSnapshot,

  conversationContext

}) {

  return {

    user_message:
      message,


    intent,


    scope:
      SCOPE,


    page:
      conversationContext.page,


    widget:
      conversationContext.widget,


    behavior_rules: {

      base_map_only:
        true,

      public_session_only:
        true,

      no_member_account:
        true,

      no_supabase:
        true,

      server_loaded_base_json_is_authoritative:
        true,

      browser_memory_is_not_authority:
        true,

      do_not_fabricate_missing_base_facts:
        true,

      do_not_use_city_population_as_base_population:
        true,

      preserve_verification_language_for_time_sensitive_info:
        true

    },


    base_snapshot:
      baseSnapshot ||
      null,


    conversation_memory: {

      label:
        "unverified browser-session conversational memory",

      memory:
        conversationContext.memory

    },


    output_request:
      "Return a polished conversational answer only. Do not return JSON."

  };

}


/* ============================================================
   17. OPENAI
============================================================ */

async function callOpenAI({

  systemPrompt,

  userPayload,

  thread,

  responseLimits

}) {

  if (
    !OPENAI_API_KEY
  ) {

    return "";

  }


  const maxChars =
    Number(

      responseLimits
        ?.max_chars

    ) ||
    DEFAULT_MAX_REPLY_CHARS;


  const maxTokens =
    Math.max(

      180,

      Math.min(

        900,

        Math.ceil(
          maxChars /
          3
        ) +
        90

      )

    );


  const controller =
    new AbortController();


  const timeout =
    setTimeout(

      () =>
        controller.abort(),

      OPENAI_TIMEOUT_MS

    );


  try {

    const response =
      await fetch(

        "https://api.openai.com/v1/chat/completions",

        {

          method:
            "POST",


          headers: {

            Authorization:
              `Bearer ${OPENAI_API_KEY}`,

            "Content-Type":
              "application/json"

          },


          body:
            JSON.stringify({

              model:
                DEFAULT_MODEL,

              temperature:
                0.2,

              max_tokens:
                maxTokens,

              messages: [

                {

                  role:
                    "system",

                  content:
                    systemPrompt

                },

                ...thread,

                {

                  role:
                    "user",

                  content:
                    JSON.stringify(
                      userPayload
                    )

                }

              ]

            }),


          signal:
            controller.signal

        }

      );


    const raw =
      await response.text();


    const data =
      safeJsonParse(
        raw,
        {}
      ) ||
      {};


    if (
      !response.ok
    ) {

      console.warn(

        "[ask-amy-base-map] OpenAI request failed:",

        response.status

      );


      return "";

    }


    return clean(

      data
        ?.choices
        ?.[0]
        ?.message
        ?.content

    );


  } catch (
    error
  ) {


    if (
      error
        ?.name ===
        "AbortError"
    ) {

      console.warn(

        "[ask-amy-base-map] OpenAI request timed out."

      );


    } else {

      console.warn(

        "[ask-amy-base-map] OpenAI request failed:",

        error
          ?.message ||
        error

      );

    }


    return "";


  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ============================================================
   18. REPLY LIMITS
============================================================ */

function enforceQuestionLimit(
  text,
  maxQuestions
) {

  let output =
    clean(
      text
    );


  if (
    !output
  ) {

    return "";

  }


  const limit =
    Math.max(

      0,

      Math.min(

        2,

        Number(
          maxQuestions
        ) ||
        0

      )

    );


  if (
    limit >=
      2
  ) {

    return output;

  }


  let count =
    0;


  let result =
    "";


  for (
    const char
    of output
  ) {

    if (
      char ===
        "?"
    ) {

      count +=
        1;


      if (
        count >
          limit
      ) {

        result +=
          ".";

        continue;

      }

    }


    result +=
      char;

  }


  return clean(
    result
  );

}


function truncateReply(
  text,
  maxChars
) {

  const value =
    clean(
      text
    );


  if (
    !value ||
    value.length <=
      maxChars
  ) {

    return value;

  }


  const slice =
    value.slice(
      0,
      maxChars
    );


  const candidates =
    [

      slice.lastIndexOf(
        ". "
      ),

      slice.lastIndexOf(
        "! "
      ),

      slice.lastIndexOf(
        "? "
      ),

      slice.lastIndexOf(
        "; "
      )

    ];


  const cutAt =
    Math.max(
      ...candidates
    );


  let cut =

    cutAt >
      Math.floor(
        maxChars *
        0.55
      )

      ? slice.slice(
          0,
          cutAt + 1
        )

      : slice;


  cut =
    clean(
      cut
    );


  return (

    cut +

    (
      cut.length <
      value.length

        ? "..."

        : ""
    )

  );

}


function enforceReplyLimits(

  text,

  intent,

  responseLimits

) {

  const limits =
    responseLimits ||
    {};


  const maxChars =

    intent ===
      INTENTS.GREETING

      ? Number(
          limits.greeting_max_chars
        ) ||
        DEFAULT_GREETING_MAX_CHARS

      : Number(
          limits.max_chars
        ) ||
        DEFAULT_MAX_REPLY_CHARS;


  const questionLimited =
    enforceQuestionLimit(

      text,

      limits
        .max_follow_up_questions

    );


  return truncateReply(

    questionLimited,

    maxChars

  );

}


/* ============================================================
   19. SIMPLE BASE-MAP MEMORY
============================================================ */

function buildMemoryPatch({

  intent,

  baseSnapshot

}) {

  const patch = {

    last_base_map_intent:
      intent,

    last_updated_at:
      new Date()
        .toISOString()

  };


  if (
    hasBaseSnapshot(
      baseSnapshot
    )
  ) {

    patch.last_base_file =
      clean(

        baseSnapshot
          ?.source
          ?.file

      ).slice(
        0,
        120
      );


    patch.last_base_name =
      baseName(
        baseSnapshot
      ).slice(
        0,
        200
      );

  }


  return patch;

}


/* ============================================================
   20. MAIN HANDLER
============================================================ */

export async function handler(
  event
) {

  const startedAt =
    Date.now();


  /* ----------------------------------------------------------
     PREFLIGHT
  ---------------------------------------------------------- */

  if (

    String(

      event
        ?.httpMethod ||

      ""

    ).toUpperCase() ===
      "OPTIONS"

  ) {

    return {

      statusCode:
        204,

      headers:
        corsHeaders(
          event
        ),

      body:
        ""

    };

  }


  /* ----------------------------------------------------------
     POST ONLY
  ---------------------------------------------------------- */

  if (

    String(

      event
        ?.httpMethod ||

      "POST"

    ).toUpperCase() !==
      "POST"

  ) {

    return respondError(

      event,

      405,

      "Method not allowed.",

      "METHOD_NOT_ALLOWED"

    );

  }


  let conversationId =
    null;


  try {

    /* ========================================================
       PARSE REQUEST
    ======================================================== */

    const body =
      parseRequestBody(
        event
      );


    const message =
      clean(

        body.message ||

        body.question ||

        body.prompt ||

        body.text

      ).slice(
        0,
        MAX_MESSAGE_LENGTH
      );


    if (
      !message
    ) {

      return respondError(

        event,

        400,

        "Missing message.",

        "MISSING_MESSAGE"

      );

    }


    const conversationContext =
      parseConversationContext(

        body,

        message

      );


    conversationId =
      conversationContext
        .conversation_id;


    /* ========================================================
       RESOLVE SELECTED BASE

       Frontend should send:

       base_file: "Randolph.json"

       or:

       base: {
         fileName: "Randolph.json"
       }
    ======================================================== */

    const requestedFile =
      getRequestedBaseFile(
        body
      );


    let baseSnapshot =
      null;


    let normalizedFile =
      "";


    if (
      requestedFile
    ) {

      normalizedFile =
        normalizeBaseFile(
          requestedFile
        );


      if (
        !normalizedFile
      ) {

        return respondError(

          event,

          400,

          "Invalid base file selection.",

          "INVALID_BASE_FILE",

          conversationId

        );

      }


      try {

        const loaded =
          await loadBaseJson(
            normalizedFile
          );


        baseSnapshot =
          sanitizeBaseSnapshot(

            loaded.json,

            loaded.fileName

          );


      } catch (
        error
      ) {


        if (
          error
            ?.code ===
            "BASE_FILE_NOT_FOUND"
        ) {

          return respondError(

            event,

            404,

            `Base data could not be found for ${normalizedFile}.`,

            "BASE_FILE_NOT_FOUND",

            conversationId

          );

        }


        if (

          error
            ?.code ===
            "INVALID_BASE_JSON" ||

          error
            ?.code ===
            "BASE_JSON_TOO_LARGE"

        ) {

          return respondError(

            event,

            500,

            "The selected base data file could not be loaded safely.",

            error.code,

            conversationId

          );

        }


        throw error;

      }

    }


    const hasBase =
      hasBaseSnapshot(
        baseSnapshot
      );


    /* ========================================================
       INTENT
    ======================================================== */

    let intent =
      detectIntent(
        message
      );


    if (
      !hasBase
    ) {

      intent =
        INTENTS
          .NO_BASE_SELECTED;

    }


    /* ========================================================
       DIRECT DETERMINISTIC TURNS

       No OpenAI call needed for:
       - greeting
       - capabilities
       - no base selected
       - clearly out of scope
    ======================================================== */

    const directReply =
      buildDirectReply(

        intent,

        baseSnapshot

      );


    let replyRaw =
      directReply;


    let openaiUsed =
      false;


    /* ========================================================
       NORMAL BASE-MAP EXPLANATION
    ======================================================== */

    if (

      !replyRaw &&

      hasBase

    ) {

      const systemPrompt =
        buildSystemPrompt({

          intent,

          hasBase

        });


      const userPayload =
        buildUserPayload({

          message,

          intent,

          baseSnapshot,

          conversationContext

        });


      replyRaw =
        await callOpenAI({

          systemPrompt,

          userPayload,

          thread:
            conversationContext
              .thread,

          responseLimits:
            conversationContext
              .response_limits

        });


      openaiUsed =
        Boolean(
          replyRaw
        );

    }


    /* ========================================================
       FAIL OPEN
    ======================================================== */

    if (
      !replyRaw
    ) {

      replyRaw =
        buildGenericFallback(

          intent,

          baseSnapshot

        );

    }


    const reply =
      enforceReplyLimits(

        replyRaw,

        intent,

        conversationContext
          .response_limits

      );


    const memoryPatch =
      buildMemoryPatch({

        intent,

        baseSnapshot

      });


    /* ========================================================
       WARNINGS
    ======================================================== */

    const warnings =
      [

        "PUBLIC_SESSION_ONLY",

        "PCSU_BASE_DATA_NOT_OFFICIAL_DOD_SOURCE",

        "VERIFY_TIME_SENSITIVE_GATE_AND_ACCESS_INFORMATION",


        ...(

          !hasBase

            ? [
                "NO_BASE_SELECTED"
              ]

            : []

        ),


        ...(

          hasBase &&

          !clean(

            baseSnapshot
              ?.operator
              ?.phone

          )

            ? [
                "BASE_OPERATOR_PHONE_NOT_AVAILABLE"
              ]

            : []

        ),


        ...(

          hasBase &&

          !isPlainObject(

            baseSnapshot
              ?.installation_population

          )

            ? [
                "INSTALLATION_POPULATION_NOT_AVAILABLE"
              ]

            : []

        ),


        ...(

          !OPENAI_API_KEY

            ? [

                "OPENAI_UNAVAILABLE_USING_DETERMINISTIC_FALLBACK"

              ]

            : []

        )

      ];


    /* ========================================================
       RESPONSE
    ======================================================== */

    return respond(

      event,

      200,

      {

        ok:
          true,


        agent:
          "Amy",


        display_name:
          DISPLAY_NAME,


        brand:
          "TheWing.ai",


        scope:
          SCOPE,


        endpoint:
          "ask-amy-base-map",


        version:
          VERSION,


        response_contract:
          RESPONSE_CONTRACT_VERSION,


        intent,


        reply,


        conversation_id:
          conversationContext
            .conversation_id,


        memory_patch:
          memoryPatch,


        selected_base:

          hasBase

            ? {

                file:
                  clean(

                    baseSnapshot
                      ?.source
                      ?.file

                  ),


                id:
                  clean(

                    baseSnapshot
                      ?.identity
                      ?.base_id

                  ),


                name:
                  baseName(
                    baseSnapshot
                  ),


                city:
                  clean(

                    baseSnapshot
                      ?.identity
                      ?.city

                  ),


                state:
                  clean(

                    baseSnapshot
                      ?.identity
                      ?.state_abbr ||

                    baseSnapshot
                      ?.identity
                      ?.state

                  )

              }

            : null,


        context_used: {

          base_json:
            hasBase,


          authority:

            hasBase

              ? "server_loaded_base_json"

              : "none",


          openai:
            openaiUsed

        },


        ui: {

          speed:
            18,

          startDelay:
            80

        },


        warnings,


        latency_ms:

          Date.now() -
          startedAt

      }

    );


  } catch (
    error
  ) {


    console.error(

      "[ask-amy-base-map] server error:",

      error
        ?.message ||
      error

    );


    return respondError(

      event,

      500,

      "Ask Amy Base Map could not complete the request.",

      "INTERNAL_ERROR",

      conversationId

    );

  }

}


/* ============================================================
   21. OPTIONAL DEFAULT EXPORT
============================================================ */

export default Object.freeze({

  version:
    VERSION,

  scope:
    SCOPE,

  handler

});
