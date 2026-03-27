-- Phase 3: Growth — Schema additions
-- custom_domain, favourites, SMS reminder tracking, no-show auto-mark, revenue views

-- 8.2b.1: Custom domain support for tenants
alter table tenants add column if not exists custom_domain text unique;

-- 9.3.1: Favourites table (client → specialist)
create table if not exists favourites (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references auth.users(id) on delete cascade not null,
  specialist_id uuid references specialists(id) on delete cascade not null,
  created_at    timestamptz default now(),
  unique(client_id, specialist_id)
);

alter table favourites enable row level security;

-- Authenticated users can manage their own favourites
create policy "Users can view own favourites"
  on favourites for select
  using (client_id = auth.uid());

create policy "Users can add favourites"
  on favourites for insert
  with check (client_id = auth.uid());

create policy "Users can remove favourites"
  on favourites for delete
  using (client_id = auth.uid());

-- 10.1.4: SMS reminder tracking columns on bookings
alter table bookings add column if not exists reminder_sent boolean default false;
alter table bookings add column if not exists reminder_1h_sent boolean default false;

-- 10.2.2: Auto no-show tracking
alter table bookings add column if not exists auto_no_show boolean default false;

-- 10.3.6: Revenue daily view for analytics
create or replace view revenue_daily as
  select
    tenant_id,
    starts_at::date as day,
    sum(price_cents) as revenue_cents,
    count(*) as booking_count
  from bookings
  where payment_status = 'paid'
  group by tenant_id, starts_at::date;

-- Revenue by specialist view
create or replace view revenue_by_specialist as
  select
    b.tenant_id,
    b.specialist_id,
    s.name as specialist_name,
    count(*) as booking_count,
    sum(b.price_cents) as revenue_cents,
    avg(b.price_cents)::int as avg_value_cents
  from bookings b
  join specialists s on s.id = b.specialist_id
  where b.payment_status = 'paid'
  group by b.tenant_id, b.specialist_id, s.name;

-- Revenue by service view
create or replace view revenue_by_service as
  select
    b.tenant_id,
    b.service_id,
    sv.name as service_name,
    sv.duration_min,
    count(*) as booking_count,
    sum(b.price_cents) as revenue_cents
  from bookings b
  join services sv on sv.id = b.service_id
  where b.payment_status = 'paid'
  group by b.tenant_id, b.service_id, sv.name, sv.duration_min;

-- 10.2.2: Function to auto-mark no-shows (bookings that ended 30+ min ago still confirmed)
create or replace function auto_mark_no_shows()
returns int as $$
declare
  affected int;
begin
  update bookings
  set status = 'no_show', auto_no_show = true
  where status = 'confirmed'
    and ends_at < now() - interval '30 minutes';
  get diagnostics affected = row_count;
  return affected;
end;
$$ language plpgsql security definer;

-- RLS policy for bookings: clients can view their own bookings across tenants
-- (This supplements existing policies — allows cross-tenant history for 9.1.4)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Clients can view own bookings' and tablename = 'bookings'
  ) then
    create policy "Clients can view own bookings"
      on bookings for select
      using (client_id = auth.uid());
  end if;
end $$;
