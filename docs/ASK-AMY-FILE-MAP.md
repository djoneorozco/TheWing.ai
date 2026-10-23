# Ask Amy File Map

Concise owner reference for Ask Amy / Agent Amy inside TheWing.

**Related document:** `docs/ASK-AMY-OFFICIAL-ARCHITECTURE-REVIEW.md`

---

## Ownership model

```txt
agent-amy.js
Public Amy endpoint and orchestration

agent-registry.js
Tool selection and compatibility switchboard

profile-normalizer.js
Canonical member and scenario profile

compensation-context.js
Military compensation truth packet

mortgage-engine.js
Mortgage calculations

affordability-engine.js
Affordability calculations and scoring

decision-rules.js
Readiness verdicts and recommended actions

pcs-move-engine.js
PCS move calculations

va-loans.js
VA loan rules and guidance

official-*.js
Official military-data modules

response.js
Shared response formatting

ask-amy.js
Legacy endpoint pending verified migration
```

---

## HOW TO KNOW WHICH FILE TO EDIT

- Change Amy’s public API flow → `agent-amy.js`
- Add a new engine to Amy → `agent-registry.js`
- Change mortgage math → `mortgage-engine.js`
- Change readiness thresholds → `decision-rules.js`
- Change military compensation calculations → `compensation-context.js` or its official-data dependencies
- Change PCS move calculations → `pcs-move-engine.js`
- Change profile aliases and normalization → `profile-normalizer.js`
- Change general response formatting → `response.js`
- Do not add new product behavior to `ask-amy.js` unless maintaining legacy compatibility
- Change official rate tables → the matching `official-*.js` module (not Amy prompts)
- Change VA loan guidance logic → `_share/va-loans.js`
- Change Netlify route exposure → `netlify.toml` (review carefully; do not casually alter during Amy work)
- Change calculator UIs that Amy may later explain → the relevant PCSUnited tool frontend + its TheWing API, not Amy recalculation logic

---

## File reference

| File | Plain-English purpose | When to edit it | When not to edit it | Main dependencies | Status |
|---|---|---|---|---|---|
| `netlify/functions/agent-amy.js` | Candidate official Amy endpoint: request handling, context merge, intent, truth packet orchestration, OpenAI explanation, response assembly | Changing Amy’s public request/response flow, OpenAI prompt/routing, endpoint-level fallbacks, cutover behavior | Changing core math, official rates, or readiness thresholds that belong in engines | `agent-registry.js`, `compensation-context.js`, `mortgage-engine.js`, `va-loans.js`, Supabase, OpenAI | Experimental / Candidate |
| `netlify/functions/ask-amy.js` | Legacy direct-wired Ask Amy endpoint still present for compatibility | Only for critical production fixes while it remains the live caller | New product features, new engines, long-term architecture changes | `compensation-context.js`, `mortgage-engine.js`, `va-loans.js`, Supabase, OpenAI | Legacy |
| `netlify/functions/_share/agent-registry.js` | Central tool switchboard: registers engines, selects by intent, loads modules, normalizes tool packets | Adding/removing Amy tools, fixing tool export matching, intent→tool mapping, packet normalization | Rewriting Amy HTTP handling or OpenAI conversation flow | Dynamic imports of registered `_share` engines | Shared / Experimental |
| `netlify/functions/_share/profile-normalizer.js` | Canonical member/scenario profile normalization and alias handling | Adding aliases, tightening canonical fields, dependent/rank/base normalization | Mortgage math, VA rules, Amy prompts | none major | Shared |
| `netlify/functions/_share/compensation-context.js` | Builds military compensation packet (base pay, BAS, BAH, related totals) | Changing how compensation is assembled for Amy/dashboard intelligence | Editing raw official tables directly here | `official-pay.js`, `official-bah.js`, `official-va.js`, `pay-engine.js`, `official-retirement.js` | Shared / Active |
| `netlify/functions/_share/mortgage-engine.js` | Deterministic mortgage payment and related breakdowns | Changing mortgage assumptions, APR mapping, PITI math | Changing Amy wording or readiness verdicts | self / optional VA-aware inputs | Shared / Active |
| `netlify/functions/_share/affordability-engine.js` | Affordability scoring and housing-fit metrics | Changing affordability scoring/caps/ratios | Changing Amy chat tone or official pay tables | normalized income/mortgage/expense inputs | Shared |
| `netlify/functions/_share/decision-rules.js` | Converts calculator outputs into readiness verdicts, findings, actions, BLUF | Changing GO/NO-GO thresholds, action-plan rules | Changing OpenAI style or mortgage formulas | affordability/compensation/mortgage inputs | Shared |
| `netlify/functions/_share/va-loans.js` | VA loan guidance, funding-fee/scenario packets for Amy | Changing VA educational logic and packet shape | Changing official VA rate tables themselves | `official-va.js` | Shared / Active |
| `netlify/functions/_share/pcs-move-engine.js` | PCS move cash/entitlement estimates | Changing move estimate composition | Amy conversation flow before PCS intent is integrated | `official-malt.js`, `official-dla.js`, `official-hhg.js`, `official-pcs-per-diem.js`, `official-pcs-travel-days.js` | Shared / Active |
| `netlify/functions/_share/pay-engine.js` | Helper layer for pay composition used by compensation context | Pay composition helper changes | Amy endpoint orchestration | `official-pay.js` | Shared / Active |
| `netlify/functions/_share/official-pay.js` | Official basic pay / BAS source data | Updating official pay/BAS tables/version | Amy prompts or UI copy | none | Shared / Active |
| `netlify/functions/_share/official-bah.js` | Official BAH source data | Updating BAH tables/version | Amy prompts or UI copy | none | Shared / Active |
| `netlify/functions/_share/official-va.js` | Official VA compensation and home-loan rule data | Updating VA rates/rules/version | Amy conversational wording | none | Shared / Active |
| `netlify/functions/_share/official-retirement.js` | Official/estimated retirement pay helpers | Retirement formula/table updates | Treating estimates as guaranteed entitlements in Amy copy | none | Shared / Active |
| `netlify/functions/_share/official-malt.js` | Official MALT rates | MALT rate updates | Amy housing strategy wording | none | Shared / Active |
| `netlify/functions/_share/official-dla.js` | Official DLA rates | DLA rate updates | Amy chat flow | none | Shared / Active |
| `netlify/functions/_share/official-hhg.js` | Official HHG weight allowances | HHG table updates | Amy chat flow | none | Shared / Active |
| `netlify/functions/_share/official-pcs-per-diem.js` | Official PCS per diem helpers | Per diem updates | Amy chat flow | none | Shared / Active |
| `netlify/functions/_share/official-pcs-travel-days.js` | Official PCS travel-days rules | Travel-days rule updates | Amy chat flow | none | Shared / Active |
| `netlify/functions/_share/response.js` | Shared Netlify JSON/CORS response helpers | Standardizing response helpers across functions | Amy product logic; currently unused by Amy and CommonJS in an ESM package | none | Shared |
| `netlify/functions/_share/pcs-move-engine.samples.test.js` | Manual sample tests for PCS move engine | Expanding PCS move fixtures | Using as substitute for Amy/registry tests | `pcs-move-engine.js` | Shared / Active |
| `netlify/functions/pcs-move.js` | Public PCS move API used by PCS Calculator | Changing the public move endpoint contract | Amy explanation logic | `pcs-move-engine.js` | Active |
| `netlify/functions/mortgage.js` | Public mortgage API used by Mortgage Calculator | Changing public mortgage endpoint contract | Amy explanation logic | `mortgage-engine.js`, `official-va.js` | Active |
| `netlify/functions/opensource-brain.js` | Calculator brain for BAH/VA/retirement style tools | Calculator API behavior | Amy concierge product behavior | official-* modules | Active |
| `netlify/functions/voice-amy-welcome.js` | Voice/base-brief audio generation branded as Amy | Voice script/audio pipeline | Ask Amy chat architecture | ElevenLabs env vars | Active (adjacent) |
| `netlify.toml` | Netlify publish, functions, redirects, CORS headers | Deployment/routing/bundling includes | Amy business logic | functions tree | Active |
| `package.json` | Package type and dependencies | Dependency/runtime package changes | Amy product copy | npm ecosystem | Active |

---

## Status key

- **Active** — used by current product paths in this repo
- **Legacy** — keep for compatibility; avoid new feature work
- **Shared** — platform engine/module used by more than one surface
- **Experimental** — candidate architecture not yet verified as sole production path

---

## Quick migration reminder

Desired long-term flow:

```txt
PCSUnited frontend
  → agent-amy.js
  → agent-registry.js
  → deterministic TheWing engines
  → truth packet / structured decision
  → OpenAI conversational explanation
  → Ask Amy response in PCSUnited
```

Core product rule:

**TheWing engines calculate and evaluate. Amy explains, guides, and helps the member act.**

Amy must not invent calculations, military benefits, eligibility, approval outcomes, official rates, or profile information.
