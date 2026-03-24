-- Find all valid start times for a service requiring N contiguous slots
-- Uses a window function to identify runs of consecutive available slots
create or replace function get_available_start_times(
  p_specialist_id uuid,
  p_date          date,
  p_slots_needed  int
) returns timestamptz[] as $$
declare
  v_results     timestamptz[];
  v_tz          text;
  v_granularity int;
  v_tenant_id   uuid;
  v_day_start   timestamptz;
  v_day_end     timestamptz;
begin
  -- Get tenant info
  select s.tenant_id into v_tenant_id
    from specialists s
    where s.id = p_specialist_id;

  select t.timezone,
         coalesce((t.settings->>'slot_granularity_min')::int, 15)
    into v_tz, v_granularity
    from tenants t
    where t.id = v_tenant_id;

  -- Ensure slots exist for this date
  perform ensure_slots_exist(p_specialist_id, p_date, p_date);

  -- Calculate day boundaries in the tenant's timezone
  v_day_start := (p_date::timestamp) at time zone v_tz;
  v_day_end := ((p_date + 1)::timestamp) at time zone v_tz;

  -- Find start times where N contiguous slots are available
  -- Strategy: for each available slot, count how many consecutive available
  -- slots follow it using a window function
  select array_agg(starts_at order by starts_at)
    into v_results
    from (
      select
        starts_at,
        -- Count consecutive available slots from this position
        count(*) over (
          partition by grp
          order by starts_at
          rows between current row and unbounded following
        ) as slots_ahead
      from (
        select
          starts_at,
          starts_at - (row_number() over (order by starts_at))
            * (v_granularity || ' minutes')::interval as grp
        from slots
        where specialist_id = p_specialist_id
          and starts_at >= v_day_start
          and starts_at < v_day_end
          and status = 'available'
      ) grouped
    ) counted
    where slots_ahead >= p_slots_needed;

  return coalesce(v_results, '{}');
end;
$$ language plpgsql security definer;
