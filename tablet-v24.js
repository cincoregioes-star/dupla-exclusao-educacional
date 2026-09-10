(() => {
  "use strict";
  const STATE_KEY="dupla_exclusao_state_v2";
  const ALBUM_COMPLETE_KEY="dupla_album_completed_at_v24";
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  function readState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"null")||{};}catch{return {};}}
  function albumComplete(){const pasted=readState().pasted||{};return Object.values(pasted).filter(Boolean).length>=36;}
  function ensureAlbumCompletedAt(){if(!albumComplete())return null;let at=localStorage.getItem(ALBUM_COMPLETE_KEY);if(!at){at=new Date().toISOString();localStorage.setItem(ALBUM_COMPLETE_KEY,at);}return at;}

  function installNavigationSafety(){
    document.addEventListener("click",e=>{
      const btn=e.target?.closest?.("[data-screen]");if(!btn)return;
      const name=btn.dataset.screen;if(!name)return;
      const target=document.getElementById("screen-"+name);if(!target)return;
      $$(".screen").forEach(s=>s.classList.remove("active"));
      target.classList.add("active");
      target.scrollTop=0;
      const nav=$("#nav");if(nav)nav.classList.remove("open");
      const menu=$("#menuBtn");if(menu)menu.setAttribute("aria-expanded","false");
      if(name==="denuncia")setTimeout(installBullyingCompactUi,0);
    },true);
  }

  function menuBehavior(){
    const btn=$("#menuBtn"),nav=$("#nav");if(!btn||!nav)return;
    const sync=()=>btn.setAttribute("aria-expanded",nav.classList.contains("open")?"true":"false");
    btn.addEventListener("click",()=>setTimeout(sync,0));
    document.addEventListener("click",e=>{if(!nav.classList.contains("open"))return;if(nav.contains(e.target)||btn.contains(e.target))return;nav.classList.remove("open");sync();});
    nav.addEventListener("click",e=>{if(e.target.closest("button")){setTimeout(()=>{nav.classList.remove("open");sync();},30);}});
    sync();
  }

  function cleanOldHorizontalUi(){
    $("#v24Prev")?.remove();$("#v24Next")?.remove();$("#v24PagerLabel")?.remove();
    $$(".question-card,.survey-question,.v24-report-column").forEach(el=>{el.classList.remove("v24-active-question","v24-report-step-active");});
    const quizSubmit=$('#quizForm button[type="submit"]');if(quizSubmit)quizSubmit.hidden=false;
    const surveySubmit=$("#surveySaveBtn");if(surveySubmit)surveySubmit.hidden=false;
  }

  function installBullyingCompactUi(){
    const labels={
      verbal:"Verbal",
      fisico:"Físico",
      social:"Social / exclusão",
      cyberbullying:"Cyberbullying",
      racista:"Racismo",
      capacitista:"Capacitismo",
      aparencia:"Aparência / corpo",
      outro:"Outro"
    };
    $$('#bullyingReportForm .v24-type-option').forEach(label=>{
      const input=label.querySelector('input[name="bullyingType"]');
      const span=label.querySelector("span");
      if(input&&span&&labels[input.value]){
        span.textContent=labels[input.value];
        span.style.display="block";
        span.style.visibility="visible";
        span.style.opacity="1";
        span.style.color="#f5f7fb";
      }
    });
    if(!$("#v26BullyingStyle")){
      const style=document.createElement("style");
      style.id="v26BullyingStyle";
      style.textContent=`
        #screen-denuncia .v24-report-shell{padding:16px!important}
        #screen-denuncia .v24-report-head{margin-bottom:12px!important}
        #screen-denuncia .v24-report-head h2{margin:2px 0 5px!important}
        #screen-denuncia .v24-report-head p{font-size:.86rem!important;line-height:1.35!important}
        #screen-denuncia #bullyingReportForm{gap:14px!important}
        #screen-denuncia .v24-report-label{margin-bottom:10px!important;gap:5px!important}
        #screen-denuncia .v24-type-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;width:100%!important}
        #screen-denuncia .v24-type-option{display:flex!important;align-items:center!important;gap:8px!important;min-height:48px!important;height:auto!important;margin:0!important;padding:8px 9px!important;border:1px solid #34506f!important;border-radius:10px!important;background:#0a1a2d!important;color:#f5f7fb!important;overflow:visible!important}
        #screen-denuncia .v24-type-option span{display:block!important;visibility:visible!important;opacity:1!important;color:#f5f7fb!important;font-size:.83rem!important;font-weight:800!important;line-height:1.15!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important}
        #screen-denuncia .v24-type-option input{display:block!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;width:18px!important;height:18px!important;margin:0!important;accent-color:#facc15!important}
        #screen-denuncia .v24-report-label textarea{height:135px!important;min-height:120px!important}
        #screen-denuncia .v24-report-actions{margin-top:8px!important}
        @media(max-width:420px){
          #screen-denuncia{padding-left:10px!important;padding-right:10px!important}
          #screen-denuncia .v24-report-shell{padding:12px!important;border-radius:15px!important}
          #screen-denuncia .v24-type-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
          #screen-denuncia .v24-type-option{min-height:46px!important;padding:7px!important}
          #screen-denuncia .v24-type-option span{font-size:.78rem!important}
          #screen-denuncia .v24-report-label textarea{height:120px!important;min-height:110px!important}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function watchAlbumCompletion(){
    document.addEventListener("click",e=>{
      if(!e.target.closest(".paste-btn"))return;
      setTimeout(()=>{
        if(!albumComplete())return;
        ensureAlbumCompletedAt();
        const surveyBtn=$("#nav [data-screen='pesquisas']");
        if(surveyBtn&&!surveyBtn.dataset.v25Complete){surveyBtn.dataset.v25Complete="1";surveyBtn.textContent="Pesquisas • Final liberada ✓";}
        window.dispatchEvent(new CustomEvent("dupla:album-complete"));
      },80);
    },true);
    if(albumComplete()){
      ensureAlbumCompletedAt();
      const surveyBtn=$("#nav [data-screen='pesquisas']");if(surveyBtn){surveyBtn.dataset.v25Complete="1";surveyBtn.textContent="Pesquisas • Final liberada ✓";}
    }
  }

  function observeDynamicContent(){
    ["#quizQuestions","#surveyQuestions"].forEach(sel=>{
      const el=$(sel);if(!el)return;
      new MutationObserver(()=>setTimeout(cleanOldHorizontalUi,0)).observe(el,{childList:true});
    });
  }

  function init(){
    installNavigationSafety();menuBehavior();cleanOldHorizontalUi();installBullyingCompactUi();watchAlbumCompletion();observeDynamicContent();
    window.addEventListener("error",ev=>{try{localStorage.setItem("dupla_last_js_error_v26",JSON.stringify({message:String(ev.message||"Erro JavaScript"),file:String(ev.filename||"").split("/").pop(),line:Number(ev.lineno||0),at:new Date().toISOString()}));}catch(_){}});
  }

  window.DuplaV24={albumComplete,ensureAlbumCompletedAt,setupSurveyPager:()=>cleanOldHorizontalUi(),setupReportPager:()=>{cleanOldHorizontalUi();installBullyingCompactUi();},updateArrows:()=>{},navTo:name=>document.querySelector(`[data-screen="${name}"]`)?.click()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();