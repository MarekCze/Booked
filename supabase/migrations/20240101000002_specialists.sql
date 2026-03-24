-- Specialists (barbers / stylists / beauticians)
create table specialists (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid references tenants(id) not null,
  name                    text not null,
  bio                     text,
  photo_url               text,
  display_order           int default 0,
  is_active               boolean default true,
  slots_generated_through date,
  created_at              timestamptz default now()
);

create index idx_specialists_tenant on specialists (tenant_id, display_order)
  where is_active = true;
