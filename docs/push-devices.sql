create table if not exists public.push_devices (
  id bigserial primary key,
  user_id bigint not null references public.users (id) on delete cascade,
  provider text not null check (provider in ('apns', 'fcm')),
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  last_error text,
  unique (provider, token)
);

create index if not exists idx_push_devices_user_id on public.push_devices (user_id);
create index if not exists idx_push_devices_active on public.push_devices (user_id, disabled_at);
