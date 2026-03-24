-- Availability slots (discrete 15-min chunks)
-- One row = one atomic time chunk. A 90-min service claims 6 contiguous slots.
create table slots (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'available',
  booking_id    uuid,
  held_until    timestamptz,
  created_at    timestamptz default now(),
  unique(specialist_id, starts_at)
);

-- Partial index for fast availability queries
create index idx_slots_availability
  on slots (specialist_id, starts_at)
  where status = 'available';

-- Index for held slot expiry cleanup
create index idx_slots_held_expiry
  on slots (held_until)
  where status = 'held' and held_until is not null;
