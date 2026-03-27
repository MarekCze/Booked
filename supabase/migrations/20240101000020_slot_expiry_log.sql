-- 7.2.2: Slot expiry logging for monitoring hold conversion rates
create table if not exists slot_expiry_log (
  id          uuid primary key default gen_random_uuid(),
  expired_at  timestamptz default now(),
  slot_count  int not null
);

-- Update release_expired_holds to log expirations
create or replace function release_expired_holds()
returns void as $$
declare
  v_count int;
begin
  update slots
    set status = 'available',
        held_until = null
    where status = 'held'
      and held_until < now();

  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into slot_expiry_log (slot_count) values (v_count);
  end if;
end;
$$ language plpgsql security definer;
