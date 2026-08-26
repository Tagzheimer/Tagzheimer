-- ===========================================================================
-- Tagzheimer — Supabase schema
-- ===========================================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Idempotent — safe to re-run.
-- ===========================================================================

-- === profiles table (mirror of auth.users with extra fields) =============
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth.users row is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- === devices table ========================================================
create table if not exists public.devices (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  serial_number   text not null unique,
  patient_name    text not null,
  notes           text not null default '',
  status          text not null default 'offline' check (status in ('online', 'offline')),
  battery         integer not null default 100 check (battery >= 0 and battery <= 100),
  owner_id        uuid references auth.users(id) on delete set null,
  pairing_secret  text,
  last_seen       timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists devices_owner_id_idx on public.devices (owner_id);
create index if not exists devices_serial_number_idx on public.devices (serial_number);

-- === locations table =====================================================
create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid not null references public.devices(id) on delete cascade,
  latitude    double precision not null check (latitude >= -90 and latitude <= 90),
  longitude   double precision not null check (longitude >= -180 and longitude <= 180),
  satellites  integer,
  hdop        double precision,
  altitude    double precision,
  speed       double precision,
  battery     integer,
  source      text not null default 'unknown' check (source in ('esp32', 'mobile', 'web', 'unknown')),
  raw         jsonb,
  timestamp   timestamptz not null default now()
);

create index if not exists locations_device_id_timestamp_idx
  on public.locations (device_id, timestamp desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- Devices are CRUD-able by their owner only.
-- Locations are READ-only by device owners; writes happen via the backend
-- service role (which bypasses RLS).
-- ===========================================================================

alter table public.profiles  enable row level security;
alter table public.devices   enable row level security;
alter table public.locations enable row level security;

-- === profiles policies ===
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- === devices policies ===
drop policy if exists "Users can view their own devices" on public.devices;
create policy "Users can view their own devices"
  on public.devices for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert their own devices" on public.devices;
create policy "Users can insert their own devices"
  on public.devices for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own devices" on public.devices;
create policy "Users can update their own devices"
  on public.devices for update
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete their own devices" on public.devices;
create policy "Users can delete their own devices"
  on public.devices for delete
  using (auth.uid() = owner_id);

-- === locations policies (read-only via RLS; writes go through backend service role) ===
drop policy if exists "Users can read locations for their devices" on public.locations;
create policy "Users can read locations for their devices"
  on public.locations for select
  using (
    device_id in (select id from public.devices where owner_id = auth.uid())
  );

-- ===========================================================================
-- Demo seed data (optional)
-- ===========================================================================
-- Creates 4 demo devices + locations owned by the demo user.
-- Run AFTER you've signed up a demo user and replaced '<demo-user-uuid>'
-- with their auth.users.id.
-- ===========================================================================

-- INSERT INTO public.devices (name, serial_number, patient_name, status, battery, owner_id)
-- VALUES
--   ('Patient Tracker #001', 'TAG-001', 'John Smith',   'online',  87, '<demo-user-uuid>'),
--   ('Patient Tracker #002', 'TAG-002', 'Mary Johnson', 'online',  63, '<demo-user-uuid>'),
--   ('Patient Tracker #003', 'TAG-003', 'Robert Davis', 'offline', 12, '<demo-user-uuid>'),
--   ('Patient Tracker #004', 'TAG-004', 'Sarah Wilson', 'online',  94, '<demo-user-uuid>');
