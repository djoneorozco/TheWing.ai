<!-- =========================================================
  PCSUnited • Base Demographics
  EMBED 6 OF 6 • GUIDANCE TAB
  v3.0.0
========================================================= -->

<script>
(() => {
  "use strict";

  const html = `
    <h2 class="or-section-title">Buyer, Seller, and Landlord Guidance</h2>
    <p class="or-section-sub">
      Decision notes built directly from your city JSON.
    </p>

    <div class="or-grid-3">
      <div class="or-list-card">
        <div class="or-list-title">Buyer Guidance</div>
        <ul class="or-list" id="orBuyerGuidance"></ul>
      </div>

      <div class="or-list-card">
        <div class="or-list-title">Seller Guidance</div>
        <ul class="or-list" id="orSellerGuidance"></ul>
      </div>

      <div class="or-list-card">
        <div class="or-list-title">Landlord Notes</div>
        <ul class="or-list" id="orLandlordNotes"></ul>
      </div>
    </div>

    <div class="or-grid-2">
      <div class="or-list-card">
        <div class="or-list-title">Buyer Notes</div>
        <ul class="or-list" id="orBuyerNotes"></ul>
      </div>

      <div class="or-list-card">
        <div class="or-list-title">Seller Notes</div>
        <ul class="or-list" id="orSellerNotes"></ul>
      </div>
    </div>
  `;

  function render(ctx){
    const data = ctx.city;
    const u = ctx.utils;
    const mount = ctx.mount;

    u.renderList("#orBuyerGuidance", data.buyer_guidance, mount);
    u.renderList("#orSellerGuidance", data.seller_guidance, mount);
    u.renderList("#orLandlordNotes", data.landlord_notes, mount);
    u.renderList("#orBuyerNotes", data.buyer_notes, mount);
    u.renderList("#orSellerNotes", data.seller_notes, mount);
  }

  const config = { html, render };

  if(window.PCSU_BASE_DEMO_REGISTER_TAB){
    window.PCSU_BASE_DEMO_REGISTER_TAB("guidance", config);
  }else{
    window.PCSU_BASE_DEMO_PENDING_TABS = window.PCSU_BASE_DEMO_PENDING_TABS || [];
    window.PCSU_BASE_DEMO_PENDING_TABS.push({ name:"guidance", config });
  }
})();
</script>
