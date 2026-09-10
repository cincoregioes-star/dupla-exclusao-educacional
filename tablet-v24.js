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
    installNavigationSafety();menuBehavior();cleanOldHorizontalUi();watchAlbumCompletion();observeDynamicContent();
    window.addEventListener("error",ev=>{try{localStorage.setItem("dupla_last_js_error_v25",JSON.stringify({message:String(ev.message||"Erro JavaScript"),file:String(ev.filename||"").split("/").pop(),line:Number(ev.lineno||0),at:new Date().toISOString()}));}catch(_){}});
  }

  window.DuplaV24={albumComplete,ensureAlbumCompletedAt,setupSurveyPager:()=>cleanOldHorizontalUi(),setupReportPager:()=>cleanOldHorizontalUi(),updateArrows:()=>{},navTo:name=>document.querySelector(`[data-screen="${name}"]`)?.click()};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();