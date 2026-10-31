drop table if exists public.daily_recaps;

alter table public.trades drop constraint if exists trades_checklist_valid;
alter table public.trades
  drop column if exists checklist_passed,
  drop column if exists checklist_total;

alter table public.user_settings
  drop constraint if exists user_settings_checklist_items_valid;
alter table public.user_settings
  drop column if exists checklist_items;