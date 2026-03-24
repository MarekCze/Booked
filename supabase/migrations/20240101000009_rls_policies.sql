-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper: check if current user is admin/staff for a given tenant
-- Used by multiple policies below
-- ============================================================

-- TENANTS
-- Public can read tenants by slug (for subdomain resolution)
create policy "Public can view tenants"
  on tenants for select
  using (true);

-- Tenant admins can update their own tenant
create policy "Admins can update own tenant"
  on tenants for update
  using (
    id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  )
  with check (
    id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SPECIALISTS
-- Public can view active specialists
create policy "Public can view active specialists"
  on specialists for select
  using (is_active = true);

-- Tenant admins can manage specialists
create policy "Admins can manage specialists"
  on specialists for all
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SERVICES
-- Public can view active services
create policy "Public can view active services"
  on services for select
  using (is_active = true);

-- Tenant admins can manage services
create policy "Admins can manage services"
  on services for all
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- SLOTS
-- Public can read slots (view availability)
create policy "Public can view slots"
  on slots for select
  using (true);

-- Tenant admins can manage slots
create policy "Admins can manage slots"
  on slots for all
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- Note: slot updates during booking (hold/confirm) are handled by
-- security definer RPC functions, bypassing RLS

-- ============================================================
-- BOOKINGS
-- Authenticated users can view their own bookings
create policy "Users can view own bookings"
  on bookings for select
  using (client_id = auth.uid());

-- Tenant staff can view all bookings for their tenant
create policy "Staff can view tenant bookings"
  on bookings for select
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- Tenant staff can update bookings (mark complete, no-show, etc.)
create policy "Staff can update tenant bookings"
  on bookings for update
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- Note: booking INSERT is handled by security definer RPC function

-- ============================================================
-- SCHEDULE_TEMPLATES
-- Only tenant admins can manage schedule templates
create policy "Admins can manage schedule templates"
  on schedule_templates for all
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- TENANT_MEMBERS
-- Admins can view and manage members of their tenant
create policy "Admins can manage tenant members"
  on tenant_members for all
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  )
  with check (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin')
  );

-- Staff can view members of their tenant (to see who else is on the team)
create policy "Staff can view tenant members"
  on tenant_members for select
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );
