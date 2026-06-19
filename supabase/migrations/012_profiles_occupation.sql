-- 012: profiles 교육(education) → 직업(occupation) 교체.
-- 011에서 막 추가한 education은 데이터가 없어 드롭(비파괴). 2026-06-18 MCP apply_migration 적용 완료.

alter table public.profiles drop constraint if exists profiles_education_chk;
alter table public.profiles drop column if exists education;

alter table public.profiles add column if not exists occupation text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_occupation_chk') then
    alter table public.profiles
      add constraint profiles_occupation_chk
      check (occupation is null or occupation in (
        'professional','office','technical','service','selfemployed',
        'agriculture','homemaker','student','retired','other','unspecified'
      ));
  end if;
end $$;

-- 가입 시 user_metadata에서 gender/birth_year/occupation를 profiles로 복사.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, role, gender, birth_year, occupation)
  values (
    new.id,
    new.email,
    'user',
    case when new.raw_user_meta_data->>'gender' in ('male','female','unspecified')
      then new.raw_user_meta_data->>'gender' else null end,
    case when (new.raw_user_meta_data->>'birth_year') ~ '^[0-9]{4}$'
              and (new.raw_user_meta_data->>'birth_year')::int between 1900 and 2030
      then (new.raw_user_meta_data->>'birth_year')::int else null end,
    case when new.raw_user_meta_data->>'occupation' in (
        'professional','office','technical','service','selfemployed',
        'agriculture','homemaker','student','retired','other','unspecified')
      then new.raw_user_meta_data->>'occupation' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
