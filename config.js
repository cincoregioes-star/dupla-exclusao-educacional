window.APP_CONFIG = {
  appName: "Dupla Exclusão",
  school: "E.M.E.F. Pedro de Queiroz Ferreira",
  supabase: {
    enabled: true,
    url: "https://byajgsbilwiojdowqnlp.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5YWpnc2JpbHdpb2pkb3dxbmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDk4OTksImV4cCI6MjA5NTA4NTg5OX0.8dPKeljYWpDGJNMJSAXV8J37Poz90oUz53xFhJ63sGY",
    attemptsTable: "student_attempts",
    surveysTable: "survey_responses",
    schoolCode: "PQF"
  }
};

window.DuplaAssignments = (() => {
  "use strict";
  let cacheKey = "", cacheItems = [], cacheAt = 0;
  const state = () => { try { return JSON.parse(localStorage.getItem("dupla_exclusao_state_v2") || "null") || {}; } catch { return {}; } };
  const profile = () => state().profile || {};
  async function fetchForStudent({force=false} = {}){
    const p = profile(), s = window.APP_CONFIG?.supabase || {};
    if(!navigator.onLine || !s.enabled || !s.url || !s.anonKey || !String(p.studentCode||"").trim() || !String(p.classGroup||"").trim()) return [];
    const key = `${String(p.studentCode).trim()}|${String(p.classGroup).trim()}`;
    if(!force && cacheKey === key && Date.now()-cacheAt < 15000) return cacheItems;
    const response = await fetch(`${s.url.replace(/\/$/,"")}/functions/v1/dupla-exclusao-assignments`,{
      method:"POST",
      headers:{apikey:s.anonKey,"Content-Type":"application/json"},
      body:JSON.stringify({student_code:String(p.studentCode).trim(),class_group:String(p.classGroup).trim()})
    });
    if(!response.ok) throw new Error(await response.text());
    cacheItems = await response.json();
    cacheKey = key; cacheAt = Date.now();
    return cacheItems;
  }
  function invalidate(){ cacheKey=""; cacheItems=[]; cacheAt=0; }
  return {fetchForStudent,invalidate,cached:()=>cacheItems};
})();

(() => {
  "use strict";
  const APP_STATE_KEY = "dupla_exclusao_state_v2";
  const SURVEY_KEY = "dupla_exclusao_surveys_v1";

  const PERCEPTION_OPTIONS = ["Concordo totalmente", "Concordo", "Tenho dúvidas", "Discordo"];
  const PERCEPTION_QUESTIONS = [
    "Piadas ou apelidos relacionados à cor da pele podem ser formas de racismo.",
    "Uma pessoa pode sofrer racismo mesmo sem haver insulto explícito.",
    "Tratar um estudante com deficiência como incapaz é uma forma de capacitismo.",
    "Estudantes com deficiência devem participar das mesmas atividades, com os recursos de acessibilidade de que necessitem.",
    "Racismo e capacitismo podem atingir ao mesmo tempo um estudante negro com deficiência.",
    "Excluir alguém de grupos ou atividades por preconceito é uma forma de discriminação.",
    "Quando presencio preconceito, devo intervir de forma segura ou procurar um adulto responsável.",
    "A escola deve conversar regularmente sobre racismo, capacitismo e respeito às diferenças.",
    "Eu sei a quem pedir ajuda na escola se presenciar ou sofrer discriminação.",
    "Eu também sou responsável por contribuir para uma convivência escolar respeitosa e inclusiva."
  ];
  const SURVEYS = [
    {
      id: "convivencia",
      title: "Pesquisa Inicial — Percepções sobre Racismo, Deficiência e Convivência Escolar",
      tab: "Pesquisa Inicial",
      description: "Linha de base aplicada no início da experiência. Registra as percepções do estudante antes do percurso pedagógico.",
      requiresRelease: false,
      questions: PERCEPTION_QUESTIONS.map(q => [q, PERCEPTION_OPTIONS])
    },
    {
      id: "didatica",
      title: "Pesquisa Final — Mudanças de Percepção sobre Racismo, Deficiência e Convivência Escolar",
      tab: "Pesquisa Final",
      description: "Aplicada somente quando liberada por professor ou gestão. Repete os mesmos indicadores da pesquisa inicial para permitir comparação antes × depois.",
      requiresRelease: true,
      questions: PERCEPTION_QUESTIONS.map(q => [q, PERCEPTION_OPTIONS])
    }
  ];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const readAppState = () => { try { return JSON.parse(localStorage.getItem(APP_STATE_KEY) || "null") || {}; } catch { return {}; } };
  const readSurveyState = () => { try { return JSON.parse(localStorage.getItem(SURVEY_KEY) || "{}") || {}; } catch { return {}; } };
  const saveSurveyState = data => localStorage.setItem(SURVEY_KEY, JSON.stringify(data));

  async function syncSurveySubmission(submission){
    const s = window.APP_CONFIG?.supabase || {};
    if(!navigator.onLine || !s.enabled || !s.url || !s.anonKey || !submission || submission.remoteSyncedAt) return false;
    const payload = {
      device_id: readAppState().deviceId || null,
      student_code: submission.studentCode,
      student_name: submission.studentName,
      class_group: submission.classGroup,
      school_code: s.schoolCode || "PQF",
      survey_id: submission.id,
      survey_title: submission.title,
      assignment_id: submission.assignmentId || null,
      responses: submission.responses || [],
      completed_at: submission.completedAt
    };
    try {
      const response = await fetch(`${s.url.replace(/\/$/, "")}/rest/v1/${encodeURIComponent(s.surveysTable || "survey_responses")}`, {
        method: "POST",
        headers: {
          apikey: s.anonKey,
          Authorization: `Bearer ${s.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload)
      });
      if(!response.ok && response.status !== 409) throw new Error(await response.text());
      const all = readSurveyState();
      if(all[submission.id]) {
        all[submission.id].remoteSyncedAt = new Date().toISOString();
        saveSurveyState(all);
      }
      return true;
    } catch(error) {
      console.warn("survey sync", error);
      return false;
    }
  }

  async function syncPendingSurveys(){
    const all = readSurveyState();
    for(const submission of Object.values(all)) {
      if(submission && !submission.remoteSyncedAt) await syncSurveySubmission(submission);
    }
  }
  const completed = id => (readAppState().attempts || []).some(a => Number(a.simuladoId) === Number(id));
  const profile = () => readAppState().profile || {};
  const profileReady = () => {
    const p = profile();
    return Boolean(String(p.name || "").trim() && String(p.classGroup || "").trim() && String(p.studentCode || "").trim());
  };

  function installStyles(){
    const style = document.createElement("style");
    style.textContent = `
      .survey-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.survey-tabs button{border:1px solid #735d10;background:#132a47;color:#fff;font-weight:900;border-radius:11px;padding:10px 14px;cursor:pointer}.survey-tabs button.active{background:linear-gradient(180deg,#ffda5e,#e9b52c);color:#171300}.survey-intro{padding:20px;margin-bottom:16px}.survey-intro h3{margin:0 0 8px;color:var(--gold)}.survey-intro p{margin:0;color:#d8e1ef}.survey-form{display:grid;gap:14px}.survey-question{background:linear-gradient(180deg,rgba(18,36,59,.96),rgba(10,24,42,.96));border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:var(--shadow)}.survey-question h3{font-size:1.04rem;margin:0 0 12px}.survey-options{display:grid;gap:8px}.survey-option{display:flex;gap:10px;align-items:flex-start;background:#09182b;border:1px solid #294565;border-radius:11px;padding:10px 12px;cursor:pointer}.survey-option:hover{border-color:#e9b52c}.survey-option input{margin-top:3px;accent-color:#e9b52c}.survey-text{margin-top:10px}.survey-text label{display:block;color:var(--muted);font-size:.85rem;font-weight:800;margin-bottom:6px}.survey-text textarea{width:100%;min-height:74px;resize:vertical;background:#071525;color:#fff;border:1px solid #36577d;border-radius:10px;padding:10px;font:inherit}.survey-complete{display:inline-block;margin-top:10px;background:#123d2c;border:1px solid #2d8a60;color:#baf7d7;padding:6px 9px;border-radius:999px;font-size:.78rem;font-weight:900}.survey-locked{margin-top:12px;background:#251f10;border:1px solid #80651a;color:#fbe7a0;padding:12px;border-radius:12px}.sim-card.enh-locked{opacity:.7}.sim-card.enh-complete{border-color:#2d8a60}.sim-enh-note{font-size:.83rem;font-weight:800;margin-top:8px;color:#f5d66d}.sim-card.enh-complete .sim-enh-note{color:#86efac}.survey-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.survey-actions button{border-radius:11px;padding:11px 16px;font-weight:900;border:1px solid transparent;background:linear-gradient(180deg,#ffda5e,#e9b52c);color:#171300}.survey-actions button:disabled{opacity:.45;cursor:not-allowed}@media(max-width:680px){.survey-tabs{display:grid;grid-template-columns:1fr}.survey-tabs button{width:100%}.survey-question{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  function installSurveyScreen(){
    const nav = document.querySelector("#nav");
    const simBtn = nav?.querySelector('[data-screen="simulados"]');
    if(nav && simBtn && !nav.querySelector('[data-screen="pesquisas"]')){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.screen = "pesquisas";
      btn.textContent = "Pesquisas";
      simBtn.insertAdjacentElement("afterend", btn);
    }

    const main = document.querySelector("main");
    const progress = document.querySelector("#screen-progresso");
    if(main && progress && !document.querySelector("#screen-pesquisas")){
      const section = document.createElement("section");
      section.id = "screen-pesquisas";
      section.className = "screen";
      section.innerHTML = `
        <div class="section-head"><div><span class="eyebrow">ESCUTA DOS ESTUDANTES</span><h2>Pesquisas</h2><p>Duas pesquisas com 10 perguntas cada. Além das alternativas, todas oferecem “Nenhuma das opções acima” e um campo para complementar a resposta.</p></div></div>
        <div id="surveyTabs" class="survey-tabs"></div>
        <div id="surveyIntro" class="panel survey-intro"></div>
        <form id="surveyForm" class="survey-form">
          <div id="surveyQuestions"></div>
          <div id="surveyStatus" class="status-note"></div>
          <div class="survey-actions"><button id="surveySaveBtn" type="submit">Salvar pesquisa</button></div>
        </form>`;
      main.insertBefore(section, progress);
    }

    const actions = document.querySelector("#screen-professor .action-stack");
    if(actions && !document.querySelector("#exportSurveyCsvBtn")){
      const btn = document.createElement("button");
      btn.id = "exportSurveyCsvBtn";
      btn.type = "button";
      btn.className = "secondary";
      btn.textContent = "Exportar pesquisas CSV";
      actions.appendChild(btn);
      btn.addEventListener("click", exportSurveys);
    }
  }

  let activeSurvey = "convivencia";
  async function releaseForSurvey(survey){
    if(!survey?.requiresRelease) return {assignment_id:null};
    if(!profileReady() || !navigator.onLine) return null;
    try{
      const assignments = await window.DuplaAssignments.fetchForStudent();
      return assignments.find(a => a.activity_type === "pesquisa_final" && a.survey_id === "didatica") || null;
    }catch(error){ console.warn("survey release",error); return null; }
  }

  async function renderSurvey(){
    const tabs = document.querySelector("#surveyTabs");
    const intro = document.querySelector("#surveyIntro");
    const questions = document.querySelector("#surveyQuestions");
    const form = document.querySelector("#surveyForm");
    const status = document.querySelector("#surveyStatus");
    const saveBtn = document.querySelector("#surveySaveBtn");
    if(!tabs || !intro || !questions || !form || !status || !saveBtn) return;

    const survey = SURVEYS.find(s => s.id === activeSurvey) || SURVEYS[0];
    const savedAll = readSurveyState();
    const saved = savedAll[survey.id];
    const release = await releaseForSurvey(survey);
    const unlocked = !survey.requiresRelease || Boolean(release);
    const editable = unlocked && !saved;

    tabs.innerHTML = SURVEYS.map(s => `<button type="button" data-survey="${s.id}" class="${s.id===survey.id?"active":""}">${esc(s.tab)}${savedAll[s.id]?" ✓":""}</button>`).join("");
    tabs.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { activeSurvey = btn.dataset.survey; renderSurvey(); }));

    intro.innerHTML = `<h3>${esc(survey.title)}</h3><p>${esc(survey.description)}</p>${saved?'<span class="survey-complete">Pesquisa respondida e encerrada neste aparelho.</span>':''}${!unlocked?'<div class="survey-locked">🔒 Pesquisa Final aguardando liberação de professor ou gestão para este aluno/turma.</div>':''}`;

    questions.innerHTML = survey.questions.map((item, i) => {
      const prior = saved?.responses?.[i] || {};
      const opts = [...item[1], "Nenhuma das opções acima"];
      return `<article class="survey-question"><h3>${i+1}. ${esc(item[0])}</h3><div class="survey-options">${opts.map(o => `<label class="survey-option"><input type="radio" name="survey_q${i}" value="${esc(o)}" ${prior.choice===o?"checked":""} ${editable?"":"disabled"}><span>${esc(o)}</span></label>`).join("")}</div><div class="survey-text"><label for="survey_text${i}">Complemento / outra resposta (opcional)</label><textarea id="survey_text${i}" maxlength="500" placeholder="Escreva aqui se quiser explicar, complementar ou registrar outra resposta." ${editable?"":"disabled"}>${esc(prior.text || "")}</textarea></div></article>`;
    }).join("");

    form.dataset.survey = survey.id;
    form.dataset.assignmentId = release?.assignment_id || saved?.assignmentId || "";
    saveBtn.disabled = !editable;
    saveBtn.textContent = saved ? "Pesquisa já respondida" : "Salvar pesquisa";
    status.textContent = saved ? "Esta pesquisa já foi registrada. Para preservar a comparação antes × depois, ela não pode ser respondida novamente." : unlocked ? "Marque uma alternativa em cada pergunta. O campo de texto é opcional." : "A Pesquisa Final será liberada por professor ou gestão quando for o momento da comparação.";
  }

  async function saveSurvey(event){
    event.preventDefault();
    const survey = SURVEYS.find(s => s.id === document.querySelector("#surveyForm")?.dataset.survey);
    if(!survey) return;
    const alreadySaved = readSurveyState()[survey.id];
    if(alreadySaved){ alert("Esta pesquisa já foi respondida."); return; }
    const assignmentId = document.querySelector("#surveyForm")?.dataset.assignmentId || "";
    if(survey.requiresRelease && !assignmentId){ alert("A Pesquisa Final ainda não foi liberada para este aluno/turma."); return; }
    if(!profileReady()){
      alert("Identifique o aluno primeiro em ‘Começar / Identificar aluno’.");
      document.querySelector('[data-screen="perfil"]')?.click();
      return;
    }
    const responses = [];
    for(let i=0;i<survey.questions.length;i++){
      const selected = document.querySelector(`#surveyForm input[name="survey_q${i}"]:checked`);
      const text = document.querySelector(`#survey_text${i}`)?.value.trim() || "";
      if(!selected){ alert(`Responda a pergunta ${i+1}.`); return; }
      responses.push({question: survey.questions[i][0], choice: selected.value, text});
    }
    const p = profile();
    const all = readSurveyState();
    all[survey.id] = {id:survey.id,title:survey.title,assignmentId:assignmentId||null,studentName:p.name,studentCode:p.studentCode,classGroup:p.classGroup,responses,completedAt:new Date().toISOString()};
    saveSurveyState(all);
    const synced = await syncSurveySubmission(all[survey.id]);
    renderSurvey();
    const remoteMsg = synced ? " Resposta sincronizada com o painel institucional." : (navigator.onLine ? " A resposta ficou salva no aparelho e será sincronizada quando possível." : " A resposta ficou salva offline e será sincronizada quando houver internet.");
    if(survey.id === "didatica") window.DuplaAssignments?.invalidate?.();
    alert((survey.id === "convivencia" ? "Pesquisa Inicial salva. A Pesquisa Final será liberada pelo professor ou pela gestão no momento adequado." : "Pesquisa Final salva. Obrigado. A comparação antes × depois ficará disponível somente no ambiente institucional.") + remoteMsg);
  }

  function exportSurveys(){
    const all = Object.values(readSurveyState());
    if(!all.length){ alert("Nenhuma pesquisa respondida neste aparelho."); return; }
    const rows = [["Aluno","Código","Turma","Pesquisa","Pergunta","Alternativa","Complemento","Data"]];
    all.forEach(sub => (sub.responses || []).forEach(r => rows.push([sub.studentName,sub.studentCode,sub.classGroup,sub.title,r.question,r.choice,r.text,sub.completedAt])));
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dupla-exclusao-pesquisas.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function applySimLocks(){
    const list = document.querySelector("#simList");
    if(!list) return;
    const state = readAppState();
    const rewards = state.simRewards || {};
    list.querySelectorAll(".start-sim").forEach(btn => {
      const id = Number(btn.dataset.id);
      const card = btn.closest(".sim-card");
      card?.classList.remove("enh-locked","enh-complete");
      btn.disabled = false;
      btn.textContent = "Iniciar / refazer";
      btn.className = "primary start-sim";
      if(rewards[id]) card?.classList.add("enh-complete");
    });
  }

  function observeSimulados(){
    const list = document.querySelector("#simList");
    if(!list) return;
    const observer = new MutationObserver(() => applySimLocks());
    observer.observe(list, {childList:true,subtree:false});
    setTimeout(applySimLocks, 0);
  }

  installStyles();
  installSurveyScreen();
  window.addEventListener("online", () => { window.DuplaAssignments?.invalidate?.(); syncPendingSurveys(); renderSurvey(); });
  if(navigator.onLine) setTimeout(syncPendingSurveys, 1000);
  document.querySelector("#surveyForm")?.addEventListener("submit", saveSurvey);
  document.querySelectorAll('[data-screen="pesquisas"]').forEach(btn=>btn.addEventListener("click",()=>setTimeout(renderSurvey,0)));
  renderSurvey();
  observeSimulados();
})();
