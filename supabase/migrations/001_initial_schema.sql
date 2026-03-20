-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  company_name text,
  stripe_customer_id text unique,
  subscription_tier text default 'free' check (subscription_tier in ('free','starter','pro','scale')),
  subscription_status text default 'active' check (subscription_status in ('active','canceled','past_due')),
  created_at timestamptz default now()
);

-- API keys (BYOK)
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null check (provider in ('openai','anthropic','gemini')),
  encrypted_key text not null,
  is_valid boolean default true,
  created_at timestamptz default now(),
  unique(user_id, provider)
);

-- Agent tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  agent_type text not null check (agent_type in ('research','build','growth')),
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending','running','completed','failed')),
  input_params jsonb,
  output jsonb,
  tokens_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Research reports
create table public.research_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  report_type text check (report_type in ('market_analysis','competitor','sentiment')),
  content jsonb not null,
  sources jsonb,
  created_at timestamptz default now()
);

-- Build artifacts
create table public.build_artifacts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  artifact_type text check (artifact_type in ('prd','feature_spec','user_stories','tech_stack')),
  content jsonb not null,
  created_at timestamptz default now()
);

-- Growth campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  campaign_type text check (campaign_type in ('cold_email','blog','onboarding')),
  content jsonb not null,
  recipients jsonb,
  status text default 'draft' check (status in ('draft','scheduled','sent')),
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Integrations
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null,
  credentials jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Usage logs
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  agent_type text,
  action text,
  tokens_used integer,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.api_keys enable row level security;
alter table public.tasks enable row level security;
alter table public.research_reports enable row level security;
alter table public.build_artifacts enable row level security;
alter table public.campaigns enable row level security;
alter table public.integrations enable row level security;
alter table public.usage_logs enable row level security;

-- Policies: users can only access their own data
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own api_keys" on public.api_keys for select using (auth.uid() = user_id);
create policy "Users can insert own api_keys" on public.api_keys for insert with check (auth.uid() = user_id);
create policy "Users can update own api_keys" on public.api_keys for update using (auth.uid() = user_id);
create policy "Users can delete own api_keys" on public.api_keys for delete using (auth.uid() = user_id);

create policy "Users can view own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on public.tasks for update using (auth.uid() = user_id);

create policy "Users can view own research_reports" on public.research_reports for select using (
  exists (select 1 from public.tasks t where t.id = research_reports.task_id and t.user_id = auth.uid())
);
create policy "Users can insert own research_reports" on public.research_reports for insert with check (
  exists (select 1 from public.tasks t where t.id = research_reports.task_id and t.user_id = auth.uid())
);

create policy "Users can view own build_artifacts" on public.build_artifacts for select using (
  exists (select 1 from public.tasks t where t.id = build_artifacts.task_id and t.user_id = auth.uid())
);
create policy "Users can insert own build_artifacts" on public.build_artifacts for insert with check (
  exists (select 1 from public.tasks t where t.id = build_artifacts.task_id and t.user_id = auth.uid())
);

create policy "Users can view own campaigns" on public.campaigns for select using (
  exists (select 1 from public.tasks t where t.id = campaigns.task_id and t.user_id = auth.uid())
);
create policy "Users can insert own campaigns" on public.campaigns for insert with check (
  exists (select 1 from public.tasks t where t.id = campaigns.task_id and t.user_id = auth.uid())
);
create policy "Users can update own campaigns" on public.campaigns for update using (
  exists (select 1 from public.tasks t where t.id = campaigns.task_id and t.user_id = auth.uid())
);

create policy "Users can manage own integrations" on public.integrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view own usage_logs" on public.usage_logs for select using (auth.uid() = user_id);
create policy "Users can insert own usage_logs" on public.usage_logs for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_agent_type on public.tasks(agent_type);
create index idx_api_keys_user_id on public.api_keys(user_id);
create index idx_usage_logs_user_id on public.usage_logs(user_id);
create index idx_usage_logs_created_at on public.usage_logs(created_at);
