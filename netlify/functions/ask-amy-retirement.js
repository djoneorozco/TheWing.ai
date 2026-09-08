/* ============================================================
  THEWING.AI • ASK AMY RETIREMENT
  netlify/functions/ask-amy-retirement.js
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Tiny Netlify function entry point for the dedicated
  Retirement Calculator Ask Amy service.

  All retirement-specific Amy logic lives in:

  Retirement-Calculator/ask-amy-retirement-server.js

  FLOW
  -------------------------------------------------------------
  Retirement Calculator
        ↓
  ask-amy-retirement.js (browser)
        ↓
  /.netlify/functions/ask-amy-retirement
        ↓
  THIS FILE
        ↓
  Retirement-Calculator/ask-amy-retirement-server.js

  CORE PRINCIPLE
  -------------------------------------------------------------
  TheWing calculates. Amy explains.
============================================================ */

export {
  handler
} from "../../Retirement-Calculator/ask-amy-retirement-server.js";
