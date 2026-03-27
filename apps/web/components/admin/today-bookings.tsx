"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import type { Booking } from "@clipbook/shared";
import { toast } from "sonner";

interface TodayBookingsProps {
  initialBookings: Booking[];
  specialistMap: Record<string, string>;
  tenantId: string;
}

export function TodayBookings({
  initialBookings,
  specialistMap,
  tenantId,
}: TodayBookingsProps) {
  const tenant = useTenant();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  // Realtime subscription for booking updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async () => {
          // Refetch today's bookings
          const today = new Date();
          const startOfDay = new Date(today);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);

          const { data } = await supabase
            .from("bookings")
            .select("*")
            .eq("tenant_id", tenantId)
            .gte("starts_at", startOfDay.toISOString())
            .lte("starts_at", endOfDay.toISOString())
            .order("starts_at");

          if (data) setBookings(data as Booking[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: "completed" | "no_show" | "cancelled"
  ) => {
    const supabase = createClient();

    if (newStatus === "cancelled") {
      const { error } = await supabase.rpc("cancel_booking", {
        p_booking_id: bookingId,
      });
      if (error) {
        toast.error("Failed to cancel booking.");
        return;
      }
    } else {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      if (error) {
        toast.error(`Failed to mark as ${newStatus}.`);
        return;
      }
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    toast.success(
      newStatus === "completed"
        ? "Marked as complete."
        : newStatus === "no_show"
          ? "Marked as no-show."
          : "Booking cancelled."
    );
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tenant.timezone,
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: tenant.currency,
    }).format(cents / 100);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: "bg-blue-50 text-blue-700",
      completed: "bg-emerald-50 text-emerald-700",
      cancelled: "bg-gray-100 text-gray-500",
      no_show: "bg-red-50 text-red-700",
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          styles[status] || "bg-gray-100 text-gray-600"
        }`}
      >
        {status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const paymentBadge = (paymentStatus: string) => {
    const styles: Record<string, string> = {
      paid: "text-emerald-600",
      unpaid: "text-amber-600",
      refunded: "text-gray-500",
    };
    return (
      <span className={`text-xs font-medium ${styles[paymentStatus] || "text-gray-500"}`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </span>
    );
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No bookings for today.</p>
      </div>
    );
  }

  // Group by specialist
  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const name = specialistMap[b.specialist_id] || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([specialistName, specialistBookings]) => (
        <div key={specialistName}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {specialistName}
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="divide-y divide-gray-100">
              {specialistBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-900 w-16">
                      {formatTime(booking.starts_at)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {booking.client_name || "Guest"}
                      </p>
                      {booking.client_phone && (
                        <p className="text-xs text-gray-500">
                          {booking.client_phone}
                        </p>
                      )}
                    </div>
                    <NoShowWarning clientId={booking.client_id} />
                    <div className="hidden sm:block text-sm text-gray-500">
                      {formatPrice(booking.price_cents)}
                    </div>
                    {statusBadge(booking.status)}
                    {paymentBadge(booking.payment_status)}
                  </div>

                  {booking.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "completed")
                        }
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "no_show")
                        }
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        No Show
                      </button>
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "cancelled")
                        }
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoShowWarning({ clientId }: { clientId: string | null }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const supabase = createClient();
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "no_show")
      .then(({ count: noShowCount }) => {
        if (noShowCount && noShowCount >= 3) {
          setCount(noShowCount);
        }
      });
  }, [clientId]);

  if (!count) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      {count} no-shows
    </span>
  );
}
