drop trigger if exists trades_enforce_rules on public.trades;
drop function if exists public.enforce_trade_rules();

drop policy if exists "Users can insert their own attachments"
  on public.trade_attachments;
create policy "Users can insert their own attachments"
  on public.trade_attachments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can upload their own trade attachments"
  on storage.objects;
create policy "Users can upload their own trade attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'trade-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop function if exists public.current_user_has_pro();
drop function if exists public.user_has_pro_access(uuid, timestamptz);
drop function if exists public.free_trade_limit();

drop index if exists public.trades_user_id_created_at_idx;