"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Specialist, ScheduleTemplate } from "@clipbook/shared";
import { ScheduleDayEditor } from "./schedule-day-editor";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface ScheduleEditorProps {
  specialists: Specialist[];
  initialTemplates: ScheduleTemplate[];
  tenantId: string;
}

export function ScheduleEditor({
  specialists,
  initialTemplates,
  tenantId,
}: ScheduleEditorProps) {
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>(
    specialists[0]?.id ?? ""
  );
  const [templates, setTemplates] =
    useState<ScheduleTemplate[]>(initialTemplates);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);

  const specialistTemplates = templates.filter(
    (t) => t.specialist_id === selectedSpecialist
  );

  const getTemplateForDay = (day: number) =>
    specialistTemplates.find((t) => t.day_of_week === day);

  const handleSaveDay = async (
    dayOfWeek: number,
    data: {
      start_time: string;
      end_time: string;
      break_start: string | null;
      break_end: string | null;
    } | null
  ) => {
    const supabase = createClient();

    if (data === null) {
      // Day off: delete template for this day
      const existing = getTemplateForDay(dayOfWeek);
      if (existing) {
        const { error } = await supabase
          .from("schedule_templates")
          .delete()
          .eq("id", existing.id);

        if (error) {
          toast.error("Failed to update schedule.");
          return;
        }

        setTemplates((prev) => prev.filter((t) => t.id !== existing.id));
      }
    } else {
      const existing = getTemplateForDay(dayOfWeek);
      if (existing) {
        const { error } = await supabase
          .from("schedule_templates")
          .update(data)
          .eq("id", existing.id);

        if (error) {
          toast.error("Failed to update schedule.");
          return;
        }

        setTemplates((prev) =>
          prev.map((t) => (t.id === existing.id ? { ...t, ...data } : t))
        );
      } else {
        const { data: inserted, error } = await supabase
          .from("schedule_templates")
          .insert({
            tenant_id: tenantId,
            specialist_id: selectedSpecialist,
            day_of_week: dayOfWeek,
            ...data,
          })
          .select()
          .single();

        if (error || !inserted) {
          toast.error("Failed to update schedule.");
          return;
        }

        setTemplates((prev) => [...prev, inserted as ScheduleTemplate]);
      }
    }

    // Reset slot generation watermark so JIT regeneration picks up changes
    await supabase
      .from("specialists")
      .update({ slots_generated_through: null })
      .eq("id", selectedSpecialist);

    // Delete future available slots for the affected specialist
    const today = new Date().toISOString();
    await supabase
      .from("slots")
      .delete()
      .eq("specialist_id", selectedSpecialist)
      .eq("status", "available")
      .gte("starts_at", today);

    setEditingDay(null);
    toast.success("Schedule updated.");
  };

  const handleCopyToAll = async () => {
    const mondayTemplate = getTemplateForDay(0);
    if (!mondayTemplate) {
      toast.error("Set Monday hours first.");
      return;
    }

    if (
      !confirm(
        "Apply Monday's hours to Tuesday through Saturday? This will overwrite existing schedules."
      )
    )
      return;

    setCopying(true);
    const supabase = createClient();

    // Apply Monday's hours to Tue-Sat (days 1-5)
    for (let day = 1; day <= 5; day++) {
      const data = {
        start_time: mondayTemplate.start_time,
        end_time: mondayTemplate.end_time,
        break_start: mondayTemplate.break_start,
        break_end: mondayTemplate.break_end,
      };

      const existing = getTemplateForDay(day);
      if (existing) {
        await supabase
          .from("schedule_templates")
          .update(data)
          .eq("id", existing.id);
      } else {
        await supabase.from("schedule_templates").insert({
          tenant_id: tenantId,
          specialist_id: selectedSpecialist,
          day_of_week: day,
          ...data,
        });
      }
    }

    // Refresh templates
    const { data: refreshed } = await supabase
      .from("schedule_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("day_of_week");

    if (refreshed) setTemplates(refreshed as ScheduleTemplate[]);

    // Reset slot generation
    await supabase
      .from("specialists")
      .update({ slots_generated_through: null })
      .eq("id", selectedSpecialist);

    const today = new Date().toISOString();
    await supabase
      .from("slots")
      .delete()
      .eq("specialist_id", selectedSpecialist)
      .eq("status", "available")
      .gte("starts_at", today);

    setCopying(false);
    toast.success("Hours copied to Tue–Sat.");
  };

  if (specialists.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">
          Add specialists first before setting schedules.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Specialist selector */}
      <div className="flex flex-wrap items-center gap-2">
        {specialists.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSpecialist(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedSpecialist === s.id
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Weekly grid */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const template = getTemplateForDay(dayIndex);
            return (
              <div
                key={dayIndex}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => setEditingDay(dayIndex)}
              >
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium text-gray-900">
                    {dayName}
                  </span>
                  {template ? (
                    <div className="text-sm text-gray-600">
                      {template.start_time.slice(0, 5)} –{" "}
                      {template.end_time.slice(0, 5)}
                      {template.break_start && template.break_end && (
                        <span className="ml-2 text-xs text-gray-400">
                          (break: {template.break_start.slice(0, 5)} –{" "}
                          {template.break_end.slice(0, 5)})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Day off</span>
                  )}
                </div>
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {/* Copy to all button */}
      {getTemplateForDay(0) && (
        <button
          onClick={handleCopyToAll}
          disabled={copying}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {copying ? "Copying..." : "Apply Monday hours to Tue–Sat"}
        </button>
      )}

      {/* Day editor modal */}
      {editingDay !== null && (
        <ScheduleDayEditor
          dayName={DAY_NAMES[editingDay]}
          dayOfWeek={editingDay}
          template={getTemplateForDay(editingDay) ?? null}
          onSave={handleSaveDay}
          onClose={() => setEditingDay(null)}
        />
      )}
    </div>
  );
}
