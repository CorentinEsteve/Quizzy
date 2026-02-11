alter table public.daily_answers enable row level security;
alter table public.push_devices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_answers'
      and policyname = 'service_role_full_access_daily_answers'
  ) then
    create policy service_role_full_access_daily_answers
      on public.daily_answers
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_devices'
      and policyname = 'service_role_full_access_push_devices'
  ) then
    create policy service_role_full_access_push_devices
      on public.push_devices
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
