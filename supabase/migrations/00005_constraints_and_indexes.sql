-- Fix CHECK constraint on subscription_status (migration version 5)
-- The column was created with 'canceled' (single L) but type definitions use 'canceled'
-- This migration aligns the database CHECK constraint with the TypeScript types

alter table public.profiles drop constraint if exists profiles_subscription_status_check;

alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in ('active', 'canceled', 'past_due'));

-- Add missing index on tasks.updated_at for efficient task sorting
create index if not exists idx_tasks_updated_at on public.tasks(updated_at);

-- Add missing index on team_members.role for permission checks
create index if not exists idx_team_members_role on public.team_members(role);
