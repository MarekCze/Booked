-- JIT slot generation: lazily creates slot rows from schedule templates
-- Called when a client views a specialist's calendar for a date range
create or replace function ensure_slots_exist(
  p_specialist_id uuid,
  p_from          date,
  p_to            date
) returns void as $$
declare
  v_tenant_id         uuid;
  v_generated_through date;
  v_granularity       int;
  v_tz                text;
  v_start_date        date;
  v_current_date      date;
  v_dow               int;
  v_tmpl              record;
  v_slot_start        timestamptz;
  v_slot_end          timestamptz;
  v_break_start_ts    timestamptz;
  v_break_end_ts      timestamptz;
begin
  -- Get specialist's tenant and current watermark
  select s.tenant_id, s.slots_generated_through
    into v_tenant_id, v_generated_through
    from specialists s
    where s.id = p_specialist_id;

  if v_tenant_id is null then
    raise exception 'Specialist not found: %', p_specialist_id;
  end if;

  -- Get tenant timezone and slot granularity
  select t.timezone,
         coalesce((t.settings->>'slot_granularity_min')::int, 15)
    into v_tz, v_granularity
    from tenants t
    where t.id = v_tenant_id;

  -- Determine the start date: max of p_from and day after watermark
  if v_generated_through is null then
    v_start_date := p_from;
  else
    v_start_date := greatest(p_from, v_generated_through + 1);
  end if;

  -- Nothing to do if already generated through p_to
  if v_start_date > p_to then
    return;
  end if;

  -- Loop through each date in the range
  v_current_date := v_start_date;
  while v_current_date <= p_to loop
    -- Postgres: 0=Sunday, but our schema uses 0=Monday
    -- Convert: extract(isodow) gives 1=Mon..7=Sun, so we use (isodow - 1)
    v_dow := (extract(isodow from v_current_date)::int - 1);

    -- Find schedule template(s) for this specialist on this day
    for v_tmpl in
      select st.start_time, st.end_time, st.break_start, st.break_end
        from schedule_templates st
        where st.specialist_id = p_specialist_id
          and st.day_of_week = v_dow
    loop
      -- Generate slots from start_time to end_time at granularity intervals
      v_slot_start := (v_current_date || ' ' || v_tmpl.start_time)::timestamp
                      at time zone v_tz;

      -- Pre-compute break boundaries if break exists
      if v_tmpl.break_start is not null then
        v_break_start_ts := (v_current_date || ' ' || v_tmpl.break_start)::timestamp
                            at time zone v_tz;
        v_break_end_ts := (v_current_date || ' ' || v_tmpl.break_end)::timestamp
                          at time zone v_tz;
      else
        v_break_start_ts := null;
        v_break_end_ts := null;
      end if;

      while v_slot_start + (v_granularity || ' minutes')::interval
            <= (v_current_date || ' ' || v_tmpl.end_time)::timestamp at time zone v_tz
      loop
        v_slot_end := v_slot_start + (v_granularity || ' minutes')::interval;

        -- Skip slots that overlap with break period
        if v_break_start_ts is null
           or v_slot_end <= v_break_start_ts
           or v_slot_start >= v_break_end_ts
        then
          insert into slots (tenant_id, specialist_id, starts_at, ends_at, status)
            values (v_tenant_id, p_specialist_id, v_slot_start, v_slot_end, 'available')
            on conflict (specialist_id, starts_at) do nothing;
        end if;

        v_slot_start := v_slot_end;
      end loop;
    end loop;

    v_current_date := v_current_date + 1;
  end loop;

  -- Update watermark
  update specialists
    set slots_generated_through = greatest(slots_generated_through, p_to)
    where id = p_specialist_id;
end;
$$ language plpgsql security definer;
