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

## Existing TOR Webflow page: preserve the user's design

The standalone page and `Webflow/TOR-Civilian-Financial-Guidance.html` are NOT replacements for the existing Webflow page. The user requires their original layout, images, navigation, headings, footer, styles, and section structure to stay unchanged. Do not install `page.css`, `page.js`, or `content.html` on that page.

Update only these three existing Code Embeds on `/military/financial-guidance`:

| Existing embed | Replacement source | Change |
| --- | --- | --- |
| `Finance Input Code 3` (`015b7721-026d-2af0-ddba-cb6e3bef588f`) | `Webflow/TOR-Financial-Guidance-Mortgage.html` | Point the same iframe to the civilian mortgage view; preserve all dimensions and styling. |
| `Finance-UX` (`015b7721-026d-2af0-ddba-cb6e3bef58ab`) | `Webflow/tor-financial-guidance-budget.html` | Point the same iframe to the civilian budget view; preserve the income/mortgage bridge and open the existing income dialog when editing income. |
| Final floating Elena embed (`13ec47ea-58d6-58b7-1746-d165f90b35cb`) | `Webflow/TOR-Financial-Guidance-Elena.html` | Load only the approved gold/glass Elena panel and client, connected to `/api/tor-ask-elena`. |

The existing civilian income utility already exposes `PCSU_FINANCIAL_INCOME` and its change event. Keep its UI and source code. The budget uses its income, deductions, and savings, and the mortgage replaces the projected housing row once. Elena consumes those same inputs, sends conversation history, and displays verified source links and separate what-if results. The backend recalculates financial results from the inputs.

Before publishing, compare the native Webflow element tree with the original and confirm only these three embed contents changed. Publish to staging, verify the income → mortgage → budget flow and Elena's explanation, sources, follow-up, opt-out, and what-if behavior. Leave headings, images, navigation, other embeds, and page metadata untouched.

A branch preview, saved Designer edit, or merged PR does not establish Webflow publication.

## Homepage Anam concierge

Use `Ask-Elena-Concierge.html` in the homepage’s existing floating Ask Elena Code Embed. It includes the launcher, dialog, four section links, and Anam client. Replace the existing embed as a unit to avoid duplicate element IDs. The four anchors supply the destinations for linked section names in Elena’s transcript. Section buttons also work before a conversation starts.

Apply the two fields in `anam-concierge.json` to the existing homepage Elena persona in Anam. The widget token uses that persona’s saved greeting and system prompt. A repository edit alone does not apply those settings or publish the Webflow embed. The financial calculator panel described above has its own separate client.
