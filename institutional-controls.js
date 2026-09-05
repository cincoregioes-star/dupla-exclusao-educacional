(() => {
  "use strict";
  const CFG = window.APP_CONFIG || {};
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const allowedRoles = new Set(["admin","gestor","professor"]);
  const roleLabel = r => ({admin:"Administrador do Sistema",gestor:"Gestor Escolar",professor:"Professor"}[r] || r);

  function auth(){ return window.DuplaInstitutionalAuth; }
  function profile(){ return auth()?.getProfile?.() || null; }
  function session(){ return auth()?.getSession?.() || null; }

  async function api(path,opts={}){
    const s=CFG.supabase||{}, sess=session();
    if(!s.enabled||!s.url||!s.anonKey||!sess?.access_token) throw new Error("Sessão institucional necessária.");
    const headers={apikey:s.anonKey,Authorization:`Bearer ${sess.access_token}`,"Content-Type":"application/json",...(opts.headers||{})};
    const r=await fetch(s.url.replace(/\/$/,"")+path,{...opts,headers});
    if(!r.ok) throw new Error((await r.text())||`HTTP ${r.status}`);
    const txt=await r.text(); return txt?JSON.parse(txt):null;
  }

  function injectStyles(){
    if($("#institutionalControlStyles")) return;
    const st=document.createElement("style"); st.id="institutionalControlStyles";
    st.textContent=`
      .assignment-control{margin:18px 0}.assignment-control h3{margin:0 0 6px;color:var(--gold)}.assignment-control .hint{color:var(--muted);margin:0 0 14px}
      .assignment-form{display:grid;grid-template-columns:1.2fr 1fr 1fr 1.2fr 1.2fr auto;gap:10px;align-items:end}.assignment-form label{display:grid;gap:5px;color:var(--muted);font-size:.78rem;font-weight:900}.assignment-form input,.assignment-form select{width:100%;background:#071525;color:#fff;border:1px solid #36577d;border-radius:10px;padding:9px}.assignment-form button{padding:10px 14px;border-radius:10px;font-weight:900}
      .assignment-list{margin-top:14px;display:grid;gap:8px}.assignment-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;background:#09182b;border:1px solid #263b59;border-radius:12px;padding:10px}.assignment-row small{display:block;color:var(--muted);margin-top:3px}.assignment-row .actions{display:flex;gap:7px;flex-wrap:wrap}.assignment-pill{display:inline-block;border-radius:999px;padding:4px 8px;font-size:.72rem;font-weight:900;background:rgba(56,189,248,.12);color:#bae6fd;margin-right:6px}.assignment-pill.final{background:rgba(167,139,250,.14);color:#ddd6fe}
      .eval-results{margin-top:16px}.eval-results table{min-width:760px}.eval-result-private{border-left:4px solid #facc15}
      @media(max-width:1050px){.assignment-form{grid-template-columns:1fr 1fr 1fr}.assignment-form button{width:100%}}@media(max-width:680px){.assignment-form{grid-template-columns:1fr}.assignment-row{grid-template-columns:1fr}.assignment-row .actions button{width:100%}}
    `;
    document.head.appendChild(st);
  }

  function installUI(){
    const screen=$("#screen-professor");
    if(!screen || $("#institutionalAssignments")) return;
    const section=document.createElement("section");
    section.id="institutionalAssignments";
    section.className="panel assignment-control institutional-protected";
    section.innerHTML=`
      <span class="eyebrow">CONTROLE PEDAGÓGICO</span>
      <h3>Avaliações solicitadas e liberação da Pesquisa Final</h3>
      <p class="hint">Professor, Gestor Escolar e Administrador podem solicitar uma avaliação de qualquer simulado para turma ou aluno específico. A Pesquisa Final também é liberada por aqui.</p>
      <div id="assignmentNoPermission" class="status-note" hidden>Este perfil não possui permissão para solicitar avaliações ou liberar a Pesquisa Final.</div>
      <form id="assignmentForm" class="assignment-form">
        <label>Atividade
          <select id="assignmentActivity">
            <option value="simulado_avaliacao">Avaliação de simulado</option>
            <option value="pesquisa_final">Liberar Pesquisa Final</option>
          </select>
        </label>
        <label id="assignmentSimWrap">Simulado
          <select id="assignmentSim">${Array.from({length:10},(_,i)=>`<option value="${i+1}">Simulado ${i+1}</option>`).join("")}</select>
        </label>
        <label>Destinatário
          <select id="assignmentTargetType"><option value="turma">Turma</option><option value="aluno">Aluno específico</option></select>
        </label>
        <label id="assignmentClassWrap">Turma
          <input id="assignmentClass" placeholder="Ex.: 8º A">
        </label>
        <label id="assignmentStudentWrap" hidden>Código do aluno
          <input id="assignmentStudentCode" placeholder="Código usado no perfil">
        </label>
        <label id="assignmentStudentNameWrap" hidden>Nome do aluno
          <input id="assignmentStudentName" placeholder="Opcional">
        </label>
        <button class="primary" type="submit">Solicitar / liberar</button>
      </form>
      <div id="assignmentStatus" class="status-note"></div>
      <div id="assignmentList" class="assignment-list"></div>
      <div class="eval-results">
        <div class="section-head" style="margin-top:18px"><div><span class="eyebrow">RESULTADOS CONFIDENCIAIS</span><h3>Resultados das avaliações solicitadas</h3><p>Não são exibidos aos estudantes. O professor vê somente avaliações que ele próprio solicitou; Gestor Escolar e Administrador veem todas.</p></div><button id="refreshAssignments" class="secondary" type="button">Atualizar</button></div>
        <div class="table-wrap eval-result-private"><table><thead><tr><th>Aluno</th><th>Turma</th><th>Simulado</th><th>Acertos</th><th>%</th><th>Solicitação</th><th>Data</th></tr></thead><tbody id="evaluationResultsBody"></tbody></table></div>
      </div>`;
    const dash=$("#institutionalDashboard");
    if(dash) screen.insertBefore(section,dash); else screen.appendChild(section);

    $("#assignmentActivity")?.addEventListener("change",updateFields);
    $("#assignmentTargetType")?.addEventListener("change",updateFields);
    $("#assignmentForm")?.addEventListener("submit",createAssignment);
    $("#refreshAssignments")?.addEventListener("click",loadAll);
    updateFields();
  }

  function updateFields(){
    const activity=$("#assignmentActivity")?.value, target=$("#assignmentTargetType")?.value;
    if($("#assignmentSimWrap")) $("#assignmentSimWrap").hidden=activity!=="simulado_avaliacao";
    if($("#assignmentClassWrap")) $("#assignmentClassWrap").hidden=target!=="turma";
    if($("#assignmentStudentWrap")) $("#assignmentStudentWrap").hidden=target!=="aluno";
    if($("#assignmentStudentNameWrap")) $("#assignmentStudentNameWrap").hidden=target!=="aluno";
  }

  async function createAssignment(e){
    e.preventDefault();
    const prof=profile(), sess=session(), status=$("#assignmentStatus");
    if(!prof || !sess?.user?.id || !allowedRoles.has(prof.role)){ if(status) status.textContent="Perfil sem permissão para esta ação."; return; }
    const activity=$("#assignmentActivity").value, targetType=$("#assignmentTargetType").value;
    const classGroup=$("#assignmentClass").value.trim(), studentCode=$("#assignmentStudentCode").value.trim(), studentName=$("#assignmentStudentName").value.trim();
    if(targetType==="turma" && !classGroup){status.textContent="Informe a turma.";return}
    if(targetType==="aluno" && !studentCode){status.textContent="Informe o código do aluno.";return}
    const payload={
      school_code:prof.school_code||"PQF",
      activity_type:activity,
      simulado_id:activity==="simulado_avaliacao"?Number($("#assignmentSim").value):null,
      survey_id:activity==="pesquisa_final"?"didatica":null,
      requester_user_id:sess.user.id,
      requester_name:prof.full_name||sess.user.email||"Usuário institucional",
      requester_role:prof.role,
      target_type:targetType,
      target_class_group:targetType==="turma"?classGroup:null,
      target_student_code:targetType==="aluno"?studentCode:null,
      target_student_name:targetType==="aluno"?(studentName||null):null
    };
    status.textContent="Registrando solicitação...";
    try{
      await api("/rest/v1/institutional_assignments",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});
      status.textContent=activity==="pesquisa_final"?"Pesquisa Final liberada com sucesso.":"Avaliação solicitada com sucesso.";
      e.target.reset(); updateFields(); await loadAll();
    }catch(err){console.warn(err);status.textContent="Não foi possível registrar: "+err.message;}
  }

  async function closeAssignment(id){
    if(!id) return;
    try{
      await api(`/rest/v1/institutional_assignments?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"encerrada",closed_at:new Date().toISOString()})});
      await loadAll();
    }catch(err){alert("Não foi possível encerrar a solicitação.");console.warn(err);}
  }

  async function loadAssignments(){
    const list=$("#assignmentList"); if(!list) return [];
    try{
      const rows=await api("/rest/v1/institutional_assignments?select=*&order=created_at.desc")||[];
      list.innerHTML=rows.length?rows.map(a=>{
        const isEval=a.activity_type==="simulado_avaliacao";
        const target=a.target_type==="turma"?`Turma ${a.target_class_group}`:`Aluno ${a.target_student_name||a.target_student_code} (${a.target_student_code})`;
        return `<div class="assignment-row"><div><span class="assignment-pill ${isEval?"":"final"}">${isEval?`Simulado ${a.simulado_id}`:"Pesquisa Final"}</span><b>${esc(target)}</b><small>Solicitado por ${esc(a.requester_name)} • ${new Date(a.created_at).toLocaleString("pt-BR")} • ${a.status}</small></div><div class="actions">${a.status==="aberta"?`<button class="secondary close-assignment" type="button" data-id="${esc(a.id)}">Encerrar</button>`:""}</div></div>`;
      }).join(""):'<p class="status-note">Nenhuma solicitação registrada por este perfil.</p>';
      list.querySelectorAll(".close-assignment").forEach(b=>b.addEventListener("click",()=>closeAssignment(b.dataset.id)));
      return rows;
    }catch(err){list.innerHTML='<p class="status-note">Não foi possível carregar as solicitações.</p>';console.warn(err);return [];}
  }

  async function loadResults(){
    const tbody=$("#evaluationResultsBody"); if(!tbody) return;
    try{
      const rows=await api("/rest/v1/evaluation_submissions?select=*,institutional_assignments(requester_name)&order=completed_at.desc")||[];
      tbody.innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.student_name)}</td><td>${esc(r.class_group)}</td><td>${r.simulado_id}</td><td><b>${r.score}/${r.total}</b></td><td>${Math.round(Number(r.score||0)/Number(r.total||10)*100)}%</td><td>${esc(r.institutional_assignments?.requester_name||"Institucional")}</td><td>${new Date(r.completed_at).toLocaleString("pt-BR")}</td></tr>`).join(""):'<tr><td colspan="7">Nenhuma avaliação solicitada respondida ainda.</td></tr>';
    }catch(err){tbody.innerHTML='<tr><td colspan="7">Sem permissão ou sem dados disponíveis.</td></tr>';console.warn(err);}
  }

  async function loadAll(){
    const prof=profile(), form=$("#assignmentForm"), no=$("#assignmentNoPermission"), results=$(".eval-results");
    const allowed=Boolean(prof&&allowedRoles.has(prof.role));
    if(form) form.hidden=!allowed;
    if(no) no.hidden=allowed;
    if(results) results.hidden=!allowed;
    if(!auth()?.isAuthenticated?.()) return;
    if(allowed){ await Promise.all([loadAssignments(),loadResults()]); }
  }

  function refreshForAuth(){
    setTimeout(loadAll,80);
  }

  function init(){
    injectStyles();installUI();refreshForAuth();
    const obs=new MutationObserver(refreshForAuth);
    obs.observe(document.body,{attributes:true,attributeFilter:["data-institutional-role"]});
    document.querySelectorAll("[data-screen='professor']").forEach(b=>b.addEventListener("click",refreshForAuth));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();