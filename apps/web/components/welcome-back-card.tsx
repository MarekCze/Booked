"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant-context";

interface LastBookingInfo {
  specialist_id: string;
  specialist_name: string;
  service_id: string;
  service_name: string;
}

export function WelcomeBackCard() {
  const tenant = useTenant();
  const [lastBooking, setLastBooking] = useState<LastBookingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastBooking = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("bookings")
        .select(`
          specialist_id,
          service_id,
          specialists:specialist_id(name),
          services:service_id(name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("client_id", user.id)
        .in("status", ["completed", "confirmed"])
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLastBooking({
          specialist_id: data.specialist_id,
          specialist_name: (data.specialists as unknown as { name: string })?.name || "your specialist",
          service_id: data.service_id,
          service_name: (data.services as unknown as { name: string })?.name || "your service",
        });
      }

      setLoading(false);
    };

    fetchLastBooking();
  }, [tenant.id]);

  if (loading || !lastBooking) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Welcome back!</p>
        <p className="mt-1 font-medium text-gray-900">
          Book again with {lastBooking.specialist_name}?
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            href={`/book?specialist=${lastBooking.specialist_id}&service=${lastBooking.service_id}`}
            className="rounded-lg bg-[var(--brand-primary,#0074c5)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Book {lastBooking.service_name}
          </Link>
          <Link
            href="/book"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Browse all
          </Link>
        </div>
      </div>
    </div>
  );
}
