# PCSU-Ask-Amy — Financial Guidance

This release focuses exclusively on `https://pcs-united-com.webflow.io/financial-guidance`.
It replaces that page's TOR-oriented chat presentation with a PCSUnited glass panel and a dedicated Financial Guidance adapter. Other Amy variants and TOR remain unchanged. HUD visualizations are a later phase.

## Verified current page connection (2026-11-19)

The published page loads `public/ask-amy/tor-ask-amy.js?v=1.0.1` and the `tor-ask-amy` embed. That client sends `context.product: "tor"` to `/.netlify/functions/agent-amy-public` and recognizes calculator frames only with `amy=tor` in the URL. This page's actual frames are `/Military-Mortgage/?embedded=1` and `/Finance-UX/?housing=projected`, so they do not meet that client's connection condition. The panel also displays The Orozco Realty branding.

Financial Guidance already has a newer, separate source-data handoff:

| Source | Existing connection reused by Amy |
| --- | --- |
| Section 01 income | `PCSU_FINANCIAL_INCOME.getSnapshot()` and `pcsu:financial-income-change` |
| Section 02 mortgage | Actual `#pcsu-mortgage-frame` window, `pcsu-mortgage-budget`, version 1, `pcsu:mortgage-budget-state` |
| Section 03 expenses | Actual `#pcsu-budget-frame` window, `pcsu-finance`, version 1, `pcsu:finance-analysis-state` |
| Current section | Section visibility / focus; no arbitrary form scraping or unrelated browsing data |

This audit is based on published HTML and observed browser behavior. It does not claim a complete inventory of unpublished Webflow drafts or other PCSU pages.

## Architecture

`PCSU-Ask-Amy/panel.js` → `/api/pcsu-ask-amy` → `pcsu-amy-context.js` → existing `financial-analysis`, `financial-planning`, `finance-budget` and `military-mortgage` engines → `pcsu-amy-model.js` → checked facts and source links.

The separate endpoint is the explicitly named PCSU product adapter for this migration. The existing public gateway and specialized Amy endpoints retain their external contracts. No old endpoint is deleted or globally redirected.

The model defaults to `gpt-6.2-astra` with low reasoning through Responses. Set `PCSU_AMY_OPENAI_MODEL` to override this product alone; it uses the existing server-side `OPENAI_API_KEY`. The shared `OPENAI_MODEL` setting is deliberately not changed. No key belongs in Webflow. Requests set `store:false`; this is not a promise about the provider's account-level retention policy.

The model can call two read-only tools, with at most three scenarios and two model requests per question:

- `calculate_mortgage`: explicit changes to the current mortgage, or a complete scenario supplied in the question. The existing engine validates required fields and calculates all amounts. Missing fields are not filled with new defaults.
- `test_budget`: a new total monthly housing cost and/or new total other living expenses. The existing Financial Planning stress test preserves income, debt, savings and reserves.

Changed values require supporting text in the current user question. Unchanged inputs carry over from the page and are disclosed as assumptions. Scenarios do not update page fields. Incremental changes that do not supply a new total may require clarification. Standalone scenarios require all engine-required inputs; this release does not introduce military pay or disability tools into the chat.

The server returns prose without generated numeric figures, exact server-selected facts, checked primary-source links and structured scenario results. All figures use existing engine results. Current data replaces historical figures; a changed input cancels an in-flight explanation. Unknown deductions do not become zero. Unreviewed budgets and example mortgages cannot establish affordability. Savings and mortgage expenses are counted once. Source labels and conversation history are untrusted data.

History is memory-only, limited to twelve messages / eighteen thousand characters. Inputs are shared when a question is sent; the checkbox opts out of page context. There is no account, verification, profile persistence or financial request logging. CORS rejects unsupported browser origins, but it is not authentication or a complete abuse control. Request size, model output, tool calls and total AI time are bounded. Review Netlify/OpenAI account-level abuse and spending settings before production traffic; this patch does not alter billing or credentials.

## Installation and rollout

1. Review the Netlify deploy preview at `/PCSU-Ask-Amy/`. It explicitly labels its synthetic income and uses the actual mortgage and budget apps. The preview-only income form is not the Webflow replacement.
2. After approving the repository release, deploy the backend and assets to TheWing. Confirm `/api/pcsu-ask-amy` responds with `PCSU-Ask-Amy/1.0.0` and `ai_grounded` on a real model test.
3. In Financial Guidance only, replace the entire old `tor-ask-amy` embed and its `tor-ask-amy.js` script with `Webflow/PCSU-Ask-Amy.html`. Do not add a second widget. The generated embed contains its own CSS and JavaScript and is below Webflow's fifty-thousand-character limit.
4. Keep Section 01 income, both calculator iframes, their existing bridges and Financial Analysis handoff. No iframe URLs need to be changed on the published page.
5. Publish Webflow staging only with the user's separate authorization; verify there, then obtain authorization for any custom-domain publication.

The two calculator bridges add only same-origin support for TheWing's own Netlify production/numbered preview hosts so the repository preview can exercise the real apps. Existing trusted external hosts and source-window checks stay intact.

Rollback: restore the previous Webflow embed. The old backend and assets remain available. This PR alone does not install or publish Webflow changes.

## Verification

```
node scripts/build-pcsu-ask-amy.mjs
node --test scripts/test-pcsu-ask-amy.mjs scripts/test-financial-analysis.mjs scripts/test-finance-utility.mjs scripts/test-finance-mortgage-bridge.mjs scripts/test-military-mortgage.mjs
NODE_PATH=/path/to/playwright/node_modules node scripts/test-pcsu-ask-amy-browser.mjs
```

The browser test uses the actual calculator apps and server engines with mocked AI prose. It checks context transport, exact cash flow, history, source links, what-if isolation, spoofed message rejection, retry without duplicate turns, changed-input cancellation, sharing opt-out, reset, keyboard close and mobile layout. Real provider checks are separate from these deterministic tests. On 2026-11-19 the Netlify preview returned `ai_grounded` with `gpt-6.2-astra` for current cash flow, a home-price what-if and a budget stress test; all selected numerical results matched the engines.

Model integration references: [Responses function calling](https://developers.openai.com/api/docs/guides/function-calling), [GPT-6.2 Astra](https://developers.openai.com/api/docs/models/gpt-6.2-astra).
