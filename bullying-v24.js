(() => {
  "use strict";
  const CFG=window.APP_CONFIG||{};
  const APP_STATE_KEY="dupla_exclusao_state_v2";
  const LOCAL_QUEUE="dupla_bullying_queue_v24";
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"")||f}catch{return f}};
  const appState=()=>read(APP_STATE_KEY,{});
  const profile=()=>appState().profile||{};
  const sess=()=>window.DuplaInstitutionalAuth?.getSession?.()||null;
  const instProfile=()=>window.DuplaInstitutionalAuth?.getProfile?.()||null;

  const TYPES=[
    ["verbal","Verbal — xingamentos, apelidos, humilhações"],
    ["fisico","Físico — empurrões, agressões, danos a objetos"],
    ["social","Social — exclusão, isolamento, espalhar boatos"],
    ["cyberbullying","Cyberbullying — mensagens, grupos, redes sociais"],
    ["racista","Racista — ataques ligados à cor, raça ou origem"],
    ["capacitista","Capacitista — ataques ligados à deficiência"],
    ["aparencia","Aparência/corpo — peso, cabelo, roupa ou aparência"],
    ["outro","Outro tipo de intimidação ou discriminação"]
  ];

  async function api(path,opts={},token=""){
    const s=CFG.supabase||{};
    if(!s.enabled||!s.url||!s.anonKey)throw new Error("Supabase não configurado");
    const headers={apikey:s.anonKey,"Content-Type":"application/json",...(opts.headers||{})};
    headers.Authorization=`Bearer ${token||s.anonKey}`;
    const r=await fetch(s.url.replace(/\/$/,"")+path,{...opts,headers});
    const txt=await r.text();
    if(!r.ok)throw new Error(txt||`HTTP ${r.status}`);
    return txt?JSON.parse(txt):null;
  }

  function ensureScreenBindings(){
    const section=$("#screen-denuncia");
    if(!section)return;
    const form=$("#bullyingReportForm");
    if(form && form.dataset.bound!=="1"){
      form.addEventListener("submit",submitReport);
      form.dataset.bound="1";
    }
  }

  function ensureStudent(){
    const p=profile();
    if(!String(p.name||"").trim()||!String(p.classGroup||"").trim()||!String(p.studentCode||"").trim()){
      alert("Antes de enviar um relato, identifique o aluno no menu.");
      $("#nav [data-screen='perfil']")?.click();return false;
    }
    return true;
  }

  function queue(){return read(LOCAL_QUEUE,[])}
  function saveQueue(q){localStorage.setItem(LOCAL_QUEUE,JSON.stringify(q.slice(-100)))}
  async function flushQueue(){
    if(!navigator.onLine)return;
    let q=queue();
    while(q.length){
      try{await api("/rest/v1/bullying_reports",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(q[0])});q.shift();saveQueue(q)}catch(e){console.warn("bullying sync",e);break;}
    }
  }

  async function submitReport(e){
    e.preventDefault();if(!ensureStudent())return;
    const types=$$('input[name="bullyingType"]:checked').map(x=>x.value);
    const desc=$("#bullyingDescription")?.value.trim()||"";
    const status=$("#bullyingReportStatus");
    if(!status)return;
    if(!types.length){status.textContent="Selecione pelo menos um tipo de bullying/discriminação.";return;}
    if(desc.length<10){status.textContent="Descreva o fato com pelo menos 10 caracteres.";return;}
    const p=profile(),s=appState();
    const payload={school_code:(CFG.supabase||{}).schoolCode||"PQF",device_id:s.deviceId||null,student_code:p.studentCode,student_name:p.name,class_group:p.classGroup,report_context:$("#bullyingContext")?.value||"aconteceu_comigo",bullying_types:types,occurrence_date:$("#bullyingDate")?.value||null,description:desc,status:"novo",app_version:"v24.1"};
    status.textContent="Enviando relato...";
    try{
      if(!navigator.onLine)throw new Error("offline");
      await api("/rest/v1/bullying_reports",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});
      status.textContent="Relato enviado com segurança para a equipe autorizada.";
    }catch(err){
      const q=queue();q.push(payload);saveQueue(q);status.textContent="Relato salvo neste aparelho. Será enviado automaticamente quando a internet voltar.";
    }
    e.target.reset();
  }

  function installBell(){
    if($("#bullyingBell"))return;
    const b=document.createElement("button");b.id="bullyingBell";b.type="button";b.hidden=true;b.innerHTML='🔔<span class="v24-bell-count">0</span>';b.setAttribute("aria-label","Alertas de bullying");
    b.addEventListener("click",()=>openAlerts());document.body.appendChild(b);
  }

  async function fetchReports(){
    const session=sess();if(!session?.access_token)return[];
    return await api("/rest/v1/bullying_reports?select=*&order=created_at.desc",{method:"GET"},session.access_token)||[];
  }

  async function updateBell(){
    const bell=$("#bullyingBell");if(!bell)return;
    const p=instProfile(),session=sess();
    const allowed=session?.access_token&&["admin","gestor","professor"].includes(p?.role);
    bell.hidden=!allowed;if(!allowed)return;
    try{
      const rows=await fetchReports();
      const novos=rows.filter(r=>r.status==="novo").length,pend=rows.filter(r=>r.status!=="concluido").length;
      bell.querySelector(".v24-bell-count").textContent=String(novos||pend||0);
      bell.classList.toggle("v24-unread",novos>0);
      bell.title=novos?`${novos} novo(s) relato(s)`:pend?`${pend} relato(s) em acompanhamento`:"Nenhum alerta pendente";
      bell.hidden=!(novos||pend);
    }catch(e){console.warn("bullying bell",e);}
  }

  function typeLabel(v){return TYPES.find(x=>x[0]===v)?.[1]||v}
  async function markAllRead(rows){
    const session=sess();if(!session?.access_token)return;
    const novos=rows.filter(r=>r.status==="novo");
    for(const item of novos){
      await api(`/rest/v1/bullying_reports?id=eq.${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"lido",read_at:new Date().toISOString(),read_by:session.user?.id||null,updated_at:new Date().toISOString()})},session.access_token);
    }
  }
  async function resolveReport(id){
    const note=$(`#resolution-${CSS.escape(id)}`)?.value.trim()||"";
    const session=sess();if(!session?.access_token)return;
    try{
      await api(`/rest/v1/bullying_reports?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"concluido",resolved_at:new Date().toISOString(),resolved_by:session.user?.id||null,resolution_note:note||null,updated_at:new Date().toISOString()})},session.access_token);
      await openAlerts(false);
    }catch(e){alert("Não foi possível concluir este alerta.");}
  }

  async function openAlerts(markSeen=true){
    const p=instProfile();if(!["admin","gestor","professor"].includes(p?.role))return;
    let rows=[];try{rows=await fetchReports()}catch(e){alert("Não foi possível carregar os alertas.");return;}
    if(markSeen&&rows.some(r=>r.status==="novo")){
      try{await markAllRead(rows);rows=await fetchReports()}catch(e){console.warn("mark bullying read",e);}
    }
    const html=`<div class="v24-alert-panel"><h2>🔔 Alertas de bullying e discriminação</h2><p>O sino pisca somente enquanto houver relato ainda não visualizado. Depois da leitura, o alerta permanece silencioso aguardando conclusão. Ao concluir, ele sai do sino, mas fica arquivado com data, aluno, relato e encaminhamento.</p>${rows.length?rows.map(r=>`<div class="v24-report-row ${r.status==='novo'?'v24-new':r.status==='concluido'?'v24-done':''}"><div class="v24-report-meta"><b>${esc(r.student_name)}</b><span>${esc(r.class_group)}</span><span>${new Date(r.created_at).toLocaleString('pt-BR')}</span><span>${r.status==='novo'?'NOVO':r.status==='lido'?'EM ACOMPANHAMENTO':'CONCLUÍDO'}</span></div><div class="v24-report-types">${(r.bullying_types||[]).map(t=>`<span>${esc(typeLabel(t))}</span>`).join('')}</div><div class="v24-report-text">${esc(r.description)}</div>${r.occurrence_date?`<small>Data aproximada do fato: ${new Date(r.occurrence_date+'T12:00:00').toLocaleDateString('pt-BR')}</small>`:''}${r.status!=='concluido'?`<textarea id="resolution-${esc(r.id)}" class="v24-resolution" placeholder="Registrar encaminhamento/conclusão (opcional)"></textarea><div class="v24-report-toolbar"><button class="primary v24-resolve" data-id="${esc(r.id)}">Concluir atendimento</button></div>`:`<div class="status-note">Concluído em ${r.resolved_at?new Date(r.resolved_at).toLocaleString('pt-BR'):'—'}${r.resolution_note?` • ${esc(r.resolution_note)}`:''}</div>`}</div>`).join(''):'<p>Nenhum relato registrado.</p>'}</div>`;
    const modal=$("#modal"),content=$("#modalContent");if(modal&&content){content.innerHTML=html;modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");content.querySelectorAll(".v24-resolve").forEach(b=>b.addEventListener("click",()=>resolveReport(b.dataset.id)));}
    updateBell();
  }

  function installTeacherSection(){
    const screen=$("#screen-professor");if(!screen||$("#bullyingInstitutionalSection"))return;
    const sec=document.createElement("section");sec.id="bullyingInstitutionalSection";sec.className="panel institutional-protected v24-alert-panel";
    sec.innerHTML='<span class="eyebrow">PROTEÇÃO E CONVIVÊNCIA</span><h3>Alertas de bullying e discriminação</h3><p class="status-note">O sino pisca quando houver relato novo e permanece silencioso enquanto existir atendimento pendente.</p><button id="openBullyingAlerts" class="primary" type="button">Abrir central de alertas</button>';
    screen.appendChild(sec);$("#openBullyingAlerts")?.addEventListener("click",()=>openAlerts());
  }

  function init(){ensureScreenBindings();installBell();installTeacherSection();window.addEventListener("online",()=>{flushQueue();updateBell()});const obs=new MutationObserver(()=>updateBell());obs.observe(document.body,{attributes:true,attributeFilter:["data-institutional-role"]});setInterval(()=>{if(document.visibilityState==='visible')updateBell()},30000);flushQueue();updateBell();}
  window.DuplaBullyingV24={updateBell,openAlerts,flushQueue};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();