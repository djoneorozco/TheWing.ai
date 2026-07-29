# PT Calculator ↔ Ask Amy Integration Report

**Verdict: PASS WITH LIMITATIONS**

Branch: `cursor/amy-pt-calculator-module`  
Dependency reviewed: `cursor/fix-pt-calculator-scoring-bd8f` (PR #7 — official PFRA 2026 scoring corrections)  
Module version: `pt-calculator-2026.1`  
Scoring core: `pt-scoring-core-2026.1`

---

## Architecture before

```
Browser PT-Calculator/ptcalculator.js  (standalone UI + embedded tables)
        ✗ no Ask Amy bridge
        ✗ no server scoring authority

Ask Amy HUD → agent-amy-public → amy-brain
        → compensation + va_loans only
        ✗ no PT/PFRA module
```

## Architecture after

```
Audited browser PT Calculator
  └─ window.PCSUnitedPTCalculator.getData()
  └─ events: pcsunited:pt-calculator-ready | updated
        ↓ in-memory only
Ask Amy HUD (ask-amy-hud.js)
  └─ POST { ..., pt } → agent-amy-public
        ↓ sanitizePublicPtContext
amy-brain.js (fail-open)
  └─ module: pt_calculator
        ↓
pt-calculator.js  ← imports pt-scoring-core.js (authoritative)
  └─ recalculates PFRA score
  └─ builds deterministic truth packet
        ↓
Amy explains (OpenAI optional; deterministic path independently verified)
```

**Principle preserved:** TheWing calculates. Amy explains.

---

## Exact files changed

| File | Change |
|------|--------|
| `netlify/functions/_share/pt-scoring-core.js` | **NEW** — platform-neutral 2026 PFRA tables + pure scoring |
| `netlify/functions/_share/pt-calculator.js` | **NEW** — Amy knowledge module (normalize, score, truth packet) |
| `netlify/functions/_share/amy-brain.js` | Register `pt_calculator`; normalize `input.pt` aliases; combine facts |
| `netlify/functions/_share/agent-registry.js` | Register tool + aliases `ptCalculator` / `pt_calculator` / `pfra` |
| `netlify/functions/agent-amy-public.js` | Accept/sanitize PT context; pass into `buildAmyTruthPacket`; debug |
| `PT-Calculator/ptcalculator.js` | Audited scoring (from PR #7) + Ask Amy bridge API/events |
| `PT-Calculator/build_calculator.mjs` | From audit branch (table rebuild helper) |
| `PT-Calculator/generate_tables.mjs` | From audit branch |
| `PT-Calculator/test_scoring.mjs` | From audit branch |
| `public/ask-amy/ask-amy-hud.js` | Read PT bridge; listen for events; POST `pt` |
| `scripts/test-pt-calculator.mjs` | **NEW** scoring + routing tests |
| `scripts/test-pt-calculator-parity.mjs` | **NEW** browser/server parity |
| `scripts/test-pt-amy-integration.mjs` | **NEW** end-to-end deterministic path |
| `scripts/test-pt-browser-smoke.mjs` | **NEW** browser bridge smoke |
| `PT-CALCULATOR-AMY-INTEGRATION-REPORT.md` | **NEW** this report |

---

## Data contract

### Canonical PT input (normalized)

```json
{
  "schema_version": "pt-input-v1",
  "source_version": "pt-calculator-2026.1",
  "effective_date": "2026-03-01",
  "sex": "male|female",
  "age": 22,
  "age_band": "under25|25-29|...|60plus",
  "height_inches": 72,
  "waist_inches": 31,
  "strength_option": "push_ups|hand_release_push_ups",
  "strength_reps": 67,
  "core_option": "sit_ups|cross_leg_reverse_crunch|forearm_plank",
  "core_reps": 58,
  "plank_seconds": null,
  "cardio_option": "two_mile_run|hamr|two_kilometer_walk",
  "run_seconds": 805,
  "hamr_shuttles": null,
  "walk_seconds": null,
  "walk_authorized": null,
  "cardio_exempt": null,
  "altitude_feet": null,
  "altitude_group": null,
  "displayed_component_scores": {},
  "displayed_total_score": 100,
  "displayed_rating": "Excellent"
}
```

### Accepted aliases

- Request: `pt`, `ptCalculator`, `pt_calculator`, `pfra`, `session.pt`
- Strength / core / cardio labels normalized to stable identifiers above
- Legacy `1.5-mile run`, abdominal circumference, 2022 weights → warn/reject

### Truth-packet output (stable)

Includes `ok`, `version`, `intent`, `source`, `profile`, `selections`, `measurements` (WHtR + risk), `component_scores`, `total_score`, `rating`, `overall_pass`, `component_minimums_met`, `comparison` (browser vs server), `guidance` (bluf/facts/risks/next_steps/disclaimers), `warnings`.

Server always recalculates. Browser totals are compared; mismatches produce a deterministic discrepancy warning.

---

## Events

| Event | When |
|-------|------|
| `pcsunited:pt-calculator-ready` | Calculator initialized |
| `pcsunited:pt-calculator-updated` | Valid calculation changes |

Detail:

```json
{
  "source": "pcsunited-pt-calculator",
  "version": "pt-calculator-2026.1",
  "userInitiated": true,
  "pt": { "...getData()..." }
}
```

HUD keeps newest PT result in memory only (no `localStorage` / `sessionStorage`).

---

## Module exports

From `pt-calculator.js`:

- `PT_CALCULATOR_VERSION`
- `PT_CALCULATOR_RULES`
- `PT_COMPONENT_MINIMUMS`
- `PT_AGE_BANDS`
- `detectPtCalculatorIntent(message)`
- `normalizePtCalculatorInput(input)`
- `calculateWhtr(input)`
- `calculatePtComponentScore(input)`
- `calculatePfraScore(input)`
- `analyzePtCalculatorQuestion(message, input)`
- `buildPtCalculatorTruthPacket({ message, profile, pt, scenario, metadata })`
- default frozen export

Scoring authority imported from `pt-scoring-core.js` (extracted from audited browser tables).

---

## Routing behavior

| Message | Routes to |
|---------|-----------|
| Air Force PT score / PFRA / PT calculator | `pt_calculator` |
| Did I pass / why did I fail / Excellent target | `pt_calculator` |
| Push-ups / HAMR / plank / WHtR / 2 km walk | `pt_calculator` |
| Credit score | **no** PT route |
| Explain my VA Loan | `va_loans` (unchanged) |
| Compensation / monthly pay | `compensation` (unchanged) |

False-positive guards: credit/mortgage/school scores, VA disability %, financial readiness without AF/PT context.

Fail-open: Amy Brain PT failures never block the public endpoint.

---

## Test cases & commands

```bash
node --check netlify/functions/_share/pt-scoring-core.js
node --check netlify/functions/_share/pt-calculator.js
node --check netlify/functions/_share/amy-brain.js
node --check netlify/functions/_share/agent-registry.js
node --check netlify/functions/agent-amy-public.js
node --check PT-Calculator/ptcalculator.js
node --check public/ask-amy/ask-amy-hud.js

node scripts/test-pt-calculator.mjs          # scoring + routing + registry
node scripts/test-pt-calculator-parity.mjs   # browser/server threshold parity
node scripts/test-pt-amy-integration.mjs     # HUD → brain → truth packet
node scripts/test-pt-browser-smoke.mjs       # bridge API smoke
```

### Results (this run)

| Suite | Result |
|-------|--------|
| Syntax checks | PASS |
| `test-pt-calculator.mjs` | **51/51 PASS** |
| `test-pt-calculator-parity.mjs` | **150/150 PASS** |
| `test-pt-amy-integration.mjs` | **5/5 PASS** |
| `test-pt-browser-smoke.mjs` | **6/6 PASS** |

Coverage includes: every age band × both sexes, all modalities, component minimums, 90.0 / >90 / 75 / <75, component failure with high total, WHtR truncation, missing/invalid fields, browser/server discrepancy, partial state, walk medical-only warning, altitude ambiguity, no invented exempt normalization, routing positives/negatives, OpenAI-disabled deterministic path.

---

## Browser/server parity results

- Shared core thresholds match audited `PT-Calculator/ptcalculator.js` for push, HRPU, sit-up, reverse crunch, plank, 2-mile run, HAMR, walk, and WHtR rows across all 18 age/sex keys.
- `SCORE_CAPS`, `MIN_PASS`, rating thresholds (90 / 75), and WHtR nearest-hundredth rounding agree.
- Ask Amy never trusts a browser-supplied total without recalculation.

---

## Fail-open behavior

- `agent-amy-public` wraps `buildAmyTruthPacket` in try/catch; PT module errors do not fail the request.
- Partial PT input returns `ok/partial` packets with warnings instead of throwing.
- Existing compensation and VA Loan modules remain registered and unchanged in behavior.

---

## Known source ambiguities / limitations

1. **Altitude adjustments** — altitude feet/group accepted with warning; charted altitude-adjusted scoring is not fully automated.
2. **Cardio exemption** — exemption flag produces an explicit warning; **no invented exempt-score normalization formula**.
3. **2 km Walk** — scored pass/fail at 35.0 per PFRA p.11; medical-authorization warning when `walk_authorized !== true`.
4. **Official PDF digitization** — tables come from the audited calculator / PFRA chart extraction on PR #7; ongoing chart revisions should regenerate both browser and `pt-scoring-core.js` together (parity test enforces this).
5. **Sidebar** — production request construction lives in `ask-amy-hud.js` (updated). Sidebar is launch UI only.

---

## Example request / response (deterministic)

**HUD → public body (excerpt)**

```json
{
  "message": "What is my Air Force PT score?",
  "pt": {
    "sex": "male",
    "age_band": "under25",
    "height_inches": 72,
    "waist_inches": 31,
    "strength_option": "push_ups",
    "strength_reps": 67,
    "core_option": "sit_ups",
    "core_reps": 58,
    "cardio_option": "two_mile_run",
    "run_seconds": 805,
    "displayed_total_score": 100
  }
}
```

**Truth packet (excerpt)**

```json
{
  "ok": true,
  "version": "pt-calculator-2026.1",
  "intent": "score_explanation",
  "total_score": 100,
  "rating": "Excellent",
  "overall_pass": true,
  "component_scores": {
    "body_composition": 20,
    "strength": 15,
    "core": 15,
    "cardio": 50
  },
  "comparison": {
    "browser_total": 100,
    "server_total": 100,
    "matches": true
  },
  "guidance": {
    "bluf": "Your calculated 2026 PFRA score is 100.0 (Excellent)."
  },
  "warnings": []
}
```

---

## Final verdict

**PASS WITH LIMITATIONS**

Deterministic USAF PT Calculator knowledge module is integrated into Ask Amy with audited 2026 scoring authority, browser bridge, HUD context, registry/brain/public wiring, and full automated test coverage. Limitations are documented (altitude automation, exempt normalization intentionally omitted, walk medical authorization).
