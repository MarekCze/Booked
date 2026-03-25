"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { formatTime, formatPrice, formatDuration } from "@/lib/format";
import type { Specialist, Service } from "@clipbook/shared";
import { toast } from "sonner";

interface BookingConfirmationProps {
  specialist: Specialist;
  service: Service;
  startsAt: string;
  slotsNeeded: number;
  onExpired: () => void;
  onBack: () => void;
}

export function BookingConfirmation({
  specialist,
  service,
  startsAt,
  slotsNeeded,
  onExpired,
  onBack,
}: BookingConfirmationProps) {
  const tenant = useTenant();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+353 ");
  const [notes, setNotes] = useState("");
  const [holdState, setHoldState] = useState<
    "idle" | "holding" | "held" | "expired" | "error"
  >("idle");
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const expiryRef = useRef<Date>();

  // Hold slots on mount
  const holdSlots = useCallback(async () => {
    setHoldState("holding");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("hold_slots", {
      p_specialist_id: specialist.id,
      p_starts_at: startsAt,
      p_slot_count: slotsNeeded,
    });

    if (error) {
      setHoldState("error");
      toast.error("This time slot is no longer available. Please select another time.");
      onExpired();
      return;
    }

    setSlotIds(data as string[]);
    setHoldState("held");
    expiryRef.current = new Date(Date.now() + 5 * 60 * 1000);
    setSecondsLeft(300);
  }, [specialist.id, startsAt, slotsNeeded, onExpired]);

  useEffect(() => {
    holdSlots();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [holdSlots]);

  // Countdown timer
  useEffect(() => {
    if (holdState !== "held") return;

    timerRef.current = setInterval(() => {
      const now = new Date();
      const expiry = expiryRef.current;
      if (!expiry) return;
      const diff = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        clearInterval(timerRef.current);
        setHoldState("expired");
        toast.error("Your reservation has expired. Please select a new time.");
        onExpired();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [holdState, onExpired]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleConfirm = async () => {
    if (!clientName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 6) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (holdState !== "held" || slotIds.length === 0) {
      toast.error("Reservation expired. Please go back and select a new time.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Get current user (may be anonymous or authenticated)
      const { data: { user } } = await supabase.auth.getUser();

      // Try to create checkout session via edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            slot_ids: slotIds,
            specialist_id: specialist.id,
            service_id: service.id,
            tenant_id: tenant.id,
            client_id: user?.id || null,
            client_name: clientName.trim(),
            client_phone: clientPhone.trim(),
            price_cents: service.price_cents,
            notes: notes.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // If Stripe is not configured, fall back to direct booking (pay in shop)
        if (result.code === "STRIPE_NOT_CONFIGURED") {
          const { data: bookingId, error: bookingError } = await supabase.rpc(
            "confirm_booking",
            {
              p_slot_ids: slotIds,
              p_specialist_id: specialist.id,
              p_service_id: service.id,
              p_tenant_id: tenant.id,
              p_client_id: user?.id || null,
              p_client_name: clientName.trim(),
              p_client_phone: clientPhone.trim(),
              p_price_cents: service.price_cents,
            }
          );

          if (bookingError) {
            toast.error("Failed to confirm booking. Please try again.");
            setSubmitting(false);
            return;
          }

          // Redirect to success page
          window.location.href = `/book/success?booking=${bookingId}&mode=in_shop`;
          return;
        }

        toast.error(result.error || "Failed to create payment session.");
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const summaryDate = new Date(startsAt).toLocaleDateString("en-IE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Countdown banner */}
      {holdState === "held" && secondsLeft > 0 && (
        <div
          className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
            secondsLeft <= 60
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Slot reserved for {formatCountdown(secondsLeft)}
        </div>
      )}

      {holdState === "holding" && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Reserving your time slot...
        </div>
      )}

      {/* Booking Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Booking Summary
        </h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Specialist</dt>
            <dd className="font-medium text-gray-900">{specialist.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Service</dt>
            <dd className="font-medium text-gray-900">{service.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Duration</dt>
            <dd className="font-medium text-gray-900">
              {formatDuration(service.duration_min)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Date & Time</dt>
            <dd className="font-medium text-gray-900">
              {summaryDate} at {formatTime(startsAt, tenant.timezone)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-3">
            <dt className="font-medium text-gray-900">Total</dt>
            <dd className="text-lg font-bold text-gray-900">
              {formatPrice(service.price_cents, tenant.currency)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Client Details Form */}
      {holdState === "held" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Your Details
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Your full name"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--brand-primary,#0074c5)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0074c5)]"
              />
            </div>
            <div>
              <label
                htmlFor="clientPhone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+353 87 123 4567"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--brand-primary,#0074c5)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0074c5)]"
              />
            </div>
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700"
              >
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--brand-primary,#0074c5)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0074c5)]"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-[var(--brand-primary,#0074c5)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm & Pay"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
