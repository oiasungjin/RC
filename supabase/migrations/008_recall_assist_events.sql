-- recall_assist_events : 사용자가 회상 보조 세션에서 입력한 단서와 결과를 기록
-- 로그인 사용자에게만 저장 (비로그인 = no-op). 분석 및 회상 패턴 연구에 활용.

create table if not exists public.recall_assist_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  recall_type text not null check (recall_type in ('object', 'person')),
  answers jsonb not null default '{}'::jsonb,
  found_word text,
  resolved boolean not null default false,
  used_llm boolean not null default false,
  vocab_item_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_recall_assist_user on public.recall_assist_events(user_id, created_at desc);

alter table public.recall_assist_events enable row level security;

drop policy if exists "own recall events all" on public.recall_assist_events;
create policy "own recall events all"
  on public.recall_assist_events for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id);
