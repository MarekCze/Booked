import { requireTenant } from "@/lib/tenant";
import { TodayBookings } from "@/components/admin/today-bookings";
import { OnboardingChecklistWrapper } from "@/components/admin/onboarding-checklist-wrapper";
import { Providers } from "@/components/providers";
import { getSpecialists, getTenantSettings, getAllServices } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

async function getTodayBookings(tenantId: string) {
  const supabase = await createClient();
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString())
    .order("starts_at");

  if (error) return [];
  return data;
}

async function getBookingStats(tenantId: string) {
  const supabase = await createClient();
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("price_cents, status")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString());

  const total = todayBookings?.length || 0;
  const confirmed = todayBookings?.filter((b) => b.status === "confirmed").length || 0;
  const revenue = todayBookings
    ?.filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.price_cents, 0) || 0;

  return { total, confirmed, revenue };
}

async function getOnboardingStatus(tenantId: string) {
  const supabase = await createClient();
  const [specialists, services, schedules, tenantData] = await Promise.all([
    supabase.from("specialists").select("id").eq("tenant_id", tenantId).limit(1),
    supabase.from("services").select("id").eq("tenant_id", tenantId).limit(1),
    supabase.from("schedule_templates").select("id").eq("tenant_id", tenantId).limit(1),
    supabase.from("tenants").select("stripe_account_id, settings, slug").eq("id", tenantId).single(),
  ]);

  return {
    hasSpecialists: (specialists.data?.length ?? 0) > 0,
    hasServices: (services.data?.length ?? 0) > 0,
    hasSchedule: (schedules.data?.length ?? 0) > 0,
    stripeConnected: !!tenantData.data?.stripe_account_id,
    onboardingComplete: tenantData.data?.settings?.onboarding_complete === true,
    slug: tenantData.data?.slug ?? "",
  };
}

export default async function DashboardPage() {
  const tenant = await requireTenant();
  const [bookings, specialists, stats, onboarding] = await Promise.all([
    getTodayBookings(tenant.id),
    getSpecialists(tenant.id),
    getBookingStats(tenant.id),
    getOnboardingStatus(tenant.id),
  ]);

  // Build specialist name map
  const specialistMap = Object.fromEntries(
    specialists.map((s) => [s.id, s.name])
  );

  return (
    <Providers tenant={tenant}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString("en-IE", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Onboarding checklist (shown for newly created shops) */}
        {!onboarding.onboardingComplete && (
          <div className="mt-6">
            <OnboardingChecklistWrapper
              hasSpecialists={onboarding.hasSpecialists}
              hasServices={onboarding.hasServices}
              hasSchedule={onboarding.hasSchedule}
              stripeConnected={onboarding.stripeConnected}
              tenantSlug={onboarding.slug}
            />
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Today&apos;s Bookings</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.confirmed}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Expected Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency: tenant.currency,
              }).format(stats.revenue / 100)}
            </p>
          </div>
        </div>

        {/* Today's bookings */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Today&apos;s Schedule
          </h2>
          <TodayBookings
            initialBookings={bookings}
            specialistMap={specialistMap}
            tenantId={tenant.id}
          />
        </div>
      </div>
    </Providers>
  );
}
