-- Teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Team members table
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references public.profiles(id),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

-- Team invitations table
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid references public.profiles(id),
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz default now(),
  unique(team_id, email)
);

-- Add columns to profiles for current team context
alter table public.profiles add column if not exists current_team_id uuid references public.teams(id) on delete set null;

-- Row Level Security
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;

-- Teams policies
create policy "Team owners can view own teams" on public.teams for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.team_members tm where tm.team_id = teams.id and tm.user_id = auth.uid()
  )
);
create policy "Team owners can insert own teams" on public.teams for insert with check (auth.uid() = owner_id);
create policy "Team owners can update own teams" on public.teams for update using (auth.uid() = owner_id);
create policy "Team owners can delete own teams" on public.teams for delete using (auth.uid() = owner_id);

-- Team members policies
create policy "Team members can view own team memberships" on public.team_members for select using (
  auth.uid() = user_id or exists (
    select 1 from public.teams t where t.id = team_members.team_id and t.owner_id = auth.uid()
  )
);
create policy "Team admins can insert team members" on public.team_members for insert with check (
  exists (
    select 1 from public.team_members tm 
    join public.teams t on t.id = tm.team_id
    where tm.team_id = team_members.team_id 
    and tm.user_id = auth.uid() 
    and tm.role in ('owner', 'admin')
  )
);
create policy "Team owners/admins can delete team members" on public.team_members for delete using (
  auth.uid() = user_id or exists (
    select 1 from public.team_members tm 
    join public.teams t on t.id = tm.team_id
    where tm.team_id = team_members.team_id 
    and tm.user_id = auth.uid() 
    and tm.role in ('owner', 'admin')
  )
);

-- Team invitations policies
create policy "Team admins can view invitations" on public.team_invitations for select using (
  exists (
    select 1 from public.team_members tm 
    join public.teams t on t.id = tm.team_id
    where tm.team_id = team_invitations.team_id 
    and tm.user_id = auth.uid() 
    and tm.role in ('owner', 'admin')
  )
);
create policy "Team admins can create invitations" on public.team_invitations for insert with check (
  exists (
    select 1 from public.team_members tm 
    join public.teams t on t.id = tm.team_id
    where tm.team_id = team_invitations.team_id 
    and tm.user_id = auth.uid() 
    and tm.role in ('owner', 'admin')
  )
);
create policy "Team admins can delete invitations" on public.team_invitations for delete using (
  exists (
    select 1 from public.team_members tm 
    join public.teams t on t.id = tm.team_id
    where tm.team_id = team_invitations.team_id 
    and tm.user_id = auth.uid() 
    and tm.role in ('owner', 'admin')
  )
);

-- Profiles policy for team context
create policy "Users can update own profile team context" on public.profiles for update using (auth.uid() = id);

-- Indexes
create index idx_teams_owner_id on public.teams(owner_id);
create index idx_team_members_team_id on public.team_members(team_id);
create index idx_team_members_user_id on public.team_members(user_id);
create index idx_team_invitations_team_id on public.team_invitations(team_id);
create index idx_team_invitations_token on public.team_invitations(token);
create index idx_team_invitations_email on public.team_invitations(email);
create index idx_profiles_current_team_id on public.profiles(current_team_id);
