drop policy if exists "Verified email required for app files" on storage.objects;
drop policy if exists "Verified email required" on public.daily_recaps;
drop policy if exists "Verified email required" on public.subscriptions;
drop policy if exists "Verified email required" on public.trade_attachments;
drop policy if exists "Verified email required" on public.user_settings;
drop policy if exists "Verified email required" on public.trades;

drop function if exists public.current_user_email_verified();