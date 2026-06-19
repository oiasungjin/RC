-- recall_assist_events 구조 변경 : answers(jsonb) 한 덩어리 -> 질문별 전용 컬럼
-- 각 질문에 대한 사용자의 대답을 컬럼 하나씩으로 분리해 조회·분석을 쉽게 한다.
-- (008에서 만든 빈 테이블을 재구성. 데이터 없음.)

alter table public.recall_assist_events
  drop column if exists answers,
  -- 사물/단어 찾기 5문항
  add column if not exists ans_context text,        -- 1. 마지막으로 이 단어를 썼던 상황
  add column if not exists ans_meaning text,        -- 2. 비슷한 뜻의 단어
  add column if not exists ans_visual text,         -- 3. 사물의 모습/장면
  add column if not exists ans_first_sound text,    -- 4. 첫 소리(느낌)
  add column if not exists ans_syllables text,      -- 5. 글자 수
  -- 사람 이름 찾기 4문항
  add column if not exists ans_person_field text,       -- 직업/분야
  add column if not exists ans_person_work text,        -- 작품/뉴스/유행어
  add column if not exists ans_person_appearance text,  -- 외모/분위기
  add column if not exists ans_person_initial text;     -- 글자수/성씨/초성

comment on column public.recall_assist_events.ans_context is '사물Q1: 마지막으로 이 단어를 썼던 상황';
comment on column public.recall_assist_events.ans_meaning is '사물Q2: 비슷한 뜻의 단어';
comment on column public.recall_assist_events.ans_visual is '사물Q3: 모습/장면';
comment on column public.recall_assist_events.ans_first_sound is '사물Q4: 첫 소리(느낌)';
comment on column public.recall_assist_events.ans_syllables is '사물Q5: 글자 수';
comment on column public.recall_assist_events.ans_person_field is '사람Q1: 직업/분야';
comment on column public.recall_assist_events.ans_person_work is '사람Q2: 작품/뉴스/유행어';
comment on column public.recall_assist_events.ans_person_appearance is '사람Q3: 외모/분위기';
comment on column public.recall_assist_events.ans_person_initial is '사람Q4: 글자수/성씨/초성';
