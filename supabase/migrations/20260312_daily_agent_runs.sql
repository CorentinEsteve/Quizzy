create table if not exists public.daily_quiz_agent_runs (
  id bigserial primary key,
  run_id text not null unique,
  quiz_date date not null,
  status text not null,
  mode text not null,
  trigger text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms integer,
  created_quiz boolean not null default false,
  updated_quiz boolean not null default false,
  estimated_cost_usd numeric(12, 6) not null default 0,
  error_text text,
  summary_json jsonb not null default '{}'::jsonb,
  steps_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_quiz_agent_runs_quiz_date
  on public.daily_quiz_agent_runs (quiz_date desc);

create index if not exists idx_daily_quiz_agent_runs_started_at
  on public.daily_quiz_agent_runs (started_at desc);

alter table public.daily_quiz_agent_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_quiz_agent_runs'
      and policyname = 'service_role_full_access_daily_quiz_agent_runs'
  ) then
    create policy service_role_full_access_daily_quiz_agent_runs
      on public.daily_quiz_agent_runs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
