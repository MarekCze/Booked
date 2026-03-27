"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPrice, formatTime, formatDuration } from "@/lib/format";

interface BookingWithRelations {
  id: string;
  tenant_id: string;
  specialist_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  price_cents: number;
  client_name: string | null;
  specialists: { name: string } | null;
  services: { name: string; duration_min: number } | null;
  tenants: { name: string; slug: string; currency: string } | null;
}

interface BookingHistoryProps {
  bookings: BookingWithRelations[];
  showActions?: boolean;
  showBookAgain?: boolean;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
  no_show: "bg-red-100 text-red-700",
};

export function BookingHistory({
  bookings,
  showActions,
  showBookAgain,
}: BookingHistoryProps) {
  const router = useRouter();

  // Group bookings by tenant
  const byTenant = new Map<string, { tenantName: string; bookings: BookingWithRelations[] }>();
  for (const booking of bookings) {
    const tenantName = booking.tenants?.name || "Unknown Shop";
    const existing = byTenant.get(booking.tenant_id);
    if (existing) {
      existing.bookings.push(booking);
    } else {
      byTenant.set(booking.tenant_id, { tenantName, bookings: [booking] });
    }
  }

  const groups = Array.from(byTenant.values());
  const showTenantHeaders = groups.length > 1;

  return (
    <div className="mt-4 space-y-6">
      {groups.map((group) => (
        <div key={group.tenantName}>
          {showTenantHeaders && (
            <h3 className="mb-3 text-sm font-medium text-gray-500">
              {group.tenantName}
            </h3>
          )}
          <div className="space-y-3">
            {group.bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                showActions={showActions}
                showBookAgain={showBookAgain}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingRow({
  booking,
  showActions,
  showBookAgain,
}: {
  booking: BookingWithRelations;
  showActions?: boolean;
  showBookAgain?: boolean;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const date = new Date(booking.starts_at);
  const dateStr = date.toLocaleDateString("en-IE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-IE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const currency = booking.tenants?.currency || "EUR";

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);

    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: booking.id,
    });

    if (error) {
      toast.error("Failed to cancel booking.");
      setCancelling(false);
      return;
    }

    toast.success("Booking cancelled.");
    router.refresh();
  };

  const handleBookAgain = () => {
    const slug = booking.tenants?.slug;
    if (!slug) return;

    // Build rebooking URL on the tenant's subdomain
    const host = window.location.host;
    const parts = host.split(".");
    const baseDomain = parts.length > 1 ? parts.slice(1).join(".") : host;
    const protocol = window.location.protocol;
    const url = `${protocol}//${slug}.${baseDomain}/book?specialist=${booking.specialist_id}&service=${booking.service_id}`;
    window.location.href = url;
  };

  const handleReschedule = () => {
    // Cancel then book again with same specialist + service
    const slug = booking.tenants?.slug;
    if (!slug) return;

    const host = window.location.host;
    const parts = host.split(".");
    const baseDomain = parts.length > 1 ? parts.slice(1).join(".") : host;
    const protocol = window.location.protocol;
    const url = `${protocol}//${slug}.${baseDomain}/book?specialist=${booking.specialist_id}&service=${booking.service_id}`;
    window.location.href = url;
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">
            {booking.services?.name || "Service"}
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[booking.status] || "bg-gray-100 text-gray-500"}`}>
            {booking.status.replace("_", " ")}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          with {booking.specialists?.name || "Specialist"} &middot; {dateStr} at {timeStr}
        </p>
        <p className="mt-0.5 text-sm font-medium text-gray-700">
          {formatPrice(booking.price_cents, currency)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {showActions && booking.status === "confirmed" && (
          <>
            <button
              onClick={handleReschedule}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Reschedule
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
          </>
        )}
        {showBookAgain && (booking.status === "completed" || booking.status === "cancelled") && (
          <button
            onClick={handleBookAgain}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            Book Again
          </button>
        )}
      </div>
    </div>
  );
}
