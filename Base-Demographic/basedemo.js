<script>
(() => {
  "use strict";

  if (window.OROZCO_CITY_OVERVIEW_SINGLE?.__mounted) return;
  window.OROZCO_CITY_OVERVIEW_SINGLE = { __mounted: true };

  const root = document.getElementById("or-city-overview");
  if (!root) return;

  let CITY = null;
  let ACTIVE_BED = "3";

  // ============================================================
  // VOICE AMY
  // ============================================================

  let AMY_AUDIO_INSTANCE = null;
  let AMY_PENDING_AUDIO = null;
  let AMY_BUTTON_RENDERED = false;

  const VOICE_BASE_BRIEF_ENDPOINT =
    "https://thewing.netlify.app/api/voice-base-brief";

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
      console.warn(
        "Could not hydrate selected base from storage:",
        err
      );
    }
  }

  function fmtMoney(v){
    const n = Number(v);

    if (!Number.isFinite(n)) return "—";

    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }
    ).format(n);
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

  function renderScoreBars(scorecard = {}){

    const rows = [
      ["Affordability", scorecard.affordability_score],
      ["Growth", scorecard.growth_score],
      ["Stability", scorecard.stability_score],
      ["Military Fit", scorecard.military_fit_score],
      ["Overall", scorecard.overall_score]
    ];

    return rows.map(([label, value]) => {

      const n =
        Number(value);

      const width =
        Number.isFinite(n)
          ? Math.max(0, Math.min(n, 100))
          : 0;

      return `
        <div class="or-bar-row">
          <div class="or-bar-name">${esc(label)}</div>

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

  function miniBar(label, value, max, displayText){

    const n =
      Number(value);

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

  function bindTabs(){

    $$("[data-or-tab]").forEach(btn => {

      btn.addEventListener("click", () => {

        const tab =
          btn.getAttribute("data-or-tab");

        if (!tab) return;

        $$("[data-or-tab]").forEach(node => {
          node.classList.remove("is-active");
        });

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

  function getBaseProfile(data){
    return data?.base_profile || {};
  }

  // ============================================================
  // VOICE AMY HELPERS
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

      CITY = data;

      hideError();

      renderBase(data);
      renderHero(data);
      renderOverview(data);
      renderRealEstate(data);
      renderDemographics(data);
      renderGuidance(data);

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

      setText(
        "#orVerdictTitle",
        "Load Error"
      );

      setText(
        "#orVerdictCopy",
        "The shell loaded, but the city JSON did not."
      );

      showError(
        String(err?.message || err)
      );
    }
  }

  window.loadCity = loadCity;

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

  hydrateSelectedBaseFromStorage();

  bindTabs();

  bindBedrooms();

  loadCity();

})();
</script>
