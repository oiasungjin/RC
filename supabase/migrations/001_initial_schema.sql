-- 렉시케어 (Mnemo) 초기 스키마
-- Supabase 대시보드 > SQL Editor에서 통째로 실행

-- ============================================================
-- 1) profiles : auth.users 와 1:1 매핑 + 역할 (admin/user)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ============================================================
-- 2) vocabulary_items : 사용자가 기록한 단어
-- ============================================================
create table if not exists public.vocabulary_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_text text not null,
  category text check (category in ('person', 'place', 'animal', 'natural', 'artifact', 'food', 'abstract', 'proper')),
  emotion_tags text[] not null default '{}',
  context_note text,
  status text not null check (status in ('known', 'unknown')),
  source text not null check (source in ('user_input', 'llm_suggested')),
  parent_item_id text,
  recall_clue_check jsonb,
  difficulty_score numeric not null default 1.0,
  attempts int not null default 0,
  successes int not null default 0,
  last_tried_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_vocab_user on public.vocabulary_items(user_id, created_at desc);
create index if not exists idx_vocab_parent on public.vocabulary_items(parent_item_id);

-- ============================================================
-- 3) training_sessions : 회상 훈련 세션 (answers는 JSONB로)
-- ============================================================
create table if not exists public.training_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user on public.training_sessions(user_id, started_at desc);

-- ============================================================
-- 4) RLS 활성화
-- ============================================================
alter table public.profiles enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.training_sessions enable row level security;

-- ============================================================
-- 5) RLS 정책 — 본인 데이터만 보거나, admin이면 전체
-- ============================================================

-- 본인이 admin인지 체크하는 헬퍼 함수 (SECURITY DEFINER로 RLS 무한 재귀 방지)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles 정책
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- vocabulary_items 정책
drop policy if exists "own vocab all" on public.vocabulary_items;
create policy "own vocab all"
  on public.vocabulary_items for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- training_sessions 정책
drop policy if exists "own sessions all" on public.training_sessions;
create policy "own sessions all"
  on public.training_sessions for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);

-- ============================================================
-- 6) 가입 시 profiles 자동 생성 트리거
--    ADMIN_EMAIL 일치하면 자동 admin 부여
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text;
begin
  -- ADMIN_EMAIL은 Supabase Vault에서 가져오거나 직접 하드코딩
  -- (간단하게) 코드로 처리하므로 여기서는 'user'로 시작, 가입 후 admin은 SQL로 직접 부여 가능
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 7) 초기 관리자 부여 — 수동 실행 (가입 후 1회)
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'planb4u@planb4u.kr';
