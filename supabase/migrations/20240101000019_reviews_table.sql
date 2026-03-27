-- Reviews table (referenced by queries.ts but never created)
create table if not exists reviews (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) not null,
  specialist_id uuid references specialists(id) on delete set null,
  author_name   text not null,
  rating        int not null check (rating >= 1 and rating <= 5),
  text          text,
  is_approved   boolean default false,
  created_at    timestamptz default now()
);

alter table reviews enable row level security;

-- Public can read approved reviews
create policy "Public can view approved reviews"
  on reviews for select
  using (is_approved = true);

-- Tenant admins can manage all reviews
create policy "Tenant admins can manage reviews"
  on reviews for all
  using (
    tenant_id in (
      select tm.tenant_id from tenant_members tm where tm.user_id = auth.uid()
    )
  )
  with check (
    tenant_id in (
      select tm.tenant_id from tenant_members tm where tm.user_id = auth.uid()
    )
  );

-- Index for fast lookups
create index if not exists idx_reviews_tenant on reviews (tenant_id, is_approved, created_at desc);
