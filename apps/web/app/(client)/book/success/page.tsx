import { getTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; booking?: string; mode?: string }>;
}) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const params = await searchParams;
  const isInShop = params.mode === "in_shop";

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
        <Link
          href="/"
          className="block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to {tenant.name}
        </Link>
      </div>
    </div>
  );
}
