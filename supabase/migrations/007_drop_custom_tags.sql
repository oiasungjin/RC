-- 나만의 태그(custom_tags) 기능 제거
-- 단어 분류 태그 체계를 모두 없앤다(범주 제거는 006 참고). 감정/메모만 남는다.
-- Supabase 대시보드 > SQL Editor에서 통째로 실행 (또는 supabase db push)
--
-- 제거 대상
--   - custom_tags  text[]  (사용자 자유 태그, 005에서 추가)
--   - idx_vocab_custom_tags (GIN 인덱스)

-- 1) 인덱스 제거 (idempotent)
drop index if exists public.idx_vocab_custom_tags;

-- 2) 컬럼 제거 (남은 의존 객체가 있으면 함께 정리)
alter table public.vocabulary_items
  drop column if exists custom_tags cascade;
