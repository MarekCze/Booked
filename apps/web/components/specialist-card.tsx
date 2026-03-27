"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Specialist } from "@clipbook/shared";
import { Badge } from "@/components/ui/badge";
import { FavouriteButton } from "@/components/favourite-button";
import { formatTime } from "@/lib/format";
import { useTenant } from "@/lib/tenant-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Deterministic color from name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function SpecialistCard({
  specialist,
  nextAvailable,
  onSelect,
}: {
  specialist: Specialist;
  nextAvailable: string | null;
  onSelect: (id: string) => void;
}) {
  const tenant = useTenant();

  const now = new Date();
  const isToday =
    nextAvailable && new Date(nextAvailable).toDateString() === now.toDateString();

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(specialist.id)}
      className="relative flex flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md w-full"
    >
      {/* Favourite toggle */}
      <FavouriteButton specialistId={specialist.id} />

      {/* Avatar */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white ${getAvatarColor(specialist.name)}`}
      >
        {specialist.photo_url ? (
          <img
            src={specialist.photo_url}
            alt={specialist.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          getInitials(specialist.name)
        )}
      </div>

      {/* Name & Bio */}
      <h3 className="mt-3 text-lg font-semibold text-gray-900">
        {specialist.name}
      </h3>
      {specialist.bio && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
          {specialist.bio}
        </p>
      )}

      {/* Next Available */}
      <div className="mt-3">
        {nextAvailable ? (
          <Badge variant="available">
            Next: {isToday ? "Today" : "Tomorrow"}{" "}
            {formatTime(nextAvailable, tenant.timezone)}
          </Badge>
        ) : (
          <Badge variant="unavailable">No availability</Badge>
        )}
      </div>

      {/* View Profile link */}
      <Link
        href={`/specialists/${specialist.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 text-xs text-gray-400 hover:text-[var(--brand-primary,#0074c5)]"
      >
        View Profile &rarr;
      </Link>
    </motion.button>
  );
}
