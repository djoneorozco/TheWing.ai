# PCS Snapshot Brief

Compact, public PCSUnited brief at the case-sensitive path `/PCS-Snapshot-Brief/index.html`. The existing `/PCS-Snapshot/` app and all shared APIs are unchanged.

## Install

1. Review and merge this branch, then let Netlify deploy the repository. Production deployment requires human approval under the repository's `AGENTS.md`.
2. Verify `https://thewing.netlify.app/PCS-Snapshot-Brief/index.html` returns the Brief (not Netlify's 404 page).
3. Replace the two Webflow embeds with the **entire** files in `webflow/`: `PCS-Snapshot-input-strip.txt` and `PCSUnited-PCS-Snapshot-Brief-iframe.txt`. Do not leave older copies of their scripts on the page. The card retains the existing cover image, mounting location and layout styles.
4. Publish the Webflow staging page and repeat the acceptance flow below before production publication. A local harness or Netlify preview is not proof of a Webflow publication.

The application has no build step, new dependency, account, persistent browser storage, analytics collector, or database write. Netlify's existing root publish directory exposes the three app files and city JSON.

## Data and calculation contract

- `POST /api/opensource-brain` receives `{tool:"PCS_SNAPSHOT", input:{rank,yos,base,hasDependents}}`. Only its validated compensation is shown: Base Pay + BAH + BAS = total before taxes and deductions. The API's default expense/readiness fields are intentionally not displayed.
- `/netlify/functions/cities/{cityKey}.json` supplies imagery, location, market brief, median price, highlights, dates and bedroom prices. No invented price history, other-base fallback, or average-as-median relabeling. An image failure is disclosed without hiding valid financial data.
- `POST /api/mortgage` uses the existing `mortgage-scenario.js` → `mortgage-engine.js` and official VA fee overlay. The input uses the selected bedroom's **home price**, city interest rate/term/down payment, tax/insurance rates and HOA. Missing required data yields an unavailable state; the client does not use engine fallback assumptions.
- The displayed monthly cost is **`monthly.allIn` directly**: principal & interest + tax + insurance + HOA + PMI. It is checked against its component sum. The city's `mortgage_monthly`/`avg_home_mortgage_monthly` are already estimates with varying inclusions and are never used or added to this total.
- VA planning assumptions are explicit: first use, not fee-exempt, fee financed. Funding fee affects the financed principal and P&I once. No claim of eligibility, underwriting approval or actual fee status is made. Utilities, maintenance and closing costs are excluded and labeled beside the estimate.
- The shared API's budget calculation receives BAH as the comparison amount (`takeHomeMonthly`) and zero **other comparison expenses**. `budget.remainder` is displayed solely as BAH remaining/beyond BAH, never household cash flow. The only frontend arithmetic is chart/coverage percentages and response consistency checks.
- Family size is disclosed: one person = without dependents, two or more = with dependents. Conflicting URL flags are rejected. The dataset currently has no four/five-bedroom values for Fort Sam Houston; those selections remain unavailable.

## Embed contract

The recovered latest embeds use these full names (not the shortened `pcsu` text):

- Parent input event: `pcsu:snapshot-brief-request`, detail `{rank,yos,family,hasDependents,base,cityKey,newZip}`.
- Input edits: `pcsu:snapshot-brief-reset` clears the cover/request state until another Analyze.
- URL: the seven selection fields plus `baseFile`, legacy `newBase/newCityKey/newFileKey/type`, `parentOrigin`, `requestId`. The child uses the selected destination only and rejects mismatched `baseFile`/dependent status.
- Child message: `{source:"pcsu-snapshot-brief",type:"pcsu:brief-status",requestId,state:"ready"|"error",height}`. Responsive heights use `type:"pcsu:brief-resize"`.
- Parent checks exact child origin, `event.source === iframe.contentWindow`, source marker and current request ID. Only a loading request can become ready. Load events never reveal the iframe. A timeout/error invalidates its ID; retry generates a new one.
- Child accepts exact HTTPS origins for `pcsunited.com`, `www.pcsunited.com`, `pcs-united-com.webflow.io`, and its own origin. When present, the referrer must agree. Localhost origins are permitted only when the child is also local. No wildcard `postMessage` target is used. Add any future PCSUnited staging domain explicitly to `validatedParentOrigin` and its tests.
- Analyze is retained in **page memory only** for a late-mounted embed. Input changes clear that pending handoff. Child fetches are aborted and versioned; old bedroom responses cannot replace new selections.

## Verification

Node 22+ (matching repository ESM autodetection):

```sh
node --test scripts/test-pcs-snapshot-brief.mjs scripts/test-finance-utility.mjs
node scripts/test-pcs-snapshot-brief-browser.cjs
BRIEF_LIVE=1 node scripts/test-pcs-snapshot-brief-browser.cjs
BRIEF_DEPLOYED=1 BRIEF_APP_ORIGIN=https://deploy-preview-51--thewing.netlify.app node scripts/test-pcs-snapshot-brief-browser.cjs
```

The browser test needs Playwright available in Node's module path and a Chromium installation. `BRIEF_BROWSER` optionally specifies a browser executable; `BRIEF_OUTPUT` optionally saves screenshots and JSON results. This follows the repository's existing standalone Playwright-test convention and adds no production dependency.

The default browser test serves the actual two embeds and child files across separate HTTPS origins with the real repository API handlers. It tests fresh cover/no requests, E-6/14/family 3/Davis-Monthan, dependent status, destination changes, bedrooms, errors/retries, missing data, delayed stale responses, forged messages, timeout, script initialization order, responsive height, 320/390/768px overflow and absence of storage access/cookies. The live mode serves the same app/embeds locally through browser routing but uses the **deployed** APIs and city files; it does not mean the new app has been deployed. Deployed mode uses the actual deployed child assets, APIs and city JSON with the local parent harness pointing to the specified preview origin; this still does not publish or verify a Webflow page.

After deployment, confirm the exact path/casing, repeat Analyze on Webflow staging, verify the cover is retained until the child is ready, and verify the larger link and bedroom selector at desktop and phone widths.
