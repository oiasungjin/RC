-- 단어 찾기 보조 질문 1~3번 답변과 실제 단어 대조 결과 저장
-- Supabase 대시보드 > SQL Editor에서 실행 (또는 supabase db push)

alter table public.vocabulary_items
  add column if not exists recall_clue_check jsonb;
