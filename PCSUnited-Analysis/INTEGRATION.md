# Financial Guidance → Financial Analysis

The Section 04 CTA opens `https://pcs-united-com.webflow.io/financial-analysis` in a new tab. Its iframe loads `/PCSUnited-Analysis/?connected=1`. The original Financial Guidance tab stays open and owns the editable income, mortgage and expense state. Changes in that tab update the analysis.

## Data contract

- Section 01: `PCSU_FINANCIAL_INCOME.getSnapshot()` and `pcsu:financial-income-change`. Forward only completion, status, gross income, take-home income and savings contributions.
- Section 02: the existing `pcsu:mortgage-budget-state` message from the exact mortgage iframe. Forward raw mortgage inputs and readiness; the analysis endpoint recomputes the result using the existing mortgage engine. The additive `emergencyFundUserEntered` flag distinguishes an explicit after-closing reserve entry (including zero) from the illustrative initial balance.
- Section 03: the additive `pcsu:finance-analysis-request` / `pcsu:finance-analysis-state` protocol exports the current in-memory budget rows, revision, readiness, review flag, cushions, income and mortgage-link status. Existing budget messages remain compatible.
- Source tab → analysis page: version 1, `source: 'pcsu-analysis-launch'`, `type: 'pcsu:analysis-context'`, with `{requestId, revision, context:{version:1,income,mortgage,budget}}`.
- Analysis page → iframe: same context with `source: 'pcsu-analysis-host'` and the iframe's independent request ID. The page and iframe request their context again on reload.

Each receiver checks the sender's WindowProxy, explicit origin, message version and request ID. Context revisions must increase. Calculator snapshots come only from their known iframe and origin. Payloads have bounded size. Financial values never enter URLs, localStorage, sessionStorage, analytics, accounts or logs added by this change. They are sent in a POST body to the stateless, no-store `/api/financial-analysis` endpoint, consistent with the existing calculator APIs.

The launcher deliberately preserves the opener relationship for this trusted destination. No wildcard target origins are used. This flow requires the original tab to remain open; reloading the source clears its existing memory-only calculator state. A direct analysis-page visit has no financial context and displays an empty state. Popup blocking leaves the source and its inputs intact. If the receiver is published before the new app bundle, the iframe stays hidden rather than exposing the old demonstration results.

## Calculation semantics

`netlify/functions/_share/financial-analysis.js` composes `calculateFinanceBudget` and `calculateMilitaryMortgage`. The additive `planning` result uses the same calculations plus explicit cash-reserve planning bands; it does not make lending or eligibility decisions.

- The projected mortgage row is already an expense. Deduct it once. Respect a manually adjusted Section 03 payment while labeling the Section 02 loan breakdown separately.
- Reject a ready budget with stale income or a linked payment that does not match the current mortgage inputs. Pending/error snapshots clear the old results, and superseded requests cannot render.
- Manual gross income is not take-home pay. Display remaining before payroll deductions until net income is supplied; do not issue an affordability conclusion with incomplete/unreviewed inputs.
- Keep example mortgage assumptions identified. Do not import the mortgage calculator's illustrative reserve as a personal balance.
- Reserves explicitly entered as after closing are not reduced by closing costs again. Closing costs, prepaids and escrow deposits remain unknown. The only upfront subtotal is the existing engine's down payment plus any cash loan fee.
- Connected mode renders canonical values or unknown states instead of the standalone demo, its score or hypothetical alternate-price scenarios. The existing dashboard layout and standalone mode are retained.

## Financial health, recommended prices and budget tests

The connected dashboard (`?connected=1`, used by the existing Webflow iframe) now follows the supplied Dashboard.jpg layout: four-part navy overview, original housing breakdown and monthly cash flow, a Test Your Budget panel, and the existing lower cards. The legacy standalone demonstration is unchanged. No Webflow embed replacement is needed for this update.

The response retains `financial-analysis-v1` and all original fields. An additive `planning` object is versioned `financial-planning-v1`:

- `summary` contains the viewed scenario. The original top-level `summary`, `mortgage`, `budget` and expense rows always remain the baseline.
- `health` contains a qualitative budget signal, residual percentage, factors, missing inputs, rule explanation and assessment scope. Residual percentage is **take-home cash after entered housing, expenses, debt and savings / take-home income**, not a calibrated health score or the VA residual-income calculation. Gross-only input never produces a residual percentage or price recommendation.
- `homeRange` contains a provisional lower/upper price estimate, preferred target, payments and assumptions. An unavailable comfort target is null, never replaced by the upper price limit.
- `stressTest` contains baseline and tested housing, living expenses, remaining cash, the difference, income basis and preview status.

Health rules apply only after positive gross and take-home income, a reviewed budget and confirmed mortgage assumptions are available. Negative cash flow or less than one month of explicitly entered reserves produces `at-risk`. Below three months of reserves, or a housing payment over the planning limit, produces `stretched`. Missing reserves produces `provisional`. A budget meeting these constraints produces `stable`. These are inspectable planning bands, not credit underwriting, an overall approval score or a fiduciary assessment. Entered credit and estimated LTV appear in Review Your Plan as financing context; no invented credit-to-rate table is introduced.

The upper monthly housing budget is the smallest of:

1. The existing 28% gross housing and 36% gross housing-plus-required-debt limits.
2. Take-home income after continuing expenses, debt, savings and the user's monthly cash cushion.
3. When reserves are explicitly provided: after-closing reserves / 3, less tested living expenses and full debt payments.

The comfortable payment also preserves the existing additional comfort cushion. `purchase-price.js` inverts canonical mortgage quotes for these payments and is shared with Finance-UX's existing inverse calculation. Candidate quotes use **Section 02's exact loan program, rate, term, cash down payment, VA/FHA fee options and PMI assumptions**. Tax and insurance amounts scale proportionally with price; HOA and other ownership costs remain fixed. FHA's supported minimum down payment caps candidate prices. Fees and PMI/MIP are recalculated by the existing mortgage engine. Prices round downward to $100 increments. The preferred target is the comfortable end of the budget range, not the selected home price. Cheaper homes remain valid choices.

Closing costs, prepaids, escrow, lender approval and current market rates are not inferred. Ranges are visibly described as budget-based estimates. The entered after-closing balance is held fixed at candidate prices; different closing costs may change actual available reserves. Review Your Plan exposes these limitations.

An optional request property enables a temporary scenario:

```json
"stressTest": { "housingMonthly": 3500.50, "expensesMonthly": 3200.00 }
```

Both values must be finite numbers from 0 to 1,000,000 with at most two decimal places. The mortgage slider controls the aggregate housing payment used in the budget; it does not change the contractual loan, rate or original mortgage breakdown. Living expenses exclude debt and savings. Income, debt, savings and cash balances stay fixed. Changing living expenses recalculates the feasible price range; changing a hypothetical mortgage payment changes cash flow, DTI and health, but does not itself increase borrowing capacity.

The thin client debounces API requests, cancels superseded requests and marks pending/failed previews visibly. Reset and incoming source changes restore the baseline. There are no upstream mutations, storage writes, new accounts, external AI calls or authentication/CORS changes. Annual chart display does not change the monthly controls.

## Webflow embeds and deployment

Run `node scripts/build-financial-analysis-embeds.mjs`. The script verifies both embeds remain below 50,000 characters.

1. Deploy the reviewed TheWing branch with the new function, app changes and connected assets.
2. Save `Webflow/financial-analysis-cta.html` in Financial Guidance → Section 04 → Financial Analysis CTA.
3. Save `Webflow/financial-analysis-page.html` in the Financial Analysis iframe embed.
4. After explicit publication approval, publish the two Webflow pages to the requested environment and verify using fresh browser tabs. Saved Webflow drafts are not live.

The CTA retains the supplied styling and visible label. It now opens a separate analysis tab to preserve the current calculators without persistence. If a custom-domain deployment is approved later, explicitly select its destination and retain the trusted-origin checks.

## Verification

```sh
node --test scripts/test-financial-analysis.mjs scripts/test-finance-utility.mjs scripts/test-finance-mortgage-bridge.mjs scripts/test-military-mortgage.mjs
node scripts/test-financial-analysis-browser.mjs
```

The browser test requires Playwright and installed Chrome (`channel: 'chrome'`); set `NODE_PATH` if Playwright is supplied outside this repository. It serves the actual mortgage, budget and analysis apps plus real function handlers on two local origins. The source income fixture follows the existing Section 01 snapshot/event contract.

Coverage includes cents, mortgage once, manual mortgage overrides, gross-only and zero income, invalidation, stale state, reviewed/example states, reserve intent, unknown closing costs, live source edits, report keyboard behavior, blocked popups, direct visits, both reload paths, sender/origin/nonce/revision rejection, no browser persistence and narrow-screen layout. Planning tests additionally cover exact loan inversion (VA/conventional/FHA and zero interest), expense and reserve constraints, invalid stress inputs, keyboard sliders, rapid edits, negative cash flow, reset and no upstream mutation. Optional `ANALYSIS_SCREENSHOT_DIR` saves desktop/mobile captures using synthetic figures.
