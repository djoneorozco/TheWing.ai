# Financial Utility v3

The Webflow embed at `Webflow/financial-utility.html` replaces the plain Section 01 Finance-UX iframe. It opens a BAH-style income modal, reads/writes the existing PCSUProfile basic fields, retrieves official military pay through the existing BAH_CALCULATOR route, and adds an optional gross additional-income slider. Total household take-home income is explicitly entered once; it includes additional income and allowances already deposited.

The Financial Utility button switches the same dialog to an iframe. Origin/source/version-checked postMessage exchanges pass income and mortgage assumptions without query strings or browser storage. The iframe is kept mounted when closing or returning to income; reload clears financial amounts. Basic PCS profile persistence remains owned by the existing shared-profile embed.

The Financial Snapshot explicitly displays total income before deductions, military compensation, and additional income. The optional `incomeBreakdown` context field supplies display-only amounts; the budget endpoint still receives the original gross/net totals. Older hosts without the new field continue to show the gross total. Missing take-home pay shows an actionable prompt that returns focus to the host's take-home field, rather than an empty cash-flow chart. Gross income is never silently substituted for take-home pay, and additional income is already included in both household totals when supplied.

Finance-UX starts at zero with an unconfirmed budget; there are no personalized sample expenses or savings. Review is required before housing recommendations. Typed amounts retain cents and can exceed the illustrative slider range. Rows have essential-expense, continuing-housing, and required-debt-minimum options. Current housing is removed from a future purchase scenario only when it will not continue.

`POST /api/finance-budget` validates amounts and calculates current cash flow, dynamic emergency coverage, gross-income debt ratios, a 28/36 ceiling constrained by actual take-home cash flow, and a comfortable-to-upper payment band. The editable $500 minimum cash cushion and $500 extra comfort cushion are product planning assumptions, not lending rules. The comfortable payment equals the upper payment less the extra cushion, bounded at zero. Gross income includes estimated compensation; it is not a lender determination of qualifying income. VA qualification/residual-income approval is not claimed.

Home-price estimates use the complete existing mortgage calculation including the VA funding-fee overlay. This calculation was moved without formula changes into `_share/mortgage-scenario.js`, shared by the mortgage endpoint and finance budget. Search is bounded to $5M, estimates round down to $100, fixed cash down payment is retained, and price-dependent tax/insurance are recomputed. Home-price outputs are planning estimates, not cash-to-close or lifetime costs.

The legacy affordability score engine remains unchanged; its 28/30/35 intake-based scoring contract is different and is not used for the new net/gross budget guidance.

## Release order

1. Review and deploy the repository change so `/Finance-UX/` and `/api/finance-budget` are available.
2. Replace only Section 01's existing Finance-UX iframe embed with `Webflow/financial-utility.html` (under 50,000 characters).
3. Keep the shared-profile and mortgage embeds present. Do not replace the original Stage 1 BAH modal.
4. Publish Webflow staging, then verify pay → additional income → budget → mortgage. Webflow production and Netlify production deployment require the appropriate approval.

## Verification

Run `node --test scripts/test-finance-utility.mjs`. No package-level test/lint/build scripts are defined in this repository. The regression comparison also checked 16 VA/conventional mortgage scenarios (zero/6.65% interest and four down payments) against the previous mortgage handler with identical monetary results.

Financial amounts are held in page memory only and POSTed to TheWing for calculation. The old localStorage budget is not loaded or silently treated as confirmed data. No Supabase, account, LLM, new dependency, or financial analytics is introduced.
