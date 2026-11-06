# Military Mortgage: Calculator, Visualization and Summary

Version 1.1.0 preserves the compact dark calculator in the supplied reference. The separate view controls replace the content in the same panel. Entries remain in memory when switching views. No chat service, account, or browser persistence is used.

## Files

- `index.html`, `style.css`, `app.js`: screenshot-matched calculator and shared result state.
- `views.js`: charts, plain-language summary, accessible view switching and iframe sizing.
- `controls.js`, `controls.css`: separate Calculator / Visualization / Summary buttons.
- `embed/calculator-inline.html`: recommended Webflow calculator embed, on the same page as the other PCSUnited financial tools.
- `embed/view-buttons.html`: separate buttons embed, usable with either installation below.
- `embed/calculator.html`: optional hosted-iframe alternative.
- `netlify/functions/_share/military-mortgage.js`: additive amortization output from the existing backend engine.

## Deployment and Webflow installation

These are source changes and paste-ready embeds; they do not publish themselves. Deploy the updated `Military-Mortgage/` assets and shared backend module to the existing TheWing Netlify site before installing the embeds. The existing `/api/mortgage` route and `military-mortgage-v1` contract remain in use. No new dependencies or environment variables are required.

Recommended installation (preserves same-page PCSUnited handoffs):

1. Replace the old calculator embed with the complete contents of `embed/calculator-inline.html`.
2. Place `embed/view-buttons.html` in a separate Webflow Code Embed above or below the calculator.
3. Keep one calculator instance per page. Remove the prior calculator scripts to prevent duplicate IDs or initialization.
4. Publish through the normal Webflow review process after checking Preview/staging.

The inline calculator embed contains scoped HTML/CSS and loads `app.js` and `views.js` from `https://thewing.netlify.app/Military-Mortgage/`. The button embed contains its own styles and logic. Each is below 50,000 characters. Both embeds must be on the same page; the controls may appear before or after the calculator.

Optional iframe installation: use `embed/calculator.html` instead of the inline calculator and pair it with the same button embed. It loads `?embedded=1` to hide duplicate internal buttons. The supplied frame ID and `referrerpolicy="origin"` allow the buttons to switch screens and resize the frame. The bridge accepts only messages from the actual parent/frame and the expected origin. It transmits view and height, not financial data. Existing page-level financial consumers should use the recommended inline installation; their window APIs/events stay in the same document there.

## Behavior

- Calculator starts with the screenshot's example: $250,000 price, $0 down, 720 credit score, 6.10% assumed note rate, and $8,500 example reserves after closing.
- The starting rate is an editable assumption, not a live market quote or a rate derived from a credit score. Credit score continues to affect the existing conventional PMI planning estimate.
- Main headline rounds to whole dollars to match the reference. Visualization, Summary and event payloads retain cents. Example: $1,901.73 displays as $1,902 on the main card.
- Rate, term, tax, insurance, HOA, other ownership costs, funding-fee status and quoted PMI remain editable under Summary → Rate & cost details.
- Visualization shows an interactive monthly-cost doughnut and a principal-versus-interest bar over the chosen term. Legend buttons support keyboard activation and expose the same data as text.
- Summary explains the selected scenario and shows the existing monthly/loan cost breakdown. It does not require Amy, Elena, or an AI request.
- Pending, invalid and failed calculations clear the financial visuals; no previous result is reused. Retry is available on all relevant screens. Blank reserves remain unknown.

## Calculation and compatibility

Existing VA, FHA and conventional monthly calculations are retained. The API adds `amortization` using the existing `amortizationTotals` helper after financed fees establish the final loan principal. No alternate mortgage formula is introduced in the browser. Monthly result keys, API routing and CORS are preserved.

Amortization describes fixed-rate principal and interest with no extra payments, using full-precision payment math. Lender payment rounding can slightly change the final installment. It excludes taxes, insurance, HOA and upfront cash. There is no speculative lifetime projection of insurance, taxes or HOA. An older API that lacks amortization still supplies the monthly chart, with term totals explicitly unavailable.

Down payment + cash loan fee is a **known subtotal**, not complete cash to close. Other closing costs, prepaids and escrow deposits remain explicitly excluded. The Emergency Fund input is already after closing and is never reduced by closing costs again.

Preserved APIs: `window.PCSU_FINANCIAL_INPUT_PANEL`, `window.PCSUnitedMilitaryMortgage`, `getInputs`, `setInputs`, refresh methods and existing `pcsunited:*` input events. New presentation API: `window.PCSUnitedMortgageViews.setView('calculator'|'visualization'|'summary')` and `getView()`. New view events: `pcsunited:mortgage-view-request`, `pcsunited:mortgage-view-changed`, `pcsunited:mortgage-views-ready`.

## Local verification

Run from the repository root:

```sh
node scripts/build-mortgage-embeds.mjs
node --test scripts/test-military-mortgage.mjs
PORT=8144 node scripts/preview-military-mortgage.mjs
```

Visit `http://127.0.0.1:8144/Military-Mortgage/`, `inline-preview.html`, or `embed-preview.html` under that directory. The preview server calls the real local Netlify mortgage handler.

With Playwright available, run `node scripts/test-mortgage-views-browser.cjs`. The test accepts `MORTGAGE_PREVIEW_URL`, `CHROME_PATH`, and `MORTGAGE_SCREENSHOTS`. Browser verification covers screen switching, keyboard charts/sliders, program changes, missing/zero values, errors/retry, stale responses, mobile overflow, same-page embeds, and cross-origin iframe controls/resize. Build regenerated embeds before testing or deployment.
