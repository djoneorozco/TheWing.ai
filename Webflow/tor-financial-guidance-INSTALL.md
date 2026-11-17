# TOR military Financial Guidance

Repairs the transferred PCSUnited workflow at `/military/financial-guidance` and the connected destination at `/financial-analysis` on `https://orozcorealty.webflow.io`.

## Integration

- The host income snapshot, mortgage bridge, budget snapshot and analysis nonce/revision handshake retain their existing contracts. Only the exact TOR origin is added; existing PCSUnited origins and sender checks remain intact.
- The guidance analysis CTA uses `/financial-analysis`, preserving the opener connection and keeping financial data out of URLs and storage.
- Restore `tor-financial-guidance-head.html` in the guidance page head. No legacy BAH footer script is required for this workflow.
- Use `tor-financial-guidance-budget.html`, `tor-financial-analysis-cta.html` and `tor-financial-navigation.html` in the corresponding guidance embeds.
- The mortgage iframe URL is `https://thewing.netlify.app/Military-Mortgage/?embedded=1&amy=tor`.
- Use `tor-financial-analysis-page.html` in the analysis page embed.
- The existing Ask Amy embed loads `/public/ask-amy/tor-ask-amy.js?v=1.0.2` from TheWing. `amy=tor` explicitly enables calculator context. No AI request is made until the visitor sends a question.
- Military mortgage inputs use the existing `military-mortgage-v1` engine in Amy's truth builder. The older TOR mortgage calculator contract remains supported. Browser result amounts are never authoritative.
- Native menu and footer links on both Webflow pages were changed to real TOR page paths or the existing TheWing calculator paths. Native section labels now follow Income, Mortgage, Budget, Analysis and PCS Support.

## Verification

Run:

```sh
node --test scripts/test-tor-financial-transfer.mjs scripts/test-finance-mortgage-bridge.mjs scripts/test-military-mortgage.mjs scripts/test-financial-analysis.mjs
git diff --check
```

The transfer tests protect exact origins, sender windows, request IDs, monotonic revisions, military Amy recomputation, invalidation and opt-in behavior. Publish the shared app changes and the Webflow pages, then verify direct income and military income, linked mortgage payment, expense edits, the new-tab analysis and updates from its source tab.
