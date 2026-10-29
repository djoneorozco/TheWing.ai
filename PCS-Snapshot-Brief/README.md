# PCS Snapshot Brief

Compact, public PCSUnited brief with source files at `/PCS-Snapshot-Brief/index.html`. Netlify redirects this URL to `/pcs-snapshot-brief/`, preserving query parameters. The existing `/PCS-Snapshot/` app and all shared APIs are unchanged.

The default `view=brief` keeps the approved pay header and compensation card, then adds **PCS City Intelligence Brief** and **Housing Affordability Breakdown**. At desktop widths the panels sit side by side; on phones they stack and scroll vertically inside the original fixed-height card. The parent measures the original cover and preserves its outer dimensions after Analyze. The previous pay-only view remains at `view=pay`; the expanding full view remains at `view=full`.

City intelligence adapts the original `PCS-Snapshot/snapshot.js` field mappings: image/location, market headline/summary, population/metro, median household income, annual home-value trend, median home price, traffic and employment. It removes the original sample fallbacks; missing values display Unavailable. Full text, two local highlights, source dates and a dataset link are available through Local details. The original trend chart and living-strategy panel are outside this Brief's scope.

Housing adapts the original cost-list/donut layout with a 2–5 bedroom selector. It uses the shared mortgage and budget engines rather than interpreting the city's combined mortgage estimate as principal and interest. This avoids the original panel's zero-tax/insurance fallbacks and possible cost overlap. The donut segments represent cost components; its center shows BAH coverage. A shortfall reads `$789/month beyond BAH`, not a negative buffer.

The shared header is mounted at `pcsu-bah-header-progression-widget` with the new opt-in `data-transport="manual"`. The Brief waits for its public API, then calls `PCSU_BAH_HEADER.setSnapshot()` with the same validated values shown in the compensation card. Manual mode ignores legacy calculator broadcasts and does not request snapshots from other iframes. The default BAH Calculator transport is unchanged. Styling overrides are scoped to this Brief only. Pay source versions and the family-size assumption remain available through the information button.

The input strip also replaces its four fields with the shared pay header after the parent card accepts a successful Analyze. Hover reveals the existing selections; tap or keyboard activation of the header focuses the first field. Fields remain open while focused or changed, until another Analyze succeeds. Leaving unchanged fields restores the summary without another API request. The original field footprint and disclosed family-size assumption are preserved.

This second header loads the same `BAH-Calculator/bah-header.js` from the configured iframe origin. Its optional script `data-mount-id` creates independent DOM IDs and a `mount.pcsuBahHeader` API, so it can coexist with the original global header. It uses manual transport and the Brief's verified ready payload rather than recalculating pay. A failed header load leaves the fields usable and the completed Brief visible; the next Analyze can retry.

## Install

1. Review and merge this branch, then let Netlify deploy the repository. Production deployment requires human approval under the repository's `AGENTS.md`.
2. Verify `https://thewing.netlify.app/PCS-Snapshot-Brief/index.html` returns the Brief (not Netlify's 404 page).
3. Install the **entire** `webflow/PCSUnited-PCS-Snapshot-Brief-iframe.txt` and `webflow/PCS-Snapshot-input-strip.txt`. If the compact Brief card from the preceding revision is already installed, keep it and replace only the input strip for this interaction update. Deploy the matching child and shared-header assets first. Do not leave older copies of their scripts on the page. The card retains the exact cover image, mounting location and original height.
4. Publish the Webflow staging page and repeat the acceptance flow below before production publication. A local harness or Netlify preview is not proof of a Webflow publication.

The application has no build step, new package dependency, account, persistent browser storage, analytics collector, or database write. Netlify's existing root publish directory exposes the app files, shared header script and city JSON. The copy supplied for immediate Webflow testing points to the PR's Netlify preview; the repository template points to production for use after merge/deployment.

## Data and calculation contract

- `POST /api/opensource-brain` receives `{tool:"PCS_SNAPSHOT", input:{rank,yos,base,hasDependents}}`. Only its validated compensation is shown: Base Pay + BAH + BAS = total before taxes and deductions. The API's default expense/readiness fields are intentionally not displayed.
- In `view=brief` and `view=full`, `/netlify/functions/cities/{cityKey}.json` supplies imagery, location, market brief, median price, highlights, dates and bedroom prices. No invented price history, other-base fallback, or average-as-median relabeling. An image failure is disclosed without hiding valid financial data.
- `POST /api/mortgage` uses the existing `mortgage-scenario.js` → `mortgage-engine.js` and official VA fee overlay. The input uses the selected bedroom's **home price**, city interest rate/term/down payment, tax/insurance rates and HOA. Missing required data yields an unavailable state; the client does not use engine fallback assumptions.
- The shared mortgage total **`monthly.allIn`** contains principal & interest + tax + insurance + HOA + PMI. Compact `view=brief` also supplies the selected bedroom utility estimate to the shared budget engine and displays **`budget.totalOutflow`**. Both totals are checked against their components; utilities are counted once. Legacy `view=full` continues to display `monthly.allIn` and explicitly excludes utilities. The city's `mortgage_monthly`/`avg_home_mortgage_monthly` are already estimates with varying inclusions and are never used or added to this total.
- VA planning assumptions are explicit: first use, not fee-exempt, fee financed. Funding fee affects the financed principal and P&I once. No claim of eligibility, underwriting approval or actual fee status is made. Maintenance and closing costs are excluded and labeled beside the estimate. Compact view includes utilities and discloses their source date in Calculation assumptions.
- The shared API's budget calculation receives BAH as the comparison amount (`takeHomeMonthly`) and the bedroom utility estimate as `otherExpensesMonthly` in compact view (zero in legacy full view). `budget.remainder` is displayed solely as BAH remaining/beyond BAH, never household cash flow. The only frontend arithmetic is chart/coverage percentages and response consistency checks.
- Family size is disclosed: one person = without dependents, two or more = with dependents. Conflicting URL flags are rejected. The dataset currently has no four/five-bedroom values for Fort Sam Houston; those selections remain unavailable.

## Embed contract

The recovered latest embeds use these full names (not the shortened `pcsu` text):

- Parent input event: `pcsu:snapshot-brief-request`, detail `{rank,yos,family,hasDependents,base,cityKey,newZip}`.
- Input edits: `pcsu:snapshot-brief-reset` clears the cover/request state until another Analyze.
- URL: `view=brief`, the seven selection fields plus `baseFile`, legacy `newBase/newCityKey/newFileKey/type`, `parentOrigin`, `requestId`. The child uses the selected destination only and rejects mismatched `baseFile`/dependent status.
- Child message: `{source:"pcsu-snapshot-brief",type:"pcsu:brief-status",requestId,state:"ready"|"error",height}`. Responsive heights use `type:"pcsu:brief-resize"`. The compact-view parent keeps its measured card height and lets the child respond within that space; full view still follows child height.
- Ready messages additionally contain `selection` and `monthly:{basicPay,bah,bas,grossMonthlyComp}`. The input strip checks the origin, iframe window, request ID, current field values, finite amounts and component sum, then waits until the existing card listener has accepted ready. It rechecks these conditions after loading the shared header; a late response or header load cannot replace newer edits. Error and resize messages do not contain pay values.
- Parent checks exact child origin, `event.source === iframe.contentWindow`, source marker and current request ID. Only a loading request can become ready. Load events never reveal the iframe. A timeout/error invalidates its ID; retry generates a new one.
- Child accepts exact HTTPS origins for `pcsunited.com`, `www.pcsunited.com`, `pcs-united-com.webflow.io`, and its own origin. When present, the referrer must agree. Localhost origins are permitted only when the child is also local. No wildcard `postMessage` target is used. Add any future PCSUnited staging domain explicitly to `validatedParentOrigin` and its tests.
- Analyze is retained in **page memory only** for a late-mounted embed. Input changes clear that pending handoff. Child fetches are aborted and versioned; old bedroom responses cannot replace new selections.

## Verification

Node 22+ (matching repository ESM autodetection):

```sh
node --test scripts/test-pcs-snapshot-brief.mjs scripts/test-finance-utility.mjs
node scripts/test-pcs-input-summary-browser.cjs
BRIEF_DEPLOYED=1 BRIEF_APP_ORIGIN=https://deploy-preview-51--thewing.netlify.app node scripts/test-pcs-input-summary-browser.cjs
BRIEF_COMPACT=1 node scripts/test-pcs-snapshot-brief-browser.cjs
BRIEF_COMPACT=1 BRIEF_DEPLOYED=1 BRIEF_APP_ORIGIN=https://deploy-preview-51--thewing.netlify.app node scripts/test-pcs-snapshot-brief-browser.cjs
node scripts/test-pcs-snapshot-pay-browser.cjs
BRIEF_DEPLOYED=1 BRIEF_APP_ORIGIN=https://deploy-preview-51--thewing.netlify.app node scripts/test-pcs-snapshot-pay-browser.cjs
node scripts/test-pcs-snapshot-brief-browser.cjs
BRIEF_LIVE=1 node scripts/test-pcs-snapshot-brief-browser.cjs
BRIEF_DEPLOYED=1 BRIEF_APP_ORIGIN=https://deploy-preview-51--thewing.netlify.app node scripts/test-pcs-snapshot-brief-browser.cjs
```

The browser test needs Playwright available in Node's module path and a Chromium installation. `BRIEF_BROWSER` optionally specifies a browser executable; `BRIEF_OUTPUT` optionally saves screenshots and JSON results. This follows the repository's existing standalone Playwright-test convention and adds no production dependency.

The default browser test serves the actual two embeds and child files across separate HTTPS origins with the real repository API handlers. It tests fresh cover/no requests, E-6/14/family 3/Davis-Monthan, dependent status, destination changes, bedrooms, errors/retries, missing data, delayed stale responses, forged messages, timeout, script initialization order, responsive height, 320/390/768px overflow and absence of storage access/cookies. The live mode serves the same app/embeds locally through browser routing but uses the **deployed** APIs and city files; it does not mean the new app has been deployed. Deployed mode uses the actual deployed child assets, APIs and city JSON with the local parent harness pointing to the specified preview origin; this still does not publish or verify a Webflow page.

The pay browser test also checks the E-7/16/family-4 reference ($8,622.85), identical original/ready card dimensions, shared-header/card consistency, pay-only network requests, accessible source details, mobile layout, header startup order, and compatibility with the original calculator transport. The full browser test opts into `view=full` to retain destination/housing coverage.

Compact browser mode verifies the E-7/16/family-4 Davis-Monthan scenario: pay $8,622.85; mortgage $2,599.26 + utilities $335 = housing $2,934.26; BAH $2,145 leaves $789.26/month beyond BAH (73% coverage). It checks snapshot values, dialogs, unchanged card dimensions, desktop fit, mobile scrolling and bedroom controls, destination changes, API failures/retries and message security. Unit tests reconcile all 174 supported bedroom scenarios including utilities across 44 destinations.

The input-summary browser test checks Analyze-only replacement, identical left/right totals without duplicate API requests, hover/focus/tab behavior, keyboard and touch editing, changed fields, failed requests and retries, forged/stale messages, delayed or failed header loading, independent shared-header instances, mobile overflow and absence of storage/cookies. Its screenshots use a local parent harness, not a published Webflow page.

After deployment, confirm the exact path/redirect and query preservation, repeat Analyze on Webflow staging, verify the cover is retained until the child is ready, and verify the larger link, pay details and original card size at desktop and phone widths.
