-- 고정 범주(category / fixed_categories) 기능 제거
-- 사용자 분류는 custom_tags(자유 태그)만 사용한다.
-- Supabase 대시보드 > SQL Editor에서 통째로 실행 (또는 supabase db push)
--
-- 제거 대상
--   - category            text        (단일 범주, 003에서 추가)
--   - fixed_categories    text[]      (다중 범주, 005에서 추가)
--   - 관련 check 제약 / 인덱스
-- 유지
--   - custom_tags         text[]      (사용자 자유 태그) + idx_vocab_custom_tags

-- 1) 인덱스 제거 (idempotent)
drop index if exists public.idx_vocab_category;
drop index if exists public.idx_vocab_fixed_categories;

-- 2) check 제약 제거 (idempotent)
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_category_check;

-- 3) 컬럼 제거 (남은 의존 객체가 있으면 함께 정리)
alter table public.vocabulary_items
  drop column if exists category cascade,
  drop column if exists fixed_categories cascade;
