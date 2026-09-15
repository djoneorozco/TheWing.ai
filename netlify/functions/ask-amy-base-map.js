/* ============================================================
  THEWING.AI • ASK AMY BASE MAP
  Netlify Function Wrapper
  v1.0.0

  PURPOSE
  -------------------------------------------------------------
  Exposes the dedicated Base Map Amy server through Netlify:

  /.netlify/functions/ask-amy-base-map

  SERVER
  -------------------------------------------------------------
  Base-Map/ask-amy-base-map-server.js

  ARCHITECTURE
  -------------------------------------------------------------
  Interactive Base Map
        ↓
  Ask Amy Command Center
        ↓
  /.netlify/functions/ask-amy-base-map
        ↓
  THIS WRAPPER
        ↓
  Base-Map/ask-amy-base-map-server.js
        ↓
  netlify/functions/cities/<base>.json
        ↓
  Amy
============================================================ */

export {
  handler
} from "../../Base-Map/ask-amy-base-map-server.js";
