-- Tenant members for role-based access control
create table tenant_members (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  user_id   uuid references auth.users(id) not null,
  role      text not null default 'staff',
  constraint chk_role check (role in ('admin', 'staff')),
  unique(tenant_id, user_id)
);

create index idx_tenant_members_user on tenant_members (user_id);
