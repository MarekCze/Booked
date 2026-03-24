"use client";

import { useState, useMemo } from "react";

interface MonthCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({ selectedDate, onDateSelect }: MonthCalendarProps) {
  const today = useMemo(() => toDateStr(new Date()), []);

  const [viewYear, setViewYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + "T12:00:00") : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + "T12:00:00") : new Date();
    return d.getMonth();
  });

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // Build the 6x7 grid of dates
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
      days.push({ date: toDateStr(d), day: prevMonthDays - i, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      days.push({ date: toDateStr(dt), day: d, isCurrentMonth: true });
    }

    // Next month padding to fill to 42 (6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dt = new Date(viewYear, viewMonth + 1, d);
      days.push({ date: toDateStr(dt), day: d, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Don't allow navigating to months before current
  const todayDate = new Date();
  const canGoPrev = viewYear > todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth > todayDate.getMonth());

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 text-center text-sm">
        {calendarDays.map(({ date, day, isCurrentMonth }, i) => {
          const isPast = date < today;
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const isDisabled = isPast || !isCurrentMonth;

          return (
            <button
              key={i}
              onClick={() => !isDisabled && onDateSelect(date)}
              disabled={isDisabled}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors
                ${isSelected
                  ? "bg-gray-900 font-semibold text-white"
                  : isToday
                    ? "font-semibold text-[var(--brand-primary,#0074c5)]"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
