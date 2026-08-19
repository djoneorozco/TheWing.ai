# PCSUnited Webflow Embeds — Scroll Fix (v6.1.6 + v3.0.7)

## Root cause

The unwanted page jump when changing **Gaining Base** in BasicBrain was caused by **Base Demographics v3.0.5**, not BasicBrain itself.

### Chain of failure (v3.0.5)

1. BasicBrain emits passive events when Gaining Base changes:
   - `pcsunited:basicbrain-updated`
   - `pcsunited:profile-ready`
   - `pcsunited:bridge-ready`
   - `pcsunited:compensation-ready`
   - `postMessage` with `type: "pcsunited-basicbrain"`

2. Base Map `bindBasicBrainEvents()` listened to **all** of those and called `preselectFromBasicBrain()`.

3. `preselectFromBasicBrain()` called `renderState(state, baseId)`.

4. `renderState()` ended with:
   ```javascript
   selectedButton.scrollIntoView({ block: "nearest", behavior: "smooth" });
   ```
   That scrolled the **page** down to the Base Demographics embed whenever BasicBrain updated.

5. On load, `preselectFromGlobals()` also hydrated from `window.PCSU_BASICBRAIN_CURRENT` / localStorage, causing the same behavior.

## Fix summary

| Area | v3.0.5 behavior | v3.0.7 / v6.1.6 behavior |
|------|-----------------|---------------------------|
| Passive BasicBrain events | Base Map reacts | **Ignored** |
| `pcsu:base-selected` | Always reacts | Only when `autoNavigate === true` |
| Mount on load | Preselects from globals | Default TX state only |
| `scrollIntoView` | Always on preselect | Only on intentional Amy click path |
| Mount guards | `__mounted_v305` | `PCSU_US_BASE_MAP_V307_MOUNTED` / `PCSU_BASICBRAIN_V615_MOUNTED` |

## Webflow deployment

Replace your two embed code blocks:

1. **BasicBrain + Amy** — use `basicbrain-amy-shell.html` + `basicbrain-amy.js` (or paste JS below shell in Webflow).
2. **U.S. Base Map** — use `us-base-map.js` (single combined embed).

**Remove** any older v3.0.5 / v6.1.4 / v6.1.5 embed copies on the same page. Duplicate scripts will re-register listeners.

## Scroll debugging

Enable temporary logging:

```javascript
window.PCSU_SCROLL_DEBUG = true;
```

Or add `?pcsuScrollDebug=1` to the page URL.

Console tags:

- `[PCSU Scroll Debug · BasicBrain]` — before/after Gaining Base changes and event dispatch
- `[PCSU Scroll Debug · Base Map]` — renderState and ignored passive events

## Acceptance test

1. Load page at BasicBrain section.
2. Select Rank, YOS, Dependents, Gaining Base.
3. Page must not move.
4. Amy Guidance should update when compensation is ready.
5. Click Amy **1. Base Demo** — only then should Base Map preselect and scroll into view.
