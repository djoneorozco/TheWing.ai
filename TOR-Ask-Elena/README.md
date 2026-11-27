# TOR Ask Elena Command Center

This presentation adapts the user's Command Center v5.3 design into a floating panel for TOR's military Financial Guidance page. Only the existing Ask Amy embed is replaced. Page layout, images, calculators and the TOR Financial Analysis handoff stay intact.

Run `node scripts/build-tor-elena-command-center.mjs` to generate `panel.js`, `panel.css` and `Webflow/TOR-Ask-Elena-Command-Center.html`. The generated behavior comes from `PCSU-Ask-Amy/panel.js`; avoid editing the generated client directly. The reference CSS supplies the portrait/sidebar/chat aesthetics; `floating.css` scopes the floating and responsive adaptations plus retained financial facts, sources, sharing and reset controls.

The endpoint remains `/api/pcsu-ask-amy`. Its TOR-origin requests use Elena's name; PCSU uses Amy. Calculators, model, validation, context, bounded conversation history, separate what-if tools, trusted source links and failure handling stay shared. No email verification, stored profiles or legacy Elena backend is used.

All five obsolete reference URLs returned 404. The sidebar instead uses current TOR destinations. Its Financial Analysis button invokes the existing page button so calculator data carries over through the existing in-memory handoff.

Install by replacing the current chat embed's contents with the generated Webflow file. Do not add a second chat or replace the page. Verify only that embed changed before publishing to Webflow staging. Keep the supplied circular Elena portrait; no full-page portrait image is used.
