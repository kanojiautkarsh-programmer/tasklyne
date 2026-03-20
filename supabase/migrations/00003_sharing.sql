-- Shared tasks table for public/private sharing
create table public.shared_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  share_token text unique not null,
  is_public boolean default false,
  allow_comments boolean default false,
  expires_at timestamptz,
  view_count integer default 0,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Shared reports table
create table public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.research_reports(id) on delete cascade not null,
  share_token text unique not null,
  is_public boolean default false,
  expires_at timestamptz,
  view_count integer default 0,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.shared_tasks enable row level security;
alter table public.shared_reports enable row level security;

-- Shared tasks policies
create policy "Users can manage own shared tasks" on public.shared_tasks
  for all using (auth.uid() = created_by);

create policy "Anyone can view public shared tasks" on public.shared_tasks
  for select using (is_public = true);

-- Shared reports policies
create policy "Users can manage own shared reports" on public.shared_reports
  for all using (auth.uid() = created_by);

create policy "Anyone can view public shared reports" on public.shared_reports
  for select using (is_public = true);

-- Indexes
create index idx_shared_tasks_token on public.shared_tasks(share_token);
create index idx_shared_tasks_task_id on public.shared_tasks(task_id);
create index idx_shared_reports_token on public.shared_reports(share_token);
create index idx_shared_reports_report_id on public.shared_reports(report_id);
