(() => {
  "use strict";

  const APP_STATE_KEY = "dupla_exclusao_state_v2";
  const SESSION_KEY = "dupla_exclusao_teacher_session_v1";
  const CFG = window.APP_CONFIG || {};
  let currentData = [];
  let hideNames = false;

  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const pct = v => `${Math.round(v)}%`;
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "") || fallback; } catch { return fallback; } };
  const localAttempts = () => readJSON(APP_STATE_KEY, {}).attempts || [];
  const teacherSession = () => readJSON(SESSION_KEY, null);
  const normalize = x => ({
    id:x.id,
    deviceId:x.deviceId ?? x.device_id,
    studentCode:x.studentCode ?? x.student_code,
    studentName:x.studentName ?? x.student_name,
    classGroup:x.classGroup ?? x.class_group,
    simuladoId:Number(x.simuladoId ?? x.simulado_id),
    title:x.title,
    score:Number(x.score || 0),
    total:Number(x.total || 10),
    durationSeconds:Number((x.durationSeconds ?? x.duration_seconds) || 0),
    responses:x.responses || [],
    completedAt:x.completedAt ?? x.completed_at
  });

  function injectStyles(){
    if($("#institutionalDashboardStyles")) return;
    const s=document.createElement("style");
    s.id="institutionalDashboardStyles";
    s.textContent=`
      .institutional-dashboard{margin:18px 0 22px}.inst-title{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}.inst-title h3{margin:0;color:var(--gold);font-size:clamp(1.2rem,2.2vw,1.7rem)}.inst-title p{margin:4px 0 0;color:var(--muted)}
      .inst-filters{display:flex;gap:9px;flex-wrap:wrap;align-items:end;background:#09182b;border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:14px}.inst-filters label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;font-weight:900}.inst-filters select{min-width:150px;background:#071525;color:#fff;border:1px solid #36577d;border-radius:10px;padding:9px}.inst-filters button{border-radius:10px;padding:9px 12px;font-weight:900}
      .inst-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:14px}.inst-kpi{background:linear-gradient(180deg,rgba(18,36,59,.96),rgba(10,24,42,.96));border:1px solid var(--line);border-left:4px solid #2f7df4;border-radius:15px;padding:14px;min-height:110px}.inst-kpi.good{border-left-color:#22c55e}.inst-kpi.warn{border-left-color:#eab52d}.inst-kpi.bad{border-left-color:#ef4444}.inst-kpi strong{display:block;color:var(--muted);font-size:.74rem;text-transform:uppercase}.inst-kpi b{display:block;font-size:1.7rem;margin-top:8px}.inst-kpi small{display:block;color:#c7d2e4;margin-top:5px;line-height:1.25}
      .inst-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.inst-card{background:linear-gradient(180deg,rgba(18,36,59,.96),rgba(10,24,42,.96));border:1px solid var(--line);border-radius:17px;padding:16px;box-shadow:var(--shadow)}.inst-card h4{margin:0 0 10px;color:#dbeafe}.inst-card .hint{color:var(--muted);font-size:.8rem;margin:-5px 0 12px}
      .iv-bars{display:flex;align-items:end;gap:8px;height:230px;border-left:1px solid #263b59;border-bottom:1px solid #263b59;padding:10px 8px 30px}.iv-col{flex:1;min-width:32px;height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;position:relative}.iv-bar{width:72%;min-height:3px;border-radius:9px 9px 2px 2px;background:linear-gradient(180deg,#2f7df4,#22c55e)}.iv-val{font-size:.72rem;font-weight:900;margin-bottom:4px}.iv-lab{position:absolute;bottom:-25px;font-size:.65rem;color:var(--muted);white-space:nowrap}
      .ih-row{display:grid;grid-template-columns:165px 1fr 50px;gap:9px;align-items:center;margin:9px 0;font-size:.82rem}.ih-track{height:11px;border-radius:99px;background:#071525;overflow:hidden}.ih-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#ef4444,#eab52d)}.ih-fill.good{background:linear-gradient(90deg,#2f7df4,#22c55e)}
      .inst-pie-wrap{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:center;min-height:210px}.inst-pie{width:170px;height:170px;border-radius:50%;display:grid;place-items:center;margin:auto}.inst-pie>span{width:105px;height:105px;border-radius:50%;background:#081323;display:grid;place-items:center;text-align:center;font-weight:900;padding:8px}.inst-legend{display:grid;gap:8px}.inst-legend div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #263b59;padding-bottom:6px}
      .inst-list{display:grid;gap:8px}.inst-item{display:grid;grid-template-columns:1fr auto;gap:12px;background:#09182b;border:1px solid #263b59;border-radius:12px;padding:10px}.inst-item b{color:var(--gold)}.inst-badge{border-radius:999px;padding:4px 8px;font-size:.72rem;font-weight:900}.inst-badge.bad{background:rgba(239,68,68,.16);color:#fecaca}.inst-badge.warn{background:rgba(234,181,45,.16);color:#fde68a}.inst-badge.good{background:rgba(34,197,94,.15);color:#bbf7d0}
      .inst-heat{overflow:auto}.inst-heat table{min-width:620px}.inst-heat td,.inst-heat th{text-align:center}.heat-good{background:rgba(34,197,94,.18)!important}.heat-warn{background:rgba(234,181,45,.18)!important}.heat-bad{background:rgba(239,68,68,.18)!important}
      .inst-report{white-space:pre-wrap;min-height:140px;max-height:360px;overflow:auto;background:#071525;border:1px solid #263b59;border-radius:12px;padding:12px;color:#dbe5f3;line-height:1.5}.inst-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.inst-tools button{border-radius:10px;padding:9px 12px;font-weight:900}
      @media(max-width:1100px){.inst-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.inst-kpis,.inst-grid{grid-template-columns:1fr}.inst-filters label,.inst-filters select,.inst-filters button{width:100%}.ih-row{grid-template-columns:1fr}.inst-pie-wrap{grid-template-columns:1fr}.iv-bars{height:190px;gap:3px}.iv-lab{font-size:.58rem}}
    `;
    document.head.appendChild(s);
  }

  function installUI(){
    const screen=$("#screen-professor");
    if(!screen || $("#institutionalDashboard")) return;
    const title=screen.querySelector(".section-head h2");
    if(title) title.textContent="DASHBOARD INSTITUCIONAL PARA TOMADA DE DECISÃO";
    const subtitle=screen.querySelector(".section-head p");
    if(subtitle) subtitle.textContent="Análise pedagógica por escola, turma e aluno, com indicadores para acompanhamento e intervenção. Para reunir vários tablets, ative a sincronização institucional.";

    const root=document.createElement("section");
    root.id="institutionalDashboard";
    root.className="institutional-dashboard";
    root.innerHTML=`
      <div class="inst-title"><div><span class="eyebrow">INTELIGÊNCIA PEDAGÓGICA</span><h3>Dashboard institucional para tomada de decisão</h3><p>Recursos inspirados no Sistema MATRIZ EDUCACIONAL, adaptados ao projeto Dupla Exclusão.</p></div><div id="instDataSource" class="status-note"></div></div>
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
        <article class="inst-card"><h4>Faixas de desempenho</h4><p class="hint">Pizza/rosca — visão rápida para decisão pedagógica.</p><div id="instPie"></div></article>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Habilidades com maior dificuldade</h4><p class="hint">Barras horizontais — priorizar intervenção.</p><div id="instHardSkills"></div></article>
        <article class="inst-card"><h4>Habilidades com melhor domínio</h4><p class="hint">Pontos fortes para consolidação.</p><div id="instStrongSkills"></div></article>
      </div>
      <div class="inst-grid">
        <article class="inst-card"><h4>Evolução diagnóstico → avaliação final</h4><p class="hint">Comparação individual quando o aluno concluiu os dois momentos.</p><div id="instEvolution" class="inst-list"></div></article>
        <article class="inst-card"><h4>Nível de acompanhamento pedagógico</h4><p class="hint">Sinalização por média, sem exposição pública dos estudantes.</p><div id="instRisk" class="inst-list"></div></article>
      </div>
      <article class="inst-card" style="margin-bottom:14px"><h4>Mapa de calor das habilidades por turma</h4><p class="hint">Verde = domínio; amarelo = atenção; vermelho = prioridade.</p><div id="instHeat" class="inst-heat"></div></article>
      <div class="inst-grid">
        <article class="inst-card"><h4>Plano automático de intervenção</h4><p class="hint">Sugestões calculadas a partir das dificuldades do recorte selecionado.</p><div id="instPlan" class="inst-list"></div></article>
        <article class="inst-card"><h4>Relatório pedagógico automático</h4><div class="inst-tools"><button id="instReportBtn" class="secondary" type="button">Gerar relatório</button><button id="instCopyBtn" class="secondary" type="button">Copiar relatório</button></div><div id="instReport" class="inst-report">Clique em “Gerar relatório”.</div></article>
      </div>`;

    const anchor=$("#teacherCards");
    if(anchor) screen.insertBefore(root, anchor); else screen.appendChild(root);

    ["#instClass","#instStudent","#instSim"].forEach(id=>$(id)?.addEventListener("change",()=>{syncStudentFilter();render();}));
    $("#instRefresh")?.addEventListener("click",loadData);
    $("#instNames")?.addEventListener("click",()=>{hideNames=!hideNames;$("#instNames").textContent=hideNames?"Mostrar nomes":"Ocultar nomes";render();});
    $("#instAnonCsv")?.addEventListener("click",exportAnonCsv);
    $("#instReportBtn")?.addEventListener("click",generateReport);
    $("#instCopyBtn")?.addEventListener("click",async()=>{const t=$("#instReport")?.textContent||"";if(!t||t.startsWith("Clique"))return;try{await navigator.clipboard.writeText(t);alert("Relatório copiado.");}catch{alert("Não foi possível copiar automaticamente.");}});
  }

  async function remoteAttempts(){
    const s=CFG.supabase||{}, sess=teacherSession();
    if(!s.enabled || !s.url || !s.anonKey || !sess?.access_token) return null;
    const endpoint=`${s.url.replace(/\/$/,"")}/rest/v1/${encodeURIComponent(s.attemptsTable||"student_attempts")}?select=*&order=completed_at.desc`;
    const r=await fetch(endpoint,{headers:{apikey:s.anonKey,Authorization:`Bearer ${sess.access_token}`}});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()).map(normalize);
  }

  async function loadData(){
    const status=$("#instDataSource");
    try{
      const remote=await remoteAttempts();
      currentData=(remote?.length?remote:localAttempts().map(normalize));
      if(status) status.textContent=remote?.length?`Dados institucionais sincronizados • ${remote.length} registros`:`Dados locais deste aparelho • ${currentData.length} registros`;
    }catch(e){
      currentData=localAttempts().map(normalize);
      if(status) status.textContent=`Falha remota; mostrando dados locais • ${currentData.length} registros`;
    }
    populateFilters();
    render();
  }

  function populateFilters(){
    const c=$("#instClass"), s=$("#instStudent");
    if(!c||!s) return;
    const oldC=c.value, oldS=s.value;
    const classes=[...new Set(currentData.map(a=>a.classGroup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
    c.innerHTML='<option value="">Todas as turmas</option>'+classes.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(classes.includes(oldC)) c.value=oldC;
    syncStudentFilter(oldS);
  }

  function syncStudentFilter(preferred){
    const s=$("#instStudent"), c=$("#instClass");
    if(!s) return;
    const selected=preferred ?? s.value;
    const list=currentData.filter(a=>!c?.value||a.classGroup===c.value);
    const students=new Map();
    list.forEach(a=>students.set(a.studentCode||a.deviceId,{code:a.studentCode||a.deviceId,name:a.studentName||a.studentCode||"Aluno"}));
    s.innerHTML='<option value="">Todos os alunos</option>'+[...students.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(v=>`<option value="${esc(v.code)}">${esc(v.name)}</option>`).join("");
    if([...students.keys()].includes(selected)) s.value=selected;
  }

  function filtered(){
    const c=$("#instClass")?.value||"", st=$("#instStudent")?.value||"", sim=Number($("#instSim")?.value||0);
    return currentData.filter(a=>(!c||a.classGroup===c)&&(!st||(a.studentCode||a.deviceId)===st)&&(!sim||a.simuladoId===sim));
  }

  function studentGroups(data){
    const m=new Map();
    data.forEach(a=>{const k=a.studentCode||a.deviceId;if(!m.has(k))m.set(k,{key:k,name:a.studentName||k,classGroup:a.classGroup||"",attempts:[]});m.get(k).attempts.push(a)});
    return [...m.values()];
  }
  function average(data){return data.length?data.reduce((s,a)=>s+(a.score/a.total*100),0)/data.length:0;}
  function skillStats(data){
    const m={};
    data.forEach(a=>(a.responses||[]).forEach(r=>{const k=r.skill||"sem_habilidade";m[k]??={ok:0,total:0};m[k].total++;if(r.ok)m[k].ok++;}));
    return Object.entries(m).map(([skill,v])=>({skill,ok:v.ok,total:v.total,pct:v.total?v.ok/v.total*100:0}));
  }
  function displayName(s,index){return hideNames?`Aluno ${String(index+1).padStart(2,"0")}`:s.name;}

  function render(){
    const data=filtered(), students=studentGroups(data), avg=average(data), highest=data.length?Math.max(...data.map(a=>a.score/a.total*100)):0;
    const low=students.filter(s=>average(s.attempts)<50).length;
    const att=students.filter(s=>{const v=average(s.attempts);return v>=50&&v<70}).length;
    const finals=new Set(data.filter(a=>a.simuladoId===10).map(a=>a.studentCode||a.deviceId)).size;
    $("#instKpis").innerHTML=`
      <div class="inst-kpi"><strong>Alunos</strong><b>${students.length}</b><small>No recorte atual</small></div>
      <div class="inst-kpi"><strong>Registros</strong><b>${data.length}</b><small>Simulados concluídos</small></div>
      <div class="inst-kpi good"><strong>Média geral</strong><b>${pct(avg)}</b><small>Desempenho filtrado</small></div>
      <div class="inst-kpi good"><strong>Maior resultado</strong><b>${pct(highest)}</b><small>Melhor desempenho</small></div>
      <div class="inst-kpi bad"><strong>Abaixo de 50%</strong><b>${low}</b><small>Intervenção prioritária</small></div>
      <div class="inst-kpi warn"><strong>50% a 69%</strong><b>${att}</b><small>Acompanhamento</small></div>`;
    renderVertical(data);
    renderPie(students);
    renderSkills(data);
    renderEvolution(data);
    renderRisk(students);
    renderHeat(data);
    renderPlan(data,students);
    const status=$("#instDataSource");
    if(status && finals && !status.textContent.includes("avaliação")) status.textContent += ` • ${finals} avaliação(ões) final(is)`;
  }

  function renderVertical(data){
    const agg=Array.from({length:10},(_,i)=>{const rows=data.filter(a=>a.simuladoId===i+1);return {id:i+1,pct:average(rows),n:rows.length};});
    $("#instVertical").innerHTML=data.length?`<div class="iv-bars">${agg.map(x=>`<div class="iv-col"><span class="iv-val">${x.n?pct(x.pct):"—"}</span><div class="iv-bar" style="height:${Math.max(2,x.pct)}%"></div><span class="iv-lab">S${x.id}</span></div>`).join("")}</div>`:'<p class="status-note">Sem dados no recorte selecionado.</p>';
  }

  function renderPie(students){
    const bands={priority:0,attention:0,good:0};
    students.forEach(s=>{const a=average(s.attempts);if(a<50)bands.priority++;else if(a<70)bands.attention++;else bands.good++;});
    const total=students.length||1, p1=bands.priority/total*100, p2=bands.attention/total*100;
    $("#instPie").innerHTML=students.length?`<div class="inst-pie-wrap"><div class="inst-pie" style="background:conic-gradient(#ef4444 0 ${p1}%,#eab52d ${p1}% ${p1+p2}%,#22c55e ${p1+p2}% 100%)"><span>${students.length}<br><small>alunos</small></span></div><div class="inst-legend"><div><span>Prioridade &lt; 50%</span><b>${bands.priority}</b></div><div><span>Atenção 50–69%</span><b>${bands.attention}</b></div><div><span>Domínio ≥ 70%</span><b>${bands.good}</b></div></div></div>`:'<p class="status-note">Sem alunos no recorte.</p>';
  }

  function barsHtml(stats,good=false){
    return stats.map(s=>`<div class="ih-row"><span>${esc(s.skill.replaceAll("_"," "))}</span><div class="ih-track"><div class="ih-fill ${good?"good":""}" style="width:${Math.max(2,s.pct)}%"></div></div><b>${pct(s.pct)}</b></div>`).join("")||'<p class="status-note">Sem dados de habilidades.</p>';
  }
  function renderSkills(data){
    const st=skillStats(data);
    $("#instHardSkills").innerHTML=barsHtml([...st].sort((a,b)=>a.pct-b.pct).slice(0,8));
    $("#instStrongSkills").innerHTML=barsHtml([...st].sort((a,b)=>b.pct-a.pct).slice(0,8),true);
  }

  function renderEvolution(data){
    const all=studentGroups(data.filter(a=>a.simuladoId===1||a.simuladoId===10));
    const rows=all.map(s=>{const d=s.attempts.filter(a=>a.simuladoId===1),f=s.attempts.filter(a=>a.simuladoId===10);if(!d.length||!f.length)return null;const dp=Math.max(...d.map(a=>a.score/a.total*100)),fp=Math.max(...f.map(a=>a.score/a.total*100));return {...s,diag:dp,final:fp,delta:fp-dp};}).filter(Boolean).sort((a,b)=>b.delta-a.delta);
    $("#instEvolution").innerHTML=rows.length?rows.slice(0,12).map((s,i)=>`<div class="inst-item"><div><b>${esc(displayName(s,i))}</b><br><small>${esc(s.classGroup)} • ${pct(s.diag)} → ${pct(s.final)}</small></div><span class="inst-badge ${s.delta>=0?'good':'bad'}">${s.delta>=0?'+':''}${Math.round(s.delta)} p.p.</span></div>`).join(""):'<p class="status-note">A evolução aparecerá quando houver diagnóstico e avaliação final do mesmo aluno.</p>';
  }

  function renderRisk(students){
    const rows=[...students].map(s=>({...s,avg:average(s.attempts)})).sort((a,b)=>a.avg-b.avg);
    $("#instRisk").innerHTML=rows.length?rows.slice(0,15).map((s,i)=>{const cls=s.avg<50?'bad':s.avg<70?'warn':'good',label=s.avg<50?'Prioridade':s.avg<70?'Atenção':'Acompanhado';return `<div class="inst-item"><div><b>${esc(displayName(s,i))}</b><br><small>${esc(s.classGroup)} • ${s.attempts.length} etapa(s)</small></div><span class="inst-badge ${cls}">${label} • ${pct(s.avg)}</span></div>`}).join(""):'<p class="status-note">Sem dados de alunos.</p>';
  }

  function renderHeat(data){
    const classes=[...new Set(data.map(a=>a.classGroup).filter(Boolean))].sort();
    const skills=[...new Set(data.flatMap(a=>(a.responses||[]).map(r=>r.skill).filter(Boolean)))];
    if(!classes.length||!skills.length){$("#instHeat").innerHTML='<p class="status-note">O mapa de calor aparecerá quando houver dados por turma e habilidade.</p>';return;}
    const rows=skills.slice(0,12).map(skill=>{const cells=classes.map(cls=>{const r=data.filter(a=>a.classGroup===cls),rs=r.flatMap(a=>(a.responses||[]).filter(x=>x.skill===skill));const v=rs.length?rs.filter(x=>x.ok).length/rs.length*100:NaN;const c=Number.isNaN(v)?'':v<50?'heat-bad':v<70?'heat-warn':'heat-good';return `<td class="${c}">${Number.isNaN(v)?'—':pct(v)}</td>`}).join("");return `<tr><th style="text-align:left">${esc(skill.replaceAll('_',' '))}</th>${cells}</tr>`}).join('');
    $("#instHeat").innerHTML=`<table><thead><tr><th style="text-align:left">Habilidade</th>${classes.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderPlan(data,students){
    const hard=[...skillStats(data)].sort((a,b)=>a.pct-b.pct).slice(0,3), low=students.filter(s=>average(s.attempts)<50).length;
    const items=[];
    if(low) items.push(`<div class="inst-item"><div><b>Acompanhamento prioritário</b><br><small>${low} aluno(s) abaixo de 50%. Retomar conceitos em pequenos grupos e reaplicar atividade formativa após intervenção.</small></div><span class="inst-badge bad">Alta</span></div>`);
    hard.forEach((s,i)=>items.push(`<div class="inst-item"><div><b>${esc(s.skill.replaceAll('_',' '))}</b><br><small>Domínio atual: ${pct(s.pct)}. Retomar o tema com exemplo concreto, discussão orientada e nova situação-problema.</small></div><span class="inst-badge ${s.pct<50?'bad':'warn'}">${i+1}ª prioridade</span></div>`));
    if(!items.length) items.push('<p class="status-note">Sem dados suficientes para gerar intervenção automática.</p>');
    $("#instPlan").innerHTML=items.join('');
  }

  function generateReport(){
    const data=filtered(), students=studentGroups(data), avg=average(data), hard=[...skillStats(data)].sort((a,b)=>a.pct-b.pct).slice(0,3), strong=[...skillStats(data)].sort((a,b)=>b.pct-a.pct).slice(0,3);
    const classLabel=$("#instClass")?.value||"todas as turmas", studentLabel=$("#instStudent")?.selectedOptions?.[0]?.textContent||"todos os alunos", simLabel=$("#instSim")?.selectedOptions?.[0]?.textContent||"todos os simulados";
    const low=students.filter(s=>average(s.attempts)<50).length, attention=students.filter(s=>{const a=average(s.attempts);return a>=50&&a<70}).length;
    const txt=`RELATÓRIO PEDAGÓGICO — DUPLA EXCLUSÃO\nDashboard Institucional para Tomada de Decisão\n\nRecorte: ${classLabel} | ${studentLabel} | ${simLabel}\nRegistros analisados: ${data.length}\nEstudantes: ${students.length}\nMédia geral: ${pct(avg)}\nAbaixo de 50%: ${low}\nFaixa de atenção (50% a 69%): ${attention}\n\nHabilidades prioritárias:\n${hard.length?hard.map((s,i)=>`${i+1}. ${s.skill.replaceAll('_',' ')} — ${pct(s.pct)}`).join('\n'):'Sem dados suficientes.'}\n\nPontos fortes:\n${strong.length?strong.map((s,i)=>`${i+1}. ${s.skill.replaceAll('_',' ')} — ${pct(s.pct)}`).join('\n'):'Sem dados suficientes.'}\n\nEncaminhamento sugerido:\nPriorizar as habilidades com menor domínio, organizar retomada pedagógica com situações concretas de racismo, capacitismo, acessibilidade e convivência, acompanhar os estudantes sinalizados e comparar o diagnóstico inicial com a avaliação final após a intervenção.\n\nObservação de privacidade: resultados individuais devem permanecer em ambiente restrito e ser utilizados exclusivamente para acompanhamento pedagógico.`;
    $("#instReport").textContent=txt;
  }

  function exportAnonCsv(){
    const data=filtered();
    if(!data.length){alert("Sem dados para exportar.");return;}
    const ids=new Map();let seq=0;
    const anon=a=>{const k=a.studentCode||a.deviceId;if(!ids.has(k))ids.set(k,`ALUNO-${String(++seq).padStart(3,'0')}`);return ids.get(k)};
    const rows=[["Aluno anonimizado","Turma","Simulado","Acertos","Total","Percentual","Data"]];
    data.forEach(a=>rows.push([anon(a),a.classGroup,a.simuladoId,a.score,a.total,Math.round(a.score/a.total*100),a.completedAt]));
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='dupla-exclusao-dashboard-anonimizado.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  function init(){
    injectStyles();
    installUI();
    currentData=localAttempts().map(normalize);
    populateFilters();
    render();
    document.querySelector('[data-screen="professor"]')?.addEventListener('click',()=>setTimeout(loadData,80));
    document.querySelector('#loadTeacherDataBtn')?.addEventListener('click',()=>setTimeout(loadData,500));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
