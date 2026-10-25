create or replace function public.free_trade_limit()
returns integer
language sql
immutable
as $$ select 50 $$;

create or replace function public.user_has_pro_access(
  p_user_id uuid,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case s.status
        when 'active' then
          case
            when s.cancel_at_period_end then
              s.current_period_end is null
              or p_now < s.current_period_end + interval '24 hours'
            else true
          end
        when 'cancelled' then
          s.current_period_end is not null
          and p_now < s.current_period_end + interval '24 hours'
        else false
      end
      from public.subscriptions s
      where s.user_id = p_user_id
    ),
    false
  );
$$;

revoke all on function public.user_has_pro_access(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.user_has_pro_access(uuid, timestamptz)
  to service_role;

create or replace function public.current_user_has_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.user_has_pro_access(auth.uid());
$$;

revoke all on function public.current_user_has_pro() from public, anon;
grant execute on function public.current_user_has_pro() to authenticated, service_role;

create or replace function public.enforce_trade_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month_start timestamptz;
  v_count integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.user_id := old.user_id;
    return new;
  end if;

  new.created_at := now();

  if public.user_has_pro_access(new.user_id) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('trades:' || new.user_id::text, 0));

  v_month_start := date_trunc('month', now() at time zone 'utc') at time zone 'utc';

  select count(*) into v_count
  from public.trades t
  where t.user_id = new.user_id
    and t.created_at >= v_month_start;

  if v_count >= public.free_trade_limit() then
    raise exception 'FREE_TRADE_LIMIT_REACHED: the free plan allows % trades a month.',
      public.free_trade_limit()
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trades_enforce_rules on public.trades;
create trigger trades_enforce_rules
  before insert or update on public.trades
  for each row execute function public.enforce_trade_rules();

create index if not exists trades_user_id_created_at_idx
  on public.trades (user_id, created_at);

drop policy if exists "Users can insert their own attachments"
  on public.trade_attachments;
create policy "Users can insert their own attachments"
  on public.trade_attachments for insert
  with check (auth.uid() = user_id and public.current_user_has_pro());

drop policy if exists "Users can upload their own trade attachments"
  on storage.objects;
create policy "Users can upload their own trade attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'trade-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_has_pro()
  );