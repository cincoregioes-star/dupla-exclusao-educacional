
(() => {
  "use strict";
  const CFG = window.APP_CONFIG || {};
  const BANK = window.QUESTION_BANK || [];
  const STICKERS = window.STICKERS || [];
  const PAGES = window.ALBUM_PAGES || [];
  const STORAGE = "dupla_exclusao_state_v2";
  const SESSION = "dupla_exclusao_teacher_session_v1";

  const SIMS = [
    {id:1,module:"diagnostico",title:"Diagnóstico inicial",desc:"Mapeia conhecimentos prévios sobre inclusão, racismo, capacitismo e direitos."},
    {id:2,module:"racismo",title:"Racismo e preconceito racial",desc:"Situações do cotidiano, representatividade, currículo e intervenção."},
    {id:3,module:"racismo_estrutural",title:"Racismo estrutural",desc:"Instituições, oportunidades, dados, currículo e equidade racial."},
    {id:4,module:"capacitismo",title:"Capacitismo",desc:"Autonomia, expectativas, linguagem, atitudes e participação."},
    {id:5,module:"acessibilidade",title:"Acessibilidade",desc:"Acessibilidade física, comunicacional, pedagógica e digital."},
    {id:6,module:"dupla_exclusao",title:"Dupla exclusão",desc:"Cruzamento entre raça, deficiência e barreiras combinadas."},
    {id:7,module:"bullying",title:"Bullying e discriminação",desc:"Prevenção, proteção, intervenção, cyberbullying e convivência."},
    {id:8,module:"direitos",title:"Direitos e inclusão escolar",desc:"Dignidade, equidade, privacidade, participação e gestão democrática."},
    {id:9,module:"situacoes",title:"Situações-problema",desc:"Casos práticos para tomada de decisão na escola."},
    {id:10,module:"final",title:"Avaliação final",desc:"Verifica a evolução após a experiência completa do projeto."}
  ];

  function freshState(){
    return {
      deviceId: crypto.randomUUID ? crypto.randomUUID() : "dev-"+Date.now()+"-"+Math.random().toString(16).slice(2),
      profile:{name:"",classGroup:"",studentCode:""},
      packs:2,
      inventory:{},
      pasted:{},
      attempts:[],
      syncPending:[],
      simRewards:{},
      evaluationCompleted:{},
      createdAt:new Date().toISOString()
    };
  }
  function loadState(){
    try{
      const s=JSON.parse(localStorage.getItem(STORAGE)||"null");
      if(!s) return freshState();
      s.profile ||= {name:"",classGroup:"",studentCode:""}; s.inventory ||= {}; s.pasted ||= {}; s.attempts ||= []; s.syncPending ||= []; s.simRewards ||= {}; s.evaluationCompleted ||= {}; s.packs ??= 2;
      return s;
    }catch(e){return freshState()}
  }
  let state=loadState(), currentPage=1, activeQuiz=null, quizStart=0, teacherData=[], studentAssignments=[];
  function save(){localStorage.setItem(STORAGE,JSON.stringify(state));}
  function $(s){return document.querySelector(s)}
  function $$(s){return [...document.querySelectorAll(s)]}
  function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
  function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
  function sample(a,n){return shuffle(a).slice(0,n)}
  function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
  function showScreen(name){
    $$(".screen").forEach(s=>s.classList.remove("active"));
    const el=$("#screen-"+name); if(el) el.classList.add("active");
    $("#nav").classList.remove("open"); window.scrollTo({top:0,behavior:"smooth"});
    if(name==="album") renderAlbum();
    if(name==="simulados"){ renderSimList(); loadStudentAssignments(); }
    if(name==="progresso") renderStudentProgress();
    if(name==="professor") renderTeacherPanel();
    if(name==="perfil") fillProfile();
  }
  $$("[data-screen]").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));
  $("#menuBtn").addEventListener("click",()=>$("#nav").classList.toggle("open"));
  $("#gameBtn").addEventListener("click",()=>{window.location.href="game/index.html"});
  $("#modalClose").addEventListener("click",closeModal);
  $("#modal").addEventListener("click",e=>{if(e.target.id==="modal") closeModal()});
  function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden");$("#modal").setAttribute("aria-hidden","false")}
  function closeModal(){$("#modal").classList.add("hidden");$("#modal").setAttribute("aria-hidden","true")}
  function profileReady(){return state.profile.name.trim() && state.profile.classGroup.trim() && state.profile.studentCode.trim()}
  function ensureProfile(){if(profileReady())return true;toast("Identifique o aluno antes de continuar.");showScreen("perfil");return false}
  function fillProfile(){$("#studentName").value=state.profile.name||"";$("#studentClass").value=state.profile.classGroup||"";$("#studentCode").value=state.profile.studentCode||""}
  $("#profileForm").addEventListener("submit",e=>{
    e.preventDefault();
    state.profile={name:$("#studentName").value.trim(),classGroup:$("#studentClass").value.trim(),studentCode:$("#studentCode").value.trim()};
    if(!profileReady()){toast("Preencha nome, turma e código.");return}
    save();toast("Perfil salvo.");showScreen("simulados");
  });

  function pastedCount(){return Object.values(state.pasted).filter(Boolean).length}
  function inventoryCount(n){return Number(state.inventory[n]||0)}
  function renderAlbum(){
    $("#packsStat").textContent=state.packs;$("#stickersStat").textContent=pastedCount();
    $("#albumTabs").innerHTML=PAGES.map(p=>`<button data-page="${p.pagina}" class="${p.pagina===currentPage?'active':''}">Página ${p.pagina}</button>`).join("");
    $$("#albumTabs button").forEach(b=>b.addEventListener("click",()=>{currentPage=Number(b.dataset.page);renderAlbum()}));
    const p=PAGES.find(x=>x.pagina===currentPage);
    $("#albumIntro").innerHTML=`<h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p>`;
    const items=STICKERS.filter(s=>s.pagina===currentPage);
    $("#albumGrid").innerHTML=items.map(s=>{
      const owned=inventoryCount(s.numero), pasted=!!state.pasted[s.numero];
      const img=`figurinhas/${String(s.numero).padStart(2,"0")}.webp`;
      return `<article class="sticker ${pasted?'collected':''}">
        <div class="sticker-num">${String(s.numero).padStart(2,"0")}</div>
        <div class="sticker-img"><img src="${img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="fallback-art" style="display:none">DE</div></div>
        <h4>${esc(s.titulo)}</h4><small>${esc(s.tema)}</small>
        <div class="rarity">${esc(s.raridade)} • disponíveis: ${owned}</div>
        ${pasted?`<button class="secondary small" disabled>Colada ✓</button>`:owned>0?`<button class="primary small paste-btn" data-n="${s.numero}">Colar figurinha</button>`:`<button class="secondary small" disabled>Não encontrada</button>`}
      </article>`;
    }).join("");
    $$(".paste-btn").forEach(b=>b.addEventListener("click",()=>{
      const n=Number(b.dataset.n);if(inventoryCount(n)<=0)return;
      state.inventory[n]--;state.pasted[n]=true;save();renderAlbum();toast("Figurinha colada!");
    }));
  }
  $("#openPackBtn").addEventListener("click",openPack);
  function openPack(){
    if(!ensureProfile()) return;
    if(state.packs<=0){toast("Sem pacotes iniciais. As próximas figurinhas são conquistadas diretamente nos simulados.");return}
    state.packs--;
    const drawn=[];
    for(let i=0;i<5;i++){const s=STICKERS[Math.floor(Math.random()*STICKERS.length)];state.inventory[s.numero]=(state.inventory[s.numero]||0)+1;drawn.push(s)}
    save();renderAlbum();
    openModal(`<h2>Pacote aberto</h2><p>As 5 figurinhas foram adicionadas à sua coleção.</p><div class="sticker-grid">${drawn.map(s=>`<div class="sticker collected"><div class="sticker-num">${String(s.numero).padStart(2,"0")}</div><h4>${esc(s.titulo)}</h4><small>${esc(s.tema)}</small></div>`).join("")}</div>`);
  }

  function bestForSim(id){const a=state.attempts.filter(x=>x.simuladoId===id);return a.length?Math.max(...a.map(x=>x.score)):null}
  function stickerRewardForScore(score){ return Math.max(0,Math.min(5,Math.floor(Number(score||0)/2))); }
  function grantStickerReward(count){
    if(count<=0) return [];
    const preferred=shuffle(STICKERS.filter(s=>!state.pasted[s.numero] && inventoryCount(s.numero)===0));
    const chosen=[];
    while(chosen.length<count && preferred.length) chosen.push(preferred.shift());
    while(chosen.length<count && STICKERS.length) chosen.push(STICKERS[Math.floor(Math.random()*STICKERS.length)]);
    chosen.forEach(s=>{state.inventory[s.numero]=(state.inventory[s.numero]||0)+1;});
    return chosen;
  }
  function rewardNote(id){
    const reward=state.simRewards?.[id];
    if(reward) return `Premiação encerrada: ${Number(reward.count||0)} figurinha(s) recebida(s) na primeira conclusão. Você pode refazer para estudar, mas este simulado não premia novamente.`;
    return "Premiação única na primeira conclusão: 2–3 acertos = 1 figurinha; 4–5 = 2; 6–7 = 3; 8–9 = 4; 10 = 5.";
  }
  function renderSimList(){
    $("#simList").innerHTML=SIMS.map(s=>{
      const best=bestForSim(s.id);
      return `<article class="sim-card"><div><span class="eyebrow">SIMULADO ${s.id}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>${best!==null?`<div class="score">Melhor resultado: ${best}/10</div>`:""}<div class="sim-enh-note">${esc(rewardNote(s.id))}</div></div><div><button class="primary start-sim" data-id="${s.id}">Iniciar / refazer</button></div></article>`;
    }).join("");
    $$(".start-sim").forEach(b=>b.addEventListener("click",()=>startQuiz(Number(b.dataset.id),"practice",null)));
    renderRequestedEvaluations();
  }
  function startQuiz(id,mode="practice",assignment=null){
    if(!ensureProfile())return;
    const sim=SIMS.find(s=>s.id===id); if(!sim)return;
    const pool=BANK.filter(q=>q.module===sim.module);
    if(pool.length<10){toast("Banco de questões insuficiente para este simulado.");return}
    const qs=sample(pool,10).map(q=>{
      const opts=shuffle([q.correct,...q.wrongs]);
      return {...q,options:opts,correctIndex:opts.indexOf(q.correct)};
    });
    activeQuiz={sim,questions:qs,mode,assignment};quizStart=Date.now();
    $("#quizTag").textContent=mode==="evaluation"?`AVALIAÇÃO SOLICITADA • SIMULADO ${sim.id} • 10 QUESTÕES`:`SIMULADO ${sim.id} • 10 QUESTÕES`;
    $("#quizTitle").textContent=mode==="evaluation"?`${sim.title} — avaliação institucional`:sim.title;$("#quizProgress").textContent="0/10 respondidas";
    $("#quizQuestions").innerHTML=qs.map((q,i)=>`<article class="question-card"><h3>${i+1}. ${esc(q.question)}</h3>${q.options.map((o,j)=>`<label class="option"><input type="radio" name="q${i}" value="${j}"><span><b>${String.fromCharCode(65+j)}.</b> ${esc(o)}</span></label>`).join("")}<span class="skill-label">${esc(q.skill.replaceAll("_"," "))}</span></article>`).join("");
    $$('#quizForm input[type="radio"]').forEach(r=>r.addEventListener("change",()=>{
      const answered=new Set($$('#quizForm input[type="radio"]:checked').map(x=>x.name)).size;$("#quizProgress").textContent=`${answered}/10 respondidas`;
    }));
    showScreen("quiz");
  }
  $("#quizForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!activeQuiz)return;
    const answers=[];let score=0;
    for(let i=0;i<activeQuiz.questions.length;i++){
      const checked=$(`#quizForm input[name="q${i}"]:checked`);
      if(!checked){toast(`Responda a questão ${i+1}.`);return}
      const q=activeQuiz.questions[i], sel=Number(checked.value), ok=sel===q.correctIndex;if(ok)score++;
      answers.push({questionId:q.id,skill:q.skill,selected:q.options[sel],correct:q.correct,ok,explanation:q.explanation});
    }
    const duration=Math.max(1,Math.round((Date.now()-quizStart)/1000));
    const attempt={
      id:(crypto.randomUUID?crypto.randomUUID():"att-"+Date.now()+"-"+Math.random().toString(16).slice(2)),
      deviceId:state.deviceId,studentCode:state.profile.studentCode,studentName:state.profile.name,classGroup:state.profile.classGroup,
      simuladoId:activeQuiz.sim.id,title:activeQuiz.sim.title,score,total:10,durationSeconds:duration,responses:answers,completedAt:new Date().toISOString()
    };
    if(activeQuiz.mode==="evaluation"){
      const assignment=activeQuiz.assignment;
      try{
        await submitInstitutionalEvaluation(attempt,assignment);
        state.evaluationCompleted[assignment.assignment_id]=attempt.completedAt;save();
        window.DuplaAssignments?.invalidate?.();
        openModal(`<h2>Avaliação enviada com sucesso</h2><p>Suas respostas foram registradas.</p><p><b>O resultado desta avaliação é reservado ao professor que a solicitou, ao Gestor Escolar e ao Administrador do Sistema.</b></p><p>A nota, o gabarito e a correção não são exibidos ao estudante nesta aplicação institucional.</p><div class="form-actions"><button class="primary" onclick="document.getElementById('modalClose').click();document.querySelector('[data-screen=simulados]').click()">Voltar aos simulados</button></div>`);
      }catch(err){
        console.warn("evaluation submission",err);
        toast("Não foi possível enviar a avaliação. Verifique a internet e tente novamente.");
        return;
      }
      activeQuiz=null; await loadStudentAssignments(); return;
    }
    state.attempts.push(attempt);state.syncPending.push(attempt.id);
    let awardedNow=false, rewardCount=0, rewardStickers=[];
    if(!state.simRewards[activeQuiz.sim.id]){
      rewardCount=stickerRewardForScore(score);
      rewardStickers=grantStickerReward(rewardCount);
      state.simRewards[activeQuiz.sim.id]={score,count:rewardCount,stickerNumbers:rewardStickers.map(s=>s.numero),awardedAt:new Date().toISOString()};
      awardedNow=true;
    }
    save();
    await syncPending(false);
    const diff = activeQuiz.sim.id===10 ? evolutionText() : "";
    const rewardHtml=awardedNow
      ? `<p>Premiação única deste simulado: <b>${rewardCount} figurinha(s)</b>. ${rewardCount?`Recebidas: ${rewardStickers.map(s=>String(s.numero).padStart(2,"0")).join(", ")}.`:"A pontuação não atingiu a primeira faixa de premiação."} Este simulado não concederá novas figurinhas em outras tentativas.</p>`
      : `<p><b>Sem nova premiação:</b> a recompensa deste simulado já foi definida na primeira conclusão.</p>`;
    openModal(`<h2>Resultado: ${score}/10</h2><p class="${score>=7?'result-good':'result-bad'}">${score>=8?"Ótimo desempenho.":score>=6?"Bom começo; revise as questões erradas.":"Há pontos importantes para revisar."}</p>${diff?`<p><b>${esc(diff)}</b></p>`:""}${rewardHtml}<div>${answers.map((a,i)=>`<div class="answer-review"><b>${i+1}. ${a.ok?"✓ Correta":"✗ Revisar"}</b><br><span>Sua resposta: ${esc(a.selected)}</span>${a.ok?"":`<br><span>Correta: ${esc(a.correct)}</span><br><small>${esc(a.explanation)}</small>`}</div>`).join("")}</div><div class="form-actions"><button class="primary" onclick="document.getElementById('modalClose').click();document.querySelector('[data-screen=progresso]').click()">Ver progresso</button></div>`);
    activeQuiz=null;renderSimList();
  });
  function evolutionText(){
    const d=state.attempts.filter(a=>a.simuladoId===1); const f=state.attempts.filter(a=>a.simuladoId===10);
    if(!d.length||!f.length)return "";
    const db=Math.max(...d.map(a=>a.score)), fb=Math.max(...f.map(a=>a.score)), delta=(fb-db)*10;
    return `Comparação diagnóstico → final: ${db*10}% → ${fb*10}% (${delta>=0?"+":""}${delta} pontos percentuais).`;
  }

  function skillStats(attempts){
    const map={};
    attempts.forEach(a=>(a.responses||[]).forEach(r=>{map[r.skill] ||= {ok:0,total:0};map[r.skill].total++;if(r.ok)map[r.skill].ok++}));
    return Object.entries(map).map(([skill,v])=>({skill,...v,pct:v.total?Math.round(v.ok/v.total*100):0})).sort((a,b)=>a.pct-b.pct);
  }
  function renderBars(el,stats,limit=8){
    el.innerHTML=stats.slice(0,limit).map(s=>`<div class="bar-row"><span>${esc(s.skill.replaceAll("_"," "))}</span><div class="bar"><span style="width:${s.pct}%"></span></div><b>${s.pct}%</b></div>`).join("") || "<p>Sem dados ainda.</p>";
  }
  function renderStudentProgress(){
    const attempts=state.attempts, best=attempts.length?Math.max(...attempts.map(a=>a.score)):0, avg=attempts.length?(attempts.reduce((s,a)=>s+a.score,0)/attempts.length):0;
    $("#progressSummary").innerHTML=`<div class="metric"><strong>Aluno</strong><b style="font-size:1.2rem">${esc(state.profile.name||"Não identificado")}</b></div><div class="metric"><strong>Tentativas</strong><b>${attempts.length}</b></div><div class="metric"><strong>Média</strong><b>${avg.toFixed(1)}/10</b></div><div class="metric"><strong>Figurinhas</strong><b>${pastedCount()}/36</b></div>`;
    $("#studentAttempts").innerHTML=[...attempts].reverse().map(a=>`<div class="attempt-row"><span><b>Simulado ${a.simuladoId}</b> — ${esc(a.title)}</span><b>${a.score}/10</b><span class="date">${new Date(a.completedAt).toLocaleString("pt-BR")}</span></div>`).join("")||"<p>Nenhum simulado concluído.</p>";
    renderBars($("#studentSkills"),skillStats(attempts));
  }

  async function apiFetch(path,opts={},token=""){
    const s=CFG.supabase||{};if(!s.enabled||!s.url||!s.anonKey)throw new Error("Supabase não configurado");
    const headers={"apikey":s.anonKey,"Content-Type":"application/json",...(opts.headers||{})};
    headers.Authorization=`Bearer ${token||s.anonKey}`;
    const r=await fetch(s.url.replace(/\/$/,"")+path,{...opts,headers});
    if(!r.ok){const txt=await r.text();throw new Error(txt||`HTTP ${r.status}`)}
    const txt=await r.text();return txt?JSON.parse(txt):null;
  }
  async function submitInstitutionalEvaluation(attempt,assignment){
    if(!assignment?.assignment_id) throw new Error("Solicitação de avaliação inválida.");
    if(!navigator.onLine) throw new Error("A avaliação solicitada precisa de conexão para ser enviada.");
    await apiFetch("/rest/v1/evaluation_submissions",{
      method:"POST",
      headers:{"Prefer":"return=minimal"},
      body:JSON.stringify({
        assignment_id:assignment.assignment_id,
        device_id:attempt.deviceId,
        student_code:attempt.studentCode,
        student_name:attempt.studentName,
        class_group:attempt.classGroup,
        school_code:(CFG.supabase||{}).schoolCode||"PQF",
        simulado_id:attempt.simuladoId,
        score:attempt.score,
        total:attempt.total,
        duration_seconds:attempt.durationSeconds,
        responses:attempt.responses,
        completed_at:attempt.completedAt
      })
    });
  }
  function renderRequestedEvaluations(){
    const box=$("#requestedEvaluations");
    if(!box) return;
    if(!profileReady()){
      box.innerHTML='<div class="panel"><h3>Avaliações solicitadas</h3><p class="status-note">Identifique o aluno para consultar avaliações liberadas por professor ou gestão.</p></div>';
      return;
    }
    const evaluations=(studentAssignments||[]).filter(a=>a.activity_type==="simulado_avaliacao");
    if(!navigator.onLine){
      box.innerHTML='<div class="panel"><h3>Avaliações solicitadas</h3><p class="status-note">Conecte este aparelho à internet para consultar avaliações institucionais solicitadas.</p></div>';
      return;
    }
    box.innerHTML=`<div class="panel"><h3>Avaliações solicitadas</h3>${evaluations.length?evaluations.map(a=>`<div class="attempt-row"><span><b>Simulado ${a.simulado_id}</b> — solicitado por ${esc(a.requester_name||"professor/gestão")}</span><button class="primary small start-evaluation" data-assignment="${esc(a.assignment_id)}" data-sim="${Number(a.simulado_id)}">Responder avaliação</button></div>`).join(""):'<p class="status-note">Nenhuma avaliação institucional pendente para este aluno/turma.</p>'}</div>`;
    $$(".start-evaluation").forEach(btn=>btn.addEventListener("click",()=>{
      const assignment=studentAssignments.find(a=>a.assignment_id===btn.dataset.assignment);
      if(assignment) startQuiz(Number(btn.dataset.sim),"evaluation",assignment);
    }));
  }
  async function loadStudentAssignments(){
    if(!profileReady()){studentAssignments=[];renderRequestedEvaluations();return [];}
    if(!navigator.onLine){studentAssignments=[];renderRequestedEvaluations();return [];}
    try{
      studentAssignments=await (window.DuplaAssignments?.fetchForStudent?.({force:true})||Promise.resolve([]));
    }catch(e){console.warn("assignments",e);studentAssignments=[];}
    renderRequestedEvaluations();
    return studentAssignments;
  }

  async function syncPending(show=true){
    if(!navigator.onLine){if(show)toast("Sem internet. Dados continuam salvos no aparelho.");return}
    const s=CFG.supabase||{};if(!s.enabled){if(show)toast("Sincronização remota ainda não configurada.");return}
    const pending=state.syncPending.map(id=>state.attempts.find(a=>a.id===id)).filter(Boolean);
    if(!pending.length){if(show)toast("Nada pendente para sincronizar.");return}
    let ok=0;
    for(const a of pending){
      try{
        await apiFetch(`/rest/v1/${encodeURIComponent(s.attemptsTable||"student_attempts")}`,{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({
          id:a.id,device_id:a.deviceId,student_code:a.studentCode,student_name:a.studentName,class_group:a.classGroup,
          simulado_id:a.simuladoId,title:a.title,score:a.score,total:a.total,duration_seconds:a.durationSeconds,responses:a.responses,completed_at:a.completedAt
        })});
        state.syncPending=state.syncPending.filter(x=>x!==a.id);ok++;
      }catch(e){console.warn("sync",e)}
    }
    save();if(show)toast(ok?`${ok} resultado(s) sincronizado(s).`:"Não foi possível sincronizar.");
  }
  $("#syncBtn").addEventListener("click",()=>syncPending(true));

  function teacherSession(){try{return JSON.parse(localStorage.getItem(SESSION)||"null")}catch{return null}}
  async function teacherLogin(email,password){
    const s=CFG.supabase||{};if(!s.enabled)throw new Error("Configure o Supabase em www/config.js");
    const data=await apiFetch("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
    localStorage.setItem(SESSION,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,user:data.user,expires_at:Date.now()+Number(data.expires_in||3600)*1000}));
    return data;
  }
  $("#teacherLoginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    try{await teacherLogin($("#teacherEmail").value.trim(),$("#teacherPassword").value);toast("Professor autenticado.");renderTeacherPanel();await loadTeacherData();}
    catch(err){toast("Falha no login.");$("#teacherAuthStatus").textContent=err.message}
  });
  $("#teacherLogoutBtn").addEventListener("click",()=>{localStorage.removeItem(SESSION);teacherData=[];toast("Sessão encerrada.");renderTeacherPanel()});
  function renderTeacherPanel(){
    const sess=teacherSession();$("#teacherAuthStatus").textContent=sess?`Autenticado: ${sess.user?.email||"professor"}`:"Sem sessão remota. Dados locais continuam disponíveis.";
    const data=teacherData.length?teacherData:state.attempts;renderTeacherAggregates(data);
  }
  async function loadTeacherData(){
    const sess=teacherSession(), s=CFG.supabase||{};
    if(s.enabled && sess?.access_token){
      try{
        teacherData=await apiFetch(`/rest/v1/${encodeURIComponent(s.attemptsTable||"student_attempts")}?select=*&order=completed_at.desc`,{method:"GET"},sess.access_token) || [];
        teacherData=teacherData.map(x=>({id:x.id,deviceId:x.device_id,studentCode:x.student_code,studentName:x.student_name,classGroup:x.class_group,simuladoId:x.simulado_id,title:x.title,score:x.score,total:x.total,durationSeconds:x.duration_seconds,responses:x.responses||[],completedAt:x.completed_at}));
        toast("Dados remotos atualizados.");
      }catch(e){toast("Não foi possível carregar dados remotos.");console.warn(e);teacherData=[]}
    }else{
      teacherData=[...state.attempts];toast("Mostrando apenas dados deste aparelho.");
    }
    renderTeacherAggregates(teacherData);
  }
  $("#loadTeacherDataBtn").addEventListener("click",loadTeacherData);
  function renderTeacherAggregates(data){
    const groups={};data.forEach(a=>{const key=a.studentCode||a.deviceId;groups[key]||={name:a.studentName||key,classGroup:a.classGroup||"",attempts:[]};groups[key].attempts.push(a)});
    const students=Object.values(groups), avg=data.length?data.reduce((s,a)=>s+Number(a.score||0),0)/data.length:0, finals=data.filter(a=>a.simuladoId===10).length;
    $("#teacherCards").innerHTML=`<div class="metric"><strong>Alunos</strong><b>${students.length}</b></div><div class="metric"><strong>Tentativas</strong><b>${data.length}</b></div><div class="metric"><strong>Média geral</strong><b>${avg.toFixed(1)}/10</b></div><div class="metric"><strong>Avaliações finais</strong><b>${finals}</b></div>`;
    const tbody=$("#teacherTable tbody");
    tbody.innerHTML=students.sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{
      const av=s.attempts.reduce((x,a)=>x+Number(a.score||0),0)/s.attempts.length;const last=[...s.attempts].sort((a,b)=>new Date(b.completedAt)-new Date(a.completedAt))[0];
      return `<tr><td>${esc(s.name)}</td><td>${esc(s.classGroup)}</td><td>${s.attempts.length}</td><td>${av.toFixed(1)}/10</td><td>${new Date(last.completedAt).toLocaleString("pt-BR")}</td></tr>`;
    }).join("");
    renderBars($("#teacherSkills"),skillStats(data),12);
  }
  $("#exportTeacherCsvBtn").addEventListener("click",()=>{
    const data=teacherData.length?teacherData:state.attempts;if(!data.length){toast("Sem dados para exportar.");return}
    const rows=[["Aluno","Código","Turma","Simulado","Título","Acertos","Total","Duração (s)","Data"]];
    data.forEach(a=>rows.push([a.studentName,a.studentCode,a.classGroup,a.simuladoId,a.title,a.score,a.total,a.durationSeconds,a.completedAt]));
    const csv=rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dupla-exclusao-resultados.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  });

  function updateNetwork(){
    $("#networkBadge").textContent=navigator.onLine?"● Online":"● Offline";
    if(navigator.onLine){ syncPending(false); if(profileReady()) loadStudentAssignments(); }
  }
  window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork);updateNetwork();

  $("#prepareOfflineBtn").addEventListener("click",async()=>{
    if(!("serviceWorker" in navigator)){toast("Este navegador não oferece Service Worker.");return}
    const reg=await navigator.serviceWorker.ready;
    const target=reg.active||reg.waiting||reg.installing;
    if(target){target.postMessage({type:"CACHE_OFFLINE_FULL"});$("#offlineStatus").textContent="Preparando conteúdo completo para uso offline...";toast("Download offline iniciado.");}
  });
  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(console.warn));
    navigator.serviceWorker.addEventListener("message",e=>{if(e.data?.type==="OFFLINE_READY"){$("#offlineStatus").textContent="Conteúdo completo preparado para uso offline neste aparelho.";toast("Conteúdo offline pronto.");}});
  }

  renderSimList();renderAlbum();renderStudentProgress();renderTeacherPanel();if(profileReady())loadStudentAssignments();
})();
