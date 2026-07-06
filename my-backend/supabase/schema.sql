create table if not exists public.documents (
  id text primary key,
  type text,
  vendor text,
  amount numeric default 0,
  category text,
  status text default 'review',
  stage integer default 3,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.documents enable row level security;

drop policy if exists "service_role_all_access" on public.documents;
create policy "service_role_all_access" on public.documents
for all
to service_role
using (true)
with check (true);

drop policy if exists "authenticated_read_documents" on public.documents;
create policy "authenticated_read_documents" on public.documents
for select
to authenticated
using (true);

drop policy if exists "authenticated_write_documents" on public.documents;
create policy "authenticated_write_documents" on public.documents
for insert
to authenticated
with check (true);

drop policy if exists "authenticated_update_documents" on public.documents;
create policy "authenticated_update_documents" on public.documents
for update
to authenticated
using (true)
with check (true);
