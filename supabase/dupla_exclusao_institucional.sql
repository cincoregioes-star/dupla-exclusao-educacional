-- Dupla Exclusão — estrutura institucional Supabase
-- Execute como migration no projeto escolhido.

create extension if not exists pgcrypto;

create table if not exists public.institutional_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','gestor','coordenador','professor')),
  active boolean not null default true,
  school_code text not null default 'PQF',
  school_name text not null default 'E.M.E.F. Pedro de Queiroz Ferreira',
  class_groups text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_attempts (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  student_code text not null,
  student_name text not null,
  class_group text not null,
  school_code text not null default 'PQF',
  simulado_id integer not null check (simulado_id between 1 and 10),
  title text,
  score integer not null check (score >= 0),
  total integer not null default 10 check (total > 0),
  duration_seconds integer,
  responses jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  student_code text not null,
  student_name text not null,
  class_group text not null,
  school_code text not null default 'PQF',
  survey_id text not null check (survey_id in ('convivencia','didatica')),
  survey_title text not null,
  responses jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(student_code, survey_id)
);

create index if not exists idx_attempts_student on public.student_attempts(student_code);
create index if not exists idx_attempts_class on public.student_attempts(class_group);
create index if not exists idx_attempts_school on public.student_attempts(school_code);
create index if not exists idx_attempts_sim on public.student_attempts(simulado_id);
create index if not exists idx_surveys_student on public.survey_responses(student_code);
create index if not exists idx_surveys_class on public.survey_responses(class_group);
create index if not exists idx_users_role on public.institutional_users(role);

create or replace function public.current_institutional_profile()
returns public.institutional_users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.institutional_users where user_id = auth.uid() and active = true limit 1;
$$;

grant execute on function public.current_institutional_profile() to authenticated;

alter table public.institutional_users enable row level security;
alter table public.student_attempts enable row level security;
alter table public.survey_responses enable row level security;

-- Usuário autenticado lê apenas o próprio perfil institucional.
drop policy if exists institutional_users_self_read on public.institutional_users;
create policy institutional_users_self_read
on public.institutional_users for select
to authenticated
using (user_id = auth.uid());

-- Administrador pode visualizar todos os perfis.
drop policy if exists institutional_users_admin_read on public.institutional_users;
create policy institutional_users_admin_read
on public.institutional_users for select
to authenticated
using ((select role from public.institutional_users iu where iu.user_id = auth.uid() and iu.active = true) = 'admin');

-- Resultados: qualquer dispositivo anon pode inserir, mas nunca ler dados gerais.
drop policy if exists attempts_anon_insert on public.student_attempts;
create policy attempts_anon_insert
on public.student_attempts for insert
to anon, authenticated
with check (student_code is not null and class_group is not null and school_code = 'PQF');

-- Admin, gestor e coordenação visualizam toda a escola.
drop policy if exists attempts_management_read on public.student_attempts;
create policy attempts_management_read
on public.student_attempts for select
to authenticated
using (
  exists (
    select 1 from public.institutional_users iu
    where iu.user_id = auth.uid() and iu.active = true
      and iu.school_code = student_attempts.school_code
      and iu.role in ('admin','gestor','coordenador')
  )
);

-- Professor visualiza apenas turmas vinculadas ao seu cadastro.
drop policy if exists attempts_teacher_read on public.student_attempts;
create policy attempts_teacher_read
on public.student_attempts for select
to authenticated
using (
  exists (
    select 1 from public.institutional_users iu
    where iu.user_id = auth.uid() and iu.active = true
      and iu.school_code = student_attempts.school_code
      and iu.role = 'professor'
      and student_attempts.class_group = any(iu.class_groups)
  )
);

-- Pesquisas: dispositivos podem registrar/atualizar apenas pela chave aluno+pesquisa.
drop policy if exists surveys_insert on public.survey_responses;
create policy surveys_insert
on public.survey_responses for insert
to anon, authenticated
with check (student_code is not null and class_group is not null and school_code = 'PQF');

drop policy if exists surveys_update on public.survey_responses;
create policy surveys_update
on public.survey_responses for update
to anon, authenticated
using (school_code = 'PQF')
with check (school_code = 'PQF');

-- Admin, gestor e coordenação visualizam pesquisas da escola.
drop policy if exists surveys_management_read on public.survey_responses;
create policy surveys_management_read
on public.survey_responses for select
to authenticated
using (
  exists (
    select 1 from public.institutional_users iu
    where iu.user_id = auth.uid() and iu.active = true
      and iu.school_code = survey_responses.school_code
      and iu.role in ('admin','gestor','coordenador')
  )
);

-- Professor visualiza pesquisas apenas das turmas vinculadas.
drop policy if exists surveys_teacher_read on public.survey_responses;
create policy surveys_teacher_read
on public.survey_responses for select
to authenticated
using (
  exists (
    select 1 from public.institutional_users iu
    where iu.user_id = auth.uid() and iu.active = true
      and iu.school_code = survey_responses.school_code
      and iu.role = 'professor'
      and survey_responses.class_group = any(iu.class_groups)
  )
);

-- Atualiza updated_at dos perfis.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_institutional_users_updated on public.institutional_users;
create trigger trg_institutional_users_updated
before update on public.institutional_users
for each row execute function public.set_updated_at();

-- Observação:
-- As contas de login devem ser criadas no Supabase Auth e depois vinculadas aqui
-- pelo mesmo UUID em institutional_users.user_id.
