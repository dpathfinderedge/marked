alter table public.user_settings drop constraint if exists user_settings_risk_rules_valid;
alter table public.user_settings
  drop column if exists daily_loss_limit,
  drop column if exists max_trades_per_day,
  drop column if exists monthly_profit_target;