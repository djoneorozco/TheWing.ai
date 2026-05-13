(() => {
  "use strict";

  if (window.OROZCO_CITY_OVERVIEW_SINGLE?.__mounted) return;
  window.OROZCO_CITY_OVERVIEW_SINGLE = { __mounted: true };

  const root = document.getElementById("or-city-overview");
  if (!root) return;

  let CITY = null;
  let ACTIVE_BED = "3";

  const $ = (sel, node = root) => node.querySelector(sel);
  const $$ = (sel, node = root) => Array.from(node.querySelectorAll(sel));

  function getCityJsonUrl(){
    return (
      window.PCSU_SELECTED_CITY_JSON_URL ||
      window.OROZCO_CITY_JSON_URL ||
      "https://raw.githubusercontent.com/djoneorozco/PCSUnited/main/netlify/functions/cities/Lackland.json"
    );
  }

  function hydrateSelectedBaseFromStorage(){
    try{
      const raw = localStorage.getItem("pcsunited.selectedBase.v1");
      if (!raw) return;
      const selected = JSON.parse(raw);
      if (selected?.jsonUrl){
        window.PCSU_SELECTED_CITY_JSON_URL = selected.jsonUrl;
        window.OROZCO_CITY_JSON_URL = selected.jsonUrl;
      }
    }catch(err){
      console.warn("Could not hydrate selected base from storage:", err);
    }
  }

  function fmtMoney(v){
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(n);
  }

  function fmtNum(v){
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-US").format(n);
  }

  function fmtPct(v, digits = 1){
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(digits)}%`;
  }

  function fmtPctFromDecimal(v, digits = 2){
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${(n * 100).toFixed(digits)}%`;
  }

  function arr(v){
    return Array.isArray(v) ? v : [];
  }

  function esc(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function firstDefined(...vals){
    for (const v of vals){
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  }

  function flattenTextList(input){
    if (!input) return [];
    if (Array.isArray(input)) return input.flatMap(flattenTextList).filter(Boolean);
    if (typeof input === "string") return input.trim() ? [input.trim()] : [];
    if (typeof input === "object") return Object.values(input).flatMap(flattenTextList).filter(Boolean);
    return [];
  }

  function setText(sel, value){
    const el = $(sel);
    if (el) el.textContent = value ?? "—";
  }

  function setHtml(sel, html){
    const el = $(sel);
    if (el) el.innerHTML = html || "";
  }

  function renderList(sel, items){
    const el = $(sel);
    if (!el) return;
    const safe = arr(items).filter(Boolean);
    el.innerHTML = safe.length
      ? safe.map(item => `<li>${esc(item)}</li>`).join("")
      : `<li>No data available yet.</li>`;
  }

  function renderScoreBars(scorecard = {}){
    const rows = [
      ["Affordability", scorecard.affordability_score],
      ["Growth", scorecard.growth_score],
      ["Stability", scorecard.stability_score],
      ["Military Fit", scorecard.military_fit_score],
      ["Overall", scorecard.overall_score]
    ];

    return rows.map(([label, value]) => {
      const n = Number(value);
      const width = Number.isFinite(n) ? Math.max(0, Math.min(n, 100)) : 0;
      return `
        <div class="or-bar-row">
          <div class="or-bar-name">${esc(label)}</div>
          <div class="or-bar-track">
            <div class="or-bar-fill" style="width:${width}%"></div>
          </div>
          <div class="or-bar-val">${Number.isFinite(n) ? n : "—"}</div>
        </div>
      `;
    }).join("");
  }

  function miniBar(label, value, max, displayText){
    const n = Number(value);
    const width = Number.isFinite(n) && max > 0
      ? Math.max(0, Math.min((n / max) * 100, 100))
      : 0;

    return `
      <div class="or-mini-row">
        <span>${esc(label)}</span>
        <div class="or-mini-track">
          <div class="or-mini-fill" style="width:${width}%"></div>
        </div>
        <strong>${esc(displayText)}</strong>
      </div>
    `;
  }

  function showError(message){
    const box = $("#orCityError");
    if (!box) return;
    box.textContent = message;
    box.classList.add("is-show");
  }

  function hideError(){
    const box = $("#orCityError");
    if (!box) return;
    box.textContent = "";
    box.classList.remove("is-show");
  }

  function bindTabs(){
    $$("[data-or-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-or-tab");
        if (!tab) return;

        $$("[data-or-tab]").forEach(node => node.classList.remove("is-active"));
        btn.classList.add("is-active");

        $$("[data-or-panel]").forEach(panel => {
          panel.classList.toggle(
            "is-active",
            panel.getAttribute("data-or-panel") === tab
          );
        });
      });
    });
  }

  function bindBedrooms(){
    const wrap = $("#orBedButtons");
    if (!wrap) return;

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-or-bed]");
      if (!btn || !CITY) return;

      ACTIVE_BED = btn.getAttribute("data-or-bed") || "3";
      $$("[data-or-bed]", wrap).forEach(node => node.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderBedroom(CITY, ACTIVE_BED);
    });
  }

  function getBaseProfile(data){
    return data?.base_profile || {};
  }

  function renderBase(data){
    const base = getBaseProfile(data);
    const housing = base?.on_base_housing || {};
    const commute = base?.commute_intelligence || {};
    const bah = base?.bah_market_reality || {};
    const family = base?.family_readiness || {};
    const mapMeta = base?.base_map_image || {};

    const installationName = firstDefined(
      base.display_name,
      base.base_name,
      base.short_name,
      data.name,
      data.slug
    );

    const mapUrl = firstDefined(
      data.base_image_url,
      mapMeta.url,
      data.image_url
    );

    const mapAlt = firstDefined(
      mapMeta.alt,
      `${installationName || "Base"} map`
    );

    const mapCaption = firstDefined(
      mapMeta.caption,
      mapMeta.safety_note,
      "Public-facing base orientation map."
    );

    setText(
      "#orBaseIntro",
      firstDefined(
        base.base_bluf,
        base.primary_mission_summary,
        data.profile,
        "Base overview loaded from JSON."
      )
    );

    setText(
      "#orBaseBlufMission",
      firstDefined(
        base.primary_mission_summary,
        base.installation_type,
        "No mission summary available yet."
      )
    );

    setText(
      "#orBaseBlufCommute",
      firstDefined(
        commute.commute_bluf,
        base.pcs_personality,
        "No commute guidance available yet."
      )
    );

    setText(
      "#orBaseBlufHousing",
      firstDefined(
        bah.bah_bluf,
        housing.pcsu_strategy_note,
        "No housing guidance available yet."
      )
    );

    setText(
      "#orBaseBlufFamily",
      firstDefined(
        family.family_bluf,
        base.user_positioning?.military_family_bluf,
        "No family guidance available yet."
      )
    );

    const quickFacts = [];
    if (installationName) quickFacts.push(`Installation: ${installationName}`);
    if (base.parent_installation) quickFacts.push(`Parent installation: ${base.parent_installation}`);
    if (base.host_or_major_command) quickFacts.push(`Host / major command: ${base.host_or_major_command}`);
    if (base.installation_type) quickFacts.push(`Installation type: ${base.installation_type}`);
    if (base.metro) quickFacts.push(`Metro: ${base.metro}`);
    if (base.zip) quickFacts.push(`ZIP: ${base.zip}`);
    if (base.joint_base === true) quickFacts.push(`Joint base: Yes`);
    if (base.pcs_personality) quickFacts.push(`PCS personality: ${base.pcs_personality}`);

    renderList("#orBaseQuickFacts", quickFacts);

    const accessNotes = [];
    const vcc = base.visitor_control_center || {};

    if (vcc.name) accessNotes.push(`Visitor Control Center: ${vcc.name}`);
    if (vcc.address) accessNotes.push(`VCC address: ${vcc.address}`);
    if (vcc.hours) accessNotes.push(`VCC hours: ${vcc.hours}`);
    if (vcc.phone) accessNotes.push(`VCC phone: ${vcc.phone}`);

    arr(base.gates).slice(0, 5).forEach(g => {
      const gateLine = [
        g.name,
        g.hours ? `(${g.hours})` : "",
        g.commute_notes || g.user_warning || ""
      ].filter(Boolean).join(" ");
      if (gateLine) accessNotes.push(gateLine);
    });

    renderList("#orBaseAccess", accessNotes);

    const housingNotes = [];
    if (housing.housing_type) housingNotes.push(`Housing type: ${housing.housing_type}`);
    if (housing.housing_office_name) housingNotes.push(`Housing office: ${housing.housing_office_name}`);
    if (housing.housing_office_address) housingNotes.push(`Housing office address: ${housing.housing_office_address}`);
    if (housing.housing_office_phone) housingNotes.push(`Housing office phone: ${housing.housing_office_phone}`);
    flattenTextList(housing.best_for).forEach(x => housingNotes.push(`Best for: ${x}`));
    flattenTextList(housing.watchouts).forEach(x => housingNotes.push(`Watchout: ${x}`));

    renderList("#orBaseHousing", housingNotes);

    setText(
      "#orBaseWhyItMatters",
      firstDefined(
        base.base_bluf,
        housing.pcsu_strategy_note,
        bah.base_tab_message,
        base.primary_mission_summary,
        "No base summary available yet."
      )
    );

    const mapImg = $("#orBaseMapImg");
    const mapLink = $("#orBaseMapLink");
    const mapEmpty = $("#orBaseMapEmpty");

    if (mapUrl){
      if (mapImg){
        mapImg.src = mapUrl;
        mapImg.alt = mapAlt;
        mapImg.style.display = "block";
      }
      if (mapLink){
        mapLink.href = mapUrl;
        mapLink.style.display = "block";
      }
      if (mapEmpty){
        mapEmpty.classList.remove("is-show");
      }
    }else{
      if (mapImg){
        mapImg.removeAttribute("src");
        mapImg.style.display = "none";
      }
      if (mapLink){
        mapLink.removeAttribute("href");
        mapLink.style.display = "none";
      }
      if (mapEmpty){
        mapEmpty.classList.add("is-show");
      }
    }

    setText("#orBaseMapCaption", mapCaption);
  }

  function renderHero(data){
    const bg = $("#orHeroBg");
    if (bg && data.image_url){
      bg.style.setProperty("--hero-image", `url("${data.image_url}")`);
    }

    setText("#orTopPlace", `${data.place || data.city || "City"} • ${data.market_label || "Market Intelligence"}`);
    setText("#orTopUpdated", `Updated — ${data.last_updated_data_from_sources || data.market_metrics?.as_of || "N/A"}`);
    setText("#orHeroEyebrow", `${data.state || "State"} • ${data.market_label || "City Intelligence"}`);
    setText("#orHeroTitle", `${data.name || data.city || "Base"}${data.state_code ? `, ${data.state_code}` : ""}`);
    setText("#orHeroSubtitle", data.profile || "City intelligence loaded.");

    setText("#orKpiHomePrice", fmtMoney(data.metrics?.median_sale_price || data.avg_home_value));
    setText("#orKpiRent", fmtMoney(data.metrics?.median_rent || data.rental_metrics?.median_rent));
    setText("#orKpiMortgage", fmtMoney(data.avg_home_mortgage_monthly?.avg));
    setText(
      "#orKpiDom",
      Number.isFinite(Number(data.metrics?.days_on_market))
        ? `${fmtNum(data.metrics.days_on_market)} days`
        : "—"
    );

    const status = data.market_bluf?.status || "Market Verdict";
    const verdict = data.market_bluf?.verdict || data.market_bluf?.bluf_headline || "Market View";

    const copyParts = [
      data.market_bluf?.bluf_summary,
      data.financial_brief?.affordability_summary,
      data.market_bluf?.buyer_leverage ? `Buyer leverage: ${data.market_bluf.buyer_leverage}.` : "",
      data.market_bluf?.inventory_trend ? `Inventory trend: ${data.market_bluf.inventory_trend}.` : ""
    ].filter(Boolean);

    setText("#orVerdictStatus", status);
    setText("#orVerdictTitle", verdict);
    setText("#orVerdictCopy", copyParts.join(" "));

    setText("#orScoreAffordability", data.scorecard?.affordability_score ?? "—");
    setText("#orScoreGrowth", data.scorecard?.growth_score ?? "—");
    setText("#orScoreStability", data.scorecard?.stability_score ?? "—");
    setText("#orScoreOverall", data.scorecard?.overall_score ?? "—");
  }

  function renderOverview(data){
    setText("#orOverviewIntro", data.profile || "City overview loaded.");
    setText("#orOvListPrice", fmtMoney(data.metrics?.median_list_price || data.market_metrics?.median_list_price));
    setText(
      "#orOvPpsf",
      Number.isFinite(Number(data.metrics?.price_per_sqft || data.market_metrics?.price_per_sqft))
        ? fmtMoney(data.metrics?.price_per_sqft || data.market_metrics?.price_per_sqft)
        : "—"
    );
    setText("#orOvListings", fmtNum(data.metrics?.active_listings_total || data.market_metrics?.active_listings_total));
    setText("#orOvTaxRate", fmtPctFromDecimal(data.property_tax_rate ?? data.ownership_costs?.property_tax_rate));

    renderList("#orSummaryPoints", data.summary_points);

    const briefParts = [
      data.financial_brief?.affordability_summary,
      data.financial_brief?.buyer_opportunity ? `Buyer opportunity: ${data.financial_brief.buyer_opportunity}.` : "",
      data.financial_brief?.bah_vs_buy_position ? `Buy position: ${data.financial_brief.bah_vs_buy_position}.` : "",
      data.financial_brief?.bah_vs_rent_position ? `Rent comparison: ${data.financial_brief.bah_vs_rent_position}.` : ""
    ].filter(Boolean);

    setText("#orFinancialBrief", briefParts.join(" ") || "No financial brief available.");
    setHtml("#orScoreBars", renderScoreBars(data.scorecard || {}));
  }

  function renderBedroom(data, bedKey){
    const bed = data.by_bedroom?.[bedKey];
    if (!bed){
      setText("#orBedAsOf", "As of —");
      setText("#orBedHomePrice", "—");
      setText("#orBedRent", "—");
      setText("#orBedMortgage", "—");
      setText("#orBedUtilities", "—");
      return;
    }

    setText("#orBedAsOf", `As of ${bed.home_price?.as_of || bed.rent_monthly?.as_of || data.metrics?.as_of || "N/A"}`);
    setText("#orBedHomePrice", fmtMoney(bed.home_price?.avg));
    setText("#orBedRent", fmtMoney(bed.rent_monthly?.avg));
    setText("#orBedMortgage", fmtMoney(bed.mortgage_monthly?.avg));
    setText("#orBedUtilities", fmtMoney(bed.utilities?.total?.avg));
  }

  function renderRealEstate(data){
    setText(
      "#orRealEstateIntro",
      `${data.city || data.name || "City"} pricing and cost structure, including taxes, insurance, HOA assumptions, and bedroom-level ranges.`
    );

    renderBedroom(data, ACTIVE_BED);
    renderList("#orOwnershipNotes", data.ownership_costs?.notes);
    renderList("#orTargetNeighborhoods", data.target_neighborhoods || data.neighborhoods);
    renderList("#orOpportunities", data.opportunities);
    renderList("#orRisks", data.risks);
    renderList("#orInvestorAngles", data.investor_angles);
  }

  function renderDemographics(data){
    setText("#orDemoPopulation", fmtNum(data.population?.estimate || data.snapshot?.population_city));
    setText("#orDemoAge", Number.isFinite(Number(data.population?.median_age)) ? String(data.population.median_age) : "—");
    setText("#orDemoHouseholdSize", Number.isFinite(Number(data.population?.persons_per_household)) ? String(data.population.persons_per_household) : "—");
    setText("#orDemoIncome", fmtMoney(data.income?.median_household_income || data.snapshot?.median_household_income));
    setText("#orDemoPerCapita", fmtMoney(data.income?.per_capita_income));
    setText("#orDemoPoverty", fmtPct(data.income?.poverty_rate_percent));

    setHtml("#orEducationBars", [
      miniBar("HS+", data.education?.high_school_grad_or_higher_percent || 0, 100, fmtPct(data.education?.high_school_grad_or_higher_percent || 0)),
      miniBar("Bachelor's+", data.education?.bachelors_degree_or_higher_percent || 0, 100, fmtPct(data.education?.bachelors_degree_or_higher_percent || 0)),
      miniBar("Veteran Pop.", data.veterans?.veteran_population_percent || 0, 100, fmtPct(data.veterans?.veteran_population_percent || 0)),
      miniBar("Foreign Born", data.immigration?.foreign_born_percent || 0, 100, fmtPct(data.immigration?.foreign_born_percent || 0))
    ].join(""));

    setHtml("#orLaborBars", [
      miniBar("Unemployment", data.labor?.unemployment_rate_percent || 0, 15, fmtPct(data.labor?.unemployment_rate_percent || 0)),
      miniBar("Commute", data.labor?.mean_travel_time_to_work_minutes || 0, 60, `${Number(data.labor?.mean_travel_time_to_work_minutes || 0).toFixed(1)}m`),
      miniBar("Households", data.households?.total_households || 0, Math.max(1, Number(data.households?.total_households || 1)), fmtNum(data.households?.total_households || 0))
    ].join(""));

    setHtml("#orHousingBars", [
      miniBar("Median Rent", data.rental_metrics?.median_rent || 0, 4000, fmtMoney(data.rental_metrics?.median_rent || 0)),
      miniBar("Vacancy", data.rental_metrics?.vacancy_rate_percent || data.rental_vacancy?.rate_percent || 0, 20, fmtPct(data.rental_metrics?.vacancy_rate_percent || data.rental_vacancy?.rate_percent || 0)),
      miniBar("Housing Units", data.housing?.housing_units || 0, Math.max(1, Number(data.housing?.housing_units || 1)), fmtNum(data.housing?.housing_units || 0))
    ].join(""));

    renderList("#orQualityNotes", [
      data.school_quality?.on_base,
      data.school_quality?.off_base,
      data.crime_status?.installation,
      data.crime_status?.metro_laredo,
      data.crime_status?.metro_mcallen,
      data.crime_status?.metro_san_antonio
    ]);

    renderList("#orClimateList", [
      data.climate_weather?.spring ? `Spring: ${data.climate_weather.spring}` : null,
      data.climate_weather?.summer ? `Summer: ${data.climate_weather.summer}` : null,
      data.climate_weather?.fall ? `Fall: ${data.climate_weather.fall}` : null,
      data.climate_weather?.winter ? `Winter: ${data.climate_weather.winter}` : null,
      ...arr(data.special_events).map(x => `Local event: ${x}`)
    ]);
  }

  function renderGuidance(data){
    renderList("#orBuyerGuidance", data.buyer_guidance);
    renderList("#orSellerGuidance", data.seller_guidance);
    renderList("#orLandlordNotes", data.landlord_notes);
    renderList("#orBuyerNotes", data.buyer_notes);
    renderList("#orSellerNotes", data.seller_notes);
  }

  function renderAll(data){
    CITY = data;
    hideError();
    renderBase(data);
    renderHero(data);
    renderOverview(data);
    renderRealEstate(data);
    renderDemographics(data);
    renderGuidance(data);
  }

  async function loadCity(){
    const cityJsonUrl = getCityJsonUrl();

    try{
      const res = await fetch(cityJsonUrl, { cache: "no-store" });
      if (!res.ok){
        throw new Error(`HTTP ${res.status} while loading ${cityJsonUrl}`);
      }

      const data = await res.json();
      renderAll(data);
    }catch(err){
      console.error("Cities Overview load error:", err);
      setText("#orHeroTitle", "City data could not load");
      setText("#orHeroSubtitle", "Check the city JSON path.");
      setText("#orVerdictTitle", "Load Error");
      setText("#orVerdictCopy", "The shell loaded, but the city JSON did not.");
      showError(String(err?.message || err));
    }
  }

  window.loadCity = loadCity;

  window.addEventListener("pcsu:base-selected", (e) => {
    const item = e?.detail || {};
    if (item.jsonUrl){
      window.PCSU_SELECTED_CITY_JSON_URL = item.jsonUrl;
      window.OROZCO_CITY_JSON_URL = item.jsonUrl;
    }
    loadCity();
  });

  hydrateSelectedBaseFromStorage();
  bindTabs();
  bindBedrooms();
  loadCity();
})();
