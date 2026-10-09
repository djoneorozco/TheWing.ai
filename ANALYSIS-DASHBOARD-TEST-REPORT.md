# PCSUnited Analysis Dashboard Test Report

## 1. Executive Summary

**PASS WITH MINOR FIXES — Functional after listed fixes**

The Home Buying Financial Analysis Dashboard under `PCSUnited-Analysis/analysis/` loads, initializes, exposes `window.PCSUnitedAnalysis`, renders demo data, calculates core affordability metrics correctly, and responds to UI interactions (cash-flow period, scenarios, Amy, report modal, save). Three confirmed issues were fixed: `updateSources` alias merging for `profile`/`income`, missing hero status CSS for caution/danger, and cash-flow select labeling. The reserve `Math.max(computedReserves, emergencyFund, 0)` behavior was reviewed and intentionally left unchanged because product intent is ambiguous; it can overstate post-closing liquidity when available cash is below closing costs.

## 2. Files Reviewed

- `PCSUnited-Analysis/analysis/index.html`
- `PCSUnited-Analysis/analysis/style.css`
- `PCSUnited-Analysis/analysis/app.js`
- `PCSUnited-Analysis/index.html` (parent sibling, comparison only)
- `PCSUnited-Analysis/style.css` (parent sibling, comparison only)
- `PCSUnited-Analysis/app.js` (parent sibling, comparison only)
- `PCSUnited-Financial/` and `Finance-UX/` (integration context only; Budget Builder treated as complete)

Primary test target: `PCSUnited-Analysis/analysis/` (maps to the requested `/analysis/` dashboard).

## 3. Test Environment

- Local server command: `python3 -m http.server 8000` from `/workspace/PCSUnited-Analysis`
- Browser automation: Playwright Core + Google Chrome headless (`/usr/local/bin/google-chrome`)
- Tested URL: `http://127.0.0.1:8000/analysis/`
- Viewport sizes tested: `1600`, `1400`, `1180`, `900`, `600`, `390`
- Static checks: `node --check`, HTML ID/CSS variable audits via Python

## 4. Initial Problems Found

| Severity | File | Location | Problem | User Impact |
| --- | --- | --- | --- | --- |
| High | `analysis/app.js` | `updateSources()` | `basicBrain: updates.basicBrain \|\| updates.profile \|\| updates.income` returned only the first truthy object, so supplying both `profile` and `income` dropped income | Controlled integrations and ChatGPT-style `updateSources({ profile, income, ... })` calls produced wrong take-home/gross values and wrong affordability |
| Medium | `analysis/style.css` | `.hero-status--*` | JS applies `hero-status--caution` / `hero-status--danger`, but CSS only styled healthy/strong/good | Risk/caution pills looked unstyled / same as default text |
| Medium | `analysis/app.js` | `calculateAnalysis()` reserves | `Math.max(computedReserves, emergencyFund, 0)` can report emergency-fund balance as “reserves after closing” even when cash after closing is negative | Can overstate post-closing liquidity in stressed cash scenarios |
| Low | `analysis/index.html` | cash-flow period control | `sr-only` text was a `<span>`, not a `<label for="cashFlowPeriod">` | Weaker accessible name association for the select |
| Low | External CDN | Lucide / Unsplash | Runtime depends on third-party CDN/image hosts | Offline or blocked CDN can degrade icons/images (app still initializes) |

## 5. Fixes Made

| File | Change | Reason |
| --- | --- | --- |
| `analysis/app.js` | `updateSources()` now `mergeObjects()` for `basicBrain` (`basicBrain` + `profile` + `income`), `financial` (`budget` + `financial`), and `selectedHome` (`home` + `selectedHome`) | Confirmed integration bug; profile and income must coexist |
| `analysis/style.css` | Added `.hero-status--caution`, `--warning`, `--danger`, `--weak` | Match JS `setStatusClass(..., "hero-status", status)` outputs |
| `analysis/index.html` | Replaced orphan `sr-only` span with `<label for="cashFlowPeriod">` and added `aria-label` | Accessibility association for the period select |

Intentionally not changed: reserve `Math.max(...)` logic (see section 10).

## 6. HTML ↔ JavaScript Wiring Audit

- Number of IDs referenced by JavaScript (`cacheDOM` list): **100**
- Missing IDs: **none**
- Duplicate IDs in HTML: **none** (113 unique `id` attributes)
- Unused important IDs: heading/label IDs used only for `aria-labelledby` / static copy (`selectedHomeHeading`, `affordabilityHeroTitle`, `amyPanelTitle`, `analysisReportModalTitle`, etc.) — expected
- Selector mismatches: **none** for payment-donut segments, `[data-analysis-step]`, Amy/report controls
- Script/stylesheet paths: `./style.css`, `./app.js` — correct for `/analysis/`
- Final result: **PASS**

## 7. HTML ↔ CSS Wiring Audit

- Class mismatches: none for Amy panel, report modal, scenarios, gauge, waterfall
- Undefined CSS variables: **none**
- Malformed CSS: no broken rules; clear SECTION 1/2 join comments only
- Responsive issues: no horizontal overflow at tested widths; fixed footer has app bottom padding (`116px` at 390px)
- `[hidden]` uses `display: none !important` and correctly hides Amy backdrop / report modal
- Remaining pre-fix gap: missing caution/danger hero status styles — **fixed**
- Final result: **PASS after CSS fix**

## 8. Console and Runtime Results

### Before fixes
- Page JS errors: none
- `window.PCSUnitedAnalysis` existed with full API
- Demo mode initialized (`usingDemoData: true`)
- Occasional filtered CDN noise possible for Lucide/Unsplash; one transient 404 observed in an early run was not reproducible
- Functional false negative on Amy close when tests inspected `#amyPanel.hidden` instead of `#amyPanelBackdrop.hidden`

### After fixes
- Console/page errors: **none** in retest
- Failed app-critical network requests: **none**
- `window.PCSUnitedAnalysis` exists
- Methods: `version`, `getState`, `getAnalysis`, `getSources`, `refresh`, `updateSources`, `save`, `openAmy`, `closeAmy`, `openReport`, `closeReport`
- `getAnalysis()` / `getState()` return valid objects

## 9. Functional Test Results

| Feature | Result | Notes |
| --- | --- | --- |
| Dashboard load | PASS | HTML/CSS/JS 200 |
| Demo fallback render | PASS | Payment `$2,580`, verdict YES |
| Public API | PASS | All expected methods present |
| Header home values | PASS | Price/beds/baths/location render |
| User greeting/rank/base | PASS | Demo John / E-7 / Lackland |
| Logo link | PASS | `href="../"` |
| Affordability hero | PASS | YES / payment / ratio / cash / DP / closing / score |
| Status pills | PASS after fix | Danger/caution classes now styled |
| Payment breakdown | PASS | Components + ~100% segments |
| Donut segments | PASS | Updated via analysis render |
| Interest rate / program | PASS | Demo 6.375% / VA Loan |
| Cash flow monthly/annual | PASS | Annual = monthly × 12; restore works |
| Waterfall + connector | PASS | Path present after resize |
| Debt summary | PASS | Monthly debt + DTI + funding fee/exempt |
| View Debt Details | PASS | Opens Amy with debt content |
| Upfront costs | PASS | DP + closing + prepaids = total due |
| Reserves card | PASS | Renders; see calculation caveat |
| Affordability sidebar/gauge | PASS | Percentage + needle transform present |
| Price scenarios | PASS | Lower/selected/higher order and payments |
| Scenario toggle | PASS | Expand/collapse works |
| Key takeaways | PASS | All four populate |
| Full report modal | PASS | Open, populate, close button, Escape |
| Ask Amy panel | PASS | Open, close button, backdrop, Escape, scroll restore |
| Amy Q&A keywords | PASS | afford/payment/closing/reserve/debt/cheaper |
| Save & Continue | PASS | session+local `pcsunited.analysis.v1`, event fired, temporary `Saved` label |

## 10. Calculation Validation

Demo inputs used for independent checks:

- PI `1910` + taxes `380` + insurance `150` + HOA `100` + PMI `40`
- Take-home `7910`, gross `10000`
- Expenses `1890`, debt `450`, savings `1270`
- DP `47500`, closing `14250`, prepaids `3100`
- Available cash `83600`, emergency fund `18750`

| Calculation | Expected | Actual | Result |
| --- | --- | --- | --- |
| Total monthly housing payment | `2580` | `2580` | PASS |
| Housing ratio | `2580 / 7910 ≈ 0.3262` | `0.326169...` | PASS |
| Gross housing ratio | `0.258` | `0.258` | PASS |
| DTI | `(2580 + 450) / 10000 = 0.303` | `0.303` | PASS |
| Monthly cash remaining | `1720` | `1720` | PASS |
| Total due at closing | `64850` | `64850` | PASS |
| Reserves after closing (as coded) | `max(18750, 18750, 0) = 18750` | `18750` | PASS (matches code) |
| Reserve months | `18750 / 4920 ≈ 3.811` | `3.81097...` | PASS |
| Payment % sum | `1.0` | `1.0` | PASS |
| Affordability score bounds | components and score in 0–100 | score `90` | PASS |
| Strong verdict path | YES / strong | YES / strong | PASS |
| Danger verdict path | NO / danger | NO / danger | PASS |
| Scenario payments order | lower < selected < higher | true | PASS |

### Reserve calculation logic

Current code:

```js
const computedReserves = financial.availableCash - totalDueAtClosing;
const reservesAfterClosing = Math.max(computedReserves, financial.emergencyFund, 0);
```

- When cash covers closing, demo values make `computedReserves == emergencyFund`, so the issue is hidden.
- Edge case (available cash `$5,000`, total due ~`$14,600`, emergency fund `$12,000`): `computedReserves = -9600` but UI reserves become `$12,000`.
- That is **not** true cash left after closing; it floors to emergency-fund size.
- Parent `PCSUnited-Analysis/app.js` uses plain subtraction.
- **Not changed**: unclear whether product intent is “never show reserves below emergency fund” vs “cash after closing.” Needs product confirmation before altering math.

### `updateSources` alias-merging logic

- Before: `profile || income` prevented simultaneous updates.
- After: merges `basicBrain`, `profile`, and `income`; also merges `budget`/`financial` and `home`/`selectedHome`.
- Retest: `monthlyGross=8500`, `monthlyTakeHome=6800`, `firstName=Test` all applied together.

### Affordability score

Weighted: housing 30%, DTI 20%, cash flow 20%, reserves 18%, closing readiness 12%. Components clamped 0–100; final score clamped/rounded. Demo score `90` with YES/strong.

### Verdict thresholds

Critical failure when cash left `< 0`, DTI `> 0.50`, housing `> 0.46`, or closing gap `< 0`. Strong / healthy / caution / danger branches exercised successfully.

## 11. Data Integration Results

| Source path | Result |
| --- | --- |
| Demo fallback | PASS when no globals/storage |
| Window globals (`PCSUnitedBasicBrain`, `Mortgage`, `Financial`, `SelectedHome`) | PASS via `refresh()` |
| sessionStorage | PASS; merged below globals |
| localStorage | PASS; lowest precedence among the three |
| `updateSources()` | PASS after merge fix |
| Event-based refresh | Wired (`pcsunited:*-updated`, `pcsu:analysis-refresh`) |
| Source precedence | Confirmed: `mergeObjects(local, session, global)` ⇒ **globals > sessionStorage > localStorage** |

Budget Builder integration expectation: analysis reads `window.PCSUnitedFinancial` / storage keys such as `pcsunited.financial.v1` and `pcsunited.budget.v1`. No live cross-page handoff was available in this isolated server run; API contracts and key names are compatible with the documented sources.

## 12. Responsive Test Results

| Viewport | Result | Problems |
| --- | --- | --- |
| 1600px | PASS | None |
| 1400px | PASS | None |
| 1180px | PASS | None |
| 900px | PASS | None |
| 600px | PASS | No horizontal overflow; fixed footer padded |
| 390px | PASS | No horizontal overflow; Amy/report usable; footer padding present |

## 13. Accessibility Results

Passed:
- Dialog roles/`aria-modal` on Amy and report
- Dialog titles via `aria-labelledby`
- Escape closes open dialogs
- Focus moves to Amy input on open
- Hidden backdrop/modal not interactable while `hidden`
- Images have alt text
- Ask Amy button accessible name
- Status uses text labels plus color
- Reduced-motion media query present in CSS
- Cash-flow select now has associated label + `aria-label` (fixed)

Remaining / optional:
- Focus trap inside dialogs is not a full WCAG dialog pattern
- Some decorative Lucide icons depend on CDN
- Print stylesheet quality not exhaustively print-previewed beyond CSS presence

## 14. Remaining Risks or Limitations

### Confirmed bugs
- None outstanding after the three fixes, aside from the intentional reserve-math product question.

### Integration dependencies
- Real BasicBrain / Mortgage / Financial / Selected Home objects are not packaged with this folder; demo mode fills gaps.
- Nested `PCSUnited-Analysis/analysis/` is newer/richer than parent `PCSUnited-Analysis/*`; deploy path must serve the nested folder if that is the intended production URL.

### Optional improvements
- Clarify and possibly revise reserve formula.
- Full focus-trap / restore-focus for dialogs.
- Align parent root dashboard with nested analysis implementation if both remain published.

### External resource risks
- Lucide CDN (`unpkg.com`)
- Unsplash demo/avatar/home images

## 15. Final Verdict

The dashboard **works now** for standalone demo use and for controlled `updateSources` / global-source integrations after the listed fixes.

**Confidence: 88%**

Remaining uncertainty is mainly around product intent for reserves and live multi-app storage handoff in a full PCSUnited host page.

## 16. Exact Changes for ChatGPT Review

### Files changed
1. `PCSUnited-Analysis/analysis/app.js`
2. `PCSUnited-Analysis/analysis/style.css`
3. `PCSUnited-Analysis/analysis/index.html`
4. `ANALYSIS-DASHBOARD-TEST-REPORT.md` (this report)

### Functions changed
- `updateSources()` in `analysis/app.js`

### IDs / selectors changed
- HTML: `cashFlowPeriod` now has `<label for="cashFlowPeriod">` and `aria-label="Cash-flow period"`
- CSS selectors added: `.hero-status--caution`, `.hero-status--warning`, `.hero-status--danger`, `.hero-status--weak`

### Important before/after snippets

**Before (`updateSources`):**
```js
basicBrain:
  updates.basicBrain ||
  updates.profile ||
  updates.income ||
  {},
financial:
  updates.financial ||
  updates.budget ||
  {},
selectedHome:
  updates.selectedHome ||
  updates.home ||
  {}
```

**After:**
```js
basicBrain: mergeObjects(
  updates.basicBrain || {},
  updates.profile || {},
  updates.income || {}
),
financial: mergeObjects(
  updates.budget || {},
  updates.financial || {}
),
selectedHome: mergeObjects(
  updates.home || {},
  updates.selectedHome || {}
)
```

### Intentionally not fixed
- `Math.max(computedReserves, financial.emergencyFund, 0)` reserve floor — mathematically overstates post-closing cash when closing costs exceed available cash; left unchanged pending product clarification because surrounding comments/docs do not prove the intended meaning, and changing it would alter demo/affordability outcomes.
