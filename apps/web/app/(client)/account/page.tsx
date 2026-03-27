import { createClient } from "@/lib/supabase/server";
import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { BookingHistory } from "@/components/booking-history";
import { AccountHeader } from "@/components/account-header";

async function getClientBookings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      specialists:specialist_id(name),
      services:service_id(name, duration_min),
      tenants:tenant_id(name, slug, currency)
    `)
    .eq("client_id", userId)
    .order("starts_at", { ascending: false });

  if (error) return [];
  return data;
}

export default async function AccountPage() {
  const tenant = await getTenant();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to home or show login prompt
    if (tenant) {
      redirect("/book");
    }
    redirect("/");
  }

  const bookings = await getClientBookings(user.id);
  const now = new Date().toISOString();

  const upcoming = bookings.filter(
    (b) => b.starts_at > now && b.status === "confirmed"
  );
  const past = bookings.filter(
    (b) => b.starts_at <= now || b.status !== "confirmed"
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AccountHeader user={user} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No upcoming bookings.</p>
        ) : (
          <BookingHistory bookings={upcoming} showActions />
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Past Bookings</h2>
        {past.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No past bookings yet.</p>
        ) : (
          <BookingHistory bookings={past} showBookAgain />
        )}
      </div>
    </div>
  );
}
