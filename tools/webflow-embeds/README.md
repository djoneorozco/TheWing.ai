# Webflow Embeds

## PCSUnited Base Essentials Sidebar (Embed 3 of 3)

`pcsu-base-essentials-sidebar.html` is a size-compressed copy of the Base Essentials Sidebar custom code for Webflow’s **50,000-character** custom-code limit.

- **Version:** 2.0.2
- **Size:** ~34,300 characters (under the 50k limit)
- **Behavior:** Same as the expanded source — gate hours from JSON (all supported field shapes), gate phones, visitor-center mismatch protection, housing/services/watchout rendering, map/BasicBrain event wiring, and `window.PCSUBaseEssentialsSidebar` API.

### Paste into Webflow

1. Open the page/component embed that hosts Embed 3.
2. Paste the full contents of `pcsu-base-essentials-sidebar.html`.
3. Confirm Embeds 1–2 and `#pcsu-map-sidebar-slot` are present on the page.

### Requirements

- Embed 1: Interactive Base Map Shell
- Embed 2: Interactive Base Map Engine
- `#pcsu-map-sidebar-slot` inside the map shell
- Netlify endpoint: `/api/base-data?file=<filename>`
