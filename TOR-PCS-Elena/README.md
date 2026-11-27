# TOR PCS Support Elena

Replace only the existing chat embed on TOR `/military/air-force-pcs-support` with `Webflow/TOR-PCS-Elena.html`. The installed dialog, portrait, two-column layout, original CSS, floating launcher and dialog behavior are retained. Page calculators and other embeds are not part of this change.

The original installed embed is preserved as `reference.html` for design comparison. Its old real-estate service is not used in the generated embed. Build with `node scripts/build-tor-pcs-elena.mjs` after building PCSU Resources if that shared client changes.

The build reuses `PCSU-Resources-Elena/panel.js` for input context, history, request validation, server-calculated facts, separate scenarios, official source links and failure handling. TOR calls the same `pcsu-resources-elena` service. Its server-selected identity names Orozco Realty; PCSU's identity is unchanged. No new calculation engine, persistence, account or model setting is introduced.

Five existing sidebar buttons now prepare PCS questions. The welcome message explains input sharing; the expandable chat controls let visitors turn sharing off and start a new chat. Only newly returned answer content and these controls receive extra CSS; the original panel style blocks remain identical.

Validation: `node --test scripts/test-tor-pcs-elena.mjs scripts/test-pcsu-resources-elena.mjs`. Verify Snapshot, base demographics, DLA, MALT, a follow-up, sharing and reset in the staged browser. Compare the surrounding page before publishing.
