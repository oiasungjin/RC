-- LLM 동급어 10개 응답 영구 캐시.
-- 같은 단어 재조회 시 LLM(Anthropic) 호출을 건너뛰어 비용/지연을 줄인다.
-- 전역 공유 캐시(사용자 무관)이며 서버의 service_role 키로만 접근한다.
-- 적용은 선택: 이 테이블이 없어도 앱은 인메모리 캐시로 정상 동작한다.

create table if not exists public.llm_word_cache (
  cache_key  text primary key,        -- "{locale}:{정규화 단어}" 예) "ko:제네시스"
  locale     text not null,
  word       text not null,           -- 원본 입력 단어(디버깅/조회용)
  items      jsonb not null,          -- RelatedWord[] (정확히 10개)
  created_at timestamptz not null default now()
);

create index if not exists llm_word_cache_locale_idx on public.llm_word_cache (locale);

-- 캐시는 클라이언트가 직접 접근할 일이 없다.
-- RLS를 켜고 정책을 만들지 않으면 anon/authenticated 접근은 전부 차단되고,
-- RLS를 우회하는 service_role(서버 라우트)만 읽고 쓸 수 있다.
alter table public.llm_word_cache enable row level security;
