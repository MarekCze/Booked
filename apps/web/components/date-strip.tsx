"use client";

import { useRef, useEffect } from "react";
import { formatDateLabel } from "@/lib/format";

export function DateStrip({
  selectedDate,
  onDateSelect,
  timezone,
}: {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  timezone: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Generate 14 days starting from today
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  // Scroll active pill into view on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedDate]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
    >
      {dates.map((dateStr) => {
        const { day, date } = formatDateLabel(dateStr, timezone);
        const isActive = dateStr === selectedDate;
        const isToday = dateStr === dates[0];

        return (
          <button
            key={dateStr}
            ref={isActive ? activeRef : undefined}
            onClick={() => onDateSelect(dateStr)}
            className={`flex flex-col items-center rounded-lg px-3 py-2 snap-center transition-colors min-w-[3.5rem] ${
              isActive
                ? "bg-[var(--brand-primary,#0074c5)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="text-xs font-medium">
              {isToday ? "Today" : day}
            </span>
            <span className="text-lg font-bold">{date}</span>
          </button>
        );
      })}
    </div>
  );
}
