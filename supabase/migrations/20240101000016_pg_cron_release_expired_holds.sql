-- Enable pg_cron extension for scheduled jobs
create extension if not exists pg_cron;

-- Schedule release_expired_holds() to run every minute
select cron.schedule(
  'release-expired-holds',
  '* * * * *',
  $$select release_expired_holds()$$
);
