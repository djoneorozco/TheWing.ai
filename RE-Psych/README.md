# RE-Psych home baseline

Six approved interactive baseline modules precede a bounded, adaptive sequence drawn from Q7–Q36. The PCSU modal, palette, approved imagery, and Webflow v1 host protocol remain in place. No build step or runtime package install is required.

## Run and verify

Serve the repository root with `python3 -m http.server 8776`. Open `http://localhost:8776/RE-Psych/`.

From the repository root:

```sh
node --test RE-Psych/tests/decision-rules.test.cjs
RE_PSYCH_URL=http://localhost:8776/RE-Psych/ node RE-Psych/tests/browser.cjs
```

The browser test requires Playwright and Chromium. An existing install can be selected with `PLAYWRIGHT_MODULE` and `CHROME_PATH`. `SCREENSHOT_DIR` optionally saves review images. The host fixture under `tests/host.html` tests the same-origin iframe protocol; it is not a product entry point.

## Baseline contracts

| ID | Interaction | Meaning |
| --- | --- | --- |
| Q1 | Click 15, 25, or 35-minute map zone; top-two reasons | Comfortable one-way preference, not an actual route estimate or firm cap |
| Q2 | Five homes in one comparison row at a locked $300,000; top-two reasons | Hypothetical finish/space choice, not the household budget; none-fit means unmet needs |
| Q3 | Drag or use arrows to rank four priorities | Relative order, not magnitude of willingness to sacrifice |
| Q4 | Same home at four condition levels | Stated willingness to consider work; no timer or reasons question |
| Q5 | Features, then only relevant upkeep or intended-use questions | Desired use and care preferences; paid help does not establish affordability |
| Q6 | Bedrooms, extra rooms, access, move-in readiness, actual housing and commute limits | Self-reported requirements; unknown, no fixed requirement, and zero stay distinct |

Q5 uses the approved features/upkeep embed from the preceding iteration. All three approved artwork sheets are bundled locally; no Webflow asset URL placeholders need configuring. Markup lives in `index.html`; each approved module has scoped CSS and JS in `baseline/`.

The original baseline `repsych:qN:change` / `repsych:qN:confirmed` events and `qNAnswer` properties remain. Editing any baseline invalidates the adaptive answers and brief. Modules with a Save/Confirm button advance after confirmation. Q4 records a single selection, then uses Continue so users can review the four choices.

## Question-bank mapping

The supplied Q7–Q36 document referred to older baseline numbering. Its question IDs are retained, with this mapping:

| Bank IDs | Current topic and baseline context |
| --- | --- |
| Q7–Q11 | Shared/separate living activities: Q5 uses and Q6 room requirements |
| Q12–Q16 | Space versus journey: Q1, Q2, Q3, and Q6 limits |
| Q17–Q21 | Outdoor space versus upkeep: Q1 reasons, Q2, Q5 |
| Q22–Q26 | Condition and project disruption: Q2, Q3, Q4, Q6 |
| Q27–Q31 | Personal control versus coordination: Q5 upkeep and Q4 work |
| Q32–Q36 | Optional features versus money remaining: Q2, Q3, Q5, Q6 |

Q22/Q24–Q26 now compare functional space and condition/process, replacing the discarded aesthetic-style construct. Q24 keeps essential rooms usable; Q25 changes completion timing without delaying the move. These hypothetical choices never override the user's actual move-in requirements.

## Adaptive rules (authored, not calibrated)

`question-bank.js` owns the 30 authored questions. `decision-rules.js` owns questionnaire routing and evidence summaries, separately from DOM rendering. It does not calculate authoritative financial values or duplicate a backend financial engine. `app.js` renders the baseline, questions, and deterministic home brief. No model call, account, storage, analytics submission, or private credential is used.

1. Rank topics using explicit baseline signals. Q3 ranks contribute 6/4/2/1 **routing points only**, not psychological scores. Explicit reasons add 2; relevant Q5 features add 3. Unclear condition, upkeep, and additional-room needs increase the related topic's priority. Each route includes its reasons for audit. These are product heuristics, not empirically calibrated weights.
2. Explore the two most relevant eligible topics. For each, ask the original comparison, changed-circumstance comparison, and explicit search-guidance confirmation. Both comparison members are always presented together unless the user chooses to finish early.
3. If comparisons and guidance agree, record “supported in this exercise.” A switch matching the specific changed condition plus the conditional confirmation counts as a useful conditional preference, not an inconsistency.
4. If they do not agree, or an answer is missing/unsure, add that topic's rationale and recent-experience questions. They supply context and do not magically resolve the finding.
5. After two topics, stop if both have supported findings. Otherwise explore one additional topic only if its baseline routing priority is at least 3. Stop after at most three topics / 15 follow-ups. Typical minimum is 6. Users can finish early with explicitly partial results.
6. Show untested domains and unresolved preferences in the brief. This stopping rule limits burden; it is **not** a validated precision or confidence threshold.

Q14/Q15's longer journey is capped at the stated Q6 maximum; the shorter comparison remains below it. A cap below five minutes makes that comparison ineligible. A fixed housing cap below $300 makes the $300/$75 optional-premium comparison ineligible. Unknown limits are never invented. The example home price never becomes a monthly housing budget.

## Interpretation and compatibility

The brief includes protected requirements, all baseline choices and stated reasons, tested conditional preferences, unresolved needs, and conflicts to revisit. It does not assign MBTI/OCEAN types, personality scores, a buyer archetype, an affordable payment, or a recommended listing. Timing never affects evidence or routing. Ten seconds is a soft prompt; expiry never submits an answer. Skip is missing, not neutral. Timers pause when the quiz is closed, the document is hidden, or the prompt is outside its visible scrolling area.

`window.REPsych.open/close` and `window.PCSUAIOUQuiz` remain. Embedded URLs keep `?embed=1&parentOrigin=...`. Origin-checked `re-psych` version 1 `ready`/`close` and `re-psych-host` `visibility` messages are unchanged. No questionnaire answers are automatically sent to the host.

New local integration points: `REPsych.getReport()` returns a copy of the versioned `repsych.home-baseline.v2` report; `repsych:completed` carries the same report in-page. Users can download a plain-text brief or JSON answers. Reloading clears all answers.

The legacy `aiou-report` endpoint and `scoring.js` are untouched for other consumers. This new flow replaces the old unvalidated personality-score-to-LLM report with a local, inspectable home brief; it does not send an incompatible new payload to that endpoint.

## Limits

Illustrative home/condition images cannot establish structural condition, actual market value, costs, or renovation capability. Authored comparisons and stopping rules need real user evaluation before making claims of predictive or psychometric validity. No unasked topic should be treated as a confirmed preference. No Webflow page content is modified by this change.
