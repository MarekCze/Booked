import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type BookingSummary = {
  id: string;
  specialist_id: string;
  service_id: string;
  specialists: { name: string } | null;
  services: { name: string } | null;
};

async function getBookingDetails(
  bookingId: string | undefined,
  tenantId: string
): Promise<BookingSummary | null> {
  const supabase = await createClient();

  // If we have a booking ID, look it up directly
  if (bookingId) {
    const { data } = await supabase
      .from("bookings")
      .select("id, specialist_id, service_id, specialists(name), services(name)")
      .eq("id", bookingId)
      .single();
    return data as BookingSummary | null;
  }

  // Otherwise, find the most recent booking at this tenant for the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("bookings")
    .select("id, specialist_id, service_id, specialists(name), services(name)")
    .eq("tenant_id", tenantId)
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as BookingSummary | null;
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking?: string; mode?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const params = await searchParams;
  const isInShop = params.mode === "in_shop";
  const booking = await getBookingDetails(params.booking, tenant.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <svg
          className="h-8 w-8 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>

      <p className="mt-3 text-gray-600">
        {isInShop
          ? "Your appointment has been booked. Payment will be collected at the shop."
          : "Your appointment has been booked and payment received. We look forward to seeing you!"}
      </p>

      <div className="mt-8 space-y-3">
        {/* Book Again — pre-fill specialist + service */}
        {booking && (
          <Link
            href={`/book?specialist=${booking.specialist_id}&service=${booking.service_id}`}
            className="block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Book Again with {booking.specialists?.name || "Same Specialist"}
          </Link>
        )}

        <Link
          href="/"
          className={`block rounded-lg px-6 py-2.5 text-sm font-medium ${
            booking
              ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
              : "bg-[var(--brand-primary,#0074c5)] text-white hover:opacity-90"
          }`}
        >
          Back to {tenant.name}
        </Link>

        {/* Cancel booking link */}
        {booking && (
          <Link
            href={`/book/cancel?booking=${booking.id}`}
            className="block text-sm text-gray-400 hover:text-red-600"
          >
            Need to cancel?
          </Link>
        )}
      </div>
    </div>
  );
}
