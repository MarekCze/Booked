-- Services offered by each specialist
create table services (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id),
  name          text not null,
  duration_min  int not null,
  price_cents   int not null,
  is_active     boolean default true
);

create index idx_services_tenant on services (tenant_id)
  where is_active = true;

create index idx_services_specialist on services (specialist_id)
  where is_active = true;
