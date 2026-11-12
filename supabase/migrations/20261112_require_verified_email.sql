create or replace function public.current_user_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.current_user_email_verified() from public, anon;
grant execute on function public.current_user_email_verified()
  to authenticated, service_role;

drop policy if exists "Verified email required" on public.trades;
create policy "Verified email required"
  on public.trades as restrictive for all to authenticated
  using ((select public.current_user_email_verified()));

drop policy if exists "Verified email required" on public.user_settings;
create policy "Verified email required"
  on public.user_settings as restrictive for all to authenticated
  using ((select public.current_user_email_verified()));

drop policy if exists "Verified email required" on public.trade_attachments;
create policy "Verified email required"
  on public.trade_attachments as restrictive for all to authenticated
  using ((select public.current_user_email_verified()));

drop policy if exists "Verified email required" on public.subscriptions;
create policy "Verified email required"
  on public.subscriptions as restrictive for all to authenticated
  using ((select public.current_user_email_verified()));

drop policy if exists "Verified email required" on public.daily_recaps;
create policy "Verified email required"
  on public.daily_recaps as restrictive for all to authenticated
  using ((select public.current_user_email_verified()));

drop policy if exists "Verified email required for app files" on storage.objects;
create policy "Verified email required for app files"
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id not in ('trade-attachments', 'avatars')
    or (select public.current_user_email_verified())
  );