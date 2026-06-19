-- 감정 강도(emotion_intensity) 컬럼 제거
-- Supabase 대시보드 > SQL Editor에서 실행

alter table public.vocabulary_items
  drop column if exists emotion_intensity;
