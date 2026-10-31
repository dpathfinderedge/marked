alter table public.user_settings
  add column if not exists checklist_items jsonb not null default '[]'::jsonb;

alter table public.user_settings
  drop constraint if exists user_settings_checklist_items_valid;
alter table public.user_settings
  add constraint user_settings_checklist_items_valid check (
    jsonb_typeof(checklist_items) = 'array'
    and jsonb_array_length(checklist_items) <= 10
  );

alter table public.trades
  add column if not exists checklist_passed smallint,
  add column if not exists checklist_total smallint;

alter table public.trades drop constraint if exists trades_checklist_valid;
alter table public.trades
  add constraint trades_checklist_valid check (
    (checklist_passed is null and checklist_total is null)
    or (
      checklist_total is not null
      and checklist_passed is not null
      and checklist_total between 1 and 10
      and checklist_passed between 0 and checklist_total
    )
  );

create table if not exists public.daily_recaps (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  note text not null check (char_length(note) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_recaps enable row level security;

drop policy if exists "Users can view their own recaps" on public.daily_recaps;
create policy "Users can view their own recaps"
  on public.daily_recaps for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recaps" on public.daily_recaps;
create policy "Users can insert their own recaps"
  on public.daily_recaps for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recaps" on public.daily_recaps;
create policy "Users can update their own recaps"
  on public.daily_recaps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own recaps" on public.daily_recaps;
create policy "Users can delete their own recaps"
  on public.daily_recaps for delete
  using (auth.uid() = user_id);