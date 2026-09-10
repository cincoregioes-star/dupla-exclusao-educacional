(() => {
  "use strict";
  const PLATFORM_URL = "https://cincoregioes-star.github.io/dupla-exclusao-educacional/";
  window.DUPLA_PLATFORM_URL = PLATFORM_URL;

  function installPlatformLink(){
    const screen=document.getElementById("screen-professor");
    if(!screen || document.getElementById("apkPlatformLink")) return;
    const panel=screen.querySelector(".teacher-grid .panel");
    if(!panel) return;
    const wrap=document.createElement("div");
    wrap.style.marginTop="14px";
    wrap.innerHTML=`<a id="apkPlatformLink" class="secondary" href="${PLATFORM_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none">Abrir plataforma institucional online</a><div class="status-note">APK e plataforma institucional usam o mesmo banco de dados Supabase.</div>`;
    panel.appendChild(wrap);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", installPlatformLink);
  else installPlatformLink();
})();