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
  checklist_passed smallint,
  checklist_total smallint,
  created_at timestamptz not null default now(),
  constraint trades_checklist_valid check (
    (checklist_passed is null and checklist_total is null)
    or (
      checklist_total is not null
      and checklist_passed is not null
      and checklist_total between 1 and 10
      and checklist_passed between 0 and checklist_total
    )
  )
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
  checklist_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_settings_checklist_items_valid check (
    jsonb_typeof(checklist_items) = 'array'
    and jsonb_array_length(checklist_items) <= 10
  )
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


create table if not exists public.trade_attachments (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.trade_attachments enable row level security;

create policy "Users can view their own attachments"
  on public.trade_attachments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own attachments"
  on public.trade_attachments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own attachments"
  on public.trade_attachments for delete
  using (auth.uid() = user_id);


insert into storage.buckets (id, name, public)
values ('trade-attachments', 'trade-attachments', false)
on conflict (id) do nothing;

create policy "Users can upload their own trade attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'trade-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own trade attachments"
  on storage.objects for select
  using (
    bucket_id = 'trade-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own trade attachments"
  on storage.objects for delete
  using (
    bucket_id = 'trade-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'active', 'past_due', 'cancelled')),
  paystack_customer_code text,
  paystack_subscription_code text,
  plan_code text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_paystack_customer_code_idx
  on public.subscriptions (paystack_customer_code);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);


alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

create table if not exists public.webhook_events (
  id text primary key,
  provider text not null default 'paystack',
  event text not null,
  payload jsonb not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  note text,
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists webhook_events_received_at_idx
  on public.webhook_events (received_at);

alter table public.webhook_events enable row level security;

create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text)
  from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;


create table if not exists public.daily_recaps (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  note text not null check (char_length(note) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_recaps enable row level security;

create policy "Users can view their own recaps"
  on public.daily_recaps for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recaps"
  on public.daily_recaps for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recaps"
  on public.daily_recaps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own recaps"
  on public.daily_recaps for delete
  using (auth.uid() = user_id);