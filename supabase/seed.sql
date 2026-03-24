-- ============================================================
-- ClipBook Seed Data — Demo Barbershop
-- ============================================================

-- Demo tenant
insert into tenants (id, slug, name, timezone, currency, settings) values (
  '00000000-0000-0000-0000-000000000001',
  'demo-barbers',
  'Demo Barbers',
  'Europe/Dublin',
  'EUR',
  '{"slot_granularity_min": 15, "branding": {"primary_color": "#0074c5"}}'::jsonb
);

-- Specialists
insert into specialists (id, tenant_id, name, bio, photo_url, display_order, is_active) values
(
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Mike O''Brien',
  'Senior barber with 12 years experience. Specialises in skin fades and classic cuts.',
  null,
  1,
  true
),
(
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Sarah Kelly',
  'Creative stylist. Expert in colour, balayage, and modern cuts for all hair types.',
  null,
  2,
  true
),
(
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'James Walsh',
  'Apprentice barber. Great with buzz cuts, trims, and beard shaping.',
  null,
  3,
  true
);

-- Services (mix of durations and prices)
insert into services (id, tenant_id, specialist_id, name, duration_min, price_cents, is_active) values
-- Global services (available from all specialists)
(
  '00000000-0000-0000-0002-000000000001',
  '00000000-0000-0000-0000-000000000001',
  null,
  'Quick Trim',
  15,
  1000,
  true
),
(
  '00000000-0000-0000-0002-000000000002',
  '00000000-0000-0000-0000-000000000001',
  null,
  'Standard Cut',
  30,
  1500,
  true
),
(
  '00000000-0000-0000-0002-000000000003',
  '00000000-0000-0000-0000-000000000001',
  null,
  'Skin Fade',
  30,
  2000,
  true
),
(
  '00000000-0000-0000-0002-000000000004',
  '00000000-0000-0000-0000-000000000001',
  null,
  'Cut & Beard Trim',
  45,
  2500,
  true
),
-- Specialist-specific services
(
  '00000000-0000-0000-0002-000000000005',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0001-000000000002',
  'Full Colour & Cut',
  90,
  6500,
  true
),
(
  '00000000-0000-0000-0002-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0001-000000000002',
  'Balayage',
  120,
  8500,
  true
);

-- Schedule templates (Mon-Sat, 09:00-17:30, lunch break 13:00-13:30)
-- All three specialists have the same schedule
insert into schedule_templates (tenant_id, specialist_id, day_of_week, start_time, end_time, break_start, break_end)
select
  '00000000-0000-0000-0000-000000000001',
  specialist_id,
  day_of_week,
  '09:00'::time,
  '17:30'::time,
  '13:00'::time,
  '13:30'::time
from
  unnest(array[
    '00000000-0000-0000-0001-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000002'::uuid,
    '00000000-0000-0000-0001-000000000003'::uuid
  ]) as specialist_id,
  generate_series(0, 5) as day_of_week;  -- 0=Mon to 5=Sat

-- Note: tenant_members requires an actual auth.users entry,
-- so we skip seeding it here. It should be created after
-- the admin user signs up via Supabase Auth.
