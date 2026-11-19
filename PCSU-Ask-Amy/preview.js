// Synthetic income entry for the preview only. Financial engines remain server-side.
(() => {
  const root=document.getElementById('pcsu-ask-amy');root.dataset.endpoint=location.origin+'/api/pcsu-ask-amy';root.dataset.toolOrigin=location.origin;
  const mortgageFrame=document.getElementById('pcsu-mortgage-frame'),budgetFrame=document.getElementById('pcsu-budget-frame');
  let revision=0,mortgage={status:'loading',amount:null},mRevision=-1;
  const amount=id=>{const el=document.getElementById(id);return el.value!==''&&el.checkValidity()?Number(el.value):null;};
  function income(){const gross=amount('preview-gross'),net=amount('preview-net'),savings=amount('preview-savings');return {complete:gross!==null,status:'manual',grossMonthlyIncome:gross,netMonthlyIncome:net,monthlySavingsContributions:savings,monthlyDeductions:null,capitalReservesTotal:null,sources:[{label:'Preview household income',amount:gross,basis:'sample / user-entered'}]};}
  window.PCSU_FINANCIAL_INCOME={getSnapshot:income};
  function send(){const v=income();budgetFrame.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:finance-context',revision:++revision,grossMonthly:v.grossMonthlyIncome,netMonthly:v.netMonthlyIncome,savingsMonthly:v.monthlySavingsContributions,incomeSources:v.sources,location:'Preview household',mortgage},location.origin);}
  function request(){mortgageFrame.contentWindow?.postMessage({source:'pcsu-finance-host',version:1,type:'pcsu:mortgage-budget-request'},location.origin);}
  document.querySelectorAll('.income-card input').forEach(el=>el.addEventListener('input',()=>{send();window.dispatchEvent(new CustomEvent('pcsu:financial-income-change'));}));
  window.addEventListener('message',e=>{const d=e.data;if(e.origin!==location.origin||d?.version!==1)return;
    if(e.source===mortgageFrame.contentWindow&&d.source==='pcsu-mortgage-budget'&&d.type==='pcsu:mortgage-budget-state'){
      const s=d.snapshot;if(s&&(!Number.isSafeInteger(s.revision)||s.revision<mRevision))return;if(s)mRevision=s.revision;
      const amount=s?.mortgageEstimate?.monthly?.totalHousing;const ready=s?.ready===true&&s.status==='ready'&&typeof amount==='number'&&Number.isFinite(amount);
      mortgage={status:ready?'ready':'unavailable',amount:ready?amount:null,example:s?.hasUserInteracted!==true};send();
    }
    if(e.source===budgetFrame.contentWindow&&d.source==='pcsu-finance'){
      if(d.type==='pcsu:finance-ready'){send();request();}
      if(d.type==='pcsu:finance-resize'&&Number.isFinite(d.height)&&d.height>0&&d.height<30000)budgetFrame.style.height=Math.ceil(d.height)+'px';
    }
  });mortgageFrame.addEventListener('load',()=>{mRevision=-1;request();});budgetFrame.addEventListener('load',()=>{send();request();});send();request();
})();
