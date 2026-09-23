-- Oklahoma County Quest: database setup
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.

create extension if not exists pgcrypto;

-- ============ TABLES ============

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.students (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  name         text not null,
  name_key     text not null,
  created_at   timestamptz not null default now(),
  last_active  timestamptz not null default now(),
  unique (class_id, name_key)
);

create table if not exists public.progress (
  student_id         uuid primary key references public.students(id) on delete cascade,
  state              jsonb not null default '{}'::jsonb,
  stages_cleared     int not null default 0,
  counties_mastered  int not null default 0,
  map_best           int not null default 0,
  map_passed         boolean not null default false,
  seats_mastered     int not null default 0,
  total_answers      int not null default 0,
  total_correct      int not null default 0,
  seconds_played     int not null default 0,
  completed_at       timestamptz,
  updated_at         timestamptz not null default now()
);

create index if not exists students_class_idx on public.students(class_id);

-- ============ ROW LEVEL SECURITY ============
-- Students never read or write tables directly (they use the functions below).
-- Teachers can only see and change their own classes and those classes' students.

alter table public.classes  enable row level security;
alter table public.students enable row level security;
alter table public.progress enable row level security;

drop policy if exists "teacher manages own classes" on public.classes;
create policy "teacher manages own classes" on public.classes
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "teacher reads own students" on public.students;
create policy "teacher reads own students" on public.students
  for select to authenticated
  using (exists (select 1 from public.classes c where c.id = students.class_id and c.teacher_id = auth.uid()));

drop policy if exists "teacher deletes own students" on public.students;
create policy "teacher deletes own students" on public.students
  for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = students.class_id and c.teacher_id = auth.uid()));

drop policy if exists "teacher reads own progress" on public.progress;
create policy "teacher reads own progress" on public.progress
  for select to authenticated
  using (exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = progress.student_id and c.teacher_id = auth.uid()));

drop policy if exists "teacher resets own progress" on public.progress;
create policy "teacher resets own progress" on public.progress
  for update to authenticated
  using (exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = progress.student_id and c.teacher_id = auth.uid()))
  with check (exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = progress.student_id and c.teacher_id = auth.uid()));

-- ============ STUDENT FUNCTIONS ============

-- A student joins with a class code + name. Returns their id and saved progress.
create or replace function public.join_class(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class   public.classes;
  v_key     text;
  v_name    text;
  v_student public.students;
  v_state   jsonb;
begin
  select * into v_class from public.classes where code = upper(trim(p_code));
  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  v_name := left(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), 40);
  v_key  := lower(v_name);
  if length(v_key) < 2 then
    raise exception 'BAD_NAME';
  end if;

  select * into v_student from public.students where class_id = v_class.id and name_key = v_key;
  if not found then
    insert into public.students (class_id, name, name_key)
    values (v_class.id, v_name, v_key)
    returning * into v_student;
    insert into public.progress (student_id) values (v_student.id);
  else
    update public.students set last_active = now() where id = v_student.id;
  end if;

  select state into v_state from public.progress where student_id = v_student.id;

  return jsonb_build_object(
    'student_id', v_student.id,
    'name', v_student.name,
    'class_name', v_class.name,
    'state', coalesce(v_state, '{}'::jsonb)
  );
end;
$$;

-- Saves a student's progress. The student id (a random UUID) acts as their private key.
create or replace function public.save_progress(p_student uuid, p_state jsonb, p_summary jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_column_size(p_state) > 200000 then
    raise exception 'STATE_TOO_LARGE';
  end if;

  -- If the teacher reset this student, ignore saves from an older, pre-reset session.
  if coalesce((select (state->>'resetAt')::bigint from public.progress where student_id = p_student), 0)
     > coalesce((p_state->>'resetAt')::bigint, 0) then
    return;
  end if;

  update public.progress set
    state             = p_state,
    stages_cleared    = coalesce((p_summary->>'stages_cleared')::int, stages_cleared),
    counties_mastered = coalesce((p_summary->>'counties_mastered')::int, counties_mastered),
    map_best          = coalesce((p_summary->>'map_best')::int, map_best),
    map_passed        = coalesce((p_summary->>'map_passed')::boolean, map_passed),
    seats_mastered    = coalesce((p_summary->>'seats_mastered')::int, seats_mastered),
    total_answers     = coalesce((p_summary->>'total_answers')::int, total_answers),
    total_correct     = coalesce((p_summary->>'total_correct')::int, total_correct),
    seconds_played    = coalesce((p_summary->>'seconds_played')::int, seconds_played),
    completed_at      = case
                          when completed_at is null and coalesce((p_summary->>'seats_mastered')::int, 0) >= 77
                          then now() else completed_at end,
    updated_at        = now()
  where student_id = p_student;

  update public.students set last_active = now() where id = p_student;
end;
$$;

revoke all on function public.join_class(text, text) from public;
revoke all on function public.save_progress(uuid, jsonb, jsonb) from public;
grant execute on function public.join_class(text, text) to anon, authenticated;
grant execute on function public.save_progress(uuid, jsonb, jsonb) to anon, authenticated;
