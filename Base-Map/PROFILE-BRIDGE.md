# PCSUnited profile selection bridge

The embedded map accepts `pcsunited:base-map-select` only from its parent on
`https://pcs-united-com.webflow.io`. A localhost parent is accepted only when it
matches the document referrer. The payload must contain `source:
"pcsu-shared-profile"`, `fileName` (a registry JSON filename or null), and a
string `requestId` of at most 100 characters.

The map resolves the filename against its existing registry. A matching base
uses the normal map selection and existing outward selection event. An empty
or unsupported filename clears the previous base to prevent stale display.
Requests received before map readiness are applied after its ready event.
Repeating the same base does not render it again.

The parent receives `pcsunited:profile-selection-applied`, with the request ID,
selected filename and `selected`, `cleared`, or `unsupported` status. The
existing map selection contract remains unchanged. Neither side persists the
shared profile in browser storage.

Validation: `node scripts/test-base-map-profile-bridge.cjs` covers origin and
source checks, malformed filenames, unknown/empty bases, readiness, and
idempotence. Test the full Webflow page for the two-way selection flow.
