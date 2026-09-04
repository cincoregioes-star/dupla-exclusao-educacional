window.APP_CONFIG = {
  appName: "Dupla Exclusão",
  school: "E.M.E.F. Pedro de Queiroz Ferreira",
  supabase: {
    enabled: false,
    url: "",
    anonKey: "",
    attemptsTable: "student_attempts"
  }
};

(() => {
  "use strict";
  const APP_STATE_KEY = "dupla_exclusao_state_v2";
  const SURVEY_KEY = "dupla_exclusao_surveys_v1";

  const SURVEYS = [
    {
      id: "convivencia",
      title: "Pesquisa 1 — Racismo, preconceito e convivência escolar",
      tab: "Racismo e convivência",
      description: "Escuta dos estudantes sobre racismo, preconceito, exclusão e atitudes entre colegas no cotidiano escolar.",
      finalOnly: false,
      questions: [
        ["Na sua escola, você já presenciou piadas ou apelidos relacionados à cor da pele?", ["Nunca", "Raramente", "Às vezes", "Frequentemente"]],
        ["Você percebe que estudantes negros podem ser tratados de forma diferente por outros alunos?", ["Não percebo", "Percebo raramente", "Percebo às vezes", "Percebo com frequência"]],
        ["Você já viu um estudante ser excluído de um grupo ou atividade por causa de preconceito?", ["Nunca", "Uma vez", "Algumas vezes", "Muitas vezes"]],
        ["Quando acontece uma fala preconceituosa entre alunos, como os colegas costumam reagir?", ["Intervêm e defendem a pessoa", "Procuram um adulto", "Ficam em silêncio", "Riem ou incentivam"]],
        ["Você se considera capaz de reconhecer uma situação de racismo na escola?", ["Sim, com segurança", "Na maioria das vezes", "Tenho dúvidas", "Ainda não"]],
        ["Os professores e a escola conversam sobre racismo, preconceito e respeito às diferenças?", ["Com frequência", "Às vezes", "Raramente", "Nunca"]],
        ["Como você avalia o respeito entre alunos de diferentes cores, origens e características?", ["Muito bom", "Bom", "Regular", "Precisa melhorar muito"]],
        ["Se você sofresse ou presenciasse preconceito, saberia a quem pedir ajuda na escola?", ["Sim", "Acho que sim", "Tenho dúvidas", "Não"]],
        ["Qual situação de preconceito você considera mais comum entre estudantes?", ["Piadas e apelidos", "Exclusão de grupos", "Comentários em redes sociais", "Tratamento desigual"]],
        ["O que a escola deveria priorizar para reduzir preconceito e racismo?", ["Debates e oficinas", "Projetos educativos", "Acolhimento e canais de denúncia", "Maior acompanhamento da convivência"]]
      ]
    },
    {
      id: "didatica",
      title: "Pesquisa 2 — Didática do álbum e experiência de aprendizagem",
      tab: "Didática do álbum",
      description: "Pesquisa final sobre clareza, interesse, aprendizagem e utilidade do álbum, simulados e game.",
      finalOnly: true,
      questions: [
        ["O álbum ajudou você a compreender o que significa dupla exclusão?", ["Ajudou muito", "Ajudou", "Ajudou pouco", "Não ajudou"]],
        ["As figurinhas e imagens facilitaram a compreensão dos temas?", ["Facilitaram muito", "Facilitaram", "Facilitaram pouco", "Não facilitaram"]],
        ["Os textos do álbum foram claros e adequados para sua idade?", ["Muito claros", "Claros", "Pouco claros", "Difíceis"]],
        ["Os simulados ajudaram a revisar e fixar o conteúdo?", ["Ajudaram muito", "Ajudaram", "Ajudaram pouco", "Não ajudaram"]],
        ["O game contribuiu para tornar a atividade mais interessante?", ["Contribuiu muito", "Contribuiu", "Contribuiu pouco", "Não contribuiu"]],
        ["Foi fácil navegar pelas telas, páginas e funções do aplicativo?", ["Muito fácil", "Fácil", "Um pouco difícil", "Difícil"]],
        ["A sequência álbum, simulados e atividades ajudou na aprendizagem?", ["Ajudou muito", "Ajudou", "Ajudou pouco", "Não ajudou"]],
        ["A proposta aumentou sua vontade de participar e aprender sobre inclusão e respeito?", ["Aumentou muito", "Aumentou", "Aumentou pouco", "Não aumentou"]],
        ["Você considera esse recurso adequado para ser usado com outras turmas?", ["Sim, totalmente", "Sim, com pequenos ajustes", "Talvez", "Não"]],
        ["Você gostaria que a escola utilizasse outros conteúdos nesse mesmo formato digital?", ["Sim, muitos", "Sim, alguns", "Talvez", "Não"]]
      ]
    }
  ];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const readAppState = () => { try { return JSON.parse(localStorage.getItem(APP_STATE_KEY) || "null") || {}; } catch { return {}; } };
  const readSurveyState = () => { try { return JSON.parse(localStorage.getItem(SURVEY_KEY) || "{}") || {}; } catch { return {}; } };
  const saveSurveyState = data => localStorage.setItem(SURVEY_KEY, JSON.stringify(data));
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
  function surveyUnlocked(survey){ return !survey.finalOnly || completed(10); }

  function renderSurvey(){
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
    const unlocked = surveyUnlocked(survey);

    tabs.innerHTML = SURVEYS.map(s => `<button type="button" data-survey="${s.id}" class="${s.id===survey.id?"active":""}">${esc(s.tab)}${savedAll[s.id]?" ✓":""}</button>`).join("");
    tabs.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => { activeSurvey = btn.dataset.survey; renderSurvey(); }));

    intro.innerHTML = `<h3>${esc(survey.title)}</h3><p>${esc(survey.description)}</p>${saved?'<span class="survey-complete">Pesquisa já respondida — você pode revisar e salvar novamente.</span>':''}${!unlocked?'<div class="survey-locked">🔒 Pesquisa final bloqueada. Conclua o Simulado 10 para liberá-la.</div>':''}`;

    questions.innerHTML = survey.questions.map((item, i) => {
      const prior = saved?.responses?.[i] || {};
      const opts = [...item[1], "Nenhuma das opções acima"];
      return `<article class="survey-question"><h3>${i+1}. ${esc(item[0])}</h3><div class="survey-options">${opts.map(o => `<label class="survey-option"><input type="radio" name="survey_q${i}" value="${esc(o)}" ${prior.choice===o?"checked":""} ${unlocked?"":"disabled"}><span>${esc(o)}</span></label>`).join("")}</div><div class="survey-text"><label for="survey_text${i}">Complemento / outra resposta (opcional)</label><textarea id="survey_text${i}" maxlength="500" placeholder="Escreva aqui se quiser explicar, complementar ou registrar outra resposta." ${unlocked?"":"disabled"}>${esc(prior.text || "")}</textarea></div></article>`;
    }).join("");

    form.dataset.survey = survey.id;
    saveBtn.disabled = !unlocked;
    status.textContent = unlocked ? "Marque uma alternativa em cada pergunta. O campo de texto é opcional." : "Conclua a avaliação final para responder esta pesquisa.";
  }

  function saveSurvey(event){
    event.preventDefault();
    const survey = SURVEYS.find(s => s.id === document.querySelector("#surveyForm")?.dataset.survey);
    if(!survey || !surveyUnlocked(survey)) return;
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
    all[survey.id] = {id:survey.id,title:survey.title,studentName:p.name,studentCode:p.studentCode,classGroup:p.classGroup,responses,completedAt:new Date().toISOString()};
    saveSurveyState(all);
    renderSurvey();
    alert(survey.id === "convivencia" ? "Pesquisa salva. Ao final da experiência, responda também a pesquisa sobre a didática do álbum." : "Pesquisa final salva. Obrigado por avaliar a experiência de aprendizagem.");
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
    const attempts = state.attempts || [];
    const has = id => attempts.some(a => Number(a.simuladoId) === Number(id));
    list.querySelectorAll(".start-sim").forEach(btn => {
      const id = Number(btn.dataset.id);
      const card = btn.closest(".sim-card");
      card?.classList.remove("enh-locked","enh-complete");
      card?.querySelector(".sim-enh-note")?.remove();
      const note = document.createElement("div");
      note.className = "sim-enh-note";
      if(has(id)){
        btn.disabled = true;
        btn.textContent = "Concluído ✓";
        btn.className = "secondary start-sim";
        card?.classList.add("enh-complete");
        note.textContent = "Simulado concluído. Recompensa já entregue; novas figurinhas não podem ser obtidas repetindo esta etapa.";
      } else if(id > 1 && !has(id-1)){
        btn.disabled = true;
        btn.textContent = "Bloqueado";
        btn.className = "secondary start-sim";
        card?.classList.add("enh-locked");
        note.textContent = `🔒 Conclua o Simulado ${id-1} para desbloquear.`;
      } else {
        btn.disabled = false;
        btn.textContent = "Iniciar";
        btn.className = "primary start-sim";
        note.textContent = "Primeira conclusão libera a recompensa em pacotes de figurinhas.";
      }
      card?.querySelector("div")?.appendChild(note);
    });
    if(activeSurvey === "didatica") renderSurvey();
  }

  function observeSimulados(){
    const list = document.querySelector("#simList");
    if(!list) return;
    const observer = new MutationObserver(() => applySimLocks());
    observer.observe(list, {childList:true,subtree:true});
    setTimeout(applySimLocks, 0);
  }

  installStyles();
  installSurveyScreen();
  document.querySelector("#surveyForm")?.addEventListener("submit", saveSurvey);
  renderSurvey();
  observeSimulados();
})();
