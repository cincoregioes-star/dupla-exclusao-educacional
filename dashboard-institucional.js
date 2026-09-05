(() => {
  "use strict";

  const APP_STATE_KEY = "dupla_exclusao_state_v2";
  const SESSION_KEY = "dupla_exclusao_teacher_session_v1";
  const SURVEY_KEY = "dupla_exclusao_surveys_v1";
  const CFG = window.APP_CONFIG || {};
  let currentData = [];
  let currentSurveyData = [];
  let hideNames = false;

  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const pct = v => `${Math.round(Number(v) || 0)}%`;
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch { return fallback; } };
  const localAttempts = () => readJSON(APP_STATE_KEY, {}).attempts || [];
  const localSurveys = () => Object.values(readJSON(SURVEY_KEY, {}) || {});
  const teacherSession = () => readJSON(SESSION_KEY, null);
  const auth = () => window.DuplaInstitutionalAuth;

  const normalizeAttempt = x => ({
    id:x.id, deviceId:x.deviceId ?? x.device_id, studentCode:x.studentCode ?? x.student_code,
    studentName:x.studentName ?? x.student_name, classGroup:x.classGroup ?? x.class_group,
    simuladoId:Number(x.simuladoId ?? x.simulado_id), title:x.title, score:Number(x.score || 0),
    total:Number(x.total || 10), durationSeconds:Number((x.durationSeconds ?? x.duration_seconds) || 0),
    responses:x.responses || [], completedAt:x.completedAt ?? x.completed_at
  });

  const normalizeSurvey = x => ({
    id:x.id, deviceId:x.deviceId ?? x.device_id, studentCode:x.studentCode ?? x.student_code,
    studentName:x.studentName ?? x.student_name, classGroup:x.classGroup ?? x.class_group,
    surveyId:x.surveyId ?? x.survey_id ?? x.id, surveyTitle:x.surveyTitle ?? x.survey_title ?? x.title,
    responses:x.responses || [], completedAt:x.completedAt ?? x.completed_at
  });

  function injectStyles(){
    if($("#institutionalDashboardStyles")) return;
    const s=document.createElement("style"); s.id="institutionalDashboardStyles";
    s.textContent=`
      .institutional-dashboard{margin:18px 0 22px}.inst-title{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}.inst-title h3{margin:0;color:var(--gold);font-size:clamp(1.2rem,2.2vw,1.7rem)}.inst-title p{margin:4px 0 0;color:var(--muted)}
      .inst-filters{display:flex;gap:9px;flex-wrap:wrap;align-items:end;background:#09182b;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:14px}.inst-filters label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;font-weight:900}.inst-filters select{min-width:150px;background:#071525;color:#fff;border:1px solid #36577d;border-radius:10px;padding:9px}.inst-filters button{border-radius:10px;padding:9px 12px;font-weight:900}
      .inst-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:14px}.inst-kpi{background:linear-gradient(180deg,rgba(18,36,59,.96),rgba(10,24,42,.96));border:1px solid var(--line);border-left:4px solid #2f7df4;border-radius:15px;padding:14px;min-height:110px}.inst-kpi.good{border-left-color:#22c55e}.inst-kpi.warn{border-left-color:#eab52d}.inst-kpi.bad{border-left-color:#ef4444}.inst-kpi strong{display:block;color:var(--muted);font-size:.74rem;text-transform:uppercase}.inst-kpi b{display:block;font-size:1.7rem;margin-top:8px}.inst-kpi small{display:block;color:#c7d2e4;margin-top:5px;line-height:1.25}
      .inst-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.inst-card{background:linear-gradient(180deg,rgba(18,36,59,.96),rgba(10,24,42,.96));border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:var(--shadow)}.inst-card h4{margin:0 0 10px;color:#dbeafe}.inst-card .hint{color:var(--muted);font-size:.8rem;margin:-5px 0 12px}
      .iv-bars{display:flex;align-items:end;gap:8px;height:230px;border-left:1px solid #263b59;border-bottom:1px solid #263b59;padding:10px 8px 30px}.iv-col{flex:1;min-width:32px;height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;position:relative}.iv-bar{width:72%;min-height:3px;border-radius:9px 9px 2px 2px;background:linear-gradient(180deg,#2f7df4,#22c55e)}.iv-val{font-size:.72rem;font-weight:900;margin-bottom:4px}.iv-lab{position:absolute;bottom:-25px;font-size:.65rem;color:var(--muted);white-space:nowrap}
      .ih-row{display:grid;grid-template-columns:190px 1fr 58px;gap:9px;align-items:center;margin:9px 0;font-size:.82rem}.ih-track{height:11px;border-radius:99px;background:#071525;overflow:hidden}.ih-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#ef4444,#eab52d)}.ih-fill.good{background:linear-gradient(90deg,#2f7df4,#22c55e)}
      .inst-pie-wrap{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:center;min-height:210px}.inst-pie{width:170px;height:170px;border-radius:50%;display:grid;place-items:center;margin:auto}.inst-pie>span{width:105px;height:105px;border-radius:50%;background:#081323;display:grid;place-items:center;text-align:center;font-weight:900;padding:8px}.inst-legend{display:grid;gap:8px}.inst-legend div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #263b59;padding-bottom:6px}
      .inst-list{display:grid;gap:8px}.inst-item{display:grid;grid-template-columns:1fr auto;gap:12px;background:#09182b;border:1px solid #263b59;border-radius:12px;padding:10px}.inst-item b{color:var(--gold)}.inst-badge{border-radius:999px;padding:4px 8px;font-size:.72rem;font-weight:900}.inst-badge.bad{background:rgba(239,68,68,.16);color:#fecaca}.inst-badge.warn{background:rgba(234,181,45,.16);color:#fde68a}.inst-badge.good{background:rgba(34,197,94,.15);color:#bbf7d0}
      .inst-heat{overflow:auto}.inst-heat table{min-width:620px}.inst-heat td,.inst-heat th{text-align:center}.heat-good{background:rgba(34,197,94,.18)!important}.heat-warn{background:rgba(234,181,45,.18)!important}.heat-bad{background:rgba(239,68,68,.18)!important}
      .inst-report{white-space:pre-wrap;min-height:140px;max-height:360px;overflow:auto;background:#071525;border:1px solid #263b59;border-radius:12px;padding:12px;color:#dbe5f3;line-height:1.5}.inst-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.inst-tools button{border-radius:10px;padding:9px 12px;font-weight:900}
      .survey-dashboard-controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.survey-dashboard-controls label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;font-weight:900}.survey-dashboard-controls select{max-width:420px;background:#071525;color:#fff;border:1px solid #36577d;border-radius:10px;padding:9px}.survey-text-row{padding:9px 0;border-bottom:1px solid #263b59}.survey-text-row:last-child{border-bottom:0}.survey-text-row small{display:block;color:var(--muted);margin-bottom:3px}.survey-text-row p{margin:0}.inst-section-title{margin:24px 0 12px}.inst-section-title h3{margin:0;color:var(--gold)}
      @media(max-width:1100px){.inst-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.inst-kpis,.inst-grid{grid-template-columns:1fr}.inst-filters label,.inst-filters select,.inst-filters button,.survey-dashboard-controls label,.survey-dashboard-controls select{width:100%;max-width:none}.ih-row{grid-template-columns:1fr}.inst-pie-wrap{grid-template-columns:1fr}.iv-bars{height:190px;gap:3px}.iv-lab{font-size:.58rem}}
    `;
    document.head.appendChild(s);
  }

  function installUI(){
    const screen=$("#screen-professor"); if(!screen || $("#institutionalDashboard")) return;
    const root=document.createElement("section"); root.id="institutionalDashboard"; root.className="institutional-dashboard institutional-protected";
    root.innerHTML=`
      <div class="inst-title"><div><span class="eyebrow">INTELIGÊNCIA PEDAGÓGICA</span><h3>Dashboard institucional para tomada de decisão</h3><p>Indicadores para acompanhamento, intervenção e avaliação do projeto Dupla Exclusão.</p></div><div id="instDataSource" class="status-note"></div></div>
      <div class="inst-filters">
        <label>Turma<select id="instClass"><option value="">Todas as turmas</option></select></label>
        <label>Aluno<select id="instStudent"><option value="">Todos os alunos</option></select></label>
        <label>Simulado<select id="instSim"><option value="">Todos</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}">Simulado ${i+1}</option>`).join("")}</select></label>
        <button id="instRefresh" class="primary" type="button">Atualizar dashboard</button>
        <button id="instNames" class="secondary" type="button">Ocultar nomes</button>
        <button id="instAnonCsv" class="secondary" type="button">CSV anonimizado</button>
      </div>
      <div id="instKpis" class="inst-kpis"></div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Desempenho por simulado</h4><p class="hint">Barras verticais — média dos resultados filtrados.</p><div id="instVertical"></div></article>
        <article class="inst-card"><h4>Faixas de desempenho</h4><p class="hint">Pizza/rosca — visão rápida para tomada de decisão.</p><div id="instPie"></div></article>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Habilidades com maior dificuldade</h4><p class="hint">Barras horizontais — prioridades de intervenção.</p><div id="instHardSkills"></div></article>
        <article class="inst-card"><h4>Habilidades com melhor domínio</h4><p class="hint">Pontos fortes para consolidação.</p><div id="instStrongSkills"></div></article>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Evolução diagnóstico → avaliação final</h4><p class="hint">Comparação individual do Simulado 1 com o Simulado 10.</p><div id="instEvolution" class="inst-list"></div></article>
        <article class="inst-card"><h4>Nível de acompanhamento pedagógico</h4><p class="hint">Sinalização por média, sem ranking público.</p><div id="instRisk" class="inst-list"></div></article>
      </div>
      <article class="inst-card" style="margin-bottom:14px"><h4>Mapa de calor das habilidades por turma</h4><p class="hint">Verde = domínio; amarelo = atenção; vermelho = prioridade.</p><div id="instHeat" class="inst-heat"></div></article>
      <div class="inst-grid">
        <article class="inst-card"><h4>Plano automático de intervenção</h4><p class="hint">Sugestões calculadas a partir das dificuldades do recorte selecionado.</p><div id="instPlan" class="inst-list"></div></article>
        <article class="inst-card"><h4>Relatório pedagógico automático</h4><div class="inst-tools"><button id="instReportBtn" class="secondary" type="button">Gerar relatório</button><button id="instCopyBtn" class="secondary" type="button">Copiar relatório</button></div><div id="instReport" class="inst-report">Clique em “Gerar relatório”.</div></article>
      </div>
      <div class="inst-section-title"><span class="eyebrow">PESQUISAS</span><h3>Pesquisas institucionais</h3><p class="hint">Análise da convivência escolar e da didática do álbum.</p></div>
      <div class="survey-dashboard-controls">
        <label>Pesquisa<select id="instSurvey"><option value="convivencia">Racismo e convivência</option><option value="didatica">Didática do álbum</option></select></label>
        <label>Pergunta<select id="instSurveyQuestion"></select></label>
        <button id="instSurveyCsv" class="secondary" type="button">Exportar pesquisas CSV</button>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Distribuição das respostas</h4><p class="hint">Pizza/rosca da pergunta selecionada.</p><div id="instSurveyPie"></div></article>
        <article class="inst-card"><h4>Respostas por alternativa</h4><p class="hint">Barras horizontais da pergunta selecionada.</p><div id="instSurveyBars"></div></article>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Participação nas pesquisas</h4><div id="instSurveyParticipation" class="inst-list"></div></article>
        <article class="inst-card"><h4>Complementos escritos</h4><p class="hint">Respostas abertas relacionadas à pergunta selecionada.</p><div id="instSurveyTexts"></div></article>
      </div>`;
    const anchor=$("#teacherCards"); if(anchor) screen.insertBefore(root, anchor); else screen.appendChild(root);

    ["#instClass","#instStudent","#instSim"].forEach(id=>$(id)?.addEventListener("change",()=>{syncStudentFilter();render();}));
    $("#instRefresh")?.addEventListener("click",loadData);
    $("#instNames")?.addEventListener("click",()=>{hideNames=!hideNames;$("#instNames").textContent=hideNames?"Mostrar nomes":"Ocultar nomes";render();});
    $("#instAnonCsv")?.addEventListener("click",exportAnonCsv);
    $("#instReportBtn")?.addEventListener("click",generateReport);
    $("#instCopyBtn")?.addEventListener("click",copyReport);
    $("#instSurvey")?.addEventListener("change",()=>{populateSurveyQuestions();renderSurveys();});
    $("#instSurveyQuestion")?.addEventListener("change",renderSurveys);
    $("#instSurveyCsv")?.addEventListener("click",exportSurveyCsv);

    const oldSurveyBtn=$("#exportSurveyCsvBtn");
    oldSurveyBtn?.addEventListener("click", e=>{ if(auth()?.isAuthenticated?.()){e.preventDefault();e.stopImmediatePropagation();exportSurveyCsv();} }, true);
  }

  async function remoteAttempts(){
    const s=CFG.supabase||{}, sess=teacherSession();
    if(!s.enabled || !s.url || !s.anonKey || !sess?.access_token) return null;
    const endpoint=`${s.url.replace(/\/$/,"")}/rest/v1/${encodeURIComponent(s.attemptsTable||"student_attempts")}?select=*&order=completed_at.desc`;
    const r=await fetch(endpoint,{headers:{apikey:s.anonKey,Authorization:`Bearer ${sess.access_token}`}});
    if(!r.ok) throw new Error(`Resultados HTTP ${r.status}: ${await r.text()}`);
    return (await r.json()).map(normalizeAttempt);
  }

  async function remoteSurveys(){
    const s=CFG.supabase||{}, sess=teacherSession();
    if(!s.enabled || !s.url || !s.anonKey || !sess?.access_token) return null;
    const endpoint=`${s.url.replace(/\/$/,"")}/rest/v1/${encodeURIComponent(s.surveysTable||"survey_responses")}?select=*&order=completed_at.desc`;
    const r=await fetch(endpoint,{headers:{apikey:s.anonKey,Authorization:`Bearer ${sess.access_token}`}});
    if(!r.ok) throw new Error(`Pesquisas HTTP ${r.status}: ${await r.text()}`);
    return (await r.json()).map(normalizeSurvey);
  }

  async function loadData(){
    const status=$("#instDataSource");
    if(!auth()?.isAuthenticated?.()){
      currentData=[]; currentSurveyData=[];
      if(status) status.textContent="Acesso institucional necessário.";
      render(); return;
    }
    if(status) status.textContent="Atualizando dados institucionais...";
    try{
      const [remoteA,remoteS]=await Promise.all([remoteAttempts(),remoteSurveys()]);
      currentData=Array.isArray(remoteA)?remoteA:localAttempts().map(normalizeAttempt);
      currentSurveyData=Array.isArray(remoteS)?remoteS:localSurveys().map(normalizeSurvey);
      const profile=auth()?.getProfile?.();
      const role=auth()?.roleLabel?.(profile?.role)||profile?.role||"Acesso institucional";
      if(status) status.textContent=`${role} • ${currentData.length} resultado(s) • ${currentSurveyData.length} pesquisa(s)`;
    }catch(e){
      console.warn("dashboard remote",e);
      currentData=localAttempts().map(normalizeAttempt);
      currentSurveyData=localSurveys().map(normalizeSurvey);
      if(status) status.textContent=`Falha na atualização remota; mostrando dados locais deste aparelho.`;
    }
    populateFilters(); populateSurveyQuestions(); render();
  }

  function populateFilters(){
    const c=$("#instClass"), s=$("#instStudent"); if(!c||!s)return;
    const oldC=c.value, oldS=s.value;
    const allRows=[...currentData,...currentSurveyData];
    const classes=[...new Set(allRows.map(a=>a.classGroup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    c.innerHTML='<option value="">Todas as turmas</option>'+classes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(classes.includes(oldC))c.value=oldC;
    syncStudentFilter(oldS);
  }

  function syncStudentFilter(preferred){
    const s=$("#instStudent"), c=$("#instClass"); if(!s)return;
    const selected=preferred??s.value, list=[...currentData,...currentSurveyData].filter(a=>!c?.value||a.classGroup===c.value), students=new Map();
    list.forEach(a=>{const key=a.studentCode||a.deviceId;if(key)students.set(key,{code:key,name:a.studentName||key});});
    s.innerHTML='<option value="">Todos os alunos</option>'+[...students.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(v=>`<option value="${esc(v.code)}">${esc(v.name)}</option>`).join("");
    if([...students.keys()].includes(selected))s.value=selected;
  }

  function filteredAttempts(){
    const c=$("#instClass")?.value||"", st=$("#instStudent")?.value||"", sim=Number($("#instSim")?.value||0);
    return currentData.filter(a=>(!c||a.classGroup===c)&&(!st||(a.studentCode||a.deviceId)===st)&&(!sim||a.simuladoId===sim));
  }
  function filteredSurveys(){
    const c=$("#instClass")?.value||"", st=$("#instStudent")?.value||"";
    return currentSurveyData.filter(a=>(!c||a.classGroup===c)&&(!st||(a.studentCode||a.deviceId)===st));
  }

  function studentGroups(data){const m=new Map();data.forEach(a=>{const k=a.studentCode||a.deviceId;if(!k)return;if(!m.has(k))m.set(k,{key:k,name:a.studentName||k,classGroup:a.classGroup||"",attempts:[]});m.get(k).attempts.push(a)});return [...m.values()];}
  function average(data){return data.length?data.reduce((sum,a)=>sum+(a.total?Number(a.score)/Number(a.total)*100:0),0)/data.length:0;}
  function skillStats(data){const m={};data.forEach(a=>(a.responses||[]).forEach(r=>{const k=r.skill||"sem_habilidade";m[k]??={ok:0,total:0};m[k].total++;if(r.ok)m[k].ok++;}));return Object.entries(m).map(([skill,v])=>({skill,ok:v.ok,total:v.total,pct:v.total?v.ok/v.total*100:0}));}
  function displayName(s,index){return hideNames?`Aluno ${String(index+1).padStart(2,"0")}`:s.name;}

  function render(){
    const data=filteredAttempts(), students=studentGroups(data), avg=average(data), highest=data.length?Math.max(...data.map(a=>a.total?a.score/a.total*100:0)):0;
    const low=students.filter(s=>average(s.attempts)<50).length, attention=students.filter(s=>{const v=average(s.attempts);return v>=50&&v<70}).length;
    const finals=new Set(data.filter(a=>a.simuladoId===10).map(a=>a.studentCode||a.deviceId)).size;
    const surveys=filteredSurveys();
    const kpis=$("#instKpis"); if(kpis) kpis.innerHTML=`
      <div class="inst-kpi"><strong>Alunos</strong><b>${students.length}</b><small>No recorte de simulados</small></div>
      <div class="inst-kpi"><strong>Resultados</strong><b>${data.length}</b><small>Simulados concluídos</small></div>
      <div class="inst-kpi good"><strong>Média geral</strong><b>${pct(avg)}</b><small>Desempenho filtrado</small></div>
      <div class="inst-kpi good"><strong>Maior resultado</strong><b>${pct(highest)}</b><small>Melhor desempenho</small></div>
      <div class="inst-kpi bad"><strong>Abaixo de 50%</strong><b>${low}</b><small>Intervenção prioritária</small></div>
      <div class="inst-kpi warn"><strong>Pesquisas</strong><b>${surveys.length}</b><small>Respostas no recorte</small></div>`;
    renderVertical(data); renderPerformancePie(students); renderSkills(data); renderEvolution(data); renderRisk(students); renderHeat(data); renderPlan(data,students); renderSurveys();
    const status=$("#instDataSource"); if(status && finals && !status.textContent.includes("avaliação")) status.textContent += ` • ${finals} avaliação(ões) final(is)`;
  }

  function renderVertical(data){
    const agg=Array.from({length:10},(_,i)=>{const rows=data.filter(a=>a.simuladoId===i+1);return{id:i+1,pct:average(rows),n:rows.length};});
    $("#instVertical").innerHTML=data.length?`<div class="iv-bars">${agg.map(x=>`<div class="iv-col"><span class="iv-val">${x.n?pct(x.pct):"—"}</span><div class="iv-bar" style="height:${Math.max(2,x.pct)}%"></div><span class="iv-lab">S${x.id}</span></div>`).join("")}</div>`:'<p class="status-note">Sem dados no recorte selecionado.</p>';
  }
  function renderPerformancePie(students){
    const bands={priority:0,attention:0,good:0};students.forEach(s=>{const a=average(s.attempts);if(a<50)bands.priority++;else if(a<70)bands.attention++;else bands.good++;});
    const total=students.length||1,p1=bands.priority/total*100,p2=bands.attention/total*100;
    $("#instPie").innerHTML=students.length?`<div class="inst-pie-wrap"><div class="inst-pie" style="background:conic-gradient(#ef4444 0 ${p1}%,#eab52d ${p1}% ${p1+p2}%,#22c55e ${p1+p2}% 100%)"><span>${students.length}<br><small>alunos</small></span></div><div class="inst-legend"><div><span>Prioridade &lt; 50%</span><b>${bands.priority}</b></div><div><span>Atenção 50–69%</span><b>${bands.attention}</b></div><div><span>Domínio ≥ 70%</span><b>${bands.good}</b></div></div></div>`:'<p class="status-note">Sem alunos no recorte.</p>';
  }
  function barsHtml(stats,good=false){return stats.map(s=>`<div class="ih-row"><span>${esc(s.skill.replaceAll("_"," "))}</span><div class="ih-track"><div class="ih-fill ${good?"good":""}" style="width:${Math.max(2,s.pct)}%"></div></div><b>${pct(s.pct)}</b></div>`).join("")||'<p class="status-note">Sem dados de habilidades.</p>';}
  function renderSkills(data){const st=skillStats(data);$("#instHardSkills").innerHTML=barsHtml([...st].sort((a,b)=>a.pct-b.pct).slice(0,8));$("#instStrongSkills").innerHTML=barsHtml([...st].sort((a,b)=>b.pct-a.pct).slice(0,8),true);}
  function renderEvolution(data){
    const all=studentGroups(data.filter(a=>a.simuladoId===1||a.simuladoId===10));
    const rows=all.map(s=>{const d=s.attempts.filter(a=>a.simuladoId===1),f=s.attempts.filter(a=>a.simuladoId===10);if(!d.length||!f.length)return null;const dp=Math.max(...d.map(a=>a.score/a.total*100)),fp=Math.max(...f.map(a=>a.score/a.total*100));return{...s,diag:dp,final:fp,delta:fp-dp};}).filter(Boolean).sort((a,b)=>b.delta-a.delta);
    $("#instEvolution").innerHTML=rows.length?rows.slice(0,12).map((s,i)=>`<div class="inst-item"><div><b>${esc(displayName(s,i))}</b><br><small>${esc(s.classGroup)} • ${pct(s.diag)} → ${pct(s.final)}</small></div><span class="inst-badge ${s.delta>=0?'good':'bad'}">${s.delta>=0?'+':''}${Math.round(s.delta)} p.p.</span></div>`).join(""):'<p class="status-note">A evolução aparecerá quando houver diagnóstico e avaliação final do mesmo aluno.</p>';
  }
  function renderRisk(students){
    const rows=[...students].map(s=>({...s,avg:average(s.attempts)})).sort((a,b)=>a.avg-b.avg);
    $("#instRisk").innerHTML=rows.length?rows.slice(0,15).map((s,i)=>{const cls=s.avg<50?'bad':s.avg<70?'warn':'good',label=s.avg<50?'Prioridade':s.avg<70?'Atenção':'Acompanhado';return`<div class="inst-item"><div><b>${esc(displayName(s,i))}</b><br><small>${esc(s.classGroup)} • ${s.attempts.length} etapa(s)</small></div><span class="inst-badge ${cls}">${label} • ${pct(s.avg)}</span></div>`}).join(""):'<p class="status-note">Sem dados de alunos.</p>';
  }
  function renderHeat(data){
    const classes=[...new Set(data.map(a=>a.classGroup).filter(Boolean))].sort(),skills=[...new Set(data.flatMap(a=>(a.responses||[]).map(r=>r.skill).filter(Boolean)))];
    if(!classes.length||!skills.length){$("#instHeat").innerHTML='<p class="status-note">O mapa de calor aparecerá quando houver dados por turma e habilidade.</p>';return;}
    const rows=skills.slice(0,12).map(skill=>{const cells=classes.map(cls=>{const rs=data.filter(a=>a.classGroup===cls).flatMap(a=>(a.responses||[]).filter(x=>x.skill===skill));const v=rs.length?rs.filter(x=>x.ok).length/rs.length*100:NaN,c=Number.isNaN(v)?'':v<50?'heat-bad':v<70?'heat-warn':'heat-good';return`<td class="${c}">${Number.isNaN(v)?'—':pct(v)}</td>`}).join("");return`<tr><th style="text-align:left">${esc(skill.replaceAll('_',' '))}</th>${cells}</tr>`}).join('');
    $("#instHeat").innerHTML=`<table><thead><tr><th style="text-align:left">Habilidade</th>${classes.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  function renderPlan(data,students){
    const hard=[...skillStats(data)].sort((a,b)=>a.pct-b.pct).slice(0,3),low=students.filter(s=>average(s.attempts)<50).length,items=[];
    if(low)items.push(`<div class="inst-item"><div><b>Acompanhamento prioritário</b><br><small>${low} aluno(s) abaixo de 50%. Retomar conceitos em pequenos grupos e usar nova atividade formativa após a intervenção.</small></div><span class="inst-badge bad">Alta</span></div>`);
    hard.forEach((s,i)=>items.push(`<div class="inst-item"><div><b>${esc(s.skill.replaceAll('_',' '))}</b><br><small>Domínio atual: ${pct(s.pct)}. Retomar o tema com exemplo concreto, discussão orientada e nova situação-problema.</small></div><span class="inst-badge ${s.pct<50?'bad':'warn'}">${i+1}ª prioridade</span></div>`));
    $("#instPlan").innerHTML=items.join('')||'<p class="status-note">Sem dados suficientes para gerar intervenção automática.</p>';
  }

  function populateSurveyQuestions(){
    const surveyId=$("#instSurvey")?.value||"convivencia",select=$("#instSurveyQuestion");if(!select)return;
    const rows=filteredSurveys().filter(s=>s.surveyId===surveyId);const questions=[];
    rows.forEach(s=>(s.responses||[]).forEach((r,i)=>{if(!questions[i])questions[i]=r.question||`Pergunta ${i+1}`;}));
    const previous=Number(select.value||0);
    select.innerHTML=(questions.length?questions:Array.from({length:10},(_,i)=>`Pergunta ${i+1}`)).map((q,i)=>`<option value="${i}">${i+1}. ${esc(q)}</option>`).join("");
    if(previous<select.options.length)select.value=String(previous);
  }

  function surveySlice(){
    const surveyId=$("#instSurvey")?.value||"convivencia",q=Number($("#instSurveyQuestion")?.value||0);
    const rows=filteredSurveys().filter(s=>s.surveyId===surveyId);
    return{surveyId,q,rows,answers:rows.map(s=>({submission:s,response:s.responses?.[q]})).filter(x=>x.response)};
  }
  function renderSurveys(){
    if(!$("#instSurveyPie"))return;
    populateSurveyQuestions();
    const {surveyId,q,rows,answers}=surveySlice();
    const counts=new Map();answers.forEach(x=>counts.set(x.response.choice||"Sem resposta",(counts.get(x.response.choice||"Sem resposta")||0)+1));
    const total=answers.length||1,entries=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
    const colors=["#2f7df4","#22c55e","#eab52d","#ef4444","#a78bfa","#38bdf8"];
    let acc=0;const stops=entries.map(([label,n],i)=>{const start=acc,end=acc+n/total*100;acc=end;return`${colors[i%colors.length]} ${start}% ${end}%`;}).join(',');
    $("#instSurveyPie").innerHTML=answers.length?`<div class="inst-pie-wrap"><div class="inst-pie" style="background:conic-gradient(${stops})"><span>${answers.length}<br><small>respostas</small></span></div><div class="inst-legend">${entries.map(([label,n])=>`<div><span>${esc(label)}</span><b>${n} • ${pct(n/answers.length*100)}</b></div>`).join('')}</div></div>`:'<p class="status-note">Sem respostas para esta pergunta no recorte.</p>';
    $("#instSurveyBars").innerHTML=entries.length?entries.map(([label,n])=>`<div class="ih-row"><span>${esc(label)}</span><div class="ih-track"><div class="ih-fill good" style="width:${n/answers.length*100}%"></div></div><b>${pct(n/answers.length*100)}</b></div>`).join(''):'<p class="status-note">Sem respostas.</p>';

    const all=filteredSurveys(),conv=new Set(all.filter(s=>s.surveyId==='convivencia').map(s=>s.studentCode||s.deviceId)).size,did=new Set(all.filter(s=>s.surveyId==='didatica').map(s=>s.studentCode||s.deviceId)).size;
    $("#instSurveyParticipation").innerHTML=`<div class="inst-item"><div><b>Racismo e convivência</b><br><small>Pesquisa diagnóstica/perceptiva</small></div><span class="inst-badge good">${conv} aluno(s)</span></div><div class="inst-item"><div><b>Didática do álbum</b><br><small>Pesquisa final da experiência</small></div><span class="inst-badge ${did?'good':'warn'}">${did} aluno(s)</span></div>`;
    const texts=answers.filter(x=>String(x.response.text||'').trim());
    $("#instSurveyTexts").innerHTML=texts.length?texts.slice(0,20).map((x,i)=>`<div class="survey-text-row"><small>${hideNames?`Aluno ${String(i+1).padStart(2,'0')}`:esc(x.submission.studentName||'Aluno')} • ${esc(x.submission.classGroup||'')}</small><p>${esc(x.response.text)}</p></div>`).join(''):'<p class="status-note">Nenhum complemento escrito nesta pergunta.</p>';
  }

  function generateReport(){
    const data=filteredAttempts(),surveys=filteredSurveys(),students=studentGroups(data),avg=average(data),hard=[...skillStats(data)].sort((a,b)=>a.pct-b.pct).slice(0,3),strong=[...skillStats(data)].sort((a,b)=>b.pct-a.pct).slice(0,3);
    const classLabel=$("#instClass")?.value||"todas as turmas",studentLabel=$("#instStudent")?.selectedOptions?.[0]?.textContent||"todos os alunos",simLabel=$("#instSim")?.selectedOptions?.[0]?.textContent||"todos os simulados";
    const low=students.filter(s=>average(s.attempts)<50).length,attention=students.filter(s=>{const a=average(s.attempts);return a>=50&&a<70}).length;
    $("#instReport").textContent=`RELATÓRIO PEDAGÓGICO — DUPLA EXCLUSÃO\nDASHBOARD INSTITUCIONAL PARA TOMADA DE DECISÃO\n\nRecorte: ${classLabel} | ${studentLabel} | ${simLabel}\nResultados analisados: ${data.length}\nEstudantes: ${students.length}\nMédia geral: ${pct(avg)}\nAbaixo de 50%: ${low}\nFaixa de atenção (50% a 69%): ${attention}\nPesquisas registradas: ${surveys.length}\n\nHabilidades prioritárias:\n${hard.length?hard.map((s,i)=>`${i+1}. ${s.skill.replaceAll('_',' ')} — ${pct(s.pct)}`).join('\n'):'Sem dados suficientes.'}\n\nPontos fortes:\n${strong.length?strong.map((s,i)=>`${i+1}. ${s.skill.replaceAll('_',' ')} — ${pct(s.pct)}`).join('\n'):'Sem dados suficientes.'}\n\nEncaminhamento sugerido:\nPriorizar as habilidades com menor domínio, organizar retomada pedagógica com situações concretas de racismo, capacitismo, acessibilidade e convivência, acompanhar os estudantes sinalizados e comparar o diagnóstico inicial com a avaliação final. Usar as pesquisas para identificar percepções de convivência e avaliar a didática do álbum.\n\nPrivacidade: resultados individuais devem permanecer em ambiente restrito e ser utilizados exclusivamente para acompanhamento pedagógico.`;
  }
  async function copyReport(){const t=$("#instReport")?.textContent||"";if(!t||t.startsWith("Clique"))return;try{await navigator.clipboard.writeText(t);alert("Relatório copiado.");}catch{alert("Não foi possível copiar automaticamente.");}}

  function downloadCsv(rows,name){const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
  function exportAnonCsv(){const data=filteredAttempts();if(!data.length){alert("Sem dados para exportar.");return;}const ids=new Map();let seq=0,anon=a=>{const k=a.studentCode||a.deviceId;if(!ids.has(k))ids.set(k,`ALUNO-${String(++seq).padStart(3,'0')}`);return ids.get(k)};const rows=[["Aluno anonimizado","Turma","Simulado","Acertos","Total","Percentual","Data"]];data.forEach(a=>rows.push([anon(a),a.classGroup,a.simuladoId,a.score,a.total,Math.round(a.score/a.total*100),a.completedAt]));downloadCsv(rows,'dupla-exclusao-dashboard-anonimizado.csv');}
  function exportSurveyCsv(){const data=filteredSurveys();if(!data.length){alert("Sem pesquisas para exportar.");return;}const rows=[["Aluno","Código","Turma","Pesquisa","Pergunta","Alternativa","Complemento","Data"]];data.forEach(s=>(s.responses||[]).forEach(r=>rows.push([s.studentName,s.studentCode,s.classGroup,s.surveyTitle,r.question,r.choice,r.text,s.completedAt])));downloadCsv(rows,'dupla-exclusao-pesquisas-institucionais.csv');}

  function init(){
    injectStyles(); installUI(); currentData=[]; currentSurveyData=[]; populateFilters(); populateSurveyQuestions(); render();
    document.querySelector('[data-screen="professor"]')?.addEventListener('click',()=>setTimeout(()=>{ if(auth()?.isAuthenticated?.()) loadData(); },150));
    document.querySelector('#loadTeacherDataBtn')?.addEventListener('click',()=>setTimeout(()=>{ if(auth()?.isAuthenticated?.()) loadData(); },250));
  }

  window.DuplaInstitutionalDashboard={loadData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
