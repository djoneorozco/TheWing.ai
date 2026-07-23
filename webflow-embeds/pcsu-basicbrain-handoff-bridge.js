/* ============================================================
  PCSUnited • BasicBrain → Public Ask Amy handoff bridge
  Optional companion for Resources pages.

  PURPOSE
  - Keep pcsunited.basicbrain.handoff.v1 as a ONE-TIME handoff.
  - Mirror current-page BasicBrain results into the Public Amy
    Resources session object:
      pcsunited.resources.public-session.v1

  REQUIRED BASICBRAIN CHANGES (in basicbrain-amy.js or equivalent)
  1. On page init (before any restore), call clearHandoff() so a
     leftover localStorage handoff from a previous visit cannot
     survive forever.
  2. Keep saveHandoff() writing the localStorage one-time packet.
  3. After saveHandoff(), also call:
       window.PCSUnitedBasicBrainHandoff?.mirrorToPublicSession(payload)
     or rely on existing pcsunited:* custom events (Ask Amy HUD
     already listens for those).

  The Public Ask Amy HUD already:
  - starts a fresh Resources session on every page load
  - deletes stale handoff without importing it
  - consumes same-session handoff once, then removes it
  - listens for BasicBrain / mortgage custom events

  This bridge is optional insurance if Amy mounts after a same-page
  BasicBrain calculation and you want the session object updated
  even when custom events were missed.
============================================================ */

(() => {
  "use strict";

  if (window.__PCSU_BASICBRAIN_HANDOFF_BRIDGE_V1) return;
  window.__PCSU_BASICBRAIN_HANDOFF_BRIDGE_V1 = true;

  const KEY_HANDOFF = "pcsunited.basicbrain.handoff.v1";
  const KEY_PUBLIC_SESSION =
    "pcsunited.resources.public-session.v1";

  function safeJSON(value, fallback) {
    try {
      if (value == null || value === "") return fallback;
      if (typeof value === "object") return value;
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function isPlainObject(value) {
    return Boolean(
      value && typeof value === "object" && !Array.isArray(value)
    );
  }

  function ssGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function ssSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function lsDel(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearStaleHandoffOnBoot() {
    // BasicBrain Resources pages should not keep forever-handoffs.
    // Public Amy also clears this on its own fresh-session boot.
    lsDel(KEY_HANDOFF);
  }

  function mirrorToPublicSession(payload) {
    if (!isPlainObject(payload)) return null;

    const existing = safeJSON(ssGet(KEY_PUBLIC_SESSION), null);
    if (!isPlainObject(existing) || !existing.id) {
      // Amy creates the canonical session on init. If Amy is not
      // present yet, leave a lightweight placeholder session.
      const placeholder = {
        id:
          "pcsu_resources_" +
          Date.now().toString(16) +
          "_" +
          Math.random().toString(16).slice(2),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: payload.profile || null,
        bridge: payload.bridge || null,
        compensation:
          payload.compensation || payload.calculated_comp || null,
        mortgage: null,
        financial_intake: null,
        user_financial_inputs: null,
        user_aiou_inputs: null,
        fad: null,
        kpi_overrides: null,
        basicbrain: payload.basicbrain || payload || null
      };

      ssSet(KEY_PUBLIC_SESSION, JSON.stringify(placeholder));
      return placeholder;
    }

    const next = {
      ...existing,
      updated_at: new Date().toISOString(),
      profile: payload.profile || existing.profile || null,
      bridge: payload.bridge || existing.bridge || null,
      compensation:
        payload.compensation ||
        payload.calculated_comp ||
        existing.compensation ||
        null,
      basicbrain:
        payload.basicbrain || payload || existing.basicbrain || null
    };

    ssSet(KEY_PUBLIC_SESSION, JSON.stringify(next));
    return next;
  }

  function consumeOneTimeHandoff() {
    const raw = lsGet(KEY_HANDOFF);
    if (!raw) return null;

    const handoff = safeJSON(raw, null);
    lsDel(KEY_HANDOFF);

    if (!isPlainObject(handoff)) return null;
    return mirrorToPublicSession(handoff);
  }

  window.PCSUnitedBasicBrainHandoff = {
    key: KEY_HANDOFF,
    publicSessionKey: KEY_PUBLIC_SESSION,
    clearStaleHandoffOnBoot,
    mirrorToPublicSession,
    consumeOneTimeHandoff
  };

  // Do not auto-clear on bridge load: BasicBrain may write a same-page
  // handoff before or after this file. Call clearStaleHandoffOnBoot()
  // from BasicBrain init, or rely on Public Amy's fresh-session boot.
})();
