-- Notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('task_completed', 'task_failed', 'team_invite', 'billing', 'system')),
  title text not null,
  message text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.notifications enable row level security;

-- Notifications policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Users can delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- Indexes
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(is_read);
create index idx_notifications_created_at on public.notifications(created_at);
