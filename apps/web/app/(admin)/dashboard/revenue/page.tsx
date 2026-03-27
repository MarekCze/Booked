import { requireTenant } from "@/lib/tenant";
import { Providers } from "@/components/providers";
import { Revenuedashboard } from "@/components/admin/revenue-dashboard";
import { createClient } from "@/lib/supabase/server";

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  avgBookingValue: number;
  cancellationRate: number;
  noShowRate: number;
  bySpecialist: {
    specialist_name: string;
    booking_count: number;
    revenue_cents: number;
    avg_value_cents: number;
  }[];
  byService: {
    service_name: string;
    duration_min: number;
    booking_count: number;
    revenue_cents: number;
  }[];
  daily: {
    day: string;
    revenue_cents: number;
    booking_count: number;
  }[];
}

async function getRevenueData(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<RevenueData> {
  const supabase = await createClient();

  // Get bookings in date range
  const { data: bookings } = await supabase
    .from("bookings")
    .select("price_cents, status, payment_status, starts_at, specialist_id, service_id")
    .eq("tenant_id", tenantId)
    .gte("starts_at", startDate)
    .lte("starts_at", endDate);

  const allBookings = bookings || [];
  const paidBookings = allBookings.filter((b) => b.payment_status === "paid");
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.price_cents, 0);
  const totalBookings = allBookings.length;
  const avgBookingValue = totalBookings > 0 ? totalRevenue / paidBookings.length : 0;
  const cancelledCount = allBookings.filter((b) => b.status === "cancelled").length;
  const noShowCount = allBookings.filter((b) => b.status === "no_show").length;
  const cancellationRate = totalBookings > 0 ? cancelledCount / totalBookings : 0;
  const noShowRate = totalBookings > 0 ? noShowCount / totalBookings : 0;

  // Revenue by specialist
  const { data: bySpecialist } = await supabase
    .from("revenue_by_specialist")
    .select("*")
    .eq("tenant_id", tenantId);

  // Revenue by service
  const { data: byService } = await supabase
    .from("revenue_by_service")
    .select("*")
    .eq("tenant_id", tenantId);

  // Daily revenue
  const { data: dailyRaw } = await supabase
    .from("revenue_daily")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("day", startDate.split("T")[0])
    .lte("day", endDate.split("T")[0])
    .order("day");

  return {
    totalRevenue,
    totalBookings,
    avgBookingValue: Math.round(avgBookingValue),
    cancellationRate,
    noShowRate,
    bySpecialist: (bySpecialist || []) as RevenueData["bySpecialist"],
    byService: (byService || []) as RevenueData["byService"],
    daily: (dailyRaw || []) as RevenueData["daily"],
  };
}

export default async function RevenuePage() {
  const tenant = await requireTenant();

  // Default: this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const data = await getRevenueData(
    tenant.id,
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  );

  return (
    <Providers tenant={tenant}>
      <Revenuedashboard data={data} currency={tenant.currency} tenantId={tenant.id} />
    </Providers>
  );
}
