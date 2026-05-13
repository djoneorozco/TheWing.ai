// ============================================================
// PCSUnited • Base Demographics SaaS
// VOICE AMY ENABLED VERSION
// v3.1.0
//
// UPDATE
// - FIXED browser autoplay issue
// - Amy audio now preloads silently
// - Floating concierge button added
// - User click unlocks browser audio
// - Works with ElevenLabs + TheWing
// ============================================================

(() => {
  "use strict";

  if (window.OROZCO_CITY_OVERVIEW_SINGLE?.__mounted) return;
  window.OROZCO_CITY_OVERVIEW_SINGLE = { __mounted: true };

  const root = document.getElementById("or-city-overview");
  if (!root) return;

  let CITY = null;
  let ACTIVE_BED = "3";

  let AMY_AUDIO_INSTANCE = null;
  let AMY_PENDING_AUDIO = null;
  let AMY_BUTTON_RENDERED = false;

  const $ = (sel, node = root) => node.querySelector(sel);
  const $$ = (sel, node = root) => Array.from(node.querySelectorAll(sel));

  // ============================================================
  // #1 CONFIG
  // ============================================================

  const VOICE_BASE_BRIEF_ENDPOINT =
    "https://thewing.netlify.app/api/voice-base-brief";

  // ============================================================
  // #2 CITY JSON URL
  // ============================================================

  function getCityJsonUrl(){
    return (
      window.PCSU_SELECTED_CITY_JSON_URL ||
      window.OROZCO_CITY_JSON_URL ||
      "https://raw.githubusercontent.com/djoneorozco/PCSUnited/main/netlify/functions/cities/Lackland.json"
    );
  }

  // ============================================================
  // #3 STORAGE HYDRATION
  // ============================================================

  function hydrateSelectedBaseFromStorage(){

    try{

      const raw =
        localStorage.getItem(
          "pcsunited.selectedBase.v1"
        );

      if (!raw) return;

      const selected =
        JSON.parse(raw);

      if (selected?.jsonUrl){

        window.PCSU_SELECTED_CITY_JSON_URL =
          selected.jsonUrl;

        window.OROZCO_CITY_JSON_URL =
          selected.jsonUrl;
      }

    }catch(err){

      console.warn(
        "Could not hydrate selected base from storage:",
        err
      );
    }
  }

  // ============================================================
  // #4 FORMATTERS
  // ============================================================

  function fmtMoney(v){

    const n = Number(v);

    if (!Number.isFinite(n)) return "—";

    return new Intl.NumberFormat(
      "en-US",
      {
        style:"currency",
        currency:"USD",
        maximumFractionDigits:0
      }
    ).format(n);
  }

  function fmtNum(v){

    const n = Number(v);

    if (!Number.isFinite(n)) return "—";

    return new Intl.NumberFormat("en-US")
      .format(n);
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

  // ============================================================
  // #5 HELPERS
  // ============================================================

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

      if (
        v !== undefined &&
        v !== null &&
        v !== ""
      ){
        return v;
      }
    }

    return null;
  }

  function flattenTextList(input){

    if (!input) return [];

    if (Array.isArray(input)){
      return input
        .flatMap(flattenTextList)
        .filter(Boolean);
    }

    if (typeof input === "string"){
      return input.trim()
        ? [input.trim()]
        : [];
    }

    if (typeof input === "object"){
      return Object.values(input)
        .flatMap(flattenTextList)
        .filter(Boolean);
    }

    return [];
  }

  // ============================================================
  // #6 DOM HELPERS
  // ============================================================

  function setText(sel, value){

    const el = $(sel);

    if (el){
      el.textContent = value ?? "—";
    }
  }

  function setHtml(sel, html){

    const el = $(sel);

    if (el){
      el.innerHTML = html || "";
    }
  }

  function renderList(sel, items){

    const el = $(sel);

    if (!el) return;

    const safe =
      arr(items).filter(Boolean);

    el.innerHTML =
      safe.length
        ? safe.map(
            item => `<li>${esc(item)}</li>`
          ).join("")
        : `<li>No data available yet.</li>`;
  }

  // ============================================================
  // #7 SCORE BARS
  // ============================================================

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

      const width =
        Number.isFinite(n)
          ? Math.max(0, Math.min(n, 100))
          : 0;

      return `
        <div class="or-bar-row">

          <div class="or-bar-name">
            ${esc(label)}
          </div>

          <div class="or-bar-track">
            <div
              class="or-bar-fill"
              style="width:${width}%"
            ></div>
          </div>

          <div class="or-bar-val">
            ${Number.isFinite(n) ? n : "—"}
          </div>

        </div>
      `;
    }).join("");
  }

  // ============================================================
  // #8 MINI BAR
  // ============================================================

  function miniBar(label, value, max, displayText){

    const n = Number(value);

    const width =
      Number.isFinite(n) && max > 0
        ? Math.max(
            0,
            Math.min((n / max) * 100, 100)
          )
        : 0;

    return `
      <div class="or-mini-row">

        <span>${esc(label)}</span>

        <div class="or-mini-track">
          <div
            class="or-mini-fill"
            style="width:${width}%"
          ></div>
        </div>

        <strong>${esc(displayText)}</strong>

      </div>
    `;
  }

  // ============================================================
  // #9 ERROR
  // ============================================================

  function showError(message){

    const box =
      $("#orCityError");

    if (!box) return;

    box.textContent = message;

    box.classList.add("is-show");
  }

  function hideError(){

    const box =
      $("#orCityError");

    if (!box) return;

    box.textContent = "";

    box.classList.remove("is-show");
  }

  // ============================================================
  // #10 TABS
  // ============================================================

  function bindTabs(){

    $$("[data-or-tab]").forEach(btn => {

      btn.addEventListener("click", () => {

        const tab =
          btn.getAttribute("data-or-tab");

        if (!tab) return;

        $$("[data-or-tab]")
          .forEach(node => {
            node.classList.remove("is-active");
          });

        btn.classList.add("is-active");

        $$("[data-or-panel]")
          .forEach(panel => {

            panel.classList.toggle(
              "is-active",
              panel.getAttribute("data-or-panel") === tab
            );
          });
      });
    });
  }

  // ============================================================
  // #11 BEDROOMS
  // ============================================================

  function bindBedrooms(){

    const wrap =
      $("#orBedButtons");

    if (!wrap) return;

    wrap.addEventListener("click", (e) => {

      const btn =
        e.target.closest("[data-or-bed]");

      if (!btn || !CITY) return;

      ACTIVE_BED =
        btn.getAttribute("data-or-bed") || "3";

      $$("[data-or-bed]", wrap)
        .forEach(node => {
          node.classList.remove("is-active");
        });

      btn.classList.add("is-active");

      renderBedroom(CITY, ACTIVE_BED);
    });
  }

  // ============================================================
  // #12 VOICE AMY
  // ============================================================

  async function prepareAmyBaseBrief(data){

    try{

      console.log(
        "Preparing Voice Amy Base Brief..."
      );

      const res =
        await fetch(
          VOICE_BASE_BRIEF_ENDPOINT,
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify(data)
          }
        );

      const json =
        await res.json();

      if (!json?.ok){

        console.warn(
          "Voice Base Brief failed:",
          json
        );

        return;
      }

      const audioSrc =
        `data:${json.mime_type};base64,${json.audio_base64}`;

      AMY_PENDING_AUDIO =
        audioSrc;

      injectAmyButton();

      console.log(
        "Voice Amy Base Brief ready."
      );

    }catch(err){

      console.warn(
        "Voice Amy Base Brief error:",
        err
      );
    }
  }

  // ============================================================
  // #13 FLOATING BUTTON
  // ============================================================

  function injectAmyButton(){

    if (AMY_BUTTON_RENDERED) return;

    AMY_BUTTON_RENDERED = true;

    const btn =
      document.createElement("button");

    btn.id =
      "pcsu-amy-brief-btn";

    btn.innerHTML =
      "🎧 Hear Amy’s Base Brief";

    Object.assign(btn.style,{
      position:"fixed",
      right:"18px",
      bottom:"18px",
      zIndex:"999999",
      border:"1px solid rgba(255,255,255,.14)",
      background:"linear-gradient(135deg,#081426,#13213f)",
      color:"#fff",
      borderRadius:"999px",
      padding:"14px 18px",
      fontWeight:"700",
      fontSize:"14px",
      cursor:"pointer",
      boxShadow:"0 18px 40px rgba(0,0,0,.35)",
      backdropFilter:"blur(14px)"
    });

    btn.addEventListener(
      "click",
      async () => {

        try{

          if (!AMY_PENDING_AUDIO){
            return;
          }

          if (!AMY_AUDIO_INSTANCE){

            AMY_AUDIO_INSTANCE =
              new Audio(
                AMY_PENDING_AUDIO
              );

            AMY_AUDIO_INSTANCE.volume = 0.92;
          }

          await AMY_AUDIO_INSTANCE.play();

          btn.innerHTML =
            "✓ Amy Brief Playing";

          setTimeout(() => {
            btn.remove();
          }, 2500);

        }catch(err){

          console.warn(
            "Amy playback failed:",
            err
          );
        }
      }
    );

    document.body.appendChild(btn);
  }

  // ============================================================
  // #14 BASE PROFILE
  // ============================================================

  function getBaseProfile(data){
    return data?.base_profile || {};
  }

  // ============================================================
  // #15 BASE
  // ============================================================

  function renderBase(data){

    const base =
      getBaseProfile(data);

    setText(
      "#orBaseIntro",
      firstDefined(
        base.base_bluf,
        data.profile,
        "Base overview loaded."
      )
    );
  }

  // ============================================================
  // #16 HERO
  // ============================================================

  function renderHero(data){

    const bg =
      $("#orHeroBg");

    if (bg && data.image_url){

      bg.style.setProperty(
        "--hero-image",
        `url("${data.image_url}")`
      );
    }

    setText(
      "#orHeroEyebrow",
      `${data.state || "State"} • ${data.market_label || "City Intelligence"}`
    );

    setText(
      "#orHeroTitle",
      `${data.name || data.city || "Base"}${data.state_code ? `, ${data.state_code}` : ""}`
    );

    setText(
      "#orHeroSubtitle",
      data.profile || "City intelligence loaded."
    );

    setText(
      "#orKpiHomePrice",
      fmtMoney(
        data.metrics?.median_sale_price ||
        data.avg_home_value
      )
    );

    setText(
      "#orKpiRent",
      fmtMoney(
        data.metrics?.median_rent ||
        data.rental_metrics?.median_rent
      )
    );

    setText(
      "#orKpiMortgage",
      fmtMoney(
        data.avg_home_mortgage_monthly?.avg
      )
    );
  }

  // ============================================================
  // #17 OVERVIEW
  // ============================================================

  function renderOverview(data){

    setText(
      "#orOverviewIntro",
      data.profile || "City overview loaded."
    );

    renderList(
      "#orSummaryPoints",
      data.summary_points
    );

    setHtml(
      "#orScoreBars",
      renderScoreBars(data.scorecard || {})
    );
  }

  // ============================================================
  // #18 BEDROOM
  // ============================================================

  function renderBedroom(data, bedKey){

    const bed =
      data.by_bedroom?.[bedKey];

    if (!bed) return;

    setText(
      "#orBedHomePrice",
      fmtMoney(bed.home_price?.avg)
    );

    setText(
      "#orBedRent",
      fmtMoney(bed.rent_monthly?.avg)
    );

    setText(
      "#orBedMortgage",
      fmtMoney(bed.mortgage_monthly?.avg)
    );

    setText(
      "#orBedUtilities",
      fmtMoney(bed.utilities?.total?.avg)
    );
  }

  // ============================================================
  // #19 REAL ESTATE
  // ============================================================

  function renderRealEstate(data){

    renderBedroom(
      data,
      ACTIVE_BED
    );
  }

  // ============================================================
  // #20 DEMOGRAPHICS
  // ============================================================

  function renderDemographics(data){

    setText(
      "#orDemoPopulation",
      fmtNum(
        data.population?.estimate
      )
    );

    setText(
      "#orDemoIncome",
      fmtMoney(
        data.income?.median_household_income
      )
    );
  }

  // ============================================================
  // #21 GUIDANCE
  // ============================================================

  function renderGuidance(data){

    renderList(
      "#orBuyerGuidance",
      data.buyer_guidance
    );
  }

  // ============================================================
  // #22 RENDER ALL
  // ============================================================

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

  // ============================================================
  // #23 LOAD CITY
  // ============================================================

  async function loadCity(){

    const cityJsonUrl =
      getCityJsonUrl();

    try{

      const res =
        await fetch(
          cityJsonUrl,
          {
            cache:"no-store"
          }
        );

      if (!res.ok){

        throw new Error(
          `HTTP ${res.status} while loading ${cityJsonUrl}`
        );
      }

      const data =
        await res.json();

      renderAll(data);

      // ========================================================
      // PREPARE AMY AUDIO
      // ========================================================

      prepareAmyBaseBrief(data);

    }catch(err){

      console.error(
        "Cities Overview load error:",
        err
      );

      setText(
        "#orHeroTitle",
        "City data could not load"
      );

      setText(
        "#orHeroSubtitle",
        "Check the city JSON path."
      );

      showError(
        String(err?.message || err)
      );
    }
  }

  // ============================================================
  // #24 GLOBAL
  // ============================================================

  window.loadCity = loadCity;

  // ============================================================
  // #25 BASE SWITCH
  // ============================================================

  window.addEventListener(
    "pcsu:base-selected",
    (e) => {

      const item =
        e?.detail || {};

      if (item.jsonUrl){

        window.PCSU_SELECTED_CITY_JSON_URL =
          item.jsonUrl;

        window.OROZCO_CITY_JSON_URL =
          item.jsonUrl;
      }

      loadCity();
    }
  );

  // ============================================================
  // #26 INIT
  // ============================================================

  hydrateSelectedBaseFromStorage();

  bindTabs();

  bindBedrooms();

  loadCity();

})();
