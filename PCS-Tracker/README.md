# PCSUnited PCS Tracker

A public, no-account move planner for the PCS Planning page. Matches the approved charcoal, warm ivory, and muted gold concept. It connects 12 editable sample tasks, four explicit move milestones, a chronological timeline, and a monthly calendar. “Why this matters” explanations and official-resource links keep the experience educational.

## Run and publish

No build, package installation, API key, Python server, database, or sign-in is required. Serve this repository over HTTP, for example from its root:

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765/PCS-Tracker/`. ES modules require an HTTP server; do not open `index.html` as a `file:` URL.

The existing root `netlify.toml` publishes `.`. These files are served unchanged at `/PCS-Tracker/` when that repository revision is deployed. There are no new functions, redirects, dependencies, or changes to existing calculators. A GitHub commit does not prove that Netlify deployed it; verify the connected deployment separately.

## Webflow installation

See [webflow/INSTALL.md](webflow/INSTALL.md) and [webflow/embed.html](webflow/embed.html). The iframe preserves Webflow styles and existing sections. Installation and Webflow publication are separate from publishing source code to GitHub.

## Behavior

- Starts with 12 unchecked sample tasks and unknown dates. No deadlines or entitlements are generated.
- Task edits, review flags, questions, and dates feed every view from one in-memory plan.
- Four move milestone types are explicit; task titles are never used to infer a report date or shipment authorization.
- Dates are calendar dates, not time-zone-dependent timestamps or authorized travel days.
- The example is labeled throughout, including downloads. Loading it, importing, or resetting requires an explicit replacement step.
- Download a text summary or versioned JSON plan. Import JSON to continue on another device; validation occurs before replacement. Maximum 200 tasks and 500 KB per imported file.
- Print or save a PDF through the browser print dialog. This is not the original server-side ReportLab exporter.
- Save on this device is **off by default**. This user-approved optional device copy is a non-authoritative planning worksheet, not a canonical military/financial profile. Turning saving off removes the stored copy. Reset removes only this planner's key. Third-party iframe storage may be blocked or partitioned; downloads remain available. No cross-device cloud sync is implied.
- No plan information, notes, or identifiers are sent to a server, Google Calendar, analytics, or the parent page. The iframe bridge exchanges only height and viewport layout information with the verified frame/parent origin.
- The app fetches its own HTML, CSS, and JavaScript from hosting. External official links open only when the user follows them.

## Boundaries and original ZIP

This is a focused browser-based adaptation of the ZIP's task/timeline/calendar concepts for the approved public design, not a copy of its React/Python private application. The calendar and timeline now share explicit dates and tasks. The original app's auth, shared database, document vault, flight API, housing calculations, Google integration, and admin features are deliberately outside this release.

Do not add the ZIP's `Lib/`, `Scripts/`, Windows executables, runtime database/documents/uploads, secrets, or `.env` files. No original stored PDF is included.

There are no BAH/OHA/pay tables or benefit calculations here. Existing TheWing APIs, events, and authoritative engines remain unchanged. The 12 sample tasks are prompts for preparation, not a complete Air Force requirements checklist. Official links provide references; the responsible offices confirm current requirements.

## Source map

- `index.html`, `style.css`: responsive planner shell and approved visual direction.
- `js/data.mjs`: sample tasks and educational reference text.
- `js/model.mjs`: date-only helpers, calendar layout, validated plan schema, export text.
- `js/app.mjs`: interactive views, dialogs, optional device saving, import/export, iframe resizing.
- `embed.js`: origin/source-checked Webflow iframe loader.
- `tests/model.test.mjs`: data integrity, date boundaries, shared events, imports, and calendar regressions.

## Verify

```sh
cd PCS-Tracker
npm test
npm run check
```

Browser acceptance checks: edit a task and confirm it appears on its calendar date; reject arrival before departure; reload with saving off/on; turn saving off; load the labeled example; export and re-import JSON; test keyboard tabs/dialogs/calendar arrows; check a 390 px phone view and the iframe resize bridge. See `webflow/qa.html` for a local embedding harness.
