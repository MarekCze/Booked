import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { CancelBookingForm } from "@/components/cancel-booking-form";

export default async function CancelBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const params = await searchParams;
  const bookingId = params.booking;

  if (!bookingId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invalid Link</h1>
        <p className="mt-3 text-gray-600">
          No booking ID was provided. Please use the cancellation link from your
          booking confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <CancelBookingForm bookingId={bookingId} tenantSlug={tenant.slug} />
    </div>
  );
}
