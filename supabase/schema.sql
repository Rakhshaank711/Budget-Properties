-- Budget Properties initial database schema.
-- Run this in Supabase Dashboard -> SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  city text,
  state text,
  role text not null default 'user' check (role in ('user', 'partner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_properties (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.visit_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  property_title text,
  preferred_time text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'scheduled', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.urgent_help_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  phone text,
  preferred_locality text,
  move_by date,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, full_name, email)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name'),
  users.email
from auth.users
on conflict (id) do nothing;

create index if not exists saved_properties_user_id_idx on public.saved_properties (user_id);
create index if not exists visit_requests_user_id_idx on public.visit_requests (user_id);
create index if not exists urgent_help_requests_user_id_idx on public.urgent_help_requests (user_id);

create table if not exists public.properties (
  id text primary key,
  title text not null,
  locality text not null,
  city text not null,
  state text,
  bhk text not null,
  rent integer not null,
  deposit integer not null default 0,
  area integer,
  type text,
  status text not null default 'Ready',
  image_url text,
  features text[] not null default '{}'::text[],
  description text,
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.properties add column if not exists latitude numeric;
alter table public.properties add column if not exists longitude numeric;

drop trigger if exists set_properties_updated_at on public.properties;
create trigger set_properties_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();

create index if not exists properties_is_active_idx on public.properties (is_active);
create index if not exists properties_city_locality_idx on public.properties (city, locality);
create index if not exists properties_lat_lng_idx on public.properties (latitude, longitude);
