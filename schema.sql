-- ============================================
-- SCIENCE LINGO — Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor in order.
-- Enable Row Level Security (RLS) is included.
-- ============================================


-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";


-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  name           text not null,
  role           text not null default 'student' check (role in ('student', 'teacher')),
  avatar         text not null default 'flask', -- science-themed icon key
  class_section  text check (class_section in ('8A', '8B', '8C', '8D', '8E', '8F')), -- null for teachers
  student_number text unique,                   -- null for teachers; used as login identifier
  created_at     timestamptz not null default now()
);

-- ============================================
-- STUDENT PROFILES (game stats)
-- ============================================
create table public.student_stats (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  xp                 integer not null default 0,
  level              integer not null default 1,
  streak_weeks       integer not null default 0,
  last_session_date  date,
  overall_accuracy   numeric(5,2) not null default 0.00, -- e.g. 87.50
  total_sessions     integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(user_id)
);

-- ============================================
-- TOPICS (weekly question sets)
-- ============================================
create table public.topics (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,              -- e.g. "Plate Tectonics"
  standard     text,                       -- e.g. "7.10ab"
  description  text,                       -- short 2-3 sentence intro shown to students
  week_number  integer,
  created_by   uuid references public.profiles(id),
  is_active    boolean not null default false, -- only one topic active at a time
  created_at   timestamptz not null default now()
);

-- ============================================
-- QUESTIONS
-- ============================================
create table public.questions (
  id              uuid primary key default uuid_generate_v4(),
  topic_id        uuid not null references public.topics(id) on delete cascade,
  question_text   text not null,
  option_a        text not null,
  option_b        text not null,
  option_c        text not null,
  option_d        text not null,
  correct_option  text not null check (correct_option in ('a', 'b', 'c', 'd')),
  explanation     text not null,  -- shown after answer (right or wrong)
  hint            text,           -- optional, spendable in future hint system
  order_index     integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================
-- SESSIONS (one per student per topic attempt)
-- ============================================
create table public.sessions (
  id               uuid primary key default uuid_generate_v4(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  topic_id         uuid not null references public.topics(id) on delete cascade,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  accuracy_score   numeric(5,2),   -- calculated on completion
  xp_earned        integer,        -- calculated on completion
  correct_answers  integer not null default 0,
  total_attempts   integer not null default 0,  -- includes retries
  is_complete      boolean not null default false
);

-- ============================================
-- ANSWERS (one row per question attempt)
-- ============================================
create table public.answers (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  question_id     uuid not null references public.questions(id) on delete cascade,
  selected_option text not null check (selected_option in ('a', 'b', 'c', 'd')),
  is_correct      boolean not null,
  attempt_number  integer not null default 1, -- tracks retries per question
  answered_at     timestamptz not null default now()
);

-- ============================================
-- BADGES
-- ============================================
create table public.badges (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  badge_type  text not null check (badge_type in (
    'first_session',
    'perfectionist',
    'on_fire',
    'top_of_class',
    'most_improved',
    'science_brain',
    'veteran'
  )),
  earned_at   timestamptz not null default now(),
  unique(student_id, badge_type) -- no duplicate badges
);


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.student_stats enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.sessions enable row level security;
alter table public.answers enable row level security;
alter table public.badges enable row level security;

-- Profiles: users can read all, only update their own
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Student stats: all authenticated users can read (needed for leaderboard)
create policy "stats_select_all" on public.student_stats for select using (
  auth.uid() is not null
);
create policy "stats_insert_own" on public.student_stats for insert with check (auth.uid() = user_id);
create policy "stats_update_own" on public.student_stats for update using (auth.uid() = user_id);

-- Topics: everyone can read, only teachers can write
create policy "topics_select_all" on public.topics for select using (true);
create policy "topics_teacher_write" on public.topics for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
);

-- Questions: everyone can read
create policy "questions_select_all" on public.questions for select using (true);
create policy "questions_teacher_write" on public.questions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
);

-- Sessions: students see own, teachers see all
create policy "sessions_select" on public.sessions for select using (
  auth.uid() = student_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
);
create policy "sessions_insert_own" on public.sessions for insert with check (auth.uid() = student_id);
create policy "sessions_update_own" on public.sessions for update using (auth.uid() = student_id);

-- Answers: students see own, teachers see all
create policy "answers_select" on public.answers for select using (
  exists (select 1 from public.sessions where id = session_id and student_id = auth.uid()) or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
);
create policy "answers_insert_own" on public.answers for insert with check (
  exists (select 1 from public.sessions where id = session_id and student_id = auth.uid())
);

-- Badges: everyone can read (leaderboard/profiles), students earn own
create policy "badges_select_all" on public.badges for select using (true);
create policy "badges_insert_own" on public.badges for insert with check (auth.uid() = student_id);


-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Leaderboard view: aggregates stats for display (includes class_section for filtering)
create or replace view public.leaderboard as
  select
    p.id as student_id,
    p.name,
    p.avatar,
    p.class_section,
    ss.xp,
    ss.level,
    ss.streak_weeks,
    ss.overall_accuracy,
    ss.total_sessions,
    row_number() over (order by ss.overall_accuracy desc, ss.xp desc) as rank
  from public.profiles p
  join public.student_stats ss on ss.user_id = p.id
  where p.role = 'student';

-- Weekly leaderboard: based on sessions completed this week
create or replace view public.weekly_leaderboard as
  select
    p.id as student_id,
    p.name,
    p.avatar,
    coalesce(sum(s.xp_earned), 0) as weekly_xp,
    coalesce(avg(s.accuracy_score), 0) as weekly_accuracy,
    count(s.id) as sessions_this_week,
    row_number() over (order by coalesce(avg(s.accuracy_score), 0) desc, coalesce(sum(s.xp_earned), 0) desc) as weekly_rank
  from public.profiles p
  left join public.sessions s on s.student_id = p.id
    and s.is_complete = true
    and s.completed_at >= date_trunc('week', now())
  where p.role = 'student'
  group by p.id, p.name, p.avatar;


-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create student_stats row when a new student profile is created
create or replace function public.handle_new_student()
returns trigger language plpgsql security definer as $$
begin
  if new.role = 'student' then
    insert into public.student_stats (user_id)
    values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_student();

-- Calculate and update accuracy score after a session completes
create or replace function public.update_student_accuracy(p_student_id uuid)
returns void language plpgsql security definer as $$
declare
  v_accuracy numeric;
  v_total_sessions integer;
begin
  select
    round(avg(accuracy_score), 2),
    count(*)
  into v_accuracy, v_total_sessions
  from public.sessions
  where student_id = p_student_id and is_complete = true;

  update public.student_stats
  set
    overall_accuracy = coalesce(v_accuracy, 0),
    total_sessions = v_total_sessions,
    updated_at = now()
  where user_id = p_student_id;
end;
$$;


-- ============================================
-- MIGRATION: Run this if database already exists
-- (skip if running schema fresh)
-- ============================================

-- alter table public.profiles
--   add column if not exists class_section  text check (class_section in ('8A','8B','8C','8D','8E','8F')),
--   add column if not exists student_number text unique;

-- drop policy if exists "stats_select_own" on public.student_stats;
-- create policy "stats_select_all" on public.student_stats for select using (auth.uid() is not null);

-- Refresh leaderboard view (copy the view definition above and run create or replace view)