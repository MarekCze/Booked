"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface UserInfo {
  email?: string;
  phone?: string;
  is_anonymous?: boolean;
  user_metadata?: Record<string, string>;
  app_metadata?: Record<string, string>;
}

interface AccountHeaderProps {
  user: UserInfo;
}

export function AccountHeader({ user }: AccountHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const name = user.user_metadata?.full_name || user.email || "Guest";
  const phone = user.phone || user.user_metadata?.phone;
  const provider = user.app_metadata?.provider || "email";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-gray-600">{name}</p>
          {phone && <p className="text-sm text-gray-500">{phone}</p>}
          <p className="text-xs text-gray-400">
            Signed in via {provider}
          </p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Log Out
      </button>
    </div>
  );
}
