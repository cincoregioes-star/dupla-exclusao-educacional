-- Dupla Exclusão — estrutura institucional Supabase
-- Perfis: admin, gestor, coordenador e professor.

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
  created_at timestamptz not null default now()
);

create index if not exists idx_attempts_student on public.student_attempts(student_code);
create index if not exists idx_attempts_class on public.student_attempts(class_group);
create index if not exists idx_attempts_school on public.student_attempts(school_code);
create index if not exists idx_attempts_sim on public.student_attempts(simulado_id);
create index if not exists idx_surveys_student on public.survey_responses(student_code);
create index if not exists idx_surveys_class on public.survey_responses(class_group);
create index if not exists idx_surveys_school on public.survey_responses(school_code);
create index if not exists idx_users_role on public.institutional_users(role);

-- Funções SECURITY DEFINER evitam recursão de RLS ao consultar o próprio perfil.
create or replace function public.current_institutional_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.institutional_users
  where user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function public.current_institutional_school()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school_code
  from public.institutional_users
  where user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function public.current_institutional_classes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select class_groups
  from public.institutional_users
  where user_id = auth.uid() and active = true
  limit 1;
$$;

grant execute on function public.current_institutional_role() to authenticated;
grant execute on function public.current_institutional_school() to authenticated;
grant execute on function public.current_institutional_classes() to authenticated;

alter table public.institutional_users enable row level security;
alter table public.student_attempts enable row level security;
alter table public.survey_responses enable row level security;

-- PERFIS INSTITUCIONAIS
-- Cada usuário lê o próprio perfil.
drop policy if exists institutional_users_self_read on public.institutional_users;
create policy institutional_users_self_read
on public.institutional_users for select
to authenticated
using (user_id = auth.uid());

-- Administrador pode ler todos os perfis institucionais.
drop policy if exists institutional_users_admin_read on public.institutional_users;
create policy institutional_users_admin_read
on public.institutional_users for select
to authenticated
using (public.current_institutional_role() = 'admin');

-- RESULTADOS DOS SIMULADOS
-- Tablets/alunos podem enviar resultados, mas não ler o conjunto institucional.
drop policy if exists attempts_device_insert on public.student_attempts;
create policy attempts_device_insert
on public.student_attempts for insert
to anon, authenticated
with check (
  student_code is not null
  and class_group is not null
  and school_code = 'PQF'
  and simulado_id between 1 and 10
  and total > 0
  and score between 0 and total
);

-- Admin, gestor e coordenador veem todos os resultados da escola vinculada.
drop policy if exists attempts_management_read on public.student_attempts;
create policy attempts_management_read
on public.student_attempts for select
to authenticated
using (
  public.current_institutional_role() in ('admin','gestor','coordenador')
  and public.current_institutional_school() = student_attempts.school_code
);

-- Professor vê somente suas turmas vinculadas.
drop policy if exists attempts_teacher_read on public.student_attempts;
create policy attempts_teacher_read
on public.student_attempts for select
to authenticated
using (
  public.current_institutional_role() = 'professor'
  and public.current_institutional_school() = student_attempts.school_code
  and student_attempts.class_group = any(coalesce(public.current_institutional_classes(), array[]::text[]))
);

-- PESQUISAS
-- Dispositivos inserem respostas. Não existe UPDATE anônimo para impedir alteração
-- de respostas de outro aluno que conheça apenas código/turma.
drop policy if exists surveys_device_insert on public.survey_responses;
create policy surveys_device_insert
on public.survey_responses for insert
to anon, authenticated
with check (
  student_code is not null
  and class_group is not null
  and school_code = 'PQF'
  and survey_id in ('convivencia','didatica')
);

-- Admin, gestor e coordenador veem todas as pesquisas da escola.
drop policy if exists surveys_management_read on public.survey_responses;
create policy surveys_management_read
on public.survey_responses for select
to authenticated
using (
  public.current_institutional_role() in ('admin','gestor','coordenador')
  and public.current_institutional_school() = survey_responses.school_code
);

-- Professor vê apenas pesquisas de suas turmas vinculadas.
drop policy if exists surveys_teacher_read on public.survey_responses;
create policy surveys_teacher_read
on public.survey_responses for select
to authenticated
using (
  public.current_institutional_role() = 'professor'
  and public.current_institutional_school() = survey_responses.school_code
  and survey_responses.class_group = any(coalesce(public.current_institutional_classes(), array[]::text[]))
);

-- Atualização automática de updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_institutional_users_updated on public.institutional_users;
create trigger trg_institutional_users_updated
before update on public.institutional_users
for each row execute function public.set_updated_at();

-- As contas são criadas em Supabase Auth. Depois, o UUID de auth.users.id
-- deve ser cadastrado em institutional_users.user_id com o perfil adequado.
