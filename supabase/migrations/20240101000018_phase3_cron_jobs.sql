-- Phase 3: pg_cron jobs for SMS reminders and auto no-show marking

-- Run send-reminders edge function hourly for SMS reminders
-- Note: This requires pg_cron and pg_net extensions, and the Supabase
-- project to have the send-reminders function deployed.
-- Uncomment when ready to enable:
--
-- select cron.schedule(
--   'send-sms-reminders',
--   '0 * * * *',  -- every hour on the hour
--   $$
--   select net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Auto-mark no-shows every 30 minutes
select cron.schedule(
  'auto-mark-no-shows',
  '*/30 * * * *',
  $$ select auto_mark_no_shows(); $$
);
