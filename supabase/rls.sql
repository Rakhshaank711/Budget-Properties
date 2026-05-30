-- Budget Properties Row Level Security policies.
-- Run this after schema.sql in Supabase Dashboard -> SQL Editor.

alter table public.profiles enable row level security;
alter table public.saved_properties enable row level security;
alter table public.visit_requests enable row level security;
alter table public.urgent_help_requests enable row level security;
alter table public.properties enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "Users can read own saved properties" on public.saved_properties;
create policy "Users can read own saved properties"
on public.saved_properties
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can save properties" on public.saved_properties;
create policy "Users can save properties"
on public.saved_properties
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own saved properties" on public.saved_properties;
create policy "Users can remove own saved properties"
on public.saved_properties
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own visit requests" on public.visit_requests;
create policy "Users can read own visit requests"
on public.visit_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create visit requests" on public.visit_requests;
create policy "Users can create visit requests"
on public.visit_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own visit requests" on public.visit_requests;
create policy "Users can delete own visit requests"
on public.visit_requests
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own urgent requests" on public.urgent_help_requests;
create policy "Users can read own urgent requests"
on public.urgent_help_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create urgent requests" on public.urgent_help_requests;
create policy "Users can create urgent requests"
on public.urgent_help_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own urgent requests" on public.urgent_help_requests;
create policy "Users can delete own urgent requests"
on public.urgent_help_requests
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can read active properties" on public.properties;
create policy "Anyone can read active properties"
on public.properties
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Partners can manage properties" on public.properties;
create policy "Partners can manage properties"
on public.properties
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('partner', 'admin')
  )
);
