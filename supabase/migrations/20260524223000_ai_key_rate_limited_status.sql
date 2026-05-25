-- Distinguish Gemini quota/rate-limit state from invalid keys.

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_key_status_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_key_status_check
  check (key_status in ('not_configured','valid','invalid','test_failed','rate_limited','deleted'));

alter table public.user_ai_settings
  add column if not exists last_rate_limited_at timestamptz,
  add column if not exists retry_after_seconds int;
