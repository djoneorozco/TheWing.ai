# TOR civilian Financial Guidance

This page connects household income, a conventional/FHA mortgage estimate, and the existing four-category monthly budget. Ask Elena explains current server-calculated results, remembers the current conversation, links to approved primary sources, and runs separate mortgage/budget scenarios. No accounts, email verification, military income calculator, or persistent browser storage are involved.

## Canonical calculations and generated views

TheWing owns financial math. `tor-financial-income` uses the existing financial-analysis engine to normalize gross income, payroll deductions, planned savings and optional combined assets. The civilian calculator views use the existing mortgage and Finance-UX scripts and server endpoints. Income and planned savings transfer once; the projected mortgage replaces the housing row. Unknown deductions stay unknown and draft budgets remain provisional.

`content.html`, `page.css` and `page.js` are the editable TOR host sources. Run `node scripts/build-tor-financial-guidance.mjs` after editing these, the canonical calculator templates, or `PCSU-Ask-Amy/panel.*`. It generates:

- `Civilian-Mortgage/index.html` and `Civilian-Budget/index.html`
- `TOR-Financial-Guidance/index.html`, `elena.js` and `elena.css`
- `Webflow/TOR-Civilian-Financial-Guidance.html`

Do not hand-edit generated files. Civilian behavior is opt-in through `data-audience="civilian"`; existing PCSU pages retain their defaults. Internal PCSU message names are retained for compatibility. These names are not product labels.

## Elena API

The new page uses TheWing's `/api/tor-ask-elena` endpoint. It is separate from the older OrozcoRealty general-chat endpoint, which this change does not replace on other pages. This avoids creating a second financial engine in the OrozcoRealty repository.

The request contract is `{message, history, section, context: {version: 1, income, mortgage, budget}}`. Current inputs supersede conversation history. The server validates inputs and source IDs, runs the canonical calculations, and attaches exact numeric facts. Tool scenarios never change page inputs. Civilian loan validation applies to both the baseline and what-if calls. Client context sharing can be turned off, in-flight replies are cancelled when inputs change, and reload clears entries and chat history.

Uses the existing server-side `OPENAI_API_KEY`, Responses API with `store:false`, and `TOR_ELENA_OPENAI_MODEL` (default `gpt-6.2-astra`). API failures return a clearly identified deterministic fallback. No provider secrets are sent to Webflow. The prompt and sources are configured server-side; the public caller cannot choose another identity or model.

## Validation

```sh
node scripts/build-tor-financial-guidance.mjs
node --test scripts/test-tor-financial-guidance.mjs scripts/test-pcsu-ask-amy.mjs scripts/test-financial-analysis.mjs scripts/test-finance-utility.mjs scripts/test-finance-mortgage-bridge.mjs scripts/test-military-mortgage.mjs
node scripts/test-tor-financial-browser.mjs
node scripts/test-pcsu-ask-amy-browser.mjs
```

Browser scripts require Playwright and an installed Chrome browser. Browser fixtures use real financial engines and mock only the language model; separately test the deployed preview with the actual provider before release. CI checks the generated files and both civilian/PCSU calculation contracts.

## Webflow installation after release approval

1. Merge and confirm the TheWing production deploy succeeds. Verify `/TOR-Financial-Guidance/` and `/api/tor-ask-elena` before installing the production embed.
2. On TOR's Financial Guidance page only, replace the old financial body and old Elena widget with `Webflow/TOR-Civilian-Financial-Guidance.html` in one Code Embed. Keep the TOR navigation. Remove the old military income utility, calculator bridge scripts, PCS benefits/base map, and duplicate chat launcher from this page. Do not run the old host script alongside the new one.
3. Update this page's heading/SEO to civilian Financial Guidance. The existing `/military/financial-guidance` route can remain to preserve links. Update the page's section navigation to Income, Mortgage, Budget, and Review, targeting `#pcs1-find`, `#pcs1-compare`, `#pcs1-move`, and `#pcs1-plan`. Do not change shared navigation globally without review.
4. Publish to Webflow staging only after authorization. Enter sample income/deductions, change a mortgage assumption, add living expenses and debt, and verify their transfer. Test Elena's explanation, follow-up, sources, context opt-out and a what-if; check mobile layout.

A branch preview or merged PR does not establish Webflow installation or publication. The standalone preview has a simplified TOR navigation; Webflow retains its existing site navigation.
