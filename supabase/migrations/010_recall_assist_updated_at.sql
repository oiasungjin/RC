-- 회상 도우미 이벤트에 마지막 활동 시각 컬럼 추가
-- created_at = 세션 시작 시각으로 고정, updated_at = 매 저장(증분 upsert) 시 갱신.
alter table public.recall_assist_events add column if not exists updated_at timestamptz not null default now();
