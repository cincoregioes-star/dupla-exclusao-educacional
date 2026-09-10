(() => {
  "use strict";
  const APP_STATE_KEY="dupla_exclusao_state_v2";
  const SURVEY_KEY="dupla_exclusao_surveys_v1";
  const ALBUM_COMPLETE_KEY="dupla_album_completed_at_v24";
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"")||f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const appState=()=>read(APP_STATE_KEY,{});
  const surveys=()=>read(SURVEY_KEY,{});
  const profile=()=>appState().profile||{};

  function albumComplete(){
    const pasted=appState().pasted||{};
    return Object.values(pasted).filter(Boolean).length>=36;
  }
  function albumCompletedAt(){
    if(!albumComplete())return null;
    let at=localStorage.getItem(ALBUM_COMPLETE_KEY);
    if(!at){at=new Date().toISOString();localStorage.setItem(ALBUM_COMPLETE_KEY,at);}
    return at;
  }
  function finalTabActive(){return $("#surveyTabs [data-survey='didatica'].active");}
  function finalSaved(){return Boolean(surveys().didatica);}

  function unlockFinalUI(){
    if(!albumComplete()||!finalTabActive()||finalSaved())return;
    const intro=$("#surveyIntro");
    if(intro){
      intro.querySelector(".survey-locked")?.remove();
      if(!intro.querySelector(".v24-auto-release")){
        const n=document.createElement("div");n.className="survey-complete v24-auto-release";n.textContent="✓ Pesquisa Final liberada automaticamente: álbum completo 36/36.";intro.appendChild(n);
      }
    }
    $$("#surveyForm input, #surveyForm textarea").forEach(el=>el.disabled=false);
    const save=$("#surveySaveBtn");if(save){save.disabled=false;save.textContent="Salvar Pesquisa Final";}
    const status=$("#surveyStatus");if(status)status.textContent="Álbum completo. Responda as 10 perguntas; as respostas serão enviadas ao painel institucional.";
    window.DuplaV24?.setupSurveyPager?.(false);
  }

  async function sendFinal(submission){
    const s=window.APP_CONFIG?.supabase||{};
    if(!navigator.onLine||!s.enabled||!s.url||!s.anonKey)return false;
    const payload={
      device_id:appState().deviceId||null,
      student_code:submission.studentCode,
      student_name:submission.studentName,
      class_group:submission.classGroup,
      school_code:s.schoolCode||"PQF",
      survey_id:"didatica",
      survey_title:submission.title,
      assignment_id:null,
      responses:submission.responses,
      completed_at:submission.completedAt,
      unlock_source:"album_complete",
      album_completed_at:submission.albumCompletedAt,
      app_version:"v24"
    };
    const response=await fetch(`${s.url.replace(/\/$/,"")}/rest/v1/${encodeURIComponent(s.surveysTable||"survey_responses")}`,{
      method:"POST",
      headers:{apikey:s.anonKey,Authorization:`Bearer ${s.anonKey}`,"Content-Type":"application/json",Prefer:"return=minimal"},
      body:JSON.stringify(payload)
    });
    if(!response.ok&&response.status!==409)throw new Error(await response.text());
    const all=surveys();
    if(all.didatica){all.didatica.remoteSyncedAt=new Date().toISOString();write(SURVEY_KEY,all);}
    return true;
  }

  async function captureFinalSubmit(e){
    if(e.target?.id!=="surveyForm"||!finalTabActive()||!albumComplete()||finalSaved())return;
    e.preventDefault();e.stopImmediatePropagation();
    const p=profile();
    if(!String(p.name||"").trim()||!String(p.classGroup||"").trim()||!String(p.studentCode||"").trim()){
      alert("Identifique o aluno antes de responder a Pesquisa Final.");
      $("#nav [data-screen='perfil']")?.click();return;
    }
    const cards=$$("#surveyQuestions .survey-question");
    if(cards.length!==10){alert("A Pesquisa Final ainda não terminou de carregar. Abra novamente e tente outra vez.");return;}
    const responses=[];
    for(let i=0;i<cards.length;i++){
      const selected=$(`#surveyForm input[name="survey_q${i}"]:checked`);
      if(!selected){alert(`Responda a pergunta ${i+1}.`);return;}
      const title=cards[i].querySelector("h3")?.textContent?.replace(/^\s*\d+\.\s*/,"")||`Pergunta ${i+1}`;
      responses.push({question:title,choice:selected.value,text:$(`#survey_text${i}`)?.value.trim()||""});
    }
    const all=surveys();
    const submission={
      id:"didatica",
      title:"Pesquisa Final — Mudanças de Percepção sobre Racismo, Deficiência e Convivência Escolar",
      assignmentId:null,
      unlockSource:"album_complete",
      albumCompletedAt:albumCompletedAt(),
      studentName:p.name,
      studentCode:p.studentCode,
      classGroup:p.classGroup,
      responses,
      completedAt:new Date().toISOString()
    };
    all.didatica=submission;write(SURVEY_KEY,all);
    let synced=false;
    try{synced=await sendFinal(submission);}catch(err){console.warn("v24 final survey sync",err);}
    alert(synced?"Pesquisa Final salva e enviada ao painel institucional.":"Pesquisa Final salva neste aparelho. Ela será enviada automaticamente quando houver internet.");
    $("#surveyTabs [data-survey='didatica']")?.click();
  }

  async function syncPendingAutoFinal(){
    const final=surveys().didatica;
    if(!final||final.remoteSyncedAt||final.unlockSource!=="album_complete")return;
    try{await sendFinal(final);}catch(err){console.warn("v24 pending final survey",err);}
  }

  function updateCopy(){
    const header=$("#screen-pesquisas .section-head p");
    if(header)header.textContent="A Pesquisa Inicial fica disponível desde o início. A Pesquisa Final é liberada automaticamente quando o aluno completa 36/36 figurinhas; professor ou gestão também podem liberá-la antecipadamente.";
    const control=$("#institutionalAssignments .hint");
    if(control)control.textContent="Professor, Gestor Escolar e Administrador podem solicitar avaliações e liberar antecipadamente a Pesquisa Final. Ao completar o álbum 36/36, ela é liberada automaticamente para o aluno.";
  }

  function observe(){
    const screen=$("#screen-pesquisas");if(!screen)return;
    const observer=new MutationObserver(()=>{updateCopy();setTimeout(unlockFinalUI,0);});
    observer.observe(screen,{childList:true,subtree:true,attributes:true,attributeFilter:["class","disabled"]});
  }

  function init(){
    updateCopy();observe();
    document.addEventListener("submit",captureFinalSubmit,true);
    document.addEventListener("click",e=>{if(e.target.closest("#surveyTabs button"))setTimeout(unlockFinalUI,30);},true);
    window.addEventListener("dupla:album-complete",()=>{setTimeout(()=>{updateCopy();unlockFinalUI();},30);});
    window.addEventListener("online",syncPendingAutoFinal);
    if(albumComplete())albumCompletedAt();
    syncPendingAutoFinal();
  }
  window.DuplaSurveyV24={albumComplete,unlockFinalUI,syncPendingAutoFinal};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
