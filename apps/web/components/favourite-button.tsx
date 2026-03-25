"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface FavouriteButtonProps {
  specialistId: string;
}

export function FavouriteButton({ specialistId }: FavouriteButtonProps) {
  const [isFavourite, setIsFavourite] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) return;
      setIsAuthenticated(true);

      const { data } = await supabase
        .from("favourites")
        .select("id")
        .eq("client_id", user.id)
        .eq("specialist_id", specialistId)
        .maybeSingle();

      setIsFavourite(!!data);
    };
    check();
  }, [specialistId]);

  if (!isAuthenticated) return null;

  const toggle = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFavourite) {
      await supabase
        .from("favourites")
        .delete()
        .eq("client_id", user.id)
        .eq("specialist_id", specialistId);
      setIsFavourite(false);
    } else {
      await supabase
        .from("favourites")
        .insert({ client_id: user.id, specialist_id: specialistId });
      setIsFavourite(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={loading}
      className="absolute top-2 right-2 z-10 rounded-full bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white disabled:opacity-50"
      aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
    >
      <svg
        className={`h-5 w-5 ${isFavourite ? "fill-red-500 text-red-500" : "fill-none text-gray-400"}`}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
