(() => {
  "use strict";

  const CFG = window.APP_CONFIG || {};
  const SESSION_KEY = "dupla_exclusao_teacher_session_v1";
  const PROFILE_KEY = "dupla_exclusao_institutional_profile_v1";
  const ROLE_LABELS = {
    admin: "Administrador do Sistema",
    gestor: "Gestor Escolar",
    coordenador: "Coordenação Pedagógica",
    professor: "Professor"
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const clear = () => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(PROFILE_KEY); };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

  function supabaseReady(){
    const s = CFG.supabase || {};
    return Boolean(s.enabled && s.url && s.anonKey);
  }

  async function api(path, opts = {}, token = ""){
    const s = CFG.supabase || {};
    if(!supabaseReady()) throw new Error("Supabase ainda não configurado.");
    const headers = { apikey: s.anonKey, "Content-Type": "application/json", ...(opts.headers || {}) };
    headers.Authorization = `Bearer ${token || s.anonKey}`;
    const response = await fetch(s.url.replace(/\/$/, "") + path, {...opts, headers});
    const text = await response.text();
    if(!response.ok) {
      let msg = text;
      try { msg = JSON.parse(text)?.msg || JSON.parse(text)?.message || text; } catch {}
      throw new Error(msg || `HTTP ${response.status}`);
    }
    return text ? JSON.parse(text) : null;
  }

  function getSession(){ return read(SESSION_KEY); }
  function getProfile(){ return read(PROFILE_KEY) || getSession()?.institutional_profile || null; }
  function isAuthenticated(){
    const session = getSession();
    const profile = getProfile();
    return Boolean(session?.access_token && profile?.active !== false && ROLE_LABELS[profile?.role]);
  }

  async function refreshSessionIfNeeded(){
    let session = getSession();
    if(!session?.access_token) return null;
    if(Number(session.expires_at || 0) > Date.now() + 60_000) return session;
    if(!session.refresh_token){ clear(); return null; }
    try {
      const auth = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      session = {
        ...session,
        access_token: auth.access_token,
        refresh_token: auth.refresh_token || session.refresh_token,
        user: auth.user || session.user,
        expires_at: Date.now() + Number(auth.expires_in || 3600) * 1000
      };
      write(SESSION_KEY, session);
      return session;
    } catch {
      clear();
      return null;
    }
  }

  async function fetchProfile(accessToken, userId){
    const rows = await api(`/rest/v1/institutional_users?user_id=eq.${encodeURIComponent(userId)}&select=user_id,full_name,role,active,school_code,school_name,class_groups&limit=1`, {method:"GET"}, accessToken);
    const profile = Array.isArray(rows) ? rows[0] : null;
    if(!profile) throw new Error("Conta autenticada, mas sem perfil institucional cadastrado.");
    if(profile.active === false) throw new Error("Este acesso institucional está desativado.");
    if(!ROLE_LABELS[profile.role]) throw new Error("Perfil institucional inválido.");
    return profile;
  }

  async function login(email, password){
    const auth = await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({email, password})
    });
    const userId = auth.user?.id;
    if(!userId) throw new Error("Usuário não identificado.");
    const profile = await fetchProfile(auth.access_token, userId);
    const session = {
      access_token: auth.access_token,
      refresh_token: auth.refresh_token,
      user: auth.user,
      expires_at: Date.now() + Number(auth.expires_in || 3600) * 1000,
      institutional_profile: profile
    };
    write(SESSION_KEY, session);
    write(PROFILE_KEY, profile);
    return {session, profile};
  }

  function injectStyles(){
    if($("#institutionalAuthStyles")) return;
    const style = document.createElement("style");
    style.id = "institutionalAuthStyles";
    style.textContent = `
      #screen-professor.institutional-locked .institutional-protected{display:none!important}
      #screen-professor .institutional-protected[hidden]{display:none!important}
      .institutional-access-card{position:relative;overflow:hidden;max-width:760px;margin:0 auto}
      .institutional-access-card::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(#facc15,#38bdf8,#22c55e)}
      .institutional-role-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px}.institutional-role-chip{display:inline-flex;align-items:center;border:1px solid #36577d;background:#09182b;color:#dbeafe;border-radius:999px;padding:5px 9px;font-size:.72rem;font-weight:900}
      .institutional-user-card{margin-top:10px;border:1px solid #2d8a60;background:rgba(34,197,94,.08);border-radius:12px;padding:11px}.institutional-user-card strong{color:#bbf7d0}.institutional-user-card small{display:block;color:#cbd5e1;margin-top:4px}
      .institutional-setup{margin-top:10px;border:1px solid #80651a;background:rgba(250,204,21,.08);color:#fde68a;border-radius:12px;padding:10px;line-height:1.4;font-size:.82rem}
      .institutional-lock-message{max-width:760px;margin:14px auto 0;background:#09182b;border:1px solid #36577d;border-radius:14px;padding:12px;color:#cbd5e1;text-align:center}
      .role-admin{border-color:#facc15!important;color:#fde68a!important}.role-gestor{border-color:#38bdf8!important;color:#bae6fd!important}.role-coordenador{border-color:#22c55e!important;color:#bbf7d0!important}.role-professor{border-color:#a78bfa!important;color:#ddd6fe!important}
      #screen-professor.institutional-locked .teacher-grid{display:block}
      #screen-professor.institutional-locked .teacher-grid > .panel:not(:first-child){display:none!important}
      #screen-professor.institutional-unlocked .institutional-lock-message{display:none!important}
      #screen-professor.institutional-unlocked .teacher-grid{display:grid}
      @media(max-width:760px){.institutional-access-card{max-width:none}}
    `;
    document.head.appendChild(style);
  }

  function prepareScreen(){
    const screen = $("#screen-professor");
    if(!screen) return;
    const title = screen.querySelector(".section-head h2");
    if(title) title.textContent = "DASHBOARD INSTITUCIONAL PARA TOMADA DE DECISÃO";

    const teacherGrid = screen.querySelector(".teacher-grid");
    const loginPanel = teacherGrid?.querySelector(".panel:first-child");
    const actionsPanel = teacherGrid?.querySelector(".panel:nth-child(2)");
    loginPanel?.classList.add("institutional-access-card");
    actionsPanel?.classList.add("institutional-protected");

    const loginTitle = loginPanel?.querySelector("h3");
    if(loginTitle) loginTitle.textContent = "ACESSO INSTITUCIONAL";
    const form = $("#teacherLoginForm");
    if(form){
      const firstLabel = form.querySelector("label:first-of-type");
      if(firstLabel?.firstChild) firstLabel.firstChild.textContent = "E-mail institucional ";
      const submit = form.querySelector('button[type="submit"]');
      if(submit) submit.textContent = "Entrar no dashboard";
      const logout = $("#teacherLogoutBtn");
      if(logout) logout.textContent = "Sair";
    }

    if(loginPanel && !loginPanel.querySelector(".institutional-role-row")){
      const roles = document.createElement("div");
      roles.className = "institutional-role-row";
      roles.innerHTML = `
        <span class="institutional-role-chip role-admin">Administrador</span>
        <span class="institutional-role-chip role-gestor">Gestor Escolar</span>
        <span class="institutional-role-chip role-coordenador">Coordenação Pedagógica</span>
        <span class="institutional-role-chip role-professor">Professor</span>`;
      form?.insertAdjacentElement("beforebegin", roles);
    }

    if(!screen.querySelector(".institutional-lock-message")){
      const lock = document.createElement("div");
      lock.className = "institutional-lock-message";
      lock.innerHTML = "🔒 Os resultados, gráficos, pesquisas e relatórios ficam disponíveis somente após autenticação institucional.";
      teacherGrid?.insertAdjacentElement("afterend", lock);
    }

    markProtectedNodes();
  }

  function markProtectedNodes(){
    const screen = $("#screen-professor");
    if(!screen) return;
    const teacherGrid = screen.querySelector(".teacher-grid");
    if(teacherGrid){
      [...teacherGrid.children].slice(1).forEach(el => el.classList.add("institutional-protected"));
    }
    [...screen.children].forEach(el => {
      if(el.classList.contains("section-head") || el === teacherGrid || el.classList.contains("institutional-lock-message")) return;
      el.classList.add("institutional-protected");
    });
    const dynamic = $("#institutionalDashboard");
    dynamic?.classList.add("institutional-protected");
  }

  function renderProfile(){
    const screen = $("#screen-professor");
    const status = $("#teacherAuthStatus");
    const profile = getProfile();
    const authenticated = isAuthenticated();
    if(!screen) return;

    markProtectedNodes();
    screen.classList.toggle("institutional-locked", !authenticated);
    screen.classList.toggle("institutional-unlocked", authenticated);
    $$("#screen-professor .institutional-protected").forEach(el => { el.hidden = !authenticated; });

    if(!authenticated){
      document.body.removeAttribute("data-institutional-role");
      if(status){
        status.innerHTML = supabaseReady()
          ? "Informe seu e-mail institucional e senha para acessar os dados."
          : '<div class="institutional-setup"><b>Integração institucional não configurada.</b></div>';
      }
      return;
    }

    document.body.dataset.institutionalRole = profile.role;
    if(status){
      status.innerHTML = `<div class="institutional-user-card"><strong>${esc(profile.full_name || "Usuário institucional")}</strong><small>${esc(ROLE_LABELS[profile.role] || profile.role)}${profile.school_name ? " • " + esc(profile.school_name) : ""}</small></div>`;
    }
    const adminNote = $("#institutionalAdminNote");
    if(adminNote) adminNote.hidden = profile.role !== "admin";
  }

  function addAdminArea(){
    const actions = $("#screen-professor .action-stack");
    if(!actions || $("#institutionalAdminNote")) return;
    const note = document.createElement("div");
    note.id = "institutionalAdminNote";
    note.className = "status-note";
    note.hidden = true;
    note.innerHTML = '<b>ADMINISTRADOR DO SISTEMA</b><br>Projeto digital e desenvolvimento — Prof. Carlos André Tavares de Lima<br><small>Perfil técnico para configuração, usuários e manutenção da plataforma.</small>';
    actions.insertAdjacentElement("afterend", note);
  }

  function interceptLogin(){
    const form = $("#teacherLoginForm");
    if(!form) return;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = $("#teacherAuthStatus");
      if(!supabaseReady()){
        if(status) status.innerHTML = '<div class="institutional-setup"><b>Supabase ainda não conectado.</b></div>';
        return;
      }
      const email = $("#teacherEmail")?.value.trim() || "";
      const password = $("#teacherPassword")?.value || "";
      if(!email || !password){ if(status) status.textContent = "Informe e-mail e senha."; return; }
      if(status) status.textContent = "Autenticando acesso institucional...";
      try {
        const {profile} = await login(email, password);
        renderProfile();
        if(status) status.innerHTML = `<div class="institutional-user-card"><strong>${esc(profile.full_name)}</strong><small>${esc(ROLE_LABELS[profile.role])} • acesso autorizado</small></div>`;
        setTimeout(() => $("#loadTeacherDataBtn")?.click(), 80);
      } catch(error){
        clear();
        renderProfile();
        if(status) status.textContent = `Acesso não autorizado: ${error.message}`;
      }
    }, true);

    $("#teacherLogoutBtn")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clear();
      renderProfile();
      if($("#teacherEmail")) $("#teacherEmail").value = "";
      if($("#teacherPassword")) $("#teacherPassword").value = "";
      const status = $("#teacherAuthStatus");
      if(status) status.textContent = "Sessão institucional encerrada.";
    }, true);
  }

  async function restore(){
    if(!supabaseReady()){ renderProfile(); return; }
    let session = await refreshSessionIfNeeded();
    if(!session){ renderProfile(); return; }
    try {
      const profile = await fetchProfile(session.access_token, session.user?.id);
      session.institutional_profile = profile;
      write(SESSION_KEY, session);
      write(PROFILE_KEY, profile);
    } catch {
      clear();
    }
    renderProfile();
  }

  function observeProtected(){
    const screen = $("#screen-professor");
    if(!screen) return;
    const observer = new MutationObserver(() => {
      markProtectedNodes();
      if(!isAuthenticated()) {
        $$("#screen-professor .institutional-protected").forEach(el => { el.hidden = true; });
      }
    });
    observer.observe(screen, {childList:true, subtree:false});
  }

  function init(){
    injectStyles();
    prepareScreen();
    addAdminArea();
    interceptLogin();
    observeProtected();
    renderProfile();
    restore();
    $$("[data-screen='professor']").forEach(btn => btn.addEventListener("click", () => setTimeout(renderProfile, 0)));
  }

  window.DuplaInstitutionalAuth = {
    getSession,
    getProfile,
    isAuthenticated,
    roleLabel: role => ROLE_LABELS[role] || role,
    logout: () => { clear(); renderProfile(); }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
