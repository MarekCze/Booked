"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Specialist } from "@clipbook/shared";

interface SpecialistListProps {
  initialSpecialists: Specialist[];
  tenantId: string;
}

export function SpecialistList({
  initialSpecialists,
  tenantId,
}: SpecialistListProps) {
  const [specialists, setSpecialists] =
    useState<Specialist[]>(initialSpecialists);
  const [dragging, setDragging] = useState<string | null>(null);

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    const updated = [...specialists];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Update display_order values
    const reordered = updated.map((s, i) => ({ ...s, display_order: i }));
    setSpecialists(reordered);

    const supabase = createClient();
    const updates = reordered.map((s) =>
      supabase
        .from("specialists")
        .update({ display_order: s.display_order })
        .eq("id", s.id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);
    if (hasError) {
      toast.error("Failed to save order.");
      setSpecialists(initialSpecialists);
    }
  };

  const handleDragStart = (id: string) => {
    setDragging(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) return;

    const fromIndex = specialists.findIndex((s) => s.id === dragging);
    const toIndex = specialists.findIndex((s) => s.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1) {
      handleReorder(fromIndex, toIndex);
    }
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  if (specialists.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No specialists yet.</p>
        <Link
          href="/specialists/new"
          className="mt-3 inline-block text-sm font-medium text-gray-900 underline hover:no-underline"
        >
          Add your first specialist
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="divide-y divide-gray-100">
        {specialists.map((specialist) => (
          <div
            key={specialist.id}
            draggable
            onDragStart={() => handleDragStart(specialist.id)}
            onDragOver={(e) => handleDragOver(e, specialist.id)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-4 px-4 py-3 transition-opacity ${
              dragging === specialist.id ? "opacity-50" : ""
            }`}
          >
            {/* Drag handle */}
            <button className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            </button>

            {/* Photo */}
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {specialist.photo_url ? (
                <img
                  src={specialist.photo_url}
                  alt={specialist.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-400">
                  {specialist.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + status */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {specialist.name}
              </p>
              {specialist.bio && (
                <p className="text-xs text-gray-500 truncate">
                  {specialist.bio}
                </p>
              )}
            </div>

            {/* Active badge */}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                specialist.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {specialist.is_active ? "Active" : "Inactive"}
            </span>

            {/* Edit link */}
            <Link
              href={`/specialists/edit/${specialist.id}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
