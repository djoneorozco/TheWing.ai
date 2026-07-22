# Ask Amy v1.5 Implementation Report

**Endpoint:** `netlify/functions/agent-amy.js`  
**Version:** `1.5.0-agent-registry`  
**Response contract:** `ask-amy-response-v1`  
**Date:** 2026-07-22

## Summary

Upgraded `agent-amy.js` for the PCSUnited Resources Ask Amy HUD while preserving registry-first deterministic orchestration and backward-compatible response fields.

TheWing still calculates and evaluates. Amy explains, guides, and helps the member act. OpenAI is used only for explanation when needed.

## Files changed

| File | Change |
|---|---|
| `netlify/functions/agent-amy.js` | v1.5 handler, security, HUD contract, registry affordability/decision wiring, mortgage normalization, OpenAI privacy/thread support |
| `netlify/functions/_share/ask-amy-hud-contract.js` | **New** pure HUD contract helpers (thread/memory/limits/packets/CORS helpers) |
| `netlify/functions/_share/agent-registry.js` | Small compatibility fixes: decision-rules export names, affordability safe export preference, mortgage nested-field normalization |
| `netlify/functions/agent-amy.v1.5.test.js` | **New** contract/security/regression tests |
| `netlify.toml` | Include `_share/**`; remove wildcard API/function CORS headers |
| `docs/ASK-AMY-V1.5-IMPLEMENTATION.md` | This report |

`ask-amy.js` was **not** modified.

## Security changes

- Supabase member enrichment runs only after server-side identity verification via Supabase access token (`Authorization: Bearer`) using existing Supabase auth (`auth.getUser`).
- Browser-provided email (`body.email`, profile/identity emails, localStorage-derived session data) does **not** authorize Supabase lookup.
- Public `debug:true` ignored unless `NODE_ENV=development` or `ASK_AMY_DEBUG_ENABLED=true`.
- Safe debug payloads exclude email, scenario dumps, tokens, and raw Supabase rows.
- Email is not sent to OpenAI.
- Public profile redaction excludes email/phone/full_name/db metadata.
- Strict CORS: no `"*"` fallback; unknown browser origins receive `403 INVALID_ORIGIN`; missing Origin allowed for server-to-server.

### Supabase enrichment status

**Conditionally available.**

- Implemented verification path: Supabase JWT via `Authorization: Bearer` + `supabase.auth.getUser`.
- If no valid token / anon-or-service auth key / verification failure: enrichment is skipped and warnings include `MEMBER_ENRICHMENT_SKIPPED` / `UNVERIFIED_BROWSER_PROFILE`.
- This does **not** invent a new auth system; it uses the repository’s existing Supabase auth pattern from login flows.

## HUD contract changes

Accepts and sanitizes:

- `context.conversation_id`
- `context.thread`
- `context.memory`
- `context.response_contract`
- `context.response_limits`
- `context.requested_mode`
- `context.styleGuide` (filtered preferences only)
- `context.page` / `widget` / `product` / `version`
- `context.compensation` / `context.mortgage`
- `context.session` (kept separate from profile)

Successful responses always include:

- `response_contract`
- `conversation_id`
- `memory_patch`
- `memory_echo`
- `ui.speed` / `ui.startDelay`
- `warnings`
- plus existing fields (`reply`, `answer`, `truth_packet`, `context_used`, etc.)

## Conversation support

- Thread sanitized to user/assistant only.
- Max 12 messages, 2000 chars each.
- Duplicate current user message removed before OpenAI call.
- OpenAI messages: system + historical thread + current user payload once.

## Memory behavior

- Browser memory treated as unverified convenience memory.
- Deterministic `memory_patch` built server-side (no OpenAI involvement).
- Never stores email/phone/full name/tokens/raw debts/Supabase rows.
- Returned as `memory_patch` + `memory_echo`.

## Structured calculation packet behavior

- Valid `context.compensation` / `context.mortgage` used before recalculation.
- Invalid packets produce `CLIENT_PACKET_INVALID` and fall back to engines.
- Hypothetical credit-score questions can force mortgage recalculation.
- Provenance markers added on packets.
- Context flags: `client_compensation`, `client_mortgage`, `calculated_compensation`, `calculated_mortgage`.

## Registry engine behavior

- Affordability: registry `safeCalculateAffordability` / `calculateAffordability` first; inline fallback retained.
- Decision rules: registry `safeEvaluateDecision` / `evaluateDecision` first; fallback retained.
- Registry export list updated so `decision_rules` resolves correctly.
- Mortgage normalization now reads nested `monthly.*` / `breakdown.*` fields and omits unknown components instead of forcing zeros.

## CORS behavior

- Endpoint enforce allowlist; no wildcard.
- `netlify.toml` wildcard CORS headers for `/api/*` and `/.netlify/functions/*` removed so they cannot override endpoint policy.
- `_share/**` added to `included_files` for registry dynamic imports.

## Response schema

Public success shape includes v1.4 fields plus:

```json
{
  "response_contract": "ask-amy-response-v1",
  "conversation_id": "string|null",
  "memory_patch": {},
  "memory_echo": {},
  "ui": { "speed": 18, "startDelay": 80 },
  "warnings": []
}
```

Errors use a stable envelope with `code`, `response_contract`, empty `memory_patch`, sanitized `memory_echo`, and `ui`.

## Backward compatibility

- Still accepts `message` / `question` / `prompt` / `text`.
- Still returns `reply`, `answer`, `profile_used`, `truth_packet`, `context_used`, `latency_ms`.
- New HUD fields are optional on input.
- Older clients receive valid v1.5 envelopes with empty memory objects and `conversation_id: null` when omitted.

## Tests added

`netlify/functions/agent-amy.v1.5.test.js` covers:

- greeting / v1.4 compatibility
- compensation deterministic path
- client mortgage/compensation packets
- invalid client packets
- thread + duplicate message handling
- memory sanitize/patch
- debug gating
- origin allow/deny/missing
- email does not trigger Supabase enrichment
- OpenAI profile has no email
- response contract fields always present
- reply max-chars enforcement
- registry affordability/decision resolution
- mortgage nested normalization

## Validation results

| Check | Result |
|---|---|
| `node --check netlify/functions/agent-amy.js` | Pass |
| `node --check netlify/functions/_share/ask-amy-hud-contract.js` | Pass |
| Import smoke (agent-amy, registry, affordability, decision-rules, mortgage) | Pass |
| `node netlify/functions/agent-amy.v1.5.test.js` | **26/26 passed** |
| `pcs-move-engine.samples.test.js` | Pre-existing failure unrelated to this change (`DLA should be pending`) |

## Known limitations

1. Supabase enrichment remains unavailable for anonymous HUD users until the frontend sends a real Supabase access token.
2. OpenAI free-text replies are length-limited and prompted for truthfulness, but there is still no post-hoc numeric contradiction scanner against the truth packet.
3. `ask-amy.js` remains untouched and may still use the older insecure enrichment pattern if called directly.
4. Style-guide filtering is allowlist/heuristic-based, not a full policy engine.
5. Existing PCS move sample test failure is outside this upgrade scope.

## Deployment checklist

1. Deploy TheWing functions with updated `netlify.toml`.
2. Confirm env vars: `OPENAI_API_KEY`, `OPENAI_MODEL` (optional), `SUPABASE_URL`, `SUPABASE_ANON_KEY` (for verified enrichment), service key only for verified lookups.
3. Do **not** set `ASK_AMY_DEBUG_ENABLED=true` in production unless operator debugging is intentionally required.
4. Point Resources HUD to `POST /api/agent-amy`.
5. Verify from browser:
   - allowed PCSUnited origin succeeds
   - unknown origin fails
   - response includes `memory_patch`, `memory_echo`, `ui`, `response_contract`
   - anonymous session does not load another member’s Supabase data by email
6. Keep `ask-amy.js` available until HUD traffic and monitoring confirm stability.

## Deployment recommendation

**CONDITIONAL READY**

Ready for HUD integration and staging/production deploy with the security and contract upgrades in place, provided:

- frontend uses `/api/agent-amy`
- operators accept that anonymous users will not get Supabase enrichment until authenticated tokens are supplied
- `ask-amy.js` is not the HUD target
