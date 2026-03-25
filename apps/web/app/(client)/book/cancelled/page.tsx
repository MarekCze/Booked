import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BookingCancelledPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg
          className="h-8 w-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Booking Cancelled</h1>

      <p className="mt-3 text-gray-600">
        Your booking was not completed. No payment has been taken.
        Your reserved time slot has been released.
      </p>

      <div className="mt-8 space-y-3">
        <Link
          href="/"
          className="block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to {tenant.name}
        </Link>
        <Link
          href="/"
          className="block text-sm text-gray-500 hover:text-gray-700"
        >
          Try booking again
        </Link>
      </div>
    </div>
  );
}
