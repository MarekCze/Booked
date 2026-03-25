"use client";

import { useState } from "react";
import type { ScheduleTemplate } from "@clipbook/shared";

interface ScheduleDayEditorProps {
  dayName: string;
  dayOfWeek: number;
  template: ScheduleTemplate | null;
  onSave: (
    dayOfWeek: number,
    data: {
      start_time: string;
      end_time: string;
      break_start: string | null;
      break_end: string | null;
    } | null
  ) => Promise<void>;
  onClose: () => void;
}

export function ScheduleDayEditor({
  dayName,
  dayOfWeek,
  template,
  onSave,
  onClose,
}: ScheduleDayEditorProps) {
  const [isDayOff, setIsDayOff] = useState(!template);
  const [startTime, setStartTime] = useState(
    template?.start_time?.slice(0, 5) ?? "09:00"
  );
  const [endTime, setEndTime] = useState(
    template?.end_time?.slice(0, 5) ?? "17:00"
  );
  const [hasBreak, setHasBreak] = useState(
    !!(template?.break_start && template?.break_end)
  );
  const [breakStart, setBreakStart] = useState(
    template?.break_start?.slice(0, 5) ?? "13:00"
  );
  const [breakEnd, setBreakEnd] = useState(
    template?.break_end?.slice(0, 5) ?? "13:30"
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (isDayOff) {
      await onSave(dayOfWeek, null);
    } else {
      await onSave(dayOfWeek, {
        start_time: startTime,
        end_time: endTime,
        break_start: hasBreak ? breakStart : null,
        break_end: hasBreak ? breakEnd : null,
      });
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900">{dayName}</h3>
        <p className="mt-1 text-sm text-gray-500">Set working hours</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Day off toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isDayOff}
              onClick={() => setIsDayOff(!isDayOff)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                isDayOff ? "bg-gray-200" : "bg-emerald-500"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isDayOff ? "translate-x-0.5" : "translate-x-5"
                } mt-0.5`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {isDayOff ? "Day off" : "Working day"}
            </span>
          </div>

          {!isDayOff && (
            <>
              {/* Start / End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    Start
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">
                    End
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Break toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="has-break"
                  type="checkbox"
                  checked={hasBreak}
                  onChange={(e) => setHasBreak(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <label
                  htmlFor="has-break"
                  className="text-sm text-gray-700"
                >
                  Add break
                </label>
              </div>

              {hasBreak && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Break start
                    </label>
                    <input
                      type="time"
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">
                      Break end
                    </label>
                    <input
                      type="time"
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
