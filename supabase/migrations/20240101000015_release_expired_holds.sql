-- Function to release expired slot holds
-- Called by pg_cron every minute
create or replace function release_expired_holds()
returns void as $$
begin
  update slots
    set status = 'available',
        held_until = null
    where status = 'held'
      and held_until < now();
end;
$$ language plpgsql security definer;

-- pg_cron job (run this manually in Supabase SQL editor if pg_cron is enabled):
-- select cron.schedule(
--   'release-expired-holds',
--   '* * * * *',
--   'select release_expired_holds()'
-- );
