create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  pair text not null,
  market text not null check (market in ('forex', 'crypto')),
  direction text not null check (direction in ('long', 'short')),
  session text not null check (
    session in ('Asian', 'London', 'New York', 'Overlap')
  ),
  tag text not null default '',
  risk numeric,
  pnl numeric not null,
  pips numeric,
  r_multiple numeric,
  notes text not null default '',
  calc_mode text not null check (calc_mode in ('direct', 'converted', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_date_idx
  on public.trades (user_id, date desc);

alter table public.trades enable row level security;

create policy "Users can view their own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert their own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trades"
  on public.trades for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trades"
  on public.trades for delete
  using (auth.uid() = user_id);


create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  consecutive_loss_threshold integer not null default 2,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);