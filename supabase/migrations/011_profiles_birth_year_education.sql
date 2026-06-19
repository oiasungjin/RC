-- 011: profiles에 생년(birth_year)·교육(education) 추가 — 또래 층화·인지 보정용(기획서 6장 데이터 갭).
-- 추가 컬럼은 nullable(비파괴). 2026-06-18 Supabase MCP apply_migration 으로 라이브 적용 완료.

alter table public.profiles
  add column if not exists birth_year int,
  add column if not exists education text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_year_chk') then
    alter table public.profiles
      add constraint profiles_birth_year_chk
      check (birth_year is null or (birth_year between 1900 and 2030));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_education_chk') then
    alter table public.profiles
      add constraint profiles_education_chk
      check (education is null or education in ('elementary','middle','high','college','grad','unspecified'));
  end if;
end $$;

-- 가입 시 user_metadata에서 gender/birth_year/education를 profiles로 복사하도록 트리거 갱신.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, role, gender, birth_year, education)
  values (
    new.id,
    new.email,
    'user',
    case when new.raw_user_meta_data->>'gender' in ('male','female','unspecified')
      then new.raw_user_meta_data->>'gender' else null end,
    case when (new.raw_user_meta_data->>'birth_year') ~ '^[0-9]{4}$'
              and (new.raw_user_meta_data->>'birth_year')::int between 1900 and 2030
      then (new.raw_user_meta_data->>'birth_year')::int else null end,
    case when new.raw_user_meta_data->>'education' in ('elementary','middle','high','college','grad','unspecified')
      then new.raw_user_meta_data->>'education' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
