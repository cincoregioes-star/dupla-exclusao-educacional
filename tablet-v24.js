(() => {
  "use strict";
  const STATE_KEY = "dupla_exclusao_state_v2";
  const ALBUM_COMPLETE_KEY = "dupla_album_completed_at_v24";
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  let quizIndex = 0;
  let surveyIndex = 0;

  function state(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||"null")||{};}catch{return {};}
  }
  function albumComplete(){
    const pasted = state().pasted || {};
    return Object.values(pasted).filter(Boolean).length >= 36;
  }
  function ensureAlbumCompletedAt(){
    if(!albumComplete()) return null;
    let at=localStorage.getItem(ALBUM_COMPLETE_KEY);
    if(!at){at=new Date().toISOString();localStorage.setItem(ALBUM_COMPLETE_KEY,at);}
    return at;
  }

  function installAndroidNavigationSafety(){
    if(window.__DUPLA_NAV_SAFETY_V24_2__) return;
    window.__DUPLA_NAV_SAFETY_V24_2__=true;

    // O app usa telas fixas no viewport. Scroll vertical suave não é necessário e
    // pode gerar travamento/renderização presa em alguns Android WebViews.
    try{
      window.scrollTo=function(){};
      window.scroll=function(){};
    }catch(_){ }

    // Rota de segurança executada antes dos listeners do app principal.
    // Se qualquer módulo falhar, o botão ainda troca a tela e fecha o menu.
    document.addEventListener("click",e=>{
      const btn=e.target?.closest?.("[data-screen]");
      if(!btn) return;
      const name=btn.dataset.screen;
      if(!name) return;
      const target=document.getElementById("screen-"+name);
      if(!target) return;
      $$(".screen").forEach(s=>s.classList.remove("active"));
      target.classList.add("active");
      const nav=$("#nav");
      if(nav) nav.classList.remove("open");
      const menu=$("#menuBtn");
      if(menu) menu.setAttribute("aria-expanded","false");
      setTimeout(updateArrows,0);
    },true);

    // Se ocorrer erro de JavaScript, registra localmente para diagnóstico sem
    // expor dados do aluno nem bloquear a interface.
    window.addEventListener("error",ev=>{
      try{localStorage.setItem("dupla_last_js_error_v24_2",JSON.stringify({message:String(ev.message||"Erro JavaScript"),file:String(ev.filename||"").split("/").pop(),line:Number(ev.lineno||0),at:new Date().toISOString()}));}catch(_){ }
    });
    window.addEventListener("unhandledrejection",ev=>{
      try{localStorage.setItem("dupla_last_js_error_v24_2",JSON.stringify({message:String(ev.reason?.message||ev.reason||"Promise rejeitada"),at:new Date().toISOString()}));}catch(_){ }
    });
  }

  function compactHome(){
    const home=$("#screen-home");
    const nav=$("#nav");
    if(!home||!nav||home.dataset.v24==="1") return;

    const profileBtn=home.querySelector('[data-screen="perfil"]');
    if(profileBtn){
      profileBtn.textContent="Identificar aluno";
      profileBtn.className="";
      const first=nav.querySelector('[data-screen="home"]');
      first?.insertAdjacentElement("afterend",profileBtn);
    }
    const offlineBtn=$("#prepareOfflineBtn");
    const offlineStatus=$("#offlineStatus");
    if(offlineBtn){offlineBtn.textContent="Preparar uso offline";offlineBtn.className="";nav.appendChild(offlineBtn);}

    const network=$("#networkBadge");
    const origin=document.createElement("div");
    origin.className="v24-menu-section";
    origin.innerHTML=`<strong>Início do projeto</strong><span>Antônio Anselmo</span><span>Gabrielly Rodrigues</span><small>Alunos do 8º ano • E.M.E.F. Pedro de Queiroz Ferreira</small>`;
    nav.appendChild(origin);
    if(offlineStatus){
      offlineStatus.className="v24-menu-section";
      offlineStatus.style.marginTop="0";
      nav.appendChild(offlineStatus);
    }
    if(network) nav.appendChild(network);

    home.innerHTML=`
      <div class="v24-home" aria-label="Dupla Exclusão">
        <img class="v24-school-logo" src="logo-pedro-queiroz.jpg" alt="Logo da E.M.E.F. Pedro de Queiroz Ferreira">
        <span class="v24-edition">Edição Municipal</span>
        <div>
          <h1>Dupla Exclusão</h1>
          <p class="v24-home-subtitle">Entre a cor e a condição</p>
          <p class="v24-home-school">E.M.E.F. Pedro de Queiroz Ferreira</p>
        </div>
        <div class="v24-home-hint">Use o botão ☰ no alto à direita para acessar todas as áreas.</div>
        <div class="v24-idealizadores-compactos">
          <div class="v24-idealizador"><small>Idealizador</small>Prof. Cleilson Paiva</div>
          <div class="v24-idealizador"><small>Idealizador</small>Prof. Carlos André Tavares de Lima</div>
        </div>
      </div>`;
    home.dataset.v24="1";
  }

  function menuBehavior(){
    const btn=$("#menuBtn"),nav=$("#nav");if(!btn||!nav)return;
    const sync=()=>btn.setAttribute("aria-expanded",nav.classList.contains("open")?"true":"false");
    btn.addEventListener("click",()=>setTimeout(sync,0));
    document.addEventListener("click",e=>{
      if(!nav.classList.contains("open"))return;
      if(nav.contains(e.target)||btn.contains(e.target))return;
      nav.classList.remove("open");sync();
    });
    nav.addEventListener("click",e=>{
      if(e.target.closest("button")){setTimeout(()=>{nav.classList.remove("open");sync();},30);}
    });
    sync();
  }

  function currentScreen(){return $(".screen.active");}
  function addArrows(){
    if($("#v24Prev"))return;
    const prev=document.createElement("button"),next=document.createElement("button"),label=document.createElement("div");
    prev.id="v24Prev";prev.className="v24-arrow";prev.type="button";prev.innerHTML="‹";prev.setAttribute("aria-label","Anterior");
    next.id="v24Next";next.className="v24-arrow";next.type="button";next.innerHTML="›";next.setAttribute("aria-label","Próximo");
    label.id="v24PagerLabel";label.className="v24-pager-label";
    document.body.append(prev,next,label);
    prev.addEventListener("click",()=>step(-1));
    next.addEventListener("click",()=>step(1));
  }

  function navTo(name){
    const b=$(`#nav [data-screen="${name}"]`) || $(`[data-screen="${name}"]`);
    b?.click();
  }

  function scrollHorizontal(el,dir){
    if(!el)return false;
    el.scrollBy({left:dir*Math.max(280,el.clientWidth*.82),behavior:"smooth"});
    return el.scrollWidth>el.clientWidth+8;
  }

  function step(dir){
    const s=currentScreen();if(!s)return;
    const name=s.id.replace("screen-","");
    if(name==="quiz"){stepQuiz(dir);return;}
    if(name==="pesquisas"){stepSurvey(dir);return;}
    if(name==="album"){
      const tabs=$$("#albumTabs button"),active=tabs.findIndex(b=>b.classList.contains("active"));
      const i=Math.max(0,Math.min(tabs.length-1,active+dir));
      if(i!==active)tabs[i].click();updateArrows();return;
    }
    if(name==="simulados"){scrollHorizontal($("#simList"),dir);updateArrows();return;}
    if(["progresso","sobre","professor"].includes(name)){scrollHorizontal(s,dir);updateArrows();return;}
    const order=["home","perfil","album","simulados","pesquisas","denuncia","progresso","professor","sobre"];
    const idx=order.indexOf(name),next=idx<0?0:Math.max(0,Math.min(order.length-1,idx+dir));
    if(next!==idx)navTo(order[next]);
  }

  function setupQuizPager(reset=true){
    const cards=$$("#quizQuestions .question-card");if(!cards.length)return;
    if(reset)quizIndex=0;
    quizIndex=Math.max(0,Math.min(cards.length-1,quizIndex));
    cards.forEach((c,i)=>c.classList.toggle("v24-active-question",i===quizIndex));
    const submit=$('#quizForm button[type="submit"]');
    if(submit)submit.hidden=quizIndex!==cards.length-1;
    updateQuizLabel();
  }
  function stepQuiz(dir){
    const cards=$$("#quizQuestions .question-card");if(!cards.length)return;
    quizIndex=Math.max(0,Math.min(cards.length-1,quizIndex+dir));
    setupQuizPager(false);
  }
  function updateQuizLabel(){
    const cards=$$("#quizQuestions .question-card"),answered=new Set($$('#quizForm input[type="radio"]:checked').map(x=>x.name)).size;
    const q=$("#quizProgress");if(q&&cards.length)q.textContent=`Questão ${quizIndex+1} de ${cards.length} • ${answered} respondida(s)`;
    updateArrows();
  }

  function setupSurveyPager(reset=true){
    const cards=$$("#surveyQuestions .survey-question");if(!cards.length)return;
    if(reset)surveyIndex=0;
    surveyIndex=Math.max(0,Math.min(cards.length-1,surveyIndex));
    cards.forEach((c,i)=>c.classList.toggle("v24-active-question",i===surveyIndex));
    const save=$("#surveySaveBtn");
    if(save)save.hidden=surveyIndex!==cards.length-1;
    updateArrows();
  }
  function stepSurvey(dir){
    const cards=$$("#surveyQuestions .survey-question");if(!cards.length)return;
    surveyIndex=Math.max(0,Math.min(cards.length-1,surveyIndex+dir));
    setupSurveyPager(false);
  }

  function updateArrows(){
    const prev=$("#v24Prev"),next=$("#v24Next"),label=$("#v24PagerLabel"),s=currentScreen();
    if(!prev||!next||!label||!s)return;
    const name=s.id.replace("screen-","");
    const clean=name==="home";
    prev.hidden=clean;next.hidden=clean;label.hidden=clean;
    if(clean)return;
    prev.disabled=false;next.disabled=false;
    if(name==="quiz"){
      const n=$$("#quizQuestions .question-card").length;prev.disabled=quizIndex<=0;next.disabled=!n||quizIndex>=n-1;label.textContent=n?`Questão ${quizIndex+1}/${n}`:"Simulado";return;
    }
    if(name==="pesquisas"){
      const n=$$("#surveyQuestions .survey-question").length;prev.disabled=surveyIndex<=0;next.disabled=!n||surveyIndex>=n-1;label.textContent=n?`Pergunta ${surveyIndex+1}/${n}`:"Pesquisa";return;
    }
    if(name==="album"){
      const tabs=$$("#albumTabs button"),i=tabs.findIndex(b=>b.classList.contains("active"));prev.disabled=i<=0;next.disabled=i<0||i>=tabs.length-1;label.textContent=tabs.length?`Álbum • página ${i+1}/${tabs.length}`:"Álbum";return;
    }
    if(name==="simulados"){label.textContent="Simulados • use as setas";return;}
    if(name==="denuncia"){label.textContent="Relato protegido";return;}
    if(name==="professor"){label.textContent="Painel institucional • deslize para os lados";return;}
    label.textContent=name==="progresso"?"Meu progresso • deslize para os lados":name==="sobre"?"Sobre • deslize para os lados":name.charAt(0).toUpperCase()+name.slice(1);
  }

  function watchScreens(){
    $$(".screen").forEach(screen=>{
      new MutationObserver(()=>{
        if(screen.classList.contains("active")){
          if(screen.id==="screen-quiz")setTimeout(()=>setupQuizPager(true),20);
          if(screen.id==="screen-pesquisas")setTimeout(()=>setupSurveyPager(true),60);
          updateArrows();
        }
      }).observe(screen,{attributes:true,attributeFilter:["class"]});
    });
    document.addEventListener("change",e=>{
      if(e.target.matches('#quizForm input[type="radio"]'))setTimeout(updateQuizLabel,0);
    },true);

    const surveyQ=$("#surveyQuestions");
    if(surveyQ)new MutationObserver(()=>setTimeout(()=>setupSurveyPager(true),0)).observe(surveyQ,{childList:true});
    const quizQ=$("#quizQuestions");
    if(quizQ)new MutationObserver(()=>setTimeout(()=>setupQuizPager(true),0)).observe(quizQ,{childList:true});
  }

  function markAlbumComplete(){
    if(!albumComplete())return;
    ensureAlbumCompletedAt();
    const surveyBtn=$("#nav [data-screen='pesquisas']");
    if(surveyBtn&&!surveyBtn.dataset.v24Complete){surveyBtn.dataset.v24Complete="1";surveyBtn.textContent="Pesquisas • Final liberada ✓";}
    window.dispatchEvent(new CustomEvent("dupla:album-complete"));
  }

  function completionWatch(){
    document.addEventListener("click",e=>{
      if(!e.target.closest(".paste-btn"))return;
      setTimeout(()=>{
        if(!albumComplete())return;
        markAlbumComplete();
        const toast=$("#toast");
        if(toast){toast.textContent="Álbum completo! A Pesquisa Final foi liberada automaticamente.";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),3300);}
      },80);
    },true);
    if(albumComplete())markAlbumComplete();
  }

  function touchNavigation(){
    let x=0,y=0;
    document.addEventListener("touchstart",e=>{const t=e.changedTouches?.[0];if(t){x=t.clientX;y=t.clientY;}},{passive:true});
    document.addEventListener("touchend",e=>{
      const t=e.changedTouches?.[0];if(!t)return;
      const dx=t.clientX-x,dy=t.clientY-y;
      if(Math.abs(dx)<85||Math.abs(dx)<Math.abs(dy)*1.4)return;
      const target=e.target;
      if(target.closest("input,textarea,select,.option,.survey-option,.v24-type-option"))return;
      step(dx<0?1:-1);
    },{passive:true});
  }

  function fixAssetPaths(){
    const fav=$('link[rel="icon"]');if(fav)fav.href="icon-192.png";
  }

  function init(){
    installAndroidNavigationSafety();
    fixAssetPaths();compactHome();menuBehavior();addArrows();watchScreens();completionWatch();touchNavigation();
    setupQuizPager(false);setupSurveyPager(false);updateArrows();
    window.addEventListener("resize",updateArrows,{passive:true});
  }

  window.DuplaV24={albumComplete,ensureAlbumCompletedAt,setupSurveyPager,updateArrows,navTo};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
