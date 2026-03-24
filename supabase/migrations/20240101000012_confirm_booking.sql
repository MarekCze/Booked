-- Confirm a booking: creates the booking row and marks held slots as booked
create or replace function confirm_booking(
  p_slot_ids       uuid[],
  p_specialist_id  uuid,
  p_service_id     uuid,
  p_tenant_id      uuid,
  p_client_id      uuid,
  p_client_name    text,
  p_client_phone   text,
  p_price_cents    int,
  p_payment_intent text default null
) returns uuid as $$
declare
  v_booking_id uuid;
  v_starts_at  timestamptz;
  v_ends_at    timestamptz;
  v_slot_count int;
  v_held_count int;
begin
  v_slot_count := array_length(p_slot_ids, 1);

  -- Verify all slots are still held
  select count(*) into v_held_count
    from slots
    where id = any(p_slot_ids)
      and status = 'held'
    for update;

  if v_held_count != v_slot_count then
    raise exception 'Not all slots are still held. Expected %, found %',
      v_slot_count, v_held_count;
  end if;

  -- Get start and end times from the slots
  select min(starts_at), max(ends_at)
    into v_starts_at, v_ends_at
    from slots
    where id = any(p_slot_ids);

  -- Create the booking
  insert into bookings (
    tenant_id, specialist_id, service_id,
    starts_at, ends_at, slot_count,
    client_id, client_name, client_phone,
    status, payment_status, stripe_payment_intent_id, price_cents
  ) values (
    p_tenant_id, p_specialist_id, p_service_id,
    v_starts_at, v_ends_at, v_slot_count,
    p_client_id, p_client_name, p_client_phone,
    'confirmed',
    case when p_payment_intent is not null then 'paid' else 'unpaid' end,
    p_payment_intent, p_price_cents
  ) returning id into v_booking_id;

  -- Update slots to booked
  update slots
    set status = 'booked',
        booking_id = v_booking_id,
        held_until = null
    where id = any(p_slot_ids);

  return v_booking_id;
end;
$$ language plpgsql security definer;
