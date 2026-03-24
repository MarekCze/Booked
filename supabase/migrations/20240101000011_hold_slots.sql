-- Atomically hold N contiguous available slots for a specialist
-- Uses FOR UPDATE SKIP LOCKED for safe concurrent access via PgBouncer
create or replace function hold_slots(
  p_specialist_id uuid,
  p_starts_at     timestamptz,
  p_slot_count    int
) returns uuid[] as $$
declare
  v_slot_ids    uuid[];
  v_starts      timestamptz[];
  v_granularity int;
  v_tenant_id   uuid;
  v_expected    timestamptz;
  i             int;
begin
  -- Get tenant and granularity
  select s.tenant_id into v_tenant_id
    from specialists s
    where s.id = p_specialist_id;

  select coalesce((t.settings->>'slot_granularity_min')::int, 15)
    into v_granularity
    from tenants t
    where t.id = v_tenant_id;

  -- Lock and fetch N available slots starting from p_starts_at
  select array_agg(id order by starts_at),
         array_agg(starts_at order by starts_at)
    into v_slot_ids, v_starts
    from (
      select id, starts_at
        from slots
        where specialist_id = p_specialist_id
          and starts_at >= p_starts_at
          and status = 'available'
        order by starts_at
        limit p_slot_count
        for update skip locked
    ) s;

  -- Verify we got exactly N slots
  if v_slot_ids is null or array_length(v_slot_ids, 1) is distinct from p_slot_count then
    raise exception 'Not enough available slots. Requested %, found %',
      p_slot_count, coalesce(array_length(v_slot_ids, 1), 0);
  end if;

  -- Verify slots are truly contiguous (no gaps)
  v_expected := p_starts_at;
  for i in 1..array_length(v_starts, 1) loop
    if v_starts[i] != v_expected then
      raise exception 'Slots are not contiguous. Expected % but found %',
        v_expected, v_starts[i];
    end if;
    v_expected := v_expected + (v_granularity || ' minutes')::interval;
  end loop;

  -- Mark slots as held with 5-minute TTL
  update slots
    set status = 'held',
        held_until = now() + interval '5 minutes'
    where id = any(v_slot_ids);

  return v_slot_ids;
end;
$$ language plpgsql security definer;
