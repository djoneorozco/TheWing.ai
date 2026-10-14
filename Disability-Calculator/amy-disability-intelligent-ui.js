/* TheWing.ai • Amy Intelligent UI • Disability Calculator v1
 * Progressive enhancement of the current Ask Amy interface.
 * NO rating, VA-pay, or bilateral calculations happen in this renderer.
 * Mount once; call renderFromResponse() with the result of /api/ask-amy-disability.
 * Uses existing amy-disability-brief.js + disability-visualization.js.
 */
(function () {
  "use strict";
  if (window.TheWingAmyIntelligentUI) return;

  const VERSION = "amy-disability-intelligent-ui-v1";
  const ID = "thewing-amy-intelligent-ui";
  const CSS_ID = "thewing-amy-intelligent-ui-css-v1";
  const VIEWS = Object.freeze({
    disability_journey: "Overview",
    rating_animation: "Rating steps",
    whole_person: "Whole person",
    final_rounding: "Final rounding",
    compensation: "Compensation",
    dependents: "Dependents",
    scenario_comparison: "What-if comparison",
    regulation_sources: "38 CFR sources"
  });
  const VALID_RATINGS = new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  let host = null;
  let root = null;
  let latest = null;
  let active = null;

  function text(value) { return String(value == null ? "" : value); }
  function escapeHTML(value) {
    return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function validNum(value, min = 0, max = Infinity) {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  }
  function validState(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value)
      && Array.isArray(value.ratingsEntered) && value.ratingsEntered.length <= 20
      && value.ratingsEntered.every(x => VALID_RATINGS.has(x))
      && Array.isArray(value.steps) && value.steps.length <= 20
      && validNum(value.combinedValue, 0, 100)
      && validNum(value.officialRating, 0, 100)
      && validNum(value.remainingEfficiency, 0, 100)
      && value.compensation && value.compensation.ok === true
      && validNum(value.compensation.monthlyVA));
  }
  function validScenario(value) {
    return Boolean(value && value.ok === true && value.kind === "additional_rating_only"
      && VALID_RATINGS.has(value.added_rating)
      && [value.baseline, value.hypothetical].every(item => item
        && validNum(item.combined_value, 0, 100)
        && validNum(item.estimated_rating, 0, 100)
        && validNum(item.monthly_va))
      && validNum(value.monthly_delta, -100000, 100000));
  }
  function percent(value) { return `${Number(value)}%`; }
  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }
  function signedMoney(value) { return `${value >= 0 ? "+" : "−"}${money(Math.abs(value))}`; }
  function wipeExisting() {
    for (const name of ["TheWingDisabilityVisualization", "TheWingAmyDisabilityBrief"]) {
      try { window[name]?.clear?.(); } catch (_) { /* Non-critical older component. */ }
    }
  }

  function ensureStyles() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement("style");
    style.id = CSS_ID;
    style.textContent = `
#${ID},#${ID} *{box-sizing:border-box}
#${ID}{font-family:Barlow,Inter,system-ui,sans-serif;color:#f2f7fc;width:100%;min-width:0}
#${ID}[hidden]{display:none!important}
#${ID} .ami-frame{padding:19px;border-radius:20px;border:1px solid rgba(185,211,233,.24);background:linear-gradient(145deg,#17405c,#092339 76%);box-shadow:0 14px 34px rgba(0,13,26,.16)}
#${ID} .ami-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
#${ID} .ami-eyebrow{margin:0 0 5px;color:#e7c781;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
#${ID} .ami-heading{font-family:'Gilda Display',Georgia,serif;font-size:25px;line-height:1.13;font-weight:400;margin:0}
#${ID} .ami-brand{font-size:12px;font-weight:800;letter-spacing:.08em;color:#f2dcaa;white-space:nowrap}
#${ID} .ami-trust{font-size:11px;line-height:1.5;color:#c3d8e7;margin:7px 0 0}
#${ID} .ami-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:15px 0}
#${ID} .ami-metric{min-width:0;padding:13px;border:1px solid rgba(185,211,233,.18);border-radius:13px;background:rgba(3,28,47,.35)}
#${ID} .ami-label{font-size:10px;line-height:1.3;color:#b9cfde;font-weight:750}
#${ID} .ami-value{font-variant-numeric:tabular-nums;font-size:24px;line-height:1.14;font-weight:850;margin-top:5px;overflow-wrap:anywhere}
#${ID} .ami-value.ami-gold{color:#f1d59b}#${ID} .ami-value.ami-mint{color:#a2e6d8}
#${ID} .ami-tabs{display:flex;flex-wrap:wrap;gap:7px;border-top:1px solid rgba(185,211,233,.15);padding:13px 0 12px}
#${ID} .ami-tab{appearance:none;min-height:40px;padding:9px 13px;border-radius:999px;border:1px solid rgba(185,211,233,.24);background:rgba(5,29,47,.3);font:700 12px Barlow,Inter,system-ui,sans-serif;color:#dceaf5;cursor:pointer}
#${ID} .ami-tab[aria-pressed="true"]{background:#edd49b;color:#11293c;border-color:#edd49b}
#${ID} .ami-tab:focus-visible{outline:3px solid #a2e6d8;outline-offset:2px}
#${ID} .ami-view{min-width:0}#${ID} .ami-view:empty{display:none}
#${ID} .ami-disclaimer{font-size:10px;line-height:1.6;color:#b6cbd9;margin:12px 0 0}
#${ID} .ami-scenario{border:1px solid rgba(185,211,233,.2);border-radius:16px;padding:16px;background:rgba(3,28,47,.34)}
#${ID} .ami-scenario h3,#${ID} .ami-sources h3{margin:0 0 8px;font-size:17px;font-weight:800;color:#f2dcaa}
#${ID} .ami-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
#${ID} .ami-compare-cell{padding:14px;border-radius:12px;background:rgba(24,65,89,.74);border:1px solid rgba(185,211,233,.15);min-width:0}
#${ID} .ami-compare-cell strong{display:block;font-size:25px;margin:4px 0;color:#f7dfad}
#${ID} .ami-track{background:rgba(4,20,31,.8);height:11px;border-radius:99px;overflow:hidden;margin:8px 0}
#${ID} .ami-track span{display:block;height:100%;border-radius:99px;background:#98c9ed}
#${ID} .ami-compare-cell:last-child .ami-track span{background:#a2e6d8}
#${ID} .ami-payrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:12px}
#${ID} .ami-payrow>div{background:rgba(5,27,45,.5);padding:10px;border-radius:10px;min-width:0}
#${ID} .ami-payrow strong{display:block;font-size:14px;color:#f1d59b;overflow-wrap:anywhere;margin-top:4px}
#${ID} .ami-sources{display:grid;gap:9px}
#${ID} .ami-source{padding:13px;border-radius:13px;border:1px solid rgba(185,211,233,.17);background:rgba(4,28,47,.47)}
#${ID} .ami-source p{margin:7px 0;font-size:12px;line-height:1.55;color:#d3e5f0;white-space:pre-line;overflow-wrap:anywhere}
#${ID} .ami-source a{color:#f3dca8;text-decoration:underline;text-underline-offset:3px}
#${ID} .ami-error{font-size:12px;line-height:1.5;color:#c9dfec;padding:15px;border:1px dashed rgba(185,211,233,.3);border-radius:13px}
#${ID} .ami-view .adb-shell,#${ID} .ami-view .dv-shell{box-shadow:none}
@media(max-width:520px){#${ID} .ami-frame{padding:13px}#${ID} .ami-head{display:block}#${ID} .ami-brand{margin-top:9px}#${ID} .ami-metrics{grid-template-columns:1fr 1fr}#${ID} .ami-metric:last-child{grid-column:1/-1}#${ID} .ami-compare-grid{grid-template-columns:1fr}#${ID} .ami-payrow{grid-template-columns:1fr}#${ID} .ami-heading{font-size:22px}}
`;
    document.head.appendChild(style);
  }

  function resolveHost(value) {
    return typeof value === "string" ? document.querySelector(value) : value;
  }
  function mount(container) {
    const node = resolveHost(container);
    if (!(node instanceof Element)) {
      console.warn("Amy Intelligent UI: mount() requires a container element.");
      return null;
    }
    if (host !== node) {
      wipeExisting();
      if (root && root.parentNode) root.remove();
      host = node;
      root = null;
      latest = null;
      active = null;
    }
    ensureStyles();
    if (!root || !root.isConnected) {
      root = document.createElement("section");
      root.id = ID;
      root.hidden = true;
      root.setAttribute("aria-label", "Amy disability intelligent results");
      host.appendChild(root);
      root.addEventListener("click", event => {
        const button = event.target.closest("button[data-ami-view]");
        if (!button || !root.contains(button)) return;
        const name = button.getAttribute("data-ami-view");
        if (latest && latest.views.includes(name)) showView(name);
      });
    }
    return root;
  }

  function sourceItems(reply) {
    if (reply?.regulation?.usable !== true || reply?.regulation?.needs_verification === true
      || reply?.regulation?.truncated === true) return [];
    const excerpts = Array.isArray(reply.source_excerpts) ? reply.source_excerpts : [];
    return excerpts.filter(row => row && row.citation?.verified === true)
      .slice(0, 4);
  }
  function responseState(reply) {
    const ui = reply?.ui;
    if (!reply?.ok || !ui || ui.version !== VERSION) return null;
    const verified = ui.authority === "server_verified_disability_calculator_snapshot"
      && reply.context_used?.calculator_authority === "server_verified_disability_calculator_snapshot"
      && validState(ui.disability);
    const snapshot = verified ? ui.disability : null;
    const widgets = Array.isArray(ui.widgets) ? ui.widgets.filter(x => typeof x === "string" && Object.hasOwn(VIEWS, x)) : [];
    const sources = widgets.includes("regulation_sources") ? sourceItems(reply) : [];
    const scenario = snapshot && validScenario(ui.scenario) ? ui.scenario : null;
    const requested = widgets.find(x => x !== "rating_summary" && x !== "regulation_sources");
    const views = [];
    if (snapshot) {
      if (requested === "scenario_comparison" && scenario) views.push("scenario_comparison");
      else if (requested && Object.hasOwn(VIEWS, requested) && requested !== "scenario_comparison") views.push(requested);
      for (const x of ["disability_journey", "rating_animation", "compensation", "dependents", "final_rounding"]) {
        if (!views.includes(x)) views.push(x);
      }
    }
    if (sources.length) views.push("regulation_sources");
    return views.length ? { snapshot, scenario, sources, views } : null;
  }

  function metricsHTML(d) {
    if (!d) return "";
    return `<div class="ami-metrics" aria-label="Verified calculator results">
      <div class="ami-metric"><div class="ami-label">Combined value</div><div class="ami-value ami-mint">${percent(d.combinedValue)}</div></div>
      <div class="ami-metric"><div class="ami-label">Estimated VA rating</div><div class="ami-value ami-gold">${percent(d.officialRating)}</div></div>
      <div class="ami-metric"><div class="ami-label">Standard monthly estimate</div><div class="ami-value">${escapeHTML(money(d.compensation.monthlyVA))}</div></div>
    </div>`;
  }
  function scenarioHTML(s) {
    return `<section class="ami-scenario" aria-label="Hypothetical additional rating comparison">
      <h3>What if another ${percent(s.added_rating)} rating were added?</h3>
      <div class="ami-trust">Server-calculated educational scenario. Does not change your current calculator inputs.</div>
      <div class="ami-compare-grid">
        <div class="ami-compare-cell"><div class="ami-label">Current estimate</div>
          <strong>${percent(s.baseline.estimated_rating)}</strong>
          <div class="ami-track" role="img" aria-label="Current estimated rating ${percent(s.baseline.estimated_rating)}"><span style="width:${s.baseline.estimated_rating}%"></span></div>
          <div class="ami-label">${percent(s.baseline.combined_value)} before final rounding</div></div>
        <div class="ami-compare-cell"><div class="ami-label">Hypothetical estimate</div>
          <strong>${percent(s.hypothetical.estimated_rating)}</strong>
          <div class="ami-track" role="img" aria-label="Hypothetical estimated rating ${percent(s.hypothetical.estimated_rating)}"><span style="width:${s.hypothetical.estimated_rating}%"></span></div>
          <div class="ami-label">${percent(s.hypothetical.combined_value)} before final rounding</div></div>
      </div>
      <div class="ami-payrow">
        <div><span class="ami-label">Current monthly</span><strong>${escapeHTML(money(s.baseline.monthly_va))}</strong></div>
        <div><span class="ami-label">Hypothetical monthly</span><strong>${escapeHTML(money(s.hypothetical.monthly_va))}</strong></div>
        <div><span class="ami-label">Difference</span><strong>${escapeHTML(signedMoney(s.monthly_delta))}</strong></div>
      </div>
      <p class="ami-disclaimer">${escapeHTML(s.warning || "Educational estimate only; not an official VA decision.")}</p>
    </section>`;
  }
  function sourceHTML(items) {
    const blocks = items.map(row => {
      const cite = row.citation;
      const ref = row.kind === "diagnostic_code" ? `DC ${row.reference}` : `§ ${row.reference}`;
      let officialURL = "";
      try {
        const parsed = new URL(cite.officialUrl || "");
        if (parsed.protocol === "https:" && parsed.hostname === "www.ecfr.gov") officialURL = parsed.href;
      } catch (_) { /* No link if source URL isn't the official domain. */ }
      const link = officialURL ? `<a href="${escapeHTML(officialURL)}" target="_blank" rel="noopener noreferrer">Open official regulation ↗</a>` : "";
      return `<article class="ami-source"><div class="ami-label">38 CFR Part 4 · ${escapeHTML(ref)} · source page ${escapeHTML(row.page)}</div>
        <p>${escapeHTML(text(row.text).slice(0, 600))}${text(row.text).length > 600 ? "…" : ""}</p>${link}</article>`;
    }).join("");
    return `<section class="ami-sources" aria-label="Verified 38 CFR source excerpts"><h3>Verified regulatory passages</h3>${blocks}
      <p class="ami-disclaimer">Source snapshot: October 7, 2026. Excerpts may omit applicable notes; open the regulation for complete context. Regulations do not supply compensation payment rates.</p></section>`;
  }
  function fallbackHTML(data, view) {
    if (view === "rating_animation") {
      return `<div class="ami-error">The animated rating module isn't loaded. Your server-verified combined value is ${percent(data.combinedValue)} and estimated rating is ${percent(data.officialRating)}.</div>`;
    }
    return `<div class="ami-error">The visual brief module isn't loaded. The figures above still come from the server-verified calculator result.</div>`;
  }
  function showView(name) {
    if (!latest || !latest.views.includes(name) || !root) return;
    wipeExisting();
    active = name;
    root.querySelectorAll("button[data-ami-view]").forEach(button => {
      const selected = button.dataset.amiView === name;
      button.setAttribute("aria-pressed", String(selected));
    });
    const area = root.querySelector(".ami-view");
    if (!area) return;
    area.replaceChildren();
    if (name === "regulation_sources") {
      area.innerHTML = sourceHTML(latest.sources);
    } else if (name === "scenario_comparison" && latest.scenario) {
      area.innerHTML = scenarioHTML(latest.scenario);
    } else if (name === "rating_animation") {
      const viz = window.TheWingDisabilityVisualization;
      if (viz?.initialize && viz?.render) {
        viz.initialize(area);
        viz.render(latest.snapshot); // Existing module animates but never computes ratings.
      } else area.innerHTML = fallbackHTML(latest.snapshot, name);
    } else {
      const brief = window.TheWingAmyDisabilityBrief;
      if (brief?.initialize && brief?.render) {
        brief.initialize(area);
        brief.render({ type: name === "disability_journey" ? "explain_estimate" : name,
          disability: latest.snapshot });
      } else area.innerHTML = fallbackHTML(latest.snapshot, name);
    }
  }
  function renderFromResponse(reply) {
    if (!root) {
      console.warn("Amy Intelligent UI: mount() before renderFromResponse().");
      return null;
    }
    wipeExisting();
    const model = responseState(reply);
    if (!model) { clear(); return null; }
    latest = model;
    const tabs = model.views.map((view, index) =>
      `<button type="button" class="ami-tab" data-ami-view="${escapeHTML(view)}" aria-pressed="${index === 0}">${escapeHTML(VIEWS[view])}</button>`).join("");
    root.innerHTML = `<div class="ami-frame"><header class="ami-head"><div>
      <div class="ami-eyebrow">Amy · Intelligent UI</div>
      <h2 class="ami-heading">Disability intelligence</h2>
      <p class="ami-trust">${model.snapshot ? "Verified against TheWing’s server-side calculator engines." : "Source-based regulatory explanation."}</p>
      </div><div class="ami-brand">THEWING.AI</div></header>
      ${metricsHTML(model.snapshot)}
      <nav class="ami-tabs" aria-label="Explore Amy's visual explanations" >${tabs}</nav>
      <div class="ami-view" aria-live="polite"></div>
      <p class="ami-disclaimer">Educational estimates, not an official VA decision. Bilateral factor, SMC, retirement offsets, and retroactive payments are not calculated.</p>
    </div>`;
    root.hidden = false;
    showView(model.views[0]);
    return root;
  }
  function clear() {
    wipeExisting();
    latest = null;
    active = null;
    if (root) { root.replaceChildren(); root.hidden = true; }
  }
  function destroy() {
    clear();
    if (root) root.remove();
    root = null; host = null;
  }
  window.TheWingAmyIntelligentUI = Object.freeze({ version: VERSION, mount,
    renderFromResponse, clear, destroy, getActiveView: () => active });
  window.dispatchEvent(new CustomEvent("thewing:amy-intelligent-ui-ready", { detail: { version: VERSION } }));
})();
