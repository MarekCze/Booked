"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/format";
import { TimeGridSkeleton } from "@/components/ui/skeleton";

export function TimeSlotGrid({
  specialistId,
  date,
  slotsNeeded,
  timezone,
  onTimeSelect,
}: {
  specialistId: string;
  date: string;
  slotsNeeded: number;
  timezone: string;
  onTimeSelect: (startsAt: string) => void;
}) {
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchTimes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_available_start_times", {
      p_specialist_id: specialistId,
      p_date: date,
      p_slots_needed: slotsNeeded,
    });

    if (!error && data) {
      // Filter out past times if viewing today
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      if (date === today) {
        setTimes(data.filter((t: string) => new Date(t) > now));
      } else {
        setTimes(data);
      }
    } else {
      setTimes([]);
    }
    setLoading(false);
  }, [specialistId, date, slotsNeeded]);

  // Fetch on mount and when date/specialist/service changes
  useEffect(() => {
    fetchTimes();
  }, [fetchTimes]);

  // Realtime subscription for live availability updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`slots:${specialistId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slots",
          filter: `specialist_id=eq.${specialistId}`,
        },
        () => {
          // Debounce refetch to avoid rapid re-queries
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(fetchTimes, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [specialistId, date, fetchTimes]);

  if (loading) return <TimeGridSkeleton />;

  if (times.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">
          No times available on this date.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Try selecting a different day.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {times.map((time) => (
        <button
          key={time}
          onClick={() => onTimeSelect(time)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:border-[var(--brand-primary,#0074c5)] hover:bg-blue-50"
        >
          {formatTime(time, timezone)}
        </button>
      ))}
    </div>
  );
}
