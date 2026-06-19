-- 하이브리드 분류 시스템: 고정 범주 다중 선택(fixed_categories) + 사용자 정의 태그(custom_tags)
-- Supabase 대시보드 > SQL Editor에서 실행 (또는 supabase db push)
--
-- 설계
--  - fixed_categories text[] : 기존 8개 고정 범주를 다중 선택으로 (단일 category 컬럼은 하위호환 유지)
--  - custom_tags     text[] : 사용자가 자유 입력하는 태그 ('영화','가족','여행' 등)
--  - 기존 category 단일 컬럼은 그대로 두고 fixed_categories[0]과 동기화 (관리자 페이지 호환)

alter table public.vocabulary_items
  add column if not exists fixed_categories text[] not null default '{}',
  add column if not exists custom_tags      text[] not null default '{}';

-- 기존 행 백필: 단일 category 값을 fixed_categories 배열로 옮긴다(비어 있을 때만).
update public.vocabulary_items
  set fixed_categories = array[category]
  where category is not null
    and (fixed_categories is null or cardinality(fixed_categories) = 0);

-- 배열 포함(@>, &&) 검색 가속을 위한 GIN 인덱스
create index if not exists idx_vocab_fixed_categories
  on public.vocabulary_items using gin (fixed_categories);
create index if not exists idx_vocab_custom_tags
  on public.vocabulary_items using gin (custom_tags);

-- 참고: 특정 태그가 달린 단어 조회 (PostgREST)
--   GET /vocabulary_items?custom_tags=cs.{영화}
-- 여러 태그 모두 포함(AND):
--   GET /vocabulary_items?custom_tags=cs.{영화,가족}
-- 여러 태그 중 하나라도(OR):
--   GET /vocabulary_items?custom_tags=ov.{영화,가족}
