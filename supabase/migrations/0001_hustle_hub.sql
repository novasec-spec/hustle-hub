-- Hustle Hub schema. All tables are per-user with row-level security.
create table public.hh_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, email text, phone text, company text,
  status text not null default 'lead' check (status in ('lead','active','past')),
  notes text, created_at timestamptz not null default now()
);
create table public.hh_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references public.hh_clients(id) on delete set null,
  number text not null, description text,
  amount numeric(12,2) not null default 0, currency text not null default 'USD',
  issue_date date not null default current_date, due_date date,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.hh_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid references public.hh_clients(id) on delete set null,
  name text not null, description text, deadline date,
  created_at timestamptz not null default now()
);
create table public.hh_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.hh_projects(id) on delete cascade,
  title text not null, status text not null default 'todo' check (status in ('todo','doing','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date, created_at timestamptz not null default now()
);
create table public.hh_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null, platform text not null check (platform in ('youtube','tiktok','instagram')),
  status text not null default 'idea' check (status in ('idea','scripting','filming','editing','scheduled','posted')),
  scheduled_for date, caption text, created_at timestamptz not null default now()
);
create table public.hh_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled', body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.hh_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, path text not null, size bigint, mime text,
  created_at timestamptz not null default now()
);
create table public.hh_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'General', description text,
  date date not null default current_date,
  invoice_id uuid references public.hh_invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['hh_clients','hh_invoices','hh_projects','hh_tasks','hh_content','hh_notes','hh_files','hh_transactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own_select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create index on public.%I (user_id)', t);
  end loop;
end $$;
create index on public.hh_invoices (client_id);
create index on public.hh_projects (client_id);
create index on public.hh_tasks (project_id);
create index on public.hh_transactions (invoice_id);

insert into storage.buckets (id, name, public, file_size_limit) values ('hh-files','hh-files', false, 52428800)
on conflict (id) do nothing;
create policy "hh_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'hh-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "hh_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'hh-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "hh_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'hh-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
