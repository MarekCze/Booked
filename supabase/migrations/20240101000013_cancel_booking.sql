-- Cancel a booking and release its slots back to available
create or replace function cancel_booking(
  p_booking_id uuid
) returns void as $$
begin
  -- Set booking status to cancelled
  update bookings
    set status = 'cancelled'
    where id = p_booking_id
      and status != 'cancelled';

  if not found then
    raise exception 'Booking not found or already cancelled: %', p_booking_id;
  end if;

  -- Release all associated slots
  update slots
    set status = 'available',
        booking_id = null,
        held_until = null
    where booking_id = p_booking_id;
end;
$$ language plpgsql security definer;
