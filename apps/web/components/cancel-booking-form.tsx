"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface CancelBookingFormProps {
  bookingId: string;
  tenantSlug: string;
}

interface BookingDetails {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  price_cents: number;
  client_name: string | null;
  specialists: { name: string } | null;
  services: { name: string; duration_min: number } | null;
  tenants: { name: string; currency: string; timezone: string } | null;
}

export function CancelBookingForm({ bookingId, tenantSlug }: CancelBookingFormProps) {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(
          "id, starts_at, ends_at, status, payment_status, price_cents, client_name, specialists(name), services(name, duration_min), tenants(name, currency, timezone)"
        )
        .eq("id", bookingId)
        .single();

      if (fetchError || !data) {
        setError("Booking not found.");
      } else {
        setBooking(data as unknown as BookingDetails);
      }
      setLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);

    const supabase = createClient();

    const { error: cancelError } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });

    if (cancelError) {
      setError("Failed to cancel booking. It may have already been cancelled.");
      setCancelling(false);
      return;
    }

    // If paid, attempt refund (fire and forget — webhook will update status)
    if (booking?.payment_status === "paid") {
      supabase.functions
        .invoke("refund-booking", {
          body: { booking_id: bookingId },
        })
        .catch(() => {
          // Refund failure is non-blocking — admin can handle manually
        });
    }

    setCancelled(true);
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Booking Not Found</h1>
        <p className="mt-3 text-gray-600">{error}</p>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Cancelled</h1>
        <p className="mt-3 text-gray-600">
          Your booking has been cancelled.
          {booking?.payment_status === "paid" &&
            " A refund has been initiated and should appear in your account within 5-10 business days."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to {booking?.tenants?.name || tenantSlug}
        </Link>
      </div>
    );
  }

  if (booking?.status !== "confirmed") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Cannot Cancel</h1>
        <p className="mt-3 text-gray-600">
          This booking has already been {booking?.status}. It cannot be cancelled.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--brand-primary,#0074c5)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to {booking?.tenants?.name || tenantSlug}
        </Link>
      </div>
    );
  }

  const formatDateTime = (iso: string) => {
    const tz = booking?.tenants?.timezone || "Europe/Dublin";
    return new Date(iso).toLocaleString("en-IE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  };

  const formatPrice = (cents: number) => {
    const currency = booking?.tenants?.currency || "EUR";
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(
      cents / 100
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Cancel Booking</h1>
      <p className="mt-2 text-gray-600">Are you sure you want to cancel this booking?</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Specialist</span>
          <span className="font-medium text-gray-900">{booking.specialists?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Service</span>
          <span className="font-medium text-gray-900">{booking.services?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Date & Time</span>
          <span className="font-medium text-gray-900">{formatDateTime(booking.starts_at)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Duration</span>
          <span className="font-medium text-gray-900">{booking.services?.duration_min} min</span>
        </div>
        <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
          <span className="text-gray-500">Amount</span>
          <span className="font-medium text-gray-900">{formatPrice(booking.price_cents)}</span>
        </div>
        {booking.payment_status === "paid" && (
          <p className="text-xs text-gray-500 pt-1">
            A full refund will be issued upon cancellation.
          </p>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Keep Booking
        </Link>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
        </button>
      </div>
    </div>
  );
}
