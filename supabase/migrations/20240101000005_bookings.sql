-- Bookings (one booking claims N contiguous slots)
create table bookings (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid references tenants(id) not null,
  specialist_id            uuid references specialists(id) not null,
  service_id               uuid references services(id) not null,
  starts_at                timestamptz not null,
  ends_at                  timestamptz not null,
  slot_count               int not null,
  client_id                uuid references auth.users(id),
  client_name              text,
  client_phone             text,
  status                   text not null default 'confirmed',
  payment_status           text default 'unpaid',
  stripe_payment_intent_id text,
  price_cents              int not null,
  notes                    text,
  created_at               timestamptz default now()
);

-- Foreign key from slots back to bookings (deferred to allow atomic insert)
alter table slots
  add constraint fk_slots_booking
  foreign key (booking_id) references bookings(id) on delete set null;

-- Indexes for common queries
create index idx_bookings_tenant_date on bookings (tenant_id, starts_at);
create index idx_bookings_specialist_date on bookings (specialist_id, starts_at);
create index idx_bookings_client on bookings (client_id) where client_id is not null;
