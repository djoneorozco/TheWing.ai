/* ============================================================
  TheWing.ai • Base Demographic App
  File: tabs/overview.js
  Version: v1.0.0
  Purpose:
  - Overview tab renderer
  - Member profile + selected base JSON
  - Fit Report lives here
============================================================ */

(() => {
  "use strict";

  window.TheWingBaseDemoTabs = window.TheWingBaseDemoTabs || {};

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function listItems(items) {
    const safe = Array.isArray(items) ? items.filter(Boolean) : [];

    if (!safe.length) {
      return `<li>No overview notes available yet.</li>`;
    }

    return safe.map((item) => `<li>${esc(item)}</li>`).join("");
  }

  function scoreBar(label, value) {
    const n = Number(value);
    const width = Number.isFinite(n) ? Math.max(0, Math.min(n, 100)) : 0;

    return `
      <div class="bd-bar-row">
        <div class="bd-bar-name">${esc(label)}</div>
        <div class="bd-bar-track">
          <div class="bd-bar-fill" style="width:${width}%"></div>
        </div>
        <div class="bd-bar-value">${Number.isFinite(n) ? n : "—"}</div>
      </div>
    `;
  }

  function getProfileDisplay(profile) {
    const rank = profile?.rank || "";
    const lastName = profile?.last_name || "";
    const fullName = profile?.full_name || "Member";

    if (rank && lastName) return `${rank} ${lastName}`;
    return fullName;
  }

  function getFamilyLabel(profile) {
    const family = profile?.family;

    if (family === true || family === "true" || family === "with" || family === "yes") {
      return "With dependents";
    }

    if (family === false || family === "false" || family === "without" || family === "no") {
      return "Without dependents";
    }

    return family || "Not provided";
  }

  window.TheWingBaseDemoTabs.overview = function renderOverview(panel, context) {
    const { profile, city, fit, utils } = context;

    const formatMoney = utils.formatMoney;
    const formatNumber = utils.formatNumber;
    const firstDefined = utils.firstDefined;

    const baseProfile = city?.base_profile || {};
    const marketBluf = city?.market_bluf || {};
    const financialBrief = city?.financial_brief || {};
    const scorecard = city?.scorecard || {};

    const displayName = getProfileDisplay(profile);

    const baseName = firstDefined(
      baseProfile.display_name,
      baseProfile.base_name,
      city?.name,
      city?.city,
      "Selected Base"
    );

    const marketName = firstDefined(
      city?.market_label,
      baseProfile.market_label,
      city?.place_detail,
      "Local Market"
    );

    const safeHousingRatio = Number(city?.rules?.max_safe_housing_ratio || 0.3);
    const income = Number(profile?.monthly_income || 0);
    const estimatedMortgage = Number(city?.avg_home_mortgage_monthly?.avg || 0);
    const estimatedHousingRatio =
      income > 0 && estimatedMortgage > 0
        ? Math.round((estimatedMortgage / income) * 100)
        : null;

    const recommendedLane =
      fit?.score >= 88
        ? "Strong buyer lane"
        : fit?.score >= 75
          ? "Buy with discipline"
          : fit?.score >= 60
            ? "Compare rent vs buy closely"
            : "Slow down and protect cash flow";

    const primaryCta =
      fit?.score >= 75
        ? "Use the Real Estate tab to compare bedroom bands, rent pressure, and monthly ownership costs."
        : "Use the Real Estate tab to stress-test rent, mortgage, taxes, insurance, and commute before choosing a lane.";

    const blufCopy = [
      marketBluf.bluf_summary,
      financialBrief.affordability_summary,
      baseProfile.user_positioning?.military_family_bluf
    ].filter(Boolean).join(" ");

    panel.innerHTML = `
      <div class="bd-section-head">
        <div>
          <div class="bd-section-kicker">Overview</div>
          <h2 class="bd-section-title">Personalized Base Fit Report</h2>
          <p class="bd-section-subtitle">
            Welcome ${esc(displayName)}. This member view blends your saved profile with the selected base market file so you can quickly see whether this location fits your PCS, housing, and family strategy.
          </p>
        </div>

        <span class="bd-pill bd-pill-mint">${esc(fit?.verdict || "Member Fit")}</span>
      </div>

      <div class="bd-fit-report">
        <article class="bd-card bd-fit-score">
          <div class="bd-score-ring">
            <div>
              <div class="bd-score-number">${esc(fit?.score ?? "—")}</div>
              <div class="bd-score-label">Fit Score</div>
            </div>
          </div>

          <h3 class="bd-fit-title">${esc(recommendedLane)}</h3>
          <p class="bd-fit-copy">
            ${esc(primaryCta)}
          </p>
        </article>

        <div class="bd-stack">
          <article class="bd-card">
            <h3 class="bd-card-title">Member BLUF</h3>
            <p class="bd-card-copy">
              ${esc(blufCopy || "This base is ready for personalized housing and PCS analysis once more profile data is available.")}
            </p>
          </article>

          <div class="bd-decision-grid">
            <article class="bd-decision-card">
              <span>Base</span>
              <strong>${esc(baseName)}</strong>
              <p>${esc(marketName)}</p>
            </article>

            <article class="bd-decision-card">
              <span>Housing Lane</span>
              <strong>${esc(recommendedLane)}</strong>
              <p>Based on market score, estimated housing cost, saved income, and BAH context.</p>
            </article>

            <article class="bd-decision-card">
              <span>Cash Flow Check</span>
              <strong>${estimatedHousingRatio ? `${estimatedHousingRatio}% housing ratio` : "Needs income data"}</strong>
              <p>Target safe housing ratio: ${Math.round(safeHousingRatio * 100)}% or less.</p>
            </article>
          </div>
        </div>
      </div>

      <div class="bd-grid-4" style="margin-top:16px;">
        <article class="bd-stat">
          <div class="bd-stat-label">Median Home Price</div>
          <div class="bd-stat-value">${formatMoney(city?.metrics?.median_sale_price || city?.avg_home_value)}</div>
          <div class="bd-stat-hint">Current selected market baseline.</div>
        </article>

        <article class="bd-stat">
          <div class="bd-stat-label">Median Rent</div>
          <div class="bd-stat-value">${formatMoney(city?.metrics?.median_rent || city?.rental_metrics?.median_rent)}</div>
          <div class="bd-stat-hint">Useful rent-vs-buy comparison anchor.</div>
        </article>

        <article class="bd-stat">
          <div class="bd-stat-label">Estimated Mortgage</div>
          <div class="bd-stat-value">${formatMoney(city?.avg_home_mortgage_monthly?.avg)}</div>
          <div class="bd-stat-hint">All-in local ownership estimate from base file.</div>
        </article>

        <article class="bd-stat">
          <div class="bd-stat-label">Days on Market</div>
          <div class="bd-stat-value">${city?.metrics?.days_on_market ? `${formatNumber(city.metrics.days_on_market)} days` : "—"}</div>
          <div class="bd-stat-hint">Market pace and buyer leverage signal.</div>
        </article>
      </div>

      <div class="bd-split" style="margin-top:16px;">
        <article class="bd-card">
          <h3 class="bd-card-title">Market Scorecard</h3>

          <div class="bd-bar-list">
            ${scoreBar("Affordability", scorecard.affordability_score)}
            ${scoreBar("Growth", scorecard.growth_score)}
            ${scoreBar("Stability", scorecard.stability_score)}
            ${scoreBar("Military Fit", scorecard.military_fit_score)}
            ${scoreBar("Overall", scorecard.overall_score)}
          </div>
        </article>

        <article class="bd-card">
          <h3 class="bd-card-title">Your Saved Profile</h3>

          <div class="bd-row-list">
            <div class="bd-row">
              <div class="bd-row-label">Rank / YOS</div>
              <div class="bd-row-copy">Used for military pay and BAH context.</div>
              <div class="bd-row-value">${esc(profile?.rank || "—")}${profile?.yos ? ` / ${esc(profile.yos)}` : ""}</div>
            </div>

            <div class="bd-row">
              <div class="bd-row-label">Dependents</div>
              <div class="bd-row-copy">Used to determine with/without dependent planning.</div>
              <div class="bd-row-value">${esc(getFamilyLabel(profile))}</div>
            </div>

            <div class="bd-row">
              <div class="bd-row-label">BAH</div>
              <div class="bd-row-copy">Compared against rent and ownership pressure.</div>
              <div class="bd-row-value">${formatMoney(profile?.bah)}</div>
            </div>

            <div class="bd-row">
              <div class="bd-row-label">Target Price</div>
              <div class="bd-row-copy">Compared against local home price bands.</div>
              <div class="bd-row-value">${formatMoney(profile?.projected_home_price)}</div>
            </div>
          </div>
        </article>
      </div>

      <div class="bd-grid-2" style="margin-top:16px;">
        <article class="bd-card">
          <h3 class="bd-card-title">Why This Base Matters</h3>
          <p class="bd-card-copy">
            ${esc(baseProfile.base_bluf || city?.profile || "Base-specific PCS guidance will appear here once loaded from the selected city JSON.")}
          </p>
        </article>

        <article class="bd-card">
          <h3 class="bd-card-title">Quick Takeaways</h3>
          <ul class="bd-list">
            ${listItems(city?.summary_points)}
          </ul>
        </article>
      </div>
    `;
  };
})();
