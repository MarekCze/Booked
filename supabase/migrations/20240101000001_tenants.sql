-- Tenants (shops)
create table tenants (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  timezone          text not null default 'Europe/Dublin',
  currency          text not null default 'EUR',
  stripe_account_id text,
  settings          jsonb default '{}',
  created_at        timestamptz default now()
);

-- Index for fast slug lookups (subdomain resolution)
create index idx_tenants_slug on tenants (slug);
