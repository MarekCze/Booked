-- Enable Row Level Security on all tables
alter table tenants enable row level security;
alter table specialists enable row level security;
alter table services enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
alter table schedule_templates enable row level security;
alter table tenant_members enable row level security;
