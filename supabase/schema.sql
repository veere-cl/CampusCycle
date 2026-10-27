-- Campus Cycle production data model (Supabase Postgres).
-- Apply this in the Supabase SQL editor after creating a project.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.bikes (
  id text primary key,
  name text not null,
  station text not null,
  type text not null,
  hourly_rate_cents integer not null check (hourly_rate_cents >= 0),
  rating numeric(2,1),
  color_class text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bike_id text not null references public.bikes(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','confirmed','active','completed','cancelled','expired')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists rentals_user_created_idx on public.rentals (user_id, created_at desc);
create index if not exists rentals_bike_time_idx on public.rentals (bike_id, starts_at, ends_at);

-- Prevent two non-cancelled rentals from reserving the same bike at overlapping times.
alter table public.rentals drop constraint if exists rentals_no_overlapping_bike_reservations;
alter table public.rentals add constraint rentals_no_overlapping_bike_reservations
  exclude using gist (bike_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('pending_payment','confirmed','active'));

alter table public.bikes enable row level security;
alter table public.rentals enable row level security;

drop policy if exists "Anyone can view active bikes" on public.bikes;
create policy "Anyone can view active bikes" on public.bikes
  for select using (is_active = true);

drop policy if exists "Students can view their rentals" on public.rentals;
create policy "Students can view their rentals" on public.rentals
  for select to authenticated using (auth.uid() = user_id);

-- Booking writes and payment state changes must go through the trusted server.
-- Do not add client insert/update policies to rentals.
