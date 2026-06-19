-- 단어 범주(category) 컬럼 추가
-- 8개 값: person, place, animal, natural, artifact, food, abstract, proper
-- Supabase 대시보드 > SQL Editor에서 실행 (또는 supabase db push)

alter table public.vocabulary_items
  add column if not exists category text;

-- 기존에 컬럼만 있고 check 제약이 없는 경우 대비 (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vocabulary_items_category_check'
      and conrelid = 'public.vocabulary_items'::regclass
  ) then
    alter table public.vocabulary_items
      add constraint vocabulary_items_category_check
      check (category in ('person', 'place', 'animal', 'natural', 'artifact', 'food', 'abstract', 'proper'));
  end if;
end $$;

-- 관리자 페이지의 범주 필터 검색 가속
create index if not exists idx_vocab_category
  on public.vocabulary_items(category)
  where category is not null;
