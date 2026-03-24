"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/format";
import { MonthCalendar } from "./month-calendar";
import { Skeleton } from "./ui/skeleton";

export function AppointmentPicker({
  specialistId,
  slotsNeeded,
  timezone,
  onConfirm,
}: {
  specialistId: string;
  slotsNeeded: number;
  timezone: string;
  onConfirm: (startsAt: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchTimes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_available_start_times", {
      p_specialist_id: specialistId,
      p_date: selectedDate,
      p_slots_needed: slotsNeeded,
    });

    if (!error && data) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      if (selectedDate === today) {
        setTimes(data.filter((t: string) => new Date(t) > now));
      } else {
        setTimes(data);
      }
    } else {
      setTimes([]);
    }
    setLoading(false);
  }, [specialistId, selectedDate, slotsNeeded]);

  useEffect(() => {
    setSelectedTime(null);
    fetchTimes();
  }, [fetchTimes]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`slots:${specialistId}:${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slots",
          filter: `specialist_id=eq.${specialistId}`,
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(fetchTimes, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [specialistId, selectedDate, fetchTimes]);

  // Format selected date for summary
  const summaryDate = selectedTime
    ? new Date(selectedTime).toLocaleDateString("en-IE", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Calendar + Time Slots */}
      <div className="flex flex-col sm:flex-row">
        {/* Left: Monthly Calendar (2/3 width) */}
        <div className="border-b border-gray-200 p-4 sm:border-b-0 sm:border-r sm:w-2/3">
          <MonthCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* Right: Time Slots */}
        <div className="flex-1 p-4">
          <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : times.length === 0 ? (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <p className="text-sm text-gray-400">
                  No availability on this date
                </p>
              </div>
            ) : (
              times.map((time) => {
                const isSelected = time === selectedTime;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors
                      ${isSelected
                        ? "border-[var(--brand-primary,#0074c5)] bg-[var(--brand-primary,#0074c5)]/5 text-[var(--brand-primary,#0074c5)]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    {formatTime(time, timezone)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Selection Summary */}
      {selectedTime && summaryDate && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Your appointment is on{" "}
              <span className="font-semibold text-gray-900">{summaryDate}</span>{" "}
              at{" "}
              <span className="font-semibold text-gray-900">
                {formatTime(selectedTime, timezone)}
              </span>
            </span>
          </div>
          <button
            onClick={() => onConfirm(selectedTime)}
            className="rounded-lg border border-gray-300 px-5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
