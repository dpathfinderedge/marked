alter table public.user_settings
  add column if not exists daily_loss_limit numeric,
  add column if not exists max_trades_per_day smallint,
  add column if not exists monthly_profit_target numeric;

alter table public.user_settings drop constraint if exists user_settings_risk_rules_valid;
alter table public.user_settings
  add constraint user_settings_risk_rules_valid check (
    (daily_loss_limit is null or (daily_loss_limit > 0 and daily_loss_limit <= 1000000000))
    and (max_trades_per_day is null or (max_trades_per_day between 1 and 100))
    and (monthly_profit_target is null or (monthly_profit_target > 0 and monthly_profit_target <= 1000000000))
  );