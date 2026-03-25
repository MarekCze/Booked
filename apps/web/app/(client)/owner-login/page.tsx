"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function OwnerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Resolve tenant from tenant_members
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants(slug)")
      .eq("user_id", authData.user.id)
      .single();

    if (!membership) {
      setError("No shop found for this account.");
      setLoading(false);
      return;
    }

    const tenantSlug = (membership as unknown as { tenants: { slug: string } }).tenants?.slug;
    if (tenantSlug) {
      const protocol = window.location.protocol;
      const host = window.location.host;
      const parts = host.split(".");
      const baseDomain = parts.length > 1 ? parts.slice(1).join(".") : host;
      window.location.href = `${protocol}//${tenantSlug}.${baseDomain}/dashboard`;
    } else {
      setError("Could not resolve your shop.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Shop Owner Login</h1>
        <p className="mt-2 text-sm text-gray-500 text-center">Sign in to manage your shop</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="Enter your password" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have a shop yet?{" "}
          <Link href="/register" className="font-medium text-gray-900 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
